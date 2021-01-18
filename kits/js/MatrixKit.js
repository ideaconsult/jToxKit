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
		},
		'?': {
			code: '?',
			tag: 'ukn',
			name: 'Unspecified'
		}
	};

	function MatrixKit(settings) {
		var self = this;

		$(this.rootElement = settings.target).addClass('jtox-toolkit'); // to make sure it is there even when manually initialized
		jT.ui.putTemplate('all-matrix', ' ? ', this.rootElement);

		this.settings = $.extend(true, { baseFeatures: jT.ambit.baseFeatures }, MatrixKit.defaults, settings);
		jT.ui.rebindRenderers(this, this.settings.baseFeatures, true);
		this.reboundHandlers = _.defaults(
			_.mapValues(this.settings.handlers, function (hnd) {  return _.bind(hnd, self); }), 
			jT.tables.commonHandlers);
		jT.ui.installHandlers(this, this.rootElement, this.reboundHandlers);

		_.defaults(this.settings.formatters, jT.ambit.formatters)		

		this.bundleSummary = {
			compound: 0,
			substance: 0,
			property: 0,
			matrix: 0
		};
		this.matrixGroups = null;

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
			disabled: [1, 2, 3, 4, 5],
			heightStyle: "content",
			select: function(event, ui) { loadPanel(ui.panel); },
			activate: function(event, ui) { ui.newPanel && loadPanel(ui.newPanel[0]); },
			create: function(event, ui) { ui.panel && loadPanel(ui.panel[0]); }
		});

		$('.jq-buttonset', this.rootElement).buttonset();

		this.onIdentifiers(null, $('#jtox-identifiers', this.rootElement)[0]);
		
		// finally, if provided - load the given bundleUri
		if (this.settings.bundleUri)
			this.loadBundle(this.settings.bundleUri);

		return this;
	};

	MatrixKit.prototype.loadBundle = function(bundleUri) {
		var self = this;

		jT.ambit.call(self, bundleUri, function (bundle) {
			if (!!bundle) {
				bundle = bundle.dataset[0];
				self.bundleUri = bundle.URI;
				self.bundle = bundle;
				self.baseUrl = self.settings.baseUrl = jT.formBaseUrl(self.bundleUri);

				if (!!self.createForm) {
					jT.ui.updateTree(self.createForm, bundle, self.settings.formatters);

					$('#status-' + bundle.status).prop('checked', true);

					self.starHighlight($('.data-stars-field div', self.createForm)[0], bundle.stars);
					self.createForm.stars.value = bundle.stars;

					// now take care for enabling proper buttons on the Identifiers page
					$(self.createForm.assFinalize).show();
					$(self.createForm.assNewVersion).show();
					$(self.createForm.assStart).hide();
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

				self.loadUsers();

				jT.fireCallback(self.settings.onLoaded, self);
			}
		});
	};

	/************** SOME HELPER ROUTINES ***************/
	MatrixKit.prototype.beginAmbitCall = function (subject) {
		return new jBox("Notice", {
			animation: "flip",
			color: 'green',
			content: this.settings.language.tasks[subject + '.progress'] || subject,
			delayOnHover: true,
			delayClose: 1000,
			showCountdown: false,
			offset: { y: 50 }
		});
	};

	MatrixKit.prototype.endAmbitCall = function (subject, box, jhr) {
		box.setContent(jhr.status !== 200 
			? '<span style="color: #d20">' + (this.settings.language.tasks[subject + '.error'] || "Error on saving " + subject + "!") + '</span>'
			: (this.settings.language.tasks[subject + '.done'] || (subject + " saved.") | 'Saved.'));
	};

	MatrixKit.prototype.pollAmbit = function (service, ajax, el, cb) {
		var subject = 'bundle',
			self = this;
		if (!el)
			;
		else if (typeof el === 'string')
			subject = el;
		else
			subject = $(el).addClass('loading').data('subject') || 'bundle';

		var box = this.beginAmbitCall(subject);
		jT.ambit.call(this, (this.bundleUri || '') + service, ajax, jT.ambit.taskPoller(this, function (result, jhr) {
			el && $(el).removeClass('loading');
			self.endAmbitCall(subject, box, jhr);

			if (typeof cb === 'function')
				return cb(result);
		}));
	},

	MatrixKit.prototype.getTagButtonsRenderer = function (subject) {
		var self = this;
		return function (data, type, full) {
			return (type !== 'display') ? data : jT.ui.fillHtml('matrix-tag-buttons', { 
				subject: subject,
				tag: (data[self.bundleUri] || {}).tag || ''
			 });
		};
	};

	MatrixKit.prototype.getMoveRenderer = function (subject, innerRender) {
		return function (data, type, full) {
			if (type !== 'display')
				return data;

			var els = [];
			// Up arrow
			els.push(jT.ui.fillHtml('matrix-sel-arrow', { subject: subject, direction: 'up' }));

			// The given inner renderer - usually the number.
			if (typeof innerRender === 'function')
				els.push(innerRender(data, type, full));

			// The downarrow
			els.push(jT.ui.fillHtml('matrix-sel-arrow', { subject: subject, direction: 'down' }));

			// Join and return all of them.
			return els.join('<br/>');
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

	MatrixKit.prototype.loadUsers = function () {
		var self = this;
			makeReq = function (mode, field) {
				jT.ambit.call(self, self.settings.baseUrl + "myaccount/users?mode=" + mode + "&bundle_uri=" + encodeURIComponent(self.bundleUri), function (users) {
					field.tokenfield('setTokens', _.map(users, function (u) { return { value: u.id, label: u.name }; }))
				});
			};

		makeReq('R', $('#users-read'));
		makeReq('W', $('#users-write'));
	};

	/************************ TAB INITIALIZATION ROUTINES **************/
	MatrixKit.prototype.onIdentifiers = function (id, panel) {
		var self = this;
		if (!panel || $(panel).hasClass('initialized'))
			return;

		$(panel).addClass('initialized');

		// Customize the language parts.
		$('.label-box label', panel).each(function () {
			var opts = self.settings.language.labels[this.htmlFor];

			if ( opts == null)
				;
			else if (typeof opts === 'string')
				this.innerHTML = opts;
			else if (typeof opts === 'object') {
				if (opts.action === 'hide')
					$(this).closest('.label-box').hide();
			}
		});
		self.createForm = $('form', panel)[0];

		self.createForm.onsubmit = function (e) {
			e.preventDefault();
			e.stopPropagation();

			if (jT.validateForm(self.createForm)) {
				this.bundleUri = null;
				self.pollAmbit(self.settings.baseUrl + 'bundle', 
					{ method: 'POST', data: $(self.createForm).serializeArray()}, 
					$(e.currentTarget),
					function (result, jhr) {
						if (!!result) {
							jT.addHistory(jT.addParameter(window.location.href, 'bundleUri=' + encodeURIComponent(result.uri)), 'Bundle editing');
							self.loadBundle(result.uri);
						} else {
							// TODO: report an error
							console.log("Error on creating bundle [" + jhr.status + "]: " + jhr.statusText);
						}
					}
				);
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

		$(self.createForm.assFinalize).hide();
		$(self.createForm.assNewVersion).hide();

		var starsEl = $('.data-stars-field', self.createForm)[0];
		starsEl.innerHTML += jT.ui.putStars(self, 0, "Assessment rating");
		$('span.fa-star', starsEl)
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
			if (!self.bundleUri || !jT.validateForm(self.createForm) || $(this).hasClass('ignore-auto'))
				return;
			
			e.preventDefault();
			e.stopPropagation();

			var data = {};

			data[this.name] = this.value;
			self.pollAmbit('', { method: 'PUT', data: data }, $(this), function (result) {
				if (!result) // i.e. on error - request the old data
					self.loadBundle(self.bundleUri);
			});
		});

		var link = $('#source-link')[0], $source = $('#source');
		link.href = $source[0].value;
		$source.on('change', function() { link.href = this.value; });

		// Finally, initialize the users handling part
		var UserEditor = a$(jT.AutocompleteWidget, jT.UserWidget);
		$('.jtox-users-select', this.rootElement).each(function () {
			(new UserEditor({
				target: this,
				baseUrl: self.settings.baseUrl,
				tokenMode: true,
				extraParam: 'bundle_number=' + (self.bundle && self.bundle.number),
				permission: $(this).data('permission')
			})).init();
		});
	};

	// called when a sub-action in structures selection tab is called
	MatrixKit.prototype.onStructures = function (id, panel) {
		if (!this.queryKit) {
			var self = this,
				selColDef = jT.tables.insertRenderer(
					this.settings.baseFeatures['#SelectionCol'],
					this.getTagButtonsRenderer('structure'),
					{ separator: '<br/>' });

			this.browserKit = jT.ui.initKit($('#struct-browser'), {
				baseUrl: this.settings.baseUrl,
				baseFeatures: _.defaults({ '#SelectionCol': selColDef }, this.settings.baseFeatures),
				groups: this.settings.groupSets.structure,
				handlers: this.reboundHandlers,
				formatters: this.settings.formatters,
				columns: this.settings.columns,
				onLoaded: function (dataset) {
					if (self.queryKit.queryType() === 'selected') {
						self.bundleSummary.compound = dataset.dataEntry.length;
						self.updateTabs();
					}
				},
				onComplete: function () {
					if (typeof self.loadedMonitor === 'function')
						self.loadedMonitor('structure', self.browserKit, self.browserKit.dataset);
				},
				onDetails: function (substRoot, data) {
					var baseUrl = jT.formBaseUrl(this.datasetUri);
					new jT.ui.Substance({
						baseUrl: this.baseUrl,
						target: substRoot,
						substanceUri: baseUrl + 'substance?type=related&compound_uri=' + encodeURIComponent(data.compound.URI),
						showControls: false,
						onLoaded: null,
						onRow: null,
						handlers: self.reboundHandlers,
						onDetails: function (studyRoot, data) {
							new jT.ui.Study({
								baseUrl: this.settings.baseUrl,
								target: studyRoot,
								substanceUri: data.URI,
							});
						}
					});
				}
			});

			var customSelected = false;
			this.queryKit = jT.ui.initKit($('#struct-query'), {
				mainKit: this.browserKit,
				onSelected: function (form, type) {
					if (type == 'selected')
						customSelected = true;
					else if (customSelected) { // the normal queries.
						this.query();
						customSelected = false;
					}
				},
				customSearches: {
					selected: {
						title: "Selected",
						description: "List selected structures",
						onSelected: function (form) {
							$('div.search-pane', form).hide();
							self.browserKit.query(self.bundleUri + '/compound');
						}
					}
				}
			});
		}

		// Make this query only on organic calls, i.e. - from UI
		if (panel)
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
				groups: this.settings.groupSets.substance,
				formatters: this.settings.formatters,
				handlers: this.reboundHandlers,
				columns: this.settings.columns,
				onComplete: function () {
					if (typeof self.loadedMonitor === 'function')
						self.loadedMonitor('substance', self.substanceKit);
				},
				onDetails: function (substRoot, data) {
					var baseUrl = jT.formBaseUrl(this.datasetUri),
						substanceUri = baseUrl + 'substance?type=related&addDummySubstance=true&compound_uri=' + encodeURIComponent(data.compound.URI) + 
							'&filterbybundle=' + encodeURIComponent(self.bundleUri) + 
							'&bundle_uri=' + encodeURIComponent(self.bundleUri);
					new jT.ui.Substance({
						baseUrl: baseUrl,
						target: substRoot,
						substanceUri: substanceUri,
						showDiagrams: true,
						handlers: self.reboundHandlers,
						embedComposition: true,
						showControls: false,
						onDetails: null,
						columns: { substance: { 'Id': idCol } },
						onComplete: function () {
							// The actual counting happens in the onRow, because it is conditional.
							self.updateTabs();

							if (typeof self.loadedMonitor === 'function')
								self.loadedMonitor('relation', self.substanceKit);
						},
						onRow: function (row, data, index) {
							if (!data.bundles) return;

							// Make sure the checked state corresponds to the substance selection state
							var bInfo = data.bundles[self.bundleUri];

							$('input.jtox-handler', row).prop('checked', !!bInfo && bInfo.tag == "selected");
						},
					});
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

		// Make the initial call only on organic calls, i.e. - from UI
		if (panel)
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
				handlers: this.reboundHandlers,
				formatters: this.settings.formatters,
				showMultiselect: true,
				columns: $.extend({  
					endpoint: { 'Id': idCol } 
				},this.settings.columns),
				onRow: function (row, data, index) {
					if (!data.bundles)
						return;
					var bundleInfo = data.bundles[self.bundleUri];
					$('input.jtox-handler', row).prop('checked', !!bundleInfo && bundleInfo.tag == "selected");
				}
			});
		}
		// The auto-init has taken care to have a query initiated.
		// NOTE: This method is invoked from `onMatrix` to make sure `this.endpointKit` is initialized.
	};

	MatrixKit.prototype.saveMatrixEdit = function (edit, subject) {
		if (!edit)
			return;

		var self = this;

		// make two nested calls - for adding and for deleting
		this.pollAmbit('/matrix' + ('effects_to_delete' in edit ? '/deleted' : ''), { 
			method: 'PUT', 
			data: JSON.stringify({ study: edit }),
			contentType: 'application/json'
		}, subject, function (result) {
			self.queryMatrix('working');
		});
	},

	MatrixKit.prototype.queryMatrix = function (mode) {
		var panel = $('#jtox-matrix'),
			queryPath = mode == 'initial' ? '/dataset?mergeDatasets=true' : '/matrix/' + mode,
			editable = mode == 'working';

		// Make sure the buttons reflect the reality!
		if (mode == 'initial' || this.bundleSummary.matrix > 0) {
			$('.jtox-toolkit', panel).show();
			$('.create-button', panel).hide();
		} else {
			$('.jtox-toolkit', panel).hide();
			$('.create-button', panel).show();
		}

		// And, make the call!
		this.matrixEditable = editable;
		this.matrixKit.query(this.bundleUri + queryPath, this.resetFeatures);
		this.resetFeatures = false;
	};

	MatrixKit.prototype.getFeatureRenderer = function (kit, feat, theId) {
		var self = this;

		return function (data, type, full) {
			if (type != 'display')
				return jT.simplifyValues(data);

			var html = '';
			for (var fId in kit.dataset.feature) {
				var f = kit.dataset.feature[fId];
				if (f.sameAs != feat.sameAs || data[fId] == null)
					continue;

				var catId = jT.ambit.parseFeatureId(fId).category,
					config = $.extend(true, {}, kit.settings.columns["_"], kit.settings.columns[catId]),
					theData = data[fId],
					preVal = (_.get(config, 'effects.endpoint.bVisible') !== false) ? "<strong>" + f.title + "</strong>" : null,
					// preVal = [preVal, f.source.type].filter(function(value){return value!==null}).join(' : '),
					studyType = "&nbsp;<span class='fa " + (f.isModelPredictionFeature ? "fa-calculator" : "fa-tag") + "' title='" + f.source.type + "'></span>",
					postVal = '', postValParts = [], parameters = [], conditions = [];

				for (var i = 0, l = f.annotation.length; i < l; i++){
					var a = f.annotation[i];
					if ( a.type == 'conditions' && _.get(config, 'conditions["' + a.p.toLowerCase() + '"].inMatrix', false) == true ) {
						var t = _.get(config, 'conditions["' + a.p.toLowerCase() + '"].sTitle', '') || a.p;
						conditions.push(t + ' = ' + a.o);
					} else if (a.type == 'parameters') {
						parameters.push(a.o);
					}
				}
				if (parameters.length > 0)
					postValParts.push('<span>' + parameters.join(', ') + '</span>');
				if (conditions.length > 0)
					postValParts.push('<span>' + conditions.join(', ') + '</span>');
				if (_.get(config, 'protocol.guideline.inMatrix', false) && !!f.creator && f.creator != 'null' &&  f.creator != 'no data')
					postValParts.push('<span class="shortened" title="'+f.creator+'">' + f.creator + '</span>');
				
				postVal = (postValParts.length > 0) ? '(' + postValParts.join(', ') + ')' : '';

				if (!f.isMultiValue || !Array.isArray(theData))
					theData = [theData];

				// now - ready to produce HTML
				for (var i = 0, vl = theData.length; i < vl; ++i) {
					var d = theData[i];
					if (d.deleted && !self.matrixEditable)
						continue;
					html += '<div class="feature-entry" data-feature="' + fId + '" data-index="' + i + '">';

					if (self.matrixEditable)
						html += '<span class="fa ' + (d.deleted ? 'fa-info' : 'fa-minus-circle')+ ' fa-action jtox-handler" data-handler="openPopup" data-action="delete"></span>&nbsp;';

					html += '<a class="' + ((d.deleted) ? 'deleted' : '') + ' jtox-handler" data-handler="openPopup" data-action="info" href="#">' + jT.ui.renderRange(d, f.units, 'display', preVal) + '</a>'
						+ studyType
						+ ' ' + postVal;
					html += jT.ui.fillHtml('info-ball', { href: full.compound.URI + '/study?property_uri=' + encodeURIComponent(fId), title: fId + " property detailed info"});
					html += '</div>';
				}
			}

			if (self.matrixEditable)
				html += '<span class="fa fa-plus-circle fa-action feature-entry jtox-handler" data-handler="openPopup" data-action="add" data-feature="' + theId + '"></span>';

			return html;
		};
	};

	MatrixKit.prototype.getMatrixGrouper = function () {
		var self = this;

		return function(miniset, kit) {
			var groups = { "Identifiers" : self.settings.groupSets.matrix.Identifiers },
				endpoints = {};

			for (var fId in miniset.feature) {
				var feat = miniset.feature[fId];
				if (feat.sameAs == null || feat.sameAs.indexOf("echaEndpoints.owl#") < 0)
					continue;

				var catId = jT.ambit.parseFeatureId(fId).topcategory,
					grp = groups[catId];
				if (grp == null)
					groups[catId] = grp = [];

				if (endpoints[feat.sameAs] == null) {
					endpoints[feat.sameAs] = true;
					if (!feat.title)
						feat.title = feat.sameAs.substr(feat.sameAs.indexOf('#') + 1);

					feat.data = 'values';
					feat.render = self.getFeatureRenderer(kit, feat, fId);
					feat.column = { className: "breakable", width: "80px", orderable: false };
					grp.push(fId);
				}
			}

			/*
			* Sort columns alphabetically, in this case - by the category number.
			*/
			for(var grp in groups) {
				if(grp != 'Identifiers') {
					groups[grp].sort(function(a, b) {
						return miniset.feature[a].title == miniset.feature[b].title 
							? 0
							: (miniset.feature[a].title < miniset.feature[b].title) 
								? -1 
								: 1
					});
				}
			}

			return groups;
		};
	};

	MatrixKit.prototype.openFeatureBox = function (action, el) {
		var featureId = el.data('feature'),
			valueIdx = el.data('index'),
			data = jT.tables.getRowData(el),
			feature = _.extend({ id: jT.ambit.parseFeatureId(featureId) }, this.matrixKit.dataset.feature[featureId]);
			boxOptions = {
				title: feature.title || feature.id.category || "Endpoint",
				closeButton: "box",
				closeOnEsc: true,
				overlay: true,
				closeOnClick: "body",
				addClass: "jtox-toolkit " + action,
				theme: "TooltipBorder",
				animation: "move",
				maxWidth: 800,
				onCloseComplete: function () { this.destroy(); }
			},
			self = this;

		if (action === 'add' || action === 'edit') {
			if (this.studyOptionsHtml == null)
				this.studyOptionsHtml = _.map(this.settings.studyTypeList, function (val, id) {
					return '<option value="' + id + '">' + val.title + '</option>';
				});

			var featureJson = {
					owner: { substance: { uuid: data.compound.i5uuid } },
					protocol: {
						topcategory: feature.id.topcategory,
						category: { code: feature.id.category },
						endpoint: feature.title,
						guideline: '' },
					citation: { year: (new Date()).getFullYear().toString() },
					parameters: { },
					interpretation: { },
					reliability: { },
					effects: {
						result: { },
						conditions: { }
					}
				},
				goAction = function () {
					// TODO: Clarify this here, regarding EDIT
					featureJson.effects = [ featureJson.effects ];
					featureJson.protocol.guideline = [ featureJson.protocol.guideline ];

					if (action === 'add')
						self.saveMatrixEdit(featureJson, 'annotation-add');
					else if (action === 'edit') // TODO: !!!
						self.editMatrixFeature(feature, valueIdx, featureJson);
				};
			

			boxOptions = $.extend(boxOptions, {
				content: this.endpointKit.getFeatureEditHtml(feature, val, {
					studyOptionsHtml: this.studyOptionsHtml
				}),
				confirmButton: "Add",
				confirm: goAction, // NOTE: Due to some bug in jBox, it appears we need to provide this one...
				onConfirm: goAction, // ... but since the Doc says `onConfirm` -> we need to have that too.
				onOpen: function () {
					jT.ui.attachEditors(self.endpointKit, this.content, featureJson, {
						ajax: {
							method: "GET",
							data: {
								'category': feature.id.category,
								'top': feature.id.topcategory,
								'max': self.endpointKit.settings.maxHits
							},
						},
						searchTerm: 'data.search'
					});
				}
			});
		} else { // info & delete
			feature.id.suffix = '*';
			var val = data.values[featureId],
				mainFeature = jT.ambit.buildFeatureId(feature.id);

			if (feature.isMultiValue && Array.isArray(val))
				val = val[valueIdx];

			if (action === 'delete' ) { 
				var ajaxData = {
						owner: { substance: { uuid: data.compound.i5uuid } },
						effects_to_delete: [{
							result: {
								idresult: val.idresult,
								deleted: true
							},
						}]
					};
				$.extend(boxOptions, {
					title: this.matrixKit.feature[mainFeature] && this.matrixKit.feature[mainFeature].title || boxOptions.title,
					content: this.endpointKit.getFeatureInfoHtml(feature, val, action !== "info"),
					confirmButton: action !== "info" ? "Delete" : "Ok",
					cancelButton: action !== "info" ? "Cancel" : "Dismiss",
					confirm: function () { self.saveMatrixEdit(ajaxData, 'annotation-delete'); },
					onConfirm: function () { self.saveMatrixEdit(ajaxData, 'annotation-delete'); },
					onOpen: function () { jT.ui.attachEditors(self.endpointKit, this.content, ajaxData); }
				});
			} else { // i.e. info
				$.extend(boxOptions, {
					target: el,
					overlay: false,
					outside: 'xy',
					title: this.matrixKit.feature[mainFeature] && this.matrixKit.feature[mainFeature].title || boxOptions.title,
					content: this.endpointKit.getFeatureInfoHtml(feature, val, action !== "info"),
				});
			}
		}

		// Finally - open it!
		new jBox(action === 'info' ? 'Tooltip' : 'Confirm', boxOptions).open();
	};

	MatrixKit.prototype.getMatrixFeatures = function() {
		var self = this,
			matrixFeatures = {},
			tagRenderer = this.getTagButtonsRenderer('substance');

		matrixFeatures['#IdRow'] = {
			primary: true,
			render: this.getMoveRenderer('substance', this.settings.baseFeatures['#IdRow'].render)
		};

		matrixFeatures['#SelectionCol'] = {
			render: function (data, type, full) {
				if (type !== 'display')
					return data;
				if (self.matrixEditable)
					return tagRenderer(data, type, full);
				else
					return self.settings.baseFeatures['#TagCol'].render(data, type, full);
			}
		};

		matrixFeatures['#TagCol'] = {
			title: '',
			primary: true,
			data: 'composition',
			column: { className: "jtox-multi" },
			render: function (data, type, full) {
				return type !== 'display'
					? _.map(data, ['component', 'bundles', self.bundleUri, 'tag']).join(',')
					: jT.tables.renderMulti(data, full, function (data) {
						return self.settings.baseFeatures['#TagCol'].render(data.component.bundles, type, data);
					});
			}
		};

		matrixFeatures['#MultiDiagram'] = {
			primary: true,
			data: 'composition',
			column: { className: "jtox-multi" },
			render: function (data, type, full) {
				return type !== 'display'
					? _.map(data, 'component.compound.URI').join(',')
					: jT.tables.renderMulti(data, full, function (data) {
						return self.settings.baseFeatures['http://www.opentox.org/api/1.1#Diagram'].render(data.component.compound.URI, type, data);
					});
			}
		};

		return _.defaultsDeep(matrixFeatures, this.settings.baseFeatures);
	};

	// called when a sub-action in bundle details tab is called
	MatrixKit.prototype.onMatrix = function (mode, panel) {
		if (!this.matrixKit) {
			var self = this,
				self = this,
				matrixRoot = $('#matrix-table');

			this.matrixKit = jT.ui.initKit(matrixRoot, {
				formatters: this.settings.formatters,
				handlers: this.reboundHandlers,
				hasDetails: false,
				groups: this.settings.groupSets.matrix,
				featureUri: this.bundleUri + '/property',
				baseFeatures: this.getMatrixFeatures(),
				groups: this.getMatrixGrouper(),
				onLoaded: function (dataset) {
					// Because of the nested data, we need to have manual processing here
					jT.ui.Compound.processFeatures(dataset.feature, this.feature);
	
					// we need to process
					for (var i = 0, dl = dataset.dataEntry.length; i < dl; ++i) {
						var data = dataset.dataEntry[i];
						if (data.composition != null) {
							for (var j = 0;j < data.composition.length; ++j) {
								jT.ui.Compound.processEntry(data.composition[j].component, dataset.feature);
							}
						}
					}
				},
				onComplete: function () {
					if (typeof self.loadedMonitor === 'function')
						self.loadedMonitor('matrix', self.matrixKit, self.matrixKit.dataset);
				},
				onRow: function (row, data, index) {
					// equalize multi-rows, if there are any
					$('td.jtox-multi .jtox-diagram .jtox-handler', row).on('click', function () {
						setTimeout(function () {
							jT.tables.equalizeHeights.apply(window, $('td.jtox-multi table tbody', row).toArray());
						}, 10);
					});
				}				
			});

			// Take care for matrix management buttons!
			$('.create-button', panel).on('click', function () {
				self.pollAmbit('/matrix/working', { method: 'POST', data: { deletematrix: false } }, $(this), function (result) {
					if (!!result) {
						$('#xfinal').button('enable');
						self.bundleSummary.matrix++;
						self.queryMatrix('working')
					}
				});
			});
		}

		// the actual initial query comes from the handlers, we just need to ask for fature reset
		this.resetFeatures = true;

		// Because we need the `this.endpointKit` one initialized!
		this.onEndpoints();
	};

	MatrixKit.prototype.onReport = function(id, panel) {
		var self = this,
			loadedTables = {},
			loadingCount = 0,
			loadingTarget = 3, // structure, substance, composition+matrix
			datasets = {},
			reportMaker = function () {
				$('.report-box', panel).html(jT.ui.fillHtml('matrix-full-report', $.extend({
					bundleId: self.bundle.id,
					dataTables: loadedTables,
				}, self.bundle), self.settings.formatters));

				// And clear the handler!
				self.loadedMonitor = null;
				loadedTables = null;
			};


		self.loadedMonitor = function (entity, kit, dataset) {
			var theTables = $('table.dataTable', kit.rootElement);
			
			++loadingCount;
			if (entity == 'matrix') {
				var compTable = jT.tables.extractTable(theTables[0]);
				loadedTables.composition = compTable.html();
				
				loadedTables.matrix = jT.tables.extractTable(theTables, { 
					transpose: true,
					stripSizes: true,
					ignoreCols: [6, 11]
				}).html();
			} else if (entity == 'substance') {
				var detailsButs = $('.jtox-details-open.jtox-handler', kit.rootElement);
				loadingTarget += detailsButs.length;
				// Save the tables now, because otherwise it'll take into account the nested ones as well.
				loadedTables.substance = $('table.dataTable', self.substanceKit.rootElement);
				setTimeout(function () { detailsButs.trigger('click'); }, 50);
			} else // i.e. structure
				loadedTables[entity] = jT.tables.extractTable(theTables).html();

			datasets[entity] = dataset;
			if (loadingCount >= loadingTarget) {
				// get the substance table now... when it's all loaded.
				loadedTables.substance = jT.tables.extractTable(loadedTables.substance).html();
				reportMaker();
			}
		};

		$('.report-box', panel).html('<h2>Preparing the report...</h2>');		
		// Make sure all kits are initialized!
		this.onStructures();
		this.onSubstances();
		this.onMatrix();

		// Initiate a query - in a very specific way for each one!
		this.queryKit.queryType('selected').query();
		this.substanceKit.query(this.bundleUri + '/compound');
		this.queryMatrix('final');

		// TODO: Work on the DOCX preparation, using datasets
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
		$(this.rootElement).tabs(this.bundleSummary.matrix > 0 ? 'enable' : 'disable', 5);
		$('#xfinal').button(this.bundleSummary.matrix > 0 ? 'enable' : 'disable');
	};

	/********************** Some check/tag/etc. handlers */
	MatrixKit.prototype.tagStructure = function (el$) {
		var tag = el$.data('tag'),
			row$ = el$.closest('tr'),
			full = jT.tables.getRowData(row$),
			toAdd = !full.bundles[this.bundleUri] || full.bundles[this.bundleUri].tag != tag,
			self = this;

		this.pollAmbit('/compound', { 
			method: 'PUT', 
			data: {
				compound_uri: full.compound.URI,
				command: toAdd ? 'add' : 'delete',
				tag: tag
			}
		}, el$, function (result) {
			if (result) {
				if (!toAdd) {
					delete full.bundles[self.bundleUri];
					self.bundleSummary.compound--;
				}
				else if (self.bundleUri in full.bundles) {
					full.bundles[self.bundleUri].tag = tag;
					full.bundles[self.bundleUri].remarks = '';
				}
				else {
					full.bundles[self.bundleUri] = { 
						tag: tag, 
						remarks: ''
					};
					self.bundleSummary.compound++;
				}

				var row = jT.tables.getTable(el$).row(full.index);
				row.invalidate().draw();
				jT.ui.installHandlers(self.browserKit, row.node());
				jT.tables.getTable(self.browserKit.varTable).row(full.index).invalidate().draw();
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
			this.pollAmbit('/compound', { 
				method: 'PUT',
				data: {
					compound_uri: full.compound.URI,
					command: 'add',
					tag: bInfo.tag,
					remarks: el$.val()
				}
			}, el$, function (result) {
				if (result) {
					full.bundles[self.bundleUri].remarks = el$.val();
					var row = jT.tables.getTable(self.browserKit.varTable).row(full.index);
					row.invalidate().draw();
					jT.ui.installHandlers(self.browserKit, row.node());
				}
			});
	};


	MatrixKit.prototype.selectSubstance = function (el$) {
		var uri = jT.tables.getCellData(el$),
			self = this,
			toAdd = el$.prop('checked');

		this.pollAmbit('/substance', { method: 'PUT', data: { substance_uri: uri, command: toAdd ? 'add' : 'delete' } }, el$, function (result) {
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

		this.pollAmbit('/property', { 
			method: 'PUT', 
			data: {
				topcategory: full.subcategory,
				endpointcategory: full.endpoint,
				command: toAdd ? 'add' : 'delete'
			}
		}, el$, function (result) {
			if (!result)  // i.e. need to revert on failure
				el$.prop('checked', !toAdd);
			else if (toAdd)
				self.bundleSummary.property++;
			else
				self.bundleSummary.property--;
			self.featuresInitialized = false;
			self.updateTabs();
		});
	};

	MatrixKit.prototype.tagSubstance = function (el) {
		var tag = $(el).data('tag'),
			data = jT.tables.getRowData(el),
			table = jT.tables.getTable(el),
			self = this;

		this.pollAmbit('/substance', { 
			method: 'PUT', 
			data: { 
				substance_uri: data.compound.URI, 
				command: 'add', 
				tag : tag 
			}
		}, el, function (result) {
			if (result)
				data.bundles[self.bundleUri].tag = tag;
			var row = table.row(data.index);
			row.invalidate().draw();
			jT.ui.installHandlers(self.matrixKit, row.node());
		});
	};

	MatrixKit.defaults = {
		rootElement: null,
		maxStars: 10,
		studyTypeList: {},
		handlers: {
			// Structure selection related
			structureTag: function (e) { return this.tagStructure($(e.currentTarget)); },
			structureReason: function (e) { return this.reasonStructure(el$ = $(e.currentTarget)); },
			// Substance selection related
			substanceSelect: function(e) { this.selectSubstance($(e.currentTarget)); },
			expandAll: function (e) {
				var panel = $(e.currentTarget).closest('.ui-tabs-panel');
				$('.jtox-details-open.fa-folder', panel).trigger('click')				
			},
			collapseAll: function (e) { 
				var panel = $(e.currentTarget).closest('.ui-tabs-panel');
				$('.jtox-details-open.fa-folder-open', panel).trigger('click');
			},
			// Endpoint selection related
			endpointSelect: function (e) { this.selectEndpoint($(e.currentTarget)); },
			endpointMode: function (e) {
				var bUri = encodeURIComponent(this.bundleUri),
					qUri = this.settings.baseUrl + "query/study?mergeDatasets=true&bundle_uri=" + bUri;
				if ($(e.currentTarget).attr('id') == 'erelevant')
					qUri += "&selected=substances&filterbybundle=" + bUri;
				
				this.endpointKit.query(qUri);
			},
			// Matrix / read across selection related
			openPopup: function (e) { 
				var el = $(e.currentTarget);
				e.preventDefault();
				e.stopPropagation();
				this.openFeatureBox(el.data('action'), el.closest('.feature-entry'));
			},
			matrixMode: function (e) { this.queryMatrix($(e.currentTarget).attr('id').substr(1)); },
			createWorkingCopy: function (e) { this.createWorkingCopy(); },
			substanceTag: function (e) { this.tagSubstance($(e.currentTarget)); },
			substanceMove: function (e) {
				var el = $(e.currentTarget),
					dir = el.data('direction'),
					theTable = jT.tables.getTable(el),
					rowData = jT.tables.getRowData(el),
					otherData = theTable.row(rowData.index + (dir == 'up' ? -1 : 1)).data(),
					varTable = jT.tables.getTable(this.matrixKit.varTable),
					tmpIdx;

				// Now, swap the indices, switch the data and redraw.
				tmpIdx = rowData.index;
				rowData.index = otherData.index;
				otherData.index = tmpIdx;

				// Note: the indices are already swapped!
				theTable.row(rowData.index).data(rowData);
				theTable.row(otherData.index).data(otherData).draw();

				// Don't forget the variable table....
				var varOtherData = varTable.row(rowData.index).data();
				varTable.row(rowData.index).data(varTable.row(otherData.index).data());
				varTable.row(otherData.index).data(varOtherData).draw();

				this.matrixKit.equalizeTables();

				// Now, reattach the handlers...
				jT.ui.installHandlers(this.matrixKit, theTable.row(rowData.index).node());
				jT.ui.installHandlers(this.matrixKit, theTable.row(otherData.index).node());
				jT.ui.installHandlers(this.matrixKit, varTable.row(rowData.index).node());
				jT.ui.installHandlers(this.matrixKit, varTable.row(otherData.index).node());
			}
		},
		groupSets: {
			structure: {
				Identifiers: [
					"#SelectionCol",
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
					'#TagCol'
				]
			},
			matrix: {
				Identifiers: [
					"#SelectionCol",
					"http://www.opentox.org/api/1.1#CASRN",
					"#SubstanceName",
					"#SubstanceUUID",
					"http://www.opentox.org/api/1.1#SubstanceDataSource",
					"#TagCol",
					"#MultiDiagram",
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
			}
		},
		language: {
			labels: {
				"title": "Assessment title",
				"maintainer": "Owner",
				"number": "Assessment ID",
				"seeAlso": "Assessment code",
				"source": "Assessment Doclink(s)",
				"license": { action: 'hide' },
				"rightsHolder": { action: 'hide' },
				"stars": { action: 'hide' }
			},
			tasks: {
				'bundle.progress' : "Changing bundle...",
				'bundle.done' : "Bundle altered.",
				'bundle.error' : "Error changing the bundle!",
				'bundle-start.progress': "Creating a new bundle...",
				'bundle-start.done': "New bundle created.",
				'bundle-start.error': "Error on creating a new bundle!",
				'bundle-finalize.progress': "Finalizing the bundle...",
				'bundle-finalize.done': "Bundle finalized.",
				'bundle-finalize.error': "Error on bundle finalizing!",
				'bundle-version.progress': "Making new version of the bundle...",
				'bundle-version.done': "New version created.",
				'bundle-version.error': "Error on creating a new version!",
				'matrix.progress': "Creating matrix working copy...",
				'matrix.done': "Matrix working copy created.",
				'matrix.error': "Error on matrix working copy creation!",
				'structure-reason.progress': "Updating structure selection reason...",
				'structure-reason.done': "Updated structure selection reason.",
				'structure-reason.error': "Error on updating structure selection reason!",
				'structure-tag.progress': "Tagging the selected structure...",
				'structure-tag.done': "Structured tagged.",
				'structure-tag.error': "Error on structure tagging!",
				'annotation-add.progress': "Adding a study annotation...",
				'annotation-add.done': "Added study annotation.",
				'annotation-add.error': "Error on adding study annotation!",
				'annotation-delete.progress': "Deleting a study annotation...",
				'annotation-delete.error': "Error on deleting study annotation!",
				'annotation-delete.done': "Study annotation deleted.",
				'substance.progress': "Updating substance selection...",
				'substance.done': "Substance selection updated.",
				'substance.error': "Error updating substance selection!",
				'substance-tag.progress': "Tagging substance...",
				'substance-tag.done': "Substance tagged.",
				'substance-tag.error': "Error on tagging substance!",
				'substance-reason.progress': "Saving substance selection reason...",
				'substance-reason.done': "Substance selection reason saved.",
				'substance-reason.error': "Error saving substance selection reason!",
				'endpoint.progress': "Updating endpoint selection...",
				'endpoint.done': "Endpoint selection updated.",
				'endpoint.error': "Error updating endpoint selection!",
			}
		},
		baseFeatures: {
			"#SelectionCol" : {
				data: "bundles",
				column: { className: "center", width: "60px" },
				search: true,
				primary: true
			},
			"#TagCol" : {
				title: "Tag",
				data: "bundles",
				column: { className: "center", width: "60px" },
				search: true,
				primary: false,
				render: function (data, type, full) {
					var bInfo = data[this.bundleUri],
						bTag = bInfo && bInfo.tag || "?",
						bDef = defTagButtons[bTag];

					return !bDef || type !== 'display'
						? bTag
						: jT.ui.fillHtml('matrix-tag-indicator', _.defaults({ subject: "substance" }, bDef));
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
					var bInfo = full.bundles[this.bundleUri] || {};
					data = bInfo.tag && bInfo.remarks || '';
					return (type != 'display') 
						? data 
						: '<textarea class="remark jtox-handler" data-handler="structureReason" data-subject="structure-reason" placeholder="Reason for selection_"' + 
							(!bInfo.tag ? ' disabled="true"': '') + '">' + 
							data + '</textarea>';
				}
			},
			"http://www.opentox.org/api/1.1#CompositionInfo" : {
				visibility: "details",
				title: "Composition",
				data: "compound.URI",
				column: { bVisible: false },
				basic: true,
				render : function(data, type, full) {
			  		return (type != "details") ? "-" : '<span class="jtox-details-composition"></span>';
				}
			},
		  	"http://www.opentox.org/api/1.1#ChemicalName" : {
				render : function(data, type, full) {
			  		// Allow longer names that are list, separated by "|", to break
			  		return data.replace(/\|/g, ' | ');
				}
		  	},
			'#SubstanceName' : {
				title: "Substance Name",
				data: "compound.name",
				primary: true,
				basic: true,
				column: { className: "breakable word-break" },
				render: function (data, type, full) {
					return data || full.compound.tradename;
				}
		  	},
			'#SubstanceUUID': {
				title: "I5UUID",
				data: "compound.i5uuid",
				primary: true,
				render: function (data, type, full) {
			  		return (type != 'display') ? data : jT.ui.shortenedData('<a target="_blank" href="' + full.compound.URI + '/study">' + data + '</a>', "Press to copy the UUID in the clipboard", data)
				}
		  	},
		  	"http://www.opentox.org/api/1.1#SubstanceDataSource": {
				title: "Data source",
				data: "compound.ownerName",
				accumulate: true,
				primary: true,
				column: { className: "breakable" }
		  	},
			"#ConstituentName": {
				title: "Constituent Name",
				data: "composition",
				accumulate: false,
				primary: true,
				column: { className: "breakable work-break jtox-multi" },
				render: function (data, type, full) {
					return type !== 'display'
						? _.map(data, "component.compound.name").join(',')
						: jT.tables.renderMulti(data, full, "component.compound.name");
				}
		  	},
		  	"#ConstituentContent": {
				title: "Content",
				data: "composition",
				accumulate: false,
				primary: true,
				column: { className: "center jtox-multi" },
				render: function (data, type, full) {
					return type !== 'display'
						? _.map(data, "proportion.typical").join(',')
						: jT.tables.renderMulti(data, full, function (data) {
							return jT.ambit.formatters.formatConcentration(data.proportion.typical);
						});
				}
		  	},
		  	"#ConstituentContainedAs": {
				title: "Contained As",
				data: "composition",
				accumulate: false,
				primary: true,
				column: { className: "center jtox-multi" },
				render: function (data, type, full) {
					return type !== 'display'
						? _.map(data, "relation").join(',')
						: jT.tables.renderMulti(data, full, function (data) {
							return '<span>' + data.relation.substring(4).toLowerCase() + '</span>' + 
								jT.ui.fillHtml('info-ball', { href: data.substance.URI + '/composition', title: data.compositionName });
						});
				}
		  	}
		}
	};

	jT.ui.Matrix = MatrixKit;

})(_, asSys, jQuery, jToxKit);
