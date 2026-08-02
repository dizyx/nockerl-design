/**
 * ContextGaugeDemo: the live, interactive Nockerl context-window / token-budget
 * gauge island for web. The DEDICATED, NAMED context-usage meter (not a charting
 * kit): used/total tokens with the real status bands + a numeric readout.
 *
 * Sourced verbatim from the shipped Android app (never the web dashboard):
 *   • Thresholds, from `chat/ui/SessionChipsBar.kt`: CONTEXT_LOW_THRESHOLD = 0.60,
 *     CONTEXT_HIGH_THRESHOLD = 0.85. The context line is colored cyan (< .60,
 *     the harness accent) → yellow/amber (< .85) → red (>= .85) over a faint
 *     empty track (`canvasEdge`). Warm = status; cyan only while healthy.
 *   • Token formatting, from `chat/ui/ChatUtils.kt` `formatTokenCount`: INTEGER
 *     buckets of `>=1M -> "{n/1M}M"`, `>=1K -> "{n/1K}K"`, else the raw count
 *     (so 82_000 -> "82K", 200_000 -> "200K"). (No decimals; see the drift note.)
 *   • Readout / percent, from `chat/domain/SessionConfig.kt` ContextUsage
 *     (`utilizationPercent = totalTokens / contextWindow * 100`) +
 *     `chat/ui/AgentTranscriptPanel.kt` ("· N% ctx"). Default contextWindow
 *     = 200_000 (`SessionStateSseHandler.kt`).
 *   • Gate, from `chat/ui/ChatIndicators.kt` `shouldShowContextGauge`: only a
 *     *managed* session reports utilization; the line is never faked.
 *
 * Implements the design laws verbatim:
 *   • the CARD lifts (neutral shadow + top catch-light, never a glow); the gauge
 *     fills are FLAT inside it. Depth lives in the card. Card radius = 16.
 *   • brand cyan is the HEALTHY band only; the warm STATUS ladder carries elevated
 *     + critical (status = warm, never decorative).
 *   • flash-free: the fill color is STATIC per band. The fill GROWS on an
 *     interpolatable prop only (width / stroke-dashoffset), frozen under
 *     prefers-reduced-motion. The band recolor is a hard cut, never a tween.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   • the track is a recessed well (inner shadow on the darkest edge token); any
 *     contrast label on a cyan fill is var(--color-on-accent).
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them;
 * change a token and this demo moves with it. Literals remain only for the ring's
 * SVG geometry (coordinate space, viewBox) + transition curves.
 */
import { useState } from 'react';
import { NockerlButton, GAUGE_BAND_FILL, GAUGE_BAND_WORD, NockerlContextChip, NockerlGauge, NockerlIcon, NockerlSlider, NockerlSurface, gaugeBand, type ComposeContract } from '@dizyx/nockerl-react';

import { formatTokenCount } from './format';

// Thresholds + the band model (color/word/threshold semantics from SessionChipsBar.kt
// CONTEXT_LOW/HIGH_THRESHOLD) now live in the NockerlGauge primitive; we reuse its exports so
// our chrome (readout dot/word, legend, slider value) stays in lock-step with the meter.

// Compact token count comes from the shared `./format` util (one canonical impl; see
// docs/audit-2-code.md). Called with one arg here, so it uses the default
// decimals = 0 = Android-exact integer buckets via floor: 82_000 -> "82K",
// 200_000 -> "200K", 1_240_000 -> "1M", identical to the prior local copy.

/** The canonical readout: "82K / 200K · 41%" (formatTokenCount + utilization). */
function readout(used: number, total: number): string {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  return `${formatTokenCount(used)} / ${formatTokenCount(total)} · ${pct}%`;
}

