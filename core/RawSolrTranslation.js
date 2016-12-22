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
    init: function (manager) {
      // Let the other initializers, like the Management, for example
      a$.pass(this, jT.RawSolrTranslation, "init");
      this.manager = manager;
    },
    
    translateResponse: function (response, scope) {
      // now put the stats.
      return {
        'entries': response.response.docs,
        'stats': a$.extend({}, response.stats, response.responseHeader),
        'facets': response.facet_counts,
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
