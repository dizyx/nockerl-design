/**
 * SliderDemo: the live, interactive Nockerl slider / range-input island for web.
 *
 * The DEDICATED, canonical slider: a recessed track + a draggable lifted thumb that
 * SETS a value (an INPUT), distinct from the progress-bar (output/status) and the
 * context-gauge (banded token-budget meter). It reuses their shared vocabulary (the
 * recessed well + the cyan active fill); the new piece is the THUMB, a lifted disc
 * (neutral shadow + top catch-light + a cyan core, never a glow).
 *
 * The NockerlSlider + NockerlRangeSlider components, their value/step math, the drag + keyboard
 * logic, and the full recipe CSS (NOCKERL_SLIDER_STYLES) now live in the primitive
 * (../primitives/NockerlSlider). This island just composes them into a showcase. See the
 * primitive for the sourcing (shipped Android Material `NockerlSlider` in
 * chat/ui/SamplingAdvancedSettings.kt + the real chat/domain/Sampling.kt
 * `SAMPLING_KNOB_SPECS` ranges) and the design laws encoded there.
 *
 * Drift flagged on the page: the brief said "Temperature 0 to 2 step 0.1"; the SHIPPED
 * app is 0.1 to 2.0 in steps of 0.05, and real values win. The two-thumb RANGE, the
 * value bubble, and explicit tick marks are NOT shipped on Android (single-thumb
 * Material NockerlSlider only), so they were designed ORIGINALLY here.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a var(--token)
 * (docs/demo-token-contract.md). The dark stage resolves them. Literals remain only for
 * thumb / track / bubble geometry + transition curves.
 */
import { useState } from 'react';
import { NockerlRangeSlider, NockerlSlider, fmt } from '@dizyx/nockerl-react';

// Demo-only scaffolding CSS. The NockerlSlider recipe (.nk-sl*, .nk-sl__*: the lane / track /
// fill / thumb / value bubble / tick marks / ticklabels / focus ring / disabled, plus
// the reduced-motion freeze) lives in the primitive (NOCKERL_SLIDER_STYLES) and is injected
// by the component. What stays here is the showcase chrome: the demo wrapper, the
// eyebrow labels, the readout line, the min/max scale row, and the footnote.
const STYLES = `
.nk-sl-demo { font-family: var(--font-family-sans); color: var(--color-on-card); max-width: 560px; }
.nk-sl-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-sl-block + .nk-sl-block { margin-top: var(--space-8); }

/* The readout line: label LEFT, value RIGHT (mono), on the SAME baseline. */
.nk-sl-read { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); }
.nk-sl-read__label { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-card); }
.nk-sl-read__val { font-family: var(--font-family-mono); font-size: var(--font-size-14); font-weight: var(--font-weight-semibold);
  color: var(--color-on-card); font-variant-numeric: tabular-nums; }
.nk-sl-read__val em { font-style: normal; color: var(--color-on-card-muted); font-weight: var(--font-weight-medium); }
.nk-sl-read__val--accent { color: var(--color-accent-primary); }

/* The min/max scale row under a plain slider: mono / size-10 / muted, justified ends. */
.nk-sl-scale { display: flex; justify-content: space-between;
  font-family: var(--font-family-mono); font-size: var(--font-size-10); color: var(--color-on-card-muted);
  margin-top: var(--space-2); }

.nk-sl-demo__foot { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-6); }
.nk-sl-demo__foot b { color: var(--color-accent-primary); font-family: var(--font-family-mono); }
`;

/** The label-LEFT / value-RIGHT readout line above each slider (baseline-aligned). */
function Readout({ label, children, accent, top }: { label: string; children: React.ReactNode; accent?: boolean; top?: boolean }) {
  return (
    <div className="nk-sl-read" style={top ? { marginTop: 'var(--space-5)' } : undefined}>
      <span className="nk-sl-read__label">{label}</span>
      {children !== undefined && (
        <span className={`nk-sl-read__val${accent ? ' nk-sl-read__val--accent' : ''}`}>{children}</span>
      )}
    </div>
  );
}

/** The min/max scale row under a plain slider. */
const Scale = ({ lo, hi }: { lo: string; hi: string }) => (
  <div className="nk-sl-scale" aria-hidden="true"><span>{lo}</span><span>{hi}</span></div>
);

