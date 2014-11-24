import Tokenizer = require('./tokenizer');

// ==================================================================
// TYPE DECLARATIONS
// ==================================================================

export interface INode
{
	range: ISourceRange;
	parent: INode;
	children: INode[];
	errorTokens?: Tokenizer.Token[];

	isAncestorOf: (node: INode) => boolean;

	toJSON: () => any;
	toString: () => string;
	beautify: (level?: number) => string;
}


export interface ISourceRange
{
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
}
