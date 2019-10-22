/** jToxKit - chem-informatics multi toolkit.
  * Generic tools
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2017, IDEAConsult Ltd. All rights reserved.
  */
  
jT.ui = {
	/* formats a string, replacing {{number | property}} in it with the corresponding value in the arguments
  */
  formatString: function(str, info, def) {
		var pieces = str.split(/\{\{([^}]+)\}\}/),
				pl = pieces.length,
				out = "";
		
		for (var i = 0;; ++i) {
			out += pieces[i++];
			if (i >= pl)
				break;
				
			var f = a$.path(info, pieces[i]);
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
  
  formatNumber: function (num, prec) {
    if (prec < 1)
      prec = parseInt(1.0 / prec);
    return Math.round(num * prec) / prec;
  },
  
	formatUnits: function (str) {
		// change the exponential
		return str.toString()
			.replace(/(^|\W)u(\w)/g, '$1&#x00B5;$2')
			.replace(/\^\(?([\-\d]+)\)?/g, '<sup>$1</sup>')
			.replace(/ /g, "&nbsp;")
	},
  
  addParameter: function (url, param) {
    return url + (("&?".indexOf(url.charAt(url.length - 1)) == -1) ?  (url.indexOf('?') > 0 ? "&" : "?") : '') + param;
  },

  removeParameter: function (url, param) {
    return url.replace(new RegExp('(.*\?.*)(' + param + '=[^\&\s$]*\&?)(.*)'), '$1$3');
  },

  parseURL: function(url) {
    var a =  document.createElement('a');
    a.href = url;
    return {
      source: url,
      protocol: a.protocol.replace(':',''),
      host: a.hostname,
      port: a.port,
      query: a.search,
      params: (function(){
        var ret = {},
        seg = a.search.replace(/^\?/,'').split('&'),
        len = seg.length, i = 0, s, v, arr;
        for (;i<len;i++) {
          if (!seg[i]) { continue; }
          s = seg[i].split('=');
          v = (s.length>1)?decodeURIComponent(s[1].replace(/\+/g,  " ")):'';
          if (s[0].indexOf('[]') == s[0].length - 2) {
            arr = ret[s[0].slice(0, -2)];
            if (arr === undefined)
              ret[s[0].slice(0, -2)] = [v];
            else
              arr.push(v);
          }
          else
            ret[s[0]] = v;
        }
        return ret;
      })(),
      file: (a.pathname.match(/\/([^\/?#]+)$/i) || [,''])[1],
      hash: a.hash.replace('#',''),
      path: a.pathname.replace(/^([^\/])/,'/$1'),
      relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [,''])[1],
      segments: a.pathname.replace(/^\//,'').split('/')
    };
  },
  
  modifyURL: function (url, name, value) {
    var a =  document.createElement('a'),
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

  escapeHTML: function(str){
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, function(m) { return map[m]; });
  },

	activateDownload: function(aEl, blob, destName, title, autoRemove) {
		var url = URL.createObjectURL(blob);
	
		aEl.style.visibility = "visible";
		aEl.href = url;
    aEl.download = destName;
    aEl.innerHTML = title;

    if (autoRemove === true)
      aEl.addEventListener('click', function () {
        setTimeout(function () {
          aEl.parentNode.removeChild(aEl);
          window.URL.revokeObjectURL(url);
        }, 0);
      });	
	},

	blobFromBase64: function (data64, mimeType) {
		return new Blob([data64], { type: mimeType });
	}
};
