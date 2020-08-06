/* QueryKit - Universal query widget, that can work with any kit (study or compound) inside. Migrated.
 *
 * Copyright 2012-2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan Georgiev
 **/

(function (_, $, jT) {
	var queries = {
		'auto': "/query/compound/search/all",
		'uri': "/query/compound/url/all",
		'similarity': "/query/similarity",
		'smarts': "/query/smarts"
	};

	function QueryKit(settings) {
		this.settings = $.extend(true,  QueryKit.defaults, settings);
		$(this.rootElement = settings.target)
			.addClass('jtox-toolkit') // to make sure it is there even in manual initialization.
			.append(jT.ui.fillTemplate('kit-query-all', this.settings));

		this.search = {
			mol: "",
			type: "",
			queryType: "auto"
		};

		var form = $('form', this.rootElement)[0];
		form.onsubmit = function () { return false; };

		// go for buttonset preparation, starting with hiding / removing passed ones
		if (!!this.settings.hideOptions) {
			var hideArr = this.settings.hideOptions.split(',');
			for (var i = 0; i < hideArr.length; ++i) {
				$('#search' + hideArr[i], this.rootElement).remove();
				$('label[for="search' + hideArr[i] + '"]', this.rootElement).remove();
			}
		}

		if (!!form.searchcontext) {
			form.searchcontext.value = this.settings.contextUri;
			$(form.searchcontext).on('change', function (e) {
				this.settings.contextUri = this.value;
			});
		}

		// when we change the value here - all, possible MOL caches should be cleared.
		var self = this;
		$(form.searchbox).on('change', function () { self.setAuto(); });

		if (this.settings.slideInput)
			$(form.searchbox)
				.on('focus', function () {
					var gap = $(form).width() - $(radios).width() - 30 - $('.search-pane').width();
					var oldSize = $(this).data('oldSize') || $(this).width();
					$(this).data('oldSize', oldSize);
					$(this).css('width', '' + (oldSize + gap) + 'px');
				})
				.on('blur', function () {
					$(this).css('width', '');
				});

		var hasAutocomplete = false;
		if ($('#searchuri', this.rootElement).length > 0) {
			hasAutocomplete = true;
			$(form.searchbox).autocomplete({
				minLength: 2,
				open: function () {
					$(this).removeClass("ui-corner-all").addClass("ui-corner-top");
				},
				close: function () {
					$(this).removeClass("ui-corner-top").addClass("ui-corner-all");
				},
				source: function (request, response) {
					jT.ambit.call(this, '/dataset?search=^' + request.term, function (result) {
						response(!result ? [] : $.map(result.dataset, function (item) {
							var pos = item.URI.lastIndexOf("/"),
								shortURI = (pos >= 0) ? "D" + item.URI.substring(pos + 1) + ": " : "";
							return {
								label: shortURI + item.title,
								value: item.URI
							};
						}));
					});
				}
			});
		}

		var radios = $('.jq-buttonset', this.rootElement).buttonset();
		var onTypeClicked = function () {
			form.searchbox.placeholder = $(this).data('placeholder');
			$('.search-pane .auto-hide', self.rootElement).addClass('hidden');
			$('.search-pane .' + this.id, self.rootElement).removeClass('hidden');
			self.search.queryType = this.value;
			if (this.value == 'uri') {
				$(form.drawbutton).addClass('hidden');
				if (hasAutocomplete)
					$(form.searchbox).autocomplete('enable');
			} else {
				$(form.drawbutton).removeClass('hidden');
				if (hasAutocomplete)
					$(form.searchbox).autocomplete('disable');
			}
		};

		$('.jq-buttonset input', this.rootElement).on('change', onTypeClicked);

		var typeEl = $('#search' + this.settings.option, this.rootElement)[0];
		if (typeEl != null)
			$(typeEl).trigger('click');
		else
			jT.fireCallback(onTypeClicked, $('.jq-buttonset input', this.rootElement)[0])

		// spend some time to setup the SMARTS groups
		if (!!window[this.settings.smartsList]) {
			var list = window[this.settings.smartsList];
			var familyList = [];
			var familyIdx = {};

			for (var i = 0, sl = list.length; i < sl; ++i) {
				var entry = list[i];
				if (familyIdx[entry.family] === undefined) {
					familyIdx[entry.family] = familyList.length;
					familyList.push([]);
				}

				familyList[familyIdx[entry.family]].push(entry);
			}

			// now we can iterate over them
			var df = document.createDocumentFragment();
			for (fi = 0, fl = familyList.length; fi < fl; ++fi) {
				var grp = document.createElement('optgroup');
				grp.label = familyList[fi][0].family;

				for (i = 0, el = familyList[fi].length; i < el; ++i) {
					var e = familyList[fi][i];
					var opt = document.createElement('option');
					opt.innerHTML = e.name;
					opt.value = e.smarts;
					if (!!e.hint)
						$(opt).attr('data-hint', e.hint);
					grp.appendChild(opt);
				}
				df.appendChild(grp);
			}

			// now it's time to add all this and make the expected behavior
			form.smarts.appendChild(df);
			form.smarts.firstElementChild.checked = true;

			$(form.smarts).on('change', function () {
				var hint = $(this[this.selectedIndex]).data('hint');
				form.smarts.title = (!!hint ? hint : '');
				self.setAuto(this.value);
			});
		}

		// Now, deal with KETCHER - make it show, attach handlers to/from it, and handlers for showing/hiding it.
		var ketcherBox = $('.ketcher', this.rootElement)[0];
		var ketcherReady = false;
		var onKetcher = function (service, method, async, parameters, onready) {
			if (service == "knocknock")
				onready("You are welcome!", null);
			else
				jT.ambit.call(self.queryKit.kit(), '/ui/' + service, {
					dataType: "text",
					data: parameters
				}, function (res, jhr) {
					onready(res, jhr);
				});
		};

		var ensureKetcher = function () {
			if (!ketcherReady) {
				jT.insertTool('ketcher', ketcherBox);
				ketcher.init({
					root: ketcherBox,
					ajaxRequest: onKetcher
				});

				var emptySpace = $('.toolEmptyCell', ketcherBox)[0];
				// TODO: Change the button template - provide the text and classes!!
				$(emptySpace.appendChild(jT.getTemplate('button-icon', {
					title: "Use ",
					icon: "arrowthick-1-n"
				}))).on('click', function () {
					var smiles = ketcher.getSmiles();
					var mol = ketcher.getMolfile();
					self.setMol(mol);
					if (!!smiles)
						form.searchbox.value = smiles;
				});
				$(emptySpace.appendChild(jT.getTemplate('button-icon', {
					title: "Draw ",
					icon: "arrowthick-1-s"
				}))).on('click', function () {
					ketcher.setMolecule(self.search.mol || form.searchbox.value);
				});
				ketcherReady = true;
			}
		};

		$(form.drawbutton).on('click', function () {
			if ($(ketcherBox).hasClass('shrinken')) {
				ensureKetcher();
				$(ketcherBox).css('display', '');
			} else
				setTimeout(function () {
					$(ketcherBox).css('display', 'none');
				}, 500);

			setTimeout(function () {
				$(ketcherBox).toggleClass('shrinken')
			}, 50);
		});

		// finally - parse the URL-passed parameters and setup the values appropriately.
		var doQuery = false;
		if (!!this.settings.b64search) {
			this.setMol($.base64.decode(this.settings.b64search));
			doQuery = true;
		} else if (!!this.settings.search) {
			this.setAuto(this.settings.search);
			doQuery = true;
		}

		// and very finally - install the handlers...
		jT.tables.installHandlers(this);
		doQuery && this.settings.initialQuery && this.query();
	};

	QueryKit.prototype.getMainKit = function () {
		if (!!this.mainKit)
			;
		else if (typeof this.settings.mainKit === 'string')
			this.mainKit = jT.ui.kit($(this.settings.mainKit));
		else
			this.mainKit = jT.ui.kit(this.settings.mainKit);
		
		return this.mainKit;
	};

	// required from jToxQuery - this is how we add what we've collected
	QueryKit.prototype.query = function (needle) {
		if (!!needle)
			this.setAuto(needle);
		
		var uri = _.trimEnd(jT.formBaseUrl(this.settings.datasetUri || this.getMainKit().datasetUri), '/'),
			form = $('form', this.rootElement)[0],
			params = { type: this.search.type },
			type = this.search.queryType;

		if (type === "auto" && params.type === 'auto' && form.searchbox.value.indexOf('http') == 0)
			type = "uri";

		uri += queries[type] + '?';

		if (!!this.search.mol) {
			params.b64search = $.base64.encode(this.search.mol);
		} else {
			params.search = form.searchbox.value;
			if (!params.search)
				params.search = this.settings.defaultNeedle;
			this.setAuto(params.search);
		}

		if (type === 'auto' && form.regexp.checked)
			params.condition = "regexp";
		else if (type === 'smarts')
			params.filterBySubstance = form.smartsbysubstance.checked;
		else if (type === 'similarity') {
			params.threshold = form.threshold.value;
			params.filterBySubstance = form.similaritybysubstance.checked;
		}

		if (!!this.settings.contextUri)
			params['datasetUri'] = this.settings.contextUri;

		uri = jT.addParameter(uri, $.param(params));
		this.getMainKit().query(uri);
	};

	QueryKit.prototype.getNeedle = function () {
		return this.search.type == 'mol' ? this.search.mol : $('form', this.rootElement)[0].searchbox.value;
	};

	QueryKit.prototype.setAuto = function (needle) {
		this.search.mol = null;
		this.search.type = 'auto';

		var box = $('form', this.rootElement)[0].searchbox;
		if (!!this.search.oldplace)
			box.placeholder = this.search.oldplace;
		if (needle != null)
			box.value = needle;
	};

	QueryKit.prototype.setMol = function (mol) {
		var box = $('form', this.rootElement)[0].searchbox;
		this.search.mol = mol;
		this.search.type = 'mol';
		this.search.oldplace = box.placeholder;

		box.placeholder = "MOL formula saved_";
		box.value = '';
	};
	// end of prototype

	QueryKit.defaults = { // all settings, specific for the kit, with their defaults. These got merged with general (jToxKit) ones.
		defaultNeedle: '50-00-0', // which is the default search string, if empty one is provided
		smartsList: 'funcgroups', // which global JS variable to seek for smartsList
		hideOptions: '', // comma separated list of search options to hide
		slideInput: false, // whether to slide the input, when focussed
		contextUri: null, // a search limitting contextUri - added as datasetUri parameter
		initialQuery: false, // whether to perform an initial query, immediatly when loaded.
		configuration: {
			handlers: {
				query: function (e) { this.query(); },
			}
		}
	};


	jT.ui.Query = QueryKit;
})(_, jQuery, jToxKit);
