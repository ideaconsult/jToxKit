/** jToxKit - chem-informatics multi-tool-kit.
 * Base for widgets and UI-related stuff
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2017-2019, IDEAConsult Ltd. All rights reserved.
 */

import _ from 'lodash';
import jT from "./Core";

export default {
	rootSettings: {}, // These can be modified from the URL string itself.
	kitsMap: {}, // all found kits are put here.
	templateRoot: null,
	templates: {},

	callId: 0,

	// initializes one kit, based on the kit name passed, either as params, or found within data-XXX parameters of the element
	initKit: function (element) {
		var self = this,
			dataParams = element.data(),
			kit = dataParams.kit,
			topSettings = $.extend(true, {}, self.rootSettings),
			parent = null;

		// we need to traverse up, to collect some parent's settings...
		_.each(element.parents('.jtox-kit,.jtox-widget').toArray().reverse(), function (el) {
			parent = self.getInstance(el);
			if (parent != null)
				topSettings = $.extend(true, topSettings, parent);
		});

		// make us ultimate parent of all
		if (!parent)
			parent = self;

		dataParams = $.extend(true, topSettings, dataParams);
		dataParams.baseUrl = self.fixBaseUrl(dataParams.baseUrl);
		dataParams.target = element;

		if (dataParams.id === undefined)
			dataParams.id = element.attr('id');

		// the real initialization function
		var realInit = function (params) {
			if (!kit)
				return null;

			// add jTox if it is missing AND there is not existing object/function with passed name. We can initialize ketcher and others like this too.
			var fn = window[kit];
			if (typeof fn !== 'function') {
				kit = kit.charAt(0).toUpperCase() + kit.slice(1);
				fn = jT.kit[kit] || jT.widget[kit] || jT[kit];
			}

			var obj = null;
			if (typeof fn === 'function')
				obj = new fn(params);
			else if (typeof fn === "object" && typeof fn.init === "function")
				obj = fn.init(params);

			if (obj != null) {
				if (fn.prototype.__kits === undefined)
					fn.prototype.__kits = [];
				fn.prototype.__kits.push(obj);
				obj.parentKit = parent;

				if (dataParams.id !== null)
					self.kitsMap[dataParams.id] = obj;
			} else
				console.log("jToxError: trying to initialize unexistent jTox kit: " + kit);

			return obj;
		};

		// first, get the configuration, if such is passed
		if (dataParams.configFile != null) {
			// we'll use a trick here so the baseUrl parameters set so far to take account... thus passing 'fake' kit instance
			// as the first parameter of jT.call();
			$.ajax({
				settings: "GET",
				url: dataParams.configFile
			}, function (config) {
				if (!!config)
					$.extend(true, dataParams, config);
				element.data('jtKit', realInit(dataParams));
			});
		} else {
			if (typeof dataParams.configuration === "string" && !!window[dataParams.configuration]) {
				var config = window[dataParams.configuration];
				$.extend(true, dataParams, (typeof config === 'function' ? config.call(kit, dataParams, kit) : config));
			}

			var theKit = realInit(dataParams);
			element.data('jtKit', theKit);

			return theKit;
		}
	},

	// the jToxKit initialization routine, which scans all elements, marked as 'jtox-kit' and initializes them
	initialize: function (root) {
		var self = this;

		if (!root) {
			self.initTemplates();

			// make this handler for UUID copying. Once here - it's live, so it works for all tables in the future
			$(document).on('click', '.jtox-kit span.ui-icon-copy', function () {
				this.copyToClipboard($(this).data('uuid'));
				return false;
			});
			// install the click handler for fold / unfold
			$(document).on('click', '.jtox-foldable>.title', function (e) {
				$(this).parent().toggleClass('folded');
			});
			// install diagram zooming handlers
			$(document).on('click', '.jtox-diagram span.ui-icon', function () {
				$(this).toggleClass('ui-icon-zoomin').toggleClass('ui-icon-zoomout');
				$('img', this.parentNode).toggleClass('jtox-smalldiagram');
			});

			// scan the query parameter for settings
			var url = this.parseURL(document.location),
				queryParams = url.params;

			if (!self.rootSettings.baseUrl)
				queryParams.baseUrl = self.formBaseUrl(url);
			else if (!!queryParams.baseUrl)
				queryParams.baseUrl = self.fixBaseUrl(queryParams.baseUrl);

			self.rootSettings = $.extend(true, self.rootSettings, queryParams); // merge with defaults
			self.fullUrl = url;
			root = document;
		}

		// now scan all insertion divs
		var fnInit = function () {
			var me$ = $(this);
			if (!me$.data('manualInit')) {
				var theKit = self.initKit(me$),
					bindKit = me$.data('jtoxBind');
				if (!theKit)
					console.log("Referring unknown widget: " + me$.data('kit'))
				else if (me$.hasClass('jtox-widget') && bindKit != null) {
					if (!self.kitsMap[bindKit])
						console.log("'" + me$.attr('id') + "' is binding to unknown kit: " + bindKit);
					else
						self.kitsMap[bindKit].manager.addListeners(theKit);
				}
			}
		};

		$('.jtox-kit', root).each(fnInit);
		$('.jtox-widget', root).each(fnInit);
	},

	getInstance: function (element) {
		if (typeof element !== "string")
			return $(element).data('jtKit');
		else if (this.kitsMap[element] !== undefined)
			return this.kitsMap[element];
		else
			return $("#" + element).data('jtKit');
	},

	attachKit: function (element, kit) {
		return $(element).data('jtKit', kit);
	},

	parentKit: function (name, element) {
		var self = this;
		var query = null;
		if (typeof name == 'string')
			name = window[name];
		$(element).parents('.jtox-kit').each(function () {
			var kit = self.getInstance(this);
			if (!kit || !!query)
				return;
			if (!name || kit instanceof name)
				query = kit;
		});

		return query;
	},

	initTemplates: function () {
		var self = this;

		var root = $('.jtox-template')[0];
		if (!root) {
			root = document.createElement('div');
			root.className = 'jtox-template';
			document.body.appendChild(root);
		}

		var html = root.innerHTML;
		for (var t in self.templates) {
			html += self.templates[t];
		}

		root.innerHTML = html;
		self.templateRoot = root;
	},

	insertTool: function (name, root) {
		var html = this.tools[name];
		if (html != null) {
			root.innerHTML = html;
			this.init(root); // since we're pasting as HTML - we need to make re-traverse and initiazaltion of possible jTox kits.
		}
		return root;
	},

	installHandlers: function (kit, root) {
		if (root == null)
			root = kit.rootElement;

		jT.$('.jtox-handler', root).each(function () {
			var name = jT.$(this).data('handler');
			var handler = null;
			if (kit.settings.configuration != null && kit.settings.configuration.handlers != null)
				handler = kit.settings.configuration.handlers[name];
			handler = handler || window[name];

			if (!handler)
				console.log("jToxQuery: referring unknown handler: " + name);
			else if (this.tagName == "INPUT" || this.tagName == "SELECT" || this.tagName == "TEXTAREA")
				jT.$(this).on('change', handler).on('keydown', jT.enterBlur);
			else // all the rest respond on click
				jT.$(this).on('click', handler);
		});
	}
};
