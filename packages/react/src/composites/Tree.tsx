/**
 * NockerlTree: the Tier-3 recursive TREE-VIEW composite. ONE home for the multi-level
 * hierarchy (file tree / task subtree) the dashboard + any nested-list surface needs, so a
 * tree can never drift: recursive nesting with per-node expand/collapse, depth indentation +
 * guide-line rails, disclosure chevrons, single-select (a cyan ring + cyan ink, no fill) OR
 * multi-select tri-state checkboxes that propagate parent↔child, and the full WAI-ARIA tree
 * keyboard pattern (roving tabindex, one tab stop).
 *
 * DISTINCT from its neighbours (do not re-derive in a demo):
 *   • list      = flat sectioned rows (NockerlListItem).
 *   • accordion = a few stacked collapsible sections.
 *   • tree      = a RECURSIVE, multi-level hierarchy with per-node expand/collapse.
 * Reach for NockerlTree only when nesting is genuinely recursive.
 *
 * COMPOSITION NOTE (a11y decision, preserved from the source island): a tree `treeitem` is a
 * genuinely DISTINCT control from NockerlListItem: it is the focusable role="treeitem" carrying
 * aria-level / aria-setsize / aria-posinset in a single-tab-stop roving-tabindex tree. Nesting a
 * NockerlListItem <button> inside a role="treeitem" is a WAI-ARIA anti-pattern (double tab stop,
 * breaks tree keyboard nav), so the node row is the tree's OWN control (it owns that <button>).
 * The tri-state boxes are decorative spans (the treeitem owns aria-checked), not NockerlCheckbox
 * facsimiles (a real <input role=checkbox> nested in the treeitem would be a second control).
 * NockerlIcon supplies every glyph. This keeps the tree's a11y correct AND its visuals verbatim.
 *
 * Design laws encoded here:
 *   - the CARD lifts (neutral shadow + catch-light, never a glow); rows are FLAT (depth = card
 *     + indentation).
 *   - feedback animates a neutral wash + scale + the chevron rotation only (no fill swap).
 *   - a SELECTED node = a selection-weight cyan ring + cyan ink, with no fill (NOT a glow,
 *     NOT a left rail, per LAW 6).
 *   - guide lines + chevron + file icons ride the divider + muted tokens; file-type icons use
 *     the categorical file-type ramp (data color, never the brand cyan).
 *   - focus is an OUTLINE ring on the active row, never a colored shadow.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a var(--token); literals
 * remain only for pure geometry (icon boxes, the 20px indent step, hairline thickness, curves).
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { NockerlIcon } from '../primitives/Icon.js';
import { NockerlSurface } from '../primitives/Surface.js';
import type { ComposeContract } from '../compose-contract.js';

// ─── File-type tint ramp: the categorical data tokens (NEVER the brand cyan) ──
export type NockerlTreeFileType = 'folder' | 'typescript' | 'kotlin' | 'json' | 'css' | 'image' | 'default';
const FILE_TINT: Record<NockerlTreeFileType, string> = {
  folder: 'var(--color-file-type-folder)', typescript: 'var(--color-file-type-typescript)',
  kotlin: 'var(--color-file-type-kotlin)', json: 'var(--color-file-type-json)',
  css: 'var(--color-file-type-css)', image: 'var(--color-file-type-image)',
  default: 'var(--color-file-type-default)',
};

/** Whether the tree drives ONE selected node (single) or a SET of tri-state checked leaves (multi). */
export type NockerlTreeSelectable = 'single' | 'multi';

/**
 * A node in the recursive forest. A folder has `children`; a leaf does not. Optional per-node
 * states cover the catalog: a trailing count badge, a lazily-loading child set, an empty folder,
 * a disabled node.
 */
export interface NockerlTreeNode {
  /** Stable identity: keys React, the expanded/selected/checked sets, and nav order. */
  id: string;
  /** The row's visible label + accessible name. */
  name: string;
  /** A `folder` discloses children; a `file` is a leaf. */
  kind: 'folder' | 'file';
  /** File-type tint key (leaves only). Rides the categorical ramp, never the brand cyan. */
  fileType?: NockerlTreeFileType;
  /** Child nodes (folders). Absent/empty on a leaf; `[]` is an empty, expandable folder. */
  children?: NockerlTreeNode[];
  /** Trailing count badge (modified-child / done-total). */
  count?: number;
  /** Children resolve lazily: the first expand shows a spinner row. */
  loading?: boolean;
  /** Inert + clearly-seen (never invisible). */
  disabled?: boolean;
}

