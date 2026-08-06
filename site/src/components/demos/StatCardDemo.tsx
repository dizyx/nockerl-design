/**
 * StatCardDemo: the live, interactive Nockerl stat / metric tile for the web.
 *
 * The SINGLE-KPI tile: one headline number + a label + an optional delta/trend +
 * an optional inline sparkline + an optional leading icon. This is NOT a chart
 * (see `chart`) and NOT the token-budget meter (see `context-gauge`). It is the
 * focused metric tile dashboards are tiled with.
 *
 * Sourced from the shipped apps (never the web dashboard):
 *   • Voice/Swift (canonical) `UI/HomeSection.swift` `StatCard`: an accent icon
 *     CHIP (accent @ 14% fill + accent @ 25% border), a big BOLD MONOSPACED number,
 *     and a muted label. This is the lineage of the tile here.
 *   • Android (canonical) `chat/ui/ClusterSheet.kt` `StatTile`: a compact
 *     surface (small icon + muted label, then a MONOSPACE value + an optional
 *     trailing `NockerlSparkline`). `ChatUtils.formatTokenCount` → integer `1M` / `42K`.
 *     The sparkline algorithm (own min/max, "now" dot) is reused verbatim.
 *
 * Implements the design laws verbatim:
 *   • the tile is a CARD. It LIFTS off the dark ground (neutral drop shadow + a
 *     ~1px top catch-light), card radius 16. Depth is shadow + sheen, never a glow.
 *   • the headline number is a strong on-card MONOSPACE figure; the label is muted.
 *   • a delta is the WARM status ladder + a direction glyph (▲ success / ▼ danger),
 *     never color alone (glyph + sign + text). Brand cyan is never a delta color.
 *   • the featured tile fills with the cyan gradient; every label ON the fill is
 *     `--color-on-accent` (the derived contrast token), the chip is the inverse.
 *   • sparkline = brand cyan (or a categorical tint), flat inside the tile.
 *   • flash-free: fills are static. The count-up + sparkline draw animate an
 *     interpolatable prop only, FROZEN under prefers-reduced-motion.
 *   • a clickable tile is a real <button> with a focus-visible cyan OUTLINE ring.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them;
 * change a token and this demo moves with it. Literals remain only for SVG
 * sparkline geometry (coordinate space) + transition curves.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { NockerlIcon, NockerlSparkline, NockerlSurface, type ComposeContract } from '@dizyx/nockerl-react';

import { formatTokenCount } from './format';

export type StatTrend = 'up' | 'down';
export type StatTone = 'default' | 'featured';
export type StatSize = 'comfortable' | 'compact';
/** Opt-in icon-plate tint that colors the stat glyph + its plate a soft hue.
 *  Omit for the neutral hairline plate (the default, canon-unchanged). */
export type StatTint = 'accent' | 'success' | 'warning' | 'danger';

export interface StatDelta {
  /** Magnitude, already formatted (e.g. "12.4%", "+8"). The sign comes from `trend`. */
  value: string;
  /** Direction. `up` = success ladder + ▲; `down` = danger ladder + ▼. */
  trend: StatTrend;
  /** When true, an "up" delta is BAD (e.g. latency, cost), so the color swaps, not the glyph. */
  goodWhenDown?: boolean;
}

export interface StatCardProps {
  /** Short metric name (label.small role, muted). */
  label: string;
  /** Headline figure, already formatted (e.g. "1.2M", "$184", or the empty-state dash). */
  value: string;
  /** Optional trend delta: color + a direction glyph, never color alone. */
  delta?: StatDelta;
  /** Optional leading glyph rendered in an accent chip. */
  icon?: React.ReactNode;
  /** Optional inline sparkline series (own min/max, "now" dot). */
  spark?: number[];
  /** `featured` fills the tile with the cyan gradient (one per cluster). */
  tone?: StatTone;
  /**
   * OPT-IN icon-plate tint that colors the leading glyph + its plate a soft hue
   * (soft wash fill + hue border + hue glyph, the Badge-soft recipe). Omit for the
   * ratified NEUTRAL hairline plate: the default renders byte-identical. Ignored
   * on `featured` tiles (the featured chip inverts to on-accent, and owns the plate).
   */
  tint?: StatTint;
  /**
   * EXPERIMENTAL (not ratified canon; the design lead is evaluating). A subtle,
   * THEME-FOLLOWING surface gradient (a gentle diagonal between two neutral surface
   * levels, NOT the loud `featured` cyan). Default `false` = the flat `card-surface1`
   * fill, byte-identical. Ignored on `featured` (which owns the fill).
   */
  gradient?: boolean;
  /** Density. `compact` is the ClusterSheet tile; `comfortable` the Voice card. */
  size?: StatSize;
  /** Skeleton shimmer instead of content (holds the tile height). */
  loading?: boolean;
  /** Renders as a real button: hover lifts, focus shows a ring. */
  onClick?: () => void;
}

