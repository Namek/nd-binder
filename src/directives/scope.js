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

		// TODO byc moze zamiast `child-scope` dac tutaj mozliwosc
		// wstawienia po przecinku nazwy scope'a-rodzica
		// var parentScope = api.getClosestScope(el);
		var parentScope = api.getRootScope();
		api.inheritScope(scope, parentScope);
		api.registerScopeName(scope, scopeName);

		// TODO ?
		return { };
	};
}, 1000);

// TODO trzeba zmienic to ponizej bo nie zgadza sie z inheritem (chyba?)
nd.directives.create('child-scope', function(d) {
	d.onInstantiate = function(el, id, directiveValue, api) {
		var parentScope = null;
		var scopeName = null;

		if (!directiveValue) {
			parentScope = api.getClosestScope(el);
		}
		else if (directiveValue.indexOf(',') > 0) {
			var scopeNames = directiveValue.split();
			scopeName = scopeNames[0];
			var parentScopeName = scopeNames[1];

			parentScope = api.getParentScopeByName(parentScopeName, el);
		}
		else {
			scopeName = directiveValue;
			parentScope = api.getClosestScope(el);
		}

		var newScope = api.createScope(parentScope);

		if (scopeName) {
			api.registerScopeName(newScope, scopeName);
		}

		// TODO ?
		return { };
	};
}, 999);
