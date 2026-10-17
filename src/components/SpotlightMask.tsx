import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, radii, resolveTheme, withAlpha, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';

export const spotlightMaskSchema = z.object({
  ...baseThemeSchema,
  spots: z
    .array(
      z.object({
        x: z.number().min(0).max(100).describe('Horizontal centre of the spotlight in % of frame width (0 = left, 100 = right).'),
        y: z.number().min(0).max(100).describe('Vertical centre of the spotlight in % of frame height (0 = top, 100 = bottom).'),
        radius: z.number().min(20).max(600).describe('Radius of the spotlight hole in pixels.'),
        label: z.string().describe('Short note shown in a pill next to the spot (under ~36 characters). Empty string hides it.'),
        at: z.number().int().min(0).describe('Frame at which the spotlight starts moving to this spot. Use increasing values.'),
      }),
    )
    .min(1)
    .describe('Spots visited in order of `at`. The hole glides from one spot to the next over ~18 frames.'),
  dim: z.number().min(0).max(1).describe('Opacity of the dark overlay outside the spotlight (0 = none, 1 = fully dark).'),
});

export type SpotlightMaskProps = z.infer<typeof spotlightMaskSchema> & { children?: React.ReactNode };

export const spotlightMaskDefaults: SpotlightMaskProps = {
  ...baseThemeDefaults,
  spots: [
    { x: 33, y: 24, radius: 130, label: 'Revenue up 24% this week', at: 20 },
    { x: 44, y: 66, radius: 200, label: 'p95 latency halved after v2.3', at: 80 },
    { x: 83, y: 66, radius: 175, label: 'Every deploy shipped green', at: 140 },
  ],
  dim: 0.72,
};

const MOVE_FRAMES = 18;

const BAR_VALUES = [0.42, 0.55, 0.48, 0.62, 0.58, 0.7, 0.66, 0.52, 0.4, 0.36, 0.33, 0.3];

