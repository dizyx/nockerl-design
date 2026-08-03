/**
 * NockerlRadioGroup: the Tier-1 single-choice selection-control primitive. ONE home for
 * the recessed-well circle, the static cyan RING that CROSS-FADES in by opacity, the
 * centered DOT that SCALES in, the roving-tabindex radiogroup semantics, the radio
 * CARD variant, and the radio RULE. A future radio-rule change is ONE edit, not
 * many. Composes ONLY tokens.
 *
 * The third sibling in the selection-control family, deliberately DISTINCT: a
 * SWITCH is an on/off SETTING (track + thumb); a CHECKBOX is a multi-SELECT box +
 * tick (with a tri-state "mixed"); a RADIO is a MUTUALLY-EXCLUSIVE single choice:
 * a CIRCLE holding a centered filled DOT when chosen. Only ONE option per group
 * is selectable, and the whole group is a single tab stop: arrow keys ROVE and
 * SELECT. They share the vocabulary (recessed well, static cyan accent lit from
 * above, focus ring) but the radio renders a CIRCLE + DOT. Never a box, tick, or
 * track.
 *
 * Sourced from the shipped apps, never the web dashboard:
 *   • Android (Compose) Material3 `RadioButton(selected, onClick)` brand-themed
 *     via `RadioButtonDefaults.colors(selectedColor = accentPrimary)` (matching
 *     NockerlSwitch/NockerlCheckbox). Rows use the M3 idiom `Modifier.selectable(selected,
 *     onClick, role = Role.RadioButton)`: the PARENT owns the click, the child
 *     `RadioButton(onClick = null)`, so the whole label is ONE a11y unit
 *     (chat/ui/SessionEngineSupport.kt `EngineSelector`; AskUserQuestionSheet.kt
 *     single-choice: `selected.clear(); selected.add(label)`). Options carry a
 *     label + optional description; a `multiSelect` flag is the only thing that
 *     swaps the RadioButton for a NockerlCheckbox.
 *   • Voice (Swift/macOS) has NO radio control: single choice is a custom
 *     `SegmentedSelector` (active = cyan OUTLINE) or a `NockerlMenu` whose chosen row
 *     gets a `checkmark`. Radio cards + an error/required group ship on neither
 *     app yet (designed here originally); see the drift note.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • depth = neutral shadow + top catch-light, never a glow. The UNSELECTED
 *     circle is a RECESSED WELL (darker + inner shadow: fields sink); the
 *     SELECTED ring is a STATIC cyan gradient lit from above.
 *   • flash-free: the circle never tweens between two fills. The cyan ring
 *     CROSS-FADES by opacity and the DOT SCALES in (transform); only opacity /
 *     transform / brightness move, so nothing hard-cuts.
 *   • the radio CARD is the same idea at card scale: a flat card that, when
 *     chosen, gains a cyan ring + a faint accent-soft wash (a shape, not a halo).
 *     Cards share equal width + height in their row.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   • cyan is the SELECTION signal only; warm tones appear only as the error mark.
 *   • a real control: role="radiogroup" + role="radio", aria-checked, roving
 *     tabindex (ONE tab stop per group), Arrow keys move AND select, Space selects,
 *     aria-labelledby (group label) + aria-describedby (error), >=24px hit target.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef, useId, useRef } from 'react';
import type { HTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract';

export type RadioSize = 'sm' | 'md';

export interface RadioOption {
  /** Stable value submitted on selection. */
  value: string;
  /** Persistent visible label (the radio's accessible name carrier). */
  label: string;
  /** Optional supporting line under the label. */
  description?: string;
  /** Inert + clearly-seen (never invisible) single option. */
  disabled?: boolean;
}

export interface NockerlRadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Group options, rendered in order. */
  options: RadioOption[];
  /** Currently selected value (controlled). */
  value: string;
  /** Fired with the next value. Ignored for disabled options. */
  onChange?: (next: string) => void;
  /** Visible group label, wired as the radiogroup's accessible name. */
  label: string;
  /** Stack vertically (default) or flow inline on one line. */
  orientation?: 'vertical' | 'horizontal';
  /** Circle scale. `md` matches the platform default. */
  size?: RadioSize;
  /** Whole-group invalid: warm error ring + a required message. Color never alone. */
  invalid?: boolean;
  /** Render each option as a selectable CARD instead of a list row. */
  variant?: 'list' | 'card';
}

