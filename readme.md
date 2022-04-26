# @futpib/bit-buffer

> Buffer of bits instead of bytes

[![npm](https://shields.io/npm/v/@futpib/bit-buffer)](https://www.npmjs.com/package/@futpib/bit-buffer) [![Coverage Status](https://coveralls.io/repos/github/futpib/bit-buffer/badge.svg?branch=master)](https://coveralls.io/github/futpib/bit-buffer?branch=master)

## Example

```typescript
import { BitBuffer } from '@futpib/bit-buffer';

const b1 = BitBuffer.alloc(15); // 15 zero bits
console.log(b1);
// → <BitBuffer 00000000 0000000_>

const n1 = b1.readBit(1); // read second bit
console.log(n1);
// → 0

const b2 = BitBuffer.from('101001', 'base2'); // from bit string
console.log(b2);
// → <BitBuffer 101001__>

const n2 = b2.readUIntBE(0, 4); // read first 4 bits as unsigned big endian
console.log(n2, n2.toString(2));
// → 10n 1010

const b3 = BitBuffer.from(Buffer.from([42])); // from buffer
console.log(b3);
// → <BitBuffer 00101010>
```

## Install

```
yarn add @futpib/bit-buffer
```
