/**
 * NockerlListboxOption: the Tier-2 LISTBOX OPTION row primitive. ONE home for a
 * `role="option"` row inside a `role="listbox"`: the leading mark (status dot, an icon,
 * or a multi-select checkbox), the primary (+ optional secondary) text, and the trailing
 * affordance (a single-select check or an arbitrary slot like shortcut keys), plus the
 * ACTIVE (keyboard-highlight) and SELECTED states. Composes NockerlIcon + tokens.
 *
 * Why a dedicated primitive (NOT NockerlListItem): a listbox option is NOT a button. The listbox
 * (or its combobox input) holds focus and points `aria-activedescendant` at the active
 * option; the options themselves are non-focusable `<div role="option">` rows. NockerlListItem is
 * a focusable `<button>`. Putting buttons inside a `role="listbox"` breaks the single-
 * tab-stop + active-descendant keyboard model. This primitive renders the correct,
 * non-focusable option row so Select / Combobox / CommandPalette / MultiSelect can compose
 * it instead of each hand-rolling a near-identical `.nk-*__opt` row.
 *
 * The CONSUMER owns the listbox container, the roving aria-activedescendant, the arrow/
 * type-ahead keyboard, and the open/close + commit state; this primitive owns only the
 * option ROW (its markup, the active/selected/disabled visuals, and click/hover wiring).
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • SELECTION ≠ STATUS on color: the leading status dot uses STATUS tokens only; cyan is
 *     reserved for the selection (the trailing check / the multi checkbox fill / the active
 *     highlight ring). The selected row is a faint cyan WASH + a check, never a fill swap.
 *   • the ACTIVE (keyboard) row is a neutral highlight + a 1px cyan inset ring; it is
 *     distinct from the SELECTED wash, and a row can be both.
 *   • flat rows: no per-row shadow; feedback animates a wash + the checkbox tick draw
 *     only, frozen under prefers-reduced-motion.
 *
 * TOKEN-REACTIVE: every color / radius / spacing / type size is a var(--token). The only
 * literals are SVG/checkbox geometry (the 18px box, the tick path, the 9px dot) and the
 * transition curves, exactly what tokens do not cover.
 *
 * Injects the recipe CSS as the row's LAST child (a display:none <style>; no layout, and
 * no consumer relies on a first/last-child selector under an option). Blocks dedupe in effect.
 */
import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import type { ComposeContract } from '../compose-contract';
import { NockerlIcon } from '../primitives/Icon';
import { NockerlCheckbox } from '../primitives/Checkbox';

export type NockerlListboxOptionStatus = 'success' | 'warning' | 'error' | 'info' | 'idle';

/**
 * Where this row sits inside a CONTIGUOUS RUN of selected rows (multi-select).
 * The selection wash of a run must read as ONE block: square corners WHERE rows
 * touch, rounded only at the run's OUTER corners. `single` (the default) rounds
 * all four corners. A lone selection, or any single-select consumer, is unchanged.
 *   • `single`: not adjacent to another selected row → all corners rounded.
 *   • `top`:    first of a run → round TOP corners, square the BOTTOM (it meets the next).
 *   • `middle`: interior of a run → square ALL corners (meets both neighbors).
 *   • `bottom`: last of a run → round BOTTOM corners, square the TOP (it meets the prev).
 * The consumer computes this from prev/next-selected adjacency and passes it only on
 * selected rows; it is inert on unselected rows (the modifiers are gated on --selected).
 */
export type ListboxOptionRun = 'single' | 'top' | 'middle' | 'bottom';

/**
 * Resolve a selected row's {@link ListboxOptionRun} from its selected NEIGHBORS
 * (the immediately-adjacent RENDERED rows). Consumers walk their ordered visible
 * list and pass, for the row at hand, whether the previous and next rendered rows
 * are also selected. This returns where the row sits in the contiguous run so its
 * touching corners square off and the run's washes merge into one block. Callers
 * apply the result only to selected rows (it describes a run OF selected rows).
 */
export function listboxRun(prevSelected: boolean, nextSelected: boolean): ListboxOptionRun {
  if (prevSelected && nextSelected) return 'middle';
  if (nextSelected) return 'top';
  if (prevSelected) return 'bottom';
  return 'single';
}

// Leading status dots use STATUS tokens only, since cyan is reserved for the selection mark.
const STATUS_COLOR: Record<NockerlListboxOptionStatus, string> = {
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)',
  error: 'var(--color-status-error)',
  info: 'var(--color-status-info)',
  idle: 'var(--color-dot-idle)',
};

