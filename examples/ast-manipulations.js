var AST = require('../lib/ast');
var Parser = require('../lib/parser');
var Utilities = require('../lib/utilities');


var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';

// parse the CSS source
var stylesheet = Parser.parse(css);

// insert a new rule
stylesheet.insertRule(new AST.Rule(
    new AST.SelectorList([
        new AST.Selector('h1')
    ]),
    new AST.DeclarationList([
        new AST.Declaration('color', 'blue')
    ])
));

// insert a new selector at the first position of the first rule
stylesheet.getRules()[0].getSelectors().insertSelector(new AST.Selector('tr.odd'), 0);

// insert a new declaration (property)
stylesheet.getRules()[0].getDeclarations().insertDeclaration(new AST.Declaration('border', '1px solid gray'));

console.log(stylesheet.toString());
