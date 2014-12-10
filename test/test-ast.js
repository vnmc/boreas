var should = require('should');

var AST = require('../lib/ast');
var Parser = require('../lib/parser');
var Utils = require('./utils');


describe('AST', function()
{
	describe('insert selector', function()
	{
		it('should be appended', function()
		{
			var css = 'body {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			var selectors = ast.getRules()[0].getSelectors();

			selectors.insertSelector(Parser.parseSelector('p + code'));

			selectors.getLength().should.eql(2);
			selectors[0].getText().should.eql('body');
			selectors[1].getText().should.eql('p + code');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});

		it('should be inserted in the middle', function()
		{
			var css = 'body, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			var selectors = ast.getRules()[0].getSelectors();

			selectors.insertSelector(Parser.parseSelector('pre'), 1);
			//console.log(ast.toString());

			selectors.getLength().should.eql(3);
			selectors[0].getText().should.eql('body');
			selectors[1].getText().should.eql('pre');
			selectors[2].getText().should.eql('td');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});

		it('should be prepended', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			var selectors = ast.getRules()[0].getSelectors();

			selectors.insertSelector(Parser.parseSelector('table'), 0);
			//console.log(ast.toString());

			selectors.getLength().should.eql(3);
			selectors[0].getText().should.eql('table');
			selectors[1].getText().should.eql('th');
			selectors[2].getText().should.eql('td');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});
	});

	describe('set selectors', function()
	{
		it('should remove all selectors', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			var selectors = ast.getRules()[0].getSelectors();
			selectors.deleteAllSelectors();

			selectors.getLength().should.eql(0);

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});

		it('should replace current selectors', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			var selectors = ast.getRules()[0].getSelectors();
			selectors.setSelectors([
				Parser.parseSelector('html'),
				Parser.parseSelector('body'),
				Parser.parseSelector('code.highlight'),
				Parser.parseSelector('li+a:hover')
			]);
			//console.log(ast.toString());

			selectors.getLength().should.eql(4);
			selectors[0].getText().should.eql('html');
			selectors[1].getText().should.eql('body');
			selectors[2].getText().should.eql('code.highlight');
			selectors[3].getText().should.eql('li+a:hover');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});

		it('should replace current selectors from selector list', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			var selectors = ast.getRules()[0].getSelectors();
			selectors.setSelectors(Parser.parseSelectors('html, body,\tcode.highlight,\nli+a:hover '));
			//console.log(ast.toString());

			selectors.getLength().should.eql(4);
			selectors[0].getText().should.eql('html');
			selectors[1].getText().should.eql('body');
			selectors[2].getText().should.eql('code.highlight');
			selectors[3].getText().should.eql('li+a:hover');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});
	});

	describe('insert declaration', function()
	{
		it('should be appended', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			var declarations = ast.getRules()[0].getDeclarations();

			declarations.insertDeclaration(Parser.parseDeclaration('background-color: hotpink;'));

			declarations.getLength().should.eql(3);
			declarations[0].getNameAsString().should.eql('color');
			declarations[1].getNameAsString().should.eql('padding');
			declarations[2].getNameAsString().should.eql('background-color');
			declarations[2].getValueAsString().should.eql('hotpink');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});

		it('should be inserted in the middle', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			var declarations = ast.getRules()[0].getDeclarations();

			declarations.insertDeclaration(Parser.parseDeclaration('background-color: hotpink;'), 1);

			declarations.getLength().should.eql(3);
			declarations[0].getNameAsString().should.eql('color');
			declarations[2].getNameAsString().should.eql('padding');
			declarations[1].getNameAsString().should.eql('background-color');
			declarations[1].getValueAsString().should.eql('hotpink');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});

		it('should be prepended', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			var declarations = ast.getRules()[0].getDeclarations();

			declarations.insertDeclaration(Parser.parseDeclaration('background-color: hotpink;'), 0);

			declarations.getLength().should.eql(3);
			declarations[1].getNameAsString().should.eql('color');
			declarations[2].getNameAsString().should.eql('padding');
			declarations[0].getNameAsString().should.eql('background-color');
			declarations[0].getValueAsString().should.eql('hotpink');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});
	});

	describe('insert rule', function()
	{
		it('should be appended', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			ast.insertRule(Parser.parseRule('code, pre>p::after {}'));

			var rules = ast.getRules();
			rules.getLength().should.eql(2);

			rules[0].getSelectors()[0].getText().should.eql('th');
			rules[1].getSelectors().getLength().should.eql(2);
			rules[1].getSelectors()[0].getText().should.eql('code');
			rules[1].getSelectors()[1].getText().should.eql('pre>p::after');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});

		it('should be inserted in the middle', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			ast.insertRule(Parser.parseRule('code, pre>p::after {}'), 1);

			var rules = ast.getRules();
			rules.getLength().should.eql(3);

			rules[0].getSelectors()[0].getText().should.eql('th');
			rules[1].getSelectors().getLength().should.eql(2);
			rules[1].getSelectors()[0].getText().should.eql('code');
			rules[1].getSelectors()[1].getText().should.eql('pre>p::after');
			rules[2].getSelectors()[0].getText().should.eql('article.story');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});

		it('should be prepended', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			ast.insertRule(Parser.parseRule('code, pre>p::after {}'), 0);

			var rules = ast.getRules();
			rules.getLength().should.eql(3);

			rules[0].getSelectors().getLength().should.eql(2);
			rules[0].getSelectors()[0].getText().should.eql('code');
			rules[0].getSelectors()[1].getText().should.eql('pre>p::after');
			rules[1].getSelectors()[0].getText().should.eql('th');
			rules[2].getSelectors()[0].getText().should.eql('article.story');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});
	});

	describe('set selector text', function()
	{
		it('1', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			ast.getRules()[0].getSelectors()[0].setText('table');

			ast.getRules()[0].getSelectors().getLength().should.eql(2);
			ast.getRules()[0].getSelectors()[0].getText().should.eql('table');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});

		it('2', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			ast.getRules()[0].getSelectors()[0].setText('table\n');

			ast.getRules()[0].getSelectors().getLength().should.eql(2);
			ast.getRules()[0].getSelectors()[0].getText().should.eql('table');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});

		it('3', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			ast.getRules()[0].getSelectors()[0].setText('\ntable\n');

			ast.getRules()[0].getSelectors().getLength().should.eql(2);
			ast.getRules()[0].getSelectors()[0].getText().should.eql('table');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});

		it('4', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
			var ast = Parser.parse(css);
			Utils.checkRangeContents(ast);

			ast.getRules()[0].getSelectors()[0].setText('a');

			ast.getRules()[0].getSelectors().getLength().should.eql(2);
			ast.getRules()[0].getSelectors()[0].getText().should.eql('a');

			Utils.checkRanges(ast);
			Utils.checkRangeContents(ast);
		});
	});

	describe('modify property', function()
	{
		describe('name', function()
		{
			it('1', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = Parser.parse(css);
				Utils.checkRangeContents(ast);

				ast.getRules()[0].getDeclarations()[0].setName('background-color');

				ast.getRules()[0].getDeclarations()[0].getNameAsString().should.eql('background-color');

				Utils.checkRanges(ast);
				Utils.checkRangeContents(ast);
			});
		});

		describe('value', function()
		{
			it('1', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = Parser.parse(css);
				Utils.checkRangeContents(ast);

				ast.getRules()[0].getDeclarations()[0].setValue('lime');

				ast.getRules()[0].getDeclarations()[0].getValueAsString().should.eql('lime');

				Utils.checkRanges(ast);
				Utils.checkRangeContents(ast);
			});
		});

		describe('disabled', function()
		{
			it('1', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = Parser.parse(css);
				Utils.checkRangeContents(ast);

				ast.getRules()[0].getDeclarations()[0].setDisabled(true);

				ast.getRules()[0].getDeclarations()[0].getDisabled().should.eql(true);
				ast.getRules()[0].getDeclarations()[0].getNameAsString().should.eql('color');
				ast.getRules()[0].getDeclarations()[0].getValueAsString().should.eql('orange');

				var s = ast.getRules()[0].getDeclarations()[0].toString();
				s.should.containEql('/*');
				s.should.containEql('*/');

				Utils.checkRanges(ast);
				Utils.checkRangeContents(ast);
			});
		});

		describe('text', function()
		{
			it('1', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = Parser.parse(css);
				Utils.checkRangeContents(ast);

				ast.getRules()[0].getDeclarations()[0].setText('background-color: yellow;');

				ast.getRules()[0].getDeclarations()[0].getNameAsString().should.eql('background-color');
				ast.getRules()[0].getDeclarations()[0].getValueAsString().should.eql('yellow');
				ast.getRules()[0].getDeclarations()[0].getDisabled().should.eql(false);
				ast.getRules()[0].getDeclarations()[0].getImportant().should.eql(false);

				ast.getRules()[0].getDeclarations()[1].getNameAsString().should.eql('padding');

				Utils.checkRanges(ast);
				Utils.checkRangeContents(ast);
			});

			it('2', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = Parser.parse(css);
				Utils.checkRangeContents(ast);

				ast.getRules()[0].getDeclarations()[0].setText('/* background-color: yellow; */');

				ast.getRules()[0].getDeclarations()[0].getNameAsString().should.eql('background-color');
				ast.getRules()[0].getDeclarations()[0].getValueAsString().should.eql('yellow');
				ast.getRules()[0].getDeclarations()[0].getDisabled().should.eql(true);
				ast.getRules()[0].getDeclarations()[0].getImportant().should.eql(false);

				ast.getRules()[0].getDeclarations()[1].getNameAsString().should.eql('padding');

				Utils.checkRanges(ast);
				Utils.checkRangeContents(ast);
			});

			it('3', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = Parser.parse(css);
				Utils.checkRangeContents(ast);

				ast.getRules()[0].getDeclarations()[0].setText('/* background-color: yellow !important ; */');

				ast.getRules()[0].getDeclarations()[0].getNameAsString().should.eql('background-color');
				ast.getRules()[0].getDeclarations()[0].getValueAsString().should.eql('yellow !important');
				ast.getRules()[0].getDeclarations()[0].getDisabled().should.eql(true);
				ast.getRules()[0].getDeclarations()[0].getImportant().should.eql(true);

				ast.getRules()[0].getDeclarations()[1].getNameAsString().should.eql('padding');

				Utils.checkRanges(ast);
				Utils.checkRangeContents(ast);
			});

			it('4', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = Parser.parse(css);
				Utils.checkRangeContents(ast);

				ast.getRules()[0].getDeclarations()[1].setText('background-color: yellow;');

				ast.getRules()[0].getDeclarations()[1].getNameAsString().should.eql('background-color');
				ast.getRules()[0].getDeclarations()[1].getValueAsString().should.eql('yellow');
				ast.getRules()[0].getDeclarations()[1].getDisabled().should.eql(false);
				ast.getRules()[0].getDeclarations()[1].getImportant().should.eql(false);

				ast.getRules()[0].getDeclarations()[0].getNameAsString().should.eql('color');

				Utils.checkRanges(ast);
				Utils.checkRangeContents(ast);
			});
		});
	});
});
