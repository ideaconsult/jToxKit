/** jToxKit - chem-informatics multi-tool-kit.
  * A generic slider (or range) widget
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */

jT.SliderWidget = function (settings) {
  a$.extend(true, this, a$.common(settings, this));

  this.target = $(settings.target);

  this.prepareLimits(settings.limits);
  if (this.initial == null)
    this.initial = this.isRange ? [ this.limits[0], this.limits[1] ] : (this.limits[0] + this.limits[1]) / 2;
    
  this.target.val(Array.isArray(this.initial) ? this.initial.join(",") : this.initial);
    
  if (!!this.automatic)
    this.makeSlider();
};

jT.SliderWidget.prototype = {
  __expects: [ "updateHandler" ],
  limits: null,         // The overall range limit.
  units: null,            // The units of the values.
  initial: null,          // The initial value of the sliders.
  title: null,            // The name of the slier.
  width: null,            // The width of the whole slider.
  automatic: true,        // Whether to automatically made the slider in constructor.
  isRange: true,          // Is this a range slider(s) or a single one?
  showScale: true,        // Whether to show the scale
  format: "%s {{units}}", // The format for value output.
  
  prepareLimits: function (limits) {
    this.limits = typeof limits === "string" ? limits.split(",") : limits;
  
    this.limits[0] = parseFloat(this.limits[0]);
    this.limits[1] = parseFloat(this.limits[1]);
        
    this.precision = Math.pow(10, parseInt(Math.min(1, Math.floor(Math.log10(this.limits[1] - this.limits[0] + 1) - 3))));
    if (this.precision < 1 && this.precision > .01) 
      this.precison = .01;
  },
  
  updateSlider: function (value, limits) {
    if (limits != null) {
      this.prepareLimits(limits);
      this.target.jRange('updateRange', this.limits, value);      
    }
    else
      this.target.jRange('setValue', value);
  },
  
  makeSlider: function () {
    var self = this,
        enabled = this.limits[1] > this.limits[0],
        scale = [
          jT.ui.formatNumber(this.limits[0], this.precision), 
          this.title + (enabled || !this.units ? "" : " (" + this.units + ")"), 
          jT.ui.formatNumber(this.limits[1], this.precision)
        ],
        updateHandler = self.updateHandler(),
        settings = {
        	from: this.limits[0],
        	to: this.limits[1],
        	step: this.precision,
        	scale: scale,
        	showScale: this.showScale,
        	showLabels: enabled,
        	disable: !enabled,
        	isRange: this.isRange,
        	width: this.width,
        	format: jT.ui.formatString(this.format, this) || ""
      	};
    
    if (this.color != null)
      settings.theme = "theme-" + this.color;
      
    settings.ondragend = function () {
      var self = this;
      return function (value) {
        if (typeof value === "string" && self.isRange)
          value = value.split(",");
          
        value = Array.isArray(value) ? value.map(function (v) { return parseFloat(v); }) : parseFloat(value);
        return updateHandler(value);
      };
    };
      
    return this.target.jRange(settings);
  }
};
