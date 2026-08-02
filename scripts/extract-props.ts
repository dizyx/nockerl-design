#!/usr/bin/env bun
/**
 * extract-props.ts: the CODE-DERIVED props tables (the drift-killer for the docs).
 *
 * The doc site's per-component React "Parameters" tables used to be hand-written in each
 * .mdx and rotted against the real TypeScript API (an audit found Button documenting
 * `leadingIcon: string` when it is `ReactNode`, and Pagination documenting a whole
 * fictional page-size API). This script is the enforceable replacement: it parses the
 * REAL props interfaces of every exported component in the published @dizyx/nockerl-react
 * package with the TypeScript compiler and emits site/src/data/props.json, which the
 * site's <PropsTable> reads by component name. A table can no longer drift from the type
 * because it IS the type.
 *
 * Mirrors the AST approach in scripts/compose-graph.ts: `ts.createSourceFile` over each
 * .tsx, then a hand-walk of the declarations (no type-checker/program: a per-file source
 * parse is enough because a component's OWN props all live in its own file).
 *
 * For each exported component (forwardRef<Ref, PropsType>(function X({…defaults…})) or
 * `function X({…defaults…}: PropsType)`), it resolves the props interface BY NAME in the
 * same file and extracts, for each member DECLARED IN THE INTERFACE BODY:
 *   • name        : the property name.
 *   • type        : the annotation, rendered to a compact one-line string.
 *   • optional    : the `?` flag (or a `| undefined` union member).
 *   • default     : the destructuring default in the component signature, else a
 *                   `@default` JSDoc tag if present.
 *   • description : the leading JSDoc comment text (HTML-escaped; `code` spans preserved).
 *
 * Inherited members from an `extends Omit<HTMLAttributes<…>, …>` clause are intentionally
 * NOT expanded; those are native DOM passthrough attributes, not the component's authored
 * API (this matches what the hand tables always documented). The extends clause is noted
 * in `extendsClause` per component so the page can still say "+ native <button> attrs".
 *
 * Output shape (site/src/data/props.json):
 *   {
 *     "generated": "scripts/extract-props.ts",
 *     "components": {
 *       "Button": {
 *         "file": "packages/react/src/primitives/Button.tsx",
 *         "propsType": "ButtonProps",
 *         "extendsClause": "Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'type'>",
 *         "props": [ { "name": "text", "type": "string", "optional": false, "default": null, "description": "Visible label." }, … ]
 *       },
 *       …
 *     }
 *   }
 *
 * Usage:  bun run scripts/extract-props.ts            (write + census)
 *         bun run scripts/extract-props.ts --json      (print the JSON only)
 */
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { Glob } from 'bun';

const REPO = join(import.meta.dir, '..');
const disp = (abs: string): string => relative(REPO, abs);
const JSON_ONLY = process.argv.includes('--json');

// Components live in the published react PACKAGE under these three roots (task spec).
const SRC_ROOT = join(REPO, 'packages/react/src');
const SUBDIRS = ['primitives', 'behaviors', 'composites'];
const OUT = join(REPO, 'site', 'src', 'data', 'props.json');

// ── types ─────────────────────────────────────────────────────────────────────
interface PropOut {
  name: string;
  type: string;
  optional: boolean;
  default: string | null;
  description: string;
}
interface ComponentOut {
  file: string;
  propsType: string;
  extendsClause: string | null;
  props: PropOut[];
}

// ── source discovery ───────────────────────────────────────────────────────────
function componentFiles(): string[] {
  const out: string[] = [];
  for (const dir of SUBDIRS) {
    const root = join(SRC_ROOT, dir);
    for (const rel of new Glob('*.tsx').scanSync(root)) out.push(join(root, rel));
  }
  return out.sort();
}

// ── JSDoc → description string ───────────────────────────────────────────────────
// Escape HTML then re-open the `inline code` spans the hand tables used (backticks and
// {@link X} become <code>). Newlines collapse to spaces so the cell stays one line.
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function jsdocText(raw: string): string {
  const escaped = escapeHtml(raw.replace(/\s*\n\s*/g, ' ').trim());
  // `code` → <code>code</code>
  return escaped.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
}

