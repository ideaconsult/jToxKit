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

  /**
   * Raw, non-nested Solr data translation.
   * interested in pre-formatted data.
   *
   */
  
  jT.RawSolrTranslation = function (settings) {
    a$.extend(true, this, settings);
    this.manager = null;
  }
  
  jT.RawSolrTranslation.prototype = {    
    /**
     * Methods, that are going to be invoked by the manager.
     */ 
    init: function (manager) {
      // Let the other initializers, like the Management, for example
      a$.pass(this, jT.RawSolrTranslation, "init");
      this.manager = manager;
    },
    
    translateResponse: function (response, scope) {
      // deal with docs, integrating the expanded part.
      var docs = response.response.docs;
      for (var i = 0, dl = docs.length; i < dl; ++i) {
        var d = docs[i],
            exp = response.expanded[d.s_uuid];
        for (var j = 0, edl = exp.docs.length; j < edl; ++j) {
          var edoc = exp.docs[j];
          a$.each(edoc, function (eprop, eid) {
            if (Array.isArray(d[eid]))
              Array.prototype.push.apply(d[eid], Array.isArray(eprop) ? eprop : [ eprop ]);
            else if (d[eid] == null)
              d[eid] = [ null ].concat(eprop);
          });
        };
      };
      
      // now put the stats.
      return {
        'entries': docs,
        'stats': a$.extend({}, response.facet_counts, response.stats, response.responseHeader),
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
