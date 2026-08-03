#!/usr/bin/env bun
/**
 * check-prose-leak.ts: the LAYOUT-ROW gate.
 *
 * The docs prose flow rule spaces consecutive content by adding a top margin to every
 * element that has a preceding sibling. It is written as a DESCENDANT selector, so it does
 * not stop at the page: it reaches into any component rendered inside a doc page, however
 * deep. In a flex or grid row that is silent damage. Item one has no preceding sibling and
 * stays where it is, items two onward each take the margin and drop, and the row reads as
 * broken alignment.
 *
 * The reason this kept coming back is that it is invisible from inside the component. The
 * component's own CSS is correct, the stagger is injected from outside it, and it only
 * appears once the component is mounted in a page. Every previous fix was therefore local
 * to one component and taught the next component nothing.
 *
 * The framework ships the opt-out already: the flow selector excludes
 * `:where(.not-content *)`, so a root carrying `not-content` exempts its whole subtree.
 * This gate makes forgetting that root a build failure rather than a visual bug someone
 * notices months later.
 *
 * WHAT IT CHECKS
 *   1. Which components actually render inside a doc page, by following imports from the
 *      .mdx files and then through component-to-component imports. Chrome that never enters
 *      the prose container is out of scope: it cannot leak, and flagging it is how a gate
 *      earns a reputation for crying wolf and gets switched off.
 *   2. Whether that component's ROOT element establishes a flex or grid formatting context,
 *      reading both its own styles and the site theme, since a root can be styled from
 *      either.
 *   3. Whether that root carries `not-content`.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   It cannot tell that adding the opt-out will collapse spacing that was, wrongly, coming
 *   from the prose cascade. That is a real hazard and the failure message names it.
 *
 * Roots whose class list is computed at runtime cannot be read statically. Those are
 * reported as SKIPPED rather than passed, because a visible blind spot is worth more than a
 * silent green.
 *
 * Usage:  bun run scripts/check-prose-leak.ts   (wired into `harness`)
 */
import { Glob } from 'bun';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const DOCS = join(ROOT, 'site/src/content/docs');
const THEME = join(ROOT, 'site/src/styles/theme.css');
const DEMO_DIR = 'site/src/components/demos';
const EXAMPLE = 'site/src/components/Example.astro';
const OPT_OUT = 'not-content';

/** Components that render in a doc page but genuinely must not be tagged, with the reason. */
const ALLOWLIST = new Map<string, string>([
  // Add entries only with a reason. A subtree that must keep the prose cascade (because it
  // holds authored MDX) belongs here, and its layout rows should be tagged one level in.
]);

// ── 1. which components actually reach a doc page ────────────────────────────────────
/** Resolve an import specifier from `fromFile` to a repo-relative component path. */
function resolveComponent(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const abs = resolve(dirname(fromFile), spec);
  if (!/\.(astro|tsx)$/.test(abs) || !existsSync(abs)) return null;
  return relative(ROOT, abs);
}

const IMPORT_RE = /from\s+['"]([^'"]+\.(?:astro|tsx))['"]/g;

const reachable = new Set<string>();
const queue: string[] = [];

for (const rel of new Glob('**/*.mdx').scanSync(DOCS)) {
  const abs = join(DOCS, rel);
  for (const m of readFileSync(abs, 'utf8').matchAll(IMPORT_RE)) {
    const comp = resolveComponent(abs, m[1]!);
    if (comp && !reachable.has(comp)) {
      reachable.add(comp);
      queue.push(comp);
    }
  }
}
// A component rendered by a reachable component is itself reachable.
while (queue.length) {
  const cur = queue.shift()!;
  const abs = join(ROOT, cur);
  if (!existsSync(abs)) continue;
  for (const m of readFileSync(abs, 'utf8').matchAll(IMPORT_RE)) {
    const comp = resolveComponent(abs, m[1]!);
    if (comp && !reachable.has(comp)) {
      reachable.add(comp);
      queue.push(comp);
    }
  }
}

// ── 2. which class names establish a flex or grid formatting context ─────────────────
const FLEX_GRID = /display:\s*(?:inline-)?(?:flex|grid)\b/;

/** Class names whose rule body sets a flex or grid display, harvested from CSS text. */
function flexGridClasses(css: string, into: Set<string>): void {
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!FLEX_GRID.test(rule[2]!)) continue;
    for (const cls of rule[1]!.matchAll(/\.([A-Za-z_][\w-]*)/g)) into.add(cls[1]!);
  }
}

const themeFlexGrid = new Set<string>();
if (existsSync(THEME)) flexGridClasses(readFileSync(THEME, 'utf8'), themeFlexGrid);

// ── 3. the root element and its static class list ────────────────────────────────────
/** `covered` is true when this element, or anything above it, carries the opt-out. */
type El = { tag: string; classes: string[] | null; covered: boolean };

const VOID = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'source', 'path', 'circle', 'rect', 'use']);

/**
 * Every rendered element in source order, element [0] being the root, each carrying whether
 * an ancestor already exempts it. Ancestry matters: the flow selector excludes
 * `:where(.not-content *)`, so one tagged row covers everything nested inside it, and
 * flagging those descendants again would be a false positive.
 */
