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

export interface IComponentValue extends T.INode
{
	getValue: () => string;
}

export interface IRulesContainer extends T.INode
{
	getRules: () => RuleList;
}

export interface IASTWalker
{
	(ast: T.INode, descend: () => any[], walker?: IASTWalker): any;
}

interface IPosition
{
	line: number;
	column: number;
}


// ==================================================================
// HELPER FUNCTIONS
// ==================================================================

function setRangeFromChildren(range: T.ISourceRange, children: T.INode[])
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
export function hasParent(node: T.INode, ctor: Function): boolean
{
	var parent: T.INode = node;

	for ( ; parent; )
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
export function getParent(node: T.INode, ctor?: Function): T.INode
{
	var parent: T.INode = node;

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


/**
 * Converts an array of tokens to a string, normalizing whitespaces and removing comments.
 *
 * @param tokens The tokens to convert
 * @returns {string}
 */
export function toStringNormalize(tokens: Tokenizer.Token[]): string
{
	var s = '',
		len: number,
		i: number,
		token: Tokenizer.Token;

	if (!tokens)
		return '';

	len = tokens.length;
	for (i = 0; i < len; i++)
	{
		token = tokens[i];

		if (i > 0 && token.hasLeadingWhitespace())
			s += ' ';
		s += token.src;
		if (i < len - 1 && token.hasTrailingWhitespace())
			s += ' ';
	}

	return Utilities.trim(s);
}


function trailingWhitespace(token: Tokenizer.Token, range?: T.ISourceRange): Tokenizer.Token
{
	token.trailingTrivia = [
		new Tokenizer.Token(Tokenizer.EToken.WHITESPACE, range || new SourceRange(), ' ')
	];

	return token;
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
	_nodes: U[];


	constructor(nodes: U[])
	{
		var i: number,
			len: number,
			node: U;

		super();

		this._nodes = nodes;
		if (this._nodes)
		{
			len = this._nodes.length;
			for (i = 0; i < len; i++)
			{
				node = this._nodes[i];

				// set the parent
				if (node instanceof ASTNode)
					(<any> node)._parent = this;
				else if (node instanceof Tokenizer.Token)
					(<any> node).parent = this;

				this[i] = node;
			}

			if (len > 0)
				setRangeFromChildren(this.range, this._nodes);
		}
	}

	getChildren(): T.INode[]
	{
		return this._nodes;
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
			len = (this._nodes && this._nodes.length) || 0;

			for (i = 0; i < len; i++)
			{
				s = (<T.INode> this._nodes[i]).getTokens();
				lenTokens = s.length;

				for (j = 0; j < lenTokens; j++)
					this._tokens.push(s[j]);
			}
		}

		return this._tokens;
	}

	/**
	 * Returns the number of nodes in this list.
	 *
	 * @returns {number}
	 */
	getLength(): number
	{
		return this._nodes ? this._nodes.length : 0;
	}

	getStartPosition(): IPosition
	{
		return { line: this.range.startLine, column: this.range.startColumn };
	}

	replaceNodes(nodes: U[]): void
	{
		var offsetLine: number,
			offsetColumn: number,
			range: T.ISourceRange,
			pos: IPosition,
			root = this.getRoot(),
			len = nodes.length,
			i: number,
			node: U,
			virtualNode: ASTNode,
			firstRange: T.ISourceRange,
			lastRange: T.ISourceRange;

		if (this._nodes && this._nodes.length > 0)
		{
			range = this._nodes[0].range;
			offsetLine = range.startLine;
			offsetColumn = range.startColumn;
		}
		else
		{
			pos = this.getStartPosition();
			offsetLine = pos.line;
			offsetColumn = pos.column;
		}

		if (!this._nodes)
			this._nodes = [];

		// delete all the current nodes
		this.deleteAllNodes();

		// adjust the ranges of the nodes
		for (i = 0; i < len; i++)
		{
			node = nodes[i];

			Utilities.offsetRange(node, offsetLine - node.range.startLine, offsetColumn - node.range.startColumn);

			offsetLine = node.range.endLine;
			offsetColumn = node.range.endColumn;
		}

		// adjust the ranges in the AST
		firstRange = nodes[0].range;
		lastRange = nodes[len - 1].range;
		virtualNode = new ASTNode();
		virtualNode._parent = this;
		virtualNode.range = new SourceRange(firstRange.startLine, firstRange.startColumn, lastRange.endLine, lastRange.endColumn);
		Utilities.insertRangeFromNode(root, virtualNode);

		// insert the nodes into the collection
		for (i = 0; i < len; i++)
		{
			node = nodes[i];

			// add the node to the collection and add the node references
			this._nodes.push(node);
			this[i] = node;

			// set the parent
			if (node instanceof ASTNode)
				(<any> node)._parent = this;
			else if (node instanceof Tokenizer.Token)
				(<any> node).parent = this;
		}
	}

	/**
	 * Inserts a new node at position "pos" or at the end if no position is provided.
	 *
	 * @param node The node to insert
	 * @param pos The position at which to insert the node
	 */
	insertNode(node: U, pos?: number): void
	{
		var nodes = this._nodes,
			len = (nodes && nodes.length) || 0,
			i: number,
			range: T.ISourceRange,
			position: IPosition,
			offsetLine: number,
			offsetColumn: number;

		if (!this._nodes)
			nodes = this._nodes = [];

		// set the parent of the node to insert
		if (node instanceof ASTNode)
			(<any> node)._parent = this;
		else if (node instanceof Tokenizer.Token)
			(<any> node).parent = this;

		// insert the node into the collection
		if (pos === undefined)
			pos = len;
		else
		{
			if (pos < 0)
				pos = 0;
			if (pos > len)
				pos = len;
		}

		// find the line/column offset
		if (len === 0)
		{
			position = this.getStartPosition();
			offsetLine = position.line;
			offsetColumn = position.column;
		}
		else if (pos === 0)
		{
			range = nodes[0].range;
			offsetLine = range.startLine;
			offsetColumn = range.startColumn;
		}
		else
		{
			range = nodes[pos - 1].range;
			offsetLine = range.endLine;
			offsetColumn = range.endColumn;
		}

		// insert the new node and update the node references
		nodes.splice(pos, 0, node);

		for (i = pos; i < len + 1; i++)
			this[i] = nodes[i];

		// update the ranges
		Utilities.offsetRange(node, offsetLine - node.range.startLine, offsetColumn - node.range.startColumn);
		Utilities.insertRangeFromNode(this.getRoot(), node);

		// recompute tokens and children
		this._tokens = null;
		this._children = null;
	}

	/**
	 * Deletes the node at position "pos".
	 * If there is no node at this position, no node is deleted.
	 *
	 * @param pos The position at which to delete the node
	 */
	deleteNode(pos: number): void
	{
		var nodes = this._nodes,
			len = (nodes && nodes.length) || 0,
			i: number,
			node: T.INode;

		if (0 <= pos && pos < len)
		{
			// remove the node from the collection
			node = nodes[pos];
			nodes.splice(pos, 1);

			// update the references
			for (i = pos; i < len - 1; i++)
				this[i] = nodes[i];
			delete this[len - 1];

			// update the ranges
			Utilities.zeroRange(this.getRoot(), node);

			// recompute tokens and children
			this._tokens = null;
			this._children = null;
		}
	}

	/**
	 * Deletes all nodes from the node list.
	 */
	deleteAllNodes(): void
	{
		var nodes = this._nodes,
			len = (nodes && nodes.length) || 0,
			i: number,
			firstRange: T.ISourceRange,
			lastRange: T.ISourceRange,
			range: T.ISourceRange;

		// nothing to do if there are no nodes
		if (len === 0)
			return;

		// construct the range to delete
		firstRange = nodes[0].range;
		lastRange = nodes[len - 1].range;
		range = {
			startLine: firstRange.startLine,
			startColumn: firstRange.startColumn,
			endLine: lastRange.endLine,
			endColumn: lastRange.endColumn
		};

		// remove the nodes
		nodes.splice(0, len);

		// remove the references
		for (i = 0; i < len; i++)
			delete this[i];

		// update the ranges
		Utilities.zeroRange(this.getRoot(), range);

		this._tokens = null;
		this._children = null;
	}

	forEach(it: (elt: U) => void)
	{
		var i: number,
			len = (this._nodes && this._nodes.length) || 0;

		for (i = 0; i < len; i++)
			it(this._nodes[i]);
	}

	toString(): string
	{
		var s = '',
			nodes: T.INode[],
			len: number,
			i: number;

		if (this._hasError)
			return this.errorTokensToString();

		nodes = this._nodes;
		if (nodes)
		{
			len = nodes.length;
			for (i = 0; i < len; i++)
				s += nodes[i].toString();
		}

		return s;
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

		if (this._nodes)
		{
			len = this._nodes.length;
			for (i = 0; i < len; i++)
			{
				r = this._nodes[i].walk(walker);
				if (r !== undefined)
					result.push(r);
			}
		}

		return result;
	}
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

	getChildren(): T.INode[]
	{
		if (this._children === null)
			this._children = [ this._token ];
		return this._children;
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
		return this._token.value || this._token.src;
	}

	getType(): Tokenizer.EToken
	{
		return this._token.token;
	}

	walk(walker: IASTWalker): any
	{
		return this._token.walk(walker);
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

	getValue(): string
	{
		return this.toString();
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

	getChildren(): T.INode[]
	{
		var children: T.INode[];

		if (this._children === null)
		{
			children = super.getChildren();
			this._children = children ? children.slice(0) : [];

			if (this._startToken)
				this._children.unshift(this._startToken);
			if (this._endToken)
				this._children.push(this._endToken);
		}

		return this._children;
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

			if ((r = that._startToken.walk(walker)) !== undefined)
				result.push(r);

			that.walkChildren(walker, result);

			if ((r = that._endToken.walk(walker)) !== undefined)
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

	getArgs(): FunctionArgumentValue[]
	{
		return <FunctionArgumentValue[]> <any> this._nodes;
	}
}


export class FunctionArgumentValue extends ComponentValueList
{
	private _separator: Tokenizer.Token;


	constructor(values: IComponentValue[], separator?: Tokenizer.Token)
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
		var tokens: Tokenizer.Token[];

		if (this._tokens === null)
		{
			tokens = super.getTokens();
			this._tokens = tokens ? tokens.slice(0) : [];
			if (this._separator)
				this._tokens.push(this._separator);
		}

		return this._tokens;
	}

	getChildren(): T.INode[]
	{
		var children: T.INode[];

		if (this._children === null)
		{
			children = super.getChildren();
			this._children = children ? children.slice(0) : [];
			if (this._separator)
				this._children.push(this._separator);
		}

		return this._children;
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

			if (that._separator && (r = that._separator.walk(walker)) !== undefined)
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


export class ImportantComponentValue extends ASTNode
{
	private _exclamationMark: Tokenizer.Token;
	private _important: Tokenizer.Token;


	constructor(exclamationMark: Tokenizer.Token, important: Tokenizer.Token)
	{
		var t: Tokenizer.Token;

		super();

		this._exclamationMark = exclamationMark;
		this._important = important;

		if (this._exclamationMark)
			this._exclamationMark.parent = this;
		if (this._important)
			this._important.parent = this;

		t = exclamationMark || important;
		if (t)
		{
			this.range.startLine = t.range.startLine;
			this.range.startColumn = t.range.startColumn;
		}

		t = important || exclamationMark;
		if (t)
		{
			this.range.endLine = t.range.endLine;
			this.range.endColumn = t.range.endColumn;
		}
	}

	getExclamationMark(): Tokenizer.Token
	{
		return this._exclamationMark;
	}

	getImportant(): Tokenizer.Token
	{
		return this._important;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [];

			if (this._exclamationMark)
				this._tokens.push(this._exclamationMark);
			if (this._important)
				this._tokens.push(this._important);
		}

		return this._tokens;
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
		{
			this._children = [];

			if (this._exclamationMark)
				this._children.push(this._exclamationMark);
			if (this._important)
				this._children.push(this._important);
		}

		return this._children;
	}

	walk(walker: IASTWalker): any
	{
		var that = this;

		return this._walk(walker, function()
		{
			var result: any[] = [],
				r: any;

			if (that._exclamationMark && (r = that._exclamationMark.walk(walker)) !== undefined)
				result.push(r);
			if (that._important && (r = that._important.walk(walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var s: string;

		if (this._hasError)
			return this.errorTokensToString();

		s = '';
		if (this._exclamationMark)
			s += this._exclamationMark.toString();
		if (this._important)
			s += this._important.toString();

		return s;
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
		this._lbrace = lbrace !== undefined ? lbrace : new Tokenizer.Token(Tokenizer.EToken.LBRACE, new SourceRange(), '{');
		this._rbrace = rbrace !== undefined ? rbrace : new Tokenizer.Token(Tokenizer.EToken.RBRACE, new SourceRange(), '}');

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

	static fromErrorTokens(tokens: Tokenizer.Token[]): RuleList
	{
		var ruleList = new RuleList([]);

		ruleList._tokens = tokens;
		ruleList._hasError = true;
		setRangeFromChildren(ruleList.range, tokens);

		return ruleList;
	}

	getStartPosition(): IPosition
	{
		if (this._lbrace)
			return { line: this._lbrace.range.endLine, column: this._lbrace.range.endColumn };
		return super.getStartPosition();
	}

	insertRule(rule: AbstractRule, pos?: number): void
	{
		this.insertNode(rule, pos);
	}

	deleteRule(pos: number): void
	{
		this.deleteNode(pos);
	}

	deleteAllRules(): void
	{
		this.deleteAllNodes();
	}

	getChildren(): T.INode[]
	{
		var children: T.INode[];

		if (this._children === null)
		{
			children = super.getChildren();
			this._children = children ? children.slice(0) : [];

			if (this._lbrace)
				this._children.unshift(this._lbrace);
			if (this._rbrace)
				this._children.push(this._rbrace);
		}

		return this._children;
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

	removeBraces(): void
	{
		var root = this.getRoot();

		if (this._lbrace)
			Utilities.zeroRange(root, this._lbrace);
		if (this._rbrace)
			Utilities.zeroRange(root, this._rbrace);

		this._lbrace = null;
		this._rbrace = null;
	}

	walk(walker: IASTWalker): any
	{
		var that = this;

		return this._walk(walker, function()
		{
			var result: any[] = [],
				r: any;

			if (that._lbrace && (r = that._lbrace.walk(walker)) !== undefined)
				result.push(r);

			that.walkChildren(walker, result);

			if (that._rbrace && (r = that._rbrace.walk(walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var s = super.toString();

		if (!this._hasError)
		{
			if (this._lbrace)
				s = this._lbrace.toString() + s;
			if (this._rbrace)
				s += this._rbrace.toString();
		}

		return s;
	}
}


export class StyleSheet extends ASTNode implements IRulesContainer
{
	private _rules: RuleList;
	private _cdo: Tokenizer.Token;
	private _cdc: Tokenizer.Token;


	constructor(ruleList: RuleList, cdo?: Tokenizer.Token, cdc?: Tokenizer.Token)
	{
		var t: T.INode;

		super();

		this._rules = ruleList;
		this._rules._parent = this;
		this._rules.removeBraces();

		this._cdo = cdo;
		this._cdc = cdc;

		if (this._cdo)
			this._cdo.parent = this;
		if (this._cdc)
			this._cdc.parent = this;

		t = cdo || ruleList || cdc;
		if (t)
		{
			this.range.startLine = t.range.startLine;
			this.range.startColumn = t.range.startColumn;
		}

		t = cdc || ruleList || cdo;
		if (t)
		{
			this.range.endLine = t.range.endLine;
			this.range.endColumn = t.range.endColumn;
		}
	}

	insertRule(rule: AbstractRule, pos?: number): void
	{
		this._rules.insertRule(rule, pos);
	}

	deleteRule(pos: number): void
	{
		this._rules.deleteRule(pos);
	}

	deleteAllRules(): void
	{
		this._rules.deleteAllRules();
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
		{
			this._children = [];

			if (this._cdo)
				this._children.push(this._cdo);
			if (this._rules)
				this._children.push(this._rules);
			if (this._cdc)
				this._children.push(this._cdc);
		}

		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [];

			if (this._cdo)
				this._tokens.push(this._cdo);
			if (this._rules)
				this._tokens = this._tokens.concat(this._rules.getTokens());
			if (this._cdc)
				this._tokens.push(this._cdc);
		}

		return this._tokens;
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
			var result: any[] = [],
				r: any;

			if (that._cdo && (r = that._cdo.walk(walker)) !== undefined)
				result = result.concat(r);
			if (that._rules && (r = that._rules.walk(walker)) !== undefined)
				result = result.concat(r);
			if (that._cdc && (r = that._cdc.walk(walker)) !== undefined)
				result = result.concat(r);

			return result;
		});
	}

	toString(): string
	{
		var s = '';

		if (this._hasError)
			return this.errorTokensToString();

		if (this._cdo)
			s += this._cdo.toString();
		if (this._rules)
			s += this._rules.toString();
		if (this._cdc)
			s += this._cdc.toString();

		return s;
	}
}


export class Rule extends AbstractRule
{
	private _selectors: SelectorList;
	private _declarations: DeclarationList;


	constructor(selectors?: SelectorList, declarations?: DeclarationList)
	{
		var t: T.INode;

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

	setSelectors(selectors: SelectorList): void
	{
		if (this._selectors)
			this._selectors.setSelectors(selectors._nodes);
	}

	insertSelector(selector: Selector, pos?: number): void
	{
		if (this._selectors)
			this._selectors.insertSelector(selector, pos);
	}

	deleteSelector(pos: number): void
	{
		if (this._selectors)
			this._selectors.deleteSelector(pos);
	}

	deleteAllSelectors(): void
	{
		if (this._selectors)
			this._selectors.deleteAllSelectors();
	}

	insertDeclaration(declaration: Declaration, pos?: number): void
	{
		if (this._declarations)
			this._declarations.insertDeclaration(declaration, pos);
	}

	deleteDeclaration(pos: number): void
	{
		if (this._declarations)
			this._declarations.deleteDeclaration(pos);
	}

	deleteAllDeclarations(): void
	{
		if (this._declarations)
			this._declarations.deleteAllDeclarations();
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

		var len: number,
			i: number,
			selector: Selector;

		// add separators to the selectors which don't have one (except for the last one)
		if (selectors)
		{
			len = selectors.length;
			for (i = 0; i < len - 1; i++)
			{
				selector = selectors[i];
				if (!selector.getSeparator())
					selector.addSeparator();
			}
		}
	}

	getSelector(index: number): Selector
	{
		return this._nodes[index];
	}

	setSelectors(selectors: Selector[]): void;
	setSelectors(selectors: SelectorList): void;
	setSelectors(selectors: any): void
	{
		var len: number,
			i: number,
			selector: Selector;

		if (Array.isArray(selectors))
		{
			// make sure there are separators
			len = selectors.length;
			for (i = 0; i < len - 1; i++)
			{
				selector = selectors[i];
				if (!selector.getSeparator())
					selector.addSeparator();
			}

			this.replaceNodes(selectors);
		}
		else if (selectors instanceof SelectorList)
			this.replaceNodes(selectors._nodes);
	}

	insertSelector(selector: Selector, pos?: number): void
	{
		var len = this.getLength(),
			prevSelector: Selector;

		// check if the selector needs a separator (i.e., if the selector is
		// inserted into a non-empty list (not at the end of the list)
		if (!selector.getSeparator() && (len > 0 && pos !== undefined && pos < len))
			selector.addSeparator();

		// add a separator to the selector preceding the one to be inserted if it doesn't have one already
		if (len > 0 && (pos === undefined || pos > 0))
		{
			prevSelector = this._nodes[pos === undefined ? len - 1 : pos - 1];
			if (prevSelector && !prevSelector.getSeparator())
				prevSelector.addSeparator();
		}

		this.insertNode(selector, pos);
	}

	deleteSelector(pos: number): void
	{
		this.deleteNode(pos);
	}

	deleteAllSelectors(): void
	{
		this.deleteAllNodes();
	}
}


export class Selector extends ComponentValueList
{
	private _separator: Tokenizer.Token;
	private _text: string = null;


	constructor(values: IComponentValue[], separator?: Tokenizer.Token);
	constructor(selectorText: string);
	constructor(...args: any[])
	{
		super(typeof args[0] === 'string' ? (new Parser.Parser(<string> args[0]).parseComponentValueList()) : <ComponentValue[]> args[0]);

		if (args.length >= 1 && args[1] instanceof Tokenizer.Token)
		{
			this._separator = <Tokenizer.Token> args[1];
			if (this._separator)
			{
				this._separator.parent = this;

				if (!this._nodes || this._nodes.length === 0)
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

	addSeparator(): void
	{
		var line: number,
			column: number,
			separator: Tokenizer.Token,
			root = this.getRoot(),
			tokens: Tokenizer.Token[],
			lenTokens: number,
			lastToken: Tokenizer.Token,
			trivia: Tokenizer.Token[],
			len: number,
			i: number,
			token: Tokenizer.Token;

		if (this._separator)
			return;

		// move the trailing trivia
		tokens = this._nodes[this._nodes.length - 1].getTokens();
		if (tokens && ((lenTokens = tokens.length) > 0) && tokens[lenTokens - 1].trailingTrivia)
		{
			// remove the trivia
			lastToken = tokens[lenTokens - 1];
			trivia = lastToken.trailingTrivia;
			delete lastToken.trailingTrivia;
			lastToken._children = null;

			// update the ranges
			len = trivia.length;
			Utilities.zeroRange(root, new SourceRange(
				trivia[0].range.startLine, trivia[0].range.startColumn, trivia[len - 1].range.endLine, trivia[len - 1].range.endColumn)
			);

			// offset the range of the trivia tokens (insert the separator token)
			line = this.range.endLine;
			column = this.range.endColumn;
			for (i = 0; i < len; i++)
			{
				token = trivia[i];
				if (token.range.startLine === line)
					token.range.startColumn++;
				if (token.range.endLine === line)
					token.range.endColumn++;
			}

			// create a new separator
			separator = new Tokenizer.Token(
				Tokenizer.EToken.COMMA,
				new SourceRange(line, column, trivia[len - 1].range.endLine, trivia[len - 1].range.endColumn),
				','
			);
			separator.trailingTrivia = trivia;
		}
		else
		{
			line = this.range.endLine;
			column = this.range.endColumn;
			separator = new Tokenizer.Token(Tokenizer.EToken.COMMA, new SourceRange(line, column, line, column + 2), ',');
			separator.trailingTrivia = [
				new Tokenizer.Token(Tokenizer.EToken.WHITESPACE, new SourceRange(line, column + 1, line, column + 2), ' ')
			];
		}

		// force recompute
		this._children = null;
		this._tokens = null;

		this._separator = separator;
		this._separator.parent = this;

		Utilities.insertRangeFromNode(root, this._separator);
	}

	getText(): string
	{
		if (this._text === null)
			this._text = toStringNormalize(super.getTokens());
		return this._text;
	}

	setText(newText: string): void
	{
		this.replaceNodes(new Parser.Parser(newText).parseComponentValueList());
	}

	getChildren(): T.INode[]
	{
		var children: T.INode[];

		if (this._children === null)
		{
			children = super.getChildren();
			this._children = children ? children.slice(0) : [];
			if (this._separator)
				this._children.push(this._separator);
		}

		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		var tokens: Tokenizer.Token[];

		if (this._tokens === null)
		{
			tokens = super.getTokens();
			this._tokens = tokens ? tokens.slice(0) : [];

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

			if (that._separator && (r = that._separator.walk(walker)) !== undefined)
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


export class SelectorCombinator extends ComponentValue
{
	getCombinator(): string
	{
		var t = this.getToken();

		if (t.token === Tokenizer.EToken.WHITESPACE)
			return ' ';
		return t.src;
	}

	walk(walker: IASTWalker): any
	{
		var that = this;
		return this._walk(walker, function()
		{
			return that.getToken().walk(walker);
		});
	}
}


export class SimpleSelector<U extends T.INode> extends ASTNode implements IComponentValue
{
	_value: U;
	_namespace: Tokenizer.Token;
	_pipe: Tokenizer.Token;


	constructor(value: U, namespace?: Tokenizer.Token, pipe?: Tokenizer.Token)
	{
		var t: T.INode;

		super();

		this._value = value;
		this._namespace = namespace;
		this._pipe = pipe;

		if (this._value)
		{
			if (this._value instanceof Tokenizer.Token)
				(<Tokenizer.Token> <any> this._value).parent = this;
			else if (this._value instanceof ASTNode)
				(<ASTNode> <any> this._value)._parent = this;
		}

		if (this._namespace)
			this._namespace.parent = this;
		if (this._pipe)
			this._pipe.parent = this;

		t = this._namespace || this._pipe || this._value;
		if (t)
		{
			this.range.startLine = t.range.startLine;
			this.range.startColumn = t.range.startColumn;
		}

		t = this._value || this._pipe || this._namespace;
		if (t)
		{
			this.range.endLine = t.range.endLine;
			this.range.endColumn = t.range.endColumn;
		}
	}

	getNamespace(): Tokenizer.Token
	{
		return this._namespace;
	}

	getPipe(): Tokenizer.Token
	{
		return this._pipe;
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
		{
			this._children = [];

			if (this._namespace)
				this._children.push(this._namespace);
			if (this._pipe)
				this._children.push(this._pipe);
			if (this._value)
				this._children.push(this._value);
		}

		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [];

			if (this._namespace)
				this._tokens.push(this._namespace);
			if (this._pipe)
				this._tokens.push(this._pipe);
			if (this._value)
				this._tokens = this._tokens.concat(this._value.getTokens());
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

			if (that._namespace && (r = that._namespace.walk(walker)) !== undefined)
				result.push(r);
			if (that._pipe && (r = that._pipe.walk(walker)) !== undefined)
				result.push(r);
			if (that._value && (r = that._value.walk(walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var s = '';

		if (this._hasError)
			return this.errorTokensToString();

		if (this._namespace)
			s += this._namespace.toString();
		if (this._pipe)
			s += this._pipe.toString();
		if (this._value)
			s += this._value.toString();

		return s;
	}

	getValue(): string
	{
		var s = '';

		if (this._namespace)
			s += this._namespace.src;
		if (this._pipe)
			s += this._pipe.src;

		if (this._value instanceof BlockComponentValue)
			s += (<BlockComponentValue> <any> this._value).getValue();
		else if (this._value instanceof ComponentValue)
			s += (<ComponentValue> <any> this._value).getValue();
		else if (this._value instanceof Tokenizer.Token)
			s += (<Tokenizer.Token> <any> this._value).value || this._value.toString();
		else
			s += this._value.toString();

		return s;
	}
}


export class TypeSelector extends SimpleSelector<Tokenizer.Token>
{
	constructor(type: Tokenizer.Token, namespace?: Tokenizer.Token, pipe?: Tokenizer.Token);
	constructor(type: string, namespace?: string);

	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				new Tokenizer.Token(Tokenizer.EToken.IDENT, new SourceRange(), <string> args[0]),
			isASTConstructor ?
				<Tokenizer.Token> args[1] :
				(args[1] ? new Tokenizer.Token(Tokenizer.EToken.IDENT, new SourceRange(), <string> args[1]) : undefined),
			isASTConstructor ?
				<Tokenizer.Token> args[2] :
				(args[1] !== '' ? new Tokenizer.Token(Tokenizer.EToken.DELIM, new SourceRange(), '|') : undefined)
		);
	}

	getType(): Tokenizer.Token
	{
		return this._value;
	}
}


export class UniversalSelector extends SimpleSelector<Tokenizer.Token>
{
	constructor(asterisk: Tokenizer.Token, namespace?: Tokenizer.Token, pipe?: Tokenizer.Token);
	constructor(namespace?: string);

	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				new Tokenizer.Token(Tokenizer.EToken.DELIM, new SourceRange(), '*'),
			isASTConstructor ?
				<Tokenizer.Token> args[1] :
				(args[0] ? new Tokenizer.Token(Tokenizer.EToken.IDENT, new SourceRange(), <string> args[0]) : undefined),
			isASTConstructor ?
				<Tokenizer.Token> args[2] :
				(args[0] !== '' ? new Tokenizer.Token(Tokenizer.EToken.DELIM, new SourceRange(), '|') : undefined)
		);
	}

	getType(): Tokenizer.Token
	{
		return this._value;
	}
}


export class AttributeSelector extends SimpleSelector<BlockComponentValue>
{
	getAttribute(): BlockComponentValue
	{
		return this._value;
	}
}


export class ClassSelector extends SimpleSelector<Tokenizer.Token>
{
	private _className: Tokenizer.Token;


	constructor(dot: Tokenizer.Token, className: Tokenizer.Token, namespace?: Tokenizer.Token, pipe?: Tokenizer.Token);
	constructor(className: string, namespace?: string);

	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token,
			className: Tokenizer.Token = isASTConstructor ?
				<Tokenizer.Token> args[1] :
				new Tokenizer.Token(Tokenizer.EToken.IDENT, new SourceRange(), <string> args[0]);

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				new Tokenizer.Token(Tokenizer.EToken.DELIM, new SourceRange(), '.'),
			isASTConstructor ?
				<Tokenizer.Token> args[2] :
				(args[1] ? new Tokenizer.Token(Tokenizer.EToken.IDENT, new SourceRange(), <string> args[1]) : undefined),
			isASTConstructor ?
				<Tokenizer.Token> args[3] :
				(args[1] !== '' ? new Tokenizer.Token(Tokenizer.EToken.DELIM, new SourceRange(), '|') : undefined)
		);

		this._className = className;
		this._className.parent = this;

		this.range.endLine = className.range.endLine;
		this.range.endColumn = className.range.endColumn;
	}

	getClassName(): Tokenizer.Token
	{
		return this._className;
	}

	getDot(): Tokenizer.Token
	{
		return this._value;
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
		{
			this._children = super.getChildren();
			this._children.push(this._className);
		}

		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = super.getTokens();
			this._tokens.push(this._className);
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

			if (that._namespace && (r = that._namespace.walk(walker)) !== undefined)
				result.push(r);
			if (that._pipe && (r = that._pipe.walk(walker)) !== undefined)
				result.push(r);
			if (that._value && (r = that._value.walk(walker)) !== undefined)
				result.push(r);
			if (that._className && (r = that._className.walk(walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var s = super.toString();

		if (!this._hasError)
			s += this._className.toString();

		return s;
	}
}


export class IDSelector extends SimpleSelector<Tokenizer.Token>
{
	constructor(id: Tokenizer.Token, namespace?: Tokenizer.Token, pipe?: Tokenizer.Token);
	constructor(id: string, namespace?: string);

	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				new Tokenizer.Token(Tokenizer.EToken.HASH, new SourceRange(), '#' + (<string> args[0])),
			isASTConstructor ?
				<Tokenizer.Token> args[1] :
				(args[1] ? new Tokenizer.Token(Tokenizer.EToken.IDENT, new SourceRange(), <string> args[1]) : undefined),
			isASTConstructor ?
				<Tokenizer.Token> args[2] :
				(args[1] !== '' ? new Tokenizer.Token(Tokenizer.EToken.DELIM, new SourceRange(), '|') : undefined)
		);
	}

	getID(): Tokenizer.Token
	{
		return this._value;
	}
}


export class PseudoClass extends ASTNode implements IComponentValue
{
	private _colon1: Tokenizer.Token;
	private _colon2: Tokenizer.Token;
	private _pseudoClassName: IComponentValue;


	constructor(colon1: Tokenizer.Token, colon2: Tokenizer.Token, pseudoClassName: IComponentValue);
	constructor(pseudoClass: string);

	constructor(...args: any[])
	{
		var pseudoClass: string;

		super();

		if (args[0] instanceof Tokenizer.Token)
			this.set(<Tokenizer.Token> args[0], <Tokenizer.Token> args[1], <IComponentValue> args[2]);
		else if (typeof args[0] === 'string')
		{
			pseudoClass = <string> args[0];
			this.set(
				new Tokenizer.Token(Tokenizer.EToken.COLON, new SourceRange(), ':'),
				pseudoClass[1] === ':' ? new Tokenizer.Token(Tokenizer.EToken.COLON, new SourceRange(), ':') : null,
				new ComponentValue(new Tokenizer.Token(Tokenizer.EToken.IDENT, new SourceRange(), pseudoClass.replace(/^:+/g, '')))
			);
		}
	}

	getPseudoClassName(): IComponentValue
	{
		return this._pseudoClassName;
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
		{
			this._children = [];

			if (this._colon1)
				this._children.push(this._colon1);
			if (this._colon2)
				this._children.push(this._colon2);
			if (this._pseudoClassName)
				this._children.push(this._pseudoClassName);
		}

		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [];

			if (this._colon1)
				this._tokens.push(this._colon1);
			if (this._colon2)
				this._tokens.push(this._colon2);
			if (this._pseudoClassName)
				this._tokens = this._tokens.concat(this._pseudoClassName.getTokens());
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

			if (that._colon1 && (r = that._colon1.walk(walker)) !== undefined)
				result.push(r);
			if (that._colon2 && (r = that._colon2.walk(walker)) !== undefined)
				result.push(r);
			if (that._pseudoClassName && (r = that._pseudoClassName.walk(walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var s = '';

		if (this._hasError)
			return this.errorTokensToString();

		if (this._colon1)
			s += this._colon1.toString();
		if (this._colon2)
			s += this._colon2.toString();
		if (this._pseudoClassName)
			s += this._pseudoClassName.toString();

		return s;
	}

	getValue(): string
	{
		var s = '';

		if (this._colon1)
			s += this._colon1.src;
		if (this._colon2)
			s += this._colon2.src;
		if (this._pseudoClassName)
			s += this._pseudoClassName.getValue();

		return s;
	}

	private set(colon1: Tokenizer.Token, colon2: Tokenizer.Token, value: IComponentValue)
	{
		var t: T.INode;

		this._colon1 = colon1;
		this._colon2 = colon2;
		this._pseudoClassName = value;

		if (this._colon1)
			this._colon1.parent = this;
		if (this._colon2)
			this._colon2.parent = this;
		if (this._pseudoClassName)
			(<ASTNode> <any> this._pseudoClassName)._parent = this;

		t = colon1 || colon2 || value;
		if (t)
		{
			this.range.startLine = t.range.startLine;
			this.range.startColumn = t.range.startColumn;
		}

		t = value || colon2 || colon1;
		if (t)
		{
			this.range.endLine = t.range.endLine;
			this.range.endColumn = t.range.endColumn;
		}
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
		this._lbrace = lbrace !== undefined ? lbrace : new Tokenizer.Token(Tokenizer.EToken.LBRACE, new SourceRange(), '{');
		this._rbrace = rbrace !== undefined ? rbrace : new Tokenizer.Token(Tokenizer.EToken.RBRACE, new SourceRange(), '}');

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

	static fromErrorTokens(tokens: Tokenizer.Token[]): DeclarationList
	{
		var declarationList = new DeclarationList([]);

		declarationList._tokens = tokens;
		declarationList._hasError = true;
		setRangeFromChildren(declarationList.range, tokens);

		return declarationList;
	}

	insertDeclaration(declaration: Declaration, pos?: number): void
	{
		this.insertNode(declaration, pos);
	}

	deleteDeclaration(pos: number): void
	{
		this.deleteNode(pos);
	}

	deleteAllDeclarations(): void
	{
		this.deleteAllNodes();
	}

	getChildren(): T.INode[]
	{
		var children: T.INode[];

		if (this._children === null)
		{
			children = super.getChildren();
			this._children = children ? children.slice(0) : [];

			if (this._lbrace)
				this._children.unshift(this._lbrace);
			if (this._rbrace)
				this._children.push(this._rbrace);
		}

		return this._children;
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

			if (that._lbrace && (r = that._lbrace.walk(walker)) !== undefined)
				result.push(r);

			that.walkChildren(walker, result);

			if (that._rbrace && (r = that._rbrace.walk(walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(excludeBraces?: boolean): string
	{
		var s = super.toString();

		if (!this._hasError && !excludeBraces)
		{
			if (this._lbrace)
				s = this._lbrace.toString() + s;
			if (this._rbrace)
				s += this._rbrace.toString();
		}

		return s;
	}
}


export class Declaration extends ASTNode
{
	private _name: ComponentValueList;
	private _colon: Tokenizer.Token;
	private _value: DeclarationValue;
	private _semicolon: Tokenizer.Token;

	private _lcomment: Tokenizer.Token;
	private _rcomment: Tokenizer.Token;

	private _text: string = null;
	private _nameText: string = null;


	constructor(
		name: ComponentValueList, colon: Tokenizer.Token, value: DeclarationValue, semicolon: Tokenizer.Token,
		lcomment?: Tokenizer.Token, rcomment?: Tokenizer.Token);
	constructor(name: string, value: string, important?: boolean, disabled?: boolean);

	constructor(...args: any[])
	{
		super();

		if (((args[0] instanceof ComponentValueList) || args[0] === null) &&
			((args[1] instanceof Tokenizer.Token) || args[1] === null) &&
			((args[2] instanceof DeclarationValue) || args[2] === null))
		{
			this.set(
				<ComponentValueList> args[0], // name
				<Tokenizer.Token> args[1],    // colon
				<DeclarationValue> args[2],   // value
				<Tokenizer.Token> args[3],    // semicolon
				<Tokenizer.Token> args[4],    // lcomment
				<Tokenizer.Token> args[5]     // rcomment
			);
		}
		else if ((typeof args[0] === 'string') && (typeof args[1] === 'string'))
		{
			var value = <string> args[1],
				important = <boolean> args[2],
				disabled = <boolean> args[3];

			if (important && value && value.toLowerCase().indexOf('!important') < 0)
				value += ' !important';

			this.set(
				new ComponentValueList(new Parser.Parser(<string> args[0]).parseComponentValueList()),
				new Tokenizer.Token(Tokenizer.EToken.COLON, new SourceRange(), ':'),
				new Parser.Parser(<string> args[1]).parseDeclarationValue(),
				new Tokenizer.Token(Tokenizer.EToken.SEMICOLON, new SourceRange(), ';'),
				disabled ? new Tokenizer.Token(Tokenizer.EToken.DELIM, new SourceRange(), '/*') : undefined,
				disabled ? new Tokenizer.Token(Tokenizer.EToken.DELIM, new SourceRange(), '*/') : undefined
			);
		}
		else
			throw new Error('Unsupported constructor arguments');
	}

	static fromErrorTokens(tokens: Tokenizer.Token[]): Declaration
	{
		var decl = new Declaration(null, null, null, null);

		decl._tokens = tokens;
		decl._hasError = true;
		setRangeFromChildren(decl.range, tokens);

		return decl;
	}

	setName(newName: string): void
	{
		var newNameLc = newName ? newName.toLowerCase() : newName,
			nameValues: ComponentValue[],
			oldRange: T.ISourceRange,
			root: T.INode;

		if (this.getNameAsString().toLowerCase() === newNameLc)
			return;

		// parse the new name
		nameValues = new Parser.Parser(newName).parseComponentValueList();
		if (!nameValues || nameValues.length === 0)
			return;

		// set the name property
		root = this.getRoot();
		oldRange = this._name.range;
		Utilities.zeroRange(root, this._name);
		this._name = new ComponentValueList(nameValues);
		this._name._parent = this;

		// adjust the ranges
		Utilities.offsetRange(this._name, oldRange.startLine, oldRange.startColumn);
		Utilities.insertRangeFromNode(root, this._name);

		// recompute
		this._text = null;
		this._nameText = null;
		this._tokens = null;
		this._children = null;
	}

	getName(): ComponentValueList
	{
		return this._name;
	}

	getNameAsString(): string
	{
		if (this._nameText === null)
			this._nameText = this._name ? toStringNormalize(this._name.getTokens()) : '';
		return this._nameText;
	}

	getColon(): Tokenizer.Token
	{
		return this._colon;
	}

	getValue(): DeclarationValue
	{
		return this._value;
	}

	getValueAsString(excludeImportant?: boolean): string
	{
		return this._value ? this._value.getText(excludeImportant) : '';
	}

	setValue(newValue: string): void
	{
		var newValueLc = newValue ? newValue.toLowerCase() : newValue,
			oldRange: T.ISourceRange,
			root: T.INode;

		if (this.getValueAsString().toLowerCase() === newValueLc)
			return;

		// TODO: handle case when there are errors (name, value not defined)
		root = this.getRoot();
		oldRange = this._value.range;
		Utilities.zeroRange(root, this._value);
		this._value = new Parser.Parser(newValue).parseDeclarationValue();
		this._value._parent = this;

		// adjust the ranges
		Utilities.offsetRange(this._value, oldRange.startLine, oldRange.startColumn);
		Utilities.insertRangeFromNode(root, this._value);

		// recompute
		this._text = null;
		this._nameText = null;
		this._tokens = null;
		this._children = null;
	}

	getSemicolon(): Tokenizer.Token
	{
		return this._semicolon;
	}

	getLComment(): Tokenizer.Token
	{
		return this._lcomment;
	}

	getRComment(): Tokenizer.Token
	{
		return this._rcomment;
	}

	getDisabled(): boolean
	{
		return this._lcomment !== undefined && this._rcomment !== undefined;
	}

	setDisabled(isDisabled: boolean): void
	{
		var root: T.INode;

		if (this.getDisabled() === isDisabled)
			return;

		root = this.getRoot();
		if (isDisabled)
		{
			// insert an "opening comment" token
			this._lcomment = new Tokenizer.Token(
				Tokenizer.EToken.DELIM,
				new SourceRange(this.range.startLine, this.range.startColumn, this.range.startLine, this.range.startColumn + 2),
				'/*'
			);
			this._lcomment.parent = this;
			Utilities.insertRangeFromNode(root, this._lcomment);

			// insert a "closing comment" token
			this._rcomment = new Tokenizer.Token(
				Tokenizer.EToken.DELIM,
				new SourceRange(this.range.endLine, this.range.endColumn, this.range.endLine, this.range.endColumn + 2),
				'*/'
			);
			this._rcomment.parent = this;
			Utilities.insertRangeFromNode(root, this._rcomment);
		}
		else
		{
			Utilities.zeroRange(root, this._lcomment);
			this._lcomment = null;

			Utilities.zeroRange(root, this._rcomment);
			this._rcomment = null;
		}

		// re-create children and token arrays
		this._children = null;
		this._tokens = null;
	}

	getImportant(): boolean
	{
		return this._value.getImportant();
	}

	getText(): string
	{
		if (this._text === null)
			this._text = toStringNormalize(this.getTokens());
		return this._text;
	}

	setText(newText: string): void
	{
		var declaration: Declaration = Parser.parseDeclaration(newText),
			root = this.getRoot();

		Utilities.offsetRange(declaration, this.range.startLine, this.range.startColumn);
		Utilities.zeroRange(root, this);

		this.set(
			declaration._name, declaration._colon, declaration._value, declaration._semicolon,
			declaration._lcomment, declaration._rcomment
		);

		Utilities.insertRangeFromNode(root, this);

		// recompute
		this._text = null;
		this._nameText = null;
		this._tokens = null;
		this._children = null;
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
		{
			this._children = [];

			if (this._lcomment)
				this._children.push(this._lcomment);
			if (this._name)
				this._children.push(this._name);
			if (this._colon)
				this._children.push(this._colon);
			if (this._value)
				this._children.push(this._value);
			if (this._semicolon)
				this._children.push(this._semicolon);
			if (this._rcomment)
				this._children.push(this._rcomment);
		}

		return this._children;
	}

	getTokens(): Tokenizer.Token[]
	{
		if (this._tokens === null)
		{
			this._tokens = [];
			if (this._lcomment)
				this._tokens.push(this._lcomment);
			if (this._name)
				this._tokens = this._tokens.concat(this._name.getTokens());
			if (this._colon)
				this._tokens.push(this._colon);
			if (this._value)
				this._tokens = this._tokens.concat(this._value.getTokens());
			if (this._semicolon)
				this._tokens.push(this._semicolon);
			if (this._rcomment)
				this._tokens.push(this._rcomment);
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

			if (that._lcomment && (r = that._lcomment.walk(walker)) !== undefined)
				result.push(r);
			if (that._name && (r = that._name.walk(walker)) !== undefined)
				result = result.concat(r);
			if (that._colon && (r = that._colon.walk(walker)) !== undefined)
				result.push(r);
			if (that._value && (r = that._value.walk(walker)) !== undefined)
				result = result.concat(r);
			if (that._semicolon && (r = that._semicolon.walk(walker)) !== undefined)
				result.push(r);
			if (that._rcomment && (r = that._rcomment.walk(walker)) !== undefined)
				result.push(r);

			return result;
		});
	}

	toString(): string
	{
		var s = '';

		if (this._hasError)
			return this.errorTokensToString();

		if (this._lcomment)
			s += this._lcomment.toString();
		if (this._name)
			s += this._name.toString();
		if (this._colon)
			s += this._colon.toString();
		if (this._value)
			s += this._value.toString();
		if (this._semicolon)
			s += this._semicolon.toString();
		if (this._rcomment)
			s += this._rcomment.toString();

		return s;
	}

	private set(
		name: ComponentValueList, colon: Tokenizer.Token, value: DeclarationValue, semicolon: Tokenizer.Token,
		lcomment?: Tokenizer.Token, rcomment?: Tokenizer.Token)
	{
		var t: T.INode;

		this._name = name;
		this._colon = colon;
		this._value = value;
		this._semicolon = semicolon;
		this._lcomment = lcomment;
		this._rcomment = rcomment;

		// set parents
		if (name)
			this._name._parent = this;
		if (colon)
			this._colon.parent = this;
		if (value)
			this._value._parent = this;
		if (semicolon)
			this._semicolon.parent = this;
		if (lcomment)
			this._lcomment.parent = this;
		if (rcomment)
			this._rcomment.parent = this;

		// set range
		t = lcomment || name || colon || value || semicolon || rcomment;
		if (t)
		{
			this.range.startLine = t.range.startLine;
			this.range.startColumn = t.range.startColumn;
		}

		t = rcomment || semicolon || value || colon || name || lcomment;
		if (t)
		{
			this.range.endLine = t.range.endLine;
			this.range.endColumn = t.range.endColumn;
		}
	}
}


export class DeclarationValue extends ComponentValueList
{
	private _text: string = null;
	private _textWithoutImportant: string = null;


	constructor(values: IComponentValue[])
	{
		super(values);
	}

	getText(excludeImportant?: boolean): string
	{
		var tokens: Tokenizer.Token[],
			len: number,
			i: number,
			node: ComponentValue;

		if (excludeImportant)
		{
			if (this._textWithoutImportant === null)
			{
				tokens = [];
				len = this._nodes.length;
				for (i = 0; i < len; i++)
				{
					node = this._nodes[i];
					if (!(node instanceof ImportantComponentValue))
						tokens = tokens.concat(node.getTokens());
				}

				this._textWithoutImportant = toStringNormalize(tokens);
			}

			return this._textWithoutImportant;
		}

		if (this._text === null)
			this._text = toStringNormalize(this.getTokens());
		return this._text;
	}

	setText(value: string): void
	{
		var declarationValue: DeclarationValue,
			nodes: ASTNode[];

		if (this._text === value)
			return;

		this._text = null;

		declarationValue = new Parser.Parser(value).parseDeclarationValue();
		Utilities.offsetRange(declarationValue, this.range.startLine, this.range.startColumn);

		Utilities.updateNodeRange(this.getRoot(), this, declarationValue.range);

		nodes = this._nodes;
		nodes.splice.apply(nodes, (<any> [ 0, nodes.length ]).concat(declarationValue._children));
	}

	getImportant(): boolean
	{
		var nodes = this._nodes;
		return nodes[nodes.length - 1] instanceof ImportantComponentValue;
	}

	toString(excludeImportant?: boolean): string
	{
		var s = '',
			nodes: ASTNode[],
			len: number,
			i: number,
			value: ASTNode;

		if (this._hasError)
			return this.errorTokensToString();

		nodes = this._nodes;
		if (nodes)
		{
			len = nodes.length;
			for (i = 0; i < len; i++)
			{
				value = nodes[i];
				if (!(excludeImportant && (value instanceof ImportantComponentValue)))
					s += value.toString();
			}
		}

		return s;
	}
}


export class AtRule extends AbstractRule implements IRulesContainer
{
	private _atKeyword: Tokenizer.Token;
	private _prelude: ComponentValueList;

	private _block: ASTNode;
	private _semicolon: Tokenizer.Token;


	constructor(atKeyword: Tokenizer.Token, prelude?: ComponentValueList, blockOrSemicolon?: T.INode)
	{
		var t: T.INode;

		super();

		this._atKeyword = atKeyword;
		this._prelude = prelude;
		this._block = blockOrSemicolon instanceof ASTNode ? <ASTNode> blockOrSemicolon : null;
		this._semicolon = blockOrSemicolon instanceof Tokenizer.Token ? <Tokenizer.Token> blockOrSemicolon : null;

		// set parents
		if (this._atKeyword)
			this._atKeyword.parent = this;
		if (this._prelude)
			this._prelude._parent = this;
		if (this._block)
			this._block._parent = this;
		if (this._semicolon)
			this._semicolon.parent = this;

		// set range
		t = atKeyword || prelude || blockOrSemicolon;
		if (t)
		{
			this.range.startLine = t.range.startLine;
			this.range.startColumn = t.range.startColumn;
		}

		t = blockOrSemicolon || prelude || atKeyword;
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

	getSemicolon(): Tokenizer.Token
	{
		return this._semicolon;
	}

	getChildren(): T.INode[]
	{
		if (this._children === null)
		{
			this._children = [];

			if (this._atKeyword)
				this._children.push(this._atKeyword);
			if (this._prelude)
				this._children.push(this._prelude);
			if (this._block)
				this._children.push(this._block);
			if (this._semicolon)
				this._children.push(this._semicolon);
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

			if (that._atKeyword && (r = that._atKeyword.walk(walker)) !== undefined)
				result.push(r);
			if (that._prelude && (r = that._prelude.walk(walker)) !== undefined)
				result = result.concat(r);
			if (that._block && (r = that._block.walk(walker)) !== undefined)
				result = result.concat(r);
			if (that._semicolon && (r = that._semicolon.walk(walker)) !== undefined)
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
		if (this._semicolon)
			s += this._semicolon.toString();

		return s;
	}
}


export class AtCharset extends AtRule
{
	private _charset: string;


	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, semicolon: Tokenizer.Token);
	constructor(charset: string);
	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				trailingWhitespace(new Tokenizer.Token(Tokenizer.EToken.AT_KEYWORD, new SourceRange(), '@charset')),
			isASTConstructor ?
				<ComponentValueList> args[1] :
				new ComponentValueList(new Parser.Parser(<string> args[0]).parseComponentValueList()),
			isASTConstructor ?
				<Tokenizer.Token> args[2] :
				new Tokenizer.Token(Tokenizer.EToken.SEMICOLON, new SourceRange(), ';')
		);

		this._charset = null;
	}

	getCharset(): string
	{
		var prelude = this.getPrelude(),
			first: ComponentValue;

		if (this._charset === null && prelude)
		{
			first = prelude[0];
			this._charset = first ? first.getValue() : '';
		}

		return this._charset;
	}
}


export class AtCustomMedia extends AtRule
{
	private _extensionName: string;
	private _media: ComponentValueList;


	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, semicolon: Tokenizer.Token);
	constructor(extensionName: string, media: string);
	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				trailingWhitespace(new Tokenizer.Token(Tokenizer.EToken.AT_KEYWORD, new SourceRange(), '@custom-media')),
			isASTConstructor ?
				<ComponentValueList> args[1] :
				new ComponentValueList(new Parser.Parser(<string> args[0] + ' ' + <string> args[1]).parseComponentValueList()),
			isASTConstructor ?
				<Tokenizer.Token> args[2] :
				new Tokenizer.Token(Tokenizer.EToken.SEMICOLON, new SourceRange(), ';')
		);

		this._extensionName = null;
		this._media = null;
	}

	getExtensionName(): string
	{
		if (this._extensionName === null)
			this.getExtensionNameAndMedia();

		return this._extensionName;
	}

	getMedia(): ComponentValueList
	{
		if (this._media === null)
			this.getExtensionNameAndMedia();

		return this._media;
	}

	private getExtensionNameAndMedia(): void
	{
		var prelude = this.getPrelude(),
			children: T.INode[],
			len: number,
			i: number,
			l: number,
			node: T.INode,
			tokens: Tokenizer.Token[] = [],
			nodeTokens: Tokenizer.Token[];

		children = prelude && prelude.getChildren();
		if (children)
		{
			len = children.length;
			for (i = 0; i < len; i++)
			{
				node = children[i];
				nodeTokens = node.getTokens();
				tokens = tokens.concat(nodeTokens);

				if (nodeTokens)
				{
					l = nodeTokens.length;

					if (l > 0 && (nodeTokens[l - 1].token === Tokenizer.EToken.WHITESPACE || nodeTokens[l - 1].hasTrailingWhitespace()))
					{
						this._extensionName = toStringNormalize(tokens);
						this._media = new ComponentValueList(<IComponentValue[]> children.slice(i + 1));
						break;
					}
				}
			}
		}
	}
}


export class AtDocument extends AtRule
{
	private _url: string;
	private _urlPrefix: string;
	private _domain: string;
	private _regexp: string;


	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, block: RuleList);
	constructor(prelude: string, rules: RuleList);
	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				trailingWhitespace(new Tokenizer.Token(Tokenizer.EToken.AT_KEYWORD, new SourceRange(), '@document')),
			isASTConstructor ?
				<ComponentValueList> args[1] :
				new ComponentValueList(new Parser.Parser(<string> args[0]).parseComponentValueList()),
			isASTConstructor ? <RuleList> args[2] : <RuleList> args[1]
		);

		var getArg = function(fnx: T.INode)
		{
			var args = (<FunctionComponentValue> fnx).getArgs(),
				arg: FunctionArgumentValue = args.length > 0 ? args[0] : null;

			if (!arg)
				return '';

			return arg.getLength() === 1 ? arg[0].getValue() : arg.getValue();
		};

		var prelude = this.getPrelude(),
			len = (prelude && prelude.getLength()) || 0,
			i: number,
			val: IComponentValue,
			name: string;

		for (i = 0; i < len; i++)
		{
			val = prelude[i];
			if (val instanceof ComponentValue && (<ComponentValue> val).getToken().token === Tokenizer.EToken.URL)
				this._url = (<ComponentValue> val).getValue();
			else if (val instanceof FunctionComponentValue)
			{
				name = (<FunctionComponentValue> val).getName().value.toLowerCase();

				if (name === 'url-prefix')
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
}


export class AtFontFace extends AtRule
{
	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, declarations: DeclarationList);
	constructor(declarations: DeclarationList);
	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				trailingWhitespace(new Tokenizer.Token(Tokenizer.EToken.AT_KEYWORD, new SourceRange(), '@font-face')),
			isASTConstructor ? <ComponentValueList> args[1] : new ComponentValueList([]),
			isASTConstructor ? <DeclarationList> args[2] : <DeclarationList> args[0]
		);
	}
}


export class AtHost extends AtRule
{
	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, rules: RuleList);
	constructor(rules: RuleList);
	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				trailingWhitespace(new Tokenizer.Token(Tokenizer.EToken.AT_KEYWORD, new SourceRange(), '@host')),
			isASTConstructor ? <ComponentValueList> args[1] : new ComponentValueList([]),
			isASTConstructor ? <RuleList> args[2] : <RuleList> args[0]
		);
	}
}


export class AtImport extends AtRule
{
	private _url: string;
	private _media: ComponentValueList;


	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, semicolon: Tokenizer.Token);
	constructor(url: string, media?: string);
	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				trailingWhitespace(new Tokenizer.Token(Tokenizer.EToken.AT_KEYWORD, new SourceRange(), '@import')),
			isASTConstructor ?
				<ComponentValueList> args[1] :
				new ComponentValueList(new Parser.Parser(
					'url("' + (<string> args[0]) + '")' + (args[1] === undefined ? '' : (' ' + (<string> args[1])))
				).parseComponentValueList()),
			isASTConstructor ?
				<Tokenizer.Token> args[2] :
				new Tokenizer.Token(Tokenizer.EToken.SEMICOLON, new SourceRange(), ';')
		);

		this._url = null;
		this._media = null;
	}

	getUrl(): string
	{
		var prelude = this.getPrelude(),
			first: ComponentValue;

		if (this._url === null && prelude)
		{
			first = prelude[0];
			this._url = first ? first.getValue() : '';
		}

		return this._url;
	}

	getMedia(): ComponentValueList
	{
		var prelude = this.getPrelude(),
			children: T.INode[];

		if (this._media === null && prelude)
		{
			children = prelude.getChildren();
			if (children)
			{
				this._media = new ComponentValueList(<IComponentValue[]> children.slice(1));
				this._media._parent = this;
			}
		}

		return this._media;
	}
}


export class AtKeyframes extends AtRule
{
	private _animationName: string;


	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, rules: RuleList);
	constructor(animationName: string, rules: RuleList);
	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				trailingWhitespace(new Tokenizer.Token(Tokenizer.EToken.AT_KEYWORD, new SourceRange(), '@keyframes')),
			isASTConstructor ?
				<ComponentValueList> args[1] :
				new ComponentValueList(
					[ new ComponentValue(new Tokenizer.Token(Tokenizer.EToken.IDENT, new SourceRange(), <string> args[0])) ]
				),
			isASTConstructor ? <RuleList> args[2] : <RuleList> args[1]
		);

		this._animationName = null;
	}

	getAnimationName(): string
	{
		var prelude = this.getPrelude(),
			first: ComponentValue;

		if (this._animationName === null && prelude)
		{
			first = prelude[0];
			this._animationName = first ? first.getValue() : '';
		}

		return this._animationName;
	}
}


export class AtMedia extends AtRule
{
	private _media: ComponentValueList;


	constructor(atKeyword: Tokenizer.Token, media: ComponentValueList, rules: RuleList);
	constructor(media: string, rules: RuleList);
	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				trailingWhitespace(new Tokenizer.Token(Tokenizer.EToken.AT_KEYWORD, new SourceRange(), '@media')),
			isASTConstructor ?
				<ComponentValueList> args[1] :
				new ComponentValueList(new Parser.Parser(<string> args[0]).parseComponentValueList()),
			isASTConstructor ? <RuleList> args[2] : <RuleList> args[1]
		);

		this._media = null;
	}

	getMedia(): ComponentValueList
	{
		if (this._media === null)
			this._media = this.getPrelude() || new ComponentValueList([]);
		return this._media;
	}
}


export class AtNamespace extends AtRule
{
	private _url: string;
	private _prefix: string;


	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, semicolon: Tokenizer.Token);
	constructor(url: string, prefix?: string);
	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				trailingWhitespace(new Tokenizer.Token(Tokenizer.EToken.AT_KEYWORD, new SourceRange(), '@namespace')),
			isASTConstructor ?
				<ComponentValueList> args[1] :
				new ComponentValueList([
					new ComponentValue(trailingWhitespace(new Tokenizer.Token(
						Tokenizer.EToken.IDENT, new SourceRange(), <string> args[1] || ''
					))),
					new ComponentValue(new Tokenizer.Token(
						Tokenizer.EToken.URL, new SourceRange(), '@url("' + <string> args[0] + '")', <string> args[0])
					)
				]),
			isASTConstructor ?
				<Tokenizer.Token> args[2] :
				new Tokenizer.Token(Tokenizer.EToken.SEMICOLON, new SourceRange(), ';')
		);

		this._url = null;
		this._prefix = null;
	}

	getUrl(): string
	{
		if (this._url === null)
			this.getPrefixAndUrl();
		return this._url;
	}

	getPrefix(): string
	{
		if (this._prefix === null)
			this.getPrefixAndUrl();
		return this._prefix;
	}

	private getPrefixAndUrl(): void
	{
		var prelude = this.getPrelude(),
			len: number,
			i: number,
			first: ComponentValue,
			children: T.INode[],
			child: T.INode,
			isUrl = true,
			t: Tokenizer.Token,
			token: Tokenizer.EToken,
			tokens: Tokenizer.Token[];

		if (prelude)
		{
			len = prelude.getLength();
			first = prelude[0];
			if (len === 1)
			{
				this._prefix = '';
				this._url = first.getValue();
			}
			else if (len > 1)
			{
				// set the prefix
				this._prefix = first.getValue();

				// find the URL

				// check if the rest of the prelude is a single URL
				children = prelude.getChildren();
				len = children.length;

				for (i = 1; i < len; i++)
				{
					child = children[i];

					// not a single URL if a child isn't a ComponentValue
					if (!(child instanceof ComponentValue) || this._url !== null)
					{
						isUrl = false;
						break;
					}

					// check that tokens of the ComponentValue are either URLs or whitespaces
					t = (<ComponentValue> child).getToken();
					token = t.token;
					if (token !== Tokenizer.EToken.URL && token !== Tokenizer.EToken.WHITESPACE)
					{
						isUrl = false;
						break;
					}

					// set the URL if an URL token was encountered
					if (token === Tokenizer.EToken.URL)
						this._url = (<ComponentValue> child).getValue();
				}

				// concat the rest of the prelude if it wasn't a single URL
				if (!isUrl)
				{
					tokens = [];
					for (i = 1; i < len; i++)
						tokens = tokens.concat(children[i].getTokens());

					this._url = toStringNormalize(tokens);
				}
			}
		}
	}
}


export class AtPage extends AtRule
{
	private _pseudoClass: ComponentValueList;


	constructor(atKeyword: Tokenizer.Token, prelude: ComponentValueList, declarations: DeclarationList);
	constructor(pseudoClass: string, declarations: DeclarationList);
	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				trailingWhitespace(new Tokenizer.Token(Tokenizer.EToken.AT_KEYWORD, new SourceRange(), '@page')),
			isASTConstructor ?
				<ComponentValueList> args[1] :
				new ComponentValueList([
					new ComponentValue(new Tokenizer.Token(Tokenizer.EToken.IDENT, new SourceRange(), <string> args[0]))
				]),
			isASTConstructor ? <DeclarationList> args[2] : <DeclarationList> args[1]
		);

		this._pseudoClass = null;
	}

	getPseudoClass(): ComponentValueList
	{
		if (this._pseudoClass === null)
			this._pseudoClass = this.getPrelude() || new ComponentValueList([]);
		return this._pseudoClass;
	}
}


export class AtSupports extends AtRule
{
	private _supports: ComponentValueList;


	constructor(atKeyword: Tokenizer.Token, supports: ComponentValueList, rules: RuleList);
	constructor(supports: string, rules: RuleList);
	constructor(...args: any[])
	{
		var isASTConstructor = args[0] instanceof Tokenizer.Token;

		super(
			isASTConstructor ?
				<Tokenizer.Token> args[0] :
				trailingWhitespace(new Tokenizer.Token(Tokenizer.EToken.AT_KEYWORD, new SourceRange(), '@supports')),
			isASTConstructor ?
				<ComponentValueList> args[1] :
				new ComponentValueList(new Parser.Parser(<string> args[0]).parseComponentValueList()),
			isASTConstructor ? <RuleList> args[2] : <RuleList> args[1]
		);
	}

	getSupports(): ComponentValueList
	{
		if (this._supports === null)
			this._supports = this.getPrelude() || new ComponentValueList([]);
		return this._supports;
	}
}
