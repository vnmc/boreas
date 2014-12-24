var Fs = require('fs');

var Parser = require('../lib/parser');
var PrettyPrinter = require('../lib/pretty-printer');

/*
var src =
    '#globalheader[lang="en-US"] .gh-tab-store .gh-tab-link{width:2.16667em}' +
    '#abc, .abc, a+b, a ~b, a~ .b, a .b, a.b, a[id~=b], a[ id *= b ], a::after {color: red;}' +
    '::-webkit-scrollbar-track:hover {color: green;}';
*/

//var src = Fs.readFileSync('../test/fixtures/test.css', 'utf8');
var src = '*\t/* hello! */ {border: 1px\n/*x*/solid\t red ; } @media screen and (max-width:111px) { body{color:blue}}';

var ast = Parser.parse(src);
console.log(PrettyPrinter.beautify(ast));