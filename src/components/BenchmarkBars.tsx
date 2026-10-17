import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, radii, resolveTheme, withAlpha } from '../theme';
import { Backdrop } from '../internal/ui';
import { niceMax, speedup } from '../lib/chart';
import { formatNumber } from '../lib/math';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const GROW_FRAMES = 40;

export const benchmarkBarsSchema = z.object({
  ...baseThemeSchema,
  title: z.string().describe('Headline, e.g. "Cold start time". Empty string hides it.'),
  subtitle: z
    .string()
    .describe('Line under the title explaining the metric, e.g. "p50 latency, lower is better". Empty string hides it.'),
  unit: z.string().describe('Unit shown after each value, e.g. "ms" or "req/s". Empty string for none.'),
  items: z
    .array(
      z.object({
        label: z.string().describe('Name of the contender, shown left of its bar. Keep it under ~16 characters.'),
        value: z.number().min(0).describe('Measured value in `unit`. Bar length is always proportional to it.'),
        highlight: z
          .boolean()
          .optional()
          .describe('Mark this item as the hero: drawn in the accent colour while others stay neutral. Use on one item.'),
      }),
    )
    .min(1)
    .max(8)
    .describe('Benchmark results, drawn top to bottom in this order.'),
  lowerIsBetter: z
    .boolean()
    .describe('True for time/latency metrics (smaller wins), false for throughput metrics (bigger wins). Drives the multiplier maths.'),
  showMultiplier: z
    .boolean()
    .describe('Show a pill on the highlighted item, e.g. "3.2× faster", relative to the best non-highlighted item. Hidden if the hero is not ahead.'),
  footnote: z.string().describe('Small muted note at the bottom: hardware, methodology or data source. Empty string hides it.'),
});

export type BenchmarkBarsProps = z.infer<typeof benchmarkBarsSchema>;

export const benchmarkBarsDefaults: BenchmarkBarsProps = {
  ...baseThemeDefaults,
  title: 'Cold start time',
  subtitle: 'p50 latency in milliseconds, lower is better',
  unit: 'ms',
  items: [
    { label: 'fastkit', value: 42, highlight: true },
    { label: 'Framework A', value: 138 },
    { label: 'Framework B', value: 196 },
    { label: 'Framework C', value: 251 },
    { label: 'Framework D', value: 310 },
  ],
  lowerIsBetter: true,
  showMultiplier: true,
  footnote: 'Illustrative sample data, not a real benchmark.',
};

function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  const i = s.indexOf('.');
  return i < 0 ? 0 : Math.min(2, s.length - i - 1);
}

/**
 * Horizontal benchmark bars that grow from zero while their values count up.
 * The highlighted item is drawn in the accent colour (others neutral) and can
 * carry an "N× faster" pill computed against the best competitor.
 */
