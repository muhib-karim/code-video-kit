import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, resolveTheme, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';
import { frameToKeyTime, racePositions } from '../lib/barRace';
import { easeInOutCubic, formatNumber } from '../lib/math';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
/** Frames the bars spend growing in before the race starts. */
const INTRO_FRAMES = 20;

export const barChartRaceSchema = z.object({
  ...baseThemeSchema,
  title: z.string().describe('Chart headline shown top-left, e.g. "Most used languages". Empty string hides it.'),
  keyframeLabels: z
    .array(z.string())
    .min(2)
    .describe(
      'One label per keyframe (usually years), shown large in the bottom-right corner and crossfaded as the race advances. Use the same length as each series "values" array.',
    ),
  series: z
    .array(
      z.object({
        label: z.string().describe('Name of this competitor, shown left of its bar. Keep it under ~14 characters.'),
        color: z
          .string()
          .optional()
          .describe(
            'Optional bar colour (hex). Omit to use the theme categorical palette by series index; the colour stays with the series as it changes rank.',
          ),
        values: z
          .array(z.number().finite().min(0))
          .min(2)
          .describe('Non-negative value at each keyframe, same order as keyframeLabels. Linearly interpolated between keyframes.'),
      }),
    )
    .min(2)
    .max(16)
    .describe('Competitors in the race. Input order only fixes colour identity; ranking is computed from the values.'),
  framesPerKeyframe: z
    .number()
    .int()
    .min(15)
    .max(600)
    .describe('Frames spent travelling from one keyframe to the next (30 = 1 second at 30 fps).'),
  topN: z.number().int().min(2).max(10).describe('How many bars are visible at once; bars ranked below this fade out.'),
  valueSuffix: z.string().describe('Text appended to the value at each bar end, e.g. "%" or "k". Empty string for none.'),
});

export type BarChartRaceProps = z.infer<typeof barChartRaceSchema>;

export const barChartRaceDefaults: BarChartRaceProps = {
  ...baseThemeDefaults,
  title: 'Languages developers use most',
  keyframeLabels: ['2021', '2022', '2023', '2024', '2025'],
  series: [
    { label: 'Python', values: [44.1, 46.3, 48.0, 49.2, 51.0] },
    { label: 'TypeScript', values: [34.8, 38.9, 42.5, 46.1, 52.4] },
    { label: 'Go', values: [13.2, 14.5, 15.8, 16.4, 17.9] },
    { label: 'Rust', values: [7.1, 9.3, 13.0, 15.7, 19.2] },
    { label: 'Kotlin', values: [9.2, 9.6, 9.4, 9.8, 10.1] },
    { label: 'Zig', values: [0.9, 2.0, 4.1, 7.2, 10.6] },
  ],
  framesPerKeyframe: 60,
  topN: 5,
  valueSuffix: '%',
};

/** Categorical colour by series index; wraps to a muted fallback instead of inventing hues. */
function seriesColor(p: Palette, index: number): string {
  const c = index >= 0 && index < p.series.length ? p.series[index] : undefined;
  return c ?? p.textFaint;
}

/**
 * Animated bar chart race: bars glide between ranks as values interpolate
 * across keyframes, the keyframe label (e.g. year) crossfades bottom-right
 * and each bar end shows its live value. Duration ≈ 20 + (keyframes - 1) *
 * framesPerKeyframe + ~60 frames of hold.
 */
export const BarChartRace: React.FC<BarChartRaceProps> = ({
  theme,
  accent,
  title,
  keyframeLabels,
  series,
  framesPerKeyframe,
  topN,
  valueSuffix,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const t = frameToKeyTime(Math.max(0, frame - INTRO_FRAMES), framesPerKeyframe);
  const rows = racePositions(series, t, easeInOutCubic);
  const maxKey = Math.max(0, ...series.map((s) => s.values.length - 1));
  const tc = Math.min(Math.max(t, 0), maxKey);

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: INTRO_FRAMES + 10 });
  const titleIn = spring({ frame, fps, config: { damping: 200 } });

  const visibleCount = Math.max(1, Math.min(topN, series.length));
  const padX = 80;
  const chartTop = title ? 150 : 90;
  const chartBottom = height - 110;
  const rowH = Math.min(92, Math.max(12, (chartBottom - chartTop) / visibleCount));
  const barH = Math.max(8, Math.round(rowH * 0.7));
  const labelW = 220;
  const barX = padX + labelW;
  const valueRoom = 140;
  const maxBarW = Math.max(100, width - barX - padX - valueRoom);
  const maxValue = Math.max(0, ...rows.map((r) => r.value));
  const decimals = series.some((s) => s.values.some((v) => !Number.isInteger(v))) ? 1 : 0;

  // Keyframe label time, clamped to the labels that exist.
  const labelT = Math.min(tc, Math.max(0, keyframeLabels.length - 1));
  const isSample = JSON.stringify(series) === JSON.stringify(barChartRaceDefaults.series);

  return (
    <Backdrop palette={p}>
      <AbsoluteFill>
        {keyframeLabels.map((label, k) => {
          const d = labelT - k;
          const o = interpolate(d, [-0.6, -0.35, 0.35, 0.6], [0, 1, 1, 0], CLAMP);
          if (o <= 0) return null;
          const y = interpolate(d, [-0.6, -0.35, 0.35, 0.6], [28, 0, 0, -28], CLAMP);
          return (
            <div
              key={k}
              style={{
                position: 'absolute',
                right: padX,
                bottom: 52,
                fontSize: 104,
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 1,
                color: p.textMuted,
                fontVariantNumeric: 'tabular-nums',
                opacity: o * 0.5 * enter,
                transform: `translateY(${y}px)`,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </div>
          );
        })}

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
              opacity: titleIn,
              transform: `translateY(${(1 - titleIn) * 16}px)`,
            }}
          >
            {title}
          </div>
        ) : null}

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: chartTop,
            width,
            height: visibleCount * rowH,
            overflow: 'hidden',
          }}
        >
          {rows.map((r) => {
            const fade = interpolate(r.position, [visibleCount - 1, visibleCount], [1, 0], CLAMP);
            if (fade <= 0) return null;
            const color = series[r.seriesIndex]?.color ?? seriesColor(p, r.seriesIndex);
            const w = maxValue > 0 ? Math.max(0, (r.value / maxValue) * maxBarW * enter) : 0;
            const y = r.position * rowH + (rowH - barH) / 2;
            return (
              <div
                key={r.seriesIndex}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width,
                  height: barH,
                  transform: `translateY(${y}px)`,
                  opacity: fade * enter,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: padX,
                    top: 0,
                    width: labelW - 20,
                    height: barH,
                    lineHeight: `${barH}px`,
                    textAlign: 'right',
                    fontSize: 24,
                    fontWeight: 600,
                    color: p.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.label}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: barX,
                    top: 0,
                    width: w,
                    height: barH,
                    background: color,
                    borderRadius: '0 4px 4px 0',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: barX + w + 14,
                    top: 0,
                    height: barH,
                    lineHeight: `${barH}px`,
                    fontFamily: fonts.mono,
                    fontSize: 22,
                    fontWeight: 600,
                    color: p.text,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatNumber(r.value, decimals)}
                  {valueSuffix}
                </div>
              </div>
            );
          })}
        </div>

        {isSample ? (
          <div
            style={{
              position: 'absolute',
              left: padX,
              bottom: 40,
              fontSize: 18,
              color: p.textFaint,
              opacity: enter,
            }}
          >
            Sample data for illustration only.
          </div>
        ) : null}
      </AbsoluteFill>
    </Backdrop>
  );
};
