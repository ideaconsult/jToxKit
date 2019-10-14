/** jToxKit - chem-informatics multi-tool-kit.
 * A range view & management widget.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2017-2019, IDEAConsult Ltd. All rights reserved.
 *
 * TODO: Make it less Solr specific
 */

import a$ from 'as-sys';
import $ from 'jQuery';
import Solr from 'solr-jsx';

import jT from '../Core';
import Slider from './Slider';
import Delaying from '../Delaying';

function SimpleRanger(settings) {
	this.sliderRoot = settings.sliderRoot;
}

SimpleRanger.prototype.__expects = ["addValue", "doRequest"];
SimpleRanger.prototype.targetValue = null;

SimpleRanger.prototype.updateHandler = function () {
	var self = this;
	return function (values) {
		if (!!self.addValue(values)) {
			self.sliderRoot.updateRequest = true;
			self.doRequest();
		}
	};
};

SimpleRanger.prototype.doRequest = function () {
	this.manager.doRequest();
};

var SingleRangeWidget = a$(Solr.Ranging, Solr.Patterning, Slider, SimpleRanger, Delaying),
	defaultParameters = {
		'facet': true,
		'rows': 0,
		'fl': "id",
		'facet.limit': -1,
		'facet.mincount': 1,
		'echoParams': "none"
	},
	defSettings = {
		field: null,
		titleSkips: null,
	};

/** The general wrapper of all parts
 */

function Ranger(settings) {
	a$.setup(this, defSettings, settings);

	this.slidersTarget = $(settings.slidersTarget);
	this.lookupMap = settings.lookupMap || {};
	this.pivotMap = null;
	this.rangeWidgets = [];
	if (!Array.isArray(this.titleSkips))
		this.titleSkips = [this.titleSkips];
};

Ranger.prototype.__expects = ["getPivotEntry", "getPivotCounts"];

Ranger.prototype.init = function (manager) {
	a$.pass(this, Ranger, "init", manager);
	this.manager = manager;

	var self = this;
	self.applyCommand = $("#sliders-controls a.command.apply").on("click", function (e) {
		self.skipClear = true;
		self.manager.doRequest();
		return false;
	});

	$("#sliders-controls a.command.close").on("click", function (e) {
		self.rangeRemove();
		return false;
	});
};

Ranger.prototype.afterResponse = function (data, jhr, params) {
	var pivot = this.getPivotCounts(data.facets);

	a$.pass(this, Ranger, "afterResponse", data, jhr, params);

	if (!this.pivotMap) {
		var qval = this.manager.getParameter('q').value || "";
		if ((!qval || qval == "*:*") && !this.manager.getParameter(this.useJson ? "json.filter" : "fq").value)
			this.pivotMap = this.buildPivotMap(pivot);
	} else if (!this.updateRequest)
		this.rangeRemove();
	else if (this.rangeWidgets.length > 0) {
		var pivotMap = this.buildPivotMap(pivot),
			w, ref;

		for (var i = 0, wl = this.rangeWidgets.length; i < wl; ++i) {
			w = this.rangeWidgets[i];
			ref = pivotMap[w.targetValue];
			w.updateSlider([ref[i].min, ref[i].max]);
		}
	}

	this.updateRequest = false;
};

Ranger.prototype.buildPivotMap = function (pivot) {
	var self = this,
		map = {},
		traverser = function (base, idx, pattern, valId) {
			var p = self.getPivotEntry(idx),
				pid = p.id,
				color = p.color,
				info;

			// Make the Id first
			if (p.ranging && !p.disabled)
				valId = pid + ":" + base.val;

			// Now deal with the pattern
			pattern += (!base.val ? ("-" + p.field + ":*") : (p.field + ":" + Solr.escapeValue(base.val))) + " ";
			info = base;

			p = self.getPivotEntry(idx + 1);
			if (p != null)
				base = base[p.id].buckets;

			// If we're at the bottom - add some entries...
			if (p == null || !base.length) {
				var arr = map[valId];
				if (arr === undefined)
					map[valId] = arr = [];

				arr.push({
					'id': pid,
					'pattern': pattern,
					'color': color,
					'min': info.min,
					'max': info.max,
					'avg': info.avg,
					'val': info.val,
					'count': info.count
				});
			}
			// ... or just traverse and go deeper.
			else {
				for (var i = 0, bl = base.length; i < bl; ++i)
					traverser(base[i], idx + 1, pattern, valId);
			}
		};

	for (var i = 0; i < pivot.length; ++i)
		traverser(pivot[i], 0, "");

	return map;
};

