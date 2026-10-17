import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, radii, resolveTheme, withAlpha, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';

export const deviceFrameSchema = z.object({
  ...baseThemeSchema,
  device: z
    .enum(['phone', 'laptop', 'tablet'])
    .describe('Device drawn around the screen: "phone" (portrait, dynamic island), "laptop" (lid + base) or "tablet" (landscape).'),
  screenTitle: z.string().describe('Title of the built-in app screen (under ~18 characters for the phone). Ignored when children are passed.'),
  screenLines: z
    .array(z.string())
    .max(6)
    .describe('Rows of the built-in app screen, each shown with an animated check (under ~16 characters each on the phone, 3-5 rows work best). Ignored when children are passed.'),
});

export type DeviceFrameProps = z.infer<typeof deviceFrameSchema> & { children?: React.ReactNode };

export const deviceFrameDefaults: DeviceFrameProps = {
  ...baseThemeDefaults,
  device: 'phone',
  screenTitle: 'Release v2.0',
  screenLines: ['Tests passed', 'Preview deployed', 'Reviews approved', 'Merged to main'],
};

type Device = 'phone' | 'laptop' | 'tablet';

const LINE_START = 26;
const LINE_STAGGER = 10;

const CheckIcon: React.FC<{ palette: Palette; progress: number; size: number }> = ({ palette: p, progress, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <circle cx={12} cy={12} r={11} fill={progress > 0.5 ? p.accent : 'none'} stroke={p.accent} strokeWidth={1.6} />
    <path
      d="M7 12.5l3.2 3.2L17 9"
      fill="none"
      stroke={p.onAccent}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - progress}
    />
  </svg>
);

