// ==================================================================
// IMPORT MODULES
// ==================================================================

import T = require('./types');
import AST = require('./ast');


// ==================================================================
// TYPE DECLARATIONS
// ==================================================================

export interface ITokenizerOptions
{
	tokenizeComments?: boolean;
	lineBase?: number;
	columnBase?: number;
}

export enum EToken
{
	IDENT,
	FUNCTION,
	AT_KEYWORD,
	HASH,
	STRING,
	BAD_STRING,
	URL,
	BAD_URL,
	DELIM,
	NUMBER,
	PERCENTAGE,
	DIMENSION,
	UNICODE_RANGE,
	INCLUDE_MATCH,
	DASH_MATCH,
	PREFIX_MATCH,
	SUFFIX_MATCH,
	SUBSTRING_MATCH,
	COLUMN,
	WHITESPACE,
	COMMENT,
	CDO,
	CDC,
	COLON,
	SEMICOLON,
	COMMA,
	LBRACKET,
	RBRACKET,
	LPAREN,
	RPAREN,
	LBRACE,
	RBRACE,
	EOF
}

enum EChar
{
	TAB = 9,
	LF = 10,    // \n
	VTAB = 11,
	FF = 12,    // \f
	CR = 13,    // \r
	SPACE = 32,
	QUOT = 34,
	HASH = 35,
	DOLLAR = 36,
	PERCENTAGE = 37,
	APOS = 39,
	LPAREN = 40,
	RPAREN = 41,
	ASTERISK = 42,
	PLUS = 43,
	COMMA = 44,
	HYPHEN = 45,
	DOT = 46,
	SOLIDUS = 47,
	DIGIT_0 = 48,
	DIGIT_9 = 57,
	COLON = 58,
	SEMICOLON = 59,
	LESS_THAN = 60,
	EQUALS = 61,
	QUESTION = 63,
	AT = 64,
	UCASE_A = 65,
	UCASE_E = 69,
	UCASE_F = 70,
	UCASE_U = 85,
	UCASE_Z = 90,
	LBRACKET = 91,
	REVERSE_SOLIDUS = 92,
	RBRACKET = 93,
	CIRCUMFLEX = 94,
	UNDERSCORE = 95,
	LCASE_A = 97,
	LCASE_E = 101,
	LCASE_F = 102,
	LCASE_U = 117,
	LCASE_Z = 122,
	LBRACE = 123,
	PIPE = 124,
	RBRACE = 125,
	TILDA = 126
}


// ==================================================================
// GLOBAL HELPER FUNCTIONS
// ==================================================================

function isWhiteSpace(c: number): boolean
{
	return c === EChar.SPACE || (EChar.TAB <= c && c <= EChar.CR) || c === 0x80 || c === 0x2028 || c === 0x2029;
}

function isName(c: number): boolean
{
	return !isNaN(c) && (isNameStart(c) || isDigit(c) || c === EChar.HYPHEN);
}

function isNameStart(c: number): boolean
{
	return !isNaN(c) && (isLetter(c) || isNonAscii(c) || c === EChar.UNDERSCORE);
}

function isNonPrintable(c: number): boolean
{
	return !isNaN(c) && ((0x00 <= c && c <= 0x08) || c === 0x0b || (0x0e <= c && c <= 0x1f) || c === 0x7f);
}

function isLetter(c: number): boolean
{
	return !isNaN(c) && ((EChar.UCASE_A <= c && c <= EChar.UCASE_Z) || (EChar.LCASE_A <= c && c <= EChar.LCASE_Z));
}

function isNonAscii(c: number): boolean
{
	return !isNaN(c) && c >= 0x80;
}

function isDigit(c: number): boolean
{
	return !isNaN(c) && EChar.DIGIT_0 <= c && c <= EChar.DIGIT_9;
}

function isHexDigit(c: number): boolean
{
	return !isNaN(c) && (
		(EChar.DIGIT_0 <= c && c <= EChar.DIGIT_9) ||
		(EChar.UCASE_A <= c && c <= EChar.UCASE_F) ||
		(EChar.LCASE_A <= c && c <= EChar.LCASE_F));
}

/*
function isSurrogate(c: number): boolean
{
	return 0xd800 <= c && c <= 0xdfff;
}
*/

function isEscape(c: string): boolean
{
	return c !== undefined && c[0] === '\\' && c[1] !== '\n';
}


// ==================================================================
// TOKENIZER IMPLEMENTATION
// ==================================================================

