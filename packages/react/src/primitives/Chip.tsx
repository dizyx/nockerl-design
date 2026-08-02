/**
 * NockerlChip - the Tier-1 chip primitive. ONE home for the reserved PILL silhouette, the
 * selected/unselected cyan grammar, the removable-input trailing x, and the flash-free
 * feedback - so a future chip-rule change is ONE edit, not many. Composes ONLY tokens.
 *
 * The chip is one of the two surfaces that deliberately keep the fully-rounded PILL
 * silhouette (the other is the input bar); every other control uses the 12px control
 * radius.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - pill (RoundedCornerShape ~50%) - chips are the one place the pill is allowed.
 *   - selected -> solid cyan (#0CC0DF) fill + contrast label; unselected -> soft cyan
 *     tint + cyan label (a cohesive chip strip).
 *   - removable (input) chip carries a trailing x with its own accessible name.
 *   - flash-free feedback: the fill is STATIC; hover/active animate brightness (filter)
 *     + transform only - never a fill/gradient tween.
 *   - focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   - NO glow / colored shadow / emission anywhere.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract';

export interface NockerlChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Visible label. Bound to the label type role. */
  text: string;
  /** Whether this chip is the active selection (filter idiom). */
  selected?: boolean;
  /** Toggle/tap handler. Ignored while disabled. */
  onClick?: () => void;
  /** Inert + clearly-seen (never invisible) state. */
  disabled?: boolean;
  /** Optional leading glyph (e.g. a status dot) before the label. */
  leadingIcon?: string;
  /**
   * A per-item COLOR swatch dot before the label (e.g. a chart series color). Unlike
   * `leadingIcon='dot'` (which inherits the chip's currentColor), this paints an
   * arbitrary fixed color, so a row of chips can each carry a distinct key color.
   */
  swatch?: string;
  /** When set, renders a trailing x; invoked when it is pressed (input idiom). */
  onRemove?: () => void;
  /**
   * TOKEN mode: render the chip as a NON-interactive <span> container (NOT a <button>),
   * so a removable token can sit INSIDE another interactive element (e.g. a MultiSelect
   * trigger <button>) without nesting a real <button> (the React #418 nested-button
   * hydration bug fixed in Wave 1). The removable x stays its own span[role=button]
   * control (a span, never a nested <button>). A token is a static tag + a remove, not a
   * toggle, so `selected` / `onClick` / `aria-pressed` do not apply in this mode.
   */
  token?: boolean;
}

