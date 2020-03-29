/** jToxKit - chem-informatics multi-tool-kit.
* The universal annotation capabilities.
*
* Author: Ivan (Jonan) Georgiev
* Copyright © 2017-2020, IDEAConsult Ltd. All rights reserved.
*/

(function(a$, $, jT) {
	function AnnotationWidget(settings) {
		a$.extend(true, this, AnnotationWidget.defaults, a$.common(settings, AnnotationWidget.defaults));
		var self = this;
		
		this.target = settings.target;

		this.annoTip = new AnnoTip({
			subject: this.subject,
			// Handlers. All accept @see {Anno} as an argument.
			onSelection: function (anno) { return self.analyzeAnno(anno); },
			onAction: function (action, anno) { return self.onAction(action, anno); },
			onClose: null
		});
	};

	AnnotationWidget.defaults = {
		subject: null,
		ajaxSettings: null,
		connector: null,
		matchers: [{
			selector: /.*/,		// RegEx
			extractor: null,	// String
			presenter: null
		}]
	};

	AnnotationWidget.prototype.start = function () {
		this.annoTip.attach(this.target);
	};

	AnnotationWidget.prototype.onAction = function (action, anno) {
		if (action === 'edit') {
			anno.content = anno.controls;
			this.annoTip.update(anno);
			return;
		}
		if (action === 'ok') {
			this.dataVerifier(anno);
			// TODO: Use this this.connector(this.ajaxSettings) to make a call.
		}
		this.annoTip.discard();
	};

	AnnotationWidget.prototype.analyzeAnno = function (anno) {
		var dataInfo = this.dataExtractor(anno.element),
			data = dataInfo.data,
			elChain = $(anno.element).parentsUntil(dataInfo.target).addBack().add(dataInfo.target),
			matchers = this.matchers,
			ui = $('div'),
			info = {};

		elChain.each(function (idx, el) {
			for (var i = 0;i < matchers.length; ++i) {
				var m = matchers[i],
					v = null;

				// First, deal with value extraction...
				if (!$(el).is(m.selector) || m.extractor === false)
					continue;
				else if (typeof m.extractor === 'function')
					v = m.extractor(data, el, anno.selection);
				else if (typeof m.extractor === 'string' || Array.isArray(m.extractor))
					v = _.set({}, m.extractor, _.get(data, m.extractor));
				
				// ... and merge it to the main info object.
				info = $.extend(true, info, v);

				// The, proceed with ui building.
				if (typeof m.presenter === 'string')
					ui.append(jT.ui.fillTemplate(m.presenter, info));
				else if (typeof m.presenter === 'function')
					m.presenter(ui, info, data);
			}
		});

		anno.data = info;
		anno.controls = ui[0].innerHTML;
	};

	AnnotationWidget.prototype.dataVerifier = function (anno) {
		anno.subject.url = document.location.href;
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
