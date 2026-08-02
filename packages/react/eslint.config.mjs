// Flat ESLint config for @dizyx/nockerl-react (ESLint v9+). Mirrors the docs-site
// toolchain (eslint + @eslint/js + typescript-eslint, pinned to the same versions the
// repo already locks) and adds react-hooks, since this package IS a React component
// library. Run from this dir via the root `lint:react` script. Only src is linted;
// the generated dist output is ignored.
//
// Ruleset rationale:
//  - typescript-eslint `recommended` is the base (real correctness checks, no
//    type-aware/perf-heavy rules, keeping CI fast and matching the non-type-aware
//    posture the site config uses).
//  - no-unused-vars runs via @typescript-eslint (the base rule is off in recommended)
//    with a leading-underscore escape hatch, matching the codebase's intentional
//    "destructure-and-discard" convention (e.g. Switch pulls `label: _label` out of
//    `rest` so it can't leak onto the DOM node).
//  - react-hooks/rules-of-hooks = error (a violation is always a real bug);
//    exhaustive-deps = warn (advisory; the tree is currently clean).
//  - no-debugger = error, no-console limited to warn/error (the compose guard
//    legitimately console.warns on contract violations).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Unused-symbol detection: keep `_`-prefixed identifiers as intentional discards.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // React Hooks correctness.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // General hygiene.
      'no-debugger': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
);
