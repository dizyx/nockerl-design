/**
 * NockerlCheckbox is the Tier-1 tri-state selection-control primitive. ONE home for the
 * recessed-well box, the static cyan ON gradient that CROSS-FADES in by opacity,
 * the tick/dash that DRAWS via stroke-dashoffset, the focus ring, and the
 * checkbox RULE. A future checkbox-rule change is then ONE edit, not many.
 * Composes ONLY tokens.
 *
 * Sibling to the NockerlSwitch, deliberately distinct: a SWITCH is an instant on/off
 * SETTING (track + sliding thumb); a CHECKBOX is a multi-SELECTION in a list or
 * form, a box that fills with a cyan tick. It also adds an INDETERMINATE (mixed)
 * state for parent/child tri-state groups. They share the selection-control
 * vocabulary (recessed well, static cyan accent fill, focus-visible ring) but the
 * checkbox renders a BOX + TICK, never a track.
 *
 * Sourced from the shipped apps, never the web dashboard:
 *   • Android (Compose) Material3 `NockerlCheckbox(checked, onCheckedChange)`, used for
 *     multi-select option rows in chat/ui/AskUserQuestionSheet.kt (a MutableSet of
 *     selected labels; the parent Row owns the click, so onCheckedChange = null).
 *     The brand override is CheckboxDefaults.colors(checkedColor = accentPrimary),
 *     matching the NockerlSwitch's checkedTrackColor = accentPrimary.
 *   • Voice (Swift) has no checkbox; selection reads as Image(systemName:
 *     "checkmark") tinted NockerlTheme.accent (#0CC0DF). The real native control is
 *     Toggle(...).toggleStyle(.checkbox). Tri-state / multi-select list ship on
 *     neither app yet. They were designed here originally; see the drift note.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • depth = neutral shadow + top catch-light, never a glow. The UNCHECKED box is
 *     a RECESSED WELL (darker than the card + inner shadow, because fields sink). The
 *     CHECKED box is a STATIC cyan gradient lit from above.
 *   • flash-free feedback: the box fill never tweens between two fills. The cyan
 *     layer CROSS-FADES in by opacity (interpolatable) over the static well, and
 *     the tick DRAWS via stroke-dashoffset. Only transform / opacity / brightness
 *     move. The mixed->checked dash is a draw, not a fill swap.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   • the tick that sits ON the cyan fill uses var(--color-on-accent) for contrast.
 *   • cyan is the SELECTION signal only; warm tones appear only as the error mark.
 *   • a real control: role="checkbox", aria-checked incl. "mixed", Space toggles,
 *     >=24px hit target, persistent labels.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract';

export type NockerlCheckboxSize = 'sm' | 'md';
/** Tri-state value: false (off), true (on), 'mixed' (indeterminate parent). */
export type CheckedState = boolean | 'mixed';

/**
 * NockerlCheckbox extends the native input attributes (minus the ones it owns) + forwards a ref
 * to the underlying <input>, so it works in a real form: `name`, `onBlur`, `required`,
 * and aria-* / data-* pass straight through to the <input> (convention §7), and a form
 * library can register/focus the control via the ref. `onChange` keeps its value-first
 * `(next: boolean)` signature; `checked` is tri-state; `size` is the box-scale union.
 * All three are therefore Omitted from the DOM attributes.
 */
export interface NockerlCheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'checked' | 'size'> {
  /** Tri-state checked value. `'mixed'` renders the indeterminate dash. */
  checked: CheckedState;
  /** Fired with the next boolean value. Ignored while disabled. */
  onChange?: (next: boolean) => void;
  /** Persistent visible label (rendered beside the box, the box is its target). */
  label?: string;
  /** Supporting line under the label. */
  description?: string;
  /** Box scale. `md` matches the platform default. */
  size?: NockerlCheckboxSize;
  /** Inert + clearly-seen (never invisible) state. */
  disabled?: boolean;
  /** Invalid: warm error border + a "!" mark + a message. Color is never alone. */
  invalid?: boolean;
  /** aria-label when there is no visible `label` (standalone / inline use). */
  ariaLabel?: string;
}

