/**
 * NockerlIconButton - the Tier-1 icon-button primitive (mirrors Compose NockerlIconButton).
 * Two idioms only:
 *   - plain         - transparent, 12px control-radius tappable glyph (toolbar/inline).
 *   - filled-circle - a solid accent CIRCLE, the single true-circle affordance, reserved
 *                     for the prominent send / stop slot.
 *
 * Laws encoded here: flash-free feedback (fill STATIC; hover/active animate brightness +
 * transform + a NEUTRAL shadow only), focus is a cyan OUTLINE (never a colored shadow),
 * no glow/emission (the circle catch-light is a top inset sheen). Every icon button MUST
 * carry an accessible name (`label`) - icon-only controls have no visible text.
 *
 * Injects the recipe CSS as the LAST child; identical injected blocks dedupe in effect.
 */
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import type { ComposeContract } from '../compose-contract';

export type NockerlIconButtonStyle = 'plain' | 'filled-circle';

/**
 * NockerlIconButton extends the native button attributes (minus the ones it owns) + forwards a
 * ref, so it is fully TRIGGER-COMPOSABLE: a kebab / overlay / tooltip trigger passes
 * onClick (WITH the event), onKeyDown / onFocus / onBlur / onPointer*, tabIndex, id,
 * title, style, and aria-haspopup / aria-expanded / aria-controls / aria-describedby
 * straight through to the <button>, and the ref reaches the element for measuring/focus.
 * `disabled` still gates onClick; `label` remains the required accessible name.
 */
export interface NockerlIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'type'> {
  /** The glyph to render (inline SVG node - e.g. <NockerlIcon .../>). */
  icon: ReactNode;
  /** Accessible name (REQUIRED - the only thing that names an icon-only control). */
  label: string;
  /** The icon-button idiom. Defaults to `plain`. */
  variant?: NockerlIconButtonStyle;
  /** Circle fill for `filled-circle` (defaults to the cyan accent token). Pass a var(--token). */
  accent?: string;
  /** Touch-target dimension in px. Defaults to 40 (Compose default). */
  size?: number;
  /**
   * TOGGLE mode: when set, the icon button HOLDS state: renders `aria-pressed` and, when
   * true, the pressed VISUAL is the selection outline (a selection-weight cyan ring plus a
   * cyan glyph, and no fill, design-laws section 6). The primary home for icon toggles
   * (toolbar toggles, wrap, etc.). Omit for a plain command icon button.
   */
  pressed?: boolean;
}

/** The .nk-ico recipe - plain + filled-circle idioms, in one place. */
export const NOCKERL_ICON_BUTTON_STYLES = `
.nk-ico {
  font-family: var(--font-family-sans);
  cursor: pointer;
  padding: 0;
  border: var(--space-px) solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-on-card);
  background: transparent;
  transition: transform .12s var(--motion-easing-standard), background-color .12s, box-shadow .12s, filter .12s;
}
.nk-ico svg { display: block; width: 20px; height: 20px; }
/* The glyph CELL (the primitive's own span). Without this it is a blockified flex item whose
   INLINE content forms a line box at the page line-height; any host glyph WRAPPER (an
   inline-flex span for sizing/tinting) then sits on that line box's BASELINE and rides 2-4px
   HIGH (measured on tool-call-card/agent-message). A raw svg only dodged it because
   display:block escapes the line box. Flex-center the cell + kill the line box, so ANY glyph
   shape (svg, wrapper span, stacked glyphs) centers exactly. */
.nk-ico > span { display: inline-flex; align-items: center; justify-content: center; line-height: 0; }
.nk-ico:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
.nk-ico:disabled { cursor: not-allowed; }
/* PLAIN - transparent, control radius. Hover/press paint a neutral wash. The radius is
   CAPPED at 30% of the button's own box (12px on the 40px default, the badge-host anchor
   ratio), so a small (28-32px) icon button's hover wash still reads as a crisp ROUNDED
   SQUARE instead of the ambiguous almost-circle 12px produces at that scale ().
   Resting fill is transparent, so this changes hover/press pixels only. */
.nk-ico--plain { border-radius: min(var(--radius-control), 30%); }
.nk-ico--plain:hover:not(:disabled) { background: color-mix(in srgb, var(--color-on-card) 7%, transparent); }
.nk-ico--plain:active:not(:disabled) { background: color-mix(in srgb, var(--color-on-card) 4%, transparent); transform: scale(.94); }
.nk-ico--plain:disabled { opacity: .38; }
/* pressed (toggle ON) reads by OUTLINE, not fill (design-laws section 6, reduce-fills): a
   selection-weight cyan ring plus the cyan glyph, with no wash. Toggle ON is a STATE, so it
   converts; the chip keeps its fill because there the fill is identity. The ring is an inset
   shadow, so the control's box is identical pressed or not. Hover keeps the neutral raise the
   unpressed button uses, rather than deepening a tint that is no longer there. */
.nk-ico--plain.is-pressed { color: var(--color-accent-primary);
  box-shadow: inset 0 0 0 var(--space-px) color-mix(in srgb, var(--color-accent-primary) 45%, transparent); }
.nk-ico--plain.is-pressed:hover:not(:disabled) { background: color-mix(in srgb, var(--color-on-card) 7%, transparent); }
/* FILLED_CIRCLE - solid accent circle, lit from above (sheen = catch-light, NOT a glow). */
.nk-ico--filled-circle {
  border-radius: var(--radius-pill);
  color: var(--color-on-accent);
  box-shadow: 0 var(--elevation-level2) 14px -6px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-ico--filled-circle:hover:not(:disabled) {
  filter: brightness(1.06); transform: translateY(-1px);
  box-shadow: 0 8px 18px -7px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-ico--filled-circle:active:not(:disabled) {
  filter: brightness(.9); transform: translateY(0) scale(.94);
  box-shadow: 0 var(--elevation-level1) var(--elevation-level3) -3px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent), inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 25%, transparent);
}
.nk-ico--filled-circle:disabled { opacity: .38; box-shadow: none; }
@media (prefers-reduced-motion: reduce) {
  .nk-ico { transition: none; }
}
`;

/** A single Nockerl icon button - the unit the spec documents. Forwards a ref to the
 * underlying <button> so triggers/positioners can focus/measure it. */
export const NockerlIconButton = forwardRef<HTMLButtonElement, NockerlIconButtonProps>(function NockerlIconButton({
  icon,
  label,
  onClick,
  variant = 'plain',
  disabled = false,
  accent = 'var(--color-accent-primary)',
  size = 40,
  pressed,
  className,
  style: styleProp,
  ...rest
}, ref) {
  const style: CSSProperties = { width: size, height: size, ...styleProp };
  if (variant === 'filled-circle') style.background = accent;
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      className={['nk-ico', `nk-ico--${variant}`, pressed ? 'is-pressed' : '', className].filter(Boolean).join(' ')}
      style={style}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      onClick={disabled ? undefined : onClick}
    >
      <span aria-hidden="true">{icon}</span>
      <style>{NOCKERL_ICON_BUTTON_STYLES}</style>
    </button>
  );
});

/** LEAF: the icon-button primitive; renders (and owns) its raw <button>. `icon` is a
 *  glyph prop (leaf ornamentation), not a modeled slot. */
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default NockerlIconButton;
