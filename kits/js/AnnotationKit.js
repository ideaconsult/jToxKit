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

		// TODO: Load annos from the server and call this:
		// this.annoTip.applyAnnos(rootElement, annoList, function (anno) { self.applyAnno(anno); });
	};

	AnnotationKit.prototype.onAction = function (action, anno) {
		if (action === 'edit') {			
			anno.content = jT.formatString(jT.ui.templates['anno-form'], this);
			this.annoTip.update(anno);
			
			if (typeof this.controlsSetup === 'function')
				anno = this.controlsSetup(data, anno);

			// Nothing meaningful, but it's nicer this way...
			return this.beautify();
		}
		if (action === 'ok') {
			var data = this.dataPacker(anno);
			
			data.suggestion = _.set({}, data.scope, data.suggestion);

			if (typeof this.dataPostprocess === 'function')
				data = this.dataPostprocess(data, anno);

			if (data)
				$.ajax($.extend(true, this.ajaxSettings, { data:  data }));

			// TODO: Potentially make this to be the success handler of the above!
			this.applyAnno(anno);
		}
		
		$(".annotip-severity", this.annoTip.getFrame()).buttonset('destroy');
		this.annoTip.discard();
	};

	AnnotationKit.prototype.analyzeAnno = function (anno) {
		var dataInfo = this.dataExtractor(anno),
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

	AnnotationKit.prototype.applyAnno = function (anno) {
		// TODO: Make this real!
		$(anno.element).css({ "background-color": "yellow" });
	};

	AnnotationKit.prototype.beautify = function () {
		var annoFrame = this.annoTip.getFrame();

		$(".annotip-severity", annoFrame).buttonset();
		$("input", annoFrame).attr('size', this.inputSize - 1);
		$("textarea", annoFrame).attr('cols', this.inputSize);

		$(annoFrame).addClass('openned');
	};

	AnnotationKit.prototype.dataPreprocess = function (data, anno) {
		$('form', this.annoTip.getFrame()).serializeArray().forEach(function (el) {
			_.set(data, el.name, el.value);
		});
		
		return data;
	};

	AnnotationKit.prototype.dataPacker = function (anno) {
		return this.dataPreprocess({
			context: anno.context,
			reference: anno.reference,
			operation: anno.operation,
			suggestion: anno.suggestion,
			selected: anno.selection,
			reverseSelector: anno.reverseSelector
		}, anno);
	};

	AnnotationKit.prototype.controlsSetup = function (data, anno) {
		var self = this,
			annoFrame = this.annoTip.getFrame(),
			scopes = _.map(anno.scopes, function (s) { 
				var title = (self.pathHandlers[s] && self.pathHandlers[s].title) || lookup[s] || s;
				return { value: s, title: title };
			});
		
		$(".annotip-scope select", annoFrame)
			.html(_.map(scopes, function (s) { return jT.formatString(jT.ui.templates['anno-select-option'], s); }))
			.on('change', function (e) {
				var newScope = $(this).val(),
					pathHnd = self.pathHandlers[newScope],
					newControl = pathHnd && pathHnd.control,
					target$ = $('.annotip-suggestion', annoFrame).empty();

				if (typeof newControl === 'string')
					target$.append(jT.formatString(newControl, { name: newScope, value: pathHnd.title}));
				else if (typeof newControl === 'function')
					newControl.call(self, target$, data, anno);
				else
					return;

				// nicify what was just added!
				target$.children('input, select, textarea').addClass('ui-widget ui-corner-all padded-control');
			});
		return anno;
	};

	
	AnnotationKit.prototype.buildScopes = function (rootPath, pathList, data, anno) {
		var idFields = this.pathHandlers[rootPath] && this.pathHandlers[rootPath].idFields,
			obj = {};

		pathList = !pathList ? [''] : pathList.split(/\s+/);
		if (!!idFields)
			idFields = _.difference(idFields, pathList); // We leave only pure id fields.

		anno.scopes.push(rootPath);
		_.each(pathList.concat(idFields), function (path) {
			if (path != '') {
				// We only add to scope non-pure id fields.
				if (_.indexOf(idFields, path) == -1)
					anno.scopes.push(rootPath + '.' + path);

				path = path.split('.');
				_.set(obj, path, _.get(data, path, null));
			} else
				obj = $.extend(obj, data);
		});

		return obj;
	};

	jT.ui.Annotation = AnnotationKit;
})(asSys, jQuery, jToxKit);
