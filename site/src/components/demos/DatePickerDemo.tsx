/**
 * DatePickerDemo: the live, interactive Nockerl calendar date picker for the web.
 *
 * NOTE on cross-platform truth: neither shipped app carries a CUSTOM calendar.
 * Android (`tasks/domain/Task.kt`) stores `dueDate` as an ISO string and only
 * FORMATS dates (`DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a")` /
 * time-ago in NotificationRow.kt); Voice formats a chart axis with
 * `.dateTime`/`NockerlCalendar.current`. So Kotlin/Swift document the STOCK pickers
 * (Material3 `DatePicker`, SwiftUI `.datePickerStyle(.graphical)`), and this web
 * island is designed ORIGINALLY from the design laws using the shared control
 * vocabulary (the recessed field-trigger from NockerlTextField, the prev/next idiom
 * from NockerlIconButton, 12px control radius, 16px card).
 *
 * Implements the design laws verbatim:
 *   • the panel is a CARD that LIFTS (lighter + neutral drop shadow + top
 *     catch-light); the trigger FIELD SINKS (recessed well + inner shadow).
 *   • a SELECTED day is the cyan accent fill (static) with on-accent text, the
 *     one brand accent. TODAY is a cyan RING (a shape, not a glow).
 *   • range = soft cyan in-range TINT between two accent endpoints (start/end).
 *   • flash-free feedback: a day's fill never tweens. Hover/press animate a
 *     neutral wash + scale; the month change animates transform/opacity only.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   • disabled (out-of-bounds / past) days stay legible (≥3:1) but inert.
 *   • prefers-reduced-motion freezes the month transition.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a `var(--token)` (see
 * docs/demo-token-contract.md). Literals remain only for pure geometry (ring
 * width, the 7-col grid, transition curves). To stay deterministic, "today" is
 * pinned to a FIXED demo date, not the real clock.
 */
import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { NockerlCalendar as CalendarGrid, NockerlIcon, MONTHS, NockerlPopover, NockerlSurface, addDays, addMonths, buildGrid, fromDay, key, sameDay, toDay, type ComposeContract, type Day, type NockerlPopoverHandle } from '@dizyx/nockerl-react';

// ── Fixed demo "today" (deterministic, never the real clock) ──────────────────
const TODAY = new Date(2026, 5, 15); // 15 Jun 2026 (month is 0-indexed)
const TODAY_DAY = toDay(TODAY);

// Day label for the field/output text (the grid's own aria labels live in NockerlCalendar).
const fmt = (d: Day) =>
  `${MONTHS[d.m]!.slice(0, 3)} ${d.d}, ${d.y}`;

