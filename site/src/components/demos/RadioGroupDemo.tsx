/**
 * RadioGroupDemo: the live, interactive Nockerl radio-group island for the web.
 *
 * The third sibling in the selection-control family, deliberately DISTINCT: a
 * SWITCH is an on/off SETTING (track + thumb); a CHECKBOX is a multi-SELECT box +
 * tick (with a tri-state "mixed"); a RADIO is a MUTUALLY-EXCLUSIVE single choice,
 * a CIRCLE holding a centered filled DOT when chosen. Only ONE option per group
 * is selectable, and the whole group is a single tab stop: arrow keys ROVE and
 * SELECT. They share the vocabulary (recessed well, static cyan accent lit from
 * above, focus ring) but the radio renders a CIRCLE + DOT, never a box, tick, or
 * track.
 *
 * Sourced from the shipped apps, never the web dashboard:
 *   • Android (Compose) Material3 `RadioButton(selected, onClick)` brand-themed
 *     via `RadioButtonDefaults.colors(selectedColor = accentPrimary)` (matching
 *     NockerlSwitch/NockerlCheckbox). Rows use the M3 idiom `Modifier.selectable(selected,
 *     onClick, role = Role.RadioButton)`, where the PARENT owns the click, the child
 *     `RadioButton(onClick = null)`, so the whole label is ONE a11y unit
 *     (chat/ui/SessionEngineSupport.kt `EngineSelector`; AskUserQuestionSheet.kt
 *     single-choice: `selected.clear(); selected.add(label)`). Options carry a
 *     label + optional description; a `multiSelect` flag is the only thing that
 *     swaps the RadioButton for a NockerlCheckbox.
 *   • Voice (Swift/macOS) has NO radio control: single choice is a custom
 *     `SegmentedSelector` (active = cyan OUTLINE) or a `NockerlMenu` whose chosen row
 *     gets a `checkmark`. Radio cards + an error/required group ship on neither
 *     app yet; they were designed here originally. See the drift note.
 *
 * Implements the design laws verbatim:
 *   • depth = neutral shadow + top catch-light, never a glow. The UNSELECTED
 *     circle is a RECESSED WELL (darker + inner shadow, because fields sink); the
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
 *     aria-labelledby (group label) + aria-describedby (error), ≥24px hit target.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). Literals remain only for pure
 * geometry (circle / dot dimensions, transition curves).
 */
import { useState } from 'react';
import { NockerlRadioGroup } from '@dizyx/nockerl-react';

// Demo-only scaffolding CSS. The NockerlRadioGroup recipe (.nk-rg / .nk-ro*, the group
// container / row / circle / ring / dot / focus ring / invalid / disabled / card
// variant / error message / legend) now lives in the primitive (NOCKERL_RADIO_GROUP_STYLES)
// and is injected by the component; what stays here is the showcase chrome (cards /
// grid / captions) that frames the live groups.
const STYLES = `
.nk-rg-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }

/* ── Showcase layout ───────────────────────────────────────────────────────── */
.nk-rg-card {
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  padding: var(--space-4) var(--space-5); max-width: 460px;
}
.nk-rg-card--wide { max-width: 620px; }
.nk-rg-card--half { flex: 1 1 200px; }   /* 200px: layout min, not a token value */
.nk-rg-demo__grid { display: flex; flex-wrap: wrap; gap: var(--space-6) var(--space-8); align-items: flex-start; }
.nk-rg-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-rg-demo__sect { margin-top: var(--space-6); }
.nk-rg-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-rg-demo__count b { color: var(--color-accent-primary); }
`;

const ENGINE = [
  { value: 'cloud-agent', label: 'Cloud Agent', description: 'SDK manages context in JSONL' },
  { value: 'api-server', label: 'Local Engine', description: 'Our lossless context management' },
];

const VISIBILITY = [
  { value: 'private', label: 'Private' },
  { value: 'team', label: 'Team' },
  { value: 'public', label: 'Public' },
];

const TOOL_MODE = [
  { value: 'ask', label: 'Ask first', description: 'Approve every tool before it runs' },
  { value: 'auto', label: 'Auto-run', description: 'Run read-only tools without asking' },
  { value: 'plan', label: 'Plan mode', description: 'Draft a plan, then run on approval', disabled: true },
];

