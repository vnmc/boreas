// ==================================================================
// IMPORT MODULES
// ==================================================================

import T = require('./types');
import Tokenizer = require('./tokenizer');
import Parser = require('./parser');
import Utilities = require('./utilities');


// ==================================================================
// HELPER FUNCTIONS
// ==================================================================

function setRangeFromChildren(range: T.ISourceRange, children: T.INode[])
{
	var len = children.length,
		firstChildRange: T.ISourceRange,
		lastChildRange: T.ISourceRange;

	if (len === 0)
		return;

	firstChildRange = children[0].range;
	lastChildRange = children[len - 1].range;

	range.startLine = firstChildRange.startLine;
	range.startColumn = firstChildRange.startColumn;
	range.endLine = lastChildRange.endLine;
	range.endColumn = lastChildRange.endColumn;
}


// ==================================================================
// AST CLASSES
// ==================================================================

export class SourceRange implements T.ISourceRange
{
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;

	constructor(startLine: number = 0, startColumn: number = 0, endLine: number = 0, endColumn: number = 0)
	{
		this.startLine = startLine;
		this.startColumn = startColumn;
		this.endLine = endLine;
		this.endColumn = endColumn;
	}
}

export class ASTNode implements T.INode
{
	range = new SourceRange();
	parent: T.INode = null;
	errorTokens: Tokenizer.Token[];


	get children(): T.INode[]
	{
		return [];
	}

	/**
	 * Creates a JSON structure based on this AST subtree.
	 * The JSON structure is in accordance to Google's inspector protocol.
	 */
	toJSON(): any
	{
		return null;
	}

	/**
	 * Creates a string representation of this AST subtree matching the original
	 * input as closely as possible.
	 *
	 * @returns {string}
	 */
	toString(): string
	{
		return '';
	}

	get hasErrors(): boolean
	{
		return this.errorTokens && this.errorTokens.length > 0;
	}

	errorTokensToString(): string
	{
		var s = '',
			len: number,
			i: number;

		if (!this.errorTokens)
			return '';

		len = this.errorTokens.length;
		for (var i = 0; i < len; i++)
			s += this.errorTokens[i].toString();

		return s;
	}

	/**
	 * Beautifies this AST subtree.
	 *
	 * @param level
	 * @returns {string}
	 */
	beautify(level?: number): string
	{
		return '';
	}

	/**
	 * Generates a string with "level" tab characters.
	 *
	 * @param level The number of tab characters
	 * @returns {string}
	 */
	tabs(level: number): string
	{
		var ret = '',
			i: number;

		for (i = 0; i < level; i++)
			ret += '\t';

		return ret;
	}

	/**
	 * Returns the AST's root node.
	 */
	get root(): T.INode
	{
		var node: T.INode,
			parent: T.INode;

		for (node = this; ; )
		{
			parent = node.parent;

			if (parent === null)
				return node;

			node = parent;
		}

		return null;
	}

	/**
	 * Determines whether this node is an ancestor of "node".
	 */
	isAncestorOf(node: T.INode): boolean
	{
		var parent: T.INode;

		for (parent = node.parent; parent; parent = parent.parent)
			if (this === parent)
				return true;

		return false;
	}
}


export class ASTNodeList<U extends T.INode> extends ASTNode
{
	private _children: U[];

	constructor(children: U[])
	{
		var i: number,
			len: number;

		super();

		this._children = children;
		if (this._children)
		{
			len = this._children.length;
			for (i = 0; i < len; i++)
			{
				this._children[i].parent = this;
				this[i] = this._children[i];
			}

			if (len > 0)
				setRangeFromChildren(this.range, this._children);
		}
	}

	get children(): U[]
	{
		return this._children;
	}

	get length(): number
	{
		return this._children.length;
	}

	forEach(it: (elt: U) => void)
	{
		var i: number,
			len: number;

		len = this._children.length;
		for (i = 0; i < len; i++)
			it(this._children[i]);
	}
}


export interface IComponentValue extends T.INode
{
}


export class ComponentValue extends ASTNode implements IComponentValue
{
	token: Tokenizer.Token;

	constructor(token?: Tokenizer.Token)
	{
		super();

		this.token = token;
		if (token)
			this.range = token.range;
	}

	get value(): string
	{
		return this.token.src;
	}

	get type(): Tokenizer.EToken
	{
		return this.token.token;
	}

