/**
 * ChartDemo: the live, interactive Nockerl data-visualization island for web.
 *
 * Sourced from the shipped apps (never the web dashboard, never a chart library):
 *   • Android (canonical), `chat/ui/ClusterSheet.kt` `NockerlSparkline`: a stroked
 *     `Path` normalized to its own min/max with a filled "now" dot at the latest
 *     point ("Mirrors the web SVG version"). `SessionChipsBar.kt` context line:
 *     fills by a 0..1 ratio, colored cyan (< .60) → amber (< .85) → red usage
 *     bands over a faint empty track, NO number, just the colored fill. `StatTile`
 *     / token formatting: accent icon, muted label, MONOSPACE figure, compact
 *     `1.2M` / `42K` counts.
 *   • Voice/Swift (canonical), `UI/HomeSection.kt` chart card: Swift-Charts
 *     `BarMark` with a vertical cyan→accentDark gradient fill, `cornerRadius 2`,
 *     a LEADING y-axis (hairline grid lines + muted labels) and a strided x-axis.
 *     `StatCard`: accent icon chip + big monospaced number + muted label.
 *
 * Implements the design laws verbatim:
 *   • the CARD lifts (neutral shadow + top catch-light, never a glow); the plot
 *     itself is FLAT inside it. Depth lives in the card. Card radius = 16.
 *   • brand cyan is the primary series; extra series use the CATEGORICAL ramp
 *     (data tints, not brand). The usage ring uses the warm STATUS ladder for its
 *     bands (status = warm, never decorative); cyan only while healthy.
 *   • flash-free: fills are static. The draw-in animates an interpolatable prop
 *     only (stroke-dashoffset / transform), frozen under prefers-reduced-motion.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   • axes/grid are border + muted tokens; any label ON the cyan fill is
 *     var(--color-on-accent).
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them
 * to the dark palette; change a token and this demo moves with it. Literals remain
 * only for SVG geometry (coordinate space, viewBox) + transition curves.
 */
import { useState } from 'react';

import { NockerlBarChart, NockerlChip, NockerlGauge, NockerlIcon, NockerlIconButton, NockerlLineChart, NockerlSparkline, type ChartBar, type ChartSeries, type ComposeContract } from '@dizyx/nockerl-react';

import { formatTokenCount } from './format';

// The plot geometry + the line/area/bar rendering now live in the NockerlLineChart and NockerlBarChart
// primitives (../primitives/NockerlLineChart, ../primitives/NockerlBarChart); this demo only owns the
// card chrome, the legend toggle state, and the sample data.

export type Series = ChartSeries;

// Two cost series over a week. Primary = brand cyan; the comparison series uses
// the CATEGORICAL ramp (data tint, never a second brand accent).
const X_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SERIES: ChartSeries[] = [
  { key: 'cloud', label: 'Cloud', color: 'var(--color-accent-primary)', data: [12, 19, 14, 23, 28, 17, 9] },
  { key: 'local', label: 'Local', color: 'var(--color-core-categorical-violet400)', data: [6, 8, 11, 9, 14, 12, 7] },
];

// Line-only example (a 2nd consumer that proves area={false} + valueFormat + a different
// y-scale): p50 / p95 request latency in ms across the same week. Cyan leads; the p95 tail
// takes a categorical tint. Formatted with a "ms" suffix (not a prefix).
const LATENCY_SERIES: ChartSeries[] = [
  { key: 'p50', label: 'p50', color: 'var(--color-accent-primary)', data: [180, 210, 195, 240, 220, 260, 230] },
  { key: 'p95', label: 'p95', color: 'var(--color-core-categorical-orange400)', data: [420, 510, 480, 560, 530, 620, 590] },
];
const msFormat = (v: number) => `${v} ms`;

// Grouped bars: tool calls by family, each a categorical tint (data, not brand).
const BARS: ChartBar[] = [
  { label: 'Edit', value: 42, color: 'var(--color-accent-primary)' },
  { label: 'Read', value: 31, color: 'var(--color-core-categorical-sky400)' },
  { label: 'Bash', value: 24, color: 'var(--color-core-categorical-emerald400)' },
  { label: 'Grep', value: 18, color: 'var(--color-core-categorical-violet400)' },
  { label: 'Web', value: 9, color: 'var(--color-core-categorical-pink400)' },
];