export interface NockerlListboxOptionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'id' | 'className'> {
  /** Stable id (the listbox points aria-activedescendant here). REQUIRED. */
  id: string;
  /** Primary line: the option's accessible name. May include <mark> for a typed-match highlight. */
  primary: ReactNode;
  /** Supporting line under the primary (a description / hint). */
  secondary?: ReactNode;
  /** Chosen state. Sets aria-selected + a faint cyan wash (single-select check / multi box fill). */
  selected?: boolean;
  /** Keyboard-highlighted state (the aria-activedescendant target). Neutral highlight + cyan ring. */
  active?: boolean;
  /** Inert + clearly-seen (never invisible). */
  disabled?: boolean;
  /** Leading STATUS dot (status colors only). Ignored when `leadingIcon` is set. */
  status?: NockerlListboxOptionStatus;
  /** Leading ICON (any node), e.g. a command-row glyph. Takes the lead slot over `status`. */
  leadingIcon?: ReactNode;
  /** Multi-select: render a leading CHECKBOX indicator (filled when selected) + suppress the trailing check. */
  multi?: boolean;
  /**
   * Position in a CONTIGUOUS RUN of selected rows. Squares the corners where a
   * selected row TOUCHES its selected neighbor so the run's washes merge into one
   * block (no white notches), rounding only the run's outer corners. Only meaningful
   * on a selected row; defaults to `single` (all corners rounded for the lone/non-run
   * case, and every single-select consumer). See {@link ListboxOptionRun}.
   */
  run?: ListboxOptionRun;
  /** Arbitrary trailing content (e.g. shortcut keys). Replaces the auto single-select check. */
  trailing?: ReactNode;
  /** aria-keyshortcuts for the row (e.g. a command shortcut). */
  ariaKeyshortcuts?: string;
  /** Pointer-enter: the consumer sets this row active (aria-activedescendant). */
  onActivate?: () => void;
  /** Click commits (single-select) or toggles (multi). Ignored while disabled. */
  onSelect?: () => void;
  /** Extra class names appended to the row. */
  className?: string;
}

export const NOCKERL_LISTBOX_OPTION_STYLES = `
/* the option ROW uses a flat list-item vocabulary: leading mark/icon/checkbox -> primary
   (+secondary) -> trailing check / slot. */
.nk-opt { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3);
  min-height: var(--space-10); border-radius: var(--radius-control); cursor: pointer; color: var(--color-on-card);
  transition: background-color .1s, box-shadow .1s; }
/* ACTIVE (keyboard) is a neutral highlight + a 1px cyan inset ring (distinct from selected).
   DELIBERATELY UNTOUCHED by : --active is the keyboard CURSOR, not a selection.
   The selection tokens govern "this one is chosen"; borrowing them here would assert the
   cursor IS a selection and collide with the §6/ cursor rule (cursor = ink, no box).
   Migrating this ring to ink-only is tracked follow-up, not bundled into this cut. */
.nk-opt--active { background: var(--color-surface-highlight); box-shadow: inset 0 0 0 var(--space-px) color-mix(in srgb, var(--color-accent-primary) 55%, transparent); }
/* SELECTED: a faint cyan WASH (never a fill swap). A row can be both selected + active. */
.nk-opt--selected { background: color-mix(in srgb, var(--color-accent-primary) 10%, transparent); }
.nk-opt--selected.nk-opt--active { background: color-mix(in srgb, var(--color-accent-primary) 16%, transparent); }
/* CONTIGUOUS RUN. Where a selected row TOUCHES a selected neighbor, square that edge so
   the washes merge into one block (no white notches); round only the run's OUTER corners.
   The row's radius clips both the wash AND the active ring, so a run reads as one shape.
   Gated on --selected: inert on unselected rows. --single keeps the default all-round. */
.nk-opt--selected.nk-opt--run-top { border-end-start-radius: 0; border-end-end-radius: 0; }
.nk-opt--selected.nk-opt--run-middle { border-radius: 0; }
.nk-opt--selected.nk-opt--run-bottom { border-start-start-radius: 0; border-start-end-radius: 0; }
/* NESTED-RADIUS CAP (r4 clip class): inside a ROUNDED clipping container the first/last row's
   OUTER corners must match the container curve (inner = outer - inset), or the selection wash /
   active ring gets SLICED by the container clip at the corners. Containers OPT IN by declaring
   --nk-nest-cap: calc(<container radius> - <inset to the row>); rows fall back to their own
   control radius, so nothing changes in non-clipping hosts. Corner-DISJOINT from the run
   modifiers above (these set only the container-touching OUTER corners; runs zero JOINING
   corners), so ordering never fights. Typed nth-child(1 of S): components inject <style>
   as a LAST sibling (the house style-last rule), so bare :last-child never matches a row. */
.nk-opt:nth-child(1 of .nk-opt) { border-start-start-radius: var(--nk-nest-cap, var(--radius-control)); border-start-end-radius: var(--nk-nest-cap, var(--radius-control)); }
.nk-opt:nth-last-child(1 of .nk-opt) { border-end-start-radius: var(--nk-nest-cap, var(--radius-control)); border-end-end-radius: var(--nk-nest-cap, var(--radius-control)); }
.nk-opt--disabled { opacity: .5; cursor: not-allowed; }
.nk-opt__lead { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: var(--space-4); }
.nk-opt__lead svg { display: block; width: 18px; height: 18px; }
.nk-opt__dot { width: 9px; height: 9px; border-radius: var(--radius-pill); }
.nk-opt__text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-opt__primary { font-size: var(--font-size-14); font-weight: var(--font-weight-medium); line-height: var(--font-line-height-20);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* a typed-match highlight inside the primary (combobox / command palette). */
.nk-opt__primary mark { background: color-mix(in srgb, var(--color-accent-primary) 26%, transparent); color: inherit; border-radius: var(--radius-track); padding: 0 var(--space-px); }
.nk-opt__secondary { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nk-opt__check { flex: 0 0 auto; width: var(--space-4); color: var(--color-accent-primary); display: inline-flex; align-items: center; justify-content: center; }
.nk-opt__check svg { display: block; width: 18px; height: 18px; }
.nk-opt__trail { flex: 0 0 auto; display: inline-flex; align-items: center; }
/* multi-select leading box is the REAL NockerlCheckbox (size sm). PRESENTATIONAL: pointer-
   transparent so the ROW owns the click; its box recipe (well -> cyan gradient -> drawn tick)
   lives in NOCKERL_CHECKBOX_STYLES, so future checkbox changes propagate here. */
.nk-opt__cb { flex: 0 0 auto; display: inline-flex; pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
  .nk-opt { transition: none; }
}
`;

