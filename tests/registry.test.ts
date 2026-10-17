import { describe, expect, it } from 'vitest';
import { GROUPS, camelName, registry, type RegistryEntry } from '../src/registry';
import * as lib from '../src/index';

const byId: Array<[string, RegistryEntry]> = registry.map((e) => [e.id, e]);
const byName: Array<[string, RegistryEntry]> = registry.map((e) => [e.name, e]);

describe('registry', () => {
  it('has exactly 34 entries with unique ids', () => {
    expect(registry.length).toBe(34);
    const ids = registry.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses ids Remotion accepts', () => {
    for (const e of registry) expect(e.id).toMatch(/^[a-zA-Z0-9-]+$/);
  });

  it('uses the standard 1280x720 @ 30fps format and positive durations', () => {
    for (const e of registry) {
      expect(e.fps).toBe(30);
      expect(e.width).toBe(1280);
      expect(e.height).toBe(720);
      expect(Number.isInteger(e.durationInFrames)).toBe(true);
      expect(e.durationInFrames).toBeGreaterThan(0);
    }
  });

  it('assigns every entry to a known group, and every group is used', () => {
    const groups = new Set(GROUPS.map((g) => g.id));
    for (const e of registry) expect(groups.has(e.group)).toBe(true);
    for (const g of GROUPS) expect(registry.some((e) => e.group === g.id)).toBe(true);
  });

  it('has a title and description for every entry', () => {
    for (const e of registry) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.description.length).toBeGreaterThan(0);
    }
  });
});

describe('schemas', () => {
  it.each(byId)('%s: schema parses its default props', (_id, entry) => {
    const result = entry.schema.safeParse(entry.defaultProps);
    if (!result.success) throw new Error(`${entry.id}: ${result.error.message}`);
    expect(result.success).toBe(true);
  });

  it.each(byId)('%s: default props are JSON-serialisable', (_id, entry) => {
    expect(JSON.parse(JSON.stringify(entry.defaultProps))).toEqual(entry.defaultProps);
  });

  it.each(byId)('%s: rejects an invalid theme', (_id, entry) => {
    expect(entry.schema.safeParse({ ...entry.defaultProps, theme: 'sepia' }).success).toBe(false);
  });

  const nonFiniteProps: Array<[string, Record<string, unknown>]> = [
    ['bar-chart-race', { series: [{ label: 'A', values: [1, Infinity] }, { label: 'B', values: [2, 3] }] }],
    ['benchmark-bars', { items: [{ label: 'A', value: Infinity }] }],
    ['line-chart-reveal', { series: [{ label: 'A', points: [0, Infinity] }] }],
    ['stat-counter', { stats: [{ label: 'A', value: Infinity }, { label: 'B', value: 1 }] }],
    ['leaderboard', { entries: [{ name: 'A', score: Infinity }] }],
    ['leaderboard', { entries: [{ name: 'A', score: 1, delta: Infinity }] }],
    ['word-captions', { words: [{ text: 'A', startSec: 0, endSec: Infinity }] }],
    ['karaoke-caption', { words: [{ text: 'A', startSec: 0, endSec: Infinity }] }],
    ['subtitle-bar', { cues: [{ text: 'A', startSec: 0, endSec: Infinity }] }],
  ];
  it.each(nonFiniteProps)('%s: rejects non-finite data and timings', (id, props) => {
    const entry = registry.find((e) => e.id === id)!;
    expect(entry.schema.safeParse({ ...entry.defaultProps, ...props }).success).toBe(false);
  });
});

describe('public exports', () => {
  const exported = lib as unknown as Record<string, unknown>;
  it.each(byName)('%s is exported with schema and defaults', (name, entry) => {
    const camel = camelName(name);
    expect(exported[name]).toBe(entry.component);
    expect(exported[`${camel}Schema`]).toBe(entry.schema);
    expect(exported[`${camel}Defaults`]).toBe(entry.defaultProps);
  });

  it('derives camel-case export prefixes', () => {
    expect(camelName('TitleCard')).toBe('titleCard');
    expect(camelName('QRCard')).toBe('qrCard');
  });

  it('exports the theme and pure helpers', () => {
    for (const key of ['resolveTheme', 'fonts', 'tokenize', 'parseUnifiedDiff', 'activeWordIndex', 'racePositions', 'encodeQR', 'registry']) {
      expect(exported[key]).toBeDefined();
    }
  });
});
