/**
 * NockerlPagination: the Tier-3 numeric page-navigation primitive. ONE home for the windowed
 * page bar the dashboard + any list endpoint needs, so page navigation can never drift.
 * It COMPOSES the real controls: NockerlIconButton (prev/next), NockerlButton (page cells + the
 * current-page cyan-selected fill). The rows-per-page Select + the "showing X-Y of Z"
 * summary stay with the consumer (they speak the limit/offset/total vocabulary the apps
 * use); NockerlPagination owns only the control row.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - every cell is the house control (12px radius, static fill, flash-free feedback).
 *     It is a NockerlButton, so that rule lives in ONE place.
 *   - the CURRENT page reuses the button-primary SELECTED treatment (filled cyan gradient
 *     lit from above, aria-current="page"); prev/next disable at the bounds (still SEEN).
 *   - ellipsis is a non-interactive truncation gap, never a button.
 *   - focus is an OUTLINE ring (from the composed NockerlButton/NockerlIconButton).
 *
 * Variants: 'numbered' (prev + windowed cells + next) · 'compact' ("Page X of Y" between
 * prev/next) · 'prev-next' (a labelled Prev/Next pair). ArrowLeft/Right + Home/End move a
 * page while the bar is focused. Injects its layout CSS as the LAST child.
 */
import { forwardRef } from 'react';
import type { HTMLAttributes, KeyboardEvent } from 'react';
import { NockerlIcon } from '../primitives/Icon';
import { NockerlButton } from '../primitives/Button';
import { NockerlIconButton } from '../primitives/IconButton';
import type { ComposeContract } from '../compose-contract';

export type NockerlPaginationVariant = 'numbered' | 'compact' | 'prev-next';
export type NockerlPaginationTone = 'accent' | 'neutral';

const IconPrev = <NockerlIcon path="m15 6-6 6 6 6" />;
const IconNext = <NockerlIcon path="m9 6 6 6-6 6" />;

export interface NockerlPaginationProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /** Current page (1-based). */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /** Called with the next page (already clamped to 1..pageCount). */
  onChange: (page: number) => void;
  /** numbered (default) · compact · prev-next. */
  variant?: NockerlPaginationVariant;
  /** How many page cells to show either side of the current page (numbered). */
  siblings?: number;
  /**
   * Color of the compact "Page X of Y" label. 'neutral' (default) keeps the WHOLE phrase in the
   * card text color (accent-restraint law); 'accent' tints the ENTIRE phrase cyan. Never a partial
   * tint: the whole phrase shares one color, never a lone cyan digit. No effect on the
   * numbered / prev-next variants.
   */
  tone?: NockerlPaginationTone;
  /** Accessible name for the <nav> landmark. */
  label?: string;
}

export const NOCKERL_PAGINATION_STYLES = `
.nk-pg { display: inline-flex; align-items: center; flex-wrap: wrap; gap: var(--space-1); }
.nk-pg__list { display: flex; align-items: center; gap: var(--space-1); list-style: none; margin: 0; padding: 0; }
/* the composed page-cell NockerlButton, constrained to an equal square cell (tabular digits). */
.nk-pg__cell.nk-btn { min-width: var(--space-10); padding-inline: var(--space-2); font-variant-numeric: tabular-nums; }
/* ellipsis, a non-interactive truncation gap (not a button). */
.nk-pg__gap { display: inline-flex; align-items: center; justify-content: center; min-width: var(--space-6);
  height: var(--space-10); color: var(--color-on-card-muted); font-size: var(--font-size-14); user-select: none; }
/* compact "Page X of Y" label between the prev/next controls. */
.nk-pg__count { font-size: var(--font-size-13); color: var(--color-on-card); font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums; min-width: calc(var(--space-16) + var(--space-6)); text-align: center; }
/* <b> marks the current page semantically; per the Nockerl type law (weight caps at medium;
   emphasis is by contrast, never additive bold) it INHERITS the phrase weight (overriding the UA
   700) and its COLOR follows the tone (inherit). So the label is uniformly neutral (default) or
   uniformly accent, never a lone cyan digit (). */
.nk-pg__count b { color: inherit; font-weight: inherit; }
/* tone="accent": the ENTIRE phrase is cyan (opt-in; the default is neutral per accent-restraint). */
.nk-pg__count--accent { color: var(--color-accent-primary); }
`;

