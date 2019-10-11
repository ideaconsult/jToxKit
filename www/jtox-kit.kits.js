jToxKit.ui.templates['faceted-search-kit']  = 
"<div class=\"query-container\">" +
"<!-- left -->" +
"<div id=\"query\" class=\"query-left\">" +
"<div id=\"accordion-resizer\" class=\"ui-widget-content\">" +
"<div id=\"accordion\"></div>" +
"</div>" +
"</div>" +
"" +
"<!-- right -->" +
"<div id=\"result-tabs\" class=\"query-right\">" +
"<ul>" +
"<li><a href=\"#hits_tab\">Hits list</a></li>" +
"<li><a href=\"#basket_tab\">Selection</a></li>" +
"<li class=\"jtox-ds-export\"><a href=\"#export_tab\">Export</a></li>" +
"</ul>" +
"<div id=\"hits_tab\">" +
"<div class=\"row remove-bottom\">" +
"<ul class=\"tags remove-bottom\" id=\"selection\"></ul>" +
"<footer>" +
"<div id=\"sliders-controls\">" +
"<a href=\"#\" class=\"jtox-fadable command close\">Close</a>" +
"</div>" +
"<div id=\"sliders\"></div>" +
"</footer>" +
"</div>" +
"<div id=\"navigation\">" +
"<ul id=\"pager\"></ul>" +
"<div id=\"pager-header\"></div>" +
"</div>" +
"<div class=\"docs_wrapper\">" +
"<section id=\"docs\" class=\"item-list\"></section>" +
"</div>" +
"</div>" +
"<div id=\"basket_tab\">" +
"<section id=\"basket-docs\" class=\"item-list\"></section>" +
"<div style=\"padding-top: 70px;\"></div>" +
"</div>" +
"<div id=\"export_tab\">" +
"<form target=\"_blank\" method=\"post\">" +
"<input type=\"hidden\" name=\"search\"/>" +
"" +
"<h6>Select dataset to export</h6>" +
"<div id=\"export_dataset\">" +
"<input type=\"radio\" value=\"filtered\" name=\"export_dataset\" id=\"filtered_data\" checked=\"checked\"/>" +
"<label for=\"filtered_data\">Filtered entries</label>" +
"<input type=\"radio\" value=\"selected\" name=\"export_dataset\" id=\"selected_data\"/>" +
"<label for=\"selected_data\">Selected entries</label>" +
"</div>" +
"" +
"<h6>Select export type</h6>" +
"<div id=\"export_type\"></div>" +
"" +
"<h6>Select output format</h6>" +
"<input type=\"hidden\" name=\"export_format\" id=\"export_format\"/>" +
"<div class=\"data_formats\"></div>" +
"" +
"<br/>" +
"<button type=\"submit\" name=\"export_go\" data-prefix=\"Download\">?</button>" +
"<div class=\"ui-state-error ui-corner-all warning-message\" style=\"padding: 0 .7em;\"><p><span class=\"ui-icon ui-icon-alert\" style=\"float: left; margin-right: .3em;\"></span><strong>Warning:</strong>Please either add entries to the selection or specify a query</p></div>" +
"" +
"</form>" +
"</div>" +
"</div>" +
"" +
"<!-- query container -->" +
"</div>" +
""; // end of #faceted-search-kit 

jToxKit.ui.templates['faceted-search-templates']  = 
"" +
"<section id=\"result-item\">" +
"<article id=\"{{item_id}}\" class=\"item\">" +
"<header>{{title}}" +
"<a href=\"{{href}}\" title=\"{{href_title}}\" target=\"{{href_target}}\"><span class=\"ui-icon ui-icon-extlink\" style=\"float:right;margin:0;\"></span></a>" +
"</header>" +
"<a href=\"{{link}}\" title=\"{{link}}\" class=\"avatar\" target=\"_blank\"><img jt-src=\"{{logo}}\"/></a>" +
"<div class=\"composition\">{{composition}}</div>" +
"{{summary}}" +
"<footer class=\"links\">" +
"{{footer}}" +
"<a href=\"#\" class=\"add jtox-fadable command\">Add to Selection</a>" +
"<a href=\"#\" class=\"remove jtox-fadable command\">Remove from Selection</a>" +
"<a href=\"#\" class=\"none jtox-fadable command\">Already added</a>" +
"</footer>" +
"</article>" +
"</section>" +
"" +
"<div id=\"summary-item\">" +
"<div class=\"one-summary\">" +
"<span class=\"topic\">{{topic}}:</span>" +
"<span class=\"value\">{{content}}</span>" +
"</div>" +
"</div>" +
"" +
"<div id=\"tag-facet\">" +
"<ul class=\"tags tag-group folded\"></ul>" +
"</div>" +
"" +
"<div id=\"tab-topcategory\">" +
"<h3 id=\"{{id}}_header\" class=\"nested-tab\">{{title}}</h3>" +
"<div id=\"{{id}}\" class=\"widget-content widget-root\">" +
"<div>" +
"<input type=\"text\" placeholder=\"Filter_\" class=\"widget-filter\"/>" +
"<input type=\"button\" class=\"switcher\" value=\"OR\"/>" +
"</div>" +
"<ul class=\"widget-content tags remove-bottom\" data-color=\"{{color}}\"></ul>" +
"</div>" +
"</div>" +
"" +
"<div id=\"slider-one\">" +
"<input type=\"hidden\"/>" +
"</div>" +
"" +
"<div id=\"export-type\">" +
"<input type=\"radio\" value=\"{{fields}}\" {{selected}} name=\"export_type\" id=\"{{name}}\"/>" +
"<label for=\"{{name}}\">{{name}}</label>" +
"</div>" +
"" +
"<div id=\"export-format\">" +
"<div class=\"jtox-inline jtox-ds-download jtox-fadable\">" +
"<a target=\"_blank\" data-name=\"{{name}}\" data-mime=\"{{mime}}\" href=\"#\"><img class=\"borderless\" jt-src=\"{{icon}}\"/></a>" +
"</div>" +
"</div>" +
""; // end of #faceted-search-templates 

