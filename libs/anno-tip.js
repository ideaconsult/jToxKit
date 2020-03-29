var AnnoTip = (function ($, tippy) {
	'use strict';

	$ = $ && Object.prototype.hasOwnProperty.call($, 'default') ? $['default'] : $;
	tippy = tippy && Object.prototype.hasOwnProperty.call(tippy, 'default') ? tippy['default'] : tippy;

	var NS_SEL = "annotip-text";

	function isMultiElement(range1, range2) {
	  return $.unique([range1.startContainer, range1.endContainer, range2.startContainer, range2.endContainer]).length > 0;
	}

	function normalizeRange(range) {
	  var startNode = range.startContainer,
	      endNode = range.endContainer;

	  if (startNode == endNode) {
	    if (range.startOffset > range.endOffset) {
	      var _t = range.startOffset;
	      range.setStartOffset(range.endOffset);
	      range.setEndOffset(_t);
	    }
	  }

	  return range;
	}

	function mergeRanges(ranges) {
	  if (ranges.length == 0) return null;
	  if (ranges.length == 1) return ranges[0]; // TODO: Make sure the ranges are properly ordered.

	  var lastR = ranges[ranges.length - 1],
	      unitedR = document.createRange();
	  unitedR.setStart(ranges[0].startContainer, ranges[0].startOffset);
	  unitedR.setEnd(lastR.endContainer, lastR.endOffset);
	  return unitedR;
	}
	/**
	 * A wrapper of relevant selection data, to be passed to @see {AnnoTip}.
	 * @param {String} content The plain text version of the selected content
	 * @param {Event} event The event that triggered the selection (mouseup)
	 * @param {Array<Range>} ranges The array of ranges, that this selection occupies
	 */


	function TextSelection(content, event, ranges) {
	  this.content = content;
	  this.event = event;
	  this.range = mergeRanges(ranges);
	}

	TextSelection.prototype.getElement = function () {
	  var parentEl = this.range.commonAncestorContainer;
	  return parentEl instanceof Element ? parentEl : parentEl.parentElement;
	};

	TextSelection.prototype.getBoundingRect = function () {
	  return this.range.getBoundingClientRect();
	};
	/**
	 * Initializes a text selection monitoring mechanis.about-content
	 * 
	 * @param {Element} element The parent DOM element to attach the whole text selection monitoring mechanism to.
	 * @param {Object} settings Settings for monitoring. Check @see TextSelection.defaults.
	 */


	function TextMonitor(element, settings) {
	  var _this = this;

	  this.element = element;
	  this.settings = $.extend(true, {}, TextMonitor.defaults, settings);

	  if (this.element.ownerDocument) {
	    this.document = this.element.ownerDocument;
	    $(this.document.body).on('mouseup.' + NS_SEL, function (e) {
	      return _this._handleSelection(e);
	    });
	  } else {
	    throw new Error("Non-attached element used for text selection: ".concat(element));
	  }
	}
	/**
	 * Detach the text selection monitoring mechanism.
	 */


	TextMonitor.prototype.detach = function () {
	  if (this.document) $(this.document.body).off('.' + NS_SEL);
	};
	/**
	 * Handles the mouse-up event, supposedly after a selection is made.
	 * @param event The actual mouse-up event.
	 */


	TextMonitor.prototype._handleSelection = function (event) {
	  var selection = this.document.getSelection(); // TODO: Check with defaultView

	  if (selection.isCollapsed) return;
	  var myRanges = [];

	  for (var i = 0; i < selection.rangeCount; ++i) {
	    var r = selection.getRangeAt(i);
	    if (!$.contains(this.element, r.commonAncestorContainer)) continue;else if (this.multipleNodes || myRanges.length == 0 || !isMultiElement(myRanges[0], r)) myRanges.push(normalizeRange(r));
	  }

	  if (myRanges.length > 0) this.settings.onSelection(new TextSelection(selection.toString(), event, myRanges));
	};
	/**
	 * Default options.
	 */


	TextMonitor.defaults = {
	  // Whether selections over more than one element are allowed.
	  multipleNodes: false,
	  // function (content, event, ranges)
	  onSelection: null
	};

	const img = "data:image/png;base64,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";

	const img$1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAKqNIzIAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAHdElNRQfkAx0LJBatu72wAAAEi0lEQVRo3rWZT2xURRjAf90DatqtdGlLROqfsq6NqxcJxpi0tHqRswpBQguIhpsktOEo4BHowoUGLlqtFKKeudFW/iVqoi3dSlcxBvRgKy3FGgqkux62O+97s+/Pzntvv3eame+b3/dm3jffvJkaTGUt7aRpI0UDq6kDFrnLPNNMk+U7Zox7rFheI8MkeQoeT57r9LMpanQ9ffziCdafKfqojwa+hiPMG8FLzxyHSYSD19DNTCC45cTHxLwR7pJikNfLavNMMMYUOW4xz39ALQ08Q4o0m3nFAXeNHn41f/vt3NPeZpmL9LDG06qR3YywrFkusM0MHuOk1sV9TvF8xfatDLCk9ZDxngopqzinhdbnPGU8guv4QgvZYVZVhr9gM7tBuzG8JB3kbH1d8Hchpr391zwZGA8Q5yttFHwm4qRt6PeHgpfkgG0q+r1UtwvFh+yIBA+wk4ei561uakkWxNvvigwP8L4IzX950UklxjXh5f5I8QAHRO9XnBbAD4XCucjxAF8Kwh69McE/IvDqquJAXATlLA32xk/F7HdWBQ/QLuLhkGyoZ041fFY1PMCQ4tyVK0yfWPPNF10TWS9yRK9Vbe12TlUVD3Ba7JpWZJNIuK2RQJ7lG6bI8IRD2wbxHWwsVmVUxcVI8C/w10p/xx3bRxXvWLHiuqrYFSm+wISjxh7VPg6wVg3Jss9uxxRfYNhRp0kR8zTBu0r9p4jxt2lx0RtXOu/ESKvqsdD4Udap0p90cttF0yKlY7SpQjYkfsSG7+Kmq64KQFLwoxqOzaHw9sHf4KndpTR/gD9U4TkPE+/0ZIaHVqX7OyILusXA01ylwC3eiggPjSIr8kAV3HaswyvtS2yJBA+PKf2lShywFqr7ZS4EwWsO+E/BCYGwuxAMr02B/0dYyyVHF4LitY/QCsNOV4M6zYW3Q+HhTWX3PZxVhY88THQX9oXAwz5lORRjWlWnPUwW2cJlVXqcAW3RvYmJWKScTEY/+5jZRyHo2wNMWMkImkVybPQxrGWkDJ80xjfb07GM892+xnYXguBhrz7m/UZbMmsiggw+wJjiHS1WmG5KaznBJOddtxvekhSb0ldLlZOqaiBQpyZyRrHE/sP6MVkS4VUNaRG5R/yYyF+zwao6YC17d4jLhiOqIU9X1fAdYv4/sTclmFVNuaiOmTWp5zfFmNF/z2V0FjhfFQfkeZnDihPjqlDoNe/fRw6K3i87n1HbD6n8V0UT2SFm/57zIRXANuHlI7ojw/fwSPT8npdqRijmI5qIg7aDyuPeyjUM2rLdt6wOBY+rPXXpd9X3zFw/rM6FOLTqEoFXoKLD6qILdq/zDLHeGN6iHVMXOFsZHiAmUnTxecBpg+Sb5IxY80tzX/GFRVG2iqAsjcQoH9DsadXMXsbK7hYX3L98r0urJIO8UVZbYJLRlUurORaBuLi0etmhxyv0GG5ahXvd/O2wEa38ueN3becvCQ6LZG0GP1SecoJJnF6yRvAsvfZ8H4Vs5BjjvpfX4xy19nqVzLKpNNHBS7SRIiGu7+fIcYMsl5g16+5/p48O95XxGNoAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjAtMDMtMjlUMTE6MzY6MjIrMDA6MDCnUkajAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIwLTAzLTI5VDExOjM2OjIyKzAwOjAw1g/+HwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAASUVORK5CYII=";

	const img$2 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAKqNIzIAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAHdElNRQfkAx0LIiujiVYnAAADcElEQVRo3u2ZW0gUURjHf5p28UJmare3QIqeosJ8UCKJyCKopacshXoLr4UECtFbF4rS6PZgRRiUJBSWdqFCIbCrUG/61IOURSqZ1za3B3ePc3bPzM7MmS0hv3nY3W++c37/c+abb8+cgUjL5Qxd9BHQOobppoki5uPIVtGqCQ4/PrHXPr6QQY/xU8dFEuzg8xiLCT5AgIbo+Ey+xQwfIEBxNAF1huBuilniLHkiLIk8mgx99pJkFZ7KqAh9QYomfNpKDRIOWgXuEWEDZHiGB2gUPbdYhZ0UYfWe4mG96Pmz6nR88HO58LzxWEAX/uC3LNXNGBKQLDzDHguYFD3GGygRAv6ZzQqY0QISqGfARdGdoINsLwQcoow0F4NKJJ9GLwTkuJ5X2GDvD9hawCsNAW9F+dEQcJl6Bl3Af9HOPqeNmkUK+TTGrbbpVdZCZzPwV2xWwIwW4FUlHAl+/mbcHKa6C8o11sDGGtIQ9D1Wj9LcdCthqBRVMsImuqh2KuAVRa4FGCvhEGXmgf9FJbS0GX0bzgrwyhZRSyf9jNDDVdapg1RJaKcSjvGQZZb43WF9THKFufYE2K2EzRb4UiYVLVqZY+cS2K2EG03PlFFPnMJfSI0dAXbXhJ0m/nLqlHiAatJlhzoH6qLmwCgtLDXBGyf/HtmkUYHfbMvG60pYIeEn2RL0XxK+C9EvgQ7+nDT5cdynADBersWxE1AZhgdIooUCIFd4vssB3l2CSilHjDk0zPHY50CVhL9BOq+VyfvDzl2gi79OPJCmlFAb3tQLAYcVeJQS2qYroXcCZPw1Kb2LpXPPVXumugKqLPA7pE3wDvU+rJ6AIxK+QcLvYjza6HUFFEhVLxw/YTj3zHzDWkfALVO8PPntVpvg7gUk0K+P1xGwWbQcYp7B75Mm3xQfejL6KTxO3xXsFN/aDA+fPm6TKH51sD3aHvQJodXpdn23aLnfdPTJ0bsxvrDIdIBfI9r5yQDiWMsxCf+UBXY6SpFe2aTaFnBUtPpAETf5ElZ0beIBzhua9VASZbEdspcWy7UAT+zjIYOvlp0F8NMVtlLOMvy/a+IB8qWiqT56pR2FEovIu07xANtsvLpdaYg/pTg/wiOqWO0cPmXZPHAwAz7p3EfOstXNuMMth9O8j8jnAH7eRTwt1dBHH3c4wAp3sD8lBNHe+b1Z/AAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMC0wMy0yOVQxMTozNDo0MyswMDowMMO/lK0AAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjAtMDMtMjlUMTE6MzQ6NDMrMDA6MDCy4iwRAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAABJRU5ErkJggg==";

	var NS_ANNO = 'annotip-main';
	var DEF_CONTENT = "<textarea placeholder=\"Enter your comment...\"></textarea>";
	var DEF_ACTIONS = [{
	  action: "cancel",
	  image: img
	}, {
	  action: "edit",
	  image: img$2
	}];
	var EXPANDED_ACTIONS = [{
	  action: "cancel",
	  image: img
	}, {
	  action: "ok",
	  image: img$1
	}];

	function prepareFrame(info) {
	  return "\n\t\t<div class=\"annotip-frame\">\n\t\t\t<div class=\"annotip-dlg\">".concat(info.content, "</div>\n\t\t\t<div class=\"annotip-actions\" style=\"text-align: right;\">").concat(info.actions, "</div>\n\t\t</div>");
	}

	function prepareButton(info) {
	  // return `<button data-annotip-action="${info.action}"><img src="${info.image}"/></button>`;
	  return "<button data-annotip-action=\"".concat(info.action, "\">").concat(info.action, "</button>");
	}
	/**
	 * Initialize the annotation engine
	 * @param {Object} settings Custom settings for the annotation engine.
	 * @returns {AnnoTip} The instance just created.
	 */


	function AnnoTip(settings) {
	  this.settings = $.extend(true, {}, AnnoTip.defaults, settings); // Normalize the settings

	  if (typeof this.settings.textSelection === 'string') this.settings.textSelection = this.settings.textSelection.toLowerCase();
	  if (this.settings.actionsHtml === null) this.settings.actionsHtml = $.map(DEF_ACTIONS, function (a) {
	    return prepareButton(a);
	  }).join('');
	  tippy.setDefaultProps(this.settings.tippySettings);
	  this.monitors = [];
	  this.tp = null;
	}
	/**
	 * Attach handlers on the selected elements, both with text and element monitoring
	 * 
	 * @param {String} selector The jQuery selector to use for listing all elements to monitor.
	 * @returns {AnnoTip} A self instance for chaining invocations.
	 * @description This method can be invoked many times, with difference selectors.
	 */


	AnnoTip.prototype.attach = function (selector) {
	  var _this = this;

	  $(selector).each(function (i, el) {
	    if (!el.ownerDocument) throw new Error("Non-attached element used for anno-tip: ".concat(el));

	    if (_this.settings.textSelection && _this.settings.textSelection !== 'none') {
	      _this.monitors.push(new TextMonitor(el, {
	        multipleNodes: _this.settings.textSelection === 'multi',
	        onSelection: function onSelection(content, event, range) {
	          return _this._handleSelection(content, event, range);
	        }
	      }));
	    }
	  });
	  return this;
	};
	/**
	 * Apply the list of annotatons to the page, so that they can be edited later.
	 * 
	 * @param {Array<Object>} annos List of annotations in the same format, as they were created.
	 * @returns {AnnoTip} A self instance for chaining invocations.
	 */


	AnnoTip.prototype.applyAnnos = function (annos) {
	  annos.test = ""; // TODO: Make sure there is something meaningful to be done here!

	  return this;
	};
	/**
	 * Close the annotation box, if it is openned at all.
	 * @returns {AnnoTip} A self instance for chaining invocations.
	 */


	AnnoTip.prototype.discard = function () {
	  if (this.tp != null) this.tp.destroy();
	  this.tp = null;
	  return this;
	};
	/**
	 * Update the content and actions lines of the annotation box,
	 * based on the newly provided object.
	 * 
	 * @param {Object} anno The annotation object to be used for content resetting
	 * @returns {AnnoTip} A self instance for chaining invocations.
	 */


	AnnoTip.prototype.update = function (anno) {
	  this.tp.setContent(prepareFrame({
	    actions: anno.actionsHtml || $.map(EXPANDED_ACTIONS, function (a) {
	      return prepareButton(a);
	    }).join(''),
	    content: anno.content || DEF_CONTENT
	  }));
	  return this;
	};
	/**
	 * Detach the AnnoTip from the page.
	 * @returns {AnnoTip} A self instance for chaining invocations.
	*/


	AnnoTip.prototype.detach = function () {
	  // Destroy the Tippy instance, if such exists.
	  if (this.tp != null) this.tp.destroy(); // Detach all monitors

	  $.each(this.monitors, function (i, s) {
	    return s.detach();
	  });
	  this.monitors = [];
	  return this;
	};
	/**
	 * Private methods
	 */


	AnnoTip.prototype._getTippyBox = function () {
	  return $("[class=tippy-box]");
	};

	AnnoTip.prototype._handleSelection = function (selection) {
	  var _this2 = this;

	  var anno = {
	    subject: this.settings.subject,
	    selection: selection.content,
	    range: selection.range,
	    event: selection.event
	  };
	  if (this.tp != null || this._call('onSelection', anno) === false) return; // Cleanup the previous instance, if such was created.

	  if (this.tp != null) this.tp.destroy(); // Go, and create a new one.

	  this.tp = new tippy(selection.getElement(), {
	    content: prepareFrame({
	      actions: anno.actionsHtml || this.settings.actionsHtml,
	      content: anno.content || ''
	    }),
	    appendTo: document.body,
	    onShown: function onShown() {
	      var tpBox$ = _this2._getTippyBox();

	      anno.element = tpBox$[0];
	      tpBox$.on('click.' + NS_ANNO, 'div.annotip-actions button', function (e) {
	        _this2._call('onAction', $(e.currentTarget).data('annotipAction'), anno, e);
	      });
	    },
	    onClickOutside: function onClickOutside(tp) {
	      return tp.destroy();
	    },
	    onHide: function onHide() {
	      return _this2._call('onClose', anno) !== false;
	    },
	    onDestroy: function onDestroy() {
	      _this2.tp = null;
	    },
	    getReferenceClientRect: function getReferenceClientRect() {
	      return selection.getBoundingRect();
	    }
	  });
	};

	AnnoTip.prototype._call = function (hnd) {
	  if (typeof hnd === 'string') hnd = this.settings[hnd];

	  for (var _len = arguments.length, moreArgs = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
	    moreArgs[_key - 1] = arguments[_key];
	  }

	  return typeof hnd === 'function' ? hnd.apply(this, moreArgs) : undefined;
	};

	AnnoTip.defaults = {
	  subject: null,
	  textSelection: true,
	  elementSelection: true,
	  actionsHtml: null,
	  tippySettings: {
	    placement: 'auto',
	    hideOnClick: false,
	    trigger: 'manual',
	    allowHTML: true,
	    interactive: true,
	    showOnCreate: true
	  },
	  // Handlers. All accept @see {Anno} as an argument.
	  onSelection: null,
	  onAction: null,
	  onClose: null
	};

	return AnnoTip;

}($, tippy));
//# sourceMappingURL=anno-tip.js.map
