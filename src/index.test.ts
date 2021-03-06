import { inspect } from 'util';
import { Buffer } from 'buffer';
import test from 'ava';

import { BitBuffer } from '.';

test('alloc', t => {
	const b = BitBuffer.alloc(1, 1);
	t.is(b.length, 1);
	t.is(b.readBit(0), 1);
});

test('from', t => {
	const b = BitBuffer.from(BitBuffer.from(Buffer.from([ 42 ])));
	t.is(b.length, 8);

	t.throws(() => {
		BitBuffer.from(1234 as any);
	}, {
		message: /1234/,
	});
});

test('toString', t => {
	const b = BitBuffer.alloc(1, 1);

	t.throws(() => {
		b.toString('hex' as any);
	}, {
		message: /encoding/,
	});
});

test('keys', t => {
	const b = BitBuffer.alloc(2);
	t.deepEqual(Array.from(b.keys()), [ 0, 1 ]);
});

test('equals', t => {
	const b1 = BitBuffer.alloc(2);
	const b2 = BitBuffer.from('00', 'base2');
	const b3 = BitBuffer.from('01', 'base2');
	const b4 = BitBuffer.from('000', 'base2');
	t.true(b1.equals(b2));
	t.true(b2.equals(b1));
	t.false(b1.equals(b3));
	t.false(b3.equals(b1));
	t.false(b1.equals(b4));
	t.false(b4.equals(b1));
});

test('writeBit', t => {
	const b = BitBuffer.alloc(16);
	b.writeBit(1, 0);
	b.writeBit(1, 3);
	b.writeBit(1, 7);
	b.writeBit(1, 8);
	b.writeBit(1, 15);

	const expectedBuffer = Buffer.alloc(2);
	expectedBuffer.writeUInt16BE(0b1001_0001_1000_0001, 0);

	t.deepEqual(b, BitBuffer.from(expectedBuffer));
});

test('writeUInt8', t => {
	const actual = BitBuffer.alloc(16);
	actual.writeUInt8(0xFF, 0);

	const expected = BitBuffer.from(Buffer.from([ 0xFF, 0 ]));
	t.true(actual.equals(expected));
});

test('writeUIntBE', t => {
	const b = BitBuffer.alloc(16);
	b.writeUIntBE(0b11_0101, 5, 6);

	const expectedBuffer = Buffer.alloc(2);
	expectedBuffer.writeUInt16BE(0b0000_0110_1010_0000, 0);

	t.deepEqual(b, BitBuffer.from(expectedBuffer));

	const value = b.readUIntBE(5, 6);
	t.is(value, 0b11_0101n);
});

test('writeIntBE', t => {
	const buffer = Buffer.alloc(2);
	const bitBuffer = BitBuffer.alloc(16);

	buffer.writeIntBE(-1234, 0, 2);
	bitBuffer.writeIntBE(-1234, 0, 16);

	t.deepEqual(bitBuffer.toString('base2'), BitBuffer.from(buffer).toString('base2'));
	t.is(bitBuffer.readIntBE(0, 16), BigInt(buffer.readIntBE(0, 2)));

	buffer.writeIntBE(1234, 0, 2);
	bitBuffer.writeIntBE(1234, 0, 16);

	t.deepEqual(bitBuffer.toString('base2'), BitBuffer.from(buffer).toString('base2'));
	t.is(bitBuffer.readIntBE(0, 16), BigInt(buffer.readIntBE(0, 2)));
});

test('inspect', t => {
	const b = BitBuffer.alloc(13);
	b.writeUIntBE(0b11_0101, 5, 6);

	t.is(inspect(b), '<BitBuffer 00000110 10100___>');
	t.is(inspect(BitBuffer.alloc(8)), '<BitBuffer 00000000>');
});

test('base2', t => {
	const b = BitBuffer.from('01010', 'base2');
	t.is(b.toString('base2'), '01010');
});

test('hex', t => {
	const b = BitBuffer.from('fa', 'hex');
	t.is(b.toString('base2'), (0xFA).toString(2));
});

test('slice', t => {
	const b = BitBuffer.from('01010', 'base2');
	t.is(b.slice().toString('base2'), '01010');
	t.is(b.slice(1).toString('base2'), '1010');
	t.is(b.slice(1, 4).toString('base2'), '101');
});

test('concat', t => {
	t.deepEqual(
		BitBuffer.concat([
			BitBuffer.from('101', 'base2'),
			BitBuffer.from('111', 'base2'),
		]),
		BitBuffer.from('101111', 'base2'),
	);
});

test('octets', t => {
	t.deepEqual(
		Array.from(BitBuffer.alloc(0).octets()),
		[],
	);

	t.deepEqual(
		Array.from(BitBuffer.from('101', 'base2').octets()),
		[
			BitBuffer.from('101', 'base2'),
		],
	);

	t.deepEqual(
		Array.from(BitBuffer.from('10100101', 'base2').octets()),
		[
			BitBuffer.from('10100101', 'base2'),
		],
	);

	t.deepEqual(
		Array.from(BitBuffer.from('101001010', 'base2').octets()),
		[
			BitBuffer.from('10100101', 'base2'),
			BitBuffer.from('0', 'base2'),
		],
	);
});

test('toBuffer', t => {
	t.throws(() => {
		BitBuffer.from('101', 'base2').toBuffer();
	});

	t.deepEqual(
		BitBuffer.from('10100101', 'base2').toBuffer(),
		Buffer.from([ 0b1010_0101 ]),
	);
});