	toString(): string
	{
		return this.hasErrors ? this.errorTokensToString() : this.token.toString();
	}

	beautify(level: number = 0): string
	{
		return this.token.beautify();
	}
}

/*
function createComponentValueList(values: ComponentValue[], parent: ASTNode)
{
	var list = new ComponentValueList(values);
	list.parent = parent;

	if (values.length > 0)
	{
		var firstValue = values[0];
		var lastValue = values[values.length - 1];

		list.range.startLine = firstValue.range.startLine;
		list.range.startColumn = firstValue.range.startColumn;
		list.range.endLine = lastValue.range.endLine;
		list.range.endColumn = lastValue.range.endColumn;
	}

	return list;
}
*/

export class ComponentValueList extends ASTNodeList<ComponentValue> implements IComponentValue
{
	constructor(values: IComponentValue[])
	{
		super(values);
	}

	toString(): string
	{
		var s = '',
			len = this.children.length,
			i: number;

		if (this.hasErrors)
			return this.errorTokensToString();

		for (i = 0; i < len; i++)
			s += this.children[i].toString();

		return s;
	}

	beautify(level: number = 0): string
	{
		var s = '',
			value: ASTNode,
			len = this.children.length,
			i: number;

		for (i = 0; i < len; i++)
		{
			if (i > 0)
				s += ' ';

			value = this.children[i];
			s += value.beautify(level);
		}

		return s;
	}
}


export class BlockComponentValue extends ComponentValueList
{
	startToken: Tokenizer.Token;
	endToken: Tokenizer.Token;

	constructor(startToken: Tokenizer.Token, endToken: Tokenizer.Token, values: IComponentValue[])
	{
		super(values);

		this.startToken = startToken;
		this.endToken = endToken;
	}

	toString(): string
	{
		if (this.hasErrors)
			return this.errorTokensToString();

		return this.startToken.toString() + super.toString() + this.endToken.toString();
	}

	beautify(level: number = 0): string
	{
		return this.startToken.beautify() + super.beautify(level) + this.endToken.beautify();
	}
}


export class FunctionComponentValue extends BlockComponentValue
{
	constructor(name: Tokenizer.Token, rparen: Tokenizer.Token, args: IComponentValue[])
	{
		super(name, rparen, args);
	}

	get name(): Tokenizer.Token
	{
		return this.startToken;
	}

	get args(): ComponentValue[]
	{
		return this.children;
	}
}


export class FunctionArgumentValue extends ComponentValueList
{
	private separator: Tokenizer.Token;

	constructor(values: ComponentValue[], separator?: Tokenizer.Token)
	{
		super(values);
		this.separator = separator;
	}

	toString(): string
	{
		var s = super.toString();

		if (!this.hasErrors && this.separator)
			s += this.separator.toString();

		return s;
	}

	beautify(level: number = 0): string
	{
		var s = super.beautify(level);

		if (this.separator)
			s += this.separator.beautify() + ' ';

		return s;
	}
}


export class ImportantComponentValue extends ComponentValue
{
	constructor(token: Tokenizer.Token)
	{
		super(token);
	}
}


export class AbstractRule extends ASTNode
{
	id: string;
}


export class RuleList extends ASTNodeList<AbstractRule>
{
	lbrace: Tokenizer.Token;
	rbrace: Tokenizer.Token;

	constructor(rules: AbstractRule[], lbrace?: Tokenizer.Token, rbrace?: Tokenizer.Token)
	{
		super(rules);

		this.lbrace = lbrace;
		this.rbrace = rbrace;
	}

	insertRule(selectors: string, pos?: number): Rule
	{
		var sels = new SelectorList(),
			style = new DeclarationList(),
			rule = new Rule(sels, style),
			prevRule: AbstractRule = null,
			len = this.children.length,
			startLine: number,
			startColumn: number;

		rule.parent = this;

		if (pos === undefined)
		{
			if (len > 0)
				prevRule = this.children[len - 1];
			this.children.push(rule);
		}
		else
		{
			if (pos < 0)
				pos = 0;
			if (pos > len)
				pos = len;

			if (pos > 0)
				prevRule = this.children[pos - 1];

			this.children.splice(pos, 0, rule);
		}

		// create the ranges, epilogues and prologues for the child nodes
		startLine = prevRule ? prevRule.range.endLine : this.range.startLine;
		startColumn = prevRule ? prevRule.range.endColumn : this.range.startColumn;

		// XX sels.prologue = '\n';
		sels.range = new SourceRange(startLine, startColumn, startLine, startColumn);

		// XX style.prologue = '{\n';
		// XX style.epilogue = '}\n';
		style.range = new SourceRange(sels.range.endLine, sels.range.endColumn, sels.range.endLine + 2, 0);

		rule.range = new SourceRange(sels.range.startLine, sels.range.startColumn, style.range.endLine, style.range.endColumn);

		Utilities.insertRangeFromNode(this.root, rule);

		// add the selectors to the list
		sels.selectorText = selectors;

		return rule;
	}


