/** jToxKit - chem-informatics multi-tool-kit.
 * A generic list of items presentation widget.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved.
 *
 */

import a$ from 'as-sys';
import $ from 'jQuery';

import jT from '../Core';

var htmlLink = '<a href="{{href}}" title="{{hint}}" target="{{target}}" class="{{css}}">{{value}}</a>',
	plainLink = '<span title="{{hint}}" class="{{css}}">{{value}}</span>';

function ItemListing(settings) {
	settings.baseUrl = jT.fixBaseUrl(settings.baseUrl) + "/";

	a$.setup(this, settings);

	this.lookupMap = settings.lookupMap || {};
	this.target = settings.target;
	this.id = settings.id;
};

ItemListing.prototype = {
	baseUrl: "",
	summaryPrimes: ["RESULTS"],
	tagDbs: {},
	onCreated: null,
	onClick: null,
	summaryRenderers: {
		"RESULTS": function (val, topic) {
			var self = this;
			return val.map(function (study) {
				return study.split(".").map(function (one) {
					return self.lookupMap[one] || one;
				}).join(".");
			});
		},
		"REFOWNERS": function (val, topic) {
			return {
				'topic': "Study Providers",
				'content': val.map(function (ref) {
					return jT.formatString(htmlLink, {
						href: "#",
						hint: "Freetext search",
						target: "_self",
						value: ref,
						css: "freetext_selector"
					});
				})
			};
		},
		"REFS": function (val, topic) {
			return {
				'topic': "References",
				'content': val.map(function (ref) {
					var link = ref.match(/^doi:(.+)$/);
					link = link != null ? "https://www.doi.org/" + link[1] : ref;
					return jT.formatString(
						link.match(/^https?:\/\//) ? htmlLink : plainLink, {
							href: link,
							hint: "External reference",
							target: "ref",
							value: ref
						}
					);
				})
			}
		}
	},

	renderItem: function (doc) {
		var self = this,
			el = $(this.renderSubstance(doc));

		if (!el.length)
			return null;

		$(this.target).append(el);

		if (typeof this.onClick === "function")
			$("a.command", el[0]).on("click", function (e) {
				self.onClick.call(el[0], e, doc, self);
			});

		if (typeof this.onCreated === 'function')
			this.onCreated.call(el, doc, this);

		$("a.more", el[0]).on("click", function (e) {
			e.preventDefault();
			e.stopPropagation();
			var $this = $(this),
				$div = $(".more-less", $this.parent()[0]);

			if ($div.is(':visible')) {
				$div.hide();
				$this.text('more');
			} else {
				$div.show();
				$this.text('less');
			}

			return false;
		});

		return null;
	},

	/**
	 * substance
	 */
	renderSubstance: function (doc) {
		var summaryhtml = $("#summary-item").html(),
			summarylist = this.buildSummary(doc),
			baseUrl = this.getBaseUrl(doc),
			summaryRender = function (summarylist) {
				return summarylist.map(function (s) {
					return jT.ui.formatString(summaryhtml, s)
				}).join("");
			}
		var item = {
			logo: this.tagDbs[doc.dbtag_hss] && this.tagDbs[doc.dbtag_hss].icon || "images/logo.png",
			link: "#",
			href: "#",
			title: (doc.publicname || doc.name) + (doc.pubname === doc.name ? "" : "  (" + doc.name + ")") +
				(doc.substanceType == null ? "" : (" " +
					(this.lookupMap[doc.substanceType] || doc.substanceType)
				)),
			composition: this.renderComposition(doc,
				'<a href="' + baseUrl + doc.s_uuid + '/structure" title="Composition" target="' + doc.s_uuid + '">&hellip;</a>'
			).join("<br/>"),
			summary: summarylist.length > 0 ? summaryRender(summarylist.splice(0, this.summaryPrimes.length)) : "",
			item_id: (this.prefix || this.id || "item") + "_" + doc.s_uuid,
			footer: '<a href="' + baseUrl + doc.s_uuid + '" title="Substance" target="' + doc.s_uuid + '">Material</a>' +
				'<a href="' + baseUrl + doc.s_uuid + '/structure" title="Composition" target="' + doc.s_uuid + '">Composition</a>' +
				'<a href="' + baseUrl + doc.s_uuid + '/study" title="Study" target="' + doc.s_uuid + '">Studies</a>'
		};

		// Build the outlook of the summary item
		if (summarylist.length > 0)
			item.summary +=
			'<a href="#" class="more">more</a>' +
			'<div class="more-less" style="display:none;">' + summaryRender(summarylist) + '</div>';

		// Check if external references are provided and prepare and show them.
		if (doc.content == null) {
			item.link = baseUrl + doc.s_uuid;
			item.href = item.link + "/study";
			item.href_title = "Study";
			item.href_target = doc.s_uuid;
		} else {
			var external = "External database";

			if (doc.owner_name && doc.owner_name.lastIndexOf("caNano", 0) === 0) {
				item.logo = "images/canano.jpg";
				item.href_title = "caNanoLab: " + item.link;
				item.href_target = external = "caNanoLab";
				item.footer = '';
			} else {
				item.logo = "images/external.png";
				item.href_title = "External: " + item.link;
				item.href_target = "external";
			}

			if (doc.content.length > 0) {
				item.link = doc.content[0];

				for (var i = 0, l = doc.content.length; i < l; i++)
					item.footer += '<a href="' + doc.content[i] + '" target="external">' + external + '</a>';
			}
		}

		return jT.ui.fillTemplate("#result-item", item);
	},

	getBaseUrl: function (doc) {
		if (this.tagDbs[doc.dbtag_hss] !== undefined) {
			var url = this.tagDbs[doc.dbtag_hss].server,
				lastChar = url.substr(-1);
			return url + (lastChar != "/" ? "/substance/" : "substance/")
		} else {
			return this.baseUrl;
		}
	},

	renderComposition: function (doc, defValue) {
		var summary = [],
			composition = doc._extended_ && doc._extended_.composition;

		if (!!composition) {
			var cmap = {};
			_.each(composition, function (c) {
				var ce = cmap[c.component_s],
					se = [];
				if (ce === undefined)
					cmap[c.component_s] = ce = [];

				_.each(c, function (v, k) {
					var m = k.match(/^(\w+)_[shd]+$/);
					k = m && m[1] || k;
					if (!k.match(/type|id|component/))
						se.push(jT.ui.formatString(htmlLink, {
							href: "#",
							hint: "Freetext search on '" + k + "'",
							target: "_self",
							value: v,
							css: "freetext_selector"
						}));
				});

				ce.push(se.join(", "));
			});

			_.each(cmap, function (map, type) {
				var entry = "";
				for (var i = 0; i < map.length; ++i) {
					if (map[i] == "")
						continue;

					entry += (i == 0) ? ": " : "; ";
					if (map.length > 1)
						entry += "<strong>[" + (i + 1) + "]</strong>&nbsp;";
					entry += map[i];
				}

				if (entry === "")
					entry = ":&nbsp;" + defValue;

				entry = type + " (" + map.length + ")" + entry;

				summary.push(entry);
			});
		}

		return summary;
	},

	buildSummary: function (doc) {
		var self = this,
			items = [];

		_.each(doc, function (val, key) {
			var name = key.match(/^SUMMARY\.([^_]+)_?[hsd]*$/);
			if (!name)
				return;

			name = name[1];
			var render = (self.summaryRenderers[name] || self.summaryRenderers._),
				item = typeof render === "function" ? render.call(self, val, name) : val;

			if (!item)
				return;

			if (typeof item !== "object" || Array.isArray(item))
				item = {
					'topic': name.toLowerCase(),
					'values': item
				};
			else if (item.topic == null)
				item.topic = name.toLowerCase();

			if (!item.content)
				item.content = Array.isArray(item.values) ? item.values.join(", ") : item.values.toString();

			var primeIdx = self.summaryPrimes.indexOf(name);
			if (primeIdx > -1 && primeIdx < items.length)
				items.splice(primeIdx, 0, item);
			else
				items.push(item);
		});

		return items;
	}
}; // prototype

export default ItemListing;