// The CARD carries the depth; rows are FLAT. Feedback animates a neutral wash + a subtle scale;
// the chevron rotates (the only interpolated reveal). Bg / hairline / radius / sheen come from
// the NockerlSurface primitive; this block keeps only the tree chrome + the off-ladder drop
// shadow. Every value is a token; literals are pure geometry (icon boxes, 20px indent, curves).
export const NOCKERL_TREE_STYLES = `
/* The containing CARD: depth lives here (card radius, lit from above, never a glow). */
.nk-tree { overflow: hidden; padding: var(--space-2) 0;
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent), var(--nk-surface-sheen); }
/* The tree CONTAINER never shows a ring (roving tabindex lives on the rows). Suppress its
   native outline on any focus (it draws nothing) while the visible keyboard ring is drawn
   by .nk-tree__row:focus-visible below, so keyboard users still see focus on the active row. */
.nk-tree:focus { outline: none; }
.nk-tree [role="group"] { padding: 0; margin: 0; }

/* A ROW: flat, no shadow; flex keeps chevron + icon + label aligned per depth. */
.nk-tree__row { position: relative; display: flex; align-items: center; gap: var(--space-2);
  min-height: calc(var(--space-6) + var(--space-1)); padding-right: var(--space-3);   /* 28: dense tree row */
  background: transparent; color: var(--color-on-card); cursor: pointer; user-select: none;
  transition: background-color .12s, filter .12s, transform .12s var(--motion-easing-standard); }
.nk-tree__row:hover:not(.nk-tree__row--disabled) { background: var(--color-surface-highlight); }
.nk-tree__row:active:not(.nk-tree__row--disabled) { transform: scale(.995);
  background: color-mix(in srgb, var(--color-surface-highlight) 50%, transparent); }
.nk-tree__row:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(-1 * var(--space-0-5)); }
/* SELECTED: a thin cyan ring + the selected file's own icon/label cyan. NO wash, no left
   rail (LAW 6, reduce-fills: selection reads by outline + ink, never a fill and never a
   vertical stripe). The ring is an INSET box-shadow at the selection weight, so it costs no
   layout box and the row never shifts. Hover keeps the neutral surface highlight. */
.nk-tree__row--selected { box-shadow: inset 0 0 0 var(--space-px) color-mix(in srgb, var(--color-accent-primary) 45%, transparent); }
.nk-tree__row--selected:hover:not(.nk-tree__row--disabled) { background: var(--color-surface-highlight); }
.nk-tree__row--disabled { cursor: not-allowed; opacity: .5; }    /* inert but still legible */

/* Indent rails: one cell per ancestor depth, each a vertical GUIDE LINE on the divider. */
.nk-tree__indent { flex: 0 0 auto; display: flex; align-self: stretch; }
.nk-tree__rail { width: 20px; align-self: stretch; position: relative; }   /* 20px: the depth*20 step */
.nk-tree__rail::before { content: ""; position: absolute; top: 0; bottom: 0; left: 50%; width: 1px;
  background: var(--color-divider); }

/* The chevron rotates 90deg on expand (interpolatable); a leaf reserves the same box. */
.nk-tree__chev { flex: 0 0 auto; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center;
  border: 0; padding: 0; margin: 0; background: transparent; cursor: pointer;
  color: var(--color-on-card-muted); border-radius: var(--radius-track);
  transition: transform .2s var(--motion-easing-standard), color .12s, background-color .12s; }
.nk-tree__chev:hover { color: var(--color-on-card); background: color-mix(in srgb, var(--color-on-card) 8%, transparent); }
.nk-tree__chev:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-px); }
.nk-tree__chev--open { transform: rotate(90deg); color: var(--color-on-card); }
.nk-tree__chev--leaf { visibility: hidden; }     /* keeps the alignment box, draws nothing */
.nk-tree__chev svg { display: block; width: 16px; height: 16px; }

/* Multi-select checkbox: tri-state (the check / indeterminate idiom), on accent. */
.nk-tree__cb { flex: 0 0 auto; width: 16px; height: 16px; border-radius: var(--radius-track);
  border: var(--space-px) solid var(--color-divider); background: color-mix(in srgb, var(--color-on-card) 6%, transparent);
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 30%, transparent);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--color-on-accent); transition: background-color .12s, border-color .12s; }
.nk-tree__cb--on, .nk-tree__cb--mixed { background: var(--color-accent-primary); border-color: var(--color-accent-primary); box-shadow: none; }
.nk-tree__cb svg { display: block; width: 12px; height: 12px; }
.nk-tree__cb-bar { width: 8px; height: 2px; border-radius: var(--radius-track); background: var(--color-on-accent); }

/* File / folder icon: folder + file-type tints ride the categorical ramp (data color). */
.nk-tree__icon { flex: 0 0 auto; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; }
.nk-tree__icon svg { display: block; width: 16px; height: 16px; }

/* Label: folders read heavier than files (the canonical weight split). */
.nk-tree__label { flex: 1 1 auto; min-width: 0; font-size: var(--font-size-13); line-height: var(--font-line-height-16);
  color: var(--color-on-card); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nk-tree__label--folder { font-weight: var(--font-weight-medium); }
.nk-tree__label--muted { color: var(--color-on-card-muted); font-style: italic; }

/* Trailing count badge: accent-soft wash + cyan label (modified-child / done-total). */
.nk-tree__badge { flex: 0 0 auto; font-size: var(--font-size-10); font-weight: var(--font-weight-semibold);
  font-family: var(--font-family-mono); line-height: 1; padding: var(--space-0-5) var(--space-1);
  border-radius: var(--radius-track); color: var(--color-accent-primary); background: var(--color-accent-primary-soft);
  border: var(--space-px) solid color-mix(in srgb, var(--color-accent-primary) 26%, transparent); }

/* A lazily-loading child row is a small spinner on the muted track. */
.nk-tree__spin { width: 13px; height: 13px; border-radius: var(--radius-pill);
  border: var(--space-0-5) solid var(--color-on-card-muted); border-top-color: transparent;
  display: inline-block; animation: nk-tree-sp .7s linear infinite; }
@keyframes nk-tree-sp { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .nk-tree__row, .nk-tree__chev { transition: none; }
  .nk-tree__spin { animation-duration: 1.4s; }
}
`;

