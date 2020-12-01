/** jToxKit - chem-informatics multi-tool-kit.
 * Wrapper of table-relevant tools. To be assigned to specific prototype functions
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2020, IDEAConsult Ltd. All rights reserved.
 */

jT.tables = {
	updateControls: function (qStart, qSize) {
		var pane = $('.jtox-controls', this.rootElement);
		if (!this.settings.showControls) {
			pane.hide();
			return;
		}

		if (qStart == null)
			qStart = this.settings.pageStart;
		if (qSize == null)			
			qSize = this.settings.pageSize;

		jT.ui.updateTree(pane, {
			"pagesize": qSize,
			"pagestart": qSize > 0 ? qStart + 1 : 0,
			"pageend": qStart + qSize
		});

		var nextBut = $('.jtox-handler[data-handler=nextPage]', pane);
		if (this.entriesCount == null || qStart + qSize < this.entriesCount)
			$(nextBut).addClass('paginate_enabled_next').removeClass('paginate_disabled_next');
		else
			$(nextBut).addClass('paginate_disabled_next').removeClass('paginate_enabled_next');

		var prevBut = $('.jtox-handler[data-handler=prevPage]', pane);
		if (qStart > 0)
			$(prevBut).addClass('paginate_enabled_previous').removeClass('paginate_disabled_previous');
		else
			$(prevBut).addClass('paginate_disabled_previous').removeClass('paginate_enabled_previous');
	},

	modifyColDef: function (kit, col, category, group) {
		if (col.title === undefined || col.title == null)
			return null;

		var name = col.title.toLowerCase();

		// helper function for retrieving col definition, if exists. Returns empty object, if no.
		var getColDef = function (cat) {
			var catCol = kit.settings.columns[cat];
			if (catCol != null) {
				if (!!group) {
					catCol = catCol[group];
					if (catCol != null) {
						// Allow visible to be set on the whole category
						if (catCol.visible != null) {
							catCol[name] = catCol[name] || {};
							catCol[name].visible = !!catCol[name].visible || !!catCol.visible;
						}
						catCol = catCol[name];
					}
				} else {
					catCol = catCol[name];
				}
			}

			if (catCol == null)
				catCol = {};
			return catCol;
		};
		// now form the default column, if existing and the category-specific one...
		// extract column redefinitions and merge them all.
		col = $.extend(col, (!!group ? getColDef('_') : {}), getColDef(category));
		return col.visible == null || col.visible ? col : null;
	},

	sortColDefs: function (colDefs) {
		for (var i = 0, l = colDefs.length; i < l; ++i)
			colDefs[i].naturalOrder = i;
		colDefs.sort(function (a, b) {
			var res = (a.order || 0) - (b.order || 0);
			if (res == 0) // i.e. they are equal
				res = a.naturalOrder - b.naturalOrder;
			return res;
		});
	},

	processColumns: function (kit, category) {
		var colDefs = [];
		var catList = kit.settings.columns[category];
		for (var name in catList) {
			var col = this.modifyColDef(kit, catList[name], category);
			if (col != null)
				colDefs.push(col);
		}

		this.sortColDefs(colDefs);
		return colDefs;
	},

	renderMulti: function (data, type, full, render, tabInfo) {
		var dlen = data.length;
		if (dlen < 2)
			return render(data[0], type, full);

		var df = '<table' + (!tabInfo ? '' : ' ' + _.map(tabInfo, function (v, k) { return 'data-' + k + '="' + v + '"'; }).join(' ')) + '>';
		for (var i = 0, dlen = data.length; i < dlen; ++i) {
			df += '<tr class="' + (i % 2 == 0 ? 'even' : 'odd') + '"><td>' + render(data[i], type, full, i) + '</td></tr>';
		}

		df += '</table>';
		return df;
	},

	installMultiSelect: function (root, callback, parenter) {
		if (parenter == null)
			parenter = function (el) {
				return el.parentNode;
			};
		$('a.select-all', root).on('click', function (e) {
			$('input[type="checkbox"]', parenter(this)).each(function () {
				this.checked = true;
				if (callback == null) $(this).trigger('change');
			});
			if (callback != null)
				callback.call(this, e);
		});
		$('a.unselect-all', root).on('click', function (e) {
			$('input[type="checkbox"]', parenter(this)).each(function () {
				this.checked = false;
				if (callback == null) $(this).trigger('change');
			});
			if (callback != null)
				callback.call(this, e);
		});
	},

	columnData: function (cols, data, type) {
		var out = new Array(data.length);
		if (type == null)
			type = 'display';
		for (var i = 0, dl = data.length; i < dl; ++i) {
			var entry = {};
			var d = data[i];
			for (var c = 0, cl = cols.length; c < cl; ++c) {
				var col = cols[c];
				var val = _.get(d, col.data, col.defaultValue);
				entry[col.title] = typeof col.render != 'function' ? val : col.render(val, type, d);
			}

			out[i] = entry;
		}

		return out;
	},

	getRowData: function (el) {
		var table = $(el).closest('table').DataTable(),
			row = $(el).closest('tr')[0];
		return table && table.row(row).data();
	},

	queryInfo: function (data) {
		var info = {};
		for (var i = 0, dl = data.length; i < dl; ++i)
			info[data[i].name] = data[i].value;

		if (info.sortingCols > 0) {
			info.sortDirection = info.sortDir_0.toLowerCase();
			info.sortData = info["dataProp_" + info.sortCol_0];
		} else {
			info.sortDirection = 0;
			info.sortData = "";
		}

		return info;
	},

	putTable: function (kit, root, config, settings) {
		var onRow = kit.settings.onRow;
		if (onRow === undefined && settings != null)
			onRow = settings.onRow;

		var opts = $.extend({
			"paging": false,
			"processing": true,
			"lengthChange": false,
			"autoWidth": false,
			"dom": kit.settings.dom,
			"language": kit.settings.oLanguage,
			"serverSide": false,
			"createdRow": function (nRow, aData, iDataIndex) {
				// call the provided onRow handler, if any
				if (typeof onRow == 'function') {
					var res = jT.fireCallback(onRow, kit, nRow, aData, iDataIndex);
					if (res === false)
						return;
				}

				// equalize multi-rows, if there are any
				jT.tables.equalizeHeights.apply(window, $('td.jtox-multi table tbody', nRow).toArray());

				// handle a selection click.. if any
				jT.ui.installHandlers(kit, nRow, jT.tables.commonHandlers);
			}
		}, settings);

		if (opts.columns == null)
			opts.columns = jT.tables.processColumns(kit, config);
		if (opts.language == null)
			delete opts.language;

		var table = $(root).dataTable(opts);
		$(table).DataTable().columns.adjust();
		return table;
	},

	insertRenderer: function (inplace, colDef, render, pos) {
		if (typeof inplace !== 'boolean') {
			pos = render;
			render = colDef;
			colDef = inplace;
			inplace = false;
		}

		var oldRender = colDef.render,
			newRender = !oldRender ? render : function (data, type, full) {
				var oldContent = oldRender(data, type, full),
					newContent = render(data, type, full);

				return (pos === 'before') ? newContent + oldContent : oldContent + newContent;
			};

		if (inplace)
			colDef.render = newRender;
		else
			colDef = $.extend({}, colDef, { render: newRender });
		return colDef;
	},

	getDetailsRenderer: function (subject, handler) {
		var html = '<i class="jtox-details-open fa fa-folder jtox-handler" data-handler="' + (handler || 'toggleDetails') + 
			'" title="Press to open/close detailed info for this ' + subject + '"></i>';
		return function (data, type)  { return type === 'display' ? html : data; }
	},

	getSelectionRenderer: function (subject, handler) {
		return function (data, type, full) {
			return type !== 'display' 
				? data 
				: '<input type="checkbox" value="' + data + '" class="jt-selection jtox-handler" data-handler="' + (handler || 'toggleSelection') + 
				'" title="Add this ' + (subject || 'entry') + ' to the selection"' + '/>';
		}
	},

	equalizeHeights: function () {
		var tabs = [];
		for (var i = 0; i < arguments.length; ++i)
			tabs[i] = arguments[i].firstElementChild;

		for (;;) {
			var height = 0;
			for (i = 0; i < tabs.length; ++i) {
				if (tabs[i] == null)
					continue;

				if (!$(tabs[i]).hasClass('lock-height') && tabs[i].style.height != '')
					tabs[i].style.height = "auto";

				if (tabs[i].offsetHeight > height)
					height = tabs[i].offsetHeight;
			}

			if (height == 0)
				break;

			for (i = 0; i < tabs.length; ++i) {
				if (tabs[i] != null) {
					$(tabs[i]).height(height);
					tabs[i] = tabs[i].nextElementSibling;
				}
			}
		}
	},
	commonHandlers: {
		nextPage: function () {
			if (this.entriesCount == null || this.pageStart + this.pageSize < this.entriesCount)
				this.queryEntries(this.pageStart + this.pageSize);
		},
	
		prevPage: function () {
			if (this.pageStart > 0)
				this.queryEntries(this.pageStart - this.pageSize);
		},
		toggleDetails: function (event) {
			var el$ = $(event.target),
				row = el$.closest('tr')[0],
				cell = el$.closest('td')[0];

			el$.toggleClass('fa-folder fa-folder-open jtox-openned');
	
			if (el$.hasClass('jtox-openned')) {
				var detRow = document.createElement('tr'),
					detCell = document.createElement('td');
				detRow.appendChild(detCell);
				$(detCell).addClass('jtox-details');
	
				detCell.setAttribute('colspan', $(row).children().length - 1);
				row.parentNode.insertBefore(detRow, row.nextElementSibling);
	
				cell.setAttribute('rowspan', '2');
	
				return jT.fireCallback(this.settings.onDetails, this, detCell, jT.tables.getRowData(row), el$[0]);
			} else {
				cell.removeAttribute('rowspan');
				$($(row).next()).remove();
				return null;
			}
		},
	}
};