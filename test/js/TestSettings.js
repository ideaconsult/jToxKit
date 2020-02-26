function enumDeepFacets(facetNames, facet, handler) {
    var handleMissing = function (facet) {
        if (!facet)
        return [];
        
        if (facet.missing != null && facet.missing.count > 0) {
            facet.missing.val = "";
            facet.buckets.unshift(facet.missing);
        }
        return facet.buckets;
    },
    recurseFacets = function (facet, names) {
        if (names.length >= facetNames.length) {
            handler(names, facet);
            return;
        }
        
        var idx = names.length,
        buckets = handleMissing(facet[facetNames[idx]]);
        
        for (var i = 0; i < buckets.length; ++i)
        recurseFacets(buckets[i], names.concat([buckets[i].val]));
    };
    
    recurseFacets(facet, []);
}

function buildEndpointMap(data) {
    var self = this;
    
    enumDeepFacets(self.facetNames, data.facets, function (names) {
        self.endpointMap.push(names.join(":"));
    });
};

function getFacetCounts(facetRoot) {
    var self = this,
    countArr = new Array(self.endpointMap.length);
    
    enumDeepFacets(self.facetNames, facetRoot, function (names, facet) {
        countArr[self.endpointMap.indexOf(names.join(":"))] = facet.count;
    });
    
    return countArr;
}

var fullCategoryFacets = {
    "topcategory": {
        "field": "topcategory_s",
        "limit": -1,
        "mincount": 1,
        "type": "terms",
        "missing": true,
        "facet": {
            "endpointcategory": {
                "field": "endpointcategory_s",
                "limit": -1,
                "mincount": 1,
                "type": "terms",
                "missing": true,
                "facet": {
                    "method": {
                        "field": "E.method_s",
                        "limit": -1,
                        "mincount": 1,
                        "type": "terms",
                        "missing": true,
                        "facet": {
                            "effectendpoint": {
                                "field": "effectendpoint_s",
                                "limit": -1,
                                "mincount": 1,
                                "type": "terms",
                                "missing": true
                            }
                        }
                    }
                }
            }
        }
    }
},
overallNumbersReport = {
    template: "templates/template-overall.xlsx",
    defaultFilter: "type_s:study",
    idField: "s_uuid_hs",
    inheritDomain: false,
    facetNames: ["topcategory", "endpointcategory", "method", "effectendpoint"],
    endpointMap: [],
    ownersMap: [],
    onData: buildEndpointMap,
    callbacksMap: { 
        getCounts: getFacetCounts 
    },
    extraParams: [{
        name: "fl",
        value: ""
    }, {
        name: "echoParams",
        value: "none"
    }, {
        name: 'wt',
        value: "json"
    }, {
        name: 'rows',
        value: 0
    }, {
        name: 'q',
        value: "type_s:study"
    }, {
        name: "json.facet",
        value: _.merge({		
            "publicname": {
                "field": "publicname_s",
                "limit": -1,
                "mincount": 1,
                "type": "terms",
                "facet": fullCategoryFacets
            }
        }, fullCategoryFacets)
    }, {
        name: "json.facet.topcategory.domain.filter",
        value: "{{filter}}"
    }, {
        name: "json.facet.publicname.domain.filter",
        value: "{{filter}}"
    }]
};


