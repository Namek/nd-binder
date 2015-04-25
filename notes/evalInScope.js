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