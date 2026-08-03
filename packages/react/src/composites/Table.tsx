/**
 * NockerlTable is the Tier-3 multi-COLUMN data-grid composite. ONE home for the typed grid the
 * dashboard + any list endpoint needs (columns × rows, NOT `list`'s sectioned rows or
 * `key-value`'s one-record fields), so a data table can never drift: typed column config with
 * SORTABLE headers (real <button> + aria-sort + a flipping arrow), per-cell alignment (text
 * left / numbers right + mono tabular figures), row SELECTION (a checkbox column with a
 * select-all that goes indeterminate on a partial page), a STICKY header in a scroll region,
 * hairline row separators, an optional footer SUMMARY row, and LOADING (skeleton) + EMPTY
 * states, with a comfortable/compact density.
 *
 * It COMPOSES the real controls: NockerlCheckbox (the select-all + per-row boxes, recessed well
 * to static cyan, drawn tick, dash for indeterminate, focus ring, ≥24px hit target), NockerlButton
 * (each sortable header is a ghost button carrying the flipping sort arrow), and NockerlSurface
 * (the lifted card the grid sits on) + NockerlIcon (the empty-state glyph). This component supplies
 * the table chrome, the header/footer band, the alignment + mono rules, the selection model, and
 * the skeleton/empty scaffolds.
 *
 * PHASED v1 (this package slice ships): columns · sort · sticky header · selection · empty ·
 * loading · density · footer. DEFERRED to a later slice (deliberately NOT here): row
 * VIRTUALIZATION / windowing, and inline CELL EDITING. Those are the next data-grid increment.
 *
 * CONTROLLED, data-agnostic: NockerlTable renders `rows` verbatim (the caller sorts + paginates)
 * and reports sort intent through `onSortChange`; per-cell content comes from each column's
 * `render(row)` so the grid owns no app vocabulary (status pills, name cells, currency are the
 * caller's renderers). Pagination is its own composite (NockerlPagination). Compose it beneath.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - depth lives in the CARD (neutral shadow + catch-light, never a glow); the header band,
 *     rows + hairlines inside are FLAT; row separators bind to --color-divider.
 *   - a SELECTED row reads via a faint cyan wash (NOT a glow / fill-swap / left rail, per LAW 6);
 *     the tick ON the cyan box uses --color-on-accent.
 *   - fills are STATIC: hover = neutral wash, press = transform + neutral shadow only; focus is
 *     an OUTLINE ring (from the composed NockerlButton / NockerlCheckbox).
 *
 * A11y: a real <table> with <caption>, <th scope="col|row">, aria-sort on a sorted header, the
 * select-all + per-row boxes as real NockerlCheckboxes (aria-checked incl. "mixed"), aria-busy
 * while loading. TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * var(--token); literals are pure geometry only.
 */
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { NockerlButton } from '../primitives/Button';
import { NockerlCheckbox } from '../primitives/Checkbox';
import { NockerlIcon } from '../primitives/Icon';
import { NockerlSurface } from '../primitives/Surface';
import type { ComposeContract } from '../compose-contract';

export type NockerlTableAlign = 'start' | 'end' | 'center';
export type NockerlTableSortDir = 'asc' | 'desc';
export type NockerlTableDensity = 'comfortable' | 'compact';

// The data-table alignment CANON: text LEFT (start, the default), numbers RIGHT (end, so figures
// compare digit-to-digit), status chips / badges CENTER. Smart type-based default: a `mono`
// (numeric) column with no explicit align right-aligns automatically. An explicit `align` always wins.
const effAlign = (align: NockerlTableAlign | undefined, mono: boolean | undefined): NockerlTableAlign =>
  align ?? (mono ? 'end' : 'start');
const alignClass = (a: NockerlTableAlign): string =>
  a === 'end' ? 'nk-tbl-end' : a === 'center' ? 'nk-tbl-center' : '';

/** The active sort, given as a column key and a direction. `null` = unsorted. */
export interface NockerlTableSort {
  key: string;
  dir: NockerlTableSortDir;
}

/** One typed column. `render(row)` supplies the cell content (a plain value or any node, such as
 *  a status pill or a name cell). `align: 'end'` right-aligns the cell AND its header; `mono` renders
 *  tabular figures so digits line up; `sortable` makes the header a sort button. */
