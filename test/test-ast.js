var should = require('should');

var CSSParser = require('../lib/ast');

describe('AST', function()
{
	function checkRanges(node, level)
	{
		if (level === undefined)
			level = 0;

		//console.log('(%d):: %s -> %s', level, node.toString(), JSON.stringify(node.range));

		node.range.startLine.should.not.be.above(node.range.endLine);
		if (node.range.startLine === node.range.endLine)
			node.range.startColumn.should.not.be.above(node.range.endColumn);

		var children = node.children;
		var len = children.length;
		var prevChild = null;

		for (var i = 0; i < len; i++)
		{
			var child = children[i];

			//console.log('(%d):: [%d] %s -> %s', level, i, child.toString(), JSON.stringify(child.range));

			child.range.startLine.should.not.be.below(node.range.startLine);
			child.range.endLine.should.not.be.above(node.range.endLine);

			if (child.range.startLine === node.range.startLine)
				child.range.startColumn.should.not.be.below(node.range.startColumn);
			if (child.range.endLine === node.range.endLine)
				child.range.endColumn.should.not.be.above(node.range.endColumn);

			if (prevChild !== null)
			{
				prevChild.range.endLine.should.not.be.above(child.range.startLine);
				if (prevChild.range.endLine === child.range.startLine)
					prevChild.range.endColumn.should.not.be.above(child.range.startColumn);
			}

			checkRanges(child, level + 1);

			prevChild = child;
		}
	}


	describe('insert selector', function()
	{
		it('should be appended', function()
		{
			var css = 'body {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = CSSParser.parse(css);
			ast.rules[0].selectors.insertSelector('p + code');

			ast.rules[0].selectors.children.length.should.eql(2);
			ast.rules[0].selectors.selectors[0].text.should.eql('body');
			ast.rules[0].selectors.selectors[1].text.should.eql('p + code');
			checkRanges(ast);
		});

		it('should be inserted in the middle', function()
		{
			var css = 'body, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = CSSParser.parse(css);
			ast.rules[0].selectors.insertSelector('pre', 1);

			ast.rules[0].selectors.children.length.should.eql(3);
			ast.rules[0].selectors.selectors[0].text.should.eql('body');
			ast.rules[0].selectors.selectors[1].text.should.eql('pre');
			ast.rules[0].selectors.selectors[2].text.should.eql('td');
			checkRanges(ast);
		});

		it('should be prepended', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = CSSParser.parse(css);
			ast.rules[0].selectors.insertSelector('table', 0);

			ast.rules[0].selectors.children.length.should.eql(3);
			ast.rules[0].selectors.selectors[0].text.should.eql('table');
			ast.rules[0].selectors.selectors[1].text.should.eql('th');
			ast.rules[0].selectors.selectors[2].text.should.eql('td');
			checkRanges(ast);
		});
	});

	describe('set selectors', function()
	{
		it('should remove all selectors', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = CSSParser.parse(css);
			ast.rules[0].selectors.selectors = '';

			ast.rules[0].selectors.children.length.should.eql(0);
			checkRanges(ast);
		});

		it('should replace current selectors', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = CSSParser.parse(css);
			ast.rules[0].selectors.selectorText = 'html, body, code.highlight, li+a:hover';

			ast.rules[0].selectors.children.length.should.eql(4);
			ast.rules[0].selectors.selectors[0].text.should.eql('html');
			ast.rules[0].selectors.selectors[1].text.should.eql('body');
			ast.rules[0].selectors.selectors[2].text.should.eql('code.highlight');
			ast.rules[0].selectors.selectors[3].text.should.eql('li+a:hover');
			checkRanges(ast);
		});
	});

	describe('insert property', function()
	{
		it('should be appended', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = CSSParser.parse(css);
			ast.rules[0].style.insertPropertyWithName('background-color', 'hotpink');

			ast.rules[0].style.children.length.should.eql(3);
			ast.rules[0].style.declarations[0].name.should.eql('color');
			ast.rules[0].style.declarations[1].name.should.eql('padding');
			ast.rules[0].style.declarations[2].name.should.eql('background-color');
			ast.rules[0].style.declarations[2].value.should.eql('hotpink');
			checkRanges(ast);
		});

		it('should be inserted in the middle', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = CSSParser.parse(css);
			ast.rules[0].style.insertPropertyWithName('background-color', 'hotpink', 1);

			ast.rules[0].style.children.length.should.eql(3);
			ast.rules[0].style.declarations[0].name.should.eql('color');
			ast.rules[0].style.declarations[2].name.should.eql('padding');
			ast.rules[0].style.declarations[1].name.should.eql('background-color');
			ast.rules[0].style.declarations[1].value.should.eql('hotpink');
			checkRanges(ast);
		});

		it('should be prepended', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = CSSParser.parse(css);
			ast.rules[0].style.insertPropertyWithName('background-color', 'hotpink', 0);

			ast.rules[0].style.children.length.should.eql(3);
			ast.rules[0].style.declarations[1].name.should.eql('color');
			ast.rules[0].style.declarations[2].name.should.eql('padding');
			ast.rules[0].style.declarations[0].name.should.eql('background-color');
			ast.rules[0].style.declarations[0].value.should.eql('hotpink');
			checkRanges(ast);
		});
	});

	describe('insert rule', function()
	{
		it('should be appended', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}';
			var ast = CSSParser.parse(css);
			ast.insertRule('code, pre>p::after');

			ast.rules.length.should.eql(2);
			ast.rules[0].selectors.selectors[0].text.should.eql('th');
			ast.rules[1].selectors.selectors.length.should.eql(2);
			ast.rules[1].selectors.selectors[0].text.should.eql('code');
			ast.rules[1].selectors.selectors[1].text.should.eql('pre>p::after');
			checkRanges(ast);
		});

		it('should be inserted in the middle', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
			var ast = CSSParser.parse(css);
			ast.insertRule('code, pre>p::after', 1);

			ast.rules.length.should.eql(3);
			ast.rules[0].selectors.selectors[0].text.should.eql('th');
			ast.rules[1].selectors.selectors.length.should.eql(2);
			ast.rules[1].selectors.selectors[0].text.should.eql('code');
			ast.rules[1].selectors.selectors[1].text.should.eql('pre>p::after');
			ast.rules[2].selectors.selectors[0].text.should.eql('article.story');
			checkRanges(ast);
		});

		it('should be prepended', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
			var ast = CSSParser.parse(css);
			ast.insertRule('code, pre>p::after', 0);

			ast.rules.length.should.eql(3);
			ast.rules[0].selectors.selectors.length.should.eql(2);
			ast.rules[0].selectors.selectors[0].text.should.eql('code');
			ast.rules[0].selectors.selectors[1].text.should.eql('pre>p::after');
			ast.rules[1].selectors.selectors[0].text.should.eql('th');
			ast.rules[2].selectors.selectors[0].text.should.eql('article.story');
			checkRanges(ast);
		});
	});

	describe('set selector text', function()
	{
		it('1', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
			var ast = CSSParser.parse(css);
			ast.rules[0].selectors.selectors[0].text = 'table';

			ast.rules[0].selectors.selectors.length.should.eql(2);
			ast.rules[0].selectors.selectors[0].text.should.eql('table');
			checkRanges(ast);
		});

		it('2', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
			var ast = CSSParser.parse(css);
			ast.rules[0].selectors.selectors[0].text = 'table\n';

			ast.rules[0].selectors.selectors.length.should.eql(2);
			ast.rules[0].selectors.selectors[0].text.should.eql('table');
			checkRanges(ast);
		});

		it('3', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
			var ast = CSSParser.parse(css);
			ast.rules[0].selectors.selectors[0].text = '\ntable\n';

			ast.rules[0].selectors.selectors.length.should.eql(2);
			ast.rules[0].selectors.selectors[0].text.should.eql('table');
			checkRanges(ast);
		});

		it('4', function()
		{
			var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
			var ast = CSSParser.parse(css);
			ast.rules[0].selectors.selectors[0].text = 'a';

			ast.rules[0].selectors.selectors.length.should.eql(2);
			ast.rules[0].selectors.selectors[0].text.should.eql('a');
			checkRanges(ast);
		});
	});

	describe('modify property', function()
	{
		describe('name', function()
		{
			it('1', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = CSSParser.parse(css);
				ast.rules[0].style.declarations[0].name = 'background-color';

				ast.rules[0].style.declarations[0].name.should.eql('background-color');
				checkRanges(ast);
			});
		});

		describe('value', function()
		{
			it('1', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = CSSParser.parse(css);
				ast.rules[0].style.declarations[0].value = 'lime';

				ast.rules[0].style.declarations[0].value.should.eql('lime');
				checkRanges(ast);
			});
		});

		describe('disabled', function()
		{
			it('1', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = CSSParser.parse(css);
				ast.rules[0].style.declarations[0].disabled = true;

				ast.rules[0].style.declarations[0].disabled.should.eql(true);
				ast.rules[0].style.declarations[0].name.should.eql('color');
				ast.rules[0].style.declarations[0].value.should.eql('orange');

				var s = ast.rules[0].style.declarations[0].beautify();
				s.should.containEql('/*');
				s.should.containEql('*/');
				checkRanges(ast);
			});
		});

		describe('text', function()
		{
			it('1', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = CSSParser.parse(css);
				ast.rules[0].style.declarations[0].text = 'background-color: yellow;';

				ast.rules[0].style.declarations[0].name.should.eql('background-color');
				ast.rules[0].style.declarations[0].value.should.eql('yellow');
				ast.rules[0].style.declarations[0].disabled.should.eql(false);
				ast.rules[0].style.declarations[0].important.should.eql(false);

				ast.rules[0].style.declarations[1].name.should.eql('padding');

				checkRanges(ast);
			});

			it('2', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = CSSParser.parse(css);
				ast.rules[0].style.declarations[0].text = '/* background-color: yellow; */';

				ast.rules[0].style.declarations[0].name.should.eql('background-color');
				ast.rules[0].style.declarations[0].value.should.eql('yellow');
				ast.rules[0].style.declarations[0].disabled.should.eql(true);
				ast.rules[0].style.declarations[0].important.should.eql(false);

				ast.rules[0].style.declarations[1].name.should.eql('padding');

				checkRanges(ast);
			});

			it('3', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = CSSParser.parse(css);
				ast.rules[0].style.declarations[0].text = '/* background-color: yellow !important ; */';

				ast.rules[0].style.declarations[0].name.should.eql('background-color');
				ast.rules[0].style.declarations[0].value.should.eql('yellow !important');
				ast.rules[0].style.declarations[0].disabled.should.eql(true);
				ast.rules[0].style.declarations[0].important.should.eql(true);

				ast.rules[0].style.declarations[1].name.should.eql('padding');

				checkRanges(ast);
			});

			it('4', function()
			{
				var css = 'th, td {\n\tcolor: orange;\npadding: 1px 2% 3em 4pt !important;\n}\narticle.story { font-size: 2em; }';
				var ast = CSSParser.parse(css);
				ast.rules[0].style.declarations[1].text = 'background-color: yellow;';

				ast.rules[0].style.declarations[1].name.should.eql('background-color');
				ast.rules[0].style.declarations[1].value.should.eql('yellow');
				ast.rules[0].style.declarations[1].disabled.should.eql(false);
				ast.rules[0].style.declarations[1].important.should.eql(false);

				ast.rules[0].style.declarations[0].name.should.eql('color');

				checkRanges(ast);
			});
		});
	});
});