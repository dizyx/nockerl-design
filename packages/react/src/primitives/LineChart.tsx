/**
 * NockerlLineChart is the Tier-1 SVG line / area PLOT primitive. ONE home for the token-colored
 * time-series plot: the coordinate space, the grid + y-ticks, the x-axis + labels, the
 * flash-free draw-in line (and optional area fill), the FOCUSABLE data points, and the
 * hover / focus tooltip. The plot every usage panel draws is a single edit, not a
 * copy-paste inline <svg>. Composes ONLY tokens + pure SVG geometry (no other primitive);
 * the selectable legend + card chrome stay in the CONSUMER (it composes NockerlChip).
 *
 * Sourced from the shipped apps (never the web dashboard, never a chart library):
 *   • the multi-series line / area over a strided x-axis with a leading y-axis (hairline
 *     grid + muted labels) is the Voice HomeSection chart-card vocabulary, redrawn by hand
 *     in SVG for web. Primary = brand cyan; extra series take the CATEGORICAL ramp.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • the plot is FLAT inside its card (no glow, no colored shadow); depth lives in the
 *     card the consumer wraps it in.
 *   • flash-free draw-in: the line strokes in via the interpolatable stroke-dashoffset
 *     ONLY; the fills are static and the path never tweens its shape. FREEZES under
 *     prefers-reduced-motion.
 *   • focus is an OUTLINE: a focus-visible cyan ring on each data point; never a shadow.
 *   • axes / grid are border + muted tokens; the tooltip is a small lifted card.
 *   • a plot is a role="img" with a generated data summary; each point is a focusable
 *     role="button" that names itself and (while active) points aria-describedby at the
 *     role="status" tooltip.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a var(--token). The
 * only literals are SVG coordinate-space geometry (the viewBox, PAD, stroke widths, point
 * radii) and the transition curves. Those are exactly what design tokens do not cover.
 *
 * Injects the recipe CSS as the LAST child of the wrapper (the wrapper is the positioned
 * tooltip anchor); identical injected blocks dedupe in effect. (The NockerlStepper-lesson.)
 */
import { forwardRef, useId, useMemo, useState } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract.js';

/** One plot series: a key (React + toggle identity), a label, a token color, and its data. */
export type ChartSeries = { key: string; label: string; color: string; data: number[] };

export interface NockerlLineChartProps extends HTMLAttributes<HTMLDivElement> {
  /** The series to RENDER (the consumer filters on/off + passes the active set). */
  series: ChartSeries[];
  /** Category labels along the x-axis (left to right). */
  xLabels: string[];
  /** Also fill under the line (the AREA variant). Default false (line only). */
  area?: boolean;
  /** Explicit y-max; else auto nice-rounded from the data. */
  yMax?: number;
  /** Explicit y-tick values; else [0, max/2, max]. */
  yTicks?: number[];
  /** Shown on ticks + tooltip, e.g. "$". Ignored when valueFormat is set. */
  valuePrefix?: string;
  /** Overrides valuePrefix for tick / tooltip formatting. */
  valueFormat?: (v: number) => string;
  /** viewBox height (an SVG coordinate, not design px). Default 200. */
  height?: number;
  /** Overrides the auto-generated data summary (role="img" name). */
  ariaLabel?: string;
}

// ── Plot geometry (an SVG coordinate space, not design pixels) ─────────────────
const W = 520;
const DEFAULT_H = 200;
const PAD = { t: 14, r: 14, b: 26, l: 34 };

/** x for point i of a series of length len. */
const sx = (i: number, len: number) => PAD.l + (len <= 1 ? 0 : (i / (len - 1)) * (W - PAD.l - PAD.r));
/** y for value v against the plot max, within a plot of the given height. */
const sy = (v: number, max: number, plotH: number) =>
  PAD.t + plotH - (max <= 0 ? 0 : (v / max) * plotH);
/** The polyline "d" for a series. */
const linePath = (data: number[], max: number, plotH: number) =>
  data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i, data.length).toFixed(1)} ${sy(v, max, plotH).toFixed(1)}`).join(' ');
/** The closed area "d" for a series (the line, dropped to the baseline + closed). */
const areaPath = (data: number[], max: number, plotH: number) =>
  `${linePath(data, max, plotH)} L ${sx(data.length - 1, data.length).toFixed(1)} ${PAD.t + plotH} L ${sx(0, data.length).toFixed(1)} ${PAD.t + plotH} Z`;

export const NOCKERL_LINE_CHART_STYLES = `
/* The SVG plot stays flat inside the card the consumer wraps it in. */
.nk-plot-wrap { position: relative; }
.nk-plot { display: block; width: 100%; height: auto; overflow: hidden; }
.nk-plot__grid { stroke: var(--color-divider); stroke-width: var(--space-px); }
.nk-plot__axis { stroke: var(--color-outline-subtle); stroke-width: var(--space-px); }
.nk-plot__tick { fill: var(--color-on-card-muted); font-size: var(--font-size-10); font-family: var(--font-family-sans); }
.nk-plot__tick--y { text-anchor: end; }
.nk-plot__tick--x { text-anchor: middle; }
.nk-plot__area { stroke: none; }
/* Draw-in: ONLY the interpolatable stroke-dashoffset animates (the law). The dash length
   is an author-time approximation, long enough to cover the path; it FREEZES under
   reduced-motion. */
