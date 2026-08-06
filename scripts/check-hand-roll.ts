#!/usr/bin/env bun
/**
 * check-hand-roll.ts: the HAND-ROLL / DIVERGENCE gate.
 *
 * Makes it STRUCTURALLY IMPOSSIBLE to re-implement a packaged component instead of composing it,
 * or to keep two divergent copies of one component. It extends the composition harness beyond the
 * raw-HTML-facsimile census in compose-graph.ts, which only catches BARE facsimiles
 * (<button>/<input>/<select>/... or a role= reimplementation), to catch RICH re-implementations
 * that a facsimile scan misses: a hand-rolled <canvas>/<svg> facet mesh, a re-typed motion loop, etc.
 *
 * MECHANISM: each packaged component registers the DISTINCTIVE implementation markers (internal
 * builder / hash function names) that must exist in exactly ONE place, its canonical file. If a
 * marker appears in any OTHER source file, that file is re-implementing the component (or is a
 * divergent copy of it) → the gate FAILS and names the file + the component to compose instead.
 *
 * TRIGGER CASE: FacetedBackgroundDemo and AppShellDemo each hand-rolled a facet mesh
 * (buildFacetField / buildMesh / jitter01) instead of composing NockerlFacetedBackground: two
 * divergent implementations of one signature surface (standalone frozen vs app-shell animated).
 * Both are gone now; this gate keeps them gone and catches the next one at CI time, not review time.
 *
 * REGISTER a newly-promoted component by adding an entry to MARKERS below. The gate also self-checks
 * that every registered marker still exists in its declared home, so the registry cannot silently rot
 * (rename the primitive's builder and this gate tells you to update the registry).
 *
 * Batched into `bun run harness` (the existing gate CI job): budget-aware, no new CI matrix.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');

interface MarkerEntry {
  /** the component that consumers must COMPOSE instead of hand-rolling. */
  canonical: string;
  /** repo-relative path of the ONE canonical implementation (the only allowed home for the markers). */
  file: string;
  /** distinctive implementation tokens (internal fn / const names) that must appear ONLY in `file`. */
  markers: string[];
}

// The registry. Add an entry whenever a component with a distinctive hand-rollable implementation is
// promoted to the package, so a demo can never quietly re-implement it.
const MARKERS: MarkerEntry[] = [
  {
    canonical: 'NockerlFacetedBackground',
    file: 'packages/react/src/primitives/FacetedBackground.tsx',
    // the facet-mesh triangulation builder + its deterministic hash (the signature field's guts).
    markers: ['buildFacetField', 'jitter01'],
  },
];

// GLOBAL demo-render bans: a second, name-INDEPENDENT net that catches a re-implementation even
// when it invents fresh function names (the old AppShell copy used buildMesh/hash, not the canonical
// names). The canonical signature field draws to a <canvas> primitive; a jittered triangle mesh is a
// dense <svg><polygon> pile. Demos COMPOSE the primitive. They never hand-draw either. A future
// legitimate exception (a real charting need, say) is a deliberate edit to these thresholds.
const DEMO_DIR = 'site/src/components/demos';
const MESH_POLYGON_THRESHOLD = 4; // > this many <polygon> in one demo file == a hand-rolled mesh.

const SCAN_DIRS = ['site/src', 'packages/react/src'];
const EXT = /\.(ts|tsx)$/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== 'node_modules' && name !== 'dist') out.push(...walk(p));
    } else if (EXT.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
const violations: string[] = [];

for (const entry of MARKERS) {
  const canonicalAbs = join(ROOT, entry.file);
  const canonicalSrc = readFileSync(canonicalAbs, 'utf8');
  // registry self-check: the marker MUST live in its declared home, else the registry is stale.
  for (const m of entry.markers) {
    if (!new RegExp(`\\b${m}\\b`).test(canonicalSrc)) {
      violations.push(`registry stale: marker "${m}" for ${entry.canonical} is not in ${entry.file}. Update scripts/check-hand-roll.ts.`);
    }
  }
  for (const f of files) {
    if (f === canonicalAbs) continue; // the one allowed home
    const src = readFileSync(f, 'utf8');
    for (const m of entry.markers) {
      if (new RegExp(`\\b${m}\\b`).test(src)) {
        violations.push(
          `${relative(ROOT, f)} contains "${m}", a re-implementation of ${entry.canonical}. ` +
          `Compose ${entry.canonical} (its mesh lives ONLY in ${entry.file}); do not hand-roll a copy.`,
        );
      }
    }
  }
}

// GLOBAL demo-render bans: every demo file must COMPOSE the field, never hand-draw a canvas or a
// triangle mesh (name-independent, so it catches copies that invent fresh function names too).
for (const f of files) {
  const rel = relative(ROOT, f);
  if (!rel.startsWith(DEMO_DIR)) continue;
  const src = readFileSync(f, 'utf8');
  if (/<canvas[\s/>]/.test(src)) {
    violations.push(
      `${rel} renders a raw <canvas>. A demo must not hand-draw a canvas surface. ` +
      `Compose the canonical canvas primitive (e.g. NockerlFacetedBackground) instead.`,
    );
  }
  const polyCount = (src.match(/<polygon[\s/>]/g) ?? []).length;
  if (polyCount > MESH_POLYGON_THRESHOLD) {
    violations.push(
      `${rel} builds a dense <polygon> mesh (${polyCount} polygons), a hand-rolled facet / geometry field. ` +
      `Compose the packaged primitive (NockerlFacetedBackground) instead of re-implementing the mesh.`,
    );
  }
}

console.log(`hand-roll · scanned ${files.length} source files · ${MARKERS.length} registered component(s)`);
if (violations.length) {
  console.error(`\n✗ ${violations.length} hand-roll / divergence violation(s):`);
  for (const v of violations) console.error(`  - ${v}`);
  console.error(`\nFIX: delete the copy and COMPOSE the real component: one implementation, everywhere ().`);
  process.exit(1);
}
console.log('✓ hand-roll passed: no packaged component is re-implemented outside its canonical file.');