// Every visual value is a token; the dark stage resolves the cyan accent. The
// panel LIFTS (card radius + drop shadow + catch-light); the trigger SINKS.
// The MONTH-GRID rules now live in the NockerlCalendar primitive (NOCKERL_CALENDAR_STYLES); what
// remains here is this demo's OUTER chrome only - field/trigger, popover, the card +
// month-nav header + footer that wrap the grid.
const STYLES = `
/* the demo root is ALSO the boundary the popover calendar clamps into (position:relative =
   the anchor for NockerlPopover's stage-local absolute panel); its height comes from the
   always-open inline + range calendars, so the popover has room to open below the field. */
.nk-dp-demo { position: relative; font-family: var(--font-family-sans); color: var(--color-on-card); }
.nk-dp-demo__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, max-content)); gap: var(--space-8) var(--space-10); align-items: start; }
.nk-dp-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-dp-demo__out { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-3); }
.nk-dp-demo__out b { color: var(--color-accent-primary); }

/* The recessed trigger FIELD (it sinks, mirroring NockerlTextField). Persistent label above. */
.nk-dp-field { display: flex; flex-direction: column; gap: var(--space-1); max-width: 280px; }
.nk-dp-field__label { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-card); line-height: var(--font-line-height-20); }
.nk-dp-trigger {
  display: flex; align-items: center; gap: var(--space-2);
  width: 100%; text-align: left; cursor: pointer; font: inherit;
  color: var(--color-on-card); font-size: var(--font-size-14);
  background: var(--color-canvas-alt);
  border: var(--space-px) solid var(--color-outline-subtle);
  border-radius: var(--radius-control);
  padding: var(--space-3); min-height: var(--size-min-touch);
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight);
  transition: border-color .12s, box-shadow .12s;
}
.nk-dp-trigger:hover { border-color: color-mix(in srgb, var(--color-outline-subtle) 80%, var(--color-on-card)); }
.nk-dp-trigger.is-open, .nk-dp-trigger:focus-visible {
  outline: none; border-color: var(--color-accent-primary);
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), 0 0 0 var(--space-0-5) color-mix(in srgb, var(--color-accent-primary) 45%, transparent);
}
/* : OPEN is a SELECTION state (this trigger owns the open calendar), so its EDGE takes
   the selection weight at 45%. Scoped to .is-open alone so the focus ring above (a11y, full
   strength) is untouched. */
.nk-dp-trigger.is-open {
  border-width: var(--border-width-selection);
  border-color: color-mix(in srgb, var(--color-accent-primary) 45%, transparent);
}
.nk-dp-trigger__icon { color: var(--color-on-card-muted); display: inline-flex; margin-left: auto; }
.nk-dp-trigger__icon svg { display: block; width: 18px; height: 18px; }
.nk-dp-trigger__ph { color: color-mix(in srgb, var(--color-on-card-muted) 80%, transparent); }

/* popover trigger column: the field. NockerlPopover now owns the floating panel's
   anchor / flip / clamp / scrim / Esc (the panel is no longer an absolute child here). */
.nk-dp-pop { max-width: 280px; }

/* The BARE popover shell defers ENTIRELY to the calendar card inside it: the .nk-dp-cal
   NockerlSurface is the one visible 16px card (its own fill + hairline + lift), so the bare
   panel contributes ONLY the anchor/flip/clamp/scrim/Esc machinery; its own surface1
   fill, hairline, panel radius and drift shadow are stripped here so the SAME card reads
   exactly as before (no card-in-panel double surface). All neutral resets, no new values. */
.nk-dp-demo .nk-pp-pop--bare {
  background: transparent; border: 0; border-radius: 0; box-shadow: none;
}

/* The calendar PANEL is a CARD that LIFTS. NockerlSurface owns bg + hairline + radius + sheen. */
.nk-dp-demo .nk-dp-cal {
  width: 280px;
  padding: var(--space-3);
  box-shadow: 0 var(--space-2) var(--elevation-level3) -8px color-mix(in srgb, var(--color-shadow-tint) 65%, transparent), var(--nk-surface-sheen);
}
/* header: month/year title + prev/next (the NockerlIconButton plain idiom) */
.nk-dp-cal__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2); }
.nk-dp-cal__title { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-card); }
.nk-dp-nav {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; padding: 0; cursor: pointer;
  background: transparent; border: var(--space-px) solid transparent;
  border-radius: var(--radius-control); color: var(--color-on-card);
  transition: background-color .12s, transform .12s cubic-bezier(.2,0,0,1);
}
.nk-dp-nav:hover { background: color-mix(in srgb, var(--color-on-card) 7%, transparent); }
.nk-dp-nav:active { transform: scale(.94); background: color-mix(in srgb, var(--color-on-card) 4%, transparent); }
.nk-dp-nav:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
.nk-dp-nav svg { display: block; width: 18px; height: 18px; }

/* NOTE: the month-grid rules (weekday headers, body animation, day cell + day-state +
   in-range tint) moved to the NockerlCalendar primitive (nk-cal*, see NOCKERL_CALENDAR_STYLES). This
   demo composes <NockerlCalendar mode='single'|'range' /> for the grid; only the card chrome
   (header / footer) lives here now. */

/* footer hint */
.nk-dp-cal__foot { margin-top: var(--space-2); padding-top: var(--space-2); border-top: var(--space-px) solid var(--color-card-hairline);
  font-size: var(--font-size-10); color: var(--color-on-card-muted); text-align: center; }

@media (prefers-reduced-motion: reduce) {
  .nk-dp-nav, .nk-dp-trigger { transition: none; }
}
`;

