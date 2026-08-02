/**
 * NockerlGauge is the Tier-1 named THRESHOLD METER primitive. ONE home for the cyan→amber→red
 * usage meter in BOTH its forms: a linear bar and a ring/arc donut. Owns the band
 * threshold model (the shipped SessionChipsBar semantics), the role="meter" a11y, and
 * the recessed-well track + the band-colored fill/arc. That makes the token-budget gauge,
 * the usage ring, and any future "X of Y, getting full" meter a single edit, not a
 * hand-rolled copy. Composes ONLY tokens + pure SVG/CSS geometry; no other primitive.
 *
 * Sourced from the shipped apps (never the web dashboard):
 *   • thresholds come from `chat/ui/SessionChipsBar.kt` CONTEXT_LOW_THRESHOLD = 0.60 /
 *     CONTEXT_HIGH_THRESHOLD = 0.85: usage is colored cyan (< .60, the harness accent,
 *     HEALTHY) → amber (< .85, elevated) → red (>= .85, critical) over a faint empty
 *     track. Warm = status; cyan only while healthy. This band model previously lived
 *     copy-pasted as `ContextGaugeDemo.bandOf/BAND_FILL` and `ChartDemo.ringColor`;
 *     it is unified here and exported so consumers reuse it for their own chrome.
 *   • the ring/arc donut + linear bar are the AgentTranscriptPanel / SessionChipsBar
 *     gauge forms (utilizationPercent over a contextWindow).
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • brand cyan is the HEALTHY band ONLY; the warm STATUS ladder carries elevated +
 *     critical (status = warm, never decorative).
 *   • the TRACK is a recessed WELL (canvas-edge base + inner shadow), the inverse of a
 *     card; depth that sinks, never a glow.
 *   • the FILL/ARC is FLAT, static color per band; ONLY the interpolatable bar WIDTH /
 *     ring stroke-dashoffset animates. The fill never tweens, and the band recolor is a
 *     hard cut (a status change is a fact, not a transition). Freezes under reduced-motion.
 *   • a gauge is a role="meter" with aria-valuenow/min/max + a human aria-valuetext.
 *
 * API: forwardRef reaches the rendered root (a <div> bar OR an <svg> ring); className,
 * style, and id pass through to it. NockerlGauge intentionally does NOT extend one element's full
 * {HTML,SVG}Attributes. The bar and ring roots have incompatible attribute types, so
 * spreading one's attribute set onto the other is not type-safe. The four universal
 * affordances (ref / className / style / id) are the safe passthrough. This is the "NockerlTabs
 * decision": don't force a broken single-element shape onto a genuinely dual-root leaf.
 *
 * TOKEN-REACTIVE: every color / radius / spacing / type size is a var(--token). The only
 * literals are SVG coordinate-space geometry (the ring box / radius / stroke width) and
 * the transition curve, exactly what design tokens do not cover.
 *
 * Injects the recipe CSS as a Fragment SIBLING of the root (the ring root is an <svg>, so
 * a <style> child would be SVG-namespaced; a sibling <style> is display:none by the UA
 * sheet → zero layout). Identical injected blocks dedupe in effect. (NockerlStepper-lesson.)
 */
import { forwardRef } from 'react';
import type { CSSProperties, ReactNode, Ref } from 'react';
import type { ComposeContract } from '../compose-contract';

export type NockerlGaugeShape = 'ring' | 'bar';
export type GaugeBand = 'safe' | 'warning' | 'critical';

/** SessionChipsBar thresholds (usage ratio): < .60 safe · < .85 warning · >= .85 critical. */
export const GAUGE_LOW = 0.6;
export const GAUGE_HIGH = 0.85;

/** The band for a usage ratio, using the SessionChipsBar threshold semantics verbatim. */
export function gaugeBand(ratio: number, low: number = GAUGE_LOW, high: number = GAUGE_HIGH): GaugeBand {
  if (ratio >= high) return 'critical';
  if (ratio >= low) return 'warning';
  return 'safe';
}

/** Fill color per band: cyan = healthy (the harness accent); warm = status. */
export const GAUGE_BAND_FILL: Record<GaugeBand, string> = {
  safe: 'var(--color-accent-primary)',
  warning: 'var(--color-status-warning)',
  critical: 'var(--color-status-error)',
};

/** The human word per band (for an aria-valuetext / a state chip). */
export const GAUGE_BAND_WORD: Record<GaugeBand, string> = {
  safe: 'healthy',
  warning: 'elevated',
  critical: 'critical',
};

// Canonical ring geometry, the named-meter donut (the SessionChipsBar gauge size).
const RING_SIZE = 104;
const RING_C = RING_SIZE / 2; // center
const RING_R = 40;
const RING_SW = 9;
const RING_CIRC = 2 * Math.PI * RING_R;