// The box is a recessed WELL when off and a static cyan gradient when on/mixed;
// the tick DRAWS (stroke-dashoffset) and the cyan layer CROSS-FADES by opacity.
// No fill ever hard-cuts. Every visual value is a token; literals are geometry only.
export const NOCKERL_CHECKBOX_STYLES = `
/* ── The control: a label that wraps the box so the whole pair is clickable ── */
.nk-cb {
  --cb-box: 20px; --cb-stroke: 2px;
  display: inline-flex; align-items: flex-start; gap: var(--space-3);
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.nk-cb--sm { --cb-box: 16px; --cb-stroke: 2px; }
.nk-cb--disabled { cursor: not-allowed; }

/* In the hit area, padding pushes the pressable region to ≥24px so the 16/20px box
   still clears the target law, while negative margin keeps the box's visual edge
   aligned with the label's first line (box height == label.large line-height). */
.nk-cb__hit {
  position: relative; flex: 0 0 auto; isolation: isolate;
  display: inline-flex; align-items: center; justify-content: center;
  /* The hit slot is ALWAYS the label's first-line height (line-height-20), and the box
     centers within it, so a sm box (16) and an md box (20) BOTH sit centered on line 1.
     Sizing the slot to the box instead (height:--cb-box) would top-align a sm box ~2px
     high against the 20px line. */
  width: var(--cb-box); height: var(--font-line-height-20);
  padding: var(--space-1); margin: calc(var(--space-1) * -1);
  margin-top: 0;
  border-radius: var(--radius-control);
}

/* The native input drives state + a11y; it is visually hidden but focusable. */
.nk-cb__input {
  position: absolute; inset: 0; margin: 0; opacity: 0; cursor: inherit;
  width: 100%; height: 100%;
}

/* The BOX is a recessed well (fields sink): darker than the card + inner shadow. */
.nk-cb__box {
  position: relative; pointer-events: none;
  /* Never shrink: the hit is a border-box flex parent whose padding narrows its
     content area below --cb-box, so a shrinkable box would collapse to half-width
     (square → sliver) in a tight/flex context. flex:0 0 auto pins the box to its
     own --cb-box; it overflows the padding symmetrically, back to the hit's edge. */
  flex: 0 0 auto;
  width: var(--cb-box); height: var(--cb-box); border-radius: var(--radius-track);
  background: var(--color-card-surface3);
  border: var(--space-px) solid var(--color-divider);
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent);
  transition: filter .16s, border-color .16s;
}
/* The cyan ON layer: a STATIC gradient lit from above; it CROSS-FADES in by
   opacity (interpolatable), so the box never tweens between two fills. */
.nk-cb__box::after {
  content: ""; position: absolute; inset: calc(var(--space-px) * -1); border-radius: var(--radius-track);
  background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary));
  /* Top catch-light (depth law) + a 1px inset ring of muted cyan: a DEFINING EDGE so the filled
     box reads as a contained control, not a soft cyan blob. Shares the radio's
     depth language (fill + catch-light + edge); the on-accent tick stays for legibility rather
     than a knockout stroke. A thin knockout flips color across themes and collides with the
     disabled-on look, failing the "unambiguously reads checked" bar. */
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight),
              inset 0 0 0 var(--space-px) color-mix(in srgb, var(--color-accent-primary) 68%, var(--color-shadow-tint));
  opacity: 0; transition: opacity .16s;
}
.nk-cb__input:checked ~ .nk-cb__box,
.nk-cb__input:indeterminate ~ .nk-cb__box { border-color: transparent; box-shadow: none; }
.nk-cb__input:checked ~ .nk-cb__box::after,
.nk-cb__input:indeterminate ~ .nk-cb__box::after { opacity: 1; }

/* Hover/press animate BRIGHTNESS + a tiny press-scale only, never a fill swap. */
.nk-cb:hover:not(.nk-cb--disabled) .nk-cb__box { filter: brightness(1.08); }
.nk-cb:hover:not(.nk-cb--disabled) .nk-cb__box::after { filter: brightness(1.06); }
.nk-cb:active:not(.nk-cb--disabled) .nk-cb__box { transform: scale(.9); transition: transform .1s; }

/* Focus is an OUTLINE ring on the box (never a colored shadow). */
.nk-cb__input:focus-visible ~ .nk-cb__box {
  outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5);
}

/* The TICK is drawn ON the cyan fill, so it uses the on-accent contrast color. It
   DRAWS via stroke-dashoffset (interpolatable), never popping in. */
.nk-cb__mark {
  position: absolute; inset: 0; display: block; pointer-events: none;
  color: var(--color-on-accent);
  /* Paint the tick/dash ABOVE the cyan ::after fill. The fill is a pseudo-element (tree-last
     among these z-index:auto siblings), so at full opacity it would PAINT OVER the glyph
     and both checked and mixed would read as a blank cyan box. z-index lifts the glyph
     onto the fill. */
  z-index: 1;
}
.nk-cb__mark path {
  fill: none; stroke: currentColor; stroke-width: var(--cb-stroke);
  stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: var(--mark-len); stroke-dashoffset: var(--mark-len);
  transition: stroke-dashoffset .2s var(--motion-easing-standard);
}
.nk-cb__mark--tick path { --mark-len: 24; }
.nk-cb__mark--dash path { --mark-len: 12; }
/* The check shows when checked; the dash shows when indeterminate. */
.nk-cb__input:checked ~ .nk-cb__box .nk-cb__mark--tick path { stroke-dashoffset: 0; }
.nk-cb__input:indeterminate ~ .nk-cb__box .nk-cb__mark--dash path { stroke-dashoffset: 0; }

/* Invalid adds a WARM error border + a "!" glyph in the well + a message. The error
   box stays a recessed well (unchecked-invalid) so color is never the only signal. */
.nk-cb--invalid .nk-cb__box { border-color: var(--color-status-error); }
.nk-cb--invalid .nk-cb__bang { color: var(--color-status-error); opacity: 1; }
.nk-cb__bang { position: absolute; inset: 0; display: grid; place-items: center; opacity: 0;
  font-size: var(--font-size-12); font-weight: var(--font-weight-bold); line-height: 1; pointer-events: none; }
.nk-cb__input:checked ~ .nk-cb__box .nk-cb__bang { opacity: 0; }

/* The disabled state stays inert but clearly legible (never faded to invisible). */
.nk-cb--disabled .nk-cb__box { filter: none; }
.nk-cb--disabled.nk-cb--off { opacity: .55; }
.nk-cb--disabled.nk-cb--on .nk-cb__box::after { opacity: .5; }

/* The text block beside the box. */
.nk-cb__text { display: flex; flex-direction: column; gap: var(--space-0-5); min-width: 0; }
.nk-cb__label { font-size: var(--font-size-14); font-weight: var(--font-weight-medium);
  line-height: var(--font-line-height-20); color: var(--color-on-card); }
.nk-cb__desc { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); }
.nk-cb--disabled .nk-cb__label { color: var(--color-on-card-muted); }
.nk-cb__err { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-status-error);
  display: inline-flex; align-items: center; gap: var(--space-1); }

@media (prefers-reduced-motion: reduce) {
  .nk-cb__box, .nk-cb__box::after, .nk-cb__mark path { transition: none; }
}
`;

