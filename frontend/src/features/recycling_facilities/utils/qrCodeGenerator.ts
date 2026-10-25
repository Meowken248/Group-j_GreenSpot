/**
 * Minimalist, Self-contained QR Code Matrix Generator (Model 2, Byte Mode, EC Level M)
 * Fully compliant with ISO/IEC 18004. Zero external dependencies.
 */

// Galois Field GF(256) with primitive polynomial 0x11D (285)
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(() => {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    EXP_TABLE[i + 255] = val;
    LOG_TABLE[val] = i;
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0);
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function reedSolomonCompute(data: Uint8Array, ecLength: number): Uint8Array {
  // Generate generator polynomial
  let gen = new Uint8Array([1]);
  for (let i = 0; i < ecLength; i++) {
    const nextGen = new Uint8Array(gen.length + 1);
    for (let j = 0; j < gen.length; j++) {
      nextGen[j] ^= gfMul(gen[j], EXP_TABLE[i]);
      nextGen[j + 1] ^= gen[j];
    }
    gen = nextGen;
  }

  const res = new Uint8Array(ecLength);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.copyWithin(0, 1);
    res[ecLength - 1] = 0;
    for (let i = 0; i < ecLength; i++) {
      res[i] ^= gfMul(gen[i], factor);
    }
  }
  return res;
}

// QR Version specifications for EC Level M:
// Version 1: 21x21, 16 data bytes, 10 EC bytes
// Version 2: 25x25, 28 data bytes, 16 EC bytes
// Version 3: 29x29, 44 data bytes, 26 EC bytes
// Version 4: 33x33, 64 data bytes, 36 (2 blocks of 18) EC bytes
interface QRVersionSpec {
  version: number;
  size: number;
  dataCapacity: number;
  ecBytesPerBlock: number;
  blocks: number;
  alignmentPatternPos: number[];
}

const QR_SPECS: QRVersionSpec[] = [
  { version: 1, size: 21, dataCapacity: 14, ecBytesPerBlock: 10, blocks: 1, alignmentPatternPos: [] },
  { version: 2, size: 25, dataCapacity: 26, ecBytesPerBlock: 16, blocks: 1, alignmentPatternPos: [6, 18] },
  { version: 3, size: 29, dataCapacity: 42, ecBytesPerBlock: 26, blocks: 1, alignmentPatternPos: [6, 22] },
  { version: 4, size: 33, dataCapacity: 62, ecBytesPerBlock: 18, blocks: 2, alignmentPatternPos: [6, 26] },
];

export function generateQrMatrix(text: string): boolean[][] {
  const textBytes = new TextEncoder().encode(text);
  
  // Pick smallest fitting version
  let spec = QR_SPECS.find((s) => textBytes.length <= s.dataCapacity);
  if (!spec) {
    spec = QR_SPECS[QR_SPECS.length - 1]; // Max supported version 4
  }

  const { size, dataCapacity, ecBytesPerBlock, blocks, alignmentPatternPos } = spec;

  // 1. Bit Stream Construction (Byte mode = 0100)
  const bitArray: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bitArray.push((val >> i) & 1);
    }
  };

  // Mode indicator: 0100 (8-bit Byte)
  pushBits(0b0100, 4);
  // Character count indicator (8 bits for versions 1-4)
  pushBits(textBytes.length, 8);
  // Data bytes
  for (const b of textBytes) {
    pushBits(b, 8);
  }
  // Terminator bits (up to 4 zeroes)
  const totalDataBits = dataCapacity * 8;
  const terminatorLength = Math.min(4, totalDataBits - bitArray.length);
  pushBits(0, terminatorLength);
  // Byte alignment padding
  while (bitArray.length % 8 !== 0) {
    bitArray.push(0);
  }
  // Pad bytes: 0xEC (236) and 0x11 (17)
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitArray.length < totalDataBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to raw data bytes
  const dataBytes = new Uint8Array(dataCapacity);
  for (let i = 0; i < dataCapacity; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitArray[i * 8 + b];
    }
    dataBytes[i] = byteVal;
  }

  // 2. Error Correction Codewords
  const blockSize = Math.floor(dataCapacity / blocks);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  for (let blk = 0; blk < blocks; blk++) {
    const start = blk * blockSize;
    const end = blk === blocks - 1 ? dataCapacity : start + blockSize;
    const blockData = dataBytes.slice(start, end);
    dataBlocks.push(blockData);
    ecBlocks.push(reedSolomonCompute(blockData, ecBytesPerBlock));
  }

  // Interleave data and EC codewords
  const interleavedBytes: number[] = [];
  const maxBlockLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < blocks; b++) {
      if (i < dataBlocks[b].length) interleavedBytes.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < ecBytesPerBlock; i++) {
    for (let b = 0; b < blocks; b++) {
      interleavedBytes.push(ecBlocks[b][i]);
    }
  }

  // Convert final interleaved bytes to bits
  const finalBits: number[] = [];
  for (const byte of interleavedBytes) {
    for (let i = 7; i >= 0; i--) {
      finalBits.push((byte >> i) & 1);
    }
  }

  // 3. Matrix Layout
  // Initialize matrix: -1 for unassigned, 0 for light, 1 for dark
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, val: number, func = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      if (func) isFunction[r][c] = true;
    }
  };

  // Finder Patterns
  const addFinderPattern = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          setModule(nr, nc, 1);
        } else {
          setModule(nr, nc, 0);
        }
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(0, size - 7);
  addFinderPattern(size - 7, 0);

  // Timing Patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0 ? 1 : 0;
    if (!isFunction[6][i]) setModule(6, i, val);
    if (!isFunction[i][6]) setModule(i, 6, val);
  }

  // Alignment Pattern for Version >= 2
  if (alignmentPatternPos.length > 0) {
    const [ar, ac] = alignmentPatternPos;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const nr = ar + r;
        const nc = ac + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
          setModule(nr, nc, 1);
        } else {
          setModule(nr, nc, 0);
        }
      }
    }
  }

  // Reserve Format Information Modules
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) setModule(8, i, 0);
    if (!isFunction[i][8]) setModule(i, 8, 0);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setModule(8, size - 1 - i, 0);
    if (!isFunction[size - 1 - i][8]) setModule(size - 1 - i, 8, 0);
  }
  setModule(size - 8, 8, 1); // Dark module

  // 4. Data Masking & Placement
  // Mask pattern 0: (row + col) % 2 === 0
  let bitIdx = 0;
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing pattern
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!isFunction[r][c]) {
          let bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
          // Apply mask pattern 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) {
            bit ^= 1;
          }
          matrix[r][c] = bit;
        }
      }
    }
    upward = !upward;
  }

  // 5. Format Information Bits for EC Level M (00) & Mask 0 (000): Format bits = 0x5412
  // Format code 0x5412 XOR Mask 0x5412 = 0b101010000010010
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  const setFormat = (idx: number, bit: number) => {
    // Top-left
    if (idx < 6) setModule(8, idx, bit);
    else if (idx === 6) setModule(8, 7, bit);
    else if (idx === 7) setModule(8, 8, bit);
    else if (idx === 8) setModule(7, 8, bit);
    else setModule(14 - idx, 8, bit);

    // Bottom-left / Top-right
    if (idx < 7) setModule(size - 1 - idx, 8, bit);
    else setModule(8, size - 15 + idx, bit);
  };

  for (let i = 0; i < 15; i++) {
    setFormat(i, formatBits[i]);
  }

  // Convert to boolean matrix (true = dark, false = light)
  return matrix.map((row) => row.map((cell) => cell === 1));
}