/**
 * A single listbox option row, the unit the spec documents. A non-focusable
 * `role="option"` row with a leading mark, primary (+secondary) text, and a trailing
 * check or slot; the ACTIVE (keyboard) + SELECTED states are distinct. The consumer wires
 * the listbox keyboard + aria-activedescendant; this owns the row. CSS injects as the
 * row's last child (display:none <style>, zero layout).
 */
export const NockerlListboxOption = forwardRef<HTMLDivElement, NockerlListboxOptionProps>(function NockerlListboxOption({
  id,
  primary,
  secondary,
  selected = false,
  active = false,
  disabled = false,
  status,
  leadingIcon,
  multi = false,
  run = 'single',
  trailing,
  ariaKeyshortcuts,
  onActivate,
  onSelect,
  className,
  ...rest
}, ref) {
  const cls = [
    'nk-opt',
    active ? 'nk-opt--active' : '',
    selected ? 'nk-opt--selected' : '',
    disabled ? 'nk-opt--disabled' : '',
    multi ? 'nk-opt--multi' : '',
    // Run-position modifier (multi-select contiguous fills), only meaningful when
    // selected; `single` is the default all-corners-rounded shape, so emit nothing.
    run !== 'single' ? `nk-opt--run-${run}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      {...rest}
      ref={ref}
      id={id}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      aria-keyshortcuts={ariaKeyshortcuts}
      className={cls}
      onMouseEnter={disabled ? undefined : onActivate}
      onMouseDown={(e) => e.preventDefault() /* keep focus on the listbox/input */}
      onClick={disabled ? undefined : onSelect}
    >
      {multi && (
        // The leading multi-select box is now the REAL NockerlCheckbox (matches Table + the
        // Checkbox page; future checkbox changes propagate here). PRESENTATIONAL: the ROW owns
        // the toggle (onClick + aria-selected), so the checkbox is aria-hidden, not focusable,
        // and pointer-transparent (driven only by `checked`). The run-aware selection ROUNDING
        // (below, on the row) is untouched.
        <span className="nk-opt__cb" aria-hidden="true">
          <NockerlCheckbox checked={selected} size="sm" tabIndex={-1} />
        </span>
      )}
      {(leadingIcon != null || status) && (
        <span className="nk-opt__lead" aria-hidden="true">
          {leadingIcon != null ? leadingIcon : <span className="nk-opt__dot" style={{ background: STATUS_COLOR[status!] }} />}
        </span>
      )}
      <span className="nk-opt__text">
        <span className="nk-opt__primary">{primary}</span>
        {secondary != null && <span className="nk-opt__secondary">{secondary}</span>}
      </span>
      {trailing != null ? (
        <span className="nk-opt__trail">{trailing}</span>
      ) : (
        selected && !multi && (
          <span className="nk-opt__check" aria-hidden="true">
            <NockerlIcon name="check" />
          </span>
        )
      )}
      <style>{NOCKERL_LISTBOX_OPTION_STYLES}</style>
    </div>
  );
});

// A single non-focusable option ROW (a <div role="option">: role=option is NOT in the
// facsimile set; the multi-select box COMPOSES the real NockerlCheckbox, rendered
// presentationally since the row owns the toggle). `primary`/`secondary` are text,
// `leadingIcon` is glyph ornamentation, `trailing` carries minor content (e.g. shortcut
// keys). No structural child components in a fillable slot → tier leaf.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlListboxOption;
