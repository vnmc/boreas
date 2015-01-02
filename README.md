Boreas: A CSS Parser in TypeScript
==================================

Boreas is a CSS parser written in TypeScript (which compiles to JavaScript). It can be used both in node.js projects and in the browser (work in progress).

The project was done because we needed a reliable, robust CSS parser for Ghostlab (http://www.vanamco.com/ghostlab)

This project comprises

* a W3C compliant tokenizer (cf. the W3C CSS syntax module, http://www.w3.org/TR/css3-syntax),
* a parser that can serialize the AST to an output identical to the input (i.e., it preserves non-significant whitespaces and comments) and can parse "disabled" properties (i.e., properties that are commented out),
* AST classes allowing easy AST manipulations and AST construction,
* AST classes and tokens that contain information about their occurrence within the source code,
* AST traversal (tree walking).

## Installation
TODO: npm


## Building
Build _Boreas_ by typing

```
npm install
grunt
```
on the command line. The modules will be compiled into the ```lib``` directory.


## Usage

All examples here are written in plain JavaScript (as are the examples in the project).

### Parsing

```javascript
var Parser = require('boreas/lib/parser');

// some CSS source you want to parse
var src = '* { color: blue; }';

// parse the CSS
var ast = Parser.parse(src);

// do any AST manipulations/tree walkling...

// unparse the AST to stdout
console.log(ast.toString());
```

The parser offers a set of static convenience methods to parse different types of CSS structures:

Functions | Description
--- | ---
```parse``` | parses a complete style sheet.
```parseRule``` | parses a single rule (either a qualified rule or an at-rule).
```parseSelectors``` | parses a list of selectors.
```parseSelector``` | parses a single selector.
```parseDeclarations``` | parses a list of declarations (i.e., CSS properties).
```parseDeclaration``` | parses a single declaration.

All the parse functions take, apart from the mandatory CSS source as first argument, an optional "options" argument, which is a hash with the following (optional) properties:

Properties | Description
--- | ---
```lineBase``` | the number of the first line, defaults to 0,
```columnBase``` | the number of the first column, defaults to 0,
```tokenizeComments``` | flag indicating whether start and end comment tokens should be parsed as individual tokens and the contents of the comment should also be parsed.

### Unparsing

Every AST class and tokens have a ```toString()``` method, which returns the a string identical to the corresponding part of the input.

### AST Manipulations

Given an AST structure, the AST objects have methods by means of which the AST can be manipulated. E.g., ```RuleList```s or ```SelectorList```s or ```DeclarationList```s have methods to insert or delete rules, selectors, or declarations, respectively.

Example:

```javascript
var AST = require('../lib/ast');

// construct an AST structure by parsing or constructing it programmatically
var ast = ...;

// insert a new rule
ast.insertRule(new AST.Rule(
    new AST.SelectorList([
        new AST.Selector('h1')
    ]),
    new AST.DeclarationList([
        new AST.Declaration('color', 'blue')
    ])
));

// insert a new selector at the first position of the first rule
ast.getRules()[0].getSelectors().insertSelector(new AST.Selector('tr.odd'), 0);

// insert a new declaration (property)
ast.getRules()[0].getDeclarations().insertDeclaration(new AST.Declaration('border', '1px solid gray'));
```

### AST Construction

All the AST classes have convenience constructors which allow easy programmatic construction of an AST structure.

Example:

```javascript
var AST = require('../lib/ast');

var styleSheet = new AST.StyleSheet(
    new AST.RuleList([
        new AST.AtImport('import.css'),
        new AST.Rule(
            new AST.SelectorList([
                new AST.Selector('html'),
                new AST.Selector('h1 + p')
            ]),
            new AST.DeclarationList([
                new AST.Declaration('color', 'blue'),
                new AST.Declaration('border', '1px solid purple', true),
                new AST.Declaration('padding', '1em', false, true)
            ])
        ),
        new AST.AtMedia(
            'screen and (max-width: 1000px)',
            new AST.RuleList([
                new AST.SelectorList([ new AST.Selector('body') ]),
                new AST.DeclarationList([
                    new AST.Declaration('background-color', 'pink')
                ])
            ])
        )
    ])
);
console.log(styleSheet.toString());
```

### AST Walking


## Tokenizer and Parser Reference

### Tokenizer

Properties/Methods | Description
--- | ---
```constructor(src: string, options?: ITokenizerOptions)``` | 
```nextToken(): Token``` | Returns the next token in the token stream. Leading and trailing whitespaces and comments of a token are returned in the leadingTrivia and trailingTrivia properties of the token.

```ITokenizerOptions``` is a hash which can have the following properties:

Properties | Description
--- | ---
```tokenizeComments?: boolean``` | 
```lineBase?: number``` | 
```columnBase?: number``` | 



### Parser

Properties/Methods | Description
--- | ---
```constructor(src: string, options?: Tokenizer.ITokenizerOptions)``` | 
```parseStyleSheet(): AST.StyleSheet``` | Parses a style sheet.
```parseRuleBlock(): AST.RuleList``` | Parses a block of rules, i.e., rules contained within curly braces, "{" (rules) "}".
```parseRuleList(isBlock?: boolean): AST.RuleList``` | Parses a list of rules. If ```isBlock``` is set to true, it is expected that the rules are enclosed in curly braces.
```parseQualifiedRule(): AST.Rule``` | Parses a qualified rule.
```parseAtRule(): AST.AtRule``` | Parses an (arbitrary) @rule.
```parseDeclarationList(): AST.DeclarationList``` | Parses a list of declarations (e.g., properties).
```parseDeclaration(throwErrors: boolean = true, omitSemicolon?: boolean): AST.Declaration``` | Parses a single declaration.
```parseTrailingTokensForDisabledDeclarations(token: Tokenizer.Token): AST.Declaration[]``` | Parses the trailing tokens of the current token for disabled declarations (declarations which are commented out in the source code).
```parseDisabledDeclaration(token: Tokenizer.Token, throwErrors: boolean = true): AST.Declaration``` | Parses a single disabled (i.e., commented out) declaration.
```parseDeclarationValue(): AST.DeclarationValue``` | Parses a declaration value (i.e., the part that comes after the ":" in a declaration).
```parseSelectorList(): AST.SelectorList``` | Parses a list of selectors.
```parseSelector(): AST.Selector``` | Parses a single selector.
```parseComponentValueList(...endTokens: Tokenizer.EToken[]): AST.ComponentValue[]``` | Parses a list of component values.
```parseBlock(): AST.BlockComponentValue``` | Parses a block component value (any block enclosed in parentheses, square brackets, or curly braces).
```parseFunction(): AST.FunctionComponentValue``` | Parses a function.

## AST Class Reference

### Types

#### INode
This is a TypeScript interface which all AST classes and the ```Token``` class implement. It has the following members:

Properties/Methods | Description
--- | ---
```range: ISourceRange``` | The start and end positions within the source code
```getParent: () => INode``` | Returns the parent node
```getChildren: () => INode[]``` | Returns an array containing all the child nodes
```isAncestorOf: (node: INode) => boolean``` | Determines if this node is an ancestor of "node"
```getTokens: () => Token[]``` | Returns an array containing all the tokens that this node spans
```walk: (walker: AST.IASTWalker) => any``` | Walks the sub-tree using the tree walker "walker"_
```hasError: () => boolean``` | Returns ```true``` iff there was an error while parsing this node_
```toString: () => string``` | Unparses this node and returns it's string representation (identical to the corresponding part of the input source code)

Defined in types.ts.

#### IComponentValue

Extends ```INode```.

Properties/Methods | Description
--- | ---
```getValue: () => string``` |


#### ISourceRange

Properties/Methods | Description
--- | ---
```startLine: number``` |
```startColumn: number``` |
```endLine: number``` |
```endColumn: number``` |

Defined in types.ts.


#### EToken

This _enum_ defines the token types. The following enum values are defined (in accordance with the W3C specification):

Properties            | Description
--------------------- | ------------------------
```IDENT```           | an identifier token_
```FUNCTION```        | a function token, i.e., an identifier followed by an opening parenthesis, "("_
```AT_KEYWORD```      | an at-keyword, i.e., a identifier preceded by the at character, "@"
```HASH```            | a hash, i.e., an identifier preceded by the hash character, "#"
```STRING```          | a string
```BAD_STRING```      | a string with a syntax error
```URL```             | a URL
```BAD_URL```         | a URL with a syntax error
```DELIM```           | a delimiter token
```NUMBER```          | a number
```PERCENTAGE```      | a percentage token, i.e., a number followed by the percentage sign, "%"
```DIMENSION```       | a dimension token, i.e., a number followed by a dimension such as "px", "em", etc.
```UNICODE_RANGE```   | a unicode range, i.e., something of the form U+0123?? or U+012345-ABCDEF
```INCLUDE_MATCH```   | an include match token, "~="
```DASH_MATCH```      | a dash match token, "|="
```PREFIX_MATCH```    | a prefix match token, "^="
```SUFFIX_MATCH```    | a suffix match token, "$="
```SUBSTRING_MATCH``` | a substring match token, "*="
```COLUMN```          | a column token, "||"
```WHITESPACE```      | a whitespace token, consisting of a sequence of space, tab, and newline characters
```COMMENT```         | a comment, i.e., a string enclosed in "/\*", "\*/"
```CDO```             | an opening HTML comment token, "<!--"
```CDC```             | a closing HTML comment token, "-->"
```COLON```           | a colon token, ":"
```SEMICOLON```       | a semicolon token, ";"
```COMMA```           | a comma token, ","
```LBRACKET```        | an opening square bracket token, "["
```RBRACKET```        | a closing square bracket token, "]"
```LPAREN```          | an opening parenthesis token, "("
```RPAREN```          | a closing parenthesis token, ")"
```LBRACE```          | an opening curly brace token, "{"
```RBRACE```          | a closing curly brace token, "}"
```EOF```             | the "end of file" token

Defined in tokenizer.ts.


#### IASTWalker

Properties/Methods | Description
--- | ---
```(ast: T.INode, descend: () => any[], walker?: IASTWalker): any``` |



### AST Classes

#### Token

Properties/Methods | Description
--- | ---
```token: EToken``` | The token type
```src: string``` | The original source string
```value: any``` | 
```unit: string``` |
```type: string``` |
```start: number``` |
```end: number``` |
```range: ISourceRange``` | The range in which this token appears in the original source code
```leadingTrivia: Token[]``` | The leading trivia tokens (non-significant whitespaces and comments)
```trailingTrivia: Token[]``` | The trailing trivia tokens (non-significant whitespaces and comments)
```parent: INode``` | The token's parent node

Defined in tokenizer.ts.


#### ASTNode

This is the base class for all AST classes described below. It implements ```INode```.

All the AST classes are defined in ast.ts.

Properties/Methods | Description
--- | ---
```getParent: () => INode``` | Returns the node's parent node.
```getChildren: () => INode[]``` | Returns an array of the node's children.
```getTokens: () => Token[]``` | Returns all the tokens spanned by this node.
```walk: (walker: IASTWalker) => any``` | Walks the sub-tree using the AST walker ```walker```.
```hasError: () => boolean``` | Returns ```true``` iff there was an error while parsing this node.
```toString: () => string``` | Unparses this node and returns it's string representation (identical to the corresponding part of the input source code).
```errorTokensToString: () => string``` | Returns the source code when there was an error while parsing this node.
```getRoot: () => INode``` | Returns the root node of the AST.
```isAncestorOf: (node: INode) => boolean``` | Determines if thi snode is an ancestor of ```node```.

#### ASTNodeList\<U extends INode>

Extends ```ASTNode```.

This is a generic class for encapsulating lists of AST nodes.
It provides the base functionality for manipulating (replacing, inserting, deleting) its child nodes and a ```forEach``` method for iterating over its children.

Properties/Methods | Description
--- | ---
```constructor(nodes: U[])``` | Constructs a new list, setting its items to the contents of the array ```nodes```.
```getLength(): number``` | Returns the number of nodes in this list.
```replaceNodes(nodes: U[]): void``` | Replaces all the child nodes by the nodes in the array ```nodes```.
```insertNode(node: U, pos?: number): void``` | Inserts a new node at position "pos" or at the end if no position is provided.
```deleteNode(pos: number): void``` | Deletes the node at position "pos". If there is no node at this position, no node is deleted.
```deleteAllNodes(): void``` | Deletes all nodes from the node list.
```forEach(it: (elt: U) => void)``` | Calls the function ```it``` on each element contained in the list.
```walkChildren(walker: IASTWalker, result: any[] = []): any[]``` | Walks the list's children using the AST walker ```walker```.



#### StyleSheet

Extends ```ASTNode```.

Properties/Methods | Description
--- | ---
```constructor(ruleList: RuleList, cdo?: Token, cdc?: Token)``` | 
```insertRule: (rule: AbstractRule, pos?: number) => void``` | 
```deleteRule: (pos: number) => void``` | 
```deleteAllRules: () => void``` | 
```getRules: () => RuleList``` | 

#### AbstractRule

Extends ```ASTNode```.

Properties/Methods | Description
--- | ---
```id: string``` | A user-defined ID the user can assign to a rule.

#### RuleList

Extends ```ASTNodeList<AbstractRule>```.

Properties/Methods | Description
--- | ---
```constructor(rules: AbstractRule[], lbrace?: Token, rbrace?: Token)``` | 
```insertRule: (rule: AbstractRule, pos?: number) => void``` | 
```deleteRule: (pos: number) => void``` | 
```deleteAllRules: () => void``` | 
```getLBrace: () => Token``` | 
```getRBrace: () => Token``` | 


#### Rule

A qualified rule.

Extends ```AbstractRule```.

Properties/Methods | Description
--- | ---
```constructor(selectors?: SelectorList, declarations?: DeclarationList)``` | 
```getSelectors: () => SelectorList``` | 
```getDeclarations: () => DeclarationList``` | 
```setSelectors: (selectors: SelectorList) => void``` | 
```insertSelector: (selector: Selector, pos?: number) => void``` | 
```deleteSelector: (pos: number) => void``` | 
```deleteAllSelectors: () => void``` | 
```insertDeclaration: (declaration: Declaration, pos?: number) => void``` | 
```deleteDeclaration: (pos: number) => void``` | 
```deleteAllDeclarations: () => void``` | 


#### SelectorList

Extends ```ASTNodeList<Selector>```.

Properties/Methods | Description
--- | ---
```constructor(selectors?: Selector[])``` | 
```getSelector: (index: number) => Selector``` | 
```setSelectors: (selectors: Selector[]) => void``` | 
```setSelectors: (selectors: SelectorList) => void``` | 
```insertSelector: (selector: Selector, pos?: number) => void``` | 
```deleteSelector: (pos: number) => void``` | 
```deleteAllSelectors: () => void``` | 

#### Selector

Extends ```ComponentValueList```.

Properties/Methods | Description
--- | ---
```constructor(values: IComponentValue[], separator?: Token)``` | 
```constructor(selectorText: string)``` | 
```getText: () => string``` | 
```setText: (newText: string) => void``` | 
```getSeparator: () => Token``` | 

#### SelectorCombinator

Extends ```ComponentValue```.

Properties/Methods | Description
--- | ---
```getCombinator: () => string``` | Returns the combinator token, i.e., a whitespace or a delimiter with source ```+```, ```>```, or ```~```.

#### SimpleSelector\<U extends INode>

Extends ```ASTNode```, implements ```IComponentValue```.

This class is the base class for the specialized selector classes described below.

Properties/Methods | Description
--- | ---
```constructor(value: U, namespace?: Token, pipe?: Token)``` | 
```getNamespace: () => Token``` | If the selector has a namespace, this method returns the identifier token corresponding to the selector's namespace.
```getPipe: () => Token``` | If the selector has a namespace (including the empty namespace), this method returns the pipe delimiter token separating the namespace identifier from the actual selector.

#### TypeSelector

Extends ```SimpleSelector<Token>```.

Properties/Methods | Description
--- | ---
```constructor(type: Token, namespace?: Token, pipe?: Token)``` | 
```constructor(type: string, namespace?: string)``` | 
```getType: () => Token``` | Returns the identifier token (corresponding to an HTML tag name).

#### UniversalSelector

Extends ```SimpleSelector<Token>```.

Properties/Methods | Description
--- | ---
```constructor(asterisk: Token, namespace?: Token, pipe?: Token)``` | 
```constructor(namespace?: string)``` | 
```getType: () => Token``` | Returns the ```*``` delimiter token.

#### AttributeSelector

Extends ```SimpleSelector<BlockComponentValue>```.

Properties/Methods | Description
--- | ---
```getAttribute: () => BlockComponentValue``` | 

#### ClassSelector

Extends ```SimpleSelector<Token>```.

Properties/Methods | Description
--- | ---
```constructor(dot: Token, className: Token, namespace?: Token, pipe?: Token)``` | 
```constructor(className: string, namespace?: string)``` | 
```getClassName: () => Token``` | Returns the class name identifier token.
```getDot: () => Token``` | Returns the delimiter token containing the dot preceding the class name identifier token.

#### IDSelector

Extends ```SimpleSelector<Token>```. 

Properties/Methods | Description
--- | ---
```constructor(id: Token, namespace?: Token, pipe?: Token)``` | 
```constructor(id: string, namespace?: string)``` | 
```getID: () => Token``` | Returns the hash token containing the ID.

#### PseudoClass

Extends ```ASTNode```, implements ```IComponentValue```.

Properties/Methods | Description
--- | ---
```constructor(colon1: Token, colon2: Token, pseudoClassName: IComponentValue)``` | 
```constructor(pseudoClass: string)``` | 
```getPseudoClassName: () => IComponentValue``` | 

#### DeclarationList

Extends ```ASTNodeList<Declaration>```.

Properties/Methods | Description
--- | ---
```constructor(declarations: Declaration[], lbrace?: Token, rbrace?: Token)``` | 
```getLBrace: () => Token``` | 
```getRBrace: () => Token``` | 
```insertDeclaration: (declaration: Declaration, pos?: number) => void``` | 
```deleteDeclaration: (pos: number) => void``` | 
```deleteAllDeclarations: () => void``` | 

#### Declaration

Extends ```ASTNode```.

Properties/Methods | Description
--- | ---
```constructor(name: ComponentValueList, colon: Token, value: DeclarationValue, semicolon: Token, lcomment?: Token, rcomment?: Token)``` | 
```constructor(name: string, value: string, important?: boolean, disabled?: boolean)``` | 
```getName: () => ComponentValueList``` | 
```getNameAsString: () => string``` | 
```setName: (newName: string) => void``` | 
```getColon: () => Token``` | 
```getValue: () => DeclarationValue``` | 
```getValueAsString: (excludeImportant?: boolean) => string``` | 
```setValue: (newValue: string) => void``` | 
```getSemicolon: () => Token``` | 
```getLComment: () => Token``` | 
```getRComment: () => Token``` | 
```getDisabled: () => boolean``` | 
```setDisabled: (isDisabled: boolean) => void``` | 
```getImportant: () => boolean``` | 
```getText: () => string``` | 
```setText: (newText: string) => void``` | 

#### DeclarationValue

Extends ```ComponentValueList```.

Properties/Methods | Description
--- | ---
```constructor(values: IComponentValue[])``` | 
```getText: (excludeImportant?: boolean) => string``` | 
```setText: (value: string) => void``` | 
```getImportant: () => boolean``` | 

#### AtRule

Extends ```AbstractRule```.

This class encapsulates a generic @rule and is the base class for all the specialized @rule classes described below.

Properties/Methods | Description
--- | ---
```constructor(atKeyword: Token, prelude?: ComponentValueList, blockOrSemicolon?: INode)``` | 
```getAtKeyword: () => Token``` | Returns the at-keyword token.
```getPrelude: () => ComponentValueList``` | Returns the rule's prelude.
```getDeclarations: () => DeclarationList``` | Returns the rule's list of declarations
```getRules: () => RuleList``` | 
```getSemicolon: () => Token``` | 

#### AtCharset

Extends ```AtRule```.

This class represents an ```@charset``` rule.

Example:

```css
@charset 'utf-8';
```

Properties/Methods | Description
--- | ---
```constructor(atKeyword: Token, prelude: ComponentValueList, semicolon: Token)``` | 
```constructor(charset: string)``` | 
```getCharset: () => string``` | 

#### AtCustomMedia

Extends ```AtRule```.

This class represents an ```@custom-media``` rule.

Example:

```css
```

Properties/Methods | Description
--- | ---
```constructor(atKeyword: Token, prelude: ComponentValueList, semicolon: Token)``` | 
```constructor(extensionName: string, media: string)``` | 
```getExtensionName: () => string``` | 
```getMedia: () => ComponentValueList``` | 

#### AtDocument

Extends ```AtRule```.

This class represents an ```@document``` rule.

Example:

```css
@-moz-document url(http://localhost), domain(localhost), regexp("https:.*") {
	/*
	 * CSS rules here apply to:
	 * - The page "http://www.w3.org/".
	 * - Any page whose URL begins with "http://www.w3.org/Style/"
	 * - Any page whose URL's host is "mozilla.org" or ends with ".mozilla.org"
	 * - Any page whose URL starts with "https:"
	 */

	body {
		background: yellow;
	}
}
```

Properties/Methods | Description
--- | ---
```constructor(atKeyword: Token, prelude: ComponentValueList, block: RuleList)``` | 
```constructor(prelude: string, rules: RuleList)``` | 
```getUrl: () => string``` | 
```getUrlPrefix: () => string``` | 
```getDomain: () => string``` | 
```getRegexp: () => string``` | 

#### AtFontFace

Extends ```AtRule```.

This class represents an ```@font-face``` rule.

Example:

```css
@font-face {
	font-family: MyHelvetica;
	src: local("Helvetica Neue Bold"),
	local("HelveticaNeue-Bold"),
	url(MgOpenModernaBold.ttf);
	font-weight: bold;
}
```

Properties/Methods | Description
--- | ---
```constructor(atKeyword: Token, prelude: ComponentValueList, declarations: DeclarationList)``` | 
```constructor(declarations: DeclarationList)``` | 

#### AtHost

Extends ```AtRule```.

This class represents an ```@host``` rule.

Example:

```css
```

Properties/Methods | Description
--- | ---
```constructor(atKeyword: Token, prelude: ComponentValueList, rules: RuleList)``` | 
```constructor(rules: RuleList)``` | 

#### AtImport

Extends ```AtRule```.

This class represents an ```@import``` rule.

Example:

```css
@import url('style1.css');
@import url('style2.css') screen and (min-width: 600px);
```

Properties/Methods | Description
--- | ---
```constructor(atKeyword: Token, prelude: ComponentValueList, semicolon: Token)``` | 
```constructor(url: string, media?: string)``` | 
```getUrl: () => string``` | 
```getMedia: () => ComponentValueList``` | 

#### AtKeyframes

Extends ```AtRule```.

This class represents an ```@keyframes``` rule.

Example:

```css
@-webkit-keyframes idleimage {
	0%   { background-position: 0; }
	50%  { background-position: 100%; }
	100% { background-position: 0; }
}

@-moz-keyframes idleimage {
	0%   { background-position: 0; }
	50%  { background-position: 100%; }
	100% { background-position: 0; }
}
```

Properties/Methods | Description
--- | ---
```constructor(atKeyword: Token, prelude: ComponentValueList, rules: RuleList)``` | 
```constructor(animationName: string, rules: RuleList)``` | 
```getAnimationName: () => string``` | 

#### AtMedia

Extends ```AtRule```.

This class represents an ```@media``` rule.

Example:

```css
@media screen and (min-width: 800px) {
	body {
		padding: 1em
	}
}
```

Properties/Methods | Description
--- | ---
```constructor(atKeyword: Token, media: ComponentValueList, rules: RuleList)``` | 
```constructor(media: string, rules: RuleList)``` | 
```getMedia: () => ComponentValueList``` | 

#### AtNamespace

Extends ```AtRule```.

This class represents an ```@namespace``` rule.

Example:

```css
@namespace svg "http://www.w3.org/2000/svg";
```

Properties/Methods | Description
--- | ---
```constructor(atKeyword: Token, prelude: ComponentValueList, semicolon: Token)``` | Constructs an ```AtNamespace``` object from an at-keyword token with the source "@namespace", a prelude comprising an identifier token for the namespace prefix (optional) and a string token for the namespace URL, and a semicolon token.
```constructor(url: string, prefix?: string)``` | Constructs an ```AtNamespace``` object from a namespace URL and an optional namespace prefix.
```getUrl: () => string``` | Returns the namespace URL.
```getPrefix: () => string``` | Returns the namespace prefix if there is one.

#### AtPage

Extends ```AtRule```.

This class represents an ```@page``` rule.

Example:

```css
@page {
	margin: 5cm;
}

@page :first {
	margin-left: 0.5cm;
}
```

Properties/Methods | Description
--- | ---
```constructor(atKeyword: Token, prelude: ComponentValueList, declarations: DeclarationList)``` | Constructs an ```AtPage``` object from an at-keyword token with the source "@page", a prelude containing pseudo classes, and a list of declarations.
```constructor(pseudoClass: string, declarations: DeclarationList)``` | Constructs an ```AtPage``` object from a string specifying the pseudo class for the rule (e.g., ```:first``` in the second rule in the example), and a list of declarations.
```getPseudoClass: () => ComponentValueList``` | Returns the prelude part, i.e., the pseudo class following the ```@page``` keyword of the rule, if there is one.

#### AtSupports

Extends ```AtRule```.

This class represents an ```@supports``` rule.

Example:

```css
@supports (display: flexbox) {
	body {
		display: flex;
	}
}
```

In this example, ```(display: flexbox)``` is the prelude part of the rule, which is followed by a list of rules enclosed in curly braces.

Properties/Methods | Description
--- | ---
```constructor(atKeyword: Token, supports: ComponentValueList, rules: RuleList)``` | Constructs an ```AtSupports``` object from an at-keyword token with the source "@supports", a list of component values (the prelude), and a list of rules.
```constructor(supports: string, rules: RuleList)``` | Constructs an ```AtSupports``` object from a prelude string and a list of rules.
```getSupports: () => ComponentValueList``` | Returns the prelude part (the components after the ```@supports``` keyword) of the rule.


#### ComponentValue

Extends ```ASTNode```.

This class encapsulates a single token. ```ComponentValue```s are used as generic AST nodes when a token isn't further specialized by the parser.

Properties/Methods | Description
--- | ---
```constructor(token?: Token)``` | Constructs a new ```ComponentValue```.
```getToken: () => Token``` | Returns the encapsulated token.
```getValue: () => string``` | Returns the value.
```getType: () => EToken``` | Returns the type of the token.

#### ComponentValueList

Extends ```ASTNodeList```.

This class encapsulates a sequence of ```ComponentValue```s.

Properties/Methods | Description
--- | ---
```constructor(values: IComponentValue[])``` | Constructs a new ```ComponentValueList```.
```getValue: () => string``` | Returns the value as a string.

#### BlockComponentValue

Extends ```ComponentValueList```.

This class encapsulates a generic block, i.e., a portion of code starting with a opening parenthesis/square bracket/curly brace and ending with a closing parenthesis/square bracket/curly brace.

Properties/Methods | Description
--- | ---
```constructor(startToken: Token, endToken: Token, values: IComponentValue[])``` | Constructs a new block from a start and an end token and value tokens contained between the start and the end tokens.
```getStartToken: () => Token``` | Returns the start token.
```getEndToken: () => Token``` | Returns the end token.

#### FunctionComponentValue

Extends ```BlockComponentValue```.

This class encapsulates a function invocation, e.g., ```rgb(10, 20, 30)```.

Properties/Methods | Description
--- | ---
```constructor(name: Token, rparen: Token, args: IComponentValue[])``` | Constructs a new ```FunctionComponentValue``` from a function token, the closing parenthesis and an array of function arguments.
```getName: () => Token``` | Returns the function token containing the function name (as per the W3C specification, the function token contains the name and the opening parenthesis.)
```getArgs: () => FunctionArgumentValue[]``` | Returns the array of function arguments.

#### FunctionArgumentValue

Extends ```ComponentValueList```.

This class represents an argument to a function, such as ```10```, ```,``` in ```rgb(10, 20, 30)```. Note that it also comprises the comma separator if there is one following the actual argument.

Properties/Methods | Description
--- | ---
```constructor(values: IComponentValue[], separator?: Token)``` | Constructs a ```FunctionArgumentValue``` from an array of ```IComponentValue```s.
```getSeparator: () => Token``` | Returns the separator token (the comma) following the function argument, if there is one.

#### ImportantComponentValue

Extends ```ASTNode```.

This class represents the ```!important``` part of a property value.

Properties/Methods | Description
--- | ---
```constructor(exclamationMark: Token, important: Token)``` | Constructs an new ```ImportantComponentValue``` from an delimiter token with the source "!" and an identifier token with the source "important".
```getExclamationMark: () => Token``` | Returns the "!" delimiter token.
```getImportant: () => Token``` | Returns the "important" identifier.










