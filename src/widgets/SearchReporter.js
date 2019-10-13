/** jToxKit - chem-informatics multi-tool-kit.
 * Current search report widget
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved.
 *
 * TODO: Make it more Solr independent
 */

import a$ from 'as-sys';

var defSettings = {
	useJson: false,
	renderItem: null,
};

function SearchReporter(settings) {
	a$.setup(this, defSettings, settings);

	this.target = settings.target;
	this.id = settings.id;

	this.manager = null;
	this.facetWidgets = {};
	this.fqName = this.useJson ? "json.filter" : "fq";
};

SearchReporter.prototype.init = function (manager) {
	a$.pass(this, SearchReporter, "init", manager);

	this.manager = manager;
};

SearchReporter.prototype.registerWidget = function (widget, pivot) {
	this.facetWidgets[widget.id] = pivot;
};

SearchReporter.prototype.afterResponse = function (data) {
	var self = this,
		links = [],
		q = this.manager.getParameter('q'),
		fq = this.manager.getAllValues(this.fqName);

	// add the free text search as a tag
	if (!!q.value && !q.value.match(/^(\*:)?\*$/)) {
		links.push(self.renderItem({
			title: q.value,
			count: "x",
			onMain() {
				q.value = "";
				self.manager.doRequest();
				return false;
			}
		}).addClass("tag_fixed"));
	}

	// now scan all the filter parameters for set values
	for (var i = 0, l = fq != null ? fq.length : 0; i < l; i++) {
		var f = fq[i],
			vals = null;

		for (var wid in self.facetWidgets) {
			var w = self.manager.getListener(wid),
				vals = w.fqParse(f);
			if (!!vals)
				break;
		}

		if (vals == null)
			continue;

		if (!Array.isArray(vals))
			vals = [vals];

		for (var j = 0, fvl = vals.length; j < fvl; ++j) {
			var v = vals[j],
				el,
				info = (typeof w.prepareTag === "function") ?
				w.prepareTag(v) : {
					title: v,
					count: "x",
					color: w.color,
					onMain: w.unclickHandler(v)
				};

			links.push(el = self.renderItem(info).addClass("tag_selected " + (!!info.onAux ? "tag_open" : "tag_fixed")));

			if (fvl > 1)
				el.addClass("tag_combined");
		}

		if (fvl > 1)
			el.addClass("tag_last");
	}

	if (links.length) {
		links.push(self.renderItem({
			title: "Clear",
			onMain() {
				q.value = "";
				for (var wid in self.facetWidgets)
					self.manager.getListener(wid).clearValues();

				self.manager.doRequest();
				return false;
			}
		}).addClass('tag_selected tag_clear tag_fixed'));

		this.target.empty().addClass('tags').append(links);
	} else
		this.target.removeClass('tags').html('<li>No filters selected!</li>');
};

export default SearchReporter;