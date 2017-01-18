/** jToxKit - chem-informatics multi-tool-kit.
  * An expansion builder for existing Accordion widget
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */

jT.AccordionExpansion = function (settings) {
  a$.extend(true, this, a$.common(settings, this));

  this.target = $(settings.target);
  this.header = null;
  
  // We're resetting the target, so the rest of skills get a true one.
  if (this.automatic)
    settings.target = this.makeExpansion();
};

jT.AccordionExpansion.prototype = {
  automatic: true,
  title: null,
  hdrClasses: null,
  mainClasses: null,
  template: null,
  
  renderExpansion: function (info) {
    return jT.ui.fillTemplate(this.template, info).addClass(this.classes);
  },
  
  makeExpansion: function (before, title) {
    // Check if we've already made the expansion
    if (!!this.header)
      return; 
      
    this.title = title || this.title || this.id;
    var el$ = this.renderExpansion(this);

    this.accordion = this.target;
    
    if (!before)
      this.accordion.append(el$);
    else if (typeof before === "number")
      this.accordion.children().eq(before).before(el$);
    else if (typeof before === "string")
      $(before, this.accordion[0]).before(el$);
    else
      $(before).before(el$);
   
    this.refresh();
    this.header = $("#" + this.id + "_header");
		return this.target = $("#" + this.id); // ATTENTION: This presumes we've put that ID to the content part!
  },
  
  getHeaderText: function () {
    return this.header.contents().filter(function () { return this.nodeType == 3; })[0];
  },
  
  refresh: function () {
		this.accordion.accordion("refresh");
  }
};
