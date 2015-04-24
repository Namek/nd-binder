function ndInit($d, $da, $observe, analyzeBindingExpr) {
	function getDirectiveElements(directiveName, scope) {
		return $da(scope, '[nd-' + directiveName + ']');
	}

	function getAttr(el, name) {
		return el.getAttribute(name);
	}

	function getNdAttr(el, name) {
		return getAttr(el, 'nd-' + name);
	}

	function notifyError(msg) {
		console.error(msg);
	}

	var _scopeEls = getDirectiveElements('scope', document);
	var observablesByScopes = {};
	var bindingsByScopes = {};

	for (var i = 0; i < _scopeEls.length; ++i) {
		var scopeEl = _scopeEls[i];
		var scopeName = getAttr(scopeEl, 'nd-scope');
		var scope = window[scopeName];

		if (!scope) {
			notifyError('Scope ' + scopeName + ' was not found!');
			continue;
		}
		if (!observablesByScopes[scopeName]) {
			observablesByScopes[scopeName] = {};
		}
		var observables = observablesByScopes[scopeName];

		if (!bindingsByScopes[scopeName]) {
			bindingsByScopes[scopeName] = [];
		}
		var bindings = bindingsByScopes[scopeName];

		var firstCycleRefreshes = [];
		analyzeScope(scope, scopeName, scopeEl, observables, bindings, firstCycleRefreshes);

		for (var ri = 0, rn = firstCycleRefreshes.length; ri < rn; ++ri) {
			firstCycleRefreshes[ri]();
		}
	}

	function analyzeScope(scope, scopeName, scopeEl, observables, bindings, firstCycleRefreshes) {
		var _observes = getDirectiveElements('observe', scopeEl);
		var _ifs = getDirectiveElements('if', scopeEl);
		var _repeats = getDirectiveElements('repeat', scopeEl);
		var _binds = getDirectiveElements('bind', scopeEl);

		for (var ib = 0; ib < _binds.length; ++ib) {
			var bindEl = _binds[ib];
			var bindExpr = getNdAttr(bindEl, 'bind');
			var expr = analyzeBindingExpr(bindExpr);

			var bind = {
				el: bindEl,
				expr: expr,
				fullExpr: bindExpr,
				accessors: getElementValueAccessors(bindEl),
				observable: eval(scopeName+'.'+expr.observable),
				refresh: function() {
					var value = eval(scopeName+'.'+bind.fullExpr);
					console.log(value);
					bind.accessors.set(value);
				}
			};
			bindings.push(bind);

			$observe(bind.observable, function(changes) {
				console.log('refreshing ' + bind.fullExpr);
				bind.refresh();
			});
			firstCycleRefreshes.push(bind.refresh);
		}

		for (var io = 0; io < _observes.length; ++io) {
			var observeEl = _observes[io];
			var observeExpr = getNdAttr(observeEl, 'observe');
			var observedData = scope[observeExpr];

			if (!observables[observeExpr]) {
				observables[observeExpr] = [];
			}
			observables[observeExpr].push({
				el: observeEl,
				expr: observeExpr,
				data: observedData
			});
			
			$observe(observedData, function(changes) {
				// TODO
				// console.log(changes)
			});
		}
	}

	function getElementValueAccessors(el) {
		var tag = el.tagName.trim();
		var fieldName = (tag === 'input' || tag === 'select') ? 'value' : 'innerHTML';

		return {
			get: function() {
				return el[fieldName];
			},
			set: function(value) {
				el[fieldName] = value;
			}
		};
	}
	

	function createDirective() {

	}

	function refreshNodes() {

	}

	// directive -> directiveInstance
	// observe(nd-observe) -> onchange -> refresh nd-observe children
	// 
}

function ndInitStandard() {
	var $d = function() {
		var query = arguments[arguments.length == 1 ? 0 : 1];
		var el = arguments.length == 1 ? document : arguments[0];
		return el.querySelector(query);
	};
	var $da = function() {
		var query = arguments[arguments.length == 1 ? 0 : 1];
		var el = arguments.length == 1 ? document : arguments[0];
		return el.querySelectorAll(query);
	};
	var observe = function(obj, cb) {
		Object.observe(obj, cb);
	};

	ndInit($d, $da, observe, analyzeBindingExpr);
}


// This function uses a trick to get the last part (`path`) separated from `observable` expression.
// It may be needed to improve that, use then Pratt's Expression Parser:
// http://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy/
function analyzeBindingExpr(expr) {
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
}