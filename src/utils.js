nd.utils = (function() {
return {
	$d: function() {
		var query = arguments[arguments.length == 1 ? 0 : 1];
		var el = arguments.length == 1 ? document : arguments[0];
		return el.querySelector(query);
	},
	$da: function() {
		var query = arguments[arguments.length == 1 ? 0 : 1];
		var el = arguments.length == 1 ? document : arguments[0];
		return el.querySelectorAll(query);
	},

	observe: function(obj, cb) {
		if (Array.isArray(obj)) {
			Array.observe(obj, cb);
		}
		else {
			Object.observe(obj, cb);
		}
	}
};
})();