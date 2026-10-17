import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, languageSchema, resolveTheme, withAlpha } from '../theme';
import { Backdrop, TokenLine, WindowChrome } from '../internal/ui';
import { tokenize, type Token } from '../lib/tokenizer';
import { clamp } from '../lib/math';

export const codeTypingSchema = z.object({
  ...baseThemeSchema,
  code: z.string().describe('Source code that gets typed out. Use "\\n" for new lines; every new line counts as one character.'),
  language: languageSchema,
  filename: z.string().describe('File name shown in the window title bar. Empty string hides it.'),
  charsPerFrame: z
    .number()
    .min(0.1)
    .max(20)
    .describe('Typing speed in characters per frame (1 = 30 chars/s at 30 fps). Total typing time = code length / charsPerFrame.'),
  startFrame: z.number().int().min(0).describe('Frame at which typing starts. Before that only the blinking cursor is shown.'),
  showCursor: z.boolean().describe('Show a caret at the typing position (solid while typing, blinking when idle).'),
  cursorStyle: z.enum(['bar', 'block']).describe('Caret shape: thin "bar" (VS Code style) or "block" (terminal style).'),
  fontSize: z.number().min(10).max(48).describe('Code font size in pixels. 24 fits ~12 lines in the window.'),
});

export type CodeTypingProps = z.infer<typeof codeTypingSchema>;

export const codeTypingDefaults: CodeTypingProps = {
  ...baseThemeDefaults,
  code: [
    'type User = { id: string; name: string };',
    '',
    'export async function getUser(id: string) {',
    '  const res = await fetch(`/api/users/${id}`);',
    '  if (!res.ok) {',
    '    throw new Error(`Request failed: ${res.status}`);',
    '  }',
    '  const user: User = await res.json();',
    '  return user;',
    '}',
  ].join('\n'),
  language: 'ts',
  filename: 'getUser.ts',
  charsPerFrame: 2,
  startFrame: 20,
  showCursor: true,
  cursorStyle: 'bar',
  fontSize: 24,
};

/** Returns the first `count` characters of a token line, keeping token types. */
function sliceTokens(tokens: readonly Token[], count: number): Token[] {
  const out: Token[] = [];
  let left = count;
  for (const t of tokens) {
    if (left <= 0) break;
    if (t.text.length <= left) {
      out.push(t);
      left -= t.text.length;
    } else {
      out.push({ type: t.type, text: t.text.slice(0, left) });
      left = 0;
    }
  }
  return out;
}

/**
 * Code being typed into an editor window, character by character, with live
 * syntax colouring and a caret. Duration needed: startFrame + code.length /
 * charsPerFrame, plus a short hold.
 */
export const CodeTyping: React.FC<CodeTypingProps> = ({
  theme,
  accent,
  code,
  language,
  filename,
  charsPerFrame,
  startFrame,
  showCursor,
  cursorStyle,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const enter = spring({ frame, fps, config: { damping: 200 } });

  const lines = React.useMemo(() => tokenize(code, language), [code, language]);
  const layout = React.useMemo(() => {
    const starts: number[] = [];
    const lengths: number[] = [];
    let offset = 0;
    for (const tokens of lines) {
      const len = tokens.reduce((sum, t) => sum + t.text.length, 0);
      starts.push(offset);
      lengths.push(len);
      offset += len + 1; // newline counts as one character
    }
    return { starts, lengths, total: Math.max(0, offset - 1) };
  }, [lines]);

  const speed = Math.max(0.01, charsPerFrame);
  const revealed = Math.min(layout.total, Math.max(0, Math.floor((frame - startFrame) * speed)));
  const typing = frame >= startFrame && revealed < layout.total;

  let cursorLine = 0;
  for (let i = 0; i < layout.starts.length; i++) {
    if (revealed >= layout.starts[i]) cursorLine = i;
  }

  // Solid while typing, soft blink (1 Hz) when idle.
  const blink = clamp(0.5 + 1.6 * Math.cos((frame / fps) * Math.PI * 2));
  const cursorOpacity = typing ? 1 : blink;

  const lineHeight = Math.round(fontSize * 1.6);
  const currentLineBg = p.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(12,16,28,0.035)';

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <WindowChrome
          palette={p}
          title={filename || undefined}
          style={{ opacity: enter, transform: `translateY(${(1 - enter) * 30}px) scale(${0.96 + enter * 0.04})` }}
          bodyStyle={{ padding: '24px 0' }}
        >
          <div style={{ fontFamily: fonts.mono, fontSize, lineHeight: `${lineHeight}px` }}>
            {lines.map((tokens, i) => {
              const start = layout.starts[i] ?? 0;
              const len = layout.lengths[i] ?? 0;
              const reached = i === 0 || revealed >= start;
              const shown = reached ? Math.max(0, Math.min(len, revealed - start)) : 0;
              const isCursorLine = i === cursorLine;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: lineHeight,
                    paddingRight: 24,
                    background: isCursorLine && frame >= startFrame ? currentLineBg : undefined,
                  }}
                >
                  <span
                    style={{
                      width: fontSize * 2.4,
                      flexShrink: 0,
                      textAlign: 'right',
                      paddingRight: fontSize,
                      color: isCursorLine ? p.textMuted : p.code.lineNumber,
                      opacity: reached ? 1 : 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ whiteSpace: 'pre' }}>
                    <TokenLine tokens={sliceTokens(tokens, shown)} palette={p} />
                  </span>
                  {showCursor && isCursorLine ? (
                    <span
                      style={{
                        display: 'inline-block',
                        flexShrink: 0,
                        width: cursorStyle === 'block' ? Math.round(fontSize * 0.6) : Math.max(2, Math.round(fontSize / 9)),
                        height: Math.round(fontSize * 1.25),
                        borderRadius: 2,
                        background: cursorStyle === 'block' ? withAlpha(p.accent, 0.85) : p.accent,
                        boxShadow: `0 0 14px ${withAlpha(p.accent, 0.55)}`,
                        opacity: cursorOpacity,
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </WindowChrome>
      </AbsoluteFill>
    </Backdrop>
  );
};
