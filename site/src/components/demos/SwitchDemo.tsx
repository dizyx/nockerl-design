/**
 * SwitchDemo: the live, interactive Nockerl switch (toggle) island for the web.
 *
 * Sourced from the shipped apps, never the web dashboard:
 *   • Android (Compose) Material3 `NockerlSwitch(checked, onCheckedChange, enabled,
 *     colors = SwitchDefaults.colors(checkedTrackColor = accentPrimary))`. The
 *     ON track is the brand cyan; everything else is the palette default.
 *   • Voice (Swift) `Toggle("", isOn:).labelsHidden().toggleStyle(.switch)`, the
 *     system stadium switch, accent-tinted.
 *   • The web look continues the `nk-li__switch` precedent already in
 *     ListItemDemo (pill track + a thumb that translates + cyan when on).
 *
 * Implements the design laws verbatim:
 *   • depth = neutral shadow + top catch-light, never a glow. The OFF track is a
 *     RECESSED WELL (darker + inner shadow, because fields sink); the thumb is a
 *     LIFTED disc (drop shadow + catch-light, so it rises). ON track is a STATIC cyan
 *     gradient lit from above.
 *   • flash-free feedback: the track fill never tweens between two fills. Only the
 *     thumb TRANSFORM (slide + press-scale) and track BRIGHTNESS animate, both
 *     interpolatable. The OFF→ON track recolor is an opacity cross-fade of a
 *     static cyan layer over the static well, so nothing hard-cuts.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   • cyan is the ON signal only; warm tones never appear here.
 *   • a real control: role="switch", aria-checked, Space/Enter toggles, ≥24px hit.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them
 * to the dark palette; change a token and this demo moves with everything else.
 * Literals remain only for pure geometry (thumb/track dimensions, transition
 * curves, the spinner arc), never for color, type, radius, or spacing.
 */
import { useState } from 'react';
import { NockerlSwitch, type NockerlSwitchProps } from '@dizyx/nockerl-react';

// Demo-only scaffolding CSS. The NockerlSwitch recipe (.nk-sw*, the recessed-well track /
// cyan cross-fade layer / sliding thumb / focus ring / disabled / loading spinner /
// reduced-motion) now lives in the primitive (NOCKERL_SWITCH_STYLES) and is injected by the
// component; what stays here is the showcase chrome (card / grid / cells / captions /
// labels) + the settings-row and inline scaffolding that composes the switch into a
// labelled island.
const STYLES = `
.nk-sw-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }

/* ── A settings ROW, the real usage: persistent label, control its own target ── */
.nk-sw-row {
  display: flex; align-items: center; gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
}
.nk-sw-row__text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-sw-row__label { font-size: var(--font-size-14); font-weight: var(--font-weight-medium); line-height: var(--font-line-height-20); color: var(--color-on-card); }
.nk-sw-row__desc { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); }
.nk-sw-row--disabled .nk-sw-row__label { color: var(--color-on-card-muted); }

/* Inline (label beside the control, no row chrome) */
.nk-sw-inline { display: inline-flex; align-items: center; gap: var(--space-2); }
.nk-sw-inline__label { font-size: var(--font-size-14); color: var(--color-on-card); }

/* ── Showcase layout ───────────────────────────────────────────────────────── */
.nk-sw-card {
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  overflow: hidden; max-width: 460px;
}
.nk-sw-card__row + .nk-sw-card__row { border-top: var(--space-px) solid var(--color-card-hairline); }
.nk-sw-demo__grid { display: flex; flex-wrap: wrap; gap: var(--space-6) var(--space-8); align-items: center; }
.nk-sw-demo__cell { display: inline-flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.nk-sw-demo__cap { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); }
.nk-sw-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-sw-demo__lbl + .nk-sw-demo__lbl, .nk-sw-demo__sect { margin-top: var(--space-6); }
.nk-sw-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-sw-demo__count b { color: var(--color-accent-primary); }
`;

/** A switch with a persistent label + optional description: a settings row. */
function SwitchRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  loading = false,
}: NockerlSwitchProps) {
  return (
    <div className={`nk-sw-row${disabled ? ' nk-sw-row--disabled' : ''}`}>
      <span className="nk-sw-row__text">
        <span className="nk-sw-row__label">{label}</span>
        {description && <span className="nk-sw-row__desc">{description}</span>}
      </span>
      <NockerlSwitch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        loading={loading}
        ariaLabel={label}
      />
    </div>
  );
}

