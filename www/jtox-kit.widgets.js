/** jToxKit - chem-informatics multi-tool-kit.
  * Base for widgets and UI-related stuff
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */


(function (jT, a$, $) {
  // Define more tools here
  jT.ui = a$.extend(jT.ui, {
    /** Gets a template with given selector and replaces the designated
      * {{placeholders}} from the provided `info`.
      */
  	fillTemplate: function(selector, info) {
  		return $(jT.ui.formatString($(selector).html(), info).replace(/(<img(\s+.*)?)(\s+jt-src=")/, "$1 src=\"")).removeAttr("id");
  	},
  	
    updateCounter: function (str, count, total) {
      var re = null;
      var add = '';
      if (count == null)
        count = 0;
      if (total == null) {
        re = /\(([\d\?]+)\)$/;
        add = '' + count;
      }
      else {
        re = /\(([\d\?]+\/[\d\?\+-]+)\)$/;
        add = '' + count + '/' + total;
      }
  
      // now the addition
      if (!str.match(re))
        str += ' (' + add + ')';
      else
        str = str.replace(re, "(" + add + ")");
  
      return str;
    }
    
  });

  // Now import all the actual skills ...
  // ATTENTION: Kepp them in the beginning of the line - this is how smash expects them.
  
/** jToxKit - chem-informatics multi-tool-kit.
  * A generic widget for list management
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */

jT.ListWidget = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
	this.target = settings.target;
	this.length = 0;
	
	this.clearItems();
};

jT.ListWidget.prototype = {
  itemId: "id",
  
  populate: function (docs, callback) {
  	this.items = docs;
  	this.length = docs.length;
  	
  	$(this.target).empty();
  	for (var i = 0, l = docs.length; i < l; i++)
  		$(this.target).append(this.renderItem(typeof callback === "function" ? callback(docs[i]) : docs[i]));
  },
  
  addItem: function (doc) {
  	this.items.push(doc);
  	++this.length;
  	return this.renderItem(doc);
  },
  
  clearItems: function () {
  	$(this.target).empty();
  	this.items = [];
  	this.length = 0;
  },
  
  findItem: function (id) {
  	var self = this;
  	return a$.findIndex(this.items, typeof id !== "string" ? id : function (doc) { return doc[self.itemId] === id; });
  },
  
  eraseItem: function (id) {
  	var i = this.findItem(id),
  	    r = (i >= 0) ? this.items.splice(i, 1)[0] : false;

    this.length = this.items.length;
    return r;
  },
  
  enumerateItems: function (callback) {
  	var els = $(this.target).children();
  	for (var i = 0, l = this.items.length; i < l; ++i)
  		callback.call(els[i], this.items[i]);
  }
}
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
/** jToxKit - chem-informatics multi-tool-kit.
  * A generic widget for autocomplete box management.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  *
  * TODO: Make it more Solr independent
  */

var defaultParameters = {
  'facet': true,
  'rows': 0,
  'fl': "id",
  'facet.limit': -1,
  'facet.mincount': 1,
  'json.nl': "map",
  'echoParams': "none"
};
  
jT.AutocompleteWidget = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.target = $(settings.target);
  this.delayed = null;
  this.fqName = this.useJson ? "json.filter" : "fq";

  this.spyManager = new settings.SpyManager({ parameters: a$.extend(true, defaultParameters, settings.parameters) });
  var self = this;
  
  a$.each(settings.facetFields, function (facet, id) {
    self.spyManager.addParameter('facet.field', facet.field, a$.extend(true, { key: id }, facet.facet.domain));
  });
};

jT.AutocompleteWidget.prototype = {
  __expects: [ "doRequest", "set" ],
  servlet: "autophrase",
  useJson: false,
  maxResults: 30,
  facetFields: {},
  
  init: function (manager) {
    a$.pass(this, jT.AutocompleteWidget, "init", manager);
    this.manager = manager;
    
    var self = this;
    
    // now configure the independent free text search.
    self.findBox = this.target.find('input').on("change", function (e) {
      var thi$ = $(this);
      if (!self.set(thi$.val()) || self.requestSent)
        return;
        
      thi$.blur().autocomplete("disable");
      self.manager.doRequest();
    });
       
    // configure the auto-complete box. 
    self.findBox.autocomplete({
      'minLength': 0,
      'source': function (request, callback) {
        self.reportCallback = callback;
        self.makeRequest(request.term, function (response) { 
          self.onResponse(response); 
        }, function (jxhr, status, err) {
          callback([ "Err : '" + status + '!']);
        });
      },
      'select': function(event, ui) {
        if (ui.item) {
          self.requestSent = true;
          if (manager.getListener(ui.item.id).addValue(ui.item.value))
            manager.doRequest();
        }
      }
    });
  },
  
  makeRequest: function (term, success, error) {
    var fq = this.manager.getParameter(this.fqName);
        
    this.spyManager.removeParameters('fq');
    for (var i = 0, fql = fq.length; i < fql; ++i)
      this.spyManager.addParameter('fq', fq[i].value);
    
    this.spyManager.addParameter('q', term || "*:*");
    
    var settings = a$.extend(settings, this.manager.ajaxSettings, this.spyManager.prepareQuery());
    settings.url = this.manager.solrUrl + (this.servlet || this.manager.servlet) + settings.url + "&wt=json&json.wrf=?";
    settings.success = success;
    settings.error = error;
    
    return this.manager.connector.ajax( settings );
  },
  
  onResponse: function (response) {
    var self = this,
        list = [];
        
    a$.each(this.facetFields, function (f, id) {
      if (list.length >= self.maxResults)
        return;
        
      for (var facet in response.facet_counts.facet_fields[id]) {
        list.push({
          id: id,
          value: facet,
          label: (lookup[facet] || facet) + ' (' + response.facet_counts.facet_fields[id][facet] + ') - ' + id
        });
        
        if (list.length >= self.maxResults)
          break;
      }
    });
    
    if (typeof this.reportCallback === "function")
      self.reportCallback(list);
  },
    
  afterRequest: function (response) {
    var qval = this.manager.getParameter('q').value;
    this.findBox.val(qval != "*:*" && qval.length > 0 ? qval : "").autocomplete("enable");
    this.requestSent = false;
  }
};

})(jToxKit, asSys, jQuery);
