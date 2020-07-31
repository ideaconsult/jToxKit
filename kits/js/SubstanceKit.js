/* SubstanceKit.js - A kit for browsing substances. Migrated.
 *
 * Copyright 2012-2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan (Jonan) Georgiev
 **/

(function (a$, $, jT) {

	function SubstanceKit(settings) {
		this.rootElement = settings.target;
		$(this.rootElement).addClass('jtox-toolkit'); // to make sure it is there even when manually initialized

		this.settings = $.extend(true, {}, SubstanceKit.defaults, settings);

		this.pageStart = this.settings.pageStart;
		this.pageSize = this.settings.pageSize;

		if (!this.settings.noInterface) {
			var self = this;

			if (this.settings.embedComposition && this.settings.onDetails == null) {
				this.settings.onDetails = function (root, data) {
					new jT.ui.Composition(root, $.extend({},
						self.settings,
						(typeof self.settings.embedComposition == 'object' ? self.settings.embedComposition : {}), {
							compositionUri: data.URI + '/composition'
						}
					));
				};
			}

			$(this.rootElement).append(jT.ui.bakeTemplate(jT.ui.templates['all-substance'], ' ? '));
			this.init(settings);
		}

		// finally, if provided - make the query
		if (!!this.settings.substanceUri)
			this.querySubstance(self.settings.substanceUri)
	};

	SubstanceKit.prototype.init = function (settings) {
		var self = this;

		// deal if the selection is chosen
		var colId = self.settings.columns.substance['Id'];
		if (colId) {
			jT.tables.putActions(self, colId);
			colId.title = '';
		}

		// Leave that here, because `self` is used...
		self.settings.columns.substance['Owner'].render = function (data, type, full) {
			return (type != 'display') ? data : '<a target="_blank" href="' + self.settings.baseUrl + 'substanceowner/' + full.ownerUUID + '/substance">' + data + '</a>';
		};

		var opts = { "dom": "rti" };
		if (self.settings.showControls) {
			jT.tables.bindControls(self, {
				nextPage: function () { self.nextPage(); },
				prevPage: function () { self.prevPage(); },
				sizeChange: function () { self.queryEntries(self.pageStart, parseInt($(this).val())); },
				filter: function () { $(self.table).DataTable().filter($(this).val()).draw(); }
			});

			opts['infoCallback'] = function (oSettings, iStart, iEnd, iMax, iTotal, sPre) {
				var needle = $('.filterbox', self.rootElement).val();
				$('.filtered-text', self.rootElement).html(!needle ? ' ' : ' (filtered to <span class="high">' + iTotal + '</span>) ');
				return '';
			};
		} else
			$('.jtox-controls', self.rootElement).remove();

		// again , so that changed defaults can be taken into account.
		self.settings.configuration = $.extend(true, self.settings.configuration, settings.configuration);

		// READYY! Go and prepare THE table.
		self.table = jT.tables.putTable(self, $('table', self.rootElement)[0], 'substance', opts);
	};

	SubstanceKit.prototype.queryEntries = function (from, size) {
		if (from < 0) from = 0;
		if (!size || size < 0) size = this.pageSize;

		var qStart = Math.floor(from / size),
			qUri = jT.addParameter(self.substanceUri, "page=" + qStart + "&pagesize=" + size),
			self = this;

		jT.ambit.call(self, qUri, function (result, jhr) {
			if (!result && jhr.status != 200)
				result = {
					substabce: []
				}; // empty one
			if (!!result) {
				self.pageSize = size;
				self.pageStart = from;

				for (var i = 0, rl = result.substance.length; i < rl; ++i)
					result.substance[i].index = i + from + 1;

				self.substance = result.substance;

				if (result.substance.length < self.pageSize) // we've reached the end!!
					self.entriesCount = from + result.substance.length;

				// time to call the supplied function, if any.
				jT.fireCallback(self.settings.onLoaded, self, result);
				if (!self.settings.noInterface) {
					$(self.table).DataTable().clear();
					$(self.table).DataTable().add(result.substance).draw();

					self.updateControls(from, result.substance.length);
				}
			} else
				jT.fireCallback(self.settings.onLoaded, self, result);
		});
	};

	SubstanceKit.prototype.querySubstance = function (uri) {
		this.substanceUri = jT.ambit.grabPaging(this, uri);
		this.settings.baseUrl = jT.formBaseUrl(uri);
		this.queryEntries(this.pageStart);
	};

	SubstanceKit.prototype.query = function (uri) {
		this.querySubstance(uri);
	};

	// some "inheritance" :-)
	SubstanceKit.prototype.nextPage = jT.tables.nextPage;
	SubstanceKit.prototype.prevPage = jT.tables.prevPage;
	SubstanceKit.prototype.updateControls = jT.tables.updateControls;

	SubstanceKit.defaults = { // all settings, specific for the kit, with their defaults. These got merged with general (jToxKit) ones.
		showControls: true, // show navigation controls or not
		selectionHandler: null, // if given - this will be the name of the handler, which will be invoked by jToxQuery when the attached selection box has changed...
		embedComposition: null, // embed composition listing as details for each substance - it valid only if onDetails is not given.
		noInterface: false, // run in interface-less mode - only data retrieval and callback calling.
		onDetails: null, // called when a details row is about to be openned. If null - no details handler is attached at all.
		onLoaded: null, // called when the set of substances (for this page) is loaded.
		language: {
			loadingRecords: "No substances found.",
			zeroRecords: "No substances found.",
			emptyTable: "No substances available.",
			info: "Showing _TOTAL_ substance(s) (_START_ to _END_)"
		},

		pageStart: 0,
		pageSize: 10,
		/* substanceUri */
		columns: {
			substance: {
				'Id': {
					title: 'Id',
					data: 'URI',
					defaultContent: "-",
					width: "60px",
					render: function (data, type, full) {
						return (type != 'display') ? full.index : '&nbsp;-&nbsp;' + full.index + '&nbsp;-&nbsp;';
					}
				},
				'Substance Name': {
					title: "Substance Name",
					data: "name",
					render: function (data, type, full) {
						if (data == null || data == 'null') data = '-';
						return (type != 'display') ? data : jT.ui.linkedData('<a target="_blank" href="' + full.URI + '/study">' + data + '</a>', "Click to view study details", data)
					}
				},
				'Substance UUID': {
					title: "Substance UUID",
					data: "i5uuid",
					render: function (data, type, full) {
						if (data == null || data == 'null') return '';
						return (type != 'display') ? data : jT.ui.shortenedData('<a target="_blank" href="' + full.URI + '/study">' + data + '</a>', "Press to copy the UUID in the clipboard", data)
					}
				},
				'Substance Type': {
					title: "Substance Type",
					data: "substanceType",
					width: "15%",
					defaultContent: '-'
				},
				'Public name': {
					title: "Public name",
					data: "publicname",
					defaultContent: '-'
				},
				'Reference substance UUID': {
					title: "Reference substance UUID",
					data: "referenceSubstance",
					render: function (data, type, full) {
						if (data.i5uuid == null || data.i5uuid == 'null') return '';
						return (type != 'display') ? data.i5uuid : jT.ui.shortenedData('<a target="_blank" href="' + data.uri + '">' + data.i5uuid + '</a>', "Press to copy the UUID in the clipboard", data.i5uuid);
					}
				},
				'Owner': {
					title: "Owner",
					data: "ownerName",
					defaultContent: '-'
				},
				'Info': {
					title: "Info",
					data: "externalIdentifiers",
					render: function (data, type, full) {
						return jT.ambit.formatExtIdentifiers(data, type, full);
					}
				}
			}
		}
	}

	jT.ui.Substance = SubstanceKit;

})(asSys, jQuery, jToxKit);