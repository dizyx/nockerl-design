#!/usr/bin/env bun
/**
 * lint-tokens.ts: the token / hardcode contract gate (harness gate 1).
 *
 * Enforces docs/demo-token-contract.md AUTOMATICALLY: components must consume
 * `var(--token)`s, not hardcoded values. Two severities:
 *
 *   HARD:    must always be 0 (these are already clean and must stay clean):
 *             raw font-weight, font-family literal.
 *   RATCHET: current debt is baselined; the build fails only if a count INCREASES
 *             (no new hardcoding) and the baseline ratchets DOWN as primitives are
 *             extracted. Covers: hex, rgb/rgba, raw px, LAYOUT-size px (min/max
 *             width|height), letter-spacing em, raw easing.
 *
 * Scans BOTH roots (mirrors registry.ts SCAN_DIRS): the published react package
 * (packages/react/src) + the docs-site demos (site/src/components), so the shipped
 * components' hardcoding is covered too, not only the demo chrome.
 *
 * SVG geometry (path `d`, `viewBox`) and `data:` image URIs are stripped before
 * analysis: that is drawing math / image payload, not design value.
 *
 * Usage:  bun run scripts/lint-tokens.ts            # check (CI gate)
 *         bun run scripts/lint-tokens.ts --update   # rewrite baseline after a real cleanup
 */
import { Glob } from 'bun';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SCAN_DIRS } from './registry.ts';

const ROOT = join(import.meta.dir, '..');
// Scan BOTH the published react package AND the site demos (mirrors registry.ts's
// SCAN_DIRS), so hardcoded values in the shipped components are covered going forward,
// not just the demo chrome.
const SCAN_ROOTS = SCAN_DIRS;
const BASELINE = join(import.meta.dir, '.token-lint-baseline.json');
const update = process.argv.includes('--update');

