import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, radii, resolveTheme } from '../theme';
import { Backdrop } from '../internal/ui';
import { encodeQR, type QRCode } from '../lib/qr';

export const qrCardSchema = z.object({
  ...baseThemeSchema,
  value: z
    .string()
    .min(1)
    .describe('Text or URL encoded in the QR code (byte mode, up to ~270 bytes at "M"; longer values show an error in the card).'),
  title: z.string().describe('Heading next to the code, e.g. "Star it on GitHub" (under ~24 characters).'),
  caption: z.string().describe('Supporting sentence under the title (under ~80 characters). Empty string hides it.'),
  errorCorrection: z
    .enum(['L', 'M', 'Q', 'H'])
    .describe('QR error-correction level: "L" (7%), "M" (15%), "Q" (25%) or "H" (30%). Higher = more robust but denser.'),
});

export type QRCardProps = z.infer<typeof qrCardSchema>;

export const qrCardDefaults: QRCardProps = {
  ...baseThemeDefaults,
  value: 'https://github.com/muhib-karim/code-video-kit',
  title: 'Star it on GitHub',
  caption: 'Scan to open the repo and grab every component.',
  errorCorrection: 'M',
};

const QUIET = 4;
const QR_SIZE = 340;
const REVEAL_START = 12;
const REVEAL_FRAMES = 36;

type EncodeResult = { qr: QRCode; error: null } | { qr: null; error: string };

/** Builds one SVG path with a 1x1 square per dark module, offset by the quiet zone. */
function modulesToPath(modules: boolean[][]): string {
  const parts: string[] = [];
  for (let y = 0; y < modules.length; y++) {
    const row = modules[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x]) parts.push(`M${x + QUIET} ${y + QUIET}h1v1h-1z`);
    }
  }
  return parts.join('');
}

/**
 * A real, scannable QR code (black modules on white with a 4-module quiet
 * zone) on a card with a title and caption. Modules are revealed with a
 * diagonal sweep. Values that are too long show a readable error instead.
 */
export const QRCard: React.FC<QRCardProps> = ({ theme, accent, value, title, caption, errorCorrection }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const result = React.useMemo<EncodeResult>(() => {
    try {
      return { qr: encodeQR(value, errorCorrection), error: null };
    } catch (e) {
      return { qr: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [value, errorCorrection]);

  const path = React.useMemo<string>(() => (result.qr ? modulesToPath(result.qr.modules) : ''), [result]);
  const dim = result.qr ? result.qr.size + QUIET * 2 : 1;

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const tile = spring({ frame: frame - 4, fps, config: { damping: 15, mass: 0.7 } });
  const sweep = interpolate(frame, [REVEAL_START, REVEAL_START + REVEAL_FRAMES], [0, 200], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const clip = `polygon(-100% 0%, ${sweep}% 0%, ${sweep - 100}% 100%, -100% 100%)`;
  const textIn = (delay: number): React.CSSProperties => {
    const v = interpolate(frame, [14 + delay, 30 + delay], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { opacity: v, transform: `translateX(${(1 - v) * 20}px)` };
  };
  const displayValue = value.replace(/^https?:\/\//i, '');

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 56,
            padding: 48,
            borderRadius: radii.lg + 6,
            background: p.surface,
            border: `1px solid ${p.border}`,
            boxShadow:
              p.mode === 'dark'
                ? '0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02)'
                : '0 30px 80px rgba(20,24,40,0.14)',
            opacity: enter,
            transform: `translateY(${(1 - enter) * 30}px) scale(${0.96 + 0.04 * enter})`,
          }}
        >
          {result.qr ? (
            <div
              style={{
                position: 'relative',
                width: QR_SIZE,
                height: QR_SIZE,
                flexShrink: 0,
                borderRadius: 18,
                overflow: 'hidden',
                background: '#FFFFFF',
                boxShadow: `0 0 0 6px ${p.accentSoft}`,
                transform: `scale(${0.9 + 0.1 * tile})`,
                opacity: Math.min(1, tile * 1.5),
              }}
            >
              <svg
                width={QR_SIZE}
                height={QR_SIZE}
                viewBox={`0 0 ${dim} ${dim}`}
                shapeRendering="crispEdges"
                style={{ position: 'absolute', inset: 0, clipPath: clip, WebkitClipPath: clip }}
              >
                <path d={path} fill="#000000" />
              </svg>
            </div>
          ) : (
            <div
              style={{
                width: QR_SIZE,
                height: QR_SIZE,
                flexShrink: 0,
                boxSizing: 'border-box',
                borderRadius: 18,
                border: `2px dashed ${p.negative}`,
                background: p.surfaceRaised,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                padding: 28,
                textAlign: 'center',
                opacity: Math.min(1, tile * 1.5),
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 700, color: p.negative }}>Cannot encode QR</div>
              <div style={{ fontSize: 19, lineHeight: 1.4, color: p.textMuted }}>
                The value is too long for a version 1-10 code. Shorten it or use a lower error-correction level.
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: 18, color: p.textFaint, wordBreak: 'break-word' }}>
                {result.error}
              </div>
            </div>
          )}
          <div style={{ width: 440, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                ...textIn(0),
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 16px',
                borderRadius: radii.pill,
                background: p.accentSoft,
                border: `1px solid ${p.accent}`,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 24,
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"
                  stroke={p.accent}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Scan me
            </div>
            <div style={{ ...textIn(5), fontSize: 50, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.08, color: p.text }}>
              {title}
            </div>
            {caption ? (
              <div style={{ ...textIn(10), fontSize: 24, lineHeight: 1.45, color: p.textMuted, marginTop: 18 }}>{caption}</div>
            ) : null}
            <div
              style={{
                ...textIn(15),
                marginTop: 28,
                paddingTop: 20,
                borderTop: `1px solid ${p.border}`,
                fontFamily: fonts.mono,
                fontSize: 18,
                lineHeight: 1.45,
                color: p.accent,
                wordBreak: 'break-all',
              }}
            >
              {displayValue}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
