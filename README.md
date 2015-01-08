Boreas: A CSS Parser in TypeScript
==================================

Boreas is a CSS parser written in TypeScript (which compiles to JavaScript). It can be used both in node.js projects and in the browser (work in progress).

The project was done because we needed a reliable, robust CSS parser for our synchronized Web testing tool [Ghostlab](http://www.vanamco.com/ghostlab).

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
on the command line. The modules will be compiled into the `lib` directory.


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
`parse` | parses a complete style sheet.
`parseRule` | parses a single rule (either a qualified rule or an at-rule).
`parseSelectors` | parses a list of selectors.
`parseSelector` | parses a single selector.
`parseDeclarations` | parses a list of declarations (i.e., CSS properties).
`parseDeclaration` | parses a single declaration.

All the parse functions take, apart from the mandatory CSS source as first argument, an optional "options" argument, which is a hash with the following (optional) properties:

Properties | Description
--- | ---
`lineBase` | The number of the first line, defaults to 0.
`columnBase` | The number of the first column, defaults to 0.
`tokenizeComments` | Flag indicating whether start and end comment tokens should be parsed as individual tokens and the contents of the comment should also be parsed.

### Unparsing

Every AST class and tokens have a `toString()` method, which returns the a string identical to the corresponding part of the input.

### AST Manipulations

Given an AST structure, the AST objects have methods by means of which the AST can be manipulated. E.g., [`RuleList`](#rulelist)s or [`SelectorList`](#selectorlist)s or [`DeclarationList`](#declarationlist)s have methods to insert or delete rules, selectors, or declarations, respectively.

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
`constructor(src: string, options?: ITokenizerOptions)` | Constructs a tokenizer for tokenizing the source `src`. Optinonally, an options hash, as described below, can be passed.
`nextToken(): `[`Token`](#token) | Returns the next token in the token stream. Leading and trailing whitespaces and comments of a token are returned in the leadingTrivia and trailingTrivia properties of the token.

`ITokenizerOptions` is a hash which can have the following properties:

Properties | Description
--- | ---
`lineBase?: number` | The number of the first line, defaults to 0.
`columnBase?: number` | The number of the first column, defaults to 0.
`tokenizeComments?: boolean` | Flag indicating whether start and end comment tokens should be parsed as individual tokens and the contents of the comment should also be parsed.



### Parser

Properties/Methods | Description
--- | ---
`constructor(src: string, options?: ITokenizerOptions)` | Constructs a new parser object for parsing the source `src`. Optionally, an options hash (as described in the Tokenizer) can be passed.
`parseStyleSheet(): `[`StyleSheet`](#stylesheet) | Parses a style sheet.
`parseRuleBlock(): `[`RuleList`](#rulelist) | Parses a block of rules, i.e., rules contained within curly braces, "{" (rules) "}".
`parseRuleList(isBlock?: boolean): `[`RuleList`](#rulelist) | Parses a list of rules. If `isBlock` is set to true, it is expected that the rules are enclosed in curly braces.
`parseQualifiedRule(): `[`Rule`](#rule) | Parses a qualified rule.
`parseAtRule(): `[`AtRule`](#atrule) | Parses an (arbitrary) @rule.
`parseDeclarationList(): `[`DeclarationList`](#declarationlist) | Parses a list of declarations (e.g., properties).
`parseDeclaration(throwErrors: boolean = true, omitSemicolon?: boolean): `[`Declaration`](#declaration) | Parses a single declaration.
`parseTrailingTokensForDisabledDeclarations(token: `[`Token`](#token)`): `[`Declaration`](#declaration)[] | Parses the trailing tokens of the current token for disabled declarations (declarations which are commented out in the source code).
`parseDisabledDeclaration(token: `[`Token`](#token)`, throwErrors: boolean = true): `[`Declaration`](#declaration) | Parses a single disabled (i.e., commented out) declaration.
`parseDeclarationValue(): `[`DeclarationValue`](#declarationvalue) | Parses a declaration value (i.e., the part that comes after the ":" in a declaration).
`parseSelectorList(): `[`SelectorList`](#selectorlist) | Parses a list of selectors.
`parseSelector(): `[`Selector`](#selector) | Parses a single selector.
`parseComponentValueList(...endTokens: `[`EToken`](#etoken)`[]): `[`ComponentValue`](#componentvalue)`[]` | Parses a list of component values.
`parseBlock(): `[`BlockComponentValue`](#blockcomponentvalue) | Parses a block component value (any block enclosed in parentheses, square brackets, or curly braces).
`parseFunction(): `[`FunctionComponentValue`](#functioncomponentvalue) | Parses a function.

## AST Class Reference

### Types

#### INode
This is a TypeScript interface which all AST classes and the [`Token`](#token) class implement. It has the following members:

Properties/Methods | Description
--- | ---
`range: `[`ISourceRange`](#isourcerange) | The start and end positions within the source code
`getParent: () => `[`INode`](#inode) | Returns the parent node
`getChildren: () => `[`INode`](#inode)`[]` | Returns an array containing all the child nodes
`isAncestorOf: (node: `[`INode`](#inode)`) => boolean` | Determines if this node is an ancestor of "node"
`getTokens: () => `[`Token`](#token)`[]` | Returns an array containing all the tokens that this node spans
`walk: (walker: `[`IASTWalker`](#iastwalker)`) => any` | Walks the sub-tree using the tree walker "walker"
`hasError: () => boolean` | Returns `true` iff there was an error while parsing this node
`toString: () => string` | Unparses this node and returns it's string representation (identical to the corresponding part of the input source code)

Defined in types.ts.

#### IComponentValue

Extends [`INode`](#inode).

Properties/Methods | Description
--- | ---
`getValue: () => string` | Returns a string representation of the component value.


#### ISourceRange

Properties/Methods | Description
--- | ---
`startLine: number` | The start line of the token/AST node.
`startColumn: number` | The start column of the token/AST node.
`endLine: number` | The end line of the token/AST node.
`endColumn: number` | The end column (exclusive) of the token/AST node.

Defined in types.ts.


#### EToken

This _enum_ defines the token types. The following enum values are defined (in accordance with the W3C specification):

Properties        | Description
----------------- | ------------------------
`IDENT`           | an identifier token
`FUNCTION`        | a function token, i.e., an identifier followed by an opening parenthesis, "("
`AT_KEYWORD`      | an at-keyword, i.e., a identifier preceded by the at character, "@"
`HASH`            | a hash, i.e., an identifier preceded by the hash character, "#"
`STRING`          | a string
`BAD_STRING`      | a string with a syntax error
`URL`             | a URL
`BAD_URL`         | a URL with a syntax error
`DELIM`           | a delimiter token
`NUMBER`          | a number
`PERCENTAGE`      | a percentage token, i.e., a number followed by the percentage sign, "%"
`DIMENSION`       | a dimension token, i.e., a number followed by a dimension such as "px", "em", etc.
`UNICODE_RANGE`   | a unicode range, i.e., something of the form U+0123?? or U+012345-ABCDEF
`INCLUDE_MATCH`   | an include match token, "~="
`DASH_MATCH`      | a dash match token, "|="
`PREFIX_MATCH`    | a prefix match token, "^="
`SUFFIX_MATCH`    | a suffix match token, "$="
`SUBSTRING_MATCH` | a substring match token, "*="
`COLUMN`          | a column token, "||"
`WHITESPACE`      | a whitespace token, consisting of a sequence of space, tab, and newline characters
`COMMENT`         | a comment, i.e., a string enclosed in "/\*", "\*/"
`CDO`             | an opening HTML comment token, "<!--"
`CDC`             | a closing HTML comment token, "-->"
`COLON`           | a colon token, ":"
`SEMICOLON`       | a semicolon token, ";"
`COMMA`           | a comma token, ","
`LBRACKET`        | an opening square bracket token, "["
`RBRACKET`        | a closing square bracket token, "]"
`LPAREN`          | an opening parenthesis token, "("
`RPAREN`          | a closing parenthesis token, ")"
`LBRACE`          | an opening curly brace token, "{"
`RBRACE`          | a closing curly brace token, "}"
`EOF`             | the "end of file" token

Defined in tokenizer.ts.


#### IASTWalker

Properties/Methods | Description
--- | ---
`(ast: `[`INode`](#inode)`, descend: () => any[], walker?: IASTWalker): any` |



### AST Classes

#### Token

This class represents a single token.

Properties/Methods | Description
--- | ---
`token: `[`EToken`](#etoken) | The token type.
`src: string` | The original source string.
`value: any` | The token's value, if applicable. The value is defined for the following token types: <ul><li>`AT_KEYWORD` (the identifier after the "@"),</li><li>`BAD_STRING` (the string without the enclosing quotes),</li><li>`DIMENSION` (the numeric value as a number),</li><li>`FUNCTION` (the function name),</li><li>`HASH` (the identifier after the "#"),</li><li>`NUMBER` (the numeric value as a number),</li><li>`PERCENTAGE` (the numberic value as a number),</li><li>`STRING` (the string without the enclosing quotes),</li><li>`URL` (the URL string without the "url(", ")").</li></ul>
`unit: string` | The token's unit, if available. The unit is defined for the token type `DIMENSION` and contains strings like "px", "em", etc.
`type: string` |
`start: number` | Defined for the token type `UNICODE_RANGE`. Contains the start of the unicode range.
`end: number` | Defined for the token type `UNICODE_RANGE`. Contains the end of the unicode range.
`range: `[`ISourceRange`](#isourcerange) | The range in which this token appears in the original source code
`leadingTrivia: `[`Token`](#token)`[]` | The leading trivia tokens (non-significant whitespaces and comments)
`trailingTrivia: `[`Token`](#token)`[]` | The trailing trivia tokens (non-significant whitespaces and comments)
`parent: `[`INode`](#inode) | The token's parent node

Defined in tokenizer.ts.


#### ASTNode

This is the base class for all AST classes described below. It implements [`INode`](#inode).

All the AST classes are defined in ast.ts.

Properties/Methods | Description
--- | ---
`getParent: () => `[`INode`](#inode) | Returns the node's parent node.
`getChildren: () => `[`INode`](#inode)`[]` | Returns an array of the node's children.
`getTokens: () => `[`Token`](#token)`[]` | Returns all the tokens spanned by this node.
`walk: (walker: `[`IASTWalker`](#iastwalker)`) => any` | Walks the sub-tree using the AST walker `walker`.
`hasError: () => boolean` | Returns `true` iff there was an error while parsing this node.
`toString: () => string` | Unparses this node and returns it's string representation (identical to the corresponding part of the input source code).
`errorTokensToString: () => string` | Returns the source code when there was an error while parsing this node.
`getRoot: () => `[`INode`](#inode) | Returns the root node of the AST.
`isAncestorOf: (node: `[`INode`](#inode)`) => boolean` | Determines if thi snode is an ancestor of `node`.

#### ASTNodeList\<U extends [INode](#inode)>

Extends [`ASTNode`](#astnode).

This is a generic class for encapsulating lists of AST nodes.
It provides the base functionality for manipulating (replacing, inserting, deleting) its child nodes and a `forEach` method for iterating over its children.

Properties/Methods | Description
--- | ---
`constructor(nodes: U[])` | Constructs a new list, setting its items to the contents of the array `nodes`.
`getLength(): number` | Returns the number of nodes in this list.
`replaceNodes(nodes: U[]): void` | Replaces all the child nodes by the nodes in the array `nodes`.
`insertNode(node: U, pos?: number): void` | Inserts a new node at position "pos" or at the end if no position is provided.
`deleteNode(pos: number): void` | Deletes the node at position "pos". If there is no node at this position, no node is deleted.
`deleteAllNodes(): void` | Deletes all nodes from the node list.
`forEach(it: (elt: U) => void)` | Calls the function `it` on each element contained in the list.
`walkChildren(walker: `[`IASTWalker`](#iastwalker)`, result: any[] = []): any[]` | Walks the list's children using the AST walker `walker`.



#### StyleSheet

Extends [`ASTNode`](#astnode).

Properties/Methods | Description
--- | ---
`constructor(ruleList: `[`RuleList`](#rulelist)`, cdo?: `[`Token`](#token)`, cdc?: `[`Token`](#token)`)` | 
`insertRule: (rule: `[`AbstractRule`](#abstractrule)`, pos?: number) => void` | 
`deleteRule: (pos: number) => void` | 
`deleteAllRules: () => void` | 
`getRules: () => `[`RuleList`](#rulelist) | 

#### AbstractRule

Extends [`ASTNode`](#astnode).

This class is the base class for [`Rule`](#rule) and [`AtRule`](#atrule).

Properties/Methods | Description
--- | ---
`id: string` | A user-defined ID the user can assign to a rule.

#### RuleList

Extends [`ASTNodeList`](#astnodelistu-extends-inode)`<`[`AbstractRule`](#abstractrule)`>`.

Properties/Methods | Description
--- | ---
`constructor(rules: `[`AbstractRule`](#abstractrule)`[], lbrace?: `[`Token`](#token)`, rbrace?: `[`Token`](#token)`)` | 
`insertRule: (rule: `[`AbstractRule`](#abstractrule)`, pos?: number) => void` | 
`deleteRule: (pos: number) => void` | 
`deleteAllRules: () => void` | 
`getLBrace: () => `[`Token`](#token) | 
`getRBrace: () => `[`Token`](#token) | 


#### Rule

A qualified rule.

Extends [`AbstractRule`](#abstractrule).

Properties/Methods | Description
--- | ---
`constructor(selectors?: `[`SelectorList`](#selectorlist)`, declarations?: `[`DeclarationList`](#declarationlist)`)` | 
`getSelectors: () => `[`SelectorList`](#selectorlist) | 
`getDeclarations: () => `[`DeclarationList`](#declarationlist) | 
`setSelectors: (selectors: `[`SelectorList`](#selectorlist)`) => void` | 
`insertSelector: (selector: `[`Selector`](#selector)`, pos?: number) => void` | 
`deleteSelector: (pos: number) => void` | 
`deleteAllSelectors: () => void` | 
`insertDeclaration: (declaration: `[`Declaration`](#declaration)`, pos?: number) => void` | 
`deleteDeclaration: (pos: number) => void` | 
`deleteAllDeclarations: () => void` | 


#### SelectorList

Extends [`ASTNodeList`](#astnodelistu-extends-inode)`<`[`Selector`](#selector)`>`.

Properties/Methods | Description
--- | ---
`constructor(selectors?: `[`Selector`](#selector)`[])` | 
`getSelector: (index: number) => `[`Selector`](#selector) | 
`setSelectors: (selectors: `[`Selector`](#selector)`[]) => void` | 
`setSelectors: (selectors: `[`SelectorList`](#selectorlist)`) => void` | 
`insertSelector: (selector: `[`Selector`](#selector)`, pos?: number) => void` | 
`deleteSelector: (pos: number) => void` | 
`deleteAllSelectors: () => void` | 

#### Selector

Extends [`ComponentValueList`](#componentvaluelist).

Properties/Methods | Description
--- | ---
`constructor(values: `[`IComponentValue`](#icomponentvalue)`[], separator?: `[`Token`](#token)`)` | 
`constructor(selectorText: string)` | 
`getText: () => string` | 
`setText: (newText: string) => void` | 
`getSeparator: () => `[`Token`](#token) | 

#### SelectorCombinator

Extends [`ComponentValue`](#componentvalue).

Properties/Methods | Description
--- | ---
`getCombinator: () => string` | Returns the combinator token, i.e., a whitespace or a delimiter with source `+`, `>`, or `~`.

#### SimpleSelector\<U extends [INode](#inode)>

Extends [`ASTNode`](#astnode), implements [`IComponentValue`](#icomponentvalue).

This class is the base class for the specialized selector classes described below.

Properties/Methods | Description
--- | ---
`constructor(value: U, namespace?: `[`Token`](#token)`, pipe?: `[`Token`](#token)`)` | 
`getNamespace: () => `[`Token`](#token) | If the selector has a namespace, this method returns the identifier token corresponding to the selector's namespace.
`getPipe: () => `[`Token`](#token) | If the selector has a namespace (including the empty namespace), this method returns the pipe delimiter token separating the namespace identifier from the actual selector.

#### TypeSelector

Extends [`SimpleSelector`](#simpleselectoru-extends-inode)`<`[`Token`](#token)`>`.

Properties/Methods | Description
--- | ---
`constructor(type: `[`Token`](#token)`, namespace?: `[`Token`](#token)`, pipe?: `[`Token`](#token)`)` | 
`constructor(type: string, namespace?: string)` | 
`getType: () => `[`Token`](#token) | Returns the identifier token (corresponding to an HTML tag name).

#### UniversalSelector

Extends [`SimpleSelector`](#simpleselectoru-extends-inode)`<`[`Token`](#token)`>`.

Properties/Methods | Description
--- | ---
`constructor(asterisk: `[`Token`](#token)`, namespace?: `[`Token`](#token)`, pipe?: `[`Token`](#token)`)` | 
`constructor(namespace?: string)` | 
`getType: () => `[`Token`](#token) | Returns the `*` delimiter token.

#### AttributeSelector

Extends [`SimpleSelector`](#simpleselectoru-extends-inode)`<`[`BlockComponentValue`](#blockcomponentvalue)`>`.

Properties/Methods | Description
--- | ---
`getAttribute: () => `[`BlockComponentValue`](#blockcomponentvalue) | 

#### ClassSelector

Extends [`SimpleSelector`](#simpleselectoru-extends-inode)`<`[`Token`](#token)`>`.

Properties/Methods | Description
--- | ---
`constructor(dot: `[`Token`](#token)`, className: `[`Token`](#token)`, namespace?: `[`Token`](#token)`, pipe?: `[`Token`](#token)`)` | 
`constructor(className: string, namespace?: string)` | 
`getClassName: () => `[`Token`](#token) | Returns the class name identifier token.
`getDot: () => `[`Token`](#token) | Returns the delimiter token containing the dot preceding the class name identifier token.

#### IDSelector

Extends [`SimpleSelector`](#simpleselectoru-extends-inode)`<`[`Token`](#token)`>`. 

Properties/Methods | Description
--- | ---
`constructor(id: `[`Token`](#token)`, namespace?: `[`Token`](#token)`, pipe?: `[`Token`](#token)`)` | 
`constructor(id: string, namespace?: string)` | 
`getID: () => `[`Token`](#token) | Returns the hash token containing the ID.

#### PseudoClass

Extends [`ASTNode`](#astnode), implements [`IComponentValue`](#icomponentvalue).

Properties/Methods | Description
--- | ---
`constructor(colon1: `[`Token`](#token)`, colon2: `[`Token`](#token)`, pseudoClassName: `[`IComponentValue`](#icomponentvalue)`)` | 
`constructor(pseudoClass: string)` | 
`getPseudoClassName: () => `[`IComponentValue`](#icomponentvalue) | 

#### DeclarationList

Extends [`ASTNodeList`](#astnodelistu-extends-inode)`<`[`Declaration`](#declaration)`>`.

This class encapsulates a list of declaration, optionally enclosed in curly braces.

Properties/Methods | Description
--- | ---
`constructor(declarations: `[`Declaration`](#declaration)`[], lbrace?: `[`Token`](#token)`, rbrace?: `[`Token`](#token)`)` | Constructs a DeclarationList from an array of declarations and optional opening and closing curly brace tokens.
`getLBrace: () => `[`Token`](#token) | Returns the opening curly brace if there is one.
`getRBrace: () => `[`Token`](#token) | Returns the closing curly brace if there is one.
`insertDeclaration: (declaration: `[`Declaration`](#declaration)`, pos?: number) => void` | Inserts a new declaration into the list. If the `pos` argument isn't specified, the new declaration will be appended to the list.
`deleteDeclaration: (pos: number) => void` | Deletes the declaration at position `pos` from this list.
`deleteAllDeclarations: () => void` | Removes all declarations from this list.

#### Declaration

Extends [`ASTNode`](#astnode).

This class encapsulates a declaration (e.g., a CSS propery).

Example:

```css
h1 {
	color: red;
	border: 1px solid yellow !important;
	/* padding: 0; */
}
```

In this example, "color: red;" and "border: 1px solid yellow !important;" are represented by [`Declaration`](#declaration)s.

The parser also supports _disabled_ declarations, i.e., declarations which are commented out like "/* padding: 0; */" in the example. I.e., the parser will also parse such declarations and set the "disabled" flag to `true`.

Properties/Methods | Description
--- | ---
`constructor(name: `[`ComponentValueList`](#componentvaluelist)`, colon: `[`Token`](#token)`, value: DeclarationValue, semicolon: `[`Token`](#token)`, lcomment?: `[`Token`](#token)`, rcomment?: `[`Token`](#token)`)` | Constructs a [`Declaration`](#declaration) from a name ("color" and "border" in the above example), a colon token, a declaration value (representing "red" and "1px solid yellow !important" in the example), and a semicolon token. If the declaration is disabled, the `lcomment` and `rcomment` tokens are delimiter tokens with sources "/\*" and "\*/", respectively.
`constructor(name: string, value: string, important?: boolean, disabled?: boolean)` | Constructs a `DeclarationValue` from a name, a value, an optional flag if this declaration has an appended `!important` and an optional flag if this declaration is disabled (i.e., commented out).
`getName: () => `[`ComponentValueList`](#componentvaluelist) | Return the name ("color", "border", or "padding" in the above example).
`getNameAsString: () => string` | Returns the name as a string.
`setName: (newName: string) => void` | Replaces the declaration's name by `newName`.
`getColon: () => `[`Token`](#token) | Returns the colon token.
`getValue: () => `[`DeclarationValue`](#declarationvalue) | Returns the declaration's value.
`getValueAsString: (excludeImportant?: boolean) => string` | Returns the declarations' value as a string.
`setValue: (newValue: string) => void` | Replaces the declaration's value by `newValue`.
`getSemicolon: () => `[`Token`](#token) | Returns the semicolon token.
`getLComment: () => `[`Token`](#token) | Returns the opening comment delimiter token, if this is a disabled declaration.
`getRComment: () => `[`Token`](#token) | Returns the closing comment delimiter token, if this is a disabled declaration.
`getDisabled: () => boolean` | Returns `true` iff this declaration is disabled.
`setDisabled: (isDisabled: boolean) => void` | Enables/disables this declaration (i.e., removes/adds comment tokens).
`getImportant: () => boolean` | Returns `true` iff the declaration's value contains `!important`.
`getText: () => string` | Returns a textual representation of the declaration.
`setText: (newText: string) => void` | Parses `newText` and replaces the current declaration with the result.

#### DeclarationValue

Extends [`ComponentValueList`](#componentvaluelist).

This class encapsulates the value part of a declaration (e.g., a property).

Example:

```css
h1 {
	color: red;
	border: 1px solid yellow !important;
}
```

In this example, "red" and "1px solid yellow !important" are represented by `DeclarationValue`s.

Properties/Methods | Description
--- | ---
`constructor(values: `[`IComponentValue`](#icomponentvalue)`[])` | Constructs a new `DeclarationValue` from an array of component values.
`getText: (excludeImportant?: boolean) => string` | Returns a textual representation of the value.
`setText: (value: string) => void` | Replaces the old value by the components contained in `value` after parsing the string.
`getImportant: () => boolean` | Returns true iff the value contains `!important`.

#### AtRule

Extends [`AtRule`](#atrule).

This class encapsulates a generic @rule and is the base class for all the specialized @rule classes described below.

Properties/Methods | Description
--- | ---
`constructor(atKeyword: `[`Token`](#token)`, prelude?: `[`ComponentValueList`](#componentvaluelist)`, blockOrSemicolon?: `[`INode`](#inode)`)` | Constructs an `AtRule` from a (possibly vendor-prefixed) at-keyword token, a prelude (i.e., the part between the at-keyword and the body of the rule or the semicolon if the rule doesn't have a body), and its body (or the semicolon token if there is no body).
`getAtKeyword: () => `[`Token`](#token) | Returns the at-keyword token.
`getPrelude: () => `[`ComponentValueList`](#componentvaluelist) | Returns the rule's prelude.
`getDeclarations: () => `[`DeclarationList`](#declarationlist) | Returns the rule's list of declarations if this @rule has a body of declarations (e.g., `@font-face` or `@page`).
`getRules: () => `[`RuleList`](#rulelist) | Returns the rule's list of rules if this @rule has a body of rules (e.g., `@media` or `@supports`).
`getSemicolon: () => `[`Token`](#token) | Returns the semicolon token if this @rule has no body (e.g., `@charset`, `@import`, or `@namespace`).

#### AtCharset

Extends [`AtRule`](#atrule).

This class represents an `@charset` rule.

Example:

```css
@charset 'utf-8';
```

Properties/Methods | Description
--- | ---
`constructor(atKeyword: `[`Token`](#token)`, prelude: `[`ComponentValueList`](#componentvaluelist)`, semicolon: `[`Token`](#token)`)` | Constructs an `AtCharset` object from an at-keyword token with the source "@charset", a prelude, which is a string token representing the character encoding, and a semicolon token.
`constructor(charset: string)` | Constructs an `AtCharset` object with the character encoding specified.
`getCharset: () => string` | Returns the charset.

#### AtCustomMedia

Extends [`AtRule`](#atrule).

This class represents an `@custom-media` rule.

Example:

```css
```

Properties/Methods | Description
--- | ---
`constructor(atKeyword: `[`Token`](#token)`, prelude: `[`ComponentValueList`](#componentvaluelist)`, semicolon: `[`Token`](#token)`)` | Constructs an `AtCustomMedia` object from an at-keyword token with the source "@custom-media" (possibly vendor-prefixed), a prelude XXXXX, and a semicolon token.
`constructor(extensionName: string, media: string)` | 
`getExtensionName: () => string` | 
`getMedia: () => `[`ComponentValueList`](#componentvaluelist) | 

#### AtDocument

Extends [`AtRule`](#atrule).

This class represents an `@document` rule.

Example:

```css
@-moz-document url(http://localhost), domain(localhost), regexp("https:.*") {
	body {
		background: yellow;
	}
}
```

In this example, the CSS rules within the `@document` rule applies to

* the page "http://www.w3.org/",
* any page whose URL begins with "http://www.w3.org/Style/",
* any page whose URL's host is "mozilla.org" or ends with ".mozilla.org",
* any page whose URL starts with "https:".

Properties/Methods | Description
--- | ---
`constructor(atKeyword: `[`Token`](#token)`, prelude: `[`ComponentValueList`](#componentvaluelist)`, block: `[`RuleList`](#rulelist)`)` | Constructs an `AtDocument` from an at-keyword token with the source "@document" (might be vendor-prefixed), a prelude containing URL tokens and function invocations, and a list of rules.
`constructor(prelude: string, rules: `[`RuleList`](#rulelist)`)` | Constructs an `AtDocument` from a prelude string and a list of rules.
`getUrl: () => string` | Returns the URL if there is one.
`getUrlPrefix: () => string` | Returns the URL prefix if there is one.
`getDomain: () => string` | Returns the domain if there is one.
`getRegexp: () => string` | Returns the Regexp if there is one.

#### AtFontFace

Extends [`AtRule`](#atrule).

This class represents an `@font-face` rule.

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
`constructor(atKeyword: `[`Token`](#token)`, prelude: `[`ComponentValueList`](#componentvaluelist)`, declarations: `[`DeclarationList`](#declarationlist)`)` | Constructs an `AtFontFace` object from an at-keyword with the source "@font-face", an (empty) prelude, and a list of declarations.
`constructor(declarations: `[`DeclarationList`](#declarationlist)`)` | Constructs an `AtFontFace` object from a list of declarations.

#### AtHost

Extends [`AtRule`](#atrule).

This class represents an `@host` rule.

Example:

```css
```

Properties/Methods | Description
--- | ---
`constructor(atKeyword: `[`Token`](#token)`, prelude: `[`ComponentValueList`](#componentvaluelist)`, rules: `[`RuleList`](#rulelist)`)` | 
`constructor(rules: `[`RuleList`](#rulelist)`)` | 

#### AtImport

Extends [`AtRule`](#atrule).

This class represents an `@import` rule.

Example:

```css
@import url('style1.css');
@import url('style2.css') screen and (min-width: 600px);
```

Properties/Methods | Description
--- | ---
`constructor(atKeyword: `[`Token`](#token)`, prelude: `[`ComponentValueList`](#componentvaluelist)`, semicolon: `[`Token`](#token)`)` | Constructs an `AtImport` object from an at-keyword token with the source "@import", a prelude containing the reference to the imported stylesheet (either as a string or a URL token), and a semicolon token.
`constructor(url: string, media?: string)` | Constructs an `AtImport` object from a URL (the stylesheet to import) and an optional media string.
`getUrl: () => string` | Returns the URL of the imported stylesheet.
`getMedia: () => `[`ComponentValueList`](#componentvaluelist) | Returns the media if defined.

#### AtKeyframes

Extends [`AtRule`](#atrule).

This class represents an `@keyframes` rule.

Example:

```css
@-webkit-keyframes moving-image {
	0%   { background-position: 0; }
	50%  { background-position: 100%; }
	100% { background-position: 0; }
}

@-moz-keyframes moving-image {
	0%   { background-position: 0; }
	50%  { background-position: 100%; }
	100% { background-position: 0; }
}
```

Properties/Methods | Description
--- | ---
`constructor(atKeyword: `[`Token`](#token)`, prelude: `[`ComponentValueList`](#componentvaluelist)`, rules: `[`RuleList`](#rulelist)`)` | Constructs an `AtKeyframes` object from a (possibly vendor-prefixed) at-keyword token, a prelude containing a single identifier token (the name of the animation), and a list of rules.
`constructor(animationName: string, rules: `[`RuleList`](#rulelist)`)` | Constructs an `AtKeyframes` object from an animation name and a list of rules.
`getAnimationName: () => string` | Returns the animation name.

#### AtMedia

Extends [`AtRule`](#atrule).

This class represents an `@media` rule.

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
`constructor(atKeyword: `[`Token`](#token)`, media: `[`ComponentValueList`](#componentvaluelist)`, rules: `[`RuleList`](#rulelist)`)` | Constracts an `AtMedia` object from an at-keyword token with the source "@media", the media list (the component values making up `screen and (min-width: 800px)` in the above example), and a list of rules.
`constructor(media: string, rules: `[`RuleList`](#rulelist)`)` | Constructs an `AtMedia` object from a media string (e.g., "screen and (min-width: 800px)") and a list of rules.
`getMedia: () => `[`ComponentValueList`](#componentvaluelist) | Returns the media list.

#### AtNamespace

Extends [`AtRule`](#atrule).

This class represents an `@namespace` rule.

Example:

```css
@namespace svg "http://www.w3.org/2000/svg";
```

In this example, "svg" is the (optional) namespace prefix, followed by the namespace URL.


Properties/Methods | Description
--- | ---
`constructor(atKeyword: `[`Token`](#token)`, prelude: `[`ComponentValueList`](#componentvaluelist)`, semicolon: `[`Token`](#token)`)` | Constructs an `AtNamespace` object from an at-keyword token with the source "@namespace", a prelude comprising an identifier token for the namespace prefix (optional) and a string token for the namespace URL, and a semicolon token.
`constructor(url: string, prefix?: string)` | Constructs an `AtNamespace` object from a namespace URL and an optional namespace prefix.
`getUrl: () => string` | Returns the namespace URL.
`getPrefix: () => string` | Returns the namespace prefix if there is one.

#### AtPage

Extends [`AtRule`](#atrule).

This class represents an `@page` rule.

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
`constructor(atKeyword: `[`Token`](#token)`, prelude: `[`ComponentValueList`](#componentvaluelist)`, declarations: `[`DeclarationList`](#declarationlist)`)` | Constructs an `AtPage` object from an at-keyword token with the source "@page", a prelude containing pseudo classes, and a list of declarations.
`constructor(pseudoClass: string, declarations: `[`DeclarationList`](#declarationlist)`)` | Constructs an `AtPage` object from a string specifying the pseudo class for the rule (e.g., `:first` in the second rule in the example), and a list of declarations.
`getPseudoClass: () => `[`ComponentValueList`](#componentvaluelist) | Returns the prelude part, i.e., the pseudo class following the `@page` keyword of the rule, if there is one.

#### AtSupports

Extends [`AtRule`](#atrule).

This class represents an `@supports` rule.

Example:

```css
@supports (display: flexbox) {
	body {
		display: flex;
	}
}
```

In this example, `(display: flexbox)` is the prelude part of the rule, which is followed by a list of rules enclosed in curly braces.

Properties/Methods | Description
--- | ---
`constructor(atKeyword: `[`Token`](#token)`, supports: `[`ComponentValueList`](#componentvaluelist)`, rules: `[`RuleList`](#rulelist)`)` | Constructs an `AtSupports` object from an at-keyword token with the source "@supports", a list of component values (the prelude), and a list of rules.
`constructor(supports: string, rules: `[`RuleList`](#rulelist)`)` | Constructs an `AtSupports` object from a prelude string and a list of rules.
`getSupports: () => `[`ComponentValueList`](#componentvaluelist) | Returns the prelude part (the components after the `@supports` keyword) of the rule.


#### ComponentValue

Extends [`ASTNode`](#astnode).

This class encapsulates a single token. `ComponentValue`s are used as generic AST nodes when a token isn't further specialized by the parser.

Properties/Methods | Description
--- | ---
`constructor(token?: `[`Token`](#token)`)` | Constructs a new `ComponentValue`.
`getToken: () => `[`Token`](#token) | Returns the encapsulated token.
`getValue: () => string` | Returns the value.
`getType: () => `[`EToken`](#etoken) | Returns the type of the token.

#### ComponentValueList

Extends [`ASTNodeList`](#astnodelistu-extends-inode).

This class encapsulates a sequence of [`ComponentValue`](#componentvalue)s.

Properties/Methods | Description
--- | ---
`constructor(values: `[`IComponentValue`](#icomponentvalue)`[])` | Constructs a new `ComponentValueList`.
`getValue: () => string` | Returns the value as a string.

#### BlockComponentValue

Extends [`ComponentValueList`](#componentvaluelist).

This class encapsulates a generic block, i.e., a portion of code starting with a opening parenthesis/square bracket/curly brace and ending with a closing parenthesis/square bracket/curly brace.

Properties/Methods | Description
--- | ---
`constructor(startToken: `[`Token`](#token)`, endToken: `[`Token`](#token)`, values: `[`IComponentValue`](#icomponentvalue)`[])` | Constructs a new block from a start and an end token and value tokens contained between the start and the end tokens.
`getStartToken: () => `[`Token`](#token) | Returns the start token.
`getEndToken: () => `[`Token`](#token) | Returns the end token.

#### FunctionComponentValue

Extends [`BlockComponentValue`](#blockcomponentvalue).

This class encapsulates a function invocation, e.g., `rgb(10, 20, 30)`.

Properties/Methods | Description
--- | ---
`constructor(name: `[`Token`](#token)`, rparen: `[`Token`](#token)`, args: `[`IComponentValue`](#icomponentvalue)`[])` | Constructs a new `FunctionComponentValue` from a function token, the closing parenthesis and an array of function arguments.
`getName: () => `[`Token`](#token) | Returns the function token containing the function name (as per the W3C specification, the function token contains the name and the opening parenthesis.)
`getArgs: () => `[`FunctionArgumentValue`](#functionargumentvalue)`[]` | Returns the array of function arguments.

#### FunctionArgumentValue

Extends [`ComponentValueList`](#componentvaluelist).

This class represents an argument to a function, such as `10`, `,` in `rgb(10, 20, 30)`. Note that it also comprises the comma separator if there is one following the actual argument.

Properties/Methods | Description
--- | ---
`constructor(values: `[`IComponentValue`](#icomponentvalue)`[], separator?: `[`Token`](#token)`)` | Constructs a `FunctionArgumentValue` from an array of [`IComponentValue`](#icomponentvalue)s.
`getSeparator: () => `[`Token`](#token) | Returns the separator token (the comma) following the function argument, if there is one.

#### ImportantComponentValue

Extends [`ASTNode`](#astnode).

This class represents the `!important` part of a property value.

Properties/Methods | Description
--- | ---
`constructor(exclamationMark: `[`Token`](#token)`, important: `[`Token`](#token)`)` | Constructs an new `ImportantComponentValue` from an delimiter token with the source "!" and an identifier token with the source "important".
`getExclamationMark: () => `[`Token`](#token) | Returns the "!" delimiter token.
`getImportant: () => `[`Token`](#token) | Returns the "important" identifier.


# License

MIT

Copyright (C) by [Vanamco AG](http://www.vanamco.com)
