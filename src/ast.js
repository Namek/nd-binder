(function() {

var CONTINUE = 0;
var STOP_TRAVERSING_DEEPER = 1;
var STOP_TRAVERSING = 2;
var COLLECT_ELEMENT = 4;

nd.ast = {
	traverseAst: function(astRoot, astNode, traverseFunc) {
		var instruction;

		if (astNode === astRoot) {
			instruction = traverseFunc(astNode);

			if (instruction & STOP_TRAVERSING || instruction & STOP_TRAVERSING_DEEPER) {
				// stop traversing
				return;
			}
		}

		for (var prop in astNode) {
			if (astNode.hasOwnProperty(prop)) {
				var subNode = astNode[prop];
				if (subNode !== null && typeof astNode[prop] === 'object') {
					instruction = traverseFunc(subNode);

					if (instruction & STOP_TRAVERSING) {
						return STOP_TRAVERSING;
					}

					if (!(instruction & STOP_TRAVERSING_DEEPER)) {
						this.traverseAst(astRoot, subNode, traverseFunc);
					}
				}
			}
		}
	},

	collectAstNodes: function(ast, filterFunc, maxNodes) {
		var foundNodes = [];

		this.traverseAst(ast, ast, function(astNode) {
			var instruction = filterFunc(astNode);

			if (instruction & COLLECT_ELEMENT) {
				foundNodes.push(astNode);

				if (maxNodes && foundNodes.length >= maxNodes) {
					// stop traversing
					return STOP_TRAVERSING;
				}
			}

			return instruction;
		});
		return foundNodes;
	},

	findTopMemberExpressions: function(ast, maxNodes) {
		return this.collectAstNodes(ast, function(astNode) {
			return astNode.type === 'MemberExpression' ? COLLECT_ELEMENT | STOP_TRAVERSING_DEEPER : CONTINUE;
		}, maxNodes);
	},

	findIdentifiers: function(ast, maxNodes) {
		return this.collectAstNodes(ast, function(astNode) {
			return astNode.type === 'Identifier' ? COLLECT_ELEMENT : CONTINUE;
		}, maxNodes);
	},

	findNodesByTypes: function(ast, types) {
		return this.collectAstNodes(ast, function(astNode) {
			for (var i = 0; i < types.length; ++i) {
				if (astNode.type === types[i]) {
					return COLLECT_ELEMENT | STOP_TRAVERSING_DEEPER;
				}
			}

			return CONTINUE;
		});
	},

	findAllObservables: function(ast) {
		return this.findNodesByTypes(ast, ['Identifier', 'MemberExpression']);
	},

	// converts Abstract Syntax Tree back to code
	render: function(ast, callThroughThis) {
		if (callThroughThis === undefined) {
			callThroughThis = false;
		}

		function render(node, callThroughThis) {
			if (node.type === 'ConditionalExpression') {
				return '(' + render(node.test, callThroughThis) + '?' +  render(node.consequent, callThroughThis) + ':' + render(node.alternate, callThroughThis) + ')';
			}
			else if (node.type === 'BinaryExpression') {
				return '(' + render(node.left, callThroughThis) + node.operator + render(node.right, callThroughThis) + ')';
			}
			else if (node.type === 'MemberExpression') {
				var code = callThroughThis ? 'this.' : '';

				if (node.computed) {
					code += render(node.object, false) + '[' + node.property.name + ']';
				}
				else {
					code += render(node.object, false) + '.' + node.property.name;
				}

				return code;
			}
			else if (node.type === 'SequenceExpression') {
				var buffer = '';
				for (var i = 0, n = node.expressions.length; i < n; ++i) {
					if (i > 0) {
						buffer += ',';
					}
					buffer += render(node.expressions[i], callThroughThis);
				}
				return buffer;
			}
			else if (node.type === 'ThisExpression') {
				return 'this';
			}
			else if (node.type === 'Literal') {
				return node.value;
			}
			else if (node.type === 'Identifier') {
				return callThroughThis ? 'this.' + node.name : node.name;
			}

			throw "Unknown AST node type: " + node.type;
		}

		return render(ast, callThroughThis);
	},

	thisifyExpression: function(expr) {
		var ast = nd.utils.$expr.parse(expr);
		return this.render(ast, true);
	},

	testRender: function(expr) {
		var ast = nd.utils.$expr.parse(expr);
		return {
			ast: ast,
			code: this.render(ast)
		};
	}
};})();