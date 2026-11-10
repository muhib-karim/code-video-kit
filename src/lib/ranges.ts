/**
 * Highest line number a range may expand to. No snippet is this long, and the
 * cap keeps a mistyped spec ("1-20000000") from stalling or crashing a render.
 */
const MAX_LINE = 100_000;

/**
 * Parses a 1-based line range spec such as "1-3, 7, 10-11" into a sorted,
 * de-duplicated list of line numbers. Invalid parts are ignored; reversed
 * ranges ("5-3") are normalised; lines above 100,000 are dropped.
 */
export function parseLineRanges(spec: string): number[] {
  const out = new Set<number>();
  for (const raw of spec.split(',')) {
    const part = raw.trim();
    if (!part) continue;
    const m = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(part);
    if (!m) continue;
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : Number(m[2]);
    // Beyond the safe integer range, incrementing i may never advance it.
    if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) continue;
    const lo = Math.max(1, Math.min(a, b));
    const hi = Math.min(MAX_LINE, Math.max(a, b));
    for (let i = lo; i <= hi; i++) out.add(i);
  }
  return [...out].sort((x, y) => x - y);
}
