# Skills used

Claude Code skills that were actually invoked while building this repository, and what each was used for.

| Skill | Used for |
|---|---|
| `dataviz` | Rules for the eight data components (`BarChartRace`, `BenchmarkBars`, `LineChartReveal`, `StatCounter`, `ComparisonTable`, `Leaderboard`, `ProgressRing`, `Timeline`). Adopted its validated colour-vision-safe categorical palette (fixed slot order, separate dark and light steps) as `palette.series` in `src/theme.ts`. Applied its mark rules: colour follows the entity, never its rank; one neutral fill plus the accent for single-measure bars; 4px rounded data-ends with ≥2px gaps; text in text colours rather than series colours; recessive grid; single y-axis; selective direct labels; status colours only with ▲/▼ glyphs; tabular numerals for counters. The skill's palette validator script could not be run in this session (the command needed approval), so the palette is the skill's documented, already-validated set, used unchanged. The skill's hover/tooltip layer does not apply to rendered video. |
| `frontend-ui-engineering` | Design and accessibility rules for the static gallery (`gallery/index.html`, `gallery.css`, `gallery.js`): a restrained neutral palette with the accent kept to focus and active states, consistent spacing and radius scales, semantic headings, `aria-pressed` filter chips, real `<button>` elements for playback, visible focus rings, a skip link, live-region copy feedback, filter and search state kept in the URL, skeleton/empty/error states, `prefers-reduced-motion` handling (no hover autoplay, no transitions) and a responsive grid. |

No other skills were invoked. In particular, no testing or code-review skill was run: the self-review in `REVIEW.md` was done by reading every file by hand, because nothing could be installed or executed on this machine.
