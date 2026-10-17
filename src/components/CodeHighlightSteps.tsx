import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, languageSchema, radii, resolveTheme, withAlpha } from '../theme';
import { Backdrop, CodeLines, WindowChrome } from '../internal/ui';
import { parseLineRanges } from '../lib/ranges';
import { easeInOutCubic, easeOutCubic, lerp, progress } from '../lib/math';

export const codeHighlightStepsSchema = z.object({
  ...baseThemeSchema,
  code: z.string().describe('Source code to display. Use "\\n" for new lines.'),
  language: languageSchema,
  filename: z.string().describe('File name shown in the window title bar. Empty string hides it.'),
  steps: z
    .array(
      z.object({
        lines: z.string().describe('1-based lines to focus in this step, e.g. "2-4" or "3,5". Other lines dim.'),
        label: z.string().describe('Caption shown in the pill under the window while this step is active. Keep under ~60 chars.'),
        durationInFrames: z.number().int().min(1).describe('How long this step stays on screen, in frames.'),
      }),
    )
    .min(1)
    .describe('Walkthrough steps played in order. Composition duration should be the sum of all durationInFrames.'),
  fontSize: z.number().min(10).max(48).describe('Code font size in pixels. 24 fits ~11 lines plus the caption pill.'),
});

export type CodeHighlightStepsProps = z.infer<typeof codeHighlightStepsSchema>;

export const codeHighlightStepsDefaults: CodeHighlightStepsProps = {
  ...baseThemeDefaults,
  code: [
    "import { z } from 'zod';",
    '',
    'const schema = z.object({',
    '  title: z.string(),',
    '  fps: z.number().int(),',
    '});',
    '',
    'export function parseProps(input: unknown) {',
    '  const props = schema.parse(input);',
    '  return { ...props, durationInFrames: props.fps * 5 };',
    '}',
  ].join('\n'),
  language: 'ts',
  filename: 'props.ts',
  steps: [
    { lines: '3-6', label: 'Declare the props once, as a zod schema', durationInFrames: 75 },
    { lines: '9', label: 'Validate untrusted input at the boundary', durationInFrames: 75 },
    { lines: '10', label: 'Derive everything else from typed props', durationInFrames: 75 },
  ],
  fontSize: 24,
};

/** Frames for the band to glide / lines to re-dim between steps. */
const MOVE_FRAMES = 14;
/** The first step's highlight eases in after the window has entered. */
const FIRST_DELAY = 12;
const DIM = 0.3;

/**
 * Guided code walkthrough: one step at a time, an accent band glides to the
 * step's lines, other lines dim, and a caption pill under the window explains
 * the step. Set the composition duration to the sum of step durations.
 */
export const CodeHighlightSteps: React.FC<CodeHighlightStepsProps> = ({
  theme,
  accent,
  code,
  language,
  filename,
  steps,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const enter = spring({ frame, fps, config: { damping: 200 } });

  const lineCount = code.split('\n').length;
  const lineHeight = Math.round(fontSize * 1.6);

  const timeline = React.useMemo(() => {
    let t = 0;
    return steps.map((s, i) => {
      const lines = parseLineRanges(s.lines).filter((n) => n <= lineCount);
      const first = lines.length > 0 ? lines[0] : 1;
      const last = lines.length > 0 ? lines[lines.length - 1] : 1;
      const start = i === 0 ? FIRST_DELAY : t;
      t += Math.max(1, s.durationInFrames);
      return { start, set: new Set(lines), top: (first - 1) * lineHeight, height: (last - first + 1) * lineHeight, label: s.label };
    });
  }, [steps, lineCount, lineHeight]);

  let active = -1;
  for (let i = 0; i < timeline.length; i++) {
    if (frame >= timeline[i].start) active = i;
  }
  const cur = active >= 0 ? timeline[active] : undefined;
  const prev = active > 0 ? timeline[active - 1] : undefined;
  const move = cur ? easeInOutCubic(progress(frame, cur.start, MOVE_FRAMES)) : 0;

  const bandTop = cur ? (prev ? lerp(prev.top, cur.top, move) : cur.top) : 0;
  const bandHeight = cur ? (prev ? lerp(prev.height, cur.height, move) : cur.height) : 0;
  const bandOpacity = cur ? (prev ? 1 : move) : 0;

  const lineOpacity = (i: number): number => {
    if (!cur) return 1;
    const target = cur.set.has(i + 1) ? 1 : DIM;
    const from = prev ? (prev.set.has(i + 1) ? 1 : DIM) : 1;
    return lerp(from, target, move);
  };

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 28 }}>
        <WindowChrome
          palette={p}
          title={filename || undefined}
          style={{ opacity: enter, transform: `translateY(${(1 - enter) * 30}px) scale(${0.96 + enter * 0.04})` }}
          bodyStyle={{ padding: '24px 0' }}
        >
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: 10,
                right: 10,
                top: bandTop,
                height: bandHeight,
                borderRadius: 8,
                background: withAlpha(p.accent, p.mode === 'dark' ? 0.16 : 0.11),
                border: `1px solid ${withAlpha(p.accent, 0.35)}`,
                boxShadow: `inset 3px 0 0 ${p.accent}, 0 0 32px ${withAlpha(p.accent, 0.12)}`,
                opacity: bandOpacity,
              }}
            />
            <div style={{ position: 'relative' }}>
              <CodeLines
                code={code}
                language={language}
                palette={p}
                fontSize={fontSize}
                lineStyle={(i) => ({ opacity: lineOpacity(i) })}
              />
            </div>
          </div>
        </WindowChrome>
        <div style={{ position: 'relative', width: 1040, height: 56 }}>
          {timeline.map((step, i) => {
            const next = timeline[i + 1];
            const fadeIn = easeOutCubic(progress(frame, step.start, 12));
            const fadeOut = next ? easeOutCubic(progress(frame, next.start, 10)) : 0;
            const o = fadeIn * (1 - fadeOut);
            if (o <= 0.001) return null;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: o,
                  transform: `translateY(${(1 - fadeIn) * 12 - fadeOut * 8}px)`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '10px 22px 10px 10px',
                    borderRadius: radii.pill,
                    background: p.surfaceRaised,
                    border: `1px solid ${p.border}`,
                    boxShadow: p.mode === 'dark' ? '0 12px 40px rgba(0,0,0,0.45)' : '0 10px 30px rgba(20,24,40,0.12)',
                    maxWidth: 1000,
                  }}
                >
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: radii.pill,
                      background: p.accent,
                      color: p.onAccent,
                      fontFamily: fonts.mono,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}/{timeline.length}
                  </span>
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 500,
                      color: p.text,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
