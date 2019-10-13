/** jToxKit - Chem-informatics UI tools, widgets and kits library. Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved. @license MIT.*/
(function(global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory(require("lodash"), require("as-sys"), require("jQuery"), require("solr-jsx"), require("commbase-jsx")) : typeof define === "function" && define.amd ? define([ "lodash", "as-sys", "jQuery", "solr-jsx", "commbase-jsx" ], factory) : (global = global || self, 
    global.jToxKit = factory(global._, global.asSys, global.$, global.Solr, global.CommBase));
})(this, (function(_$1, a$, $$1, Solr, CommBase) {
    "use strict";
    var jT = {
        version: "3.0.0",
        fixBaseUrl(url) {
            if (url != null && url.charAt(url.length - 1) == "/") url = url.slice(0, -1);
            return url;
        },
        grabBaseUrl(url, key) {
            if (url != null) {
                if (!!key) return url.slice(0, url.indexOf("/" + key)); else if (url.indexOf("http") == 0) return this.formBaseUrl(this.parseURL(url));
            }
            return this.settings.baseUrl;
        },
        formBaseUrl(url) {
            var burl = !!url.host ? url.protocol + "://" + url.host + (url.port.length > 0 ? ":" + url.port : "") + "/" + url.segments[0] : null;
            console.log("Deduced base URL: " + burl + " (from: " + url.source + ")");
            return burl;
        },
        copyToClipboard(text, prompt) {
            if (!prompt) {
                prompt = "Press Ctrl-C (Command-C) to copy and then Enter.";
            }
            window.prompt(prompt, text);
        },
        formatString: function(str, info, def) {
            var pieces = str.split(/\{\{([^}]+)\}\}/), pl = pieces.length, out = "";
            for (var i = 0; ;++i) {
                out += pieces[i++];
                if (i >= pl) break;
                var f = _$1.get(info, pieces[i]);
                if (f != null) out += f; else if (typeof def === "function") out += def(pieces[i]); else if (typeof def === "string") out += def; else out += "";
            }
            return out;
        },
        formatNumber(num, prec) {
            if (prec < 1) prec = parseInt(1 / prec);
            return Math.round(num * prec) / prec;
        },
        formatUnits(str) {
            return str.toString().replace(/(^|\W)u(\w)/g, "$1&#x00B5;$2").replace(/\^\(?([\-\d]+)\)?/g, "<sup>$1</sup>").replace(/ /g, "&nbsp;");
        },
        addParameter(url, param) {
            return url + ("&?".indexOf(url.charAt(url.length - 1)) == -1 ? url.indexOf("?") > 0 ? "&" : "?" : "") + param;
        },
        removeParameter(url, param) {
            return url.replace(new RegExp("(.*?.*)(" + param + "=[^&s$]*&?)(.*)"), "$1$3");
        },
        parseURL: function(url) {
            var a = document.createElement("a");
            a.href = url;
            return {
                source: url,
                protocol: a.protocol.replace(":", ""),
                host: a.hostname,
                port: a.port,
                query: a.search,
                params: function() {
                    var ret = {}, seg = a.search.replace(/^\?/, "").split("&"), len = seg.length, i = 0, s, v, arr;
                    for (;i < len; i++) {
                        if (!seg[i]) {
                            continue;
                        }
                        s = seg[i].split("=");
                        v = s.length > 1 ? decodeURIComponent(s[1].replace(/\+/g, " ")) : "";
                        if (s[0].indexOf("[]") == s[0].length - 2) {
                            arr = ret[s[0].slice(0, -2)];
                            if (arr === undefined) ret[s[0].slice(0, -2)] = [ v ]; else arr.push(v);
                        } else ret[s[0]] = v;
                    }
                    return ret;
                }(),
                file: (a.pathname.match(/\/([^\/?#]+)$/i) || [ , "" ])[1],
                hash: a.hash.replace("#", ""),
                path: a.pathname.replace(/^([^\/])/, "/$1"),
                relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [ , "" ])[1],
                segments: a.pathname.replace(/^\//, "").split("/")
            };
        },
        modifyURL(url, name, value) {
            var a = document.createElement("a"), str = !!value ? name + "=" + encodeURIComponent(value) : "", mbs, q;
            a.href = url;
            q = a.search;
            mbs = q.match(new RegExp(name + "=[\\S^&]+"));
            if (!!mbs) q = q.replace(mbs[0], str); else if (!str) return; else if (q.charAt(0) == "?") q = "?" + str; else q += (q.slice(-1) == "&" ? "" : "&") + str;
            a.search = q;
            return a.href;
        },
        escapeHTML: function(str) {
            var map = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };
            return str.replace(/[&<>"']/g, (function(m) {
                return map[m];
            }));
        },
        fillTemplate(selector, info) {
            return $$1(this.formatString($$1(selector).html(), info).replace(/(<img(\s+.*)?)(\s+jt-src=")/, '$1 src="'));
        },
        fillTree(root, info) {
            $$1(".data-field", root).each((function() {
                var me$ = $$1(this), val = _$1.get(info, me$.data("field"));
                if (val !== undefined) me$.html(val);
            }));
        },
        updateCounter(str, count, total) {
            var re = null;
            var add = "";
            if (count == null) count = 0;
            if (total == null) {
                re = /\(([\d\?]+)\)$/;
                add = "" + count;
            } else {
                re = /\(([\d\?]+\/[\d\?\+-]+)\)$/;
                add = "" + count + "/" + total;
            }
            if (!str.match(re)) str += " (" + add + ")"; else str = str.replace(re, "(" + add + ")");
            return str;
        },
        enterBlur(e) {
            if (e.keyCode == 13) this.blur();
        }
    };
    var _Tools = {
        rootSettings: {},
        kitsMap: {},
        templateRoot: null,
        templates: {},
        callId: 0,
        initKit: function(element) {
            var self = this, dataParams = element.data(), kit = dataParams.kit, topSettings = $.extend(true, {}, self.rootSettings);
            parent = null;
            _$1.each(element.parents(".jtox-kit,.jtox-widget").toArray().reverse(), (function(el) {
                parent = self.kit(el);
                if (parent != null) topSettings = $.extend(true, topSettings, parent);
            }));
            if (!parent) parent = self;
            dataParams = $.extend(true, topSettings, dataParams);
            dataParams.baseUrl = self.fixBaseUrl(dataParams.baseUrl);
            dataParams.target = element;
            if (dataParams.id === undefined) dataParams.id = element.attr("id");
            var realInit = function(params, element) {
                if (!kit) return null;
                var fn = window[kit];
                if (typeof fn !== "function") {
                    kit = kit.charAt(0).toUpperCase() + kit.slice(1);
                    fn = jT.kit[kit] || jT[kit];
                }
                var obj = null;
                if (typeof fn == "function") obj = new fn(params); else if (typeof fn == "object" && typeof fn.init == "function") obj = fn.init(params);
                if (obj != null) {
                    if (fn.prototype.__kits === undefined) fn.prototype.__kits = [];
                    fn.prototype.__kits.push(obj);
                    obj.parentKit = parent;
                    if (dataParams.id !== null) self.kitsMap[dataParams.id] = obj;
                } else console.log("jToxError: trying to initialize unexistent jTox kit: " + kit);
                return obj;
            };
            if (dataParams.configFile != null) {
                $.ajax({
                    settings: "GET",
                    url: dataParams.configFile
                }, (function(config) {
                    if (!!config) $.extend(true, dataParams, config);
                    element.data("jtKit", realInit(dataParams));
                }));
            } else {
                if (typeof dataParams.configuration == "string" && !!window[dataParams.configuration]) {
                    var config = window[dataParams.configuration];
                    $.extend(true, dataParams, typeof config === "function" ? config.call(kit, dataParams, kit) : config);
                }
                element.data("jtKit", realInit(dataParams));
            }
        },
        initialize: function(root) {
            var self = this;
            if (!root) {
                self.initTemplates();
                $(document).on("click", ".jtox-kit span.ui-icon-copy", (function() {
                    this.copyToClipboard($(this).data("uuid"));
                    return false;
                }));
                $(document).on("click", ".jtox-foldable>.title", (function(e) {
                    $(this).parent().toggleClass("folded");
                }));
                $(document).on("click", ".jtox-diagram span.ui-icon", (function() {
                    $(this).toggleClass("ui-icon-zoomin").toggleClass("ui-icon-zoomout");
                    $("img", this.parentNode).toggleClass("jtox-smalldiagram");
                }));
                var url = this.parseURL(document.location), queryParams = url.params;
                if (!self.rootSettings.baseUrl) queryParams.baseUrl = self.formBaseUrl(url); else if (!!queryParams.baseUrl) queryParams.baseUrl = self.fixBaseUrl(queryParams.baseUrl);
                self.rootSettings = $.extend(true, self.rootSettings, queryParams);
                self.fullUrl = url;
                root = document;
            }
            var fnInit = function() {
                if (!$(this).data("manualInit")) self.initKit($(this));
            };
            $(".jtox-kit", root).each(fnInit);
            $(".jtox-widget", root).each(fnInit);
        },
        kit: function(element) {
            if (typeof element !== "string") return $(element).data("jtKit"); else if (this.kitsMap[element] !== undefined) return this.kitsMap[element]; else return $("#" + element).data("jtKit");
        },
        attachKit: function(element, kit) {
            return $(element).data("jtKit", kit);
        },
        parentKit: function(name, element) {
            var self = this;
            var query = null;
            if (typeof name == "string") name = window[name];
            $(element).parents(".jtox-kit").each((function() {
                var kit = self.kit(this);
                if (!kit || !!query) return;
                if (!name || kit instanceof name) query = kit;
            }));
            return query;
        },
        initTemplates: function() {
            var self = this;
            var root = $(".jtox-template")[0];
            if (!root) {
                root = document.createElement("div");
                root.className = "jtox-template";
                document.body.appendChild(root);
            }
            var html = root.innerHTML;
            for (var t in self.templates) {
                html += self.templates[t];
            }
            root.innerHTML = html;
            self.templateRoot = root;
        },
        insertTool: function(name, root) {
            var html = this.tools[name];
            if (html != null) {
                root.innerHTML = html;
                this.init(root);
            }
            return root;
        },
        installHandlers: function(kit, root) {
            if (root == null) root = kit.rootElement;
            jT.$(".jtox-handler", root).each((function() {
                var name = jT.$(this).data("handler");
                var handler = null;
                if (kit.settings.configuration != null && kit.settings.configuration.handlers != null) handler = kit.settings.configuration.handlers[name];
                handler = handler || window[name];
                if (!handler) console.log("jToxQuery: referring unknown handler: " + name); else if (this.tagName == "INPUT" || this.tagName == "SELECT" || this.tagName == "TEXTAREA") jT.$(this).on("change", handler).on("keydown", jT.enterBlur); else jT.$(this).on("click", handler);
            }));
        }
    };
    var defSettings = {
        itemId: "id"
    };
    function Listing(settings) {
        a$.setup(this, defSettings = settings);
        this.target = $(settings.target);
        this.length = 0;
        this.clearItems();
    }
    Listing.prototype.populate = function(docs, callback) {
        this.items = docs;
        this.length = docs.length;
        this.target.empty();
        for (var i = 0, l = docs.length; i < l; i++) this.target.append(this.renderItem(typeof callback === "function" ? callback(docs[i]) : docs[i]));
    };
    Listing.prototype.addItem = function(doc) {
        this.items.push(doc);
        ++this.length;
        return this.renderItem(doc);
    };
    Listing.prototype.clearItems = function() {
        this.target.empty();
        this.items = [];
        this.length = 0;
    };
    Listing.prototype.findItem = function(id) {
        var self = this;
        return _$1.findIndex(this.items, typeof id !== "string" ? id : function(doc) {
            return doc[self.itemId] === id;
        });
    };
    Listing.prototype.eraseItem = function(id) {
        var i = this.findItem(id), r = i >= 0 ? this.items.splice(i, 1)[0] : false;
        this.length = this.items.length;
        return r;
    };
    Listing.prototype.enumerateItems = function(callback) {
        var els = this.target.children();
        for (var i = 0, l = this.items.length; i < l; ++i) callback.call(els[i], this.items[i]);
    };
    var defSettings$1 = {
        errorMessage: "Error retrieving data!"
    };
    function Loading(settings) {
        a$.setup(this, defSettings$1, settings);
    }
    Loading.prototype.__expects = [ "populate" ];
    Loading.prototype.init = function(manager) {
        a$.pass(this, Loading, "init", manager);
        this.manager = manager;
    };
    Loading.prototype.beforeRequest = function() {
        $$1(this.target).html($$1("<img>").attr("src", "images/ajax-loader.gif"));
    };
    Loading.prototype.afterResponse = function(data, jqXHR) {
        if (!data) $$1(this.target).html(this.errorMessage); else {
            $$1(this.target).empty();
            this.populate(data.entries);
        }
    };
    var defSettings$2 = {
        template: null,
        classes: null
    };
    function Iteming(settings) {
        a$.setup(this, defSettings$2, settings);
        this.target = $(settings.target);
    }
    Iteming.prototype.renderItem = function(info) {
        return jT.fillTemplate(template, info).addClass(this.classes);
    };
    var defSettings$3 = {
        automatic: true,
        title: null,
        classes: null,
        expansionTemplate: null,
        before: null
    };
    function AccordionExpander(settings) {
        a$.setup(this, defSettings$3, settings);
        this.target = $$1(settings.target);
        this.header = null;
        this.id = settings.id;
        if (this.automatic) settings.target = this.makeExpansion();
    }
    AccordionExpander.prototype.renderExpansion = function(info) {
        return jT.fillTemplate(this.expansionTemplate, info).addClass(this.classes);
    };
    AccordionExpander.prototype.makeExpansion = function(before, info) {
        if (!!this.header) return;
        if (!info) info = this;
        if (!before) before = this.before;
        var el$ = this.renderExpansion(info);
        this.accordion = this.target;
        if (!before) this.accordion.append(el$); else if (typeof before === "number") this.accordion.children().eq(before).before(el$); else if (typeof before === "string") $$1(before, this.accordion[0]).before(el$); else $$1(before).before(el$);
        this.refresh();
        this.header = $$1("#" + this.id + "_header");
        return this.target = $$1("#" + this.id);
    };
    AccordionExpander.prototype.getHeaderText = function() {
        return this.header.contents().filter((function() {
            return this.nodeType == 3;
        }))[0];
    };
    AccordionExpander.prototype.refresh = function() {
        this.accordion.accordion("refresh");
    };
    var defaultParameters = {
        facet: true,
        rows: 0,
        fl: "id",
        "facet.limit": -1,
        "facet.mincount": 1,
        echoParams: "none"
    };
    var defSettings$4 = {
        servlet: "select",
        urlFeed: null,
        useJson: false,
        maxResults: 30,
        activeFacets: null
    };
    function Autocompleter(settings) {
        a$.setup(this, defSettings$4, settings);
        this.target = $$1(settings.target);
        this.id = settings.id;
        this.lookupMap = settings.lookupMap || {};
        this.parameters = _.assign({}, defaultParameters);
        this.facetPath = this.useJson ? "facets" : "facet_counts.facet_fields";
        if (!this.useJson) this.parameters["json.nl"] = "map";
    }
    Autocompleter.prototype.__expects = [ "addValue", "doSpying" ];
    Autocompleter.prototype.init = function(manager) {
        a$.pass(this, Autocompleter, "init", manager);
        this.manager = manager;
        var self = this;
        self.findBox = this.target.find("input").on("change", (function(e) {
            var thi$ = $$1(this);
            if (!self.addValue(thi$.val()) || self.requestSent) return;
            thi$.blur().autocomplete("disable");
            manager.doRequest();
        }));
        if (self.urlFeed != null) {
            var needle = $$1.url().param(self.urlFeed);
            self.addValue(needle);
            self.findBox.val(needle);
        }
        self.findBox.autocomplete({
            minLength: 0,
            source: function(request, callback) {
                self.reportCallback = callback;
                self.makeRequest(request.term);
            },
            select: function(event, ui) {
                if (ui.item) {
                    self.requestSent = true;
                    if (manager.getListener(ui.item.id).addValue(ui.item.value)) manager.doRequest();
                }
            }
        });
    };
    Autocompleter.prototype.makeRequest = function(term) {
        var self = this;
        this.doSpying((function(manager) {
            manager.removeParameters("fl");
            manager.mergeParameters(self.parameters);
            self.addValue(term || "");
        }), (function(response) {
            self.onResponse(response);
        }));
    };
    Autocompleter.prototype.onResponse = function(response) {
        var self = this, list = [];
        _.each(_.get(response, this.facetPath), (function(facet, fid) {
            if (list.length >= self.maxResults || typeof facet !== "object" || self.activeFacets && self.activeFacets[fid] === false) return;
            _.each(self.useJson ? facet.buckets : facet, (function(entry, key) {
                if (list.length >= self.maxResults) return;
                if (!self.useJson) entry = {
                    val: key,
                    count: entry
                };
                list.push({
                    id: fid,
                    value: entry.val,
                    label: (self.lookupMap[entry.val] || entry.val) + " (" + entry.count + ") - " + fid
                });
            }));
        }));
        if (typeof this.reportCallback === "function") self.reportCallback(list);
    };
    Autocompleter.prototype.afterResponse = function(response) {
        var qval = this.manager.getParameter("q").value || "";
        this.findBox.val(qval != "*:*" && qval.length > 0 ? qval : "").autocomplete("enable");
        this.requestSent = false;
    };
    var htmlLink = '<a href="{{href}}" title="{{hint}}" target="{{target}}" class="{{css}}">{{value}}</a>', plainLink = '<span title="{{hint}}" class="{{css}}">{{value}}</span>', defSettings$5 = {
        baseUrl: "",
        summaryPrimes: [ "RESULTS" ],
        tagDbs: {},
        onCreated: null,
        onClick: null,
        summaryRenderers: {
            RESULTS: function(val, topic) {
                var self = this;
                return val.map((function(study) {
                    return study.split(".").map((function(one) {
                        return self.lookupMap[one] || one;
                    })).join(".");
                }));
            },
            REFOWNERS: function(val, topic) {
                return {
                    topic: "Study Providers",
                    content: val.map((function(ref) {
                        return jT.formatString(htmlLink, {
                            href: "#",
                            hint: "Freetext search",
                            target: "_self",
                            value: ref,
                            css: "freetext_selector"
                        });
                    }))
                };
            },
            REFS: function(val, topic) {
                return {
                    topic: "References",
                    content: val.map((function(ref) {
                        var link = ref.match(/^doi:(.+)$/);
                        link = link != null ? "https://www.doi.org/" + link[1] : ref;
                        return jT.formatString(link.match(/^https?:\/\//) ? htmlLink : plainLink, {
                            href: link,
                            hint: "External reference",
                            target: "ref",
                            value: ref
                        });
                    }))
                };
            }
        }
    };
    function SolrResulter(settings) {
        a$.setup(this, defSettings$5, settings);
        this.baseUrl = jT.fixBaseUrl(settings.baseUrl) + "/";
        this.lookupMap = settings.lookupMap || {};
        this.target = settings.target;
        this.id = settings.id;
    }
    SolrResulter.prototype.renderItem = function(doc) {
        var self = this, el = $$1(this.renderSubstance(doc));
        if (!el.length) return null;
        $$1(this.target).append(el);
        if (typeof this.onClick === "function") $$1("a.command", el[0]).on("click", (function(e) {
            self.onClick.call(el[0], e, doc, self);
        }));
        if (typeof this.onCreated === "function") this.onCreated.call(el, doc, this);
        $$1("a.more", el[0]).on("click", (function(e) {
            e.preventDefault();
            e.stopPropagation();
            var $this = $$1(this), $div = $$1(".more-less", $this.parent()[0]);
            if ($div.is(":visible")) {
                $div.hide();
                $this.text("more");
            } else {
                $div.show();
                $this.text("less");
            }
            return false;
        }));
        return null;
    };
    SolrResulter.prototype.renderSubstance = function(doc) {
        var summaryhtml = $$1("#summary-item").html(), summarylist = this.buildSummary(doc), baseUrl = this.getBaseUrl(doc), summaryRender = function(summarylist) {
            return summarylist.map((function(s) {
                return jT.formatString(summaryhtml, s);
            })).join("");
        };
        var item = {
            logo: this.tagDbs[doc.dbtag_hss] && this.tagDbs[doc.dbtag_hss].icon || "images/logo.png",
            link: "#",
            href: "#",
            title: (doc.publicname || doc.name) + (doc.pubname === doc.name ? "" : "  (" + doc.name + ")") + (doc.substanceType == null ? "" : " " + (this.lookupMap[doc.substanceType] || doc.substanceType)),
            composition: this.renderComposition(doc, '<a href="' + baseUrl + doc.s_uuid + '/structure" title="Composition" target="' + doc.s_uuid + '">&hellip;</a>').join("<br/>"),
            summary: summarylist.length > 0 ? summaryRender(summarylist.splice(0, this.summaryPrimes.length)) : "",
            item_id: (this.prefix || this.id || "item") + "_" + doc.s_uuid,
            footer: '<a href="' + baseUrl + doc.s_uuid + '" title="Substance" target="' + doc.s_uuid + '">Material</a>' + '<a href="' + baseUrl + doc.s_uuid + '/structure" title="Composition" target="' + doc.s_uuid + '">Composition</a>' + '<a href="' + baseUrl + doc.s_uuid + '/study" title="Study" target="' + doc.s_uuid + '">Studies</a>'
        };
        if (summarylist.length > 0) item.summary += '<a href="#" class="more">more</a>' + '<div class="more-less" style="display:none;">' + summaryRender(summarylist) + "</div>";
        if (doc.content == null) {
            item.link = baseUrl + doc.s_uuid;
            item.href = item.link + "/study";
            item.href_title = "Study";
            item.href_target = doc.s_uuid;
        } else {
            var external = "External database";
            if (doc.owner_name && doc.owner_name.lastIndexOf("caNano", 0) === 0) {
                item.logo = "images/canano.jpg";
                item.href_title = "caNanoLab: " + item.link;
                item.href_target = external = "caNanoLab";
                item.footer = "";
            } else {
                item.logo = "images/external.png";
                item.href_title = "External: " + item.link;
                item.href_target = "external";
            }
            if (doc.content.length > 0) {
                item.link = doc.content[0];
                for (var i = 0, l = doc.content.length; i < l; i++) item.footer += '<a href="' + doc.content[i] + '" target="external">' + external + "</a>";
            }
        }
        return jT.fillTemplate("#result-item", item);
    };
    SolrResulter.prototype.getBaseUrl = function(doc) {
        if (this.tagDbs[doc.dbtag_hss] !== undefined) {
            var url = this.tagDbs[doc.dbtag_hss].server, lastChar = url.substr(-1);
            return url + (lastChar != "/" ? "/substance/" : "substance/");
        } else {
            return this.baseUrl;
        }
    };
    SolrResulter.prototype.renderComposition = function(doc, defValue) {
        var summary = [], composition = doc._extended_ && doc._extended_.composition;
        if (!!composition) {
            var cmap = {};
            _.each(composition, (function(c) {
                var ce = cmap[c.component_s], se = [];
                if (ce === undefined) cmap[c.component_s] = ce = [];
                _.each(c, (function(v, k) {
                    var m = k.match(/^(\w+)_[shd]+$/);
                    k = m && m[1] || k;
                    if (!k.match(/type|id|component/)) se.push(jT.formatString(htmlLink, {
                        href: "#",
                        hint: "Freetext search on '" + k + "'",
                        target: "_self",
                        value: v,
                        css: "freetext_selector"
                    }));
                }));
                ce.push(se.join(", "));
            }));
            _.each(cmap, (function(map, type) {
                var entry = "";
                for (var i = 0; i < map.length; ++i) {
                    if (map[i] == "") continue;
                    entry += i == 0 ? ": " : "; ";
                    if (map.length > 1) entry += "<strong>[" + (i + 1) + "]</strong>&nbsp;";
                    entry += map[i];
                }
                if (entry === "") entry = ":&nbsp;" + defValue;
                entry = type + " (" + map.length + ")" + entry;
                summary.push(entry);
            }));
        }
        return summary;
    };
    SolrResulter.prototype.buildSummary = function(doc) {
        var self = this, items = [];
        _.each(doc, (function(val, key) {
            var name = key.match(/^SUMMARY\.([^_]+)_?[hsd]*$/);
            if (!name) return;
            name = name[1];
            var render = self.summaryRenderers[name] || self.summaryRenderers._, item = typeof render === "function" ? render.call(self, val, name) : val;
            if (!item) return;
            if (typeof item !== "object" || Array.isArray(item)) item = {
                topic: name.toLowerCase(),
                values: item
            }; else if (item.topic == null) item.topic = name.toLowerCase();
            if (!item.content) item.content = Array.isArray(item.values) ? item.values.join(", ") : item.values.toString();
            var primeIdx = self.summaryPrimes.indexOf(name);
            if (primeIdx > -1 && primeIdx < items.length) items.splice(primeIdx, 0, item); else items.push(item);
        }));
        return items;
    };
    var defSettings$6 = {
        mountDestination: null,
        statusDelay: 1500,
        keepMessages: 50,
        lineHeight: "20px",
        rightSide: false,
        hasDetails: true,
        autoHide: true
    };
    function Logger(settings) {
        a$.setup(this, defSettings$6, settings);
        var root$ = $$1(this.target = settings.target);
        root$.html(jT.templates["logger-main"]);
        root$.addClass("jtox-toolkit jtox-log");
        if (typeof this.lineHeight == "number") this.lineHeight = this.lineHeight.toString() + "px";
        if (typeof this.keepMessages != "number") this.keepMessages = parseInt(this.keepMessages);
        this.listRoot = $$1(".list-root", this.target)[0], this.statusEl = $$1(".status", this.target)[0];
        if (!!this.rightSide) {
            this.statusEl.style.right = "0px";
            root$.addClass("right-side");
        } else this.statusEl.style.left = "0px";
        this.setStatus("");
        this.events = {};
        if (!!this.autoHide) {
            root$.bind("click", (function(e) {
                $$1(this).toggleClass("hidden");
            }));
            root$.bind("mouseleave", (function(e) {
                $$1(this).addClass("hidden");
            }));
        }
        if (!!this.mountDestination) {
            var dest = typeof this.mountDestination === "object" ? this.mountDestination : _$1.get(window, this.mountDestination), self = this;
            dest.onPrepare = function(params) {
                return self.beforeRequest(params);
            };
            dest.onSuccess = function(response, jqXHR, params) {
                return self.afterResponse(response, params, jqXHR);
            };
            dest.onError = function(jqXHR, params) {
                return self.afterResponse(null, jqXHR, params);
            };
        }
    }
    Logger.prototype.formatEvent = function(params, jhr) {
        if (jhr != null) return {
            details: jhr.status + " " + jhr.statusText + "<br/>" + jhr.getAllResponseHeaders()
        }; else if (params != null) return {
            header: params.method.toUpperCase() + ": " + params.service,
            details: "..."
        }; else return null;
    };
    Logger.prototype.setIcon = function(line$, status) {
        if (status == "error") line$.addClass("ui-state-error"); else line$.removeClass("ui-state-error");
        line$.data("status", status);
        if (status == "error") $$1(".icon", line$).addClass("ui-icon ui-icon-alert").removeClass("loading ui-icon-check"); else if (status == "success") $$1(".icon", line$).addClass("ui-icon ui-icon-check").removeClass("loading ui-icon-alert"); else {
            $$1(".icon", line$).removeClass("ui-icon ui-icon-check ui-icon-alert");
            if (status == "connecting") $$1(".icon", line$).addClass("loading");
        }
    };
    Logger.prototype.setStatus = function(status) {
        var self = this;
        $$1(".icon", self.statusEl).removeClass("jt-faded");
        self.setIcon($$1(self.statusEl), status);
        if (status == "error" || status == "success") {
            setTimeout((function() {
                $$1(".icon", self.statusEl).addClass("jt-faded");
                var hasConnect = false;
                $$1(".logline", self.listRoot).each((function() {
                    if ($$1(self).data("status") == "connecting") hasConnect = true;
                }));
                if (hasConnect) self.setStatus("connecting");
            }), self.statusDelay);
        }
    };
    Logger.prototype.addLine = function(data) {
        var self = this, el$ = jT.fillTemplate("#jtox-logline", data);
        el$.height("0px");
        this.listRoot.insertBefore(el$[0], this.listRoot.firstElementChild);
        setTimeout((function() {
            el$.height(self.lineHeight);
        }), 150);
        if (!!self.hasDetails) {
            $$1(".icon", el$[0]).on("click", (function(e) {
                el$.toggleClass("openned");
                if (el$.hasClass("openned")) {
                    var height = 0;
                    $$1(".data-field", el$[0]).each((function() {
                        height += this.offsetHeight;
                    }));
                    el$.height(height + 6);
                } else el$.height(self.lineHeight);
                e.stopPropagation();
            }));
        }
        while (this.listRoot.childNodes.length > self.keepMessages) this.listRoot.removeChild(this.listRoot.lastElementChild);
        return el$;
    };
    Logger.prototype.beforeRequest = function(params) {
        var url = jT.parseURL(params.url), info = this.formatEvent(params), line$ = this.addLine(info);
        this.setStatus("connecting");
        this.events[params.logId = Date.now()] = line$;
        this.setIcon(line$, "connecting");
        line$.data("status", "connecting");
    };
    Logger.prototype.afterResponse = function(response, params, jhr) {
        var info = this.formatEvent(params, jhr), line$ = this.events[params.logId], status = !!response ? "success" : "error";
        this.setStatus(status);
        if (!line$) {
            console.log("jToxLog: missing line for:" + params.service + "(" + jhr.statusText + ")");
            return;
        }
        delete this.events[params.logId];
        this.setIcon(line$, status);
        jT.fillTree(line$[0], info);
        if (status == "error") console && console.log("Error [" + params.service + "]: " + jhr.statusText);
    };
    var defSettings$7 = {
        innerWindow: 4,
        outerWindow: 1,
        prevLabel: "&laquo; Previous",
        nextLabel: "Next &raquo;",
        separator: " "
    };
    function Pager(settings) {
        a$.setup(this, defSettings$7, settings);
        this.target = $(settings.target);
        this.id = settings.id;
        this.manager = null;
    }
    Pager.prototype.__expects = [ "nextPage", "previousPage" ];
    Pager.prototype.gapMarker = function() {
        return '<span class="pager-gap">&hellip;</span>';
    };
    Pager.prototype.windowedLinks = function() {
        var links = [], prev = null;
        visible = this.visiblePageNumbers();
        for (var i = 0, l = visible.length; i < l; i++) {
            if (prev && visible[i] > prev + 1) links.push(this.gapMarker());
            links.push(this.pageLinkOrSpan(visible[i], [ "pager-current" ]));
            prev = visible[i];
        }
        return links;
    };
    Pager.prototype.visiblePageNumbers = function() {
        var windowFrom = this.currentPage - this.innerWindow, windowTo = this.currentPage + this.innerWindow, visible = [];
        if (windowTo > this.totalPages) {
            windowFrom = Math.max(0, windowFrom - (windowTo - this.totalPages));
            windowTo = this.totalPages;
        }
        if (windowFrom < 1) {
            windowTo = Math.min(this.totalPages, windowTo + (1 - windowFrom));
            windowFrom = 1;
        }
        visible.push(1);
        for (var i = 2; i <= Math.min(1 + this.outerWindow, windowFrom - 1); i++) {
            visible.push(i);
        }
        if (1 + this.outerWindow == windowFrom - 2) {
            visible.push(windowFrom - 1);
        }
        for (var i = Math.max(2, windowFrom); i <= Math.min(windowTo, this.totalPages - 1); i++) {
            visible.push(i);
        }
        if (this.totalPages - this.outerWindow == windowTo + 2) {
            visible.push(windowTo + 1);
        }
        for (var i = Math.max(this.totalPages - this.outerWindow, windowTo + 1); i < this.totalPages; i++) {
            visible.push(i);
        }
        if (this.totalPages > 1) {
            visible.push(this.totalPages);
        }
        return visible;
    };
    Pager.prototype.pageLinkOrSpan = function(page, classnames, text) {
        text = text || page;
        if (page && page != this.currentPage) {
            return $('<a href="#"></a>').html(text).attr("rel", this.relValue(page)).addClass(classnames[1]).click(this.clickHandler(page));
        } else {
            return $("<span></span>").html(text).addClass(classnames.join(" "));
        }
    };
    Pager.prototype.relValue = function(page) {
        switch (page) {
          case this.previousPage():
            return "prev" + (page == 1 ? "start" : "");

          case this.nextPage():
            return "next";

          case 1:
            return "start";

          default:
            return "";
        }
    };
    Pager.prototype.renderHeader = function(perPage, offset, total) {};
    Pager.prototype.renderLinks = function(links) {
        if (this.totalPages) {
            links.unshift(this.pageLinkOrSpan(this.previousPage(), [ "pager-disabled", "pager-prev" ], this.prevLabel));
            links.push(this.pageLinkOrSpan(this.nextPage(), [ "pager-disabled", "pager-next" ], this.nextLabel));
            var $target = $(this.target);
            $target.empty();
            for (var i = 0, l = links.length; i < l; i++) {
                var $li = $("<li></li>");
                if (this.separator && i > 0) {
                    $li.append(this.separator);
                }
                $target.append($li.append(links[i]));
            }
        }
    };
    Pager.prototype.afterResponse = function() {
        a$.pass(this, Pager, "afterResponse");
        $(this.target).empty();
        this.renderLinks(this.windowedLinks());
        this.renderHeader(this.pageSize, (this.currentPage - 1) * this.pageSize, this.totalEntries);
    };
    var defSettings$8 = {
        runSelector: ".switcher",
        runMethod: null,
        runTarget: null
    };
    function Passer(settings) {
        a$.setup(this, defSettings$8, settings);
        var self = this, target$ = $$1(self.runSelector, $$1(settings.target)[0]), runTarget = self.runTarget || self;
        target$.on("click", (function(e) {
            a$.act(runTarget, self.runMethod, this, e);
            e.stopPropagation();
        }));
    }
    var defSettings$9 = {
        color: null,
        renderItem: null,
        onUpdated: null,
        subtarget: null
    };
    function Tagger(settings) {
        a$.setup(this, defSettings$9, settings);
        this.target = $$1(settings.target);
        if (!!this.subtarget) this.target = this.target.find(this.subtarget).eq(0);
        this.id = settings.id;
        this.color = this.color || this.target.data("color");
        if (!!this.color) this.target.addClass(this.color);
    }
    Tagger.prototype.__expects = [ "hasValue", "clickHandler" ];
    Tagger.prototype.init = function(manager) {
        a$.pass(this, Tagger, "init", manager);
        this.manager = manager;
    };
    Tagger.prototype.populate = function(objectedItems, preserve) {
        var self = this, item = null, total = 0, el, selected, value;
        if (objectedItems.length == null || objectedItems.length == 0) {
            if (!preserve) this.target.html("No items found in this selection").addClass("jt-no-tags");
        } else {
            this.target.removeClass("jt-no-tags");
            objectedItems.sort((function(a, b) {
                return (a.value || a.val) < (b.value || b.val) ? -1 : 1;
            }));
            if (!preserve) this.target.empty();
            for (var i = 0, l = objectedItems.length; i < l; i++) {
                item = objectedItems[i];
                value = item.value || item.val;
                selected = this.exclusion && this.hasValue(value);
                total += item.count;
                item.title = value.toString();
                if (typeof this.modifyTag === "function") item = this.modifyTag(item);
                if (!selected) item.onMain = self.clickHandler(value);
                this.target.append(el = this.renderItem(item));
                if (selected) el.addClass("selected");
            }
        }
        a$.act(this, this.onUpdated, total);
    };
    function buildValueRange(stats, isUnits) {
        var vals = " = ";
        vals += stats.min == null ? "-&#x221E;" : stats.min;
        if (!!stats.avg) vals += "&#x2026;" + stats.avg;
        vals += "&#x2026;" + (stats.max == null ? "&#x221E;" : stats.max);
        if (isUnits) vals += " " + jT.formatUnits(stats.val).replace(/<sup>(2|3)<\/sup>/g, "&#x00B$1;").replace(/<sup>(\d)<\/sup>/g, "^$1");
        return vals;
    }
    function InnterTagger(settings) {
        this.id = settings.id;
        this.pivotWidget = settings.pivotWidget;
    }
    InnterTagger.prototype.pivotWidget = null;
    InnterTagger.prototype.hasValue = function(value) {
        return this.pivotWidget.hasValue(this.id + ":" + value);
    };
    InnterTagger.prototype.clickHandler = function(value) {
        return this.pivotWidget.clickHandler(this.id + ":" + value);
    };
    InnterTagger.prototype.modifyTag = function(info) {
        info.hint = !info.unit ? info.buildValueRange(info) : "\n" + info.unit.buckets.map((function(u) {
            return buildValueRange(u, true);
        })).join("\n");
        info.color = this.color;
        return info;
    };
    var InnerTagWidget = a$(Tagger, InnterTagger), iDificationRegExp = /\W/g, defSettings$a = {
        automatic: false,
        renderTag: null,
        multivalue: false,
        aggregate: false,
        exclusion: false
    };
    function Pivoter(settings) {
        a$.setup(this, defSettings$a, settings);
        this.target = settings.target;
        this.targets = {};
        this.lastEnabled = 0;
        this.initialPivotCounts = null;
    }
    Pivoter.prototype.__expects = [ "getFaceterEntry", "getPivotEntry", "getPivotCounts", "auxHandler" ];
    Pivoter.prototype.init = function(manager) {
        a$.pass(this, Pivoter, "init", manager);
        this.manager = manager;
        this.manager.getListener("current").registerWidget(this, true);
    };
    Pivoter.prototype.addFaceter = function(info, idx) {
        var f = a$.pass(this, Pivoter, "addFaceter", info, idx);
        if (typeof info === "object") f.color = info.color;
        if (idx > this.lastEnabled && !info.disabled) this.lastEnabled = idx;
        return f;
    };
    Pivoter.prototype.afterResponse = function(data) {
        var pivot = this.getPivotCounts(data.facets);
        a$.pass(this, Pivoter, "afterResponse", data);
        for (var i = 0; i < pivot.length; ++i) {
            var p = pivot[i], pid = p.val.replace(iDificationRegExp, "_"), target = this.targets[pid];
            if (!target) {
                this.targets[pid] = target = new jT.AccordionExpander($$1.extend(true, {}, this.settings, this.getFaceterEntry(0), {
                    id: pid,
                    title: p.val
                }));
                target.updateHandler = this.updateHandler(target);
                target.target.children().last().remove();
            } else target.target.children("ul").hide();
            this.traversePivot(target.target, p, 1);
            target.updateHandler(p.count);
        }
        this.target.accordion("refresh");
    };
    Pivoter.prototype.updateHandler = function(target) {
        var hdr = target.getHeaderText();
        return function(count) {
            hdr.textContent = jT.updateCounter(hdr.textContent, count);
        };
    };
    Pivoter.prototype.prepareTag = function(value) {
        var p = this.parseValue(value);
        return {
            title: p.value,
            color: this.faceters[p.id].color,
            count: "i",
            onMain: this.unclickHandler(value),
            onAux: this.auxHandler(value)
        };
    };
    Pivoter.prototype.traversePivot = function(target, root, idx) {
        var elements = [], faceter = this.getPivotEntry(idx), bucket = root[faceter.id].buckets;
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
                target.data({
                    widget: w,
                    id: faceter.id
                });
            } else target.children().slice(1).remove();
            w.populate(bucket, true);
            elements = [];
        } else if (bucket != null) {
            for (var i = 0, fl = bucket.length; i < fl; ++i) {
                var f = bucket[i], fid = f.val.replace(iDificationRegExp, "_"), cont$;
                if (target.children().length > 1) cont$ = $$1("#" + fid, target[0]).show(); else {
                    cont$ = jT.fillTemplate($$1("#tag-facet"), faceter).attr("id", fid);
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
    };
    var defSettings$b = {
        limits: null,
        units: null,
        initial: null,
        title: null,
        width: null,
        automatic: true,
        isRange: true,
        showScale: true,
        format: "%s {{units}}"
    };
    function Slider(settings) {
        a$.setup(this, defSettings$b, settings);
        this.target = $(settings.target);
        this.prepareLimits(settings.limits);
        if (this.initial == null) this.initial = this.isRange ? [ this.limits[0], this.limits[1] ] : (this.limits[0] + this.limits[1]) / 2;
        this.target.val(Array.isArray(this.initial) ? this.initial.join(",") : this.initial);
        if (!!this.automatic) this.makeSlider();
    }
    Slider.prototype.__expects = [ "updateHandler" ];
    Slider.prototype.prepareLimits = function(limits) {
        this.limits = typeof limits === "string" ? limits.split(",") : limits;
        this.limits[0] = parseFloat(this.limits[0]);
        this.limits[1] = parseFloat(this.limits[1]);
        this.precision = Math.pow(10, parseInt(Math.min(1, Math.floor(Math.log10(this.limits[1] - this.limits[0] + 1) - 3))));
        if (this.precision < 1 && this.precision > .01) this.precison = .01;
    };
    Slider.prototype.updateSlider = function(value, limits) {
        if (Array.isArray(value)) value = value.join(",");
        if (limits != null) {
            this.prepareLimits(limits);
            this.target.jRange("updateRange", this.limits, value);
        } else this.target.jRange("setValue", value);
    };
    Slider.prototype.makeSlider = function() {
        var self = this, enabled = this.limits[1] > this.limits[0], scale = [ jT.formatNumber(this.limits[0], this.precision), this.title + (enabled || !this.units ? "" : " (" + this.units + ")"), jT.formatNumber(this.limits[1], this.precision) ], updateHandler = self.updateHandler(), settings = {
            from: this.limits[0],
            to: this.limits[1],
            step: this.precision,
            scale: scale,
            showScale: this.showScale,
            showLabels: enabled,
            disable: !enabled,
            isRange: this.isRange,
            width: this.width,
            format: jT.formatString(this.format, this) || ""
        };
        if (this.color != null) settings.theme = "theme-" + this.color;
        settings.ondragend = function(value) {
            if (typeof value === "string" && self.isRange) value = value.split(",");
            value = Array.isArray(value) ? value.map((function(v) {
                return parseFloat(v);
            })) : parseFloat(value);
            return updateHandler(value);
        };
        return this.target.jRange(settings);
    };
    function SimpleRanger(settings) {
        this.sliderRoot = settings.sliderRoot;
    }
    SimpleRanger.prototype.__expects = [ "addValue", "doRequest" ];
    SimpleRanger.prototype.targetValue = null;
    SimpleRanger.prototype.updateHandler = function() {
        var self = this;
        return function(values) {
            if (!!self.addValue(values)) {
                self.sliderRoot.updateRequest = true;
                self.doRequest();
            }
        };
    };
    SimpleRanger.prototype.doRequest = function() {
        this.manager.doRequest();
    };
    var SingleRangeWidget = a$(Solr.Ranging, Solr.Patterning, Slider, SimpleRanger, CommBase.Delaying), defaultParameters$1 = {
        facet: true,
        rows: 0,
        fl: "id",
        "facet.limit": -1,
        "facet.mincount": 1,
        echoParams: "none"
    }, defSettings$c = {
        field: null,
        titleSkips: null
    };
    function Ranger(settings) {
        a$.setup(this, defSettings$c, settings);
        this.slidersTarget = $$1(settings.slidersTarget);
        this.lookupMap = settings.lookupMap || {};
        this.pivotMap = null;
        this.rangeWidgets = [];
        if (!Array.isArray(this.titleSkips)) this.titleSkips = [ this.titleSkips ];
    }
    Ranger.prototype.__expects = [ "getPivotEntry", "getPivotCounts" ];
    Ranger.prototype.init = function(manager) {
        a$.pass(this, Ranger, "init", manager);
        this.manager = manager;
        var self = this;
        self.applyCommand = $$1("#sliders-controls a.command.apply").on("click", (function(e) {
            self.skipClear = true;
            self.manager.doRequest();
            return false;
        }));
        $$1("#sliders-controls a.command.close").on("click", (function(e) {
            self.rangeRemove();
            return false;
        }));
    };
    Ranger.prototype.afterResponse = function(data) {
        var pivot = this.getPivotCounts(data.facets);
        a$.pass(this, Ranger, "afterResponse", data);
        if (!this.pivotMap) {
            var qval = this.manager.getParameter("q").value || "";
            if ((!qval || qval == "*:*") && !this.manager.getParameter(this.useJson ? "json.filter" : "fq").value) this.pivotMap = this.buildPivotMap(pivot);
        } else if (!this.updateRequest) this.rangeRemove(); else if (this.rangeWidgets.length > 0) {
            var pivotMap = this.buildPivotMap(pivot), w, ref;
            for (var i = 0, wl = this.rangeWidgets.length; i < wl; ++i) {
                w = this.rangeWidgets[i];
                ref = pivotMap[w.targetValue];
                w.updateSlider([ ref[i].min, ref[i].max ]);
            }
        }
        this.updateRequest = false;
    };
    Ranger.prototype.buildPivotMap = function(pivot) {
        var self = this, map = {}, traverser = function(base, idx, pattern, valId) {
            var p = self.getPivotEntry(idx), pid = p.id, color = p.color, info;
            if (p.ranging && !p.disabled) valId = pid + ":" + base.val;
            pattern += (!base.val ? "-" + p.field + ":*" : p.field + ":" + Solr.escapeValue(base.val)) + " ";
            info = base;
            p = self.getPivotEntry(idx + 1);
            if (p != null) base = base[p.id].buckets;
            if (p == null || !base.length) {
                var arr = map[valId];
                if (arr === undefined) map[valId] = arr = [];
                arr.push({
                    id: pid,
                    pattern: pattern,
                    color: color,
                    min: info.min,
                    max: info.max,
                    avg: info.avg,
                    val: info.val,
                    count: info.count
                });
            } else {
                for (var i = 0, bl = base.length; i < bl; ++i) traverser(base[i], idx + 1, pattern, valId);
            }
        };
        for (var i = 0; i < pivot.length; ++i) traverser(pivot[i], 0, "");
        return map;
    };
    Ranger.prototype.rangeRemove = function() {
        this.slidersTarget.empty().parent().removeClass("active");
        for (var i = 0, wl = this.rangeWidgets.length; i < wl; ++i) this.rangeWidgets[i].clearValues();
        this.rangeWidgets = [];
        this.lastPivotMap = this.lastPivotValue = null;
    };
    Ranger.prototype.buildTitle = function(info, skip) {
        var pat = info.pattern.replace(/\\"/g, "%0022"), fields = pat.match(/\w+:([^\s:\/"]+|"[^"]+")/g), outs = [];
        for (var i = 0; i < fields.length; ++i) {
            var f = fields[i], m = f.match(/(\w+):([^\s:\/"]+|"[^"]+")/), v = m[2].replace(/^\s*\(\s*|\s*\)\s*$/g, "");
            if (!m[1].match(skip)) outs.push(this.lookupMap[v] || v);
        }
        return outs.join("/") + " <i>(" + info.count + ")</i>";
    };
    Ranger.prototype.ensurePivotMap = function(value) {
        if (this.pivotMap != null) return true;
        var fqName = this.useJson ? "json.filter" : "fq", self = this;
        this.doSpying((function(man) {
            man.removeParameters(fqName);
            man.removeParameters("fl");
            man.getParameter("q").value = "";
            man.mergeParameters(defaultParameters$1);
        }), (function(data) {
            self.pivotMap = self.buildPivotMap(self.getPivotCounts(data.facets));
            self.openRangers(value);
        }));
        return false;
    };
    Ranger.prototype.openRangers = function(value) {
        var entry = this.pivotMap[value], pivotMap = this.lastPivotMap = this.buildPivotMap(this.getPivotCounts()), current = pivotMap[value];
        this.lastPivotValue = value;
        this.slidersTarget.empty().parent().addClass("active");
        for (var i = 0, el = entry.length; i < el; ++i) {
            var all = entry[i], ref = current[i], setup = {}, w, el$ = jT.fillTemplate("#slider-one");
            this.slidersTarget.append(el$);
            setup.id = all.id;
            setup.targetValue = value;
            setup.color = all.color;
            setup.field = this.field;
            setup.limits = [ all.min, all.max ];
            setup.initial = [ ref.min, ref.max ];
            setup.target = el$;
            setup.isRange = true;
            setup.valuePattern = all.pattern + "{{v}}";
            setup.automatic = true;
            setup.width = parseInt(this.slidersTarget.width() - $$1("#sliders-controls").width() - 20) / (Math.min(el, 2) + .1);
            setup.title = this.buildTitle(ref, /^unit[_shd]*|^effectendpoint[_shd]*/);
            setup.units = ref.id == "unit" ? jT.formatUnits(ref.val) : "";
            setup.useJson = this.useJson;
            setup.domain = this.domain;
            setup.sliderRoot = this;
            this.rangeWidgets.push(w = new SingleRangeWidget(setup));
            w.init(this.manager);
        }
    };
    Ranger.prototype.auxHandler = function(value) {
        var self = this;
        return function(event) {
            event.stopPropagation();
            self.rangeRemove();
            if (value != self.lastPivotValue && self.ensurePivotMap(value)) self.openRangers(value);
            return false;
        };
    };
    Ranger.prototype.clearValues = function() {
        this.rangeRemove();
        a$.pass(this, Ranger, "clearValues");
    };
    var defSettings$d = {
        switchSelector: ".switcher",
        switchField: null,
        onSwitching: null
    };
    function Switcher(settings) {
        a$.setup(this, defSettings$d, settings);
        var self = this, target$ = $$1(self.switchSelector, $$1(settings.target)[0]), initial = _$1.get(self, self.switchField);
        if (typeof initial === "boolean") target$[0].checked = initial; else target$.val(initial);
        target$.on("change", (function(e) {
            var val = $$1(this).val();
            _$1.set(self, self.switchField, typeof initial === "boolean" ? this.checked || val === "on" : val);
            a$.act(self, self.onSwitching, e);
            e.stopPropagation();
        }));
    }
    function Texter(settings) {
        this.target = $$1(settings.target).find("input").on("change", this.clickHandler());
        this.id = settings.id;
    }
    Texter.prototype.__expects = [ "clickHandler " ];
    Texter.prototype.afterResponse = function() {
        $$1(this.target).val("");
    };
    var defSettings$e = {
        useJson: false,
        renderItem: null
    };
    function SearchReporter(settings) {
        a$.setup(this, defSettings$e, settings);
        this.target = settings.target;
        this.id = settings.id;
        this.manager = null;
        this.facetWidgets = {};
        this.fqName = this.useJson ? "json.filter" : "fq";
    }
    SearchReporter.prototype.init = function(manager) {
        a$.pass(this, SearchReporter, "init", manager);
        this.manager = manager;
    };
    SearchReporter.prototype.registerWidget = function(widget, pivot) {
        this.facetWidgets[widget.id] = pivot;
    };
    SearchReporter.prototype.afterResponse = function(data) {
        var self = this, links = [], q = this.manager.getParameter("q"), fq = this.manager.getAllValues(this.fqName);
        if (!!q.value && !q.value.match(/^(\*:)?\*$/)) {
            links.push(self.renderItem({
                title: q.value,
                count: "x",
                onMain() {
                    q.value = "";
                    self.manager.doRequest();
                    return false;
                }
            }).addClass("tag_fixed"));
        }
        for (var i = 0, l = fq != null ? fq.length : 0; i < l; i++) {
            var f = fq[i], vals = null;
            for (var wid in self.facetWidgets) {
                var w = self.manager.getListener(wid), vals = w.fqParse(f);
                if (!!vals) break;
            }
            if (vals == null) continue;
            if (!Array.isArray(vals)) vals = [ vals ];
            for (var j = 0, fvl = vals.length; j < fvl; ++j) {
                var v = vals[j], el, info = typeof w.prepareTag === "function" ? w.prepareTag(v) : {
                    title: v,
                    count: "x",
                    color: w.color,
                    onMain: w.unclickHandler(v)
                };
                links.push(el = self.renderItem(info).addClass("tag_selected " + (!!info.onAux ? "tag_open" : "tag_fixed")));
                if (fvl > 1) el.addClass("tag_combined");
            }
            if (fvl > 1) el.addClass("tag_last");
        }
        if (links.length) {
            links.push(self.renderItem({
                title: "Clear",
                onMain() {
                    q.value = "";
                    for (var wid in self.facetWidgets) self.manager.getListener(wid).clearValues();
                    self.manager.doRequest();
                    return false;
                }
            }).addClass("tag_selected tag_clear tag_fixed"));
            this.target.empty().addClass("tags").append(links);
        } else this.target.removeClass("tags").html("<li>No filters selected!</li>");
    };
    _$1.assign(jT, _Tools);
    jT.Listing = Listing;
    jT.Loading = Loading;
    jT.Iteming = Iteming;
    jT.AccordionExpander = AccordionExpander;
    jT.Autocompleter = Autocompleter;
    jT.SolrResulter = SolrResulter;
    jT.Logger = Logger;
    jT.Pager = Pager;
    jT.Passer = Passer;
    jT.Pivoter = Pivoter;
    jT.Ranger = Ranger;
    jT.Slider = Slider;
    jT.Switcher = Switcher;
    jT.Tagger = Tagger;
    jT.Texter = Texter;
    jT.SearchReporter = SearchReporter;
    jT.kit = {};
    (typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})["jT"] = jT;
    return jT;
}));