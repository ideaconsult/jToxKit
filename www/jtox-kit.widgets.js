/** jToxKit - chem-informatics multi-tool-kit.
 * Base for widgets and UI-related stuff
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2020, IDEAConsult Ltd. All rights reserved.
 */

(function (jT, a$, $) {
    // Define more tools here
    jT.ui = $.extend(jT.ui, {
        templates: {},

        bakeTemplate: function (html, info, def) {
            var all$ = $(html);
            $('*', all$[0]).each(function (i, el) {
                var liveEl = null,
                    liveData = {};

                var allAttrs = el.attributes;
                for (var i = 0;i < allAttrs.length; ++i) {
                    if (allAttrs[i].specified && allAttrs[i].value.match(jT.templateRegExp)) {
                        liveData[allAttrs[i].name]  = allAttrs[i].value;
                        allAttrs[i].value = jT.formatString(allAttrs[i].value, info, def);
                    }
                }
                if (el.childNodes.length == 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
                    el = el.childNodes[0];

                    if (el.textContent.match(jT.templateRegExp)) {
                        liveEl = $(el).parent();
                        liveData[''] = el.textContent;
                        el.textContent = jT.formatString(el.textContent, info, def);
                    }                    
                }

                if (liveEl != null)
                    liveEl.addClass('jtox-live-data').data('jtox-live-data', liveData);
            });

            return all$;
        },

        putTemplate: function (id, info, root) {
            var html = jT.ui.bakeTemplate(jT.ui.templates[id], info);
            return !root ? html : $(root).append(html);
        },

        updateTree: function (root, info, def) {
            $('.jtox-live-data', root).each(function (i, el) {
                $.each($(el).data('jtox-live-data'), function (k, v) {
                    v = jT.formatString(v, info, def)
                    if (k === '')
                        el.innerHTML = v;
                    else
                        el.attributes[k] = v;
                });
            });
        },

        fillHtml: function (id, info, def) {
            return jT.formatString(jT.ui.templates[id], info, def);
        },

        getTemplate: function (id, info, def) {
            return $(jT.ui.fillHtml(id, info, def));
        },

        updateCounter: function (str, count, total) {
            var re = null;
            var add = '';
            if (count == null)
                count = 0;
            if (total == null) {
                re = /\(([\d\?]+)\)$/;
                add = '' + count;
            } else {
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

        shortenedData: function (content, message, data) {
            var res = '';

            if (data == null)
                data = content;
            if (data.toString().length <= 5) {
                res += content;
            } else {
                res += '<div class="shortened"><span>' + content + '</div><i class="icon fa fa-copy"';
                if (message != null)
                    res +=  ' title="' + message + '"';
                res += ' data-uuid="' + data + '"></i>';
            }
            return res;
        },
        linkedData: function (content, message, data) {
            var res = '';

            if (data == null)
                data = content;
            if (data.toString().length <= 5)
                res += content;
            else {
                if (message != null) {
                    res += res += '<div title="' + message + '">' + content + '</div>';
                } else res += '<div >' + content + '</div>';
            }
            return res;
        },
        changeTabsIds: function (root, suffix) {
            $('ul li a', root).each(function () {
                var id = $(this).attr('href').substr(1),
                    el = document.getElementById(id);
                id += suffix;
                el.id = id;
                $(this).attr('href', '#' + id);
            })
        },

        addTab: function (root, name, id, content) {
            // first try to see if there is same already...
            if (document.getElementById(id) != null)
                return;

            // first, create and add li/a element
            var a$ = $('<a>', { href: '#' + id }).html(name);
            $('ul', root[0]).append($('<li>').append(a$));

            // then proceed with the panel, itself...
            if (typeof content === 'function')
                content = $(content(root[0]));
            else if (typeof content === 'string')
                content = $(content);

            content.attr('id', id);
            root.append(content).tabs('refresh');
            return { tab: a$, content: content };
        },

        renderRange: function (data, unit, type, prefix) {
            var out = "";
            if (typeof data == 'string' || typeof data == 'number') {
                out += (type != 'display') ? data : ((!!prefix ? prefix + "&nbsp;=&nbsp;" : '') + jT.valueAndUnits(data, unit));
            } else if (typeof data == 'object' && data != null) {
                var loValue = _.trim(data.loValue),
                    upValue = _.trim(data.upValue);

                if (String(loValue) != '' && String(upValue) != '' && !!data.upQualifier && data.loQualifier != '=') {
                    if (!!prefix) {
                        out += prefix + "&nbsp;=&nbsp;";
                    }
                    out += (data.loQualifier == ">=") ? "[" : "(";
                    out += loValue + ", " + upValue;
                    out += (data.upQualifier == "<=") ? "]" : ") ";
                } else { // either of them is non-undefined

                    var fnFormat = function (p, q, v) {
                        var o = '';
                        if (!!p) {
                            o += p + ' ';
                        }
                        if (!!q) {
                            o += (!!p || q != '=') ? (q + ' ') : '';
                        }
                        return o + v;
                    };

                    if (String(loValue) != '') {
                        out += fnFormat(prefix, data.loQualifier || '=', loValue);
                    } else if (String(upValue) != '') {
                        out += fnFormat(prefix, data.upQualifier || '=', upValue);
                    } else {
                        if (!!prefix) {
                            out += prefix;
                        } else {
                            out += type == 'display' ? '-' : '';
                        }
                    }
                }

                out = out.replace(/ /g, "&nbsp;");
                if (type == 'display') {
                    unit = _.trim(data.unit || unit);
                    if (!!unit) {
                        out += '&nbsp;<span class="units">' + unit.replace(/ /g, "&nbsp;") + '</span>';
                    }
                }
            } else {
                out += '-';
            }
            return out;
        },

        putInfo: function (href, title) {
            return '<sup class="helper"><a target="_blank" href="' + (href || '#') + '" title="' + (title || href) + '"><span class="ui-icon ui-icon-info"></span></a></sup>';
        },

        renderRelation: function (data, type, full) {
            if (type != 'display')
                return _.map(data, 'relation').join(',');

            var res = '';
            for (var i = 0, il = data.length; i < il; ++i)
                res += '<span>' + data[i].relation.substring(4).toLowerCase() + '</span>' + jT.ui.putInfo(full.URI + '/composition', data[i].compositionName + '(' + data[i].compositionUUID + ')');
            return res;
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
        topSettings = $.extend(true, {}, self.rootSettings),
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
    dataParams.baseUrl = jT.fixBaseUrl(dataParams.baseUrl);
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
  	  	fn = jT.ui[kit] || jT[kit];
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
	    // as the first parameter of jT.ambit.call();
  	  $.ajax({ settings: "GET", url: dataParams.configFile }, function(config){
    	  if (!!config)
    	    $.extend(true, dataParams, config);
        element.data('jtKit', realInit(dataParams));
  	  });
	  }
	  else {
      var config = dataParams.configuration;
      if (typeof config === 'string')
        config = window[config];
      if (typeof config === 'function')
        config = config.call(kit, dataParams, kit);
      if (typeof config === 'object')
        $.extend(true, dataParams, config);

      delete dataParams.configuration;

      var kitObj = realInit(dataParams, element);
      element.data('jtKit', kitObj);
      return kitObj;
	  }
  },

  // the jToxKit initialization routine, which scans all elements, marked as 'jtox-kit' and initializes them
	initialize: function(root) {
  	var self = this;

  	if (!root) {
      // make this handler for UUID copying. Once here - it's live, so it works for all tables in the future
      $(document).on('click', '.jtox-kit div.shortened + .icon', function () { jT.copyToClipboard($(this).data('uuid')); return false;});
      // install the click handler for fold / unfold
      $(document).on('click', '.jtox-foldable>.title', function(e) { $(this).parent().toggleClass('folded'); });
      // install diagram zooming handlers
      $(document).on('click', '.jtox-diagram .icon', function () {
        $(this).toggleClass('fa-search-plus fa-search-minus');
        $('img', this.parentNode).toggleClass('jtox-smalldiagram');
      });

      // scan the query parameter for settings
  		var url = jT.parseURL(document.location),
  		    queryParams = url.params;
  		
  		if (!self.rootSettings.baseUrl)
  		  queryParams.baseUrl = jT.formBaseUrl(document.location.href);
  		else if (!!queryParams.baseUrl)
    		queryParams.baseUrl = jT.fixBaseUrl(queryParams.baseUrl);

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

	insertTool: function (name, root) {
	  var html = this.tools[name];
	  if (html != null) {
  	  root.innerHTML = html;
  	  this.init(root); // since we're pasting as HTML - we need to make re-traverse and initiazaltion of possible jTox kits.
    }
    return root;
	}

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
        this.target.html("No items found in this selection").addClass("jt-no-tags");
    }
    else {
      this.target.removeClass("jt-no-tags");
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
  */

jT.AutocompleteWidget = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.target = $(settings.target);
  this.lookupMap = settings.lookupMap || {};
};

jT.AutocompleteWidget.prototype = {
  __expects: [ "doRequest", "onSelect" ],

  init: function (manager) {
    var self = this;
        
    // now configure the "accept value" behavior
    self.findBox = this.target.find('input').on("change", function (e) {
      if (self.requestSent)
        return;
      
      var thi$ = $(this);
      if (!self.onSelect(thi$.val()))
        return;
        
      thi$.blur().autocomplete("disable");
    });

    // configure the auto-complete box. 
    self.findBox.autocomplete({
      'minLength': 0,
      'source': function (request, callback) {
        self.reportCallback = callback;
        self.doRequest(request.term);
      },
      'select': function(event, ui) {
        self.requestSent = ui.item && self.onSelect(ui.item);
      }
    });

    a$.pass(this, jT.AutocompleteWidget, "init", manager);
  },

  resetValue: function(val) {
    this.findBox.val(val).autocomplete("enable");
    this.requestSent = false;
  },
  
  onFound: function (list) {
    this.reportCallback && this.reportCallback(list);
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
    return jT.ui.getTemplate(template, info).addClass(this.classes);
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
    return jT.ui.getTemplate(this.expansionTemplate, info).addClass(this.classes);
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
          jT.nicifyNumber(this.limits[0], this.precision), 
          this.title + (enabled || !this.units ? "" : " (" + this.units + ")"), 
          jT.nicifyNumber(this.limits[1], this.precision)
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
        	format: jT.formatString(this.format, this) || ""
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
/** jToxKit - chem-informatics multi-tool-kit.
  * A generic widget for managing current search results
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2020, IDEAConsult Ltd. All rights reserved.
  *
  */

CurrentSearchWidgeting = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  
  this.target = settings.target;
  this.id = settings.id;
  
  this.manager = null;
  this.facetWidgets = {};
  this.fqName = this.useJson ? "json.filter" : "fq";
};

CurrentSearchWidgeting.prototype = {
  useJson: false,
  renderItem: null,
  
  init: function (manager) {
    a$.pass(this, CurrentSearchWidgeting, "init", manager);
        
    this.manager = manager;
  },
  
  registerWidget: function (widget, pivot) {
    this.facetWidgets[widget.id] = pivot;
  },
  
  afterTranslation: function (data) {
    var self = this,
        links = [],
        q = this.manager.getParameter('q'),
        fq = this.manager.getAllValues(this.fqName);
        
    // add the free text search as a tag
    if (!!q.value && !q.value.match(/^(\*:)?\*$/)) {
        links.push(self.renderItem({ title: q.value, count: "x", onMain: function () {
          q.value = "";
          self.manager.doRequest();
          return false;
        } }).addClass("tag_fixed"));
    }

    // now scan all the filter parameters for set values
    for (var i = 0, l = fq != null ? fq.length : 0; i < l; i++) {
	    var f = fq[i],
          vals = null,
          w;
	    
      for (var wid in self.facetWidgets) {
  	    w = self.manager.getListener(wid);
        vals = w.fqParse(f);
  	    if (!!vals)
  	      break;
  	  }
  	  
  	  if (vals == null) continue;
  	    
  	  if (!Array.isArray(vals))
  	    vals = [ vals ];
  	        
      for (var j = 0, fvl = vals.length; j < fvl; ++j) {
        var v = vals[j], el, 
            info = (typeof w.prepareTag === "function") ? 
              w.prepareTag(v) : 
              {  title: v,  count: "x",  color: w.color, onMain: w.unclickHandler(v) };
        
    		links.push(el = self.renderItem(info).addClass("tag_selected " + (!!info.onAux ? "tag_open" : "tag_fixed")));

    		if (fvl > 1)
    		  el.addClass("tag_combined");
      }
      
      if (fvl > 1)
		    el.addClass("tag_last");
    }
    
    if (links.length) {
      links.push(self.renderItem({ title: "Clear", onMain: function () {
        q.value = "";
        for (var wid in self.facetWidgets)
    	    self.manager.getListener(wid).clearValues();
    	    
        self.manager.doRequest();
        return false;
      }}).addClass('tag_selected tag_clear tag_fixed'));
      
      this.target.empty().addClass('tags').append(links);
    }
    else
      this.target.removeClass('tags').html('<li>No filters selected!</li>');
  }

};

jT.CurrentSearchWidget = a$(CurrentSearchWidgeting);
/** jToxKit - chem-informatics multi-tool-kit.
  * A very simple, widget add-on for wiring the ability to change
  * certain property of the agent, based on a provided UI element.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016-2017, IDEAConsult Ltd. All rights reserved.
  */

jT.Switching = function (settings) {
  a$.extend(true, this, a$.common(settings, jT.Switching.prototype));
  var self = this,
      target$ = $(self.switchSelector, $(settings.target)[0]),
      initial = _.get(self, self.switchField);

  // Initialize the switcher according to the field.
  if (typeof initial === 'boolean')
    target$[0].checked = initial;
  else
    target$.val(initial);
        
  // Now, install the handler to change the field with the UI element.
  target$.on('change', function (e) {
    var val = $(this).val();
    
    a$.path(self, self.switchField, typeof initial === 'boolean' ? this.checked || val === 'on' : val);
    a$.act(self, self.onSwitching, e);
    e.stopPropagation();
  });
};

jT.Switching.prototype = {
  switchSelector: ".switcher",  // A CSS selector to find the switching element.
  switchField: null,            // The field to be modified.
  onSwitching: null             // The function to be invoked, on change.
};
/** jToxKit - chem-informatics multi-tool-kit.
  * A very simple, widget add-on for wiring the ability to change
  * certain property of the agent, based on a provided UI element.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016-2017, IDEAConsult Ltd. All rights reserved.
  */

jT.Running = function (settings) {
  a$.extend(true, this, a$.common(settings, jT.Running.prototype));
  var self = this,
      target$ = $(self.runSelector, $(settings.target)[0]),
      runTarget = self.runTarget || self;

  // Now, install the handler to change the field with the UI element.
  target$.on('click', function (e) {
    a$.act(runTarget, self.runMethod, this, e);
    e.stopPropagation();
  });
};

jT.Running.prototype = {
  runSelector: ".switcher",   // A CSS selector to find the switching element.
  runMethod: null,            // The method to be invoked on the given target or on self.
  runTarget: null,            // The target to invoke the method to - this will be used if null.
};
/** jToxKit - chem-informatics multi-tool-kit.
 * Wrapper of table-relevant tools. To be assigned to specific prototype functions
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2020, IDEAConsult Ltd. All rights reserved.
 */

jT.tables = {
	nextPage: function () {
		if (this.entriesCount == null || this.pageStart + this.pageSize < this.entriesCount)
			this.queryEntries(this.pageStart + this.pageSize);
	},

	prevPage: function () {
		if (this.pageStart > 0)
			this.queryEntries(this.pageStart - this.pageSize);
	},

	updateControls: function (qStart, qSize) {
		var pane = $('.jtox-controls', this.rootElement);
		jT.ui.updateTree(pane, {
			"pagestart": qSize > 0 ? qStart + 1 : 0,
			"pageend": qStart + qSize
		});
		pane = pane[0];

		var nextBut = $('.next-field', pane);
		if (this.entriesCount == null || qStart + qSize < this.entriesCount)
			$(nextBut).addClass('paginate_enabled_next').removeClass('paginate_disabled_next');
		else
			$(nextBut).addClass('paginate_disabled_next').removeClass('paginate_enabled_next');

		var prevBut = $('.prev-field', pane);
		if (qStart > 0)
			$(prevBut).addClass('paginate_enabled_previous').removeClass('paginate_disabled_previous');
		else
			$(prevBut).addClass('paginate_disabled_previous').removeClass('paginate_enabled_previous');
	},

	modifyColDef: function (kit, col, category, group) {
		if (col.title === undefined || col.title == null)
			return null;

		var name = col.title.toLowerCase();

		// helper function for retrieving col definition, if exists. Returns empty object, if no.
		var getColDef = function (cat) {
			var catCol = kit.settings.columns[cat];
			if (catCol != null) {
				if (!!group) {
					catCol = catCol[group];
					if (catCol != null) {
						// Allow visible to be set on the whole category
						if (catCol.visible != null) {
							catCol[name] = catCol[name] || {};
							catCol[name].visible = !!catCol[name].visible || !!catCol.visible;
						}
						catCol = catCol[name];
					}
				} else {
					catCol = catCol[name];
				}
			}

			if (catCol == null)
				catCol = {};
			return catCol;
		};
		// now form the default column, if existing and the category-specific one...
		// extract column redefinitions and merge them all.
		col = $.extend(col, (!!group ? getColDef('_') : {}), getColDef(category));
		return col.visible == null || col.visible ? col : null;
	},

	sortColDefs: function (colDefs) {
		for (var i = 0, l = colDefs.length; i < l; ++i)
			colDefs[i].naturalOrder = i;
		colDefs.sort(function (a, b) {
			var res = (a.order || 0) - (b.order || 0);
			if (res == 0) // i.e. they are equal
				res = a.naturalOrder - b.naturalOrder;
			return res;
		});
	},

	processColumns: function (kit, category) {
		var colDefs = [];
		var catList = kit.settings.columns[category];
		for (var name in catList) {
			var col = this.modifyColDef(kit, catList[name], category);
			if (col != null)
				colDefs.push(col);
		}

		this.sortColDefs(colDefs);
		return colDefs;
	},

	renderMulti: function (data, type, full, render, tabInfo) {
		var dlen = data.length;
		if (dlen < 2)
			return render(data[0], type, full);

		var df = '<table' + (!tabInfo ? '' : ' ' + _.map(tabInfo, function (v, k) { return 'data-' + k + '="' + v + '"'; }).join(' ')) + '>';
		for (var i = 0, dlen = data.length; i < dlen; ++i) {
			df += '<tr class="' + (i % 2 == 0 ? 'even' : 'odd') + '"><td>' + render(data[i], type, full, i) + '</td></tr>';
		}

		df += '</table>';
		return df;
	},

	inlineChanger: function (location, breed, holder, handler) {
		if (handler == null)
			handler = "changed";

		if (breed == "select")
			return function (data, type, full) {
				return type != 'display' ? (data || '') : '<select class="jt-inlineaction jtox-handler" data-handler="' + handler + '" data-data="' + location + '" value="' + (data || '') + '">' + (holder || '') + '</select>';
			};
		else if (breed == "checkbox") // we use holder as 'isChecked' value
			return function (data, type, full) {
				return type != 'display' ? (data || '') : '<input type="checkbox" class="jt-inlineaction jtox-handler" data-handler="' + handler + '" data-data="' + location + '"' + (((!!holder && data == holder) || !!data) ? 'checked="checked"' : '') + '"/>';
			};
		else if (breed == "text")
			return function (data, type, full) {
				return type != 'display' ? (data || '') : '<input type="text" class="jt-inlineaction jtox-handler" data-handler="' + handler + '" data-data="' + location + '" value="' + (data || '') + '"' + (!holder ? '' : ' placeholder="' + holder + '"') + '/>';
			};
	},

	installMultiSelect: function (root, callback, parenter) {
		if (parenter == null)
			parenter = function (el) {
				return el.parentNode;
			};
		$('a.select-all', root).on('click', function (e) {
			$('input[type="checkbox"]', parenter(this)).each(function () {
				this.checked = true;
				if (callback == null) $(this).trigger('change');
			});
			if (callback != null)
				callback.call(this, e);
		});
		$('a.unselect-all', root).on('click', function (e) {
			$('input[type="checkbox"]', parenter(this)).each(function () {
				this.checked = false;
				if (callback == null) $(this).trigger('change');
			});
			if (callback != null)
				callback.call(this, e);
		});
	},

	installHandlers: function (kit, root) {
		if (root == null)
			root = kit.rootElement;

		$('.jtox-handler', root).each(function () {
			var name = $(this).data('handler'),
				handler = _.get(kit.settings, [ 'configuration', 'handlers', name ], null) || window[name];

			if (!handler)
				console.log("jToxQuery: referring unknown handler: " + name);
			else if (this.tagName == "INPUT" || this.tagName == "SELECT" || this.tagName == "TEXTAREA")
				$(this).on('change', _.bind(handler, kit)).on('keydown', jT.ui.enterBlur);
			else // all the rest respond on click
				$(this).on('click', _.bind(handler, kit));
		});
	},

	columnData: function (cols, data, type) {
		var out = new Array(data.length);
		if (type == null)
			type = 'display';
		for (var i = 0, dl = data.length; i < dl; ++i) {
			var entry = {};
			var d = data[i];
			for (var c = 0, cl = cols.length; c < cl; ++c) {
				var col = cols[c];
				var val = _.get(d, col.data, col.defaultValue);
				entry[col.title] = typeof col.render != 'function' ? val : col.render(val, type, d);
			}

			out[i] = entry;
		}

		return out;
	},

	queryInfo: function (data) {
		var info = {};
		for (var i = 0, dl = data.length; i < dl; ++i)
			info[data[i].name] = data[i].value;

		if (info.sortingCols > 0) {
			info.sortDirection = info.sortDir_0.toLowerCase();
			info.sortData = info["dataProp_" + info.sortCol_0];
		} else {
			info.sortDirection = 0;
			info.sortData = "";
		}

		return info;
	},

	putTable: function (kit, root, config, settings) {
		var onRow = kit.settings.onRow;
		if (onRow === undefined && settings != null)
			onRow = settings.onRow;

		var opts = $.extend({
			"paging": false,
			"processing": true,
			"lengthChange": false,
			"autoWidth": false,
			"dom": kit.settings.dom,
			"language": kit.settings.oLanguage,
			"serverSide": false,
			"createdRow": function (nRow, aData, iDataIndex) {
				// call the provided onRow handler, if any
				if (typeof onRow == 'function') {
					var res = jT.fireCallback(onRow, kit, nRow, aData, iDataIndex);
					if (res === false)
						return;
				}

				// equalize multi-rows, if there are any
				jT.tables.equalizeHeights.apply(window, $('td.jtox-multi table tbody', nRow).toArray());

				// handle a selection click.. if any
				jT.tables.installHandlers(kit, nRow);
				if (typeof kit.settings.selectionHandler == "function")
					$('input.jt-selection', nRow).on('change', kit.settings.selectionHandler);
				// other (non-function) handlers are installed via installHandlers().

				if (!!kit.settings.onDetails) {
					$('.jtox-details-toggle', nRow).on('click', function (e) {
						var root = jT.tables.toggleDetails(e, nRow);
						root && jT.fireCallback(kit.settings.onDetails, kit, root, aData, this);
					});
				}
			}
		}, settings);

		if (opts.columns == null)
			opts.columns = jT.tables.processColumns(kit, config);
		if (opts.language == null)
			delete opts.language;

		var table = $(root).dataTable(opts);
		$(table).DataTable().columns.adjust();
		return table;
	},

	bindControls: function (kit, handlers) {
		var pane = $('.jtox-controls', kit.rootElement);
		if (kit.settings.showControls) {
			jT.ui.updateTree(pane, { "pagesize": kit.settings.pageSize });
			pane = pane[0];

			$('.next-field', pane).on('click', handlers.nextPage);
			$('.prev-field', pane).on('click', handlers.prevPage);
			$('select', pane).on('change', handlers.sizeChange)
			var pressTimeout = null;
			$('input', pane).on('keydown', function (e) {
				var el = this;
				if (pressTimeout != null)
					clearTimeout(pressTimeout);
				pressTimeout = setTimeout(function () {
					handlers.filter.apply(el, [e]);
				}, 350);
			});
		} else // ok - hide me
			pane.style.display = "none";
	},

	putActions: function (kit, col, ignoreOriginal) {
		if (!!kit.settings.selectionHandler || !!kit.settings.onDetails) {
			var oldFn = col.render;
			var newFn = function (data, type, full) {
				var html = oldFn(data, type, full);
				if (type != 'display')
					return html;

				if (!!ignoreOriginal)
					html = '';

				// this is inserted BEFORE the original, starting with given PRE-content
				if (!!kit.settings.selectionHandler)
					html = '<input type="checkbox" value="' + data + '" class="' +
					(typeof kit.settings.selectionHandler == 'string' ? 'jtox-handler" data-handler="' + kit.settings.selectionHandler + '"' : 'jt-selection"') +
					'/>' + html;

				// strange enough - this is inserted AFTER the original
				if (!!kit.settings.onDetails)
					html += '<span class="jtox-details-toggle ui-icon ui-icon-folder-collapsed" data-data="' + data + '" title="Press to open/close detailed info for this entry"></span>';

				return html;
			};

			col.render = newFn;
		}
		return col;
	},

	toggleDetails: function (event, row) {
		$(event.currentTarget).toggleClass('ui-icon-folder-collapsed');
		$(event.currentTarget).toggleClass('ui-icon-folder-open');
		$(event.currentTarget).toggleClass('jtox-openned');
		if (!row)
			row = $(event.currentTarget).parents('tr')[0];

		var cell = $(event.currentTarget).parents('td')[0];

		if ($(event.currentTarget).hasClass('jtox-openned')) {
			var detRow = document.createElement('tr');
			var detCell = document.createElement('td');
			detRow.appendChild(detCell);
			$(detCell).addClass('jtox-details');

			detCell.setAttribute('colspan', $(row).children().length - 1);
			row.parentNode.insertBefore(detRow, row.nextElementSibling);

			cell.setAttribute('rowspan', '2');
			return detCell;
		} else {
			cell.removeAttribute('rowspan');
			$($(row).next()).remove();
			return null;
		}
	},

	equalizeHeights: function () {
		var tabs = [];
		for (var i = 0; i < arguments.length; ++i)
			tabs[i] = arguments[i].firstElementChild;

		for (;;) {
			var height = 0;
			for (i = 0; i < tabs.length; ++i) {
				if (tabs[i] == null)
					continue;

				if (!$(tabs[i]).hasClass('lock-height') && tabs[i].style.height != '')
					tabs[i].style.height = "auto";

				if (tabs[i].offsetHeight > height)
					height = tabs[i].offsetHeight;
			}

			if (height == 0)
				break;

			for (i = 0; i < tabs.length; ++i) {
				if (tabs[i] != null) {
					$(tabs[i]).height(height);
					tabs[i] = tabs[i].nextElementSibling;
				}
			}
		}
	}
};
/** jToxKit - chem-informatics multi-tool-kit.
 * Wrapper of common Ambit communication tools.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2020, IDEAConsult Ltd. All rights reserved.
 */

jT.ambit = {
	processEntry: function (entry, features, fnValue) {
		if (!fnValue)
			fnValue = defaultSettings.fnAccumulate;

		for (var fid in entry.values) {
			var feature = features[fid];
			if (!feature)
				continue;
			var newVal = entry.values[fid];

			// if applicable - location the feature value to a specific location whithin the entry
			if (!!feature.accumulate && !!newVal && !!feature.data) {
				var fn = typeof feature.accumulate == 'function' ? feature.accumulate : fnValue;
				var accArr = feature.data;
				if (!$.isArray(accArr))
					accArr = [accArr];

				for (var v = 0; v < accArr.length; ++v)
					_.set(entry, accArr[v], jT.fireCallback(fn, this, fid, /* oldVal */ _.get(entry, accArr[v]), newVal, features));
			}
		}

		return entry;
	},

	extractFeatures: function (entry, features, callback) {
		var data = [];
		for (var fId in features) {
			var feat = $.extend({}, features[fId]);
			feat.value = entry.values[fId];
			if (!!feat.title) {
				if (jT.fireCallback(callback, null, feat, fId, data.length) !== false) {
					if (!feat.value)
						feat.value = '-';
					data.push(feat);
				}
			}
		};

		return data;
	},

	parseFeatureId: function (featureId) {
		var parse = featureId.match(/https?\:\/\/(.*)\/property\/([^\/]+)\/([^\/]+)\/.+/);
		if (parse == null)
			return null;
		else
			return {
				topcategory: parse[2].replace("+", " "),
				category: parse[3].replace("+", " ")
			};
	},

	diagramUri: function (uri) {
		return !!uri && (typeof uri == 'string') ? uri.replace(/(.+)(\/conformer.*)/, "$1") + "?media=image/png" : '';
	},

	enumSameAs: function (fid, features, callback) {
		// starting from the feature itself move to 'sameAs'-referred features, until sameAs is missing or points to itself
		// This, final feature should be considered "main" and title and others taken from it.
		var feature = features[fid];
		var base = fid.replace(/(http.+\/feature\/).*/g, "$1");
		var retId = fid;

		for (;;) {
			jT.fireCallback(callback, null, feature, retId);
			if (feature.sameAs == null || feature.sameAs == fid || fid == base + feature.sameAs)
				break;
			if (features[feature.sameAs] !== undefined)
				retId = feature.sameAs;
			else {
				if (features[base + feature.sameAs] !== undefined)
					retId = base + feature.sameAs;
				else
					break;
			}

			feature = features[retId];
		}

		return retId;
	},

	processFeatures: function (features, bases) {
		if (bases == null)
			bases = jT.ambit.baseFeatures;
		features = $.extend(features, bases);

		for (var fid in features) {
			var theFeat = features[fid];
			if (!theFeat.URI)
				theFeat.URI = fid;
			this.enumSameAs(fid, features, function (feature, id) {
				var sameAs = feature.sameAs;
				feature = $.extend(true, feature, theFeat);
				theFeat = $.extend(true, theFeat, feature);
				feature.sameAs = sameAs;
			});
		}

		return features;
	},

	processDataset: function (dataset, features, fnValue, startIdx) {
		if (!features) {
			this.processFeatures(dataset.feature);
			features = dataset.feature;
		}

		if (!fnValue)
			fnValue = defaultSettings.fnAccumulate;

		if (!startIdx)
			startIdx = 0;

		for (var i = 0, dl = dataset.dataEntry.length; i < dl; ++i) {
			this.processEntry(dataset.dataEntry[i], features, fnValue);
			dataset.dataEntry[i].number = i + 1 + startIdx;
			dataset.dataEntry[i].index = i;
		}

		return dataset;
	},

	// format the external identifiers column
	formatExtIdentifiers: function (data, type, full) {
		if (type != 'display')
			return _.map(data, 'id').join(', ');

		var html = '';
		for (var i = 0; i < data.length; ++i) {
			if (i > 0)
				html += '<br/>';
			var id = data[i].id;
			try {
				if (id.startsWith("http")) id = "<a href='" + id + "' target=_blank class='qxternal'>" + id + "</a>";
			} catch (err) {}

			html += data[i].type + '&nbsp;=&nbsp;' + id;
		}
		return html;
	},

	getDatasetValue: function (fid, old, value) {
		return _.compact(_.union(old, value != null ? value.trim().toLowerCase().split("|") : [value]));
	},

	getDiagramUri: function (URI) {
		return !!URI && (typeof URI == 'string') ? URI.replace(/(.+)(\/conformer.*)/, "$1") + "?media=image/png" : '';
	},
	
	/* Grab the paging information from the given URL and place it into the settings of passed
	kit, as <kit>.settings.pageStart and <kit>.settings.pageSize. Pay attention that it is 'pageStart'
	and not 'pageNo'.
	*/
	grabPaging: function (kit, url) {
		var urlObj = jT.parseURL(url);

		if (urlObj.params['pagesize'] !== undefined) {
			var sz = parseInt(urlObj.params['pagesize']);
			if (sz > 0)
				kit.settings.pageSize = kit.pageSize = sz;
			url = jT.removeParameter(url, 'pagesize');
		}

		if (urlObj.params['page'] !== undefined) {
			var beg = parseInt(urlObj.params['page']);
			if (beg >= 0)
				kit.settings.pageStart = kit.pageStart = beg * kit.settings.pageSize;
			url = jT.removeParameter(url, 'page');
		}

		return url;
	},

	// Makes a server call for provided service, with settings form the given kit and calls 'callback' at the end - always.
	call: function (kit, service, callback) {
		var settings = $.extend({}, kit.settings.ajaxSettings),
			accType = settings.plainText ? "text/plain" : (settings.jsonp ? "application/x-javascript" : "application/json");

		if (!settings.data) {
			if (settings.jsonp)
				settings.data = { media: accType };
			if (!settings.method)
				settings.method = 'GET';
		} else if (!settings.method)
			settings.method = 'POST';

		if (!settings.dataType)
			settings.dataType = settings.plainText ? "text" : (settings.jsonp ? 'jsonp' : 'json');
		if (!settings.type)
			settings.type = settings.method;

		// on some queries, like tasks, we DO have baseUrl at the beginning
		if (service.indexOf("http") != 0)
			service = kit.settings.baseUrl + service;

		var myId = self.callId++;
		settings = $.extend(settings, {
			url: service,
			headers: { Accept: accType },
			crossDomain: settings.crossDomain || settings.jsonp,
			timeout: parseInt(settings.timeout),
			jsonp: settings.jsonp ? 'callback' : false,
			error: function (jhr, status, error) {
				jT.fireCallback(settings.onError, kit, service, status, jhr, myId);
				jT.fireCallback(callback, kit, null, jhr);
			},
			success: function (data, status, jhr) {
				jT.fireCallback(settings.onSuccess, kit, service, status, jhr, myId);
				jT.fireCallback(callback, kit, data, jhr);
			}
		})

		jT.fireCallback(settings.onConnect, kit, settings, myId);

		// now make the actual call
		$.ajax(settings);
	},

	/* define the standard features-synonymes, working with 'sameAs' property. Beside the title we define the 'data' property
	as well which is used in processEntry() to location value(s) from given (synonym) properties into specific property of the compound entry itself.
	'data' can be an array, which results in adding value to several places.
	*/
	baseFeatures: {
		"http://www.opentox.org/api/1.1#REACHRegistrationDate" : { title: "REACH Date", data: "compound.reachdate", accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#CASRN" : { title: "CAS", data: "compound.cas", accumulate: true, basic: true, primary: true },
		"http://www.opentox.org/api/1.1#ChemicalName" : { title: "Name", data: "compound.name", accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#TradeName" : { title: "Trade Name", data: "compound.tradename", accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#IUPACName": { title: "IUPAC Name", data: ["compound.name", "compound.iupac"], accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#EINECS": { title: "EINECS", data: "compound.einecs", accumulate: true, basic: true, primary: true },
		"http://www.opentox.org/api/1.1#InChI": { title: "InChI", data: "compound.inchi", shorten: true, accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#InChI_std": { title: "InChI", data: "compound.inchi", shorten: true, accumulate: true, sameAs: "http://www.opentox.org/api/1.1#InChI", basic: true },
		"http://www.opentox.org/api/1.1#InChIKey": { title: "InChI Key", data: "compound.inchikey", accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#InChIKey_std": { title: "InChI Key", data: "compound.inchikey", accumulate: true, sameAs: "http://www.opentox.org/api/1.1#InChIKey", basic: true },
		"http://www.opentox.org/api/1.1#InChI_AuxInfo": { title: "InChI Aux", data: "compound.inchiaux", accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#InChI_AuxInfo_std": { title: "InChI Aux", data: "compound.inchiaux", accumulate: true, sameAs: "http://www.opentox.org/api/1.1#InChI_AuxInfo", basic: true},
		"http://www.opentox.org/api/1.1#IUCLID5_UUID": { title: "IUCLID5 UUID", data: "compound.i5uuid", shorten: true, accumulate: true, basic: true, primary: true },
		"http://www.opentox.org/api/1.1#SMILES": { title: "SMILES", data: "compound.smiles", shorten: true, accumulate: true, basic: true },
		"http://www.opentox.org/api/dblinks#CMS": { title: "CMS", accumulate: true, basic: true },
		"http://www.opentox.org/api/dblinks#ChEBI": { title: "ChEBI", accumulate: true, basic: true },
		"http://www.opentox.org/api/dblinks#Pubchem": { title: "PubChem", accumulate: true, basic: true },
		"http://www.opentox.org/api/dblinks#ChemSpider": { title: "ChemSpider", accumulate: true, basic: true },
		"http://www.opentox.org/api/dblinks#ChEMBL": { title: "ChEMBL", accumulate: true, basic: true },
		"http://www.opentox.org/api/dblinks#ToxbankWiki": { title: "Toxbank Wiki", accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#Diagram": {
			title: "Diagram", search: false, visibility: "main", primary: true, data: "compound.URI", 
			column: {
				'className': "paddingless",
				'width': "125px"
			},
			render: function (data, type, full) {
				dUri = jT.ambit.getDiagramUri(data);
				return (type != "display") 
					? dUri 
					: '<div class="jtox-diagram borderless"><span class="ui-icon ui-icon-zoomin"></span><a target="_blank" href="' + 
						data + 
						'"><img src="' + 
						dUri + 
						'" class="jtox-smalldiagram"/></a></div>';
			}
		},

	}
};

})(jToxKit, asSys, jQuery);
