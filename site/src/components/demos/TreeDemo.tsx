/**
 * TreeDemo: the live, interactive island for the shipped NockerlTree composite.
 *
 * The reusable recursive tree view now lives in the published package
 * (@dizyx/nockerl-react → NockerlTree); this file is only the showcase harness that
 * CONSUMES it. NockerlTree is a RECURSIVE, multi-level hierarchy (file tree / task subtree)
 * with per-node expand/collapse, depth indentation + guide lines, disclosure chevrons, and
 * either single-select (a cyan ring + cyan ink, no wash) or multi-select tri-state checkboxes that
 * propagate parent↔child. It is DISTINCT from list (flat rows), accordion (a few stacked
 * sections), and sidebar (nav). The full WAI-ARIA tree keyboard pattern (roving tabindex, one
 * tab stop) + the laws (card depth, flat rows, cyan-wash selection, file-type-ramp icons,
 * outline focus) are ENCODED IN THE PACKAGE now (packages/react/src/composites/Tree.tsx).
 *
 * Sourced from the shipped Android app (canonical, since Voice has no recursive tree): `FileTreeRow`
 * + `FileTreeViewModel` (files/*) flatten a recursive `FileTreeNode` depth-first into a
 * `LazyColumn`, each row indented by `depth * 20`, a folder carrying an `ExpandMore`/`ChevronRight`
 * disclosure, a `FolderOpen`/`Folder` or per-extension file icon from the `fileType` ramp, folder
 * names heavier than files, plus a `modifiedChildCount` count badge; `EpicListRow` / `ChildListRow`
 * (tasks/*) supply the multi-select task subtree.
 *
 * This harness supplies only the sample DATA (the two node forests + the initial expand/select
 * state) + the demo layout chrome.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a var(--token)
 * (docs/demo-token-contract.md); literals are pure geometry only.
 */
import { useMemo, useState } from 'react';
import { NockerlTree, type NockerlTreeFileType, type NockerlTreeNode } from '@dizyx/nockerl-react';

// Demo chrome only: the page layout around the two trees (the card, rows, indent rails,
// chevrons, icons, tri-state boxes, and their motion are the shipped NockerlTree). Every value is
// a token; literals are pure geometry.
const STYLES = `
.nk-tree-demo { font-family: var(--font-family-sans); display: grid; gap: var(--space-6); max-width: 480px; }
.nk-tree-demo__group { display: grid; gap: var(--space-2); }
.nk-tree-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0; }
.nk-tree-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin: 0; }
.nk-tree-demo__count b { color: var(--color-accent-primary); }
`;

/** Every descendant LEAF id under a node, used here only to tally the checked task count. */
function leafIds(node: NockerlTreeNode, out: string[] = []): string[] {
  if (node.kind === 'file') out.push(node.id);
  node.children?.forEach((c) => leafIds(c, out));
  return out;
}

// ─── Tiny builders (id derived from name) so the sample trees stay legible ─────
const dir = (name: string, children: NockerlTreeNode[], extra: Partial<NockerlTreeNode> = {}): NockerlTreeNode =>
  ({ id: name, name, kind: 'folder', children, ...extra });
const file = (name: string, fileType: NockerlTreeFileType = 'default', extra: Partial<NockerlTreeNode> = {}): NockerlTreeNode =>
  ({ id: name, name, kind: 'file', fileType, ...extra });

// The file/folder hierarchy: 3+ levels, an expanded branch, and every catalog state, meaning a
// count badge, a lazily-loading folder, an empty folder, and a disabled node.
const FILE_TREE: NockerlTreeNode[] = [
  dir('src', [
    dir('components', [
      dir('demos', [file('TreeDemo.tsx', 'typescript'), file('ButtonDemo.tsx', 'typescript')]),
      file('Example.astro'),
    ]),
    dir('styles', [file('tokens.css', 'css')], { count: 3 }),   // collapsed → COUNT badge
    dir('content', [], { loading: true }),                       // children resolve LAZILY
  ]),
  file('package.json', 'json'),
  dir('public', []),                                             // EMPTY folder
  dir('node_modules', [file('(locked)')], { disabled: true }),  // DISABLED, still legible
  file('logo.png', 'image'),
];

// A task subtree (multi-select, tri-state checkboxes propagating parent↔child).
const TASK_TREE: NockerlTreeNode[] = [
  dir(' · Native Android app', [
    file(' · File tree screen', 'kotlin'),
    dir(' · Tasks sheet', [
      file(' · Epic / child rows', 'kotlin'),
      file(' · Subtask badge', 'kotlin'),
    ]),
    file(' · SSE streaming', 'kotlin'),
  ]),
];

// The tree IS the shipped NockerlTree (which owns the compose contract now; this harness only
// composes NockerlTree and supplies the node data + expand/select state).

/**
 * The interactive showcase mounted on the Tree page. Two trees prove the pattern:
 *  • a SINGLE-SELECT file/folder hierarchy (3+ levels): recursive nesting with an expanded
 *    branch, depth indentation + guide lines, folder vs file-type icons, a selected leaf (soft
 *    cyan wash), a count badge on a collapsed folder, a lazily-loading child, an empty folder,
 *    and a disabled node;
 *  • a MULTI-SELECT task subtree: tri-state checkboxes that propagate parent↔child (checking a
 *    folder checks all descendants; partial selection reads "mixed").
 * Both are fully keyboard-operable (Arrow keys / Home / End / Enter / Space, one tab stop) and
 * honour prefers-reduced-motion.
 */
export default function TreeDemo() {
  // The epic + its "Tasks sheet" sub-folder, by their derived ids.
  const epic = TASK_TREE[0]!;
  const sheet = epic.children![1]!;

  const [fileExpanded, setFileExpanded] = useState<Set<string>>(() => new Set(['src', 'components', 'demos']));
  const [selected, setSelected] = useState<string | null>('TreeDemo.tsx');

  const [taskExpanded, setTaskExpanded] = useState<Set<string>>(() => new Set([epic.id, sheet.id]));
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set([epic.children![0]!.id, sheet.children![0]!.id]),
  );

  const taskLeaves = useMemo(() => TASK_TREE.flatMap((n) => leafIds(n)), []);
  const checkedCount = taskLeaves.filter((id) => checked.has(id)).length;

  return (
    <div className="nk-tree-demo">
      <style>{STYLES}</style>

      <div className="nk-tree-demo__group">
        <p className="nk-tree-demo__lbl">File tree: arrow-key nav · click a file to select (one cyan indicator)</p>
        <NockerlTree
          nodes={FILE_TREE} selectable="single" ariaLabel="Project files"
          expandedIds={fileExpanded} onToggleExpand={setFileExpanded} selectedId={selected} onSelect={setSelected}
        />
      </div>

      <div className="nk-tree-demo__group">
        <p className="nk-tree-demo__lbl">Task subtree: multi-select · checking a parent propagates (tri-state)</p>
        <NockerlTree
          nodes={TASK_TREE} selectable="multi" ariaLabel="Task subtree"
          expandedIds={taskExpanded} onToggleExpand={setTaskExpanded} checkedIds={checked} onCheckedChange={setChecked}
        />
      </div>

      <p className="nk-tree-demo__count">
        Selected file: <b>{selected ?? 'none'}</b> · checked subtasks: <b>{checkedCount}</b>. The island is live.
      </p>
    </div>
  );
}
