/**
 * NockerlClusterGrid, the CLUSTER STATUS mosaic (WS4 · task 2655b, agent-console
 * epic): a responsive auto-fill grid of NockerlNodeCell tiles, the fleet wall
 * (the compute cluster, a worker pool) at a glance.
 *
 * Deliberately a pure LAYOUT shell: the grid owns column flow + gutters and nothing
 * else: health, metrics, and badges all live in the cells. Columns auto-fill at a
 * minimum readable cell width and stretch to share the row; a single cell spans the
 * full width on narrow surfaces (min(100%, …) guards the phone column).
 *
 * TOKEN-REACTIVE; the min cell width is the one structural literal (rem, scales
 * with the root type size, deliberately not a px). No backticks in STYLES.
 */
import type { ReactNode } from 'react';
import type { ComposeContract } from '../compose-contract';

export const NOCKERL_CLUSTER_GRID_STYLES = `
.nk-cg {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
  gap: var(--space-3);
  align-items: stretch;
}
`;

export interface NockerlClusterGridProps {
  /** The node tiles (NockerlNodeCell children). */
  children: ReactNode;
  /** Accessible name for the mosaic (role="group"). */
  ariaLabel?: string;
  className?: string;
}

/** The responsive node mosaic: auto-fill columns of NockerlNodeCell tiles. */
export function NockerlClusterGrid({ children, ariaLabel = 'Cluster status', className }: NockerlClusterGridProps) {
  return (
    <div className={['nk-cg', className].filter(Boolean).join(' ')} role="group" aria-label={ariaLabel}>
      {children}
      <style>{NOCKERL_CLUSTER_GRID_STYLES}</style>
    </div>
  );
}

// CONTAINER: the mosaic holds node tiles.
export const compose = {
  slots: {
    default: { accepts: ['NockerlNodeCell'], required: true },
  },
} satisfies ComposeContract;

export default NockerlClusterGrid;