export class Token implements T.INode
{
	token: number;
	src: string;
	value: any;
	unit: string;
	type: string;
	start: number;
	end: number;
	range: T.ISourceRange;
	leadingTrivia: Token[];
	trailingTrivia: Token[];
	parent: T.INode;

	constructor(token: number, range: T.ISourceRange, src?: string, value?: any, unit?: string, type?: string, start?: number, end?: number)
	{
		this.token = token;
		this.range = range;
		this.src = src;
		this.value = value || this.src;

		if (unit !== undefined)
			this.unit = unit;

		if (type !== undefined)
			this.type = type;

		if (start !== undefined)
			this.start = start;

		if (end !== undefined)
			this.end = end;
	}

	getParent(): T.INode
	{
		return this.parent;
	}

	getChildren(): T.INode[]
	{
		return [];
	}

	getTokens(): Token[]
	{
		return [ this ];
	}

	isAncestorOf(node: T.INode)
	{
		return false;
	}

	walk(walker: AST.IASTWalker): any
	{
		return walker(this, () => undefined, walker);
	}

	getPrologue(): string
	{
		return this.triviaToString(this.leadingTrivia);
	}

	getEpilogue(): string
	{
		return this.triviaToString(this.trailingTrivia);
	}

	hasLeadingWhitespace(): boolean
	{
		var len: number,
			i: number;

		if (!this.leadingTrivia)
			return false;

		len = this.leadingTrivia.length;
		for (i = 0; i < len; i++)
			if (this.leadingTrivia[i].token === EToken.WHITESPACE)
				return true;

		return false;
	}

	hasTrailingWhitespace(): boolean
	{
		var len: number,
			i: number;

		if (!this.trailingTrivia)
			return false;

		len = this.trailingTrivia.length;
		for (i = 0; i < len; i++)
			if (this.trailingTrivia[i].token === EToken.WHITESPACE)
				return true;

		return false;
	}

	hasError(): boolean
	{
		return false;
	}

	toString(): string
	{
		return this.getPrologue() + this.src + this.getEpilogue();
	}

	private triviaToString(triviaToken: Token[]): string
	{
		var s = '',
			len: number,
			i: number;

		if (!triviaToken)
			return '';

		len = triviaToken.length;
		for (i = 0; i < len; i++)
			s += triviaToken[i].src;

		return s;
	}
}


export class Tokenizer
{
	private _src: string;
	private _pos = 0;
	private _line = 0;
	private _column = 0;

	private _startPos: number;
	private _startLine: number;
	private _startColumn: number;

	private _options: ITokenizerOptions;

	private _currentToken: Token = null;


	/**
	 * Constructs the tokenizer.
	 *
	 * @param src The source code to tokenize
	 * @param options
	 */
	constructor(src: string, options?: ITokenizerOptions)
	{
		this._src = src;
		this._options = options || {};

		if (this._options.lineBase === undefined)
			this._options.lineBase = 0;
		if (this._options.columnBase === undefined)
			this._options.columnBase = this._options.lineBase;

		this._line = this._options.lineBase;
		this._column = this._options.columnBase;
	}


	/**
	 * Returns the next token in the token stream.
	 * Leading and trailing whitespaces and comments of a token are returned
	 * in the leadingTrivia and trailingTrivia properties of the token.
	 *
	 * @returns {Token}
	 */
	nextToken(): Token
	{
		var leadingTrivia = [],
			trailingTrivia = [],
			currentToken = this._currentToken,
			t: Token;

		if (currentToken === null)
		{
			for (t = this.getNextToken(); ; )
			{
				if (t.token === EToken.WHITESPACE || t.token === EToken.COMMENT)
					leadingTrivia.push(t);
				else
				{
					currentToken = t;
					break;
				}

				t = this.getNextToken();
			}
		}

		for (t = this.getNextToken(); ; )
		{
			if (t.token === EToken.WHITESPACE || t.token === EToken.COMMENT)
				trailingTrivia.push(t);
			else
			{
				this._currentToken = t;
				break;
			}

			t = this.getNextToken();
		}

		if (leadingTrivia.length > 0)
			currentToken.leadingTrivia = leadingTrivia;
		if (trailingTrivia.length > 0)
			currentToken.trailingTrivia = trailingTrivia;

		return currentToken;
	}


	/**
	 * Constructs a new token.
	 *
	 * @param token
	 * @param src
	 * @param value
	 * @param unit
	 * @param type
	 * @param start
	 * @param end
	 * @returns {Token}
	 */
	private token(token: number, src?: string, value?: any, unit?: string, type?: string, start?: number, end?: number): Token
	{
		return new Token(
			token,
			{
				startLine: this._startLine,
				startColumn: Math.max(0, this._startColumn),
				endLine: this._line,
				endColumn: Math.max(0, this._column)
			},
			src || this._src.substring(this._startPos, this._pos),
			value,
			unit,
			type,
			start,
			end
		);
	}


