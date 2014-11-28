// ==================================================================
// IMPORT MODULES
// ==================================================================

import T = require('./types');
import Tokenizer = require('./tokenizer');
import Parser = require('./parser');
import Utilities = require('./utilities');


// ==================================================================
// TYPE DECLARATIONS
// ==================================================================

export interface IASTWalker
{
	(ast: T.INodeOrToken, descend: () => any[], walker?: IASTWalker): any;
}


// ==================================================================
// HELPER FUNCTIONS
// ==================================================================

function setRangeFromChildren(range: T.ISourceRange, children: T.INodeOrToken[])
{
	var len: number,
		firstChildRange: T.ISourceRange,
		lastChildRange: T.ISourceRange;

	if (!children)
		return;

	len = children.length;
	if (len === 0)
		return;

	firstChildRange = children[0].range;
	lastChildRange = children[len - 1].range;

	range.startLine = firstChildRange.startLine;
	range.startColumn = firstChildRange.startColumn;
	range.endLine = lastChildRange.endLine;
	range.endColumn = lastChildRange.endColumn;
}

/**
 * Determines whether the AST node "node" has a parent which is an instance of "ctor".
 *
 * @param node The AST node to examine
 * @param ctor The AST node class to find among the ancestors of "node"
 *
 * @returns {boolean}
 */
export function hasParent(node: T.INodeOrToken, ctor: Function): boolean
{
	var parent: T.INodeOrToken = node;

	for ( ; ; )
	{
		parent = parent.getParent();
		if (!parent)
			return false;
		if (parent instanceof ctor)
			return true;
	}

	return false;
}

/**
 * Finds the closest ancestor of the AST node "node" which is an instanceof of "ctor".
 * If no parent class is provided, the immediate parent of "node" is returned.
 * If no such parent can be found, the function returns null.
 *
 * @param node The node whose parent to find
 * @param ctor The AST node class to find among the ancestors of "node"
 *
 * @returns {*}
 */
export function getParent(node: T.INodeOrToken, ctor?: Function): T.INodeOrToken
{
	var parent: T.INodeOrToken = node;

	for ( ; ; )
	{
		parent = parent.getParent();
		if (!parent)
			return null;
		if (!ctor || (parent instanceof ctor))
			return parent;
	}

	return null;
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

	/* protected */ _parent: T.INode = null;
	/* protected */ _hasError: boolean;

	/* protected */ _children: T.INode[] = null;
	/* protected */ _tokens: Tokenizer.Token[] = null;


	getParent(): T.INode
	{
		return this._parent;
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
			this._children = [];
		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
			this._tokens = [];
		return this._tokens;
	}

	walk(walker: IASTWalker): any
	{
		return walker(this, () => undefined, walker);
	}

	_walk(walker: IASTWalker, descend: () => any[]): any
	{
		// walk the node and call descend if undefined was returned
		var ret = walker(this, descend, walker);
		return ret !== undefined ? ret : descend();
	}

	hasError(): boolean
	{
		return this._hasError;
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

	errorTokensToString(): string
	{
		var s = '',
			tokens: Tokenizer.Token[],
			len: number,
			i: number;

		if (!this._hasError)
			return '';

		tokens = this.getTokens();
		len = tokens.length;
		for (i = 0; i < len; i++)
			s += tokens[i].toString();

		return s;
	}

	/**
	 * Returns the AST's root node.
	 */
	getRoot(): T.INode
	{
		var node: T.INode,
			parent: T.INode;

		for (node = this; ; )
		{
			parent = node.getParent();

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

		for (parent = node.getParent(); parent; parent = parent.getParent())
			if (this === parent)
				return true;

		return false;
	}
}


export class ASTNodeList<U extends T.INode> extends ASTNode
{
	_children: U[];

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
				(<any> this._children[i])._parent = this;
				this[i] = this._children[i];
			}

			if (len > 0)
				setRangeFromChildren(this.range, this._children);
		}
	}

	getTokens(): Tokenizer.Token[]
	{
		var s: Tokenizer.Token[],
			len: number,
			lenTokens: number,
			i: number,
			j: number;

		if (this._tokens === null)
		{
			this._tokens = [];
			len = this._children.length;

			for (i = 0; i < len; i++)
			{
				s = (<T.INode> this._children[i]).getTokens();
				lenTokens = s.length;

				for (j = 0; j < lenTokens; j++)
					this._tokens.push(s[j]);
			}
		}

		return this._tokens;
	}

	getLength(): number
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

	walk(walker: IASTWalker): any
	{
		var that = this;
		return walker(this, function()
		{
			return that.walkChildren(walker);
		}, walker);
	}

	walkChildren(walker: IASTWalker, result: any[] = []): any[]
	{
		var r: any,
			len: number,
			i: number;

		if (this._children)
		{
			len = this._children.length;
			for (i = 0; i < len; i++)
			{
				r = this._children[i].walk(walker);
				if (r !== undefined)
					result.push(r);
			}
		}

		return result;
	}
}


