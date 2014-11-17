// ==================================================================
// IMPORT MODULES
// ==================================================================

import T = require('./types');
import Tokenizer = require('./tokenizer');
import Parser = require('./parser');
import Utilities = require('./utilities');


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
	prologue = '';
	epilogue = '';

	parent: T.INode = null;

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
		var ret = '';
		for (var i = 0; i < level; i++)
			ret += '\t';

		return ret;
	}

	/**
	 * Returns the AST's root node.
	 */
	get root(): T.INode
	{
		for (var node: T.INode = this; ; )
		{
			var parent = node.parent;

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
		for (var parent = node.parent; parent; parent = parent.parent)
			if (this === parent)
				return true;

		return false;
	}
}


export class ComponentValue extends ASTNode
{
	token: Tokenizer.IToken;

	constructor(token?: Tokenizer.IToken)
	{
		super();

		this.token = token;
		if (token)
			this.range = token.range;
	}

	get value()
	{
		return this.token.src;
	}

	get type()
	{
		return this.token.token;
	}

	toString()
	{
		return this.prologue + this.value + this.epilogue;
	}

	beautify(level: number = 0)
	{
		return this.value;
	}
}


export class BlockComponentValue extends ComponentValue
{
	values: ComponentValue[];

	constructor(values: ComponentValue[])
	{
		super();

		this.values = values;

		var len = this.values.length;
		for (var i = 0; i < len; i++)
			this.values[i].parent = this;
	}

	get children()
	{
		return this.values;
	}

	valuesToString()
	{
		var s = '';
		var len = this.values.length;

		for (var i = 0; i < len; i++)
			s += this.values[i].toString();

		return s;
	}

	toString()
	{
		return this.prologue + this.valuesToString() + this.epilogue;
	}

	beautifyValues(level: number = 0)
	{
		var s = '';
		var len = this.values.length;

		for (var i = 0; i < len; i++)
		{
			if (i > 0)
				s += ' ';

			var value = this.values[i];
			s += value.prologue.trim() + value.beautify(level) + value.epilogue.trim();
		}

		return s;
	}

	beautify(level: number = 0)
	{
		return this.prologue.trim() + this.beautifyValues(level) + this.epilogue.trim();
	}
}


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

export class ComponentValueList extends BlockComponentValue
{
	constructor(values: ComponentValue[])
	{
		super(values);
	}

	get length()
	{
		return this.values.length;
	}

	at(idx: number)
	{
		return this.values[idx];
	}
}


export class FunctionComponentValue extends BlockComponentValue
{
	name: string;

	constructor(name: string, args: ComponentValue[])
	{
		super(args);
		this.name = name;
	}

	get args()
	{
		return this.values;
	}

	toString()
	{
		return this.prologue + this.name + '(' + this.valuesToString() + this.epilogue;
	}

	beautify(level: number = 0)
	{
		return this.name + '(' + super.beautifyValues(level) + ')';
	}
}


export class ImportantComponentValue extends ComponentValue
{
	constructor(token: Tokenizer.IToken)
	{
		super(token);
	}
}


export class AbstractRule extends ASTNode
{
	id: string;
}


export class RuleList extends ASTNode
{
	rules: AbstractRule[] = [];

	constructor(rules: AbstractRule[])
	{
		super();

		this.rules = rules;

		var len = this.rules.length;
		for (var i = 0; i < len; i++)
			this.rules[i].parent = this;
	}

	insertRule(selectors: string, pos?: number): Rule
	{
		var sels = new SelectorList();
		var style = new DeclarationList();
		var rule = new Rule(sels, style);

		rule.parent = this;

		var prevRule: AbstractRule = null;
		var len = this.rules.length;

		if (pos === undefined)
		{
			if (len > 0)
				prevRule = this.rules[len - 1];
			this.rules.push(rule);
		}
		else
		{
			if (pos < 0)
				pos = 0;
			if (pos > len)
				pos = len;

			if (pos > 0)
				prevRule = this.rules[pos - 1];

			this.rules.splice(pos, 0, rule);
		}

		// create the ranges, epilogues and prologues for the child nodes
		var sl = prevRule ? prevRule.range.endLine : this.range.startLine;
		var sc = prevRule ? prevRule.range.endColumn : this.range.startColumn;

		sels.prologue = '\n';
		sels.range = new SourceRange(sl, sc, sl, sc);

		style.prologue = '{\n';
		style.epilogue = '}\n';
		style.range = new SourceRange(sels.range.endLine, sels.range.endColumn, sels.range.endLine + 2, 0);

		rule.range = new SourceRange(sels.range.startLine, sels.range.startColumn, style.range.endLine, style.range.endColumn);

		Utilities.insertRangeFromNode(this.root, rule);

		// add the selectors to the list
		sels.selectorText = selectors;

		return rule;
	}

