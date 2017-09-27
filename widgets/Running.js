/** jToxKit - chem-informatics multi-tool-kit.
  * A very simple, widget add-on for wiring the ability to change
  * certain property of the agent, based on a provided UI element.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016-2017, IDEAConsult Ltd. All rights reserved.
  */

jT.Running = function (settings) {
  a$.extend(true, this, a$.common(settings, jT.Running.prototype));
  var self = this,
      target$ = $(self.runSelector, $(settings.target)[0]),
      runTarget = self.runTarget || self;

  // Now, install the handler to change the field with the UI element.
  target$.on('click', function (e) {
    a$.act(runTarget, self.runMethod, this, e);
    e.stopPropagation();
  });
};

jT.Running.prototype = {
  runSelector: ".switcher",   // A CSS selector to find the switching element.
  runMethod: null,            // The method to be invoked on the given target or on self.
  runTarget: null,            // The target to invoke the method to - this will be used if null.
};
