/**
 * PaginationDemo: the live, interactive Nockerl pagination island for the web.
 *
 * NockerlPagination is NUMERIC page navigation, a DIFFERENT concept from the
 * `breadcrumbs` trail (hierarchical path). It reuses the BUTTON + ICON-BUTTON
 * vocabulary verbatim so it can't drift:
 *   • every page cell + prev/next control is the house control: 12px control
 *     radius (NEVER a pill), a STATIC fill, flash-free feedback (brightness +
 *     transform + a NEUTRAL shadow only, never a fill/gradient tween).
 *   • the CURRENT page reuses the button-primary SELECTED treatment: a filled
 *     cyan gradient lit from above (catch-light, NOT a glow), label in
 *     `var(--color-on-accent)`, marked `aria-current="page"`.
 *   • prev/next at the bounds reuse the button-disabled treatment: muted +
 *     inert, but still clearly SEEN (never faded to invisible).
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *
 * Sourced honestly from the apps: the native Android list endpoints page with
 * `limit` / `offset` and return a `total` (NockerlApiTasks.fetchTasks →
 * `TaskListResponse(data, total)`); Voice's History is an in-memory SwiftData
 * `@Query` rendered in a `LazyVStack` (load-on-scroll, no page numbers). NUMBERED
 * pagination is a web/dashboard pattern, so the numbered UI is designed
 * ORIGINALLY here from the laws + the button vocabulary; the "showing X to Y of Z"
 * summary and the page-size selector speak the SAME limit/offset/total vocabulary
 * the apps use. See the drift Aside on the page.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (docs/demo-token-contract.md). The dark stage resolves them to
 * the dark palette; change a token and this demo moves with everything else. The
 * contrast label on the cyan fill is `var(--color-on-accent)`. Literals remain
 * only for pure geometry (icon box sizes, transition curves).
 *
 * Keyboard: the bar is a <nav> landmark; every control is a real <button> (Tab
 * order, focus-visible ring). With the numbered bar focused, ArrowLeft/ArrowRight
 * move a page (Home/End jump to the first/last). Honors prefers-reduced-motion.
 */
import { useState } from 'react';
import { NockerlButton, NockerlIcon, NockerlPagination, NockerlSelect } from '@dizyx/nockerl-react';

// House stroke chevron using currentColor, so the load-more control tints with its state.
const IconRefresh = <NockerlIcon path="M21 12a9 9 0 1 1-2.64-6.36M21 4v4h-4" />;

// One control radius (--radius-control) on every cell; the current page reuses
// the button-primary cyan fill (static, since feedback animates brightness/transform/
// shadow only). Every visual value is a token; the dark stage resolves the accent.
const STYLES = `
.nk-pg-demo { font-family: var(--font-family-sans); }

/* The summary + the page-size selector, aligned to the same row, under the control bar. */
.nk-pg-meta { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-3) var(--space-5); margin-top: var(--space-3); }
.nk-pg-summary { font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-pg-summary b { color: var(--color-on-card); font-variant-numeric: tabular-nums; font-weight: var(--font-weight-semibold); }

/* Page-size selector wrapper: the composed <NockerlSelect> brings its own well + chevron. */
.nk-pg-size { display: inline-flex; align-items: center; gap: var(--space-2); }

/* Load more: the composed secondary <NockerlButton> with a remaining-count caption beneath it. */
.nk-pg-load { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2); }

/* Compact tone comparison: the same live bar in its neutral default + the opt-in accent tone. */
.nk-pg-tones { display: flex; flex-direction: column; gap: var(--space-3); }
.nk-pg-tone { display: flex; align-items: center; gap: var(--space-4); }
.nk-pg-tone__tag { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); min-width: var(--space-16); }

/* demo chrome */
.nk-pg-demo__block + .nk-pg-demo__block { margin-top: var(--space-6); }
.nk-pg-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-pg-demo__note { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-pg-demo__note b { color: var(--color-accent-primary); }
`;

/** Range helper: the "showing X to Y of Z" math, shared by the numbered + size demos. */
function rangeOf(page: number, size: number, total: number) {
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  return { from, to };
}

