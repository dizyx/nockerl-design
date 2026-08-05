/**
 * NockerlSelect, the Tier-3 SINGLE-VALUE picker composite. ONE home for the plainest
 * picker: pick ONE value from a fixed list. The trigger is a recessed WELL *button*
 * showing the chosen value (or a placeholder) + a chevron; pressing it drops a LIFTED
 * popover listbox; clicking an option selects it, closes the popover, and stamps a CHECK
 * on the chosen row. No text entry, no multi, no actions. It is deliberately distinct from
 * its neighbours:
 *   • combobox     = a text-field WELL you TYPE to filter (autocomplete).
 *   • multi-select = token chips + per-row CHECKBOXES + Select-all (manage a SET).
 *   • menu         = action items (icons + hints + submenus), not a value picker.
 * NockerlSelect shows the selected value in the trigger and a check on one option. That is
 * the whole job. (No filter: that's the combobox.)
 *
 * It COMPOSES the real controls: NockerlWell (the recessed field trigger, which supplies fill /
 * border / radius / inner sink shadow + top catch-light / hover / cyan focus OUTLINE ring /
 * error red border + ring / disabled), NockerlListboxOption (each flat option ROW, an
 * a11y-correct role=option), NockerlSurface (variant="panel" for the lifted popover card's bg /
 * hairline / panel radius / sheen), and NockerlIcon (the chevron + the warning glyph). This
 * component supplies only the trigger chrome, the popover position + open motion + chevron
 * flip, the group headers, and the keyboard model.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - the trigger SINKS / the popover LIFTS (one light source); depth = neutral drop shadow
 *     + top catch-light ONLY (no glow / colored shadow).
 *   - a SELECTED option = a cyan EDGE + cyan ink + a trailing check, never a fill, while the
 *     ACTIVE keyboard row = neutral wash + cyan ring (selection != activation).
 *   - error = a warm border + icon + message (color + icon + text, never color alone).
 *   - fills are STATIC: only brightness / transform / opacity animate; the popover open +
 *     chevron flip freeze under prefers-reduced-motion.
 *   - leading status dots use STATUS tokens only, because cyan is reserved for the selected
 *     check (selection != status on color).
 *
 * A11y: role=combobox trigger (aria-haspopup=listbox, aria-expanded, -controls,
 * -activedescendant, aria-invalid on error); role=listbox popover; role=option rows
 * (aria-selected / aria-disabled). Keyboard: Enter/Space/Down open; Up/Down move the active
 * option; Home/End jump; typeahead by first letter; Enter selects; Esc closes + restores
 * focus to the trigger; focus-visible ring throughout.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a var(--token);
 * literals remain only for pure geometry.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { NockerlIcon } from '../primitives/Icon.js';
import { NockerlSurface } from '../primitives/Surface.js';
import { NockerlWell } from '../primitives/Well.js';
import { NockerlListboxOption } from '../behaviors/ListboxOption.js';
import type { ComposeContract } from '../compose-contract.js';

export type NockerlSelectStatus = 'success' | 'warning' | 'error' | 'info' | 'idle';
export type NockerlSelectSize = 'sm' | 'md';

export interface NockerlSelectOption {
  value: string; // stable identity + the value carried into the trigger
  label: string; // primary line: the option's accessible name (label.large)
  secondary?: string; // supporting line under the label (body.small)
  status?: NockerlSelectStatus; // leading status mark: status colors only, never cyan
  group?: string; // bucket; options sharing a group render under one header
  disabled?: boolean; // inert + still legible (never invisible)
}

// Leading status dots use STATUS tokens only. Cyan is reserved for the selected
// check (selection != status on color).
const STATUS_COLOR: Record<NockerlSelectStatus, string> = {
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)',
  error: 'var(--color-status-error)',
  info: 'var(--color-status-info)',
  idle: 'var(--color-divider)',
};

// The trigger WELL sinks; the popover CARD lifts. Fills are static: only brightness /
// transform / opacity animate. All values are tokens; the dark stage resolves cyan to #0cc0df.
// Exported so consumers that compose NockerlSelect (e.g. Wizard / Form-layout) can inject the
// trigger + popover chrome the same way. The recessed-well recipe lives in NockerlWell; the
// lifted-panel recipe lives in NockerlSurface; the option-row recipe lives in NockerlListboxOption.
// This block keeps ONLY the chrome those primitives do not set.
export const NOCKERL_SELECT_STYLES = `
.nk-sel { display: flex; flex-direction: column; gap: var(--space-1); position: relative; }
/* Vertical-stack rhythm between consecutive selects. :where() keeps it at ZERO specificity
   so a horizontal-row / grid container neutralizes it with a plain class (space via gap).
   Otherwise it leaks into a row and the first select rides higher. */
