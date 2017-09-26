/** jToxKit - chem-informatics multi-tool-kit.
  * A very simple, widget add-on for wiring the ability to change
  * certain property of the agent, based on a provided UI element.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016-2017, IDEAConsult Ltd. All rights reserved.
  */

jT.Switching = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  var self = this;
  
  self.target = $(self.selector, $(settings.target)[0]).on('change', function (e) {
    var val = $(this).val();
    
    if (mode == "toggle")
      a$.path(self, self.field, val == 'true' || val == 'on');
  });
};

jT.Switching.prototype = {
  mode: "toggle",         // The mode this switching acts.
  selector: ".switcher",  // A CSS selector to find the switching element.
  field: null            // The field to be modified.
};
