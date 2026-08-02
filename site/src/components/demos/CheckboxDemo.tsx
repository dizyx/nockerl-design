/**
 * CheckboxDemo: the live, interactive Nockerl checkbox island for the web.
 *
 * Sibling to the NockerlSwitch, deliberately distinct: a SWITCH is an instant on/off
 * SETTING (track + sliding thumb); a CHECKBOX is a multi-SELECTION in a list or
 * form, a box that fills with a cyan tick, and it adds an INDETERMINATE (mixed)
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
 *     neither app yet, so they are designed here originally; see the drift note.
 *
 * Implements the design laws verbatim:
 *   • depth = neutral shadow + top catch-light, never a glow. The UNCHECKED box is
 *     a RECESSED WELL (darker than the card + inner shadow, because fields sink). The
 *     CHECKED box is a STATIC cyan gradient lit from above.
 *   • flash-free feedback: the box fill never tweens between two fills. The cyan
 *     layer CROSS-FADES in by opacity (interpolatable) over the static well, and
 *     the tick DRAWS via stroke-dashoffset, so only transform / opacity / brightness
 *     move. The mixed→checked dash is a draw, not a fill swap.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   • the tick that sits ON the cyan fill uses var(--color-on-accent) for contrast.
 *   • cyan is the SELECTION signal only; warm tones appear only as the error mark.
 *   • a real control: role="checkbox", aria-checked incl. "mixed", Space toggles,
 *     ≥24px hit target, persistent labels.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them
 * to the dark palette; change a token and this demo moves with everything else.
 * Literals remain only for pure geometry (box dimensions, the tick path / dash
 * lengths, transition curves), never for color, type, radius, or spacing.
 */
import { useMemo, useState } from 'react';
import { NockerlCheckbox, type CheckedState } from '@dizyx/nockerl-react';

// Demo-only scaffolding CSS. The NockerlCheckbox recipe (.nk-cb*, the box / cyan layer /
// tick-dash / focus ring / invalid / disabled / text block) now lives in the
// primitive (NOCKERL_CHECKBOX_STYLES) and is injected by the component; what stays here is
// the showcase chrome (cards / grid / cells / captions) + the tri-state GROUP
// scaffolding that composes multiple checkboxes into a parent/child island.
const STYLES = `
.nk-cb-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }

/* ── A tri-state GROUP: a parent that reflects all/none/some of its children ── */
.nk-cb-group { display: flex; flex-direction: column; gap: var(--space-1); }
.nk-cb-group__parent { padding-bottom: var(--space-2); border-bottom: var(--space-px) solid var(--color-card-hairline); }
.nk-cb-group__children { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-3) 0 0 var(--space-6); }

/* ── Showcase layout ───────────────────────────────────────────────────────── */
.nk-cb-card {
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  padding: var(--space-4) var(--space-5); max-width: 460px;
}
.nk-cb-demo__grid { display: flex; flex-wrap: wrap; gap: var(--space-6) var(--space-8); align-items: flex-start; }
.nk-cb-demo__cell { display: inline-flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.nk-cb-demo__cap { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); }
.nk-cb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-cb-demo__sect { margin-top: var(--space-6); }
.nk-cb-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-cb-demo__count b { color: var(--color-accent-primary); }
`;

const SCOPES = ['repos', 'issues', 'pull requests'];

/**
 * The interactive showcase mounted on the NockerlCheckbox page: a real multi-select form
 * (a permission group), a full state matrix (unchecked / checked / mixed /
 * disabled-off / disabled-on / invalid), sizes + a standalone use, and a tri-state
 * parent that wires indeterminate → all/none across its children. Tab to each box
 * and toggle with Space.
 */