:where(.nk-sel + .nk-sel) { margin-top: var(--space-5); }
.nk-sel__label { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-card); line-height: var(--font-line-height-20); }
/* The TRIGGER: a recessed WELL (fields sink). It is a BUTTON, not an input (you pick,
   you don't type). The recessed-well recipe (fill / border / radius / inner sink shadow +
   top catch-light / hover / cyan focus OUTLINE ring / error red border + ring / disabled)
   lives in the NockerlWell primitive; the trigger passes is-focus (open OR focused) /
   is-error / is-disabled through NockerlWell's className and keeps its .nk-sel__trigger class
   so the descendant selectors below still match. This block keeps ONLY the button chrome
   NockerlWell does not set: width / text-align / cursor / color / font. */
.nk-well.nk-sel__trigger { width: 100%; text-align: left; cursor: pointer; color: var(--color-on-card); font: inherit; }
.nk-well.nk-sel__trigger--md { min-height: var(--size-min-touch); padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3); }
.nk-well.nk-sel__trigger--sm { min-height: 34px; padding: var(--space-1) var(--space-1) var(--space-1) var(--space-2); }
/* disabled: NockerlWell draws the flat recessed treatment; the trigger only tints its own
   descendants and swaps the cursor. Two-class specificity so it beats NockerlWell's hover. */
.nk-well.nk-sel__trigger.is-disabled { cursor: not-allowed; }
.nk-well.nk-sel__trigger.is-disabled .nk-sel__value, .nk-well.nk-sel__trigger.is-disabled .nk-sel__placeholder { color: var(--color-on-card-muted); }
/* the leading status dot inside the trigger (mirrors the chosen option's mark) */
.nk-sel__lead { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; }
.nk-sel__dot { width: 9px; height: 9px; border-radius: var(--radius-pill); }
/* the value area: the chosen label on one line, or the placeholder */
.nk-sel__value { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--color-on-card);
  font-size: var(--font-size-14); line-height: var(--font-line-height-20); }
.nk-sel__trigger--sm .nk-sel__value, .nk-sel__trigger--sm .nk-sel__placeholder { font-size: var(--font-size-12); }
.nk-sel__placeholder { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: color-mix(in srgb, var(--color-on-card-muted) 78%, transparent); font-size: var(--font-size-14); line-height: var(--font-line-height-20); }
/* the trailing chevron flips when open (transform, an interpolatable prop). Mirrors Android ArrowDropDown / Swift chevron. */
.nk-sel__chev { flex: 0 0 auto; color: var(--color-on-card-muted); display: inline-flex; padding-right: var(--space-1); transition: transform .16s var(--motion-easing-standard); }
.nk-sel__trigger.is-open .nk-sel__chev { transform: rotate(180deg); }
/* An OPEN trigger is a SELECTION state ("a choice is in progress"), not a focus state,
   so its EDGE takes the thin selection weight, matching the Swift/Compose twins and the
   NavItem reference. Three-class specificity beats NockerlWell's shared .is-focus border-color
   WITHOUT touching it, so every other field keeps its focus edge exactly as-is. The a11y focus
   RING (NockerlWell's box-shadow) is deliberately untouched: focus stays fully visible, and
   only the border (the part that says "chosen") softens. */
.nk-well.nk-sel__trigger.is-open { border-width: var(--border-width-selection); border-color: color-mix(in srgb, var(--color-accent-primary) 45%, transparent); }
.nk-sel__chev svg { display: block; width: 18px; height: 18px; }
.nk-sel__trigger--sm .nk-sel__chev svg { width: 16px; height: 16px; }
/* The LIFTED popover CARD: depth lives here (neutral drop shadow + top catch-light, never a glow).
   bg / hairline / panel-radius / sheen come from <NockerlSurface variant="panel">; this rule adds only position + motion + the drift shadow. */
.nk-sel__pop { position: absolute; left: 0; right: 0; top: calc(100% + var(--space-1)); z-index: 20; overflow: hidden; transform-origin: top center; animation: nk-sel-pop .14s var(--motion-easing-standard);
  box-shadow: 0 var(--space-2) var(--elevation-level3) -8px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level3) * 100%), transparent), var(--nk-surface-sheen); }
