#!/usr/bin/env bun
/**
 * check-dashes.ts, the typographic dash gate.
 *
 * Fails if an em dash, en dash, or any of their lookalikes appears anywhere in the
 * tracked tree. These characters are the clearest signal of machine-generated prose, and
 * a repository full of them reads as generated no matter how good the work underneath is.
 *
 * There is deliberately NO inline escape hatch. No pragma, no ignore comment, no
 * per-line suppression. If you hit this gate, the fix is to rewrite the sentence:
 *
 *   colon        introduces a definition, an expansion, or a list
 *   comma        a mild aside inside the sentence
 *   parentheses  a real interruption worth keeping but subordinating
 *   full stop    two independent thoughts welded together, so split them
 *   deletion     the clause adds nothing, which is often the honest answer
 *   rewrite      the dash is propping up a run-on
 *
 * Do not "fix" a failure by swapping in a hyphen. That trades one tell for another and
 * reads just as generated. A plain hyphen is right only for a genuinely hyphenated
 * compound, or a list separator that already reads naturally that way.
 *
 * The ONLY exemption is verbatim third-party legal text, listed in LEGAL_EXEMPT below.
 * That list is intentionally hardcoded: widening it requires editing this file in a
 * reviewed pull request, which is the point.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

/**
 * Built from codepoints rather than escape literals, so this file contains neither the
 * banned characters nor the escape sequences it now also has to catch. That is what keeps
 * the scan below free of a self-exemption.
 */
const BANNED: Array<{ code: number; name: string }> = [
  { code: 0x2014, name: 'em dash' },
  { code: 0x2013, name: 'en dash' },
  { code: 0x2012, name: 'figure dash' },
  { code: 0x2015, name: 'horizontal bar' },
  { code: 0x2e3a, name: 'two-em dash' },
  { code: 0x2e3b, name: 'three-em dash' },
];

/**
 * Every spelling of a banned dash, not just the raw character.
 *
 * Scanning for the literal character alone leaves a hole big enough to ship through. A
 * package manifest carried an escaped em dash in its description: six plain ASCII
 * characters that this gate read straight past, that JSON.parse turns back into a real em
 * dash, and that a registry then renders as one on the public package page. MDX and HTML
 * have the same property via entities. So each banned codepoint is matched in every form
 * that decodes to it before a human sees it.
 *
 * Every pattern here is ASSEMBLED at runtime rather than written out. A gate that spells
 * the thing it forbids has to exempt itself, and an exemption is the crack the next one
 * gets through.
 */
type Detector = { re: RegExp; name: string };

/** Named HTML entities, by entity name, for the dashes that have one. */
const NAMED = [
  { entity: 'mdash', name: 'em dash' },
  { entity: 'ndash', name: 'en dash' },
  { entity: 'horbar', name: 'horizontal bar' },
];

/** The raw character. Banned everywhere, in every kind of file. */
const LITERAL: Detector[] = BANNED.map(({ code, name }) => ({
  re: new RegExp(String.fromCodePoint(code), 'g'),
  name,
}));

/** The same character wearing a disguise that decodes before anyone reads it. */
const ENCODED: Detector[] = [
  ...BANNED.flatMap(({ code, name }): Detector[] => {
    const hex = code.toString(16);
    return [
      { re: new RegExp(`\\\\u\\{?0*${hex}\\}?`, 'gi'), name: `${name}, as a unicode escape` },
      {
        re: new RegExp(`&#x0*${hex};|&#0*${code.toString(10)};`, 'gi'),
        name: `${name}, as a numeric character reference`,
      },
    ];
  }),
  ...NAMED.map(({ entity, name }) => ({
    re: new RegExp(`&${entity};`, 'gi'),
    name: `${name}, as a named entity`,
  })),
];

