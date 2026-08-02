// Flat ESLint config for the Nockerl Design docs site (ESLint v9+).
// Uses only the plugins already in devDependencies: @eslint/js,
// @typescript-eslint/parser, astro-eslint-parser, eslint-plugin-astro.
// Generated output and the vendored token CSS are ignored.
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import astro from 'eslint-plugin-astro';

export default [
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**', 'src/styles/tokens.css'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // TS handles undef/unused via the compiler + astro check; keep ESLint
      // focused on real issues and let the parser own the syntax.
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
  ...astro.configs.recommended,
];
