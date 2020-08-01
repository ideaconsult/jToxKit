/** jToxKit - chem-informatics multi-tool-kit.
* The universal annotation capabilities.
*
* Author: Ivan (Jonan) Georgiev
* Copyright © 2020, IDEAConsult Ltd. All rights reserved.
*/

(function(a$, $, jT) {	
	function AnnotationKit(settings) {
		a$.extend(true, this, AnnotationKit.defaults, settings);
		var self = this;
		
		this.selector = settings.selector;
		
		this.annoTip = new AnnoTip({
			context: this.context,
			// Handlers. All accept @see {Anno} as an argument.
			onSelection: function (anno) { return self.analyzeAnno(anno); },
			onAction: function (action, anno) { return self.onAction(action, anno); },
			onClose: null
		});

		if (!!settings.autoStart)
			this.start();
	};

	AnnotationKit.defaults = {
		context: null,
		ajaxSettings: null,
		connector: null,
		inputSize: 30,
		matchers: [{
			selector: "*",		// String - CSS selector
			extractor: null,	// String | Function 
			presenter: null,	// String - HTML | Function
			exclusive: false	// Boolean - terminate matching
		}]
	};

	AnnotationKit.prototype.start = function () {
		this.annoTip.attach(this.selector);
	};

	AnnotationKit.prototype.onAction = function (action, anno) {
		if (action === 'edit') {			
			if (typeof this.controlsPrepack === 'function')
				anno = this.controlsPrepack(data, anno);

			anno.content = this.controlsPacker(anno);
			this.annoTip.update(anno);
			this.beautify(anno.element);
			$(anno.element).addClass('openned');
			return;
		}
		if (action === 'ok') {
			var data = this.dataPacker(anno);

			if (typeof this.dataPostprocess === 'function')
				data = this.dataPostprocess(data, anno);

			if (data)
				$.ajax($.extend(true, this.ajaxSettings, { data:  data }));
		}
		
		$(".annotip-severity", anno.element).buttonset('destroy');
		this.annoTip.discard();
	};

	AnnotationKit.prototype.analyzeAnno = function (anno) {
		var dataInfo = this.dataExtractor(anno.element),
			data = dataInfo.data,
			elChain = $(anno.element).parentsUntil(dataInfo.target).addBack().add(dataInfo.target),
			matchers = this.matchers;
			
		anno.reference = {};
		anno.controls = [];
		for (var i = 0;i < matchers.length; ++i) {
			var m = matchers[i],
				found = false;

			elChain.filter(m.selector).each(function (idx, el) {
				var v = null;

				// First, deal with value extraction...
				if (typeof m.extractor === 'function')
					v = m.extractor(data, anno, el);
				else if (typeof m.extractor === 'string' || Array.isArray(m.extractor))
					v = _.set({}, m.extractor, _.get(data, m.extractor));
				else if (m.extractor != null)
					v = m.extractor;
				
				// ... and merge it to the main data inside the anno object.
				if (v != null)
					anno.reference = $.extend(true, anno.reference, v);

				// The, proceed with ui building.
				if (typeof m.presenter === 'string')
					anno.controls.push(jT.ui.formatString(m.presenter, anno));
				else if (typeof m.presenter === 'function')
					anno.controls.push(m.presenter(data, anno, el));

				found = true;
			});

			if (found && m.exclusive) break;
		}

		return anno.controls.length > 0;
	};

	AnnotationKit.prototype.controlsPacker = function (anno) {
		anno.controls.push(
			jT.formatString(jT.ui.templates['anno-description'], this),
			jT.formatString(jT.ui.templates['anno-severity'], this)
		);

		return '<form><div>' + anno.controls.join('</div>\n<div>') + '</div></form>';
  	};

	AnnotationKit.prototype.beautify = function (element) {
		$(".annotip-severity", element).buttonset();
		$("input", element).attr('size', this.inputSize - 1);
		$("textarea", element).attr('cols', this.inputSize);
	};

	AnnotationKit.prototype.dataPreprocess = function (data, anno) {
		$('form', anno.element).serializeArray().forEach(function (el) {
			_.set(data, el.name, el.value);
		});
		
		return data;
	};

	AnnotationKit.prototype.dataPacker = function (anno) {
		return this.dataPreprocess({
			context: anno.context,
			reference: anno.reference,
			operation: anno.operation,
			suggestion: anno.suggestion
		}, anno);
	};

	AnnotationKit.prototype.dataExtractor = function (el) {
		var target = $(el).closest('table.dataTable>tbody>tr')[0],
			table = jT.tables.getTable(target);
		
		return {
			target: target,
			data: table.row(target).data()		
		};
	};

	AnnotationKit.prototype.dataInserter = function (el, data) { };

	jT.ui.Annotation = AnnotationKit;
})(asSys, jQuery, jToxKit);
/* CompositionKit.js - A kit for visualizing substance composition(s). Migrated.
 *
 * Copyright 2012-2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan Georgiev
 **/

(function (a$, $, jT) {

	function CompositionKit(settings) {
		$(this.rootElement = settings.target).addClass('jtox-toolkit'); // to make sure it is there even when manually initialized

		this.settings = $.extend(true, {}, CompositionKit.defaults, settings);

		// finally, if provided - make the query
		if (!!this.settings.compositionUri)
			this.queryComposition(this.settings.compositionUri)
	};

	CompositionKit.prototype.prepareTable = function (json, tab) {
		var self = this;

		// deal if the selection is chosen
		var colId = self.settings.columns.composition && self.settings.columns.composition.Name;
		if (colId && !!self.settings.selectionHandler) {
			jT.tables.putActions(self, colId);
			colId.sWidth = "60px";
		}

		// we need that processing to remove the title of "Also contained in..." column...
		var cols = jT.tables.processColumns(self, 'composition');
		for (var i = 0, cl = cols.length; i < cl; ++i)
			if (cols[i].title == 'Also') {
				cols[i].title = '';
				// we need to do this here, because 'self' is not defined up there...
				cols[i].render = function (val, type, full) {
					return !val ? '' : '<a href="' + self.settings.baseUrl + 'substance?type=related&compound_uri=' + encodeURIComponent(val) + '" target="_blank">Also contained in...</a>';
				};
				break;
			}

		// if we have showDiagram set to true we need to show it up
		if (self.settings.showDiagrams) {
			var diagFeature = jT.ambit.baseFeatures['http://www.opentox.org/api/1.1#Diagram'];
			
			diagFeature && diagFeature.column && cols.push($.extend({}, diagFeature.column, {
				"title": 'Structure',
				"data": "component",
				"render": function (val, type, full) {
					return diagFeature.render(val.compound.URI, type, val);
				}
			}));
		}
		// READYY! Go and prepare THE table.
		self.table = jT.tables.putTable(self, $('table.composition-table', tab)[0], 'composition', { "columns": cols });

		$(self.table).DataTable().rows.add(json).draw();
		
		// now make a few fixing for multi-column title
		var colSpan = $('th.colspan-2', self.table);
		$(colSpan).attr('colspan', 2);
		$($(colSpan).next()).remove();
		
		return self.table;
	};

	CompositionKit.prototype.queryComposition = function (uri) {
		var self = this;
		
		this.settings.baseUrl = jT.formBaseUrl(this.compositionUri = uri);

		jT.ambit.call(self, uri, function (json) {
			if (!!json && !!json.composition) {
				// clear the old tabs, if any.
				var substances = {};

				jT.ambit.processFeatures(json.feature);
				// proprocess the data...
				for (var i = 0, cmpl = json.composition.length; i < cmpl; ++i) {
					var cmp = json.composition[i];

					// TODO: Start using show banner!
					jT.ambit.processEntry(cmp.component, json.feature, jT.ambit.getDatasetValue);

					// now prepare the subs        
					var theSubs = substances[cmp.compositionUUID];
					if (theSubs === undefined)
						substances[cmp.compositionUUID] = theSubs = {
							name: "",
							purity: "",
							maxvalue: 0,
							uuid: cmp.compositionUUID,
							composition: []
						};

					theSubs.composition.push(cmp);
					if (cmp.compositionName != '' && cmp.compositionName != null)
						theSubs.name = cmp.compositionName;

					var val = cmp.proportion.typical;
					if (cmp.relation == 'HAS_CONSTITUENT' && theSubs.name == '') {
						theSubs.name = cmp.component.compound['name'] + ' (' + jT.valueAndUnits(val.value, val.unit || '%&nbsp;(w/w)', val.precision) + ')';
					}

					if (cmp.relation == 'HAS_CONSTITUENT' && theSubs.maxvalue < val.value) {
						theSubs.maxvalue = val.value;
						val = cmp.proportion.real;
						theSubs.purity = jT.valueAndUnits(val.lowerValue + '-' + val.upperValue, val.unit || '%&nbsp;(w/w)');
					}
				}

				jT.fireCallback(self.settings.onLoaded, self, json.composition);
				// now make the actual filling
				if (!self.settings.noInterface) {
					for (var i in substances) {
						var panel = jT.ui.putTemplate('all-composition', substances[i])[0];
						$(self.rootElement).append(panel);

						if (!self.settings.showBanner) // we need to remove it
							$('.composition-info', panel).remove();
						// we need to prepare tables, abyways.
						self.prepareTable(substances[i].composition, panel[0]);
					}
				}
			} else
				jT.fireCallback(self.settings.onLoaded, self, json.composition);
		});
	};

	CompositionKit.prototype.query = function (uri) {
		$(self.rootElement).empty();
		this.queryComposition(uri);
	};


	CompositionKit.defaults = { // all settings, specific for the kit, with their defaults. These got merged with general (jToxKit) ones.
		selectionHandler: null, // selection handler, if needed for selection checkbox, which will be inserted if this is non-null
		showBanner: true, // whether to show a banner of composition info before each compounds-table
		showDiagrams: false, // whether to show diagram for each compound in the composition
		noInterface: false, // run in interface-less mode - just data retrieval and callback calling.
		sDom: "rt<Ffp>", // compounds (ingredients) table sDom
		onLoaded: null,

		/* compositionUri */
		columns: {
			composition: {
				'Type': {
					"title": "Type",
					"className": "left",
					"width": "10%",
					"data": "relation",
					"render": function (val, type, full) {
						if (type != 'display')
							return '' + val;
						var func = ("HAS_ADDITIVE" == val) ? full.proportion.function_as_additive : "";
						return '<span class="camelCase">' + val.substr(4).toLowerCase() + '</span>' + ((func === undefined || func === null || func == '') ? "" : " (" + func + ")");
					}
				},
				'Name': {
					"title": "Name",
					"className": "camelCase left",
					"width": "15%",
					"data": "component.compound.name",
					"render": function (val, type, full) {
						return (type != 'display') ? '' + val :
							'<a href="' + full.component.compound.URI + '" target="_blank" title="Click to view the compound"><span class="ui-icon ui-icon-link" style="float: left; margin-right: .3em;"></span></a>' + val;
					}
				},
				'EC No.': {
					"title": "EC No.",
					"className": "left",
					"width": "10%",
					"data": "component.compound.einecs"
				},
				'CAS No.': {
					"title": "CAS No.",
					"className": "left",
					"width": "10%",
					"data": "component.compound.cas"
				},
				'Typical concentration': {
					"title": "Typical concentration",
					"className": "center",
					"width": "15%",
					"data": "proportion.typical",
					"render": function (val, type, full) {
						return type != 'display' ? '' + val.value : jT.valueAndUnits(val.value, val.unit || '%&nbsp;(w/w)', val.precision);
					}
				},
				'Concentration ranges': {
					"title": "Concentration ranges",
					"className": "center colspan-2",
					"width": "20%",
					"data": "proportion.real",
					"render": function (val, type, full) {
						return type != 'display' ? '' + val.lowerValue : jT.valueAndUnits(val.value, val.unit || '%&nbsp;(w/w)', val.precision);
					}
				},
				'Upper range': {
					"title": 'Upper range',
					"className": "center",
					"width": "20%",
					"data": "proportion.real",
					"render": function (val, type, full) {
						return type != 'display' ? '' + val.upperValue : jT.valueAndUnits(val.value, val.unit || '%&nbsp;(w/w)', val.precision);
					}
				},
				'Also': {
					"title": "Also",
					"className": "center",
					"orderable": false,
					"data": "component.compound.URI",
					"defaultContent": "-"
				}
			}
		}
	};

	jT.ui.Composition = CompositionKit;

})(asSys, jQuery, jToxKit);
/* CompoundKit - General, universal compound dataset visualizer. Migrated.
 *
 * Copyright 2012-2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan Georgiev
 **/

