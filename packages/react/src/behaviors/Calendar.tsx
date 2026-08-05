/**
 * NockerlCalendar - the Tier-1 month-grid primitive. ONE home for the calendar month grid
 * BOTH date-picker demos hand-rolled verbatim (DatePicker's nk-dp grid + DateRangePicker's
 * nk-rp grid were the same code re-scoped) - so a future month-grid change is ONE edit,
 * not two. Composes ONLY tokens (plus the shared date helpers exported here).
 *
 * SCOPE - this is the GRID UNIT, not the whole picker: the Mon-first weekday header row,
 * the 6x7 day grid (role=grid), the month-change body animation, the full day-state
 * styling (today RING, selected/endpoint accent fill, in-range + preview TINT band with
 * edge rounding, outside-month dim, disabled bounds), and roving-focus keyboard nav.
 * Each demo KEEPS its own outer chrome - the card, the month nav header + title, presets,
 * fields, footer - because the single picker wraps ONE grid with its own header while the
 * range picker pages TWO grids under ONE shared header. The header therefore stays in the
 * chrome; this primitive owns only the grid the two demos duplicated.
 *
 * BOTH selection modes are no-op here:
 *   - mode 'single': a `selected` day -> the cyan accent fill (the DatePicker behavior).
 *   - mode 'range':  `range` start/end -> two accent endpoints + a soft-cyan in-range TINT;
 *     an optional `preview` end (hover/focus toward the unset end) draws a lighter preview
 *     band - the DateRangePicker behavior. Endpoints, in-range tint and edge rounding match.
 *
 * Two geometry axes the two demos diverged on (a SYSTEM divergence = a prop, not drift)
 * are exposed as locals so each demo composes pixel-identically:
 *   - cellMinHeight: the day-cell min-height (DatePicker 34, DateRangePicker 32).
 *   - outsideOpacity: the out-of-month dim (DatePicker .55, DateRangePicker .5).
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - a SELECTED day / range endpoint is the cyan accent fill (STATIC) with on-accent text
 *     - the one brand accent. TODAY is a cyan RING (a shape, not a glow).
 *   - range = a soft cyan in-range TINT band between two accent endpoints; the live preview
 *     is the same band at lower alpha. Band edges round (control radius), interior square.
 *   - flash-free feedback: a day's fill never tweens - hover/press animate a neutral wash
 *     + scale; the month change animates transform/opacity only (no fill swap).
 *   - focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   - out-of-month + disabled (out-of-bounds) days stay legible but inert.
 *   - prefers-reduced-motion freezes the month transition.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type Ref } from 'react';
import type { ComposeContract } from '../compose-contract.js';

// ── Shared day model + helpers (the verbatim math both demos carried) ──────────────
/** A calendar day as plain Y/M/D (UTC-free, midnight-normalised; month is 0-indexed). */
export type Day = { y: number; m: number; d: number };
/** Integer sort/compare key for a day (YYYYMMDD as a number). */
export const key = (d: Day) => d.y * 10000 + d.m * 100 + d.d;
/** A native Date -> a Day. */
export const toDay = (d: Date): Day => ({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate() });
/** A Day -> a native Date (local midnight). */
export const fromDay = (d: Day) => new Date(d.y, d.m, d.d);
/** True when two (possibly null) days are the same calendar day. */
export const sameDay = (a: Day | null | undefined, b: Day | null | undefined) => !!a && !!b && key(a) === key(b);
/** A Day offset by n days (normalised through Date). */
export const addDays = (d: Day, n: number) => toDay(new Date(d.y, d.m, d.d + n));
/** A {y,m} month offset by n months (wraps the year correctly). */
export const addMonths = (y: number, m: number, n: number) => {
  const nm = m + n;
  return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
};
/** Mon-first weekday index (0 = Mon … 6 = Sun) for grid alignment. */
export const monIndex = (d: Date) => (d.getDay() + 6) % 7;

/** Mon-first weekday header labels. */
export const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
/** Full month names, January-first. */
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'] as const;

/** Build the 6x7 (42-cell) matrix for a month, padded with leading/trailing days. */
export function buildGrid(y: number, m: number): Day[] {
  const first = new Date(y, m, 1);
  const start = monIndex(first);
  const cells: Day[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(toDay(first), i - start));
  return cells;
}

