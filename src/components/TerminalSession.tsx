import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, resolveTheme, withAlpha } from '../theme';
import { Backdrop, WindowChrome } from '../internal/ui';
import { clamp, progress } from '../lib/math';

export const terminalSessionSchema = z.object({
  ...baseThemeSchema,
  title: z.string().describe('Terminal window title, e.g. "zsh — ~/my-video". Empty string hides it.'),
  prompt: z.string().describe('Prompt symbol drawn in the accent colour before each command, e.g. "$" or "❯".'),
  commands: z
    .array(
      z.object({
        command: z.string().describe('Command typed after the prompt, character by character.'),
        output: z
          .array(z.string())
          .describe('Output lines printed after the command, one by one. Lines starting with "✓" / "✗" get a green / red glyph.'),
      }),
    )
    .describe('Commands run in order. Content that overflows the window scrolls up automatically.'),
  charsPerFrame: z.number().min(0.1).max(20).describe('Typing speed in characters per frame (1 = 30 chars/s at 30 fps).'),
  pauseFrames: z.number().int().min(0).describe('Idle frames (blinking cursor) before each command after the first one.'),
});

export type TerminalSessionProps = z.infer<typeof terminalSessionSchema>;

export const terminalSessionDefaults: TerminalSessionProps = {
  ...baseThemeDefaults,
  title: 'zsh — ~/launch-video',
  prompt: '❯',
  commands: [
    {
      command: 'npm i github:muhib-karim/code-video-kit',
      output: ['added 214 packages in 3s', '✓ code-video-kit ready'],
    },
    {
      command: 'npx remotion render CodeTyping out/typing.mp4',
      output: ['Bundling 100%', 'Rendering frames 210/210', 'Encoding video 100%', '✓ out/typing.mp4'],
    },
    {
      command: 'ls out',
      output: ['typing.mp4'],
    },
  ],
  charsPerFrame: 1,
  pauseFrames: 20,
};

const FIRST_PROMPT = 12;
const FIRST_TYPE_DELAY = 12;
const ENTER_DELAY = 8;
const OUTPUT_STEP = 4;
const NEXT_PROMPT_DELAY = 6;

const FONT_SIZE = 22;
const LINE_HEIGHT = Math.round(FONT_SIZE * 1.6);
const WINDOW_W = 1040;
const WINDOW_H = 580;
const PAD = 24;
/** Visible text area inside the window body (header ~45px + borders). */
const VISIBLE_H = WINDOW_H - 47 - PAD * 2;

interface Row {
  kind: 'command' | 'output' | 'prompt';
  text: string;
  /** Frame the row appears. */
  appear: number;
  /** Command rows: typing window. */
  typeStart: number;
  typeEnd: number;
  /** Last frame (exclusive) that the cursor sits on this row. */
  cursorUntil: number;
}

function buildRows(
  commands: TerminalSessionProps['commands'],
  charsPerFrame: number,
  pauseFrames: number,
): Row[] {
  const rows: Row[] = [];
  const speed = Math.max(0.01, charsPerFrame);
  let t = FIRST_PROMPT;
  commands.forEach((c, ci) => {
    const appear = t;
    const typeStart = appear + (ci === 0 ? FIRST_TYPE_DELAY : Math.max(0, pauseFrames));
    const typeEnd = typeStart + Math.ceil(c.command.length / speed);
    const runAt = typeEnd + ENTER_DELAY;
    rows.push({ kind: 'command', text: c.command, appear, typeStart, typeEnd, cursorUntil: runAt });
    let last = typeEnd;
    c.output.forEach((line, j) => {
      const at = runAt + j * OUTPUT_STEP;
      rows.push({ kind: 'output', text: line, appear: at, typeStart: at, typeEnd: at, cursorUntil: at });
      last = at;
    });
    t = last + NEXT_PROMPT_DELAY;
  });
  rows.push({ kind: 'prompt', text: '', appear: t, typeStart: t, typeEnd: t, cursorUntil: Number.POSITIVE_INFINITY });
  return rows;
}

/**
 * A terminal window replaying a shell session: commands are typed after an
 * accent prompt, output lines print one by one, and the view scrolls when it
 * fills up. Good for install / CLI demos.
 */
export const TerminalSession: React.FC<TerminalSessionProps> = ({
  theme,
  accent,
  title,
  prompt,
  commands,
  charsPerFrame,
  pauseFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const enter = spring({ frame, fps, config: { damping: 200 } });

  const rows = React.useMemo(() => buildRows(commands, charsPerFrame, pauseFrames), [commands, charsPerFrame, pauseFrames]);
  const speed = Math.max(0.01, charsPerFrame);

  const visible = rows.filter((r) => frame >= r.appear);
  const contentH = visible.reduce((sum, r) => sum + LINE_HEIGHT * progress(frame, r.appear, 5), 0);
  const scroll = Math.max(0, contentH - VISIBLE_H);

  const blink = clamp(0.5 + 1.6 * Math.cos((frame / fps) * Math.PI * 2));

  const renderPromptRow = (row: Row, key: number) => {
    const typedCount = clamp(Math.floor((frame - row.typeStart) * speed), 0, row.text.length);
    const typed = row.text.slice(0, typedCount);
    const hasCursor = frame < row.cursorUntil;
    const isTyping = frame >= row.typeStart && frame < row.typeEnd;
    return (
      <div key={key} style={{ display: 'flex', alignItems: 'center', height: LINE_HEIGHT, whiteSpace: 'pre' }}>
        <span style={{ color: p.accent, fontWeight: 700 }}>{prompt}</span>
        <span style={{ color: p.text }}>{` ${typed}`}</span>
        {hasCursor ? (
          <span
            style={{
              display: 'inline-block',
              flexShrink: 0,
              width: Math.round(FONT_SIZE * 0.6),
              height: Math.round(FONT_SIZE * 1.2),
              background: withAlpha(p.text, 0.85),
              borderRadius: 2,
              opacity: isTyping ? 1 : blink,
            }}
          />
        ) : null}
      </div>
    );
  };

  const renderOutputRow = (row: Row, key: number) => {
    const o = progress(frame, row.appear, 4);
    const ok = row.text.startsWith('✓');
    const bad = row.text.startsWith('✗');
    const rest = ok || bad ? row.text.slice(1) : row.text;
    return (
      <div key={key} style={{ height: LINE_HEIGHT, whiteSpace: 'pre', color: p.textMuted, opacity: o }}>
        {ok ? <span style={{ color: p.positive, fontWeight: 700 }}>✓</span> : null}
        {bad ? <span style={{ color: p.negative, fontWeight: 700 }}>✗</span> : null}
        {rest}
      </div>
    );
  };

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <WindowChrome
          palette={p}
          title={title || undefined}
          width={WINDOW_W}
          height={WINDOW_H}
          style={{ opacity: enter, transform: `translateY(${(1 - enter) * 30}px) scale(${0.96 + enter * 0.04})` }}
          bodyStyle={{ overflow: 'hidden' }}
        >
          <div
            style={{
              position: 'absolute',
              top: PAD,
              left: 28,
              right: 28,
              fontFamily: fonts.mono,
              fontSize: FONT_SIZE,
              lineHeight: `${LINE_HEIGHT}px`,
              transform: `translateY(${-scroll}px)`,
            }}
          >
            {visible.map((row, i) => (row.kind === 'output' ? renderOutputRow(row, i) : renderPromptRow(row, i)))}
          </div>
        </WindowChrome>
      </AbsoluteFill>
    </Backdrop>
  );
};
