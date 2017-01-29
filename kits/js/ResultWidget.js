(function (Solr, a$, $, jT) {

var htmlLink = '<a href="{{href}}" title="{{hint}}" target="{{target}}" class="{{css}}">{{value}}</a>';
  
jT.ItemListWidget = function (settings) {
  a$.extend(true, this, a$.common(settings, this));

  this.lookupMap = settings.lookupMap || {};
	this.target = settings.target;
	this.id = settings.id;
};

jT.ItemListWidget.prototype = {
  baseUrl: "",
  summaryPrimes: [ "RESULTS" ],
  onCreated: null,
  onClick: null,
  summaryRenderers: {
    "RESULTS": function (val, topic) { 
      var self = this;
      return val.map(function (study) { 
        return study.split(".").map(function (one) { return self.lookupMap[one] || one; }).join("."); 
      });
    },
    "REFOWNERS": function (val, topic) {
      return { 'topic': "Study Providers", 'content': val.map(function (ref) { return jT.ui.formatString(htmlLink, { 
        href: "#", 
        hint: "Freetext search", 
        target: "_self", 
        value: ref, 
        css: "freetext_selector" 
      }); }) };
    },
    "REFS": function (val, topic) { 
      return { 
        'topic': "References",
        'content': val.map(function (ref) { 
          return jT.ui.formatString(htmlLink, { href: ref, hint: "External reference", target: "ref", value: ref, css: "freetext_selector" }); 
        })
      }
    }
  },
	
  renderItem: function (doc) {
		var self = this,
				el = $(this.renderSubstance(doc));
				
		if (!el.length) 
		  return null;

		$(this.target).append(el);
		
		if (typeof this.onClick === "function")
			$("a.command", el[0]).on("click", function (e) { self.onClick.call(el[0], e, doc, self); });
			
		if (typeof this.onCreated === 'function')
			this.onCreated.call(el, doc, this);
				
		$("a.more", el[0]).on("click", function(e) {
			e.preventDefault();
			e.stopPropagation();
			var $this = $(this), 
					$div = $(".more-less", $this.parent()[0]);

			if ($div.is(':visible')) {
				$div.hide();
				$this.text('more');
			} else {
				$div.show();
				$this.text('less');
			}

			return false;
		});
		
		return null;
	},
	
	/**
	 * substance
	 */
  renderSubstance: function(doc) {
		var summaryhtml = $("#summary-item").html(),
		    summarylist = this.buildSummary(doc),
		    summaryRender = function (summarylist) { 
  		    return summarylist.map(function (s) { return jT.ui.formatString(summaryhtml, s)}).join("");
  		  },
		    item = { 
  				logo: "images/logo.png",
  				link: "#",
  				href: "#",
  				title: (doc.publicname || doc.name) + (doc.pubname === doc.name ? "" : "  (" + doc.name + ")") 
  				      + (doc.substanceType == null ? "" : (" " 
  				        + (this.lookupMap[doc.substanceType] || doc.substanceType)
  				      )),
  				composition: this.renderComposition(doc, 
    				  '<a href="' + this.baseUrl + doc.s_uuid + '/structure" title="Composition" target="' + doc.s_uuid + '">&hellip;</a>'
    				).join("<br/>"),
    		  summary: summarylist.length > 0 ? summaryRender(summarylist.splice(0, this.summaryPrimes.length)) : "",
  				item_id: (this.prefix || this.id || "item") + "_" + doc.s_uuid,
  				footer: 
  					'<a href="' + this.baseUrl + doc.s_uuid + '" title="Substance" target="' + doc.s_uuid + '">Material</a>' +
  					'<a href="' + this.baseUrl + doc.s_uuid + '/structure" title="Composition" target="' + doc.s_uuid + '">Composition</a>' +
  					'<a href="' + this.baseUrl + doc.s_uuid + '/study" title="Study" target="' + doc.s_uuid + '">Studies</a>'
  			};

    // Build the outlook of the summary item
    if (summarylist.length > 0)
			item.summary += 
				'<a href="#" class="more">more</a>' +
				'<div class="more-less" style="display:none;">' + summaryRender(summarylist) + '</div>';
    
    // Check if external references are provided and prepare and show them.
		if (doc.content == null) {
			item.link = this.baseUrl + doc.s_uuid;
			item.href = item.link	+ "/study";
			item.href_title = "Study";
			item.href_target = doc.s_uuid;
		} 
		else {
  		var external = "External database";
  		
			if (doc.owner_name && doc.owner_name.lastIndexOf("caNano", 0) === 0) {
				item.logo = "images/canano.jpg";
				item.href_title = "caNanoLab: " + item.link;
				item.href_target = external = "caNanoLab";
				item.footer = '';
			}
			else {
				item.logo = "images/external.png";
				item.href_title = "External: " + item.link;
				item.href_target = "external";
			}
			
			if (doc.content.length > 0) {
				item.link = doc.content[0];	

				for (var i = 0, l = doc.content.length; i < l; i++)
					item.footer += '<a href="' + doc.content[i] + '" target="external">' + external + '</a>';
			}
		}	
		
		return jT.ui.fillTemplate("#result-item", item);
	},
	
  renderComposition: function (doc, defValue) {
  	var summary = [],
  	    composition = doc._extended_ && doc._extended_.composition;
  	    
    if (!!composition) {
      var cmap = {};
      a$.each(composition, function(c) {
        var ce = cmap[c.component_s],
            se = [];
        if (ce === undefined)
          cmap[c.component_s] = ce = [];
        
        a$.each(c, function (v, k) {
          k = k.match(/([^_]+)_?\a?/)[1];
          if (k != "type" && k != "id" && k != "component_s")
            se.push(k + ":" + jT.ui.formatString(htmlLink, { href: "#", hint: "Freetext search", target: "_self", value: v, css:"freetext_selector" }));
        });
        
        ce.push(se.join(", "));
    	});
    	
    	a$.each(cmap, function (map, type) {
        var entry = "";
        for (var i = 0;i < map.length; ++i) {
          if (map[i] == "")
            continue;
            
        	entry += (i == 0) ? ": " : "; ";
        	if (map.length > 1)
        	  entry += "<strong>[" + (i + 1) + "]</strong>&nbsp;";
          entry += map[i];
      	}
      	
      	if (entry === "")
      	  entry = ":&nbsp;" + defValue;
      	  
        entry = type + " (" + map.length + ")" + entry;
      	  
      	summary.push(entry);
    	});
    }
  	
  	return summary;
	},
	
  buildSummary: function(doc) {
  	var self = this,
  	    items = [];
  	
  	a$.each(doc, function (val, key) {
    	var name = key.match(/^SUMMARY\.([^_]+)_?[hsd]*$/);
    	if (!name)
    	  return;
    	  
      name = name[1];
      var render = (self.summaryRenderers[name] || self.summaryRenderers._),
          item = typeof render === "function" ? render.call(self, val, name) : val;

      if (!item)
        return;
      
      if (typeof item !== "object" || Array.isArray(item))
        item = { 'topic': name.toLowerCase(), 'values' : item };
      else if (item.topic == null)
        item.topic = name.toLowerCase();
      
      if (!item.content)
        item.content = Array.isArray(item.values) ? item.values.join(", ") : item.values.toString();
        
      var primeIdx = self.summaryPrimes.indexOf(name);
      if (primeIdx > -1 && primeIdx < items.length)
        items.splice(primeIdx, 0, item);
      else
        items.push(item);
  	});
  	
  	return items;
	}
}; // prototype


// Keep in mind that the field should be the same in all entries.
jT.ResultWidgeting = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
};

jT.ResultWidgeting.prototype = {
  __expects: [ "populate" ],

  init: function (manager) {
    a$.pass(this, jT.ResultWidgeting, 'init', manager);
    this.manager = manager;
  },
  
	beforeRequest : function() {
		$(this.target).html(
				$('<img>').attr('src', 'images/ajax-loader.gif'));
	},

	afterTranslation : function(data) {
		$(this.target).empty();
		this.populate(data.entries);
	}
};

jT.ResultWidget = a$(Solr.Listing, jT.ListWidget, jT.ItemListWidget, jT.ResultWidgeting);

})(Solr, asSys, jQuery, jToxKit);
