/** jToxKit - chem-informatics multi-tool-kit.
 * A very simple, widget add-on for wiring the ability to passing UI 
 * an action to designated method of the agent.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved.
 */

import a$ from 'as-sys';
import $ from 'jquery';

var defSettings = {
	runSelector: ".switcher", // A CSS selector to find the switching element.
	runMethod: null, // The method to be invoked on the given target or on self.
	runTarget: null, // The target to invoke the method to - this will be used if null.
};

function Passer(settings) {
	a$.setup(this, defSettings, settings);

	var self = this,
		target$ = $(self.runSelector, $(settings.target)[0]),
		runTarget = self.runTarget || self;

	// Now, install the handler to change the field with the UI element.
	target$.on('click', function (e) {
		a$.act(runTarget, self.runMethod, this, e);
		e.stopPropagation();
	});
};

export default Passer;
