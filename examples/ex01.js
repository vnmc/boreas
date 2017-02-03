var P = require('../lib/parser');
var Util = require('util');
var InspectorFormatter = require('../lib/inspector-formatter');
var PrettyPrinter = require('../lib/pretty-printer');

var src =
	'html, h1 {\n' +
	'  color: /* style nicely */  red  ; /* nice color */    /* more stuff... */ \n' +
	'  padding: 2.2em;\n' +
	'  /* font-weight: bold; */\n' +
	'}\n' +
	'\n' +
	'h2, p:first-letter, p + a::after {\n' +
	'\t*text-indent: -9999px;\n' +
	'\tcolor: pink /* guess what! */ !important; /* you bet! */\n' +
	'}\n' +
	'h3, a .bcd, a.xyz { border: 1px solid #ccddee; }\n' +
	'@media screen( 1 ,  "x" ) /* only large screens! */ and ( max-width:1111px ) {  h1,h2,h3.red, h4+p, h5 > div { color:red; } b{font-weight: 700;} }';

//src = 'Lorem ipsum dolor sit amet.';

//src = '@media screen( 1 ,  "x" ) /* only large screens! */ and ( max-width:1111px ) {  h1,h2,h3.red, h4+p, h5 > div { color:red; } }';
//src = 'h1\t{ color:red; }';
//src = 'h1:eq(1 { height: calc(10%+ 1em );  h2 { color: red;}';
//src = 'a:hover{color:#ff861c}';
//src= '.csshackie9 {color:#f00\\9\\0\\;}';
//src = 'body {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
//src = '@font-face {\nfont-family: "Bitstream Vera Serif Bold"; src: url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf");';
//src = '@custom-media --narrow-window (max-width: 30em);';
//src = '@document url(http://www.w3.org/), url-prefix(http://www.w3.org/Style/),\ndomain(mozilla.org),regexp("https:.*")\n' +
//	'{ html{color:black;} }';
//src = '@keyframes identifier {\n' +
//	'0% { top: 0; left: 0; }\n' +
//	'30% { top: 50px; }\n' +
//	'68%, 72% { left: 50px; }\n' +
//	'100% { top: 100px; left: 100%; }\n' +
//	'}';
//src = '* {a:b;\n}';
//src = '@import url("hello.css");';
//src = '@page { margin: 0.5cm; }';
//src = '.iconBlack { color: }';
//src = ' @document url("hello.css") domain("x.com")';
//src = '@import url("profiler2.css") screen and (min-width: 600px)';
src = '<!-- html { color: red; } -->';
src = '';
src = '*{font-family:";}';
src = '* { color: blue; }';
src = '@custom-media --narrow-window (max-width: 30em);';
src = '@namespace svg url(http://www.w3.org/1999/xhtml);';

var p = new P.Parser(src);
var x = p.parseStyleSheet();

//console.log(x.getRules()[0].getExtensionName());
console.log(x.getRules()[0].getPrefix());
console.log(x.getRules()[0].getUrl());

var s = x.toString();


console.log('<' + src + '>');
console.log('>' + x.toString() + '<');
console.log(src === s);
//console.log(t);
//console.log(x.getRules()[0].getAnimationName());
//console.log(x.getRules()[0].getDeclarations()[1].getValue().getImportant());
//console.log(x.getRules()[0].getDeclarations()[1].getValue().getText(true));

//console.log(Util.inspect(x.toJSON(), { colors: true, depth: null }));

//console.log(Util.inspect(InspectorFormatter.toJSON(x), { colors: true, depth: null }));

//console.log(PrettyPrinter.beautify(x));