	get length()
	{
		return this.rules.length;
	}

	at(idx: number)
	{
		return this.rules[idx];
	}

	get children()
	{
		return this.rules;
	}

	toJSON()
	{
		var ret = [];
		var len = this.rules.length;

		for (var i = 0; i < len; i++)
		{
			var r = this.rules[i].toJSON();
			if (r)
				ret.push(r);
		}

		return ret;
	}

	toString()
	{
		var ret = this.prologue;
		var len = this.rules.length;

		for (var i = 0; i < len; i++)
			ret += this.rules[i].toString();

		return ret + this.epilogue;
	}

	beautify(level: number = 0)
	{
		var ret = '';
		var len = this.rules.length;

		for (var i = 0; i < len; i++)
			ret += this.rules[i].beautify(level);

		return ret;
	}
}


export class StyleSheet extends RuleList
{
	constructor(ruleList: RuleList)
	{
		super(ruleList.rules);
	}

	beautify(level: number = 0)
	{
		return super.beautify(level).trim();
	}
}


export class Rule extends AbstractRule
{
	selectors: SelectorList;
	style: DeclarationList;

	constructor(selectors: SelectorList, style: DeclarationList)
	{
		super();

		this.selectors = selectors;
		this.style = style;

		this.selectors.parent = this;
		if (this.style)
			this.style.parent = this;
	}

	get children()
	{
		var children: T.INode[] = [ this.selectors ];
		if (this.style)
			children.push(this.style);
		return children;
	}

	toJSON()
	{
		return {
			selectorList: this.selectors.toJSON(),
			style: this.style && this.style.toJSON()
		};
	}

	toString()
	{
		return this.prologue + this.selectors.toString() + (this.style ? this.style.toString() : '') + this.epilogue;
	}

	beautify(level: number = 0)
	{
		return '\n' + this.selectors.beautify(level) + ' {\n' + (this.style ? this.style.beautify(level) : '') + this.tabs(level) + '}\n';
	}
}


export class SelectorList extends ASTNode
{
	selectors: Selector[] = [];

	constructor(selectors?: Selector[])
	{
		super();

		if (selectors !== undefined)
			this.selectors = selectors;

		var len = this.selectors.length;
		for (var i = 0; i < len; i++)
			this.selectors[i].parent = this;
	}

	get children()
	{
		return this.selectors;
	}

	set selectorText(selectors: string)
	{
		var root = this.root;
		var sl = this.range.startLine;
		var sc = this.range.startColumn;

		// remove the old selectors and zero the range
		this.selectors.splice(0, this.selectors.length);
		Utilities.zeroRange(root, this);

		var astSelectors: Selector[] = new Parser.Parser(selectors).parseSelectorList().selectors;
		var len = astSelectors.length;

		// add the selectors to this selector list
		for (var i = 0; i < len; i++)
		{
			var sel = astSelectors[i];

			sel.parent = this;

			sel.range.startLine += sl;
			sel.range.startColumn += sc;
			sel.range.endLine += sl;
			if (sel.range.startLine === sel.range.endLine)
				sel.range.endColumn += sc;

			this.selectors.push(sel);
		}

		// adjust the ranges
		if (len > 0)
		{
			var lastSel = astSelectors[len - 1];
			this.range.endLine = lastSel.range.endLine;
			this.range.endColumn = lastSel.range.endColumn;
			Utilities.insertRangeFromNode(root, this);
		}
	}

