nd.directives.create('repeat', function(d) {
	// in example `person in people` the `people` object has to be accessible like in custom scope.
	// TODO problem!!! inheriting from nd-scope will be needed here ;/
	d.onInstantiate = function(el, id, directiveValue, api) {
		var parentScope = api.getClosestScope(el);
		var scope = api.createScope(parentScope);


		// TODO clone `el` contents (or probably just save innerHTML)
		// TODO analyze directiveValue for sth like `var in var` (example: `person in people`)
	};
});