// ── The recipe CSS (neutral nk-cal* class names) ───────────────────────────────────
// Every visual value is a token; literals remain only for pure geometry (the 7-col grid,
// the ring/border widths via space tokens, transition curves) and carry a why-note. The
// day-cell min-height and the out-of-month opacity are read from locals so a consumer can
// match its exact geometry. NOTE: no backtick may appear anywhere in this template - not
// even in a comment - or the build breaks; keep all notes plain text.
export const NOCKERL_CALENDAR_STYLES = `
/* weekday headers - over their columns, optically centered */
.nk-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-px); }
.nk-cal-wd { text-align: center; font-size: var(--font-size-10); font-weight: var(--font-weight-semibold); letter-spacing: var(--font-tracking-normal); color: var(--color-on-card-muted); padding: var(--space-1) 0 var(--space-2); }

/* the animated body - month change tweens transform + opacity only (no fill swap) */
.nk-cal-body { animation: nk-cal-in .18s var(--motion-easing-standard); }
@keyframes nk-cal-in { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: none; } }

/* a day CELL - square, number optically centered; flat unless selected/endpoint */
.nk-cal-cell { position: relative; display: flex; }
.nk-cal-day {
  position: relative; z-index: 1;
  width: 100%; aspect-ratio: 1 / 1; min-height: var(--nk-cal-cell-min, var(--space-8));
  display: inline-flex; align-items: center; justify-content: center;
  font: inherit; font-size: var(--font-size-12); font-weight: var(--font-weight-medium);
  color: var(--color-on-card); cursor: pointer;
  background: transparent; border: var(--space-px) solid transparent;
  border-radius: var(--radius-control);
  transition: background-color .12s, color .12s, transform .12s var(--motion-easing-standard);
}
.nk-cal-day:hover:not(:disabled):not(.is-selected) { background: color-mix(in srgb, var(--color-on-card) 8%, transparent); }
.nk-cal-day:active:not(:disabled) { transform: scale(.9); }
.nk-cal-day:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: -1px; }
.nk-cal-day.is-outside { color: var(--color-on-card-muted); opacity: var(--nk-cal-outside-opacity, .55); }   /* out-of-month dim */
.nk-cal-day:disabled { color: var(--color-on-card-muted); opacity: .35; cursor: not-allowed; } /* past / out-of-bounds, still legible */
/* TODAY - a cyan RING (a shape, not a glow) */
.nk-cal-day.is-today:not(.is-selected) { box-shadow: inset 0 0 0 var(--space-px) var(--color-accent-primary); color: var(--color-accent-primary); }
/* SELECTED / endpoints - static cyan accent fill + on-accent label (the brand accent) */
.nk-cal-day.is-selected { background: var(--color-accent-primary); color: var(--color-on-accent); font-weight: var(--font-weight-semibold); }
.nk-cal-day.is-selected:hover { background: var(--color-accent-primary); filter: brightness(1.06); }

/* IN-RANGE / PREVIEW tint - a soft cyan band drawn BEHIND the day (edges round) */
.nk-cal-cell.is-inrange::before { content: ""; position: absolute; inset: var(--space-0-5) 0; background: var(--color-accent-primary-soft); z-index: 0; }
.nk-cal-cell.is-preview::before { content: ""; position: absolute; inset: var(--space-0-5) 0; background: color-mix(in srgb, var(--color-accent-primary) 12%, transparent); z-index: 0; }
.nk-cal-cell.is-edge-start::before { left: 50%; border-top-left-radius: var(--radius-control); border-bottom-left-radius: var(--radius-control); }
.nk-cal-cell.is-edge-end::before { right: 50%; border-top-right-radius: var(--radius-control); border-bottom-right-radius: var(--radius-control); }

@media (prefers-reduced-motion: reduce) {
  .nk-cal-body { animation: none; }
  .nk-cal-day { transition: none; }
}
`;

// ── Public API ───────────────────────────────────────────────────────────────────
export type NockerlCalendarMode = 'single' | 'range';