/** The leading JSDoc comment text + any `@default` tag value for a property node. */
function docOf(_sf: ts.SourceFile, node: ts.Node): { description: string; jsdocDefault: string | null } {
  const jsdocs = (ts.getJSDocCommentsAndTags(node) ?? []).filter(ts.isJSDoc);
  let description = '';
  let jsdocDefault: string | null = null;
  for (const jd of jsdocs) {
    const comment = typeof jd.comment === 'string' ? jd.comment : (jd.comment ?? []).map((c) => c.text).join('');
    if (comment) description = comment;
    for (const tag of jd.tags ?? []) {
      const tagName = tag.tagName.text;
      if (tagName === 'default' || tagName === 'defaultValue') {
        const c = typeof tag.comment === 'string' ? tag.comment : (tag.comment ?? []).map((x) => x.text).join('');
        if (c) jsdocDefault = c.trim();
      }
    }
  }
  return { description: description ? jsdocText(description) : '', jsdocDefault };
}

// ── type node → compact one-line string ─────────────────────────────────────────
// getText() over the source range preserves the AUTHORED type exactly (unions, generics,
// function types), which is what the docs should show. We just normalize whitespace.
function renderType(node: ts.TypeNode | undefined, sf: ts.SourceFile): string {
  if (!node) return 'unknown';
  return node.getText(sf).replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

// ── component signature discovery ────────────────────────────────────────────────
// Returns [componentName, propsTypeName, destructuringDefaults] for each exported
// component in a source file. Handles:
//   export const X = forwardRef<Ref, PropsType>(function X({ a = 1 }, ref) {…})
//   export function X({ a = 1 }: PropsType) {…}
type Sig = { name: string; propsType: string | null; defaults: Record<string, string> };

/** Pull `{ a = 1, b = 'x' }` destructuring defaults from a component's first parameter. */
function defaultsFromParam(param: ts.ParameterDeclaration | undefined, sf: ts.SourceFile): Record<string, string> {
  const out: Record<string, string> = {};
  if (!param || !ts.isObjectBindingPattern(param.name)) return out;
  for (const el of param.name.elements) {
    if (ts.isBindingElement(el) && el.initializer && ts.isIdentifier(el.name)) {
      out[el.name.text] = el.initializer.getText(sf).replace(/\s*\n\s*/g, ' ').trim();
    }
  }
  return out;
}

/** The type argument or param annotation naming a `*Props` type on a function expression. */
function propsTypeOfFn(fn: ts.FunctionExpression | ts.ArrowFunction | ts.FunctionDeclaration, typeArg: ts.TypeNode | undefined): string | null {
  // forwardRef<Ref, Props>(…) supplies Props as the 2nd type arg.
  if (typeArg && ts.isTypeReferenceNode(typeArg)) return typeArg.typeName.getText();
  // function X(props: Props): the first param's annotation.
  const p0 = fn.parameters[0];
  if (p0?.type && ts.isTypeReferenceNode(p0.type)) return p0.type.typeName.getText();
  return null;
}

function signaturesOf(sf: ts.SourceFile): Sig[] {
  const sigs: Sig[] = [];
  for (const st of sf.statements) {
    const isExported = ts.canHaveModifiers(st) && ts.getModifiers(st)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) continue;

    // export function X({…}: Props) {…}
    if (ts.isFunctionDeclaration(st) && st.name && /^[A-Z]/.test(st.name.text)) {
      const propsType = propsTypeOfFn(st, undefined);
      sigs.push({ name: st.name.text, propsType, defaults: defaultsFromParam(st.parameters[0], sf) });
      continue;
    }

    // export const X = forwardRef<Ref, Props>(function X({…}, ref) {…})
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || !/^[A-Z]/.test(d.name.text) || !d.initializer) continue;
        let expr: ts.Expression = d.initializer;
        let typeArg: ts.TypeNode | undefined;
        if (ts.isCallExpression(expr)) {
          const callee = expr.expression;
          const isForwardRef = (ts.isIdentifier(callee) && callee.text === 'forwardRef') || (ts.isPropertyAccessExpression(callee) && callee.name.text === 'forwardRef') || (ts.isIdentifier(callee) && callee.text === 'memo');
          if (isForwardRef) {
            typeArg = expr.typeArguments?.[1] ?? expr.typeArguments?.[0];
            const arg0 = expr.arguments[0];
            if (arg0 && (ts.isFunctionExpression(arg0) || ts.isArrowFunction(arg0))) {
              const propsType = propsTypeOfFn(arg0, typeArg);
              sigs.push({ name: d.name.text, propsType, defaults: defaultsFromParam(arg0.parameters[0], sf) });
              continue;
            }
          }
        }
        // export const X = (props: Props) => {…}
        if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) {
          const propsType = propsTypeOfFn(expr, undefined);
          sigs.push({ name: d.name.text, propsType, defaults: defaultsFromParam(expr.parameters[0], sf) });
        }
      }
    }
  }
  return sigs;
}

