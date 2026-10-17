import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, languageSchema, radii, resolveTheme, withAlpha } from '../theme';
import { Backdrop, CodeLines, WindowChrome } from '../internal/ui';
import { clamp, easeInOutCubic, easeOutCubic, lerp, progress } from '../lib/math';

export const zoomFocusSchema = z.object({
  ...baseThemeSchema,
  code: z.string().describe('Source code to display. Use "\\n" for new lines. ~11 lines at the default size.'),
  language: languageSchema,
  filename: z.string().describe('File name shown in the window title bar. Empty string hides it.'),
  focusLine: z.number().int().min(1).describe('1-based line the camera zooms to. Clamped to the number of lines.'),
  zoom: z.number().min(1).max(3).describe('Camera scale at full zoom. 1.4-1.8 keeps the focused line readable and in frame.'),
  zoomStart: z.number().int().min(0).describe('Frame at which the camera starts moving.'),
  zoomFrames: z.number().int().min(1).describe('Length of the camera move in frames.'),
  note: z.string().describe('Callout text shown under the focused line after the zoom. Empty string hides it. Keep under ~70 chars.'),
});

export type ZoomFocusProps = z.infer<typeof zoomFocusSchema>;

export const zoomFocusDefaults: ZoomFocusProps = {
  ...baseThemeDefaults,
  code: [
    'export function useDebounced<T>(value: T, ms = 200) {',
    '  const [state, setState] = useState(value);',
    '',
    '  useEffect(() => {',
    '    const id = setTimeout(() => setState(value), ms);',
    '    return () => clearTimeout(id);',
    '  }, [value, ms]);',
    '',
    '  return state;',
    '}',
  ].join('\n'),
  language: 'ts',
  filename: 'useDebounced.ts',
  focusLine: 6,
  zoom: 1.6,
  zoomStart: 40,
  zoomFrames: 36,
  note: 'Cleanup cancels the pending timer on every change',
};

const FONT_SIZE = 24;
const WINDOW_W = 1040;
const HEADER_H = 45; // WindowChrome title bar incl. its bottom border
const BODY_PAD = 24;
/** Screen x where the focused line's text should start when fully zoomed. */
const TARGET_SCREEN_X = 200;

/**
 * Camera move onto one line of code: the window scales and pans so the
 * focused line sits near the centre, other lines dim and blur, and a note
 * callout appears under the line. Great for "look at this line" moments.
 */
export const ZoomFocus: React.FC<ZoomFocusProps> = ({
  theme,
  accent,
  code,
  language,
  filename,
  focusLine,
  zoom,
  zoomStart,
  zoomFrames,
  note,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const enter = spring({ frame, fps, config: { damping: 200 } });

  const codeLines = code.split('\n');
  const lineCount = codeLines.length;
  const focus = clamp(Math.round(focusLine), 1, Math.max(1, lineCount));
  const focusText = codeLines[focus - 1] ?? '';
  const indent = focusText.length - focusText.trimStart().length;

  const lineHeight = Math.round(FONT_SIZE * 1.6);
  const charW = FONT_SIZE * 0.6;
  // CodeLines gutter: width 2.4em + paddingRight 1em (content-box).
  const gutter = FONT_SIZE * 3.4;

  const winH = 2 + HEADER_H + BODY_PAD * 2 + lineCount * lineHeight;
  const winLeft = (width - WINDOW_W) / 2;
  const winTop = Math.max(24, (height - winH) / 2);

  const anchorX = winLeft + 1 + gutter + indent * charW;
  const lineCenterY = winTop + 1 + HEADER_H + BODY_PAD + (focus - 0.5) * lineHeight;

  const zoomAmount = Math.max(1, zoom);
  const t = easeInOutCubic(progress(frame, zoomStart, Math.max(1, zoomFrames)));
  const panWeight = clamp((zoomAmount - 1) / 0.6);
  const targetCx = lerp(width / 2, anchorX + (width / 2 - TARGET_SCREEN_X) / zoomAmount, panWeight);
  const targetCy = lineCenterY + 36 / zoomAmount;

  const s = lerp(1, zoomAmount, t);
  const cx = lerp(width / 2, targetCx, t);
  const cy = lerp(height / 2, targetCy, t);

  // Screen-space position of the focused line, for the callout.
  const screenX = width / 2 + (anchorX - cx) * s;
  const screenLineBottom = height / 2 + (lineCenterY - cy) * s + (lineHeight / 2) * s;
  const noteIn = easeOutCubic(progress(frame, zoomStart + Math.max(1, zoomFrames) * 0.75, 14));
  const calloutX = clamp(screenX, 40, width - 240);

  return (
    <Backdrop palette={p}>
      <AbsoluteFill
        style={{
          transformOrigin: '0 0',
          transform: `translate(${width / 2}px, ${height / 2}px) scale(${s}) translate(${-cx}px, ${-cy}px)`,
        }}
      >
        <div style={{ position: 'absolute', left: winLeft, top: winTop }}>
          <WindowChrome
            palette={p}
            title={filename || undefined}
            width={WINDOW_W}
            style={{ opacity: enter, transform: `translateY(${(1 - enter) * 30}px) scale(${0.96 + enter * 0.04})` }}
            bodyStyle={{ padding: `${BODY_PAD}px 0` }}
          >
            <CodeLines
              code={code}
              language={language}
              palette={p}
              fontSize={FONT_SIZE}
              lineStyle={(i) => {
                if (i === focus - 1) {
                  return {
                    background: withAlpha(p.accent, (p.mode === 'dark' ? 0.18 : 0.12) * t),
                    boxShadow: `inset 3px 0 0 ${withAlpha(p.accent, t)}`,
                  };
                }
                return { opacity: lerp(1, 0.22, t), filter: t > 0.01 ? `blur(${1.2 * t}px)` : undefined };
              }}
            />
          </WindowChrome>
        </div>
      </AbsoluteFill>
      {note ? (
        <div
          style={{
            position: 'absolute',
            left: calloutX,
            top: screenLineBottom + 18,
            maxWidth: width - calloutX - 40,
            opacity: noteIn,
            transform: `translateY(${(1 - noteIn) * 12}px)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 22,
              top: -7,
              width: 14,
              height: 14,
              background: p.surfaceRaised,
              borderLeft: `1px solid ${withAlpha(p.accent, 0.5)}`,
              borderTop: `1px solid ${withAlpha(p.accent, 0.5)}`,
              transform: 'rotate(45deg)',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 22px',
              borderRadius: radii.md,
              background: p.surfaceRaised,
              border: `1px solid ${withAlpha(p.accent, 0.5)}`,
              boxShadow: p.mode === 'dark' ? '0 18px 50px rgba(0,0,0,0.5)' : '0 14px 40px rgba(20,24,40,0.14)',
              fontFamily: fonts.sans,
              fontSize: 26,
              fontWeight: 500,
              color: p.text,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                flexShrink: 0,
                background: p.accent,
                boxShadow: `0 0 12px ${p.accent}`,
              }}
            />
            {note}
          </div>
        </div>
      ) : null}
    </Backdrop>
  );
};
