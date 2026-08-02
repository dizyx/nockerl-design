/**
 * OtpInputDemo: the live, interactive Nockerl one-time-passcode / verification-code
 * input island for the web. The SEGMENTED CODE ENTRY: a row of single-character cells
 * with auto-advance, paste-to-fill, backspace-to-previous. It is distinct from the text
 * field (one continuous well) while sharing its vocabulary:
 *   • each CELL is the recessed WELL reused from TextFieldDemo (fields sink: darker
 *     inset surface + INNER shadow + 1px top catch-light, never lifted, never a glow),
 *     at the 12px control radius;
 *   • only the ACTIVE cell wears the cyan focus OUTLINE ring (the text field's focus);
 *   • a filled digit is strong --color-on-card text in the MONO token (a code reads as
 *     code), centered;
 *   • validation reuses the FieldValidation vocabulary: error = danger token (red
 *     border + ⚠ + alert text), success = success token (green + ✓). Status is WARM,
 *     never the brand cyan; never color alone (border + glyph + text), per law 11.
 *
 * Sourced honestly. NEITHER app ships a formal OTP input: Android's closest is
 * LoginScreen's OutlinedTextField with imeAction = Next + focusManager.moveFocus (the
 * auto-advance idiom), NockerlControlShape, error caption in colorScheme.error;
 * Voice ships no verification/pairing UI. So the segmented layout is designed
 * ORIGINALLY here from the field + validation vocabulary + the laws (see page drift).
 *
 * TOKEN-REACTIVE: every color/font/radius/spacing/type size is a var(--token) (see
 * docs/demo-token-contract.md); literals remain only for pure geometry (caret/icon
 * box, shake offsets, transition curves). Self-contained scoped CSS (ButtonDemo /
 * TextFieldDemo pattern), keyboard-operable, honors prefers-reduced-motion, < 500
 * lines, default-exports the showcase.
 */
import { useId, useRef, useState } from 'react';
import { NockerlIcon, type ComposeContract } from '@dizyx/nockerl-react';

/** The validation status drives the cell border, the trailing glyph, and the message. */
export type OtpStatus = 'idle' | 'validating' | 'error' | 'success';

export interface OtpInputProps {
  /** Number of single-character cells (e.g. 4 or 6). */
  length?: number;
  /** Current code (controlled). Shorter than `length` = partially filled. */
  value: string;
  /** Change handler. Fires on every keystroke / paste with the full string so far. */
  onChange?: (value: string) => void;
  /** Fires once the last cell is filled (the code is complete). */
  onComplete?: (value: string) => void;
  /** Accessible name for the whole group (e.g. "Verification code"). */
  groupLabel: string;
  /** Validation status. `error`/`success` recolor the cells + show the message. */
  status?: OtpStatus;
  /** The single message under the row (error / success / helper copy). */
  message?: string;
  /** Insert a separator after this many cells (e.g. 3 → a 3·3 grouped layout). */
  groupAfter?: number;
  /** Mask each filled cell as a dot (a password-style code). */
  mask?: boolean;
  /** Restrict input to digits (sets inputMode numeric + strips non-digits). */
  numeric?: boolean;
  /** Inert + clearly-seen (never invisible). */
  disabled?: boolean;
}

