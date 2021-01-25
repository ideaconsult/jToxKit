/* CompoundKit - General, universal compound dataset visualizer. Migrated.
 *
 * Copyright 2012-2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan Georgiev
 **/

(function (_, $, jT) {

	var instanceCount = 0;

	function positionTo(el, parent) {
		var ps = {
			left: -parent.offsetLeft,
			top: -parent.offsetTop
		};
		parent = parent.offsetParent;
		for (; !!el && el != parent; el = el.offsetParent) {
			ps.left += el.offsetLeft;
			ps.top += el.offsetTop;
		}
		return ps;
	}

	// constructor
	function CompoundKit(settings) {
		$(this.rootElement = settings.target).addClass('jtox-toolkit'); // to make sure it is there even in manual initialization.

		this.settings = _.defaultsDeep({}, settings,
			CompoundKit.defaults,
			{ baseFeatures: jT.ambit.baseFeatures });

		// make a dull copy here, because, otherwise groups are merged... which we DON'T want
		if (settings != null && settings.groups != null)
			this.settings.groups = settings.groups;

		this.instanceNo = instanceCount++;
		if (this.settings.rememberChecks && this.settings.showTabs)
			this.featureStates = {};

		if (!settings.onDetails && settings.hasDetails)
			this.settings.onDetails = function (root, data) { this.expandedData(root, data); };

		// finally make the query, if Uri is provided. This _invokes_ init() internally.
		if (!this.settings.datasetUri)
			this.datasetUri = this.settings.baseUrl + this.settings.defaultService;
		else if (this.settings.initialQuery)
			this.queryDataset(this.settings.datasetUri);
	};

	// now follow the prototypes of the instance functions.
	CompoundKit.prototype.init = function () {
		this.feature = null; // features, as downloaded from server, after being processed.
		this.dataset = null; // the last-downloaded dataset.
		this.groups = null; // computed groups, i.e. 'groupName' -> array of feature list, prepared.
		this.fixTable = this.varTable = null; // the two tables - to be initialized in prepareTables.
		this.entriesCount = null;
		this.suspendEqualization = false;
		this.orderList = [];
		this.pageStart = this.settings.pageStart;
		this.pageSize = this.settings.pageSize;

		jT.ui.putTemplate('all-compound', { instanceNo: this.instanceNo }, this.rootElement);
		jT.ui.installHandlers(this, this.rootElement, jT.tables.commonHandlers);
		jT.tables.updateControls.call(this);

		this.$errDiv = $('.jt-error', this.rootElement);
	};

	CompoundKit.prototype.clear = function () {
		$(this.rootElement).empty();
	};

	CompoundKit.prototype.emptyTable = function () {
		$(this.fixTable).dataTable().fnClearTable();
		$(this.varTable).dataTable().fnClearTable();
	};

	/* make a tab-based widget with features and grouped on tabs. It relies on filled and processed 'self.feature' as well
	as created 'self.groups'.
	*/
	CompoundKit.prototype.prepareTabs = function (root, isMain, groupFn, groups) {
		// we suppress the re-layouting engine this way, we'll show it at the end.		
		var all = $('<div>').css('display', 'none').appendTo(root),
			ulEl = $('<ul>').appendTo(all);

		var createATab = function (grId, name) {
			var liEl = $('<li>').appendTo(ulEl);
			$('<a>')
				.attr('href', "#" + grId)
				.html(name)
				.appendTo(liEl);
			return liEl;
		};

		var emptyList = [],
			idx = 0;
		
		for (var gr in (groups || this.groups)) {
			var grId = "jtox-ds-" + gr.replace(/\s/g, "_") + "-" + this.instanceNo + (isMain ? '' : '-details'),
				grName = gr.replace(/_/g, " "),
				tabLi = createATab(grId, grName);
			if (isMain)
				tabLi.attr('title', "Select which columns to be displayed");

			// now prepare the content...
			var divEl = $('<div>').attr('id', grId).appendTo(all);
			// add the group check multi-change
			if (this.settings.groupSelection && isMain) {
				var sel = jT.ui.getTemplate('compound-one-tab');
				divEl.append(sel);

				$('.multi-select', sel).on('click', function (e) {
					var par = $(this).closest('.ui-tabs-panel'),
						doSel = $(this).hasClass('select');
					$('input', par).each(function () {
						this.checked = doSel;
						$(this).trigger('change');
					});
					e.stopPropagation();
				});
			}

			if (groupFn(divEl[0], gr)) {
				if (this.settings.hideEmpty) {
					divEl.remove();
					tabLi.remove();
					--idx;
				} else
					emptyList.push(idx);
			}
			++idx;

			jT.fireCallback(this.settings.onTab, this, divEl[0], tabLi[0], grName, isMain);
		}

		if (isMain && this.settings.showExport) {
			var tabId = "jtox-ds-export-" + this.instanceNo,
				liEl = createATab(tabId, "Export").addClass('jtox-ds-export');
			
			var divEl = jT.ui.getTemplate('compound-export', { id: tabId });
			all.append(divEl);
			
			divEl = $('.jtox-exportlist', divEl);

			for (var i = 0, elen = this.settings.exports.length; i < elen; ++i) {
				var expo = this.settings.exports[i];
				var el = jT.ui.getTemplate('compound-download', {
					link: jT.addParameter(this.datasetUri, "media=" + encodeURIComponent(expo.type)),
					type: expo.type,
					icon: expo.icon
				});
				divEl.append(el);
			}

			jT.fireCallback(this.settings.onTab, this, divEl[0], liEl[0], "Export", isMain);
		}

		// now show the whole stuff and mark the disabled tabs
		all.css('display', "block");
		return all.tabs({
			collapsible: isMain,
			active: (this.settings.tabsFolded && isMain) ? false : 0,
			disabled: emptyList,
			heightStyle: isMain ? "content" : (this.settings.detailsHeight == 'auto' ? 'auto' : 'fill')
		});
	};

	CompoundKit.prototype.equalizeTables = function () {
		var self = this;
		if (!self.suspendEqualization && self.fixTable != null && self.varTable != null) {
			jT.tables.equalizeHeights(self.fixTable.tHead, self.varTable.tHead);
			jT.tables.equalizeHeights(self.fixTable.tBodies[0], self.varTable.tBodies[0]);

			// now we need to equalize openned details boxes, if any.
			var tabRoot = $('.jtox-ds-tables', self.rootElement)[0];
			var varWidth = $('.jtox-ds-variable', tabRoot).width();

			$('.jtox-details-box', self.rootElement).each(function (i) {
				var cell = $(this).data('rootCell');
				if (!!cell) {
					this.style.display = 'none';
					var ps = positionTo(cell, tabRoot);
					this.style.top = ps.top + 'px';
					this.style.left = ps.left + 'px';
					var cellW = $(cell).parents('.dataTables_wrapper').width() - cell.offsetLeft;
					this.style.width = (cellW + varWidth) + 'px';
					this.style.display = 'block';

					var rowH = $(cell).parents('tr').height();
					var cellH = cell.offsetHeight;
					var meH = $(this).height();

					if (cellH < rowH)
						$(cell).height(cellH = rowH);
					if (cellH < meH)
						$(cell).height(cellH = meH);

					if (meH < cellH) {
						$(this).height(cellH);
						$('.ui-tabs').tabs('refresh');
					}
				}
			});
		}
	};

	CompoundKit.prototype.getFeatureValue = function (fId, entry, type) {
		var self = this;
		var feature = self.feature[fId];
		var val = (feature.data !== undefined) ? (_.get(entry, $.isArray(feature.data) ? feature.data[0] : feature.data)) : entry.values[fId];
		return (typeof feature.render == 'function') ?
			feature.render(val, !!type ? type : 'filter', entry) :
			jT.ui.renderRange(val, feature.units, type);
	};

	CompoundKit.prototype.getFeatureUri = function (fId) {
		return this.feature[fId].URI || fId;
	};

	CompoundKit.prototype.getFeatureData = function (entry, set, scope) {
		if (scope == null)
			scope = 'details';
		var self = this;
		var data = [];
		_.each(set, function (fId) {
			var feat = $.extend({}, self.feature[fId]);
			var vis = feat.visibility;
			if (!!vis && vis != scope) return;

			var title = feat.title;
			feat.value = self.getFeatureValue(fId, entry, scope);
			if (!!title && (!self.settings.hideEmptyDetails || !!feat.value)) {
				if (!feat.value)
					feat.value = '-';
				data.push(feat);
			}
		});

		return data;
	};

	CompoundKit.prototype.prepareColumn = function (fId, feature) {
		var self = this;
		if (feature.visibility == 'details')
			return null;

		// now we now we should show this one.
		var col = {
			"title": !feature.title ? '' : jT.valueAndUnits(feature.title.replace(/_/g, ' '), (!self.settings.showUnits ? null : feature.units)),
			"defaultContent": "-",
		};

		if (typeof feature.column == 'function')
			col = feature.column.call(self, col, fId);
		else if (feature.column != null)
			col = $.extend(col, feature.column);

		col["data"] = (feature.data != null) ? feature.data : 'values';

		if (feature.render != null)
			col["render"] = feature.data != null ? feature.render : function (data, type, full) {
				return feature.render(full.values[fId], type, full);
			};
		else if (!!feature.shorten)
			col["render"] = function (data, type, full) {
				if (!feature.data)
					data = data[fId];
				data = data || "";
				return (type != "display") ? '' + data : jT.ui.shortenedData(data, "Press to copy the value in the clipboard");
			};
		else if (feature.data == null) // in other cases we want the default presenting of the plain value
			col["render"] = (function (featureId, units) {
				return function (data, type, full) {
					var val = full.values[featureId] || '-';
					if (typeof val != 'object')
						return val;
					if (!$.isArray(val))
						val = [val];
					var html = '';
					for (var i = 0; i < val.length; ++i) {
						html += (type == 'display') ? '<div>' : '';
						html += jT.ui.renderRange(val[i], units, type);
						html += (type == 'display') ? '</div>' : ',';
					}
					return html;
				};
			})(fId, feature.unit);

		// other convenient cases
		if (!!feature.shorten)
			col["width"] = "75px";

		return col;
	};

	CompoundKit.prototype.prepareTables = function () {
		var self = this,
			varCols = [],
			fixCols = [];

		// first, some preparation of the first, IdRow column
		var idFeature = self.settings.baseFeatures['#IdRow'];
		if (!!this.settings.onDetails)
			idFeature = jT.tables.insertRenderer(idFeature, jT.tables.getDetailsRenderer('compound'), { separator: '<br/>' });
		
		fixCols.push(
			self.prepareColumn('#IdRow', idFeature), {
				"className": "jtox-hidden",
				"data": "index",
				"defaultContent": "-",
				"orderable": true,
				"render": function (data, type, full) {
					return self.orderList == null ? 0 : self.orderList[data];
				}
			} // column used for ordering
		);

		varCols.push({
			"className": "jtox-hidden jtox-ds-details paddingless",
			"data": "index",
			"render": function (data, type, full) {
				return '';
			}
		});

		// prepare the function for column switching...
		var fnShowColumn = function () {
			var dt = $(this).data();
			var cells = $(dt.sel + ' table tr .' + dt.column, self.rootElement);
			if (this.checked) {
				$(cells).show();
				$("table tr .blank-col", self.rootElement).addClass('jtox-hidden');
			} else {
				$(cells).hide();
				if ($(dt.sel + " table tr *:visible", self.rootElement).length == 0)
					$("table tr .blank-col", self.rootElement).removeClass('jtox-hidden');
			}
			if (self.settings.rememberChecks)
				self.featureStates[dt.id] = this.checked;
			self.equalizeTables();
		};

		if (self.settings.hasDetails) self.settings.handlers.toggleDetails = function (event) {
			var row = $(event.target).closest('tr'),
				idx = row.data('jtox-index'),
				cell = $(".jtox-ds-details", row)[0];

			if (self.settings.preDetails != null && !jT.fireCallback(self.settings.preDetails, self, idx, cell) || !cell)
				return; // the !cell  means you've forgotten to add #DetailedInfoRow feature somewhere.
			
			row.toggleClass('jtox-detailed-row');
			$('.jtox-details-open', row).toggleClass('fa-folder fa-folder-open');

			var varCell = $('#jtox-var-' + self.instanceNo + '-' + idx + '>td.jtox-ds-details', self.rootElement)
				.toggleClass('jtox-hidden');

			// showing up - merge all the cells in the variable part form varCell on.
			if (row.hasClass('jtox-detailed-row')) {
				// prepare the cell space...
				var followingCells = $(varCell).nextAll().detach();
				varCell.data('removedCells', followingCells);
				varCell.prop('colspan', followingCells.length + 1);

				// now, go with the actual content:
				var detDiv = $('<div></div>').addClass('jtox-details-box jtox-details');

				if (self.settings.detailsHeight != null)
					detDiv.height(self.settings.detailsHeight)

				detDiv.appendTo(varCell);
				jT.fireCallback(self.settings.onDetails, self, detDiv[0], self.dataset.dataEntry[idx], cell);
			} else { // i.e. we need to re-append the removed cwlls
				varCell.prop('colspan', 1);
				varCell.data('removedCells').appendTo(varCell.parent());
			}

			self.equalizeTables();
		};

		// now proceed to enter all other columns
		for (var gr in self.groups) {
			_.each(self.groups[gr], function (fId) {
				var feature = self.feature[fId];
				var col = self.prepareColumn(fId, feature);
				if (!col) return;

				// finally - assign column switching to the checkbox of main tab.
				var colList = !!feature.primary ? fixCols : varCols;
				var colId = 'col-' + colList.length;
				col.className = (!!col.className ? col.className + ' ' : '') + colId;

				$('.jtox-ds-features input.jtox-checkbox[value="' + fId + '"]', self.rootElement).data({
					sel: !!feature.primary ? '.jtox-ds-fixed' : '.jtox-ds-variable',
					column: colId,
					id: fId
				}).on('change', fnShowColumn)

				// and push it into the proper list.
				colList.push(col);
			});
		}

		// now - sort columns and create the tables...
		if (self.settings.fixedWidth != null)
			$(".jtox-ds-fixed", self.rootElement).width(self.settings.fixedWidth);

		jT.tables.sortColDefs(fixCols);
		self.fixTable = ($(".jtox-ds-fixed table", self.rootElement).dataTable({
			"paging": false,
			"lengthChange": false,
			"autoWidth": false,
			"dom": "rt",
			"columns": fixCols,
			"ordering": false,
			"createdRow": function (nRow, aData) {
				// attach the click handling
				var iDataIndex = aData.index;
				$(nRow).data('jtox-index', iDataIndex);

				jT.fireCallback(self.settings.onRow, self, nRow, aData, iDataIndex);
				jT.ui.installHandlers(self, nRow, jT.tables.commonHandlers);
			},
			"language": {
				"emptyTable": '<span class="jt-feeding">' + (self.settings.language.process || self.settings.language.loadingRecords || 'No data yet...') + '</span>'
			}
		}))[0];

		// we need to put a fake column to stay, when there is no other column here, or when everything is hidden..
		varCols.push({
			"className": "center blank-col" + (varCols.length > 1 ? " jtox-hidden" : ""),
			"data": "index",
			"render": function (data, type, full) {
				return type != 'display' ? data : '...';
			}
		});

		jT.tables.sortColDefs(varCols);
		self.varTable = ($(".jtox-ds-variable table", self.rootElement).dataTable({
			"paging": false,
			"processing": true,
			"lengthChange": false,
			"autoWidth": false,
			"dom": "rt",
			"ordering": true,
			"columns": varCols,
			"scrollCollapse": true,
			"createdRow": function (nRow, aData) {
				var iDataIndex = aData.index;
				nRow.id = 'jtox-var-' + self.instanceNo + '-' + iDataIndex;

				// equalize multi-rows, if there are any
				jT.tables.equalizeHeights.apply(window, $('td.jtox-multi table tbody', nRow).toArray());

				$(nRow).addClass('jtox-row');
				$(nRow).data('jtox-index', iDataIndex);
				jT.fireCallback(self.settings.onRow, self, nRow, aData, iDataIndex);
				jT.ui.installHandlers(self, nRow, jT.tables.commonHandlers);
			},
			"drawCallback": function (oSettings) {
				// this is for synchro-sorting the two tables
				var sorted = $('.jtox-row', this);
				for (var i = 0, rlen = sorted.length; i < rlen; ++i) {
					var idx = $(sorted[i]).data('jtox-index');
					self.orderList[idx] = i;
				}

				if (rlen > 0)
					$(self.fixTable).dataTable().fnSort([
						[1, "asc"]
					]);
			},
			"language": {
				"emptyTable": "-"
			}
		}))[0];
	};

	CompoundKit.prototype.expandedData = function (root, entry, groups) {
		var self = this;

		return this.prepareTabs(root, false, function (parent, gr) {
			var data = self.getFeatureData(entry, self.groups[gr]);

			if (data.length > 0 || !self.settings.hideEmpty) {
				var tabTable = $('<table>').appendTo($(parent).addClass('jtox-details-table'));
				tabTable.dataTable({
					"paging": false,
					"processing": true,
					"lengthChange": false,
					"autoWidth": false,
					"dom": "rt<f>",
					"columns": jT.tables.processColumns(self, 'compound'),
					"ordering": true,
				});
				
				tabTable.dataTable().fnAddData(data);
				tabTable.dataTable().fnAdjustColumnSizing();
			}

			return data.length == 0;
		}, groups);
	},

	CompoundKit.prototype.updateTables = function () {
		var self = this;
		if (self.settings.hasDetails)
			$('div.jtox-details-box', self.rootElement).remove();

		self.filterEntries($('.jtox-controls input', self.rootElement).val());
	};

	/* Prepare the groups and the features.
	 */
	CompoundKit.prototype.prepareGroups = function (miniset) {
		var self = this,
			usedFeatures = {};

		var grps = self.settings.groups;
		if (typeof grps == 'function')
			grps = grps(miniset, self);

		self.groups = {};
		for (var i in grps) {
			var grp = grps[i];
			if (grp == null)
				continue;

			var grpArr = (typeof grp == "function" || typeof grp == "string") ? jT.fireCallback(grp, self, i, miniset, usedFeatures) : grp;
			self.groups[i] = [];
			_.each(grpArr, function (fid, idx) {
				var isUsed = false;
				CompoundKit.enumSameAs(fid, self.feature, function (f, fId) {
					isUsed |= fId in usedFeatures;
				});
				if (idx != "name" && !isUsed) {
					self.groups[i].push(fid);
					usedFeatures[fid] = true;
				}
			});
		}
	};

	/* Enumerate all recofnized features, caling fnMatch(featureId, groupId) for each of it.
	Return true from the function to stop enumeration, which in turn will return true if it was stopped.
	*/
	CompoundKit.prototype.enumerateFeatures = function (fnMatch) {
		var self = this;
		var stopped = false;
		for (var gr in self.groups) {
			for (var i = 0, glen = self.groups[gr].length; i < glen; ++i) {
				if (stopped = fnMatch(self.groups[gr][i], gr))
					break;
			}

			if (stopped)
				break;
		}

		return stopped;
	};

	CompoundKit.prototype.filterEntries = function (needle) {
		var self = this;

		if (needle == null)
			needle = '';
		else
			needle = needle.toLowerCase();

		var dataFeed = [];
		if (needle != '') {
			for (var i = 0, slen = self.dataset.dataEntry.length; i < slen; ++i) {
				var entry = self.dataset.dataEntry[i];

				var match = self.enumerateFeatures(function (fId, gr) {
					var feat = self.feature[fId];
					if (feat.search !== undefined && !feat.search)
						return false;
					var val = self.getFeatureValue(fId, entry, 'sort');
					return val != null && val.toString().toLowerCase().indexOf(needle) >= 0;
				});


				if (match)
					dataFeed.push(entry);
			}
		} else {
			dataFeed = self.dataset.dataEntry;
		}

		$(self.fixTable).dataTable().fnClearTable();
		$(self.varTable).dataTable().fnClearTable();
		if (dataFeed && dataFeed.length) {
			$(self.fixTable).dataTable().fnAddData(dataFeed);
			$(self.varTable).dataTable().fnAddData(dataFeed);
		}
		$('.jt-feeding', self.rootElement).html(self.settings.language.zeroRecords || 'No records matching the filter.');

		jT.ui.updateTree($('.jtox-controls', self.rootElement)[0], {
			"filtered-text": !needle ? " " : ' (filtered to <span class="high">' + dataFeed.length + '</span>) '
		});

		if (self.settings.showTabs) {
			self.suspendEqualization = true;
			$('.jtox-ds-features .jtox-checkbox', self.rootElement).trigger('change');
			self.suspendEqualization = false;
		}

		// finally
		self.equalizeTables();
	};

	CompoundKit.prototype.getQueryUri = function (scope) {
		if (!this.datasetUri)
			return null;
		if (scope == null)
			scope = {
				from: this.pageStart,
				size: this.pageSize
			};
		if (scope.from < 0)
			scope.from = 0;
		if (scope.size == null)
			scope.size = this.pageSize;

		return jT.addParameter(this.datasetUri, "page=" + Math.floor(scope.from / scope.size) + "&pagesize=" + scope.size);
	};

	CompoundKit.prototype.getFeatureUri = function (featureUri) {
		var queryUri = featureUri || this.settings.featureUri || this.settings.feature_uri;
		if (!queryUri) // rollback this is the automatic way, which makes a false query in the beginning
			queryUri = jT.addParameter(this.datasetUri, "page=0&pagesize=1");

		return queryUri;
	};

	// make the actual query for the (next) portion of data.
	CompoundKit.prototype.queryEntries = function (from, size, dataset) {
		var self = this,
			scope = {
				'from': from,
				'size': size
			},
			qUri = self.getQueryUri(scope);

		$('.jtox-controls select', self.rootElement).val(scope.size);
		self.dataset = null;

		// the function for filling
		var fillFn = function (dataset, jhr) {
			if (!dataset && jhr.status != 200) {
				self.$errDiv.show().find('.message').html('Server error: ' + jhr.statusText);
			} else if (!!dataset) {
				// first, arrange the page markers
				self.pageSize = scope.size;
				var qStart = self.pageStart = Math.floor(scope.from / scope.size) * scope.size;
				if (dataset.dataEntry.length < self.pageSize) // we've reached the end!!
					self.entriesCount = qStart + dataset.dataEntry.length;

				// then process the dataset
				self.dataset = CompoundKit.processDataset(dataset, $.extend(true, {}, dataset.feature, self.feature), self.settings.fnAccumulate, self.pageStart);
				
				// time to call the supplied function, if any.
				jT.fireCallback(self.settings.onLoaded, self, dataset);

				// ok - go and update the table, filtering the entries, if needed
				self.updateTables();
				if (self.settings.showControls) {
					// go and update controls if they are visible
					jT.tables.updateControls.call(self, qStart, dataset.dataEntry.length);
				}
			} else {
				jT.fireCallback(self.settings.onLoaded, self, dataset);
			}
			// jT.ui.notifyParents(self.rootElement, function (kit) {
			// 	if (typeof kit.equalizeTables === 'function')
			// 	kit.equalizeTables();
			// });
			jT.fireCallback(self.settings.onComplete, self);
		};

		// we may be passed dataset, if the initial, setup query was 404: Not Found - to avoid second such query...
		if (dataset != null)
			fillFn(dataset)
		else
			jT.ambit.call(self, qUri, fillFn);
	};

	/* Retrieve features for provided dataserUri, using settings.featureUri, if provided, or making automatice page=0&pagesize=1 query
	 */
	CompoundKit.prototype.queryFeatures = function (featureUri, callback) {
		var self = this;

		// Remember this one, because we'll optimize not to rebuild again if it is the same
		this.lastFeatureUri = featureUri || this.getFeatureUri(featureUri);

		// now make the actual call...
		jT.ambit.call(self, this.lastFeatureUri, function (result, jhr) {
			if (!result && jhr.status != 200) {
				self.$errDiv.show().find('.message').html('Server error: ' + jhr.statusText);
			}

			// remove the loading pane in anyways..
			if (!!result) {
				self.feature = result.feature;

				CompoundKit.processFeatures(self.feature, self.settings.baseFeatures);
				var miniset = {
					dataEntry: result.dataEntry,
					feature: self.feature
				};

				self.prepareGroups(miniset);
				if (self.settings.showTabs) {
					// tabs feature building
					var nodeFn = function (id, name, parent) {
						var fEl = jT.ui.getTemplate('compound-one-feature', {
							title: name.replace(/_/g, ' '),
							uri: self.getFeatureUri(id)
						});
						$(parent).append(fEl);

						var checkEl = $('input[type="checkbox"]', fEl)[0];
						if (!checkEl)
							return;
						checkEl.value = id;
						if (self.settings.rememberChecks)
							checkEl.checked = (self.featureStates[id] === undefined || self.featureStates[id]);

						return fEl;
					};

					self.prepareTabs($('.jtox-ds-features', self.rootElement)[0], true, function (divEl, gr) {
						var empty = true;
						_.each(self.groups[gr], function (fId) {
							var vis = (self.feature[fId] || {})['visibility'];
							if (!!vis && vis != 'main') return;

							empty = false;
							var title = self.feature[fId].title;
							title && nodeFn(fId, title, divEl);
						});

						return empty;
					});
				}

				jT.fireCallback(self.settings.onPrepared, self, miniset, self);
				self.prepareTables(); // prepare the tables - we need features to build them - we have them!
				self.equalizeTables(); // to make them nicer, while waiting...

				// finally make the callback for
				callback(result);
			}
		});
	};

	/* Makes a query to the server for particular dataset, asking for feature list first, so that the table(s) can be
	prepared. If the featureUri passed is the same as the previous time - the featuers are not re-quiried, UNLESS,
	the `force` argument is true.
	*/
	CompoundKit.prototype.queryDataset = function (datasetUri, featureUri, force) {
		// Deal with the dataserUri passed
		datasetUri = jT.ambit.grabPaging(this, datasetUri);
		this.settings.baseUrl = this.settings.baseUrl || jT.formBaseUrl(datasetUri);

		// remember the _original_ datasetUri and make a call with one size length to retrieve all features...
		this.datasetUri = (datasetUri.indexOf('http') != 0 ? this.settings.baseUrl : '') + datasetUri;

		featureUri = this.getFeatureUri(featureUri);

		// We're asked or needed to reset
		if (!this.lastFeatureUri || featureUri != this.lastFeatureUri || force === true) {
			this.clear();
			this.init();
			this.$errDiv.hide();
			var self = this;

			this.queryFeatures(featureUri, function () {
				self.queryEntries(self.pageStart, self.pageSize);
			});
		} else {// Otherwise - just make the request
			this.$errDiv.hide();
			this.queryEntries(this.pageStart, this.pageSize);
		}
	};

	/* This is a needed shortcut that jToxQuery routine will call
	 */
	CompoundKit.prototype.query = function (uri, resetFeatures) {
		this.queryDataset(uri, null, resetFeatures);
	};
	// end of prototype

	// some public, static methods
	CompoundKit.processEntry = function (entry, features, fnValue) {
		if (!fnValue)
			fnValue = CompoundKit.defaults.fnAccumulate;

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
	};

	CompoundKit.extractFeatures = function (entry, features, callback) {
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
	};

	CompoundKit.enumSameAs = function (fid, features, callback) {
		// starting from the feature itself move to 'sameAs'-referred features, until sameAs is missing or points to itself
		// This, final feature should be considered "main" and title and others taken from it.
		var feature = features[fid],
			base = fid.replace(/(http.+\/feature\/).*/g, "$1"),
			retId = fid;

		for (;;) {
			jT.fireCallback(callback, null, feature, retId);
			if (feature == null) {
				console.warn("Reference to a unspecified feature: " + retId);
				break;
			}
			if (feature.sameAs == null || feature.sameAs == fid || fid == base + feature.sameAs)
				break;
			if (features[feature.sameAs] !== undefined)
				retId = feature.sameAs;
			else if (features[base + feature.sameAs] !== undefined)
				retId = base + feature.sameAs;
			else
				break;

			feature = features[retId];
		}

		return retId;
	};

	CompoundKit.processFeatures = function (features, bases) {
		if (bases == null)
			bases = jT.Ambit.baseFeatures;
		features = $.extend(features, bases);

		for (var fid in features) {
			var theFeat = features[fid];
			if (!theFeat.URI)
				theFeat.URI = fid;
			CompoundKit.enumSameAs(fid, features, function (feature, id) {
				var sameAs = feature.sameAs;
				feature = $.extend(true, feature, theFeat);
				theFeat = $.extend(true, theFeat, feature);
				feature.sameAs = sameAs;
			});
		}

		return features;
	};

	CompoundKit.processDataset = function (dataset, features, fnValue, startIdx) {
		if (!features) {
			CompoundKit.processFeatures(dataset.feature);
			features = dataset.feature;
		}

		if (!fnValue)
			fnValue = CompoundKit.defaults.fnAccumulate;

		if (!startIdx)
			startIdx = 0;

		for (var i = 0, dl = dataset.dataEntry.length; i < dl; ++i) {
			CompoundKit.processEntry(dataset.dataEntry[i], features, fnValue);
			dataset.dataEntry[i].number = i + 1 + startIdx;
			dataset.dataEntry[i].index = i;
		}

		return dataset;
	};

	CompoundKit.defaults = { // all settings, specific for the kit, with their defaults. These got merged with general (jToxKit) ones.
		showTabs: true, // should we show tabs with groups, or not
		tabsFolded: false, // should present the feature-selection tabs folded initially
		showExport: true, // should we add export tab up there
		showControls: true, // should we show the pagination/navigation controls.
		showUnits: true, // should we show units in the column title.
		hideEmpty: false, // whether to hide empty groups instead of making them inactive
		groupSelection: true, // wether to show select all / unselect all links in each group
		hasDetails: true, // whether browser should provide the option for per-item detailed info rows.
		hideEmptyDetails: true, // hide feature values, when they are empty (only in detailed view)
		detailsHeight: "auto", // what is the tabs' heightStyle used for details row
		fixedWidth: null, // the width (in css units) of the left (non-scrollable) part of the table
		pageSize: 20, // what is the default (startint) page size.
		pageStart: 0, // what is the default startint point for entries retrieval
		rememberChecks: false, // whether to remember feature-checkbox settings between queries
		featureUri: null, // an URI for retrieving all feature for the dataset, rather than 1-sized initial query, which is by default
		defaultService: "query/compound/search/all", // The default service (path) to be added to baseUrl to form datasetUri, when it is not provided
		initialQuery: true, // Whether to directly make a query, upon initialization, if provided with datasetUri
		metricFeature: "http://www.opentox.org/api/1.1#Similarity", // This is the default metric feature, if no other is specified
		onTab: null, // invoked after each group's tab is created - function (element, tab, name, isMain);
		onLoaded: null, // invoked when a set of compounds is loaded.
		onComplete: null, // invoked when the component is all ready.
		onPrepared: null, // invoked when the initial call for determining the tabs/columns is ready
		onDetails: null, // invoked when a details pane is openned
		preDetails: null, // invoked prior of details pane creation to see if it is going to happen at all
		language: {}, // some default language settings, which apply to first (static) table only
		fnAccumulate: function (fId, oldVal, newVal, features) {
			if (newVal == null)
				return oldVal;
			newVal = newVal.toString();
			if (oldVal == null || newVal.toLowerCase().indexOf(oldVal.toLowerCase()) >= 0)
				return newVal;
			if (oldVal.toLowerCase().indexOf(newVal.toLowerCase()) >= 0)
				return oldVal;
			return oldVal + ", " + newVal;
		},
		"handlers": {
			"sizeChange": function (e) { this.queryEntries(this.pageStart, parseInt($(e.target).val())); },
			"filter": function () { this.updateTables(); },
			"alignTables": function () {
				$(this.fixTable).dataTable().fnAdjustColumnSizing();
				this.equalizeTables();
			}
		},
		"groups": {
			"Identifiers": [
				"http://www.opentox.org/api/1.1#Diagram",
				"#DetailedInfoRow",
				"http://www.opentox.org/api/1.1#CASRN",
				"http://www.opentox.org/api/1.1#EINECS",
				"http://www.opentox.org/api/1.1#IUCLID5_UUID"
			],

			"Names": [
				"http://www.opentox.org/api/1.1#ChemicalName",
				"http://www.opentox.org/api/1.1#TradeName",
				"http://www.opentox.org/api/1.1#IUPACName",
				"http://www.opentox.org/api/1.1#SMILES",
				"http://www.opentox.org/api/1.1#InChIKey",
				"http://www.opentox.org/api/1.1#InChI",
				"http://www.opentox.org/api/1.1#REACHRegistrationDate"
			],

			"Calculated": function (name, miniset) {
				var arr = [];
				if (miniset.dataEntry.length > 0 && miniset.dataEntry[0].compound.metric != null)
					arr.push(this.settings.metricFeature);

				for (var f in miniset.feature) {
					var feat = miniset.feature[f];
					if (feat.source == null || feat.source.type == null || !!feat.basic)
						continue;
					else if (feat.source.type.toLowerCase() == "algorithm" || feat.source.type.toLowerCase() == "model") {
						arr.push(f);
					}
				}
				return arr;
			},

			"Other": function (name, miniset, usedFeatures) {
				var arr = [];
				for (var f in miniset.feature) {
					if (!(f in usedFeatures) && !miniset.feature[f].basic)
						arr.push(f);
				}
				return arr;
			}
		},
		"exports": [{
			type: "chemical/x-mdl-sdfile",
			icon: "/assets/img/types/sdf64.png"
		}, {
			type: "chemical/x-cml",
			icon: "/assets/img/types/cml64.png"
		}, {
			type: "chemical/x-daylight-smiles",
			icon: "/assets/img/types/smi64.png"
		}, {
			type: "chemical/x-inchi",
			icon: "/assets/img/types/inchi64.png"
		}, {
			type: "text/uri-list",
			icon: "/assets/img/types/lnk64.png"
		}, {
			type: "application/pdf",
			icon: "/assets/img/types/pdf64.png"
		}, {
			type: "text/csv",
			icon: "/assets/img/types/csv64.png"
		}, {
			type: "text/plain",
			icon: "/assets/img/types/txt64.png"
		}, {
			type: "text/x-arff",
			icon: "/assets/img/types/arff.png"
		}, {
			type: "text/x-arff-3col",
			icon: "/assets/img/types/arff-3.png"
		}, {
			type: "application/rdf+xml",
			icon: "/assets/img/types/rdf64.png"
		}, {
			type: "application/json",
			icon: "/assets/img/types/json64.png"
		}, {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			icon: "/assets/img/types/xlsx.png"
		}],

		// These are instance-wide pre-definitions of default baseFeatures as described below.
		"baseFeatures": {
			"http://www.opentox.org/api/1.1#Similarity": {
				title: "Similarity",
				data: "compound.metric",
				search: true
			},
		},
		"columns": {
			"compound": {
				"Name": {
					title: "Name",
					data: 'title',
					render: function (data, type, full) {
						return '<span>' + data + '</span>' + jT.ui.fillHtml('info-ball', { href: full.URI || '#', title: "Compound's detailed info" });
					}
				},
				"Value": {
					title: "Value",
					data: 'value',
					defaultContent: "-"
				},
				"SameAs": {
					title: "SameAs",
					data: 'sameAs',
					defaultContent: "-"
				},
				"Source": {
					title: "Source",
					data: 'source',
					defaultContent: "-",
					render: function (data, type, full) {
						return !data || !data.type ? '-' : '<a target="_blank" href="' + data.URI + '">' + data.type + '</a>';
					}
				}
			}
		}
	};

	jT.ui.Compound = CompoundKit;

})(_, jQuery, jToxKit);