/** Windowed page tokens with ellipsis: first + last, a window around current, `'gap'` where elided. */
export function pageTokens(current: number, total: number, siblings = 1): Array<number | 'gap'> {
  if (total <= 5 + siblings * 2) return Array.from({ length: total }, (_, i) => i + 1);
  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const showLeftGap = left > 2;
  const showRightGap = right < total - 1;
  const out: Array<number | 'gap'> = [1];
  if (showLeftGap) out.push('gap');
  else for (let p = 2; p < left; p++) out.push(p);
  for (let p = left; p <= right; p++) if (p !== 1 && p !== total) out.push(p);
  if (showRightGap) out.push('gap');
  else for (let p = right + 1; p < total; p++) out.push(p);
  out.push(total);
  return out;
}

/**
 * The Nockerl pagination control is a <nav> landmark composing NockerlIconButton (prev/next) +
 * NockerlButton (page cells; current = primary cyan, aria-current="page"). Arrow/Home/End move a
 * page while focused.
 */
export const NockerlPagination = forwardRef<HTMLElement, NockerlPaginationProps>(function NockerlPagination({
  page,
  pageCount,
  onChange,
  variant = 'numbered',
  siblings = 1,
  tone = 'neutral',
  label = 'NockerlPagination',
  className,
  ...rest
}, ref) {
  const go = (p: number) => onChange(Math.min(Math.max(p, 1), pageCount));
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    let to = -1;
    if (e.key === 'ArrowLeft') to = page - 1;
    else if (e.key === 'ArrowRight') to = page + 1;
    else if (e.key === 'Home') to = 1;
    else if (e.key === 'End') to = pageCount;
    else return;
    e.preventDefault();
    go(to);
  };

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pageCount;

  return (
    <nav {...rest} ref={ref} className={['nk-pg', className].filter(Boolean).join(' ')} aria-label={label} onKeyDown={onKeyDown}>
      {variant === 'prev-next' ? (
        <NockerlButton variant="tertiary" size="md" leadingIcon={IconPrev} text="Previous" onClick={() => go(page - 1)} disabled={prevDisabled} />
      ) : (
        <NockerlIconButton icon={IconPrev} label="Go to previous page" onClick={() => go(page - 1)} disabled={prevDisabled} />
      )}

      {variant === 'numbered' && (
        <ol className="nk-pg__list">
          {pageTokens(page, pageCount, siblings).map((tok, i) =>
            tok === 'gap' ? (
              <li key={`gap-${i}`} className="nk-pg__gap" aria-hidden="true">&;</li>
            ) : (
              <li key={tok}>
                <NockerlButton
                  className="nk-pg__cell"
                  variant={tok === page ? 'primary' : 'ghost'}
                  size="md"
                  text={String(tok)}
                  onClick={() => go(tok)}
                  disabled={tok === page}
                  ariaLabel={tok === page ? `Page ${tok}, current page` : `Go to page ${tok}`}
                  {...(tok === page ? { 'aria-current': 'page' as const } : {})}
                />
              </li>
            ),
          )}
        </ol>
      )}

      {variant === 'compact' && (
        <span className={['nk-pg__count', tone === 'accent' && 'nk-pg__count--accent'].filter(Boolean).join(' ')} aria-live="polite">
          Page <b>{page}</b> of {pageCount}
        </span>
      )}

      {variant === 'prev-next' ? (
        <NockerlButton variant="tertiary" size="md" trailingIcon={IconNext} text="Next" onClick={() => go(page + 1)} disabled={nextDisabled} />
      ) : (
        <NockerlIconButton icon={IconNext} label="Go to next page" onClick={() => go(page + 1)} disabled={nextDisabled} />
      )}
      <style>{NOCKERL_PAGINATION_STYLES}</style>
    </nav>
  );
});

/** CONTAINER-ish: composes NockerlIconButton + NockerlButton for its controls; page cells come from
 *  page DATA (no component slots), so it exposes none. It renders no raw facsimile. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlPagination;