// The circle is a recessed WELL when off and gains a static cyan RING + a DOT that
// scales in when on; the ring cross-fades by opacity so no fill hard-cuts. Every
// visual value is a token; literals are circle/dot geometry + curves only.
export const NOCKERL_RADIO_GROUP_STYLES = `
/* ── The group: one accessible unit (role=radiogroup), labelled above ───────── */
.nk-rg { display: flex; flex-direction: column; gap: var(--space-3); }
.nk-rg--horizontal { flex-direction: row; flex-wrap: wrap; gap: var(--space-5); }
.nk-rg--cards, .nk-rg--cards.nk-rg--horizontal { gap: var(--space-3); }

/* ── A single option ROW: the whole label is the target (one a11y unit) ─────── */
.nk-ro {
  --rd-circle: 20px; --rd-dot: 8px;
  display: flex; align-items: flex-start; gap: var(--space-3);
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  border: 0; background: none; padding: 0; margin: 0; text-align: left;
  font-family: inherit; color: inherit;
}
.nk-ro--sm { --rd-circle: 16px; --rd-dot: 6px; }
.nk-ro--disabled { cursor: not-allowed; }

/* The hit area: padding pushes the pressable region to ≥24px so the 16/20px
   circle still clears the target law; negative margin keeps the circle's visual
   edge aligned with the label's first line (circle box == label line-height). */
.nk-ro__hit {
  position: relative; flex: 0 0 auto; isolation: isolate;
  display: inline-flex; align-items: center; justify-content: center;
  width: var(--rd-circle); height: var(--rd-circle);
  padding: var(--space-1); margin: calc(var(--space-1) * -1);
  /* circle box == label line-height, so flex-start already centers the disc on the first
     line, no offset. (The old calc double-counted the hit padding and pulled the disc up;
     measured -2px above the label center. Verified delta 0 with margin-top: 0.) */
  margin-top: 0;
}
.nk-ro--sm .nk-ro__hit { margin-top: 0; }

/* The CIRCLE is a recessed well (fields sink): darker than the card + inner shadow.
   flex:0 0 auto + box-sizing:border-box keep it a true 1:1 disc: as a flex child of
   the inline-flex hit area it must NOT grow/shrink/stretch, or width≠height → ellipse. */
.nk-ro__circle {
  position: relative; pointer-events: none; flex: 0 0 auto; box-sizing: border-box;
  width: var(--rd-circle); height: var(--rd-circle); border-radius: var(--radius-pill);
  background: var(--color-card-surface3);
  border: var(--space-px) solid var(--color-divider);
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent);
  transition: filter .16s, border-color .16s;
}
/* The cyan SELECTED ring is a STATIC gradient lit from above. It CROSS-FADES in by
   opacity (interpolatable), so the circle never tweens between two fills. */
.nk-ro__circle::before {
  content: ""; position: absolute; inset: calc(var(--space-px) * -1); border-radius: var(--radius-pill);
  background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary));
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight);
  opacity: 0; transition: opacity .16s;
}
/* The DOT is the unmistakable single-choice mark: a centered disc that SCALES in
   (transform) on top of the cyan ring. Hollowed by an inner well so the ring reads. */
.nk-ro__circle::after {
  content: ""; position: absolute; top: 50%; left: 50%; flex: 0 0 auto; box-sizing: border-box;
  width: var(--rd-dot); height: var(--rd-dot); border-radius: var(--radius-pill);
  background: var(--color-card-surface1);
  transform: translate(-50%, -50%) scale(0);
  transition: transform .18s cubic-bezier(.34,1.56,.64,1);
}
.nk-ro__input:checked ~ .nk-ro__circle { border-color: transparent; box-shadow: none; }
.nk-ro__input:checked ~ .nk-ro__circle::before { opacity: 1; }
.nk-ro__input:checked ~ .nk-ro__circle::after { transform: translate(-50%, -50%) scale(1); }

/* The native input drives state + a11y; visually hidden but focusable. */
.nk-ro__input {
  position: absolute; inset: 0; margin: 0; opacity: 0; cursor: inherit;
  width: 100%; height: 100%;
}

/* Hover/press animate BRIGHTNESS + a tiny press-scale only, never a fill swap. */
.nk-ro:hover:not(.nk-ro--disabled) .nk-ro__circle { filter: brightness(1.08); }
.nk-ro:active:not(.nk-ro--disabled) .nk-ro__circle { transform: scale(.9); transition: transform .1s; }

/* Focus is an OUTLINE ring on the circle (never a colored shadow). */
.nk-ro__input:focus-visible ~ .nk-ro__circle {
  outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5);
}

/* Invalid: a WARM error ring on the unselected wells (color is never alone; the
   group also shows a "!" message). The selected circle keeps the cyan ring. */
.nk-rg--invalid .nk-ro__input:not(:checked) ~ .nk-ro__circle { border-color: var(--color-status-error); }

/* Disabled: inert but still clearly legible (never faded to invisible). */
.nk-ro--disabled .nk-ro__circle { filter: none; }
.nk-ro--disabled.nk-ro--off { opacity: .55; }   /* dim the empty well */
.nk-ro--disabled.nk-ro--on .nk-ro__circle::before { opacity: .5; }   /* but keep the chosen ring readable */

/* The text block beside the circle. */
.nk-ro__text { display: flex; flex-direction: column; gap: var(--space-0-5); min-width: 0; }
.nk-ro__label { font-size: var(--font-size-14); font-weight: var(--font-weight-medium);
  line-height: var(--font-line-height-20); color: var(--color-on-card); }
.nk-ro--sm .nk-ro__label { font-size: var(--font-size-12); line-height: var(--font-line-height-16); }
.nk-ro__desc { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); }
.nk-ro--disabled .nk-ro__label { color: var(--color-on-card-muted); }

/* ── CARD variant: the same circle, lifted into a selectable card ───────────── */
.nk-ro--card {
  align-items: flex-start; gap: var(--space-3);
  padding: var(--space-4); border-radius: var(--radius-card);
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: 0 var(--elevation-level1) var(--elevation-level3) -4px color-mix(in srgb, var(--color-shadow-tint) 45%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  flex: 1 1 0; min-width: 0;            /* equal width + height across the row */
  transition: border-color .16s, background-color .16s, transform .12s var(--motion-easing-standard), filter .12s;
}
.nk-ro--card:hover:not(.nk-ro--disabled) { filter: brightness(1.04); transform: translateY(-1px); }
.nk-ro--card:active:not(.nk-ro--disabled) { transform: translateY(0) scale(.99); }
/* A chosen card: cyan ring + faint accent-soft wash (a SHAPE, not a halo).
   The ring states a CHOICE, so it carries the SELECTION weight at 45%. The
   thicker floating weight is reserved for surfaces that sit ON TOP of content. */
/* The chosen card reads by OUTLINE only (LAW 6, reduce-fills): the selection-weight cyan
   ring plus the filled dot, with no wash behind it. */
.nk-ro--card:has(.nk-ro__input:checked) {
  border-width: var(--border-width-selection);
  border-color: color-mix(in srgb, var(--color-accent-primary) 45%, transparent);
}
.nk-ro--card:has(.nk-ro__input:focus-visible) {
  outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5);
}
.nk-ro--card .nk-ro__input:focus-visible ~ .nk-ro__circle { outline: none; }   /* the card owns the focus ring */
/* the dot's inner well matches the card it sits on; the chosen card no longer carries a
   wash, so the well is the plain card surface in both states */
.nk-ro--card:has(.nk-ro__input:checked) .nk-ro__circle::after { background: var(--color-card-surface1); }
.nk-ro--card.nk-ro--disabled { opacity: .55; }

/* ── The group error message: color + icon + text (never color alone) ───────── */
.nk-rg__err { display: inline-flex; align-items: center; gap: var(--space-1); margin-top: var(--space-3);
  font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-status-error); }
.nk-rg__err-mark { display: inline-grid; place-items: center; width: var(--space-4); height: var(--space-4);
  border-radius: var(--radius-pill); border: var(--space-px) solid currentColor;
  font-size: var(--font-size-10); font-weight: var(--font-weight-bold); line-height: 1; }

/* ── The group legend: the radiogroup's visible accessible name ─────────────── */
.nk-rg__legend { display: block; font-size: var(--font-size-12); font-weight: var(--font-weight-semibold);
  color: var(--color-on-card); margin: 0 0 var(--space-3); }
.nk-rg__req { color: var(--color-status-error); margin-left: var(--space-1); }

@media (prefers-reduced-motion: reduce) {
  .nk-ro__circle, .nk-ro__circle::before, .nk-ro__circle::after, .nk-ro--card { transition: none; }
}
`;