// A 2nd NockerlBarChart (proves a different data shape + a compact-count valueFormat): tokens
// spent per model this week. Brand cyan leads; the rest take categorical tints.
const TOKENS_BY_MODEL: ChartBar[] = [
  { label: 'Large', value: 1_240_000, color: 'var(--color-accent-primary)' },
  { label: 'Medium', value: 860_000, color: 'var(--color-core-categorical-sky400)' },
  { label: 'Small', value: 410_000, color: 'var(--color-core-categorical-emerald400)' },
  { label: 'Local', value: 210_000, color: 'var(--color-core-categorical-violet400)' },
];

// The sparkline is now the NockerlSparkline primitive (../primitives/NockerlSparkline); the stat
// tiles below pass pad={3} (their coordinate inset) + the categorical series color.

const STYLES = `
.nk-chart-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }
.nk-chart-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-chart-demo__grid { display: grid; gap: var(--space-5); grid-template-columns: 1fr; }
@media (min-width: 720px) { .nk-chart-demo__grid--2 { grid-template-columns: 3fr 2fr; } }
@media (min-width: 720px) { .nk-chart-demo__grid--even { grid-template-columns: 1fr 1fr; } }
/* The CARD: depth lives here, lit from above (neutral shadow + top catch-light). */
.nk-card {
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card);
  padding: var(--space-4) var(--space-5) var(--space-5);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-card__head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }
.nk-card__title { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-card); margin: 0; }
.nk-card__sub { font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-card__sub b { color: var(--color-accent-primary); font-family: var(--font-family-mono); }
/* The SVG plot (.nk-plot / .nk-pt / .nk-tip / .nk-plot-wrap) is self-injected by the
   NockerlLineChart primitive; the bar strip (.nk-bars / .nk-bar) by the NockerlBarChart primitive. */
/* Legend: selectable Chips (composes the NockerlChip primitive; the per-series color rides on
   the NockerlChip swatch prop). The .nk-legend flex row is the only chrome that stays here. */
.nk-legend { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-3); }
/* Stat row: sparkline cards (Android StatTile / Voice StatCard). */
.nk-stats { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.nk-stat { display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-3);
  background: var(--color-card-surface2); border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-control); }
.nk-stat__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); }
.nk-stat__row { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--space-2); }
.nk-stat__val { font-size: var(--font-size-20); line-height: var(--font-line-height-24); font-weight: var(--font-weight-bold);
  font-family: var(--font-family-mono); color: var(--color-on-card); }
/* .nk-spark / .nk-spark__line now come from the NockerlSparkline primitive (self-injected). */
/* Usage ring (donut): the NockerlGauge primitive owns the ring; this is the chrome around it. */
.nk-ring-wrap { display: flex; align-items: center; gap: var(--space-4); }
.nk-ring__legend { display: flex; flex-direction: column; gap: var(--space-2); font-size: var(--font-size-12); }
.nk-ring__band { display: flex; align-items: center; gap: var(--space-2); color: var(--color-on-card-muted); }
.nk-ring__band b { color: var(--color-on-card); font-family: var(--font-family-mono); }
.nk-ring__dot { width: 8px; height: 8px; border-radius: var(--radius-pill); flex: 0 0 auto; }
.nk-ring__ctl { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
.nk-chart-demo__foot { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-chart-demo__foot b { color: var(--color-accent-primary); font-family: var(--font-family-mono); }
/* Draw-in / rise-in reduced-motion freezes live with their plots in the NockerlLineChart +
   NockerlBarChart primitives; this demo's own chrome does not animate. */
`;

