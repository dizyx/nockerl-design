/**
 * NockerlButton - the Tier-1 button primitive. ONE home for the cyan fill-ladder, the
 * flash-free feedback, and the button RULE - so a future button-rule change is ONE
 * edit, not ~21. Composes ONLY tokens.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - fill-ladder: primary (filled gradient) -> secondary (soft) -> tertiary (outline)
 *     -> ghost (text) -> destructive (outline red, fill reserved for the final confirm).
 *   - 12px control radius (never a pill); the fill is STATIC - hover/active animate
 *     brightness + transform + a NEUTRAL shadow only (no fill tween, no glow).
 *   - focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   - label is UPPERCASE, light (300), tracked -0.03em - buttons are the ONLY uppercase
 *     in the Nockerl type system (design-laws section 11).
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ComposeContract } from '../compose-contract';

export type NockerlButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive';
export type NockerlButtonSize = 'sm' | 'md' | 'lg';

/**
 * NockerlButton extends the native button attributes (minus the ones it owns) so it is fully
 * TRIGGER-COMPOSABLE: an overlay/menu/tooltip trigger passes onClick (WITH the event, to
 * anchor to e.currentTarget), onKeyDown / onFocus / onBlur / onPointer*, tabIndex, id,
 * title, style, and aria-haspopup / aria-expanded / aria-controls / aria-describedby
 * straight through to the <button>, no bespoke trigger element needed. The ref forwards
 * to the underlying <button> so positioners can measure/focus it. `disabled`/`loading`
 * still gate onClick. `onClick` now receives the MouseEvent (back-compatible with the
 * old `() => void` callers).
 */
export interface NockerlButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'type'> {
  /** Visible label. */
  text: string;
  /** Emphasis ladder. */
  variant?: NockerlButtonVariant;
  /** Control height + padding. */
  size?: NockerlButtonSize;
  /** Shows a spinner, holds the button width, blocks re-click. */
  loading?: boolean;
  /** Optional leading glyph (icon slot). */
  leadingIcon?: ReactNode;
  /** Optional trailing glyph (icon slot AFTER the label), e.g. a chevron / arrow. */
  trailingIcon?: ReactNode;
  /** Label shown WHILE loading (e.g. "Saving…"); falls back to `text`. */
  loadingText?: string;
  /** Native button type: `submit`/`reset` for real forms (default `button`). */
  type?: 'button' | 'submit' | 'reset';
  /** Stretch to the container width (e.g. a full-width CTA / sheet action). */
  fullWidth?: boolean;
  /** Accessible name override (when the label alone is ambiguous). */
  ariaLabel?: string;
  /**
   * TOGGLE mode: when set, the button HOLDS state: it renders `aria-pressed` and, when
   * true, the pressed VISUAL is the selection outline (a selection-weight cyan border plus
   * cyan ink, and no fill, design-laws section 6), NOT a separate control. Omit it for a
   * plain command button.
   */
  pressed?: boolean;
}

