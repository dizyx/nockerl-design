#!/usr/bin/env bun
/**
 * check-file-size.ts: the file-size budget gate.
 *
 * Enforces the code-style budget (~/code-style.md): NO source file may exceed 500
 * lines. A file over budget is a signal to abstract: split a demo into sub-parts,
 * lift a helper into a primitive, etc. This gate makes that budget machine-checkable
 * so it can never silently rot as demos grow.
 *
 * Scope: the source we own here:
 *   • packages/react/src/**\/*.{ts,tsx}   (the published component library)
 *   • site/src/**\/*.{ts,tsx,astro}       (the docs site + its demos)
 *   • scripts/**\/*.ts                     (this build/verify tooling)
 * node_modules, dist, build, and *.test.ts (colocated unit tests) are skipped.
 *
 * RATCHET: the allowlist:
 *   Eight demo files currently exceed 500 lines. Rewriting them all is out of scope
 *   for this gate, so each is grandfathered at its CURRENT line count (its "cap").
 *   The gate then enforces a one-way ratchet: an allowlisted file may only SHRINK,
 *   never grow past its recorded cap. Any edit that pushes it higher FAILS; the only
 *   way the number moves is down (and once a file drops to <=500 it should leave the
 *   list entirely). This bounds the debt and makes it monotonically decreasing.
 *   TODO: refactor each allowlisted demo below 500 and delete its entry.
 *
 * Usage:  bun run scripts/check-file-size.ts   (alias: bun run check:size)
 * Exit 1 on any violation (a non-allowlisted file over budget, or an allowlisted file
 * that has grown past its cap), 0 when the whole tree is within budget.
 */
import { Glob } from 'bun';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** The hard budget: no source file may exceed this many lines. */
const BUDGET = 500;

/** Repo root (this file lives in scripts/). */
const ROOT = join(import.meta.dir, '..');

/** Scan roots + their glob patterns (relative to each root). */
const SCANS: Array<{ dir: string; pattern: string }> = [
  { dir: 'packages/react/src', pattern: '**/*.{ts,tsx}' },
  { dir: 'site/src', pattern: '**/*.{ts,tsx,astro}' },
  { dir: 'scripts', pattern: '**/*.ts' },
];

/** Directory segments never worth scanning (defense-in-depth; the globs already scope tight). */
const SKIP_DIRS = ['node_modules', 'dist', 'build', '.astro'];

/**
 * Grandfathered over-budget files → their recorded line cap (a RATCHET: these may only
 * shrink). Keys are repo-root-relative POSIX paths. When a file here drops to <=500,
 * delete its entry; it is then covered by the normal BUDGET rule.
 * TODO: refactor each of these demos below the 500-line budget and remove it.
 */
const ALLOWLIST: Record<string, number> = {
  'site/src/components/demos/DiffViewerDemo.tsx': 590,
  'site/src/components/demos/ToolCallCardDemo.tsx': 555,
  'site/src/components/demos/OtpInputDemo.tsx': 502,
};

/** Line count matching `wc -l` (number of newline characters). */
function countLines(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10 /* \n */) n++;
  return n;
}

type Row = {
  file: string;
  lines: number;
  limit: number; // the effective ceiling (cap for allowlisted, BUDGET otherwise)
  kind: 'normal' | 'allowlist';
  status: 'ok' | 'over-budget' | 'grew-past-cap';
};

// ── Collect every in-scope file exactly once ────────────────────────────────────────
const seen = new Set<string>();
const rows: Row[] = [];

for (const { dir, pattern } of SCANS) {
  const root = join(ROOT, dir);
  for (const rel of new Glob(pattern).scanSync(root)) {
    const abs = join(root, rel);
    const repoRel = relative(ROOT, abs).split('\\').join('/'); // POSIX for stable keys
    if (seen.has(repoRel)) continue;
    seen.add(repoRel);
    if (SKIP_DIRS.some((d) => repoRel.split('/').includes(d))) continue;
    if (repoRel.endsWith('.test.ts') || repoRel.endsWith('.test.tsx')) continue;

    const lines = countLines(readFileSync(abs, 'utf8'));
    const cap = ALLOWLIST[repoRel];
    if (cap !== undefined) {
      rows.push({
        file: repoRel,
        lines,
        limit: cap,
        kind: 'allowlist',
        status: lines > cap ? 'grew-past-cap' : 'ok',
      });
    } else {
      rows.push({
        file: repoRel,
        lines,
        limit: BUDGET,
        kind: 'normal',
        status: lines > BUDGET ? 'over-budget' : 'ok',
      });
    }
  }
}

// An allowlisted file that has DROPPED to <=budget should be graduated off the list.
const graduated = rows.filter((r) => r.kind === 'allowlist' && r.lines <= BUDGET);
const violations = rows.filter((r) => r.status !== 'ok');

// ── Report ──────────────────────────────────────────────────────────────────────────
const overCount = rows.filter((r) => r.kind === 'normal' && r.lines > BUDGET).length;
console.log(
  `check-file-size · ${rows.length} source files scanned · budget ${BUDGET} lines · ` +
    `${Object.keys(ALLOWLIST).length} grandfathered (ratchet)\n`,
);

// The grandfathered ratchet table (always shown; it is the debt ledger).
const pad = (s: string, w: number) => s.padEnd(w);
const num = (n: number, w: number) => String(n).padStart(w);
console.log('  grandfathered (allowlist): may only shrink:');
console.log(`    ${pad('file', 48)} ${'lines'.padStart(5)} ${'cap'.padStart(5)}  status`);
for (const r of rows.filter((x) => x.kind === 'allowlist').sort((a, b) => b.lines - a.lines)) {
  const mark = r.status === 'ok' ? (r.lines < r.limit ? '↓ shrank' : '= at cap') : '✗ GREW';
  console.log(`    ${pad(r.file.replace('site/src/components/demos/', '…/'), 48)} ${num(r.lines, 5)} ${num(r.limit, 5)}  ${mark}`);
}

if (overCount > 0) {
  console.log('\n  ✗ non-allowlisted files OVER the 500-line budget:');
  for (const r of violations.filter((x) => x.kind === 'normal')) {
    console.log(`    ${pad(r.file, 56)} ${num(r.lines, 5)}  (limit ${r.limit})`);
  }
}

if (graduated.length > 0) {
  console.log('\n  ⚠ allowlisted files now within budget: remove them from ALLOWLIST:');
  for (const r of graduated) console.log(`    ${r.file} (${r.lines} <= ${BUDGET})`);
}

// ── Verdict ───────────────────────────────────────────────────────────────────────
if (violations.length > 0) {
  console.log(`\n✗ check-file-size failed: ${violations.length} file(s) over their ceiling.`);
  process.exit(1);
}
console.log(
  `\n✓ check-file-size passed: every non-allowlisted file is <= ${BUDGET} lines, ` +
    `and no grandfathered file has grown past its cap.`,
);
