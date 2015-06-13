var directives = (function() {
	var prioritizedDirectives = null;
	var directives = { };
	var instancesByDirective = { };// key: directive name -> array of instances
	var instancesById = { };
	var instancesByEl = null;
	var instancesEverCreatedCount = 0;
	var namedScopes = { };
	var createdScopes = { };// key: $$scopeId -> scope object

	var rootScope = (function() {
		function RootScope() { }
		RootScope.prototype = {
			eval: function(code) {
				return evalInContext(code, this);
			}
		};
		
		return new RootScope();
	})();


	function init() {
		instancesByEl = new nd.utils.WeakMap();
		createdScopes = new nd.utils.WeakMap();
	}

	function getSortedDirectivesByPriority() {
		var arr = [];
		for (var dName in directives) {
			var directive = directives[dName];
			arr.push(directive);
		}
		arr.sort(function(d1, d2) {
			return d2.settings.priority - d1.settings.priority;
		});

		return arr;
	}

	function evalInContext(js, context) {
		/* jshint evil:true */
		return function() { return eval(js); }.call(context);
	}

	function getDirectiveElements(directiveName, el) {
		return nd.utils.$da(el, '[nd-' + directiveName + ']');
	}

	var evalQueue = [];

	// instantiates and/or refreshes directives on elements
	function setupElementTree(el, directivesToOmit) {
		if (!prioritizedDirectives) {
			prioritizedDirectives = getSortedDirectivesByPriority();
		}

		var evalQueue = [];

		// wchodzimy do elementu i znajdujemy wszystkie dyrektywy, odpalamy wg priorytetu
		var attrs = el.attributes;

		if (attrs) {
			var manualElementTreeRefresh = false;
			var i, j, n;

			// Find attributes for this element
			var directiveInstances = instancesByEl.get(el);
			if (!directiveInstances) {
				directiveInstances = {};
				instancesByEl.set(el, directiveInstances);
			}

			for (i = 0; i < attrs.length; ++i) {
				var attr = attrs[i];

				for (j = 0; j < prioritizedDirectives.length; ++j) {
					var directive = prioritizedDirectives[j];
					// TODO directive names shouldn't work only for `nd-` prefix
					var directiveName = 'nd-' + directive.name;

					if (directivesToOmit && directivesToOmit.indexOf(directiveName) >= 0) {
						continue;
					}

					if (!manualElementTreeRefresh && directive.manualElementTreeRefresh) {
						manualElementTreeRefresh = true;
					}

					if (attr.name.indexOf(directiveName) === 0) {
						// Note assumption: each directive type can be instanced only once for element.
						if (!directiveInstances[directive.name]) {
							var instanceId = ++instancesEverCreatedCount;
							instance = directive.instantiate(el, instanceId);
							directiveInstances[directive.name] = instance;
							instancesById[instanceId] = instance;
							instancesByDirective[directive.name].push(instance);

							if (instance.onInit) {
								// instance.onInit._directive = directive.name;
								// evalQueue.push(instance.onInit);
								instance.onInit();
							}
						}
						else {
							// Trigger directive instance to refresh
							instance = directiveInstances[directive.name];

							if (instance.onUpdate) {
								instance.onUpdate();
							}
						}
					}
				}
			}
		}

		// Go to children
		if (!manualElementTreeRefresh && el.children) {
			for (i = 0, n = el.children.length; i < n; ++i) {
				setupElementTree(el.children[i]);
			}
		}
	}

	var latestId = 0;
	function generateId() {
		return ++latestId;
	}

	var api = {
		refreshElementTree: function(el, directivesToOmit) {
			setupElementTree(el, directivesToOmit);
		},
		getScopeById: function(scopeId) {
			return createdScopes[scopeId];
		},
		createScope: function(parentScope, el) {
			if (!parentScope) {
				parentScope = rootScope;
			}

			function Scope() { }
			Scope.prototype = parentScope;

			var scope = new Scope();
			var scopeId = generateId();
			scope.$$scopeId = scopeId;
			createdScopes[scopeId] = scope;

			if (!!el) {
				api.assignScopeToElement(scope, el);
			}

			return scope;
		},
		inheritScope: function(scope, parentScope) {// TODO @deprecated
			Object.setPrototypeOf(scope, parentScope);
		},
		registerScopeName: function(scope, scopeName) {// TODO @deprecated
			if (namedScopes[scopeName]) {
				throw "Cannot register scope named `" + scopeName + "`. Scope is already registered!";
			}

			namedScopes[scopeName] = scope;
		},
		registerScope: function(scope) {
			var scopeId = generateId();
			createdScopes[scopeId] = scope;

			return scopeId;
		},
		assignScopeToElement: function(scope, el) {
			var scopeId = api.registerScope(scope);
			el.$$scopeId = scopeId;
		},
		getClosestScope: function(el) {
			var scope = rootScope;

			var node = el;
			while (node && node != document) {
				if (node != el && node.$$scopeId) {
					return api.getScopeById(node.$$scopeId);
				}

				// Look for scopeId in sibling comments
				var siblingNode = node.nextSibling;

				while (siblingNode) {
					if (siblingNode.nodeType === Node.COMMENT_NODE) {
						if (siblingNode.$$scopeId) {
							return api.getScopeById(siblingNode.$$scopeId);
						}
						siblingNode = null;
					}
					else {
						siblingNode = siblingNode.nextSibling;
					}
				}

				node = node.parentNode;
			}

			return scope;
		},
		getRootScope: function() {
			return rootScope;
		},
		getScopeByName: function(scopeName) {//TODO @deprecated
			var scope = namedScopes[scopeName];

			if (!scope) {
				throw "Scope `" + scopeName + "` doesn't exist!";
			}

			return scope;
		},
		getParentScope: function(scope) {
			var parentScope = Object.getPrototypeOf(scope);

			if (!parentScope) {
				throw "This scope doesn't have parent!";
			}

			return parentScope;
		},
		getParentScopeOrRoot: function(scope) {
			var parentScope = Object.getPrototypeOf(scope);

			if (!parentScope) {
				parentScope = rootScope;
			}

			return parentScope;
		},
		getParentScopeByName: function(parentScopeName, el) {//TODO @deprecated
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

			var child = this.getObjectValue(scope, observable);
			if (typeof child === 'object') {
				obj = child;
			}

			nd.utils.observe(obj, function(changes) {
				for (var i = 0; i < changes.length; ++i) {
					var change = changes[i];

					if (change.type == 'splice' || (change.type == 'update' && change.name == observable.property)) {
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
		queue: function(func) {//TODO @deprecated
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

	function initDirectiveElement(directive, el, instanceId) {
		var directiveValue = getNdAttr(el, directive.name);

		if (!directive.initialized) {
			directive.onFirstRun(api);
			directive.initialized = true;
		}

		return directive.onInstantiate(el, instanceId, directiveValue, api);
	}

	return {
		init: init,
		all: directives,
		refreshElementTree: setupElementTree,
		create: function(name, modifyFunc, settings) {
			if (directives[name]) {
				throw "Directive `" + name + "` already exists!";
			}

			if (!settings) {
				settings = {};
			}

			if (!settings.priority) {
				settings.priority = 0;
			}

			if (!settings.subScope) {
				settings.subScope = false;
			}

			var d = {
				name: name,
				settings: settings,
				onFirstRun: function(api) { },
				onInstantiate: function(el, instanceId, directiveValue, api) {
					throw "directive.onInstantiate has not been set for directive " + name;
				},
				instantiate: function(el, id) {
					return initDirectiveElement(d, el, id);
				}
			};
			modifyFunc(d);
			directives[name] = d;
			instancesByDirective[name] = [];
			return d;
		},
		set: function(directive) {
			directives[directive.name] = directive;
		},
		get: function(name) {
			return directives[name];
		},
		getSortedByPriority: getSortedDirectivesByPriority
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
	directives.init();
	directives.refreshElementTree(document);
};
