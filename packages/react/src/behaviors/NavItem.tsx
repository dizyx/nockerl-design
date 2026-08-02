/**
 * NockerlNavItem: the Tier-2 NAVIGATION-DESTINATION primitive. ONE home for the nav-row
 * grammar the shells were each hand-rolling (AppShell destinations + rail + bottom-nav,
 * Sidebar rows + sub-rows): a leading icon that STAYS lit on the active row, a label, an
 * optional trailing count, an optional disclosure chevron, the chrome-context wash/press
 * feedback, the focus ring, and the three layouts (row / rail / stack). Composes ONLY
 * tokens + the NockerlIcon primitive.
 *
 * It is the NAV sibling of NockerlListItem, deliberately DISTINCT (the "NockerlTabs decision"): a nav
 * destination is a single-select, roving, `aria-current` control ON CHROME whose icon
 * stays cyan-tinted when active; a NockerlListItem is a card-context row whose selection swaps
 * the leading slot for a check. Do not conflate them.
 *
 * Design laws encoded here (do not re-derive in a shell):
 *   - SELECTION (active) = a soft cyan WASH + a thin cyan border + a cyan icon/label +
 *     `aria-current="page"`. The icon STAYS (never a check swap), and there is NEVER a
 *     left-rail / stripe (design-laws section 6). Mirrors Voice's accent fill/border.
 *   - depth is flat: nav rows carry no shadow; the chrome panel they sit on carries it.
 *   - chrome context: text/hover read from --color-on-chrome*, not the card tokens.
 *   - status marks (the icon-corner dot) use STATUS colors, never the brand cyan.
 *   - feedback animates a neutral wash + a subtle scale + the chevron rotation only. The
 *     fill never tweens; everything freezes under prefers-reduced-motion.
 *   - the whole row is ONE tap target with ONE accessible name; focus is an OUTLINE ring.
 *
 * Roving is a CONTAINER concern: the shell owns the ref list + arrow-key handler and
 * passes `tabIndex` / `onKeyDown` / `ref` (all forwarded to the underlying <button>), so
 * NockerlNavItem stays a pure, composable destination. Injects the recipe CSS as the LAST child.
 */
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { NockerlIcon } from '../primitives/Icon';
import type { ComposeContract } from '../compose-contract';

export type NockerlNavItemLayout = 'row' | 'rail' | 'stack';
export type NockerlNavItemStatus = 'streaming' | 'attention' | 'idle';
export interface NavItemCount {
  /** The number shown in the trailing pill. */
  value: number;
  /** neutral = mono chip (a plain count); attention = warm (needs-attention). */
  tone?: 'neutral' | 'attention';
}

const DOT_COLOR: Record<NockerlNavItemStatus, string> = {
  streaming: 'var(--color-dot-streaming)',
  attention: 'var(--color-dot-attention)',
  idle: 'var(--color-dot-idle)',
};

export interface NockerlNavItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'type' | 'title'> {
  /** Visible label, the row's accessible name (also the rail tooltip). */
  label: string;
  /** Leading glyph (an <NockerlIcon>). STAYS visible + tints cyan when active. */
  icon?: ReactNode;
  /** row (sidebar, default) · rail (icon-only + tooltip) · stack (icon-over-label, bottom-nav). */
  layout?: NockerlNavItemLayout;
  /** Active destination: soft cyan wash + cyan tint + aria-current="page" (icon stays; no check, no rail). */
  active?: boolean;
  /** aria-current override, independent of the active VISUAL (e.g. a parent row that
   *  shows the wash because a child is selected, but is not itself the current page).
   *  Defaults to `active`. */
  current?: boolean;
  /** Tint-only active (no wash / no border), for a bar that carries its OWN selection
   *  indicator (a bottom-nav's sliding pill). The active row still tints cyan + aria-current. */
  flat?: boolean;
  /** Status dot riding the icon corner (status colors only, never cyan). */
  status?: NockerlNavItemStatus;
  /** Trailing count pill (row/stack); in the rail it collapses to a corner attention dot. */
  count?: NavItemCount;
  /** Show the label. false hides it VISUALLY but keeps it as the accessible name, for a
   *  bottom-nav in "labels: selected-only" mode (unselected tabs are icon-only). */
  showLabel?: boolean;
  /** Nested sub-row: denser, no icon, indented under a parent (the shell draws the guide rail). */
  sub?: boolean;
  /** Disclosure row: the trailing chevron rotates 90° when expanded (aria-expanded). */
  expandable?: boolean;
  /** Expanded state for an expandable row. */
  expanded?: boolean;
  /** Toggle handler for an expandable row (whole-row tap). */
  onToggle?: () => void;
  /** Activate handler (whole-row tap) for a non-expandable row. */
  onSelect?: () => void;
  /** Accessible-name override (when the label alone is ambiguous). */
  ariaLabel?: string;
}

