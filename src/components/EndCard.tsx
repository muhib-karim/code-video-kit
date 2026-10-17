import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, radii, resolveTheme, withAlpha } from '../theme';
import { Backdrop } from '../internal/ui';

export const endCardSchema = z.object({
  ...baseThemeSchema,
  title: z.string().min(1).describe('Closing headline, e.g. "Start building". Keep it under ~25 characters.'),
  command: z
    .string()
    .describe('Install or run command typed into a terminal-style box, e.g. "npm i my-lib". Empty string hides the box.'),
  links: z
    .array(z.string())
    .max(4)
    .describe('Up to 4 short links shown as pills under the command, e.g. "github.com/org/repo". Empty array hides them.'),
  tagline: z.string().describe('One supporting line under the title. Empty string hides it.'),
});

export type EndCardProps = z.infer<typeof endCardSchema>;

export const endCardDefaults: EndCardProps = {
  ...baseThemeDefaults,
  title: 'Start building',
  command: 'npm i github:muhib-karim/code-video-kit',
  links: ['github.com/muhib-karim/code-video-kit', 'muhib-karim.github.io/code-video-kit'],
  tagline: 'Open source, MIT licensed, made for code-first video.',
};

const CHARS_PER_FRAME = 1.2;
const TYPE_START = 24;

/**
 * Closing call-to-action: headline and tagline spring in, the install command
 * types itself into a terminal pill and its copy icon flips to a check, then
 * link pills stagger in. Use it as the last 3-4 seconds of a video.
 */
export const EndCard: React.FC<EndCardProps> = ({ theme, accent, title, command, links, tagline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const titleIn = spring({ frame, fps, config: { damping: 200 } });
  const tagIn = interpolate(frame, [10, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const boxIn = spring({ frame: frame - 16, fps, config: { damping: 200 } });

  const typed = Math.max(0, Math.min(command.length, Math.floor((frame - TYPE_START) * CHARS_PER_FRAME)));
  const typeDone = TYPE_START + Math.ceil(command.length / CHARS_PER_FRAME);
  const copied = command.length > 0 && frame >= typeDone + 12;
  const cursorOn = typed < command.length || Math.floor(frame / 15) % 2 === 0;
  const linksStart = (command ? typeDone : 24) + 6;

  return (
    <Backdrop palette={p}>
      <AbsoluteFill
        style={{ alignItems: 'center', justifyContent: 'center', padding: '0 100px', textAlign: 'center' }}
      >
        <div
          style={{
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * 30}px)`,
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.05,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        {tagline ? (
          <div
            style={{
              opacity: tagIn,
              transform: `translateY(${(1 - tagIn) * 12}px)`,
              marginTop: 20,
              fontSize: 28,
              color: p.textMuted,
              maxWidth: 860,
              lineHeight: 1.4,
            }}
          >
            {tagline}
          </div>
        ) : null}
        {command ? (
          <div
            style={{
              marginTop: 44,
              opacity: boxIn,
              transform: `translateY(${(1 - boxIn) * 18}px) scale(${0.97 + 0.03 * boxIn})`,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '18px 22px 18px 26px',
              borderRadius: radii.md,
              background: p.surface,
              border: `1px solid ${p.border}`,
              boxShadow:
                p.mode === 'dark'
                  ? `0 24px 70px rgba(0,0,0,0.45), 0 0 0 1px ${withAlpha(p.accent, 0.12)}`
                  : '0 18px 50px rgba(20,24,40,0.12)',
              fontFamily: fonts.mono,
              fontSize: 28,
            }}
          >
            <span style={{ color: p.accent, fontWeight: 700 }}>$</span>
            <span style={{ width: `${command.length + 1}ch`, textAlign: 'left', whiteSpace: 'pre', color: p.text }}>
              {command.slice(0, typed)}
              <span
                style={{
                  display: 'inline-block',
                  width: '0.6em',
                  height: '1.1em',
                  marginLeft: 2,
                  verticalAlign: 'text-bottom',
                  background: p.accent,
                  opacity: cursorOn ? 0.85 : 0,
                }}
              />
            </span>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.sm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: copied ? withAlpha(p.positive, 0.16) : p.surfaceRaised,
                border: `1px solid ${copied ? p.positive : p.border}`,
              }}
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                {copied ? (
                  <path
                    d="M5 12.5l4.5 4.5L19 7"
                    stroke={p.positive}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <>
                    <rect x={8} y={8} width={12} height={12} rx={2.5} stroke={p.textMuted} strokeWidth={1.8} />
                    <path
                      d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"
                      stroke={p.textMuted}
                      strokeWidth={1.8}
                    />
                  </>
                )}
              </svg>
            </div>
          </div>
        ) : null}
        {links.length > 0 ? (
          <div
            style={{
              marginTop: 32,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 14,
              maxWidth: 1080,
            }}
          >
            {links.map((link, i) => {
              const s = spring({ frame: frame - linksStart - i * 5, fps, config: { damping: 200 } });
              return (
                <div
                  key={`${link}-${i}`}
                  style={{
                    opacity: s,
                    transform: `translateY(${(1 - s) * 14}px)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 18px',
                    borderRadius: radii.pill,
                    border: `1px solid ${p.border}`,
                    background: withAlpha(p.surface, 0.7),
                    fontFamily: fonts.mono,
                    fontSize: 20,
                    color: p.textMuted,
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 17L17 7M9 7h8v8"
                      stroke={p.accent}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {link}
                </div>
              );
            })}
          </div>
        ) : null}
      </AbsoluteFill>
    </Backdrop>
  );
};
