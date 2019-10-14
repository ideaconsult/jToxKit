import pkg from './package.json'

export default {
	input: pkg.module,
	output: {
		file: pkg.main,
		format: 'umd',
		interop: false,
		name: pkg.name,
		banner: '/** jToxKit - Chem-informatics UI tools, widgets and kits library. Copyright © 2016-2019, IDEAConsult Ltd. All rights reserved. @license MIT.*/',
		globals: { 
			"lodash" : "_",
			"as-sys": "asSys",
			"jquery": "$",
			"solr-jsx": "Solr",
			"ambit-jsx": "Ambit",
			"jtox-kit": "jToxKit"
		}
	},
	external: [ "lodash", "as-sys", "jquery", "solr-jsx", "ambit-jsx" ]
};
