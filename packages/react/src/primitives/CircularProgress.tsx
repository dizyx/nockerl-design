/**
 * NockerlCircularProgress is the Tier-1 DETERMINATE circular progress primitive: the ring
 * sibling of the linear NockerlProgressTrack. ONE home for the recessed track circle + the
 * flat, tone-colored value ARC whose stroke-dashoffset is the value, with an optional
 * center %. Composes ONLY tokens (for color) + pure SVG geometry (for the ring).
 *
 * This is the DETERMINATE circular form the progress-bar documents, the geometric
 * ring counterpart of NockerlProgressTrack (the LINEAR track). It is deliberately NOT its
 * neighbours:
 *   • NockerlSpinner  -> the INDETERMINATE circular loader (a rotating arc, no value). This
 *     ring never spins; it always shows a real percentage.
 *   • NockerlGauge    -> the threshold-banded token-budget METER (role="meter", cyan->amber->
 *     red bands). This ring is task PROGRESS: role="progressbar", the plain cyan accent
 *     with NO band recolor (warm tones are status, not thresholds).
 * So it shares the tone vocabulary of NockerlProgressTrack (accent / success / error), the
 * card-hairline recessed track, and the "only the interpolatable offset animates, the
 * fill never tweens, freeze under reduced-motion" law.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • the TRACK circle is the recessed card-hairline ring (the inverse of a card):
 *     depth that sinks, never a glow.
 *   • the value ARC is FLAT, static color per tone; ONLY the interpolatable
 *     stroke-dashoffset animates. The fill never tweens. Under prefers-reduced-motion
 *     the offset snaps to the new value (no transition).
 *   • determinate ALWAYS: role="progressbar" + aria-valuenow/min/max + a human
 *     aria-valuetext, so a screen reader announces the real percentage.
 *
 * TOKEN-REACTIVE: every color is a var(--token) (reusing NockerlProgressTrack's TONE_FILL so a
 * tone-color change is ONE edit). The only literals are pure SVG geometry (viewBox,
 * radius, stroke width, the dash math) and the transition curve, exactly what design
 * tokens do not cover.
 *
 * Injects the recipe CSS as the LAST child of the wrapper span (a leading style node
 * would trip a consumer's first-child / adjacent-sibling selectors; a <style> inside
 * the <svg> would be SVG-namespaced, so the wrapper hosts it). Identical injected
 * blocks dedupe in effect.
 */
import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import type { ComposeContract } from '../compose-contract';
import { TONE_FILL, type ProgressTone } from './ProgressTrack';

export type { ProgressTone };

export interface NockerlCircularProgressProps extends HTMLAttributes<HTMLSpanElement> {
  /** Determinate value, 0-100 (clamped + rounded). */
  value: number;
  /** Outer diameter in px. Default 64. */
  size?: number;
  /** Ring stroke width in px. Defaults to ~1/8 of the size. */
  thickness?: number;
  /** Arc tone: the plain cyan accent (default) or a warm status hue. */
  tone?: ProgressTone;
  /** Accessible name (role="progressbar"). REQUIRED. */
  label: string;
  /** Render the center % figure. Ignored when `centerContent` is supplied. */
  showValue?: boolean;
  /** Override the center figure with custom content (e.g. a check glyph at 100%). */
  centerContent?: ReactNode;
  /** Extra class names appended to the wrapper. */
  className?: string;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// The recipe: a recessed track circle + a flat tone-colored value arc. The ring group
// is rotated -90deg so 0% starts at 12 o'clock; only the dash OFFSET animates. NO
// backticks inside this template literal (it is itself a template literal).
export const NOCKERL_CIRCULAR_PROGRESS_STYLES = `
.nk-cp { display: inline-flex; flex-direction: column; align-items: center; line-height: 0; }
.nk-cp__svg { display: block; transform: rotate(-90deg); }
.nk-cp__track { fill: none; stroke: var(--color-card-hairline); }
/* Flat stroke per tone; only the dash OFFSET animates (interpolatable). */
.nk-cp__val { fill: none; stroke-linecap: round; transition: stroke-dashoffset .35s var(--motion-easing-standard); }
.nk-cp__fig { font-family: var(--font-family-mono); font-weight: var(--font-weight-bold);
  fill: var(--color-on-card); font-size: var(--font-size-20); text-anchor: middle; }

@media (prefers-reduced-motion: reduce) {
  .nk-cp__val { transition: none; }
}
`;

/**
 * A single Nockerl determinate circular progress ring: a recessed track circle with a
 * FLAT tone-colored value arc whose stroke-dashoffset is the value (the offset is the
 * only animated property; it freezes under reduced-motion). role="progressbar" +
 * aria-value* carry the real percentage. The .nk-cp span is the root. The recipe CSS
 * is injected as its LAST child. Geometry (radius / viewBox / stroke) is literal; every
 * color is a token.
 */
export const NockerlCircularProgress = forwardRef<HTMLSpanElement, NockerlCircularProgressProps>(function NockerlCircularProgress({
  value,
  size = 64,
  thickness,
  tone = 'accent',
  label,
  showValue = false,
  centerContent,
  className,
  ...rest
}, ref) {
  const pct = clampPct(value);
  const sw = thickness ?? Math.max(2, Math.round(size / 8));
  const c = size / 2; // center coordinate
  const r = c - sw / 2; // radius keeps the stroke inside the viewBox
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const cls = ['nk-cp', className].filter(Boolean).join(' ');
  const center = centerContent ?? (showValue ? `${pct}%` : null);

  return (
    <span {...rest} ref={ref} className={cls}>
      <svg
        className="nk-cp__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${label}, ${pct}%`}
      >
        <circle className="nk-cp__track" cx={c} cy={c} r={r} strokeWidth={sw} />
        <circle
          className="nk-cp__val"
          cx={c}
          cy={c}
          r={r}
          strokeWidth={sw}
          stroke={TONE_FILL[tone]}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
        {/* counter-rotate the figure upright (the ring group is rotated -90 via CSS) */}
        {center != null && (
          <text className="nk-cp__fig" x={c} y={c} dy="0.34em" transform={`rotate(90 ${c} ${c})`}>
            {center}
          </text>
        )}
      </svg>
      <style>{NOCKERL_CIRCULAR_PROGRESS_STYLES}</style>
    </span>
  );
});

/** LEAF: renders its own SVG/CSS ring geometry (track circle + value arc) + tokens; it
 *  owns the progressbar identity for the DETERMINATE circular form. centerContent carries
 *  a text figure (or a glyph), not a structural child component. */
export const compose = { tier: 'leaf', owns: ['role=progressbar'] } satisfies ComposeContract;

export default NockerlCircularProgress;
