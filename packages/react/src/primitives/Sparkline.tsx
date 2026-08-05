/**
 * NockerlSparkline is the Tier-1 inline micro-trend primitive. ONE home for the own-min/max
 * normalized polyline + the trailing "now" dot, so the trend glyph that StatCards,
 * stat tiles, and any future inline metric draw is a single edit, not a copy-paste.
 * Composes ONLY tokens + pure SVG geometry (no other primitive).
 *
 * Sourced from the shipped apps (never the web dashboard):
 *   • Android (canonical), `chat/ui/ClusterSheet.kt` StatTile's trailing `NockerlSparkline`:
 *     a path normalized in its OWN min/max box with a dot on the latest point. The
 *     algorithm here is that one verbatim. `ChartDemo` (pad 3) and `StatCardDemo`
 *     (pad 1) both draw through this primitive, and the `pad` prop reproduces each
 *     call-site's exact coordinate space (visual no-op).
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • the line is FLAT. The caller passes the stroke (brand cyan, on-accent on a
 *     featured fill, or a categorical tint); the sparkline never invents a color and
 *     never glows.
 *   • flash-free: the optional draw-on (`draw`) animates ONLY the interpolatable
 *     stroke-dashoffset and FREEZES under prefers-reduced-motion; the path itself
 *     never tweens its shape.
 *   • a sparkline is decorative chrome with a text alternative: the caller passes a
 *     descriptive `ariaLabel` (role="img"); the geometry is aria-hidden by nature.
 *
 * TOKEN-REACTIVE: stroke color is a caller-supplied var(--token). The only literals
 * are SVG coordinate-space geometry (the px box, the 1.5 stroke, the r=2 dot) and the
 * transition curve, exactly what design tokens do not cover.
 *
 * Injects the recipe CSS as a Fragment SIBLING of the <svg> (a <style> child would be
 * an SVG-namespaced node, and a wrapper element would perturb the consumer's flex row;
 * a sibling <style> is display:none by the UA sheet, so it adds zero layout). Identical
 * injected blocks dedupe in effect. (The NockerlStepper-lesson injection.)
 */
import { forwardRef } from 'react';
import type { CSSProperties, SVGAttributes } from 'react';
import type { ComposeContract } from '../compose-contract.js';

export interface NockerlSparklineProps extends Omit<SVGAttributes<SVGSVGElement>, 'width' | 'height'> {
  /** The series, left-to-right. Normalized to its OWN min/max (the Android algorithm). */
  data: number[];
  /** SVG coordinate-space width in px. */
  width?: number;
  /** SVG coordinate-space height in px. */
  height?: number;
  /** Inset (px) so the stroke + the "now" dot never clip at the box edge. StatCard uses 1, the chart stat tiles use 3. */
  pad?: number;
  /** Line + dot color: a var(--token) the caller supplies (cyan / on-accent / categorical). */
  stroke?: string;
  /** Render the trailing dot on the latest point (the "now" marker). */
  showLast?: boolean;
  /** Draw-on: the line strokes in once on mount (frozen under reduced-motion). */
  draw?: boolean;
  /** Accessible description (role="img"); e.g. "Tokens trend, 10 points, latest 13". */
  ariaLabel?: string;
}

/**
 * The own-min/max normalized polyline + the latest point (the Android `NockerlSparkline`
 * algorithm verbatim), with `pad` parameterizing the coordinate inset so each call site
 * keeps its exact geometry. Returns the path `d` and the `last` [x, y] for the dot.
 */
export function sparkPath(
  data: number[],
  w: number,
  h: number,
  pad: number,
): { d: string; last: readonly [number, number] } {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const innerW = w - 2 * pad;
  const innerH = h - 2 * pad;
  const step = innerW / (data.length - 1 || 1);
  const pts = data.map(
    (v, i) => [pad + i * step, pad + innerH - ((v - min) / range) * innerH] as const,
  );
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return { d, last: pts[pts.length - 1]! };
}

export const NOCKERL_SPARKLINE_STYLES = `
/* The micro-trend glyph is a flat normalized polyline; overflow visible so the
   trailing dot + the round stroke caps never clip at the coordinate-box edge. */
.nk-spark { display: block; overflow: visible; }
.nk-spark__line { fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
/* Draw-on: only the interpolatable stroke-dashoffset animates (the law). The dash
   length is an approximation (real path length is unknown at author time), but long
   enough to cover the box; it FREEZES under reduced-motion. */
.nk-spark__line--draw { stroke-dasharray: var(--nk-len, 200); animation: nk-spark-draw .8s var(--motion-easing-standard) both; }
@keyframes nk-spark-draw { from { stroke-dashoffset: var(--nk-len, 200); } to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { .nk-spark__line--draw { animation: none; } }
`;

/**
 * A single Nockerl sparkline is the inline micro-trend the spec documents. A flat
 * polyline normalized to its own min/max, with an optional trailing "now" dot and an
 * optional draw-on. The caller owns the stroke color, the box size, the `pad` (coordinate
 * inset), and the accessible label. The <svg> is the root; the recipe CSS rides as a
 * Fragment sibling (a display:none <style>, so it adds no layout).
 */
export const NockerlSparkline = forwardRef<SVGSVGElement, NockerlSparklineProps>(function NockerlSparkline(
  {
    data,
    width = 64,
    height = 22,
    pad = 1,
    stroke = 'var(--color-accent-primary)',
    showLast = true,
    draw = false,
    ariaLabel,
    className,
    ...rest
  },
  ref,
) {
  const { d, last } = sparkPath(data, width, height, pad);
  const cls = ['nk-spark', className].filter(Boolean).join(' ');
  return (
    <>
      <svg
        {...rest}
        ref={ref}
        className={cls}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
      >
        <path
          className={`nk-spark__line${draw ? ' nk-spark__line--draw' : ''}`}
          d={d}
          fill="none"
          stroke={stroke}
          style={draw ? ({ ['--nk-len' as string]: '200' } as CSSProperties) : undefined}
        />
        {showLast && <circle cx={last[0]} cy={last[1]} r={2} fill={stroke} />}
      </svg>
      <style>{NOCKERL_SPARKLINE_STYLES}</style>
    </>
  );
});

/** LEAF: a pure SVG polyline + trailing dot (svg/path/circle). No facsimile elements,
 *  no child design-components; `data` is a numeric array, not a slot. Owns nothing. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlSparkline;