	/**
	 * Returns the next token in the stream.
	 * Whitespaces and comments are returned as separate tokens.
	 *
	 * @returns {IToken}
	 */
	private getNextToken(): Token
	{
		var c: string,
			cp: number,
			d: number,
			name: string,
			isID: boolean,
			start: string;

		this._startPos = this._pos;
		this._startLine = this._line;
		this._startColumn = this._column;

		c = this._src[this._pos];
		cp = this._src.charCodeAt(this._pos);

		if (isWhiteSpace(cp))
		{
			this.consumeWhiteSpace();
			return this.token(EToken.WHITESPACE);
		}

		if (cp === EChar.QUOT)
			return this.consumeString(c, cp);

		if (cp === EChar.HASH)
		{
			c = this.nextChar();
			if (isName(this._src.charCodeAt(this._pos)) || this.validEscape(c))
			{
				isID = this.wouldStartIdentifier();
				name = this.consumeName();
				return this.token(EToken.HASH, '#' + name, name, undefined, isID ? 'id' : undefined);
			}

			return this.token(EToken.DELIM);
		}

		if (cp === EChar.DOLLAR)
		{
			c = this.nextChar();
			if (c === '=')
			{
				this.nextChar();
				return this.token(EToken.SUFFIX_MATCH);
			}

			return this.token(EToken.DELIM);
		}

		if (cp === EChar.APOS)
			return this.consumeString(c, cp);

		if (cp === EChar.LPAREN)
		{
			this.nextChar();
			return this.token(EToken.LPAREN);
		}

		if (cp === EChar.RPAREN)
		{
			this.nextChar();
			return this.token(EToken.RPAREN);
		}

		if (cp === EChar.ASTERISK)
		{
			c = this.nextChar();
			if (c === '=')
			{
				this.nextChar();
				return this.token(EToken.SUBSTRING_MATCH);
			}
			else if (c === '/' && this._options.tokenizeComments)
			{
				this.nextChar();
				return this.token(EToken.DELIM, '*/');
			}

			return this.token(EToken.DELIM);
		}

		if (cp === EChar.PLUS)
		{
			if (this.wouldStartNumber())
				return this.consumeNumeric();

			this.nextChar();
			return this.token(EToken.DELIM);
		}

		if (cp === EChar.COMMA)
		{
			this.nextChar();
			return this.token(EToken.COMMA);
		}

		if (cp === EChar.HYPHEN)
		{
			if (this.wouldStartNumber())
				return this.consumeNumeric();

			if (this.wouldStartIdentifier())
				return this.consumeIdentLike();

			c = this.nextChar();
			if (c === '-' && this._src[this._pos + 1] === '>')
				return this.token(EToken.CDC);

			return this.token(EToken.DELIM);
		}

		if (cp === EChar.DOT)
		{
			if (this.wouldStartNumber())
				return this.consumeNumeric();

			this.nextChar();
			return this.token(EToken.DELIM);
		}

		if (cp === EChar.SOLIDUS)
		{
			c = this.nextChar();

			if (c === '*')
			{
				if (this._options.tokenizeComments)
				{
					this.nextChar();
					return this.token(EToken.DELIM, '/*');
				}

				for ( ; ; )
				{
					c = this.nextChar();
					if ((c === '*' && this._src[this._pos + 1] === '/') || c === undefined)
					{
						this.nextChar(); // consume '*'
						this.nextChar(); // consume '/'
						return this.token(EToken.COMMENT);
					}
				}
			}

			return this.token(EToken.DELIM);
		}

		if (cp === EChar.COLON)
		{
			this.nextChar();
			return this.token(EToken.COLON);
		}

		if (cp === EChar.SEMICOLON)
		{
			this.nextChar();
			return this.token(EToken.SEMICOLON);
		}

		if (cp === EChar.LESS_THAN)
		{
			c = this.nextChar();
			if (c === '!' && this._src[this._pos + 1] === '-' && this._src[this._pos + 2] === '-')
			{
				this.nextChar();    // consume '!'
				this.nextChar();    // consume first '-'
				this.nextChar();    // consume second '-'
				return this.token(EToken.CDO);
			}

			return this.token(EToken.DELIM);
		}

		if (cp === EChar.AT)
		{
			c = this.nextChar();
			if (this.wouldStartIdentifier())
			{
				name = this.consumeName();
				return this.token(EToken.AT_KEYWORD, '@' + name, name);
			}

			return this.token(EToken.DELIM);
		}

		if (cp === EChar.LBRACKET)
		{
			this.nextChar();
			return this.token(EToken.LBRACKET);
		}

		if (cp === EChar.REVERSE_SOLIDUS)
		{
			if (this.validEscape())  // c hasn't been consumed yet
				return this.consumeIdentLike();

			this.nextChar();
			return this.token(EToken.DELIM);
		}

		if (cp === EChar.RBRACKET)
		{
			this.nextChar();
			return this.token(EToken.RBRACKET);
		}

		if (cp === EChar.CIRCUMFLEX)
		{
			c = this.nextChar();
			if (c === '=')
			{
				this.nextChar();
				return this.token(EToken.PREFIX_MATCH);
			}

			return this.token(EToken.DELIM);
		}

		if (cp === EChar.LBRACE)
		{
			this.nextChar();
			return this.token(EToken.LBRACE);
		}

		if (cp === EChar.RBRACE)
		{
			this.nextChar();
			return this.token(EToken.RBRACE);
		}

		if (isDigit(cp))
			return this.consumeNumeric();

		if (cp === EChar.UCASE_U || cp === EChar.LCASE_U)
		{
			d = this._src.charCodeAt(this._pos + 2);
			if (this._src.charCodeAt(this._pos + 1) === EChar.PLUS && (isHexDigit(d) || d === EChar.QUESTION))
			{
				// consume 'u'/'U' and '+'
				start = c + this.nextChar();
				this.nextChar();
				return this.consumeUnicodeRange(start);
			}

			return this.consumeIdentLike();
		}

		if (isNameStart(cp))
			return this.consumeIdentLike();

		if (cp === EChar.PIPE)
		{
			c = this.nextChar();
			cp = this._src.charCodeAt(this._pos);

			if (cp === EChar.EQUALS)
			{
				this.nextChar();
				return this.token(EToken.DASH_MATCH);
			}

			if (cp === EChar.PIPE)
			{
				this.nextChar();
				return this.token(EToken.COLUMN);
			}

			return this.token(EToken.DELIM);
		}

		if (cp === EChar.TILDA)
		{
			c = this.nextChar();
			if (c === '=')
			{
				this.nextChar();
				return this.token(EToken.INCLUDE_MATCH);
			}

			return this.token(EToken.DELIM);
		}

		// EOF
		if (isNaN(cp))
			return this.token(EToken.EOF);

		this.nextChar();
		return this.token(EToken.DELIM);
	}

