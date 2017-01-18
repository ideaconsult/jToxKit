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
  		return $(jT.ui.formatString($(selector).html(), info).replace(/(<img(\s+.*)?)(\s+jt-src=")/, "$1 src=\""));
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
	this.target = $(settings.target);
	this.length = 0;
	
	this.clearItems();
};

jT.ListWidget.prototype = {
  itemId: "id",
  
  populate: function (docs, callback) {
  	this.items = docs;
  	this.length = docs.length;
  	
  	this.target.empty();
  	for (var i = 0, l = docs.length; i < l; i++)
      this.target.append(this.renderItem(typeof callback === "function" ? callback(docs[i]) : docs[i]));
  },
  
  addItem: function (doc) {
  	this.items.push(doc);
  	++this.length;
  	return this.renderItem(doc);
  },
  
  clearItems: function () {
  	this.target.empty();
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
  	var els = this.target.children();
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

  this.target = $(settings.target);
  if (!!this.subtarget)
    this.target = this.target.find(this.subtarget).eq(0);
    
  this.id = settings.id;  
  this.color = this.color || this.target.data("color");
  if (!!this.color)
    this.target.addClass(this.color);
};

jT.TagWidget.prototype = {
  __expects: [ "hasValue", "clickHandler" ],
  color: null,
  renderItem: null,
  onUpdated: null,
  subtarget: null,
  
  init: function (manager) {
    a$.pass(this, jT.TagWidget, "init", manager);
    this.manager = manager;
  },
  
  populate: function (objectedItems) {
    var self = this,
    		item = null, 
    		total = 0,
    		el, selected, value;
        
    objectedItems.sort(function (a, b) {
      return (a.value || a.val) < (b.value || b.val) ? -1 : 1;
    });
    
    if (objectedItems.length == 0)
      this.target.html('No items found in current selection');
    else {
      this.target.empty();
      for (var i = 0, l = objectedItems.length; i < l; i++) {
        item = objectedItems[i];
        value = item.value || item.val;
        selected = this.hasValue(value);
        total += item.count;
        
        item.title = value.toString();
        if (typeof this.modifyTag === 'function')
          item = this.modifyTag(item);

        if (!selected)
          item.onMain = self.clickHandler(value);
        
        this.target.append(el = this.renderItem(item));
        
        if (selected)
          el.addClass("selected");
      }
    }
      
    a$.act(this, this.onUpdated, total);
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
  
  a$.each(settings.groups, function (facet) {
    self.spyManager.addParameter('facet.field', facet.field, a$.extend(true, { key: facet.id }, facet.facet.domain));
  });
};

jT.AutocompleteWidget.prototype = {
  __expects: [ "doRequest", "setValue" ],
  servlet: "autophrase",
  useJson: false,
  maxResults: 30,
  groups: {},
  
  init: function (manager) {
    a$.pass(this, jT.AutocompleteWidget, "init", manager);
    this.manager = manager;
    
    var self = this;
    
    // now configure the independent free text search.
    self.findBox = this.target.find('input').on("change", function (e) {
      var thi$ = $(this);
      if (!self.setValue(thi$.val()) || self.requestSent)
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
        
    a$.each(this.groups, function (f) {
      if (list.length >= self.maxResults)
        return;
        
      for (var facet in response.facet_counts.facet_fields[f.id]) {
        list.push({
          id: f.id,
          value: facet,
          label: (lookup[facet] || facet) + ' (' + response.facet_counts.facet_fields[f.id][facet] + ') - ' + f.id
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
/** jToxKit - chem-informatics multi-tool-kit.
  * A very simple, template rendering Item Widget. Suitable for
  * both ListWidget and TagWidgets
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */

jT.SimpleItemWidget = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.target = $(settings.target);
};

jT.SimpleItemWidget.prototype = {
  template: null,
  classes: null,
  
  renderItem: function (info) {
    return jT.ui.fillTemplate(template, info).addClass(this.classes);
  }
};
/** jToxKit - chem-informatics multi-tool-kit.
  * An expansion builder for existing Accordion widget
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */

jT.AccordionExpansion = function (settings) {
  a$.extend(true, this, a$.common(settings, this));

  this.target = $(settings.target);
  this.header = null;
  
  // We're resetting the target, so the rest of skills get a true one.
  if (this.automatic)
    settings.target = this.makeExpansion();
};

jT.AccordionExpansion.prototype = {
  automatic: true,
  title: null,
  hdrClasses: null,
  mainClasses: null,
  expansionTemplate: null,
  
  renderExpansion: function (info) {
    return jT.ui.fillTemplate(this.expansionTemplate, info).addClass(this.classes);
  },
  
  makeExpansion: function (before, title) {
    // Check if we've already made the expansion
    if (!!this.header)
      return; 
      
    this.title = title || this.title || this.id;
    var el$ = this.renderExpansion(this);

    this.accordion = this.target;
    
    if (!before)
      this.accordion.append(el$);
    else if (typeof before === "number")
      this.accordion.children().eq(before).before(el$);
    else if (typeof before === "string")
      $(before, this.accordion[0]).before(el$);
    else
      $(before).before(el$);
   
    this.refresh();
    this.header = $("#" + this.id + "_header");
		return this.target = $("#" + this.id); // ATTENTION: This presumes we've put that ID to the content part!
  },
  
  getHeaderText: function () {
    return this.header.contents().filter(function () { return this.nodeType == 3; })[0];
  },
  
  refresh: function () {
		this.accordion.accordion("refresh");
  }
};

})(jToxKit, asSys, jQuery);
