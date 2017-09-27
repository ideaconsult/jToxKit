/** jToxKit - chem-informatics multi-tool-kit.
  * A model running skill, based on AMBIT API.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2016-2017, IDEAConsult Ltd. All rights reserved.
  */

jT.ModelRunning = function (settings) {
  a$.extend(true, this, settings);
  
  this.models = null;
}

jT.ModelRunning.prototype = {
  algorithms: false,        // ask for algorithms, not models.
  forceCreate: false,       // upon creating a model from algorithm - whether to attempt getting a prepared one, or always create it new.
  loadOnInit: false,        // whether to make a (blank) request upon loading.
  listFilter: null,         // What needle to use when obtaining model/algorithm list.
  onLoaded: null,           // callback to be called when data has arrived.
  
  init: function (manager) {
    // Let the other initializers.
    a$.pass(this, jT.ModelRunning, "init", manager);
    
    this.manager = manager;
    if (this.modelUri != null || this.listFilter != null || this.loadOnInit)
      self.queryList();
  },
  
  listModels: function (uri) {
    var self = this;

    self.manager.doRequest('model', function (result, jhr) {
      if (!result && jhr.status == 200)
        result = { model: [] }; // empty one

      if (!!result)
        self.models = result.model;

      a$.act(self, self.onLoaded, self, result);
    });
  },

  /* List algorithms that contain given 'needle' in their name
  */
  listAlgorithms: function (needle) {
    var self = this;
    var uri = manager.baseUrl + '/algorithm';
    if (!!needle)
      uri = jT.ui.addParameter(uri, 'search=' + needle);
    jT.call(self, uri, function (result, jhr) {
      if (!result && jhr.status != 200)
        result = { algorithm: [] }; // empty one
      if (!!result) {
        self.algorithm = result.algorithm;
        ccLib.fireCallback(self.settings.onLoaded, self, result);
      }
      else
        ccLib.fireCallback(self.settings.onLoaded, self, result);
    });
  },

  getModel: function (algoUri, callback) {
    var self = this;
    var createIt = function () {
      jT.service(self, algoUri, { method: 'POST' }, function (result, jhr) {
        ccLib.fireCallback(callback, self, result, jhr);
      });
    };

    if (self.settings.forceCreate)
      createIt();
    else
      jT.call(self, self.settings.baseUrl + '/model?algorithm=' + encodeURIComponent(algoUri), function (result, jhr) {
        if (!result && jhr.status != 404)
          ccLib.fireCallback(callback, self, null, jhr);
        else if (!result || result.model.length == 0)
          createIt();
        else // we have it!
          ccLib.fireCallback(callback, self, result.model[0].URI, jhr);
      });
  },

  runPrediction: function (datasetUri, modelUri, callback) {
    var self = this;
    var q = ccLib.addParameter(datasetUri, 'feature_uris[]=' + encodeURIComponent(modelUri + '/predicted'));

    var createIt = function () {
      jT.service(self, modelUri, { method: "POST", data: { dataset_uri: datasetUri } }, function (result, jhr) {
        if (!result)
          ccLib.fireCallback(callback, self, null, jhr);
        else
          jT.call(self, result, callback);
      });
    };
    
    jT.call(self, q, function (result, jhr) {
      if (!result)
        ccLib.fireCallback(callback, self, null, jhr);
      else if (!self.settings.forceCreate && result.dataEntry.length > 0) {
        var empty = true;
        for (var i = 0, rl = result.dataEntry.length; i < rl; ++i)
          if (!jT.$.isEmptyObject(result.dataEntry[i].values)) {
            empty = false;
            break;
          }
        if (empty)
          createIt();
        else
          ccLib.fireCallback(callback, self, result, jhr)
      }
      else
        createIt();
    });
  },

  queryList: function (needle) {
    if (this.algorithms)
      this.listAlgorithms(this.listFilter = (needle || this.listFilter));
    else
      this.listModels(this.modelUri = (needle || this.modelUri));
  }
};

