# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- Tokenizer (bash): a backslash line continuation no longer puts the next word in command position, and a double-quoted string may span a backslash-newline.
- Tokenizer: an emoji or other astral character outside a string stays one token instead of two broken halves; identifiers accept non-ASCII letters; octal, BigInt-suffixed and Python complex literals are coloured as numbers.
- `CodeTyping`, `TerminalSession`, `EndCard`: an emoji no longer flashes as `�` for a frame while it is typed. `CommitLog`: the avatar initial is a whole character.
- `parseLineRanges`: expansion is capped at 100,000 lines, so a mistyped range such as `1-20000000` no longer stalls or crashes a render. `CodeBlock` parses its highlight range once instead of on every frame.
- `parseUnifiedDiff`: in a diff without hunk headers, a removed line starting with `-- ` or an added line starting with `++ ` is kept; git metadata between `diff --git` and the first hunk (`new file mode`, renames, `Binary files ...`) is skipped; an unmarked line beginning with `index ` is kept.
- `KineticTitle`: `highlight` compares letters of any script, so `"über"` no longer also matches "Ber".
- `CodeHighlightSteps`: a step whose `lines` match nothing shows its caption with no band and no dimming, instead of a band on line 1 over a fully dimmed block.
- README: the "Props for agents" snippet now passes a strict typecheck.

### Changed

- Development tooling only; no component API changes.
- `package-lock.json` is committed and CI installs with `npm ci`.
- ESLint (flat config) with `npm run lint`; CI gates on lint, typecheck, tests, build and a production dependency audit, and scans for secrets with gitleaks.
- Remotion 4.0.290 → 4.0.542 and tsup 8.3.5 → 8.5.1 for security fixes. Workflows run on Node 22 with current action versions.
- Tests: every component is rendered at several frames and with empty lists; QR symbols for versions 1–10 at every error-correction level are scanned back with jsQR.

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
