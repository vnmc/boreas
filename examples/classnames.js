var Tokenizer = require('../lib/tokenizer');
var Parser = require('../lib/parser');
var AST = require('../lib/ast');

function gatherClassNames(ast)
{
    var classNames = {};

    ast.walk(function(ast, descend)
    {
        if (ast instanceof AST.ClassSelector)
        {
            classNames[ast.getClassName().toString().trim()] = true;
            return null;
        }
        else if ((ast instanceof AST.SimpleSelector) || (ast instanceof AST.DeclarationList))
        {
            // skip other simple selectors and declarations
            return null;
        }
    });

    return Object.keys(classNames);
}

var src =
    'body { color: yellow; }\n' +
    '.marker { color: blue; }\n' +
    '.dot > h2 { color: violet; }\n' +
    '.table .chair { color: teal; }\n' +
    '.table tr, .dot .dash, h3 { color: orchid; }\n' +
    '@media screen and (min-width: 888px) {\n' +
        '.dash { color: sandybrown; }\n' +
        '.line .dot { color: pink; }\n' +
    '}';

console.log(gatherClassNames(Parser.parse(src)));
