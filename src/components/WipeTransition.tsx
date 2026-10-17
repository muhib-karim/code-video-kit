import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, resolveTheme, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';

export const wipeTransitionSchema = z.object({
  ...baseThemeSchema,
  fromTitle: z.string().describe('Headline of the first ("from") scene. Ignored when React children are passed.'),
  toTitle: z.string().describe('Headline of the second ("to") scene revealed by the wipe. Ignored when a second child is passed.'),
  shape: z
    .enum(['linear', 'circle', 'diagonal'])
    .describe('Wipe shape: "linear" sweeps left to right, "circle" grows from the centre, "diagonal" sweeps from the top-left corner.'),
  wipeStart: z.number().int().min(0).max(900).describe('Frame at which the wipe begins.'),
  wipeFrames: z.number().int().min(1).max(240).describe('Duration of the wipe in frames.'),
});

export type WipeTransitionProps = z.infer<typeof wipeTransitionSchema> & { children?: React.ReactNode };

export const wipeTransitionDefaults: WipeTransitionProps = {
  ...baseThemeDefaults,
  fromTitle: 'Before: callbacks',
  toTitle: 'After: async/await',
  shape: 'diagonal',
  wipeStart: 40,
  wipeFrames: 30,
};

const ScenePanel: React.FC<{ palette: Palette; title: string; variant: 'from' | 'to'; enter: number }> = ({
  palette,
  title,
  variant,
  enter,
}) => {
  const tinted: Palette =
    variant === 'to' ? { ...palette, background: palette.backgroundAlt, backgroundAlt: palette.accentSoft } : palette;
  return (
    <Backdrop palette={tinted}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 120px', textAlign: 'center' }}>
        <div
          style={{
            opacity: enter,
            transform: `translateY(${(1 - enter) * 24}px)`,
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.05,
            maxWidth: 1040,
            color: variant === 'to' ? palette.text : palette.textMuted,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 34,
            width: 140 * enter,
            height: 6,
            borderRadius: 3,
            background:
              variant === 'to'
                ? `linear-gradient(90deg, ${palette.accent}, ${palette.series[2]})`
                : palette.border,
          }}
        />
      </AbsoluteFill>
    </Backdrop>
  );
};

/**
 * Reveals a second scene over a first one with a clip-path wipe: linear
 * (left to right), circle (from the centre) or diagonal (corner sweep), with a
 * thin glowing accent edge. Pass two React children to wipe between your own
 * scenes (first child = "from", second = "to").
 */
export const WipeTransition: React.FC<WipeTransitionProps> = ({
  theme,
  accent,
  fromTitle,
  toTitle,
  shape,
  wipeStart,
  wipeFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const start = Math.max(0, wipeStart);
  const dur = Math.max(1, wipeFrames);
  const t = interpolate(frame, [start, start + dur], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fromEnter = spring({ frame, fps, config: { damping: 200 } });
  const toEnter = spring({ frame: frame - start - dur * 0.4, fps, config: { damping: 200 } });

  const custom = React.Children.toArray(children);
  const fromNode: React.ReactNode =
    custom.length > 0 ? custom[0] : <ScenePanel palette={p} title={fromTitle} variant="from" enter={fromEnter} />;
  const toNode: React.ReactNode =
    custom.length > 1 ? custom[1] : <ScenePanel palette={p} title={toTitle} variant="to" enter={toEnter} />;

  let clipPath: string;
  let edge: React.ReactNode = null;
  const edgeVisible = t > 0 && t < 1;

  if (shape === 'circle') {
    const maxR = Math.sqrt((width / 2) * (width / 2) + (height / 2) * (height / 2)) + 4;
    const r = t * maxR;
    clipPath = `circle(${r}px at 50% 50%)`;
    if (edgeVisible) {
      edge = <circle cx={width / 2} cy={height / 2} r={r} fill="none" stroke={p.accent} strokeWidth={3} />;
    }
  } else if (shape === 'diagonal') {
    // Half-plane x + y <= d, d sweeping from 0 to width + height.
    const d = t * (width + height + 8);
    clipPath = `polygon(${-height - 10}px 0px, ${d}px 0px, ${d - height}px ${height}px, ${-height - 10}px ${height}px)`;
    if (edgeVisible) {
      edge = <line x1={d} y1={0} x2={d - height} y2={height} stroke={p.accent} strokeWidth={3} strokeLinecap="round" />;
    }
  } else {
    const x = t * width;
    clipPath = `inset(0px ${(1 - t) * 100}% 0px 0px)`;
    if (edgeVisible) {
      edge = <line x1={x} y1={0} x2={x} y2={height} stroke={p.accent} strokeWidth={3} />;
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: p.background, overflow: 'hidden', fontFamily: fonts.sans, color: p.text }}>
      <AbsoluteFill style={{ transform: `scale(${1 - 0.04 * t})` }}>{fromNode}</AbsoluteFill>
      {t > 0 ? (
        <AbsoluteFill style={{ clipPath, WebkitClipPath: clipPath }}>
          <AbsoluteFill style={{ transform: `scale(${1.04 - 0.04 * t})` }}>{toNode}</AbsoluteFill>
        </AbsoluteFill>
      ) : null}
      {edge ? (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ position: 'absolute', inset: 0, filter: `drop-shadow(0 0 10px ${p.accent})` }}
          >
            {edge}
          </svg>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
