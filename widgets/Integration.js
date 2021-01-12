/** jToxKit - chem-informatics multi-tool-kit.
  * Base for widgets and UI-related stuff
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */

jT.ui = a$.extend(jT.ui, {
  querySettings: {}, // These can be modified from the URL string itself.
	templateRoot: null,
	callId: 0,

  // initializes one kit, based on the kit name passed, either as params, or found within data-XXX parameters of the element
  initKit: function(element, opts) {
    var self = this,
        dataParams = element.data(),
        kit = dataParams.kit,
        topSettings = { baseUrl: jT.formBaseUrl(document.location.href) };

    // first - skip, if we're manual...
    if (!!dataParams.manualInit)
      return null;

  	// we need to traverse up, to collect some parent's settings...
  	a$.each(element.parents('.jtox-kit,.jtox-widget').toArray().reverse(), function(el) {
  	  parent = self.kit(el);
    	if (parent != null)
      	topSettings = $.extend(topSettings, parent.settings, { baseUrl: parent.baseUrl });
  	});

    // This should be priority from low to high: inherited -> data-* provided -> programmatically provided -> query string provided
    dataParams = $.extend(_.cloneDeep(topSettings), dataParams, opts, self.querySettings);
    dataParams.baseUrl = jT.fixBaseUrl(dataParams.baseUrl);
    dataParams.target = element;
    
    if (dataParams.id === undefined)
      dataParams.id = element.attr('id');

	  // the real initialization function
    var realInit = function (params) {
    	if (!kit)
        return null;
        
      // add jTox if it is missing AND there is not existing object/function with passed name. We can initialize ketcher and others like this too.
    	var fn = window[kit];
    	if (typeof fn !== 'function') {
  	  	kit = kit.charAt(0).toUpperCase() + kit.slice(1);
  	  	fn = jT.ui[kit] || jT[kit];
  	  }

    	var obj = null;
      if (typeof fn == 'function')
    	  obj = new fn(params);
      else if (typeof fn == "object" && typeof fn.init == "function")
        obj = fn.init(params);

      if (obj != null) {
        if (fn.prototype.__kits === undefined)
          fn.prototype.__kits = [];
        fn.prototype.__kits.push(obj);
      }
      else
        console.log("jToxError: trying to initialize unexistent jTox kit: " + kit);

      return obj;
    };

	  // first, get the configuration, if such is passed
	  if (dataParams.configFile != null) {
	    // we'll use a trick here so the baseUrl parameters set so far to take account... thus passing 'fake' kit instance
	    // as the first parameter of jT.ambit.call();
  	  $.ajax({ settings: "GET", url: dataParams.configFile }, function(config){
    	  if (!!config)
    	    $.extend(true, dataParams, config);
        element.data('jtKit', realInit(dataParams));
  	  });
	  }
	  else {
      var config = dataParams.configuration;
      if (typeof config === 'string')
        config = window[config];
      if (typeof config === 'function')
        config = config.call(kit, dataParams, kit);
      if (typeof config === 'object')
        $.extend(true, dataParams, config);

      delete dataParams.configuration;

      var kitObj = realInit(dataParams);
      element.data('jtKit', kitObj);
      return kitObj;
	  }
  },

  // the jToxKit initialization routine, which scans all elements, marked as 'jtox-kit' and initializes them
	initialize: function(root) {
  	var self = this;

  	if (!root) {
      // make this handler for UUID copying. Once here - it's live, so it works for all tables in the future
      $(document).on('click', '.jtox-kit div.shortened + .icon', function () { jT.copyToClipboard($(this).data('uuid')); return false;});
      // install the click handler for fold / unfold
      $(document).on('click', '.jtox-foldable>.title', function(e) { $(this).parent().toggleClass('folded'); });
      // install diagram zooming handlers
      $(document).on('click', '.jtox-diagram .icon', function () {
        $(this).toggleClass('fa-search-plus fa-search-minus');
        $('img', this.parentNode).toggleClass('jtox-smalldiagram');
      });

      // scan the query parameter for settings
      var url = jT.parseURL(document.location);
      
      self.querySettings = url.params;
      if (!!self.querySettings.baseUrl)
        self.querySettings.baseUrl = jT.fixBaseUrl(self.querySettings.baseUrl);

      self.fullUrl = url;
      root = document;
  	}

  	// now scan all insertion divs
  	var fnInit = function() { self.initKit($(this)); };
  	$('.jtox-kit', root).each(fnInit);
  	$('.jtox-widget', root).each(fnInit);
	},

	kit: function (element) {
    return $(element).closest('.jtox-kit,.jtox-widget').data('jtKit');
	},
	
	attachKit: function (element, kit) {
  	return $(element).data('jtKit', kit);
	}

});
