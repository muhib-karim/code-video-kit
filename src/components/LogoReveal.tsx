import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, resolveTheme, withAlpha } from '../theme';
import { Backdrop } from '../internal/ui';

export const logoRevealSchema = z.object({
  ...baseThemeSchema,
  name: z.string().describe('Wordmark drawn letter by letter next to the mark (under ~16 characters).'),
  mark: z
    .enum(['hex', 'circle', 'brackets'])
    .describe('Logo mark: "hex" (hexagon with play glyph), "circle" (circle with sparkle) or "brackets" (rounded tile with "</>").'),
  tagline: z.string().describe('Line that fades in under the logo (under ~60 characters). Empty string hides it.'),
});

export type LogoRevealProps = z.infer<typeof logoRevealSchema>;

export const logoRevealDefaults: LogoRevealProps = {
  ...baseThemeDefaults,
  name: 'code-video-kit',
  mark: 'hex',
  tagline: 'Code-first video components for developers',
};

type Mark = 'hex' | 'circle' | 'brackets';

const MARKS: Record<Mark, { outline: string; glyph: string[]; glyphFill: boolean }> = {
  hex: {
    outline: 'M50 6 L88.1 28 L88.1 72 L50 94 L11.9 72 L11.9 28 Z',
    glyph: ['M42 35 L66 50 L42 65 Z'],
    glyphFill: true,
  },
  circle: {
    outline: 'M50 6 A44 44 0 1 1 50 94 A44 44 0 1 1 50 6 Z',
    glyph: ['M50 26 C52 42 58 48 74 50 C58 52 52 58 50 74 C48 58 42 52 26 50 C42 48 48 42 50 26 Z'],
    glyphFill: true,
  },
  brackets: {
    outline: 'M28 6 H72 A22 22 0 0 1 94 28 V72 A22 22 0 0 1 72 94 H28 A22 22 0 0 1 6 72 V28 A22 22 0 0 1 28 6 Z',
    glyph: ['M38 34 L22 50 L38 66', 'M62 34 L78 50 L62 66', 'M55 28 L45 72'],
    glyphFill: false,
  },
};

const DRAW_START = 4;
const DRAW_FRAMES = 34;
const FILL_START = 30;
const FILL_FRAMES = 18;
const WORD_START = 40;
const LETTER_STAGGER = 2;
const MARK_SIZE = 150;
const NAME_SIZE = 88;

/**
 * Logo sting: the SVG mark is stroked on (stroke-dashoffset), then filled;
 * the wordmark slides out letter by letter and a tagline fades in underneath.
 * Use as an intro or outro of 3-4 seconds.
 */
export const LogoReveal: React.FC<LogoRevealProps> = ({ theme, accent, name, mark, tagline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const def = MARKS[mark] ?? MARKS.hex;
  const clampOpts = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

  const draw = interpolate(frame, [DRAW_START, DRAW_START + DRAW_FRAMES], [0, 1], {
    ...clampOpts,
    easing: Easing.inOut(Easing.cubic),
  });
  const fill = interpolate(frame, [FILL_START, FILL_START + FILL_FRAMES], [0, 1], {
    ...clampOpts,
    easing: Easing.out(Easing.cubic),
  });
  const markPop = spring({ frame: frame - FILL_START, fps, config: { damping: 12, mass: 0.6 } });
  const markScale = 0.92 + 0.08 * markPop;

  const letters = Array.from(name);
  const hasName = letters.length > 0;
  const wordOpen = hasName ? spring({ frame: frame - WORD_START + 4, fps, config: { damping: 200 }, durationInFrames: 26 }) : 0;
  const estWidth = letters.length * NAME_SIZE * 0.66 + 24;
  const taglineStart = WORD_START + letters.length * LETTER_STAGGER + 10;
  const taglineIn = interpolate(frame, [taglineStart, taglineStart + 18], [0, 1], {
    ...clampOpts,
    easing: Easing.out(Easing.cubic),
  });

  const glow = withAlpha(p.accent, p.mode === 'dark' ? 0.45 : 0.3);

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: MARK_SIZE, height: MARK_SIZE, flexShrink: 0 }}>
            <div
              style={{
                position: 'absolute',
                inset: -60,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${glow} 0%, transparent 65%)`,
                opacity: fill,
                transform: `scale(${0.6 + 0.4 * fill})`,
              }}
            />
            <svg
              width={MARK_SIZE}
              height={MARK_SIZE}
              viewBox="0 0 100 100"
              style={{ position: 'relative', overflow: 'visible', transform: `scale(${markScale})` }}
            >
              <path d={def.outline} fill={p.accent} fillOpacity={fill} stroke="none" />
              <path
                d={def.outline}
                fill="none"
                stroke={p.accent}
                strokeWidth={4}
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - draw}
              />
              {def.glyph.map((d, i) => (
                <g key={i}>
                  <path
                    d={d}
                    fill={def.glyphFill ? p.onAccent : 'none'}
                    fillOpacity={def.glyphFill ? fill : 0}
                    stroke={p.accent}
                    strokeOpacity={1 - fill}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1 - draw}
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={p.onAccent}
                    strokeOpacity={fill}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ))}
            </svg>
          </div>
          {hasName ? (
            <div
              style={{
                maxWidth: wordOpen * estWidth,
                marginLeft: wordOpen * 36,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                padding: '12px 0',
              }}
            >
              <div style={{ display: 'flex', fontSize: NAME_SIZE, fontWeight: 800, letterSpacing: -3, lineHeight: 1.1 }}>
                {letters.map((ch, i) => {
                  const s = spring({
                    frame: frame - WORD_START - i * LETTER_STAGGER,
                    fps,
                    config: { damping: 18, mass: 0.6 },
                  });
                  return (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        opacity: Math.min(1, s * 1.3),
                        transform: `translateY(${(1 - s) * 40}px)`,
                        color: p.text,
                        whiteSpace: 'pre',
                      }}
                    >
                      {ch === ' ' ? ' ' : ch}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        {tagline ? (
          <div
            style={{
              marginTop: 34,
              opacity: taglineIn,
              transform: `translateY(${(1 - taglineIn) * 14}px)`,
              fontSize: 30,
              color: p.textMuted,
              letterSpacing: 0.2,
              maxWidth: 1000,
              textAlign: 'center',
            }}
          >
            {tagline}
          </div>
        ) : null}
      </AbsoluteFill>
    </Backdrop>
  );
};
