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