// ─── Inline glyphs (the shared NockerlIcon primitive: currentColor so each slot tints) ───
// One chevron, rotated by CSS: right at rest, down when expanded (the canonical
// ChevronRight → ExpandMore, made interpolatable).
const IconChevron = <NockerlIcon path="m9 6 6 6-6 6" />;
const IconCheck = <NockerlIcon path="M20 6 9 17l-5-5" />;
// FolderOpen vs Folder: the open/closed disclosure icon (canonical FileTreeRow).
const IconFolder = (open: boolean) =>
  open ? (
    <NockerlIcon>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2H6l-2 9" />
      <path d="M4 18h14l2-7H6z" />
    </NockerlIcon>
  ) : (
    <NockerlIcon path="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
  );
const IconCode = <NockerlIcon path="m8 7-5 5 5 5m8-10 5 5-5 5" />;   // shared code glyph (ts / kotlin / css)
const FILE_ICON: Record<NockerlTreeFileType, React.ReactNode> = {
  folder: IconFolder(false), typescript: IconCode, kotlin: IconCode, css: IconCode,
  json: <NockerlIcon path="M7 4a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2M17 4a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2" />,
  image: (
    <NockerlIcon>
      <path d="m21 15-5-5L5 21" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
    </NockerlIcon>
  ),
  default: (
    <NockerlIcon>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </NockerlIcon>
  ),
};

/** Depth-first list of the visible (expanded-respecting) node ids: the nav order. */
function visibleIds(nodes: NockerlTreeNode[], expanded: Set<string>, out: string[] = []): string[] {
  for (const n of nodes) {
    out.push(n.id);
    if (n.kind === 'folder' && expanded.has(n.id) && n.children) visibleIds(n.children, expanded, out);
  }
  return out;
}

/** Every descendant LEAF id under a node: the targets for tri-state propagation. */
function leafIds(node: NockerlTreeNode, out: string[] = []): string[] {
  if (node.kind === 'file') out.push(node.id);
  node.children?.forEach((c) => leafIds(c, out));
  return out;
}

