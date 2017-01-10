asSys = require("as-sys");
Solr = require("solr-jsx");
jT = require("../");

a$ = asSys;

(function (TestData) {
  
describe("jToxKit Core", function () {
	
	// The actual tests start here.
	describe("Translation", function () {
	  var EmptyTranslator = function (obj) { a$.extend(this, obj); };
    EmptyTranslator.prototype.translateResponse = function (response, scope) { 
      this.scope = scope; 
      return this.data = response; 
    };
    
  	var topic = new (a$(Solr.Management, Solr.QueryingURL, Solr.Configuring, jT.Translation, EmptyTranslator))({ prop: "test" }),
  	    EmptyConsumer = function (obj) { 
          a$.extend(this, obj); 
          this.notified = false; 
        };
        
    EmptyConsumer.prototype.afterTranslation = function(data, scope) { 
      this.notified = true;
      expect(data).toBeDefined(); 
      expect(scope).toBe("scope");
    };
    var consumer = new EmptyConsumer( { id: "a" });
  	    
  	it("Can be instantiated with SolrJsX Manager", function () {
    	expect(topic).toBeDefined();
    	expect(topic.prop).toBe("test");
  	});
  	
    it("Consumers get notified", function () {
      topic.addListeners(consumer);
      topic.parseResponse({ prop: "test" }, "scope");
      expect(consumer.notified).toBeTruthy();
    });
	}); // End of consumption test bundle
	
	var basicTranslationSpecs = function (data) {
    it("Can translate data", function () {
      expect(data.entries).toBeDefined();
      expect(data.paging).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(data.facets).toBeDefined();
    });
    
    it("Has properly built stats", function () {
      expect(data.paging).toEqual({ "start": 0, "count": 3, "total": 3, "pageSize": 20});
      expect(data.entries.length).toBe(data.paging.count);
    });
  	
	};

  describe("Raw Solr Translation", function (){
    var topic = new (a$(jT.RawSolrTranslation))(),
        data = topic.translateResponse(TestData.RawSolr);
    
    basicTranslationSpecs(data);
    it("Merges expanded information", function (){
      expect(data.entries[0]._extended_).toBeDefined();
      expect(data.entries[0]._extended_.study.length).toBe(2);
      expect(data.entries[2]._extended_.study.length).toBe(3);
      expect(data.entries[2]._extended_.study[2].guidance).toBe("cell viability");
    });
  });	
  
  describe("Nested Solr Translation", function (){
    var topic = new (a$(jT.NestedSolrTranslation))(),
        data = topic.translateResponse(Solr.QueryingJson.prototype.parseQuery(TestData.NestedSolr));
    
    basicTranslationSpecs(data);
    it("Builds child docs", function (){
      expect(data.entries[0]._extended_).toBeDefined();
      expect(data.entries[0]._extended_.study.length).toBe(2);
      expect(data.entries[1]._extended_.study.length).toBe(1);
      expect(data.entries[2]._extended_.study[1].loValue_d).toBe(30);
    });
  });	
  
});
})({
  // Data files. TODO: Bonus if anybody can find a (feasible) way to put this into 
  // an external file AND be able to load it from BOTH npm and the browser.
  RawSolr: {
      "responseHeader": {
          "zkConnected": true,
          "status": 0,
          "QTime": 8,
          "params": {
              "fl": "id,type_s,s_uuid,doc_uuid,topcategory,endpointcategory,guidance,substanceType,name,publicname,reference,reference_owner,interpretation_result,reference_year,content,owner_name,P-CHEM.PC_GRANULOMETRY_SECTION.SIZE,CASRN.CORE,CASRN.COATING,CASRN.CONSTITUENT,CASRN.ADDITIVE,CASRN.IMPURITY,EINECS.CONSTITUENT,EINECS.ADDITIVE,EINECS.IMPURITY,ChemicalName.CORE,ChemicalName.COATING,ChemicalName.CONSTITUENT,ChemicalName.ADDITIVE,ChemicalName.IMPURITY,TradeName.CONSTITUENT,TradeName.ADDITIVE,TradeName.IMPURITY,COMPOSITION.CORE,COMPOSITION.COATING,COMPOSITION.CONSTITUENT,COMPOSITION.ADDITIVE,COMPOSITION.IMPURITY",
              "f.reference_year.facet.mincount": "1",
              "f.guidance.facet.mincount": "2",
              "f._childDocuments_.params.DATA_GATHERING_INSTRUMENTS.facet.limit": "-1",
              "fq": ["{!collapse field=s_uuid}false", "{!tag=substanceType_tag}substanceType:CHEBI_33416", "{!tag=owner_name_tag}owner_name:caNanoLab.UC_HU_UEN_GERMANY"],
              "f.substanceType.facet.mincount": "2",
              "json.wrf": "jQuery1102010368645594557713_1481221450881",
              "expand.rows": "3",
              "f.interpretation_result.facet.mincount": "2",
              "stats": "true",
              "f._childDocuments_.params.Cell_line.facet.mincount": "1",
              "f._childDocuments_.params.Species.facet.mincount": "2",
              "f.substanceType.facet.limit": "-1",
              "f._childDocuments_.params.Species.facet.limit": "-1",
              "wt": "json",
              "stats.field": "{!tag=studies_stats min=true max=true}loValue",
              "_": "1481221450890",
              "q.alt": "*:*",
              "facet.field": ["{!ex=owner_name_tag}owner_name", "{!ex=substanceType_tag}substanceType", "{!ex=cell_tag}_childDocuments_.params.Cell_line", "{!ex=species_tag}_childDocuments_.params.Species", "{!ex=interpretation_tag}interpretation_result", "{!ex=reference_year_tag}reference_year", "{!ex=reference_tag}reference", "{!ex=protocol_tag}guidance", "{!ex=instruments_tag}_childDocuments_.params.DATA_GATHERING_INSTRUMENTS", "{!ex=endpointcategory_tag}endpointcategory", "{!ex=effectendpoint_tag}effectendpoint"],
              "f.reference.facet.mincount": "2",
              "json.nl": "map",
              "facet.pivot": "{!stats=studies_stats ex=studies_tag}topcategory,endpointcategory,effectendpoint,unit",
              "rows": "20",
              "facet.limit": "-1",
              "q": "*:*",
              "expand": "true",
              "f.owner_name.facet.mincount": "3",
              "facet.mincount": "1",
              "f._childDocuments_.params.DATA_GATHERING_INSTRUMENTS.facet.mincount": "2",
              "facet": "true"
          }
      },
      "response": {
          "numFound": 3,
          "start": 0,
          "docs": [{
              "name": ["UC_HU_UEN-FRancanPhPh2007-02"],
              "publicname": ["UC_HU_UEN-FRancanPhPh2007-02"],
              "owner_name": ["caNanoLab.UC_HU_UEN_GERMANY"],
              "topcategory": ["TOX"],
              "endpointcategory": ["BAO_0002993_SECTION"],
              "guidance": ["caspase 3 apoptosis"],
              "reference": ["10.1111/j.1751-1097.2007.00163.x"],
              "reference_owner": ["caNanoLab"],
              "type_s": "study",
              "s_uuid": "CNLB-e648cd6e-c220-655b-fd76-2de34c1c9cfd",
              "substanceType": ["CHEBI_33416"],
              "reference_year": [2007],
              "content": ["https://cananolab.nci.nih.gov/caNanoLab/#/sample?sampleId=11337798"],
              "id": "b5850934-9eae-44e7-962b-c74e40cdd969"
          }, {
              "name": ["UC_HU_UEN-FRancanPhPh2007-03"],
              "publicname": ["UC_HU_UEN-FRancanPhPh2007-03"],
              "owner_name": ["caNanoLab.UC_HU_UEN_GERMANY"],
              "topcategory": ["TOX"],
              "endpointcategory": ["BAO_0002993_SECTION"],
              "guidance": ["caspase 3 apoptosis"],
              "reference": ["10.1111/j.1751-1097.2007.00163.x"],
              "reference_owner": ["caNanoLab"],
              "type_s": "study",
              "s_uuid": "CNLB-6d13e7bb-446e-a417-e6bf-8822182a4aa8",
              "substanceType": ["CHEBI_33416"],
              "reference_year": [2007],
              "content": ["https://cananolab.nci.nih.gov/caNanoLab/#/sample?sampleId=11337799"],
              "id": "41a94b02-9874-4994-9aac-b85b61985b30"
          }, {
              "name": ["UC_HU_UEN-FRancanPhPh2007-04"],
              "publicname": ["UC_HU_UEN-FRancanPhPh2007-04"],
              "owner_name": ["caNanoLab.UC_HU_UEN_GERMANY"],
              "topcategory": ["P-CHEM"],
              "endpointcategory": ["PC_UNKNOWN_SECTION"],
              "reference": ["10.1111/j.1751-1097.2007.00163.x"],
              "reference_owner": ["caNanoLab"],
              "type_s": "study",
              "s_uuid": "CNLB-3ef43f8c-44e7-ea0c-62b8-0bff8eb02e20",
              "substanceType": ["CHEBI_33416"],
              "reference_year": [2007],
              "content": ["https://cananolab.nci.nih.gov/caNanoLab/#/sample?sampleId=11337800"],
              "id": "f7d13c70-7841-4943-92cb-83f768751218"
          }]
      },
      "facet_counts": {
          "facet_queries": {},
          "facet_fields": {
              "owner_name": {
                  "caNanoLab.C-Sixty (CNI)": 5,
                  "caNanoLab.UC_HU_UEN_GERMANY": 3
              },
              "substanceType": {
                  "CHEBI_33416": 3
              },
              "_childDocuments_.params.Cell_line": {
                  "Jurkat E6.1 - Human leukaemic T Cell line lymphoblast": 2
              },
              "_childDocuments_.params.Species": {},
              "interpretation_result": {},
              "reference_year": {
                  "2007": 3
              },
              "reference": {
                  "10.1111/j.1751-1097.2007.00163.x": 3
              },
              "guidance": {
                  "caspase 3 apoptosis": 2
              },
              "_childDocuments_.params.DATA_GATHERING_INSTRUMENTS": {},
              "endpointcategory": {
                  "BAO_0002993_SECTION": 2,
                  "PC_UNKNOWN_SECTION": 1
              },
              "effectendpoint": {
                  "molecular weight": 1
              }
          },
          "facet_ranges": {},
          "facet_intervals": {},
          "facet_heatmaps": {},
          "facet_pivot": {
              "topcategory,endpointcategory,effectendpoint,unit": [{
                  "field": "topcategory",
                  "value": "P-CHEM",
                  "count": 1,
                  "pivot": [{
                      "field": "endpointcategory",
                      "value": "PC_UNKNOWN_SECTION",
                      "count": 1,
                      "pivot": [{
                          "field": "effectendpoint",
                          "value": "molecular weight",
                          "count": 1,
                          "pivot": [{
                              "field": "unit",
                              "value": "g/mol",
                              "count": 1,
                              "stats": {
                                  "stats_fields": {
                                      "loValue": {
                                          "min": 8724.0,
                                          "max": 8724.0
                                      }
                                  }
                              }
                          }],
                          "stats": {
                              "stats_fields": {
                                  "loValue": {
                                      "min": 8724.0,
                                      "max": 8724.0
                                  }
                              }
                          }
                      }],
                      "stats": {
                          "stats_fields": {
                              "loValue": {
                                  "min": 8724.0,
                                  "max": 8724.0
                              }
                          }
                      }
                  }],
                  "stats": {
                      "stats_fields": {
                          "loValue": {
                              "min": 8724.0,
                              "max": 8724.0
                          }
                      }
                  }
              }, {
                  "field": "topcategory",
                  "value": "TOX",
                  "count": 2,
                  "pivot": [{
                      "field": "endpointcategory",
                      "value": "BAO_0002993_SECTION",
                      "count": 2,
                      "stats": {
                          "stats_fields": {
                              "loValue": {
                                  "min": null,
                                  "max": null
                              }
                          }
                      }
                  }],
                  "stats": {
                      "stats_fields": {
                          "loValue": {
                              "min": null,
                              "max": null
                          }
                      }
                  }
              }]
          }
      },
      "stats": {
          "stats_fields": {
              "loValue": {
                  "min": 8724.0,
                  "max": 8724.0
              }
          }
      },
      "expanded": {
          "CNLB-3ef43f8c-44e7-ea0c-62b8-0bff8eb02e20": {
              "numFound": 2,
              "start": 0,
              "docs": [{
                  "name": ["UC_HU_UEN-FRancanPhPh2007-04"],
                  "publicname": ["UC_HU_UEN-FRancanPhPh2007-04"],
                  "owner_name": ["caNanoLab.UC_HU_UEN_GERMANY"],
                  "topcategory": ["TOX"],
                  "endpointcategory": ["BAO_0002993_SECTION"],
                  "guidance": ["caspase 3 apoptosis"],
                  "reference": ["10.1111/j.1751-1097.2007.00163.x"],
                  "reference_owner": ["caNanoLab"],
                  "type_s": "study",
                  "s_uuid": "CNLB-3ef43f8c-44e7-ea0c-62b8-0bff8eb02e20",
                  "substanceType": ["CHEBI_33416"],
                  "reference_year": [2007],
                  "content": ["https://cananolab.nci.nih.gov/caNanoLab/#/sample?sampleId=11337800"],
                  "id": "7595a1c8-2726-45ed-abe0-cab317f6b01d"
              }, {
                  "name": ["UC_HU_UEN-FRancanPhPh2007-04"],
                  "publicname": ["UC_HU_UEN-FRancanPhPh2007-04"],
                  "owner_name": ["caNanoLab.UC_HU_UEN_GERMANY"],
                  "topcategory": ["TOX"],
                  "endpointcategory": ["BAO_0002993_SECTION"],
                  "guidance": ["cell viability"],
                  "reference": ["10.1111/j.1751-1097.2007.00163.x"],
                  "reference_owner": ["caNanoLab"],
                  "type_s": "study",
                  "s_uuid": "CNLB-3ef43f8c-44e7-ea0c-62b8-0bff8eb02e20",
                  "substanceType": ["CHEBI_33416"],
                  "reference_year": [2007],
                  "content": ["https://cananolab.nci.nih.gov/caNanoLab/#/sample?sampleId=11337800"],
                  "id": "83bfa69f-3add-47db-b3a8-d3bb49a87833"
              }]
          },
          "CNLB-e648cd6e-c220-655b-fd76-2de34c1c9cfd": {
              "numFound": 1,
              "start": 0,
              "docs": [{
                  "name": ["UC_HU_UEN-FRancanPhPh2007-02"],
                  "publicname": ["UC_HU_UEN-FRancanPhPh2007-02"],
                  "owner_name": ["caNanoLab.UC_HU_UEN_GERMANY"],
                  "topcategory": ["TOX"],
                  "endpointcategory": ["BAO_0002993_SECTION"],
                  "guidance": ["cell viability"],
                  "reference": ["10.1111/j.1751-1097.2007.00163.x"],
                  "reference_owner": ["caNanoLab"],
                  "type_s": "study",
                  "s_uuid": "CNLB-e648cd6e-c220-655b-fd76-2de34c1c9cfd",
                  "substanceType": ["CHEBI_33416"],
                  "reference_year": [2007],
                  "content": ["https://cananolab.nci.nih.gov/caNanoLab/#/sample?sampleId=11337798"],
                  "id": "39a656e4-d05d-4d94-84c6-054744f5e786"
              }]
          },
          "CNLB-6d13e7bb-446e-a417-e6bf-8822182a4aa8": {
              "numFound": 1,
              "start": 0,
              "docs": [{
                  "name": ["UC_HU_UEN-FRancanPhPh2007-03"],
                  "publicname": ["UC_HU_UEN-FRancanPhPh2007-03"],
                  "owner_name": ["caNanoLab.UC_HU_UEN_GERMANY"],
                  "topcategory": ["TOX"],
                  "endpointcategory": ["BAO_0002993_SECTION"],
                  "guidance": ["cell viability"],
                  "reference": ["10.1111/j.1751-1097.2007.00163.x"],
                  "reference_owner": ["caNanoLab"],
                  "type_s": "study",
                  "s_uuid": "CNLB-6d13e7bb-446e-a417-e6bf-8822182a4aa8",
                  "substanceType": ["CHEBI_33416"],
                  "reference_year": [2007],
                  "content": ["https://cananolab.nci.nih.gov/caNanoLab/#/sample?sampleId=11337799"],
                  "id": "cec4997f-fe00-4a55-a15f-2edadf3df076"
              }]
          }
      }
  },
  NestedSolr: {
    "responseHeader": {
      "zkConnected": true,
      "status": 0,
      "QTime": 4,
      "params": {
        "q.alt": "*:*",
        "json.nl": "map",
        "json": "{\n  \"query\": \"{!parent which=type_s:substance}gold\",\n  \"facet\": {\n  \t\"topcategory\": {\n\t  \t\"type\": \"terms\",\n\t  \t\"field\": \"topcategory_s\",\n  \t\t\"domain\": { \n  \t\t\t\"blockChildren\" : \"type_s:substance\"\n  \t\t},\n  \t\t\"facet\": {\n\t\t  \t\"min\": \"min(loValue_d)\",\n\t\t  \t\"max\": \"max(loValue_d)\"\n  \t\t}\n  \t}\n  },\n  \"params\" : {\n    \"stats\" : true,\n    \"fl\" : [\n    \t\"id\", \n    \t\"name_hs\",\n    \t\"topcategory_s\",\n    \t\"[child parentFilter=type_s:substance childFilter=type_s:study limit=100]\",\n    \t\"[child parentFilter=type_s:substance childFilter=type_s:composition limit=100]\"\n    ],\n    \"facet.limit\" : -1,\n    \"fq\" : \"*:*\",\n    \"stats.field\" : [\n      \"{!min=true max=true blockChildren=type_s:study}loValue_d\"\n    ],\n    \"rows\" : 20\n  }\n}",
        "wt": "json"
      }
    },
    "response": {
      "numFound": 3,
      "start": 0,
      "docs": [
        {
          "id": "NWKI-765933f1-5fb1-35e6-858b-ce809c42f26e",
          "name_hs": "Chithrani Au5",
          "_childDocuments_": [
            {
              "id": "NWKI-405da02d-956e-45b1-9ead-7055accccf73/156",
              "name_s": "Chithrani Au5",
              "publicname_s": "Au Au S100",
              "owner_name_s": "NanoWiki",
              "substanceType_s": "NPO_401",
              "s_uuid_s": "NWKI-765933f1-5fb1-35e6-858b-ce809c42f26e",
              "type_s": "study",
              "document_uuid_s": "NWKI-405da02d-956e-45b1-9ead-7055accccf73",
              "topcategory_s": "TOX",
              "endpointcategory_s": "UNKNOWN_TOXICITY_SECTION",
              "guidance_s": "ICP-2DAES",
              "endpoint_s": "PARTICLES PER CELL",
              "effectendpoint_s": "PARTICLES_PER_CELL",
              "reference_owner_s": "NANOWIKI",
              "reference_s": "http://iopscience.iop.org/1749-4699/6/1/014010/article/",
              "loValue_d": 1800,
              "err_d": 500,
              "unit_s": ""
            },
            {
              "id": "NWKI-5443a192-dc7b-457a-88ee-58945dbbd1f7/155",
              "name_s": "Chithrani Au5",
              "publicname_s": "Au Au S100",
              "owner_name_s": "NanoWiki",
              "substanceType_s": "NPO_401",
              "s_uuid_s": "NWKI-765933f1-5fb1-35e6-858b-ce809c42f26e",
              "type_s": "study",
              "document_uuid_s": "NWKI-5443a192-dc7b-457a-88ee-58945dbbd1f7",
              "topcategory_s": "P-CHEM",
              "endpointcategory_s": "PC_GRANULOMETRY_SECTION",
              "endpoint_s": "PARTICLE SIZE",
              "effectendpoint_s": "PARTICLE SIZE",
              "reference_owner_s": "NANOWIKI",
              "reference_s": "http://iopscience.iop.org/1749-4699/6/1/014010/article/",
              "loValue_d": 100,
              "unit_s": "nm"
            },
            {
              "id": "NWKI-765933f1-5fb1-35e6-858b-ce809c42f26e/c/1",
              "type_s": "composition",
              "component": [
                "CONSTITUENT"
              ]
            }
          ]
        },
        {
          "id": "NWKI-0b663f5f-1386-3cc5-ba6b-9ff2bb39d4ff",
          "name_hs": "E-GEOD-20677-M1",
          "_childDocuments_": [
            {
              "id": "NWKI-e8630b4c-3ff7-4a1e-9db5-0d810eea29c9/246",
              "name_s": "E-GEOD-20677-M1",
              "publicname_s": "Au AU-NP oligonucleotide",
              "owner_name_s": "NanoWiki",
              "substanceType_s": "NPO_401",
              "s_uuid_s": "NWKI-0b663f5f-1386-3cc5-ba6b-9ff2bb39d4ff",
              "type_s": "study",
              "document_uuid_s": "NWKI-e8630b4c-3ff7-4a1e-9db5-0d810eea29c9",
              "topcategory_s": "P-CHEM",
              "endpointcategory_s": "PC_GRANULOMETRY_SECTION",
              "guidance_s": "TEM",
              "endpoint_s": "PRIMARY PARTICLE SIZE",
              "effectendpoint_s": "PARTICLE SIZE",
              "reference_owner_s": "NANOWIKI",
              "reference_s": "http://iopscience.iop.org/1749-4699/6/1/014010/article/",
              "loValue_d": 13,
              "err_d": 11,
              "unit_s": "nm"
            },
            {
              "id": "NWKI-0b663f5f-1386-3cc5-ba6b-9ff2bb39d4ff/c/1",
              "type_s": "composition",
              "component": [
                "CORE"
              ]
            }
          ]
        },
        {
          "id": "NWKI-9b508140-9a21-3fb2-b2a3-c7a11f6cc347",
          "name_hs": "Chithrani Au2",
          "_childDocuments_": [
            {
              "id": "NWKI-b3e871ba-c1c1-42a9-bb2a-c6a72e26c267/324",
              "name_s": "Chithrani Au2",
              "publicname_s": "Au Au S30",
              "owner_name_s": "NanoWiki",
              "substanceType_s": "NPO_401",
              "s_uuid_s": "NWKI-9b508140-9a21-3fb2-b2a3-c7a11f6cc347",
              "type_s": "study",
              "document_uuid_s": "NWKI-b3e871ba-c1c1-42a9-bb2a-c6a72e26c267",
              "topcategory_s": "TOX",
              "endpointcategory_s": "UNKNOWN_TOXICITY_SECTION",
              "guidance_s": "ICP-2DAES",
              "endpoint_s": "PARTICLES PER CELL",
              "effectendpoint_s": "PARTICLES_PER_CELL",
              "reference_owner_s": "NANOWIKI",
              "reference_s": "http://iopscience.iop.org/1749-4699/6/1/014010/article/",
              "loValue_d": 4500,
              "err_d": 500,
              "unit_s": ""
            },
            {
              "id": "NWKI-e3a8b36e-36fe-4119-8c7a-30226f82a7ab/323",
              "name_s": "Chithrani Au2",
              "publicname_s": "Au Au S30",
              "owner_name_s": "NanoWiki",
              "substanceType_s": "NPO_401",
              "s_uuid_s": "NWKI-9b508140-9a21-3fb2-b2a3-c7a11f6cc347",
              "type_s": "study",
              "document_uuid_s": "NWKI-e3a8b36e-36fe-4119-8c7a-30226f82a7ab",
              "topcategory_s": "P-CHEM",
              "endpointcategory_s": "PC_GRANULOMETRY_SECTION",
              "endpoint_s": "PARTICLE SIZE",
              "effectendpoint_s": "PARTICLE SIZE",
              "reference_owner_s": "NANOWIKI",
              "reference_s": "http://iopscience.iop.org/1749-4699/6/1/014010/article/",
              "loValue_d": 30,
              "unit_s": "nm"
            },
            {
              "id": "NWKI-9b508140-9a21-3fb2-b2a3-c7a11f6cc347/c/1",
              "type_s": "composition",
              "component": [
                "CONSTITUENT"
              ]
            }
          ]
        }
      ]
    },
    "facets": {
      "count": 3,
      "topcategory": {
        "buckets": [
          {
            "val": "P-CHEM",
            "count": 905,
            "min": -33.5,
            "max": 27499999200
          },
          {
            "val": "TOX",
            "count": 702,
            "min": -1,
            "max": 1115686530
          }
        ]
      }
    },
    "stats": {
      "stats_fields": {
        "loValue_d": {
          "min": null,
          "max": null
        }
      }
    }
  }
});
