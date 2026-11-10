import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { chooseVersion, encodeQR, utf8Bytes, type ErrorCorrectionLevel } from '../src/lib/qr';

function finderOk(m: boolean[][], x0: number, y0: number): boolean {
  // 7x7 finder: dark outer ring, light ring, dark 3x3 core.
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      const expected = ring !== 2;
      if (m[y0 + dy][x0 + dx] !== expected) return false;
    }
  }
  return true;
}

describe('utf8Bytes', () => {
  it('encodes ASCII and multi-byte characters', () => {
    expect(utf8Bytes('Az')).toEqual([0x41, 0x7a]);
    expect(utf8Bytes('é')).toEqual([0xc3, 0xa9]);
    expect(utf8Bytes('€')).toEqual([0xe2, 0x82, 0xac]);
    expect(utf8Bytes('😀')).toEqual([0xf0, 0x9f, 0x98, 0x80]);
  });
  it('replaces lone surrogates with the UTF-8 replacement character', () => {
    expect(utf8Bytes('\ud800')).toEqual([0xef, 0xbf, 0xbd]);
    expect(utf8Bytes('\udc00')).toEqual([0xef, 0xbf, 0xbd]);
  });
});

describe('chooseVersion', () => {
  it('picks the smallest version that fits (byte mode capacities)', () => {
    // Version 1-M holds 14 bytes, version 2-M holds 26 bytes.
    expect(chooseVersion(14, 'M')).toBe(1);
    expect(chooseVersion(15, 'M')).toBe(2);
    expect(chooseVersion(26, 'M')).toBe(2);
    expect(chooseVersion(27, 'M')).toBe(3);
    expect(chooseVersion(42, 'M')).toBe(3);
    expect(chooseVersion(43, 'M')).toBe(4);
    // Version 1-L holds 17 bytes.
    expect(chooseVersion(17, 'L')).toBe(1);
    expect(chooseVersion(18, 'L')).toBe(2);
  });
  it('returns -1 when the data does not fit in version 10', () => {
    expect(chooseVersion(213, 'M')).toBe(10);
    expect(chooseVersion(214, 'M')).toBe(-1);
    expect(chooseVersion(5000, 'M')).toBe(-1);
  });
});

describe('encodeQR', () => {
  it.each(['HELLO', 'https://github.com/muhib-karim/code-video-kit', 'x'.repeat(150)])(
    'produces a well-formed symbol for %s',
    (text) => {
      const qr = encodeQR(text, 'M');
      const { size, modules } = qr;
      expect(size).toBe(qr.version * 4 + 17);
      expect(modules).toHaveLength(size);
      modules.forEach((row) => expect(row).toHaveLength(size));
      // Three finder patterns.
      expect(finderOk(modules, 0, 0)).toBe(true);
      expect(finderOk(modules, size - 7, 0)).toBe(true);
      expect(finderOk(modules, 0, size - 7)).toBe(true);
      // Timing patterns alternate between the finders.
      for (let i = 8; i < size - 8; i++) {
        expect(modules[6][i]).toBe(i % 2 === 0);
        expect(modules[i][6]).toBe(i % 2 === 0);
      }
      // The always-dark module.
      expect(modules[size - 8][8]).toBe(true);
    },
  );

  it('uses the expected versions', () => {
    expect(encodeQR('HELLO', 'M').version).toBe(1);
    expect(encodeQR('x'.repeat(42), 'M').version).toBe(3);
    expect(encodeQR('x'.repeat(45), 'M').version).toBe(4);
  });

  it('writes identical format information in both copies', () => {
    const { modules, size } = encodeQR('format check', 'Q');
    const a: boolean[] = [];
    for (let i = 0; i <= 5; i++) a.push(modules[i][8]);
    a.push(modules[7][8], modules[8][8], modules[8][7]);
    for (let i = 9; i < 15; i++) a.push(modules[8][14 - i]);
    const b: boolean[] = [];
    for (let i = 0; i < 8; i++) b.push(modules[8][size - 1 - i]);
    for (let i = 8; i < 15; i++) b.push(modules[size - 15 + i][8]);
    expect(a).toEqual(b);
  });

  it('is deterministic', () => {
    expect(encodeQR('same', 'H').modules).toEqual(encodeQR('same', 'H').modules);
  });

  it('throws on oversized input', () => {
    expect(() => encodeQR('x'.repeat(1000), 'H')).toThrow();
  });
});

/**
 * Draws a symbol the way QRCard does (dark on white, 4-module quiet zone) and
 * reads it back with an independent decoder. Returns the decoded UTF-8 text.
 */
function scan(modules: boolean[][], scale = 4, quiet = 4): string | null {
  const side = (modules.length + quiet * 2) * scale;
  const rgba = new Uint8ClampedArray(side * side * 4).fill(255);
  modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (!dark) return;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + quiet) * scale + dy) * side + (x + quiet) * scale + dx) * 4;
          rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
        }
      }
    });
  });
  const result = jsQR(rgba, side, side);
  return result ? new TextDecoder().decode(Uint8Array.from(result.binaryData)) : null;
}

describe('encodeQR: decode round trip', () => {
  const levels: ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H'];
  const cases = levels.flatMap((ecl) => Array.from({ length: 10 }, (_, i): [ErrorCorrectionLevel, number] => [ecl, i + 1]));

  it.each(cases)('level %s, version %i filled to capacity scans back to the input', (ecl, version) => {
    // Largest payload that still fits this version, so every data codeword is used.
    let bytes = 0;
    for (let n = 1; n <= 300; n++) if (chooseVersion(n, ecl) === version) bytes = n;
    expect(bytes).toBeGreaterThan(0);
    const text = Array.from({ length: bytes }, (_, i) => String.fromCharCode(33 + ((i * 7 + version) % 90))).join('');
    const qr = encodeQR(text, ecl);
    expect(qr.version).toBe(version);
    expect(scan(qr.modules)).toBe(text);
  });

  it.each([
    'https://github.com/muhib-karim/code-video-kit',
    'a',
    'héllo wörld ✓ 日本語 😀',
  ])('scans %s', (text) => {
    expect(scan(encodeQR(text, 'M').modules)).toBe(text);
  });

  it('scans at the non-integer module size QRCard draws (340px tile)', () => {
    const { modules, size } = encodeQR('https://github.com/muhib-karim/code-video-kit', 'M');
    const tile = 340;
    const dim = size + 8;
    const rgba = new Uint8ClampedArray(tile * tile * 4).fill(255);
    for (let py = 0; py < tile; py++) {
      for (let px = 0; px < tile; px++) {
        const mx = Math.floor((px * dim) / tile) - 4;
        const my = Math.floor((py * dim) / tile) - 4;
        if (modules[my]?.[mx]) {
          const i = (py * tile + px) * 4;
          rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
        }
      }
    }
    const result = jsQR(rgba, tile, tile);
    expect(result?.data).toBe('https://github.com/muhib-karim/code-video-kit');
  });
});