	private nextChar(): string
	{
		var c: string;

		++this._pos;
		++this._column;
		c = this._src[this._pos];

		if (c === '\r' || (c === '\n' && this._src[this._pos - 1] !== '\r'))
		{
			this._column = this._options.columnBase - 1;
			++this._line;
		}

		return c;
	}

	/**
	 * This section describes how to check if two code points are a valid escape.
	 * Note: This algorithm will not consume any additional code point.
	 *
	 * @param c
	 * @returns {boolean}
	 *
	 * @url http://www.w3.org/TR/css3-syntax/#check-if-two-code-points-are-a-valid-escape
	 */
	private validEscape(c?: string): boolean
	{
		if (c !== undefined)
			return isEscape(c + this._src[this._pos]);
		return isEscape(this._src.substr(this._pos, 2));
	}


	/**
	 * This section describes how to check if three code points would start an identifier.
	 * Note: This algorithm will not consume any additional code points.
	 *
	 * @returns {boolean}
	 *
	 * @url http://www.w3.org/TR/css3-syntax/#check-if-three-code-points-would-start-an-identifier
	 */
	private wouldStartIdentifier(): boolean
	{
		var cp = this._src.charCodeAt(this._pos);

		// If the second code point is a name-start code point or the second and third
		// code points are a valid escape, return true. Otherwise, return false.
		if (cp === EChar.HYPHEN)
			return isNameStart(this._src.charCodeAt(this._pos + 1)) || isEscape(this._src.substr(this._pos + 1, 2));

		if (isNameStart(cp))
			return true;

		// If the first and second code points are a valid escape, return true.
		if (cp === EChar.REVERSE_SOLIDUS)
			return this.validEscape();

		// Otherwise, return false.
		return false;
	}


