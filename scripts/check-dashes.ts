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

/** Built from escapes so this file does not contain the characters it bans. */
const BANNED: Array<{ ch: string; name: string }> = [
  { ch: '\u2014', name: 'em dash' },
  { ch: '\u2013', name: 'en dash' },
  { ch: '\u2012', name: 'figure dash' },
  { ch: '\u2015', name: 'horizontal bar' },
  { ch: '\u2E3A', name: 'two-em dash' },
  { ch: '\u2E3B', name: 'three-em dash' },
];

/** Verbatim third-party legal text. Never reword a license. */
const LEGAL_EXEMPT = new Set([
  'LICENSE',
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
  if (!BANNED.some((b) => content.includes(b.ch))) continue;

  content.split('\n').forEach((text, i) => {
    for (const { ch, name } of BANNED) {
      let col = text.indexOf(ch);
      while (col !== -1) {
        hits.push({ file, line: i + 1, col: col + 1, name, text: text.trim() });
        col = text.indexOf(ch, col + 1);
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
