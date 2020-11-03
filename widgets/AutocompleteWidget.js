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
  tokenMode: true,

  init: function (manager) {
    var self = this;
        
    // now configure the "accept value" behavior
    this.findBox = this.target.find('input').on("change", function (e) {
      if (self.requestSent)
        return;
      
      var thi$ = $(this);
      if (!self.onSelect(thi$.val()))
        return;
        
      thi$.blur()[self.tokenMode ? 'tokenfield' : 'autocomplete']("disable");
    });

    // configure the auto-complete box. 
    var boxOpts = {
      'minLength': 0,
      'source': function (request, callback) {
        self.reportCallback = callback;
        self.doRequest(request.term);
      },
      'select': function(event, ui) {
        self.requestSent = false;
        if (!ui.item)
          return;
        if (self.onSelect)
          self.requestSent = self.onSelect(ui.item);
        if (self.onAdded)
          self.requestSent = self.requestSent || self.onAdded(ui.item);
      }
    };

    if (!this.tokenMode)
      this.findBox.autocomplete(boxOpts);
    else
      this.findBox
        .on('tokenfield:removedtoken', function (e) {
          self.requestSent = self.onRemoved && self.onRemoved(e.attrs.value);
        })
        .tokenfield({ autocomplete: boxOpts });

    a$.pass(this, jT.AutocompleteWidget, "init", manager);
  },

  resetValue: function(val) {
    this.findBox.val(val)[this.controlMode]("enable");
    this.requestSent = false;
  },
  
  onFound: function (list) {
    this.reportCallback && this.reportCallback(list);
    this.requestSent = false;
  }
};