(function (_, $, jT) {

	var instanceCount = 0;

	function positionTo(el, parent) {
		var ps = {
			left: -parent.offsetLeft,
			top: -parent.offsetTop
		};
		parent = parent.offsetParent;
		for (; !!el && el != parent; el = el.offsetParent) {
			ps.left += el.offsetLeft;
			ps.top += el.offsetTop;
		}
		return ps;
	}

	// constructor
	function CompoundKit(root, settings) {
		var self = this;
		self.rootElement = root;
		$(root).addClass('jtox-toolkit'); // to make sure it is there even in manual initialization.

		self.settings = $.extend(true, 
			{ configuration: { baseFeatures: jT.ambit.baseFeatures } }, 
			CompoundKit.defaults, 
			settings);

		// make a dull copy here, because, otherwise groups are merged... which we DON'T want
		if (settings != null && settings.configuration != null && settings.configuration.groups != null)
			self.settings.configuration.groups = settings.configuration.groups;

		self.instanceNo = instanceCount++;
		if (self.settings.rememberChecks && self.settings.showTabs)
			self.featureStates = {};

		// finally make the query, if Uri is provided
		if (self.settings['datasetUri'] != null)
			self.queryDataset(self.settings['datasetUri']);
	};

	// now follow the prototypes of the instance functions.
	CompoundKit.prototype.init = function () {
		var self = this;

		self.feature = null; // features, as downloaded from server, after being processed.
		self.dataset = null; // the last-downloaded dataset.
		self.groups = null; // computed groups, i.e. 'groupName' -> array of feature list, prepared.
		self.fixTable = self.varTable = null; // the two tables - to be initialized in prepareTables.
		self.entriesCount = null;
		self.suspendEqualization = false;
		self.orderList = [];
		self.usedFeatures = [];
		self.pageStart = self.settings.pageStart;
		self.pageSize = self.settings.pageSize;

		if (!self.settings.noInterface) {
			jT.ui.putTemplate('all-compound', ' ? ', self.rootElement);

			jT.ui.bindControls(self, {
				nextPage: function () { self.nextPage(); },
				prevPage: function () { self.prevPage(); },
				sizeChange: function () { self.queryEntries(self.pageStart, parseInt($(this).val())); },
				filter: function () { self.updateTables(); }
			});

			self.$procDiv = $('.jt-processing', self.rootElement);
			self.$errDiv = $('.jt-error', self.rootElement);
		}
	};

	CompoundKit.prototype.clearDataset = function () {
		if (this.usedFeatures !== undefined) {
			if (!this.settings.noInterface)
				$(this.rootElement).empty();
			for (var i = 0, fl = this.usedFeatures.length; i < fl; ++i) {
				var fid = this.usedFeatures[i];
				this.feature[fid].used = false;
			}
		}
	};

	/* make a tab-based widget with features and grouped on tabs. It relies on filled and processed 'self.feature' as well
	as created 'self.groups'.
	*/
	CompoundKit.prototype.prepareTabs = function (root, isMain, groupFn) {
		var self = this;

		var all = document.createElement('div');
		all.style.display = "none"; // we suppress the re-layouting engine this way, we'll show it at the end.
		root.appendChild(all);
		ulEl = document.createElement('ul');
		all.appendChild(ulEl);

		var createATab = function (grId, name) {
			var liEl = document.createElement('li');
			ulEl.appendChild(liEl);
			var aEl = document.createElement('a');
			aEl.href = "#" + grId;
			aEl.innerHTML = name;
			liEl.appendChild(aEl);
			return liEl;
		};

		var emptyList = [];
		var idx = 0;
		for (var gr in self.groups) {
			var grId = "jtox-ds-" + gr.replace(/\s/g, "_") + "-" + self.instanceNo + (isMain ? '' : '-details');
			var grName = gr.replace(/_/g, " ");
			var tabLi = createATab(grId, grName);
			if (isMain)
				tabLi.title = "Select which columns to be displayed";

			// now prepare the content...
			var divEl = document.createElement('div');
			divEl.id = grId;
			all.appendChild(divEl);
			// add the group check multi-change
			if (self.settings.groupSelection && isMain) {
				var sel = jT.ui.putTemplate("compound-one-tab", divEl);

				$('.multi-select', sel).on('click', function (e) {
					var par = $(this).closest('.ui-tabs-panel')[0];
					var doSel = $(this).haclassName('select');
					$('input', par).each(function () {
						this.checked = doSel;
						$(this).trigger('change');
					});
				});
			}

			if (groupFn(divEl, gr)) {
				if (self.settings.hideEmpty) {
					$(divEl).remove();
					$(tabLi).remove();
					--idx;
				} else
					emptyList.push(idx);
			}
			++idx;

			jT.fireCallback(self.settings.onTab, self, divEl, tabLi, grName, isMain);
		}

		if (isMain && self.settings.showExport) {
			var tabId = "jtox-ds-export-" + self.instanceNo;
			var liEl = createATab(tabId, "Export");
			$(liEl).addClass('jtox-ds-export');
			var divEl = jT.ui.putTemplate('compound-export', { id: tabId }, all);
			divEl = $('.jtox-exportlist', divEl)[0];

			for (var i = 0, elen = self.settings.configuration.exports.length; i < elen; ++i) {
				var expo = self.settings.configuration.exports[i];
				var el = jT.ui.putTemplate('compound-download', {}, divEl);

				$('a', el)[0].href = jT.addParameter(self.datasetUri, "media=" + encodeURIComponent(expo.type));
				var img = el.getElementsByTagName('img')[0];
				img.alt = img.title = expo.type;
				img.src = self.settings.baseUrl + '/' + expo.icon;
			}

			jT.fireCallback(self.settings.onTab, self, divEl, liEl, "Export", isMain);
		}

		// now show the whole stuff and mark the disabled tabs
		all.style.display = "block";
		return $(all).tabs({
			collapsible: isMain,
			active: (self.settings.tabsFolded && isMain) ? false : 0,
			disabled: emptyList,
			heightStyle: isMain ? "content" : (self.settings.detailsHeight == 'auto' ? 'auto' : 'fill')
		});
	};

	CompoundKit.prototype.equalizeTables = function () {
		var self = this;
		if (!self.suspendEqualization && self.fixTable != null && self.varTable != null) {
			jT.tables.equalizeHeights(self.fixTable.tHead, self.varTable.tHead);
			jT.tables.equalizeHeights(self.fixTable.tBodies[0], self.varTable.tBodies[0]);

			// now we need to equalize openned details boxes, if any.
			var tabRoot = $('.jtox-ds-tables', self.rootElement)[0];
			var varWidth = $('.jtox-ds-variable', tabRoot).width();

			$('.jtox-details-box', self.rootElement).each(function (i) {
				var cell = $(this).data('rootCell');
				if (!!cell) {
					this.style.display = 'none';
					var ps = positionTo(cell, tabRoot);
					this.style.top = ps.top + 'px';
					this.style.left = ps.left + 'px';
					var cellW = $(cell).parents('.dataTables_wrapper').width() - cell.offsetLeft;
					this.style.width = (cellW + varWidth) + 'px';
					this.style.display = 'block';

					var rowH = $(cell).parents('tr').height();
					var cellH = cell.offsetHeight;
					var meH = $(this).height();

					if (cellH < rowH)
						$(cell).height(cellH = rowH);
					if (cellH < meH)
						$(cell).height(cellH = meH);

					if (meH < cellH) {
						$(this).height(cellH);
						$('.ui-tabs').tabs('refresh');
					}
				}
			});
		}
	};

	CompoundKit.prototype.featureValue = function (fId, entry, type) {
		var self = this;
		var feature = self.feature[fId];
		var val = (feature.data !== undefined) ? (_.get(entry, $.isArray(feature.data) ? feature.data[0] : feature.data)) : entry.values[fId];
		return (typeof feature.render == 'function') ?
			feature.render(val, !!type ? type : 'filter', entry) :
			jT.ui.renderObjValue(val, feature.units, type);
	};

	CompoundKit.prototype.featureUri = function (fId) {
		return this.feature[fId].URI || fId;
	};

	CompoundKit.prototype.featureData = function (entry, set, scope) {
		if (scope == null)
			scope = 'details';
		var self = this;
		var data = [];
		_.each(set, function (fId) {  // TODO: The original enumObject was deep!
			var feat = $.extend({}, self.feature[fId]);
			var vis = feat.visibility;
			if (!!vis && vis != scope)
				return;
			var title = feat.title;
			feat.value = self.featureValue(fId, entry, scope);
			if (!!title && (!self.settings.hideEmptyDetails || !!feat.value)) {
				if (!feat.value)
					feat.value = '-';
				data.push(feat);
			}
		});

		return data;
	};

	CompoundKit.prototype.prepareColumn = function (fId, feature) {
		var self = this;
		if (feature.visibility == 'details')
			return null;

		// now we now we should show this one.
		var col = {
			"title": !feature.title ? '' : jT.ui.valueWithUnits(feature.title.replace(/_/g, ' '), (!self.settings.showUnits ? null : feature.units)),
			"defaultContent": "-",
		};

		if (typeof feature.column == 'function')
			col = feature.column.call(self, col, fId);
		else if (feature.column != null)
			col = $.extend(col, feature.column);

		col["data"] = (feature.data != null) ? feature.data : 'values';

		if (feature.render != null)
			col["render"] = feature.data != null ? feature.render : function (data, type, full) {
				return feature.render(full.values[fId], type, full);
			};
		else if (!!feature.shorten)
			col["render"] = function (data, type, full) {
				if (!feature.data) data = data[fId];
				return (type != "display") ? '' + data : jT.ui.shortenedData(data, "Press to copy the value in the clipboard");
			};
		else if (feature.data == null) // in other cases we want the default presenting of the plain value
			col["render"] = (function (featureId, units) {
				return function (data, type, full) {
					var val = full.values[featureId] || '-';
					if (typeof val != 'object')
						return val;
					if (!$.isArray(val))
						val = [val];
					var html = '';
					for (var i = 0; i < val.length; ++i) {
						html += (type == 'display') ? '<div>' : '';
						html += jT.ui.renderObjValue(val[i], units, type);
						html += (type == 'display') ? '</div>' : ',';
					}
					return html;
				};
			})(fId, feature.unit);

		// other convenient cases
		if (!!feature.shorten)
			col["width"] = "75px";

		return col;
	};

	CompoundKit.prototype.getVarRow = function (idx) {
		if (idx.tagName != null)
			idx = jT.ui.rowIndex(idx);

		return document.getElementById('jtox-var-' + this.instanceNo + '-' + idx);
	};

	CompoundKit.prototype.prepareTables = function () {
		var self = this;
		var varCols = [];
		var fixCols = [];

		// first, some preparation of the first, IdRow column
		var idFeature = self.settings.configuration.baseFeatures['#IdRow'];
		if (!idFeature.render) {
			idFeature.render = self.settings.hasDetails ?
				function (data, type, full) {
					return (type != "display") ?
						'' + data :
						"&nbsp;-&nbsp;" + data + "&nbsp;-&nbsp;<br/>" +
						'<span class="jtox-details-open ui-icon ui-icon-folder-collapsed" title="Press to open/close detailed info for this compound"></span>';
				} : // no details case
				function (data, type, full) {
					return (type != "display") ?
						'' + data :
						"&nbsp;-&nbsp;" + data + "&nbsp;-&nbsp;";
				};
		}

		fixCols.push(
			self.prepareColumn('#IdRow', idFeature), {
				"className": "jtox-hidden",
				"data": "index",
				"defaultContent": "-",
				"orderable": true,
				"render": function (data, type, full) {
					return self.orderList == null ? 0 : self.orderList[data];
				}
			} // column used for ordering
		);

		varCols.push({
			"className": "jtox-hidden jtox-ds-details paddingless",
			"data": "index",
			"render": function (data, type, full) {
				return '';
			}
		});

		// prepare the function for column switching...
		var fnShowColumn = function () {
			var dt = $(this).data();
			var cells = $(dt.sel + ' table tr .' + dt.column, self.rootElement);
			if (this.checked) {
				$(cells).show();
				$("table tr .blank-col", self.rootElement).addClass('jtox-hidden');
			} else {
				$(cells).hide();
				if ($(dt.sel + " table tr *:visible", self.rootElement).length == 0)
					$("table tr .blank-col", self.rootElement).removeClass('jtox-hidden');
			}
			if (self.settings.rememberChecks)
				self.featureStates[dt.id] = this.checked;
			self.equalizeTables();
		};

		var fnExpandCell = function (cell, expand) {
			var cnt = 0;
			for (var c = cell; c; c = c.nextElementSibling, ++cnt)
				$(c).toggleClass('jtox-hidden');

			if (expand)
				cell.setAttribute('colspan', '' + cnt);
			else
				cell.removeAttribute('colspan');
		};

		var fnShowDetails = (self.settings.hasDetails ? function (row, event) {
			var cell = $(".jtox-ds-details", row)[0];
			var idx = $(row).data('jtox-index');

			if (self.settings.preDetails != null && !jT.fireCallback(self.settings.preDetails, self, idx, cell) || !cell)
				return; // the !cell  means you've forgotten to add #DetailedInfoRow feature somewhere.
			$(row).toggleClass('jtox-detailed-row');
			var toShow = $(row).haclassName('jtox-detailed-row');

			// now go and expand both fixed and variable table details' cells.
			fnExpandCell(cell, toShow);
			var varCell = self.getVarRow(idx).firstElementChild;
			fnExpandCell(varCell, toShow);

			$('.jtox-details-open', row).toggleClass('ui-icon-folder-open ui-icon-folder-collapsed');

			if (toShow) {
				// i.e. we need to show it - put the full sized diagram in the fixed part and the tabs in the variable one...
				var entry = self.dataset.dataEntry[idx];

				var detDiv = document.createElement('div');
				detDiv.className = 'jtox-details-box jtox-details';

				var tabRoot = $('.jtox-ds-tables', self.rootElement)[0];
				var width = $(cell).width() + $('.jtox-ds-variable', tabRoot).width();
				$(detDiv).width(width);

				if (self.settings.detailsHeight == null || self.settings.detailsHeight == 'fill')
					$(detDiv).height($(cell).height() * 2);
				else if (parseInt(self.settings.detailsHeight) > 0)
					$(detDiv).height(self.settings.detailsHeight)

				tabRoot.appendChild(detDiv);

				self.prepareTabs(detDiv, false, function (parent, gr) {
					var data = self.featureData(entry, self.groups[gr]);

					if (data.length > 0 || !self.settings.hideEmpty) {
						$(parent).addClass('jtox-details-table');
						var tabTable = document.createElement('table');
						parent.appendChild(tabTable);
						$(tabTable).dataTable({
							"paging": false,
							"processing": true,
							"lengthChange": false,
							"autoWidth": true,
							"dom": "rt<f>",
							"columns": jT.ui.processColumns(self, 'compound'),
							"ordering": true,
						});
						$(tabTable).dataTable().fnAddData(data);
						$(tabTable).dataTable().fnAdjustColumnSizing();
					}

					return data.length == 0;
				});

				$(cell).height(detDiv.offsetHeight);
				jT.fireCallback(self.settings.onDetails, self, detDiv, entry, cell);
				$(cell).data('detailsDiv', detDiv);
				$(detDiv).data('rootCell', cell);
			} else {
				// i.e. we need to hide
				$(cell).data('detailsDiv').remove();
				$(cell).data('detailsDiv', null);
				cell.style.height = '';
			}

			self.equalizeTables();
		} : null); // fnShowDetails definition end

		// now proceed to enter all other columns
		for (var gr in self.groups) {
			_.each(self.groups[gr], function (fId, idx) {  // TODO: The original enumObject was deep!
				if (idx == "name")
					return;

				var feature = self.feature[fId];
				var col = self.prepareColumn(fId, feature);
				if (!col)
					return;

				// finally - assign column switching to the checkbox of main tab.
				var colList = !!feature.primary ? fixCols : varCols;
				var colId = 'col-' + colList.length;
				col.className = (!!col.className ? col.className + ' ' : '') + colId;

				$('.jtox-ds-features input.jtox-checkbox[value="' + fId + '"]', self.rootElement).data({
					sel: !!feature.primary ? '.jtox-ds-fixed' : '.jtox-ds-variable',
					column: colId,
					id: fId
				}).on('change', fnShowColumn)

				// and push it into the proper list.
				colList.push(col);
			});
		}

		// now - sort columns and create the tables...
		if (self.settings.fixedWidth != null)
			$(".jtox-ds-fixed", self.rootElement).width(self.settings.fixedWidth);

		jT.tables.sortColDefs(fixCols);
		self.fixTable = ($(".jtox-ds-fixed table", self.rootElement).dataTable({
			"paging": false,
			"lengthChange": false,
			"autoWidth": true,
			"dom": "rt",
			"columns": fixCols,
			"ordering": false,
			"createdRow": function (nRow, aData) {
				// attach the click handling
				var iDataIndex = aData.index;
				if (self.settings.hasDetails)
					$('.jtox-details-open', nRow).on('click', function (e) {
						fnShowDetails(nRow, e);
					});
				$(nRow).data('jtox-index', iDataIndex);

				jT.fireCallback(self.settings.onRow, self, nRow, aData, iDataIndex);
				jT.ui.installHandlers(self, nRow);
				$('.jtox-diagram span.ui-icon', nRow).on('click', function () {
					setTimeout(function () {
						$(self.fixTable).dataTable().fnAdjustColumnSizing();
						self.equalizeTables();
					}, 50);
				});
			},
			"language": {
				"emptyTable": '<span class="jt-feeding">' + (self.settings.language.sProcess || 'Feeding data...') + '</span>'
			}
		}))[0];

		// we need to put a fake column to stay, when there is no other column here, or when everything is hidden..
		varCols.push({
			"className": "center blank-col" + (varCols.length > 1 ? " jtox-hidden" : ""),
			"data": "index",
			"render": function (data, type, full) {
				return type != 'display' ? data : '...';
			}
		});

		jT.ui.sortColDefs(varCols);
		self.varTable = ($(".jtox-ds-variable table", self.rootElement).dataTable({
			"paging": false,
			"processing": true,
			"lengthChange": false,
			"autoWidth": false,
			"dom": "rt",
			"ordering": true,
			"columns": varCols,
			"scrollCollapse": true,
			"createdRow": function (nRow, aData) {
				var iDataIndex = aData.index;
				nRow.id = 'jtox-var-' + self.instanceNo + '-' + iDataIndex;

				// equalize multi-rows, if there are any
				jT.tables.equalizeHeights.apply(window, $('td.jtox-multi table tbody', nRow).toArray());

				$(nRow).addClass('jtox-row');
				$(nRow).data('jtox-index', iDataIndex);
				jT.fireCallback(self.settings.onRow, self, nRow, aData, iDataIndex);
				jT.ui.installHandlers(self, nRow);
			},
			"drawCallback": function (oSettings) {
				// this is for synchro-sorting the two tables
				var sorted = $('.jtox-row', this);
				for (var i = 0, rlen = sorted.length; i < rlen; ++i) {
					var idx = $(sorted[i]).data('jtox-index');
					self.orderList[idx] = i;
				}

				if (rlen > 0)
					$(self.fixTable).dataTable().fnSort([
						[1, "asc"]
					]);
			},
			"language": {
				"emptyTable": "-"
			}
		}))[0];
	};

	CompoundKit.prototype.updateTables = function () {
		var self = this;
		if (self.settings.hasDetails)
			$('div.jtox-details-box', self.rootElement).remove();

		self.filterEntries($('.jtox-controls input', self.rootElement).val());
	};

	/* Prepare the groups and the features.
	 */
	CompoundKit.prototype.prepareGroups = function (miniset) {
		var self = this;

		var grps = self.settings.configuration.groups;
		if (typeof grps == 'function')
			grps = grps(miniset, self);

		self.groups = {};
		for (var i in grps) {
			var grp = grps[i];
			if (grp == null)
				continue;

			var grpArr = (typeof grp == "function" || typeof grp == "string") ? jT.fireCallback(grp, self, i, miniset) : grp;
			self.groups[i] = [];
			_.each(grpArr, function (fid, idx) {  // TODO: The original enumObject was deep!
				var isUsed = false;
				CompoundKit.enumSameAs(fid, self.feature, function (feature) {
					isUsed |= feature.used;
				});
				if (idx != "name" && !isUsed) {
					self.groups[i].push(fid);
					// these we need to be able to return back to original state.
					self.usedFeatures.push(fid);
					self.feature[fid].used = true;
				}
			});
		}
	};

	/* Enumerate all recofnized features, caling fnMatch(featureId, groupId) for each of it.
	Return true from the function to stop enumeration, which in turn will return true if it was stopped.
	*/
	CompoundKit.prototype.enumerateFeatures = function (fnMatch) {
		var self = this;
		var stopped = false;
		for (var gr in self.groups) {
			for (var i = 0, glen = self.groups[gr].length; i < glen; ++i) {
				if (stopped = fnMatch(self.groups[gr][i], gr))
					break;
			}

			if (stopped)
				break;
		}

		return stopped;
	};

	CompoundKit.prototype.filterEntries = function (needle) {
		var self = this;

		if (needle == null)
			needle = '';
		else
			needle = needle.toLowerCase();

		var dataFeed = [];
		if (needle != '') {
			for (var i = 0, slen = self.dataset.dataEntry.length; i < slen; ++i) {
				var entry = self.dataset.dataEntry[i];

				var match = self.enumerateFeatures(function (fId, gr) {
					var feat = self.feature[fId];
					if (feat.search !== undefined && !feat.search)
						return false;
					var val = self.featureValue(fId, entry, 'sort');
					return val != null && val.toString().toLowerCase().indexOf(needle) >= 0;
				});


				if (match)
					dataFeed.push(entry);
			}
		} else {
			dataFeed = self.dataset.dataEntry;
		}

		$(self.fixTable).dataTable().fnClearTable();
		$(self.varTable).dataTable().fnClearTable();
		$(self.fixTable).dataTable().fnAddData(dataFeed);
		$(self.varTable).dataTable().fnAddData(dataFeed);
		$('.jt-feeding', self.rootElement).html(self.settings.language.sZeroRecords || 'No records matching the filter.');

		jT.ui.updateTree($('.jtox-controls', self.rootElement)[0], {
			"filtered-text": !needle ? " " : ' (filtered to <span class="high">' + dataFeed.length + '</span>) '
		});

		if (self.settings.showTabs) {
			self.suspendEqualization = true;
			$('.jtox-ds-features .jtox-checkbox', self.rootElement).trigger('change');
			self.suspendEqualization = false;
		}

		// finally
		self.equalizeTables();
	};

	CompoundKit.prototype.queryUri = function (scope) {
		var self = this;
		if (self.datasetUri == null)
			return null;
		if (scope == null)
			scope = {
				from: self.pageStart,
				size: self.pageSize
			};
		if (scope.from < 0)
			scope.from = 0;
		if (scope.size == null)
			scope.size = self.pageSize;

		return jT.addParameter(self.datasetUri, "page=" + Math.floor(scope.from / scope.size) + "&pagesize=" + scope.size);
	};

	// make the actual query for the (next) portion of data.
	CompoundKit.prototype.queryEntries = function (from, size, dataset) {
		var self = this;
		var scope = {
			'from': from,
			'size': size
		};
		var qUri = self.queryUri(scope);
		$('.jtox-controls select', self.rootElement).val(scope.size);
		self.dataset = null;

		// the function for filling
		var fillFn = function (dataset) {
			if (!!dataset) {
				// first, arrange the page markers
				self.pageSize = scope.size;
				var qStart = self.pageStart = Math.floor(scope.from / scope.size) * scope.size;
				if (dataset.dataEntry.length < self.pageSize) // we've reached the end!!
					self.entriesCount = qStart + dataset.dataEntry.length;

				// then process the dataset
				self.dataset = CompoundKit.processDataset(dataset, $.extend(true, {}, dataset.feature, self.feature), self.settings.fnAccumulate, self.pageStart);
				// time to call the supplied function, if any.
				jT.fireCallback(self.settings.onLoaded, self, dataset);
				if (!self.settings.noInterface) {
					// ok - go and update the table, filtering the entries, if needed
					self.updateTables();
					if (self.settings.showControls) {
						// finally - go and update controls if they are visible
						self.updateControls(qStart, dataset.dataEntry.length);
					}
				}
			} else {
				jT.fireCallback(self.settings.onLoaded, self, dataset);
			}
			jT.fireCallback(self.settings.onComplete, self);
		};

		// we may be passed dataset, if the initial, setup query was 404: Not Found - to avoid second such query...
		if (dataset != null)
			fillFn(dataset)
		else
			jT.ambit.call(self, qUri, fillFn);
	};

	/* Retrieve features for provided dataserUri, using settings.featureUri, if provided, or making automatice page=0&pagesize=1 query
	 */
	CompoundKit.prototype.queryFeatures = function (featureUri, callback) {
		var self = this;
		var dataset = null;

		// first, build the proper
		var queryUri = featureUri || self.settings.featureUri || self.settings.feature_uri;
		if (!queryUri) // rollback this is the automatic way, which makes a false query in the beginning
			queryUri = jT.addParameter(self.datasetUri, "page=0&pagesize=1");

		// now make the actual call...
		jT.ambit.call(self, queryUri, function (result, jhr) {
			if (!result && jhr.status != 200) {
				self.$procDiv.hide();
				self.$errDiv.show().find('.message').html('Server error: ' + jhr.statusText);
			}

			// remove the loading pane in anyways..
			if (!!result) {
				self.feature = result.feature;

				CompoundKit.processFeatures(self.feature, self.settings.configuration.baseFeatures);
				var miniset = {
					dataEntry: [],
					feature: self.feature
				};
				if (!self.settings.noInterface) {
					self.prepareGroups(miniset);
					if (self.settings.showTabs) {
						// tabs feature building
						var nodeFn = function (id, name, parent) {
							var fEl = jT.ui.putTemplate('compound-one-feature', {
								title: name.replace(/_/g, ' '),
								uri: self.featureUri(id)
							}, parent);

							var checkEl = $('input[type="checkbox"]', fEl)[0];
							if (!checkEl)
								return;
							checkEl.value = id;
							if (self.settings.rememberChecks)
								checkEl.checked = (self.featureStates[id] === undefined || self.featureStates[id]);

							return fEl;
						};

						self.prepareTabs($('.jtox-ds-features', self.rootElement)[0], true, function (divEl, gr) {
							var empty = true;
							_.each(self.groups[gr], function (fId, idx, level) {  // TODO: The original enumObject was deep!
								var vis = (self.feature[fId] || {})['visibility'];
								if (!!vis && vis != 'main')
									return;
								empty = false;
								if (idx == "name")
									var fEl = nodeFn(null, fId, divEl);
								else if (level == 1) {
									var title = self.feature[fId].title;
									if (title != null)
										nodeFn(fId, title, divEl);
								}
							});

							return empty;
						});
					}

					jT.fireCallback(self.settings.onPrepared, self, miniset, self);
					self.prepareTables(); // prepare the tables - we need features to build them - we have them!
					self.equalizeTables(); // to make them nicer, while waiting...
				} else {
					jT.fireCallback(self.settings.onPrepared, self, miniset, self);
				}

				// finally make the callback for
				callback(dataset);
			}
		});
	};

	/* Makes a query to the server for particular dataset, asking for feature list first, so that the table(s) can be
	prepared.
	*/
	CompoundKit.prototype.queryDataset = function (datasetUri, featureUri) {
		var self = this;
		// if some oldies exist...
		this.clearDataset();
		this.init();

		datasetUri = jT.grabPaging(self, datasetUri);

		self.settings.baseUrl = self.settings.baseUrl || jT.grabBaseUrl(datasetUri);

		// remember the _original_ datasetUri and make a call with one size length to retrieve all features...
		self.datasetUri = (datasetUri.indexOf('http') != 0 ? self.settings.baseUrl : '') + datasetUri;

		self.$procDiv.show();
		self.$errDiv.hide();
		if (!!self.settings.language.sLoadingRecords)
			$('.message', procDiv).html(self.settings.language.sLoadingRecords);

		self.queryFeatures(featureUri, function (dataset) {
			self.$procDiv.hide();
			self.queryEntries(self.pageStart, self.pageSize, dataset);
		});
	};

	/* This is a needed shortcut that jToxQuery routine will call
	 */
	CompoundKit.prototype.query = function (uri) {
		this.queryDataset(uri);
	};
	// end of prototype

	CompoundKit.prototype.nextPage = jT.tables.nextPage;
	CompoundKit.prototype.prevPage = jT.tables.prevPage;
	CompoundKit.prototype.updateControls = jT.tables.updateControls;

	// some public, static methods
	CompoundKit.processEntry = function (entry, features, fnValue) {
		if (!fnValue)
			fnValue = CompoundKit.defaults.fnAccumulate;

		for (var fid in entry.values) {
			var feature = features[fid];
			if (!feature)
				continue;
			var newVal = entry.values[fid];

			// if applicable - location the feature value to a specific location whithin the entry
			if (!!feature.accumulate && !!newVal && !!feature.data) {
				var fn = typeof feature.accumulate == 'function' ? feature.accumulate : fnValue;
				var accArr = feature.data;
				if (!$.isArray(accArr))
					accArr = [accArr];

				for (var v = 0; v < accArr.length; ++v)
					_.set(entry, accArr[v], jT.fireCallback(fn, this, fid, /* oldVal */ _.get(entry, accArr[v]), newVal, features));
			}
		}

		return entry;
	};

	CompoundKit.extractFeatures = function (entry, features, callback) {
		var data = [];
		for (var fId in features) {
			var feat = $.extend({}, features[fId]);
			feat.value = entry.values[fId];
			if (!!feat.title) {
				if (jT.fireCallback(callback, null, feat, fId, data.length) !== false) {
					if (!feat.value)
						feat.value = '-';
					data.push(feat);
				}
			}
		};

		return data;
	};

	CompoundKit.enumSameAs = function (fid, features, callback) {
		// starting from the feature itself move to 'sameAs'-referred features, until sameAs is missing or points to itself
		// This, final feature should be considered "main" and title and others taken from it.
		var feature = features[fid];
		var base = fid.replace(/(http.+\/feature\/).*/g, "$1");
		var retId = fid;

		for (;;) {
			jT.fireCallback(callback, null, feature, retId);
			if (feature.sameAs == null || feature.sameAs == fid || fid == base + feature.sameAs)
				break;
			if (features[feature.sameAs] !== undefined)
				retId = feature.sameAs;
			else {
				if (features[base + feature.sameAs] !== undefined)
					retId = base + feature.sameAs;
				else
					break;
			}

			feature = features[retId];
		}

		return retId;
	};

	CompoundKit.processFeatures = function (features, bases) {
		if (bases == null)
			bases = jT.Ambit.baseFeatures;
		features = $.extend(features, bases);

		for (var fid in features) {
			var theFeat = features[fid];
			if (!theFeat.URI)
				theFeat.URI = fid;
			CompoundKit.enumSameAs(fid, features, function (feature, id) {
				var sameAs = feature.sameAs;
				feature = $.extend(true, feature, theFeat);
				theFeat = $.extend(true, theFeat, feature);
				feature.sameAs = sameAs;
			});
		}

		return features;
	};

	CompoundKit.processDataset = function (dataset, features, fnValue, startIdx) {
		if (!features) {
			CompoundKit.processFeatures(dataset.feature);
			features = dataset.feature;
		}

		if (!fnValue)
			fnValue = CompoundKit.defaults.fnAccumulate;

		if (!startIdx)
			startIdx = 0;

		for (var i = 0, dl = dataset.dataEntry.length; i < dl; ++i) {
			CompoundKit.processEntry(dataset.dataEntry[i], features, fnValue);
			dataset.dataEntry[i].number = i + 1 + startIdx;
			dataset.dataEntry[i].index = i;
		}

		return dataset;
	};

	CompoundKit.defaults = { // all settings, specific for the kit, with their defaults. These got merged with general (jToxKit) ones.
		"noInterface": false, // runs in interface-less mode, so that it can be used only for information retrieval.
		"showTabs": true, // should we show tabs with groups, or not
		"tabsFolded": false, // should present the feature-selection tabs folded initially
		"showExport": true, // should we add export tab up there
		"showControls": true, // should we show the pagination/navigation controls.
		"showUnits": true, // should we show units in the column title.
		"hideEmpty": false, // whether to hide empty groups instead of making them inactive
		"groupSelection": true, // wether to show select all / unselect all links in each group
		"hasDetails": true, // whether browser should provide the option for per-item detailed info rows.
		"hideEmptyDetails": true, // hide feature values, when they are empty (only in detailed view)
		"detailsHeight": "fill", // what is the tabs' heightStyle used for details row
		"fixedWidth": null, // the width (in css units) of the left (non-scrollable) part of the table
		"pageSize": 20, // what is the default (startint) page size.
		"pageStart": 0, // what is the default startint point for entries retrieval
		"rememberChecks": false, // whether to remember feature-checkbox settings between queries
		"featureUri": null, // an URI for retrieving all feature for the dataset, rather than 1-sized initial query, which is by default
		"metricFeature": "http://www.opentox.org/api/1.1#Similarity", // This is the default metric feature, if no other is specified
		"onTab": null, // invoked after each group's tab is created - function (element, tab, name, isMain);
		"onLoaded": null, // invoked when a set of compounds is loaded.
		"onComplete": null, // invoked when the component is all ready.
		"onPrepared": null, // invoked when the initial call for determining the tabs/columns is ready
		"onDetails": null, // invoked when a details pane is openned
		"preDetails": null, // invoked prior of details pane creation to see if it is going to happen at all
		"language": {}, // some default language settings, which apply to first (static) table only
		"fnAccumulate": function (fId, oldVal, newVal, features) {
			if (newVal == null)
				return oldVal;
			newVal = newVal.toString();
			if (oldVal == null || newVal.toLowerCase().indexOf(oldVal.toLowerCase()) >= 0)
				return newVal;
			if (oldVal.toLowerCase().indexOf(newVal.toLowerCase()) >= 0)
				return oldVal;
			return oldVal + ", " + newVal;
		},
		"configuration": {
			"groups": {
				"Identifiers": [
					"http://www.opentox.org/api/1.1#Diagram",
					"#DetailedInfoRow",
					"http://www.opentox.org/api/1.1#CASRN",
					"http://www.opentox.org/api/1.1#EINECS",
					"http://www.opentox.org/api/1.1#IUCLID5_UUID"
				],

				"Names": [
					"http://www.opentox.org/api/1.1#ChemicalName",
					"http://www.opentox.org/api/1.1#TradeName",
					"http://www.opentox.org/api/1.1#IUPACName",
					"http://www.opentox.org/api/1.1#SMILES",
					"http://www.opentox.org/api/1.1#InChIKey",
					"http://www.opentox.org/api/1.1#InChI",
					"http://www.opentox.org/api/1.1#REACHRegistrationDate"
				],

				"Calculated": function (name, miniset) {
					var arr = [];
					if (miniset.dataEntry.length > 0 && miniset.dataEntry[0].compound.metric != null)
						arr.push(this.settings.metricFeature);

					for (var f in miniset.feature) {
						var feat = miniset.feature[f];
						if (feat.source == null || feat.source.type == null || !!feat.basic)
							continue;
						else if (feat.source.type.toLowerCase() == "algorithm" || feat.source.type.toLowerCase() == "model") {
							arr.push(f);
						}
					}
					return arr;
				},

				"Other": function (name, miniset) {
					var arr = [];
					for (var f in miniset.feature) {
						if (!miniset.feature[f].used && !miniset.feature[f].basic)
							arr.push(f);
					}
					return arr;
				}
			},
			"exports": [{
					type: "chemical/x-mdl-sdfile",
					icon: "images/sdf64.png"
				},
				{
					type: "chemical/x-cml",
					icon: "images/cml64.png"
				},
				{
					type: "chemical/x-daylight-smiles",
					icon: "images/smi64.png"
				},
				{
					type: "chemical/x-inchi",
					icon: "images/inchi64.png"
				},
				{
					type: "text/uri-list",
					icon: "images/lnk64.png"
				},
				{
					type: "application/pdf",
					icon: "images/pdf64.png"
				},
				{
					type: "text/csv",
					icon: "images/csv64.png"
				},
				{
					type: "text/plain",
					icon: "images/txt64.png"
				},
				{
					type: "text/x-arff",
					icon: "images/arff.png"
				},
				{
					type: "text/x-arff-3col",
					icon: "images/arff-3.png"
				},
				{
					type: "application/rdf+xml",
					icon: "images/rdf64.png"
				},
				{
					type: "application/json",
					icon: "images/json64.png"
				},
				{
					type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					icon: "images/xlsx.png"
				}
			],

			// These are instance-wide pre-definitions of default baseFeatures as described below.
			"baseFeatures": {
				// and one for unified way of processing diagram. This can be used as template too
				"http://www.opentox.org/api/1.1#Diagram": {
					title: "Diagram",
					search: false,
					visibility: "main",
					primary: true,
					data: "compound.URI",
					column: {
						className: "paddingless",
						width: "125px"
					},
					render: function (data, type, full) {
						dUri = jT.ui.diagramUri(data);
						return (type != "display") ? dUri : '<div class="jtox-diagram borderless"><span class="ui-icon ui-icon-zoomin"></span><a target="_blank" href="' + data + '"><img src="' + dUri + '" class="jtox-smalldiagram"/></a></div>';
					}
				},
				'#IdRow': {
					used: true,
					basic: true,
					data: "number",
					column: {
						className: "middle"
					}
				},
				"#DetailedInfoRow": {
					title: "Diagram",
					search: false,
					data: "compound.URI",
					basic: true,
					primary: true,
					column: {
						className: "jtox-hidden jtox-ds-details paddingless",
						width: "0px"
					},
					visibility: "none",
					render: function (data, type, full) {
						return '';
					}
				},

				"http://www.opentox.org/api/1.1#Similarity": {
					title: "Similarity",
					data: "compound.metric",
					search: true
				},
			},
			"columns": {
				"compound": {
					"Name": {
						title: "Name",
						data: 'title',
						render: function (data, type, full) {
							return '<span>' + data + '</span>' + jT.ui.putInfo(full.URI);
						}
					},
					"Value": {
						title: "Value",
						data: 'value',
						defaultContent: "-"
					},
					"SameAs": {
						title: "SameAs",
						data: 'sameAs',
						defaultContent: "-"
					},
					"Source": {
						title: "Source",
						data: 'source',
						defaultContent: "-",
						render: function (data, type, full) {
							return !data || !data.type ? '-' : '<a target="_blank" href="' + data.URI + '">' + data.type + '</a>';
						}
					}
				}
			}
		}
	};

	jT.ui.Compound = CompoundKit;

})(_, jQuery, jToxKit);
/** jToxKit - chem-informatics multi-tool-kit.
 * The combined, begamoth kit providing full faceted search capabilites.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
 */

