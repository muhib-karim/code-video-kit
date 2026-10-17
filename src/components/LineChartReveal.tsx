import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, resolveTheme, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';
import { buildLinePath, niceMax, pathLength, scalePoints, type Point } from '../lib/chart';
import { formatNumber } from '../lib/math';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
/** Frame at which the lines start drawing (after the grid fades in). */
const REVEAL_START = 18;
/** Direct end-of-line labels are only drawn for up to this many series. */
const MAX_DIRECT_LABELS = 4;

export const lineChartRevealSchema = z.object({
  ...baseThemeSchema,
  title: z.string().describe('Chart headline shown top-left, e.g. "Weekly downloads". Empty string hides it.'),
  xLabels: z
    .array(z.string())
    .min(2)
    .max(24)
    .describe('Category labels along the x axis, left to right (e.g. months). Each series should have one point per label.'),
  series: z
    .array(
      z.object({
        label: z.string().describe('Series name, used in the legend and the end-of-line label.'),
        color: z
          .string()
          .optional()
          .describe('Optional line colour (hex). Omit to use the theme categorical palette by series index.'),
        points: z
          .array(z.number().min(0))
          .min(2)
          .describe('Non-negative y values, one per xLabel. Extra points beyond xLabels are ignored.'),
      }),
    )
    .min(1)
    .max(8)
    .describe('Lines to draw. End-of-line labels are shown for up to 4 series; a legend appears for 2 or more.'),
  yUnit: z
    .string()
    .describe('Unit appended to y-axis and end labels, e.g. "k", "%" or "ms". Include a leading space for words (" req/s").'),
  revealFrames: z
    .number()
    .int()
    .min(1)
    .max(600)
    .describe('Frames the lines take to draw from left to right (30 = 1 second at 30 fps).'),
});

export type LineChartRevealProps = z.infer<typeof lineChartRevealSchema>;

export const lineChartRevealDefaults: LineChartRevealProps = {
  ...baseThemeDefaults,
  title: 'Weekly downloads',
  xLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
  series: [
    { label: 'fastkit', points: [12, 18, 26, 34, 47, 61, 78, 96] },
    { label: 'legacy-lib', points: [64, 66, 63, 65, 62, 60, 58, 55] },
    { label: 'other-kit', points: [8, 11, 15, 19, 24, 28, 33, 39] },
  ],
  yUnit: 'k',
  revealFrames: 90,
};

function seriesColor(p: Palette, index: number): string {
  const c = index >= 0 && index < p.series.length ? p.series[index] : undefined;
  return c ?? p.textFaint;
}

/** Point at distance `dist` along a polyline. */
function pointAlong(pts: readonly Point[], dist: number): Point {
  if (pts.length === 0) return { x: 0, y: 0 };
  let remaining = Math.max(0, dist);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= seg) {
      const f = seg > 0 ? remaining / seg : 0;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    remaining -= seg;
  }
  return pts[pts.length - 1];
}

/** Pushes label y positions apart by at least `gap`, staying inside [min, max]. */
function spreadLabels(ys: readonly number[], gap: number, min: number, max: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const out = new Array<number>(ys.length).fill(0);
  let prev = -Infinity;
  for (const o of order) {
    const y = Math.max(o.y, prev + gap, min);
    out[o.i] = y;
    prev = y;
  }
  let next = Infinity;
  for (let k = order.length - 1; k >= 0; k--) {
    const idx = order[k].i;
    const y = Math.min(out[idx], next - gap, max);
    out[idx] = y;
    next = y;
  }
  return out;
}

function stepDecimals(step: number): number {
  if (Math.abs(step - Math.round(step)) < 1e-6) return 0;
  if (Math.abs(step * 10 - Math.round(step * 10)) < 1e-6) return 1;
  return 2;
}

/**
 * SVG line chart whose lines draw left to right (stroke-dashoffset) with a
 * travelling head marker, recessive gridlines, a legend for multiple series
 * and direct value labels at the end of each line once the reveal finishes.
 */
