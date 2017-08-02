(function (Solr, a$, $, jT) {

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
	        vals = null;
	    
      for (var wid in self.facetWidgets) {
  	    var w = self.manager.getListener(wid),
  	        vals = w.fqParse(f);
  	        if (!!vals)
  	          break;
  	  }
  	  
  	  if (vals == null)
  	    continue;
  	    
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

})(Solr, asSys, jQuery, jToxKit);
(function(Solr, a$, $, jT) {

var mainLookupMap = {},
	defaultSettings = {
		servlet: "autophrase",
		multipleSelection: true,
		keepAllFacets: true,
		connector: $,
		onPrepare: function (settings) {
			var qidx = settings.url.indexOf("?");
  
			if (this.proxyUrl) {
				settings.data = { query: settings.url.substr(qidx + 1) };
				settings.url = this.proxyUrl;
				settings.type = settings.method = 'POST';
			}
			else {
				settings.url += (qidx < 0 ? "?" : "&" ) + "wt=json"; 
			}
		},
		topSpacing: 10,
		nestingField: "type_s",
		nestingRules: { 
  		"composition": { parent: "substance", limit: 100 },
  		"study": { parent: "substance", limit: 10000 },
  		"params": { parent: "study", limit: 10000 },
  		"conditions": { parent: "study", limit: 10000 }
    },
		exportMaxRows: 999999, //2147483647
		exportTypes: [],
		exportLevels: {},
	  exportSolrDefaults: [
  	  "facet=false",
			"echoParams=none"
	  ],
		listingFields: [],
		facets: [],
		summaryRenderers: {}
	},
	
	tagRender = function (tag) {
	  var view, title = view = tag.title.replace(/^\"(.+)\"$/, "$1");
		  
	  title = view.replace(/^caNanoLab\./, "").replace(/^http\:\/\/dx\.doi\.org/, "");
	  title = (mainLookupMap[title] || title).replace("NPO_", "").replace(" nanoparticle", "");
		  
	  var aux$ = $('<span/>').html(tag.count || 0);
	  if (typeof tag.onAux === 'function')
		aux$.click(tag.onAux);
		
	  var el$ = $('<li/>')
		.append($('<a href="#" class="tag" title="' + view + " " + (tag.hint || "") + ((title != view) ? ' [' + view + ']' : '') + '">' + title + '</a>')
		  .append(aux$)
		);

	  if (typeof tag.onMain === 'function')
		el$.click(tag.onMain);
	  if (tag.color)
		el$.addClass(tag.color);
		
	  return el$;
	},
	
	tagInit = function (manager) {
			jT.TagWidget.prototype.init.call(this, manager);
	  manager.getListener("current").registerWidget(this);
		},
		tagsUpdated = function (total) {
			var hdr = this.getHeaderText();
	  hdr.textContent = jT.ui.updateCounter(hdr.textContent, total);
	  a$.act(this, this.header.data("refreshPanel"));
		};
	

jT.FacetedSearch = function (settings) {
  this.id = null;
  a$.extend(true, this, defaultSettings, settings);
  
  if (typeof this.lookupMap === "string")
	this.lookupMap = window[this.lookupMap];
  
  if (this.lookupMap == null)
	this.lookupMap = {};
  mainLookupMap = this.lookupMap;
	
  $(settings.target).html(jT.ui.templates['faceted-search-kit']);
  delete this.target;
  
  this.initDom();
  this.initComm();
  this.initExport();
};  

jT.FacetedSearch.prototype = {
  initDom: function () {
  	// Now instantiate and things around it.
  	this.accordion = $("#accordion");
  	this.accordion.accordion({
  		heightStyle: "content",
  		collapsible: true,
  		animate: 200,
  		active: false,
  		activate: function( event, ui ) {
  			if (!!ui.newPanel && !!ui.newPanel[0]) {
  				var header = ui.newHeader[0],
  						panel = ui.newPanel[0],
  						filter = $("input.widget-filter", panel),
  						widgetFilterScroll = filter.outerHeight(true),
  						refreshPanel;
  				
  				if (!$("span.ui-icon-search", header).length) {
  					refreshPanel = function () {
  					if (panel.scrollHeight > panel.clientHeight || filter.val() != "" || $(header).hasClass("nested-tab") ) {
  							$(panel).scrollTop(widgetFilterScroll);
  							filter.show()
  							$("span.ui-icon-search", header).removeClass("unused");
  						}
  						else {
  							filter.hide();
  							$("span.ui-icon-search", header).addClass("unused");
  						}
  					};
    
  					ui.newPanel.data("refreshPanel", refreshPanel);
  					ui.newHeader.data("refreshPanel", refreshPanel);
  					ui.newHeader.append($('<span class="ui-icon ui-icon-search"></span>').on("click", function (e) {
  						ui.newPanel.animate({ scrollTop: ui.newPanel.scrollTop() > 0 ? 0 : widgetFilterScroll }, 300, function () {
  							if (ui.newPanel.scrollTop() > 0)
  								$("input.widget-filter", panel).blur();
  							else
  								$("input.widget-filter", panel).focus();
  						});
  							
  						e.stopPropagation();
  						e.preventDefault();
  					}));
  				}
  				else
  					refreshPanel = ui.newPanel.data("refreshPanel");
  				
  				filter.val("");
  				refreshPanel();
  		  }
  		}
  	});
  	
  	$(document).on("click", "ul.tag-group", function (e) { 
  		$(this).toggleClass("folded");
  		$(this).parents(".widget-root").data("refreshPanel").call();
  	});
  	
  	// ... and prepare the actual filtering funtion.
  	$(document).on('keyup', "#accordion input.widget-filter", function (e) {
  		var needle = $(this).val().toLowerCase(),
  				div = $(this).parent('div.widget-root'),
  				cnt;
    
  		if ((e.keyCode || e.which) == 27)
  			$(this).val(needle = "");
  		
  		if (needle == "")
  			$('li,ul', div[0]).show();
  		else {
  			$('li>a', div[0]).each( function () {
  				var fold = $(this).closest("ul.tag-group"),
  					tag = $(this).parent();
  				cnt = fold.data("hidden") || 0;
  				if (tag.hasClass("category"))
  				  ;
  				else if (this.title.toLowerCase().indexOf(needle) >= 0 || this.innerText.toLowerCase().indexOf(needle) >= 0)
  					tag.show();
  				else {
  					tag.hide();
  					++cnt;
  				}
  				
  				if (!!fold.length && !!cnt)
  					fold.data("hidden", cnt);
  			});
  		}
  		
  		// now check if some of the boxes need to be hidden.
  		$("ul.tag-group", div[0]).each(function () {
  			var me = $(this);
  
  			cnt = parseInt(me.data("hidden")) || 0;
  			if (me.children().length > cnt + 1)
  				me.show().removeClass("folded");
  			else
  				me.hide().addClass("folded");
    
  			me.data("hidden", null);
  		});
  	});
  			
  	var resDiv = $("#result-tabs"),
  		  resSize,
        self = this;
  	
  	resDiv.tabs( { } );
  		
  	$("#accordion-resizer").resizable({
  	  minWidth: 150,
  	  maxWidth: 450,
  	  grid: [10, 10],
  	  handles: "e",
  	  start: function(e, ui) {
  		resSize = { width: resDiv.width(), height: resDiv.height() };
  	  },
  	  resize: function(e, ui) {
  		self.accordion.accordion( "refresh" );
  		$('#query-sticky-wrapper').width( self.accordion.width());
  		$(this).width(function(i, w) { return w - 7; }); // minus the total padding of parent elements
  		resDiv.width(resSize.width + ui.originalSize.width - ui.size.width);
  	  }
  	});
  	
  	$(".query-left#query").sticky({topSpacing: this.topSpacing, widthFromWrapper:false });
  },
  
  /** The actual widget and communication initialization routine!
	*/
  initComm: function () {
  	var Manager, Basket,
  		  PivotWidget = a$(Solr.Requesting, Solr.Spying, Solr.Pivoting, jT.PivotWidgeting, jT.RangeWidgeting),
        TagWidget = a$(Solr.Requesting, Solr.Faceting, jT.AccordionExpansion, jT.TagWidget);
  
  	this.manager = Manager = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingJson, jT.Translation, jT.NestedSolrTranslation))(this);
  
  	Manager.addListeners(new jT.ResultWidget($.extend(true, {
			id : 'result',
			target : $('#docs'),
      itemId: "s_uuid",
      nestLevel: "composition",
			onClick : function (e, doc, exp, widget) { 
				if (Basket.findItem(doc.s_uuid) < 0) {
					Basket.addItem(doc);
					var s = "", jel = $('a[href="#basket_tab"]');
					
					jel.html(jT.ui.updateCounter(jel.html(), Basket.length));
					
					Basket.enumerateItems(function (d) { s += d.s_uuid + ";";});
					if (!!(s = jT.ui.modifyURL(window.location.href, "basket", s)))
						window.history.pushState({ query : window.location.search }, document.title, s);					

					$("footer", this).toggleClass("add none");					
				}
			},
			onCreated : function (doc) {
				$("footer", this).addClass("add");
			}
		}, this)));
  
  	Manager.addListeners(new (a$(Solr.Widgets.Pager))({
			id : 'pager',
			target : $('#pager'),
			prevLabel : '&lt;',
			nextLabel : '&gt;',
			innerWindow : 1,
			renderHeader : function(perPage, offset, total) {
				$('#pager-header').html('<span>' +
								'displaying ' + Math.min(total, offset + 1)
										+ ' to '
										+ Math.min(total, offset + perPage)
										+ ' of ' + total
								+ '</span>');
			}
		}));

		// Now the actual initialization of facet widgets
		for (var i = 0, fl = this.facets.length; i < fl; ++i) {
			var f = this.facets[i],
				w = new TagWidget($.extend({
					target : this.accordion,
					expansionTemplate: "#tab-topcategory",
					subtarget: "ul",
					multivalue: this.multipleSelection,
					aggregate: this.aggregateFacets,
					exclusion: this.multipleSelection || this.keepAllFacets,
					useJson: true,
					renderItem: tagRender,
					init: tagInit,
					onUpdated: tagsUpdated,
					nesting: "type_s:substance",
					domain: { type: "parent", "which": "type_s:substance" },
					classes: f.color
				}, f))
	  
  	  w.afterTranslation = function (data) { 
  		  this.populate(this.getFacetCounts(data.facets)); 
  	  };
				
			Manager.addListeners(w);
		};
		
		// ... add the mighty pivot widget.
		Manager.addListeners(new PivotWidget({
			id : "studies",
			target : this.accordion,
      subtarget: "ul",
			expansionTemplate: "#tab-topcategory",
			before: "#cell_header",
			field: "loValue_d",
			lookupMap: this.lookupMap,
			pivot: this.pivot,
  	  statistics: { 'min': "min(loValue_d)", 'max': "max(loValue_d)", 'avg': "avg(loValue_d)" },
  	  slidersTarget: $("#sliders"),
			multivalue: this.multipleSelection,
			aggregate: this.aggregateFacets,
			exclusion: this.multipleSelection || this.keepAllFacets,
			useJson: true,
			renderTag: tagRender,
			classes: "dynamic-tab",
			nesting: "type_s:substance",
      domain: { type: "parent", "which": "type_s:substance" }
		}));
		
    // ... And finally the current-selection one, and ...
    Manager.addListeners(new jT.CurrentSearchWidget({
			id : 'current',
			target : $('#selection'),
			renderItem : tagRender,
			useJson: true
		}));
				
		// Now add the basket.
		this.basket = Basket = new (a$(jT.ListWidget, jT.ItemListWidget))($.extend(true, {
			id : 'basket',
			target : $('#basket-docs'),
      summaryRenderers: this.summaryRenderers,
      itemId: "s_uuid",
			onClick : function (e, doc) {
				if (Basket.eraseItem(doc.s_uuid) === false) {
					console.log("Trying to remove from basket an inexistent entry: " + JSON.stringify(doc));
					return;
				}
				
				$(this).remove();
				var s = "", 
					jel = $('a[href="#basket_tab"]'),
					resItem = $("#result_" + doc.s_uuid);
					
				jel.html(jT.ui.updateCounter(jel.html(), Basket.length));
				Basket.enumerateItems(function (d) { s += d.s_uuid + ";";});
				if (!!(s = jT.ui.modifyURL(window.location.href, "basket", s)))
					window.history.pushState({ query : window.location.search }, document.title, s);
							
			if (resItem.length > 0)
				  $("footer", resItem[0]).toggleClass("add none");
			},
			onCreated: function (doc) {
				$("footer", this).addClass("remove");
			}			
		}, this));

    a$.act(this, this.onPreInit, Manager);
		Manager.init();
		
		// now get the search parameters passed via URL
		Manager.doRequest();
  },
  
  updateButton: function (form) {
		b = $("button", form);
		
		if (!$(form).find('input[name=export_dataset]').val()){
			b.button("option", "label", "No target dataset selected...");
		}else if( !this.manager.getParameter("json.filter").length && form.export_dataset.value == "filtered" ){
			b.button("disable").button("option", "label", "No filters selected...");
		}else if ( $(form).find('input[name=export_dataset]').val()  ){
			b.button("enable").button("option", "label", "Download " + $("#export_dataset :radio:checked + label").text().toLowerCase() + " as " + $(form.export_format).data('name').toUpperCase());
		} 

		return b;
	},
  
	initExport: function () {
		// Prepare the export tab
		var self = this;
		
		this.prepareFormats();
		this.prepareTypes();
  
		$("#export_dataset").buttonset();
		$("#export_type").buttonset();
		$("#export_dataset input").on("change", function(e) { self.updateButton(this.form); });
		$("#export_tab button").button({ disabled: true });
  
		$("#export_tab form").on("submit", function (e) {
			var form = this,
			    mime = form.export_format.value,
    			mime = mime.substr(mime.indexOf("/") + 1),
    			exFormat = self.exportFormats[$('.data_formats .selected').data('index')],
    			exType = self.exportTypes[$(form).find('input[name=export_type]:checked').data('index')],
    			server = exType.server || exFormat.server,
    			fq = self.manager.getParameter("json.filter"),
    			params = [],
    			inners = [],
    			selectedIds = null,
    			makeParameter = function (par, name) {
    				var np = { value: par.value, name: name || par.name };
            
            // Check if we have a different level and the field in the filter is subject to parenting.
            if (par.domain && par.domain.type == 'parent') {
              if (!exType.exportLevel) 
                np.domain = par.domain;
              else {
                var level = self.exportLevels[exType.exportLevel];
                if (!par.value || !!par.value.match(level.fieldsRegExp))
                  np.domain = level.domain;
              }
            }
            
            return np;
    			},
    			prepareFilters = function () {
      			for (var i = 0, vl = fq.length; i < vl; i++) {
      				var par = fq[i];
      				    
              params.push(Solr.stringifyParameter(makeParameter(par, 'fq')));
              inners.push(Solr.stringifyValue(par).replace("\\", "\\\\"));
            }
      
        		params.push(Solr.stringifyParameter(makeParameter(self.manager.getParameter('q'))) || '*:*');
    			};

			if (form.export_dataset.value != "filtered") {
				selectedIds = [];

				self.basket.enumerateItems(function (d) { selectedIds.push(d.s_uuid); });
			}
			
			// Now we have all the filtering parameters in the `params`.
			if( server == 'ambitUrl' ) {
  			// If we already have the selected Ids - we don't even need to bother calling Solr.
  			if (!!selectedIds) {
    			form.search.value = selectedIds.join(" ");
    			form.action = self['ambitUrl'] + 'query/substance/study/uuid?media=' + encodeURIComponent(form.export_format.value);
    		} else {
      		prepareFilters();
    			params.push('wt=json', 'fl=s_uuid_hs');
      		$.ajax({
        		url: self.solrUrl + 'select?' + params.join('&'), 
        		async: false,
        		dataType: "json",
        		success: function( data ) {
              var ids = [];
        			$.each(data.response.docs, function(index,value) {
        				ids.push(value.s_uuid_hs);
        			});
        			
        			form.search.value = ids.join(" ");
        			form.action = self['ambitUrl'] + 'query/substance/study/uuid?media=' + encodeURIComponent(form.export_format.value);
        		}
          });
  			}
			} else {
  			// We're strictly in Solr mode - prepare the filters and add the selecteds (if they exists)
  			prepareFilters();
  			if (!!selectedIds)
  			  params.push('fq=' + encodeURIComponent((exType.exportLevel == "study" ? 's_uuid_s' : 's_uuid_hs') + ":(" + selectedIds.join(" ") + ")"));
  			
  			// Fill the rest of the Solr parameters for the real Solr call.
        Array.prototype.push.apply(params, self.exportSolrDefaults);
        if (!!exType.extraParams)
          Array.prototype.push.apply(params, exType.extraParams);

        params.push('fl=' + encodeURIComponent(exType.fields.replace(
          "{{filter}}", 
          inners.length > 1 ? '(' + inners.join(' AND ') + ')' : inners.length > 0 ? inners[0] : exType.defaultFilter
        )));
        params.push('rows=' + self.exportMaxRows);
  			
  			if (mime == "tsv")
  				params.push("wt=csv", "csv.separator=%09");
  			else
  				params.push('wt=' + mime);

				form.action = self[server] + "select?" + params.join('&');
			}
				
      return true;
		});

		$("#result-tabs").tabs( { 
			activate: function (e, ui) {
				if (ui.newPanel[0].id == 'export_tab') {
					if( self.basket.length ){
						$('input#selected_data').prop("checked", true);
					}

					$("button", ui.newPanel[0]).button("disable").button("option", "label", "No output format selected...");

					var hasFilter = self.manager.getParameter("json.filter").length > 0;

					$("#selected_data")[0].disabled = self.basket.length < 1;
					$("#filtered_data")[0].disabled = !hasFilter;
					if( self.basket.length ){
						$('.data_formats').removeClass('disabled')
						$( "#export_type" ).buttonset( "enable" );
						$('.warning-message').hide();
						$("#selected_data")[0].checked = true;
					}else{
						
						$("#filtered_data")[0].checked = hasFilter;
						if( hasFilter || self.manager.getParameter("q").value.length > 0 ){
							$('.data_formats').removeClass('disabled')
							$( "#export_type" ).buttonset( "enable" );
							$('.warning-message').hide();
						}else{
							$('.data_formats').addClass('disabled')
							$( "#export_type" ).buttonset( "disable" );
							$('.warning-message').show();
						}
					}

					$('.data_formats .jtox-ds-download a').first().trigger("click");

					$("#export_dataset").buttonset("refresh");
				}
			}
		});
  },
  
	prepareFormats: function(){
		var exportEl = $("#export_tab div.data_formats");
		    self = this;
		    
		for (var i = 0, elen = this.exportFormats.length; i < elen; ++i) {
			var el = jT.ui.fillTemplate("#export-format", this.exportFormats[i]);
			el.data("index", i);
			exportEl.append(el);
			
			$("a", exportEl[0]).on("click", function (e) {
				var me = $(this),
				    form = me.closest("form")[0];
				    
				if (!me.hasClass('disabled') && !me.hasClass("selected")) {
  				var cont = me.closest("div.data_formats");
  
  				form.export_format.value = me.data("mime") ;
  
  				//save readable format name
  				$(form.export_format).data('name', me.data("name"));
  
  				self.updateButton(form);
  
  				$("div", cont[0]).removeClass("selected");
  				cont.addClass("selected");
  				me.closest(".jtox-fadable").addClass("selected");
				}
				return false;
			});
		}
	},

	prepareTypes: function(){
		var exportEl = $("#export_tab div#export_type"),
			  self = this;
			  
		for (var i = 0, elen = this.exportTypes.length; i < elen; ++i) {
			this.exportTypes[i].selected = ( i == 0 ) ? 'checked="checked"' : '';
			var el = jT.ui.fillTemplate("#export-type", this.exportTypes[i]);
			el.data("index", i);
			exportEl.append(el);
			
			$("input[name=export_type]").on("change", function (e) {
				var me = $(this);
				$('.data_formats a').addClass('disabled');

				self.exportTypes[me.data("index")].formats.split(",").forEach(function (item) {
					$('.data_formats a[data-name=' + item + ']').removeClass('disabled')
				});
				
	    	$('.data_formats a:visible').not('.disabled').first().trigger('click');
				return false;
			});
		}
	}
	
};
	
})(Solr, asSys, jQuery, jToxKit);
(function (Solr, a$, $, jT) {
  
  function buildValueRange(stats, isUnits) {
    var vals = " = ";

    // min ... average? ... max
    vals += (stats.min == null ? "-&#x221E;" :  stats.min);
    if (!!stats.avg) vals += "&#x2026;" + stats.avg;
    vals += "&#x2026;" + (stats.max == null ? "&#x221E;" : stats.max);
  						
    if (isUnits)
      vals += " " + jT.ui.formatUnits(stats.val)
        .replace(/<sup>(2|3)<\/sup>/g, "&#x00B$1;")
        .replace(/<sup>(\d)<\/sup>/g, "^$1");
        
    return vals;
	};

  function InnerTagWidgeting (settings) {
    this.id = settings.id;
    this.pivotWidget = settings.pivotWidget;
  };
  
  var iDificationRegExp = /\W/g;
  
  InnerTagWidgeting.prototype = {
    pivotWidget: null,
    
    hasValue: function (value) {
      return this.pivotWidget.hasValue(this.id + ":" + value);
    },
    
    clickHandler: function (value) {
      return this.pivotWidget.clickHandler(this.id + ":" + value);
    },
    
    modifyTag: function (info) {
      info.hint = !info.unit ? 
        info.buildValueRange(info) :
        "\n" + info.unit.buckets.map(function (u) { return buildValueRange(u, true); }).join("\n");
        
      info.color = this.color;
  		return info;
    }
  };
  
  var InnerTagWidget = a$(jT.TagWidget, InnerTagWidgeting);
  
	/** The general wrapper of all parts
  	*/
  jT.PivotWidgeting = function (settings) {
    a$.extend(true, this, a$.common(settings, this));

    this.target = settings.target;
    this.targets = {};
    this.lastEnabled = 0;
    this.initialPivotCounts = null;
  };
  
  jT.PivotWidgeting.prototype = {
    __expects: [ "getFaceterEntry", "getPivotEntry", "getPivotCounts", "auxHandler" ],
    automatic: false,   // Whether to build the list dynamically.
    renderTag: null,    // A function for rendering the tags.
    multivalue: false,      // If this filter allows multiple values. Values can be arrays.
    aggregate: false,       // If additional values are aggregated in one filter.
    exclusion: false,       // Whether to exclude THIS field from filtering from itself.
    
    init: function (manager) {
      a$.pass(this, jT.PivotWidgeting, "init", manager);
      this.manager = manager;
      
      this.manager.getListener("current").registerWidget(this, true);
    },
    
    addFaceter: function (info, idx) {
      var f = a$.pass(this, jT.PivotWidgeting, "addFaceter", info, idx);
      if (typeof info === "object")
        f.color = info.color;
      if (idx > this.lastEnabled && !info.disabled)
        this.lastEnabled = idx;

      return f;
    },
    
    afterTranslation: function (data) {
      var pivot = this.getPivotCounts(data.facets);

      a$.pass(this, jT.PivotWidgeting, "afterTranslation", data);
        
      // Iterate on the main entries
      for (i = 0;i < pivot.length; ++i) {
        var p = pivot[i],
            pid = p.val.replace(iDificationRegExp, "_"),
            target = this.targets[pid];
        
        if (!target) {
          this.targets[pid] = target = new jT.AccordionExpansion($.extend(true, {}, this.settings, this.getFaceterEntry(0), { id: pid, title: p.val }));
          target.updateHandler = this.updateHandler(target);
          target.target.children().last().remove();
        }
        else
          target.target.children('ul').hide();
          
        this.traversePivot(target.target, p, 1);
        target.updateHandler(p.count);
      }
      
      // Finally make this update call.
      this.target.accordion("refresh");
    },
    
    updateHandler: function (target) {
			var hdr = target.getHeaderText();
			return function (count) { hdr.textContent = jT.ui.updateCounter(hdr.textContent, count); };
    },
    
    prepareTag: function (value) {
      var p = this.parseValue(value);

      return {
        title: p.value,
        color: this.faceters[p.id].color,
        count: "i",
        onMain: this.unclickHandler(value),
        onAux: this.auxHandler(value)
      };
    },
    
    traversePivot: function (target, root, idx) {
      var elements = [],
          faceter = this.getPivotEntry(idx),
          bucket = root[faceter.id].buckets;
			
      if (idx === this.lastEnabled) {
        var w = target.data("widget");
        if (!w) {
          w = new InnerTagWidget({
            id: faceter.id,
            color: faceter.color,
            renderItem: this.renderTag,
            pivotWidget: this,
            target: target,
            multivalue: this.multivalue,
            aggregate: this.aggregate,
            exclusion: this.exclusion
          });

          w.init(this.manager);
          target.data({ widget: w, id: faceter.id });
        }
        else
          target.children().slice(1).remove();

        w.populate(bucket, true);        
        elements = [ ];
      }
			else if (bucket != null) {
  			for (var i = 0, fl = bucket.length;i < fl; ++i) {
  				var f = bucket[i],
  				    fid = f.val.replace(iDificationRegExp, "_"),
  				    cont$;

          if (target.children().length > 1) // the input field.
            cont$ = $("#" + fid, target[0]).show();
          else {
				    cont$ = jT.ui.fillTemplate($("#tag-facet"), faceter).attr("id", fid);
            
    				f.title = f.val;
    				f.onMain = this.clickHandler(faceter.id + ":" + f.val);
    				f.hint = buildValueRange(f);
  					cont$.append(this.renderTag(f).addClass("category title").addClass(faceter.color));
            elements.push(cont$);
          }
  				    
					this.traversePivot(cont$, f, idx + 1);
        }
      }
      
      target.append(elements);
		}
		
	};
	
})(Solr, asSys, jQuery, jToxKit);
(function (Solr, a$, $, jT) {
  
  function SimpleRanger(settings) { 
    this.sliderRoot = settings.sliderRoot;
  }
  
  SimpleRanger.prototype.__expects = [ "addValue", "doRequest" ];
  SimpleRanger.prototype.targetValue = null;
  SimpleRanger.prototype.updateHandler = function () {
    var self = this;
    return function (values) {
      if (!!self.addValue(values)) {
        self.sliderRoot.updateRequest = true;
        self.doRequest();
      } 
    };
  }
  SimpleRanger.prototype.doRequest = function () {
    this.manager.doRequest();
  }
  
  SingleRangeWidget = a$(Solr.Ranging, Solr.Patterning, jT.SliderWidget, SimpleRanger, Solr.Delaying);
  
	/** The general wrapper of all parts
  	*/
  	
  var defaultParameters = {
    'facet': true,
    'rows': 0,
    'fl': "id",
    'facet.limit': -1,
    'facet.mincount': 1,
    'echoParams': "none"
  };
  	
  jT.RangeWidgeting = function (settings) {
    a$.extend(true, this, a$.common(settings, this));

    this.slidersTarget = $(settings.slidersTarget);
    this.lookupMap = settings.lookupMap || {};
    this.pivotMap = null;
    this.rangeWidgets = [];
    if (!Array.isArray(this.titleSkips))
      this.titleSkips = [ this.titleSkips ];
  };
  
  jT.RangeWidgeting.prototype = {
    __expects: [ "getPivotEntry", "getPivotCounts" ],
    field: null,
    titleSkips: null,
    
    init: function (manager) {
      a$.pass(this, jT.RangeWidgeting, "init", manager);
      this.manager = manager;
      
      var self = this;
      self.applyCommand = $("#sliders-controls a.command.apply").on("click", function (e) {
        self.skipClear = true;
        self.manager.doRequest();
        return false;
      });
      
      $("#sliders-controls a.command.close").on("click", function (e) {
        self.rangeRemove();
        return false;
      });
    },
    
    afterTranslation: function (data) {
      var pivot = this.getPivotCounts(data.facets);
            
      a$.pass(this, jT.RangeWidgeting, "afterTranslation", data);
            
      if (!this.pivotMap) {
        var qval = this.manager.getParameter('q').value || "";
        if ((!qval || qval == "*:*") && !this.manager.getParameter(this.useJson ? "json.filter" : "fq").value)
          this.pivotMap =  this.buildPivotMap(pivot);
      }
      else if (!this.updateRequest)
        this.rangeRemove();
      else if (this.rangeWidgets.length > 0) {
        var pivotMap = this.buildPivotMap(pivot), w, ref;
        
        for (var i = 0, wl = this.rangeWidgets.length;i < wl; ++i) {
          w = this.rangeWidgets[i];
          ref = pivotMap[w.targetValue];
          w.updateSlider([ ref[i].min, ref[i].max ]);
        }
      }
      
      this.updateRequest = false;
    },
    
    buildPivotMap: function (pivot) {
      var self = this,
          map = {};
          traverser = function (base, idx, pattern, valId) {
            var p = self.getPivotEntry(idx),
                pid = p.id,
                color = p.color,
                info;
            
            // Make the Id first
            if (p.ranging && !p.disabled)
              valId = pid + ":" + base.val;
              
            // Now deal with the pattern
            pattern += (!base.val ? ("-" + p.field + ":*") : (p.field + ":" + Solr.escapeValue(base.val))) + " ";
            info = base;
              
            p = self.getPivotEntry(idx + 1);
            if (p != null)
              base = base[p.id].buckets;

            // If we're at the bottom - add some entries...
            if (p == null || !base.length) {
              var arr = map[valId];
              if (arr === undefined)
                map[valId] = arr = [];
              
              arr.push({
                'id': pid,
                'pattern': pattern,
                'color': color,
                'min': info.min,
                'max': info.max,
                'avg': info.avg,
                'val': info.val,
                'count': info.count
              });
            }
            // ... or just traverse and go deeper.
            else {
              for (var i = 0, bl = base.length; i < bl; ++i)
                traverser(base[i], idx + 1, pattern, valId);
            }
          };
          
      for (var i = 0;i < pivot.length; ++i)
        traverser(pivot[i], 0, "");
        
      return map;
    },
    
    rangeRemove: function() {
      this.slidersTarget.empty().parent().removeClass("active");

      for (var i = 0, wl = this.rangeWidgets.length;i < wl; ++i)
        this.rangeWidgets[i].clearValues();

      this.rangeWidgets = [];
      this.lastPivotMap = this.lastPivotValue = null;
    },
    
    buildTitle: function (info, skip) {
      var pat = info.pattern.replace(/\\"/g, "%0022"),
          fields = pat.match(/\w+:([^\s:\/"]+|"[^"]+")/g),
          outs = [];
      
      // Stupid, but we need to have both regexps because of the
      // global flag needed on the first one and NOT needed later.
      for (var i = 0;i < fields.length; ++i) {
        var f = fields[i],
            m = f.match(/(\w+):([^\s:\/"]+|"[^"]+")/),
            v = m[2].replace(/^\s*\(\s*|\s*\)\s*$/g, "");
        
        if (!m[1].match(skip))
          outs.push(this.lookupMap[v] || v);
      }
      
      return outs.join("/") + " <i>(" + info.count + ")</i>";
    },
    
    ensurePivotMap: function (value) {
      if (this.pivotMap != null)
        return true;
        
      var fqName = this.useJson ? "json.filter" : "fq",
          self = this;
      
      // We still don't have it - make a separate request
      this.doSpying(
        function (man) {
          man.removeParameters(fqName);
          man.removeParameters('fl');
          man.getParameter('q').value = "";
          man.mergeParameters(defaultParameters);
        },
        function (data) {
          self.pivotMap = self.buildPivotMap(self.getPivotCounts(data.facets));
          self.openRangers(value);
        }
      );
      
      return false;
    },
    
    openRangers: function (value) {
      var entry = this.pivotMap[value],
          pivotMap = this.lastPivotMap = this.buildPivotMap(this.getPivotCounts()),
          current = pivotMap[value];
      
      this.lastPivotValue = value;
      this.slidersTarget.empty().parent().addClass("active");

      for (var i = 0, el = entry.length; i < el; ++i) {
        var all = entry[i],
            ref = current[i],
            setup = {}, w,
            el$ = jT.ui.fillTemplate("#slider-one");

        this.slidersTarget.append(el$);

        setup.id = all.id;
        setup.targetValue = value;          
        setup.color = all.color;
        setup.field = this.field;
        setup.limits = [ all.min, all.max ];
        setup.initial = [ ref.min, ref.max ];
        setup.target = el$;
        setup.isRange = true;
        setup.valuePattern = all.pattern + "{{v}}";
        setup.automatic = true;
        setup.width = parseInt(this.slidersTarget.width() - $("#sliders-controls").width() - 20) / (Math.min(el, 2) + 0.1);
        setup.title = this.buildTitle(ref, /^unit[_shd]*|^effectendpoint[_shd]*/);
        setup.units = ref.id == "unit" ? jT.ui.formatUnits(ref.val) : "";
        setup.useJson = this.useJson;
        setup.domain = this.domain;
        setup.sliderRoot = this;
          
        this.rangeWidgets.push(w = new SingleRangeWidget(setup));
        w.init(this.manager);
      }
    },
    
    auxHandler: function (value) {
      var self = this;
      
      return function (event) {
        event.stopPropagation();

        self.rangeRemove();

        // we've clicked out pivot button - clearing was enough.
        if (value != self.lastPivotValue && self.ensurePivotMap(value))
          self.openRangers(value);
        
        return false;
      };
    },
    
    clearValues: function () {
      this.rangeRemove();
      a$.pass(this, jT.RangeWidgeting, "clearValues");
    }
    
	};
	
})(Solr, asSys, jQuery, jToxKit);
(function (Solr, a$, $, jT) {

var htmlLink = '<a href="{{href}}" title="{{hint}}" target="{{target}}" class="{{css}}">{{value}}</a>',
    plainLink = '<span title="{{hint}}" class="{{css}}">{{value}}</span>';
  
jT.ItemListWidget = function (settings) {
	settings.baseUrl = jT.ui.fixBaseUrl(settings.baseUrl) + "/";
  a$.extend(true, this, a$.common(settings, this));

  this.lookupMap = settings.lookupMap || {};
	this.target = settings.target;
	this.id = settings.id;
};

jT.ItemListWidget.prototype = {
  baseUrl: "",
  summaryPrimes: [ "RESULTS" ],
  tagDbs: {},
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
          var link = ref.match(/^doi:(.+)$/);
          link = link != null ? "https://www.doi.org/" + link[1] : ref;
          return jT.ui.formatString(
            link.match(/^https?:\/\//) ? htmlLink : plainLink,
            { href: link, hint: "External reference", target: "ref", value: ref }
          );
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
        baseUrl = this.getBaseUrl(doc),
        logoURL = this.tagDbs[doc.dbtag_hss] && this.tagDbs[doc.dbtag_hss].icon || "images/logo.png";
        summaryRender = function (summarylist) { 
          return summarylist.map(function (s) { return jT.ui.formatString(summaryhtml, s)}).join("");
        }
       var item = { 
          logo: logoURL,
          link: "#",
          href: "#",
          title: (doc.publicname || doc.name) + (doc.pubname === doc.name ? "" : "  (" + doc.name + ")") 
                + (doc.substanceType == null ? "" : (" " 
                  + (this.lookupMap[doc.substanceType] || doc.substanceType)
                )),
          composition: this.renderComposition(doc, 
              '<a href="' + baseUrl + doc.s_uuid + '/structure" title="Composition" target="' + doc.s_uuid + '">&hellip;</a>'
            ).join("<br/>"),
          summary: summarylist.length > 0 ? summaryRender(summarylist.splice(0, this.summaryPrimes.length)) : "",
          item_id: (this.prefix || this.id || "item") + "_" + doc.s_uuid,
          footer: 
            '<a href="' + baseUrl + doc.s_uuid + '" title="Substance" target="' + doc.s_uuid + '">Material</a>' +
            '<a href="' + baseUrl + doc.s_uuid + '/structure" title="Composition" target="' + doc.s_uuid + '">Composition</a>' +
            '<a href="' + baseUrl + doc.s_uuid + '/study" title="Study" target="' + doc.s_uuid + '">Studies</a>'
        };

    // Build the outlook of the summary item
    if (summarylist.length > 0)
      item.summary += 
        '<a href="#" class="more">more</a>' +
        '<div class="more-less" style="display:none;">' + summaryRender(summarylist) + '</div>';
    
    // Check if external references are provided and prepare and show them.
    if (doc.content == null) {
      item.link = this.baseUrl + doc.s_uuid;
      item.href = item.link + "/study";
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
  getBaseUrl: function(doc){
    if(this.tagDbs[doc.dbtag_hss] !== undefined){
      var url = this.tagDbs[doc.dbtag_hss].server,
        lastChar = url.substr(-1);
    if (lastChar != '/') {         
        return url+"/substance/";
      }else{
        return url+"substance/";
      }
    }else{
      return this.baseUrl;
    }
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
          var m = k.match(/^(\w+)_[shd]+$/);
          k = m && m[1] || k;
          if (!k.match(/type|id|component/))
            se.push(jT.ui.formatString(htmlLink, { 
              href: "#", 
              hint: "Freetext search on '" + k + "'", 
              target: "_self", 
              value: v, 
              css:"freetext_selector" 
            }));
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
jToxKit.ui.templates['faceted-search-kit']  = 
"<div class=\"query-container\">" +
"<!-- left -->" +
"<div id=\"query\" class=\"query-left\">" +
"<div id=\"accordion-resizer\" class=\"ui-widget-content\">" +
"<div id=\"accordion\"></div>" +
"</div>" +
"</div>" +
"" +
"<!-- right -->" +
"<div id=\"result-tabs\" class=\"query-right\">" +
"<ul>" +
"<li><a href=\"#hits_tab\">Hits list</a></li>" +
"<li><a href=\"#basket_tab\">Selection</a></li>" +
"<li class=\"jtox-ds-export\"><a href=\"#export_tab\">Export</a></li>" +
"</ul>" +
"<div id=\"hits_tab\">" +
"<div class=\"row remove-bottom\">" +
"<ul class=\"tags remove-bottom\" id=\"selection\"></ul>" +
"<footer>" +
"<div id=\"sliders-controls\">" +
"<a href=\"#\" class=\"jtox-fadable command close\">Close</a>" +
"</div>" +
"<div id=\"sliders\"></div>" +
"</footer>" +
"</div>" +
"<div id=\"navigation\">" +
"<ul id=\"pager\"></ul>" +
"<div id=\"pager-header\"></div>" +
"</div>" +
"<div class=\"docs_wrapper\">" +
"<section id=\"docs\" class=\"item-list\"></section>" +
"</div>" +
"</div>" +
"<div id=\"basket_tab\">" +
"<section id=\"basket-docs\" class=\"item-list\"></section>" +
"<div style=\"padding-top: 70px;\"></div>" +
"</div>" +
"<div id=\"export_tab\">" +
"<form target=\"_blank\" method=\"post\">" +
"<input type=\"hidden\" name=\"search\"/>" +
"" +
"<h6>Select dataset to export</h6>" +
"<div id=\"export_dataset\">" +
"<input type=\"radio\" value=\"filtered\" name=\"export_dataset\" id=\"filtered_data\" checked=\"checked\"/>" +
"<label for=\"filtered_data\">Filtered entries</label>" +
"<input type=\"radio\" value=\"selected\" name=\"export_dataset\" id=\"selected_data\"/>" +
"<label for=\"selected_data\">Selected entries</label>" +
"</div>" +
"" +
"<h6>Select export type</h6>" +
"<div id=\"export_type\"></div>" +
"" +
"<h6>Select output format</h6>" +
"<input type=\"hidden\" name=\"export_format\" id=\"export_format\"/>" +
"<div class=\"data_formats\"></div>" +
"" +
"<br/>" +
"<button type=\"submit\" name=\"export_go\" data-prefix=\"Download\">?</button>" +
"<div class=\"ui-state-error ui-corner-all warning-message\" style=\"padding: 0 .7em;\"><p><span class=\"ui-icon ui-icon-alert\" style=\"float: left; margin-right: .3em;\"></span><strong>Warning:</strong>Please either add entries to the selection or specify a query</p></div>" +
"" +
"</form>" +
"</div>" +
"</div>" +
"" +
"<!-- query container -->" +
"</div>" +
""; // end of #faceted-search-kit 

jToxKit.ui.templates['faceted-search-templates']  = 
"" +
"<section id=\"result-item\">" +
"<article id=\"{{item_id}}\" class=\"item\">" +
"<header>{{title}}" +
"<a href=\"{{href}}\" title=\"{{href_title}}\" target=\"{{href_target}}\"><span class=\"ui-icon ui-icon-extlink\" style=\"float:right;margin:0;\"></span></a>" +
"</header>" +
"<a href=\"{{link}}\" title=\"{{link}}\" class=\"avatar\" target=\"_blank\"><img jt-src=\"{{logo}}\"/></a>" +
"<div class=\"composition\">{{composition}}</div>" +
"{{summary}}" +
"<footer class=\"links\">" +
"{{footer}}" +
"<a href=\"#\" class=\"add jtox-fadable command\">Add to Selection</a>" +
"<a href=\"#\" class=\"remove jtox-fadable command\">Remove from Selection</a>" +
"<a href=\"#\" class=\"none jtox-fadable command\">Already added</a>" +
"</footer>" +
"</article>" +
"</section>" +
"" +
"<div id=\"summary-item\">" +
"<div class=\"one-summary\">" +
"<span class=\"topic\">{{topic}}:</span>" +
"<span class=\"value\">{{content}}</span>" +
"</div>" +
"</div>" +
"" +
"<div id=\"tag-facet\">" +
"<ul class=\"tags tag-group folded\"></ul>" +
"</div>" +
"" +
"<div id=\"tab-topcategory\">" +
"<h3 id=\"{{id}}_header\" class=\"nested-tab\">{{title}}</h3>" +
"<div id=\"{{id}}\" class=\"widget-content widget-root\">" +
"<input type=\"text\" placeholder=\"Filter_\" class=\"widget-filter\"/>" +
"<ul class=\"widget-content tags remove-bottom\" data-color=\"{{color}}\"></ul>" +
"</div>" +
"</div>" +
"" +
"<div id=\"slider-one\">" +
"<input type=\"hidden\"/>" +
"</div>" +
"" +
"<div id=\"export-type\">" +
"<input type=\"radio\" value=\"{{fields}}\" {{selected}} name=\"export_type\" id=\"{{name}}\"/>" +
"<label for=\"{{name}}\">{{name}}</label>" +
"</div>" +
"" +
"<div id=\"export-format\">" +
"<div class=\"jtox-inline jtox-ds-download jtox-fadable\">" +
"<a target=\"_blank\" data-name=\"{{name}}\" data-mime=\"{{mime}}\" href=\"#\"><img class=\"borderless\" jt-src=\"{{icon}}\"/></a>" +
"</div>" +
"</div>" +
""; // end of #faceted-search-templates 

