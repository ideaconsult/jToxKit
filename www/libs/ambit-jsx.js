/** AmbitJsX library - a neXt Ambit queries JavaScript library. Copyright © 2019, IDEAConsult Ltd. All rights reserved. @license MIT.*/
(function(global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory(require("as-sys")) : typeof define === "function" && define.amd ? define([ "as-sys" ], factory) : (global = global || self, 
    global.Ambit = factory(global.asSys));
})(this, (function(a$) {
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
            settings.error = function(jhr) {
                callback(null, jhr);
            };
            settings.success = proceedOnTask;
            settings.dataType = "json";
            self.manager.doRequest(settings);
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
    function Authorization(settings) {
        a$.setup(this, Authorization.prototype, settings);
    }
    Authorization.prototype = {
        afterResponse: null,
        loadRoles() {},
        loadPolicies() {},
        addPolicy(data) {}
    };
    function Modelling(settings) {
        a$.setup(this, Modelling.prototype, settings);
        this.models = null;
    }
    Modelling.prototype = {
        __expects: [ "pollTask" ],
        algorithms: false,
        forceCreate: false,
        loadOnInit: false,
        listFilter: null,
        onLoaded: null,
        init: function(manager) {
            a$.pass(this, jT.Modelling, "init", manager);
            this.manager = manager;
            if (this.loadOnInit) this.queryList();
        },
        listModels: function() {
            var self = this;
            self.manager.doRequest("model", (function(result, jhr) {
                if (result && result.model) self.models = result.model; else if (jhr.status == 200) result = {
                    model: []
                };
                a$.act(self, self.onLoaded, result);
            }));
        },
        listAlgorithms: function(needle) {
            var self = this, servlet = "algorithm";
            if (!!needle) servlet += "?search=" + needle;
            self.manager.doRequest(servlet, (function(result, jhr) {
                if (result && result.algorithm) self.algorithm = result.algorithm; else if (jhr.status == 200) result = {
                    algorithm: []
                };
                a$.act(self, self.onLoaded, result, jhr);
            }));
        },
        getModel: function(algoUri, callback) {
            var self = this, reportIt = function(task, jhr) {
                return callback(task && task.completed > -1 ? task.result : null, jhr);
            };
            if (self.forceCreate) self.pollTask({
                url: algoUri,
                method: "POST"
            }, reportIt); else self.manager.doRequest("model?algorithm=" + encodeURIComponent(algoUri), (function(result, jhr) {
                if (!result && jhr.status != 404) callback(null, jhr); else if (!result || result.model.length == 0) self.pollTask({
                    url: algoUri,
                    method: "POST"
                }, reportIt); else callback(result.model[0].URI, jhr);
            }));
        },
        runPrediction: function(datasetUri, modelUri, callback) {
            var self = this, createAttempted = false, obtainResults = null, createIt = function(jhr) {
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
            obtainResults = function(uri) {
                self.manager.connector.ajax({
                    url: uri,
                    method: "GET",
                    dataType: "json",
                    error: function(jhr) {
                        callback(null, jhr);
                    },
                    success: function(result, jhr) {
                        if (result && result.dataEntry && result.dataEntry.length > 0) {
                            var empty = true;
                            for (var i = 0, rl = result.dataEntry.length; i < rl; ++i) if (a$.weight(result.dataEntry[i].values) > 0) {
                                empty = false;
                                break;
                            }
                            if (empty) createIt(jhr); else callback(result, jhr);
                        } else createIt(jhr);
                    }
                });
            };
            if (self.forceCreate) createIt(); else obtainResults(jT.ui.addParameter(datasetUri, "feature_uris[]=" + encodeURIComponent(modelUri + "/predicted")));
        },
        queryList: function(needle) {
            if (this.algorithms) this.listAlgorithms(this.listFilter = needle || this.listFilter); else this.listModels(this.modelUri);
        }
    };
    Ambit.Paging = Paging;
    Ambit.Tasking = Tasking;
    Ambit.Authorization = Authorization;
    Ambit.Modelling = Modelling;
    return Ambit;
}));