import * as T from './types';
import * as AST from './ast';
import * as Tokenizer from './tokenizer';
import * as Utilities from './utilities';


export function beautify(node: T.INode)
{
	var level = 0,
		prevAst: T.INode = null,
		prevRet: string = null,
		newline = function()
		{
			var s = '\n';
			for (var i = 0; i < level; i++)
				s += '\t';
			return s;
		};

	return Utilities.trim(node.walk(function(ast: T.INode, descend: () => any[], walker: AST.IASTWalker): any
	{
		var ret: string,
			token: Tokenizer.EToken;

		// generic result for nodes with errors
		if ((ast instanceof AST.ASTNode) && (<AST.ASTNode> ast).hasError())
			ret = (<AST.ASTNode> ast).errorTokensToString();

		// beautify tokens
		else if (ast instanceof Tokenizer.Token)
		{
			token = (<Tokenizer.Token> ast).token;
			ret = beautifyToken(<Tokenizer.Token> ast, prevRet);

			if (token === Tokenizer.EToken.LBRACE)
			{
				level++;
				ret += newline();
			}
			else if (token === Tokenizer.EToken.RBRACE)
			{
				level--;
				ret = newline() + ret + newline();
			}
		}

		// selector combinators (white spaces, '+', '>', '~')
		else if (ast instanceof AST.SelectorCombinator)
		{
			ret = (<AST.SelectorCombinator> ast).getToken().token === Tokenizer.EToken.WHITESPACE ?
				' ' :
				' ' + (<AST.SelectorCombinator> ast).getToken().src + ' ';
		}

		// add a trailing space after a selector list
		else if (ast instanceof AST.SelectorList)
			ret = trailingSpace(join(descend()));

		// add a newline before a declaration (if the previous sibling was a declaration)
		else if (ast instanceof AST.Declaration)
		{
			ret = '';
			if (prevAst instanceof AST.Declaration)
				ret += newline();
			ret += join(descend());
		}

		// trim whitespaces from function arguments
		else if (ast instanceof AST.FunctionArgumentValue)
		{
			ret = Utilities.trim(join((<AST.FunctionArgumentValue> ast).walkChildren(walker))) +
				beautifyToken((<AST.FunctionArgumentValue> ast).getSeparator(), prevRet);
		}

		// trim trailing whitespaces from rules within a rule list
		else if (ast instanceof AST.RuleList)
		{
			if ((<AST.RuleList> ast).getLBrace())
			{
				ret = (<AST.RuleList> ast).getLBrace().walk(walker) +
					Utilities.trimRight(join((<AST.RuleList> ast).walkChildren(walker))) +
					(<AST.RuleList> ast).getRBrace().walk(walker);
			}
			else
				ret = join(descend());
		}

		// add a newline after a rule
		else if (ast instanceof AST.AbstractRule)
		{
			if ((ast instanceof AST.AtRule) && ((<AST.AtRule> ast).getRules() || (<AST.AtRule> ast).getDeclarations()))
			{
				// add a trailing space after the prelude
				ret = (<AST.AtRule> ast).getAtKeyword().walk(walker) +
					trailingSpace((<AST.AtRule> ast).getPrelude().walk(walker));

				// walk the rules/declarations
				if ((<AST.AtRule> ast).getRules())
					ret += (<AST.AtRule> ast).getRules().walk(walker);
				else
					ret += (<AST.AtRule> ast).getDeclarations().walk(walker);
			}
			else
				ret = join(descend());

			ret += newline();
		}

		// default
		else
			ret = join(descend());

		prevAst = ast;
		prevRet = ret;
		return ret;
	}));
}

function join(arr: any, sep: string = ''): string
{
	return Array.isArray(arr) ? arr.join(sep) : (arr || '');
}


function leadingSpace(s: string): string
{
	return (s[0] === ' ') ? s : ' ' + s;
}

function trailingSpace(s: string): string
{
	return (s[s.length - 1] === ' ') ? s : s + ' ';
}

function beautifyTokenComments(triviaToken: Tokenizer.Token[]/*, addSpaces: boolean*/)
{
	var s = '',
		len: number,
		i: number,
		t: Tokenizer.Token;

	if (!triviaToken || triviaToken.length === 0)
		return '';

	// skip trailing whitespaces
	for (len = triviaToken.length; len > 0; len--)
		if (triviaToken[len - 1].token !== Tokenizer.EToken.WHITESPACE)
			break;

	// find the first non-whitespace
	for (i = 0; i < len; i++)
		if (triviaToken[i].token !== Tokenizer.EToken.WHITESPACE)
			break;

	// construct the string
	for ( ; i < len; i++)
	{
		t = triviaToken[i];
		s += t.token === Tokenizer.EToken.COMMENT ? t.src : ' ';
	}

	return s && leadingSpace(trailingSpace(s));
}

function beautifyToken(token: Tokenizer.Token, prev: string): string
{
	var start: string,
		end: string;

	if (!token)
		return '';

	start = beautifyTokenComments(token.leadingTrivia);
	end = beautifyTokenComments(token.trailingTrivia);

	switch (token.token)
	{
	case Tokenizer.EToken.WHITESPACE:
		if (start[start.length - 1] === ' ')
		{
			if (end[0] === ' ')
				return start + end.substr(1);
			return start + end;
		}
		if (end[0] === ' ')
			return start + end;
		return start + ' ' + end;

	case Tokenizer.EToken.AT_KEYWORD:
	case Tokenizer.EToken.COMMA:
		// make sure that there always is a space after a ":" and a ","
		return trailingSpace(start + token.src + end);

	case Tokenizer.EToken.COLON:
		// add a trailing space if this token doesn't occur within a selector
		return start + token.src + end + (AST.hasParent(token, AST.Selector) ? '' : ' ');

	case Tokenizer.EToken.INCLUDE_MATCH:
	case Tokenizer.EToken.DASH_MATCH:
	case Tokenizer.EToken.PREFIX_MATCH:
	case Tokenizer.EToken.SUFFIX_MATCH:
	case Tokenizer.EToken.SUBSTRING_MATCH:
	case Tokenizer.EToken.COLUMN:
		return leadingSpace(trailingSpace(start + token.src + end));

	default:
		return start + token.src + end;
	}

	return '';
}
