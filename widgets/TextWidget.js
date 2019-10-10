/** SolrJsX Widgets - a neXt Solr queries JavaScript widget set.
  * All-prepared input text widget.
  *
  * Author: Ivan Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */
  

Solr.Widgets.Text = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.target = $(settings.target).find('input').on('change', this.clickHandler());
  this.id = settings.id;
};

Solr.Widgets.Text.prototype = {
  __depends: [ Solr.Texting ],
  __expects: [ "clickHandler "],

  afterResponse: function () {
    $(this.target).val('');
  }
};
