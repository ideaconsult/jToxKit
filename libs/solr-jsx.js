/** SolrJsX library - a neXt Solr queries JavaScript library.
  * The Core, integrating for all skills
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  

(function () {
  // Define this as a main object to put everything in
  Solr = { version: "0.10.0" };

  // Now import all the actual skills ...
  // ATTENTION: Kepp them in the beginning of the line - this is how smash expects them.
  
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * General query management - actual requests, listeners, etc.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
(function (Solr, a$){
  
Solr.Management = function (obj) {
  a$.extend(true, this, obj);
  
  this.listeners = {};  // The set of listeners - based on their 'id'.
  this.response = null;
  this.error = null;

  this.currentRequest = null;
  this.pendingRequest = null;
};

Solr.Management.prototype = {
  /** Parameters that can and are expected to be overriden during initialization
    */
  connector: null,      // The object for making the actual requests - jQuery object works pretty fine.
  solrUrl: "",          // The bas Solr Url to be used, excluding the servlet.
  servlet: "select",    // Default servlet to be used is "select".
  
  onError: function (message) { window.console && console.log && console.log(message); },
  onPrepare: function (ajaxSettings) { },
  onSuccess: null,
  ajaxSettings: {        // Default settings for the ajax call to the `connector`
    async: true,
    dataType: "json",
    method: 'GET',
    processData: false,
  },

  /** The method for performing the actual request.
    */
  doRequest: function (servlet) {
    var self = this,
        cancel = null,
        settings = {};
    
    // Suppress same request before this one is finished processing. We'll
    // remember that we're being asked and will make _one_ request afterwards.
    if (self.currentRequest != null && self.currentRequest == servlet) {
      self.pendingRequest = servlet || self.servlet;
      return;
    }
    self.inRequest = true;
    
    // Now go to inform the listeners that a request is going to happen and
    // give them a change to cancel it.
    a$.each(self.listeners, function (l) {
      if (a$.act(l, l.beforeRequest, self) === false)
        cancel = l;
    })

    if (cancel !== null) {
      a$.act(cancel, self.onError, "Request cancelled", cancel);
      return; 
    }
    
    // Now let the Querying skill build the settings.url / data
    settings = a$.extend(settings, self.ajaxSettings, self.prepareQuery());
    settings.url = self.solrUrl + (servlet || self.servlet) + (settings.url || "");

    // Prepare the handlers for both error and success.
    settings.error = self.onError;
    settings.success = function (data) {
      self.parseQuery(self.response = data);

      // Now inform all the listeners
      a$.each(self.listeners, function (l) { a$.act(l, l.afterRequest, data, servlet); });

      // Call this for Querying skills, if it is defined.
      a$.act(self, self.parseResponse, data, servlet);
      
      // Time to call the passed on success handler.
      a$.act(self, self.onSuccess);
      
      // Now deal with pending requests, if such exists.
      // Pay attention that this is _not_ recursion, because
      // We're in the success handler, i.e. - async.
      self.currentRequest = null;
      if (self.pendingRequest)
        self.doRequest(self.pendingRequest);
    };
    

    // Inform all our skills for the preparation.
    a$.broadcast(self, 'onPrepare', settings);

    // Give someone the opportunity to make some final tweaks.
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
  
  /** Remove one listener
    */
  removeListener: function (listener) {
    delete this.listeners[listener.id];
    return this;
  },
  
  /** Remove many listeners, according to the given selector.
    * The selector(listener, manager) is invoked and on `true`
    * the listener is removed.
    */
  removeManyListeners: function (selector) {
    if (typeof callback !== 'function')
      throw { name: "Enumeration error", message: "Attempt to select-remove listeners with non-function 'selector': " + selector };
      
    var self = this;
    a$.each(self.listeners, function (l, id) {
      if (selector(l, self))
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

})(Solr, asSys);
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Parameter management skills.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  

(function (Solr, a$){
/** This is directly copied from AjaxSolr.
  */  
Solr.escapeValue = function (value) {
  // If the field value has a space, colon, quotation mark or forward slash
  // in it, wrap it in quotes, unless it is a range query or it is already
  // wrapped in quotes.
  if (value.match(/[ :\/"]/) && !value.match(/[\[\{]\S+ TO \S+[\]\}]/) && !value.match(/^["\(].*["\)]$/)) {
    return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return value;
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

Solr.Configuring = function (obj) {
  a$.extend(true, this, obj);
  
  // Now make some reformating of initial parameters.
  var self = this;
      
  this.parameterStore = {};
  a$.each(this.parameters, function (p, name) {
    if (typeof p === 'string')
      self.addParameter(Solr.parseParameter(name + '=' + p));
    else
      self.addParameter(name, p);
  });
  // We no longer need this - free them.
  delete obj.parameters;
  delete this.parameters;
};

var paramIsMultiple = function (name) { 
  return name.match(/^(?:bf|bq|facet\.date|facet\.date\.other|facet\.date\.include|facet\.field|facet\.pivot|facet\.range|facet\.range\.other|facet\.range\.include|facet\.query|fq|group\.field|group\.func|group\.query|pf|qf|stats\.field)$/);
};

Solr.Configuring.prototype = {
  /** Add a parameter. If `name` is an object - it is treated as a prepared
    * parameter and `value` and `domain` are ignored.
    */
  addParameter: function (param, value, domain) {
    var name;
    
    if (typeof param !== 'object') {
      name = param;
      param = { 'name': param, 'value': value, 'domain': domain };
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
    if (this.parameterStore[name] === undefined) {
      var param = { 'name': name };
      this.parameterStore[name] = paramIsMultiple(name) ? [ param ] : param;
    }
    
    return (index == null || !paramIsMultiple(name)) ? this.parameterStore[name] : this.parameterStore[name][index];
  },
  
  /** Returns an array of values of all parameters with given name
    */
  getAllValues: function (name) {
    var val = null;
    if (this.parameterStore[name] !== undefined)
      val = !paramIsMultiple(name) ? this.parameterStore[name].value : this.parameterStore[name].map(function (p) { return p.value; });

    return val;
  },
  
  /** Iterate over all parameters - including array-based, etc.
    */
  enumerateParameters: function (callback) {
    a$.each(this.parameterStore, function (p) {
      if (Array.isArray(p))
        a$.each(p, callback);
      else
        callback(p);
    });
  }
};

})(Solr, asSys);
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
  
(function (Solr, a$){
  
Solr.QueryingURL = function (obj) {
  a$.extend(true, this, obj);
};

var paramValue = function (value) {
  if (Array.isArray(value))
    return value.join(",");
  else if (typeof value !== 'object')
    return value.toString(); 
  else {
    var str = [];
    a$.each(value, function (v, k) { str.push(k + ":" + Solr.escapeValue(v)); });
    return str.join(" ");
  }
}

Solr.QueryingURL.prototype = {
  prepareParameter: function (param) {
    var prefix = [];
        
    a$.each(param.domain, function (l, k) {  prefix.push((k !== 'type' ? k + '=' : '') + l); });
    prefix = prefix.length > 0 ? "{!" + prefix.join(" ") + "}" : "";
    
    // For dismax request handlers, if the q parameter has local params, the
    // q parameter must be set to a non-empty value.
    return param.value || prefix ? param.name + "=" + encodeURIComponent(prefix + paramValue(param.value || (param.name == 'q' && "*:*"))) : null;
  },
  
  prepareQuery: function () {
    var query = [],
        self = this;
        
    this.enumerateParameters(function (param) {
      var p = self.prepareParameter(param);
      if (p != null)
        query.push(p);
    });
    
    return { url: '?' + query.join("&") };
  },
  
  parseQuery: function (response) {

  },
  
};

})(Solr, asSys);
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Json querying skills - putting all appropriate parameters
  * for JSON based query.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd.
  */
  

(function (Solr, a$){
  
// TODO: This has never been verified, actually!
var renameParameter = function (name) {
  switch (name) {
    case 'fq': return 'filter';
    case 'q': return 'query';
    case 'fl': return 'fields';
    case 'rows': return 'limit';
    case 'start': return 'offset';
    case 'f': return 'facet';
    case 'ex': return 'excludeTags';
    default:
      var m = name.match(/^json\./);
      return !m ? null : name.substr(m[0].length);
  }
};

Solr.QueryingJson = function (obj) {
  a$.extend(true, this, obj);
};

Solr.QueryingJson.prototype = {
  __depends: [ Solr.QueryingURL ],
  
  prepareQuery: function () {
    var self = this,
        urlQuery = [],
        dataQuery = {};
    
    self.enumerateParameters(function (param) {
      var m = renameParameter(param.name);
      if (!m || typeof param.value !== 'object') {
        m = a$.act(this, Solr.QueryingURL.prototype.prepareParam, param);
        if (m != null)
          urlQuery.push(m);
      }
      // A JSON-valid parameter
      else
        a$.path(dataQuery, m, a$.extend({}, param.value, { domain: param.domain }));
    });
    
    console.log("Query URL: " + urlQuery.join("&") + " Data: " + JSON.stringify(dataQuery));
    return { url: '?' + urlQuery.join("&"), data: dataQuery };
  },
  
  parseQuery: function (response) {

  },
  
};

})(Solr, asSys);
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Persistentcy for configured parameters skills.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
(function (Solr, a$){
  
Solr.Persistency = function (obj) {
  a$.extend(true, this, obj);
  this.storage = {};
};

Solr.Persistency.prototype = {
  __depends: [ Solr.Configuring ],
  
  persistentParams: [],   // Parameters that need to stay persistent between calls.

  addParameter: function (param, value, domain) {
    // TODO Check if the parameter is persistent and store it.
    
    // And make the call to the "super".
    a$.pass(this, "addParameter", Solf.Configuring, param, value, domain);
    return param;
  },
  
  /** Remove parameters. If needle is an array it is treated as an idices array,
    * if not - it is first passed to findParameters() call.
    */
  removeParameters: function (indices) {
    // TODO Check if the parameter is persistent and store it.
    
    // And make the call to the "super".
    a$.pass(this, "removeParameters", Solf.Configuring, indices);
  },
  
  /** The method that is invoked just before making the actual request.
    */
  onPrepare: function (settings) {
    
  }
};

})(Solr, asSys);
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Paging skills
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
(function (Solr, a$){
  
Solr.Paging = function (obj) {
  a$.extend(true, this, obj);
  this.manager = null;
  this.currentPage = this.totalPages = this.totalEntries = null;
};

Solr.Paging.prototype = {
  pageSize: 20,           // The default page size
  multivalue: false,      // If this filter allows multiple values
  exclusion: false,       // Whether to exclude THIS field from filtering from itself.
  domain: null,
  
  /** Make the initial setup of the manager for this faceting skill (field, exclusion, etc.)
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

})(Solr, asSys);
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Free text search skills.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
(function (Solr, a$){
  
Solr.Texting = function (obj) {
  a$.extend(true, this, obj);
  this.manager = null;
  this.delayTimer = null;
};

Solr.Texting.prototype = {
  delayed: false,       // Number of milliseconds to delay the request
  domain: null,         // Additional attributes to be adde to query parameter.
  
  /** Make the initial setup of the manager for this faceting skill (field, exclusion, etc.)
    */
  init: function (manager) {
    this.manager = manager;
  },
  
  /** Make the actual filtering obeying the "delayed" settings.
    */
  doRequest: function () {
    if (this.delayed == null)
      return this.manager.doRequest();
    else if (this.delayTimer != null)
      clearTimeout(this.delayTimer);
      
    var self = this;
    this.delayTimer = setTimeout(function () {
      self.manager.addParameter('start', 0);
      self.manager.doRequest();
      self.delayTimer = null;
    }, this.delayed);
  },
  
  /**
   * Sets the main Solr query to the given string.
   *
   * @param {String} q The new Solr query.
   * @returns {Boolean} Whether the selection changed.
   */
  set: function (q) {
    var before = this.manager.getParameter('q'),
        res = this.manager.addParameter('q', q, this.domain);
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
   * Returns a function to unset the main Solr query.
   *
   * @returns {Function}
   */
  unclickHandler: function () {
    var self = this;
    return function () {
      if (self.clear())
        self.doRequest();

      return false;
    }
  },

  /**
   * Returns a function to set the main Solr query.
   *
   * @param {String} value The new Solr query.
   * @returns {Function}
   */
  clickHandler: function (q) {
    var self = this;
    return function () {
      if (self.set(q))
        self.doRequest();

      return false;
    }
  }
  
};

})(Solr, asSys);
/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Faceting skills - maintenance of appropriate parameters.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
  
(function (Solr, a$){
  
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
facetValue = function (value) {
  if (!Array.isArray(value))
    return Solr.escapeValue(value);
  else if (value.length == 1)
    return Solr.escapeValue(value[0]);
  else
    return "(" + value.map(function (v) { return Solr.escapeValue(v); }).join(" ") + ")";
},
leadBracket = /\s*\(\s*?/,
rearBracket = /\s*\)\s*$/;

/**
 * Parses a facet filter from a parameter.
 *
 * @returns {Object} { field: {String}, value: {Combined}, exclude: {Boolean} }.
 */    

Solr.parseFacet = function (value) {
  var m = value.match(/^(-)?([^\s:]+):(.+)$/);
  
  if (!m)
    return null;
  var res = { field: m[2], exclude: !!m[1] },
      sarr = m[3].replace(leadBracket, "").replace(rearBracket, "").replace(/\\"/g, "%0022").match(/[^\s"]+|"[^"]+"/g);

  for (var i = 0, sl = sarr.length; i < sl; ++i)
    sarr[i] = sarr[i].replace(/^"/, "").replace(/"$/, "").replace("%0022", '"');
  
  res.value = sl > 1 ? sarr : sarr[0];
  return res;
};


Solr.Faceting = function (obj) {
  a$.extend(true, this, obj);
  this.manager = null;
  
  // We cannot have aggregattion if we don't have multiple values.
  if (!this.multivalue)
    this.aggregate = false;

  this.fieldRegExp = new RegExp('^-?' + this.field + ':');
};

Solr.Faceting.prototype = {
  multivalue: false,      // If this filter allows multiple values. Values can be arrays.
  aggregate: false,       // If additional values are aggregated in one filter.
  exclusion: false,       // Whether to exclude THIS field from filtering from itself.
  domain: null,           // Some local attributes to be added to each parameter
  facet: { },             // A default, empty definition.
  
  /** Make the initial setup of the manager for this faceting skill (field, exclusion, etc.)
    */
  init: function (manager) {
    this.manager = manager;
    
    var fpars = a$.extend({}, FacetParameters),
        domain = null,
        self = this;

    if (this.exclusion) {
      this.domain = a$.extend(this.domain, { tag: this.id + "_tag" });
      domain = { ex: this.id + "_tag" };
    }

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
      this.manager.addParameter('facet.field', this.field, domain);
    }
    
    fpars = a$.common(this.facet, fpars);
    a$.each(fpars, function (p, k) { 
      self.manager.addParameter('f.' + self.field + '.facet.' + k, p); 
    });
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
    if (!this.aggregate || !(index = this.manager.findParameters('fq', this.fieldRegExp)).length)
      return this.manager.addParameter('fq', this.fq(value, exclude), this.domain);
      
    // No we can obtain the parameter for aggregation.
    var param = this.manager.getParameter('fq', index[0]),
        parsed = Solr.parseFacet(param.value),
        added = false;
    
    if (!Array.isArray(value))
      value = [value];
    for (var v, i = 0, vl = value.length; i < vl; ++i) {
      v = value[i];
      if (parsed.value == v)
        continue;
      else if (Array.isArray(parsed.value) && parsed.value.indexOf(v) >= 0)
        continue;
        
      if (typeof parsed.value === 'string')
        parsed.value = [ parsed.value ];
      parsed.value.push(v);
      added = true;
    }
    
    if (!added)
      return false;
    
    param.value = this.fq(parsed.value, exclude);
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

      this.manager.removeParameters('fq', function (p) {
        var parse, rr;

        if (!p.value.match(self.fieldRegExp))
          return false;
        else if (!self.aggregate) {
          removed = removed || (rr = p.value.indexOf(facetValue(value)) >= 0);
          return rr;
        }
        
        parse = Solr.parseFacet(p.value);
        if (!Array.isArray(value))
          value = [ value ];
          
        if (!Array.isArray(parse.value)) {
          removed = removed || (rr = value.indexOf(parse.value) >= 0);
          return rr;
        }
          
        parse.value = parse.value.filter(function (v){
          if (value.indexOf(v) == -1)
            return true;
          else {
            removed = true;
            return false;
          }
        });
        
        if (!parse.value.length)
          return true;
        else if (parse.value.length == 1)
          parse.value = parse.value[0];
          
        p.value = self.fq(parse.value);
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
    var indices = this.manager.findParameters('fq', this.fieldRegExp),
        value = Solr.escapeValue(value);
        
    for (var p, i = 0, il = indices.length; i < il; ++i) {
      p = this.manager.getParameter('fq', indices[i]);
      if (p.value.replace(this.fieldRegExp, "").indexOf(value) > -1)
        return true;
    }
    
    return false;
  },
  
  /**
   * Removes all filter queries using the widget's facet field.
   *
   * @returns {Boolean} Whether a filter query was removed.
   */
  clearValues: function () {
    return this.manager.removeParameters('fq', this.fieldRegExp);
  },
  
  /**
   * One of "facet.field", "facet.date" or "facet.range" must be set on the
   * widget in order to determine where the facet counts are stored.
   *
   * @returns {Array} An array of objects with the properties <tt>facet</tt> and
   * <tt>count</tt>, e.g <tt>{ facet: 'facet', count: 1 }</tt>.
   */
  getFacetCounts: function () {
    var property;
    if (this.facet.field !== undefined)
      property = 'facet_fields';
    else if (this.facet.date !== undefined)
      property = 'facet_dates';
    else if (this.facet.range !== undefined)
      property = 'facet_ranges';

    if (property !== undefined) {
      switch (this.manager.getParameter('json.nl').value) {
        case 'map':
          return this.getFacetCountsMap(property);
        case 'arrarr':
          return this.getFacetCountsArrarr(property);
        default:
          return this.getFacetCountsFlat(property);
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
  getFacetCountsMap: function (property) {
    var counts = [];
    for (var facet in this.manager.response.facet_counts[property][this.field]) {
      counts.push({
        facet: facet,
        count: parseInt(this.manager.response.facet_counts[property][this.field][facet])
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
  getFacetCountsArrarr: function (property) {
    var counts = [];
    for (var i = 0, l = this.manager.response.facet_counts[property][this.field].length; i < l; i++) {
      counts.push({
        facet: this.manager.response.facet_counts[property][this.field][i][0],
        count: parseInt(this.manager.response.facet_counts[property][this.field][i][1])
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
  getFacetCountsFlat: function (property) {
    var counts = [];
    for (var i = 0, l = this.manager.response.facet_counts[property][this.field].length; i < l; i += 2) {
      counts.push({
        facet: this.manager.response.facet_counts[property][this.field][i],
        count: parseInt(this.manager.response.facet_counts[property][this.field][i+1])
      });
    }
    return counts;
  },
  
  /** A Wrapped for consolidating the request making.
    */
  doRequest: function () {
    this.manager.addParameter('start', 0);
    this.manager.doRequest();
  },
  
  /**
   * @param {String} value The value.
   * @returns {Function} Sends a request to Solr if it successfully adds a
   *   filter query with the given value.
   */
  clickHandler: function (value) {
    var self = this;
    return function (e) {
      if (self.addValue(value))
        self.doRequest();
        
      return false;
    };
  },

  /**
   * @param {String} value The value.
   * @returns {Function} Sends a request to Solr if it successfully removes a
   *   filter query with the given value.
   */
  unclickHandler: function (value) {
    var self = this;
    return function (e) {
      if (self.removeValue(value)) 
        self.doRequest();
        
      return false;
    };
  },
   /**
   * @param {String} value The facet value.
   * @param {Boolean} exclude Whether to exclude this fq parameter value.
   * @returns {String} An fq parameter value.
   */
  fq: function (value, exclude) {
    return (exclude ? '-' : '') + this.field + ':' + facetValue(value);
  }
};

})(Solr, asSys);

  /** ... and finish with some module / export definition for according platforms
    */
  if ( typeof module === "object" && module && typeof module.exports === "object" )
  	module.exports = Solr;
  else {
    this.Solr = Solr;
    if ( typeof define === "function" && define.amd )
      define(Solr);
  }
})();
