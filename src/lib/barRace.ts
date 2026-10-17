/** One competitor in a bar chart race: a value per keyframe. */
export interface RaceSeries {
  label: string;
  color?: string;
  values: number[];
}

export interface RaceRow {
  label: string;
  /** Index of the series in the input array (stable identity for colour). */
  seriesIndex: number;
  value: number;
  /** Integer rank at the nearest keyframe ordering (0 = top). */
  rank: number;
  /** Smoothly interpolated rank used for vertical position. */
  position: number;
}

function valueAt(values: readonly number[], t: number): number {
  if (values.length === 0) return 0;
  if (t <= 0) return values[0];
  const last = values.length - 1;
  if (t >= last) return values[last];
  const i = Math.floor(t);
  const f = t - i;
  return values[i] + (values[i + 1] - values[i]) * f;
}

/**
 * Value of every series at fractional keyframe time `t`
 * (0 = first keyframe, 1 = second, ...). Linear between keyframes and
 * clamped at both ends.
 */
export function valuesAt(series: readonly RaceSeries[], t: number): number[] {
  return series.map((s) => valueAt(s.values, t));
}

/**
 * Ranks of every series (0 = largest) for the given values. Ties keep input
 * order so ranking is stable.
 */
export function ranksFor(values: readonly number[]): number[] {
  const order = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => (b.v === a.v ? a.i - b.i : b.v - a.v));
  const ranks = new Array<number>(values.length);
  order.forEach((o, rank) => {
    ranks[o.i] = rank;
  });
  return ranks;
}

/** Ranks at fractional time `t`, computed from interpolated values. */
export function rankAt(series: readonly RaceSeries[], t: number): number[] {
  return ranksFor(valuesAt(series, t));
}

/**
 * Full race state at fractional time `t`. Positions are interpolated between
 * the ranks at the surrounding integer keyframes using `swapEase` (0..1
 * progress within the keyframe interval), so bars glide instead of jumping.
 */
export function racePositions(
  series: readonly RaceSeries[],
  t: number,
  swapEase: (p: number) => number = (p) => p,
): RaceRow[] {
  const values = valuesAt(series, t);
  const maxKey = Math.max(0, ...series.map((s) => s.values.length - 1));
  const tc = Math.min(Math.max(t, 0), maxKey);
  const i0 = Math.floor(tc);
  const i1 = Math.min(i0 + 1, maxKey);
  const p = swapEase(tc - i0);
  const r0 = rankAt(series, i0);
  const r1 = rankAt(series, i1);
  const current = ranksFor(values);
  return series.map((s, i) => ({
    label: s.label,
    seriesIndex: i,
    value: values[i],
    rank: current[i],
    position: r0[i] + (r1[i] - r0[i]) * p,
  }));
}

/** Converts a frame into fractional keyframe time. */
export function frameToKeyTime(frame: number, framesPerKeyframe: number): number {
  return framesPerKeyframe > 0 ? frame / framesPerKeyframe : 0;
}
