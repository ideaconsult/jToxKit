$(document).ready(function(){

	$("#smartmenu").smartmenus();
  $("#about-message").dialog({
    modal: true,
    buttons: {
      Ok: function() {
        $( this ).dialog( "close" );
      }
    }
  });
  $("#about-message").dialog("close");
  
  Settings.onPreInit = function (manager) {
  	// ... auto-completed text-search.
  	var textWidget = new (a$(Solr.Eventing, jT.Spying, Solr.Texting, jT.Autocompleter))({
  		id : 'text',
  		target : $('#freetext'),
  		domain: { type: "parent", which: "type_s:substance" },
  		useJson: true,
  		lookupMap: lookup,
  		urlFeed: "search",
		escapeNeedle: true,
		privateRequest: true
  	});
  	
  	manager.addListeners(textWidget);
    // manager.addListeners(jT.Logging.prototype.__kits[0]);

  	// Set some general search machanisms
  	$(document).on('click', "a.freetext_selector", function (e) {
  		if (textWidget.addValue(this.innerText))
  		  manager.doRequest();
  	});
		
		jT.attachKit(textWidget.target, textWidget);
	};
  
  jT.initialize();
});
