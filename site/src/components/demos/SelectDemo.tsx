/**
 * SelectDemo: the live, interactive island for the shipped NockerlSelect composite.
 *
 * The reusable single-value picker now lives in the published package
 * (@dizyx/nockerl-react → NockerlSelect); this file is only the showcase harness that
 * CONSUMES it. Select is the PLAINEST picker: pick ONE value from a fixed list. The
 * trigger is a recessed WELL *button* showing the chosen value (or a placeholder) + a
 * chevron; pressing it drops a LIFTED popover listbox; clicking an option selects it,
 * closes the popover, and stamps a CHECK on the chosen row. No text entry, no multi, no
 * actions. It is deliberately distinct from its neighbours:
 *   • combobox     = a text-field WELL you TYPE to filter (autocomplete).
 *   • multi-select = token chips + per-row CHECKBOXES + Select-all (manage a SET).
 *   • menu         = action items (icons + hints + submenus), not a value picker.
 *
 * Sourced from the REAL apps (read-only). Android `chat/ui/SessionCreationDropdowns.kt`
 * gives the canonical `DropdownAnchor` (label + value + `ArrowDropDown`, placeholder /
 * loading / disabled) + `DropdownMenu` of `DropdownMenuItem`s (provider / model /
 * tool-mode / thinking pickers); `core/theme/NockerlShapes.kt` `NockerlControlShape`
 * (the 12dp control radius). Voice `UI/AppSettingsView.swift` has the mic picker:
 * `NockerlMenu { NockerlButton { Label(name, systemImage: "checkmark") } }`, a
 * `chevron.up.chevron.down` trigger, `.menuStyle(.borderlessButton)`.
 *
 * The Select's design laws (the trigger SINKS / the popover LIFTS, neutral drop shadow +
 * top catch-light, the SELECTED cyan edge + trailing check, the ACTIVE neutral wash +
 * cyan ring, the warm error border + icon + message, the flash-free static fills, and the
 * full keyboard model) are ENCODED IN THE PACKAGE now; see
 * packages/react/src/composites/Select.tsx. This harness only supplies the option DATA
 * (providers, models, sessions, themes) and the demo layout chrome.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a var(--token)
 * (docs/demo-token-contract.md); literals are pure geometry only.
 */
import { useState } from 'react';
import { NockerlSelect, type NockerlSelectOption } from '@dizyx/nockerl-react';

// Demo chrome only: the page layout around the pickers (the trigger, popover, option
// rows, and their motion are the shipped NockerlSelect). Every value is a token.
const STYLES = `
.nk-sel-demo { font-family: var(--font-family-sans); max-width: 460px; }
.nk-sel-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-sel-demo__group + .nk-sel-demo__group { margin-top: var(--space-8); }
.nk-sel-demo__row { display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: flex-start; }
.nk-sel-demo__row > .nk-sel { flex: 1 1 200px; margin-top: 0; }
.nk-sel-demo__count { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-8); }
.nk-sel-demo__count b { color: var(--color-accent-primary); }
`;

// ─── Demo data: real Nockerl surfaces (providers, models, sessions, themes) ───
const PROVIDERS: NockerlSelectOption[] = [
  { value: 'cloud-personal', label: 'cloud-personal', secondary: 'Cloud Agent · personal', status: 'success' },
  { value: 'cloud-work', label: 'cloud-work', secondary: 'Cloud Agent · work', status: 'success' },
  { value: 'local', label: 'local', secondary: 'Local runtime', status: 'info' },
  { value: 'openrouter', label: 'openrouter', secondary: 'Cloud · billable', status: 'warning' },
  { value: 'deepgram', label: 'deepgram', secondary: 'Retired, use local first', status: 'idle', disabled: true },
];

