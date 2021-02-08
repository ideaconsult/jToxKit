/* UserWidget - user management widget
 *
 * Copyright 2020, IDEAconsult Ltd. http://www.ideaconsult.net/
 * Created by Ivan Georgiev
**/

(function (_, a$, $, jT) {
	function UserWidget(settings) {
		this.settings = $.extend(true, {}, UserWidget.defaults, settings);
		// We rely on that fact that we're bound with jT.AutocompleteWidget, so
		// `findBox` and `target` are here!
	}

	UserWidget.prototype.__expects = [ "resetValue", "onFound" ];
	UserWidget.defaults = {
		baseUrl: "",
		permission: 'canRead',
		baseKit: null
	};
	
	UserWidget.prototype.init = function (manager) {
	    a$.pass(this, UserWidget, "init", manager);
	};

	UserWidget.prototype.callAmbit = function (data) {
		var self = this,
			uri = this.settings.baseUrl + 'myaccount/users';

		if (typeof data === 'string') {
			uri += '?' + data;
			data = null;
		}

		this.findBox.addClass('loading');
		jT.ambit.call(this.settings.baseKit || this, uri, data, function(result) {
			self.findBox.removeClass('loading');
			self.fillData(result);
		});
	};

	UserWidget.prototype.doRequest = function (needle) { this.callAmbit('q=' + needle); };

	UserWidget.prototype.loadUsers = function (params) { this.callAmbit(params); };

	UserWidget.prototype.fillData = function (result) {
		var items = _.map(result || [], function (u) {
			return {
				value: u.id,
				label: u.name
			};
		});

		return this.reportCallback ? this.onFound(items) : this.resetValue(items);
	};

	UserWidget.prototype.onChange = function () {
		return this.settings.onChange && this.settings.onChange.apply(this, arguments);
	}

	jT.UserWidget = UserWidget;

})(_, asSys, jQuery, jToxKit);
