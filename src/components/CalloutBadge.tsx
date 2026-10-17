import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, radii, resolveTheme, withAlpha, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';

export const calloutBadgeSchema = z.object({
  ...baseThemeSchema,
  label: z.string().min(1).describe('Bold badge text, e.g. "Zero-config". Keep it under ~24 characters.'),
  detail: z.string().describe('Smaller supporting line under the label. Empty string hides it.'),
  icon: z.enum(['spark', 'bolt', 'check', 'star']).describe('Icon drawn in the accent tile: spark, bolt, check or star.'),
  x: z
    .number()
    .min(0)
    .max(100)
    .describe('Horizontal position of the pointer dot as a percentage of frame width (0 = left, 100 = right). Above 60 the badge opens to the left.'),
  y: z
    .number()
    .min(0)
    .max(100)
    .describe('Vertical position of the pointer dot as a percentage of frame height (0 = top, 100 = bottom). Keep it between ~10 and ~90 so the badge fits.'),
});

export type CalloutBadgeProps = z.infer<typeof calloutBadgeSchema>;

export const calloutBadgeDefaults: CalloutBadgeProps = {
  ...baseThemeDefaults,
  label: 'Zero-config',
  detail: 'Works in any Remotion project',
  icon: 'bolt',
  x: 34,
  y: 46,
};

type IconName = CalloutBadgeProps['icon'];

const Icon: React.FC<{ name: IconName; color: string; size: number }> = ({ name, color, size }) => {
  const common = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'spark' ? (
        <>
          <path d="M11 3l1.9 5.6L18.5 10.5l-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9z" fill={withAlpha(color, 0.25)} {...common} />
          <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" {...common} strokeWidth={1.6} />
        </>
      ) : null}
      {name === 'bolt' ? <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill={withAlpha(color, 0.25)} {...common} /> : null}
      {name === 'check' ? <path d="M5 12.5l4.5 4.5L19 7" {...common} strokeWidth={2.6} /> : null}
      {name === 'star' ? (
        <path
          d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"
          fill={withAlpha(color, 0.25)}
          {...common}
        />
      ) : null}
    </svg>
  );
};

const SKELETON: ReadonlyArray<{ indent: number; width: number; accent?: boolean }> = [
  { indent: 0, width: 46 },
  { indent: 1, width: 62 },
  { indent: 1, width: 38, accent: true },
  { indent: 2, width: 54 },
  { indent: 1, width: 30 },
  { indent: 0, width: 20 },
];

/** Faint placeholder "scene" for the badge to point at. */
const ScenePlaceholder: React.FC<{ palette: Palette }> = ({ palette }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 0.55 }}>
    <div
      style={{
        width: 760,
        height: 400,
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
      <div style={{ padding: '32px 34px', display: 'flex', flexDirection: 'column', gap: 20 }}>
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

const LINE_LENGTH = 40;
const PULSE_PERIOD = 45;

/**
 * Annotation badge pinned to a point on screen: a pulsing accent dot appears
 * at (x%, y%), a short connector draws out and an icon card pops in beside
 * it. Use it to call out a feature in a UI shot or a line in a code scene.
 */
export const CalloutBadge: React.FC<CalloutBadgeProps> = ({ theme, accent, label, detail, icon, x, y }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const px = (x / 100) * width;
  const py = (y / 100) * height;
  const toLeft = x > 60;

  const dotIn = spring({ frame, fps, config: { damping: 12, stiffness: 180, mass: 0.6 } });
  const lineIn = spring({ frame: frame - 8, fps, config: { damping: 200 }, durationInFrames: 14 });
  const pop = spring({ frame: frame - 14, fps, config: { damping: 13, stiffness: 160, mass: 0.6 } });
  const popOpacity = Math.min(1, Math.max(0, pop));
  const textIn = interpolate(frame, [22, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const pulseT = frame < 10 ? 0 : ((frame - 10) % PULSE_PERIOD) / PULSE_PERIOD;
  const pulseScale = 1 + pulseT * 1.8;
  const pulseOpacity = frame < 10 ? 0 : (1 - pulseT) * 0.6;

  const lineLen = LINE_LENGTH * lineIn;
  const gap = 10 + LINE_LENGTH + 4;

  return (
    <Backdrop palette={p}>
      <ScenePlaceholder palette={p} />
      {/* pulse ring */}
      <div
        style={{
          position: 'absolute',
          left: px - 10,
          top: py - 10,
          width: 20,
          height: 20,
          borderRadius: 10,
          border: `2px solid ${p.accent}`,
          opacity: pulseOpacity,
          transform: `scale(${pulseScale})`,
        }}
      />
      {/* anchor dot */}
      <div
        style={{
          position: 'absolute',
          left: px - 8,
          top: py - 8,
          width: 16,
          height: 16,
          borderRadius: 8,
          background: p.accent,
          border: `3px solid ${p.background}`,
          boxShadow: `0 0 0 1px ${p.accent}, 0 0 24px ${withAlpha(p.accent, 0.6)}`,
          transform: `scale(${dotIn})`,
        }}
      />
      {/* connector */}
      <div
        style={{
          position: 'absolute',
          top: py - 1,
          left: toLeft ? px - 10 - lineLen : px + 10,
          width: lineLen,
          height: 2,
          borderRadius: 1,
          background: toLeft
            ? `linear-gradient(90deg, ${p.border}, ${p.accent})`
            : `linear-gradient(90deg, ${p.accent}, ${p.border})`,
        }}
      />
      {/* badge */}
      <div
        style={{
          position: 'absolute',
          top: py,
          left: toLeft ? undefined : px + gap,
          right: toLeft ? width - px + gap : undefined,
          transform: `translateY(-50%) scale(${0.85 + 0.15 * pop})`,
          transformOrigin: toLeft ? 'right center' : 'left center',
          opacity: popOpacity,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 22px 14px 14px',
          borderRadius: radii.md,
          background: withAlpha(p.surface, 0.92),
          border: `1px solid ${withAlpha(p.accent, 0.45)}`,
          backdropFilter: 'blur(10px)',
          boxShadow:
            p.mode === 'dark'
              ? `0 18px 50px rgba(0,0,0,0.5), 0 0 40px ${withAlpha(p.accent, 0.18)}`
              : '0 14px 40px rgba(20,24,40,0.16)',
          maxWidth: 460,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            flexShrink: 0,
            borderRadius: radii.sm + 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: p.accentSoft,
            border: `1px solid ${withAlpha(p.accent, 0.4)}`,
          }}
        >
          <Icon name={icon} color={p.accent} size={28} />
        </div>
        <div style={{ opacity: textIn, transform: `translateX(${(1 - textIn) * (toLeft ? -8 : 8)}px)` }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.4, color: p.text, whiteSpace: 'nowrap' }}>
            {label}
          </div>
          {detail ? (
            <div style={{ marginTop: 4, fontSize: 20, color: p.textMuted, lineHeight: 1.35 }}>{detail}</div>
          ) : null}
        </div>
      </div>
    </Backdrop>
  );
};
