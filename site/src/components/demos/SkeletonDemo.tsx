/**
 * SkeletonDemo: the live, interactive Nockerl skeleton-loader island for web.
 *
 * The CONTENT-SHAPED placeholder: muted, recessed blocks in the exact silhouette
 * of the components about to land, so the layout never jumps. DISTINCT from its
 * three feedback siblings: spinner (indeterminate circular loader, no shape),
 * progress-bar (progress against a known total), empty-state (a resolved
 * zero-data result). A skeleton is none of those; it mimics the footprint.
 *
 * Sourced honestly from the shipped apps (never the web dashboard): neither ships
 * an explicit skeleton. Android loads regions with a centered
 * `CircularProgressIndicator` (files/ui/FileViewer.kt, files/ui/FilesSheet.kt,
 * chat/ui/MessageList.kt); Voice shows a small `ProgressView()` ("Transcribing…",
 * UI/RecordingHUD.swift); SwiftUI ships `.redacted(reason: .placeholder)` but
 * Voice doesn't use it. So the SYSTEM is designed ORIGINALLY from the laws here
 * and the drift is flagged on the page.
 *
 * Laws, verbatim:
 *   • a block is a RECESSED well: a muted surface stepped BELOW its card (the
 *     inverse of a lifted card) with a faint inner shadow. Sinks, never glows.
 *   • the SHIMMER is a token highlight that travels with `transform` ONLY. The
 *     fill is static and never tweens (CSS can't cross-fade gradients; the law).
 *     The pulse variant animates `opacity`. Both subtle, not decorative pulsing.
 *   • each block's radius matches the real thing it replaces (avatar = pill,
 *     thumb = card, button = control, chip = pill, line = track). Honest silhouette.
 *   • prefers-reduced-motion FREEZES to a calm static placeholder.
 *   • presentational: aria-hidden, wrapped in ONE aria-busy/aria-live status so
 *     AT hears one announcement, not a wall of empty boxes.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * var(--token) (docs/demo-token-contract.md). Literals remain only for pure
 * geometry (avatar/thumb dimensions, sweep width) and the transition curve.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { NockerlButton, NockerlIcon, NockerlSegmentedControl, NockerlSurface, type ComposeContract } from '@dizyx/nockerl-react';

export type SkeletonShape = 'line' | 'avatar' | 'thumb' | 'button' | 'chip';
export type SkeletonMotion = 'shimmer' | 'pulse';

// The placeholder block is a RECESSED well: a muted surface stepped BELOW the
// card (mixed toward the canvas/shadow), with a faint inner shadow. The shimmer
// is a single token-built highlight that travels with transform only, so the block
// fill never tweens. The pulse variant animates opacity instead. All tokens.
const STYLES = `
.nk-sk-demo { font-family: var(--font-family-sans); color: var(--color-on-card); max-width: 560px; }
.nk-sk-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }

/* ── The base placeholder block: a recessed well, not a lifted card ─────────── */
/* muted surface stepped BELOW its card (toward the ground); inner shadow = sinks,
   the inverse of a card's drop shadow + catch-light. Never a glow. */
.nk-sk { position: relative; overflow: hidden; border-radius: var(--radius-track);
  background: color-mix(in srgb, var(--color-card-surface1) 62%, var(--color-canvas));
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent); }
/* the SHIMMER sweep: a CONTRASTING band that TRAVELS with transform only (the fill never
   tweens; law). Uses on-card, not surface-highlight (that catch-light is ~6% white → invisible
   on the dark skeleton and white-on-white in light). on-card flips per theme (light band on
   dark, subtle dark band on light), so the sweep reads in BOTH. */
.nk-sk--shimmer::after { content: ""; position: absolute; inset-block: 0; inset-inline-start: 0; width: 60%;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-on-card) 14%, transparent), transparent);
  transform: translateX(-120%); animation: nk-sk-sweep 1.6s cubic-bezier(.4,0,.2,1) infinite; }
/* the PULSE variant: opacity only (interpolatable), no travelling highlight */
.nk-sk--pulse { animation: nk-sk-pulse 1.6s ease-in-out infinite; }
@keyframes nk-sk-sweep { 0% { transform: translateX(-120%); } 100% { transform: translateX(280%); } }
@keyframes nk-sk-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }

