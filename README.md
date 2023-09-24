# jToxKit

[![DOI](https://zenodo.org/badge/75610368.svg)](https://zenodo.org/badge/latestdoi/75610368)

**JavaScript kit of of chem-informatics UI and data mangement tools**

*(a replacement of https://github.com/ideaconsult/Toxtree.js)*

[TOC]

## Background

Since the toolkit strives to provide different _types_ of functionality - from automating the simple data querying machanism, to parsing and enriching received responses, to providing the whole complete web UI for searching, viewing and manipulating chem-informatics data. Therefore two basic principles can be found in organizing the it:

* Functionality is spread among three layers: [**core**](./core/) (data communication & orchestration), [**widgets**](./widgets/) (isolated UI elements) and [**kits**](./kits/) (fullu functional, ready-to-be used bundles providing end user experience).

- Utilize a LEGO-like principle, i.e. ability to combine different pieces of functionality together, e.g. - different translation types. Methodology also known as [Entity Component System](https://en.wikipedia.org/wiki/Entity–component–system).

The later is provided by the small dedicated library [asSys](https://github.com/thejonan/asSys.js), which has deeper explanation on the paradigm. What it provides is the ability to develop certain functionality (wrapped in a "class", actually - `prototype`.) without even knowing what other functionality the instances will poses. For example one can have the functionality of `WalkingObject` wrapped in a prototype, then have `FlyingObject`, wrapped in another prototype and assign this functionality to different entities - _Human_ type entity could have only `WalkingObject` functionality, _Bird_ type entity could have both, and _Plane_ type - only the `FlyingObject`. We call this wrapped functionality a _skill_, and the instances - _agents_.

The _skill-sets_ layering follows simple principles:

* Skills in [**core**](./core/) know nothing about UI - they provide pure data translation and manipulation functionality, which can freely be used on a server-side application as well.
* Skills in [**widgets**](./widgets/) a focused in self-contained, standalone UI elements, which can be combined in an arbitrary way to produce desired final UI.
* Code in [**kits**](./kits/) is not skill-based, but rather provides full blown UIs, which can be easily configured and embedded in any web page.

Skills from [core](./core/) and [widgets](./widgets/) are designed to work together quite easily. For example [`jT.Translation`](./core/Translation.js) skill expects the agent (i.e. instance) to have `translateResponse` method which comes from either [`jT.NesterSolrTranslation`](./core/NesterSolrTranslation.js) or from [`jT.RawSolrTranslation`](./core/RawSolrTranslation.js), and then expects to have method `afterTranslation` which could come from [`jT.ResultWidgeting`](./widgets/ResultWidget.js) skill, for example.

## Dependencies

There are several libraries that jToxKit depends upon:

* [**asSys**](https://github.com/thejonan/asSys.js) - the Agent-Skill library
* [**SolrJsX**](https://github.com/ideaconsult/SolrJsX) - a Solr communication provider
* [purl](https://www.npmjs.com/package/purl) - url parsing package
* [jQuery](https://jquery.com) - the well known web enhancer library
* [jQueryUI](https://jqueryui.com/) framework with [jQuery Slider](https://jqueryui.com/slider/) extension.



## Embedding & Configuring

Embedding a full kit, should be as easy as:

1. Referring proper `.css` and `.js` files;
2. Adding a `<div>` element at the desired place, with proper attributes;
3. Providing configuration.

This is the most probable way to ensure [1] is this in the HTML's `<head>`:

```html
<link rel="stylesheet" href="lib/jToxKit/www/jtox-kit.css">
<link rel="stylesheet" href="style/jquery-ui-1.10.4.custom.min.css">
<link rel="stylesheet" href="style/jquery.ui.theme.css">
<link rel="stylesheet" href="style/jquery.range.css" type="text/css">
```

and this, at the end, after `</html>`:

```html
<!-- these are pretty common -->
<script src="lib/jquery-1.10.2.js"></script>
<script src="lib/jquery-ui-1.10.4.custom.min.js"></script>
<script src="lib/purl.js"></script>
<script src="lib/jquery.range-min.js"></script>

<!-- And here come the important ones -->
<script src="lib/jToxKit/libs/as-sys.min.js"></script>
<script src="lib/jToxKit/libs/solr-jsx.min.js"></script>
<script src="lib/jToxKit/libs/solr-jsx.widgets.min.js"></script>
<script src="lib/jToxKit/www/jtox-kit.min.js"></script>
<script src="lib/jToxKit/www/jtox-kit.widgets.min.js"></script>
<script src="lib/jToxKit/www/jtox-kit.kits.min.js"></script>
```

Of course, you can use non-minified versions as well. The paths are intentionally given in a way to give clues where the actual scripts can be found. Refer to [(Re)building](#rebuilding) section for more information on that topic.

Adding a whole _jTox-Kit_ is no more difficult:

```html
<div id="search-ui" class="jtox-kit" data-kit="FacetedSearch" data-configuration="Settings" data-lookup-map="lookup"/>
```

Here's a small explanation to each property:

* `class="jtox-kit"` marks an element for automatic processing upon jToxKit initialization, so it is critical to have this expanded at all.
* `data-kit="<type-of-the-kit>"` - this property identifies which kit needs to be embedded. Refer to [kits](./kits/) folder.
* `data-XXX="<property value>"` is how kit-dependent properties are passed to the instance during its initialization. In this case two things are provided - the variable to get the `configuration` from, and the variable to use for `lookup` map, which is `FacetedSearchKit`-dependent stuff.

Finally, as can be deduces from above, the configuring is provided via variable name, passed with `data-configuration` property. There are other ways too:

* If the provided variable is a function - it is called assumed to be:

```javascript
 function (dataParameters, kitInstance);
```

, and is called within kit's instance context (i.e. this parameter);

* if `data-config-file` is provided, an attempt is made to retrieve a JSON object from there.

### Configuration file

The actual configuration heavily depends on the kit, being embedded. So, for the only (at the time of this writing) kit, an exemplary configuration looks like this:

```javascript
var Settings = {
    ambitUrl: 'https://apps.ideaconsult.net/nanoreg1/',
    solrUrl: 'https://solr.ideaconsult.net/solr/nanoreg_shard1_replica1/',
    multipleSelection: true,
    keepAllFacets: true,
    aggregateFacets: true,

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
            // ...
            return {
                'topic': topic.toLowerCase(),
                'content': pattern.replace(re, min + "&nbsp;&hellip;&nbsp;" + max)
            };
        }
    },
    pivot: [
        {
            id: "topcategory",
            field: "topcategory_s",
            disabled: true,
            facet: { domain: { blockChildren: "type_s:substance" } }
        },
        {
            id: "endpointcategory",
            field: "endpointcategory_s",
            color: "blue"
        },
        {
            id: "effectendpoint",
            field: "effectendpoint_s",
            color: "green",
            ranging: true
        },
        {
            id: "unit",
            field: "unit_s",
            disabled: true,
            ranging: true
        }
  	  ],
    facets: [
        {
            id: 'owner_name',
            field: "reference_owner_s",
            title: "Data sources",
            color: "green",
            facet: { mincount: 1 }
        },
        {
            id: 'substanceType',
            field: "substanceType_s",
            title: "Nanomaterial type",
            facet: { mincount: 1 }
        },
        {
            id: 'cell',
            field: "E.cell_type_s",
            title: "Cell",
            color: "green",
            facet: { mincount: 1 }
        },
        {
            id: 'species',
            field: "Species_s",
            title: "Species",
            color: "blue",
            facet: { mincount: 2 }
        },
        {
            id: 'interpretation',
            field: "MEDIUM_s",
            title: "Medium",
            color: "green",
            facet: { mincount: 1 }
        },
        {
            id: 'dprotocol',
            field: "Dispersion protocol_s",
            title: "Dispersion protocol",
            color: "green",
            facet: { mincount: 1 }
        },
        {
            id: 'reference_year',
            field: "reference_year_s",
            title: "Experiment year",
            color: "green",
            facet: { mincount: 1 }
        },
        {
            id: 'reference',
            field: "reference_s",
            title: "References",
            facet: { mincount: 2 }
        },
        {
            id: 'route',
            field: "E.exposure_route_s",
            title: "Exposure route",
            color: "green",
            facet: { mincount: 1 }
        },
        {
            id: 'protocol',
            field: "guidance_s",
            title: "Protocols",
            color: "blue",
            facet: { mincount: 1 }
        },
        {
            id: 'method',
            field: "E.method_s",
            title: "Method",
            color: "green",
            facet: { mincount: 1 }
        }
    	],
  // many export-related stuff
};
```

The idea is to have full capability of assembling kits from other kits and/or widgets, just based on this `<div>` embedding principle and proper configuration. It is still not quite operational, but it will be.

### Predefined filters

As part of the configuration one can setup arbitrary number of predefined queries (filters), e.g.:

```javascript
savedQueries: [
  { 
    id: "pchem-all",
    title: "P-Chem",
    description: "Physcicochemical studies",
    filters: [{ 
      id: "studies",
      value: "topcategory:P-CHEM"
    }]
  }, {
    id: "demo-query",
    title: "P-Chem",
    description: "Query Setup Demo",
    filters: [{
      // Simple faceter reference
      id: "reference_year",
      value: "2018"
    }, {
      // Pivot faceter reference
      id: "studies",
      value: "topcategory:P-CHEM"
    }, {
      // Solr request parameter reference
      name: "json.filter",
      value: "substanceType_s:NNm"
    }]
  }
]
```

Aside from miscellaneous stuff like `id`, `name`, etc. the key part of defining the actual filters has three possible forms:

* **Referring a simple faceter**, by specifying the  `id` property, making direct reference to `facets` part of the configuration. The `value` property provided corresponds to the value this _particular_ faceter is expecting/manipulating.
* **Referring a pivot faceter**, relies on the `id` property again, but since the pivot is added as a faceter, with id `studies` - this needs to be specified. It is important that, because of the nested, and multi-field nature of this faceter, the value needs to specify which of the pivot entries it is referred. Pay attention that this is _not_ a data field (again), but a pivot entry id, i.e. the `value` is of the format:
   `<pivot id>:<filter value>`
* **Solr query parameter** can be manipulated if `name` property is used, instead of `id`. In such case the `value` is directly added to Solr request’s parameter with a given name. If `fq`/`json.filter` is used, this means that this time, a full data field name need to be specified (along with the value).

## <a id="rebuilding">(Re)building</a>

The whole library is organized as a [NPM package](https://github.com/npm/npm), although it is published in the public [NPM space](https://www.npmjs.com).. So, for building it, one needs [Node.js](https://nodejs.org/en/download/) installed. From then on, it is rather easy:

```bash
$ npm update
$ npm install
```



The first commands makes sure that all dependent libraries are downloaded and up-to-date, and the later runs all the packaging, testing, bundling, etc. of jToxKit. The end result is put in [www](./www/) folder.

Check the raw [ToDo List](./TODO.md).

## License

**Copyright © 2016-2018, IDEAConsult Ltd.**

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
