/** jToxKit - chem-informatics multi-tool-kit.
 * Skills for authenticating requests
 *
 * Author: Ivan (Jonan) Georgiev
 * Copyright © 2019, IDEAConsult Ltd. All rights reserved.
 */

import a$ from 'as-sys'
import _ from 'lodash'

function Authenticating(settings) {
	a$.setup(this, Authenticating.prototype, settings);

	// Setup the ajaxSettings, according to the required authentication method.
	if (settings.authMethod === 'Basic') {
		_.extend(this.ajaxSettings, { 
			headers: { 
				'Authorization': "Basic " + btoa(this.username + ':' + this.password) 
			} 
		});
	}
};

Authenticating.prototype = {
	username: null,
	password: null,
	authMethod: null,
	ajaxSettings: null,
};

export default Authenticating;
