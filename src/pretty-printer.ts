import T = require('./types');
import AST = require('./ast');
import Tokenizer = require('./tokenizer');

export function stringify(node: T.INode)
{
    return node.walk(function(ast: T.INodeOrToken, descend: () => any[], walker: AST.IASTWalker): any
    {
        if (ast instanceof Tokenizer.Token)
        {
            return (<Tokenizer.Token> ast).toString();
        }

        var ret = descend();
        return Array.isArray(ret) ? ret.join('') : ret;
    });
}

/*
class PrettyPrintWalker implements AST.IASTWalker
{
    text = '';
    level = 0;

    visitBefore(node: T.INodeOrToken): boolean
    {
        if (node instanceof Tokenizer.Token)
            this.text += this.prettyPrintToken(<Tokenizer.Token> node);
        else if (node instanceof AST.ComponentValue)
        {
            this.text += this.prettyPrintToken((<AST.ComponentValue> node).token);
            if ((<AST.ComponentValue> node).getParent() instanceof AST.ComponentValueList)
            {
                // xxx
            }
        }
        else if (node instanceof AST.ComponentValueList)
            this.text += this.prettyPrintComponentValueList(<AST.ComponentValueList> node);
        else if (node instanceof AST.BlockComponentValue)
            ;

        return true;
    }

    visitAfter(node: T.INodeOrToken, data: any): any
    {
        // xxx
    }

    prettyPrintToken(t: Tokenizer.Token): string
    {
        return null;
    }

    prettyPrintComponentValueList(list: AST.ComponentValueList): string
    {
        var s = '',
            value: AST.ASTNode,
            children: T.INode[],
            tokens: Tokenizer.Token[],
            len: number,
            lenTokens: number,
            i: number;

        if (list._hasError)
            return list.errorTokensToString();

        children = list.getChildren();
        if (children)
        {
            len = children.length;
            for (i = 0; i < len; i++)
            {
                value = <AST.ASTNode> children[i];
                s += prettyPrint(value);

                if (i < len - 1)
                {
                    tokens = value.getTokens();
                    if (tokens)
                    {
                        lenTokens = tokens.length;
                        if (lenTokens > 0 && tokens[lenTokens - 1].hasTrailingWhitespace())
                            s += ' ';
                    }
                }
            }
        }

        return s;
    }


}


export function prettyPrint(ast: AST.ASTNode): string
{
    var walker = new PrettyPrintWalker();
    ast.walk(walker);
    return walker.text;
}
*/
