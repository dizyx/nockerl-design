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
 *   4. Whether that row would ACTUALLY stagger. Being a flex row is not sufficient. The flow
 *      rule is an adjacent-sibling rule and it excludes the same eight tags on both sides,
 *      so a row whose items are each preceded by a span, a link or inline code cannot take
 *      the margin at all. Asking the narrower question lets such a row pass honestly rather
 *      than being tagged to silence the gate, which would be actively wrong when the row
 *      holds authored prose.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   It cannot tell that adding the opt-out will collapse spacing that was, wrongly, coming
 *   from the prose cascade. That is a real hazard and the failure message names it.
 *
 * KNOWN IMPRECISION, AND THE DIRECTION IT ERRS
 *   The element scan is a regex over source, so two branches of a conditional read as two
 *   adjacent siblings even though only one renders. That produces a false positive, never a
 *   false negative: a real stagger is always reported, and the cost is that a component may
 *   have to spell one element out instead of two. That is the correct direction for a gate
 *   whose whole purpose is catching a defect nobody can see locally.
 *
 * A class list built at runtime is resolved by harvesting the string literals in the
 * expression, which covers ternaries, template literals and joined arrays. Only an
 * expression with no literals at all is unreadable, and that is still reported as SKIPPED
 * rather than passed, because a visible blind spot is worth more than a silent green.
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
/**
 * `covered` is true when this element, or anything above it, carries the opt-out.
 * `parent` indexes into the same array, or -1 for the root, so sibling order can be read.
 */
type El = { tag: string; classes: string[] | null; covered: boolean; parent: number };

const VOID = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'source', 'path', 'circle', 'rect', 'use']);

/**
 * The tags the flow rule excludes, taken verbatim from its selector:
 *
 *   :not(a, strong, em, del, span, input, code, br)
 *   + :not(a, strong, em, del, span, input, code, br, :where(.not-content *))
 *
 * The exclusion appears on BOTH sides, which is the part that is easy to miss. A row whose
 * items are each preceded by one of these tags cannot take the margin at all, so it cannot
 * stagger, and tagging it would be wrong rather than merely redundant: the opt-out exempts
 * the whole subtree, and a subtree holding authored prose needs the cascade.
 */
const FLOW_EXCLUDED = new Set(['a', 'strong', 'em', 'del', 'span', 'input', 'code', 'br']);

/**
 * The class names an element can carry, or null when nothing can be read.
 *
 * A plain string attribute is exact. A computed one is not, but it is rarely opaque: a
 * ternary, a template literal or a joined array still spells its class names out as string
 * literals in the source. Harvesting every literal inside the expression gives the UNION of
 * what the element might carry, which is the conservative reading. A false positive here is
 * a visible failure someone can argue with; a false negative is the silent stagger this gate
 * exists to prevent.
 *
 * Only an expression with no literals at all (a bare variable) is genuinely unreadable, and
 * that still returns null so it is reported as a blind spot rather than passed.
 */
function classesOf(attrs: string): string[] | null {
  const exact = attrs.match(/\b(?:class|className)\s*=\s*"([^"]*)"/);
  if (exact) return exact[1]!.split(/\s+/).filter(Boolean);

  const computed = attrs.match(/\b(?:class|className)\s*=\s*\{((?:[^{}]|\{[^{}]*\})*)\}/);
  if (!computed) return [];

  const found = new Set<string>();
  for (const lit of computed[1]!.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)) {
    const raw = lit[1] ?? lit[2] ?? lit[3] ?? '';
    // A template literal keeps its static parts; an interpolation is dropped, which can
    // leave a dangling modifier stem such as `nk-status--`. The stem is harmless: it is not
    // a real rule name, so it matches nothing in the CSS.
    for (const cls of raw.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)) if (cls) found.add(cls);
  }
  return found.size ? [...found] : null;
}

