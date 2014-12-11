require('should');

var Fs = require('fs');
var Path = require('path');

var P = require('../lib/parser');
var Utils = require('./utils');
var PrettyPrinter = require('../lib/pretty-printer');


var dir = 'fixtures';

function checkFile(src, ast)
{
    ast.toString().should.eql(src);
    Utils.checkRanges(ast);
}

function checkAST(src, ast)
{
    var src1 = PrettyPrinter.beautify(ast);
    PrettyPrinter.beautify(P.parse(src1)).should.eql(src1);
}

function testFiles(testFnx)
{
    var files = Fs.readdirSync(dir);
    var len = files.length;

    var invokeTest = function(file)
    {
        var src = Fs.readFileSync(dir + Path.sep + file, 'utf8');
        var start = Date.now();
        var ast = new P.parse(src);
        console.log(Date.now() - start);

        testFnx(src, ast);
    };

    for (var i = 0; i < len; i++)
    {
        var file = files[i];
        it(file, invokeTest.bind(null, file));
    }
}

describe('CSS Parser should parse and unparse', testFiles.bind(null, checkFile));
//describe('CSS Parser should recreate AST', testFiles.bind(null, checkAST));
