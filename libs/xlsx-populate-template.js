/* eslint-disable eqeqeq */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-negated-condition */
/* eslint-disable object-shorthand */
"use strict";

(function (_, XlsxPopulate, global) {

var defaultOpts = {
    templateRegExp: new RegExp(/\{\{([^}]*)\}\}/),
    fieldSplitter: "|",
    joinText: ",",
    callbacksMap: {
        "": function (data) { return  _.keys(data); }
    }
};

/**
 * Constructs a new instance of XlsxDataPopulate with given options.
 * @param {{}} opts - Options to be used during processing.
 * @param {RegExp} opts.templateRegExp The regular expression to be used for template parsing.
 * @param {string} opts.fieldSplitter The string to be expected as template field splitter.
 * @param {string} opts.joinText The string to be used when extracting array values.
 * @param {Object.<Workbook~populateCallback>} opts.callbacksMap A map of handlers to be used for data extraction.
 */
function XlsxDataPopulate (opts) {
    this._opts = _.defaultsDeep({}, opts, defaultOpts);
    this._rowSizes = {};
    this._colSizes = {};
};

/**
 * Setter/getter for XlsxDataPopulate's options as set during construction.
 * @param {{}|null} newOpts If set - the news options to be used.
 * @returns {XlsxDataPopulate|{}} The required options or XlsxDataPopulate (in set mode) for chaining.
 */
XlsxDataPopulate.prototype.options = function (newOpts) {
    if (newOpts !== null) {
        _.merge(this._opts, newOpts);
        return this;
    } else
        return this._opts;
};

/**
 * Gets the textual representation of the cell value.
 * @param {string|boolean|number|null|undefined|RichText} cellValue - The value as retrieved from Cell.value() method.
 * @returns {string} The textual representation of cell's contents.
 */
XlsxDataPopulate.prototype.textValue = function (cellValue) {
    return cellValue instanceof XlsxPopulate.RichText ? cellValue.text() : cellValue;
};

/**
 * Measures the distance, as a vector between two given cells.
 * @param {Cell} from The first cell.
 * @param {Cell} to The second cell.
 * @returns {Array.<Number>} An array with two values [<rows>, <cols>], representing the distance between the two cells.
 */
XlsxDataPopulate.prototype.cellDistance = function (from, to) {
    return [
        to.rowNumber() - from.rowNumber(),
        to.columnNumber() - from.columnNumber()
    ];
};

/**
 * Determines the size of cell, taking into account if it is part of a merged range.
 * @param {Cell} cell The cell to be investigated.
 * @returns {Array.<Number>} An array with two values [<rows>, <cols>], representing the occupied size.
 */
XlsxDataPopulate.prototype.cellSize = function (cell) {
    var cellAddr = cell.address(),
        theSize = [1, 1],
        self = this;

    _.forEach(cell.sheet()._mergeCells, function (range) {
        var rangeAddr = range.attributes.ref.split(":");
        if (rangeAddr[0] == cellAddr) {
            theSize = self.cellDistance(cell, cell.sheet().cell(rangeAddr[1]));
            ++theSize[0];
            ++theSize[1];
            return false;
        }
    });

    return theSize;
};

/**
 * Constructs and returns the range starting from the given cell and spawning given rows and cells.
 * @param {Cell} cell The starting cell of the range.
 * @param {Number} rowOffset Number of rows away from the starting cell. 0 means same row.
 * @param {Number} colOffset Number of columns away from the starting cell. 0 means same column.
 * @returns {Range} The constructed range.
 */
XlsxDataPopulate.prototype.getCellRange = function (cell, rowOffset, colOffset) {
    return cell.rangeTo(cell.relativeCell(rowOffset, colOffset));
};

/**
 * Parses the provided extractor (ot iterator) string to find a callback id inside, if present.
 * @param {string} extractor The iterator/extractor string to be investigated.
 * @returns {Object.<string, function>} A { `path`, `handler` } object representing the JSON path
 * ready for use and the provided `handler` _function_ - ready for invoking, if such is provided.
 * If not - the `path` property contains the provided `extractor`, and the `handler` is `null`.
 */
XlsxDataPopulate.prototype.parseExtractor = function (extractor) {
    // A specific extractor can be specified after semilon - find and remember it.
    var extractParts = extractor.split(":")

    return extractParts.length == 1
        ? { path: extractor, handler: null }
        : {
            path: extractParts[0],
            handler: this._opts.callbacksMap[extractParts[1]]
        };
};

/**
 * Parses the contents of the cell into a valid template info.
 * @param {Cell} cell The cell containing the template to be parsed.
 * @returns {{}} The parsed template.
 * @description This method builds template info, taking into account the supplied options.
 */
XlsxDataPopulate.prototype.parseTemplate = function (cell) {
    // The options are in `this` argument.
    var reMatch = (this.textValue(cell.value()) || '').match(this._opts.templateRegExp);
    
    if (!reMatch) return null;

    var parts = reMatch[1].split(this._opts.fieldSplitter).map(_.trim),
        iters = parts[1].split(/x|\*/).map(_.trim),
        styles = !parts[4] ? null : parts[4].split(",");

    return {
        reference: _.trim(parts[0]),
        iterators: iters,
        extractor: parts[2] || "",
        cell: cell,
        cellSize: this.cellSize(cell),
        padding: (parts[3] || "").split(/:|,|x|\*/).map(function (v) { return parseInt(v) || 0 }),
        styles: !styles ? null : _.map(styles, function (s) {
            var pair = _.trim(s).split("=");
            return { name: _.trim(pair[0]), extractor: _.trim(pair[1]) };
        })
    };
};

/**
 * Searches the whole workbook for template pattern and constructs the templates for processing.
 * @param {Workbook} wb The workbook to be investigated for templates.
 * @returns {Array.<Object>} An array of templates.
 * @description The templates returned are sorted, based on the intra-template reference - if one template
 * is referring another one, it'll appear _later_ in the returned array, than the referred template.
 */
XlsxDataPopulate.prototype.collectTemplates = function (wb) {
    var allTemplates = [],
        self = this;

    wb.sheets().forEach(function (sheet) { return sheet.usedRange().forEach(function (cell) {
        var template = self.parseTemplate(cell);
        if (template)
            allTemplates.push(template);
    }); });
    
    return allTemplates.sort(function (a, b) { return a.reference == b.cell.address() ? 1 : b.reference == a.cell.address() ? -1 : 0; });
};

/**
 * Copies the styles from `src` cell to the `dest`-ination one.
 * @param {Cell} src Source cell.
 * @param {Cell} dest Destination cell.
 * @returns {XlsxDataPopulate} For invocation chaining.
 */
XlsxDataPopulate.prototype.copyCellStyle = function (src, dest) {
    if (src == dest) return this;
    
    dest._styleId = src._styleId;
    if (src._style)
        dest._style = _.merge({}, src._style);
    
    return this;
};

/**
 * Resize the column and row of the destination cell, if not changed already.
 * @param {Cell} src The source (template) cell to take the size from.
 * @param {Cell} dest The destination cell which row and column to resize.
 * @returns {XlsxDataPopulate} For invocation chaining.
 */
XlsxDataPopulate.prototype.copyCellSize = function (src, dest) {
    var row = dest.rowNumber(),
        col = dest.columnNumber();

    if (this._rowSizes[row] === undefined)
        dest.row().height(this._rowSizes[row] = src.row().height());
    
    if (this._colSizes[col] === undefined)
        dest.column().width(this._colSizes[col] = src.column().width());

    return this;
};

/**
 * Applies the style part of the template onto a given cell.
 * @param {Cell} cell The destination cell to apply styling to.
 * @param {{}} data The data chunk for that cell.
 * @param {{}} template The template to be used for that cell.
 * @returns {XlsxDataPopulate} For invocation chaining.
 */
XlsxDataPopulate.prototype.applyDataStyle = function (cell, data, template) {
    var styles = template.styles,
        self = this;
    
    if (styles && data) {
        _.each(styles, function (pair) {
            if (_.startsWith(pair.name, ":")) {
                var handler = self._opts.callbacksMap[pair.name.substr(1)];
                if (typeof handler === 'function')
                    handler(data, cell, self._opts);
            } else {
                var val = self.extractValues(data, pair.extractor);
                if (val)
                    cell.style(pair.name, val);
            }
        });
    }

    return this;
};

/**
 * Extracts the value(s) from the provided data `root` to be set in the provided `cell`.
 * @param {{}} root The data root to be extracted values from.
 * @param {string} extractor The extraction string provided by the template. Usually a JSON path within the data `root`.
 * @returns {string|Array|Array.<Array.<*>>} The value to be used.
 * @description This method is used even when a whole - possibly rectangular - range is about to be set, so it can
 * return an array of arrays.
 */
XlsxDataPopulate.prototype.extractValues = function (root, extractor) {
    var { path, handler } = this.parseExtractor(extractor),
        self = this;

    if (!Array.isArray(root))
        root = _.get(root, path, root);
    else if (root.sizes !== undefined)
        root = !extractor ? root : _.map(root, function (entry) { return self.extractValues(entry, extractor); });
    else if (!handler)
        return root.join(this._opts.joinText || ",");

    return !handler ? root : handler(root, null, this._opts);            
};

/**
 * Extracts an array (possibly of arrays) with data for the given fill, based on the given
 * root object.
 * @param {{}} root The main reference object to apply iterators to.
 * @param {Array} iterators List of iterators - string JSON paths inside the root object.
 * @param {Number} idx The index in the iterators array to work on.
 * @returns {Array|Array.<Array>} An array (possibly of arrays) with extracted data.
 */
XlsxDataPopulate.prototype.extractData = function (root, iterators, idx) {
    var iter = iterators[idx],
        sizes = [],
        transposed = false,
        data = null,
        self = this;

    if (!iter || iter == '1') {
        transposed = true;
        iter = iterators[++idx];
    }

    if (!iter) return root;

    // A specific extractor can be specified after semilon - find and remember it.
    var parsedIter = this.parseExtractor(iter);

    data = _.get(root, parsedIter.path, root);
    
    if (typeof parsedIter.handler === 'function')
        data = parsedIter.handler.call(null, data, null, this._opts);

    if (idx < iterators.length - 1) {
        data = _.map(data, function (inRoot) { return self.extractData(inRoot, iterators, idx + 1); });
        sizes = data[0].sizes;
    } else if (!Array.isArray(data) && typeof data === 'object')
        data = _.values(data);

    sizes.unshift(transposed ? -data.length : data.length);
    data.sizes = sizes;
    return data;
};

/**
 * Put the data values into the proper cells, with correct extracted values.
 * 
 * @param {{}} cell The starting cell for the data to be put.
 * @param {Array} data The actual data to be put. The values will be _extracted_ from here first.
 * @param {{}} template The template that is being implemented with that data fill.
 * @returns {Array} Matrix size that this data has occupied on the sheet [rows, cols].
 */
XlsxDataPopulate.prototype.putValues = function (cell, data, template) {
    var entrySize = data.sizes,
        value = this.extractValues(data, template.extractor),
        self = this;

    // make sure, the 
    if (!entrySize || !entrySize.length) {
        cell.value(value);
        this.copyCellStyle(template.cell, cell)
            .copyCellSize(template.cell, cell)
            .applyDataStyle(cell, data, template);
        entrySize = template.cellSize;
    } else if (entrySize.length <= 2) {
        // Normalize the size and data.
        if (entrySize[0] < 0) {
            entrySize = [1, -entrySize[0]];
            value = [value];
        } else if (entrySize.length == 1) {
            entrySize = entrySize.concat([1]);
            value = _.chunk(value, 1);
        }

        this.getCellRange(cell, entrySize[0] - 1, entrySize[1] - 1)
            .value(value)
            .forEach(function (cell, ri, ci) {
                self.copyCellStyle(template.cell, cell)
                    .copyCellSize(template.cell, cell)
                    .applyDataStyle(cell, data[ri][ci], template);
            });
    } else {
        // TODO: Deal with more than 3 dimensions case.
    }

    return entrySize;
};

/**
 * Apply the given filter onto the sheet - extracting the proper data, following dependent fills, etc.
 * @param {{}} aFill The fill to be applied, as constructed in the @see populate methods.
 * @param {{}} root The data root to be used for data extraction.
 * @param {Cell} mainCell The starting cell for data placement procedure.
 * @returns {Array} The size of the data put in [row, col] format.
 */
XlsxDataPopulate.prototype.applyFill = function (aFill, root, mainCell) {
    var template = aFill.template,
        theData = this.extractData(root, template.iterators, 0);

    var entrySize = [1, 1];

    if (!aFill.dependents || !aFill.dependents.length)
        entrySize = this.putValues(mainCell, theData, template);
    else {
        var nextCell = mainCell;
        var copyStyler = _.bind(this.copyCellStyle, this, template.cell),
            sizeMaxxer = function (val, idx) { return entrySize[idx] = Math.max(entrySize[idx], val); };

        for (var d = 0; d < theData.length; ++d) {
            var inRoot = theData[d];

            for (var f = 0; f < aFill.dependents.length; ++f) {
                var inFill = aFill.dependents[f],
                    inCell = nextCell.relativeCell(inFill.offset[0], inFill.offset[1]),
                    innerSize = this.applyFill(inFill, inRoot, inCell);

                _.forEach(innerSize, sizeMaxxer);
                inFill.processed = true;
            }

            // Now we have the inner data put and the size calculated.
            _.forEach(this.putValues(nextCell, inRoot, template), sizeMaxxer);

            var rowOffset = entrySize[0],
                colOffset = entrySize[1];

            // Make sure we grow only on one dimension.
            if (theData.sizes[0] < 0) {
                rowOffset = 0;
                entrySize[1] = 1;
            } else {
                colOffset = 0;
                entrySize[0] = 1;
            }

            if (rowOffset > 1 || colOffset > 1) {
                this.getCellRange(nextCell, Math.max(rowOffset - 1, 0), Math.max(colOffset - 1, 0))
                    .merged(true)
                    .forEach(copyStyler);
            }

            // Finally, calculate the next cell.
            nextCell = nextCell.relativeCell(rowOffset + template.padding[0], colOffset + template.padding[1] || 0);	
        }

        // Now recalc combined entry size.
        _.forEach(this.cellDistance(mainCell, nextCell), sizeMaxxer);
    }

    return entrySize;
};

/**
 * The main entry point for whole data population mechanism.
 * @param {Workbook} wb The workbook to be scanned for templates and processed.
 * @param {{}} data The data to be applied.
 * @returns {XlsxDataPopulate} For invocation chaining.
 */
XlsxDataPopulate.prototype.processData = function (wb, data) {
    var dataFills = {},
        self = this;

    // Build the dependency connections between templates.
    this.collectTemplates(wb).forEach(function (template) {
        var aFill = {  
            template: template, 
            dependents: [],
            processed: false
        };

        if (template.reference) {
            var refFill = dataFills[template.reference];
            
            refFill.dependents.push(aFill);
            aFill.offset = self.cellDistance(refFill.template.cell, template.cell);
        }

        dataFills[template.cell.address()] = aFill;
    });

    // Apply each fill onto the sheet.
    _.each(dataFills, function (fill) {
        if (!fill.processed)
            self.applyFill(fill, data, fill.template.cell);
    });

    return this;
};

global.XlsxDataPopulate = XlsxDataPopulate;

if (typeof define === "function" && define.amd)
    define(XlsxDataPopulate);

})(_, XlsxPopulate, this);
