# jToxKit — jQuery 3 / jQuery‑UI / Bootstrap 4 / CSS‑reset compatibility audit

Context: the host site (an Eleventy 0.12 + jQuery + Bootstrap 4 + plain‑CSS static
front end that embeds jToxKit for its search / data‑entry / visualisation pages) is
getting a UX overhaul. It removes its old marketing‑template CSS/JS and adds a
purpose‑built theme on the *same* stack. jToxKit + solr‑jsx are vendored into the
site's `assets/lib/` by its `scripts/assets.sh`. This document records whether
jToxKit is safe under (a) a single global jQuery 3.x, (b) the new CSS layer, and
what jToxKit‑side work a full unification would need.

Audited: local `master` @ `b7bb4c0` (package.json **2.4.3**). The host site
currently vendors **2.4.0** — `www/` output is essentially identical between the
two.

---

## TL;DR / recommendation

**jToxKit's own JS is broadly jQuery‑3.4.1‑safe.** The blockers are its *peer
libraries*, and only on the FacetedSearch page:

| Peer lib (as bundled) | jQuery 3 status | Used by the host site? |
|---|---|---|
| jQuery UI **1.10.4** | ❌ hard‑incompatible with jQuery 3 — needs **1.12.1** | yes — `.tabs/.accordion/.autocomplete/.resizable/.slider` |
| bootstrap‑tokenfield **0.12.x** | ❌ broken on jQuery 3 | **no** — the site sets `tokenMode:false`, so it is never invoked |
| jquery.range (jRange) | ⚠️ unverified on jQuery 3 | yes — numeric facet sliders (`SliderWidget`) |
| DataTables **1.10.20** | ✅ supports jQuery 1.7–3.x | yes |
| lodash / purl / solr‑jsx / as‑sys | ✅ jQuery‑independent | yes |

**Do this now (zero jToxKit change):** keep the host site's existing per‑layout
jQuery split — the two jToxKit layouts (FacetedSearch, AOP) stay on **jQuery 2.2.4
+ jQuery‑UI 1.10.4**; every other layout stays on jQuery 3.4.1. The UX overhaul
proceeds everywhere with no jToxKit risk.

> **jToxKit is in maintenance mode** — a React rewrite exists at
> `github.com/ideaconsult/jtoxkit-react`. Keep changes to *this* repo to the
> minimum the 11ty site needs. Do **not** invest in the jQuery‑UI 1.12 migration
> below unless there is no alternative; a genuine need for global jQuery 3 is a
> reason to move that page to `jtoxkit-react`, not to modernise this codebase. The
> unification plan is kept here only as a record of scope.

---

## 1. Dependency baseline

From `README.md` §Dependencies and `libs/`:

- **jQuery 1.10.2** (`libs/jquery.js`).
- **jQuery UI 1.10.4** custom build with Slider (`libs/jquery-ui.min.js`) +
  `libs/jquery.ui.theme.css`.
- **jquery.range** (jRange) + `libs/jquery.range.css`.
- **DataTables 1.10.20** (+ `dataTables.jqueryui` skin).
- **bootstrap‑tokenfield 0.12.x** (`libs/bootstrap-tokenfield.min.*`; added in
  commit `4110d40` "because they are used").
- lodash, purl, solr‑jsx, @thejonan/as‑sys, xlsx‑datafill, xlsx‑populate.
- **Bootstrap: not bundled and barely referenced.** `kits/*.html` contains only
  `fa fa-*` icons (×6) and a single `data-toggle`. No BS3 grid (`col-xs-*`), no
  `panel*`, no `glyphicon`, no `input-group-addon`. jToxKit is effectively
  **Bootstrap‑version‑agnostic** — Bootstrap 3 → 4 on the host is a non‑issue for
  jToxKit.

## 2. jToxKit own‑code scan for jQuery‑3‑removed APIs

Searched `core/ widgets/ kits/js/`:

| Removed/changed in jQuery 3 | Found in jToxKit? |
|---|---|
| `.size()` | none |
| `.andSelf()` | none |
| `.load()/.unload()/.error()` as event shorthands | none |
| `$.browser` | none |
| `.bind()` | 2× in `kits/js/LoggingKit.js:41‑42` — deprecated but still works in 3.x |
| `$.isArray` | 8× — deprecated (3.2) but present through 3.x (removed only in 4.0) |
| `$.trim`, `$.isFunction`, `$.parseJSON`, `$.type`, `$.now` | none |
| `$.fn.jquery` version assertions | none |

