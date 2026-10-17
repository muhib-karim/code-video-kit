import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, languageSchema, radii, resolveTheme, withAlpha, type Palette } from '../theme';
import { Backdrop, CodeLines, WindowChrome } from '../internal/ui';
import { easeOutCubic, progress } from '../lib/math';
import type { Language } from '../lib/tokenizer';

export const splitScreenSchema = z.object({
  ...baseThemeSchema,
  leftLabel: z.string().describe('Chip label above the left panel, e.g. "Before".'),
  rightLabel: z.string().describe('Chip label above the right panel, e.g. "After". Drawn in the accent colour.'),
  leftCode: z.string().describe('Code for the left panel. Use "\\n" for new lines. Keep lines under ~40 chars at fontSize 20.'),
  rightCode: z.string().describe('Code for the right panel. Use "\\n" for new lines. Keep lines under ~40 chars at fontSize 20.'),
  language: languageSchema,
  fontSize: z.number().min(10).max(40).describe('Code font size in pixels for both panels. 20 fits ~40 chars x 12 lines.'),
});

export type SplitScreenProps = z.infer<typeof splitScreenSchema>;

export const splitScreenDefaults: SplitScreenProps = {
  ...baseThemeDefaults,
  leftLabel: 'Before',
  rightLabel: 'After',
  leftCode: [
    'function loadUser(id: string) {',
    '  return fetch(url(id))',
    '    .then((res) => res.json())',
    '    .then((user) => normalize(user))',
    '    .catch((err) => {',
    '      console.error(err);',
    '    });',
    '}',
  ].join('\n'),
  rightCode: [
    'async function loadUser(id: string) {',
    '  try {',
    '    const res = await fetch(url(id));',
    '    return normalize(await res.json());',
    '  } catch (err) {',
    '    console.error(err);',
    '  }',
    '}',
  ].join('\n'),
  language: 'ts',
  fontSize: 20,
};

const PANEL_W = 556;
const DIVIDER_W = 64;
/** The right panel enters this many frames after the left one. */
const RIGHT_DELAY = 18;

const Panel: React.FC<{
  palette: Palette;
  label: string;
  code: string;
  language: Language;
  fontSize: number;
  start: number;
  emphasis: boolean;
}> = ({ palette: p, label, code, language, fontSize, start, emphasis }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - start, fps, config: { damping: 200 } });
  const chipIn = easeOutCubic(progress(frame, start + 4, 12));
  return (
    <div
      style={{
        width: PANEL_W,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 36}px)`,
      }}
    >
      <div style={{ display: 'flex', opacity: chipIn, transform: `translateY(${(1 - chipIn) * 8}px)` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 16px',
            borderRadius: radii.pill,
            background: emphasis ? p.accentSoft : p.surfaceRaised,
            border: `1px solid ${emphasis ? withAlpha(p.accent, 0.55) : p.border}`,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: 0.3,
            color: p.text,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              background: emphasis ? p.accent : p.textFaint,
              boxShadow: emphasis ? `0 0 10px ${p.accent}` : undefined,
            }}
          />
          {label}
        </div>
      </div>
      <WindowChrome palette={p} width={PANEL_W} style={{ flex: 1 }} bodyStyle={{ padding: '20px 0' }}>
        <CodeLines
          code={code}
          language={language}
          palette={p}
          fontSize={fontSize}
          lineStyle={(i) => {
            const o = easeOutCubic(progress(frame, start + 8 + i * 2, 10));
            return { opacity: o, transform: `translateX(${(1 - o) * -10}px)`, paddingRight: 12 };
          }}
        />
      </WindowChrome>
    </div>
  );
};

/**
 * Side-by-side code comparison ("Before" / "After"): two editor panels with
 * label chips and a divider that wipes in between them; the right panel
 * arrives a beat later so the eye lands on the improvement.
 */
export const SplitScreen: React.FC<SplitScreenProps> = ({
  theme,
  accent,
  leftLabel,
  rightLabel,
  leftCode,
  rightCode,
  language,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const wipe = easeOutCubic(progress(frame, 8, 22));
  const badge = spring({ frame: frame - 24, fps, config: { damping: 12, stiffness: 160 } });

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <Panel
            palette={p}
            label={leftLabel}
            code={leftCode}
            language={language}
            fontSize={fontSize}
            start={0}
            emphasis={false}
          />
          <div style={{ position: 'relative', width: DIVIDER_W, flexShrink: 0 }}>
            <div
              style={{
                position: 'absolute',
                left: DIVIDER_W / 2 - 1,
                top: 0,
                bottom: 0,
                width: 2,
                transformOrigin: '50% 0%',
                transform: `scaleY(${wipe})`,
                background: `linear-gradient(180deg, transparent, ${withAlpha(p.accent, 0.8)} 30%, ${withAlpha(
                  p.accent,
                  0.8,
                )} 70%, transparent)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: DIVIDER_W / 2 - 20,
                top: '50%',
                marginTop: -20,
                width: 40,
                height: 40,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: p.accent,
                boxShadow: `0 0 0 6px ${withAlpha(p.accent, 0.18)}, 0 8px 24px ${withAlpha(p.accent, 0.45)}`,
                transform: `scale(${badge})`,
              }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  fill="none"
                  stroke={p.onAccent}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <Panel
            palette={p}
            label={rightLabel}
            code={rightCode}
            language={language}
            fontSize={fontSize}
            start={RIGHT_DELAY}
            emphasis
          />
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
