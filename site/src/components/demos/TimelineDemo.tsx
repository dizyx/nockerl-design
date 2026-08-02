/**
 * TimelineDemo: the live, interactive Nockerl TIMELINE / activity feed for web.
 *
 * The CHRONOLOGICAL event feed: a vertical rail with status-colored event NODES,
 * each event a moment in time (timestamp, title, optional description). The
 * activity / audit / session-history surface (what HAPPENED, when), NOT the
 * `stepper` (a forward process with done/current/upcoming flow state) and NOT a
 * bare `list` of rows. Nodes are events on a time axis, not steps in a flow.
 *
 * Sourced verbatim from the shipped apps (never the web dashboard):
 *   • Android transcript (`chat/ui/AgentTranscriptPanel.kt` + `AgentTranscriptSegments.kt`):
 *     a time-ordered run of events covering session_init ("session started · model ·
 *     N tools"), tool_use (mono name + "running…"), done ("done · duration · tokens",
 *     success), error (red surface + Close glyph + message). Glyphs Bot / Build / Spark / Close.
 *   • Android inbox (`inbox/ui/NotificationRow.kt`): event anatomy = status mark ·
 *     badge · title · time-ago · chevron; the `formatTimeAgo` ramp (just now · 2m ·
 *     1h · 3d · 1w · 1mo) + the "MMM d, yyyy h:mm a" datetime, both reused for <time>.
 *   • Voice (`UI/HistoryView.swift`): a reverse-chronological list of timestamped
 *     rows, a hairline between them, a "Clear all". The day-grouped, load-earlier feed.
 *
 * Laws: the RAIL is a recessed divider TRACK (`--color-divider`, an inner-shadow well
 * that stays a hairline, never a glow); NODES are status dots in a surface-colored notch
 * (the status-dot grammar), never emission. Status hues are warm (success/warning/error)
 * + info + neutral grey; the brand cyan (`accent`) marks the ONE highlight + the live
 * "now" node. It is never decorative and never color-alone (glyph + worded label +
 * aria). Feedback animates interpolatable props only: the live node fades OPACITY,
 * the reveal slides+fades; both freeze under prefers-reduced-motion. The feed is an
 * <ol> of <li> events with real <time>; any interactive event / "load earlier" is a
 * real <button> with a focus ring; nodes center on the rail, the line is flush
 * between nodes, the two-sided variant is balanced.
 *
 * TOKEN-REACTIVE: every color/font/radius/spacing is a `var(--token)` (see
 * docs/demo-token-contract.md). The dark stage resolves them; change a token and
 * this moves with it. Literals remain only for geometry (node/rail/icon dims, curves).
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { NockerlButton, NockerlIcon, type ComposeContract } from '@dizyx/nockerl-react';

// The event status set: warm status + info + neutral, plus `accent` for the ONE
// highlighted / live event (brand cyan). Maps 1:1 to the app's status + dot tokens.
export type EventStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';

export interface TimelineEvent {
  id: string; // stable React key + the "load earlier" boundary
  title: string; // what happened (the accessible name carrier)
  description?: string; // optional supporting line (body.small)
  time: string; // relative label in the rail gutter: "2m", "1h" (the time-ago ramp)
  datetime?: string; // absolute datetime for the <time> element + tooltip (never invented)
  status?: EventStatus; // node status: picks the hue + the default glyph
  icon?: ReactNode; // per-event glyph; replaces the default node fill (icon vs plain dot)
  live?: boolean; // the live "now" event; the node pulses (frozen under reduced-motion)
  onActivate?: () => void; // when set, the whole event row is a real <button>
  mono?: boolean; // render the title in mono for a tool-call / code-ish event
  meta?: ReactNode; // a small trailing meta chip on the title ("running…", "2.4k tok")
  hollow?: boolean; // render the node hollow for a quieter, routine event (ring, no fill)
}

// One fill per status from the app tokens. `info`/`accent` are the cyan ladder
// (info = streaming/live, accent = the one highlight); the rest warm + neutral grey.
const HUE: Record<EventStatus, string> = {
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)',
  error: 'var(--color-status-error)',
  info: 'var(--color-dot-streaming)',
  neutral: 'var(--color-dot-idle)',
  accent: 'var(--color-accent-primary)',
};

// A worded status for assistive tech. Status is never conveyed by hue alone.
const STATUS_WORD: Record<EventStatus, string> = {
  success: 'completed',
  warning: 'needs attention',
  error: 'error',
  info: 'in progress',
  neutral: 'event',
  accent: 'highlighted',
};

// The rail is a recessed divider TRACK; nodes are status dots in a surface notch.
// Feedback animates opacity/transform only. Tokens throughout; geometry literals carry a why-comment.
const STYLES = `
.nk-tl-demo { font-family: var(--font-family-sans); color: var(--color-on-card); --nk-tl-surface: var(--color-card-surface1); }
.nk-tl-demo__sec:not(:first-child) { margin-top: var(--space-8); }  /* clears WHATEVER precedes (not only another section) */
.nk-tl-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-tl-demo__row { display: flex; gap: var(--space-6); flex-wrap: wrap; align-items: flex-start; }
.nk-tl-demo__col { flex: 1 1 320px; min-width: 0; }
.nk-tl-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-tl-demo__count b { color: var(--color-accent-primary); }
/* The lifted CARD the feed sits on. Depth lives HERE (card radius, lit from above); the rail + nodes inside are flat. */
.nk-tl-card { background: var(--color-card-surface1); border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card); padding: var(--space-4) var(--space-5) var(--space-5);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* The feed: an ordered list of events, each a grid [time gutter][rail][content]. */
.nk-tl { list-style: none; margin: 0; padding: 0; }
.nk-tl__event { position: relative; display: grid; column-gap: var(--space-3); align-items: start;
  grid-template-columns: var(--nk-tl-gutter, 3.25rem) var(--space-5) 1fr; }
