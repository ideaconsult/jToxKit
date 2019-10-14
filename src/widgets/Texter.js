/** SolrJsX Widgets - a neXt Solr queries JavaScript widget set.
 * All-prepared input text widget.
 *
 * Author: Ivan Georgiev
 * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
 */

import $ from 'jquery';

function Texter(settings) {
	this.target = $(settings.target).find('input').on('change', this.clickHandler());
	this.id = settings.id;
};

Texter.prototype.__expects = ["clickHandler "];

Texter.prototype.afterResponse = function () {
	$(this.target).val('');
};

export default Texter;