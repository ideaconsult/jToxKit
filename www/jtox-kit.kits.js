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
						var panel = jT.ui.bakeTemplate(jT.ui.templates['all-composition'], substances[i])[0];
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
	};

	jT.ui.Composition = CompositionKit;

})(asSys, jQuery, jToxKit);
(function (Solr, a$, $, jT) {

CurrentSearchWidgeting = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  
  this.target = settings.target;
  this.id = settings.id;
  
  this.manager = null;
  this.facetWidgets = {};
  this.fqName = this.useJson ? "json.filter" : "fq";
};

CurrentSearchWidgeting.prototype = {
  useJson: false,
  renderItem: null,
  
  init: function (manager) {
    a$.pass(this, CurrentSearchWidgeting, "init", manager);
        
    this.manager = manager;
  },
  
  registerWidget: function (widget, pivot) {
    this.facetWidgets[widget.id] = pivot;
  },
  
  afterTranslation: function (data) {
    var self = this,
        links = [],
        q = this.manager.getParameter('q'),
        fq = this.manager.getAllValues(this.fqName);
        
    // add the free text search as a tag
    if (!!q.value && !q.value.match(/^(\*:)?\*$/)) {
        links.push(self.renderItem({ title: q.value, count: "x", onMain: function () {
          q.value = "";
          self.manager.doRequest();
          return false;
        } }).addClass("tag_fixed"));
    }

    // now scan all the filter parameters for set values
    for (var i = 0, l = fq != null ? fq.length : 0; i < l; i++) {
	    var f = fq[i],
          vals = null,
          w;
	    
      for (var wid in self.facetWidgets) {
  	    w = self.manager.getListener(wid);
        vals = w.fqParse(f);
  	    if (!!vals)
  	      break;
  	  }
  	  
  	  if (vals == null) continue;
  	    
  	  if (!Array.isArray(vals))
  	    vals = [ vals ];
  	        
      for (var j = 0, fvl = vals.length; j < fvl; ++j) {
        var v = vals[j], el, 
            info = (typeof w.prepareTag === "function") ? 
              w.prepareTag(v) : 
              {  title: v,  count: "x",  color: w.color, onMain: w.unclickHandler(v) };
        
    		links.push(el = self.renderItem(info).addClass("tag_selected " + (!!info.onAux ? "tag_open" : "tag_fixed")));

    		if (fvl > 1)
    		  el.addClass("tag_combined");
      }
      
      if (fvl > 1)
		    el.addClass("tag_last");
    }
    
    if (links.length) {
      links.push(self.renderItem({ title: "Clear", onMain: function () {
        q.value = "";
        for (var wid in self.facetWidgets)
    	    self.manager.getListener(wid).clearValues();
    	    
        self.manager.doRequest();
        return false;
      }}).addClass('tag_selected tag_clear tag_fixed'));
      
      this.target.empty().addClass('tags').append(links);
    }
    else
      this.target.removeClass('tags').html('<li>No filters selected!</li>');
  }

};

jT.CurrentSearchWidget = a$(CurrentSearchWidgeting);

})(Solr, asSys, jQuery, jToxKit);
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

            Manager.addListeners(new jT.ResultWidget($.extend(true, {}, this, {
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
            })));

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
            this.basket = Basket = new(a$(jT.ListWidget, jT.ItemListWidget))($.extend(true, {}, this, {
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
            }));

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
                            error = error.message || "Wrong request!";
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
                formAmbitUrl = function (ids) { 
                    form.search.value = ids.join(" ");
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
                    formAmbitUrl(selectedIds);
                else $.ajax(Exporter.prepareExport([{ name: "wt", value: "json" }, { name: "fl", value: "s_uuid_hs" }], selectedIds).getAjax(self.serverUrl, {
                    async: false,
                    dataType: "json",
                    success: function (data) {
                        var ids = [];
                        $.each(data.response.docs, function (index, value) {
                            ids.push(value.s_uuid_hs);
                        });

                        formAmbitUrl(ids);
                        doneFn();
                    },
                    error: function (jhr, status, errText) { doneFn(errText); }
                }));
            } else { // We're strictly in Solr mode - prepare the filters and add the selecteds (if they exists)
                var ajaxOpts = Exporter.prepareExport(
                        exFormat == "tsv"
                            ? [{ name: "wt", value: "json" }, { name: "json2tsv", value: true }]
                            : [{ name: 'wt', value: exFormat === 'xlsx' ? 'json' : exFormat }],
                        selectedIds,
                        false
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

		// HACK: No meaningful way to communicate anything from the instance to render functions!
		if (this.settings.errorDefault)
			StudyKit.defaults.errorDefault = this.settings.errorDefault;

		// get the main template, add it (so that jQuery traversal works) and THEN change the ids.
		// There should be no overlap, because already-added instances will have their IDs changed already...
		var tree$ = $(this.rootElement).append(jT.ui.bakeTemplate(jT.ui.templates['all-studies'], ' ? ')),
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
			var aStudy = jT.ui.bakeTemplate(jT.ui.templates['one-study'], {})
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
					resText += " (" + (data.result.errQualifier || StudyKit.defaults.errorDefault) + " " + data.result.errorValue + ")";
				return resText;
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

			$(this.rootElement).append(jT.ui.bakeTemplate(jT.ui.templates['all-substance'], ' ? '));
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

		var opts = {
			"sDom": "rti"
		};
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
"Showing from <span class=\"high jtox-live-data\">{{ pagestart }}</span> to <span class=\"high\">{{ pageend }}</span><span class=\"filtered-text\"> </span>in pages of <select value=\"{{ pagesize }}\">" +
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

