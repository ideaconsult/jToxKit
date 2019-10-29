/** jToxKit - chem-informatics multi-tool-kit.
  *
  * Author: Ivan (Jonan) Georgiev
  * Copyright © 2019, IDEAConsult Ltd. All rights reserved.
  */

 function Exporting(settings) {
    a$.extend(true, this, a$.common(settings, this));

    this.manager = null;
};

Exporting.prototype = {
    __expects: [ "addParameter", "prepareQuery" ],
    useJson: false,     // whether we're in JSON mode or URL string one.
    expectJson: false,  // what is the provided manager's mode.
    servlet: null,      // the servlet to be used. Defaults to manager's one.
    exportDefinition: { // Definition of additional parameters
        extraParams: [],
        defaultFilter: null,
        domain: "",
        fieldsRegExp: null
    },
    idField: 'id',  // The field to be considered ID when provided with id list.

    init: function (manager) {
        a$.pass(this, Exporting, "init", manager);

        this.manager = manager;
        this.servlet = this.servlet || manager.servlet || "select";
        this.fqName = this.useJson ? "json.filter" : "fq";
    },

    transformParameter: function (par, name) {
        var np = {
            value: par.value,
            name: name || par.name
        };

        // Check if we have a different level and the field in the filter is subject to parenting.
        if (par.domain && par.domain.type == 'parent') {
            if (!this.exportDefinition.domain)
                np.domain = par.domain;
            else if (!par.value || !!par.value.match(this.exportDefinition.fieldsRegExp))
                np.domain = this.exportDefinition.domain;
        }

        return np;
    },

    prepareFilters: function (selectedIds) {
        var innerParams = [],
            fqPar = this.manager.getParameter(this.expectJson ? "json.filter" : "fq");

        for (var i = 0, vl = fqPar.length; i < vl; i++) {
            var par = fqPar[i];

            this.addParameter(this.transformParameter(par, this.fqName));
            innerParams.push(Solr.stringifyValue(par).replace(/"|\\/g, "\\$&"));
        }

        this.addParameter(this.transformParameter(this.manager.getParameter('q')));

        if (!!selectedIds)
            this.addParameter(this.fqName, this.idField + ":(" + selectedIds.join(" ") + ")");

        return innerParams;
    },
    
    prepareExport: function(auxParams, selectedIds) {
        var innerParams = this.prepareFilters(selectedIds),
            inFilter = innerParams.length > 1 
                ? '(' + innerParams.join(' AND ') + ')' 
                : innerParams.length > 0 
                    ? innerParams[0] 
                    : this.exportDefinition.defaultFilter;
            
        auxParams = (auxParams || []).concat(this.exportDefinition.extraParams || []);
        for (var i = 0, pl = auxParams.length; i < pl; ++i) {
            var np = this.transformParameter(auxParams[i]);
            
            if (typeof np.value === 'string')
                np.value = np.value.replace("{{filter}}", inFilter);

            this.addParameter(np);
        }

        return this; // For chaining.
    },

    getAjax: function (serverUrl, ajaxSettings) {
        var urlPrefix = serverUrl + this.servlet,
            settings = a$.extend({}, this.manager.ajaxSettings, ajaxSettings, this.prepareQuery());

        if (urlPrefix.indexOf('?') > 0 && settings.url && settings.url.startsWith('?'))
            settings.url = '&' + settings.url.substr(1);
        
        settings.url =  urlPrefix + (settings.url || "");
    
        return settings;
    }
};

jT.Exporting = Exporting;