export const BenchmarkBars: React.FC<BenchmarkBarsProps> = ({
  theme,
  accent,
  title,
  subtitle,
  unit,
  items,
  lowerIsBetter,
  showMultiplier,
  footnote,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const n = Math.max(1, items.length);
  const heroIndex = items.findIndex((it) => it.highlight === true);
  const axisMax = niceMax(Math.max(0, ...items.map((it) => it.value)));

  let multiplier = 0;
  if (showMultiplier && heroIndex >= 0) {
    const heroValue = items[heroIndex]?.value ?? 0;
    const others = items.filter((it, i) => i !== heroIndex && it.value > 0).map((it) => it.value);
    if (others.length > 0) {
      const baseline = lowerIsBetter ? Math.min(...others) : Math.max(...others);
      multiplier = speedup(heroValue, baseline, lowerIsBetter);
    }
  }
  const showPill = multiplier >= 1;
  const pillText = `${formatNumber(multiplier, multiplier >= 10 ? 0 : 1)}× faster`;

  const padX = 96;
  const headerIn = spring({ frame, fps, config: { damping: 200 } });
  const chartTop = title || subtitle ? 196 : 100;
  const chartBottom = height - (footnote ? 130 : 96);
  const rowH = Math.min(84, Math.max(24, (chartBottom - chartTop) / n));
  const barH = Math.max(10, Math.min(44, Math.round(rowH * 0.58)));
  const labelW = 240;
  const barX = padX + labelW;
  const available = Math.max(120, width - barX - padX);
  const valueText = (v: number) => `${formatNumber(v, decimalsOf(v))}${unit ? ` ${unit}` : ''}`;

  // Pixel width of the full axis (0..axisMax), shrunk until every bar plus
  // its value label (and the hero pill) fits inside the frame.
  let maxBarW = available;
  items.forEach((it, i) => {
    if (!(it.value > 0)) return;
    let room = 14 + valueText(it.value).length * 13.5 + 8;
    if (i === heroIndex && showPill) room += 16 + pillText.length * 11.5 + 28;
    maxBarW = Math.min(maxBarW, ((available - room) * axisMax) / it.value);
  });
  maxBarW = Math.max(60, maxBarW);

  const tickStep = axisMax / 4;
  const tickDecimals =
    Math.abs(tickStep - Math.round(tickStep)) < 1e-6 ? 0 : Math.abs(tickStep * 10 - Math.round(tickStep * 10)) < 1e-6 ? 1 : 2;
  const gridH = n * rowH;
  const neutral = withAlpha(p.textFaint, 0.55);

  return (
    <Backdrop palette={p}>
      <AbsoluteFill>
        {title ? (
          <div
            style={{
              position: 'absolute',
              left: padX,
              top: 56,
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
        {subtitle ? (
          <div
            style={{
              position: 'absolute',
              left: padX,
              top: title ? 116 : 56,
              fontSize: 24,
              color: p.textMuted,
              opacity: headerIn,
            }}
          >
            {subtitle}
          </div>
        ) : null}

        {/* Recessive quarter-step grid with tick labels, then the baseline */}
        {[1, 2, 3, 4].map((k) => (
          <React.Fragment key={k}>
            <div
              style={{
                position: 'absolute',
                left: barX + (maxBarW * k) / 4,
                top: chartTop,
                width: 1,
                height: gridH,
                background: p.grid,
                opacity: headerIn,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: barX + (maxBarW * k) / 4,
                top: chartTop + gridH + 8,
                transform: 'translateX(-50%)',
                fontFamily: fonts.mono,
                fontSize: 18,
                color: p.textFaint,
                whiteSpace: 'nowrap',
                opacity: headerIn,
              }}
            >
              {formatNumber(tickStep * k, tickDecimals)}
            </div>
          </React.Fragment>
        ))}
        <div
          style={{
            position: 'absolute',
            left: barX - 1,
            top: chartTop,
            width: 1,
            height: gridH,
            background: p.border,
            opacity: headerIn,
          }}
        />

        {items.map((it, i) => {
          const start = 14 + i * 6;
          const grow = interpolate(frame, [start, start + GROW_FRAMES], [0, 1], {
            ...CLAMP,
            easing: Easing.out(Easing.cubic),
          });
          const rowIn = interpolate(frame, [start - 8, start + 4], [0, 1], CLAMP);
          const isHero = i === heroIndex;
          const w = axisMax > 0 ? (it.value / axisMax) * maxBarW * grow : 0;
          const shown = it.value * grow;
          const pillIn = spring({
            frame: frame - (start + GROW_FRAMES - 4),
            fps,
            config: { damping: 14, mass: 0.6 },
          });
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: padX,
                top: chartTop + i * rowH,
                height: rowH,
                width: width - padX * 2,
                display: 'flex',
                alignItems: 'center',
                opacity: rowIn,
              }}
            >
              <div
                style={{
                  width: labelW - 24,
                  marginRight: 24,
                  textAlign: 'right',
                  fontSize: 24,
                  fontWeight: isHero ? 700 : 500,
                  color: isHero ? p.text : p.textMuted,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 0,
                }}
              >
                {it.label}
              </div>
              <div
                style={{
                  width: w,
                  height: barH,
                  flexShrink: 0,
                  background: isHero ? p.accent : neutral,
                  borderRadius: '0 4px 4px 0',
                }}
              />
              <div
                style={{
                  marginLeft: 14,
                  fontFamily: fonts.mono,
                  fontSize: 22,
                  fontWeight: isHero ? 700 : 500,
                  color: isHero ? p.text : p.textMuted,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {formatNumber(shown, decimalsOf(it.value))}
                {unit ? ` ${unit}` : ''}
              </div>
              {isHero && showPill ? (
                <div
                  style={{
                    marginLeft: 16,
                    padding: '6px 14px',
                    borderRadius: radii.pill,
                    background: p.accent,
                    color: p.onAccent,
                    fontSize: 20,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    opacity: Math.min(1, Math.max(0, pillIn)),
                    transform: `scale(${0.6 + 0.4 * pillIn})`,
                  }}
                >
                  {pillText}
                </div>
              ) : null}
            </div>
          );
        })}

        {footnote ? (
          <div
            style={{
              position: 'absolute',
              left: padX,
              bottom: 44,
              fontSize: 18,
              color: p.textFaint,
              opacity: headerIn,
            }}
          >
            {footnote}
          </div>
        ) : null}
      </AbsoluteFill>
    </Backdrop>
  );
};
