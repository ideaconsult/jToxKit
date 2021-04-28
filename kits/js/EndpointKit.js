/* EndpointKit.js - An endpoint listing and selection toolkit. Migrated one
 *
 * Copyright 2012-2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan Georgiev
 **/

(function (_, a$, $, jT) {

	var endpointParsers = [{
		regex: /^[\s=]*([\(\[])\s*(\-?\d*[\.eE]?\-?\d*)\s*,\s*(\-?\d*[\.eE]?\-?\d*)\s*([\)\]])\s*([^\d,]*)\s*$/,
		fields: ['', 'loQualifier', 'loValue', 'upValue', 'upQualifier', 'unit'],
		// adjust the parsed value, if needed
		adjust: function (obj, parse) {
			if (!obj.upValue) delete obj.upQualifier;
			else obj.upQualifier = parse[4] == ']' ? '<=' : '<';

			if (!obj.loValue) delete obj.loQualifier;
			else obj.loQualifier = parse[1] == '[' ? '>=' : '>';
		}
	},{
		regex: /^\s*(>|>=)?\s*(\-?\d+[\.eE]?\-?\d*)\s*([^\d,<=>]*)[,\s]+(<|<=)?\s*(\-?\d*[\.eE]?\-?\d*)\s*([^\d,<=>]*)\s*$/,
		fields: ['', 'loQualifier', 'loValue', 'unit', 'upQualifier', 'upValue', 'unit'],
	}, {
		regex: /^\s*(>|>=|=)?\s*(\-?\d+[\.eE]?\-?\d*)\s*([^\d,<=>]*)\s*$/,
		fields: ['', 'loQualifier', 'loValue', 'unit'],
		adjust: function (obj, parse) {
			if (!obj.loQualifier) obj.loQualifier = '=';
		}
	}, {
		regex: /^\s*(<|<=)\s*(\-?\d+[\.eE]?\-?\d*)\s*([^\d,<=>]*)\s*$/,
		fields: ['', 'upQualifier', 'upValue', 'unit'],
	}, {
		regex: /^\s*(\-?\d+[\.eE]?\-?\d*)\s*(<|<=)\s*([^\d,<=>]*)\s*$/,
		fields: ['', 'upValue', 'upQualifier', 'unit'],
	}, {
		regex: /^\s*(\-?\d+[\.eE]?\-?\d*)\s*(>|>=)\s*([^\d,<=>]*)\s*$/,
		fields: ['', 'loValue', 'loQualifier', 'unit'],
	}];

	function parseValue (text) {
		var obj = {};

		for (var pi = 0; pi < endpointParsers.length; ++pi) {
			var parse = text.match(endpointParsers[pi].regex);
			if (!parse)
				continue;
			for (var i = 1; i < parse.length; ++i)
				if (!!parse[i]) {
					var f = endpointParsers[pi].fields[i];
					obj[f] = parse[i];
				}

			if (endpointParsers[pi].adjust)
				endpointParsers[pi].adjust(obj, parse);
			if (!!obj.unit)
				obj.unit = obj.unit.trim();
			break;
		}

		if (pi >= endpointParsers.length)
			obj.textValue = _.trim(text);

		return obj;
	};


	function extractLast(val) {
		return !!val ? val.split(/[,\(\)\s]*/).pop() : val;
	};

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
				// TODO: Change this!!
				jT.ui.attachEditors(self, jT.ui.getTemplate('endpoint-one-editor', {}).appendTo(root), {
					category: data.endpoint,
					top: data.subcategory,
					conditions: self.settings.showConditions,
					onChange: function (e, field, value) {
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
			var head = $('h3[data-cat=' + name + ']', self.rootElement),
				data = this.fnGetData(),
				count = _.sumBy(data, 'count');

			$('div.jtox-details span', head).html(iTotal > 0 ? '[' + count + ']' : '');
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
			uri = self.settings.baseUrl + 'query/study';
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

	EndpointKit.prototype.query = EndpointKit.prototype.loadEndpoints;

	EndpointKit.enumFeatureValues = function (dataset, cb) {
		for (var i = 0;i < dataset.dataEntry.length; ++i) {
			var entry = dataset.dataEntry[i];
			for (var fId in entry.values) {
				var value = entry.values[fId],
					feature = _.extend({ id: jT.ambit.parseFeatureId(fId) }, dataset.feature[fId]),
					mainFeature = null;

				if (!!feature.id) {
					feature.id.suffix = '*';
					mainFeature = dataset.feature[jT.ambit.buildFeatureId(feature.id)];
				}

				if (!feature.isMultiValue)
					cb(value, feature, mainFeature, entry, dataset);
				else
					for (var j = 0;j < value.length; ++j) 
						cb(value[j], feature, mainFeature, entry, dataset);
			}
		}
	};

	EndpointKit.prototype.getFeatureInfoHtml = function (feature, value, canDelete) {
		var conditionsCount = feature.annotation.length,
			condHeaders = [], condValues = [];

		for (var i = 0; i < conditionsCount; ++i) {
			condHeaders.push(jT.formatString('<th class="conditions">{{p}}</th>', feature.annotation[i]));
			condValues.push(jT.formatString('<td>{{o}}</td>', feature.annotation[i]))
		}

		// make sure there is at least one cell.
		if (conditionsCount < 1)
			condValues.push('<td>-</td>');

		return jT.ui.fillHtml('endpoint-info-panel', {
			conditionsHeaders: condHeaders.join(''),
			conditionsValues: condValues.join(''),
			conditionsCount: conditionsCount,
			endpoint: feature.title,
			guidance: feature.creator,
			value: jT.ui.renderValue(value, feature.units, 'display'),
			reason: value.remarks || '',
			deleteBoxClass: canDelete ? '' : 'jtox-hidden'
		});
	};

	EndpointKit.prototype.getFeatureEditHtml = function (feature, opts) {
		var config = $.extend(true, {}, this.settings.columns["_"], this.settings.columns[feature.id.category]),
			editors = _.map(this.settings.editors, function (editor) {
				var cfgPath = editor.config || editor.path,
					oneCfg = _.defaults(_.get(config, cfgPath, {}), editor, {
						editClass: "no-auto"
					});

				return (oneCfg.preloaded || oneCfg.visible === false || oneCfg.bVisible === false)
					? ''
					: jT.ui.fillHtml('endpoint-one-editor', oneCfg);
			}),
			conditions = _.map(config.conditions, function (cond, cId) {
				var valPath = 'effects[0].conditions.' + cId;
				return typeof cond !== 'object' || cond.visible === false ? '' : jT.ui.fillHtml('endpoint-one-editor', _.defaults({
					id: cId,
					title: cond.title || cId,
					editClass: "tags-auto",
					path: valPath
				}, config.conditions[cId]));
			});

		return jT.ui.fillHtml('endpoint-edit-panel', _.defaults({
			editorsHtml: editors.join(''),
			conditionsClass: conditions.length > 0 ? '' : 'jtox-hidden',
			conditionsHtml: conditions.join('')
		}, opts));
	};

	EndpointKit.attachEditors = function (kit, root, data, opts) {
		var allTags = [].concat(kit.settings.loTags, kit.settings.hiTags, kit.settings.units);
			field = null;
	
		// Make it easier to call with less checks.
		opts = opts || {};
	
		$('.ajax-auto', root).autocomplete({
			appendTo: root,
			source: function (request, response) {
				var field = $(this.element).data('id');
				_.set(opts.ajax, opts.searchTerm, request.term);
	
				jT.ambit.call(kit, $(this.element).data('service'), opts.ajax, function (data) {
					response(!data ? [] : $.map(data.facet, function (item) {
						var val = item[field] || '';
						return {
							label: val + (!item.count ? '' : " [" + item.count + "]"),
							value: val
						}
					}));
				});	
			},
			change: function (e, ui) {
				var id = $(this).data('id'),
					path = $(this).data('path') || _.find(kit.settings.editors, { id: id }).path,
					value = !ui.item ? _.trim(this.value) : ui.item.value;
				if (!opts.onChange || opts.onChange.call(kit, e, id,  path, value) !== false)
					_.set(data, path, value);
			},
			minLength: kit.settings.minLength || 0
		});
	
		$('.tags-auto', root).autocomplete({
			appendTo: root,
			change: function (e, ui) {
				var id = $(this).data('id'),
					path = $(this).data('path') || _.find(kit.settings.editors, { id: id }).path,
					value = parseValue(this.value);
				if (!opts.onChange || opts.onChange.call(kit, e, id,  path, value) !== false)
					_.set(data, path, value);
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
		})
		.bind('keydown', function (event) {
			if (event.keyCode === $.ui.keyCode.TAB && !!$(this).menu.active)
				event.preventDefault();
		});
	
		// now initialize other fields, marked with '.no-auto''
		$('.no-auto', root).on('change', function (e) {
			var id = $(this).data('id'),
				path = $(this).data('path') || _.find(kit.settings.editors, { id: id }).path,
				value = $(this).val();
			if (!opts.onChange || opts.onChange.call(kit, e, id,  path, value) !== false)
				_.set(data, path, value);
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
		/* endpointUri */
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
		editors: [{
			id: 'endpoint',
			path: 'effects[0].endpoint',
			title: 'Endpoint name',
			service: 'query/experiment_endpoints',
			editClass: 'ajax-auto'
		}, {
			id: 'value',
			path: 'effects[0].result',
			config: 'effects.result',
			title: 'Value range',
			editClass: 'tags-auto'
		}, {
			id: 'value',
			path: 'effects[0].result.textValue',
			config: 'effects.text',
			title: 'Effects result',
			// service: '/query/interpretation_result'
		}, {
			id: 'interpretation_result',
			path: 'interpretation.result',
			title: 'Intepretation of the results',
			service: 'query/interpretation_result',
			editClass: 'ajax-auto'
		}, {
			id: 'type',
			path: 'reliability.r_studyResultType',
			title: 'Study type',
			preloaded: true
		}, {
			id: 'reference',
			path: 'citation.title',
			title: 'Reference',
			preloaded: true
		}, {
			id: 'justification',
			path: 'protocol.guideline[0]',
			config: 'protocol.guideline',
			title: "Guideline or Justification",
			preloaded: true
		}, {
			id: 'remarks',
			path: 'interpretation.criteria',
			title: "Remarks",
			preloaded: true
		}],
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