	/**
	 * This section describes how to check if three code points would start a number.
	 * Note: This algorithm will not consume any additional code points.
	 *
	 * @returns {boolean}
	 *
	 * @url http://www.w3.org/TR/css3-syntax/#starts-with-a-number
	 */
	private wouldStartNumber(): boolean
	{
		var c: number = this._src.charCodeAt(this._pos),
			d: number;

		if (c === EChar.PLUS || c === EChar.HYPHEN)
		{
			d = this._src.charCodeAt(this._pos + 1);

			// If the second code point is a digit, return true.
			if (isDigit(d))
				return true;

			// Otherwise, if the second code point is a U+002E FULL STOP (.)
			// and the third code point is a digit, return true.
			if (d === EChar.DOT && isDigit(this._src.charCodeAt(this._pos + 2)))
				return true;

			// Otherwise, return false.
			return false;
		}

		if (c === EChar.DOT)
		{
			// If the second code point is a digit, return true. Otherwise, return false.
			return isDigit(this._src.charCodeAt(this._pos + 1));
		}

		return isDigit(c);
	}


	private consumeWhiteSpace(): string
	{
		var s = '',
			c: string,
			cp: number;

		for (c = this._src[this._pos]; ; )
		{
			cp = c === undefined ? NaN : c.charCodeAt(0);
			if (isWhiteSpace(cp))
			{
				s += c;
				c = this.nextChar();
			}
			else
				break;
		}

		return s;
	}


	/**
	 * This section describes how to consume an escaped code point.
	 * It assumes that the U+005C REVERSE SOLIDUS (\) has already been consumed
	 * and that the next input code point has already been verified to not
	 * be a newline. It will return a code point.
	 *
	 * @returns {string}
	 *
	 * @url http://www.w3.org/TR/css3-syntax/#consume-an-escaped-code-point
	 */
	private consumeEscape(): string
	{
		var s: string,
			c = this.nextChar(),
			i: number;
			// num: number;

		if (isHexDigit(this._src.charCodeAt(this._pos)))
		{
			s = c;
			for (i = 0; i < 5; i++)
			{
				if (isHexDigit(this._src.charCodeAt(this._pos)))
					s += this.nextChar();
				else
					break;
			}

			if (isWhiteSpace(this._src.charCodeAt(this._pos)))
				s += this.nextChar();

			/*
			num = parseInt(s, 16);
			if (num === 0 || isSurrogate(num) || num >= 0x10ffff)
				return '\ufffd';

			return String.fromCharCode(num);
			*/
			return s;
		}

		if (c === undefined)
			return '\ufffd';

		return c;
	}


	/**
	 * This section describes how to consume a name from a stream of code points.
	 * It returns a string containing the largest name that can be formed from
	 * adjacent code points in the stream, starting from the first.
	 *
	 * Note: This algorithm does not do the verification of the first few
	 * code points that are necessary to ensure the returned code points would
	 * constitute an <ident-token>.
	 * If that is the intended use, ensure that the stream starts with an identifier
	 * before calling this algorithm.
	 *
	 * @returns {string}
	 *
	 * @url http://www.w3.org/TR/css3-syntax/#consume-a-name
	 */
	private consumeName(): string
	{
		var s = this._src[this._pos],
			c: string;

		for ( ; ; )
		{
			c = this.nextChar();
			if (isName(this._src.charCodeAt(this._pos)))
				s += c;
			else if (this.validEscape(c))
				s += c + this.consumeEscape();
			else
				break;
		}

		return s;
	}


	/**
	 * This section describes how to consume a number from a stream of code points.
	 * It returns a 3-tuple of a string representation, a numeric value,
	 * and a type flag which is either "integer" or "number".
	 *
	 * Note: This algorithm does not do the verification of the first few
	 * code points that are necessary to ensure a number can be obtained from
	 * the stream. Ensure that the stream starts with a number before calling
	 * this algorithm.
	 *
	 * @returns {string}
	 *
	 * @url http://www.w3.org/TR/css3-syntax/#consume-a-number
	 */
	private consumeNumber(): string
	{
		var s = '',
			c = this._src[this._pos],
			cp = this._src.charCodeAt(this._pos),
			d: number;

		if (cp === EChar.PLUS || cp === EChar.HYPHEN)
		{
			s += c;
			c = this.nextChar();
			cp = this._src.charCodeAt(this._pos);
		}

		for ( ; ; )
		{
			if (isDigit(cp))
			{
				s += c;
				c = this.nextChar();
				cp = this._src.charCodeAt(this._pos);
			}
			else
				break;
		}

		if (cp === EChar.DOT && isDigit(this._src.charCodeAt(this._pos + 1)))
		{
			s += c;
			for (c = this.nextChar(); ; )
			{
				if (isDigit(this._src.charCodeAt(this._pos)))
				{
					s += c;
					c = this.nextChar();
				}
				else
					break;
			}
		}

		cp = this._src.charCodeAt(this._pos);
		d = this._src.charCodeAt(this._pos + 1);
		if ((cp === EChar.UCASE_E || cp === EChar.LCASE_E) &&
			(isDigit(d) || ((d === EChar.PLUS || d === EChar.HYPHEN) && isDigit(this._src.charCodeAt(this._pos + 2)))))
		{
			s += c;
			if (d === EChar.PLUS || d === EChar.HYPHEN)
				s += this.nextChar();

			for (c = this.nextChar(); ; )
			{
				if (isDigit(this._src.charCodeAt(this._pos)))
				{
					s += c;
					c = this.nextChar();
				}
				else
					break;
			}
		}

		return s;
	}


