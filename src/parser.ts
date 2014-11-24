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
	astClass: new(atKeyword: Tokenizer.Token, prelude?: AST.ComponentValueList, block?: any) => AST.AtRule;
	type: EAtRule;
}

interface IASTStackEntry
{
	startToken: Tokenizer.Token;
	endToken: Tokenizer.Token;
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
	private _currentToken: Tokenizer.Token = null;
	private _previousToken: Tokenizer.Token = null;
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
		var rules: AST.AbstractRule[] = [],
			rule: AST.Rule,
			lbrace: Tokenizer.Token,
			rbrace: Tokenizer.Token,
			token: Tokenizer.EToken;

		if (isBlock)
		{
			this.startEntity();
			this.expect(Tokenizer.EToken.LBRACE);
			lbrace = this._currentToken;
			this.nextToken();   // consume '{'
		}
		else
			this.startEntity();

		// Repeatedly consume the next input token:
		for ( ; ; )
		{
			token = this._currentToken.token;

			if (token === Tokenizer.EToken.EOF)
				break;
			else if (isBlock && token === Tokenizer.EToken.RBRACE)
			{
				rbrace = this._currentToken;
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
						rule = new AST.Rule();
						rule.errorTokens = this.cleanup(e, Tokenizer.EToken.IDENT, Tokenizer.EToken.AT_KEYWORD);
						rules.push(rule);
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
					rule = new AST.Rule();
					rule.errorTokens = this.cleanup(e, Tokenizer.EToken.IDENT, Tokenizer.EToken.AT_KEYWORD);
					rules.push(rule);
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
					rule = new AST.Rule();
					rule.errorTokens = this.cleanup(e, Tokenizer.EToken.IDENT, Tokenizer.EToken.AT_KEYWORD);
					rules.push(rule);
				}
			}
		}

		return this.endEntity(new AST.RuleList(rules, lbrace, rbrace));
	}

	/**
	 *
	 * @returns {AST.Rule}
	 */
	parseQualifiedRule(): AST.Rule
	{
		var selectors = [],
			selectorList: AST.SelectorList = null,
			declarationList: AST.DeclarationList = null,
			token: Tokenizer.EToken;

		this.startEntity(); // start the rule
		this.startEntity(); // start the selector list

		// Repeatedly consume the next input token:
		for ( ; ; )
		{
			token = this._currentToken.token;

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
		var atKeyword = this._currentToken,
			spec = this.getAtRuleSpec(atKeyword),
			prelude: AST.ComponentValue[],
			block: AST.ASTNode,
			t: Tokenizer.Token,
			token: Tokenizer.EToken;

		// consume the @<rule> token
		this.startEntity();
		this.nextToken();

		prelude = this.parseComponentValueList(Tokenizer.EToken.SEMICOLON, Tokenizer.EToken.LBRACE);

		if (spec)
		{
			if (spec.type === EAtRule.DECLARATION_LIST)
				block = this.parseDeclarationList();
			else if (spec.type === EAtRule.RULE_LIST)
				block = this.parseRuleBlock();

			return this.endEntity(new spec.astClass(atKeyword, new AST.ComponentValueList(prelude), block));
		}

		// not a registered at-rule: create a generic at-rule object
		// Repeatedly consume the next input token:
		for ( ; ; )
		{
			t = this._currentToken;
			token = t.token;

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

		return this.endEntity(new AST.AtRule(atKeyword, new AST.ComponentValueList(prelude), block));
	}

	/**
	 *
	 * @returns {AST.DeclarationList}
	 */
	parseDeclarationList(): AST.DeclarationList
	{
		var lbrace: Tokenizer.Token,
			rbrace: Tokenizer.Token,
			token: Tokenizer.EToken,
			declaration: AST.Declaration,
			declarations: AST.Declaration[] = [];

		this.startEntity();

		// consume '{'
		this.expect(Tokenizer.EToken.LBRACE);
		lbrace = this._currentToken;
		this.nextToken();

		// Repeatedly consume the next input token and process it as follows:
		for ( ; ; )
		{
			token = this._currentToken.token;

			if (token === Tokenizer.EToken.EOF)
				break;
			else if (token === Tokenizer.EToken.RBRACE)
			{
				rbrace = this._currentToken;
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
				declaration = new AST.Declaration(null, null, null, null);
				declaration.errorTokens = this.cleanup(e, Tokenizer.EToken.RBRACE);
				declarations.push(declaration);
				// XX break;
			}
		}

		return this.endEntity(new AST.DeclarationList(declarations, lbrace, rbrace));
	}

	/**
	 *
	 * @returns {AST.Declaration}
	 */
	parseDeclaration(): AST.Declaration
	{
		var name: Tokenizer.Token,
			colon: Tokenizer.Token,
			value: AST.DeclarationValue,
			semicolon: Tokenizer.Token;

		this.startEntity();

		this.expect(Tokenizer.EToken.IDENT);
		name = this._currentToken;
		this.nextToken();

		// If the current input token is anything other than a <colon-token>,
		// this is a parse error. Return nothing.
		// Otherwise, consume the next input token.
		this.expect(Tokenizer.EToken.COLON);
		colon = this._currentToken;
		this.nextToken();

		value = this.parseDeclarationValue();

		this.expect(Tokenizer.EToken.SEMICOLON);
		semicolon = this._currentToken;
		this.nextToken();

		return this.endEntity(new AST.Declaration(name, colon, value, semicolon));
	}

	/**
	 *
	 * @returns {AST.DeclarationValue}
	 */
	parseDeclarationValue(): AST.DeclarationValue
	{
		this.startEntity();
		return this.endEntity(new AST.DeclarationValue(this.parseComponentValueList(Tokenizer.EToken.SEMICOLON)));
	}

	/**
	 *
	 * @returns {AST.SelectorList}
	 */
	parseSelectorList(): AST.SelectorList
	{
		var selectors: AST.Selector[] = [],
			t: Tokenizer.Token,
			token: Tokenizer.EToken;

		this.startEntity();

		for ( ; ; )
		{
			t = this._currentToken;
			token = t.token;

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
		var values: AST.ComponentValue[],
			separator: Tokenizer.Token,
			selector: AST.Selector;

		this.startEntity();

		try
		{
			values = this.parseComponentValueList(Tokenizer.EToken.COMMA, Tokenizer.EToken.LBRACE);
			if (this._currentToken.token === Tokenizer.EToken.COMMA)
			{
				separator = this._currentToken;
				this.nextToken();
			}
		}
		catch (e)
		{
			selector = new AST.Selector(null);
			selector.errorTokens = this.cleanup(e, Tokenizer.EToken.COMMA, Tokenizer.EToken.LBRACE);
			return selector;
		}

		return <AST.Selector> this.endEntity(new AST.Selector(values, separator));
	}

	/**
	 *
	 * @returns {AST.ComponentValueList}
	 */
	parseComponentValueList(...endTokens: Tokenizer.EToken[]): AST.ComponentValue[]
	{
		var values = [],
			t: Tokenizer.Token,
			v: Tokenizer.Token,
			token: Tokenizer.EToken;

		// start the first component
		this.startEntity();

		for (t = this._currentToken; ; )
		{
			token = t.token;

			if (token === Tokenizer.EToken.EOF || endTokens.indexOf(token) >= 0)
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
			else
			{
				v = t;
				t = this.nextToken();
				values.push(this.endEntity(new AST.ComponentValue(v)));
				this.startEntity();
			}
		}

		return values;
	}

	/**
	 *
	 * @returns {AST.BlockComponentValue}
	 */
	parseBlock(): AST.BlockComponentValue
	{
		var startToken = this._currentToken,
			token = startToken.token,
			endingToken = undefined,
			t: Tokenizer.Token,
			v: Tokenizer.Token,
			values: AST.IComponentValue[] = [];

		if (token === Tokenizer.EToken.LBRACE)
			endingToken = Tokenizer.EToken.RBRACE;
		else if (token === Tokenizer.EToken.LBRACKET)
			endingToken = Tokenizer.EToken.RBRACKET;
		else if (token === Tokenizer.EToken.LPAREN)
			endingToken = Tokenizer.EToken.RPAREN;

		// start the block component
		this.startEntity();

		// consume the block starting token
		this.expect(Tokenizer.EToken.LBRACE, Tokenizer.EToken.LBRACKET, Tokenizer.EToken.LPAREN);
		this.nextToken();

		// start the first component value
		this.startEntity();

		for (t = this._currentToken; ; )
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
			else
			{
				v = t;
				t = this.nextToken();
				values.push(this.endEntity(new AST.ComponentValue(v)));
				this.startEntity();
			}
		}

		return this.endEntity(new AST.BlockComponentValue(startToken, t, values));
	}

	/**
	 *
	 * @returns {AST.FunctionComponentValue}
	 */
	parseFunction(): AST.FunctionComponentValue
	{
		var t: Tokenizer.Token,
			token: number,
			name: Tokenizer.Token,
			arg: AST.ComponentValue[],
			separator: Tokenizer.Token,
			args: AST.IComponentValue[] = [];

		// start the function
		this.startEntity();
		this.expect(Tokenizer.EToken.FUNCTION);

		// consume the function token
		name = this._currentToken;
		this.nextToken();

		// start the first argument
		this.startEntity();

		for (t = this._currentToken; ; )
		{
			token = t.token;

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
			else
			{
				arg = this.parseComponentValueList(
					Tokenizer.EToken.COMMA, Tokenizer.EToken.RPAREN,
					// synchronization points in case of an error
					Tokenizer.EToken.LBRACE, Tokenizer.EToken.RBRACE
				);

				separator = undefined;
				t = this._currentToken;
				token = t.token;

				this.expect(Tokenizer.EToken.COMMA, Tokenizer.EToken.RPAREN);
				if (token === Tokenizer.EToken.COMMA)
				{
					separator = t;
					t = this.nextToken();
				}

				args.push(this.endEntity(new AST.FunctionArgumentValue(arg, separator)));
				this.startEntity();
			}
		}

		return this.endEntity(new AST.FunctionComponentValue(name, t, args));
	}

	/**
	 *
	 * @returns {IToken}
	 */
	private nextToken(): Tokenizer.Token
	{
		var t = this._currentToken,
			len = this._astStack.length,
			data: IASTStackEntry;

		if (len > 0)
		{
			data = this._astStack[len - 1];
			data.endToken = t;
		}

		this._previousToken = t;
		return (this._currentToken = this._tokenizer.nextToken());
	}

	/**
	 *
	 */
	private startEntity()
	{
		// once a new entity is pushed to the stack, handle the current entity's prologue/epilogue
		var len = this._astStack.length,
			data: IASTStackEntry;

		if (len > 0)
		{
			data = this._astStack[len - 1];
			data.endToken = undefined;
		}

		// add the meta-data for the new entity
		this._astStack.push({
			startToken: this._discardedEntry ? this._discardedEntry.startToken : this._currentToken,
			endToken: undefined
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
			return null;

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
		var data: IASTStackEntry;

		if (tokens.indexOf(this._currentToken.token) < 0)
		{
			data = this._astStack[this._astStack.length - 1];
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
	private cleanup(e: IParseError, ...endTokens: Tokenizer.EToken[]): Tokenizer.Token[]
	{
		var t: Tokenizer.Token,
			token: Tokenizer.EToken,
			errorTokens: Tokenizer.Token[] = [];

		for (t = this._currentToken; ; )
		{
			token = t.token;
			if (token === Tokenizer.EToken.EOF || endTokens.indexOf(token) >= 0)
				break;

			errorTokens.push(t);
			t = this.nextToken();
		}

		/*
		var len = this._astStack.length;
		if (len > 0)
			this._astStack[len - 1].errorTokens = errorTokens;
			*/

		this._discardedEntry = null;

		return errorTokens;
	}


	/**
	 *
	 * @param atKeyword
	 * @returns {*}
	 */
	private getAtRuleSpec(atKeyword: Tokenizer.Token): IAtRuleSpec
	{
		var value = atKeyword.value,
			isPrefixed = value[0] === '-',
			len = atRules.length,
			i: number,
			spec: IAtRuleSpec,
			keyword: string;

		for (i = 0; i < len; i++)
		{
			spec = atRules[i];
			keyword = spec.keyword;

			if (spec.keyword === value)
				return spec;

			// vendor-prexifed?
			if (isPrefixed && value.substr(-keyword.length - 1) === '-' + keyword)
				return spec;
		}

		return null;
	}
}
