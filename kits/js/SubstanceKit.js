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

		var self = this;

		if (this.settings.embedComposition && this.settings.onDetails == null) {
			this.settings.onDetails = function (root, data) {
				new jT.ui.Composition($.extend({},
					self.settings,
					(typeof self.settings.embedComposition == 'object' ? self.settings.embedComposition : {}), {
						target: root,
						compositionUri: data.URI + '/composition'
					}
				));
			};
		}

		jT.ui.putTemplate('all-substance', ' ? ', this.rootElement);
		this.init(settings);

		// finally, if provided - make the query
		if (!!this.settings.substanceUri)
			this.querySubstance(self.settings.substanceUri)
	};

	SubstanceKit.prototype.init = function () {
		var self = this;

		// deal with the additions to the id column with details and selection
		var colId = self.settings.columns.substance['Id'],
			inserterOpts = {
				inplace: true,
				separator: '<br/>'
			}
		if (typeof this.settings.onDetails === 'function')
			jT.tables.insertRenderer(colId, jT.tables.getDetailsRenderer('substance'), inserterOpts);
		if (typeof this.settings.handlers.toggleSelection === 'function')
			jT.tables.insertRenderer(colId, jT.tables.getSelectionRenderer('substance'), inserterOpts);

		// Leave that here, because `self` is used...
		self.settings.columns.substance['Owner'].render = function (data, type, full) {
			return (type != 'display') ? data : '<a target="_blank" href="' + self.settings.baseUrl + 'substanceowner/' + full.ownerUUID + '/substance">' + data + '</a>';
		};

		var opts = { "dom": "rti" };
		if (self.settings.showControls) {
			jT.ui.installHandlers(this, this.rootElement, jT.tables.commonHandlers);
			jT.tables.updateControls.call(self);

			opts['infoCallback'] = function (oSettings, iStart, iEnd, iMax, iTotal, sPre) {
				var needle = $('.filterbox', self.rootElement).val();
				$('.filtered-text', self.rootElement).html(!needle ? ' ' : ' (filtered to <span class="high">' + iTotal + '</span>) ');
				return '';
			};
		} else
			$('.jtox-controls', self.rootElement).remove();

		// READYY! Go and prepare THE table.
		self.table = jT.tables.putTable(self, $('table', self.rootElement)[0], 'substance', opts);
	};

	SubstanceKit.prototype.queryEntries = function (from, size) {
		if (from < 0) from = 0;
		if (!size || size < 0) size = this.pageSize;

		var qStart = Math.floor(from / size),
			qUri = jT.addParameter(this.substanceUri, "page=" + qStart + "&pagesize=" + size),
			self = this;

		jT.ambit.call(this, qUri, function (result, jhr) {
			if (!!result && jhr.status == 200) {
				self.pageSize = size;
				self.pageStart = from;

				for (var i = 0, rl = result.substance.length; i < rl; ++i)
					result.substance[i].index = i + from + 1;

				self.substance = result.substance;

				if (result.substance.length < self.pageSize) // we've reached the end!!
					self.entriesCount = from + result.substance.length;

				// time to call the supplied function, if any.
				jT.fireCallback(self.settings.onLoaded, self, result);
				$(self.table).dataTable().fnClearTable();
				result.substance.length && $(self.table).dataTable().fnAddData(result.substance);

				jT.tables.updateControls.call(self, from, result.substance.length);
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

	SubstanceKit.defaults = { // all settings, specific for the kit, with their defaults. These got merged with general (jToxKit) ones.
		showControls: true, // show navigation controls or not
		embedComposition: null, // embed composition listing as details for each substance - it valid only if onDetails is not given.
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
		handlers: {
			sizeChange: function (e) { this.queryEntries(this.pageStart, parseInt($(e.target).val())); },
			filter: function (e) { $(this.table).dataTable().filter($(e.target).val()).draw(); },
			alignTables: function () { $(this.table).dataTable().fnAdjustColumnSizing(); }
		},
		/* substanceUri */
		columns: {
			substance: {
				'Id': {
					title: 'Id',
					data: 'URI',
					defaultContent: "-",
					className: "center",
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
						if (!data || !data.i5uuid || data.i5uuid == 'null') return '';
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
						return data && jT.ambit.formatExtIdentifiers(data, type, full) && '';
					}
				}
			}
		}
	}

	jT.ui.Substance = SubstanceKit;

})(asSys, jQuery, jToxKit);