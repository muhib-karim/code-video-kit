import React from 'react';
import { AbsoluteFill } from 'remotion';
import { fonts, radii, withAlpha, type Palette } from '../theme';
import { tokenize, type Language, type Token } from '../lib/tokenizer';

/**
 * Full-frame background: base colour, a soft accent glow and a faint grid.
 * Shared by components; not part of the public API.
 */
export const Backdrop: React.FC<{ palette: Palette; grid?: boolean; children?: React.ReactNode }> = ({
  palette,
  grid = true,
  children,
}) => {
  const glow = withAlpha(palette.accent, palette.mode === 'dark' ? 0.22 : 0.14);
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
        backgroundImage: `radial-gradient(ellipse 70% 60% at 50% 0%, ${glow} 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 100% 100%, ${palette.backgroundAlt} 0%, transparent 70%)`,
        color: palette.text,
        fontFamily: fonts.sans,
      }}
    >
      {grid ? (
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${palette.grid} 1px, transparent 1px), linear-gradient(90deg, ${palette.grid} 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 100%)',
          }}
        />
      ) : null}
      {children}
    </AbsoluteFill>
  );
};

/** Editor/terminal window with traffic-light dots and an optional title. */
export const WindowChrome: React.FC<{
  palette: Palette;
  title?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ palette, title, width = 1040, height, style, bodyStyle, children }) => (
  <div
    style={{
      width,
      height,
      borderRadius: radii.lg,
      background: palette.code.background,
      border: `1px solid ${palette.border}`,
      boxShadow:
        palette.mode === 'dark'
          ? '0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02)'
          : '0 30px 80px rgba(20,24,40,0.16)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
  >
    <div
      style={{
        height: 44,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 18px',
        background: palette.surfaceRaised,
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
        <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
      ))}
      {title ? (
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            marginRight: 52,
            fontFamily: fonts.mono,
            fontSize: 15,
            color: palette.textMuted,
          }}
        >
          {title}
        </div>
      ) : null}
    </div>
    <div style={{ flex: 1, position: 'relative', ...bodyStyle }}>{children}</div>
  </div>
);

/** Renders one line of tokens with theme colours. */
export const TokenLine: React.FC<{ tokens: Token[]; palette: Palette }> = ({ tokens, palette }) => (
  <>
    {tokens.map((t, i) => (
      <span
        key={i}
        style={{
          color: palette.code[t.type],
          fontStyle: t.type === 'comment' ? 'italic' : undefined,
        }}
      >
        {t.text}
      </span>
    ))}
  </>
);

export interface CodeLinesProps {
  code: string;
  language: Language;
  palette: Palette;
  fontSize?: number;
  showLineNumbers?: boolean;
  /** Per-line style hook (opacity, transform, background...). `index` is 0-based. */
  lineStyle?: (index: number) => React.CSSProperties | undefined;
  /** Highlighted 1-based line numbers. */
  highlighted?: readonly number[];
}

/** Syntax-coloured code with optional line numbers and per-line styles. */
export const CodeLines: React.FC<CodeLinesProps> = ({
  code,
  language,
  palette,
  fontSize = 24,
  showLineNumbers = true,
  lineStyle,
  highlighted,
}) => {
  const lines = React.useMemo(() => tokenize(code, language), [code, language]);
  const hl = new Set(highlighted ?? []);
  const lineHeight = Math.round(fontSize * 1.6);
  return (
    <div style={{ fontFamily: fonts.mono, fontSize, lineHeight: `${lineHeight}px`, whiteSpace: 'pre' }}>
      {lines.map((tokens, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            paddingRight: 24,
            background: hl.has(i + 1) ? palette.code.highlight : undefined,
            boxShadow: hl.has(i + 1) ? `inset 3px 0 0 ${palette.accent}` : undefined,
            ...lineStyle?.(i),
          }}
        >
          {showLineNumbers ? (
            <span
              style={{
                width: fontSize * 2.4,
                flexShrink: 0,
                textAlign: 'right',
                paddingRight: fontSize,
                color: palette.code.lineNumber,
                userSelect: 'none',
              }}
            >
              {i + 1}
            </span>
          ) : (
            <span style={{ width: fontSize, flexShrink: 0 }} />
          )}
          <span>
            <TokenLine tokens={tokens} palette={palette} />
            {tokens.length === 0 ? ' ' : null}
          </span>
        </div>
      ))}
    </div>
  );
};

/** Centered stack used by title-style components. */
export const Center: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', ...style }}>{children}</AbsoluteFill>
);