/** The .nk-btn recipe - the canonical ladder + the uppercase/-0.03em rule, in one place. */
export const NOCKERL_BUTTON_STYLES = `
.nk-btn {
  font-family: var(--font-family-sans);
  font-weight: var(--font-weight-light);
  text-transform: uppercase;
  letter-spacing: var(--font-tracking-tight);
  line-height: 1;
  box-sizing: border-box;
  cursor: pointer;
  border: var(--space-px) solid transparent;
  border-radius: var(--radius-control);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  color: var(--color-on-card);
  transition: transform .12s var(--motion-easing-standard), background-color .12s, box-shadow .12s, border-color .12s, filter .12s;
}
/* leading-icon + spinner slot: a fixed 1em box so a glyph can never exceed the
   text line-box and inflate the button height (centers the icon row) */
.nk-btn__icon { display: inline-flex; align-items: center; justify-content: center;
  width: 1em; height: 1em; line-height: 1; flex: 0 0 auto; font-size: inherit; }
.nk-btn:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
.nk-btn:disabled { cursor: not-allowed; }
/* sizes */
.nk-btn--sm { font-size: var(--font-size-12); padding: var(--space-1) var(--space-3); height: var(--space-8); }
.nk-btn--md { font-size: var(--font-size-14); padding: var(--space-2) var(--space-4); height: var(--space-10); }
.nk-btn--lg { font-size: var(--font-size-14); padding: var(--space-3) var(--space-5); height: var(--space-12); }
.nk-btn--full { width: 100%; }
/* primary - filled cyan, lit from above (sheen = catch-light, NOT a glow) */
.nk-btn--primary { background: linear-gradient(180deg,var(--color-accent-primary-hi),var(--color-accent-primary)); color: var(--color-on-accent);
  box-shadow: 0 var(--elevation-level2) 14px -6px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-btn--primary:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px);
  box-shadow: 0 8px 18px -7px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-btn--primary:active:not(:disabled) { filter: brightness(.9); transform: translateY(0) scale(.985);
  box-shadow: 0 var(--elevation-level1) var(--elevation-level3) -3px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent), inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 25%, transparent); }
.nk-btn--primary:disabled { background: var(--color-card-surface1); color: var(--color-on-card-muted); box-shadow: none; }
/* secondary - cyan-soft + thin cyan border (semantic accent adapts per theme) */
.nk-btn--secondary { background: var(--color-accent-primary-soft); color: var(--color-accent-primary); border-color: color-mix(in srgb, var(--color-accent-primary) 28%, transparent); }
.nk-btn--secondary:hover:not(:disabled) { background: color-mix(in srgb, var(--color-accent-primary) 24%, transparent); transform: translateY(-1px); }
.nk-btn--secondary:active:not(:disabled) { transform: scale(.985); background: color-mix(in srgb, var(--color-accent-primary) 12%, transparent); }
.nk-btn--secondary:disabled { background: color-mix(in srgb, var(--color-on-card) 4%, transparent); color: var(--color-on-card-muted); border-color: var(--color-card-hairline); }
/* tertiary - outlined cyan (semantic accent adapts per theme) */
.nk-btn--tertiary { background: transparent; color: var(--color-accent-primary); border-color: var(--color-accent-primary); }
.nk-btn--tertiary:hover:not(:disabled) { background: var(--color-accent-primary-soft); transform: translateY(-1px); }
.nk-btn--tertiary:active:not(:disabled) { transform: scale(.985); background: color-mix(in srgb, var(--color-accent-primary) 10%, transparent); }
.nk-btn--tertiary:disabled { color: var(--color-on-card-muted); border-color: var(--color-card-hairline); }
/* ghost - text only */
.nk-btn--ghost { background: transparent; color: var(--color-on-card); }
.nk-btn--ghost:hover:not(:disabled) { background: color-mix(in srgb, var(--color-on-card) 6%, transparent); }
.nk-btn--ghost:active:not(:disabled) { transform: scale(.985); background: color-mix(in srgb, var(--color-on-card) 3%, transparent); }
.nk-btn--ghost:disabled { color: var(--color-on-card-muted); }
/* destructive - outline red (fill reserved for the final confirm only) */
.nk-btn--destructive { background: transparent; color: var(--color-status-error); border-color: color-mix(in srgb, var(--color-status-error) 50%, transparent); }
.nk-btn--destructive:hover:not(:disabled) { background: color-mix(in srgb, var(--color-status-error) 12%, transparent); transform: translateY(-1px); }
.nk-btn--destructive:active:not(:disabled) { transform: scale(.985); background: color-mix(in srgb, var(--color-status-error) 6%, transparent); }
.nk-btn--destructive:disabled { color: var(--color-on-card-muted); border-color: var(--color-card-hairline); }
/* pressed (toggle ON) reads by OUTLINE, not fill (design-laws section 6, reduce-fills):
   the selection-weight cyan border plus cyan ink, with no wash. Toggle ON is a STATE, so it
   converts, and the border already existed, so the box is unchanged. Sits after the variant
   rules so it still wins the treatment for whatever variant hosts the toggle. Hover keeps the
   lift only, rather than deepening a tint that is no longer there. */
.nk-btn.is-pressed { background: none; color: var(--color-accent-primary); border-color: color-mix(in srgb, var(--color-accent-primary) 45%, transparent); }
.nk-btn.is-pressed:hover:not(:disabled) { filter: none; transform: translateY(-1px); }
.nk-btn.is-pressed:active:not(:disabled) { transform: scale(.985); }
/* two-face width RESERVATION: the resting composition ([icon] text [icon]) and the
   loading composition (spinner + loadingText) BOTH render, stacked in one grid cell; the
   hidden face keeps its layout (visibility, not display), so the button's width is
   max(resting, loading) in EVERY state - toggling loading can never shift geometry. */
.nk-btn__stack { display: inline-grid; }
.nk-btn__stack > .nk-btn__face { grid-area: 1 / 1; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); min-width: 0; }
.nk-btn__face--ghost { visibility: hidden; }
.nk-btn__face--ghost .nk-btn__spin { animation: none; }
/* loading spinner - interpolatable (rotation). Box comes from .nk-btn__icon (1em) so it
   cannot inflate height; this rule owns only the ring. */
.nk-btn__spin { border-radius: var(--radius-pill); border: var(--space-0-5) solid currentColor;
  border-top-color: transparent; animation: nk-sp .7s linear infinite; }
@keyframes nk-sp { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .nk-btn { transition: none; }
  .nk-btn__spin { animation-duration: 1.4s; }
}
`;

