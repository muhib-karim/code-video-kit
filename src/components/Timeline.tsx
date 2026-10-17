import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, resolveTheme, withAlpha } from '../theme';
import { Backdrop } from '../internal/ui';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
/** Frame at which the line starts drawing. */
const LINE_START = 12;

export const timelineSchema = z.object({
  ...baseThemeSchema,
  title: z.string().describe('Headline above the timeline, e.g. "The road to v1". Empty string hides it.'),
  events: z
    .array(
      z.object({
        date: z.string().describe('Short date label drawn in the accent colour, e.g. "2024 Q2" or "Mar 2025".'),
        title: z.string().describe('Milestone name, e.g. "v1.0 released". Keep it under ~24 characters.'),
        description: z
          .string()
          .optional()
          .describe('Optional one-sentence detail under the title (wraps to ~3 lines). Omit to hide.'),
      }),
    )
    .min(2)
    .max(6)
    .describe('Milestones in chronological order, left to right. Labels alternate above and below the line.'),
  staggerFrames: z
    .number()
    .int()
    .min(1)
    .max(120)
    .describe('Frames the line spends travelling between consecutive milestones; the whole line takes events x staggerFrames.'),
});

export type TimelineProps = z.infer<typeof timelineSchema>;

export const timelineDefaults: TimelineProps = {
  ...baseThemeDefaults,
  title: 'The road to 34 components',
  events: [
    { date: '2023 Q1', title: 'First commit', description: 'A weekend prototype for rendering code as video.' },
    { date: '2023 Q3', title: 'Open-sourced', description: 'Published on GitHub with eight components.' },
    { date: '2024 Q2', title: 'v1.0', description: 'Stable API with a zod schema for every prop.' },
    { date: '2025 Q1', title: 'Theming', description: 'Dark and light themes with custom accents.' },
    { date: '2025 Q4', title: '34 components', description: 'Titles, code, captions, data and transitions.' },
  ],
  staggerFrames: 18,
};

/**
 * Horizontal timeline: an accent line draws left to right and each milestone
 * node pops as the line reaches it, revealing its date (mono, accent), title
 * and optional description, alternating above and below the line.
 */
export const Timeline: React.FC<TimelineProps> = ({ theme, accent, title, events, staggerFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const n = Math.max(1, events.length);
  const padX = 80;
  const lineLeft = padX;
  const span = width - padX * 2;
  const lineY = title ? 410 : 360;
  const colW = span / n;
  const blockW = Math.min(320, colW * 2 - 24);
  const drawFrames = Math.max(1, n * staggerFrames);
  const lineProg = interpolate(frame, [LINE_START, LINE_START + drawFrames], [0, 1], CLAMP);
  const titleIn = spring({ frame, fps, config: { damping: 200 } });
  const trackIn = interpolate(frame, [0, 10], [0, 1], CLAMP);

  return (
    <Backdrop palette={p}>
      <AbsoluteFill>
        {title ? (
          <div
            style={{
              position: 'absolute',
              left: padX,
              top: 52,
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: -1,
              color: p.text,
              opacity: titleIn,
              transform: `translateY(${(1 - titleIn) * 16}px)`,
            }}
          >
            {title}
          </div>
        ) : null}

        {/* Track and drawn line */}
        <div
          style={{
            position: 'absolute',
            left: lineLeft,
            top: lineY - 1.5,
            width: span,
            height: 3,
            borderRadius: 2,
            background: withAlpha(p.textFaint, 0.25),
            opacity: trackIn,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: lineLeft,
            top: lineY - 1.5,
            width: span * lineProg,
            height: 3,
            borderRadius: 2,
            background: p.accent,
          }}
        />

        {events.map((ev, i) => {
          const x = lineLeft + colW * (i + 0.5);
          const passFrame = LINE_START + drawFrames * ((i + 0.5) / n);
          const pop = spring({ frame: frame - passFrame, fps, config: { damping: 11, mass: 0.6 } });
          const textIn = spring({ frame: frame - passFrame - 4, fps, config: { damping: 200 } });
          const above = i % 2 === 0;
          const blockLeft = Math.min(Math.max(x - blockW / 2, 24), width - 24 - blockW);
          const offset = (1 - textIn) * (above ? 14 : -14);
          return (
            <React.Fragment key={i}>
              {/* Stem */}
              <div
                style={{
                  position: 'absolute',
                  left: x - 0.5,
                  top: above ? lineY - 34 : lineY + 14,
                  width: 1,
                  height: 20,
                  background: p.border,
                  opacity: textIn,
                }}
              />
              {/* Node */}
              <div
                style={{
                  position: 'absolute',
                  left: x - 17,
                  top: lineY - 17,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  background: p.accentSoft,
                  transform: `scale(${Math.max(0, pop)})`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: x - 9,
                  top: lineY - 9,
                  width: 18,
                  height: 18,
                  boxSizing: 'border-box',
                  borderRadius: 9,
                  background: p.background,
                  border: `4px solid ${p.accent}`,
                  transform: `scale(${Math.max(0, pop)})`,
                }}
              />
              {/* Label block */}
              <div
                style={{
                  position: 'absolute',
                  left: blockLeft,
                  width: blockW,
                  top: above ? undefined : lineY + 40,
                  bottom: above ? height - (lineY - 40) : undefined,
                  textAlign: 'center',
                  opacity: textIn,
                  transform: `translateY(${offset}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    color: p.accent,
                  }}
                >
                  {ev.date}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 26,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: p.text,
                  }}
                >
                  {ev.title}
                </div>
                {ev.description ? (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 20,
                      lineHeight: 1.4,
                      color: p.textMuted,
                    }}
                  >
                    {ev.description}
                  </div>
                ) : null}
              </div>
            </React.Fragment>
          );
        })}
      </AbsoluteFill>
    </Backdrop>
  );
};