.nk-plot__line { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: var(--nk-len, 1400); stroke-dashoffset: 0; animation: nk-draw .9s var(--motion-easing-standard) both; }
@keyframes nk-draw { from { stroke-dashoffset: var(--nk-len, 1400); } to { stroke-dashoffset: 0; } }
/* A focusable data point is a real button overlaid on the plot. */
.nk-pt { cursor: pointer; }
/* Native ring is suppressed on ANY focus (it draws nothing, so a point never lights up
   on a mouse click or a programmatic focus); the visible KEYBOARD ring is drawn solely by
   .nk-pt:focus-visible .nk-pt__ring below, so keyboard users still get a clear indicator. */
.nk-pt:focus { outline: none; }
.nk-pt__hit { fill: transparent; }
.nk-pt__dot { stroke: var(--color-card-surface1); stroke-width: 2; transition: r .12s; }
.nk-pt[data-active="true"] .nk-pt__dot { r: 5; }
.nk-pt:focus-visible .nk-pt__ring { stroke: var(--color-accent-primary); stroke-width: 2; }
.nk-plot__cursor { stroke: var(--color-outline-subtle); stroke-width: var(--space-px); stroke-dasharray: 3 3; }
/* NockerlTooltip: a small lifted card, status role for SR. */
.nk-tip { position: absolute; transform: translate(-50%, calc(-100% - var(--space-2))); pointer-events: none;
  background: var(--color-card-surface3); border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-control); padding: var(--space-2) var(--space-3); min-width: var(--size-chart-min); z-index: 2;
  box-shadow: 0 var(--elevation-level2) 14px -6px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-tip__x { font-size: var(--font-size-10); color: var(--color-on-card-muted); text-transform: uppercase; letter-spacing: var(--font-tracking-eyebrow); }
