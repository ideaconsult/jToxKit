/** jToxKit - chem-informatics multi-tool-kit.
* The universal annotation capabilities.
*
* Author: Ivan (Jonan) Georgiev
* Copyright © 2017-2020, IDEAConsult Ltd. All rights reserved.
*/

(function(a$, $, jT) {	
	function AnnotationWidget(settings) {
		a$.extend(true, this, AnnotationWidget.defaults, settings);
		var self = this;
		
		this.target = settings.target;
		
		this.annoTip = new AnnoTip({
			context: this.context,
			// Handlers. All accept @see {Anno} as an argument.
			onSelection: function (anno) { return self.analyzeAnno(anno); },
			onAction: function (action, anno) { return self.onAction(action, anno); },
			onClose: null
		});
	};

	AnnotationWidget.defaults = {
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

	AnnotationWidget.prototype.start = function () {
		this.annoTip.attach(this.target);
	};

	AnnotationWidget.prototype.onAction = function (action, anno) {
		if (action === 'edit') {			
			anno.content = this.controlsPacker(anno);
			this.annoTip.update(anno);
			this.beautify(anno.element);
			return;
		}
		if (action === 'ok') {
			var data = this.dataPacker(anno);

			if (typeof this.dataPostprocess === 'function')
				data = this.dataPostprocess(data, anno);

			if (data)
				$.ajax($.extend(true, this.ajaxSettings, { data:  data }));
		}
		this.annoTip.discard();
	};

	AnnotationWidget.prototype.analyzeAnno = function (anno) {
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

	AnnotationWidget.prototype.controlsPacker = function (anno) {
		anno.controls.push(
			'<textarea name="description" rows="3" cols="' + this.inputSize + '"></textarea>',
			'<div class="annotip-severity">' +
			'<div>Severity:</div>' +
			'<input type="radio" value="low" name="severity" id="annotip-severity-low" checked="checked"/>' +
			'<label for="annotip-severity-low">Low</label>' +
			'<input type="radio" value="medium" name="severity" id="annotip-severity-medium"/>' +
			'<label for="annotip-severity-medium">Medium</label>' +
			'<input type="radio" value="high" name="severity" id="annotip-severity-high"/>' +
			'<label for="annotip-severity-high">High</label>' +
			'</div>');

			return '<form><div>' + anno.controls.join('</div>\n<div>') + '</div></form>';
  	};

	AnnotationWidget.prototype.beautify = function (element) {
		$(".annotip-severity", element).buttonset();
		$("input, textarea, select", element).addClass("ui-widget ui-corner-all padded-control");
		$("input", element).attr('size', this.inputSize - 1);		
	};

	AnnotationWidget.prototype.dataPreprocess = function (data, anno) {
		$('form', anno.element).serializeArray().forEach(function (el) {
			_.set(data, el.name, el.value);
		});
		
		return data;
	};

	AnnotationWidget.prototype.dataPacker = function (anno) {
		return this.dataPreprocess({
			context: anno.context,
			reference: anno.reference,
			operation: anno.operation,
			suggestion: anno.suggestion
		}, anno);
	};

	AnnotationWidget.prototype.dataExtractor = function (el) {
		var target = $(el).parents('.annotip-data').first();
		return {
			target: target,
			data: target.data('annoTipData')
		};
	};

	AnnotationWidget.prototype.dataInserter = function (el, data) {
		$(el).addClass("annotip-data").data("annoTipData", data);
	};

	jT.AnnotationWidget = AnnotationWidget;
	
})(asSys, jQuery, jToxKit);