/**
 * Every rendered element in source order, element [0] being the root, each carrying whether
 * an ancestor already exempts it and which element contains it. Ancestry matters: the flow
 * selector excludes `:where(.not-content *)`, so one tagged row covers everything nested
 * inside it, and flagging those descendants again would be a false positive.
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
  const stack: Array<{ covered: boolean; index: number }> = [];
  const TOKEN = /<\/([a-zA-Z][\w.-]*)\s*>|<([a-zA-Z][\w.-]*)((?:[^>"']|"[^"]*"|'[^']*'|\{[^}]*\})*)>/g;

  for (const m of body.matchAll(TOKEN)) {
    if (m[1]) {
      stack.pop();
      continue;
    }
    const tag = m[2]!;
    const attrs = m[3] ?? '';
    const selfClosing = attrs.trimEnd().endsWith('/') || VOID.has(tag.toLowerCase());

    const classes = classesOf(attrs);
    const top = stack[stack.length - 1];
    const inherited = top?.covered === true;
    const covered = inherited || (classes?.includes(OPT_OUT) ?? false);
    const index = out.length;
    out.push({ tag, classes, covered, parent: top ? top.index : -1 });
    if (!selfClosing) stack.push({ covered, index });
  }
  return out;
}

// ── 3b. stylesheets a component imports from the published package ───────────────────
/**
 * A wrapper can present a published component's visual contract by importing that
 * component's stylesheet rather than authoring one. `DocCallout` and `DocTabs` both do it,
 * deliberately, so they cannot drift from the components they represent.
 *
 * That put the rows they lay out beyond this gate's reach: the `display: flex` lives in the
 * package, not in the component file or the theme, so the row was invisible and the check
 * passed on a component it had not actually read. Resolving the imported constants closes
 * that hole, and it is the reason the two wrappers can now be judged at all.
 */
const PKG_SRC = join(ROOT, 'packages/react/src');
const styleConstCache = new Map<string, Set<string>>();

function importedStyleClasses(src: string): Set<string> {
  const out = new Set<string>();
  const names = new Set<string>();
  for (const imp of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'@dizyx\/nockerl-react'/g)) {
    for (const n of imp[1]!.split(',')) {
      const name = n.trim();
      if (/^NOCKERL_[A-Z0-9_]*_STYLES$/.test(name)) names.add(name);
    }
  }
  if (!names.size) return out;

  for (const name of names) {
    const cached = styleConstCache.get(name);
    if (cached) {
      for (const c of cached) out.add(c);
      continue;
    }
    const found = new Set<string>();
    for (const rel of new Glob('**/*.tsx').scanSync(PKG_SRC)) {
      const text = readFileSync(join(PKG_SRC, rel), 'utf8');
      const decl = text.match(new RegExp(`${name}\\s*=\\s*\`([\\s\\S]*?)\``));
      if (decl) {
        flexGridClasses(decl[1]!, found);
        break;
      }
    }
    styleConstCache.set(name, found);
    for (const c of found) out.add(c);
  }
  return out;
}

// ── 4. verdict ───────────────────────────────────────────────────────────────────────
type Fail = { file: string; tag: string; cls: string; child: string; prev: string };
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
  for (const c of importedStyleClasses(src)) own.add(c);
  const isFlexGrid = (c: string) => own.has(c) || themeFlexGrid.has(c);

  /** Children of an element, in source order. */
  const childrenOf = (index: number) => els.filter((e) => e.parent === index);

  // The row need not be the root. `.cg__cards` is a flex row three levels down and the
  // cascade reaches it just the same, so every element is considered. An element already
  // covered by a tagged ancestor is exempt, which is what lets a component tag one row and
  // leave a sibling subtree of authored prose in the cascade.
  let dynamicSeen = false;
  let hit: Omit<Fail, 'file'> | null = null;
  for (let i = 0; i < els.length; i++) {
    const el = els[i]!;
    if (el.covered) continue;
    if (el.classes === null) {
      dynamicSeen = true;
      continue;
    }
    const cls = el.classes.find(isFlexGrid);
    if (!cls) continue;

    // Being a flex row is not enough to stagger. The flow rule only fires on an item whose
    // PRECEDING sibling also qualifies, and both sides exclude the same eight tags. So the
    // question is not "is this a row" but "does this row have an item that would actually
    // take the margin". Asking the narrower question is what lets a row whose items are
    // separated by spans pass honestly, instead of being tagged to silence a gate.
    const kids = childrenOf(i);
    for (let k = 1; k < kids.length; k++) {
      const child = kids[k]!;
      const prev = kids[k - 1]!;
      if (child.covered) continue;
      if (FLOW_EXCLUDED.has(child.tag.toLowerCase())) continue;
      if (FLOW_EXCLUDED.has(prev.tag.toLowerCase())) continue;
      hit = { tag: el.tag, cls, child: child.tag, prev: prev.tag };
      break;
    }
    if (hit) break;
  }

  if (hit) failures.push({ file: rel, ...hit });
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
  console.log(`\n✗ ${failures.length} flex or grid row(s) inside docs will stagger, and none carries "${OPT_OUT}":`);
  for (const f of failures) {
    console.log(`    ${f.file}  <${f.tag}> via .${f.cls}`);
    console.log(`      <${f.prev}> then <${f.child}>: neither tag is excluded, so <${f.child}> takes the margin.`);
  }
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
