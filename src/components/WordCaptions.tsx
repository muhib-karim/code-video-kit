import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, radii, resolveTheme, withAlpha, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';
import { activePageIndex, activeWordIndex, frameToSec, paginateWords } from '../lib/captions';

const timedWordSchema = z.object({
  text: z.string().describe('The word as displayed, including any trailing punctuation.'),
  startSec: z.number().finite().min(0).describe('Time in seconds when the word starts being spoken.'),
  endSec: z.number().finite().min(0).describe('Time in seconds when the word ends. Should be >= startSec.'),
});

export const wordCaptionsSchema = z.object({
  ...baseThemeSchema,
  words: z
    .array(timedWordSchema)
    .min(1)
    .describe('Transcript words in chronological order with timings in seconds (e.g. from Whisper word timestamps).'),
  maxWordsPerPage: z
    .number()
    .int()
    .min(1)
    .max(12)
    .describe('Maximum words shown at once. A page also breaks early on pauses longer than 0.8 s. 3-6 reads well.'),
  fontSize: z.number().min(18).max(110).describe('Caption font size in pixels.'),
  position: z
    .enum(['bottom', 'center'])
    .describe('"bottom" puts captions in a translucent panel near the bottom; "center" shows large captions mid-frame.'),
});

export type WordCaptionsProps = z.infer<typeof wordCaptionsSchema>;

export const wordCaptionsDefaults: WordCaptionsProps = {
  ...baseThemeDefaults,
  words: [
    { text: 'Ship', startSec: 0.3, endSec: 0.62 },
    { text: 'polished', startSec: 0.62, endSec: 1.1 },
    { text: 'technical', startSec: 1.1, endSec: 1.58 },
    { text: 'videos', startSec: 1.58, endSec: 2.05 },
    { text: 'straight', startSec: 2.3, endSec: 2.7 },
    { text: 'from', startSec: 2.7, endSec: 2.88 },
    { text: 'your', startSec: 2.88, endSec: 3.08 },
    { text: 'React', startSec: 3.08, endSec: 3.5 },
    { text: 'codebase', startSec: 3.5, endSec: 4.1 },
    { text: 'with', startSec: 4.25, endSec: 4.45 },
    { text: 'zero', startSec: 4.45, endSec: 4.8 },
    { text: 'editing.', startSec: 4.8, endSec: 5.3 },
  ],
  maxWordsPerPage: 4,
  fontSize: 54,
  position: 'bottom',
};

/** Seconds a page stays on screen after its last word ends. */
const LINGER_SEC = 0.6;

const SKELETON: ReadonlyArray<{ indent: number; width: number; accent?: boolean }> = [
  { indent: 0, width: 46 },
  { indent: 1, width: 62, accent: true },
  { indent: 1, width: 38 },
  { indent: 2, width: 54 },
  { indent: 1, width: 30 },
];

/** Faint placeholder "scene" so captions have something to sit on. */
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
 * Word-by-word captions (TikTok/Reels style): shows a page of a few words,
 * the word being spoken sits in an accent pill with a small pop, spoken words
 * stay solid and upcoming words are dimmed. Feed it word timestamps from a
 * transcript; times are seconds.
 */
export const WordCaptions: React.FC<WordCaptionsProps> = ({
  theme,
  accent,
  words,
  maxWordsPerPage,
  fontSize,
  position,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const t = frameToSec(frame, fps);

  const pages = paginateWords(words, maxWordsPerPage);
  const pageIdx = activePageIndex(pages, t);
  const active = activeWordIndex(words, t);
  const page = pageIdx >= 0 ? pages[pageIdx] : undefined;
  const isBottom = position === 'bottom';

  let content: React.ReactNode = null;
  if (page) {
    const startF = page.startSec * fps;
    const endF = (page.endSec + LINGER_SEC) * fps;
    const prev = pageIdx > 0 ? pages[pageIdx - 1] : undefined;
    const prevVisible = prev !== undefined && prev.endSec + LINGER_SEC >= page.startSec;
    const enter = spring({ frame: frame - startF, fps, config: { damping: 200 }, durationInFrames: 10 });
    const fadeOut = interpolate(frame, [endF, endF + 8], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const opacity = (prevVisible ? 1 : enter) * fadeOut;

    content = (
      <div
        style={{
          opacity,
          transform: `translateY(${(1 - enter) * 12}px) scale(${0.97 + 0.03 * enter})`,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          columnGap: '0.06em',
          rowGap: '0.08em',
          maxWidth: 1080,
          padding: isBottom ? '16px 24px' : 0,
          borderRadius: radii.lg,
          background: isBottom ? withAlpha(p.background, 0.72) : 'transparent',
          border: isBottom ? `1px solid ${p.border}` : 'none',
          backdropFilter: isBottom ? 'blur(12px)' : undefined,
          boxShadow: isBottom
            ? p.mode === 'dark'
              ? '0 20px 60px rgba(0,0,0,0.45)'
              : '0 16px 40px rgba(20,24,40,0.14)'
            : undefined,
          fontSize,
          fontWeight: 800,
          letterSpacing: '-0.015em',
          lineHeight: 1.2,
          textAlign: 'center',
        }}
      >
        {page.words.map((w, j) => {
          const gi = page.startIndex + j;
          const isActive = gi === active;
          const isPast = gi < active;
          const pop = spring({
            frame: frame - w.startSec * fps,
            fps,
            config: { damping: 12, stiffness: 220, mass: 0.5 },
          });
          const fill = Math.min(1, Math.max(0, pop));
          return (
            <span
              key={`${gi}-${w.text}`}
              style={{
                display: 'inline-block',
                padding: '0.04em 0.2em',
                borderRadius: '0.22em',
                background: isActive ? withAlpha(p.accent, fill) : 'transparent',
                color: isActive ? p.onAccent : p.text,
                opacity: isActive || isPast ? 1 : 0.38,
                transform: `scale(${isActive ? 1 + 0.07 * pop : 1})`,
                boxShadow: isActive ? `0 8px 28px ${withAlpha(p.accent, 0.35 * fill)}` : undefined,
                textShadow:
                  !isBottom && !isActive && p.mode === 'dark' ? '0 4px 24px rgba(0,0,0,0.6)' : undefined,
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
      <ScenePlaceholder palette={p} opacity={isBottom ? 0.5 : 0.3} offsetY={isBottom ? -120 : 0} />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: isBottom ? 'flex-end' : 'center',
          padding: isBottom ? '0 80px 64px' : '0 80px',
        }}
      >
        {content}
      </AbsoluteFill>
    </Backdrop>
  );
};