**Conclusion:** no hard blockers in jToxKit's own code for jQuery 3.4.1. The
`.bind()` and `$.isArray` uses are cosmetic and can be modernised opportunistically
(`.on()`, `Array.isArray`).

## 3. jQuery‑UI usage (the real constraint)

jToxKit calls these jQuery‑UI widgets:

- `.accordion()` — `kits/js/FacetedSearchKit.js:142,257`, `widgets/AccordionExpansion.js:64`, `kits/js/PivotWidget.js:109`
- `.tabs()` — `widgets/Base.js:150`, `kits/js/FacetedSearchKit.js:243,473,518`, `kits/js/{CompoundKit,StudyKit,MatrixKit,QueryKit}.js`
- `.autocomplete()` — `widgets/AutocompleteWidget.js:53,72`, `kits/js/QueryKit.js:67,99,103`
- `.resizable()` — `kits/js/FacetedSearchKit.js:245`
- `.slider()` — via the custom UI build (SliderWidget fallback / theme)

All five are **stable in API and markup from jQuery‑UI 1.10 → 1.12**. jQuery‑UI
**1.12.1** is the last release and officially supports jQuery 1.7–3.x. Swapping the
bundled build to a 1.12.1 custom build (Core, Widget, Position, Accordion, Tabs,
Autocomplete, Menu, Resizable, Slider, Mouse) is the single required change to make
jToxKit run under jQuery 3. Minor theme‑CSS class deltas (1.11 `menu`
restructuring, `ui-autocomplete` unchanged) need a visual pass but no code change.

## 4. Peer‑lib specifics

- **bootstrap‑tokenfield 0.12.x** — abandoned; breaks under jQuery 3 (internal
  `.size()` etc.). Used only by `widgets/AutocompleteWidget.js` when
  `this.tokenMode` is true (`:56` `tokenfield:removedtoken`, `:59`
  `.tokenfield({autocomplete: boxOpts})`, `:62/:70/:77`). **The host site sets
  `tokenMode:false`** in its search settings, so tokenfield is loaded but never
  invoked. For jQuery 3 it can simply be dropped; `AutocompleteWidget` then always
  uses jQuery‑UI `.autocomplete()`.
- **jquery.range (jRange)** — `widgets/SliderWidget.js:52,55,91`
  (`jRange('updateRange'|'setValue')`, `this.target.jRange(settings)`). Small file
  (`libs/jquery.range.js`, ~13 KB). jQuery 3 compatibility unverified; likely only
  minor `.bind`/`.change()` trigger issues. Needs a functional test on numeric
  facet ranges and a small patch, or replacement with the jQuery‑UI slider (which
  the UI build already ships).
- **DataTables 1.10.20** — fine on jQuery 3; no action.

## 5. CSS interaction with the host site's new theme layer

`www/jtox-kit.css` (built from `kits/css/*.css` via `smash`) global‑ish rules:

- `a, section.item-list article.item a, #sliders-controls a { color:#8C0305;
  text-decoration:underline }` (`~L615`) — the bare `a` part styles every link on
  a jToxKit page. This is **existing behaviour**.
- `html, body, #jtox-bundle { width:100%; height:100% }` (`~L1209`, `~L1650`) —
  from MatrixKit CSS. **MatrixKit is not used by the host site** (`data-kit`
  values in use: `FacetedSearch`, `logging`, `Study`, `Query`, `Compound`,
  `AutocompleteWidget`), so this is inert there but still present in the bundle.
- `strong { font-weight:bold }`, and an `@media print { * { … } }` block
  (`~L1607`) — harmless.

**Rules for the host site's new stylesheet:**
1. Load order **`bootstrap.min.css` → `jtox-kit.css` → new theme CSS** so the site
   theme wins ties, but…
2. …the theme reset must stay **mild and unscoped‑safe**: `body{margin:0}` +
   `*,*::before,*::after{box-sizing:border-box}` + `:focus-visible{…}`. Do **not**
   ship `* { margin:0; padding:0 }` (the outgoing template CSS does — jToxKit
   tolerates it today, but it is fragile).
3. The reset / link / typography rules must **not** target `.jtox-*`, `#jtox-*`,
   `.item-list`, `#sliders-controls`, `.ui-*`, `.dataTable*`. Keep `!important`
   out of the reset.
4. Keep loading `jquery.ui.theme.css`, `jquery.range.css`, `datatables*.css`,
   `bootstrap-tokenfield.min.css` on the jToxKit layouts exactly as now.

