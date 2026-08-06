/**
 * NockerlNodeCell, one CLUSTER NODE as a dashboard tile (the
 * agent-console epic). The unit of the ClusterStatusGrid mosaic: a lifted card
 * composing only shipped parts, with no new visual grammar:
 *
 *   • header: the shared NockerlStatusDot ladder (node health: success = online,
 *     warning = degraded, error = down, neutral = draining/idle) + the node NAME +
 *     an optional soft role NockerlBadge ("GPU · prod");
 *   • metrics: label/value rows, each optionally carrying a viz UNDER the row:
 *     a NockerlSparkline trend (util over time) or a NockerlProgressTrack pressure
 *     bar whose tone follows the ratified gauge band ladder (cyan < .60 → amber
 *     < .85 → red, the same thresholds as the context line / NockerlGauge);
 *   • footer: an open slot (chips, a models-loaded count, an action).
 *
 * Laws: cards lift (neutral shadow + catch-light, no glow); status lives in the DOT,
 * never a rail or a tinted card; values read in the mono family with tabular
 * numerals so a scanning wall of nodes doesn't jitter.
 *
 * TOKEN-REACTIVE; literals are pure geometry (sparkline coordinate space).
 * No backticks in STYLES.
 */
import type { ReactNode } from 'react';
import { NockerlStatusDot, type StatusKind } from '../primitives/StatusDot.js';
import { NockerlBadge } from '../primitives/Badge.js';
import { NockerlSparkline } from '../primitives/Sparkline.js';
import { NockerlProgressTrack, type ProgressTone } from '../primitives/ProgressTrack.js';
import type { ComposeContract } from '../compose-contract.js';

export interface NockerlNodeMetric {
  /** Metric label ("MEM", "GPU", "TEMP"). Rendered as a quiet eyebrow. */
  label: string;
  /** Display value ("87 / 119 GB"). Mono, tabular numerals. */
  value: string;
  /** Trend series → a NockerlSparkline under the row (left-to-right). */
  series?: number[];
  /** Pressure 0..1 → a NockerlProgressTrack under the row, toned by the gauge band
   *  ladder (cyan < .60, amber < .85, red ≥ .85). Ignored when `series` is given. */
  ratio?: number;
}

export interface NockerlNodeCellProps {
  /** The node name ("node-1 · GB10"). */
  name: string;
  /** Node health on the shared status ladder, lives in the DOT, never the card. */
  status: StatusKind;
  /** Accessible health label ("online", "degraded"). Also shown beside the dot. */
  statusLabel?: string;
  /** Optional soft role badge ("GPU · prod"). */
  badge?: string;
  /** Metric rows, rendered in order. */
  metrics?: NockerlNodeMetric[];
  /** Open footer slot (chips, counts, an action). */
  footer?: ReactNode;
  className?: string;
}

// The gauge band ladder (the context-line thresholds) → the ProgressTrack tone.
const pressureTone = (ratio: number): ProgressTone => (ratio >= 0.85 ? 'error' : ratio >= 0.6 ? 'warning' : 'accent');

// A lifted card cell. Status stays in the dot; the card surface is neutral.
export const NOCKERL_NODE_CELL_STYLES = `
.nk-nc {
  display: flex; flex-direction: column; gap: var(--space-3); min-width: 0;
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight),
              0 var(--elevation-level2) var(--space-4) calc(-1 * var(--space-2)) color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent);
}
.nk-nc__head { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.nk-nc__name { font-size: var(--font-size-14); font-weight: var(--font-weight-medium);
  color: var(--color-on-card); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nk-nc__state { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); }
.nk-nc__head-gap { flex: 1 1 auto; }
.nk-nc__metrics { display: flex; flex-direction: column; gap: var(--space-3); }
.nk-nc__metric { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.nk-nc__mrow { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
.nk-nc__mlabel { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); }
.nk-nc__mvalue { font-family: var(--font-family-mono); font-variant-numeric: tabular-nums;
  font-size: var(--font-size-12); color: var(--color-on-card); white-space: nowrap; }
.nk-nc__spark { display: block; width: 100%; height: var(--space-6); color: var(--color-accent-primary); }
.nk-nc__foot { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
`;

/**
 * One cluster node tile: health dot + name + role badge over metric rows (mono
 * values; sparkline trends or gauge-band pressure bars) + an open footer slot.
 */
export function NockerlNodeCell({ name, status, statusLabel, badge, metrics, footer, className }: NockerlNodeCellProps) {
  return (
    <div className={['nk-nc', className].filter(Boolean).join(' ')}>
      <div className="nk-nc__head">
        <NockerlStatusDot status={status} size="sm" {...(statusLabel !== undefined ? { ariaLabel: statusLabel } : {})} />
        <span className="nk-nc__name">{name}</span>
        {statusLabel && <span className="nk-nc__state">{statusLabel}</span>}
        <span className="nk-nc__head-gap" />
        {badge && <NockerlBadge label={badge} tone="neutral" variant="soft" />}
      </div>
      {metrics && metrics.length > 0 && (
        <div className="nk-nc__metrics">
          {metrics.map((m) => (
            <div key={m.label} className="nk-nc__metric">
              <div className="nk-nc__mrow">
                <span className="nk-nc__mlabel">{m.label}</span>
                <span className="nk-nc__mvalue">{m.value}</span>
              </div>
              {m.series ? (
                <NockerlSparkline className="nk-nc__spark" data={m.series} width={120} height={24} pad={2} showLast />
              ) : typeof m.ratio === 'number' ? (
                <NockerlProgressTrack value={m.ratio * 100} size="thin" tone={pressureTone(m.ratio)} aria-label={`${m.label} ${m.value}`} />
              ) : null}
            </div>
          ))}
        </div>
      )}
      {footer && <div className="nk-nc__foot">{footer}</div>}
      <style>{NOCKERL_NODE_CELL_STYLES}</style>
    </div>
  );
}

// A fixed composition of NockerlStatusDot + NockerlBadge + NockerlSparkline +
// NockerlProgressTrack with one open slot (footer) for chips / counts / actions.
export const compose = {
  slots: { footer: { accepts: '*', required: false } },
} satisfies ComposeContract;

export default NockerlNodeCell;
