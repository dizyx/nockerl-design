/**
 * NockerlListItem is the Tier-1 list-row primitive. ONE home for the flat-row grammar, the
 * leading status/selection slot, the trailing value/nav/expand affordance, the
 * flash-free hover/press feedback, the focus ring, and the accordion reveal, so a
 * future list-row change is ONE edit, not many. Composes ONLY tokens.
 *
 * Mirrors the canonical Compose `NockerlListItemRow` + `NockerlLeadingStatusMark`
 * (core/ui/NockerlListItem.kt): a row is leading slot -> primary + secondary text
 * -> trailing slot, laid out ON a containing card. The depth lives in the CARD;
 * the rows themselves are FLAT.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - rows are FLAT: no per-row shadow. Depth comes from the card the list sits
 *     on (lit-from-above: neutral shadow + top catch-light, never a glow).
 *   - flash-free feedback: the row fill is STATIC; hover/press animate a neutral
 *     wash + a subtle scale only, never a fill swap.
 *   - a SELECTED row reads via a cyan EDGE bounding the run, cyan ink, and a LEADING cyan check (in the
 *     leading slot, so it never fights the trailing chevron), NOT a glow, NOT a left
 *     rail, and NOT a brand fill swap.
 *   - an EXPANDABLE row is an accordion: the trailing chevron points DOWN at rest and
 *     ROTATES to UP when expanded (never the right-pointing nav chevron), revealing a
 *     sibling body region below via an interpolated height (grid-rows) + opacity.
 *   - leading STATUS marks use status colors (success / warning / error / info),
 *     never the brand cyan. Cyan is reserved for selection.
 *   - the whole row is ONE tap target with ONE accessible name; a trailing
 *     control (e.g. a toggle) is a SEPARATE focusable target.
 *   - focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef, useId } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { NockerlIcon } from '../primitives/Icon';
import type { ComposeContract } from '../compose-contract';

export type NockerlListItemStatus = 'success' | 'warning' | 'error' | 'info' | 'idle';

export interface NockerlListItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'value' | 'onSelect' | 'onToggle'> {
  /** Primary text. Carries the row's accessible name (label.large role). */
  primary: string;
  /** Optional supporting line under the primary text (body.small role). */
  secondary?: string;
  /** Optional leading status mark: renders the canonical B20 status ICON (shape + color
   *  dual-coding, never a bare dot) in the status color. Status colors only, never cyan. */
  status?: NockerlListItemStatus;
  /** Optional leading ICON (any node) for action rows (share / rename / delete). Shown
   *  in the leading slot when the row is neither selected nor carrying a status mark. */
  leadingIcon?: React.ReactNode;
  /** Destructive treatment. The primary text + leading icon go status-error (a delete row). */
  danger?: boolean;
  /** Optional trailing value text (e.g. a count, a timestamp). */
  value?: string;
  /** Optional trailing NODE (a NockerlBadge / NockerlChip / status pill) shown before the chevron. For
   *  rich rows: an accordion header's tone pill, a tool-card's state chip. Compose a real
   *  component (NockerlBadge / NockerlStatusDisc / NockerlChip), never a hand-rolled facsimile. */
  trailing?: React.ReactNode;
  /** Show a trailing NAV chevron (right-pointing, for genuinely navigational rows). */
  chevron?: boolean;
  /** Make the row an accordion: trailing chevron points DOWN at rest, rotates UP when
   *  expanded; the row gets aria-expanded + aria-controls and reveals a body region
   *  below it. Mutually exclusive with the nav chevron. */
  expandable?: boolean;
  /** Expanded state for an expandable row; drives the chevron rotation + body reveal. */
  expanded?: boolean;
  /** Toggle handler for an expandable row (whole-row tap). Ignored while disabled. */
  onToggle?: () => void;
  /** The body of an expandable row, revealed when the row expands. */
  details?: React.ReactNode;
  /** Selected state: a cyan edge bounding the run, cyan ink, and a LEADING check. NOT a glow, not a left-rail. */
  selected?: boolean;
  /** Inert + clearly-seen (never invisible) state. */
  disabled?: boolean;
  /** Activate handler (whole-row tap). Ignored while disabled. */
  onSelect?: () => void;
}

