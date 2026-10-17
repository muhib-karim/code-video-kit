# code-video-kit — PLAN

A library of 34 code-first Remotion components for short technical videos
(launch videos, benchmark explainers, coding tutorials). Every component is a
plain React component driven by `useCurrentFrame()`, ships a zod schema and
JSON-serialisable default props, and draws everything with SVG/CSS (no images,
no network, no font fetches).

## 0. Constraints that shape the design

- Nothing is installed or run locally. CI (GitHub Actions) installs, typechecks,
  tests, builds, renders and deploys. Code must therefore be written to be
  correct on first CI run: conservative TypeScript, exact pinned versions, no
  clever type gymnastics around `<Composition>`.
- Pinned toolchain: `remotion`, `@remotion/bundler`, `@remotion/renderer`,
  `@remotion/cli` all `4.0.290`; `react`/`react-dom` `18.3.1`; `zod` `3.22.3`
  (the version Remotion 4 requires for schemas); `typescript` `5.6.3`;
  `vitest` `2.1.8`; `tsup` `8.3.5`.
- Pure logic lives in `src/lib/*.ts` (no React, no Remotion imports) so vitest
  can test it in a plain Node environment.

## 1. Conventions (every component file follows these)

File `src/components/<Name>.tsx` exports exactly:

```ts
/** JSDoc: one-paragraph description + usage hint. */
export const <name>Schema = z.object({ ...baseThemeSchema, ...own props with .describe() });
export type <Name>Props = z.infer<typeof <name>Schema>;
export const <name>Defaults: <Name>Props = { ... };   // must parse with the schema
export const <Name>: React.FC<<Name>Props> = (props) => { ... };
```

- `baseThemeSchema` (from `src/theme.ts`) = `{ theme: z.enum(['dark','light']), accent: z.string() }`.
  Every component accepts `theme` and `accent`; colours come from `resolveTheme(theme, accent)`.
- Every prop has `.describe('...')` so agents (and Remotion Studio) can read intent.
- Times inside props are **frames** unless the prop name ends in `Sec`
  (captions use seconds because transcripts do).
- Components fill the frame with `<AbsoluteFill>` and read size from
  `useVideoConfig()`; layout is designed for 1280x720 but uses relative units
  where it matters.
- Frame-based wrappers (`SlideTransition`, `WipeTransition`, `DeviceFrame`,
  `BrowserFrame`, `SpotlightMask`) also accept optional `children` which replace
  the built-in demo content. `children` is not part of the schema.
- Remotion APIs used: `AbsoluteFill`, `Sequence`, `useCurrentFrame`,
  `useVideoConfig`, `interpolate`, `spring`, `Easing`. Nothing else.

## 2. Components (34) and their props

Shared on all: `theme: 'dark'|'light'`, `accent: string`.

### Titles (6)
| Component | Props |
|---|---|
| `TitleCard` | `eyebrow`, `title`, `subtitle`, `align: 'center'|'left'` |
| `KineticTitle` | `text`, `highlight: string[]` (words drawn in accent), `staggerFrames`, `fontSize` |
| `SectionHeader` | `index` (e.g. "02"), `title`, `kicker` |
| `EndCard` | `title`, `command` (copyable install line), `links: string[]`, `tagline` |
| `LowerThird` | `name`, `role`, `side: 'left'|'right'`, `holdFrames` |
| `CalloutBadge` | `label`, `detail`, `icon: 'spark'|'bolt'|'check'|'star'`, `x`, `y` (0–100 %) |

### Code (7)
| Component | Props |
|---|---|
| `CodeBlock` | `code`, `language: 'ts'|'js'|'py'|'bash'`, `filename`, `showLineNumbers`, `highlightLines` ("2-4,7"), `fontSize` |
| `CodeTyping` | `code`, `language`, `filename`, `charsPerFrame`, `startFrame`, `showCursor`, `fontSize` |
| `CodeDiffReveal` | `diff` (unified diff text: lines prefixed `+`, `-`, ` `), `language`, `filename`, `framesPerLine`, `fontSize` |
| `CodeHighlightSteps` | `code`, `language`, `filename`, `steps: {lines, label, durationInFrames}[]`, `fontSize` |
| `TerminalSession` | `title`, `prompt`, `commands: {command, output: string[]}[]`, `charsPerFrame`, `pauseFrames` |
| `FileTree` | `rootName`, `paths: {path, highlight?, note?}[]`, `staggerFrames` |
| `CommitLog` | `branch`, `commits: {hash, message, author, tag?}[]`, `staggerFrames` |

