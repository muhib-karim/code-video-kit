/**
 * Rounds `value` up to a "nice" axis maximum (1, 2, 2.5, 5 or 10 times a
 * power of ten). `niceMax(87)` -> 100, `niceMax(230)` -> 250.
 */
export function niceMax(value: number): number {
  if (!(value > 0)) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const f = value / base;
  const steps = [1, 2, 2.5, 5, 10];
  const nice = steps.find((s) => f <= s + 1e-9) ?? 10;
  return nice * base;
}

export interface Point {
  x: number;
  y: number;
}

/** Maps a series of values to SVG coordinates inside a width x height box. */
export function scalePoints(values: readonly number[], width: number, height: number, min: number, max: number): Point[] {
  const n = values.length;
  const span = max - min || 1;
  return values.map((v, i) => ({
    x: n <= 1 ? 0 : (i / (n - 1)) * width,
    y: height - ((v - min) / span) * height,
  }));
}

/** Builds an SVG path "M x y L x y ..." through the points. */
export function buildLinePath(points: readonly Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`)
    .join(' ');
}

/** Total polyline length, used for stroke-dash reveal animations. */
export function pathLength(points: readonly Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return len;
}

/**
 * Speed-up of `value` relative to `baseline`.
 * For "lower is better" metrics (latency, ms) it's baseline / value,
 * otherwise value / baseline. Returns 0 for non-positive input.
 */
export function speedup(value: number, baseline: number, lowerIsBetter: boolean): number {
  if (!(value > 0) || !(baseline > 0)) return 0;
  return lowerIsBetter ? baseline / value : value / baseline;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
