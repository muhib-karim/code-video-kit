# Architecture

code-video-kit is a TypeScript library of Remotion components for code and data videos, plus a static gallery that shows every component rendered. This page describes how the pieces fit together; the [README](../README.md) covers install and usage.

## Components

| Part | Path | Role |
| --- | --- | --- |
| Components | `src/components/` | One file per component (34 today). Each exports the React component, a zod props schema and a defaults object. |
| Helpers | `src/lib/` | Pure, unit-tested logic used by the components: tokenizer (syntax highlighting), captions, bar race, charts, diff, file tree, QR, math and range helpers. |
| Shared UI | `src/internal/ui.tsx` | Small internal building blocks shared by components. |
| Theme | `src/theme.ts` | Design tokens (colours, fonts, spacing) the components read. |
| Registry | `src/registry.ts` | Lists every component with its schema, defaults, group and composition settings (size, fps, duration). |
| Remotion root | `src/Root.tsx`, `src/entry.ts` | Registers one `<Composition>` per registry entry, so Remotion Studio and the renderer see every component. |
| Public API | `src/index.ts` | What the npm package exports (components, schemas, defaults, registry). |
| Gallery | `gallery/` | Static HTML/CSS/JS page with no dependencies. It reads `registry.json`, the rendered media and `render-times.json`. |
| Scripts | `scripts/` | `emit-registry.mjs` and `render-all.mjs` (below). |
| Tests | `tests/` | vitest suites for the helpers and the registry/components. |

## Data flow

1. A component's props are validated by its zod schema; defaults make every component renderable with no input.
2. `src/registry.ts` collects all components; `src/Root.tsx` turns each entry into a Remotion composition.
3. `npm run build` (tsup) compiles `src/` to `dist/` (ESM + type declarations), which is what the package ships.
4. `scripts/emit-registry.mjs` imports `dist/index.js` and writes `gallery/registry.json` (names, groups, schemas and defaults for the gallery and for agents).
5. `scripts/render-all.mjs` bundles `src/entry.ts`, renders each composition to `gallery/media/<id>.mp4` (h264, CRF 28, half scale) plus a poster PNG, and records wall-clock render times in `results/render-times.json` and `.md`.
6. The gallery page loads `registry.json`, the media files and the render times.

## Build, test and deploy

- `.github/workflows/ci.yml` runs on every push and pull request: install, typecheck, test, build and `npm pack` (the tarball is uploaded as an artifact).
- `.github/workflows/gallery.yml` runs on pushes to `main`: install, typecheck, test, build, emit the registry, render every composition, copy the render times into `gallery/` and deploy the gallery to GitHub Pages.
- `.github/workflows/release.yml` runs on `v*` tags: install, typecheck, test, build, pack, and publish a GitHub Release with the tarball attached.

To release: bump `version` in `package.json`, add a [CHANGELOG](../CHANGELOG.md) entry, and push a tag `vX.Y.Z`.
