/** jToxKit - chem-informatics multi-tool-kit.
 * The combined, begamoth kit providing full faceted search capabilites.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2017-2019, IDEAConsult Ltd. All rights reserved.
 */

(function (Solr, a$, $, jT) {

	var mainLookupMap = {},
		uiConfiguration = {},
		defaultSettings = {
			servlet: "select",
			multipleSelection: true,
			keepAllFacets: true,
			connector: $.ajax,
			onPrepare: function (settings) {
				var qidx = settings.url.indexOf("?");

				if (this.proxyUrl) {
					settings.data = {
						query: settings.url.substr(qidx + 1)
					};
					settings.url = this.proxyUrl;
					settings.type = settings.method = 'POST';
				} else {
					settings.url += (qidx < 0 ? "?" : "&") + "wt=json";
				}
			},
			topSpacing: 10,
			nestingField: "type_s",
			nestingRules: {
				"composition": {
					parent: "substance",
					limit: 100
				},
				"study": {
					parent: "substance",
					limit: 10000
				},
				"params": {
					parent: "study",
					limit: 10000
				},
				"conditions": {
					parent: "study",
					limit: 10000
				}
			},
			exportMaxRows: 999999, //2147483647
			exportTypes: [],
			exportLevels: {},
			exportSolrDefaults: [
				"facet=false",
				"echoParams=none"
			],
			listingFields: [],
			facets: [],
			summaryRenderers: {}
		},

		uiUpdateTimer = null,
		uiUpdate = function () {
			if (uiUpdateTimer != null)
				clearTimeout(uiUpdateTimer);
			uiUpdateTimer = setTimeout(function () {
				var state = jT.modifyURL(window.location.href, "ui", encodeURIComponent(JSON.stringify(uiConfiguration)));

				if (!!state)
					window.history.pushState({
						query: window.location.search
					}, document.title, state);
				uiUpdateTimer = null;
			}, 1000);
		},

		tagRender = function (tag) {
			var view, title = view = tag.title.replace(/^\"(.+)\"$/, "$1");

			title = view.replace(/^caNanoLab\./, "").replace(/^http\:\/\/dx\.doi\.org/, "");
			title = (mainLookupMap[title] || title).replace("NPO_", "").replace(" nanoparticle", "");

			var aux$ = $('<span/>').html(tag.count || 0);
			if (typeof tag.onAux === 'function')
				aux$.click(tag.onAux);

			var el$ = $('<li/>')
				.append($('<a href="#" class="tag" title="' + view + " " + (tag.hint || "") + ((title != view) ? ' [' + view + ']' : '') + '">' + title + '</a>')
					.append(aux$)
				);

			if (typeof tag.onMain === 'function')
				el$.click(tag.onMain);
			if (tag.color)
				el$.addClass(tag.color);

			return el$;
		},

		tagInit = function (manager) {
			jT.Tagger.prototype.init.call(this, manager);
			manager.getListener("current").registerWidget(this);
		},

		tagsUpdated = function (total) {
			var hdr = this.getHeaderText();
			hdr.textContent = jT.updateCounter(hdr.textContent, total);
			a$.act(this, this.header.data("refreshPanel"));

			var ui = uiConfiguration[this.id] || {};
			ui.values = this.getValues();
			uiConfiguration[this.id] = ui;
			uiUpdate();
		},

		toggleAggregate = function (el) {
			var option = el.value.toUpperCase() == "OR",
				pars = this.getValues();

			this.clearValues();
			this.aggregate = !option;
			el.value = option ? "AND" : "OR";
			for (var i = 0; i < pars.length; ++i)
				this.addValue(pars[i]);
			this.doRequest();

			var ui = uiConfiguration[this.id] || {};
			ui.aggregate = !option;
			uiConfiguration[this.id] = ui;
			uiUpdate();
		};

	jT.kit.FacetedSearch = function (settings) {
		this.id = null;
		_.merge(this, defaultSettings, settings);
		this.serverUrl = this.solrUrl;

		if (typeof this.lookupMap === "string")
			this.lookupMap = window[this.lookupMap];

		if (this.lookupMap == null)
			this.lookupMap = {};
		mainLookupMap = this.lookupMap;

		$(settings.target).html(jT.templates['faceted-search-kit']);
		delete this.target;

		var uiConf = jT.parseURL(window.location.href).params['ui'];
		if (uiConf != null)
			uiConfiguration = JSON.parse(decodeURIComponent(uiConf));

		this.initDom();
		this.initComm();
		this.initExport();
	};

	jT.kit.FacetedSearch.prototype = _.extend(jT.kit.FacetedSearch.prototype, {
		initDom: function () {
			// Now instantiate and things around it.
			this.accordion = $("#accordion");
			this.accordion.accordion({
				heightStyle: "content",
				collapsible: true,
				animate: 200,
				active: false,
				activate: function (event, ui) {
					if (!!ui.newPanel && !!ui.newPanel[0]) {
						var header = ui.newHeader[0],
							panel = ui.newPanel[0],
							filter = $("input.widget-filter", panel),
							widgetFilterScroll = filter.outerHeight(true),
							refreshPanel;

						if (!$("span.ui-icon-search", header).length) {
							refreshPanel = function () {
								if (panel.scrollHeight > panel.clientHeight || filter.val() != "" || $(header).hasClass("nested-tab")) {
									$(panel).scrollTop(widgetFilterScroll);
									filter.show()
									$("span.ui-icon-search", header).removeClass("unused");
								} else {
									filter.hide();
									$("span.ui-icon-search", header).addClass("unused");
								}
							};

							ui.newPanel.data("refreshPanel", refreshPanel);
							ui.newHeader.data("refreshPanel", refreshPanel);
							ui.newHeader.append($('<span class="ui-icon ui-icon-search"></span>').on("click", function (e) {
								ui.newPanel.animate({
									scrollTop: ui.newPanel.scrollTop() > 0 ? 0 : widgetFilterScroll
								}, 300, function () {
									if (ui.newPanel.scrollTop() > 0)
										$("input.widget-filter", panel).blur();
									else
										$("input.widget-filter", panel).focus();
								});

								e.stopPropagation();
								e.preventDefault();
							}));
						} else
							refreshPanel = ui.newPanel.data("refreshPanel");

						filter.val("");
						refreshPanel();
					}
				}
			});

			$(document).on("click", "ul.tag-group", function (e) {
				$(this).toggleClass("folded");
				$(this).parents(".widget-root").data("refreshPanel").call();
			});

			// ... and prepare the actual filtering funtion.
			$(document).on('keyup', "#accordion input.widget-filter", function (e) {
				var needle = $(this).val().toLowerCase(),
					div = $(this).parents('div.widget-root')[0],
					cnt;

				if ((e.keyCode || e.which) == 27)
					$(this).val(needle = "");

				if (needle == "")
					$('li,ul', div).show();
				else {
					$('li>a', div).each(function () {
						var fold = $(this).closest("ul.tag-group"),
							tag = $(this).parent();
						cnt = fold.data("hidden") || 0;
						if (tag.hasClass("category"))
						;
						else if (this.title.toLowerCase().indexOf(needle) >= 0 || this.innerText.toLowerCase().indexOf(needle) >= 0)
							tag.show();
						else {
							tag.hide();
							++cnt;
						}

						if (!!fold.length && !!cnt)
							fold.data("hidden", cnt);
					});
				}

				// now check if some of the boxes need to be hidden.
				$("ul.tag-group", div).each(function () {
					var me = $(this);

					cnt = parseInt(me.data("hidden")) || 0;
					if (me.children().length > cnt + 1)
						me.show().removeClass("folded");
					else
						me.hide().addClass("folded");

					me.data("hidden", null);
				});
			});

			var resDiv = $("#result-tabs"),
				resSize,
				self = this;

			resDiv.tabs({});

			$("#accordion-resizer").resizable({
				minWidth: 150,
				maxWidth: 450,
				grid: [10, 10],
				handles: "e",
				start: function (e, ui) {
					resSize = {
						width: resDiv.width(),
						height: resDiv.height()
					};
				},
				resize: function (e, ui) {
					self.accordion.accordion("refresh");
					$('#query-sticky-wrapper').width(self.accordion.width());
					$(this).width(function (i, w) {
						return w - 7;
					}); // minus the total padding of parent elements
					resDiv.width(resSize.width + ui.originalSize.width - ui.size.width);
				}
			});

			$(".query-left#query").sticky({
				topSpacing: this.topSpacing,
				widthFromWrapper: false
			});
		},

		/** The actual widget and communication initialization routine!
		 */
		initComm: function () {
			var Manager, Basket,
				PivotWidget = a$(Solr.Eventing, Solr.Spying, Solr.Pivoting, jT.Pivoter, jT.Ranger),
				TagWidget = a$(Solr.Eventing, Solr.Faceting, jT.AccordionExpander, jT.Tagger, jT.Switcher);

			this.manager = Manager = new(a$(CommBase.Communicating, Solr.Configuring, Solr.QueryingJson, Solr.NestedAdapter))(this);

			Manager.addListeners(new jT.widget.SolrResult($.extend(true, {
				id: 'result',
				target: $('#docs'),
				itemId: "s_uuid",
				nestLevel: "composition",
				onClick: function (e, doc, exp, widget) {
					if (Basket.findItem(doc.s_uuid) < 0) {
						Basket.addItem(doc);
						var s = "",
							jel = $('a[href="#basket_tab"]');

						jel.html(jT.updateCounter(jel.html(), Basket.length));

						Basket.enumerateItems(function (d) {
							s += d.s_uuid + ";";
						});
						if (!!(s = jT.modifyURL(window.location.href, "basket", s)))
							window.history.pushState({
								query: window.location.search
							}, document.title, s);

						$("footer", this).toggleClass("add none");
					}
				},
				onCreated: function (doc) {
					$("footer", this).addClass("add");
				}
			}, this)));

			Manager.addListeners(new(jT.widget.SolrPaging)({
				id: 'pager',
				target: $('#pager'),
				prevLabel: '&lt;',
				nextLabel: '&gt;',
				innerWindow: 1,
				renderHeader: function (perPage, offset, total) {
					$('#pager-header').html('<span>' +
						'displaying ' + Math.min(total, offset + 1) +
						' to ' +
						Math.min(total, offset + perPage) +
						' of ' + total +
						'</span>');
				}
			}));

			// Now the actual initialization of facet widgets
			for (var i = 0, fl = this.facets.length; i < fl; ++i) {
				var f = this.facets[i],
					ui = uiConfiguration[f.id],
					w = new TagWidget($.extend({
						target: this.accordion,
						expansionTemplate: "#tab-topcategory",
						subtarget: "ul",
						runMethod: toggleAggregate,
						multivalue: this.multipleSelection,
						aggregate: ui === undefined || ui.aggregate === undefined ? this.aggregateFacets : ui.aggregate,
						exclusion: this.multipleSelection || this.keepAllFacets,
						useJson: true,
						renderItem: tagRender,
						onUpdated: tagsUpdated,
						nesting: "type_s:substance",
						domain: {
							type: "parent",
							"which": "type_s:substance"
						},
						classes: f.color
					}, f))

				w.init = tagInit;

				w.afterResponse = function (data) {
					this.populate(this.getFacetCounts(data.facets));
				};

				$(w.target).closest('div.widget-content').find('input.switcher').val(w.aggregate ? "OR" : "AND");

				Manager.addListeners(w);
			};

			// ... add the mighty pivot widget.
			Manager.addListeners(new PivotWidget({
				id: "studies",
				target: this.accordion,
				subtarget: "ul",
				expansionTemplate: "#tab-topcategory",
				before: "#cell_header",
				field: "loValue_d",
				lookupMap: this.lookupMap,
				pivot: this.pivot,
				statistics: {
					'min': "min(loValue_d)",
					'max': "max(loValue_d)",
					'avg': "avg(loValue_d)"
				},
				slidersTarget: $("#sliders"),
				multivalue: this.multipleSelection,
				aggregate: this.aggregateFacets,
				exclusion: this.multipleSelection || this.keepAllFacets,
				useJson: true,
				renderTag: tagRender,
				classes: "dynamic-tab",
				nesting: "type_s:substance",
				domain: {
					type: "parent",
					"which": "type_s:substance"
				}
			}));

			// ... And finally the current-selection one, and ...
			Manager.addListeners(new jT.SolrQueryReporter({
				id: 'current',
				target: $('#selection'),
				renderItem: tagRender,
				useJson: true
			}));

			// Now add the basket.
			this.basket = Basket = new(a$(jT.Populating, jT.SolrItemLister))($.extend(true, {
				id: 'basket',
				target: $('#basket-docs'),
				summaryRenderers: this.summaryRenderers,
				itemId: "s_uuid",
				onClick: function (e, doc) {
					if (Basket.eraseItem(doc.s_uuid) === false) {
						console.log("Trying to remove from basket an inexistent entry: " + JSON.stringify(doc));
						return;
					}

					$(this).remove();
					var s = "",
						jel = $('a[href="#basket_tab"]'),
						resItem = $("#result_" + doc.s_uuid);

					jel.html(jT.updateCounter(jel.html(), Basket.length));
					Basket.enumerateItems(function (d) {
						s += d.s_uuid + ";";
					});
					if (!!(s = jT.modifyURL(window.location.href, "basket", s)))
						window.history.pushState({
							query: window.location.search
						}, document.title, s);

					if (resItem.length > 0)
						$("footer", resItem[0]).toggleClass("add none");
				},
				onCreated: function (doc) {
					$("footer", this).addClass("remove");
				}
			}, this));

			a$.act(this, this.onPreInit, Manager);
			Manager.init();

			// Scan the ui-persistency values
			for (var fid in uiConfiguration) {
				var vals = uiConfiguration[fid].values,
					w = Manager.getListener(fid);
				_.each(vals, function (v) {
					w.addValue(v)
				});
			}

			Manager.addListeners(jT.initKit($("#log-ui")));

			// now get the search parameters passed via URL
			Manager.doRequest();
		},

		updateButton: function (form) {
			b = $("button", form);

			if (!$(form).find('input[name=export_dataset]').val()) {
				b.button("option", "label", "No target dataset selected...");
			} else if (!this.manager.getParameter("json.filter").length && form.export_dataset.value == "filtered") {
				b.button("disable").button("option", "label", "No filters selected...");
			} else if ($(form).find('input[name=export_dataset]').val()) {
				b.button("enable").button("option", "label", "Download " + $("#export_dataset :radio:checked + label").text().toLowerCase() + " as " + $(form.export_format).data('name').toUpperCase());
			}

			return b;
		},

		initExport: function () {
			// Prepare the export tab
			var self = this;

			this.prepareFormats();
			this.prepareTypes();

			$("#export_dataset").buttonset();
			$("#export_type").buttonset();
			$("#export_dataset input").on("change", function (e) {
				self.updateButton(this.form);
			});
			$("#export_tab button").button({
				disabled: true
			});

			$("#export_tab form").on("submit", function (e) {
				var form = this,
					mime = form.export_format.value,
					mime = mime.substr(mime.indexOf("/") + 1),
					exFormat = self.exportFormats[$('.data_formats .selected').data('index')],
					exType = self.exportTypes[$(form).find('input[name=export_type]:checked').data('index')],
					server = exType.server || exFormat.server,
					fq = self.manager.getParameter("json.filter"),
					params = [],
					inners = [],
					selectedIds = null,
					makeParameter = function (par, name) {
						var np = {
							value: par.value,
							name: name || par.name
						};

						// Check if we have a different level and the field in the filter is subject to parenting.
						if (par.domain && par.domain.type == 'parent') {
							if (!exType.exportLevel)
								np.domain = par.domain;
							else {
								var level = self.exportLevels[exType.exportLevel];
								if (!par.value || !!par.value.match(level.fieldsRegExp))
									np.domain = level.domain;
							}
						}

						return np;
					},
					prepareFilters = function () {
						for (var i = 0, vl = fq.length; i < vl; i++) {
							var par = fq[i];

							params.push(Solr.stringifyParameter(makeParameter(par, 'fq')));
							inners.push(Solr.stringifyValue(par).replace(/"|\\/g, "\\$&"));
						}

						params.push(Solr.stringifyParameter(makeParameter(self.manager.getParameter('q'))) || '*:*');
					};

				if (form.export_dataset.value != "filtered") {
					selectedIds = [];

					self.basket.enumerateItems(function (d) {
						selectedIds.push(d.s_uuid);
					});
				}

				// Now we have all the filtering parameters in the `params`.
				if (server == 'ambitUrl') {
					// If we already have the selected Ids - we don't even need to bother calling Solr.
					if (!!selectedIds) {
						form.search.value = selectedIds.join(" ");
						form.action = self['ambitUrl'] + 'query/substance/study/uuid?media=' + encodeURIComponent(form.export_format.value);
					} else {
						prepareFilters();
						params.push('wt=json', 'fl=s_uuid_hs');
						$.ajax({
							url: self.serverUrl + 'select?' + params.join('&'),
							async: false,
							dataType: "json",
							success: function (data) {
								var ids = [];
								$.each(data.response.docs, function (index, value) {
									ids.push(value.s_uuid_hs);
								});

								form.search.value = ids.join(" ");
								form.action = self['ambitUrl'] + 'query/substance/study/uuid?media=' + encodeURIComponent(form.export_format.value);
							}
						});
					}
				} else {
					// We're strictly in Solr mode - prepare the filters and add the selecteds (if they exists)
					prepareFilters();
					if (!!selectedIds)
						params.push('fq=' + encodeURIComponent((exType.exportLevel == "study" ? 's_uuid_s' : 's_uuid_hs') + ":(" + selectedIds.join(" ") + ")"));

					// Fill the rest of the Solr parameters for the real Solr call.
					Array.prototype.push.apply(params, self.exportSolrDefaults);
					if (!!exType.extraParams)
						Array.prototype.push.apply(params, exType.extraParams);

					params.push('fl=' + encodeURIComponent(exType.fields.replace(
						"{{filter}}",
						inners.length > 1 ? '(' + inners.join(' AND ') + ')' : inners.length > 0 ? inners[0] : exType.defaultFilter
					)));
					params.push('rows=' + self.exportMaxRows);
					//tsv is now handled via proxy , which reads the Solr json format as is
					if (mime == "tsv")
						//params.push("wt=csv", "csv.separator=%09");
						params.push("wt=json", "json2tsv=true");
					else
						params.push('wt=' + mime);

					form.action = self[server] + "select?" + params.join('&');
					//console.log(form.action);
				}

				return true;
			});

			$("#result-tabs").tabs({
				activate: function (e, ui) {
					if (ui.newPanel[0].id == 'export_tab') {
						if (self.basket.length) {
							$('input#selected_data').prop("checked", true);
						}

						$("button", ui.newPanel[0]).button("disable").button("option", "label", "No output format selected...");

						var hasFilter = self.manager.getParameter("json.filter").length > 0;

						$("#selected_data")[0].disabled = self.basket.length < 1;
						$("#filtered_data")[0].disabled = !hasFilter;
						if (self.basket.length) {
							$('.data_formats').removeClass('disabled')
							$("#export_type").buttonset("enable");
							$('.warning-message').hide();
							$("#selected_data")[0].checked = true;
						} else {

							$("#filtered_data")[0].checked = hasFilter;
							if (hasFilter || self.manager.getParameter("q").value.length > 0) {
								$('.data_formats').removeClass('disabled')
								$("#export_type").buttonset("enable");
								$('.warning-message').hide();
							} else {
								$('.data_formats').addClass('disabled')
								$("#export_type").buttonset("disable");
								$('.warning-message').show();
							}
						}

						$('.data_formats .jtox-ds-download a').first().trigger("click");

						$("#export_dataset").buttonset("refresh");
					}
				}
			});
		},

		prepareFormats: function () {
			var exportEl = $("#export_tab div.data_formats");
			self = this;

			for (var i = 0, elen = this.exportFormats.length; i < elen; ++i) {
				var el = jT.fillTemplate("#export-format", this.exportFormats[i]);
				el.data("index", i);
				exportEl.append(el);

				$("a", exportEl[0]).on("click", function (e) {
					var me = $(this),
						form = me.closest("form")[0];

					if (!me.hasClass('disabled') && !me.hasClass("selected")) {
						var cont = me.closest("div.data_formats");

						form.export_format.value = me.data("mime");

						//save readable format name
						$(form.export_format).data('name', me.data("name"));

						self.updateButton(form);

						$("div", cont[0]).removeClass("selected");
						cont.addClass("selected");
						me.closest(".jtox-fadable").addClass("selected");
					}
					return false;
				});
			}
		},

		prepareTypes: function () {
			var exportEl = $("#export_tab div#export_type"),
				self = this;

			for (var i = 0, elen = this.exportTypes.length; i < elen; ++i) {
				this.exportTypes[i].selected = (i == 0) ? 'checked="checked"' : '';
				var el = jT.fillTemplate("#export-type", this.exportTypes[i]);
				el.data("index", i);
				exportEl.append(el);

				$("input[name=export_type]").on("change", function (e) {
					var me = $(this);
					$('.data_formats a').addClass('disabled');

					self.exportTypes[me.data("index")].formats.split(",").forEach(function (item) {
						$('.data_formats a[data-name=' + item + ']').removeClass('disabled')
					});

					$('.data_formats a:visible').not('.disabled').first().trigger('click');
					return false;
				});
			}
		}
	});

})(Solr, asSys || a$, jQuery || $, jToxKit || jT);