// The sparkline is the NockerlSparkline primitive (../primitives/NockerlSparkline), composed
// below; the tile passes its own min/max series, stroke, and draw-on.

/** The empty-state placeholder, shown when a stat has no reading. Never a misleading zero. */
const EMPTY_VALUE = 'n/a';

// A delta resolves to a WARM status token + a direction glyph. `up` is good by
// default; `goodWhenDown` flips the color (cost/latency) but not the glyph.
function deltaColor(d: StatDelta): string {
  const good = d.goodWhenDown ? d.trend === 'down' : d.trend === 'up';
  return good ? 'var(--color-status-success)' : 'var(--color-status-error)';
}

const STYLES = `
.nk-sc-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
.nk-sc-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-sc-grid { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); align-items: stretch; }
/* The TILE, a lifted card: neutral drop shadow + ~1px top catch-light. Card radius 16.
   A FIXED vertical stack: [head] [value] [footer]. The footer row is the flex-grower
   (flex: 1 1 auto) so EVERY tile reserves the same bottom space, and the value row lands at
   the same offset across a row whether or not a tile carries a spark/CTA. Big numbers in a
   row therefore share one baseline (no ragged rows). */
/* NockerlSurface (card variant) supplies the fill, hairline, and 16px card radius. */
.nk-sc {
  position: relative; box-sizing: border-box; height: 100%;
  display: flex; flex-direction: column; gap: var(--space-3);
  padding: var(--space-4);
  color: var(--color-on-card);
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen);
}
.nk-sc--compact { gap: var(--space-2); padding: var(--space-3); }
/* HEAD + VALUE are fixed-height rows (flex: 0 0 auto); the FOOTER row grows to fill,
   anchoring the value row at a consistent position across tiles. */
.nk-sc__head, .nk-sc__body { flex: 0 0 auto; }
/* FOOTER: the spark / CTA slot. Always present (even empty) so spark-less tiles reserve
   the same trailing space; its content bottom-aligns inside the grown row. */
.nk-sc__foot { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: flex-end; min-height: 0; }
/* HEAD: leading accent icon CHIP (accent fill + accent border) + the muted label.
   min-height = the chip box (--space-10) so the head band is the SAME height whether or
   not a tile carries an icon: an icon-less label centers in that reserved band instead of
   collapsing to its own line height. This keeps the value row at one offset across a grid
   row, so headline numbers share a baseline even when only some tiles have a leading icon. */
.nk-sc__head { display: flex; align-items: center; gap: var(--space-3); min-width: 0; min-height: var(--space-10); }
.nk-sc--compact .nk-sc__head { gap: var(--space-2); min-height: var(--space-8); }
/*  (the design lead ruled): the icon is a NEUTRAL glyph on a HAIRLINE PLATE (unfilled + a neutral
   hairline), not a cyan-soft fill on every tile - honours "we rarely fill" + "cyan is earned/
   scarce" (the accent chip was against both). The FEATURED tile keeps its inverse cyan chip. */
.nk-sc__chip {
  flex: 0 0 auto; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;
  width: var(--space-10); height: var(--space-10); border-radius: var(--radius-control);
  background: transparent; color: var(--color-on-card-muted);
  border: var(--space-px) solid var(--color-card-hairline);
}
.nk-sc--compact .nk-sc__chip { width: var(--space-8); height: var(--space-8); border-radius: var(--radius-track); }
/* task-2740 OPT-IN tint: colors the glyph + plate a soft hue (soft wash 14% + hue border 28% +
   hue glyph, the Badge-soft recipe). Default (no tint class) stays the neutral plate above.
   The hue class sets --nk-sc-tint; the tinted class applies the recipe. Ignored on featured. */
.nk-sc--tint-accent { --nk-sc-tint: var(--color-accent-primary); }
.nk-sc--tint-success { --nk-sc-tint: var(--color-status-success); }
.nk-sc--tint-warning { --nk-sc-tint: var(--color-status-warning); }
.nk-sc--tint-danger { --nk-sc-tint: var(--color-status-error); }
.nk-sc--tinted .nk-sc__chip {
  background: color-mix(in srgb, var(--nk-sc-tint) 14%, transparent);
  color: var(--nk-sc-tint);
  border-color: color-mix(in srgb, var(--nk-sc-tint) 28%, transparent);
}
/* EXPERIMENTAL: a subtle THEME-FOLLOWING surface gradient (a gentle diagonal
   between two neutral surface levels; both are theme tokens so it adapts). Distinct from
   the loud featured cyan. Out-specifies NockerlSurface's flat fill via the demo-root prefix. */
.nk-sc-demo .nk-sc--gradient { background: linear-gradient(160deg, var(--color-card-surface2), var(--color-card-surface1)); }
.nk-sc__chip svg { display: block; width: 18px; height: 18px; }
.nk-sc--compact .nk-sc__chip svg { width: 15px; height: 15px; }
.nk-sc__label { flex: 1 1 auto; min-width: 0; font-size: var(--font-size-12); line-height: var(--font-line-height-16);
  color: var(--color-on-card-muted); font-weight: var(--font-weight-medium);
  letter-spacing: var(--font-tracking-tight); text-transform: uppercase;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* BODY: the headline figure + an inline delta, baseline-aligned. */
.nk-sc__body { display: flex; align-items: baseline; gap: var(--space-2); flex-wrap: wrap; }
.nk-sc__value { font-family: var(--font-family-mono); font-weight: var(--font-weight-bold);
  font-size: var(--type-display-small-font-size); line-height: 1; color: var(--color-on-card);
  font-variant-numeric: tabular-nums; letter-spacing: var(--font-tracking-snug); }
.nk-sc--compact .nk-sc__value { font-size: var(--font-size-20); }
/* DELTA: warm status token + a direction glyph (▲/▼). Never color alone.
   inline-flex + align-items:center + line-height:1 sits the glyph ON the number's
   centerline so the triangle and figure share one optical baseline (no translate hack). */
.nk-sc__delta { display: inline-flex; align-items: center; gap: var(--space-0-5);
  font-family: var(--font-family-mono); font-size: var(--font-size-12); font-weight: var(--font-weight-semibold);
  line-height: 1; font-variant-numeric: tabular-nums; }
.nk-sc__delta-glyph { display: inline-flex; align-items: center; line-height: 1; font-size: var(--font-size-10); }
.nk-sc__delta-since { color: var(--color-on-card-muted); font-family: var(--font-family-sans);
  font-weight: var(--font-weight-regular); font-size: var(--font-size-10); }
/* SPARKLINE: the NockerlSparkline primitive (../primitives/NockerlSparkline); the tile passes
   the stroke (cyan / on-accent) + draw-on. Bottom alignment comes from the __foot row. */
/* FEATURED: the cyan gradient fill; the chip inverts, labels use on-accent.
   REPLACES NockerlSurface's fill + hairline, so it must out-specify .nk-surface (injected
   later in the DOM): prefixed with the demo-root class to win regardless of order. */
.nk-sc-demo .nk-sc--featured { background: linear-gradient(160deg, var(--color-accent-primary-hi), var(--color-accent-primary));
  border-color: color-mix(in srgb, var(--color-accent-primary) 60%, transparent); color: var(--color-on-accent); }
.nk-sc--featured .nk-sc__label { color: color-mix(in srgb, var(--color-on-accent) 80%, transparent); }
.nk-sc--featured .nk-sc__value { color: var(--color-on-accent); }
.nk-sc--featured .nk-sc__chip { background: color-mix(in srgb, var(--color-on-accent) 14%, transparent);
  color: var(--color-on-accent); border-color: color-mix(in srgb, var(--color-on-accent) 28%, transparent); }
.nk-sc--featured .nk-sc__delta-since { color: color-mix(in srgb, var(--color-on-accent) 75%, transparent); }
/* Clickable tile, a real button: lifts on hover, sinks on press, ring on focus. */
button.nk-sc { width: 100%; text-align: left; cursor: pointer; font: inherit; appearance: none; -webkit-appearance: none;
  transition: transform .14s cubic-bezier(.2,0,0,1), box-shadow .14s, filter .14s; }
button.nk-sc:hover { transform: translateY(-2px); filter: brightness(1.04);
  box-shadow: 0 var(--space-3) calc(var(--elevation-sheet) * 2) -9px color-mix(in srgb, var(--color-shadow-tint) 70%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
button.nk-sc:active { transform: translateY(0) scale(.992); filter: brightness(.98);
  box-shadow: 0 var(--space-0-5) var(--elevation-level3) -4px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
button.nk-sc:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-px); }
.nk-sc__cta { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); }
/* LOADING: a recessed shimmer bar (a well, not a lift). Holds the tile height. */
.nk-sc__sk { border-radius: var(--radius-track); background:
  linear-gradient(90deg, color-mix(in srgb, var(--color-on-card) 6%, transparent) 25%,
    color-mix(in srgb, var(--color-on-card) 13%, transparent) 50%,
    color-mix(in srgb, var(--color-on-card) 6%, transparent) 75%);
  background-size: 200% 100%; animation: nk-sc-sheen 1.3s ease-in-out infinite; }
.nk-sc__sk--chip { width: var(--space-10); height: var(--space-10); border-radius: var(--radius-control); flex: 0 0 auto; }
.nk-sc__sk--label { height: var(--font-size-12); width: 56%; }
.nk-sc__sk--value { height: var(--type-display-small-font-size); width: 70%; }
@keyframes nk-sc-sheen { to { background-position: -200% 0; } }
/* EMPTY: a clearly-seen placeholder glyph, not a misleading zero. */
.nk-sc__value--empty { color: var(--color-on-card-muted); }
@media (prefers-reduced-motion: reduce) {
  button.nk-sc { transition: none; }
  .nk-sc__sk { animation-duration: 3s; }
}
.nk-sc-demo__foot { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-sc-demo__foot b { color: var(--color-accent-primary); font-family: var(--font-family-mono); }
`;