export interface NockerlCalendarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  /** The month/year this grid renders. */
  view: { y: number; m: number };
  /** 'single' (a `selected` day) or 'range' (a `range` of two endpoints + preview). Default 'single'. */
  mode?: NockerlCalendarMode;
  /** SINGLE mode: the chosen day (accent fill). */
  selected?: Day | null;
  /** RANGE mode: the committed start/end endpoints (accent fill + in-range tint between them). */
  range?: { start: Day | null; end: Day | null };
  /**
   * RANGE mode: the live preview end - the hovered/focused day while only the start is
   * chosen. Draws the lighter preview band from start toward it. Ignored once the range is full.
   */
  preview?: Day | null;
  /** Inclusive selectable bounds; days outside are disabled (still legible). */
  min?: Day;
  max?: Day;
  /** Click / Enter / Space on an in-bounds day. */
  onPick: (d: Day) => void;
  /** RANGE mode: hover/blur a day (drives the preview band). Optional - omit to skip preview wiring. */
  onHover?: (d: Day | null) => void;
  /** Roving-focus cell index for THIS grid (0-41). Default: internal state seeded to today/selected. */
  focusIdx?: number;
  /** Roving-focus setter (when the parent owns focus across multiple grids). */
  setFocusIdx?: (i: number) => void;
  /** Keyboard handler for the grid (when the parent owns multi-grid arrow paging). */
  onKey?: (e: KeyboardEvent<HTMLDivElement>) => void;
  /** Forwarded ref to the day-grid element (for the parent's roving-focus queries). */
  gridRef?: Ref<HTMLDivElement>;
  /** Drives the today RING. Default: a fixed demo date is NOT assumed - pass the demo TODAY. */
  today?: Day;
  /** Per-cell day min-height (px). DatePicker 34, DateRangePicker 32. Default 32. */
  cellMinHeight?: number;
  /** Out-of-month dim opacity. DatePicker .55, DateRangePicker .5. Default .55. */
  outsideOpacity?: number;
  /** Accessible name for the day grid (e.g. "June 2026"). */
  ariaLabel?: string;
  /** Extra class on the day grid (for a demo's column-width sizing). */
  className?: string;
}

/** Lo/hi keys for a committed range (or not-full when an endpoint is missing). */
function rangeBounds(range?: { start: Day | null; end: Day | null }) {
  if (!range || !range.start || !range.end) return { lo: 0, hi: 0, full: false };
  const a = key(range.start), b = key(range.end);
  return { lo: Math.min(a, b), hi: Math.max(a, b), full: true };
}
/** Lo/hi keys for the live preview (start chosen, hovering toward the end). */
function previewBounds(range: { start: Day | null; end: Day | null } | undefined, preview: Day | null | undefined) {
  if (!range || !range.start || range.end || !preview) return { lo: 0, hi: 0, on: false };
  const a = key(range.start), b = key(preview);
  return { lo: Math.min(a, b), hi: Math.max(a, b), on: true };
}

/**
 * The calendar month grid - the core unit the spec documents. A Mon-first weekday header
 * row + a 6x7 day grid (role=grid) with the today ring, selected/endpoint accent fill,
 * in-range + preview tint, out-of-month dim, disabled bounds, and roving-focus keyboard
 * nav. Drive it `mode='single'` (a `selected` day) or `mode='range'` (a `range` +
 * optional hover `preview`). The month nav header + card chrome live in the consumer.
 */