// The leading status mark uses STATUS tokens only; cyan is reserved for selection.
const STATUS_COLOR: Record<NockerlListItemStatus, string> = {
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)',
  error: 'var(--color-status-error)',
  info: 'var(--color-status-info)',
  idle: 'var(--color-dot-idle)',
};

// The leading status mark is an ICON: shape + color dual-coding (adjudication B20 / design law 6),
// NEVER a bare colored dot. Distinct silhouettes so the state reads without relying on hue alone:
// ring+check (success), alert triangle (warning), ring+x (error), ring+i (info), a hollow ring (idle).
// Canonicalized HERE so every consumer that passes `status` gets B20 by default. The wrapper path
// (`leadingIcon`) stays available for action-row glyphs.
const STATUS_ICON: Record<NockerlListItemStatus, React.ReactNode> = {
  success: <NockerlIcon><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.4 2.4 4.6-5" /></NockerlIcon>,
  warning: <NockerlIcon><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17h.01" /></NockerlIcon>,
  error: <NockerlIcon><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></NockerlIcon>,
  info: <NockerlIcon><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></NockerlIcon>,
  idle: <NockerlIcon><circle cx="12" cy="12" r="8" /></NockerlIcon>,
};

// Rows are FLAT; the card carries the depth. Feedback animates a neutral wash +
// a subtle scale only. The fill never swaps. All values are tokens.
export const NOCKERL_LIST_ITEM_STYLES = `
/* The ROW is flat, with no shadow. It is one button = one tap target = one name. */
.nk-li {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  min-height: calc(var(--space-12) + var(--space-2));   /* 56, clears the 48dp law */
  background: transparent;     /* FLAT: no per-row fill or shadow */
  border: 0;
  border-radius: var(--radius-none);
  text-align: left;
  color: var(--color-on-card);
  cursor: pointer;
  font-family: inherit;
  transition: filter .12s, background-color .12s, transform .12s var(--motion-easing-standard);
}
.nk-li + .nk-li { border-top: var(--space-px) solid var(--color-card-hairline); }  /* hairline, not a shadow */
.nk-li:hover:not(.nk-li--disabled) { background: var(--color-surface-highlight); }
.nk-li:active:not(.nk-li--disabled) { background: color-mix(in srgb, var(--color-surface-highlight) 50%, transparent); transform: scale(.992); }
.nk-li:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: -2px; }
/* SELECTED (LAW 6, reduce-fills): cyan INK plus the leading check the row already carries,
   and a cyan EDGE bounding the run. No wash, so selection never reads as a fill. Hover keeps
   the same neutral highlight every other row uses: unlike the nav row, a list row does not own
   its own edge (the hairline belongs to the row below it), so there is no edge here to
   brighten, and inventing one would be a second selection channel. */
/* The primary line sets its own colour, so the accent has to be applied to it directly
   rather than inherited from the row, exactly as the danger row does below. */
.nk-li--selected { color: var(--color-accent-primary); }
.nk-li--selected .nk-li__primary { color: var(--color-accent-primary); }
/* NESTED-RADIUS CAP (r4 clip class): rows are square, so a selected FIRST/LAST row's edge gets
   sliced by a rounded clipping container. Containers opt in via --nk-nest-cap (= container
   radius - inset); default keeps rows square exactly as before. */
.nk-li:nth-child(1 of .nk-li) { border-start-start-radius: var(--nk-nest-cap, var(--radius-none)); border-start-end-radius: var(--nk-nest-cap, var(--radius-none)); }
.nk-li:nth-last-child(1 of .nk-li) { border-end-start-radius: var(--nk-nest-cap, var(--radius-none)); border-end-end-radius: var(--nk-nest-cap, var(--radius-none)); }
/* No left rail (LAW 6): selection reads from the cyan edge, the cyan ink and the leading
   check, never a vertical stripe.
   CONTIGUOUS RUN. Rows are square and full bleed, and the hairline between two rows belongs
   to the LOWER one, so the run's boundary is drawn by promoting exactly two of those shared
   hairlines to cyan: the one where the run opens, and the one where it closes. Interior seams
   go transparent, so three adjacent selected rows read as ONE outlined block rather than three
   stacked edges, which is the same idea a single selected row shows. A run that starts at the
   first row or ends at the last simply takes the container edge as its boundary. */
.nk-li:not(.nk-li--selected) + .nk-li--selected { border-top-color: color-mix(in srgb, var(--color-accent-primary) calc(var(--border-opacity-selection) * 100%), transparent); }
.nk-li--selected + .nk-li:not(.nk-li--selected) { border-top-color: color-mix(in srgb, var(--color-accent-primary) calc(var(--border-opacity-selection) * 100%), transparent); }
.nk-li--selected + .nk-li--selected { border-top-color: transparent; }
.nk-li--disabled { cursor: not-allowed; opacity: .55; }   /* inert but still legible */
/* the leading slot holds the status mark OR the selection check (selection lives here,
   so it never fights the trailing nav/expand chevron for one slot). */
.nk-li__lead { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: var(--space-5); }
.nk-li__avatar {
  width: 28px; height: 28px; border-radius: var(--radius-pill);
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-card-surface3); color: var(--color-on-card);
  font-size: var(--font-size-12); font-weight: var(--font-weight-semibold);
}
.nk-li__lead--avatar { width: 28px; }
/* leading ICON (action rows), sized like the row's other glyphs; tints via currentColor. */
.nk-li__ico { display: inline-flex; }
.nk-li__ico svg { display: block; width: 18px; height: 18px; }
/* On a DESTRUCTIVE row the primary text + leading icon go status-error (a delete action). */
.nk-li--danger .nk-li__primary { color: var(--color-status-error); }
.nk-li--danger .nk-li__lead { color: var(--color-status-error); }
/* text block */
.nk-li__text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-li__primary { font-size: var(--font-size-14); font-weight: var(--font-weight-medium); line-height: var(--font-line-height-20); color: var(--color-on-card);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nk-li__secondary { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* trailing slot */
.nk-li__trail { flex: 0 0 auto; display: inline-flex; align-items: center; gap: var(--space-2); color: var(--color-on-card-muted); }
.nk-li__value { font-size: var(--font-size-12); color: var(--color-on-card-muted); }
/* The SELECTION check now lives in the LEADING slot (cyan mark), never the trailing chevron slot. */
.nk-li__check { color: var(--color-accent-primary); display: inline-flex; }
/* NAV chevron: static, right-pointing; for genuinely navigational rows only. */
.nk-li__chev { color: var(--color-on-card-muted); display: inline-flex; }
.nk-li__chev svg, .nk-li__check svg { display: block; width: 18px; height: 18px; }
/* The EXPAND chevron points DOWN at rest and ROTATES to UP when expanded (the canonical
   tree disclosure pattern, made interpolatable). Reused 1:1 from TreeDemo nk-tree__chev. */
.nk-li__chev--expand { transition: transform .2s var(--motion-easing-standard), color .12s; }
.nk-li__chev--open { transform: rotate(180deg); color: var(--color-on-card); }
/* ── Accordion item: the row + its revealed body are ONE unit; hairlines sit
      between units (not between a row and its own body). ── */
.nk-li-acc { display: block; }
.nk-li-acc + .nk-li-acc, .nk-li-acc + .nk-li, .nk-li + .nk-li-acc {
  border-top: var(--space-px) solid var(--color-card-hairline);
}
/* The body REGION below the row. The reveal animates INTERPOLATED props only: a
   grid row track (0fr collapsed -> 1fr expanded) + opacity, never a display swap,
   never a fill swap. Matches the canonical nk-acc__panel reveal. */
.nk-li__body {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows .24s var(--motion-easing-standard), opacity .18s;
  background: color-mix(in srgb, var(--color-on-card) 3%, transparent);
}
.nk-li__body--open { grid-template-rows: 1fr; opacity: 1; }
/* In the inner clip, overflow hides the body until the track opens; min-height:0 lets
   the 0fr track actually collapse the grid child. */
.nk-li__body-inner { overflow: hidden; min-height: 0; }
.nk-li__body-content {
  padding: var(--space-3) var(--space-4) var(--space-4);
  font-size: var(--font-size-14); line-height: var(--font-line-height-20);
  color: var(--color-on-card-muted);
}
@media (prefers-reduced-motion: reduce) {
  .nk-li, .nk-li__chev--expand, .nk-li__body { transition: none; }
}
`;

