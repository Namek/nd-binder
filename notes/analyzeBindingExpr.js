function analyzeAndTest(expr, expected) {
	var res = analyzeBindingExpr(expr);
	var hasPassed = JSON.stringify(res) == JSON.stringify(expected);
	var msg = expr + ': ' + JSON.stringify(res);
	var log = function() {
		if (hasPassed) {
			console.log(msg);
		}
		else {
			console.error(msg);
		}
	};

	log(msg);
}

setTimeout(function() {
	analyzeAndTest('page.name', {
		observable: "page",
		path: ".name"
	});

	analyzeAndTest("page['name']", {
		observable: "page",
		path: "['name']"
	});

	analyzeAndTest("page[variable]", {
		observable: "page",
		path: "[variable]"
	});

	analyzeAndTest("person['name'].fname", {
		observable: "person['name']",
		path: ".fname"
	});

	analyzeAndTest("people[0].person.name['fname']", {
		observable: "people[0].person.name",
		path: "['fname']"
	});

	analyzeAndTest("people[indexes[0]].person.name['fname']", {
		observable: "people[indexes[0]].person.name",
		path: "['fname']"
	});

	analyzeAndTest("people[0].person.name[indexes[0]]", {
		observable: "people[0].person.name",
		path: "[indexes[0]]"
	});

}, 500);


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