/** The .nk-nav recipe: the chrome nav-row ladder + the section-6 active treatment, in one place. */
export const NOCKERL_NAV_ITEM_STYLES = `
.nk-nav {
  position: relative; display: flex; align-items: center; gap: var(--space-3); width: 100%;
  min-height: var(--space-10); padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
  background: transparent; border: var(--border-width-selection) solid transparent; border-radius: var(--radius-control);
  text-align: left; color: var(--color-on-chrome-muted); cursor: pointer; font-family: inherit;
  font-size: var(--font-size-14); font-weight: var(--font-weight-medium);
  transition: background-color .12s, color .12s, transform .12s var(--motion-easing-standard), border-color .12s;
}
.nk-nav:hover:not(.nk-nav--on):not(:disabled) { background: color-mix(in srgb, var(--color-on-chrome) 6%, transparent); color: var(--color-on-chrome); }
.nk-nav:active:not(:disabled) { transform: scale(.985); }
.nk-nav:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: -2px; }
.nk-nav:disabled { cursor: not-allowed; opacity: .55; }
/* ACTIVE (section 6): soft cyan WASH + thin cyan border + cyan icon/label. The icon
   STAYS (no check swap); there is NO left-rail / stripe. */
.nk-nav--on { background: var(--color-accent-primary-soft); color: var(--color-accent-primary);
  border-color: color-mix(in srgb, var(--color-accent-primary) 45%, transparent); font-weight: var(--font-weight-semibold); }
.nk-nav--on:hover { background: color-mix(in srgb, var(--color-accent-primary) 22%, transparent); }
.nk-nav--on .nk-nav__ico, .nk-nav--on .nk-nav__chev { color: var(--color-accent-primary); }
/* FLAT active is tint only (the bar carries its own selection indicator, e.g. a sliding pill). */
.nk-nav--flat.nk-nav--on { background: transparent; border-color: transparent; }
.nk-nav--flat.nk-nav--on:hover { background: color-mix(in srgb, var(--color-on-chrome) 6%, transparent); }

/* leading icon slot (width 20, matching the canonical nav frame) */
.nk-nav__ico { position: relative; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 20px; }
.nk-nav__ico svg { width: 20px; height: 20px; display: block; }
/* status dot riding the icon corner (status colors only, never cyan) */
.nk-nav__dot { position: absolute; top: -1px; right: -2px; width: 7px; height: 7px; border-radius: var(--radius-pill);
  box-shadow: 0 0 0 var(--space-0-5) var(--color-chrome-surface); }

.nk-nav__label { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nk-nav--nolabel .nk-nav__label { display: none; }

/* trailing count pill: neutral (mono) or attention (warm). */
.nk-nav__count { flex: 0 0 auto; min-width: var(--space-5); height: var(--space-5); padding: 0 var(--space-2);
  display: inline-flex; align-items: center; justify-content: center; font-size: var(--font-size-10);
  font-weight: var(--font-weight-bold); border-radius: var(--radius-pill); color: var(--color-on-chrome-muted);
  background: color-mix(in srgb, var(--color-on-chrome) 12%, transparent); }
.nk-nav__count--attention { color: var(--color-dot-attention); background: color-mix(in srgb, var(--color-dot-attention) 18%, transparent); }

/* disclosure chevron rotates 90° when expanded (a transform, not a swap) */
.nk-nav__chev { flex: 0 0 auto; display: inline-flex; color: var(--color-on-chrome-muted); transition: transform .2s var(--motion-easing-standard), color .12s; }
.nk-nav__chev svg { width: 16px; height: 16px; display: block; }
.nk-nav--open .nk-nav__chev { transform: rotate(90deg); }

/* ── RAIL: icon-only, centered; label + count hide, count leaves a corner dot ── */
.nk-nav--rail { justify-content: center; padding: var(--space-2); gap: 0; }
.nk-nav--rail .nk-nav__label, .nk-nav--rail .nk-nav__count, .nk-nav--rail .nk-nav__chev { display: none; }
.nk-nav__raildot { display: none; position: absolute; top: var(--space-1); right: var(--space-1); width: 7px; height: 7px;
  border-radius: var(--radius-pill); background: var(--color-dot-attention); box-shadow: 0 0 0 var(--space-0-5) var(--color-chrome-surface); }
.nk-nav--rail .nk-nav__raildot { display: block; }

/* ── STACK: icon over label, centered (the bottom-nav tab) ── */
.nk-nav--stack { flex-direction: column; align-items: center; justify-content: center; gap: var(--space-0-5);
  min-height: var(--space-12); padding: var(--space-1) var(--space-2); }
.nk-nav--stack .nk-nav__label { flex: 0 0 auto; max-width: 100%; font-size: var(--font-size-10); line-height: var(--font-line-height-14); text-align: center; }
.nk-nav--stack .nk-nav__count { position: absolute; top: var(--space-1); right: calc(50% - var(--space-4)); }

/* ── SUB: a denser, icon-less nested row (the shell indents + draws the guide) ── */
.nk-nav--sub { min-height: var(--space-8); font-size: var(--font-size-12); padding-block: var(--space-1); }

@media (prefers-reduced-motion: reduce) {
  .nk-nav, .nk-nav__chev { transition: none; }
}
`;

