## TODO:

- Move ketcher within our repository as sub-module
- History of searches in jToxSearch component (along with type of search and additional parameters)
- make proper deleting process
- improve data recording process

### DOCS:

- new handling mechanism with 'handler' property in each kit
- onRow universal handler
- jToxComoluns column ordering via 'order' field in feature definition
- jToxSearch slideInput property
- jToxCompound fixedWidth
- jToxKit.ui renderMulti

### FUTURE / IDEAS

- deferred re-query (postpone)
- Reduce network calls in ToxTree on run-all - postpone the call until the last model has ran.

Assessment:

- Ability to re-use the built tab/features structures? Additional setting?

### REFACTORING

1. Entity-Component based structure:
2. Architecture:
   - `widgets`: All UI widgets, which define an atomic UI behavior on the HTML DOM. Data is expected to be there. (Currently kits). E.g.: **Large table**, **Foldable block**, **Distribution** (jToxFacet), **Range Selectors**  etc.
   - `kits`: A bundles of widgets, which represent a complete UI experience. E.g. Study browser, Query (search UI), etc.
   - `core`: The core engine, which combines the `$$` library, `kits` and `widgets`, provides the auto-insertion, etc.
   - `libs`: All the libraries used:
     - `asSys` (`a$`) - the Agent-Skills library - capable of being used server-side, client-side, etc. The engine for combining prototypes.
     - `SolrJsX` (`Solr`) - the Solr query builder.
     - `AmbitJsX` (`Ambit`) - the Ambit query builder.
     - `jQuery`, `d3js`, `jQueryUI`, etc.
   - `tests`: Tests for all the widgets and kits.
   - `bin`: The scripts for building, packaging, testing, etc.
   - `www`: The output folder.

- Data translators will report pools of entities that can be handled to the widgets. The browser will generally know about: entity pool, paging, filtering & searching.
- The UI widgets can be given a rename map, so that each entity from the data translator can be passed through it to get a (shallow copy) of the object with proper names for rendering. I.e. utilizing the templates.
- Building tool should be able to produce no-UI package. (parameter).