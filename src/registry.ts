import type React from 'react';
import type { AnyZodObject } from 'zod';

import { TitleCard, titleCardDefaults, titleCardSchema } from './components/TitleCard';
import { KineticTitle, kineticTitleDefaults, kineticTitleSchema } from './components/KineticTitle';
import { SectionHeader, sectionHeaderDefaults, sectionHeaderSchema } from './components/SectionHeader';
import { EndCard, endCardDefaults, endCardSchema } from './components/EndCard';
import { LowerThird, lowerThirdDefaults, lowerThirdSchema } from './components/LowerThird';
import { CalloutBadge, calloutBadgeDefaults, calloutBadgeSchema } from './components/CalloutBadge';

import { CodeBlock, codeBlockDefaults, codeBlockSchema } from './components/CodeBlock';
import { CodeTyping, codeTypingDefaults, codeTypingSchema } from './components/CodeTyping';
import { CodeDiffReveal, codeDiffRevealDefaults, codeDiffRevealSchema } from './components/CodeDiffReveal';
import { CodeHighlightSteps, codeHighlightStepsDefaults, codeHighlightStepsSchema } from './components/CodeHighlightSteps';
import { TerminalSession, terminalSessionDefaults, terminalSessionSchema } from './components/TerminalSession';
import { FileTree, fileTreeDefaults, fileTreeSchema } from './components/FileTree';
import { CommitLog, commitLogDefaults, commitLogSchema } from './components/CommitLog';

import { WordCaptions, wordCaptionsDefaults, wordCaptionsSchema } from './components/WordCaptions';
import { KaraokeCaption, karaokeCaptionDefaults, karaokeCaptionSchema } from './components/KaraokeCaption';
import { SubtitleBar, subtitleBarDefaults, subtitleBarSchema } from './components/SubtitleBar';

import { BarChartRace, barChartRaceDefaults, barChartRaceSchema } from './components/BarChartRace';
import { BenchmarkBars, benchmarkBarsDefaults, benchmarkBarsSchema } from './components/BenchmarkBars';
import { LineChartReveal, lineChartRevealDefaults, lineChartRevealSchema } from './components/LineChartReveal';
import { StatCounter, statCounterDefaults, statCounterSchema } from './components/StatCounter';
import { ComparisonTable, comparisonTableDefaults, comparisonTableSchema } from './components/ComparisonTable';
import { Leaderboard, leaderboardDefaults, leaderboardSchema } from './components/Leaderboard';
import { ProgressRing, progressRingDefaults, progressRingSchema } from './components/ProgressRing';
import { Timeline, timelineDefaults, timelineSchema } from './components/Timeline';

import { SplitScreen, splitScreenDefaults, splitScreenSchema } from './components/SplitScreen';
import { SlideTransition, slideTransitionDefaults, slideTransitionSchema } from './components/SlideTransition';
import { WipeTransition, wipeTransitionDefaults, wipeTransitionSchema } from './components/WipeTransition';
import { ZoomFocus, zoomFocusDefaults, zoomFocusSchema } from './components/ZoomFocus';
import { SpotlightMask, spotlightMaskDefaults, spotlightMaskSchema } from './components/SpotlightMask';
import { GridShowcase, gridShowcaseDefaults, gridShowcaseSchema } from './components/GridShowcase';
import { DeviceFrame, deviceFrameDefaults, deviceFrameSchema } from './components/DeviceFrame';
import { BrowserFrame, browserFrameDefaults, browserFrameSchema } from './components/BrowserFrame';
import { LogoReveal, logoRevealDefaults, logoRevealSchema } from './components/LogoReveal';
import { QRCard, qrCardDefaults, qrCardSchema } from './components/QRCard';

export type GroupId = 'titles' | 'code' | 'captions' | 'data' | 'layout';

