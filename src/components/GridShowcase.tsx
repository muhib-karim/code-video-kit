import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, radii, resolveTheme, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';

const iconSchema = z
  .enum(['bolt', 'code', 'chart', 'shield', 'layers', 'sparkle'])
  .describe('Inline glyph shown on the card: "bolt", "code", "chart", "shield", "layers" or "sparkle".');

export const gridShowcaseSchema = z.object({
  ...baseThemeSchema,
  title: z.string().describe('Heading above the grid (under ~40 characters). Empty string hides it.'),
  columns: z.number().int().min(1).max(4).describe('Number of grid columns. 3 works best for 6 items, 2 for 4 items.'),
  items: z
    .array(
      z.object({
        title: z.string().describe('Card title (under ~22 characters).'),
        description: z.string().describe('One or two short lines under the title (under ~45 characters with 3 columns).'),
        icon: iconSchema,
      }),
    )
    .min(1)
    .max(12)
    .describe('Feature cards, laid out row by row. Up to 6 items fit comfortably at 1280x720.'),
  staggerFrames: z.number().int().min(0).max(60).describe('Delay in frames between consecutive cards popping in.'),
});

export type GridShowcaseProps = z.infer<typeof gridShowcaseSchema>;

export const gridShowcaseDefaults: GridShowcaseProps = {
  ...baseThemeDefaults,
  title: 'Everything you need to ship',
  columns: 3,
  items: [
    { title: 'Fast renders', description: 'Pure SVG and CSS, no assets to load.', icon: 'bolt' },
    { title: 'Code first', description: 'Syntax-coloured code that types itself.', icon: 'code' },
    { title: 'Data stories', description: 'Bar races, benchmarks and line charts.', icon: 'chart' },
    { title: 'Type safe', description: 'Zod schemas for every single prop.', icon: 'shield' },
    { title: 'Composable', description: 'Drop components into any Sequence.', icon: 'layers' },
    { title: 'On brand', description: 'Dark and light themes, any accent.', icon: 'sparkle' },
  ],
  staggerFrames: 6,
};

type IconName = z.infer<typeof iconSchema>;

const ICON_PATHS: Record<IconName, string[]> = {
  bolt: ['M13 2L4 14h7l-1 8 9-12h-7l1-8z'],
  code: ['M8 6l-6 6 6 6', 'M16 6l6 6-6 6', 'M14 4l-4 16'],
  chart: ['M3 3v18h18', 'M8 16v-5', 'M13 16V7', 'M18 16v-3'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z', 'M9 12l2 2 4-4'],
  layers: ['M12 2l10 5-10 5L2 7l10-5z', 'M2 12l10 5 10-5', 'M2 17l10 5 10-5'],
  sparkle: [
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
    'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z',
  ],
};

const Glyph: React.FC<{ icon: IconName; color: string; size: number }> = ({ icon, color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {(ICON_PATHS[icon] ?? ICON_PATHS.sparkle).map((d, i) => (
      <path key={i} d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </svg>
);

const FeatureCard: React.FC<{
  palette: Palette;
  title: string;
  description: string;
  icon: IconName;
  pop: number;
  compact: boolean;
}> = ({ palette: p, title, description, icon, pop, compact }) => (
  <div
    style={{
      opacity: Math.min(1, pop * 1.4),
      transform: `translateY(${(1 - pop) * 28}px) scale(${0.88 + 0.12 * pop})`,
      background: p.surface,
      border: `1px solid ${p.border}`,
      borderRadius: radii.lg,
      padding: compact ? '22px 24px' : '28px 30px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: p.mode === 'dark' ? '0 20px 50px rgba(0,0,0,0.35)' : '0 16px 40px rgba(20,24,40,0.08)',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 30,
        right: 30,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)`,
        opacity: pop,
      }}
    />
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        background: p.accentSoft,
        border: `1px solid ${p.accent}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: compact ? 16 : 22,
      }}
    >
      <Glyph icon={icon} color={p.accent} size={28} />
    </div>
    <div style={{ fontSize: compact ? 24 : 27, fontWeight: 700, letterSpacing: -0.5, marginBottom: 8, color: p.text }}>
      {title}
    </div>
    <div style={{ fontSize: compact ? 18 : 20, lineHeight: 1.4, color: p.textMuted }}>{description}</div>
  </div>
);

/**
 * Feature grid: a heading and cards (icon, title, description) that pop in
 * one after another with a springy stagger. Good for "what's inside" moments.
 */
export const GridShowcase: React.FC<GridShowcaseProps> = ({ theme, accent, title, columns, items, staggerFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const cols = Math.max(1, Math.min(4, Math.round(columns)));
  const rows = Math.ceil(items.length / cols);
  const compact = rows > 2 || cols > 3;
  const titleIn = spring({ frame, fps, config: { damping: 200 } });
  const cardsStart = title ? 10 : 0;

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ padding: '52px 96px', justifyContent: 'center' }}>
        {title ? (
          <div
            style={{
              opacity: titleIn,
              transform: `translateY(${(1 - titleIn) * 20}px)`,
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: -1.5,
              textAlign: 'center',
              marginBottom: 44,
            }}
          >
            {title}
          </div>
        ) : null}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: compact ? 18 : 24,
          }}
        >
          {items.map((item, i) => {
            const pop = spring({
              frame: frame - cardsStart - i * staggerFrames,
              fps,
              config: { damping: 14, mass: 0.6, stiffness: 120 },
            });
            return (
              <FeatureCard
                key={i}
                palette={p}
                title={item.title}
                description={item.description}
                icon={item.icon}
                pop={pop}
                compact={compact}
              />
            );
          })}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