/** Find a node + its parent chain by id (for ArrowLeft → parent navigation). */
function findPath(nodes: NockerlTreeNode[], id: string, chain: NockerlTreeNode[] = []): NockerlTreeNode[] | null {
  for (const n of nodes) {
    if (n.id === id) return [...chain, n];
    if (n.children) {
      const hit = findPath(n.children, id, [...chain, n]);
      if (hit) return hit;
    }
  }
  return null;
}

/** The keys the tree intercepts: the full WAI-ARIA tree pattern over the VISIBLE nodes
 *  (one tab stop). Module-level so it isn't re-allocated on every render. */
const NAV_KEYS = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' '];

interface RowProps {
  node: NockerlTreeNode;
  depth: number; level: number; setSize: number; posInSet: number;   // indent + ARIA position
  expanded: boolean; focused: boolean;
  selectable: NockerlTreeSelectable; selected: boolean; checkState?: 'on' | 'off' | 'mixed' | undefined;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
}

/**
 * A single tree row is the recursive unit: indent rails → disclosure chevron (an aligned blank
 * for a leaf) → optional tri-state checkbox → file/folder icon → label → optional count badge.
 * The row is ONE `treeitem`; the chevron is nested (its own hit area).
 */
function TreeRow({
  node, depth, level, setSize, posInSet, expanded, selectable, selected, checkState,
  focused, onToggle, onSelect, registerRef,
}: RowProps) {
  const isFolder = node.kind === 'folder';
  const ft: NockerlTreeFileType = isFolder ? 'folder' : node.fileType ?? 'default';
  const icon = isFolder ? IconFolder(expanded) : FILE_ICON[ft];
  const selectedCls = selectable === 'single' && selected ? ' nk-tree__row--selected' : '';
  return (
    <div
      ref={(el) => registerRef(node.id, el)}
      role="treeitem"
      aria-level={level}
      aria-setsize={setSize}
      aria-posinset={posInSet}
      aria-selected={selectable === 'single' ? selected : undefined}
      aria-checked={selectable === 'multi' ? (checkState === 'mixed' ? 'mixed' : checkState === 'on') : undefined}
      aria-expanded={isFolder ? expanded : undefined}
      aria-disabled={node.disabled || undefined}
      tabIndex={focused ? 0 : -1}
      className={`nk-tree__row${selectedCls}${node.disabled ? ' nk-tree__row--disabled' : ''}`}
      onClick={() => !node.disabled && onSelect(node.id)}
    >
      <Rails depth={depth} />
      {/* Disclosure chevron: its OWN control (toggling never selects the row); a
          leaf reserves the same box (visibility:hidden) so labels stay aligned. */}
      <button
        type="button"
        className={`nk-tree__chev${expanded ? ' nk-tree__chev--open' : ''}${isFolder ? '' : ' nk-tree__chev--leaf'}`}
        tabIndex={-1}
        aria-hidden={!isFolder}
        aria-label={isFolder ? (expanded ? `Collapse ${node.name}` : `Expand ${node.name}`) : undefined}
        disabled={!isFolder || node.disabled}
        onClick={(e) => { e.stopPropagation(); if (isFolder && !node.disabled) onToggle(node.id); }}
      >
        {IconChevron}
      </button>
      {/* Multi-select checkbox, tri-state (on / off / mixed). A decorative span: the
          treeitem owns aria-checked, so a nested real <input role=checkbox> would be a
          second control inside the treeitem (double tab stop). */}
      {selectable === 'multi' && (
        <span
          className={`nk-tree__cb${checkState === 'on' ? ' nk-tree__cb--on' : ''}${checkState === 'mixed' ? ' nk-tree__cb--mixed' : ''}`}
          aria-hidden="true"
        >
          {checkState === 'on' && IconCheck}
          {checkState === 'mixed' && <span className="nk-tree__cb-bar" />}
        </span>
      )}
      {/* File / folder icon: folder + file-type tints from the categorical ramp. */}
      <span className="nk-tree__icon" style={{ color: FILE_TINT[ft] }} aria-hidden="true">{icon}</span>
      <span className={`nk-tree__label${isFolder ? ' nk-tree__label--folder' : ''}`}>{node.name}</span>
      {typeof node.count === 'number' && node.count > 0 && <span className="nk-tree__badge">{node.count}</span>}
    </div>
  );
}

