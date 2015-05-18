nd.directives.create('class', function(d) {
	d.onInstantiate = function(el, id, directiveValue, api) {
		var objectExpr = directiveValue;
		var scope = api.getClosestScope(el);
		var exprsByClasses = null;

		try {
			exprsByClasses = api.objectExprToExprs(objectExpr);
		} catch (exc) {
			throw 'nd-class should have syntax like: "{ red: people.length == 0, green: people.length > 0 }"';
		}

		for (var className in exprsByClasses) {
			var classExpr = nd.ast.thisifyExpression(exprsByClasses[className]);
			exprsByClasses[className] = classExpr;

			var observables = api.exprToObservables(classExpr);

			for (var i = 0; i < observables.length; ++i) {
				api.observe(scope, observables[i], refreshView);
			}
		}

		function refreshView() {
			// TODO optimize this refresher!
			// Don't refresh all classes - eval expressions only for updated observables.
			for (var className in exprsByClasses) {
				var classExpr = exprsByClasses[className];
				var classIsSet = !!scope.eval(classExpr);

				api.defineClass(className, el, classIsSet);
			}
		}

		api.queue(refreshView);

		return {
			onObservableChanged: refreshView()
		};
	};
});
