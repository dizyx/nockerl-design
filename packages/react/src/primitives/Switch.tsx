/**
 * NockerlSwitch is the Tier-1 on/off toggle primitive. ONE home for the recessed-well track,
 * the static cyan ON gradient that CROSS-FADES in by opacity, the sliding lifted
 * thumb, the focus ring, and the switch RULE, so a future switch-rule change is ONE
 * edit, not many. Composes ONLY tokens.
 *
 * Sibling to the NockerlCheckbox, deliberately distinct: a SWITCH is an instant on/off
 * SETTING (track + sliding thumb); a CHECKBOX is a multi-SELECTION in a list or form
 * (a box that fills with a cyan tick). They share the selection-control vocabulary
 * (recessed well, static cyan accent fill, focus-visible ring) but the switch renders
 * a TRACK + sliding THUMB, never a box.
 *
 * Sourced from the shipped apps, never the web dashboard:
 *   • Android (Compose) Material3 NockerlSwitch(checked, onCheckedChange, enabled,
 *     colors = SwitchDefaults.colors(checkedTrackColor = accentPrimary)). The ON
 *     track is the brand cyan; everything else is the palette default.
 *   • Voice (Swift) Toggle("", isOn:).labelsHidden().toggleStyle(.switch): the
 *     system stadium switch, accent-tinted.
 *   • The web look continues the nk-li__switch precedent already in ListItemDemo
 *     (pill track + a thumb that translates + cyan when on).
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • depth = neutral shadow + top catch-light, never a glow. The OFF track is a
 *     RECESSED WELL (darker + inner shadow) because fields sink; the thumb is a
 *     LIFTED disc (drop shadow + catch-light) because it rises. ON track is a
 *     STATIC cyan gradient lit from above.
 *   • flash-free feedback: the track fill never tweens between two fills. Only the
 *     thumb TRANSFORM (slide + press-scale) and track BRIGHTNESS animate; both are
 *     interpolatable. The OFF->ON track recolor is an opacity cross-fade of a
 *     static cyan layer over the static well, so nothing hard-cuts.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   • cyan is the ON signal only; warm tones never appear here.
 *   • a real control: role="switch", aria-checked, Space/Enter toggles, >=24px hit.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract.js';

export type NockerlSwitchSize = 'sm' | 'md';

/**
 * NockerlSwitch renders a <button role="switch"> (not a native checkbox), so it extends the
 * native BUTTON attributes (minus the value-first `onChange` it redefines) + forwards a
 * ref to that <button>: `name`-less button controls still take `onFocus`/`onBlur`,
 * `id`, `title`, `tabIndex`, and aria-* / data-* straight through, and a form/focus
 * manager can reach the element via the ref. `onChange` keeps its `(next: boolean)`
 * value-first signature (Omitted from the DOM attrs); `checked`/`size` are not button
 * DOM attributes, so they need no Omit.
 */
export interface NockerlSwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  /** Controlled checked state. */
  checked: boolean;
  /** Fired with the next checked value. Ignored while disabled or loading. */
  onChange?: (next: boolean) => void;
  /** Accessible name. Rendered as a persistent label when `label` is set, else required. */
  label?: string;
  /** Supporting line under the label (label rows only). */
  description?: string;
  /** Track + thumb scale. `md` matches the Material/system default. */
  size?: NockerlSwitchSize;
  /** Inert + clearly-seen (never invisible) state. */
  disabled?: boolean;
  /** Awaiting async confirmation. Shows a spinner in the thumb and blocks re-toggle. */
  loading?: boolean;
  /** aria-label when there is no visible `label` (icon-only / inline use). */
  ariaLabel?: string;
}

