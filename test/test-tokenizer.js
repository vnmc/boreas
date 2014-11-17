var should = require('should');

var T = require('../lib/tokenizer');
var Tokenizer = T.Tokenizer;


describe('CSS-Tokenizer', function()
{
	it('should tokenize identifiers', function()
	{
		var t = new Tokenizer('anidentifier ident1 ident-with-hyphens ident_with_underscores ident\\:with\\+escapes');
		
		var token = t.nextToken();
		token.token.should.eql(T.EToken.IDENT);
		token.src.should.eql('anidentifier');
		
		t.nextToken().token.should.eql(T.EToken.WHITESPACE);

		token = t.nextToken()
		token.token.should.eql(T.EToken.IDENT);
		token.src.should.eql('ident1');

		t.nextToken().token.should.eql(T.EToken.WHITESPACE);

		token = t.nextToken()
		token.token.should.eql(T.EToken.IDENT);
		token.src.should.eql('ident-with-hyphens');

		t.nextToken().token.should.eql(T.EToken.WHITESPACE);

		token = t.nextToken()
		token.token.should.eql(T.EToken.IDENT);
		token.src.should.eql('ident_with_underscores');

		t.nextToken().token.should.eql(T.EToken.WHITESPACE);

		token = t.nextToken()
		token.token.should.eql(T.EToken.IDENT);
		token.src.should.eql('ident\\:with\\+escapes');
	});

	it('should tokenize whitespaces', function()
	{
		var t = new Tokenizer(' A\tB\nC \t D\t\n\t\tE');

		var token = t.nextToken();
		token.token.should.eql(T.EToken.WHITESPACE);
		token.src.should.eql(' ');

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.WHITESPACE);
		token.src.should.eql('\t');

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.WHITESPACE);
		token.src.should.eql('\n');

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.WHITESPACE);
		token.src.should.eql(' \t ');

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.WHITESPACE);
		token.src.should.eql('\t\n\t\t');
	});

	it('should tokenize numbers', function()
	{
		var t = new Tokenizer('5 123 1.2 .8 +2 +33 -4 -56 1e3 -1e3 -1e+12 +2.5e-5 +2.5E-5');

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('5');
		token.value.should.eql(5);

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('123');
		token.value.should.eql(123);

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('1.2');

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('.8');

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('+2');
		token.value.should.eql(2);

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('+33');

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('-4');
		token.value.should.eql(-4);

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('-56');

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('1e3');
		token.value.should.eql(1000);

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('-1e3');

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('-1e+12');

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('+2.5e-5');

		t.nextToken();

		var token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);
		token.src.should.eql('+2.5E-5');
	});

	it('should tokenize dimensions', function()
	{
		var t = new Tokenizer('3px 4em -0.2rem 50%');

		var token = t.nextToken();
		token.token.should.eql(T.EToken.DIMENSION);
		token.src.should.eql('3px');
		token.value.should.eql(3);
		token.unit.should.eql('px');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.DIMENSION);
		token.src.should.eql('4em');
		token.value.should.eql(4);
		token.unit.should.eql('em');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.DIMENSION);
		token.value.should.eql(-0.2);
		token.unit.should.eql('rem');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.PERCENTAGE);
		token.src.should.eql('50%');
		token.value.should.eql(50);
	});

	it('should tokenize strings', function()
	{
		var t = new Tokenizer('"hello" \'world\' "string \'X\'" "string \\"Y\\"" "unterminated\n');

		var token = t.nextToken();
		token.token.should.eql(T.EToken.STRING);
		token.src.should.eql('"hello"');
		token.value.should.eql('hello');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.STRING);
		token.src.should.eql('\'world\'');
		token.value.should.eql('world');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.STRING);
		token.src.should.eql('"string \'X\'"');
		token.value.should.eql('string \'X\'');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.STRING);
		token.src.should.eql('"string \\"Y\\""');
		token.value.should.eql('string \\"Y\\"');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.BAD_STRING);
	});

	it('should tokenize URLs', function()
	{
		var t = new Tokenizer('url(1.png) url( "2.jpg" ) URL(\'3.gif\') url(x"a) X');

		var token = t.nextToken();
		token.token.should.eql(T.EToken.URL);
		token.src.should.eql('url(1.png)');
		token.value.should.eql('1.png');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.URL);
		token.src.should.eql('url( "2.jpg" )');
		token.value.should.eql('2.jpg');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.URL);
		token.src.should.eql('URL(\'3.gif\')');
		token.value.should.eql('3.gif');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.BAD_URL);

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.IDENT);
	});

	it('should tokenize functions', function()
	{
		var t = new Tokenizer('rgb(255,111,55) otherfnx()');

		var token = t.nextToken();
		token.token.should.eql(T.EToken.FUNCTION);
		token.src.should.eql('rgb(');
		token.value.should.eql('rgb');

		t.nextToken();	// 255
		t.nextToken();	// ,
		t.nextToken();	// 111
		t.nextToken();	// ,
		t.nextToken();	// 55
		t.nextToken();	// )
		t.nextToken();	// whitespace

		token = t.nextToken();
		token.token.should.eql(T.EToken.FUNCTION);
		token.value.should.eql('otherfnx');
	});

	it('should tokenize comments', function()
	{
		var t = new Tokenizer('/* this is a "comment": * ... */ /* another * / * comment */ /* a\ncomment\non\nmultiple\nlines */');

		var token = t.nextToken();
		token.token.should.eql(T.EToken.COMMENT);
		token.src.should.eql('/* this is a "comment": * ... */');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.COMMENT);
		token.src.should.eql('/* another * / * comment */');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.COMMENT);
		token.src.should.eql('/* a\ncomment\non\nmultiple\nlines */');
	});

	it('should tokenize at', function()
	{
		var t = new Tokenizer('@import url("x.css"); @media screen');

		var token = t.nextToken();
		token.token.should.eql(T.EToken.AT_KEYWORD);
		token.src.should.eql('@import');
		token.value.should.eql('import');

		t.nextToken();	// white space
		t.nextToken();	// url
		t.nextToken();	// semicolon
		t.nextToken();	// white space

		token = t.nextToken();
		token.token.should.eql(T.EToken.AT_KEYWORD);
		token.src.should.eql('@media');
		token.value.should.eql('media');
	});

	it('should tokenize hash', function()
	{
		var t = new Tokenizer('#myid #my\\#id');

		var token = t.nextToken();
		token.token.should.eql(T.EToken.HASH);
		token.src.should.eql('#myid');
		token.value.should.eql('myid');

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.HASH);
		token.src.should.eql('#my\\#id');
		token.value.should.eql('my\\#id');
	});

	it('should tokenize delimiters', function()
	{
		var t = new Tokenizer('~ | ^ $ * + # @ - . / < \\\n');

		var token = undefined;
		for (var i = 0; ; i++)
		{
			token = t.nextToken();
			if (token.token === T.EToken.EOF)
				break;
			if (i % 2 === 0)
				token.token.should.eql(T.EToken.DELIM);
		}
	});

	it('should tokenize matches', function()
	{
		var t = new Tokenizer('~= |= ^= $= *=');

		var token = t.nextToken();
		token.token.should.eql(T.EToken.INCLUDE_MATCH);

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.DASH_MATCH);

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.PREFIX_MATCH);

		t.nextToken();
		
		token = t.nextToken();
		token.token.should.eql(T.EToken.SUFFIX_MATCH);

		t.nextToken();
		
		token = t.nextToken();
		token.token.should.eql(T.EToken.SUBSTRING_MATCH);
	});

	it('should tokenize unicode ranges', function()
	{
		var t = new Tokenizer('U+26 u+01f-23a U+20?? U+12345678 U+1fff8??');

		var token = t.nextToken();
		token.token.should.eql(T.EToken.UNICODE_RANGE);
		token.src.should.eql('U+26');
		token.start.should.eql(0x26);
		token.end.should.eql(0x26);

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.UNICODE_RANGE);
		token.src.should.eql('u+01f-23a');
		token.start.should.eql(0x1f);
		token.end.should.eql(0x23a);

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.UNICODE_RANGE);
		token.src.should.eql('U+20??');
		token.start.should.eql(0x2000);
		token.end.should.eql(0x20ff);

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.UNICODE_RANGE);
		token.src.should.eql('U+123456');
		token.start.should.eql(0x123456);
		token.end.should.eql(0x123456);

		token = t.nextToken();
		token.token.should.eql(T.EToken.NUMBER);

		t.nextToken();

		token = t.nextToken();
		token.token.should.eql(T.EToken.UNICODE_RANGE);
		token.src.should.eql('U+1fff8?');
		token.start.should.eql(0x1fff80);
		token.end.should.eql(0x1fff8f);

		token = t.nextToken();
		token.token.should.eql(T.EToken.DELIM);
		token.src.should.eql('?');
	});
});