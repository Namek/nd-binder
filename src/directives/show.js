nd.directives.create('show', function(d) {
	d.onFirstRun = function(api) {
		api.createClass('nd-hide', 'display: none');
	};

	d.onInstantiate = function(el, id, directiveValue, api) {
		// TODO assert ast.type === 'BoolExpression'
		var boolExpr = nd.ast.thisifyExpression(directiveValue);
		var scope = api.getClosestScope(el);
		var observables = api.exprToObservables(boolExpr);

		for (var i = 0; i < observables.length; ++i) {
			api.observe(scope, observables[i], refreshView);
		}

		function refreshView() {
			var shouldHideEl = !scope.eval(boolExpr);
			api.defineClass('nd-hide', el, shouldHideEl);
		}

		api.queue(refreshView);

		return {
			onInit: refreshView,
			onUpdate: refreshView
		};
	};
});
