var bindExpr = 'people.length';
var ast = $parse(bindExpr);
var memberExpressions = nd.ast.findTopMemberExpressions(ast);
console.log(memberExpressions);
if (memberExpressions.length !== 1) {
	throw "This nd-bind expression should contain one value expression but has " + memberExpressions.length + " of them: " + bindExpr;
}
var memberExpr = memberExpressions[0];
// var memberExprObservable = nd.ast.render(memberExpr.object ...
// TODO use memberExprObservable to install observer on it
// var nd.ast.renderForScope(scopeName, memberExpr)