	toJSON(): any
	{
		var ret = [],
			len = this.children.length,
			i: number,
			r: any;

		for (i = 0; i < len; i++)
		{
			r = this.children[i].toJSON();
			if (r)
				ret.push(r);
		}

		return ret;
	}

	toString(): string
	{
		var ret = '',
			len = this.children.length,
			i: number;

		if (this.hasErrors)
			return this.errorTokensToString();

		if (this.lbrace)
			ret += this.lbrace.toString();

		for (i = 0; i < len; i++)
			ret += this.children[i].toString();

		if (this.rbrace)
			ret += this.rbrace.toString();

		return ret;
	}

	beautify(level: number = 0): string
	{
		var ret = '',
			len = this.children.length,
			i: number;

		if (this.lbrace)
			ret += this.lbrace.beautify();

		len = this.children.length;

		for (i = 0; i < len; i++)
			ret += this.children[i].beautify(level);

		if (this.rbrace)
			ret += this.rbrace.beautify();

		return ret;
	}
}


export class StyleSheet extends ASTNode
{
	rules: RuleList;

	constructor(ruleList: RuleList)
	{
		super();

		this.rules = ruleList;

		this.range = new SourceRange(
			ruleList.range.startLine, ruleList.range.startColumn, ruleList.range.endLine, ruleList.range.endColumn
		);
	}

	get children(): T.INode[]
	{
		return [ this.rules ];
	}

	toJSON(): any
	{
		return this.rules.toJSON();
	}

	toString(): string
	{
		if (this.hasErrors)
			return this.errorTokensToString();

		return this.rules.toString();
	}

	beautify(level: number = 0): string
	{
		return this.rules.beautify(level).trim();
	}
}


export class Rule extends AbstractRule
{
	selectors: SelectorList;
	declarations: DeclarationList;

	constructor(selectors?: SelectorList, declarations?: DeclarationList)
	{
		super();

		this.selectors = selectors;
		this.declarations = declarations;

		if (this.selectors)
			this.selectors.parent = this;
		if (this.declarations)
			this.declarations.parent = this;
	}

	get children(): T.INode[]
	{
		var children: T.INode[] = [];

		if (this.selectors)
			children.push(this.selectors);
		if (this.declarations)
			children.push(this.declarations);

		return children;
	}

	toJSON(): any
	{
		return {
			selectorList: this.selectors && this.selectors.toJSON(),
			style: this.declarations && this.declarations.toJSON()
		};
	}

	toString(): string
	{
		var s = '';

		if (this.errorTokens && this.errorTokens.length > 0)
			return this.errorTokensToString();

		if (this.selectors)
			s += this.selectors.toString();
		if (this.declarations)
			s += this.declarations.toString();

		return s;
	}

	beautify(level: number = 0): string
	{
		var s = '\n';

		if (this.selectors)
			s += this.selectors.beautify(level) + ' {\n';
		if (this.declarations)
			s += this.declarations.beautify(level);

		return s + this.tabs(level) + '}\n';
	}
}


export class SelectorList extends ASTNodeList<Selector>
{
	constructor(selectors?: Selector[])
	{
		super(selectors || []);
	}

