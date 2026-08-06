/**
 * JobRowDemo: the live island for the shipped NockerlJobRow.
 *
 * Two presentations of the SAME component, proving the component-vs-view split:
 *   • the INBOX list, rows stacked on one card surface (the Dashboard inbox /
 *     job-notification feed shape): leading state mark (the status icon · live
 *     spinner · queued clock) + title / detail + relative time + an unread count
 *     badge. Selecting an unread row marks it read LIVE: the ink dims, the badge
 *     drops (the whole inbox semantic).
 *   • the JOB CARD, a VIEW: the same row hosted alone on a lifted card for a
 *     dashboard column. No second component.
 *
 * TOKEN-REACTIVE; demo chrome only (the card hosts + labels). The row anatomy is
 * the package's. No backticks in STYLES.
 */
import { useState } from 'react';

import { NockerlJobRow, type NockerlJobState } from '@dizyx/nockerl-react';

// Demo chrome: the inbox card + the standalone job-card host. Rows are the package.
const STYLES = `
.nk-jrd { font-family: var(--font-family-sans); }
.nk-jrd__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-jrd__lbl + .nk-jrd__lbl { margin-top: var(--space-5); }

/* The INBOX card: one lifted surface, rows divided by hairlines (cards lift). */
.nk-jrd-list {
  max-width: var(--size-chat-column-max); background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-card);
  padding: var(--space-2);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight),
              0 var(--elevation-level2) var(--space-4) calc(-1 * var(--space-2)) color-mix(in srgb, var(--color-shadow-tint) 55%, transparent);
  display: flex; flex-direction: column;
}
.nk-jrd-list > * + button { border-top: var(--space-px) solid var(--color-alt-hairline); border-radius: 0; }

/* The JOB CARD view: the same row, alone, on its own lifted card. */
.nk-jrd-card {
  max-width: var(--size-chat-tool-card-max); background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-card);
  padding: var(--space-2);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight),
              0 var(--elevation-level2) var(--space-4) calc(-1 * var(--space-2)) color-mix(in srgb, var(--color-shadow-tint) 55%, transparent);
}

.nk-jrd__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-jrd__count b { color: var(--color-accent-primary); }
`;

interface Job {
  id: string;
  title: string;
  detail: string;
  state: NockerlJobState;
  time: string;
  dateTime: string;
  unread: boolean;
  count?: number;
}

const SEED: Job[] = [
  {
    id: 'index',
    title: 'Nightly memory index rebuild',
    detail: 'Vector store · archive · 3,412 documents',
    state: 'running',
    time: 'now',
    dateTime: '2026-07-05T02:10:00Z',
    unread: true,
  },
  {
    id: 'ci',
    title: 'CI failed on nockerl-dashboard',
    detail: 'typecheck · 2 errors in inbox-panel.tsx',
    state: 'error',
    time: '2m ago',
    dateTime: '2026-07-05T02:08:00Z',
    unread: true,
    count: 2,
  },
  {
    id: 'ratchet',
    title: 'Token-lint ratchet tightened',
    detail: 'rawPx 774 → 754 · baseline updated',
    state: 'warning',
    time: '18m ago',
    dateTime: '2026-07-05T01:52:00Z',
    unread: true,
  },
  {
    id: 'deploy',
    title: 'Dashboard deployed',
    detail: 'Deploy · zero-downtime swap · CDN purged',
    state: 'success',
    time: '1h ago',
    dateTime: '2026-07-05T01:10:00Z',
    unread: false,
  },
  {
    id: 'export',
    title: 'Session transcript export',
    detail: 'queued behind 2 jobs',
    state: 'queued',
    time: 'in queue',
    dateTime: '2026-07-05T02:09:00Z',
    unread: false,
  },
];

/**
 * The interactive showcase mounted on the Job notification row page: an inbox list
 * of NockerlJobRow rows (select an unread row to mark it read and the ink dims live)
 * plus the standalone job-card VIEW of the same component.
 */
export default function JobRowDemo() {
  const [jobs, setJobs] = useState(SEED);
  const [opened, setOpened] = useState(0);

  const open = (id: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, unread: false } : j)));
    setOpened((c) => c + 1);
  };
  const unreadCount = jobs.filter((j) => j.unread).length;

  return (
    <div className="nk-jrd">
      <style>{STYLES}</style>

      <p className="nk-jrd__lbl">Inbox list: select an unread row to mark it read</p>
      <div className="nk-jrd-list">
        {jobs.map((j) => (
          <NockerlJobRow
            key={j.id}
            title={j.title}
            detail={j.detail}
            state={j.state}
            time={j.time}
            dateTime={j.dateTime}
            unread={j.unread}
            {...(j.count !== undefined ? { count: j.count } : {})}
            onSelect={() => open(j.id)}
          />
        ))}
      </div>

      <p className="nk-jrd__lbl">Job card: the same row as a standalone dashboard VIEW</p>
      <div className="nk-jrd-card">
        <NockerlJobRow
          title="Embedding backfill"
          detail="Qwen3-Embedding-4B · node 2 · 41% done"
          state="running"
          time="started 6m ago"
          dateTime="2026-07-05T02:04:00Z"
          unread
        />
      </div>

      <p className="nk-jrd__count">
        Opened <b>{opened}</b> {opened === 1 ? 'notification' : 'notifications'} · <b>{unreadCount}</b> unread. The island is
        live.
      </p>
    </div>
  );
}