/* shape radii MATCH the real thing each block replaces (honest silhouette) */
.nk-sk--line   { height: var(--font-size-12); border-radius: var(--radius-track); }
.nk-sk--line-lg { height: var(--font-size-16); border-radius: var(--radius-track); }
.nk-sk--avatar { border-radius: var(--radius-pill); flex: 0 0 auto; }
.nk-sk--thumb  { border-radius: var(--radius-card); }
.nk-sk--button { height: var(--space-10); border-radius: var(--radius-control); }
.nk-sk--chip   { height: var(--space-6); border-radius: var(--radius-pill); }

/* a text BLOCK: stacked lines with a consistent gap; the LAST line is shorter */
.nk-sk-lines { display: flex; flex-direction: column; gap: var(--space-2); }

/* ── The containing CARD: depth lives HERE (lifted), skeletons sit recessed ──── */
/* Bg / hairline / radius / sheen come from the NockerlSurface primitive; only padding + the
   off-ladder drop shadow stay. */
.nk-sk-card {
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen);
  padding: var(--space-4);
}

/* a CARD skeleton: thumb → title line → two body lines (last shorter) → chips */
.nk-sk-cardbody { display: flex; flex-direction: column; gap: var(--space-3); }
.nk-sk-cardbody .nk-sk--thumb { height: 132px; width: 100%; }
.nk-sk-chiprow { display: flex; gap: var(--space-2); margin-top: var(--space-1); }
.nk-sk-chiprow .nk-sk--chip { width: var(--space-16); }
.nk-sk-chiprow .nk-sk--chip.is-short { width: var(--space-12); }

/* a LIST-ROW skeleton: avatar → two stacked lines → trailing value, aligned to
   the real list row (avatar 28, min-height clears the 48dp law). A SHARED grid
   template (avatar track · flexible text track · fixed trailing track) pins every
   placeholder bar to the same column edges, so rows never read ragged. */
.nk-sk-row { display: grid; grid-template-columns: 28px 1fr var(--space-8);
  align-items: center; column-gap: var(--space-3);
  padding: var(--space-3) var(--space-4); min-height: calc(var(--space-12) + var(--space-2)); }
.nk-sk-row + .nk-sk-row { border-top: var(--space-px) solid var(--color-card-hairline); }
.nk-sk-row .nk-sk--avatar { width: 28px; height: 28px; }
.nk-sk-row__text { min-width: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.nk-sk-row__trail { display: flex; align-items: center; justify-content: flex-end; }
.nk-sk-card--rows { padding: 0; overflow: hidden; }

/* a TABLE skeleton: a header row of short cells, then body rows of cells.
   Columns line up vertically; gaps are consistent. */
.nk-sk-table { display: flex; flex-direction: column; }
.nk-sk-trow { display: grid; grid-template-columns: 1.6fr 1fr .8fr; gap: var(--space-4);
  align-items: center; padding: var(--space-3) var(--space-4); }
.nk-sk-trow + .nk-sk-trow { border-top: var(--space-px) solid var(--color-card-hairline); }
.nk-sk-trow--head { background: color-mix(in srgb, var(--color-on-card) 4%, transparent); }
.nk-sk-trow--head .nk-sk--line { height: var(--font-size-10); opacity: .8; }
.nk-sk-table p { margin: 0; }

/* a CHAT-MESSAGE skeleton: avatar → a bubble holding stacked lines (last short).
   The bubble itself uses the bubble radius, so it matches a real message. A shared
   grid template (avatar track · bubble track) pins the bubble's left edge. */
.nk-sk-chat { display: grid; grid-template-columns: var(--space-8) 1fr; column-gap: var(--space-3); align-items: start; }
.nk-sk-chat .nk-sk--avatar, .nk-sk-chat .nk-ld-avatar { width: 32px; height: 32px; }
.nk-sk-bubble { min-width: 0; max-width: 78%;
  background: var(--color-card-surface2);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-bubble) var(--radius-bubble) var(--radius-bubble) var(--radius-bubble-tail);
  padding: var(--space-3) var(--space-4);
  display: flex; flex-direction: column; gap: var(--space-2); }

/* ── The LOADED content (revealed by the live toggle to prove footprint match) ── */
.nk-ld-card { display: flex; flex-direction: column; gap: var(--space-3); }
.nk-ld-thumb { height: 132px; width: 100%; border-radius: var(--radius-card);
  background: linear-gradient(135deg, var(--color-accent-primary-soft), color-mix(in srgb, var(--color-canvas) 70%, var(--color-card-surface3)));
  border: var(--space-px) solid var(--color-card-hairline); display: flex; align-items: center; justify-content: center;
  color: var(--color-on-card-muted); }
