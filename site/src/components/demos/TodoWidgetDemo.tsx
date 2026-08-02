/**
 * TodoWidgetDemo: the live island for the shipped NockerlTodoWidget (WS4 · task
 * 2655c). An agent plan that ADVANCES live: Step forward walks the running step to
 * done and starts the next (the count + segment meter + glyphs all move together);
 * Block flips the running step into the blocked state with a warm reason line;
 * Reset restarts. Exactly the console widget an agent session renders while
 * executing a plan.
 *
 * TOKEN-REACTIVE; demo chrome is only the controls + counter. No backticks in
 * STYLES.
 */
import { useState } from 'react';

import { NockerlButton, NockerlTodoWidget, type NockerlTodoItem } from '@dizyx/nockerl-react';

const STYLES = `
.nk-twd { font-family: var(--font-family-sans); }
.nk-twd__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-twd__ctl { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; margin-bottom: var(--space-4); }
.nk-twd__host { max-width: var(--size-chat-tool-card-max); }
.nk-twd__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-twd__count b { color: var(--color-accent-primary); }
`;

const PLAN: Omit<NockerlTodoItem, 'state'>[] = [
  { id: 'read', label: 'Read the failing test + the retry helper' },
  { id: 'extract', label: 'Extract shared retry logic into lib/retry.ts' },
  { id: 'clients', label: 'Point both API clients at the shared helper', detail: 'gateway + dashboard' },
  { id: 'tests', label: 'Add unit tests for the backoff ladder' },
  { id: 'gates', label: 'Run typecheck, lint, and the full test suite' },
];

/**
 * The interactive showcase mounted on the Todo widget page: a five-step agent plan.
 * Step forward advances the running step; Block trips it with a reason; Reset
 * restarts. Count, segment meter, and row glyphs move as one.
 */
export default function TodoWidgetDemo() {
  const [cursor, setCursor] = useState(1); // steps before cursor are done; cursor runs
  const [blocked, setBlocked] = useState(false);

  const items: NockerlTodoItem[] = PLAN.map((p, i) => {
    if (i < cursor) return { ...p, state: 'done' };
    if (i === cursor) {
      if (blocked)
        return { ...p, state: 'blocked', detail: 'ESLint max-warnings tripped, waiting on a ruling' };
      return { ...p, state: 'running' };
    }
    return { ...p, state: 'pending' };
  });
  const finished = cursor >= PLAN.length;

  return (
    <div className="nk-twd">
      <style>{STYLES}</style>

      <p className="nk-twd__lbl">Drive the plan: the count, meter, and glyphs move as one</p>
      <div className="nk-twd__ctl">
        <NockerlButton
          text="Step forward"
          variant="secondary"
          size="sm"
          disabled={finished || blocked}
          onClick={() => setCursor((c) => Math.min(PLAN.length, c + 1))}
        />
        <NockerlButton
          text={blocked ? 'Unblock' : 'Block current step'}
          variant="ghost"
          size="sm"
          disabled={finished}
          onClick={() => setBlocked((b) => !b)}
        />
        <NockerlButton
          text="Reset"
          variant="ghost"
          size="sm"
          onClick={() => {
            setCursor(1);
            setBlocked(false);
          }}
        />
      </div>

      <div className="nk-twd__host">
        <NockerlTodoWidget title="Refactor retry logic" items={items} />
      </div>

      <p className="nk-twd__count">
        {finished ? (
          <>
            Plan <b>complete</b>. All {PLAN.length} steps done, and the island is live.
          </>
        ) : (
          <>
            Step <b>{cursor + 1}</b> of {PLAN.length} {blocked ? 'is blocked' : 'is running'}. The island is live.
          </>
        )}
      </p>
    </div>
  );
}
