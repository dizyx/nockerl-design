/**
 * FieldValidationDemo: the live, interactive Nockerl FIELD-LEVEL validation island
 * for the web.
 *
 * This is NOT the text field and NOT an app-level banner/callout. It documents the
 * VALIDATION MESSAGING LAYER that sits WITH a form field: the helper / error /
 * warning / success line + its status icon, the required indicator, the character
 * counter, and the invalid/valid field treatment that the message drives. The
 * recessed-well field look is reused verbatim from TextFieldDemo / TextAreaDemo.
 * The message is the unit on show here, the field is just its host.
 *
 * Implements the design laws verbatim:
 *   • status is WARM, never the brand cyan: error = --color-status-error, warning =
 *     --color-status-warning, success = --color-status-success, helper = the muted
 *     on-card token. Cyan stays the focus/selection signal only.
 *   • NEVER color alone: every state carries a glyph + text + (for invalid/valid) a
 *     field border, so the meaning survives without color (design-law 11).
 *   • fields SINK: the host well is a recessed inset surface; the valid/invalid state
 *     only recolors the BORDER + the message; it never adds a glow or colored shadow.
 *   • focus is a cyan OUTLINE ring (box-shadow ring that hugs the radius), never a glow.
 *   • the message APPEARS by interpolatable props only (opacity + a tiny translate);
 *     the border color cross-fades. No fill/gradient is ever tweened.
 *   • a real, keyboard-operable field: aria-invalid, aria-describedby wires the
 *     message to the input, the live error is role="alert" (aria-live) so it is
 *     announced as you type.
 *
 * Sourced from the shipped apps, never the web dashboard:
 *   • Voice (Swift) carries the richest validation vocabulary: SettingsView shows a
 *     SUCCESS row (checkmark.circle + "API key saved"), OnboardingView shows an ERROR
 *     caption (.foregroundStyle(.red), xmark.circle.fill) and a WARNING note
 *     (.foregroundStyle(.orange)); helper is .font(.caption) in onSurfaceMuted.
 *     NockerlTheme.error/warning/success map 1:1 onto our status tokens.
 *   • Android (Compose) has the error path only: OutlinedTextField(isError = …,
 *     supportingText = { Text(it) }) renders a bodySmall line in colorScheme.error
 *     (LoginScreen / SessionCreationSheet). No formal required / warning / success /
 *     counter state ships on Android yet; it was designed here originally. See the drift note.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them to
 * the dark palette; change a token and this demo moves with everything else. Literals
 * remain only for pure geometry (icon dimensions, the icon viewBox, transition curves).
 */
import { useState } from 'react';

import { NockerlIcon, NockerlTextField, type ComposeContract } from '@dizyx/nockerl-react';

/** The field validation status vocabulary. `neutral` = the resting helper line. */
export type FieldStatus = 'neutral' | 'error' | 'warning' | 'success';

export interface FieldValidationProps {
  /** Persistent label, bound to the input via htmlFor / id. Never a placeholder. */
  label: string;
  /** Current value (controlled). */
  value: string;
  /** Change handler. */
  onChange?: (value: string) => void;
  /** Ghost prompt INSIDE the well: supplementary, never the label. */
  placeholder?: string;
  /** input type (text, email, password, …). */
  type?: string;
  /**
   * The validation status. Drives the message tone, its glyph, and the field
   * border. `neutral` shows the helper line with no border recolor.
   */
  status?: FieldStatus;
  /** The single message under the field (helper / error / warning / success copy). */
  message?: string;
  /**
   * Multiple validation failures rendered as a checklist (e.g. password rules).
   * When present it replaces the single `message`.
   */
  issues?: { label: string; ok: boolean }[];
  /** Marks the field required: a status-colored asterisk after the label. */
  required?: boolean;
  /** Optional max length, which drives the right-aligned counter + over-limit error. */
  maxLength?: number;
  /** Optional leading glyph rendered inside the well, before the text. */
  leadingIcon?: string;
}