const STYLES = `
.nk-ctx-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }
.nk-ctx-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-ctx-grid { display: grid; gap: var(--space-5); grid-template-columns: 1fr; }
@media (min-width: 720px) { .nk-ctx-grid--2 { grid-template-columns: 3fr 2fr; } }
/* The CARD: depth lives here, lit from above (neutral shadow + top catch-light).
   Bg / hairline / card radius / sheen come from the NockerlSurface primitive; only padding +
   the off-ladder drop shadow stay. */
.nk-ctx-card {
  padding: var(--space-4) var(--space-5) var(--space-5);
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen);
}
.nk-ctx-card__head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }
.nk-ctx-card__title { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-card); margin: 0; }
.nk-ctx-card__engine { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-ctx-card__engine svg { display: block; width: 14px; height: 14px; }

/* ── Linear context bar: the named meter form ───────────────────────────────── */
.nk-bar-block { display: flex; flex-direction: column; gap: var(--space-3); }
/* Readout: label baseline-aligned to the figure; figure is MONO. */
.nk-bar-read { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
.nk-bar-read__fig { font-family: var(--font-family-mono); font-size: var(--font-size-20);
  line-height: var(--font-line-height-24); font-weight: var(--font-weight-bold); color: var(--color-on-card); }
.nk-bar-read__fig em { font-style: normal; color: var(--color-on-card-muted); font-weight: var(--font-weight-medium); }
.nk-bar-read__state { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-12);
  font-weight: var(--font-weight-semibold); letter-spacing: var(--font-tracking-tight); text-transform: uppercase; }
.nk-bar-read__dot { width: 8px; height: 8px; border-radius: var(--radius-pill); flex: 0 0 auto; }
/* The TRACK + FILL + threshold ticks now live in the NockerlGauge primitive (.nk-gauge-bar*). */
.nk-bar-scale { display: flex; justify-content: space-between; font-family: var(--font-family-mono);
  font-size: var(--font-size-10); color: var(--color-on-card-muted); }

/* ── Ring / arc gauge form ───────────────────────────────────────────────────── */
/* The ring SVG itself (.nk-gauge*) now lives in the NockerlGauge primitive; only the side
   chrome (count + state) stays here. */
.nk-ring-wrap { display: flex; align-items: center; gap: var(--space-5); }
.nk-ring__side { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
.nk-ring__count { font-family: var(--font-family-mono); font-size: var(--font-size-14); color: var(--color-on-card); }
.nk-ring__count em { font-style: normal; color: var(--color-on-card-muted); }
.nk-ring__state { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-12);
  font-weight: var(--font-weight-semibold); text-transform: uppercase; letter-spacing: var(--font-tracking-tight); }
.nk-ring__dot { width: 8px; height: 8px; border-radius: var(--radius-pill); flex: 0 0 auto; }

/* ── Band legend (shared) ────────────────────────────────────────────────────── */
.nk-bands { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); margin-top: var(--space-4); }
.nk-bands__item { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-bands__item b { color: var(--color-on-card); font-family: var(--font-family-mono); font-weight: var(--font-weight-medium); }
.nk-bands__dot { width: 8px; height: 8px; border-radius: var(--radius-pill); flex: 0 0 auto; }

/* ── Inline chip strip: the SessionChipsBar session chip ────────────────────── */
/* The chip itself (pill + label row + the context LINE INSIDE the pill) is the shared
   package NockerlContextChip canon (.nk-cchip*, self-injected), the SAME chip the
   Floating pills island uses (Dashboard ). Only the row wrapper stays local. */
.nk-chips { display: flex; flex-wrap: wrap; gap: var(--space-3); }

/* ── Interactive driver: a real slider + step buttons ───────────────────────── */
.nk-driver { margin-top: var(--space-5); padding: var(--space-4) var(--space-5);
  background: var(--color-card-surface2); border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-control); display: flex; flex-direction: column; gap: var(--space-3); }
.nk-driver__row { display: flex; align-items: center; gap: var(--space-3); }
.nk-driver__cap { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); }
.nk-driver__val { margin-left: auto; font-family: var(--font-family-mono); font-size: var(--font-size-12); color: var(--color-on-card); }
/* The NockerlSlider primitive owns the recessed well + lifted cyan thumb; this wrapper just
   lets it grow beside the step buttons in the driver row. */
.nk-driver__slider { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; }
.nk-step { display: flex; flex-wrap: nowrap; align-items: center; gap: var(--space-2); }

.nk-ctx-demo__foot { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-ctx-demo__foot b { color: var(--color-accent-primary); font-family: var(--font-family-mono); }
/* The inline chip strip's motion (context line + press) is frozen by the chip's own styles. */
`;

// ── Inline glyphs (the shared NockerlIcon primitive, currentColor so each slot tints correctly).
//    These are leading GLYPHS (cloud = Cloud Agent, chip = Local Engine), not the `NockerlChip`
//    primitive, and named *Glyph so they never shadow a primitive (docs/audit-2-code.md). ───
const Cloud = (
  <NockerlIcon path="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.34 9.5 4 4 0 0 0 7 17.5" />
);
const ChipGlyph = (
  <NockerlIcon>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <path d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2" />
  </NockerlIcon>
);

/** Engine row: the harness identity (cloud = Cloud Agent, chip = Local Engine). */
const TOTAL = 200_000; // default contextWindow, from SessionStateSseHandler.kt

