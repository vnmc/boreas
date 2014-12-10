var Parser = require('../lib/parser');
var PrettyPrinter = require('../lib/pretty-printer');

var src =
    '#globalheader[lang="en-US"] .gh-tab-store .gh-tab-link{width:2.16667em}' +
    '#abc, .abc, a+b, a ~b, a~ .b, a .b, a.b, a[id~=b], a[ id *= b ], a::after {color: red;}' +
    '::-webkit-scrollbar-track:hover {color: green;}';

var ast = Parser.parse(src);
console.log(PrettyPrinter.beautify(ast));