/** jToxKit - chem-informatics multi-tool-kit.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */


// Define this as a main object to put everything in
var jToxKit = { version: "2.3.3" };

(function (jT, a$, Solr) {
  // Now import all the actual skills ...
  // ATTENTION: Kepp them in the beginning of the line - this is how smash expects them.
  
/** jToxKit - chem-informatics multi toolkit.
 * Generic tools
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
 */

jT = a$.extend(jT, {
  templateRegExp: /\{\{([^}]+)\}\}/,
  /* formats a string, replacing {{number | property}} in it with the corresponding value in the arguments
   */
  formatString: function (str, info, def) {
    var pieces = str.split(jT.templateRegExp),
      pl = pieces.length,
      out = "";

    for (var i = 0;; ++i) {
      out += pieces[i++];
      if (i >= pl)
        break;

      var f = _.get(info, _.trim(pieces[i]), null);
      if (f != null) // i.e. we've found it.
        out += f;
      else if (typeof def === 'function') // not found, but we have default function.
        out += def(pieces[i]);
      else if (typeof def === 'string') // not found, but default string.
        out += def;
      else // we have nothing, so - put nothing.
        out += "";
    }

    return out;
  },

  nicifyNumber: function (num, prec) {
    if (num == null)
      return "";

    var maxPrec = Math.pow(10, prec || 9),
        rounded, prec;
    for (prec = 10; prec < maxPrec; prec *= 10) {
      rounded = Math.round(num * prec);
      if (Math.abs(rounded - num * prec) < .1)
        break;
    }

    return parseInt(rounded) / prec;
  },

  formatUnits: function (str) {
    // change the exponential
    return !str ? '' : str.toString()
      .replace(/(^|\W)u(\w)/g, '$1&#x00B5;$2')
      .replace(/\^\(?([\-\d]+)\)?/g, '<sup>$1</sup>')
      .replace(/ /g, "&nbsp;")
  },

	valueAndUnits: function (val, unit, prec) {
		var out = '';
		if (val != null) {
      val = typeof val === 'string' ? _.trim(val) : jT.nicifyNumber(val, prec).toString();
      out += val.replace(/ /g, "&nbsp;");
      out += jT.formatUnits(unit);
		}
		return out;
	},

  addParameter: function (url, param) {
    return url + (("&?".indexOf(url.charAt(url.length - 1)) == -1) ? (url.indexOf('?') > 0 ? "&" : "?") : '') + param;
  },

  removeParameter: function (url, param) {
    return url.replace(new RegExp('(.*\?.*)(' + param + '=[^\&\s$]*\&?)(.*)'), '$1$3');
  },

  parseURL: function (url) {
    var a = document.createElement('a');
    a.href = url;
    return {
      source: url,
      protocol: a.protocol.replace(':', ''),
      host: a.hostname,
      port: a.port,
      query: a.search,
      params: (function () {
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
      })(),
      file: (a.pathname.match(/\/([^\/?#]+)$/i) || [, ''])[1],
      hash: a.hash.replace('#', ''),
      path: a.pathname.replace(/^([^\/])/, '/$1'),
      relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [, ''])[1],
      segments: a.pathname.replace(/^\//, '').split('/')
    };
  },

  modifyURL: function (url, name, value) {
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

  /* Fix the baseUrl - ensure it has trailing slash
   */
  fixBaseUrl: function (url) {
    if (url && url.charAt(url.length - 1) != '/')
      url += '/';
    return url;
  },

  // form the "default" baseUrl if no other is supplied
  formBaseUrl: function (url) {
    var burl = url.match(/^((http[s]?|ftp):\/)?\/?([^:\/\s]+)(:\d+)?(\/\w+)/);
    if (burl)
      burl = burl[0] + '/';

    console.log("Deduced base URL: " + burl + " (from: " + url + ")");
    return burl;
  },

  copyToClipboard: function (text, prompt) {
    if (!prompt) {
      prompt = "Press Ctrl-C (Command-C) to copy and then Enter.";
    }
    window.prompt(prompt, text);
  },

  fireCallback: function (callback, self) {
    if (!$.isArray(callback))
      callback = [callback];

    var ret = true;
    for (var i = 0, cl = callback.length; i < cl; ++i) {
      var callone = callback[i];
      if (typeof callone != 'function')
        callone = window[callone];
      ret = (typeof callone == 'function') ? (callone.apply((self !== undefined && self != null) ? self : document, Array.prototype.slice.call(arguments, 2))) : undefined;
    }
    return ret;
  },

  activateDownload: function (aEl, blob, destName, autoRemove) {
    var url = URL.createObjectURL(blob),
      selfClick = false;

    if (!aEl) {
      aEl = document.createElement('a');
      selfClick = autoRemove = true;
    } else
      aEl.style.visibility = "visible";

    aEl.href = url;
    aEl.download = destName;

    if (autoRemove === true)
      aEl.addEventListener('click', function () {
        setTimeout(function () {
          if (aEl.parentElement)
            aEl.parentElement.removeChild(aEl);
          window.URL.revokeObjectURL(url);
        }, 0);
      });

    if (selfClick)
      aEl.click();
  },

  promiseXHR: function (ajax) {
    var keySetter = function (xhr, aux) {
      aux && Object.keys(aux).forEach(function (key) {
        xhr[key] = aux[key];
      });
    };

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();

      xhr.open(ajax.method || "GET", ajax.url, true);
      Object.keys(ajax.headers || {}).forEach(function (key) {
        xhr.setRequestHeader(key, ajax.headers[key]);
      });

      if (typeof ajax.dataType === 'string')
        xhr.setRequestHeader('Content-Type', ajax.dataType);

      keySetter(xhr, ajax.settings);
      keySetter(xhr, ajax.xhrFields);

      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4)
          return;

        // Process the response
        if ((xhr.status == 0 && !!xhr.response) || (xhr.status >= 200 && xhr.status < 300))
          resolve(xhr.response, xhr.statusText, xhr);
        else
          reject(xhr, xhr.statusText, xhr.responseText);
      };

      xhr.send(ajax.body || ajax.data);
    });
  },

  blobFromBase64: function (data64, mimeType) {
    return new Blob([data64], {
      type: mimeType
    });
  }
});
/** jToxKit - chem-informatics multi toolkit.
  * Data translation basic skills.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
/***
  * The rationale behind this skill-set is that any data transformation that could be needed from the raw response 
  * to the data expected by the widgets should happen only once. If we have each widget directly being notified 
  * upon query's response, then each widget should transform the data by itself, which could potentially be
  * time consuming. 
  * With this skill-set encapsulation we provide the mechanism for widget(s) to listen to `data ready` notification. 
  * The actual data transformation, of course, is going to be done by another skill set, which will provide the only
  * expected method - `translateResponse`.
  *
  * Consumers are registered pretty much the same way each listener is.
  * There two methods that are expected to be present - `init` and `afterTranslation`.
  * The first one is optional and is invoked once, when the Translation-enabled entity
  * is initialized itself.
  * The other method - `afterTranslation` is invoked on every successfull response.
  */
/**
 * Data translation skills, aimed a generic binding link between translators and parties
 * interested in pre-formatted data.
 *
 */

jT.Translation = function (settings) {
  a$.extend(true, this, settings);
}

jT.Translation.prototype = {
  __expects: [ "translateResponse" ],
  
  /**
   * Methods, that are going to be invoked by the manager.
   */ 
  init: function () {
    // Let the other initializers, like the Management, for example
    a$.pass(this, jT.Translation, "init");
  },
  
  parseResponse: function (response, scope) {
    a$.pass(this, jT.Translation, "parseResponse");
    
    var data = this.translateResponse(response, scope),
        self = this;
    a$.each(this.listeners, function (c) {
      a$.act(c, c.afterTranslation, data, scope, self);
    });
  },
};

/** jToxKit - chem-informatics multi toolkit.
  * Raw SOLR translation
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
/**
 * Raw, non-nested Solr data translation.
 */
jT.RawSolrTranslation = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
}

jT.RawSolrTranslation.prototype = {   
  collapseRules: {
    "study": { fields: /topcategory[_sh]*|endpointcategory[_sh]*|guidance[_sh]*|reference[_sh]*|reference_owner[_sh]*|reference_year[_sh]*|guidance[_sh]*/ },
    "composition": { fields: /CORE|COATING|CONSTITUENT|ADDITIVE|IMPURITY|FUNCTIONALISATION|DOPING/ }
  },
  
  init: function (manager) {
    // Let the other initializers, like the Management, for example
    a$.pass(this, jT.RawSolrTranslation, "init");
  },
  
  translateResponse: function (response, scope) {
    var docs = [],
        self = this,
        filterProps = function (dout, din) {
          a$.each(self.collapseRules, function (r, type) {
            var subdoc = {};
            
            a$.each(din, function (v, k) {
              if (!k.match(r.fields))
                return;
                
              delete din[k];
              
              // smash these annoying multi-arrays.
              if (Array.isArray(v) && v.length == 1)
                v = v[0];
                
              subdoc[k] = v;
            });
            
            // now add this.
            if (dout._extended_ === undefined)
              dout._extended_ = {};
              
            if (dout._extended_[type] === undefined)
              dout._extended_[type] = [ subdoc ];
            else
              dout._extended_[type].push(subdoc);
          });

          // now process the remaining fields too            
          a$.each(din, function (v, k) {
            // smash these annoying multi-arrays.
            if (Array.isArray(v) && v.length == 1)
              v = v[0];

            dout[k] = v;
          });
        };
    
    for (var i = 0, dl = response.response.docs.length; i < dl; ++i) {
      var din = response.response.docs[i],
          ein = response.expanded[din.s_uuid],
          dout = {};
      
      filterProps(dout, din);
      for (var j = 0, edl = ein.docs.length; j < edl; ++j)
        filterProps(dout, ein.docs[j]);
      
      docs.push(dout);
    }
    
    return {
      'entries': docs,
      'stats': a$.extend({}, response.stats, response.responseHeader),
      'facets': a$.extend({}, response.facet_counts.facet_fields || response.facets, response.facet_counts.facet_pivot),
      'paging': { 
        'start': response.response.start,
        'count': response.response.docs.length,
        'total': response.response.numFound,
        'pageSize': parseInt(response.responseHeader.params.rows)
      }
    };
  }
};

// TODO: Potentially add other, higher level methods for constructing a query.
/** jToxKit - chem-informatics multi toolkit.
  * Nested docs SOLR translation
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */
  
/**
 * The nested documents Solr data translation.
 */

jT.NestedSolrTranslation = function (settings) {
  this.nestingField = settings && settings.nestingField || "type_s";
}

jT.NestedSolrTranslation.prototype = {
  init: function (manager) {
    // Let the other initializers, like the Management, for example
    a$.pass(this, jT.NestedSolrTranslation, "init");
  },
  
  translateResponse: function (response, scope) {
    var docs = response.response.docs;
    
    for (var i = 0, dl = docs.length; i < dl; ++i) {
      var d = docs[i],
          ext = {};
          
      if (!d._childDocuments_)
        continue;
        
      for (var j = 0, cl = d._childDocuments_.length; j < cl; ++j) {
        var c = d._childDocuments_[j],
            type = c[this.nestingField];
          
        if (ext[type] === undefined)
          ext[type] = [];
          
        ext[type].push(c);
      }
      
      delete d._childDocuments_;
      d._extended_ = ext;
    }
    
    return {
      'entries': docs,
      'stats': a$.extend({}, response.stats, response.responseHeader),
      'facets': response.facets,
      'paging': { 
        'start': response.response.start,
        'count': response.response.docs.length,
        'total': response.response.numFound,
        'pageSize': parseInt(response.responseHeader.params.rows)
      }
    };
  }
};

// TODO: Potentially add other, higher level methods for constructing a query.
/** jToxKit - chem-informatics multi-tool-kit.
  * A model running skill, based on AMBIT API.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016-2017, IDEAConsult Ltd. All rights reserved.
  */

jT.ModelRunning = function (settings) {
  a$.extend(true, this, settings);
  
  this.models = null;
}

jT.ModelRunning.prototype = {
  __expects: [ 'pollTask' ],
  
  algorithms: false,        // ask for algorithms, not models.
  forceCreate: false,       // upon creating a model from algorithm - whether to attempt getting a prepared one, or always create it new.
  loadOnInit: false,        // whether to make a (blank) request upon loading.
  listFilter: null,         // What needle to use when obtaining model/algorithm list.
  onLoaded: null,           // callback to be called when data has arrived.
  
  init: function (manager) {
    // Let the other initializers.
    a$.pass(this, jT.ModelRunning, "init", manager);
    
    this.manager = manager;
    if (this.loadOnInit)
      this.queryList();
  },
  
  /* List all models provided from the server
  */
  listModels: function () {
    var self = this;

    self.manager.doRequest('model', function (result, jhr) {
      if (result && result.model)
        self.models = result.model;
      else if (jhr.status == 200)
        result = { model: [] }; // empty one. The self.model is already in this state.

      a$.act(self, self.onLoaded, result);
    });
  },

  /* List algorithms that contain given 'needle' in their name
  */
  listAlgorithms: function (needle) {
    var self = this,
        servlet = 'algorithm';

    if (!!needle)
      servlet += '?search=' + needle;
      
    self.manager.doRequest(servlet, function (result, jhr) {
      if (result && result.algorithm)
        self.algorithm = result.algorithm;
      else if (jhr.status == 200)
        result = { algorithm: [] }; // empty one

      a$.act(self, self.onLoaded, result, jhr);
    });
  },

  /**
    * Get a runnable model for the given algorithm
    */
  getModel: function (algoUri, callback) {
    var self = this,
        reportIt = function (task, jhr) {  return callback(task && task.completed > -1 ? task.result : null, jhr); };

    if (self.forceCreate)
      self.pollTask({url: algoUri, method: 'POST'}, reportIt);
    else
      self.manager.doRequest('model?algorithm=' + encodeURIComponent(algoUri), function (result, jhr) {
        if (!result && jhr.status != 404) // Some kind of error.
          callback(null, jhr);
        else if (!result || result.model.length == 0) // Ok, we need to create it.
          self.pollTask({ url: algoUri, method: 'POST' }, reportIt);
        else // Bingo - we've got it!
          callback(result.model[0].URI, jhr);
      });
  },

  /**
    * Run a prediction on a created/obtained model
    */
  runPrediction: function (datasetUri, modelUri, callback) {
    var self = this,
        createAttempted = false,
        obtainResults = null,
        createIt = function (jhr) {
          if (createAttempted) {
            callback(null, jhr);
            return;
          }
          self.pollTask({
            url: modelUri,
            method: "POST", 
            data: { dataset_uri: datasetUri },
          }, function (task, jhr) {
            createAttempted = true;
            if (task && task.completed > -1)
              obtainResults(task.result);
          });
        };
    
    obtainResults = function (uri) {
      self.manager.connector.ajax({
        url: uri,
        method: 'GET',
        dataType: 'json',
        error: function (jhr) { callback(null, jhr); },
        success: function (result, jhr) {
          if (result && result.dataEntry && result.dataEntry.length > 0) {
            var empty = true;
            for (var i = 0, rl = result.dataEntry.length; i < rl; ++i)
              if (a$.weight(result.dataEntry[i].values) > 0) {
                empty = false;
                break;
              }
            if (empty)
              createIt(jhr);
            else
              callback(result, jhr);
          }
          else
            createIt(jhr);
        }
      });
    };
    
    if (self.forceCreate)
      createIt();
    else
      obtainResults(jT.addParameter(datasetUri, 'feature_uris[]=' + encodeURIComponent(modelUri + '/predicted')));
  },

  /**
    * Query the list of algorithms or models on the server
    */
  queryList: function (needle) {
    if (this.algorithms)
      this.listAlgorithms(this.listFilter = (needle || this.listFilter));
    else
      this.listModels(this.modelUri);
  }
};

/** jToxKit - chem-informatics multi-tool-kit.
  * The simple skill of polling for a task - based on the AMBIT API.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016-2017, IDEAConsult Ltd. All rights reserved.
  */

jT.TaskPolling = function (settings) {
  a$.extend(true, this, settings);
  
  this.models = null;
}

jT.TaskPolling.prototype = {
  pollDelay: 250,         // how often to check for task completion. In milliseconds.
  pollTimeout: 15000,     // after how many milliseconds to give up.
  
  init: function (manager) {
    a$.pass(this, jT.TaskPolling, "init", manager);
    this.manager = manager;
  },
  
  /**
    * Poll on a task, until it is finished. Pay attention to the fact that the taskUri could be URI 
    * of any service that _returns_ task definition.
    */
  pollTask : function(taskUri, callback) {
		var self = this, proceedOnTask, queryTask, taskStart = null;
		
		queryTask = function (settings) {
  		if (typeof settings === 'string')
  		  settings = { url: settings, method: 'GET' };
  		settings.error = function (jhr) { callback( null, jhr ); };
  		settings.success = proceedOnTask;
  		settings.dataType = "json";
  		self.manager.connector.ajax(settings);
		}
		    
    proceedOnTask = function (task, jhr) {
  		if (task == null || task.task == null || task.task.length < 1) {
  		  callback(task, jhr);
  			return;
  		}
  		task = task.task[0];
  		if (task.completed > -1 || !!task.error) // i.e. - we're ready or we're in trouble.
  		  callback(task, jhr);
  		else if (taskStart == null) { // first round
    		taskStart = Date.now();
  			setTimeout(function() { queryTask(task.result); }, self.pollDelay);
  		}
  		else if (Date.now() - taskStart > self.poolTimeout) // timedout
  		  callback(task, jhr);
  		else
  			setTimeout(function() { queryTask(task.result); }, self.pollDelay); // normal round.
    }
    
    // Initiate the cycle.
    queryTask(taskUri);
	}
};

/** jToxKit - chem-informatics multi-tool-kit.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2019, IDEAConsult Ltd. All rights reserved.
  */

 function Exporting(settings) {
    a$.extend(true, this, a$.common(settings, this));

    this.manager = null;
};

Exporting.prototype = {
    __expects: [ "addParameter", "prepareQuery" ],
    useJson: false,     // whether we're in JSON mode or URL string one.
    expectJson: false,  // what is the provided manager's mode.
    servlet: null,      // the servlet to be used. Defaults to manager's one.
    exportDefinition: { // Definition of additional parameters
        extraParams: [],
        defaultFilter: null,
        manualFilter: false, // Handles the `fq` parameter manually.
        inheritDomain: true, // Whether to inherit the domain from original query.
        domain: "",
        fieldsRegExp: null,
        idField: 'id',  // The field to be considered ID when provided with id list.
    },

    init: function (manager) {
        a$.pass(this, Exporting, "init", manager);

        this.manager = manager;
        this.servlet = this.servlet || manager.servlet || "select";
        this.fqName = this.useJson ? "json.filter" : "fq";
    },

    transformParameter: function (par, name) {
        var np = {
            value: par.value,
            name: name || par.name
        };

        // Check if we have a different level and the field in the filter is subject to parenting.
        if (this.exportDefinition.inheritDomain && par.domain && par.domain.type == 'parent') {
            if (!this.exportDefinition.domain)
                np.domain = par.domain;
            else if (!par.value || !!par.value.match(this.exportDefinition.fieldsRegExp))
                np.domain = this.exportDefinition.domain;
        }

        return np;
    },

    prepareFilters: function (selectedIds) {
        var innerParams = [],
            fqPar = this.manager.getParameter(this.expectJson ? "json.filter" : "fq");

        for (var i = 0, vl = fqPar.length; i < vl; i++) {
            var par = fqPar[i];

            if (!this.exportDefinition.manualFilter)
                this.addParameter(this.transformParameter(par, this.fqName));
            innerParams.push(Solr.stringifyValue(par));
        }

        // No other job here, if we're in manual filter mode
        if (this.exportDefinition.manualFilter) return innerParams;

        this.addParameter(this.transformParameter(this.manager.getParameter('q')));

        if (!!selectedIds)
            this.addParameter(this.fqName, this.exportDefinition.idField + ":(" + selectedIds.join(" ") + ")");

        return innerParams;
    },
    
    prepareExport: function(auxParams, selectedIds) {
        var innerParams = this.prepareFilters(selectedIds),
            inFilter = innerParams.length > 1 
                ? '(' + innerParams.join(' AND ') + ')' 
                : innerParams.length > 0 
                    ? innerParams[0] 
                    : this.exportDefinition.defaultFilter || "",
            escapedInFilter = inFilter.replace(/"|\\/g, "\\$&");
            
        auxParams = (auxParams || []).concat(this.exportDefinition.extraParams || []);
        for (var i = 0, pl = auxParams.length; i < pl; ++i) {
            var np = this.transformParameter(auxParams[i]);
            
            if (typeof np.value === 'string')
                np.value = np.value
                    .replace("{{filter}}", inFilter)
                    .replace("{{filter-escaped}}", escapedInFilter)
                    .replace(/\(\s*\)\s+OR\s+/, '')

            this.addParameter(np);
        }

        return this; // For chaining.
    },

    getAjax: function (serverUrl, ajaxSettings) {
        var urlPrefix = serverUrl + this.servlet,
            settings = a$.extend({}, this.manager.ajaxSettings, ajaxSettings, this.prepareQuery());

        if (urlPrefix.indexOf('?') > 0 && settings.url && settings.url.startsWith('?'))
            settings.url = '&' + settings.url.substr(1);
        
        settings.url =  urlPrefix + (settings.url || "");
    
        return settings;
    }
};

jT.Exporting = Exporting;

  /** ... and finish with some module / export definition for according platforms
    */
  if ( typeof module === "object" && module && typeof module.exports === "object" )
  	module.exports = jToxKit;
  else {
    this.jToxKit = this.jT = a$.extend({}, this.jToxKit, jToxKit);
    if ( typeof define === "function" && define.amd )
      define(jToxKit);
  }
})(jToxKit, asSys, Solr);
