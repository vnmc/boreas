import T = require('./types');
import AST = require('./ast');
import Tokenizer = require('./tokenizer');
import Utilities = require('./utilities');


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
            ret = join(descend()) + newline();

        else if (ast instanceof AST.DeclarationValue)
            ret = join(descend(), ' ');

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

function beautifyTokenComments(triviaToken: Tokenizer.Token[], addSpaces: boolean)
{
    var s = '',
        len: number,
        i: number,
        t: Tokenizer.Token,
        prevWasComment = false;

    if (!triviaToken)
        return '';

    len = triviaToken.length;
    for (i = 0; i < len; i++)
    {
        t = triviaToken[i];

        if (t.token === Tokenizer.EToken.COMMENT)
        {
            if (prevWasComment)
                s += ' ';
            s += t.src;
            prevWasComment = true;
        }
        else
        {
            //if (addSpaces)
            //    s += ' ';
            prevWasComment = false;
        }
    }

    return s;
}

function beautifyToken(token: Tokenizer.Token, prev: string): string
{
    var ret: string,
        inDeclarationValue = AST.hasParent(token, AST.DeclarationValue);

    if (!token)
        return '';

    ret = //Utilities.trim(
        beautifyTokenComments(token.leadingTrivia, inDeclarationValue) +
        token.src +
        beautifyTokenComments(token.trailingTrivia, inDeclarationValue);
    //);

    switch (token.token)
    {
    case Tokenizer.EToken.COMMA:
        // make sure that there always is a space after a ":" and a ","
        ret = trailingSpace(ret);
        break;

    case Tokenizer.EToken.COLON:
        // add a trailing space if this token doesn't occur within a selector
        if (!AST.hasParent(token, AST.Selector))
            ret = trailingSpace(ret);
        break;

    case Tokenizer.EToken.LPAREN:
    case Tokenizer.EToken.LBRACKET:
    case Tokenizer.EToken.FUNCTION:
        // remove any trailing whitespaces
        ret = ret.replace(/\s+$/, '');
        break;

    case Tokenizer.EToken.INCLUDE_MATCH:
    case Tokenizer.EToken.DASH_MATCH:
    case Tokenizer.EToken.PREFIX_MATCH:
    case Tokenizer.EToken.SUFFIX_MATCH:
    case Tokenizer.EToken.SUBSTRING_MATCH:
    case Tokenizer.EToken.COLUMN:
        ret = leadingSpace(trailingSpace(ret));
        break;
    }

    return ret;
}
