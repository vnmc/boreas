// ==================================================================
// IMPORT MODULES
// ==================================================================

import T = require('./types');
import AST = require('./ast');
import Tokenizer = require('./tokenizer');


// ==================================================================
// TYPE DECLARATIONS
// ==================================================================

interface IAtRuleSpec
{
	keyword: string;
	astClass: new(atKeyword: string, prelude?: AST.ComponentValueList, block?: any) => AST.AtRule;
	type: EAtRule;
}

interface IASTStackEntry
{
	startToken: Tokenizer.IToken;
	endToken: Tokenizer.IToken;
	uncoreTokens: Tokenizer.EToken[];
	prologue: string;
	epilogue: string;
	isInPrologue: boolean;
}

interface IParseError
{
	expected: Tokenizer.EToken[];
	data: IASTStackEntry;
}

enum EAtRule
{
	SIMPLE,
	RULE_LIST,
	DECLARATION_LIST
}

// ==================================================================
// PARSER IMPLEMENTATION
// ==================================================================

export var atRules: IAtRuleSpec[] = <IAtRuleSpec[]> [
	{ keyword: 'charset', astClass: AST.AtCharset, type: EAtRule.SIMPLE },
	{ keyword: 'custommedia', astClass: AST.AtCustomMedia, type: EAtRule.SIMPLE },
	{ keyword: 'document', astClass: AST.AtDocument, type: EAtRule.RULE_LIST },
	{ keyword: 'fontface', astClass: AST.AtFontFace, type: EAtRule.DECLARATION_LIST },
	{ keyword: 'host', astClass: AST.AtHost, type: EAtRule.RULE_LIST },
	{ keyword: 'import', astClass: AST.AtImport, type: EAtRule.SIMPLE },
	{ keyword: 'keyframes', astClass: AST.AtKeyframes, type: EAtRule.RULE_LIST },
	{ keyword: 'media', astClass: AST.AtMedia, type: EAtRule.RULE_LIST },
	{ keyword: 'namespace', astClass: AST.AtNamespace, type: EAtRule.SIMPLE },
	{ keyword: 'page', astClass: AST.AtPage, type: EAtRule.DECLARATION_LIST },
	{ keyword: 'supports', astClass: AST.AtSupports, type: EAtRule.RULE_LIST }
];


export class Parser
{
	private _tokenizer: Tokenizer.Tokenizer;
	private _currentToken: Tokenizer.IToken = null;
	private _previousToken: Tokenizer.IToken = null;
	private _astStack: IASTStackEntry[] = [];
	private _discardedEntry: IASTStackEntry = null;


	constructor(src: string)
	{
		this._tokenizer = new Tokenizer.Tokenizer(src || '');
		this.nextToken();
	}

	/**
	 *
	 * @returns {AST.StyleSheet}
	 */
	parseStyleSheet(): AST.StyleSheet
	{
		this.startEntity();
		return <AST.StyleSheet> this.endEntity(new AST.StyleSheet(this.parseRuleList(false, true)));
	}

	/**
	 *
	 * @returns {AST.RuleList}
	 */
	parseRuleBlock(): AST.RuleList
	{
		return this.parseRuleList(true);
	}

