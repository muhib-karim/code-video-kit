import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { registry, type RegistryEntry } from '../src/registry';

// Supply a composition clock without a browser; keep Remotion's animation math real.
const clock = vi.hoisted(() => ({ frame: 0, durationInFrames: 150 }));
vi.mock('remotion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('remotion')>();
  return {
    ...actual,
    useCurrentFrame: () => clock.frame,
    useVideoConfig: () => ({ fps: 30, width: 1280, height: 720, durationInFrames: clock.durationInFrames }),
  };
});

/**
 * A number that failed to compute, printed into a style, an SVG attribute or
 * text. No trailing word boundary: React serialises a NaN length as "NaNpx".
 */
const BROKEN_VALUE = /\b(?:NaN|Infinity|undefined)/;

function render(entry: RegistryEntry, frame: number, props: Record<string, unknown> = entry.defaultProps): string {
  clock.frame = frame;
  clock.durationInFrames = entry.durationInFrames;
  return renderToStaticMarkup(createElement(entry.component, props));
}

const keyFrames = (entry: RegistryEntry): number[] => {
  const last = entry.durationInFrames - 1;
  return [0, 1, Math.floor(last / 2), last];
};

describe('broken-value detector', () => {
  it('flags NaN in styles, SVG attributes and text, and passes clean markup', () => {
    const markup = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);
    expect(BROKEN_VALUE.test(markup(createElement('div', { style: { width: NaN } })))).toBe(true);
    expect(BROKEN_VALUE.test(markup(createElement('div', { style: { transform: `translateY(${0 / 0}px)` } })))).toBe(true);
    expect(BROKEN_VALUE.test(markup(createElement('circle', { r: 1 / 0 })))).toBe(true);
    expect(BROKEN_VALUE.test(markup(createElement('span', null, String(undefined))))).toBe(true);
    expect(BROKEN_VALUE.test(markup(createElement('div', { style: { width: 12, opacity: 0.5 } }, 'Nano')))).toBe(false);
  });
});

describe('every component renders its default props', () => {
  const entries: Array<[string, RegistryEntry]> = registry.map((e) => [e.id, e]);

  it.each(entries)('%s: first, second, middle and last frame', (_id, entry) => {
    for (const frame of keyFrames(entry)) {
      const html = render(entry, frame);
      expect(html.length, `frame ${frame}`).toBeGreaterThan(0);
      expect(BROKEN_VALUE.exec(html)?.[0], `frame ${frame}`).toBeUndefined();
    }
  });
});

describe('every component tolerates an empty list', () => {
  // One case per list-valued prop, e.g. bar-chart-race with series = [].
  const cases: Array<[string, string, RegistryEntry]> = registry.flatMap((entry) =>
    Object.entries(entry.defaultProps)
      .filter(([, value]) => Array.isArray(value))
      .map(([prop]): [string, string, RegistryEntry] => [entry.id, prop, entry]),
  );

  it('covers the list-valued props', () => {
    expect(cases.length).toBeGreaterThan(20);
  });

  it.each(cases)('%s with %s = []', (_id, prop, entry) => {
    for (const frame of keyFrames(entry)) {
      const html = render(entry, frame, { ...entry.defaultProps, [prop]: [] });
      expect(BROKEN_VALUE.exec(html)?.[0], `frame ${frame}`).toBeUndefined();
    }
  });
});
