// ==================================================================
// TYPE DECLARATIONS
// ==================================================================

export interface INode
{
	range: ISourceRange;
	prologue: string;
	epilogue: string;

	parent: INode;
	children: INode[];
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
