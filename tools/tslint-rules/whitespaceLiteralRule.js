function Rule()
{
	Lint.Rules.AbstractRule.apply(this, arguments);
}

Rule.prototype = Object.create(Lint.Rules.AbstractRule.prototype);

Rule.prototype.apply = function(syntaxTree)
{
	return this.applyWithWalker(new WhitespaceLiteralWalker(syntaxTree, this.getOptions()));
};

Rule.FAILURE_STRING_OPEN = 'Missing whitespace after { or [ of object/array literal';
Rule.FAILURE_STRING_CLOSE = 'Missing whitespace before } or ] of object/array literal';


function WhitespaceLiteralWalker()
{
	Lint.RuleWalker.apply(this, arguments);
}

WhitespaceLiteralWalker.prototype = Object.create(Lint.RuleWalker.prototype);

WhitespaceLiteralWalker.prototype.visitArrayLiteralExpression = function(node)
{
	if (node.expressions)
	{
		var len = node.expressions.length;
		if (len > 0)
		{
			this.checkWhitspace(node.openBracketToken, node, Rule.FAILURE_STRING_OPEN);
			this.checkWhitspace(TypeScript.lastToken(node.expressions[len - 1]), node, Rule.FAILURE_STRING_CLOSE);
		}
	}

	Lint.RuleWalker.prototype.visitArrayLiteralExpression.call(this, node);
};

WhitespaceLiteralWalker.prototype.visitObjectLiteralExpression = function(node)
{
	if (node.propertyAssignments)
	{
		var len = node.propertyAssignments.length;
		if (len > 0)
		{
			this.checkWhitspace(TypeScript.lastToken(node.propertyAssignments[len - 1]), node, Rule.FAILURE_STRING_CLOSE);
			this.checkWhitspace(node.openBraceToken, node, Rule.FAILURE_STRING_OPEN);
		}
	}

	Lint.RuleWalker.prototype.visitObjectLiteralExpression.call(this, node);
};

WhitespaceLiteralWalker.prototype.checkWhitspace = function(token, node, msg)
{
	if (token.trailingTrivia().count() !== 1)
		this.addFailure(this.createFailure(this.getPosition() + TypeScript.leadingTriviaWidth(node), 1, msg));
};

exports.Rule = Rule;