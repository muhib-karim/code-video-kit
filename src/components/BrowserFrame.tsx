import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, radii, resolveTheme, withAlpha, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';

export const browserFrameSchema = z.object({
  ...baseThemeSchema,
  url: z.string().describe('Address shown in the URL bar, e.g. "https://example.dev" (under ~60 characters).'),
  tabTitle: z.string().describe('Text of the active browser tab (under ~20 characters).'),
  headline: z.string().describe('Hero headline of the built-in page (under ~30 characters). Ignored when children are passed.'),
  body: z.string().describe('Paragraph under the headline (under ~120 characters). Ignored when children are passed.'),
  typeUrl: z
    .boolean()
    .describe('When true the URL is typed in character by character before the page loads; when false it is shown immediately.'),
});

export type BrowserFrameProps = z.infer<typeof browserFrameSchema> & { children?: React.ReactNode };

export const browserFrameDefaults: BrowserFrameProps = {
  ...baseThemeDefaults,
  url: 'https://muhib-karim.github.io/code-video-kit',
  tabTitle: 'code-video-kit',
  headline: 'Ship videos from code',
  body: 'Typed, themeable Remotion components for launch videos, benchmarks and coding tutorials.',
  typeUrl: true,
};

const TYPE_START = 14;
const CHARS_PER_FRAME = 1;
const LOAD_FRAMES = 16;

