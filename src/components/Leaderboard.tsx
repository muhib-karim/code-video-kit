import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, radii, resolveTheme, withAlpha } from '../theme';
import { Backdrop } from '../internal/ui';
import { formatNumber } from '../lib/math';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const leaderboardSchema = z.object({
  ...baseThemeSchema,
  title: z.string().describe('Headline above the list, e.g. "Top contributors this month". Empty string hides it.'),
  unit: z.string().describe('Unit shown after each score, e.g. "pts" or "commits". Empty string for none.'),
  entries: z
    .array(
      z.object({
        name: z.string().describe('Display name of the entry. Keep it under ~18 characters.'),
        score: z.number().min(0).describe('Non-negative score; entries are ranked by it and the bar length is proportional to it.'),
        delta: z
          .number()
          .optional()
          .describe('Rank change since the previous period: positive = moved up (▲), negative = moved down (▼), 0 = unchanged (–). Omit to hide.'),
      }),
    )
    .min(1)
    .max(8)
    .describe('Entries in any order; they are sorted by score (highest first) and numbered automatically.'),
  staggerFrames: z
    .number()
    .int()
    .min(0)
    .max(60)
    .describe('Frames between consecutive rows sliding in, top to bottom.'),
});

export type LeaderboardProps = z.infer<typeof leaderboardSchema>;

export const leaderboardDefaults: LeaderboardProps = {
  ...baseThemeDefaults,
  title: 'Top contributors this month',
  unit: 'pts',
  entries: [
    { name: 'nova-dev', score: 2480, delta: 2 },
    { name: 'kai.codes', score: 2135, delta: -1 },
    { name: 'mira_ts', score: 1980, delta: 1 },
    { name: 'okafor', score: 1742, delta: 0 },
    { name: 'lena.rs', score: 1510, delta: 3 },
    { name: 'tomasz', score: 1365 },
  ],
  staggerFrames: 8,
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  const i = s.indexOf('.');
  return i < 0 ? 0 : Math.min(2, s.length - i - 1);
}

/**
 * Ranked leaderboard: rows slide in one by one with a rank number, name, a
 * score bar that grows while the score counts up, and a rank-change delta
 * (▲ / ▼ in positive / negative colours). The leader is drawn in the accent.
 */
export const Leaderboard: React.FC<LeaderboardProps> = ({ theme, accent, title, unit, entries, staggerFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const ranked = entries
    .map((e, i) => ({ name: e.name, score: e.score, delta: e.delta, i }))
    .sort((a, b) => (b.score === a.score ? a.i - b.i : b.score - a.score));
  const n = Math.max(1, ranked.length);
  const maxScore = Math.max(0, ...ranked.map((e) => e.score));

  const padX = 96;
  const listW = width - padX * 2;
  const listTop = title ? 160 : 90;
  const listBottom = height - 56;
  const slot = Math.min(78, Math.max(40, (listBottom - listTop) / n));
  const rowH = slot - 10;
  const innerPad = 24;
  const rankW = 64;
  const nameW = 260;
  const deltaW = 110;
  // -2 for the 1px row border on each side (border-box).
  const barAreaW = listW - innerPad * 2 - 2 - rankW - nameW - deltaW;
  const maxBarW = Math.max(60, barAreaW - 170);
  const neutral = withAlpha(p.textFaint, 0.5);
  const titleIn = spring({ frame, fps, config: { damping: 200 } });

  return (
    <Backdrop palette={p}>
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
              opacity: titleIn,
              transform: `translateY(${(1 - titleIn) * 16}px)`,
            }}
          >
            {title}
          </div>
        ) : null}

        {ranked.map((e, rank) => {
          const start = 8 + rank * staggerFrames;
          const slide = spring({ frame: frame - start, fps, config: { damping: 200 } });
          const grow = interpolate(frame, [start + 6, start + 36], [0, 1], {
            ...CLAMP,
            easing: Easing.out(Easing.cubic),
          });
          const deltaIn = interpolate(frame, [start + 24, start + 38], [0, 1], CLAMP);
          const isLeader = rank === 0;
          const w = maxScore > 0 ? (e.score / maxScore) * maxBarW * grow : 0;
          const d = e.delta;
          let deltaNode: React.ReactNode = null;
          if (typeof d === 'number') {
            if (d > 0) {
              deltaNode = <span style={{ color: p.positive }}>{`▲ ${formatNumber(d, decimalsOf(d))}`}</span>;
            } else if (d < 0) {
              deltaNode = <span style={{ color: p.negative }}>{`▼ ${formatNumber(Math.abs(d), decimalsOf(d))}`}</span>;
            } else {
              deltaNode = <span style={{ color: p.textFaint }}>–</span>;
            }
          }
          return (
            <div
              key={e.i}
              style={{
                position: 'absolute',
                left: padX,
                top: listTop + rank * slot,
                width: listW,
                height: rowH,
                boxSizing: 'border-box',
                padding: `0 ${innerPad}px`,
                display: 'flex',
                alignItems: 'center',
                background: p.surface,
                border: `1px solid ${p.border}`,
                borderRadius: radii.md,
                boxShadow: isLeader ? `inset 3px 0 0 ${p.accent}` : undefined,
                opacity: slide,
                transform: `translateX(${(1 - slide) * 80}px)`,
              }}
            >
              <div
                style={{
                  width: rankW,
                  flexShrink: 0,
                  fontFamily: fonts.mono,
                  fontSize: 22,
                  fontWeight: 700,
                  color: isLeader ? p.text : p.textFaint,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {pad2(rank + 1)}
              </div>
              <div
                style={{
                  width: nameW,
                  flexShrink: 0,
                  paddingRight: 16,
                  boxSizing: 'border-box',
                  fontSize: 24,
                  fontWeight: 600,
                  color: p.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {e.name}
              </div>
              <div style={{ width: barAreaW, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: w,
                    height: 14,
                    flexShrink: 0,
                    background: isLeader ? p.accent : neutral,
                    borderRadius: '0 4px 4px 0',
                  }}
                />
                <div
                  style={{
                    marginLeft: 14,
                    fontFamily: fonts.mono,
                    fontSize: 20,
                    fontWeight: isLeader ? 700 : 500,
                    color: isLeader ? p.text : p.textMuted,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatNumber(e.score * grow, decimalsOf(e.score))}
                  {unit ? ` ${unit}` : ''}
                </div>
              </div>
              <div
                style={{
                  width: deltaW,
                  flexShrink: 0,
                  textAlign: 'right',
                  fontFamily: fonts.mono,
                  fontSize: 20,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  opacity: deltaIn,
                }}
              >
                {deltaNode}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </Backdrop>
  );
};