### Captions (3)
| Component | Props |
|---|---|
| `WordCaptions` | `words: {text, startSec, endSec}[]`, `maxWordsPerPage`, `fontSize`, `position: 'bottom'|'center'` |
| `KaraokeCaption` | `words: {text, startSec, endSec}[]`, `fontSize`, `position` |
| `SubtitleBar` | `cues: {text, startSec, endSec}[]`, `fontSize`, `speaker` |

### Data (8)
| Component | Props |
|---|---|
| `BarChartRace` | `title`, `keyframeLabels: string[]`, `series: {label, color?, values: number[]}[]`, `framesPerKeyframe`, `topN`, `valueSuffix` |
| `BenchmarkBars` | `title`, `subtitle`, `unit`, `items: {label, value, highlight?}[]`, `lowerIsBetter`, `showMultiplier`, `footnote` |
| `LineChartReveal` | `title`, `xLabels: string[]`, `series: {label, color?, points: number[]}[]`, `yUnit`, `revealFrames` |
| `StatCounter` | `stats: {label, value, prefix?, suffix?, decimals?}[]`, `countFrames` |
| `ComparisonTable` | `title`, `columns: string[]`, `rows: {feature, values: (string|boolean)[]}[]`, `highlightColumn` |
| `Leaderboard` | `title`, `unit`, `entries: {name, score, delta?}[]`, `staggerFrames` |
| `ProgressRing` | `title`, `rings: {label, value (0–100), color?}[]`, `fillFrames` |
| `Timeline` | `title`, `events: {date, title, description?}[]`, `staggerFrames` |

### Transitions & layout (10)
| Component | Props |
|---|---|
| `SplitScreen` | `leftLabel`, `rightLabel`, `leftCode`, `rightCode`, `language`, `fontSize` |
| `SlideTransition` | `scenes: {title, subtitle?}[]`, `direction: 'left'|'right'|'up'|'down'`, `framesPerScene`, `transitionFrames` (+ optional `children`) |
| `WipeTransition` | `fromTitle`, `toTitle`, `shape: 'linear'|'circle'|'diagonal'`, `wipeStart`, `wipeFrames` (+ optional 2 `children`) |
| `ZoomFocus` | `code`, `language`, `filename`, `focusLine`, `zoom`, `zoomStart`, `zoomFrames`, `note` |
| `SpotlightMask` | `spots: {x, y, radius, label, at}[]` (% of frame, `at` = frame), `dim` (+ optional `children`) |
| `GridShowcase` | `title`, `columns`, `items: {title, description, icon}[]`, `staggerFrames` |
| `DeviceFrame` | `device: 'phone'|'laptop'|'tablet'`, `screenTitle`, `screenLines: string[]` (+ optional `children`) |
| `BrowserFrame` | `url`, `tabTitle`, `headline`, `body`, `typeUrl` (+ optional `children`) |
| `LogoReveal` | `name`, `mark: 'hex'|'circle'|'brackets'`, `tagline` |
| `QRCard` | `value` (encoded text/URL), `title`, `caption`, `errorCorrection: 'L'|'M'|'Q'|'H'` — real, scannable QR (byte mode, versions 1–10) |

## 3. File layout

```
src/
  theme.ts                 tokens: dark/light palettes, accent, font stacks, radii, baseThemeSchema, resolveTheme()
  internal/Backdrop.tsx    shared background (grid + glow), CodeLines renderer, Panel/Window chrome
  lib/
    math.ts                clamp, lerp, easeOutCubic, progress, formatNumber
    tokenizer.ts           tokenize(code, lang) -> Token[][] for ts/js/py/bash
    ranges.ts              parseLineRanges("1-3,7") -> number[]
    diff.ts                parseUnifiedDiff(text) -> DiffLine[]
    captions.ts            activeWordIndex, wordProgress, paginateWords, activeCue, evenWordTimings
    barRace.ts             valuesAt, rankAt, racePositions (smooth rank interpolation)
    chart.ts               niceMax, buildLinePath, speedup
    fileTree.ts            buildTree(paths) -> flattened rows with depth
    qr.ts                  encodeQR(text, ecl) -> boolean[][]
  components/<Name>.tsx    34 files
  registry.ts              id, title, group, description, durationInFrames, fps 30, 1280x720, schema, defaults, component
  Root.tsx                 one <Composition> per registry entry
  entry.ts                 registerRoot(Root) — Remotion bundle entry (not part of the npm build)
  index.ts                 public exports (components, schemas, defaults, theme, lib, registry)
tests/                     vitest: registry, schemas, tokenizer, captions, barRace, ranges/diff, chart, fileTree, qr
scripts/
  render-all.mjs           bundle + render every composition, time it, write results/
  emit-registry.mjs        dist/index.js registry -> gallery/registry.json
gallery/
  index.html, gallery.css, gallery.js   static, dependency-free gallery
.github/workflows/ ci.yml, gallery.yml, release.yml
```

