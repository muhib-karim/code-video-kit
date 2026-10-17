import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, radii, resolveTheme } from '../theme';
import { Backdrop } from '../internal/ui';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ROW_STAGGER = 6;

export const comparisonTableSchema = z.object({
  ...baseThemeSchema,
  title: z.string().describe('Headline above the table, e.g. "How it compares". Empty string hides it.'),
  columns: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Header of each compared option, left to right (the feature column is added automatically). Keep names short.'),
  rows: z
    .array(
      z.object({
        feature: z.string().describe('Feature name shown in the first column.'),
        values: z
          .array(z.union([z.string(), z.boolean()]))
          .describe('One cell per column, in column order: true draws a check, false a muted dash, a string is shown as text.'),
      }),
    )
    .min(1)
    .max(8)
    .describe('Table rows, top to bottom. They stagger in one after another.'),
  highlightColumn: z
    .number()
    .int()
    .min(-1)
    .describe('0-based index into columns to mark as recommended (accent-tinted column + "Recommended" badge). -1 for none.'),
});

export type ComparisonTableProps = z.infer<typeof comparisonTableSchema>;

export const comparisonTableDefaults: ComparisonTableProps = {
  ...baseThemeDefaults,
  title: 'How it compares',
  columns: ['code-video-kit', 'Screen capture', 'Keyframe editor'],
  rows: [
    { feature: 'Version-controlled source', values: [true, false, false] },
    { feature: 'Pixel-perfect re-renders', values: [true, false, true] },
    { feature: 'Theme and accent props', values: [true, false, false] },
    { feature: 'Syntax highlighting', values: [true, 'Manual', 'Plugin'] },
    { feature: 'Renders in CI', values: [true, false, false] },
    { feature: 'Learning curve', values: ['Low', 'Low', 'High'] },
  ],
  highlightColumn: 0,
};

const Check: React.FC<{ color: string; progress: number }> = ({ color, progress }) => {
  const len = 24;
  return (
    <svg width={30} height={30} viewBox="0 0 28 28">
      <circle cx={14} cy={14} r={13} fill={color} fillOpacity={0.16 * Math.min(1, progress * 2)} />
      <path
        d="M7.5 14.5 L12 19 L20.5 9.5"
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${len} ${len}`}
        strokeDashoffset={len * (1 - progress)}
        opacity={progress > 0 ? 1 : 0}
      />
    </svg>
  );
};

const Dash: React.FC<{ color: string }> = ({ color }) => (
  <svg width={30} height={30} viewBox="0 0 28 28">
    <line x1={8} y1={14} x2={20} y2={14} stroke={color} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

/**
 * Feature comparison table: a header of options, rows that stagger in, SVG
 * checks / muted dashes for booleans and an accent-tinted "Recommended"
 * column. Great for "us vs. them" slides.
 */
export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  theme,
  accent,
  title,
  columns,
  rows,
  highlightColumn,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const nCols = Math.max(1, columns.length);
  const nRows = Math.max(1, rows.length);
  const tableW = Math.min(1120, width - 160);
  const tableLeft = (width - tableW) / 2;
  const featureW = Math.round(tableW * 0.34);
  const colW = (tableW - featureW) / nCols;
  const tableTop = title ? 180 : 110;
  const headerH = 64;
  const rowH = Math.min(62, Math.max(36, (height - 56 - tableTop - headerH) / nRows));
  const tableH = headerH + nRows * rowH;
  const hasHighlight = highlightColumn >= 0 && highlightColumn < columns.length;

  const headerIn = spring({ frame, fps, config: { damping: 200 } });
  const hlIn = spring({ frame: frame - 8, fps, config: { damping: 200 } });

  return (
    <Backdrop palette={p}>
      <AbsoluteFill>
        {title ? (
          <div
            style={{
              position: 'absolute',
              left: tableLeft,
              top: 52,
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: -1,
              color: p.text,
              opacity: headerIn,
              transform: `translateY(${(1 - headerIn) * 16}px)`,
            }}
          >
            {title}
          </div>
        ) : null}

        {hasHighlight ? (
          <>
            <div
              style={{
                position: 'absolute',
                left: tableLeft + featureW + highlightColumn * colW,
                top: tableTop,
                width: colW,
                height: tableH,
                background: p.accentSoft,
                borderTop: `3px solid ${p.accent}`,
                borderRadius: `${radii.sm}px ${radii.sm}px 0 0`,
                opacity: hlIn,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: tableLeft + featureW + highlightColumn * colW,
                top: tableTop - 40,
                width: colW,
                display: 'flex',
                justifyContent: 'center',
                opacity: hlIn,
                transform: `translateY(${(1 - hlIn) * 10}px)`,
              }}
            >
              <div
                style={{
                  padding: '4px 12px',
                  borderRadius: radii.pill,
                  background: p.accent,
                  color: p.onAccent,
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  whiteSpace: 'nowrap',
                }}
              >
                Recommended
              </div>
            </div>
          </>
        ) : null}

        {/* Header row */}
        <div
          style={{
            position: 'absolute',
            left: tableLeft,
            top: tableTop,
            width: tableW,
            height: headerH,
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${p.border}`,
            opacity: headerIn,
          }}
        >
          <div
            style={{
              width: featureW,
              flexShrink: 0,
              paddingLeft: 20,
              boxSizing: 'border-box',
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: p.textFaint,
            }}
          >
            Feature
          </div>
          {columns.map((c, ci) => (
            <div
              key={ci}
              style={{
                width: colW,
                flexShrink: 0,
                textAlign: 'center',
                fontSize: 22,
                fontWeight: 700,
                color: p.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '0 8px',
                boxSizing: 'border-box',
              }}
            >
              {c}
            </div>
          ))}
        </div>

        {rows.map((row, ri) => {
          const start = 14 + ri * ROW_STAGGER;
          const o = interpolate(frame, [start, start + 12], [0, 1], CLAMP);
          const checkP = interpolate(frame, [start + 6, start + 20], [0, 1], CLAMP);
          return (
            <div
              key={ri}
              style={{
                position: 'absolute',
                left: tableLeft,
                top: tableTop + headerH + ri * rowH,
                width: tableW,
                height: rowH,
                display: 'flex',
                alignItems: 'center',
                borderBottom: ri < rows.length - 1 ? `1px solid ${p.border}` : undefined,
                opacity: o,
                transform: `translateY(${(1 - o) * 14}px)`,
              }}
            >
              <div
                style={{
                  width: featureW,
                  flexShrink: 0,
                  paddingLeft: 20,
                  paddingRight: 12,
                  boxSizing: 'border-box',
                  fontSize: 22,
                  fontWeight: 500,
                  color: p.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {row.feature}
              </div>
              {columns.map((_, ci) => {
                const v = row.values[ci];
                const isHl = hasHighlight && ci === highlightColumn;
                let cell: React.ReactNode = null;
                if (v === true) {
                  cell = <Check color={isHl ? p.accent : p.positive} progress={checkP} />;
                } else if (v === false) {
                  cell = <Dash color={p.textFaint} />;
                } else if (typeof v === 'string') {
                  cell = (
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: isHl ? 600 : 400,
                        color: isHl ? p.text : p.textMuted,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {v}
                    </span>
                  );
                }
                return (
                  <div
                    key={ci}
                    style={{
                      width: colW,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {cell}
                  </div>
                );
              })}
            </div>
          );
        })}
      </AbsoluteFill>
    </Backdrop>
  );
};
