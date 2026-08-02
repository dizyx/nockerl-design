#!/usr/bin/env bun
/**
 * check-docs-imports.ts: the DOCS HONESTY gate.
 *
 * Every name a docs ```tsx snippet imports from '@dizyx/nockerl-react' MUST be a real
 * export of the package barrel (packages/react/src/index.ts). If a doc page writes
 * `import { Dialog } from '@dizyx/nockerl-react'` while the package does not export
 * `Dialog`, this FAILS the build, so a component page can never again claim the
 * published package exposes something it doesn't (the systemic honesty failure the
 * DX-QA audit found: 51/82 pages importing names that don't exist).
 *
 * A page documenting an aspirational / site-demo-only component must present it as a
 * spec + live demo WITHOUT a compiling '@dizyx/nockerl-react' import of the unshipped
 * name (drop the import, or import only the shipped primitives it composes).
 *
 * Usage:  bun run scripts/check-docs-imports.ts   (wired into `harness` + ci.yml)
 */
import { Glob } from 'bun';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const BARREL = join(ROOT, 'packages/react/src/index.ts');
const DOCS = join(ROOT, 'site/src/content/docs');

/** Parse the `{ A, B, type C, D as E }` list of a re-export / import into bare names. */
const namesOf = (braced: string): string[] =>
  braced
    .split(',')
    .map((raw) => raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]!.trim())
    .filter(Boolean);

// The authoritative shipped surface: every name the barrel re-exports.
const barrelSrc = readFileSync(BARREL, 'utf8');
const exported = new Set<string>();
for (const m of barrelSrc.matchAll(/export\s*(?:type\s+)?\{([^}]*)\}\s*from/g)) {
  for (const name of namesOf(m[1]!)) exported.add(name);
}

const files = [...new Glob('**/*.mdx').scanSync(DOCS)].sort();
const violations: Array<{ file: string; name: string }> = [];
for (const rel of files) {
  const src = readFileSync(join(DOCS, rel), 'utf8');
  for (const block of src.matchAll(/```tsx\b([\s\S]*?)```/g)) {
    const code = block[1]!;
    for (const imp of code.matchAll(
      /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]@dizyx\/nockerl-react['"]/g,
    )) {
      for (const name of namesOf(imp[1]!)) {
        if (!exported.has(name)) violations.push({ file: rel, name });
      }
    }
  }
}

// ── REVERSE gate: a doc must not DENY a component the package really EXPORTS. ──
// The DX-QA audit found reverse-liars: pages claiming "No Stepper ships yet" / "not
// exported" for names the barrel DOES export (Switch/Checkbox/Stepper/Menu shipped). We
// scan the doc PROSE + ```tsx (dropping the ```kotlin / ```swift native tabs, where "not
// shipped on that platform" is honest) for a denial of an EXPORTED component name. A
// sentence carrying a native qualifier (swift/kotlin/android/…) is exempt: that claim is
// about a native platform, not the published web package.
const componentExports = [...exported].filter((n) => /^[A-Z][a-z]/.test(n));
const exportedForm = (raw: string): string | null => {
  const cap = raw.charAt(0).toUpperCase() + raw.slice(1);
  return componentExports.includes(cap) ? cap : null;
};
const NATIVE_Q = /\b(swift|swiftui|kotlin|android|jetpack|compose|voice|macos|native|maven)\b/i;
// "No [formal|reusable|packaged|dedicated] X ships …" and "X … not (yet) shipped/exported".
const DENY_PATTERNS = [
  /\bno\s+(?:formal\s+|reusable\s+|packaged\s+|dedicated\s+)?(?:`?Nockerl)?([A-Za-z][a-z]+)`?\b[^.\n]{0,45}\bships?\b/gi,
  /(?:`?Nockerl)?\b([A-Z][a-z]+)`?\s[^.\n]{0,45}\bnot\s+(?:yet\s+)?(?:shipped|exported)\b/gi,
];
const reverse: Array<{ file: string; name: string; snippet: string }> = [];
for (const rel of files) {
  const text = readFileSync(join(DOCS, rel), 'utf8').replace(/```(?:kotlin|swift)\b[\s\S]*?```/gi, '');
  for (const re of DENY_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const at = m.index ?? 0;
      const window = text.slice(Math.max(0, at - 45), at + m[0].length + 45);
      if (NATIVE_Q.test(window)) continue; // a native-platform claim is honest
      const name = exportedForm(m[1]!);
      if (name) reverse.push({ file: rel, name, snippet: m[0].trim().replace(/\s+/g, ' ') });
    }
  }
}

console.log(`docs-imports · ${files.length} doc pages · barrel exports ${exported.size} names`);
let failed = false;
if (violations.length) {
  failed = true;
  console.log(`\n✗ ${violations.length} doc @dizyx/nockerl-react import(s) of names the package does NOT export:`);
  for (const v of violations) console.log(`  ${v.file}: ${v.name}`);
  console.log(
    '\nA ```tsx snippet may only import from @dizyx/nockerl-react what the barrel (packages/react/src/index.ts)\n' +
      'exports. Either export the name, or present the page as a spec/demo without a compiling package import.',
  );
}
if (reverse.length) {
  failed = true;
  console.log(`\n✗ ${reverse.length} doc claim(s) that a component the package DOES export is not shipped/exported:`);
  for (const v of reverse) console.log(`  ${v.file}: ${v.name}: "${v.snippet}"`);
  console.log(
    '\nThese names ARE exported by @dizyx/nockerl-react, so the web/package claim is false. Reword to be\n' +
      'honest (the web component ships; scope any "not shipped" to the NATIVE platform that lacks it), or\n' +
      'if the claim is genuinely native-only put it inside the ```kotlin / ```swift tab.',
  );
}
if (failed) process.exit(1);
console.log('✓ docs-imports passed: every documented import is real, and no exported component is denied.');