/**
 * The interactive showcase mounted on the NockerlPagination page: a full numbered bar
 * with live ellipsis truncation + a "showing X to Y of Z" summary; a page-size
 * selector that re-ranges the summary; a compact "Page X of Y"; a prev/next-only
 * pair; and a load-more variant (the mobile/infinite idiom). Click the cells, tab
 * to them, or arrow through the numbered bar. Every control is live.
 */
export default function PaginationDemo() {
  const TOTAL = 487; // total rows, the `total` an API returns (Android: TaskListResponse.total)

  const [size, setSize] = useState(25); // page size / `limit`
  const [page, setPage] = useState(6); // current page (drives `offset = (page-1)*limit`)
  const pageCount = Math.max(1, Math.ceil(TOTAL / size));
  const safePage = Math.min(page, pageCount);
  const { from, to } = rangeOf(safePage, size, TOTAL);

  // Compact + prev/next-only demos drive a small independent set.
  const [cPage, setCPage] = useState(3);
  const C_COUNT = 12;

  // Load-more demo: how many of TOTAL are currently loaded.
  const STEP = 25;
  const [loaded, setLoaded] = useState(STEP);
  const [loading, setLoading] = useState(false);
  const remaining = TOTAL - loaded;
  const loadMore = () => {
    if (loading || remaining <= 0) return;
    setLoading(true);
    window.setTimeout(() => {
      setLoaded((n) => Math.min(n + STEP, TOTAL));
      setLoading(false);
    }, 600);
  };

  const changeSize = (next: number) => {
    // Keep the first row of the current view visible when the size changes.
    const firstRow = (safePage - 1) * size;
    setSize(next);
    setPage(Math.floor(firstRow / next) + 1);
  };

  return (
    <div className="nk-pg-demo">
      <style>{STYLES}</style>

      <div className="nk-pg-demo__block">
        <p className="nk-pg-demo__lbl">Numbered: ellipsis truncation, current page in cyan (tab / click / arrow keys)</p>
        <NockerlPagination page={safePage} pageCount={pageCount} onChange={setPage} />
        <div className="nk-pg-meta">
          <span className="nk-pg-summary">
            Showing <b>{from}</b> to <b>{to}</b> of <b>{TOTAL}</b>
          </span>
          <span className="nk-pg-size">
            <NockerlSelect
              label="Rows per page"
              size="sm"
              options={[10, 25, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
              value={String(size)}
              onChange={(v) => changeSize(Number(v))}
            />
          </span>
        </div>
      </div>

      <div className="nk-pg-demo__block">
        <p className="nk-pg-demo__lbl">Compact: “Page X of Y” with prev/next; the tone prop sets the label emphasis</p>
        <div className="nk-pg-tones">
          <span className="nk-pg-tone">
            <span className="nk-pg-tone__tag">neutral</span>
            <NockerlPagination variant="compact" page={cPage} pageCount={C_COUNT} onChange={setCPage} label="Compact pagination, neutral tone (default)" />
          </span>
          <span className="nk-pg-tone">
            <span className="nk-pg-tone__tag">accent</span>
            <NockerlPagination variant="compact" tone="accent" page={cPage} pageCount={C_COUNT} onChange={setCPage} label="Compact pagination, accent tone" />
          </span>
        </div>
      </div>

      <div className="nk-pg-demo__block">
        <p className="nk-pg-demo__lbl">Prev / next only: a labelled pair, disabled at the bounds</p>
        <NockerlPagination variant="prev-next" page={cPage} pageCount={C_COUNT} onChange={setCPage} />
      </div>

      <div className="nk-pg-demo__block">
        <p className="nk-pg-demo__lbl">Load more: the mobile / infinite-scroll idiom (Android + Voice lists)</p>
        <div className="nk-pg-load">
          <NockerlButton
            variant="secondary"
            loading={loading}
            loadingText="Loading…"
            text={remaining <= 0 ? 'All loaded' : 'Load more'}
            leadingIcon={IconRefresh}
            onClick={loadMore}
            disabled={remaining <= 0}
          />
          <span className="nk-pg-summary">
            Loaded <b>{loaded}</b> of <b>{TOTAL}</b>
            {remaining > 0 && <> &#183; {remaining} more</>}
          </span>
        </div>
      </div>

      <p className="nk-pg-demo__note">
        Numbered page <b>{safePage}</b> of {pageCount} · {size} rows/page · compact page <b>{cPage}</b>. The island is live.
      </p>
    </div>
  );
}