/** Built-in demo content: a small analytics dashboard drawn with divs. */
const DemoDashboard: React.FC<{ palette: Palette; frame: number }> = ({ palette: p, frame }) => {
  const card: React.CSSProperties = {
    background: p.surface,
    border: `1px solid ${p.border}`,
    borderRadius: radii.md,
    padding: 22,
    display: 'flex',
    flexDirection: 'column',
  };
  const kpis = [
    { label: 'Revenue', value: '$48.2k', delta: '+24%' },
    { label: 'Active users', value: '12,940', delta: '+8%' },
    { label: 'Error rate', value: '0.12%', delta: '-41%' },
  ];
  const deploys = [
    { name: 'api-gateway', time: '2m ago' },
    { name: 'web-app', time: '18m ago' },
    { name: 'billing-worker', time: '1h ago' },
    { name: 'search-index', time: '3h ago' },
  ];
  const grow = interpolate(frame, [0, 30], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ flexDirection: 'row' }}>
        <div
          style={{
            width: 232,
            padding: '32px 20px',
            background: p.surface,
            borderRight: `1px solid ${p.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingLeft: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: p.accent }} />
            <div style={{ fontSize: 22, fontWeight: 700 }}>Acme</div>
          </div>
          {['Overview', 'Deploys', 'Analytics', 'Logs', 'Settings'].map((item, i) => (
            <div
              key={item}
              style={{
                fontSize: 19,
                padding: '10px 12px',
                borderRadius: radii.sm,
                color: i === 0 ? p.text : p.textMuted,
                background: i === 0 ? p.surfaceRaised : 'transparent',
                fontWeight: i === 0 ? 600 : 400,
              }}
            >
              {item}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 36, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Overview</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 220,
                  height: 40,
                  borderRadius: radii.pill,
                  background: p.surface,
                  border: `1px solid ${p.border}`,
                }}
              />
              <div style={{ width: 40, height: 40, borderRadius: 20, background: p.accentSoft, border: `1px solid ${p.accent}` }} />
            </div>
          </div>
          <div style={{ height: 132, display: 'flex', gap: 20 }}>
            {kpis.map((k) => (
              <div key={k.label} style={{ ...card, flex: 1, justifyContent: 'space-between' }}>
                <div style={{ fontSize: 18, color: p.textMuted }}>{k.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>{k.value}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: p.positive }}>{k.delta}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, display: 'flex', gap: 20, minHeight: 0 }}>
            <div style={{ ...card, flex: 1.7 }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>p95 latency</div>
              <div style={{ fontSize: 18, color: p.textMuted, marginTop: 4 }}>Last 12 weeks</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 12, paddingTop: 20 }}>
                {BAR_VALUES.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${v * 100 * grow}%`,
                      borderRadius: '6px 6px 2px 2px',
                      background: i >= 8 ? p.accent : withAlpha(p.accent, 0.35),
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ ...card, flex: 1, gap: 14 }}>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Recent deploys</div>
              {deploys.map((d) => (
                <div
                  key={d.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: radii.sm,
                    background: p.surfaceRaised,
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: 5, background: p.positive, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontFamily: fonts.mono, fontSize: 18 }}>{d.name}</div>
                  <div style={{ fontSize: 18, color: p.textFaint }}>{d.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

/**
 * Dims the frame and cuts a soft circular spotlight that glides between
 * `spots` (x/y in % of the frame, radius in px), each with a label pill. The
 * built-in content is a mock dashboard; pass React children to spotlight your
 * own scene.
 */
export const SpotlightMask: React.FC<SpotlightMaskProps> = ({ theme, accent, spots, dim, children }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const hasChildren = React.Children.count(children) > 0;
  const content: React.ReactNode = hasChildren ? (
    <AbsoluteFill>{children}</AbsoluteFill>
  ) : (
    <DemoDashboard palette={p} frame={frame} />
  );

  const sorted = [...spots].sort((a, b) => a.at - b.at);
  if (sorted.length === 0) {
    return <AbsoluteFill style={{ backgroundColor: p.background }}>{content}</AbsoluteFill>;
  }

  let idx = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (frame >= sorted[i].at) idx = i;
  }
  const cur = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : cur;
  const moveT =
    idx > 0
      ? interpolate(frame, [cur.at, cur.at + MOVE_FRAMES], [0, 1], {
          easing: Easing.inOut(Easing.cubic),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;

  const first = sorted[0];
  const overlayIn = interpolate(frame, [first.at, first.at + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const firstPop = spring({ frame: frame - first.at, fps, config: { damping: 18, mass: 0.7 } });

  const cx = ((prev.x + (cur.x - prev.x) * moveT) / 100) * width;
  const cy = ((prev.y + (cur.y - prev.y) * moveT) / 100) * height;
  const baseR = prev.radius + (cur.radius - prev.radius) * moveT;
  const r = Math.max(1, idx === 0 ? baseR * (0.6 + 0.4 * firstPop) : baseR);

  const dimBase = p.mode === 'dark' ? p.background : p.text;
  const dimColor = withAlpha(dimBase, dim);
  const feather = Math.min(14, r * 0.15);
  const mask = `radial-gradient(circle at ${cx}px ${cy}px, transparent 0px, transparent ${Math.max(0, r - feather)}px, ${dimColor} ${r}px)`;

  const labelStart = idx === 0 ? cur.at + 8 : cur.at + MOVE_FRAMES * 0.7;
  const labelIn = interpolate(frame, [labelStart, labelStart + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const below = cy + r + 70 < height;
  const labelX = Math.min(width - 200, Math.max(200, cx));
  const labelY = below ? cy + r + 18 : cy - r - 18;

  return (
    <AbsoluteFill style={{ backgroundColor: p.background, overflow: 'hidden', fontFamily: fonts.sans, color: p.text }}>
      {content}
      <AbsoluteFill style={{ background: mask, opacity: overlayIn, pointerEvents: 'none' }} />
      <div
        style={{
          position: 'absolute',
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: '50%',
          border: `2px solid ${withAlpha(p.accent, 0.85)}`,
          boxShadow: `0 0 32px ${withAlpha(p.accent, 0.45)}, inset 0 0 24px ${withAlpha(p.accent, 0.18)}`,
          opacity: overlayIn,
          pointerEvents: 'none',
        }}
      />
      {cur.label ? (
        <div
          style={{
            position: 'absolute',
            left: labelX,
            top: labelY,
            transform: `translate(-50%, ${below ? 0 : -100}%) translateY(${(1 - labelIn) * (below ? 10 : -10)}px)`,
            opacity: labelIn * overlayIn,
            padding: '10px 20px',
            borderRadius: radii.pill,
            background: p.accent,
            color: p.onAccent,
            fontSize: 20,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: `0 12px 32px ${withAlpha(dimBase, 0.35)}`,
          }}
        >
          {cur.label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
