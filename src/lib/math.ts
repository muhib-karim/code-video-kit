/** Clamps `value` into [min, max]. */
export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation between a and b. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 0..1 progress of `frame` through the window [start, start + duration], clamped. */
export function progress(frame: number, start: number, duration: number): number {
  if (duration <= 0) return frame >= start ? 1 : 0;
  return clamp((frame - start) / duration);
}

export function easeOutCubic(t: number): number {
  const c = clamp(t);
  return 1 - Math.pow(1 - c, 3);
}

export function easeInOutCubic(t: number): number {
  const c = clamp(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/**
 * Formats a number with fixed decimals and thousands separators.
 * `formatNumber(12345.678, 1)` -> "12,345.7".
 */
export function formatNumber(value: number, decimals = 0): string {
  const fixed = Math.abs(value).toFixed(Math.max(0, decimals));
  const [int, frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = value < 0 && Number(fixed) !== 0 ? '-' : '';
  return sign + (frac ? `${grouped}.${frac}` : grouped);
}
