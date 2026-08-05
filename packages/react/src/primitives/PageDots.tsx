/**
 * NockerlPageDots, the Tier-1 page-dots pager primitive. A compact row of page markers (one dot
 * per page; the active dot widens to a cyan pill) for carousels, onboarding, and compact
 * pagination. DISTINCT from NockerlPagination (numbered cells) and NockerlTabs (which owns tabpanels):
 * this is a `role="group"` of page-marker <button>s with `aria-current` on the active dot,
 * NOT the tab pattern (no associated panels). Owns its dot buttons; composes ONLY tokens.
 *
 * Design laws: the fill is STATIC per state; only the active dot's WIDTH animates
 * (interpolatable), never a fill tween; focus is an OUTLINE ring; freezes under
 * prefers-reduced-motion. Injects its recipe CSS as the LAST child.
 */
import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract.js';

export interface NockerlPageDotsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current page index (0-based). */
  page: number;
  /** Total number of pages. */
  count: number;
  /** Called with the selected page index. */
  onChange: (page: number) => void;
  /** Accessible name for the group (a "N of M" position is appended). */
  label?: string;
}

export const NOCKERL_PAGE_DOTS_STYLES = `
.nk-dots { display: inline-flex; align-items: center; gap: var(--space-2); }
.nk-dots__dot {
  box-sizing: border-box; width: 8px; height: 8px; padding: 0; border: 0; border-radius: var(--radius-pill);
  background: var(--color-on-card-muted); opacity: .45; cursor: pointer;
  transition: width .2s var(--motion-easing-standard), background-color .12s, opacity .12s, transform .12s;
}
.nk-dots__dot:hover:not(.nk-dots__dot--current) { opacity: .8; }
.nk-dots__dot:active:not(.nk-dots__dot--current) { transform: scale(.85); }
.nk-dots__dot:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
/* pages already seen read as filled cyan (muted); the current widens to a cyan pill. */
.nk-dots__dot--done { background: var(--color-accent-primary); opacity: .5; }
.nk-dots__dot--current { width: var(--space-5); background: var(--color-accent-primary); opacity: 1; cursor: default; }
@media (prefers-reduced-motion: reduce) { .nk-dots__dot { transition: none; } }
`;

/** A compact page-dots pager, a role="group" of page markers; the active dot widens +
 *  carries aria-current. Click a dot to jump. */
export const NockerlPageDots = forwardRef<HTMLDivElement, NockerlPageDotsProps>(function NockerlPageDots({ page, count, onChange, label = 'Pages', className, ...rest }, ref) {
  return (
    <div {...rest} ref={ref} className={['nk-dots', className].filter(Boolean).join(' ')} role="group" aria-label={`${label}, ${page + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`nk-dots__dot${i < page ? ' nk-dots__dot--done' : ''}${i === page ? ' nk-dots__dot--current' : ''}`}
          aria-label={`Go to page ${i + 1} of ${count}`}
          aria-current={i === page ? 'true' : undefined}
          onClick={() => onChange(i)}
        />
      ))}
      <style>{NOCKERL_PAGE_DOTS_STYLES}</style>
    </div>
  );
});

/** LEAF: owns its dot <button>s; it IS the page-dots primitive. */
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default NockerlPageDots;
