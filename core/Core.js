/** jToxKit - chem-informatics multi-tool-kit.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */


(function () {
  // Define this as a main object to put everything in
  jToxKit = { version: "{{VERSION}}" };

  // Now import all the actual skills ...
  // ATTENTION: Kepp them in the beginning of the line - this is how smash expects them.
  
import "Consumption";

  /** ... and finish with some module / export definition for according platforms
    */
  if ( typeof module === "object" && module && typeof module.exports === "object" )
  	module.exports = jToxKit;
  else {
    this.jToxKit = jToxKit;
    if ( typeof define === "function" && define.amd )
      define(jToxKit);
  }
})();
