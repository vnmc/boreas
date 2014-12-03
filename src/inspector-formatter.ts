import T = require('./types');
import AST = require('./ast');


export function toJSON(node: T.INode): any
{
    return node.walk(function(ast: T.INode, descend: () => any[], walker: AST.IASTWalker): any
    {
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
            var name = (<AST.Declaration> ast).getName();
            var value = (<AST.Declaration> ast).getValue();

            return {
                name: (name && name.toString().trim()) || '',
                value: (value && value.getText()) || '',
                important: (value && value.getImportant()) || false,
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
