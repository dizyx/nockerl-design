/**
 * SpinnerDemo: the live, interactive Nockerl spinner island for the web.
 *
 * The spinner is the INDETERMINATE CIRCULAR loader for work of unknown length.
 * It is deliberately distinct from its neighbours:
 *   • progress-bar  → determinate / indeterminate LINEAR + a DETERMINATE ring
 *   • context-gauge → threshold-banded token-budget meter
 *   • skeleton      → content-shaped placeholders
 * So this component has NO percentage, NO track value, NO center number: just a
 * spinning cyan arc that says "still working".
 *
 * Sourced from the real apps, never the web dashboard:
 *   • Android (canonical): Material `CircularProgressIndicator`, indeterminate,
 *     across the app: 12dp (stroke 1.5dp), 20 to 24dp (stroke 2dp), and a larger
 *     centered form. Color defaults to the cyan accent; in-card it is `accent`,
 *     in-button it is `LocalContentColor.current` (the button's own content
 *     color). Centered states wrap it in a Box(contentAlignment = Center).
 *     (MessageList, FileViewer, ToolAdapterCards, ChatInputBar, LoginScreen.)
 *   • Voice (Swift): `ProgressView().controlSize(.small).tint(accent)` beside a
 *     "Transcribing…" label in the RecordingHUD.
 *
 * Implements the design laws verbatim:
 *   • the arc is the cyan accent; the (optional) track is a recessed muted ring,
 *     NOT a glow. Depth on the OVERLAY comes from a neutral shadow + a scrim,
 *     never a colored halo.
 *   • motion animates an interpolatable property only (rotation transform); the
 *     fill never tweens.
 *   • prefers-reduced-motion: the infinite spin STOPS. It degrades to a static
 *     partial arc with a gentle, slow opacity pulse (non-distracting), never an
 *     infinite fast spin.
 *   • the interactive toggles are real buttons with focus-visible cyan rings.
 *   • the spinner carries role="status" + aria-label; the loading regions use
 *     aria-live="polite" so a state change is announced once.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a `var(--token)`. The
 * only literals are pure SVG/arc geometry (viewBox, the 24-unit coordinate space,
 * stroke-dash math) and transition curves, exactly what tokens don't cover.
 */
import { useState } from 'react';
import { NockerlButton, NockerlSpinner, type NockerlSpinnerSize } from '@dizyx/nockerl-react';

