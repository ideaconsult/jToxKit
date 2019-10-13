/** jToxKit - chem-informatics multi-tool-kit.
 * A stats/pivoting widget. Mainly for Solr use.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2017-2019, IDEAConsult Ltd. All rights reserved.
 *
 * TODO: Make it less Solr specific
 */

import a$ from 'as-sys';
import $ from 'jQuery';

import jT from '../Core';
import Tagger from './Tagger';


function buildValueRange(stats, isUnits) {
	var vals = " = ";

	// min ... average? ... max
	vals += (stats.min == null ? "-&#x221E;" : stats.min);
	if (!!stats.avg) vals += "&#x2026;" + stats.avg;
	vals += "&#x2026;" + (stats.max == null ? "&#x221E;" : stats.max);

	if (isUnits)
		vals += " " + jT.formatUnits(stats.val)
		.replace(/<sup>(2|3)<\/sup>/g, "&#x00B$1;")
		.replace(/<sup>(\d)<\/sup>/g, "^$1");

	return vals;
};

function InnterTagger(settings) {
	this.id = settings.id;
	this.pivotWidget = settings.pivotWidget;
};


InnterTagger.prototype.pivotWidget = null;

InnterTagger.prototype.hasValue = function (value) {
	return this.pivotWidget.hasValue(this.id + ":" + value);
};

InnterTagger.prototype.clickHandler = function (value) {
	return this.pivotWidget.clickHandler(this.id + ":" + value);
};

InnterTagger.prototype.modifyTag = function (info) {
	info.hint = !info.unit ?
		info.buildValueRange(info) :
		"\n" + info.unit.buckets.map(function (u) {
			return buildValueRange(u, true);
		}).join("\n");

	info.color = this.color;
	return info;
};

var InnerTagWidget = a$(Tagger, InnterTagger),
	iDificationRegExp = /\W/g,
	defSettings = {
		automatic: false, // Whether to build the list dynamically.
		renderTag: null, // A function for rendering the tags.
		multivalue: false, // If this filter allows multiple values. Values can be arrays.
		aggregate: false, // If additional values are aggregated in one filter.
		exclusion: false, // Whether to exclude THIS field from filtering from itself.
	};


/** The general wrapper of all parts
 */

function Pivoter(settings) {
	a$.setup(this, defSettings, settings);

	this.target = settings.target;
	this.targets = {};
	this.lastEnabled = 0;
	this.initialPivotCounts = null;
};

Pivoter.prototype.__expects = ["getFaceterEntry", "getPivotEntry", "getPivotCounts", "auxHandler"];

Pivoter.prototype.init = function (manager) {
	a$.pass(this, Pivoter, "init", manager);
	this.manager = manager;

	this.manager.getListener("current").registerWidget(this, true);
};

Pivoter.prototype.addFaceter = function (info, idx) {
	var f = a$.pass(this, Pivoter, "addFaceter", info, idx);
	if (typeof info === "object")
		f.color = info.color;
	if (idx > this.lastEnabled && !info.disabled)
		this.lastEnabled = idx;

	return f;
};

Pivoter.prototype.afterResponse = function (data, jhr, params) {
	var pivot = this.getPivotCounts(data.facets);

	a$.pass(this, Pivoter, "afterResponse", data, jhr, params);

	// Iterate on the main entries
	for (var i = 0; i < pivot.length; ++i) {
		var p = pivot[i],
			pid = p.val.replace(iDificationRegExp, "_"),
			target = this.targets[pid];

		if (!target) {
			this.targets[pid] = target = new jT.AccordionExpander($.extend(true, {}, this.settings, this.getFaceterEntry(0), {
				id: pid,
				title: p.val
			}));
			target.updateHandler = this.updateHandler(target);
			target.target.children().last().remove();
		} else
			target.target.children('ul').hide();

		this.traversePivot(target.target, p, 1);
		target.updateHandler(p.count);
	}

	// Finally make this update call.
	this.target.accordion("refresh");
};

Pivoter.prototype.updateHandler = function (target) {
	var hdr = target.getHeaderText();
	return function (count) {
		hdr.textContent = jT.updateCounter(hdr.textContent, count);
	};
};

Pivoter.prototype.prepareTag = function (value) {
	var p = this.parseValue(value);

	return {
		title: p.value,
		color: this.faceters[p.id].color,
		count: "i",
		onMain: this.unclickHandler(value),
		onAux: this.auxHandler(value)
	};
};

Pivoter.prototype.traversePivot = function (target, root, idx) {
	var elements = [],
		faceter = this.getPivotEntry(idx),
		bucket = root[faceter.id].buckets;

	if (idx === this.lastEnabled) {
		var w = target.data("widget");
		if (!w) {
			w = new InnerTagWidget({
				id: faceter.id,
				color: faceter.color,
				renderItem: this.renderTag,
				pivotWidget: this,
				target: target,
				multivalue: this.multivalue,
				aggregate: this.aggregate,
				exclusion: this.exclusion
			});

			w.init(this.manager);
			target.data({
				widget: w,
				id: faceter.id
			});
		} else
			target.children().slice(1).remove();

		w.populate(bucket, true);
		elements = [];
	} else if (bucket != null) {
		for (var i = 0, fl = bucket.length; i < fl; ++i) {
			var f = bucket[i],
				fid = f.val.replace(iDificationRegExp, "_"),
				cont$;

			if (target.children().length > 1) // the input field.
				cont$ = $("#" + fid, target[0]).show();
			else {
				cont$ = jT.fillTemplate($("#tag-facet"), faceter).attr("id", fid);

				f.title = f.val;
				f.onMain = this.clickHandler(faceter.id + ":" + f.val);
				f.hint = buildValueRange(f);
				cont$.append(this.renderTag(f).addClass("category title").addClass(faceter.color));
				elements.push(cont$);
			}

			this.traversePivot(cont$, f, idx + 1);
		}
	}

	target.append(elements);
};

export default Pivoter;