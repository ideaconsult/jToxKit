(function (Solr, a$, $, jT) {
  
  function SimpleRanger(settings) { 
    this.sliderRoot = settings.sliderRoot;
  }
  
  SimpleRanger.prototype.__expects = [ "addValue", "doRequest" ];
  SimpleRanger.prototype.targetValue = null;
  SimpleRanger.prototype.updateHandler = function () {
    var self = this;
    return function (values) {
      if (!!self.addValue(values)) {
        self.sliderRoot.updateRequest = true;
        self.doRequest();
      } 
    };
  }
  SimpleRanger.prototype.doRequest = function () {
    this.manager.doRequest();
  }
  
  SingleRangeWidget = a$(Solr.Ranging, Solr.Patterning, jT.SliderWidget, SimpleRanger, Solr.Delaying);
  
	/** The general wrapper of all parts
  	*/
  	
  var defaultParameters = {
    'facet': true,
    'rows': 0,
    'fl': "id",
    'facet.limit': -1,
    'facet.mincount': 1,
    'echoParams': "none"
  };
  	
  jT.RangeWidgeting = function (settings) {
    a$.extend(true, this, a$.common(settings, this));

    this.slidersTarget = $(settings.slidersTarget);
    this.lookupMap = settings.lookupMap || {};
    this.pivotMap = null;
    this.rangeWidgets = [];
    if (!Array.isArray(this.titleSkips))
      this.titleSkips = [ this.titleSkips ];
  };
  
  jT.RangeWidgeting.prototype = {
    __expects: [ "getPivotEntry", "getPivotCounts", "parseValue" ],
    field: null,
    titleSkips: null,
    
    init: function (manager) {
      a$.pass(this, jT.RangeWidgeting, "init", manager);
      this.manager = manager;
      
      var self = this;
      self.applyCommand = $("#sliders-controls a.command.apply").on("click", function (e) {
        self.skipClear = true;
        self.manager.doRequest();
        return false;
      });
      
      $("#sliders-controls a.command.close").on("click", function (e) {
        self.rangeRemove();
        return false;
      });
    },
    
    afterTranslation: function (data) {
      var pivot = this.getPivotCounts(data.facets);
            
      a$.pass(this, jT.RangeWidgeting, "afterTranslation", data);
            
      if (!this.pivotMap) {
        var qval = this.manager.getParameter('q').value || "";
        if ((!qval || qval == "*:*") && !this.manager.getParameter(this.useJson ? "json.filter" : "fq").value)
          this.pivotMap =  this.buildPivotMap(pivot);
      }
      else if (!this.updateRequest)
        this.rangeRemove();
      else if (this.rangeWidgets.length > 0) {
        var pivotMap = this.buildPivotMap(pivot);
        
        for (var i = 0;i < this.rangeWidgets.length; ++i) {
          var w = this.rangeWidgets[i],
            ref = pivotMap[w.targetValue];
          w.updateSlider([ ref[i].min, ref[i].max ]);
        }
      }
      
      this.updateRequest = false;
    },

    getPivotFromId: function (pId) {
      var pInfo = null;
      for (var i = 0; (pInfo = this.getPivotEntry(i)).id != pId; ++i);
      return pInfo;
    },
    
    buildPivotMap: function (pivot) {
      var self = this,
          map = {},
          traverser = function (base, idx, pattern, valId) {
            var p = self.getPivotEntry(idx),
                info, next;
            
            // Make the Id first
            if (!p.disabled)
              valId = p.id + ":" + base.val;
              
            // Now deal with the pattern
            pattern += (!base.val ? ("-" + p.field + ":*") : (p.field + ":" + Solr.escapeValue(base.val))) + " ";
            info = base;
              
            next = self.getPivotEntry(idx + 1);
            if (next != null)
              base = base[next.id].buckets;

            // If we're at the bottom - add some entries...
            if (next == null || !base.length) {
              (map[valId] = map[valId] || []).push({
                'id': p.id,
                'pattern': pattern,
                'color': p.color,
                'min': info.min,
                'max': info.max,
                'avg': info.avg,
                'val': info.val,
                'count': info.count
              });
            }
            // ... or just traverse and go deeper.
            else {
              for (var i = 0, bl = base.length; i < bl; ++i)
                traverser(base[i], idx + 1, pattern, valId);
            }
          };
          
      for (var i = 0;i < pivot.length; ++i)
        traverser(pivot[i], 0, "");
        
      return map;
    },
    
    rangeRemove: function() {
      this.slidersTarget.empty().parent().removeClass("active");

      for (var i = 0, wl = this.rangeWidgets.length;i < wl; ++i)
        this.rangeWidgets[i].clearValues();

      this.rangeWidgets = [];
      this.lastPivotValue = null;
    },
    
    buildTitle: function (info, skip) {
      var pat = info.pattern.replace(/\\"/g, "%0022"),
          fields = pat.match(/\w+:([^\s:\/"]+|"[^"]+")/g),
          outs = [];
      
      // Stupid, but we need to have both regexps because of the
      // global flag needed on the first one and NOT needed later.
      for (var i = 0;i < fields.length; ++i) {
        var f = fields[i],
            m = f.match(/(\w+):([^\s:\/"]+|"[^"]+")/),
            v = m[2].replace(/^\s*\(\s*|\s*\)\s*$/g, "");
        
        if (!m[1].match(skip))
          outs.push(this.lookupMap[v] || v);
      }
      
      return outs.join("/") + " <i>(" + info.count + ")</i>";
    },
    
    ensurePivotMap: function (cb) {
      if (this.pivotMap != null)
        return cb(this.pivotMap);
        
      var fqName = this.useJson ? "json.filter" : "fq",
          self = this;
      
      // We still don't have it - make a separate request
      this.doSpying(
        function (man) {
          man.removeParameters(fqName);
          man.removeParameters('fl');
          man.getParameter('q').value = "";
          man.mergeParameters(defaultParameters);
        },
        function (data) {
          cb(self.pivotMap = self.buildPivotMap(self.getPivotCounts(data.facets)));
        }
      );
      
      return false;
    },
    
    openRangers: function (value) {
      var allVals = this.pivotMap[value],
          localMap = this.buildPivotMap(this.getPivotCounts()),
          current = localMap[value];
      
      this.lastPivotValue = value;
      this.slidersTarget.empty().parent().addClass("active");

      for (var i = 0, rangeCnt = current.length; i < rangeCnt; ++i) {
        var ref = current[i],
            full = allVals.find(function (e) { return e.pattern === ref.pattern }) || ref,
            el$ = jT.ui.fillTemplate("#slider-one"),
            setup = {
              id: ref.id,
              targetValue: value,
              color: full.color,
              field: this.field,
              limits: [ full.min, full.max ],
              initial: [ ref.min, ref.max ],
              target: el$,
              isRange: true,
              valuePattern: ref.pattern + "{{v}}",
              automatic: true,
              title: this.buildTitle(ref, /^unit[_shd]*|^effectendpoint[_shd]*/),
              units: ref.id == "unit" ? jT.ui.formatUnits(ref.val) : "",
              useJson: this.useJson,
              domain: this.domain,
              sliderRoot: this
            };

        this.slidersTarget.append(el$);
        setup.width = parseInt(this.slidersTarget.width() - $("#sliders-controls").width() - 20) / (Math.min(rangeCnt, 2) + 0.1);

        var w = new SingleRangeWidget(setup);
        this.rangeWidgets.push(w);
        w.init(this.manager);
      }
    },
    
    auxHandler: function (value) {
      var self = this,
        pInfo = this.getPivotFromId(this.parseValue(value).id) || {};
      
      return !pInfo.ranging ? undefined : function (event) {
        event.stopPropagation();
        var prevValue = self.lastPivotValue;

        self.rangeRemove();

        // we've clicked out pivot button - clearing was enough.
        if (value != prevValue)
          self.ensurePivotMap(function () { self.openRangers(value); });
        
        return false;
      };
    },
    
    clearValues: function () {
      this.rangeRemove();
      a$.pass(this, jT.RangeWidgeting, "clearValues");
    }
    
	};
	
})(Solr, asSys, jQuery, jToxKit);
