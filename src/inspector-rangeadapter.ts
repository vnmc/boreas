import T = require('./types');
import AST = require('./ast');
import Tokenizer = require('./tokenizer');
import NodeNames = require('./nodenames');
import CSSUtilities = require('./utilities');


class RangeAdapter
{
	static StyleSheet(styleSheet: AST.StyleSheet): T.ISourceRange
	{
		return styleSheet.range;
	}


	/**
	 * Creates the range from the first token after the opening curly brace
	 * until the last token before the closing curly brace of a declaration list,
	 * as expected by the inspector.
	 *
	 * @param declarations
	 * @returns {T.ISourceRange}
	 */
	static DeclarationList(declarations: AST.DeclarationList): T.ISourceRange
	{
		var lenDeclarations = declarations.getLength(),
			firstRange = declarations.range,
			lastRange = declarations.range,
			lbrace = declarations.getLBrace(),
			rbrace = declarations.getRBrace(),
			firstTrailing = lbrace && lbrace.trailingTrivia,
			firstLeading: Tokenizer.Token[],
			lastLeading: Tokenizer.Token[],
			lastTrailing: Tokenizer.Token[],
			tokens: Tokenizer.Token[],
			firstToken: Tokenizer.Token,
			lastToken: Tokenizer.Token,
			lenTokens: number;

		if (firstTrailing && firstTrailing.length > 0)
			firstRange = firstTrailing[0].range;
		else if (lenDeclarations === 0)
			firstRange = new AST.SourceRange(lbrace.range.endLine, lbrace.range.endColumn, 0, 0);
		else if (lenDeclarations > 0)
		{
			tokens = (<AST.Declaration> declarations[0]).getTokens();
			if (tokens.length > 0)
			{
				firstToken = tokens[0];
				firstLeading = firstToken.leadingTrivia;

				if (firstLeading && firstLeading.length > 0)
					firstRange = firstLeading[0].range;
				else
					firstRange = firstToken.range;
			}
		}

		lastLeading = rbrace && rbrace.leadingTrivia;
		if (lastLeading && lastLeading.length > 0)
			lastRange = lastLeading[lastLeading.length - 1].range;
		else if (lenDeclarations === 0)
			lastRange = new AST.SourceRange(0, 0, rbrace.range.startLine, rbrace.range.startColumn);
		else if (lenDeclarations > 0)
		{
			tokens = (<AST.Declaration> declarations[lenDeclarations - 1]).getTokens();
			lenTokens = tokens.length;

			if (lenTokens > 0)
			{
				lastToken = tokens[lenTokens - 1];
				lastTrailing = lastToken.trailingTrivia;

				if (lastTrailing && lastTrailing.length > 0)
					lastRange = lastTrailing[lastTrailing.length - 1].range;
				else
					lastRange = lastToken.range;
			}
		}

		return new AST.SourceRange(firstRange.startLine, firstRange.startColumn, lastRange.endLine, lastRange.endColumn);
	}


	/**
	 * Returns the range of the token "token" excluding any leading and trailing trivia.
	 *
	 * @param token
	 * @returns {T.ISourceRange}
	 */
	static Token(token: Tokenizer.Token): T.ISourceRange
	{
		return getNoTriviaRange(token);
	}


	/**
	 * Returns the range excluding any leading and trailing trivia.
	 *
	 * @param node
	 * @returns {T.ISourceRange}
	 */
	static default(node: AST.ASTNode): T.ISourceRange
	{
		return getNoTriviaRange(node) || node.range;
	}
}


/**
 * Finds the range from "start" to "end", excluding any leading or trailing trivia.
 *
 * @param start
 * @param end
 * @returns {T.ISourceRange}
 */
export function getNoTriviaRange(start: T.INode, end: T.INode = start): T.ISourceRange
{
	var firstToken = (start instanceof Tokenizer.Token) ? <Tokenizer.Token> start : (<AST.ASTNode> start).getFirstToken(),
		lastToken = (end instanceof Tokenizer.Token) ? <Tokenizer.Token> end : (<AST.ASTNode> end).getLastToken(),
		range: T.ISourceRange,
		r: T.ISourceRange;

	if (!firstToken && !lastToken)
		return null;

	range = new AST.SourceRange(start.range.startLine, start.range.startColumn, end.range.endLine, end.range.endColumn);

	if (firstToken)
	{
		if (firstToken.leadingTrivia && firstToken.leadingTrivia.length > 0)
		{
			// get the end of the leading trivia
			r = firstToken.leadingTrivia[firstToken.leadingTrivia.length - 1].range;
			range.startLine = r.endLine;
			range.startColumn = r.endColumn;
		}
		else
		{
			range.startLine = firstToken.range.startLine;
			range.startColumn = firstToken.range.startColumn;
		}
	}

	if (lastToken)
	{
		if (lastToken.trailingTrivia && lastToken.trailingTrivia.length > 0)
		{
			// get the start of the trailing trivia
			r = lastToken.trailingTrivia[0].range;
			range.endLine = r.startLine;
			range.endColumn = r.startColumn;
		}
		else
		{
			range.endLine = lastToken.range.endLine;
			range.endColumn = lastToken.range.endColumn;
		}
	}

	return range;
}


/**
 *
 * @param node
 * @returns {T.ISourceRange}
 */
export function getRange(node: T.INode): T.ISourceRange
{
	var adapter = RangeAdapter[NodeNames.getNodeName(node)];
	return adapter ?
		adapter(node) :
		(node instanceof AST.ASTNode) ? RangeAdapter.default(<AST.ASTNode> node) : node.range;
}


/**
 *
 * @param node
 * @param range
 * @returns {string}
 */
export function getText(node: T.INode, range: T.ISourceRange): string
{
	return CSSUtilities.getTextFromRange(node.toString(), CSSUtilities.relativeRange(range, node.range));
}
