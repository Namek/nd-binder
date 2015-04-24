function ndInit($d, $da, $observe, analyzeBindingExpr, evalBoolExprForScope) {
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

	function getScopeData(scopeName) {
		if (!_scopesData[scopeName]) {
			throw "Scope Data doesn't exist for scope: " + scopeName;
		}

		return _scopesData[scopeName];
	}

	var _scopeEls = getDirectiveElements('scope', document);
	var _scopesData = {}; // map: scope data by name

	for (var i = 0; i < _scopeEls.length; ++i) {
		var scopeEl = _scopeEls[i];
		var scopeName = getAttr(scopeEl, 'nd-scope');
		var scope = window[scopeName];

		if (!scope) {
			notifyError('Scope ' + scopeName + ' was not found!');
			continue;
		}
		var scopeData = _scopesData[scopeName] = {
			scope: scope,			//the actual scope (custom user's data)
			scopeEl: scopeEl,
			scopeName: scopeName,
			observables: {},
			bindings: []
		};

		var firstCycleCalls = [];
		analyzeScope(scopeData, firstCycleCalls);

		for (var ri = 0, rn = firstCycleCalls.length; ri < rn; ++ri) {
			firstCycleCalls[ri]();
		}
		firstCycleCalls.length = 0;
	}

	function analyzeScope(scopeData, firstCycleCalls) {
		var scopeName = scopeData.scopeName;
		var _observes = getDirectiveElements('observe', scopeData.scopeEl);
		var _ifs = getDirectiveElements('if', scopeData.scopeEl);
		var _repeats = getDirectiveElements('repeat', scopeData.scopeEl);
		var _binds = getDirectiveElements('bind', scopeData.scopeEl);

		var bindings = scopeData.bindings;
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
					var value = eval(scopeName+'.'+this.fullExpr);
					console.log(value);
					this.accessors.set(value);
				}
			};
			bindings.push(bind);
			var refresher = bind.refresh.bind(bind);

			!(function(refresher) {
				$observe(bind.observable, function(changes) {
					refresher();
				});
			})(refresher);

			firstCycleCalls.push(refresher);
		}

		var observables = scopeData.observables;
		for (var io = 0; io < _observes.length; ++io) {
			var observeEl = _observes[io];
			var observeExpr = getNdAttr(observeEl, 'observe');
			var observedData = scopeData.scope[observeExpr];

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

		for (var ii = 0; ii < _ifs.length; ++ii) {
			!(function(iferEl) {
				console.log(iferEl);
				var iferExpr = getNdAttr(iferEl, 'if');
				firstCycleCalls.push(function() {
					if (!evalBoolExprForScope(scopeData.scope, scopeData.scopeName, iferExpr)) {
						// remove element completely
						var parent = iferEl.parentNode;
						parent.insertBefore(document.createComment('nd-if: ' + iferExpr), iferEl);
						parent.removeChild(iferEl);
					}
					else {
						iferEl.removeAttribute('nd-if');
					}
				});
			})(_ifs[ii]);
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
		// TODO maybe just Array.isArray() ?
		if (Object.prototype.toString.call(obj) === '[object Array]') {
			Array.observe(obj, cb);
		}
		else {
			Object.observe(obj, cb);
		}
	};
	var evalBoolExprForScope = function(scope, scopeName, expr) {
		var a = false, b = false;
		try {
			a = eval(expr);
		}
		catch(err) {}

		if (!a) {
			try {
				b = eval(scopeName + '.' + expr);
			}
			catch (err) { }
		}

		return a || b;
	};

	ndInit($d, $da, observe, analyzeBindingExpr, evalBoolExprForScope);
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