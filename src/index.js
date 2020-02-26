/** jToxKit - chem-informatics multi-tool-kit.
 * Base for widgets and UI-related stuff
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved.
 */

import _ from 'lodash';
import a$ from 'as-sys';
import Solr from 'solr-jsx';
import Ambit from 'ambit-jsx';

import jT from './Core';
import _Tools from './Integration';
import _Helpers from './HelpersUI';
import _Populate from './Populating';
import _Load from './Loading';
import _Item from './ItemRendering';
import _Comm from './Communicating';
import _Delay from './Delaying';
import _Auth from './Authenticating';
import _Spying from "./Spying";
import _Export from "./Exporting";

_.assign(jT, _Tools, _Helpers);

jT.Populating = _Populate;
jT.Loading = _Load;
jT.ItemRendering = _Item;
jT.Communicating = _Comm;
jT.Delaying = _Delay;
jT.Authenticating = _Auth;
jT.Spying = _Spying;
jT.Exporting = _Export;

import _Accord from './widgets/AccordionExpander';
import _Auto from './widgets/Autocompleter';
import _Log from './widgets/Logger';
import _Page from './widgets/Pager';
import _Pass from './widgets/Passer';
import _Pivot from './widgets/Pivoter';
import _Range from './widgets/Ranger';
import _Slide from './widgets/Slider';
import _Switch from './widgets/Switcher';
import _Tag from './widgets/Tagger';
import _Text from './widgets/Texter';

import _SolrReporter from './widgets/SolrQueryReporter';
import _SolrResult from './widgets/SolrItemLister';
import _AmbitModeller from './widgets/AmbitModelViewer';


jT.AccordionExpander = _Accord;
jT.Autocompleter = _Auto;
jT.Logger = _Log;
jT.Pager = _Page;
jT.Passer = _Pass;
jT.Pivoter = _Pivot;
jT.Ranger = _Range;
jT.Slider = _Slide;
jT.Switcher = _Switch;
jT.Tagger = _Tag;
jT.Texter = _Text;

jT.SolrQueryReporter = _SolrReporter;
jT.SolrItemLister = _SolrResult;

jT.AmbitModelViewer = _AmbitModeller;


/** Wrapping all pre-defined widgets, from he skills here.
 */
jT.widget = {
	SolrResult: a$(Solr.Listing, _Populate, _SolrResult, _Load),
	SolrPaging: a$(Solr.Paging, _Page),
	Logger: _Log,
	AmbitModeller: a$(_AmbitModeller, Ambit.Modelling, Ambit.Tasking),
	AmbitAlgorithmer: a$(_AmbitModeller, Ambit.Algorithming)
};

// Make space for the kits to self-register.
jT.kit = {};

// Finally make some module-name maintanence steps.

(	typeof global !== "undefined" ? global :
	typeof self !== "undefined" ? self :
	typeof window !== "undefined" ? window : {})['jT'] = jT;

export default jT;
