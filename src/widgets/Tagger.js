/** jToxKit - chem-informatics multi-tool-kit.
 * A generic widget for box of tag management.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved.
 */

import a$ from 'as-sys';
import _ from 'lodash';
import $ from 'jQuery';

var defSettings = {
	color: null,
	renderItem: null,
	onUpdated: null,
	subtarget: null,
};

function Tagger(settings) {
	a$.setup(this, defSettings, settings);

	this.target = $(settings.target);
	if (!!this.subtarget)
		this.target = this.target.find(this.subtarget).eq(0);

	this.id = settings.id;
	this.color = this.color || this.target.data("color");
	if (!!this.color)
		this.target.addClass(this.color);
};

Tagger.prototype.__expects = ["hasValue", "clickHandler"];

Tagger.prototype.init = function (manager) {
	a$.pass(this, Tagger, "init", manager);
	this.manager = manager;
};

Tagger.prototype.populate = function (objectedItems, preserve) {
	var self = this,
		item = null,
		total = 0,
		el, selected, value;

	if (objectedItems.length == null || objectedItems.length == 0) {
		if (!preserve)
			this.target.html("No items found in this selection").addClass("jt-no-tags");
	} else {
		this.target.removeClass("jt-no-tags");
		objectedItems.sort(function (a, b) {
			return (a.value || a.val) < (b.value || b.val) ? -1 : 1;
		});

		if (!preserve)
			this.target.empty();

		for (var i = 0, l = objectedItems.length; i < l; i++) {
			item = objectedItems[i];
			value = item.value || item.val;
			selected = this.exclusion && this.hasValue(value);
			total += item.count;

			item.title = value.toString();
			if (typeof this.modifyTag === 'function')
				item = this.modifyTag(item);

			if (!selected)
				item.onMain = self.clickHandler(value);

			this.target.append(el = this.renderItem(item));

			if (selected)
				el.addClass("selected");
		}
	}

	a$.act(this, this.onUpdated, total);
};

export default Tagger;