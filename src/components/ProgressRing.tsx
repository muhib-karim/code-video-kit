import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, resolveTheme, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';
import { formatNumber } from '../lib/math';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const STAGGER = 8;

export const progressRingSchema = z.object({
  ...baseThemeSchema,
  title: z.string().describe('Headline above the rings, e.g. "Release readiness". Empty string hides it.'),
  rings: z
    .array(
      z.object({
        label: z.string().describe('Caption under the ring, e.g. "Test coverage". Keep it short.'),
        value: z.number().min(0).max(100).describe('Percentage the ring fills to, from 0 to 100.'),
        color: z
          .string()
          .optional()
          .describe('Optional ring colour (hex). Omit to use the theme categorical palette by ring index.'),
      }),
    )
    .min(1)
    .max(4)
    .describe('1 to 4 progress rings shown side by side, left to right.'),
  fillFrames: z
    .number()
    .int()
    .min(1)
    .max(600)
    .describe('Frames each ring takes to fill to its value (eased; 60 = 2 seconds at 30 fps).'),
});

export type ProgressRingProps = z.infer<typeof progressRingSchema>;

export const progressRingDefaults: ProgressRingProps = {
  ...baseThemeDefaults,
  title: 'Release readiness',
  rings: [
    { label: 'Test coverage', value: 92 },
    { label: 'Type coverage', value: 100 },
    { label: 'Docs complete', value: 78 },
  ],
  fillFrames: 60,
};

function seriesColor(p: Palette, index: number): string {
  const c = index >= 0 && index < p.series.length ? p.series[index] : undefined;
  return c ?? p.textFaint;
}

/**
 * Circular progress rings that sweep to their percentage while the number in
 * the centre counts up; a label sits under each ring. Good for coverage,
 * completion or quota stats.
 */
export const ProgressRing: React.FC<ProgressRingProps> = ({ theme, accent, title, rings, fillFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const n = Math.max(1, rings.length);
  const size = n <= 2 ? 240 : n === 3 ? 220 : 190;
  const stroke = n <= 3 ? 16 : 14;
  const radius = size / 2 - stroke / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const colW = Math.min(320, (width - 160) / n);
  const duration = Math.max(1, fillFrames);
  const titleIn = spring({ frame, fps, config: { damping: 200 } });

  return (
    <Backdrop palette={p}>
      <AbsoluteFill>
        {title ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 72,
              textAlign: 'center',
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
            right: 0,
            top: title ? 150 : 0,
            bottom: 30,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {rings.map((ring, i) => {
            const start = 12 + i * STAGGER;
            const enter = spring({ frame: frame - i * STAGGER, fps, config: { damping: 200 } });
            const prog = interpolate(frame, [start, start + duration], [0, 1], {
              ...CLAMP,
              easing: Easing.out(Easing.cubic),
            });
            const value = Math.min(100, Math.max(0, ring.value));
            const shown = value * prog;
            const filled = (shown / 100) * circumference;
            const color = ring.color ?? seriesColor(p, i);
            const decimals = Number.isInteger(value) ? 0 : 1;
            const c = size / 2;
            return (
              <div
                key={i}
                style={{
                  width: colW,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  opacity: enter,
                  transform: `scale(${0.9 + 0.1 * enter})`,
                }}
              >
                <div style={{ position: 'relative', width: size, height: size }}>
                  <svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }}>
                    <circle
                      cx={c}
                      cy={c}
                      r={radius}
                      fill="none"
                      stroke={p.textFaint}
                      strokeOpacity={0.2}
                      strokeWidth={stroke}
                    />
                    <circle
                      cx={c}
                      cy={c}
                      r={radius}
                      fill="none"
                      stroke={color}
                      strokeWidth={stroke}
                      strokeLinecap="round"
                      strokeDasharray={`${circumference} ${circumference}`}
                      strokeDashoffset={circumference - filled}
                      transform={`rotate(-90 ${c} ${c})`}
                      opacity={filled > 0.5 ? 1 : 0}
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: Math.round(size * 0.24),
                      fontWeight: 800,
                      letterSpacing: -1.5,
                      color: p.text,
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatNumber(shown, decimals)}
                    <span style={{ fontSize: '0.5em', fontWeight: 700, color: p.textMuted, marginLeft: 2 }}>%</span>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 26,
                    fontSize: 24,
                    fontWeight: 600,
                    color: p.text,
                    textAlign: 'center',
                    maxWidth: colW - 24,
                    lineHeight: 1.3,
                  }}
                >
                  {ring.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
