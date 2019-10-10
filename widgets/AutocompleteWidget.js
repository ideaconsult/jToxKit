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
  'echoParams': "none"
};
  
jT.AutocompleteWidget = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.target = $(settings.target);
  this.id = settings.id;
  this.lookupMap = settings.lookupMap || {};
  
  this.parameters = a$.extend(true, { }, defaultParameters);
  this.facetPath = this.useJson ? "facets" : "facet_counts.facet_fields";
  if (!this.useJson)
    this.parameters['json.nl'] = "map";    
};

jT.AutocompleteWidget.prototype = {
  __expects: [ "addValue", "doSpying" ],

  servlet: "autophrase",      // what phrase to use on the internal queries
  urlFeed: null,              // which URL parameter to use for initial setup
  useJson: false,             // Whether to use JSON-style parameter setup
  maxResults: 30,             // maximum results in the Autocomplete box
  activeFacets: null,         // a map of active / inactive facets. Default is ON.
  
  init: function (manager) {
    a$.pass(this, jT.AutocompleteWidget, "init", manager);
    this.manager = manager;
    
    var self = this;
        
    // now configure the independent free text search.
    self.findBox = this.target.find('input').on("change", function (e) {
      var thi$ = $(this);
      if (!self.addValue(thi$.val()) || self.requestSent)
        return;
        
      thi$.blur().autocomplete("disable");
      manager.doRequest();
    });

    // make the initial values stuff
    if (self.urlFeed != null) {
      var needle = $.url().param(self.urlFeed);
      self.addValue(needle);
      self.findBox.val(needle);
    }
       
    // configure the auto-complete box. 
    self.findBox.autocomplete({
      'minLength': 0,
      'source': function (request, callback) {
        self.reportCallback = callback;
        self.makeRequest(request.term);
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
  
  makeRequest: function (term) {
    var self = this;
    
    this.doSpying(
      function (manager) {
        manager.removeParameters('fl');
        manager.mergeParameters(self.parameters);
  
        // manager and self.manager should be the same.
        self.addValue(term || "");
      },
      function (response) { 
        self.onResponse(response);
      });
  },
  
  onResponse: function (response) {
    var self = this,
        list = [];
        
    _.each(a$.path(response, this.facetPath), function (facet, fid) {
      if (list.length >= self.maxResults ||
          typeof facet !== "object" || 
          self.activeFacets && self.activeFacets[fid] === false)
        return;
        
      _.each(self.useJson ? facet.buckets : facet, function (entry, key) {
        if (list.length >= self.maxResults)
          return;
          
        if (!self.useJson)
          entry = { 'val': key, 'count': entry };

        list.push({
          id: fid,
          value: entry.val,
          label: (self.lookupMap[entry.val] || entry.val) + ' (' + entry.count + ') - ' + fid
        });
      });
    });
    
    if (typeof this.reportCallback === "function")
      self.reportCallback(list);
  },
    
  afterResponse: function (response) {
    var qval = this.manager.getParameter('q').value || "";
    this.findBox.val(qval != "*:*" && qval.length > 0 ? qval : "").autocomplete("enable");
    this.requestSent = false;
  }
};
