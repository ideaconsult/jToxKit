/** jToxKit - chem-informatics multi-tool-kit.
 * Wrapper of common Ambit communication tools.
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2020, IDEAConsult Ltd. All rights reserved.
 */

jT.ambit = {
	processEntry: function (entry, features, fnValue) {
		if (!fnValue)
			fnValue = defaultSettings.fnAccumulate;

		for (var fid in entry.values) {
			var feature = features[fid];
			if (!feature)
				continue;
			var newVal = entry.values[fid];

			// if applicable - location the feature value to a specific location whithin the entry
			if (!!feature.accumulate && !!newVal && !!feature.data) {
				var fn = typeof feature.accumulate == 'function' ? feature.accumulate : fnValue;
				var accArr = feature.data;
				if (!$.isArray(accArr))
					accArr = [accArr];

				for (var v = 0; v < accArr.length; ++v)
					_.set(entry, accArr[v], jT.fireCallback(fn, this, fid, /* oldVal */ _.get(entry, accArr[v]), newVal, features));
			}
		}

		return entry;
	},

	extractFeatures: function (entry, features, callback) {
		var data = [];
		for (var fId in features) {
			var feat = $.extend({}, features[fId]);
			feat.value = entry.values[fId];
			if (!!feat.title) {
				if (jT.fireCallback(callback, null, feat, fId, data.length) !== false) {
					if (!feat.value)
						feat.value = '-';
					data.push(feat);
				}
			}
		};

		return data;
	},

	parseFeatureId: function (featureId) {
		var parse = featureId.match(/https?\:\/\/(.*)\/property\/([^\/]+)\/([^\/]+)\/.+/);
		if (parse == null)
			return null;
		else
			return {
				topcategory: parse[2].replace("+", " "),
				category: parse[3].replace("+", " ")
			};
	},

	diagramUri: function (uri) {
		return !!uri && (typeof uri == 'string') ? uri.replace(/(.+)(\/conformer.*)/, "$1") + "?media=image/png" : '';
	},

	enumSameAs: function (fid, features, callback) {
		// starting from the feature itself move to 'sameAs'-referred features, until sameAs is missing or points to itself
		// This, final feature should be considered "main" and title and others taken from it.
		var feature = features[fid];
		var base = fid.replace(/(http.+\/feature\/).*/g, "$1");
		var retId = fid;

		for (;;) {
			jT.fireCallback(callback, null, feature, retId);
			if (feature.sameAs == null || feature.sameAs == fid || fid == base + feature.sameAs)
				break;
			if (features[feature.sameAs] !== undefined)
				retId = feature.sameAs;
			else {
				if (features[base + feature.sameAs] !== undefined)
					retId = base + feature.sameAs;
				else
					break;
			}

			feature = features[retId];
		}

		return retId;
	},

	processFeatures: function (features, bases) {
		if (bases == null)
			bases = jT.ambit.baseFeatures;
		features = $.extend(features, bases);

		for (var fid in features) {
			var theFeat = features[fid];
			if (!theFeat.URI)
				theFeat.URI = fid;
			this.enumSameAs(fid, features, function (feature, id) {
				var sameAs = feature.sameAs;
				feature = $.extend(true, feature, theFeat);
				theFeat = $.extend(true, theFeat, feature);
				feature.sameAs = sameAs;
			});
		}

		return features;
	},

	processDataset: function (dataset, features, fnValue, startIdx) {
		if (!features) {
			this.processFeatures(dataset.feature);
			features = dataset.feature;
		}

		if (!fnValue)
			fnValue = defaultSettings.fnAccumulate;

		if (!startIdx)
			startIdx = 0;

		for (var i = 0, dl = dataset.dataEntry.length; i < dl; ++i) {
			this.processEntry(dataset.dataEntry[i], features, fnValue);
			dataset.dataEntry[i].number = i + 1 + startIdx;
			dataset.dataEntry[i].index = i;
		}

		return dataset;
	},

	// format the external identifiers column
	formatExtIdentifiers: function (data, type, full) {
		if (type != 'display')
			return _.map(data, 'id').join(', ');

		var html = '';
		for (var i = 0; i < data.length; ++i) {
			if (i > 0)
				html += '<br/>';
			var id = data[i].id;
			try {
				if (id.startsWith("http")) id = "<a href='" + id + "' target=_blank class='qxternal'>" + id + "</a>";
			} catch (err) {}

			html += data[i].type + '&nbsp;=&nbsp;' + id;
		}
		return html;
	},

	getDatasetValue: function (fid, old, value) {
		return _.compact(_.union(old, value != null ? value.trim().toLowerCase().split("|") : [value]));
	},

	getDiagramUri: function (URI) {
		return !!URI && (typeof URI == 'string') ? URI.replace(/(.+)(\/conformer.*)/, "$1") + "?media=image/png" : '';
	},
	
	/* Grab the paging information from the given URL and place it into the settings of passed
	kit, as <kit>.settings.pageStart and <kit>.settings.pageSize. Pay attention that it is 'pageStart'
	and not 'pageNo'.
	*/
	grabPaging: function (kit, url) {
		var urlObj = jT.parseURL(url);

		if (urlObj.params['pagesize'] !== undefined) {
			var sz = parseInt(urlObj.params['pagesize']);
			if (sz > 0)
				kit.settings.pageSize = kit.pageSize = sz;
			url = jT.removeParameter(url, 'pagesize');
		}

		if (urlObj.params['page'] !== undefined) {
			var beg = parseInt(urlObj.params['page']);
			if (beg >= 0)
				kit.settings.pageStart = kit.pageStart = beg * kit.settings.pageSize;
			url = jT.removeParameter(url, 'page');
		}

		return url;
	},

	// Makes a server call for provided service, with settings form the given kit and calls 'callback' at the end - always.
	call: function (kit, service, opts, callback) {
		// some parameter deals in the begining.
		if (typeof opts === 'function') {
			callback = opts;
			opts = undefined;
		}

		var settings = $.extend(true, {}, kit.settings.ajaxSettings, opts ),
			accType = settings.plainText ? "text/plain" : (settings.jsonp ? "application/x-javascript" : "application/json");

		if (!settings.data) {
			if (settings.jsonp)
				settings.data = { media: accType };
			if (!settings.method)
				settings.method = 'GET';
		} else if (!settings.method)
			settings.method = 'POST';

		if (!settings.dataType)
			settings.dataType = settings.plainText ? "text" : (settings.jsonp ? 'jsonp' : 'json');
		if (!settings.type)
			settings.type = settings.method;

		// on some queries, like tasks, we DO have baseUrl at the beginning
		if (service.indexOf("http") != 0)
			service = kit.settings.baseUrl + service;

		var myId = self.callId++;
		settings = $.extend(settings, {
			url: service,
			headers: { Accept: accType },
			crossDomain: settings.crossDomain || settings.jsonp,
			timeout: parseInt(settings.timeout),
			jsonp: settings.jsonp ? 'callback' : false,
			error: function (jhr, status, error) {
				jT.fireCallback(settings.onError, kit, service, status, jhr, myId);
				jT.fireCallback(callback, kit, null, jhr);
			},
			success: function (data, status, jhr) {
				jT.fireCallback(settings.onSuccess, kit, service, status, jhr, myId);
				jT.fireCallback(callback, kit, data, jhr);
			}
		})

		jT.fireCallback(settings.onConnect, kit, settings, myId);

		// now make the actual call
		$.ajax(settings);
	},

	taskPoller: function(kit, callback, delay, timeout) {
		var taskStart = null,
			handler = null;

		if (timeout == null)
			timeout = 5 * 1000;
		if (delay == null)
			delay = 250;

		handler = function (task, jhr) {
			if (task == null || task.task == null || task.task.length < 1) {
				callback(task, jhr);
				return;
			}
			task = task.task[0];
			// i.e. - we're ready or we're in trouble.
			if (task.completed > -1 || !!task.error) {
				callback(task, jhr);
				return;
			}
			// first round				
			else if (taskStart == null)
				taskStart = Date.now();
			// timedout
			else if (Date.now() - taskStart > timeout) {
				callback(task, jhr);
				return;
			}
			// time for another call
			setTimeout(function() { 
				jT.ambit.call(kit, task.result, { method: 'GET' }, handler);
			},delay);
		};

		return handler;
	},

	/* define the standard features-synonymes, working with 'sameAs' property. Beside the title we define the 'data' property
	as well which is used in processEntry() to location value(s) from given (synonym) properties into specific property of the compound entry itself.
	'data' can be an array, which results in adding value to several places.
	*/
	baseFeatures: {
		"http://www.opentox.org/api/1.1#REACHRegistrationDate" : { title: "REACH Date", data: "compound.reachdate", accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#CASRN" : { title: "CAS", data: "compound.cas", accumulate: true, basic: true, primary: true },
		"http://www.opentox.org/api/1.1#ChemicalName" : { title: "Name", data: "compound.name", accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#TradeName" : { title: "Trade Name", data: "compound.tradename", accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#IUPACName": { title: "IUPAC Name", data: ["compound.name", "compound.iupac"], accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#EINECS": { title: "EINECS", data: "compound.einecs", accumulate: true, basic: true, primary: true },
		"http://www.opentox.org/api/1.1#InChI": { title: "InChI", data: "compound.inchi", shorten: true, accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#InChI_std": { title: "InChI", data: "compound.inchi", shorten: true, accumulate: true, sameAs: "http://www.opentox.org/api/1.1#InChI", basic: true },
		"http://www.opentox.org/api/1.1#InChIKey": { title: "InChI Key", data: "compound.inchikey", accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#InChIKey_std": { title: "InChI Key", data: "compound.inchikey", accumulate: true, sameAs: "http://www.opentox.org/api/1.1#InChIKey", basic: true },
		"http://www.opentox.org/api/1.1#InChI_AuxInfo": { title: "InChI Aux", data: "compound.inchiaux", accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#InChI_AuxInfo_std": { title: "InChI Aux", data: "compound.inchiaux", accumulate: true, sameAs: "http://www.opentox.org/api/1.1#InChI_AuxInfo", basic: true},
		"http://www.opentox.org/api/1.1#IUCLID5_UUID": { title: "IUCLID5 UUID", data: "compound.i5uuid", shorten: true, accumulate: true, basic: true, primary: true },
		"http://www.opentox.org/api/1.1#SMILES": { title: "SMILES", data: "compound.smiles", shorten: true, accumulate: true, basic: true },
		"http://www.opentox.org/api/dblinks#CMS": { title: "CMS", accumulate: true, basic: true },
		"http://www.opentox.org/api/dblinks#ChEBI": { title: "ChEBI", accumulate: true, basic: true },
		"http://www.opentox.org/api/dblinks#Pubchem": { title: "PubChem", accumulate: true, basic: true },
		"http://www.opentox.org/api/dblinks#ChemSpider": { title: "ChemSpider", accumulate: true, basic: true },
		"http://www.opentox.org/api/dblinks#ChEMBL": { title: "ChEMBL", accumulate: true, basic: true },
		"http://www.opentox.org/api/dblinks#ToxbankWiki": { title: "Toxbank Wiki", accumulate: true, basic: true },
		"http://www.opentox.org/api/1.1#Diagram": {
			title: "Diagram", search: false, visibility: "main", primary: true, data: "compound.URI", 
			column: { className: "paddingless", width: "125px" },
			render: function (data, type, full) {
				dUri = jT.ambit.getDiagramUri(data);
				return (type != "display") 
					? dUri 
					: '<div class="jtox-diagram borderless"><i class="icon fa fa-search-plus jtox-handler" data-handler="alignTables" data-handler-delay="50"></i>' +
						'<a target="_blank" href="' +  data + '"><img src="' + dUri + '" class="jtox-smalldiagram"/></a></div>';
			}
		},
		'#IdRow': {
			used: true, basic: true, data: "number",
			column: { className: "middle center" },
			render: function (data, type, full) { 
				return (type != "display") ? data : "&nbsp;-&nbsp;" + data + "&nbsp;-&nbsp;"; 
			}
		},
		"#DetailedInfoRow": {
			title: "InfoRow", search: false, data: "compound.URI", basic: true, primary: true, visibility: "none",
			column: { className: "jtox-hidden jtox-ds-details paddingless", width: "0px" },
			render: function (data, type, full) { return ''; }
		}
	}
};