/** A single Nockerl button - the unit the spec documents. Forwards a ref to the
 * underlying <button> so consumers can focus/measure it. */
export const NockerlButton = forwardRef<HTMLButtonElement, NockerlButtonProps>(function NockerlButton({
  text,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leadingIcon,
  trailingIcon,
  loadingText,
  type = 'button',
  fullWidth = false,
  ariaLabel,
  pressed,
  className,
  ...rest
}, ref) {
  const inert = disabled || loading;
  //  width reservation is STICKY: once a button has entered loading it keeps reserving,
  // so rest -> loading -> rest never shifts. loadingText is the explicit opt-in that reserves
  // from mount (full stability); loading-without-loadingText reserves from the first load
  // (one entry shift, then stable), pass loadingText for zero-shift buttons.
  const everLoaded = useRef(false);
  if (loading) everLoaded.current = true;
  const reserve = loadingText !== undefined || loading || everLoaded.current;
  const cls = ['nk-btn', `nk-btn--${variant}`, `nk-btn--${size}`, fullWidth ? 'nk-btn--full' : '', pressed ? 'is-pressed' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={cls}
      disabled={inert}
      aria-busy={loading || undefined}
      aria-pressed={pressed}
      aria-label={ariaLabel}
      onClick={inert ? undefined : onClick}
    >
      {/* : a LOADING-CAPABLE button (loadingText passed, loading now, or has ever
          loaded) renders BOTH faces stacked in one grid cell, the hidden one reserves its
          width, so the button is max(resting, loading) wide in every state and toggling
          loading can never shift geometry. A plain button keeps the original single-face
          markup (and its exact resting pixels). */}
      {reserve ? (
        <span className="nk-btn__stack">
          <span className={`nk-btn__face${loading ? ' nk-btn__face--ghost' : ''}`} aria-hidden={loading || undefined}>
            {leadingIcon && <span className="nk-btn__icon" aria-hidden="true">{leadingIcon}</span>}
            <span>{text}</span>
            {trailingIcon && <span className="nk-btn__icon" aria-hidden="true">{trailingIcon}</span>}
          </span>
          <span className={`nk-btn__face${loading ? '' : ' nk-btn__face--ghost'}`} aria-hidden={!loading || undefined}>
            <span className="nk-btn__icon nk-btn__spin" aria-hidden="true" />
            <span>{loadingText ?? text}</span>
          </span>
        </span>
      ) : (
        <>
          {leadingIcon && <span className="nk-btn__icon" aria-hidden="true">{leadingIcon}</span>}
          <span>{text}</span>
          {trailingIcon && <span className="nk-btn__icon" aria-hidden="true">{trailingIcon}</span>}
        </>
      )}
      <style>{NOCKERL_BUTTON_STYLES}</style>
    </button>
  );
});

/** LEAF: the button primitive; owns its raw <button>. leadingIcon/trailingIcon are
 *  glyph ornamentation (pass an <NockerlIcon>), not composition slots. */
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default NockerlButton;