	/**
	 *
	 * @param isBlock
	 * @param isTopLevel
	 * @returns {AST.RuleList}
	 */
	parseRuleList(isBlock?: boolean, isTopLevel?: boolean): AST.RuleList
	{
		if (isBlock)
		{
			this.startEntity(Tokenizer.EToken.LBRACE, Tokenizer.EToken.RBRACE);
			this.expect(Tokenizer.EToken.LBRACE);
			this.nextToken();   // consume '{'
		}
		else
			this.startEntity();

		var rules: AST.AbstractRule[] = [];

		// Repeatedly consume the next input token:
		for ( ; ; )
		{
			var token = this._currentToken.token;

			if (token === Tokenizer.EToken.EOF)
				break;
			else if (isBlock && token === Tokenizer.EToken.RBRACE)
			{
				this.nextToken();
				break;
			}
			else if (token === Tokenizer.EToken.CDO || token === Tokenizer.EToken.CDC)
			{
				// If the top-level flag is set, do nothing.
				// Otherwise, reconsume the current input token. Consume a qualified rule.
				// If anything is returned, append it to the list of rules.

				if (isTopLevel)
					this.nextToken();
				else
				{
					try
					{
						rules.push(this.parseQualifiedRule());
					}
					catch (e)
					{
						this.cleanup(e, Tokenizer.EToken.IDENT, Tokenizer.EToken.AT_KEYWORD);
					}
				}
			}
			else if (token === Tokenizer.EToken.AT_KEYWORD)
			{
				// Reconsume the current input token. Consume an at-rule.
				// If anything is returned, append it to the list of rules.
				try
				{
					rules.push(this.parseAtRule());
				}
				catch (e)
				{
					this.cleanup(e, Tokenizer.EToken.IDENT, Tokenizer.EToken.AT_KEYWORD);
				}
			}
			else
			{
				// Reconsume the current input token. Consume a qualified rule.
				// If anything is returned, append it to the list of rules.
				try
				{
					rules.push(this.parseQualifiedRule());
				}
				catch (e)
				{
					this.cleanup(e, Tokenizer.EToken.IDENT, Tokenizer.EToken.AT_KEYWORD);
				}
			}
		}

		// normalize the rule list
		var len = rules.length;
		if (len > 1)
		{
			var lastRule = rules[len - 1];
			if ((lastRule instanceof AST.Rule) && (<AST.Rule> lastRule).style === null)
			{
				rules.pop();
				var rule = rules[len - 2];

				rule.epilogue += lastRule.toString();
				rule.range.endLine = lastRule.range.endLine;
				rule.range.endColumn = lastRule.range.endColumn;
			}
		}

		return this.endEntity(new AST.RuleList(rules));
	}

	/**
	 *
	 * @returns {AST.Rule}
	 */
	parseQualifiedRule(): AST.Rule
	{
		this.startEntity(); // start the rule
		this.consumeWhitespace();

		this.startEntity(); // start the selector list

		var selectors = [];
		var selectorList: AST.SelectorList = null;
		var declarationList: AST.DeclarationList = null;

		// Repeatedly consume the next input token:
		for ( ; ; )
		{
			var token = this._currentToken.token;

			if (token === Tokenizer.EToken.EOF)
			{
				// This is a parse error. Return nothing.
				selectorList = this.endEntity(new AST.SelectorList(selectors));
				break;
			}

			if (token === Tokenizer.EToken.LBRACE)
			{
				// Consume a simple block and assign it to the qualified rule’s block.
				// Return the qualified rule.
				selectorList = this.endEntity(new AST.SelectorList(selectors));
				declarationList = this.parseDeclarationList();
				break;
			}

			// anything else:
			// Reconsume the current input token. Consume a component value.
			// Append the returned value to the qualified rule’s prelude.
			selectors.push(this.parseSelector());
		}

		return this.endEntity(new AST.Rule(selectorList, declarationList));
	}

	/**
	 *
	 * @returns {AST.AtRule}
	 */
	parseAtRule(): AST.AtRule
	{
		var atKeyword = this._currentToken;
		var spec = this.getAtRuleSpec(atKeyword);

		var uncoreTokens: Tokenizer.EToken[] = undefined;
		if (spec && spec.type === EAtRule.SIMPLE)
			uncoreTokens = [ Tokenizer.EToken.SEMICOLON ];

		this.startEntity.apply(this, uncoreTokens);
		this.nextToken();   // consume the @<rule> token

		var prelude = this.parseComponentValueList();

		var block: AST.ASTNode = undefined;
		if (spec)
		{
			if (spec.type === EAtRule.DECLARATION_LIST)
				block = this.parseDeclarationList();
			else if (spec.type === EAtRule.RULE_LIST)
				block = this.parseRuleBlock();

			return this.endEntity(new spec.astClass(atKeyword.src, prelude, block));
		}

		// not a registered at-rule: create a generic at-rule object
		// Repeatedly consume the next input token:
		for ( ; ; )
		{
			var t = this._currentToken;
			var token = t.token;

			if (token === Tokenizer.EToken.EOF)
				break;
			else if (token === Tokenizer.EToken.SEMICOLON)
			{
				this.nextToken();
				break;
			}
			else if (token === Tokenizer.EToken.LBRACE)
			{
				// Consume a simple block and assign it to the at-rule’s block. Return the at-rule.
				block = this.parseBlock();
				break;
			}
		}

		return this.endEntity(new AST.AtRule(atKeyword.src, prelude, block));
	}

