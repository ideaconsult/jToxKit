/* MatrixKit.js - Read-across multi-purpose, big kit. Migrated from before!
 *
 * Copyright 2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan (Jonan) Georgiev
 **/

(function (_, a$, $, jT) {
	var defTagButtons = {
		'target': {
			code: 'T',
			tag: 'target',
			name: 'Target'
		},
		'source': {
			code: 'S',
			tag: 'source',
			name: 'Source'
		},
		'cm': {
			code: 'CM',
			tag: 'cm',
			name: 'Category Member'
		}
	};

	function MatrixKit(settings) {
		var self = this;

		$(this.rootElement = settings.target).addClass('jtox-toolkit'); // to make sure it is there even when manually initialized
		jT.ui.putTemplate('all-matrix', ' ? ', this.rootElement);

		this.settings = $.extend(true, {}, MatrixKit.defaults, settings);
		jT.ui.rebindRenderers(this, this.settings.baseFeatures, true);
		this.reboundHandlers = _.defaults(
			_.mapValues(this.settings.handlers, function (hnd) {  return _.bind(hnd, self); }), 
			jT.tables.commonHandlers);
		jT.ui.installHandlers(this, this.rootElement, this.reboundHandlers);

		this.bundleSummary = {
			compound: 0,
			substance: 0,
			property: 0,
			matrix: 0,
		};
		this.editSummary ={
			study: [],
		};

		// deal with some configuration
		if (typeof this.settings.studyTypeList === 'string')
			this.settings.studyTypeList = _.get(window, this.settings.studyTypeList, {});

		// the (sub)action in the panel
		var loadPanel = function(panel) {
			panel && jT.fireCallback(self[$(panel).data('loader')], self, panel.id, panel, true);
			$('.jq-buttonset.auto-setup input:checked', panel).trigger('change');
		};

		// initialize the tab structure for several versions of dataTables.
		$(this.rootElement).tabs({
			// disabled: [1, 2, 3, 4], // TODO: remove this comment!
			heightStyle: "content",
			select: function(event, ui) { loadPanel(ui.panel); },
			activate: function(event, ui) { ui.newPanel && loadPanel(ui.newPanel[0]); },
			create: function(event, ui) { ui.panel && loadPanel(ui.panel[0]); }
		});

		$('.jq-buttonset', this.rootElement).buttonset();

		// $('.jtox-users-submit', this.rootElement).on('click', updateUsers);

		this.onIdentifiers(null, $('#jtox-identifiers', this.rootElement)[0]);
		
		// finally, if provided - load the given bundleUri
		if (this.settings.bundleUri) {
			this.settings.baseUrl = jT.formBaseUrl(this.settings.bundleUri);
			this.loadBundle(this.settings.bundleUri);
		}

		return this;
	};

	/************** SOME HELPER ROUTINES ***************/
	MatrixKit.prototype.pollAmbit = function (service, method, data, el, cb) {
		el && $(el).addClass('loading');

		console.warn("Calling ambit: " + method + " " + service + " with: " + JSON.stringify(data));
		jT.ambit.call(this, this.bundleUri + service, {
			method: method,
			data: data
		}, jT.ambit.taskPoller(this, function (result) {
			el && $(el).removeClass('loading');
			if (typeof cb === 'function')
				return cb(result);
		}));
	},

	MatrixKit.prototype.validateBundleForm = function (e) {

	},

	MatrixKit.prototype.updateTaggedEntry = function (row, data, index) {
		var tag$ = $('td button.jt-toggle', row),
			note$ = $('td textarea.remark', row),
			bInfo = data.bundles[this.bundleUri];

		tag$.removeClass('active');
		if (bInfo && bInfo.tag) {
			tag$.filter('.' + bInfo.tag).addClass('active');
			note$.prop('disabled', false).val(bInfo.remarks);
		} else
			note$.prop('disabled', true).val(' ');
	};

	MatrixKit.prototype.getTagButtonsRenderer = function (subject, buttons, arrows) {
		return function (data, type, full) {
			return (type !== 'display') ? data : jT.ui.fillHtml('matrix-tag-buttons', { subject: subject });
		};
	};

	MatrixKit.prototype.starHighlight = function (root, stars) {
		$('span', root).each(function (idx) {
			if (idx < stars)
				$(this).removeClass('transparent');
			else
				$(this).addClass('transparent');
		});
	};

	MatrixKit.prototype.initUsers = function () {
		var self = this;
		var bundle = self.bundle;

		// request and process users with write access
		jT.ambit.call(self, self.settings.baseUrl + "/myaccount/users?mode=W&bundleUri=" + encodeURIComponent(bundle.URI), function (users) {
			if (!!users) {
				var select = $('#users-write');
				if (select.length == 0) return;
				select.data('tokenize').clear();
				for (var i = 0, l = users.length; i < l; ++i) {
					var u = users[i];
					select.data('tokenize').tokenAdd(u.id, u.name, true);
				}
			}
		});

		// request and process users with read only access
		jT.ambit.call(self, self.settings.baseUrl + "/myaccount/users?mode=R&bundleUri=" + encodeURIComponent(bundle.URI), function (users) {
			if (!!users) {
				var select = $('#users-read');
				if (select.length == 0) return;
				select.data('tokenize').clear();
				for (var i = 0, l = users.length; i < l; ++i) {
					var u = users[i];
					select.data('tokenize').tokenAdd(u.id, u.name, true);
				}
			}
		});

		var UserEditor = a$(jT.AutocompleteWidget, jT.UserWidget);
		$('.jtox-users-select', this.rootElement).each(function (el) {
			(new UserEditor({
				target: el,
				baseUrl: self.settings.baseUrl,
				tokenMode: true,
				extraParam: 'bundle_number=' + self.bundle && self.bundle.number,
				permission: $(el).data('permission')
			})).init();
		});
	};

	/************************ TAB INITIALIZATION ROUTINES **************/
	MatrixKit.prototype.onIdentifiers = function (id, panel) {
		var self = this;
		if (!panel || $(panel).hasClass('initialized'))
			return;

		$(panel).addClass('initialized');

		self.createForm = $('form', panel)[0];

		self.createForm.onsubmit = function (e) {
			e.preventDefault();
			e.stopPropagation();

			if (jT.validateForm(self.createForm)) {
				jT.ambit.call(self, self.settings.baseUrl + '/bundle', { method: 'POST', data: $(self.createForm).serializeArray()},
					function (bundleUri, jhr) {
					if (!!bundleUri) {
						self.load(bundleUri);
						var url = jT.parseURL( window.location.href );
						if (url.query != '' )
							url.query += '&bundleUri=' + bundleUri;
						else
							url.query = '?bundleUri=' + bundleUri;
						var href = url.protocol + '://' + url.host + ( (url.port != '') ? ':' + url.port : '' ) + url.path + url.query + ( (url.hash != '') ? '#' + url.hash : '' );
						if ( 'pushState' in window.history )
							window.history.pushState(null, '', href );
						else
							document.location = href;
					}
					else {
						// TODO: report an error
						console.log("Error on creating bundle [" + jhr.status + "]: " + jhr.statusText);
					}
				});
			}
		};

		self.createForm.assFinalize.onclick = function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (!self.bundleUri) return;

			var $this = $(this),
				data = { status: 'published' };

			$this.addClass('loading');
			jT.ambit.call(self, self.bundleUri, { method: 'PUT', data: data } , function (result) {
				$this.removeClass('loading');
				if (!result) // i.e. on error - request the old data
					self.load(self.bundleUri);
				else
					$('.data-field[data-field="status"]').html(formatStatus('published'));
			});
		};

		self.createForm.assNewVersion.onclick = function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (!self.bundleUri) return;

			var $this = $(this),
				data = { status: 'archived' };

			$this.addClass('loading');
			jT.ambit.call(self, self.bundleUri, { method: 'PUT', data: data } , function (result) {
				$this.removeClass('loading');
				if (!result) // i.e. on error - request the old data
					self.load(self.bundleUri);
			});

			jT.ambit.call(self, self.bundleUri + '/version', { method: 'POST' }, function (bundleUri, jhr) {
				if (!!bundleUri)
					self.load(bundleUri);
				else
					// TODO: report an error
					console.log("Error on creating bundle [" + jhr.status + ": " + jhr.statusText);
			});
		};

		self.createForm.assFinalize.style.display = 'none';
		self.createForm.assNewVersion.style.display = 'none';

		var starsEl = $('.data-stars-field', self.createForm)[0];
		starsEl.innerHTML += jT.ui.putStars(self, 0, "Assessment rating");
		$('span.ui-icon-star', starsEl)
			.on('mouseover', function (e) {
				for (var el = this; !!el; el = el.previousElementSibling)
					$(el).removeClass('transparent');
				for (var el = this.nextElementSibling; !!el; el = el.nextElementSibling)
					$(el).addClass('transparent');
			})
			.on('click', function (e) {
				var cnt = 0;
				for (var el = this; !!el; el = el.previousElementSibling, ++cnt);
				self.createForm.stars.value = cnt;
				$(self.createForm.stars).trigger('change');
			})
			.parent().on('mouseout', function (e) {
				self.starHighlight(this, parseInt(self.createForm.stars.value));
			});

		// install change handlers so that we can update the values
		$('input, select, textarea', self.createForm).on('change', function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (!self.bundleUri) return;

			var el = this;
			if (jT.fireCallback(checkForm, el, e)) {
				var data = {};
				data[el.name] = el.value;
				$(el).addClass('loading');
				jT.ambit.call(self, self.bundleUri, { method: 'PUT', data: data } , function (result) {
					$(el).removeClass('loading');
					if (!result) { // i.e. on error - request the old data
						self.load(self.bundleUri);
					}
				});
			}
		});

		var link = $('#source-link')[0], $source = $('#source');
		link.href = $source[0].value;
		$source.on('change', function() { link.href = this.value; });
	};

	// called when a sub-action in structures selection tab is called
	MatrixKit.prototype.onStructures = function (id, panel) {
		if (!this.queryKit) {
			var self = this,
				selColDef = jT.tables.insertRenderer(
					this.settings.baseFeatures['#SelectionRow'],
					this.getTagButtonsRenderer('structure'),
					{ separator: '<br/>' });

			this.browserKit = jT.ui.initKit($('#struct-browser'), {
				baseUrl: this.settings.baseUrl,
				baseFeatures: _.defaults({ '#SelectionRow': selColDef }, this.settings.baseFeatures),
				groups: this.settings.groups.structure,
				handlers: this.reboundHandlers,
				onRow: _.bind(this.updateTaggedEntry, this),
				onLoaded: function (dataset) {
					if (self.queryKit.getQueryType() === 'selected') {
						self.bundleSummary.compound = dataset.dataEntry.length;
						self.updateTabs();
					}
				},
				onDetails: function (substRoot, data) {
					var baseUrl = jT.formBaseUrl(this.datasetUri);
					new jT.ui.Substance($.extend(true, {}, this.settings, {
						target: substRoot,
						substanceUri: baseUrl + 'substance?type=related&compound_uri=' + encodeURIComponent(data.compound.URI),
						showControls: false,
						onLoaded: null,
						onRow: null,
						handlers: self.reboundHandlers,
						onDetails: function (studyRoot, data) {
							new jT.ui.Study($.extend({}, this.settings, {
								target: studyRoot,
								substanceUri: data.URI
							}));
						}
					}));
				}
			});

			this.queryKit = jT.ui.initKit($('#struct-query'), {
				mainKit: this.browserKit,
				customSearches: {
					selected: {
						title: "Selected",
						description: "List selected structures",
						onSelected: function (kit, form) {
							$('div.search-pane', form).hide();
							self.browserKit.query(self.bundleUri + '/compound');
						}
					}
				}
			});
		}

		this.queryKit.query();
	};

	// called when a sub-action in endpoint selection tab is called
	MatrixKit.prototype.onSubstances = function (id, panel) {
		if (!this.substanceKit) {
			var self = this,
				idCol = jT.tables.insertRenderer(
					jT.ui.Substance.defaults.columns.substance.Id,
					_.bind(jT.tables.getSelectionRenderer('substance', 'substanceSelect'), this), 
					{ separator: '<br/>', position: 'before' });

			this.substanceKit = jT.ui.initKit($('#substance-selector'), {
				baseUrl: this.settings.baseUrl,
				baseFeatures: this.settings.baseFeatures,
				groups: this.settings.groups.substance,
				handlers: this.reboundHandlers,
				onDetails: function (substRoot, data) {
					var baseUrl = jT.formBaseUrl(this.datasetUri),
						substanceUri = baseUrl + 'substance?type=related&addDummySubstance=true&compound_uri=' + encodeURIComponent(data.compound.URI) + 
							'&filterbybundle=' + encodeURIComponent(self.bundleUri) + 
							'&bundle_uri=' + encodeURIComponent(self.bundleUri);
					new jT.ui.Substance($.extend(true, {}, this.settings, {
						baseUrl: baseUrl,
						target: substRoot,
						substanceUri: substanceUri,
						showDiagrams: true,
						handlers: self.reboundHandlers,
						embedComposition: true,
						showControls: false,
						onDetails: null,
						columns: { substance: { 'Id': idCol } },
						onLoaded: function () { 
							// The actual counting happens in the onRow, because it is conditional.
							self.updateTabs(); 
						},
						onRow: function (row, data, index) {
							if (!data.bundles) return;

							// Make sure the checked state corresponds to the substance selection state
							var bInfo = data.bundles[self.bundleUri];

							$('input.jtox-handler', row).prop('checked', !!bInfo && bInfo.tag == "selected");
						},
					}));
				}
			});

			/* Setup expand/collaps all buttons */
			$('.details-expand-all', panel).on('click', function() {
				$('.jtox-details-open.fa-folder', panel).trigger('click');
			});
			$('.details-collapse-all', panel).on('click', function() {
				$('.jtox-details-open.fa-folder-open', panel).trigger('click');
			});
		}

		// Make the initial call, resetting the counter first
		this.substanceKit.query(this.bundleUri + '/compound');
	};

	MatrixKit.prototype.onEndpoints = function (id, panel) {
		if (!this.endpointKit) {
			var self = this,
				idCol = jT.tables.insertRenderer(
					jT.ui.Endpoint.defaults.columns.endpoint.Id,
					_.bind(jT.tables.getSelectionRenderer('endpoint', 'endpointSelect'), this), 
					{ separator: '<br/>', position: 'before' });

			this.endpointKit = jT.ui.initKit($('#endpoint-selector'), {
				baseUrl: this.settings.baseUrl,
				handlers: this.reboundHandlers,
				showMultiselect: true,
				showEditors: true,
				columns: { endpoint: { 'Id': idCol } },
				onRow: function (row, data, index) {
					if (!data.bundles)
						return;
					var bundleInfo = data.bundles[self.bundleUri];
					$('input.jtox-handler', row).prop('checked', !!bundleInfo && bundleInfo.tag == "selected");
				}
			});
		}
		// The auto-init has taken care to have a query initiated.
	};

	MatrixKit.prototype.saveMatrix = function () {
		if (self.editSummary.study.length > 0) {
			var toAdd = JSON.stringify({ study: self.editSummary.study });

			// make two nested calls - for adding and for deleting
			$(saveButton).addClass('loading');
			jT.ambit.call(self, self.bundleUri + '/matrix', { method: 'PUT', headers: { 'Content-Type': "application/json" }, data: toAdd }, function (result, jhr) {
				if (!!result) {
					jT.ambit.call(self, self.bundleUri + '/matrix/deleted', { method: 'PUT', headers: { 'Content-Type': "application/json" }, data: toAdd },function (result, jhr) {
						$(saveButton).removeClass('loading');
						if (!!result) {
							self.editSummary.study = [];
							self.matrixKit.query(self.bundleUri + '/matrix');
							dressButton();
						}
					});
				}
				else {
					$(saveButton).removeClass('loading');
				}
			});
		}
	},

	// called when a sub-action in bundle details tab is called
	MatrixKit.prototype.onMatrix = function (panId, panel) {
		var self = this;
		if (!$(panel).hasClass('initialized')) {

			var saveButton = $('.save-button', panel)[0];
			saveButton.disabled = true;
			var dressButton = function() {
				if (self.editSummary.study.length < 1) {
					saveButton.disabled = true;
					$(saveButton).removeClass('jt-alert').addClass('jt-disabled');
					saveButton.innerHTML = "Saved";
				}
				else {
					saveButton.disabled = false;
					$(saveButton).addClass('jt-alert').removeClass('jt-disabled');
					saveButton.innerHTML = "Save";
				}
			};

			var onEditClick = function (data) {
				var boxOptions = {
					overlay: true,
					closeOnEsc: true,
					closeOnClick: "overlay",
					addClass: "popup-box jtox-toolkit ui-front",
					animation: "zoomIn",
					target: $(this),
					maxWidth: 600,
					zIndex: 90,
					onCloseComplete: function () { this.destroy(); }
				};

				var isDelete = $(this).hasClass('delete-popup');
				var jel = (isDelete ? $('a', this.parentNode) : $(this));

				var featureId = jel.data('feature');
				var valueIdx = jel.data('index');
				var feature = self.matrixKit.dataset.feature[featureId];
				if (!jel.hasClass('edit-popup')) {

					$('.dynamic-condition', infoDiv).remove();
					var dynHead = $('tr.conditions', infoDiv)[0];
					var postCell = $('td.postconditions', infoDiv)[0];

					for (var i = 0, cl = feature.annotation.length; i < cl; ++i) {
						var ano = feature.annotation[i];
						// first add the column
						var el = document.createElement('th');
						el.className = 'dynamic-condition';
						el.innerHTML = ano.p;
						dynHead.appendChild(el);
						// now add the value
						el = document.createElement('td');
						el.className = 'dynamic-condition';
						el.innerHTML = ano.o;
						postCell.parentNode.insertBefore(el, postCell);
					}

					// make sure there is at least one cell.
					if (cl < 1) {
						el = document.createElement('td');
						el.className = 'dynamic-condition';
						el.innerHTML = '-';
						postCell.parentNode.insertBefore(el, postCell);
					}

					$('th.conditions', infoDiv).attr('colspan', cl);

					var val = data.values[featureId];
					if (!feature.isMultiValue || !$.isArray(val))
						val = [val];
					
					jT.ui.updateTree(infoDiv, {
						endpoint: feature.title,
						guidance: feature.creator,
						value: jT.ui.renderRange(val[valueIdx], feature.units, 'display'),
					}, self.settings.formatters);

					if (isDelete) {
						$('.delete-box', infoDiv).show();
						boxOptions.onOpen = function () {
							var box = this;
							var content = this.content[0];
							if(val[valueIdx].deleted) {
								// If the value is already deleted, show remarks
								$('button.jt-alert', content).hide();
								$('textarea', content).val(val[valueIdx].remarks);
							}
							else
								$('button.jt-alert', content).on('click', function (){ deleteFeature(data, featureId, valueIdx, $('textarea', content).val(), jel[0]); box.close(); });
						};
					}
					else
						$('.delete-box', infoDiv).hide();

					boxOptions.content = infoDiv.innerHTML;
					new jBox('Tooltip', boxOptions).open();
				} else { // edit mode
					var parse = jT.ambit.parseFeatureId(featureId);
					// map between UI fields and JSON properties
					var valueMap = {
						endpoint: 'effects[0].endpoint',
						value: 'effects[0].result',
						interpretation_result: 'interpretation.result',

						type: 'reliability.r_studyResultType',
						reference: 'citation.title',
						justification: 'protocol.guideline[0]',
						remarks: 'interpretation.criteria'
					};

					// the JSON that is about to be sent on Apply
					var featureJson = {
						owner: {
							substance: {
								uuid: data.compound.i5uuid
							}
						},
						protocol: {
							topcategory: parse.topcategory,
							category: {
								code: parse.category
							},
							endpoint: feature.title,
							guideline: ['']
						},
						citation: {
							year: (new Date()).getFullYear().toString()
						},
						parameters: { },
						interpretation: { },
						reliability: { },
						effects: [{
							result: { },
							conditions: { }
						}]
					};

					// we're taking the original jToxEndpoint editor here and glue our part after it.
					boxOptions.content = jT.ui.getTemplate('jtox-endeditor').innerHTML + editDiv.innerHTML;
					boxOptions.title = feature.title || parse.category;
					boxOptions.closeButton = "box";
					boxOptions.confirmButton = "Add";
					boxOptions.cancelButton = "Cancel";
					var endSetValue = function (e, field, value) {
						var f = valueMap[field];
						if (!f)
							featureJson.effects[0].conditions[field] = value;
						else
							_.set(featureJson, f, value);
					};

					boxOptions.onOpen = function () {
						var box = this;
						var content = this.content[0];
						jToxEndpoint.linkEditors(self.matrixKit, content, { category: parse.category, top: parse.topcategory, onchange: endSetValue, conditions: true });
						$('input[type=button]', content).on('click', function (){ addFeature(data, featureId, featureJson, jel[0]); box.close();});
					};
					new jBox('Modal', boxOptions).open();
				}
			};

			var addFeature = function(data, fId, value, element) {
				self.editSummary.study.push(value);
				dressButton();

				// now fix the UI a bit, so we can see the
				fId += '/' + self.editSummary.study.length;

				var catId = jT.ambit.parseFeatureId(fId).category,
						config = jT.$.extend(true, {}, self.matrixKit.settings.configuration.columns["_"], self.matrixKit.settings.configuration.columns[catId]),
						f = null;

				self.matrixKit.dataset.feature[fId] = f = {};
				f.sameAs = "http://www.opentox.org/echaEndpoints.owl#" + catId;
				f.title = value.effects[0].endpoint || (value.citation.title || "");
				f.creator = value.protocol.guideline[0];
				f.isMultiValue = true;
				f.annotation = [];
				for (var cId in value.effects[0].conditions) {
					f.annotation.push({
						'p': cId,
						'o': jT.ui.renderRange(value.effects[0].conditions[cId])
					});
				}

				data.values[fId] = [value.effects[0].result];

				var preVal = (_.get(config, 'effects.endpoint.bVisible') !== false) ? f.title : null;
				preVal = [f.creator, preVal].filter(function(value){return value!==null}).join(' ');

				var html = 	'<span class="ui-icon ui-icon-circle-minus delete-popup" data-index="' + (self.editSummary.study.length - 1) + '"></span>&nbsp;' + 
							'<a class="info-popup unsaved-study" data-index="0" data-feature="' + fId + '" href="#">' + jT.ui.renderRange(value.effects[0].result, null, 'display', preVal) + '</a>',
					span = document.createElement('div');

				span.innerHTML = html;
				element.parentNode.insertBefore(span, element);
				self.matrixKit.equalizeTables();

				$('.info-popup', span).on('click', function (e) { onEditClick.call(this, data); });
				$('.delete-popup', span).on('click', function (e) {
					var idx = $(this).data('index');
					self.editSummary.study.splice(idx, 1);
					$(this.parentNode).remove();
					dressButton();
				});
			};

			var deleteFeature = function (data, featureId, valueIdx, reason, element) {
				self.editSummary.study.push({
					owner: { substance: { uuid: data.compound.i5uuid } },
					effects_to_delete: [{
						result: {
							idresult: data.values[featureId][valueIdx].idresult,
							deleted: true,
							remarks: reason
						},
					}]
				});
				dressButton();

				// Now deal with the UI
				$(element).addClass('unsaved-study');
				$('span', element.parentNode)
					.removeClass('ui-icon-circle-minus')
					.addClass('ui-icon-circle-plus')
					.data('index', self.editSummary.study.length - 1)
					.on('click.undodelete', function () {
						var idx = $(this).data('index');
						$(this).addClass('ui-icon-circle-minus').removeClass('ui-icon-circle-plus').off('click.undodelete').data('index', null);
						$('a', this.parentNode).removeClass('unsaved-study');
						self.editSummary.study.splice(idx, 1);
						dressButton();
					});
			};

			var infoDiv = $('div.info-box', self.rootElement)[0];
			var editDiv = $('div.edit-box', self.rootElement)[0];

			// now, fill the select with proper values...
			var df = document.createDocumentFragment();
			for (var id in self.settings.studyTypeList) {
				var opt = document.createElement('option');
				opt.value = id;
				opt.innerHTML = self.settings.studyTypeList[id].title;
				df.appendChild(opt);
			}

			$('select.type-list', editDiv)[0].appendChild(df);

			self.matrixKit = self.prepareMatrixKit($('.jtox-toolkit', panel)[0]);

			self.matrixKit.settings.onRow = function (row, data, index) {
				// equalize multi-rows, if there are any
				jT.$('td.jtox-multi .jtox-diagram span.ui-icon', row).on('click', function () {
					setTimeout(function () {
						jT.tables.equalizeHeights.apply(window, jT.$('td.jtox-multi table tbody', row).toArray());
					}, 50);
				});

				$('.info-popup, .edit-popup, .delete-popup', row).on('click', function (e) {
					if (!$(this).hasClass('delete-popup') || $(this).data('index') == null)
						onEditClick.call(this, data);
				});

				var self = this;
				$('button.jtox-up', row).on('click', function(){
					var i = $(self.fixTable).find('> tbody > tr').index(row);
					var varRow = $(self.varTable).find('> tbody > tr')[i];
					$(row).insertBefore( $(row.previousElementSibling) );
					$(varRow).insertBefore( $(varRow.previousElementSibling) );
				});
				$('button.jtox-down', row).on('click', function(){
					var i = $(self.fixTable).find('> tbody > tr').index(row);
					var varRow = $(self.varTable).find('> tbody > tr')[i];
					$(row).insertAfter( $(row.nextElementSibling) );
					$(varRow).insertAfter( $(varRow.nextElementSibling) );
				});
			};

			$('.create-button', panel).on('click', function () {
				var el = this;
				$(el).addClass('loading');
				jT.ambit.call(self, self.bundleUri + '/matrix/working', { method: 'POST', data: { deletematrix:  false } }, function (result, jhr) {
					$(el).removeClass('loading');
					if (!!result) {
						$('.jtox-toolkit', panel).show();
						$('.save-button', panel).show();
						$('.create-button', panel).hide();
						$('#xfinal').button('enable');
						self.bundleSummary.matrix++;
						self.editSummary.matrixEditable = true;
						self.matrixKit.query(self.bundleUri + '/matrix/working');
					}
				});
			});

			$(panel).addClass('initialized');
		}

		// finally decide what query to make, depending on the
		$('.save-button', panel).hide();
		$('.create-button', panel).hide();
		var queryUri = null;
		if (panId == 'xinitial') {
			$('.jtox-toolkit', panel).show();
			self.editSummary.matrixEditable = false;
			queryUri = self.bundleUri + '/dataset?mergeDatasets=true';
		}
		else {
			var queryPath = (panId == 'xfinal') ? '/matrix/final' : '/matrix/working',
					editable = (panId != 'xfinal');
					
			if (self.bundleSummary.matrix > 0) {
				$('.jtox-toolkit', panel).show();
				queryUri = self.bundleUri + queryPath;
				self.editSummary.matrixEditable = editable;
				if (editable)
					$('.save-button', panel).show();
				else
					$('.save-button', panel).hide();
			}
			else {
				$('.jtox-toolkit', panel).hide();
				$('.create-button', panel).show();
			}
		}

		if (!!queryUri)
			self.matrixKit.query(queryUri);
	};

	MatrixKit.prototype.onReport = function(id, panel){
		var self = this;

		if (!$(panel).hasClass('initialized')) {

			jT.ui.updateTree(panel, self.bundle, self.settings.formatters);

			$('#generate-doc').on('click', function(){
				var loadFile = function(url, callback){
					JSZipUtils.getBinaryContent(url, callback);
				}

				function get(url) {
					// Return a new promise.
					return new Promise(function(resolve, reject) {
						// Do the usual XHR stuff
						var req = new XMLHttpRequest();
						req.open('GET', url);
						req.responseType = 'arraybuffer';

						req.onload = function() {
							// This is called even on 404 etc
							// so check the status
							if (req.status == 200) {
								// Resolve the promise with the response text
								resolve(req.response);
							}
							else {
								// Otherwise reject with the status text
								// which will hopefully be a meaningful error
								reject(Error(req.statusText));
							}
						};

						// Handle network errors
						req.onerror = function() {
							reject(Error("Network Error"));
						};

						// Make the request
						req.send();
					});
				}

				function getData() {

					return new Promise(function(resolve, reject){

						var data = $.extend(true, {}, self.bundle);
						data.created = formatDate(self.bundle.created);
						data.updated = formatDate(self.bundle.updated);
						data.structures = [];

						var imagePromises = [];

						var structuresFixRows = $('#jtox-report-query .jtox-ds-fixed tbody tr');
						var structuresVarRows = $('#jtox-report-query .jtox-ds-variable tbody tr');
						structuresFixRows.each(function(index){
							var structure = {"index": index + 1}, fr = $(this), vr = $(structuresVarRows[index]);
							structure.tag = fr.find('td:first-child button.active').text();

							var image = fr.find('img.jtox-smalldiagram')[0];

							var imagePromise = get(image.src).then(function(data){
									structure.image = {
										"data": data.slice(0),
										"size": [image.width, image.height]
									}
								});

							imagePromises.push(imagePromise);

							var cells = vr.find('td:not(.jtox-hidden)');
							structure.casrn = $(cells[0]).text();
							structure.ecnum = $(cells[1]).text();
							structure.names = $(cells[2]).text();
							structure.rationale = $(cells[3]).find('textarea').val();
							structure.substances = [];
							data.structures.push(structure);
						});

						var substanceContainers = $('#jtox-report-substance-query .jtox-substance');
						substanceContainers.each(function(index){
							var structure = data.structures[index],
									substanceRows = $(this).find('tbody tr');
							substanceRows.each(function(i){
								var cells = $(this).find('td'),
										substance = {};
								substance.i = i + 1;
								substance.name = $(cells[1]).text();
								substance.uuid = $(cells[2]).text();
								substance.type = $(cells[3]).text();
								substance.pubname = $(cells[4]).text();
								substance.refuuid = $(cells[5]).text();
								substance.owner = $(cells[6]).text();
								substance.info = $(cells[7]).text();
								substance.contained = $(cells[8]).text();
								structure.substances.push(substance);
							});
						});

						data.matrix = [];
						var matrixRows = $('#jtox-report-matrix .jtox-ds-fixed .dataTable > tbody > tr');
						matrixRows.each(function(){
							var rowData = {};
							var cells = $(this).find('> td:not(.jtox-hidden)');
							rowData.cas = $(cells[1]).text();
							rowData.substancename = $(cells[2]).text();
							rowData.i5uuid = $(cells[3]).text();
							rowData.datasource = $(cells[4]).text();
							rowData.tag = $(cells[5]).text();
							rowData.constituentname = $(cells[7]).text();
							rowData.content = $(cells[8]).text();
							rowData.containedas = $(cells[9]).text();
							data.matrix.push(rowData);
						});

						var structuresCount = data.matrix.length;
						var groups = Math.ceil(structuresCount/3);

						data.dataMatrix = [];
						var structureRows = $('#jtox-report-final thead tr');
						var dataRows = $('#jtox-report-final tbody tr');
						var tagCells = $(structureRows[0]).find('th');
						var nameCells = $(structureRows[1]).find('th');
						var casCells = $(structureRows[2]).find('th');
						for (var i = 0; i < groups; i++) {
							var dataGroup = {
								tag1: '',
								tag2: '',
								tag3: '',
								name1: '',
								name2: '',
								name3: '',
								cas1: '',
								cas2: '',
								cas3: '',
								data: []
							};
							for (var c = 1, cl = Math.min(3, tagCells.length - 3*i); c <= cl; c++) {
								dataGroup['tag' + c] = $(tagCells[3*i + c]).text();
							}
							for (var c = 1, cl = Math.min(3, nameCells.length - 3*i); c <= cl; c++) {
								dataGroup['name' + c] = $(nameCells[3*i + c]).text();
							}
							for (var c = 1, cl = Math.min(3, casCells.length - 3*i); c <= cl; c++) {
								dataGroup['cas' + c] = $(casCells[3*i + c]).text();
							}
							dataRows.each(function(){
								var cells = $(this).find('th, td');
								var row = { title: '', value1: '', value2: '', value3: ''};
								var prefix = '';
								row.title = $(cells[0]).text();
								for (var c = 1, cl = Math.min(3, nameCells.length - 3*i); c <= cl; c++) {
									var parts = [];
									if (cells[3*i + c] !== undefined) {
										$(cells[3*i + c].childNodes).each(function(){
											if ( $('.ui-icon-calculator', this).length > 0 ) {
												prefix = '<w:r><w:rPr><w:color w:val="FF0000" /></w:rPr><w:t xml:space="preserve">';
											}
											else {
												prefix = '<w:r><w:rPr><w:color w:val="0000FF" /></w:rPr><w:t xml:space="preserve">';
											}
											parts.push( prefix + _.escape($(this).text()) + '</w:t></w:r>' );
										});
									}
									row['value' + c] = '<w:p><w:pPr><w:pStyle w:val="Style16"/><w:rPr></w:rPr></w:pPr>' + parts.join('<w:r><w:br /></w:r>') + '</w:p>';
								}
								dataGroup.data.push(row);
							});
							data.dataMatrix.push(dataGroup);
						}

						data.adstructures = [];
						var adstructureEls = $('#jtox-report-gap-filling section');
						adstructureEls.each(function(){

							var structure = {name: $('h3', this).text(), features: []}

							$(this).children('div').each(function(){
								var feature = {name: $('h4', this).html(), data: []};
								$('div.popup-box', this).each(function(){
									var entry = {
										endpoint: $('td.the-endpoint', this).text(),
										value: $('td.the-value', this).text(),
										guidance: $('td.postconditions', this).text(),
										rationaleTitle: $('h5', this).text(),
										rationale: $('p.justification', this).text(),
										conditions: []
									};
									var dch = $('th.dynamic-condition', this);
									var dcd = $('td.dynamic-condition', this);
									dch.each(function(i){
										entry.conditions.push({
											condition: this.innerHTML,
											value: dcd[i].innerHTML
										});
									});
									feature.data.push(entry);
								});
								structure.features.push(feature);
							});

							data.adstructures.push(structure);

						});

						data.ddstructures = [];
						var ddstructureEls = $('#jtox-report-deleting-data section');
						ddstructureEls.each(function(){

							var structure = {name: $('h3', this).text(), features: []}

							$(this).children('div').each(function(){
								var feature = {name: $('h4', this).html(), data: []};
								$('div.popup-box', this).each(function(){
									var entry = {
										endpoint: $('td.the-endpoint', this).text(),
										value: $('td.the-value', this).text(),
										guidance: $('td.postconditions', this).text(),
										rationale: $('p.justification', this).text(),
										conditions: []
									};
									var dch = $('th.dynamic-condition', this);
									var dcd = $('td.dynamic-condition', this);
									dch.each(function(i){
										entry.conditions.push({
											condition: this.innerHTML,
											value: dcd[i].innerHTML
										});
									});
									feature.data.push(entry);
								});
								structure.features.push(feature);
							});

							data.ddstructures.push(structure);

						});


						// We use Promose.all to wait for the images to load
						// and then resolve with data
						return Promise.all(imagePromises).then(function(){
							resolve(data);
						}, reject);

					});

				} // End getData function

				getData().then(function(data){

					loadFile("../report/assessment-report.docx", function(err, content){
						if (err) { throw err };

						var doc = new Docxgen();

						var imageModule = new ImageModule({centered:false});
						imageModule.getSizeFromData=function(imgData) {
							return [imgData.size[0] / 2, imgData.size[1] / 2];
						}
						imageModule.getImageFromData=function(imgData) {
							return imgData.data.slice(0);
						}
						doc.attachModule(imageModule);

						doc.load(content);

						doc.setData( data ); //set the templateVariables
						doc.render(); //apply them (replace all occurences of {first_name} by Hipp, ...)
						var output = doc.getZip().generate({type:"blob", compression: 'DEFLATE'}); //Output the document using Data-URI
						saveAs(output, "report.docx");
					});

				}, function(error){
					console.log('Error', error);
				});

			});

			$(panel).addClass('initialized');

		}

		if (!self.reportQueryKit) {
			self.reportQueryKit = jT.ui.kit($('#jtox-report-query')[0]);
			self.reportQueryKit.setWidget("bundle", self.rootElement);
			self.reportQueryKit.kit().settings.fixedWidth = '200px';
			// provid onRow function so the buttons can be se properly...
			self.reportQueryKit.kit().settings.onRow = function (row, data, index) {
				if (!data.bundles)
					return;

				var bundleInfo = data.bundles[self.bundleUri] || {};
				if (!!bundleInfo.tag) {
					$('button.jt-toggle.' + bundleInfo.tag.toLowerCase(), row).addClass('active');
				}
				if (!!bundleInfo.remarks) {
					$('textarea.remark', row).val(bundleInfo.remarks).prop('readonly', true);
				}
			};

		}
		self.reportQueryKit.kit().queryDataset(self.bundleUri + '/compound');

		if (!self.reportSubstancesQueryKit) {

			// self.reportSubstancesQueryKit = self.prepareSubstanceKit($('#jtox-report-substance-query')[0]);

			self.reportSubstancesQueryKit.kit().settings.onRow = function (row, data, index) {
				if (!data.bundles){
					return;
				}
				var bundleInfo = data.bundles[self.bundleUri] || {};
				$('textarea.remark', row).val(bundleInfo.remarks).prop('readonly', true);
				if (!!bundleInfo.tag) {
					$('button.jt-toggle.' + bundleInfo.tag.toLowerCase(), row).addClass('active');
				}
			};

		}

		self.reportSubstancesQueryKit.kit().queryDataset(self.bundleUri + '/compound');


		if (!self.reportMatrixKit) {

			self.reportMatrixKit = self.prepareMatrixKit($('#jtox-report-matrix .jtox-toolkit')[0]);

			self.reportMatrixKit.settings.showTabs = false;
			self.reportMatrixKit.settings.showControls = false;
			self.reportMatrixKit.settings.fixedWidth = "100%";

			self.reportMatrixKit.settings.onComplete = function () {
				var self = this,
						table = $('<table class="dataTable"><thead></thead><tbody></tbody></table>'),
						head = table.find('thead'),
						body = table.find('tbody');

				var ntr = $('<tr><th>Substance name</th></tr>');
				var ttr = $('<tr><th>Tag</th></tr>');
				var ctr = $('<tr><th>CAS No.</th></tr>');
				$(self.fixTable).find('> tbody > tr').each(function(){
					var cth = $('<th></th>').html( $(this).find('td')[2].innerHTML );
					ctr.append(cth);
					var nth = $('<th></th>').html( $(this).find('td')[3].innerHTML );
					ntr.append(nth);
					var tth = $('<th></th>').append( $($(this).find('td')[6]).find('button.active').clone() );
					ttr.append(tth);
				});
				head.append(ttr).append(ntr).append(ctr);

				$(self.varTable).find('thead th').each(function(index){
					if (this.innerHTML == '') return;
					var $this = $(this);
					var tr = $('<tr></tr>').append('<th>' + $this.html() + '</th>');
					$(self.varTable).find('tbody > tr').each(function(){
						tr.append( '<td>' + $(this).find('td:nth-child(' + (index+1) + ')').html() + '</td>' );
					});
					body.append(tr);
				});

				$('#jtox-report-final > div').html('').append(table);

				$(self.varTable).remove();
				self.equalizeTables();

				// Generate appendixes 2 and 3

				var substanceSection = $('#jtox-report-substance'),
					featureSection = $('#jtox-report-feature'),
					infoDiv = $('#info-box'),
					addedData = [],
					deletedData = [];

				for ( var i = 0, sl = self.dataset.dataEntry.length; i < sl; i++ ) {
					var substance = self.dataset.dataEntry[i];
					for ( var theId in substance.values ) {
						if( $.isArray(substance.values[theId]) ){
							var feature = self.dataset.feature[theId];
							for ( var j = 0, vl = substance.values[theId].length; j < vl; j++ ) {
								var value = substance.values[theId][j];
								if (feature.isModelPredictionFeature || value.deleted ) {

									for ( var fId in self.feature ) {
										var f = self.feature[fId];
										if ( f.sameAs == feature.sameAs ) {
											var featureId = f.URI;
										}
									}

									if ( feature.isModelPredictionFeature ) {
										// Append data to Appendix 2
										if( !addedData[i] ) {
											addedData[i] = {};
										}
										if( !addedData[i][featureId] ){
											addedData[i][featureId] = [];
										}
										addedData[i][featureId].push( {
											feature: feature,
											value: value
										} );
									}
									if ( value.deleted ) {
										// Append data to Appendix 3
										if( !deletedData[i] ) {
											deletedData[i] = {};
										}
										if( !deletedData[i][featureId] ){
											deletedData[i][featureId] = [];
										}
										deletedData[i][featureId].push( {
											feature: feature,
											value: value
										} );
									}
								}
							}
						}
					}
				}

				for( var i = 0, al = addedData.length; i < al; i++ ){
					if( !addedData[i] ) continue;
					var newSection = substanceSection.clone().removeAttr('id');
					var substance = self.dataset.dataEntry[i];
					jT.ui.updateTree(newSection[0], {
						name: (substance.compound.name || substance.compound.tradename), 
						number: substance.number
					}, self.settings.formatters);

					for(fId in addedData[i]){
						var set = addedData[i][fId];

						var newFeature = featureSection.clone().removeAttr('id');
						jT.ui.updateTree(newFeature[0], { title: self.dataset.feature[fId].title }, self.settings.formatters);

						for ( var j = 0, sl = set.length; j < sl; j++ ) {

							var newInfo = infoDiv.clone().removeAttr('id');
							var feature = set[j].feature;
							var value = set[j].value;

							$('.dynamic-condition', newInfo).remove();
							var dynHead = $('tr.conditions', newInfo)[0];
							var postCell = $('td.postconditions', newInfo)[0];

							for (var k = 0, cl = feature.annotation.length; k < cl; ++k) {
								var ano = feature.annotation[k];
								// first add the column
								var el = document.createElement('th');
								el.className = 'dynamic-condition';
								el.innerHTML = ano.p;
								dynHead.appendChild(el);
								// now add the value
								el = document.createElement('td');
								el.className = 'dynamic-condition';
								el.innerHTML = ano.o;
								postCell.parentNode.insertBefore(el, postCell);
							}

							// make sure there is at least one cell.
							if (cl < 1) {
								el = document.createElement('td');
								el.className = 'dynamic-condition';
								el.innerHTML = '-';
								postCell.parentNode.insertBefore(el, postCell);
							}

							$('th.conditions', newInfo).attr('colspan', cl);

							jT.ui.updateTree(newInfo, {
								endpoint: feature.title,
								guidance: '',
								value: jT.ui.renderRange(value, feature.units, 'display'),
								remarks: feature.creator,
								studyType: feature.source.type
							}, self.settings.formatters);

							newFeature.append( newInfo );
						}

						newSection.append( newFeature );
					}

					$('#jtox-report-gap-filling').append( newSection );
				}

				for( var i = 0, al = deletedData.length; i < al; i++ ){
					if( !deletedData[i] ) continue;
					var newSection = substanceSection.clone().removeAttr('id');
					var substance = self.dataset.dataEntry[i];
					jT.ui.updateTree(newSection[0], {
						name: (substance.compound.name || substance.compound.tradename),
						number: substance.number
					}, self.settings.formatters);

					for(fId in deletedData[i]){

						var set = deletedData[i][fId];
						var newFeature = featureSection.clone().removeAttr('id');
						jT.ui.updateTree(newFeature[0], { title: self.dataset.feature[fId].title }, self.settings.formatters);

						for ( var j = 0, sl = set.length; j < sl; j++ ) {

							var newInfo = infoDiv.clone().removeAttr('id');
							var feature = set[j].feature;
							var value = set[j].value;

							$('.dynamic-condition', newInfo).remove();
							var dynHead = $('tr.conditions', newInfo)[0];
							var postCell = $('td.postconditions', newInfo)[0];

							for (var k = 0, cl = feature.annotation.length; k < cl; ++k) {
								var ano = feature.annotation[k];
								// first add the column
								var el = document.createElement('th');
								el.className = 'dynamic-condition';
								el.innerHTML = ano.p;
								dynHead.appendChild(el);
								// now add the value
								el = document.createElement('td');
								el.className = 'dynamic-condition';
								el.innerHTML = ano.o;
								postCell.parentNode.insertBefore(el, postCell);
							}

							// make sure there is at least one cell.
							if (cl < 1) {
								el = document.createElement('td');
								el.className = 'dynamic-condition';
								el.innerHTML = '-';
								postCell.parentNode.insertBefore(el, postCell);
							}

							$('th.conditions', newInfo).attr('colspan', cl);

							jT.ui.updateTree(newInfo, {
								endpoint: feature.title,
								guidance: feature.creator,
								value: jT.ui.renderRange(value, feature.units, 'display'),
								remarks: value.remarks
							}, self.settings.formatters);

							newInfo.find('h5').remove();

							newFeature.append( newInfo );
						}

						newSection.append( newFeature );
					}

					$('#jtox-report-deleting-data').append( newSection );
				}
			};

			self.reportMatrixKit.settings.onRow = function (row, data, index) {

				// equalize multi-rows, if there are any
				setTimeout(function () {
					jT.tables.equalizeHeights.apply(window, jT.$('td.jtox-multi table tbody', row).toArray());
				}, 50);
			};
		}

		var queryUri = self.bundleUri + '/matrix/final';
		if (!!queryUri) {
			self.reportMatrixKit.query(queryUri);
		}
	};

	MatrixKit.prototype.prepareMatrixKit = function(rootEl){
		var self = this;

		jTConfig.matrix.groups = function(miniset, kit) {
			var groups = { "Identifiers" : self.settings.matrixIdentifiers.concat(self.settings.matrixMultiRows) },
				groupids = [],
				endpoints = {};

			var fRender = function (feat, theId) {
				return function (data, type, full) {
					if (type != 'display')
						return '-';

					var html = '';
					for (var fId in kit.dataset.feature) {
						var f = kit.dataset.feature[fId];
						if (f.sameAs != feat.sameAs || full.values[fId] == null)
							continue;

						var catId = jT.ambit.parseFeatureId(fId).category,
								config = jT.$.extend(true, {}, kit.settings.configuration.columns["_"], kit.settings.configuration.columns[catId]);

						var theData = full.values[fId];
						var preVal = (_.get(config, 'effects.endpoint.bVisible') !== false) ? "<strong>"+f.title+"</strong>" : null;

						var icon = f.isModelPredictionFeature?"ui-icon-calculator":"ui-icon-tag";
						var studyType = "<span class='ui-icon "+icon+"' title='" + f.source.type + "'></span>";
						//preVal = [preVal, f.source.type].filter(function(value){return value!==null}).join(' : ');

						var postVal = '', postValParts = [], parameters = [], conditions = [];
						for (var i = 0, l = f.annotation.length; i < l; i++){
							var a = f.annotation[i];
							if ( a.type == 'conditions' && _.get(config, 'conditions["' + a.p.toLowerCase() + '"].inMatrix') == true ) {
								var t = _.get(config, 'conditions["' + a.p.toLowerCase() + '"].sTitle') || a.p;
								conditions.push(t + ' = ' + a.o);
							}
							else if (a.type == 'parameters') {
								parameters.push(a.o);
							}
						}
						if(parameters.length > 0){
							postValParts.push('<span>' + parameters.join(', ') + '</span>');
						}
						if(conditions.length > 0){
							postValParts.push('<span>' + conditions.join(', ') + '</span>');
						}
						if(_.get(config, 'protocol.guideline.inMatrix') == true){
							if(f.creator !== undefined && f.creator != null && f.creator != '' && f.creator != 'null' && f.creator != 'no data'){
								postValParts.push('<span class="shortened" title="'+f.creator+'">'+f.creator + '</span>');
							}
						}
						postVal = (postValParts.length > 0) ? '(' + postValParts.join(', ') + ')' : '';

						if (!f.isMultiValue || !$.isArray(theData)){
							theData = [theData];
						}

						// now - ready to produce HTML
						for (var i = 0, vl = theData.length; i < vl; ++i) {
							var d = theData[i];
							if (d.deleted && !self.editSummary.matrixEditable)
								continue;
							html += '<div>';

							if (self.editSummary.matrixEditable)
								html += '<span class="ui-icon ' + (d.deleted ? 'ui-icon-info' : 'ui-icon-circle-minus')+ ' delete-popup"></span>&nbsp;';

							html += '<a class="info-popup' + ((d.deleted) ? ' deleted' : '') + '" data-index="' + i + '" data-feature="' + fId + '" href="#">' + jT.ui.renderRange(d, f.units, 'display', preVal) + '</a>'
									+ studyType
									+ ' ' + postVal;
							html += jT.ui.getTemplate('info-ball', { href: full.compound.URI + '/study?property_uri=' + encodeURIComponent(fId), title: fId + " property detailed info"});
							html += '</div>';
						}
					}

					if (self.editSummary.matrixEditable)
						html += '<span class="ui-icon ui-icon-circle-plus edit-popup" data-feature="' + theId + '"></span>';

					return  html;
				};
			};

			for (var fId in miniset.feature) {
				var feat = miniset.feature[fId];
				if (feat.sameAs == null || feat.sameAs.indexOf("echaEndpoints.owl#") < 0)
					continue;

				var catId = jT.ambit.parseFeatureId(fId).topcategory;
				var grp = groups[catId];
				if (grp == null)
					groups[catId] = grp = [];

				if (endpoints[feat.sameAs] == null) {
					endpoints[feat.sameAs] = true;
					if (!feat.title)
						feat.title = feat.sameAs.substr(feat.sameAs.indexOf('#') + 1);
					feat.render = fRender(feat, fId);
					feat.column = { sClass: "breakable", sWidth: "80px" };
					grp.push(fId);
				}
			}

			/*
			* Sort columns alphabetically, in this case - by the category number.
			*/
			for(var grp in groups) {
				if(grp != 'Identifiers'){
					var group = groups[grp];
					group.sort(function(a,b){
						if (miniset.feature[a].title == miniset.feature[b].title) {
							return 0;
						}
						return (miniset.feature[a].title < miniset.feature[b].title) ? -1 : 1;
					});
				}
			}

			/*
			* Sort groups by the columns titles / category number.
			* Since we are trying to sort an Object keys, which is
			* itself nonsense in JavaScript, this may fail at any time.
			*/
			groupids = Object.keys(groups);

			groupids.sort(function(a, b){
				if (a == 'Identifiers') return -1;
				if (b == 'Identifiers') return 1;
				a = groups[a][0], b = groups[b][0];
				if (miniset.feature[a].title == miniset.feature[b].title)
					return 0;

				return (miniset.feature[a].title < miniset.feature[b].title) ? -1 : 1;
			})

			var newgroups = {};

			groupids.forEach(function(i, v) { newgroups[i] = groups[i]; });

			groups = newgroups;

			return groups;
		};

		var conf = $.extend(true, {}, jTConfig.matrix, config_study);

		conf.baseFeatures['#IdRow'] = { used: true, basic: true, data: "number", column: { "className": "center"}, render: function (data, type, full) {
			if (type != 'display')
				return data || 0;
			var bInfo = full.bundles[self.bundleUri];
			var tag = 'target'; // the default
			if (!!bInfo && !!bInfo.tag) {
				tag = bInfo.tag;
			}
			var html = "&nbsp;-&nbsp;" + data + "&nbsp;-&nbsp;<br/>";
			if (self.editSummary.matrixEditable) {
				html += '<button class="jt-toggle jtox-handler target' + ( (tag == 'target') ? ' active' : '') + '" data-tag="target" data-uri="' + full.compound.URI + '" data-handler="onTagSubstance" title="Select the substance as Target">T</button>' +
						'<button class="jt-toggle jtox-handler source' + ( (tag == 'source') ? ' active' : '') + '" data-tag="source" data-uri="' + full.compound.URI + '" data-handler="onTagSubstance" title="Select the substance as Source">S</button>' +
						'<button class="jt-toggle jtox-handler cm' + ( (tag == 'cm') ? ' active' : '') + '" data-tag="cm" data-uri="' + full.compound.URI + '" data-handler="onTagSubstance" title="Select the substance as Category Member">CM</button>';
			}
			else {
				tag = (tag == 'cm') ? 'CM' : tag.substr(0,1).toUpperCase();
				html += '<button class="jt-toggle active" disabled="true">' + tag + '</button>';
			}
			html += '<div><button type="button" class="ui-button ui-button-icon-only jtox-up"><span class="ui-icon ui-icon-triangle-1-n">up</span></button><br />' +
							'<button type="button" class="ui-button ui-button-icon-only jtox-down"><span class="ui-icon ui-icon-triangle-1-s">down</span></button><br /></div>'
			return html;
		} };

		conf.baseFeatures['#Tag'] = { title: 'Tag', used: false, basic: true, visibility: "main", primary: true, column: { "className": "center"}, render: function (data, type, full) {

			if (type != 'display')
				return data || 0;

			var html = "";
			var bInfo = full.component.bundles[self.bundleUri];
			if (!bInfo) {
				return html;
			}
			if (!!bInfo.tag) {
				var tag = (bInfo.tag == 'cm') ? 'CM' : bInfo.tag.substr(0,1).toUpperCase();
				html += '<button class="jt-toggle active" disabled="true"' + (!bInfo.remarks ? '' : 'title="' + bInfo.remarks + '"') + '>' + tag + '</button><br />';
			}
			if (!!bInfo.remarks && bInfo.remarks != '') {
				html += jT.ui.getTemplate('info-ball', { href: '$', title: bInfo.remarks});
			}

			return html;
		} };

		conf.baseFeatures['http://www.opentox.org/api/1.1#CASRN'].primary = true;

		var featuresInitialized = false;

		matrixKit = new jT.ui.Compound(rootEl, {
			rememberChecks: true,
			tabsFolded: true,
			showDiagrams: true,
			showUnits: false,
			hasDetails: false,
			fixedWidth: "650px",
			configuration: conf,
			featureUri: self.bundleUri + '/property',
			onPrepared: function (miniset, kit) {
				if (featuresInitialized)
					return;
				// this is when we have the features combined, so we can make the multi stuff
				var getRender = function (fId, oldData, oldRender) {
					return function (data, type, full) {
						return typeof data != 'object' ? '-' : jT.ui.renderMulti(data, type, full, function (_data, _type, _full){
							var dt = _.get(_data, (fId.indexOf('#Diagram') > 0 ? 'component.' : '') + oldData);
							return (typeof oldRender == 'function' ? oldRender(dt, _type, fId.indexOf('#Diagram') > 0 ? _data.component : _data) : dt);
						});
					};
				};

				// and now - process the multi-row columns
				for (var i = 0, mrl = self.settings.matrixMultiRows.length;i < mrl; ++i) {
					var fId = self.settings.matrixMultiRows[i];
					var mr = miniset.feature[fId];
					mr.render = getRender(fId, mr.data, mr.render);
					mr.data = 'composition';
					var col = mr.column;
					if (col == null)
						mr.column = col = { sClass: "jtox-multi" };
					else if (col.sClass == null)
						col.sClass = "jtox-multi";
					else
						col.sClass += " jtox-multi";
				}

				featuresInitialized = true;
			},

			onLoaded: function (dataset) {
				jToxCompound.processFeatures(dataset.feature, this.feature);

				// we need to process
				for (var i = 0, dl = dataset.dataEntry.length; i < dl; ++i) {
					var data = dataset.dataEntry[i];
					if (data.composition != null) {
						for (var j = 0;j < data.composition.length; ++j) {
							jToxCompound.processEntry(data.composition[j].component, dataset.feature);
						}
					}
				}
			}

		});

		return matrixKit;
	};

	MatrixKit.prototype.loadBundle = function(bundleUri) {
		var self = this;
		jT.ambit.call(self, bundleUri, function (bundle) {
			if (!!bundle) {
				bundle = bundle.dataset[0];
				self.bundleUri = bundle.URI;
				self.bundle = bundle;

				if (!!self.createForm) {

					jT.ui.updateTree(self.createForm, bundle, self.settings.formatters);

					$('#status-' + bundle.status).prop('checked', true);

					self.starHighlight($('.data-stars-field div', self.createForm)[0], bundle.stars);
					self.createForm.stars.value = bundle.stars;

					// now take care for enabling proper buttons on the Identifiers page
					self.createForm.assFinalize.style.display = '';
					self.createForm.assNewVersion.style.display = '';
					self.createForm.assStart.style.display = 'none';

				}

				$(self.rootElement).tabs('enable', 1);

				// now request and process the bundle summary
				jT.ambit.call(self, bundle.URI + "/summary", function (summary) {
					if (!!summary) {
						for (var i = 0, sl = summary.facet.length; i < sl; ++i) {
							var facet = summary.facet[i];
							self.bundleSummary[facet.value] = facet.count;
						}
					}
					self.updateTabs();
				});

				// self.initUsers();

				$('#open-report').prop('href', self.settings.baseUrl + '/ui/assessment_report?bundleUri=' + encodeURIComponent(self.bundleUri));
				$('#export-substance').prop('href', self.bundleUri + '/substance?media=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
				$('#export-initial-matrix').prop('href', self.bundleUri + '/dataset?media=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
				$('#export-working-matrix').prop('href', self.bundleUri + '/matrix?media=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

				jT.fireCallback(self.settings.onLoaded, self);
			}
		});
	};

	MatrixKit.prototype.updateTabs = function () {
		// This routine ensures the wizard-like advacement through the tabs
		var theSummary = this.bundleSummary;
		$('li>a.jtox-summary-entry', this.rootElement).each(function () {
			var cnt = theSummary[$(this).data('summary')],
				html = this.innerHTML;
			$(this).html(jT.ui.updateCounter(html, cnt));
		});
		$(this.rootElement).tabs(this.bundleSummary.compound > 0 ? 'enable' : 'disable', 2);
		$(this.rootElement).tabs(this.bundleSummary.substance > 0 ? 'enable' : 'disable', 3);
		$(this.rootElement).tabs(this.bundleSummary.property > 0 ? 'enable' : 'disable', 4);
		if (this.bundleSummary.matrix > 0) {
			$('#xfinal').button('enable');
			$(this.rootElement).tabs('enable', 5);
		}
		else
			$('#xfinal').button('disable');
	};

	/********************** Some check/tag/etc. handlers */
	MatrixKit.prototype.tagStructure = function (el$) {
		var tag = el$.data('tag'),
			row$ = el$.closest('tr'),
			full = jT.tables.getRowData(row$),
			note$ = $('td textarea.remark', row$),
			toAdd = !el$.hasClass('active'),
			self = this;

		this.pollAmbit('/compound', 'PUT', {
			compound_uri: full.compound.URI,
			command: toAdd ? 'add' : 'delete',
			tag: tag,
			remarks: toAdd ? note$.val() : ''
		}, el$, function (result) {
			if (result) {
				if (!toAdd) {
					delete full.bundles[self.bundleUri];
					self.bundleSummary.compound--;
				}
				else if (self.bundleUri in full.bundles) {
					full.bundles[self.bundleUri].tag = tag;
					self.bundleSummary.compound++;
				}
				else {
					full.bundles[self.bundleUri] = { tag: tag, }
					self.bundleSummary.compound++;
				}
					
				self.updateTaggedEntry(row$[0], full, full.index);
				self.updateTabs();
			}
		});
	};

	MatrixKit.prototype.reasonStructure = function (el$) {
		var full = jT.tables.getRowData(el$),
			bInfo = full.bundles[this.bundleUri],
			self = this;

		if (!bInfo)
			console.warn('Empty bundle info came for: ' + JSON.stringify(full));
		else
			this.pollAmbit('/compound', 'PUT', {
				compound_uri: full.compound.URI,
				command: 'add',
				tag: bInfo.tag,
				remarks: el$.val()
			}, el$, function (result) {
				if (result) {
					full.bundles[self.bundleUri].remarks = el$.val();
					self.updateTaggedEntry(el$.closest('tr')[0], full, full.index);	
				}
			});
	};


	MatrixKit.prototype.selectSubstance = function (el$) {
		var uri = jT.tables.getCellData(el$),
			self = this,
			toAdd = el$.prop('checked');

		this.pollAmbit('/substance', 'PUT', { substance_uri: uri, command: toAdd ? 'add' : 'delete' }, el$, function (result) {
			if (!result) // i.e. need to revert on failure
				el$.prop('checked', !toAdd);
			if (toAdd)
				self.bundleSummary.substance++;
			else
				self.bundleSummary.substance--;
			self.updateTabs();
		});
	};

	MatrixKit.prototype.selectEndpoint = function (el$) {
		var full = jT.tables.getRowData(el$),
			toAdd = el$.prop('checked'),
			self = this;

		this.pollAmbit('/property', 'PUT', {
			topcategory: full.subcategory,
			endpointcategory: full.endpoint,
			command: toAdd ? 'add' : 'delete'
		}, el$, function (result) {
			if (!result)  // i.e. need to revert on failure
				el$.prop('checked', toAdd);
			else if (toAdd)
				self.bundleSummary.property++;
			else
				self.bundleSummary.property--;
			self.updateTabs();
		});
	};

	MatrixKit.defaults = {
		rootElement: null,
		maxStars: 10,
		studyTypeList: {},
		handlers: {
			// TODO: This is form validation handler - link it from the HTML !!!
			fieldUpdate: function (e) {
				e.preventDefault();
				e.stopPropagation();
				if (!this.bundleUri)
					return;
	
				var el = e.target,
					data = {},
					self = this;
				if (!this.validateBundleForm(e))
					return;

				data[el.name] = el.value;
				this.pollAmbit('', 'PUT', data, el, function (result) {
					// on error - request the old data
					if (!result) self.load(self.bundleUri);
				});
			},
			// Structure selection related
			structureTag: function (e) { return this.tagStructure($(e.target)); },
			structureReason: function (e) { return this.reasonStructure(el$ = $(e.target)); },
			// Substance selection related
			substanceSelect: function(e) { this.selectSubstance($(e.target)); },
			expandAll: function (e) {
				var panel = $(e.target).closest('.ui-tabs-panel');
				$('.jtox-details-open.fa-folder', panel).trigger('click')				
			},
			collapseAll: function (e) { 
				var panel = $(e.target).closest('.ui-tabs-panel');
				$('.jtox-details-open.fa-folder-open', panel).trigger('click');
			},
			// Endpoint selection related
			endpointSelect: function (e) { this.selectEndpoint($(e.target)); },
			endpointMode: function (e) {
				var bUri = encodeURIComponent(this.bundleUri),
					qUri = this.settings.baseUrl + "query/study?mergeDatasets=true&bundle_uri=" + bUri;
				if ($(e.target).attr('id') == 'erelevant')
					qUri += "&selected=substances&filterbybundle=" + bUri;
				
				this.endpointKit.query(qUri);
			},
			// Matrix / read across selection related
			matrixMode: function (e) {
				this.matrixKit.query(this.matrixModeUris($(e.target).attr('id').substr(1)));
			},
			saveMatrix: function (e) { this.saveMatrix(); },
			createWorkingCopy: function (e) { this.createWorkingCopy(); },
			substanceMove: function (e) {
				var el$ = $(e.target),
					dir = el$.data('direction'),
					data = jT.tables.getCellData(el$);

				console.log("Move [" + dir + "] with data: " + JSON.stringify(data));
			},
		},
		groups: {
			structure: {
				Identifiers: [
					"#SelectionRow",
					"http://www.opentox.org/api/1.1#Diagram",
					"#DetailedInfoRow",
					"http://www.opentox.org/api/1.1#CASRN",
					"http://www.opentox.org/api/1.1#EINECS"
				],
				Names: [
					"http://www.opentox.org/api/1.1#ChemicalName",
					"http://www.opentox.org/api/1.1#SMILES",
					"http://www.opentox.org/api/1.1#REACHRegistrationDate"
				],
				Other: [
					"http://www.opentox.org/api/1.1#Reasoning"
				]
			},
			substance: {
				Identifiers: [
					"http://www.opentox.org/api/1.1#Diagram",
					"#DetailedInfoRow",
					"http://www.opentox.org/api/1.1#CASRN",
					"http://www.opentox.org/api/1.1#EINECS",
					"http://www.opentox.org/api/1.1#ChemicalName"
				],
				Other: [
					"http://www.opentox.org/api/1.1#Reasoning",
					'#TagRow'
				]
			},
			matrix: {
				Identifiers: [
					"http://www.opentox.org/api/1.1#CASRN",
					"#SubstanceName",
					"#SubstanceUUID",
					"http://www.opentox.org/api/1.1#SubstanceDataSource",
				],
				MultiRows: [
					"#Tag",
					"http://www.opentox.org/api/1.1#Diagram",
					"#ConstituentName",
					"#ConstituentContent",
					"#ConstituentContainedAs"
				]
			}
		},
		formatters: {
			formatStatus: function (status) {
				var statuses = {
				  'draft': 'Draft Version',
				  'published': 'Final Assessment',
				  'archived': 'Archived Version'
				}
				return statuses[status];
			},
			formatDate: function (timestamp) {
				var d = new Date(timestamp),
					day = d.getDate(),
					month = d.getMonth() + 1;

				return ((day < 10) ? '0' : '') + day + '.' + ((month < 10) ? '0' : '') + month + '.' + d.getFullYear();
			}
		},
		baseFeatures: {
			"#SelectionRow" : {
				data: "bundles",
				column: { className: "center", width: "60px" },
				search: true,
				primary: true
			},
			"#TagRow" : {
				title: "Tag",
				data: "bundles",
				column: { className: "center", width: "60px" },
				search: true,
				primary: false,
				render: function (data, type, full) {
					var bInfo = data[this.bundleUri],
						bDef = defTagButtons[bInfo && bInfo.tag];

					return !bDef || type !== 'display'
						? data
						: jT.ui.fillHtml('matrix-tag-indicator', $.extend({ subject: "substance" },  bDef));
				}
			},
			"http://www.opentox.org/api/1.1#Reasoning" : {
				title: "Rationale",
				data: "compound.URI",
				search: true,
				primary: false,
				column: { width: "300px", className: "paddingless" },
				render : function(data, type, full) {
					// This `this` is available due to rebinding in the initialization step.
					var bundleInfo = full.bundles[this.bundleUri] || {};
					data = bundleInfo.tag && bundleInfo.remarks || '';
					return (type != 'display') ? data : '<textarea class="remark jtox-handler" data-handler="structureReason" placeholder="Reason for selection_" disabled="true">' + data + '</textarea>';
				}
			}
		}
	};

	jT.ui.Matrix = MatrixKit;

})(_, asSys, jQuery, jToxKit);
