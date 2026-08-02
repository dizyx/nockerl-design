/**
 * TableDemo: the live, interactive island for the shipped NockerlTable composite.
 *
 * The reusable multi-COLUMN data grid now lives in the published package
 * (@dizyx/nockerl-react → NockerlTable); this file is only the showcase harness that
 * CONSUMES it. NockerlTable is the columns × rows grid (NOT `list`'s sectioned rows or
 * `key-value`'s one-record fields): typed columns with a SORTABLE header, the per-cell
 * alignment CANON (text left / numbers right + mono tabular figures / status chips centered),
 * row SELECTION via a
 * checkbox column with a select-all, a STICKY header in a scroll region, hairline row
 * separators, a footer SUMMARY row, loading (skeleton) + empty states, and a density
 * toggle. Pagination is its own composite (NockerlPagination), composed beneath the grid.
 *
 * PHASED v1 (what the package ships): columns · sort · sticky · selection · empty ·
 * loading · density · footer. Row virtualization + inline cell editing are a later slice.
 *
 * Sourced HONESTLY (never the web dashboard): neither mobile app ships a true grid.
 * Android Compose lays tabular data out as a `Row { … Modifier.weight(1f) … }` of columns
 * with `FontFamily.Monospace` numerics + `HorizontalDivider` hairlines (ClusterSheet), and
 * Voice Swift uses `LazyVGrid` + `.monospacedDigit()`; only macOS SwiftUI ships a real
 * `Table` (`TableColumn` + `KeyPathComparator`). So this web grid is designed ORIGINALLY
 * from the laws + the shared checkbox / divider / pagination / mono vocabulary. The laws
 * (card depth, flat rows, cyan-wash selection, static fills, outline focus) are ENCODED IN
 * THE PACKAGE now (packages/react/src/composites/Table.tsx). This harness supplies only the
 * session DATA + the demo layout chrome + the cell renderers.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a var(--token)
 * (docs/demo-token-contract.md); literals are pure geometry only.
 */
import { useMemo, useState } from 'react';
import { NockerlPagination, NockerlSegmentedControl, NockerlTable, type NockerlTableColumn, type NockerlTableSort } from '@dizyx/nockerl-react';

type Status = 'success' | 'warning' | 'error' | 'info';
type SortKey = 'name' | 'status' | 'tokens' | 'cost' | 'updated';
type Density = 'comfortable' | 'compact';

// Status cells reuse the warm STATUS tokens (never the brand cyan).
const STATUS_COLOR: Record<Status, string> = {
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)',
  error: 'var(--color-status-error)',
  info: 'var(--color-status-info)',
};
const STATUS_LABEL: Record<Status, string> = {
  success: 'Idle',
  warning: 'Needs attention',
  error: 'Failed',
  info: 'Streaming',
};
// Sort rank so the status column orders by severity, not alphabetically.
const STATUS_RANK: Record<Status, number> = { info: 0, success: 1, warning: 2, error: 3 };

// Demo chrome only: the controls row + the cell-renderer bits (the name cell's leading dot,
// the status pill). The grid chrome (card, header band, rows, hairlines, sticky, skeletons) is
// the shipped NockerlTable. Every value is a token; literals are pure geometry.
const STYLES = `
.nk-tb-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
/* controls row (density + a live readout chip) */
.nk-tb-demo__ctl { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-3); }
.nk-tb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); }
.nk-tb-demo__bulk { margin-left: auto; display: inline-flex; align-items: center; gap: var(--space-2);
  min-height: var(--space-8); font-size: var(--font-size-12); color: var(--color-on-canvas-muted); }
.nk-tb-demo__bulk b { color: var(--color-accent-primary); font-variant-numeric: tabular-nums; }
.nk-tb-demo__toggles { display: inline-flex; gap: var(--space-4); flex-wrap: wrap; }

/* The primary (name) cell: leading dot + name, text-left. */
.nk-tb-name { display: flex; align-items: center; gap: var(--space-2); min-width: 0; max-width: 100%; }
.nk-tb-name__t { font-weight: var(--font-weight-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1 1 auto; }
.nk-tb-name__dot { width: 7px; height: 7px; border-radius: var(--radius-pill); flex: 0 0 auto; } /* 7px: glyph geometry */
/* STATUS cell: warm token + dot + text (never color alone, never cyan). */
.nk-tb-status { display: inline-flex; max-width: 100%; min-width: 0; align-items: center; gap: var(--space-2); border-radius: var(--radius-pill); padding: var(--space-0-5) var(--space-2);
  vertical-align: middle;
  font-size: var(--font-size-12); font-weight: var(--font-weight-medium); line-height: var(--font-line-height-16); }
.nk-tb-status__dot { width: 6px; height: 6px; border-radius: var(--radius-pill); flex: 0 0 auto; }   /* 6px: glyph geometry */
.nk-tb-status__t { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
/* footer summary cells */
.nk-tb-foot-total { color: var(--color-on-card); font-weight: var(--font-weight-semibold); }
.nk-tb-foot-num { text-align: right; color: var(--color-on-card); font-family: var(--font-family-mono); font-size: var(--font-size-12); font-variant-numeric: tabular-nums; }

/* pagination row beneath the table */
.nk-tb-demo__foot { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-3) var(--space-5); margin-top: var(--space-3); }
.nk-tb-demo__summary { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); }
.nk-tb-demo__summary b { color: var(--color-on-canvas); font-variant-numeric: tabular-nums; font-weight: var(--font-weight-semibold); }
.nk-tb-demo__pg { margin-left: auto; }

.nk-tb-demo__cap { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-tb-demo__cap b { color: var(--color-accent-primary); }
`;

