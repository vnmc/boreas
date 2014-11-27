import T = require('./types');
import AST = require('./ast');


export function toJSON(node: T.INode): any
{
    return node.walk(function(ast: T.INodeOrToken, descend: () => any[], walker: AST.IASTWalker): any
    {
        if (ast instanceof AST.Rule)
        {
            return {
                selectorList: (<AST.Rule> ast).selectors.walk(walker),
                style: (<AST.Rule> ast).declarations.walk(walker)
            };
        }

        if (ast instanceof AST.SelectorList)
        {
            return {
                selectors: descend(),
                text: ast.toString().trim()
            };
        }

        if (ast instanceof AST.Selector)
        {
            return {
                value: (<AST.Selector> ast).getText(),
                range: ast.range
            };
        }

        if (ast instanceof AST.DeclarationList)
        {
            return {
                cssProperties: descend(),
                cssText: ast.toString().trim(),
                range: ast.range
            };
        }

        if (ast instanceof AST.Declaration)
        {
            return {
                name: ((<AST.Declaration> ast).name && (<AST.Declaration> ast).name.toString().trim()) || '',
                value: ((<AST.Declaration> ast).value && (<AST.Declaration> ast).value.getText()) || '',
                important: ((<AST.Declaration> ast).value && (<AST.Declaration> ast).value.getImportant()) || false,
                disabled: (<AST.Declaration> ast).getDisabled(),
                text: ast.toString().trim(),
                range: ast.range
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