// Each CELL is the recessed text-field well (fields sink). Only the active cell gets
// the cyan focus ring; error/success recolor the BORDER + glyph only, never a glow.
// The caret + auto-advance + shake animate interpolatable props only and freeze under
// reduced motion. Every visual value is a token; literals are geometry only.
const STYLES = `
.nk-otp-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }
/* ── one validated code entry: label → cell row → message ───────────────────── */
.nk-otp { display: flex; flex-direction: column; gap: var(--space-2); }
.nk-otp + .nk-otp { margin-top: var(--space-6); }
.nk-otp__label { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-card); line-height: var(--font-line-height-20); }
/* the row of cells: evenly spaced, with optional group separator. */
.nk-otp__row { display: flex; align-items: center; gap: var(--space-2); }
.nk-otp__sep { width: var(--space-3); height: var(--space-px); background: var(--color-divider); flex: 0 0 auto; border-radius: var(--radius-pill); }
/* the CELL = the recessed WELL from the text field: darker, INNER shadow so it sinks, 1px top catch-light (lit-from-above, NOT a glow). */
.nk-otp__cell {
  position: relative;
  width: var(--space-12); height: calc(var(--space-12) + var(--space-2));   /* 48 x 56, clears the 24px target law with room to spare */
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-canvas-alt);
  border: var(--space-px) solid var(--color-outline-subtle);
  border-radius: var(--radius-control);
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight);
  transition: border-color .14s, box-shadow .14s, background-color .14s;
}
.nk-otp__cell:hover:not(.is-active):not(.is-disabled) { border-color: color-mix(in srgb, var(--color-outline-subtle) 80%, var(--color-on-card)); }
/* a filled cell firms its border so the progress is legible without color. */
.nk-otp__cell.is-filled { border-color: color-mix(in srgb, var(--color-on-card) 28%, var(--color-outline-subtle)); }
/* the ACTIVE cell wears the cyan focus ring (hugs the radius); still inset-shadowed, never lifts.
   ONLY one at a time. The cell is the chosen slot, so its EDGE softens; the ring does not. */
.nk-otp__cell.is-active {
  border-width: var(--border-width-selection); border-color: color-mix(in srgb, var(--color-accent-primary) 45%, transparent);
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), 0 0 0 var(--space-0-5) color-mix(in srgb, var(--color-accent-primary) 45%, transparent);
  z-index: 1;
}
/* error / success: recolor the BORDER (never a glow). The active ring tints too. */
.nk-otp__cell.is-error { border-color: var(--color-status-error); }
.nk-otp__cell.is-error.is-active { box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), 0 0 0 var(--space-0-5) color-mix(in srgb, var(--color-status-error) 42%, transparent); }
.nk-otp__cell.is-success { border-color: var(--color-status-success); }
.nk-otp__cell.is-success.is-active { box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), 0 0 0 var(--space-0-5) color-mix(in srgb, var(--color-status-success) 42%, transparent); }
/* disabled: still visible (>=3:1), clearly inert (flatter well, no editable ring). */
.nk-otp__cell.is-disabled { background: var(--color-canvas); border-color: var(--color-canvas-edge); border-style: dashed; box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent); }
/* the real input fills the cell: transparent, centered, MONO; the visible glyph is drawn over it (so we can mask + show a caret). */
.nk-otp__input {
  position: absolute; inset: 0; width: 100%; height: 100%;
  background: transparent; border: 0; outline: none; text-align: center;
  color: transparent; caret-color: transparent;            /* glyph + caret are drawn below */
  font-family: var(--font-family-mono); font-size: var(--font-size-20);
  -webkit-text-fill-color: transparent;
}
.nk-otp__input:disabled { cursor: not-allowed; }
.nk-otp__cell:not(.is-disabled) { cursor: text; }
/* the rendered digit (or mask dot): strong on-card text, mono, centered. */
.nk-otp__glyph {
  font-family: var(--font-family-mono); font-size: var(--font-size-20); line-height: 1;
  font-weight: var(--font-weight-semibold); color: var(--color-on-card);
  pointer-events: none; user-select: none;
}
.nk-otp__cell.is-disabled .nk-otp__glyph { color: var(--color-on-card-muted); }
.nk-otp__cell.is-error .nk-otp__glyph { color: var(--color-status-error); }
.nk-otp__cell.is-success .nk-otp__glyph { color: var(--color-status-success); }
/* the mask dot is a drawn shape, not a character, so it can't be selected/copied. */
.nk-otp__dot { width: var(--space-3); height: var(--space-3); border-radius: var(--radius-pill); background: currentColor; color: var(--color-on-card); }
.nk-otp__cell.is-disabled .nk-otp__dot { color: var(--color-on-card-muted); }
/* the caret is a thin cyan bar that blinks ONLY in the active, empty cell. */
.nk-otp__caret { width: var(--space-0-5); height: var(--font-size-24); border-radius: var(--radius-pill); background: var(--color-accent-primary); pointer-events: none; animation: nk-otp-blink 1.06s steps(2, start) infinite; }
@keyframes nk-otp-blink { 50% { opacity: 0; } }
/* ── the validation message (the FieldValidation vocabulary) ─────────────────── */
.nk-otp__msg {
  display: flex; align-items: center; gap: var(--space-1); margin: 0;
  font-size: var(--font-size-12); line-height: var(--font-line-height-16);
  color: var(--color-on-card-muted); min-height: var(--font-line-height-16);
}
.nk-otp__msg-ico { flex: 0 0 auto; display: inline-flex; }
.nk-otp__msg-ico svg { display: block; width: 14px; height: 14px; }
.nk-otp__msg--error { color: var(--color-status-error); }
.nk-otp__msg--success { color: var(--color-status-success); }
.nk-otp__msg--validating { color: var(--color-on-card-muted); }
/* a tiny spinner for the validating state: interpolatable rotation, holds layout. */
.nk-otp__spin { width: 12px; height: 12px; border-radius: var(--radius-pill); border: var(--space-0-5) solid currentColor; border-top-color: transparent; display: inline-block; animation: nk-otp-sp .7s linear infinite; }
@keyframes nk-otp-sp { to { transform: rotate(360deg); } }
/* error SHAKE: animates transform only (interpolatable), frozen under reduced motion. */
.nk-otp__row.is-shake { animation: nk-otp-shake .42s cubic-bezier(.36,.07,.19,.97); }
@keyframes nk-otp-shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-4px); }
  40%, 60% { transform: translateX(4px); }
}
@media (prefers-reduced-motion: reduce) {
  .nk-otp__cell { transition: none; }
  .nk-otp__caret { animation: none; }
  .nk-otp__row.is-shake { animation: none; }
  .nk-otp__spin { animation-duration: 1.4s; }
}
/* ── showcase scaffolding (matches ButtonDemo / TextFieldDemo) ───────────────── */
.nk-otp-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-otp-demo__group + .nk-otp-demo__group { margin-top: var(--space-8); }
.nk-otp-demo__count { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-6); }
.nk-otp-demo__count b { color: var(--color-accent-primary); }
`;

