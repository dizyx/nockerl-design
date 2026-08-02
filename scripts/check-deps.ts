#!/usr/bin/env bun
/**
 * check-deps.ts: the component dependency-graph gate (harness gate 2).
 *
 * Builds the import graph among site/src/components and enforces the architecture
 * law (docs/component-architecture.md): a component may depend only on its own tier
 * or LOWER. Primitives (tier 1) may never import a composite (tier 3) or pattern
 * (tier 4); cycles are forbidden outright. This keeps the hierarchy from silently
 * rotting as primitives get extracted and demos start importing them.
 *
 * The TIER map (scripts/registry.ts) is the canonical, machine-checkable hierarchy
 * registry, shared with compose-graph.ts so the two gates never drift.
 *
 * Usage:  bun run scripts/check-deps.ts
 */
import { readFileSync } from 'node:fs';
import { TIER, TIER_NAME, nameOf, listComponentFiles } from './registry';

const files = listComponentFiles();
const known = new Set(files.map(nameOf));
const edges: Array<[string, string]> = [];
const adj: Record<string, string[]> = {};

for (const rel of files) {
  const from = nameOf(rel);
  const src = readFileSync(rel, 'utf8');
  const imports = [...src.matchAll(/import\s+[^;]*?from\s+'(\.\.?\/[^']+)'/g)].map((m) => m[1]!);
  for (const spec of imports) {
    const to = nameOf(spec);
    if (to !== from && known.has(to)) {
      edges.push([from, to]);
      (adj[from] ||= []).push(to);
    }
  }
}

// --- cycle detection (DFS) ---
const cycles: string[][] = [];
const state: Record<string, number> = {}; // 0=unseen 1=in-stack 2=done
const stack: string[] = [];
const dfs = (n: string) => {
  state[n] = 1; stack.push(n);
  for (const m of adj[n] || []) {
    if (state[m] === 1) cycles.push([...stack.slice(stack.indexOf(m)), m]);
    else if (!state[m]) dfs(m);
  }
  stack.pop(); state[n] = 2;
};
for (const n of Object.keys(adj)) if (!state[n]) dfs(n);

// --- downward-tier check ---
const tierViolations: string[] = [];
const untiered = new Set<string>();
for (const [from, to] of edges) {
  const tf = TIER[from]; const tt = TIER[to];
  if (tf === undefined) untiered.add(from);
  if (tt === undefined) untiered.add(to);
  if (tf !== undefined && tt !== undefined && tf < tt) {
    tierViolations.push(`${from} (${TIER_NAME[tf]}) imports ${to} (${TIER_NAME[tt]}): UPWARD dependency`);
  }
}

// --- report ---
console.log(`check-deps · ${files.length} component files · ${edges.length} import edges\n`);
const byTier: Record<number, string[]> = {};
for (const f of files) { const t = TIER[nameOf(f)] ?? 0; (byTier[t] ||= []).push(nameOf(f)); }
for (const t of [1, 2, 3, 4, 5, 0]) if (byTier[t]?.length) console.log(`  tier ${t} ${TIER_NAME[t] || 'UNREGISTERED'}: ${byTier[t]!.length}`);
if (edges.length) { console.log('\nedges:'); for (const [a, b] of edges) console.log(`  ${a} → ${b}`); }

let failed = false;
if (cycles.length) {
  failed = true;
  console.log('\n✗ CYCLES:');
  for (const c of cycles) console.log('  ' + c.join(' → '));
}
if (tierViolations.length) {
  failed = true;
  console.log('\n✗ TIER (upward) violations:');
  for (const v of tierViolations) console.log('  ' + v);
}
if (byTier[0]?.length) {
  console.log(`\n⚠ ${byTier[0]!.length} files have no tier in the registry (add them to TIER): ${byTier[0]!.join(', ')}`);
}

if (failed) { console.log('\n✗ check-deps failed.'); process.exit(1); }
console.log('\n✓ check-deps passed: no cycles, no upward dependencies.');
