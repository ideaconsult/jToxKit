/** jToxKit - chem-informatics multi toolkit.
 * Generic tools
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
 */

jT = a$.extend(jT, {
  templateRegExp: /\{\{([^}]+)\}\}/,
  /* formats a string, replacing {{number | property}} in it with the corresponding value in the arguments
   */
  formatString: function (str, info, def) {
    var pieces = str.split(jT.templateRegExp),
      pl = pieces.length,
      out = "";

    for (var i = 0;; ++i) {
      out += pieces[i++];
      if (i >= pl)
        break;

      var f = _.get(info, _.trim(pieces[i]), null);
      if (f != null) // i.e. we've found it.
        out += f;
      else if (typeof def === 'function') // not found, but we have default function.
        out += def(pieces[i]);
      else if (typeof def === 'string') // not found, but default string.
        out += def;
      else // we have nothing, so - put nothing.
        out += "";
    }

    return out;
  },

  nicifyNumber: function (num, prec) {
    if (num == null)
      return "";

    var maxPrec = Math.pow(10, prec || 9),
        rounded, prec;
    for (prec = 10; prec < maxPrec; prec *= 10) {
      rounded = Math.round(num * prec);
      if (Math.abs(rounded - num * prec) < .1)
        break;
    }

    return parseInt(rounded) / prec;
  },

  formatUnits: function (str) {
    // change the exponential
    return !str ? '' : str.toString()
      .replace(/(^|\W)u(\w)/g, '$1&#x00B5;$2')
      .replace(/\^\(?([\-\d]+)\)?/g, '<sup>$1</sup>')
      .replace(/ /g, "&nbsp;")
  },

	valueAndUnits: function (val, unit, prec) {
		var out = '';
		if (val != null) {
      val = typeof val === 'string' ? _.trim(val) : jT.nicifyNumber(val, prec).toString();
      out += val.replace(/ /g, "&nbsp;");
      out += jT.formatUnits(unit);
		}
		return out;
	},

  addParameter: function (url, param) {
    return url + (("&?".indexOf(url.charAt(url.length - 1)) == -1) ? (url.indexOf('?') > 0 ? "&" : "?") : '') + param;
  },

  removeParameter: function (url, param) {
    return url.replace(new RegExp('(.*\?.*)(' + param + '=[^\&\s$]*\&?)(.*)'), '$1$3');
  },

  parseURL: function (url) {
    var a = document.createElement('a');
    a.href = url;
    return {
      source: url,
      protocol: a.protocol.replace(':', ''),
      host: a.hostname,
      port: a.port,
      query: a.search,
      params: (function () {
        var ret = {},
          seg = a.search.replace(/^\?/, '').split('&'),
          len = seg.length,
          i = 0,
          s, v, arr;
        for (; i < len; i++) {
          if (!seg[i]) {
            continue;
          }
          s = seg[i].split('=');
          v = (s.length > 1) ? decodeURIComponent(s[1].replace(/\+/g, " ")) : '';
          if (s[0].indexOf('[]') == s[0].length - 2) {
            arr = ret[s[0].slice(0, -2)];
            if (arr === undefined)
              ret[s[0].slice(0, -2)] = [v];
            else
              arr.push(v);
          } else
            ret[s[0]] = v;
        }
        return ret;
      })(),
      file: (a.pathname.match(/\/([^\/?#]+)$/i) || [, ''])[1],
      hash: a.hash.replace('#', ''),
      path: a.pathname.replace(/^([^\/])/, '/$1'),
      relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [, ''])[1],
      segments: a.pathname.replace(/^\//, '').split('/')
    };
  },

  modifyURL: function (url, name, value) {
    var a = document.createElement('a'),
      str = !!value ? name + "=" + encodeURIComponent(value) : "",
      mbs, q;

    a.href = url;
    q = a.search;

    mbs = q.match(new RegExp(name + "=[\\S^&]+"))

    if (!!mbs)
      q = q.replace(mbs[0], str);
    else if (!str)
      return;
    else if (q.charAt(0) == '?')
      q = "?" + str;
    else
      q += (q.slice(-1) == "&" ? "" : "&") + str;

    a.search = q;
    return a.href;
  },

  /* Fix the baseUrl - ensure it has trailing slash
   */
  fixBaseUrl: function (url) {
    if (url && url.charAt(url.length - 1) != '/')
      url += '/';
    return url;
  },

  // form the "default" baseUrl if no other is supplied
  formBaseUrl: function (url) {
    var burl = url.match(/^((http[s]?|ftp):\/)?\/?([^:\/\s]+)(:\d+)?(\/\w+)/);
    if (burl)
      burl = burl[0] + '/';

    console.log("Deduced base URL: " + burl + " (from: " + url + ")");
    return burl;
  },

  copyToClipboard: function (text, prompt) {
    if (!prompt) {
      prompt = "Press Ctrl-C (Command-C) to copy and then Enter.";
    }
    window.prompt(prompt, text);
  },

  fireCallback: function (callback, self) {
    if (!$.isArray(callback))
      callback = [callback];

    var ret = true;
    for (var i = 0, cl = callback.length; i < cl; ++i) {
      var callone = callback[i];
      if (typeof callone != 'function')
        callone = window[callone];
      ret = (typeof callone == 'function') ? (callone.apply((self !== undefined && self != null) ? self : document, Array.prototype.slice.call(arguments, 2))) : undefined;
    }
    return ret;
  },

  activateDownload: function (aEl, blob, destName, autoRemove) {
    var url = URL.createObjectURL(blob),
      selfClick = false;

    if (!aEl) {
      aEl = document.createElement('a');
      selfClick = autoRemove = true;
    } else
      aEl.style.visibility = "visible";

    aEl.href = url;
    aEl.download = destName;

    if (autoRemove === true)
      aEl.addEventListener('click', function () {
        setTimeout(function () {
          if (aEl.parentElement)
            aEl.parentElement.removeChild(aEl);
          window.URL.revokeObjectURL(url);
        }, 0);
      });

    if (selfClick)
      aEl.click();
  },

  promiseXHR: function (ajax) {
    var keySetter = function (xhr, aux) {
      aux && Object.keys(aux).forEach(function (key) {
        xhr[key] = aux[key];
      });
    };

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();

      xhr.open(ajax.method || "GET", ajax.url, true);
      Object.keys(ajax.headers || {}).forEach(function (key) {
        xhr.setRequestHeader(key, ajax.headers[key]);
      });

      if (typeof ajax.dataType === 'string')
        xhr.setRequestHeader('Content-Type', ajax.dataType);

      keySetter(xhr, ajax.settings);
      keySetter(xhr, ajax.xhrFields);

      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4)
          return;

        // Process the response
        if ((xhr.status == 0 && !!xhr.response) || (xhr.status >= 200 && xhr.status < 300))
          resolve(xhr.response, xhr.statusText, xhr);
        else
          reject(xhr, xhr.statusText, xhr.responseText);
      };

      xhr.send(ajax.body || ajax.data);
    });
  },

  blobFromBase64: function (data64, mimeType) {
    return new Blob([data64], {
      type: mimeType
    });
  }
});
