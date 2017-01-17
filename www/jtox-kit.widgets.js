/** jToxKit - chem-informatics multi-tool-kit.
  * Base for widgets and UI-related stuff
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */


(function (jT, a$, $) {
  // Define more tools here
  jT.ui = a$.extend(jT.ui, {
    /** Gets a template with given selector and replaces the designated
      * {{placeholders}} from the provided `info`.
      */
  	fillTemplate: function(selector, info) {
  		return $(jT.ui.formatString($(selector).html(), info).replace(/(<img(\s+.*)?)(\s+jt-src=")/, "$1 src=\"")).removeAttr("id");
  	},
  	
    updateCounter: function (str, count, total) {
      var re = null;
      var add = '';
      if (count == null)
        count = 0;
      if (total == null) {
        re = /\(([\d\?]+)\)$/;
        add = '' + count;
      }
      else {
        re = /\(([\d\?]+\/[\d\?\+-]+)\)$/;
        add = '' + count + '/' + total;
      }
  
      // now the addition
      if (!str.match(re))
        str += ' (' + add + ')';
      else
        str = str.replace(re, "(" + add + ")");
  
      return str;
    }
    
  });

  // Now import all the actual skills ...
  // ATTENTION: Kepp them in the beginning of the line - this is how smash expects them.
  
/** jToxKit - chem-informatics multi-tool-kit.
  * A generic widget for list management
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */

jT.ListWidgeting = function (props) {
	this.target = props && props.target;
	this.itemId = props && props.itemId || "id";
	this.renderItem = props && props.renderItem || this.renderItem;
	this.clearItems();
};

jT.ListWidgeting.prototype.populate = function (docs, callback) {
	this.items = docs;
	
	$(this.target).empty();
	for (var i = 0, l = docs.length; i < l; i++)
		$(this.target).append(this.renderItem(typeof callback === "function" ? callback(docs[i]) : docs[i]));
};

jT.ListWidgeting.prototype.addItem = function (doc) {
	this.items.push(doc);
	return this.renderItem(doc);
};

jT.ListWidgeting.prototype.clearItems = function () {
	$(this.target).empty();
	this.items = [];
};

jT.ListWidgeting.prototype.findItem = function (id) {
	var self = this;
	return a$.findIndex(this.items, typeof id !== "string" ? id : function (d) { return doc[self.itemId] === id; });
};

jT.ListWidgeting.prototype.eraseItem = function (id) {
	var i = this.findItem(id);
  return (i >= 0) ? this.items.splice(i, 1)[0] : false;
};

jT.ListWidgeting.prototype.enumerateItems = function (callback) {
	var els = $(this.target).children();
	for (var i = 0, l = this.items.length; i < l; ++i)
		callback.call(els[i], this.items[i]);
};

})(jToxKit, asSys, jQuery);