.nk-tip__row { display: flex; align-items: center; gap: var(--space-2); margin-top: var(--space-1); font-size: var(--font-size-12); }
.nk-tip__swatch { width: 8px; height: 8px; border-radius: var(--radius-pill); flex: 0 0 auto; }
.nk-tip__val { margin-left: auto; font-family: var(--font-family-mono); color: var(--color-on-card); font-weight: var(--font-weight-medium); }
@media (prefers-reduced-motion: reduce) {
  .nk-plot__line { animation: none; }
  .nk-pt__dot { transition: none; }
}
`;

/**
 * A single Nockerl line / area plot renders the token-colored time series the spec documents.
 * A flat plot with a hairline grid + leading y-ticks, a strided x-axis, an optional area
 * fill, a flash-free draw-in line, and focusable data points that surface a role="status"
 * tooltip on hover / focus. The caller owns the card chrome + the selectable legend and
 * passes the ALREADY-FILTERED active series; the recipe CSS rides as the wrapper's last child.
 */
export const NockerlLineChart = forwardRef<HTMLDivElement, NockerlLineChartProps>(function NockerlLineChart({
  series,
  xLabels,
  area = false,
  yMax,
  yTicks,
  valuePrefix = '',
  valueFormat,
  height = DEFAULT_H,
  ariaLabel,
  className,
  ...rest
}, ref) {
  const [hover, setHover] = useState<number | null>(null);
  const tipId = useId();
  const plotH = height - PAD.t - PAD.b;

  // value formatter: an explicit valueFormat wins; else the prefix + the raw number.
  const fmt = useMemo(
    () => valueFormat ?? ((v: number) => `${valuePrefix}${v}`),
    [valueFormat, valuePrefix],
  );

  // y-max: explicit, else auto nice-rounded up from the data (min scale 8).
  const max = useMemo(() => {
    if (yMax !== undefined) return yMax;
    const vals = series.flatMap((s) => s.data);
    return Math.max(8, Math.ceil((Math.max(0, ...vals) + 2) / 5) * 5);
  }, [series, yMax]);

  const ticks = yTicks ?? [0, max / 2, max];

  // clamp hover to a valid category index (a series toggle can shrink the set)
  const activeHover = hover !== null && hover >= 0 && hover < xLabels.length ? hover : null;

  const summary =
    ariaLabel ??
    `Line chart. ${series
      .map((s) => `${s.label}: ${s.data.map((v, i) => `${xLabels[i]} ${fmt(v)}`).join(', ')}`)
      .join('. ')}`;

  return (
    <div {...rest} ref={ref} className={['nk-plot-wrap', className].filter(Boolean).join(' ')}>
      <svg className="nk-plot" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={summary}>
        {/* horizontal grid + y ticks */}
        {ticks.map((t) => {
          const y = sy(t, max, plotH);
          return (
            <g key={t}>
              <line className="nk-plot__grid" x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} />
              <text className="nk-plot__tick nk-plot__tick--y" x={PAD.l - 6} y={y + 3}>
                {fmt(Math.round(t))}
              </text>
            </g>
          );
        })}
        {/* x axis baseline + labels */}
        <line className="nk-plot__axis" x1={PAD.l} y1={PAD.t + plotH} x2={W - PAD.r} y2={PAD.t + plotH} />
        {xLabels.map((lbl, i) => (
          <text key={lbl} className="nk-plot__tick nk-plot__tick--x" x={sx(i, xLabels.length)} y={height - 8}>
            {lbl}
          </text>
        ))}
        {/* hover cursor */}
        {activeHover !== null && (
          <line
            className="nk-plot__cursor"
            x1={sx(activeHover, xLabels.length)}
            y1={PAD.t}
            x2={sx(activeHover, xLabels.length)}
            y2={PAD.t + plotH}
          />
        )}
        {/* areas (lowest first) + lines */}
        {area &&
          series.map((s) => (
            <path
              key={`a-${s.key}`}
              className="nk-plot__area"
              d={areaPath(s.data, max, plotH)}
              fill={s.color}
              opacity={0.1}
            />
          ))}
        {series.map((s) => (
          <path
            key={`l-${s.key}`}
            className="nk-plot__line"
            d={linePath(s.data, max, plotH)}
            stroke={s.color}
            style={{ ['--nk-len' as string]: '1400' } as CSSProperties}
          />
        ))}
        {/* focusable points */}
        {series.map((s) =>
          s.data.map((v, i) => {
            const cx = sx(i, xLabels.length);
            const cy = sy(v, max, plotH);
            return (
              <g
                key={`${s.key}-${i}`}
                className="nk-pt"
                data-active={activeHover === i || undefined}
                tabIndex={0}
                role="button"
                aria-describedby={activeHover === i ? tipId : undefined}
                aria-label={`${s.label}, ${xLabels[i]}: ${fmt(v)}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                onFocus={() => setHover(i)}
                onBlur={() => setHover((h) => (h === i ? null : h))}
              >
                <circle className="nk-pt__hit" cx={cx} cy={cy} r={12} />
                <circle className="nk-pt__ring" cx={cx} cy={cy} r={7} fill="none" />
                <circle className="nk-pt__dot" cx={cx} cy={cy} r={activeHover === i ? 5 : 3} fill={s.color} />
              </g>
            );
          }),
        )}
      </svg>

      {activeHover !== null && series.length > 0 && (
        <div
          className="nk-tip"
          id={tipId}
          role="status"
          style={{
            left: `${(sx(activeHover, xLabels.length) / W) * 100}%`,
            top: `${(Math.min(...series.map((s) => sy(s.data[activeHover]!, max, plotH))) / height) * 100}%`,
          }}
        >
          <div className="nk-tip__x">{xLabels[activeHover]}</div>
          {series.map((s) => (
            <div className="nk-tip__row" key={s.key}>
              <span className="nk-tip__swatch" style={{ background: s.color }} />
              <span>{s.label}</span>
              <span className="nk-tip__val">{fmt(s.data[activeHover]!)}</span>
            </div>
          ))}
        </div>
      )}
      <style>{NOCKERL_LINE_CHART_STYLES}</style>
    </div>
  );
});

/** LEAF: a self-contained SVG plot (svg/line/text/path/g/circle) + a div tooltip. The
 *  focusable data points use role="button" on <g>, which is NOT in the facsimile role set
 *  (only progressbar/switch/checkbox/radio/radiogroup/slider/tab/tablist/menu/menuitem),
 *  and it draws no <button>/<a href>/<input>/…, so it owns nothing. `series`/`xLabels` are
 *  data arrays, not slots; the consumer owns the card chrome + selectable legend. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlLineChart;
