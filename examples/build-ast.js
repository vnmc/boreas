var AST = require('../lib/ast');
var PrettyPrinter = require('../lib/pretty-printer');


var styleSheet = new AST.StyleSheet(
    new AST.RuleList([
        new AST.AtImport('import.css'),
        new AST.Rule(
            new AST.SelectorList([
                new AST.Selector('html'),
                new AST.Selector('h1 + p')
            ]),
            new AST.DeclarationList([
                new AST.Declaration('color', 'blue'),
                new AST.Declaration('border', '1px solid purple', true),
                new AST.Declaration('padding', '1em', false, true)
            ])
        ),
        new AST.AtMedia(
            'screen and (max-width: 1000px)',
            new AST.RuleList([
                new AST.SelectorList([ new AST.Selector('body') ]),
                new AST.DeclarationList([
                    new AST.Declaration('background-color', 'pink')
                ])
            ])
        )
    ])
);

console.log('> toString():');
console.log(styleSheet.toString());

console.log('\n> beautify():');
console.log(PrettyPrinter.beautify(styleSheet));