var should = require('should');

var Parser = require('../lib/parser');
var TC = require('../lib/trivia-converter');
var Utils = require('./utils');


describe('convert to leading trivia', function()
{
    var css = 'body {\n\tcolor: teal;\n  /*xxx*//*yyy*/  background-color:  aquamarine;} @media screen and (min-width: 123px) {\n\tdiv {\n\t\tborder: 1px solid lime;  }\n}';
    var ast = Parser.parse(css);
    TC.convertToLeadingTrivia(ast);

    it('should have correct ranges', function()
    {
        Utils.checkRanges(ast);
        Utils.checkRangeContents(ast, css);
    });

    it('should have correct leading trivia', function()
    {
        var decls = ast.getRules()[0].getDeclarations();

        var lt = decls[0].getName().getTokens()[0].leadingTrivia;
        lt.length.should.eql(1);
        lt[0].src.should.eql('\n\t');

        lt = decls[1].getName().getTokens()[0].leadingTrivia;
        lt.length.should.eql(4);
        lt[0].src.should.eql('\n  ');
        lt[1].src.should.eql('/*xxx*/');
        lt[2].src.should.eql('/*yyy*/');
        lt[3].src.should.eql('  ');
    });
});
