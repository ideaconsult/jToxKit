asSys = require("as-sys");
Solr = require("solr-jsx");
_ = require("underscore");
jT = require("../");
customMatchers = {
	toDeepEqual: function (util, customEqualityTesters) {
		return {
			compare: function(actual, expected) {
					return { pass: _.isEqual(actual, expected) };
			}
		}
	}
};

a$ = asSys;

(function (TestData) {
  
describe("jToxKit Core", function () {
	// prepare the test for dual runs - browser & npm
	beforeEach(function () {
		var jself = typeof this.addMatchers === 'function' ? this : jasmine;
		jself.addMatchers(customMatchers);
	});
	
	// The actual tests start here.
	describe("Consumption", function () {
	  var EmptyTranslator = function (obj) { a$.extend(this, obj); };
    EmptyTranslator.prototype.translateResponse = function (response, scope) { 
      this.scope = scope; 
      return this.data = response; 
    };
    
  	var Consumable = a$(Solr.Management, jT.Consumption, EmptyTranslator);
  	    topic = new Consumable({ prop: "test" });
  	    
    var EmptyConsumer = function (obj) { 
      a$.extend(this, obj); 
      this.notified = false; 
    };
    EmptyConsumer.prototype.afterTranslation = function(data, scope) { 
      this.notified = true;
      expect(data).toBeDefined(); 
      expect(scope).toBe("scope");
    };
    var consumer = new EmptyConsumer();
  	    
  	it("Can be instantiated with SolrJsX Manager", function () {
    	expect(topic).toBeDefined();
    	expect(topic.prop).toBe("test");
  	});
  	
  	it("Can add consumers", function () {
    	topic.addConsumers(consumer, "a");
    	expect(a$.weight(topic.consumers)).toBe(1);
  	});

    it("Consumers get notified", function () {
      topic.addConsumers(consumer, "a");
      topic.parseResponse({ prop: "test" }, "scope");
      expect(consumer.notified).toBeTruthy();
    });
    
    it("Consumer can be removed", function () {
      topic.addConsumers(consumer, "a");
      topic.removeConsumer("a");
      expect(a$.weight(topic.consumers)).toBe(0);
    })

    it("Many consumers can be removed", function () {
      topic.addConsumers(consumer, "a");
      topic.addConsumers(new EmptyConsumer(), "b");
      topic.removeManyConsumers(function (c, i) { return i == "a"; });
      expect(a$.weight(topic.consumers)).toBe(1);
      expect(topic.getConsumer("b")).toBeDefined();
    })
    
    it("Can enumerate consumers", function () {
      topic.addConsumers(consumer, "a");
      topic.addConsumers(new EmptyConsumer(), "b");
      var ctx = { count: 0 };
      topic.enumerateConsumers(function (c, i, context) { ++context.count; }, ctx);
      expect(ctx.count).toBe(2);
    });    
	}); // End of consumption test bundle

  describe("Raw Solr Translation", function (){
    var topic = new (a$(jT.RawSolrTranslation))(),
        data = topic.translateResponse(TestData.RawSolr);
    
    it("Can translate data", function () {
      expect(data.entries).toBeDefined();
      expect(data.paging).toBeDefined();
      expect(data.stats).toBeDefined();
    });
    
    it("Has properly built stats", function () {
      expect(data.paging).toDeepEqual({ "start": 0, "count": 3, "total": 3, "pageSize": 20});
      expect(data.entries.length).toBe(data.paging.count);
    });
    
    it("Merges expanded information", function (){
      expect(data.entries[0].reference.length).toBe(2);
      expect(data.entries[2].reference_year.length).toBe(3);
      expect(data.entries[2].guidance[2]).toBe("cell viability");
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
  }
});
