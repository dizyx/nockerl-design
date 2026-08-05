/**
 * NockerlJobRow, the JOB / NOTIFICATION row (WS4 · task 2655a, agent-console epic):
 * one background job or inbox notification as a list row. A THIN SHELL over the
 * NockerlListItem grammar. It maps job semantics onto shipped parts and invents no
 * new row anatomy:
 *
 *   • leading: the job STATE as the ListItem B20 status mark (success / warning /
 *     error), a live NockerlSpinner while `running`, or a muted clock while `queued`
 *     (shape + color dual-coding, never a bare colored dot);
 *   • primary: the job title; secondary: the detail line;
 *   • trailing: the relative TIMESTAMP (the Timeline time idiom: display label +
 *     machine `dateTime` on the row title) and an optional count NockerlBadge for
 *     grouped notifications;
 *   • READ vs UNREAD: an inbox is a list of things you've seen and things you
 *     haven't: unread rows keep the ListItem's full voice (+ the badge); read rows
 *     DIM their content (muted ink, regular weight). Emphasis lives in the INK,
 *     never a left-rail or a wash (law §6 keeps status in the leading mark).
 *
 * The "JobCard" of the catalog is a VIEW of this row: the same NockerlJobRow hosted
 * on a lifted card surface (see the doc page). It is not a second component.
 *
 * TOKEN-REACTIVE; no backticks in STYLES.
 */
import type { ReactNode } from 'react';
import { NockerlListItem, type NockerlListItemStatus } from '../behaviors/ListItem.js';
import { NockerlSpinner } from '../primitives/Spinner.js';
import { NockerlBadge } from '../primitives/Badge.js';
import { NockerlIcon } from '../primitives/Icon.js';
import type { ComposeContract } from '../compose-contract.js';

export type NockerlJobState = 'queued' | 'running' | 'success' | 'warning' | 'error';

export interface NockerlJobRowProps {
  /** The job / notification title (the row's accessible name). */
  title: string;
  /** Supporting detail line ("finished in 4m 12s · 3,412 documents"). */
  detail?: string;
  /** Job state → the leading mark: B20 status icon, a live spinner, or a muted clock. */
  state: NockerlJobState;
  /** Relative timestamp display label ("2m ago"), the Timeline time idiom. */
  time?: string;
  /** Machine-readable instant for the timestamp (ISO). Surfaces as the row's title attr. */
  dateTime?: string;
  /** Unread: full-strength ink. Read rows dim. Defaults to read. */
  unread?: boolean;
  /** Grouped-notification count → a trailing accent NockerlBadge (unread only). */
  count?: number;
  /** Extra trailing node (a NockerlChip, an action) rendered after the badge. */
  trailing?: ReactNode;
  onSelect?: (() => void) | undefined;
  disabled?: boolean;
  className?: string;
}

// The shell only voices READ-dimming and the leading queued/running slot metrics.
// Every structural rule (grid, hover, focus, status mark) is NockerlListItem's own.
export const NOCKERL_JOB_ROW_STYLES = `
/* READ rows dim their CONTENT (ink only, so the row stays fully interactive):
   muted primary at regular weight, fainter secondary + value. */
.nk-jr--read .nk-li__primary { color: var(--color-on-card-muted); font-weight: var(--font-weight-regular); }
.nk-jr--read .nk-li__secondary { color: color-mix(in srgb, var(--color-on-card-muted) 75%, transparent); }
.nk-jr--read .nk-li__value { color: color-mix(in srgb, var(--color-on-card-muted) 75%, transparent); }
/* UNREAD is simply the ListItem's own full voice (500 primary + full ink). In this
   light-type system semibold == medium == 500, so unread/read separate by the READ
   dimming above (regular weight + muted ink), never by a rail or a wash. */
/* the queued clock sits muted in the leading slot (not a status, just waiting) */
.nk-jr__queued { display: inline-flex; color: var(--color-on-card-muted); }
`;

// A muted clock for `queued`: waiting is not a status (no warm color, no cyan).
const IconClock = (
  <NockerlIcon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </NockerlIcon>
);

// success / warning / error ride the ListItem B20 status mark verbatim.
const STATUS_FOR: Partial<Record<NockerlJobState, NockerlListItemStatus>> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
};

/**
 * One job / notification row: leading state mark (status icon · live spinner ·
 * queued clock) + title / detail + relative time + an optional unread count badge.
 * Read rows dim; unread rows keep full ink.
 */
export function NockerlJobRow({
  title,
  detail,
  state,
  time,
  dateTime,
  unread = false,
  count,
  trailing,
  onSelect,
  disabled = false,
  className,
}: NockerlJobRowProps) {
  const status = STATUS_FOR[state];
  const leading =
    state === 'running' ? (
      <NockerlSpinner size="sm" label="Running" />
    ) : state === 'queued' ? (
      <span className="nk-jr__queued">{IconClock}</span>
    ) : undefined;
  const badge = unread && typeof count === 'number' ? <NockerlBadge count={count} tone="accent" /> : undefined;

  return (
    <>
      <NockerlListItem
        className={['nk-jr', unread ? 'nk-jr--unread' : 'nk-jr--read', className].filter(Boolean).join(' ')}
        primary={title}
        {...(detail !== undefined ? { secondary: detail } : {})}
        {...(status !== undefined ? { status } : {})}
        {...(leading !== undefined ? { leadingIcon: leading } : {})}
        {...(time !== undefined ? { value: time } : {})}
        {...(badge || trailing
          ? {
              trailing: (
                <>
                  {badge}
                  {trailing}
                </>
              ),
            }
          : {})}
        {...(dateTime !== undefined ? { title: dateTime } : {})}
        {...(onSelect !== undefined ? { onSelect } : {})}
        disabled={disabled}
      />
      {/* sibling style block (the row itself is a <button>); identical blocks dedupe */}
      <style>{NOCKERL_JOB_ROW_STYLES}</style>
    </>
  );
}

// THIN SHELL: a fixed composition of NockerlListItem + NockerlSpinner + NockerlBadge +
// NockerlIcon with one open slot for extra trailing content (a chip, an action).
export const compose = {
  slots: { trailing: { accepts: '*', required: false } },
} satisfies ComposeContract;

export default NockerlJobRow;
