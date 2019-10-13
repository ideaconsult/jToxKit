/** jToxKit - chem-informatics multi-tool-kit.
 * All-prepared, universal page showing widget.
 *
 * Author: Ivan Georgiev
 * Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved.
 */

/**
 * A pager widget for jQuery.
 *
 * <p>Heavily inspired by the Ruby on Rails will_paginate gem.</p>
 *
 * @expects this.target to be a list.
 * @class PagerWidget
 * @augments AjaxSolr.AbstractWidget
 * @todo Don't use the manager to send the request. Request only the results,
 * not the facets. Update only itself and the results widget.
 */

import a$ from 'as-sys';

var defSettings = {
	innerWindow: 4, // How many links are shown around the current page. Defaults to 4.
	outerWindow: 1, // How many links are around the first and the last page. Defaults to 1
	prevLabel: '&laquo; Previous', // The previous page link label. Defaults to "&laquo; Previous".
	nextLabel: 'Next &raquo;', // The next page link label. Defaults to "Next &raquo;".
	separator: ' ', // Separator between pagination links. Defaults to " ".
};

function Pager(settings) {
	a$.setup(this, defSettings, settings);

	this.target = $(settings.target);
	this.id = settings.id;
	this.manager = null;
}

Pager.prototype.__expects = ["nextPage", "previousPage"];


/**
 * @returns {String} The gap in page links, which is represented by:
 *   <span class="pager-gap">&hellip;</span>
 */
Pager.prototype.gapMarker = function () {
	return '<span class="pager-gap">&hellip;</span>';
};

/**
 * @returns {Array} The links for the visible page numbers.
 */
Pager.prototype.windowedLinks = function () {
	var links = [],
		prev = null;

	visible = this.visiblePageNumbers();
	for (var i = 0, l = visible.length; i < l; i++) {
		if (prev && visible[i] > prev + 1) links.push(this.gapMarker());
		links.push(this.pageLinkOrSpan(visible[i], ['pager-current']));
		prev = visible[i];
	}

	return links;
};

/**
 * @returns {Array} The visible page numbers according to the window options.
 */
Pager.prototype.visiblePageNumbers = function () {
	var windowFrom = this.currentPage - this.innerWindow,
		windowTo = this.currentPage + this.innerWindow,
		visible = [];

	// If the window is truncated on one side, make the other side longer
	if (windowTo > this.totalPages) {
		windowFrom = Math.max(0, windowFrom - (windowTo - this.totalPages));
		windowTo = this.totalPages;
	}
	if (windowFrom < 1) {
		windowTo = Math.min(this.totalPages, windowTo + (1 - windowFrom));
		windowFrom = 1;
	}

	// Always show the first page
	visible.push(1);
	// Don't add inner window pages twice
	for (var i = 2; i <= Math.min(1 + this.outerWindow, windowFrom - 1); i++) {
		visible.push(i);
	}
	// If the gap is just one page, close the gap
	if (1 + this.outerWindow == windowFrom - 2) {
		visible.push(windowFrom - 1);
	}
	// Don't add the first or last page twice
	for (var i = Math.max(2, windowFrom); i <= Math.min(windowTo, this.totalPages - 1); i++) {
		visible.push(i);
	}
	// If the gap is just one page, close the gap
	if (this.totalPages - this.outerWindow == windowTo + 2) {
		visible.push(windowTo + 1);
	}
	// Don't add inner window pages twice
	for (var i = Math.max(this.totalPages - this.outerWindow, windowTo + 1); i < this.totalPages; i++) {
		visible.push(i);
	}
	// Always show the last page, unless it's the first page
	if (this.totalPages > 1) {
		visible.push(this.totalPages);
	}

	return visible;
};

/**
 * @param {Number} page A page number.
 * @param {String} classnames CSS classes to add to the page link.
 * @param {String} text The inner HTML of the page link (optional).
 * @returns The link or span for the given page.
 */
Pager.prototype.pageLinkOrSpan = function (page, classnames, text) {
	text = text || page;

	if (page && page != this.currentPage) {
		return $('<a href="#"></a>').html(text).attr('rel', this.relValue(page)).addClass(classnames[1]).click(this.clickHandler(page));
	} else {
		return $('<span></span>').html(text).addClass(classnames.join(' '));
	}
};

/**
 * @param {Number} page A page number.
 * @returns {String} The <tt>rel</tt> attribute for the page link.
 */
Pager.prototype.relValue = function (page) {
	switch (page) {
		case this.previousPage():
			return 'prev' + (page == 1 ? 'start' : '');
		case this.nextPage():
			return 'next';
		case 1:
			return 'start';
		default:
			return '';
	}
};

/**
 * An abstract hook for child implementations.
 *
 * @param {Number} perPage The number of items shown per results page.
 * @param {Number} offset The index in the result set of the first document to render.
 * @param {Number} total The total number of documents in the result set.
 */
Pager.prototype.renderHeader = function (perPage, offset, total) {};

/**
 * Render the pagination links.
 *
 * @param {Array} links The links for the visible page numbers.
 */
Pager.prototype.renderLinks = function (links) {
	if (this.totalPages) {
		links.unshift(this.pageLinkOrSpan(this.previousPage(), ['pager-disabled', 'pager-prev'], this.prevLabel));
		links.push(this.pageLinkOrSpan(this.nextPage(), ['pager-disabled', 'pager-next'], this.nextLabel));

		var $target = $(this.target);
		$target.empty();

		for (var i = 0, l = links.length; i < l; i++) {
			var $li = $('<li></li>');
			if (this.separator && i > 0) {
				$li.append(this.separator);
			}
			$target.append($li.append(links[i]));
		}
	}
}

Pager.prototype.afterResponse = function () {
	a$.pass(this, Pager, 'afterResponse');

	$(this.target).empty();

	this.renderLinks(this.windowedLinks());
	this.renderHeader(this.pageSize, (this.currentPage - 1) * this.pageSize, this.totalEntries);
};

export default Pager;