/**
 * MultiSelectDemo: the live, interactive Nockerl multi-select island for the web.
 *
 * The SELECTION-MANAGEMENT picker, distinct from Combobox: the trigger is a BUTTON (not a
 * type-to-filter input), chosen values live as removable token chips (with "+N more") or a
 * "N selected" count, the dropdown header carries a live count + SELECT-ALL / CLEAR-ALL, and
 * every option ROW leads with a CHECKBOX. Type-to-filter is OPTIONAL and secondary.
 *
 * Composes shipped idioms: the field WELL (recessed, 12px, cyan focus outline), the CHECKBOX
 * box + drawn tick on a static cyan fill (the Android AskUserQuestionSheet pattern), and the
 * removable TOKEN chip. The dropdown is the shared NockerlPopover (bare mode): surface +
 * flip/clamp + outside-click scrim + Esc + focus-restore; the listbox rides it edge-to-edge.
 *
 * Laws: trigger SINKS / popover LIFTS; depth = neutral shadow + catch-light (no glow); a checked
 * box is a STATIC cyan gradient (tick draws, opacity cross-fades, never a fill swap); only
 * brightness / transform / opacity animate; freeze under reduced-motion. A11y: trigger = button
 * (aria-haspopup / -expanded); role="listbox" aria-multiselectable + aria-selected rows via
 * aria-activedescendant; aria-live count; real Select/Clear-all. Keyboard: Enter/↓ open, ↑↓ move,
 * Space toggles, Enter confirms, Backspace pops the last token, Esc closes. TOKEN-REACTIVE.
 */
import { useId, useMemo, useRef, useState, type RefObject } from 'react';
import { NockerlButton, NockerlChip, NockerlIcon, NockerlListboxOption, NockerlPopover, NockerlSegmentedControl, listboxRun, type ComposeContract, type ListboxOptionRun, type NockerlPopoverHandle } from '@dizyx/nockerl-react';

