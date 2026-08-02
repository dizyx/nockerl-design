/**
 * ProgressBarDemo: the live, interactive Nockerl progress-bar island for web.
 *
 * The GENERAL-PURPOSE progress primitive: a determinate linear bar (with %), an
 * indeterminate/streaming bar, a buffer/secondary-progress bar, a segmented/stepped
 * bar, success-complete + error/failed states, sizes, and a DETERMINATE circular
 * ring with a center %. This is NOT the context-gauge (the threshold-banded
 * cyan→amber→red token-budget meter) and NOT the spinner (the indeterminate
 * circular loader). So the linear fill here is the plain cyan accent with NO
 * threshold banding, and the circular form is determinate ONLY.
 *
 * Sourced from the shipped Android app (never the web dashboard):
 *   • LinearProgressIndicator, in chat/ui/TodoWidget.kt + AgentWidget.kt +
 *     ClusterSheet.kt: a DETERMINATE bar, `progress = { animatedProgress }`
 *     (the value interpolates via animateFloatAsState), `.height(3.dp)`/`4.dp`,
 *     `.clip(NockerlProgressTrackShape)` (= RoundedCornerShape(2.dp); see
 *     NockerlShapes.kt `NockerlProgressTrackRadius = 2.dp`), `color = accent`,
 *     `trackColor = colors.cardHairline`. So the REAL bar is squared-off (2px
 *     track radius, the --radius-track token), NOT a pill, and the track is the
 *     card hairline. The indeterminate / buffer / segmented / ring forms are NOT
 *     shipped on Android (its CircularProgressIndicator is indeterminate-only =
 *     the spinner). They are designed ORIGINALLY here from the laws; drift is flagged.
 *
 * Implements the design laws verbatim:
 *   • the TRACK is a recessed WELL (darkest edge token + inner shadow), the
 *     inverse of a card: depth that sinks, never a glow.
 *   • the FILL is FLAT cyan (a subtle top catch-light, NOT a glow); only the
 *     interpolatable WIDTH (or the ring's stroke-dashoffset) animates, and the fill
 *     never tweens. Under prefers-reduced-motion the width still snaps to the new
 *     value (no transition) and the indeterminate slide FREEZES to a quiet state.
 *   • status is NEVER color alone: complete = success fill + a check + "Done";
 *     failed = error fill + a ⚠ glyph + a message.
 *   • the % control composes the real NockerlSlider primitive (role="slider" +
 *     aria-valuenow/min/max/valuetext, focus-visible cyan OUTLINE ring on the thumb);
 *     buttons drive discrete steps. Bars expose role="progressbar"
 *     + aria-valuenow/min/max/valuetext; the indeterminate bar omits valuenow and
 *     sets aria-busy.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * var(--token) (see docs/demo-token-contract.md). The dark stage resolves them;
 * change a token and this demo moves with it. The ring's SVG geometry literals now
 * live inside the NockerlCircularProgress primitive; the demo keeps only transition curves.
 */
import { useState } from 'react';
import { NockerlButton, NockerlCircularProgress, NockerlIcon, NockerlIconButton, NockerlProgressSegments, NockerlProgressTrack, NockerlSlider, type ComposeContract, type ProgressSize, type ProgressTone } from '@dizyx/nockerl-react';

export type { ProgressSize, ProgressTone };

