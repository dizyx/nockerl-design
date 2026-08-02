/**
 * Field - the Tier-1 input primitives. ONE home for the field CHROME (the persistent
 * label, the input/textarea, the help line + counter, the field RULE that is the inverse
 * of the button) - so a future field-rule change is ONE edit, not many. The recessed-well
 * recipe itself now lives in <NockerlWell> and is composed in by both NockerlTextField and NockerlTextArea;
 * the only divergence between the two wells is LAYOUT (NockerlWell's layout prop). Composes ONLY
 * tokens.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - fields SINK: a recessed well (darker inset surface + INNER shadow), never
 *     a raised/lifted surface and never a colored glow. (recipe: see NockerlWell)
 *   - 12px control radius - a rounded rectangle, never a pill.
 *   - persistent label above the well (never placeholder-as-label).
 *   - focus is an OUTLINE (focus-visible cyan ring), never a colored shadow/glow.
 *   - error = red border + helper text + a warn icon (color is NEVER the only signal).
 *   - disabled stays visible (>= 3:1), clearly inert - never faded to invisible.
 *
 * Each NockerlTextField/NockerlTextArea keeps its legacy well class (.nk-field__well / .nk-area__well)
 * on the <NockerlWell> element plus the state classes, so the DOM stays byte-identical and the
 * field-owned descendant rule (.nk-field__well.is-error .nk-field__icon--err) still
 * matches. The chrome recipe CSS is injected as the LAST child of the field/area (a
 * leading style node would trip a consumer's first-child / adjacent-sibling selectors);
 * NockerlWell emits the well recipe as a sibling right after the well. Identical injected blocks
 * dedupe in effect.
 */
import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { NockerlWell } from './Well';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract';

export type FieldState = 'rest' | 'error' | 'disabled' | 'readonly';

/** The field validation status. Feeds the well border + the help-line tone/icon. */
export type FieldStatus = 'error' | 'warning' | 'success';

/**
 * NockerlTextField extends the native input attributes (minus the ones it redefines) + forwards
 * a ref to the underlying <input>, so it works in a real form: `name`, `onBlur`,
 * `required`, and aria-* / data-* pass straight through to the <input> (convention §7),
 * and a form library can register/focus it via the ref. `value` is narrowed to `string`
 * and `type` is its own string, so both are Omitted; the value-change callback is the
 * unified `onChange` (value-first `(value) => void`). The native DOM `onChange` is also
 * Omitted so the custom value-first handler doesn't collide with it.
 */
export interface NockerlTextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'type' | 'onChange'> {
  /** Persistent label, bound to the field via htmlFor / id. Never a placeholder. */
  label: string;
  /** Current value (controlled). */
  value: string;
  /** Change handler. Ignored while disabled or read-only. */
  onChange?: (value: string) => void;
  /** Ghost prompt INSIDE the well. It is supplementary, never the label. */
  placeholder?: string;
  /** Helper text under the well. Replaced by errorText / statusText when set. */
  helperText?: string;
  /** When set, the field renders its error treatment (red border + this message). */
  errorText?: string;
  /**
   * The validation ladder: warning / success (or error) border + a matching,
   * icon-carrying help line showing `statusText`. `errorText` still wins if both
   * are set (back-compat). Color is never the only signal (a glyph always rides along).
   */
  status?: FieldStatus;
  /** The message shown for `status` (ignored when `errorText` is set). */
  statusText?: string;
  /** Marks the field required: renders the status-colored `*` after the label. */
  required?: boolean;
  /**
   * Optional max length: adds a footer row with a right-aligned character counter
   * (help on the left, "{len} / {max}" on the right); over the cap = error treatment.
   */
  maxLength?: number;
  /** Inert + clearly-seen (never invisible). */
  disabled?: boolean;
  /** Value shown, selectable, not editable. */
  readOnly?: boolean;
  /** Optional leading glyph rendered inside the well, before the text. */
  leadingIcon?: string;
  /** input type (text, email, password, …). */
  type?: string;
}

/**
 * NockerlTextArea extends the native textarea attributes (minus the `value` it narrows to
 * `string`) + forwards a ref to the underlying <textarea>, merged with the internal
 * auto-grow measurement ref so BOTH run. `name`, `onBlur`, `required`, and aria-* /
 * data-* pass straight through to the <textarea> (convention §7); the value-change
 * callback is the unified `onChange` (value-first `(value) => void`). The native DOM
 * `onChange` is also Omitted so the custom value-first handler doesn't collide with it.
 */
