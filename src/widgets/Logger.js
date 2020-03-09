/** jToxKit - chem-informatics multi-tool-kit.
 * The universal logging capabilities.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2017-2019, IDEAConsult Ltd. All rights reserved.
 */

import a$ from 'as-sys';
import _ from 'lodash';
import $ from 'jquery';

import jT from '../Core';

function buildServiceId(params) {
	var url = jT.parseURL(params.url || params);

	return url.protocol + "://" + url.host + url.path;
};

var defSettings = {
	statusDelay: 1500, // number of milliseconds to keep success / error messages before fading out
	keepMessages: 50, // how many messages to keep in the queue
	lineHeight: "20px", // the height of each status line
	rightSide: false, // put the status icon on the right side
	hasDetails: true, // whether to have the ability to open each line, to show it's details
	autoHide: true, // whether to install handlers for showing and hiding of the logger
};

function Logger(settings) {
	a$.setup(this, defSettings, settings);

	var root$ = $(this.target = settings.target);
	root$.html(jT.templates['logger-main']);
	root$.addClass('jtox-toolkit jtox-log'); // to make sure it is there even when manually initialized

	// We can deduce the id from the provided element.
	this.id = root$.attr('id');

	if (typeof this.lineHeight == "number")
		this.lineHeight = this.lineHeight.toString() + 'px';
	if (typeof this.keepMessages != "number")
		this.keepMessages = parseInt(this.keepMessages);

	// now the actual UI manipulation functions...
	this.listRoot = $('.list-root', this.target)[0],
		this.statusEl = $('.status', this.target)[0];

	if (!!this.rightSide) {
		this.statusEl.style.right = '0px';
		root$.addClass('right-side');
	} else
		this.statusEl.style.left = '0px';

	this.setStatus('');

	// this is the queue of events - indexes by the passed service
	this.events = {};

	if (!!this.autoHide) {
		root$.bind('click', function (e) {
			$(this).toggleClass('hidden');
		});
		root$.bind('mouseleave', function (e) {
			$(this).addClass('hidden');
		});
	}
};

// line formatting function - function (params, jhr) -> { header: "", details: "" }
Logger.prototype.formatEvent = function (params, jhr) {
	var info = {};
	
	if (params != null) {
		info.header = params.method.toUpperCase() + ": " + buildServiceId(params);
		info.details = "...";
	}
	
	// by returning only the details part, we leave the header as it is.	
	if (jhr != null)
		info.details = jhr.status + " " + jhr.statusText + '<br/>' + jhr.getAllResponseHeaders();
	
	return info;
};

Logger.prototype.setIcon = function (line$, status) {
	if (status == "error")
		line$.addClass('ui-state-error');
	else
		line$.removeClass('ui-state-error');

	line$.data('status', status);
	if (status == "error")
		$('.icon', line$).addClass('ui-icon ui-icon-alert').removeClass('loading ui-icon-check');
	else if (status == "success")
		$('.icon', line$).addClass('ui-icon ui-icon-check').removeClass('loading ui-icon-alert');
	else {
		$('.icon', line$).removeClass('ui-icon ui-icon-check ui-icon-alert');
		if (status == "connecting")
			$('.icon', line$).addClass('loading');
	}
};

Logger.prototype.setStatus = function (status) {
	var self = this;

	$(".icon", self.statusEl).removeClass("jt-faded");
	self.setIcon($(self.statusEl), status);
	if (status == "error" || status == "success") {
		setTimeout(function () {
			$('.icon', self.statusEl).addClass('jt-faded');
			var hasConnect = false;
			$('.logline', self.listRoot).each(function () {
				if ($(self).data('status') == "connecting")
					hasConnect = true;
			});
			if (hasConnect)
				self.setStatus("connecting");
		}, self.statusDelay);
	}
};

Logger.prototype.addLine = function (data) {
	var self = this,
		el$ = jT.fillTemplate("#jtox-logline", data);

	el$.height('0px');
	this.listRoot.insertBefore(el$[0], this.listRoot.firstElementChild);

	setTimeout(function () {
		el$.height(self.lineHeight);
	}, 150);
	if (!!self.hasDetails) {
		$('.icon', el$[0]).on('click', function (e) {
			el$.toggleClass('openned');
			if (el$.hasClass("openned")) {
				var height = 0;
				$('.data-field', el$[0]).each(function () {
					height += this.offsetHeight;
				});
				el$.height(height + 6);
			} else
				el$.height(self.lineHeight);

			// to make sure other clickable handler won't take control.
			e.stopPropagation();
		});
	}

	while (this.listRoot.childNodes.length > self.keepMessages)
		this.listRoot.removeChild(this.listRoot.lastElementChild);

	return el$;
};

Logger.prototype.beforeRequest = function (params) {
	var info = this.formatEvent(params),
		line$ = this.addLine(info);

	this.setStatus("connecting");
	this.events[params.logId = Date.now()] = line$;
	this.setIcon(line$, 'connecting');
	line$.data('status', "connecting");
};

Logger.prototype.afterResponse = function (response, jhr, params) {
	var line$ = this.events[params.logId],
		status = !!response ? 'success' : 'error';

	if (!line$) {
		line$ = this.addLine(this.formatEvent(params, jhr));
	} else {
		delete this.events[params.logId];
		jT.fillTree(line$[0], info);
	}

	this.setStatus(status);
	this.setIcon(line$, status);

	if (status == 'error')
		console && console.log("Error [" + buildServiceId(params) + "]: " + jhr.statusText);
};

/**
 * Set `onPrepare`, `onSuccess` and `onError` callback methods of a given object
 * to point to my handlers.
 * @param {Object} dest The object to be set.
 */
Logger.prototype.mountOnHandlers = function (dest) {
	var self = this;

	if (typeof dest === 'string')
		dest = _.get(window, dest);
	else if (typeof dest === 'function')
		dest = dest.prototype;
	else if (typeof dest !== 'object')
		throw {
			"name": "Wrong argument",
			"message": "Passed object for mounting [" + dest + "] cannot be resolved to an object!" 
		};

	dest.onPrepare = function (params) {
		return self.beforeRequest(params);
	};
	dest.onSuccess = function (data, jqXHR, params) {
		return self.afterResponse(data, jqXHR, params, this); // we know onSuccess is invoked in `this` context. 
	};
	dest.onError = function (jqXHR, params) {
		return self.afterResponse(null, jqXHR, params, this);
	};

	return dest;
}

export default Logger;