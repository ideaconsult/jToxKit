/** jToxKit - chem-informatics multi-tool-kit.
 * Base for widgets and UI-related stuff
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved.
 */

import _ from 'lodash';
import a$ from 'as-sys';

import jT from './Core';
import _Tools from './Integration';
import _List from './Listing';
import _Load from './Loading';
import _Item from './Iteming';

_.assign(jT, _Tools);
jT.Listing = _List;
jT.Loading = _Load;
jT.Iteming = _Item;

import _Accord from './widgets/AccordionExpander';
import _Auto from './widgets/Autocompleter';
import _Resulter from './widgets/SolrResulter';
import _Log from './widgets/Logger';
import _Page from './widgets/Pager';
import _Pass from './widgets/Passer';
import _Pivot from './widgets/Pivoter';
import _Range from './widgets/Ranger';
import _Slide from './widgets/Slider';
import _Switch from './widgets/Switcher';
import _Tag from './widgets/Tagger';
import _Text from './widgets/Texter';
import _Current from './widgets/SearchReporter';

jT.AccordionExpander = _Accord;
jT.Autocompleter = _Auto;
jT.SolrResulter = _Resulter;
jT.Logger = _Log;
jT.Pager = _Page;
jT.Passer = _Pass;
jT.Pivoter = _Pivot;
jT.Ranger = _Range;
jT.Slider = _Slide;
jT.Switcher = _Switch;
jT.Tagger = _Tag;
jT.Texter = _Text;
jT.SearchReporter = _Current;

/** Wrapping all pre-defined widgets, from he skills here.
 */
// jT.widget = {
// 	SolrResult: a$(Solr.Listing, _Item, _Load)
// };

// Make space for the kits to self-register.
jT.kit = {};

// Finally make some module-name maintanence steps.

(	typeof global !== "undefined" ? global :
	typeof self !== "undefined" ? self :
	typeof window !== "undefined" ? window : {})['jT'] = jT;

export default jT;
