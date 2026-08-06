/**
 * NockerlFileExplorer, the dev-console FILE EXPLORER SHELL. Per the
 * de-phantom verdict this is deliberately a THIN SHELL over the shipped pieces. It
 * invents no tree, no rows, no wells:
 *
 *   • the forest is the real `NockerlTree` (file-type tints, WAI-ARIA keyboard
 *     semantics, controlled expand/select), passed through UNCHANGED;
 *   • the header is an eyebrow title + an open `actions` slot (drop NockerlIconButtons
 *     or a NockerlMenu trigger in, since the shell owns no controls of its own);
 *   • the empty state is the packaged `NockerlWell` (recessed, muted message +
 *     optional action node).
 *
 * Web-first by scope: the TREE core is already cross-platform (Compose + Swift ship
 * NockerlTree); only this chrome is console-specific. Per-NODE context menus stay with
 * the host (wire NockerlMenu to your rows once the tree exposes per-node anchors; that
 * work is tracked as a Tree extension, not shell scope).
 *
 * TOKEN-REACTIVE throughout; literals are pure geometry. No backticks in STYLES.
 */
import type { ReactNode } from 'react';
import { NockerlTree, type NockerlTreeNode } from './Tree.js';
import { NockerlWell } from '../primitives/Well.js';
import type { ComposeContract } from '../compose-contract.js';

export interface NockerlFileExplorerProps {
  /** Eyebrow title in the header strip. */
  title?: string;
  /** Open header slot (IconButtons, a Menu trigger); the shell owns no controls. */
  actions?: ReactNode;
  /** The forest (pass-through to NockerlTree). Empty → the built-in empty state. */
  nodes: NockerlTreeNode[];
  /** Accessible name for the tree (defaults to the title). */
  ariaLabel?: string;
  /** Controlled expanded folder ids (pass-through). */
  expandedIds: Set<string>;
  /** Expansion changes (pass-through). */
  onToggleExpand?: ((next: Set<string>) => void) | undefined;
  /** Selected node id (single-select explorer mode; pass-through). */
  selectedId?: string | null;
  /** Leaf activation (pass-through). */
  onSelect?: ((id: string) => void) | undefined;
  /** Empty-state title (nodes empty). */
  emptyTitle?: string;
  /** Empty-state supporting message. */
  emptyMessage?: string;
  /** Optional empty-state action node (e.g. a NockerlButton). */
  emptyAction?: ReactNode;
  /** Cap the tree body height; overflow scrolls (the panel, not the page). */
  maxBodyHeight?: string;
  /** Extra class on the shell. */
  className?: string;
}

// The shell is a bordered panel: a CHROME header strip (eyebrow + actions) over the
// scrolling tree body. The tree rows carry their own selection/hover recipes; the
// shell adds only the frame. Depth stays quiet (a panel, not a lifted card).
export const NOCKERL_FILE_EXPLORER_STYLES = `
.nk-fx { display: flex; flex-direction: column; min-width: 0; overflow: hidden;
  border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-panel);
  background: var(--color-card-surface1);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* header strip: chrome plane, eyebrow voice, actions right */
.nk-fx__head { display: flex; align-items: center; gap: var(--space-2); flex: 0 0 auto;
  padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3);
  background: var(--color-chrome-surface);
  border-bottom: var(--space-px) solid var(--color-chrome-hairline); min-height: var(--space-8); }
.nk-fx__title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-chrome-muted); font-weight: var(--font-weight-semibold); }
.nk-fx__actions { display: inline-flex; align-items: center; gap: var(--space-1); flex: 0 0 auto; }
/* body: the tree scrolls inside the panel */
.nk-fx__body { flex: 1 1 auto; min-height: 0; overflow-y: auto; scrollbar-width: thin;
  padding: var(--space-2); max-height: var(--nk-fx-max, none); }
/* the built-in EMPTY state: the packaged recessed well, centered + quiet */
.nk-fx__empty { margin: var(--space-3); display: flex; flex-direction: column; align-items: center;
  gap: var(--space-1); padding: var(--space-6) var(--space-4); text-align: center; }
.nk-fx__empty-title { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-card); }
.nk-fx__empty-msg { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); }
.nk-fx__empty-act { margin-top: var(--space-2); }
`;

/**
 * The explorer shell: [eyebrow title · actions] over the scrolling NockerlTree; an
 * empty forest renders the packaged Well with your message + optional action.
 */
export function NockerlFileExplorer({
  title = 'Files',
  actions,
  nodes,
  ariaLabel,
  expandedIds,
  onToggleExpand,
  selectedId,
  onSelect,
  emptyTitle = 'No files',
  emptyMessage = 'Nothing to show here yet.',
  emptyAction,
  maxBodyHeight,
  className,
}: NockerlFileExplorerProps) {
  return (
    <div className={['nk-fx', className].filter(Boolean).join(' ')}>
      <div className="nk-fx__head">
        <span className="nk-fx__title">{title}</span>
        {actions && <span className="nk-fx__actions">{actions}</span>}
      </div>
      <div className="nk-fx__body" style={maxBodyHeight ? ({ ['--nk-fx-max' as string]: maxBodyHeight } as React.CSSProperties) : undefined}>
        {nodes.length > 0 ? (
          <NockerlTree
            nodes={nodes}
            ariaLabel={ariaLabel ?? title}
            selectable="single"
            expandedIds={expandedIds}
            {...(onToggleExpand ? { onToggleExpand } : {})}
            {...(selectedId !== undefined ? { selectedId } : {})}
            {...(onSelect ? { onSelect } : {})}
          />
        ) : (
          <NockerlWell layout="area" className="nk-fx__empty">
            <span className="nk-fx__empty-title">{emptyTitle}</span>
            <span className="nk-fx__empty-msg">{emptyMessage}</span>
            {emptyAction && <span className="nk-fx__empty-act">{emptyAction}</span>}
          </NockerlWell>
        )}
      </div>
      {/* Recipe CSS injected as the LAST child; identical injected blocks dedupe. */}
      <style>{NOCKERL_FILE_EXPLORER_STYLES}</style>
    </div>
  );
}

// CONTAINER, a thin shell: `actions` + `emptyAction` are open slots; the forest is
// DATA passed through to the composed NockerlTree; the empty state composes the
// packaged NockerlWell. The shell owns NO raw controls (header actions arrive composed
// from the host). No owns.
export const compose = {
  slots: { actions: { accepts: '*', required: false }, emptyAction: { accepts: '*', required: false } },
} satisfies ComposeContract;

export default NockerlFileExplorer;