	insertSelector(selector: any, pos?: number): Selector
	{
		var sel: Selector = null;

		if (typeof selector === 'string')
			sel = new Selector(selector);
		else if (selector instanceof Selector)
			sel = selector;
		else
			return null;

		sel.parent = this;

		var root = this.root;
		var len = this.selectors.length;
		var prevSel: Selector = null;
		var nextSel: Selector = null;

		if (pos === undefined)
		{
			if (len > 0)
				prevSel = this.selectors[len - 1];
			this.selectors.push(sel);
		}
		else
		{
			if (pos < 0)
				pos = 0;
			if (pos > len)
				pos = len;

			if (pos > 0)
				prevSel = this.selectors[pos - 1];
			if (pos < len - 1)
				nextSel = this.selectors[pos];

			this.selectors.splice(pos, 0, sel);
		}

		sel.prologue = prevSel ? prevSel.prologue : '';
		sel.epilogue = prevSel ? prevSel.epilogue : (nextSel ? ',' : '');

		// insert a comma
		if (prevSel && !nextSel)
		{
			prevSel.epilogue = ',' + prevSel.epilogue;
			Utilities.insertRangeFromNode(
				root,
				prevSel,
				new SourceRange(prevSel.range.endLine, prevSel.range.endColumn, prevSel.range.endLine, prevSel.range.endColumn + 1)
			);
		}

		var selText = sel.prologue + sel.text + sel.epilogue;
		var startIndices = Utilities.getLineStartIndices(selText);

		sel.range.startLine = prevSel ? prevSel.range.endLine : this.range.startLine;
		sel.range.startColumn = prevSel ? prevSel.range.endColumn : this.range.startColumn;
		sel.range.endLine = sel.range.startLine + startIndices.length;
		sel.range.endColumn = sel.range.startLine === sel.range.endLine ?
		sel.range.startColumn + selText.length :
			Utilities.getColumnNumberFromPosition(selText.length, startIndices);

		Utilities.insertRangeFromNode(root, sel);

		return sel;
	}

	toJSON()
	{
		var sels = [];
		var len = this.selectors.length;

		for (var i = 0; i < len; i++)
			sels.push(this.selectors[i].toJSON());

		return {
			selectors: sels,
			text: this.toString().trim()
		};
	}

	toString()
	{
		var text = this.prologue;
		var len = this.selectors.length;

		for (var i = 0; i < len; i++)
			text += this.selectors[i].toString();

		return text + this.epilogue;
	}

	beautify(level: number = 0)
	{
		var ret = this.tabs(level);
		var len = this.selectors.length;

		for (var i = 0; i < len; i++)
		{
			if (i > 0)
				ret += ', ';
			ret += this.selectors[i].beautify(level);
		}

		return ret;
	}
}


export class Selector extends ComponentValueList
{
	constructor(values: ComponentValue[])
	{
		super(values);
	}

	get text()
	{
		return this.beautify();
	}

	set text(newText: string)
	{
		if (this.text === newText)
			return;

		var selector = new Parser.Parser(newText).parseSelector();
		Utilities.offsetRange(selector, this.range.startLine, this.range.startColumn);

		Utilities.updateNodeRange(this.root, this, selector.range);
		this.values = selector.values;
	}

	toJSON()
	{
		return {
			value: this.text,
			range: this.range
		};
	}
}


export class DeclarationList extends ASTNode
{
	declarations: Declaration[] = [];

	constructor(declarations?: Declaration[])
	{
		super();

		if (declarations !== undefined)
			this.declarations = declarations;

		var len = this.declarations.length;
		for (var i = 0; i < len; i++)
			this.declarations[i].parent = this;
	}

	get length()
	{
		return this.declarations.length;
	}

	at(idx: number)
	{
		return this.declarations[idx];
	}

	get children()
	{
		return this.declarations;
	}

	insertDeclaration(declaration: Declaration, pos?: number): Declaration
	{
		declaration.parent = this;

		var len = this.declarations.length;
		var prevProp: Declaration = null;
		var nextProp: Declaration = null;

		if (pos === undefined)
		{
			if (len > 0)
				prevProp = this.declarations[len - 1];
			this.declarations.push(declaration);
		}
		else
		{
			if (pos < 0)
				pos = 0;
			if (pos > len)
				pos = len;

			if (pos > 0)
				prevProp = this.declarations[pos - 1];
			if (pos < len - 1)
				nextProp = this.declarations[pos];

			this.declarations.splice(pos, 0, declaration);
		}

		declaration.prologue = prevProp ? prevProp.prologue : (nextProp ? nextProp.prologue : '');
		declaration.epilogue = prevProp ? prevProp.epilogue : (nextProp ? nextProp.epilogue : ';');

		var propText = declaration.prologue + declaration.name + ':' + declaration.value.toString() + declaration.epilogue;
		var startIndices = Utilities.getLineStartIndices(propText);

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
		var props = [];
		var len = this.declarations.length;

		for (var i = 0; i < len; i++)
			props.push(this.declarations[i].toJSON());

		return {
			cssProperties: props,
			cssText: this.toString().trim(),
			range: this.range
		};
	}

	toString()
	{
		return this.prologue + this.propertiesToString() + this.epilogue;
	}