/**
 * A single Nockerl OTP input: the SEGMENTED code entry. N recessed cells, one real
 * `<input maxLength={1}>` each so the full keyboard model works: typing auto-advances;
 * Backspace clears the current cell then steps to + clears the previous; Arrow/Home/End
 * move; pasting a full code fills every cell. Only the active cell wears the cyan ring.
 * Each cell has an aria-label, the group has a label, inputMode is numeric, aria-invalid
 * is set on error, and the message is a live region.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  groupLabel,
  status = 'idle',
  message,
  groupAfter,
  mask = false,
  numeric = true,
  disabled = false,
}: OtpInputProps) {
  const baseId = useId();
  const msgId = `${baseId}-msg`;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);

  const chars = value.split('').slice(0, length);
  const invalid = status === 'error';
  const sanitize = (s: string) => (numeric ? s.replace(/\D/g, '') : s);

  const focusCell = (i: number) => {
    const next = Math.max(0, Math.min(length - 1, i));
    refs.current[next]?.focus();
    refs.current[next]?.select();
  };

  // The code is kept CONTIGUOUS (no interior gaps), the standard OTP invariant, so
  // the compact `value` string always maps 1:1 to leading cells. Edits clamp the
  // write index to the current fill length so you can't strand a hole mid-row.
  const commit = (next: string) => {
    const trimmed = next.slice(0, length);
    onChange?.(trimmed);
    if (trimmed.length === length) onComplete?.(trimmed);
  };

  const handleChange = (i: number, raw: string) => {
    if (disabled) return;
    const clean = sanitize(raw);
    if (!clean) return; // deletion is handled in keydown so focus can step back
    const arr = chars.slice();
    // clamp to the first empty cell so typing can't leave an interior gap
    const at = Math.min(i, arr.length);
    const incoming = clean.split('');
    for (let k = 0; k < incoming.length && at + k < length; k++) arr[at + k] = incoming[k]!;
    commit(arr.join(''));
    focusCell(at + incoming.length); // auto-advance
  };

  // Clear a cell and keep the code contiguous (removing a digit pulls the tail left).
  const clearAt = (idx: number) => {
    const arr = chars.slice();
    if (idx < arr.length) arr.splice(idx, 1);
    commit(arr.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    switch (e.key) {
      case 'Backspace':
        e.preventDefault();
        if (chars[i]) {
          clearAt(i); // clear the current cell in place
        } else if (i > 0) {
          clearAt(i - 1);
          focusCell(i - 1); // backspace-to-previous, clearing it
        }
        break;
      case 'Delete':
        e.preventDefault();
        clearAt(i);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        focusCell(i - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        focusCell(i + 1);
        break;
      case 'Home':
        e.preventDefault();
        focusCell(0);
        break;
      case 'End':
        e.preventDefault();
        focusCell(length - 1);
        break;
      default:
        // overwrite-on-type: if the cell is already filled, replace it (don't append)
        if (e.key.length === 1 && chars[i] && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          if (numeric && /\D/.test(e.key)) break;
          const arr = chars.slice();
          arr[i] = e.key;
          commit(arr.join(''));
          focusCell(i + 1);
        }
    }
  };

  // PASTE a full code anywhere → fill all cells from the start.
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const pasted = sanitize(e.clipboardData.getData('text')).slice(0, length);
    if (!pasted) return;
    commit(pasted);
    focusCell(Math.min(pasted.length, length - 1));
  };

  const cellStatusClass = (filled: boolean) =>
    [
      'nk-otp__cell',
      filled ? 'is-filled' : '',
      status === 'error' ? 'is-error' : '',
      status === 'success' ? 'is-success' : '',
      disabled ? 'is-disabled' : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div className="nk-otp">
      <span className="nk-otp__label" id={`${baseId}-label`}>
        {groupLabel}
      </span>

      <div
        className={`nk-otp__row${status === 'error' ? ' is-shake' : ''}`}
        role="group"
        aria-labelledby={`${baseId}-label`}
        aria-describedby={message ? msgId : undefined}
      >
        {Array.from({ length }).map((_, i) => {
          const ch = chars[i] ?? '';
          const filled = ch !== '';
          const isActive = active === i && !disabled;
          const showCaret = isActive && !filled;
          return (
            <span key={i} style={{ display: 'contents' }}>
              <span className={`${cellStatusClass(filled)}${isActive ? ' is-active' : ''}`}>
                {/* the rendered glyph / mask dot / caret sits over the transparent input */}
                {filled ? (
                  mask ? (
                    <span className="nk-otp__dot" aria-hidden="true" />
                  ) : (
                    <span className="nk-otp__glyph" aria-hidden="true">
                      {ch}
                    </span>
                  )
                ) : showCaret ? (
                  <span className="nk-otp__caret" aria-hidden="true" />
                ) : null}
                <input
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  className="nk-otp__input"
                  type={mask ? 'password' : 'text'}
                  inputMode={numeric ? 'numeric' : 'text'}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  pattern={numeric ? '[0-9]*' : undefined}
                  maxLength={1}
                  value={ch}
                  disabled={disabled}
                  aria-label={`${groupLabel}, digit ${i + 1} of ${length}`}
                  aria-invalid={invalid || undefined}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
              </span>
              {groupAfter != null && i === groupAfter - 1 && i < length - 1 && (
                <span className="nk-otp__sep" aria-hidden="true" />
              )}
            </span>
          );
        })}
      </div>

      {message && (
        <p
          id={msgId}
          className={`nk-otp__msg${status !== 'idle' ? ` nk-otp__msg--${status}` : ''}`}
          role={invalid ? 'alert' : 'status'}
          aria-live={invalid ? 'assertive' : 'polite'}
        >
          {status === 'validating' && <span className="nk-otp__spin" aria-hidden="true" />}
          {status === 'error' && (
            <span className="nk-otp__msg-ico" aria-hidden="true">
              <NockerlIcon>
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </NockerlIcon>
            </span>
          )}
          {status === 'success' && (
            <span className="nk-otp__msg-ico" aria-hidden="true">
              <NockerlIcon>
                <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
                <path d="m22 4-10 10.01-3-3" />
              </NockerlIcon>
            </span>
          )}
          {message}
        </p>
      )}
    </div>
  );
}

