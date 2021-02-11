/** SolrJsX library - a neXt Solr queries JavaScript library.
  * The Core, integrating for all skills
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  

(function (a$) {
  // Define this as a main object to put everything in
  Solr = { version: "0.16.1" };

  // Now import all the actual skills ...
  // ATTENTION: Kepp them in the beginning of the line - this is how smash expects them.
  
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * General query management - actual requests, listeners, etc.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
Solr.Management = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  
  this.listeners = {};  // The set of listeners - based on their 'id'.
  this.response = null;
  this.error = null;

  this.pendingRequests = [];
  this.inRequest = false;
  
  // If username and password are given, a basic authentication is assumed
  // and proper headers added.
  if (!!settings && !!settings.username && !!settings.password) {
    var token = btoa(settings.username + ':' + settings.password);
    this.ajaxSettings.headers = { 'Authorization': "Basic " + token };
  }
};

Solr.Management.prototype = {
  __expects: [ "prepareQuery", "parseQuery" ],
  /** Parameters that can and are expected to be overriden during initialization
    */
  connector: null,      // The object for making the actual requests - jQuery object works pretty fine.
  serverUrl: "",        // The bas Solr Url to be used, excluding the servlet.
  servlet: "select",    // Default servlet to be used is "select".
  
  onPrepare: null,
  onError: null,
  onSuccess: null,
  ajaxSettings: {        // Default settings for the ajax call to the `connector`
    async: true,
    dataType: "json",
    method: 'GET',
    processData: false,
  },

  /** The method for performing the actual request. You can provide custom servlet to invoke
    * and/or custom `callback`, which, if present, will suppress the normal listener notification
    * and make an private call and `callback notification.
    */
  doRequest: function (servlet, callback) {
    var self = this,
        cancel = null,
        settings = {};
        
    // Suppress same request before this one is finished processing. We'll
    // remember that we're being asked and will make _one_ request afterwards.
    if (this.inRequest) {
      this.pendingRequests.push(arguments);
      return;
    }

    this.inRequest = true;
    
    // fix the incoming parameters
    if (typeof servlet === "function") {
      callback = servlet;
      servlet = self.servlet;
    }

    // Let the Querying skill build the settings.url / data
    var urlPrefix = self.serverUrl + (servlet || self.servlet);
    settings = a$.extend(settings, self.ajaxSettings, self.prepareQuery());
    if (urlPrefix.indexOf('?') > 0 && settings.url && settings.url.startsWith('?'))
      settings.url = '&' + settings.url.substr(1);
    settings.url =  urlPrefix + (settings.url || "");

    // We don't make these calls on private requests    
    if (typeof callback !== "function") {
      // Now go to inform the listeners that a request is going to happen and
      // give them a change to cancel it.
      a$.each(self.listeners, function (l) {
        if (a$.act(l, l.beforeRequest, settings, self) === false)
          cancel = l;
      })
  
      if (cancel !== null) {
        a$.act(cancel, self.onError, null, "Request cancelled", cancel, self);
        return; 
      }
    }
        
    // Prepare the handlers for both error and success.
    settings.error = function (jqXHR, status, message) {
      if (typeof callback === "function")
        callback(null, jqXHR);
      else {
        a$.each(self.listeners, function (l) { a$.act(l, l.afterFailure, jqXHR, settings, self); });
        a$.act(self, self.onError, jqXHR, settings);
      }
    };
    
    settings.success = function (data, status, jqXHR) {
      self.response = self.parseQuery(data);

      if (typeof callback === "function")
        callback(self.response, jqXHR);
      else {
        // Now inform all the listeners
        a$.each(self.listeners, function (l) { a$.act(l, l.afterRequest, self.response, settings, jqXHR, self); });
  
        // Call this for Querying skills, if it is defined.
        a$.act(self, self.parseResponse, self.response, servlet);  
      
        // Time to call the passed on success handler.
        a$.act(self, self.onSuccess, self.response, jqXHR, settings);
      }
    };
    
    settings.complete = function () {
      // Now deal with pending requests, if such exists.
      // Pay attention that this is _not_ recursion, because
      // We're in the success handler, i.e. - async.
      self.inRequest = false;
      if (self.pendingRequests.length > 0)
        self.doRequest.apply(self, self.pendingRequests.shift());
    };
    
    // Inform all our skills for the preparation.
    a$.broadcast(self, 'onPrepare', settings);
    
    // Call the custom provided preparation routines.
    a$.act(self, self.onPrepare, settings);
    
    // And make the damn call.
    return self.connector.ajax( settings );
  },

  /** Initialize the management and most importantly - the listener's
    */
  init: function () {
    var self = this;
    a$.pass(self, Solr.Management, "init");
    a$.each(this.listeners, function (l) {
      // Inform the listener that it has been added.
      a$.act(l, l.init, self);
    })  
  },
  
  /** Add one or many listeners to the manager
    */   
  addListeners: function (one) {
    var listener = one;
    if (arguments.length > 1)
      listener = arguments;
    else if (!Array.isArray(one))
      listener = [ one ];
    else
      listener = one;
      
    for (var l, i = 0, ll = listener.length; i < ll; ++i) {
      l = listener[i];
      this.listeners[l.id] = l;
    }
    
    return this;
  },
  
  /** Remove one listener. Can pass only the id.
    */
  removeListener: function (listener) {
    if (typeof listener === "objcet")
      listener = listener.id;
      
    delete this.listeners[listener];
    return this;
  },
  
  /** Remove many listeners, according to the given selector.
    * The selector(listener, manager) is invoked and on `true`
    * the listener is removed.
    */
  removeManyListeners: function (selector) {
    if (typeof selector !== 'function')
      throw { name: "Enumeration error", message: "Attempt to select-remove listeners with non-function 'selector': " + selector };
      
    var self = this;
    a$.each(self.listeners, function (l, id) {
      if (selector(l, id, self))
        delete self.listeners[id];
    });
    
    return self;
  },
  
  /** Enumerate all listeners.
    */
  enumerateListeners: function(callback, context) {
    if (typeof callback !== 'function')
      throw { name: "Enumeration error", message: "Attempt to enumerate listeners with non-function 'selector': " + callback };
      
    a$.each(this.listeners, function (l, id) {
      callback.call(l, l, id, context);
    });
  },
  
  /** A listener retrieval method
    */
  getListener: function (id) {
    return this.listeners[id];
  }
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  *
  * Parameter management skills. Primary based on this description:
  * http://yonik.com/solr-json-request-api/#Smart_merging_of_multiple_JSON_parameters
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
/** This is directly copied from AjaxSolr.
  */  