/**
 * A single Nockerl navigation destination, the unit a shell composes. The WHOLE row is
 * one <button> (one accessible name) with `aria-current="page"` when active; a leading
 * icon (stays lit + cyan when active), the label, an optional trailing count, and an
 * optional disclosure chevron. `layout` switches row / rail / stack. Forwards its ref +
 * spreads the rest (tabIndex / onKeyDown / id / data-*) so the shell can rove focus.
 */
export const NockerlNavItem = forwardRef<HTMLButtonElement, NockerlNavItemProps>(function NockerlNavItem({
  label,
  icon,
  layout = 'row',
  active = false,
  current,
  flat = false,
  showLabel = true,
  status,
  count,
  sub = false,
  expandable = false,
  expanded = false,
  onToggle,
  onSelect,
  ariaLabel,
  disabled = false,
  className,
  ...rest
}, ref) {
  const rail = layout === 'rail';
  const cls = [
    'nk-nav',
    layout === 'rail' ? 'nk-nav--rail' : layout === 'stack' ? 'nk-nav--stack' : '',
    active ? 'nk-nav--on' : '',
    flat ? 'nk-nav--flat' : '',
    !showLabel && layout !== 'rail' ? 'nk-nav--nolabel' : '',
    sub ? 'nk-nav--sub' : '',
    expandable && expanded ? 'nk-nav--open' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      className={cls}
      disabled={disabled}
      aria-current={(current ?? active) ? 'page' : undefined}
      aria-expanded={expandable ? expanded : undefined}
      aria-label={rail || !showLabel ? (ariaLabel ?? label) : ariaLabel}
      title={rail ? label : undefined}
      onClick={disabled ? undefined : expandable ? onToggle : onSelect}
    >
      {icon && !sub && (
        <span className="nk-nav__ico">
          {icon}
          {status && <span className="nk-nav__dot" style={{ background: DOT_COLOR[status] }} aria-hidden="true" />}
          {count && rail && <span className="nk-nav__raildot" aria-hidden="true" />}
        </span>
      )}
      <span className="nk-nav__label">{label}</span>
      {count && !expandable && (
        <span className={`nk-nav__count${count.tone === 'attention' ? ' nk-nav__count--attention' : ''}`} aria-hidden="true">
          {count.value}
        </span>
      )}
      {expandable && (
        <span className="nk-nav__chev" aria-hidden="true"><NockerlIcon name="chevronRight" strokeWidth={1.8} /></span>
      )}
      <style>{NOCKERL_NAV_ITEM_STYLES}</style>
    </button>
  );
});

/** LEAF (nav-destination) owns its own <button> row; composes NockerlIcon for the glyph +
 *  chevron. Its icon is a glyph (ornamentation), not a modeled slot. */
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default NockerlNavItem;
