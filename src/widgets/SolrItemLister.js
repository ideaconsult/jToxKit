/** jToxKit - chem-informatics multi-tool-kit.
 * A generic list of items presentation widget.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved.
 *
 */

import a$ from 'as-sys';
import $ from 'jquery';

import jT from '../Core';

var htmlLink = '<a href="{{href}}" title="{{hint}}" target="{{target}}" class="{{css}}">{{value}}</a>',
	plainLink = '<span title="{{hint}}" class="{{css}}">{{value}}</span>',
	defSettings = {
		baseUrl: "",
		summaryPrimes: ["RESULTS"],
		tagDbs: {},
		onCreated: null,
		onClick: null,
		imagesRoot: "images/",
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
		}
	};

function SolrItemLister(settings) {
	a$.setup(this, defSettings, settings);

	this.baseUrl = jT.fixBaseUrl(settings.baseUrl) + "/";
	this.lookupMap = settings.lookupMap || {};
	this.target = settings.target;
	this.id = settings.id;
	if (!this.imagesRoot.match(/(\/|\\)$/))
    	this.imagesRoot += '/'
};

SolrItemLister.prototype.renderItem = function (doc) {
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
};

SolrItemLister.prototype.renderLinks = function (doc) {
	var baseUrl = this.getBaseUrl(doc),
		item = {};

	// Check if external references are provided and prepare and show them.
	if (doc.content == null) {
		item.link = baseUrl + doc.s_uuid;
		item.link_target = doc.s_uuid;
		item.footer = 
			'<a href="' + baseUrl + doc.s_uuid + '" title="Substance" target="' + doc.s_uuid + '">Material</a>' +
			'<a href="' + baseUrl + doc.s_uuid + '/structure" title="Composition" target="' + doc.s_uuid + '">Composition</a>' +
			'<a href="' + baseUrl + doc.s_uuid + '/study" title="Study" target="' + doc.s_uuid + '">Studies</a>';
		item.composition = this.renderComposition(doc, 
			'<a href="' + baseUrl + doc.s_uuid + '/structure" title="Composition" target="' + doc.s_uuid + '">&hellip;</a>').join("<br/>");
		;
	} else {
		item.link_target = "external";
		item.composition = this.renderComposition(doc);
		item.link_title = this.tagDbs[doc.dbtag_hss] && this.tagDbs[doc.dbtag_hss].title || "External database";
		item.footer = "";
		
		for (var i = 0; i < doc.content.length; ++i) {
		if (!doc.content[i].match(/^https?:\/\//))
			continue;
		if (!item.link)
			item.link = doc.content[i];

		item.footer += '<a href="' + doc.content[i] + '" target="external">' + item.link_title + '</a>&nbsp;';
		}
	}

	return item;
};
/**
 * substance
 */
 SolrItemLister.prototype.renderSubstance = function (doc) {
	var summaryhtml = $("#summary-item").html(),
		summarylist = this.buildSummary(doc),
		summaryRender = function (summarylist) { 
			return summarylist.map(function (s) { return jT.ui.formatString(summaryhtml, s)}).join("");
		},
		item = { 
			logo: this.tagDbs[doc.dbtag_hss] && this.tagDbs[doc.dbtag_hss].icon || (this.imagesRoot + "external.png"),
			link_title: this.tagDbs[doc.dbtag_hss] && this.tagDbs[doc.dbtag_hss].title || "Substance",
			link_target: "_blank",
			link: "#",
			title: (doc.publicname || doc.name) + (doc.pubname === doc.name ? "" : "  (" + doc.name + ")") 
				+ (doc.substanceType == null ? "" : (" " 
				+ (this.lookupMap[doc.substanceType] || doc.substanceType))),
			summary: summarylist.length > 0 ? summaryRender(summarylist.splice(0, this.summaryPrimes.length)) : "",
			item_id: (this.prefix || this.id || "item") + "_" + doc.s_uuid          
		};
	
	// Build the outlook of the summary item
	if (summarylist.length > 0)
		item.summary += 
			'<a href="#" class="more">more</a>' +
			'<div class="more-less" style="display:none;">' + summaryRender(summarylist) + '</div>';
	
	return jT.fillTemplate("#result-item", $.extend(item, this.renderLinks(doc)));
};

SolrItemLister.prototype.getBaseUrl = function (doc) {
	if (this.tagDbs[doc.dbtag_hss] !== undefined) {
		var url = this.tagDbs[doc.dbtag_hss].server,
			lastChar = url.substr(-1);
		return url + (lastChar != "/" ? "/substance/" : "substance/")
	} else {
		return this.baseUrl;
	}
};

SolrItemLister.prototype.renderComposition = function (doc, defValue) {
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
					se.push(jT.formatString(htmlLink, {
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

			if (entry === "" && !!defValue)
				entry = ":&nbsp;" + defValue;

			summary.push(type + " (" + map.length + ")" + entry);
		});
	}

	return summary;
};

SolrItemLister.prototype.buildSummary = function (doc) {
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
};

export default SolrItemLister;