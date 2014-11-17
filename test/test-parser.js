var should = require('should');

var P = require('../lib/parser');


describe('CSS-Parser', function()
{
	describe('parsing rules', function()
	{
		var css = 'body {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
		var ast = new P.Parser(css).parseStyleSheet();

		it('should have correct number of rules', function()
		{
			ast.rules.length.should.eql(1);
		});

		it('should have correct selector', function()
		{
			ast.rules[0].selectors.selectors.length.should.eql(1);
			ast.rules[0].selectors.selectors[0].text.should.eql('body');
		});

		it('should have correct rules', function()
		{
			ast.rules[0].style.declarations.length.should.eql(2);
			ast.rules[0].style.declarations[0].name.should.eql('color');
			ast.rules[0].style.declarations[0].value.value.should.eql('orange');
			ast.rules[0].style.declarations[1].name.should.eql('padding');
			ast.rules[0].style.declarations[1].value.beautify().should.eql('1px 2% 3em 4pt !important');
		});

		it('should have important', function()
		{
			ast.rules[0].style.declarations[1].important.should.eql(true);
		});
	});

	describe('should have correct ranges for', function()
	{
		var css = 'body {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
		var ast = new P.Parser(css).parseStyleSheet();

		it('AST', function()
		{
			 ast.range.startLine.should.eql(0);
			 ast.range.startColumn.should.eql(0);
			 ast.range.endLine.should.eql(3);
			 ast.range.endColumn.should.eql(1);
		});

		it('rule', function()
		{
			var rule = ast.rules[0];
			rule.range.startLine.should.eql(0);
			rule.range.startColumn.should.eql(0);
			rule.range.endLine.should.eql(3);
			rule.range.endColumn.should.eql(1);
		});

		it('prop2', function()
		{
			var prop2 = ast.rules[0].style.declarations[1];
			//console.log(prop2.range);
			prop2.range.startLine.should.eql(2);
			prop2.range.startColumn.should.eql(0);
			prop2.range.endLine.should.eql(3);
			prop2.range.endColumn.should.eql(0);
		});
	});

	it('should unparse', function()
	{
		var css = 'body {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
		var ast = new P.Parser(css).parseStyleSheet();
		ast.toString().should.eql(css);
	});
});