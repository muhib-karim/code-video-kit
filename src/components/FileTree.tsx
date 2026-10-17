import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, resolveTheme, withAlpha, type Palette } from '../theme';
import { Backdrop, WindowChrome } from '../internal/ui';
import { buildTree } from '../lib/fileTree';
import { easeOutCubic, progress } from '../lib/math';

export const fileTreeSchema = z.object({
  ...baseThemeSchema,
  rootName: z.string().describe('Name of the root folder shown on the first row, e.g. the repo name.'),
  paths: z
    .array(
      z.object({
        path: z
          .string()
          .describe('Slash-separated path relative to the root, e.g. "src/lib/math.ts". A trailing "/" marks an empty folder.'),
        highlight: z.boolean().optional().describe('Draw this row with an accent background after the tree has built.'),
        note: z.string().optional().describe('Short muted note shown right-aligned on the row, e.g. "new" or "entry point".'),
      }),
    )
    .describe('Files/folders to show. Parent folders are created automatically; rows sort folders first, then A-Z. ~12 rows fit.'),
  staggerFrames: z.number().int().min(1).describe('Frames between consecutive rows appearing.'),
});

export type FileTreeProps = z.infer<typeof fileTreeSchema>;

export const fileTreeDefaults: FileTreeProps = {
  ...baseThemeDefaults,
  rootName: 'code-video-kit',
  paths: [
    { path: 'src/components/CodeTyping.tsx', highlight: true, note: 'new' },
    { path: 'src/components/FileTree.tsx' },
    { path: 'src/lib/tokenizer.ts', note: 'pure, tested' },
    { path: 'src/lib/fileTree.ts' },
    { path: 'src/index.ts', note: 'public API' },
    { path: 'src/theme.ts', highlight: true, note: 'design tokens' },
    { path: 'package.json' },
    { path: 'README.md' },
  ],
  staggerFrames: 4,
};

const ROW_H = 38;
const INDENT = 24;
const PAD_X = 16;
const FIRST_ROW = 10;

function fileColor(name: string, p: Palette): string {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return p.series[0] ?? p.accent;
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return p.series[3] ?? p.warning;
    case 'json':
      return p.warning;
    case 'py':
      return p.series[2] ?? p.positive;
    case 'css':
    case 'html':
      return p.series[4] ?? p.accent;
    case 'sh':
      return p.positive;
    case 'md':
      return p.textMuted;
    default:
      return p.textFaint;
  }
}

const FolderIcon: React.FC<{ color: string; fill: string }> = ({ color, fill }) => (
  <svg width={20} height={20} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path
      d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.38a1.5 1.5 0 0 1 1.06.44L11.5 7h8A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"
      fill={fill}
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  </svg>
);

const FileIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width={20} height={20} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path
      d="M6.5 3h7.5l4.5 4.5v12a1.5 1.5 0 0 1-1.5 1.5h-10.5a1.5 1.5 0 0 1-1.5-1.5v-15a1.5 1.5 0 0 1 1.5-1.5z"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
    <path d="M14 3v4.5h4.5" fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

const Chevron: React.FC<{ color: string }> = ({ color }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path d="M6 9l6 6 6-6" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface DisplayRow {
  name: string;
  depth: number;
  isDir: boolean;
  highlight: boolean;
  note?: string;
  isRoot: boolean;
}

/**
 * Project explorer that builds row by row: folders and files with SVG glyphs
 * and indent guides, then highlighted rows light up in the accent colour and
 * notes fade in. Use it to show "where things live" in a repo.
 */
export const FileTree: React.FC<FileTreeProps> = ({ theme, accent, rootName, paths, staggerFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const enter = spring({ frame, fps, config: { damping: 200 } });

  const rows = React.useMemo<DisplayRow[]>(() => {
    const tree = buildTree(paths);
    const out: DisplayRow[] = [{ name: rootName, depth: 0, isDir: true, highlight: false, isRoot: true }];
    for (const r of tree) {
      out.push({ name: r.name, depth: r.depth + 1, isDir: r.isDir, highlight: r.highlight, note: r.note, isRoot: false });
    }
    return out;
  }, [paths, rootName]);

  const stagger = Math.max(1, staggerFrames);
  const highlightStart = FIRST_ROW + rows.length * stagger + 8;
  let hlIndex = 0;

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <WindowChrome
          palette={p}
          title="Explorer"
          width={760}
          style={{ opacity: enter, transform: `translateY(${(1 - enter) * 30}px) scale(${0.96 + enter * 0.04})` }}
          bodyStyle={{ padding: '16px 12px' }}
        >
          <div style={{ fontFamily: fonts.mono, fontSize: 21 }}>
            {rows.map((row, i) => {
              const appear = easeOutCubic(progress(frame, FIRST_ROW + i * stagger, 10));
              let hl = 0;
              if (row.highlight) {
                hl = easeOutCubic(progress(frame, highlightStart + hlIndex * 6, 12));
                hlIndex += 1;
              }
              const noteIn = easeOutCubic(progress(frame, highlightStart + 4, 12));
              const guides: number[] = [];
              for (let d = 0; d < row.depth; d++) guides.push(PAD_X + d * INDENT + 8);
              const nameColor = row.isDir || row.highlight ? p.text : p.textMuted;
              return (
                <div
                  key={i}
                  style={{
                    position: 'relative',
                    height: ROW_H,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    paddingLeft: PAD_X + row.depth * INDENT,
                    paddingRight: 16,
                    opacity: appear,
                    transform: `translateX(${(1 - appear) * -16}px)`,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 8,
                      background: p.accentSoft,
                      boxShadow: `inset 3px 0 0 ${p.accent}`,
                      opacity: hl,
                    }}
                  />
                  {guides.map((x) => (
                    <div
                      key={x}
                      style={{ position: 'absolute', left: x, top: 0, bottom: 0, width: 1, background: p.border }}
                    />
                  ))}
                  {row.isDir ? <Chevron color={p.textFaint} /> : <span style={{ width: 16, flexShrink: 0 }} />}
                  {row.isDir ? (
                    <FolderIcon color={p.accent} fill={withAlpha(p.accent, row.isRoot ? 0.35 : 0.18)} />
                  ) : (
                    <FileIcon color={fileColor(row.name, p)} />
                  )}
                  <span
                    style={{
                      position: 'relative',
                      marginLeft: 4,
                      color: nameColor,
                      fontWeight: row.isRoot ? 700 : row.highlight && hl > 0.5 ? 600 : 400,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.name}
                  </span>
                  <span style={{ flex: 1 }} />
                  {row.note ? (
                    <span
                      style={{
                        position: 'relative',
                        fontFamily: fonts.sans,
                        fontSize: 18,
                        color: row.highlight ? p.text : p.textFaint,
                        opacity: noteIn,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.note}
                    </span>
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
