var	Settings = {
      ambitUrl: 'http://localhost:8080/ambit2/',
      solrUrl: 'http://127.0.0.1:8983/solr/nanoreg1/',
      multipleSelection: true,
      keepAllFacets: true,
      aggregateFacets: true,
      imagesRoot: "../images",

    	listingFields: [ 
        "name:name_hs", 
        "publicname:publicname_hs", 
        "owner_name:owner_name_hs",
        "substanceType:substanceType_hs",
        "s_uuid:s_uuid_hs",
        "content:content_hss",
        "SUMMARY.*"
      ],
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
    		{ id: 'owner_name', field: "reference_owner_s", title: "Data sources", color: "green", facet: { mincount: 1 } }, 
  			{ id: 'substanceType', field: "substanceType_s", title: "Nanomaterial type", facet: { mincount: 1 } },
  			    		
    		{ id: 'cell', field: "E.cell_type_s", title: "Cell", color: "green", facet: { mincount: 1 } },
    		{ id: 'species', field: "Species_s", title: "Species", color: "blue", facet: { mincount: 2 } }, 
	  		{ id: 'interpretation', field: "MEDIUM_s", title: "Medium", color: "green", facet: { mincount: 1 } },
  		  { id: 'dprotocol', field: "Dispersion protocol_s", title: "Dispersion protocol", color: "green", facet: { mincount: 1 } }, 
    		{ id: 'reference_year', field: "reference_year_s", title: "Experiment year", color: "green", facet: { mincount: 1 } },
    		{ id: 'reference', field: "reference_s", title: "References", facet: { mincount: 2 } }, 
    		{ id: 'route', field: "E.exposure_route_s", title: "Exposure route", color: "green", facet: { mincount: 1 } }, 
  			{ id: 'protocol', field: "guidance_s", title: "Protocols", color: "blue", facet: { mincount: 1 } },
				{ id: 'method', field: "E.method_s", title: "Method", color: "green", facet: { mincount: 1 } } 
    	],
      exportTypes: [
        { 
          name: "Material, composition and study",
          defaultFilter:"type_s:study",
          formats: "json,csv,tsv,xslx,rdf,json-ld,isa-json",
          extraParams: [{ 
            name: 'fl', 
            value: "substance_uuid:s_uuid_hs,name:name_hs,publicname:publicname_hs,supplier:owner_name_hs,substanceType:substanceType_hs,[child parentFilter=type_s:substance childFilter=\"{{filter}} OR type_s:composition\" limit=10000]"
          }]
        }, { 
          name: "Material identifiers",
          formats: "json,csv,tsv",
          extraParams: [{
            name: 'fl',
            value: "substance_uuid:s_uuid_hs,name:name_hs,publicname:publicname_hs,supplier:owner_name_hs,substanceType:substanceType_hs" 
          }]
        }, { 
          name: "Material composition",
          formats: "json,csv,tsv",
          extraParams: [{
            name: 'fl',
            value: "substance_uuid:s_uuid_hs,[child parentFilter=type_s:substance childFilter=type_s:composition limit=1000]" 
          }]
        }, { 
          name: "Study results",
          extraParams: [{ 
            name: "group.field", 
            value: "s_uuid_s"
          }, {
            name: 'fl',
            value: "*,[child parentFilter=type_s:study limit=10000]"
          }],
          formats: "json,csv,tsv",
          domain: { type: 'parent', which: "type_s:study" },
          fieldsRegExp: /(loValue_d|E.cell_type_s|Species_s|E.exposure_route_s|E.method_s|Dispersion\\ protocol_s|MEDIUM_s):/
        }, { 
          name: "Protocol parameters",
          extraParams: [{ 
            name: "group.field", 
            value: "s_uuid_s"
          }, {
            name: 'fl',
            value: "*,[child parentFilter=type_s:study childFilter=type_s:params]"
          }],
          formats: "json,csv,tsv",
          domain: { type: 'parent', which: "type_s:study" },
          fieldsRegExp: /(loValue_d|E.cell_type_s|Species_s|E.exposure_route_s|E.method_s|Dispersion\\ protocol_s|MEDIUM_s):/
        }, { 
          name: "Study factors",
          extraParams: [{ 
            name: "group.field", 
            value: "s_uuid_s"
          }, {
            name: 'fl',
            value: "*,[child parentFilter=type_s:study childFilter=type_s:conditions]"
          }],
          formats: "json,csv,tsv",
          domain: { type: 'parent', which: "type_s:study" },
          fieldsRegExp: /(loValue_d|E.cell_type_s|Species_s|E.exposure_route_s|E.method_s|Dispersion\\ protocol_s|MEDIUM_s):/
        }
      ],
  		exportFormats: [
        { mime: "application/json", name:"json", icon: "../img/types/json64.png", server: 'solrUrl'},
        { mime: "text/csv", name:"csv", icon: "../img/types/csv64.png", server: 'solrUrl'},
        { mime: "text/tsv", name:"tsv", icon: "../img/types/txt64.png", server: 'solrUrl'},
        { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name:"xslx", icon: "../img/types/xlsx.png", server: 'ambitUrl'},
        { mime: "application/rdf+xml", name:"rdf", icon: "../img/types/rdf64.png", server: 'ambitUrl'},
        { mime: "application/ld+json", name:"json-ld", icon: "../img/types/json-ld.png", server: 'ambitUrl'},
        { mime: "application/isa+json", name:"isa-json", icon: "../img/types/isa.png", server: 'ambitUrl'}
      ],
      exportMaxRows: 999999,
      reportDefinition: {
        template: "template-gracious.xlsx",
        defaultFilter:"type_s:study",
        extraParams: [{
          name: "fl",
          value: "dbtag:dbtag_hss,name:name_hs,publicname:publicname_hs,owner_name:owner_name_hs,substanceType:substanceType_hs,[child parentFilter=type_s:substance childFilter=\"({{filter}}) OR type_s:composition\" limit=10000 fl=*]"
        }, {
          name: "echoParams", 
          value: "none"
        }, {
          name: 'rows', 
          value: 999999
        }, {
          name: "json.facet",
          value: {
            "endpointcategory": {
              "domain": {
                "blockChildren": "type_s:substance"
              },
              "field": "endpointcategory_s",
              "limit": -1,
              "mincount": 1,
              "type": "terms",
              "missing": true,
              "facet": {
                "guidance": {
                  "field": "guidance_s",
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
        }, {
          name: "json.facet.endpointcategory.domain.filter",
          value: "{{filter}}"
        }]
      },
      savedQueries: [
        { 
          id: "pchem-gracious",
          title: "P-Chem from GRACIOUS",
          description: "A Pub-Chem filtered studies conducted from GRACIOUS on their substances",
          filters: [{ 
            faceter: "studies",
            value: "topcategory:P-CHEM"
          },{
            faceter: "owner_name",
            value: "GRACIOUS"
          }]
        }
      ]
		};
