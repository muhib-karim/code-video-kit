import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { baseThemeDefaults, baseThemeSchema, fonts, radii, resolveTheme, type Palette } from '../theme';
import { Backdrop } from '../internal/ui';

export const slideTransitionSchema = z.object({
  ...baseThemeSchema,
  scenes: z
    .array(
      z.object({
        title: z.string().describe('Scene headline. Keep it under ~24 characters so it fits on one line.'),
        subtitle: z.string().optional().describe('Optional supporting line under the headline (under ~50 characters).'),
      }),
    )
    .min(1)
    .max(12)
    .describe(
      'Scenes shown one after another as full-frame title panels. Ignored when React children are passed (then each child is one scene).',
    ),
  direction: z
    .enum(['left', 'right', 'up', 'down'])
    .describe('Direction the content travels: "left" pushes the old scene out to the left while the next one enters from the right.'),
  framesPerScene: z
    .number()
    .int()
    .min(10)
    .max(900)
    .describe(
      'Frames each scene is on screen, including its transitions. Total length = (framesPerScene - transitionFrames) * (sceneCount - 1) + framesPerScene.',
    ),
  transitionFrames: z
    .number()
    .int()
    .min(1)
    .max(120)
    .describe('Frames two consecutive scenes overlap while one pushes the other out. Must be smaller than framesPerScene.'),
});

export type SlideTransitionProps = z.infer<typeof slideTransitionSchema> & { children?: React.ReactNode };

export const slideTransitionDefaults: SlideTransitionProps = {
  ...baseThemeDefaults,
  scenes: [
    { title: 'Write it in React', subtitle: 'Every frame is a function of time' },
    { title: 'Preview instantly', subtitle: 'Tweak props and watch the video update' },
    { title: 'Render anywhere', subtitle: 'Locally, in CI or on serverless' },
    { title: 'Ship the video', subtitle: 'MP4 or WebM from a single command' },
  ],
  direction: 'left',
  framesPerScene: 60,
  transitionFrames: 18,
};

type Direction = 'left' | 'right' | 'up' | 'down';

/** Side the incoming scene starts from, as a unit vector. */
const START_SIDE: Record<Direction, { x: number; y: number }> = {
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
};

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

const ScenePanel: React.FC<{
  palette: Palette;
  index: number;
  total: number;
  title: string;
  subtitle?: string;
  textShift: string;
}> = ({ palette, index, total, title, subtitle, textShift }) => {
  const tinted: Palette =
    index % 2 === 1 ? { ...palette, background: palette.backgroundAlt, backgroundAlt: palette.background } : palette;
  return (
    <Backdrop palette={tinted}>
      <AbsoluteFill style={{ justifyContent: 'center', padding: '0 120px' }}>
        <div style={{ transform: textShift }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 22,
              color: palette.accent,
              letterSpacing: 2,
              marginBottom: 26,
            }}
          >
            {pad2(index + 1)} / {pad2(total)}
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              letterSpacing: -2.5,
              lineHeight: 1.05,
              maxWidth: 1040,
              color: palette.text,
            }}
          >
            {title}
          </div>
          <div
            style={{
              width: 120,
              height: 6,
              borderRadius: 3,
              margin: '30px 0',
              background: `linear-gradient(90deg, ${palette.accent}, ${palette.series[2]})`,
            }}
          />
          {subtitle ? (
            <div style={{ fontSize: 34, lineHeight: 1.35, color: palette.textMuted, maxWidth: 940 }}>{subtitle}</div>
          ) : null}
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 120, bottom: 64, display: 'flex', gap: 10 }}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{
              width: i === index ? 36 : 10,
              height: 10,
              borderRadius: radii.pill,
              background: i === index ? palette.accent : palette.border,
            }}
          />
        ))}
      </div>
    </Backdrop>
  );
};

/**
 * Push transition between full-frame scenes. Each scene stays for
 * `framesPerScene`; consecutive scenes overlap for `transitionFrames` while the
 * new one pushes the old one out in `direction` with an eased (in-out cubic)
 * motion. Pass React children to use your own scenes (one child per scene).
 */
export const SlideTransition: React.FC<SlideTransitionProps> = ({
  theme,
  accent,
  scenes,
  direction,
  framesPerScene,
  transitionFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = resolveTheme(theme, accent);

  const custom = React.Children.toArray(children);
  const useCustom = custom.length > 0;
  const count = useCustom ? custom.length : scenes.length;

  const per = Math.max(2, Math.round(framesPerScene));
  const trans = Math.max(1, Math.min(Math.round(transitionFrames), per - 1));
  const stride = per - trans;
  const side = START_SIDE[direction] ?? START_SIDE.left;
  const ease = Easing.inOut(Easing.cubic);

  const move = (start: number): number =>
    interpolate(frame, [start, start + trans], [0, 1], {
      easing: ease,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  const layers: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * stride;
    const enter = i === 0 ? 1 : move(start);
    const exit = i === count - 1 ? 0 : move(start + stride);
    // 1 = waiting off-screen, 0 = centred, -1 = pushed out.
    const f = 1 - enter - exit;
    if (f >= 1 || f <= -1) continue;

    const transform = `translate(${f * side.x * width}px, ${f * side.y * height}px)`;
    const textShift = `translate(${f * side.x * 140}px, ${f * side.y * 80}px)`;
    const shade = f < 0 ? -f * 0.55 : 0;

    let content: React.ReactNode;
    if (useCustom) {
      content = custom[i];
    } else {
      const scene = scenes[i];
      content = (
        <ScenePanel
          palette={p}
          index={i}
          total={count}
          title={scene.title}
          subtitle={scene.subtitle}
          textShift={textShift}
        />
      );
    }

    layers.push(
      <AbsoluteFill key={i} style={{ transform, overflow: 'hidden', zIndex: i }}>
        {content}
        {shade > 0 ? <AbsoluteFill style={{ background: p.background, opacity: shade }} /> : null}
      </AbsoluteFill>,
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: p.background, overflow: 'hidden', fontFamily: fonts.sans, color: p.text }}>
      {layers}
    </AbsoluteFill>
  );
};
