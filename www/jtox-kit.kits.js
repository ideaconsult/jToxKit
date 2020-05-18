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
                var state = jT.ui.modifyURL(window.location.href, "ui", encodeURIComponent(JSON.stringify(uiConfiguration)));

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

        var uiConf = jT.ui.parseURL(window.location.href).params['ui'];
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
                        if (!!(s = jT.ui.modifyURL(window.location.href, "basket", s)))
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
                        expansionTemplate: "#tab-topcategory",
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
                expansionTemplate: "#tab-topcategory",
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
                    if (!!(s = jT.ui.modifyURL(window.location.href, "basket", s)))
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
                    me$.button("option", "label", jT.ui.formatString(me$.data('format'), { source: sourceText, format: formatText }));
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
                el$ = jT.ui.fillTemplate("#query-item", query);
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
                mime = form.export_format.value,
                exFormat = this.exportFormats[$('.data_formats .selected').data('index')],
                exType = this.exportTypes[parseInt(form.export_select.value)],
                exDef = $.extend(true, {}, exType.definition),
                server = exType.server || exFormat.server,
                selectedIds = this.getSelectedIds(form),
                formAmbitUrl = function () { 
                    form.search.value = selectedIds.join(" ");
                    form.action = self['ambitUrl'] + 'query/substance/study/uuid?media=' + encodeURIComponent(form.export_format.value);
                };

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
                        exFormat.name == "tsv"
                            ? [{ name: "wt", value: "json" }, { name: "json2tsv", value: true }]
                            : [{ name: 'wt', value: exFormat.name === 'xlsx' ? 'json' : exFormat.name }],
                        selectedIds
                        ).getAjax(this.solrUrl),
                    downloadFn = function (blob) {
                        if (!(blob instanceof Blob))
                            blob = new Blob([blob]);

                        jT.ui.activateDownload(
                            null, 
                            blob, 
                            "Report-" + (new Date().toISOString().replace(":", "_")) + "." + exFormat.name, 
                            true);
                        doneFn();
                    };

                // Not a template thing.
                if (!exDef.template || exFormat.name !== 'xlsx') {
                    ajaxOpts.dataType = 'application/json';
                    ajaxOpts.settings = { responseType: "arraybuffer" }
                    jT.ui.promiseXHR(ajaxOpts).then(downloadFn).catch(doneFn);
                }
                else { // We're in templating mode!
                    Promise.all([
                        $.ajax(ajaxOpts),
                        jT.ui.promiseXHR({
                            url: exDef.template,
                            settings: { responseType: "arraybuffer" }
                        })
                    ]).then(function (results) {
                        var queryData = results[0],
                            wbData = results[1];                        

                        if (typeof exDef.onData === 'function')
                            exDef.onData(queryData);

                        XlsxPopulate.fromDataAsync(wbData).then(function (workbook) {
                            if (!exDef.callbacksMap.lookup)
                                exDef.callbacksMap.lookup = function (val) { return mainLookupMap[val] || val; } 
                            
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
                var el = jT.ui.fillTemplate("#export-format", this.exportFormats[i]);
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
                exportEl.append(jT.ui.fillTemplate("#export-type", $.extend({ index: i }, this.exportTypes[i])));
            
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
      var dest = typeof this.mountDestination === 'object' ? this.mountDestination : a$.path(window, this.mountDestination),
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
          el$ = jT.ui.fillTemplate("#jtox-logline", data);

      el$.height('0px');
      this.listRoot.insertBefore(el$[0], this.listRoot.firstElementChild);

      setTimeout(function () { el$.height(self.lineHeight); }, 150);
      if (!!self.hasDetails) {
        $('.icon', el$[0]).on('click', function (e) {
          el$.toggleClass('openned');
          if (el$.hasClass("openned")) {
            var height = 0;
            $('.data-field', el$[0]).each(function () {
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
      params.service = this.formatUrl(jT.ui.parseURL(params.url));
      
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
          params.service = this.formatUrl(jT.ui.parseURL(params.url));

        line$ = this.addLine(this.formatEvent(params, jhr));
      } else {
        delete this.events[params.logId];
        jT.ui.fillTree(line$[0], this.formatEvent(null, jhr));
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
      vals += " " + jT.ui.formatUnits(stats.val)
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
				    cont$ = jT.ui.fillTemplate($("#tag-facet"), faceter).attr("id", fid);
            
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
            el$ = jT.ui.fillTemplate("#slider-one"),
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
              units: ref.id == "unit" ? jT.ui.formatUnits(ref.val) : "",
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
	settings.baseUrl = jT.ui.fixBaseUrl(settings.baseUrl) + "/";
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
  imagesRoot: "images/",
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
      return { 'topic': "Study Providers", 'content': val.map(function (ref) { return jT.ui.formatString(htmlLink, { 
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
          return jT.ui.formatString(
            link.match(/^https?:\/\//) ? htmlLink : plainLink,
            { href: link, hint: "External reference", target: "ref", value: ref }
          );
        })
      }
    }
  },
  renderLinks: function (doc) {
    var baseUrl = this.getBaseUrl(doc),
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
    var summaryhtml = $("#summary-item").html(),
        summarylist = this.buildSummary(doc),
        summaryRender = function (summarylist) { 
          return summarylist.map(function (s) { return jT.ui.formatString(summaryhtml, s)}).join("");
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

    return jT.ui.fillTemplate("#result-item", $.extend(item, this.renderLinks(doc)));
  },
  
  getBaseUrl: function(doc){
    if(this.tagDbs[doc.dbtag_hss] !== undefined){
      var url = this.tagDbs[doc.dbtag_hss].server,
          lastChar = url.substr(-1);
      return url + (lastChar != "/" ? "/substance/" : "substance/")
    } else {
      return this.baseUrl;
    }
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
            se.push(jT.ui.formatString(htmlLink, { 
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
jToxKit.ui.templates['faceted-search-kit']  = 
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

jToxKit.ui.templates['faceted-search-templates']  = 
"" +
"<section id=\"result-item\">" +
"<article id=\"{{item_id}}\" class=\"item\">" +
"<header>{{title}}</header>" +
"<a href=\"{{link}}\" title=\"{{link_title}}\" class=\"avatar\" target=\"{{link_target}}\"><img jt-src=\"{{logo}}\" /></a>" +
"<div class=\"composition\">{{composition}}</div>" +
"{{summary}}" +
"<footer class=\"links\">" +
"{{footer}}" +
"<a href=\"#\" class=\"add jtox-fadable command\">Add to Selection</a>" +
"<a href=\"#\" class=\"remove jtox-fadable command\">Remove from Selection</a>" +
"<a href=\"#\" class=\"none jtox-fadable command\">Already added</a>" +
"</footer>" +
"</article>" +
"</section>" +
"" +
"<div id=\"summary-item\">" +
"<div class=\"one-summary\">" +
"<span class=\"topic\">{{topic}}:</span>" +
"<span class=\"value\">{{content}}</span>" +
"</div>" +
"</div>" +
"" +
"<div id=\"tag-facet\">" +
"<ul class=\"tags tag-group folded\"></ul>" +
"</div>" +
"" +
"<section id=\"query-item\">" +
"<article id=\"{{id}}\" class=\"item\">" +
"<header>{{title}}</header>" +
"<div class=\"composition\">" +
"{{description}}" +
"<a href=\"#\" title=\"Apply the query\" style=\"width: 100%;\"><span style=\"float:right;margin:0;\">Apply</span></a>" +
"</div>" +
"</article>" +
"</section>" +
"" +
"<div id=\"tab-topcategory\">" +
"<h3 id=\"{{id}}_header\" class=\"nested-tab\">{{title}}</h3>" +
"<div id=\"{{id}}\" class=\"widget-content widget-root\">" +
"<div>" +
"<input type=\"text\" placeholder=\"Filter_\" class=\"widget-filter\" />" +
"<input type=\"button\" class=\"switcher\" value=\"OR\" />" +
"</div>" +
"<ul class=\"widget-content tags remove-bottom\" data-color=\"{{color}}\"></ul>" +
"</div>" +
"</div>" +
"" +
"<div id=\"slider-one\">" +
"<input type=\"hidden\" />" +
"</div>" +
"" +
"<div id=\"export-type\">" +
"<option value=\"{{index}}\">{{name}}</button>" +
"</div>" +
"" +
"<div id=\"export-format\">" +
"<div class=\"jtox-inline jtox-ds-download jtox-fadable\">" +
"<a target=\"_blank\" data-name=\"{{name}}\" data-mime=\"{{mime}}\" href=\"#\"><img class=\"borderless\"" +
"jt-src=\"{{icon}}\" /></a>" +
"</div>" +
"</div>" +
""; // end of #faceted-search-templates 

jT.ui.templates['logger-main']  = 
"<div class=\"list-wrap\">" +
"<div class=\"list-root\"></div>" +
"</div>" +
"<div class=\"status\"><div class=\"icon jtox-fadable\"></div></div>" +
""; // end of #jtox-logger 

jT.ui.templates['logger-line']  = 
"<div id=\"jtox-logline\">" +
"<div class=\"logline\">" +
"<div class=\"icon\"></div>" +
"<span class=\"content data-field\" data-field=\"header\">{{header}}</span>" +
"<div class=\"details data-field\" data-field=\"details\">{{details}}</div>" +
"</div>" +
"</div>" +
""; // end of #jtox-logline 