// The track is a recessed WELL when off and a static cyan gradient when on; the
// thumb is a lifted disc. Feedback animates the thumb transform + track
// brightness ONLY. The cyan layer cross-fades by opacity so no fill hard-cuts.
export const NOCKERL_SWITCH_STYLES = `
/* ── The control ─────────────────────────────────────────────────────────── */
.nk-sw {
  --sw-w: 44px; --sw-h: 26px; --sw-thumb: 20px; --sw-pad: 3px;
  position: relative; flex: 0 0 auto; display: inline-flex; align-items: center;
  width: var(--sw-w); height: var(--sw-h); padding: 0; border: 0; background: none;
  border-radius: var(--radius-pill); cursor: pointer; isolation: isolate;
  -webkit-tap-highlight-color: transparent;
}
.nk-sw--sm { --sw-w: 36px; --sw-h: 22px; --sw-thumb: 16px; --sw-pad: 3px; }
.nk-sw:disabled, .nk-sw[aria-disabled="true"] { cursor: not-allowed; }
.nk-sw:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }

/* The TRACK is a recessed well (fields sink): darker than the card + inner shadow. */
.nk-sw__track {
  position: absolute; inset: 0; border-radius: var(--radius-pill);
  background: var(--color-card-surface3);
  border: var(--space-px) solid var(--color-divider);
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent);
  transition: filter .16s, border-color .16s;
}
/* The cyan ON layer, a STATIC gradient lit from above, CROSS-FADES in by opacity
   (interpolatable), so the track never tweens between two fills. */
.nk-sw__track::after {
  content: ""; position: absolute; inset: -1px; border-radius: var(--radius-pill);
  background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary));
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight);
  opacity: 0; transition: opacity .16s;
}
.nk-sw[aria-checked="true"] .nk-sw__track { border-color: transparent; box-shadow: none; }
.nk-sw[aria-checked="true"] .nk-sw__track::after { opacity: 1; }
.nk-sw:hover:not(:disabled) .nk-sw__track { filter: brightness(1.08); }
.nk-sw:active:not(:disabled) .nk-sw__track { filter: brightness(.94); }

/* The THUMB is a lifted disc: catch-light + neutral drop shadow. It SLIDES
   (transform), the one true interpolatable property. */
.nk-sw__thumb {
  position: absolute; top: 50%; left: var(--sw-pad);
  width: var(--sw-thumb); height: var(--sw-thumb); border-radius: var(--radius-pill);
  background: var(--color-card-surface1);
  box-shadow: 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent),
              0 var(--elevation-level1) var(--elevation-level2) -1px color-mix(in srgb, var(--color-shadow-tint) 45%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  display: inline-flex; align-items: center; justify-content: center;
  transform: translate(0, -50%);
  transition: transform .18s var(--motion-easing-standard), width .18s var(--motion-easing-standard);
}
.nk-sw[aria-checked="true"] .nk-sw__thumb {
  transform: translate(calc(var(--sw-w) - var(--sw-thumb) - var(--sw-pad) * 2), -50%);
}
/* Press = the thumb squashes wider (physical), not a fill change. */
.nk-sw:active:not(:disabled) .nk-sw__thumb { width: calc(var(--sw-thumb) + var(--space-1)); }
.nk-sw[aria-checked="true"]:active:not(:disabled) .nk-sw__thumb {
  transform: translate(calc(var(--sw-w) - var(--sw-thumb) - var(--space-1) - var(--sw-pad) * 2), -50%);
}

/* Disabled stays inert but still clearly legible (never faded to invisible). */
.nk-sw:disabled .nk-sw__track, .nk-sw[aria-disabled="true"] .nk-sw__track { filter: none; }
.nk-sw:disabled .nk-sw__thumb, .nk-sw[aria-disabled="true"] .nk-sw__thumb { box-shadow: none; }
.nk-sw--off-disabled { opacity: .55; }
.nk-sw--on-disabled .nk-sw__track::after { opacity: .5; }
.nk-sw--on-disabled .nk-sw__thumb { background: var(--color-card-surface1); }

/* While loading, a spinner rides inside the thumb; rotation is interpolatable. */
.nk-sw__spin {
  width: calc(var(--sw-thumb) - var(--space-2)); height: calc(var(--sw-thumb) - var(--space-2));
  border-radius: var(--radius-pill); border: var(--space-px) solid var(--color-card-surface3);
  border-top-color: var(--color-accent-primary); animation: nk-sw-spin .7s linear infinite;
}
@keyframes nk-sw-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .nk-sw__track, .nk-sw__track::after, .nk-sw__thumb { transition: none; }
  .nk-sw__spin { animation-duration: 1.4s; }
}
`;

/**
 * A single Nockerl switch: the unit the spec documents. The track is a recessed
 * well that lifts to a static cyan gradient when on; the thumb is a lifted disc
 * that slides. role="switch" + aria-checked; Space/Enter toggle; the control is
 * always its own focusable target (a label row keeps the control separate).
 */
export const NockerlSwitch = forwardRef<HTMLButtonElement, NockerlSwitchProps>(function NockerlSwitch({
  checked,
  onChange,
  size = 'md',
  disabled = false,
  loading = false,
  ariaLabel,
  // label / description are consumed by a higher-level label row, not this leaf; pull
  // them out of `rest` so they never leak onto the <button> as invalid DOM attributes.
  label: _label,
  description: _description,
  className,
  ...rest
}, ref) {
  const inert = disabled || loading;
  const stateClass = disabled
    ? checked
      ? 'nk-sw--on-disabled'
      : 'nk-sw--off-disabled'
    : '';
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      disabled={inert}
      className={['nk-sw', `nk-sw--${size}`, stateClass, className].filter(Boolean).join(' ')}
      onClick={inert ? undefined : () => onChange?.(!checked)}
    >
      <span className="nk-sw__track" aria-hidden="true" />
      <span className="nk-sw__thumb" aria-hidden="true">
        {loading && <span className="nk-sw__spin" />}
      </span>
      <style>{NOCKERL_SWITCH_STYLES}</style>
    </button>
  );
});

/** LEAF: the on/off toggle primitive; renders a <button role="switch"> (aria-checked).
 *  It owns that raw button + switch role; holds no child slots. */
export const compose = { tier: 'leaf', owns: ['button', 'role=switch'] } satisfies ComposeContract;

export default NockerlSwitch;
