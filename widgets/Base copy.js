/** SolrJsX Widgets - a neXt Solr queries JavaScript widget set.
  * Basis for all Solr Widgets
  *
  * Author: Ivan Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */


(function (Solr, a$, $) {
  
  Solr.Widgets = {};
  
  // Now import all the actual skills ...
  // ATTENTION: Kepp them in the beginning of the line - this is how smash expects them.
  
import "PagerWidget";
import "TextWidget";

})(Solr, asSys, jQuery);