Solr.escapeValue = function (value) {
  // If the field value has a space, colon, quotation mark or forward slash
  // in it, wrap it in quotes, unless it is a range query or it is already
  // wrapped in quotes.
  if (typeof value !== 'string')
    value = value.toString();
    
  if (value.match(/[ :\/"]/) && !value.match(/[\[\{]\S+ TO \S+[\]\}]/) && !value.match(/^["\(].*["\)]$/)) {
    return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return value;
};

Solr.escapeField = function (field) {
  return field.replace(/\s/g, "\\$&");  
};

/**
* Parameter specification: https://cwiki.apache.org/confluence/display/solr/Local+Parameters+in+Queries
*/
Solr.parseParameter = function (str) {
  var param = { },
      parse = str.match(/^([^=]+)=(?:\{!([^\}]*)\})?(.*)$/);
  if (parse) {

    if (parse[2] != null) {
      var matches;
      while (matches = /([^\s=]+)=?(\S*)?/g.exec(parse[2])) {
        if (param.domain === undefined)
          param.domain = {};
        if (matches[2] == null)
          param.domain['type'] = matches[1];
        else
          param.domain[matches[1]] = matches[2];
        parse[2] = parse[2].replace(matches[0], ''); // Safari's exec seems not to do this on its own
      }
    }

    param.name = parse[1];
    var arr = parse[3].split(",");
    param.value = arr.length > 1 ? arr : parse[3];
  }
  
  return param;
};

Solr.Configuring = function (settings) {
  // Now make some reformating of initial parameters.
  this.parameterHistory = [];
      
  a$.extend(true, this, a$.common(settings, this));
  
  this.resetParameters();
  this.mergeParameters(settings && settings.parameters);
};

var paramIsMultiple = function (name) { 
  return name.match(/^(?:bf|bq|facet\.date|facet\.date\.other|facet\.date\.include|facet\.field|facet\.pivot|facet\.range|facet\.range\.other|facet\.range\.include|facet\.query|fq|fl|json\.query|json\.filter|group\.field|group\.func|group\.query|pf|qf|stats\.field)$/);
};

Solr.Configuring.prototype = {
  /** Add a parameter. If `name` is an object - it is treated as a prepared
    * parameter and `value` and `domain` are ignored.
    */
  addParameter: function (param, value, domain) {
    var name;
    
    if (typeof param !== 'object') {
      name = param;
      param = { 'name': param, 'value': value };
      if (domain != null)
        param.domain = domain;
    }
    else
      name = param.name;
    
    if (paramIsMultiple(name)) {
      if (this.parameterStore[name] === undefined)
        this.parameterStore[name] = [ param ];
      else {
        var found = false;
        a$.each(this.parameterStore[name], function (p) { found = found || a$.equal(true, param, p); });
        if (!found)
          this.parameterStore[name].push(param);
        else
          return false;
      }
    }
    else
      this.parameterStore[name] = param;
      
    return param;
  },
  
  /** Find all parameters matching the needle - it can be RegExp, string, etc.
    * Always returns an array of indices - it could be empty, but is an array.
    */
  findParameters: function (name, needle) {
    var indices = [],
        filter;
    if (this.parameterStore[name] !== undefined) {
      if (typeof needle === 'function') {
        filter = function (p, i) { 
          if (needle(p, i)) 
            indices.push(i); 
        };
      }
      else if (needle == null) {
        filter = function (p, i) { indices.push(i); };
      }
      else {
        if (typeof needle !== 'object' || needle instanceof RegExp || Array.isArray(needle))
          needle = { 'value': needle };
          
        filter = function (p, i) { 
          if (a$.similar(p, needle)) 
            indices.push(i); 
        };
      } 
      
      a$.each(paramIsMultiple(name) ? this.parameterStore[name] : [ this.parameterStore[name] ], filter);
    }
    return indices;
  },
  
  /** Remove parameters. If needle is an array it is treated as an idices array,
    * if not - it is first passed to findParameters() call.
    */
  removeParameters: function (name, indices) {
    if (this.parameterStore[name] !== undefined) {
      if (typeof indices === 'number')
        indices = [ indices ];
      else if (!Array.isArray(indices))
        indices = this.findParameters(name, indices);
      
      if (!paramIsMultiple(name) || indices.length == this.parameterStore[name].length)
        delete this.parameterStore[name];
      else {
        indices.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
        // We need to traverse in reverse, relying that the indices are ascending.
        for (var i = indices.length - 1; i >= 0; --i)
          this.parameterStore[name].splice(indices[i], 1);
      }
        
      return indices.length;
    }
    else
      return false;
  },
  
  /** Returns a parameter or an array of parameters with that name
    */
  getParameter: function (name, index) {
    var multi = paramIsMultiple(name);

    if (this.parameterStore[name] === undefined)
      return multi && index == null ? [] : { 'name': name };
    else
      return (index == null || !multi) ? this.parameterStore[name] : this.parameterStore[name][index];
  },
  
  /** Returns an array of values of all parameters with given name
    */
  getAllValues: function (name) {
    var val = null;
    if (this.parameterStore[name] !== undefined)
      val = !paramIsMultiple(name) ? this.parameterStore[name].value : this.parameterStore[name].map(function (p) { return p.value; });

    return val;
  },

  /**
   * Exports the parameters with given names in the format that {@see importParameters} can use directly.
   * @param {Array<String>} names The list of parameter names to be exported.
   * @param {Function} cb An optional callback for custom formatting of each parameter.
   */
  exportParameters: function (names, cb) {
    var state = {},
      store = this.parameterStore;

    a$.each(names, function (one) {
      if (!store[one])
        ;
      else if (typeof cb === 'function')
        state[one] = cb(one, store[one]);
      else
        state[one] = store[one];
    })

    return state;
  },

  /**
   * Import the state of parameters, as exported via {@see exportParameters}.
   * @param {Object} state The parameter state to be merged into the parameters' store.
   */
  importParameters: function (state) {
    this.parameterStore = a$.extend(this.parameterStore, state);
  },
  
  /** Merge the parameters from the given map into the current ones
    */
  mergeParameters: function (parameters) {
    var self = this;
    a$.each(parameters, function (p, name) {
      if (typeof p === 'string')
        self.addParameter(Solr.parseParameter(name + '=' + p));
      else 
        self.addParameter(name, p);
    });
  },
  
  /** Iterate over all parameters - including array-based, etc.
    */
  enumerateParameters: function (deep, callback) {
    if (typeof deep !== 'boolean') {
      callback = deep;
      deep = true;
    }
    a$.each(this.parameterStore, function (p) {
      if (deep && Array.isArray(p))
        a$.each(p, callback);
      else if (p !== undefined)
        callback(p);
    });
  },
  
  /** Clears all the parameter store
    */
  resetParameters: function () {
    this.parameterStore = {};
  },
  
  /** Saves the current set of parameters and "opens" a new one, 
    * depending on the argument:
    *
    * @param {Boolean|Oblect} copy  If it is an object - uses it directly as a new parameter store,
    *                               if it is a boolean - determines whether to keep the old one.
    */
  pushParameters: function(copy) {
    this.parameterHistory.push(this.parameterStore);
    if (typeof copy === "object")
      this.parameterStore = copy;
    else if (copy === false)
      this.parameterStore = {};
    else
      this.parameterStore = a$.extend(true, {}, this.parameterStore);
  },
  
  /** Pops the last saved parameters, discarding (and returning) the current one.
    */
  popParameters: function () {
    var ret = this.parameterStore;
    this.parameterStore = this.parameterHistory.pop();
    return ret;
  }
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * SolrAjax compatibility skills.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
(function (Solr, a$){
Solr.Compatibility = function (obj) {
  a$.extend(true, this, obj);
  this.store.root = this;
};


Solr.Compatibility.prototype = {
  store: {
    addByValue: function (name, value, locals) { return this.root.addParameter(name, value, locals); },
    removeByValue: function (name, value) { return this.root.removeParameters(name, indices); },
    find: function (name, needle) { return this.root.findParameters(name, neddle); },
    
    // TODO: Add another ParameterStore methods
  },
  
  // TODO: Add AjaxSolr.AbstractManager methods that differ from ours.
};

})(Solr, asSys);
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * URL querying skills - stacking up all parameters for URL-baesd query.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
Solr.stringifyDomain = function (param) {
  var prefix = [];

  a$.each(param.domain, function (l, k) {  prefix.push((k !== 'type' ? k + '=' : '') + l); });
  return prefix.length > 0 ? "{!" + prefix.join(" ") + "}" : "";
};

Solr.stringifyValue = function (param) {
  var value = param.value || "";
    
  if (Array.isArray(value))
    return value.join(",");
  else if (typeof value !== 'object')
    return value.toString(); 
  else {
    var str = [];
    a$.each(value, function (v, k) { str.push(Solr.escapeField(k) + ":" + Solr.escapeValue(v)); });
    return str.join(" ");
  }
};

Solr.stringifyParameter = function (param) { 
    var prefix = Solr.stringifyDomain(param);
    
    // For dismax request handlers, if the q parameter has local params, the
    // q parameter must be set to a non-empty value.
    return param.value || prefix ? param.name + "=" + encodeURIComponent(prefix + Solr.stringifyValue(param)) : null;
}

Solr.QueryingURL = function (settings) {
};

Solr.QueryingURL.prototype = {
  __expects: [ "enumerateParameters" ],
  
  prepareQuery: function () {
    var query = [],
        self = this;
        
    this.enumerateParameters(function (param) {
      var p = Solr.stringifyParameter(param);
      if (p != null)
        query.push(p);
    });
    
    return { url: '?' + query.join("&") };
  },
  
  parseQuery: function (response) {
    return response;
  }
  
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Json querying skills - putting all appropriate parameters
  * for JSON based query.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd.
  */
  

var paramIsUrlOnly = function(name) {
  return name.match(/^(json\.nl|json\.wrf|json2.+|q|wt|start)$/);
};

var paramJsonName = function (name) {
  var m = name.match(/^json(\.|$)(.*)/);
  return m && m[2];
};

Solr.QueryingJson = function (settings) {
  this.useBody = settings && settings.useBody === "false" ? false : true;
};

Solr.QueryingJson.prototype = {
  __expects: [ "enumerateParameters" ],
  useBody: true,
  
  prepareQuery: function () {
    var url = [ ],
        json = { 'params': {} },
        paramValue = function (param) {
          if (paramIsUrlOnly(param.name)) {
            url.push(Solr.stringifyParameter(param));
            return;
          }
          
          // Now, make the rest of the test.
          var val = null;
          
          if (typeof param.value === 'string')
            val = Solr.stringifyDomain(param) + param.value;
          else if (param.domain !== undefined)
            val = a$.extend({}, param.value, { 'domain': param.domain });
          else
            val = param.value;
            
          return val;
        };
 
    // make shallow enumerator so that arrays are saved as such.
    this.enumerateParameters(false, function (param) {
      // Take care for some very special parameters...
      var val = !Array.isArray(param) ? paramValue(param) : param.map(paramValue),
          name = !Array.isArray(param) ? param.name : param[0].name,
          jname = paramJsonName(name);

      if (val == undefined)
        return;
      else if (jname === '')
        a$.extend(json, val);
      else if (jname !== null)
        a$.path(json, jname, val);
      else
        json.params[name] = val;
    });

    json = JSON.stringify(json);
    if (!this.useBody) {
      url.push(encodeURIComponent(json));
      return { url: '?' + url.join("&") };
    }
    else
      return { url: '?' + url.join("&"), data: json, contentType: "application/json", type: "POST", method:"POST" };
  },
  
  parseQuery: function (response) {
    if (response.responseHeader.params && response.responseHeader.params.json != null) {
      var json = JSON.parse(response.responseHeader.params.json);
      a$.extend(response.responseHeader.params, json, json.params);
      delete response.responseHeader.params.json;
    }
    
    return response;
  }
  
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
 * Persistentcy of configured parameters in URL
 *
 * Author: Ivan Georgiev
 * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
 */

Solr.UrlPersistency = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.id = settings.id;
};

Solr.UrlPersistency.prototype = {
	urlParam: 'sel',
	storedParams: [], // Parameters that need to stay persistent between calls.

  /** Make the initial setup of the manager.
    */
  init: function (manager) {
    a$.pass(this, Solr.UrlPersistency, "init", manager);
    this.manager = manager;
  },

  /**
   * Restore into the manager the given state, i.e. - set of srotred parameters.
   * @param {state} state An array of stored Solr parameters to be restored
   * @description The array of parameters should either be raw Solr { name, value, domain? }, 
   * or it can be { id, value } pair, where `id` refers to the appropriate manger's listener.
   */
  restore: function (state) {
    if (!state)
      state = this.getUrlParam(document.location.href, this.urlParam);
    if (state)
      this.manager.importParameters(state);
  },

  /**
   * Adds a given parameter to the current url.
   * @param {string} url The url to be added the parameter to.
   * @param {string} name Name of the parameter to be added to the URL.
   * @param {string|object} value The value to be stored. If object - stringified first.
   * @returns {string} The new URL.
   */
  addUrlParam: function (url, name, value) {
    value = JSON.stringify(value);

    var a = document.createElement('a'),
      str = !!value ? name + "=" + encodeURIComponent(value) : "",
      mbs, q;

    a.href = url;
    q = a.search;

    mbs = q.match(new RegExp(name + "=[\\S^&]+"))

    if (!!mbs)
      q = q.replace(mbs[0], str);
    else if (!str)
      return;
    else if (q.charAt(0) == '?')
      q = "?" + str;
    else
      q += (q.slice(-1) == "&" ? "" : "&") + str;

    a.search = q;
    return a.href;
  },

  /**
   * 
   * @param {string} url The url to get the addres from
   * @param {*} name 
   */
  getUrlParam: function (url, name) {
    var a = document.createElement('a');
    a.href = url;
    var par = (function () {
      var ret = {},
        seg = a.search.replace(/^\?/, '').split('&'),
        len = seg.length,
        i = 0,
        s, v, arr;
      for (; i < len; i++) {
        if (!seg[i]) {
          continue;
        }
        s = seg[i].split('=');
        v = (s.length > 1) ? decodeURIComponent(s[1].replace(/\+/g, " ")) : '';
        if (s[0].indexOf('[]') == s[0].length - 2) {
          arr = ret[s[0].slice(0, -2)];
          if (arr === undefined)
            ret[s[0].slice(0, -2)] = [v];
          else
            arr.push(v);
        } else
          ret[s[0]] = v;
      }
      return ret;
    })()[name];

    return par && JSON.parse(par);
  },

  /**
   * Pushes the provided persistency state into the browser history store.
   * @param {Object} state The persistancy state object
   */
  pushToHistory: function (state) {
    return window.history.pushState(
      state, 
      document.title,
      this.addUrlParam(window.location.href, this.urlParam, state));
  },

  /**
   * This Solr manage handler, executed after the request, to store the actual parameters.
   */
  afterRequest: function () {
    this.pushToHistory(this.manager.exportParameters(this.storedParams));
  }
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Paging skills
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
Solr.Paging = function (settings) {
  a$.extend(true, this, a$.common(settings, this));

  this.manager = null;
  this.currentPage = this.totalPages = this.totalEntries = null;
};

Solr.Paging.prototype = {
  pageSize: 20,           // The default page size
  domain: null,
  
  /** Make the initial setup of the manager
    */
  init: function (manager) {
    this.manager = manager;
    
    this.manager.addParameter('rows', this.pageSize);
  },

  setPage: function (page) {
    if (this.totalPages == null)
      return false;
      
    if (page === 'next' || page === ">")
      page = this.currentPage + 1;
    else if (page === 'prev' || page === "previous" || page === "<")
      page = this.currentPage - 1;
    else if (page === 'first' || page === 'start')
      page = 1;
    else if (page === 'last' || page === 'end')
      page = this.totalPages;
    else if (typeof page !== 'number')
      page = parseInt(page);
      
    if (page > this.totalPages || page < 1 || page === this.currentPage)
      return false;
    
    this.currentPage = page;
    return this.manager.addParameter('start', (page - 1) * this.pageSize, this.domain);
  },
  
  /** Sets or gets the current page
    */
  page: function (p) {
    if (p !== undefined)
      this.setPage(p);
      
    return this.currentPage;
  },
      
  /**
   * @returns {Number} The page number of the previous page or null if no previous page.
   */
  previousPage: function () {
    return this.currentPage > 1 ? (this.currentPage - 1) : null;
  },

  /**
   * @returns {Number} The page number of the next page or null if no next page.
   */
  nextPage: function () {
    return this.currentPage < this.totalPages ? (this.currentPage + 1) : null;
  },

  /** We need to set all our internals.
    * NOTE: Don't forget to manually call this activity on the skill
    * using {@code}a$.pass(this, <inheriting skill>, 'afterRequest');{@code}
    */
    
  afterRequest: function () {
    var offset  = parseInt(this.manager.response.responseHeader && this.manager.response.responseHeader.params && this.manager.response.responseHeader.params.start || this.manager.getParameter('start').value || 0);

    this.pageSize = parseInt(this.manager.response.responseHeader && this.manager.response.responseHeader.params && this.manager.response.responseHeader.params.rows || this.manager.getParameter('rows').value || this.pageSize);

    this.totalEntries = parseInt(this.manager.response.response.numFound);
    this.currentPage = Math.floor(offset / this.pageSize) + 1;
    this.totalPages = Math.ceil(this.totalEntries / this.pageSize);
  },
  
  /**
   * @param {Number|String} page A page number or text like "next", "prev", "start", "end".
   * @returns {Function} The click handler for the page link.
   */
  clickHandler: function (page) {
    var self = this;
    return function () {
      if (self.setPage(page))
        self.manager.doRequest();
        
      return false;
    }
  }
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Simple indoor requesting skills.
  *
  * Author: Ivan Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */
    
Solr.Requesting = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.manager = null;
};

Solr.Requesting.prototype = {
  resetPage: true,      // Whether to reset to the first page on each requst.
  customResponse: null, // A custom response function, which if present invokes private doRequest.
  
  /** Make the initial setup of the manager.
    */
  init: function (manager) {
    a$.pass(this, Solr.Requesting, "init", manager);
    this.manager = manager;
  },
  
  /** Make the actual request.
    */
  doRequest: function () {
    if (this.resetPage)
      this.manager.addParameter('start', 0);
    this.manager.doRequest(self.customResponse);
  },

  /**
   * @param {String} value The value which should be handled
   * @param {...} a, b, c, d Some parameter that will be transfered to addValue call
   * @returns {Function} Sends a request to Solr if it successfully adds a
   *   filter query with the given value.
   */
   updateHandler: function () {
    var self = this;
    return function () {
      var res = self.addValue.apply(self, arguments);
      if (res)
        self.doRequest();
        
      return res;
    };
   },
  
  /**
   * @param {String} value The value which should be handled
   * @param {...} a, b, c, d Some parameter that will be transfered to addValue call
   * @returns {Function} Sends a request to Solr if it successfully adds a
   *   filter query with the given value.
   */
  clickHandler: function (value, a, b, c) {
    var self = this;
    return function (e) {
      if (self.addValue(value, a, b, c))
        self.doRequest();
        
      return false;
    };
  },

  /**
   * @param {String} value The value.
   * @param {...} a, b, c Some parameter that will be transfered to addValue call
   * @returns {Function} Sends a request to Solr if it successfully removes a
   *   filter query with the given value.
   */
  unclickHandler: function (value, a, b, c) {
    var self = this;
    return function (e) {
      if (self.removeValue(value, a, b, c)) 
        self.doRequest();
        
      return false;
    };
  }
    
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Spying, i.e. alternative requesting skill.
  *
  * Author: Ivan Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */
    
Solr.Spying = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.manager = null;
};

Solr.Spying.prototype = {
  servlet: null,        // The custom servlet to use for the request
  
  /** Make the initial setup of the manager.
    */
  init: function (manager) {
    a$.pass(this, Solr.Spying, "init", manager);
    this.manager = manager;
  },
  
  /** Make the actual request.
    */
  doSpying: function (settings, callback) {
    var man = this.manager;

    man.pushParameters(true);
    if (typeof settings === "function")
      settings(man);
    else a$.each(settings, function (v, k) {
      if (v == null)
        man.removeParameters(k);
      else if (Array.isArray(v))
        a$.each(v, function (vv) { man.addParameter(k, vv); });
      else if (typeof v === "object")
        man.addParameter(v);
      else
        man.addParameter(k, v);
    });
    
    man.doRequest(this.servlet, callback || this.onSpyResponse);
    man.popParameters();
  }
    
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Delayed request skills.
  *
  * Author: Ivan Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */
  
Solr.Delaying = function (settings) {
  this.delayTimer = null;
  this.delayed = settings && settings.delayed || this.delayed;
};

Solr.Delaying.prototype = {
  delayed: 300,       // Number of milliseconds to delay the request
  
  /** Make the actual request obeying the "delayed" settings.
    */
  doRequest: function () {
    var self = this,
        doInvoke = function () {
          a$.pass(self, Solr.Delaying, "doRequest");
          self.delayTimer = null;
        };
    if (this.delayed == null || this.delayed < 10)
      return doInvoke();
    else if (this.delayTimer != null)
      clearTimeout(this.delayTimer);
      
    this.delayTimer = setTimeout(doInvoke, this.delayed);
  }
  
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Added ability to give pattern to text/facet/range values.
  *
  * Author: Ivan Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */
    
Solr.Patterning = function (settings) {
  this.valuePattern = settings && settings.valuePattern || this.valuePattern;
  var oldRE = this.fqRegExp.toString().replace(/^\/\^?|\$?\/$/g,""),
      newRE = "^" + 
        this.escapeRegExp(this.valuePattern.replace(/\{\{!?-\}\}/g, "-?").replace("{{v}}", "__v__"))
          .replace("__v__", oldRE)
          .replace("--?", "-?")
          .replace("--", "");
      
  this.fqRegExp = new RegExp(newRE);
};

Solr.Patterning.prototype = {
  valuePattern: "{{-}}{{v}}",   // The default pattern.
  
  escapeRegExp: function(str) {
	  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  },
  fqValue: function(value,
     exclude) {
    return this.valuePattern
      .replace("{{-}}", exclude ? "-" : "")   // place the exclusion...
      .replace("{{!-}}", exclude ? "" : "-")  // ... or negative exclusion.
      .replace("{{v}}", a$.pass(this, Solr.Patterning, "fqValue", value, exclude)) // now put the actual value
      .replace("--", ""); // and make sure there is not double-negative. TODO!
  }
  
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Free text search skills.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
Solr.Texting = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.manager = null;
};

Solr.Texting.prototype = {
  __expects: [ "doRequest" ],
  
  domain: null,         // Additional attributes to be adde to query parameter.
  customResponse: null, // A custom response function, which if present invokes priavte doRequest.
  escapeNeedle: false,  // Whether to put a backslash before white spaces
  
  /** Make the initial setup of the manager.
    */
  init: function (manager) {
    a$.pass(this, Solr.Texting, "init", manager);
    this.manager = manager;
  },
    
  /**
   * Sets the main Solr query to the given string.
   *
   * @param {String} q The new Solr query.
   * @returns {Boolean} Whether the selection changed.
   */
  addValue: function (q) {
    var val = this.escapeNeedle && q ? q.replace(/\s+/g, "\\ ") : q,
        before = this.manager.getParameter('q'),
        res = this.manager.addParameter('q', val, this.domain);
        after = this.manager.getParameter('q');
    return res && !a$.equal(before, after);
  },

  /**
   * Sets the main Solr query to the empty string.
   *
   * @returns {Boolean} Whether the selection changed.
   */
  clear: function () {
    return this.manager.removeParameters('q');
  },

  /**
   * Sets the main Solr query to the empty string.
   *
   * @returns {Boolean} Whether the selection changed.
   */
  removeValue: function () {
    this.clear();
  },

  /**
   * Returns a function to set the main Solr query.
   *
   * @param {Object} src Source that has val() method capable of providing the value.
   * @returns {Function}
   */
  clickHandler: function (src) {
    var self = this;
    return function () {
      if (!el) 
        el = this;
      
      if (self.addValue(typeof el.val === "function" ? el.val() : el.value))
        self.doRequest();

      return false;
    }
  }
  
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Faceting skills - maintenance of appropriate parameters.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
/* http://wiki.apache.org/solr/SimpleFacetParameters */
var FacetParameters = {
    'prefix': null,
    'sort': null,
    'limit': null,
    'offset': null,
    'mincount': null,
    'missing': null,
    'method': null,
    'enum.cache.minDf': null
  },
  bracketsRegExp = /^\s*\(\s*|\s*\)\s*$/g,
  statsRegExp = /^([^()]+)\(([^)]+)\)$/g;

/**
  * Forms the string for filtering of the current facet value
  */
Solr.facetValue = function (value) {
  if (!Array.isArray(value))
    return Solr.escapeValue(value);
  else if (value.length == 1)
    return Solr.escapeValue(value[0]);
  else
    return "(" + value.map(function (v) { return Solr.escapeValue(v); }).join(" ") + ")";
};

/**
 * Parses a facet filter from a parameter.
 *
 * @returns {Object} { field: {String}, value: {Combined}, exclude: {Boolean} }.
 */ 
Solr.parseFacet = function (value) {
  var old = value.length, 
      sarr, brackets;
  
  value = value.replace(bracketsRegExp, "");
  brackets = old > value.length;

  sarr = value.replace(/\\"/g, "%0022").match(/[^\s:\/"]+|"[^"]+"/g);
  if (!brackets && sarr.length > 1) // we can't have multi-values without a brackets here.
    return null;

  for (var i = 0, sl = sarr.length; i < sl; ++i)
    sarr[i] = sarr[i].replace(/^"|"$/g, "").replace("%0022", '"');
  
  return sarr;
};

/** Build and add stats fields for non-Json scenario
  * TODO: This has never been tested!
  */
Solr.facetStats = function (manager, tag, statistics) {
  manager.addParameter('stats', true);
  var statLocs = {};
  
  // Scan to build the local (domain) parts for each stat    
  a$.each(statistics, function (stats, key) {
    var parts = stats.match(statsRegExp);
        
    if (!parts)
      return;
      
    var field = parts[2],
        func = parts[1],
        loc = statLocs[field];
        
    if (loc === undefined) {
      statLocs[field] = loc = {};
      loc.tag = tag;
    }
    
    loc[func] = true;
    loc.key = key; // Attention - this overrides.
  });
  
  // Finally add proper parameters
  a$.each(statLocs, function (s, f) {
    manager.addParameter('stats.field', f, s);
  });
};

Solr.Faceting = function (settings) {
  this.id = this.field = null;
  a$.extend(true, this, a$.common(settings, this));
  this.manager = null;
  
  // We cannot have aggregattion if we don't have multiple values.
  if (!this.multivalue)
    this.aggregate = false;
    
  if (!this.jsonLocation)
    this.jsonLocation = 'json.facet.' + this.id;
    
  this.facet = settings && settings.facet || {};

  this.fqRegExp = new RegExp('^-?' + Solr.escapeField(this.field).replace("\\", "\\\\") + ':([^]+)$');
};

Solr.Faceting.prototype = {
  multivalue: false,      // If this filter allows multiple values. Values can be arrays.
  aggregate: false,       // If additional values are aggregated in one filter.
  exclusion: false,       // Whether to exclude THIS field from filtering from itself.
  domain: null,           // Some local attributes to be added to each parameter
  nesting: null,          // Wether there is a nesting in the docs - a easier than domain approach.
  useJson: false,         // Whether to use the Json Facet API.
  jsonLocation: null,     // Location in Json faceting object to put the parameter to.
  domain: null,           // By default we don't have any domain data for the requests.
  statistics: null,       // Possibility to add statistics
  
  /** Make the initial setup of the manager for this faceting skill (field, exclusion, etc.)
    */
  init: function (manager) {
    a$.pass(this, Solr.Faceting, "init", manager);
    this.manager = manager;
    
    var exTag = null;

    if (!!this.nesting)
      this.facet.domain = a$.extend({ blockChildren: this.nesting }, this.facet.domain);

    if (this.exclusion) {
      this.domain = a$.extend(this.domain, { tag: this.id + "_tag" });
      exTag = this.id + "_tag";
    }

    if (this.useJson) {
      var facet = { type: "terms", field: this.field, mincount: 1 };
      
      if (!!this.statistics)
        facet.facet = this.statistics;
      
      if (exTag != null)
        facet.domain = { excludeTags: exTag };
        
      this.fqName = "json.filter";
      this.manager.addParameter(this.jsonLocation, a$.extend(true, facet, this.facet));
    }
    else {
      var self = this,
          fpars = a$.extend(true, {}, FacetParameters),
          domain = { key: this.id };
        
      if (exTag != null)
        domain.ex = exTag;
        
      this.fqName = "fq";
      this.manager.addParameter('facet', true);
      
      if (this.facet.date !== undefined) {
        this.manager.addParameter('facet.date', this.field, domain);
        a$.extend(fpars, {
          'date.start': null,
          'date.end': null,
          'date.gap': null,
          'date.hardend': null,
          'date.other': null,
          'date.include': null
        });
      }
      else if (this.facet.range !== undefined) {
        this.manager.addParameter('facet.range', this.field, domain);
        a$.extend(fpars, {
          'range.start': null,
          'range.end': null,
          'range.gap': null,
          'range.hardend': null,
          'range.other': null,
          'range.include': null
        });
      }
      // Set facet.field, facet.date or facet.range to truthy values to add
      // related per-field parameters to the parameter store.
      else {
        this.facet.field = true;
        if (!!this.statistics) {
          domain.stats = this.id + "_stats";
          Solr.facetStats(this.manager, domain.stats, this.statistics);
        }
          
        this.manager.addParameter('facet.field', this.field, domain);
      }
      
      fpars = a$.common(this.facet, fpars);
      a$.each(fpars, function (p, k) { 
        self.manager.addParameter('f.' + Solr.escapeField(self.field) + '.facet.' + k, p); 
      });
      
    }
  },
  
  /**
   * Add a facet filter parameter to the Manager
   *
   * @returns {Boolean} Whether the filter was added.
   */    

  addValue: function (value, exclude) {
    if (!this.multivalue)
      this.clearValues();

    var index;
    if (!this.aggregate || !(index = this.manager.findParameters(this.fqName, this.fqRegExp)).length)
      return this.manager.addParameter(this.fqName, this.fqValue(value, exclude), this.domain);
      
    // No we can obtain the parameter for aggregation.
    var param = this.manager.getParameter(this.fqName, index[0]),
        parsed = this.fqParse(param.value),
        added = false;
    
    if (!Array.isArray(value))
      value = [value];
    for (var v, i = 0, vl = value.length; i < vl; ++i) {
      v = value[i];
      if (parsed.indexOf(v) > -1)
        continue;

      parsed.push(v);
      added = true;
    }
    
    if (!added)
      return false;
    
    param.value = this.fqValue(parsed, exclude);
    return true;
  },
  
  /**
   * Removes a value for filter query.
   *
   * @returns {Boolean} Whether a filter query was removed.
   */    
  removeValue: function (value) {
    if (!this.multivalue)
      return this.clearValues();
    else {
      var self = this,
          removed = false;

      this.manager.removeParameters(this.fqName, function (p) {
        var rr;

        if (!p.value.match(self.fqRegExp))
          return false;
        else if (!self.aggregate) {
          removed = removed || (rr = p.value.indexOf(Solr.facetValue(value)) >= 0);
          return rr;
        }
        
        if (!Array.isArray(value))
          value = [ value ];
        
        var parsed = self.fqParse(p.value).filter(function (v){
          if (value.indexOf(v) == -1)
            return true;
          else {
            removed = true;
            return false;
          }
        });
        
        if (!parsed.length)
          return true;
        else if (parsed.length == 1)
          parsed = parsed[0];
          
        p.value = self.fqValue(parsed);
        return false;
      });
      
      return removed;
    }
  },
  
  /**
   * Tells whether given value is part of facet filter.
   *
   * @returns {Boolean} If the given value can be found
   */      
  hasValue: function (value) {
    var indices = this.manager.findParameters(this.fqName, this.fqRegExp);
        
    for (var p, i = 0, il = indices.length; i < il; ++i) {
      p = this.manager.getParameter(this.fqName, indices[i]);
      if (this.fqParse(p.value).indexOf(value) > -1)
        return true;
    }
    
    return false;
  },
  
  /**
   * Returns all the values - the very same way they were added to the agent.
   */
  getValues: function () {
    var indices = this.manager.findParameters(this.fqName, this.fqRegExp),
        vals = [];
        
    for (var p, i = 0, il = indices.length; i < il; ++i) {
      p = this.manager.getParameter(this.fqName, indices[i]);
      Array.prototype.push.apply(vals, v = this.fqParse(p.value));
    }
    
    return vals;
  },
  
  /**
   * Removes all filter queries using the widget's facet field.
   *
   * @returns {Boolean} Whether a filter query was removed.
   */
  clearValues: function () {
    return this.manager.removeParameters(this.fqName, this.fqRegExp);
  },
  
  /**
   * One of "facet.field", "facet.date" or "facet.range" must be set on the
   * widget in order to determine where the facet counts are stored.
   *
   * @returns {Array} An array of objects with the properties <tt>facet</tt> and
   * <tt>count</tt>, e.g <tt>{ facet: 'facet', count: 1 }</tt>.
   */
  getFacetCounts: function (facet_counts) {
    var property;
    
    if (this.useJson === true) {
        if (facet_counts == null)
          facet_counts = this.manager.response.facets;
      return facet_counts.count > 0 ? facet_counts[this.id].buckets : [];
    }
    
    if (facet_counts == null)
      facet_counts = this.manager.response.facet_counts;
    
    if (this.facet.field !== undefined)
      property = 'facet_fields';
    else if (this.facet.date !== undefined)
      property = 'facet_dates';
    else if (this.facet.range !== undefined)
      property = 'facet_ranges';

    if (property !== undefined) {
      switch (this.manager.getParameter('json.nl').value) {
        case 'map':
          return this.getFacetCountsMap(facet_counts, property);
        case 'arrarr':
          return this.getFacetCountsArrarr(facet_counts);
        default:
          return this.getFacetCountsFlat(facet_counts);
      }
    }
    throw 'Cannot get facet counts unless one of the following properties is set to "true" on widget "' + this.id + '": "facet.field", "facet.date", or "facet.range".';
  },
  
  /**
   * Used if the facet counts are represented as a JSON object.
   *
   * @param {String} property "facet_fields", "facet_dates", or "facet_ranges".
   * @returns {Array} An array of objects with the properties <tt>facet</tt> and
   * <tt>count</tt>, e.g <tt>{ facet: 'facet', count: 1 }</tt>.
   */
  getFacetCountsMap: function (facet_counts, property) {
    var counts = [];
    for (var facet in facet_counts[property][this.id]) {
      counts.push({
        val: facet,
        count: parseInt(facet_counts[property][this.id][facet])
      });
    }
    return counts;
  },

  /**
   * Used if the facet counts are represented as an array of two-element arrays.
   *
   * @param {String} property "facet_fields", "facet_dates", or "facet_ranges".
   * @returns {Array} An array of objects with the properties <tt>facet</tt> and
   * <tt>count</tt>, e.g <tt>{ facet: 'facet', count: 1 }</tt>.
   */
  getFacetCountsArrarr: function (facet_counts, property) {
    var counts = [];
    for (var i = 0, l = facet_counts[property][this.id].length; i < l; i++) {
      counts.push({
        val: facet_counts[property][this.id][i][0],
        count: parseInt(facet_counts[property][this.id][i][1])
      });
    }
    return counts;
  },

  /**
   * Used if the facet counts are represented as a flat array.
   *
   * @param {String} property "facet_fields", "facet_dates", or "facet_ranges".
   * @returns {Array} An array of objects with the properties <tt>facet</tt> and
   * <tt>count</tt>, e.g <tt>{ facet: 'facet', count: 1 }</tt>.
   */
  getFacetCountsFlat: function (facet_counts, property) {
    var counts = [];
    for (var i = 0, l = facet_counts[property][this.id].length; i < l; i += 2) {
      counts.push({
        val: facet_counts[property][this.id][i],
        count: parseInt(facet_counts[property][this.id][i + 1])
      });
    }
    return counts;
  },
  
   /**
   * @param {String|Object} value The facet value.
   * @param {Boolean} exclude Whether to exclude this fq parameter value.
   * @returns {String} An fq parameter value.
   */
  fqValue: function (value, exclude) {
    return (exclude ? '-' : '') + Solr.escapeField(this.field) + ':' + Solr.facetValue(value);
  },

   /**
   * @param {String} value The stringified facet value
   * @returns {Object|String} The value that produced this output
   */
  fqParse: function (value) {
    var m = value.match(this.fqRegExp);
    return m != null ? Solr.parseFacet(m[1]) : null;
  }

};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Ranging skills - maintenance of appropriate parameters.
  *
  * Author: Ivan Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */
  
  
/**
  * Forms the string for filtering of the current facet value
  */
Solr.rangeValue = function (value) {
  return Array.isArray(value) ? "[" + Solr.escapeValue(value[0] || "*") + " TO " + Solr.escapeValue(value[1] || "*") + "]" : Solr.escapeValue(value);
};

/**
 * Parses a facet filter from a parameter.
 *
 * @returns {Object} { field: {String}, value: {Combined}, exclude: {Boolean} }.
 */ 
Solr.parseRange = function (value) {
  var m = value.match(/(-?)([^\s:]+):\s*\[\s*([^\s]+)\s+TO\s+([^\s]+)\s*\]/);
  return !!m ? { field: m[2], exclude: !!m[1], value: [ m[3], m[4] ] } : null
};


Solr.Ranging = function (settings) {
  this.field = this.id = null;
  
  a$.extend(true, this, a$.common(settings, this));
  this.manager = null;
  
  this.fqRegExp = new RegExp("^-?" + Solr.escapeField(this.field).replace("\\", "\\\\") + ":\\s*\\[\\s*([^\\s])+\\s+TO\\s+([^\\s])+\\s*\\]");
  this.fqName = this.useJson ? "json.filter" : "fq";
  if (this.exclusion)
    this.domain = a$.extend(true, this.domain, { tag: this.id + "_tag" });
};

Solr.Ranging.prototype = {
  multirange: false,      // If this filter allows union of multiple ranges.  
  exclusion: false,       // Whether to exclude THIS field from filtering from itself.
  domain: null,           // Some local attributes to be added to each parameter.
  useJson: false,         // Whether to use the Json Facet API.
  domain: null,           // The default, per request local (domain) data.
  
  /** Make the initial setup of the manager.
    */
  init: function (manager) {
    a$.pass(this, Solr.Ranging, "init", manager);
    this.manager = manager;
  },
  
  /**
   * Add a range filter parameter to the Manager
   *
   * @returns {Boolean} Whether the filter was added.
   */    

  addValue: function (value, exclude) {
    // TODO: Handle the multirange case.
    this.clearValues();
    return this.manager.addParameter(this.fqName, this.fqValue(value, exclude), this.domain);
  },
  
  /**
   * Removes a value for filter query.
   *
   * @returns {Boolean} Whether a filter query was removed.
   */    
  removeValue: function (value) {
    // TODO: Handle the multirange case.
    return this.clearValues();
  },
  
  /**
   * Tells whether given value is part of range filter.
   *
   * @returns {Boolean} If the given value can be found
   */      
  hasValue: function (value) {
    // TODO: Handle the multirange case.
    return this.manager.findParameters(this.fqName, this.fqRegExp) != null;
  },
  
  /**
   * Removes all filter queries using the widget's range field.
   *
   * @returns {Boolean} Whether a filter query was removed.
   */
  clearValues: function () {
    return this.manager.removeParameters(this.fqName, this.fqRegExp);
  },
  
   /**
   * @param {String} value The range value.
   * @param {Boolean} exclude Whether to exclude this fq parameter value.
   * @returns {String} An fq parameter value.
   */
  fqValue: function (value, exclude) {
    return (exclude ? '-' : '') + Solr.escapeField(this.field) + ':' + Solr.rangeValue(value);
  },
  
   /**
   * @param {String} value The range value.
   * @param {Boolean} exclude Whether to exclude this fq parameter value.
   * @returns {String} An fq parameter value.
   */
  fqParse: function (value) {
    var m = value.match(this.fqRegExp);
    if (!m)
      return null;
    m.shift();
    return m;
  }
  
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Pivoting, i.e. nested faceting skils.
  *
  * Author: Ivan Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */

var DefaultFaceter = a$(Solr.Faceting);

Solr.Pivoting = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.manager = null;
  this.faceters = { };

  this.id = settings.id;
  this.settings = settings;
  this.rootId = null;
};

Solr.Pivoting.prototype = {
  pivot: null,          // If document nesting is present - here are the rules for it.
  useJson: false,       // Whether to prepare everything with Json-based parameters.
  statistics: null,     // The per-facet statistics that are needed.
  domain: null,         // The default domain for requests
  
  /** Creates a new faceter for the corresponding level
    */
  addFaceter: function (facet, idx) {
    return new DefaultFaceter(facet);
  },
  
  /** Make the initial setup of the manager.
    */
  init: function (manager) {
    a$.pass(this, Solr.Pivoting, 'init', manager);
    
    this.manager = manager;

    var stats = this.statistics;
    if (!this.useJson) {
      // TODO: Test this!
      var loc = { };
      if (!!stats) {
        loc.stats = this.id + "_stats";
        Solr.facetStats(this.manager, loc.stats, stats);
        
        // We clear this to avoid later every faceter from using it.
        stats = null;
      }
        
      if (this.exclusion)
        loc.ex = this.id + "_tag";
        
      this.manager.addParameter('facet.pivot', this.pivot.map(function(f) { return (typeof f === "string") ? f : f.field; }).join(","), loc);
    }
    
    var location = "json";
    for (var i = 0, pl = this.pivot.length; i < pl; ++i) {
      var p = this.pivot[i],
          f = a$.extend(true, { }, this.settings, typeof p === "string" ? { id: p, field: p, disabled: true } : p);
      
      location += ".facet." + f.id;
      if (this.useJson)
        f.jsonLocation = location;
      if (this.rootId == null)
        this.rootId = f.id;
        
      // TODO: Make these work some day
      f.exclusion = false;
      
      // We usually don't need nesting on the inner levels.
      if (p.nesting == null && i > 0)
        delete f.nesting;
        
      f.statistics = stats;
        
      (this.faceters[f.id] = this.addFaceter(f, i)).init(manager);
    }
  },

  getPivotEntry: function (idx) {
    var p = this.pivot[idx];
    return p === undefined ? null : (typeof p === "object" ? p : { id: p, field: p });
  },
  
  getFaceterEntry: function (idx) {
    var p = this.pivot[idx];
    return this.faceters[typeof p === "string" ? p : p.id];  
  },
  
  getPivotCounts: function (pivot_counts) {
    if (this.useJson === true) {
      if (pivot_counts == null)
        pivot_counts = this.manager.response.facets;
      
      return pivot_counts.count > 0 ? pivot_counts[this.rootId].buckets : [];
    }
    else {
      if (pivot_counts == null)
        pivot_counts = this.manager.response.pivot;

      throw { error: "Not supported for now!" }; // TODO!!!
    }
  },
  
  addValue: function (value, exclude) {
    var p = this.parseValue(value);
    return this.faceters[p.id].addValue(p.value, exclude);
  },
  
  removeValue: function (value) {
    var p = this.parseValue(value);
    return this.faceters[p.id].removeValue(p.value);
  },
  
  clearValues: function () {
    a$.each(this.faceters, function (f) { f.clearValues(); });
  },
  
  hasValue: function (value) {
    var p = this.parseValue(value);
    return p.id != null ? this.faceters[p.id].hasValue(p.value) : false;
  },
  
  parseValue: function (value) {
    var m = value.match(/^(\w+):(.+)$/);
    return !m || this.faceters[m[1]] === undefined ? { value: value } : { value: m[2], id: m[1] };
  },
  
   /**
   * @param {String} value The stringified facet value
   * @returns {Object|String} The value that produced this output
   */
  fqParse: function (value) {
    var p = this.parseValue(value),
        v = null;
        
    if (p.id != null)
      v = this.faceters[p.id].fqParse(p.value);
    else for (var id in this.faceters) {
      v = this.faceters[id].fqParse(p.value);
      if (!!v) {
        p.id = id;
        break;
      }
    }
    
    if (Array.isArray(v))
      v = v.map(function (one) { return p.id + ":" + one; });
    else if (v != null)
      v = p.id + ":" + v;

    return v;
  }
  
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Result list tunning and preparation.
  *
  * Author: Ivan Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */
  
Solr.Listing = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.manager = null;
};

Solr.Listing.prototype = {
  nestingRules: null,         // If document nesting is present - here are the rules for it.
  nestingField: null,         // The default nesting field.
  nestLevel: null,            // Inform which level needs to be nested into the listing.
  listingFields: [ "*" ],     // The fields that need to be present in the result list.
  
  /** Make the initial setup of the manager.
    */
  init: function (manager) {
    a$.pass(this, Solr.Listing, 'init', manager);
    
    if (this.nestLevel != null) {
      var level = this.nestingRules[this.nestLevel],
          chF = level.field || this.nestingField,
          parF = this.nestingRules[level.parent] && this.nestingRules[level.parent].field || this.nestingField;
      
      manager.addParameter('fl', 
        "[child parentFilter=" + parF + ":" + level.parent 
        + " childFilter=" + chF + ":" + this.nestLevel 
        + " limit=" + level.limit + "]");
    }

    a$.each(this.listingFields, function (f) { manager.addParameter('fl', f)});    
  }
  
};
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Facet extraction - used for autocomplete with combination of Texting, etc.
  *
  * Author: Ivan Georgiev
  * Copyright © 2020, IDEAConsult Ltd. All rights reserved.
  */

var defaultParameters = {
  'facet': true,
  'rows': 0,
  'fl': "id",
  'facet.limit': -1,
  'facet.mincount': 1,
  'echoParams': "none"
};
  
Solr.FacetListing = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.id = settings.id;
  
  this.parameters = a$.extend(true, { }, defaultParameters);
  this.facetPath = this.useJson ? "facets" : "facet_counts.facet_fields";
  if (!this.useJson)
    this.parameters['json.nl'] = "map";    
};

Solr.FacetListing.prototype = {
  __expects: [ "addValue", "doSpying", "resetValue", "onFound" ],

  servlet: "select",          // what phrase to use on the internal queries
  urlFeed: null,              // which URL parameter to use for initial setup
  useJson: false,             // Whether to use JSON-style parameter setup
  maxResults: 30,             // maximum results in the Autocomplete box
  activeFacets: null,         // a map of active / inactive facets. Default is ON.
  
  init: function (manager) {
    a$.pass(this, Solr.FacetListing, "init", manager);
    this.manager = manager;
    
    // make the initial values stuff
    if (this.urlFeed) {
      var needle = $.url().param(this.urlFeed);
      this.addValue(needle);
      this.resetValue(needle);
    }
  },

  onSelect: function (item) {
    var added = (typeof item === 'string') ? this.addValue(item) : this.manager.getListener(item.id).addValue(item.value);
    
    if (added)
      this.manager.doRequest();
    
    return added;
  },
  
  doRequest: function (term) {
    var self = this;
    
    this.doSpying(
      function (manager) {
        manager.removeParameters('fl');
        manager.mergeParameters(self.parameters);
  
        // manager and self.manager should be the same.
        self.addValue(term || "");
      },
      function (response) { 
        self.onResponse(response);
      });
  },
  
  onResponse: function (response) {
    var self = this,
        list = [];
        
    _.each(_.get(response, this.facetPath), function (facet, fid) {
      if (list.length >= self.maxResults ||
          typeof facet !== "object" || 
          self.activeFacets && self.activeFacets[fid] === false)
        return;
        
      _.each(self.useJson ? facet.buckets : facet, function (entry, key) {
        if (list.length >= self.maxResults)
          return;
          
        if (!self.useJson)
          entry = { 'val': key, 'count': entry };

        list.push({
          id: fid,
          value: entry.val,
          label: (self.lookupMap[entry.val] || entry.val) + ' (' + entry.count + ') - ' + fid
        });
      });
    });

    this.onFound(list);
  },
    
  afterRequest: function () {
    var qval = this.manager.getParameter('q').value || "";
    this.resetValue(qval != "*:*" && qval.length > 0 ? qval : "");
  }
};

  /** ... and finish with some module / export definition for according platforms
    */
  if ( typeof module === "object" && module && typeof module.exports === "object" )
  	module.exports = Solr;
  else {
    this.Solr = Solr;
    if ( typeof define === "function" && define.amd )
      define(Solr);
  }
})(asSys);
