import { describe, expect, it } from 'vitest';
import { parseLineRanges } from '../src/lib/ranges';
import { parseUnifiedDiff } from '../src/lib/diff';
import { buildLinePath, niceMax, pathLength, scalePoints, speedup } from '../src/lib/chart';
import { buildTree } from '../src/lib/fileTree';
import { clamp, formatNumber, lerp, progress } from '../src/lib/math';
import { resolveTheme, withAlpha, readableOn } from '../src/theme';

describe('parseLineRanges', () => {
  it('parses single lines and ranges', () => {
    expect(parseLineRanges('1-3, 7')).toEqual([1, 2, 3, 7]);
  });
  it('normalises reversed ranges, de-duplicates and sorts', () => {
    expect(parseLineRanges('5-3,4,1')).toEqual([1, 3, 4, 5]);
  });
  it('ignores garbage and zero', () => {
    expect(parseLineRanges('a, 0, 2-x, 2')).toEqual([2]);
    expect(parseLineRanges('')).toEqual([]);
  });
});

describe('parseUnifiedDiff', () => {
  it('classifies lines and numbers them', () => {
    const lines = parseUnifiedDiff('--- a/x.ts\n+++ b/x.ts\n@@ -10,3 +10,3 @@\n keep\n-old\n+new\n');
    expect(lines.map((l) => l.type)).toEqual(['context', 'remove', 'add']);
    expect(lines[0]).toEqual({ type: 'context', text: 'keep', oldNumber: 10, newNumber: 10 });
    expect(lines[1]).toEqual({ type: 'remove', text: 'old', oldNumber: 11 });
    expect(lines[2]).toEqual({ type: 'add', text: 'new', newNumber: 11 });
  });
  it('treats unmarked lines as context', () => {
    expect(parseUnifiedDiff('plain')[0].type).toBe('context');
  });
});

describe('chart helpers', () => {
  it('niceMax rounds up to friendly axis maxima', () => {
    expect(niceMax(87)).toBe(100);
    expect(niceMax(230)).toBe(250);
    expect(niceMax(4.2)).toBe(5);
    expect(niceMax(1)).toBe(1);
    expect(niceMax(0)).toBe(1);
  });
  it('scales points into the box with y flipped', () => {
    const pts = scalePoints([0, 50, 100], 200, 100, 0, 100);
    expect(pts).toEqual([
      { x: 0, y: 100 },
      { x: 100, y: 50 },
      { x: 200, y: 0 },
    ]);
    expect(buildLinePath(pts)).toBe('M0 100 L100 50 L200 0');
  });
  it('measures polyline length', () => {
    expect(pathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }])).toBe(11);
  });
  it('computes speed-ups for both metric directions', () => {
    expect(speedup(10, 30, true)).toBe(3);
    expect(speedup(300, 100, false)).toBe(3);
    expect(speedup(0, 100, false)).toBe(0);
  });
});

describe('buildTree', () => {
  it('nests paths with directories first', () => {
    const rows = buildTree([
      { path: 'src/index.ts' },
      { path: 'README.md' },
      { path: 'src/lib/math.ts', highlight: true, note: 'pure' },
      { path: 'tests/' },
    ]);
    expect(rows.map((r) => `${'  '.repeat(r.depth)}${r.name}${r.isDir ? '/' : ''}`)).toEqual([
      'src/',
      '  lib/',
      '    math.ts',
      '  index.ts',
      'tests/',
      'README.md',
    ]);
    const math = rows.find((r) => r.name === 'math.ts');
    expect(math?.highlight).toBe(true);
    expect(math?.note).toBe('pure');
    expect(math?.path).toBe('src/lib/math.ts');
  });
});

describe('math helpers', () => {
  it('clamp/lerp/progress', () => {
    expect(clamp(2)).toBe(1);
    expect(clamp(-1)).toBe(0);
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(progress(15, 10, 10)).toBe(0.5);
    expect(progress(5, 10, 0)).toBe(0);
  });
  it('formatNumber groups thousands and fixes decimals', () => {
    expect(formatNumber(12345.678, 1)).toBe('12,345.7');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(-1234)).toBe('-1,234');
    expect(formatNumber(-0.0001, 2)).toBe('0.00');
  });
});

describe('theme', () => {
  it('resolves both modes with the given accent', () => {
    expect(resolveTheme('dark', '#ff0000').accent).toBe('#ff0000');
    expect(resolveTheme('light').mode).toBe('light');
    expect(resolveTheme('dark').series.length).toBe(8);
  });
  it('withAlpha converts hex to rgba', () => {
    expect(withAlpha('#ffffff', 0.5)).toBe('rgba(255,255,255,0.5)');
    expect(withAlpha('#000', 1)).toBe('rgba(0,0,0,1)');
    expect(withAlpha('red', 0.5)).toBe('red');
  });
  it('readableOn picks contrasting text', () => {
    expect(readableOn('#ffffff')).toBe('#0B0D12');
    expect(readableOn('#000000')).toBe('#FFFFFF');
  });
});