export default function CheckboxDemo() {
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(true);
  const [consent, setConsent] = useState(false);
  const [toggles, setToggles] = useState(0);
  const bump = () => setToggles((c) => c + 1);

  // Tri-state parent ⇄ children: parent reflects all / none / some.
  const [scopes, setScopes] = useState<Record<string, boolean>>({
    repos: true,
    issues: false,
    'pull requests': false,
  });
  const allOn = SCOPES.every((s) => scopes[s]);
  const noneOn = SCOPES.every((s) => !scopes[s]);
  const parentState: CheckedState = useMemo(
    () => (allOn ? true : noneOn ? false : 'mixed'),
    [allOn, noneOn],
  );
  const setAll = (next: boolean) => {
    setScopes(Object.fromEntries(SCOPES.map((s) => [s, next])));
    bump();
  };
  const setOne = (key: string, next: boolean) => {
    setScopes((prev) => ({ ...prev, [key]: next }));
    bump();
  };

  return (
    <div className="nk-cb-demo">
      <style>{STYLES}</style>

      <p className="nk-cb-demo__lbl">Form: multi-select, with a label + description (the box is the target)</p>
      <div className="nk-cb-card">
        <div className="nk-cb-group" style={{ gap: 'var(--space-4)' }}>
          <NockerlCheckbox
            label="Accept the terms of service"
            description="You must agree before continuing"
            checked={terms}
            onChange={(v) => {
              setTerms(v);
              bump();
            }}
          />
          <NockerlCheckbox
            label="Send me product updates"
            description="Occasional email, no spam"
            checked={marketing}
            onChange={(v) => {
              setMarketing(v);
              bump();
            }}
          />
          <NockerlCheckbox
            label="Share anonymous usage data"
            description="Locked by your administrator"
            checked
            disabled
          />
          <NockerlCheckbox
            label="I am over 18"
            description="Confirm to create an account"
            checked={consent}
            invalid={!consent}
            onChange={(v) => {
              setConsent(v);
              bump();
            }}
          />
        </div>
      </div>

      <p className="nk-cb-demo__lbl nk-cb-demo__sect">
        Tri-state group: the parent reflects all / none / some of its children
      </p>
      <div className="nk-cb-card">
        <div className="nk-cb-group">
          <div className="nk-cb-group__parent">
            <NockerlCheckbox
              label="Grant repository access"
              description={allOn ? 'All scopes' : noneOn ? 'No scopes' : 'Some scopes'}
              checked={parentState}
              onChange={(v) => setAll(v)}
            />
          </div>
          <div className="nk-cb-group__children">
            {SCOPES.map((s) => (
              <NockerlCheckbox
                key={s}
                label={s[0]!.toUpperCase() + s.slice(1)}
                checked={!!scopes[s]}
                onChange={(v) => setOne(s, v)}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="nk-cb-demo__lbl nk-cb-demo__sect">States: tab in, toggle with Space</p>
      <div className="nk-cb-demo__grid">
        <span className="nk-cb-demo__cell">
          <NockerlCheckbox checked={false} ariaLabel="Unchecked example" onChange={bump} />
          <span className="nk-cb-demo__cap">Unchecked</span>
        </span>
        <span className="nk-cb-demo__cell">
          <NockerlCheckbox checked ariaLabel="Checked example" onChange={bump} />
          <span className="nk-cb-demo__cap">Checked</span>
        </span>
        <span className="nk-cb-demo__cell">
          <NockerlCheckbox checked="mixed" ariaLabel="Mixed example" onChange={bump} />
          <span className="nk-cb-demo__cap">Mixed</span>
        </span>
        <span className="nk-cb-demo__cell">
          <NockerlCheckbox checked={false} disabled ariaLabel="Disabled unchecked" />
          <span className="nk-cb-demo__cap">Disabled off</span>
        </span>
        <span className="nk-cb-demo__cell">
          <NockerlCheckbox checked disabled ariaLabel="Disabled checked" />
          <span className="nk-cb-demo__cap">Disabled on</span>
        </span>
        <span className="nk-cb-demo__cell">
          <NockerlCheckbox checked={false} invalid ariaLabel="Invalid example" onChange={bump} />
          <span className="nk-cb-demo__cap">Invalid</span>
        </span>
      </div>

      <p className="nk-cb-demo__lbl nk-cb-demo__sect">Sizes &amp; standalone use</p>
      <div className="nk-cb-demo__grid">
        <span className="nk-cb-demo__cell">
          <NockerlCheckbox checked size="sm" ariaLabel="Small checked" onChange={bump} />
          <span className="nk-cb-demo__cap">Small</span>
        </span>
        <span className="nk-cb-demo__cell">
          <NockerlCheckbox checked size="md" ariaLabel="Medium checked" onChange={bump} />
          <span className="nk-cb-demo__cap">Medium</span>
        </span>
        <NockerlCheckbox
          label="Select all rows"
          checked={parentState}
          onChange={(v) => setAll(v)}
        />
      </div>

      <p className="nk-cb-demo__count">
        Toggled <b>{toggles}</b> {toggles === 1 ? 'time' : 'times'}. The island is live.
      </p>
    </div>
  );
}
