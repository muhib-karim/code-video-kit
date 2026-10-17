import { describe, expect, it } from 'vitest';
import { frameToKeyTime, racePositions, rankAt, ranksFor, valuesAt, type RaceSeries } from '../src/lib/barRace';

const series: RaceSeries[] = [
  { label: 'A', values: [10, 20, 30] },
  { label: 'B', values: [30, 25, 10] },
  { label: 'C', values: [20, 20, 20] },
];

describe('valuesAt', () => {
  it('returns exact values on keyframes', () => {
    expect(valuesAt(series, 0)).toEqual([10, 30, 20]);
    expect(valuesAt(series, 2)).toEqual([30, 10, 20]);
  });
  it('interpolates linearly between keyframes', () => {
    expect(valuesAt(series, 0.5)).toEqual([15, 27.5, 20]);
    expect(valuesAt(series, 1.25)).toEqual([22.5, 21.25, 20]);
  });
  it('clamps outside the keyframe range', () => {
    expect(valuesAt(series, -3)).toEqual([10, 30, 20]);
    expect(valuesAt(series, 10)).toEqual([30, 10, 20]);
  });
  it('treats an empty value list as 0', () => {
    expect(valuesAt([{ label: 'x', values: [] }], 1)).toEqual([0]);
  });
});

describe('ranks', () => {
  it('ranks largest first', () => {
    expect(ranksFor([10, 30, 20])).toEqual([2, 0, 1]);
  });
  it('breaks ties by input order', () => {
    expect(ranksFor([5, 5, 7])).toEqual([1, 2, 0]);
  });
  it('rankAt uses interpolated values', () => {
    expect(rankAt(series, 0)).toEqual([2, 0, 1]);
    expect(rankAt(series, 2)).toEqual([0, 2, 1]);
  });
});

describe('racePositions', () => {
  it('matches integer ranks on keyframes', () => {
    const rows = racePositions(series, 0);
    expect(rows.map((r) => r.position)).toEqual([2, 0, 1]);
    expect(rows.map((r) => r.rank)).toEqual([2, 0, 1]);
  });
  it('glides between ranks inside an interval', () => {
    // keyframe 1: A=20, B=25, C=20 -> ranks [1, 0, 2]; keyframe 2: ranks [0, 2, 1]
    const rows = racePositions(series, 1.5);
    expect(rows[0].position).toBeCloseTo(0.5);
    expect(rows[1].position).toBeCloseTo(1);
    expect(rows[2].position).toBeCloseTo(1.5);
  });
  it('applies the easing function to the swap progress', () => {
    const rows = racePositions(series, 1.5, () => 1);
    expect(rows.map((r) => r.position)).toEqual([0, 2, 1]);
  });
  it('keeps series identity and labels', () => {
    const rows = racePositions(series, 0.7);
    expect(rows.map((r) => r.label)).toEqual(['A', 'B', 'C']);
    expect(rows.map((r) => r.seriesIndex)).toEqual([0, 1, 2]);
  });
  it('clamps past the last keyframe', () => {
    const rows = racePositions(series, 5);
    expect(rows.map((r) => r.position)).toEqual([0, 2, 1]);
  });
});

describe('frameToKeyTime', () => {
  it('divides by frames per keyframe', () => {
    expect(frameToKeyTime(45, 30)).toBe(1.5);
    expect(frameToKeyTime(10, 0)).toBe(0);
  });
});