const STYLES = `
.nk-pb-demo { font-family: var(--font-family-sans); color: var(--color-on-card); max-width: 560px; }
.nk-pb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-pb-block + .nk-pb-block { margin-top: var(--space-8); }

/* The readout line: label LEFT, % RIGHT, both on the SAME baseline. */
.nk-pb-read { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-2); }
.nk-pb-read__label { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-card); min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nk-pb-read__pct { font-family: var(--font-family-mono); font-size: var(--font-size-14); font-weight: var(--font-weight-semibold);
  color: var(--color-on-card); flex: 0 0 auto; font-variant-numeric: tabular-nums; }
.nk-pb-read__pct--muted { color: var(--color-on-card-muted); }

/* The track + fill + buffer + indeterminate + segmented recipe now lives in the
   NockerlProgressTrack primitive (primitives/NockerlProgressTrack.tsx), which injects its own CSS. */

/* Status meta under a bar: never color alone (icon + word + the tone). */
.nk-pb-meta { display: inline-flex; align-items: center; gap: var(--space-1); margin-top: var(--space-2);
  font-size: var(--font-size-12); font-weight: var(--font-weight-medium); }
.nk-pb-meta svg { display: block; width: 14px; height: 14px; }
.nk-pb-meta--success { color: var(--color-status-success); }
.nk-pb-meta--error { color: var(--color-status-error); }

/* ── The interactive driver: a real slider + step / state buttons ───────────── */
.nk-pb-driver { margin-top: var(--space-4); padding: var(--space-4) var(--space-5);
  background: var(--color-card-surface2); border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-control); display: flex; flex-direction: column; gap: var(--space-3); }
.nk-pb-driver__row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
.nk-pb-driver__cap { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); }
.nk-pb-driver__val { margin-left: auto; font-family: var(--font-family-mono); font-size: var(--font-size-12); color: var(--color-on-card); }
/* The % control composes the real NockerlSlider primitive (recessed well + lifted cyan
   thumb live in NOCKERL_SLIDER_STYLES); this wrapper just lets it grow in the driver row. */
.nk-pb-driver__slider { flex: 1 1 auto; min-width: 160px; }
/* Step / state buttons now compose the NockerlButton / NockerlIconButton primitives; they own the
   ladder + flash-free feedback + uppercase rule. The group is just a flex wrapper. */
.nk-pb-btn__group { display: inline-flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }

/* ── The ring row: the DETERMINATE circular form now composes the NockerlCircularProgress
   primitive (it owns the track circle + value arc + center %); this is just the layout
   wrapper + the caption below each ring. (Indeterminate circular is the spinner's job.) */
.nk-pb-rings { display: flex; flex-wrap: wrap; gap: var(--space-6) var(--space-8); align-items: center; }
.nk-pb-ring { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.nk-pb-ring__cap { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-normal); color: var(--color-on-card-muted); }

.nk-pb-demo__foot { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-6); }
.nk-pb-demo__foot b { color: var(--color-accent-primary); font-family: var(--font-family-mono); }

@media (prefers-reduced-motion: reduce) {
  /* NockerlButton / NockerlIconButton own their own reduced-motion rules. The track/fill/buffer/
     indeterminate reduced-motion rules live in NockerlProgressTrack; the ring's live in
     NockerlCircularProgress. */
}
`;

// ─── Inline glyphs (the shared NockerlIcon stroke shell, currentColor so each slot tints correctly) ──
const IconCheck = <NockerlIcon name="check" />;
const IconWarn = (
  <NockerlIcon>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" />
  </NockerlIcon>
);

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * A single determinate linear bar: the unit the spec documents. Label LEFT + %
 * RIGHT (baseline-aligned), a recessed track, a flat cyan fill whose width is the
 * value. role="progressbar" + aria-valuenow/min/max/valuetext.
 */