	set selectorText(selectors: string)
	{
		var root = this.root,
			sl = this.range.startLine,
			sc = this.range.startColumn,
			astSelectors: Selector[],
			len: number,
			i: number,
			sel: Selector,
			lastSel: Selector;

		// remove the old selectors and zero the range
		this.children.splice(0, this.children.length);
		Utilities.zeroRange(root, this);

		astSelectors = new Parser.Parser(selectors).parseSelectorList().children;
		len = astSelectors.length;

		// add the selectors to this selector list
		for (i = 0; i < len; i++)
		{
			sel = astSelectors[i];

			sel.parent = this;

			sel.range.startLine += sl;
			sel.range.startColumn += sc;
			sel.range.endLine += sl;
			if (sel.range.startLine === sel.range.endLine)
				sel.range.endColumn += sc;

			this.children.push(sel);
		}

		// adjust the ranges
		if (len > 0)
		{
			lastSel = astSelectors[len - 1];
			this.range.endLine = lastSel.range.endLine;
			this.range.endColumn = lastSel.range.endColumn;
			Utilities.insertRangeFromNode(root, this);
		}
	}

	insertSelector(selector: any, pos?: number): Selector
	{
		var sel: Selector = null,
			root = this.root,
			children = this.children,
			len = children.length,
			prevSel: Selector = null,
			nextSel: Selector = null,
			selText: string,
			startIndices: number[];

		if (typeof selector === 'string')
			sel = new Selector(selector);
		else if (selector instanceof Selector)
			sel = selector;
		else
			return null;

		sel.parent = this;

		if (pos === undefined)
		{
			if (len > 0)
				prevSel = children[len - 1];
			children.push(sel);
		}
		else
		{
			if (pos < 0)
				pos = 0;
			if (pos > len)
				pos = len;

			if (pos > 0)
				prevSel = children[pos - 1];
			if (pos < len - 1)
				nextSel = children[pos];

			children.splice(pos, 0, sel);
		}

		// XX sel.prologue = prevSel ? prevSel.prologue : '';
		// XX sel.epilogue = prevSel ? prevSel.epilogue : (nextSel ? ',' : '');

		// insert a comma
		if (prevSel && !nextSel)
		{
			// XX prevSel.epilogue = ',' + prevSel.epilogue;
			Utilities.insertRangeFromNode(
				root,
				prevSel,
				new SourceRange(prevSel.range.endLine, prevSel.range.endColumn, prevSel.range.endLine, prevSel.range.endColumn + 1)
			);
		}

		// XX var selText = sel.prologue + sel.text + sel.epilogue;
		selText = sel.text;
		startIndices = Utilities.getLineStartIndices(selText);

		sel.range.startLine = prevSel ? prevSel.range.endLine : this.range.startLine;
		sel.range.startColumn = prevSel ? prevSel.range.endColumn : this.range.startColumn;
		sel.range.endLine = sel.range.startLine + startIndices.length;
		sel.range.endColumn = sel.range.startLine === sel.range.endLine ?
		sel.range.startColumn + selText.length :
			Utilities.getColumnNumberFromPosition(selText.length, startIndices);

		Utilities.insertRangeFromNode(root, sel);

		return sel;
	}

	toJSON(): any
	{
		var sels = [],
			len = this.children.length,
			i: number;

		for (i = 0; i < len; i++)
			sels.push(this.children[i].toJSON());

		return {
			selectors: sels,
			text: this.toString().trim()
		};
	}

	toString(): string
	{
		var text = '',
			len = this.children.length,
			i: number;

		if (this.hasErrors)
			return this.errorTokensToString();

		for (i = 0; i < len; i++)
			text += this.children[i].toString();

		return text;
	}

	beautify(level: number = 0): string
	{
		var ret = this.tabs(level),
			len = this.children.length,
			i: number;

		for (i = 0; i < len; i++)
		{
			if (i > 0)
				ret += ', ';
			ret += this.children[i].beautify(level);
		}

		return ret;
	}
}


export class Selector extends ComponentValueList
{
	private _text: string = null;
	private separator: Tokenizer.Token;

	constructor(values: ComponentValue[], separator?: Tokenizer.Token)
	{
		super(values);
		this.separator = separator;
	}

	get text(): string
	{
		if (this._text === null)
			this._text = this.toString();
		return this._text;
	}

	set text(newText: string)
	{
		var selector: Selector,
			children: ASTNode[];

		if (this.text === newText)
			return;

		this._text = null;

		selector = new Parser.Parser(newText).parseSelector();
		Utilities.offsetRange(selector, this.range.startLine, this.range.startColumn);

		Utilities.updateNodeRange(this.root, this, selector.range);

		children = this.children;
		children.splice.apply(children, (<any> [ 0, this.children.length ]).concat(selector.children));
	}

	toJSON(): any
	{
		return {
			value: this.text,
			range: this.range
		};
	}