// The one valid code the live demo checks against (demo-only; real verification is
// server-side). Type or paste 6 digits; "424242" succeeds, anything else errors.
const VALID_CODE = '424242';

/**
 * The interactive showcase: a LIVE 6-cell input (auto-advance, backspace-to-previous,
 * paste-to-fill, validates to success on "424242" / error otherwise), plus the static
 * state + variant gallery: partial, error (shake + message), success (green + check),
 * disabled, a 4-cell length, a grouped 3·3 layout, and a masked code.
 */
// LEAF (describes the OtpInput), owns ['input']: the segmented code entry IS the one-time-code
// field, so its per-cell raw <input maxLength=1> is its irreducible primitive identity (there is
// no lower primitive to compose). Composes NockerlIcon for the validation glyphs; all props are
// config/data, so there are no component slots.
export const compose = { tier: 'leaf', owns: ['input'] } satisfies ComposeContract;

export default function OtpInputDemo() {
  const [code, setCode] = useState('');
  const [live, setLive] = useState<OtpStatus>('idle');
  const [attempts, setAttempts] = useState(0);

  const verify = (entered: string) => {
    setAttempts((c) => c + 1);
    // brief "validating" tick, then resolve. Interpolatable, reduced-motion-safe.
    setLive('validating');
    window.setTimeout(() => setLive(entered === VALID_CODE ? 'success' : 'error'), 650);
  };

  const liveMessage =
    live === 'validating'
      ? 'Checking your code…'
      : live === 'success'
        ? 'Verified. You are signed in.'
        : live === 'error'
          ? 'That code is incorrect. Try 424242.'
          : 'Enter the 6-digit code we sent you.';

  return (
    <div className="nk-otp-demo">
      <style>{STYLES}</style>

      <div className="nk-otp-demo__group">
        <p className="nk-otp-demo__lbl">Live: type, paste, or tab in (try 424242)</p>
        <OtpInput
          groupLabel="Verification code"
          length={6}
          value={code}
          onChange={(v) => {
            setCode(v);
            if (live !== 'idle') setLive('idle'); // reset status while editing
          }}
          onComplete={verify}
          status={live}
          message={liveMessage}
        />
      </div>

      <div className="nk-otp-demo__group">
        <p className="nk-otp-demo__lbl">States: partial, error, success</p>
        <OtpInput
          groupLabel="Partially filled code"
          length={6}
          value="042"
          message="Keep going, 3 digits left."
        />
        <OtpInput
          groupLabel="Wrong code"
          length={6}
          value="424243"
          status="error"
          message="That code is incorrect."
        />
        <OtpInput
          groupLabel="Verified code"
          length={6}
          value="424242"
          status="success"
          message="Verified."
        />
      </div>

      <div className="nk-otp-demo__group">
        <p className="nk-otp-demo__lbl">Lengths &amp; variants: 4-cell, grouped 3·3, masked, disabled</p>
        <OtpInput
          groupLabel="Four-digit PIN"
          length={4}
          value="07"
          message="A shorter 4-cell code."
        />
        <OtpInput
          groupLabel="Grouped code"
          length={6}
          value="318"
          groupAfter={3}
          message="A separator splits the code 3·3 for readability."
        />
        <OtpInput
          groupLabel="Masked passcode"
          length={6}
          value="4242"
          mask
          message="Each filled cell shows a dot, not the digit."
        />
        <OtpInput
          groupLabel="Disabled code"
          length={6}
          value="42"
          disabled
          message="Inert, but still readable."
        />
      </div>

      <p className="nk-otp-demo__count">
        Live code: <b>{code || '______'}</b> · verify attempts <b>{attempts}</b> ·{' '}
        {live === 'success' ? 'verified' : live === 'error' ? 'rejected' : 'awaiting input'}. The island is live.
      </p>
    </div>
  );
}
