/** jToxKit - chem-informatics multi-tool-kit.
 * A generic widget for list management
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved.
 */

import a$ from 'as-sys';
import _ from 'lodash';

function Listing(settings) {
	a$.setup(this, settings);

	this.target = $(settings.target);
	this.length = 0;

	this.clearItems();
};

Listing.prototype = {
	itemId: "id",

	populate: function (docs, callback) {
		this.items = docs;
		this.length = docs.length;

		this.target.empty();
		for (var i = 0, l = docs.length; i < l; i++)
			this.target.append(this.renderItem(typeof callback === "function" ? callback(docs[i]) : docs[i]));
	},

	addItem: function (doc) {
		this.items.push(doc);
		++this.length;
		return this.renderItem(doc);
	},

	clearItems: function () {
		this.target.empty();
		this.items = [];
		this.length = 0;
	},

	findItem: function (id) {
		var self = this;
		return _.findIndex(this.items, typeof id !== "string" ? id : function (doc) {
			return doc[self.itemId] === id;
		});
	},

	eraseItem: function (id) {
		var i = this.findItem(id),
			r = (i >= 0) ? this.items.splice(i, 1)[0] : false;

		this.length = this.items.length;
		return r;
	},

	enumerateItems: function (callback) {
		var els = this.target.children();
		for (var i = 0, l = this.items.length; i < l; ++i)
			callback.call(els[i], this.items[i]);
	}
}

export default Listing;