const MODELS: NockerlSelectOption[] = [
  { value: 'large-2-0', label: 'Large 2.0', secondary: 'the provider · coding', group: 'Cloud' },
  { value: 'medium-4-6', label: 'Cloud Agent Medium 4.6', secondary: 'the provider · fast', group: 'Cloud' },
  { value: 'qwen3-32b', label: 'Qwen3 32B', secondary: 'local cluster · local', group: 'Local' },
  { value: 'mimo-v2-5', label: 'MiMo V2.5', secondary: 'local cluster · omni / ASR', group: 'Local' },
  { value: 'embed-4b', label: 'Qwen3-Embedding 4B', secondary: 'local cluster · 2560-dim', group: 'Local' },
];

// Voice mic-picker parity (AppSettingsView.swift) + the tri-state tool/thinking pickers.
const THINKING: NockerlSelectOption[] = [
  { value: 'off', label: 'Off' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'max', label: 'Max' },
];
const THEMES: NockerlSelectOption[] = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

/**
 * The interactive showcase mounted on the Select page: a placeholder/empty field,
 * a provider picker with leading status marks + a disabled option, a grouped model
 * picker with secondary text, an error/invalid field, a disabled field, and a
 * compact sm + md size row. Click or keyboard (Enter/↓ open, ↑↓/Home/End + type a
 * letter to move, Enter selects, Esc closes): fully operable.
 */
export default function SelectDemo() {
  const [provider, setProvider] = useState<string | null>('cloud-personal');
  const [model, setModel] = useState<string | null>('large-2-0');
  const [region, setRegion] = useState<string | null>(null); // starts empty → placeholder
  const [required, setRequired] = useState<string | null>(null); // error until chosen
  const [thinkingSm, setThinkingSm] = useState<string | null>('high');
  const [themeMd, setThemeMd] = useState<string | null>('system');
  const [picks, setPicks] = useState(0);

  const choose = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPicks((c) => c + 1);
  };

  return (
    <div className="nk-sel-demo">
      <style>{STYLES}</style>

      <div className="nk-sel-demo__group">
        <p className="nk-sel-demo__lbl">Placeholder vs. a value: click or press Enter / ↓ to open</p>
        <NockerlSelect
          label="Region" options={PROVIDERS.slice(0, 4)} value={region} onChange={choose(setRegion)}
          placeholder="Choose a region…" helperText="Nothing selected yet, so the placeholder holds the empty state."
        />
        <NockerlSelect
          label="Provider" options={PROVIDERS} value={provider} onChange={choose(setProvider)}
          helperText="Leading status mark · the chosen option carries a cyan check · one disabled option."
        />
      </div>

      <div className="nk-sel-demo__group">
        <p className="nk-sel-demo__lbl">Grouped options: group labels, leading + secondary text</p>
        <NockerlSelect
          label="Model" options={MODELS} value={model} onChange={choose(setModel)} grouped
          helperText="Cloud and local engines, bucketed under headers."
        />
      </div>

      <div className="nk-sel-demo__group">
        <p className="nk-sel-demo__lbl">Error / invalid + disabled</p>
        <NockerlSelect
          label="Workspace" options={[{ value: 'dizyx', label: 'dizyx' }, { value: 'work', label: 'work' }, { value: 'personal', label: 'personal' }]}
          value={required} onChange={choose(setRequired)} placeholder="Pick a workspace…"
          errorText={required ? undefined : 'A workspace is required to continue.'}
          helperText="Required field. The error clears once you choose."
        />
        <NockerlSelect
          label="Locked field" options={PROVIDERS} value="local" onChange={() => {}} disabled
          helperText="Inert, but the chosen value stays legible."
        />
      </div>

      <div className="nk-sel-demo__group">
        <p className="nk-sel-demo__lbl">Sizes: sm and md</p>
        <div className="nk-sel-demo__row">
          <NockerlSelect label="Thinking (sm)" size="sm" options={THINKING} value={thinkingSm} onChange={choose(setThinkingSm)} />
          <NockerlSelect label="Theme (md)" size="md" options={THEMES} value={themeMd} onChange={choose(setThemeMd)} />
        </div>
      </div>

      <p className="nk-sel-demo__count">
        Committed <b>{picks}</b> {picks === 1 ? 'selection' : 'selections'}. The island is live.
      </p>
    </div>
  );
}