function elementsOf(src: string, isAstro: boolean): El[] {
  let body = src;
  if (isAstro) {
    // Drop the frontmatter fence, then any style/script blocks.
    if (body.startsWith('---')) {
      const end = body.indexOf('\n---', 3);
      if (end !== -1) body = body.slice(end + 4);
    }
  } else {
    // The rendered tree starts at the component's return.
    const ret = body.search(/return\s*\(?\s*</);
    if (ret === -1) return [];
    body = body.slice(ret);
  }
  body = body.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');

  const out: El[] = [];
  const stack: boolean[] = [];
  const TOKEN = /<\/([a-zA-Z][\w.-]*)\s*>|<([a-zA-Z][\w.-]*)((?:[^>"']|"[^"]*"|'[^']*'|\{[^}]*\})*)>/g;

  for (const m of body.matchAll(TOKEN)) {
    if (m[1]) {
      stack.pop();
      continue;
    }
    const tag = m[2]!;
    const attrs = m[3] ?? '';
    const selfClosing = attrs.trimEnd().endsWith('/') || VOID.has(tag.toLowerCase());

    let classes: string[] | null;
    const staticCls = attrs.match(/\b(?:class|className)\s*=\s*"([^"]*)"/);
    if (staticCls) classes = staticCls[1]!.split(/\s+/).filter(Boolean);
    else if (/\b(?:class|className)\s*=\s*\{/.test(attrs)) classes = null;
    else classes = [];

    const inherited = stack.length > 0 && stack[stack.length - 1] === true;
    const covered = inherited || (classes?.includes(OPT_OUT) ?? false);
    out.push({ tag, classes, covered });
    if (!selfClosing) stack.push(covered);
  }
  return out;
}

// ── 4. verdict ───────────────────────────────────────────────────────────────────────
type Fail = { file: string; tag: string; cls: string };
const failures: Fail[] = [];
const skipped: Array<{ file: string; tag: string }> = [];
let checked = 0;

for (const rel of [...reachable].sort()) {
  if (rel.startsWith(DEMO_DIR)) continue; // covered by the shared example frame, asserted below
  if (ALLOWLIST.has(rel)) continue;
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) continue;

  const src = readFileSync(abs, 'utf8');
  const els = elementsOf(src, rel.endsWith('.astro'));
  if (!els.length) continue;
  checked++;

  const root = els[0]!;
  const own = new Set<string>();
  flexGridClasses(src, own);
  const isFlexGrid = (c: string) => own.has(c) || themeFlexGrid.has(c);

  // The row need not be the root. `.cg__cards` is a flex row three levels down and the
  // cascade reaches it just the same, so every element is considered. An element already
  // covered by a tagged ancestor is exempt, which is what lets a component tag one row and
  // leave a sibling subtree of authored prose in the cascade.
  let dynamicSeen = false;
  let hit: { tag: string; cls: string } | null = null;
  for (const el of els) {
    if (el.covered) continue;
    if (el.classes === null) {
      dynamicSeen = true;
      continue;
    }
    const cls = el.classes.find(isFlexGrid);
    if (cls) {
      hit = { tag: el.tag, cls };
      break;
    }
  }

  if (hit) failures.push({ file: rel, tag: hit.tag, cls: hit.cls });
  else if (dynamicSeen) skipped.push({ file: rel, tag: root.tag });
}

// ── 5. self-check: the shared example frame still carries the opt-out ────────────────
// Every demo is mounted through that frame. If the class is ever dropped there, ~90 demos
// regress at once and nothing else in the suite would notice.
const exampleAbs = join(ROOT, EXAMPLE);
const exampleOk = existsSync(exampleAbs) && readFileSync(exampleAbs, 'utf8').includes(OPT_OUT);

console.log(
  `prose-leak · ${reachable.size} component(s) reachable from docs · ${checked} root(s) inspected · ` +
    `${skipped.length} skipped`,
);

let failed = false;

if (!exampleOk) {
  failed = true;
  console.log(
    `\n✗ ${EXAMPLE} no longer carries "${OPT_OUT}".\n` +
      '  Every demo is mounted through that frame and relies on it for the opt-out.\n' +
      '  Restore the class on the frame element rather than tagging demos one by one.',
  );
}

if (skipped.length) {
  console.log(`\n! ${skipped.length} root(s) skipped: the class list is computed, so it cannot be read here.`);
  for (const s of skipped) console.log(`    ${s.file}  <${s.tag}>`);
  console.log('  Check these by hand. They are reported rather than passed so the blind spot stays visible.');
}

if (failures.length) {
  failed = true;
  console.log(`\n✗ ${failures.length} component root(s) lay out a flex or grid row inside docs without "${OPT_OUT}":`);
  for (const f of failures) console.log(`    ${f.file}  <${f.tag}> via .${f.cls}`);
  console.log(`
The docs prose flow rule adds a top margin to every element that has a preceding sibling,
and it reaches into your component. Item one stays put, items two onward drop, and the row
looks misaligned. Your own CSS is not at fault, which is why this is invisible locally.

FIX: add "${OPT_OUT}" to the component's ROOT element. That exempts the whole subtree.

THEN CHECK THE SPACING, because the opt-out removes the cascade from everything inside,
including anything that was quietly relying on it. If a child sets no margin of its own, it
was being spaced by the very rule you just switched off, and it will collapse.

  - If the subtree is layout, declare the margins you actually want.
    Worked example: site/src/components/ComposeGraph.astro, where the headings, paragraphs
    and tables set no margin at all and had to be given explicit ones in the same change.

  - If the subtree holds AUTHORED PROSE, do not tag the root. Prose is supposed to keep the
    cascade. Tag the layout row one level in instead. A tabbed component is the usual case:
    tag the tablist, which is the flex row, and leave the panels untagged so the MDX inside
    them keeps its spacing.
`);
}

if (failed) process.exit(1);
console.log(`✓ prose-leak passed: every docs-reachable layout row opts out, and the example frame still carries it.`);
