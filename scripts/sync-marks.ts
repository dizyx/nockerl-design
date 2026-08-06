#!/usr/bin/env bun
/**
 * sync-marks.ts: mirror the product marks into the SwiftPM asset catalog.
 *
 * `logos/app-icons/*.svg` is the source of truth for product art. The Swift package cannot
 * read those directly: SwiftUI will not render a raw SVG from a bundle, so the art has to
 * reach the package as a compiled ASSET CATALOG, which does support SVG and gives automatic
 * light and dark switching plus vector scaling at any size.
 *
 * The catalog is therefore GENERATED, never hand copied. That is the whole point of this
 * file. A second, hand maintained set of the same art would drift the first time anyone
 * corrected an icon, and nothing would notice: the two would simply disagree. This runs on
 * every `bun run build`, exactly as the generated token sources are mirrored into
 * `Sources/NockerlDesign/NockerlTokens.swift`, so an icon change flows into the package the
 * same way a token change does.
 *
 * `scripts/check-marks.ts` fails the build if the catalog and the source art disagree, so a
 * sync that quietly stops syncing is caught rather than discovered later.
 *
 * The `Contents.json` shape matches what a consumer already proved in production: the light
 * cut as the universal image, the `-on-dark` cut carrying the luminosity appearance, and
 * `preserves-vector-representation` so the mark stays vector at any size rather than being
 * rasterised at catalog compile time.
 */
import { readdir, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dir, '..');
const SOURCE = join(REPO, 'logos', 'app-icons');
const CATALOG = join(REPO, 'Sources', 'NockerlDesign', 'Resources', 'Marks.xcassets');

/** The five product marks. The house mark is included: it is a product mark here, and the
 *  code drawn `NockerlLogo` stays as it is for the three shade depth ladder an asset would
 *  flatten. Both can exist; they are not the same thing. */
export const PRODUCTS = ['nockerl', 'voice', 'security', 'ctxms', 'design'] as const;

/** The catalog root marker. Without it Xcode does not treat the directory as a catalog. */
const ROOT_CONTENTS = {
  info: { author: 'nockerl-design', version: 1 },
};

/** One imageset: the light cut, then the dark cut behind the luminosity appearance. */
function imagesetContents(product: string) {
  return {
    images: [
      { filename: `${product}.svg`, idiom: 'universal' },
      {
        appearances: [{ appearance: 'luminosity', value: 'dark' }],
        filename: `${product}-on-dark.svg`,
        idiom: 'universal',
      },
    ],
    info: { author: 'nockerl-design', version: 1 },
    properties: {
      'preserves-vector-representation': true,
      'template-rendering-intent': 'original',
    },
  };
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export async function syncMarks(): Promise<string[]> {
  // Rebuilt from scratch each run, so a product that leaves `logos/app-icons/` also leaves
  // the catalog instead of lingering as an orphan nobody notices.
  if (existsSync(CATALOG)) await rm(CATALOG, { recursive: true });
  await mkdir(CATALOG, { recursive: true });
  await writeFile(join(CATALOG, 'Contents.json'), json(ROOT_CONTENTS), 'utf8');

  const written: string[] = [];
  for (const product of PRODUCTS) {
    const light = join(SOURCE, `${product}.svg`);
    const dark = join(SOURCE, `${product}-on-dark.svg`);
    for (const f of [light, dark]) {
      if (!existsSync(f)) throw new Error(`sync-marks: missing source art ${f}`);
    }

    const dir = join(CATALOG, `${product}.imageset`);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${product}.svg`), await readFile(light), null);
    await writeFile(join(dir, `${product}-on-dark.svg`), await readFile(dark), null);
    await writeFile(join(dir, 'Contents.json'), json(imagesetContents(product)), 'utf8');
    written.push(product);
  }
  return written;
}

if (import.meta.main) {
  const written = await syncMarks();
  const entries = (await readdir(CATALOG)).filter((e) => e.endsWith('.imageset'));
  console.log(
    `Synced: Sources/NockerlDesign/Resources/Marks.xcassets (${entries.length} imagesets: ${written.join(', ')})`,
  );
}