	/**
	 * This section describes how to consume a numeric token from a stream of code points.
	 * It returns either a <number-token>, <percentage-token>, or <dimension-token>.
	 *
	 * @returns {IToken}
	 *
	 * @url http://www.w3.org/TR/css3-syntax/#consume-a-numeric-token
	 */
	private consumeNumeric(): Token
	{
		// Consume a number.
		var num = this.consumeNumber(),
			c = this._src[this._pos],
			unit: string;

		// If the next 3 input code points would start an identifier, then:
		if (this.wouldStartIdentifier())
		{
			// Create a <dimension-token> with the same representation, value,
			// and type flag as the returned number, and a unit set initially
			// to the empty string.

			// Consume a name. Set the <dimension-token>’s unit to the returned value.
			unit = this.consumeName();

			// Return the <dimension-token>.
			return this.token(EToken.DIMENSION, num + unit, parseFloat(num), unit);
		}

		// Otherwise, if the next input code point is U+0025 PERCENTAGE SIGN (%),
		// consume it. Create a <percentage-token> with the same representation
		// and value as the returned number, and return it.
		if (c === '%')
		{
			this.nextChar();
			return this.token(EToken.PERCENTAGE, num + '%', parseFloat(num));
		}

		// Otherwise, create a <number-token> with the same representation,
		// value, and type flag as the returned number, and return it.
		return this.token(EToken.NUMBER, num, parseFloat(num));
	}


	/**
	 * This section describes how to consume an ident-like token from a stream of code points.
	 * It returns an <ident-token>, <function-token>, <url-token>, or <bad-url-token>.
	 *
	 * @returns {IToken}
	 *
	 * @url http://www.w3.org/TR/css3-syntax/#consume-an-ident-like-token
	 */
	private consumeIdentLike(): Token
	{
		// Consume a name.
		var name = this.consumeName(),
			c = this._src[this._pos];

		// If the returned string’s value is an ASCII case-insensitive match
		// for "url", and the next input code point is U+0028 LEFT PARENTHESIS ((),
		// consume it. Consume a url token, and return it.
		if (name.toLowerCase() === 'url' && c === '(')
		{
			this.nextChar();    // consume the '('
			return this.consumeURL(name);
		}

		// Otherwise, if the next input code point is U+0028 LEFT PARENTHESIS ((),
		// consume it. Create a <function-token> with its value set to the returned
		// string and return it.
		if (c === '(')
		{
			this.nextChar();
			return this.token(EToken.FUNCTION, name + c, name);
		}

		// Otherwise, create an <ident-token> with its value set to the returned
		// string and return it.
		return this.token(EToken.IDENT, name);
	}


	/**
	 * This section describes how to consume a string token from a stream of code points.
	 * It returns either a <string-token> or <bad-string-token>.
	 *
	 * @param end The string end character
	 * @param cpEnd The string end code point
	 * @returns {IToken}
	 *
	 * @url http://www.w3.org/TR/css3-syntax/#consume-a-string-token
	 */
	private consumeString(end: string, cpEnd: number): Token
	{
		var s = '',
			c: string,
			cp: number;

		// Repeatedly consume the next input code point from the stream:
		for (c = this.nextChar(); ; )
		{
			cp = this._src.charCodeAt(this._pos);
			if (cp === cpEnd)
			{
				// Return the <string-token>.
				this.nextChar();
				break;
			}
			else if (isNaN(cp))
			{
				// Return the <string-token>.
				break;
			}
			else if (cp === EChar.LF)
			{
				// This is a parse error.
				// Reconsume the current input code point, create a
				// <bad-string-token>, and return it.
				return this.token(EToken.BAD_STRING);
			}
			else if (cp === EChar.REVERSE_SOLIDUS)
			{
				// If the next input code point is EOF, do nothing.
				// Otherwise, if the next input code point is a newline, consume it.
				// Otherwise, if the stream starts with a valid escape, consume
				// an escaped code point and append the returned code point to the
				// <string-token>’s value.
				c = this.nextChar();
				cp = this._src.charCodeAt(this._pos);
				if (cp !== EChar.LF)
					s += '\\' + c;
			}
			else
			{
				// anything else:
				// Append the current input code point to the <string-token>’s value.
				s += c;
			}

			c = this.nextChar();
		}

		return this.token(EToken.STRING, end + s + end, s);
	}


