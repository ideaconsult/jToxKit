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
  __expects: [ "addValue" ],

  servlet: "autophrase",      // what phrase to use on the internal queries
  urlFeed: null,              // which URL parameter to use for initial setup
  useJson: false,             // Whether to use JSON-style parameter setup
  maxResults: 30,             // maximum results in the Autocomplete box
  groups: null,               // Information for value grouping
  
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
    else if (manager.getParameter('q').value == null)
      self.addValue("");
       
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
