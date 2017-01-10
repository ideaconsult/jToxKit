/** jToxKit - chem-informatics multi-tool-kit.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */


(function () {
  // Define this as a main object to put everything in
  var jToxKit = { version: "2.0.1" };

  // Now import all the actual skills ...
  // ATTENTION: Kepp them in the beginning of the line - this is how smash expects them.
  
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
(function (jT, a$) {  

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
      var self = this;
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
  
})(jToxKit, asSys);
/** jToxKit - chem-informatics multi toolkit.
  * Raw SOLR translation
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
/***
  * 
  */
(function (jT, a$) {  
  var defaultRules = {
    "study": { fields: /topcategory[_sh]*|endpointcategory[_sh]*|guidance_[_sh]*|reference[_sh]*|reference_owner[_sh]*|reference_year[_sh]*|guidance[_sh]*/ },
    "composition": { fields: /CORE|COATING|CONSTITUENT|ADDITIVE|IMPURITY|FUNCTIONALISATION|DOPING/ }
  };
  
  /**
   * Raw, non-nested Solr data translation.
   */
  
  jT.RawSolrTranslation = function (settings) {
    this.collapseRules = a$.extend(true, {}, defaultRules, settings && settings.collapseRules);
  }
  
  jT.RawSolrTranslation.prototype = {    
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
})(jToxKit, asSys);
/** jToxKit - chem-informatics multi toolkit.
  * Nested docs SOLR translation
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */
  
/***
  * Solr nested docs translation skill.
  */
(function (jT, a$) {  

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
})(jToxKit, asSys);

  /** ... and finish with some module / export definition for according platforms
    */
  if ( typeof module === "object" && module && typeof module.exports === "object" )
  	module.exports = jToxKit;
  else {
    this.jToxKit = a$.extend({}, this.jToxKit, jToxKit);
    if ( typeof define === "function" && define.amd )
      define(jToxKit);
  }
})();
