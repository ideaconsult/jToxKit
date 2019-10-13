(function(global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory(require("as-sys"), require("lodash")) : typeof define === "function" && define.amd ? define([ "as-sys", "lodash" ], factory) : (global = global || self, 
    global.CommBase = factory(global.asSys, global._));
})(this, (function(a$, _) {
    "use strict";
    var CommBase = {
        version: "1.0.0"
    };
    function Authenticating(settings) {
        a$.setup(this, Authenticating.prototype, settings);
        if (settings.authMethod === "Basic") {
            _.extend(this.ajaxSettings, {
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
    var ajaxDefaults = {
        async: true,
        dataType: "json",
        method: "GET",
        processData: false
    };
    function Communicating(settings) {
        a$.setup(this, Communicating.prototype, settings);
        this.listeners = {};
        this.response = null;
        this.error = null;
        this.pendingRequests = [];
        this.inRequest = false;
        this.ajaxSettings = _.defaults(this.ajaxSettings, ajaxDefaults);
    }
    Communicating.prototype = {
        __expects: [ "prepareQuery" ],
        connector: null,
        serverUrl: "",
        onPrepare: null,
        onError: null,
        onSuccess: null,
        ajaxSettings: null,
        doRequest: function(servlet, callback) {
            if (this.inRequest) {
                this.pendingRequests.push(arguments);
                return;
            }
            this.inRequest = true;
            if (typeof servlet === "function") {
                callback = servlet;
                servlet = null;
            }
            var self = this, cancel = null, ajaxOpts = _.defaults(this.prepareQuery(servlet), this.ajaxSettings);
            if (typeof callback !== "function") {
                _.each(self.listeners, (function(l) {
                    if (a$.act(l, l.beforeRequest, ajaxOpts, self) === false) cancel = l;
                }));
                if (cancel !== null) {
                    a$.act(cancel, self.onError, null, "Request cancelled", cancel, self);
                    return;
                }
            }
            ajaxOpts.error = function(jqXHR, status, message) {
                if (typeof callback === "function") callback(null, jqXHR); else {
                    _.each(self.listeners, (function(l) {
                        a$.act(l, l.afterResponse, null, jqXHR, ajaxOpts, self);
                    }));
                    a$.act(self, self.onError, jqXHR, ajaxOpts);
                }
            };
            ajaxOpts.success = function(data, status, jqXHR) {
                self.response = a$.act(self, "parseResponse", data) || data;
                if (typeof callback === "function") callback(self.response, jqXHR); else {
                    _.each(self.listeners, (function(l) {
                        a$.act(l, l.afterResponse, self.response, ajaxOpts, jqXHR, self);
                    }));
                    a$.act(self, self.onSuccess, self.response, jqXHR, ajaxOpts);
                }
            };
            ajaxOpts.complete = function() {
                self.inRequest = false;
                if (self.pendingRequests.length > 0) self.doRequest.apply(self, self.pendingRequests.shift());
            };
            a$.broadcast(self, "onPrepare", ajaxOpts);
            a$.act(self, self.onPrepare, ajaxOpts);
            return self.connector.ajax(ajaxOpts);
        },
        init: function() {
            var self = this;
            a$.pass(self, Communicating, "init");
            _.each(this.listeners, (function(l) {
                a$.act(l, l.init, self);
            }));
        },
        addListeners: function(one) {
            var listener = one;
            if (arguments.length > 1) listener = arguments; else if (!Array.isArray(one)) listener = [ one ]; else listener = one;
            for (var l, i = 0, ll = listener.length; i < ll; ++i) {
                l = listener[i];
                this.listeners[l.id] = l;
            }
            return this;
        },
        removeOneListener: function(listener) {
            if (typeof listener === "object") listener = listener.id;
            delete this.listeners[listener];
            return this;
        },
        removeListeners: function(selector, context) {
            if (typeof selector !== "function") throw {
                name: "Enumeration error",
                message: "Attempt to select-remove listeners with non-function 'selector': " + selector
            };
            var self = this;
            _.each(self.listeners, (function(l, id) {
                if (selector.call(context, l, id, self)) delete self.listeners[id];
            }));
            return self;
        },
        enumerateListeners: function(callback, context) {
            if (typeof callback !== "function") throw {
                name: "Enumeration error",
                message: "Attempt to enumerate listeners with non-function 'selector': " + callback
            };
            var self = this;
            _.each(this.listeners, (function(l, id) {
                callback.call(context, l, id, self);
            }));
        },
        getListener: function(id) {
            return this.listeners[id];
        }
    };
    function Delaying(settings) {
        this.delayTimer = null;
        this.delay = settings && settings.delay || this.delay;
    }
    Delaying.prototype = {
        delay: 300,
        doRequest: function() {
            var self = this, doInvoke = function() {
                a$.pass(self, meSkill, "doRequest");
                self.delayTimer = null;
            };
            if (this.delay == null || this.delay < 10) return doInvoke(); else if (this.delayTimer != null) clearTimeout(this.delayTimer);
            this.delayTimer = setTimeout(doInvoke, this.delay);
        }
    };
    CommBase.Communicating = Communicating;
    CommBase.Delaying = Delaying;
    CommBase.Authenticating = Authenticating;
    return CommBase;
}));