asSys = require("as-sys");
Solr = require("solr-jsx");
_ = require("underscore");
jT = require("../");
customMatchers = {
	toDeepEqual: function (util, customEqualityTesters) {
		return {
			compare: function(actual, expected) {
					return { pass: _.isEqual(actual, expected) };
			}
		}
	}
};

a$ = asSys;

describe("jToxKit Core", function () {
	// prepare the test for dual runs - browser & npm
	beforeEach(function () {
		var jself = typeof this.addMatchers === 'function' ? this : jasmine;
		jself.addMatchers(customMatchers);
	});
	
	// The actual tests start here.
	describe("Consumption", function () {
	  var EmptyTranslator = function (obj) { a$.extend(this, obj); };
    EmptyTranslator.prototype.translateData = function (response, scope) { 
      this.scope = scope; 
      return this.data = response; 
    };
    
  	var Consumable = a$(Solr.Management, jT.Consumption, EmptyTranslator);
  	    topic = new Consumable({ prop: "test" });
  	    
    var EmptyConsumer = function (obj) { 
      a$.extend(this, obj); 
      this.notified = false; 
    };
    EmptyConsumer.prototype.afterTranslation = function(data, scope) { 
      this.notified = true;
      expect(data).toBeDefined(); 
      expect(scope).toBe("scope");
    };
    var consumer = new EmptyConsumer();
  	    
  	it("Can be instantiated with SolrJsX Manager", function () {
    	expect(topic).toBeDefined();
    	expect(topic.prop).toBe("test");
  	});
  	
  	it("Can add consumers", function () {
    	topic.addConsumers(consumer, "a");
    	expect(a$.weight(topic.consumers)).toBe(1);
  	});

    it("Consumers get notified", function () {
      topic.addConsumers(consumer, "a");
      topic.parseResponse({ prop: "test" }, "scope");
      expect(consumer.notified).toBeTruthy();
    });
    
    it("Consumer can be removed", function () {
      topic.addConsumers(consumer, "a");
      topic.removeConsumer("a");
      expect(a$.weight(topic.consumers)).toBe(0);
    })

    it("Many consumers can be removed", function () {
      topic.addConsumers(consumer, "a");
      topic.addConsumers(new EmptyConsumer(), "b");
      topic.removeManyConsumers(function (c, i) { return i == "a"; });
      expect(a$.weight(topic.consumers)).toBe(1);
      expect(topic.getConsumer("b")).toBeDefined();
    })
    
    it("Can enumerate consumers", function () {
      topic.addConsumers(consumer, "a");
      topic.addConsumers(new EmptyConsumer(), "b");
      var ctx = { count: 0 };
      topic.enumerateConsumers(function (c, i, context) { ++context.count; }, ctx);
      expect(ctx.count).toBe(2);
    });    
	}); // End of consumtion test bundle
	

});

