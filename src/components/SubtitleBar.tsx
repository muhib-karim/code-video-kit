import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, radii, resolveTheme, withAlpha, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';
import { activeCueIndex, frameToSec } from '../lib/captions';

const cueSchema = z.object({
  text: z.string().describe('Subtitle text for this cue. One or two short sentences; long text wraps to two lines.'),
  startSec: z.number().finite().min(0).describe('Time in seconds when the cue appears.'),
  endSec: z.number().finite().min(0).describe('Time in seconds when the cue disappears. Must be > startSec.'),
});

export const subtitleBarSchema = z.object({
  ...baseThemeSchema,
  cues: z
    .array(cueSchema)
    .min(1)
    .describe('Subtitle cues in chronological order, non-overlapping, with times in seconds (like an SRT file).'),
  fontSize: z.number().min(18).max(72).describe('Subtitle font size in pixels.'),
  speaker: z
    .string()
    .describe('Speaker name shown as a small accent label above the text in every cue. Empty string hides it.'),
});

export type SubtitleBarProps = z.infer<typeof subtitleBarSchema>;

export const subtitleBarDefaults: SubtitleBarProps = {
  ...baseThemeDefaults,
  cues: [
    { text: 'Every scene in this video is a React component.', startSec: 0.3, endSec: 2.4 },
    { text: 'Props are typed, so changing the copy is a one-line edit.', startSec: 2.6, endSec: 4.9 },
    { text: 'Render it locally or in CI with one command.', startSec: 5.1, endSec: 7.4 },
  ],
  fontSize: 34,
  speaker: 'Narrator',
};

const SKELETON: ReadonlyArray<{ indent: number; width: number; accent?: boolean }> = [
  { indent: 0, width: 44 },
  { indent: 1, width: 60, accent: true },
  { indent: 1, width: 36 },
  { indent: 2, width: 52 },
  { indent: 1, width: 28 },
];

/** Faint placeholder "scene" so the subtitles have something to sit on. */
const ScenePlaceholder: React.FC<{ palette: Palette }> = ({ palette }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
    <div
      style={{
        width: 720,
        height: 340,
        marginTop: -120,
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
 * Classic subtitle bar: one cue at a time in a translucent rounded bar near
 * the bottom, with an optional speaker label, each cue fading and rising in
 * and fading out. Use it for interview clips or SRT-style transcripts.
 */
export const SubtitleBar: React.FC<SubtitleBarProps> = ({ theme, accent, cues, fontSize, speaker }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const t = frameToSec(frame, fps);
  const idx = activeCueIndex(cues, t);
  const cue = idx >= 0 ? cues[idx] : undefined;

  let bar: React.ReactNode = null;
  if (cue) {
    const startF = cue.startSec * fps;
    const endF = cue.endSec * fps;
    const fadeF = Math.max(1, Math.min(6, (endF - startF) / 3));
    // Include the first displayed frame so a one-frame cue is visible.
    const fadeIn = interpolate(frame + 1, [startF, startF + fadeF], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const fadeOut = interpolate(frame, [endF - fadeF, endF], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const opacity = Math.min(fadeIn, fadeOut);

    bar = (
      <div
        key={idx}
        style={{
          opacity,
          transform: `translateY(${(1 - fadeIn) * 10}px)`,
          maxWidth: 980,
          padding: '14px 30px 16px',
          borderRadius: radii.md,
          background: p.mode === 'dark' ? withAlpha(p.background, 0.82) : withAlpha(p.surface, 0.9),
          border: `1px solid ${p.border}`,
          backdropFilter: 'blur(12px)',
          boxShadow: p.mode === 'dark' ? '0 16px 48px rgba(0,0,0,0.45)' : '0 12px 36px rgba(20,24,40,0.14)',
          textAlign: 'center',
        }}
      >
        {speaker ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 6,
              fontFamily: fonts.mono,
              fontSize: 18,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: p.accent,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 4, background: p.accent }} />
            {speaker}
          </div>
        ) : null}
        <div style={{ fontSize, fontWeight: 500, lineHeight: 1.35, color: p.text }}>{cue.text}</div>
      </div>
    );
  }

  return (
    <Backdrop palette={p}>
      <ScenePlaceholder palette={p} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', padding: '0 80px 56px' }}>
        {bar}
      </AbsoluteFill>
    </Backdrop>
  );
};