import { SearchField } from './SearchFieldDemo';
export type MultiSelectStatus = 'success' | 'warning' | 'error' | 'info' | 'idle';
export interface MultiSelectOption {
  value: string; // stable identity + selected-value carrier
  label: string; // primary line: the option's accessible name (label.large)
  secondary?: string; // supporting line under the label (body.small)
  status?: MultiSelectStatus; // leading status mark: status colors only, never cyan
  disabled?: boolean; // inert + still legible (never invisible)
}
/** How the trigger field renders the current selection. */
export type MultiSelectDisplay = 'tokens' | 'count';
// Trigger WELL sinks; popover CARD lifts. A checked box lifts to a STATIC cyan gradient (tick draws,
// cyan cross-fades, no fill hard-cut). Tokens throughout; dark stage resolves cyan to #0cc0df.
const STYLES = `
/* .nk-ms-demo is the popover BOUNDARY (boundaryRef); position:relative so NockerlPopover reads
   anchor rects against it and clamps the open dropdown inside this column (never the page). */
.nk-ms-demo { font-family: var(--font-family-sans); max-width: 480px; position: relative; }
.nk-ms { display: flex; flex-direction: column; gap: var(--space-1); }
.nk-ms + .nk-ms { margin-top: var(--space-5); }
.nk-ms__label { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-card); line-height: var(--font-line-height-20); }
/* ── The TRIGGER is a recessed WELL (fields sink); it is a BUTTON, not an input
   (selection management, not typing): inner shadow + a faint top catch-light. ── */
.nk-ms__trigger { display: flex; align-items: center; gap: var(--space-2); width: 100%; text-align: left; min-height: var(--size-min-touch); cursor: pointer; color: var(--color-on-card); font: inherit;
  background: var(--color-canvas-alt); border: var(--space-px) solid var(--color-outline-subtle); border-radius: var(--radius-control); padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3);
  transition: border-color .12s, box-shadow .12s, background-color .12s;
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-ms__trigger:hover:not(.is-disabled) { border-color: color-mix(in srgb, var(--color-outline-subtle) 80%, var(--color-on-card)); }
/* open / focus = a cyan OUTLINE ring (box-shadow ring hugs the radius), still inset-shadowed so it never lifts. */
.nk-ms__trigger.is-open, .nk-ms__trigger:focus-visible { outline: none; border-color: var(--color-accent-primary);
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), 0 0 0 var(--space-0-5) color-mix(in srgb, var(--color-accent-primary) 45%, transparent); }
/* OPEN is a SELECTION state, so its EDGE softens to the selection weight. Scoped to
   .is-open alone; the focus ring above stays full strength. */
.nk-ms__trigger.is-open { border-width: var(--border-width-selection); border-color: color-mix(in srgb, var(--color-accent-primary) 45%, transparent); }
.nk-ms__trigger.is-disabled { background: var(--color-canvas); border-color: var(--color-canvas-edge); cursor: not-allowed; box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent); }
.nk-ms__trigger.is-disabled .nk-ms__placeholder, .nk-ms__trigger.is-disabled .nk-ms__summary { color: var(--color-on-card-muted); }
/* the value area: tokens wrap neatly OR the count summary sits on one line */
.nk-ms__values { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1); padding: var(--space-1) 0; }
.nk-ms__placeholder { color: color-mix(in srgb, var(--color-on-card-muted) 78%, transparent); font-size: var(--font-size-14); line-height: var(--font-line-height-20); }
/* COUNT-summary mode: a soft-cyan pill stating the running total (management at a glance) */
.nk-ms__summary { display: inline-flex; align-items: center; gap: var(--space-1); background: var(--color-accent-primary-soft); color: var(--color-accent-primary);
  border-radius: var(--radius-pill); padding: var(--space-1) var(--space-3); font-size: var(--font-size-12); font-weight: var(--font-weight-semibold); line-height: 1; }
.nk-ms__summary b { font-weight: var(--font-weight-bold); }
/* The removable TOKEN is now the NockerlChip primitive in token mode (.nk-chip--token, self
   injected). The bespoke .nk-ms__token / .nk-ms__token-x recipe is gone. */
/* overflow "+N more": a quiet neutral pill, NOT cyan (it is not itself a selection) */
.nk-ms__more { flex: 0 0 auto; background: color-mix(in srgb, var(--color-on-card) 8%, transparent); color: var(--color-on-card-muted);
  border-radius: var(--radius-pill); padding: var(--space-1) var(--space-2); font-size: var(--font-size-12); font-weight: var(--font-weight-semibold); line-height: 1; }
/* trailing cluster: clear-all (✕) then the chevron */
.nk-ms__trail { flex: 0 0 auto; display: inline-flex; align-items: center; gap: var(--space-1); }
.nk-ms__clear { all: unset; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: var(--space-6); height: var(--space-6);
  border-radius: var(--radius-control); color: var(--color-on-card-muted); transition: color .12s, background-color .12s; }
.nk-ms__clear:hover { color: var(--color-on-card); background: color-mix(in srgb, var(--color-on-card) 8%, transparent); }
.nk-ms__clear:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(var(--space-px) * -1); color: var(--color-on-card); }
.nk-ms__clear svg, .nk-ms__chev svg { display: block; width: 16px; height: 16px; }
.nk-ms__chev { color: var(--color-on-card-muted); display: inline-flex; padding-right: var(--space-1); transition: transform .16s cubic-bezier(.2,0,0,1); }
.nk-ms__trigger.is-open .nk-ms__chev { transform: rotate(180deg); }
/* ── The LIFTED popover CARD is now the NockerlPopover primitive (bare mode): it owns the elevated
   surface (card gradient + neutral drop shadow + top catch-light), the anchor→flip→clamp
   positioning, the scale-in open (frozen under reduced-motion), the outside-click SCRIM, Esc, and
   focus-restore. bare mode = padding 0 + no arrow + no baked role=dialog, so this content owns its own
   edge-to-edge shell + listbox ARIA. The dropdown's inner content (header / filter / list) styles
   below are unchanged; overflow:hidden that rounded the panel corners now lives on the shell. ── */
.nk-ms__shell { overflow: hidden; border-radius: inherit; }
/* the HEADER is the management surface (the multi-select's signature): live count + Select-all / Clear-all. */
.nk-ms__header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-bottom: var(--space-px) solid var(--color-card-hairline); }
.nk-ms__count { font-size: var(--font-size-12); font-weight: var(--font-weight-semibold); color: var(--color-on-card); white-space: nowrap; }
.nk-ms__count b { color: var(--color-accent-primary); }
.nk-ms__count em { font-style: normal; color: var(--color-on-card-muted); font-weight: var(--font-weight-medium); }
.nk-ms__actions { display: inline-flex; align-items: center; gap: var(--space-1); }
/* Select-all / Clear-all are the NockerlButton primitive (ghost · sm). The base recipe (uppercase,
   tracked, transparent, disabled, focus ring) comes from .nk-btn--ghost; these demo-scoped
   rules only carry the header's cyan ink + soft-cyan hover wash (a bulk-action link idiom),
   at two-selector specificity so they beat the injected NockerlButton styles regardless of order. */
.nk-ms-demo .nk-ms__action { color: var(--color-accent-primary); }
.nk-ms-demo .nk-ms__action:hover:not(:disabled) { background: var(--color-accent-primary-soft); }
.nk-ms-demo .nk-ms__action:disabled { color: var(--color-on-card-muted); }
.nk-ms__action-sep { width: var(--space-px); height: var(--font-line-height-16); background: var(--color-card-hairline); }
/* optional inline FILTER - secondary here (search is the Combobox's headline, not ours).
   The filter is now the composed SearchField primitive (its own recessed well + leading
   magnifier + clear + searchbox a11y); this wrapper only supplies the padded, hairline-
   separated band the field sits in, and carries the listbox keyboard handler (arrow / space /
   enter / esc / backspace bubble up from the search input to drive the option rows). */
.nk-ms__filter { padding: var(--space-2) var(--space-3); border-bottom: var(--space-px) solid var(--color-card-hairline); }
.nk-ms__list { list-style: none; margin: 0; padding: var(--space-1); max-height: 240px; overflow-y: auto; }
/* the OPTION ROW (leading checkbox -> status -> label) now comes from the NockerlListboxOption
   primitive (.nk-opt recipe, multi mode); the row markup + its CSS live there. */
/* empty / no-matches: quiet, centered, never an error color */
.nk-ms__empty { padding: var(--space-4) var(--space-3); text-align: center; font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-ms__empty b { color: var(--color-on-card); font-weight: var(--font-weight-semibold); }
/* helper / limit line: turns warm only when the cap is hit (color + icon + text, never color alone) */
.nk-ms__help { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); min-height: var(--font-line-height-16); display: inline-flex; align-items: center; gap: var(--space-1); }
.nk-ms__help.is-limit { color: var(--color-status-warning); }
.nk-ms__help svg { display: block; width: 14px; height: 14px; }
@media (prefers-reduced-motion: reduce) {
  .nk-ms__trigger, .nk-ms__chev, .nk-ms__clear, .nk-ms__action { transition: none; }
}
.nk-ms-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-ms-demo__group + .nk-ms-demo__group { margin-top: var(--space-8); }
.nk-ms-demo__count { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-8); }
.nk-ms-demo__count b { color: var(--color-accent-primary); }
`;
// ─── Glyphs (stroke icons via the NockerlIcon primitive - currentColor so each slot tints).
// Chevron/close match the NockerlIcon registry exactly (name=); warn is multi-element
// (exact-same children). No size prop - the surrounding CSS sizes each svg as before.
// (The filter's search magnifier now comes from the composed SearchField, not a local glyph.) ──
const IconChevron = <NockerlIcon name="chevronDown" />;
const IconClose = <NockerlIcon name="x" />;
const IconWarn = <NockerlIcon><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></NockerlIcon>;
/** Case-insensitive substring filter (mirrors the Swift HistoryView idiom). */
function matches(option: MultiSelectOption, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return option.label.toLowerCase().includes(q) || (option.secondary?.toLowerCase().includes(q) ?? false);
}
/** Render a label with the matched run highlighted (a <mark>, not color alone). */
function highlight(label: string, query: string) {
  if (!query) return label;
  const i = label.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return label;
  return (
    <>
      {label.slice(0, i)}
      <mark>{label.slice(i, i + query.length)}</mark>
      {label.slice(i + query.length)}
    </>
  );
}
interface OptionRowProps {
  option: MultiSelectOption; id: string; query: string; selected: boolean; active: boolean;
  run: ListboxOptionRun; blockedByLimit: boolean; onActivate: () => void; onToggle: () => void;
}
/** One option ROW: leading CHECKBOX column → label (+secondary, +status). */
function OptionRow({ option: o, id, query, selected, active, run, blockedByLimit, onActivate, onToggle }: OptionRowProps) {
  const inert = o.disabled || (blockedByLimit && !selected);
  return (
    <NockerlListboxOption
      id={id}
      multi
      run={run}
      status={o.status}
      primary={highlight(o.label, query)}
      secondary={o.secondary}
      selected={selected}
      active={active}
      disabled={inert}
      onActivate={onActivate}
      onSelect={onToggle}
    />
  );
}
// The removable token is now the real NockerlChip primitive in `token` mode (a NON-button
// <span> tag with a span[role=button] ✕), composed in the trigger below. No bespoke
// token, and no nested real <button> inside the trigger.
interface MultiSelectProps {
  label: string; // persistent label above the trigger, never a placeholder
  options: MultiSelectOption[]; // full set
  value: string[]; // the selected set
  onChange: (next: string[]) => void; // emits the next selected set
  boundaryRef: RefObject<HTMLElement | null>; // the shared stage NockerlPopover clamps the dropdown into
  display?: MultiSelectDisplay; // 'tokens' (chips in the field) or 'count' ("N selected")
  maxTokens?: number; // tokens shown before collapsing to "+N more" (tokens mode)
  max?: number; // selection cap: unchecked rows disable once reached
  filterable?: boolean; // show the optional inline filter (secondary affordance)
  placeholder?: string;
  helperText?: string;
  disabled?: boolean; // inert + still legible (never invisible)
}
/** A single Nockerl multi-select: the unit the spec documents. */
function MultiSelect({
  label, options, value, onChange, boundaryRef, display = 'tokens', maxTokens = 3, max,
  filterable = false, placeholder = 'Select…', helperText, disabled = false,
}: MultiSelectProps) {
  const id = useId();
  const popId = `${id}-pop`; // this instance's popover id (each MultiSelect shares one boundary stage)
  const listId = `${id}-list`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Wraps the composed SearchField so focus-on-open can reach its inner searchbox.
  const filterWrapRef = useRef<HTMLDivElement>(null);
  // NockerlPopover imperative handle: the trigger drives open/close; onOpenChange feeds `openId`.
  const ph = useRef<NockerlPopoverHandle>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId != null; // derived: is this instance's dropdown open?
  // Panel width mirrors the trigger (captured at open time → NockerlPopover.getWidth).
  const [panelW, setPanelW] = useState<string>();
  const [active, setActive] = useState(0); // index into `navigable` for the keyboard cursor
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => options.filter((o) => matches(o, query)), [options, query]);
  const selectable = useMemo(() => options.filter((o) => !o.disabled), [options]);
  const allSelected = selectable.length > 0 && selectable.every((o) => selectedSet.has(o.value));
  const noneSelected = value.length === 0;
  const atLimit = max != null && value.length >= max;
  // The keyboard cursor walks the rows that can actually be toggled right now
  // (not disabled, and, if the cap is hit, already selected).
  const navigable = useMemo(
    () => filtered.filter((o) => !o.disabled && !(atLimit && !selectedSet.has(o.value))),
    [filtered, atLimit, selectedSet],
  );
  const clampActive = (i: number) => (navigable.length === 0 ? 0 : (i + navigable.length) % navigable.length);

  const toggle = (option: MultiSelectOption) => {
    if (option.disabled) return;
    const has = selectedSet.has(option.value);
    if (!has && atLimit) return; // cap reached, adding is blocked
    onChange(has ? value.filter((v) => v !== option.value) : [...value, option.value]);
  };

  // Select-all respects the cap (fills up to `max`); clear-all empties the set.
  const selectAll = () => onChange((max != null ? selectable.slice(0, max) : selectable).map((o) => o.value));
  const clearAll = () => onChange([]);

  // Open via the NockerlPopover handle (anchored to the trigger, clamped into boundaryRef; it owns
  // scrim + Esc + focus-restore). autoFocus={false} = the external-focus combobox model: DOM focus
  // stays on the trigger (or the filter searchbox when filterable) so keys reach onKeyDown, while
  // the non-focusable listbox rows are driven by aria-activedescendant.
  const openPop = (el: HTMLElement, viaKeyboard: boolean) => {
    if (disabled) return;
    setPanelW(`${Math.round(el.getBoundingClientRect().width)}px`);
    ph.current?.open(popId, 'bottom', el, viaKeyboard);
    if (filterable) requestAnimationFrame(() => filterWrapRef.current?.querySelector('input')?.focus());
  };
  // Close via the handle (NockerlPopover restores focus to the trigger by default). The filter
  // query is reset centrally in onOpenChange(null), so EVERY close path (Enter, Esc, the
  // outside-click scrim) clears it exactly as the old close() did.
  const close = () => ph.current?.close();

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ')) {
      e.preventDefault();
      openPop(e.currentTarget as HTMLElement, true);
      return;
    }
    if (!open) {
      // Backspace on the closed trigger pops the last token (chip-removal idiom).
      if (e.key === 'Backspace' && value.length > 0) onChange(value.slice(0, -1));
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => clampActive(i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => clampActive(i - 1));
    } else if (e.key === ' ' && navigable[active]) {
      // Space toggles the active row's checkbox (the option stays open).
      e.preventDefault();
      toggle(navigable[active]!);
    } else if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault(); // Enter confirms the set; Esc dismisses; both close.
      close();
    } else if (e.key === 'Backspace' && query === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const activeId = navigable[active] ? `${id}-opt-${navigable[active]!.value}` : undefined;

  // Track the running navigable index so the keyboard cursor lines up on screen.
  let navIndex = -1;
  const rows = filtered.map((o, i) => {
    const isNav = !o.disabled && !(atLimit && !selectedSet.has(o.value));
    if (isNav) navIndex += 1;
    const thisNav = navIndex;
    const isSel = selectedSet.has(o.value);
    // A CONTIGUOUS RUN of selected rows shares one wash: square the corners where a
    // selected row touches a selected NEIGHBOR in the rendered (filtered) list, round
    // only the run's outer corners. Only meaningful when this row is itself selected.
    const run = isSel
      ? listboxRun(
          i > 0 && selectedSet.has(filtered[i - 1]!.value),
          i < filtered.length - 1 && selectedSet.has(filtered[i + 1]!.value),
        )
      : 'single';
    return (
      <li key={o.value} role="presentation" style={{ listStyle: 'none' }}>
        <OptionRow
          option={o} id={`${id}-opt-${o.value}`} query={query} selected={isSel}
          active={isNav && thisNav === active} run={run} blockedByLimit={!!atLimit}
          onActivate={() => isNav && setActive(thisNav)} onToggle={() => toggle(o)}
        />
      </li>
    );
  });

  // The trigger's value area: placeholder (empty) · count summary · token chips + overflow.
  const shownTokens = display === 'tokens' ? value.slice(0, maxTokens) : [];
  const overflow = display === 'tokens' ? value.length - shownTokens.length : 0;
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  return (
    <div className="nk-ms">
      <label className="nk-ms__label" id={`${id}-lbl`}>{label}</label>
      <button
        ref={triggerRef} type="button" disabled={disabled} onKeyDown={onKeyDown}
        onClick={(e) => (open ? close() : openPop(e.currentTarget, false))}
        className={['nk-ms__trigger', open ? 'is-open' : '', disabled ? 'is-disabled' : ''].filter(Boolean).join(' ')}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-labelledby={`${id}-lbl`}
      >
        <span className="nk-ms__values">
          {noneSelected ? (
            <span className="nk-ms__placeholder">{placeholder}</span>
          ) : display === 'count' ? (
            <span className="nk-ms__summary"><b>{value.length}</b> selected</span>
          ) : (
            <>
              {shownTokens.map((v) => (
                <NockerlChip key={v} token text={labelOf(v)} disabled={disabled} onRemove={() => onChange(value.filter((x) => x !== v))} />
              ))}
              {overflow > 0 && <span className="nk-ms__more">+{overflow} more</span>}
            </>
          )}
        </span>
        <span className="nk-ms__trail">
          {!noneSelected && !disabled && (
            <span
              className="nk-ms__clear" role="button" tabIndex={0} aria-label="Clear all" onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); clearAll(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); clearAll(); } }}
            >
              {IconClose}
            </span>
          )}
          <span className="nk-ms__chev" aria-hidden="true">{IconChevron}</span>
        </span>
      </button>
      {/* The dropdown is the NockerlPopover primitive (bare = edge-to-edge, no arrow, no baked
          role=dialog, so this listbox owns its ARIA). It supplies the surface + anchor→flip→clamp +
          scrim + Esc + focus-restore; autoFocus={false} keeps the external-focus combobox model. */}
      {!disabled && (
        <NockerlPopover
          bare
          arrow={false}
          autoFocus={false}
          boundaryRef={boundaryRef}
          handleRef={ph}
          getWidth={() => panelW}
          onOpenChange={(oid) => { setOpenId(oid); if (oid == null) setQuery(''); }}
          renderContent={() => (
            <div className="nk-ms__shell">
              {/* HEADER, the management surface: live count + Select-all / Clear-all */}
              <div className="nk-ms__header">
                <span className="nk-ms__count" aria-live="polite"><b>{value.length}</b> selected{max != null && <em> / {max}</em>}</span>
                <span className="nk-ms__actions">
                  <NockerlButton text="Select all" variant="ghost" size="sm" className="nk-ms__action" disabled={allSelected || atLimit} onMouseDown={(e) => e.preventDefault()} onClick={selectAll} />
                  <span className="nk-ms__action-sep" aria-hidden="true" />
                  <NockerlButton text="Clear all" variant="ghost" size="sm" className="nk-ms__action" disabled={noneSelected} onMouseDown={(e) => e.preventDefault()} onClick={clearAll} />
                </span>
              </div>
              {/* optional inline FILTER (secondary), the composed SearchField primitive. The wrapper
                  carries onKeyDown: SearchField does not stopPropagation, so ↑↓ / Space / Enter / Esc /
                  Backspace bubble from the search input to the listbox handler here. */}
              {filterable && (
                <div className="nk-ms__filter" ref={filterWrapRef} onKeyDown={onKeyDown}>
                  <SearchField
                    label={`Filter ${label}`}
                    value={query}
                    onChange={(v) => { setQuery(v); setActive(0); }}
                    placeholder="Filter options…"
                    size="sm"
                  />
                </div>
              )}
              <ul className="nk-ms__list" id={listId} role="listbox" aria-multiselectable="true" aria-labelledby={`${id}-lbl`} aria-activedescendant={activeId}>
                {filtered.length === 0 ? (
                  <li role="presentation"><div className="nk-ms__empty">No matches for <b>{query}</b></div></li>
                ) : (
                  rows
                )}
              </ul>
            </div>
          )}
        />
      )}
      <p className={['nk-ms__help', atLimit ? 'is-limit' : ''].filter(Boolean).join(' ')}>
        {atLimit ? <>{IconWarn} Limit reached: {max} max. Remove one to add another.</> : helperText}
      </p>
    </div>
  );
}
// ─── Demo data: real Nockerl surfaces (labels, scopes, projects) ──────────────
const LABELS: MultiSelectOption[] = [
  { value: 'bug', label: 'bug', secondary: 'Defect to fix', status: 'error' },
  { value: 'feature', label: 'feature', secondary: 'New capability', status: 'info' },
  { value: 'design', label: 'design', secondary: 'Design framework', status: 'success' },
  { value: 'infra', label: 'infra', secondary: 'Infrastructure', status: 'warning' },
  { value: 'docs', label: 'docs', secondary: 'Documentation' },
  { value: 'a11y', label: 'a11y', secondary: 'Accessibility' },
  { value: 'wontfix', label: 'wontfix', secondary: 'Locked by maintainer', status: 'idle', disabled: true },
];
const SCOPES: MultiSelectOption[] = [
  { value: 'repos', label: 'Repositories', secondary: 'Read + write code' },
  { value: 'issues', label: 'Issues', secondary: 'Create + comment' },
  { value: 'pulls', label: 'Pull requests', secondary: 'Open + merge' },
  { value: 'actions', label: 'Actions', secondary: 'Re-run + cancel runs' },
  { value: 'packages', label: 'Packages', secondary: 'Publish releases' },
];
const PROJECTS: MultiSelectOption[] = [
  { value: 'nockerl-design', label: 'nockerl-design', secondary: 'Design framework', status: 'info' },
  { value: 'api-server', label: 'api-server', secondary: 'Gateway · execution', status: 'success' },
  { value: 'nockerl-dashboard', label: 'nockerl-dashboard', secondary: 'Control plane', status: 'success' },
  { value: 'credential-store', label: 'credential-store', secondary: 'Credential store', status: 'warning' },
  { value: 'nockerl-voice', label: 'nockerl-voice', secondary: 'macOS dictation', status: 'idle' },
];
/**
 * The interactive showcase: a token-display label picker (chips + "+N more" overflow
 * + inline filter, mode-toggled to a "N selected" summary), a count-summary scope
 * picker with Select-all / Clear-all, a capped project picker that locks unchecked
 * rows at its limit, and a disabled field. Fully keyboard-operable.
 */
