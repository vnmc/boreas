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
	token: Tokenizer.Token;

	constructor(token?: Tokenizer.Token)
	{
		super();

		this.token = token;
		if (token)
		{
			this.range.startLine = token.range.startLine;
			this.range.startColumn = token.range.startColumn;
			this.range.endLine = token.range.endLine;
			this.range.endColumn = token.range.endColumn;
		}
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
			this._tokens = [ this.token ];
		return this._tokens;
	}

	getValue(): string
	{
		return this.token.src;
	}

	getType(): Tokenizer.EToken
	{
		return this.token.token;
	}

	walk(walker: IASTWalker): any
	{
		return walker(this.token, () => undefined, walker);
	}

	toString(): string
	{
		return this.token.toString();
	}

	beautify(level: number = 0): string
	{
		return this.token.beautify();
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

	beautify(level: number = 0): string
	{
		var s = '',
			value: ASTNode,
			children: ASTNode[],
			tokens: Tokenizer.Token[],
			len: number,
			lenTokens: number,
			i: number;

		if (this._hasError)
			return this.errorTokensToString();

		children = this._children;
		if (children)
		{
			len = children.length;
			for (i = 0; i < len; i++)
			{
				value = children[i];
				s += value.beautify(level);

				tokens = value.getTokens();
				if (tokens)
				{
					lenTokens = tokens.length;
					if (lenTokens > 0 && tokens[lenTokens - 1].hasTrailingWhitespace())
						s += ' ';
				}
			}
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

		this.range.startLine = this.startToken.range.startLine;
		this.range.startColumn = this.startToken.range.startColumn;
		this.range.endLine = this.endToken.range.endLine;
		this.range.endColumn = this.endToken.range.endColumn;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [ this.startToken ].concat(super.getTokens());
			this._tokens.push(this.endToken);
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

			if (r = walker(that.startToken, () => undefined, walker) !== undefined)
				result.push(r);

			that.walkChildren(walker, result);

			if (r = walker(that.endToken, () => undefined, walker) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		if (this._hasError)
			return this.errorTokensToString();

		return this.startToken.toString() + super.toString() + this.endToken.toString();
	}

	beautify(level: number = 0): string
	{
		if (this.startToken.token === Tokenizer.EToken.LBRACE)
			return ' ' + this.startToken.beautify() + '\n' + super.beautify(level + 1) + '\n' + this.endToken.beautify();

		return this.startToken.beautify() + super.beautify(level) + this.endToken.beautify();
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
		return this.startToken;
	}

	getArgs(): ComponentValue[]
	{
		return this._children;
	}
}


export class FunctionArgumentValue extends ComponentValueList
{
	private separator: Tokenizer.Token;

	constructor(values: ComponentValue[], separator?: Tokenizer.Token)
	{
		super(values);
		this.separator = separator;

		if (this.separator)
		{
			this.range.endLine = this.separator.range.endLine;
			this.range.endColumn = this.separator.range.endColumn;
		}
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = super.getTokens().slice(0);
			if (this.separator)
				this._tokens.push(this.separator);
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

			that.walkChildren(walker, result);

			if (that.separator && (r = walker(that.separator, () => undefined, walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var s = super.toString();

		if (!this._hasError && this.separator)
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

		// TODO: adjust source ranges
		this.lbrace = lbrace !== undefined ? lbrace : new Tokenizer.Token(Tokenizer.EToken.LBRACE, new SourceRange());
		this.rbrace = rbrace !== undefined ? rbrace : new Tokenizer.Token(Tokenizer.EToken.RBRACE, new SourceRange());

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

			if (this.lbrace)
				this._tokens.push(this.lbrace);
			this._tokens = this._tokens.concat(super.getTokens());
			this._tokens.push(this.rbrace);
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

			if (that.lbrace && (r = walker(that.lbrace, () => undefined, walker)) !== undefined)
				result.push(r);

			that.walkChildren(walker, result);

			if (that.rbrace && (r = walker(that.rbrace, () => undefined, walker)) !== undefined)
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

		if (this.lbrace)
			ret += this.lbrace.toString();

		children = this._children;
		if (children)
		{
			len = children.length;
			for (i = 0; i < len; i++)
				ret += children[i].toString();
		}

		if (this.rbrace)
			ret += this.rbrace.toString();

		return ret;
	}

	beautify(level: number = 0): string
	{
		var s = '',
			hasBrace = false,
			children: ASTNode[],
			len: number,
			i: number;

		if (this._hasError)
			return this.errorTokensToString();

		if (this.lbrace)
		{
			s += this.tabs(level) + this.lbrace.beautify() + '\n';
			hasBrace = true;
		}

		children = this._children;
		if (children)
		{
			len = children.length;
			for (i = 0; i < len; i++)
			{
				if (i > 0)
					s += '\n';
				s += children[i].beautify(level + (hasBrace ? 1 : 0));
			}
		}

		if (this.rbrace)
			s += '\n' + this.tabs(level) + this.rbrace.beautify();

		return s;
	}
}


export class StyleSheet extends ASTNode
{
	rules: RuleList;

	constructor(ruleList: RuleList)
	{
		super();

		this.rules = ruleList;

		this.range.startLine = ruleList.range.startLine;
		this.range.startColumn = ruleList.range.startColumn;
		this.range.endLine = ruleList.range.endLine;
		this.range.endColumn = ruleList.range.endColumn;
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
			this._children = [ this.rules ];
		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		return this.rules.getTokens();
	}

	walk(walker: IASTWalker): any
	{
		var that = this;
		return this._walk(walker, function()
		{
			return that.rules.walk(walker);
		});
	}

	toString(): string
	{
		if (this._hasError)
			return this.errorTokensToString();

		return this.rules.toString();
	}

	beautify(level: number = 0): string
	{
		return this.rules.beautify(level);
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
		{
			this.selectors._parent = this;

			this.range.startLine = this.selectors.range.startLine;
			this.range.startColumn = this.selectors.range.startColumn;
			if (!this.declarations)
			{
				this.range.endLine = this.selectors.range.endLine;
				this.range.endColumn = this.selectors.range.endColumn;
			}
		}

		if (this.declarations)
		{
			this.declarations._parent = this;

			if (!this.selectors)
			{
				this.range.startLine = this.declarations.range.startLine;
				this.range.startColumn = this.declarations.range.startColumn;
			}
			this.range.endLine = this.declarations.range.endLine;
			this.range.endColumn = this.declarations.range.endColumn;
		}
	}

	static fromErrorTokens(tokens: Tokenizer.Token[]): Rule
	{
		var rule = new Rule();

		rule._tokens = tokens;
		rule._hasError = true;

		return rule;
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
		{
			this._children = [];

			if (this.selectors)
				this._children.push(this.selectors);
			if (this.declarations)
				this._children.push(this.declarations);
		}

		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [];

			if (this.selectors)
				this._tokens = this._tokens.concat(this.selectors.getTokens());
			if (this.declarations)
				this._tokens = this._tokens.concat(this.declarations.getTokens());
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

			if (that.selectors && (r = that.selectors.walk(walker)) !== undefined)
				result = result.concat(r);
			if (that.declarations && (r = that.declarations.walk(walker)) !== undefined)
				result = result.concat(r);

			return result;
		});
	}

	toString(): string
	{
		var s = '';

		if (this._hasError)
			return this.errorTokensToString();

		if (this.selectors)
			s += this.selectors.toString();
		if (this.declarations)
			s += this.declarations.toString();

		return s;
	}

	beautify(level: number = 0): string
	{
		var s = '';

		if (this.selectors)
			s += this.selectors.beautify(level);
		if (this.declarations)
			s += this.declarations.beautify(level);

		return s;
	}
}


export class SelectorList extends ASTNodeList<Selector>
{
	constructor(selectors?: Selector[])
	{
		super(selectors || []);
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

	beautify(level: number = 0): string
	{
		var s = this.tabs(level),
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
				s += children[i].beautify(level);
		}

		return s;
	}
}


export class Selector extends ComponentValueList
{
	separator: Tokenizer.Token;
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
			this.separator = <Tokenizer.Token> args[1];
			if (this.separator)
			{
				this.range.endLine = this.separator.range.endLine;
				this.range.endColumn = this.separator.range.endColumn;
			}
		}
	}

	static fromErrorTokens(tokens: Tokenizer.Token[]): Selector
	{
		var selector = new Selector(null);

		selector._tokens = tokens;
		selector._hasError = true;

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

			if (this.separator)
				this._tokens.push(this.separator);
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

			that.walkChildren(walker, result);

			if (that.separator && (r = walker(that.separator, () => undefined, walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var s = super.toString();

		if (!this._hasError && this.separator)
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

	constructor(declarations: Declaration[], lbrace?: Tokenizer.Token, rbrace?: Tokenizer.Token)
	{
		super(declarations);

		// TODO: adjust source range
		this.lbrace = lbrace || new Tokenizer.Token(Tokenizer.EToken.LBRACE, new SourceRange());
		this.rbrace = rbrace || new Tokenizer.Token(Tokenizer.EToken.RBRACE, new SourceRange());

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
		propText = declaration.name + ':' + declaration.value.toString();
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

			if (this.lbrace)
				this._tokens.push(this.lbrace);
			this._tokens = this._tokens.concat(super.getTokens());
			if (this.rbrace)
				this._tokens.push(this.rbrace);
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

			if (that.lbrace && (r = walker(that.lbrace, () => undefined, walker)) !== undefined)
				result.push(r);

			that.walkChildren(walker, result);

			if (that.rbrace && (r = walker(that.rbrace, () => undefined, walker)) !== undefined)
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

		if (this.lbrace)
			ret += this.lbrace.toString();

		children = this._children;
		if (children)
		{
			len = children.length;
			for (i = 0; i < len; i++)
				ret += children[i].toString();
		}

		if (this.rbrace)
			ret += this.rbrace.toString();

		return ret;
	}

	beautify(level: number = 0): string
	{
		var s = '',
			hasBrace = false,
			children: ASTNode[],
			len: number,
			i: number;

		if (this._hasError)
			return this.errorTokensToString();

		if (this.lbrace)
		{
			s += ' ' + this.lbrace.beautify() + '\n';
			hasBrace = true;
		}

		children = this._children;
		if (children)
		{
			len = children.length;
			for (i = 0; i < len; i++)
				s += children[i].beautify(level + (hasBrace ? 1 : 0)) + '\n';
		}

		if (this.rbrace)
			s += this.tabs(level) + this.rbrace.beautify();

		return s;
	}
}


export class Declaration extends ASTNode
{
	name: ComponentValueList;
	colon: Tokenizer.Token;
	value: DeclarationValue;
	semicolon: Tokenizer.Token;

	// the prologue/epilogue will contain comment strings
	private _disabled: boolean;


	// constructor(name: string, value: DeclarationValue, disabled?: boolean);
	constructor(name: ComponentValueList, colon: Tokenizer.Token, value: DeclarationValue, semicolon: Tokenizer.Token, disabled?: boolean);

	// TODO: allow construction from a name string and a DeclarationValue
	constructor(name: ComponentValueList, colon: Tokenizer.Token, value: DeclarationValue, semicolon: Tokenizer.Token, disabled?: boolean)
	{
		super();

		this.name = name;
		this.colon = colon;
		this.value = value;
		this.semicolon = semicolon;
		this._disabled = !!disabled;

		if (name)
		{
			this.range.startLine = name.range.startLine;
			this.range.startColumn = name.range.startColumn;
		}

		if (semicolon)
		{
			this.range.endLine = semicolon.range.endLine;
			this.range.endColumn = semicolon.range.endColumn;
		}
		else if (value)
		{
			this.range.endLine = value.range.endLine;
			this.range.endColumn = value.range.endColumn;
		}
	}

	static fromErrorTokens(tokens: Tokenizer.Token[]): Declaration
	{
		var decl = new Declaration(null, null, null, null);
		decl._tokens = tokens;
		decl._hasError = true;
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

		this.name = declaration.name;
		this.value = declaration.value;
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
			if (this.name)
				this._tokens = this._tokens.concat(this.name.getTokens());
			if (this.colon)
				this._tokens.push(this.colon);
			if (this.value)
				this._tokens = this._tokens.concat(this.value.getTokens());
			if (this.semicolon)
				this._tokens.push(this.semicolon);
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

			if (that.name && (r = that.name.walk(walker)) !== undefined)
				result = result.concat(r);
			if (that.colon && (r = walker(that.colon, () => undefined, walker)) !== undefined)
				result.push(r);
			if (that.value && (r = that.value.walk(walker)))
				result = result.concat(r);
			if (that.semicolon && (r = walker(that.semicolon, () => undefined, walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var s = '';

		if (this._hasError)
			return this.errorTokensToString();

		if (this.name)
			s += this.name.toString();
		if (this.colon)
			s += this.colon.toString();
		if (this.value)
			s += this.value.toString();
		if (this.semicolon)
			s += this.semicolon.toString();

		return s;
	}

	beautify(level: number = 0): string
	{
		return this.tabs(level) +
			(this._disabled ? '/* ' : '') +
			this.name.beautify() + ': ' + this.value.beautify(level) +
			(this._disabled ? '; */' : ';');
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
	atKeyword: Tokenizer.Token;
	prelude: ComponentValueList;

	private _block: ASTNode;


	constructor(atKeyword: Tokenizer.Token, prelude?: ComponentValueList, block?: ASTNode)
	{
		super();

		this.atKeyword = atKeyword;
		this.prelude = prelude;
		this._block = block;

		if (this.prelude)
			this.prelude._parent = this;
		if (this._block)
			this._block._parent = this;

		this.range.startLine = this.atKeyword.range.startLine;
		this.range.startColumn = this.atKeyword.range.startColumn;
		if (this._block)
		{
			this.range.endLine = this._block.range.endLine;
			this.range.endColumn = this._block.range.endColumn;
		}
		else if (this.prelude)
		{
			this.range.endLine = this.prelude.range.endLine;
			this.range.endColumn = this.prelude.range.endColumn;
		}
		else
		{
			this.range.endLine = this.atKeyword.range.endLine;
			this.range.endColumn = this.atKeyword.range.endColumn;
		}
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

			if (this.prelude)
				this._children.push(this.prelude);
			if (this._block)
				this._children.push(this._block);
		}

		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [ this.atKeyword ];

			if (this.prelude)
				this._tokens = this._tokens.concat(this.prelude.getTokens());
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

			if (that.atKeyword && (r = walker(that.atKeyword, () => undefined, walker)) !== undefined)
				result.push(r);
			if (that.prelude && (r = that.prelude.walk(walker)) !== undefined)
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
				this.getDeclarations().beautify(level);
		}

		if (this._block)
		{
			return '\n' + this.tabs(level) + this.atKeyword.src.toLowerCase() +
				(this.prelude ? ' ' + this.prelude.beautify(level) : '') +
				this.getRules().beautify(level);
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

	getCharset(): string
	{
		var first: ComponentValue;

		if (this._charset === null)
		{
			first = this.prelude[0];
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
			first = this.prelude[0];
			this._extensionName = first ? first.getValue() : '';
		}

		return this._extensionName;
	}

	getMedia(): ComponentValueList
	{
		if (this._media === null)
		{
			this._media = new ComponentValueList(this.prelude.getChildren().slice(1));
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
			first = this.prelude[0];
			this._url = first ? (first.token.value || first.getValue()) : '';
		}

		return this._url;
	}

	getMedia(): ComponentValueList
	{
		if (this._media === null)
		{
			this._media = new ComponentValueList(this.prelude.getChildren().slice(1));
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
			first = this.prelude[0];
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
			this._url = first.token.value || first.getValue();
		else if (prelude.getLength() > 1)
		{
			this._prefix = first.getValue();
			second = prelude[1];
			this._url = second.token.value || second.getValue();
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