// The field chrome (well / focus ring / status border / trailing glyph / counter) now
// lives in the real <NockerlTextField> primitive. What remains here is the MESSAGING LAYER this
// page documents: the standalone vocabulary strip and the multi-rule checklist. The
// message appears by opacity + a tiny translate. Every visual value is a token; literals
// are geometry only (icon box, viewBox, transition curve).
const STYLES = `
.nk-fv-demo { font-family: var(--font-family-sans); color: var(--color-on-card); max-width: 440px; }

/* ── The issues wrapper: a real NockerlTextField + its rule checklist, stacked ── */
.nk-fv { display: flex; flex-direction: column; gap: var(--space-1); }
.nk-fv + .nk-fv { margin-top: var(--space-5); }

/* ── The MESSAGE ROW: the unit this page documents (standalone vocab strip) ───── */
/* icon is aligned to the FIRST text line (flex-start + matched line box). */
.nk-fv__msg {
  display: flex; align-items: flex-start; gap: var(--space-1); margin: 0;
  font-size: var(--font-size-12); line-height: var(--font-line-height-16);
  color: var(--color-on-card-muted);
}
.nk-fv__msg-ico { flex: 0 0 auto; display: inline-flex; height: var(--font-line-height-16); align-items: center; }
.nk-fv__msg-ico svg { display: block; width: 14px; height: 14px; }
.nk-fv__msg--error { color: var(--color-status-error); }
.nk-fv__msg--warning { color: var(--color-status-warning); }
.nk-fv__msg--success { color: var(--color-status-success); }
/* APPEAR by interpolatable props only: opacity + a tiny rise. No fill tween. */
.nk-fv__msg { animation: nk-fv-in .16s cubic-bezier(.2,0,0,1); }
@keyframes nk-fv-in { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: none; } }

/* multiple errors as a checklist (each rule is color + glyph + text). */
.nk-fv__list { list-style: none; margin: var(--space-1) 0 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-fv__list li { display: flex; align-items: flex-start; gap: var(--space-1);
  font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-status-error); }
.nk-fv__list li.is-ok { color: var(--color-status-success); }
.nk-fv__list-ico { flex: 0 0 auto; display: inline-flex; height: var(--font-line-height-16); align-items: center; }
.nk-fv__list-ico svg { display: block; width: 14px; height: 14px; }

/* ── The standalone vocabulary strip (messages on their own, no field) ───────── */
.nk-fv__vocab { display: flex; flex-direction: column; gap: var(--space-2); }

@media (prefers-reduced-motion: reduce) {
  .nk-fv__msg { animation: none; }
}

/* ── Showcase scaffolding ────────────────────────────────────────────────────── */
.nk-fv-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-fv-demo__group + .nk-fv-demo__group { margin-top: var(--space-8); }
.nk-fv-demo__count { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-5); }
.nk-fv-demo__count b { color: var(--color-accent-primary); }
`;

// ─── Status glyphs (drawn paths, currentColor so each tints to its status) ──────
/** Triangle-bang: error + warning share the shape; only the color differs. */
const IconAlert = (
  <NockerlIcon>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </NockerlIcon>
);
/** Check-in-circle: the success glyph. */
const IconCheck = (
  <NockerlIcon>
    <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
    <path d="m22 4-10 10.01-3-3" />
  </NockerlIcon>
);
/** Info dot: the neutral helper line. */
const IconInfo = (
  <NockerlIcon>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </NockerlIcon>
);
/** Small inline tick/cross for the rule checklist. */
const IconTick = <NockerlIcon path="M20 6 9 17l-5-5" />;
const IconCross = (
  <NockerlIcon>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </NockerlIcon>
);

const STATUS_ICON: Record<FieldStatus, typeof IconInfo> = {
  neutral: IconInfo,
  error: IconAlert,
  warning: IconAlert,
  success: IconCheck,
};

