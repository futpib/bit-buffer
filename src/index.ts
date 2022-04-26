import { inspect } from 'util';
import { Buffer } from 'buffer';
import invariant from 'invariant';

export type Bit = 0 | 1;
export type BitBufferToEncinding = 'base2';
export type BitBufferFromEncoding = 'base2' | BufferEncoding;

export class BitBuffer {
	static isBitBuffer(x: unknown): x is BitBuffer {
		return x instanceof BitBuffer;
	}

	static alloc(length: number, fill: Bit = 0): BitBuffer {
		return new BitBuffer(Buffer.alloc(Math.ceil(length / 8), fill ? 0xFF : 0), length);
	}

	static concat(bitBuffers: BitBuffer[]): BitBuffer {
		const length = bitBuffers.reduce((l, x) => l + x.length, 0);
		const result = BitBuffer.alloc(length);

		let i = 0;
		for (const bitBuffer of bitBuffers) {
			for (const bit of bitBuffer.values()) {
				result.writeBit(bit, i);
				i += 1;
			}
		}

		return result;
	}

	static from(string: string, encoding: BitBufferFromEncoding): BitBuffer;
	static from(other: Buffer | BitBuffer): BitBuffer;
	static from(...args: unknown[]) {
		if (args.length === 1) {
			const [ other ] = args;

			if (BitBuffer.isBitBuffer(other)) {
				return new BitBuffer(
					other._buffer.slice(),
					other._length,
				);
			}

			if (Buffer.isBuffer(other)) {
				return new BitBuffer(
					other.slice(),
					other.length * 8,
				);
			}
		}

		if (args.length === 2) {
			const [ string, encoding ] = args;

			if (typeof string === 'string') {
				if (encoding === 'base2') {
					const bitBuffer = BitBuffer.alloc(string.length);

					for (const [ index, bit ] of string.split('').entries()) {
						bitBuffer.writeBit(Number(bit), index);
					}

					return bitBuffer;
				}

				const buffer = Buffer.from(string, encoding as BufferEncoding);

				return new BitBuffer(
					buffer,
					buffer.length * 8,
				);
			}
		}

		invariant(
			false,
			'Can\'t convert this to BitBuffer: %s',
			inspect(args),
		);
	}

	constructor(
		private readonly _buffer: Buffer,
		private readonly _length: number,
	) {
		const bufferLength = this._buffer.length * 8;

		invariant(
			bufferLength >= this._length,
			'Underlying buffer undersized: expected at least %s bits, got %s bits',
			this._length,
			bufferLength,
		);
	}

	toString(encoding?: 'base2') {
		if (encoding === 'base2') {
			let s = '';

			for (const bit of this.values()) {
				s = `${s}${bit}`;
			}

			return s;
		}

		invariant(
			false,
			'Unsupported encoding: %s',
			encoding,
		);
	}

	/**
	 * Throws if bits can not be split in bytes.
	 */
	toBuffer() {
		invariant(
			Number.isSafeInteger(this.length / 8),
			'Can not convert BitBuffer to Buffer as it\'s length is not a multiple of 8. (Actual length: %s)',
			this.length,
		);

		return Buffer.from(Array.from(this.octets()).map(octet => Number(octet.readUIntBE(0, 8))));
	}

	[inspect.custom]() {
		const byteStrings = [];

		let byteString = '';

		for (const [ i, bit ] of this.entries()) {
			if (byteString && i % 8 === 0) {
				byteStrings.push(byteString);
				byteString = '';
			}

			byteString = `${byteString}${bit}`;
		}

		if (byteString) {
			byteStrings.push(byteString.padEnd(8, '_'));
		}

		return `<BitBuffer ${byteStrings.join(' ')}>`;
	}

	get length() {
		return this._length;
	}

	* entries() {
		for (let i = 0; i < this.length; i++) {
			yield [ i, this.readBit(i) ];
		}
	}

	* keys() {
		for (let i = 0; i < this.length; i++) {
			yield i;
		}
	}

	* values() {
		for (let i = 0; i < this.length; i++) {
			yield this.readBit(i);
		}
	}

	/**
	 * Last octet may be shorter than 8 bit
	 */
	* octets() {
		for (let i = 0; i < this.length / 8; i++) {
			yield this.slice(i * 8, (i + 1) * 8);
		}
	}

	equals(other: BitBuffer) {
		return (
			this._buffer.equals(other._buffer)
				&& this.length === other.length
		);
	}

	slice(...args: Parameters<Buffer['slice']>): BitBuffer {
		return BitBuffer.from(this.toString('base2').slice(...args), 'base2');
	}

	writeBit(value: number, offset: number) {
		const byteOffset = Math.floor(offset / 8);
		const bitOffset = offset % 8;
		const bitShift = 7 - bitOffset;

		const byte = this._buffer.readUInt8(byteOffset);
		const newByte = (byte & ~(1 << bitShift)) | (value << bitShift);

		this._buffer.writeUInt8(newByte, byteOffset);
	}

	readBit(offset: number): Bit {
		const byteOffset = Math.floor(offset / 8);
		const bitOffset = offset % 8;
		const bitShift = 7 - bitOffset;

		const byte = this._buffer.readUInt8(byteOffset);
		const value = (byte & (1 << bitShift)) >> bitShift;
		invariant(value === 0 || value === 1, 'Not a bit');
		return value;
	}

	writeUInt8(value: number, offset: number) {
		const byteOffset = Math.floor(offset / 8);
		const bitOffset = offset % 8;

		invariant(bitOffset === 0, 'TODO?');

		this._buffer.writeUInt8(value, byteOffset);
	}

	writeUIntBE(value: number | bigint, offset: number, length: number) {
		for (const char of value.toString(2).padStart(length, '0').split('')) {
			this.writeBit(Number(char), offset);
			offset += 1;
		}
	}

	readUIntBE(offset: number, length: number): bigint {
		let value = 0n;
		for (let i = offset; i < (offset + length); i++) {
			const shift = BigInt(length + offset - i - 1);
			const bit = BigInt(this.readBit(i));
			value |= (bit << shift);
		}

		return value;
	}

	writeIntBE(value: number | bigint, offset: number, length: number) {
		value = BigInt(value);

		if (value < 0n) {
			this.writeBit(1, offset);
			offset += 1;
			for (const char of (~value).toString(2).padStart(length - 1, '0').split('')) {
				this.writeBit(char === '0' ? 1 : 0, offset);
				offset += 1;
			}
		} else {
			this.writeUIntBE(value, offset + 1, length - 1);
			this.writeBit(offset, 0);
		}
	}

	readIntBE(offset: number, length: number): bigint {
		const signBit = this.readBit(offset);

		if (signBit === 1) {
			let value = 0n;
			for (let i = offset + 1; i < (offset + length); i++) {
				const shift = BigInt(length + offset - i - 1);
				const bit = BigInt(!this.readBit(i));
				value |= (bit << shift);
			}

			return ~value;
		}

		return this.readUIntBE(offset + 1, length - 1);
	}
}
