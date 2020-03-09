/** jToxKit - chem-informatics multi-tool-kit.
 * The combined, begamoth kit providing full faceted search capabilites.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2017-2020, IDEAConsult Ltd. All rights reserved.
 */

(function (Solr, a$, $, jT) {

	var mainLookupMap = {},
        uiConfiguration = {},
        defaultSettings = {
            servlet: "select",
            multipleSelection: true,
            keepAllFacets: true,
            connector: $.ajax,
            loggerEl: null,
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
                { name: "facet", value: "false" },
                { name: "echoParams", value: "none" },
                { name: 'rows', value: 999999 } //2147483647
            ],
            savedQueries: [],
            listingFields: [],
            summaryReports: [],
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
			jT.Tagger.prototype.init.call(this, manager);
            manager.getListener("current").registerWidget(this);
        },

        tagsUpdated = function (total) {
            var hdr = this.getHeaderText();
			hdr.textContent = jT.updateCounter(hdr.textContent, total);
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

	jT.kit.FacetedSearch = function (settings) {
        this.id = null;
		_.merge(this, defaultSettings, settings);
        this.serverUrl = this.solrUrl;

        if (typeof this.lookupMap === "string")
            this.lookupMap = window[this.lookupMap];

        if (this.lookupMap == null)
            this.lookupMap = {};
        mainLookupMap = this.lookupMap;

		$(settings.target).html(jT.templates['faceted-search-kit']);
        delete this.target;

		var uiConf = jT.parseURL(window.location.href).params['ui'];
        if (uiConf != null)
            uiConfiguration = JSON.parse(decodeURIComponent(uiConf));

        this.initDom();
        this.initComm();
        this.initExport();
        this.initQueries();
    };

	jT.kit.FacetedSearch.prototype = _.extend(jT.kit.FacetedSearch.prototype, {
        initDom: function () {
            // Now instantiate and things around it.
            this.accordion = $("#accordion");
            this.accordion.accordion({
                heightStyle: "content",
                collapsible: true,
                animate: 200,
                active: false,
                activate: function (e, ui) {
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
				PivotWidget = a$(Solr.Eventing, jT.Spying, Solr.Pivoting, jT.Pivoter, jT.Ranger),
				TagWidget = a$(Solr.Eventing, Solr.Faceting, jT.AccordionExpander, jT.Tagger, jT.Switcher);

			this.manager = Manager = new(a$(jT.Communicating, Solr.Configuring, Solr.QueryingJson, Solr.NestedAdapter))(this);

			Manager.addListeners(new jT.widget.SolrResult($.extend(true, {
                id: 'result',
                target: $('#docs'),
                itemId: "s_uuid",
                nestLevel: "composition",
				onClick: function (e, doc, exp, widget) {
                    if (Basket.findItem(doc.s_uuid) < 0) {
                        Basket.addItem(doc);
                        var s = "",
                            jel = $('a[href="#basket_tab"]');

						jel.html(jT.updateCounter(jel.html(), Basket.length));

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

			Manager.addListeners(new(jT.widget.SolrPaging)({
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
                        onUpdated: tagsUpdated,
                        nesting: "type_s:substance",
                        domain: {
                            type: "parent",
                            "which": "type_s:substance"
                        },
                        classes: f.color
                    }, f))

				w.init = tagInit;

				w.afterResponse = function (data) {
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
			Manager.addListeners(new jT.SolrQueryReporter({
                id: 'current',
                target: $('#selection'),
                renderItem: tagRender,
                useJson: true
            }));

            // Now add the basket.
			this.basket = Basket = new(a$(jT.Populating, jT.SolrItemLister))($.extend(true, {
                id: 'basket',
                target: $('#basket-docs'),
                summaryRenderers: this.summaryRenderers,
                itemId: "s_uuid",
                onClick: function (e, doc) {
                    if (Basket.eraseItem(doc.s_uuid) === false) {
						console && console.log("Trying to remove from basket an inexistent entry: " + JSON.stringify(doc));
                        return;
                    }

                    $(this).remove();
                    var s = "",
                        jel = $('a[href="#basket_tab"]'),
                        resItem = $("#result_" + doc.s_uuid);

					jel.html(jT.updateCounter(jel.html(), Basket.length));
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
				_.each(vals, function (v) {
                    w.addValue(v)
                });
            }

            if (this.loggerEl)
			    Manager.addListeners(jT.initKit($(this.loggerEl)));

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

            this.queries = new(a$(jT.Populating, jT.ItemRendering))({
                id: 'queries',
                target: $('#predefined-queries')
            });
            
            this.queries.renderItem = function (query) {
                el$ = jT.fillTemplate("#query-item", query);
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

            // Prepare the reports
            var report$ = $("#report_select");
            $.each(self.summaryReports, function (idx, def) {
                report$.append('<option id="' + def.id + '"' + (idx == 0 ? ' selected="true"' : '') + '>' + def.name + '</option>');
            });

            $("#export_dataset").buttonset();
            $("#export_type").buttonset();
            $("#export_dataset input").on("change", function (e) {
                self.updateButtons(this.form);
            });
            $("#export_tab button").button({
                disabled: true
            });
            $("#report_go").on("click", function (e) {
                var butEl = $(this),
                    oldText = butEl.button("option", "label");

                butEl.button("option", "label", "Generating the report...");

                self.buildSummaryReport(function (blob, error) {
                    butEl.button("option", "label", blob ? oldText : error || oldText);
                    if (blob)
                        jT.activateDownload(null, blob, "Report-" + (new Date().toISOString().replace(":", "_"))+ ".xlsx", true);
                });
            });

            $("#export_tab form").on("submit", function (e) {
                var form = this,
                    mime = form.export_format.value,
                    mime = mime.substr(mime.indexOf("/") + 1),
                    exFormat = self.exportFormats[$('.data_formats .selected').data('index')],
                    exType = self.exportTypes[$(form).find('input[name=export_type]:checked').data('index')],
                    server = exType.server || exFormat.server,
                    selectedIds = self.getSelectedIds(form),
                    formAmbitUrl = function () { 
                        form.search.value = selectedIds.join(" ");
                        form.action = self['ambitUrl'] + 'query/substance/study/uuid?media=' + encodeURIComponent(form.export_format.value);
                    },
                    Exporter = new (a$(jT.Communicating, jT.Exporting, Solr.Configuring, Solr.QueryingURL))({
                        exportDefinition: exType,
                        useJson: false,
                        expectJson: true,
                        serverUrl: server == 'ambitUrl' ? self.serverUrl : self[server]
                    });

                Exporter.init(self.manager);

                // Now we have all the filtering parameters in the `params`.
                if (server == 'ambitUrl') {
                    // If we already have the selected Ids - we don't even need to bother calling Solr.
                    if (!!selectedIds)
                        formAmbitUrl();
                    else self.connector(Exporter.prepareExport([{ name: "wt", value: "json" }, { name: "fl", value: "s_uuid_hs" }], selectedIds).getAjax({
                        async: false,
                        dataType: "json",
                        success: function (data) {
                            var ids = [];
                            _.each(data.response.docs, function (index, value) {
                                ids.push(value.s_uuid_hs);
                            });

                            formAmbitUrl();
                        }
                    }));
                } else {
                    // We're strictly in Solr mode - prepare the filters and add the selecteds (if they exists)
                    form.action = Exporter.prepareExport(self.exportSolrDefaults.concat(
                        mime == "tsv"
                            ? [ { name: "wt", value: "json" }, { name: "json2tsv", value: true } ]
                            : [ { name: 'wt', value: mime } ]
                    ), selectedIds).getAjax().url;
                }

                return true;
            });

            $("#result-tabs").tabs({
                activate: function (e, ui) {
                    if (ui.newPanel[0].id == 'export_tab') {
                        var qPar = self.manager.getParameter("q").value,
                            hasFilter = (qPar && qPar.length) > 0 || self.manager.getParameter("json.filter").length > 0,
                            hasBasket = !!self.basket.length,
                            hasDataset = hasFilter || hasBasket;

                        $("#export_dataset").buttonset(hasDataset ? "enable" : "disable");
                        $("#export_type").buttonset(hasDataset ? "enable" : "disable");
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

        getSelectedIds: function (form) {
            var selectedIds = null;

            if (!form)
                form = $("#export_tab form")[0];

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
				var el = jT.fillTemplate("#export-format", this.exportFormats[i]);
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
            var exportEl = $("#export_tab div#export_type"),
                self = this,
                updateTypes = function (idx) {
                    $('.data_formats a').addClass('disabled');

                    self.exportTypes[idx].formats.split(",").forEach(function (item) {
                        $('.data_formats a[data-name=' + item + ']').removeClass('disabled')
                    });

                    $('.data_formats a:visible').not('.disabled').first().trigger('click');
                };

            for (var i = 0, elen = this.exportTypes.length; i < elen; ++i) {
                this.exportTypes[i].selected = (i == 0) ? 'checked="checked"' : '';
				var el = jT.fillTemplate("#export-type", this.exportTypes[i]);
                el.data("index", i);
                exportEl.append(el);
            }
            
            $("input[name=export_type]").on("change", function (e) {  
                updateTypes($(this).data("index")); 
                return false; 
            });

            updateTypes(0);
        },

        buildSummaryReport: function(callback) {
            var reportDefinition = $.extend(true, {
                    callbacksMap: { 
                        lookup: function (val) { return mainLookupMap[val] || val; }
                    }
                }, this.summaryReports[$("#report_select")[0].selectedIndex].definition)
                Exporter =new (a$(jT.Exporting, jT.Communicating, Solr.Configuring, Solr.QueryingJson))({
                    exportDefinition: reportDefinition,
                    useJson: true,
                    expectJson: true,
                    serverUrl: this.solrUrl
                }), 
                selectedIds = this.getSelectedIds(),
                errFn = function (err) {
                    console.log(JSON.stringify(err).substr(0, 256));
                    callback(null, typeof err === "string" ? "Err: " + err : "Error occurred!"); 
                };

            Exporter.init(this.manager);

            Promise.all([
                jT.promiseXHR({
                    url: reportDefinition.template,
                    settings: { responseType: "arraybuffer" }
                }),
                this.connector(Exporter.prepareExport(null, selectedIds).getAjax())
            ]).then(function (results) {
                var wbData = results[0],
                    queryData = results[1];

                if (typeof reportDefinition.onData === 'function')
                    reportDefinition.onData(queryData);

                XlsxPopulate.fromDataAsync(wbData).then(function (workbook) {
                    try {
                        new XlsxDataFill(
                            new XlsxDataFill.XlsxPopulateAccess(workbook, XlsxPopulate), 
                            reportDefinition
                        ).fillData(queryData);

                        workbook.outputAsync().then(callback, errFn)
                    } catch (e) {
                        errFn(e.message);
                    }
                }, errFn);
            }, errFn);
        }
    });

})(Solr, asSys || a$, jQuery || $, jToxKit || jT);jToxKit.templates['faceted-search-kit']  = 
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
"<input type=\"hidden\" name=\"search\"/>" +
"" +
"<h6>Select dataset to export</h6>" +
"<div id=\"export_dataset\">" +
"<input type=\"radio\" value=\"filtered\" name=\"export_dataset\" id=\"filtered_data\" checked=\"checked\"/>" +
"<label for=\"filtered_data\">Matched hits</label>" +
"<input type=\"radio\" value=\"selected\" name=\"export_dataset\" id=\"selected_data\"/>" +
"<label for=\"selected_data\">Selected entries</label>" +
"</div>" +
"" +
"<h6>Select export type</h6>" +
"<div id=\"export_type\"></div>" +
"" +
"<h6>Select output format</h6>" +
"<input type=\"hidden\" name=\"export_format\" id=\"export_format\"/>" +
"<div class=\"data_formats\"></div>" +
"" +
"<br />" +
"<button id=\"export_go\" type=\"submit\" name=\"export_go\" data-format=\"Download {{source}} as {{format}}\">?</button>" +
"" +
"<br />" +
"<select id=\"report_select\" style=\"width: auto;\"></select>" +
"<button id=\"report_go\" type=\"button\" name=\"report_go\" data-format=\"Generate summary report for {{source}}\">?</button>" +
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

jToxKit.templates['faceted-search-templates']  = 
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
"<input type=\"text\" placeholder=\"Filter_\" class=\"widget-filter\"/>" +
"<input type=\"button\" class=\"switcher\" value=\"OR\"/>" +
"</div>" +
"<ul class=\"widget-content tags remove-bottom\" data-color=\"{{color}}\"></ul>" +
"</div>" +
"</div>" +
"" +
"<div id=\"slider-one\">" +
"<input type=\"hidden\"/>" +
"</div>" +
"" +
"<div id=\"export-type\">" +
"<input type=\"radio\" value=\"{{fields}}\" {{selected}} name=\"export_type\" id=\"{{name}}\"/>" +
"<label for=\"{{name}}\">{{name}}</label>" +
"</div>" +
"" +
"<div id=\"export-format\">" +
"<div class=\"jtox-inline jtox-ds-download jtox-fadable\">" +
"<a target=\"_blank\" data-name=\"{{name}}\" data-mime=\"{{mime}}\" href=\"#\"><img class=\"borderless\" jt-src=\"{{icon}}\"/></a>" +
"</div>" +
"</div>" +
""; // end of #faceted-search-templates 

jT.templates['logger-main']  = 
"<div class=\"list-wrap\">" +
"<div class=\"list-root\"></div>" +
"</div>" +
"<div class=\"status\">" +
"<div class=\"icon jtox-fadable\"></div>" +
"</div>" +
""; // end of #jtox-logger 

jT.templates['logger-line']  = 
"<div id=\"jtox-logline\">" +
"<div class=\"logline\">" +
"<div class=\"icon\"></div>" +
"<span class=\"content data-field\" data-field=\"header\">{{header}}</span>" +
"<div class=\"details data-field\" data-field=\"details\">{{details}}</div>" +
"</div>" +
"</div>" +
""; // end of #jtox-logline 