// ── props interface extraction ────────────────────────────────────────────────
function interfaceByName(sf: ts.SourceFile, name: string): ts.InterfaceDeclaration | ts.TypeAliasDeclaration | null {
  for (const st of sf.statements) {
    if (ts.isInterfaceDeclaration(st) && st.name.text === name) return st;
    if (ts.isTypeAliasDeclaration(st) && st.name.text === name) return st;
  }
  return null;
}

/** The `extends Foo<…>` heritage clause text (the DOM-passthrough base), if any. */
function extendsClauseOf(decl: ts.InterfaceDeclaration, sf: ts.SourceFile): string | null {
  const clauses = decl.heritageClauses ?? [];
  for (const hc of clauses) {
    if (hc.token === ts.SyntaxKind.ExtendsKeyword) {
      return hc.types.map((t) => t.getText(sf).replace(/\s*\n\s*/g, ' ').trim()).join(', ');
    }
  }
  return null;
}

/** Members declared directly in the interface body (NOT the inherited extends base). */
function membersOf(decl: ts.InterfaceDeclaration | ts.TypeAliasDeclaration): ts.PropertySignature[] {
  const out: ts.PropertySignature[] = [];
  if (ts.isInterfaceDeclaration(decl)) {
    for (const m of decl.members) if (ts.isPropertySignature(m)) out.push(m);
  } else if (ts.isTypeLiteralNode(decl.type)) {
    for (const m of decl.type.members) if (ts.isPropertySignature(m)) out.push(m);
  }
  return out;
}

function extractComponent(sf: ts.SourceFile, sig: Sig): ComponentOut | null {
  if (!sig.propsType) return null;
  const decl = interfaceByName(sf, sig.propsType);
  if (!decl) return null;
  const extendsClause = ts.isInterfaceDeclaration(decl) ? extendsClauseOf(decl, sf) : null;
  const props: PropOut[] = [];
  for (const m of membersOf(decl)) {
    if (!m.name || !(ts.isIdentifier(m.name) || ts.isStringLiteral(m.name))) continue;
    const name = m.name.text;
    let typeStr = renderType(m.type, sf);
    // `?` OR an explicit `| undefined` union both mean optional.
    let optional = !!m.questionToken;
    if (!optional && / \| undefined$/.test(typeStr)) {
      optional = true;
      typeStr = typeStr.replace(/ \| undefined$/, '');
    }
    const { description, jsdocDefault } = docOf(sf, m);
    const def = sig.defaults[name] ?? jsdocDefault ?? null;
    props.push({ name, type: typeStr, optional, default: def, description });
  }
  return { file: disp(sf.fileName), propsType: sig.propsType, extendsClause, props };
}

// ── run ─────────────────────────────────────────────────────────────────────────
const files = componentFiles();
const components: Record<string, ComponentOut> = {};
const skipped: string[] = [];

for (const abs of files) {
  const sf = ts.createSourceFile(abs, readFileSync(abs, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const sig of signaturesOf(sf)) {
    const comp = extractComponent(sf, sig);
    if (!comp) {
      skipped.push(`${sig.name} (${disp(abs)}${sig.propsType ? `: ${sig.propsType} not found` : ': no props type'})`);
      continue;
    }
    if (comp.props.length === 0) {
      // A component whose entire API is inherited DOM attrs (no own props): record it so
      // the page can still resolve the name, but there is nothing authored to tabulate.
      skipped.push(`${sig.name} (${disp(abs)}: 0 own props)`);
    }
    components[sig.name] = comp;
  }
}

const sorted: Record<string, ComponentOut> = {};
for (const k of Object.keys(components).sort()) sorted[k] = components[k]!;

const out = { generated: 'scripts/extract-props.ts', components: sorted };

if (JSON_ONLY) {
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

const names = Object.keys(sorted);
const total = names.reduce((n, k) => n + sorted[k]!.props.length, 0);
console.log(`extract-props · ${names.length} components · ${total} props`);
console.log(`  → site/src/data/props.json`);
console.log(`  ${names.join(', ')}`);
if (skipped.length) console.log(`\nℹ ${skipped.length} exports without a tabulatable own-props interface (not written / empty):\n    ${skipped.join('\n    ')}`);
process.exit(0);
