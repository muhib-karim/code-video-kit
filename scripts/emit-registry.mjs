#!/usr/bin/env node
// Emits gallery/registry.json from the built library (dist/index.js).
// Run `npm run build` first.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = pathToFileURL(path.join(ROOT, 'dist', 'index.js')).href;

let lib;
try {
  lib = await import(dist);
} catch (err) {
  console.error('[emit-registry] could not import dist/index.js - run `npm run build` first.');
  throw err;
}

const { registry, GROUPS, camelName } = lib;

const usageFor = (entry) => {
  const camel = camelName(entry.name);
  return [
    `import { Composition } from 'remotion';`,
    `import { ${entry.name}, ${camel}Schema, ${camel}Defaults } from 'code-video-kit';`,
    ``,
    `<Composition`,
    `  id="${entry.id}"`,
    `  component={${entry.name}}`,
    `  schema={${camel}Schema}`,
    `  defaultProps={{ ...${camel}Defaults, theme: 'dark' }}`,
    `  durationInFrames={${entry.durationInFrames}}`,
    `  fps={${entry.fps}} width={${entry.width}} height={${entry.height}}`,
    `/>`,
  ].join('\n');
};

const out = {
  generated_at: new Date().toISOString(),
  groups: GROUPS,
  components: registry.map((entry) => ({
    id: entry.id,
    name: entry.name,
    title: entry.title,
    group: entry.group,
    description: entry.description,
    durationInFrames: entry.durationInFrames,
    fps: entry.fps,
    width: entry.width,
    height: entry.height,
    usage: usageFor(entry),
    defaultProps: entry.defaultProps,
  })),
};

const target = path.join(ROOT, 'gallery', 'registry.json');
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, JSON.stringify(out, null, 2) + '\n');
console.log(`[emit-registry] wrote ${out.components.length} components to gallery/registry.json`);
