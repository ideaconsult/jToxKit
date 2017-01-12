(function(jT, a$, $) {
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
  	var idx = this.findItem(id);
	  return (i >= 0) ? this.items.splice(i, 1)[0] : false;
	};
	
	jT.ListWidgeting.prototype.enumerateItems = function (callback) {
		var els = $(this.target).children();
		for (var i = 0, l = this.items.length; i < l; ++i)
			callback.call(els[i], this.items[i]);
	};
	
})(jToxKit, asSys, jQuery);