export const NOCKERL_GAUGE_STYLES = `
/* ── Ring / arc form: a recessed track + a band-colored value arc ──────────────── */
.nk-gauge { display: block; flex: 0 0 auto; transform: rotate(-90deg); }
.nk-gauge__track { fill: none; stroke: var(--color-canvas-edge); }
/* Static stroke color per band; only the dash OFFSET animates (interpolatable). */
.nk-gauge__val { fill: none; stroke-linecap: round; transition: stroke-dashoffset .35s var(--motion-easing-standard), stroke .2s; }
.nk-gauge__fig { font-family: var(--font-family-mono); font-weight: var(--font-weight-bold);
  fill: var(--color-on-card); font-size: var(--font-size-20); text-anchor: middle; }
.nk-gauge__cap { font-family: var(--font-family-sans); font-size: var(--font-size-10);
  fill: var(--color-on-card-muted); text-anchor: middle; letter-spacing: var(--font-tracking-normal); }

/* ── Linear bar form: a recessed well + a flat band-colored fill ───────────────── */
.nk-gauge-bar { position: relative; height: var(--space-3); border-radius: var(--radius-pill);
  background: var(--color-canvas-edge); overflow: hidden;
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent); }
.nk-gauge-bar__fill { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: var(--radius-pill);
  transition: width .35s var(--motion-easing-standard); min-width: var(--space-1);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* Threshold ticks sit ON the track at .60 + .85 so the bands read structurally. */
.nk-gauge-bar__tick { position: absolute; top: 0; bottom: 0; width: var(--space-px);
  background: color-mix(in srgb, var(--color-on-card) 38%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .nk-gauge__val, .nk-gauge-bar__fill { transition: none; }
}
`;

export interface NockerlGaugeProps {
  /** Which meter form to render. */
  shape: NockerlGaugeShape;
  /** Current value (0..max). */
  value: number;
  /** Full-scale value. Default 100. */
  max?: number;
  /** Accessible name (role="meter"). REQUIRED. */
  label: string;
  /** Human value description for screen readers (e.g. "82K / 200K · 41%, elevated"). */
  valueText?: string;
  /** Lower / upper band thresholds as RATIOS of max (default .60 / .85). */
  low?: number;
  high?: number;
  /** Ring only: the big center figure (e.g. "41%"). */
  centerPrimary?: ReactNode;
  /** Ring only, the small center caption under the figure (e.g. "CTX"). */
  centerSecondary?: ReactNode;
  /** Render the .60 / .85 threshold ticks on the track (bar only). */
  showTicks?: boolean;
  /** Extra class names appended to the root. */
  className?: string;
  /** Inline style applied to the rendered root (positioning / sizing hooks). */
  style?: CSSProperties;
  /** Optional id on the root meter element. */
  id?: string;
}

/**
 * A single Nockerl threshold meter, the named gauge the spec documents. A recessed
 * track with a FLAT band-colored fill (bar) or value arc (ring); the band is cyan while
 * healthy and warms to amber → red past the thresholds. role="meter" + aria-value*. The
 * caller owns the surrounding chrome (readouts, legends, steppers); the recipe CSS rides
 * as a Fragment sibling (a display:none <style>, so it adds no layout).
 */
export const NockerlGauge = forwardRef<HTMLDivElement | SVGSVGElement, NockerlGaugeProps>(function NockerlGauge({
  shape,
  value,
  max = 100,
  label,
  valueText,
  low = GAUGE_LOW,
  high = GAUGE_HIGH,
  centerPrimary,
  centerSecondary,
  showTicks = false,
  className,
  style,
  id,
}: NockerlGaugeProps, ref) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const band = gaugeBand(ratio, low, high);
  const pct = Math.round(ratio * 100);
  const fill = GAUGE_BAND_FILL[band];
  const aria = {
    role: 'meter' as const,
    'aria-label': label,
    'aria-valuenow': pct,
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuetext': valueText,
  };

  if (shape === 'bar') {
    const cls = ['nk-gauge-bar', className].filter(Boolean).join(' ');
    return (
      <>
        <div ref={ref as Ref<HTMLDivElement>} id={id} className={cls} style={style} {...aria}>
          <div className="nk-gauge-bar__fill" style={{ width: `${ratio * 100}%`, background: fill }} />
          {showTicks && (
            <>
              <span className="nk-gauge-bar__tick" style={{ left: `${low * 100}%` }} aria-hidden="true" />
              <span className="nk-gauge-bar__tick" style={{ left: `${high * 100}%` }} aria-hidden="true" />
            </>
          )}
        </div>
        <style>{NOCKERL_GAUGE_STYLES}</style>
      </>
    );
  }

  // ring
  const cls = ['nk-gauge', className].filter(Boolean).join(' ');
  const figY = centerSecondary != null ? RING_C - 2 : RING_C;
  return (
    <>
      <svg ref={ref as Ref<SVGSVGElement>} id={id} className={cls} style={style} width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} {...aria}>
        <circle className="nk-gauge__track" cx={RING_C} cy={RING_C} r={RING_R} strokeWidth={RING_SW} />
        <circle
          className="nk-gauge__val"
          cx={RING_C}
          cy={RING_C}
          r={RING_R}
          strokeWidth={RING_SW}
          stroke={fill}
          strokeDasharray={RING_CIRC}
          strokeDashoffset={RING_CIRC * (1 - ratio)}
        />
        {/* counter-rotate the labels upright (the ring group is rotated -90 via CSS) */}
        {centerPrimary != null && (
          <text className="nk-gauge__fig" x={RING_C} y={figY} dy="0.34em" transform={`rotate(90 ${RING_C} ${RING_C})`}>
            {centerPrimary}
          </text>
        )}
        {centerSecondary != null && (
          <text className="nk-gauge__cap" x={RING_C} y={RING_C + 16} transform={`rotate(90 ${RING_C} ${RING_C})`}>
            {centerSecondary}
          </text>
        )}
      </svg>
      <style>{NOCKERL_GAUGE_STYLES}</style>
    </>
  );
});

/** LEAF: renders its own SVG/CSS meter geometry (ring arc + linear bar). role="meter"
 *  is not a facsimile role; it draws no button/input/a/hr/progress/[facsimile role], so it
 *  owns nothing. centerPrimary/centerSecondary carry text figures, not child components. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlGauge;
