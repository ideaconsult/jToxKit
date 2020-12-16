/* StudyKit.js - Study-related functions from jToxKit. Migrated.
 *
 * Copyright 2012-2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan (Jonan) Georgiev
 **/

(function (a$, $, jT) {
	var instanceCount = 0;

	// constructor
	var StudyKit = function (settings) {
		this.rootElement = settings.target;
		this.instanceNo = instanceCount++;
		$(this.rootElement).addClass('jtox-toolkit'); // to make sure it is there even in manual initialization.

		this.settings = $.extend(true, {}, StudyKit.defaults, settings); // i.e. defaults from jToxStudy
		this.settings.tab = this.settings.tab || jT.ui.fullUrl.hash;

		// HACK: No meaningful way to communicate anything from the instance to render functions!
		if (this.settings.errorDefault)
			StudyKit.defaults.errorDefault = this.settings.errorDefault;

		// get the main template, add it (so that jQuery traversal works) and THEN change the ids.
		// There should be no overlap, because already-added instances will have their IDs changed already...
		var tree$ = jT.ui.putTemplate('all-studies', { instanceNo: this.instanceNo }, this.rootElement),
			self = this;

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
					return type !== 'display'
						 ? _.map(data, ['conditions', c]).join(',')
						 :jT.tables.renderMulti(data, full, function (data, full) {
							return jT.ui.renderRange(data.conditions[c], data.conditions[c + " unit"], type);
						});
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
					"jtox-" + top.toLowerCase() + '-' + self.instanceNo, 
					jT.ui.getTemplate('one-category', self.substance)
				);

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
				substance["IUCFlags"] = jT.ambit.formatters.extIdentifiers(substance.externalIdentifiers);
				self.substance = substance;

				jT.ui.updateTree($('.jtox-substance', self.rootElement), substance, jT.ambit.formatters);

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

	StudyKit.prototype.getContext = function () {
		return {
			subject: 'study',
			substanceUri: this.substance.URI,
			substanceId: this.substance.i5uuid,
			owner: this.substance.ownerName
		}
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
		columns: {
			study: {
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
			return jT.tables.renderMulti(data, full, function (data) {
				return StudyKit.getFormatted(data, type, "endpoint") + 
					(data.endpointtype && " (" + data.endpointtype + ")" || '');
			});
		}
	}, // Effects columns
	{
		"title": "Result",
		"className": "center middle jtox-multi",
		"width": "10%",
		"data": "effects",
		"render": function (data, type, full) {
			return jT.tables.renderMulti(data, full, function (data) {
				return jT.ui.renderRange(data.result, null, type) + 
					(data.result.errorValue && " (" + data.result.errQualifier + " " + data.result.errorValue + ")" || '');
			});
		}
	},
	{
		"title": "Text",
		"className": "center middle jtox-multi",
		"width": "10%",
		"data": "effects",
		"render": function (data, type, full) {
			return jT.tables.renderMulti(data, full, function (data) {
				return data.result.textValue || '-';
			});
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

	jT.ui.Study = StudyKit;
})(asSys, jQuery, jToxKit);