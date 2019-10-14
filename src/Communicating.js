/** jToxKit - chem-informatics multi-tool-kit.
 * Skills for conducting the actual communication with a server
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2019, IDEAConsult Ltd. All rights reserved.
 */

import a$ from 'as-sys';
import _ from 'lodash';

// Default settings for the ajax call to the `connector`
var ajaxDefaults = {
	async: true,
	dataType: "json",
	method: 'GET',
	processData: false,
}, defSettings = {
	connector: null, // The object for making the actual requests - jQuery.ajax fn works pretty fine.
	serverUrl: "", // The base server Url to be used, excluding the service (servlet)

	onPrepare: null,
	onError: null,
	onSuccess: null,
	ajaxSettings: null,
};

function Communicating(settings) {
	a$.setup(this, defSettings, settings);

	// Make sure the serverUrl ends with a slash.
	if (!_.endsWith(this.serverUrl, "/"))
		this.serverUrl += "/";

	this.listeners = {}; // The set of listeners - based on their 'id'.
	this.error = null;

	this.pendingRequests = [];
	this.inRequest = false;

	this.ajaxSettings = _.defaults(this.ajaxSettings, ajaxDefaults);
};

Communicating.prototype.__expects = ["prepareQuery"];

/** The method for performing the actual request. You can provide custom servlet to invoke
 * and/or custom `callback`, which, if present, will suppress the normal listener notification
 * and make an private call and `callback notification.
 * 
 * @param {string|object} servlet The actual service/url to make the request to. Without the server part.
 * @param {boolean} isPrivate Whether the request is private, i.e. - ignoring the listeners.
 * @param {function} callback If provided, will be invoked when the reposnse comes.
 */
Communicating.prototype.doRequest = function (servlet, isPrivate, callback) {
	// Suppress same request before this one is finished processing. We'll
	// remember that we're being asked and will make _one_ request afterwards.
	if (this.inRequest) {
		this.pendingRequests.push(arguments);
		return;
	}

	this.inRequest = true;

	// fix the incoming parameters
	if (typeof servlet === "function") {
		callback = servlet;
		isPrivate = false;
		servlet = null;
	} else if (typeof isPrivate === 'function') {
		callback = isPrivate;
		isPrivate = false;
	}
	
	servlet = servlet || this.servlet || "";

	var self = this,
		cancel = null,
		ajaxOpts = _.defaults(this.prepareQuery(servlet), this.ajaxSettings);

	// We don't make these calls on private requests
	if (!isPrivate) {
		// Now go to inform the listeners that a request is going to happen and
		// give them a change to cancel it.
		_.each(self.listeners, function (l) {
			if (a$.act(l, l.beforeRequest, ajaxOpts, self) === false)
				cancel = l;
		})

		if (cancel !== null) {
			a$.act(cancel, self.onError, null, "Request cancelled", cancel, self);
			return;
		}
	}

	// Prepare the handlers for both error and success.
	ajaxOpts.error = function (jqXHR, status, message) {
		if (typeof callback === "function")
			callback(null, jqXHR);

		if (!isPrivate) {
			_.each(self.listeners, function (l) {
				a$.act(l, l.afterResponse, null, jqXHR, ajaxOpts, self);
			});
			a$.act(self, self.onError, jqXHR, ajaxOpts);
		}
	};

	ajaxOpts.success = function (response, status, jqXHR) {
		var data = a$.act(self, 'parseResponse', response) || response;

		if (typeof callback === "function")
			callback(data, response, jqXHR);

		if (!isPrivate) {
			// Now inform all the listeners
			_.each(self.listeners, function (l) {
				a$.act(l, l.afterResponse, data, jqXHR, ajaxOpts, self);
			});

			// Time to call the passed on success handler.
			a$.act(self, self.onSuccess, data, jqXHR, ajaxOpts);
		}
	};

	ajaxOpts.complete = function () {
		// Now deal with pending requests, if such exists.
		// Pay attention that this is _not_ recursion, because
		// We're in the success handler, i.e. - async.
		self.inRequest = false;
		if (self.pendingRequests.length > 0)
			self.doRequest.apply(self, self.pendingRequests.shift());
	};

	// Inform all our skills for the preparation.
	a$.broadcast(self, 'onPrepare', ajaxOpts);

	// Call the custom provided preparation routines.
	a$.act(self, self.onPrepare, ajaxOpts);

	// And make the damn call.
	return self.connector(ajaxOpts);
};

/**
 * Build the final url, from a given servlet and array of parameters.
 * @param {string} servlet The service/servlet to be queries.
 * @param {string|array} params List of parameters to be appended to the query. Optional.
 * @return {string} A full, ready to be used URL.
 * @description The parameters passed are expected to be escaped and already paired in name=value
 * form.
 */
Communicating.prototype.buildUrl = function (servlet, params) {
	return this.serverUrl + this.addUrlParameters(servlet || '', params);
}

/**
 * 
 * @param {string} baseUrl The base part of the URL to be added parameters to, can already have parameters.
 * @param {string|array} params List of parameters to be appended to the query. Optional.
 * @return {string} The initial URL with appended parameters.
 * @description The parameters passed are expected to be escaped and already paired in name=value
 */
Communicating.prototype.addUrlParameters = function(baseUrl, params) {
	if (!params || !params.length)
		return baseUrl;
	else if (typeof params !== 'string')
		params = params.join("&") || '';
	return baseUrl +  (baseUrl.indexOf('?') > 0 ? "&" : "?") + params;
}

/** Initialize the management and most importantly - the listener's
 */
Communicating.prototype.init = function () {
	var self = this;
	a$.pass(self, Communicating, "init");
	_.each(this.listeners, function (l) {
		// Inform the listener that it has been added.
		a$.act(l, l.init, self);
	})
};

/** Add one or many listeners to the manager
 */
Communicating.prototype.addListeners = function (one) {
	var listener = one;
	if (arguments.length > 1)
		listener = arguments;
	else if (!Array.isArray(one))
		listener = [one];
	else
		listener = one;

	for (var l, i = 0, ll = listener.length; i < ll; ++i) {
		l = listener[i];
		this.listeners[l.id] = l;
	}

	return this;
};

/** Remove one listener. Can pass only the id.
 */
Communicating.prototype.removeOneListener = function (listener) {
	if (typeof listener === "object")
		listener = listener.id;

	delete this.listeners[listener];
	return this;
};

/** Remove many listeners, according to the given selector.
 * The selector(listener, manager) is invoked and on `true`
 * the listener is removed.
 */
Communicating.prototype.removeListeners = function (selector, context) {
	if (typeof selector !== 'function')
		throw {
			name: "Enumeration error",
			message: "Attempt to select-remove listeners with non-function 'selector': " + selector
		};

	var self = this;
	_.each(self.listeners, function (l, id) {
		if (selector.call(context, l, id, self))
			delete self.listeners[id];
	});

	return self;
};

/** Enumerate all listeners.
 */
Communicating.prototype.enumerateListeners = function (callback, context) {
	if (typeof callback !== 'function')
		throw {
			name: "Enumeration error",
			message: "Attempt to enumerate listeners with non-function 'selector': " + callback
		};

	var self = this;
	_.each(this.listeners, function (l, id) {
		callback.call(context, l, id, self);
	});
};

/** A listener retrieval method
 */
Communicating.prototype.getListener = function (id) {
	return this.listeners[id];
};

export default Communicating;