const Icon: React.FC<{ d: string; color: string; size?: number }> = ({ d, color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d={d} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Built-in page: hero headline, paragraph, CTA shapes and skeleton cards. */
const DemoPage: React.FC<{ palette: Palette; headline: string; body: string; reveal: (delay: number) => number }> = ({
  palette: p,
  headline,
  body,
  reveal,
}) => {
  const fade = (delay: number): React.CSSProperties => {
    const v = reveal(delay);
    return { opacity: v, transform: `translateY(${(1 - v) * 18}px)` };
  };
  return (
    <AbsoluteFill style={{ alignItems: 'center', padding: '54px 80px 0', textAlign: 'center' }}>
      <div
        style={{
          ...fade(0),
          fontSize: 60,
          fontWeight: 800,
          letterSpacing: -2,
          lineHeight: 1.08,
          maxWidth: 860,
          color: p.text,
        }}
      >
        {headline}
      </div>
      <div style={{ ...fade(6), fontSize: 24, lineHeight: 1.45, color: p.textMuted, maxWidth: 740, marginTop: 20 }}>
        {body}
      </div>
      <div style={{ ...fade(12), display: 'flex', gap: 14, marginTop: 32 }}>
        <div
          style={{
            width: 176,
            height: 50,
            borderRadius: radii.pill,
            background: p.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 10px 30px ${withAlpha(p.accent, 0.35)}`,
          }}
        >
          <div style={{ width: 96, height: 10, borderRadius: 5, background: withAlpha(p.onAccent, 0.85) }} />
        </div>
        <div
          style={{
            width: 150,
            height: 50,
            borderRadius: radii.pill,
            border: `1px solid ${p.border}`,
            background: p.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 80, height: 10, borderRadius: 5, background: p.textFaint }} />
        </div>
      </div>
      <div style={{ ...fade(18), display: 'flex', gap: 18, marginTop: 40, width: '100%', maxWidth: 900 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 110,
              borderRadius: radii.md,
              background: p.surface,
              border: `1px solid ${p.border}`,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ width: 30, height: 30, borderRadius: 8, background: p.accentSoft, border: `1px solid ${p.accent}` }} />
            <div style={{ width: '70%', height: 10, borderRadius: 5, background: p.surfaceRaised }} />
            <div style={{ width: '45%', height: 10, borderRadius: 5, background: p.surfaceRaised }} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/**
 * A browser window with a tab, toolbar and URL bar. The URL can type itself
 * in, a loading bar runs, then the page (headline + body) fades in. Pass React
 * children to show your own page content inside the browser.
 */
export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  theme,
  accent,
  url,
  tabTitle,
  headline,
  body,
  typeUrl,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const enter = spring({ frame, fps, config: { damping: 200 } });

  const chars = Array.from(url);
  const typeEnd = TYPE_START + Math.ceil(chars.length / CHARS_PER_FRAME);
  const shown = typeUrl
    ? Math.max(0, Math.min(chars.length, Math.floor((frame - TYPE_START) * CHARS_PER_FRAME)))
    : chars.length;
  const typed = chars.slice(0, shown).join('');
  const protoMatch = /^[a-z]+:\/\//i.exec(url);
  const protoLen = protoMatch ? protoMatch[0].length : 0;
  const typedProto = typed.slice(0, Math.min(protoLen, typed.length));
  const typedRest = typed.slice(typedProto.length);

  const loadStart = typeUrl ? typeEnd + 6 : 10;
  const typing = typeUrl && frame < loadStart;
  const caretOn = typing && (frame < typeEnd || Math.floor(frame / 8) % 2 === 0);
  const loadT = interpolate(frame, [loadStart, loadStart + LOAD_FRAMES], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const loadBarOpacity = interpolate(frame, [loadStart + LOAD_FRAMES, loadStart + LOAD_FRAMES + 8], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const contentStart = loadStart + 10;
  const reveal = (delay: number): number =>
    interpolate(frame, [contentStart + delay, contentStart + delay + 16], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  const hasChildren = React.Children.count(children) > 0;

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 1080,
            height: 610,
            borderRadius: radii.lg,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: p.background,
            border: `1px solid ${p.border}`,
            boxShadow:
              p.mode === 'dark'
                ? '0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02)'
                : '0 30px 80px rgba(20,24,40,0.16)',
            opacity: enter,
            transform: `translateY(${(1 - enter) * 30}px) scale(${0.96 + enter * 0.04})`,
          }}
        >
          {/* Tab strip */}
          <div
            style={{
              height: 48,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 18,
              padding: '0 18px',
              background: p.surfaceRaised,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignSelf: 'center' }}>
              {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
                <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
              ))}
            </div>
            <div
              style={{
                height: 38,
                width: 250,
                borderRadius: '10px 10px 0 0',
                background: p.surface,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 14px',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ width: 16, height: 16, borderRadius: 4, background: p.accent, flexShrink: 0 }} />
              <div
                style={{
                  flex: 1,
                  fontSize: 18,
                  color: p.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {tabTitle}
              </div>
              <Icon d="M7 7l10 10M17 7L7 17" color={p.textFaint} size={14} />
            </div>
            <div style={{ alignSelf: 'center', marginBottom: 2 }}>
              <Icon d="M12 5v14M5 12h14" color={p.textFaint} size={18} />
            </div>
          </div>
          {/* Toolbar */}
          <div
            style={{
              height: 54,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '0 16px',
              background: p.surface,
              borderBottom: `1px solid ${p.border}`,
            }}
          >
            <Icon d="M15 6l-6 6 6 6" color={p.textMuted} />
            <Icon d="M9 6l6 6-6 6" color={p.textFaint} />
            <Icon d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" color={p.textMuted} />
            <div
              style={{
                flex: 1,
                height: 36,
                borderRadius: radii.pill,
                background: p.surfaceRaised,
                border: `1px solid ${typing ? withAlpha(p.accent, 0.6) : p.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 16px',
                fontFamily: fonts.mono,
                fontSize: 18,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <Icon d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" color={p.textMuted} size={16} />
              <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                <span style={{ color: p.textFaint }}>{typedProto}</span>
                <span style={{ color: p.text }}>{typedRest}</span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 2,
                    height: 22,
                    marginLeft: 2,
                    background: p.accent,
                    opacity: caretOn ? 1 : 0,
                  }}
                />
              </div>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: 15, background: p.accentSoft, border: `1px solid ${p.accent}` }} />
          </div>
          {/* Page */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: p.background }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: 3,
                width: `${loadT * 100}%`,
                background: p.accent,
                boxShadow: `0 0 12px ${p.accent}`,
                opacity: frame >= loadStart ? loadBarOpacity : 0,
                zIndex: 2,
              }}
            />
            {hasChildren ? (
              <AbsoluteFill style={{ opacity: reveal(0) }}>{children}</AbsoluteFill>
            ) : (
              <DemoPage palette={p} headline={headline} body={body} reveal={reveal} />
            )}
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
