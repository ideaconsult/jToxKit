/** SolrJsX Widgets - a neXt Solr queries JavaScript widget set.
 * All-prepared input text widget.
 *
 * Author: Ivan Georgiev
 * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
 */

import a$ from 'as-sys';
import $ from 'jQuery';

function Text(settings) {
	a$.setup(this, settings);

	this.target = $(settings.target).find('input').on('change', this.clickHandler());
	this.id = settings.id;
};

Text.prototype = {
	__expects: ["clickHandler "],

	afterResponse: function () {
		$(this.target).val('');
	}
};

export default Text;