// ── Line / area chart: grid, axes, hover/focus points, legend toggles ─────────
// The AREA card: card chrome + the NockerlChip legend + the on/off toggle state stay HERE; the
// SVG plot itself is the NockerlLineChart primitive, fed the already-filtered active series.
function CostAreaChart() {
  const [on, setOn] = useState<Record<string, boolean>>({ cloud: true, local: true });
  const active = SERIES.filter((s) => on[s.key]);

  return (
    <div className="nk-card">
      <div className="nk-card__head">
        <p className="nk-card__title">Cost · this week</p>
        <span className="nk-card__sub">
          total <b>${active.reduce((a, s) => a + s.data.reduce((x, y) => x + y, 0), 0)}</b>
        </span>
      </div>

      <NockerlLineChart series={active} xLabels={X_LABELS} area valuePrefix="$" />

      <div className="nk-legend" role="group" aria-label="Toggle series">
        {SERIES.map((s) => (
          <NockerlChip
            key={s.key}
            text={s.label}
            selected={on[s.key]}
            swatch={s.color}
            onClick={() => setOn((p) => ({ ...p, [s.key]: !p[s.key] }))}
          />
        ))}
      </div>
    </div>
  );
}

// A 2nd NockerlLineChart consumer: LINE-only (area={false}), a different series + y-scale, and a
// valueFormat suffix. Same legend-toggle pattern proves the API flexes across datasets.
function LatencyLineChart() {
  const [on, setOn] = useState<Record<string, boolean>>({ p50: true, p95: true });
  const active = LATENCY_SERIES.filter((s) => on[s.key]);

  return (
    <div className="nk-card">
      <div className="nk-card__head">
        <p className="nk-card__title">Request latency · this week</p>
        <span className="nk-card__sub">p50 / p95, per day</span>
      </div>

      <NockerlLineChart series={active} xLabels={X_LABELS} valueFormat={msFormat} />

      <div className="nk-legend" role="group" aria-label="Toggle latency series">
        {LATENCY_SERIES.map((s) => (
          <NockerlChip
            key={s.key}
            text={s.label}
            selected={on[s.key]}
            swatch={s.color}
            onClick={() => setOn((p) => ({ ...p, [s.key]: !p[s.key] }))}
          />
        ))}
      </div>
    </div>
  );
}

// ── Bar chart card: NockerlBarChart primitive fed the tool-call tallies ────────────────
function ToolCallsBars() {
  return (
    <div className="nk-card">
      <div className="nk-card__head">
        <p className="nk-card__title">Tool calls · by family</p>
        <span className="nk-card__sub">{BARS.reduce((a, b) => a + b.value, 0)} total</span>
      </div>
      <NockerlBarChart bars={BARS} />
    </div>
  );
}

// A 2nd NockerlBarChart consumer: a different data shape + a compact-count valueFormat.
function TokensByModelBars() {
  return (
    <div className="nk-card">
      <div className="nk-card__head">
        <p className="nk-card__title">Tokens · by model</p>
        <span className="nk-card__sub">
          <b>{formatTokenCount(TOKENS_BY_MODEL.reduce((a, b) => a + b.value, 0), 1)}</b> this week
        </span>
      </div>
      <NockerlBarChart bars={TOKENS_BY_MODEL} valueFormat={(v) => formatTokenCount(v, 1)} />
    </div>
  );
}