Ranger.prototype.rangeRemove = function () {
	this.slidersTarget.empty().parent().removeClass("active");

	for (var i = 0, wl = this.rangeWidgets.length; i < wl; ++i)
		this.rangeWidgets[i].clearValues();

	this.rangeWidgets = [];
	this.lastPivotMap = this.lastPivotValue = null;
};

Ranger.prototype.buildTitle = function (info, skip) {
	var pat = info.pattern.replace(/\\"/g, "%0022"),
		fields = pat.match(/\w+:([^\s:\/"]+|"[^"]+")/g),
		outs = [];

	// Stupid, but we need to have both regexps because of the
	// global flag needed on the first one and NOT needed later.
	for (var i = 0; i < fields.length; ++i) {
		var f = fields[i],
			m = f.match(/(\w+):([^\s:\/"]+|"[^"]+")/),
			v = m[2].replace(/^\s*\(\s*|\s*\)\s*$/g, "");

		if (!m[1].match(skip))
			outs.push(this.lookupMap[v] || v);
	}

	return outs.join("/") + " <i>(" + info.count + ")</i>";
};

Ranger.prototype.ensurePivotMap = function (value) {
	if (this.pivotMap != null)
		return true;

	var fqName = this.useJson ? "json.filter" : "fq",
		self = this;

	// We still don't have it - make a separate request
	this.doSpying(
		function (man) {
			man.removeParameters(fqName);
			man.removeParameters('fl');
			man.getParameter('q').value = "";
			man.mergeParameters(defaultParameters);
		},
		function (data) {
			self.pivotMap = self.buildPivotMap(self.getPivotCounts(data.facets));
			self.openRangers(value);
		}
	);

	return false;
};

Ranger.prototype.openRangers = function (value) {
	var entry = this.pivotMap[value],
		pivotMap = this.lastPivotMap = this.buildPivotMap(this.getPivotCounts()),
		current = pivotMap[value];

	this.lastPivotValue = value;
	this.slidersTarget.empty().parent().addClass("active");

	for (var i = 0, el = entry.length; i < el; ++i) {
		var all = entry[i],
			ref = current[i],
			setup = {},
			w,
			el$ = jT.fillTemplate("#slider-one");

		this.slidersTarget.append(el$);

		setup.id = all.id;
		setup.targetValue = value;
		setup.color = all.color;
		setup.field = this.field;
		setup.limits = [all.min, all.max];
		setup.initial = [ref.min, ref.max];
		setup.target = el$;
		setup.isRange = true;
		setup.valuePattern = all.pattern + "{{v}}";
		setup.automatic = true;
		setup.width = parseInt(this.slidersTarget.width() - $("#sliders-controls").width() - 20) / (Math.min(el, 2) + 0.1);
		setup.title = this.buildTitle(ref, /^unit[_shd]*|^effectendpoint[_shd]*/);
		setup.units = ref.id == "unit" ? jT.formatUnits(ref.val) : "";
		setup.useJson = this.useJson;
		setup.domain = this.domain;
		setup.sliderRoot = this;

		this.rangeWidgets.push(w = new SingleRangeWidget(setup));
		w.init(this.manager);
	}
};

Ranger.prototype.auxHandler = function (value) {
	var self = this;

	return function (event) {
		event.stopPropagation();

		self.rangeRemove();

		// we've clicked out pivot button - clearing was enough.
		if (value != self.lastPivotValue && self.ensurePivotMap(value))
			self.openRangers(value);

		return false;
	};
};

Ranger.prototype.clearValues = function () {
	this.rangeRemove();
	a$.pass(this, Ranger, "clearValues");
};

export default Ranger;