/**
 * The interactive showcase mounted on the NockerlSwitch page: the canonical settings-row
 * usage (label + control as a separate target) on one lifted card, then a state
 * matrix (off / on / disabled-off / disabled-on / loading), then sizes and an
 * inline form use. Tab to each control and toggle with Space/Enter.
 */
export default function SwitchDemo() {
  const [push, setPush] = useState(true);
  const [haptics, setHaptics] = useState(false);
  const [thinking, setThinking] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [toggles, setToggles] = useState(0);
  const bump = () => setToggles((c) => c + 1);

  return (
    <div className="nk-sw-demo">
      <style>{STYLES}</style>

      <p className="nk-sw-demo__lbl">Settings rows: label + control (the control is its own target)</p>
      <div className="nk-sw-card">
        <div className="nk-sw-card__row">
          <SwitchRow
            label="Push notifications"
            description="Alerts when a session needs you"
            checked={push}
            onChange={(v) => {
              setPush(v);
              bump();
            }}
          />
        </div>
        <div className="nk-sw-card__row">
          <SwitchRow
            label="Haptic feedback"
            description="Vibrate on button confirms"
            checked={haptics}
            onChange={(v) => {
              setHaptics(v);
              bump();
            }}
          />
        </div>
        <div className="nk-sw-card__row">
          <SwitchRow
            label="Enable thinking"
            description="Locked by your administrator"
            checked={thinking}
            onChange={setThinking}
            disabled
          />
        </div>
        <div className="nk-sw-card__row">
          <SwitchRow
            label="Parallel tool calls"
            description="Saving your preference…"
            checked={streaming}
            onChange={setStreaming}
            loading
          />
        </div>
      </div>

      <p className="nk-sw-demo__lbl nk-sw-demo__sect">States: tab in, toggle with Space / Enter</p>
      <div className="nk-sw-demo__grid">
        <span className="nk-sw-demo__cell">
          <NockerlSwitch checked={false} ariaLabel="Off example" onChange={bump} />
          <span className="nk-sw-demo__cap">Off</span>
        </span>
        <span className="nk-sw-demo__cell">
          <NockerlSwitch checked ariaLabel="On example" onChange={bump} />
          <span className="nk-sw-demo__cap">On</span>
        </span>
        <span className="nk-sw-demo__cell">
          <NockerlSwitch checked={false} disabled ariaLabel="Disabled off" />
          <span className="nk-sw-demo__cap">Disabled off</span>
        </span>
        <span className="nk-sw-demo__cell">
          <NockerlSwitch checked disabled ariaLabel="Disabled on" />
          <span className="nk-sw-demo__cap">Disabled on</span>
        </span>
        <span className="nk-sw-demo__cell">
          <NockerlSwitch checked loading ariaLabel="Loading" />
          <span className="nk-sw-demo__cap">Loading</span>
        </span>
      </div>

      <p className="nk-sw-demo__lbl nk-sw-demo__sect">Sizes &amp; inline use</p>
      <div className="nk-sw-demo__grid">
        <span className="nk-sw-demo__cell">
          <NockerlSwitch checked size="sm" ariaLabel="Small on" onChange={bump} />
          <span className="nk-sw-demo__cap">Small</span>
        </span>
        <span className="nk-sw-demo__cell">
          <NockerlSwitch checked size="md" ariaLabel="Medium on" onChange={bump} />
          <span className="nk-sw-demo__cap">Medium</span>
        </span>
        <span className="nk-sw-inline">
          <InlineToggle onToggle={bump} />
        </span>
      </div>

      <p className="nk-sw-demo__count">
        Toggled <b>{toggles}</b> {toggles === 1 ? 'time' : 'times'}. The island is live.
      </p>
    </div>
  );
}

/** A self-managing inline switch with a leading label: the compact form use. */
function InlineToggle({ onToggle }: { onToggle: () => void }) {
  const [on, setOn] = useState(false);
  return (
    <>
      <span className="nk-sw-inline__label">Stream tokens</span>
      <NockerlSwitch
        checked={on}
        ariaLabel="Stream tokens"
        onChange={(v) => {
          setOn(v);
          onToggle();
        }}
      />
    </>
  );
}