export interface IComponentValue extends T.INode
{
}


export class ComponentValue extends ASTNode implements IComponentValue
{
	private _token: Tokenizer.Token;

	constructor(token?: Tokenizer.Token)
	{
		super();

		this._token = token;
		if (token)
		{
			this.range.startLine = token.range.startLine;
			this.range.startColumn = token.range.startColumn;
			this.range.endLine = token.range.endLine;
			this.range.endColumn = token.range.endColumn;

			this._token.parent = this;
		}
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
			this._tokens = [ this._token ];
		return this._tokens;
	}

	getToken(): Tokenizer.Token
	{
		return this._token;
	}

	getValue(): string
	{
		return this._token.src;
	}

	getType(): Tokenizer.EToken
	{
		return this._token.token;
	}

	walk(walker: IASTWalker): any
	{
		return walker(this._token, () => undefined, walker);
	}

	toString(): string
	{
		return this._token.toString();
	}
}


export class ComponentValueList extends ASTNodeList<ComponentValue> implements IComponentValue
{
	constructor(values: IComponentValue[])
	{
		super(values);
	}

	toString(): string
	{
		var s = '',
			children: ASTNode[],
			len: number,
			i: number;

		if (this._hasError)
			return this.errorTokensToString();

		children = this._children;
		if (children)
		{
			len = children.length;
			for (i = 0; i < len; i++)
				s += children[i].toString();
		}

		return s;
	}
}


export class BlockComponentValue extends ComponentValueList
{
	private _startToken: Tokenizer.Token;
	private _endToken: Tokenizer.Token;

	constructor(startToken: Tokenizer.Token, endToken: Tokenizer.Token, values: IComponentValue[])
	{
		super(values);

		this._startToken = startToken;
		this._endToken = endToken;

		if (this._startToken)
		{
			this._startToken.parent = this;

			this.range.startLine = this._startToken.range.startLine;
			this.range.startColumn = this._startToken.range.startColumn;
		}

		if (this._endToken)
		{
			this._endToken.parent = this;

			this.range.endLine = this._endToken.range.endLine;
			this.range.endColumn = this._endToken.range.endColumn;
		}
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [ this._startToken ].concat(super.getTokens());
			this._tokens.push(this._endToken);
		}

