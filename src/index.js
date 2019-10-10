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

_.assign(jT, _Tools);

import _Accord from './widgets/AccordionExpansion';
import _Auto from './widgets/Autocompletion';
import _Current from './widgets/CurrentSearch';
import _Item from './widgets/Item';
import _List from './widgets/ItemList';
import _Log from './widgets/Logging';
import _Page from './widgets/Pager';
import _Pass from './widgets/Passing';
import _Pivot from './widgets/Pivot';
import _Range from './widgets/Ranger';
import _Slide from './widgets/Slider';
import _Switch from './widgets/Switching';
import _Tag from './widgets/Tagging';
import _Text from './widgets/Text';
import _Load from './widgets/Loader';

jT.AccordionExpansion = _Accord;
jT.Autocompletion = _Auto;
jT.CurrentSearch = _Current;
jT.Item = _Item;
jT.ItemList = _List;
jT.Logging = _Log;
jT.Pager = _Page;
jT.Passing = _Pass;
jT.Pivot = _Pivot;
jT.Range = _Range;
jT.Slider = _Slide;
jT.Switching = _Switch;
jT.Tagging = _Tag;
jT.Text = _Text;
jT.Loader = _Load;

/** Wrapping all pre-defined widgets, from he skills here.
 */
jT.widget = {
	Result: a$(Solr.Listing, jT.ListWidget, ItemList, _Load)

};

// import kit_Facet from './kits/FacetedSearch';
// import kit_Log from './kits/Logging';

// jT.kit = {
// 	FacetedSearch: kit_Facet,
// 	Log: kit_Log
// }

export default jT;