(function (Solr, a$, $, jT) {

    var
        mainLookupMap = {},
        uiConfiguration = {},
        defaultSettings = {
            servlet: "select",
            multipleSelection: true,
            keepAllFacets: true,
            connector: $,
            onPrepare: function (settings) {
                var qidx = settings.url.indexOf("?");

                if (this.proxyUrl) {
                    settings.data = {
                        query: settings.url.substr(qidx + 1)
                    };
                    settings.url = this.proxyUrl;
                    settings.type = settings.method = 'POST';
                } else {
                    settings.url += (qidx < 0 ? "?" : "&") + "wt=json";
                }
            },
            topSpacing: 10,
            nestingField: "type_s",
            nestingRules: {
                "composition": {
                    parent: "substance",
                    limit: 100
                },
                "study": {
                    parent: "substance",
                    limit: 10000
                },
                "params": {
                    parent: "study",
                    limit: 10000
                },
                "conditions": {
                    parent: "study",
                    limit: 10000
                }
            },
            exportTypes: [],
            exportSolrDefaults: [
                { name: "echoParams", value: "none" },
                { name: 'rows', value: 999998 } //2147483647
            ],
            exportDefaultDef: {
                callbacksMap: {
                    lookup: function (val) { return mainLookupMap[val] || val; }
                }
            },
            savedQueries: [],
            listingFields: [],
            facets: [],
            summaryRenderers: {}
        },

        uiUpdateTimer = null,
        uiUpdate = function () {
            if (uiUpdateTimer != null)
                clearTimeout(uiUpdateTimer);
            uiUpdateTimer = setTimeout(function () {
                var state = jT.modifyURL(window.location.href, "ui", encodeURIComponent(JSON.stringify(uiConfiguration)));

                if (!!state)
                    window.history.pushState({
                        query: window.location.search
                    }, document.title, state);
                uiUpdateTimer = null;
            }, 1000);
        },

        tagRender = function (tag) {
            var view, title = view = tag.title.replace(/^\"(.+)\"$/, "$1");

            title = view.replace(/^caNanoLab\./, "").replace(/^http\:\/\/dx\.doi\.org/, "");
            title = (mainLookupMap[title] || title).replace("NPO_", "").replace(" nanoparticle", "");

            var aux$ = $('<span/>').html(tag.count || 0);
            if (typeof tag.onAux === 'function')
                aux$.click(tag.onAux);

            var el$ = $('<li/>')
                .append($('<a href="#" class="tag" title="' + view + " " + (tag.hint || "") + ((title != view) ? ' [' + view + ']' : '') + '">' + title + '</a>')
                    .append(aux$)
                );

            if (typeof tag.onMain === 'function')
                el$.click(tag.onMain);
            if (tag.color)
                el$.addClass(tag.color);

            return el$;
        },

        tagInit = function (manager) {
            jT.TagWidget.prototype.init.call(this, manager);
            manager.getListener("current").registerWidget(this);
        },

        tagsUpdated = function (total) {
            var hdr = this.getHeaderText();
            hdr.textContent = jT.ui.updateCounter(hdr.textContent, total);
            a$.act(this, this.header.data("refreshPanel"));

            var ui = uiConfiguration[this.id] || {};
            ui.values = this.getValues();
            uiConfiguration[this.id] = ui;
            uiUpdate();
        },

        toggleAggregate = function (el) {
            var option = el.value.toUpperCase() == "OR",
                pars = this.getValues();

            this.clearValues();
            this.aggregate = !option;
            el.value = option ? "AND" : "OR";
            for (var i = 0; i < pars.length; ++i)
                this.addValue(pars[i]);
            this.doRequest();

            var ui = uiConfiguration[this.id] || {};
            ui.aggregate = !option;
            uiConfiguration[this.id] = ui;
            uiUpdate();
        };

    jT.ui.FacetedSearch = function (settings) {
        this.id = null;
        a$.extend(true, this, defaultSettings, settings);
        this.serverUrl = this.solrUrl;

        if (typeof this.lookupMap === "string")
            this.lookupMap = window[this.lookupMap];

        if (this.lookupMap == null)
            this.lookupMap = {};
        mainLookupMap = this.lookupMap;

        $(settings.target).html(jT.ui.templates['faceted-search-kit']);
        delete this.target;

        var uiConf = jT.parseURL(window.location.href).params['ui'];
        if (uiConf != null)
            uiConfiguration = JSON.parse(decodeURIComponent(uiConf));

        this.initDom();
        this.initComm();
        this.initExport();
        this.initQueries();
    };

    jT.ui.FacetedSearch.prototype = {
        initDom: function () {
            // Now instantiate and things around it.
            this.accordion = $("#accordion");
            this.accordion.accordion({
                heightStyle: "content",
                collapsible: true,
                animate: 200,
                active: false,
                activate: function (event, ui) {
                    if (!!ui.newPanel && !!ui.newPanel[0]) {
                        var header = ui.newHeader[0],
                            panel = ui.newPanel[0],
                            filter = $("input.widget-filter", panel),
                            widgetFilterScroll = filter.outerHeight(true),
                            refreshPanel;

                        if (!$("span.ui-icon-search", header).length) {
                            refreshPanel = function () {
                                if (panel.scrollHeight > panel.clientHeight || filter.val() != "" || $(header).hasClass("nested-tab")) {
                                    $(panel).scrollTop(widgetFilterScroll);
                                    filter.show()
                                    $("span.ui-icon-search", header).removeClass("unused");
                                } else {
                                    filter.hide();
                                    $("span.ui-icon-search", header).addClass("unused");
                                }
                            };

                            ui.newPanel.data("refreshPanel", refreshPanel);
                            ui.newHeader.data("refreshPanel", refreshPanel);
                            ui.newHeader.append($('<span class="ui-icon ui-icon-search"></span>').on("click", function (e) {
                                ui.newPanel.animate({
                                    scrollTop: ui.newPanel.scrollTop() > 0 ? 0 : widgetFilterScroll
                                }, 300, function () {
                                    if (ui.newPanel.scrollTop() > 0)
                                        $("input.widget-filter", panel).blur();
                                    else
                                        $("input.widget-filter", panel).focus();
                                });

                                e.stopPropagation();
                                e.preventDefault();
                            }));
                        } else
                            refreshPanel = ui.newPanel.data("refreshPanel");

                        filter.val("");
                        refreshPanel();
                    }
                }
            });

            $(document).on("click", "ul.tag-group", function (e) {
                $(this).toggleClass("folded");
                $(this).parents(".widget-root").data("refreshPanel").call();
            });

            // ... and prepare the actual filtering funtion.
            $(document).on('keyup', "#accordion input.widget-filter", function (e) {
                var needle = $(this).val().toLowerCase(),
                    div = $(this).parents('div.widget-root')[0],
                    cnt;

                if ((e.keyCode || e.which) == 27)
                    $(this).val(needle = "");

                if (needle == "")
                    $('li,ul', div).show();
                else {
                    $('li>a', div).each(function () {
                        var fold = $(this).closest("ul.tag-group"),
                            tag = $(this).parent();
                        cnt = fold.data("hidden") || 0;
                        if (tag.hasClass("category"))
                        ;
                        else if (this.title.toLowerCase().indexOf(needle) >= 0 || this.innerText.toLowerCase().indexOf(needle) >= 0)
                            tag.show();
                        else {
                            tag.hide();
                            ++cnt;
                        }

                        if (!!fold.length && !!cnt)
                            fold.data("hidden", cnt);
                    });
                }

                // now check if some of the boxes need to be hidden.
                $("ul.tag-group", div).each(function () {
                    var me = $(this);

                    cnt = parseInt(me.data("hidden")) || 0;
                    if (me.children().length > cnt + 1)
                        me.show().removeClass("folded");
                    else
                        me.hide().addClass("folded");

                    me.data("hidden", null);
                });
            });

            var resDiv = $("#result-tabs"),
                self = this;

            resDiv.tabs({});

            $("#accordion-resizer").resizable({
                minWidth: 150,
                maxWidth: 450,
                grid: [10, 10],
                handles: "e",
                start: function (e, ui) {
                    resSize = {
                        width: resDiv.width(),
                        height: resDiv.height()
                    };
                },
                resize: function (e, ui) {
                    self.accordion.accordion("refresh");
                    $('#query-sticky-wrapper').width(self.accordion.width());
                    $(this).width(function (i, w) {
                        return w - 7;
                    }); // minus the total padding of parent elements
                }
            });

            $(".query-left#query").sticky({
                topSpacing: this.topSpacing,
                widthFromWrapper: false
            });
        },

        /** The actual widget and communication initialization routine!
         */
        initComm: function () {
            var Manager, Basket,
                PivotWidget = a$(Solr.Requesting, Solr.Spying, Solr.Pivoting, jT.PivotWidgeting, jT.RangeWidgeting),
                TagWidget = a$(Solr.Requesting, Solr.Faceting, jT.AccordionExpansion, jT.TagWidget, jT.Running);

            this.manager = Manager = new(a$(Solr.Management, Solr.Configuring, Solr.QueryingJson, jT.Translation, jT.NestedSolrTranslation))(this);

            Manager.addListeners(new jT.ResultWidget($.extend(true, {
                id: 'result',
                target: $('#docs'),
                itemId: "s_uuid",
                nestLevel: "composition",
                onClick: function (e, doc) {
                    if (Basket.findItem(doc.s_uuid) < 0) {
                        Basket.addItem(doc);
                        var s = "",
                            jel = $('a[href="#basket_tab"]');

                        jel.html(jT.ui.updateCounter(jel.html(), Basket.length));

                        Basket.enumerateItems(function (d) {
                            s += d.s_uuid + ";";
                        });
                        if (!!(s = jT.modifyURL(window.location.href, "basket", s)))
                            window.history.pushState({
                                query: window.location.search
                            }, document.title, s);

                        $("footer", this).toggleClass("add none");
                    }
                },
                onCreated: function (doc) {
                    $("footer", this).addClass("add");
                }
            }, this)));

            Manager.addListeners(new(a$(Solr.Widgets.Pager))({
                id: 'pager',
                target: $('#pager'),
                prevLabel: '&lt;',
                nextLabel: '&gt;',
                innerWindow: 1,
                renderHeader: function (perPage, offset, total) {
                    $('#pager-header').html('<span>' +
                        'displaying ' + Math.min(total, offset + 1) +
                        ' to ' +
                        Math.min(total, offset + perPage) +
                        ' of ' + total +
                        '</span>');
                }
            }));

            // Now the actual initialization of facet widgets
            for (var i = 0, fl = this.facets.length; i < fl; ++i) {
                var f = this.facets[i],
                    ui = uiConfiguration[f.id],
                    w = new TagWidget($.extend({
                        target: this.accordion,
                        expansionTemplate: "tab-topcategory",
                        subtarget: "ul",
                        runMethod: toggleAggregate,
                        multivalue: this.multipleSelection,
                        aggregate: ui === undefined || ui.aggregate === undefined ? this.aggregateFacets : ui.aggregate,
                        exclusion: this.multipleSelection || this.keepAllFacets,
                        useJson: true,
                        renderItem: tagRender,
                        init: tagInit,
                        onUpdated: tagsUpdated,
                        nesting: "type_s:substance",
                        domain: {
                            type: "parent",
                            "which": "type_s:substance"
                        },
                        classes: f.color
                    }, f))

                w.afterTranslation = function (data) {
                    this.populate(this.getFacetCounts(data.facets));
                };

                $(w.target).closest('div.widget-content').find('input.switcher').val(w.aggregate ? "OR" : "AND");

                Manager.addListeners(w);
            };

            // ... add the mighty pivot widget.
            Manager.addListeners(new PivotWidget({
                id: "studies",
                target: this.accordion,
                subtarget: "ul",
                expansionTemplate: "tab-topcategory",
                before: "#cell_header",
                field: "loValue_d",
                lookupMap: this.lookupMap,
                pivot: this.pivot,
                statistics: {
                    'min': "min(loValue_d)",
                    'max': "max(loValue_d)",
                    'avg': "avg(loValue_d)"
                },
                slidersTarget: $("#sliders"),
                multivalue: this.multipleSelection,
                aggregate: this.aggregateFacets,
                exclusion: this.multipleSelection || this.keepAllFacets,
                useJson: true,
                renderTag: tagRender,
                classes: "dynamic-tab",
                nesting: "type_s:substance",
                domain: {
                    type: "parent",
                    which: "type_s:substance"
                }
            }));

            // ... And finally the current-selection one, and ...
            Manager.addListeners(new jT.CurrentSearchWidget({
                id: 'current',
                target: $('#selection'),
                renderItem: tagRender,
                useJson: true
            }));

            // Now add the basket.
            this.basket = Basket = new(a$(jT.ListWidget, jT.ItemListWidget))($.extend(true, {
                id: 'basket',
                target: $('#basket-docs'),
                summaryRenderers: this.summaryRenderers,
                itemId: "s_uuid",
                onClick: function (e, doc) {
                    if (Basket.eraseItem(doc.s_uuid) === false) {
                        console.log("Trying to remove from basket an inexistent entry: " + JSON.stringify(doc));
                        return;
                    }

                    $(this).remove();
                    var s = "",
                        jel = $('a[href="#basket_tab"]'),
                        resItem = $("#result_" + doc.s_uuid);

                    jel.html(jT.ui.updateCounter(jel.html(), Basket.length));
                    Basket.enumerateItems(function (d) {
                        s += d.s_uuid + ";";
                    });
                    if (!!(s = jT.modifyURL(window.location.href, "basket", s)))
                        window.history.pushState({
                            query: window.location.search
                        }, document.title, s);

                    if (resItem.length > 0)
                        $("footer", resItem[0]).toggleClass("add none");
                },
                onCreated: function (doc) {
                    $("footer", this).addClass("remove");
                }
            }, this));

            a$.act(this, this.onPreInit, Manager);
            Manager.init();

            // Scan the ui-persistency values
            for (var fid in uiConfiguration) {
                var vals = uiConfiguration[fid].values,
                    w = Manager.getListener(fid);
                a$.each(vals, function (v) {
                    w.addValue(v)
                });
            }

            // now get the search parameters passed via URL
            Manager.doRequest();
        },

        updateButtons: function (form) {
            var butts = $("button", form);

            if ($("#export_dataset").buttonset("option", "disabled")) {
                butts
                    .button("option", "label", "No target dataset selected...")
                    .button("disable");
            } else if ($(form).find('input[name=export_dataset]').val()) {
                var sourceText = $("#export_dataset :radio:checked + label").text().toLowerCase(),
                    formatText = $(form.export_format).data('name').toUpperCase();

                butts.button("enable").each(function () {
                    var me$ = $(this);
                    me$.button("option", "label", jT.formatString(me$.data('format'), { source: sourceText, format: formatText }));
                });
            }
        },

        initQueries: function () {
            var manager = this.manager;

            this.queries = new(a$(jT.ListWidget))({
                id: 'queries',
                target: $('#predefined-queries')
            });
            
            this.queries.renderItem = function (query) {
                el$ = jT.ui.fillTemplate("query-item", query);
                el$.data("query", query.filters);
                el$.on('click', function (e) {
                    var queryDef = $(this).data('query');

                    // Clear the current search - whatever it is.
                    manager.removeParameters("fq");
                    manager.removeParameters("json.filter");
                    manager.getParameter("q").value = "";

                    queryDef.forEach(function (par) {
                        if (par.faceter)
                            manager.getListener(par.faceter).addValue(par.value);
                        else if (typeof par.parameter === "object")
                            manager.addParameter(par.parameter);
                        else
                            manager.addParameter(par.name, par.value, par.domain);
                    });

                    manager.doRequest();
                    $("#result-tabs").tabs("option", "active", 0);
                });
                return el$;
            };

            this.queries.populate(this.savedQueries);
        },

        initExport: function () {
            // Prepare the export tab
            var self = this;

            this.prepareFormats();
            this.prepareTypes();

            $("#export_dataset").buttonset();
            $("#export_dataset input").on("change", function (e) {
                self.updateButtons(this.form);
            });
            $("#export_tab button").button({
                disabled: true
            });

            var goButt$ = $("#export_go");
            goButt$.on('click', function (e) { 
                var oldText = goButt$.button("option", "label"),
                    goTime = new Date().getTime();

                goButt$.button("option", "label", "Downloading...");

                self.makeExport($("#export_tab form")[0], function (error) {
                    if (error != null) {
                        console.error(error);

                        if (typeof error === 'object')
                            error = error.message || error.status || "Wrong request!";
                    }

                    // Ensure at least 900ms of showtime for the "Downloading..." label
                    setTimeout(function () {
                        goButt$.button("option", "label", (error || oldText).substr(0, 40));
                    }, Math.max(0, goTime + 900 - new Date().getTime()));
                }); 
            });

            $("#result-tabs").tabs({
                activate: function (e, ui) {
                    if (ui.newPanel[0].id == 'export_tab') {
                        var qPar = self.manager.getParameter("q").value,
                            hasFilter = (qPar && qPar.length) > 0 || self.manager.getParameter("json.filter").length > 0,
                            hasBasket = !!self.basket.length,
                            hasDataset = hasFilter || hasBasket;

                        $("#export_dataset").buttonset(hasDataset ? "enable" : "disable");
                        $("#export_select").toggleClass('disabled', !hasDataset);
                        $('div.warning-message')[hasDataset ? "hide" : "show"]();
                        $('.data_formats').toggleClass('disabled', !hasDataset);

                        $("input#selected_data")
                            .prop("checked", hasBasket)
                            .prop("disabled", !hasBasket)
                            .toggleClass("disabled", !hasBasket);

                        $("input#filtered_data")
                            .prop("checked", hasFilter && !hasBasket)
                            .prop("disabled", !hasFilter)
                            .toggleClass("disabled", !hasFilter);

                        $('.data_formats .jtox-ds-download a').first().trigger("click");
                        $('.data_formats .jtox-ds-download a').first().trigger("click");

                        $("#export_dataset").buttonset("refresh");
                        self.updateButtons(self.form);
                    }
                }
            });
        },

        makeExport: function (form, doneFn) {
            var self = this,
                exFormat = this.exportFormats[$('.data_formats .selected').data('index')],
                exType = this.exportTypes[parseInt(form.export_select.value)],
                exDef = _.defaultsDeep($.extend(true, {}, exType.definition), this.exportDefaultDef),
                server = exType.server || exFormat.server,
                selectedIds = this.getSelectedIds(form),
                formAmbitUrl = function () { 
                    form.search.value = selectedIds.join(" ");
                    form.action = self['ambitUrl'] + 'query/substance/study/uuid?media=' + encodeURIComponent(form.export_format.value);
                };

            exFormat = exFormat.name;

            Array.prototype.unshift.apply(exDef.extraParams, this.exportSolrDefaults);
            var Exporter = new (a$(jT.Exporting, Solr.Configuring, Solr.QueryingJson))({
                exportDefinition: exDef,
                useJson: false,
                expectJson: true
            });

            Exporter.init(this.manager);

            // Now we have all the filtering parameters in the `params`.
            if (server == 'ambitUrl') {
                // If we already have the selected Ids - we don't even need to bother calling Solr.
                if (!!selectedIds)
                    formAmbitUrl();
                else $.ajax(Exporter.prepareExport([{ name: "wt", value: "json" }, { name: "fl", value: "s_uuid_hs" }], selectedIds).getAjax(self.serverUrl, {
                    async: false,
                    dataType: "json",
                    success: function (data) {
                        var ids = [];
                        $.each(data.response.docs, function (index, value) {
                            ids.push(value.s_uuid_hs);
                        });

                        formAmbitUrl();
                        doneFn();
                    },
                    error: function (jhr, status, errText) { doneFn(errText); }
                }));
            } else { // We're strictly in Solr mode - prepare the filters and add the selecteds (if they exists)
                var ajaxOpts = Exporter.prepareExport(
                        exFormat == "tsv"
                            ? [{ name: "wt", value: "json" }, { name: "json2tsv", value: true }]
                            : [{ name: 'wt', value: exFormat === 'xlsx' ? 'json' : exFormat }],
                        selectedIds
                        ).getAjax(this.solrUrl),
                    downloadFn = function (blob) {
                        if (!(blob instanceof Blob))
                            blob = new Blob([blob]);

                        jT.activateDownload(
                            null, 
                            blob, 
                            "Report-" + (new Date().toISOString().replace(":", "_")) + "." + exFormat, 
                            true);
                        doneFn();
                    };

                // Not a template thing.
                if (!exDef.template || exFormat !== 'xlsx') {
                    ajaxOpts.dataType = 'application/json';
                    ajaxOpts.settings = { responseType: "arraybuffer" }
                    jT.promiseXHR(ajaxOpts).then(downloadFn).catch(doneFn);
                }
                else { // We're in templating mode!
                    Promise.all([
                        $.ajax(ajaxOpts),
                        jT.promiseXHR($.extend({
                            url: exDef.template,
                            settings: { responseType: "arraybuffer" }
                        }, this.ajaxSettings))
                    ]).then(function (results) {
                        var queryData = results[0],
                            wbData = results[1];                        

                        if (typeof exDef.onData === 'function')
                            exDef.onData(queryData);

                        XlsxPopulate.fromDataAsync(wbData).then(function (workbook) {
                            try {
                                new XlsxDataFill(
                                    new XlsxDataFill.XlsxPopulateAccess(workbook, XlsxPopulate), 
                                    exDef
                                ).fillData(queryData);

                                workbook.outputAsync().then(downloadFn);
                            } catch (e) {
                                doneFn(e);
                            };

                        }).catch(doneFn);
                    }).catch(doneFn);
                }
            }

            return true;
        },

        getSelectedIds: function (form) {
            var selectedIds = null;

            if (form.export_dataset.value != "filtered") {
                selectedIds = [];

                this.basket.enumerateItems(function (d) {
                    selectedIds.push(d.s_uuid);
                });
            }
            return selectedIds;
        },

        prepareFormats: function () {
            var exportEl = $("#export_tab div.data_formats"),
                self = this;

            for (var i = 0, elen = this.exportFormats.length; i < elen; ++i) {
                var el = jT.ui.fillTemplate("export-format", this.exportFormats[i]);
                el.data("index", i);
                exportEl.append(el);

                $("a", exportEl[0]).on("click", function (e) {
                    var me = $(this),
                        form = me.closest("form")[0];

                    if (!me.hasClass('disabled') && !me.hasClass("selected")) {
                        var cont = me.closest("div.data_formats");

                        form.export_format.value = me.data("mime");

                        //save readable format name
                        $(form.export_format).data('name', me.data("name"));

                        self.updateButtons(form);

                        $("div", cont[0]).removeClass("selected");
                        cont.addClass("selected");
                        me.closest(".jtox-fadable").addClass("selected");
                    }
                    return false;
                });
            }
        },

        prepareTypes: function () {
            var self = this,
                exportEl = $("#export_select"),
                updateFormats = function (formats) {
                    $('.data_formats a').addClass('disabled');

                    formats.split(",").forEach(function (item) {
                        $('.data_formats a[data-name=' + item + ']').removeClass('disabled')
                    });

                    $('.data_formats a:visible').not('.disabled').first().trigger('click');
                };

            for (var i = 0, elen = this.exportTypes.length; i < elen; ++i)
                exportEl.append(jT.ui.fillTemplate("export-type", $.extend({ 
                    index: i,
                    selected: (i == 0) ? 'checked="checked"' : ''
                }, this.exportTypes[i])));
            
            exportEl.on("change", function (e) { 
                updateFormats(self.exportTypes[parseInt(this.value)].formats); 
                return false; 
            });

            updateFormats(this.exportTypes[0].formats);
        }
    };

})(Solr, asSys, jQuery, jToxKit);
/** jToxKit - chem-informatics multi-tool-kit.
  * The universal logging capabilities.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */

(function(a$, $, jT) {
  
  jT.ui.Logging = function (settings) {
    var root$ = $(settings.target);
        
    a$.extend(true, this, a$.common(settings, this));
    
    this.target = settings.target;
    root$.html(jT.ui.templates['logger-main']);
    root$.addClass('jtox-toolkit jtox-log'); // to make sure it is there even when manually initialized

    if (typeof this.lineHeight == "number")
      this.lineHeight = this.lineHeight.toString() + 'px';
    if (typeof this.keepMessages != "number")
      this.keepMessages = parseInt(this.keepMessages);

    // now the actual UI manipulation functions...
    this.listRoot = $('.list-root', this.target)[0],
    this.statusEl = $('.status', this.target)[0];

    if (!!this.rightSide) {
      this.statusEl.style.right = '0px';
      root$.addClass('right-side');
    }
    else
      this.statusEl.style.left = '0px';

    this.setStatus('');

    // this is the queue of events - indexes by the passed service
    this.events = {};

    if (!!this.autoHide) {
      root$.bind('click', function (e) { $(this).toggleClass('hidden'); });
      root$.bind('mouseleave', function (e) { $(this).addClass('hidden'); });
    }

    if (!!this.mountDestination) {
      var dest = typeof this.mountDestination === 'object' ? this.mountDestination : _.get(window, this.mountDestination),
          self = this;
      dest.onPrepare = function (params) { return self.beforeRequest(params); };
      dest.onSuccess = function (response, jqXHR, params) { return self.afterRequest(response, params, jqXHR); };
      dest.onError = function (jqXHR, params) { return self.afterFailure(jqXHR, params); };
    }
  };
  
  jT.ui.Logging.prototype = {
    mountDestination: null, // mount onPrepare, onSuccess and onError handlers as properties of given variable.
    statusDelay: 1500,      // number of milliseconds to keep success / error messages before fading out
    keepMessages: 50,       // how many messages to keep in the queue
    lineHeight: "20px",     // the height of each status line
    rightSide: false,       // put the status icon on the right side
    hasDetails: true,       // whether to have the ability to open each line, to show it's details
    autoHide: true,         // whether to install handlers for showing and hiding of the logger
    
    // line formatting function - function (params, jhr) -> { header: "", details: "" }
    formatEvent: function (params, jhr) {
      var info = {};

      if (params != null) {
        info.header = params.method.toUpperCase() + ": " + params.service;
        info.details = "...";
      }

      if (jhr != null)
        // by returning only the details part, we leave the header as it is.
        info.details = jhr.status + " " + jhr.statusText + '<br/>' + jhr.getAllResponseHeaders();

      return info;
    },

    formatUrl: function (url) {
      return url.protocol + "://" + url.host + url.path;
    },
    
    setIcon: function (line$, status) {
      if (status == "error")
        line$.addClass('ui-state-error');
      else
        line$.removeClass('ui-state-error');

      line$.data('status', status);
      if (status == "error")
        $('.icon', line$).addClass('ui-icon ui-icon-alert').removeClass('loading ui-icon-check');
      else if (status == "success")
        $('.icon', line$).addClass('ui-icon ui-icon-check').removeClass('loading ui-icon-alert');
      else {
        $('.icon', line$).removeClass('ui-icon ui-icon-check ui-icon-alert');
        if (status == "connecting")
          $('.icon', line$).addClass('loading');
      }
    },

    setStatus: function (status) {
      var self = this;
          
      $(".icon", self.statusEl).removeClass("jt-faded");
      self.setIcon ($(self.statusEl), status);
      if (status == "error" || status == "success") {
        setTimeout(function () {
          $('.icon', self.statusEl).addClass('jt-faded');
          var hasConnect = false;
          $('.logline', self.listRoot).each(function () {
            if ($(self).data('status') == "connecting")
              hasConnect = true;
          });
          if (hasConnect)
            self.setStatus("connecting");
        }, self.statusDelay);
      }
    },
    
    addLine: function (data) {
      var self = this,
          el$ = jT.ui.fillTemplate('logger-line', data);

      el$.height('0px');
      this.listRoot.insertBefore(el$[0], this.listRoot.firstElementChild);

      setTimeout(function () { el$.height(self.lineHeight); }, 150);
      if (!!self.hasDetails) {
        $('.icon', el$[0]).on('click', function (e) {
          el$.toggleClass('openned');
          if (el$.hasClass("openned")) {
            var height = 0;
            $('.info-field', el$[0]).each(function () {
              height += this.offsetHeight;
            });
            el$.height(height + 6);
          }
          else
            el$.height(self.lineHeight);

          // to make sure other clickable handler won't take control.
          e.stopPropagation();
        });
      }

      while (this.listRoot.childNodes.length > self.keepMessages)
        this.listRoot.removeChild(this.listRoot.lastElementChild);

      return el$;
    },
    
    beforeRequest: function (params) {
      params.service = this.formatUrl(jT.parseURL(params.url));
      
      var info = this.formatEvent(params),
          line$ = this.addLine(info);
          
      this.setStatus("connecting");
      this.events[params.logId = Date.now()] = line$;
      this.setIcon(line$, 'connecting');
      line$.data('status', "connecting");
    },

    afterResponse: function (status, params, jhr) {
      var line$ = this.events[params.logId];
      
      this.setStatus(status);

      if (!line$) {
        if (!params.service)
          params.service = this.formatUrl(jT.parseURL(params.url));

        line$ = this.addLine(this.formatEvent(params, jhr));
      } else {
        delete this.events[params.logId];
        line$.html(jT.formatString(jT.ui.templates['logger-line'], this.formatEvent(null, jhr)));
      }
      
      this.setIcon(line$, status);
    },
    
    afterRequest: function (response, params, jhr) {
      this.afterResponse('success', params, jhr);
    },
    
    afterFailure: function (jhr, params) {
      this.afterResponse('error', params, jhr);
      console && console.log("Error [" + params.service + "]: " + jhr.statusText);
    }
  };
})(asSys, jQuery, jToxKit);
/* MatrixKit - Read-across UI tool. Migrated.
 *
 * Copyright 2012-2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan Georgiev
**/

(function (_, $, jT) {

	return;

	function MatrixKit(settings) {
		var self = this;

		$(this.rootElement = settings.target).addClass('jtox-toolkit'); // to make sure it is there even when manually initialized
		this.settings = $.extend(true, {}. MatrixKit.defaults, settings);

		// deal with some configuration
		if (typeof this.settings.studyTypeList === 'string')
			this.settings.studyTypeList = window[this.settings.studyTypeList];

		// the (sub)action in the panel
		var loadAction = function () {
			if (!this.checked)
				return;
			document.body.className = this.id;
			var method = $(this).parent().data('action');
			if (!method)
				return;
			jT.fireCallback(self[method], self, this.id, $(this).closest('.ui-tabs-panel')[0], false);
		};

		var loadPanel = function(panel) {
			if (panel) {
				var subs = $('.jq-buttonset.action input:checked', panel);
				if (subs.length > 0)
					subs.each(loadAction);
				else
					jT.fireCallback(self[$(panel).data('action')], self, panel.id, panel, true);
			}
		};

		// initialize the tab structure for several versions of dataTables.
		$(root).tabs({
			"disabled": [1, 2, 3, 4],
			"heightStyle": "fill",
			"select" : function(event, ui) {
				loadPanel(ui.panel);
			},
			"activate" : function(event, ui) {
				if (ui.newPanel)
					loadPanel(ui.newPanel[0]);
			},
			"create" : function(event, ui) {
				if (ui.panel)
					loadPanel(ui.panel[0]);
			}
		});

		$('.jq-buttonset', root).buttonset();
		$('.jq-buttonset.action input', root).on('change', loadAction);

		var updateUsers = function() {
			var el = $(this.parentNode).find('select');
			$(el.parentNode).addClass('loading');
			var property = (el[0].id == 'users-write') ? 'canWrite' : 'canRead';
			var data = 'bundle_number=' + self.bundle.number;
			var users = el.val();
			if (users) {
				for (var i = 0, l = users.length; i < l; i++){
					data += '&' + property + '=' + users[i];
				}
			}
			jT.ambit.call(self, self.settings.baseUrl + '/myaccount/users', { method: 'POST', data: data }, function(result) {
				$(el.parentNode).removeClass('loading');
			});
		}

		$('.jtox-users-select', root).tokenize({
			datas: self.settings.baseUrl + '/myaccount/users',
			searchParam: 'q',
			valueField: 'id',
			textField: 'name'
			//onAddToken: updateUsers,
			//onRemoveToken: updateUsers
		});

		$('.jtox-users-submit', root).on('click', updateUsers);

		self.onIdentifiers(null, $('#jtox-identifiers', self.rootElement)[0]);
		// finally, if provided - load the given bundleUri
		var bUri = self.settings.bundleUri;
		if (!!bUri)
			self.load(bUri);

		return self;
	};

	MatrixKit.prototype.starHighlight = function (root, stars) {
		$('span', root).each(function (idx) {
			if (idx < stars)
				$(this).removeClass('transparent');
			else
				$(this).addClass('transparent');
		});
	};

	MatrixKit.prototype.onIdentifiers = function (id, panel) {
		var self = this;
		if (!panel) return;
		if (!$(panel).hasClass('initialized')) {
			$(panel).addClass('initialized');

			self.createForm = $('form', panel)[0];

			self.createForm.onsubmit = function (e) {
				e.preventDefault();
				e.stopPropagation();

				if (jT.validateForm(self.createForm)) {
					jT.ambit.call(self, self.settings.baseUrl + '/bundle', { method: 'POST', data: $(self.createForm).serializeArray()},
						function (bundleUri, jhr) {
						if (!!bundleUri) {
							self.load(bundleUri);
							var url = jT.parseURL( window.location.href );
							if (url.query != '' )
								url.query += '&bundleUri=' + bundleUri;
							else
								url.query = '?bundleUri=' + bundleUri;
							var href = url.protocol + '://' + url.host + ( (url.port != '') ? ':' + url.port : '' ) + url.path + url.query + ( (url.hash != '') ? '#' + url.hash : '' );
							if ( 'pushState' in window.history )
								window.history.pushState(null, '', href );
							else
								document.location = href;
						}
						else {
							// TODO: report an error
							console.log("Error on creating bundle [" + jhr.status + "]: " + jhr.statusText);
						}
					});
				}
			};

			self.createForm.assFinalize.onclick = function (e) {
				e.preventDefault();
				e.stopPropagation();
				if (!self.bundleUri) return;

				var $this = $(this),
					data = { status: 'published' };

				$this.addClass('loading');
				jT.ambit.call(self, self.bundleUri, { method: 'PUT', data: data } , function (result) {
					$this.removeClass('loading');
					if (!result) // i.e. on error - request the old data
						self.load(self.bundleUri);
					else
						$('.data-field[data-field="status"]').html(formatStatus('published'));
				});
			};

			self.createForm.assNewVersion.onclick = function (e) {
				e.preventDefault();
				e.stopPropagation();
				if (!self.bundleUri) return;

				var $this = $(this),
					data = { status: 'archived' };

				$this.addClass('loading');
				jT.ambit.call(self, self.bundleUri, { method: 'PUT', data: data } , function (result) {
					$this.removeClass('loading');
					if (!result) // i.e. on error - request the old data
						self.load(self.bundleUri);
				});

				jT.ambit.call(self, self.bundleUri + '/version', { method: 'POST' }, function (bundleUri, jhr) {
					if (!!bundleUri)
						self.load(bundleUri);
					else
						// TODO: report an error
						console.log("Error on creating bundle [" + jhr.status + ": " + jhr.statusText);
				});
			};

			self.createForm.assFinalize.style.display = 'none';
			self.createForm.assNewVersion.style.display = 'none';

			var starsEl = $('.data-stars-field', self.createForm)[0];
			starsEl.innerHTML += jT.ui.putStars(self, 0, "Assessment rating");
			$('span.ui-icon-star', starsEl)
				.on('mouseover', function (e) {
					for (var el = this; !!el; el = el.previousElementSibling)
						$(el).removeClass('transparent');
					for (var el = this.nextElementSibling; !!el; el = el.nextElementSibling)
						$(el).addClass('transparent');
				})
				.on('click', function (e) {
					var cnt = 0;
					for (var el = this; !!el; el = el.previousElementSibling, ++cnt);
					self.createForm.stars.value = cnt;
					$(self.createForm.stars).trigger('change');
				})
				.parent().on('mouseout', function (e) {
					self.starHighlight(this, parseInt(self.createForm.stars.value));
				});

			// install change handlers so that we can update the values
			$('input, select, textarea', self.createForm).on('change', function (e) {
				e.preventDefault();
				e.stopPropagation();
				if (!self.bundleUri) return;

				var el = this;
				if (jT.fireCallback(checkForm, el, e)) {
					var data = {};
					data[el.name] = el.value;
					$(el).addClass('loading');
					jT.ambit.call(self, self.bundleUri, { method: 'PUT', data: data } , function (result) {
						$(el).removeClass('loading');
						if (!result) { // i.e. on error - request the old data
							self.load(self.bundleUri);
						}
					});
				}
			});

			var link = $('#source-link')[0], $source = $('#source');
			link.href = $source[0].value;
			$source.on('change', function() { link.href = this.value; });
		}
	};

	// called when a sub-action in bundle details tab is called
	MatrixKit.prototype.onMatrix = function (panId, panel) {
		var self = this;
		if (!$(panel).hasClass('initialized')) {

			var saveButton = $('.save-button', panel)[0];
			saveButton.disabled = true;
			var dressButton = function() {
				if (self.edit.study.length < 1) {
					saveButton.disabled = true;
					$(saveButton).removeClass('jt-alert').addClass('jt-disabled');
					saveButton.innerHTML = "Saved";
				}
				else {
					saveButton.disabled = false;
					$(saveButton).addClass('jt-alert').removeClass('jt-disabled');
					saveButton.innerHTML = "Save";
				}
			};

			$(saveButton).on('click', function() {
				if (self.edit.study.length > 0) {
					var toAdd = JSON.stringify({ study: self.edit.study });

					// make two nested calls - for adding and for deleting
					$(saveButton).addClass('loading');
					jT.ambit.call(self, self.bundleUri + '/matrix', { method: 'PUT', headers: { 'Content-Type': "application/json" }, data: toAdd }, function (result, jhr) {
						if (!!result) {
							jT.ambit.call(self, self.bundleUri + '/matrix/deleted', { method: 'PUT', headers: { 'Content-Type': "application/json" }, data: toAdd },function (result, jhr) {
								$(saveButton).removeClass('loading');
								if (!!result) {
									self.edit.study = [];
									self.matrixKit.query(self.bundleUri + '/matrix');
									dressButton();
								}
							});
						}
						else {
							$(saveButton).removeClass('loading');
						}
					});
				}
			});

			var onEditClick = function (data) {
				var boxOptions = {
					overlay: true,
					closeOnEsc: true,
					closeOnClick: "overlay",
					addClass: "popup-box jtox-toolkit ui-front",
					animation: "zoomIn",
					target: $(this),
					maxWidth: 600,
					zIndex: 90,
					onCloseComplete: function () { this.destroy(); }
				};

				var isDelete = $(this).hasClass('delete-popup');
				var jel = (isDelete ? $('a', this.parentNode) : $(this));

				var featureId = jel.data('feature');
				var valueIdx = jel.data('index');
				var feature = self.matrixKit.dataset.feature[featureId];
				if (!jel.hasClass('edit-popup')) {

					$('.dynamic-condition', infoDiv).remove();
					var dynHead = $('tr.conditions', infoDiv)[0];
					var postCell = $('td.postconditions', infoDiv)[0];

					for (var i = 0, cl = feature.annotation.length; i < cl; ++i) {
						var ano = feature.annotation[i];
						// first add the column
						var el = document.createElement('th');
						el.className = 'dynamic-condition';
						el.innerHTML = ano.p;
						dynHead.appendChild(el);
						// now add the value
						el = document.createElement('td');
						el.className = 'dynamic-condition';
						el.innerHTML = ano.o;
						postCell.parentNode.insertBefore(el, postCell);
					}

					// make sure there is at least one cell.
					if (cl < 1) {
						el = document.createElement('td');
						el.className = 'dynamic-condition';
						el.innerHTML = '-';
						postCell.parentNode.insertBefore(el, postCell);
					}

					$('th.conditions', infoDiv).attr('colspan', cl);

					var val = data.values[featureId];
					if (!feature.isMultiValue || !$.isArray(val))
						val = [val];
					
					jT.ui.updateTree(infoDiv, {
						endpoint: feature.title,
						guidance: feature.creator,
						value: jT.ui.renderObjValue(val[valueIdx], feature.units, 'display'),
					});

					if (isDelete) {
						$('.delete-box', infoDiv).show();
						boxOptions.onOpen = function () {
							var box = this;
							var content = this.content[0];
							if(val[valueIdx].deleted) {
								// If the value is already deleted, show remarks
								$('button.jt-alert', content).hide();
								$('textarea', content).val(val[valueIdx].remarks);
							}
							else
								$('button.jt-alert', content).on('click', function (){ deleteFeature(data, featureId, valueIdx, $('textarea', content).val(), jel[0]); box.close(); });
						};
					}
					else
						$('.delete-box', infoDiv).hide();

					boxOptions.content = infoDiv.innerHTML;
					new jBox('Tooltip', boxOptions).open();
				} else { // edit mode
					var parse = jT.ambit.parseFeatureId(featureId);
					// map between UI fields and JSON properties
					var valueMap = {
						endpoint: 'effects[0].endpoint',
						value: 'effects[0].result',
						interpretation_result: 'interpretation.result',

						type: 'reliability.r_studyResultType',
						reference: 'citation.title',
						justification: 'protocol.guideline[0]',
						remarks: 'interpretation.criteria'
					};

					// the JSON that is about to be sent on Apply
					var featureJson = {
						owner: {
							substance: {
								uuid: data.compound.i5uuid
							}
						},
						protocol: {
							topcategory: parse.topcategory,
							category: {
								code: parse.category
							},
							endpoint: feature.title,
							guideline: ['']
						},
						citation: {
							year: (new Date()).getFullYear().toString()
						},
						parameters: { },
						interpretation: { },
						reliability: { },
						effects: [{
							result: { },
							conditions: { }
						}]
					};

					// we're taking the original jToxEndpoint editor here and glue our part after it.
					boxOptions.content = jT.getTemplate('#jtox-endeditor').innerHTML + editDiv.innerHTML;
					boxOptions.title = feature.title || parse.category;
					boxOptions.closeButton = "box";
					boxOptions.confirmButton = "Add";
					boxOptions.cancelButton = "Cancel";
					var endSetValue = function (e, field, value) {
						var f = valueMap[field];
						if (!f)
							featureJson.effects[0].conditions[field] = value;
						else
							_.set(featureJson, f, value);
					};

					boxOptions.onOpen = function () {
						var box = this;
						var content = this.content[0];
						jToxEndpoint.linkEditors(self.matrixKit, content, { category: parse.category, top: parse.topcategory, onchange: endSetValue, conditions: true });
						$('input[type=button]', content).on('click', function (){ addFeature(data, featureId, featureJson, jel[0]); box.close();});
					};
					new jBox('Modal', boxOptions).open();
				}
			};

			var addFeature = function(data, fId, value, element) {
				self.edit.study.push(value);
				dressButton();

				// now fix the UI a bit, so we can see the
				fId += '/' + self.edit.study.length;

				var catId = jT.ambit.parseFeatureId(fId).category,
						config = jT.$.extend(true, {}, self.matrixKit.settings.configuration.columns["_"], self.matrixKit.settings.configuration.columns[catId]),
						f = null;

				self.matrixKit.dataset.feature[fId] = f = {};
				f.sameAs = "http://www.opentox.org/echaEndpoints.owl#" + catId;
				f.title = value.effects[0].endpoint || (value.citation.title || "");
				f.creator = value.protocol.guideline[0];
				f.isMultiValue = true;
				f.annotation = [];
				for (var cId in value.effects[0].conditions) {
					f.annotation.push({
						'p': cId,
						'o': jT.ui.renderObjValue(value.effects[0].conditions[cId])
					});
				}

				data.values[fId] = [value.effects[0].result];

				var preVal = (_.get(config, 'effects.endpoint.bVisible') !== false) ? f.title : null;
				preVal = [f.creator, preVal].filter(function(value){return value!==null}).join(' ');

				var html = 	'<span class="ui-icon ui-icon-circle-minus delete-popup" data-index="' + (self.edit.study.length - 1) + '"></span>&nbsp;' + 
							'<a class="info-popup unsaved-study" data-index="0" data-feature="' + fId + '" href="#">' + jT.ui.renderObjValue(value.effects[0].result, null, 'display', preVal) + '</a>',
					span = document.createElement('div');

				span.innerHTML = html;
				element.parentNode.insertBefore(span, element);
				self.matrixKit.equalizeTables();

				$('.info-popup', span).on('click', function (e) { onEditClick.call(this, data); });
				$('.delete-popup', span).on('click', function (e) {
					var idx = $(this).data('index');
					self.edit.study.splice(idx, 1);
					$(this.parentNode).remove();
					dressButton();
				});
			};

			var deleteFeature = function (data, featureId, valueIdx, reason, element) {
				self.edit.study.push({
					owner: { substance: { uuid: data.compound.i5uuid } },
					effects_to_delete: [{
						result: {
							idresult: data.values[featureId][valueIdx].idresult,
							deleted: true,
							remarks: reason
						},
					}]
				});
				dressButton();

				// Now deal with the UI
				$(element).addClass('unsaved-study');
				$('span', element.parentNode)
					.removeClass('ui-icon-circle-minus')
					.addClass('ui-icon-circle-plus')
					.data('index', self.edit.study.length - 1)
					.on('click.undodelete', function () {
						var idx = $(this).data('index');
						$(this).addClass('ui-icon-circle-minus').removeClass('ui-icon-circle-plus').off('click.undodelete').data('index', null);
						$('a', this.parentNode).removeClass('unsaved-study');
						self.edit.study.splice(idx, 1);
						dressButton();
					});
			};

			var infoDiv = $('#info-box')[0];
			var editDiv = $('#edit-box')[0];

			// now, fill the select with proper values...
			var df = document.createDocumentFragment();
			for (var id in self.settings.studyTypeList) {
				var opt = document.createElement('option');
				opt.value = id;
				opt.innerHTML = self.settings.studyTypeList[id].title;
				df.appendChild(opt);
			}

			$('select.type-list', editDiv)[0].appendChild(df);

			self.matrixKit = self.prepareMatrixKit($('.jtox-toolkit', panel)[0]);

			self.matrixKit.settings.onRow = function (row, data, index) {
				// equalize multi-rows, if there are any
				jT.$('td.jtox-multi .jtox-diagram span.ui-icon', row).on('click', function () {
					setTimeout(function () {
						jT.tables.equalizeHeights.apply(window, jT.$('td.jtox-multi table tbody', row).toArray());
					}, 50);
				});

				$('.info-popup, .edit-popup, .delete-popup', row).on('click', function (e) {
					if (!$(this).hasClass('delete-popup') || $(this).data('index') == null)
						onEditClick.call(this, data);
				});

				var self = this;
				$('button.jtox-up', row).on('click', function(){
					var i = $(self.fixTable).find('> tbody > tr').index(row);
					var varRow = $(self.varTable).find('> tbody > tr')[i];
					$(row).insertBefore( $(row.previousElementSibling) );
					$(varRow).insertBefore( $(varRow.previousElementSibling) );
				});
				$('button.jtox-down', row).on('click', function(){
					var i = $(self.fixTable).find('> tbody > tr').index(row);
					var varRow = $(self.varTable).find('> tbody > tr')[i];
					$(row).insertAfter( $(row.nextElementSibling) );
					$(varRow).insertAfter( $(varRow.nextElementSibling) );
				});
			};

			$('.create-button', panel).on('click', function () {
				var el = this;
				$(el).addClass('loading');
				jT.ambit.call(self, self.bundleUri + '/matrix/working', { method: 'POST', data: { deletematrix:  false } }, function (result, jhr) {
					$(el).removeClass('loading');
					if (!!result) {
						$('.jtox-toolkit', panel).show();
						$('.save-button', panel).show();
						$('.create-button', panel).hide();
						$('#xfinal').button('enable');
						self.bundleSummary.matrix++;
						self.edit.matrixEditable = true;
						self.matrixKit.query(self.bundleUri + '/matrix/working');
					}
				});
			});

			$(panel).addClass('initialized');
		}

		// finally decide what query to make, depending on the
		$('.save-button', panel).hide();
		$('.create-button', panel).hide();
		var queryUri = null;
		if (panId == 'xinitial') {
			$('.jtox-toolkit', panel).show();
			self.edit.matrixEditable = false;
			queryUri = self.bundleUri + '/dataset?mergeDatasets=true';
		}
		else {
			var queryPath = (panId == 'xfinal') ? '/matrix/final' : '/matrix/working',
					editable = (panId != 'xfinal');
					
			if (self.bundleSummary.matrix > 0) {
				$('.jtox-toolkit', panel).show();
				queryUri = self.bundleUri + queryPath;
				self.edit.matrixEditable = editable;
				if (editable)
					$('.save-button', panel).show();
				else
					$('.save-button', panel).hide();
			}
			else {
				$('.jtox-toolkit', panel).hide();
				$('.create-button', panel).show();
			}
		}

		if (!!queryUri)
			self.matrixKit.query(queryUri);
	};

	// called when a sub-action in endpoint selection tab is called
	MatrixKit.prototype.onEndpoint = function (id, panel) {
		var self = this;
		var sub = $(".tab-" + id.substr(3), panel)[0];
		sub.parentNode.style.left = (-sub.offsetLeft) + 'px';
		var bUri = encodeURIComponent(self.bundleUri);

		if (id == "endsubstance") {

			if (!self.substancesQueryKit) {
				self.substancesQueryKit = self.prepareSubstanceKit($('#jtox-substance-query')[0]);

				/* Setup expand/collaps all buttons */
				$('#structures-expand-all').on('click', function(){
					$('#jtox-substance-query .jtox-details-open.ui-icon-folder-collapsed').each(function(){
						this.click();
					});
				});
				$('#structures-collapse-all').on('click', function(){
					$('#jtox-substance-query .jtox-details-open.ui-icon-folder-open').each(function(){
						this.click();
					});
				});

			}

			self.substancesQueryKit.kit().queryDataset(self.bundleUri + '/compound');
		}
		else { // i.e. endpoints
			var checkAll = $('input', sub)[0];
			if (sub.childElementCount == 1) {
				var root = document.createElement('div');
				sub.appendChild(root);
				self.endpointKit = new jToxEndpoint(root, {
					selectionHandler: "onSelectEndpoint",
					onRow: function (row, data, index) {
						if (!data.bundles)
							return;
						var bundleInfo = data.bundles[self.bundleUri];
						if (!!bundleInfo && bundleInfo.tag == "selected")
							$('input.jtox-handler', row).attr('checked', 'checked');
					}
				});
				$(checkAll).on('change', function (e) {
					var qUri = self.settings.baseUrl + "/query/study?mergeDatasets=true&bundleUri=" + bUri;
					if (!this.checked)
						qUri += "&selected=substances&filterbybundle=" + bUri;
					self.endpointKit.loadEndpoints(qUri);
				});
			}
			$(checkAll).trigger('change'); // i.e. initiating a proper reload
		}
	};

	// called when a sub-action in structures selection tab is called
	MatrixKit.prototype.onStructures = function (id, panel) {
		var self = this;
		if (!self.queryKit) {
			self.queryKit = jT.kit($('#jtox-query')[0]);
			self.queryKit.setWidget("bundle", self.rootElement);
			self.queryKit.kit().settings.fixedWidth = '200px';
			// provid onRow function so the buttons can be se properly...
			self.queryKit.kit().settings.onRow = function (row, data, index) {
				if (!data.bundles)
					return;

				var bundleInfo = data.bundles[self.bundleUri] || {};
				// we need to setup remarks field regardless of bundleInfo presence
				var noteEl = $('textarea.remark', row).on('change', function (e) {
					var data = jT.ui.rowData(this),
							el = this,
							bInfo = data.bundles[self.bundleUri] || {};
					$(el).addClass('loading');
					jT.ambit.call(self, self.bundleUri + '/compound', {
						'method': 'PUT',
						'data': {
							compound_uri: data.compound.URI,
							command: 'add',
							tag: bInfo.tag,
							remarks: $(el).val()
						}
					}, function (result) {
						$(el).removeClass('loading');
					});
				});

				if (!!bundleInfo.tag) {
					$('button.jt-toggle.' + bundleInfo.tag.toLowerCase(), row).addClass('active');
					noteEl.val(bundleInfo.remarks);
				}
				else
					noteEl.prop('disabled', true).val(' ');
			};
		}

		if (id == 'structlist')
			self.queryKit.kit().queryDataset(self.bundleUri + '/compound');
		else
			self.queryKit.query();
	};

	MatrixKit.prototype.onReport = function(id, panel){
		var self = this;

		if (!$(panel).hasClass('initialized')) {

			jT.ui.updateTree(panel, self.bundle);

			$('#generate-doc').on('click', function(){
				var loadFile = function(url, callback){
					JSZipUtils.getBinaryContent(url, callback);
				}

				function get(url) {
					// Return a new promise.
					return new Promise(function(resolve, reject) {
						// Do the usual XHR stuff
						var req = new XMLHttpRequest();
						req.open('GET', url);
						req.responseType = 'arraybuffer';

						req.onload = function() {
							// This is called even on 404 etc
							// so check the status
							if (req.status == 200) {
								// Resolve the promise with the response text
								resolve(req.response);
							}
							else {
								// Otherwise reject with the status text
								// which will hopefully be a meaningful error
								reject(Error(req.statusText));
							}
						};

						// Handle network errors
						req.onerror = function() {
							reject(Error("Network Error"));
						};

						// Make the request
						req.send();
					});
				}

				function getData() {

					return new Promise(function(resolve, reject){

						var data = $.extend(true, {}, self.bundle);
						data.created = formatDate(self.bundle.created);
						data.updated = formatDate(self.bundle.updated);
						data.structures = [];

						var imagePromises = [];

						var structuresFixRows = $('#jtox-report-query .jtox-ds-fixed tbody tr');
						var structuresVarRows = $('#jtox-report-query .jtox-ds-variable tbody tr');
						structuresFixRows.each(function(index){
							var structure = {"index": index + 1}, fr = $(this), vr = $(structuresVarRows[index]);
							structure.tag = fr.find('td:first-child button.active').text();

							var image = fr.find('img.jtox-smalldiagram')[0];

							var imagePromise = get(image.src).then(function(data){
									structure.image = {
										"data": data.slice(0),
										"size": [image.width, image.height]
									}
								});

							imagePromises.push(imagePromise);

							var cells = vr.find('td:not(.jtox-hidden)');
							structure.casrn = $(cells[0]).text();
							structure.ecnum = $(cells[1]).text();
							structure.names = $(cells[2]).text();
							structure.rationale = $(cells[3]).find('textarea').val();
							structure.substances = [];
							data.structures.push(structure);
						});

						var substanceContainers = $('#jtox-report-substance-query .jtox-substance');
						substanceContainers.each(function(index){
							var structure = data.structures[index],
									substanceRows = $(this).find('tbody tr');
							substanceRows.each(function(i){
								var cells = $(this).find('td'),
										substance = {};
								substance.i = i + 1;
								substance.name = $(cells[1]).text();
								substance.uuid = $(cells[2]).text();
								substance.type = $(cells[3]).text();
								substance.pubname = $(cells[4]).text();
								substance.refuuid = $(cells[5]).text();
								substance.owner = $(cells[6]).text();
								substance.info = $(cells[7]).text();
								substance.contained = $(cells[8]).text();
								structure.substances.push(substance);
							});
						});

						data.matrix = [];
						var matrixRows = $('#jtox-report-matrix .jtox-ds-fixed .dataTable > tbody > tr');
						matrixRows.each(function(){
							var rowData = {};
							var cells = $(this).find('> td:not(.jtox-hidden)');
							rowData.cas = $(cells[1]).text();
							rowData.substancename = $(cells[2]).text();
							rowData.i5uuid = $(cells[3]).text();
							rowData.datasource = $(cells[4]).text();
							rowData.tag = $(cells[5]).text();
							rowData.constituentname = $(cells[7]).text();
							rowData.content = $(cells[8]).text();
							rowData.containedas = $(cells[9]).text();
							data.matrix.push(rowData);
						});

						var structuresCount = data.matrix.length;
						var groups = Math.ceil(structuresCount/3);

						data.dataMatrix = [];
						var structureRows = $('#jtox-report-final thead tr');
						var dataRows = $('#jtox-report-final tbody tr');
						var tagCells = $(structureRows[0]).find('th');
						var nameCells = $(structureRows[1]).find('th');
						var casCells = $(structureRows[2]).find('th');
						for (var i = 0; i < groups; i++) {
							var dataGroup = {
								tag1: '',
								tag2: '',
								tag3: '',
								name1: '',
								name2: '',
								name3: '',
								cas1: '',
								cas2: '',
								cas3: '',
								data: []
							};
							for (var c = 1, cl = Math.min(3, tagCells.length - 3*i); c <= cl; c++) {
								dataGroup['tag' + c] = $(tagCells[3*i + c]).text();
							}
							for (var c = 1, cl = Math.min(3, nameCells.length - 3*i); c <= cl; c++) {
								dataGroup['name' + c] = $(nameCells[3*i + c]).text();
							}
							for (var c = 1, cl = Math.min(3, casCells.length - 3*i); c <= cl; c++) {
								dataGroup['cas' + c] = $(casCells[3*i + c]).text();
							}
							dataRows.each(function(){
								var cells = $(this).find('th, td');
								var row = { title: '', value1: '', value2: '', value3: ''};
								var prefix = '';
								row.title = $(cells[0]).text();
								for (var c = 1, cl = Math.min(3, nameCells.length - 3*i); c <= cl; c++) {
									var parts = [];
									if (cells[3*i + c] !== undefined) {
										$(cells[3*i + c].childNodes).each(function(){
											if ( $('.ui-icon-calculator', this).length > 0 ) {
												prefix = '<w:r><w:rPr><w:color w:val="FF0000" /></w:rPr><w:t xml:space="preserve">';
											}
											else {
												prefix = '<w:r><w:rPr><w:color w:val="0000FF" /></w:rPr><w:t xml:space="preserve">';
											}
											parts.push( prefix + _.escape($(this).text()) + '</w:t></w:r>' );
										});
									}
									row['value' + c] = '<w:p><w:pPr><w:pStyle w:val="Style16"/><w:rPr></w:rPr></w:pPr>' + parts.join('<w:r><w:br /></w:r>') + '</w:p>';
								}
								dataGroup.data.push(row);
							});
							data.dataMatrix.push(dataGroup);
						}

						data.adstructures = [];
						var adstructureEls = $('#jtox-report-gap-filling section');
						adstructureEls.each(function(){

							var structure = {name: $('h3', this).text(), features: []}

							$(this).children('div').each(function(){
								var feature = {name: $('h4', this).html(), data: []};
								$('div.popup-box', this).each(function(){
									var entry = {
										endpoint: $('td.the-endpoint', this).text(),
										value: $('td.the-value', this).text(),
										guidance: $('td.postconditions', this).text(),
										rationaleTitle: $('h5', this).text(),
										rationale: $('p.justification', this).text(),
										conditions: []
									};
									var dch = $('th.dynamic-condition', this);
									var dcd = $('td.dynamic-condition', this);
									dch.each(function(i){
										entry.conditions.push({
											condition: this.innerHTML,
											value: dcd[i].innerHTML
										});
									});
									feature.data.push(entry);
								});
								structure.features.push(feature);
							});

							data.adstructures.push(structure);

						});

						data.ddstructures = [];
						var ddstructureEls = $('#jtox-report-deleting-data section');
						ddstructureEls.each(function(){

							var structure = {name: $('h3', this).text(), features: []}

							$(this).children('div').each(function(){
								var feature = {name: $('h4', this).html(), data: []};
								$('div.popup-box', this).each(function(){
									var entry = {
										endpoint: $('td.the-endpoint', this).text(),
										value: $('td.the-value', this).text(),
										guidance: $('td.postconditions', this).text(),
										rationale: $('p.justification', this).text(),
										conditions: []
									};
									var dch = $('th.dynamic-condition', this);
									var dcd = $('td.dynamic-condition', this);
									dch.each(function(i){
										entry.conditions.push({
											condition: this.innerHTML,
											value: dcd[i].innerHTML
										});
									});
									feature.data.push(entry);
								});
								structure.features.push(feature);
							});

							data.ddstructures.push(structure);

						});


						// We use Promose.all to wait for the images to load
						// and then resolve with data
						return Promise.all(imagePromises).then(function(){
							resolve(data);
						}, reject);

					});

				} // End getData function

				getData().then(function(data){

					loadFile("../report/assessment-report.docx", function(err, content){
						if (err) { throw err };

						var doc = new Docxgen();

						var imageModule = new ImageModule({centered:false});
						imageModule.getSizeFromData=function(imgData) {
							return [imgData.size[0] / 2, imgData.size[1] / 2];
						}
						imageModule.getImageFromData=function(imgData) {
							return imgData.data.slice(0);
						}
						doc.attachModule(imageModule);

						doc.load(content);

						doc.setData( data ); //set the templateVariables
						doc.render(); //apply them (replace all occurences of {first_name} by Hipp, ...)
						var output = doc.getZip().generate({type:"blob", compression: 'DEFLATE'}); //Output the document using Data-URI
						saveAs(output, "report.docx");
					});

				}, function(error){
					console.log('Error', error);
				});

			});

			$(panel).addClass('initialized');

		}

		if (!self.reportQueryKit) {
			self.reportQueryKit = jT.kit($('#jtox-report-query')[0]);
			self.reportQueryKit.setWidget("bundle", self.rootElement);
			self.reportQueryKit.kit().settings.fixedWidth = '200px';
			// provid onRow function so the buttons can be se properly...
			self.reportQueryKit.kit().settings.onRow = function (row, data, index) {
				if (!data.bundles)
					return;

				var bundleInfo = data.bundles[self.bundleUri] || {};
				if (!!bundleInfo.tag) {
					$('button.jt-toggle.' + bundleInfo.tag.toLowerCase(), row).addClass('active');
				}
				if (!!bundleInfo.remarks) {
					$('textarea.remark', row).val(bundleInfo.remarks).prop('readonly', true);
				}
			};

		}
		self.reportQueryKit.kit().queryDataset(self.bundleUri + '/compound');

		if (!self.reportSubstancesQueryKit) {

			self.reportSubstancesQueryKit = self.prepareSubstanceKit($('#jtox-report-substance-query')[0]);

			self.reportSubstancesQueryKit.kit().settings.onRow = function (row, data, index) {
				if (!data.bundles){
					return;
				}
				var bundleInfo = data.bundles[self.bundleUri] || {};
				$('textarea.remark', row).val(bundleInfo.remarks).prop('readonly', true);
				if (!!bundleInfo.tag) {
					$('button.jt-toggle.' + bundleInfo.tag.toLowerCase(), row).addClass('active');
				}
			};

		}

		self.reportSubstancesQueryKit.kit().queryDataset(self.bundleUri + '/compound');


		if (!self.reportMatrixKit) {

			self.reportMatrixKit = self.prepareMatrixKit($('#jtox-report-matrix .jtox-toolkit')[0]);

			self.reportMatrixKit.settings.showTabs = false;
			self.reportMatrixKit.settings.showControls = false;
			self.reportMatrixKit.settings.fixedWidth = "100%";

			self.reportMatrixKit.settings.onComplete = function () {
				var self = this,
						table = $('<table class="dataTable"><thead></thead><tbody></tbody></table>'),
						head = table.find('thead'),
						body = table.find('tbody');

				var ntr = $('<tr><th>Substance name</th></tr>');
				var ttr = $('<tr><th>Tag</th></tr>');
				var ctr = $('<tr><th>CAS No.</th></tr>');
				$(self.fixTable).find('> tbody > tr').each(function(){
					var cth = $('<th></th>').html( $(this).find('td')[2].innerHTML );
					ctr.append(cth);
					var nth = $('<th></th>').html( $(this).find('td')[3].innerHTML );
					ntr.append(nth);
					var tth = $('<th></th>').append( $($(this).find('td')[6]).find('button.active').clone() );
					ttr.append(tth);
				});
				head.append(ttr).append(ntr).append(ctr);

				$(self.varTable).find('thead th').each(function(index){
					if (this.innerHTML == '') return;
					var $this = $(this);
					var tr = $('<tr></tr>').append('<th>' + $this.html() + '</th>');
					$(self.varTable).find('tbody > tr').each(function(){
						tr.append( '<td>' + $(this).find('td:nth-child(' + (index+1) + ')').html() + '</td>' );
					});
					body.append(tr);
				});

				$('#jtox-report-final > div').html('').append(table);

				$(self.varTable).remove();
				self.equalizeTables();

				// Generate appendixes 2 and 3

				var substanceSection = $('#jtox-report-substance'),
					featureSection = $('#jtox-report-feature'),
					infoDiv = $('#info-box'),
					addedData = [],
					deletedData = [];

				for ( var i = 0, sl = self.dataset.dataEntry.length; i < sl; i++ ) {
					var substance = self.dataset.dataEntry[i];
					for ( var theId in substance.values ) {
						if( $.isArray(substance.values[theId]) ){
							var feature = self.dataset.feature[theId];
							for ( var j = 0, vl = substance.values[theId].length; j < vl; j++ ) {
								var value = substance.values[theId][j];
								if (feature.isModelPredictionFeature || value.deleted ) {

									for ( var fId in self.feature ) {
										var f = self.feature[fId];
										if ( f.sameAs == feature.sameAs ) {
											var featureId = f.URI;
										}
									}

									if ( feature.isModelPredictionFeature ) {
										// Append data to Appendix 2
										if( !addedData[i] ) {
											addedData[i] = {};
										}
										if( !addedData[i][featureId] ){
											addedData[i][featureId] = [];
										}
										addedData[i][featureId].push( {
											feature: feature,
											value: value
										} );
									}
									if ( value.deleted ) {
										// Append data to Appendix 3
										if( !deletedData[i] ) {
											deletedData[i] = {};
										}
										if( !deletedData[i][featureId] ){
											deletedData[i][featureId] = [];
										}
										deletedData[i][featureId].push( {
											feature: feature,
											value: value
										} );
									}
								}
							}
						}
					}
				}

				for( var i = 0, al = addedData.length; i < al; i++ ){
					if( !addedData[i] ) continue;
					var newSection = substanceSection.clone().removeAttr('id');
					var substance = self.dataset.dataEntry[i];
					jT.ui.updateTree(newSection[0], {name: (substance.compound.name || substance.compound.tradename), number: substance.number});
					for(fId in addedData[i]){
						var set = addedData[i][fId];

						var newFeature = featureSection.clone().removeAttr('id');
						jT.ui.updateTree(newFeature[0], {title: self.dataset.feature[fId].title});

						for ( var j = 0, sl = set.length; j < sl; j++ ) {

							var newInfo = infoDiv.clone().removeAttr('id');
							var feature = set[j].feature;
							var value = set[j].value;

							$('.dynamic-condition', newInfo).remove();
							var dynHead = $('tr.conditions', newInfo)[0];
							var postCell = $('td.postconditions', newInfo)[0];

							for (var k = 0, cl = feature.annotation.length; k < cl; ++k) {
								var ano = feature.annotation[k];
								// first add the column
								var el = document.createElement('th');
								el.className = 'dynamic-condition';
								el.innerHTML = ano.p;
								dynHead.appendChild(el);
								// now add the value
								el = document.createElement('td');
								el.className = 'dynamic-condition';
								el.innerHTML = ano.o;
								postCell.parentNode.insertBefore(el, postCell);
							}

							// make sure there is at least one cell.
							if (cl < 1) {
								el = document.createElement('td');
								el.className = 'dynamic-condition';
								el.innerHTML = '-';
								postCell.parentNode.insertBefore(el, postCell);
							}

							$('th.conditions', newInfo).attr('colspan', cl);

							jT.ui.updateTree(newInfo, {
								endpoint: feature.title,
								guidance: '',
								value: jT.ui.renderObjValue(value, feature.units, 'display'),
								remarks: feature.creator,
								studyType: feature.source.type
							});

							newFeature.append( newInfo );
						}

						newSection.append( newFeature );
					}

					$('#jtox-report-gap-filling').append( newSection );
				}

				for( var i = 0, al = deletedData.length; i < al; i++ ){
					if( !deletedData[i] ) continue;
					var newSection = substanceSection.clone().removeAttr('id');
					var substance = self.dataset.dataEntry[i];
					jT.ui.updateTree(newSection[0], {name: (substance.compound.name || substance.compound.tradename), number: substance.number});
					for(fId in deletedData[i]){

						var set = deletedData[i][fId];
						var newFeature = featureSection.clone().removeAttr('id');
						jT.ui.updateTree(newFeature[0], {title: self.dataset.feature[fId].title});

						for ( var j = 0, sl = set.length; j < sl; j++ ) {

							var newInfo = infoDiv.clone().removeAttr('id');
							var feature = set[j].feature;
							var value = set[j].value;

							$('.dynamic-condition', newInfo).remove();
							var dynHead = $('tr.conditions', newInfo)[0];
							var postCell = $('td.postconditions', newInfo)[0];

							for (var k = 0, cl = feature.annotation.length; k < cl; ++k) {
								var ano = feature.annotation[k];
								// first add the column
								var el = document.createElement('th');
								el.className = 'dynamic-condition';
								el.innerHTML = ano.p;
								dynHead.appendChild(el);
								// now add the value
								el = document.createElement('td');
								el.className = 'dynamic-condition';
								el.innerHTML = ano.o;
								postCell.parentNode.insertBefore(el, postCell);
							}

							// make sure there is at least one cell.
							if (cl < 1) {
								el = document.createElement('td');
								el.className = 'dynamic-condition';
								el.innerHTML = '-';
								postCell.parentNode.insertBefore(el, postCell);
							}

							$('th.conditions', newInfo).attr('colspan', cl);

							jT.ui.updateTree(newInfo, {
								endpoint: feature.title,
								guidance: feature.creator,
								value: jT.ui.renderObjValue(value, feature.units, 'display'),
								remarks: value.remarks
							});

							newInfo.find('h5').remove();

							newFeature.append( newInfo );
						}

						newSection.append( newFeature );
					}

					$('#jtox-report-deleting-data').append( newSection );
				}
			};

			self.reportMatrixKit.settings.onRow = function (row, data, index) {

				// equalize multi-rows, if there are any
				setTimeout(function () {
					jT.tables.equalizeHeights.apply(window, jT.$('td.jtox-multi table tbody', row).toArray());
				}, 50);
			};
		}

		var queryUri = self.bundleUri + '/matrix/final';
		if (!!queryUri) {
			self.reportMatrixKit.query(queryUri);
		}
	};

	MatrixKit.prototype.prepareSubstanceKit = function(rootEl){
		var self = this;

		var kit = jT.kit(rootEl);

		kit.setWidget("bundle", self.rootElement);
		kit.kit().settings.fixedWidth = '100%';
		kit.kit().settings.bUri = self.bundleUri;

		kit.kit().settings.configuration.baseFeatures['http://www.opentox.org/api/1.1#ChemicalName'].primary = true;
		kit.kit().settings.configuration.baseFeatures['http://www.opentox.org/api/1.1#CASRN'].primary = true;
		kit.kit().settings.configuration.baseFeatures['http://www.opentox.org/api/1.1#EINECS'].primary = true;
		kit.kit().settings.configuration.baseFeatures['http://www.opentox.org/api/1.1#Reasoning'].primary = true;

		// Modify the #IdRow not to show tag buttons and add #Tag column that show the selected tag.
		kit.kit().settings.configuration.baseFeatures['#IdRow'] = { used: true, basic: true, data: "number", column: { "sClass": "center"}, render: function (data, type, full) {
			if (type != 'display')
				return data || 0;
			var html = "&nbsp;-&nbsp;" + data + "&nbsp;-&nbsp;<br/>";
			html += '<span class="jtox-details-open ui-icon ui-icon-folder-collapsed" title="Press to open/close detailed info for this compound"></span>';
			return html;
		} };

		kit.kit().settings.configuration.baseFeatures['#Tag'] = { title: 'Tag', used: false, basic: true, visibility: "main", primary: true, column: { "sClass": "center"}, render: function (data, type, full) {

			if (type != 'display')
				return data || 0;

			var html = "";
			var bInfo = full.bundles[self.bundleUri];
			if (!bInfo) {
				return html;
			}
			if (!!bInfo.tag) {
				var tag = (bInfo.tag == 'cm') ? 'CM' : bInfo.tag.substr(0,1).toUpperCase();
				html += '<button class="jt-toggle active" disabled="true"' + (!bInfo.remarks ? '' : 'title="' + bInfo.remarks + '"') + '>' + tag + '</button><br />';
			}

			return html;
		} };

		kit.kit().settings.configuration.groups.Identifiers.push('#Tag');

		return kit;
	};

	MatrixKit.prototype.prepareMatrixKit = function(rootEl){
		var self = this;

		jTConfig.matrix.groups = function(miniset, kit) {
			var groups = { "Identifiers" : self.settings.matrixIdentifiers.concat(self.settings.matrixMultiRows) },
				groupids = [],
				endpoints = {};

			var fRender = function (feat, theId) {
				return function (data, type, full) {
					if (type != 'display')
						return '-';

					var html = '';
					for (var fId in kit.dataset.feature) {
						var f = kit.dataset.feature[fId];
						if (f.sameAs != feat.sameAs || full.values[fId] == null)
							continue;

						var catId = jT.ambit.parseFeatureId(fId).category,
								config = jT.$.extend(true, {}, kit.settings.configuration.columns["_"], kit.settings.configuration.columns[catId]);

						var theData = full.values[fId];
						var preVal = (_.get(config, 'effects.endpoint.bVisible') !== false) ? "<strong>"+f.title+"</strong>" : null;

						var icon = f.isModelPredictionFeature?"ui-icon-calculator":"ui-icon-tag";
						var studyType = "<span class='ui-icon "+icon+"' title='" + f.source.type + "'></span>";
						//preVal = [preVal, f.source.type].filter(function(value){return value!==null}).join(' : ');

						var postVal = '', postValParts = [], parameters = [], conditions = [];
						for (var i = 0, l = f.annotation.length; i < l; i++){
							var a = f.annotation[i];
							if ( a.type == 'conditions' && _.get(config, 'conditions["' + a.p.toLowerCase() + '"].inMatrix') == true ) {
								var t = _.get(config, 'conditions["' + a.p.toLowerCase() + '"].sTitle') || a.p;
								conditions.push(t + ' = ' + a.o);
							}
							else if (a.type == 'parameters') {
								parameters.push(a.o);
							}
						}
						if(parameters.length > 0){
							postValParts.push('<span>' + parameters.join(', ') + '</span>');
						}
						if(conditions.length > 0){
							postValParts.push('<span>' + conditions.join(', ') + '</span>');
						}
						if(_.get(config, 'protocol.guideline.inMatrix') == true){
							if(f.creator !== undefined && f.creator != null && f.creator != '' && f.creator != 'null' && f.creator != 'no data'){
								postValParts.push('<span class="shortened" title="'+f.creator+'">'+f.creator + '</span>');
							}
						}
						postVal = (postValParts.length > 0) ? '(' + postValParts.join(', ') + ')' : '';

						if (!f.isMultiValue || !$.isArray(theData)){
							theData = [theData];
						}

						// now - ready to produce HTML
						for (var i = 0, vl = theData.length; i < vl; ++i) {
							var d = theData[i];
							if (d.deleted && !self.edit.matrixEditable)
								continue;
							html += '<div>';
							if (self.edit.matrixEditable) {
								if (d.deleted){
									html += '<span class="ui-icon ui-icon-info delete-popup"></span>&nbsp;';
								}
								else {
									html += '<span class="ui-icon ui-icon-circle-minus delete-popup"></span>&nbsp;';
								}
							}
							html += '<a class="info-popup' + ((d.deleted) ? ' deleted' : '') + '" data-index="' + i + '" data-feature="' + fId + '" href="#">' + jT.ui.renderObjValue(d, f.units, 'display', preVal) + '</a>'
									+ studyType
									+ ' ' + postVal;
							html += jT.ui.putInfo(full.compound.URI + '/study?property_uri=' + encodeURIComponent(fId));
							html += '</div>';
						}
					}

					if (self.edit.matrixEditable)
						html += '<span class="ui-icon ui-icon-circle-plus edit-popup" data-feature="' + theId + '"></span>';

					return  html;
				};
			};

			for (var fId in miniset.feature) {
				var feat = miniset.feature[fId];
				if (feat.sameAs == null || feat.sameAs.indexOf("echaEndpoints.owl#") < 0)
					continue;

				var catId = jT.ambit.parseFeatureId(fId).topcategory;
				var grp = groups[catId];
				if (grp == null)
					groups[catId] = grp = [];

				if (endpoints[feat.sameAs] == null) {
					endpoints[feat.sameAs] = true;
					if (!feat.title)
						feat.title = feat.sameAs.substr(feat.sameAs.indexOf('#') + 1);
					feat.render = fRender(feat, fId);
					feat.column = { sClass: "breakable", sWidth: "80px" };
					grp.push(fId);
				}
			}

			/*
			* Sort columns alphabetically, in this case - by the category number.
			*/
			for(var grp in groups) {
				if(grp != 'Identifiers'){
					var group = groups[grp];
					group.sort(function(a,b){
						if (miniset.feature[a].title == miniset.feature[b].title) {
							return 0;
						}
						return (miniset.feature[a].title < miniset.feature[b].title) ? -1 : 1;
					});
				}
			}

			/*
			* Sort groups by the columns titles / category number.
			* Since we are trying to sort an Object keys, which is
			* itself nonsense in JavaScript, this may fail at any time.
			*/
			groupids = Object.keys(groups);

			groupids.sort(function(a, b){
				if (a == 'Identifiers') return -1;
				if (b == 'Identifiers') return 1;
				a = groups[a][0], b = groups[b][0];
				if (miniset.feature[a].title == miniset.feature[b].title)
					return 0;

				return (miniset.feature[a].title < miniset.feature[b].title) ? -1 : 1;
			})

			var newgroups = {};

			groupids.forEach(function(i, v) { newgroups[i] = groups[i]; });

			groups = newgroups;

			return groups;
		};

		var conf = $.extend(true, {}, jTConfig.matrix, config_study);

		conf.baseFeatures['#IdRow'] = { used: true, basic: true, data: "number", column: { "sClass": "center"}, render: function (data, type, full) {
			if (type != 'display')
				return data || 0;
			var bInfo = full.bundles[self.bundleUri];
			var tag = 'target'; // the default
			if (!!bInfo && !!bInfo.tag) {
				tag = bInfo.tag;
			}
			var html = "&nbsp;-&nbsp;" + data + "&nbsp;-&nbsp;<br/>";
			if (self.edit.matrixEditable) {
				html += '<button class="jt-toggle jtox-handler target' + ( (tag == 'target') ? ' active' : '') + '" data-tag="target" data-uri="' + full.compound.URI + '" data-handler="onTagSubstance" title="Select the substance as Target">T</button>' +
						'<button class="jt-toggle jtox-handler source' + ( (tag == 'source') ? ' active' : '') + '" data-tag="source" data-uri="' + full.compound.URI + '" data-handler="onTagSubstance" title="Select the substance as Source">S</button>' +
						'<button class="jt-toggle jtox-handler cm' + ( (tag == 'cm') ? ' active' : '') + '" data-tag="cm" data-uri="' + full.compound.URI + '" data-handler="onTagSubstance" title="Select the substance as Category Member">CM</button>';
			}
			else {
				tag = (tag == 'cm') ? 'CM' : tag.substr(0,1).toUpperCase();
				html += '<button class="jt-toggle active" disabled="true">' + tag + '</button>';
			}
			html += '<div><button type="button" class="ui-button ui-button-icon-only jtox-up"><span class="ui-icon ui-icon-triangle-1-n">up</span></button><br />' +
							'<button type="button" class="ui-button ui-button-icon-only jtox-down"><span class="ui-icon ui-icon-triangle-1-s">down</span></button><br /></div>'
			return html;
		} };

		conf.baseFeatures['#Tag'] = { title: 'Tag', used: false, basic: true, visibility: "main", primary: true, column: { "sClass": "center"}, render: function (data, type, full) {

			if (type != 'display')
				return data || 0;

			var html = "";
			var bInfo = full.component.bundles[self.bundleUri];
			if (!bInfo) {
				return html;
			}
			if (!!bInfo.tag) {
				var tag = (bInfo.tag == 'cm') ? 'CM' : bInfo.tag.substr(0,1).toUpperCase();
				html += '<button class="jt-toggle active" disabled="true"' + (!bInfo.remarks ? '' : 'title="' + bInfo.remarks + '"') + '>' + tag + '</button><br />';
			}
			if (!!bInfo.remarks && bInfo.remarks != '') {
				html += jT.ui.putInfo(null, bInfo.remarks);
			}

			return html;
		} };

		conf.baseFeatures['http://www.opentox.org/api/1.1#CASRN'].primary = true;

		var featuresInitialized = false;

		matrixKit = new jToxCompound(rootEl, {
			rememberChecks: true,
			tabsFolded: true,
			showDiagrams: true,
			showUnits: false,
			hasDetails: false,
			fixedWidth: "650px",
			configuration: conf,
			featureUri: self.bundleUri + '/property',
			onPrepared: function (miniset, kit) {
				if (featuresInitialized)
					return;
				// this is when we have the features combined, so we can make the multi stuff
				var getRender = function (fId, oldData, oldRender) {
					return function (data, type, full) {
						return typeof data != 'object' ? '-' : jT.ui.renderMulti(data, type, full, function (_data, _type, _full){
							var dt = _.get(_data, (fId.indexOf('#Diagram') > 0 ? 'component.' : '') + oldData);
							return (typeof oldRender == 'function' ? oldRender(dt, _type, fId.indexOf('#Diagram') > 0 ? _data.component : _data) : dt);
						});
					};
				};

				// and now - process the multi-row columns
				for (var i = 0, mrl = self.settings.matrixMultiRows.length;i < mrl; ++i) {
					var fId = self.settings.matrixMultiRows[i];
					var mr = miniset.feature[fId];
					mr.render = getRender(fId, mr.data, mr.render);
					mr.data = 'composition';
					var col = mr.column;
					if (col == null)
						mr.column = col = { sClass: "jtox-multi" };
					else if (col.sClass == null)
						col.sClass = "jtox-multi";
					else
						col.sClass += " jtox-multi";
				}

				featuresInitialized = true;
			},

			onLoaded: function (dataset) {
				jToxCompound.processFeatures(dataset.feature, this.feature);

				// we need to process
				for (var i = 0, dl = dataset.dataEntry.length; i < dl; ++i) {
					var data = dataset.dataEntry[i];
					if (data.composition != null) {
						for (var j = 0;j < data.composition.length; ++j) {
							jToxCompound.processEntry(data.composition[j].component, dataset.feature);
						}
					}
				}
			}

		});

		return matrixKit;
	};

	MatrixKit.prototype.load = function(bundleUri) {
		var self = this;
		jT.call(self, bundleUri, function (bundle) {
			if (!!bundle) {
				bundle = bundle.dataset[0];
				self.bundleUri = bundle.URI;
				self.bundle = bundle;

				if (!!self.createForm) {

					jT.ui.updateTree(self.createForm, bundle);

					$('#status-' + bundle.status).prop('checked', true);

					self.starHighlight($('.data-stars-field div', self.createForm)[0], bundle.stars);
					self.createForm.stars.value = bundle.stars;

					// now take care for enabling proper buttons on the Identifiers page
					self.createForm.assFinalize.style.display = '';
					self.createForm.assNewVersion.style.display = '';
					self.createForm.assStart.style.display = 'none';

				}

				$(self.rootElement).tabs('enable', 1);

				// now request and process the bundle summary
				jT.call(self, bundle.URI + "/summary", function (summary) {
					if (!!summary) {
						for (var i = 0, sl = summary.facet.length; i < sl; ++i) {
							var facet = summary.facet[i];
							self.bundleSummary[facet.value] = facet.count;
						}
					}
					self.progressTabs();
				});

				self.loadUsers();

				$('#open-report').prop('href', self.settings.baseUrl + '/ui/assessment_report?bundleUri=' + encodeURIComponent(self.bundleUri));
				$('#export-substance').prop('href', self.bundleUri + '/substance?media=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
				$('#export-initial-matrix').prop('href', self.bundleUri + '/dataset?media=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
				$('#export-working-matrix').prop('href', self.bundleUri + '/matrix?media=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

				jT.fireCallback(self.settings.onLoaded, self);
			}
		});
	};

	MatrixKit.prototype.loadUsers = function () {
		var self = this;
		var bundle = self.bundle;
		// request and process users with write access
		jT.call(self, self.settings.baseUrl + "/myaccount/users?mode=W&bundleUri=" + encodeURIComponent(bundle.URI), function (users) {
			if (!!users) {
				var select = $('#users-write');
				if (select.length == 0) return;
				select.data('tokenize').clear();
				for (var i = 0, l = users.length; i < l; ++i) {
					var u = users[i];
					select.data('tokenize').tokenAdd(u.id, u.name, true);
				}
			}
		});

		// request and process users with read only access
		jT.call(self, self.settings.baseUrl + "/myaccount/users?mode=R&bundleUri=" + encodeURIComponent(bundle.URI), function (users) {
			if (!!users) {
				var select = $('#users-read');
				if (select.length == 0) return;
				select.data('tokenize').clear();
				for (var i = 0, l = users.length; i < l; ++i) {
					var u = users[i];
					select.data('tokenize').tokenAdd(u.id, u.name, true);
				}
			}
		});
	};

	MatrixKit.prototype.progressTabs = function () {
		$(this.rootElement).tabs(this.bundleSummary.compound > 0 ? 'enable' : 'disable', 2);
		$(this.rootElement).tabs(this.bundleSummary.substance > 0  && this.bundleSummary.property > 0 ? 'enable' : 'disable', 3);
		if (this.bundleSummary.matrix > 0) {
			$('#xfinal').button('enable');
			$(this.rootElement).tabs('enable', 4);
		}
		else
			$('#xfinal').button('disable');
	};

	MatrixKit.prototype.selectStructure = function (uri, what, el) {
		var self = this;
		var activate = !$(el).hasClass('active');
		$(el).addClass('loading');
		var noteEl = $('textarea.remark', self.queryKit.kit().getVarRow(el))[0];
		jT.ambit.call(self, self.bundleUri + '/compound', {
			method: 'PUT',
			data: {
				compound_uri: uri,
				command: activate ? 'add': 'delete',
				tag: what,
				remarks: $(noteEl).val()
			}
		}, function (result) {
			$(el).removeClass('loading');
			if (!!result) {
				$(el).toggleClass('active');
				if (activate) {
					self.bundleSummary.compound++;
					$('button', el.parentNode).removeClass('active');
					$(el).addClass('active');
				}
				else
					self.bundleSummary.compound--;

				$(noteEl).prop('disabled', !activate).val(activate ? "" : " ");
				self.progressTabs();
			}
		});
	};

	MatrixKit.prototype.structuresLoaded = function (kit, dataset) {
		if (document.body.className == 'structlist') {
			this.bundleSummary.compound = dataset.dataEntry.length;
			this.progressTabs();
		}
	};

	MatrixKit.prototype.selectSubstance = function (uri, el) {
		var self = this;
		$(el).addClass('loading');
		jT.ambit.call(self, self.bundleUri + '/substance', { method: 'PUT', data: { substance_uri: uri, command: el.checked ? 'add' : 'delete' } }, function (result) {
			$(el).removeClass('loading');
			if (!result)
				el.checked = !el.checked; // i.e. revert
			else {
				if (el.checked)
					self.bundleSummary.substance++;
				else
					self.bundleSummary.substance--;
				self.progressTabs();
				//console.log("Substance [" + uri + "] selected");
			}
		});
	};

	MatrixKit.prototype.tagSubstance = function (uri, el) {
		var self = this;
		var activate = !$(el).hasClass('active');
		if (activate) {
			$(el).addClass('loading');
			jT.ambit.call(self, self.bundleUri + '/substance', { method: 'PUT', data: { substance_uri: uri, command: 'add', tag : $(el).data('tag')} }, function (result) {
				$(el.parentNode).find('button.jt-toggle').removeClass('active');
				$(el).removeClass('loading').addClass('active');
				if (!result)
					el.checked = !el.checked; // i.e. revert
				else {
					//console.log("Substance [" + uri + "] tagged " + $(el).data('tag'));
				}
			});
		}
	};

	MatrixKit.prototype.selectEndpoint = function (topcategory, endpoint, el) {
		var self = this;
		$(el).addClass('loading');
		jT.ambit.call(self, self.bundleUri + '/property', {
			method: 'PUT',
			data: {
				'topcategory': topcategory,
				'endpointcategory': endpoint,
				'command': el.checked ? 'add' : 'delete'
			}
		}, function (result) {
			$(el).removeClass('loading');
			if (!result)
				el.checked = !el.checked; // i.e. revert
			else {
				if (el.checked)
					self.bundleSummary.property++;
				else
					self.bundleSummary.property--;
				self.progressTabs();
				//console.log("Endpoint [" + endpoint + "] selected");
			}
		});
	};

	// Now some handlers - they should be outside, because they are called within windows' context.
	function onSelectStructure(e) {
		MatrixKit.selectStructure($(this).data('data'), $(this).data('tag'), this);
	};

	function onBrowserFilled(dataset) {
		MatrixKit.structuresLoaded(this, dataset);
	};

	function onSelectSubstance(e) {
		MatrixKit.selectSubstance(this.value, this);
	};

	function onTagSubstance(e) {
		MatrixKit.tagSubstance($(this).data('uri'), this);
	};

	function onSelectEndpoint(e) {
		var rowData = jT.ui.rowData(this);
		MatrixKit.selectEndpoint(rowData.subcategory, rowData.endpoint, this);
	};

	function preDetailedRow(index, cell) {
		var self = this;
		var data = this.dataset.dataEntry[index];
		var uri = this.settings.baseUrl + '/substance?type=related&addDummySubstance=true&compound_uri=' + encodeURIComponent(data.compound.URI) + '&filterbybundle=' + encodeURIComponent(this.settings.bUri) + '&bundleUri=' + encodeURIComponent(this.settings.bUri);

		var $row = $(cell.parentNode),
				$idcell = $row.find('td:first-child'),
				$button = $row.find('td:first-child > .jtox-details-open');

		if( !!$(cell).data('details') ) {
			if($(cell).data('details').hasClass('jtox-hidden')){
				$(cell).data('details').removeClass('jtox-hidden');
				$idcell.attr('rowspan', '2');
				$button.removeClass('ui-icon-folder-collapsed').addClass('ui-icon-folder-open');
			}
			else {
				$(cell).data('details').addClass('jtox-hidden');
				$idcell.removeAttr('rowspan');
				$button.addClass('ui-icon-folder-collapsed').removeClass('ui-icon-folder-open');
			}
		}
		else {
			var $cell = $('<td class="paddingless"></td>'),
				$newRow = $('<tr></tr>').append($cell).insertAfter($row).addClass($row[0].className);

			$idcell.attr('rowspan', '2');

			$cell.attr('colspan', $row.find('td:visible').length - 1).removeClass('jtox-hidden');

			var div = document.createElement('div');
			$cell.append(div);

			new jToxSubstance(div, {
				showDiagrams: true,
				embedComposition: true,
				substanceUri: uri,
				selectionHandler: "onSelectSubstance",
				configuration: jTConfig.matrix,
				onRow: function (row, data, index) {
					if (!data.bundles){
						return;
					}
					var bundleInfo = data.bundles[self.settings.bUri];
					if (!!bundleInfo && bundleInfo.tag == "selected") {
						$('input.jtox-handler', row).prop('checked', true);
					}
				}
			});

			$(cell).data('details', $newRow);

			$button.removeClass('ui-icon-folder-collapsed').addClass('ui-icon-folder-open');
		}

		// Just in case, the variable table is hidden anyway.
		this.equalizeTables();

		return false;
	};

	function onDetailedRow(row, data, event) {
		var el = $('.jtox-details-composition', row)[0];
		if (!el)
			return;
		var uri = this.settings.baseUrl + '/substance?type=related&compound_uri=' + encodeURIComponent(data.compound.URI);
		el = $(el).parents('table')[0];
		el = el.parentNode;
		$(el).empty();
		$(el).addClass('paddingless');
		var div = document.createElement('div');
		el.appendChild(div);
		new jToxSubstance(div, $.extend(true, {}, this.settings, {selectionHandler: null, substanceUri: uri, showControls: false, onLoaded: null, onDetails: function (root, data, element) {
			new jToxStudy(root, $.extend({}, this.settings, {substanceUri: data.URI}));
		} } ) );
	};

	function onReportSubstancesLoaded(dataset) {
		// Use setTimeout so that this is called after the UI is generated.
		setTimeout(function(){
			$('#jtox-report-substance-query .jtox-details-open').each(function(){
				this.click();
			});
		}, 16);
	};


	$(document).ready(function(){
		$('#logger').on('click', function () { $(this).toggleClass('hidden'); });
	});

	function formatStatus(status) {
		var statuses = {
			'draft': 'Draft Version',
			'published': 'Final Assessment',
			'archived': 'Archived Version'
		}
		return statuses[status];
	};

	MatrixKit.defaults = {
		createForm: null,
		rootElement: null,
		bundleUri: null,
		bundleSummary: {
			compound: 0,
			substance: 0,
			property: 0,
			matrix: 0,
		},

		edit: {
			study: [],
		},

		settings: {
			studyTypeList: _i5.qaSettings["Study result type"],
			maxStars: 10,
			matrixIdentifiers: [
				"http://www.opentox.org/api/1.1#CASRN",
				"#SubstanceName",
				"#SubstanceUUID",
				"http://www.opentox.org/api/1.1#SubstanceDataSource",
			],
			matrixMultiRows: [
				"#Tag",
				"http://www.opentox.org/api/1.1#Diagram",
				"#ConstituentName",
				"#ConstituentContent",
				"#ConstituentContainedAs"
			]
		}
	};

	jT.ui.Matrix = MatrixKit;

})(_, jQuery, jToxKit);
(function (Solr, a$, $, jT) {
  
  function buildValueRange(stats, isUnits) {
    var vals = " = ";

    // min ... average? ... max
    vals += (stats.min == null ? "-&#x221E;" :  stats.min);
    if (!!stats.avg) vals += "&#x2026;" + stats.avg;
    vals += "&#x2026;" + (stats.max == null ? "&#x221E;" : stats.max);
  						
    if (isUnits)
      vals += " " + jT.formatUnits(stats.val)
        .replace(/<sup>(2|3)<\/sup>/g, "&#x00B$1;")
        .replace(/<sup>(\d)<\/sup>/g, "^$1");
        
    return vals;
	};

  function InnerTagWidgeting (settings) {
    this.id = settings.id;
    this.pivotWidget = settings.pivotWidget;
  };
  
  var iDificationRegExp = /\W/g;
  
  InnerTagWidgeting.prototype = {
    pivotWidget: null,
    
    hasValue: function (value) {
      return this.pivotWidget.hasValue(this.id + ":" + value);
    },
    
    clickHandler: function (value) {
      return this.pivotWidget.clickHandler(this.id + ":" + value);
    },
    
    modifyTag: function (info) {
      info.hint = !info.unit ? 
        info.buildValueRange(info) :
        "\n" + info.unit.buckets.map(function (u) { return buildValueRange(u, true); }).join("\n");
        
      info.color = this.color;
  		return info;
    }
  };
  
  var InnerTagWidget = a$(jT.TagWidget, InnerTagWidgeting);
  
	/** The general wrapper of all parts
  	*/
  jT.PivotWidgeting = function (settings) {
    a$.extend(true, this, a$.common(settings, this));

    this.target = settings.target;
    this.targets = {};
    this.lastEnabled = 0;
    this.initialPivotCounts = null;
  };
  
  jT.PivotWidgeting.prototype = {
    __expects: [ "getFaceterEntry", "getPivotEntry", "getPivotCounts", "auxHandler" ],
    automatic: false,       // Whether to build the list dynamically.
    renderTag: null,        // A function for rendering the tags.
    multivalue: false,      // If this filter allows multiple values. Values can be arrays.
    aggregate: false,       // If additional values are aggregated in one filter.
    exclusion: false,       // Whether to exclude THIS field from filtering from itself.
    
    init: function (manager) {
      a$.pass(this, jT.PivotWidgeting, "init", manager);
      this.manager = manager;
      
      this.manager.getListener("current").registerWidget(this, true);
    },
    
    addFaceter: function (info, idx) {
      var f = a$.pass(this, jT.PivotWidgeting, "addFaceter", info, idx);
      if (typeof info === "object")
        f.color = info.color;
      if (idx > this.lastEnabled && !info.disabled)
        this.lastEnabled = idx;

      return f;
    },
    
    afterTranslation: function (data) {
      var pivot = this.getPivotCounts(data.facets);

      a$.pass(this, jT.PivotWidgeting, "afterTranslation", data);
        
      // Iterate on the main entries
      for (i = 0;i < pivot.length; ++i) {
        var p = pivot[i],
            pid = p.val.replace(iDificationRegExp, "_"),
            target = this.targets[pid];
        
        if (!target) {
          this.targets[pid] = target = new jT.AccordionExpansion($.extend(true, {}, this.settings, this.getFaceterEntry(0), { id: pid, title: p.val }));
          target.updateHandler = this.updateHandler(target);
          target.target.children().last().remove();
        }
        else
          target.target.children('ul').hide();
          
        this.traversePivot(target.target, p, 1);
        target.updateHandler(p.count);
      }
      
      // Finally make this update call.
      this.target.accordion("refresh");
    },
    
    updateHandler: function (target) {
			var hdr = target.getHeaderText();
			return function (count) { hdr.textContent = jT.ui.updateCounter(hdr.textContent, count); };
    },
    
    prepareTag: function (value) {
      var p = this.parseValue(value);

      return {
        title: p.value,
        color: this.faceters[p.id].color,
        count: "i",
        onMain: this.unclickHandler(value),
        onAux: this.auxHandler(value)
      };
    },
    
    traversePivot: function (target, root, idx) {
      var elements = [],
          faceter = this.getPivotEntry(idx),
          bucket = root[faceter.id].buckets;
			
      if (idx === this.lastEnabled) {
        var w = target.data("widget");
        if (!w) {
          w = new InnerTagWidget({
            id: faceter.id,
            color: faceter.color,
            renderItem: this.renderTag,
            pivotWidget: this,
            target: target,
            multivalue: this.multivalue,
            aggregate: this.aggregate,
            exclusion: this.exclusion
          });

          w.init(this.manager);
          target.data({ widget: w, id: faceter.id });
        }
        else
          target.children().slice(1).remove();

        w.populate(bucket, true);        
        elements = [ ];
      }
			else if (bucket != null) {
  			for (var i = 0, fl = bucket.length;i < fl; ++i) {
  				var f = bucket[i],
  				    fid = f.val.replace(iDificationRegExp, "_"),
  				    cont$;

          if (target.children().length > 1) // the input field.
            cont$ = $("#" + fid, target[0]).show();
          else {
				    cont$ = jT.ui.fillTemplate("tag-facet", faceter).attr("id", fid);
            
    				f.title = f.val;
    				f.onMain = this.clickHandler(faceter.id + ":" + f.val);
    				f.hint = buildValueRange(f);
  					cont$.append(this.renderTag(f).addClass("category title").addClass(faceter.color));
            elements.push(cont$);
          }
  				    
					this.traversePivot(cont$, f, idx + 1);
        }
      }
      
      target.append(elements);
		}
		
	};
	
})(Solr, asSys, jQuery, jToxKit);
/* toxquery.js - Universal query widget, that can work with any kit (study or compound) inside
 *
 * Copyright 2012-2014, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan Georgiev
**/

var jToxQuery = (function () {
  var defaultSettings = { // all settings, specific for the kit, with their defaults. These got merged with general (jToxKit) ones.
    scanDom: true,          // whether to scan the whole DOM for finding the main query kit
    initialQuery: false,    // whether to perform an initial query, immediatly when loaded.
    kitSelector: null,      // selector for the main kit, if outside, for example.
    dom: null,              // an, all-prepared object with all sub-kits. Structure { kit: <main kit object>, widgets: { <kit type>: <widget kit object> } }

    configuration: {
      // this is the main thing to be configured
      handlers: {
        query: function (e, query) { jT.parentKit(jToxQuery, this).query(); },
      }
    }
  };

  var cls = function (root, settings) {
    var self = this;
    self.rootElement = root;
    jT.$(root).addClass('jtox-toolkit'); // to make sure it is there even when manually initialized

    self.settings = jT.$.extend(true, {}, defaultSettings, jT.settings, settings);
    self.mainKit = null;

    if (self.settings.scanDom && !self.settings.dom) {
      self.settings.dom = { kit: null, widgets: { } };
      jT.$('.jtox-toolkit', self.rootElement).each(function () {
        if (jT.$(this).hasClass('jtox-widget'))
          self.settings.dom.widgets[jT.$(this).data('kit')] = this;
        else
          self.settings.dom.kit = this;
      });
    }

    if (!!self.settings.kitSelector)
      self.settings.dom.kit = jT.$(self.settings.kitSelector)[0];

    // finally, wait a bit for everyone to get initialized and make a call, if asked to
    if (!!self.settings.initialQuery)
      self.initialQueryTimer = setTimeout(function () { self.query(); }, 200);
  };

  cls.prototype.widget = function (name) {
    return this.settings.dom.widgets[name];
  };

  cls.prototype.kit = function () {
    if (!this.mainKit)
      this.mainKit = jT.kit(this.settings.dom.kit);

    return this.mainKit;
  };

  cls.prototype.setWidget = function (id, dom) {
    this.settings.dom.widgets[id] = dom;
  };

  cls.prototype.cancelInitialQuery = function () {
    if (!!this.initialQueryTimer)
      clearTimeout(this.initialQueryTimer);
  };

  /* Perform the actual query, traversing all the widgets and asking them to
  alter the given URL, then - makes the call */
  cls.prototype.query = function () {
    var uri = this.settings.service || '';
    for (var w in this.settings.dom.widgets) {
      var widget = jT.kit(this.settings.dom.widgets[w]);
      if (!widget)
        console.log("jToxError: the widget [" + w + "] is not recognized: ignored");
      else if (!widget['modifyUri'])
        console.log("jToxError: the widget [" + w + "] doesn't have 'modifyUri' method: ignored");
      else
        uri = widget.modifyUri(uri);
    }

    if (!!uri)
      this.kit().query(uri);
  }; 
  // end of prototype

  return cls;
})();

/* Now comes the jToxSearch component, which implements the compound searching block
*/
var jToxSearch = (function () {
  var defaultSettings = { // all settings, specific for the kit, with their defaults. These got merged with general (jToxKit) ones.
    defaultNeedle: '50-00-0',     // which is the default search string, if empty one is provided
    smartsList: 'funcgroups',     // which global JS variable to seek for smartsList
    hideOptions: '',              // comma separated list of search options to hide
    slideInput: false,            // whether to slide the input, when focussed
    contextUri: null,             // a search limitting contextUri - added as dataset_uri parameter
    configuration: {
      handlers: { }
    }
  };

  var queries = {
    'auto': "/query/compound/search/all",
    'uri': "/query/compound/url/all",
    'similarity': "/query/similarity",
    'smarts': "/query/smarts"
  };

  var cls = function (root, settings) {
    var self = this;
    self.rootElement = root;
    jT.$(root).addClass('jtox-toolkit'); // to make sure it is there even when manually initialized

    self.settings = jT.$.extend(true, {}, defaultSettings, jT.settings, settings);
    self.rootElement.appendChild(jT.getTemplate('#jtox-search'));
    self.queryKit = jT.parentKit(jToxQuery, self.rootElement);

    self.search = { mol: "", type: "", queryType: "auto"};

    var form = jT.$('form', self.rootElement)[0];
    form.onsubmit = function () { return false; }

    // go for buttonset preparation, starting with hiding / removing passed ones
    if (!!self.settings.hideOptions) {
      var hideArr = self.settings.hideOptions.split(',');
      for (var i = 0; i < hideArr.length; ++i) {
        jT.$('#search' + hideArr[i], self.rootElement).remove();
        jT.$('label[for="search' + hideArr[i] + '"]', self.rootElement).remove();
      }
    }

    if (!!form.searchcontext) {
      form.searchcontext.value = self.settings.contextUri;
      $(form.searchcontext).on('change', function (e) {
        self.settings.contextUri = this.value;
      });
    }

    // when we change the value here - all, possible MOL caches should be cleared.
    jT.$(form.searchbox).on('change', function () {
      self.setAuto();
    });

    if (self.settings.slideInput)
      jT.$(form.searchbox)
      .on('focus', function () {
        var gap = jT.$(form).width() - jT.$(radios).width() - 30 - jT.$('.search-pane').width();
        var oldSize = $(this).data('oldSize') || $(this).width();
        $(this).data('oldSize', oldSize);
        jT.$(this).css('width', '' + (oldSize + gap) + 'px');
      })
      .on('blur', function () {
        jT.$(this).css('width', '');
      });

    var hasAutocomplete = false;
    if (jT.$('#searchuri', self.rootElement).length > 0) {
      hasAutocomplete = true;
      jT.$(form.searchbox).autocomplete({
        minLength: 2,
        open: function() { jT.$( this ).removeClass( "ui-corner-all" ).addClass( "ui-corner-top" ); },
        close: function() { jT.$( this ).removeClass( "ui-corner-top" ).addClass( "ui-corner-all" ); },
        source: function (request, response) {
          jT.call(self, '/dataset?search=^' + request.term, function (result) {
            response(!result ? [] : $.map( result.dataset, function( item ) {
              var pos =  item.URI.lastIndexOf("/"),
                  shortURI = (pos >= 0) ? "D" + item.URI.substring(pos+1) + ": " : "";
              return {
                label: shortURI + item.title,
                value: item.URI
              };
            }));
          });
        }
      });
    }

    var radios = jT.$('.jq-buttonset', root).buttonset();
    var onTypeClicked = function () {
      form.searchbox.placeholder = jT.$(this).data('placeholder');
      jT.$('.search-pane .auto-hide', self.rootElement).addClass('hidden');
      jT.$('.search-pane .' + this.id, self.rootElement).removeClass('hidden');
      self.search.queryType = this.value;
      if (this.value == 'uri') {
        jT.$(form.drawbutton).addClass('hidden');
        if (hasAutocomplete)
          jT.$(form.searchbox).autocomplete('enable');
      }
      else {
        jT.$(form.drawbutton).removeClass('hidden');
        if (hasAutocomplete)
          jT.$(form.searchbox).autocomplete('disable');
      }
    };

    jT.$('.jq-buttonset input', root).on('change', onTypeClicked);

    var typeEl = jT.$('#search' + self.settings.option, root)[0];
    if (typeEl != null)
      jT.$(typeEl).trigger('click');
    else
      ccLib.fireCallback(onTypeClicked, jT.$('.jq-buttonset input', root)[0])

    // spend some time to setup the SMARTS groups
    if (!!window[self.settings.smartsList]) {
      var list = window[self.settings.smartsList];
      var familyList = [];
      var familyIdx = {};

      for (var i = 0, sl = list.length; i < sl; ++i) {
        var entry = list[i];
        if (familyIdx[entry.family] === undefined) {
          familyIdx[entry.family] = familyList.length;
          familyList.push([]);
        }

        familyList[familyIdx[entry.family]].push(entry);
      }

      // now we can iterate over them
      var df = document.createDocumentFragment();
      for (fi = 0, fl = familyList.length; fi < fl; ++fi) {
        var grp = document.createElement('optgroup');
        grp.label = familyList[fi][0].family;

        for (i = 0, el = familyList[fi].length; i < el; ++i) {
          var e = familyList[fi][i];
          var opt = document.createElement('option');
          opt.innerHTML = e.name;
          opt.value = e.smarts;
          if (!!e.hint)
            jT.$(opt).attr('data-hint', e.hint);
          grp.appendChild(opt);
        }
        df.appendChild(grp);
      }

      // now it's time to add all this and make the expected behavior
      form.smarts.appendChild(df);
      form.smarts.firstElementChild.checked = true;

      jT.$(form.smarts).on('change', function () {
        var hint = jT.$(this[this.selectedIndex]).data('hint');
        form.smarts.title = (!!hint ? hint : '');
        self.setAuto(this.value);
      });
    }

    // Now, deal with KETCHER - make it show, attach handlers to/from it, and handlers for showing/hiding it.
    var ketcherBox = jT.$('.ketcher', root)[0];
    var ketcherReady = false;
    var onKetcher = function (service, method, async, parameters, onready) {
      if (service == "knocknock")
        onready("You are welcome!", null);
      else
        jT.call(self.queryKit.kit(), '/ui/' + service, {dataType: "text", data: parameters}, function (res, jhr) { onready(res, jhr); });
    };

    var ensureKetcher = function () {
      if (!ketcherReady) {
        jT.insertTool('ketcher', ketcherBox);
        ketcher.init({ root: ketcherBox, ajaxRequest: onKetcher });

        var emptySpace = jT.$('.toolEmptyCell', ketcherBox)[0];
        jT.$(emptySpace.appendChild(jT.getTemplate('#ketcher-usebutton'))).on('click', function () {
          var smiles = ketcher.getSmiles();
          var mol = ketcher.getMolfile();
          self.setMol(mol);
          if (!!smiles)
            form.searchbox.value = smiles;
        });
        jT.$(emptySpace.appendChild(jT.getTemplate('#ketcher-drawbutton'))).on('click', function () {
          ketcher.setMolecule(self.search.mol || form.searchbox.value);
        });
        ketcherReady = true;
      }
    };

    jT.$(form.drawbutton).on('click', function () {
      if (jT.$(ketcherBox).hasClass('shrinken')) {
        ensureKetcher();
        jT.$(ketcherBox).css('display', '');
      }
      else
        setTimeout(function () { jT.$(ketcherBox).css('display', 'none'); }, 500);

      setTimeout(function () { jT.$(ketcherBox).toggleClass('shrinken') }, 50);
    });

    // finally - parse the URL-passed parameters and setup the values appropriately.
    var doQuery = false;
    if (!!self.settings.b64search) {
      self.setMol($.base64.decode(self.settings.b64search));
      doQuery = true;
    }
    else if (!!self.settings.search) {
      self.setAuto(self.settings.search);
      doQuery = true;
    }

    jT.ui.installHandlers(self);
    if (doQuery) {
      self.queryKit.cancelInitialQuery();
      setTimeout(function () { self.queryKit.query(); }, 250);
    }
    // and very finally - install the handlers...
  };

  // required from jToxQuery - this is how we add what we've collected
  cls.prototype.modifyUri = function (uri) {
    var form = jT.$('form', this.rootElement)[0];
    var params = { type: this.search.type };
    var type = this.search.queryType;

    if (type == "auto" && params.type == 'auto' && form.searchbox.value.indexOf('http') == 0)
      type = "uri";

    var res = queries[type] + (uri.indexOf('?') > -1 ? '' : '?') + uri;

    if (!!this.search.mol) {
      params.b64search = $.base64.encode(this.search.mol);
    }
    else {
      params.search = form.searchbox.value;
      if (!params.search)
        params.search = this.settings.defaultNeedle;
        this.setAuto(params.search);
    }

    if (type == "auto" && form.regexp.checked) {
      params['condition'] = "regexp";
    }
    if (type == 'similarity') {
      params.threshold = form.threshold.value;
    }

    if (type == 'similarity') {
      params.filterBySubstance = form.similaritybysubstance.checked;
    }
    if (type == 'smarts') {
      params.filterBySubstance = form.smartsbysubstance.checked;
    }

    if (!!this.settings.contextUri)
      params['dataset_uri'] = this.settings.contextUri;

    return ccLib.addParameter(res, $.param(params));
  };

  // some shortcuts for outer world.
  cls.prototype.makeQuery = function (needle) {
    if (!!needle)
      this.setAuto(needle);
    this.queryKit.query();
  },

  cls.prototype.getNeedle = function () {
    return this.search.type == 'mol' ? this.search.mol : jT.$('form', this.rootElement)[0].searchbox.value;
  };

  cls.prototype.setAuto = function (needle) {
    this.search.mol = null;
    this.search.type = 'auto';

    var box = jT.$('form', this.rootElement)[0].searchbox;
    if (!!this.search.oldplace)
      box.placeholder = this.search.oldplace;
    if (needle != null)
      box.value = needle;
  };

  cls.prototype.setMol = function (mol) {
    var box = jT.$('form', this.rootElement)[0].searchbox;
    this.search.mol = mol;
    this.search.type = 'mol';
    this.search.oldplace = box.placeholder;

    box.placeholder = "MOL formula saved_";
    box.value = '';
  }; 
  // end of prototype

  return cls;
})();
(function (Solr, a$, $, jT) {
  
  function SimpleRanger(settings) { 
    this.sliderRoot = settings.sliderRoot;
  }
  
  SimpleRanger.prototype.__expects = [ "addValue", "doRequest" ];
  SimpleRanger.prototype.targetValue = null;
  SimpleRanger.prototype.updateHandler = function () {
    var self = this;
    return function (values) {
      if (!!self.addValue(values)) {
        self.sliderRoot.updateRequest = true;
        self.doRequest();
      } 
    };
  }
  SimpleRanger.prototype.doRequest = function () {
    this.manager.doRequest();
  }
  
  SingleRangeWidget = a$(Solr.Ranging, Solr.Patterning, jT.SliderWidget, SimpleRanger, Solr.Delaying);
  
	/** The general wrapper of all parts
  	*/
  	
  var defaultParameters = {
    'facet': true,
    'rows': 0,
    'fl': "id",
    'facet.limit': -1,
    'facet.mincount': 1,
    'echoParams': "none"
  };
  	
  jT.RangeWidgeting = function (settings) {
    a$.extend(true, this, a$.common(settings, this));

    this.slidersTarget = $(settings.slidersTarget);
    this.lookupMap = settings.lookupMap || {};
    this.pivotMap = null;
    this.rangeWidgets = [];
    if (!Array.isArray(this.titleSkips))
      this.titleSkips = [ this.titleSkips ];
  };
  
  jT.RangeWidgeting.prototype = {
    __expects: [ "getPivotEntry", "getPivotCounts", "parseValue" ],
    field: null,
    titleSkips: null,
    
    init: function (manager) {
      a$.pass(this, jT.RangeWidgeting, "init", manager);
      this.manager = manager;
      
      var self = this;
      self.applyCommand = $("#sliders-controls a.command.apply").on("click", function (e) {
        self.skipClear = true;
        self.manager.doRequest();
        return false;
      });
      
      $("#sliders-controls a.command.close").on("click", function (e) {
        self.rangeRemove();
        return false;
      });
    },
    
    afterTranslation: function (data) {
      var pivot = this.getPivotCounts(data.facets);
            
      a$.pass(this, jT.RangeWidgeting, "afterTranslation", data);
            
      if (!this.pivotMap) {
        var qval = this.manager.getParameter('q').value || "";
        if ((!qval || qval == "*:*") && !this.manager.getParameter(this.useJson ? "json.filter" : "fq").value)
          this.pivotMap =  this.buildPivotMap(pivot);
      }
      else if (!this.updateRequest)
        this.rangeRemove();
      else if (this.rangeWidgets.length > 0) {
        var pivotMap = this.buildPivotMap(pivot);
        
        for (var i = 0;i < this.rangeWidgets.length; ++i) {
          var w = this.rangeWidgets[i],
            ref = pivotMap[w.targetValue];
          w.updateSlider([ ref[i].min, ref[i].max ]);
        }
      }
      
      this.updateRequest = false;
    },

    getPivotFromId: function (pId) {
      var pInfo = null;
      for (var i = 0; (pInfo = this.getPivotEntry(i)).id != pId; ++i);
      return pInfo;
    },
    
    buildPivotMap: function (pivot) {
      var self = this,
          map = {},
          traverser = function (base, idx, pattern, valId) {
            var p = self.getPivotEntry(idx),
                info, next;
            
            // Make the Id first
            if (!p.disabled)
              valId = p.id + ":" + base.val;
              
            // Now deal with the pattern
            pattern += (!base.val ? ("-" + p.field + ":*") : (p.field + ":" + Solr.escapeValue(base.val))) + " ";
            info = base;
              
            next = self.getPivotEntry(idx + 1);
            if (next != null)
              base = base[next.id].buckets;

            // If we're at the bottom - add some entries...
            if (next == null || !base.length) {
              (map[valId] = map[valId] || []).push({
                'id': p.id,
                'pattern': pattern,
                'color': p.color,
                'min': info.min,
                'max': info.max,
                'avg': info.avg,
                'val': info.val,
                'count': info.count
              });
            }
            // ... or just traverse and go deeper.
            else {
              for (var i = 0, bl = base.length; i < bl; ++i)
                traverser(base[i], idx + 1, pattern, valId);
            }
          };
          
      for (var i = 0;i < pivot.length; ++i)
        traverser(pivot[i], 0, "");
        
      return map;
    },
    
    rangeRemove: function() {
      this.slidersTarget.empty().parent().removeClass("active");

      for (var i = 0, wl = this.rangeWidgets.length;i < wl; ++i)
        this.rangeWidgets[i].clearValues();

      this.rangeWidgets = [];
      this.lastPivotValue = null;
    },
    
    buildTitle: function (info, skip) {
      var pat = info.pattern.replace(/\\"/g, "%0022"),
          fields = pat.match(/\w+:([^\s:\/"]+|"[^"]+")/g),
          outs = [];
      
      // Stupid, but we need to have both regexps because of the
      // global flag needed on the first one and NOT needed later.
      for (var i = 0;i < fields.length; ++i) {
        var f = fields[i],
            m = f.match(/(\w+):([^\s:\/"]+|"[^"]+")/),
            v = m[2].replace(/^\s*\(\s*|\s*\)\s*$/g, "");
        
        if (!m[1].match(skip))
          outs.push(this.lookupMap[v] || v);
      }
      
      return outs.join("/") + " <i>(" + info.count + ")</i>";
    },
    
    ensurePivotMap: function (cb) {
      if (this.pivotMap != null)
        return cb(this.pivotMap);
        
      var fqName = this.useJson ? "json.filter" : "fq",
          self = this;
      
      // We still don't have it - make a separate request
      this.doSpying(
        function (man) {
          man.removeParameters(fqName);
          man.removeParameters('fl');
          man.getParameter('q').value = "";
          man.mergeParameters(defaultParameters);
        },
        function (data) {
          cb(self.pivotMap = self.buildPivotMap(self.getPivotCounts(data.facets)));
        }
      );
      
      return false;
    },
    
    openRangers: function (value) {
      var allVals = this.pivotMap[value],
          localMap = this.buildPivotMap(this.getPivotCounts()),
          current = localMap[value];
      
      this.lastPivotValue = value;
      this.slidersTarget.empty().parent().addClass("active");

      for (var i = 0, rangeCnt = current.length; i < rangeCnt; ++i) {
        var ref = current[i],
            full = allVals.find(function (e) { return e.pattern === ref.pattern }) || ref,
            el$ = jT.ui.fillTemplate("slider-one"),
            setup = {
              id: ref.id,
              targetValue: value,
              color: full.color,
              field: this.field,
              limits: [ full.min, full.max ],
              initial: [ ref.min, ref.max ],
              target: el$,
              isRange: true,
              valuePattern: ref.pattern + "{{v}}",
              automatic: true,
              title: this.buildTitle(ref, /^unit[_shd]*|^effectendpoint[_shd]*/),
              units: ref.id == "unit" ? jT.formatUnits(ref.val) : "",
              useJson: this.useJson,
              domain: this.domain,
              sliderRoot: this
            };

        this.slidersTarget.append(el$);
        setup.width = parseInt(this.slidersTarget.width() - $("#sliders-controls").width() - 20) / (Math.min(rangeCnt, 2) + 0.1);

        var w = new SingleRangeWidget(setup);
        this.rangeWidgets.push(w);
        w.init(this.manager);
      }
    },
    
    auxHandler: function (value) {
      var self = this,
        pInfo = this.getPivotFromId(this.parseValue(value).id) || {};
      
      return !pInfo.ranging ? undefined : function (event) {
        event.stopPropagation();
        var prevValue = self.lastPivotValue;

        self.rangeRemove();

        // we've clicked out pivot button - clearing was enough.
        if (value != prevValue)
          self.ensurePivotMap(function () { self.openRangers(value); });
        
        return false;
      };
    },
    
    clearValues: function () {
      this.rangeRemove();
      a$.pass(this, jT.RangeWidgeting, "clearValues");
    }
    
	};
	
})(Solr, asSys, jQuery, jToxKit);
(function (Solr, a$, $, jT) {

var htmlLink = '<a href="{{href}}" title="{{hint}}" target="{{target}}" class="{{css}}">{{value}}</a>',
    plainLink = '<span title="{{hint}}" class="{{css}}">{{value}}</span>';
  
jT.ItemListWidget = function (settings) {
	settings.baseUrl = jT.fixBaseUrl(settings.baseUrl);
  a$.extend(true, this, a$.common(settings, this));

  this.lookupMap = settings.lookupMap || {};
	this.target = settings.target;
  this.id = settings.id;
  if (!this.imagesRoot.match(/(\/|\\)$/))
    this.imagesRoot += '/'
};

jT.ItemListWidget.prototype = {
  baseUrl: "",
  summaryPrimes: [ "RESULTS" ],
  imagesRoot: "../img/",
  tagDbs: {},
  onCreated: null,
  onClick: null,
  summaryRenderers: {
    "RESULTS": function (val, topic) { 
      var self = this;
      return val.map(function (study) { 
        return study.split(".").map(function (one) { return self.lookupMap[one] || one; }).join("."); 
      });
    },
    "REFOWNERS": function (val, topic) {
      return { 'topic': "Study Providers", 'content': val.map(function (ref) { return jT.formatString(htmlLink, { 
        href: "#", 
        hint: "Freetext search", 
        target: "_self", 
        value: ref, 
        css: "freetext_selector" 
      }); }) };
    },
    "REFS": function (val, topic) { 
      return { 
        'topic': "References",
        'content': val.map(function (ref) { 
          var link = ref.match(/^doi:(.+)$/);
          link = link != null ? "https://www.doi.org/" + link[1] : ref;
          return jT.formatString(
            link.match(/^https?:\/\//) ? htmlLink : plainLink,
            { href: link, hint: "External reference", target: "ref", value: ref }
          );
        })
      }
    }
  },
  renderLinks: function (doc) {
    var baseUrl = this.getBaseUrl(doc) + "substance/",
        item = {};

    // Check if external references are provided and prepare and show them.
    if (doc.content == null) {
      item.link = baseUrl + doc.s_uuid;
      item.link_target = doc.s_uuid;
      item.footer = 
        '<a href="' + baseUrl + doc.s_uuid + '" title="Substance" target="' + doc.s_uuid + '">Material</a>' +
        '<a href="' + baseUrl + doc.s_uuid + '/structure" title="Composition" target="' + doc.s_uuid + '">Composition</a>' +
        '<a href="' + baseUrl + doc.s_uuid + '/study" title="Study" target="' + doc.s_uuid + '">Studies</a>';
      item.composition = this.renderComposition(doc, 
        '<a href="' + baseUrl + doc.s_uuid + '/structure" title="Composition" target="' + doc.s_uuid + '">&hellip;</a>').join("<br/>");
        ;
    } else {
      item.link_target = "external";
      item.composition = this.renderComposition(doc);
      item.link_title = this.tagDbs[doc.dbtag_hss] && this.tagDbs[doc.dbtag_hss].title || "External database";
      item.footer = "";
      
      for (var i = 0; i < doc.content.length; ++i) {
        if (!doc.content[i].match(/^https?:\/\//))
          continue;
        if (!item.link)
          item.link = doc.content[i];

        item.footer += '<a href="' + doc.content[i] + '" target="external">' + item.link_title + '</a>&nbsp;';
      }
    }

    return item;
  },
	
  renderItem: function (doc) {
		var self = this,
				el = $(this.renderSubstance(doc));
				
		if (!el.length) 
		  return null;

		$(this.target).append(el);
		
		if (typeof this.onClick === "function")
			$("a.command", el[0]).on("click", function (e) { self.onClick.call(el[0], e, doc, self); });
			
		if (typeof this.onCreated === 'function')
			this.onCreated.call(el, doc, this);
				
		$("a.more", el[0]).on("click", function(e) {
			e.preventDefault();
			e.stopPropagation();
			var $this = $(this), 
					$div = $(".more-less", $this.parent()[0]);

			if ($div.is(':visible')) {
				$div.hide();
				$this.text('more');
			} else {
				$div.show();
				$this.text('less');
			}

			return false;
		});
		
		return null;
	},
	
	/**
	 * substance
	 */
  renderSubstance: function(doc) {
    var summaryhtml = jT.ui.templates["summary-item"],
        summarylist = this.buildSummary(doc),
        summaryRender = function (summarylist) { 
          return summarylist.map(function (s) { return jT.formatString(summaryhtml, s)}).join("");
        },
        item = { 
          logo: this.tagDbs[doc.dbtag_hss] && this.tagDbs[doc.dbtag_hss].icon || (this.imagesRoot + "external.png"),
          link_title: this.tagDbs[doc.dbtag_hss] && this.tagDbs[doc.dbtag_hss].title || "Substance",
          link_target: "_blank",
          link: "#",
          title: (doc.publicname || doc.name) + (doc.pubname === doc.name ? "" : "  (" + doc.name + ")") 
                + (doc.substanceType == null ? "" : (" " 
                  + (this.lookupMap[doc.substanceType] || doc.substanceType)
                )),
          summary: summarylist.length > 0 ? summaryRender(summarylist.splice(0, this.summaryPrimes.length)) : "",
          item_id: (this.prefix || this.id || "item") + "_" + doc.s_uuid          
        };

    // Build the outlook of the summary item
    if (summarylist.length > 0)
      item.summary += 
        '<a href="#" class="more">more</a>' +
        '<div class="more-less" style="display:none;">' + summaryRender(summarylist) + '</div>';

    return jT.ui.fillTemplate("result-item", $.extend(item, this.renderLinks(doc)));
  },
  
  getBaseUrl: function(doc) {
    return jT.fixBaseUrl(this.tagDbs[doc.dbtag_hss] && this.tagDbs[doc.dbtag_hss].server || 
        this.settings.baseUrl || this.baseUrl);
  },
	
  renderComposition: function (doc, defValue) {
  	var summary = [],
  	    composition = doc._extended_ && doc._extended_.composition;
  	    
    if (!!composition) {
      var cmap = {};
      a$.each(composition, function(c) {
        var ce = cmap[c.component_s],
            se = [];
        if (ce === undefined)
          cmap[c.component_s] = ce = [];
        
        a$.each(c, function (v, k) {
          var m = k.match(/^(\w+)_[shd]+$/);
          k = m && m[1] || k;
          if (!k.match(/type|id|component/))
            se.push(jT.formatString(htmlLink, { 
              href: "#", 
              hint: "Freetext search on '" + k + "'", 
              target: "_self", 
              value: v, 
              css:"freetext_selector" 
            }));
        });
        
        ce.push(se.join(", "));
    	});
    	
    	a$.each(cmap, function (map, type) {
        var entry = "";
        for (var i = 0;i < map.length; ++i) {
          if (map[i] == "")
            continue;
            
        	entry += (i == 0) ? ": " : "; ";
        	if (map.length > 1)
        	  entry += "<strong>[" + (i + 1) + "]</strong>&nbsp;";
          entry += map[i];
      	}
      	
        if (entry === "" && !!defValue)
          entry = ":&nbsp;" + defValue;
        
        summary.push(type + " (" + map.length + ")" + entry);
    	});
    }
  	
  	return summary;
	},
	
  buildSummary: function(doc) {
  	var self = this,
  	    items = [];
  	
  	a$.each(doc, function (val, key) {
    	var name = key.match(/^SUMMARY\.([^_]+)_?[hsd]*$/);
    	if (!name)
    	  return;
    	  
      name = name[1];
      var render = (self.summaryRenderers[name] || self.summaryRenderers._),
          item = typeof render === "function" ? render.call(self, val, name) : val;

      if (!item)
        return;
      
      if (typeof item !== "object" || Array.isArray(item))
        item = { 'topic': name.toLowerCase(), 'values' : item };
      else if (item.topic == null)
        item.topic = name.toLowerCase();
      
      if (!item.content)
        item.content = Array.isArray(item.values) ? item.values.join(", ") : item.values.toString();
        
      var primeIdx = self.summaryPrimes.indexOf(name);
      if (primeIdx > -1 && primeIdx < items.length)
        items.splice(primeIdx, 0, item);
      else
        items.push(item);
  	});
  	
  	return items;
	}
}; // prototype


// Keep in mind that the field should be the same in all entries.
jT.ResultWidgeting = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
};

jT.ResultWidgeting.prototype = {
  __expects: [ "populate" ],

  init: function (manager) {
    a$.pass(this, jT.ResultWidgeting, 'init', manager);
    this.manager = manager;
  },
  
	beforeRequest : function() {
		$(this.target).html(
				$('<img>').attr('src', this.imagesRoot + 'ajax-loader.gif'));
	},
	
	afterFailure: function(jhr, params) {
    $(this.target).html("Error retrieving data!");  	
	},

	afterTranslation : function(data) {
		$(this.target).empty();
		this.populate(data.entries);
	}
};

jT.ResultWidget = a$(Solr.Listing, jT.ListWidget, jT.ItemListWidget, jT.ResultWidgeting);

})(Solr, asSys, jQuery, jToxKit);
/* StudyKit.js - Study-related functions from jToxKit. Migrated.
 *
 * Copyright 2012-2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan (Jonan) Georgiev
 **/

(function (a$, $, jT) {

	// constructor
	var StudyKit = function (settings) {
		this.rootElement = settings.target;
		this.instanceNo = StudyKit.instanceCount++;
		$(this.rootElement).addClass('jtox-toolkit'); // to make sure it is there even in manual initialization.

		this.settings = $.extend(true, {}, StudyKit.defaults, settings); // i.e. defaults from jToxStudy
		this.settings.tab = this.settings.tab || jT.ui.fullUrl.hash;

		// get the main template, add it (so that jQuery traversal works) and THEN change the ids.
		// There should be no overlap, because already-added instances will have their IDs changed already...
		var tree$ = jT.ui.putTemplate('all-studies', ' ? ', this.rootElement),
			self = this;

		jT.ui.changeTabsIds(tree$[0], '_' + this.instanceNo);

		// initialize the tab structure for several versions of tabs.
		this.tabs = tree$.tabs({
			"select": function (event, ui) {
				self.loadPanel(ui.panel);
			},
			"beforeActivate": function (event, ui) {
				if (ui.newPanel)
					self.loadPanel(ui.newPanel[0]);
			}
		});

		// Initialize some handling buttons.
		tree$.on('click', 'div.jtox-study-tab div button', function (e) {
			var par = $(this).parents('.jtox-study-tab')[0];
			if ($(this).hasClass('expand-all')) {
				$('.jtox-foldable', par).removeClass('folded');
			} else if ($(this).hasClass('collapse-all')) {
				$('.jtox-foldable', par).addClass('folded');
			}
		});

		// when all handlers are setup - make a call, if needed.
		if (!!this.settings.substanceUri) {
			this.querySubstance(this.settings.substanceUri);
		}
		else if(!!this.settings.substanceId) {
			this.querySubstance(this.settings.baseUrl + 'substance/' + this.settings.substanceId);
		}
	};

	// now follow the prototypes of the instance functions.
	StudyKit.prototype.loadPanel = function (panel) {
		var self = this;
		if ($(panel).hasClass('unloaded')) {
			var uri = self.addParameters($(panel).data('jtox-uri'));
			jT.ambit.call(self, uri, function (study) {
				if (!!study) {
					$('.jtox-study.folded', panel).removeClass('folded');
					$(panel).removeClass('unloaded').addClass('loaded');

					self.processStudies(panel, study.study, true);
					jT.fireCallback(self.settings.onStudy, self, study.study);
				}
			});
		}
	};

	StudyKit.prototype.createCategory = function (tab, category) {
		var theCat$ = $('.' + category + '.jtox-study', tab);
		if (!theCat$.length) {
			var aStudy = jT.ui.putTemplate('one-study', {})
				.addClass(category);
			theCat$ = $(tab).append(aStudy);
		}

		return theCat$[0];
	};

	StudyKit.prototype.addParameters = function (summaryURI) {
		var self = this;
		var pars = ["property_uri", "top", "category"];
		for (var i = 0; i < pars.length; ++i) {
			var p = pars[i];
			if (!!self.settings[p])
				summaryURI = jT.addParameter(summaryURI, p + "=" + self.settings[p]);
		}

		return summaryURI;
	};

	// modifies the column title, according to configuration and returns "null" if it is marked as "invisible".
	StudyKit.prototype.ensureTable = function (tab, study) {
		var self = this,
			category = study.protocol.category.code,
			theTable = $('.' + category + ' .jtox-study-table', tab)[0];

		if (!$(theTable).hasClass('dataTable')) {
			var colDefs = [];

			// this function takes care to add as columns all elements from given array
			var putAGroup = function (group, fProcess) {
				var count = 0;
				var skip = [];
				for (var p in group) {
					if (skip.indexOf(p) > -1)
						continue;
					if (group[p + " unit"] !== undefined)
						skip.push(p + " unit");
					var val = fProcess(p);
					if (val == null)
						continue;

					colDefs.push(val);
					count++;
				}
				return count;
			}

			var putDefaults = function (start, len, group) {
				for (var i = 0; i < len; ++i) {
					var col = $.extend({}, StudyKit.defaultColumns[i + start]);
					col = jT.tables.modifyColDef(self, col, category, group);
					if (col != null) {
						colDefs.push(col);
					}
				}
			};

			putDefaults(0, 1, "main");

			// use it to put parameters...
			putAGroup(study.parameters, function (p) {
				if (study.effects[0].conditions[p] !== undefined || study.effects[0].conditions[p + " unit"] !== undefined)
					return undefined;

				var col = {
					title: p,
					className: "center middle",
					data: "parameters." + p,
					defaultContent: "-"
				};

				col = jT.tables.modifyColDef(self, col, category, "parameters");
				if (col == null)
					return null;

				col["render"] = function (data, type, full) {
					return jT.ui.renderRange(data, full[p + " unit"], type);
				};
				return col;
			});
			// .. and conditions
			putAGroup(study.effects[0].conditions, function (c) {
				var col = {
					title: c,
					className: "center middle jtox-multi",
					data: "effects"
				};

				col = jT.tables.modifyColDef(self, col, category, "conditions");
				if (col == null)
					return null;

				col["render"] = function (data, type, full) {
					return jT.tables.renderMulti(data, type, full, function (data, type) {
						return jT.ui.renderRange(data.conditions[c], data.conditions[c + " unit"], type);
					}, { anno: 'effects ' + c});
				};
				return col;
			});

			// add also the "default" effects columns
			putDefaults(1, 3, "effects");

			// now is time to put interpretation columns..
			putAGroup(study.interpretation, function (i) {
				var col = {
					title: i,
					className: "center middle jtox-multi",
					data: "interpretation." + i,
					defaultContent: "-"
				};
				return jT.tables.modifyColDef(self, col, category, "interpretation");
			});

			// finally put the protocol entries
			putDefaults(4, 5, "protocol");

			// but before given it up - make a small sorting..
			jT.tables.sortColDefs(colDefs);

			// READYY! Go and prepare THE table.
			$(theTable).dataTable({
				"paging": true,
				"processing": true,
				"lengthChange": false,
				"autoWidth": false,
				"dom": self.settings.dom,
				"columns": colDefs,
				"infoCallback": function (oSettings, iStart, iEnd, iMax, iTotal, sPre) {
					var el = $('.title .counter', $(this).parents('.jtox-study'))[0];
					el.innerHTML = jT.ui.updateCounter(el.innerHTML, iTotal);
					return sPre;
				},
				"createdRow": function (nRow) {
					jT.tables.equalizeHeights.apply(window, $('td.jtox-multi table tbody', nRow).toArray());
				},

				"language": self.settings.language
			});

			$(theTable).DataTable().columns.adjust();
		} else
			$(theTable).DataTable().clear();

		return theTable;
	};

	StudyKit.prototype.processSummary = function (summary) {
		var self = this;
		var typeSummary = {};
		var knownNames = {
			"P-CHEM": "P-Chem",
			"ENV_FATE": "Env Fate",
			"ECOTOX": "Eco Tox",
			"TOX": "Tox"
		};

		// first - clear all existing tabs
		$('.jtox-study', self.rootElement).remove();

		// create the groups on the corresponding tabs, first sorting them alphabetically
		summary.sort(function (a, b) {
			var valA = (a.category.order || a.category.description || a.category.title),
				valB = (b.category.order || b.category.description || b.category.title);
			if (valA == null)
				return -1;
			if (valB == null)
				return 1;
			if (valA == valB)
				return 0;
			return (valA < valB) ? -1 : 1;
		});

		var added = 0, lastAdded = null;

		function addStudyTab(top, sum) {
			var tabInfo = jT.ui.addTab(self.tabs, 
				(knownNames[top] || sum.topcategory.title), 
				"jtox-" + top.toLowerCase() + '_' + self.instanceNo, 
				jT.ui.fillTemplate('one-category', self.substance));

			tabInfo.tab.data('type', top);
			tabInfo.content.addClass(top).data('jtox-uri', sum.topcategory.uri);

			added++;
			lastAdded = top;

			return tabInfo.content[0];
		};

		for (var si = 0, sl = summary.length; si < sl; ++si) {
			var sum = summary[si];
			var top = sum.topcategory.title;
			if (!top)
				continue;
			var top = top.replace(/ /g, "_");
			var tab = $('.jtox-study-tab.' + top, self.rootElement)[0];
			if (!tab)
				tab = addStudyTab(top, sum);

			var catname = sum.category.title;
			if (!catname)
				typeSummary[top] = sum.count;
			else
				self.createCategory(tab, catname);
		}

		// a small hack to force openning of this, later in the querySummary()
		if (added == 1)
			self.settings.tab = lastAdded;

		// update the number in the tabs...
		$('ul li a', self.rootElement).each(function (i) {
			var data = $(this).data('type');
			if (!!data) {
				var cnt = typeSummary[data];
				var el = $(this)[0];
				el.innerHTML = jT.ui.updateCounter(el.innerHTML, cnt);
			}
		});

		// now install the filter box handler. It delays the query a bit and then spaws is to all tables in the tab.
		var filterTimeout = null;
		var fFilter = function (ev) {
			if (!!filterTimeout)
				clearTimeout(filterTimeout);

			var field = ev.currentTarget,
				tab = $(this).parents('.jtox-study-tab')[0];

			filterTimeout = setTimeout(function () {
				var tabList = $('.jtox-study-table', tab);
				for (var t = 0, tlen = tabList.length; t < tlen; ++t) {
					$(tabList[t]).DataTable().search(field.value).draw();
				}
			}, 300);
		};

		var tabList = $('.jtox-study-tab');
		for (var t = 0, tlen = tabList.length; t < tlen; t++)
			$('.jtox-study-filter', tabList[t])[0].onkeydown = fFilter;
	};

	StudyKit.prototype.processStudies = function (tab, study, map) {
		var self = this,
			cats = {},
			cntCats = 0;

		// first swipe to map them to different categories...
		if (!map) {
			// add this one, if we're not remapping. map == false assumes that all passed studies will be from
			// one category.
			cats[study[0].protocol.category.code] = study;
		} else {
			for (var i = 0, slen = study.length; i < slen; ++i) {
				var ones = study[i];
				if (map) {
					if (cats[ones.protocol.category.code] === undefined) {
						cats[ones.protocol.category.code] = [ones];
						cntCats++;
					} else {
						cats[ones.protocol.category.code].push(ones);
					}
				}
			}
		}

		// now iterate within all categories (if many) and initialize the tables
		for (var c in cats) {
			var onec = cats[c],
				aStudy = $('.' + c + '.jtox-study', tab);

			if (aStudy.length < 1)
				continue;

			jT.ui.updateTree(aStudy, { title: onec[0].protocol.category.title + " (0)" });

			// now swipe through all studyies to build a "representative" one with all fields.
			var study = {};
			for (var i = 0, cl = onec.length; i < cl; ++i) {
				$.extend(true, study, onec[i]);
				if (!$.isEmptyObject(study.parameters) && !$.isEmptyObject(study.effects[0].conditions))
					break;
			}

			var theTable = self.ensureTable(tab, study),
				fixMultiRows = function () {
					$(theTable.tBodies[0]).children().each(function () {
						jT.tables.equalizeHeights.apply(window, $('td.jtox-multi table tbody', this).toArray());
					});
				};

			$(theTable).DataTable().rows.add(onec).draw();
			// $(theTable).colResizable({
			// 	minWidth: 30,
			// 	liveDrag: true,
			// 	onResize: fixMultiRows
			// });

			fixMultiRows();
			if (cntCats > 1)
				$(theTable).parents('.jtox-study').addClass('folded');

			// we need to fix columns height's because of multi-cells
			$('.jtox-multi', theTable[0]).each(function () {
				this.style.height = '' + this.offsetHeight + 'px';
			});
		}
	};

	StudyKit.prototype.querySummary = function (summaryURI) {
		var self = this;

		summaryURI = self.addParameters(summaryURI);
		jT.ambit.call(self, summaryURI, function (summary) {
			if (!!summary && !!summary.facet)
				self.processSummary(summary.facet);
			jT.fireCallback(self.settings.onSummary, self, summary.facet);
			// check if there is an initial tab passed so we switch to it
			if (!!self.settings.tab) {
				var div = $('.jtox-study-tab.' + decodeURIComponent(self.settings.tab).replace(/ /g, '_').toUpperCase(), self.root)[0];
				if (!!div) {
					for (var idx = 0, cl = div.parentNode.children.length; idx < cl; ++idx)
						if (div.parentNode.children[idx].id == div.id)
							break;
					--idx;
					$(self.tabs).tabs('option', 'active', idx);
					$(self.tabs).tabs('option', 'selected', idx);
				}
			}
		});
	};

	StudyKit.prototype.insertComposition = function (compositionURI) {
		var compRoot = $('.jtox-compo-tab', this.rootElement)[0];
		$(compRoot).empty();
		new jT.ui.Composition($.extend({}, this.settings, {
			'target': compRoot,
			'compositionUri': compositionURI
		}));
	};

	StudyKit.prototype.querySubstance = function (substanceURI) {
		var self = this;

		this.settings.baseUrl = jT.formBaseUrl(substanceURI);

		jT.ambit.call(self, substanceURI, function (substance) {
			if (!!substance && !!substance.substance && substance.substance.length > 0) {
				substance = substance.substance[0];

				substance["showname"] = substance.publicname || substance.name;
				substance["IUCFlags"] = jT.ambit.formatExtIdentifiers(substance.externalIdentifiers, 'display', substance);
				self.substance = substance;

				jT.ui.updateTree($('.jtox-substance', self.rootElement), substance);

				// go and query for the reference substance
				jT.ambit.call(self, substance.referenceSubstance.uri, function (dataset) {
					if (!!dataset && dataset.dataEntry.length > 0) {
						jT.ambit.processDataset(dataset, null, jT.ambit.getDatasetValue);
						jT.ui.updateTree($('.jtox-substance', self.rootElement), $.extend(substance, dataset.dataEntry[0]));
					}
				});

				jT.fireCallback(self.settings.onLoaded, self, substance.substance);
				
				// query for the summary and the composition too.
				self.querySummary(substance.URI + "/studysummary");
				self.insertComposition(substance.URI + "/composition");
			} else
				jT.fireCallback(self.settings.onLoaded, self, null);
		});
	};

	StudyKit.prototype.query = function (uri) {
		this.querySubstance(uri);
	};

	StudyKit.getFormatted = function (data, type, format) {
		var value = null;
		if (typeof format === 'function')
			value = format.call(this, data, type);
		else if (typeof format === 'string' || typeof format === 'number')
			value = data[format];
		else
			value = data[0];

		return value;
	};

	// all settings, specific for the kit, with their defaults. These got merged with general (jToxKit) ones.
	StudyKit.defaults = {
		tab: null,
		dom: "rt<Fip>",
		language: {
			processing: '<img src="/assets/img/waiting_small.gif" border="0">',
			loadingRecords: "No studies found.",
			zeroRecords: "No studies found.",
			emptyTable: "No studies available.",
			info: "Showing _TOTAL_ study(s) (_START_ to _END_)",
			lengthMenu: 'Display <select>' +
				'<option value="10">10</option>' +
				'<option value="20">20</option>' +
				'<option value="50">50</option>' +
				'<option value="100">100</option>' +
				'<option value="-1">all</option>' +
				'</select> studies.'
		},
		errorDefault: "Err",	// Default text shown when errQualifier is missing
		// events
		onSummary: null,		// invoked when the summary is loaded
		onComposition: null,	// invoked when the
		onStudy: null,			// invoked for each loaded study
		onLoaded: null,			// invoked when the substance general info is loaded
		configuration: {
			columns: {
				"_": {
					"main": {},
					"parameters": {},
					"conditions": {},
					"effects": {},
					"protocol": {},
					"interpretation": {},
				}
			}
		}
	};

	StudyKit.defaultColumns = [{
		"title": "Name",
		"className": "center middle",
		"width": "15%",
		"data": "protocol.endpoint"
	}, // The name (endpoint)
	{
		"title": "Endpoint",
		"className": "center middle jtox-multi",
		"width": "10%",
		"data": "effects",
		"render": function (data, type, full) {
			return jT.tables.renderMulti(data, type, full, function (data, type) {
				var endpointText = StudyKit.getFormatted(data, type, "endpoint");
				if (data.endpointtype != null)
					endpointText += " (" + data.endpointtype + ")";
				return endpointText
			}, { anno: "endpoint endpointtype"});
		}
	}, // Effects columns
	{
		"title": "Result",
		"className": "center middle jtox-multi",
		"width": "10%",
		"data": "effects",
		"render": function (data, type, full) {
			return jT.tables.renderMulti(data, type, full, function (data, type) {
				var resText = jT.ui.renderRange(data.result, null, type);
				if (data.result.errorValue != null)
					resText += " (" + data.result.errQualifier + " " + data.result.errorValue + ")";
				return resText
			}, { anno: "result result.errQualifier result.errValue"});
		}
	},
	{
		"title": "Text",
		"className": "center middle jtox-multi",
		"width": "10%",
		"data": "effects",
		"render": function (data, type, full) {
			return jT.tables.renderMulti(data, type, full, function (data) {
				return data.result.textValue || '-';
			}, { anno: "result result.textValue"});
		}
	},
	{
		"title": "Guideline",
		"className": "center middle",
		"width": "15%",
		"data": "protocol.guideline",
		"render": "[,]",
		"defaultContent": "-"
	}, // Protocol columns
	{
		"title": "Owner",
		"className": "center middle",
		"width": "10%",
		"data": "citation.owner",
		"defaultContent": "-"
	},
	{
		"title": "Citation",
		"className": "center middle",
		"width": "10%",
		"data": "citation",
		"render": function (data) {
			return (data.title || "") + ' ' + (!!data.year || "");
		}
	},
	{
		"title": "Reliability",
		"className": "center middle",
		"width": "10%",
		"data": "reliability",
		"render": function (data) {
			return data.r_value;
		}
	},
	{
		"title": "UUID",
		"className": "center middle",
		"width": "15%",
		"data": "uuid",
		"searchable": false,
		"render": function (data, type) {
			return type != "display" ? '' + data : jT.ui.shortenedData(data, "Press to copy the UUID in the clipboard");
		}
	}];

	StudyKit.instanceCount = 0;

	jT.ui.Study = StudyKit;
})(asSys, jQuery, jToxKit);
/* SubstanceKit.js - A kit for browsing substances. Migrated.
 *
 * Copyright 2012-2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan (Jonan) Georgiev
 **/

(function (a$, $, jT) {

	function SubstanceKit(settings) {
		this.rootElement = settings.target;
		$(this.rootElement).addClass('jtox-toolkit'); // to make sure it is there even when manually initialized

		this.settings = $.extend(true, {}, SubstanceKit.defaults, settings);

		this.pageStart = this.settings.pageStart;
		this.pageSize = this.settings.pageSize;

		if (!this.settings.noInterface) {
			var self = this;

			if (this.settings.embedComposition && this.settings.onDetails == null) {
				this.settings.onDetails = function (root, data) {
					new jT.ui.Composition(root, $.extend({},
						self.settings,
						(typeof self.settings.embedComposition == 'object' ? self.settings.embedComposition : {}), {
							compositionUri: data.URI + '/composition'
						}
					));
				};
			}

			jT.ui.putTemplate('all-substance', ' ? ', this.rootElement);
			this.init(settings);
		}

		// finally, if provided - make the query
		if (!!this.settings.substanceUri)
			this.querySubstance(self.settings.substanceUri)
	};

	SubstanceKit.prototype.init = function (settings) {
		var self = this;

		// deal if the selection is chosen
		var colId = self.settings.columns.substance['Id'];
		if (colId) {
			jT.tables.putActions(self, colId);
			colId.title = '';
		}

		// Leave that here, because `self` is used...
		self.settings.columns.substance['Owner'].render = function (data, type, full) {
			return (type != 'display') ? data : '<a target="_blank" href="' + self.settings.baseUrl + 'substanceowner/' + full.ownerUUID + '/substance">' + data + '</a>';
		};

		var opts = { "dom": "rti" };
		if (self.settings.showControls) {
			jT.tables.bindControls(self, {
				nextPage: function () { self.nextPage(); },
				prevPage: function () { self.prevPage(); },
				sizeChange: function () { self.queryEntries(self.pageStart, parseInt($(this).val())); },
				filter: function () { $(self.table).DataTable().filter($(this).val()).draw(); }
			});

			opts['infoCallback'] = function (oSettings, iStart, iEnd, iMax, iTotal, sPre) {
				var needle = $('.filterbox', self.rootElement).val();
				$('.filtered-text', self.rootElement).html(!needle ? ' ' : ' (filtered to <span class="high">' + iTotal + '</span>) ');
				return '';
			};
		} else
			$('.jtox-controls', self.rootElement).remove();

		// again , so that changed defaults can be taken into account.
		self.settings.configuration = $.extend(true, self.settings.configuration, settings.configuration);

		// READYY! Go and prepare THE table.
		self.table = jT.tables.putTable(self, $('table', self.rootElement)[0], 'substance', opts);
	};

	SubstanceKit.prototype.queryEntries = function (from, size) {
		if (from < 0) from = 0;
		if (!size || size < 0) size = this.pageSize;

		var qStart = Math.floor(from / size),
			qUri = jT.addParameter(self.substanceUri, "page=" + qStart + "&pagesize=" + size),
			self = this;

		jT.ambit.call(self, qUri, function (result, jhr) {
			if (!result && jhr.status != 200)
				result = {
					substabce: []
				}; // empty one
			if (!!result) {
				self.pageSize = size;
				self.pageStart = from;

				for (var i = 0, rl = result.substance.length; i < rl; ++i)
					result.substance[i].index = i + from + 1;

				self.substance = result.substance;

				if (result.substance.length < self.pageSize) // we've reached the end!!
					self.entriesCount = from + result.substance.length;

				// time to call the supplied function, if any.
				jT.fireCallback(self.settings.onLoaded, self, result);
				if (!self.settings.noInterface) {
					$(self.table).DataTable().clear();
					$(self.table).DataTable().add(result.substance).draw();

					self.updateControls(from, result.substance.length);
				}
			} else
				jT.fireCallback(self.settings.onLoaded, self, result);
		});
	};

	SubstanceKit.prototype.querySubstance = function (uri) {
		this.substanceUri = jT.ambit.grabPaging(this, uri);
		this.settings.baseUrl = jT.formBaseUrl(uri);
		this.queryEntries(this.pageStart);
	};

	SubstanceKit.prototype.query = function (uri) {
		this.querySubstance(uri);
	};

	// some "inheritance" :-)
	SubstanceKit.prototype.nextPage = jT.tables.nextPage;
	SubstanceKit.prototype.prevPage = jT.tables.prevPage;
	SubstanceKit.prototype.updateControls = jT.tables.updateControls;

	SubstanceKit.defaults = { // all settings, specific for the kit, with their defaults. These got merged with general (jToxKit) ones.
		showControls: true, // show navigation controls or not
		selectionHandler: null, // if given - this will be the name of the handler, which will be invoked by jToxQuery when the attached selection box has changed...
		embedComposition: null, // embed composition listing as details for each substance - it valid only if onDetails is not given.
		noInterface: false, // run in interface-less mode - only data retrieval and callback calling.
		onDetails: null, // called when a details row is about to be openned. If null - no details handler is attached at all.
		onLoaded: null, // called when the set of substances (for this page) is loaded.
		language: {
			loadingRecords: "No substances found.",
			zeroRecords: "No substances found.",
			emptyTable: "No substances available.",
			info: "Showing _TOTAL_ substance(s) (_START_ to _END_)"
		},

		pageStart: 0,
		pageSize: 10,
		/* substanceUri */
		columns: {
			substance: {
				'Id': {
					title: 'Id',
					data: 'URI',
					defaultContent: "-",
					width: "60px",
					render: function (data, type, full) {
						return (type != 'display') ? full.index : '&nbsp;-&nbsp;' + full.index + '&nbsp;-&nbsp;';
					}
				},
				'Substance Name': {
					title: "Substance Name",
					data: "name",
					render: function (data, type, full) {
						if (data == null || data == 'null') data = '-';
						return (type != 'display') ? data : jT.ui.linkedData('<a target="_blank" href="' + full.URI + '/study">' + data + '</a>', "Click to view study details", data)
					}
				},
				'Substance UUID': {
					title: "Substance UUID",
					data: "i5uuid",
					render: function (data, type, full) {
						if (data == null || data == 'null') return '';
						return (type != 'display') ? data : jT.ui.shortenedData('<a target="_blank" href="' + full.URI + '/study">' + data + '</a>', "Press to copy the UUID in the clipboard", data)
					}
				},
				'Substance Type': {
					title: "Substance Type",
					data: "substanceType",
					width: "15%",
					defaultContent: '-'
				},
				'Public name': {
					title: "Public name",
					data: "publicname",
					defaultContent: '-'
				},
				'Reference substance UUID': {
					title: "Reference substance UUID",
					data: "referenceSubstance",
					render: function (data, type, full) {
						if (data.i5uuid == null || data.i5uuid == 'null') return '';
						return (type != 'display') ? data.i5uuid : jT.ui.shortenedData('<a target="_blank" href="' + data.uri + '">' + data.i5uuid + '</a>', "Press to copy the UUID in the clipboard", data.i5uuid);
					}
				},
				'Owner': {
					title: "Owner",
					data: "ownerName",
					defaultContent: '-'
				},
				'Info': {
					title: "Info",
					data: "externalIdentifiers",
					render: function (data, type, full) {
						return jT.ambit.formatExtIdentifiers(data, type, full);
					}
				}
			}
		}
	}

	jT.ui.Substance = SubstanceKit;

})(asSys, jQuery, jToxKit);
jT.ui.templates['all-composition']  = 
"<div class=\"jtox-composition unloaded\">" +
"<table class=\"dataTable composition-info font-small display\">" +
"<thead>" +
"<tr><th>Composition name:</th><td class=\"camelCase\">{{ name }}</td></tr>" +
"<tr><th>Composition UUID:</th><td>{{ uuid }}</td></tr>" +
"<tr><th>Purity of IUC Substance:</th><td>{{ purity }}</td></tr>" +
"</thead>" +
"</table>" +
"<table class=\"composition-table display\"></table>" +
"</div>" +
""; // end of #jtox-composition 

jT.ui.templates['all-compound']  = 
"<div class=\"jtox-compound\">" +
"<div class=\"jtox-ds-features\"></div>" +
"<div class=\"jtox-controls\">" +
"Showing from <span class=\"jtox-live-data high\">{{ pagestart }}</span> to <span class=\"jtox-live-data high\">{{ pageend }}</span><span class=\"jtox-live-data\">{{ filtered-text }}</span>in pages of <select class=\"jtox-live-data\" value=\"{{ pagesize }}\">" +
"<option value=\"10\" selected=\"yes\">10</option>" +
"<option value=\"20\">20</option>" +
"<option value=\"30\">30</option>" +
"<option value=\"50\">50</option>" +
"<option value=\"100\">100</option>" +
"</select> entries" +
"<a class=\"paginate_disabled_previous prev-field\" tabindex=\"0\" role=\"button\">Previous</a><a class=\"paginate_enabled_next next-field\" tabindex=\"0\" role=\"button\">Next</a>" +
"<input type=\"text\" class=\"filterbox\" placeholder=\"Filter...\" />" +
"</div>" +
"<div class=\"jtox-ds-tables\">" +
"<div class=\"jt-processing\">" +
"<span class=\"message\">Loading compounds...</span>" +
"</div>" +
"<div class=\"jt-error\">" +
"<span class=\"message\"></span>" +
"</div>" +
"<div class=\"jtox-ds-fixed\">" +
"<table></table>" +
"</div><div class=\"jtox-ds-variable\">" +
"<table></table>" +
"</div>" +
"</div>" +
"</div>" +
""; // end of all-compound 

jT.ui.templates['compound-one-tab']  = 
"<div class=\"jtox-selection\">" +
"<a href=\"#\" class=\"multi-select select\">select all</a>&nbsp;<a href=\"#\" class=\"multi-select unselect\">unselect all</a>" +
"</div>" +
""; // end of #compound-one-tab 

jT.ui.templates['compound-one-feature']  = 
"<div class=\"jtox-ds-feature\"><input type=\"checkbox\" checked=\"yes\" class=\"jtox-checkbox\" /><span class=\"jtox-live-data jtox-title\">{{ title }}</span><sup class=\"helper\"><a target=\"_blank\" class=\"jtox-live-data attribute\" href=\"{{ uri }}\"><span class=\"ui-icon ui-icon-info\"></span></a></sup></div>" +
""; // end of #jtox-ds-feature 

jT.ui.templates['compound-download']  = 
"<div class=\"jtox-inline jtox-ds-download\">" +
"<a target=\"_blank\"><img class=\"borderless\"/></a>" +
"</div>" +
""; // end of #compound-download 

jT.ui.templates['compound-export']  = 
"<div id=\"{{ id }}\">" +
"<div class=\"jtox-inline\">Download dataset as: </div>" +
"<div class=\"jtox-inline jtox-exportlist\"></div>" +
"</div>" +
""; // end of #compound-export 

jT.ui.templates['faceted-search-kit']  = 
"<div class=\"query-container\">" +
"<!-- left -->" +
"<div id=\"query\" class=\"query-left\">" +
"<div id=\"accordion-resizer\" class=\"ui-widget-content\">" +
"<div id=\"accordion\"></div>" +
"</div>" +
"</div>" +
"" +
"<!-- right -->" +
"<div id=\"result-tabs\" class=\"query-right\">" +
"<ul>" +
"<li><a href=\"#hits_tab\">Hits list</a></li>" +
"<li><a href=\"#basket_tab\">Selection</a></li>" +
"<li><a href=\"#queries_tab\">Predefined Queries</a></li>" +
"<li class=\"jtox-ds-export\"><a href=\"#export_tab\">Export</a></li>" +
"</ul>" +
"<div id=\"hits_tab\">" +
"<div class=\"row remove-bottom\">" +
"<ul class=\"tags remove-bottom\" id=\"selection\"></ul>" +
"<footer>" +
"<div id=\"sliders-controls\">" +
"<a href=\"#\" class=\"jtox-fadable command close\">Close</a>" +
"</div>" +
"<div id=\"sliders\"></div>" +
"</footer>" +
"</div>" +
"<div id=\"navigation\">" +
"<ul id=\"pager\"></ul>" +
"<div id=\"pager-header\"></div>" +
"</div>" +
"<div class=\"docs_wrapper\">" +
"<section id=\"docs\" class=\"item-list\"></section>" +
"</div>" +
"</div>" +
"<div id=\"basket_tab\">" +
"<section id=\"basket-docs\" class=\"item-list\"></section>" +
"<div style=\"padding-top: 70px;\"></div>" +
"</div>" +
"<div id=\"queries_tab\">" +
"<section id=\"predefined-queries\" class=\"item-list\"></section>" +
"<div style=\"padding-top: 70px;\"></div>" +
"</div>" +
"<div id=\"export_tab\">" +
"<form target=\"_blank\" method=\"post\">" +
"<input type=\"hidden\" name=\"search\" />" +
"" +
"<h6>Select dataset to export</h6>" +
"<div id=\"export_dataset\">" +
"<input type=\"radio\" value=\"filtered\" name=\"export_dataset\" id=\"filtered_data\"" +
"checked=\"checked\" />" +
"<label for=\"filtered_data\">Filtered entries</label>" +
"<input type=\"radio\" value=\"selected\" name=\"export_dataset\" id=\"selected_data\" />" +
"<label for=\"selected_data\">Selected entries</label>" +
"</div>" +
"" +
"<h6>Select export/report type</h6>" +
"<select id=\"export_select\" name=\"export_select\"></select>" +
"" +
"<h6>Select output format</h6>" +
"<input type=\"hidden\" name=\"export_format\" id=\"export_format\" />" +
"<div class=\"data_formats\"></div>" +
"" +
"<br />" +
"<button id=\"export_go\" type=\"button\" name=\"export_go\" data-format=\"Download {{source}} as {{format}}\">?</button>" +
"" +
"<div class=\"ui-state-error ui-corner-all warning-message\" style=\"padding: 0 .7em;\">" +
"<p><span class=\"ui-icon ui-icon-alert\"" +
"style=\"float: left; margin-right: .3em;\"></span>" +
"<strong>Warning: </strong>" +
"Please, either add entries to the selection or some filters to the query.</p>" +
"</div>" +
"</form>" +
"</div>" +
"</div>" +
"" +
"<!-- query container -->" +
"</div>" +
""; // end of #faceted-search-kit 

jT.ui.templates['result-item']  = 
"<article id=\"{{item_id}}\" class=\"item\">" +
"<header>{{title}}</header>" +
"<a href=\"{{link}}\" title=\"{{link_title}}\" class=\"avatar\" target=\"{{link_target}}\"><img src=\"{{logo}}\" /></a>" +
"<div class=\"composition\">{{composition}}</div>" +
"{{summary}}" +
"<footer class=\"links\">" +
"{{footer}}" +
"<a href=\"#\" class=\"add jtox-fadable command\">Add to Selection</a>" +
"<a href=\"#\" class=\"remove jtox-fadable command\">Remove from Selection</a>" +
"<a href=\"#\" class=\"none jtox-fadable command\">Already added</a>" +
"</footer>" +
"</article>" +
""; // end of #result-item 

jT.ui.templates['summary-item']  = 
"<div class=\"one-summary\">" +
"<span class=\"topic\">{{topic}}:</span>" +
"<span class=\"value\">{{content}}</span>" +
"</div>" +
""; // end of #summary-item 

jT.ui.templates['tag-facet']  = 
"<ul class=\"tags tag-group folded\"></ul>" +
""; // end of #tag-facet 

jT.ui.templates['query-item']  = 
"<article id=\"{{id}}\" class=\"item\">" +
"<header>{{title}}</header>" +
"<div class=\"composition\">" +
"{{description}}" +
"<a href=\"#\" title=\"Apply the query\" style=\"width: 100%;\"><span style=\"float:right;margin:0;\">Apply</span></a>" +
"</div>" +
"</article>" +
""; // end of #query-item 

jT.ui.templates['tab-topcategory']  = 
"<h3 id=\"{{id}}_header\" class=\"nested-tab\">{{title}}</h3>" +
"<div id=\"{{id}}\" class=\"widget-content widget-root\">" +
"<div>" +
"<input type=\"text\" placeholder=\"Filter_\" class=\"widget-filter\" />" +
"<input type=\"button\" class=\"switcher\" value=\"OR\" />" +
"</div>" +
"<ul class=\"widget-content tags remove-bottom\" data-color=\"{{color}}\"></ul>" +
"</div>" +
""; // end of #tab-top-category 

jT.ui.templates['slider-one']  = 
"<input type=\"hidden\" />" +
""; // end of #slider-one 

jT.ui.templates['export-type']  = 
"<option value=\"{{index}}\">{{name}}</button>" +
""; // end of #export-type 

jT.ui.templates['export-format']  = 
"<div class=\"jtox-inline jtox-ds-download jtox-fadable\">" +
"<a target=\"_blank\" data-name=\"{{name}}\" data-mime=\"{{mime}}\" href=\"#\"><img class=\"borderless\" src=\"{{icon}}\" /></a>" +
"</div>" +
""; // end of #export-format 

jT.ui.templates['logger-main']  = 
"<div class=\"list-wrap\">" +
"<div class=\"list-root\"></div>" +
"</div>" +
"<div class=\"status\">" +
"<div class=\"icon jtox-fadable\"></div>" +
"</div>" +
""; // end of #jtox-logger 

jT.ui.templates['logger-line']  = 
"<div class=\"logline\">" +
"<div class=\"icon\"></div>" +
"<span class=\"content info-field\">{{header}}</span>" +
"<div class=\"details info-field\">{{details}}</div>" +
"</div>" +
""; // end of #jtox-logline 

jT.ui.templates['widget-search']  = 
"<div id=\"jtox-search\" class=\"jtox-search\">" +
"<form>" +
"<div class=\"jq-buttonset jtox-inline\">" +
"<input type=\"radio\" id=\"searchauto\" value=\"auto\" name=\"searchtype\" checked=\"checked\" data-placeholder=\"Enter CAS, EINECS, Chemical name, SMILES or InChI_\"/>" +
"<label for=\"searchauto\" title=\"Exact structure or search by an identifier. CAS, Chemical name, SMILES or InChI. The input type is guessed automatically.\">Exact structure</label>" +
"<input type=\"radio\" id=\"searchsimilarity\" value=\"similarity\" name=\"searchtype\" data-placeholder=\"Enter Chemical name, SMILES or InChI_\"/>" +
"<label for=\"searchsimilarity\" title=\"Enter SMILES or draw structure\">Similarity</label>" +
"<input type=\"radio\" id=\"searchsmarts\" value=\"smarts\" name=\"searchtype\" data-placeholder=\"Enter SMARTS_\"/>" +
"<label for=\"searchsmarts\" title=\"Enter or draw a SMARTS query\">Substructure</label>" +
"<input type=\"radio\" id=\"searchuri\" value=\"uri\" name=\"searchtype\" data-placeholder=\"Enter URL to be examined...\"/>" +
"<label for=\"searchuri\" title=\"Enter dataset URL\">URL</label>" +
"</div>" +
"<div class=\"float-right search-pane\">" +
"<div class=\"dynamic auto-hide searchauto hidden jtox-inline\">" +
"<div>" +
"<input type=\"checkbox\" name=\"regexp\" id=\"toxquery-regexp\" /><label for=\"toxquery-regexp\">Enable fragment search<sup class=\"helper\"><a target=\"_blank\" href=\"http://en.wikipedia.org/wiki/Regular_expression\"><span class=\"ui-icon ui-icon-info\"></span></a></sup></label>" +
"</div>" +
"</div>" +
"<div class=\"dynamic auto-hide searchsimilarity hidden jtox-inline\">" +
"<input type=\"checkbox\" name=\"similaritybysubstance\" value=\"true\" id=\"similaritybysubstance\" /><label for=\"similaritybysubstance\">Only hits with substance data</label>" +
"<select name='threshold' title ='Tanimoto similarity threshold'>" +
"<option value='0.9' selected=\"selected\">0.9</option>" +
"<option value='0.8' >0.8</option>" +
"<option value='0.7' >0.7</option>" +
"<option value='0.6' >0.6</option>" +
"<option value='0.5' >0.5</option>" +
"<option value='0.4' >0.4</option>" +
"<option value='0.3' >0.3</option>" +
"<option value='0.2' >0.2</option>" +
"<option value='0.1' >0.1</option>" +
"</select>" +
"</div>" +
"<div class=\"dynamic auto-hide searchsmarts hidden jtox-inline\">" +
"<input type=\"checkbox\" name=\"smartsbysubstance\" value=\"true\" id=\"smartsbysubstance\" /><label for=\"smartsbysubstance\">Only hits with substance data</label>" +
"<select name=\"smarts\" title =\"Predefined functional groups\"></select>" +
"</div>" +
"<div class=\"jtox-inline\">" +
"<input type=\"text\" name=\"searchbox\"/>" +
"<button name=\"searchbutton\" class=\"jtox-handler\" title=\"Search/refresh\" data-handler=\"query\"><span class=\"ui-icon ui-icon-search\"/></button>" +
"<button name=\"drawbutton\" class=\"dynamic\" title=\"Draw the (sub)structure\"><span class=\"ui-icon ui-icon-pencil\"/></button>" +
"</div>" +
"</div>" +
"<div id=\"searchcontext\" class=\"size-full\">" +
"<input type=\"text\" name=\"searchcontext\" placeholder=\"Restrict the search within given dataset_\"/>" +
"</div>" +
"</form>" +
"<div class=\"ketcher shrinken\"></div>" +
"</div>" +
""; // end of #jtox-ds-search 

jT.ui.templates['ketcher-buttons']  = 
"<button id=\"ketcher-usebutton\">Use <span class=\"ui-icon ui-icon-arrowthick-1-n\"></span></button>" +
"<button id=\"ketcher-drawbutton\">Draw <span class=\"ui-icon ui-icon-arrowthick-1-s\"></span></button>" +
""; // end of ketcher-buttons 

jT.ui.templates['all-studies']  = 
"<div>" +
"<ul>" +
"<li><a href=\"#jtox-substance\">IUC Substance</a></li>" +
"<li><a href=\"#jtox-compo-tab\">Composition</a></li>" +
"</ul>" +
"<div id=\"jtox-substance\" class=\"jtox-substance\">" +
"<table class=\"dataTable display\">" +
"<thead>" +
"<tr>" +
"<th class=\"right size-third\">IUC Substance name:</th>" +
"<td class=\"camelCase\">{{ name }}</td>" +
"</tr>" +
"<tr>" +
"<th class=\"right\">IUC Substance UUID:</th>" +
"<td>{{ i5uuid }}</td>" +
"</tr>" +
"<tr>" +
"<th class=\"right\">IUC Public name:</th>" +
"<td class=\"camelCase\">{{ publicname }}</td>" +
"</tr>" +
"<tr>" +
"<th class=\"right\">Legal entity:</th>" +
"<td>{{ ownerName }}</td>" +
"</tr>" +
"<tr>" +
"<th class=\"right\">Legal entity UUID:</th>" +
"<td>{{ ownerUUID }}</td>" +
"</tr>" +
"<tr>" +
"<th class=\"right\">Type substance composition:</th>" +
"<td>{{ substanceType }}</td>" +
"</tr>" +
"<tr class=\"borderless-bottom\">" +
"<th class=\"right\">IUC Substance Reference Identifier</th>" +
"<td></td>" +
"</tr>" +
"<tr class=\"borderless-top borderless-bottom\">" +
"<td class=\"right\">CAS:</td>" +
"<td>{{ compound.cas }}</td>" +
"</tr>" +
"<tr class=\"borderless-top borderless-bottom\">" +
"<td class=\"right\">EC:</td>" +
"<td>{{ compound.einecs }}</td>" +
"</tr>" +
"<tr class=\"borderless-top borderless-bottom\">" +
"<td class=\"right\">Chemical name:</td>" +
"<td>{{ compound.name }}</td>" +
"</tr>" +
"<tr class=\"borderless-top borderless-bottom\">" +
"<td class=\"right\">IUPAC name:</td>" +
"<td>{{ compound.iupac }}</td>" +
"</tr>" +
"<tr class=\"borderless-top borderless-bottom\">" +
"<td class=\"right\">UUID:</td>" +
"<td>{{ referenceSubstance.i5uuid }}</td>" +
"</tr>" +
"<tr class=\"borderless-top\">" +
"<td class=\"right\">IUC Flags:</td>" +
"<td>{{ IUCFlags }}</td>" +
"</tr>" +
"</thead>" +
"</table>" +
"</div>" +
"<div id=\"jtox-compo-tab\" class=\"jtox-compo-tab\"></div>" +
"</div>" +
""; // end of #jtox-studies 

jT.ui.templates['one-category']  = 
"<div class=\"jtox-study-tab unloaded\">" +
"<div class=\"float-right\">" +
"<button class=\"expand-all\">Expand all</button><button class=\"collapse-all\">Collapse all</button>" +
"</div>" +
"<p><input type=\"text\" class=\"jtox-study-filter ui-input\" placeholder=\"Filter...\" /></p>" +
"<h4 class=\"camelCase\">{{ showname }}</h4>" +
"</div>" +
""; // end of #jtox-category 

jT.ui.templates['one-study']  = 
"<div class=\"jtox-study jtox-foldable folded\">" +
"<div class=\"title\">" +
"<p class=\"counter\">{{ title }}</p>" +
"</div>" +
"<div class=\"content\">" +
"<table class=\"jtox-study-table content display\"></table>" +
"</div>" +
"</div>" +
""; // end of #jtox-study 

jT.ui.templates['all-substance']  = 
"<div class=\"jtox-substance\">" +
"<div class=\"jtox-controls\">" +
"Showing from <span class=\"high jtox-live-data\">{{ pagestart }}</span> to <span class=\"high jtox-live-data\">{{ pageend }}</span><span class=\"filtered-text\"> </span>in pages of <select value=\"{{ pagesize }}\">" +
"<option value=\"10\" selected=\"yes\">10</option>" +
"<option value=\"20\">20</option>" +
"<option value=\"50\">50</option>" +
"<option value=\"100\">100</option>" +
"<option value=\"200\">200</option>" +
"<option value=\"500\">500</option>" +
"</select> substances" +
"<a class=\"paginate_disabled_previous prev-field\" tabindex=\"0\" role=\"button\">Previous</a><a class=\"paginate_enabled_next next-field\" tabindex=\"0\" role=\"button\">Next</a>" +
"<input type=\"text\" class=\"filterbox\" placeholder=\"Filter...\" />" +
"</div>" +
"<div>" +
"<table class=\"display\"></table>" +
"</div>" +
"</div>" +
""; // end of #jtox-substance 

