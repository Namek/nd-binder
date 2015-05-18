// bind: one-way (model to view) data binding
nd.directives.create('bind', function(d) {
	d.onInstantiate = function(el, id, directiveValue, api) {
		var bindExpr = nd.ast.thisifyExpression(directiveValue);
		var observable = api.bindingExprToObservable(bindExpr);
		var accessors = api.getElementValueAccessors(el);
		var scope = api.getClosestScope(el);

		function refreshView() {
			var newValue = api.getObjectValue(scope, observable); 
			accessors.set(newValue);
		}

		api.observe(scope, observable, refreshView);
		api.queue(refreshView);

		return {
			onObservableChanged: refreshView
		};
	};
});

// model: two-way data binding
nd.directives.create('model', function(d) {
	/*
	d.onInstantiate = function(el, id, directiveValue, api) {
		var observable = api.bindingExprToObservable(directiveValue);
		var accessors = api.getElementValueAccessors(el);
		var scope = api.getClosestScope(el);

		var inst = {
			onObservableChanged: function() {
				var newValue = api.getObjectValue(scope, observable);
				accessors.set(newValue);
			}
		};

		api.observe(scope, observable, inst.onObservableChanged);
		api.registerElementValueListener(el, function(newValue) {
			api.setObjectValue(scope, observable, newValue);
		});

		return inst;
	};*/
	var dBind = directives.get('bind');
	d.onInstantiate = function(el, id, directiveValue, api) {
		var scope = api.getClosestScope(el);
		var inst = dBind.onInstantiate(el, id, directiveValue, api);

		api.registerElementValueListener(el, function(newValue) {
			api.setObjectValue(scope, observable, newValue);
		});

		return inst;
	};
});
