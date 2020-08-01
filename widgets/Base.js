/** jToxKit - chem-informatics multi-tool-kit.
 * Base for widgets and UI-related stuff
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2020, IDEAConsult Ltd. All rights reserved.
 */

(function (jT, a$, $) {
    // Define more tools here
    jT.ui = $.extend(jT.ui, {
        templates: {},
        /** Gets a template with given selector and replaces the designated
         * {{placeholders}} from the provided `info`.
         */
        fillHtml: function (html, info, def) {
            return $(jT.formatString(html, info, def));
        },

        bakeTemplate: function (html, info, def) {
            var all$ = $(html);
            $('*', all$[0]).each(function (i, el) {
                var liveEl = null,
                    liveData = {};

                var allAttrs = el.attributes;
                for (var i = 0;i < allAttrs.length; ++i) {
                    if (allAttrs[i].specified && allAttrs[i].value.match(jT.templateRegExp)) {
                        liveData[allAttrs[i].name]  = allAttrs[i].value;
                        allAttrs[i].value = jT.formatString(allAttrs[i].value, info, def);
                    }
                }
                if (el.childNodes.length == 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
                    el = el.childNodes[0];

                    if (el.textContent.match(jT.templateRegExp)) {
                        liveEl = $(el).parent();
                        liveData[''] = el.textContent;
                        el.textContent = jT.formatString(el.textContent, info, def);
                    }                    
                }

                if (liveEl != null)
                    liveEl.addClass('jtox-live-data').data('jtox-live-data', liveData);
            });

            return all$;
        },

        putTemplate: function (id, info, root) {
            var html = jT.ui.bakeTemplate(jT.ui.templates[id], info);
            return !root ? html : $(root).append(html);
        },

        updateTree: function (root, info, def) {
            $('.jtox-live-data', root).each(function (i, el) {
                $.each($(el).data('jtox-live-data'), function (k, v) {
                    v = jT.formatString(v, info, def)
                    if (k === '')
                        el.innerHTML = v;
                    else
                        el.attributes[k] = v;
                });
            });
        },

        fillTemplate: function (id, info, def) {
            return jT.ui.fillHtml(jT.ui.templates[id], info, def);
        },

        updateCounter: function (str, count, total) {
            var re = null;
            var add = '';
            if (count == null)
                count = 0;
            if (total == null) {
                re = /\(([\d\?]+)\)$/;
                add = '' + count;
            } else {
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

        shortenedData: function (content, message, data) {
            var res = '';

            if (data == null)
                data = content;
            if (data.toString().length <= 5) {
                res += content;
            } else {
                res += '<div class="shortened">' + content + '</div>';
                if (message != null)
                    res += '<span class="ui-icon ui-icon-copy" title="' + message + '" data-uuid="' + data + '"></span>';
            }
            return res;
        },
        linkedData: function (content, message, data) {
            var res = '';

            if (data == null)
                data = content;
            if (data.toString().length <= 5)
                res += content;
            else {
                if (message != null) {
                    res += res += '<div title="' + message + '">' + content + '</div>';
                } else res += '<div >' + content + '</div>';
            }
            return res;
        },
        changeTabsIds: function (root, suffix) {
            $('ul li a', root).each(function () {
                var id = $(this).attr('href').substr(1),
                    el = document.getElementById(id);
                id += suffix;
                el.id = id;
                $(this).attr('href', '#' + id);
            })
        },

        addTab: function (root, name, id, content) {
            // first try to see if there is same already...
            if (document.getElementById(id) != null)
                return;

            // first, create and add li/a element
            var a$ = $('<a>', { href: '#' + id }).html(name);
            $('ul', root[0]).append($('<li>').append(a$));

            // then proceed with the panel, itself...
            if (typeof content === 'function')
                content = $(content(root[0]));
            else if (typeof content === 'string')
                content = $(content);

            content.attr('id', id);
            root.append(content).tabs('refresh');
            return { tab: a$, content: content };
        },

        renderRange: function (data, unit, type, prefix) {
            var out = "";
            if (typeof data == 'string' || typeof data == 'number') {
                out += (type != 'display') ? data : ((!!prefix ? prefix + "&nbsp;=&nbsp;" : '') + jT.valueAndUnits(data, unit));
            } else if (typeof data == 'object' && data != null) {
                var loValue = _.trim(data.loValue),
                    upValue = _.trim(data.upValue);

                if (String(loValue) != '' && String(upValue) != '' && !!data.upQualifier && data.loQualifier != '=') {
                    if (!!prefix) {
                        out += prefix + "&nbsp;=&nbsp;";
                    }
                    out += (data.loQualifier == ">=") ? "[" : "(";
                    out += loValue + ", " + upValue;
                    out += (data.upQualifier == "<=") ? "]" : ") ";
                } else { // either of them is non-undefined

                    var fnFormat = function (p, q, v) {
                        var o = '';
                        if (!!p) {
                            o += p + ' ';
                        }
                        if (!!q) {
                            o += (!!p || q != '=') ? (q + ' ') : '';
                        }
                        return o + v;
                    };

                    if (String(loValue) != '') {
                        out += fnFormat(prefix, data.loQualifier || '=', loValue);
                    } else if (String(upValue) != '') {
                        out += fnFormat(prefix, data.upQualifier || '=', upValue);
                    } else {
                        if (!!prefix) {
                            out += prefix;
                        } else {
                            out += type == 'display' ? '-' : '';
                        }
                    }
                }

                out = out.replace(/ /g, "&nbsp;");
                if (type == 'display') {
                    unit = _.trim(data.unit || unit);
                    if (!!unit) {
                        out += '&nbsp;<span class="units">' + unit.replace(/ /g, "&nbsp;") + '</span>';
                    }
                }
            } else {
                out += '-';
            }
            return out;
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
import "CurrentSearchWidget";
import "Switching";
import "Running";
import "TableTools";
import "Ambit";

})(jToxKit, asSys, jQuery);