// One pill radius and a static fill per state. Feedback never tweens the fill -
// only brightness/transform move. Every visual value is a token; the dark stage
// resolves the cyan accent to #0cc0df.
export const NOCKERL_CHIP_STYLES = `
.nk-chip {
  font-family: var(--font-family-sans);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-12);
  line-height: 1;
  cursor: pointer;
  border: var(--space-px) solid transparent;
  /* the reserved idiom: a full pill, never the control radius */
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  min-height: var(--space-8);
  transition: transform .12s var(--motion-easing-standard), background-color .12s, filter .12s, border-color .12s;
}
.nk-chip:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
.nk-chip:disabled { cursor: not-allowed; }
/* unselected - soft cyan tint + cyan label (a cohesive chip strip) */
.nk-chip--off { background: var(--color-accent-primary-soft); color: var(--color-accent-primary); }
.nk-chip--off:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
.nk-chip--off:active:not(:disabled) { transform: scale(.97); filter: brightness(.94); }
.nk-chip--off:disabled { background: color-mix(in srgb, var(--color-accent-primary) 6%, transparent); color: color-mix(in srgb, var(--color-accent-primary) 50%, transparent); }
/* selected - solid cyan fill + contrast-picked dark label (the active keycap) */
.nk-chip--on { background: var(--color-accent-primary); color: var(--color-on-accent); }
.nk-chip--on:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
.nk-chip--on:active:not(:disabled) { transform: scale(.97); filter: brightness(.9); }
.nk-chip--on:disabled { background: color-mix(in srgb, var(--color-accent-primary) 38%, transparent); color: color-mix(in srgb, var(--color-on-accent) 55%, transparent); }
/* TOKEN - a NON-button removable tag (a <span>, so it may sit inside another interactive
   element without nesting a real button). A cyan tag; the label ellipsizes; the remove x
   is its own span[role=button]. Not a toggle - no hover-lift, default cursor. */
.nk-chip--token { background: color-mix(in srgb, var(--color-accent-primary) 22%, transparent); color: var(--color-accent-primary);
  padding: var(--space-1) var(--space-2); min-height: auto; max-width: 100%; cursor: default; flex: 0 0 auto; }
.nk-chip--token > span:not(.nk-chip__x):not(.nk-chip__swatch):not(.nk-chip__dot) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nk-chip--token.is-disabled { opacity: .55; }
.nk-chip--token .nk-chip__x:focus-visible { outline-color: var(--color-accent-primary); }
/* leading dot */
.nk-chip__dot { width: 7px; height: 7px; border-radius: var(--radius-pill); background: currentColor; display: inline-block; }
/* a per-item COLOR swatch (arbitrary fixed color via inline style, chart-legend idiom).
   A contrast RING (the chip's own label ink) frames the dot so it stays visible in BOTH
   states, critically when a series color EQUALS the fill (a cyan series on the selected
   cyan chip would otherwise vanish into it). currentColor = on-accent when selected, cyan
   when unselected, so the ring always contrasts the chip background. */
.nk-chip__swatch { width: 7px; height: 7px; border-radius: var(--radius-pill); flex: 0 0 auto; display: inline-block;
  box-shadow: 0 0 0 var(--space-px) color-mix(in srgb, currentColor 55%, transparent); }
/* trailing remove x - its own focusable control with an accessible name */
.nk-chip__x {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--space-4);
  height: var(--space-4);
  margin-right: -3px; /* geometry: pull the x toward the pill edge */
  border-radius: var(--radius-pill);
  font-size: var(--font-size-10);
  line-height: 1;
  color: inherit;
  opacity: .8;
  transition: opacity .12s, background-color .12s;
}
.nk-chip__x:hover { opacity: 1; background: color-mix(in srgb, var(--color-shadow-tint) 18%, transparent); }
.nk-chip__x:focus-visible { outline: var(--space-0-5) solid var(--color-on-accent); outline-offset: var(--space-px); opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .nk-chip, .nk-chip__x { transition: none; }
}
`;

/** A single Nockerl chip - the unit the spec documents. In `token` mode it renders as a
 * <span> (not a <button>) so a removable token can nest inside another interactive
 * element without a nested real button. */
export const NockerlChip = forwardRef<HTMLButtonElement, NockerlChipProps>(function NockerlChip({ text, selected = false, onClick, disabled = false, leadingIcon, swatch, onRemove, token = false, className, ...rest }, ref) {
  // Shared inner content (identical in both modes): swatch, leading glyph, label, remove x.
  const body = (
    <>
      {swatch && <span className="nk-chip__swatch" style={{ background: swatch }} aria-hidden="true" />}
      {leadingIcon === 'dot' ? (
        <span className="nk-chip__dot" aria-hidden="true" />
      ) : leadingIcon ? (
        <span aria-hidden="true">{leadingIcon}</span>
      ) : null}
      <span>{text}</span>
      {onRemove && (
        <span
          className="nk-chip__x"
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`Remove ${text}`}
          aria-disabled={disabled || undefined}
          // don't steal focus from the host (e.g. a MultiSelect trigger) on press
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onRemove();
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }
          }}
        >
          ✕
        </span>
      )}
      <style>{NOCKERL_CHIP_STYLES}</style>
    </>
  );

  // TOKEN mode: a NON-interactive <span> container (safe inside another interactive
  // element). Not a toggle - no aria-pressed / onClick on the container.
  if (token) {
    return (
      <span className={`nk-chip nk-chip--token${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}>
        {body}
      </span>
    );
  }

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      className={`nk-chip ${selected ? 'nk-chip--on' : 'nk-chip--off'}${className ? ` ${className}` : ''}`}
      // selectable chips expose their on/off state to assistive tech
      aria-pressed={selected}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {body}
    </button>
  );
});

/** LEAF: the chip primitive; the interactive idiom renders (and owns) a raw <button>.
 *  Token mode is a non-interactive <span> whose remove-x is a span[role=button] (not a
 *  button facsimile). `leadingIcon` / `swatch` are ornamentation; holds no child slots. */
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default NockerlChip;
