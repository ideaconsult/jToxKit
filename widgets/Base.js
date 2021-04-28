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

        bakeTemplate: function (html, info, formatters) {
            var all$ = $(html);

            $('*', all$).each(function (i, el) {
                var liveData = null;

                // first, deal with the value field
                if (el.value && el.value.match(jT.templateRegExp)) {
                    liveData = { 'value': el.value };
                    el.value = jT.formatString(el.value, info, formatters);
                }

                // then, jump to deal with the attributes
                var allAttrs = el.attributes;
                for (var i = 0;i < allAttrs.length; ++i) {
                    if (allAttrs[i].specified && allAttrs[i].value.match(jT.templateRegExp)) {
                        if (liveData == null)
                            liveData = {};
                        liveData[allAttrs[i].name] = allAttrs[i].value;
                        allAttrs[i].value = jT.formatString(allAttrs[i].value, info, formatters);
                    }
                }

                // finally, go to text subnodes
                if (el.childNodes.length == 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
                    var subEl = el.childNodes[0];

                    if (subEl.textContent.match(jT.templateRegExp)) {
                        if (liveData == null)
                            liveData = {};
                        liveData[''] = subEl.textContent;
                        subEl.textContent = jT.formatString(subEl.textContent, info, formatters);
                    }                    
                }

                if (liveData != null)
                    $(el).addClass('jtox-live-data').data('jtox-live-data', liveData);
            });

            return all$;
        },

        putTemplate: function (id, info, root) {
            var html = jT.ui.bakeTemplate(jT.ui.templates[id], info);
            return !root ? html : $(html).appendTo(root);
        },

        updateTree: function (root, info, formatters) {
            $('.jtox-live-data', root).each(function (i, el) {
                $.each($(el).data('jtox-live-data'), function (k, v) {
                    v = jT.formatString(v, info, formatters)
                    if (k === '')
                        el.innerHTML = v;
                    else if (k === 'value')
                        el.value = v;
                    else
                        el.attributes[k] = v;
                });
            });
        },

        fillHtml: function (id, info, formatters) {
            return jT.formatString(jT.ui.templates[id], info, formatters);
        },

        getTemplate: function (id, info, formatters) {
            return $(jT.ui.fillHtml(id, info, formatters));
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

        installHandlers: function (kit, root, defHandlers) {
            if (!root)
                root = kit.rootElement;
            if (!defHandlers)
                defHandlers = kit;
    
            $('.jtox-handler', root).each(function () {
                var thi$ = $(this),
                    name = thi$.data('handler'),
                    handler = _.get(kit.settings, [ 'handlers', name ], null) || defHandlers[name] || window[name];
    
                if (!handler) {
                    console.warn("jToxQuery: referring unknown handler: '" + name + "'");
                    return;
                }

                // Build the proper handler, taking into account if we want debouncing...
                var eventHnd = _.bind(handler, kit),
                    eventDelay = thi$.data('handlerDelay'),
                    eventName = thi$.data('handlerEvent');
                if (eventDelay != null)
                    eventHnd = _.debounce(eventHnd, parseInt(eventDelay));
                
                // Now, attach the handler, in the proper way
                if (eventName != null)
                    thi$.on(eventName, eventHnd);
                else if (this.tagName == "INPUT" || this.tagName == "SELECT" || this.tagName == "TEXTAREA")
                    thi$.on('change', eventHnd).on('keydown', jT.ui.enterBlur);
                else // all the rest respond on click
                    thi$.on('click', eventHnd);
            });
        },

        shortenedData: function (content, message, data) {
            var res = '';

            if (data == null)
                data = content;
            if (data.toString().length <= 5) {
                res += content;
            } else {
                res += '<div class="shortened"><span>' + content + '</div><i class="icon fa fa-copy fa-action"';
                if (message != null)
                    res +=  ' title="' + message + '"';
                res += ' data-uuid="' + data + '"></i>';
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

        addTab: function (root, name, id, content) {
            // first try to see if there is same already...
            if (document.getElementById(id) != null) {
                console.warn('jToxKit: Trying to add a tab [' + name + '] with existing id:'  + id);
                return;
            }

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

        renderValue: function (data, unit, type, prefix) {
            var out = "";
            if (typeof data == 'string' || typeof data == 'number') {
                out += (type != 'display') ? data : ((!!prefix ? prefix + "&nbsp;=&nbsp;" : '') + jT.valueAndUnits(data, unit));
            } else if (typeof data == 'object' && data != null) {
                var loValue = _.trim(data.loValue),
                    upValue = _.trim(data.upValue),
                    tValue = _.trim(data.textValue);

                if (tValue != '') {
                    if (!!prefix)
                        out += prefix + "&nbsp;=&nbsp;";

                    out += tValue;
                } else if (String(loValue) != '' && String(upValue) != '' && !!data.upQualifier && data.loQualifier != '=') {
                    if (!!prefix)
                        out += prefix + "&nbsp;=&nbsp;";

                    out += (data.loQualifier == ">=") ? "[" : "(";
                    out += loValue + ", " + upValue;
                    out += (data.upQualifier == "<=") ? "]" : ") ";
                } else { // either of them is non-undefined

                    var fnFormat = function (p, q, v) {
                        var o = '';
                        if (!!p)
                            o += p + ' ';
                        if (!!q)
                            o += (!!p || q != '=') ? (q + ' ') : '';
                        return o + v;
                    };

                    if (String(loValue) != '')
                        out += fnFormat(prefix, data.loQualifier || '=', loValue);
                    else if (String(upValue) != '')
                        out += fnFormat(prefix, data.upQualifier || '=', upValue);
                     else  if (!!prefix)
                        out += prefix;
                    else
                        out += type == 'display' ? '-' : '';
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
        },

        putStars: function (kit, stars, title) {
            if (!kit.settings.shortStars) {
                var res = '<div title="' + title + '">';
                for (var i = 0;i < kit.settings.maxStars;++i) {
                    res += '<span class="fa fa-star fa-action jtox-inline';
                    if (i >= stars)
                        res += ' transparent';
                    res += '"></span>';
                }
                
                return res + '</div>';
            }
            else { // i.e. short version
                return '<span class="fa fa-action fa-star jtox-inline" title="' + title + '"></span>' + stars;
            }
        },

        renderRelation: function (data, type, full) {
            if (type != 'display')
                return _.map(data, 'relation').join(',');

            var res = '';
            for (var i = 0, il = data.length; i < il; ++i)
                res += '<span>' + data[i].relation.substring(4).toLowerCase() + '</span>' + 
                    jT.ui.fillHtml('info-ball', { href: full.URI + '/composition', title: data[i].compositionName + '(' + data[i].compositionUUID + ')' });
            return res;
        },

        rebindRenderers: function (kit, features, inplace) {
            var newFeats = {};

            for (var fId in features) {
                var fDef = features[fId];
                if (typeof fDef.render !== 'function')
                    continue;
                else if (inplace)
                    fDef.render = _.bind(fDef.render, kit);
                else
                    newFeats[fId] = _.defaults({ render: _.bind(fDef.render, kit) }, fDef);
            }

            return inplace ? features : _.defaults(newFeats, features);
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
import "HelpWidget";
import "Switching";
import "Running";
import "TableTools";
import "Ambit";

})(jToxKit, asSys, jQuery);