	/**
	 * This section describes how to consume a url token from a stream of code points.
	 * It returns either a <url-token> or a <bad-url-token>.
	 *
	 * Note: This algorithm assumes that the initial "url(" has already been consumed.
	 *
	 * @returns {IToken}
	 *
	 * @url http://www.w3.org/TR/css3-syntax/#consume-a-url-token
	 */
	private consumeURL(fnxName: string): Token
	{
		var s: string,
			c: string,
			cp: number,
			str: Token,
			src: string,
			withWhiteSpace: string;

		fnxName += '(';

		// step 1
		// Initially create a <url-token> with its value set to the empty string.

		// step 2
		// Consume as much whitespace as possible.
		fnxName += this.consumeWhiteSpace();

		c = this._src[this._pos];
		cp = this._src.charCodeAt(this._pos);

		// step 3
		// If the next input code point is EOF, return the <url-token>.
		if (isNaN(cp))
			return this.token(EToken.URL, fnxName + ')', '');

		// step 4
		// If the next input code point is a U+0022 QUOTATION MARK (")
		// or U+0027 APOSTROPHE (‘), then:
		if (cp === EChar.QUOT || cp === EChar.APOS)
		{
			// step 4.1
			// Consume a string token with the current input code point
			// as the ending code point.
			str = this.consumeString(c, cp);

			// step 4.2
			// If a <bad-string-token> was returned, consume the remnants
			// of a bad url, create a <bad-url-token>, and return it.
			if (str.token === EToken.BAD_STRING)
				return this.consumeBadURLRemnants();

			// step 4.3
			// Set the <url-token>’s value to the returned <string-token>’s value.
			src = str.src;

			// step 4.4
			// Consume as much whitespace as possible.
			src += this.consumeWhiteSpace();

			// step 4.5
			// If the next input code point is U+0029 RIGHT PARENTHESIS ()) or EOF,
			// consume it and return the <url-token>; otherwise, consume the remnants
			// of a bad url, create a <bad-url-token>, and return it.
			c = this._src[this._pos];
			cp = this._src.charCodeAt(this._pos);
			if (cp === EChar.RPAREN || isNaN(cp))
			{
				this.nextChar();
				return this.token(EToken.URL, fnxName + src + ')', str.value);
			}

			return this.consumeBadURLRemnants();
		}

		// step 5
		// Repeatedly consume the next input code point from the stream:
		for (s = ''; ; )
		{
			if (cp === EChar.RPAREN || isNaN(cp))
			{
				this.nextChar();
				return this.token(EToken.URL, fnxName + s + ')', s);
			}

			// Consume as much whitespace as possible.
			// If the next input code point is U+0029 RIGHT PARENTHESIS ()) or EOF,
			// consume it and return the <url-token>;
			// otherwise, consume the remnants of a bad url, create a <bad-url-token>,
			// and return it.
			if (isWhiteSpace(cp))
			{
				withWhiteSpace = s + this.consumeWhiteSpace();
				cp = this._src.charCodeAt(this._pos);
				if (cp === EChar.RPAREN || isNaN(cp))
				{
					this.nextChar();
					return this.token(EToken.URL, fnxName + withWhiteSpace + ')', s);
				}

				return this.consumeBadURLRemnants();
			}

			// This is a parse error. Consume the remnants of a bad url,
			// create a <bad-url-token>, and return it.
			if (cp === EChar.QUOT || cp === EChar.APOS || cp === EChar.LPAREN || isNonPrintable(cp))
				return this.consumeBadURLRemnants();

			// If the stream starts with a valid escape, consume an escaped
			// code point and append the returned code point to the <url-token>’s value.
			// Otherwise, this is a parse error. Consume the remnants of a bad url,
			// create a <bad-url-token>, and return it.
			if (cp === EChar.REVERSE_SOLIDUS)
			{
				if (this.validEscape(c))
					s += c + this.consumeEscape();
				else
					return this.consumeBadURLRemnants();
			}
			else
			{
				// anything else:
				// Append the current input code point to the <url-token>’s value.
				s += c;
			}

			c = this.nextChar();
			cp = this._src.charCodeAt(this._pos);
		}
	}


