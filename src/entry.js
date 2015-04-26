nd.init = function() {
	function $parse(expr) {
		return utils.$expr.parse(expr);
	}

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

	var utils = nd.utils;
	var $d = utils.$d;
	var $da = utils.$da;
	var $observe = utils.observe;
	var evalInScope = utils.evalInScope;
	var analyzeBindingExpr = utils.analyzeBindingExpr;
	var evalBoolExprForScope = utils.evalBoolExprForScope;
	var evalClassesForScope = utils.evalClassesForScope;
	var defineClass = utils.defineClass;

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
		var scopeEl = scopeData.scopeEl;

		var _observes = getDirectiveElements('observe', scopeEl);
		var _ifs = getDirectiveElements('if', scopeEl);
		var _repeats = getDirectiveElements('repeat', scopeEl);
		var _binds = getDirectiveElements('bind', scopeEl);
		var _classes = getDirectiveElements('class', scopeEl);

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
				observable: evalInScope(scope, expr.observable),
				refresh: function() {
					var value = evalInScope(scope, this.fullExpr);
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
			(function(observeEl) {
				var observeExpr = getNdAttr(observeEl, 'observe');
				var observedData = scopeData.scope[observeExpr];
				var observes = observables[observeExpr];

				if (!observes) {
					observes = observables[observeExpr] = [];

					$observe(observedData, function(changes) {
						for (var i = 0, n = observes.length; i < n; ++i) {
							observes[i].refresh();
						}
					});
				}
				var observe = {
					el: observeEl,
					expr: observeExpr,
					data: observedData,
					refresh: function() {
						// TODO call all elements which listen to this.
					}
				};
				observes.push(observe);
				firstCycleCalls.push(observe.refresh.bind(this));
			})(_observes[io]);
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

		// example: nd-class="{two: 'people.length==2', three: 'people.length==3'}"
		for (var ic = 0; ic < _classes.length; ++ic) {
			var classedEl = _classes[ic];

			(function(classedEl) {
				var classExpr = getNdAttr(classedEl, 'class');

				function refresh() {
					var classes = evalClassesForScope(scope, scopeName, classExpr);
					for (var className in classes) {
						defineClass(classedEl, className, classes[className]);
					}
				}

				firstCycleCalls.push(refresh.bind(this));
			})(classedEl);
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

	function refreshNodes() {

	}

	// directive -> directiveInstance
	// observe(nd-observe) -> onchange -> refresh nd-observe children
	// 
};
