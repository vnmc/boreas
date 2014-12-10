var Tokenizer = require('../lib/tokenizer');
var Parser = require('../lib/parser');


/**
 * This function re-implements "toString" using an ASTWalker.
 * If a token is encountered, create a string from it; otherwise
 * concatenate the strings in the array returned by "descend" and
 * return the result string.
 */
function stringify(node)
{
    return node.walk(function(ast, descend)
    {
        // stringify tokens
        if (ast instanceof Tokenizer.Token)
            return ast.getPrologue() + ast.src + ast.getEpilogue();

        // if any other AST node is encountered, just descend further into the tree
        // and concatenate the strings returned
        var ret = descend();
        return Array.isArray(ret) ? ret.join('') : ret;
    });
}


// some example CSS source
var src =
    'html, h1 {\n' +
    '  color: /* style nicely */  red  ; /* nice color */\n' +
    '  padding: 2.2em;\n' +
    '  /* font-weight: bold; */\n' +
    '}\n' +
    '\n' +
    'h2, p:first-letter, p + a::after {\n' +
    '\t*text-indent: -9999px;\n' +
    '\tcolor: pink /* guess what! */ !important; /* you bet! */\n' +
    '}\n' +
    'h3, a .bcd, a.xyz { border: 1px solid #ccddee; }\n' +
    '@media screen( 1 ,  "x" ) /* only large screens! */ and ( max-width:1111px ) {\n'+
    '\th1,h2,h3.red, h4+p, h5 > div { color:red; }\n' +
    '}';

// parse the CSS
var ast = Parser.parse(src);

// test the "stringify" function
console.log(stringify(ast));