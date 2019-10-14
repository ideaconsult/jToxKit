/** jToxKit - Chem-informatics UI tools, widgets and kits library. Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved. @license MIT.*/
(function(global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory(require("lodash"), require("as-sys"), require("solr-jsx"), require("ambit-jsx"), require("jquery")) : typeof define === "function" && define.amd ? define([ "lodash", "as-sys", "solr-jsx", "ambit-jsx", "jquery" ], factory) : (global = global || self, 
    global.jToxKit = factory(global._, global.asSys, global.Solr, global.Ambit, global.$));
})(this, (function(_$1, a$$1, Solr, Ambit, $$1) {
    "use strict";
    var jT$1 = {
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
            console && console.log("Deduced base URL: " + burl + " (from: " + url.source + ")");
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
        joinDeep(data, field, sep) {
            return _$1.map(data, (function(val) {
                val[field];
            })).join(sep);
        }
    };
    var _Tools = {
        rootSettings: {},
        kitsMap: {},
        templateRoot: null,
        templates: {},
        callId: 0,
        initKit: function(element) {
            var self = this, dataParams = element.data(), kit = dataParams.kit, topSettings = $.extend(true, {}, self.rootSettings), parent = null;
            _$1.each(element.parents(".jtox-kit,.jtox-widget").toArray().reverse(), (function(el) {
                parent = self.getInstance(el);
                if (parent != null) topSettings = $.extend(true, topSettings, parent);
            }));
            if (!parent) parent = self;
            dataParams = $.extend(true, topSettings, dataParams);
            dataParams.baseUrl = self.fixBaseUrl(dataParams.baseUrl);
            dataParams.target = element;
            if (dataParams.id === undefined) dataParams.id = element.attr("id");
            var realInit = function(params) {
                if (!kit) return null;
                var fn = window[kit];
                if (typeof fn !== "function") {
                    kit = kit.charAt(0).toUpperCase() + kit.slice(1);
                    fn = jT$1.kit[kit] || jT$1.widget[kit] || jT$1[kit];
                }
                var obj = null;
                if (typeof fn === "function") obj = new fn(params); else if (typeof fn === "object" && typeof fn.init === "function") obj = fn.init(params);
                if (obj != null) {
                    if (fn.prototype.__kits === undefined) fn.prototype.__kits = [];
                    fn.prototype.__kits.push(obj);
                    obj.parentKit = parent;
                    if (dataParams.id !== null) self.kitsMap[dataParams.id] = obj;
                } else console && console.log("jToxError: trying to initialize unexistent jTox kit: " + kit);
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
                if (typeof dataParams.configuration === "string" && !!window[dataParams.configuration]) {
                    var config = window[dataParams.configuration];
                    $.extend(true, dataParams, typeof config === "function" ? config.call(kit, dataParams, kit) : config);
                }
                var theKit = realInit(dataParams);
                element.data("jtKit", theKit);
                return theKit;
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
                var me$ = $(this);
                if (!me$.data("manualInit")) {
                    var theKit = self.initKit(me$), managerKit = me$.data("jtoxManager");
                    if (!theKit) console && console.log("Referring unknown widget: " + me$.data("kit")); else if (managerKit === "__parent") theKit.parentKit.addListeners(theKit); else if (managerKit != null) {
                        if (!self.kitsMap[managerKit]) console && console.log("'" + me$.attr("id") + "' is binding to unknown kit: " + managerKit); else self.kitsMap[managerKit].addListeners(theKit);
                    }
                }
            };
            $(".jtox-kit", root).each(fnInit);
            $(".jtox-widget", root).each(fnInit);
        },
        getInstance: function(element) {
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
                var kit = self.getInstance(this);
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
        }
    };
    var _Helpers = {
        shortenedData: function(content, message, data) {
            var res = "";
            if (data == null) data = content;
            if (data.toString().length <= 5) {
                res += content;
            } else {
                res += '<div class="shortened">' + content + "</div>";
                if (message != null) res += '<span class="ui-icon ui-icon-copy" title="' + message + '" data-uuid="' + data + '"></span>';
            }
            return res;
        },
        linkedData: function(content, message, data) {
            var res = "";
            if (data == null) {
                data = content;
            }
            if (data.toString().length <= 5) {
                res += content;
            } else {
                if (message != null) {
                    res += res += '<div title="' + message + '">' + content + "</div>";
                } else res += "<div >" + content + "</div>";
            }
            return res;
        },
        changeTabsIds: function(root, suffix) {
            $$1("ul li a", root).each((function() {
                var id = $$1(this).attr("href").substr(1);
                var el = document.getElementById(id);
                id += suffix;
                el.id = id;
                $$1(this).attr("href", "#" + id);
            }));
        },
        addTab: function(root, name, id, content) {
            if (document.getElementById(id) != null) return;
            var li = document.createElement("li");
            var a = document.createElement("a");
            li.appendChild(a);
            a.href = "#" + id;
            a.innerHTML = name;
            $$1("ul", root)[0].appendChild(li);
            if (typeof content == "function") content = content(root); else if (typeof content == "string") {
                var div = document.createElement("div");
                div.innerHTML = content;
                content = div;
            }
            content.id = id;
            root.appendChild(content);
            $$1(root).tabs("refresh");
            return {
                tab: a,
                content: content
            };
        },
        modifyColDef: function(kit, col, category, group) {
            if (col.sTitle === undefined || col.sTitle == null) return null;
            var name = col.sTitle.toLowerCase();
            var getColDef = function(cat) {
                var catCol = kit.configuration.columns[cat];
                if (catCol != null) {
                    if (!!group) {
                        catCol = catCol[group];
                        if (catCol != null) {
                            if (catCol.bVisible != null) {
                                catCol[name] = catCol[name] || {};
                                catCol[name].bVisible = !!catCol[name].bVisible || !!catCol.bVisible;
                            }
                            catCol = catCol[name];
                        }
                    } else {
                        catCol = catCol[name];
                    }
                }
                if (catCol == null) catCol = {};
                return catCol;
            };
            col = $$1.extend(col, !!group ? getColDef("_") : {}, getColDef(category));
            return col.bVisible == null || col.bVisible ? col : null;
        },
        sortColDefs: function(colDefs) {
            for (var i = 0, l = colDefs.length; i < l; ++i) colDefs[i].iNaturalOrder = i;
            colDefs.sort((function(a, b) {
                var res = (a.iOrder || 0) - (b.iOrder || 0);
                if (res == 0) res = a.iNaturalOrder - b.iNaturalOrder;
                return res;
            }));
        },
        processColumns: function(kit, category) {
            var colDefs = [];
            var catList = kit.configuration.columns[category];
            for (var name in catList) {
                var col = this.modifyColDef(kit, catList[name], category);
                if (col != null) colDefs.push(col);
            }
            this.sortColDefs(colDefs);
            return colDefs;
        },
        renderMulti: function(data, type, full, render) {
            var dlen = data.length;
            if (dlen < 2) return render(data[0], type, full);
            var df = "<table>";
            for (var i = 0, dlen = data.length; i < dlen; ++i) {
                df += '<tr class="' + (i % 2 == 0 ? "even" : "odd") + '"><td>' + render(data[i], type, full, i) + "</td></tr>";
            }
            df += "</table>";
            return df;
        },
        inlineChanger: function(location, breed, holder, handler) {
            if (handler == null) handler = "changed";
            if (breed == "select") return function(data, type, full) {
                return type != "display" ? data || "" : '<select class="jt-inlineaction jtox-handler" data-handler="' + handler + '" data-data="' + location + '" value="' + (data || "") + '">' + (holder || "") + "</select>";
            }; else if (breed == "checkbox") return function(data, type, full) {
                return type != "display" ? data || "" : '<input type="checkbox" class="jt-inlineaction jtox-handler" data-handler="' + handler + '" data-data="' + location + '"' + (!!holder && data == holder || !!data ? 'checked="checked"' : "") + '"/>';
            }; else if (breed == "text") return function(data, type, full) {
                return type != "display" ? data || "" : '<input type="text" class="jt-inlineaction jtox-handler" data-handler="' + handler + '" data-data="' + location + '" value="' + (data || "") + '"' + (!holder ? "" : ' placeholder="' + holder + '"') + "/>";
            };
        },
        installMultiSelect: function(root, callback, parenter) {
            if (parenter == null) parenter = function(el) {
                return el.parentNode;
            };
            $$1("a.select-all", root).on("click", (function(e) {
                $$1('input[type="checkbox"]', parenter(this)).each((function() {
                    this.checked = true;
                    if (callback == null) $$1(this).trigger("change");
                }));
                if (callback != null) callback.call(this, e);
            }));
            $$1("a.unselect-all", root).on("click", (function(e) {
                $$1('input[type="checkbox"]', parenter(this)).each((function() {
                    this.checked = false;
                    if (callback == null) $$1(this).trigger("change");
                }));
                if (callback != null) callback.call(this, e);
            }));
        },
        installHandlers: function(kit, root) {
            if (root == null) root = kit.rootElement;
            $$1(".jtox-handler", root).each((function() {
                var name = $$1(this).data("handler");
                var handler = null;
                if (kit.configuration != null && kit.configuration.handlers != null) handler = kit.configuration.handlers[name];
                handler = handler || window[name];
                if (!handler) console && console.log("jToxQuery: referring unknown handler: " + name); else if (this.tagName == "INPUT" || this.tagName == "SELECT" || this.tagName == "TEXTAREA") $$1(this).on("change", handler).on("keydown", jT.enterBlur); else $$1(this).on("click", handler);
            }));
        },
        enterBlur: function(e) {
            if (e.keyCode == 13) this.blur();
        },
        rowData: function(el) {
            var row = $$1(el).closest("tr")[0];
            var table = $$1(row).closest("table")[0];
            return $$1(table).dataTable().fnGetData(row);
        },
        rowIndex: function(el) {
            var row = $$1(el).closest("tr")[0];
            var table = $$1(row).closest("table")[0];
            return $$1(table).dataTable().fnGetPosition(row);
        },
        rowInline: function(el, base) {
            var row = $$1(el).closest("tr")[0];
            var data = $$1.extend({}, base);
            $$1(".jt-inlineaction", row).each((function() {
                var loc = $$1(this).data("data");
                if (loc != null) _$1.set(data, loc, $$1(this).val());
            }));
            return data;
        },
        columnData: function(cols, data, type) {
            var out = new Array(data.length);
            if (type == null) type = "display";
            for (var i = 0, dl = data.length; i < dl; ++i) {
                var entry = {};
                var d = data[i];
                for (var c = 0, cl = cols.length; c < cl; ++c) {
                    var col = cols[c], val = _$1.get(d, col.mData) || col.sDefaultValue;
                    entry[col.sTitle] = typeof col.mRender != "function" ? val : col.mRender(val, type, d);
                }
                out[i] = entry;
            }
            return out;
        },
        queryInfo: function(aoData) {
            var info = {};
            for (var i = 0, dl = aoData.length; i < dl; ++i) info[aoData[i].name] = aoData[i].value;
            if (info.iSortingCols > 0) {
                info.iSortDirection = info.sSortDir_0.toLowerCase();
                info.sSortData = info["mDataProp_" + info.iSortCol_0];
            } else {
                info.iSortDirection = 0;
                info.sSortData = "";
            }
            return info;
        },
        putTable: function(kit, root, config) {
            var self = this, onRow = kit.onRow, opts = $$1.extend({
                bPaginate: false,
                bProcessing: true,
                bLengthChange: false,
                bAutoWidth: false,
                sDom: kit.sDom,
                oLanguage: kit.oLanguage,
                bServerSide: false,
                fnCreatedRow: function(nRow, aData, iDataIndex) {
                    if (typeof onRow == "function") {
                        var res = a$.act(kit, onRow, nRow, aData, iDataIndex);
                        if (res === false) return;
                    }
                    self.equalizeHeights.apply(window, $$1("td.jtox-multi table tbody", nRow).toArray());
                    self.installHandlers(kit, nRow);
                    if (typeof kit.selectionHandler == "function") $$1("input.jt-selection", nRow).on("change", kit.selectionHandler);
                    if (!!kit.onDetails) {
                        $$1(".jtox-details-toggle", nRow).on("click", (function(e) {
                            var root = self.toggleDetails(e, nRow);
                            if (!!root) {
                                a$.act(kit, kit.onDetails, root, aData, this);
                            }
                        }));
                    }
                }
            }, kit.configuration);
            if (opts.aoColumns == null) opts.aoColumns = self.processColumns(kit, config);
            if (opts.oLanguage == null) delete opts.oLanguage;
            var table = $$1(root).dataTable(opts);
            $$1(table).dataTable().fnAdjustColumnSizing();
            return table;
        },
        renderRelation: function(data, type, full) {
            if (type != "display") return this.joinDeep(data, "relation", ",");
            var res = "";
            for (var i = 0, il = data.length; i < il; ++i) res += "<span>" + data[i].relation.substring(4).toLowerCase() + "</span>" + this.putInfo(full.URI + "/composition", data[i].compositionName + "(" + data[i].compositionUUID + ")");
            return res;
        },
        renderRange: function(data, unit, type, prefix) {
            var out = "";
            if (typeof data == "string" || typeof data == "number") {
                out += type != "display" ? data : (!!prefix ? prefix + "&nbsp;=&nbsp;" : "") + this.valueWithUnits(data, unit);
            } else if (typeof data == "object" && data != null) {
                var loValue = _$1.trim(data.loValue), upValue = _$1.trim(data.upValue);
                if (String(loValue) != "" && String(upValue) != "" && !!data.upQualifier && data.loQualifier != "=") {
                    if (!!prefix) {
                        out += prefix + "&nbsp;=&nbsp;";
                    }
                    out += data.loQualifier == ">=" ? "[" : "(";
                    out += loValue + ", " + upValue;
                    out += data.upQualifier == "<=" ? "]" : ") ";
                } else {
                    var fnFormat = function(p, q, v) {
                        var o = "";
                        if (!!p) {
                            o += p + " ";
                        }
                        if (!!q) {
                            o += !!p || q != "=" ? q + " " : "";
                        }
                        return o + v;
                    };
                    if (String(loValue) != "") {
                        out += fnFormat(prefix, data.loQualifier || "=", loValue);
                    } else if (String(upValue) != "") {
                        out += fnFormat(prefix, data.upQualifier || "=", upValue);
                    } else {
                        if (!!prefix) {
                            out += prefix;
                        } else {
                            out += type == "display" ? "-" : "";
                        }
                    }
                }
                out = out.replace(/ /g, "&nbsp;");
                if (type == "display") {
                    unit = _$1.trim(data.unit || unit);
                    if (!!unit) {
                        out += '&nbsp;<span class="units">' + unit.replace(/ /g, "&nbsp;") + "</span>";
                    }
                }
            } else {
                out += "-";
            }
            return out;
        },
        renderObjValue: function(data, units, type, pre) {
            if (!data) {
                return type == "display" ? "-" : "";
            }
            var val = this.renderRange(data, units, type, pre);
            if (_$1.trim(val) == "-") {
                val = "";
            }
            if (val != "" && type != "display" && !!data.units) {
                val += "&nbsp;" + data.units;
            }
            if (!!data.textValue) {
                if (val != "" && type == "display") {
                    val += "&nbsp;/&nbsp;";
                }
                val += data.textValue;
            }
            if (!val) {
                val = "-";
            }
            return val;
        },
        putInfo: function(href, title) {
            return '<sup class="helper"><a target="_blank" href="' + (href || "#") + '" title="' + (title || href) + '"><span class="ui-icon ui-icon-info"></span></a></sup>';
        },
        putStars: function(kit, stars, title) {
            if (!kit.shortStars) {
                var res = '<div title="' + title + '">';
                for (var i = 0; i < kit.maxStars; ++i) {
                    res += '<span class="ui-icon ui-icon-star jtox-inline';
                    if (i >= stars) res += " transparent";
                    res += '"></span>';
                }
                return res + "</div>";
            } else {
                return '<span class="ui-icon ui-icon-star jtox-inline" title="' + title + '"></span>' + stars;
            }
        },
        diagramUri: function(URI) {
            return !!URI && typeof URI == "string" ? URI.replace(/(.+)(\/conformer.*)/, "$1") + "?media=image/png" : "";
        },
        valueWithUnits: function(val, unit) {
            var out = "";
            if (val != null) {
                out += _$1.trim(val.toString()).replace(/ /g, "&nbsp;");
                if (!!unit) out += '&nbsp;<span class="units">' + unit.replace(/ /g, "&nbsp;") + "</span>";
            }
            return out;
        },
        updateCounter: function(str, count, total) {
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
        bindControls: function(kit, handlers) {
            var pane = $$1(".jtox-controls", kit.rootElement)[0];
            if (kit.showControls) {
                this.fillTree(pane, {
                    pagesize: kit.pageSize
                });
                $$1(".next-field", pane).on("click", handlers.nextPage);
                $$1(".prev-field", pane).on("click", handlers.prevPage);
                $$1("select", pane).on("change", handlers.sizeChange);
                var pressTimeout = null;
                $$1("input", pane).on("keydown", (function(e) {
                    var el = this;
                    if (pressTimeout != null) clearTimeout(pressTimeout);
                    pressTimeout = setTimeout((function() {
                        handlers.filter.apply(el, [ e ]);
                    }), 350);
                }));
            } else pane.style.display = "none";
        },
        putActions: function(kit, col, ignoreOriginal) {
            if (!!kit.selectionHandler || !!kit.onDetails) {
                var oldFn = col.mRender;
                var newFn = function(data, type, full) {
                    var html = oldFn(data, type, full);
                    if (type != "display") return html;
                    if (!!ignoreOriginal) html = "";
                    if (!!kit.selectionHandler) html = '<input type="checkbox" value="' + data + '" class="' + (typeof kit.selectionHandler == "string" ? 'jtox-handler" data-handler="' + kit.selectionHandler + '"' : 'jt-selection"') + "/>" + html;
                    if (!!kit.onDetails) html += '<span class="jtox-details-toggle ui-icon ui-icon-folder-collapsed" data-data="' + data + '" title="Press to open/close detailed info for this entry"></span>';
                    return html;
                };
                col.mRender = newFn;
            }
            return col;
        },
        toggleDetails: function(event, row) {
            $$1(event.currentTarget).toggleClass("ui-icon-folder-collapsed");
            $$1(event.currentTarget).toggleClass("ui-icon-folder-open");
            $$1(event.currentTarget).toggleClass("jtox-openned");
            if (!row) row = $$1(event.currentTarget).parents("tr")[0];
            var cell = $$1(event.currentTarget).parents("td")[0];
            if ($$1(event.currentTarget).hasClass("jtox-openned")) {
                var detRow = document.createElement("tr");
                var detCell = document.createElement("td");
                detRow.appendChild(detCell);
                $$1(detCell).addClass("jtox-details");
                detCell.setAttribute("colspan", $$1(row).children().length - 1);
                row.parentNode.insertBefore(detRow, row.nextElementSibling);
                cell.setAttribute("rowspan", "2");
                return detCell;
            } else {
                cell.removeAttribute("rowspan");
                $$1(row).next().remove();
                return null;
            }
        },
        equalizeHeights: function() {
            var tabs = [];
            for (var i = 0; i < arguments.length; ++i) {
                tabs[i] = arguments[i].firstElementChild;
            }
            for (;;) {
                var height = 0;
                for (i = 0; i < tabs.length; ++i) {
                    if (tabs[i] == null) continue;
                    if (!jQuery(tabs[i]).hasClass("lock-height") && tabs[i].style.height != "") tabs[i].style.height = "auto";
                    if (tabs[i].offsetHeight > height) height = tabs[i].offsetHeight;
                }
                if (height == 0) break;
                for (i = 0; i < tabs.length; ++i) {
                    if (tabs[i] != null) {
                        jQuery(tabs[i]).height(height);
                        tabs[i] = tabs[i].nextElementSibling;
                    }
                }
            }
        }
    };
    var defSettings = {
        itemId: "id"
    };
    function Populating(settings) {
        a$$1.setup(this, defSettings = settings);
        this.target = $(settings.target);
        this.length = 0;
        this.clearItems();
    }
    Populating.prototype.__expects = [ "renderItem" ];
    Populating.prototype.populate = function(docs, callback) {
        this.items = docs;
        this.length = docs.length;
        this.target.empty();
        for (var i = 0, l = docs.length; i < l; i++) this.target.append(this.renderItem(typeof callback === "function" ? callback(docs[i]) : docs[i]));
    };
    Populating.prototype.addItem = function(doc) {
        this.items.push(doc);
        ++this.length;
        return this.renderItem(doc);
    };
    Populating.prototype.clearItems = function() {
        this.target.empty();
        this.items = [];
        this.length = 0;
    };
    Populating.prototype.findItem = function(id) {
        var self = this;
        return _$1.findIndex(this.items, typeof id !== "string" ? id : function(doc) {
            return doc[self.itemId] === id;
        });
    };
    Populating.prototype.eraseItem = function(id) {
        var i = this.findItem(id), r = i >= 0 ? this.items.splice(i, 1)[0] : false;
        this.length = this.items.length;
        return r;
    };
    Populating.prototype.enumerateItems = function(callback) {
        var els = this.target.children();
        for (var i = 0, l = this.items.length; i < l; ++i) callback.call(els[i], this.items[i]);
    };
    var defSettings$1 = {
        errorMessage: "Error retrieving data!",
        loadingImgUrl: "images/ajax-loader.gif"
    };
    function Loading(settings) {
        a$$1.setup(this, defSettings$1, settings);
        this.target = settings && settings.target;
    }
    Loading.prototype.__expects = [ "populate" ];
    Loading.prototype.init = function(manager) {
        a$$1.pass(this, Loading, "init", manager);
        this.manager = manager;
    };
    Loading.prototype.beforeRequest = function() {
        $$1(this.target).html('<img src="' + this.loadingImgUrl + '">');
    };
    Loading.prototype.afterResponse = function(data) {
        if (!data) $$1(this.target).html(this.errorMessage); else {
            $$1(this.target).empty();
            this.populate(data.entries);
        }
    };
    var defSettings$2 = {
        template: null,
        classes: null
    };
    function ItemRendering(settings) {
        a$$1.setup(this, defSettings$2, settings);
        this.target = $(settings.target);
    }
    ItemRendering.prototype.renderItem = function(info) {
        return jT$1.fillTemplate(template, info).addClass(this.classes);
    };
    var ajaxDefaults = {
        async: true,
        dataType: "json",
        method: "GET",
        processData: false
    }, defSettings$3 = {
        connector: null,
        serverUrl: "",
        onPrepare: null,
        onError: null,
        onSuccess: null,
        ajaxSettings: null
    };
    function Communicating(settings) {
        a$$1.setup(this, defSettings$3, settings);
        if (!_$1.endsWith(this.serverUrl, "/")) this.serverUrl += "/";
        this.listeners = {};
        this.error = null;
        this.pendingRequests = [];
        this.inRequest = false;
        this.ajaxSettings = _$1.defaults(this.ajaxSettings, ajaxDefaults);
    }
    Communicating.prototype.__expects = [ "prepareQuery" ];
    Communicating.prototype.doRequest = function(servlet, isPrivate, callback) {
        if (this.inRequest) {
            this.pendingRequests.push(arguments);
            return;
        }
        this.inRequest = true;
        if (typeof servlet === "function") {
            callback = servlet;
            isPrivate = false;
            servlet = null;
        } else if (typeof isPrivate === "function") {
            callback = isPrivate;
            isPrivate = false;
        }
        servlet = servlet || this.servlet || "";
        var self = this, cancel = null, ajaxOpts = _$1.defaults(this.prepareQuery(servlet), this.ajaxSettings);
        if (!isPrivate) {
            _$1.each(self.listeners, (function(l) {
                if (a$$1.act(l, l.beforeRequest, ajaxOpts, self) === false) cancel = l;
            }));
            if (cancel !== null) {
                a$$1.act(cancel, self.onError, null, "Request cancelled", cancel, self);
                return;
            }
        }
        ajaxOpts.error = function(jqXHR, status, message) {
            if (typeof callback === "function") callback(null, jqXHR);
            if (!isPrivate) {
                _$1.each(self.listeners, (function(l) {
                    a$$1.act(l, l.afterResponse, null, jqXHR, ajaxOpts, self);
                }));
                a$$1.act(self, self.onError, jqXHR, ajaxOpts);
            }
        };
        ajaxOpts.success = function(response, status, jqXHR) {
            var data = a$$1.act(self, "parseResponse", response) || response;
            if (typeof callback === "function") callback(data, response, jqXHR);
            if (!isPrivate) {
                _$1.each(self.listeners, (function(l) {
                    a$$1.act(l, l.afterResponse, data, jqXHR, ajaxOpts, self);
                }));
                a$$1.act(self, self.onSuccess, data, jqXHR, ajaxOpts);
            }
        };
        ajaxOpts.complete = function() {
            self.inRequest = false;
            if (self.pendingRequests.length > 0) self.doRequest.apply(self, self.pendingRequests.shift());
        };
        a$$1.broadcast(self, "onPrepare", ajaxOpts);
        a$$1.act(self, self.onPrepare, ajaxOpts);
        return self.connector(ajaxOpts);
    };
    Communicating.prototype.buildUrl = function(servlet, params) {
        return this.serverUrl + this.addUrlParameters(servlet || "", params);
    };
    Communicating.prototype.addUrlParameters = function(baseUrl, params) {
        if (!params || !params.length) return baseUrl; else if (typeof params !== "string") params = params.join("&") || "";
        return baseUrl + (baseUrl.indexOf("?") > 0 ? "&" : "?") + params;
    };
    Communicating.prototype.init = function() {
        var self = this;
        a$$1.pass(self, Communicating, "init");
        _$1.each(this.listeners, (function(l) {
            a$$1.act(l, l.init, self);
        }));
    };
    Communicating.prototype.addListeners = function(one) {
        var listener = one;
        if (arguments.length > 1) listener = arguments; else if (!Array.isArray(one)) listener = [ one ]; else listener = one;
        for (var l, i = 0, ll = listener.length; i < ll; ++i) {
            l = listener[i];
            this.listeners[l.id] = l;
        }
        return this;
    };
    Communicating.prototype.removeOneListener = function(listener) {
        if (typeof listener === "object") listener = listener.id;
        delete this.listeners[listener];
        return this;
    };
    Communicating.prototype.removeListeners = function(selector, context) {
        if (typeof selector !== "function") throw {
            name: "Enumeration error",
            message: "Attempt to select-remove listeners with non-function 'selector': " + selector
        };
        var self = this;
        _$1.each(self.listeners, (function(l, id) {
            if (selector.call(context, l, id, self)) delete self.listeners[id];
        }));
        return self;
    };
    Communicating.prototype.enumerateListeners = function(callback, context) {
        if (typeof callback !== "function") throw {
            name: "Enumeration error",
            message: "Attempt to enumerate listeners with non-function 'selector': " + callback
        };
        var self = this;
        _$1.each(this.listeners, (function(l, id) {
            callback.call(context, l, id, self);
        }));
    };
    Communicating.prototype.getListener = function(id) {
        return this.listeners[id];
    };
    var defSettings$4 = {
        delay: 300
    };
    function Delaying(settings) {
        a$$1.setup(this, defSettings$4, settings);
        this.delayTimer = null;
    }
    Delaying.prototype.doRequest = function(a, b, c, d) {
        var self = this, doInvoke = function() {
            a$$1.pass(self, Delaying, "doRequest", a, b, c, d);
            self.delayTimer = null;
        };
        if (this.delay == null || this.delay < 10) return doInvoke(); else if (this.delayTimer != null) clearTimeout(this.delayTimer);
        this.delayTimer = setTimeout(doInvoke, this.delay);
    };
    function Authenticating(settings) {
        a$$1.setup(this, Authenticating.prototype, settings);
        if (settings.authMethod === "Basic") {
            _$1.extend(this.ajaxSettings, {
                headers: {
                    Authorization: "Basic " + btoa(this.username + ":" + this.password)
                }
            });
        }
    }
    Authenticating.prototype = {
        username: null,
        password: null,
        authMethod: null,
        ajaxSettings: null
    };
    var defSettings$5 = {
        servlet: null,
        privateRequest: false,
        onSpyResponse: null
    };
    function Spying(settings) {
        a$$1.setup(this, defSettings$5, settings);
        this.manager = null;
    }
    Spying.prototype.init = function(manager) {
        a$$1.pass(this, Spying, "init", manager);
        this.manager = manager;
    };
    Spying.prototype.doSpying = function(settings, callback) {
        var man = this.manager;
        man.pushParameters(true);
        if (typeof settings === "function") settings(man); else _$1.each(settings, (function(v, k) {
            if (v == null) man.removeParameters(k); else if (Array.isArray(v)) _$1.each(v, (function(vv) {
                man.addParameter(k, vv);
            })); else if (typeof v === "object") man.addParameter(v); else man.addParameter(k, v);
        }));
        man.doRequest(this.servlet, this.privateRequest, callback || this.onSpyResponse);
        man.popParameters();
    };
    var defSettings$6 = {
        automatic: true,
        title: null,
        classes: null,
        expansionTemplate: null,
        before: null
    };
    function AccordionExpander(settings) {
        a$$1.setup(this, defSettings$6, settings);
        this.target = $$1(settings.target);
        this.header = null;
        this.id = settings.id;
        if (this.automatic) settings.target = this.makeExpansion();
    }
    AccordionExpander.prototype.renderExpansion = function(info) {
        return jT$1.fillTemplate(this.expansionTemplate, info).addClass(this.classes);
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
    var defSettings$7 = {
        servlet: "select",
        urlFeed: null,
        useJson: false,
        maxResults: 30,
        activeFacets: null
    };
    function Autocompleter(settings) {
        a$$1.setup(this, defSettings$7, settings);
        this.target = $$1(settings.target);
        this.id = settings.id;
        this.lookupMap = settings.lookupMap || {};
        this.parameters = _.assign({}, defaultParameters);
        this.facetPath = this.useJson ? "facets" : "facet_counts.facet_fields";
        if (!this.useJson) this.parameters["json.nl"] = "map";
    }
    Autocompleter.prototype.__expects = [ "addValue", "doSpying" ];
    Autocompleter.prototype.init = function(manager) {
        a$$1.pass(this, Autocompleter, "init", manager);
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
    Autocompleter.prototype.afterResponse = function() {
        var qval = this.manager.getParameter("q").value || "";
        this.findBox.val(qval != "*:*" && qval.length > 0 ? qval : "").autocomplete("enable");
        this.requestSent = false;
    };
    function buildServiceId(params) {
        var url = jT$1.parseURL(params.url);
        return url.protocol + "://" + url.host + url.path;
    }
    var defSettings$8 = {
        statusDelay: 1500,
        keepMessages: 50,
        lineHeight: "20px",
        rightSide: false,
        hasDetails: true,
        autoHide: true
    };
    function Logger(settings) {
        a$$1.setup(this, defSettings$8, settings);
        var root$ = $$1(this.target = settings.target);
        root$.html(jT$1.templates["logger-main"]);
        root$.addClass("jtox-toolkit jtox-log");
        this.id = root$.attr("id");
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
    }
    Logger.prototype.formatEvent = function(params, jhr) {
        if (jhr != null) return {
            details: jhr.status + " " + jhr.statusText + "<br/>" + jhr.getAllResponseHeaders()
        }; else if (params != null) return {
            header: params.method.toUpperCase() + ": " + buildServiceId(params),
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
        var self = this, el$ = jT$1.fillTemplate("#jtox-logline", data);
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
        var info = this.formatEvent(params), line$ = this.addLine(info);
        this.setStatus("connecting");
        this.events[params.logId = Date.now()] = line$;
        this.setIcon(line$, "connecting");
        line$.data("status", "connecting");
    };
    Logger.prototype.afterResponse = function(response, jhr, params) {
        var info = this.formatEvent(params, jhr), line$ = this.events[params.logId], status = !!response ? "success" : "error";
        this.setStatus(status);
        if (!line$) {
            console && console.log("jToxLog: missing line for:" + buildServiceId(params) + "(" + jhr.statusText + ")");
            return;
        }
        delete this.events[params.logId];
        this.setIcon(line$, status);
        jT$1.fillTree(line$[0], info);
        if (status == "error") console && console.log("Error [" + buildServiceId(params) + "]: " + jhr.statusText);
    };
    Logger.prototype.mountOnHandlers = function(dest) {
        var self = this;
        if (typeof dest === "string") dest = _$1.get(window, dest); else if (typeof dest === "function") dest = dest.prototype; else if (typeof dest !== "object") throw {
            name: "Wrong argument",
            message: "Passed object for mounting [" + dest + "] cannot be resolved to an object!"
        };
        dest.onPrepare = function(params) {
            return self.beforeRequest(params);
        };
        dest.onSuccess = function(data, jqXHR, params) {
            return self.afterResponse(data, jqXHR, params, this);
        };
        dest.onError = function(jqXHR, params) {
            return self.afterResponse(null, jqXHR, params, this);
        };
        return dest;
    };
    var defSettings$9 = {
        innerWindow: 4,
        outerWindow: 1,
        prevLabel: "&laquo; Previous",
        nextLabel: "Next &raquo;",
        separator: " ",
        renderHeader() {}
    };
    function Pager(settings) {
        a$$1.setup(this, defSettings$9, settings);
        this.target = $(settings.target);
        this.id = settings.id;
        this.manager = null;
    }
    Pager.prototype.__expects = [ "nextPage", "previousPage" ];
    Pager.prototype.gapMarker = function() {
        return '<span class="pager-gap">&hellip;</span>';
    };
    Pager.prototype.windowedLinks = function() {
        var links = [], prev = null, visible = this.visiblePageNumbers();
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
    Pager.prototype.afterResponse = function(data, jhr, params) {
        a$$1.pass(this, Pager, "afterResponse", data, jhr, params);
        $(this.target).empty();
        this.renderLinks(this.windowedLinks());
        this.renderHeader(this.pageSize, (this.currentPage - 1) * this.pageSize, this.totalEntries);
    };
    var defSettings$a = {
        runSelector: ".switcher",
        runMethod: null,
        runTarget: null
    };
    function Passer(settings) {
        a$$1.setup(this, defSettings$a, settings);
        var self = this, target$ = $$1(self.runSelector, $$1(settings.target)[0]), runTarget = self.runTarget || self;
        target$.on("click", (function(e) {
            a$$1.act(runTarget, self.runMethod, this, e);
            e.stopPropagation();
        }));
    }
    var defSettings$b = {
        color: null,
        renderItem: null,
        onUpdated: null,
        subtarget: null
    };
    function Tagger(settings) {
        a$$1.setup(this, defSettings$b, settings);
        this.target = $$1(settings.target);
        if (!!this.subtarget) this.target = this.target.find(this.subtarget).eq(0);
        this.id = settings.id;
        this.color = this.color || this.target.data("color");
        if (!!this.color) this.target.addClass(this.color);
    }
    Tagger.prototype.__expects = [ "hasValue", "clickHandler" ];
    Tagger.prototype.init = function(manager) {
        a$$1.pass(this, Tagger, "init", manager);
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
        a$$1.act(this, this.onUpdated, total);
    };
    function buildValueRange(stats, isUnits) {
        var vals = " = ";
        vals += stats.min == null ? "-&#x221E;" : stats.min;
        if (!!stats.avg) vals += "&#x2026;" + stats.avg;
        vals += "&#x2026;" + (stats.max == null ? "&#x221E;" : stats.max);
        if (isUnits) vals += " " + jT$1.formatUnits(stats.val).replace(/<sup>(2|3)<\/sup>/g, "&#x00B$1;").replace(/<sup>(\d)<\/sup>/g, "^$1");
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
    var InnerTagWidget = a$$1(Tagger, InnterTagger), iDificationRegExp = /\W/g, defSettings$c = {
        automatic: false,
        renderTag: null,
        multivalue: false,
        aggregate: false,
        exclusion: false
    };
    function Pivoter(settings) {
        a$$1.setup(this, defSettings$c, settings);
        this.target = settings.target;
        this.targets = {};
        this.lastEnabled = 0;
        this.initialPivotCounts = null;
    }
    Pivoter.prototype.__expects = [ "getFaceterEntry", "getPivotEntry", "getPivotCounts", "auxHandler" ];
    Pivoter.prototype.init = function(manager) {
        a$$1.pass(this, Pivoter, "init", manager);
        this.manager = manager;
        this.manager.getListener("current").registerWidget(this, true);
    };
    Pivoter.prototype.addFaceter = function(info, idx) {
        var f = a$$1.pass(this, Pivoter, "addFaceter", info, idx);
        if (typeof info === "object") f.color = info.color;
        if (idx > this.lastEnabled && !info.disabled) this.lastEnabled = idx;
        return f;
    };
    Pivoter.prototype.afterResponse = function(data, jhr, params) {
        var pivot = this.getPivotCounts(data.facets);
        a$$1.pass(this, Pivoter, "afterResponse", data, jhr, params);
        for (var i = 0; i < pivot.length; ++i) {
            var p = pivot[i], pid = p.val.replace(iDificationRegExp, "_"), target = this.targets[pid];
            if (!target) {
                this.targets[pid] = target = new jT$1.AccordionExpander($$1.extend(true, {}, this.settings, this.getFaceterEntry(0), {
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
            hdr.textContent = jT$1.updateCounter(hdr.textContent, count);
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
                    cont$ = jT$1.fillTemplate($$1("#tag-facet"), faceter).attr("id", fid);
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
    var defSettings$d = {
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
        a$$1.setup(this, defSettings$d, settings);
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
        var self = this, enabled = this.limits[1] > this.limits[0], scale = [ jT$1.formatNumber(this.limits[0], this.precision), this.title + (enabled || !this.units ? "" : " (" + this.units + ")"), jT$1.formatNumber(this.limits[1], this.precision) ], updateHandler = self.updateHandler(), settings = {
            from: this.limits[0],
            to: this.limits[1],
            step: this.precision,
            scale: scale,
            showScale: this.showScale,
            showLabels: enabled,
            disable: !enabled,
            isRange: this.isRange,
            width: this.width,
            format: jT$1.formatString(this.format, this) || ""
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
    var SingleRangeWidget = a$$1(Solr.Ranging, Solr.Patterning, Slider, SimpleRanger, Delaying), defaultParameters$1 = {
        facet: true,
        rows: 0,
        fl: "id",
        "facet.limit": -1,
        "facet.mincount": 1,
        echoParams: "none"
    }, defSettings$e = {
        field: null,
        titleSkips: null
    };
    function Ranger(settings) {
        a$$1.setup(this, defSettings$e, settings);
        this.slidersTarget = $$1(settings.slidersTarget);
        this.lookupMap = settings.lookupMap || {};
        this.pivotMap = null;
        this.rangeWidgets = [];
        if (!Array.isArray(this.titleSkips)) this.titleSkips = [ this.titleSkips ];
    }
    Ranger.prototype.__expects = [ "getPivotEntry", "getPivotCounts" ];
    Ranger.prototype.init = function(manager) {
        a$$1.pass(this, Ranger, "init", manager);
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
    Ranger.prototype.afterResponse = function(data, jhr, params) {
        var pivot = this.getPivotCounts(data.facets);
        a$$1.pass(this, Ranger, "afterResponse", data, jhr, params);
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
            var all = entry[i], ref = current[i], setup = {}, w, el$ = jT$1.fillTemplate("#slider-one");
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
            setup.units = ref.id == "unit" ? jT$1.formatUnits(ref.val) : "";
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
        a$$1.pass(this, Ranger, "clearValues");
    };
    var defSettings$f = {
        switchSelector: ".switcher",
        switchField: null,
        onSwitching: null
    };
    function Switcher(settings) {
        a$$1.setup(this, defSettings$f, settings);
        var self = this, target$ = $$1(self.switchSelector, $$1(settings.target)[0]), initial = _$1.get(self, self.switchField);
        if (typeof initial === "boolean") target$[0].checked = initial; else target$.val(initial);
        target$.on("change", (function(e) {
            var val = $$1(this).val();
            _$1.set(self, self.switchField, typeof initial === "boolean" ? this.checked || val === "on" : val);
            a$$1.act(self, self.onSwitching, e);
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
    var defSettings$g = {
        useJson: false,
        renderItem: null
    };
    function SolrQueryReporter(settings) {
        a$$1.setup(this, defSettings$g, settings);
        this.target = settings.target;
        this.id = settings.id;
        this.manager = null;
        this.facetWidgets = {};
        this.fqName = this.useJson ? "json.filter" : "fq";
    }
    SolrQueryReporter.prototype.init = function(manager) {
        a$$1.pass(this, SolrQueryReporter, "init", manager);
        this.manager = manager;
    };
    SolrQueryReporter.prototype.registerWidget = function(widget, pivot) {
        this.facetWidgets[widget.id] = pivot;
    };
    SolrQueryReporter.prototype.afterResponse = function() {
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
    var htmlLink = '<a href="{{href}}" title="{{hint}}" target="{{target}}" class="{{css}}">{{value}}</a>', plainLink = '<span title="{{hint}}" class="{{css}}">{{value}}</span>', defSettings$h = {
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
                        return jT$1.formatString(htmlLink, {
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
                        return jT$1.formatString(link.match(/^https?:\/\//) ? htmlLink : plainLink, {
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
    function SolrItemLister(settings) {
        a$$1.setup(this, defSettings$h, settings);
        this.baseUrl = jT$1.fixBaseUrl(settings.baseUrl) + "/";
        this.lookupMap = settings.lookupMap || {};
        this.target = settings.target;
        this.id = settings.id;
    }
    SolrItemLister.prototype.renderItem = function(doc) {
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
    SolrItemLister.prototype.renderSubstance = function(doc) {
        var summaryhtml = $$1("#summary-item").html(), summarylist = this.buildSummary(doc), baseUrl = this.getBaseUrl(doc), summaryRender = function(summarylist) {
            return summarylist.map((function(s) {
                return jT$1.formatString(summaryhtml, s);
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
        return jT$1.fillTemplate("#result-item", item);
    };
    SolrItemLister.prototype.getBaseUrl = function(doc) {
        if (this.tagDbs[doc.dbtag_hss] !== undefined) {
            var url = this.tagDbs[doc.dbtag_hss].server, lastChar = url.substr(-1);
            return url + (lastChar != "/" ? "/substance/" : "substance/");
        } else {
            return this.baseUrl;
        }
    };
    SolrItemLister.prototype.renderComposition = function(doc, defValue) {
        var summary = [], composition = doc._extended_ && doc._extended_.composition;
        if (!!composition) {
            var cmap = {};
            _.each(composition, (function(c) {
                var ce = cmap[c.component_s], se = [];
                if (ce === undefined) cmap[c.component_s] = ce = [];
                _.each(c, (function(v, k) {
                    var m = k.match(/^(\w+)_[shd]+$/);
                    k = m && m[1] || k;
                    if (!k.match(/type|id|component/)) se.push(jT$1.formatString(htmlLink, {
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
    SolrItemLister.prototype.buildSummary = function(doc) {
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
    var htmlRoot = "<table></table>", defSettings$i = {
        id: null,
        target: null,
        shortStars: false,
        maxStars: 10,
        selectionHandler: null,
        sDom: "<Fif>rt",
        loadOnInit: false,
        oLanguage: null,
        configuration: {
            columns: {
                model: {
                    Id: {
                        iOrder: 0,
                        sTitle: "Id",
                        mData: "URI",
                        sWidth: "50px",
                        mRender: function(data, type, full) {
                            return type != "display" ? full.id : '<a target="_blank" href="' + data + '"><span class="ui-icon ui-icon-link jtox-inline"></span> M' + full.id + "</a>";
                        }
                    },
                    Title: {
                        iOrder: 1,
                        sTitle: "Title",
                        mData: "title",
                        sDefaultContent: "-"
                    },
                    Stars: {
                        iOrder: 2,
                        sTitle: "Stars",
                        mData: "stars",
                        sWidth: "160px"
                    },
                    Algorithm: {
                        iOrder: 3,
                        sTitle: "Algorithm",
                        mData: "algorithm"
                    },
                    Info: {
                        iOrder: 4,
                        sTitle: "Info",
                        mData: "trainingDataset",
                        mRender: function(data, type, full) {
                            return type != "display" || !data ? data : '<a href="' + data + '"><span class="ui-icon ui-icon-calculator"></span>&nbsp;training set</a>';
                        }
                    }
                },
                algorithm: {
                    Id: {
                        iOrder: 0,
                        sTitle: "Id",
                        mData: "uri",
                        sWidth: "150px",
                        mRender: function(data, type, full) {
                            return type != "display" ? full.id : '<a target="_blank" href="' + data + '"><span class="ui-icon ui-icon-link jtox-inline"></span> ' + full.id + "</a>";
                        }
                    },
                    Title: {
                        iOrder: 1,
                        sTitle: "Title",
                        mData: "name",
                        sDefaultContent: "-"
                    },
                    Description: {
                        iOrder: 2,
                        sTitle: "Description",
                        sClass: "shortened",
                        mData: "description",
                        sDefaultContent: "-"
                    },
                    Info: {
                        iOrder: 3,
                        sTitle: "Info",
                        mData: "format",
                        mRender: function(data, type, full) {
                            if (type != "display" || !data) return data;
                            return "<strong>" + data + "</strong>; " + (full.isSupevised ? "<strong>Supervised</strong>; " : "") + '<a target="_blank" href="' + full.implementationOf + '">' + full.implementationOf + "</a>";
                        }
                    }
                }
            }
        }
    };
    function AmbitModelViewer(settings) {
        a$$1.setup(this, defSettings$i, settings);
        this.root$ = $$1(settings && settings.target);
    }
    AmbitModelViewer.prototype.__expects = [ "doRequest", "serviceId" ];
    AmbitModelViewer.prototype.init = function(manager) {
        var self = this;
        a$$1.pass(this, AmbitModelViewer, "init", manager);
        self.manager = manager;
        this.root$.addClass("jtox-toolkit").append(htmlRoot).addClass("jtox-model");
        if (self.serviceId === "algorithm") {
            self.configuration.columns.model.Stars.mRender = function(data, type, full) {
                return type != "display" ? data : _Helpers.putStars(self, data, "Model star rating (worst) 1 - 10 (best)");
            };
            if (self.shortStars) self.configuration.columns.model.Stars.sWidth = "40px";
            self.configuration.columns.model.Algorithm.mRender = function(data, type) {
                var name = data.URI.match(/https{0,1}:\/\/.*\/algorithm\/(\w+).*/)[1];
                if (type != "display") return name;
                var res = '<a target="_blank" href="' + data.URI + '">' + '<img src="' + manager.baseUrl + data.img + '"/>&nbsp;' + name + "</a>";
                if (self.algorithmLink) {
                    res += '<a href="' + ccLib.addParameter(self.modelUri, "algorithm=" + encodeURIComponent(data.URI)) + '"><span class="ui-icon ui-icon-calculator float-right" title="Show models using algorithm ' + name + '"></span></a>';
                }
                return res;
            };
        }
        if (!!self.selectionHandler || !!self.onDetails) {
            _Helpers.putActions(self, self.configuration.columns[self.serviceId].Id);
            self.configuration.columns[self.serviceId].Id.sWidth = "60px";
        }
        if (!self.oLanguage) self.oLanguage = {
            sLoadingRecords: "No " + this.serviceId + " found.",
            sZeroRecords: "No " + this.serviceId + " found.",
            sEmptyTable: "No " + this.serviceId + " available.",
            sInfo: "Showing _TOTAL_ " + this.serviceId + "(s) (_START_ to _END_)"
        };
        self.table = _Helpers.putTable(self, self.root$.children("table")[0], this.serviceId);
        if (this.loadOnInit) self.doRequest();
    };
    AmbitModelViewer.prototype.populate = function(data) {
        $$1(this.table).dataTable().fnAddData(data);
    };
    AmbitModelViewer.prototype.beforeRequest = function(opts) {
        if (opts.serviceId === self.serviceId) {
            this.root$.find('input[type="checkbox"]').each((function() {
                if (this.checked) uri = ccLib.addParameter(uri, "feature_uris[]=" + encodeURIComponent(this.value + "/predicted"));
            }));
            $$1(self.table).dataTable().fnClearTable();
            return uri;
        }
    };
    _$1.assign(jT$1, _Tools, _Helpers);
    jT$1.Populating = Populating;
    jT$1.Loading = Loading;
    jT$1.ItemRendering = ItemRendering;
    jT$1.Communicating = Communicating;
    jT$1.Delaying = Delaying;
    jT$1.Authenticating = Authenticating;
    jT$1.Spying = Spying;
    jT$1.AccordionExpander = AccordionExpander;
    jT$1.Autocompleter = Autocompleter;
    jT$1.Logger = Logger;
    jT$1.Pager = Pager;
    jT$1.Passer = Passer;
    jT$1.Pivoter = Pivoter;
    jT$1.Ranger = Ranger;
    jT$1.Slider = Slider;
    jT$1.Switcher = Switcher;
    jT$1.Tagger = Tagger;
    jT$1.Texter = Texter;
    jT$1.SolrQueryReporter = SolrQueryReporter;
    jT$1.SolrItemLister = SolrItemLister;
    jT$1.AmbitModelViewer = AmbitModelViewer;
    jT$1.widget = {
        SolrResult: a$$1(Solr.Listing, Populating, SolrItemLister, Loading),
        SolrPaging: a$$1(Solr.Paging, Pager),
        Logger: Logger,
        AmbitModeller: a$$1(AmbitModelViewer, Ambit.Modelling, Ambit.Tasking),
        AmbitAlgorithmer: a$$1(AmbitModelViewer, Ambit.Algorithming)
    };
    jT$1.kit = {};
    (typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})["jT"] = jT$1;
    return jT$1;
}));