// ── The reusable named gauge: linear bar form ─────────────────────────────────
function ContextBar({ used, total }: { used: number; total: number }) {
  const ratio = total > 0 ? Math.min(1, used / total) : 0;
  const band = gaugeBand(ratio);
  const pct = Math.round(ratio * 100);
  return (
    <div className="nk-bar-block">
      <div className="nk-bar-read">
        <span className="nk-bar-read__fig" aria-hidden="true">
          {formatTokenCount(used)}<em> / {formatTokenCount(total)} · {pct}%</em>
        </span>
        <span className="nk-bar-read__state" style={{ color: GAUGE_BAND_FILL[band] }}>
          <span className="nk-bar-read__dot" style={{ background: GAUGE_BAND_FILL[band] }} />
          {GAUGE_BAND_WORD[band]}
        </span>
      </div>
      <NockerlGauge
        shape="bar"
        value={used}
        max={total}
        showTicks
        label="Context window usage"
        valueText={`${readout(used, total)}, ${GAUGE_BAND_WORD[band]}`}
      />
      <div className="nk-bar-scale" aria-hidden="true">
        <span>0</span>
        <span>{formatTokenCount(total)}</span>
      </div>
    </div>
  );
}

// ── The reusable named gauge: ring / arc form ─────────────────────────────────
function ContextRing({ used, total }: { used: number; total: number }) {
  const ratio = total > 0 ? Math.min(1, used / total) : 0;
  const band = gaugeBand(ratio);
  const pct = Math.round(ratio * 100);
  return (
    <div className="nk-ring-wrap">
      <NockerlGauge
        shape="ring"
        value={used}
        max={total}
        centerPrimary={`${pct}%`}
        centerSecondary="CTX"
        label="Context window usage"
        valueText={`${readout(used, total)}, ${GAUGE_BAND_WORD[band]}`}
      />
      <div className="nk-ring__side">
        <span className="nk-ring__count" aria-hidden="true">
          {formatTokenCount(used)}<em> / {formatTokenCount(total)}</em>
        </span>
        <span className="nk-ring__state" style={{ color: GAUGE_BAND_FILL[band] }}>
          <span className="nk-ring__dot" style={{ background: GAUGE_BAND_FILL[band] }} />
          {GAUGE_BAND_WORD[band]}
        </span>
      </div>
    </div>
  );
}

// ── Shared band legend ─────────────────────────────────────────────────────────
function BandLegend() {
  return (
    <div className="nk-bands" aria-hidden="true">
      <span className="nk-bands__item"><span className="nk-bands__dot" style={{ background: GAUGE_BAND_FILL.safe }} /> healthy <b>&lt; 60%</b></span>
      <span className="nk-bands__item"><span className="nk-bands__dot" style={{ background: GAUGE_BAND_FILL.warning }} /> elevated <b>60 to 85%</b></span>
      <span className="nk-bands__item"><span className="nk-bands__dot" style={{ background: GAUGE_BAND_FILL.critical }} /> critical <b>&ge; 85%</b></span>
    </div>
  );
}

// ── Inline chip variant: the SessionChipsBar keycap + context underline ───────
type ChipSpec = { name: string; engine: 'cloud' | 'nockerl'; ratio: number | null };
const CHIPS: ChipSpec[] = [
  { name: 'primary', engine: 'nockerl', ratio: 0.41 },
  { name: 'gateway', engine: 'nockerl', ratio: 0.72 },
  { name: 'audit', engine: 'nockerl', ratio: 0.93 },
  { name: 'docs', engine: 'cloud', ratio: null }, // Cloud Agent = unmanaged → empty track, never faked
];
function ContextChips({ live }: { live: number }) {
  return (
    <div className="nk-chips" role="group" aria-label="Session context chips">
      {CHIPS.map((c) => {
        // the PRIMARY chip is the LIVE/current session: its ratio tracks the driver slider so
        // its inner underline recolors in lock-step with the meters (the others are fixed peer
        // sessions). This wires the strip to the same usage toggle as the rail.
        const ratio = c.name === 'primary' ? live : c.ratio;
        const has = ratio !== null;
        // clamp to the meter's 0..1 domain; a null ratio = unmanaged (a faint empty track)
        const clamped = has ? Math.min(1, ratio as number) : null;
        const band = has ? gaugeBand(clamped as number) : 'safe';
        const desc = has
          ? `${c.name}, ${Math.round((clamped as number) * 100)}% context, ${GAUGE_BAND_WORD[band]}`
          : `${c.name}, context not tracked (Cloud Agent)`;
        // The promoted NockerlContextChip renders the context LINE INSIDE the pill, the
        // same session chip Floating pills uses (Dashboard ). Its inner line ramps
        // cyan -> amber -> red on the SAME tokens as GAUGE_BAND_FILL, so the strip stays
        // in lock-step with the named meter above. Static: no dot, no selection state.
        return (
          <NockerlContextChip
            key={c.name}
            engineGlyph={c.engine === 'cloud' ? Cloud : ChipGlyph}
            name={c.name}
            ratio={clamped}
            tooltip={desc}
            ariaLabel={desc}
          />
        );
      })}
    </div>
  );
}

