#!/usr/bin/env bun
/**
 * compose-graph.ts: the COMPOSITION-CONTRACT gate.
 *
 * The code-derived, enforceable replacement for the old hand-maintained dependency
 * map. It reads every component's `export const compose` contract (see
 * site/src/components/compose-contract.ts), parses the REAL JSX composition graph with
 * the TypeScript compiler, and emits site/src/data/compose-graph.json + a console census:
 *
 *   • tiers          leaf / optional / required, derived per contract.
 *   • slots+accepts  what each container declares.
 *   • consumers      who actually renders whom (the live import/JSX graph).
 *   • VIOLATIONS
 *       - raw-facsimile          a file renders a raw facsimile element
 *                                (button/input/textarea/select/a[href]/hr/progress or a
 *                                role= reimplementation) it does not `own` → compose the
 *                                real primitive. This is the hand-rolled-facsimile census.
 *       - off-accepts-child      a container is slotted with a design component NOT in
 *                                its slot's `accepts` (literal JSX children / named-prop JSX).
 *       - required-slot-unfilled a required slot left empty at a usage site.
 *       - missing-contract       a shipped design component (tier 1-4) with no `compose`.
 *       - duplicate-contract     two files declare `compose` for the same component.
 *
 * Report mode (default) prints + writes the JSON and exits 0. `--strict` exits 1 on any
 * violation (the Phase-4 blocking gate). `--json` prints only the JSON.
 *
 * Contracts live on the CANONICAL file (primitives/X.tsx if it exists, else demos/XDemo);
 * facsimile checks are per-FILE (a demo page that hand-rolls a control is flagged too;
 * "demos use real components" is the invariant). Usage-site slot checks fire on LITERAL
 * JSX only; content reached via a const/helper/`.map()` is opaque (reported, never flagged).
 *
 * Usage:  bun run scripts/compose-graph.ts [--strict] [--json]
 */
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { TIER, TIER_NAME, nameOf, listComponentFiles, isPackageFile } from './registry';

const REPO = join(import.meta.dir, '..');
const disp = (abs: string): string => relative(REPO, abs);

const STRICT = process.argv.includes('--strict');
const JSON_ONLY = process.argv.includes('--json');
// The docs "Composition" page imports this generated JSON; the gate regenerates it, so it
// never rots (a stale file is caught by the compose:graph freshness check in CI/harness).
const OUT = join(import.meta.dir, '..', 'site', 'src', 'data', 'compose-graph.json');

// ── facsimile map: raw tag / role → the primitive it duplicates ──────────────
// A file may render one of these ONLY if its component lists the key in `compose.owns`
// (it IS that primitive). Otherwise it is a hand-rolled copy → compose the real one.
const FACSIMILE: Record<string, string> = {
  button: 'Button / IconButton',
  input: 'TextField / Checkbox / Slider / SearchField',
  textarea: 'TextArea',
  select: 'Select',
  a: 'Link',
  hr: 'Divider',
  progress: 'ProgressBar',
  'role=progressbar': 'ProgressBar',
  'role=switch': 'Switch',
  'role=checkbox': 'Checkbox',
  'role=radio': 'RadioGroup',
  'role=radiogroup': 'RadioGroup',
  'role=slider': 'Slider',
  'role=tab': 'Tabs',
  'role=tablist': 'Tabs',
  'role=menu': 'Menu',
  'role=menuitem': 'Menu',
};
const ROLE_FACSIMILE = new Set(
  Object.keys(FACSIMILE).filter((k) => k.startsWith('role=')).map((k) => k.slice(5)),
);

// ── contract types (mirror compose-contract.ts, as parsed from source) ───────
type Slot = { accepts: string[] | '*'; required: boolean };
type Contract = { tier: 'leaf' | 'optional' | 'required'; slots: Record<string, Slot>; owns: string[] };
type Violation = { type: string; component: string; detail: string; file: string; line: number };
type Elem = ts.JsxElement | ts.JsxSelfClosingElement;

const files = listComponentFiles();
const known = new Set(files.map(nameOf));
for (const k of Object.keys(TIER)) known.add(k); // TIER-registered names without their own file (TextField/TextArea live in Field.tsx)
const isDesign = (n: string): boolean => known.has(n) && (TIER[n] ?? 0) >= 1 && (TIER[n] ?? 0) <= 4;

