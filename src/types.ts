import Tokenizer = require('./tokenizer');
import AST = require('./ast');


// ==================================================================
// TYPE DECLARATIONS
// ==================================================================

export interface INode
{
	range: ISourceRange;

	getParent: () => INode;
	getChildren: () => INode[];
	isAncestorOf: (node: INode) => boolean;

	getTokens: () => Tokenizer.Token[];
	walk: (walker: AST.IASTWalker) => any;

	hasError: () => boolean;
	toString: () => string;
}

export interface ISourceRange
{
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
}