// ── Inline glyphs (stroke icons from the shared NockerlIcon primitive; CSS sizes each slot) ──
const IconPrev = <NockerlIcon name="chevronLeft" />;
const IconNext = <NockerlIcon name="chevronRight" />;
const IconCal = (<NockerlIcon><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></NockerlIcon>);

interface CalendarProps {
  /** The currently-displayed month/year (controlled). */
  view: { y: number; m: number };
  onViewChange: (v: { y: number; m: number }) => void;
  /** Single selection, or the two endpoints of a range. */
  selected?: Day | null;
  rangeStart?: Day | null;
  rangeEnd?: Day | null;
  /** Inclusive selectable bounds; days outside are disabled. */
  min?: Day;
  max?: Day;
  onPick: (d: Day) => void;
  /** Footer hint line. */
  hint?: string;
}

/**
 * The calendar surface is the core unit. A lifted card: month title + prev/next, a footer
 * hint, wrapping the shared NockerlCalendar month grid (the primitive). The CARD + month-NAV
 * HEADER + FOOTER are this demo's chrome; the Mon-first weekday headers, day grid (today
 * ring, selected accent fill, range tint), disabled bounds and roving-focus keyboard nav
 * are the NockerlCalendar primitive. This wrapper owns the keyboard handler (controlled mode) so
 * arrow-across-month-boundary + PageUp/PageDown still PAGE the view, exactly as before.
 */
function Calendar({ view, onViewChange, selected, rangeStart, rangeEnd, min, max, onPick, hint }: CalendarProps) {
  // Roving focus: the day index that owns tabindex 0 within the grid (owned here so the
  // keyboard handler can page the view when focus leaves the rendered month).
  const cells = useMemo(() => buildGrid(view.y, view.m), [view.y, view.m]);
  const initFocus = cells.findIndex((c) => c.m === view.m && (selected ? sameDay(c, selected) : c.d === Math.min(TODAY.getDate(), 28)));
  const [focusIdx, setFocusIdx] = useState(initFocus < 0 ? cells.findIndex((c) => c.m === view.m) : initFocus);
  const gridRef = useRef<HTMLDivElement>(null);

  const inBounds = (d: Day) => (!min || key(d) >= key(min)) && (!max || key(d) <= key(max));
  const isRange = !!rangeStart || !!rangeEnd;

  // Move roving focus to a target DAY. If it falls outside the shown month we page the
  // view to that day's month and focus the cell that holds it, correct across both
  // week-wrap and month boundaries (no index arithmetic guesswork). Queries the grid's
  // day buttons (now the primitive's .nk-cal-day).
  const focusDay = (target: Day) => {
    if (target.m !== view.m || target.y !== view.y) onViewChange({ y: target.y, m: target.m });
    requestAnimationFrame(() => {
      const btns = gridRef.current?.querySelectorAll<HTMLButtonElement>('.nk-cal-day');
      if (!btns) return;
      const grid = buildGrid(target.y, target.m);
      const idx = grid.findIndex((c) => key(c) === key(target));
      if (idx >= 0) { setFocusIdx(idx); btns[idx]?.focus(); }
    });
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = cells[focusIdx];
    if (!from) return;
    const k = e.key;
    let target: Day | null = null;
    if (k === 'ArrowLeft') target = addDays(from, -1);
    else if (k === 'ArrowRight') target = addDays(from, 1);
    else if (k === 'ArrowUp') target = addDays(from, -7);
    else if (k === 'ArrowDown') target = addDays(from, 7);
    else if (k === 'Home') target = addDays(from, -(focusIdx % 7));         // start of week
    else if (k === 'End') target = addDays(from, 6 - (focusIdx % 7));        // end of week
    else if (k === 'PageUp') { e.preventDefault(); onViewChange(addMonths(view.y, view.m, -1)); return; }
    else if (k === 'PageDown') { e.preventDefault(); onViewChange(addMonths(view.y, view.m, 1)); return; }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (inBounds(from)) onPick(from); return; }
    else return;
    e.preventDefault();
    focusDay(target);
  };

  return (
    <NockerlSurface className="nk-dp-cal" role="group" aria-label={`${MONTHS[view.m]} ${view.y}`}>
      <div className="nk-dp-cal__head">
        <button type="button" className="nk-dp-nav" aria-label="Previous month"
          onClick={() => onViewChange(addMonths(view.y, view.m, -1))}>{IconPrev}</button>
        <span className="nk-dp-cal__title" aria-live="polite">{MONTHS[view.m]} {view.y}</span>
        <button type="button" className="nk-dp-nav" aria-label="Next month"
          onClick={() => onViewChange(addMonths(view.y, view.m, 1))}>{IconNext}</button>
      </div>

      <CalendarGrid
        view={view}
        mode={isRange ? 'range' : 'single'}
        selected={selected}
        range={isRange ? { start: rangeStart ?? null, end: rangeEnd ?? null } : undefined}
        min={min} max={max}
        today={TODAY_DAY}
        cellMinHeight={34}
        outsideOpacity={0.55}
        onPick={onPick}
        focusIdx={focusIdx}
        setFocusIdx={setFocusIdx}
        onKey={onKey}
        gridRef={gridRef}
      />

      {hint && <div className="nk-dp-cal__foot">{hint}</div>}
    </NockerlSurface>
  );
}

