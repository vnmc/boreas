var AST = require('../lib/ast');
var Parser = require('../lib/parser');
var Utilities = require('../lib/utilities');

function checkRangeContents(node, src, level)
{
    if (level === undefined)
        level = 0;
    if (src === undefined && level === 0)
        src = node.toString();

    var txt = Utilities.getTextFromRange(src, node.range);
    if (txt !== node.toString())
        debugger;

    var children = node.getChildren();
    var len = children.length;

    for (var i = 0; i < len; i++)
        checkRangeContents(children[i], src, level + 1);
}

function checkRanges(node, level)
{
    if (level === undefined)
        level = 0;

    if (node.range.startLine > node.range.endLine)
    {
        console.log('node.range.startLine > node.range.endLine', node.toString());
        debugger;
    }

    if (node.range.startLine === node.range.endLine)
    {
        if (node.range.startColumn > node.range.endColumn)
        {
            console.log('node.range.startColumn > node.range.endColumn', node.toString());
            debugger;
        }
    }

    var children = node.getChildren();
    var len = children.length;
    var prevChild = null;

    for (var i = 0; i < len; i++)
    {
        var child = children[i];

        if (child.range.startLine < node.range.startLine)
        {
            console.log('child.range.startLine < node.range.startLine', child.toString());
            debugger;
        }
        if (child.range.endLine > node.range.endLine)
        {
            console.log('child.range.endLine > node.range.endLine', child.toString());
            debugger;
        }

        if (child.range.startLine === node.range.startLine)
        {
            if (child.range.startColumn.should < node.range.startColumn)
            {
                console.log('child.range.startColumn.should < node.range.startColumn', child.toString());
                debugger;
            }
        }
        if (child.range.endLine === node.range.endLine)
        {
            if (child.range.endColumn.should > node.range.endColumn)
            {
                console.log('child.range.endColumn.should > node.range.endColumn', child.toString());
                debugger;
            }
        }

        if (prevChild !== null)
        {
            if (prevChild.range.endLine > child.range.startLine)
            {
                console.log('prevChild.range.endLine > child.range.startLine', prevChild.toString());
                debugger;
            }

            if (prevChild.range.endLine === child.range.startLine)
            {
                if (prevChild.range.endColumn > child.range.startColumn)
                {
                    console.log('prevChild.range.endColumn > child.range.startColumn', prevChild.toString());
                    debugger;
                }
            }
        }

        checkRanges(child, level + 1);

        prevChild = child;
    }
}

global.checkRanges = checkRanges;
global.checkRangeContents = checkRangeContents;


/*
var css = 'body {\n\tcolor: orange;\n\tpadding: 1px 2% 3em 4pt !important;\n}';
var ast = Parser.parse(css);
checkRangeContents(ast);

var selectors = ast.getRules()[0].getSelectors();

selectors.insertSelector(Parser.parseSelector('p + code'));

console.log(selectors[1].getText());
console.log(ast.toString());
*/


/*
var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
var ast = Parser.parse(css);
checkRangeContents(ast);

var declarations = ast.getRules()[0].getDeclarations();

declarations.insertDeclaration(Parser.parseDeclaration('background-color: hotpink;'));

console.log(declarations.toString());
*/


/*
var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
var ast = Parser.parse(css);
checkRangeContents(ast);

ast.getRules()[0].getDeclarations()[0].setText('/* background-color: yellow; * /');
console.log(ast.toString());
*/


/*
var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
var ast = Parser.parse(css);
checkRangeContents(ast);

var selectors = ast.getRules()[0].getSelectors();
selectors.setSelectors(Parser.parseSelectors('html, body,\tcode.highlight,\nli+a:hover '));
console.log(ast.toString());
*/


/*
var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
var ast = Parser.parse(css);
checkRangeContents(ast);

var selectors = ast.getRules()[0].getSelectors();
selectors.setSelectors([
    Parser.parseSelector('html'),
    Parser.parseSelector('body'),
    Parser.parseSelector('code.highlight'),
    Parser.parseSelector('li+a:hover')
]);
checkRanges(ast);
console.log(ast.toString());

*/


/*
var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
var ast = Parser.parse(css);
checkRangeContents(ast);

var declarations = ast.getRules()[0].getDeclarations();

declarations.insertDeclaration(Parser.parseDeclaration('background-color: hotpink;'));
checkRanges(ast);
console.log(ast.toString());
   */


/*
var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
var ast = Parser.parse(css);
checkRangeContents(ast);

var declarations = ast.getRules()[0].getDeclarations();

declarations.insertDeclaration(Parser.parseDeclaration('background-color: hotpink;'), 0);
checkRanges(ast);
console.log(ast.toString());
*/



var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
var ast = Parser.parse(css);
checkRangeContents(ast);

ast.getRules()[0].getDeclarations()[0].setDisabled(true);
checkRanges(ast);
console.log(ast.toString());
