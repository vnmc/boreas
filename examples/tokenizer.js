var Tokenizer = require('../lib/tokenizer');

// example CSS code
var src = '\t* {\n\t/* first prop */ color: blue;}\n';

// create the tokenizer
var tokenizer = new Tokenizer.Tokenizer(src);

// print all the tokens
var t;
while ((t = tokenizer.nextToken()).token !== Tokenizer.EToken.EOF)
    console.log(t.src);