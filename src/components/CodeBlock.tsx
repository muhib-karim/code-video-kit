import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, languageSchema, resolveTheme } from '../theme';
import { Backdrop, CodeLines, WindowChrome } from '../internal/ui';
import { parseLineRanges } from '../lib/ranges';

export const codeBlockSchema = z.object({
  ...baseThemeSchema,
  code: z.string().describe('Source code to display. Use "\\n" for new lines.'),
  language: languageSchema,
  filename: z.string().describe('File name shown in the window title bar. Empty string hides it.'),
  showLineNumbers: z.boolean().describe('Show a line-number gutter.'),
  highlightLines: z.string().describe('1-based lines to highlight, e.g. "2-4,7". Empty string for none.'),
  fontSize: z.number().min(10).max(48).describe('Code font size in pixels.'),
});

export type CodeBlockProps = z.infer<typeof codeBlockSchema>;

export const codeBlockDefaults: CodeBlockProps = {
  ...baseThemeDefaults,
  code: [
    "import { Composition } from 'remotion';",
    "import { CodeBlock, codeBlockDefaults } from 'code-video-kit';",
    '',
    'export const Root = () => (',
    '  <Composition',
    '    id="intro"',
    '    component={CodeBlock}',
    '    defaultProps={codeBlockDefaults}',
    '    durationInFrames={150}',
    '    fps={30} width={1280} height={720}',
    '  />',
    ');',
  ].join('\n'),
  language: 'ts',
  filename: 'Root.tsx',
  showLineNumbers: true,
  highlightLines: '5-7',
  fontSize: 26,
};

/**
 * A syntax-highlighted code window. Lines fade in with a short stagger, the
 * window springs into place and `highlightLines` get an accent bar.
 */
export const CodeBlock: React.FC<CodeBlockProps> = ({
  theme,
  accent,
  code,
  language,
  filename,
  showLineNumbers,
  highlightLines,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const highlighted = parseLineRanges(highlightLines);
  const hlOn = frame > 20 + code.split('\n').length * 2;

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <WindowChrome
          palette={p}
          title={filename || undefined}
          style={{ opacity: enter, transform: `translateY(${(1 - enter) * 30}px) scale(${0.96 + enter * 0.04})` }}
          bodyStyle={{ padding: '24px 0' }}
        >
          <CodeLines
            code={code}
            language={language}
            palette={p}
            fontSize={fontSize}
            showLineNumbers={showLineNumbers}
            highlighted={hlOn ? highlighted : []}
            lineStyle={(i) => {
              const o = interpolate(frame, [8 + i * 2, 18 + i * 2], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return { opacity: o, transform: `translateX(${(1 - o) * -12}px)` };
            }}
          />
        </WindowChrome>
      </AbsoluteFill>
    </Backdrop>
  );
};
