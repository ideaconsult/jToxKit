/** jToxKit - chem-informatics multi-tool-kit.
  * A very simple, template rendering Item Widget. Suitable for
  * both ListWidget and TagWidgets
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */

jT.SimpleItemWidget = function (settings) {
  a$.extend(true, this, a$.common(settings, this));
  this.target = $(settings.target);
};

jT.SimpleItemWidget.prototype = {
  template: null,
  classes: null,
  
  renderItem: function (info) {
    return jT.ui.getTemplate(template, info).addClass(this.classes);
  }
};
