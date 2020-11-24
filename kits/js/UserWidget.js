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

	UserWidget.prototype.__expects = [ "onFound", "onSelect" ];
	UserWidget.defaults = {
		extraParam: "",
		baseUrl: "",
		permission: 'canRead'
	};
	
	UserWidget.prototype.init = function (manager) {
	    a$.pass(this, UserWidget, "init", manager);
	};

	UserWidget.prototype.callAmbit = function (data) {
		var self = this,
			uri = this.settings.baseUrl + '/myaccount/users';

		if (typeof data === 'string') {
			uri += '?' + data;
			data = null;
		}

		this.findBox.addClass('loading');
		jT.ambit.call(this, uri, data, function(result) {
			self.findBox.removeClass('loading');
			self.onFound(_.map(result || [], function (u) {
				return {
					value: u.id,
					label: u.name
				}
			}));
		});
	};

	UserWidget.prototype.doRequest = function (needle) { this.callAmbit('q=' + needle); };

	UserWidget.prototype.onSelect =
	UserWidget.prototype.onRemoved = 
	UserWidget.prototype.updateUsers = function () {
		var self = this,
			data = _.map(el.val(), function (u) { return self.settings.permission + '=' + u; });

		this.settings.extraParam && data.push(this.settings.extraParam);
		this.callAmbit({ method: 'POST', data: data.join('&') });
		return true;
	};

	jT.UserWidget = UserWidget;

})(_, asSys, jQuery, jToxKit);
