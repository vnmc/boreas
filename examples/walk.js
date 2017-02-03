var Tokenizer = require('../lib/tokenizer');
var Parser = require('../lib/parser');
var AST = require('../lib/ast');


function normalize(ast)
{
    if (!ast)
        return '_';

    return ast.walk(function(ast, descend, walker)
    {
        if (ast instanceof Tokenizer.Token)
        {
            switch (ast.token)
            {
            case Tokenizer.EToken.WHITESPACE:
                return ' ';

            case Tokenizer.EToken.AT_KEYWORD:
            case Tokenizer.EToken.RPAREN:
                return ast.src.toLowerCase() + ' ';

            default:
                return ast.src.toLowerCase();
            }
        }
        else if (ast instanceof AST.SelectorCombinator)
            return ast.getToken().token === Tokenizer.EToken.WHITESPACE ? ' ' : ast.getToken().src;
        else if (ast instanceof AST.PseudoClass)
            return ':' + ast.getPseudoClassName().toString();

        var r = descend();
        return Array.isArray(r) ? r.join('') : (r || '');
    }).trim();
}


var src = 'BODY > h1, p .Cl1~ b,\n#code1.cl2 .pink::after';
// var src = '@import url("test.css")';
//var src = '@supports (display:\ttable-cell) and\n\t(display: list-item) and\n\t(display:run-in)';
//var src = '@media screen and (max-width: 600px)';

console.log(normalize(Parser.parseRule(src)));