export interface NockerlTableColumn<Row> {
  /** Stable key that identifies the column and the sort target. */
  key: string;
  /** Header label (the sort button's text when sortable). */
  header: string;
  /** Cell + header alignment: `start` (text, the default) · `end` (numbers/ids, so the header arrow
   *  leads on the data edge) · `center` (status chips / badges). Defaults smartly: a `mono` column
   *  with no explicit align right-aligns (`end`) so figures compare digit-to-digit. */
  align?: NockerlTableAlign;
  /** Render the cell in mono with tabular figures so the column lines up to the digit. */
  mono?: boolean;
  /** Make the header a sort button (aria-sort + a flipping arrow); clicking toggles asc/desc. */
  sortable?: boolean;
  /** Fixed column width for the shared <colgroup> (a CSS width, e.g. '20%' or '120px'). */
  width?: string;
  /** The cell content for a row. Omit to render nothing (a spacer column). */
  render?: (row: Row) => ReactNode;
}

export interface NockerlTableProps<Row> {
  /** The typed column definitions (order = column order). */
  columns: NockerlTableColumn<Row>[];
  /** The rows to render, verbatim. The caller sorts + paginates before passing them in. */
  rows: Row[];
  /** Stable id per row. It keys React and drives the selection set. Defaults to String(index). */
  getRowId?: (row: Row, index: number) => string;
  /** Controlled sort state (the active column + direction), or null when unsorted. */
  sort?: NockerlTableSort | null;
  /** Fired with the next sort when a sortable header is clicked (toggles asc/desc on the same key). */
  onSortChange?: (next: NockerlTableSort) => void;
  /** Add a checkbox column + a header select-all (indeterminate on a partial page). */
  selectable?: boolean;
  /** Controlled set of selected row ids (selectable). */
  selectedIds?: Set<string>;
  /** Fired with the next selected-id set when a box (row or select-all) toggles. */
  onSelectionChange?: (next: Set<string>) => void;
  /** Pin the header (and footer) so they stay flush while the body scrolls. */
  stickyHeader?: boolean;
  /** Renders skeleton rows that hold the column grid; sets aria-busy. */
  loading?: boolean;
  /** How many skeleton rows to show while loading. */
  loadingRows?: number;
  /** Shown in place of the body when `rows` is empty (and not loading). */
  empty?: ReactNode;
  /** A summary row pinned under the body (column totals, for example). Receives the rendered rows. */
  footer?: (rows: Row[]) => ReactNode;
  /** Row density. It adjusts vertical padding only, never the fill. */
  density?: NockerlTableDensity;
  /** Max height of the scroll region (proves the sticky header). A CSS length; omit for no cap. */
  maxHeight?: string;
  /** Accessible name for the <table>. */
  ariaLabel?: string;
  /** A visually-hidden <caption> describing the table for assistive tech. */
  caption?: string;
}