		return this._tokens;
	}

	getStartToken(): Tokenizer.Token
	{
		return this._startToken;
	}

	getEndToken(): Tokenizer.Token
	{
		return this._endToken;
	}

	walk(walker: IASTWalker): any
	{
		var that = this;

		return this._walk(walker, function()
		{
			var result: any[] = [],
				r: any;

			if ((r = walker(that._startToken, () => undefined, walker)) !== undefined)
				result.push(r);

			that.walkChildren(walker, result);

			if ((r = walker(that._endToken, () => undefined, walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		if (this._hasError)
			return this.errorTokensToString();

		return this._startToken.toString() + super.toString() + this._endToken.toString();
	}
}


export class FunctionComponentValue extends BlockComponentValue
{
	constructor(name: Tokenizer.Token, rparen: Tokenizer.Token, args: IComponentValue[])
	{
		super(name, rparen, args);
	}

	getName(): Tokenizer.Token
	{
		return this.getStartToken();
	}

	getArgs(): ComponentValue[]
	{
		return this._children;
	}
}


export class FunctionArgumentValue extends ComponentValueList
{
	private _separator: Tokenizer.Token;

	constructor(values: ComponentValue[], separator?: Tokenizer.Token)
	{
		super(values);
		this._separator = separator;

		if (this._separator)
		{
			this._separator.parent = this;

			if (!values || values.length === 0)
			{
				this.range.startLine = this._separator.range.startLine;
				this.range.startColumn = this._separator.range.startColumn;
			}

			this.range.endLine = this._separator.range.endLine;
			this.range.endColumn = this._separator.range.endColumn;
		}
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = super.getTokens().slice(0);
			if (this._separator)
				this._tokens.push(this._separator);
		}

		return this._tokens;
	}

	getSeparator(): Tokenizer.Token
	{
		return this._separator;
	}

	walk(walker: IASTWalker): any
	{
		var that = this;

		return this._walk(walker, function()
		{
			var result: any[] = [],
				r: any;

			that.walkChildren(walker, result);

			if (that._separator && (r = walker(that._separator, () => undefined, walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var s = super.toString();

		if (!this._hasError && this._separator)
			s += this._separator.toString();

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
	private _lbrace: Tokenizer.Token;
	private _rbrace: Tokenizer.Token;

	constructor(rules: AbstractRule[], lbrace?: Tokenizer.Token, rbrace?: Tokenizer.Token)
	{
		super(rules);

		// TODO: adjust source ranges
		this._lbrace = lbrace !== undefined ? lbrace : new Tokenizer.Token(Tokenizer.EToken.LBRACE, new SourceRange());
		this._rbrace = rbrace !== undefined ? rbrace : new Tokenizer.Token(Tokenizer.EToken.RBRACE, new SourceRange());

		if (this._lbrace)
			this._lbrace.parent = this;
		if (this._rbrace)
			this._rbrace.parent = this;

		if (lbrace)
		{
			this.range.startLine = lbrace.range.startLine;
			this.range.startColumn = lbrace.range.startColumn;
		}

		if (rbrace)
		{
			this.range.endLine = rbrace.range.endLine;
			this.range.endColumn = rbrace.range.endColumn;
		}
	}

	insertRule(selectors: string, pos?: number): Rule
	{
		var sels = new SelectorList(),
			style = new DeclarationList(null),
			rule = new Rule(sels, style),
			prevRule: AbstractRule = null,
			children = this._children,
			len = children.length,
			startLine: number,
			startColumn: number;

		rule._parent = this;

		if (pos === undefined)
		{
			if (len > 0)
				prevRule = children[len - 1];
			children.push(rule);
		}
		else
		{
			if (pos < 0)
				pos = 0;
			if (pos > len)
				pos = len;

			if (pos > 0)
				prevRule = children[pos - 1];

			children.splice(pos, 0, rule);
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

		Utilities.insertRangeFromNode(this.getRoot(), rule);

		// add the selectors to the list
		sels.setSelectorText(selectors);

		return rule;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [];

			if (this._lbrace)
				this._tokens.push(this._lbrace);
			this._tokens = this._tokens.concat(super.getTokens());
			this._tokens.push(this._rbrace);
		}

		return this._tokens;
	}

	getLBrace(): Tokenizer.Token
	{
		return this._lbrace;
	}

	getRBrace(): Tokenizer.Token
	{
		return this._rbrace;
	}

	walk(walker: IASTWalker): any
	{
		var that = this;

		return this._walk(walker, function()
		{
			var result: any[] = [],
				r: any;

			if (that._lbrace && (r = walker(that._lbrace, () => undefined, walker)) !== undefined)
				result.push(r);

			that.walkChildren(walker, result);

			if (that._rbrace && (r = walker(that._rbrace, () => undefined, walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var ret = '',
			children: ASTNode[],
			len: number,
			i: number;

		if (this._hasError)
			return this.errorTokensToString();

		if (this._lbrace)
			ret += this._lbrace.toString();

		children = this._children;
		if (children)
		{
			len = children.length;
			for (i = 0; i < len; i++)
				ret += children[i].toString();
		}

		if (this._rbrace)
			ret += this._rbrace.toString();

		return ret;
	}
}


export class StyleSheet extends ASTNode
{
	private _rules: RuleList;

	constructor(ruleList: RuleList)
	{
		super();

		this._rules = ruleList;
		this._rules._parent = this;

		this.range.startLine = ruleList.range.startLine;
		this.range.startColumn = ruleList.range.startColumn;
		this.range.endLine = ruleList.range.endLine;
		this.range.endColumn = ruleList.range.endColumn;
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
			this._children = [ this._rules ];
		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		return this._rules.getTokens();
	}

	getRules(): RuleList
	{
		return this._rules;
	}

	walk(walker: IASTWalker): any
	{
		var that = this;
		return this._walk(walker, function()
		{
			return that._rules.walk(walker);
		});
	}

	toString(): string
	{
		if (this._hasError)
			return this.errorTokensToString();

		return this._rules.toString();
	}
}


export class Rule extends AbstractRule
{
	private _selectors: SelectorList;
	private _declarations: DeclarationList;

	constructor(selectors?: SelectorList, declarations?: DeclarationList)
	{
		var t: T.INodeOrToken;

		super();

		this._selectors = selectors;
		this._declarations = declarations;

		// set parents
		if (this._selectors)
			this._selectors._parent = this;
		if (this._declarations)
			this._declarations._parent = this;

		// set range
		t = selectors || declarations;
		if (t)
		{
			this.range.startLine = t.range.startLine;
			this.range.startColumn = t.range.startColumn;
		}

		t = declarations || selectors;
		if (t)
		{
			this.range.endLine = t.range.endLine;
			this.range.endColumn = t.range.endColumn;
		}
	}

	static fromErrorTokens(tokens: Tokenizer.Token[]): Rule
	{
		var rule = new Rule();

		rule._tokens = tokens;
		rule._hasError = true;
		setRangeFromChildren(rule.range, tokens);

		return rule;
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
		{
			this._children = [];

			if (this._selectors)
				this._children.push(this._selectors);
			if (this._declarations)
				this._children.push(this._declarations);
		}

		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [];

			if (this._selectors)
				this._tokens = this._tokens.concat(this._selectors.getTokens());
			if (this._declarations)
				this._tokens = this._tokens.concat(this._declarations.getTokens());
		}

		return this._tokens;
	}

	getSelectors(): SelectorList
	{
		return this._selectors;
	}

	getDeclarations(): DeclarationList
	{
		return this._declarations;
	}

	walk(walker: IASTWalker): any
	{
		var that = this;

		return this._walk(walker, function()
		{
			var result: any[] = [],
				r: any;

			if (that._selectors && (r = that._selectors.walk(walker)) !== undefined)
				result = result.concat(r);
			if (that._declarations && (r = that._declarations.walk(walker)) !== undefined)
				result = result.concat(r);

			return result;
		});
	}

	toString(): string
	{
		var s = '';

		if (this._hasError)
			return this.errorTokensToString();

		if (this._selectors)
			s += this._selectors.toString();
		if (this._declarations)
			s += this._declarations.toString();

		return s;
	}
}


export class SelectorList extends ASTNodeList<Selector>
{
	constructor(selectors?: Selector[])
	{
		super(selectors || []);
	}

	getSelector(index: number): Selector
	{
		return this._children[index];
	}

	setSelectorText(selectors: string): void
	{
		var root = this.getRoot(),
			sl = this.range.startLine,
			sc = this.range.startColumn,
			children = this._children,
			astSelectors: Selector[],
			len: number,
			i: number,
			sel: Selector,
			lastSel: Selector;

		// remove the old selectors and zero the range
		children.splice(0, children.length);
		Utilities.zeroRange(root, this);

		astSelectors = new Parser.Parser(selectors).parseSelectorList()._children;
		len = astSelectors.length;

		// add the selectors to this selector list
		for (i = 0; i < len; i++)
		{
			sel = astSelectors[i];

			sel._parent = this;

			sel.range.startLine += sl;
			sel.range.startColumn += sc;
			sel.range.endLine += sl;
			if (sel.range.startLine === sel.range.endLine)
				sel.range.endColumn += sc;

			children.push(sel);
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
			root = this.getRoot(),
			children = this._children,
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

		sel._parent = this;

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
		selText = sel.getText();
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

	toString(): string
	{
		var text = '',
			children: ASTNode[],
			len: number,
			i: number;

		if (this._hasError)
			return this.errorTokensToString();

		children = this._children;
		if (children)
		{
			len = children.length;
			for (i = 0; i < len; i++)
				text += children[i].toString();
		}

		return text;
	}
}


export class Selector extends ComponentValueList
{
	private _separator: Tokenizer.Token;
	private _text: string = null;


	constructor(text: string);
	constructor(values: ComponentValue[], separator?: Tokenizer.Token);

	constructor(...args: any[])
	{
		super(Array.isArray(args[0]) ? <ComponentValue[]> args[0] : null);

		if (typeof args[0] === 'string')
		{
			// constructor(text: string)

			// TODO: implement
			throw 'not-implemented';
		}
		else if (Array.isArray(args[0]))
		{
			// constructor(values: ComponentValue[], separator?: Tokenizer.Token)

			this._separator = <Tokenizer.Token> args[1];
			if (this._separator)
			{
				this._separator.parent = this;

				if (!this._children || this._children.length === 0)
				{
					this.range.startLine = this._separator.range.startLine;
					this.range.startColumn = this._separator.range.startColumn;
				}

				this.range.endLine = this._separator.range.endLine;
				this.range.endColumn = this._separator.range.endColumn;
			}
		}
	}

	static fromErrorTokens(tokens: Tokenizer.Token[]): Selector
	{
		var selector = new Selector(null);

		selector._tokens = tokens;
		selector._hasError = true;
		setRangeFromChildren(selector.range, tokens);

		return selector;
	}

	getText(): string
	{
		if (this._text === null)
			this._text = this.toString();
		return this._text;
	}

	setText(newText: string): void
	{
		var selector: Selector,
			children: ASTNode[];

		if (this._text === newText)
			return;

		this._text = null;

		selector = new Parser.Parser(newText).parseSelector();
		Utilities.offsetRange(selector, this.range.startLine, this.range.startColumn);

		Utilities.updateNodeRange(this.getRoot(), this, selector.range);

		children = this._children;
		children.splice.apply(children, (<any> [ 0, children.length ]).concat(selector._children));
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = super.getTokens().slice(0);

			if (this._separator)
				this._tokens.push(this._separator);
		}

		return this._tokens;
	}

	getSeparator(): Tokenizer.Token
	{
		return this._separator;
	}

	walk(walker: IASTWalker): any
	{
		var that = this;

		return this._walk(walker, function()
		{
			var result: any[] = [],
				r: any;

			that.walkChildren(walker, result);

			if (that._separator && (r = walker(that._separator, () => undefined, walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var s = super.toString();

		if (!this._hasError && this._separator)
			s += this._separator.toString();

		return s;
	}
}


export class DeclarationList extends ASTNodeList<Declaration>
{
	private _lbrace: Tokenizer.Token;
	private _rbrace: Tokenizer.Token;

	constructor(declarations: Declaration[], lbrace?: Tokenizer.Token, rbrace?: Tokenizer.Token)
	{
		super(declarations);

		// TODO: adjust source range
		this._lbrace = lbrace || new Tokenizer.Token(Tokenizer.EToken.LBRACE, new SourceRange());
		this._rbrace = rbrace || new Tokenizer.Token(Tokenizer.EToken.RBRACE, new SourceRange());

		if (this._lbrace)
			this._lbrace.parent = this;
		if (this._rbrace)
			this._rbrace.parent = this;

		if (lbrace)
		{
			this.range.startLine = lbrace.range.startLine;
			this.range.startColumn = lbrace.range.startColumn;
		}

		if (rbrace)
		{
			this.range.endLine = rbrace.range.endLine;
			this.range.endColumn = rbrace.range.endColumn;
		}
	}

	insertDeclaration(declaration: Declaration, pos?: number): Declaration
	{
		declaration._parent = this;

		var children = this._children,
			len = children.length,
			prevProp: Declaration = null,
			nextProp: Declaration = null,
			propText: string,
			startIndices: number[];

		if (pos === undefined)
		{
			if (len > 0)
				prevProp = children[len - 1];
			children.push(declaration);
		}
		else
		{
			if (pos < 0)
				pos = 0;
			if (pos > len)
				pos = len;

			if (pos > 0)
				prevProp = children[pos - 1];
			if (pos < len - 1)
				nextProp = children[pos];

			children.splice(pos, 0, declaration);
		}

		// XX declaration.prologue = prevProp ? prevProp.prologue : (nextProp ? nextProp.prologue : '');
		// XX declaration.epilogue = prevProp ? prevProp.epilogue : (nextProp ? nextProp.epilogue : ';');

		// XX var propText = declaration.prologue + declaration.name + ':' + declaration.value.toString() + declaration.epilogue;
		propText = declaration.getName() + ':' + declaration.getValue().toString();
		startIndices = Utilities.getLineStartIndices(propText);

		declaration.range.startLine = prevProp ? prevProp.range.endLine : this.range.startLine;
		declaration.range.startColumn = prevProp ? prevProp.range.endColumn : this.range.startColumn;
		declaration.range.endLine = declaration.range.startLine + startIndices.length;
		declaration.range.endColumn = declaration.range.startLine === declaration.range.endLine ?
			declaration.range.startColumn + propText.length :
			Utilities.getColumnNumberFromPosition(propText.length, startIndices);

		Utilities.insertRangeFromNode(this.getRoot(), declaration);

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

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [];

			if (this._lbrace)
				this._tokens.push(this._lbrace);
			this._tokens = this._tokens.concat(super.getTokens());
			if (this._rbrace)
				this._tokens.push(this._rbrace);
		}

		return this._tokens;
	}

	getLBrace(): Tokenizer.Token
	{
		return this._lbrace;
	}

	getRBrace(): Tokenizer.Token
	{
		return this._rbrace;
	}

	walk(walker: IASTWalker): any
	{
		var that = this;

		return this._walk(walker, function()
		{
			var result: any[] = [],
				r: any;

			if (that._lbrace && (r = walker(that._lbrace, () => undefined, walker)) !== undefined)
				result.push(r);

			that.walkChildren(walker, result);

			if (that._rbrace && (r = walker(that._rbrace, () => undefined, walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var ret = '',
			children: ASTNode[],
			len: number,
			i: number;

		if (this._hasError)
			return this.errorTokensToString();

		if (this._lbrace)
			ret += this._lbrace.toString();

		children = this._children;
		if (children)
		{
			len = children.length;
			for (i = 0; i < len; i++)
				ret += children[i].toString();
		}

		if (this._rbrace)
			ret += this._rbrace.toString();

		return ret;
	}
}


export class Declaration extends ASTNode
{
	private _name: ComponentValueList;
	private _colon: Tokenizer.Token;
	private _value: DeclarationValue;
	private _semicolon: Tokenizer.Token;

	// the prologue/epilogue will contain comment strings
	private _disabled: boolean;


	// constructor(name: string, value: DeclarationValue, disabled?: boolean);
	// constructor(name: ComponentValueList, colon: Tokenizer.Token, value: DeclarationValue, semicolon: Tokenizer.Token, disabled?: boolean);

	// TODO: allow construction from a name string and a DeclarationValue
	constructor(name: ComponentValueList, colon: Tokenizer.Token, value: DeclarationValue, semicolon: Tokenizer.Token, disabled?: boolean)
	{
		var t: T.INodeOrToken;

		super();

		this._name = name;
		this._colon = colon;
		this._value = value;
		this._semicolon = semicolon;
		this._disabled = !!disabled;

		// set parents
		if (name)
			this._name._parent = this;
		if (colon)
			this._colon.parent = this;
		if (value)
			this._value._parent = this;
		if (semicolon)
			this._semicolon.parent = this;

		// set range
		t = name || colon || value || semicolon;
		if (t)
		{
			this.range.startLine = t.range.startLine;
			this.range.startColumn = t.range.startColumn;
		}

		t = semicolon || value || colon || name;
		if (t)
		{
			this.range.endLine = t.range.endLine;
			this.range.endColumn = t.range.endColumn;
		}
	}

	static fromErrorTokens(tokens: Tokenizer.Token[]): Declaration
	{
		var decl = new Declaration(null, null, null, null);

		decl._tokens = tokens;
		decl._hasError = true;
		setRangeFromChildren(decl.range, tokens);

		return decl;
	}

	/*
	getName(): string
	{
		return this._name;
	}

	setName(newName: string): void
	{
		var newNameLc = newName ? newName.toLowerCase() : newName;
		if (this._name === newNameLc)
			return;

		Utilities.updateNodeRange(this.root, this, Utilities.getRangeDifference(this._name, newNameLc, this.range));
		this._name = newNameLc;
	}
	*/

	getName(): ComponentValueList
	{
		return this._name;
	}

	getColon(): Tokenizer.Token
	{
		return this._colon;
	}

	getValue(): DeclarationValue
	{
		return this._value;
	}

	getSemicolon(): Tokenizer.Token
	{
		return this._semicolon;
	}

	getDisabled(): boolean
	{
		return this._disabled;
	}

	setDisabled(isDisabled: boolean): void
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

	getText(): string
	{
		return this.toString().trim();
	}

	setText(newText: string)
	{
		var declaration: Declaration = new Parser.Parser(newText).parseDeclaration(),
			oldStartLine = this.range.startLine,
			oldStartColumn = this.range.startColumn,
			root = this.getRoot();

		this._name = declaration._name;
		this._value = declaration._value;
		this._disabled = declaration.getDisabled();

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

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [];
			if (this._name)
				this._tokens = this._tokens.concat(this._name.getTokens());
			if (this._colon)
				this._tokens.push(this._colon);
			if (this._value)
				this._tokens = this._tokens.concat(this._value.getTokens());
			if (this._semicolon)
				this._tokens.push(this._semicolon);
		}

		return this._tokens;
	}

	walk(walker: IASTWalker): any
	{
		var that = this;
		return this._walk(walker, function()
		{
			var result: any[] = [],
				r: any;

			if (that._name && (r = that._name.walk(walker)) !== undefined)
				result = result.concat(r);
			if (that._colon && (r = walker(that._colon, () => undefined, walker)) !== undefined)
				result.push(r);
			if (that._value && (r = that._value.walk(walker)) !== undefined)
				result = result.concat(r);
			if (that._semicolon && (r = walker(that._semicolon, () => undefined, walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var s = '';

		if (this._hasError)
			return this.errorTokensToString();

		if (this._name)
			s += this._name.toString();
		if (this._colon)
			s += this._colon.toString();
		if (this._value)
			s += this._value.toString();
		if (this._semicolon)
			s += this._semicolon.toString();

		return s;
	}
}


export class DeclarationValue extends ComponentValueList
{
	private _text: string = null;

	constructor(values: ComponentValue[])
	{
		super(values);
	}

	getText(): string
	{
		if (this._text === null)
			this._text = this.toString();
		return this._text;
	}

	setText(value: string): void
	{
		var declarationValue: DeclarationValue,
			children: ASTNode[];

		if (this._text === value)
			return;

		this._text = null;

		declarationValue = new Parser.Parser(value).parseDeclarationValue();
		Utilities.offsetRange(declarationValue, this.range.startLine, this.range.startColumn);

		Utilities.updateNodeRange(this.getRoot(), this, declarationValue.range);

		children = this._children;
		children.splice.apply(children, (<any> [ 0, children.length ]).concat(declarationValue._children));
	}

	getImportant(): boolean
	{
		var children = this._children;
		return children[children.length - 1] instanceof ImportantComponentValue;
	}

	toString(excludeImportant?: boolean): string
	{
		var s = '',
			children: ASTNode[],
			len: number,
			i: number,
			value: ASTNode;

		if (this._hasError)
			return this.errorTokensToString();

		children = this._children;
		if (children)
		{
			len = children.length;
			for (i = 0; i < len; i++)
			{
				value = children[i];
				if (!(excludeImportant && (value instanceof ImportantComponentValue)))
					s += value.toString();
			}
		}

		return s;
	}
}


export class AtRule extends AbstractRule
{
	private _atKeyword: Tokenizer.Token;
	private _prelude: ComponentValueList;

	private _block: ASTNode;


	constructor(atKeyword: Tokenizer.Token, prelude?: ComponentValueList, block?: ASTNode)
	{
		var t: T.INodeOrToken;

		super();

		this._atKeyword = atKeyword;
		this._prelude = prelude;
		this._block = block;

		// set parents
		if (this._atKeyword)
			this._atKeyword.parent = this;
		if (this._prelude)
			this._prelude._parent = this;
		if (this._block)
			this._block._parent = this;

		// set range
		t = atKeyword || prelude || block;
		if (t)
		{
			this.range.startLine = t.range.startLine;
			this.range.startColumn = t.range.startColumn;
		}

		t = block || prelude || atKeyword;
		if (t)
		{
			this.range.endLine = t.range.endLine;
			this.range.endColumn = t.range.endColumn;
		}
	}

	getAtKeyword(): Tokenizer.Token
	{
		return this._atKeyword;
	}

	getPrelude(): ComponentValueList
	{
		return this._prelude;
	}

	getDeclarations(): DeclarationList
	{
		return this._block instanceof DeclarationList ? <DeclarationList> this._block : undefined;
	}

	getRules(): RuleList
	{
		return this._block instanceof RuleList ? <RuleList> this._block : undefined;
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
		{
			this._children = [];

			if (this._prelude)
				this._children.push(this._prelude);
			if (this._block)
				this._children.push(this._block);
		}

		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [ this._atKeyword ];

			if (this._prelude)
				this._tokens = this._tokens.concat(this._prelude.getTokens());
			if (this._block)
				this._tokens = this._tokens.concat(this._block.getTokens());
		}

		return this._tokens;
	}

	walk(walker: IASTWalker): any
	{
		var that = this;

		return this._walk(walker, function()
		{
			var result: any[] = [],
				r: any;

			if (that._atKeyword && (r = walker(that._atKeyword, () => undefined, walker)) !== undefined)
				result.push(r);
			if (that._prelude && (r = that._prelude.walk(walker)) !== undefined)
				result = result.concat(r);
			if (that._block && (r = that._block.walk(walker)) !== undefined)
				result = result.concat(r);

			return result;
		});
	}

	toString(): string
	{
		var s: string;

		if (this._hasError)
			return this.errorTokensToString();

		s = this._atKeyword.toString();
		if (this._prelude)
			s += this._prelude.toString();
		if (this._block)
			s += this._block.toString();
		return s;
	}
}

export class AtCharset extends AtRule
{
	private _charset: string = null;

	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList)
	{
		super(atKeyword, prelude);
	}

	getCharset(): string
	{
		var first: ComponentValue;

		if (this._charset === null)
		{
			first = this.getPrelude()[0];
			this._charset = first ? first.getValue() : '';
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

	getExtensionName(): string
	{
		var first: ComponentValue;

		if (this._extensionName === null)
		{
			first = this.getPrelude()[0];
			this._extensionName = first ? first.getValue() : '';
		}

		return this._extensionName;
	}

	getMedia(): ComponentValueList
	{
		if (this._media === null)
		{
			this._media = new ComponentValueList(this.getPrelude().getChildren().slice(1));
			this._media._parent = this;
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
			var args = (<FunctionComponentValue> fnx).getArgs();
			return args.length > 0 ? args[0].toString() : '';
		};

		var len = prelude.getLength(),
			i: number,
			val: IComponentValue,
			name: string;

		for (i = 0; i < len; i++)
		{
			val = prelude[i];
			if (val instanceof FunctionComponentValue)
			{
				name = (<FunctionComponentValue> val).getName().value.toLowerCase();

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

	getUrl(): string
	{
		return this._url;
	}

	getUrlPrefix(): string
	{
		return this._urlPrefix;
	}

	getDomain(): string
	{
		return this._domain;
	}

	getRegexp(): string
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

	getUrl(): string
	{
		var first: ComponentValue;

		if (this._url === null)
		{
			first = this.getPrelude()[0];
			this._url = first ? (first.getToken().value || first.getValue()) : '';
		}

		return this._url;
	}

	getMedia(): ComponentValueList
	{
		if (this._media === null)
		{
			this._media = new ComponentValueList(this.getPrelude().getChildren().slice(1));
			this._media._parent = this;
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

	getAnimationName(): string
	{
		var first: ComponentValue;

		if (this._animationName === null)
		{
			first = this.getPrelude()[0];
			this._animationName = first ? first.getValue() : '';
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
		if (prelude.getLength() === 1)
			this._url = first.getToken().value || first.getValue();
		else if (prelude.getLength() > 1)
		{
			this._prefix = first.getValue();
			second = prelude[1];
			this._url = second.getToken().value || second.getValue();
		}
	}

	getUrl(): string
	{
		return this._url;
	}

	getPrefix(): string
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
