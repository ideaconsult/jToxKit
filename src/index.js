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

_.assign(jT, _Tools);
jT.Listing = _List;
jT.Loading = _Load;

import _Accord from './widgets/AccordionExpansion';
import _Auto from './widgets/Autocompletion';
import _Current from './widgets/SearchStatusShowing';
import _Item from './widgets/ItemShowing';
import _ListItem from './widgets/ItemListing';
import _Log from './widgets/Logging';
import _Page from './widgets/PageShowing';
import _Pass from './widgets/Passing';
import _Pivot from './widgets/PivotShowing';
import _Range from './widgets/RangeShowing';
import _Slide from './widgets/SliderShowing';
import _Switch from './widgets/Switching';
import _Tag from './widgets/Tagging';
import _Text from './widgets/Texting';

jT.AccordionExpansion = _Accord;
jT.Autocompletion = _Auto;
jT.ItemShowing = _Item;
jT.ItemListing = _ListItem;
jT.Logging = _Log;
jT.PageShowing = _Page;
jT.Passing = _Pass;
jT.PivotShowing = _Pivot;
jT.RangeShowing = _Range;
jT.SliderShowing = _Slide;
jT.Switching = _Switch;
jT.Tagging = _Tag;
jT.Texting = _Text;
jT.SearchStatusShowing = _Current;

/** Wrapping all pre-defined widgets, from he skills here.
 */
// jT.widget = {
// 	SolrResult: a$(Solr.Listing, _Item, _Load)
// };

// Finally make space for the kits to self-register.
jT.kit = {};

export default jT;
