/** jToxKit - chem-informatics multi-tool-kit.
 * A very simple, template rendering an item widget. Suitable for
 * both ListWidget and TagWidgets
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved.
 */

import a$ from 'as-sys';
import jT from './Core';

var defSettings = {
	template: null,
	classes: null,
};

function Iteming(settings) {
	a$.setup(this, defSettings, settings);
	this.target = $(settings.target);
};

Iteming.prototype.renderItem = function (info) {
	return jT.fillTemplate(template, info).addClass(this.classes);
};

export default Iteming;