// ── data: realistic Nockerl sessions (Name, Status, Tokens, Cost, Updated) ────
interface Sess { id: string; name: string; status: Status; tokens: number; cost: number; updatedLabel: string; updatedSort: number; }
const SESSIONS: Sess[] = [
  { id: 's1', name: 'nockerl-design · docs site', status: 'info', tokens: 137730, cost: 2.41, updatedLabel: 'now', updatedSort: 0 },
  { id: 's2', name: 'api-server · gateway refactor', status: 'success', tokens: 89210, cost: 1.58, updatedLabel: '12m', updatedSort: 12 },
  { id: 's3', name: 'credential-store · allowlist audit', status: 'warning', tokens: 41980, cost: 0.74, updatedLabel: '1h', updatedSort: 60 },
  { id: 's4', name: 'dueydo · failed deploy', status: 'error', tokens: 15240, cost: 0.29, updatedLabel: '3h', updatedSort: 180 },
  { id: 's5', name: 'nockerl-cli · git proxy', status: 'success', tokens: 64550, cost: 1.12, updatedLabel: '5h', updatedSort: 300 },
];

const COMPARE: Record<SortKey, (a: Sess, b: Sess) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  status: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
  tokens: (a, b) => a.tokens - b.tokens,
  cost: (a, b) => a.cost - b.cost,
  updated: (a, b) => a.updatedSort - b.updatedSort,
};
const fmtInt = (n: number) => n.toLocaleString('en-US');
const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

/** The primary (name) cell renderer: leading status dot + the session name. */
function NameCell({ row }: { row: Sess }) {
  return (
    <span className="nk-tb-name">
      <span className="nk-tb-name__dot" style={{ background: STATUS_COLOR[row.status] }} aria-hidden="true" />
      <span className="nk-tb-name__t">{row.name}</span>
    </span>
  );
}

/** The status pill cell renderer: warm token + dot + text (never color alone, never cyan). */
function StatusCell({ status }: { status: Status }) {
  const c = STATUS_COLOR[status];
  return (
    <span className="nk-tb-status" style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }} title={STATUS_LABEL[status]}>
      <span className="nk-tb-status__dot" style={{ background: c }} aria-hidden="true" />
      <span className="nk-tb-status__t">{STATUS_LABEL[status]}</span>
    </span>
  );
}

// The typed columns handed to NockerlTable: each declares its own align / mono / sortable and a
// render(row) for the cell content (the fancy name + status cells; plain formatted numbers else).
const COLUMNS: Array<NockerlTableColumn<Sess>> = [
  { key: 'name', header: 'Session', sortable: true, width: '29%', render: (r) => <NameCell row={r} /> },
  { key: 'status', header: 'Status', align: 'center', sortable: true, width: '20%', render: (r) => <StatusCell status={r.status} /> },
  { key: 'tokens', header: 'Tokens', align: 'end', mono: true, sortable: true, width: '17%', render: (r) => fmtInt(r.tokens) },
  { key: 'cost', header: 'Cost', align: 'end', mono: true, sortable: true, width: '15%', render: (r) => fmtUsd(r.cost) },
  { key: 'updated', header: 'Updated', align: 'end', mono: true, sortable: true, width: '19%', render: (r) => r.updatedLabel },
];

// The compact demo columns for the loading / empty toggles (Session · Tokens · Cost).
const MINI_COLUMNS: Array<NockerlTableColumn<Sess>> = [
  { key: 'name', header: 'Session', width: '50%', render: (r) => r.name },
  { key: 'tokens', header: 'Tokens', align: 'end', mono: true, width: '28%', render: (r) => fmtInt(r.tokens) },
  { key: 'cost', header: 'Cost', align: 'end', mono: true, width: '22%', render: (r) => fmtUsd(r.cost) },
];