@keyframes nk-sel-pop { from { opacity: 0; transform: translateY(-4px) scale(.985); } to { opacity: 1; transform: none; } }
.nk-sel__list { list-style: none; margin: 0; padding: var(--space-1); max-height: 248px; overflow-y: auto; }
/* group header: a quiet caption above its bucket of options (aligns over the option text column) */
.nk-sel__group { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); padding: var(--space-2) var(--space-2) var(--space-1); }
.nk-sel__group:not(:first-child) { border-top: var(--space-px) solid var(--color-card-hairline); margin-top: var(--space-1); }
/* the option ROW is the NockerlListboxOption primitive (the .nk-opt* recipe, self-injected). */
/* helper / error line under the well. Error turns warm and leads with an icon (color + icon + text). */
.nk-sel__help { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); min-height: var(--font-line-height-16); display: inline-flex; align-items: center; gap: var(--space-1); }
.nk-sel__help.is-error { color: var(--color-status-error); }
.nk-sel__help svg { display: block; width: 14px; height: 14px; flex: 0 0 auto; }
@media (prefers-reduced-motion: reduce) {
  .nk-sel__chev { transition: none; }
  .nk-sel__pop { animation: none; }
}
`;

// ─── Inline glyphs (stroke icons in currentColor, so each slot tints correctly) ──
const IconChevron = <NockerlIcon path="m6 9 6 6 6-6" />;
const IconWarn = <NockerlIcon><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></NockerlIcon>;

interface OptionRowProps {
  option: NockerlSelectOption; id: string; selected: boolean; active: boolean;
  onActivate: () => void; onCommit: () => void;
}

/** One flat option ROW, the shared NockerlListboxOption primitive (a11y: a non-focusable
 *  role=option row; the parent listbox keeps focus + drives aria-activedescendant). */
function OptionRow({ option: o, id, selected, active, onActivate, onCommit }: OptionRowProps) {
  return (
    <NockerlListboxOption
      id={id}
      primary={o.label}
      selected={selected}
      active={active}
      disabled={o.disabled ?? false}
      onActivate={onActivate}
      onSelect={onCommit}
      {...(o.secondary !== undefined ? { secondary: o.secondary } : {})}
      {...(o.status !== undefined ? { status: o.status } : {})}
    />
  );
}

export interface NockerlSelectProps {
  /** Persistent label above the trigger, never a placeholder. */
  label: string;
  /** The fixed set to pick one from. */
  options: NockerlSelectOption[];
  /** The chosen value, or null for the empty/placeholder state. */
  value: string | null;
  /** Commit a single selection (the option value), then close the popover. */
  onChange: (value: string) => void;
  /** Shown when nothing is selected (label still persists above). */
  placeholder?: string;
  /** Quiet supporting line under the well. */
  helperText?: string;
  /** When set, the field reads invalid (warm border + icon + this message). */
  errorText?: string;
  /** Control height + type: 'md' (44px) | 'sm' (34px). */
  size?: NockerlSelectSize;
  /** Bucket options under their `group` header. */
  grouped?: boolean;
  /** Inert + still legible (never invisible). */
  disabled?: boolean;
}

/**
 * A single Nockerl select is the plainest picker (one value from a fixed list, no typing).
 * The trigger is a recessed NockerlWell button; the popover is a lifted NockerlSurface listbox
 * of NockerlListboxOption rows; the chosen option carries a cyan check. Click or keyboard
 * (Enter/Down open, Up/Down/Home/End + type a letter to move, Enter selects, Esc closes).
 *
 * No forwardRef (API convention): NockerlSelect is a stateful controller with no single stable
 * root element a forwarded ref would point at (the trigger owns its own ref internally).
 */
export function NockerlSelect({
  label, options, value, onChange, placeholder = 'Select…', helperText,
  errorText, size = 'md', grouped = false, disabled = false,
}: NockerlSelectProps) {
  const id = useId();
  const listId = `${id}-list`;
  const errId = `${id}-err`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef<{ buf: string; at: number }>({ buf: '', at: 0 });
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false); // tracked focus → NockerlWell's is-focus ring (mirrors NockerlTextField)
  const [active, setActive] = useState(0); // index into `navigable` (the keyboard cursor)

  // The keyboard cursor walks only the selectable (non-disabled) rows.
  const navigable = useMemo(() => options.filter((o) => !o.disabled), [options]);
  const selectedOption = value != null ? options.find((o) => o.value === value) : undefined;
  const invalid = !!errorText;
  const clampActive = (i: number) => (navigable.length === 0 ? 0 : (i + navigable.length) % navigable.length);

  const openPop = () => {
    if (disabled) return;
    // Open with the cursor parked on the current selection (or the first row).
    const i = navigable.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : 0);
    setOpen(true);
  };
  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };
  const commit = (option: NockerlSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    close();
  };

  // Typeahead: jump to the next option whose label starts with the typed run
  // (the standard listbox affordance; this is select's only "typing", not a filter).
  const onType = (key: string) => {
    const now = Date.now();
    const t = typeahead.current;
    t.buf = now - t.at > 600 ? key : t.buf + key;
    t.at = now;
    const q = t.buf.toLowerCase();
    const from = t.buf.length === 1 ? active + 1 : active; // repeat-key cycles
    for (let n = 0; n < navigable.length; n += 1) {
      const idx = (from + n) % navigable.length;
      if (navigable[idx]!.label.toLowerCase().startsWith(q)) { setActive(idx); break; }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); openPop(); }
      return;
    }
    if (k === 'ArrowDown') { e.preventDefault(); setActive((i) => clampActive(i + 1)); }
    else if (k === 'ArrowUp') { e.preventDefault(); setActive((i) => clampActive(i - 1)); }
    else if (k === 'Home') { e.preventDefault(); setActive(0); }
    else if (k === 'End') { e.preventDefault(); setActive(navigable.length - 1); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (navigable[active]) commit(navigable[active]!); }
    else if (k === 'Escape') { e.preventDefault(); close(); }
    else if (k === 'Tab') { close(false); } // Tab commits nothing, just dismisses
    else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); onType(k); }
  };

  // Keep the active row scrolled into view as the cursor moves.
  useEffect(() => {
    if (!open || !navigable[active]) return;
    listRef.current?.querySelector<HTMLDivElement>(`#${CSS.escape(`${id}-opt-${navigable[active]!.value}`)}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, open, navigable, id]);

  const activeId = open && navigable[active] ? `${id}-opt-${navigable[active]!.value}` : undefined;

  // Build the rendered list (with optional group headers), tracking the running
  // navigable index so the keyboard cursor lines up with what is on screen.
  let navIndex = -1;
  let lastGroup: string | undefined;
  const rows = options.map((o) => {
    if (!o.disabled) navIndex += 1;
    const thisNav = navIndex;
    const header = grouped && o.group && o.group !== lastGroup ? ((lastGroup = o.group), o.group) : null;
    return (
      <li key={o.value} role="presentation" style={{ listStyle: 'none' }}>
        {header && <div className="nk-sel__group" role="presentation">{header}</div>}
        <OptionRow
          option={o}
          id={`${id}-opt-${o.value}`}
          selected={o.value === value}
          active={!o.disabled && thisNav === active}
          onActivate={() => !o.disabled && setActive(thisNav)}
          onCommit={() => commit(o)}
        />
      </li>
    );
  });

  return (
    <div className="nk-sel">
      <label className="nk-sel__label" id={`${id}-lbl`}>{label}</label>
      <NockerlWell
        as="button"
        layout="field"
        ref={triggerRef}
        type="button"
        disabled={disabled}
        // is-open keeps the chevron flip; is-focus (open OR tracked focus) draws NockerlWell's cyan ring.
        className={['nk-sel__trigger', `nk-sel__trigger--${size}`, open ? 'is-open' : '', (open || focused) && !disabled ? 'is-focus' : '', disabled ? 'is-disabled' : '', invalid ? 'is-error' : ''].filter(Boolean).join(' ')}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeId}
        aria-labelledby={`${id}-lbl`}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errId : undefined}
        onClick={() => (open ? close() : openPop())}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); if (open) setOpen(false); }}
      >
        {selectedOption?.status && (
          <span className="nk-sel__lead" aria-hidden="true">
            <span className="nk-sel__dot" style={{ background: STATUS_COLOR[selectedOption.status] }} />
          </span>
        )}
        {selectedOption ? (
          <span className="nk-sel__value">{selectedOption.label}</span>
        ) : (
          <span className="nk-sel__placeholder">{placeholder}</span>
        )}
        <span className="nk-sel__chev" aria-hidden="true">{IconChevron}</span>
      </NockerlWell>

      {open && !disabled && (
        <NockerlSurface variant="panel" className="nk-sel__pop">
          <ul ref={listRef} className="nk-sel__list" id={listId} role="listbox" aria-labelledby={`${id}-lbl`}>
            {rows}
          </ul>
        </NockerlSurface>
      )}

      {(errorText || helperText) && (
        <p className={['nk-sel__help', invalid ? 'is-error' : ''].filter(Boolean).join(' ')} id={invalid ? errId : undefined}>
          {invalid && IconWarn}
          {errorText ?? helperText}
        </p>
      )}
      {/* Recipe CSS injected as the LAST child; identical injected blocks dedupe in effect. */}
      <style>{NOCKERL_SELECT_STYLES}</style>
    </div>
  );
}

// LEAF: the single-value picker. It owns NO raw facsimiles: the trigger is composed via <NockerlWell as="button"> (not a hand-rolled <button>), the option rows via NockerlListboxOption, the popover via NockerlSurface. `options` is a data array rendered internally, not a slot.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlSelect;
