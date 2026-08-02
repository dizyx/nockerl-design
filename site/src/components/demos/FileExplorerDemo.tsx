/**
 * FileExplorerDemo: the live island for the shipped NockerlFileExplorer shell
 * (WS5 · task 2656). A repo-ish forest in the shell: the header carries the eyebrow +
 * real NockerlIconButtons in the actions slot (collapse-all / expand-all); rows are the
 * REAL NockerlTree (file-type tints, arrow-key semantics); selecting a leaf updates the
 * readout; the Empty toggle proves the built-in Well empty state with an action.
 * TOKEN-REACTIVE demo chrome; the shell ships from @dizyx/nockerl-react.
 */
import { useMemo, useState } from 'react';
import {
  NockerlButton,
  NockerlFileExplorer,
  NockerlIcon,
  NockerlIconButton,
  NockerlSegmentedControl,
  type NockerlTreeNode,
} from '@dizyx/nockerl-react';

const STYLES = `
.nk-fx-demo { font-family: var(--font-family-sans); }
.nk-fx-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-fx-demo__row { display: flex; gap: var(--space-4); align-items: flex-start; flex-wrap: wrap; }
.nk-fx-demo__shell { flex: 0 1 auto; width: min(100%, calc(var(--size-container-lg) - var(--space-8))); }
.nk-fx-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-fx-demo__count b { color: var(--color-accent-primary); }
`;

const IconCollapse = <NockerlIcon path="M8 5l-5 5 5 5M21 10H3" />;
const IconExpand = <NockerlIcon path="M16 5l5 5-5 5M3 10h18" />;

const FOREST: NockerlTreeNode[] = [
  {
    id: 'src', name: 'src', kind: 'folder',
    children: [
      {
        id: 'composites', name: 'composites', kind: 'folder',
        children: [
          { id: 'chat-input', name: 'ChatInput.tsx', kind: 'file', fileType: 'typescript' },
          { id: 'tabs', name: 'Tabs.tsx', kind: 'file', fileType: 'typescript' },
          { id: 'file-explorer', name: 'FileExplorer.tsx', kind: 'file', fileType: 'typescript' },
        ],
      },
      { id: 'index', name: 'index.ts', kind: 'file', fileType: 'typescript' },
    ],
  },
  {
    id: 'tokens', name: 'tokens', kind: 'folder',
    children: [
      { id: 'color-dark', name: 'color.dark.json', kind: 'file', fileType: 'json' },
      { id: 'size', name: 'size.json', kind: 'file', fileType: 'json' },
    ],
  },
  { id: 'catalog', name: 'component-catalog.md', kind: 'file', fileType: 'default' },
];

const ALL_FOLDERS = ['src', 'composites', 'tokens'];

// (No compose contract: the demo purely CONSUMES the shipped NockerlFileExplorer.)

export default function FileExplorerDemo() {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ALL_FOLDERS));
  const [selected, setSelected] = useState<string | null>('chat-input');
  const [mode, setMode] = useState<'files' | 'empty'>('files');
  const [opens, setOpens] = useState(0);

  const nodes = useMemo(() => (mode === 'files' ? FOREST : []), [mode]);

  return (
    <div className="nk-fx-demo">
      <style>{STYLES}</style>
      <p className="nk-fx-demo__lbl">The shell: eyebrow + actions over the real Tree; empty forests get the Well</p>
      <div className="nk-fx-demo__row">
        <div className="nk-fx-demo__shell">
          <NockerlFileExplorer
            title="nockerl-design"
            nodes={nodes}
            expandedIds={expanded}
            onToggleExpand={setExpanded}
            selectedId={selected}
            onSelect={(id) => {
              setSelected(id);
              setOpens((c) => c + 1);
            }}
            maxBodyHeight="264px"
            emptyTitle="No files open"
            emptyMessage="This workspace has nothing checked out yet."
            emptyAction={<NockerlButton text="Load the repo" variant="secondary" size="sm" onClick={() => setMode('files')} />}
            actions={
              <>
                <NockerlIconButton icon={IconCollapse} label="Collapse all" variant="plain" size={24} onClick={() => setExpanded(new Set())} />
                <NockerlIconButton icon={IconExpand} label="Expand all" variant="plain" size={24} onClick={() => setExpanded(new Set(ALL_FOLDERS))} />
              </>
            }
          />
        </div>
        <NockerlSegmentedControl
          label="Forest"
          size="sm"
          segments={[{ value: 'files', label: 'Files' }, { value: 'empty', label: 'Empty' }]}
          value={mode}
          onChange={(n) => setMode(n as 'files' | 'empty')}
        />
      </div>
      <p className="nk-fx-demo__count">
        Opened <b>{opens}</b> {opens === 1 ? 'file' : 'files'} · selected <b>{selected ?? 'none'}</b> · arrow-key the
        rows (the Tree's full WAI-ARIA semantics), collapse/expand from the header slot. The island is live.
      </p>
    </div>
  );
}