export const GROUPS: ReadonlyArray<{ id: GroupId; label: string }> = [
  { id: 'titles', label: 'Titles' },
  { id: 'code', label: 'Code' },
  { id: 'captions', label: 'Captions' },
  { id: 'data', label: 'Data' },
  { id: 'layout', label: 'Transitions & layout' },
];

export interface RegistryEntry {
  /** Composition id (kebab-case, unique). */
  id: string;
  /** Exported component name, e.g. "TitleCard". */
  name: string;
  title: string;
  group: GroupId;
  /** One-line description. */
  description: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  // The registry is heterogeneous: each entry has its own props type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  schema: AnyZodObject;
  defaultProps: Record<string, unknown>;
}

/**
 * Export prefix for a component's schema and defaults:
 * "TitleCard" -> "titleCard" (titleCardSchema), "QRCard" -> "qrCard".
 */
export function camelName(name: string): string {
  return name.replace(/^[A-Z]+(?=[A-Z][a-z])|^[A-Z]/, (s) => s.toLowerCase());
}

type EntryInput = Omit<RegistryEntry, 'fps' | 'width' | 'height'>;

const entry = (e: EntryInput): RegistryEntry => ({ fps: 30, width: 1280, height: 720, ...e });

/** Every component, with the composition settings used by Root.tsx and the gallery. */
export const registry: RegistryEntry[] = [
  // Titles
  entry({ id: 'title-card', name: 'TitleCard', title: 'Title card', group: 'titles', description: 'Opening title with eyebrow pill, springy headline and accent rule.', durationInFrames: 90, component: TitleCard, schema: titleCardSchema, defaultProps: titleCardDefaults }),
  entry({ id: 'kinetic-title', name: 'KineticTitle', title: 'Kinetic title', group: 'titles', description: 'Words spring in one by one; highlighted words turn accent and underline.', durationInFrames: 90, component: KineticTitle, schema: kineticTitleSchema, defaultProps: kineticTitleDefaults }),
  entry({ id: 'section-header', name: 'SectionHeader', title: 'Section header', group: 'titles', description: 'Chapter divider: outlined number fills, rule grows, title slides up.', durationInFrames: 75, component: SectionHeader, schema: sectionHeaderSchema, defaultProps: sectionHeaderDefaults }),
  entry({ id: 'end-card', name: 'EndCard', title: 'End card', group: 'titles', description: 'Closing call to action: install command types itself, then link pills appear.', durationInFrames: 120, component: EndCard, schema: endCardSchema, defaultProps: endCardDefaults }),
  entry({ id: 'lower-third', name: 'LowerThird', title: 'Lower third', group: 'titles', description: 'Name and role card that wipes in, holds, then wipes out.', durationInFrames: 150, component: LowerThird, schema: lowerThirdSchema, defaultProps: lowerThirdDefaults }),
  entry({ id: 'callout-badge', name: 'CalloutBadge', title: 'Callout badge', group: 'titles', description: 'Pulsing pointer dot with a connector and an icon badge that pops in.', durationInFrames: 90, component: CalloutBadge, schema: calloutBadgeSchema, defaultProps: calloutBadgeDefaults }),

  // Code
  entry({ id: 'code-block', name: 'CodeBlock', title: 'Code block', group: 'code', description: 'Syntax-highlighted editor window with staggered lines and highlighted ranges.', durationInFrames: 120, component: CodeBlock, schema: codeBlockSchema, defaultProps: codeBlockDefaults }),
  entry({ id: 'code-typing', name: 'CodeTyping', title: 'Code typing', group: 'code', description: 'Code types itself character by character, keeping syntax colours and a cursor.', durationInFrames: 210, component: CodeTyping, schema: codeTypingSchema, defaultProps: codeTypingDefaults }),
  entry({ id: 'code-diff-reveal', name: 'CodeDiffReveal', title: 'Code diff reveal', group: 'code', description: 'Unified diff plays out: removed lines collapse, added lines slide in.', durationInFrames: 180, component: CodeDiffReveal, schema: codeDiffRevealSchema, defaultProps: codeDiffRevealDefaults }),
  entry({ id: 'code-highlight-steps', name: 'CodeHighlightSteps', title: 'Code highlight steps', group: 'code', description: 'Walks through code in steps: a highlight band glides between line ranges with captions.', durationInFrames: 225, component: CodeHighlightSteps, schema: codeHighlightStepsSchema, defaultProps: codeHighlightStepsDefaults }),
  entry({ id: 'terminal-session', name: 'TerminalSession', title: 'Terminal session', group: 'code', description: 'Commands type after a prompt and their output streams in line by line.', durationInFrames: 240, component: TerminalSession, schema: terminalSessionSchema, defaultProps: terminalSessionDefaults }),
  entry({ id: 'file-tree', name: 'FileTree', title: 'File tree', group: 'code', description: 'Project tree built from flat paths, revealed row by row with highlights and notes.', durationInFrames: 120, component: FileTree, schema: fileTreeSchema, defaultProps: fileTreeDefaults }),
  entry({ id: 'commit-log', name: 'CommitLog', title: 'Commit log', group: 'code', description: 'Git history on a branch line: commits, hashes, authors and tags appear in order.', durationInFrames: 120, component: CommitLog, schema: commitLogSchema, defaultProps: commitLogDefaults }),

  // Captions
  entry({ id: 'word-captions', name: 'WordCaptions', title: 'Word captions', group: 'captions', description: 'Paged word-timed captions; the spoken word pops in an accent pill.', durationInFrames: 190, component: WordCaptions, schema: wordCaptionsSchema, defaultProps: wordCaptionsDefaults }),
  entry({ id: 'karaoke-caption', name: 'KaraokeCaption', title: 'Karaoke caption', group: 'captions', description: 'Single-line caption where each word fills with accent as it is spoken.', durationInFrames: 200, component: KaraokeCaption, schema: karaokeCaptionSchema, defaultProps: karaokeCaptionDefaults }),
  entry({ id: 'subtitle-bar', name: 'SubtitleBar', title: 'Subtitle bar', group: 'captions', description: 'Classic translucent subtitle bar with a speaker label and per-cue fades.', durationInFrames: 240, component: SubtitleBar, schema: subtitleBarSchema, defaultProps: subtitleBarDefaults }),

  // Data
  entry({ id: 'bar-chart-race', name: 'BarChartRace', title: 'Bar chart race', group: 'data', description: 'Ranked bars race across keyframes and glide past each other, keeping their colours.', durationInFrames: 330, component: BarChartRace, schema: barChartRaceSchema, defaultProps: barChartRaceDefaults }),
  entry({ id: 'benchmark-bars', name: 'BenchmarkBars', title: 'Benchmark bars', group: 'data', description: 'Horizontal benchmark bars with counting values and an "N× faster" pill.', durationInFrames: 150, component: BenchmarkBars, schema: benchmarkBarsSchema, defaultProps: benchmarkBarsDefaults }),
  entry({ id: 'line-chart-reveal', name: 'LineChartReveal', title: 'Line chart reveal', group: 'data', description: 'Multi-series line chart that draws itself, with end labels and a legend.', durationInFrames: 180, component: LineChartReveal, schema: lineChartRevealSchema, defaultProps: lineChartRevealDefaults }),
  entry({ id: 'stat-counter', name: 'StatCounter', title: 'Stat counter', group: 'data', description: 'Hero numbers that count up with prefixes, suffixes and labels.', durationInFrames: 120, component: StatCounter, schema: statCounterSchema, defaultProps: statCounterDefaults }),
  entry({ id: 'comparison-table', name: 'ComparisonTable', title: 'Comparison table', group: 'data', description: 'Feature matrix with drawn checkmarks and a highlighted recommended column.', durationInFrames: 150, component: ComparisonTable, schema: comparisonTableSchema, defaultProps: comparisonTableDefaults }),
  entry({ id: 'leaderboard', name: 'Leaderboard', title: 'Leaderboard', group: 'data', description: 'Ranked rows slide in with score bars and up/down rank changes.', durationInFrames: 150, component: Leaderboard, schema: leaderboardSchema, defaultProps: leaderboardDefaults }),
  entry({ id: 'progress-ring', name: 'ProgressRing', title: 'Progress ring', group: 'data', description: 'Circular progress rings fill to their values while percentages count up.', durationInFrames: 120, component: ProgressRing, schema: progressRingSchema, defaultProps: progressRingDefaults }),
  entry({ id: 'timeline', name: 'Timeline', title: 'Timeline', group: 'data', description: 'Horizontal timeline that draws itself; milestones pop in as it passes.', durationInFrames: 180, component: Timeline, schema: timelineSchema, defaultProps: timelineDefaults }),

  // Transitions & layout
  entry({ id: 'split-screen', name: 'SplitScreen', title: 'Split screen', group: 'layout', description: 'Before/after code panels side by side with a wiping divider.', durationInFrames: 120, component: SplitScreen, schema: splitScreenSchema, defaultProps: splitScreenDefaults }),
  entry({ id: 'slide-transition', name: 'SlideTransition', title: 'Slide transition', group: 'layout', description: 'Scenes push each other off screen in any direction; accepts children as scenes.', durationInFrames: 186, component: SlideTransition, schema: slideTransitionSchema, defaultProps: slideTransitionDefaults }),
  entry({ id: 'wipe-transition', name: 'WipeTransition', title: 'Wipe transition', group: 'layout', description: 'Linear, circular or diagonal wipe between two scenes or two children.', durationInFrames: 120, component: WipeTransition, schema: wipeTransitionSchema, defaultProps: wipeTransitionDefaults }),
  entry({ id: 'zoom-focus', name: 'ZoomFocus', title: 'Zoom focus', group: 'layout', description: 'Camera zooms into one line of code, dims the rest and adds a note.', durationInFrames: 150, component: ZoomFocus, schema: zoomFocusSchema, defaultProps: zoomFocusDefaults }),
  entry({ id: 'spotlight-mask', name: 'SpotlightMask', title: 'Spotlight mask', group: 'layout', description: 'Dimmed overlay with a spotlight that glides between labelled points.', durationInFrames: 210, component: SpotlightMask, schema: spotlightMaskSchema, defaultProps: spotlightMaskDefaults }),
  entry({ id: 'grid-showcase', name: 'GridShowcase', title: 'Grid showcase', group: 'layout', description: 'Feature cards with icons pop into a grid one after another.', durationInFrames: 120, component: GridShowcase, schema: gridShowcaseSchema, defaultProps: gridShowcaseDefaults }),
  entry({ id: 'device-frame', name: 'DeviceFrame', title: 'Device frame', group: 'layout', description: 'CSS-drawn phone, tablet or laptop that frames a demo screen or your children.', durationInFrames: 120, component: DeviceFrame, schema: deviceFrameSchema, defaultProps: deviceFrameDefaults }),
  entry({ id: 'browser-frame', name: 'BrowserFrame', title: 'Browser frame', group: 'layout', description: 'Browser window whose URL types itself, framing a page or your children.', durationInFrames: 150, component: BrowserFrame, schema: browserFrameSchema, defaultProps: browserFrameDefaults }),
  entry({ id: 'logo-reveal', name: 'LogoReveal', title: 'Logo reveal', group: 'layout', description: 'SVG mark draws its outline then fills; the wordmark staggers in.', durationInFrames: 120, component: LogoReveal, schema: logoRevealSchema, defaultProps: logoRevealDefaults }),
  entry({ id: 'qr-card', name: 'QRCard', title: 'QR card', group: 'layout', description: 'Scannable QR code (built-in encoder) on a card with title and caption.', durationInFrames: 120, component: QRCard, schema: qrCardSchema, defaultProps: qrCardDefaults }),
];
