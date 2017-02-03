import T = require('./types');
import Tokenizer = require('./tokenizer');


var DEBUG = true;


export function checkRanges(node: T.INode, level: number = 0)
{
	if (level === 0)
		console.log('>>> checkRanges');

	if (DEBUG)
		console.log('(%d):: %s -> %s', level, node.toString(), JSON.stringify(node.range));

	// node.range.startLine.should.not.be.above(node.range.endLine);
	if (node.range.startLine > node.range.endLine)
		console.error('startLine > endLine (' + node.range.startLine + ' > ' + node.range.endLine, node.toString());

	if (node.range.startLine === node.range.endLine)
	{
		// node.range.startColumn.should.not.be.above(node.range.endColumn);
		if (node.range.startColumn > node.range.endColumn)
			console.error('startColumn > endColumn (' + node.range.startColumn + ' > ' + node.range.endColumn, node.toString());
	}

	var children = node.getChildren(),
		len = children.length,
		prevChild: T.INode = null,
		i: number;

	for (i = 0; i < len; i++)
	{
		var child = children[i];

		if (DEBUG)
			console.log('(%d):: [%d] %s -> %s', level, i, child.toString(), JSON.stringify(child.range));

		// child.range.startLine.should.not.be.below(node.range.startLine);
		if (child.range.startLine < node.range.startLine)
			console.error('child.startLine < parent.startLine (' + child.range.startLine + ' < ' + node.range.startLine, child.toString());

		// child.range.endLine.should.not.be.above(node.range.endLine);
		if (child.range.endLine > node.range.endLine)
			console.error('child.endLine > parent.endLine (' + child.range.endLine + ' > ' + node.range.endLine, child.toString());

		if (child.range.startLine === node.range.startLine)
		{
			// child.range.startColumn.should.not.be.below(node.range.startColumn);
			if (child.range.startColumn < node.range.startColumn)
			{
				console.error('child.startColumn < parent.startColumn (' +
					child.range.startColumn + ' < ' + node.range.startColumn, child.toString());
			}
		}

		if (child.range.endLine === node.range.endLine)
		{
			// child.range.endColumn.should.not.be.above(node.range.endColumn);
			if (child.range.endColumn > node.range.endColumn)
			{
				console.error('child.endColumn > parent.endColumn (' +
					child.range.endColumn + ' > ' + node.range.endColumn, child.toString());
			}
		}

		if (prevChild !== null)
		{
			// prevChild.range.endLine.should.not.be.above(child.range.startLine);
			if (prevChild.range.endLine > child.range.startLine)
			{
				console.error('prev.endLine > cur.startLine (' +
					prevChild.range.endLine + ' > ' + child.range.startLine, child.toString());
			}

			if (prevChild.range.endLine === child.range.startLine)
			{
				// prevChild.range.endColumn.should.not.be.above(child.range.startColumn);
				if (prevChild.range.endColumn > child.range.startColumn)
				{
					console.error('prev.endColumn > cur.startColumn (' +
						prevChild.range.endColumn + ' > ' + child.range.startColumn, child.toString());
				}
			}
		}

		checkRanges(child, level + 1);

		prevChild = child;
	}

	if (level === 0)
		console.log('<<< checkRanges');
}


export function printAST(node: T.INode, level: number = 0)
{
	var pad = '',
		i: number;

	for (i = 0; i < level; i++)
		pad += '| ';

	if (node instanceof Tokenizer.Token)
		console.log(pad + 'Token: "' + node.toString() + '"', node.range);
	else
		console.log(pad + (<any> node.constructor).name, node.range);

	var children = node.getChildren(),
		len = children.length;

	for (i = 0; i < len; i++)
		printAST(children[i], level + 1);
}