	toString(): string
	{
		var s = super.toString();

		if (!this.hasErrors && this.separator)
			s += this.separator.toString();

		return s;
	}

	beautify(level: number = 0): string
	{
		var s = super.beautify(level);

		if (this.separator)
			s += this.separator.beautify() + ' ';

		return s;
	}
}


export class DeclarationList extends ASTNodeList<Declaration>
{
	lbrace: Tokenizer.Token;
	rbrace: Tokenizer.Token;

	constructor(declarations?: Declaration[], lbrace?: Tokenizer.Token, rbrace?: Tokenizer.Token)
	{
		super(declarations || []);

		this.lbrace = lbrace;
		this.rbrace = rbrace;
	}

	insertDeclaration(declaration: Declaration, pos?: number): Declaration
	{
		declaration.parent = this;

		var len = this.children.length,
			prevProp: Declaration = null,
			nextProp: Declaration = null,
			propText: string,
			startIndices: number[];

		if (pos === undefined)
		{
			if (len > 0)
				prevProp = this.children[len - 1];
			this.children.push(declaration);
		}
		else
		{
			if (pos < 0)
				pos = 0;
			if (pos > len)
				pos = len;

			if (pos > 0)
				prevProp = this.children[pos - 1];
			if (pos < len - 1)
				nextProp = this.children[pos];

			this.children.splice(pos, 0, declaration);
		}

		// XX declaration.prologue = prevProp ? prevProp.prologue : (nextProp ? nextProp.prologue : '');
		// XX declaration.epilogue = prevProp ? prevProp.epilogue : (nextProp ? nextProp.epilogue : ';');

		// XX var propText = declaration.prologue + declaration.name + ':' + declaration.value.toString() + declaration.epilogue;
		propText = declaration.name + ':' + declaration.value.toString();
		startIndices = Utilities.getLineStartIndices(propText);

		declaration.range.startLine = prevProp ? prevProp.range.endLine : this.range.startLine;
		declaration.range.startColumn = prevProp ? prevProp.range.endColumn : this.range.startColumn;
		declaration.range.endLine = declaration.range.startLine + startIndices.length;
		declaration.range.endColumn = declaration.range.startLine === declaration.range.endLine ?
			declaration.range.startColumn + propText.length :
			Utilities.getColumnNumberFromPosition(propText.length, startIndices);

		Utilities.insertRangeFromNode(this.root, declaration);

		return declaration;
	}

	insertPropertyWithName(name: string, value: string, pos?: number): Declaration
	{
		return this.insertPropertyWithText(name + ': ' + value);
	}

	insertPropertyWithText(text: string, pos?: number): Declaration
	{
		var prop = new Parser.Parser(text).parseDeclaration();
		this.insertDeclaration(prop, pos);
		return prop;
	}

	toJSON()
	{
		var props = [],
			len = this.children.length,
			i: number;

		for (i = 0; i < len; i++)
			props.push(this.children[i].toJSON());

		return {
			cssProperties: props,
			cssText: this.toString().trim(),
			range: this.range
		};
	}

	toString(): string
	{
		var ret = '',
			len = this.children.length,
			i: number;

		if (this.hasErrors)
			return this.errorTokensToString();

		if (this.lbrace)
			ret += this.lbrace.toString();

		for (i = 0; i < len; i++)
			ret += this.children[i].toString();

		if (this.rbrace)
			ret += this.rbrace.toString();

		return ret;
	}

	beautify(level: number = 0): string
	{
		var ret = '',
			len = this.children.length,
			i: number;

		if (this.lbrace)
			ret += this.lbrace.beautify();

		for (i = 0; i < len; i++)
			ret += this.children[i].beautify(level + 1) + '\n';

		if (this.rbrace)
			ret += this.rbrace.beautify();

		return ret;
	}
}


export class Declaration extends ASTNode
{
	name: Tokenizer.Token;
	colon: Tokenizer.Token;
	value: DeclarationValue;
	semicolon: Tokenizer.Token;

	// the prologue/epilogue will contain comment strings
	private _disabled: boolean;


	constructor(name: Tokenizer.Token, colon: Tokenizer.Token, value: DeclarationValue, semicolon: Tokenizer.Token, disabled?: boolean)
	{
		super();

		this.name = name;
		this.colon = colon;
		this.value = value;
		this.semicolon = semicolon;
		this._disabled = !!disabled;
	}

