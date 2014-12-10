function Rule()
{
    Lint.Rules.AbstractRule.apply(this, arguments);
}

Rule.prototype = Object.create(Lint.Rules.AbstractRule.prototype);

Rule.prototype.apply = function(syntaxTree)
{
    return this.applyWithWalker(new NewLineWalker(syntaxTree, this.getOptions()));
};

Rule.FAILURE_STRING = 'Missing newline before {';


function NewLineWalker()
{
    Lint.RuleWalker.apply(this, arguments);
}

NewLineWalker.prototype = Object.create(Lint.StateAwareRuleWalker.prototype);

NewLineWalker.prototype.visitClassDeclaration = function(node)
{
    var token = null;

    if (node.heritageClauses && node.heritageClauses.length > 0)
        token = TypeScript.lastToken(node.heritageClauses[node.heritageClauses.length - 1]);
    else if (node.typeParameterList)
        token = TypeScript.lastToken(node.typeParameterList);
    else
        token = node.identifier;

    if (token)
        this.checkNewLine(token, node);

    Lint.StateAwareRuleWalker.prototype.visitClassDeclaration.call(this, node);
};

NewLineWalker.prototype.visitInterfaceDeclaration = function(node)
{
    var token = null;

    if (node.heritageClauses && node.heritageClauses.length > 0)
        token = TypeScript.lastToken(node.heritageClauses[node.heritageClauses.length - 1]);
    else if (node.typeParameterList)
        token = TypeScript.lastToken(node.typeParameterList);
    else
        token = node.identifier;

    if (token)
        this.checkNewLine(token, node);
    
    Lint.StateAwareRuleWalker.prototype.visitInterfaceDeclaration.call(this, node);
};

NewLineWalker.prototype.visitEnumDeclaration = function(node)
{
    this.checkNewLine(node.identifier, node);
    Lint.StateAwareRuleWalker.prototype.visitEnumDeclaration.call(this, node);
};

/**
 * function ...(...) { ... }
 */
NewLineWalker.prototype.visitFunctionDeclaration = function(node)
{
    this.checkNewLine(TypeScript.lastToken(node.callSignature), node);
    Lint.StateAwareRuleWalker.prototype.visitFunctionDeclaration.call(this, node);
};

/**
 * "... = function(...) { ... }"
 */
NewLineWalker.prototype.visitFunctionExpression = function(node)
{
    this.checkNewLine(TypeScript.lastToken(node.callSignature), node);
    Lint.StateAwareRuleWalker.prototype.visitFunctionExpression.call(this, node);
};

NewLineWalker.prototype.visitMemberFunctionDeclaration = function(node)
{
    if (node.block)
        this.checkNewLine(TypeScript.lastToken(node.callSignature), node);
    Lint.StateAwareRuleWalker.prototype.visitMemberFunctionDeclaration.call(this, node);
};

NewLineWalker.prototype.visitConstructorDeclaration = function(node)
{
    if (node.block)
        this.checkNewLine(TypeScript.lastToken(node.callSignature), node);
    Lint.StateAwareRuleWalker.prototype.visitConstructorDeclaration.call(this, node);
};

NewLineWalker.prototype.visitGetAccessor = function(node)
{
    this.checkNewLine(TypeScript.lastToken(node.callSignature), node);
    Lint.StateAwareRuleWalker.prototype.visitGetAccessor.call(this, node);
};

NewLineWalker.prototype.visitSetAccessor = function(node)
{
    this.checkNewLine(TypeScript.lastToken(node.callSignature), node);
    Lint.StateAwareRuleWalker.prototype.visitSetAccessor.call(this, node);
};

NewLineWalker.prototype.visitIfStatement = function(node)
{
    this.checkNewLine(node.closeParenToken, node);
    Lint.StateAwareRuleWalker.prototype.visitIfStatement.call(this, node);
};

NewLineWalker.prototype.visitElseClause = function(node)
{
    if (node.statement.kind() === TypeScript.SyntaxKind.IfStatement)
    {
        if (node.elseKeyword.trailingTrivia().count() !== 1)
            this.addFailure(this.createFailure(this.getPosition() + TypeScript.leadingTriviaWidth(node), 1, '"else" must be followed by exactly one space'));
    }
    else
        this.checkNewLine(node.elseKeyword, node);
    Lint.StateAwareRuleWalker.prototype.visitElseClause.call(this, node);
};

NewLineWalker.prototype.visitForStatement = function(node)
{
    this.checkNewLine(node.closeParenToken, node);
    Lint.StateAwareRuleWalker.prototype.visitForStatement.call(this, node);
};

NewLineWalker.prototype.visitForInStatement = function(node)
{
    this.checkNewLine(node.closeParenToken, node);
    Lint.StateAwareRuleWalker.prototype.visitForInStatement.call(this, node);
};

NewLineWalker.prototype.visitWhileStatement = function(node)
{
    this.checkNewLine(node.closeParenToken, node);
    Lint.StateAwareRuleWalker.prototype.visitWhileStatement.call(this, node);
};

NewLineWalker.prototype.visitDoStatement = function(node)
{
    this.checkNewLine(node.closeParenToken, node);
    Lint.StateAwareRuleWalker.prototype.visitDoStatement.call(this, node);
};

NewLineWalker.prototype.visitTryStatement = function(node)
{
    this.checkNewLine(node.tryKeyword, node);
    Lint.StateAwareRuleWalker.prototype.visitTryStatement.call(this, node);
};

NewLineWalker.prototype.visitCatchClause = function(node)
{
    this.checkNewLine(node.closeParenToken, node);
    Lint.StateAwareRuleWalker.prototype.visitCatchClause.call(this, node);
};

NewLineWalker.prototype.visitFinallyClause = function(node)
{
    this.checkNewLine(node.finallyKeyword, node);
    Lint.StateAwareRuleWalker.prototype.visitFinallyClause.call(this, node);
};


NewLineWalker.prototype.checkNewLine = function(token, node)
{
    if (!token.trailingTrivia().hasNewLine())
        this.addFailure(this.createFailure(this.getPosition() + TypeScript.leadingTriviaWidth(node), 1, Rule.FAILURE_STRING));
};


exports.Rule = Rule;