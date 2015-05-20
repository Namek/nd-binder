var evalQueue = [];

var directives = (function() {
	var directives = {};
	var instances = {};
	var instancesEverCreatedCount = 0;
	var namedScopes = {};

	var rootScope = (function() {
		function RootScope() { }
		RootScope.prototype = {
			eval: function(code) {
				return evalInContext(code, this);
			}
		};
		
		return new RootScope();
	})();

	function evalInContext(js, context) {
		/* jshint evil:true */
		return function() { return eval(js); }.call(context);
	}

	var api = (function() {
		return {
			createScope: function(parentScope) {
				if (!parentScope) {
					parentScope = rootScope;
				}

				function Scope() { }
				Scope.prototype = parentScope;

				return new Scope();
			},
			inheritScope: function(scope, parentScope) {
				Object.setPrototypeOf(scope, parentScope);
			},
			registerScopeName: function(scope, scopeName) {
				if (namedScopes[scopeName]) {
					throw "Cannot register scope named `" + scopeName + "`. Scope is already registered!";
				}

				namedScopes[scopeName] = scope;
			},
			getClosestScope: function(el) {
				var scope = rootScope;

				var node = el;
				while (node && node != document) {
					// TODO Refactor?:
					// This condition should look into some collection of scopes.
					// There may exist more scoping directives than `scope` and `child-scope`.
					var scopeName = getNdAttr(node, 'scope');
					if (scopeName) {
						scope = api.getScopeByName(scopeName);
						break;
					}

					node = node.parentNode;
				}

				return scope;
			},
			getRootScope: function() {
				return rootScope;
			},
			getScopeByName: function(scopeName) {
				var scope = namedScopes[scopeName];

				if (!scope) {
					throw "Scope `" + scopeName + "` doesn't exist!";
				}

				return scope;
			},
			getParentScopeByName: function(parentScopeName, el) {
				var scope = api.getScopeByName(parentScopeName);

				// TODO assert for parenting of this scope `el`

				return scope;
			},
			getElementValueAccessors: function(el) {
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
			},
			observe: function(scope, observable, listener) {
				var obj = evalInContext(observable.objectPath, scope);

				if (obj === undefined) {
					// create object or array if observed path doesn't contain any object
					var evalNew = observable.property == 'length' ? '[]' : '{}';
					obj = evalInContext(observable.objectPath + ' = ' + evalNew, scope);
				}

				nd.utils.observe(obj, function(changes) {
					console.log(changes);
					for (var i = 0; i < changes.length; ++i) {
						var change = changes[i];

						if (change.type == 'splice' || change.type == 'update' && change.name == observable.property) {
							listener(change);

							// Optimize: We don't need to call the refresh listener more than once.
							return;
						}
					}
				});

				return obj;
			},
			registerElementValueListener: function(el, listener) {
				// TODO if input, then listen on 'value', otherwise on innerHTML
				// TODO support contenteditable
			},
			setObjectValue: function(scope, valueInfo, newValue) {
				var obj = evalInContext(valueInfo.objectPath, scope);
				obj[valueInfo.property] = newValue;
			},
			getObjectValue: function(scope, observable) {
				var obj = evalInContext(observable.objectPath, scope);
				var val = obj[observable.property];

				return val;
			},

			objectExprToExprs: function(objectExpr) {
				var expr = objectExpr.trim();
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

					pairs[keyAndExpr[0].trim()] = keyAndExpr[1].trim();
				}

				return pairs;
			},

			bindingExprToObservable: function(expr) {
				var ret = this.exprToObservables(expr, true);

				if (ret.length !== 1) {
					throw "Binding expression needs exactly one member expression (like `people.length`) or identifier call (like `pageName`).";
				}

				return ret[0];
			},

			exprToObservables: function(expr, onlyMemberExpr) {
				var ast = nd.utils.$expr.parse(expr);
				var memberExprs = nd.ast.findTopMemberExpressions(ast);
				var identifierExprs = onlyMemberExpr ? [] : nd.ast.findIdentifiers(ast);

				function addObservable(retArr, expr) {
					var objectPath = 'this';
					var property = null;

					if (expr.type === 'MemberExpression') {
						objectPath = nd.ast.render(expr.object);
						property = nd.ast.render(expr.property);
					}
					else {
						property = expr.name;
					}

					retArr.push({
						objectPath: objectPath,
						property: property
					});
				}

				var retArr = [];
				for (var i = 0, n = memberExprs.length; i < n; ++i) {
					addObservable(retArr, memberExprs[i]);
				}
				for (i = 0, n = identifierExprs.length; i < n; ++i) {
					addObservable(retArr, identifierExprs[i]);
				}

				return retArr;
			},
			queue: function(func) {
				evalQueue.push(func);
			},

			createClass: function(name, rules){
				name = '.' + name;
				var style = document.createElement('style');
				style.type = 'text/css';
				document.getElementsByTagName('head')[0].appendChild(style);

				if (!(style.sheet||{}).insertRule) {
					(style.styleSheet || style.sheet).addRule(name, rules);
				}
				else {
					style.sheet.insertRule(name + "{" + rules + "}", 0);
				}
			},

			defineClass: function(name, element, enableClass){
				if (typeof element.valueOf() == "string"){
					element = document.getElementById(element);
				}
				if (!element) return;

				if (enableClass) {
					if (element.className.indexOf(name) < 0) {
						element.className = (element.className + " " + name).trim();
					}
				}
				else {
					element.className = element.className.replace(new RegExp("\\b" + name + "\\b", "g"), '').trim();
				}
			}
		};
	})();

	function initDirectiveElement(directive, el) {
		var directiveValue = getNdAttr(el, directive.name);
		var instanceId = ++instancesEverCreatedCount;

		if (!directive.initialized) {
			directive.onFirstRun(api);
		}

		var instance = directive.onInstantiate(el, instanceId, directiveValue, api);

		instances[directive.name][instanceId] = instance;
	}

	return {
		all: directives,
		create: function(name, modifyFunc, priority) {
			if (directives[name]) {
				throw "Directive `" + name + "` already exists!";
			}

			var d = {
				name: name,
				priority: priority || 10,
				onFirstRun: function(api) { },
				onInstantiate: function(el, instanceId, directiveValue, api) {
					throw "directive.onInstantiate has not been set for directive " + name;
				},
				instantiate: function(el) {
					initDirectiveElement(d, el);
				}
			};
			modifyFunc(d);
			directives[name] = d;
			instances[name] = {};
			return d;
		},
		set: function(directive) {
			directives[directive.name] = directive;
		},
		get: function(name) {
			return directives[name];
		},
		getSortedByPriority: function() {
			var arr = [];
			for (var dName in directives) {
				var directive = directives[dName];
				arr.push(directive);
			}
			arr.sort(function(d1, d2) {
				return d2.priority - d1.priority;
			});

			return arr;
		}
	};
})();


