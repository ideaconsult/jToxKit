/** AmbitJsX library - a neXt Ambit queries JavaScript library. Copyright © 2019, IDEAConsult Ltd. All rights reserved. @license MIT.*/
(function(global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory(require("as-sys"), require("lodash")) : typeof define === "function" && define.amd ? define([ "as-sys", "lodash" ], factory) : (global = global || self, 
    global.Ambit = factory(global.asSys, global._));
})(this, (function(a$, _) {
    "use strict";
    var Ambit = {
        version: "1.0.0"
    };
    function Paging(settings) {}
    Paging.prototype.nextPage = function() {};
    var defSettings = {
        pollDelay: 250,
        pollTimeout: 15e3
    };
    function Tasking(settings) {
        a$.setup(this, defSettings, settings);
    }
    Tasking.prototype.init = function(manager) {
        a$.pass(this, Tasking, "init", manager);
        this.manager = manager;
    };
    Tasking.prototype.pollTask = function(taskUri, callback) {
        var self = this, proceedOnTask, queryTask, taskStart = null;
        queryTask = function(settings) {
            if (typeof settings === "string") settings = {
                url: settings,
                method: "GET"
            };
            settings.dataType = "json";
            self.manager.doRequest(settings, true, (function(task, jhr) {
                if (task == null) callback(null, jhr); else proceedOnTask(task, jhr);
            }));
        };
        proceedOnTask = function(task, jhr) {
            if (task == null || task.task == null || task.task.length < 1) {
                callback(task, jhr);
                return;
            }
            task = task.task[0];
            if (task.completed > -1 || !!task.error) callback(task, jhr); else if (taskStart == null) {
                taskStart = Date.now();
                setTimeout((function() {
                    queryTask(task.result);
                }), self.pollDelay);
            } else if (Date.now() - taskStart > self.poolTimeout) callback(task, jhr); else setTimeout((function() {
                queryTask(task.result);
            }), self.pollDelay);
        };
        queryTask(taskUri);
    };
    function Configuring(settigs) {}
    var defSettings$1 = {
        baseUrl: null
    };
    function Querying(settings) {
        a$.setup(this, defSettings$1, settings);
        if (!this.baseUrl) this.baseUrl = this.serverUrl;
    }
    Querying.prototype.__expects = [ "buildUrl" ];
    Querying.prototype.prepareQuery = function(servlet) {
        var url, questionIdx;
        if (typeof servlet !== "object") {
            url = servlet;
            servlet = {};
        } else url = servlet.url;
        questionIdx = url.indexOf("?");
        return _.defaults({
            url: this.buildUrl(url),
            serviceId: questionIdx > 0 ? url.substr(0, questionIdx) : url
        }, servlet);
    };
    var defSettings$2 = {};
    function Authorization(settings) {
        a$.setup(this, defSettings$2, settings);
    }
    Authorization.prototype.init = function(manager) {
        a$.pass(this, Authorization, "init", manager);
        this.manager = manager;
    };
    Authorization.prototype.loadRoles = function() {
        this.manager.doRequest("admin/restpolicy", (function(result, jhr, opts) {}));
    };
    Authorization.prototype.loadPolicies = function() {
        this.manager.doRequest("admin/restpolicy", (function(result, jhr, opts) {}));
    };
    Authorization.prototype.addPolicy = function(data) {
        this.manager.doRequest("admin/restpolicy", (function(result, jhr, opts) {}));
    };
    var serviceId = "model", defSettings$3 = {
        forceCreate: false,
        defaultUri: null
    };
    function Modelling(settings) {
        a$.setup(this, defSettings$3, settings);
        this.models = null;
    }
    Modelling.prototype.__expects = [ "pollTask", "populate" ];
    Modelling.prototype.serviceId = serviceId;
    Modelling.prototype.init = function(manager) {
        a$.pass(this, Modelling, "init", manager);
        this.manager = manager;
    };
    Modelling.prototype.doRequest = function(uri) {
        var self = this;
        self.manager.doRequest(uri || this.defaultUri || serviceId, (function(result, jhr) {
            if (result && result.model) self.models = result.model; else if (jhr.status == 200) result = {
                model: []
            };
            a$.act(self, self.populate, result.model);
        }));
    };
    Modelling.prototype.getModel = function(algoUri, callback) {
        var self = this, reportIt = function(task, jhr) {
            return callback(task && task.completed > -1 ? task.result : null, jhr);
        }, createIt = function() {
            self.pollTask({
                url: algoUri,
                method: "POST"
            }, reportIt);
        };
        if (self.forceCreate) createIt(); else self.manager.doRequest(serviceId + "?algorithm=" + encodeURIComponent(algoUri), (function(result, jhr, opts) {
            if (!result && jhr.status != 404) callback(null, jhr, opts); else if (!result || result.model.length == 0) createIt(); else callback(result.model[0].URI, jhr, opts);
        }));
    };
    Modelling.prototype.runPrediction = function(datasetUri, modelUri, callback) {
        var self = this, createAttempted = false, obtainResults = null, createIt = null;
        createIt = function(jhr) {
            if (createAttempted) {
                callback(null, jhr);
                return;
            }
            self.pollTask({
                url: modelUri,
                method: "POST",
                data: {
                    dataset_uri: datasetUri
                }
            }, (function(task, jhr) {
                createAttempted = true;
                if (task && task.completed > -1) obtainResults(task.result);
            }));
        };
        obtainResults = function(url) {
            var query = {
                url: url,
                method: "GET",
                dataType: "json"
            };
            self.manager.doRequest(query, (function(result, jhr, opts) {
                if (!result) callback(result, jhr); else if (result && result.dataEntry && result.dataEntry.length > 0) {
                    var empty = true;
                    for (var i = 0, rl = result.dataEntry.length; i < rl; ++i) if (a$.weight(result.dataEntry[i].values) > 0) {
                        empty = false;
                        break;
                    }
                    if (empty) createIt(jhr); else callback(result, jhr);
                } else createIt(jhr);
            }));
        };
        if (self.forceCreate) createIt(); else obtainResults(self.manager.addUrlParameters(datasetUri, "feature_uris[]=" + encodeURIComponent(modelUri + "/predicted")));
    };
    var serviceId$1 = "algorithm", defSettings$4 = {
        defaultFilter: null
    };
    function Algorithming(settings) {
        a$.setup(this, defSettings$4, settings);
        this.algorithms = null;
    }
    Algorithming.prototype.__expects = [ "populate" ];
    Algorithming.prototype.serviceId = serviceId$1;
    Algorithming.prototype.init = function(manager) {
        a$.pass(this, Algorithming, "init", manager);
        this.manager = manager;
    };
    Algorithming.prototype.doRequest = function(needle) {
        var self = this, servlet = serviceId$1, theNeedle = needle || this.defaultFilter;
        if (!!theNeedle) servlet = serviceId$1 + "?search=" + theNeedle;
        self.manager.doRequest(servlet, (function(result, jhr) {
            if (result && result.algorithm) self.algorithm = result.algorithm; else if (jhr.status == 200) result = {
                algorithm: []
            };
            self.populate(result.algorithm);
        }));
    };
    Ambit.Paging = Paging;
    Ambit.Tasking = Tasking;
    Ambit.Querying = Querying;
    Ambit.Configuring = Configuring;
    Ambit.Authorization = Authorization;
    Ambit.Modelling = Modelling;
    Ambit.Algorithming = Algorithming;
    return Ambit;
}));