	/*
	get name(): string
	{
		return this._name;
	}

	set name(newName: string)
	{
		var newNameLc = newName ? newName.toLowerCase() : newName;
		if (this._name === newNameLc)
			return;

		Utilities.updateNodeRange(this.root, this, Utilities.getRangeDifference(this._name, newNameLc, this.range));
		this._name = newNameLc;
	}
	*/

	get disabled(): boolean
	{
		return this._disabled;
	}

	set disabled(isDisabled: boolean)
	{
		if (this._disabled === isDisabled)
			return;

		this._disabled = isDisabled;

		// XX var oldPrologue = this.prologue;
		// XX var oldEpilogue = this.epilogue;

/*
		if (isDisabled)
		{
			this.prologue = this.prologue + '/* ';
			this.epilogue = this.epilogue + ' * /';
		}
		else
		{
			this.prologue.replace(/\/\*\s*$/, '');
			this.epilogue.replace(/\s*\*\/$/, '');
		}
*/

		// TODO
		// XX Utilities.updateNodeRange(this.root, this, Utilities.getRangeDifference(oldPrologue, this.prologue, this.range));
		// XX Utilities.updateNodeRange(this.root, this, Utilities.getRangeDifference(oldEpilogue, this.epilogue, this.range));
	}

	get text(): string
	{
		return this.toString().trim();
	}

	set text(newText: string)
	{
		var declaration: Declaration = new Parser.Parser(newText).parseDeclaration(),
			oldStartLine = this.range.startLine,
			oldStartColumn = this.range.startColumn,
			root = this.root;

		this.name = declaration.name;
		this.value = declaration.value;
		this._disabled = declaration.disabled;

		// XX this.prologue = declaration.prologue;
		// XX this.epilogue = declaration.epilogue;

		Utilities.zeroRange(root, this);

		this.range.startLine = oldStartLine + declaration.range.startLine;
		this.range.startColumn = oldStartColumn + declaration.range.startColumn - 2;
		this.range.endLine = oldStartLine + declaration.range.endLine;
		this.range.endColumn = declaration.range.startLine === declaration.range.endLine ?
		oldStartColumn + declaration.range.endColumn - 2 :
			declaration.range.endColumn;

		Utilities.insertRangeFromNode(root, this);
	}

	toJSON(): any
	{
		return {
			name: (this.name && this.name.value) || '',
			value: (this.value && this.value.text) || '',
			important: (this.value && this.value.important) || false,
			disabled: this._disabled,
			text: this.toString().trim(),
			range: this.range
		};
	}

	toString(): string
	{
		if (this.hasErrors)
			return this.errorTokensToString();

		return this.name.toString() + this.colon.toString() + this.value.toString() + this.semicolon.toString();
	}

	beautify(level: number = 0): string
	{
		return this.tabs(level) +
			(this._disabled ? '/* ' : '') +
			this.name.src.trim() + ': ' + this.value.beautify(level) +
			(this._disabled ? '; */' : ';');
	}
}


export class DeclarationValue extends ComponentValueList
{
	private _text: string = null;

	constructor(values: ComponentValue[])
	{
		super(values);

		// this.range = new SourceRange(
		// 	values.range.startLine, values.range.startColumn, values.range.endLine, values.range.endColumn
		// );

		// XX this.prologue = values.prologue;
		// XX this.epilogue = values.epilogue;
	}

	get text(): string
	{
		if (this._text === null)
			this._text = this.toString();
		return this._text;
	}

	set text(value: string)
	{
		var declarationValue: DeclarationValue,
			children: ASTNode[];

		if (this.text === value)
			return;

		this._text = null;

		declarationValue = new Parser.Parser(value).parseDeclarationValue();
		Utilities.offsetRange(declarationValue, this.range.startLine, this.range.startColumn);

		Utilities.updateNodeRange(this.root, this, declarationValue.range);

		children = this.children;
		children.splice.apply(children, (<any> [ 0, children.length ]).concat(declarationValue.children));
	}

	get important(): boolean
	{
		var children = this.children;
		return children[children.length - 1] instanceof ImportantComponentValue;
	}