const PLAN = [
  { value: 'large', label: 'Large 2.0', description: 'Deepest reasoning · highest cost' },
  { value: 'medium', label: 'Medium 4.6', description: 'Balanced speed and quality' },
  { value: 'local', label: 'Local · GPU', description: 'Runs on your cluster · no cloud cost' },
];

const REGION = [
  { value: 'eu', label: 'EU (Frankfurt)' },
  { value: 'us', label: 'US (Fly)' },
];

/**
 * The interactive showcase mounted on the Radio group page: a vertical list (label
 * + description per option, one chosen via the filled dot), an inline/horizontal
 * group, a row of selectable radio CARDS, a group with a disabled option, an
 * error/required group with a message, and sizes. Tab to a group, then Arrow keys
 * to move + select, or Space to select.
 */
export default function RadioGroupDemo() {
  const [engine, setEngine] = useState('api-server');
  const [tool, setTool] = useState('auto');
  const [plan, setPlan] = useState('medium');
  const [visibility, setVisibility] = useState('team');
  const [region, setRegion] = useState('eu');
  const [delivery, setDelivery] = useState('');
  const [smallEngine, setSmallEngine] = useState('cloud-agent');
  const [changes, setChanges] = useState(0);
  const bump = () => setChanges((c) => c + 1);

  const choose = (set: (v: string) => void) => (v: string) => {
    set(v);
    bump();
  };

  return (
    <div className="nk-rg-demo">
      <style>{STYLES}</style>

      <p className="nk-rg-demo__lbl">
        Vertical list: label + description, one chosen (the filled dot). Tab in, Arrow to move + select
      </p>
      <div className="nk-rg-card">
        <NockerlRadioGroup
          label="Session engine"
          options={ENGINE}
          value={engine}
          onChange={choose(setEngine)}
        />
      </div>

      <p className="nk-rg-demo__lbl nk-rg-demo__sect">Inline / horizontal: compact single choice on one line</p>
      <div className="nk-rg-card">
        <NockerlRadioGroup
          label="Visibility"
          orientation="horizontal"
          options={VISIBILITY}
          value={visibility}
          onChange={choose(setVisibility)}
        />
      </div>

      <p className="nk-rg-demo__lbl nk-rg-demo__sect">Radio cards: selectable cards, the chosen one gets a cyan ring + wash</p>
      <div className="nk-rg-card nk-rg-card--wide">
        <NockerlRadioGroup
          label="Default model"
          variant="card"
          orientation="horizontal"
          options={PLAN}
          value={plan}
          onChange={choose(setPlan)}
        />
      </div>

      <p className="nk-rg-demo__lbl nk-rg-demo__sect">Disabled option: inert but still legible (Plan mode is locked)</p>
      <div className="nk-rg-card">
        <NockerlRadioGroup
          label="Tool approvals"
          options={TOOL_MODE}
          value={tool}
          onChange={choose(setTool)}
        />
      </div>

      <p className="nk-rg-demo__lbl nk-rg-demo__sect">Error / required: warm ring + a message (color is never alone)</p>
      <div className="nk-rg-card">
        <NockerlRadioGroup
          label="Delivery method"
          options={[
            { value: 'email', label: 'Email digest' },
            { value: 'push', label: 'Push notification' },
            { value: 'none', label: 'Do not notify me' },
          ]}
          value={delivery}
          onChange={choose(setDelivery)}
          invalid={delivery === ''}
        />
      </div>

      <p className="nk-rg-demo__lbl nk-rg-demo__sect">Sizes: sm and md</p>
      <div className="nk-rg-demo__grid">
        <div className="nk-rg-card nk-rg-card--half">
          <NockerlRadioGroup label="Engine (small)" size="sm" options={ENGINE} value={smallEngine} onChange={choose(setSmallEngine)} />
        </div>
        <div className="nk-rg-card nk-rg-card--half">
          <NockerlRadioGroup label="Region (medium)" size="md" options={REGION} value={region} onChange={choose(setRegion)} />
        </div>
      </div>

      <p className="nk-rg-demo__count">
        Selection changed <b>{changes}</b> {changes === 1 ? 'time' : 'times'}. The island is live.
      </p>
    </div>
  );
}