	propertiesToString(): string
	{
		var ret = '';
		var len = this.declarations.length;

		for (var i = 0; i < len; i++)
			ret += this.declarations[i].toString();

		return ret;
	}

	beautify(level: number = 0)
	{
		var ret = '';
		var len = this.declarations.length;

		for (var i = 0; i < len; i++)
			ret += this.declarations[i].beautify(level + 1) + '\n';

		return ret;
	}
}


export class Declaration extends ASTNode
{
	value: DeclarationValue;
	private _name: string;

	// the prologue/epilogue will contain comment strings
	private _disabled: boolean;


	constructor(name: string, value: DeclarationValue, disabled?: boolean)
	{
		super();

		this._name = name ? name.toLowerCase() : name;
		this.value = value;
		this._disabled = !!disabled;
	}

	get name()
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

	get disabled(): boolean
	{
		return this._disabled;
	}

	set disabled(isDisabled: boolean)
	{
		if (this._disabled === isDisabled)
			return;

		this._disabled = isDisabled;

		var oldPrologue = this.prologue;
		var oldEpilogue = this.epilogue;

		if (isDisabled)
		{
			this.prologue = this.prologue + '/* ';
			this.epilogue = this.epilogue + ' */';
		}
		else
		{
			this.prologue.replace(/\/\*\s*$/, '');
			this.epilogue.replace(/\s*\*\/$/, '');
		}

		Utilities.updateNodeRange(this.root, this, Utilities.getRangeDifference(oldPrologue, this.prologue, this.range));
		Utilities.updateNodeRange(this.root, this, Utilities.getRangeDifference(oldEpilogue, this.epilogue, this.range));
	}

	get text(): string
	{
		return this.toString().trim();
	}

	set text(newText: string)
	{
		var declaration: Declaration = new Parser.Parser(newText).parseDeclaration();

		this._name = declaration.name;
		this.value = declaration.value;
		this._disabled = declaration.disabled;

		this.prologue = declaration.prologue;
		this.epilogue = declaration.epilogue;

		var oldStartLine = this.range.startLine;
		var oldStartColumn = this.range.startColumn;

		var root = this.root;

		Utilities.zeroRange(root, this);

		this.range.startLine = oldStartLine + declaration.range.startLine;
		this.range.startColumn = oldStartColumn + declaration.range.startColumn - 2;
		this.range.endLine = oldStartLine + declaration.range.endLine;
		this.range.endColumn = declaration.range.startLine === declaration.range.endLine ?
		oldStartColumn + declaration.range.endColumn - 2 :
			declaration.range.endColumn;

		Utilities.insertRangeFromNode(root, this);
	}

	toJSON()
	{
		return {
			name: this._name,
			value: this.value.value,
			important: this.value.important,
			disabled: this._disabled,
			text: this.toString().trim(),
			range: this.range
		};
	}

	toString()
	{
		return this.prologue + this._name + ':' + this.value.toString() + this.epilogue;
	}

	beautify(level: number = 0)
	{
		return this.tabs(level) +
			(this._disabled ? '/* ' : '') +
			this._name + ': ' + this.value.beautify(level) +
			(this._disabled ? '; */' : ';');
	}
}


export class DeclarationValue extends BlockComponentValue
{
	constructor(values: ComponentValueList)
	{
		super(values.values);

		this.range = values.range;
		this.prologue = values.prologue;
		this.epilogue = values.epilogue;
	}

	get value(): string
	{
		return this.beautify();
	}

	set value(value: string)
	{
		if (this.beautify() === value)
			return;

		var declarationValue = new Parser.Parser(value).parseDeclarationValue();
		Utilities.offsetRange(declarationValue, this.range.startLine, this.range.startColumn);

		Utilities.updateNodeRange(this.root, this, declarationValue.range);
		this.values = declarationValue.values;
	}

	get pureValue()
	{
		return this.toString(true);
	}

	get important()
	{
		return this.values[this.values.length - 1] instanceof ImportantComponentValue;
	}

	toString(excludeImportant?: boolean)
	{
		var s = '';
		var len = this.values.length;

		for (var i = 0; i < len; i++)
		{
			var value = this.values[i];
			if (!(excludeImportant && (value instanceof ImportantComponentValue)))
				s += value.toString();
		}

		return this.prologue + s + this.epilogue;
	}
}


export class AtRule extends AbstractRule
{
	atKeyword: string;
	prelude: ComponentValueList;
	private _block: ASTNode;

	constructor(atKeyword: string, prelude?: ComponentValueList, block?: any)
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

	get children()
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

