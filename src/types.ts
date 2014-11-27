import Tokenizer = require('./tokenizer');
import AST = require('./ast');


// ==================================================================
// TYPE DECLARATIONS
// ==================================================================

export interface INodeOrToken
{
	range: ISourceRange;
	toString: () => string;
}

export interface INode extends INodeOrToken
{
	getParent: () => INode;
	getChildren: () => INode[];
	isAncestorOf: (node: INode) => boolean;

	getTokens: () => Tokenizer.Token[];

	walk: (walker: AST.IASTWalker) => any;

	hasError: () => boolean;

	beautify: (level?: number) => string;
}

export interface ISourceRange
{
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
}
