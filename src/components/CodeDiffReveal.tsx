import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, languageSchema, resolveTheme } from '../theme';
import { Backdrop, TokenLine, WindowChrome } from '../internal/ui';
import { tokenize, type Token } from '../lib/tokenizer';
import { parseUnifiedDiff } from '../lib/diff';
import { easeInOutCubic, easeOutCubic, progress } from '../lib/math';

export const codeDiffRevealSchema = z.object({
  ...baseThemeSchema,
  diff: z
    .string()
    .describe(
      'Unified diff body: every line starts with "+" (added), "-" (removed) or " " (context). "+++", "---" and "@@" header lines are skipped. Use "\\n" between lines.',
    ),
  language: languageSchema,
  filename: z.string().describe('File name shown in the window title bar. Empty string hides it.'),
  framesPerLine: z
    .number()
    .int()
    .min(1)
    .describe('Frames between consecutive changed lines. Changes animate in order, one every framesPerLine frames.'),
  fontSize: z.number().min(10).max(48).describe('Code font size in pixels. 22 fits ~14 diff lines.'),
});

export type CodeDiffRevealProps = z.infer<typeof codeDiffRevealSchema>;

export const codeDiffRevealDefaults: CodeDiffRevealProps = {
  ...baseThemeDefaults,
  diff: [
    " import { render } from './render';",
    "-import { readFileSync } from 'fs';",
    "+import { readFile } from 'node:fs/promises';",
    ' ',
    '-export function build(path: string) {',
    "-  const src = readFileSync(path, 'utf8');",
    '+export async function build(path: string) {',
    "+  const src = await readFile(path, 'utf8');",
    '   const ast = parse(src);',
    '-  return render(ast);',
    '+  const html = await render(ast);',
    '+  return minify(html);',
    ' }',
  ].join('\n'),
  language: 'ts',
  filename: 'build.ts',
  framesPerLine: 12,
  fontSize: 22,
};

/** Frame at which the first change animates. */
const CHANGE_START = 30;

/**
 * Animated code review: context lines appear first, then each change plays in
 * order. Removed lines turn red, get struck through and collapse; added lines
 * slide in with a green tint and a "+" gutter. Ends on the new file.
 */
export const CodeDiffReveal: React.FC<CodeDiffRevealProps> = ({
  theme,
  accent,
  diff,
  language,
  filename,
  framesPerLine,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const enter = spring({ frame, fps, config: { damping: 200 } });

  const lines = React.useMemo(() => parseUnifiedDiff(diff), [diff]);
  const tokenLines = React.useMemo<Token[][]>(
    () => tokenize(lines.map((l) => l.text).join('\n'), language),
    [lines, language],
  );

  const step = Math.max(1, framesPerLine);
  const holdRemoved = Math.max(step, 16);
  const starts: number[] = [];
  let changeIndex = 0;
  for (const line of lines) {
    if (line.type === 'context') {
      starts.push(-1);
    } else {
      starts.push(CHANGE_START + changeIndex * step);
      changeIndex += 1;
    }
  }

  const added = lines.filter((l) => l.type === 'add').length;
  const removed = lines.filter((l) => l.type === 'remove').length;
  const statsIn = easeOutCubic(progress(frame, CHANGE_START - 6, 12));

  const lineHeight = Math.round(fontSize * 1.6);
  const numberWidth = fontSize * 2.2;
  const signWidth = fontSize * 1.4;

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <WindowChrome
          palette={p}
          title={filename || undefined}
          style={{ opacity: enter, transform: `translateY(${(1 - enter) * 30}px) scale(${0.96 + enter * 0.04})` }}
          bodyStyle={{ padding: '24px 0' }}
        >
          <div
            style={{
              position: 'absolute',
              top: 14,
              right: 20,
              display: 'flex',
              gap: 12,
              fontFamily: fonts.mono,
              fontSize: 18,
              fontWeight: 600,
              opacity: statsIn,
            }}
          >
            <span style={{ color: p.positive }}>+{added}</span>
            <span style={{ color: p.negative }}>-{removed}</span>
          </div>
          <div style={{ fontFamily: fonts.mono, fontSize, lineHeight: `${lineHeight}px` }}>
            {lines.map((line, i) => {
              const tokens = tokenLines[i] ?? [];
              const s = starts[i] ?? -1;
              const intro = easeOutCubic(progress(frame, 6 + i * 1.5, 10));

              let heightFactor = 1;
              let rowOpacity = intro;
              let translateX = (1 - intro) * -12;
              let tint = 0;
              let strike = 0;
              let sign = ' ';
              let number: number | undefined = line.newNumber ?? line.oldNumber;

              if (line.type === 'remove') {
                tint = progress(frame, s, 8);
                strike = easeOutCubic(progress(frame, s + 4, 10));
                const collapse = easeInOutCubic(progress(frame, s + holdRemoved, 12));
                heightFactor = 1 - collapse;
                rowOpacity = intro * (1 - collapse);
                sign = tint > 0 ? '-' : ' ';
                number = line.oldNumber;
              } else if (line.type === 'add') {
                const grow = easeOutCubic(progress(frame, s, 10));
                heightFactor = grow;
                rowOpacity = grow;
                translateX = (1 - grow) * -28;
                tint = grow;
                sign = '+';
              }

              const isRemove = line.type === 'remove';
              const tintColor = isRemove ? p.code.removed : p.code.added;
              const barColor = isRemove ? p.negative : p.positive;

              return (
                <div
                  key={i}
                  style={{
                    position: 'relative',
                    height: lineHeight * heightFactor,
                    overflow: 'hidden',
                    opacity: rowOpacity,
                  }}
                >
                  {line.type !== 'context' ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: tintColor,
                        boxShadow: `inset 3px 0 0 ${barColor}`,
                        opacity: tint,
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      height: lineHeight,
                      paddingRight: 24,
                      transform: `translateX(${translateX}px)`,
                    }}
                  >
                    <span
                      style={{
                        width: numberWidth,
                        flexShrink: 0,
                        textAlign: 'right',
                        color: p.code.lineNumber,
                      }}
                    >
                      {number ?? ''}
                    </span>
                    <span
                      style={{
                        width: signWidth,
                        flexShrink: 0,
                        textAlign: 'center',
                        fontWeight: 700,
                        color: isRemove ? p.negative : p.positive,
                      }}
                    >
                      {sign}
                    </span>
                    <span
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        whiteSpace: 'pre',
                        opacity: 1 - 0.4 * strike,
                      }}
                    >
                      <TokenLine tokens={tokens} palette={p} />
                      {tokens.length === 0 ? ' ' : null}
                      {isRemove ? (
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            height: 2,
                            width: `${strike * 100}%`,
                            background: p.negative,
                            borderRadius: 1,
                          }}
                        />
                      ) : null}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </WindowChrome>
      </AbsoluteFill>
    </Backdrop>
  );
};