export const LineChartReveal: React.FC<LineChartRevealProps> = ({
  theme,
  accent,
  title,
  xLabels,
  series,
  yUnit,
  revealFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const padX = 80;
  const showDirect = series.length <= MAX_DIRECT_LABELS;
  const showLegend = series.length >= 2;
  const plotLeft = padX + 72;
  const plotRight = width - padX - (showDirect ? 180 : 20);
  const plotTop = showLegend ? 176 : title ? 140 : 80;
  const plotBottom = height - 100;
  const plotW = Math.max(1, plotRight - plotLeft);
  const plotH = Math.max(1, plotBottom - plotTop);

  const n = xLabels.length;
  const xStep = n > 1 ? plotW / (n - 1) : 0;

  let rawMax = 0;
  for (const s of series) {
    for (const v of s.points.slice(0, n)) rawMax = Math.max(rawMax, v);
  }
  const yMax = niceMax(rawMax);
  const yStep = yMax / 4;
  const yDecimals = stepDecimals(yStep);
  const yToPx = (v: number) => plotTop + plotH - (v / yMax) * plotH;

  const geo = series.map((s, i) => {
    const vals = s.points.slice(0, Math.max(2, n));
    const pts = scalePoints(vals, (vals.length - 1) * xStep, plotH, 0, yMax).map((pt) => ({
      x: pt.x + plotLeft,
      y: pt.y + plotTop,
    }));
    const last = vals.length > 0 ? vals[vals.length - 1] : 0;
    const end = pts.length > 0 ? pts[pts.length - 1] : { x: plotLeft, y: plotBottom };
    return {
      label: s.label,
      color: s.color ?? seriesColor(p, i),
      pts,
      d: buildLinePath(pts),
      len: pathLength(pts),
      last,
      end,
    };
  });

  const labelYs = spreadLabels(
    geo.map((g) => g.end.y),
    30,
    plotTop,
    plotBottom,
  );

  const gridIn = interpolate(frame, [0, 15], [0, 1], CLAMP);
  const headerIn = spring({ frame, fps, config: { damping: 200 } });
  const reveal = Math.max(1, revealFrames);
  const prog = interpolate(frame, [REVEAL_START, REVEAL_START + reveal], [0, 1], {
    ...CLAMP,
    easing: Easing.inOut(Easing.cubic),
  });
  const labelsIn = interpolate(frame, [REVEAL_START + reveal - 4, REVEAL_START + reveal + 14], [0, 1], CLAMP);
  const labelEvery = Math.max(1, Math.ceil(n / 12));

  return (
    <Backdrop palette={p} grid={false}>
      <AbsoluteFill>
        {title ? (
          <div
            style={{
              position: 'absolute',
              left: padX,
              top: 52,
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: -1,
              color: p.text,
              opacity: headerIn,
              transform: `translateY(${(1 - headerIn) * 16}px)`,
            }}
          >
            {title}
          </div>
        ) : null}

        {showLegend ? (
          <div
            style={{
              position: 'absolute',
              left: padX,
              top: title ? 116 : 52,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 28,
              opacity: headerIn,
            }}
          >
            {geo.map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 4, borderRadius: 2, background: g.color }} />
                <div style={{ fontSize: 20, color: p.textMuted, whiteSpace: 'nowrap' }}>{g.label}</div>
              </div>
            ))}
          </div>
        ) : null}

        <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
          <g opacity={gridIn}>
            {[0, 1, 2, 3, 4].map((k) => {
              const v = yStep * k;
              const y = yToPx(v);
              return (
                <g key={k}>
                  <line
                    x1={plotLeft}
                    x2={plotRight}
                    y1={y}
                    y2={y}
                    stroke={k === 0 ? p.border : p.grid}
                    strokeWidth={1}
                  />
                  <text
                    x={plotLeft - 16}
                    y={y + 6}
                    textAnchor="end"
                    fontFamily={fonts.mono}
                    fontSize={18}
                    fill={p.textMuted}
                  >
                    {`${formatNumber(v, yDecimals)}${yUnit}`}
                  </text>
                </g>
              );
            })}
            {xLabels.map((label, i) =>
              i % labelEvery === 0 ? (
                <text
                  key={i}
                  x={plotLeft + i * xStep}
                  y={plotBottom + 36}
                  textAnchor="middle"
                  fontFamily={fonts.sans}
                  fontSize={19}
                  fill={p.textMuted}
                >
                  {label}
                </text>
              ) : null,
            )}
          </g>

          {geo.map((g, i) => {
            const drawn = g.len * prog;
            const head = pointAlong(g.pts, drawn);
            return (
              <g key={i} opacity={prog > 0 ? 1 : 0}>
                <path
                  d={g.d}
                  fill="none"
                  stroke={g.color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${g.len + 1} ${g.len + 1}`}
                  strokeDashoffset={(g.len + 1) * (1 - prog)}
                />
                <circle cx={head.x} cy={head.y} r={6} fill={g.color} stroke={p.background} strokeWidth={2.5} />
              </g>
            );
          })}

          {showDirect
            ? geo.map((g, i) => (
                <text
                  key={i}
                  x={g.end.x + 16}
                  y={labelYs[i] + 7}
                  fontFamily={fonts.sans}
                  fontSize={20}
                  fontWeight={600}
                  fill={p.text}
                  opacity={labelsIn}
                >
                  {g.label}
                  <tspan dx={8} fill={p.textMuted} fontWeight={500} fontFamily={fonts.mono}>
                    {`${formatNumber(g.last, Number.isInteger(g.last) ? 0 : 1)}${yUnit}`}
                  </tspan>
                </text>
              ))
            : null}
        </svg>
      </AbsoluteFill>
    </Backdrop>
  );
};