/** Built-in screen: a tiny release-checklist app. */
const AppScreen: React.FC<{
  palette: Palette;
  device: Device;
  title: string;
  lines: string[];
  frame: number;
  fps: number;
}> = ({ palette: p, device, title, lines, frame, fps }) => {
  const phone = device === 'phone';
  const s = phone ? 1 : 1.1;
  const done = lines.filter((_, i) => frame >= LINE_START + i * LINE_STAGGER + 10).length;
  const total = Math.max(1, lines.length);
  const headerIn = spring({ frame: frame - 10, fps, config: { damping: 200 } });

  const hero = (
    <div
      style={{
        borderRadius: radii.md,
        padding: phone ? '18px 20px' : '22px 24px',
        background: `linear-gradient(135deg, ${p.accent}, ${p.series[0]})`,
        color: p.onAccent,
        opacity: headerIn,
        width: phone ? undefined : 250,
        flexShrink: 0,
        alignSelf: phone ? undefined : 'flex-start',
      }}
    >
      <div style={{ fontSize: 18, opacity: 0.85 }}>Progress</div>
      <div style={{ fontSize: 30 * s, fontWeight: 800, letterSpacing: -0.5, margin: '4px 0 12px' }}>
        {done}/{lines.length}
      </div>
      <div style={{ height: 8, borderRadius: 4, background: withAlpha(p.onAccent, 0.3), overflow: 'hidden' }}>
        <div
          style={{
            width: `${(done / total) * 100}%`,
            height: '100%',
            borderRadius: 4,
            background: p.onAccent,
          }}
        />
      </div>
    </div>
  );

  const list = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: phone ? 10 : 12, flex: 1, minWidth: 0 }}>
      {lines.map((line, i) => {
        const start = LINE_START + i * LINE_STAGGER;
        const inn = spring({ frame: frame - start, fps, config: { damping: 200 } });
        const check = interpolate(frame, [start + 6, start + 16], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={i}
            style={{
              opacity: inn,
              transform: `translateY(${(1 - inn) * 14}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: phone ? '13px 14px' : '15px 18px',
              borderRadius: radii.sm + 2,
              background: p.surface,
              border: `1px solid ${p.border}`,
            }}
          >
            <CheckIcon palette={p} progress={check} size={phone ? 22 : 26} />
            <div style={{ fontSize: phone ? 19 : 21, lineHeight: 1.25, color: p.text, minWidth: 0 }}>{line}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <AbsoluteFill style={{ background: p.background, fontFamily: fonts.sans, color: p.text }}>
      {phone ? (
        <div
          style={{
            height: 52,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 28px 0',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>9:41</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[6, 9, 12].map((h) => (
              <div key={h} style={{ width: 4, height: h, borderRadius: 1, background: p.text }} />
            ))}
            <div
              style={{
                marginLeft: 4,
                width: 24,
                height: 12,
                borderRadius: 3,
                border: `1.5px solid ${p.textMuted}`,
                padding: 1.5,
              }}
            >
              <div style={{ width: '75%', height: '100%', borderRadius: 1.5, background: p.text }} />
            </div>
          </div>
        </div>
      ) : null}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {!phone ? (
          <div
            style={{
              width: 76,
              flexShrink: 0,
              background: p.surface,
              borderRight: `1px solid ${p.border}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 18,
              paddingTop: 26,
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, background: p.accent }} />
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: i === 0 ? p.accentSoft : p.surfaceRaised,
                  border: i === 0 ? `1px solid ${p.accent}` : `1px solid ${p.border}`,
                }}
              />
            ))}
          </div>
        ) : null}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: phone ? '12px 20px 20px' : '30px 34px',
            display: 'flex',
            flexDirection: 'column',
            gap: phone ? 16 : 22,
          }}
        >
          <div style={{ opacity: headerIn, transform: `translateY(${(1 - headerIn) * 10}px)` }}>
            <div style={{ fontSize: 18, color: p.textMuted, marginBottom: 2 }}>Today</div>
            <div style={{ fontSize: 30 * s, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.15 }}>{title}</div>
          </div>
          {phone ? (
            <>
              {hero}
              {list}
            </>
          ) : (
            <div style={{ display: 'flex', gap: 22, flex: 1, minHeight: 0 }}>
              {hero}
              {list}
            </div>
          )}
        </div>
      </div>
      {phone ? (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            width: 110,
            height: 5,
            marginLeft: -55,
            borderRadius: 3,
            background: p.textMuted,
            opacity: 0.6,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * A CSS-drawn device (phone with dynamic island, laptop with lid and base, or
 * landscape tablet) that springs into view with a slight 3D tilt. The default
 * screen is a tiny checklist app built from `screenTitle` and `screenLines`;
 * pass React children to put your own content on the screen.
 */
export const DeviceFrame: React.FC<DeviceFrameProps> = ({ theme, accent, device, screenTitle, screenLines, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  // Bezels stay near-black in both themes, like real hardware.
  const ink = resolveTheme('dark', accent).background;

  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.9 } });
  const deviceStyle: React.CSSProperties = {
    opacity: Math.min(1, enter * 1.6),
    transform: `perspective(1800px) translateY(${(1 - enter) * 80}px) rotateX(${(1 - enter) * 16}deg) scale(${0.84 + 0.16 * enter})`,
  };

  const hasChildren = React.Children.count(children) > 0;
  const screen: React.ReactNode = hasChildren ? (
    <AbsoluteFill>{children}</AbsoluteFill>
  ) : (
    <AppScreen palette={p} device={device} title={screenTitle} lines={screenLines} frame={frame} fps={fps} />
  );

  const frameShell: React.CSSProperties = {
    background: `linear-gradient(145deg, ${p.surfaceRaised}, ${p.surface})`,
    border: `1px solid ${p.border}`,
    padding: 4,
    boxShadow:
      p.mode === 'dark'
        ? '0 50px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)'
        : '0 40px 90px rgba(20,24,40,0.22)',
    position: 'relative',
    boxSizing: 'border-box',
  };

  let body: React.ReactNode;
  if (device === 'laptop') {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ ...frameShell, width: 900, height: 560, borderRadius: '26px 26px 6px 6px', borderBottom: 'none' }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: ink,
              borderRadius: '22px 22px 4px 4px',
              padding: '16px 16px 22px',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 5,
                left: '50%',
                marginLeft: -3,
                width: 6,
                height: 6,
                borderRadius: 3,
                background: p.surfaceRaised,
              }}
            />
            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden' }}>
              {screen}
            </div>
          </div>
        </div>
        <div
          style={{
            width: 1060,
            height: 24,
            borderRadius: '4px 4px 20px 20px',
            background: `linear-gradient(180deg, ${p.surfaceRaised}, ${p.surface})`,
            border: `1px solid ${p.border}`,
            position: 'relative',
            boxShadow: p.mode === 'dark' ? '0 30px 60px rgba(0,0,0,0.55)' : '0 24px 50px rgba(20,24,40,0.2)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              marginLeft: -80,
              width: 160,
              height: 9,
              borderRadius: '0 0 10px 10px',
              background: p.background,
              opacity: 0.7,
            }}
          />
        </div>
      </div>
    );
  } else if (device === 'tablet') {
    body = (
      <div style={{ ...frameShell, width: 860, height: 600, borderRadius: 42, boxSizing: 'border-box' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            background: ink,
            borderRadius: 38,
            padding: 18,
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: '50%',
              marginLeft: -3,
              width: 6,
              height: 6,
              borderRadius: 3,
              background: p.surfaceRaised,
            }}
          />
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 22, overflow: 'hidden' }}>
            {screen}
          </div>
        </div>
      </div>
    );
  } else {
    const sideButton = (side: 'left' | 'right', top: number, h: number) => (
      <div
        style={{
          position: 'absolute',
          left: side === 'left' ? -4 : undefined,
          right: side === 'right' ? -4 : undefined,
          top,
          width: 4,
          height: h,
          borderRadius: 2,
          background: p.surfaceRaised,
          border: `1px solid ${p.border}`,
        }}
      />
    );
    body = (
      <div style={{ ...frameShell, width: 304, height: 620, borderRadius: 56, boxSizing: 'border-box' }}>
        {sideButton('left', 130, 34)}
        {sideButton('left', 186, 60)}
        {sideButton('left', 256, 60)}
        {sideButton('right', 196, 92)}
        <div
          style={{
            width: '100%',
            height: '100%',
            background: ink,
            borderRadius: 52,
            padding: 10,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 43, overflow: 'hidden' }}>
            {screen}
            <div
              style={{
                position: 'absolute',
                top: 11,
                left: '50%',
                marginLeft: -50,
                width: 100,
                height: 30,
                borderRadius: 15,
                background: ink,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={deviceStyle}>{body}</div>
      </AbsoluteFill>
    </Backdrop>
  );
};