// The card lifts; the header band, rows, and hairlines are FLAT. Numeric columns are
// right-aligned + mono so figures line up; headers align to their data edge. Bg / hairline /
// radius / sheen come from the NockerlSurface primitive; this block keeps only the grid chrome +
// the off-ladder drop shadow. Every visual value is a token; literals are geometry only.
export const NOCKERL_TABLE_STYLES = `
.nk-tbl { font-family: var(--font-family-sans); color: var(--color-on-canvas); }

/* ── The containing CARD: depth lives HERE (card radius, lit from above). ── */
.nk-tbl-card { overflow: hidden; box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent), var(--nk-surface-sheen); }
/* The scroll region proves the STICKY header (vertical) + columns (horizontal). */
.nk-tbl-scroll { overflow: auto; }
.nk-tbl-table { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; }
/* fixed layout: clip text that overruns its column. This covers BODY name + generic cells only
   (NOT the select cell, so its focus ring/selection bar aren't clipped; NOT thead/tfoot, so
   header labels show in full). */
.nk-tbl-table tbody th[scope="row"], .nk-tbl-table tbody td.nk-tbl-cell { overflow: hidden; text-overflow: ellipsis; }

/* ── HEADER: a recessed strong band; sticky so it stays flush while rows scroll. ── */
.nk-tbl-table thead th { background: var(--color-card-alt2);
  color: var(--color-on-card-muted); font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  font-weight: var(--font-weight-semibold); text-align: left; white-space: nowrap; padding: var(--space-3) var(--space-4);
  border-bottom: var(--space-px) solid var(--color-divider); }
.nk-tbl-table thead th.nk-tbl-end { text-align: right; }     /* numeric header aligns to its data edge */
.nk-tbl-table thead th.nk-tbl-center { text-align: center; } /* chip/badge header centers over its column */
.nk-tbl--sticky thead th { position: sticky; top: 0; z-index: 2; }
/* Column widths live in a shared <colgroup> so head/body/foot/skeleton share ONE fixed grid. */

/* A SORTABLE header is the NockerlButton primitive (ghost, sm) filling the cell; these scoped
   overrides (higher specificity than NockerlButton's single-class recipe) neutralize its own
   padding/height + restore the recessed header's eyebrow label type so only the CONTROL
   (ghost hover wash, press, focus ring, icon slot) comes from NockerlButton; the header LOOK is
   unchanged. The cell's own padding positions the button; gap tightens to the arrow. */
.nk-tbl-table thead .nk-tbl-sort { gap: var(--space-1); padding: 0; height: auto; min-height: 0;
  font-size: inherit; font-weight: inherit; letter-spacing: inherit; text-transform: inherit; color: inherit; }
.nk-tbl-table thead .nk-tbl-sort:hover:not(:disabled) { background: transparent; color: var(--color-on-card); }
/* The arrow: a drawn chevron that flips on direction + brightens when this column is the
   active sort. Rides inside NockerlButton's icon slot; sizing/rotation/opacity stay local. */
.nk-tbl-arrow { display: inline-flex; opacity: .35; transition: opacity .12s, transform .14s var(--motion-easing-standard); }
.nk-tbl-arrow svg { display: block; width: 13px; height: 13px; }
.nk-tbl-arrow--active { opacity: 1; color: var(--color-accent-primary); }
.nk-tbl-arrow--desc { transform: rotate(180deg); }

/* BODY ROWS: flat (card carries depth, hairlines carry structure); the primary cell is a
   <th scope="row"> so style td + th together. */
.nk-tbl-table tbody td, .nk-tbl-table tbody th { padding: var(--space-3) var(--space-4); text-align: left;
  font-size: var(--font-size-13); font-weight: var(--font-weight-regular); color: var(--color-on-card);
  vertical-align: middle; white-space: nowrap; border-bottom: var(--space-px) solid var(--color-divider); } /* hairline separator */
.nk-tbl-table tbody tr:last-child td, .nk-tbl-table tbody tr:last-child th { border-bottom: 0; } /* footer owns the final rule */
/* Body alignment is scoped under .nk-tbl-table (specificity 0,2,0) so it BEATS the base cell rule
   .nk-tbl-table tbody td (0,1,2, text-align:left); a bare .nk-tbl-end would lose and every column
   would render left. Numbers RIGHT, status chips/badges CENTER. */
.nk-tbl-table .nk-tbl-end { text-align: right; }
.nk-tbl-table .nk-tbl-center { text-align: center; }
/* mono / id cells: mono + tabular figures so the columns line up to the digit */
.nk-tbl-mono { font-family: var(--font-family-mono); font-size: var(--font-size-12);
  font-variant-numeric: tabular-nums; letter-spacing: var(--font-tracking-snug); color: var(--color-on-card); }

/* DENSITY changes vertical padding only, never the fill. */
.nk-tbl--compact thead th { padding-top: var(--space-2); padding-bottom: var(--space-2); }
.nk-tbl--compact tbody td, .nk-tbl--compact tbody th { padding-top: var(--space-1); padding-bottom: var(--space-1); }

/* Hover / selected treatment. The cell bg paints (td/th, not tr, so the sticky header never
   inherits it). Selection = an OUTLINE, never a fill (LAW 6, reduce-fills): a cyan hairline
   runs above and below the row across every cell, closed off at the first and last cell, so
   the row reads as one outlined band with no internal verticals and no left rail. The
   explicit indicator is the row's own select checkbox. Drawn with inset shadows, so the row
   geometry is identical selected or not. Hover stays the neutral surface highlight. */
.nk-tbl-row { transition: background-color .12s; }
.nk-tbl-row:hover td, .nk-tbl-row:hover th { background: var(--color-surface-highlight); }
.nk-tbl-row--sel td, .nk-tbl-row--sel th {
  box-shadow: inset 0 var(--space-px) 0 color-mix(in srgb, var(--color-accent-primary) 45%, transparent),
              inset 0 calc(-1 * var(--space-px)) 0 color-mix(in srgb, var(--color-accent-primary) 45%, transparent);
}
.nk-tbl-row--sel td:first-child, .nk-tbl-row--sel th:first-child {
  box-shadow: inset 0 var(--space-px) 0 color-mix(in srgb, var(--color-accent-primary) 45%, transparent),
              inset 0 calc(-1 * var(--space-px)) 0 color-mix(in srgb, var(--color-accent-primary) 45%, transparent),
              inset var(--space-px) 0 0 color-mix(in srgb, var(--color-accent-primary) 45%, transparent);
}
.nk-tbl-row--sel td:last-child, .nk-tbl-row--sel th:last-child {
  box-shadow: inset 0 var(--space-px) 0 color-mix(in srgb, var(--color-accent-primary) 45%, transparent),
              inset 0 calc(-1 * var(--space-px)) 0 color-mix(in srgb, var(--color-accent-primary) 45%, transparent),
              inset calc(-1 * var(--space-px)) 0 0 color-mix(in srgb, var(--color-accent-primary) 45%, transparent);
}
.nk-tbl-row--sel:hover td, .nk-tbl-row--sel:hover th { background: var(--color-surface-highlight); }
.nk-tbl-row td:first-child { position: relative; }
/* The select column checkbox is the NockerlCheckbox primitive (its recipe lives in that
   primitive); the cell only sizes the column. */
.nk-tbl-sel { width: var(--space-10); }

/* FOOTER summary row: a recessed band, sticky at the bottom of the scroll region. */
.nk-tbl-table tfoot td, .nk-tbl-table tfoot th { background: var(--color-card-alt2); white-space: nowrap;
  border-top: var(--space-px) solid var(--color-divider); padding: var(--space-3) var(--space-4); font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-tbl--sticky tfoot td, .nk-tbl--sticky tfoot th { position: sticky; bottom: 0; z-index: 1; }
/* a footer row-header is a label. Default it LEFT (a bare <th> is browser-centered), matching the
   left tbody th; numeric footer cells stay <td> + .nk-tbl-end so totals line up under their column. */
.nk-tbl-table tfoot th { text-align: left; }

/* ── LOADING (skeleton rows): shimmer is interpolatable opacity, not a fill swap. The bar is a
   BLOCK so it honors its column-relative width/height + margin-auto in the fixed cell. ── */
.nk-tbl-sk { display: block; height: var(--space-3); border-radius: var(--radius-track);
  background: color-mix(in srgb, var(--color-on-card) 12%, transparent); animation: nk-tbl-shimmer 1.4s ease-in-out infinite; }
.nk-tbl-sk--right { margin-left: auto; }
.nk-tbl-sk--center { margin-left: auto; margin-right: auto; }
.nk-tbl-sk--box { width: 18px; height: 18px; border-radius: var(--radius-track); }
@keyframes nk-tbl-shimmer { 0%,100% { opacity: .5; } 50% { opacity: 1; } }

/* ── EMPTY state: a centered icon + sparse copy. ── */
.nk-tbl-empty { display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
  text-align: center; padding: var(--space-10) var(--space-4); color: var(--color-on-card-muted); }
.nk-tbl-empty svg { width: 30px; height: 30px; opacity: .5; }

@media (prefers-reduced-motion: reduce) {
  .nk-tbl-row, .nk-tbl-arrow { transition: none; }
  .nk-tbl-sk { animation: none; opacity: .7; }
}
`;