// ── Inline glyphs (the shared NockerlIcon stroke shell, currentColor so each chip tints correctly) ───
const IconTokens = <NockerlIcon path="M4 7h16M4 12h16M4 17h10" />;
const IconSessions = (<NockerlIcon><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8M12 18v3" /></NockerlIcon>);
const IconCost = <NockerlIcon path="M12 3v18M8 7h6a2.5 2.5 0 0 1 0 5H9a2.5 2.5 0 0 0 0 5h7" />;
const IconLatency = (<NockerlIcon><circle cx="12" cy="13" r="8" /><path d="M12 13V9M12 5V3M9 3h6" /></NockerlIcon>);

/** Count-up that respects prefers-reduced-motion (jumps straight to the target). */
function useCountUp(target: number, run: boolean): number {
  const [n, setN] = useState(target);
  const ref = useRef<number>(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!run || reduce) {
      setN(target);
      return;
    }
    const from = ref.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 700);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(from + (target - from) * eased);
      setN(cur);
      ref.current = cur;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

/** A single Nockerl stat tile, the unit the spec documents. */
export function StatCard({
  label,
  value,
  delta,
  icon,
  spark: series,
  tone = 'default',
  tint,
  gradient = false,
  size = 'comfortable',
  loading = false,
  onClick,
}: StatCardProps) {
  const featured = tone === 'featured';
  const cls = [
    'nk-sc',
    `nk-sc--${size}`,
    featured ? 'nk-sc--featured' : '',
    // tint is an OPT-IN icon-plate hue; ignored on featured (which owns the chip).
    tint && !featured ? `nk-sc--tinted nk-sc--tint-${tint}` : '',
    // EXPERIMENTAL subtle theme-following surface gradient; ignored on featured.
    gradient && !featured ? 'nk-sc--gradient' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const sw = size === 'compact' ? 56 : 72;
  const sh = size === 'compact' ? 18 : 24;
  const empty = value === EMPTY_VALUE;

  const inner = loading ? (
    <>
      <div className="nk-sc__head">
        {icon !== undefined && <div className="nk-sc__sk nk-sc__sk--chip" />}
        <div className="nk-sc__sk nk-sc__sk--label" />
      </div>
      <div className="nk-sc__body"><div className="nk-sc__sk nk-sc__sk--value" /></div>
      {/* Empty footer row keeps a loading tile the same height as its row-mates. */}
      <div className="nk-sc__foot" />
    </>
  ) : (
    <>
      <div className="nk-sc__head">
        {icon !== undefined && <span className="nk-sc__chip">{icon}</span>}
        <span className="nk-sc__label">{label}</span>
      </div>
      <div className="nk-sc__body">
        <span className={`nk-sc__value${empty ? ' nk-sc__value--empty' : ''}`}>{value}</span>
        {delta && !empty && (
          <span className="nk-sc__delta" style={{ color: deltaColor(delta) }}>
            <span className="nk-sc__delta-glyph" aria-hidden="true">{delta.trend === 'up' ? '▲' : '▼'}</span>
            <span>{delta.trend === 'up' ? '+' : '−'}{delta.value}</span>
          </span>
        )}
        {delta && !empty && <span className="nk-sc__delta-since">vs last wk</span>}
      </div>
      {/* FOOTER row: always rendered so every tile reserves the same trailing space,
          anchoring the value row at a consistent height across a grid row. */}
      <div className="nk-sc__foot">
        {series && (
          <NockerlSparkline
            data={series}
            width={sw}
            height={sh}
            stroke={tone === 'featured' ? 'var(--color-on-accent)' : 'var(--color-accent-primary)'}
            draw
            ariaLabel={`${label} trend, ${series.length} points, latest ${series[series.length - 1]}`}
          />
        )}
        {onClick && !empty && <span className="nk-sc__cta" aria-hidden="true">Open ›</span>}
      </div>
    </>
  );

  // The whole tile is one accessible figure; a clickable tile is one button.
  const aria = loading
    ? `${label}, loading`
    : `${label}: ${empty ? 'no data' : value}${delta && !empty ? `, ${delta.trend === 'up' ? 'up' : 'down'} ${delta.value} versus last week` : ''}`;

  if (onClick && !loading) {
    return (
      <NockerlSurface as="button" type="button" className={cls} onClick={onClick} aria-label={aria}>
        {inner}
      </NockerlSurface>
    );
  }
  return (
    <NockerlSurface className={cls} role="group" aria-label={aria} aria-busy={loading || undefined}>
      {inner}
    </NockerlSurface>
  );
}

// Leaf KPI tile: `icon` is a glyph (not a slot); delta/spark are data. The clickable tile renders via <NockerlSurface as="button"> (NockerlSurface owns `button`) and composes the NockerlSparkline primitive. No hand-rolled facsimiles, no owns.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Stat card page: a basic tile, positive
 * + negative trend deltas (warm status + a glyph, never color alone), an inline
 * sparkline, a leading icon, a featured cyan tile, compact vs comfortable density,
 * a loading skeleton and an empty placeholder tile, and a clickable dashboard cluster of
 * equal-height tiles. Every color / font / radius / spacing is a token.
 */
export default function StatCardDemo() {
  const [opens, setOpens] = useState(0);
  const [live, setLive] = useState(false);
  // A live count-up tile, driven by a button (proves the island + reduced-motion).
  const tokens = useCountUp(live ? 1_240_000 : 980_000, true);
  const tipId = useId();

  return (
    <div className="nk-sc-demo">
      <style>{STYLES}</style>

      <p className="nk-sc-demo__lbl">Anatomy: number + label, a trend delta, a sparkline, a leading icon</p>
      <div className="nk-sc-grid">
        <StatCard label="Active sessions" value="42" />
        <StatCard label="Tokens today" value="1.2M" delta={{ value: '12%', trend: 'up' }} />
        <StatCard label="Avg latency" value="640ms" delta={{ value: '8%', trend: 'down' }} icon={IconLatency} />
        <StatCard label="Cost · 7d" value="$184" spark={[12, 19, 14, 23, 28, 17, 22, 26]} icon={IconCost} />
      </div>

      <p className="nk-sc-demo__lbl" style={{ marginTop: 'var(--space-6)' }}>
        Trend semantics: up isn’t always good (cost / latency flip the color, not the glyph)
      </p>
      <div className="nk-sc-grid">
        <StatCard label="Sessions" value="42" icon={IconSessions} delta={{ value: '6', trend: 'up' }} spark={[2, 3, 3, 4, 6, 5, 7, 9]} />
        <StatCard label="Spend · 7d" value="$184" icon={IconCost} delta={{ value: '14%', trend: 'up', goodWhenDown: true }} />
        <StatCard label="p95 latency" value="1.4s" icon={IconLatency} delta={{ value: '21%', trend: 'down', goodWhenDown: true }} spark={[9, 11, 8, 12, 7, 6, 5, 4]} />
      </div>

      <p className="nk-sc-demo__lbl" style={{ marginTop: 'var(--space-6)' }}>
        Icon-plate tint (opt-in): default stays the neutral plate; tint colors the glyph + plate
      </p>
      <div className="nk-sc-grid">
        <StatCard label="Neutral · default" value="42" icon={IconSessions} />
        <StatCard label="Accent tint" value="1.2M" icon={IconTokens} tint="accent" />
        <StatCard label="Healthy" value="99.9%" icon={IconSessions} tint="success" />
        <StatCard label="Errors · 24h" value="7" icon={IconLatency} tint="danger" />
      </div>

      <p className="nk-sc-demo__lbl" style={{ marginTop: 'var(--space-6)' }}>
        Experimental: subtle theme-following surface gradient; opt-in, default stays the flat surface
      </p>
      <div className="nk-sc-grid">
        <StatCard label="Flat · default" value="42" icon={IconSessions} />
        <StatCard label="Gradient" value="1.2M" icon={IconTokens} gradient />
        <StatCard label="Gradient + tint" value="99.9%" icon={IconSessions} gradient tint="accent" />
      </div>

      <p className="nk-sc-demo__lbl" style={{ marginTop: 'var(--space-6)' }}>Featured · compact · loading · empty</p>
      <div className="nk-sc-grid">
        <StatCard label="Tokens · all time" value="1.2M" tone="featured" icon={IconTokens} delta={{ value: '12%', trend: 'up' }} spark={[3, 5, 4, 7, 6, 9, 8, 11]} />
        <StatCard label="Tools run" value="318" size="compact" delta={{ value: '9%', trend: 'up' }} />
        <StatCard label="Cost · 7d" value="" loading icon={IconCost} />
        <StatCard label="Errors · 24h" value={EMPTY_VALUE} icon={IconLatency} />
      </div>

      <p className="nk-sc-demo__lbl" style={{ marginTop: 'var(--space-6)' }}>
        Dashboard cluster: equal-height tiles; the first is clickable (tab / click it)
      </p>
      <div className="nk-sc-grid">
        <StatCard
          label="Tokens"
          value={formatTokenCount(tokens, 1)}
          icon={IconTokens}
          delta={{ value: '12%', trend: 'up' }}
          spark={[3, 5, 4, 7, 6, 9, 8, 11, 10, 13]}
          onClick={() => setOpens((c) => c + 1)}
        />
        <StatCard label="Sessions" value="42" icon={IconSessions} delta={{ value: '6', trend: 'up' }} onClick={() => setOpens((c) => c + 1)} />
        <StatCard label="Cost · 7d" value="$184" icon={IconCost} delta={{ value: '14%', trend: 'up', goodWhenDown: true }} onClick={() => setOpens((c) => c + 1)} />
        <StatCard label="p95 latency" value="640ms" icon={IconLatency} delta={{ value: '8%', trend: 'down', goodWhenDown: true }} onClick={() => setOpens((c) => c + 1)} />
      </div>

      <div className="nk-sc-grid" style={{ marginTop: 'var(--space-3)' }}>
        <NockerlSurface
          as="button"
          type="button"
          className="nk-sc"
          style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: 'pointer' }}
          aria-describedby={tipId}
          onClick={() => setLive((v) => !v)}
        >
          <span className="nk-sc__cta" style={{ marginTop: 0 }}>{live ? 'Reset count' : 'Animate count-up ›'}</span>
        </NockerlSurface>
      </div>

      <p className="nk-sc-demo__foot" id={tipId}>
        Number is a <b>mono</b> figure, label muted, delta is <b>warm status + a glyph</b> (never color
        alone), the featured fill uses <b>on-accent</b>, sparkline is brand cyan, all <b>var(--token)</b>.
        Tiles opened <b>{opens}</b> · count-up honors reduced-motion. The island is live.
      </p>
    </div>
  );
}