.nk-ld-thumb svg { width: 28px; height: 28px; }
.nk-ld-title { font-size: var(--font-size-16); font-weight: var(--font-weight-semibold); line-height: var(--font-line-height-20); margin: 0; }
.nk-ld-body { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); margin: 0; }
.nk-ld-chiprow { display: flex; gap: var(--space-2); margin-top: var(--space-1); }
.nk-ld-chip { height: var(--space-6); border-radius: var(--radius-pill); padding: 0 var(--space-3);
  display: inline-flex; align-items: center; font-size: var(--font-size-10); font-weight: var(--font-weight-semibold);
  letter-spacing: var(--font-tracking-normal); background: var(--color-accent-primary-soft); color: var(--color-accent-primary); }
.nk-ld-row { display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4); min-height: calc(var(--space-12) + var(--space-2)); }
.nk-ld-row + .nk-ld-row { border-top: var(--space-px) solid var(--color-card-hairline); }
.nk-ld-avatar { width: 28px; height: 28px; border-radius: var(--radius-pill); flex: 0 0 auto;
  display: inline-flex; align-items: center; justify-content: center; background: var(--color-card-surface3);
  color: var(--color-on-card); font-size: var(--font-size-12); font-weight: var(--font-weight-semibold); }
.nk-ld-row__text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-ld-row__p { font-size: var(--font-size-14); font-weight: var(--font-weight-medium); line-height: var(--font-line-height-20);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }
.nk-ld-row__s { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }
.nk-ld-row__v { flex: 0 0 auto; font-size: var(--font-size-12); color: var(--color-on-card-muted); }

/* ── The toggle row, where a real NockerlButton + a real NockerlSegmentedControl live ───────── */
.nk-sk-bar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3);
  margin-bottom: var(--space-5); }

