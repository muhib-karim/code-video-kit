import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, radii, resolveTheme, withAlpha } from '../theme';
import { Backdrop, WindowChrome } from '../internal/ui';
import { clamp, easeInOutCubic, easeOutCubic, progress } from '../lib/math';

export const commitLogSchema = z.object({
  ...baseThemeSchema,
  branch: z.string().describe('Branch name shown in the header pill, e.g. "main".'),
  commits: z
    .array(
      z.object({
        hash: z.string().describe('Commit hash; only the first 7 characters are shown.'),
        message: z.string().describe('Commit subject line. Keep under ~40 characters to avoid truncation.'),
        author: z.string().describe('Author name or handle, shown muted with an initial avatar.'),
        tag: z.string().optional().describe('Optional tag/release label drawn as a pill, e.g. "v1.2.0".'),
      }),
    )
    .describe('Commits listed newest first (top = HEAD). They reveal top to bottom. ~6 fit.'),
  staggerFrames: z.number().int().min(1).describe('Frames between consecutive commits appearing.'),
});

export type CommitLogProps = z.infer<typeof commitLogSchema>;

export const commitLogDefaults: CommitLogProps = {
  ...baseThemeDefaults,
  branch: 'main',
  commits: [
    { hash: 'a1f9c3e2', message: 'feat: add CodeTyping component', author: 'muhib', tag: 'v1.2.0' },
    { hash: '7be0d41c', message: 'fix: clamp interpolate ranges', author: 'ana' },
    { hash: '3c52e9a0', message: 'perf: memoize tokenizer output', author: 'muhib' },
    { hash: 'e94d0b17', message: 'docs: gallery usage snippets', author: 'lee' },
    { hash: '0d2a7f68', message: 'feat: QR card with byte mode', author: 'ana', tag: 'v1.1.0' },
    { hash: '5f81c0b3', message: 'chore: initial commit', author: 'muhib' },
  ],
  staggerFrames: 10,
};

const ROW_H = 64;
const GRAPH_X = 30;
const FIRST = 16;

function avatarColor(name: string, series: readonly string[]): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return series.length > 0 ? series[h % series.length] : '#888888';
}

const BranchIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width={20} height={20} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <circle cx={6} cy={5} r={2.5} fill="none" stroke={color} strokeWidth={1.8} />
    <circle cx={6} cy={19} r={2.5} fill="none" stroke={color} strokeWidth={1.8} />
    <circle cx={18} cy={7} r={2.5} fill="none" stroke={color} strokeWidth={1.8} />
    <path d="M6 7.5v9M18 9.5c0 4.5-7 3.5-11.2 7.3" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

/**
 * A git log with a vertical graph: the branch line draws down while commit
 * dots pop in, each with short hash, message, author and optional tag. The
 * first commit is HEAD.
 */
export const CommitLog: React.FC<CommitLogProps> = ({ theme, accent, branch, commits, staggerFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = resolveTheme(theme, accent);
  const enter = spring({ frame, fps, config: { damping: 200 } });

  const stagger = Math.max(1, staggerFrames);
  const n = commits.length;
  const seg = clamp((frame - FIRST) / stagger, 0, Math.max(0, n - 1));
  const whole = Math.floor(seg);
  const lineLen = ROW_H * (whole + easeInOutCubic(seg - whole));
  const headerIn = easeOutCubic(progress(frame, 4, 14));

  return (
    <Backdrop palette={p}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <WindowChrome
          palette={p}
          title="git log --graph"
          width={1000}
          style={{ opacity: enter, transform: `translateY(${(1 - enter) * 30}px) scale(${0.96 + enter * 0.04})` }}
          bodyStyle={{ padding: '22px 32px 24px' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 14,
              opacity: headerIn,
              transform: `translateY(${(1 - headerIn) * 8}px)`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: radii.pill,
                background: p.accentSoft,
                border: `1px solid ${withAlpha(p.accent, 0.45)}`,
                fontFamily: fonts.mono,
                fontSize: 20,
                fontWeight: 600,
                color: p.text,
              }}
            >
              <BranchIcon color={p.accent} />
              {branch}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 18, color: p.textFaint }}>
              {n} {n === 1 ? 'commit' : 'commits'}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            {n > 1 ? (
              <div
                style={{
                  position: 'absolute',
                  left: GRAPH_X - 1.5,
                  top: ROW_H / 2,
                  width: 3,
                  height: lineLen,
                  borderRadius: 2,
                  background: `linear-gradient(180deg, ${p.accent}, ${withAlpha(p.accent, 0.35)})`,
                }}
              />
            ) : null}
            {commits.map((c, i) => {
              const start = FIRST + i * stagger;
              const pop = spring({ frame: frame - start, fps, config: { damping: 14, stiffness: 180 } });
              const rowIn = easeOutCubic(progress(frame, start + 2, 12));
              const isHead = i === 0;
              const initial = c.author.trim().charAt(0).toUpperCase() || '?';
              return (
                <div key={i} style={{ position: 'relative', height: ROW_H, display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: GRAPH_X * 2, height: ROW_H, flexShrink: 0, position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: GRAPH_X - 9,
                        top: ROW_H / 2 - 9,
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        boxSizing: 'border-box',
                        background: isHead ? p.accent : p.code.background,
                        border: `3px solid ${p.accent}`,
                        boxShadow: isHead ? `0 0 0 6px ${withAlpha(p.accent, 0.2)}, 0 0 24px ${withAlpha(p.accent, 0.6)}` : undefined,
                        transform: `scale(${pop})`,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      marginLeft: 12,
                      opacity: rowIn,
                      transform: `translateX(${(1 - rowIn) * 20}px)`,
                    }}
                  >
                    <span style={{ fontFamily: fonts.mono, fontSize: 21, color: p.accent, fontWeight: 600, flexShrink: 0 }}>
                      {c.hash.slice(0, 7)}
                    </span>
                    <span
                      style={{
                        fontSize: 24,
                        color: p.text,
                        fontWeight: isHead ? 600 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                      }}
                    >
                      {c.message}
                    </span>
                    {c.tag ? (
                      <span
                        style={{
                          flexShrink: 0,
                          padding: '3px 12px',
                          borderRadius: radii.pill,
                          border: `1px solid ${p.accent}`,
                          color: p.accent,
                          fontFamily: fonts.mono,
                          fontSize: 18,
                          fontWeight: 600,
                        }}
                      >
                        {c.tag}
                      </span>
                    ) : null}
                    <span style={{ flex: 1 }} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: avatarColor(c.author, p.series),
                          color: '#FFFFFF',
                          fontSize: 18,
                          fontWeight: 700,
                        }}
                      >
                        {initial}
                      </span>
                      <span style={{ fontSize: 20, color: p.textMuted }}>{c.author}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </WindowChrome>
      </AbsoluteFill>
    </Backdrop>
  );
};
