nd.directives.create('scope', function(d) {
	d.onInstantiate = function(el, id, directiveValue, api) {
		var scopeName = directiveValue;

		if (!scopeName) {
			throw "Scope without a name doesn't make any sense!";
		}

		var scope = window[scopeName];

		if (!scope) {
			throw "There is no scope in: window['" + scopeName + "']";
		}
		
		// api.registerScopeName(scope, scopeName);
		// var scopeId = api.registerScope(scope);
		api.assignScopeToElement(scope, el);

		// TODO ?
		return { };
	};
}, {
	priority: 10
});

// TODO nd.directives.create('subscope', ...