// ── NockerlSparkline stat cards (Android StatTile / Voice StatCard) ────────────────────
const STAT_TILES = [
  { lbl: 'Tokens', val: 1_240_000, series: [3, 5, 4, 7, 6, 9, 8, 11, 10, 13], color: 'var(--color-accent-primary)' },
  { lbl: 'Sessions', val: 42, series: [2, 3, 3, 4, 6, 5, 7, 6, 8, 9], color: 'var(--color-core-categorical-emerald400)' },
];
function SparkStats() {
  return (
    <div className="nk-stats">
      {STAT_TILES.map((t) => {
        const sw = 64;
        const sh = 22;
        return (
          <div className="nk-stat" key={t.lbl}>
            <span className="nk-stat__lbl">{t.lbl}</span>
            <div className="nk-stat__row">
              <span className="nk-stat__val">{formatTokenCount(t.val, 1)}</span>
              <NockerlSparkline
                data={t.series}
                width={sw}
                height={sh}
                pad={3}
                stroke={t.color}
                ariaLabel={`${t.lbl} trend, ${t.series.length} points, latest ${t.series[t.series.length - 1]}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Usage ring (donut): the NockerlGauge primitive; chrome (legend + steppers) lives here ─
function UsageRing() {
  const [pct, setPct] = useState(58);
  const ratio = pct / 100;
  const bump = (d: number) => setPct((p) => Math.max(0, Math.min(100, p + d)));
  return (
    <div className="nk-card">
      <div className="nk-card__head">
        <p className="nk-card__title">Context window</p>
        <span className="nk-card__sub">used</span>
      </div>
      <div className="nk-ring-wrap">
        <NockerlGauge
          shape="ring"
          value={pct}
          max={100}
          centerPrimary={`${pct}%`}
          label={`Context window ${pct}% used`}
          valueText={`${pct}% used, ${ratio >= 0.85 ? 'high' : ratio >= 0.6 ? 'elevated' : 'healthy'}`}
        />
        <div className="nk-ring__legend">
          <span className="nk-ring__band"><span className="nk-ring__dot" style={{ background: 'var(--color-accent-primary)' }} /> healthy <b>&lt; 60</b></span>
          <span className="nk-ring__band"><span className="nk-ring__dot" style={{ background: 'var(--color-status-warning)' }} /> elevated <b>60 to 85</b></span>
          <span className="nk-ring__band"><span className="nk-ring__dot" style={{ background: 'var(--color-status-error)' }} /> high <b>&ge; 85</b></span>
          <div className="nk-ring__ctl">
            <NockerlIconButton icon={<NockerlIcon name="minus" />} label="Decrease usage" onClick={() => bump(-9)} variant="plain" size={32} />
            <NockerlIconButton icon={<NockerlIcon name="plus" />} label="Increase usage" onClick={() => bump(9)} variant="plain" size={32} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Data composite: series/bars are data. Composes the NockerlLineChart/NockerlBarChart/NockerlSparkline/NockerlGauge primitives; legends are Chips, steppers are IconButtons, so no hand-rolled facsimiles and no owns.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Chart page. Every chart is composed from the
 * NockerlLineChart / NockerlBarChart / NockerlSparkline / NockerlGauge primitives; this island only supplies the
 * data, the card chrome, and the legend-toggle state:
 *   • two NockerlLineChart cards: an AREA cost chart and a LINE-only latency chart (proving
 *     area on/off, a "$" prefix vs a "ms" valueFormat, and different y-scales), each with
 *     a keyboard-operable NockerlChip legend that filters the rendered series;
 *   • two NockerlBarChart cards: tool calls by family and tokens by model (proving a raw
 *     value vs a compact-count valueFormat and different data magnitudes);
 *   • a pair of NockerlSparkline stat cards + a NockerlGauge usage ring with warm status bands.
 * Every color / font / radius / spacing is a token; the dark stage resolves them.
 */
export default function ChartDemo() {
  return (
    <div className="nk-chart-demo">
      <style>{STYLES}</style>

      <p className="nk-chart-demo__lbl">Time series: hover or tab a point, toggle a series in the legend</p>
      <div className="nk-chart-demo__grid nk-chart-demo__grid--even">
        <CostAreaChart />
        <LatencyLineChart />
      </div>

      <p className="nk-chart-demo__lbl" style={{ marginTop: 'var(--space-6)' }}>Categorical: same primitive, different data + value format</p>
      <div className="nk-chart-demo__grid nk-chart-demo__grid--even">
        <ToolCallsBars />
        <TokensByModelBars />
      </div>

      <p className="nk-chart-demo__lbl" style={{ marginTop: 'var(--space-6)' }}>At-a-glance: sparkline stat tiles</p>
      <div className="nk-chart-demo__grid">
        <div className="nk-card">
          <div className="nk-card__head">
            <p className="nk-card__title">This week</p>
            <span className="nk-card__sub">trend</span>
          </div>
          <SparkStats />
        </div>
      </div>

      <p className="nk-chart-demo__lbl" style={{ marginTop: 'var(--space-6)' }}>Progress / usage ring: drive it past each threshold</p>
      <div className="nk-chart-demo__grid">
        <UsageRing />
      </div>

      <p className="nk-chart-demo__foot">
        Series + grid + axes + ring bands are all <b>var(--token)</b>. Cyan is the brand series, extra series use the categorical ramp, warm = status. The island is live.
      </p>
    </div>
  );
}