	toString()
	{
		return this.prologue + this.atKeyword +
			(this.prelude ? this.prelude.toString() : '') +
			(this._block ? this._block.toString() : '') +
			this.epilogue;
	}

	beautify(level: number = 0)
	{
		if (this._block instanceof DeclarationList)
		{
			return this.tabs(level) + this.atKeyword.toLowerCase() +
				(this.prelude ? ' ' + this.prelude.beautify(level) : '') + '\n' +
				this.declarations.beautify(level);
		}

		if (this._block)
		{
			return '\n' + this.tabs(level) + this.atKeyword.toLowerCase() +
				(this.prelude ? ' ' + this.prelude.beautify(level) : '') + ' {' +
				this.rules.beautify(level + 1) +
				this.tabs(level) + '}';
		}

		return this.tabs(level) + this.atKeyword.toLowerCase() +
			(this.prelude ? ' ' + this.prelude.beautify(level) : '') + ';\n';
	}
}

export class AtCharset extends AtRule
{
	charset: string;

	constructor(atKeyword: string, prelude: ComponentValueList)
	{
		super(atKeyword, prelude);

		var first = prelude.at(0);
		this.charset = first ? first.value : '';
	}
}


export class AtCustomMedia extends AtRule
{
	extensionName: string;
	mediaList: ComponentValueList;

	constructor(atKeyword: string, prelude: ComponentValueList)
	{
		super(atKeyword, prelude);

		var first = prelude.at(0);
		this.extensionName = first ? first.value : '';

		this.mediaList = createComponentValueList(prelude.values.slice(1), this);
	}
}


export class AtDocument extends AtRule
{
	url: string;
	urlPrefix: string;
	domain: string;
	regexp: string;

	rules: RuleList;

	constructor(atKeyword: string, prelude: ComponentValueList, block: any)
	{
		super(atKeyword, prelude, block);

		var getArg = function(fnx: T.INode)
		{
			var args = (<FunctionComponentValue> fnx).args;
			return args.length > 0 ? args[0].toString() : '';
		};

		var len = prelude.length;
		for (var i = 0; i < len; i++)
		{
			var val = prelude.at(i);
			if (val instanceof FunctionComponentValue)
			{
				var name = (<FunctionComponentValue> val).name.toLowerCase();

				if (name === 'url')
					this.url = getArg(val);
				else if (name === 'url-prefix')
					this.urlPrefix = getArg(val);
				else if (name === 'domain')
					this.domain = getArg(val);
				else if (name === 'regexp')
					this.regexp = getArg(val);
			}
		}
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
	constructor(atKeyword: string, prelude: ComponentValueList, declarations: DeclarationList)
	{
		super(atKeyword, prelude, declarations);
	}
}


export class AtHost extends AtRule
{
	constructor(atKeyword: string, prelude: ComponentValueList, rules: RuleList)
	{
		super(atKeyword, prelude, rules);
	}
}


export class AtImport extends AtRule
{
	url: string;
	media: ComponentValueList;

	constructor(atKeyword: string, prelude: ComponentValueList)
	{
		super(atKeyword, prelude);

		var first = prelude.at(0);
		this.url = first ? (first.token.value || first.value) : '';

		this.media = createComponentValueList(prelude.values.slice(1), this);
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
	animationName: string;

	constructor(atKeyword: string, prelude: ComponentValueList, rules: RuleList)
	{
		super(atKeyword, prelude, rules);

		var first = prelude.at(0);
		this.animationName = first ? first.value : '';
	}
}


export class AtMedia extends AtRule
{
	constructor(atKeyword: string, media: ComponentValueList, rules: RuleList)
	{
		super(atKeyword, media, rules);
	}
}


export class AtNamespace extends AtRule
{
	url: string;
	prefix: string;

	constructor(atKeyword: string, prelude: ComponentValueList)
	{
		super(atKeyword, prelude);

		this.url = '';
		this.prefix = '';

		if (prelude.length === 1)
			this.url = prelude.at(0).token.value || prelude.at(0).value;
		else if (prelude.length > 1)
		{
			this.prefix = prelude.at(0).value;
			this.url = prelude.at(1).token.value || prelude.at(1).value;
		}
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
	constructor(atKeyword: string, prelude: ComponentValueList, declarations: DeclarationList)
	{
		super(atKeyword, prelude, declarations);
	}
}


export class AtSupports extends AtRule
{
	constructor(atKeyword: string, supports: ComponentValueList, rules: RuleList)
	{
		super(atKeyword, supports, rules);
	}
}
