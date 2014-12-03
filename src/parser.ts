// ==================================================================
// IMPORT MODULES
// ==================================================================

import AST = require('./ast');
import Tokenizer = require('./tokenizer');
import Utilities = require('./utilities');


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
	{ keyword: 'font-face', astClass: AST.AtFontFace, type: EAtRule.DECLARATION_LIST },
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


	constructor(src: string, options?: Tokenizer.ITokenizerOptions)
	{
		this._tokenizer = new Tokenizer.Tokenizer(src || '', options);
		this.nextToken();
	}

	/**
	 *
	 * @returns {AST.StyleSheet}
	 */
	parseStyleSheet(): AST.StyleSheet
	{
		var ruleList = this.parseRuleList(false, true);
		return ruleList ? <AST.StyleSheet> new AST.StyleSheet(ruleList) : null;
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
		var rule: AST.AbstractRule,
			rules: AST.AbstractRule[] = [],
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
						rule = this.parseQualifiedRule();
						if (rule)
							rules.push(rule);
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
					rule = this.parseAtRule();
					if (rule)
						rules.push(rule);
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
					rule = this.parseQualifiedRule();
					if (rule)
						rules.push(rule);
				}
				catch (e)
				{
					rules.push(AST.Rule.fromErrorTokens(this.cleanup(e, [ Tokenizer.EToken.RBRACE ], [ Tokenizer.EToken.AT_KEYWORD ])));
				}
			}
		}

		return (rules.length > 0 || lbrace || rbrace ) ? new AST.RuleList(rules.length > 0 ? rules : null, lbrace, rbrace) : null;
	}

	/**
	 *
	 * @returns {AST.Rule}
	 */
	parseQualifiedRule(): AST.Rule
	{
		var selector: AST.Selector,
			selectors = [],
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
				if (selectors.length > 0)
					selectorList = new AST.SelectorList(selectors);
				declarationList = this.parseDeclarationList();
				break;
			}

			// anything else:
			// Reconsume the current input token. Consume a component value.
			// Append the returned value to the qualified rule’s prelude.
			selector = this.parseSelector();
			if (selector)
				selectors.push(selector);
		}

		return (selectorList || declarationList) ? new AST.Rule(selectorList, declarationList) : null;
	}

	/**
	 *
	 * @returns {AST.AtRule}
	 */
	parseAtRule(): AST.AtRule
	{
		var atKeyword = this._currentToken,
			spec = this.getAtRuleSpec(atKeyword),
			preludeValues: AST.ComponentValue[],
			prelude: AST.ComponentValueList = undefined,
			block: AST.ASTNode,
			t: Tokenizer.Token,
			token: Tokenizer.EToken;

		// consume the @<rule> token
		this.nextToken();

		preludeValues = this.parseComponentValueList(Tokenizer.EToken.SEMICOLON, Tokenizer.EToken.LBRACE);
		if (preludeValues && preludeValues.length > 0)
			prelude = new AST.ComponentValueList(preludeValues);

		if (spec)
		{
			if (spec.type === EAtRule.DECLARATION_LIST)
				block = this.parseDeclarationList();
			else if (spec.type === EAtRule.RULE_LIST)
				block = this.parseRuleBlock();

			return (atKeyword || prelude || block) ? new spec.astClass(atKeyword, prelude, block) : null;
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

		return (atKeyword || prelude || block) ? new AST.AtRule(atKeyword, prelude, block) : null;
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
			disabledDeclarations: AST.Declaration[],
			declarations: AST.Declaration[] = [],
			prevIsDeclaration = false;

		// consume '{'
		this.expect(Tokenizer.EToken.LBRACE);
		lbrace = this._currentToken;
		disabledDeclarations = this.parseTrailingTokensForDisabledDeclarations(lbrace);
		if (disabledDeclarations && disabledDeclarations.length > 0)
			declarations = declarations.concat(disabledDeclarations);
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
			else if (prevIsDeclaration && token === Tokenizer.EToken.SEMICOLON)
			{
				disabledDeclarations = this.parseTrailingTokensForDisabledDeclarations(this._currentToken);
				if (disabledDeclarations && disabledDeclarations.length > 0)
					declarations = declarations.concat(disabledDeclarations);
				this.nextToken();
				prevIsDeclaration = false;
			}
			else
			{
				// Reconsume the current input token.
				// Consume a component value and append it to the value of the block.
				try
				{
					declaration = this.parseDeclaration(true);
					if (declaration)
						declarations.push(declaration);
					prevIsDeclaration = !!declaration;
				}
				catch (e)
				{
					declarations.push(AST.Declaration.fromErrorTokens(this.cleanup(e, [ Tokenizer.EToken.SEMICOLON ], [])));
					prevIsDeclaration = false;
				}
			}
		}

		return new AST.DeclarationList(declarations.length > 0 ? declarations : null, lbrace, rbrace);
	}

	/**
	 *
	 * @returns {AST.Declaration}
	 */
	parseDeclaration(omitSemicolon?: boolean): AST.Declaration
	{
		var t = this._currentToken,
			nameValues: AST.ComponentValue[],
			name: AST.ComponentValueList,
			colon: Tokenizer.Token,
			value: AST.DeclarationValue,
			semicolon: Tokenizer.Token,
			lcomment: Tokenizer.Token,
			rcomment: Tokenizer.Token;

		if (t.token === Tokenizer.EToken.DELIM && t.src === '/*')
		{
			lcomment = t;
			this.nextToken();
		}

		nameValues = this.parseComponentValueList(Tokenizer.EToken.COLON, Tokenizer.EToken.SEMICOLON);
		name = nameValues && nameValues.length > 0 ? new AST.ComponentValueList(nameValues) : null;

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
			if (!omitSemicolon)
				this.nextToken();
		}

		if (!omitSemicolon)
		{
			t = this._currentToken;
			if (t.token === Tokenizer.EToken.DELIM && t.src === '*/')
			{
				rcomment = t;
				this.nextToken();
			}
		}

		return (name || colon || value || semicolon) ? new AST.Declaration(name, colon, value, semicolon, lcomment, rcomment) : null;
	}

	parseTrailingTokensForDisabledDeclarations(token: Tokenizer.Token): AST.Declaration[]
	{
		var declarations: AST.Declaration[],
			declaration: AST.Declaration,
			originalTrailingTrivia: Tokenizer.Token[],
			lastTrailingTrivia: Tokenizer.Token[],
			len: number,
			i: number,
			t: Tokenizer.Token,
			tokens: Tokenizer.Token[],
			lastToken: Tokenizer.Token;

		if (!token.trailingTrivia)
			return null;

		declarations = [];
		originalTrailingTrivia = token.trailingTrivia.slice(0);
		len = originalTrailingTrivia.length;
		lastTrailingTrivia = token.trailingTrivia = [];

		for (i = 0; i < len; i++)
		{
			t = originalTrailingTrivia[i];
			if (t.token === Tokenizer.EToken.COMMENT)
			{
				declaration = this.parseDisabledDeclaration(t);
				if (declaration)
				{
					declarations.push(declaration);

					tokens = declaration.getTokens();
					lastToken = tokens[tokens.length - 1];
					if (!lastToken.trailingTrivia)
						lastToken.trailingTrivia = [];
					lastTrailingTrivia = lastToken.trailingTrivia;

					continue;
				}
			}

			lastTrailingTrivia.push(t);
		}

		return declarations;
	}

	parseDisabledDeclaration(token: Tokenizer.Token): AST.Declaration
	{
		var declaration: AST.Declaration;

		if (token.token !== Tokenizer.EToken.COMMENT)
			return null;

		try
		{
			declaration = new Parser(token.src, { tokenizeComments: true }).parseDeclaration();
			if (declaration)
				Utilities.offsetRange(declaration, token.range.startLine, token.range.startColumn);
		}
		catch (e)
		{
			// ignore if there is a parse error
			return null;
		}

		return declaration;
	}

	/**
	 *
	 * @returns {AST.DeclarationValue}
	 */
	parseDeclarationValue(): AST.DeclarationValue
	{
		var values = this.parseComponentValueList(Tokenizer.EToken.SEMICOLON, Tokenizer.EToken.RBRACE);
		return values && values.length > 0 ? new AST.DeclarationValue(values) : null;
	}

	/**
	 *
	 * @returns {AST.SelectorList}
	 */
	parseSelectorList(): AST.SelectorList
	{
		var selector: AST.Selector,
			selectors: AST.Selector[] = [],
			t: Tokenizer.Token,
			token: Tokenizer.EToken;

		for ( ; ; )
		{
			t = this._currentToken;
			token = t.token;

			if (token === Tokenizer.EToken.EOF || token === Tokenizer.EToken.LBRACE)
				break;
			else
			{
				selector = this.parseSelector();
				if (selector)
					selectors.push(selector);
			}
		}

		return selectors.length > 0 ? new AST.SelectorList(selectors) : null;
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

		return ((values && values.length > 0) || separator) ? <AST.Selector> new AST.Selector(values, separator) : null;
	}

	/**
	 *
	 * @returns {AST.ComponentValueList}
	 */
	parseComponentValueList(...endTokens: Tokenizer.EToken[]): AST.ComponentValue[]
	{
		var value: AST.IComponentValue,
			values = [],
			t: Tokenizer.Token,
			token: Tokenizer.EToken,
			prevToken: Tokenizer.Token;

		try
		{
			for (t = this._currentToken; ; )
			{
				token = t.token;

				if (token === Tokenizer.EToken.EOF || endTokens.indexOf(token) >= 0)
					break;
				else if (token === Tokenizer.EToken.LPAREN || token === Tokenizer.EToken.LBRACKET)
				{
					value = this.parseBlock();
					if (value)
						values.push(value);
					t = this._currentToken;
				}
				else if (token === Tokenizer.EToken.FUNCTION)
				{
					value = this.parseFunction();
					if (value)
						values.push(value);
					t = this._currentToken;
				}
				else if (token === Tokenizer.EToken.DELIM && t.src === '!')
				{
					prevToken = t;
					t = this.nextToken();

					if (t.token === Tokenizer.EToken.IDENT && t.src.toLowerCase() === 'important')
						values.push(new AST.ImportantComponentValue(prevToken, t));
					else
					{
						values.push(new AST.ComponentValue(prevToken));
						values.push(new AST.ComponentValue(t));
					}

					t = this.nextToken();
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
			value: AST.IComponentValue,
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
					value = this.parseBlock();
					if (value)
						values.push(value);
					t = this._currentToken;
				}
				else if (token === Tokenizer.EToken.FUNCTION)
				{
					value = this.parseFunction();
					if (value)
						values.push(value);
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

				if (arg && arg.length > 0)
					args.push(new AST.FunctionArgumentValue(arg, separator));
			}
		}

		return (name || t || (args.length > 0)) ? new AST.FunctionComponentValue(name, t, args) : null;
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