// The grid IS the shipped NockerlTable (which owns the compose contract now; this harness only
// composes NockerlTable + NockerlSegmentedControl + NockerlPagination and supplies data).
export default function TableDemo() {
  const [density, setDensity] = useState<Density>('comfortable');
  const [sort, setSort] = useState<NockerlTableSort>({ key: 'updated', dir: 'asc' });
  const [selected, setSelected] = useState<Set<string>>(new Set(['s2']));
  const [page, setPage] = useState(1);
  const [state, setState] = useState<'data' | 'loading' | 'empty'>('data');
  const PAGE_SIZE = 4; // small page so pagination is provable on the sample data

  // NockerlTable is CONTROLLED: the caller sorts. Apply the active column's comparator + dir.
  const sorted = useMemo(() => {
    const base = [...SESSIONS].sort(COMPARE[sort.key as SortKey]);
    return sort.dir === 'asc' ? base : base.reverse();
  }, [sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(start, start + PAGE_SIZE);

  // Footer totals reflect the full dataset, not just the page.
  const totalTokens = SESSIONS.reduce((sum, r) => sum + r.tokens, 0);
  const totalCost = SESSIONS.reduce((sum, r) => sum + r.cost, 0);

  return (
    <div className="nk-tb-demo">
      <style>{STYLES}</style>

      {/* ── Controls: density toggle, a state toggle (data/loading/empty), + a live readout ── */}
      <div className="nk-tb-demo__ctl">
        <span className="nk-tb-demo__lbl">Density</span>
        <NockerlSegmentedControl
          label="Row density"
          size="sm"
          segments={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
          value={density}
          onChange={(v) => setDensity(v as Density)}
        />
        <NockerlSegmentedControl
          label="Table state"
          size="sm"
          segments={[
            { value: 'data', label: 'Data' },
            { value: 'loading', label: 'Loading' },
            { value: 'empty', label: 'Empty' },
          ]}
          value={state}
          onChange={(v) => setState(v as 'data' | 'loading' | 'empty')}
        />
        <span className="nk-tb-demo__bulk" aria-live="polite">
          <b>{selected.size}</b> selected
        </span>
      </div>

      {/* ── The working grid is the shipped NockerlTable: sortable headers, mono numeric cols,
             row select + select-all, sticky header, hover + selected rows, footer totals,
             and the loading / empty states driven by the toggle above. ── */}
      <NockerlTable<Sess>
        columns={COLUMNS}
        rows={state === 'empty' ? [] : pageRows}
        getRowId={(r) => r.id}
        sort={sort}
        onSortChange={setSort}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        stickyHeader
        maxHeight="296px"
        density={density}
        loading={state === 'loading'}
        loadingRows={3}
        empty={
          <>
            <span style={{ fontSize: 'var(--font-size-14)', color: 'var(--color-on-card)', fontWeight: 'var(--font-weight-medium)' }}>No sessions found</span>
            <span style={{ fontSize: 'var(--font-size-12)', color: 'var(--color-on-card-muted)' }}>Try a different filter or start a new session.</span>
          </>
        }
        footer={() => (
          <tr>
            <td aria-hidden="true" />
            <th scope="row" className="nk-tb-foot-total">Total · {SESSIONS.length} sessions</th>
            <td />
            <td className="nk-tb-foot-num">{fmtInt(totalTokens)}</td>
            <td className="nk-tb-foot-num">{fmtUsd(totalCost)}</td>
            <td />
          </tr>
        )}
        ariaLabel="Sessions: sortable, selectable data table"
        caption="Sessions with status, token usage, cost, and last-updated time. Column headers sort; the first column selects rows."
      />

      {/* ── NockerlPagination row beneath the table ── */}
      <div className="nk-tb-demo__foot">
        <span className="nk-tb-demo__summary">
          Showing <b>{state === 'empty' ? 0 : start + 1}</b> to <b>{state === 'empty' ? 0 : start + pageRows.length}</b> of <b>{state === 'empty' ? 0 : sorted.length}</b>
        </span>
        <NockerlPagination
          className="nk-tb-demo__pg"
          page={safePage}
          pageCount={pageCount}
          onChange={setPage}
          label="Table pagination"
        />
      </div>

      {/* ── A second, compact grid proving the skeleton + empty scaffolds side by side ── */}
      <p className="nk-tb-demo__cap" style={{ marginTop: 'var(--space-8)' }}>
        <b>Loading</b>: skeleton rows hold the column grid
      </p>
      <NockerlTable<Sess> columns={MINI_COLUMNS} rows={[]} selectable loading loadingRows={3} ariaLabel="Loading sessions" />

      <p className="nk-tb-demo__cap">
        Sorted by <b>{sort.key}</b> ({sort.dir}) · <b>{selected.size}</b> selected · page <b>{safePage}</b> of {pageCount} ·{' '}
        <b>{density}</b>. The grid is live: change <b>--color-divider</b> and every hairline moves.
      </p>
    </div>
  );
}
