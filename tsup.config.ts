import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  tsconfig: 'tsconfig.build.json',
  external: ['react', 'react/jsx-runtime', 'remotion', 'zod'],
});
