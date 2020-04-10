/** jToxKit - chem-informatics multi-tool-kit.
 * Wrapper of table-relevant tools. To be assigned to specific prototype functions
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2020, IDEAConsult Ltd. All rights reserved.
 */

jT.tables = {
	nextPage: function () {
		if (this.entriesCount == null || this.pageStart + this.pageSize < this.entriesCount)
			this.queryEntries(this.pageStart + this.pageSize);
	},

	prevPage: function () {
		if (this.pageStart > 0)
			this.queryEntries(this.pageStart - this.pageSize);
	},

	updateControls: function (qStart, qSize) {
		var pane = $('.jtox-controls', this.rootElement);
		jT.ui.updateTree(pane, {
			"pagestart": qSize > 0 ? qStart + 1 : 0,
			"pageend": qStart + qSize
		});
		pane = pane[0];

		var nextBut = $('.next-field', pane);
		if (this.entriesCount == null || qStart + qSize < this.entriesCount)
			$(nextBut).addClass('paginate_enabled_next').removeClass('paginate_disabled_next');
		else
			$(nextBut).addClass('paginate_disabled_next').removeClass('paginate_enabled_next');

		var prevBut = $('.prev-field', pane);
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

	inlineChanger: function (location, breed, holder, handler) {
		if (handler == null)
			handler = "changed";

		if (breed == "select")
			return function (data, type, full) {
				return type != 'display' ? (data || '') : '<select class="jt-inlineaction jtox-handler" data-handler="' + handler + '" data-data="' + location + '" value="' + (data || '') + '">' + (holder || '') + '</select>';
			};
		else if (breed == "checkbox") // we use holder as 'isChecked' value
			return function (data, type, full) {
				return type != 'display' ? (data || '') : '<input type="checkbox" class="jt-inlineaction jtox-handler" data-handler="' + handler + '" data-data="' + location + '"' + (((!!holder && data == holder) || !!data) ? 'checked="checked"' : '') + '"/>';
			};
		else if (breed == "text")
			return function (data, type, full) {
				return type != 'display' ? (data || '') : '<input type="text" class="jt-inlineaction jtox-handler" data-handler="' + handler + '" data-data="' + location + '" value="' + (data || '') + '"' + (!holder ? '' : ' placeholder="' + holder + '"') + '/>';
			};
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

	installHandlers: function (kit, root) {
		if (root == null)
			root = kit.rootElement;

		$('.jtox-handler', root).each(function () {
			var name = $(this).data('handler');
			var handler = null;
			if (kit.settings.configuration != null && kit.settings.configuration != null)
				handler = kit.settings.handlers[name];
			handler = handler || window[name];

			if (!handler)
				console.log("jToxQuery: referring unknown handler: " + name);
			else if (this.tagName == "INPUT" || this.tagName == "SELECT" || this.tagName == "TEXTAREA")
				$(this).on('change', handler).on('keydown', jT.ui.enterBlur);
			else // all the rest respond on click
				$(this).on('click', handler);
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
				jT.tables.installHandlers(kit, nRow);
				if (typeof kit.settings.selectionHandler == "function")
					$('input.jt-selection', nRow).on('change', kit.settings.selectionHandler);
				// other (non-function) handlers are installed via installHandlers().

				if (!!kit.settings.onDetails) {
					$('.jtox-details-toggle', nRow).on('click', function (e) {
						var root = jT.tables.toggleDetails(e, nRow);
						if (!!root) {
							jT.fireCallback(kit.settings.onDetails, kit, root, aData, this);
						}
					});
				}
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

	bindControls: function (kit, handlers) {
		var pane = $('.jtox-controls', kit.rootElement);
		if (kit.settings.showControls) {
			jT.ui.updateTree(pane, { "pagesize": kit.settings.pageSize });
			pane = pane[0];

			$('.next-field', pane).on('click', handlers.nextPage);
			$('.prev-field', pane).on('click', handlers.prevPage);
			$('select', pane).on('change', handlers.sizeChange)
			var pressTimeout = null;
			$('input', pane).on('keydown', function (e) {
				var el = this;
				if (pressTimeout != null)
					clearTimeout(pressTimeout);
				pressTimeout = setTimeout(function () {
					handlers.filter.apply(el, [e]);
				}, 350);
			});
		} else // ok - hide me
			pane.style.display = "none";
	},

	putActions: function (kit, col, ignoreOriginal) {
		if (!!kit.settings.selectionHandler || !!kit.settings.onDetails) {
			var oldFn = col.render;
			var newFn = function (data, type, full) {
				var html = oldFn(data, type, full);
				if (type != 'display')
					return html;

				if (!!ignoreOriginal)
					html = '';

				// this is inserted BEFORE the original, starting with given PRE-content
				if (!!kit.settings.selectionHandler)
					html = '<input type="checkbox" value="' + data + '" class="' +
					(typeof kit.settings.selectionHandler == 'string' ? 'jtox-handler" data-handler="' + kit.settings.selectionHandler + '"' : 'jt-selection"') +
					'/>' + html;

				// strange enough - this is inserted AFTER the original
				if (!!kit.settings.onDetails)
					html += '<span class="jtox-details-toggle ui-icon ui-icon-folder-collapsed" data-data="' + data + '" title="Press to open/close detailed info for this entry"></span>';

				return html;
			};

			col.render = newFn;
		}
		return col;
	},

	toggleDetails: function (event, row) {
		$(event.currentTarget).toggleClass('ui-icon-folder-collapsed');
		$(event.currentTarget).toggleClass('ui-icon-folder-open');
		$(event.currentTarget).toggleClass('jtox-openned');
		if (!row)
			row = $(event.currentTarget).parents('tr')[0];

		var cell = $(event.currentTarget).parents('td')[0];

		if ($(event.currentTarget).hasClass('jtox-openned')) {
			var detRow = document.createElement('tr');
			var detCell = document.createElement('td');
			detRow.appendChild(detCell);
			$(detCell).addClass('jtox-details');

			detCell.setAttribute('colspan', $(row).children().length - 1);
			row.parentNode.insertBefore(detRow, row.nextElementSibling);

			cell.setAttribute('rowspan', '2');
			return detCell;
		} else {
			cell.removeAttribute('rowspan');
			$($(row).next()).remove();
			return null;
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

	getTable: function(el) {
		return $(el).parents('table.dataTable').DataTable()
	}
};