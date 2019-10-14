/** jToxKit - chem-informatics multi-tool-kit.
 * An expansion builder for existing Accordion widget
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2017-2019, IDEAConsult Ltd. All rights reserved.
 */

import a$ from 'as-sys';
import $ from 'jquery';

import jT from "../Core";

var defSettings = {
	automatic: true,
	title: null,
	classes: null,
	expansionTemplate: null,
	before: null,
};

function AccordionExpander(settings) {
	a$.setup(this, defSettings, settings);

	this.target = $(settings.target);
	this.header = null;
	this.id = settings.id;

	// We're resetting the target, so the rest of skills get a true one.
	if (this.automatic)
		settings.target = this.makeExpansion();
};

AccordionExpander.prototype.renderExpansion = function (info) {
	return jT.fillTemplate(this.expansionTemplate, info).addClass(this.classes);
};

AccordionExpander.prototype.makeExpansion = function (before, info) {
	// Check if we've already made the expansion
	if (!!this.header)
		return;

	if (!info)
		info = this;
	if (!before)
		before = this.before;

	var el$ = this.renderExpansion(info);

	this.accordion = this.target;

	if (!before)
		this.accordion.append(el$);
	else if (typeof before === "number")
		this.accordion.children().eq(before).before(el$);
	else if (typeof before === "string")
		$(before, this.accordion[0]).before(el$);
	else
		$(before).before(el$);

	this.refresh();
	this.header = $("#" + this.id + "_header");
	return this.target = $("#" + this.id); // ATTENTION: This presumes we've put that ID to the content part!
};

AccordionExpander.prototype.getHeaderText = function () {
	return this.header.contents().filter(function () {
		return this.nodeType == 3;
	})[0];
};

AccordionExpander.prototype.refresh = function () {
	this.accordion.accordion("refresh");
};

export default AccordionExpander;