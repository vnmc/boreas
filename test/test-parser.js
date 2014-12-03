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
			ast.getRules().getLength().should.eql(1);
		});

		it('should have correct selector', function()
		{
			var selectors = ast.getRules()[0].getSelectors();
			selectors.getLength().should.eql(1);
			selectors[0].getText().should.eql('body');
		});

		it('should have correct rules', function()
		{
			var declarations = ast.getRules()[0].getDeclarations();
			declarations.getLength().should.eql(2);
			declarations[0].getNameAsString().should.eql('color');
			declarations[0].getValueAsString().should.eql('orange');
			declarations[1].getNameAsString().should.eql('padding');
			declarations[1].getValueAsString().should.eql('1px 2% 3em 4pt !important');
		});

		it('should have important', function()
		{
			ast.getRules()[0].getDeclarations()[1].getValue().getImportant().should.eql(true);
		});

		it('should return text without important', function()
		{
			ast.getRules()[0].getDeclarations()[1].getValue().getText(true).should.eql('1px 2% 3em 4pt');
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
			var rule = ast.getRules()[0];
			rule.range.startLine.should.eql(0);
			rule.range.startColumn.should.eql(0);
			rule.range.endLine.should.eql(3);
			rule.range.endColumn.should.eql(1);
		});

		it('prop2', function()
		{
			var prop2 = ast.getRules()[0].getDeclarations()[1];
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