	/**
	 *
	 * @returns {AST.DeclarationList}
	 */
	parseDeclarationList(): AST.DeclarationList
	{
		this.startEntity(Tokenizer.EToken.LBRACE, Tokenizer.EToken.RBRACE);

		this.expect(Tokenizer.EToken.LBRACE);
		this.nextToken();   // consume '{'

		var declarations: AST.Declaration[] = [];

		// Repeatedly consume the next input token and process it as follows:
		for ( ; ; )
		{
			var token = this._currentToken.token;

			if (token === Tokenizer.EToken.EOF)
				break;
			else if (token === Tokenizer.EToken.RBRACE)
			{
				this.nextToken();
				break;
			}

			// Reconsume the current input token.
			// Consume a component value and append it to the value of the block.
			try
			{
				declarations.push(this.parseDeclaration());
			}
			catch (e)
			{
				this.cleanup(e, Tokenizer.EToken.RBRACE);
				break;
			}
		}

		return this.endEntity(new AST.DeclarationList(declarations));
	}

	/**
	 *
	 * @returns {AST.Declaration}
	 */
	parseDeclaration(): AST.Declaration
	{
		this.startEntity();
		this.consumeWhitespace();

		this.expect(Tokenizer.EToken.IDENT);
		var name = this._currentToken;

		this.nextToken();
		this.consumeWhitespace();

		// If the current input token is anything other than a <colon-token>,
		// this is a parse error. Return nothing.
		// Otherwise, consume the next input token.
		this.expect(Tokenizer.EToken.COLON);
		this.nextToken();

		return this.endEntity(new AST.Declaration(name.src, this.parseDeclarationValue()));
	}

	/**
	 *
	 * @returns {AST.DeclarationValue}
	 */
	parseDeclarationValue(): AST.DeclarationValue
	{
		this.startEntity(Tokenizer.EToken.SEMICOLON);

		var value = this.parseComponentValueList();
		if (this._currentToken.token === Tokenizer.EToken.SEMICOLON)
			this.nextToken();

		return this.endEntity(new AST.DeclarationValue(value));
	}

	/**
	 *
	 * @returns {AST.SelectorList}
	 */
	parseSelectorList(): AST.SelectorList
	{
		this.startEntity();
		var selectors: AST.Selector[] = [];

		for ( ; ; )
		{
			var t = this._currentToken;
			var token = t.token;

			if (token === Tokenizer.EToken.EOF || token === Tokenizer.EToken.LBRACE)
				break;
			else
				selectors.push(this.parseSelector());
		}

		return this.endEntity(new AST.SelectorList(selectors));
	}

	/**
	 *
	 * @returns {AST.Selector}
	 */
	parseSelector(): AST.Selector
	{
		var values = [];

		this.startEntity(Tokenizer.EToken.COMMA);

		// start first selector component
		this.startEntity();

		for (var t = this._currentToken; ; )
		{
			var token = t.token;

			if (token === Tokenizer.EToken.EOF || token === Tokenizer.EToken.LBRACE)
			{
				// end last selector component
				this.discardEntity();
				break;
			}
			else if (token === Tokenizer.EToken.COMMA)
			{
				// end last selector component
				this.discardEntity();
				this.nextToken();
				break;
			}
			else if (token !== Tokenizer.EToken.WHITESPACE && token !== Tokenizer.EToken.COMMENT)
			{
				var v = t;
				t = this.nextToken();
				values.push(this.endEntity(new AST.ComponentValue(v)));
				this.startEntity();
			}
			else
				t = this.nextToken();
		}

		return <AST.Selector> this.endEntity(new AST.Selector(values));
	}

	/**
	 *
	 * @returns {AST.ComponentValueList}
	 */
	parseComponentValueList(): AST.ComponentValueList
	{
		var values = [];

		// start the list entity
		this.startEntity();

		// start the first component
		this.startEntity();

		for (var t = this._currentToken; ; )
		{
			var token = t.token;

			if (token === Tokenizer.EToken.EOF || token === Tokenizer.EToken.SEMICOLON || token === Tokenizer.EToken.LBRACE)
			{
				// end the last component
				this.discardEntity();
				break;
			}
			else if (token === Tokenizer.EToken.LPAREN || token === Tokenizer.EToken.LBRACKET)
			{
				this.discardEntity();
				values.push(this.parseBlock());
				this.startEntity();
				t = this._currentToken;
			}
			else if (token === Tokenizer.EToken.FUNCTION)
			{
				this.discardEntity();
				values.push(this.parseFunction());
				this.startEntity();
				t = this._currentToken;
			}
			else if (token !== Tokenizer.EToken.WHITESPACE && token !== Tokenizer.EToken.COMMENT)
			{
				var v = t;
				t = this.nextToken();
				values.push(this.endEntity(new AST.ComponentValue(v)));
				this.startEntity();
			}
			else
				t = this.nextToken();
		}

		return this.endEntity(new AST.ComponentValueList(values));
	}

