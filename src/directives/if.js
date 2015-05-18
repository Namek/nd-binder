nd.directives.create('if', function(d) {
	d.onInstantiate = function(el, id, directiveValue, api) {
		// TODO assert ast.type === 'BoolExpression'
		var boolExpr = nd.ast.thisifyExpression(directiveValue);
		var scope = api.getClosestScope(el);

		api.queue(function() {
			var shouldRemoveEl = !scope.eval(boolExpr);

			if (shouldRemoveEl) {
				// remove element completely
				var parent = el.parentNode;
				var comment = '<' + el.tagName + '> removed: ' + directiveValue + ' was falsy';
				// TODO get `nd-` prefix from API?
				parent.insertBefore(document.createComment(comment), el);
				parent.removeChild(el);
			}
			else {
				// TODO get `nd-` prefix from API?
				el.removeAttribute('nd-if');
			}
		});

		return { };
	};
});