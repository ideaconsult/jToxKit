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
      target$ = $(self.switchSelector, $(self.switchOnHeader ? self.header : self.target)[0]),
      type = self.switchType || target$[0].type,
      initial = a$.path(self, self.switchField);
  
  // Initialize the switcher according to the field.
  if (type === 'checkbox')
    target$[0].checked = initial;
        
  // Now, install the handler to change the field with the UI element.
  target$.on('change', function (e) {
    var val = $(this).val();
    
    if (type === 'checkbox')
      a$.path(self, self.switchField, this.checked);
      
    e.stopPropagation();
  });
};

jT.Switching.prototype = {
  switchOnHeader: false,        // Whether the switcher is on the header el, not target
  switchType: null,             // The switch type to be used instead of deduced one.
  switchSelector: ".switcher",  // A CSS selector to find the switching element.
  switchField: null             // The field to be modified.
};