/** Indent rails: one cell per ancestor depth, each a vertical guide line. */
function Rails({ depth }: { depth: number }) {
  return (
    <span className="nk-tree__indent" aria-hidden="true">
      {Array.from({ length: depth }).map((_, i) => <span key={i} className="nk-tree__rail" />)}
    </span>
  );
}

/** A non-interactive child row: a lazily-loading spinner or an empty-folder note. */
function PlaceholderRow({ depth, label, spinner }: { depth: number; label: string; spinner?: boolean }) {
  return (
    <div className="nk-tree__row" aria-hidden="true">
      <Rails depth={depth} />
      <span className="nk-tree__chev nk-tree__chev--leaf">{IconChevron}</span>
      <span className="nk-tree__icon">{spinner && <span className="nk-tree__spin" />}</span>
      <span className="nk-tree__label nk-tree__label--muted">{label}</span>
    </div>
  );
}

export interface NockerlTreeProps {
  /** The recursive forest. Auto-expand root folders on first load to match the canonical behaviour. */
  nodes: NockerlTreeNode[];
  /** `single`: one selected node (a cyan ring + cyan ink, no fill). `multi`: tri-state checkboxes that propagate parent↔child. */
  selectable?: NockerlTreeSelectable;
  /** REQUIRED accessible name for the `role="tree"` container. */
  ariaLabel: string;
  /** Controlled set of expanded folder ids. */
  expandedIds: Set<string>;
  /** Fired with the next expanded set when a chevron (or a folder row) toggles. */
  onToggleExpand?: (next: Set<string>) => void;
  /** Selected node id (single-select). */
  selectedId?: string | null;
  /** Fired when a leaf is activated (single-select). */
  onSelect?: (id: string) => void;
  /** Checked leaf ids (multi-select). A folder reads on / off / mixed from its descendants. */
  checkedIds?: Set<string>;
  /** Fired when a node toggles its whole leaf-subtree (multi-select). */
  onCheckedChange?: (next: Set<string>) => void;
}

/**
 * The Nockerl tree is a recursive `role="tree"` with full WAI-ARIA keyboard semantics: roving
 * tabindex (one tab stop), ArrowDown/Up over the VISIBLE nodes, ArrowRight expands then enters
 * the first child, ArrowLeft collapses then climbs to the parent, Home/End, Enter/Space selects
 * (and in multi toggles the checkbox with parent/child tri-state propagation). A folder row
 * toggles; a leaf becomes the selection. Honours prefers-reduced-motion.
 *
 * No forwardRef (API convention): NockerlTree is a stateful controller (it owns the roving-focus
 * cursor + a ref map to every row) with no single stable root element a forwarded ref would
 * point at.
 */