export const NockerlCalendar = forwardRef<HTMLDivElement, NockerlCalendarProps>(function NockerlCalendar({
  view,
  mode = 'single',
  selected,
  range,
  preview,
  min,
  max,
  onPick,
  onHover,
  focusIdx,
  setFocusIdx,
  onKey,
  gridRef,
  today,
  cellMinHeight,
  outsideOpacity,
  ariaLabel,
  className,
  style,
  ...rest
}, ref) {
  const cells = useMemo(() => buildGrid(view.y, view.m), [view.y, view.m]);

  // Roving focus: use the controlled index when the parent owns it (multi-grid paging),
  // else self-manage seeded to selected / today / first-of-month.
  const seed = () => {
    const wanted = selected ?? today ?? null;
    const i = cells.findIndex((c) => c.m === view.m && (wanted ? sameDay(c, wanted) : c.d === Math.min(today ? today.d : 1, 28)));
    return i < 0 ? cells.findIndex((c) => c.m === view.m) : i;
  };
  const [innerFocus, setInnerFocus] = useState(seed);
  const innerGridRef = useRef<HTMLDivElement>(null);
  const controlled = focusIdx !== undefined && setFocusIdx !== undefined && onKey !== undefined;
  const curFocus = controlled ? focusIdx! : innerFocus;
  const resolvedGridRef = controlled ? gridRef : innerGridRef;

  const inBounds = (d: Day) => (!min || key(d) >= key(min)) && (!max || key(d) <= key(max));
  const todayKey = today ? key(today) : -1;

  const { lo, hi, full } = rangeBounds(range);
  const prev = previewBounds(range, preview);

  // Self-managed keyboard nav (single-grid; mirrors the demos' verbatim handler). When
  // the parent owns multi-grid paging it passes onKey + focusIdx and this is unused.
  const focusDayInner = (target: Day) => {
    requestAnimationFrame(() => {
      const btns = innerGridRef.current?.querySelectorAll<HTMLButtonElement>('.nk-cal-day');
      if (!btns) return;
      const idx = cells.findIndex((c) => key(c) === key(target));
      if (idx >= 0) { setInnerFocus(idx); btns[idx]?.focus(); }
    });
  };
  const innerKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = cells[curFocus];
    if (!from) return;
    const k = e.key;
    let target: Day | null = null;
    if (k === 'ArrowLeft') target = addDays(from, -1);
    else if (k === 'ArrowRight') target = addDays(from, 1);
    else if (k === 'ArrowUp') target = addDays(from, -7);
    else if (k === 'ArrowDown') target = addDays(from, 7);
    else if (k === 'Home') target = addDays(from, -(curFocus % 7));
    else if (k === 'End') target = addDays(from, 6 - (curFocus % 7));
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (inBounds(from)) onPick(from); return; }
    else return;
    e.preventDefault();
    // Only move within the rendered month here; cross-month paging belongs to the chrome.
    if (target.m === view.m && target.y === view.y) focusDayInner(target);
  };
  const handleKey = controlled ? onKey! : innerKey;
  const handleFocusSet = controlled ? setFocusIdx! : setInnerFocus;

  const cellStyle: CSSProperties = {
    ...(cellMinHeight !== undefined ? { ['--nk-cal-cell-min' as string]: `${cellMinHeight}px` } : {}),
    ...(outsideOpacity !== undefined ? { ['--nk-cal-outside-opacity' as string]: String(outsideOpacity) } : {}),
    ...style,
  };

  const fmtLbl = (d: Day) => `${MONTHS[d.m]!.slice(0, 3)} ${d.d}, ${d.y}`;

  return (
    <div {...rest} ref={ref} style={cellStyle}>
      <div className="nk-cal-grid" role="row">
        {WEEKDAYS.map((w) => (<span key={w} className="nk-cal-wd" role="columnheader" aria-label={w}>{w}</span>))}
      </div>

      <div className="nk-cal-body" key={`${view.y}-${view.m}`}>
        <div
          className={['nk-cal-grid', className].filter(Boolean).join(' ')}
          role="grid"
          aria-label={ariaLabel}
          ref={resolvedGridRef}
          onKeyDown={handleKey}
        >
          {cells.map((c, i) => {
            const k = key(c);
            const outside = c.m !== view.m;
            const isToday = k === todayKey;
            const disabled = !inBounds(c);

            // Selection / range geometry. SINGLE: one selected day. RANGE: endpoints +
            // the active band (committed in-range, OR the live preview - never both).
            const isStart = mode === 'range' && sameDay(c, range?.start);
            const isEnd = mode === 'range' && sameDay(c, range?.end);
            const isSel = mode === 'single' ? sameDay(c, selected) : isStart || isEnd;

            const band = full
              ? { lo, hi, cls: 'is-inrange', on: true }
              : { lo: prev.lo, hi: prev.hi, cls: 'is-preview', on: prev.on };
            const inBand = mode === 'range' && band.on && k >= band.lo && k <= band.hi && !disabled;

            const cellCls = ['nk-cal-cell',
              inBand ? band.cls : '',
              mode === 'range' && band.on && k === band.lo ? 'is-edge-start' : '',
              mode === 'range' && band.on && k === band.hi ? 'is-edge-end' : '']
              .filter(Boolean).join(' ');
            const dayCls = ['nk-cal-day',
              outside ? 'is-outside' : '',
              isToday ? 'is-today' : '',
              isSel ? 'is-selected' : '']
              .filter(Boolean).join(' ');
            const role = isStart ? ', range start' : isEnd ? ', range end' : '';

            return (
              <span key={k} className={cellCls} role="gridcell" aria-selected={isSel || undefined}>
                <button type="button" className={dayCls} disabled={disabled}
                  tabIndex={i === curFocus ? 0 : -1}
                  aria-label={`${fmtLbl(c)}${isToday ? ', today' : ''}${role}`}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => onPick(c)}
                  onMouseEnter={onHover ? () => onHover(c) : undefined}
                  onMouseLeave={onHover ? () => onHover(null) : undefined}
                  onFocus={() => { handleFocusSet(i); if (onHover) onHover(c); }}
                  onBlur={onHover ? () => onHover(null) : undefined}>
                  {c.d}
                </button>
              </span>
            );
          })}
        </div>
      </div>

      <style>{NOCKERL_CALENDAR_STYLES}</style>
    </div>
  );
});

// The month-GRID primitive. It renders each day cell as a raw <button> and legitimately
// OWNS it (the day-pick control). The grid is built from the `view`/`selected`/`range`
// DATA props (not component slots), and the picker chrome lives in the consumer → a leaf
// that owns its day cells. (role="grid"/"gridcell" are not in the facsimile set.)
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default NockerlCalendar;