// ── tiny static evaluator for the contract object literal ────────────────────
function evalNode(n: ts.Node): unknown {
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(n)) return n.elements.map(evalNode);
  if (ts.isObjectLiteralExpression(n)) {
    const o: Record<string, unknown> = {};
    for (const p of n.properties) {
      if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) {
        o[p.name.text] = evalNode(p.initializer);
      }
    }
    return o;
  }
  if (ts.isAsExpression(n) || ts.isSatisfiesExpression(n) || ts.isParenthesizedExpression(n)) return evalNode(n.expression);
  return undefined;
}

// ── read the `export const compose = {...}` contract from a source file ───────
function readContract(sf: ts.SourceFile): Contract | null {
  let raw: Record<string, unknown> | null = null;
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    if (!st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.name.text === 'compose' && d.initializer) {
        const v = evalNode(d.initializer);
        if (v && typeof v === 'object') raw = v as Record<string, unknown>;
      }
    }
  }
  if (!raw) return null;
  const owns = Array.isArray(raw.owns) ? (raw.owns as string[]) : [];
  const slotsRaw = (raw.slots as Record<string, { accepts: string[] | '*'; required?: boolean }>) ?? null;
  const slots: Record<string, Slot> = {};
  if (slotsRaw) {
    for (const [k, v] of Object.entries(slotsRaw)) {
      slots[k] = { accepts: v.accepts === '*' ? '*' : ((v.accepts as string[]) ?? []), required: !!v.required };
    }
  }
  const tier = Object.values(slots).some((s) => s.required) ? 'required' : slotsRaw ? 'optional' : 'leaf';
  return { tier, slots, owns };
}

// ── JSX helpers ──────────────────────────────────────────────────────────────
const tagText = (t: ts.JsxTagNameExpression): string => t.getText();
const isIntrinsic = (tag: string): boolean => /^[a-z]/.test(tag);
const openOf = (n: Elem): ts.JsxOpeningElement | ts.JsxSelfClosingElement => (ts.isJsxElement(n) ? n.openingElement : n);
const elemTag = (n: Elem): string => tagText(openOf(n).tagName);

function attrs(open: ts.JsxOpeningElement | ts.JsxSelfClosingElement): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of open.attributes.properties) {
    if (ts.isJsxAttribute(p) && ts.isIdentifier(p.name)) {
      const init = p.initializer;
      if (init && ts.isStringLiteral(init)) m.set(p.name.text, init.text);
      else if (init && ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression)) m.set(p.name.text, init.expression.text);
      else m.set(p.name.text, ''); // present but non-string (e.g. {expr}); value unknown
    }
  }
  return m;
}

/** facsimile keys a raw element matches (tag + any role). */
function facsimileKeys(tag: string, a: Map<string, string>): string[] {
  const keys: string[] = [];
  if (tag === 'a') { if (a.has('href')) keys.push('a'); }
  else if (FACSIMILE[tag]) keys.push(tag);
  const role = a.get('role');
  if (role && ROLE_FACSIMILE.has(role)) keys.push(`role=${role}`);
  return keys;
}

// JSX elements reachable from an expression WITHOUT crossing a call (so `.map(...)`
// bodies stay opaque): direct element, paren, && / || , ?: , and fragments.
function elementsInExpr(n: ts.Node, out: Elem[] = []): Elem[] {
  if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) out.push(n);
  else if (ts.isParenthesizedExpression(n)) elementsInExpr(n.expression, out);
  else if (ts.isBinaryExpression(n)) { elementsInExpr(n.left, out); elementsInExpr(n.right, out); }
  else if (ts.isConditionalExpression(n)) { elementsInExpr(n.whenTrue, out); elementsInExpr(n.whenFalse, out); }
  else if (ts.isJsxFragment(n)) for (const c of n.children) elementsInExpr(c, out);
  return out;
}

