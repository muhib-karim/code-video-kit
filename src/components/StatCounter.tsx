import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, resolveTheme } from '../theme';
import { Backdrop } from '../internal/ui';
import { formatNumber } from '../lib/math';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const STAGGER = 8;

export const statCounterSchema = z.object({
  ...baseThemeSchema,
  stats: z
    .array(
      z.object({
        label: z.string().describe('Caption under the number, e.g. "GitHub stars". Keep it short (1-3 words).'),
        value: z.number().finite().describe('Final value the counter counts up to from 0.'),
        prefix: z.string().optional().describe('Text before the number, e.g. "$". Omit for none.'),
        suffix: z.string().optional().describe('Text after the number, e.g. "%", "k+" or "×". Omit for none.'),
        decimals: z
          .number()
          .int()
          .min(0)
          .max(3)
          .optional()
          .describe('Decimal places shown while counting (e.g. 1 for "3.2"). Omit for whole numbers.'),
      }),
    )
    .min(2)
    .max(4)
    .describe('2 to 4 headline numbers shown side by side, left to right.'),
  countFrames: z
    .number()
    .int()
    .min(1)
    .max(600)
    .describe('Frames each counter takes to reach its value (eased; 60 = 2 seconds at 30 fps).'),
});

export type StatCounterProps = z.infer<typeof statCounterSchema>;

export const statCounterDefaults: StatCounterProps = {
  ...baseThemeDefaults,
  stats: [
    { label: 'GitHub stars', value: 12400, suffix: '+' },
    { label: 'Faster cold starts', value: 3.2, suffix: '×', decimals: 1 },
    { label: 'Test coverage', value: 98.6, suffix: '%', decimals: 1 },
  ],
  countFrames: 60,
};

/**
 * A row of 2-4 hero numbers that count up with an ease-out, each with a
 * short accent rule above and a muted label below. Digits are tabular so
 * they don't jitter while counting.
 */
export const StatCounter: React.FC<StatCounterProps> = ({ theme, accent, stats, countFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const n = Math.max(1, stats.length);
  const padX = 64;
  const colW = (width - padX * 2) / n;
  const finalTexts = stats.map((s) => `${s.prefix ?? ''}${formatNumber(s.value, s.decimals ?? 0)}${s.suffix ?? ''}`);
  const maxChars = Math.max(1, ...finalTexts.map((t) => t.length));
  const base = n <= 2 ? 128 : n === 3 ? 108 : 88;
  const fontSize = Math.max(40, Math.min(base, Math.floor((colW - 48) / (maxChars * 0.6))));
  const duration = Math.max(1, countFrames);

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {stats.map((s, i) => {
          const start = 10 + i * STAGGER;
          const enter = spring({ frame: frame - i * STAGGER, fps, config: { damping: 200 } });
          const prog = interpolate(frame, [start, start + duration], [0, 1], {
            ...CLAMP,
            easing: Easing.out(Easing.cubic),
          });
          const decimals = s.decimals ?? 0;
          const shown = formatNumber(s.value * prog, decimals);
          return (
            <div
              key={i}
              style={{
                width: colW,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderLeft: i > 0 ? `1px solid ${p.border}` : undefined,
                padding: '24px 0',
                opacity: enter,
                transform: `translateY(${(1 - enter) * 30}px)`,
              }}
            >
              <div
                style={{
                  width: 40 * enter,
                  height: 4,
                  borderRadius: 2,
                  background: p.accent,
                  marginBottom: 28,
                }}
              />
              <div
                style={{
                  fontSize,
                  fontWeight: 800,
                  letterSpacing: -2,
                  lineHeight: 1,
                  color: p.text,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.prefix ? <span style={{ color: p.textMuted, fontWeight: 700 }}>{s.prefix}</span> : null}
                {shown}
                {s.suffix ? <span style={{ color: p.textMuted, fontWeight: 700 }}>{s.suffix}</span> : null}
              </div>
              <div
                style={{
                  marginTop: 22,
                  fontSize: 26,
                  color: p.textMuted,
                  textAlign: 'center',
                  maxWidth: colW - 40,
                  lineHeight: 1.3,
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </Backdrop>
  );
};