## 4. CI plan

- **ci.yml** (push + PR, Node 20, ubuntu-latest): checkout → setup-node with
  `cache: npm`-style caching of `~/.npm` via `actions/cache` keyed on
  `package.json` (no lockfile can be committed from here) →
  `npm install --no-audit --no-fund` → `npm run typecheck` (`tsc --noEmit`) →
  `npm test` (`vitest run`) → `npm run build` (tsup, ESM + d.ts into `dist/`) →
  `npm pack` → upload `code-video-kit-*.tgz` artifact.
- **gallery.yml** (push to main + workflow_dispatch): install →
  `npx remotion browser ensure` → `npm run build` → `node scripts/emit-registry.mjs`
  → `node scripts/render-all.mjs` → copy `results/render-times.json` into
  `gallery/` → `actions/upload-pages-artifact` (path `gallery/`) →
  `actions/deploy-pages`; `results/render-times.*` uploaded as an artifact and
  appended to the job summary.
- **release.yml** (tag `v*`): install → typecheck → test → build → `npm pack`
  → `softprops/action-gh-release` with the tgz attached, so
  `npm i https://github.com/muhib-karim/code-video-kit/releases/download/vX.Y.Z/code-video-kit-X.Y.Z.tgz`
  works. A guard step fails the release if the tag does not match `package.json` version.

## 5. Gallery plan

- `gallery/registry.json` (generated): `[{id, title, group, description, durationInFrames, fps, width, height, usage, defaultProps}]`.
- `gallery/index.html` loads `gallery.css` + `gallery.js` (no framework, no CDN).
- Header with pitch + install command (copy button); group filter chips
  (All, Titles, Code, Captions, Data, Transitions & layout) as a
  `role="toolbar"` of `aria-pressed` buttons; responsive card grid.
- Card: poster `<img alt="Poster frame of <title>">`, `<video muted loop
  playsinline preload="none">` swapped in on hover/focus/click; duration chip;
  measured ms/frame when `render-times.json` is present; usage snippet in a
  `<pre>` with a copy button (Clipboard API, with `aria-live` feedback).
- Keyboard: cards are focusable, Enter/Space toggles playback; visible focus
  rings. `prefers-reduced-motion`: no autoplay on hover, play only on explicit
  click; CSS transitions disabled.
- Graceful states: missing registry → explanatory empty state; missing media →
  card shows title + description without poster.

## 6. Measurement plan

- `scripts/render-all.mjs` bundles `src/entry.ts` once, lists compositions with
  `getCompositions`, then renders them **sequentially** (so timings don't
  contend with each other) with `renderMedia({codec: 'h264', crf: 28, scale: 0.5,
  concurrency: 2})` and a poster with `renderStill` (frame at 60 % of duration,
  scale 0.5).
- Each `renderMedia` call is wrapped in `performance.now()`; we record
  `{id, frames, render_ms, ms_per_frame, concurrency, scale, runner: {os, cpu, cores, node}}`
  where `cpu = os.cpus()[0].model`.
- Output: `results/render-times.json` and `results/render-times.md` (Markdown
  table sorted by id + totals + runner line). Both uploaded as a workflow
  artifact; the Markdown is written to `$GITHUB_STEP_SUMMARY`.
- The README never contains invented numbers: it carries a placeholder until
  someone pastes the generated table from a real run.

## 7. Tests

- registry: ≥ 30 entries, unique ids, ids match Remotion's id regex, fps 30,
  1280x720, positive durations, every group known.
- every `entry.schema.parse(entry.defaultProps)` succeeds; every component also
  exported from `src/index.ts`.
- tokenizer: keywords/strings/comments/numbers per language, round-trip
  (concatenated token text === input).
- captions: active word index at boundaries, progress clamping, pagination,
  cue lookup, even timings.
- bar race: interpolation between keyframes, clamping at ends, rank ordering,
  smooth positions between ranks.
- ranges/diff/chart/fileTree/qr: small focused unit tests.
