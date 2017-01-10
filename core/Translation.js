/** jToxKit - chem-informatics multi toolkit.
  * Data translation basic skills.
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
  * The first one is optional and is invoked once, when the Translation-enabled entity
  * is initialized itself.
  * The other method - `afterTranslation` is invoked on every successfull response.
  */
(function (jT, a$) {  

  /**
   * Data translation skills, aimed a generic binding link between translators and parties
   * interested in pre-formatted data.
   *
   */
  
  jT.Translation = function (settings) {
    a$.extend(true, this, settings);
  }
  
  jT.Translation.prototype = {
    __expects: [ "translateResponse" ],
    
    /**
     * Methods, that are going to be invoked by the manager.
     */ 
    init: function () {
      var self = this;
      // Let the other initializers, like the Management, for example
      a$.pass(this, jT.Translation, "init");
    },
    
    parseResponse: function (response, scope) {
      a$.pass(this, jT.Translation, "parseResponse");
      
      var data = this.translateResponse(response, scope),
          self = this;
      a$.each(this.listeners, function (c) {
        a$.act(c, c.afterTranslation, data, scope, self);
      });
    },
  };
  
})(jToxKit, asSys);
