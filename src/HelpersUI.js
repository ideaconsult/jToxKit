/** jToxKit - chem-informatics multi-tool-kit.
 * UI helpers
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2012-2019, IDEAConsult Ltd. All rights reserved.
 * http://www.ideaconsult.net/
 */

import $ from 'jquery';
import _ from 'lodash';

export default {
	shortenedData: function (content, message, data) {
		var res = '';

		if (data == null)
			data = content;
		if (data.toString().length <= 5) {
			res += content;
		} else {
			res += '<div class="shortened">' + content + '</div>';
			if (message != null)
				res += '<span class="ui-icon ui-icon-copy" title="' + message + '" data-uuid="' + data + '"></span>';
		}
		return res;
	},
	linkedData: function (content, message, data) {
		var res = '';

		if (data == null) {
			data = content;
		}
		if (data.toString().length <= 5) {
			res += content;
		} else {
			if (message != null) {
				res += res += '<div title="' + message + '">' + content + '</div>';
			} else res += '<div >' + content + '</div>';
		}
		return res;
	},
	changeTabsIds: function (root, suffix) {
		$('ul li a', root).each(function () {
			var id = $(this).attr('href').substr(1);
			var el = document.getElementById(id);
			id += suffix;
			el.id = id;
			$(this).attr('href', '#' + id);
		})
	},

	addTab: function (root, name, id, content) {
		// first try to see if there is same already...
		if (document.getElementById(id) != null)
			return;

		// first, create and add li/a element
		var li = document.createElement('li');
		var a = document.createElement('a');
		li.appendChild(a);
		a.href = '#' + id;
		a.innerHTML = name;
		$('ul', root)[0].appendChild(li);

		// then proceed with the panel, itself...
		if (typeof content == 'function')
			content = content(root);
		else if (typeof content == 'string') {
			var div = document.createElement('div');
			div.innerHTML = content;
			content = div;
		}

		content.id = id;
		root.appendChild(content);
		$(root).tabs('refresh');
		return {
			'tab': a,
			'content': content
		};
	},

	modifyColDef: function (kit, col, category, group) {
		if (col.sTitle === undefined || col.sTitle == null)
			return null;

		var name = col.sTitle.toLowerCase();

		// helper function for retrieving col definition, if exists. Returns empty object, if no.
		var getColDef = function (cat) {
			var catCol = kit.configuration.columns[cat];
			if (catCol != null) {
				if (!!group) {
					catCol = catCol[group];
					if (catCol != null) {
						// Allow bVisible to be set on the whole category
						if (catCol.bVisible != null) {
							catCol[name] = catCol[name] || {};
							catCol[name].bVisible = !!catCol[name].bVisible || !!catCol.bVisible;
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
		return col.bVisible == null || col.bVisible ? col : null;
	},

	sortColDefs: function (colDefs) {
		for (var i = 0, l = colDefs.length; i < l; ++i)
			colDefs[i].iNaturalOrder = i;
		colDefs.sort(function (a, b) {
			var res = (a.iOrder || 0) - (b.iOrder || 0);
			if (res == 0) // i.e. they are equal
				res = a.iNaturalOrder - b.iNaturalOrder;
			return res;
		});
	},

	processColumns: function (kit, category) {
		var colDefs = [];
		var catList = kit.configuration.columns[category];
		for (var name in catList) {
			var col = this.modifyColDef(kit, catList[name], category);
			if (col != null)
				colDefs.push(col);
		}

		this.sortColDefs(colDefs);
		return colDefs;
	},

	renderMulti: function (data, type, full, render) {
		var dlen = data.length;
		if (dlen < 2)
			return render(data[0], type, full);

		var df = '<table>';
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
			if (kit.configuration != null && kit.configuration.handlers != null)
				handler = kit.configuration.handlers[name];
			handler = handler || window[name];

			if (!handler)
				console && console.log("jToxQuery: referring unknown handler: " + name);
			else if (this.tagName == "INPUT" || this.tagName == "SELECT" || this.tagName == "TEXTAREA")
				$(this).on('change', handler).on('keydown', jT.enterBlur);
			else // all the rest respond on click
				$(this).on('click', handler);
		});
	},

	enterBlur: function (e) {
		if (e.keyCode == 13)
			this.blur();
	},

	rowData: function (el) {
		var row = $(el).closest('tr')[0];
		var table = $(row).closest('table')[0];
		return $(table).dataTable().fnGetData(row);
	},

	rowIndex: function (el) {
		var row = $(el).closest('tr')[0];
		var table = $(row).closest('table')[0];
		return $(table).dataTable().fnGetPosition(row);
	},

	rowInline: function (el, base) {
		var row = $(el).closest('tr')[0];
		var data = $.extend({}, base);
		$('.jt-inlineaction', row).each(function () {
			var loc = $(this).data('data');
			if (loc != null)
				_.set(data, loc, $(this).val());
		});

		return data;
	},

	columnData: function (cols, data, type) {
		var out = new Array(data.length);
		if (type == null)
			type = 'display';
		for (var i = 0, dl = data.length; i < dl; ++i) {
			var entry = {};
			var d = data[i];
			for (var c = 0, cl = cols.length; c < cl; ++c) {
				var col = cols[c],
					val = _.get(d, col.mData) || col.sDefaultValue;
				entry[col.sTitle] = typeof col.mRender != 'function' ? val : col.mRender(val, type, d);
			}

			out[i] = entry;
		}

		return out;
	},

	queryInfo: function (aoData) {
		var info = {};
		for (var i = 0, dl = aoData.length; i < dl; ++i)
			info[aoData[i].name] = aoData[i].value;

		if (info.iSortingCols > 0) {
			info.iSortDirection = info.sSortDir_0.toLowerCase();
			info.sSortData = info["mDataProp_" + info.iSortCol_0];
		} else {
			info.iSortDirection = 0;
			info.sSortData = "";
		}

		return info;
	},

	putTable: function (kit, root, config) {
		var self = this,
			onRow = kit.onRow,
			opts = $.extend({
				"bPaginate": false,
				"bProcessing": true,
				"bLengthChange": false,
				"bAutoWidth": false,
				"sDom": kit.sDom,
				"oLanguage": kit.oLanguage,
				"bServerSide": false,
				"fnCreatedRow": function (nRow, aData, iDataIndex) {
					// call the provided onRow handler, if any
					if (typeof onRow == 'function') {
						var res = a$.act(kit, onRow, nRow, aData, iDataIndex);
						if (res === false)
							return;
					}

					// equalize multi-rows, if there are any
					self.equalizeHeights.apply(window, $('td.jtox-multi table tbody', nRow).toArray());

					// handle a selection click.. if any
					self.installHandlers(kit, nRow);
					if (typeof kit.selectionHandler == "function")
						$('input.jt-selection', nRow).on('change', kit.selectionHandler);
					// other (non-function) handlers are installed via installHandlers().

					if (!!kit.onDetails) {
						$('.jtox-details-toggle', nRow).on('click', function (e) {
							var root = self.toggleDetails(e, nRow);
							if (!!root) {
								a$.act(kit, kit.onDetails, root, aData, this)
							}
						});
					}
				}
			}, kit.configuration);

		if (opts.aoColumns == null)
			opts.aoColumns = self.processColumns(kit, config);
		if (opts.oLanguage == null)
			delete opts.oLanguage;

		var table = $(root).dataTable(opts);
		$(table).dataTable().fnAdjustColumnSizing();
		return table;
	},

	renderRelation: function (data, type, full) {
		if (type != 'display')
			return this.joinDeep(data, 'relation', ',');

		var res = '';
		for (var i = 0, il = data.length; i < il; ++i)
			res += '<span>' + 
					data[i].relation.substring(4).toLowerCase() + 
					'</span>' + 
					this.putInfo(full.URI + '/composition', data[i].compositionName + '(' + data[i].compositionUUID + ')');
		return res;
	},

	renderRange: function (data, unit, type, prefix) {
		var out = "";
		if (typeof data == 'string' || typeof data == 'number') {
			out += (type != 'display') ? data : ((!!prefix ? prefix + "&nbsp;=&nbsp;" : '') + this.valueWithUnits(data, unit));
		} else if (typeof data == 'object' && data != null) {
			var loValue = _.trim(data.loValue),
				upValue = _.trim(data.upValue);

			if (String(loValue) != '' && String(upValue) != '' && !!data.upQualifier && data.loQualifier != '=') {
				if (!!prefix) {
					out += prefix + "&nbsp;=&nbsp;";
				}
				out += (data.loQualifier == ">=") ? "[" : "(";
				out += loValue + ", " + upValue;
				out += (data.upQualifier == "<=") ? "]" : ") ";
			} else { // either of them is non-undefined

				var fnFormat = function (p, q, v) {
					var o = '';
					if (!!p) {
						o += p + ' ';
					}
					if (!!q) {
						o += (!!p || q != '=') ? (q + ' ') : '';
					}
					return o + v;
				};

				if (String(loValue) != '') {
					out += fnFormat(prefix, data.loQualifier || '=', loValue);
				} else if (String(upValue) != '') {
					out += fnFormat(prefix, data.upQualifier || '=', upValue);
				} else {
					if (!!prefix) {
						out += prefix;
					} else {
						out += type == 'display' ? '-' : '';
					}
				}
			}

			out = out.replace(/ /g, "&nbsp;");
			if (type == 'display') {
				unit = _.trim(data.unit || unit);
				if (!!unit) {
					out += '&nbsp;<span class="units">' + unit.replace(/ /g, "&nbsp;") + '</span>';
				}
			}
		} else {
			out += '-';
		}
		return out;
	},

	renderObjValue: function (data, units, type, pre) {
		if (!data) {
			return type == 'display' ? '-' : '';
		}

		var val = this.renderRange(data, units, type, pre);
		if (_.trim(val) == '-') {
			val = '';
		}
		if (val != '' && type != 'display' && !!data.units) {
			val += '&nbsp;' + data.units;
		}
		if (!!data.textValue) {
			if (val != '' && type == 'display') {
				val += '&nbsp;/&nbsp;';
			}
			val += data.textValue;
		}

		if (!val) {
			val = '-';
		}
		return val;
	},

	putInfo: function (href, title) {
		return '<sup class="helper"><a target="_blank" href="' + (href || '#') + '" title="' + (title || href) + '"><span class="ui-icon ui-icon-info"></span></a></sup>';
	},

	putStars: function (kit, stars, title) {
		if (!kit.shortStars) {
			var res = '<div title="' + title + '">';
			for (var i = 0; i < kit.maxStars; ++i) {
				res += '<span class="ui-icon ui-icon-star jtox-inline';
				if (i >= stars)
					res += ' transparent';
				res += '"></span>';
			}
			return res + '</div>';
		} else { // i.e. short version
			return '<span class="ui-icon ui-icon-star jtox-inline" title="' + title + '"></span>' + stars;
		}
	},

	diagramUri: function (URI) {
		return !!URI && (typeof URI == 'string') ? URI.replace(/(.+)(\/conformer.*)/, "$1") + "?media=image/png" : '';
	},

	valueWithUnits: function (val, unit) {
		var out = '';
		if (val != null) {
			out += _.trim(val.toString()).replace(/ /g, "&nbsp;");
			if (!!unit)
				out += '&nbsp;<span class="units">' + unit.replace(/ /g, "&nbsp;") + '</span>';
		}
		return out;
	},

	updateCounter: function(str, count, total) {
		var re = null;
		var add = '';
		if (count == null)
			count = 0;
		if (total == null) {
			re = /\(([\d\?]+)\)$/;
			add = '' + count;
		} else {
			re = /\(([\d\?]+\/[\d\?\+-]+)\)$/;
			add = '' + count + '/' + total;
		}

		// now the addition
		if (!str.match(re))
			str += ' (' + add + ')';
		else
			str = str.replace(re, "(" + add + ")");

		return str;
	},

	bindControls: function (kit, handlers) {
		var pane = $('.jtox-controls', kit.rootElement)[0];
		if (kit.showControls) {
			this.fillTree(pane, {"pagesize": kit.pageSize});
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
		if (!!kit.selectionHandler || !!kit.onDetails) {
			var oldFn = col.mRender;
			var newFn = function (data, type, full) {
				var html = oldFn(data, type, full);
				if (type != 'display')
					return html;

				if (!!ignoreOriginal)
					html = '';

				// this is inserted BEFORE the original, starting with given PRE-content
				if (!!kit.selectionHandler)
					html = '<input type="checkbox" value="' + data + '" class="' +
					(typeof kit.selectionHandler == 'string' ? 'jtox-handler" data-handler="' + kit.selectionHandler + '"' : 'jt-selection"') +
					'/>' + html;

				// strange enough - this is inserted AFTER the original
				if (!!kit.onDetails)
					html += '<span class="jtox-details-toggle ui-icon ui-icon-folder-collapsed" data-data="' + data + '" title="Press to open/close detailed info for this entry"></span>';

				return html;
			};

			col.mRender = newFn;
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
			$(row).next().remove();
			return null;
		}
	},

	equalizeHeights: function () {
		var tabs = [];
		for (var i = 0; i < arguments.length; ++i) {
			tabs[i] = arguments[i].firstElementChild;
		}

		for (;;) {
			var height = 0;
			for (i = 0; i < tabs.length; ++i) {
				if (tabs[i] == null)
					continue;

				if (!jQuery(tabs[i]).hasClass('lock-height') && tabs[i].style.height != '')
					tabs[i].style.height = "auto";

				if (tabs[i].offsetHeight > height)
					height = tabs[i].offsetHeight;
			}

			if (height == 0)
				break;

			for (i = 0; i < tabs.length; ++i) {
				if (tabs[i] != null) {
					jQuery(tabs[i]).height(height);
					tabs[i] = tabs[i].nextElementSibling;
				}
			}
		}
	}
};