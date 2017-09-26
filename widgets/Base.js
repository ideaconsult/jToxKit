/** jToxKit - chem-informatics multi-tool-kit.
  * Base for widgets and UI-related stuff
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */

(function (jT, a$, $) {
  // Define more tools here
  jT.ui = a$.extend(jT.ui, {
    templates: {},
    /** Gets a template with given selector and replaces the designated
      * {{placeholders}} from the provided `info`.
      */
  	fillTemplate: function(selector, info) {
  		return $(jT.ui.formatString($(selector).html(), info).replace(/(<img(\s+.*)?)(\s+jt-src=")/, "$1 src=\""));
  	},
  	
  	fillTree: function (root, info) {
    	$('.data-field', root).each(function () { var me$ = $(this); me$.html(a$.path(info, me$.data('field'))); });
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
    },
    
    enterBlur: function (e) {
      if (e.keyCode == 13)
        this.blur();
    },
    
  	/* Fix the baseUrl - remove the trailing slash if any
  	*/
  	fixBaseUrl: function (url) {
      if (url != null && url.charAt(url.length - 1) == '/')
        url = url.slice(0, -1);
    	return url;
  	},
  	
  	/* Deduce the baseUrl from a given Url - either if it is full url, of fallback to jToxKit's if it is local
  	Passed is the first "non-base" component of the path...
  	*/
  	grabBaseUrl: function(url, key) {
      if (url != null) {
        if (!!key) 
          return url.slice(0, url.indexOf("/" + key));
        else if (url.indexOf('http') == 0)
          return this.formBaseUrl(this.parseURL(url));
      }
      
      return this.settings.baseUrl;
  	},
    
  	// form the "default" baseUrl if no other is supplied
  	formBaseUrl: function(url) {
    	var burl = !!url.host ? url.protocol + "://" + url.host + (url.port.length > 0 ? ":" + url.port : '') + '/' + url.segments[0] : null;
    	console.log("Deduced base URL: " + burl + " (from: " + url.source + ")");
      return burl;
  	},
  	
    copyToClipboard: function(text, prompt) {
      if (!prompt) {
        prompt = "Press Ctrl-C (Command-C) to copy and then Enter.";
      }
      window.prompt(prompt, text);
    }
    
  });
  
  // Now import all the actual skills ...
  // ATTENTION: Kepp them in the beginning of the line - this is how smash expects them.
  
import "Integration";
import "ListWidget";
import "TagWidget";
import "AutocompleteWidget";
import "SimpleItemWidget";
import "AccordionExpansion";
import "SliderWidget";

})(jToxKit, asSys, jQuery);
