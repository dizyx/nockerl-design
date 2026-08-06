/**
 * NockerlTodoWidget, the live PLAN-PROGRESS widget (the agent-console
 * epic). The agent's running plan as a compact card: what's done, what's running
 * NOW, what's blocked, what's still ahead. The Stepper is its closest sibling, but a
 * plan is not a wizard: steps don't navigate, they REPORT. This is a quiet
 * read-only card, not a control.
 *
 * Anatomy:
 *   • header: the title + the "3 / 7" count (mono, tabular) + a
 *     NockerlProgressSegments meter (one cell per step, done cells filled);
 *   • steps: one row per item, a small STATE glyph (shape + color dual-coded:
 *     success check = done · live NockerlSpinner = running · warning triangle =
 *     blocked · empty muted ring = pending) + the label. Done rows DIM (the same
 *     seen-vs-unseen ink rule as NockerlJobRow); the running row keeps full ink;
 *     a blocked row voices its reason in a warm detail line.
 *
 * Laws: the card lifts (neutral shadow + catch-light); state lives in the GLYPH,
 * never a rail or a row wash; the meter fill is cyan (progress is progress, not a
 * status). TOKEN-REACTIVE; literals are pure glyph geometry. No backticks in STYLES.
 */
import type { ReactNode } from 'react';
import { NockerlProgressSegments } from '../primitives/ProgressTrack.js';
import { NockerlSpinner } from '../primitives/Spinner.js';
import type { ComposeContract } from '../compose-contract.js';

export type NockerlTodoState = 'pending' | 'running' | 'done' | 'blocked';

export interface NockerlTodoItem {
  /** Stable key. Falls back to the label. */
  id?: string;
  /** The step text. */
  label: string;
  state: NockerlTodoState;
  /** Optional supporting line: a blocked row's reason, a running row's detail. */
  detail?: string;
}

export interface NockerlTodoWidgetProps {
  /** Card heading. */
  title?: string;
  /** The plan steps, in order. */
  items: NockerlTodoItem[];
  /** The header ACCESSORY seat (the ratified settings-grammar name):
   *  a chip, an info tip, a collapse control owned by the host. It trails the title. */
  headerAccessory?: ReactNode;
  className?: string;
}

export const NOCKERL_TODO_WIDGET_STYLES = `
.nk-tw {
  display: flex; flex-direction: column; gap: var(--space-3); min-width: 0;
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight),
              0 var(--elevation-level2) var(--space-4) calc(-1 * var(--space-2)) color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent);
  font-family: var(--font-family-sans);
}
.nk-tw__head { display: flex; align-items: center; gap: var(--space-2); }
.nk-tw__title { font-size: var(--font-size-14); font-weight: var(--font-weight-medium); color: var(--color-on-card); }
.nk-tw__count { margin-left: auto; font-family: var(--font-family-mono); font-variant-numeric: tabular-nums;
  font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-tw__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.nk-tw__item { display: flex; align-items: flex-start; gap: var(--space-2); min-width: 0; }
/* the state glyph column: a fixed 1lh-aligned box so multi-line labels hang cleanly */
.nk-tw__glyph { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
  width: var(--space-4); height: var(--font-line-height-20); }
.nk-tw__glyph svg { display: block; width: calc(var(--space-3) + var(--space-0-5)); height: calc(var(--space-3) + var(--space-0-5)); }
.nk-tw__glyph--done { color: var(--color-status-success); }
.nk-tw__glyph--blocked { color: var(--color-status-warning); }
.nk-tw__glyph--pending { color: var(--color-on-card-muted); opacity: .6; }
.nk-tw__txt { display: flex; flex-direction: column; gap: var(--space-0-5); min-width: 0; }
.nk-tw__label { font-size: var(--font-size-14); line-height: var(--font-line-height-20); color: var(--color-on-card); overflow-wrap: anywhere; }
.nk-tw__detail { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); }
/* DONE rows dim (the seen-ink rule); the check glyph keeps its success color. */
.nk-tw__item--done .nk-tw__label { color: var(--color-on-card-muted); }
/* BLOCKED voices the reason warm; the label stays neutral ink (color never alone). */
.nk-tw__item--blocked .nk-tw__detail { color: var(--color-status-warning); }
/* visually-hidden state words for assistive tech (self-contained, no docs-theme dep) */
.nk-tw .nk-tw__sr { position: absolute; width: var(--space-px); height: var(--space-px);
  margin: calc(-1 * var(--space-px)); padding: 0; overflow: hidden; clip-path: inset(50%);
  white-space: nowrap; border: 0; }
`;

const GLYPH: Record<Exclude<NockerlTodoState, 'running'>, ReactNode> = {
  done: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  blocked: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  pending: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
    </svg>
  ),
};

const STATE_WORD: Record<NockerlTodoState, string> = {
  pending: 'pending',
  running: 'in progress',
  done: 'done',
  blocked: 'blocked',
};

/**
 * The agent's plan as a compact progress card: title + "done / total" count + a
 * per-step segment meter over dual-coded step rows (check / spinner / warning /
 * empty ring). Read-only: a report, not a wizard.
 */
export function NockerlTodoWidget({ title = 'Plan', items, headerAccessory, className }: NockerlTodoWidgetProps) {
  const done = items.filter((i) => i.state === 'done').length;
  return (
    <section className={['nk-tw', className].filter(Boolean).join(' ')} aria-label={`${title}: ${done} of ${items.length} steps done`}>
      <div className="nk-tw__head">
        <span className="nk-tw__title">{title}</span>
        {headerAccessory}
        <span className="nk-tw__count" aria-hidden="true">
          {done} / {items.length}
        </span>
      </div>
      <NockerlProgressSegments total={items.length} filled={done} aria-hidden="true" />
      <ul className="nk-tw__list">
        {items.map((it) => (
          <li key={it.id ?? it.label} className={`nk-tw__item nk-tw__item--${it.state}`}>
            <span className={`nk-tw__glyph nk-tw__glyph--${it.state}`} aria-hidden="true">
              {it.state === 'running' ? <NockerlSpinner size="xs" /> : GLYPH[it.state]}
            </span>
            <span className="nk-tw__txt">
              <span className="nk-tw__label">
                {it.label}
                <span className="nk-tw__sr">, {STATE_WORD[it.state]}</span>
              </span>
              {it.detail && <span className="nk-tw__detail">{it.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
      <style>{NOCKERL_TODO_WIDGET_STYLES}</style>
    </section>
  );
}

// A fixed composition of NockerlProgressSegments + NockerlSpinner over its own quiet
// list markup, with one open header ACCESSORY seat for host chrome (the ratified name).
export const compose = {
  slots: { headerAccessory: { accepts: '*', required: false } },
} satisfies ComposeContract;

export default NockerlTodoWidget;
