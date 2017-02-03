import T = require('./types');
import Tokenizer = require('./tokenizer');


/**
 * Converts the trivia tokens of "node" to leading trivia (rather than trailing trivia).
 *
 * @param node
 */
export function convertToLeadingTrivia(node: T.INode): void
{
	var tokens = node.getTokens(),
		len = tokens.length,
		i: number,
		token: Tokenizer.Token,
		prevToken: Tokenizer.Token = null,
		parent: T.INode,
		prevParent: T.INode,
		startLine: number,
		startColumn: number,
		oldStartLine: number,
		oldStartColumn: number;

	for (i = 0; i < len; i++)
	{
		token = tokens[i];

		if (prevToken)
		{
			// add the trailing trivia of the previous token to the leading trivia of the current token
			if (!token.leadingTrivia || token.leadingTrivia.length === 0)
				token.leadingTrivia = prevToken.trailingTrivia;
			else if (!prevToken.trailingTrivia || prevToken.trailingTrivia.length === 0)
				token.leadingTrivia = undefined;
			else
				token.leadingTrivia = prevToken.trailingTrivia.concat(token.leadingTrivia);

			// update the ranges
			if (token.leadingTrivia && token.leadingTrivia.length > 0)
			{
				oldStartLine = token.range.startLine;
				oldStartColumn = token.range.startColumn;
				startLine = token.leadingTrivia[0].range.startLine;
				startColumn = token.leadingTrivia[0].range.startColumn;

				// update the ranges in the hierarchy
				parent = token.getParent();
				prevParent = prevToken.getParent();

				if (prevParent !== parent)
				{
					for ( ; parent; parent = parent.getParent())
					{
						if (parent.range.startLine === oldStartLine && parent.range.startColumn === oldStartColumn)
						{
							parent.range.startLine = startLine;
							parent.range.startColumn = startColumn;

							// force a recompute of the tokens and children arrays
							if ((<any> parent)._tokens)
								(<any> parent)._tokens = null;
							if ((<any> parent)._children)
								(<any> parent)._children = null;
						}
						else
							break;
					}

					for ( ; prevParent; prevParent = prevParent.getParent())
					{
						if (prevParent.range.endLine === oldStartLine && prevParent.range.endColumn === oldStartColumn)
						{
							prevParent.range.endLine = startLine;
							prevParent.range.endColumn = startColumn;
						}
						else
							break;
					}
				}

				// update the ranges of the tokens
				prevToken.range.endLine = startLine;
				prevToken.range.endColumn = startColumn;
				token.range.startLine = startLine;
				token.range.startColumn = startColumn;
			}

			// remove the trailing trivia of the previous token
			prevToken.trailingTrivia = undefined;
		}

		prevToken = token;
	}
}
