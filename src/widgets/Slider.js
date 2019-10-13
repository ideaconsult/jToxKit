/** jToxKit - chem-informatics multi-tool-kit.
 * A generic slider (or range) widget
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2017-2019, IDEAConsult Ltd. All rights reserved.
 */
import a$ from 'as-sys';

import jT from '../Core';


var defSettings = {
	limits: null, // The overall range limit.
	units: null, // The units of the values.
	initial: null, // The initial value of the sliders.
	title: null, // The name of the slier.
	width: null, // The width of the whole slider.
	automatic: true, // Whether to automatically made the slider in constructor.
	isRange: true, // Is this a range slider(s) or a single one?
	showScale: true, // Whether to show the scale
	format: "%s {{units}}", // The format for value output.
};

function Slider(settings) {
	a$.setup(this, defSettings, settings);

	this.target = $(settings.target);

	this.prepareLimits(settings.limits);
	if (this.initial == null)
		this.initial = this.isRange ? [this.limits[0], this.limits[1]] : (this.limits[0] + this.limits[1]) / 2;

	this.target.val(Array.isArray(this.initial) ? this.initial.join(",") : this.initial);

	if (!!this.automatic)
		this.makeSlider();
};

Slider.prototype.__expects = ["updateHandler"];

Slider.prototype.prepareLimits = function (limits) {
	this.limits = typeof limits === "string" ? limits.split(",") : limits;

	this.limits[0] = parseFloat(this.limits[0]);
	this.limits[1] = parseFloat(this.limits[1]);

	this.precision = Math.pow(10, parseInt(Math.min(1, Math.floor(Math.log10(this.limits[1] - this.limits[0] + 1) - 3))));
	if (this.precision < 1 && this.precision > .01)
		this.precison = .01;
};

Slider.prototype.updateSlider = function (value, limits) {
	if (Array.isArray(value))
		value = value.join(",");

	if (limits != null) {
		this.prepareLimits(limits);
		this.target.jRange('updateRange', this.limits, value);
	} else
		this.target.jRange('setValue', value);
};

Slider.prototype.makeSlider = function () {
	var self = this,
		enabled = this.limits[1] > this.limits[0],
		scale = [
			jT.formatNumber(this.limits[0], this.precision),
			this.title + (enabled || !this.units ? "" : " (" + this.units + ")"),
			jT.formatNumber(this.limits[1], this.precision)
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
			format: jT.formatString(this.format, this) || ""
		};

	if (this.color != null)
		settings.theme = "theme-" + this.color;

	settings.ondragend = function (value) {
		if (typeof value === "string" && self.isRange)
			value = value.split(",");

		value = Array.isArray(value) ? value.map(function (v) {
			return parseFloat(v);
		}) : parseFloat(value);
		return updateHandler(value);
	};

	return this.target.jRange(settings);
};

export default Slider;