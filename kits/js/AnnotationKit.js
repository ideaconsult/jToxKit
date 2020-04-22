/** jToxKit - chem-informatics multi-tool-kit.
* The universal annotation capabilities.
*
* Author: Ivan (Jonan) Georgiev
* Copyright © 2020, IDEAConsult Ltd. All rights reserved.
*/

(function(a$, $, jT) {	
	function AnnotationKit(settings) {
		a$.extend(true, this, AnnotationKit.defaults, settings);
		var self = this;
		
		this.selector = settings.selector;
		
		this.annoTip = new AnnoTip({
			context: this.context,
			// Handlers. All accept {@link Anno} as an argument.
			onSelection: function (anno) { return self.analyzeAnno(anno); },
			onAction: function (action, anno) { return self.onAction(action, anno); },
			onClose: null
		});

		if (!!settings.autoStart)
			this.start();
	};

	AnnotationKit.defaults = {
		context: null,
		ajaxSettings: null,
		connector: null,
		inputSize: 30,
		matchers: [{
			selector: "*",		// String - CSS selector
			processor: null,	// String | Function 
			exclusive: false	// Boolean - terminate matching
		}]
	};

	AnnotationKit.prototype.start = function () {
		this.annoTip.attach(this.selector);
	};

	AnnotationKit.prototype.onAction = function (action, anno) {
		if (action === 'edit') {			
			anno.content = jT.formatString(jT.ui.templates['anno-form'], this);
			this.annoTip.update(anno);
			
			if (typeof this.controlsSetup === 'function')
				anno = this.controlsSetup(data, anno);
				
			this.beautify(anno.element);
			$(anno.element).addClass('openned');
			return;
		}
		if (action === 'ok') {
			var data = this.dataPacker(anno);

			if (typeof this.dataPostprocess === 'function')
				data = this.dataPostprocess(data, anno);

			if (data)
				$.ajax($.extend(true, this.ajaxSettings, { data:  data }));
		}
		
		$(".annotip-severity", anno.element).buttonset('destroy');
		this.annoTip.discard();
	};

	AnnotationKit.prototype.analyzeAnno = function (anno) {
		var dataInfo = this.dataExtractor(anno.element),
			data = dataInfo.data,
			elChain = $(anno.element).parentsUntil(dataInfo.target).addBack().add(dataInfo.target),
			matchers = this.matchers,
			self = this;
			
		anno.reference = null;
		for (var i = 0;i < matchers.length; ++i) {
			var m = matchers[i],
				found = false;

			elChain.filter(m.selector).each(function (idx, el) {
				var v = null;

				// First, deal with value extraction...
				if (typeof m.processor === 'function')
					v = m.processor.call(self, data, anno, el);
				else if (typeof m.processor === 'string' || Array.isArray(m.processor))
					v = _.set({}, m.processor, _.get(data, m.processor));
				else if (m.processor != null)
					v = m.processor;
				
				// ... and merge it to the main data inside the anno object.
				if (v != null)
					anno.reference = $.extend(true, anno.reference || {}, v);

				found = true;
			});

			if (found && m.exclusive) break;
		}

		return anno.reference !== null;
	};

	AnnotationKit.prototype.beautify = function (element) {
		$(".annotip-severity", element).buttonset();
		$("input", element).attr('size', this.inputSize - 1);
		$("textarea", element).attr('cols', this.inputSize);
	};

	AnnotationKit.prototype.dataPreprocess = function (data, anno) {
		$('form', anno.element).serializeArray().forEach(function (el) {
			_.set(data, el.name, el.value);
		});
		
		return data;
	};

	AnnotationKit.prototype.dataPacker = function (anno) {
		return this.dataPreprocess({
			context: anno.context,
			reference: anno.reference,
			operation: anno.operation,
			suggestion: anno.suggestion
		}, anno);
	};

	/**
	 * Some predefined setups for data extraction and reference building.
	 */
	AnnotationKit.dataTableConfig = {
		pathHandlers: {},
		dataExtractor: function (el) {
			var target = $(el).closest('table.dataTable>tbody>tr')[0],
				table = jT.tables.getTable(target);
			
			return {
				target: target,
				data: table.row(target).data()		
			};
		},		
		controlsSetup: function (data, anno) {
			var self = this,
				scopes = _.map(_.reverse(anno.scopes), function (s) { 
					var title = (self.pathHandlers[s] && self.pathHandlers[s].title) || lookup[s] || s;
					return { value: s, title: title };
				});
			
			scopes.push({ title: 'Service', value: 'service' });
			$(".annotip-scope select", anno.element).html(_.map(scopes, function (s) { return jT.formatString(jT.ui.templates['anno-select-option'], s); }));
			return anno;
		},
		dataPostprocess: function (data) {
			data.suggestion = _.set({}, data.scope, data.suggestion);
			alert(JSON.stringify(data, null, 2));
			return null;
		},
		matchers: [{ // General info - uuid
			selector: "tr[role=row]",
			processor: function (data, anno) {
				(anno.scopes = (anno.scopes || [])).push('substance');
				return { uuid: data.uuid };
			}
		}, { // General info - assay_uuid
			selector: "tr[role=row]",
			processor: "assay_uuid"
		}, { // Major column info - it can be any of the
			selector: 'tr[role=row]>td',
			processor: function (data, anno, el) {
				var table = jT.tables.getTable(el),
					col = table.column(el).dataSrc(),
					obj = {};
	
				if (!Array.isArray(data[col])) {
					obj[col] = data[col];
					(anno.scopes = (anno.scopes || [])).push(col);
				} else // We'll fill that down there
					obj = null;
	
				return obj;
			}
		}, { // Minor column info - it can be any of the
			selector: 'td.jtox-multi table td',
			processor: function (data, anno, el) {
				var table = jT.tables.getTable(el),
					colIdx = $(el).parents('td').index(),
					col = table.settings()[0].aoColumns[colIdx],
					minorRow$ = idx = $(el).parent('tr'),
					idx = minorRow$.index(),
					tabInfo = minorRow$.closest('table').data('anno'),
					data = data[col.data][idx],
					idFields = this.pathHandlers[col.data] && this.pathHandlers[col.data].idFields,
					obj = {}, res = {};
	
				if (!tabInfo)
					tabInfo = [''];
				else
					tabInfo = tabInfo.split(/\s+/);
				if (!!idFields)
					idFields = _.difference(idFields, tabInfo); // We leave only pure id fields.
	
				anno.scopes.push(col.data);
				_.each(tabInfo.concat(idFields), function (path) {
					if (path != '') {
						// We only add to scope non-pure id fields.
						if (_.indexOf(idFields, path) == -1)
							anno.scopes.push(col.data + '.' + path);
						path = path.split('.');
						_.set(obj, path, _.get(data, path, null));
					} else
						obj = $.extend(obj, data);
				});
				
				res[col.data] = [obj];
				return res;
			}
		}]		
	};

	jT.ui.Annotation = AnnotationKit;
})(asSys, jQuery, jToxKit);
