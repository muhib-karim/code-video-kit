# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-17

### Added

- 34 Remotion components in five groups:
  - Titles: `TitleCard`, `KineticTitle`, `SectionHeader`, `EndCard`, `LowerThird`, `CalloutBadge`.
  - Code: `CodeBlock`, `CodeTyping`, `CodeDiffReveal`, `CodeHighlightSteps`, `TerminalSession`, `FileTree`, `CommitLog`.
  - Captions: `WordCaptions`, `KaraokeCaption`, `SubtitleBar`.
  - Data: `BarChartRace`, `BenchmarkBars`, `LineChartReveal`, `StatCounter`, `ComparisonTable`, `Leaderboard`, `ProgressRing`, `Timeline`.
  - Transitions & layout: `SplitScreen`, `SlideTransition`, `WipeTransition`, `ZoomFocus`, `SpotlightMask`, `GridShowcase`, `DeviceFrame`, `BrowserFrame`, `LogoReveal`, `QRCard`.
- A zod schema and JSON-serialisable default props for every component.
- Dark and light themes with a configurable accent colour and system font stacks.
- Built-in tokenizer for TypeScript/JavaScript, Python and Bash.
- Pure helpers for caption timing, bar-race interpolation, chart paths, unified diffs, file trees and QR encoding.
- `registry` describing every component, and a Remotion root with one composition per entry.
- Render script that times every composition, plus a static gallery deployed to GitHub Pages.
- CI (typecheck, tests, build, pack), gallery and release workflows.