/* the time gutter: relative label, right-aligned to the rail, mono tabular nums */
.nk-tl__time { grid-column: 1; justify-self: end; text-align: right; white-space: nowrap;
  font-family: var(--font-family-mono); font-variant-numeric: tabular-nums;
  font-size: var(--font-size-12); line-height: var(--font-line-height-20);
  color: var(--color-on-card-muted); padding-top: var(--space-0-5); }
/* the rail column: a recessed divider TRACK (full height, behind the node), clipped at the first/last event so the line is flush between nodes */
.nk-tl__rail { grid-column: 2; position: relative; display: flex; flex-direction: column;
  align-items: center; align-self: stretch; }
.nk-tl__rail::before { content: ""; position: absolute; left: 50%; transform: translateX(-50%);
  top: 0; bottom: 0; width: 2px;                              /* 2px: rail hairline geometry */
  background: var(--color-divider); border-radius: var(--radius-track);
  box-shadow: inset var(--space-px) 0 var(--space-px) color-mix(in srgb, var(--color-shadow-tint) 35%, transparent); }
.nk-tl__event:first-child .nk-tl__rail::before { top: var(--space-3); }   /* start at the first node center */
.nk-tl__event:last-child .nk-tl__rail::before { bottom: auto; height: var(--space-3); }  /* stop at the last node center */
/* the NODE: a status dot in a surface notch (a SHAPE, never a glow); the notch box-shadow cuts the rail behind it */
.nk-tl__node { position: relative; z-index: 1; margin-top: var(--space-1); flex: 0 0 auto;
  width: calc(var(--space-3) + var(--space-0-5)); height: calc(var(--space-3) + var(--space-0-5));  /* 14 */
  border-radius: var(--radius-pill); display: inline-flex; align-items: center; justify-content: center;
  background: var(--nk-tl-node-hue, var(--color-dot-idle)); color: var(--color-on-accent);
  box-shadow: 0 0 0 var(--space-1) var(--nk-tl-surface), inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* a node carrying a glyph reads larger so the icon fits; the dot stays a circle */
.nk-tl__node--icon { width: var(--space-6); height: var(--space-6); margin-top: var(--space-0-5); }  /* 24 */
.nk-tl__node--icon svg { display: block; width: var(--space-4); height: var(--space-4); }            /* 16 */
/* a hollow node for a quieter, routine event (ring in the hue, no fill) */
.nk-tl__node--hollow { background: var(--nk-tl-surface);
  box-shadow: 0 0 0 var(--space-1) var(--nk-tl-surface), inset 0 0 0 var(--space-0-5) var(--nk-tl-node-hue, var(--color-dot-idle)); }
/* the LIVE "now" node: a calm ring + a pulse fading opacity 1 → ~.35 (the shipped pulse). Interpolatable only; the fill never changes */
.nk-tl__node--live { box-shadow: 0 0 0 var(--space-1) var(--nk-tl-surface),
  0 0 0 calc(var(--space-1) + var(--space-px)) color-mix(in srgb, var(--nk-tl-node-hue) 35%, transparent),
  inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-tl__node--live::after { content: ""; position: absolute; inset: 0; border-radius: var(--radius-pill);
  background: var(--nk-tl-node-hue); animation: nk-tl-pulse 1.1s ease-in-out infinite alternate; }
@keyframes nk-tl-pulse { from { opacity: 1; } to { opacity: .35; } }
/* ── the content column: title + description, padded so events space evenly ── */
.nk-tl__content { grid-column: 3; min-width: 0; padding-bottom: var(--space-5); }
.nk-tl__event:last-child .nk-tl__content { padding-bottom: 0; }
.nk-tl__title { font-size: var(--font-size-14); font-weight: var(--font-weight-medium);
  line-height: var(--font-line-height-20); color: var(--color-on-card); margin: 0; }
.nk-tl__title--mono { font-family: var(--font-family-mono); font-weight: var(--font-weight-regular);
  font-size: var(--font-size-14); }
.nk-tl__title-em { color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); }
.nk-tl__title-err { color: var(--color-status-error); }
.nk-tl__desc { font-size: var(--font-size-12); line-height: var(--font-line-height-16);
  color: var(--color-on-card-muted); margin: var(--space-0-5) 0 0; }
.nk-tl__desc--mono { font-family: var(--font-family-mono); }
/* a small inline meta chip (e.g. "running…", "2.4k tok"), the transcript pill idiom */
.nk-tl__meta { display: inline-flex; align-items: center; gap: var(--space-1); margin-left: var(--space-2);
  font-size: var(--font-size-12); font-family: var(--font-family-mono); color: var(--color-on-card-muted); }
/* an ACTIVATABLE event: the whole row is a real button (one accessible name) */
.nk-tl__btn { grid-column: 3; min-width: 0; display: block; text-align: left; cursor: pointer;
  padding: var(--space-1) var(--space-2); width: calc(100% + var(--space-4));
  margin: calc(var(--space-1) * -1) calc(var(--space-2) * -1) var(--space-4);
  background: transparent; border: 0; border-radius: var(--radius-control); font: inherit; color: inherit;
  transition: background-color .12s, transform .12s cubic-bezier(.2,0,0,1); }
.nk-tl__event:last-child .nk-tl__btn { margin-bottom: 0; }
.nk-tl__btn:hover { background: color-mix(in srgb, var(--color-on-card) 6%, transparent); }
.nk-tl__btn:active { transform: scale(.992); background: color-mix(in srgb, var(--color-on-card) 3%, transparent); }
.nk-tl__btn:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
/* ── a DAY header: flush to the content column, a quiet section label ─────── */
.nk-tl__day { display: grid; grid-template-columns: var(--nk-tl-gutter, 3.25rem) var(--space-5) 1fr;
  column-gap: var(--space-3); align-items: center; padding: var(--space-1) 0 var(--space-3); }
.nk-tl__day-line { grid-column: 2; position: relative; align-self: stretch; }
.nk-tl__day-line::before { content: ""; position: absolute; left: 50%; transform: translateX(-50%);
  top: 0; bottom: 0; width: 2px; background: var(--color-divider); }
.nk-tl__day-lbl { grid-column: 3; font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); }
.nk-tl__day-lbl b { color: var(--color-on-card); font-weight: var(--font-weight-semibold); }
/* COMPACT / dense variant: tighter rows, smaller nodes */
.nk-tl--dense .nk-tl__event { grid-template-columns: var(--nk-tl-gutter, 2.75rem) var(--space-4) 1fr; column-gap: var(--space-2); }
.nk-tl--dense .nk-tl__node { width: var(--space-2); height: var(--space-2); margin-top: calc(var(--space-1) + var(--space-0-5)); }
.nk-tl--dense .nk-tl__content { padding-bottom: var(--space-3); }
.nk-tl--dense .nk-tl__title { font-size: var(--font-size-13); }
.nk-tl--dense .nk-tl__event:first-child .nk-tl__rail::before { top: var(--space-2); }
.nk-tl--dense .nk-tl__event:last-child .nk-tl__rail::before { height: var(--space-2); }
/* TWO-SIDED: odd events on the LEFT (content col 1, right-aligned), even on the RIGHT (col 3) */
.nk-tl--split { --nk-tl-half: minmax(0, 1fr); }
.nk-tl--split .nk-tl__event { grid-template-columns: var(--nk-tl-half) var(--space-5) var(--nk-tl-half); column-gap: var(--space-4); }
.nk-tl--split .nk-tl__event > * { grid-row: 1; }  /* ALL cells share row 1: LEFT events' col3→col2→col1 DOM order else sparse-packs into 3 rows, collapsing the rail + its connector line () */
.nk-tl--split .nk-tl__event--l .nk-tl__content { grid-column: 1; text-align: right; }
.nk-tl--split .nk-tl__event--l .nk-tl__time { grid-column: 3; justify-self: start; text-align: left; }
.nk-tl--split .nk-tl__event--r .nk-tl__content { grid-column: 3; text-align: left; }
.nk-tl--split .nk-tl__event--r .nk-tl__time { grid-column: 1; justify-self: end; text-align: right; }
.nk-tl--split .nk-tl__rail { grid-column: 2; }
.nk-tl--split .nk-tl__node { margin-top: var(--space-1); }
/* the "load earlier" + live-toggle affordances are the NockerlButton primitive (secondary, sm). */
/* a freshly-revealed (loaded-earlier) event slides + fades in, both interpolatable */
.nk-tl__event--reveal { animation: nk-tl-reveal .3s cubic-bezier(.2,0,0,1) both; }
@keyframes nk-tl-reveal { from { opacity: 0; transform: translateY(calc(var(--space-1) * -1)); } to { opacity: 1; transform: none; } }
/* visually-hidden text (state announced, not conveyed by color alone) */
.nk-tl-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
/* reduced motion: freeze the live pulse at full opacity + cancel the reveal slide */
@media (prefers-reduced-motion: reduce) {
  .nk-tl__node--live::after { animation: none; opacity: 1; }
  .nk-tl__event--reveal { animation: none; }
  .nk-tl__btn { transition: none; }
}
`;

// ─── Inline glyphs (the shared NockerlIcon primitive, strokeWidth 2.4, currentColor so each node tints correctly) ──
const IconCheck = <NockerlIcon name="check" strokeWidth={2.4} />;
const IconClose = <NockerlIcon name="x" strokeWidth={2.4} />;
const IconBot = (
  <NockerlIcon strokeWidth={2.4}>
    <rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 8V4M9 13h.01M15 13h.01" />
  </NockerlIcon>
);
const IconSpark = (
  <NockerlIcon strokeWidth={2.4} path="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" />
);
const IconGit = (
  <NockerlIcon strokeWidth={2.4}>
    <circle cx="6" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><circle cx="18" cy="9" r="2.4" />
    <path d="M6 8.4v7.2M8.2 7.2A6 6 0 0 1 15.6 9.6M18 11.4c0 3-2.6 4.2-5.4 4.2H8" />
  </NockerlIcon>
);
const IconChevronUp = <NockerlIcon strokeWidth={2.4} path="m6 15 6-6 6 6" />;

// The node glyph: check on success, close on error, else the per-event icon or a
// plain dot. Mirrors the transcript's check-on-done / close-on-error.
const nodeContent = (ev: TimelineEvent): ReactNode =>
  ev.icon ?? (ev.status === 'success' ? IconCheck : ev.status === 'error' ? IconClose : null);
const nodeVars = (status: EventStatus) => ({ '--nk-tl-node-hue': HUE[status] }) as CSSProperties;
const cx = (...parts: unknown[]) => parts.filter((p) => typeof p === 'string' && p).join(' ');

/** A single timeline NODE (presentational): the status dot on the rail. */
function Node({ ev }: { ev: TimelineEvent }) {
  const glyph = nodeContent(ev);
  const cls = cx('nk-tl__node', glyph && 'nk-tl__node--icon', ev.hollow && !glyph && 'nk-tl__node--hollow', ev.live && 'nk-tl__node--live');
  return (
    <span className="nk-tl__rail">
      <span className={cls} style={nodeVars(ev.status ?? 'neutral')} aria-hidden="true">
        {glyph}
      </span>
    </span>
  );
}

/** Title + optional description: mono / emphasized / error tint, an inline meta chip,
 *  plus an sr-only "live" cue (never color-alone). Shared by both renders. */
function Body({ ev }: { ev: TimelineEvent }) {
  const status = ev.status ?? 'neutral';
  const titleCls = cx('nk-tl__title', ev.mono && 'nk-tl__title--mono', status === 'accent' && 'nk-tl__title-em', status === 'error' && 'nk-tl__title-err');
  return (
    <>
      <p className={titleCls}>
        {ev.title}
        {ev.meta && <span className="nk-tl__meta">{ev.meta}</span>}
      </p>
      {ev.description && (
        <p className={cx('nk-tl__desc', ev.mono && 'nk-tl__desc--mono')}>{ev.description}</p>
      )}
      {ev.live && <span className="nk-tl-sr">{STATUS_WORD[status]}, live</span>}
    </>
  );
}

/** A day section header: bold day word + date, aligned to the content column, the
 *  rail continuing through the gutter. Presentational (aria-hidden; the <time> carries it). */
function DayHeader({ day, date }: { day: string; date: string }) {
  return (
    <div className="nk-tl__day" aria-hidden="true">
      <span className="nk-tl__day-line" />
      <span className="nk-tl__day-lbl">
        <b>{day}</b> · {date}
      </span>
    </div>
  );
}

interface TimelineProps {
  events: TimelineEvent[];
  dense?: boolean; // compact density: tighter rows + smaller nodes
  surface?: string; // the card surface the nodes notch into (default card-surface1)
}

/** The Nockerl Timeline: an ordered list of events as status nodes on a recessed
 *  rail, each with a relative <time> + title + optional description. `onActivate`
 *  makes an event a real button; a `live` event's node pulses. */
function Timeline({ events, dense = false, surface }: TimelineProps) {
  return (
    <ol
      className={`nk-tl${dense ? ' nk-tl--dense' : ''}`}
      style={surface ? ({ '--nk-tl-surface': surface } as CSSProperties) : undefined}
    >
      {events.map((ev) => {
        const status = ev.status ?? 'neutral';
        const name = `${ev.title}${ev.description ? `. ${ev.description}` : ''}, ${ev.time}, ${STATUS_WORD[status]}`;
        return (
          <li key={ev.id} className="nk-tl__event">
            <time className="nk-tl__time" dateTime={ev.datetime} title={ev.datetime}>
              {ev.time}
            </time>
            <Node ev={ev} />
            {ev.onActivate ? (
              <button type="button" className="nk-tl__btn" onClick={ev.onActivate} aria-label={name}>
                <Body ev={ev} />
              </button>
            ) : (
              <div className="nk-tl__content">
                <Body ev={ev} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Realistic Nockerl event feeds (the canonical agent-transcript / audit idioms) ──
const SESSION: TimelineEvent[] = [
  { id: 'e1', status: 'success', time: 'just now', datetime: '2026-06-27T14:32:10', title: 'Session completed', description: 'done · 1m 48s · 18.2k tok', icon: IconSpark },
  { id: 'e2', status: 'error', time: '1m', datetime: '2026-06-27T14:31:02', title: 'Error: read_file timed out', description: 'ETIMEDOUT after 30s · retried once, then skipped' },
  { id: 'e3', status: 'neutral', time: '1m', datetime: '2026-06-27T14:30:40', title: 'tool_call: edit_file', description: 'src/components/Timeline.tsx · +42 −6', mono: true, hollow: true },
  { id: 'e4', status: 'info', time: '2m', datetime: '2026-06-27T14:30:11', title: 'tool_call: read_file', meta: 'done', description: 'docs/design-laws.md', mono: true, hollow: true },
  { id: 'e5', status: 'success', time: '2m', datetime: '2026-06-27T14:29:58', title: 'Session started', description: 'Large 2.0 · 14 tools', icon: IconBot },
];
const STATUSES: TimelineEvent[] = [
  { id: 's1', status: 'accent', time: 'now', datetime: '2026-06-27T14:40:00', title: 'Deploy succeeded', description: 'Zero-downtime swap · design-system', live: true },
  { id: 's2', status: 'success', time: '4m', datetime: '2026-06-27T14:36:00', title: 'CI passed', description: 'typecheck · lint · build · test' },
  { id: 's3', status: 'warning', time: '11m', datetime: '2026-06-27T14:29:00', title: 'Approval required', description: 'credential-store · allowlist scope change' },
  { id: 's4', status: 'error', time: '38m', datetime: '2026-06-27T14:02:00', title: 'Build failed', description: 'dueydo · exited 1' },
  { id: 's5', status: 'neutral', time: '1h', datetime: '2026-06-27T13:40:00', title: 'Branch pushed', description: 'main · 3 commits', icon: IconGit, hollow: true },
];
const DAY_TODAY: TimelineEvent[] = [
  { id: 'd1', status: 'info', time: '09:41', datetime: '2026-06-27T09:41:00', title: 'Tool call: run_tests', meta: 'running…', mono: true, live: true },
  { id: 'd2', status: 'success', time: '09:38', datetime: '2026-06-27T09:38:00', title: 'Memory written', description: '“No em dashes in emails” → decisions', icon: IconCheck },
];
const DAY_YESTERDAY: TimelineEvent[] = [
  { id: 'y1', status: 'success', time: '18:02', datetime: '2026-06-26T18:02:00', title: 'PR merged', description: ' · timeline component', icon: IconGit },
  { id: 'y2', status: 'error', time: '17:50', datetime: '2026-06-26T17:50:00', title: 'Error: 403 from the credential store', description: 'URL not in allowlist' },
];
const EARLIER: TimelineEvent = { id: 'old1', status: 'success', time: '11:20', datetime: '2026-06-24T11:20:00', title: 'Project created', description: 'nockerl-design · dizyx', icon: IconCheck };
const SPLIT: { ev: TimelineEvent; side: 'l' | 'r' }[] = [
  { side: 'l', ev: { id: 'p1', status: 'success', time: 'May', title: 'Tokens published', description: '@dizyx/nockerl-tokens v1', icon: IconCheck } },
  { side: 'r', ev: { id: 'p2', status: 'success', time: 'Jun', title: 'Docs site live', description: 'Astro Starlight catalog' } },
  { side: 'l', ev: { id: 'p3', status: 'accent', time: 'Now', title: 'Component review', description: 'one-by-one sign-off', live: true } },
  { side: 'r', ev: { id: 'p4', status: 'neutral', time: 'Next', title: 'Compose package', description: 'Maven publish', hollow: true } },
];

// Data composite: `events` is a data array rendered internally, not a slot. `icon` is a per-event glyph.
// The "load earlier" / live-toggle affordances already compose the NockerlButton primitive.
// FLAG (review, BLOCKED - primitive gap beyond `trailing`): the activatable-event <button> is the one
// hand-rolled row left, and its clean target is NockerlListItem (onSelect). Three things make it a
// genuine mismatch that `trailing` alone does NOT close, so it is NOT forced:
//   1. the event TITLE is multi-format (mono for tool-call events, accent-emphasis for a highlight,
//      error-tint for failures) + carries an inline meta chip; NockerlListItem's `primary` is a plain
//      `string`, so all of that formatting would be dropped.
//   2. the accessible NAME is a composed string: "{title}. {description}, {time}, {statusWord}"
//      (the time gutter + the sr-only worded status folded in); NockerlListItem has no `ariaLabel` and
//      derives its name from the visible primary/secondary text only, so the time + status word
//      would fall out of the SR name (an a11y regression).
//   3. the row sits in grid-column 3 of a [time][rail][content] grid, its node positioned to align
//      to the title's first line; NockerlListItem's fixed row chrome (leading slot indent + row padding +
//      56px min-height) fights that rail alignment.
// OWNS: the rail-aligned activatable event row is Timeline's OWN control (it sits in the
// [time][rail][content] grid with the node pinned to the title's first line, and NockerlListItem's
// fixed leading-slot indent + row padding + 56px min-height fight that). FOLLOW-UP: when
// NockerlListItem gains an `ariaLabel` prop + a ReactNode/formatted primary + a chromeless mode,
// Timeline can compose it and drop this own.
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

/**
 * The interactive showcase: the canonical session-run feed (status nodes incl. an
 * error, icon vs plain-dot nodes, an activatable event); a semantic-status feed with
 * a live "now" node that pulses and freezes under reduced-motion (toggle it); a
 * day-grouped audit feed with a "load earlier" reveal; a compact dense variant; and
 * a two-sided alternating timeline. Token-driven, keyboard-operable, every node
 * paired with a glyph + worded label.
 */
export default function TimelineDemo() {
  const [live, setLive] = useState(true);
  const [opened, setOpened] = useState<string | null>(null);
  const [earlierShown, setEarlierShown] = useState(false);
  const earlierRef = useRef<HTMLLIElement | null>(null);

  // Move focus to the newly-revealed event on "load earlier" (keyboard users land on it).
  useEffect(() => {
    if (earlierShown) earlierRef.current?.focus();
  }, [earlierShown]);

  const surface = 'var(--color-card-surface1)';

  // The session feed, with one activatable event wired to a state readout.
  const sessionEvents: TimelineEvent[] = SESSION.map((ev) =>
    ev.id === 'e1' ? { ...ev, onActivate: () => setOpened((o) => (o === ev.id ? null : ev.id)) } : ev,
  );
  const statusEvents: TimelineEvent[] = STATUSES.map((ev) =>
    ev.live ? { ...ev, live } : ev,
  );
  const todayEvents: TimelineEvent[] = DAY_TODAY.map((ev) => (ev.live ? { ...ev, live } : ev));

  return (
    <div className="nk-tl-demo">
      <style>{STYLES}</style>

      <section className="nk-tl-demo__sec">
        <p className="nk-tl-demo__lbl">Session run: events on a rail · status nodes · tab/click the top event</p>
        <div className="nk-tl-card">
          <Timeline events={sessionEvents} surface={surface} />
        </div>
        <p className="nk-tl-demo__count">
          {opened ? <>Opened <b>“Session completed”</b> detail.</> : 'Top event is a button. Tab to it and press Enter.'}
        </p>
      </section>

      <section className="nk-tl-demo__sec">
        <p className="nk-tl-demo__lbl">Status nodes: success · warning · error · neutral, and a live “now” node</p>
        <div className="nk-tl-card">
          <Timeline events={statusEvents} surface={surface} />
          <div style={{ marginTop: 'var(--space-4)' }}>
            <NockerlButton
              variant="secondary"
              size="sm"
              text={`${live ? 'Pause' : 'Resume'} live node`}
              onClick={() => setLive((v) => !v)}
            />
          </div>
        </div>
      </section>

      <div className="nk-tl-demo__row">
        <section className="nk-tl-demo__sec nk-tl-demo__col" style={{ marginTop: 0 }}>
          <p className="nk-tl-demo__lbl">Grouped by day: audit log with “load earlier”</p>
          <div className="nk-tl-card">
            {!earlierShown && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <NockerlButton
                  variant="secondary"
                  size="sm"
                  text="Load earlier"
                  leadingIcon={IconChevronUp}
                  onClick={() => setEarlierShown(true)}
                />
              </div>
            )}

            {earlierShown && (
              <ol className="nk-tl" style={{ '--nk-tl-surface': surface } as CSSProperties}>
                <li className="nk-tl__event nk-tl__event--reveal" ref={earlierRef} tabIndex={-1}>
                  <time className="nk-tl__time" dateTime={EARLIER.datetime} title={EARLIER.datetime}>
                    {EARLIER.time}
                  </time>
                  <Node ev={EARLIER} />
                  <div className="nk-tl__content">
                    <Body ev={EARLIER} />
                  </div>
                </li>
              </ol>
            )}

            <DayHeader day="Today" date="Jun 27" />
            <Timeline events={todayEvents} surface={surface} />
            <DayHeader day="Yesterday" date="Jun 26" />
            <Timeline events={DAY_YESTERDAY} surface={surface} />
          </div>
        </section>

        <section className="nk-tl-demo__sec nk-tl-demo__col" style={{ marginTop: 0 }}>
          <p className="nk-tl-demo__lbl">Compact, dense activity stream</p>
          <div className="nk-tl-card">
            <Timeline
              dense
              surface={surface}
              events={[
                { id: 'c1', status: 'info', time: '0s', title: 'tool_call: grep', meta: 'running…', mono: true, live, hollow: true },
                { id: 'c2', status: 'neutral', time: '2s', title: 'tool_call: read_file', mono: true, hollow: true },
                { id: 'c3', status: 'success', time: '5s', title: 'tool_call: edit_file', mono: true, hollow: true },
                { id: 'c4', status: 'neutral', time: '6s', title: 'thinking…', hollow: true },
                { id: 'c5', status: 'success', time: '9s', title: 'Turn complete', description: '4 tools · 3.1k tok' },
              ]}
            />
          </div>
        </section>
      </div>

      <section className="nk-tl-demo__sec">
        <p className="nk-tl-demo__lbl">Two-sided: events alternate either side of a center rail (roadmap / release)</p>
        <div className="nk-tl-card">
          <ol className="nk-tl nk-tl--split" style={{ '--nk-tl-surface': surface } as CSSProperties}>
            {SPLIT.map(({ ev, side }) => {
              const e: TimelineEvent = ev.id === 'p3' ? { ...ev, live } : ev;
              return (
                <li key={e.id} className={`nk-tl__event nk-tl__event--${side}`}>
                  <time className="nk-tl__time" title={e.title}>{e.time}</time>
                  <Node ev={e} />
                  <div className="nk-tl__content">
                    <Body ev={e} />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="nk-tl-demo__count">
          Live animation is <b>{live ? 'running' : 'paused'}</b>. The “now” node fades opacity; it freezes under reduced-motion.
        </p>
      </section>
    </div>
  );
}
