// Atomic site publish. `astro build` rewrites its output dir IN PLACE, so a preview server
// reading `dist/` mid-build serves a PARTIAL snapshot (the 404s the design lead's review hit). The fix:
// astro builds to a fresh `dist-next/` (via `--outDir`), then this script swaps it into `dist/`
// with two back-to-back renames. The served `dist/` is only ever a COMPLETE snapshot. The swap
// window shrinks from the seconds-long in-place rewrite to a pair of rename() syscalls.
//
// (A single truly-atomic rename can't replace a non-empty directory, and serving `dist/` as a
// symlink would risk the deploy path; the two-rename swap keeps `dist/` a real directory and is
// deploy-safe.)  Run from the site root, AFTER `astro build --outDir dist-next`.
/* global console, process */ // a Node build tool, not browser/site source
import { rmSync, renameSync, existsSync } from 'node:fs';

const NEXT = 'dist-next', LIVE = 'dist', PREV = 'dist-prev';

if (!existsSync(NEXT)) {
  console.error('atomic publish: ' + NEXT + '/ missing, run `astro build --outDir ' + NEXT + '` first.');
  process.exit(1);
}
rmSync(PREV, { recursive: true, force: true });   // clear any leftover from an interrupted run
if (existsSync(LIVE)) renameSync(LIVE, PREV);      // step out the live snapshot
renameSync(NEXT, LIVE);                            // step in the fresh snapshot (now the served one)
rmSync(PREV, { recursive: true, force: true });    // drop the old snapshot
console.log('✓ atomic publish: dist/ swapped in (the served snapshot is always complete).');