// LEAF - the selection-management picker OWNS the trigger <button> it renders (it IS the multi-select control) + composes NockerlButton (Select-all / Clear-all header actions, ghost · sm), NockerlChip (tokens), NockerlListboxOption (rows), NockerlPopover (the anchored bare dropdown: surface + flip/clamp + scrim + Esc + focus-restore), NockerlSegmentedControl, SearchField (the optional in-dropdown filter: its inner searchbox, not a hand-rolled input).
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default function MultiSelectDemo() {
  // The shared boundary/stage every picker's NockerlPopover clamps its dropdown into (this whole
  // 480px column has ample vertical room, so a dropdown opens below its trigger and only flips up
  // near the bottom edge, never clipped, exactly like the old absolute panel that overflowed here).
  const stageRef = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState<string[]>(['bug', 'feature', 'design', 'infra']);
  const [scopes, setScopes] = useState<string[]>(['repos', 'issues']);
  const [projects, setProjects] = useState<string[]>(['nockerl-design', 'api-server']);
  const [display, setDisplay] = useState<MultiSelectDisplay>('tokens');
  const [edits, setEdits] = useState(0);

  const track = (setter: (v: string[]) => void) => (next: string[]) => {
    setter(next);
    setEdits((c) => c + 1);
  };

  return (
    <div className="nk-ms-demo" ref={stageRef}>
      <style>{STYLES}</style>

      <div className="nk-ms-demo__group">
        <p className="nk-ms-demo__lbl">Token display: chips + "+N more" overflow, optional inline filter</p>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <NockerlSegmentedControl
            label="Field display mode" size="sm"
            segments={[{ value: 'tokens', label: 'Chips' }, { value: 'count', label: 'Count' }]}
            value={display} onChange={(next) => setDisplay(next as MultiSelectDisplay)}
          />
        </div>
        <MultiSelect
          label="Labels" options={LABELS} value={labels} onChange={track(setLabels)} boundaryRef={stageRef}
          display={display} maxTokens={3} filterable placeholder="Add labels…"
          helperText="Open · Space toggles a row · Backspace removes the last · Enter confirms."
        />
      </div>
      <div className="nk-ms-demo__group">
        <p className="nk-ms-demo__lbl">Count summary: Select all / Clear all in the header</p>
        <MultiSelect
          label="Permission scopes" options={SCOPES} value={scopes} onChange={track(setScopes)} boundaryRef={stageRef}
          display="count" placeholder="Grant scopes…"
          helperText="The header states the running total and offers bulk actions."
        />
      </div>
      <div className="nk-ms-demo__group">
        <p className="nk-ms-demo__lbl">Max-selection limit: unchecked rows lock at the cap</p>
        <MultiSelect
          label="Pin projects (max 3)" options={PROJECTS} value={projects} onChange={track(setProjects)} boundaryRef={stageRef}
          display="tokens" maxTokens={3} max={3} placeholder="Pick up to 3…"
          helperText="Select all fills up to the cap; the rest disable until you remove one."
        />
      </div>
      <div className="nk-ms-demo__group">
        <p className="nk-ms-demo__lbl">Disabled: inert, still legible</p>
        <MultiSelect
          label="Locked field" options={SCOPES} value={['repos', 'issues']} onChange={() => {}} boundaryRef={stageRef}
          display="tokens" disabled helperText="Inert, but the chosen values stay readable."
        />
      </div>

      <p className="nk-ms-demo__count">
        Edited the selection <b>{edits}</b> {edits === 1 ? 'time' : 'times'}. The island is live.
      </p>
    </div>
  );
}
