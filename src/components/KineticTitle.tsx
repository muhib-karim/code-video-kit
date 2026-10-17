import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, resolveTheme, withAlpha } from '../theme';
import { Backdrop } from '../internal/ui';

export const kineticTitleSchema = z.object({
  ...baseThemeSchema,
  text: z
    .string()
    .min(1)
    .describe('Headline split on spaces; each word animates in separately. Keep it to roughly 3-8 words.'),
  highlight: z
    .array(z.string())
    .describe(
      'Words from `text` drawn in the accent colour with an underline, matched case-insensitively and ignoring punctuation, e.g. ["videos"]. Empty array for none.',
    ),
  staggerFrames: z
    .number()
    .int()
    .min(0)
    .max(30)
    .describe('Delay in frames between consecutive words starting their entrance. 3-6 feels snappy.'),
  fontSize: z
    .number()
    .min(32)
    .max(160)
    .describe('Headline font size in pixels. Lower it for longer text so it fits in about two lines.'),
});

export type KineticTitleProps = z.infer<typeof kineticTitleSchema>;

export const kineticTitleDefaults: KineticTitleProps = {
  ...baseThemeDefaults,
  text: 'Turn your codebase into launch videos',
  highlight: ['codebase', 'videos'],
  staggerFrames: 4,
  fontSize: 92,
};

/** Lowercases and strips non-alphanumerics so "Videos." matches "videos". */
function normalizeWord(word: string): string {
  const lower = word.toLowerCase();
  const stripped = lower.replace(/[^a-z0-9]+/g, '');
  return stripped.length > 0 ? stripped : lower;
}

/**
 * Kinetic typography headline: words rise in one after another with a slight
 * blur-to-sharp pop, highlighted words turn accent and get an underline sweep,
 * and the whole line drifts forward slowly. Use it for punchy statements
 * between scenes or as a bolder alternative to TitleCard.
 */
export const KineticTitle: React.FC<KineticTitleProps> = ({ theme, accent, text, highlight, staggerFrames, fontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const highlightSet = new Set(highlight.map(normalizeWord));
  const startDelay = 4;
  const lastStart = startDelay + Math.max(0, words.length - 1) * staggerFrames;
  const drift = interpolate(frame, [0, 150], [1, 1.03], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  let highlightCount = 0;

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 100px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'baseline',
            columnGap: '0.26em',
            rowGap: '0.02em',
            maxWidth: 1080,
            fontSize,
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.12,
            textAlign: 'center',
            transform: `scale(${drift})`,
          }}
        >
          {words.map((word, i) => {
            const s = spring({
              frame: frame - startDelay - i * staggerFrames,
              fps,
              config: { damping: 14, stiffness: 140, mass: 0.7 },
            });
            const sc = Math.min(1, Math.max(0, s));
            const isHighlight = highlightSet.has(normalizeWord(word));
            let underline = 0;
            if (isHighlight) {
              underline = spring({
                frame: frame - lastStart - 12 - highlightCount * 5,
                fps,
                config: { damping: 200 },
                durationInFrames: 20,
              });
              highlightCount += 1;
            }
            return (
              <span
                key={`${word}-${i}`}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  opacity: sc,
                  transform: `translateY(${(1 - s) * fontSize * 0.55}px) scale(${0.92 + 0.08 * s})`,
                  filter: `blur(${(1 - sc) * 10}px)`,
                  color: isHighlight ? p.accent : p.text,
                  textShadow: isHighlight ? `0 0 48px ${withAlpha(p.accent, 0.35)}` : undefined,
                }}
              >
                {word}
                {isHighlight ? (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      bottom: '-0.02em',
                      height: '0.07em',
                      width: `${underline * 100}%`,
                      borderRadius: '0.04em',
                      background: p.accent,
                      opacity: 0.55,
                    }}
                  />
                ) : null}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
