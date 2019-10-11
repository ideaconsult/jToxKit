(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory(require("lodash/core")) : typeof define === "function" && define.amd ? define([ "lodash/core" ], factory) : (global = global || self, 
  global.asSys = factory(global._));
})(this, function(_) {
  "use strict";
  var eachObj = !!_ && typeof _.each === "function" ? _.each : $.each;
  var mergeObjs = !!_ && typeof _.extend === "function" ? _.extend : $.extend;
  var equalObjs = !!_ && typeof _.equal === "function" ? _.equal : function(a, b) {
    if (typeof a !== "object" || typeof b !== "object") return a === b; else {
      var testedProps = {};
      for (var p in a) {
        if (!a.hasOwnProperty(p)) continue;
        if (!b.hasOwnProperty(p) || !equalObjs(a[p], b[p])) return false;
        testedProps[p] = true;
      }
      for (var p in b) {
        if (testedProps[p] || !b.hasOwnProperty(p)) continue;
        if (!a.hasOwnProperty(p) || !equalObjs(a[p], b[p])) return false;
      }
    }
    return true;
  };
  var similarObjs = function(a, b) {
    if (a instanceof RegExp) return typeof b === "string" && b.match(a) != null; else if (b instanceof RegExp) return typeof a === "string" && a.match(b) != null; else if (typeof a !== "object" || typeof b !== "object") return a == b; else for (var p in a) {
      if (!a.hasOwnProperty(p)) continue;
      if (b.hasOwnProperty(p) && !similarObjs(a[p], b[p])) return false;
    }
    return true;
  };
  var multiScan = function(arr, callback) {
    if (arr.length < 2) return true;
    var a0 = arr[0];
    for (var i = 1, al = arr.length; i < al; ++i) if (callback(a0, arr[i]) === false) return false;
    return true;
  };
  var fnName = function(fn) {
    if (!fn) return undefined;
    if (typeof fn !== "function") return fn.toString(); else if (fn.name !== undefined) return fn.name; else {
      var s = fn.toString().match(/function ([^\(]+)/);
      return s != null ? s[1] : "";
    }
  };
  var a$ = function() {
    var skillmap = [], growingArgs, expected = null, skills = Array.prototype.slice.call(arguments, 0);
    var A = function() {
      var skills = this.__skills;
      if (!this.__initializing) {
        this.__initializing = true;
        for (var i = 0, sl = skills.length; i < sl; ++i) skills[i].apply(this, arguments);
        delete this.__initializing;
      }
    };
    for (var i = 0, a; i < skills.length; ++i) {
      a = skills[i];
      if (skillmap.indexOf(a) > -1) continue;
      if (typeof a !== "function" || !a.prototype) throw {
        name: "Missing skill",
        message: "The skill-set listed [" + fnName(a) + "] is missing.",
        skill: s
      };
      if (!!a.prototype.__depends) {
        growingArgs = [ i, 0 ];
        for (var s, j = 0, el = a.prototype.__depends.length; j < el; ++j) {
          s = a.prototype.__depends[j];
          if (skills.indexOf(s) == -1) growingArgs.push(s);
        }
        if (growingArgs.length > 2) {
          Array.prototype.splice.apply(skills, growingArgs);
          --i;
          continue;
        }
      }
      if (a.prototype.__expects != null) {
        if (!expected) expected = {};
        for (var j = 0, el = a.prototype.__expects.length; j < el; ++j) expected[a.prototype.__expects[j]] = true;
      }
      skillmap.push(a);
      A.prototype = A.prototype === undefined ? Object.create(a.prototype) : mergeObjs(A.prototype, a.prototype);
      if (a.prototype.__skills !== undefined) {
        for (var j = 0, ssl = a.prototype.__skills.length, ss; j < ssl; ++j) {
          ss = a.prototype.__skills[j];
          if (skillmap.indexOf(ss) == -1) skillmap.push(ss);
        }
      }
    }
    if (!!expected) {
      eachObj(expected, function(v, m) {
        if (!A.prototype[m]) throw {
          name: "Unmatched expectation",
          message: "The expected method [" + m + "] was not found among provided skills.",
          method: m
        };
      });
    }
    Object.defineProperties(A.prototype, {
      __skills: {
        enumerable: false,
        writable: false,
        value: skillmap
      }
    });
    return A;
  };
  a$.VERSION = "1.0.2";
  a$.equal = function() {
    return multiScan(arguments, equalObjs);
  };
  a$.similar = function() {
    return multiScan(arguments, similarObjs);
  };
  a$.title = fnName;
  a$.setup = function(agent) {
    for (var p in agent) {
      for (var i = 1; i < arguments.length; ++i) {
        var src = arguments[i];
        if (!!src && src[p] !== undefined) agent[p] = src[p];
      }
    }
    return agent;
  };
  a$.common = function(equal) {
    var keyCnt = {}, keyVal = {}, res = {}, ia = 0, argsCnt = arguments.length;
    if (typeof equal === "boolean") ia = 1;
    for (var a; ia < argsCnt; ++ia) {
      a = arguments[ia];
      for (var p in a) {
        if (keyCnt[p] === undefined) {
          keyCnt[p] = 1;
          keyVal[p] = a[p];
        } else if (equal !== true || keyVal[p] === a[p]) ++keyCnt[p];
      }
    }
    if (typeof equal === "boolean") --argsCnt;
    for (var p in keyCnt) if (keyCnt[p] == argsCnt) res[p] = keyVal[p];
    return res;
  };
  a$.weight = function(agent) {
    if (typeof agent !== "object") return 1; else if (agent.hasOwnProperty("length") && typeof agent.length == "number") return agent.length; else return Object.keys(agent).length;
  };
  a$.clone = function(agent) {
    var o = Object.create(Object.getPrototypeOf(agent));
    try {
      return agent.constructor.apply(o, Array.prototype.slice(arguments, 1)) || o;
    } catch (e) {}
  };
  a$.act = function(agent, activity) {
    if (agent == null) return;
    if (typeof activity === "string") activity = agent[activity];
    if (typeof activity === "function") {
      return activity.apply(agent, Array.prototype.slice.call(arguments, 2));
    }
  };
  a$.broadcast = function(agent, activity) {
    var args = Array.prototype.slice.call(arguments, 2);
    eachObj(agent.__skills, function(s) {
      if (typeof s.prototype[activity] === "function") s.prototype[activity].apply(agent, args);
    });
    return agent;
  };
  a$.pass = function(agent, skill, activity) {
    var i = agent.__skills && agent.__skills.indexOf(skill), s;
    while (--i >= 0) {
      s = agent.__skills[i];
      if (typeof s.prototype[activity] === "function") return s.prototype[activity].apply(agent, Array.prototype.slice.call(arguments, 3));
    }
  };
  a$.can = function(agent, activity) {
    return typeof agent === "object" && typeof agent[activity] === "function";
  };
  a$.aware = function(agent, prop) {
    return typeof agent === "object" && agent[prop] !== undefined;
  };
  a$.capable = function(agent, all) {
    var proto = Object.getPrototypeOf(agent), cnt, firstIdx = 1;
    if (typeof all === "boolean") firstIdx = 2;
    for (var s, cnt = 0, i = firstIdx, alen = arguments.length; i < alen; ++i) {
      s = arguments[i];
      if (agent instanceof s) ++cnt; else if (!Array.isArray(proto.__skills)) {
        var w = a$.weight(s.prototype);
        if (w > 0 && a$.weight(a$.common(true, agent, s.prototype)) == w) ++cnt;
      } else if (proto.__skills.indexOf(s) > -1) ++cnt;
    }
    return cnt > 0 && (all !== true || arguments.length - firstIdx == cnt);
  };
  a$.group = function(pool, full, selector) {
    var res = this.clone(pool), skills = {};
    if (typeof full !== "boolean") {
      selector = full;
      full = false;
    }
    for (var k in pool) {
      var a = pool[k];
      if (!selector.call(a, a, k, pool)) continue;
      if (full) mergeObjs(skills, Object.getPrototypeOf(a));
      res.push(a);
    }
    if (full) {
      var sks = Object.keys(skills), p, props = {};
      for (var i = 0, sl = sks.length; i < sl; ++i) {
        p = sks[i];
        props[p] = {
          enumerable: false,
          writable: false,
          value: typeof skills[p] !== "function" ? skills[p] : function(key) {
            return function() {
              var r = undefined;
              for (var i in this) {
                var o = this[i];
                if (typeof o[key] === "function") r = o[key].apply(o, arguments);
              }
              return r;
            };
          }(p)
        };
      }
      Object.defineProperties(res, props);
    }
    return res;
  };
  return a$;
});