/**
 * Compiled platform source is held to the literal-character rule only, for now.
 *
 * Not because an escape is acceptable there, but because two components deliberately use
 * an em dash as a GLYPH rather than as punctuation: the attribution mark before a quote
 * citation, and the lone mark that means "no value" on a stat card. The second one is worse
 * than a style question, because the card compares its input against that exact string to
 * decide whether to mute, so the glyph is part of the published API and a consumer relies
 * on it. Both are typography, not prose, and rewriting them changes rendered product UI.
 *
 * That is a decision for the design owner, not something a gate should force at 3am. Until
 * it is ruled on, this is the honest scope: prose and manifests get the full scan, platform
 * source keeps the rule it already passed. The exception is narrow, named, and temporary,
 * and it is written down here rather than living as folklore.
 */
const SOURCE_GLYPH_EXT = new Set(['.swift', '.kt']);

/** `test` and `matchAll` both read lastIndex on a /g/ regex, so never reuse a dirty one. */
function hunt(re: RegExp, text: string): RegExpMatchArray[] {
  re.lastIndex = 0;
  return [...text.matchAll(re)];
}

/**
 * Verbatim third-party legal text. Never reword a license.
 *
 * The two package copies are byte-identical to the root file and exist because npm resolves
 * `files` against the package directory, so a package cannot ship a licence that lives above
 * it. They carry the bundled-font copyright lines, which are someone else's words.
 */
const LEGAL_EXEMPT = new Set([
  'LICENSE',
  'packages/tokens/LICENSE',
  'packages/react/LICENSE',
  'Sources/NockerlDesign/Resources/Fonts/OFL-Outfit.txt',
  'Sources/NockerlDesign/Resources/Fonts/OFL-SpaceMono.txt',
  'packages/compose/nockerl-design-tokens/src/third_party/OFL.txt',
]);

/** Binary and generated formats we never read as text. */
const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.zip', '.jar', '.lock', '.bin',
]);

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !LEGAL_EXEMPT.has(f))
  .filter((f) => !SKIP_EXT.has(extname(f).toLowerCase()));

type Hit = { file: string; line: number; col: number; name: string; text: string };
const hits: Hit[] = [];

for (const file of files) {
  let content: string;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const detectors = SOURCE_GLYPH_EXT.has(extname(file).toLowerCase())
    ? LITERAL
    : [...LITERAL, ...ENCODED];
  if (!detectors.some((d) => hunt(d.re, content).length > 0)) continue;

  content.split('\n').forEach((text, i) => {
    for (const { re, name } of detectors) {
      for (const m of hunt(re, text)) {
        hits.push({ file, line: i + 1, col: (m.index ?? 0) + 1, name, text: text.trim() });
      }
    }
  });
}

if (hits.length === 0) {
  console.log(`dash gate: clean (${files.length} files scanned, ${LEGAL_EXEMPT.size} legal files exempt)`);
  process.exit(0);
}

const byFile = new Map<string, Hit[]>();
for (const h of hits) {
  const list = byFile.get(h.file) ?? [];
  list.push(h);
  byFile.set(h.file, list);
}

console.error(`\ndash gate FAILED: ${hits.length} banned dash(es) in ${byFile.size} file(s)\n`);
for (const [file, list] of [...byFile].slice(0, 40)) {
  console.error(`  ${file} (${list.length})`);
  for (const h of list.slice(0, 3)) {
    const snippet = h.text.length > 100 ? `${h.text.slice(0, 100)}...` : h.text;
    console.error(`    ${h.line}:${h.col}  ${h.name}  ${snippet}`);
  }
  if (list.length > 3) console.error(`    ... and ${list.length - 3} more in this file`);
}
if (byFile.size > 40) console.error(`\n  ... and ${byFile.size - 40} more file(s)`);

console.error(`
Rewrite the sentence rather than swapping in a hyphen. See the header of
scripts/check-dashes.ts for which punctuation to reach for. There is no ignore
pragma by design.
`);
process.exit(1);
