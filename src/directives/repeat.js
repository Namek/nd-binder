nd.directives.create('repeat', function(d) {
	d.onInstantiate = function(el, id, directiveValue, api) {
		var expr = directiveValue;
		var parentScope = api.getClosestScope(el);
		var scope = api.createScope(parentScope);

		var objIterRegexp = new RegExp(/\((.+), *(.+)\) *in +(.+)/g);
		var objMatch = objIterRegexp.exec(expr);
		var arrIterRegexp = new RegExp(/(.+) +in +(.+)/g);
		var arrMatch = arrIterRegexp.exec(expr);

		var keyVarName, valVarName, collectionVarName;

		if (objMatch !== null) {
			// Iterating over object properties, like `(key, val) in obj`
			keyVarName = objMatch[1];
			valVarName = objMatch[2];
			collectionVarName = nd.ast.thisifyExpression(objMatch[3]);
		}
		else if (arrMatch !== null) {
			// Iterating over array values, like `val in arr`
			keyVarName = '$index';
			valVarName = arrMatch[1];
			collectionVarName = nd.ast.thisifyExpression(arrMatch[2]);
		}
		else {
			// Uknown situation
			// TODO `nd-` prefix from API?
			throw "Unknown nd-repeat expression: " + expr + ". Directive supports iterating over object properties (key, value) or array values.";
		}

		var clonedEl = nd.utils.cloneNode(el, true);

		var observable = api.bindingExprToObservable(collectionVarName);
		var collection = api.observe(scope, observable, refreshView);
		api.queue(refreshView);

		function refreshView() {
			// TODO optimize: remove elements only for deleted values and update others
			while (el.childNodes.length) {
				el.removeChild(el.childNodes[0]);
			}

			for (var key in collection) {
				var value = collection[key];

				scope[keyVarName] = key;
				scope[valVarName] = value;
				
				for (var i = 0, n = clonedEl.childNodes.length; i < n; ++i) {
					var childEl = nd.utils.cloneNode(clonedEl.childNodes[i], true);
					el.appendChild(childEl);
					// TODO call some update for those elements and (key, val) pair.
				}
			}
		}

		return { };
	};
});