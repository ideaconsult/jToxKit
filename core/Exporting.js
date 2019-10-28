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
    useJson: null,     // whether we're in JSON mode or URL string one. Defaults to manager's one.
    servlet: null,      // the servlet to be used. Defaults to manager's one.
    exportDefinition: { // Definition of additional parameters
        extraParams: [],
        defaultFilter: null,
        fields: "",
        domain: "",
        fieldsRegExp: null
    },
    idField: 'id',  // The field to be considered ID when provided with id list.
    selectedIds: null, // The list of ids to be searched for.

    init: function (manager) {
        a$.pass(this, Exporting, "init", manager);

        this.manager = manager;
        this.servlet = this.servlet || manager.servlet || "select";

        if (this.useJson === null)
            this.useJson = manager.useJson;
        
        this.fqName = this.useJson ? "json.filter" : "fq";
    },

    makeParameter: function (par, name) {
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

    prepareFilters: function () {
        var params = [],
            fqPar = this.manager.getParameter(this.fqName);
        
        this.innerParams = [];

        for (var i = 0, vl = fqPar.length; i < vl; i++) {
            var par = fqPar[i];

            params.push(Solr.stringifyParameter(this.makeParameter(par, 'fq')));
            this.innerParams.push(Solr.stringifyValue(par).replace(/"|\\/g, "\\$&"));
        }

        params.push(Solr.stringifyParameter(this.makeParameter(this.manager.getParameter('q'))) || '*:*');
        return params;
    },
    
    prepareExport: function(server, auxParams) {
        var params = this.prepareFilters().concat(auxParams, this.exportDefinition.extraParams || []),
            inFilter = this.innerParams.length > 1 
                ? '(' + this.innerParams.join(' AND ') + ')' 
                : this.innerParams.length > 0 
                    ? this.innerParams[0] 
                    : this.exportDefinition.defaultFilter;

        if (!!this.selectedIds)
            params.push('fq=' + encodeURIComponent(this.idField + ":(" + this.selectedIds.join(" ") + ")"));

        // Fill the rest of the Solr parameters for the real Solr call.
        if (!!this.exportDefinition.extraParams)
            Array.prototype.push.apply(params, this.exportDefinition.extraParams);

        params.push('fl=' + encodeURIComponent(this.exportDefinition.fields.replace("{{filter}}", inFilter)));

        return this.exportURL = (server + this.servlet + "?" + params.join('&'));
    },

    doRequest: function (callback) {
        // TODO: ...
        this.manager.doRequest(callback);
    }
};

jT.Exporting = Exporting;
