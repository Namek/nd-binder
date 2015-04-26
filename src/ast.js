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

	// converts Abstract Syntax Tree back to code
	render: function(ast) {
		function render(node) {
			if (node.type === 'ConditionalExpression') {
				return '(' + render(node.test) + '?' +  render(node.consequent) + ':' + render(node.alternate) + ')';
			}
			else if (node.type === 'BinaryExpression') {
				return '(' + render(node.left) + node.operator + render(node.right) + ')';
			}
			else if (node.type === 'MemberExpression') {
				if (node.computed) {
					return render(node.object) + '[' + node.property.name + ']';
				}
				else {
					return render(node.object) + '.' + node.property.name;
				}
			}
			else if (node.type === 'SequenceExpression') {
				var buffer = '';
				for (var i = 0, n = node.expressions.length; i < n; ++i) {
					if (i > 0) {
						buffer += ',';
					}
					buffer += render(node.expressions[i]);
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
				return node.name;
			}

			throw "Unknown AST node type: " + node.type;
		}

		return render(ast);
	},

	renderForScope: function(scopeName, ast) {
		// TODO create MemberExpression

		// TODO if ast.type == ThisExpression then replace 'this'->scopeName
		// TODO assert ast.type == Identifier || Literal || MemberExpression
	},

	testRender: function(expr) {
		var ast = nd.$expr.parse(expr);
		return {
			ast: ast,
			code: this.render(ast)
		};
	}
};})();