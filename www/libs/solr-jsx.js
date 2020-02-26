/** SolrJsX library - a neXt, lightweight Solr queries JavaScript library. Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved. @license MIT.*/
(function(global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory(require("as-sys"), require("lodash")) : typeof define === "function" && define.amd ? define([ "as-sys", "lodash" ], factory) : (global = global || self, 
    global.Solr = factory(global.asSys, global._));
})(this, (function(a$$1, _$1) {
    "use strict";
    var bracketsRegExp = /^\s*\(\s*|\s*\)\s*$/g, statsRegExp = /^([^()]+)\(([^)]+)\)$/g;
    var Solr$1 = {
        version: "1.0.1",
        escapeValue(value) {
            if (typeof value !== "string") value = value.toString();
            if (value.match(/[ :\/"]/) && !value.match(/[\[\{]\S+ TO \S+[\]\}]/) && !value.match(/^["\(].*["\)]$/)) {
                return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
            }
            return value;
        },
        escapeField(field) {
            return field.replace(/\s/g, "\\$&");
        },
        parseParameter(str) {
            var param = {}, parse = str.match(/^([^=]+)=(?:\{!([^\}]*)\})?(.*)$/);
            if (parse) {
                if (parse[2] != null) {
                    var matches;
                    while (matches = /([^\s=]+)=?(\S*)?/g.exec(parse[2])) {
                        if (param.domain === undefined) param.domain = {};
                        if (matches[2] == null) param.domain["type"] = matches[1]; else param.domain[matches[1]] = matches[2];
                        parse[2] = parse[2].replace(matches[0], "");
                    }
                }
                param.name = parse[1];
                var arr = parse[3].split(",");
                param.value = arr.length > 1 ? arr : parse[3];
            }
            return param;
        },
        facetValue(value) {
            if (!Array.isArray(value)) return Solr.escapeValue(value); else if (value.length == 1) return Solr.escapeValue(value[0]); else return "(" + value.map((function(v) {
                return Solr.escapeValue(v);
            })).join(" ") + ")";
        },
        parseFacet(value) {
            var old = value.length, sarr, brackets;
            value = value.replace(bracketsRegExp, "");
            brackets = old > value.length;
            sarr = value.replace(/\\"/g, "%0022").match(/[^\s:\/"]+|"[^"]+"/g);
            if (!brackets && sarr.length > 1) return null;
            for (var i = 0, sl = sarr.length; i < sl; ++i) sarr[i] = sarr[i].replace(/^"|"$/g, "").replace("%0022", '"');
            return sl > 1 ? sarr : sarr[0];
        },
        facetStats(manager, tag, statistics) {
            manager.addParameter("stats", true);
            var statLocs = {};
            _.each(statistics, (function(stats, key) {
                var parts = stats.match(statsRegExp);
                if (!parts) return;
                var field = parts[2], func = parts[1], loc = statLocs[field];
                if (loc === undefined) {
                    statLocs[field] = loc = {};
                    loc.tag = tag;
                }
                loc[func] = true;
                loc.key = key;
            }));
            _.each(statLocs, (function(s, f) {
                manager.addParameter("stats.field", f, s);
            }));
        },
        stringifyDomain(param) {
            var prefix = [];
            _.each(param.domain, (function(l, k) {
                prefix.push((k !== "type" ? k + "=" : "") + l);
            }));
            return prefix.length > 0 ? "{!" + prefix.join(" ") + "}" : "";
        },
        stringifyValue(param) {
            var value = param.value || "";
            if (Array.isArray(value)) return value.join(","); else if (typeof value !== "object") return value.toString(); else {
                var str = [];
                _.each(value, (function(v, k) {
                    str.push(Solr.escapeField(k) + ":" + Solr.escapeValue(v));
                }));
                return str.join(" ");
            }
        },
        stringifyParameter(param) {
            var prefix = Solr.stringifyDomain(param);
            return param.value || prefix ? param.name + "=" + encodeURIComponent(prefix + Solr.stringifyValue(param)) : null;
        }
    };
    var paramIsMultiple = function(name) {
        return name.match(/^(?:bf|bq|facet\.date|facet\.date\.other|facet\.date\.include|facet\.field|facet\.pivot|facet\.range|facet\.range\.other|facet\.range\.include|facet\.query|fq|fl|json\.query|json\.filter|group\.field|group\.func|group\.query|pf|qf|stats\.field)$/);
    };
    function Configuring(settings) {
        this.parameterHistory = [];
        this.resetParameters();
        this.mergeParameters(settings && settings.parameters);
    }
    Configuring.prototype.addParameter = function(param, value, domain) {
        var name;
        if (typeof param !== "object") {
            name = param;
            param = {
                name: param,
                value: value
            };
            if (domain != null) param.domain = domain;
        } else name = param.name;
        if (paramIsMultiple(name)) {
            if (this.parameterStore[name] === undefined) this.parameterStore[name] = [ param ]; else {
                var found = false;
                _$1.each(this.parameterStore[name], (function(p) {
                    found = found || a$$1.equal(true, param, p);
                }));
                if (!found) this.parameterStore[name].push(param); else return false;
            }
        } else this.parameterStore[name] = param;
        return param;
    };
    Configuring.prototype.findParameters = function(name, needle) {
        var indices = [], filter;
        if (this.parameterStore[name] !== undefined) {
            if (typeof needle === "function") {
                filter = function(p, i) {
                    if (needle(p, i)) indices.push(i);
                };
            } else if (needle == null) {
                filter = function(p, i) {
                    indices.push(i);
                };
            } else {
                if (typeof needle !== "object" || needle instanceof RegExp || Array.isArray(needle)) needle = {
                    value: needle
                };
                filter = function(p, i) {
                    if (a$$1.similar(p, needle)) indices.push(i);
                };
            }
            _$1.each(paramIsMultiple(name) ? this.parameterStore[name] : [ this.parameterStore[name] ], filter);
        }
        return indices;
    };
    Configuring.prototype.removeParameters = function(name, indices) {
        if (this.parameterStore[name] !== undefined) {
            if (typeof indices === "number") indices = [ indices ]; else if (!Array.isArray(indices)) indices = this.findParameters(name, indices);
            if (!paramIsMultiple(name) || indices.length == this.parameterStore[name].length) delete this.parameterStore[name]; else {
                indices.sort((function(a, b) {
                    return a < b ? -1 : a > b ? 1 : 0;
                }));
                for (var i = indices.length - 1; i >= 0; --i) this.parameterStore[name].splice(indices[i], 1);
            }
            return indices.length;
        } else return false;
    };
    Configuring.prototype.getParameter = function(name, index) {
        var multi = paramIsMultiple(name);
        if (this.parameterStore[name] === undefined) return multi && index == null ? [] : {
            name: name
        }; else return index == null || !multi ? this.parameterStore[name] : this.parameterStore[name][index];
    };
    Configuring.prototype.getAllValues = function(name) {
        var val = null;
        if (this.parameterStore[name] !== undefined) val = !paramIsMultiple(name) ? this.parameterStore[name].value : this.parameterStore[name].map((function(p) {
            return p.value;
        }));
        return val;
    };
    Configuring.prototype.mergeParameters = function(parameters) {
        var self = this;
        _$1.each(parameters, (function(p, name) {
            if (typeof p === "string") self.addParameter(Solr$1.parseParameter(name + "=" + p)); else self.addParameter(name, p);
        }));
    };
    Configuring.prototype.enumerateParameters = function(deep, callback) {
        if (typeof deep !== "boolean") {
            callback = deep;
            deep = true;
        }
        _$1.each(this.parameterStore, (function(p) {
            if (deep && Array.isArray(p)) _$1.each(p, callback); else if (p !== undefined) callback(p);
        }));
    };
    Configuring.prototype.resetParameters = function() {
        this.parameterStore = {};
    };
    Configuring.prototype.pushParameters = function(copy) {
        this.parameterHistory.push(this.parameterStore);
        if (typeof copy === "object") this.parameterStore = copy; else if (copy === false) this.parameterStore = {}; else this.parameterStore = _$1.merge({}, this.parameterStore);
    };
    Configuring.prototype.popParameters = function() {
        var ret = this.parameterStore;
        this.parameterStore = this.parameterHistory.pop();
        return ret;
    };
    var defSettings = {
        store: {
            addByValue: function(name, value, locals) {
                return this.root.addParameter(name, value, locals);
            },
            removeByValue: function(name, value) {
                return this.root.removeParameters(name, indices);
            },
            find: function(name, needle) {
                return this.root.findParameters(name, neddle);
            }
        }
    };
    function Compatibility(settings) {
        a$$1.setup(this, defSettings, settings);
        this.store.root = this;
    }
    var defSettings$1 = {
        serverUrl: null,
        servlet: "select"
    };
    function QueryingURL(settings) {
        a$$1.setup(this, defSettings$1, settings);
    }
    QueryingURL.prototype.__expects = [ "enumerateParameters", "buildUrl" ];
    QueryingURL.prototype.prepareQuery = function(servlet) {
        var query = [];
        this.enumerateParameters((function(param) {
            var p = Solr$1.stringifyParameter(param);
            if (p != null) query.push(p);
        }));
        return {
            url: this.buildUrl(servlet || this.servlet, query)
        };
    };
    QueryingURL.prototype.parseResponse = function(response) {
        return response;
    };
    var paramIsUrlOnly = function(name) {
        return name.match(/^(json\.nl|json\.wrf|q|wt|start)/);
    };
    var paramJsonName = function(name) {
        var m = name.match(/^json\.?(.*)/);
        return m && m[1];
    };
    var defSettings$2 = {
        useBody: true,
        servlet: "select",
        serverUrl: null
    };
    function QueryingJson(settings) {
        a$$1.setup(this, defSettings$2, settings);
    }
    QueryingJson.prototype.__expects = [ "enumerateParameters", "buildUrl" ];
    QueryingJson.prototype.prepareQuery = function() {
        var query = [], json = {
            params: {}
        }, paramValue = function(param) {
            if (paramIsUrlOnly(param.name)) {
                query.push(Solr$1.stringifyParameter(param));
                return;
            }
            var val = null;
            if (typeof param.value === "string") val = Solr$1.stringifyDomain(param) + param.value; else if (param.domain !== undefined) val = _$1.extend({}, param.value, {
                domain: param.domain
            }); else val = param.value;
            return val;
        };
        this.enumerateParameters(false, (function(param) {
            var val = !Array.isArray(param) ? paramValue(param) : param.map(paramValue), name = !Array.isArray(param) ? param.name : param[0].name, jname = paramJsonName(name);
            if (val == undefined) return; else if (jname !== null) _$1.set(json, jname, val); else json.params[name] = val;
        }));
        json = JSON.stringify(json);
        if (!this.useBody) {
            query.push(encodeURIComponent(json));
            return {
                url: this.buildUrl(this.servlet, query)
            };
        } else return {
            url: this.buildUrl(this.servlet, query),
            data: json,
            contentType: "application/json",
            type: "POST",
            method: "POST"
        };
    };
    QueryingJson.prototype.parseResponse = function(response) {
        if (response.responseHeader.params && response.responseHeader.params.json != null) {
            var json = JSON.parse(response.responseHeader.params.json);
            _$1.extend(response.responseHeader.params, json, json.params);
            delete response.responseHeader.params.json;
        }
        return response;
    };
    var defSettings$3 = {
        persistentParams: []
    };
    function Persisting(settings) {
        this.persistentParams = settings && settings.persistentParams || defSettings$3.persistentParams;
        this.storage = {};
    }
    Persisting.prototype.addParameter = function(param, value, domain) {
        a$$1.pass(this, "addParameter", Solf.Configuring, param, value, domain);
        return param;
    };
    Persisting.prototype.removeParameters = function(indices) {
        a$$1.pass(this, "removeParameters", Solf.Configuring, indices);
    };
    Persisting.prototype.onPrepare = function(settings) {};
    var defSettings$4 = {
        pageSize: 20,
        domain: null
    };
    function Paging(settings) {
        a$$1.setup(this, defSettings$4, settings);
        this.manager = null;
        this.currentPage = this.totalPages = this.totalEntries = null;
    }
    Paging.prototype.init = function(manager) {
        this.manager = manager;
        this.manager.addParameter("rows", this.pageSize);
    };
    Paging.prototype.setPage = function(page) {
        if (this.totalPages == null) return false;
        if (page === "next" || page === ">") page = this.currentPage + 1; else if (page === "prev" || page === "previous" || page === "<") page = this.currentPage - 1; else if (page === "first" || page === "start") page = 1; else if (page === "last" || page === "end") page = this.totalPages; else if (typeof page !== "number") page = parseInt(page);
        if (page > this.totalPages || page < 1 || page === this.currentPage) return false;
        this.currentPage = page;
        return this.manager.addParameter("start", (page - 1) * this.pageSize, this.domain);
    };
    Paging.prototype.page = function(p) {
        if (p !== undefined) this.setPage(p);
        return this.currentPage;
    };
    Paging.prototype.previousPage = function() {
        return this.currentPage > 1 ? this.currentPage - 1 : null;
    };
    Paging.prototype.nextPage = function() {
        return this.currentPage < this.totalPages ? this.currentPage + 1 : null;
    };
    Paging.prototype.afterResponse = function(data, jqXHR, ajaxOpts) {
        var rawResponse = jqXHR.responseJSON, offset = parseInt(rawResponse.responseHeader && rawResponse.responseHeader.params && rawResponse.responseHeader.params.start || this.manager.getParameter("start").value || 0);
        this.pageSize = parseInt(rawResponse.responseHeader && rawResponse.responseHeader.params && rawResponse.responseHeader.params.rows || this.manager.getParameter("rows").value || this.pageSize);
        this.totalEntries = parseInt(rawResponse.response.numFound);
        this.currentPage = Math.floor(offset / this.pageSize) + 1;
        this.totalPages = Math.ceil(this.totalEntries / this.pageSize);
    };
    Paging.prototype.clickHandler = function(page) {
        var self = this;
        return function() {
            if (self.setPage(page)) self.manager.doRequest();
            return false;
        };
    };
    var defSettings$5 = {
        servlet: null,
        resetPage: true,
        privateRequest: false,
        customResponse: null
    };
    function Eventing(settings) {
        a$$1.setup(this, defSettings$5, settings);
        this.manager = null;
    }
    Eventing.prototype.__expects = [ "addValue", "removeValue" ];
    Eventing.prototype.init = function(manager) {
        a$$1.pass(this, Eventing, "init", manager);
        this.manager = manager;
    };
    Eventing.prototype.doRequest = function() {
        if (this.resetPage) this.manager.addParameter("start", 0);
        this.manager.doRequest(this.servlet, self.privateRequest, self.customResponse);
    };
    Eventing.prototype.updateHandler = function() {
        var self = this, args = arguments;
        return function() {
            var res = self.addValue.apply(self, args);
            if (res) self.doRequest();
            return res;
        };
    };
    Eventing.prototype.clickHandler = function() {
        var self = this, args = arguments;
        return function(e) {
            if (self.addValue.apply(self, args)) self.doRequest();
            return false;
        };
    };
    Eventing.prototype.unclickHandler = function() {
        var self = this, args = arguments;
        return function(e) {
            if (self.removeValue.apply(self, args)) self.doRequest();
            return false;
        };
    };
    var defSettings$6 = {
        valuePattern: "{{-}}{{v}}"
    };
    function Patterning(settings) {
        this.valuePattern = settings && settings.valuePattern || defSettings$6.valuePattern;
        var oldRE = this.fqRegExp.toString().replace(/^\/\^?|\$?\/$/g, ""), newRE = "^" + _$1.escapeRegExp(this.valuePattern.replace(/\{\{!?-\}\}/g, "-?").replace("{{v}}", "__v__")).replace("__v__", oldRE).replace("--?", "-?").replace("--", "");
        this.fqRegExp = new RegExp(newRE);
    }
    Patterning.prototype.fqValue = function(value, exclude) {
        return this.valuePattern.replace("{{-}}", exclude ? "-" : "").replace("{{!-}}", exclude ? "" : "-").replace("{{v}}", a$.pass(this, Solr.Patterning, "fqValue", value, exclude)).replace("--", "");
    };
    var defSettings$7 = {
        domain: null,
        escapeNeedle: false
    };
    function Texting(settings) {
        a$$1.setup(this, defSettings$7, settings);
        this.manager = null;
    }
    Texting.prototype.__expects = [ "doRequest" ];
    Texting.prototype.init = function(manager) {
        a$$1.pass(this, Texting, "init", manager);
        this.manager = manager;
    };
    Texting.prototype.addValue = function(q) {
        var val = this.escapeNeedle && q ? q.replace(/\s+/g, "\\ ") : q, before = this.manager.getParameter("q"), res = this.manager.addParameter("q", val, this.domain), after = this.manager.getParameter("q");
        return res && !a$$1.equal(before, after);
    };
    Texting.prototype.clear = function() {
        return this.manager.removeParameters("q");
    };
    Texting.prototype.removeValue = function() {
        this.clear();
    };
    Texting.prototype.clickHandler = function(src) {
        var self = this;
        return function() {
            if (!el) el = this;
            if (self.addValue(typeof el.val === "function" ? el.val() : el.value)) self.doRequest();
            return false;
        };
    };
    var FacetParameters = {
        prefix: null,
        sort: null,
        limit: null,
        offset: null,
        mincount: null,
        missing: null,
        method: null,
        "enum.cache.minDf": null
    };
    var defSettings$8 = {
        multivalue: false,
        aggregate: false,
        exclusion: false,
        domain: null,
        nesting: null,
        useJson: false,
        jsonLocation: null,
        domain: null,
        statistics: null
    };
    function Faceting(settings) {
        a$$1.setup(this, defSettings$8, settings);
        this.id = settings.id;
        this.field = settings.field;
        this.manager = null;
        if (!this.multivalue) this.aggregate = false;
        if (!this.jsonLocation) this.jsonLocation = "json.facet." + this.id;
        this.facet = settings && settings.facet || {};
        this.fqRegExp = new RegExp("^-?" + Solr$1.escapeField(this.field).replace("\\", "\\\\") + ":([^]+)$");
    }
    Faceting.prototype.init = function(manager) {
        a$$1.pass(this, Faceting, "init", manager);
        this.manager = manager;
        var exTag = null;
        if (!!this.nesting) this.facet.domain = _$1.extend({
            blockChildren: this.nesting
        }, this.facet.domain);
        if (this.exclusion) {
            this.domain = _$1.extend(this.domain, {
                tag: this.id + "_tag"
            });
            exTag = this.id + "_tag";
        }
        if (this.useJson) {
            var facet = {
                type: "terms",
                field: this.field,
                mincount: 1,
                limit: -1
            };
            if (!!this.statistics) facet.facet = this.statistics;
            if (exTag != null) facet.domain = {
                excludeTags: exTag
            };
            this.fqName = "json.filter";
            this.manager.addParameter(this.jsonLocation, _$1.merge(facet, this.facet));
        } else {
            var self = this, fpars = _$1.merge({}, FacetParameters), domain = {
                key: this.id
            };
            if (exTag != null) domain.ex = exTag;
            this.fqName = "fq";
            this.manager.addParameter("facet", true);
            if (this.facet.date !== undefined) {
                this.manager.addParameter("facet.date", this.field, domain);
                _$1.extend(fpars, {
                    "date.start": null,
                    "date.end": null,
                    "date.gap": null,
                    "date.hardend": null,
                    "date.other": null,
                    "date.include": null
                });
            } else if (this.facet.range !== undefined) {
                this.manager.addParameter("facet.range", this.field, domain);
                _$1.extend(fpars, {
                    "range.start": null,
                    "range.end": null,
                    "range.gap": null,
                    "range.hardend": null,
                    "range.other": null,
                    "range.include": null
                });
            } else {
                this.facet.field = true;
                if (!!this.statistics) {
                    domain.stats = this.id + "_stats";
                    Solr$1.facetStats(this.manager, domain.stats, this.statistics);
                }
                this.manager.addParameter("facet.field", this.field, domain);
            }
            fpars = a$$1.common(this.facet, fpars);
            _$1.each(fpars, (function(p, k) {
                self.manager.addParameter("f." + Solr$1.escapeField(self.field) + ".facet." + k, p);
            }));
        }
    };
    Faceting.prototype.addValue = function(value, exclude) {
        if (!this.multivalue) this.clearValues();
        var index;
        if (!this.aggregate || !(index = this.manager.findParameters(this.fqName, this.fqRegExp)).length) return this.manager.addParameter(this.fqName, this.fqValue(value, exclude), this.domain);
        var param = this.manager.getParameter(this.fqName, index[0]), parsed = this.fqParse(param.value), added = false;
        if (!Array.isArray(value)) value = [ value ];
        for (var v, i = 0, vl = value.length; i < vl; ++i) {
            v = value[i];
            if (parsed == v) continue; else if (Array.isArray(parsed) && parsed.indexOf(v) >= 0) continue;
            if (typeof parsed === "string") parsed = [ parsed ];
            parsed.push(v);
            added = true;
        }
        if (!added) return false;
        param.value = this.fqValue(parsed, exclude);
        return true;
    };
    Faceting.prototype.removeValue = function(value) {
        if (!this.multivalue) return this.clearValues(); else {
            var self = this, removed = false;
            this.manager.removeParameters(this.fqName, (function(p) {
                var parsed, rr;
                if (!p.value.match(self.fqRegExp)) return false; else if (!self.aggregate) {
                    removed = removed || (rr = p.value.indexOf(Solr$1.facetValue(value)) >= 0);
                    return rr;
                }
                parsed = self.fqParse(p.value);
                if (!Array.isArray(value)) value = [ value ];
                if (!Array.isArray(parsed)) {
                    removed = removed || (rr = value.indexOf(parsed) >= 0);
                    return rr;
                }
                parsed = parsed.filter((function(v) {
                    if (value.indexOf(v) == -1) return true; else {
                        removed = true;
                        return false;
                    }
                }));
                if (!parsed.length) return true; else if (parsed.length == 1) parsed = parsed[0];
                p.value = self.fqValue(parsed);
                return false;
            }));
            return removed;
        }
    };
    Faceting.prototype.hasValue = function(value) {
        var indices = this.manager.findParameters(this.fqName, this.fqRegExp);
        for (var p, i = 0, il = indices.length; i < il; ++i) {
            p = this.manager.getParameter(this.fqName, indices[i]);
            if (this.fqParse(p.value).indexOf(value) > -1) return true;
        }
        return false;
    };
    Faceting.prototype.getValues = function() {
        var indices = this.manager.findParameters(this.fqName, this.fqRegExp), vals = [];
        for (var v, p, i = 0, il = indices.length; i < il; ++i) {
            p = this.manager.getParameter(this.fqName, indices[i]);
            v = this.fqParse(p.value);
            if (Array.isArray(v)) Array.prototype.push.apply(vals, v); else vals.push(v);
        }
        return vals;
    };
    Faceting.prototype.clearValues = function() {
        return this.manager.removeParameters(this.fqName, this.fqRegExp);
    };
    Faceting.prototype.getFacetCounts = function(facet_counts) {
        var property;
        if (!facet_counts) return []; else if (this.useJson === true) return facet_counts.count > 0 ? facet_counts[this.id].buckets : [];
        if (this.facet.field !== undefined) property = "facet_fields"; else if (this.facet.date !== undefined) property = "facet_dates"; else if (this.facet.range !== undefined) property = "facet_ranges";
        if (property !== undefined) {
            switch (this.manager.getParameter("json.nl").value) {
              case "map":
                return this.getFacetCountsMap(facet_counts, property);

              case "arrarr":
                return this.getFacetCountsArrarr(facet_counts);

              default:
                return this.getFacetCountsFlat(facet_counts);
            }
        }
        throw 'Cannot get facet counts unless one of the following properties is set to "true" on widget "' + this.id + '": "facet.field", "facet.date", or "facet.range".';
    };
    Faceting.prototype.getFacetCountsMap = function(facet_counts, property) {
        var counts = [];
        for (var facet in facet_counts[property][this.id]) {
            counts.push({
                val: facet,
                count: parseInt(facet_counts[property][this.id][facet])
            });
        }
        return counts;
    };
    Faceting.prototype.getFacetCountsArrarr = function(facet_counts, property) {
        var counts = [];
        for (var i = 0, l = facet_counts[property][this.id].length; i < l; i++) {
            counts.push({
                val: facet_counts[property][this.id][i][0],
                count: parseInt(facet_counts[property][this.id][i][1])
            });
        }
        return counts;
    };
    Faceting.prototype.getFacetCountsFlat = function(facet_counts, property) {
        var counts = [];
        for (var i = 0, l = facet_counts[property][this.id].length; i < l; i += 2) {
            counts.push({
                val: facet_counts[property][this.id][i],
                count: parseInt(facet_counts[property][this.id][i + 1])
            });
        }
        return counts;
    };
    Faceting.prototype.fqValue = function(value, exclude) {
        return (exclude ? "-" : "") + Solr$1.escapeField(this.field) + ":" + Solr$1.facetValue(value);
    };
    Faceting.prototype.fqParse = function(value) {
        var m = value.match(this.fqRegExp);
        return m != null ? Solr$1.parseFacet(m[1]) : null;
    };
    function rangeValue(value) {
        return Array.isArray(value) ? "[" + Solr$1.escapeValue(value[0] || "*") + " TO " + Solr$1.escapeValue(value[1] || "*") + "]" : Solr$1.escapeValue(value);
    }
    var defSettings$9 = {
        multirange: false,
        exclusion: false,
        domain: null,
        useJson: false,
        domain: null
    };
    function Ranging(settings) {
        a$$1.setup(this, defSettings$9, settings);
        this.id = settings.id;
        this.field = settings.field;
        this.manager = null;
        this.fqRegExp = new RegExp("^-?" + Solr$1.escapeField(this.field).replace("\\", "\\\\") + ":\\s*\\[\\s*([^\\s])+\\s+TO\\s+([^\\s])+\\s*\\]");
        this.fqName = this.useJson ? "json.filter" : "fq";
        if (this.exclusion) this.domain = _$1.merge(this.domain, {
            tag: this.id + "_tag"
        });
    }
    Ranging.prototype.init = function(manager) {
        a$$1.pass(this, Ranging, "init", manager);
        this.manager = manager;
    };
    Ranging.prototype.addValue = function(value, exclude) {
        this.clearValues();
        return this.manager.addParameter(this.fqName, this.fqValue(value, exclude), this.domain);
    };
    Ranging.prototype.removeValue = function(value) {
        return this.clearValues();
    };
    Ranging.prototype.hasValue = function(value) {
        return this.manager.findParameters(this.fqName, this.fqRegExp) != null;
    };
    Ranging.prototype.clearValues = function() {
        return this.manager.removeParameters(this.fqName, this.fqRegExp);
    };
    Ranging.prototype.fqValue = function(value, exclude) {
        return (exclude ? "-" : "") + Solr$1.escapeField(this.field) + ":" + rangeValue(value);
    };
    Ranging.prototype.fqParse = function(value) {
        var m = value.match(this.fqRegExp);
        if (!m) return null;
        m.shift();
        return m;
    };
    var defSettings$a = {
        pivot: null,
        useJson: false,
        statistics: null,
        domain: null
    };
    function Pivoting(settings) {
        a$$1.setup(this, defSettings$a, settings);
        this.manager = null;
        this.faceters = {};
        this.id = settings.id;
        this.settings = settings;
        this.rootId = null;
    }
    Pivoting.prototype.addFaceter = function(facet, idx) {
        return new Faceting(facet);
    };
    Pivoting.prototype.init = function(manager) {
        a$$1.pass(this, Solr.Pivoting, "init", manager);
        this.manager = manager;
        var stats = this.statistics;
        if (!this.useJson) {
            var loc = {};
            if (!!stats) {
                loc.stats = this.id + "_stats";
                Solr.facetStats(this.manager, loc.stats, stats);
                stats = null;
            }
            if (this.exclusion) loc.ex = this.id + "_tag";
            this.manager.addParameter("facet.pivot", this.pivot.map((function(f) {
                return typeof f === "string" ? f : f.field;
            })).join(","), loc);
        }
        var location = "json";
        for (var i = 0, pl = this.pivot.length; i < pl; ++i) {
            var p = this.pivot[i], f = _$1.merge({}, this.settings, typeof p === "string" ? {
                id: p,
                field: p,
                disabled: true
            } : p);
            location += ".facet." + f.id;
            if (this.useJson) f.jsonLocation = location;
            if (this.rootId == null) this.rootId = f.id;
            f.exclusion = false;
            if (p.nesting == null && i > 0) delete f.nesting;
            f.statistics = stats;
            (this.faceters[f.id] = this.addFaceter(f, i)).init(manager);
        }
    };
    Pivoting.prototype.getPivotEntry = function(idx) {
        var p = this.pivot[idx];
        return p === undefined ? null : typeof p === "object" ? p : {
            id: p,
            field: p
        };
    };
    Pivoting.prototype.getFaceterEntry = function(idx) {
        var p = this.pivot[idx];
        return this.faceters[typeof p === "string" ? p : p.id];
    };
    Pivoting.prototype.getPivotCounts = function(pivot_counts) {
        if (!pivot_counts) return []; else if (this.useJson === true) return pivot_counts.count > 0 ? pivot_counts[this.rootId].buckets : []; else {
            throw {
                error: "Not supported for now!"
            };
        }
    };
    Pivoting.prototype.addValue = function(value, exclude) {
        var p = this.parseValue(value);
        return this.faceters[p.id].addValue(p.value, exclude);
    };
    Pivoting.prototype.removeValue = function(value) {
        var p = this.parseValue(value);
        return this.faceters[p.id].removeValue(p.value);
    };
    Pivoting.prototype.clearValues = function() {
        _$1.each(this.faceters, (function(f) {
            f.clearValues();
        }));
    };
    Pivoting.prototype.hasValue = function(value) {
        var p = this.parseValue(value);
        return p.id != null ? this.faceters[p.id].hasValue(p.value) : false;
    };
    Pivoting.prototype.parseValue = function(value) {
        var m = value.match(/^(\w+):(.+)$/);
        return !m || this.faceters[m[1]] === undefined ? {
            value: value
        } : {
            value: m[2],
            id: m[1]
        };
    };
    Pivoting.prototype.fqParse = function(value) {
        var p = this.parseValue(value), v = null;
        if (p.id != null) v = this.faceters[p.id].fqParse(p.value); else for (var id in this.faceters) {
            v = this.faceters[id].fqParse(p.value);
            if (!!v) {
                p.id = id;
                break;
            }
        }
        if (Array.isArray(v)) v = v.map((function(one) {
            return p.id + ":" + one;
        })); else if (v != null) v = p.id + ":" + v;
        return v;
    };
    var defSettings$b = {
        nestingRules: null,
        nestingField: null,
        nestLevel: null,
        listingFields: [ "*" ]
    };
    function Listing(settings) {
        a$$1.setup(this, defSettings$b, settings);
        this.manager = null;
    }
    Listing.prototype.init = function(manager) {
        a$$1.pass(this, Listing, "init", manager);
        if (this.nestLevel != null) {
            var level = this.nestingRules[this.nestLevel], chF = level.field || this.nestingField, parF = this.nestingRules[level.parent] && this.nestingRules[level.parent].field || this.nestingField;
            manager.addParameter("fl", "[child parentFilter=" + parF + ":" + level.parent + " childFilter=" + chF + ":" + this.nestLevel + " limit=" + level.limit + "]");
        }
        _$1.each(this.listingFields, (function(f) {
            manager.addParameter("fl", f);
        }));
    };
    var defSettings$c = {
        collapseRules: {
            study: {
                fields: /topcategory[_sh]*|endpointcategory[_sh]*|guidance[_sh]*|reference[_sh]*|reference_owner[_sh]*|reference_year[_sh]*|guidance[_sh]*/
            },
            composition: {
                fields: /CORE|COATING|CONSTITUENT|ADDITIVE|IMPURITY|FUNCTIONALISATION|DOPING/
            }
        }
    };
    function RawAdapter(settings) {
        a$$1.setup(this, defSettings$c, settings);
    }
    RawAdapter.prototype.init = function(manager) {
        a$$1.pass(this, RawAdapter, "init", manager);
    };
    RawAdapter.prototype.parseResponse = function(data) {
        var docs = [], self = this, response = a$$1.pass(this, RawAdapter, "parseResponse", data) || data, filterProps = function(dout, din) {
            _$1.each(self.collapseRules, (function(r, type) {
                var subdoc = {};
                _$1.each(din, (function(v, k) {
                    if (!k.match(r.fields)) return;
                    delete din[k];
                    if (Array.isArray(v) && v.length == 1) v = v[0];
                    subdoc[k] = v;
                }));
                if (dout._extended_ === undefined) dout._extended_ = {};
                if (dout._extended_[type] === undefined) dout._extended_[type] = [ subdoc ]; else dout._extended_[type].push(subdoc);
            }));
            _$1.each(din, (function(v, k) {
                if (Array.isArray(v) && v.length == 1) v = v[0];
                dout[k] = v;
            }));
        };
        for (var i = 0, dl = response.response.docs.length; i < dl; ++i) {
            var din = response.response.docs[i], ein = response.expanded[din.s_uuid], dout = {};
            filterProps(dout, din);
            for (var j = 0, edl = ein.docs.length; j < edl; ++j) filterProps(dout, ein.docs[j]);
            docs.push(dout);
        }
        return {
            entries: docs,
            stats: _$1.extend({}, response.stats, response.responseHeader),
            facets: _$1.extend({}, response.facet_counts.facet_fields || response.facets, response.facet_counts.facet_pivot),
            paging: {
                start: response.response.start,
                count: response.response.docs.length,
                total: response.response.numFound,
                pageSize: parseInt(response.responseHeader.params.rows)
            }
        };
    };
    function NestedAdapter(settings) {
        this.nestingField = settings && settings.nestingField || "type_s";
    }
    NestedAdapter.prototype = {
        init: function(manager) {
            a$$1.pass(this, NestedAdapter, "init", manager);
        },
        parseResponse: function(data) {
            var response = a$$1.pass(this, NestedAdapter, "parseResponse", data) || data, docs = response.response.docs;
            for (var i = 0, dl = docs.length; i < dl; ++i) {
                var d = docs[i], ext = {};
                if (!d._childDocuments_) continue;
                for (var j = 0, cl = d._childDocuments_.length; j < cl; ++j) {
                    var c = d._childDocuments_[j], type = c[this.nestingField];
                    if (ext[type] === undefined) ext[type] = [];
                    ext[type].push(c);
                }
                delete d._childDocuments_;
                d._extended_ = ext;
            }
            return {
                entries: docs,
                stats: _$1.extend({}, response.stats, response.responseHeader),
                facets: response.facets,
                paging: {
                    start: response.response.start,
                    count: response.response.docs.length,
                    total: response.response.numFound,
                    pageSize: parseInt(response.responseHeader.params && response.responseHeader.params.rows || 0)
                }
            };
        }
    };
    Solr$1.Configuring = Configuring;
    Solr$1.Compatibility = Compatibility;
    Solr$1.QueryingURL = QueryingURL;
    Solr$1.QueryingJson = QueryingJson;
    Solr$1.Persisting = Persisting;
    Solr$1.Paging = Paging;
    Solr$1.Eventing = Eventing;
    Solr$1.Patterning = Patterning;
    Solr$1.Texting = Texting;
    Solr$1.Faceting = Faceting;
    Solr$1.Ranging = Ranging;
    Solr$1.Pivoting = Pivoting;
    Solr$1.Listing = Listing;
    Solr$1.RawAdapter = RawAdapter;
    Solr$1.NestedAdapter = NestedAdapter;
    return Solr$1;
}));