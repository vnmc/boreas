var should = require('should');

var Utilities = require('../lib/utilities');
var Parser = require('../lib/parser');
var AST = require('../lib/ast');

var U = require('./utils');


describe('Utilities', function()
{
	describe('insertRange', function()
	{
		// 0,0-3,2  1,2-2,5  =>  0,0-4,2
		it('multiline1', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.insertRange(r, { startLine: 1, startColumn: 2, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(2);
		});

		// 0,0-3,2  1,2-3,5  =>  0,0-5,2
		it('multiline2', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.insertRange(r, { startLine: 1, startColumn: 2, endLine: 3, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(5);
			r.endColumn.should.eql(2);
		});

		// 0,0-3,2  0,2-1,4  =>  0,0-4,2
		it('multiline3', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.insertRange(r, { startLine: 0, startColumn: 2, endLine: 1, endColumn: 4 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(2);
		});

		// 0,0-3,2  0,2-0,5  =>  0,0-3,2
		it('multiline4', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.insertRange(r, { startLine: 0, startColumn: 2, endLine: 0, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(2);
		});

		// 0,5-3,2  0,2-0,4  =>  0,7-3,2    7=5-2+4
		it('multiline5', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 2 };
			Utilities.insertRange(r, { startLine: 0, startColumn: 2, endLine: 0, endColumn: 4 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(7);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(2);
		});

		// 0,5-3,2  0,2-1,3  =>  1,6-4,2    6=5-2+3
		it('multiline6', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 2 };
			Utilities.insertRange(r, { startLine: 0, startColumn: 2, endLine: 1, endColumn: 3 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(6);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(2);
		});

		// 1,0-3,2  1,2-2,5  =>  1,0-4,2
		it('multiline7', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.insertRange(r, { startLine: 1, startColumn: 2, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(2);
		});

		// 1,0-3,2  0,0-2,5  =>  3,0-5,2
		it('multiline8', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.insertRange(r, { startLine: 0, startColumn: 0, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(3);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(5);
			r.endColumn.should.eql(2);
		});

		// 1,0-3,2  0,0-1,5  =>  2,0-4,2
		it('multiline9', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.insertRange(r, { startLine: 0, startColumn: 0, endLine: 1, endColumn: 5 });
			r.startLine.should.eql(2);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(2);
		});

		// 1,0-3,2  0,0-0,6  =>  1,0-3,2
		it('multiline10', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.insertRange(r, { startLine: 0, startColumn: 0, endLine: 0, endColumn: 6 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(2);
		});

		// 1,0-1,4  0,0-2,5  =>  3,0-3,4
		it('multiline11', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 4 };
			Utilities.insertRange(r, { startLine: 0, startColumn: 0, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(3);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(4);
		});

		// 1,0-1,4  1,0-1,2  =>  1,2-1,6    2=0-0+2
		it('multiline12', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 4 };
			Utilities.insertRange(r, { startLine: 1, startColumn: 0, endLine: 1, endColumn: 2 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(6);
		});

		// 3,0-4,0  4,0-5,0  =>  3,0-4,0
		it('multiline13', function()
		{
			var r = { startLine: 3, startColumn: 0, endLine: 4, endColumn: 0 };
			Utilities.insertRange(r, { startLine: 4, startColumn: 0, endLine: 5, endColumn: 0 });
			r.startLine.should.eql(3);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(0);
		});

		// 0,0-3,1  3,0-3,10  =>  0,0-3,11
		it('multiline14', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 3, endColumn: 1 };
			Utilities.insertRange(r, { startLine: 3, startColumn: 0, endLine: 3, endColumn: 10 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(11);
		});

		// 0,0-3,1  3,0-4,10  =>  0,0-4,11
		it('multiline15', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 3, endColumn: 1 };
			Utilities.insertRange(r, { startLine: 3, startColumn: 0, endLine: 4, endColumn: 10 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(11);
		});

		// 0,0-3,6  3,1-4,10  =>  0,0-4,15
		it('multiline16', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 3, endColumn: 1 };
			Utilities.insertRange(r, { startLine: 3, startColumn: 0, endLine: 4, endColumn: 10 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(11);
		});

		// 0,0-3,6  3,1-3,10  =>  0,0-3,15
		it('multiline17', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 3, endColumn: 1 };
			Utilities.insertRange(r, { startLine: 3, startColumn: 0, endLine: 4, endColumn: 10 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(11);
		});

		// 1,2-1,4  1,1-1,8  =>  1,9-1,11   9=2-1+8
		it('singleline1', function()
		{
			var r = { startLine: 1, startColumn: 2, endLine: 1, endColumn: 4 };
			Utilities.insertRange(r, { startLine: 1, startColumn: 1, endLine: 1, endColumn: 8 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(9);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(11);
		});

		// 1,5-1,9  1,2-1,6  =>  1,9-1,13   9=5-2+6, 13=9-2+6
		it('singleline2', function()
		{
			var r = { startLine: 1, startColumn: 5, endLine: 1, endColumn: 9 };
			Utilities.insertRange(r, { startLine: 1, startColumn: 2, endLine: 1, endColumn: 6 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(9);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(13);
		});

		// 1,0-1,5  1,2-2,5  =>  1,0-2,8    8=5-2+5
		it('singleline3', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 };
			Utilities.insertRange(r, { startLine: 1, startColumn: 2, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(8);
		});

		// 3,0-3,5  3,2-6,9  =>  3,0-6,12   12=5-2+9
		it('singleline4', function()
		{
			var r = { startLine: 3, startColumn: 0, endLine: 3, endColumn: 5 };
			Utilities.insertRange(r, { startLine: 3, startColumn: 2, endLine: 6, endColumn: 9 });
			r.startLine.should.eql(3);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(6);
			r.endColumn.should.eql(12);
		});

		// 1,0-1,5  1,3-2,1  =>  1,0-2,3    3=5-3+1
		it('singleline5', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 };
			Utilities.insertRange(r, { startLine: 1, startColumn: 3, endLine: 2, endColumn: 1 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(3);
		});

		// 1,0-1,5  1,2-1,4  =>  1,0-1,7    7=5-2+4
		it('singleline6', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 };
			Utilities.insertRange(r, { startLine: 1, startColumn: 2, endLine: 1, endColumn: 4 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(7);
		});

		// 1,2-1,5  1,0-2,3  =>  2,5-2,8
		it('singleline7', function()
		{
			var r = { startLine: 1, startColumn: 2, endLine: 1, endColumn: 5 };
			Utilities.insertRange(r, { startLine: 1, startColumn: 0, endLine: 2, endColumn: 3 });
			r.startLine.should.eql(2);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(8);
		});

		// 1,2-1,5  1,1-2,3  =>  2,4-2,7
		it('singleline8', function()
		{
			var r = { startLine: 1, startColumn: 2, endLine: 1, endColumn: 5 };
			Utilities.insertRange(r, { startLine: 1, startColumn: 1, endLine: 2, endColumn: 3 });
			r.startLine.should.eql(2);
			r.startColumn.should.eql(4);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(7);
		});

		it('singleline9', function()
		{
			var r = { startLine: 2, startColumn: 0, endLine: 2, endColumn: 2 };
			Utilities.insertRange(r, { startLine: 2, startColumn: 3, endLine: 2, endColumn: 9 });
			r.startLine.should.eql(2);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(2);
		});

		it('singleline10', function()
		{
			var r = { startLine: 2, startColumn: 0, endLine: 2, endColumn: 3 };
			Utilities.insertRange(r, { startLine: 2, startColumn: 3, endLine: 2, endColumn: 9 });
			r.startLine.should.eql(2);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(3);
		});

		// 0,5-0,8  0,1-0,3  =>  0,7-0,10
		it('singleline11', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 8 };
			Utilities.insertRange(r, { startLine: 0, startColumn: 1, endLine: 0, endColumn: 3 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(7);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(10);
		});

		it('before', function()
		{
			var r = { startLine: 7, startColumn: 5, endLine: 11, endColumn: 8 };
			Utilities.insertRange(r, { startLine: 2, startColumn: 1, endLine: 5, endColumn: 3 });
			r.startLine.should.eql(10);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(14);
			r.endColumn.should.eql(8);
		});
	});

	describe('deleteRange', function()
	{
		// 0,0-3,2  1,2-2,5  =>  0,0-2,2
		it('1', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 2, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(2);
		});

		// 0,0-3,2  1,2-3,5  =>  0,0-1,2
		it('2', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 2, endLine: 3, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(2);
		});

		// 0,0-3,2  0,2-1,4  =>  0,0-2,2
		it('3', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 1, endColumn: 4 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(2);
		});

		// 0,0-3,2  0,2-0,5  =>  0,0-3,2
		it('4', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 0, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(2);
		});


		// 0,5-3,2  0,2-0,3  =>  0,4-3,2
		it('5', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 0, endColumn: 3 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(4);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(2);
		});

		// 0,5-3,2  0,2-1,3  =>  0,2-2,2
		it('6', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 1, endColumn: 3 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(2);
		});


		// 1,0-3,2  1,2-2,5  =>  1,0-2,2
		it('7', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 2, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(2);
		});

		// 1,0-3,2  0,0-2,5  =>  0,0-1,2
		it('8', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 0, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(2);
		});

		// 1,0-3,2  0,0-1,5  =>  0,0-2,2
		it('9', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 0, endLine: 1, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(2);
		});

		// 1,0-3,2  0,0-0,6  =>  1,0-3,2
		it('10', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 0, endLine: 0, endColumn: 6 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(2);
		});


		// 1,0-1,4  0,3-2,5  =>  0,3-0,3
		it('11', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 4 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 3, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(3);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(3);
		});

		// 1,0-1,4  1,0-1,2  =>  1,0-1,2
		it('12', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 4 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 0, endLine: 1, endColumn: 2 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(2);
		});

		// 1,2-1,4  1,1-1,8  =>  1,1-1,1
		it('13', function()
		{
			var r = { startLine: 1, startColumn: 2, endLine: 1, endColumn: 4 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 1, endLine: 1, endColumn: 8 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(1);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(1);
		});

		// 1,5-1,9  1,2-1,6  =>  1,2-1,5
		it('14', function()
		{
			var r = { startLine: 1, startColumn: 5, endLine: 1, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 2, endLine: 1, endColumn: 6 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(5);
		});


		// 1,0-1,5  1,2-2,5  =>  1,0-1,2
		it('15', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 2, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(2);
		});

		// 1,0-1,5  1,2-2,9  =>  1,0-1,2
		it('16', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 2, endLine: 2, endColumn: 9 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(2);
		});

		// 1,0-1,5  1,3-2,1  =>  1,0-1,3
		it('17', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 3, endLine: 2, endColumn: 1 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(3);
		});

		// 1,0-1,5  1,2-1,4  =>  1,0-1,3
		it('18', function()
		{
			var r = { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 2, endLine: 1, endColumn: 4 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(3);
		});


		// 1,2-1,5  1,0-2,3  =>  1,0-1,0
		it('19', function()
		{
			var r = { startLine: 1, startColumn: 2, endLine: 1, endColumn: 5 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 0, endLine: 2, endColumn: 3 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(0);
		});


		// 1,2-1,5  1,1-2,3  =>  1,1-1,1
		it('20', function()
		{
			var r = { startLine: 1, startColumn: 2, endLine: 1, endColumn: 5 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 1, endLine: 2, endColumn: 3 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(1);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(1);
		});


		// 3,0-4,0  4,0-5,0  =>  3,0-4,0
		it('21', function()
		{
			var r = { startLine: 3, startColumn: 0, endLine: 4, endColumn: 0 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 0, endLine: 5, endColumn: 0 });
			r.startLine.should.eql(3);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(0);
		});

		// 1,2-4,3  2,4-4,1  =>  1,2-2,6
		it('22', function()
		{
			var r = { startLine: 3, startColumn: 0, endLine: 4, endColumn: 0 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 0, endLine: 5, endColumn: 0 });
			r.startLine.should.eql(3);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(0);
		});

		// 0,5-3,2  0,2-5,7  =>  0,2-0,2
		it('23', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 5, endColumn: 7 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(2);
		});

		// 0,5-3,2  0,8-5,7  =>  0,5-0,8
		it('24', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 8, endLine: 5, endColumn: 7 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(8);
		});

		// 0,5-3,2  1,2-5,7  =>  0,5-1,2
		it('25', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 2 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 2, endLine: 5, endColumn: 7 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(2);
		});

		// 0,5-3,6  0,5-3,6  =>  0,5-0,5
		it('26', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(5);
		});

		// 0,5-3,6  0,2-3,6  =>  0,2-0,2
		it('27', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 3, endColumn: 6 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(2);
		});

		// 0,5-3,6  0,8-3,6  =>  0,5-0,8
		it('28', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 8, endLine: 3, endColumn: 6 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(8);
		});

		// 0,5-3,6  1,2-3,6  =>  0,5-1,2
		it('29', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 2, endLine: 3, endColumn: 6 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(2);
		});

		// 0,5-3,6  0,5-2,5  =>  0,5-1,6
		it('30', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 5, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(6);
		});

		// 0,5-3,6  0,2-2,5  =>  0,2-1,6
		it('31', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(6);
		});

		// 0,5-3,6  0,8-2,5  =>  0,5-1,6
		it('32', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 8, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(6);
		});

		// 0,5-3,6  1,2-2,5  =>  0,5-2,6
		it('33', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 2, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(6);
		});

		// 0,5-3,6  0,5-3,9  =>  0,5-0,5
		it('34', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 5, endLine: 3, endColumn: 9 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(5);
		});

		// 0,5-3,6  0,2-3,9  =>  0,2-0,2
		it('35', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 3, endColumn: 9 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(2);
		});

		// 0,5-3,6  0,8-3,9  =>  0,5-0,8
		it('36', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 8, endLine: 3, endColumn: 9 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(8);
		});

		// 0,5-3,6  1,2-3,9  =>  0,5-1,2
		it('37', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 2, endLine: 3, endColumn: 9 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(2);
		});

		// 0,5-3,6  0,5-3,4  =>  0,5-0,7
		it('38', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 5, endLine: 3, endColumn: 4 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(7);
		});

		// 0,5-3,6  0,2-3,4  =>  0,2-0,4
		it('39', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 3, endColumn: 4 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(4);
		});

		// 0,5-3,6  0,8-3,4  =>  0,5-0,10
		it('40', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 8, endLine: 3, endColumn: 4 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(10);
		});

		// 0,5-3,6  1,2-3,4  =>  0,5-1,4
		it('41', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 2, endLine: 3, endColumn: 4 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(4);
		});

		// 0,5-3,6  3,2-3,5  =>  0,5-3,3
		it('42', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 3, startColumn: 2, endLine: 3, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(3);
		});

		// 0,5-3,6  3,2-3,9  =>  0,5-3,2
		it('43', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 3, startColumn: 2, endLine: 3, endColumn: 9 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(2);
		});

		// 0,5-3,6  3,2-4,4  =>  0,5-3,2
		it('44', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 3, startColumn: 2, endLine: 4, endColumn: 4 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(2);
		});

		// 0,5-3,6  3,6-3,9  =>  0,5-3,6
		it('45', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 3, startColumn: 6, endLine: 3, endColumn: 9 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(6);
		});

		// 0,5-3,6  3,6-4,4  =>  0,5-3,6
		it('46', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 3, startColumn: 6, endLine: 4, endColumn: 4 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(6);
		});

		// 0,5-3,6  3,8-3,10 =>  0,5-3,6
		it('47', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 3, startColumn: 8, endLine: 3, endColumn: 10 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(6);
		});

		// 0,5-3,6  3,8-4,4  =>  0,5-3,6
		it('48', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 3, startColumn: 8, endLine: 4, endColumn: 4 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(6);
		});

		// 0,5-3,6  4,4-5,5  =>  0,5-3,6
		it('49', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 3, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 4, endLine: 5, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(6);
		});

		it('50', function()
		{
			var r = { startLine: 10, startColumn: 5, endLine: 15, endColumn: 7 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 4, endLine: 8, endColumn: 5 });
			r.startLine.should.eql(6);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(11);
			r.endColumn.should.eql(7);
		});

		// 10,5-15,7  4,4-10,2  =>  4,7-9,7
		it('51', function()
		{
			var r = { startLine: 10, startColumn: 5, endLine: 15, endColumn: 7 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 4, endLine: 10, endColumn: 2 });
			r.startLine.should.eql(4);
			r.startColumn.should.eql(7);
			r.endLine.should.eql(9);
			r.endColumn.should.eql(7);
		});

		// 10,5-15,7  4,4-10,5  =>  4,4-9,7
		it('52', function()
		{
			var r = { startLine: 10, startColumn: 5, endLine: 15, endColumn: 7 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 4, endLine: 10, endColumn: 5 });
			r.startLine.should.eql(4);
			r.startColumn.should.eql(4);
			r.endLine.should.eql(9);
			r.endColumn.should.eql(7);
		});

		// 10,5-15,7  4,4-10,8  =>  4,4-9,7
		it('53', function()
		{
			var r = { startLine: 10, startColumn: 5, endLine: 15, endColumn: 7 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 4, endLine: 10, endColumn: 8 });
			r.startLine.should.eql(4);
			r.startColumn.should.eql(4);
			r.endLine.should.eql(9);
			r.endColumn.should.eql(7);
		});

		// 0,0-0,14  0,86-0,99  =>  0,0-0,14
		it('54', function()
		{
			var r = { startLine: 0, startColumn: 0, endLine: 0, endColumn: 14 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 86, endLine: 0, endColumn: 99 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(0);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(14);
		});


		it('S01', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 0, endColumn: 4 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(3);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(7);
		});
		it('S02', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 0, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(6);
		});
		it('S03', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 0, endColumn: 7 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(4);
		});
		it('S04', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 0, endColumn: 9 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(2);
		});
		it('S05', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 0, endColumn: 12 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(2);
		});
		it('S06', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 5, endLine: 0, endColumn: 7 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(7);
		});
		it('S07', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(5);
		});
		it('S08', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 5, endLine: 0, endColumn: 12 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(5);
		});
		it('S09', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 6, endLine: 0, endColumn: 7 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(8);
		});
		it('S10', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 6, endLine: 0, endColumn: 9 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(6);
		});
		it('S11', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 6, endLine: 0, endColumn: 12 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(6);
		});
		it('S12', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 9, endLine: 0, endColumn: 12 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(9);
		});
		it('S13', function()
		{
			var r = { startLine: 0, startColumn: 5, endLine: 0, endColumn: 9 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 11, endLine: 0, endColumn: 12 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(9);
		});


		// start before range
		it('M01', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 0, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(6);
		});
		it('M02', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 1, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(6);
		});
		it('M03', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 1, endColumn: 8 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(6);
		});
		it('M04', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 1, endColumn: 11 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(6);
		});
		it('M05', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(6);
		});
		it('M06', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 3, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(6);
		});
		it('M07', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 4, endColumn: 3 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(5);
		});
		it('M08', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 4, endColumn: 6 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(2);
		});
		it('M09', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 4, endColumn: 9 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(2);
		});
		it('M0a', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 0, startColumn: 2, endLine: 5, endColumn: 5 });
			r.startLine.should.eql(0);
			r.startColumn.should.eql(2);
			r.endLine.should.eql(0);
			r.endColumn.should.eql(2);
		});

		// start before range, on same line as range
		it('M11', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 1, endLine: 1, endColumn: 4 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(5);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(6);
		});
		it('M12', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 1, endLine: 1, endColumn: 8 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(1);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(6);
		});
		it('M13', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 1, endLine: 1, endColumn: 11 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(1);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(6);
		});
		it('M14', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 1, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(1);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(6);
		});
		it('M15', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 1, endLine: 3, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(1);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(6);
		});
		it('M16', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 1, endLine: 4, endColumn: 3 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(1);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(4);
		});
		it('M17', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 1, endLine: 4, endColumn: 6 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(1);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(1);
		});
		it('M18', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 1, endLine: 4, endColumn: 9 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(1);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(1);
		});
		it('M19', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 1, endLine: 5, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(1);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(1);
		});

		// start at range
		it('M21', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 8, endLine: 1, endColumn: 11 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(6);
		});
		it('M22', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 8, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(6);
		});
		it('M23', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 8, endLine: 3, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(6);
		});
		it('M24', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 8, endLine: 4, endColumn: 3 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(11);
		});
		it('M25', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(8);
		});
		it('M26', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 8, endLine: 4, endColumn: 9 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(8);
		});
		it('M27', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 8, endLine: 5, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(8);
		});

		// start after range start, on same line as range
		it('M31', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 11, endLine: 1, endColumn: 14 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(6);
		});
		it('M32', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 11, endLine: 2, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(6);
		});
		it('M33', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 11, endLine: 3, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(6);
		});
		it('M34', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 11, endLine: 4, endColumn: 3 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(14);
		});
		it('M35', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 11, endLine: 4, endColumn: 6 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(11);
		});
		it('M36', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 11, endLine: 4, endColumn: 9 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(11);
		});
		it('M37', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 1, startColumn: 11, endLine: 5, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(1);
			r.endColumn.should.eql(11);
		});

		// start after range start (start line + 1)
		it('M41', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 2, startColumn: 5, endLine: 2, endColumn: 8 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(6);
		});
		it('M42', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 2, startColumn: 5, endLine: 3, endColumn: 8 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(6);
		});
		it('M43', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 2, startColumn: 5, endLine: 4, endColumn: 3 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(8);
		});
		it('M44', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 2, startColumn: 5, endLine: 4, endColumn: 6 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(5);
		});
		it('M45', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 2, startColumn: 5, endLine: 4, endColumn: 9 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(5);
		});
		it('M46', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 2, startColumn: 5, endLine: 5, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(2);
			r.endColumn.should.eql(5);
		});

		// start after range start (end line - 1)
		it('M51', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 3, startColumn: 4, endLine: 3, endColumn: 7 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(6);
		});
		it('M52', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 3, startColumn: 4, endLine: 4, endColumn: 3 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(7);
		});
		it('M53', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 3, startColumn: 4, endLine: 4, endColumn: 6 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(4);
		});
		it('M54', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 3, startColumn: 4, endLine: 4, endColumn: 9 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(4);
		});
		it('M55', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 3, startColumn: 4, endLine: 5, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(3);
			r.endColumn.should.eql(4);
		});

		// start on range end line, before range end
		it('M61', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 1, endLine: 4, endColumn: 3 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(4);
		});
		it('M62', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 1, endLine: 4, endColumn: 6 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(1);
		});
		it('M63', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 1, endLine: 4, endColumn: 9 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(1);
		});
		it('M64', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 1, endLine: 5, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(1);
		});

		// start at range end
		it('M71', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 6, endLine: 4, endColumn: 9 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(6);
		});
		it('M72', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 6, endLine: 5, endColumn: 5 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(6);
		});

		// start after range end
		it('M81', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 4, startColumn: 9, endLine: 4, endColumn: 11 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(6);
		});

		// start after range end (line >)
		it('M91', function()
		{
			var r = { startLine: 1, startColumn: 8, endLine: 4, endColumn: 6 };
			Utilities.deleteRange(r, { startLine: 5, startColumn: 5, endLine: 6, endColumn: 11 });
			r.startLine.should.eql(1);
			r.startColumn.should.eql(8);
			r.endLine.should.eql(4);
			r.endColumn.should.eql(6);
		});
	});

	describe('replaceTextInRange', function()
	{
		it('middle', function()
		{
			var text = 'hello beautiful world';
			var range = {
				startLine: 0,
				startColumn: 6,
				endLine: 0,
				endColumn: 15
			};
			var repl = 'silly';

			Utilities.replaceTextInRange(text, range, repl).should.eql('hello silly world');
		});
	});

	describe('offsetRange', function()
	{
		it('T1', function()
		{
			var css = 'body {\n  /*xxx*/ color: teal;}';
			var ast = Parser.parse(css);

			Utilities.offsetRange(ast, 3, 10);

			U.checkRanges(ast);
			U.checkRangeContents(ast, '\n\n\n          ' + css);
		});
	});

	describe('insertRangeFromNode', function()
	{
		it('T1', function()
		{
			var css = 'body {\n  /*xxx*/ color: teal;}';
			var ast = Parser.parse(css);

			var node = new AST.ASTNode();
			node._parent = ast.getRules()[0].getDeclarations();
			node.range = {
				startLine: 0,
				startColumn: 9,
				endLine: 0,
				endColumn: 15
			};
			Utilities.insertRangeFromNode(ast, node);

			U.checkRanges(ast);
		});
	});

	describe('relativeRange', function()
	{
		it('same line', function()
		{
			Utilities.relativeRange(
				{ startLine: 1, startColumn: 4, endLine: 1, endColumn: 6 },
				{ startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 }
			).should.eql({ startLine: 0, startColumn: 3, endLine: 0, endColumn: 5 });
		});

		it('target has more lines', function()
		{
			Utilities.relativeRange(
				{ startLine: 1, startColumn: 4, endLine: 1, endColumn: 6 },
				{ startLine: 1, startColumn: 1, endLine: 3, endColumn: 10 }
			).should.eql({ startLine: 0, startColumn: 3, endLine: 0, endColumn: 5 });
		});

		it('start on line below', function()
		{
			Utilities.relativeRange(
				{ startLine: 2, startColumn: 4, endLine: 3, endColumn: 6 },
				{ startLine: 1, startColumn: 1, endLine: 3, endColumn: 10 }
			).should.eql({ startLine: 1, startColumn: 4, endLine: 2, endColumn: 6 });
		});

		it('source lines between target lines', function()
		{
			Utilities.relativeRange(
				{ startLine: 2, startColumn: 4, endLine: 3, endColumn: 6 },
				{ startLine: 1, startColumn: 1, endLine: 4, endColumn: 10 }
			).should.eql({ startLine: 1, startColumn: 4, endLine: 2, endColumn: 6 });
		});
	});
});
