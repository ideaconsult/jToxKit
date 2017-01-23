/** jToxKit - chem-informatics multi-tool-kit.
  * Base for widgets and UI-related stuff
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */

(function (jT, a$, $) {
  // Define more tools here
  jT.ui = a$.extend(jT.ui, {
    templates: {},
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
    },
    
    enterBlur: function (e) {
      if (e.keyCode == 13)
        this.blur();
    },
    
  	/* Fix the baseUrl - remove the trailing slash if any
  	*/
  	fixBaseUrl: function (url) {
      if (url != null && url.charAt(url.length - 1) == '/')
        url = url.slice(0, -1);
    	return url;
  	},
  	
  	/* Deduce the baseUrl from a given Url - either if it is full url, of fallback to jToxKit's if it is local
  	Passed is the first "non-base" component of the path...
  	*/
  	grabBaseUrl: function(url, key) {
      if (url != null) {
        if (!!key) 
          return url.slice(0, url.indexOf("/" + key));
        else if (url.indexOf('http') == 0)
          return this.formBaseUrl(this.parseURL(url));
      }
      
      return this.settings.baseUrl;
  	},
    
  	// form the "default" baseUrl if no other is supplied
  	formBaseUrl: function(url) {
    	var burl = !!url.host ? url.protocol + "://" + url.host + (url.port.length > 0 ? ":" + url.port : '') + '/' + url.segments[0] : null;
    	console.log("Deduced base URL: " + burl + " (from: " + url.source + ")");
      return burl;
  	},
  	
    copyToClipboard: function(text, prompt) {
      if (!prompt) {
        prompt = "Press Ctrl-C (Command-C) to copy and then Enter.";
      }
      window.prompt(prompt, text);
    }
    
  });
  
  // Now import all the actual skills ...
  // ATTENTION: Kepp them in the beginning of the line - this is how smash expects them.
  
/** jToxKit - chem-informatics multi-tool-kit.
  * Base for widgets and UI-related stuff
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */

jT.ui = a$.extend(jT.ui, {
  rootSettings: {}, // These can be modified from the URL string itself.
  kitsMap: {},      // all found kits are put here.
	templateRoot: null,
	callId: 0,

  // initializes one kit, based on the kit name passed, either as params, or found within data-XXX parameters of the element
  initKit: function(element) {
    var self = this,
        dataParams = element.data(),
        kit = dataParams.kit,
        topSettings = $.extend(true, {}, self.rootSettings);
        parent = null;

  	// we need to traverse up, to collect some parent's settings...
  	a$.each(element.parents('.jtox-kit,.jtox-widget').toArray().reverse(), function(el) {
  	  parent = self.kit(el);
    	if (parent != null)
      	topSettings = $.extend(true, topSettings, parent);
  	});

  	// make us ultimate parent of all
  	if (!parent)
  	  parent = self;

    dataParams = $.extend(true, topSettings, dataParams);
    dataParams.baseUrl = self.fixBaseUrl(dataParams.baseUrl);
    dataParams.target = element;
    
    if (dataParams.id === undefined)
      dataParams.id = element.attr('id');

	  // the real initialization function
    var realInit = function (params, element) {
    	if (!kit)
        return null;
        
      // add jTox if it is missing AND there is not existing object/function with passed name. We can initialize ketcher and others like this too.
    	var fn = window[kit];
    	if (typeof fn !== 'function') {
  	  	kit = kit.charAt(0).toUpperCase() + kit.slice(1);
  	  	fn = jT[kit];
  	  }

    	var obj = null;
      if (typeof fn == 'function')
    	  obj = new fn(params);
      else if (typeof fn == "object" && typeof fn.init == "function")
        obj = fn.init(params);

      if (obj != null) {
        if (fn.prototype.__kits === undefined)
          fn.prototype.__kits = [];
        fn.prototype.__kits.push(obj);
        obj.parentKit = parent;
        
        if (dataParams.id !== null)
          self.kitsMap[dataParams.id] = obj;
      }
      else
        console.log("jToxError: trying to initialize unexistent jTox kit: " + kit);

      return obj;
    };

	  // first, get the configuration, if such is passed
	  if (dataParams.configFile != null) {
	    // we'll use a trick here so the baseUrl parameters set so far to take account... thus passing 'fake' kit instance
	    // as the first parameter of jT.call();
  	  $.ajax({ settings: "GET", url: dataParams.configFile }, function(config){
    	  if (!!config)
    	    $.extend(true, dataParams, config);
        element.data('jtKit', realInit(dataParams));
  	  });
	  }
	  else {
	    if (typeof dataParams.configuration == "string" && !!window[dataParams.configuration]) {
	      var config = window[dataParams.configuration];
	      $.extend(true, dataParams, (typeof config === 'function' ? config.call(kit, dataParams, kit) : config));
      }

      element.data('jtKit', realInit(dataParams, element));
	  }
  },

  // the jToxKit initialization routine, which scans all elements, marked as 'jtox-kit' and initializes them
	initialize: function(root) {
  	var self = this;

  	if (!root) {
    	self.initTemplates();

      // make this handler for UUID copying. Once here - it's live, so it works for all tables in the future
      $(document).on('click', '.jtox-kit span.ui-icon-copy', function () { this.copyToClipboard($(this).data('uuid')); return false;});
      // install the click handler for fold / unfold
      $(document).on('click', '.jtox-foldable>.title', function(e) { $(this).parent().toggleClass('folded'); });
      // install diagram zooming handlers
      $(document).on('click', '.jtox-diagram span.ui-icon', function () {
        $(this).toggleClass('ui-icon-zoomin').toggleClass('ui-icon-zoomout');
        $('img', this.parentNode).toggleClass('jtox-smalldiagram');
      });

      // scan the query parameter for settings
  		var url = this.parseURL(document.location),
  		    queryParams = url.params;
  		
  		if (!self.rootSettings.baseUrl)
  		  queryParams.baseUrl = self.formBaseUrl(url);
  		else if (!!queryParams.baseUrl)
    		queryParams.baseUrl = self.fixBaseUrl(queryParams.baseUrl);

      self.rootSettings = $.extend(true, self.rootSettings, queryParams); // merge with defaults
      self.fullUrl = url;
      root = document;
  	}

  	// now scan all insertion divs
  	var fnInit = function() { if (!$(this).data('manualInit')) self.initKit($(this)); };
  	$('.jtox-kit', root).each(fnInit);
  	$('.jtox-widget', root).each(fnInit);
	},

	kit: function (element) {
  	if (typeof element !== "string")
  	  return $(element).data('jtKit');
    else if (this.kitsMap[element] !== undefined)
      return this.kitsMap[element];
    else
      return $("#" + element).data('jtKit');
	},
	
	attachKit: function (element, kit) {
  	return $(element).data('jtKit', kit);
	},

	parentKit: function(name, element) {
	  var self = this;
    var query = null;
    if (typeof name == 'string')
      name = window[name];
    $(element).parents('.jtox-kit').each(function() {
      var kit = self.kit(this);
      if (!kit || !!query)
        return;
      if (!name || kit instanceof name)
        query = kit;
    });

    return query;
  },

	initTemplates: function() {
	  var self = this;

    var root = $('.jtox-template')[0];
    if (!root) {
    	root = document.createElement('div');
    	root.className = 'jtox-template';
    	document.body.appendChild(root);
    }

	  var html = root.innerHTML;
  	for (var t in self.templates) {
    	html += self.templates[t];
  	}

  	root.innerHTML = html;
  	self.templateRoot = root;
	},

	insertTool: function (name, root) {
	  var html = this.tools[name];
	  if (html != null) {
  	  root.innerHTML = html;
  	  this.init(root); // since we're pasting as HTML - we need to make re-traverse and initiazaltion of possible jTox kits.
    }
    return root;
	},

  installHandlers: function (kit, root) {
    if (root == null)
      root = kit.rootElement;

    jT.$('.jtox-handler', root).each(function () {
      var name = jT.$(this).data('handler');
      var handler = null;
      if (kit.settings.configuration != null && kit.settings.configuration.handlers != null)
        handler = kit.settings.configuration.handlers[name];
      handler = handler || window[name];

      if (!handler)
        console.log("jToxQuery: referring unknown handler: " + name);
      else if (this.tagName == "INPUT" || this.tagName == "SELECT" || this.tagName == "TEXTAREA")
        jT.$(this).on('change', handler).on('keydown', jT.ui.enterBlur);
      else // all the rest respond on click
        jT.$(this).on('click', handler);
    });
  },

});
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
  
  populate: function (objectedItems, preserve) {
    var self = this,
    		item = null, 
    		total = 0,
    		el, selected, value;
    
    if (objectedItems.length == null || objectedItems.length == 0) {
      if (!preserve)
        this.target.html('No items found in current selection');
    }
    else {
      objectedItems.sort(function (a, b) {
        return (a.value || a.val) < (b.value || b.val) ? -1 : 1;
      });
      
      if (!preserve)
        this.target.empty();
        
      for (var i = 0, l = objectedItems.length; i < l; i++) {
        item = objectedItems[i];
        value = item.value || item.val;
        selected = this.exclusion && this.hasValue(value);
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
  this.id = settings.id;
  this.lookupMap = settings.lookupMap || {};

  this.fqName = this.useJson ? "json.filter" : "fq";

  this.spyManager = new settings.SpyManager({ parameters: a$.extend(true, defaultParameters, settings.parameters) });
  var self = this;
  
  a$.each(settings.groups, function (facet) {
    self.spyManager.addParameter('facet.field', facet.field, a$.extend(true, { key: facet.id }, facet.facet.domain));
  });
};

jT.AutocompleteWidget.prototype = {
  __expects: [ "doRequest", "addValue" ],
  servlet: "autophrase",
  useJson: false,
  maxResults: 30,
  groups: null,
  
  init: function (manager) {
    a$.pass(this, jT.AutocompleteWidget, "init", manager);
    this.manager = manager;
    
    var self = this;
        
    if (manager.getParameter('q').value == null)
      self.addValue("");
    
    // now configure the independent free text search.
    self.findBox = this.target.find('input').on("change", function (e) {
      var thi$ = $(this);
      if (!self.addValue(thi$.val()) || self.requestSent)
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
          label: (self.lookupMap[facet] || facet) + ' (' + response.facet_counts.facet_fields[f.id][facet] + ') - ' + f.id
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
  this.id = settings.id;
  
  // We're resetting the target, so the rest of skills get a true one.
  if (this.automatic)
    settings.target = this.makeExpansion();
};

jT.AccordionExpansion.prototype = {
  automatic: true,
  title: null,
  classes: null,
  expansionTemplate: null,
  before: null,
  
  renderExpansion: function (info) {
    return jT.ui.fillTemplate(this.expansionTemplate, info).addClass(this.classes);
  },
  
  makeExpansion: function (before, info) {
    // Check if we've already made the expansion
    if (!!this.header)
      return; 
      
    if (!info)
      info = this;
    if (!before)
      before = this.before;
      
    var el$ = this.renderExpansion(info);

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
/** jToxKit - chem-informatics multi-tool-kit.
  * A generic slider (or range) widget
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */

jT.SliderWidget = function (settings) {
  a$.extend(true, this, a$.common(settings, this));

  this.target = $(settings.target);

  this.prepareLimits(settings.limits);
  if (this.initial == null)
    this.initial = this.isRange ? [ this.limits[0], this.limits[1] ] : (this.limits[0] + this.limits[1]) / 2;
    
  this.target.val(Array.isArray(this.initial) ? this.initial.join(",") : this.initial);
    
  if (!!this.automatic)
    this.makeSlider();
};

jT.SliderWidget.prototype = {
  __expects: [ "updateHandler" ],
  limits: null,         // The overall range limit.
  units: null,            // The units of the values.
  initial: null,          // The initial value of the sliders.
  title: null,            // The name of the slier.
  width: null,            // The width of the whole slider.
  automatic: true,        // Whether to automatically made the slider in constructor.
  isRange: true,          // Is this a range slider(s) or a single one?
  showScale: true,        // Whether to show the scale
  format: "%s {{units}}", // The format for value output.
  
  prepareLimits: function (limits) {
    this.limits = typeof limits === "string" ? limits.split(",") : limits;
  
    this.limits[0] = parseFloat(this.limits[0]);
    this.limits[1] = parseFloat(this.limits[1]);
        
    this.precision = Math.pow(10, parseInt(Math.min(1, Math.floor(Math.log10(this.limits[1] - this.limits[0] + 1) - 3))));
    if (this.precision < 1 && this.precision > .01) 
      this.precison = .01;
  },
  
  updateSlider: function (value, limits) {
    if (Array.isArray(value))
      value = value.join(",");
      
    if (limits != null) {
      this.prepareLimits(limits);
      this.target.jRange('updateRange', this.limits, value);      
    }
    else
      this.target.jRange('setValue', value);
  },
  
  makeSlider: function () {
    var self = this,
        enabled = this.limits[1] > this.limits[0],
        scale = [
          jT.ui.formatNumber(this.limits[0], this.precision), 
          this.title + (enabled || !this.units ? "" : " (" + this.units + ")"), 
          jT.ui.formatNumber(this.limits[1], this.precision)
        ],
        updateHandler = self.updateHandler(),
        settings = {
        	from: this.limits[0],
        	to: this.limits[1],
        	step: this.precision,
        	scale: scale,
        	showScale: this.showScale,
        	showLabels: enabled,
        	disable: !enabled,
        	isRange: this.isRange,
        	width: this.width,
        	format: jT.ui.formatString(this.format, this) || ""
      	};
    
    if (this.color != null)
      settings.theme = "theme-" + this.color;
      
    settings.ondragend = function (value) {
      if (typeof value === "string" && self.isRange)
        value = value.split(",");
        
      value = Array.isArray(value) ? value.map(function (v) { return parseFloat(v); }) : parseFloat(value);
      return updateHandler(value);
    };
      
    return this.target.jRange(settings);
  }
};

})(jToxKit, asSys, jQuery);