// ─── The tick + dash glyphs (drawn paths so stroke-dashoffset can animate) ──────
const Tick = (
  <svg className="nk-cb__mark nk-cb__mark--tick" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M5 10.5 8.5 14 15 6.5" />
  </svg>
);
const Dash = (
  <svg className="nk-cb__mark nk-cb__mark--dash" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M5.5 10h9" />
  </svg>
);

/**
 * A single Nockerl checkbox is the unit the spec documents. A native input drives
 * state + a11y (incl. `indeterminate` → aria-checked="mixed"); the box is a
 * recessed well that lifts to a static cyan gradient when on/mixed; the tick draws
 * on the cyan fill. The box is always the focusable target; an optional label sits
 * beside it and shares the same hit area.
 */
export const NockerlCheckbox = forwardRef<HTMLInputElement, NockerlCheckboxProps>(function NockerlCheckbox({
  checked,
  onChange,
  label,
  description,
  size = 'md',
  disabled = false,
  invalid = false,
  ariaLabel,
  className,
  style,
  ...rest
}, ref) {
  const id = useId();
  const errId = `${id}-err`;
  const isMixed = checked === 'mixed';
  const isOn = checked === true;
  const cls = [
    'nk-cb',
    `nk-cb--${size}`,
    disabled ? 'nk-cb--disabled' : '',
    disabled ? (isOn ? 'nk-cb--on' : 'nk-cb--off') : '',
    invalid ? 'nk-cb--invalid' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const box = (
    <span className="nk-cb__hit">
      <input
        {...rest}
        id={id}
        type="checkbox"
        className="nk-cb__input"
        checked={isOn}
        ref={(el) => {
          // Merge the indeterminate-setting callback with the forwarded ref so BOTH run:
          // the native tri-state is driven here, and form libraries still get the element.
          if (el) el.indeterminate = isMixed;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        aria-checked={isMixed ? 'mixed' : isOn}
        aria-label={label ? undefined : ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errId : undefined}
        disabled={disabled}
        onChange={disabled ? undefined : (e) => onChange?.(e.target.checked)}
      />
      <span className="nk-cb__box" aria-hidden="true">
        {Tick}
        {Dash}
        {invalid && !isOn && !isMixed && <span className="nk-cb__bang">!</span>}
      </span>
    </span>
  );

  if (!label)
    return (
      <label className={cls} style={style}>
        {box}
        <style>{NOCKERL_CHECKBOX_STYLES}</style>
      </label>
    );

  return (
    <label className={cls} style={style} htmlFor={id}>
      {box}
      <span className="nk-cb__text">
        <span className="nk-cb__label">{label}</span>
        {description && <span className="nk-cb__desc">{description}</span>}
        {invalid && (
          <span className="nk-cb__err" id={errId}>
            <span aria-hidden="true">!</span> Required to continue
          </span>
        )}
      </span>
      <style>{NOCKERL_CHECKBOX_STYLES}</style>
    </label>
  );
});

/** LEAF: the selection-control primitive; a native <input type="checkbox"> drives state
 *  + a11y (aria-checked incl. "mixed"). It owns that raw <input>; holds no child slots. */
export const compose = { tier: 'leaf', owns: ['input'] } satisfies ComposeContract;

export default NockerlCheckbox;
