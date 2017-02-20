import T = require('./types');
import AST = require('./ast');
import RangeAdapter = require('./inspector-rangeadapter');


export function toJSON(node: T.INode): any
{
	return node.walk(function(ast: T.INode, descend: () => any[], walker: AST.IASTWalker): any
	{
		var range: T.ISourceRange;

		if (ast instanceof AST.Rule)
		{
			return {
				selectorList: (<AST.Rule> ast).getSelectors().walk(walker),
				style: (<AST.Rule> ast).getDeclarations().walk(walker)
			};
		}

		if (ast instanceof AST.SelectorList)
		{
			return {
				selectors: descend(),
				text: RangeAdapter.getText(ast, RangeAdapter.getRange(ast))
			};
		}

		if (ast instanceof AST.Selector)
		{
			return {
				text: (<AST.Selector> ast).getText(),
				range: RangeAdapter.getRange(ast)
			};
		}

		if (ast instanceof AST.DeclarationList)
		{
			range = RangeAdapter.getRange(ast);
			return {
				cssProperties: descend(),
				cssText: RangeAdapter.getText(ast, range),
				range: range
			};
		}

		if (ast instanceof AST.Declaration)
		{
			range = RangeAdapter.getRange(ast);
			var name = (<AST.Declaration> ast).getName();
			var value = (<AST.Declaration> ast).getValue();

			return {
				name: (name && name.toString().trim()) || '',
				value: (value && value.getText()) || '',
				important: (value && value.getImportant()) || false,
				disabled: (<AST.Declaration> ast).getDisabled(),
				text: RangeAdapter.getText(ast, range),
				range: range
			};
		}

		if (ast instanceof AST.AtRule)
		{
			// only descend if the @rule has child rules
			if ((<AST.AtRule> ast).getRules())
				return (<AST.AtRule> ast).getRules().walk(walker);
			return null;
		}

		if (ast instanceof AST.RuleList)
		{
			var result = [],
				ret = descend(),
				len = ret.length;

			// flatten the result and remove "null" occurrences
			for (var i = 0; i < len; i++)
			{
				var r = ret[i];
				if (r === null)
					continue;

				if (Array.isArray(r))
					result = result.concat(r);
				else
					result.push(r);
			}

			return result;
		}
	});
}
