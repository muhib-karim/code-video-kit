import { describe, expect, it } from 'vitest';
import {
  activeCueIndex,
  activePageIndex,
  activeWordIndex,
  evenWordTimings,
  frameToSec,
  paginateWords,
  secToFrame,
  wordProgress,
  type TimedWord,
} from '../src/lib/captions';

const words: TimedWord[] = [
  { text: 'Ship', startSec: 0.5, endSec: 0.9 },
  { text: 'faster', startSec: 0.9, endSec: 1.4 },
  { text: 'with', startSec: 1.5, endSec: 1.7 },
  { text: 'code', startSec: 1.7, endSec: 2.1 },
  { text: 'videos', startSec: 3.5, endSec: 4.0 },
];

describe('frame/second conversion', () => {
  it('converts both ways at 30 fps', () => {
    expect(frameToSec(45, 30)).toBe(1.5);
    expect(secToFrame(1.5, 30)).toBe(45);
    expect(secToFrame(0.51, 30)).toBe(15);
  });
});

describe('activeWordIndex', () => {
  it('is -1 before the first word', () => {
    expect(activeWordIndex(words, 0)).toBe(-1);
    expect(activeWordIndex(words, 0.49)).toBe(-1);
  });
  it('switches exactly at a word start', () => {
    expect(activeWordIndex(words, 0.5)).toBe(0);
    expect(activeWordIndex(words, 0.9)).toBe(1);
  });
  it('keeps the previous word active during gaps', () => {
    expect(activeWordIndex(words, 1.45)).toBe(1);
    expect(activeWordIndex(words, 3.0)).toBe(3);
  });
  it('stays on the last word after the end', () => {
    expect(activeWordIndex(words, 99)).toBe(4);
  });
  it('handles an empty list', () => {
    expect(activeWordIndex([], 1)).toBe(-1);
  });
});

describe('wordProgress', () => {
  const w = { text: 'x', startSec: 1, endSec: 2 };
  it('is clamped to 0..1', () => {
    expect(wordProgress(w, 0)).toBe(0);
    expect(wordProgress(w, 1.25)).toBeCloseTo(0.25);
    expect(wordProgress(w, 5)).toBe(1);
  });
  it('treats zero-length words as a step', () => {
    const z = { text: 'z', startSec: 1, endSec: 1 };
    expect(wordProgress(z, 0.99)).toBe(0);
    expect(wordProgress(z, 1)).toBe(1);
  });
});

describe('paginateWords', () => {
  it('splits by max words per page', () => {
    const pages = paginateWords(words.slice(0, 4), 2);
    expect(pages.map((p) => p.words.map((w) => w.text))).toEqual([
      ['Ship', 'faster'],
      ['with', 'code'],
    ]);
    expect(pages[1].startIndex).toBe(2);
    expect(pages[1].startSec).toBe(1.5);
    expect(pages[1].endSec).toBe(2.1);
  });
  it('breaks early on long pauses', () => {
    const pages = paginateWords(words, 10, 0.8);
    expect(pages).toHaveLength(2);
    expect(pages[1].words.map((w) => w.text)).toEqual(['videos']);
  });
  it('finds the active page', () => {
    const pages = paginateWords(words, 2);
    expect(activePageIndex(pages, 0)).toBe(-1);
    expect(activePageIndex(pages, 1.0)).toBe(0);
    expect(activePageIndex(pages, 1.6)).toBe(1);
    expect(activePageIndex(pages, 3.6)).toBe(2);
  });
});

describe('activeCueIndex', () => {
  const cues = [
    { text: 'a', startSec: 0, endSec: 1 },
    { text: 'b', startSec: 1.5, endSec: 3 },
  ];
  it('uses an inclusive start and exclusive end', () => {
    expect(activeCueIndex(cues, 0)).toBe(0);
    expect(activeCueIndex(cues, 1)).toBe(-1);
    expect(activeCueIndex(cues, 1.5)).toBe(1);
    expect(activeCueIndex(cues, 3)).toBe(-1);
  });
});

describe('evenWordTimings', () => {
  it('spreads words evenly over the span', () => {
    const t = evenWordTimings('one two  three four', 0, 2);
    expect(t.map((w) => w.text)).toEqual(['one', 'two', 'three', 'four']);
    expect(t[0]).toEqual({ text: 'one', startSec: 0, endSec: 0.5 });
    expect(t[3].endSec).toBeCloseTo(2);
  });
  it('returns [] for blank text', () => {
    expect(evenWordTimings('   ', 0, 1)).toEqual([]);
  });
});