export function NockerlTree({
  nodes, selectable = 'single', ariaLabel, expandedIds, onToggleExpand,
  selectedId, onSelect, checkedIds, onCheckedChange,
}: NockerlTreeProps) {
  const refs = useRef(new Map<string, HTMLDivElement>());
  const flat = useMemo(() => visibleIds(nodes, expandedIds), [nodes, expandedIds]);
  const [focusId, setFocusId] = useState<string>(() => flat[0] ?? '');
  const activeFocus = flat.includes(focusId) ? focusId : flat[0] ?? '';

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  }, []);

  const focusRow = useCallback((id: string) => {
    setFocusId(id);
    refs.current.get(id)?.focus();
  }, []);

  const toggle = useCallback((id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onToggleExpand?.(next);
  }, [expandedIds, onToggleExpand]);

  // Tri-state: a folder is checked iff all descendant LEAVES are; mixed if some.
  // (Named to disambiguate from the per-row `checkState` value in RowProps.)
  const computeCheckState = useCallback((node: NockerlTreeNode): 'on' | 'off' | 'mixed' => {
    if (!checkedIds) return 'off';
    const leaves = leafIds(node);
    if (leaves.length === 0) return checkedIds.has(node.id) ? 'on' : 'off';
    const on = leaves.filter((l) => checkedIds.has(l)).length;
    return on === 0 ? 'off' : on === leaves.length ? 'on' : 'mixed';
  }, [checkedIds]);

  const select = useCallback((id: string) => {
    const path = findPath(nodes, id);
    const node = path?.[path.length - 1];
    if (!node || node.disabled) return;
    if (selectable === 'single') {
      // A folder toggles; a leaf becomes the selection (the file-tree behaviour).
      if (node.kind === 'folder') toggle(id);
      else onSelect?.(id);
      focusRow(id);
      return;
    }
    // multi: toggle this node's whole leaf-subtree (parent↔child propagation).
    if (!onCheckedChange) return;
    const leaves = leafIds(node);
    const targets = leaves.length ? leaves : [node.id];
    const allOn = targets.every((t) => checkedIds?.has(t));
    const next = new Set(checkedIds);
    for (const t of targets) {
      if (allOn) next.delete(t);
      else next.add(t);
    }
    onCheckedChange(next);
    focusRow(id);
  }, [nodes, selectable, toggle, onSelect, onCheckedChange, checkedIds, focusRow]);

  // Full WAI-ARIA tree keyboard pattern over the VISIBLE nodes (one tab stop).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!NAV_KEYS.includes(e.key)) return;
    e.preventDefault();
    const idx = flat.indexOf(activeFocus);
    const path = findPath(nodes, activeFocus);
    const node = path?.[path.length - 1];
    const open = node?.kind === 'folder' && expandedIds.has(node.id);
    if (e.key === 'ArrowDown' && idx < flat.length - 1) focusRow(flat[idx + 1]!);
    else if (e.key === 'ArrowUp' && idx > 0) focusRow(flat[idx - 1]!);
    else if (e.key === 'ArrowRight' && node?.kind === 'folder') {
      // expand, then enter: if already open, move into the first child; else open it.
      if (open) { if (node.children?.[0]) focusRow(node.children[0].id); }
      else toggle(node.id);
    } else if (e.key === 'ArrowLeft') {
      if (open) toggle(node!.id);                                                     // collapse, then climb
      else if (path && path.length > 1) focusRow(path[path.length - 2]!.id);
    } else if (e.key === 'Home' && flat[0]) focusRow(flat[0]);
    else if (e.key === 'End' && flat.length) focusRow(flat[flat.length - 1]!);
    else if (e.key === 'Enter' || e.key === ' ') select(activeFocus);
  };

  // Recursive render: each level is a role="group"; siblings carry setsize/posinset.
  const renderLevel = (levelNodes: NockerlTreeNode[], depth: number, level: number): React.ReactNode =>
    levelNodes.map((n, i) => {
      const isFolder = n.kind === 'folder';
      const open = isFolder && expandedIds.has(n.id);
      return (
        <div key={n.id} role="none">
          <TreeRow
            node={n} depth={depth} level={level} setSize={levelNodes.length} posInSet={i + 1}
            expanded={open} focused={activeFocus === n.id} selectable={selectable}
            selected={selectable === 'single' && selectedId === n.id}
            checkState={selectable === 'multi' ? computeCheckState(n) : undefined}
            onToggle={toggle} onSelect={select} registerRef={registerRef}
          />
          {isFolder && open && (
            <div role="group" aria-label={n.name}>
              {n.loading ? (
                <PlaceholderRow depth={depth + 1} label="Loading…" spinner />
              ) : n.children && n.children.length > 0 ? (
                renderLevel(n.children, depth + 1, level + 1)
              ) : (
                <PlaceholderRow depth={depth + 1} label="empty" />
              )}
            </div>
          )}
        </div>
      );
    });

  return (
    <NockerlSurface className="nk-tree" role="tree" aria-label={ariaLabel} aria-multiselectable={selectable === 'multi' || undefined} onKeyDown={onKeyDown}>
      {renderLevel(nodes, 0, 1)}
      {/* Recipe CSS injected as the LAST child; identical injected blocks dedupe in effect. */}
      <style>{NOCKERL_TREE_STYLES}</style>
    </NockerlSurface>
  );
}

// CONTAINER: the recursive tree. It OWNS its node row's raw <button> chevron (a tree treeitem
// is a distinct control from NockerlListItem: nesting a NockerlListItem <button> inside a
// role="treeitem" is a WAI-ARIA anti-pattern, a double tab stop). The tri-state boxes are
// decorative spans (the treeitem owns aria-checked), not NockerlCheckbox facsimiles. `nodes` is a
// recursive node array rendered internally, not a slot. Composes NockerlIcon (glyphs) +
// NockerlSurface (the lifted card).
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default NockerlTree;
