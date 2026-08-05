/**
 * NockerlBarChart, the Tier-1 categorical BAR primitive. ONE home for the token-colored flex
 * bar strip: the value figure, the rise-in fill with its top catch-light sheen, and the
 * category label, so the grouped bar chart every panel draws is a single edit, not a
 * copy-paste. Composes ONLY tokens + CSS geometry (no other primitive); the card chrome
 * (title / total) stays in the CONSUMER.
 *
 * Sourced from the shipped apps (never the web dashboard, never a chart library):
 *   • the Voice HomeSection chart card, a BarMark with a vertical cyan gradient fill and
 *     a small corner radius, over a baseline axis. Each bar takes a CATEGORICAL tint (a
 *     data color, never a second brand accent); brand cyan leads.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • the bars are FLAT color inside the card, no glow; the only lift is the top
 *     catch-light sheen (a highlight gradient), never a colored shadow.
 *   • flash-free rise-in: ONLY the interpolatable transform (scaleY) animates; the fill
 *     is static and FREEZES under prefers-reduced-motion.
 *   • labels + values are muted / on-card tokens; the value is monospaced (the figure look).
 *   • the strip is a role="img" with a generated data summary.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a var(--token). The
 * only literals are the default coordinate height + the transition curve, exactly what
 * design tokens do not cover.
 *
 * Injects the recipe CSS as the LAST child of the strip; identical injected blocks dedupe
 * in effect. (The NockerlStepper-lesson.)
 */
import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract.js';

/** One bar: a category label, its value, and a token color (categorical tint or brand cyan). */
export type ChartBar = { label: string; value: number; color: string };

export interface NockerlBarChartProps extends HTMLAttributes<HTMLDivElement> {
  /** The bars to render, left to right. */
  bars: ChartBar[];
  /** Value formatter for the figure. Default String(value). */
  valueFormat?: (v: number) => string;
  /** Explicit full-scale max; else the max of the values. */
  max?: number;
  /** Strip height in px. Default 148. */
  height?: number;
  /** Overrides the auto-generated data summary (role="img" name). */
  ariaLabel?: string;
}

export const NOCKERL_BAR_CHART_STYLES = `
/* Bar chart, a flat flex strip over a baseline axis, flat fills inside the card. */
.nk-bars { display: flex; align-items: flex-end; gap: var(--space-3); padding-top: var(--space-2);
  border-bottom: var(--space-px) solid var(--color-outline-subtle); }
.nk-bar { flex: 1 1 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: var(--space-2); height: 100%; }
/* Rise-in: ONLY the interpolatable transform (scaleY) animates (the law). The top
   catch-light sheen is a static highlight gradient, never a glow. */
.nk-bar__fill { width: 100%; border-radius: var(--radius-track) var(--radius-track) 0 0; min-height: var(--space-1);
  position: relative; transform-origin: bottom; animation: nk-rise .5s var(--motion-easing-standard) both;
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-bar__fill::after { content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface-highlight) 90%, transparent), transparent 42%); }
@keyframes nk-rise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.nk-bar__val { font-size: var(--font-size-12); font-family: var(--font-family-mono); color: var(--color-on-card); font-weight: var(--font-weight-medium); }
.nk-bar__lbl { font-size: var(--font-size-10); color: var(--color-on-card-muted); }
@media (prefers-reduced-motion: reduce) {
  .nk-bar__fill { animation: none; }
}
`;

/**
 * A single Nockerl bar strip, the categorical chart the spec documents. A flat flex row of
 * token-colored bars over a baseline axis, each with a monospaced value figure and a muted
 * label; the fills rise in via transform only (frozen under reduced-motion). The caller owns
 * the card chrome (title / total); the recipe CSS rides as the strip's last child.
 */
export const NockerlBarChart = forwardRef<HTMLDivElement, NockerlBarChartProps>(function NockerlBarChart({
  bars,
  valueFormat,
  max,
  height = 148,
  ariaLabel,
  className,
  style,
  ...rest
}, ref) {
  const fmt = valueFormat ?? ((v: number) => String(v));
  const scale = max ?? Math.max(...bars.map((b) => b.value), 0);
  const summary = ariaLabel ?? `Bar chart. ${bars.map((b) => `${b.label}: ${fmt(b.value)}`).join(', ')}.`;
  const cls = ['nk-bars', className].filter(Boolean).join(' ');
  return (
    <div
      {...rest}
      ref={ref}
      className={cls}
      role="img"
      aria-label={summary}
      style={{ height: `${height}px`, ...style } as CSSProperties}
    >
      {bars.map((b) => (
        <div className="nk-bar" key={b.label}>
          <span className="nk-bar__val">{fmt(b.value)}</span>
          <div
            className="nk-bar__fill"
            style={{ height: `${scale > 0 ? (b.value / scale) * 100 : 0}%`, background: b.color }}
          />
          <span className="nk-bar__lbl">{b.label}</span>
        </div>
      ))}
      <style>{NOCKERL_BAR_CHART_STYLES}</style>
    </div>
  );
});

/** LEAF: a flat flex strip of token-colored bars (div/span only). No facsimile elements,
 *  no child design-components; `bars` is a data array, not a slot. Owns nothing. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlBarChart;