// ─── Inline glyphs (the shared NockerlIcon primitive, currentColor so each slot tints) ──
const IconArrow = <NockerlIcon path="M12 5v14M6 11l6-6 6 6" />;
const IconEmpty = (<NockerlIcon><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></NockerlIcon>);

/** A sortable column header: the NockerlButton primitive (ghost, sm) filling a <th aria-sort>,
 *  carrying the flipping sort arrow as its icon (leading on right-aligned columns so the arrow
 *  sits on the data edge, trailing otherwise). aria-sort on the <th> + the button's aria-label
 *  carry the sort state; the arrow lights cyan when this column is the active sort. */
function SortHeader({
  column, active, dir, onSort,
}: { column: { header: string; end: boolean }; active: boolean; dir: NockerlTableSortDir; onSort: () => void }) {
  const dirWord = dir === 'asc' ? 'ascending' : 'descending';
  const arrow = (
    <span
      className={`nk-tbl-arrow${active ? ' nk-tbl-arrow--active' : ''}${active && dir === 'desc' ? ' nk-tbl-arrow--desc' : ''}`}
      aria-hidden="true"
    >
      {IconArrow}
    </span>
  );
  return (
    <NockerlButton
      variant="ghost"
      size="sm"
      className="nk-tbl-sort"
      text={column.header}
      {...(column.end ? { leadingIcon: arrow } : { trailingIcon: arrow })}
      onClick={onSort}
      ariaLabel={`Sort by ${column.header}${active ? `, currently ${dirWord}` : ''}`}
    />
  );
}