	/**
	 *
	 * @returns {AST.BlockComponentValue}
	 */
	parseBlock(): AST.BlockComponentValue
	{
		var token = this._currentToken.token;
		var endingToken = undefined;

		if (token === Tokenizer.EToken.LBRACE)
			endingToken = Tokenizer.EToken.RBRACE;
		else if (token === Tokenizer.EToken.LBRACKET)
			endingToken = Tokenizer.EToken.RBRACKET;
		else if (token === Tokenizer.EToken.LPAREN)
			endingToken = Tokenizer.EToken.RPAREN;

		// start the block component
		this.startEntity(token, endingToken);
		this.expect(Tokenizer.EToken.LBRACE, Tokenizer.EToken.LBRACKET, Tokenizer.EToken.LPAREN);
		this.nextToken();   // consume the block starting token

		// start the first component value
		this.startEntity();

		var values = [];
		for (var t = this.nextToken(); ; )
		{
			token = t.token;

			if (token === Tokenizer.EToken.EOF)
			{
				// end the last component
				this.discardEntity();
				break;
			}
			else if (token === endingToken)
			{
				// end the last component
				this.discardEntity();

				// end of block
				this.nextToken();
				break;
			}
			else if (token === Tokenizer.EToken.LPAREN || token === Tokenizer.EToken.LBRACKET || token === Tokenizer.EToken.LBRACE)
			{
				this.discardEntity();
				values.push(this.parseBlock());
				this.startEntity();
				t = this._currentToken;
			}
			else if (token === Tokenizer.EToken.FUNCTION)
			{
				this.discardEntity();
				values.push(this.parseFunction());
				this.startEntity();
				t = this._currentToken;
			}
			else if (token !== Tokenizer.EToken.WHITESPACE && token !== Tokenizer.EToken.COMMENT)
			{
				var v = t;
				t = this.nextToken();
				values.push(this.endEntity(new AST.ComponentValue(v)));
				this.startEntity();
			}
			else
				t = this.nextToken();
		}

		return this.endEntity(new AST.BlockComponentValue(values));
	}

	/**
	 *
	 * @returns {AST.FunctionComponentValue}
	 */
	parseFunction(): AST.FunctionComponentValue
	{
		// start the function
		this.startEntity(Tokenizer.EToken.RPAREN);
		this.expect(Tokenizer.EToken.FUNCTION);

		var name = this._currentToken;
		this.nextToken();   // consume the function token

		// start the first argument
		this.startEntity(Tokenizer.EToken.COMMA);

		var args = [];
		for (var t = this._currentToken; ; )
		{
			var token = t.token;

			if (token === Tokenizer.EToken.EOF)
			{
				// end the last argument
				this.discardEntity();
				break;
			}
			else if (token === Tokenizer.EToken.RPAREN)
			{
				// end the last argument
				this.discardEntity();
				this.nextToken();
				break;
			}
			else if (token === Tokenizer.EToken.LPAREN)
			{
				this.discardEntity();
				args.push(this.parseBlock());
				this.startEntity(Tokenizer.EToken.COMMA);
				t = this._currentToken;
			}
			else if (token === Tokenizer.EToken.FUNCTION)
			{
				this.discardEntity();
				args.push(this.parseFunction());
				this.startEntity(Tokenizer.EToken.COMMA);
				t = this._currentToken;
			}
			else if (token !== Tokenizer.EToken.WHITESPACE && token !== Tokenizer.EToken.COMMENT && token !== Tokenizer.EToken.COMMA)
			{
				var v = t;
				t = this.nextToken();
				args.push(this.endEntity(new AST.ComponentValue(v)));
				this.startEntity(Tokenizer.EToken.COMMA);
			}
			else
				t = this.nextToken();
		}

		return this.endEntity(new AST.FunctionComponentValue(name.value, args));
	}

	/**
	 *
	 * @returns {IToken}
	 */
	private nextToken(): Tokenizer.IToken
	{
		var t = this._currentToken;

		var len = this._astStack.length;
		if (len > 0)
		{
			var token = t.token;

			var data = this._astStack[len - 1];
			data.endToken = t;

			if (token !== Tokenizer.EToken.WHITESPACE && token !== Tokenizer.EToken.COMMENT &&
				(data.uncoreTokens === undefined || data.uncoreTokens.indexOf(token) < 0))
			{
				data.isInPrologue = false;
				data.epilogue = '';
			}
			else if (!data.isInPrologue)
				data.epilogue += t.src;

			if (data.isInPrologue)
				data.prologue += t.src;
		}

		this._previousToken = t;
		return (this._currentToken = this._tokenizer.nextToken());
	}

