nd.utils = (function() {
var classSyntaxErr = 'nd-class should have syntax like: "{ red: people.length == 0, green: people.length > 0 }"';
var utils = {
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
		// TODO maybe just Array.isArray() ?
		if (Object.prototype.toString.call(obj) === '[object Array]') {
			Array.observe(obj, cb);
		}
		else {
			Object.observe(obj, cb);
		}
	},

	evalInScope: function(context, js) {
		with (context) {
			return eval(js);
		}
	},

	// This function uses a trick to get the last part (`path`) separated from `observable` expression.
	// It may be needed to improve that, use then Pratt's Expression Parser:
	// http://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy/
	analyzeBindingExpr: function(expr) {
		expr = expr.trim();
		var lastChar = expr[expr.length-1];
		var i;

		if (lastChar == ']') {
			// find first '[' character
			var balance = +1;
			for (i = expr.length-2; i >= 0 && balance !== 0; i--) {
				var c = expr[i];
				balance += (expr[i] === ']') ? 1 : (expr[i] === '[' ? -1 : 0);
			}

			if (balance !== 0) {
				throw "Expression is invalid: " + expr;
			}

			return {
				observable: expr.substring(0, i+1),
				path: expr.substring(i+1, expr.length)
			};
		}
		else {
			// find first '.' (dot) character
			for (i = expr.length-1; i >= 0; i--) {
				if (expr[i] === '.') {
					return {
						observable: expr.substring(0, i),
						path: expr.substring(i, expr.length)
					};
				}
			}
		}

		throw "Analyzer couldn't parse expression: " + expr;
	},

	evalBoolExprForScope: function(scope, scopeName, expr) {
		return utils.evalInScope(scope, expr);
	},

	evalClassesForScope: function(scope, scopeName, classesStr) {
		var expr = classesStr.trim();
		if (!(expr[0] == '{' && expr[expr.length-1] == '}')) {
			throw classSyntaxErr;
		}

		var exprs = expr.substring(1, expr.length-1).split(',');
		var pairs = {};
		for (var i = 0, n = exprs.length; i < n; ++i) {
			var keyAndExpr = exprs[i].split(':');

			if (keyAndExpr.length !== 2) {
				throw classSyntaxErr;
			}

			pairs[keyAndExpr[0].trim()] = utils.evalBoolExprForScope(scope, scopeName, keyAndExpr[1].trim());
		}

		return pairs;
	},

	defineClass: function(el, className, turnOn) {
		if (turnOn) {
			el.classList.add(className);
		}
		else {
			el.classList.remove(className);
		}
	}
};
return utils;
})();