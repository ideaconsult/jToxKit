/* EndpointKit.js - An endpoint listing and selection toolkit. Migrated one
 *
 * Copyright 2012-2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan Georgiev
 **/

(function (_, a$, $, jT) {

	function EndpointKit(settings) {
		$(this.rootElement = settings.target).addClass('jtox-toolkit'); // to make sure it is there even when manually initialized
		jT.ui.putTemplate('all-endpoint', ' ? ', this.rootElement);

		this.settings = $.extend(true, {}, EndpointKit.defaults, settings);
		jT.ui.installHandlers(this, this.rootElement, _.defaults(this.settings.handlers, jT.tables.commonHandlers));

		var self = this;

		// we can redefine onDetails only if there is not one passed and we're asked to show editors at ll
		if (self.settings.showEditors && !self.settings.onDetails) {
			self.edittedValues = {};
			self.settings.onDetails = function (root, data, element) {
				self.edittedValues[data.endpoint] = {};
				EndpointKit.linkEditors(self, jT.ui.getTemplate('endpoint-one-editor', {}).appendTo(root), {
					category: data.endpoint,
					top: data.subcategory,
					conditions: self.settings.showConditions,
					onchange: function (e, field, value) {
						_.set(self.edittedValues[data.endpoint], field, value);
					}
				});
			};
		}

		// again , so that changed defaults can be taken into account.
		var cols = jT.tables.processColumns(self, 'endpoint');

		// make the accordition now...
		$('.jtox-categories', self.rootElement).accordion({
			heightStyle: self.settings.heightStyle
		});

		self.tables = {};
		// and now - initialize all the tables...
		$('table', self.rootElement).each(function () {
			var name = this.className;
			self.tables[name] = jT.tables.putTable(self, this, "endpoint", {
				columns: cols,
				infoCallback: self.updateStats(name),
				orderFixed: [
					[1, 'asc']
				],
				onRow: function (nRow, aData, iDataIndex) {
					$(nRow).addClass(aData.endpoint);
				}
			});
		});

		if (!!self.settings.hideFilter)
			$('.filter-box', self.rootElement).remove();
		else {
			var filterTimeout = null;
			var fFilter = function (ev) {
				if (!!filterTimeout)
					clearTimeout(filterTimeout);

				var field = ev.currentTarget;

				filterTimeout = setTimeout(function () {
					$('table', self.rootElement).each(function () {
						$(this).dataTable().fnFilter(field.value);
					});
				}, 300);
			};

			$('.filter-box input', self.rootElement).on('keydown', fFilter);
		}

		if (!self.settings.showMultiselect)
			$('h3 a', self.rootElement).remove();

		// finally, wait a bit for everyone to get initialized and make a call, if asked to
		if (!!this.settings.endpointUri != undefined && this.settings.loadOnInit)
			this.loadEndpoints(this.settings.endpointUri)
	};

	EndpointKit.prototype.getValues = function (needle) {
		var self = this,
			filter = null;

		if (!needle)
			filter = function (end) { return true; };
		else if (typeof needle != 'function')
			filter = function (end) { return end.indexOf(needle) >= 0; };
		else
			filter = needle;

		for (var endpoint in self.edittedValues)
			if (filter(endpoint))
				return self.edittedValues[endpoint];

		return null;
	};

	EndpointKit.prototype.updateStats = function (name) {
		var self = this;
		return function (oSettings, iStart, iEnd, iMax, iTotal, sPre) {
			var head = $('h3.' + name, self.rootElement)[0],
				html = '';

			// now make the summary...
			if (iTotal > 0) {
				var count = 0;
				var data = this.fnGetData();
				for (var i = iStart; i <= iEnd && i < iMax; ++i)
					count += data[i].count;
				html = "[" + count + "]";
			} else
				html = '';

			$('div.jtox-details span', head).html(html);
			return sPre;
		}
	};

	EndpointKit.prototype.fillEntries = function (facet) {
		var self = this,
			ends = {};

		// first we need to group them and extract some summaries
		for (var i = 0, fl = facet.length; i < fl; ++i) {
			var entry = facet[i];
			var cat = ends[entry.subcategory];
			if (cat == null)
				ends[entry.subcategory] = cat = [];

			cat.push(entry);
		}

		// now, as we're ready - go and fill everything
		$('h3', self.rootElement).each(function () {
			var name = $(this).data('cat');
			var table = self.tables[name];
			table.fnClearTable();

			var cat = ends[name.replace("_", " ")];
			if (cat != null)
				table.fnAddData(cat);
		});
	};

	EndpointKit.prototype.loadEndpoints = function (uri) {
		var self = this;
		if (uri == null)
			uri = self.settings.baseUrl + '/query/study';
		else if (!self.settings.baseUrl)
			self.settings.baseUrl = jT.formBaseUrl(uri, "query");

		// make the call...
		jT.ambit.call(self, uri, function (result, jhr) {
			if (!result && jhr.status != 200)
				result = {
					facet: []
				}; // empty one
			if (!!result) {
				self.summary = result.facet;
				jT.fireCallback(self.settings.onLoaded, self, result);
				self.fillEntries(result.facet);
			} else {
				self.facet = null;
				jT.fireCallback(self.settings.onLoaded, self, result);
			}
		});
	};

	EndpointKit.prototype.query = function (uri) {
		this.loadEndpoints(uri);
	};

	EndpointKit.prototype.modifyUri = function (uri) {
		$('input[type="checkbox"]', this.rootElement).each(function () {
			if (this.checked)
				uri = jT.addParameter(uri, 'feature_uris[]=' + encodeURIComponent(this.value + '/feature'));
		})

		return uri;
	};

	// now the editors...
	EndpointKit.linkEditors = function (kit, root, settings) { // category, top, onchange, conditions
		// get the configuration so we can setup the fields and their titles according to it
		var config = $.extend(true, {}, kit.settings.columns["_"], kit.settings.columns[settings.category]);

		var putAutocomplete = function (box, service, configEntry, options) {
			// if we're not supposed to be visible - hide us.
			var field = box.data('field');
			if (!configEntry || configEntry.bVisible === false) {
				box.hide();
				return null;
			}

			// now deal with the title...
			var t = !!configEntry ? configEntry.title : null;
			if (!!t)
				$('div', box[0]).html(t);

			// prepare the options
			if (!options)
				options = {};

			// finally - configure the autocomplete options themselves to initialize the component itself
			if (!options.source) options.source = function (request, response) {
				jT.ambit.call(kit, service, {
					method: "GET",
					data: {
						'category': settings.category,
						'top': settings.top,
						'max': kit.settings.maxHits || defaultSettings.maxHits,
						'search': request.term
					}
				}, function (data) {
					response(!data ? [] : $.map(data.facet, function (item) {
						var val = item[field] || '';
						return {
							label: val + (!item.count ? '' : " [" + item.count + "]"),
							value: val
						}
					}));
				});
			};

			// and the change functon
			if (!options.change) options.change = function (e, ui) {
				settings.onchange.call(this, e, field, !ui.item ? _.trim(this.value) : ui.item.value);
			};

			// and the final parameter
			if (!options.minLength) options.minLength = 0;

			return $('input', box[0]).autocomplete(options);
		};

		var putValueComplete = function (root, configEntry) {
			var field = root.data('field');
			var extractLast = function (val) {
				return !!val ? val.split(/[,\(\)\s]*/).pop() : val;
			};
			var parseValue = function (text) {
				var obj = {};
				var parsers = [{
						regex: /^[\s=]*([\(\[])\s*(\-?\d*[\.eE]?\-?\d*)\s*,\s*(\-?\d*[\.eE]?\-?\d*)\s*([\)\]])\s*([^\d,]*)\s*$/,
						fields: ['', 'loQualifier', 'loValue', 'upValue', 'upQualifier', 'unit'],
						// adjust the parsed value, if needed
						adjust: function (obj, parse) {
							if (!obj.upValue) delete obj.upQualifier;
							else obj.upQualifier = parse[4] == ']' ? '<=' : '<';

							if (!obj.loValue) delete obj.loQualifier;
							else obj.loQualifier = parse[1] == '[' ? '>=' : '>';
						}
					},
					{
						regex: /^\s*(>|>=)?\s*(\-?\d+[\.eE]?\-?\d*)\s*([^\d,<=>]*)[,\s]+(<|<=)?\s*(\-?\d*[\.eE]?\-?\d*)\s*([^\d,<=>]*)\s*$/,
						fields: ['', 'loQualifier', 'loValue', 'unit', 'upQualifier', 'upValue', 'unit'],
					},
					{
						regex: /^\s*(>|>=|=)?\s*(\-?\d+[\.eE]?\-?\d*)\s*([^\d,<=>]*)\s*$/,
						fields: ['', 'loQualifier', 'loValue', 'unit'],
						adjust: function (obj, parse) {
							if (!obj.loQualifier) obj.loQualifier = '=';
						}
					},
					{
						regex: /^\s*(<|<=)\s*(\-?\d+[\.eE]?\-?\d*)\s*([^\d,<=>]*)\s*$/,
						fields: ['', 'upQualifier', 'upValue', 'unit'],
					},
					{
						regex: /^\s*(\-?\d+[\.eE]?\-?\d*)\s*(<|<=)\s*([^\d,<=>]*)\s*$/,
						fields: ['', 'upValue', 'upQualifier', 'unit'],
					},
					{
						regex: /^\s*(\-?\d+[\.eE]?\-?\d*)\s*(>|>=)\s*([^\d,<=>]*)\s*$/,
						fields: ['', 'loValue', 'loQualifier', 'unit'],
					}
				];

				for (var pi = 0; pi < parsers.length; ++pi) {
					var parse = text.match(parsers[pi].regex);
					if (!parse)
						continue;
					for (var i = 1; i < parse.length; ++i)
						if (!!parse[i]) {
							var f = parsers[pi].fields[i];
							obj[f] = parse[i];
						}

					if (parsers[pi].adjust)
						parsers[pi].adjust(obj, parse);
					if (!!obj.unit) obj.unit = obj.unit.trim();
					break;
				}

				if (pi >= parsers.length)
					obj.textValue = _.trim(text);

				return obj;
			};

			var allTags = [].concat(kit.settings.loTags || defaultSettings.loTags, kit.settings.hiTags || defaultSettings.hiTags, kit.settings.units || defaultSettings.units);

			var autoEl = putAutocomplete(root, null, configEntry, {
				change: function (e, ui) {
					settings.onchange.call(this, e, field, parseValue(this.value));
				},
				source: function (request, response) {
					// extract the last term
					var result = $.ui.autocomplete.filter(allTags, extractLast(request.term));
					if (request.term == '') {
						// if term is empty don't show results
						// avoids IE opening all results after initialization.
						result = '';
					}
					// delegate back to autocomplete
					response(result);
				},
				focus: function () { // prevent value inserted on focus
					return false;
				},
				select: function (event, ui) {
					var theVal = this.value,
						last = extractLast(theVal);

					this.value = theVal.substr(0, theVal.length - last.length) + ui.item.value + ' ';
					return false;
				}
			});

			// it might be a hidden one - so, take care for this
			if (!!autoEl) autoEl.bind('keydown', function (event) {
				if (event.keyCode === $.ui.keyCode.TAB && !!autoEl.menu.active)
					event.preventDefault();
			});
		};

		// deal with endpoint name itself
		putAutocomplete($('div.box-endpoint', root), '/query/experiment_endpoints', _.get(config, 'effects.endpoint'));
		putAutocomplete($('div.box-interpretation', root), '/query/interpretation_result', _.get(config, 'interpretation.result'));

		$('.box-conditions', root).hide(); // to optimize process with adding children
		if (!!settings.conditions) {
			// now put some conditions...
			var any = false;
			var condRoot = $('div.box-conditions .jtox-border-box', root)[0];
			for (var cond in config.conditions) {
				any = true;
				var div = jT.ui.getTemplate('endpoint-one-condition', {
					title: config.conditions[cond].title || cond,
					codition: cond
				}).appendTo(condRoot);

				$('input', div).attr('placeholder', "Enter value or range");
				putValueComplete($(div), config.conditions[cond]);
			}
			if (any)
				$('.box-conditions', root).show();
		}

		// now comes the value editing mechanism
		var confRange = _.get(config, 'effects.result') || {};
		var confText = _.get(config, 'effects.text') || {};
		putValueComplete($('.box-value', root), confRange.bVisible === false ? confText : confRange);

		// now initialize other fields, marked with box-field
		$('.box-field', root).each(function () {
			var name = $(this).data('name');
			$('input, textarea, select', this).on('change', function (e) {
				settings.onchange.call(this, e, name, $(this).val());
			});
		});
	};

	EndpointKit.defaults = { 	// all settings, specific for the kit, with their defaults. These got merged with general (jToxKit) ones.
		heightStyle: "content", // the accordition heightStyle
		hideFilter: false, 		// if you don't want to have filter box - just hide it
		maxHits: 10, 			// max hits in autocomplete
		showMultiselect: true, 	// whether to hide select all / unselect all buttons
		showEditors: false, 	// whether to show endpoint value editing fields as details
		showConditions: true, 	// whether to show conditions in endpoint field editing
		onLoaded: null, 		// callback called when the is available
		loadOnInit: false, 		// whether to make an (empty) call when initialized.
		units: ['uSv', 'kg', 'mg/l', 'mg/kg bw', '°C', 'mg/kg bw/day', 'ppm', '%', 'h', 'd'],
		loTags: ['>', '>=', '='],
		hiTags: ['<', '<='],
		dom: "<i>rt", 			// passed with dataTable settings upon creation
		language: {
			loadingRecords: "No endpoints found.",
			zeroRecords: "No endpoints found.",
			emptyTable: "No endpoints available.",
			info: "Showing _TOTAL_ endpoint(s) (_START_ to _END_)"
		},
		handlers: {
			multipleSelect: function (e) {
				var el$ = $(e.target),
					cat = el$.closest('h3').data('cat'),
					root = $('.' + cat, el$.closest('div.jtox-categories')),
					action = el$.data('action') || 'on';

				root && $(action !== 'on' ? 'input.jtox-selection:checked' : 'input.jtox-selection:not(:checked)', root)
					.prop('checked', action === 'on')
					.trigger('change');
			}
		},
		/* endpointUri */
		columns: {
			endpoint: {
				'Id': {
					title: "",
					data: "uri",
					orderable: false,
					width: "30px",
					render: function (data, type, full) {
						return '';
					}
				},
				'Name': {
					title: "Name",
					data: "value",
					defaultContent: "-",
					render: function (data, type, full) {
						return data + '<span class="float-right jtox-details">[<span title="Number of values">' + full.count + '</span>]' + 
							jT.ui.fillHtml('info-ball', { href: full.uri, title: "Endpoints detailed info" }) +
							'</span>';
					}
				},
			}
		}
	};

	jT.ui.Endpoint = EndpointKit;

})(_, asSys, jQuery, jToxKit);