/**
 * A single validated Nockerl field, composed from the REAL <NockerlTextField> primitive.
 * NockerlTextField owns the well, focus ring, status border + trailing glyph, the help/counter
 * footer, and a11y (aria-invalid / aria-describedby / role="alert"). This wrapper only
 * MAPS the demo vocabulary onto NockerlTextField props: `neutral` → a plain helperText, and
 * error/warning/success → a status border + statusText. When `issues` are present the
 * single message is replaced by the multi-rule CHECKLIST (which NockerlTextField cannot render),
 * so we sit a status-bordered NockerlTextField above the existing checklist markup.
 */
export function ValidatedField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  status = 'neutral',
  message,
  issues,
  required = false,
  maxLength,
  leadingIcon,
}: FieldValidationProps) {
  // Strict TS (exactOptionalPropertyTypes): feed optional props via conditional spreads
  // so we never hand an explicit `undefined` to an exactOptional prop.
  const iconProp = leadingIcon ? { leadingIcon } : {};
  const capProp = maxLength != null ? { maxLength } : {};
  // Map the demo status onto NockerlTextField: neutral → helperText, otherwise status +
  // statusText. Only include the text key when a message is actually present, so the
  // maxLength field's over-cap case (no message) lets NockerlTextField generate the error.
  const statusProps =
    status !== 'neutral'
      ? { status, ...(message != null ? { statusText: message } : {}) }
      : message != null
        ? { helperText: message }
        : {};

  // The checklist case: a status-bordered NockerlTextField (no statusText, since the checklist
  // IS the message) followed by the existing rule list.
  if (issues) {
    return (
      <div className="nk-fv">
        <NockerlTextField
          label={label}
          value={value}
          {...(onChange ? { onChange } : {})}
          {...(placeholder != null ? { placeholder } : {})}
          type={type}
          required={required}
          {...iconProp}
          {...(status !== 'neutral' ? { status } : {})}
        />
        <ul className="nk-fv__list" aria-label={`${label} requirements`}>
          {issues.map((rule) => (
            <li key={rule.label} className={rule.ok ? 'is-ok' : ''}>
              <span className="nk-fv__list-ico" aria-hidden="true">
                {rule.ok ? IconTick : IconCross}
              </span>
              {rule.label}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // The single-message case: a real NockerlTextField carrying either a status + statusText (for
  // error/warning/success) or a neutral helperText. For the maxLength counter field we
  // pass helperText for the normal case only and let NockerlTextField auto-generate the over-cap
  // error message.
  return (
    <NockerlTextField
      label={label}
      value={value}
      {...(onChange ? { onChange } : {})}
      {...(placeholder != null ? { placeholder } : {})}
      type={type}
      required={required}
      {...iconProp}
      {...capProp}
      {...statusProps}
    />
  );
}

/** A standalone message row: the validation vocabulary shown without a field. */
function VocabRow({ status, children }: { status: FieldStatus; children: string }) {
  return (
    <p className={`nk-fv__msg${status !== 'neutral' ? ` nk-fv__msg--${status}` : ''}`} style={{ animation: 'none' }}>
      <span className="nk-fv__msg-ico" aria-hidden="true">
        {STATUS_ICON[status]}
      </span>
      {children}
    </p>
  );
}

const PWD_RULES = (v: string) => [
  { label: 'At least 12 characters', ok: v.length >= 12 },
  { label: 'One uppercase letter', ok: /[A-Z]/.test(v) },
  { label: 'One number', ok: /\d/.test(v) },
];

/**
 * The interactive showcase mounted on the Field validation page: the standalone
 * message vocabulary, the four status treatments on real (recessed) fields incl. a
 * required indicator, a LIVE email field that validates to error → success as you
 * type, a character counter that turns to the error treatment over the cap, and a
 * multi-rule password field that resolves its checklist live. Tab to any field for
 * the cyan focus ring; the live error is announced via role="alert".
 */
// LEAF: the field-level validation MESSAGING layer. It owns NO raw facsimiles: the host field is the composed real <NockerlTextField> (which owns the <input>), and the message/checklist are plain text + <NockerlIcon>. It exposes NO consumer-fillable component slot (`message` is a string, `issues` a data array rendered internally, `leadingIcon` a glyph), so it is a leaf, not a container.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default function FieldValidationDemo() {
  const [email, setEmail] = useState('user@');
  const [title, setTitle] = useState('Refactor the auth flow and ship it');
  const [pwd, setPwd] = useState('hunter2');
  const [edits, setEdits] = useState(0);
  const bump = () => setEdits((c) => c + 1);

  // Live email: error until it looks valid, then a success confirmation.
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const emailStatus: FieldStatus = email.length === 0 ? 'neutral' : emailValid ? 'success' : 'error';
  const emailMsg =
    email.length === 0
      ? 'We send run summaries here.'
      : emailValid
        ? 'Looks good, we can reach you here.'
        : 'Enter a valid email address.';

  const rules = PWD_RULES(pwd);
  const pwdOk = rules.every((r) => r.ok);

  return (
    <div className="nk-fv-demo">
      <style>{STYLES}</style>

      <div className="nk-fv-demo__group">
        <p className="nk-fv-demo__lbl">The vocabulary: one tone per state, never color alone</p>
        <div className="nk-fv__vocab">
          <VocabRow status="neutral">Shown in the session list. Optional.</VocabRow>
          <VocabRow status="success">Saved. This name is available.</VocabRow>
          <VocabRow status="warning">This name is close to another session.</VocabRow>
          <VocabRow status="error">A session name is required.</VocabRow>
        </div>
      </div>

      <div className="nk-fv-demo__group">
        <p className="nk-fv-demo__lbl">On the field: required, error, warning, success</p>
        <ValidatedField
          label="Session name"
          required
          value=""
          onChange={bump}
          placeholder="e.g. Refactor auth flow"
          status="error"
          message="A session name is required."
        />
        <ValidatedField
          label="Slug"
          value="auth flow"
          onChange={bump}
          status="warning"
          message="Spaces become hyphens: auth-flow."
        />
        <ValidatedField
          label="Workspace"
          value="dizyx"
          onChange={bump}
          status="success"
          message="Workspace found."
        />
      </div>

      <div className="nk-fv-demo__group">
        <p className="nk-fv-demo__lbl">Live: type the email, watch it validate</p>
        <ValidatedField
          label="Notify email"
          type="email"
          leadingIcon="@"
          value={email}
          onChange={(v) => {
            setEmail(v);
            bump();
          }}
          placeholder="you@example.com"
          status={emailStatus}
          message={emailMsg}
        />

        <ValidatedField
          label="Session title"
          value={title}
          onChange={(v) => {
            setTitle(v);
            bump();
          }}
          placeholder="A short, descriptive title"
          maxLength={32}
          {...(title.length <= 32 ? { message: 'Kept short so it fits the list.' } : {})}
        />
      </div>

      <div className="nk-fv-demo__group">
        <p className="nk-fv-demo__lbl">Multiple rules: the checklist resolves as you type</p>
        <ValidatedField
          label="New password"
          type="password"
          value={pwd}
          onChange={(v) => {
            setPwd(v);
            bump();
          }}
          placeholder="Choose a strong password"
          status={pwdOk ? 'success' : 'error'}
          issues={rules}
        />
      </div>

      <p className="nk-fv-demo__count">
        Edited <b>{edits}</b> {edits === 1 ? 'time' : 'times'} · email {emailValid ? 'valid' : 'invalid'} · password{' '}
        {pwdOk ? 'meets all rules' : `${rules.filter((r) => r.ok).length}/${rules.length} rules`}. The island is live.
      </p>
    </div>
  );
}