/**
 * A single Nockerl list item, the unit the spec documents. The WHOLE row is one
 * button (one accessible name); a leading status mark (status color, never cyan) OR
 * a leading selection check (cyan); primary + optional secondary text; an optional
 * trailing value + a trailing chevron. The trailing chevron is EITHER a static
 * right-pointing NAV chevron (`chevron`) OR a down/up rotating EXPAND affordance
 * (`expandable`). Selection now lives in the LEADING slot so it never fights the
 * trailing chevron for one place. A selected row reads via a cyan edge, cyan ink and the
 * leading check, never a glow, never a left-rail.
 */
export const NockerlListItem = forwardRef<HTMLButtonElement, NockerlListItemProps>(function NockerlListItem({
  primary,
  secondary,
  status,
  leadingIcon,
  danger = false,
  value,
  trailing,
  chevron = false,
  expandable = false,
  expanded = false,
  onToggle,
  details,
  selected = false,
  disabled = false,
  onSelect,
  className,
  ...rest
}, ref) {
  const reactId = useId();
  const bodyId = `nk-li-body-${reactId}`;
  const primaryId = `nk-li-primary-${reactId}`;

  // The button row itself is identical for both variants; only the click target and
  // the trailing affordance differ. An expandable row toggles; a selectable/nav row
  // selects. A selected row shows the LEADING check; the status dot yields to it.
  const row = (
    <button
      {...rest}
      ref={ref}
      type="button"
      className={[
        'nk-li',
        selected ? 'nk-li--selected' : '',
        disabled ? 'nk-li--disabled' : '',
        danger ? 'nk-li--danger' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      aria-pressed={expandable ? undefined : selected}
      aria-expanded={expandable ? expanded : undefined}
      aria-controls={expandable ? bodyId : undefined}
      onClick={disabled ? undefined : expandable ? onToggle : onSelect}
    >
      <span className="nk-li__lead" aria-hidden="true">
        {selected ? (
          <span className="nk-li__check"><NockerlIcon name="check" /></span>
        ) : status ? (
          <span className="nk-li__ico" style={{ color: STATUS_COLOR[status] }}>{STATUS_ICON[status]}</span>
        ) : leadingIcon ? (
          <span className="nk-li__ico">{leadingIcon}</span>
        ) : null}
      </span>
      <span className="nk-li__text">
        <span className="nk-li__primary" id={expandable ? primaryId : undefined}>{primary}</span>
        {secondary && <span className="nk-li__secondary">{secondary}</span>}
      </span>
      <span className="nk-li__trail">
        {value && <span className="nk-li__value">{value}</span>}
        {trailing}
        {expandable ? (
          <span className={`nk-li__chev nk-li__chev--expand${expanded ? ' nk-li__chev--open' : ''}`}>
            <NockerlIcon name="chevronDown" />
          </span>
        ) : (
          chevron && <span className="nk-li__chev"><NockerlIcon name="chevronRight" /></span>
        )}
      </span>
      <style>{NOCKERL_LIST_ITEM_STYLES}</style>
    </button>
  );

  if (!expandable) return row;

  // Accordion: the row + a sibling body REGION below it, wrapped as ONE unit so
  // hairlines fall between units (not between a row and its own body). The reveal is
  // an interpolated grid-row track (0fr -> 1fr); the region is `hidden` when collapsed
  // so collapsed content stays out of the a11y tree + tab order.
  return (
    <div className="nk-li-acc">
      {row}
      <div
        id={bodyId}
        role="region"
        aria-labelledby={primaryId}
        hidden={!expanded}
        className={`nk-li__body${expanded ? ' nk-li__body--open' : ''}`}
      >
        <div className="nk-li__body-inner">
          <div className="nk-li__body-content">{details}</div>
        </div>
      </div>
    </div>
  );
});

/** CONTAINER: the list-row primitive. Owns its raw <button> row; composes NockerlIcon for
 *  the check/chevron. `details` holds the accordion body (any content). leadingIcon is
 *  glyph ornamentation, not a modeled slot. */
export const compose = {
  slots: { details: { accepts: '*' }, trailing: { accepts: '*' } },
  owns: ['button'],
} satisfies ComposeContract;

export default NockerlListItem;
