#!/usr/bin/env bun
/**
 * bump-version.ts: the ONE VERSION LINE across the whole design system.
 *
 * Every artifact ships in lockstep at a single version. That version lives in FIVE manifests
 * (two npm, two Gradle, the repo root) AND in the public-facing doc prose (README + the
 * Installation page) that tells a consumer "the current version is X". Bumping the manifests
 * by hand is how they drift. The root sat at 0.2.0 while everything else was 0.6.0; leaving
 * the docs out of the bump is how the README sat at 0.6.0 across 15 releases to 1.15.0. This
 * script writes every site at once and refuses a malformed version.
 *
 *   bun run bump 0.7.0     # set every manifest + doc anchor to 0.7.0
 *   bun run bump           # no arg: print each site's version + whether they agree (a check)
 *
 * After bumping: add a CHANGELOG.md section, commit, then create the `vX.Y.Z` tag (see
 * CONTRIBUTING.md → Release runbook). The release workflow fails if a tag's version does not
 * equal every manifest, so this script is the way to keep the tag publishable.
 *
 * DOC ANCHORS vs HISTORICAL MILESTONES: only anchors that state "the current version is X"
 * or hard-pin a consumer install to X are patched. Historical milestone refs ("Components
 * land at v0.6.0", "ship from the v0.6.0 tag onward", "v0.6.0 ships NockerlButton") are facts
 * about when a feature first landed and are deliberately NOT in SITES. They must not move
 * with a bump. Add a new doc anchor here only if it expresses the current version; milestone
 * prose stays hand-written.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');

/** The version-bearing sites: 5 manifests + the public "current version" doc anchors. */
const SITES: Array<{ file: string; re: RegExp; label: string }> = [
  // ── The five version-bearing manifests (the one-version line ADR-0006 enforces) ──
  { file: 'package.json', re: /("version":\s*")[^"]+(")/, label: 'root package.json' },
  { file: 'packages/react/package.json', re: /("version":\s*")[^"]+(")/, label: '@dizyx/nockerl-react' },
  { file: 'packages/tokens/package.json', re: /("version":\s*")[^"]+(")/, label: '@dizyx/nockerl-tokens' },
  { file: 'packages/compose/nockerl-design-tokens/build.gradle.kts', re: /(version = ")[^"]+(")/, label: 'compose design-tokens' },
  { file: 'packages/compose/nockerl-design-components/build.gradle.kts', re: /(version = ")[^"]+(")/, label: 'compose design-components' },
  // ── README.md: the three install pins a reader would copy ──
  { file: 'README.md', re: /(\.package\(url: "https:\/\/github\.com\/dizyx\/nockerl-design\.git", from: ")[0-9]+\.[0-9]+\.[0-9]+("\))/, label: 'README Swift pin' },
  { file: 'README.md', re: /(implementation\("com\.dizyx\.nockerl:design-tokens:)[0-9]+\.[0-9]+\.[0-9]+("\))/, label: 'README Maven tokens pin' },
  { file: 'README.md', re: /(implementation\("com\.dizyx\.nockerl:design-components:)[0-9]+\.[0-9]+\.[0-9]+("\))/, label: 'README Maven components pin' },
  // ── installation.mdx: the "currently X" line, the version-line line, the two Maven
  //    hard-pins (a consumer copying these gets exact-version artifacts), and the Swift pin ──
  { file: 'site/src/content/docs/getting-started/installation.mdx', re: /(currently `)[0-9]+\.[0-9]+\.[0-9]+(`)/, label: 'installation "currently"' },
  { file: 'site/src/content/docs/getting-started/installation.mdx', re: /(at the same `)[0-9]+\.[0-9]+\.[0-9]+(` version line)/, label: 'installation version-line' },
  { file: 'site/src/content/docs/getting-started/installation.mdx', re: /(design-tokens:)[0-9]+\.[0-9]+\.[0-9]+()/, label: 'installation Maven tokens pin' },
  { file: 'site/src/content/docs/getting-started/installation.mdx', re: /(design-components:)[0-9]+\.[0-9]+\.[0-9]+()/, label: 'installation Maven components pin' },
  { file: 'site/src/content/docs/getting-started/installation.mdx', re: /(\.package\(url: "https:\/\/github\.com\/dizyx\/nockerl-design\.git", from: ")[0-9]+\.[0-9]+\.[0-9]+("\))/, label: 'installation Swift pin' },
];

/** SemVer core with an optional -prerelease / +build (what the release workflow accepts). */
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
/** A SemVer anywhere in a span, used to READ the version out of a matched anchor (robust to
 *  backtick-wrapped or unquoted forms, e.g. ``currently `1.15.0` `` or `design-tokens:1.15.0`). */
const SEMVER_IN = /[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?/;

const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
/** Extract the current version literal from a matched anchor: the first SemVer in the span. */
const versionIn = (rel: string, re: RegExp): string => {
  const m = read(rel).match(re);
  if (!m) return '(not found)';
  const v = m[0].match(SEMVER_IN);
  return v ? v[0] : '(not found)';
};

const target = process.argv[2];

if (!target) {
  // ── Check mode: report every version and whether they agree. ──
  const rows = SITES.map((s) => ({ label: s.label, version: versionIn(s.file, s.re) }));
  const width = Math.max(...rows.map((r) => r.label.length));
  for (const r of rows) console.log(`  ${r.label.padEnd(width)}  ${r.version}`);
  const unique = new Set(rows.map((r) => r.version));
  if (unique.size === 1) {
    console.log(`\n✓ one version line: all ${rows.length} manifests at ${[...unique][0]}`);
    process.exit(0);
  }
  console.log(`\n✗ version DRIFT (${unique.size} distinct versions): ${[...unique].join(', ')}`);
  console.log('  Run `bun run bump <version>` to realign every manifest.');
  process.exit(1);
}

if (!SEMVER.test(target)) {
  console.error(`✗ "${target}" is not a valid version (expected e.g. 0.7.0, 1.0.0-rc.1).`);
  process.exit(1);
}

const changed: string[] = [];
for (const s of SITES) {
  const src = read(s.file);
  if (!s.re.test(src)) {
    console.error(`✗ could not find a version literal in ${s.file}`);
    process.exit(1);
  }
  const next = src.replace(s.re, `$1${target}$2`);
  if (next !== src) {
    writeFileSync(join(ROOT, s.file), next);
    changed.push(s.label);
  }
}

console.log(`✓ set ${changed.length}/${SITES.length} manifests to ${target}${changed.length ? `: ${changed.join(', ')}` : ' (already current)'}`);
console.log('Next: update CHANGELOG.md, commit, then create the vX.Y.Z tag (CONTRIBUTING.md → Release runbook).');