	/**
	 *
	 * @param uncoreTokens
	 */
	private startEntity(...uncoreTokens: Tokenizer.EToken[])
	{
		// once a new entity is pushed to the stack, handle the current entity's prologue/epilogue
		var len = this._astStack.length;
		if (len > 0)
		{
			var data = this._astStack[len - 1];
			data.endToken = undefined;
			data.epilogue = '';
			data.isInPrologue = false;
		}

		// add the meta-data for the new entity
		this._astStack.push({
			startToken: this._discardedEntry ? this._discardedEntry.startToken : this._currentToken,
			endToken: undefined,
			uncoreTokens: uncoreTokens,
			prologue: this._discardedEntry ? this._discardedEntry.prologue : '',
			epilogue: '',
			isInPrologue: true
		});

		this._discardedEntry = null;
	}

	/**
	 *
	 * @param node
	 * @returns {*}
	 */
	private endEntity<T extends T.INode>(node: T): T
	{
		var data = this._astStack.pop();
		if (!node)
		{
			/*
			 // the entity is discarded; append the prologue of this one to the epilogue
			 // of the entity one level below
			 var len = this._astStack.length;
			 if (len > 0)
			 this._astStack[len - 1].epilogue += data.prologue;
			 */

			return null;
		}

		if (data.startToken)
		{
			node.range.startLine = data.startToken.range.startLine;
			node.range.startColumn = data.startToken.range.startColumn;
		}

		if (data.endToken)
		{
			node.range.endLine = data.endToken.range.endLine;
			node.range.endColumn = data.endToken.range.endColumn;
		}
		else if (this._previousToken)
		{
			node.range.endLine = this._previousToken.range.endLine;
			node.range.endColumn = this._previousToken.range.endColumn;
		}

		(<T.INode> node).prologue = data.prologue;
		(<T.INode> node).epilogue = (this._discardedEntry ? this._discardedEntry.prologue : '') + data.epilogue;

		this._discardedEntry = null;

		return node;
	}

	private discardEntity()
	{
		this._discardedEntry = this._astStack.pop();
	}

	/**
	 *
	 * @param tokens
	 */
	private expect(...tokens: Tokenizer.EToken[])
	{
		if (tokens.indexOf(this._currentToken.token) < 0)
		{
			var data = this._astStack[this._astStack.length - 1];
			this.discardEntity();
			throw { expected: tokens, data: data };
		}
	}

	/**
	 * Cleans up the token stream by consuming all the tokens until "endToken" is found.
	 * Adds all the tokens encountered until then to the epilogue of the current entity.
	 *
	 * @param e
	 * @param endTokens
	 */
	private cleanup(e: IParseError, ...endTokens: Tokenizer.EToken[])
	{
		var epilogue = e.data ? e.data.prologue : '';

		for (var t = this._currentToken; ; )
		{
			var token = t.token;

			if (token === Tokenizer.EToken.EOF)
				break;

			epilogue += t.src;
			t = this.nextToken();

			if (endTokens.indexOf(token) >= 0)
				break;
		}

		var len = this._astStack.length;
		if (len > 0)
			this._astStack[len - 1].epilogue = epilogue;

		this._discardedEntry = null;
	}

	/**
	 *
	 */
	private consumeWhitespace()
	{
		while (this._currentToken.token === Tokenizer.EToken.WHITESPACE || this._currentToken.token === Tokenizer.EToken.COMMENT)
			this.nextToken();
	}

	/**
	 *
	 * @param atKeyword
	 * @returns {*}
	 */
	private getAtRuleSpec(atKeyword: Tokenizer.IToken): IAtRuleSpec
	{
		var value = atKeyword.value;
		var isPrefixed = value[0] === '-';
		var len = atRules.length;

		for (var i = 0; i < len; i++)
		{
			var spec = atRules[i];
			var keyword = spec.keyword;

			if (spec.keyword === value)
				return spec;

			// vendor-prexifed?
			if (isPrefixed && value.substr(-keyword.length - 1) === '-' + keyword)
				return spec;
		}

		return null;
	}
}
