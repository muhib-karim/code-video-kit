import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, resolveTheme } from '../theme';
import { Backdrop } from '../internal/ui';

export const sectionHeaderSchema = z.object({
  ...baseThemeSchema,
  index: z
    .string()
    .describe('Section number drawn large in monospace, e.g. "02". Keep it to 1-3 characters. Empty string hides it.'),
  title: z.string().min(1).describe('Section title. Keep it under ~30 characters so it stays on one or two lines.'),
  kicker: z
    .string()
    .describe('Small uppercase label above the title, e.g. "Deep dive" or "Part two". Empty string hides it.'),
});

export type SectionHeaderProps = z.infer<typeof sectionHeaderSchema>;

export const sectionHeaderDefaults: SectionHeaderProps = {
  ...baseThemeDefaults,
  index: '02',
  title: 'Rendering at scale',
  kicker: 'Deep dive',
};

/**
 * Chapter divider: an outlined section number that fills with accent from the
 * bottom, a growing vertical rule, and a title that slides up from behind a
 * mask. Use it between the parts of a tutorial or explainer.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ theme, accent, index, title, kicker }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const indexIn = spring({ frame, fps, config: { damping: 200 } });
  const fill = spring({ frame: frame - 14, fps, config: { damping: 200 }, durationInFrames: 28 });
  const rule = spring({ frame: frame - 6, fps, config: { damping: 200 }, durationInFrames: 24 });
  const titleIn = spring({ frame: frame - 12, fps, config: { damping: 200 } });
  const kickerIn = interpolate(frame, [8, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const indexSize = 150;

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ justifyContent: 'center', padding: '0 140px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
          {index ? (
            <div
              style={{
                position: 'relative',
                flexShrink: 0,
                fontFamily: fonts.mono,
                fontSize: indexSize,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: -6,
                opacity: indexIn,
                transform: `translateX(${(1 - indexIn) * -30}px)`,
              }}
            >
              <span style={{ color: 'transparent', WebkitTextStroke: `2px ${p.accent}` }}>{index}</span>
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  color: p.accent,
                  clipPath: `inset(${(1 - fill) * 100}% 0 0 0)`,
                }}
              >
                {index}
              </span>
            </div>
          ) : null}
          {index ? (
            <div
              style={{
                width: 2,
                height: 168,
                flexShrink: 0,
                borderRadius: 1,
                background: `linear-gradient(180deg, ${p.accent}, ${p.border})`,
                transform: `scaleY(${rule})`,
                transformOrigin: 'top center',
              }}
            />
          ) : null}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {kicker ? (
              <div
                style={{
                  opacity: kickerIn,
                  transform: `translateY(${(1 - kickerIn) * 10}px)`,
                  fontFamily: fonts.mono,
                  fontSize: 22,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                  color: p.accent,
                }}
              >
                {kicker}
              </div>
            ) : null}
            <div style={{ overflow: 'hidden', paddingBottom: 6 }}>
              <div
                style={{
                  transform: `translateY(${(1 - titleIn) * 105}%)`,
                  fontSize: 72,
                  fontWeight: 800,
                  letterSpacing: -2,
                  lineHeight: 1.08,
                  color: p.text,
                }}
              >
                {title}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