export interface NockerlTextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  /** Persistent label, bound to the field via htmlFor / id. Never a placeholder. */
  label: string;
  /** Current value (controlled). */
  value: string;
  /** Change handler. Ignored while disabled or read-only. */
  onChange?: (value: string) => void;
  /** Ghost prompt INSIDE the well. It is supplementary, never the label. */
  placeholder?: string;
  /** Helper text under the well. Replaced by errorText / statusText when set. */
  helperText?: string;
  /** When set, the area renders its error treatment (red border + this message). */
  errorText?: string;
  /**
   * The validation ladder: warning / success (or error) border + a matching,
   * icon-carrying help line showing `statusText`. `errorText` (and an over-cap
   * counter) still win if set. Color is never the only signal. A glyph rides along.
   */
  status?: FieldStatus;
  /** The message shown for `status` (ignored when `errorText` / over-cap wins). */
  statusText?: string;
  /** Marks the field required: renders the status-colored `*` after the label. */
  required?: boolean;
  /** Inert + clearly-seen (never invisible). */
  disabled?: boolean;
  /** Value shown, selectable, not editable. */
  readOnly?: boolean;
  /** Optional max length; drives the character counter + over-cap error. */
  maxLength?: number;
  /** Rows the field starts at before it auto-grows. */
  minRows?: number;
  /** Rows it grows to before it starts scrolling instead. */
  maxRows?: number;
}

// The recessed WELL recipe itself (fill / border / radius / inner shadow / focus
// OUTLINE / state ladder) now lives in <NockerlWell>; this block keeps only the field
// CHROME around it: the column layout, the label, the input, the icons, the help line.
// The one cross-cut rule below (.nk-field__well.is-error .nk-field__icon--err) stays
// here because the err icon is a field-owned descendant of the well; the well keeps its
// .nk-field__well class (passed through NockerlWell) so this selector still matches.
export const NOCKERL_TEXT_FIELD_STYLES = `
.nk-field { display: flex; flex-direction: column; gap: var(--space-1); }
/* :where() → zero specificity, so a horizontal-row / grid container overrides this stack
   rhythm with a plain class (space via gap). Otherwise it leaks into a row. */
:where(.nk-field + .nk-field) { margin-top: var(--space-5); }
.nk-field__label { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-card); line-height: var(--font-line-height-20); }
.nk-field__req { color: var(--color-status-error); margin-left: var(--space-0-5); }
.nk-field__input {
  flex: 1 1 auto; min-width: 0;
  background: transparent; border: 0; outline: none;
  color: var(--color-on-card); font: inherit; font-size: var(--font-size-14); line-height: var(--font-line-height-20);
  padding: var(--space-3) 0;
}
.nk-field__input::placeholder { color: color-mix(in srgb, var(--color-on-card-muted) 70%, transparent); }
.nk-field__input:disabled { color: var(--color-on-card-muted); cursor: not-allowed; -webkit-text-fill-color: var(--color-on-card-muted); }
.nk-field__icon { color: var(--color-on-card-muted); font-size: var(--font-size-14); display: inline-flex; flex: 0 0 auto; }
.nk-field__well.is-error .nk-field__icon--err { color: var(--color-status-error); }
/* the trailing in-well status glyph tints to the active status (warning / success). */
.nk-field__well.is-warning .nk-field__icon--status { color: var(--color-status-warning); }
.nk-field__well.is-success .nk-field__icon--status { color: var(--color-status-success); }
.nk-field__help { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); min-height: var(--font-line-height-16); }
.nk-field__help.is-error { color: var(--color-status-error); display: flex; align-items: center; gap: var(--space-1); }
/* the help line tone for the warning / success rungs of the ladder (icon + text). */
.nk-field__help.is-warning { color: var(--color-status-warning); display: flex; align-items: center; gap: var(--space-1); }
.nk-field__help.is-success { color: var(--color-status-success); display: flex; align-items: center; gap: var(--space-1); }
/* the NockerlTextField footer row (added ONLY when maxLength is set): help left, counter right. */
.nk-field__footer { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); min-height: var(--font-line-height-16); }
.nk-field__footer .nk-field__help { min-height: 0; margin: 0; }
.nk-field__count { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); flex: 0 0 auto; font-variant-numeric: tabular-nums; }
.nk-field__count.is-error { color: var(--color-status-error); font-weight: var(--font-weight-semibold); }
`;

