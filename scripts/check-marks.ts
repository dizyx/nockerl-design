#!/usr/bin/env bun
/**
 * check-marks.ts: the product-mark catalog must match the source art.
 *
 * `logos/app-icons/*.svg` is the source of truth and the SwiftPM asset catalog under
 * `Sources/NockerlDesign/Resources/Marks.xcassets` is generated from it by
 * `scripts/sync-marks.ts` on every `bun run build`.
 *
 * The failure this exists to catch is not a wrong file, it is a sync that quietly stops
 * running. The catalog would keep compiling, the package would keep building, every gate
 * would stay green, and the marks shipped to consumers would silently be the old art. That
 * is invisible until someone compares two screens, which is exactly the class of defect a
 * corrected icon set has already been through once.
 *
 * So this compares BYTES rather than merely checking the files exist, and it checks the
 * `Contents.json` too: an imageset whose dark cut lost its luminosity appearance still
 * builds and still renders, it just renders the light art on a dark surface.
 *
 * Wired into `harness`. Fix a failure by running `bun run build`, never by hand editing the
 * catalog, which would put the drift back the next time anyone builds.
 */
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PRODUCTS } from './sync-marks';

const REPO = join(import.meta.dir, '..');
const SOURCE = join(REPO, 'logos', 'app-icons');
const CATALOG = join(REPO, 'Sources', 'NockerlDesign', 'Resources', 'Marks.xcassets');

const problems: string[] = [];

if (!existsSync(CATALOG)) {
  problems.push('the catalog does not exist at all');
} else {
  // Nothing extra: an imageset for a product that no longer exists would ship art the
  // source no longer has.
  const found = (await readdir(CATALOG))
    .filter((e) => e.endsWith('.imageset'))
    .map((e) => e.replace('.imageset', ''))
    .sort();
  const expected = [...PRODUCTS].sort();
  for (const extra of found.filter((f) => !expected.includes(f as never))) {
    problems.push(`${extra}.imageset is in the catalog but not in the source art`);
  }

  for (const product of PRODUCTS) {
    const dir = join(CATALOG, `${product}.imageset`);
    if (!existsSync(dir)) {
      problems.push(`${product}.imageset is missing from the catalog`);
      continue;
    }

    for (const cut of [`${product}.svg`, `${product}-on-dark.svg`]) {
      const src = join(SOURCE, cut);
      const dst = join(dir, cut);
      if (!existsSync(src)) {
        problems.push(`source art ${cut} is missing`);
        continue;
      }
      if (!existsSync(dst)) {
        problems.push(`${product}.imageset is missing ${cut}`);
        continue;
      }
      const [a, b] = await Promise.all([readFile(src), readFile(dst)]);
      if (!a.equals(b)) {
        problems.push(`${product}.imageset/${cut} differs from logos/app-icons/${cut}`);
      }
    }

    const contentsPath = join(dir, 'Contents.json');
    if (!existsSync(contentsPath)) {
      problems.push(`${product}.imageset has no Contents.json`);
      continue;
    }
    try {
      const contents = JSON.parse(await readFile(contentsPath, 'utf8'));
      const dark = (contents.images ?? []).find(
        (i: { filename?: string }) => i.filename === `${product}-on-dark.svg`,
      );
      const luminosity = dark?.appearances?.some(
        (a: { appearance?: string; value?: string }) =>
          a.appearance === 'luminosity' && a.value === 'dark',
      );
      if (!luminosity) {
        problems.push(
          `${product}.imageset: the dark cut has no dark luminosity appearance, so it would ` +
            'render the light art on a dark surface',
        );
      }
      if (contents.properties?.['preserves-vector-representation'] !== true) {
        problems.push(
          `${product}.imageset: preserves-vector-representation is not set, so the mark would ` +
            'be rasterised instead of scaling as vector',
        );
      }
    } catch {
      problems.push(`${product}.imageset: Contents.json is not valid JSON`);
    }
  }
}

if (problems.length === 0) {
  console.log(
    `marks: catalog matches the source art (${PRODUCTS.length} imagesets, both cuts, byte for byte)`,
  );
  process.exit(0);
}

console.error(`\n✗ the product-mark catalog is stale or malformed (${problems.length} problem(s)):\n`);
for (const p of problems) console.error(`    ${p}`);
console.error(`
The catalog under Sources/NockerlDesign/Resources/ is GENERATED from logos/app-icons/ by
scripts/sync-marks.ts, which runs as part of \`bun run build\`.

  FIX: bun run build

Do not hand edit the catalog to make this pass. The next build would overwrite the edit and
put the drift straight back, and the point of this check is that a stale catalog still
compiles and still renders: it just renders the wrong art, which nothing else would notice.
`);
process.exit(1);
