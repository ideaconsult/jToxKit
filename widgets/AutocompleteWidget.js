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
  __expects: [ "doRequest" ],
  tokenMode: true,
  initialState: 'enabled',

  init: function (manager) {
    var self = this;
        
    // now configure the "accept value" behavior
    this.findBox = this.target.find('input').addBack('input').on("change", function (e) {
      if (!self._inChange && self.onChange) {
        var thi$ = $(this);
        self.onChange(thi$.val()) && thi$.blur();
      }
    });

    // configure the auto-complete box. 
    var boxOpts = {
      'minLength': 0,
      'source': function (request, callback) {
        self.reportCallback = callback;
        self.doRequest(request.term);
      },
      'select': function(event, ui) {
        if (!ui.item)
          return;
        self.onSelect && self.onSelect(ui.item);
        self.onAdded && self.onAdded(ui.item);
      },
      'focus': function (event, ui) {
        // Make sure the label is shown, not the value.
        event.preventDefault();
        $(this).val(ui.item.label);        
      }
    };

    if (!this.tokenMode)
      this.findBox.autocomplete(boxOpts);
    else
      this.findBox
        .on('tokenfield:removedtoken', function (e) { 
          self.onRemoved && self.onRemoved(e.attrs.value); 
        })
        .tokenfield({ autocomplete: boxOpts });

    if (this.initialState === 'disabled')
        this.findBox[this.tokenMode ? 'tokenfield' : 'autocomplete']("disable");

    a$.pass(this, jT.AutocompleteWidget, "init", manager);
  },

  resetValue: function(val) {
    this._inChange = true;
    if (this.tokenMode)
      this.findBox.tokenfield('enable').tokenfield('setTokens', val);
    else
      this.findBox.autocomplete('enable').val(val);
    this._inChange = false;
  },
  
  onFound: function (list) {
    this.findBox[this.tokenMode ? 'tokenfield' : 'autocomplete']("enable");
    this.reportCallback && this.reportCallback(list);
    this.reportCallback = null;
  }
};