/**
 * The interactive showcase mounted on the Date picker page: an input field +
 * popover calendar (single date), an always-open INLINE calendar with min/max
 * bounds, and a two-step RANGE picker with in-range tint, all token-driven,
 * keyboard-operable, today pinned to a fixed demo date.
 */
// LEAF: the date field. It OWNS the field-trigger <button> it renders (it IS the date control) + composes NockerlCalendar (the month grid + day cells), NockerlSurface, NockerlIcon. FLAG: the month prev/next nav <button>s are plain icon actions that should compose NockerlIconButton (the code comment even calls them "the NockerlIconButton plain idiom"), and they are only incidentally covered by this same `button` own.
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

// The single popover-calendar id (one field-trigger → one anchored panel).
const POP_ID = 'due';

export default function DatePickerDemo() {
  // 1. Field + popover, single date. NockerlPopover owns the anchored panel (flip/clamp +
  // outside-click scrim + Esc + focus-trap); the demo drives it imperatively (open/close)
  // and reads its open id for the trigger's aria-expanded + is-open state. The stage the
  // panel clamps into is the demo root (stageRef); autoFocus is OFF so the calendar keeps
  // its OWN roving-focus model (focusIdx), so the panel never steals focus from the trigger.
  const stageRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<NockerlPopoverHandle>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Day | null>({ y: 2026, m: 5, d: 18 });
  const [popView, setPopView] = useState({ y: 2026, m: 5 });
  const isPopOpen = openId === POP_ID;

  // Toggle the panel from the field-trigger: same trigger closes; else open anchored to it
  // preferring BOTTOM (the picker opens below the field, as before). viaKeyboard focuses
  // inside on keyboard-open, but with autoFocus off the calendar owns its own focus.
  const onTrigger = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (isPopOpen) popRef.current?.close();
    else popRef.current?.open(POP_ID, 'bottom', e.currentTarget, false);
  }, [isPopOpen]);

  const onTriggerKey = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (isPopOpen) popRef.current?.close();
      else popRef.current?.open(POP_ID, 'bottom', e.currentTarget, true);
    }
  }, [isPopOpen]);

  // 2. Inline, single date, with min/max bounds (this month only, no past)
  const [inline, setInline] = useState<Day | null>(toDay(TODAY));
  const [inlineView, setInlineView] = useState({ y: 2026, m: 5 });
  const minBound = toDay(TODAY);                 // no past dates
  const maxBound: Day = { y: 2026, m: 5, d: 30 }; // through end of June

  // 3. Range selection
  const [rStart, setRStart] = useState<Day | null>({ y: 2026, m: 5, d: 9 });
  const [rEnd, setREnd] = useState<Day | null>({ y: 2026, m: 5, d: 13 });
  const [rView, setRView] = useState({ y: 2026, m: 5 });
  const pickRange = (d: Day) => {
    if (!rStart || (rStart && rEnd)) { setRStart(d); setREnd(null); return; }
    if (key(d) < key(rStart)) { setREnd(rStart); setRStart(d); return; }
    setREnd(d);
  };

  return (
    <div className="nk-dp-demo" ref={stageRef}>
      <style>{STYLES}</style>

      {/* the anchored popover CALENDAR is bare (the .nk-dp-cal card owns the shell + ARIA),
          no arrow, autoFocus off (the calendar owns its roving focusIdx). NockerlPopover supplies
          flip/clamp + outside-click scrim + Esc, clamped into the demo-root stage. Its body
          is the SAME calendar card that used to live in the absolute panel. Width matches the
          card (280px) so the bare panel fits it edge-to-edge. */}
      <NockerlPopover
        bare
        arrow={false}
        autoFocus={false}
        boundaryRef={stageRef}
        handleRef={popRef}
        getWidth={() => '280px'}
        onOpenChange={setOpenId}
        renderContent={() => (
          <Calendar view={popView} onViewChange={setPopView} selected={picked}
            hint="Click a day · Esc / click trigger to close"
            onPick={(d) => { setPicked(d); setPopView({ y: d.y, m: d.m }); popRef.current?.close(); }} />
        )}
      />

      <div className="nk-dp-demo__grid">
        {/* ── Field + popover (single) ── */}
        <div>
          <p className="nk-dp-demo__lbl">Field + popover · single date</p>
          <div className="nk-dp-pop">
            <div className="nk-dp-field">
              <span className="nk-dp-field__label" id="dp-trigger-lbl">Due date</span>
              <button type="button"
                className={`nk-dp-trigger${isPopOpen ? ' is-open' : ''}`}
                aria-haspopup="dialog" aria-expanded={isPopOpen} aria-labelledby="dp-trigger-lbl"
                onClick={onTrigger} onKeyDown={onTriggerKey}>
                {picked ? <span>{fmt(picked)}</span> : <span className="nk-dp-trigger__ph">Pick a date</span>}
                <span className="nk-dp-trigger__icon">{IconCal}</span>
              </button>
            </div>
          </div>
          <p className="nk-dp-demo__out">Selected: <b>{picked ? fmt(picked) : 'none'}</b></p>
        </div>

        {/* ── Inline + min/max bounds (single) ── */}
        <div>
          <p className="nk-dp-demo__lbl">Inline · min/max bounds · today marked</p>
          <Calendar view={inlineView} onViewChange={setInlineView} selected={inline}
            min={minBound} max={maxBound}
            hint="No past dates · selectable through Jun 30"
            onPick={(d) => { setInline(d); setInlineView({ y: d.y, m: d.m }); }} />
          <p className="nk-dp-demo__out">Selected: <b>{inline ? fmt(inline) : 'none'}</b></p>
        </div>

        {/* ── Range selection ── */}
        <div>
          <p className="nk-dp-demo__lbl">Range · start → end with in-range tint</p>
          <Calendar view={rView} onViewChange={setRView} rangeStart={rStart} rangeEnd={rEnd}
            hint="Click start, then end · click again to restart"
            onPick={pickRange} />
          <p className="nk-dp-demo__out">
            Range: <b>{rStart ? fmt(rStart) : '…'}</b> → <b>{rEnd ? fmt(rEnd) : '…'}</b>
            {rStart && rEnd ? ` · ${Math.abs((+fromDay(rEnd) - +fromDay(rStart)) / 86400000) + 1} days` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
