# AGENTS.md

Guidance for AI coding agents working in the **jToxKit** repository. Written for
the state of the `master` branch.

## What this is

`@ideaconsult/jtox-kit` — a JavaScript client library of chem‑informatics UI and
data‑management tools for the **AMBIT / eNanoMapper / Solr** ecosystem (a
replacement for the older `Toxtree.js`). MIT licensed; author Ivan "Jonan"
Georgiev / IDEAConsult Ltd. Repo: `github.com/ideaconsult/jToxKit`.

- **Consumed as a vendored bundle.** Downstream sites copy `www/jtox-kit*.{js,css}`
  and the `libs/` third‑party files into their own asset tree and load them with
  `<script>` tags. There is no ESM/npm‑import usage in practice.
- **Version:** `package.json` is authoritative (**2.4.3**). `composer.json` (2.2.5)
  is stale — ignore it.
- Old toolchain (`smash`, `jasmine-node`, `uglify-js --ie8`; `.travis.yml` pins
  node 5). It still runs on modern Node for the build steps that matter; the
  jasmine specs need live services and mostly won't pass locally.
- **This library is in maintenance mode.** A ground‑up React rewrite lives at
  `github.com/ideaconsult/jtoxkit-react` and is where new development goes. Changes
  here should be the **minimum needed by an existing downstream consumer** (today:
  the eNanoMapper Eleventy/11ty static site). Do not undertake broad
  modernisation, dependency upgrades, or refactors in this repo — port to
  `jtoxkit-react` instead, or make the smallest possible targeted fix.

## Architecture — three layers, "skills & agents"

jToxKit is built on **asSys** (`a$`), an Entity‑Component‑System / prototype‑mixing
library. Functionality is authored as *skills* and combined onto *agents*
(instances). Three layers, each its own folder:

| Layer | Folder | Role |
|---|---|---|
| **core** | `core/` | Non‑UI "skills": Solr/AMBIT comms, response translation, model running, task polling, exporting. Runs server‑side too. Entry point `core/Core.js` defines the `jToxKit` / `jT` global. |
| **widgets** | `widgets/` | Standalone UI elements on the DOM: `Base.js` (=`jT.ui`), `TableTools`, `AutocompleteWidget`, `SliderWidget`, `TagWidget`, `Ambit`, `AccordionExpansion`, `CurrentSearchWidget`, `ListWidget`, `SimpleItemWidget`, `Running`, `Switching`, `Integration`. |
| **kits** | `kits/` | Complete, embeddable UIs = `kits/js/<Kit>.js` + `kits/<Kit>.html` (templates) + `kits/css/<Kit>.css`. Kits: **FacetedSearch** (the big one), Query, Study, Compound, Composition, Substance, Matrix, Logging, Annotation; plus `PivotWidget`, `RangesWidget`, `ResultWidget` helpers. |

Namespaces used throughout: `jT` / `jToxKit` (this lib), `a$` (asSys), `Solr`
(SolrJsX), `$` (jQuery). Modules are IIFEs, e.g.
`(function (jT, a$, $) { ... })(jToxKit, asSys, jQuery)`.

## Dependencies

**Host must provide** (not bundled): jQuery, **jQuery UI 1.10.4** + slider + theme
CSS, `jquery.range` (jRange) + CSS, `purl`.

**Bundled in `libs/`** (the `pretest` script `rsync`s some in from `node_modules`):
`as-sys.js` (asSys), `solr-jsx*.js` / `solr-jsx.widgets*.js` (SolrJsX), `lodash`,
`xlsx-datafill`, `xlsx-populate-no-encryption`, **DataTables 1.10.20**,
**bootstrap‑tokenfield 0.12**, plus reference copies of `jquery.js` (1.10.2) and
`jquery-ui.min.js` (1.10.4). `npm` runtime deps: `@ideaconsult/solr-jsx`,
`@thejonan/as-sys`, `xlsx-datafill`, `xlsx-populate`.

Bootstrap is **not** a real dependency — `kits/*.html` only uses `fa fa-*` icons
and one `data-toggle`; no BS grid/panel/glyphicon markup.

## Build

Outputs land in `www/` **and are committed** — regenerate them, never hand‑edit.

```sh
npm install                         # smash, uglify-js, deps

# core  →  www/jtox-kit.js  (Core.js has {{VERSION}} substituted first)
npm run pretest                     # sed {{VERSION}} + `smash core/start.js`
# or the pieces:                    #   the pretest script also rsyncs libs/ and tests/libs/

npm run widgets                     # smash widgets/Base.js  → www/jtox-kit.widgets.js (+ .min)
npm run kits                        # smash kits/js/*.js + (cat kits/*.html | bin/html2js.pl --trim)
                                    #   → www/jtox-kit.kits.js (+ .min); smash kits/css/*.css → www/jtox-kit.css

npm test                           # jasmine-node tests (LIVE endpoints — will mostly fail offline)
                                    #   then uglify min + npm run widgets + npm run kits
npm run prepare                     # npm test + zip www/jtox-kit.zip
```

