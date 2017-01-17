/** jToxKit - chem-informatics multi-tool-kit.
  * A generic widget for box of tag management.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */

jT.TagWidget = function (settings) {
  a$.extend(true, this, a$.common(settings, this));

  if (!!this.nesting)
    this.facet.domain = a$.extend(this.facet.domain, { blockChildren: this.nesting } );

  this.target = $(settings.target);
  this.header = $(settings.header);
  this.id = settings.id;  
  this.color = this.color || this.target.data("color");
};

jT.TagWidget.prototype = {
  __expects: [ "hasValue", "clickHandler", "getFacetCounts" ],
  color: null,
  renderTag: null,
  nesting: null,          // Wether there is a nesting in the docs
  
  init: function (manager) {
    a$.pass(this, jT.TagWidget, "init", manager);
    this.manager = manager;
  },
  
  afterTranslation: function (data) {
    a$.pass(this, jT.TagWidget, 'afterTranslation'); 

    var self = this,
        objectedItems = this.getFacetCounts(data.facets), 
    		facet = null, 
    		total = 0,
    		hdr = getHeaderText(this.header),
    		refresh = this.header.data("refreshPanel"),
    		el, selected;
        
    objectedItems.sort(function (a, b) {
      return a.val < b.val ? -1 : 1;
    });
    
    if (objectedItems.length == 0)
      this.target.html('No items found in current selection');
    else {
      this.target.empty();
      for (var i = 0, l = objectedItems.length; i < l; i++) {
        facet = objectedItems[i];
        selected = this.hasValue(facet.val);
        total += facet.count;
        
        facet.title = facet.val.toString();
        if (typeof this.modifyTag === 'function')
          facet = this.modifyTag(facet);

        if (!selected)
          facet.onMain = self.clickHandler(facet.val);
        
        this.target.append(el = this.renderTag(facet));
        
        if (selected)
          el.addClass("selected");
      }
    }
      
    hdr.textContent = jT.ui.updateCounter(hdr.textContent, total);
    if (!!refresh)
    	refresh.call();
  }
};
