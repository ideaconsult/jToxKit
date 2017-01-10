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
