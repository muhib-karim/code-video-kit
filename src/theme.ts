import { z } from 'zod';

/** Font stacks. System fonts only: nothing is fetched at render time. */
export const fonts = {
  sans: 'Inter, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "DejaVu Sans", sans-serif',
  mono: '"JetBrains Mono", "SF Mono", "Fira Code", Menlo, Consolas, "Liberation Mono", "DejaVu Sans Mono", monospace',
} as const;

export type ThemeMode = 'dark' | 'light';

export interface Palette {
  mode: ThemeMode;
  /** Page background. */
  background: string;
  /** Secondary background used for the glow/gradient. */
  backgroundAlt: string;
  /** Raised surfaces: cards, windows, panels. */
  surface: string;
  /** Surface one step above `surface` (title bars, table headers). */
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  /** Accent at low alpha, for fills and glows. */
  accentSoft: string;
  /** Readable text colour on top of `accent`. */
  onAccent: string;
  positive: string;
  negative: string;
  warning: string;
  grid: string;
  /** Categorical series colours in fixed order (never cycled by rank). */
  series: readonly string[];
  code: CodePalette;
}

export interface CodePalette {
  background: string;
  plain: string;
  keyword: string;
  string: string;
  comment: string;
  number: string;
  function: string;
  type: string;
  operator: string;
  punctuation: string;
  lineNumber: string;
  highlight: string;
  added: string;
  removed: string;
}

/** Default accent: a violet that reads on both themes. */
export const DEFAULT_ACCENT = '#7C6CFF';

// Categorical slots: a validated, colour-vision-deficiency-safe order
// (adjacent pairs), stepped separately for each mode.
const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'] as const;
const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'] as const;

const dark: Omit<Palette, 'accent' | 'accentSoft' | 'onAccent'> = {
  mode: 'dark',
  background: '#0B0D12',
  backgroundAlt: '#151A26',
  surface: '#12151D',
  surfaceRaised: '#1A1E29',
  border: 'rgba(255,255,255,0.09)',
  text: '#F2F3F7',
  textMuted: '#A3A9B8',
  textFaint: '#666D7E',
  positive: '#3DD68C',
  negative: '#FF6B6B',
  warning: '#FAB219',
  grid: 'rgba(255,255,255,0.06)',
  series: SERIES_DARK,
  code: {
    background: '#0F1219',
    plain: '#D8DEE9',
    keyword: '#C792EA',
    string: '#A5E075',
    comment: '#5C6577',
    number: '#F78C6C',
    function: '#82AAFF',
    type: '#FFCB6B',
    operator: '#89DDFF',
    punctuation: '#8F98AB',
    lineNumber: '#3E4555',
    highlight: 'rgba(124,108,255,0.16)',
    added: 'rgba(61,214,140,0.16)',
    removed: 'rgba(255,107,107,0.14)',
  },
};

const light: Omit<Palette, 'accent' | 'accentSoft' | 'onAccent'> = {
  mode: 'light',
  background: '#F7F7F4',
  backgroundAlt: '#ECEEF5',
  surface: '#FFFFFF',
  surfaceRaised: '#F1F2F6',
  border: 'rgba(12,16,28,0.10)',
  text: '#0E1118',
  textMuted: '#4E5566',
  textFaint: '#8A90A0',
  positive: '#0B8F55',
  negative: '#D03B3B',
  warning: '#B97800',
  grid: 'rgba(12,16,28,0.07)',
  series: SERIES_LIGHT,
  code: {
    background: '#FBFBFD',
    plain: '#24292F',
    keyword: '#8839EF',
    string: '#2F7D32',
    comment: '#8C93A3',
    number: '#C2410C',
    function: '#1D63D6',
    type: '#A15C00',
    operator: '#0E7490',
    punctuation: '#6B7280',
    lineNumber: '#B8BDC9',
    highlight: 'rgba(124,108,255,0.12)',
    added: 'rgba(11,143,85,0.12)',
    removed: 'rgba(208,59,59,0.10)',
  },
};

export const palettes: Record<ThemeMode, Omit<Palette, 'accent' | 'accentSoft' | 'onAccent'>> = { dark, light };

/** Converts `#rgb` / `#rrggbb` to `rgba(r,g,b,a)`. Non-hex input is returned unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Picks black or white text for a given hex background (WCAG relative luminance). */
export function readableOn(color: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return '#FFFFFF';
  const n = parseInt(m[1], 16);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return lum > 0.4 ? '#0B0D12' : '#FFFFFF';
}

/** Resolves a full palette for a theme mode and accent colour. */
export function resolveTheme(mode: ThemeMode = 'dark', accent: string = DEFAULT_ACCENT): Palette {
  const base = palettes[mode] ?? palettes.dark;
  return {
    ...base,
    accent,
    accentSoft: withAlpha(accent, mode === 'dark' ? 0.18 : 0.12),
    onAccent: readableOn(accent),
  };
}

export const radii = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

/** Props shared by every component: theme mode and accent colour. */
export const baseThemeSchema = {
  theme: z.enum(['dark', 'light']).describe('Colour theme: "dark" or "light".'),
  accent: z.string().describe('Accent colour as a hex string, e.g. "#7C6CFF".'),
};

/** Default values for `baseThemeSchema`. */
export const baseThemeDefaults: { theme: ThemeMode; accent: string } = {
  theme: 'dark',
  accent: DEFAULT_ACCENT,
};

/** Languages understood by the built-in tokenizer. */
export const languageSchema = z.enum(['ts', 'js', 'py', 'bash']).describe('Source language for syntax colouring.');