/**
 * A single Nockerl radio group: the unit the spec documents. ONE role=radiogroup
 * holds N role=radio options (a native radio input each, driving state + a11y).
 * The group is a SINGLE tab stop (roving tabindex): Tab enters the checked option
 * (or the first enabled one), Arrow keys move AND select the next/prev enabled
 * option, Space selects. The circle is a recessed well that gains a static cyan
 * ring + a dot that scales in. The whole label/card is the hit target.
 */
export const NockerlRadioGroup = forwardRef<HTMLDivElement, NockerlRadioGroupProps>(function NockerlRadioGroup({
  options,
  value,
  onChange,
  label,
  orientation = 'vertical',
  size = 'md',
  invalid = false,
  variant = 'list',
  className,
  ...rest
}, ref) {
  const gid = useId();
  const labelId = `${gid}-label`;
  const errId = `${gid}-err`;
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const enabledIdx = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const fallback = enabledIdx[0] ?? 0;

  // Roving tabindex: only one option is tabbable (the checked one, else the
  // first enabled option). Arrow keys move focus AND selection (radio semantics).
  const selIdx = options.findIndex((o) => o.value === value && !o.disabled);
  const tabbable = selIdx >= 0 ? selIdx : fallback;

  const move = (from: number, dir: 1 | -1) => {
    if (enabledIdx.length === 0) return;
    const pos = enabledIdx.indexOf(from);
    const seed = pos >= 0 ? pos : 0;
    const next = enabledIdx[(seed + dir + enabledIdx.length) % enabledIdx.length]!;
    refs.current[next]?.focus();
    onChange?.(options[next]!.value);
  };

  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      move(idx, 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      move(idx, -1);
    }
  };

  return (
    <div
      {...rest}
      ref={ref}
      className={className}
      role="radiogroup"
      aria-labelledby={labelId}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errId : undefined}
    >
      <span className="nk-rg__legend" id={labelId}>
        {label}
        {invalid && <span className="nk-rg__req" aria-hidden="true">*</span>}
      </span>

      <div
        className={[
          'nk-rg',
          orientation === 'horizontal' ? 'nk-rg--horizontal' : '',
          variant === 'card' ? 'nk-rg--cards' : '',
          invalid ? 'nk-rg--invalid' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {options.map((opt, i) => {
          const checked = opt.value === value;
          const cls = [
            'nk-ro',
            `nk-ro--${size}`,
            variant === 'card' ? 'nk-ro--card' : '',
            opt.disabled ? 'nk-ro--disabled' : '',
            opt.disabled ? (checked ? 'nk-ro--on' : 'nk-ro--off') : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <label className={cls} key={opt.value}>
              <span className="nk-ro__hit">
                <input
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  type="radio"
                  className="nk-ro__input"
                  name={gid}
                  value={opt.value}
                  checked={checked}
                  disabled={opt.disabled}
                  tabIndex={i === tabbable ? 0 : -1}
                  aria-checked={checked}
                  onChange={opt.disabled ? undefined : () => onChange?.(opt.value)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                />
                <span className="nk-ro__circle" aria-hidden="true" />
              </span>
              <span className="nk-ro__text">
                <span className="nk-ro__label">{opt.label}</span>
                {opt.description && <span className="nk-ro__desc">{opt.description}</span>}
              </span>
            </label>
          );
        })}
      </div>

      {invalid && (
        <span className="nk-rg__err" id={errId}>
          <span className="nk-rg__err-mark" aria-hidden="true">!</span>
          Select an option to continue
        </span>
      )}

      <style>{NOCKERL_RADIO_GROUP_STYLES}</style>
    </div>
  );
});

/** LEAF: the single-choice primitive; renders a role="radiogroup" wrapper whose options
 *  are native <input type="radio"> elements. It owns that raw radiogroup role + input.
 *  `options` is a data array (not a slot). */
export const compose = {
  tier: 'leaf',
  owns: ['input', 'role=radiogroup'],
} satisfies ComposeContract;

export default NockerlRadioGroup;
