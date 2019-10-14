/** jToxKit - chem-informatics multi-tool-kit.
 * Spying, i.e. alternative requesting skill.
 *
 * Author: Ivan Georgiev
 * Copyright © 2017-2019, IDEAConsult Ltd. All rights reserved.
 */

import a$ from 'as-sys';
import _ from 'lodash';

var defSettings = {
	servlet: null, // The custom servlet to use for the request
	privateRequest: false, // Is the actual request private
	onSpyResponse: null, // An optional response callback
};

function Spying(settings) {
	a$.setup(this, defSettings, settings);
	this.manager = null;
};

/** Make the initial setup of the manager.
 */
Spying.prototype.init = function (manager) {
	a$.pass(this, Spying, "init", manager);
	this.manager = manager;
};

/** Make the actual request.
 */
Spying.prototype.doSpying = function (settings, callback) {
	var man = this.manager;

	man.pushParameters(true);
	if (typeof settings === "function")
		settings(man);
	else _.each(settings, function (v, k) {
		if (v == null)
			man.removeParameters(k);
		else if (Array.isArray(v))
			_.each(v, function (vv) {
				man.addParameter(k, vv);
			});
		else if (typeof v === "object")
			man.addParameter(v);
		else
			man.addParameter(k, v);
	});

	man.doRequest(this.servlet, this.privateRequest, callback || this.onSpyResponse);
	man.popParameters();
};

export default Spying;