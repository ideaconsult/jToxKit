/** jToxKit - chem-informatics multi-tool-kit.
 * Delaying a request skill.
 *
 * Author: Ivan Georgiev
 * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
 */

import a$ from 'as-sys';

var defSettings = {
	delay: 300, // Number of milliseconds to delay the request
};

function Delaying(settings) {
	a$.setup(this, defSettings, settings);
	this.delayTimer = null;
};

/** Make the actual request obeying the "delay" settings.
 */
Delaying.prototype.doRequest = function (a, b, c, d) {
	var self = this,
		doInvoke = function () {
			a$.pass(self, Delaying, "doRequest", a, b, c, d);
			self.delayTimer = null;
		};
	if (this.delay == null || this.delay < 10)
		return doInvoke();
	else if (this.delayTimer != null)
		clearTimeout(this.delayTimer);

	this.delayTimer = setTimeout(doInvoke, this.delay);
};

export default Delaying;