/**
 * The interactive showcase mounted on the Context gauge page: the named meter in
 * BOTH forms (a linear context bar + a ring/arc gauge) sharing one threshold
 * model, the shared band legend, the compact inline chip strip (SessionChipsBar
 * treatment), and a real slider + step buttons that drag usage 0→100% so a
 * reviewer watches both forms cross 60% / 85% and recolor. Every color / font /
 * radius / spacing is a token; the dark stage resolves them.
 */
// Data composite: used/total are data. Composes the NockerlGauge + NockerlButton + NockerlSlider primitives (the usage driver is the real NockerlSlider primitive: recessed well + lifted cyan thumb + role="slider" a11y), so no owns.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default function ContextGaugeDemo() {
  const [pct, setPct] = useState(41); // a healthy default; matches the "82K / 200K · 41%" readout
  const used = Math.round((pct / 100) * TOTAL);
  const band = gaugeBand(pct / 100);
  const clamp = (n: number) => Math.max(0, Math.min(100, n));

  return (
    <div className="nk-ctx-demo">
      {/* the shared session-chip canon (pill w/ inner context line), the same block used by Floating pills () */}
      <style>{STYLES}</style>

      <p className="nk-ctx-demo__lbl">Context gauge: drag usage past 60% then 85% and watch both forms recolor</p>
      <div className="nk-ctx-grid nk-ctx-grid--2">
        {/* Linear bar form */}
        <NockerlSurface className="nk-ctx-card">
          <div className="nk-ctx-card__head">
            <p className="nk-ctx-card__title">Context window</p>
            <span className="nk-ctx-card__engine">{ChipGlyph} Local Engine · managed</span>
          </div>
          <ContextBar used={used} total={TOTAL} />
          <BandLegend />
        </NockerlSurface>

        {/* Ring / arc form, same data, same thresholds */}
        <NockerlSurface className="nk-ctx-card">
          <div className="nk-ctx-card__head">
            <p className="nk-ctx-card__title">Token budget</p>
            <span className="nk-ctx-card__engine">ring</span>
          </div>
          <ContextRing used={used} total={TOTAL} />
        </NockerlSurface>
      </div>

      {/* The shared driver: one source of truth feeding both forms above */}
      <div className="nk-driver">
        <div className="nk-driver__row">
          <span className="nk-driver__cap">Usage</span>
          <span className="nk-driver__val" style={{ color: GAUGE_BAND_FILL[band] }}>{readout(used, TOTAL)}</span>
        </div>
        <div className="nk-driver__row">
          <span className="nk-driver__slider">
            <NockerlSlider
              value={pct}
              onChange={(v) => setPct(clamp(v))}
              min={0}
              max={100}
              unit="%"
              label="Drag context-window usage from 0 to 100 percent"
            />
          </span>
          <span className="nk-step">
            <NockerlButton text="−10%" variant="secondary" size="sm" ariaLabel="Decrease usage 10 percent" onClick={() => setPct((p) => clamp(p - 10))} />
            <NockerlButton text="+10%" variant="secondary" size="sm" ariaLabel="Increase usage 10 percent" onClick={() => setPct((p) => clamp(p + 10))} />
          </span>
        </div>
      </div>

      <p className="nk-ctx-demo__lbl" style={{ marginTop: 'var(--space-6)' }}>
        Inline chip strip: the per-session underline (cyan → amber → red); an unmanaged Cloud Agent session shows a faint empty track, never a faked line
      </p>
      <NockerlSurface className="nk-ctx-card">
        <ContextChips live={pct / 100} />
      </NockerlSurface>

      <p className="nk-ctx-demo__foot">
        Thresholds <b>0.60</b> / <b>0.85</b> + the band fills are all <b>var(--token)</b>. Cyan is healthy, warm is status; the fill grows, the color hard-cuts (never tweens). The island is live.
      </p>
    </div>
  );
}
