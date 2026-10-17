import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, radii, resolveTheme, withAlpha, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';

export const lowerThirdSchema = z.object({
  ...baseThemeSchema,
  name: z.string().min(1).describe('Person or product name, the large first line. Keep it under ~28 characters.'),
  role: z.string().describe('Second line under the name, e.g. "Staff Engineer, Acme". Empty string hides it.'),
  side: z.enum(['left', 'right']).describe('Which bottom corner the lower third sits in and slides in from.'),
  holdFrames: z
    .number()
    .int()
    .min(0)
    .max(900)
    .describe(
      'Frames the lower third stays fully visible between sliding in and out. The exit is pulled earlier if the composition is too short.',
    ),
});

export type LowerThirdProps = z.infer<typeof lowerThirdSchema>;

export const lowerThirdDefaults: LowerThirdProps = {
  ...baseThemeDefaults,
  name: 'Muhib Karim',
  role: 'Author, code-video-kit',
  side: 'left',
  holdFrames: 90,
};

const ENTER_START = 6;
const ENTER_FRAMES = 22;
const EXIT_FRAMES = 18;

const SKELETON: ReadonlyArray<{ indent: number; width: number; accent?: boolean }> = [
  { indent: 0, width: 46 },
  { indent: 1, width: 62, accent: true },
  { indent: 1, width: 38 },
  { indent: 2, width: 54 },
  { indent: 1, width: 30 },
  { indent: 0, width: 20 },
];

/** Faint placeholder "scene" so the frame isn't empty behind the overlay. */
const ScenePlaceholder: React.FC<{ palette: Palette }> = ({ palette }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
    <div
      style={{
        width: 720,
        height: 380,
        marginTop: -110,
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
 * Name/role lower third: an accent bar drops in, the card wipes open from the
 * chosen side, holds for `holdFrames`, then wipes back out. Use it to
 * introduce a speaker or label a product in the first seconds of a clip.
 */
export const LowerThird: React.FC<LowerThirdProps> = ({ theme, accent, name, role, side, holdFrames }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const isLeft = side === 'left';

  // Allow the springs to pass their duration before starting the hold.
  const enteredAt = Math.max(ENTER_START + 4 + ENTER_FRAMES, ENTER_START + 10 + 20) + 1;
  const exitFrames = Math.min(EXIT_FRAMES, Math.max(1, durationInFrames - 2));
  const outStart = Math.max(0, Math.min(enteredAt + holdFrames, durationInFrames - exitFrames - 2));

  const bar = spring({ frame: frame - ENTER_START, fps, config: { damping: 200 }, durationInFrames: 14 });
  const reveal = spring({
    frame: frame - ENTER_START - 4,
    fps,
    config: { damping: 200 },
    durationInFrames: ENTER_FRAMES,
  });
  const textIn = spring({ frame: frame - ENTER_START - 10, fps, config: { damping: 200 }, durationInFrames: 20 });
  const out = spring({ frame: frame - outStart, fps, config: { damping: 200 }, durationInFrames: exitFrames });

  const show = reveal * (1 - out);
  const clipAmount = (1 - show) * 100;
  const clipPath = isLeft ? `inset(0 ${clipAmount}% 0 0)` : `inset(0 0 0 ${clipAmount}%)`;
  const dir = isLeft ? -1 : 1;
  const slide = ((1 - reveal) * 30 + out * 30) * dir;
  const barScale = bar * (1 - out);

  return (
    <Backdrop palette={p}>
      <ScenePlaceholder palette={p} />
      <div
        style={{
          position: 'absolute',
          bottom: 72,
          left: isLeft ? 80 : undefined,
          right: isLeft ? undefined : 80,
          display: 'flex',
          flexDirection: isLeft ? 'row' : 'row-reverse',
          alignItems: 'stretch',
          transform: `translateX(${slide}px)`,
        }}
      >
        <div
          style={{
            width: 5,
            flexShrink: 0,
            borderRadius: 3,
            background: p.accent,
            boxShadow: `0 0 24px ${withAlpha(p.accent, 0.5)}`,
            transform: `scaleY(${barScale})`,
            transformOrigin: 'bottom center',
          }}
        />
        <div
          style={{
            clipPath,
            marginLeft: isLeft ? 10 : 0,
            marginRight: isLeft ? 0 : 10,
            padding: '18px 30px',
            borderRadius: radii.md,
            background: withAlpha(p.surface, 0.88),
            border: `1px solid ${p.border}`,
            backdropFilter: 'blur(12px)',
            boxShadow: p.mode === 'dark' ? '0 20px 60px rgba(0,0,0,0.45)' : '0 16px 40px rgba(20,24,40,0.14)',
            textAlign: isLeft ? 'left' : 'right',
            maxWidth: 640,
          }}
        >
          <div
            style={{
              opacity: textIn,
              transform: `translateY(${(1 - textIn) * 10}px)`,
              fontSize: 38,
              fontWeight: 700,
              letterSpacing: -0.8,
              lineHeight: 1.15,
              color: p.text,
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>
          {role ? (
            <div
              style={{
                opacity: textIn,
                transform: `translateY(${(1 - textIn) * 14}px)`,
                marginTop: 6,
                fontSize: 22,
                color: p.textMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: isLeft ? 'flex-start' : 'flex-end',
                gap: 10,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 4, background: p.accent, flexShrink: 0 }} />
              {role}
            </div>
          ) : null}
        </div>
      </div>
    </Backdrop>
  );
};