	/**
	 * This section describes how to consume the remnants of a bad url from a stream
	 * of code points, "cleaning up" after the tokenizer realizes that it’s in the middle
	 * of a <bad-url-token> rather than a <url-token>.
	 * It returns nothing; its sole use is to consume enough of the input stream to reach
	 * a recovery point where normal tokenizing can resume.
	 *
	 * @returns {IToken}
	 *
	 * @url http://www.w3.org/TR/css3-syntax/#consume-the-remnants-of-a-bad-url
	 */
	private consumeBadURLRemnants(): Token
	{
		var c: string,
			cp: number;

		for ( ; ; )
		{
			c = this.nextChar();
			cp = this._src.charCodeAt(this._pos);

			if (cp === EChar.RPAREN || isNaN(cp))
			{
				this.nextChar();
				return this.token(EToken.BAD_URL);
			}

			if (this.validEscape(c))
				this.consumeEscape();
		}
	}


	/**
	 * This section describes how to consume a unicode-range token.
	 * It returns a <unicode-range-token>.
	 *
	 * Note: This algorithm assumes that the initial "u+" has been consumed,
	 * and the next code point verified to be a hex digit or a "?".
	 *
	 * @param start The start string of the unicode range (e.g., "U+")
	 * @returns {IToken}
	 *
	 * @url http://www.w3.org/TR/css3-syntax/#consume-a-unicode-range-token
	 */
	private consumeUnicodeRange(start: string): Token
	{
		var s = '',
			c: string,
			rangeStart: number,
			rangeEnd: number,
			hasQuestionMarks = false,
			i: number,
			end: string;

		// step 1a
		// Consume as many hex digits as possible, but no more than 6
		c = this._src[this._pos];
		for (i = 0; i < 6; i++)
		{
			if (isHexDigit(this._src.charCodeAt(this._pos)))
			{
				s += c;
				c = this.nextChar();
			}
			else
				break;
		}

		// step 1b
		// If less than 6 hex digits were consumed, consume as many
		// U+003F QUESTION MARK (?) code points as possible,
		// but no more than enough to make the total of hex digits
		// and U+003F QUESTION MARK (?) code points equal to 6.
		c = this._src[this._pos];
		for ( ; i < 6; i++)
		{
			if (c === '?')
			{
				s += c;
				c = this.nextChar();
				hasQuestionMarks = true;
			}
			else
				break;
		}

		if (hasQuestionMarks)
		{
			// step 1.1
			// Interpret the consumed code points as a hexadecimal number,
			// with the U+003F QUESTION MARK (?) code points replaced by
			// U+0030 DIGIT ZERO (0) code points. This is the start of the range.
			rangeStart = parseInt(s.replace(/\?/g, '0'), 16);

			// step 1.2
			// Interpret the consumed code points as a hexadecimal number again,
			// with the U+003F QUESTION MARK (?) code point replaced by
			// U+0046 LATIN CAPITAL LETTER F (F) code points. This is the end of the range.
			rangeEnd = parseInt(s.replace(/\?/g, 'f'), 16);

			return this.token(EToken.UNICODE_RANGE, start + s, undefined, undefined, undefined, rangeStart, rangeEnd);
		}

		// Otherwise, interpret the digits as a hexadecimal number. This is the start of the range.
		rangeStart = parseInt(s, 16);
		rangeEnd = rangeStart;

		// step 2:
		// If the next 2 input code point are U+002D HYPHEN-MINUS (-) followed by a hex digit, then:
		if (this._src.charCodeAt(this._pos) === EChar.HYPHEN && isHexDigit(this._src.charCodeAt(this._pos + 1)))
		{
			// step 2.1:
			// Consume the next input code point.
			s += '-';
			c = this.nextChar();

			// step 2.2:
			// Consume as many hex digits as possible, but no more than 6.
			// Interpret the digits as a hexadecimal number. This is the end of the range.
			end = '';
			for (i = 0; i < 5; i++)
			{
				if (isHexDigit(this._src.charCodeAt(this._pos)))
				{
					s += c;
					end += c;
					c = this.nextChar();
				}
				else
					break;
			}

			rangeEnd = parseInt(end, 16);
		}

		return this.token(EToken.UNICODE_RANGE, start + s, undefined, undefined, undefined, rangeStart, rangeEnd);
	}
}
