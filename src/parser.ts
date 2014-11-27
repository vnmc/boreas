// ==================================================================
// IMPORT MODULES
// ==================================================================

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

interface IParseError
{
	expected: Tokenizer.EToken[];
	parsedNodes: any[];
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
		return <AST.StyleSheet> new AST.StyleSheet(this.parseRuleList(false, true));
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
			lbrace: Tokenizer.Token = null,
			rbrace: Tokenizer.Token = null,
			token: Tokenizer.EToken;

		if (isBlock)
		{
			// consume '{'
			this.expect(Tokenizer.EToken.LBRACE);
			lbrace = this._currentToken;
			this.nextToken();
		}

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
						rules.push(AST.Rule.fromErrorTokens(this.cleanup(e, [ Tokenizer.EToken.RBRACE ], [ Tokenizer.EToken.AT_KEYWORD ])));
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
					rules.push(AST.Rule.fromErrorTokens(this.cleanup(e, [ Tokenizer.EToken.RBRACE ], [ Tokenizer.EToken.AT_KEYWORD ])));
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
					rules.push(AST.Rule.fromErrorTokens(this.cleanup(e, [ Tokenizer.EToken.RBRACE ], [ Tokenizer.EToken.AT_KEYWORD ])));
				}
			}
		}

		return new AST.RuleList(rules, lbrace, rbrace);
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

		// Repeatedly consume the next input token:
		for ( ; ; )
		{
			token = this._currentToken.token;

			if (token === Tokenizer.EToken.EOF)
			{
				// This is a parse error. Return nothing.
				selectorList = new AST.SelectorList(selectors);
				break;
			}

			if (token === Tokenizer.EToken.LBRACE)
			{
				// Consume a simple block and assign it to the qualified rule’s block.
				// Return the qualified rule.
				selectorList = new AST.SelectorList(selectors);
				declarationList = this.parseDeclarationList();
				break;
			}

			// anything else:
			// Reconsume the current input token. Consume a component value.
			// Append the returned value to the qualified rule’s prelude.
			selectors.push(this.parseSelector());
		}

		return new AST.Rule(selectorList, declarationList);
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
		this.nextToken();

		prelude = this.parseComponentValueList(Tokenizer.EToken.SEMICOLON, Tokenizer.EToken.LBRACE);

		if (spec)
		{
			if (spec.type === EAtRule.DECLARATION_LIST)
				block = this.parseDeclarationList();
			else if (spec.type === EAtRule.RULE_LIST)
				block = this.parseRuleBlock();

			return new spec.astClass(atKeyword, new AST.ComponentValueList(prelude), block);
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

		return new AST.AtRule(atKeyword, new AST.ComponentValueList(prelude), block);
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
			declarations: AST.Declaration[] = [];

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
				declarations.push(AST.Declaration.fromErrorTokens(this.cleanup(e, [ Tokenizer.EToken.RBRACE ], [])));
				// XX break;
			}
		}

		return new AST.DeclarationList(declarations, lbrace, rbrace);
	}

	/**
	 *
	 * @returns {AST.Declaration}
	 */
	parseDeclaration(): AST.Declaration
	{
		var name: AST.ComponentValueList,
			colon: Tokenizer.Token,
			value: AST.DeclarationValue,
			semicolon: Tokenizer.Token;

		name = new AST.ComponentValueList(this.parseComponentValueList(Tokenizer.EToken.COLON, Tokenizer.EToken.SEMICOLON));

		// If the current input token is anything other than a <colon-token>,
		// this is a parse error. Return nothing.
		// Otherwise, consume the next input token.
		this.expect(Tokenizer.EToken.COLON, name);
		colon = this._currentToken;
		this.nextToken();

		value = this.parseDeclarationValue();

		this.expect(Tokenizer.EToken.SEMICOLON, Tokenizer.EToken.RBRACE, name, colon, value);
		if (this._currentToken.token === Tokenizer.EToken.SEMICOLON)
		{
			semicolon = this._currentToken;
			this.nextToken();
		}

		return new AST.Declaration(name, colon, value, semicolon);
	}

	/**
	 *
	 * @returns {AST.DeclarationValue}
	 */
	parseDeclarationValue(): AST.DeclarationValue
	{
		return new AST.DeclarationValue(this.parseComponentValueList(Tokenizer.EToken.SEMICOLON, Tokenizer.EToken.RBRACE));
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

		for ( ; ; )
		{
			t = this._currentToken;
			token = t.token;

			if (token === Tokenizer.EToken.EOF || token === Tokenizer.EToken.LBRACE)
				break;
			else
				selectors.push(this.parseSelector());
		}

		return new AST.SelectorList(selectors);
	}

	/**
	 *
	 * @returns {AST.Selector}
	 */
	parseSelector(): AST.Selector
	{
		var values: AST.ComponentValue[],
			separator: Tokenizer.Token;

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
			return AST.Selector.fromErrorTokens(this.cleanup(e, [ Tokenizer.EToken.COMMA ], [ Tokenizer.EToken.LBRACE ]));
		}

		return <AST.Selector> new AST.Selector(values, separator);
	}

	/**
	 *
	 * @returns {AST.ComponentValueList}
	 */
	parseComponentValueList(...endTokens: Tokenizer.EToken[]): AST.ComponentValue[]
	{
		var values = [],
			t: Tokenizer.Token,
			token: Tokenizer.EToken;

		try
		{
			for (t = this._currentToken; ; )
			{
				token = t.token;

				if (token === Tokenizer.EToken.EOF || endTokens.indexOf(token) >= 0)
					break;
				else if (token === Tokenizer.EToken.LPAREN || token === Tokenizer.EToken.LBRACKET)
				{
					values.push(this.parseBlock());
					t = this._currentToken;
				}
				else if (token === Tokenizer.EToken.FUNCTION)
				{
					values.push(this.parseFunction());
					t = this._currentToken;
				}
				else
				{
					values.push(new AST.ComponentValue(t));
					t = this.nextToken();
				}
			}
		}
		catch (e)
		{
			this.rethrow(e, values);
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
			values: AST.IComponentValue[] = [];

		if (token === Tokenizer.EToken.LBRACE)
			endingToken = Tokenizer.EToken.RBRACE;
		else if (token === Tokenizer.EToken.LBRACKET)
			endingToken = Tokenizer.EToken.RBRACKET;
		else if (token === Tokenizer.EToken.LPAREN)
			endingToken = Tokenizer.EToken.RPAREN;

		// consume the block starting token
		this.expect(Tokenizer.EToken.LBRACE, Tokenizer.EToken.LBRACKET, Tokenizer.EToken.LPAREN);
		this.nextToken();

		try
		{
			for (t = this._currentToken; ; )
			{
				token = t.token;

				if (token === Tokenizer.EToken.EOF)
					break;
				else if (token === endingToken)
				{
					// end of block
					this.nextToken();
					break;
				}
				else if (token === Tokenizer.EToken.LPAREN || token === Tokenizer.EToken.LBRACKET || token === Tokenizer.EToken.LBRACE)
				{
					values.push(this.parseBlock());
					t = this._currentToken;
				}
				else if (token === Tokenizer.EToken.FUNCTION)
				{
					values.push(this.parseFunction());
					t = this._currentToken;
				}
				else
				{
					values.push(new AST.ComponentValue(t));
					t = this.nextToken();
				}
			}
		}
		catch (e)
		{
			this.rethrow(e, <AST.ASTNode[]> values);
		}

		return new AST.BlockComponentValue(startToken, t, values);
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

		this.expect(Tokenizer.EToken.FUNCTION);

		// consume the function token
		name = this._currentToken;
		this.nextToken();

		for (t = this._currentToken; ; )
		{
			token = t.token;

			if (token === Tokenizer.EToken.EOF)
				break;
			else if (token === Tokenizer.EToken.RPAREN)
			{
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

				this.expect(Tokenizer.EToken.COMMA, Tokenizer.EToken.RPAREN, name, args, arg);
				if (token === Tokenizer.EToken.COMMA)
				{
					separator = t;
					t = this.nextToken();
				}

				args.push(new AST.FunctionArgumentValue(arg, separator));
			}
		}

		return new AST.FunctionComponentValue(name, t, args);
	}

	/**
	 *
	 * @returns {IToken}
	 */
	private nextToken(): Tokenizer.Token
	{
		return (this._currentToken = this._tokenizer.nextToken());
	}


	/**
	 *
	 * @param tokens
	 */
	private expect(...args: any[])
	{
		var tokens: Tokenizer.EToken[] = [],
			parsedNodes: any[] = [],
			len = args.length,
			i: number,
			j: number,
			l: number,
			arg: any,
			a: any;

		// parse the arguments
		for (i = 0; i < len; i++)
		{
			arg = args[i];
			if ((arg instanceof AST.ASTNode) || (arg instanceof Tokenizer.Token))
				parsedNodes.push(arg);
			else if (Array.isArray(arg))
			{
				l = arg.length;
				for (j = 0; j < l; j++)
				{
					a = arg[j];
					if (a instanceof AST.ASTNode)
						parsedNodes.push(a);
					else
						tokens.push(a);
				}
			}
			else
				tokens.push(arg);
		}

		if (tokens.indexOf(this._currentToken.token) < 0)
			throw { expected: tokens, parsedNodes: parsedNodes };
	}


	private rethrow(e: IParseError, nodes: AST.ASTNode[])
	{
		// prepend the already parsed values to the "parsedNodes" of the error
		// and re-throw the error

		if (!e.parsedNodes)
			e.parsedNodes = nodes;
		else
			e.parsedNodes = nodes.concat(e.parsedNodes);

		throw e;
	}


	/**
	 * Cleans up the token stream by consuming all the tokens until "endToken" is found.
	 * Adds all the tokens encountered until then to the epilogue of the current entity.
	 *
	 * @param e
	 * @param endTokens
	 * @param nextTokens
	 */
	private cleanup(e: IParseError, endTokens: Tokenizer.EToken[], nextTokens: Tokenizer.EToken[]): Tokenizer.Token[]
	{
		var t: Tokenizer.Token,
			token: Tokenizer.EToken,
			errorTokens: Tokenizer.Token[] = [],
			len: number,
			node: any,
			tokens: Tokenizer.Token[],
			lenTokens: number,
			i: number,
			j: number;

		// add the parsed tokens to the list of error tokens
		if (e.parsedNodes)
		{
			len = e.parsedNodes.length;

			for (i = 0; i < len; i++)
			{
				node = e.parsedNodes[i];

				if (node instanceof Tokenizer.Token)
					errorTokens.push(node);
				else if (node instanceof AST.ASTNode)
				{
					tokens = node.getTokens();
					lenTokens = tokens.length;
					for (j = 0; j < lenTokens; j++)
						errorTokens.push(tokens[j]);
				}
			}
		}

		for (t = this._currentToken; ; )
		{
			token = t.token;
			if (token === Tokenizer.EToken.EOF || nextTokens.indexOf(token) >= 0)
				break;

			errorTokens.push(t);
			t = this.nextToken();

			if (endTokens.indexOf(token) >= 0)
				break;
		}

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
