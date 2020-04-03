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
		var colId = self.settings.configuration.columns.composition.Name;
		if (!!self.settings.selectionHandler) {
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
					return !val ? '' : '<a href="' + self.settings.baseUrl + '/substance?type=related&compound_uri=' + encodeURIComponent(val) + '" target="_blank">Also contained in...</a>';
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
		self.compositionUri = uri;

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
						var panel = $(jT.ui.templates['all-composition'])[0];
						$(self.rootElement).append(panel);

						if (self.settings.showBanner)
							jT.ui.fillTree($('.composition-info', panel)[0], substances[i]);
						else // we need to remove it
							$('.composition-info', panel).remove();
						// we need to prepare tables, abyways.
						self.prepareTable(substances[i].composition, panel);
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
		configuration: {
			columns: {
				composition: {
					'Type': {
						"title": "Type",
						"class": "left",
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
						"class": "camelCase left",
						"width": "15%",
						"data": "component.compound.name",
						"render": function (val, type, full) {
							return (type != 'display') ? '' + val :
								'<a href="' + full.component.compound.URI + '" target="_blank" title="Click to view the compound"><span class="ui-icon ui-icon-link" style="float: left; margin-right: .3em;"></span></a>' + val;
						}
					},
					'EC No.': {
						"title": "EC No.",
						"class": "left",
						"width": "10%",
						"data": "component.compound.einecs"
					},
					'CAS No.': {
						"title": "CAS No.",
						"class": "left",
						"width": "10%",
						"data": "component.compound.cas"
					},
					'Typical concentration': {
						"title": "Typical concentration",
						"class": "center",
						"width": "15%",
						"data": "proportion.typical",
						"render": function (val, type, full) {
							return type != 'display' ? '' + val.value : jT.valueAndUnits(val.value, val.unit || '%&nbsp;(w/w)', val.precision);
						}
					},
					'Concentration ranges': {
						"title": "Concentration ranges",
						"class": "center colspan-2",
						"width": "20%",
						"data": "proportion.real",
						"render": function (val, type, full) {
							return type != 'display' ? '' + val.lowerValue : jT.valueAndUnits(val.value, val.unit || '%&nbsp;(w/w)', val.precision);
						}
					},
					'Upper range': {
						"title": 'Upper range',
						"class": "center",
						"width": "20%",
						"data": "proportion.real",
						"render": function (val, type, full) {
							return type != 'display' ? '' + val.upperValue : jT.valueAndUnits(val.value, val.unit || '%&nbsp;(w/w)', val.precision);
						}
					},
					'Also': {
						"title": "Also",
						"class": "center",
						"sortable": false,
						"data": "component.compound.URI",
						"defaultContent": "-"
					}
				}
			}
		}
	};

	jT.ui.Composition = CompositionKit;

})(asSys, jQuery, jToxKit);