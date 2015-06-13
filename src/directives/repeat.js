nd.directives.create('repeat', function(d) {
	d.onInstantiate = function(el, id, directiveValue, api) {
		var expr = directiveValue;
		var parentScope = api.getClosestScope(el);
		var scope = api.createScope(parentScope);

		var objIterRegexp = new RegExp(/\((.+), *(.+)\) *in +(.+)/g);
		var objMatch = objIterRegexp.exec(expr);
		var arrIterRegexp = new RegExp(/(.+) +in +(.+)/g);
		var arrMatch = arrIterRegexp.exec(expr);

		var keyVarName, valVarName, collectionVarName, needCheckOwnProperty = false;
		var isArray = false;

		if (objMatch !== null) {
			// Iterating over object properties, like `(key, val) in obj`
			keyVarName = objMatch[1];
			valVarName = objMatch[2];
			collectionVarName = nd.ast.thisifyExpression(objMatch[3]);
			needCheckOwnProperty = true;
		}
		else if (arrMatch !== null) {
			// Iterating over array values, like `val in arr`
			keyVarName = '$index';
			valVarName = arrMatch[1];
			collectionVarName = nd.ast.thisifyExpression(arrMatch[2]);
			isArray = true;
		}
		else {
			// Uknown situation
			// TODO `nd-` prefix from API?
			throw "Unknown nd-repeat expression: " + expr + ". Directive supports iterating over object properties (key, value) or array values.";
		}

		var parentEl = el.parentNode;
		var elCopy = nd.utils.cloneNode(el, true);
		elCopy.removeAttribute('nd-repeat');
		var markComment = document.createComment('nd-repeat: ' + directiveValue);
		api.assignScopeToElement(scope, markComment);
		parentEl.insertBefore(markComment, el);
		parentEl.removeChild(el);

		var childrenEls = [];
		var data = { };


		function isOwnProperty(obj, key) {
			return obj.hasOwnProperty(key) && key.indexOf('$') < 0;
		}

		function refreshView() {
			var collection = api.getObjectValue(scope, data.observable);

			// TODO optimize: remove elements only for deleted values and update others
			for (var i = 0, n = childrenEls.length; i < n; ++i) {
				parentEl.removeChild(childrenEls[i]);
			}
			childrenEls.length = 0;

			for (var key in collection) {
				if (needCheckOwnProperty && !isOwnProperty(collection, key)) {
					continue;
				}

				var value = collection[key];

				scope[keyVarName] = isArray ? key*1 : key;
				scope[valVarName] = value;
				
				var clonedEl = nd.utils.cloneNode(elCopy, true);
				childrenEls.push(clonedEl);
				parentEl.insertBefore(clonedEl, markComment);

				api.refreshElementTree(clonedEl, ['nd-repeat']);
			}
		}

		return {
			onInit: function() {
				var observable = api.bindingExprToObservable(collectionVarName);
				api.observe(parentScope, observable, refreshView);
				data.observable = observable;

				refreshView();
			},
			onUpdate: refreshView
		};
	};
}, {
	priority: 8,
	manualElementTreeRefresh: true
});