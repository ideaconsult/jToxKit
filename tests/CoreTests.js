var jT = require("../"),
    a$ = require("asSys"),
		_ = require("underscore"),
		customMatchers = {
			toDeepEqual: function (util, customEqualityTesters) {
				return {
					compare: function(actual, expected) {
							return { pass: _.isEqual(actual, expected) };
					}
				}
			}
		};


describe("jToxKit Core", function () {
	// prepare the test for dual runs - browser & npm
	beforeEach(function () {
		var jself = typeof this.addMatchers === 'function' ? this : jasmine;
		jself.addMatchers(customMatchers);
	});
	
	// The actual tests start here.
});