.nk-sk-note { display: inline-flex; align-items: center; gap: var(--space-1); margin-top: var(--space-5);
  font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-sk-note b { color: var(--color-accent-primary); }

/* the two-up grid: primitive shapes vs composed skeletons share one stage */
.nk-sk-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-6); }
@media (min-width: 720px) { .nk-sk-grid { grid-template-columns: 1fr 1fr; } }
.nk-sk-stack { margin-top: var(--space-6); }
/* a horizontal cluster (avatar + text, button + chips), vertically centered */
.nk-sk-hrow { display: flex; align-items: center; gap: var(--space-3); }
/* visually-hidden live region: one announcement for AT, no empty boxes read out */
.nk-sk-sr { position: absolute; width: var(--space-px); height: var(--space-px);
  overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

/* reduced motion: FREEZE to a calm static placeholder, no infinite animation */
@media (prefers-reduced-motion: reduce) {
  .nk-sk--shimmer::after { animation: none; transform: translateX(-120%); opacity: 0; }
  .nk-sk--pulse { animation: none; opacity: .85; }
}
`;

type BlockProps = { shape: SkeletonShape; motion: SkeletonMotion; width?: string; className?: string };

/** A single skeleton block, the unit the spec documents. */
function Block({ shape, motion, width, className = '' }: BlockProps) {
  const dim = shape === 'avatar' ? { width, height: width } : { width };
  return (
    <span aria-hidden="true" className={`nk-sk nk-sk--${shape} nk-sk--${motion} ${className}`} style={dim} />
  );
}

/** A text block: N stacked lines with the LAST line shorter (honest paragraph). */
function Lines({ count, motion }: { count: number; motion: SkeletonMotion }) {
  return (
    <span className="nk-sk-lines">
      {Array.from({ length: count }).map((_, i) => (
        <Block key={i} shape="line" motion={motion} width={i === count - 1 ? '58%' : '100%'} />
      ))}
    </span>
  );
}

const IconImg = (
  <NockerlIcon>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </NockerlIcon>
);

function CardSpecimen({ loaded, motion }: { loaded: boolean; motion: SkeletonMotion }) {
  if (loaded) {
    return (
      <NockerlSurface className="nk-sk-card">
        <div className="nk-ld-card">
          <div className="nk-ld-thumb">{IconImg}</div>
          <h4 className="nk-ld-title">Gateway refactor</h4>
          <p className="nk-ld-body">
            Streamed the SSE handler into its own module and added back-pressure on the
            assistant placeholder queue.
          </p>
          <div className="nk-ld-chiprow">
            <span className="nk-ld-chip">api-server</span>
            <span className="nk-ld-chip">done</span>
          </div>
        </div>
      </NockerlSurface>
    );
  }
  return (
    <NockerlSurface className="nk-sk-card" aria-hidden="true">
      <div className="nk-sk-cardbody">
        <Block shape="thumb" motion={motion} />
        <Block shape="line" className="nk-sk--line-lg" motion={motion} width="64%" />
        <Lines count={2} motion={motion} />
        <span className="nk-sk-chiprow">
          <Block shape="chip" motion={motion} />
          <Block shape="chip" className="is-short" motion={motion} />
        </span>
      </div>
    </NockerlSurface>
  );
}

const ROWS = [
  { initials: 'NA', p: 'api-server · gateway refactor', s: 'Idle · last active 12m ago', v: '12m' },
  { initials: 'LA', p: 'credential-store · allowlist audit', s: 'Needs attention · approval required', v: '1h' },
  { initials: 'DD', p: 'dueydo · failed deploy', s: 'Error · build exited 1', v: '3h' },
];

function ListSpecimen({ loaded, motion }: { loaded: boolean; motion: SkeletonMotion }) {
  if (loaded) {
    return (
      <NockerlSurface className="nk-sk-card nk-sk-card--rows">
        {ROWS.map((r) => (
          <div className="nk-ld-row" key={r.p}>
            <span className="nk-ld-avatar">{r.initials}</span>
            <span className="nk-ld-row__text">
              <p className="nk-ld-row__p">{r.p}</p>
              <p className="nk-ld-row__s">{r.s}</p>
            </span>
            <span className="nk-ld-row__v">{r.v}</span>
          </div>
        ))}
      </NockerlSurface>
    );
  }
  return (
    <NockerlSurface className="nk-sk-card nk-sk-card--rows" aria-hidden="true">
      {ROWS.map((_, i) => (
        <div className="nk-sk-row" key={i}>
          <Block shape="avatar" motion={motion} width="28px" />
          <span className="nk-sk-row__text">
            <Block shape="line" motion={motion} width="100%" />
            <Block shape="line" motion={motion} width="60%" />
          </span>
          <span className="nk-sk-row__trail">
            <Block shape="line" motion={motion} width="100%" />
          </span>
        </div>
      ))}
    </NockerlSurface>
  );
}

const THEAD = ['Model', 'Context', 'Calls'];
const TROWS = [
  ['Large 2.0', '128k', '4.9k'],
  ['Qwen3-Embedding', '8k', '12.1k'],
  ['Whisper-large', 'n/a', '880'],
];

function TableSpecimen({ loaded, motion }: { loaded: boolean; motion: SkeletonMotion }) {
  if (loaded) {
    return (
      <NockerlSurface className="nk-sk-card nk-sk-card--rows">
        <div className="nk-sk-table">
          <div className="nk-sk-trow nk-sk-trow--head">
            {THEAD.map((h) => <p className="nk-ld-row__s" key={h}>{h}</p>)}
          </div>
          {TROWS.map((row) => (
            <div className="nk-sk-trow" key={row[0]}>
              {row.map((cell, c) => <p className={c === 0 ? 'nk-ld-row__p' : 'nk-ld-row__s'} key={c}>{cell}</p>)}
            </div>
          ))}
        </div>
      </NockerlSurface>
    );
  }
  return (
    <NockerlSurface className="nk-sk-card nk-sk-card--rows" aria-hidden="true">
      <div className="nk-sk-table">
        <div className="nk-sk-trow nk-sk-trow--head">
          <Block shape="line" motion={motion} width="50%" />
          <Block shape="line" motion={motion} width="60%" />
          <Block shape="line" motion={motion} width="50%" />
        </div>
        {TROWS.map((_, i) => (
          <div className="nk-sk-trow" key={i}>
            <Block shape="line" motion={motion} width="82%" />
            <Block shape="line" motion={motion} width="54%" />
            <Block shape="line" motion={motion} width="46%" />
          </div>
        ))}
      </div>
    </NockerlSurface>
  );
}

function ChatSpecimen({ loaded, motion }: { loaded: boolean; motion: SkeletonMotion }) {
  if (loaded) {
    return (
      <NockerlSurface className="nk-sk-card">
        <div className="nk-sk-chat">
          <span className="nk-ld-avatar">AI</span>
          <div className="nk-sk-bubble">
            <p className="nk-ld-body" style={{ color: 'var(--color-on-card)' }}>
              Pulled the real loading treatments from both apps, then designed the skeleton
              from the laws so the bubble never reflows when the answer streams in.
            </p>
          </div>
        </div>
      </NockerlSurface>
    );
  }
  return (
    <NockerlSurface className="nk-sk-card" aria-hidden="true">
      <div className="nk-sk-chat">
        <Block shape="avatar" motion={motion} width="32px" />
        <div className="nk-sk-bubble">
          <Block shape="line" motion={motion} width="100%" />
          <Block shape="line" motion={motion} width="92%" />
          <Block shape="line" motion={motion} width="56%" />
        </div>
      </div>
    </NockerlSurface>
  );
}

/**
 * The interactive showcase. A LIVE toggle swaps every specimen between its
 * skeleton and its loaded content (proving the footprint holds and the layout
 * never jumps), plus a shimmer-vs-pulse switch. Primitive shapes are shown alone;
 * the composed skeletons (card, list row, table, chat message) match the real
 * components' footprints, aria-hidden under one aria-busy/aria-live status.
 */
/** LEAF, rendering placeholder shimmer SHAPES (line/avatar/thumb/button/chip); the
 *  shapes are deliberately raw geometry (not facsimiles of the real primitives). */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default function SkeletonDemo() {
  const [loaded, setLoaded] = useState(false);
  const [motion, setMotion] = useState<SkeletonMotion>('shimmer');
  const regionId = useId();

  // Auto-resolve once on mount so the page demonstrates the load→content beat,
  // then leave control to the user via the toggle. Cleared on unmount.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timer.current = setTimeout(() => setLoaded(true), 2600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="nk-sk-demo">
      <style>{STYLES}</style>

      <div className="nk-sk-bar">
        <NockerlButton
          text={loaded ? 'Show skeleton' : 'Reveal content'}
          variant="secondary"
          size="md"
          onClick={() => setLoaded((v) => !v)}
        />
        <NockerlSegmentedControl
          label="Skeleton animation"
          size="sm"
          value={motion}
          onChange={(v) => setMotion(v as SkeletonMotion)}
          segments={[
            { value: 'shimmer', label: 'Shimmer' },
            { value: 'pulse', label: 'Pulse' },
          ]}
        />
      </div>

      {/* One status for AT, not one announcement per empty box. */}
      <span className="nk-sk-sr" role="status" aria-live="polite" aria-busy={!loaded}>
        {loaded ? 'Content loaded' : 'Loading content…'}
      </span>

      <div id={regionId}>
        <p className="nk-sk-demo__lbl">Primitive shapes: block, avatar, thumb, button, chip</p>
        <NockerlSurface className="nk-sk-card" aria-hidden={!loaded ? 'true' : undefined}>
          {loaded ? (
            <div className="nk-ld-card">
              <div className="nk-sk-hrow">
                <span className="nk-ld-avatar">PM</span>
                <span className="nk-ld-row__text">
                  <p className="nk-ld-row__p">the design lead</p>
                  <p className="nk-ld-row__s">Head of Software Engineering</p>
                </span>
              </div>
              <p className="nk-ld-body" style={{ color: 'var(--color-on-card)' }}>
                A skeleton mirrors the shape of what is loading, so nothing shifts when the
                real data lands.
              </p>
              <div className="nk-ld-chiprow">
                <span className="nk-ld-chip">primary</span>
                <span className="nk-ld-chip">chip</span>
              </div>
            </div>
          ) : (
            <div className="nk-sk-cardbody">
              <div className="nk-sk-hrow">
                <Block shape="avatar" motion={motion} width="36px" />
                <span className="nk-sk-row__text">
                  <Block shape="line" motion={motion} width="58%" />
                  <Block shape="line" motion={motion} width="38%" />
                </span>
              </div>
              <Lines count={3} motion={motion} />
              <div className="nk-sk-hrow">
                <Block shape="button" motion={motion} width="var(--space-16)" />
                <span className="nk-sk-chiprow" style={{ marginTop: 0 }}>
                  <Block shape="chip" motion={motion} />
                  <Block shape="chip" className="is-short" motion={motion} />
                </span>
              </div>
            </div>
          )}
        </NockerlSurface>

        <p className="nk-sk-demo__lbl" style={{ marginTop: 'var(--space-8)' }}>
          Composed skeletons: same footprint as the real component
        </p>
        <div className="nk-sk-grid">
          <CardSpecimen loaded={loaded} motion={motion} />
          <ChatSpecimen loaded={loaded} motion={motion} />
        </div>
        <div className="nk-sk-stack"><ListSpecimen loaded={loaded} motion={motion} /></div>
        <div className="nk-sk-stack"><TableSpecimen loaded={loaded} motion={motion} /></div>
      </div>

      <p className="nk-sk-note">
        State: <b>{loaded ? 'content' : 'skeleton'}</b> · motion <b>{motion}</b>. Toggle it;
        the footprint holds, so the layout never jumps.
      </p>
    </div>
  );
}