With those constraints, the new theme and jToxKit coexist without a jToxKit change.

## 6. Build & re‑vendor mechanics

`package.json` scripts (toolchain is old — `smash`, `jasmine-node`, travis pins
node 5 — but installable):

- `pretest` → regenerates `www/jtox-kit.js` from `core/` (`sed` version stamp →
  `smash core/start.js`).
- `test` → `jasmine-node tests` (hits a live AMBIT sandbox — skip offline) then
  `uglifyjs --ie8` min files, then `npm run widgets`, `npm run kits`.
- `widgets` → `smash widgets/Base.js > www/jtox-kit.widgets.js` (+ min).
- `kits` → `smash kits/js/*.js` + `cat kits/*.html | bin/html2js.pl` →
  `www/jtox-kit.kits.js` (+ min); `smash kits/css/*.css > www/jtox-kit.css`.

**Rebuild only what the host site consumes** (`jtox-kit.js`, `jtox-kit.widgets.js`,
`jtox-kit.kits.js`, `jtox-kit.css`):

```sh
npm install                 # smash, uglify-js
# sed version stamp as in the pretest script, then:
npx smash core/start.js > www/jtox-kit.js
npm run widgets
npm run kits
# skip: jasmine-node (needs live endpoints)
```

**Re‑vendor into the host site:** its `scripts/assets.sh` copies
`node_modules/@ideaconsult/jtox-kit/www/*` → `assets/lib/`. So point the site at
the jToxKit branch via one of: `npm install <path-to-local-jToxKit>` / `npm link`,
a git dependency pinned to the branch commit, or a manual copy of `www/jtox-kit*`
into `assets/lib/`. Bump the site's dependency from 2.4.0 to match.

## 7. Branch/versioning rule

Any jToxKit change forks from **`master`** (currently 2.4.3), not `development`.
Rebuild `www/`, tag/bump per `package.json` `postpublish` conventions, and record
the branch/commit as the pinned dependency of the host site's UX branch.

---

## Unification plan (jQuery 3.x everywhere)

**Kept for reference only.** With `jtoxkit-react` as the forward path, this
migration should not be done in this repo. Not required for the UX overhaul.
Undertake only as a last resort, with a full FacetedSearch regression pass.

### jToxKit repo (branch off `master`)

1. **jQuery‑UI 1.10.4 → 1.12.1.** Replace `libs/jquery-ui.min.js` /
   `libs/jquery-ui.min.css` with a 1.12.1 custom build containing: Core, Widget,
   Position, Mouse, Accordion, Tabs, Menu, Autocomplete, Resizable, Slider.
   Update `README.md` script/style list (`:53‑65`). Visual pass on accordion,
   tabs, autocomplete dropdown, resizable handle themes.
2. **Drop the tokenfield path.** Remove the `tokenfield` branch in
   `widgets/AutocompleteWidget.js` (or guard it behind a clearly‑optional flag);
   `AutocompleteWidget` uses jQuery‑UI `.autocomplete()` unconditionally. Remove
   `libs/bootstrap-tokenfield.min.*`.
3. **`jquery.range` on jQuery 3.** Test numeric facet ranges (`SliderWidget`).
   If broken, patch `libs/jquery.range.js` (`.bind`→`.on`, event‑trigger
   signatures) or switch `SliderWidget` to the jQuery‑UI slider already in the
   1.12.1 build.
4. **Modernise the 2 `.bind()` calls** (`kits/js/LoggingKit.js:41‑42`) and the 8
   `$.isArray` (future jQuery 4 safety) — optional.
5. Rebuild `www/` (§6), bump version, tag.

### Host site repo

6. Bump `@ideaconsult/jtox-kit` to the new version; re‑run `scripts/assets.sh`.
7. In the FacetedSearch and AOP layouts: swap `jquery-2.2.4.min.js` →
   `jquery-3.4.1.min.js`; drop the `bootstrap-tokenfield.min.{js,css}`
   `<link>`/`<script>`; point `jquery-ui-1.10.4.custom.min.*` at the 1.12.1 build.
8. Regression: serve locally, open the FacetedSearch page and the Study / Query /
   Compound pages — verify `jT.ui.initialize()` is clean, free‑text autocomplete,
   accordion facets, numeric range sliders, result tabs, resizable divider, export
   (`#export_select`/`#export_go`), basket. Run the site's Selenium spec.
