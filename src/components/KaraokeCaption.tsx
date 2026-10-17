import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, radii, resolveTheme, withAlpha, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';
import { activePageIndex, activeWordIndex, frameToSec, paginateWords, wordProgress } from '../lib/captions';

const timedWordSchema = z.object({
  text: z.string().describe('The word as displayed, including any trailing punctuation.'),
  startSec: z.number().finite().min(0).describe('Time in seconds when the word starts being spoken (fill begins).'),
  endSec: z.number().finite().min(0).describe('Time in seconds when the word ends (fill complete). Should be >= startSec.'),
});

export const karaokeCaptionSchema = z.object({
  ...baseThemeSchema,
  words: z
    .array(timedWordSchema)
    .min(1)
    .describe('Transcript words in chronological order with timings in seconds. Each word fills with accent over its duration.'),
  fontSize: z.number().min(18).max(96).describe('Caption font size in pixels. Lower it if a line overflows the frame.'),
  position: z.enum(['bottom', 'center']).describe('"bottom" places the line near the bottom edge; "center" mid-frame.'),
  maxWordsPerLine: z
    .number()
    .int()
    .min(1)
    .max(16)
    .describe(
      'Extra prop: words per line before the caption advances to the next line (also breaks on pauses > 0.8 s). The line never wraps, so keep it short enough to fit.',
    ),
});

export type KaraokeCaptionProps = z.infer<typeof karaokeCaptionSchema>;

export const karaokeCaptionDefaults: KaraokeCaptionProps = {
  ...baseThemeDefaults,
  words: [
    { text: 'Every', startSec: 0.3, endSec: 0.62 },
    { text: 'frame', startSec: 0.62, endSec: 1.0 },
    { text: 'is', startSec: 1.0, endSec: 1.18 },
    { text: 'a', startSec: 1.18, endSec: 1.3 },
    { text: 'function', startSec: 1.3, endSec: 1.86 },
    { text: 'of', startSec: 1.86, endSec: 2.02 },
    { text: 'time.', startSec: 2.02, endSec: 2.7 },
    { text: 'Render', startSec: 3.1, endSec: 3.5 },
    { text: 'it', startSec: 3.5, endSec: 3.66 },
    { text: 'like', startSec: 3.66, endSec: 3.9 },
    { text: 'any', startSec: 3.9, endSec: 4.14 },
    { text: 'other', startSec: 4.14, endSec: 4.44 },
    { text: 'React', startSec: 4.44, endSec: 4.86 },
    { text: 'tree.', startSec: 4.86, endSec: 5.6 },
  ],
  fontSize: 46,
  position: 'bottom',
  maxWordsPerLine: 7,
};

/** Seconds a line stays on screen after its last word ends. */
const LINGER_SEC = 0.6;

const SKELETON: ReadonlyArray<{ indent: number; width: number; accent?: boolean }> = [
  { indent: 0, width: 40 },
  { indent: 1, width: 58 },
  { indent: 1, width: 34, accent: true },
  { indent: 2, width: 50 },
  { indent: 1, width: 26 },
];

/** Faint placeholder "scene" so the caption has something to sit on. */
const ScenePlaceholder: React.FC<{ palette: Palette; opacity: number; offsetY: number }> = ({
  palette,
  opacity,
  offsetY,
}) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity }}>
    <div
      style={{
        width: 720,
        height: 340,
        marginTop: offsetY,
        borderRadius: radii.lg,
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 16px',
          background: palette.surfaceRaised,
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 5, background: palette.border }} />
        ))}
      </div>
      <div style={{ padding: '30px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {SKELETON.map((b, i) => (
          <div
            key={i}
            style={{
              marginLeft: b.indent * 28,
              width: `${b.width}%`,
              height: 12,
              borderRadius: 6,
              background: b.accent ? palette.accentSoft : palette.border,
            }}
          />
        ))}
      </div>
    </div>
  </AbsoluteFill>
);

/**
 * Karaoke-style single-line caption: each word sweeps from muted to accent,
 * left to right, in sync with its spoken duration. Long transcripts advance
 * line by line. Use it for narrated explainers or sing-along style emphasis.
 */
export const KaraokeCaption: React.FC<KaraokeCaptionProps> = ({
  theme,
  accent,
  words,
  fontSize,
  position,
  maxWordsPerLine,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const t = frameToSec(frame, fps);

  const pages = paginateWords(words, maxWordsPerLine);
  const pageIdx = activePageIndex(pages, t);
  const active = activeWordIndex(words, t);
  const page = pageIdx >= 0 ? pages[pageIdx] : undefined;
  const isBottom = position === 'bottom';
  const dim = withAlpha(p.text, 0.4);

  let content: React.ReactNode = null;
  if (page) {
    const startF = page.startSec * fps;
    const endF = (page.endSec + LINGER_SEC) * fps;
    const prev = pageIdx > 0 ? pages[pageIdx - 1] : undefined;
    const prevVisible = prev !== undefined && prev.endSec + LINGER_SEC >= page.startSec;
    const enter = spring({ frame: frame - startF, fps, config: { damping: 200 }, durationInFrames: 12 });
    const fadeOut = interpolate(frame, [endF, endF + 8], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const opacity = (prevVisible ? 1 : enter) * fadeOut;

    content = (
      <div
        style={{
          opacity,
          transform: `translateY(${(1 - enter) * 14}px)`,
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.3em',
          whiteSpace: 'nowrap',
          padding: `${Math.round(fontSize * 0.34)}px ${Math.round(fontSize * 0.75)}px`,
          borderRadius: radii.pill,
          background: withAlpha(p.background, 0.72),
          border: `1px solid ${p.border}`,
          backdropFilter: 'blur(12px)',
          boxShadow: p.mode === 'dark' ? '0 20px 60px rgba(0,0,0,0.45)' : '0 16px 40px rgba(20,24,40,0.14)',
          fontSize,
          fontWeight: 800,
          letterSpacing: '-0.015em',
          lineHeight: 1.15,
        }}
      >
        {page.words.map((w, j) => {
          const gi = page.startIndex + j;
          const pct = wordProgress(w, t) * 100;
          const isActive = gi === active && pct < 100;
          const lift = spring({
            frame: frame - w.startSec * fps,
            fps,
            config: { damping: 14, stiffness: 200, mass: 0.5 },
          });
          return (
            <span
              key={`${gi}-${w.text}`}
              style={{
                display: 'inline-block',
                backgroundImage: `linear-gradient(90deg, ${p.accent} 0%, ${p.accent} ${pct}%, ${dim} ${pct}%, ${dim} 100%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
                transform: `translateY(${isActive ? -0.05 * fontSize * Math.min(1, lift) : 0}px)`,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <Backdrop palette={p}>
      <ScenePlaceholder palette={p} opacity={isBottom ? 0.5 : 0.3} offsetY={isBottom ? -110 : 0} />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: isBottom ? 'flex-end' : 'center',
          padding: isBottom ? '0 40px 72px' : '0 40px',
        }}
      >
        {content}
      </AbsoluteFill>
    </Backdrop>
  );
};
