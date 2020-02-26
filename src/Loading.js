/** jToxKit - chem-informatics multi-tool-kit.
 * A simple loader - proepr icon showing during operations skills.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2019, IDEAConsult Ltd. All rights reserved.
 *
 */

import a$ from 'as-sys';
import $ from 'jquery';

var defSettings = {
	errorMessage: "Error retrieving data!",
	imagesRoot: "images/",
	loadingImgUrl: null,
};

// Keep in mind that the field should be the same in all entries.
function Loading(settings) {
	a$.setup(this, defSettings, settings);
	this.target = settings && settings.target;

	if (!this.imagesRoot.match(/(\/|\\)$/))
    	this.imagesRoot += '/'

	if (!settings.loadingImgUrl)
		this.loadingImgUrl = this.imagesRoot + "ajax-loader.gif";
};

Loading.prototype.__expects = ["populate"];

Loading.prototype.init = function (manager) {
	a$.pass(this, Loading, 'init', manager);
	this.manager = manager;
};

Loading.prototype.beforeRequest = function () {
	$(this.target).html('<img src="' + this.loadingImgUrl+ '">');
};

Loading.prototype.afterResponse = function (data) {
	if (!data) // i.e. error
		$(this.target).html(this.errorMessage);
	else {
		$(this.target).empty();
		this.populate(data.entries);
	}
};


export default Loading;