	toString(excludeImportant?: boolean): string
	{
		var s = '',
			len = this.children.length,
			i: number,
			value: ASTNode;

		if (this.hasErrors)
			return this.errorTokensToString();

		for (i = 0; i < len; i++)
		{
			value = this.children[i];
			if (!(excludeImportant && (value instanceof ImportantComponentValue)))
				s += value.toString();
		}

		return s;
	}
}


export class AtRule extends AbstractRule
{
	atKeyword: Tokenizer.Token;
	prelude: ComponentValueList;
	private _block: ASTNode;

	constructor(atKeyword: Tokenizer.Token, prelude?: ComponentValueList, block?: any)
	{
		super();

		this.atKeyword = atKeyword;
		this.prelude = prelude;
		this._block = block;

		if (this.prelude)
			this.prelude.parent = this;
		if (this._block)
			this._block.parent = this;
	}

	get children(): T.INode[]
	{
		var children = [];

		if (this.prelude)
			children.push(this.prelude);
		if (this._block)
			children.push(this._block);

		return children;
	}

	get declarations(): DeclarationList
	{
		return this._block instanceof DeclarationList ? <DeclarationList> this._block : undefined;
	}

	get rules(): RuleList
	{
		return this._block instanceof RuleList ? <RuleList> this._block : undefined;
	}

	toString(): string
	{
		var s: string;

		if (this.hasErrors)
			return this.errorTokensToString();

		s = this.atKeyword.toString();
		if (this.prelude)
			s += this.prelude.toString();
		if (this._block)
			s += this._block.toString();
		return s;
	}

	beautify(level: number = 0): string
	{
		if (this._block instanceof DeclarationList)
		{
			return this.tabs(level) + this.atKeyword.src.toLowerCase() +
				(this.prelude ? ' ' + this.prelude.beautify(level) : '') + '\n' +
				this.declarations.beautify(level);
		}

		if (this._block)
		{
			return '\n' + this.tabs(level) + this.atKeyword.src.toLowerCase() +
				(this.prelude ? ' ' + this.prelude.beautify(level) : '') + ' {' +
				this.rules.beautify(level + 1) +
				this.tabs(level) + '}';
		}

		return this.tabs(level) + this.atKeyword.src.toLowerCase() +
			(this.prelude ? ' ' + this.prelude.beautify(level) : '') + ';\n';
	}
}

export class AtCharset extends AtRule
{
	private _charset: string = null;

	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList)
	{
		super(atKeyword, prelude);
	}

	get charset(): string
	{
		var first: ComponentValue;

		if (this._charset === null)
		{
			first = this.prelude[0];
			this._charset = first ? first.value : '';
		}

		return this._charset;
	}
}


export class AtCustomMedia extends AtRule
{
	private _extensionName: string = null;
	private _media: ComponentValueList = null;

	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList)
	{
		super(atKeyword, prelude);
	}

	get extensionName(): string
	{
		var first: ComponentValue;

		if (this._extensionName === null)
		{
			first = this.prelude[0];
			this._extensionName = first ? first.value : '';
		}

		return this._extensionName;
	}

	get media(): ComponentValueList
	{
		if (this._media === null)
		{
			this._media = new ComponentValueList(this.prelude.children.slice(1));
			this._media.parent = this;
		}

		return this._media;
	}
}


export class AtDocument extends AtRule
{
	private _url: string;
	private _urlPrefix: string;
	private _domain: string;
	private _regexp: string;

	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, block: any)
	{
		super(atKeyword, prelude, block);

		var getArg = function(fnx: T.INode)
		{
			var args = (<FunctionComponentValue> fnx).args;
			return args.length > 0 ? args[0].toString() : '';
		};

		var len = prelude.length,
			i: number,
			val: IComponentValue,
			name: string;

		for (i = 0; i < len; i++)
		{
			val = prelude[i];
			if (val instanceof FunctionComponentValue)
			{
				name = (<FunctionComponentValue> val).name.value.toLowerCase();

				if (name === 'url')
					this._url = getArg(val);
				else if (name === 'url-prefix')
					this._urlPrefix = getArg(val);
				else if (name === 'domain')
					this._domain = getArg(val);
				else if (name === 'regexp')
					this._regexp = getArg(val);
			}
		}
	}

	get url(): string
	{
		return this._url;
	}

	get urlPrefix(): string
	{
		return this._urlPrefix;
	}

	get domain(): string
	{
		return this._domain;
	}

	get regexp(): string
	{
		return this._regexp;
	}


	/*
	 static parseUrlSpecifier(specifier: string)
	 {
	 var matchUrl = specifier.match(/url\s*\(\s*['"]?([^'"\s]*)\s*['"]?\s*\)/);
	 var matchUrlPrefix = specifier.match(/url-prefix\s*\(\s*['"]?([^'"\s]*)\s*['"]?\s*\)/);
	 var matchDomain = specifier.match(/domain\s*\(\s*['"]?([^'"\s]*)\s*['"]?\s*\)/);
	 var matchRegexp = specifier.match(/regexp\s*\(\s*['"]?([^'"\s]*)\s*['"]?\s*\)/);

	 return {
	 url: matchUrl && matchUrl[1],
	 urlPrefix: matchUrlPrefix && matchUrlPrefix[1],
	 domain: matchDomain && matchDomain[1],
	 regexp: matchRegexp && matchRegexp[1]
	 };
	 }
	 */
}


