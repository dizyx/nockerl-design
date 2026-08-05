#!/usr/bin/env bun
/**
 * check-node-esm.ts: import the published packages the way a consumer would, using Node.
 *
 * WHY THIS EXISTS. We develop in Bun, and Bun resolves extensionless relative imports.
 * Node's ESM resolver does not: it performs no extension search, so `./alertIntents` is a
 * hard failure even when `alertIntents.js` is sitting beside it. That asymmetry let
 * @dizyx/nockerl-react ship a build where all 72 emitted specifiers were unresolvable
 * under Node. Every local check passed, the package imported fine in Bun, and it broke
 * every Node consumer: Astro and Next SSR, Vitest and Jest, plain node scripts. Bundlers
 * tolerate the missing extension too, which is what made it so easy to miss.
 *
 * The package tsconfig now uses NodeNext, so tsc refuses to compile a missing extension in
 * the first place. This is the second layer: proof that what we would actually upload
 * loads in the runtime we do not develop in.
 *
 * It tests the PACKED TARBALL rather than dist/ directly, so it also catches a file left
 * out of "files" and a broken "exports" map, which reading dist/ would never reveal.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Target = {
  dir: string;
  name: string;
  /** Named exports that must survive the round trip. */
  expect: string[];
  /** Floor on the export count, to catch a barrel that silently truncated. */
  minExports: number;
};

const ALL: Target[] = [
  { dir: 'packages/tokens', name: '@dizyx/nockerl-tokens', expect: ['tokens', 'cssVar'], minExports: 3 },
  { dir: 'packages/react', name: '@dizyx/nockerl-react', expect: ['NockerlButton'], minExports: 100 },
];

/**
 * With no argument, check everything. A publish job only builds its own package, so it
 * passes a name ("tokens" / "react") and checks just that one.
 */
const filter = process.argv[2];
const TARGETS = filter ? ALL.filter((t) => t.dir.endsWith(`/${filter}`)) : ALL;
if (TARGETS.length === 0) {
  console.error(`no package matches "${filter}". Known: ${ALL.map((t) => t.dir.split('/')[1]).join(', ')}`);
  process.exit(1);
}

function run(cmd: string, args: string[], cwd: string): string {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

try {
  const v = run('node', ['--version'], process.cwd()).trim();
  console.log(`checking against Node ${v}`);
} catch {
  console.error('node is not on PATH. This check is meaningless without it: the whole point is');
  console.error('to exercise the runtime we do not develop in.');
  process.exit(1);
}

let failed = false;

for (const t of TARGETS) {
  const sandbox = mkdtempSync(join(tmpdir(), 'nk-esm-'));
  try {
    // Pack exactly what would be uploaded.
    const packed = run('npm', ['pack', '--silent'], t.dir).trim().split('\n').pop()!;
    renameSync(join(t.dir, packed), join(sandbox, packed));

    run('npm', ['init', '-y'], sandbox);
    // react is a peer dependency and the modules import it at load time, so the sandbox
    // needs a real copy or the import fails for an unrelated reason.
    run('npm', ['install', `./${packed}`, 'react'], sandbox);

    const probe = `
      import(${JSON.stringify(t.name)}).then((m) => {
        const keys = Object.keys(m);
        const missing = ${JSON.stringify(t.expect)}.filter((k) => !keys.includes(k));
        if (missing.length) {
          console.error('missing expected export(s): ' + missing.join(', '));
          process.exit(1);
        }
        if (keys.length < ${t.minExports}) {
          console.error('only ' + keys.length + ' exports, expected at least ${t.minExports}');
          process.exit(1);
        }
        console.log(keys.length);
      }).catch((e) => {
        console.error((e && e.code) || 'ERROR');
        console.error(String((e && e.message) || e).split('\\n')[0]);
        process.exit(1);
      });
    `;
    const count = run('node', ['-e', probe], sandbox).trim();
    console.log(`  ${t.name}: imports under Node, ${count} exports`);
  } catch (err) {
    failed = true;
    const e = err as { stderr?: string; stdout?: string; message?: string };
    console.error(`  ${t.name}: FAILED under Node`);
    const detail = (e.stderr || e.stdout || e.message || '').trim();
    if (detail) for (const line of detail.split('\n').slice(0, 4)) console.error(`    ${line}`);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
    // A failed pack can leave the tarball behind in the package directory.
    for (const f of readdirSync(t.dir)) {
      if (f.endsWith('.tgz')) rmSync(join(t.dir, f), { force: true });
    }
  }
}

if (failed) {
  console.error(`
A package that cannot be imported by Node is broken for Astro and Next SSR, for Vitest and
Jest, and for any plain node script, even though it works in Bun and in every bundler.

The usual cause is a relative import without its .js extension. The package tsconfig uses
NodeNext so tsc should catch that first: if this check failed but the build passed, look at
what else the tarball is missing, starting with "files" and "exports" in package.json.
`);
  process.exit(1);
}

console.log('node esm gate: clean');
