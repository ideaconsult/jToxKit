/** jToxKit - chem-informatics multi-tool-kit.
 * Core utilities.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved.
 */

import _ from 'lodash';
import $ from 'jquery';

// Define this as a main object to put everything in
export default {
	version: "{{VERSION}}",

	/* Fix the baseUrl - remove the trailing slash if any
	 */
	fixBaseUrl(url) {
		if (url != null && url.charAt(url.length - 1) == '/')
			url = url.slice(0, -1);
		return url;
	},

	/* Deduce the baseUrl from a given Url - either if it is full url, of fallback to jToxKit's if it is local
	Passed is the first "non-base" component of the path...
	*/
	grabBaseUrl(url, key) {
		if (url != null) {
			if (!!key)
				return url.slice(0, url.indexOf("/" + key));
			else if (url.indexOf('http') == 0)
				return this.formBaseUrl(this.parseURL(url));
		}

		return this.settings.baseUrl;
	},

	// form the "default" baseUrl if no other is supplied
	formBaseUrl(url) {
		var burl = !!url.host ? url.protocol + "://" + url.host + (url.port.length > 0 ? ":" + url.port : '') + '/' + url.segments[0] : null;
		console && console.log("Deduced base URL: " + burl + " (from: " + url.source + ")");
		return burl;
	},

	copyToClipboard(text, prompt) {
		if (!prompt) {
			prompt = "Press Ctrl-C (Command-C) to copy and then Enter.";
		}
		window.prompt(prompt, text);
	},

	/* formats a string, replacing {{number | property}} in it with the corresponding value in the arguments
	 */
	formatString: function (str, info, def) {
		var pieces = str.split(/\{\{([^}]+)\}\}/),
			pl = pieces.length,
			out = "";

		for (var i = 0;; ++i) {
			out += pieces[i++];
			if (i >= pl)
				break;

			var f = _.get(info, pieces[i]);
			if (f != null) // i.e. we've found it.
				out += f;
			else if (typeof def === 'function') // not found, but we have default function.
				out += def(pieces[i]);
			else if (typeof def === 'string') // not found, but default string.
				out += def;
			else // we have nothing, so - put nothing.
				out += "";
		}

		return out;
	},

	formatNumber(num, prec) {
		if (prec < 1)
			prec = parseInt(1.0 / prec);
		return Math.round(num * prec) / prec;
	},

	formatUnits(str) {
		// change the exponential
		return str.toString()
			.replace(/(^|\W)u(\w)/g, '$1&#x00B5;$2')
			.replace(/\^\(?([\-\d]+)\)?/g, '<sup>$1</sup>')
			.replace(/ /g, "&nbsp;")
	},

	addParameter(url, param) {
		return url + (("&?".indexOf(url.charAt(url.length - 1)) == -1) ? (url.indexOf('?') > 0 ? "&" : "?") : '') + param;
	},

	removeParameter(url, param) {
		return url.replace(new RegExp('(.*\?.*)(' + param + '=[^\&\s$]*\&?)(.*)'), '$1$3');
	},

	parseURL: function (url) {
		var a = document.createElement('a');
		a.href = url;
		return {
			source: url,
			protocol: a.protocol.replace(':', ''),
			host: a.hostname,
			port: a.port,
			query: a.search,
			params: (function () {
				var ret = {},
					seg = a.search.replace(/^\?/, '').split('&'),
					len = seg.length,
					i = 0,
					s, v, arr;
				for (; i < len; i++) {
					if (!seg[i]) {
						continue;
					}
					s = seg[i].split('=');
					v = (s.length > 1) ? decodeURIComponent(s[1].replace(/\+/g, " ")) : '';
					if (s[0].indexOf('[]') == s[0].length - 2) {
						arr = ret[s[0].slice(0, -2)];
						if (arr === undefined)
							ret[s[0].slice(0, -2)] = [v];
						else
							arr.push(v);
					} else
						ret[s[0]] = v;
				}
				return ret;
			})(),
			file: (a.pathname.match(/\/([^\/?#]+)$/i) || [, ''])[1],
			hash: a.hash.replace('#', ''),
			path: a.pathname.replace(/^([^\/])/, '/$1'),
			relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [, ''])[1],
			segments: a.pathname.replace(/^\//, '').split('/')
		};
	},

	modifyURL(url, name, value) {
		var a = document.createElement('a'),
			str = !!value ? name + "=" + encodeURIComponent(value) : "",
			mbs, q;

		a.href = url;
		q = a.search;

		mbs = q.match(new RegExp(name + "=[\\S^&]+"))

		if (!!mbs)
			q = q.replace(mbs[0], str);
		else if (!str)
			return;
		else if (q.charAt(0) == '?')
			q = "?" + str;
		else
			q += (q.slice(-1) == "&" ? "" : "&") + str;

		a.search = q;
		return a.href;
	},

	escapeHTML: function (str) {
		var map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return str.replace(/[&<>"']/g, function (m) {
			return map[m];
		});
	},

	/** Gets a template with given selector and replaces the designated
	 * {{placeholders}} from the provided `info`.
	 */
	fillTemplate(selector, info) {
		return $(this.formatString($(selector).html(), info).replace(/(<img(\s+.*)?)(\s+jt-src=")/, "$1 src=\""));
	},

	fillTree(root, info) {
		$('.data-field', root).each(function () {
			var me$ = $(this),
				val = _.get(info, me$.data('field'));
			if (val !== undefined)
				me$.html(val);
		});
	},

	joinDeep(data, field, sep) {
		return _.map(data, function (val) { val[field] }).join(sep);
	}	
};
