/**
 * TextFieldDemo: the live, interactive Nockerl text field island for the web.
 *
 * Implements the input laws verbatim, the inverse of the button:
 *   • fields SINK: a recessed well (darker inset surface + INNER shadow), never
 *     a raised/lifted surface and never a colored glow
 *   • 12px control radius: a rounded rectangle, never a pill
 *   • persistent label above the well (never placeholder-as-label)
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow/glow
 *   • error = red border + helper text + a ⚠ icon (color is NEVER the only signal)
 *   • disabled stays visible (≥ 3:1) and clearly inert, never faded to invisible
 *
 * The field itself lives in the Field primitive (one home for the recipe); this
 * island only adds the demo chrome and dogfoods <NockerlTextField /> exactly as a
 * consumer would.
 */
import { useState } from 'react';
import { NockerlTextField, type ComposeContract } from '@dizyx/nockerl-react';

// Demo-only chrome: the island wrapper, the eyebrow labels, and the group
// spacing. The field recipe itself ships from the Field primitive.
const STYLES = `
.nk-field-demo { font-family: var(--font-family-sans); max-width: 420px; }
.nk-field-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-field-demo__group + .nk-field-demo__group { margin-top: var(--space-8); }
`;

/**
 * The interactive showcase mounted on the Text field page: a live well you can
 * type in (tab to it for the cyan focus ring), an email field that validates to
 * an error state as you type, plus filled / disabled / read-only examples. All are
 * recessed, none glowing.
 */
/** LEAF: the single-line text field; implemented in Field.tsx (which owns <input>). */
export const compose = { tier: 'leaf', owns: ['input'] } satisfies ComposeContract;

export default function TextFieldDemo() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('user@');

  // Live validation: the email turns to the error treatment until it looks valid.
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const emailError = email.length > 0 && !emailValid ? 'Enter a valid email address.' : undefined;

  return (
    <div className="nk-field-demo">
      <style>{STYLES}</style>

      <div className="nk-field-demo__group">
        <p className="nk-field-demo__lbl">Interactive: type, tab to focus</p>
        <NockerlTextField
          label="Session name"
          value={name}
          onChange={setName}
          placeholder="e.g. Refactor auth flow"
          helperText="Shown in the session list. Optional."
        />
        <NockerlTextField
          label="Notify email"
          type="email"
          leadingIcon="@"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          helperText="We send run summaries here."
          {...(emailError ? { errorText: emailError } : {})}
        />
      </div>

      <div className="nk-field-demo__group">
        <p className="nk-field-demo__lbl">States: rest, filled, disabled, read-only</p>
        <NockerlTextField label="Rest" value="" onChange={() => {}} placeholder="Empty, awaiting input" helperText="Helper text sits under the well." />
        <NockerlTextField label="Filled" value="Refactor auth flow" onChange={() => {}} />
        <NockerlTextField label="Disabled" value="Not editable right now" disabled helperText="Inert, but still readable." />
        <NockerlTextField label="Read-only" value="org-9f3a-2c11" readOnly helperText="Value you can select but not change." />
      </div>
    </div>
  );
}
