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
  this.controlMode = this.tokenMode ? 'tokenfield' : 'autocomplete';
};

jT.AutocompleteWidget.prototype = {
  __expects: [ "doRequest", "onSelect" ],
  tokenMode: true,

  init: function (manager) {
    var self = this;
        
    // now configure the "accept value" behavior
    self.findBox = this.target.find('input').on("change", function (e) {
      if (self.requestSent)
        return;
      
      var thi$ = $(this);
      if (!self.onSelect(thi$.val()))
        return;
        
      thi$.blur()[self.controlMode]("disable");
    });

    // configure the auto-complete box. 
    var boxOpts = {
      'minLength': 0,
      'source': function (request, callback) {
        self.reportCallback = callback;
        self.doRequest(request.term);
      },
      'select': function(event, ui) {
        self.requestSent = ui.item && self.onSelect(ui.item);
      }
    };

    if (this.tokenMode)
      boxOpts = { autocomplete: boxOpts };

    this.findBox[this.controlMode](boxOpts);

    a$.pass(this, jT.AutocompleteWidget, "init", manager);
  },

  resetValue: function(val) {
    this.findBox.val(val)[this.controlMode]("enable");
    this.requestSent = false;
  },
  
  onFound: function (list) {
    this.reportCallback && this.reportCallback(list);
  }
};