// The recessed WELL recipe (fill / border / radius / inner shadow / focus OUTLINE /
// state ladder) now lives in <NockerlWell>; this block keeps only the area CHROME: the column
// layout, the label, the textarea, and the footer row (help + counter). The area's well
// keeps its .nk-area__well class (passed through NockerlWell) so the DOM stays byte-identical.
export const NOCKERL_TEXT_AREA_STYLES = `
.nk-area { display: flex; flex-direction: column; gap: var(--space-1); }
/* :where() → zero specificity, so a horizontal-row / grid container overrides this stack
   rhythm with a plain class (space via gap). Otherwise it leaks into a row. */
:where(.nk-area + .nk-area) { margin-top: var(--space-6); }
.nk-area__label { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-card); line-height: var(--font-line-height-20); }
.nk-area__req { color: var(--color-status-error); margin-left: var(--space-0-5); }
.nk-area__input {
  display: block; width: 100%; box-sizing: border-box;
  background: transparent; border: 0; outline: none; resize: none;
  color: var(--color-on-card); font: inherit; font-size: var(--font-size-14); line-height: var(--font-line-height-20);
  overflow-y: auto;
}
.nk-area__input::placeholder { color: color-mix(in srgb, var(--color-on-card-muted) 70%, transparent); }
.nk-area__input:disabled { color: var(--color-on-card-muted); cursor: not-allowed; -webkit-text-fill-color: var(--color-on-card-muted); }
/* the footer row: helper / error on the left, counter on the right. */
.nk-area__footer { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); min-height: var(--font-line-height-16); }
.nk-area__help { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); margin: 0; }
.nk-area__help.is-error { color: var(--color-status-error); display: flex; align-items: center; gap: var(--space-1); }
/* the help line tone for the warning / success rungs of the ladder (icon + text). */
.nk-area__help.is-warning { color: var(--color-status-warning); display: flex; align-items: center; gap: var(--space-1); }
.nk-area__help.is-success { color: var(--color-status-success); display: flex; align-items: center; gap: var(--space-1); }
.nk-area__count { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); flex: 0 0 auto; font-variant-numeric: tabular-nums; }
.nk-area__count.is-error { color: var(--color-status-error); font-weight: var(--font-weight-semibold); }
`;