function ProgressBar({
  value,
  label,
  size = 'thin',
  tone = 'accent',
  showPct = true,
}: {
  value: number;
  label: string;
  size?: ProgressSize;
  tone?: ProgressTone;
  showPct?: boolean;
}) {
  const pct = clamp(value);
  return (
    <div>
      <div className="nk-pb-read">
        <span className="nk-pb-read__label">{label}</span>
        {showPct && <span className="nk-pb-read__pct">{pct}%</span>}
      </div>
      <NockerlProgressTrack
        value={pct}
        size={size}
        tone={tone}
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${label}, ${pct}%`}
      />
    </div>
  );
}

/**
 * The interactive showcase mounted on the Progress bar page: a live determinate
 * bar (slider + ±10 + complete/fail), an indeterminate sliding bar, a buffer bar,
 * a segmented/stepped bar, the two sizes, success-complete + error/failed states,
 * and a determinate circular ring with a center %. Every value is a token.
 */
/** LEAF: composes NockerlProgressTrack for the bar; the % readout is data, not a slot. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default function ProgressBarDemo() {
  const [pct, setPct] = useState(64);
  const [phase, setPhase] = useState<'live' | 'done' | 'failed'>('live');
  const [step, setStep] = useState(3); // segmented: filled cells
  const SEGMENTS = 5;

  // Buffer bar: a lighter secondary buffer that stays ahead of the primary fill.
  const buffer = clamp(pct + 22);

  const tone: ProgressTone = phase === 'done' ? 'success' : phase === 'failed' ? 'error' : 'accent';
  const liveLabel = phase === 'done' ? 'Export complete' : phase === 'failed' ? 'Export failed' : 'Exporting session…';

  // Ring set: three determinate rings at fixed values so the form reads at a glance.
  const RINGS: Array<{ value: number; cap: string }> = [
    { value: 25, cap: 'Indexing' },
    { value: pct, cap: 'Export' }, // tracks the live driver
    { value: 100, cap: 'Done' },
  ];

  return (
    <div className="nk-pb-demo">
      <style>{STYLES}</style>

      {/* ── DETERMINATE: live, with a real slider + state buttons ───────────── */}
      <div className="nk-pb-block">
        <p className="nk-pb-demo__lbl">Determinate: drag the slider; mark it complete or failed</p>
        <ProgressBar
          value={phase === 'done' ? 100 : pct}
          label={liveLabel}
          size="thick"
          tone={tone}
        />
        {phase === 'done' && (
          <span className="nk-pb-meta nk-pb-meta--success">{IconCheck} Done · 100%</span>
        )}
        {phase === 'failed' && (
          <span className="nk-pb-meta nk-pb-meta--error">{IconWarn} Upload failed at {pct}%: network error</span>
        )}

        <div className="nk-pb-driver">
          <div className="nk-pb-driver__row">
            <span className="nk-pb-driver__cap">Progress</span>
            <span className="nk-pb-driver__val">{phase === 'done' ? 100 : pct}%</span>
          </div>
          <div className="nk-pb-driver__row">
            <div className="nk-pb-driver__slider">
              <NockerlSlider
                value={pct}
                min={0}
                max={100}
                unit="%"
                label="Drag progress from 0 to 100 percent"
                disabled={phase === 'done'}
                onChange={(v) => { setPct(clamp(v)); setPhase('live'); }}
              />
            </div>
            <span className="nk-pb-btn__group">
              <NockerlIconButton icon={<NockerlIcon name="minus" />} label="Decrease 10 percent" size={32} onClick={() => { setPct((p) => clamp(p - 10)); setPhase('live'); }} />
              <NockerlIconButton icon={<NockerlIcon name="plus" />} label="Increase 10 percent" size={32} onClick={() => { setPct((p) => clamp(p + 10)); setPhase('live'); }} />
              <NockerlButton text="Complete" variant="secondary" size="sm" onClick={() => setPhase((p) => (p === 'done' ? 'live' : 'done'))} />
              <NockerlButton text="Fail" variant="secondary" size="sm" onClick={() => setPhase((p) => (p === 'failed' ? 'live' : 'failed'))} />
            </span>
          </div>
        </div>
      </div>

      {/* ── INDETERMINATE: a sliding segment; no value, aria-busy ───────────── */}
      <div className="nk-pb-block">
        <p className="nk-pb-demo__lbl">Indeterminate: work of unknown length (streaming). Reduced-motion freezes it</p>
        <div className="nk-pb-read">
          <span className="nk-pb-read__label">Connecting to gateway…</span>
          <span className="nk-pb-read__pct nk-pb-read__pct--muted" aria-hidden="true">n/a</span>
        </div>
        <NockerlProgressTrack
          size="thick"
          indeterminate
          role="progressbar"
          aria-label="Connecting to gateway"
          aria-busy="true"
        />
      </div>

      {/* ── BUFFER: primary fill + a lighter secondary buffer behind it ─────── */}
      <div className="nk-pb-block">
        <p className="nk-pb-demo__lbl">Buffer: a lighter secondary track (e.g. received) ahead of the primary (played)</p>
        <div className="nk-pb-read">
          <span className="nk-pb-read__label">Streaming response</span>
          <span className="nk-pb-read__pct">{clamp(pct)}%</span>
        </div>
        <NockerlProgressTrack
          value={clamp(pct)}
          size="thick"
          tone="accent"
          buffer={buffer}
          role="progressbar"
          aria-label="Streaming response"
          aria-valuenow={clamp(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${clamp(pct)}% played, ${buffer}% buffered`}
        />
      </div>

      {/* ── SEGMENTED / stepped: N cells, M filled ─────────────────────────── */}
      <div className="nk-pb-block">
        <p className="nk-pb-demo__lbl">Segmented: discrete steps (step {step} of {SEGMENTS})</p>
        <div className="nk-pb-read">
          <span className="nk-pb-read__label">Deploy pipeline</span>
          <span className="nk-pb-read__pct">{step} / {SEGMENTS}</span>
        </div>
        <NockerlProgressSegments
          total={SEGMENTS}
          filled={step}
          role="progressbar"
          aria-label="Deploy pipeline"
          aria-valuenow={step}
          aria-valuemin={0}
          aria-valuemax={SEGMENTS}
          aria-valuetext={`Step ${step} of ${SEGMENTS}`}
        />
        <div className="nk-pb-driver">
          <div className="nk-pb-driver__row">
            <span className="nk-pb-driver__cap">Step</span>
            <span className="nk-pb-btn__group" style={{ marginLeft: 'auto' }}>
              <NockerlButton text="Back" variant="secondary" size="sm" ariaLabel="Previous step" onClick={() => setStep((s) => Math.max(0, s - 1))} />
              <NockerlButton text="Next" variant="secondary" size="sm" ariaLabel="Next step" onClick={() => setStep((s) => Math.min(SEGMENTS, s + 1))} />
            </span>
          </div>
        </div>
      </div>

      {/* ── SIZES: thin (app default) + thick ──────────────────────────────── */}
      <div className="nk-pb-block">
        <p className="nk-pb-demo__lbl">Sizes: thin (the app's 3 to 4dp) and thick</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <ProgressBar value={72} label="Thin" size="thin" />
          <ProgressBar value={72} label="Thick" size="thick" />
        </div>
      </div>

      {/* ── STATUS: complete + failed, color is never the only signal ───────── */}
      <div className="nk-pb-block">
        <p className="nk-pb-demo__lbl">Status: complete and failed (icon + text, never color alone)</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div>
            <ProgressBar value={100} label="Snapshot uploaded" size="thick" tone="success" />
            <span className="nk-pb-meta nk-pb-meta--success">{IconCheck} Done</span>
          </div>
          <div>
            <ProgressBar value={80} label="Build artifacts" size="thick" tone="error" />
            <span className="nk-pb-meta nk-pb-meta--error">{IconWarn} Failed at 80%: exited 1</span>
          </div>
        </div>
      </div>

      {/* ── RING: DETERMINATE circular with a center % (NOT a spinner) ──────── */}
      <div className="nk-pb-block">
        <p className="nk-pb-demo__lbl">Circular: determinate ring with a center % (indeterminate circular is the spinner)</p>
        <div className="nk-pb-rings">
          {RINGS.map((r, i) => {
            const v = clamp(r.value);
            const ringTone: ProgressTone = v >= 100 ? 'success' : 'accent';
            return (
              <div className="nk-pb-ring" key={i}>
                <NockerlCircularProgress value={v} size={88} thickness={8} tone={ringTone} label={r.cap} showValue />
                <span className="nk-pb-ring__cap">{r.cap}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="nk-pb-demo__foot">
        Track + fill are all <b>var(--token)</b>. The track is a recessed well at <b>radius-track</b> (the app's 2dp squared shape), and the fill is the plain cyan accent with no threshold banding (that is the context gauge). The width grows; the fill never tweens. The island is live.
      </p>
    </div>
  );
}