/**
 * The interactive showcase mounted on the NockerlSlider page: a plain single-value slider
 * with a live readout; a stepped slider with tick marks + snapping; a two-thumb range
 * that can't cross; the REAL sampling sliders (Temperature 0.1 to 2.0 step 0.05, Top-P
 * 0 to 1 step 0.01, Top-K 0 to 200 step 1) from the Android app; a disabled slider; and the two sizes. Drag,
 * tab to a thumb, and use the arrows. Every value is a token.
 */
export default function SliderDemo() {
  const [vol, setVol] = useState(48);
  const [quality, setQuality] = useState(3);
  const [range, setRange] = useState({ lo: 20, hi: 70 });
  const [temp, setTemp] = useState(1.0); // universal Qwen default (Sampling.kt hint)
  const [topP, setTopP] = useState(1.0); // 1.0 = no nucleus filter
  const [topK, setTopK] = useState(40);

  return (
    <div className="nk-sl-demo">
      <style>{STYLES}</style>

      {/* ── SINGLE: live readout, drag or arrow ───────────────────────────── */}
      <div className="nk-sl-block">
        <p className="nk-sl-demo__lbl">Single value: drag the thumb, or tab to it and use the arrows</p>
        <Readout label="Output volume">{vol}<em>%</em></Readout>
        <NockerlSlider value={vol} onChange={setVol} min={0} max={100} step={1} unit="%" label="Output volume" />
        <Scale lo="0%" hi="100%" />
      </div>

      {/* ── STEPPED: tick marks + snapping + a value bubble on the thumb ───── */}
      <div className="nk-sl-block">
        <p className="nk-sl-demo__lbl">Stepped: snaps to ticks; the value bubble rides the thumb on hover / focus / drag</p>
        <Readout label="Render quality">{quality}<em> / 6</em></Readout>
        <NockerlSlider value={quality} onChange={setQuality} min={0} max={6} step={1} label="Render quality" ticks />
      </div>

      {/* ── RANGE: two thumbs that can't cross; fill sits BETWEEN ──────────── */}
      <div className="nk-sl-block">
        <p className="nk-sl-demo__lbl">Range: two thumbs (min / max) that can't cross; each is its own labeled slider</p>
        <Readout label="Price band">${range.lo}<em> to </em>${range.hi}</Readout>
        <NockerlRangeSlider low={range.lo} high={range.hi} onChange={(lo, hi) => setRange({ lo, hi })} min={0} max={100} step={5} unit="$" label="Price band" />
        <Scale lo="$0" hi="$100" />
      </div>

      {/* ── REAL SAMPLING: the Android SAMPLING_KNOB_SPECS ranges verbatim ─── */}
      <div className="nk-sl-block">
        <p className="nk-sl-demo__lbl">Sampling: the real Local Engine knob ranges (Sampling.kt); value is mono, accent when set</p>
        <Readout label="Temperature" accent>{fmt(temp, 0.05)}</Readout>
        <NockerlSlider value={temp} onChange={setTemp} min={0.1} max={2.0} step={0.05} label="Temperature" />
        <Readout label="Top-P (nucleus)" accent top>{fmt(topP, 0.01)}</Readout>
        <NockerlSlider value={topP} onChange={setTopP} min={0} max={1} step={0.01} label="Top-P (nucleus)" />
        <Readout label="Top-K" accent top>{fmt(topK, 1)}</Readout>
        <NockerlSlider value={topK} onChange={setTopK} min={0} max={200} step={1} label="Top-K" />
      </div>

      {/* ── DISABLED + SIZES ───────────────────────────────────────────────── */}
      <div className="nk-sl-block">
        <p className="nk-sl-demo__lbl">Disabled: inert, still legible</p>
        <Readout label="Locked by policy">60<em>%</em></Readout>
        <NockerlSlider value={60} onChange={() => {}} min={0} max={100} step={1} unit="%" label="Locked by policy" disabled />
      </div>

      <div className="nk-sl-block">
        <p className="nk-sl-demo__lbl">Sizes: sm and md</p>
        <Readout label="Small">{undefined}</Readout>
        <NockerlSlider value={vol} onChange={setVol} min={0} max={100} step={1} unit="%" label="Small slider" size="sm" />
        <Readout label="Medium" top>{undefined}</Readout>
        <NockerlSlider value={vol} onChange={setVol} min={0} max={100} step={1} unit="%" label="Medium slider" size="md" />
      </div>

      <p className="nk-sl-demo__foot">
        Track + fill + thumb are all <b>var(--token)</b>. The track is a recessed well, the fill is the plain cyan accent, the thumb is a lifted disc (neutral shadow + catch-light, never a glow). Only transform / shadow / brightness move; no fill tweens. The island is live.
      </p>
    </div>
  );
}