var	Settings = {
    // I suggest we keep these here, commented.
    ambitUrl: 'http://localhost:8080/ambit2/',
    solrUrl: 'http://127.0.0.1:8983/solr/nanoreg1/',
    
    multipleSelection: true,
    //OR -> aggregateFacets = true ; AND -> aggregateFacets = false
    aggregateFacets: false,
    keepAllFacets: false,
    imagesRoot: "images/",
    ajaxSettings: {
        crossDomain: true,
        xhrFields: {
            withCredentials: true
        }
    },
    
    listingFields: [ 
        "dbtag_hss",    	
        "name:name_hs", 
        "publicname:publicname_hs", 
        "owner_name:owner_name_hs",
        "substanceType:substanceType_hs",
        "s_uuid:s_uuid_hs",
        "content:content_hss",
        "SUMMARY.*"
    ],
    tagDbs: {
        "ENM": {
            "server": "https://data.enanomapper.net/",
            "icon": "images/materials/enanomapper.png"
        },
        "NNRG": {
            "server": "https://apps.ideaconsult.net/nanoreg1/",
            "icon": "images/materials/nanoreg.png"
        },
        "MRNA": {
            "server": "https://apps.ideaconsult.net/marina/",
            "icon": "images/materials/external.png"
        },
        "NTST": {
            "server": "https://apps.ideaconsult.net/nanotest/",
            "icon": "images/materials/nanotest.jpg"
        },
        "NGTX": {
            "server": "https://apps.ideaconsult.net/nanogenotox/",
            "icon": "images/materials/nanogenotox.png"
        },
        "ENPR": {
            "server": "https://apps.ideaconsult.net/enpra/",
            "icon": "images/materials/enpra.png"
        },
        "GRCS": {
            "server": "https://apps.ideaconsult.net/gracious/",
            "icon": "images/materials/gracious.png"
        },
        "CLBR": {
            "server": "https://apps.ideaconsult.net/calibrate/",
            "icon": "images/materials/calibrate.png"
        },
        "NRG2": {
            "server": "https://apps.ideaconsult.net/nanoreg2/",
            "icon": "images/materials/nanoreg2.png"
        },
        "NOMX": {
            "server": "https://apps.ideaconsult.net/nanoomics/",
            "icon": "images/materials/external.png"
        },
        "SNWK": {
            "server": "https://apps.ideaconsult.net/sanowork/",
            "icon": "images/materials/sanowork.jpg"
        },
        "RGNE": {
            "server": "https://apps.ideaconsult.net/riskgone/",
            "icon": "images/materials/riskgone.png"
        },
        "CNLB": {
            "server": "https://apps.ideaconsult.net/marina/",
            "icon": "images/materials/external.png"
        }
    },
    summaryRenderers: {
        "SIZE": function (val, topic) {
            if (!Array.isArray(val) || val.length == 1)
            return val;
            
            var min = null, 
            max = null, 
            pattern = null,
            re = /([+-]?[0-9]*[.,]?[0-9]+)/;
            
            for (var i = 0;i < val.length; ++i) {
                var v, m = val[i].match(re);
                
                if (!m) 
                continue;
                if (!pattern)
                pattern = val[i];
                
                v = parseFloat(m[1]);
                if (min == null)
                max = min = v;
                else if (v > max)
                max = v;
                else if (v < min)
                min = v;
            }
            
            return { 'topic': topic.toLowerCase(), 'content' : pattern.replace(re, min + "&nbsp;&hellip;&nbsp;" + max) };
        }
    },
    pivot: [ 
        { id: "topcategory", field: "topcategory_s", disabled: true, facet: { domain: { blockChildren: "type_s:substance" } } },
        { id: "endpointcategory", field: "endpointcategory_s", color: "blue" },
        { id: "effectendpoint", field: "effectendpoint_s", color: "green", ranging: true }, 
        { id: "unit", field: "unit_s", disabled: true, ranging: true }
    ],
    facets: [ 
        { id: 'owner_name', field: "owner_name_s", title: "Projects", color: "orange", facet: { mincount: 1 } }, 
        { id: 'reference_owner', field: "reference_owner_s", title: "Study providers", color: "green", facet: { mincount: 1 } }, 
        { id: 'substanceType', field: "substanceType_s", title: "Nanomaterial type", facet: { mincount: 1 }, color: "green" },
        { id: 'nm_name', field: "publicname_s", title: "Nanomaterial", color: "green", facet: { mincount: 451 } },     		
        
        { id: 'protocol', field: "guidance_s", title: "Protocols", color: "blue", facet: { mincount: 1 } },
        { id: 'protocol_annotation', field: "guidance_synonym_ss", title: "Protocol annotation", color: "blue", facet: { mincount: 10 } },
        
        { id: 'method', field: "E.method_s", title: "Method", color: "blue", facet: { mincount: 10 } } ,
        { id: 'method_annotation', field: "E.method_synonym_ss", title: "Method annotation", color: "blue", facet: { mincount: 500 } } ,
        { id: 'cell', field: "E.cell_type_s", title: "Cell", color: "blue", facet: { mincount: 1 } },
        
        { id: 'effectendpoint', field: "effectendpoint_s", title: "Endpoint", color: "orange", facet: { mincount: 100 } },     		
        { id: 'synonyms', field: "effectendpoint_synonym_ss", title: "Endpoint annotation", color: "orange", facet: { mincount: 100 } },
        
        { id: 'reference_year', field: "reference_year_s", title: "Experiment year", color: "green", facet: { mincount: 2 } },
        { id: 'reference', field: "reference_s", title: "References", color: "green",  facet: { mincount: 2 } }, 
        
        { id: 'release', field: "updated_s", title: "Release", color: "green", facet: { mincount: 1 } } 
    ],
    exportTypes: [
        { 
            name: "Study results",
            extraParams: [{
                name: 'fl',
                value: "*,[child parentFilter=type_s:substance childFilter=\"({{filter-escaped}}) OR type_s:params OR type_s:conditions\" limit=10000]"
            }],
            defaultFilter:"type_s:study",
            formats: "json,tsv,xml",
            idField: "s_uuid_hs"
        },       
        { 
            name: "Materials and all study results",
            extraParams: [{
                name: 'fl',
                value: "*,[child parentFilter=type_s:substance childFilter=\"type_s:study OR type_s:params OR type_s:conditions\" limit=10000]"
            }],
            defaultFilter:"type_s:study",
            formats: "json,csv,tsv,xml",
            idField: "s_uuid_hs"
        }, 
        { 
            name: "Material identifiers",
            extraParams: [{
                name: 'fl',
                value: "s_uuid_hs:s_uuid,dbtag_hss:dbtag,name_hs:name,publicname_hs:publicname,owner_name_hs:owner_name,substanceType_hs:substanceType,substance_annotation_hss:substance_annotation,[child parentFilter=type_s:substance childFilter=type_s:identifier limit=1000]"
            }],
            formats: "json,csv,xml",
            idField: "s_uuid_hs"
        }, { 
            name: "Material composition",
            extraParams: [{
                name: 'fl',
                value: "s_uuid_hs:s_uuid,dbtag_hss:dbtag,name_hs:name,publicname_hs:publicname,owner_name_hs:owner_name,substanceType_hs:substanceType,substance_annotation_hss:substance_annotation,[child parentFilter=type_s:substance childFilter=\"type_s:composition OR type_s:identifier\" limit=1000]"
            }],
            formats: "json,csv,xml",
            idField: "s_uuid_hs"
        }
    ],
    exportFormats: [
        { mime: "application/json", name:"json", icon: "images/types/json64.png", server: 'solrUrl'},
        { mime: "text/csv", name:"csv", icon: "images/types/csv64.png", server: 'solrUrl'},
        { mime: "text/tsv", name:"tsv", icon: "images/types/txt64.png", server: 'solrUrl'},
        { mime: "text/xml", name:"xml", icon: "images/types/xml.png", server: 'solrUrl'}
        
    ],      
    exportMaxRows: 999999,
    summaryReports: [
        {
            id: "number-of_datapoints-material-on-rows",
            name: "Summary report: Number of data points - materials on rows",
            definition: overallNumbersReport
        },        
    ],
    savedQueries: [
        { 
            id: "pchem-all",
            title: "P-Chem",
            description: "Physcicochemical studies",
            filters: [{ 
                faceter: "studies",
                value: "topcategory:P-CHEM"
            }]
        }
    ]
};
