function evalInScope(context, js) {
	with (context) {
		return eval(js);
	}
}

var PeopleScope = new function() {
	this.page = {
		name: 'People'
	};
	this.people = [
		{
			fname: 'John',
			lname: 'Depp'
		},
		{
			fname: 'Jet',
			lname: 'Li'
		}
	];
};

evalInScope(PeopleScope, 'people');



function evalInContext(js, context) {
	//# Return the results of the in-line anonymous function we .call with the passed context
	return function() { return eval(js); }.call(context);
}

var rootScope = (function() {
	function RootScope() { }
	RootScope.prototype = {
		eval: function(code) {
			return evalInContext(code, this);
		}
	};
	
	return new RootScope();
})();

function createScope(parentScope) {
	if (!parentScope) {
		parentScope = rootScope;
	}

	function Scope() { }
	Scope.prototype = parentScope;

	return new Scope();
}