// Demo-only scaffolding CSS. The NockerlSpinner recipe (.nk-spin*, its @keyframes, and the
// spinner half of the reduced-motion block) now lives in the primitive
// (NOCKERL_SPINNER_STYLES) and is injected by the component; the in-button loading state and the
// overlay on/off toggle are the <NockerlButton> primitive (its own .nk-btn recipe + spinner +
// is-pressed selection wash). What stays here is the showcase chrome: the rows/labels,
// inline-in-text, the stage/center/overlay, the surface swatches, and the layout
// scaffolding.
const STYLES = `
.nk-spin-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }

/* ── spinner + label (baseline-aligned beside the arc) ── */
.nk-spin-row { display: inline-flex; align-items: center; gap: var(--space-2); }
.nk-spin-row__lbl { font-size: var(--font-size-14); line-height: var(--font-line-height-20); color: var(--color-on-card-muted); }

/* ── inline within a line of running text ── */
.nk-spin-inline { font-size: var(--font-size-14); line-height: var(--font-line-height-22);
  color: var(--color-on-card-muted); max-width: 52ch; }
.nk-spin-inline .nk-spin { margin: 0 var(--space-0-5); }
.nk-spin-inline b { color: var(--color-on-card); font-weight: var(--font-weight-medium); }

/* ── a contained stage (a content region): a card the loader sits inside ── */
.nk-spin-stage {
  position: relative;
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card);
  background: var(--color-card-surface1);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  min-height: 168px;
  overflow: hidden;
}
/* centered loading state, truly centered both axes */
.nk-spin-center { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: var(--space-3); text-align: center; }
.nk-spin-center__lbl { font-size: var(--font-size-12); color: var(--color-on-card-muted); }

/* the "real" content that the overlay dims (mock rows) */
.nk-spin-content { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
.nk-spin-content__line { height: var(--space-3); border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-on-card) 12%, transparent); }
.nk-spin-content__line--w70 { width: 70%; }
.nk-spin-content__line--w90 { width: 90%; }
.nk-spin-content__line--w50 { width: 50%; }
.nk-spin-content__line--w80 { width: 80%; }
.nk-spin-content--dim { transition: filter .2s, opacity .2s; }
.nk-spin-content--dim.is-loading { filter: blur(1px); opacity: .5; }

/* the OVERLAY scrim: a neutral dim + a small floating spinner card. NOT a glow. */
.nk-spin-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--color-scrim) 55%, transparent); backdrop-filter: blur(1px); }
.nk-spin-overlay__card {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-control);
  background: var(--color-card-surface2);
  color: var(--color-on-card);
  font-size: var(--font-size-12); font-weight: var(--font-weight-medium);
  box-shadow: 0 var(--elevation-level2) 14px -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}

/* ── surface swatches: arc on dark card vs on a light surface ── */
.nk-spin-surfaces { display: flex; gap: var(--space-3); flex-wrap: wrap; }
.nk-spin-surf { display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-3) var(--space-4); border-radius: var(--radius-control);
  border: var(--space-px) solid var(--color-card-hairline); font-size: var(--font-size-12); }
.nk-spin-surf--dark { background: var(--color-canvas); color: var(--color-on-canvas-muted); }
.nk-spin-surf--light { background: var(--color-card-surface3); color: var(--color-on-card-muted); }

/* ── reduced motion: still the demo-only transitions (the arc spin-stop + static
   pulse now lives in the NockerlSpinner primitive's own reduced-motion block) ── */
@media (prefers-reduced-motion: reduce) {
  .nk-spin-content--dim { transition: none; }
}

/* ── layout scaffolding ── */
.nk-spin-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-spin-demo__sec + .nk-spin-demo__sec { margin-top: var(--space-6); }
.nk-spin-demo__row { display: flex; gap: var(--space-5); flex-wrap: wrap; align-items: center; }
.nk-spin-demo__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); }
.nk-spin-demo__size { display: inline-flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.nk-spin-demo__size span { font-size: var(--font-size-10); color: var(--color-on-card-muted); }
.nk-spin-demo__count { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-6); }
.nk-spin-demo__count b { color: var(--color-accent-primary); }
`;

const SIZES: NockerlSpinnerSize[] = ['xs', 'sm', 'md', 'lg'];

/**
 * The interactive showcase mounted on the NockerlSpinner page: sizes, spinner + label,
 * inline-in-text, centered-in-a-region, an overlay-over-dimmed-content (toggle),
 * the in-button loading state (the <NockerlButton> primitive's own loading/loadingText),
 * and the arc on a dark vs a light surface. Everything is token-driven; the spin
 * stops under reduced motion.
 */