export class AtFontFace extends AtRule
{
	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, declarations: DeclarationList)
	{
		super(atKeyword, prelude, declarations);
	}
}


export class AtHost extends AtRule
{
	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, rules: RuleList)
	{
		super(atKeyword, prelude, rules);
	}
}


export class AtImport extends AtRule
{
	private _url: string = null;
	private _media: ComponentValueList = null;

	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList)
	{
		super(atKeyword, prelude);
	}

	get url(): string
	{
		var first: ComponentValue;

		if (this._url === null)
		{
			first = this.prelude[0];
			this._url = first ? (first.token.value || first.value) : '';
		}

		return this._url;
	}

	get media(): ComponentValueList
	{
		if (this._media === null)
		{
			this._media = new ComponentValueList(this.prelude.children.slice(1));
			this._media.parent = this;
		}

		return this._media;
	}

	/*
	 static parseUrlAndMediaList = function(text: string)
	 {
	 var match =
	 Utilities.startsWith(text, '@import') ?
	 text.match(/@import\s*(?:url\s*\()?\s*['"]?([^'") ]*)(?:['"]?\s*\))?\s*(.*?)[\s;]*$/i) :
	 text.match(/(?:url\s*\()?\s*['"]?([^'") ]*)(?:['"]?\s*\))?\s*(.*?)[\s;]*$/i);

	 return {
	 url: match && match[1],
	 media: match && match[2]
	 };
	 }
	 */
}


export class AtKeyframes extends AtRule
{
	private _animationName: string;

	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, rules: RuleList)
	{
		super(atKeyword, prelude, rules);
	}

	get animationName(): string
	{
		var first: ComponentValue;

		if (this._animationName === null)
		{
			first = this.prelude[0];
			this._animationName = first ? first.value : '';
		}

		return this._animationName;
	}
}


export class AtMedia extends AtRule
{
	constructor(atKeyword: Tokenizer.Token, media: ComponentValueList, rules: RuleList)
	{
		super(atKeyword, media, rules);
	}
}


export class AtNamespace extends AtRule
{
	private _url: string;
	private _prefix: string;

	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList)
	{
		var first: ComponentValue,
			second: ComponentValue;

		super(atKeyword, prelude);

		this._url = '';
		this._prefix = '';

		first = prelude[0];
		if (prelude.length === 1)
			this._url = first.token.value || first.value;
		else if (prelude.length > 1)
		{
			this._prefix = first.value;
			second = prelude[1];
			this._url = second.token.value || second.value;
		}
	}

	get url(): string
	{
		return this._url;
	}

	get prefix(): string
	{
		return this._prefix;
	}

	/*
	 static parseNamespace(specifier: string)
	 {
	 var match = Utilities.startsWith(specifier, '@namespace') ?
	 specifier.match(/@namespace\s+([^\s]+)\s+(?:url)?\s*\(?\s*['"]?([^'");]*)/) :
	 specifier.match(/([^\s]+)\s+(?:url)?\s*\(?\s*['"]?([^'");]*)/);

	 return {
	 prefix: match && match[1],
	 uri: match && match[2]
	 };
	 }
	 */
}


export class AtPage extends AtRule
{
	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, declarations: DeclarationList)
	{
		super(atKeyword, prelude, declarations);
	}
}


export class AtSupports extends AtRule
{
	constructor(atKeyword: Tokenizer.Token, supports: ComponentValueList, rules: RuleList)
	{
		super(atKeyword, supports, rules);
	}
}