const stripNoise = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1') // line comments (not URLs)
    .replace(/data:[^"')]+/g, '') // data-URI image payloads
    .replace(/\sd="[^"]*"/g, '') // svg path data
    .replace(/viewBox="[^"]*"/g, ''); // svg viewBox

type Rule = { re: RegExp; hard: boolean; desc: string; scope?: (rel: string) => boolean };
const RULES: Record<string, Rule> = {
  rawFontWeight: { re: /font-weight:\s*\d{2,3}\b/g, hard: true, desc: 'raw font-weight → var(--font-weight-*)' },
  fontFamilyLiteral: { re: /font-family:\s*["'][^"']+["']/g, hard: true, desc: 'font-family literal → var(--font-family-*)' },
  hex: { re: /#[0-9a-fA-F]{3,8}\b/g, hard: false, desc: 'hardcoded hex → var(--color-*)' },
  rgba: { re: /\brgba?\(/g, hard: false, desc: 'raw rgb/rgba → color-mix on tokens' },
  rawPx: { re: /\b\d+(\.\d+)?px\b/g, hard: false, desc: 'raw px → var(--space-*)/--icon-*/--type-*' },
  layoutSize: { re: /(max-width|min-width|max-height|min-height)\s*:\s*\d+px\b/g, hard: false, desc: 'raw layout-size px (min/max width|height) → var(--size-*)' },
  trackingEm: { re: /letter-spacing:\s*-?\d*\.?\d+em/g, hard: false, desc: 'hardcoded letter-spacing → var(--tracking-*)' },
  cubicBezier: { re: /cubic-bezier\(/g, hard: false, desc: 'raw easing → var(--easing-*)' },
  // HARD (must be 0): a demo/primitive must never reach past the semantic layer into the core
  // brand ramp (e.g. --color-core-cyan-300 does not theme-adapt; light keeps the dark cyan).
  // Themed brand accent → --color-accent-* (add -hi for a brighten state); status → --color-status-*.
  // Sanctioned core exceptions: --color-core-categorical-* (data / chart / family hues, which have
  // no single semantic role) and the absolute --color-core-black / --color-core-white (scrims,
  // knockout ink). Everything else in the core ramp is banned from demos/primitives.
  coreRamp: { re: /var\(--color-core-(?!categorical|black|white|logo)[a-z0-9-]+\)/g, hard: true, desc: 'core-ramp token reached from a demo/primitive → use the SEMANTIC layer (--color-accent-*/--color-status-*/--color-on-*); only --color-core-categorical-*, --color-core-logo-* (surface-driven brand ink) + core black/white are sanctioned' },
  // HARD, PUBLISHED-COMPONENTS ONLY: a bare adjacent-sibling stacking margin (.x + .x { margin-top })
  // on a component a consumer can place in ANY layout LEAKS into a horizontal row / grid; the first
  // item then rides higher, which has now happened more than once. Wrap the selector in :where() so the rule
  // drops to ZERO specificity and a row/grid container neutralizes it with a plain class (space via
  // gap). Scoped to the react package: demo group/section stacks are author-controlled + always
  // vertical, so their bare `+` margins are fine. See docs/api-conventions.md (layout rhythm).
  stackingMargin: { re: /\+\s*\.[\w-]+\s*\{[^}]*margin-top/g, hard: true, scope: (rel) => rel.startsWith('packages/react'), desc: 'bare adjacent-sibling stacking margin on a published component (.x + .x { margin-top }) → wrap the selector in :where() so a horizontal-row/grid container can neutralize it (space via gap)' },
};

// HARD: a var(--space-N) that references a token the scale does NOT define resolves to
// NOTHING and the property silently collapses (gap -> 0, min-height -> auto). Eight such usages
// shipped (--space-7/--space-9, the scale skips 7 and 9) and produced the "section headers
// smashed against content" class. Validate every space reference against the DTCG source.
const SPACE_DEFINED = new Set(
  Object.keys((JSON.parse(readFileSync(join(ROOT, 'tokens/core/dimension.json'), 'utf8')) as { space: Record<string, unknown> }).space)
    .map((k) => 'space-' + k),
);
const undefinedSpaceHits: Array<{ file: string; token: string }> = [];

// Absolute file paths across every scan root, reported relative to the repo root.
const files: string[] = [];
for (const root of SCAN_ROOTS) {
  for (const rel of new Glob('**/*.{tsx,astro}').scanSync(root)) files.push(join(root, rel));
}
files.sort();
const counts: Record<string, number> = {};
const hardHits: Array<{ file: string; rule: string }> = [];

for (const abs of files) {
  const rel = relative(ROOT, abs);
  const src = stripNoise(readFileSync(abs, 'utf8'));
  for (const [name, rule] of Object.entries(RULES)) {
    if (rule.scope && !rule.scope(rel)) continue; // rule limited to a file subset (e.g. package-only)
    const n = (src.match(rule.re) || []).length;
    counts[name] = (counts[name] || 0) + n;
    if (rule.hard && n > 0) hardHits.push({ file: rel, rule: name });
  }
  for (const m of src.matchAll(/var\(--(space-[\w-]+)\)/g)) {
    if (!SPACE_DEFINED.has(m[1]!)) undefinedSpaceHits.push({ file: rel, token: '--' + m[1]! });
  }
}

if (update) {
  writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + '\n');
  console.log('✓ token-lint baseline updated:', JSON.stringify(counts));
  process.exit(0);
}

const baseline: Record<string, number> = existsSync(BASELINE)
  ? JSON.parse(readFileSync(BASELINE, 'utf8'))
  : {};

let failed = false;
console.log(`token-lint · ${files.length} component files\n`);
console.log('rule'.padEnd(20), 'count'.padStart(6), 'baseline'.padStart(9), 'severity'.padStart(9), '  status');
for (const [name, rule] of Object.entries(RULES)) {
  const c = counts[name] || 0;
  const base = baseline[name] ?? (rule.hard ? 0 : c);
  let status = 'ok';
  if (rule.hard && c > 0) { status = `FAIL (must be 0)`; failed = true; }
  else if (!rule.hard && c > base) { status = `FAIL (+${c - base} new)`; failed = true; }
  else if (!rule.hard && c < base) status = `improved (-${base - c})`;
  console.log(
    name.padEnd(20), String(c).padStart(6), String(base).padStart(9),
    (rule.hard ? 'HARD' : 'ratchet').padStart(9), '  ' + status,
  );
}

if (undefinedSpaceHits.length) {
  console.log('\nUNDEFINED space tokens (HARD: the property silently collapses):');
  for (const h of undefinedSpaceHits) console.log(`  ${h.file}: ${h.token} is not in the scale (tokens/core/dimension.json)`);
  failed = true;
}

if (hardHits.length) {
  console.log('\nHARD violations (fix these):');
  for (const h of hardHits) console.log(`  ${h.file}: ${h.rule}: ${RULES[h.rule]!.desc}`);
}

if (failed) {
  console.log('\n✗ token-lint failed. New hardcoding was introduced (or a HARD rule is non-zero).');
  console.log('  If a RATCHET count legitimately dropped, run with --update to lower the baseline.');
  process.exit(1);
}
console.log('\n✓ token-lint passed (no new hardcoding).');
