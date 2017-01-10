(function() {
  var extractProps = function(start) {
    var props = {}, a, keys;
    for (var i = start, al = arguments.length; i < al; ++i) {
      a = arguments[i];
      if (typeof a === "object" && a !== null) {
        keys = Object.keys(a);
        for (var j = 0, kl = keys.length; j < kl; ++j) props[keys[j]] = true;
      }
    }
    return props;
  };
  var copyEnabled = function(agent) {
    return agent != null && typeof agent === "object" && typeof agent.constructor === "function" && !agent.nodeType;
  };
  var mergeObjects = function(deep, newonly, i, objects) {
    if (!deep && !newonly && typeof Object.assign === "function") {
      for (;objects[i] == null; ++i) ;
      return Object.assign.apply(Object, i == 0 ? objects : Array.prototype.slice.call(objects, i));
    }
    var obj = objects[i], ol = objects.length, merge = function(target, src) {
      if (src == null) return; else if (target == null) {
        target = src;
        return;
      }
      for (var p in src) {
        if (target[p] === src[p]) continue;
        if (target[p] !== undefined && newonly) continue; else if (!deep || typeof src[p] !== "object" || src[p] instanceof RegExp || !src.hasOwnProperty(p) || !copyEnabled(src[p])) target[p] = src[p]; else try {
          if (target[p] == null) target[p] = asSys.mimic(src[p]);
          merge(target[p], src[p]);
        } catch (e) {
          target[p] = src[p];
        }
      }
    };
    while (++i < ol) merge(obj, objects[i]);
    return obj;
  };
  var twinScan = function(arr, start, callback) {
    var ai, j;
    for (var i = start, al = arr.length; i < al; ++i) {
      ai = arr[i];
      for (j = i + 1; j < al; ++j) {
        if (callback(ai, arr[j]) === false) return false;
      }
    }
    return true;
  };
  var asSys = function() {
    var skillmap = [], expected = null, missing, skills = Array.prototype.slice.call(arguments, 0), A = function() {
      var agent = this, args = arguments;
      if (!agent.__initializing) {
        agent.__initializing = true;
        asSys.each(agent.__skills, function(s) {
          s.apply(agent, args);
        });
        delete agent.__initializing;
      }
    };
    for (var i = 0, a; i < skills.length; ++i) {
      a = skills[i];
      if (a == null) throw {
        name: "Missing skill",
        message: "The skill-set liseted [" + a + "] is missing.",
        skill: s
      };
      if (typeof a === "function" && a.prototype !== undefined) {
        if (skillmap.indexOf(a) > -1) continue;
        if (a.prototype.__depends != null) {
          missing = [ i, 0 ];
          for (var s, j = 0, el = a.prototype.__depends.length; j < el; ++j) {
            s = a.prototype.__depends[j];
            if (skills.indexOf(s) == -1) missing.push(s);
          }
          if (missing.length > 2) {
            Array.prototype.splice.apply(skills, missing);
            --i;
            continue;
          }
        }
        if (a.prototype.__expects != null) {
          if (expected == null) expected = {};
          for (var j = 0, el = a.prototype.__expects.length; j < el; ++j) expected[a.prototype.__expects[j]] = true;
        }
        skillmap.push(a);
        if (A.prototype === undefined) A.prototype = Object.create(a.prototype); else mergeObjects(true, false, 0, [ A.prototype, a.prototype ]);
        if (a.prototype.__skills !== undefined) {
          for (var j = 0, ssl = a.prototype.__skills.length, ss; j < ssl; ++j) {
            ss = a.prototype.__skills[j];
            if (skillmap.indexOf(ss) == -1) skillmap.push(ss);
          }
        }
      }
    }
    asSys.each(expected, function(v, m) {
      if (A.prototype[m] == null) throw {
        name: "Unmatched expectation",
        message: "The expected method [" + m + "] was not found among provided skills.",
        method: m
      };
    });
    Object.defineProperties(A.prototype, {
      __skills: {
        enumerable: false,
        writable: false,
        value: skillmap
      }
    });
    return A;
  };
  asSys.version = "0.10.4";
  asSys.equal = function(deepCompare) {
    var deep = deepCompare, start = 0, match = function(a, b, dig) {
      if (typeof a !== "object" || typeof b !== "object") return a === b; else if (dig !== false) {
        for (var p in extractProps(0, a, b)) {
          if (!match(a[p], b[p], deep)) return false;
        }
        return true;
      }
    };
    if (typeof deep !== "boolean") deep = false; else start = 1;
    return twinScan(arguments, start, match);
  };
  asSys.similar = function(deepCompare) {
    var deep = deepCompare, start = 0;
    match = function(a, b, dig) {
      if (a instanceof RegExp) return typeof b === "string" && b.match(a) != null; else if (b instanceof RegExp) return typeof a === "string" && a.match(b) != null; else if (typeof a !== "object" || typeof b !== "object") return a == b; else if (dig !== false) {
        for (var p in a) {
          if (b[p] !== undefined && !match(a[p], b[p], deep)) return false;
        }
        return true;
      }
    };
    if (typeof deep !== "boolean") deep = false; else start = 1;
    return twinScan(arguments, start, match);
  };
  asSys.common = function(equal) {
    var eq = equal, idx = 0, res = null, argl = arguments.length, extract = function(a, b) {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (res == null) res = [];
        for (var i = 0, al = a.length; i < al; ++i) {
          if (b.indexOf(a[i]) > -1) res.push(a[i]);
        }
      } else {
        if (res == null) res = {};
        for (var p in a) {
          if (b.hasOwnProperty(p) && (!eq || a[p] == b[p])) res[p] = a[p];
        }
      }
    };
    if (typeof equal !== "boolean") eq = false; else idx = 1;
    while (++idx < argl) extract(res == null ? arguments[idx - 1] : res, arguments[idx]);
    return res;
  };
  asSys.extend = function(deep) {
    var d = deep, start = 0;
    if (typeof d !== "boolean") d = false; else start = 1;
    return mergeObjects(d, false, start, arguments);
  };
  asSys.mixin = function(deep) {
    var d = deep, start = 0;
    if (typeof d !== "boolean") d = false; else start = 1;
    return mergeObjects(d, true, start, arguments);
  };
  asSys.filter = function(agent, selector) {
    if (typeof agent.filter === "function") return agent.filter(selector);
    var res = asSys.mimic(agent), p, keys = Object.keys(agent);
    for (var i = 0, kl = keys.length; i < kl; ++i) {
      p = keys[i];
      if (selector(agent[p], p, agent)) res[p] = agent[p];
    }
    return res;
  };
  asSys.each = function(agent, actor) {
    if (agent == null) ; else if (typeof agent.forEach === "function") agent.forEach(actor); else if (typeof agent !== "object") {
      actor(agent);
    } else {
      var k = Object.keys(agent), p;
      for (var i = 0, kl = k.length; i < kl; ++i) {
        p = k[i];
        actor(agent[p], p, agent);
      }
    }
  };
  asSys.weight = function(agent) {
    if (typeof agent !== "object") return 1; else if (agent.hasOwnProperty("length") && typeof agent.length == "number") return agent.length; else return Object.keys(agent).length;
  };
  asSys.name = function(fn) {
    if (typeof fn !== "function") return skill.toString(); else if (fn.name !== undefined) return fn.name; else {
      var s = fn.toString().match(/function ([^\(]+)/);
      return s != null ? s[1] : "";
    }
  };
  asSys.mimic = function(agent) {
    if (copyEnabled(agent)) {
      var o = Object.create(Object.getPrototypeOf(agent));
      try {
        return agent.constructor.apply(o, Array.prototype.slice(arguments, 1)) || o;
      } catch (e) {}
    }
  };
  asSys.path = function(agent, path, value) {
    if (path == null) return;
    if (!Array.isArray(path)) {
      try {
        if (value === undefined) eval("value = agent." + path); else eval("agent." + path + " = value");
        return value;
      } catch (e) {
        path = path.split(".");
      }
    }
    for (var i = 0, pl = path.length; i < pl - 1; ++i) agent = agent[path[i]] = agent[path[i]] || {};
    if (value !== undefined) agent[path[i]] = value; else value = agent[path[i]];
    return value;
  };
  asSys.act = function(agent, activity) {
    if (agent != null && typeof activity === "function") {
      return activity.apply(agent, Array.prototype.slice.call(arguments, 2));
    }
  };
  asSys.broadcast = function(agent, activity) {
    var args = Array.prototype.slice.call(arguments, 2);
    asSys.each(agent.__skills, function(s) {
      if (typeof s.prototype[activity] === "function") s.prototype[activity].apply(agent, args);
    });
    return agent;
  };
  asSys.pass = function(agent, skill, activity) {
    var i = agent.__skills && agent.__skills.indexOf(skill), s;
    if (i > -1) {
      while (--i >= 0) {
        s = agent.__skills[i];
        if (typeof s.prototype[activity] === "function") return s.prototype[activity].apply(agent, Array.prototype.slice.call(arguments, 3));
      }
    }
  };
  asSys.can = function(agent, activity) {
    return typeof agent === "object" && agent[activity] != null && typeof agent[activity] === "function";
  };
  asSys.aware = function(agent, prop) {
    return typeof agent === "object" && agent[prop] !== undefined;
  };
  asSys.capable = function(agent, allskills) {
    var all = allskills, s, w, proto = Object.getPrototypeOf(agent), i = 1;
    if (typeof all !== "boolean") all = true; else i = 2;
    for (var cnt = 0, start = i, al = arguments.length; i < al; ++i) {
      s = arguments[i];
      if (agent instanceof s) ++cnt; else {
        w = asSys.weight(s.prototype);
        if (w > 0 && asSys.weight(asSys.common(true, proto, s.prototype)) == w) ++cnt;
      }
    }
    return cnt > 0 && (all ? arguments.length - start == cnt : true);
  };
  asSys.group = function(pool, full, selector) {
    if (typeof full !== "boolean") {
      selector = full;
      full = false;
    }
    var res = this.mimic(pool), skills = {}, e;
    for (var k in pool) {
      var e = pool[k];
      if (!selector.call(e, e, k, pool)) continue;
      if (full) mergeObjects(false, false, 0, [ skills, Object.getPrototypeOf(e) ]);
      res.push(e);
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
  if (typeof module === "object" && module && typeof module.exports === "object") module.exports = asSys; else if (typeof define === "function" && define.amd) {
    define(asSys);
    this.asSys = asSys;
  } else {
    this.asSys = this.a$ = asSys;
  }
})();