**To rebuild only what downstreams consume without running the live tests:** run
`pretest`, `widgets`, `kits` directly and skip `npm test`.

Build mechanics to respect:
- **`smash`** concatenates via `import "Name";` directives — in `core/Core.js`
  these **must start at column 0** (there's a comment saying so). `smash` resolves
  them relative to the file.
- **`bin/html2js.pl`** converts `kits/*.html` into JS string templates using
  `<!--[[ VarName -->` … `<!-- ]]-->` fence comments (`--trim` strips whitespace).
- **`uglify-js --ie8 --keep-fnames`** — keep the source **ES5**; no arrow
  functions / `const` / template literals in shipped code.
- `npm run postpublish` does `git push` + `git tag -am ... ${version}` +
  `git push --tags`.

## Outputs (`www/`, committed)

`jtox-kit.js` / `.min.js` (core), `jtox-kit.widgets.js` / `.min.js`,
`jtox-kit.kits.js` / `.min.js`, `jtox-kit.css`, `jtox-kit.zip`. Downstream sites
reference these by exact filename — renaming them is a breaking change.

## Embedding (how downstreams use it)

```html
<link rel="stylesheet" href=".../jtox-kit.css">
<link rel="stylesheet" href=".../jquery-ui-1.10.4.custom.min.css">
<link rel="stylesheet" href=".../jquery.ui.theme.css">
<link rel="stylesheet" href=".../jquery.range.css">
<!-- after body: jquery, jquery-ui, purl, jquery.range, then -->
<script src=".../libs/as-sys.min.js"></script>
<script src=".../libs/solr-jsx.min.js"></script>
<script src=".../libs/solr-jsx.widgets.min.js"></script>
<script src=".../www/jtox-kit.min.js"></script>
<script src=".../www/jtox-kit.widgets.min.js"></script>
<script src=".../www/jtox-kit.kits.min.js"></script>

<div class="jtox-kit" data-kit="FacetedSearch"
     data-configuration="Settings" data-lookup-map="lookup"></div>
```

- `class="jtox-kit"` marks an element for auto‑processing.
- `data-kit` selects the kit; `data-*` attrs pass init params.
- `data-configuration` names a global (an object, or `function(dataParams, kitInstance)`
  called in the kit's context); or `data-config-file` points at a JSON URL.
- The host page calls **`jT.ui.initialize()`** once the DOM + config globals exist.
- Config shape is kit‑specific — see `README.md` for a full `FacetedSearch`
  `Settings` example (`facets`, `pivot`, `listingFields`, `summaryRenderers`,
  `savedQueries`).

## Conventions

- `{{prop}}` and `{{formatter | prop}}` placeholders in template HTML are resolved
  by `jT.formatString` (`core/Tools.js`) and `jT.ui.bakeTemplate` (`widgets/Base.js`);
  template‑bound elements get `class="jtox-live-data"` + `.data('jtox-live-data')`.
- CSS is namespaced `.jtox-*`; `#jtox-bundle`, `.item-list`, `#sliders-controls`
  are jToxKit‑owned selectors.
- 2‑space indent, ES5, IIFE‑per‑file. Match the surrounding file.

## Tests

`tests/CoreSpec.js` — jasmine specs that hit a **live AMBIT sandbox**; configured
by `tests/local-config.js` (+ Postman collections `tests/*.postman_*.json`).
`tests/index.html` runs them in a browser. There are **no** widget/kit unit tests.
Expect `npm test` to fail without network + a working sandbox.

## Repo housekeeping

- `.gitignore`: `node_modules`, `*.log`, `.DS_Store`, `.idea`. **`www/` is
  tracked.**
- `wiki/` is a **git submodule** (`jToxKit.wiki.git`) — may be uninitialised;
  `git submodule update --init` if you need it.
- Branch from **`master`**. Before committing a change: rebuild `www/`, bump
  `package.json` `version`, and tag per the `postpublish` convention. Leave
  `composer.json` alone (stale).
- `TODO.md` holds the maintainer's backlog and a (partly aspirational) refactoring
  vision — not a spec of current behaviour.

## jQuery 3 / modernisation

See **`JQUERY3-COMPAT-AUDIT.md`** at the repo root. Summary: jToxKit's own JS is
broadly jQuery‑3.4.1‑safe (no `.size()`, `.andSelf()`, removed event shorthands;
2 `.bind()` + 8 `$.isArray`, all non‑blocking). The real jQuery‑3 blockers are
peer libs — **jQuery UI 1.10.4** (needs a 1.12.1 custom build) and `jquery.range`
(unverified). `bootstrap-tokenfield` only matters when `AutocompleteWidget`
`tokenMode` is enabled. DataTables 1.10.20 is fine on jQuery 3.

**Given the React rewrite, do not do the jQuery‑UI 1.12 migration here.** The
recommended path for the 11ty site is to keep its per‑layout jQuery split (the
jToxKit pages stay on jQuery 2.2.4) so this repo needs **no change at all**. A
global‑jQuery‑3 unification, if ever required, is a strong signal to move that
page to `jtoxkit-react` rather than to modernise this codebase.
