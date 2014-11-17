function Rule()
{
    Lint.Rules.AbstractRule.apply(this, arguments);
}

Rule.prototype = Object.create(Lint.Rules.AbstractRule.prototype);

Rule.prototype.apply = function(syntaxTree)
{
    return this.applyWithWalker(new NoFunctionWhitespaceWalker(syntaxTree, this.getOptions()));
};

Rule.FAILURE_STRING = 'Extra whitespace before opening parenthesis';


function NoFunctionWhitespaceWalker()
{
    Lint.RuleWalker.apply(this, arguments);
}

NoFunctionWhitespaceWalker.prototype = Object.create(Lint.RuleWalker.prototype);

/**
 * function ...(...) { ... }
 */
NoFunctionWhitespaceWalker.prototype.visitFunctionDeclaration = function(node)
{
	this.checkNoWhitspace(node.identifier, node);
    Lint.RuleWalker.prototype.visitFunctionDeclaration.call(this, node);
};

/**
 * "... = function(...) { ... }"
 */
NoFunctionWhitespaceWalker.prototype.visitFunctionExpression = function(node)
{
	this.checkNoWhitspace(node.identifier || node.functionKeyword, node);
    Lint.RuleWalker.prototype.visitFunctionExpression.call(this, node);
};

NoFunctionWhitespaceWalker.prototype.visitMethodSignature = function(node)
{
	Lint.RuleWalker.prototype.visitMethodSignature.call(this, node);
};

NoFunctionWhitespaceWalker.prototype.visitMemberFunctionDeclaration = function(node)
{
	this.checkNoWhitspace(node.propertyName, node);
	Lint.RuleWalker.prototype.visitMemberFunctionDeclaration.call(this, node);
};

NoFunctionWhitespaceWalker.prototype.visitConstructorDeclaration = function(node)
{
	this.checkNoWhitspace(node.constructorKeyword, node);
	Lint.RuleWalker.prototype.visitConstructorDeclaration.call(this, node);
};

NoFunctionWhitespaceWalker.prototype.visitInvocationExpression = function(node)
{
	this.checkNoWhitspace(TypeScript.lastToken(node.expression), node);
    Lint.RuleWalker.prototype.visitInvocationExpression.call(this, node);
};

NoFunctionWhitespaceWalker.prototype.visitObjectCreationExpression = function(node)
{
	this.checkNoWhitspace(TypeScript.lastToken(node.expression), node);
    Lint.RuleWalker.prototype.visitObjectCreationExpression.call(this, node);
};

NoFunctionWhitespaceWalker.prototype.checkNoWhitspace = function(token, node)
{
	if (token.trailingTrivia().count() > 0)
    	this.addFailure(this.createFailure(this.getPosition() + TypeScript.leadingTriviaWidth(node), 1, Rule.FAILURE_STRING));
};

exports.Rule = Rule;