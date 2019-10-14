/** jToxKit - chem-informatics multi-tool-kit.
 * Skills for conducting the actual communication with a server
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2012-2019, IDEAConsult Ltd. All rights reserved.
 * http://www.ideaconsult.net/
 */

import _ from 'lodash';
import a$ from 'as-sys';
import $ from 'jquery';
import _UI from '../HelpersUI';

var htmlRoot = "<table></table>",
	defSettings = { // all settings, specific for the kit, with their defaults. These got merged with general (jToxKit) ones.
		id: null, // The id of the widget, as it is going to be registered as a listener, for example.
		target: null, // The root element for installing the widget
		shortStars: false, // whether to show a star and a number (short version) or all maxStars with actual number of them highlighed
		maxStars: 10, // a total possible number of stars - see above description
		selectionHandler: null, // jToxQuery handler to be attached on each entry's checkbox
		sDom: "<Fif>rt", // merged to dataTable's settings, when created
		loadOnInit: false, // whether to make a (blank) request upon loading
		oLanguage: null, // merged to dataTable's settings, when created
		/* algorithmFilter */
		/* modelUri */
		configuration: {
			columns: {
				model: {
					'Id': {
						iOrder: 0,
						sTitle: "Id",
						mData: "URI",
						sWidth: "50px",
						mRender: function (data, type, full) {
							return (type != 'display') ? full.id : '<a target="_blank" href="' + data + '"><span class="ui-icon ui-icon-link jtox-inline"></span> M' + full.id + '</a>';
						}
					},
					'Title': {
						iOrder: 1,
						sTitle: "Title",
						mData: "title",
						sDefaultContent: "-"
					},
					'Stars': {
						iOrder: 2,
						sTitle: "Stars",
						mData: "stars",
						sWidth: "160px"
					},
					'Algorithm': {
						iOrder: 3,
						sTitle: "Algorithm",
						mData: "algorithm"
					},
					'Info': {
						iOrder: 4,
						sTitle: "Info",
						mData: "trainingDataset",
						mRender: function (data, type, full) {
							return (type != 'display' || !data) ? data : '<a href="' + data + '"><span class="ui-icon ui-icon-calculator"></span>&nbsp;training set</a>';
						}
					}
				},
				algorithm: {
					'Id': {
						iOrder: 0,
						sTitle: "Id",
						mData: "uri",
						sWidth: "150px",
						mRender: function (data, type, full) {
							return (type != 'display') ? full.id : '<a target="_blank" href="' + data + '"><span class="ui-icon ui-icon-link jtox-inline"></span> ' + full.id + '</a>';
						}
					},
					'Title': {
						iOrder: 1,
						sTitle: "Title",
						mData: "name",
						sDefaultContent: "-"
					},
					'Description': {
						iOrder: 2,
						sTitle: "Description",
						sClass: "shortened",
						mData: "description",
						sDefaultContent: '-'
					},
					'Info': {
						iOrder: 3,
						sTitle: "Info",
						mData: "format",
						mRender: function (data, type, full) {
							if (type != 'display' || !data)
								return data;
							return '<strong>' + data + '</strong>; ' +
								(full.isSupevised ? '<strong>Supervised</strong>; ' : '') +
								'<a target="_blank" href="' + full.implementationOf + '">' + full.implementationOf + '</a>';
						}
					}
				}
			}
		}
	};

function AmbitModelViewer(settings) {
	a$.setup(this, defSettings, settings);
	this.root$ = $(settings && settings.target);
};


AmbitModelViewer.prototype.__expects = [ "doRequest", "serviceId" ];

AmbitModelViewer.prototype.init = function (manager) {
	var self = this;

	a$.pass(this, AmbitModelViewer, "init", manager);
	self.manager = manager;

	this.root$
		.addClass('jtox-toolkit') // to make sure it is there even when manually initialized
		.append(htmlRoot)
		.addClass('jtox-model');

	if (self.serviceId === 'algorithm') {
		self.configuration.columns.model.Stars.mRender = function (data, type, full) {
			return type != 'display' ? data : _UI.putStars(self, data, "Model star rating (worst) 1 - 10 (best)");
		};
		if (self.shortStars)
			self.configuration.columns.model.Stars.sWidth = "40px";

		self.configuration.columns.model.Algorithm.mRender = function (data, type) {
			var name = data.URI.match(/https{0,1}:\/\/.*\/algorithm\/(\w+).*/)[1];
			if (type != 'display')
				return name;
			var res = '<a target="_blank" href="' + data.URI + '">' +
				'<img src="' + manager.baseUrl + data.img + '"/>&nbsp;' +
				name +
				'</a>';
			if (self.algorithmLink) {
				res += '<a href="' + ccLib.addParameter(self.modelUri, 'algorithm=' + 
						encodeURIComponent(data.URI)) + '"><span class="ui-icon ui-icon-calculator float-right" title="Show models using algorithm ' + 
						name + 
						'"></span></a>';
			}

			return res;
		};
	}

	// deal if the selection is chosen
	if (!!self.selectionHandler || !!self.onDetails) {
		_UI.putActions(self, self.configuration.columns[self.serviceId].Id);
		self.configuration.columns[self.serviceId].Id.sWidth = "60px";
	}

	// again , so that changed defaults can be taken into account.
	// self.configuration = $.extend(true, self.configuration, settings.configuration);
	if (!self.oLanguage)
		self.oLanguage = {
			"sLoadingRecords": "No " + this.serviceId + " found.",
			"sZeroRecords": "No " + this.serviceId + " found.",
			"sEmptyTable": "No " + this.serviceId + " available.",
			"sInfo": "Showing _TOTAL_ " + this.serviceId + "(s) (_START_ to _END_)"
		};

	// READYY! Go and prepare THE table.
	self.table = _UI.putTable(self, self.root$.children('table')[0], this.serviceId);

	// finally, wait a bit for everyone to get initialized and make a call, if asked to
	if (this.loadOnInit)
		self.doRequest();
};


AmbitModelViewer.prototype.populate = function (data) {
	$(this.table).dataTable().fnAddData(data);
};

AmbitModelViewer.prototype.beforeRequest = function (opts) {
	if (opts.serviceId === self.serviceId) {
		this.root$.find('input[type="checkbox"]').each(function () {
			if (this.checked)
				uri = ccLib.addParameter(uri, 'feature_uris[]=' + encodeURIComponent(this.value + '/predicted'));
		})
	
		$(self.table).dataTable().fnClearTable();
		return uri;
	}
};

export default AmbitModelViewer;