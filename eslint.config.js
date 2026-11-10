import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist/', 'out/', 'results/', '.remotion/', 'gallery/media/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    // Components call hooks on every frame; keep the two classic hook rules strict.
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  { files: ['scripts/**/*.mjs', '*.config.{js,ts}'], languageOptions: { globals: globals.node } },
  {
    // The gallery script is plain ES5 syntax served as-is, so `catch (e)` keeps its binding.
    files: ['gallery/**/*.js'],
    languageOptions: { globals: globals.browser },
    rules: { '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }] },
  },
);
