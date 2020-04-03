/** jToxKit - chem-informatics multi-tool-kit.
  * A very simple, widget add-on for wiring the ability to change
  * certain property of the agent, based on a provided UI element.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016-2017, IDEAConsult Ltd. All rights reserved.
  */

jT.Switching = function (settings) {
  a$.extend(true, this, a$.common(settings, jT.Switching.prototype));
  var self = this,
      target$ = $(self.switchSelector, $(settings.target)[0]),
      initial = _.get(self, self.switchField);

  // Initialize the switcher according to the field.
  if (typeof initial === 'boolean')
    target$[0].checked = initial;
  else
    target$.val(initial);
        
  // Now, install the handler to change the field with the UI element.
  target$.on('change', function (e) {
    var val = $(this).val();
    
    a$.path(self, self.switchField, typeof initial === 'boolean' ? this.checked || val === 'on' : val);
    a$.act(self, self.onSwitching, e);
    e.stopPropagation();
  });
};

jT.Switching.prototype = {
  switchSelector: ".switcher",  // A CSS selector to find the switching element.
  switchField: null,            // The field to be modified.
  onSwitching: null             // The function to be invoked, on change.
};
