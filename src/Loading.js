/** jToxKit - chem-informatics multi-tool-kit.
 * A simple loader - proepr icon showing during operations skills.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2019, IDEAConsult Ltd. All rights reserved.
 *
 */

import a$ from 'as-sys';
import $ from 'jQuery';

// Keep in mind that the field should be the same in all entries.
function Loading(settings) {
	a$.setup(this, settings);
};

Loading.prototype = {
	__expects: ["populate"],
	errorMessage: "Error retrieving data!",

	init(manager) {
		a$.pass(this, Loading, 'init', manager);
		this.manager = manager;
	},

	beforeRequest() {
		$(this.target).html(
			$('<img>').attr('src', 'images/ajax-loader.gif'));
	},

	afterResponse(data, jqXHR) {
		if (!data) // i.e. error
			$(this.target).html(this.errorMessage);
		else {
			$(this.target).empty();
			this.populate(data.entries);
		}
	}
};


export default Loading;
