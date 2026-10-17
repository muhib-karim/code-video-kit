import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, radii, resolveTheme } from '../theme';
import { Backdrop } from '../internal/ui';

export const titleCardSchema = z.object({
  ...baseThemeSchema,
  eyebrow: z.string().describe('Small label above the title, e.g. "Launch week". Empty string hides it.'),
  title: z.string().describe('Main headline. Keep it under ~40 characters.'),
  subtitle: z.string().describe('Supporting line under the title. Empty string hides it.'),
  align: z.enum(['center', 'left']).describe('Horizontal alignment of the text block.'),
});

export type TitleCardProps = z.infer<typeof titleCardSchema>;

export const titleCardDefaults: TitleCardProps = {
  ...baseThemeDefaults,
  eyebrow: 'Introducing',
  title: 'code-video-kit',
  subtitle: 'Code-first video components for technical storytelling',
  align: 'center',
};

/**
 * Opening title card: an eyebrow pill, a headline that springs up, a growing
 * accent rule and a subtitle. Use it as the first 2-3 seconds of a video.
 */
export const TitleCard: React.FC<TitleCardProps> = ({ theme, accent, eyebrow, title, subtitle, align }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const rise = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const eyebrowIn = spring({ frame, fps, config: { damping: 200 } });
  const rule = spring({ frame: frame - 16, fps, config: { damping: 200 }, durationInFrames: 30 });
  const subIn = interpolate(frame, [22, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const isCenter = align === 'center';

  return (
    <Backdrop palette={p}>
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: isCenter ? 'center' : 'flex-start',
          padding: '0 120px',
          textAlign: isCenter ? 'center' : 'left',
        }}
      >
        {eyebrow ? (
          <div
            style={{
              opacity: eyebrowIn,
              transform: `translateY(${(1 - eyebrowIn) * 12}px)`,
              padding: '8px 18px',
              borderRadius: radii.pill,
              border: `1px solid ${p.accent}`,
              background: p.accentSoft,
              color: p.text,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 28,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <div
          style={{
            opacity: rise,
            transform: `translateY(${(1 - rise) * 40}px)`,
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.05,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>
        <div
          style={{
            height: 6,
            width: 160 * rule,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${p.accent}, ${p.series[2]})`,
            margin: '30px 0',
          }}
        />
        {subtitle ? (
          <div
            style={{
              opacity: subIn,
              transform: `translateY(${(1 - subIn) * 16}px)`,
              fontSize: 34,
              color: p.textMuted,
              maxWidth: 900,
              fontFamily: fonts.sans,
              lineHeight: 1.35,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </AbsoluteFill>
    </Backdrop>
  );
};
