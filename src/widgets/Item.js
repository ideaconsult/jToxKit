/** jToxKit - chem-informatics multi-tool-kit.
 * A very simple, template rendering an Item Widget. Suitable for
 * both ListWidget and TagWidgets
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved.
 */

import a$ from 'as-sys';
import jT from '../Core';

function v(settings) {
	a$.setup(this, settings);
	this.target = $(settings.target);
};

Item.prototype = {
	template: null,
	classes: null,

	renderItem: function (info) {
		return jT.ui.fillTemplate(template, info).addClass(this.classes);
	}
};

export default Item;
