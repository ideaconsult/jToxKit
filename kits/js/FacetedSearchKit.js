(function(Solr, a$, $, jT) {

var mainLookupMap = {},
	defaultSettings = {
		nestingRules: { "composition": { field: "type_s", parent: "substance", limit: 100 } },
		servlet: "autophrase",
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
	  solrParameters: {
			'facet.limit' : -1,
			'facet.mincount' : 1,
			'echoParams': "none",
			'fl' : "id",
			'json.nl' : "map",
			'q.alt': "*:*",
		},
		topSpacing: 10,
		nestingRules: { "composition": { field: "type_s", parent: "substance", limit: 100 } },
		exportMaxRows: 999999, //2147483647
		exportTypes: [],
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
		PivotWidget = a$(Solr.Requesting, Solr.Pivoting, jT.PivotWidgeting, jT.RangeWidgeting),
		TagWidget = a$(Solr.Requesting, Solr.Faceting, jT.AccordionExpansion, jT.TagWidget);

	this.manager = Manager = new (a$(Solr.Management, Solr.Configuring, Solr.QueryingJson, jT.Translation, jT.NestedSolrTranslation))(this);

	Manager.addListeners(new jT.ResultWidget($.extend(true, {
			id : 'result',
			target : $('#docs'),
		itemId: "s_uuid",
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
					multivalue: true,
					aggregate: true,
					exclusion: true,
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
			
			pivot: [ 
			  { id: "topcategory", field: "topcategory_s", disabled: true },
			  { id: "endpointcategory", field: "endpointcategory_s", color: "blue" },
			  { id: "effectendpoint", field: "effectendpoint_s", color: "green", ranging: true }, 
			  { id: "unit", field: "unit_s", disabled: true, ranging: true }
	  ],
	  statistics: { 'min': "min(loValue_d)", 'max': "max(loValue_d)", 'avg': "avg(loValue_d)" },
	  slidersTarget: $("#sliders"),
			
			multivalue: true,
			aggregate: true,
			exclusion: true,
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
		this.basket = Basket = new (a$(jT.ListWidget, jT.ItemListWidget))({
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
		});

	a$.act(this, this.onPreInit, Manager);
		Manager.init();
		
		// now get the search parameters passed via URL
		Manager.doRequest();
  },
  
	initExport: function () {
  		// Prepare the export tab
  		var self = this;

		updateButton = function (e) {
			var form = this.form,
			b = $("button", this.form);
			
			if (!form.export_dataset.value){
				b.button("option", "label", "No target dataset selected...");
			}else if( !self.manager.getParameter("json.filter").length && form.export_dataset.value == "filtered" ){
				b.button("disable").button("option", "label", "No filters selected...");
			}else if (!!form.export_format.value  ){
				b.button("enable").button("option", "label", "Download " + $("#export_dataset :radio:checked + label").text().toLowerCase() + " as " + $(this.form.export_format).data('name').toUpperCase());
			} 

			return b;
		};
  
		this.getFormats();

		this.getTypes();
  
		$("#export_dataset").buttonset();
		$("#export_type").buttonset();
		$("#export_dataset input").on("change", updateButton);
		$("#export_tab button").button({ disabled: true });
  
		$("#export_tab form").on("submit", function (e) {
			var form = this,
			mime = form.export_format.value,
			server = $('.data_formats .selected a').attr('data-url'),
			fields = ( server == 'ambitURL' )? 's_uuid_hs' : form.export_type.value,
			params = ['rows=' + self.exportMaxRows, 'fl=' + encodeURIComponent(fields)];
			mime = mime.substr(mime.indexOf("/") + 1),
			serverURL = self[server],
			fq = [];

			if (mime == "tsv"){
				params.push("wt=csv", "csv.separator=%09");
			}else if( server == 'ambitURL' ){
				params.push('wt=json');
			}else{
				params.push('wt=' + mime);
			}

			form.q.value = "q={!parent which=type_s:substance}";  

			var values = self.manager.getParameter("json.filter");
			if (form.export_dataset.value == "filtered") {

				for (var i = 0, vl = values.length; i < vl; i++) {  
					var tag = (values[i].domain.hasOwnProperty('tag')) ? ' tag='+values[i].domain.tag : '';
					fq.push('fq={!parent which=type_s:substance'+tag+'}' + encodeURIComponent(values[i].value));
				}

			}else { // i.e. selected
				var fqset = [];

				self.basket.enumerateItems(function (d) { 
				fqset.push(d.s_uuid); });
				fq.push('fq=s_uuid_hs:(' + fqset.join(" ")+')');
			}

			params = params.concat(fq);
			if( server == 'ambitURL' ){
				if (form.export_dataset.value == "filtered") {
					//get uuids to the search field and change the form action
					self.sendAmbitRequest(form, fq);
				}else{
					mime = form.export_format.value;

					form.search.value = fqset.join(" ");
					form.action = serverURL+'query/substance/study/uuid?media='+encodeURIComponent(mime);
				}

				return true;
			}else{

				form.action = serverURL + "select?" + params.join('&');
	
				return true;
			}
		});

		$("#result-tabs").tabs( { 
			activate: function (e, ui) {
				if (ui.newPanel[0].id == 'export_tab') {
					$("div", ui.newPanel[0]).removeClass("selected");
					$("button", ui.newPanel[0]).button("disable").button("option", "label", "No output format selected...");

					var qval = self.manager.getParameter('q'),
					hasFilter = self.manager.getParameter('fq').length > 1 || (!!qval && qval != '*:*');

					$("#selected_data")[0].disabled = self.basket.length < 1;
					$("#selected_data")[0].checked = self.basket.length > 0 && !hasFilter;
					$("#filtered_data")[0].disabled = !hasFilter;
					$("#filtered_data")[0].checked = hasFilter;

					$("#export_dataset").buttonset("refresh");
				}
			}
		});
  	},
	sendAmbitRequest: function(form, fq){
		var self = this, 
		ids=[];
		$.ajaxSetup({async: false}); // we need a sync request

		fq.push('q={!parent which=type_s:substance}');

		$.getJSON( this.solrUrl + "select?fl=s_uuid_hs&wt=json&"+ fq.join('&'), function( data ) {
			$.each(data.response.docs, function(index,value) {
				ids.push(value.s_uuid_hs);
			});
			
			var serverURL = self[$('.data_formats .selected a').attr('data-url')],
			mime = form.export_format.value;

			form.search.value = ids.join(" ");
			form.action = serverURL+'query/substance/study/uuid?media='+encodeURIComponent(mime);
		});

		$.ajaxSetup({async: true}); // reset the request type
	},
	getFormats: function(){
		var exportEl = $("#export_tab div.data_formats");
		for (var i = 0, elen = this.exportFormats.length; i < elen; ++i) {
			var el = jT.ui.fillTemplate("#export-format", this.exportFormats[i]);
			exportEl.append(el);
			$("a", exportEl[0]).on("click", function (e) {
				var me = $(this);
				if (!me.hasClass("selected")) {
					var form = me.closest("form")[0],
					cont = me.closest("div.data_formats"),
					mime = me.data("mime");

					form.export_format.value = me.data("mime") ;

					//save readable format name
					$(form.export_format).data('name', me.data("name"));

					updateButton.call(form.export_format, e);

					$("div", cont[0]).removeClass("selected");
					cont.addClass("selected");
					me.closest(".jtox-fadable").addClass("selected");

					var exportTypeInput = $('#export_type input');
					if( me.data('url') == 'ambitURL' ){
						exportTypeInput.first().prop("checked", true)
						exportTypeInput.attr("disabled", "disabled");
					}else{
						exportTypeInput.removeAttr('disabled')
					}
					
					$("#export_type").buttonset("refresh");
				}
			return false;
			});
		}
	},

	getTypes: function(){
		var exportEl = $("#export_tab div#export_type");
		for (var i = 0, elen = this.exportType.length; i < elen; ++i) {
			this.exportType[i].selected = ( i == 0 )? 'checked="checked"' : '';
			var el = jT.ui.fillTemplate("#export-type", this.exportType[i]);
			exportEl.append(el);
			$("a", exportEl[0]).on("click", function (e) {
				var me = $(this);
				if (!me.hasClass("selected")) {
					var form = me.closest("form")[0],
					cont = me.closest("div.data_formats"),
					mime = me.data("mime");

					form.export_type.value = mime = mime.substr(mime.indexOf("/") + 1);
					updateButton.call(form.export_type, e);

					$("div", cont[0]).removeClass("selected");
					cont.addClass("selected");
					me.closest(".jtox-fadable").addClass("selected");
				}
				return false;
			});
		}
	}
};
	
})(Solr, asSys, jQuery, jToxKit);
