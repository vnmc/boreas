var should = require('should');

var P = require('../lib/parser');
var AST = require('../lib/ast');


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

	describe('@rules', function()
	{
		it('@charset', function()
		{
			var css = '@charset "utf-8";\n';
			var ast = new P.Parser(css).parseStyleSheet();

			ast.toString().should.eql(css);

			var rule = ast.getRules()[0];
			rule.should.be.an.instanceOf(AST.AtCharset);
			rule.getCharset().should.eql('utf-8');
		});

		it('@custom-media', function()
		{
			var css = '@custom-media --narrow-window (max-width: 30em);';
			var ast = new P.Parser(css).parseStyleSheet();

			ast.toString().should.eql(css);

			var rule = ast.getRules()[0];
			rule.should.be.an.instanceOf(AST.AtCustomMedia);
			rule.getExtensionName().should.eql('--narrow-window');
			rule.getMedia().toString().should.eql('(max-width: 30em)');
		});

		describe('@document', function()
		{
			it('1', function()
			{
				var css = '@document url(http://www.w3.org/), url-prefix(http://www.w3.org/Style/),\ndomain(mozilla.org),regexp("https:.*")\n' +
					'{ html{color:black;} }';
				var ast = new P.Parser(css).parseStyleSheet();

				ast.toString().should.eql(css);

				var rule = ast.getRules()[0];
				rule.should.be.an.instanceOf(AST.AtDocument);
				rule.getUrl().should.eql('http://www.w3.org/');
				rule.getUrlPrefix().should.eql('http://www.w3.org/Style/');
				rule.getDomain().should.eql('mozilla.org');
				rule.getRegexp().should.eql('"https:.*"');
			});

			it('2', function()
			{
				var css = '@document domain(mozilla.org), url-prefix(http://www.w3.org/Style/), regexp("https:.*"), url(http://www.w3.org/)\n' +
					'{ html{color:black;} }';
				var ast = new P.Parser(css).parseStyleSheet();

				ast.toString().should.eql(css);

				var rule = ast.getRules()[0];
				rule.should.be.an.instanceOf(AST.AtDocument);
				rule.getUrl().should.eql('http://www.w3.org/');
				rule.getUrlPrefix().should.eql('http://www.w3.org/Style/');
				rule.getDomain().should.eql('mozilla.org');
				rule.getRegexp().should.eql('"https:.*"');
			});
		});

		it('@font-face', function()
		{
			var css = '@font-face {\nfont-family: "Bitstream Vera Serif Bold"; src: url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf");';
			var ast = new P.Parser(css).parseStyleSheet();

			ast.toString().should.eql(css);

			var rule = ast.getRules()[0];
			rule.should.be.an.instanceOf(AST.AtFontFace);
			rule.getDeclarations().getLength().should.eql(2);
		});

		it('@host', function()
		{
			var css = '@host { html{color:blue;} }';
			var ast = new P.Parser(css).parseStyleSheet();

			ast.toString().should.eql(css);

			var rule = ast.getRules()[0];
			rule.should.be.an.instanceOf(AST.AtHost);
			rule.getRules().getLength().should.eql(1);
		});

		describe('@import', function()
		{
			it('only URL', function()
			{
				var css = '@import url("include.css");';
				var ast = new P.Parser(css).parseStyleSheet();

				ast.toString().should.eql(css);

				var rule = ast.getRules()[0];
				rule.should.be.an.instanceOf(AST.AtImport);
				rule.getUrl().should.eql('include.css');
				rule.getMedia().getLength().should.eql(0);
			});

			it('with media', function()
			{
				var css = '@import url("include.css") screen and (orientation:landscape);';
				var ast = new P.Parser(css).parseStyleSheet();

				ast.toString().should.eql(css);

				var rule = ast.getRules()[0];
				rule.should.be.an.instanceOf(AST.AtImport);
				rule.getUrl().should.eql('include.css');
				rule.getMedia().toString().should.eql('screen and (orientation:landscape)');

			});
		});

		describe('@keyframes', function()
		{
			it('regular', function()
			{
				var css = '@keyframes identifier {\n' +
					'0% { top: 0; left: 0; }\n' +
					'30% { top: 50px; }\n' +
					'68%, 72% { left: 50px; }\n' +
					'100% { top: 100px; left: 100%; }\n' +
					'}';
				var ast = new P.Parser(css).parseStyleSheet();

				ast.toString().should.eql(css);

				var rule = ast.getRules()[0];
				rule.should.be.an.instanceOf(AST.AtKeyframes);
				rule.getAnimationName().should.eql('identifier');
				rule.getRules().getLength().should.eql(4);
			});

			it('vendor-prefixed', function()
			{
				var css = '@-webkit-keyframes identifier {\n' +
					'0% { top: 0; left: 0; }\n' +
					'30% { top: 50px; }\n' +
					'68%, 72% { left: 50px; }\n' +
					'100% { top: 100px; left: 100%; }\n' +
					'}';
				var ast = new P.Parser(css).parseStyleSheet();

				ast.toString().should.eql(css);

				var rule = ast.getRules()[0];
				rule.should.be.an.instanceOf(AST.AtKeyframes);
				rule.getAnimationName().should.eql('identifier');
				rule.getRules().getLength().should.eql(4);
			});
		});

		it('@media', function()
		{
			var css = '@media screen and (max-width: 999px) { body { font-size: 13px }}';
			var ast = new P.Parser(css).parseStyleSheet();

			var rule = ast.getRules()[0];
			rule.should.be.an.instanceOf(AST.AtMedia);
			rule.getMedia().toString().should.eql('screen and (max-width: 999px) ');
			rule.getRules().getLength().should.eql(1);
		});

		describe('@namespace', function()
		{
			it('without prefix', function()
			{
				var css = '@namespace url(http://www.w3.org/1999/xhtml);';
				var ast = new P.Parser(css).parseStyleSheet();

				ast.toString().should.eql(css);

				var rule = ast.getRules()[0];
				rule.should.be.an.instanceOf(AST.AtNamespace);
				rule.getUrl().should.eql('http://www.w3.org/1999/xhtml');
				rule.getPrefix().should.eql('');
			});

			it('with prefix', function()
			{
				var css = '@namespace svg url(http://www.w3.org/1999/xhtml);';
				var ast = new P.Parser(css).parseStyleSheet();

				ast.toString().should.eql(css);

				var rule = ast.getRules()[0];
				rule.should.be.an.instanceOf(AST.AtNamespace);
				rule.getUrl().should.eql('http://www.w3.org/1999/xhtml');
				rule.getPrefix().should.eql('svg');
			});
		});

		it('@page', function()
		{
			var css = '@page :left { margin:2in; }';
			var ast = new P.Parser(css).parseStyleSheet();

			ast.toString().should.eql(css);

			var rule = ast.getRules()[0];
			rule.should.be.an.instanceOf(AST.AtPage);
			rule.getPseudoClass().toString().should.eql(':left ');
			rule.getDeclarations().getLength().should.eql(1);
		});

		it('@supports', function()
		{
			var css = '@supports (display: table-cell) and (not ( display: list-item )) { body{color:red;} }';
			var ast = new P.Parser(css).parseStyleSheet();

			ast.toString().should.eql(css);

			var rule = ast.getRules()[0];
			rule.should.be.an.instanceOf(AST.AtSupports);
			rule.getPrelude().toString().should.eql('(display: table-cell) and (not ( display: list-item )) ');
			rule.getRules().getLength().should.eql(1);
		});
	});
});