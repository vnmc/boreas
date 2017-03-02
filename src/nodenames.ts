import T = require('./types');
import AST = require('./ast');
import Tokenizer = require('./tokenizer');


export function getNodeName(node: T.INode): string
{
    if (node instanceof Tokenizer.Token)
        return 'Token';
    if (node instanceof AST.StyleSheet)
        return 'StyleSheet';
    if (node instanceof AST.RuleList)
        return 'RuleList';
    if (node instanceof AST.Rule)
        return 'Rule';
    if (node instanceof AST.AbstractRule)
        return 'AbstractRule';
    if (node instanceof AST.SelectorList)
        return 'SelectorList';
    if (node instanceof AST.Selector)
        return 'Selector';
    if (node instanceof AST.SelectorCombinator)
        return 'SelectorCombinator';
    if (node instanceof AST.TypeSelector)
        return 'TypeSelector';
    if (node instanceof AST.UniversalSelector)
        return 'UniversalSelector';
    if (node instanceof AST.AttributeSelector)
        return 'AttributeSelector';
    if (node instanceof AST.ClassSelector)
        return 'ClassSelector';
    if (node instanceof AST.IDSelector)
        return 'IDSelector';
    if (node instanceof AST.PseudoClass)
        return 'PseudoClass';
    if (node instanceof AST.SimpleSelector)
        return 'SimpleSelector';
    if (node instanceof AST.DeclarationList)
        return 'DeclarationList';
    if (node instanceof AST.Declaration)
        return 'Declaration';
    if (node instanceof AST.DeclarationValue)
        return 'DeclarationValue';
    if (node instanceof AST.AtCharset)
        return 'AtCharset';
    if (node instanceof AST.AtCustomMedia)
        return 'AtCustomMedia';
    if (node instanceof AST.AtDocument)
        return 'AtDocument';
    if (node instanceof AST.AtFontFace)
        return 'AtFontFace';
    if (node instanceof AST.AtHost)
        return 'AtHost';
    if (node instanceof AST.AtImport)
        return 'AtImport';
    if (node instanceof AST.AtKeyframes)
        return 'AtKeyframes';
    if (node instanceof AST.AtMedia)
        return 'AtMedia';
    if (node instanceof AST.AtNamespace)
        return 'AtNamespace';
    if (node instanceof AST.AtPage)
        return 'AtPage';
    if (node instanceof AST.AtSupports)
        return 'AtSupports';
    if (node instanceof AST.AtRule)
        return 'AtRule';
    if (node instanceof AST.FunctionComponentValue)
        return 'FunctionComponentValue';
    if (node instanceof AST.FunctionArgumentValue)
        return 'FunctionArgumentValue';
    if (node instanceof AST.BlockComponentValue)
        return 'BlockComponentValue';
    if (node instanceof AST.ImportantComponentValue)
        return 'ImportantComponentValue';
    if (node instanceof AST.ComponentValueList)
        return 'ComponentValueList';
    if (node instanceof AST.ComponentValue)
        return 'ComponentValue';
    if (node instanceof AST.ASTNodeList)
        return 'ASTNodeList';
    if (node instanceof AST.ASTNode)
        return 'ASTNode';

    return undefined;
}
