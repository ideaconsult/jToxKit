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
			// Handlers. All accept @see {Anno} as an argument.
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
			extractor: null,	// String | Function 
			presenter: null,	// String - HTML | Function
			exclusive: false	// Boolean - terminate matching
		}]
	};

	AnnotationKit.prototype.start = function () {
		this.annoTip.attach(this.selector);
	};

	AnnotationKit.prototype.onAction = function (action, anno) {
		if (action === 'edit') {			
			if (typeof this.controlsPrepack === 'function')
				anno = this.controlsPrepack(data, anno);

			anno.content = this.controlsPacker(anno);
			this.annoTip.update(anno);
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
			matchers = this.matchers;
			
		anno.reference = {};
		anno.controls = [];
		for (var i = 0;i < matchers.length; ++i) {
			var m = matchers[i],
				found = false;

			elChain.filter(m.selector).each(function (idx, el) {
				var v = null;

				// First, deal with value extraction...
				if (typeof m.extractor === 'function')
					v = m.extractor(data, anno, el);
				else if (typeof m.extractor === 'string' || Array.isArray(m.extractor))
					v = _.set({}, m.extractor, _.get(data, m.extractor));
				else if (m.extractor != null)
					v = m.extractor;
				
				// ... and merge it to the main data inside the anno object.
				if (v != null)
					anno.reference = $.extend(true, anno.reference, v);

				// The, proceed with ui building.
				if (typeof m.presenter === 'string')
					anno.controls.push(jT.ui.formatString(m.presenter, anno));
				else if (typeof m.presenter === 'function')
					anno.controls.push(m.presenter(data, anno, el));

				found = true;
			});

			if (found && m.exclusive) break;
		}

		return anno.controls.length > 0;
	};

	AnnotationKit.prototype.controlsPacker = function (anno) {
		anno.controls.push(
			jT.formatString(jT.ui.templates['anno-description'], this),
			jT.formatString(jT.ui.templates['anno-severity'], this)
		);

		return '<form><div>' + anno.controls.join('</div>\n<div>') + '</div></form>';
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

	AnnotationKit.prototype.dataExtractor = function (el) {
		var target = $(el).closest('table.dataTable>tbody>tr')[0],
			table = jT.tables.getTable(target);
		
		return {
			target: target,
			data: table.row(target).data()		
		};
	};

	AnnotationKit.prototype.dataInserter = function (el, data) { };

	jT.ui.Annotation = AnnotationKit;
})(asSys, jQuery, jToxKit);