/** A single Nockerl text field, the unit the spec documents. */
export const NockerlTextField = forwardRef<HTMLInputElement, NockerlTextFieldProps>(function NockerlTextField({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  errorText,
  status,
  statusText,
  required = false,
  maxLength,
  disabled = false,
  readOnly = false,
  leadingIcon,
  type = 'text',
  className,
  style,
  onFocus,
  onBlur,
  ...rest
}, ref) {
  const id = useId();
  const helpId = `${id}-help`;
  const [focused, setFocused] = useState(false);
  const inert = disabled || readOnly;

  // Validation ladder precedence: errorText / over-cap force 'error'; otherwise the
  // caller's `status` (warning / success) drives the treatment. Color is never the only
  // signal. Every rung pairs the well border with an icon-carrying help line.
  const overCap = maxLength != null && value.length > maxLength;
  const effectiveStatus: FieldStatus | undefined = errorText || overCap ? 'error' : status;
  const invalid = effectiveStatus === 'error';

  let message: string | undefined;
  if (errorText) message = errorText;
  else if (overCap) message = `${value.length - maxLength!} characters over the limit.`;
  else if (effectiveStatus && statusText) message = statusText;
  else message = helperText;

  const glyph = effectiveStatus === 'success' ? '✓' : '⚠';
  const help = message ? (
    <p
      id={helpId}
      className={`nk-field__help${effectiveStatus ? ` is-${effectiveStatus}` : ''}`}
      role={invalid ? 'alert' : undefined}
    >
      {effectiveStatus && <span aria-hidden="true">{glyph}</span>}
      {message}
    </p>
  ) : null;

  return (
    <div className={['nk-field', className].filter(Boolean).join(' ')} style={style}>
      <label className="nk-field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="nk-field__req" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <NockerlWell
        layout="field"
        className={[
          'nk-field__well',
          focused && !inert ? 'is-focus' : '',
          effectiveStatus ? `is-${effectiveStatus}` : '',
          disabled ? 'is-disabled' : '',
          readOnly ? 'is-readonly' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {leadingIcon && (
          <span className="nk-field__icon" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          {...rest}
          ref={ref}
          id={id}
          type={type}
          className="nk-field__input"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={message ? helpId : undefined}
          onChange={inert ? undefined : (e) => onChange?.(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {effectiveStatus && (
          <span
            className={`nk-field__icon ${effectiveStatus === 'error' ? 'nk-field__icon--err' : 'nk-field__icon--status'}`}
            aria-hidden="true"
          >
            {glyph}
          </span>
        )}
      </NockerlWell>
      {maxLength != null ? (
        <div className="nk-field__footer">
          {help ?? <span />}
          <span className={`nk-field__count${overCap ? ' is-error' : ''}`} aria-hidden="true">
            {value.length} / {maxLength}
          </span>
        </div>
      ) : (
        help
      )}
      <style>{NOCKERL_TEXT_FIELD_STYLES}</style>
    </div>
  );
});

/** A single Nockerl text area, the multi-line unit the spec documents. */
export const NockerlTextArea = forwardRef<HTMLTextAreaElement, NockerlTextAreaProps>(function NockerlTextArea({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  errorText,
  status,
  statusText,
  required = false,
  disabled = false,
  readOnly = false,
  maxLength,
  minRows = 3,
  maxRows = 8,
  className,
  style,
  onFocus,
  onBlur,
  ...rest
}, ref) {
  const id = useId();
  const helpId = `${id}-help`;
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  // Validation ladder precedence: errorText / over-cap force 'error'; otherwise the
  // caller's `status` (warning / success) drives the treatment. Color is never the only
  // signal. Every rung pairs the well border with an icon-carrying help line.
  const overCap = maxLength != null && value.length > maxLength;
  const effectiveStatus: FieldStatus | undefined = errorText || overCap ? 'error' : status;
  const invalid = effectiveStatus === 'error';
  const inert = disabled || readOnly;

  let message: string | undefined;
  if (errorText) message = errorText;
  else if (overCap) message = `${value.length - maxLength!} characters over the limit.`;
  else if (effectiveStatus && statusText) message = statusText;
  else message = helperText;

  const glyph = effectiveStatus === 'success' ? '✓' : '⚠';

  // Auto-grow: clamp the rendered height between minRows and maxRows, then let it
  // scroll. Re-measured on every value change (a transform-free layout property).
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const line = 20; // matches line-height above
    const pad = 0;
    el.style.height = 'auto';
    const min = minRows * line + pad;
    const max = maxRows * line + pad;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, min), max)}px`;
  }, [value, minRows, maxRows]);

  return (
    <div className={['nk-area', className].filter(Boolean).join(' ')} style={style}>
      <label className="nk-area__label" htmlFor={id}>
        {label}
        {required && (
          <span className="nk-area__req" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <NockerlWell
        layout="area"
        className={[
          'nk-area__well',
          focused && !inert ? 'is-focus' : '',
          effectiveStatus ? `is-${effectiveStatus}` : '',
          disabled ? 'is-disabled' : '',
          readOnly ? 'is-readonly' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <textarea
          {...rest}
          id={id}
          ref={(el) => {
            // Merge the internal auto-grow ref with the forwarded ref so BOTH run:
            // the height measurement keeps its element, and form libraries get it too.
            innerRef.current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) ref.current = el;
          }}
          className="nk-area__input"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required || undefined}
          rows={minRows}
          aria-invalid={invalid || undefined}
          aria-describedby={message ? helpId : undefined}
          onChange={inert ? undefined : (e) => onChange?.(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
      </NockerlWell>
      <div className="nk-area__footer">
        {message ? (
          <p
            id={helpId}
            className={`nk-area__help${effectiveStatus ? ` is-${effectiveStatus}` : ''}`}
            role={invalid ? 'alert' : undefined}
          >
            {effectiveStatus && <span aria-hidden="true">{glyph}</span>}
            {message}
          </p>
        ) : (
          <span />
        )}
        {maxLength != null && (
          <span className={`nk-area__count${overCap ? ' is-error' : ''}`} aria-hidden="true">
            {value.length} / {maxLength}
          </span>
        )}
      </div>
      <style>{NOCKERL_TEXT_AREA_STYLES}</style>
    </div>
  );
});

/** LEAF: the text-field primitive (NockerlTextField + NockerlTextArea); owns its raw <input>/<textarea>
 *  (it IS that primitive) and composes NockerlWell for the recessed chrome. leadingIcon is a glyph
 *  string, not a component slot; there is no child-component slot prop. */
export const compose = { tier: 'leaf', owns: ['input', 'textarea'] } satisfies ComposeContract;

export default NockerlTextField;
