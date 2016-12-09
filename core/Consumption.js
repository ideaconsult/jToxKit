/** jToxKit - chem-informatics multi toolkit.
  * Data consumption skills.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
/***
  * The rationale behind this skill-set is that any data transformation that could be needed from the raw response 
  * to the data expected by the widgets should happen only once. If we have each widget directly being notified 
  * upon query's response, then each widget should transform the data by itself, which could potentially be
  * time consuming. 
  * With this skill-set encapsulation we provide the mechanism for widget(s) to listen to `data ready` notification. 
  * The actual data transformation, of course, is going to be done by another skill set, which will provide the only
  * expected method - `translateResponse`.
  *
  * Consumers are registered pretty much the same way each listener is.
  * There two methods that are expected to be present - `init` and `afterTranslation`.
  * The first one is optional and is invoked once, when the Consumption-enabled entity
  * is initialized itself.
  * The other method - `afterTranslation` is invoked on every successfull response.
  */
(function (jT, a$) {  

  /**
   * Data consumption skills, aimed a generic binding link between translators and parties
   * interested in pre-formatted data.
   *
   */
  
  jT.Consumption = function (settings) {
    a$.extend(true, this, settings);
    this.consumers = {};
    this.manager = null;
  }
  
  jT.Consumption.prototype = {
    __expects: [ "translateResponse" ],
    
    /**
     * Methods, that are going to be invoked by the manager.
     */ 
    init: function (manager) {
      // Let the other initializers, like the Management, for example
      a$.pass(this, jT.Consumption, "init");
      
      this.manager = manager;
      a$.each(this.consumers, function (c) {
        // Inform the consumer who's the manager. Most probably this is us.
        a$.act(c, c.init, manager);
      });  
    },
    
    parseResponse: function (response, scope) {
      a$.pass(this, jT.Consumption, "parseResponse");
      
      var data = this.translateResponse(response, scope),
          man = this.manager;
      a$.each(this.consumers, function (c) {
        a$.act(c, c.afterTranslation, data, scope, man);
      });
    },
    
    /*** The actual consumption skills methods ***/
    
    addConsumers: function (consumer, id) {
      if (typeof id !== "string")
        throw { name: "Binding error", message: "Attempt to add consumer with non-string id: " + id };
        
      this.consumers[id] = consumer;
      return this;
    },
    
    removeConsumer: function (id) {
      delete this.consumers[id];
      return this;
    },
    
    removeManyConsumers: function (selector) {
      if (typeof selector !== 'function')
        throw { name: "Enumeration error", message: "Attempt to enumerate consumers with non-function 'selector': " + selector };
        
      var self = this;
      a$.each(this.consumers, function (c, i) {
        if (selector(c, i, self))
          delete self.consumers[i];
      });
      return this;
    },
    
    enumerateConsumers: function (selector, context) {
      if (typeof selector !== 'function')
        throw { name: "Enumeration error", message: "Attempt to enumerate consumers with non-function 'selector': " + selector };
      
      a$.each(this.consumers, function (c, i) {
        selector.call(c, c, i, context);
      });
      
      return this;
    },
    
    getConsumer: function (id) {
      return this.consumers[id];
    }

  };
  
})(jToxKit, asSys);