export default function SpinnerDemo() {
  const [overlay, setOverlay] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saves, setSaves] = useState(0);

  // Simulate a finite in-button load, then settle (proves the island is live).
  const runSave = () => {
    if (saving) return;
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setSaves((n) => n + 1);
    }, 1600);
  };

  return (
    <div className="nk-spin-demo">
      <style>{STYLES}</style>

      {/* ── Sizes ── */}
      <section className="nk-spin-demo__sec">
        <p className="nk-spin-demo__lbl">Sizes: stroke scales with the diameter</p>
        <div className="nk-spin-demo__row">
          {SIZES.map((s) => (
            <span key={s} className="nk-spin-demo__size">
              <NockerlSpinner size={s} label={`Loading (${s})`} />
              <span>{s}</span>
            </span>
          ))}
          <span className="nk-spin-demo__size">
            <NockerlSpinner size="md" track label="Loading (with track)" />
            <span>md · track</span>
          </span>
        </div>
      </section>

      {/* ── With a label ── */}
      <section className="nk-spin-demo__sec">
        <p className="nk-spin-demo__lbl">With a label, baseline-aligned beside the arc</p>
        <div className="nk-spin-demo__row" aria-live="polite">
          <span className="nk-spin-row">
            <NockerlSpinner size="sm" label="Loading" />
            <span className="nk-spin-row__lbl">Loading sessions…</span>
          </span>
          <span className="nk-spin-row">
            <NockerlSpinner size="sm" label="Transcribing" />
            <span className="nk-spin-row__lbl">Transcribing…</span>
          </span>
        </div>
      </section>

      {/* ── Inline within text ── */}
      <section className="nk-spin-demo__sec">
        <p className="nk-spin-demo__lbl">Inline within a line of running text</p>
        <p className="nk-spin-inline">
          Connecting to the gateway
          <NockerlSpinner size="xs" label="Connecting" />
          and resuming <b>nockerl-design · docs site</b>. This can take a moment.
        </p>
      </section>

      {/* ── Centered + NockerlOverlay (two contained stages) ── */}
      <section className="nk-spin-demo__sec">
        <p className="nk-spin-demo__lbl">Centered in a region · NockerlOverlay over dimmed content</p>
        <div className="nk-spin-demo__grid">
          {/* Centered loading state; the region has no content yet */}
          <div className="nk-spin-stage" role="region" aria-label="File preview" aria-busy="true">
            <div className="nk-spin-center" aria-live="polite">
              <NockerlSpinner size="lg" label="Loading file" />
              <span className="nk-spin-center__lbl">Loading file…</span>
            </div>
          </div>

          {/* NockerlOverlay over existing (dimmed) content, toggleable */}
          <div className="nk-spin-stage" role="region" aria-label="Session list" aria-busy={overlay}>
            <div className={`nk-spin-content nk-spin-content--dim${overlay ? ' is-loading' : ''}`} aria-hidden={overlay}>
              <div className="nk-spin-content__line nk-spin-content__line--w70" />
              <div className="nk-spin-content__line nk-spin-content__line--w90" />
              <div className="nk-spin-content__line nk-spin-content__line--w50" />
              <div className="nk-spin-content__line nk-spin-content__line--w80" />
            </div>
            {overlay && (
              <div className="nk-spin-overlay" aria-live="polite">
                <div className="nk-spin-overlay__card">
                  <NockerlSpinner size="sm" label="Refreshing" />
                  Refreshing…
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="nk-spin-demo__row" style={{ marginTop: 'var(--space-3)' }}>
          {/* Genuine on/off toggle → the <NockerlButton> TOGGLE mode: pressed renders
              aria-pressed + the cyan SELECTION wash (design-laws section 6). */}
          <NockerlButton
            text={overlay ? 'Hide overlay' : 'Show overlay'}
            variant="tertiary"
            size="sm"
            pressed={overlay}
            onClick={() => setOverlay((v) => !v)}
          />
        </div>
      </section>

      {/* ── In-button loading ── */}
      <section className="nk-spin-demo__sec">
        <p className="nk-spin-demo__lbl">In a button: label swap, on-accent arc, blocks re-click</p>
        <div className="nk-spin-demo__row">
          <NockerlButton text="Save changes" variant="primary" loading={saving} loadingText="Saving…" onClick={runSave} />
          <NockerlButton text="Working" variant="secondary" loading />
        </div>
      </section>

      {/* ── Surfaces ── */}
      <section className="nk-spin-demo__sec">
        <p className="nk-spin-demo__lbl">On a dark vs a light surface: same cyan arc</p>
        <div className="nk-spin-surfaces">
          <span className="nk-spin-surf nk-spin-surf--dark">
            <NockerlSpinner size="sm" label="Loading on dark" /> on canvas
          </span>
          <span className="nk-spin-surf nk-spin-surf--light">
            <NockerlSpinner size="sm" label="Loading on light" /> on a lifted card
          </span>
        </div>
      </section>

      <p className="nk-spin-demo__count" aria-live="polite">
        Saved <b>{saves}</b> {saves === 1 ? 'time' : 'times'} · overlay {overlay ? 'on' : 'off'}. The island is live.
      </p>
    </div>
  );
}
