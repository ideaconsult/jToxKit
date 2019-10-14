asSys = require("as-sys");
_ = require("lodash");

jT = require("..");

a$ = asSys;

function EmptyTranslator(obj) {
	_.extend(this, obj);
};

EmptyTranslator.prototype.parseResponse = function (response, scope) {
	this.scope = scope;
	return this.data = a$.pass(this, EmptyTranslator, response);
};
EmptyTranslator.prototype.prepareQuery = (servlet) => {
	return {
		url: servlet
	};
}

describe("jToxKit communication", function () {

	// The actual tests start here.
	describe("request/response notification", function () {

		var topic = new(a$(jT.Communicating, EmptyTranslator))({
				prop: "test",
				connector: function (opts) {
					opts.success(opts.url);
				}
			}),
			EmptyConsumer = function (obj) {
				_.extend(this, obj);
				this.notified = false;
			};

		EmptyConsumer.prototype.afterResponse = function (data) {
			this.notified = true;
			expect(data).toBeDefined();
			expect(data).toBe("test-servlet");
		};
		var consumer = new EmptyConsumer({
			id: "a"
		});

		it("Can be instantiated with a Manager", function () {
			expect(topic).toBeDefined();
			expect(topic.prop).toBe("test");
		});

		it("Consumers get notified", function () {
			topic.addListeners(consumer);
			topic.doRequest("test-servlet");
			topic.parseResponse({
				prop: "test"
			}, "scope");
			expect(consumer.notified).toBeTruthy();
		});
	}); // End of consumption test bundle


	describe("Listenning", function () {
		var aListener = { id: "a" },
			topic = new (a$(jT.Communicating, EmptyTranslator))();
			  
		it("Can add listeners", function () {
		  topic.addListeners(aListener);
		  expect(a$.weight(topic.listeners)).toBe(1);
		});
  
	  it("Listener can be removed", function () {
		topic.addListeners(aListener);
		topic.removeOneListener("a");
		expect(a$.weight(topic.listeners)).toBe(0);
	  })
  
	  it("Many consumers can be removed", function () {
		topic.addListeners(aListener);
		topic.addListeners({ id: "b" });
		topic.removeListeners(function (c, i) { return i == "a"; });
		expect(a$.weight(topic.listeners)).toBe(1);
		expect(topic.getListener("b")).toBeDefined();
	  })
	  
	  it("Can enumerate consumers", function () {
		topic.addListeners(aListener);
		topic.addListeners({ id: "b" });
		var ctx = { count: 0 };
		topic.enumerateListeners(function () { ++this.count; }, ctx);
		expect(ctx.count).toBe(2);
	  });
	  });
  
});