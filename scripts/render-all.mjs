#!/usr/bin/env node
// Renders every composition registered in src/Root.tsx to
//   gallery/media/<id>.mp4  (h264, crf 28, scale 0.5)
//   gallery/media/<id>.png  (poster still at 60% of the duration)
// and records wall-clock render times in results/render-times.{json,md}.
//
// Usage: node scripts/render-all.mjs [id ...]   (no ids = render everything)
import { bundle } from '@remotion/bundler';
import { ensureBrowser, getCompositions, renderMedia, renderStill } from '@remotion/renderer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA_DIR = path.join(ROOT, 'gallery', 'media');
const RESULTS_DIR = path.join(ROOT, 'results');
const ENTRY = path.join(ROOT, 'src', 'entry.ts');

const CODEC = 'h264';
const CRF = 28;
const SCALE = 0.5;
// Remotion's per-render concurrency (parallel browser tabs). Compositions are
// rendered one after another so their timings don't contend with each other.
const CONCURRENCY = 2;

const onlyIds = new Set(process.argv.slice(2));

const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
const cpus = os.cpus();
const runner = {
  os: `${os.type()} ${os.release()} (${os.platform()}/${os.arch()})`,
  cpu: cpus[0]?.model?.trim() ?? 'unknown',
  cores: cpus.length,
  memory_gb: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
  node: process.version,
  remotion: pkg.devDependencies?.remotion ?? 'unknown',
  ci: process.env.GITHUB_ACTIONS === 'true' ? `GitHub Actions (${process.env.RUNNER_OS ?? '?'} ${process.env.RUNNER_ARCH ?? ''})`.trim() : 'local',
};

await mkdir(MEDIA_DIR, { recursive: true });
await mkdir(RESULTS_DIR, { recursive: true });

console.log(`[render-all] runner: ${runner.cpu} x${runner.cores}, ${runner.os}`);
await ensureBrowser();

const bundleStart = performance.now();
const serveUrl = await bundle({ entryPoint: ENTRY });
const bundleMs = performance.now() - bundleStart;
console.log(`[render-all] bundled in ${Math.round(bundleMs)} ms`);

const all = await getCompositions(serveUrl, { inputProps: {} });
const compositions = onlyIds.size ? all.filter((c) => onlyIds.has(c.id)) : all;
console.log(`[render-all] rendering ${compositions.length} of ${all.length} compositions`);

const results = [];
const failures = [];

for (const composition of compositions) {
  const { id, durationInFrames } = composition;
  const video = path.join(MEDIA_DIR, `${id}.mp4`);
  const poster = path.join(MEDIA_DIR, `${id}.png`);
  try {
    const t0 = performance.now();
    await renderMedia({
      composition,
      serveUrl,
      codec: CODEC,
      crf: CRF,
      scale: SCALE,
      concurrency: CONCURRENCY,
      outputLocation: video,
      inputProps: composition.props,
    });
    const renderMs = performance.now() - t0;

    await renderStill({
      composition,
      serveUrl,
      output: poster,
      frame: Math.min(durationInFrames - 1, Math.floor(durationInFrames * 0.6)),
      scale: SCALE,
      imageFormat: 'png',
      inputProps: composition.props,
    });

    const row = {
      id,
      frames: durationInFrames,
      render_ms: Math.round(renderMs),
      ms_per_frame: Math.round((renderMs / durationInFrames) * 100) / 100,
    };
    results.push(row);
    console.log(`[render-all] ${id}: ${row.frames} frames in ${row.render_ms} ms (${row.ms_per_frame} ms/frame)`);
  } catch (err) {
    failures.push({ id, error: String(err?.message ?? err) });
    console.error(`[render-all] FAILED ${id}:`, err);
  }
}

results.sort((a, b) => a.id.localeCompare(b.id));
const totalMs = results.reduce((s, r) => s + r.render_ms, 0);
const totalFrames = results.reduce((s, r) => s + r.frames, 0);

const report = {
  generated_at: new Date().toISOString(),
  settings: { codec: CODEC, crf: CRF, scale: SCALE, concurrency: CONCURRENCY, width: 1280 * SCALE, height: 720 * SCALE },
  runner,
  bundle_ms: Math.round(bundleMs),
  totals: {
    compositions: results.length,
    frames: totalFrames,
    render_ms: totalMs,
    ms_per_frame: totalFrames ? Math.round((totalMs / totalFrames) * 100) / 100 : 0,
  },
  results: results.map((r) => ({ ...r, runner: { os: runner.os, cpu: runner.cpu } })),
  failures,
};
await writeFile(path.join(RESULTS_DIR, 'render-times.json'), JSON.stringify(report, null, 2) + '\n');

const md = [
  '## Render times',
  '',
  `Runner: ${runner.ci} · ${runner.cpu} · ${runner.cores} cores · ${runner.memory_gb} GB · ${runner.os} · Node ${runner.node} · Remotion ${runner.remotion}`,
  '',
  `Settings: ${CODEC}, crf ${CRF}, scale ${SCALE} (${1280 * SCALE}x${720 * SCALE}), concurrency ${CONCURRENCY}, compositions rendered sequentially. Times are wall-clock \`renderMedia\` calls (excluding bundling, ${Math.round(bundleMs)} ms once).`,
  '',
  '| Component | Frames | Render (ms) | ms / frame |',
  '|---|---:|---:|---:|',
  ...results.map((r) => `| \`${r.id}\` | ${r.frames} | ${r.render_ms} | ${r.ms_per_frame} |`),
  `| **Total** | **${totalFrames}** | **${totalMs}** | **${report.totals.ms_per_frame}** |`,
  '',
  failures.length ? `Failed: ${failures.map((f) => `\`${f.id}\``).join(', ')}` : '',
  `Generated ${report.generated_at}.`,
  '',
].join('\n');
await writeFile(path.join(RESULTS_DIR, 'render-times.md'), md);

console.log(`[render-all] wrote results/render-times.json and results/render-times.md`);
if (failures.length) {
  console.error(`[render-all] ${failures.length} composition(s) failed`);
  process.exit(1);
}
