var Tokenizer = require('../lib/tokenizer');

// example CSS code
var src = '\t*, h1/* paragraphs */ p {\n\t/* first prop */ color: blue;}\n';
src = 'U+26 u+01f-23a U+20?? U+12345678 U+1fff8??';

// create the tokenizer
var tokenizer = new Tokenizer.Tokenizer(src);

// print all the tokens
var t;
while ((t = tokenizer.nextToken()).token !== Tokenizer.EToken.EOF)
    console.log(t.src);