// direct JSX element children of a container (incl. those inside a simple {expr} wrapper)
function childElements(children: ts.NodeArray<ts.JsxChild>): Elem[] {
  const out: Elem[] = [];
  for (const c of children) {
    if (ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c)) out.push(c);
    else if (ts.isJsxExpression(c) && c.expression) elementsInExpr(c.expression, out);
  }
  return out;
}

// ── graph state ───────────────────────────────────────────────────────────────
const violations: Violation[] = [];
let opaqueSlotFills = 0;
const fileContract: Record<string, Contract | null> = {};
const contracts: Record<string, Contract | null> = {}; // canonical, per component
const renders: Record<string, Set<string>> = {};
const canonFile: Record<string, string> = {};
const contractFile: Record<string, string> = {};
const parsed: Record<string, ts.SourceFile> = {};

const lineOf = (sf: ts.SourceFile, node: ts.Node): number => sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;

// ── pass 1: read every file's contract; build the canonical per-component map ──
for (const rel of files) {
  const comp = nameOf(rel);
  renders[comp] ||= new Set();
  // canonical file for a component: prefer primitives/ over demos/
  if (!canonFile[comp] || (isPackageFile(rel) && !isPackageFile(canonFile[comp]))) canonFile[comp] = rel;
  if (!rel.endsWith('.tsx')) { fileContract[rel] = null; continue; }
  const sf = ts.createSourceFile(rel, readFileSync(rel, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  parsed[rel] = sf;
  const c = readContract(sf);
  fileContract[rel] = c;
  if (c) {
    if (contracts[comp]) violations.push({ type: 'duplicate-contract', component: comp, detail: `also declared in ${contractFile[comp]}`, file: disp(rel), line: 1 });
    contracts[comp] = c;
    contractFile[comp] = rel;
  } else contracts[comp] ??= null;
}

// ── pass 2: walk the JSX of every .tsx, using the file's own `owns` + the
//    canonical child contracts for slot checks ─────────────────────────────────
for (const rel of files) {
  const sf = parsed[rel];
  if (!sf) continue;
  const comp = nameOf(rel);
  const hier = TIER[comp] ?? 0;
  const owns = new Set(fileContract[rel]?.owns ?? []);
  const exemptFacsimile = hier === 5; // docs-infra may render raw scaffolding

  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const open = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = tagText(open.tagName);
      const a = attrs(open);

      if (isIntrinsic(tag)) {
        if (!exemptFacsimile) {
          for (const key of facsimileKeys(tag, a)) {
            if (!owns.has(key)) {
              violations.push({
                type: 'raw-facsimile', component: comp,
                detail: `<${tag}${key.startsWith('role=') ? ` role="${key.slice(5)}"` : ''}> → use ${FACSIMILE[key]}`,
                file: disp(rel), line: lineOf(sf, node),
              });
            }
          }
        }
      } else if (isDesign(tag)) {
        if (tag !== comp) (renders[comp] ??= new Set()).add(tag); // skip self (a demo rendering its own component)

        // slot checks against the rendered child's canonical contract
        const cc = contracts[tag];
        if (cc && Object.keys(cc.slots).length) {
          const kids: Elem[] = ts.isJsxElement(node) ? childElements(node.children) : [];
          for (const [slotName, slot] of Object.entries(cc.slots)) {
            if (slotName === 'default') {
              const present = ts.isJsxElement(node) && node.children.some((c) => !(ts.isJsxText(c) && c.text.trim() === ''));
              if (slot.required && !present) violations.push({ type: 'required-slot-unfilled', component: comp, detail: `<${tag}> requires children`, file: disp(rel), line: lineOf(sf, node) });
              if (Array.isArray(slot.accepts)) for (const kid of kids) {
                const kt = elemTag(kid);
                if (!isIntrinsic(kt) && isDesign(kt) && !slot.accepts.includes(kt)) violations.push({ type: 'off-accepts-child', component: comp, detail: `<${tag}> got <${kt}> (accepts: ${slot.accepts.join(', ')})`, file: disp(rel), line: lineOf(sf, kid) });
              }
            } else {
              const prop = open.attributes.properties.find((p) => ts.isJsxAttribute(p) && ts.isIdentifier(p.name) && p.name.text === slotName) as ts.JsxAttribute | undefined;
              if (slot.required && !prop) violations.push({ type: 'required-slot-unfilled', component: comp, detail: `<${tag} ${slotName}={…}> is required`, file: disp(rel), line: lineOf(sf, node) });
              if (prop?.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
                const els = elementsInExpr(prop.initializer.expression);
                if (Array.isArray(slot.accepts)) {
                  for (const el of els) {
                    const kt = elemTag(el);
                    if (!isIntrinsic(kt) && isDesign(kt) && !slot.accepts.includes(kt)) violations.push({ type: 'off-accepts-child', component: comp, detail: `<${tag} ${slotName}> got <${kt}> (accepts: ${slot.accepts.join(', ')})`, file: disp(rel), line: lineOf(sf, el) });
                  }
                  if (!els.length) opaqueSlotFills++;
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// ── missing-contract census (one per shipped design component) ────────────────
const designComps = new Set<string>();
for (const rel of files) { const c = nameOf(rel); const h = TIER[c] ?? 0; if (h >= 1 && h <= 4) designComps.add(c); }
for (const comp of [...designComps].sort()) {
  if (!contracts[comp]) violations.push({ type: 'missing-contract', component: comp, detail: 'no `export const compose` declared', file: canonFile[comp] ? disp(canonFile[comp]) : '?', line: 1 });
}

// ── assemble the graph ───────────────────────────────────────────────────────
const consumers: Record<string, string[]> = {};
for (const [from, set] of Object.entries(renders)) for (const to of set) (consumers[to] ||= []).push(from);

const componentsOut: Record<string, unknown> = {};
for (const comp of [...designComps].sort()) {
  const c = contracts[comp];
  const hier = TIER[comp] ?? 0;
  componentsOut[comp] = {
    hierTier: TIER_NAME[hier] ?? 'unregistered',
    tier: c?.tier ?? null,
    slots: c?.slots ?? null,
    owns: c?.owns ?? [],
    hasContract: !!c,
    renders: [...(renders[comp] ?? [])].sort(),
    consumers: (consumers[comp] ?? []).sort(),
  };
}

const byType: Record<string, number> = {};
for (const v of violations) byType[v.type] = (byType[v.type] ?? 0) + 1;
const tierCounts = { leaf: 0, optional: 0, required: 0 };
for (const comp of designComps) { const c = contracts[comp]; if (c) tierCounts[c.tier]++; }

const graph = {
  generated: 'scripts/compose-graph.ts',
  counts: {
    components: designComps.size,
    withContract: [...designComps].filter((c) => contracts[c]).length,
    ...tierCounts,
    violations: violations.length,
    byType,
  },
  coverage: { opaqueSlotFills },
  components: componentsOut,
  violations: violations.sort((a, b) => a.type.localeCompare(b.type) || a.component.localeCompare(b.component) || a.file.localeCompare(b.file)),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(graph, null, 2));

if (JSON_ONLY) { console.log(JSON.stringify(graph, null, 2)); process.exit(0); }

// ── console census ───────────────────────────────────────────────────────────
console.log(`compose-graph · ${graph.counts.components} shipped components · ${graph.counts.withContract} with a contract`);
console.log(`  tiers: ${tierCounts.leaf} leaf · ${tierCounts.optional} optional · ${tierCounts.required} required`);
console.log(`  → site/src/data/compose-graph.json\n`);
if (violations.length) {
  console.log(`✗ ${violations.length} violations:`);
  for (const [t, n] of Object.entries(byType).sort()) console.log(`    ${n.toString().padStart(4)}  ${t}`);
  console.log('');
  const shown = violations.slice(0, 50);
  for (const v of shown) console.log(`  [${v.type}] ${v.component}  ${v.detail}  (${v.file}:${v.line})`);
  if (violations.length > shown.length) console.log(`  … +${violations.length - shown.length} more (see site/src/data/compose-graph.json)`);
} else {
  console.log('✓ no violations: every container composes real, approved children.');
}
if (opaqueSlotFills) console.log(`\nℹ ${opaqueSlotFills} named-slot fills reached via const/helper: opaque to static analysis (not flagged).`);

if (STRICT && violations.length) { console.log('\n✗ compose-graph failed (strict).'); process.exit(1); }
process.exit(0);