function getAttr(el, name) {
	return el.getAttribute(name);
}

function getNdAttr(el, name) {
	return getAttr(el, 'nd-' + name);
}

var listeners = (function() {
	var listenersTree = { };
	var listenersToPaths = [];

	function registerListener(listenPath, listenerFunc) {
		var pathArr = listenPath.split('/');

		// traverse tree deep down
		var node = listenersTree;
		for (var i = 0, n = pathArr.length; i < n; ++i) {
			if (!node[pathArr[i]]) {
				node = node[pathArr[i]] = { };
			}
			else {
				node = node[pathArr[i]];
			}
		}

		node.listenerFunc = listenerFunc;

		listenersToPaths.push({
			listenPath: listenPath,
			listenerFunc: listenerFunc
		});
	}

	function removeListener(listenerFunc, listenPath/*optional*/) {
		var shouldComparePath = !!listenPath;
		var indicesToRemove = [];

		for (var i = 0, n = listenersToPaths.length; i < n; ++i) {
			if (listenersToPaths[i].listenerFunc === listenerFunc) {
				if (!shouldCompare || listenersToPaths[i].listenPath === listenPath) {
					indicesToRemove.push(i);

					if (shouldCompare) {
						break;
					}
				}
			}
		}

		for (var iOffset = 0; iOffset < indicesToRemove.length; ++iOffset) {
			listenersToPaths.splice(0, indicesToRemove[i-iOffset]);
		}
	}

	function notify(listenPath) {
		var pathArr = listenPath.split('/');

		// traverse tree deep down
		var node = listenersTree;
		for (var i = 0, n = pathArr.length; i < n; ++i) {
			if (!node[pathArr[i]]) {
				node = node[pathArr[i]] = { };
			}
			else {
				node = node[pathArr[i]];
			}
		}

		node.listenerFunc();
	}

	return {
		register: registerListener,
		remove: removeListener,
		notify: notify
	};
})();


nd.directives = directives;
nd.init = function() {
	// get all elements and setup directives on them!
	// TODO maybe it should go the hierarchy way.
	//      One element having more than one directive
	//      would be easier to debug then.


	function getDirectiveElements(directiveName, scope) {
		return nd.utils.$da(scope, '[nd-' + directiveName + ']');
	}

	var prioritizedDirectives = directives.getSortedByPriority();

	for (var i = 0, n = prioritizedDirectives.length; i < n; ++i) {
		var directive = prioritizedDirectives[i];
		var els = getDirectiveElements(directive.name, document);

		for (var j = 0, m = els.length; j < m; ++j) {
			var el = els[j];
			var directiveValue = getNdAttr(el, directive.name);

			directive.instantiate(el, directiveValue);
		}
	}

	for (i = 0, n = evalQueue.length; i < n; ++i) {
		evalQueue[i]();
	}
	evalQueue.length = 0;
};