/**
 * A single Nockerl data table, the multi-column grid. Typed columns with sortable headers, mono
 * numeric cells, a checkbox select column with a select-all, a sticky header in a scroll region,
 * hover + selected rows, an optional footer totals row, and skeleton/empty states. It is
 * CONTROLLED (renders `rows` as-given, reports sort intent) so it owns no app data vocabulary.
 *
 * No forwardRef (API convention): NockerlTable is a controller composing NockerlSurface + a
 * <table>; there is no single element a forwarded ref would meaningfully point at.
 */
export function NockerlTable<Row>({
  columns, rows, getRowId, sort, onSortChange, selectable = false, selectedIds,
  onSelectionChange, stickyHeader = false, loading = false, loadingRows = 3, empty,
  footer, density = 'comfortable', maxHeight, ariaLabel, caption,
}: NockerlTableProps<Row>) {
  const totalCols = columns.length + (selectable ? 1 : 0);

  // The stable id list for the current page (the visible set the select-all governs).
  const ids = useMemo(() => rows.map((r, i) => (getRowId ? getRowId(r, i) : String(i))), [rows, getRowId]);
  const selected = selectedIds ?? EMPTY_SET;
  const selOnPage = ids.filter((id) => selected.has(id)).length;
  const allOnPage = selOnPage === ids.length && ids.length > 0;
  const someOnPage = selOnPage > 0 && !allOnPage;

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };
  const toggleAll = (on: boolean) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    onSelectionChange(next);
  };

  // Click a sortable header: toggle direction if already the sort key, else sort asc.
  const requestSort = (key: string) => {
    if (!onSortChange) return;
    const dir: NockerlTableSortDir = sort?.key === key && sort.dir === 'asc' ? 'desc' : 'asc';
    onSortChange({ key, dir });
  };

  const colGroup = (
    <colgroup>
      {selectable && <col className="nk-tbl-sel" />}
      {columns.map((c) => <col key={c.key} style={c.width ? { width: c.width } : undefined} />)}
    </colgroup>
  );

  const head = (
    <thead>
      <tr>
        {selectable && (
          <th scope="col" className="nk-tbl-sel">
            <NockerlCheckbox
              checked={someOnPage ? 'mixed' : allOnPage}
              onChange={toggleAll}
              ariaLabel={`${allOnPage ? 'Deselect' : 'Select'} all rows`}
            />
          </th>
        )}
        {columns.map((c) => {
          const a = effAlign(c.align, c.mono);
          const cls = alignClass(a) || undefined;
          const active = sort?.key === c.key;
          return c.sortable ? (
            <th key={c.key} scope="col" className={cls} aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <SortHeader column={{ header: c.header, end: a === 'end' }} active={!!active} dir={active ? sort!.dir : 'asc'} onSort={() => requestSort(c.key)} />
            </th>
          ) : (
            <th key={c.key} scope="col" className={cls}>{c.header}</th>
          );
        })}
      </tr>
    </thead>
  );

  const body = (
    <tbody>
      {rows.map((row, i) => {
        const id = ids[i]!;
        const isSel = selectable && selected.has(id);
        return (
          <tr key={id} className={`nk-tbl-row${isSel ? ' nk-tbl-row--sel' : ''}`} aria-selected={selectable ? isSel : undefined}>
            {selectable && (
              <td className="nk-tbl-sel">
                <NockerlCheckbox checked={!!isSel} onChange={() => toggleRow(id)} ariaLabel={`Select row ${i + 1}`} />
              </td>
            )}
            {columns.map((c, ci) => {
              const cls = [alignClass(effAlign(c.align, c.mono)), c.mono ? 'nk-tbl-mono' : '', ci === 0 ? '' : 'nk-tbl-cell'].filter(Boolean).join(' ');
              const content = c.render ? c.render(row) : null;
              // The first column is the row header (<th scope="row">): one primary name per row.
              return ci === 0 ? (
                <th key={c.key} scope="row" className={cls || undefined}>{content}</th>
              ) : (
                <td key={c.key} className={cls || undefined}>{c.mono ? <span className="nk-tbl-mono">{content}</span> : content}</td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  );

  // Skeleton bars hold the fixed column grid while data loads.
  const skeleton = (
    <tbody>
      {Array.from({ length: loadingRows }, (_, i) => (
        <tr key={i} className="nk-tbl-row">
          {selectable && <td className="nk-tbl-sel"><span className="nk-tbl-sk nk-tbl-sk--box" /></td>}
          {columns.map((c, ci) => {
            const a = effAlign(c.align, c.mono);
            return (
              <td key={c.key} className={alignClass(a) || undefined}>
                <span className={`nk-tbl-sk${a === 'end' ? ' nk-tbl-sk--right' : a === 'center' ? ' nk-tbl-sk--center' : ''}`} style={{ width: ci === 0 ? '74%' : '52%' }} />
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );

  const emptyBody = (
    <tbody>
      <tr>
        <td colSpan={totalCols} style={{ borderBottom: 0 }}>
          <div className="nk-tbl-empty">
            {IconEmpty}
            {empty}
          </div>
        </td>
      </tr>
    </tbody>
  );

  const showEmpty = !loading && rows.length === 0 && empty != null;

  return (
    <div className={`nk-tbl${density === 'compact' ? ' nk-tbl--compact' : ''}${stickyHeader ? ' nk-tbl--sticky' : ''}`}>
      <NockerlSurface className="nk-tbl-card">
        <div className="nk-tbl-scroll" style={maxHeight ? { maxHeight } : undefined}>
          <table className="nk-tbl-table" aria-label={ariaLabel} aria-busy={loading || undefined}>
            {caption && (
              <caption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
                {caption}
              </caption>
            )}
            {colGroup}
            {head}
            {loading ? skeleton : showEmpty ? emptyBody : body}
            {footer && !loading && !showEmpty && (
              <tfoot>{footer(rows)}</tfoot>
            )}
          </table>
        </div>
      </NockerlSurface>
      {/* Recipe CSS injected as the LAST child; identical injected blocks dedupe in effect. */}
      <style>{NOCKERL_TABLE_STYLES}</style>
    </div>
  );
}

// A shared frozen empty set so an uncontrolled-selection table never allocates a new Set per render.
const EMPTY_SET: ReadonlySet<string> = new Set<string>();

// CONTAINER: the data grid. It composes NockerlCheckbox (select-all + per-row boxes), NockerlButton
// (sortable headers), NockerlSurface (the card) + NockerlIcon (empty glyph); it renders a real
// <table> (thead/tbody/tfoot/th/td/caption/colgroup are generic structure, not facsimiles). Cell
// content comes from each column's render(row), which returns arbitrary nodes, and the footer from
// footer(), so both slots accept '*'. `columns` + `rows` are data arrays rendered internally, not slots.
export const compose = {
  slots: { footer: { accepts: '*' }, empty: { accepts: '*' } },
} satisfies ComposeContract;

export default NockerlTable;
