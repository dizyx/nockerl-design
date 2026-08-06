/**
 * ToolCallCardDemo: the live, interactive Nockerl tool-call card island for the web.
 *
 * The DEDICATED, reusable tool-invocation card: the panel an agent turn renders when
 * it calls a tool. DISTINCT from `agent-message` (the whole turn, which EMBEDS these)
 * and from the bare `code-block` / `diff-viewer` (which it reuses as its OUTPUT). Real
 * anatomy from the shipped Android app (chat/ui/ToolCallCard.kt + ToolFamily.kt +
 * chat/domain/ContentBlock.kt → `ToolCall`):
 *   • a lifted NockerlCard (cardSurface1, panel radius, Level1) with NO left rail; the family
 *     signature rides in the leading ICON TILE (a FILLED family-color square, glyph KNOCKED
 *     OUT, the banner/callout disc language) → mono summary → status chip → chevron.
 *   • status CHIP: running = a 6dp neutral pulse dot, success = Check on success@14%,
 *     error = Close on error@14%, plus elapsed (`%.1fs` < 10s, else `Ns`). Warm, never cyan.
 *   • a collapsible OUTPUT well: CopyableCodeSurface (cardSurface2, copy → Check, ~2s
 *     revert) or the inline DiffView (added=success@15% / removed=error@15% + a +/- gutter).
 *   • family taxonomy (familyAccent): SHELL_FS=cyan · AGENT=orange · SCHEDULING=indigo ·
 *     PLANNING=sky · EXTERNAL=fuchsia · DEFAULT=muted.
 *
 * Laws: the CARD lifts (neutral shadow + catch-light, NO glow) while the OUTPUT well
 * RECEDES (fields sink); per LAW 6 the family color lives in a FILLED ICON TILE, NEVER a
 * left rail / vertical stripe (the banned vibe-coding cliché): a SHAPE, not a halo. Family
 * colors are CATEGORICAL tokens, never cyan; status is warm + a glyph + text (never color-
 * alone); fills are STATIC (hover = a neutral wash, the dot pulses OPACITY). The header row is
 * the NockerlListItem primitive (expandable form: it owns the real <button>, aria-expanded, the
 * down-to-up chevron + the reveal); copy is a separate focusable target; both carry a
 * focus-visible OUTLINE ring; running announced via role="status"; reduced-motion freezes it.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a `var(--token)`
 * (docs/demo-token-contract.md): tile fill = --color-family-* + a --color-canvas knockout
 * glyph, well/status = recessed-well + status tokens. Literals = pure geometry + the timeout.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import { NockerlListItem, NockerlSurface, type ComposeContract } from '@dizyx/nockerl-react';
import CopyButton from './_CopyButton';
// A tool-call card LIVES inside an assistant turn, so demo it inside the REAL AgentMessage
// assistant bubble (shared chrome), not a hand-rolled background. AM_STYLES ships the
// `.nk-am-*` recipe; AssistantMessage renders the chat ground + header + lifted bubble.
import { AssistantMessage, AM_STYLES } from './_AssistantMessage';

// The six families mirror Android's `ToolFamily` enum (chat/ui/ToolFamily.kt).
export type ToolFamily = 'shell-fs' | 'agent' | 'scheduling' | 'planning' | 'external' | 'default';
// Status is DERIVED from the ToolCall (output null → running, output set → success,
// isError → error), never a stored field. We model it explicitly for the demo.
export type ToolStatus = 'running' | 'success' | 'error';

/** One read-only call parameter: label → value (mono), the key/value vocabulary. */
export interface ToolParam {
  label: string;
  value: string;
}

export interface ToolCallCardProps {
  /** Tool name / one-line summary (mono), e.g. "Read SseClient.kt", "$ ./gradlew test". */
  name: string;
  /** Tool family → drives the FILLED icon-tile accent (categorical, never cyan; no rail). */
  family: ToolFamily;
  /** Derived run state: running → neutral pulse, success → check, error → close. */
  status: ToolStatus;
  /** Elapsed wall-clock seconds (mirrors ToolCall.elapsedSeconds). */
  elapsedSeconds?: number;
  /** The family icon glyph (already tinted via currentColor by the tile). */
  icon: ReactNode;
  /** Compact key/value call parameters shown first in the expanded body. */
  params?: ToolParam[];
  /** Expanded code/text output (the recessed well); omit for diff or none. */
  output?: { lines: OutLine[]; error?: boolean };
  /** Expanded unified-diff output (Edit/Write) instead of a code well. */
  diff?: { path: string; lines: DiffLine[] };
  /** Start expanded (the showcase opens the success + diff cards by default). */
  defaultOpen?: boolean;
}

// ─── Family accent: categorical data tokens, never the brand cyan ───
const FAMILY_COLOR: Record<ToolFamily, string> = {
  'shell-fs': 'var(--color-family-shell-fs)',
  agent: 'var(--color-family-agent)',
  scheduling: 'var(--color-family-scheduling)',
  planning: 'var(--color-family-planning)',
  external: 'var(--color-family-external)',
  // DEFAULT → the palette's muted-on-card (familyAccent's fallback in ToolFamily.kt).
  default: 'var(--color-on-card-muted)',
};

// A pre-tokenized output line (reuses the code-well syntax vocabulary).
interface OutTok {
  text: string;
  tok?: 'key' | 'str' | 'num' | 'com';
}
type OutLine = OutTok[];

// One diff line (mirrors Android `DiffLine`: type + text + new-file line number).
interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

// The card LIFTS; the output well RECEDES. Per LAW 6 the family color lives in a FILLED
// icon TILE, with NO left rail / stripe anywhere (it's a shape, not a halo). Fills never swap;
// hover = a neutral wash, the dot pulses opacity, the chevron rotates; every value a token.
const STYLES = `
.nk-tc-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
/* ── the CARD is a lifted plane (neutral shadow + top catch-light, NOT a glow); a simple
   column with NO rail / vertical color stripe (the family color rides in the tile). The
   surface recipe (cardSurface1 fill + hairline + panel radius + sheen) comes from <NockerlSurface
   variant="panel">; only the layout + the kept own-shadow live here. ── */
.nk-tc { display: flex; flex-direction: column; max-width: var(--size-chat-tool-card-max); overflow: hidden;
  box-shadow: 0 var(--space-0-5) var(--elevation-level1) -3px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent), var(--nk-surface-sheen); }
/* ── the HEADER is the NockerlListItem primitive (expandable when the card has a body): it owns
   the <button>, the hover wash, the focus-visible ring, the trailing chevron, and the
   flash-free reveal. We only RE-SKIN its slots for the tool-card idiom: a 24px family tile (the native AccentIconBadge size)
   in the leading slot, a MONO summary as the primary line, and a transparent, tighter body
   so the recessed well is the only fill inside. ── */
/* IN-MESSAGE DENSITY (task 2674): the canon is the tool call INSIDE GatewayAgentMessage
   (native ToolAdapterCards: labelMedium 12sp mono names, a 24dp family badge, compact
   rows). NockerlListItem's default density (14px primary, 56px touch row) is the
   STANDALONE-list law. One step too large here, it read as "zoomed in". Same
   composition (no fork); only the density re-skins under .nk-tc. */
.nk-tc .nk-li { min-height: var(--space-10); padding: var(--space-2) var(--space-3); }
/* the leading slot hosts the icon tile (wider than the default 20px status slot) */
.nk-tc .nk-li__lead { width: auto; }
/* the primary line = the mono tool summary (semibold, Compose weight 1f) at the
   in-message label size (native labelMedium ≈ 12) */
.nk-tc .nk-li__primary { font-family: var(--font-family-mono); font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-12); line-height: var(--font-line-height-16); }
/* the revealed body: no NockerlListItem tint (the recessed well owns the only fill) + tighter padding */
.nk-tc .nk-li__body { background: transparent; }
.nk-tc .nk-li__body-content { padding: var(--space-2) var(--space-3) var(--space-3); }
/* the icon TILE is the family SIGNATURE (LAW 6: color in a FILLED tile, never a rail): a
   SOLID family-color square, glyph KNOCKED OUT to the canvas ink (the banner/callout disc
   language) + a catch-light/drop; reads in both light + dark. */
.nk-tc__tile { width: var(--space-6); height: var(--space-6); flex: 0 0 auto; border-radius: var(--radius-control); display: inline-flex;
  align-items: center; justify-content: center; background: var(--nk-tc-accent); color: var(--color-canvas);
  box-shadow: 0 var(--space-px) var(--elevation-level1) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent),
              inset 0 var(--space-px) 0 color-mix(in srgb, var(--color-core-white) 28%, transparent); }
/* scope under .nk-tc so this wins over NockerlListItem's own .nk-li__ico svg (equal-specificity) sizing */
.nk-tc .nk-tc__tile svg { display: block; width: 14px; height: 14px; }
/* ── the STATUS CHIP: warm status + a glyph (or a running dot) + elapsed ── */
.nk-tc__chip { display: inline-flex; align-items: center; gap: var(--space-1); flex: 0 0 auto; border-radius: var(--radius-panel);
  padding: var(--space-0-5) var(--space-2); font-family: var(--font-family-mono); font-size: var(--font-size-10); font-weight: var(--font-weight-semibold);
  background: color-mix(in srgb, var(--nk-tc-status) 14%, transparent); color: var(--nk-tc-status); }
.nk-tc__chip svg { display: block; width: 13px; height: 13px; }
/* the diff +N / -M stat: warm status counters (Android DiffView header stats) */
.nk-tc__stat { display: inline-flex; align-items: center; gap: var(--space-2); flex: 0 0 auto; font-family: var(--font-family-mono); font-size: var(--font-size-10); font-weight: var(--font-weight-semibold); }
.nk-tc__stat .add { color: var(--color-status-success); }
.nk-tc__stat .del { color: var(--color-status-error); }
/* the running DOT pulses OPACITY (interpolatable), never a fill */
.nk-tc__dot { width: 6px; height: 6px; border-radius: var(--radius-pill); background: var(--nk-tc-status); animation: nk-tc-pulse 1.1s ease-in-out infinite; }
@keyframes nk-tc-pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
/* the disclosure chevron + its rotation now belong to the NockerlListItem primitive (expand form). */
/* ── the expanded BODY: params (key/value) then the recessed output well ── */
/* PARAMS: a compact key→value block with a muted label column and a strong mono value */
.nk-tc__params { margin: 0 0 var(--space-2); display: flex; flex-direction: column; overflow: hidden;
  border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-control); }
.nk-tc__param { display: flex; align-items: baseline; gap: var(--space-3); padding: var(--space-1) var(--space-2); }
.nk-tc__param + .nk-tc__param { border-top: var(--space-px) solid var(--color-card-hairline); }
.nk-tc__param-k { flex: 0 0 auto; width: calc(var(--space-16) + var(--space-4)); margin: 0; font-family: var(--font-family-mono); font-size: var(--font-size-10); font-weight: var(--font-weight-medium); color: var(--color-on-card-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nk-tc__param-v { flex: 1 1 auto; min-width: 0; margin: 0; font-family: var(--font-family-mono); font-size: var(--font-size-12); color: var(--color-on-card); word-break: break-word; }
/* the OUTPUT WELL is ONE recessed surface (fields sink: darker + an inner shadow, NOT a
   glow). A SINGLE frame: the header bar shares this ground (no double-frame seam). */
.nk-tc__well { border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-control); background: var(--color-card-surface2); overflow: hidden; box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 30%, transparent); }
/* CALM failure: the base well is already recessed neutral (card-surface2 + inner shade), so
   error rides ONLY in the hairline WHISPERED ~18% toward status-error + the error label / preview
   text, never a red fill (big red fills are seldom, law §10). */
.nk-tc__well--error { border-color: color-mix(in srgb, var(--color-status-error) 18%, var(--color-card-hairline)); }
/* well header bar: a label + Copy, on the SAME recessed ground (a faint wash, not a lighter raised surface) + one hairline divider, so it's one clean well, not a box-on-box. */
.nk-tc__wbar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); background: color-mix(in srgb, var(--color-on-card) 3%, transparent); border-bottom: var(--space-px) solid var(--color-card-hairline); }
.nk-tc__wlbl { flex: 1 1 auto; min-width: 0; font-family: var(--font-family-mono); font-size: var(--font-size-10); font-weight: var(--font-weight-semibold); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nk-tc__wlbl--error { color: var(--color-status-error); }
/* COPY is the shared _CopyButton (it composes the plain NockerlIconButton: one glyph pair +
   the standard on-accent confirmation). The .nk-tc__copy class stays only as a JS hook for the
   demo's copy-count delegation. */
/* the scrollable code REGION: focusable; lines scroll horizontally (Android softWrap=false) */
.nk-tc__scroll { overflow: auto; max-height: var(--size-container-sm); }
.nk-tc__scroll:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(-1 * var(--space-0-5)); }
.nk-tc__pre { margin: 0; padding: var(--space-2); font-family: var(--font-family-mono); font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card); white-space: pre; }
.nk-tc__pre--error { color: var(--color-status-error); }
.nk-tc__pre .t-key { color: var(--color-accent-secondary); }
.nk-tc__pre .t-str { color: var(--color-status-success); }
.nk-tc__pre .t-num { color: var(--color-core-categorical-orange400); }
.nk-tc__pre .t-com { color: var(--color-on-card-muted); font-style: italic; }
/* ── the inline DIFF well: added/removed washes + a +/- gutter (Android DiffView) ── */
.nk-tc__diff { display: table; border-collapse: collapse; min-width: 100%; font-family: var(--font-family-mono); font-size: var(--font-size-12); line-height: var(--font-line-height-20); }
.nk-tc__drow { display: table-row; }
.nk-tc__drow--add { background: color-mix(in srgb, var(--color-status-success) 15%, transparent); }
.nk-tc__drow--del { background: color-mix(in srgb, var(--color-status-error) 15%, transparent); }
.nk-tc__dsign { display: table-cell; user-select: none; text-align: center; width: var(--space-5); vertical-align: top; color: var(--color-on-card-muted); position: sticky; left: 0; background: var(--color-card-surface2); }
.nk-tc__drow--add .nk-tc__dsign { color: var(--color-status-success); background: color-mix(in srgb, var(--color-status-success) 15%, var(--color-card-surface2)); }
.nk-tc__drow--del .nk-tc__dsign { color: var(--color-status-error); background: color-mix(in srgb, var(--color-status-error) 15%, var(--color-card-surface2)); }
.nk-tc__dline { display: table-cell; width: 100%; padding: 0 var(--space-3) 0 var(--space-1); white-space: pre; vertical-align: top; color: color-mix(in srgb, var(--color-on-card) 75%, transparent); }
.nk-tc__drow--add .nk-tc__dline { color: var(--color-status-success); }
.nk-tc__drow--del .nk-tc__dline { color: var(--color-status-error); }

@media (prefers-reduced-motion: reduce) {
  /* the header chevron + reveal are the NockerlListItem primitive; copy is the NockerlIconButton
     primitive. Each owns its own reduced-motion. Only the running dot's pulse lives here. */
  .nk-tc__dot { animation: none; opacity: .7; }
}
/* demo scaffolding */
.nk-tc-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-tc-demo__group + .nk-tc-demo__group { margin-top: var(--space-6); }
.nk-tc-demo__stack { display: flex; flex-direction: column; gap: var(--space-3); }
.nk-tc-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-tc-demo__count b { color: var(--color-accent-primary); }
/* A tool-call card LIVES inside an assistant message, so the demo mounts these cards
   INSIDE the REAL AgentMessage assistant bubble (the shared <AssistantMessage>: chat ground +
   header + the lifted bubble with the tail corner + catch-light), NOT a hand-rolled dark bg.
   Inside that bubble the family-tile cards read as lifted the way they do in the app: light =
   grey chat ground → bubble → separated white cards; dark = the ground sits darker than the
   card surface, so the cards separate. To make the wider cards sit cleanly in the (wide)
   bubble they FILL the bubble's content width: max-width:none drops their own phone-width
   cap (560) so the bubble's cap governs, leaving no empty right gutter and no clip/overflow. */
.nk-am-bubble .nk-tc { max-width: none; }
`;

// ─── Inline glyphs (stroke icons using currentColor so each slot tints correctly) ──
const svg = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};
const ic = (d: string): ReactNode => (
  <svg {...svg}>
    <path d={d} />
  </svg>
);
// Family icons mirror the Compose `toolIcon` mapping (Description / Terminal / Search / Language).
const IconFile = ic('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6');
const IconTerminal = ic('m5 8 4 4-4 4M12 16h6');
const IconSearch = ic('M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM21 21l-3.5-3.5');
const IconWeb = ic('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18');
const IconEdit = ic('M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z');
const IconCheck = ic('M20 6 9 17l-5-5');
const IconClose = ic('M18 6 6 18M6 6l12 12');
// NockerlListItem (expand form) owns the disclosure chevron; it is not hand-rolled here.

// Status → resolved warm token + glyph (running = a neutral pulse dot). Never cyan.
const STATUS_COLOR: Record<ToolStatus, string> = {
  running: 'var(--color-on-card-muted)',
  success: 'var(--color-status-success)',
  error: 'var(--color-status-error)',
};

/** Format elapsed seconds the way Compose does: `%.1fs` under 10s, else `Ns`. */
function fmtElapsed(s: number): string {
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
}

/** Render one tokenized output line as inline spans (each `tok` → a syntax tint). */
function renderOut(line: OutLine): ReactNode {
  return line.map((t, i) => (t.tok ? <span key={i} className={`t-${t.tok}`}>{t.text}</span> : <span key={i}>{t.text}</span>));
}

/** Flatten tokenized output lines to raw text (what the clipboard copy receives). */
const flatten = (lines: OutLine[]): string => lines.map((l) => l.map((t) => t.text).join('')).join('\n');

/** The status chip: a glyph (or running dot) + the elapsed time, in the status color. */
function StatusChip({ status, elapsedSeconds }: { status: ToolStatus; elapsedSeconds?: number }) {
  const live = status === 'running';
  return (
    <span
      className="nk-tc__chip"
      style={{ '--nk-tc-status': STATUS_COLOR[status] } as CSSProperties}
      role={live ? 'status' : undefined}
      aria-label={live ? 'Running' : status === 'success' ? 'Succeeded' : 'Failed'}
    >
      {status === 'success' && IconCheck}
      {status === 'error' && IconClose}
      {live && <span className="nk-tc__dot" aria-hidden="true" />}
      {elapsedSeconds != null && elapsedSeconds > 0 && <span>{fmtElapsed(elapsedSeconds)}</span>}
    </span>
  );
}

/**
 * A copy-to-clipboard button: the shared _CopyButton (one glyph pair, one
 * on-accent confirmation), keeping the .nk-tc__copy class as the demo's copy-count
 * JS hook. Shared by both well variants.
 */
function CopyBtn({ text, label }: { text: string; label: string }) {
  return <CopyButton text={text} label={`Copy ${label}`} copiedLabel={`${label} copied`} className="nk-tc__copy" />;
}

/** A copyable code/text well (mirrors Compose CopyableCodeSurface: cardSurface2, recessed). */
function OutputWell({ label, lines, error }: { label: string; lines: OutLine[]; error?: boolean }) {
  return (
    <div className={`nk-tc__well${error ? ' nk-tc__well--error' : ''}`}>
      <div className="nk-tc__wbar">
        <span className={`nk-tc__wlbl${error ? ' nk-tc__wlbl--error' : ''}`}>{label}</span>
        <CopyBtn text={flatten(lines)} label="output" />
      </div>
      <div className="nk-tc__scroll" tabIndex={0} role="group" aria-label={`${label} output`}>
        <pre className={`nk-tc__pre${error ? ' nk-tc__pre--error' : ''}`}>
          {lines.map((line, i) => (
            <div key={i}>{renderOut(line)}</div>
          ))}
        </pre>
      </div>
    </div>
  );
}

/** The inline unified-diff well (mirrors Compose DiffView: cardSurface3 header + warm washes). */
function DiffWell({ path, lines }: { path: string; lines: DiffLine[] }) {
  const base = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
  const newContent = lines.filter((l) => l.type !== 'removed').map((l) => l.text).join('\n');
  const added = lines.filter((l) => l.type === 'added').length;
  const removed = lines.filter((l) => l.type === 'removed').length;
  return (
    <div className="nk-tc__well">
      <div className="nk-tc__wbar">
        <span className="nk-tc__wlbl" style={{ textTransform: 'none', letterSpacing: 0 }}>{base}</span>
        <span className="nk-tc__stat" aria-label={`${added} added, ${removed} removed`}>
          <span className="add">+{added}</span>
          <span className="del">-{removed}</span>
        </span>
        <CopyBtn text={newContent} label="new content" />
      </div>
      <div className="nk-tc__scroll" tabIndex={0} role="table" aria-label={`Diff of ${base}`}>
        <div className="nk-tc__diff">
          {lines.map((l, i) => {
            const cls = l.type === 'added' ? ' nk-tc__drow--add' : l.type === 'removed' ? ' nk-tc__drow--del' : '';
            const sign = l.type === 'added' ? '+' : l.type === 'removed' ? '-' : '';
            return (
              <div className={`nk-tc__drow${cls}`} role="row" key={i}>
                <span className="nk-tc__dsign" role="cell" aria-hidden="true">{sign}</span>
                <span className="nk-tc__dline" role="cell">{l.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The expanded body: compact params then the recessed output well / inline diff. Passed
 *  to NockerlListItem's `details` slot (only mounted while the row is expanded). */
function ToolBody({ params, output, diff }: Pick<ToolCallCardProps, 'params' | 'output' | 'diff'>) {
  const outLabel = output?.error ? 'Error' : 'Output';
  return (
    <>
      {params && params.length > 0 && (
        <dl className="nk-tc__params">
          {params.map((p) => (
            <div className="nk-tc__param" key={p.label}>
              <dt className="nk-tc__param-k">{p.label}</dt>
              <dd className="nk-tc__param-v">{p.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {output && <OutputWell label={outLabel} lines={output.lines} error={output.error} />}
      {diff && <DiffWell path={diff.path} lines={diff.lines} />}
    </>
  );
}

/**
 * A single Nockerl tool-call card, the unit the spec documents. A lifted card whose
 * family color rides in a FILLED leading icon tile (NO left rail, per LAW 6). The header row
 * IS the NockerlListItem primitive: the family tile is its `leadingIcon`, the mono tool name its
 * `primary`, the live StatusChip its `trailing` slot (before the chevron), and the compact
 * params + recessed output well/diff its `details`. A card WITH output is an expandable
 * NockerlListItem (aria-expanded + the down-to-up chevron + the flash-free reveal, all owned by the
 * primitive); a running card has no body, so it renders a static (non-expandable) row.
 */
export function ToolCallCard({ name, family, status, elapsedSeconds, icon, params, output, diff, defaultOpen = false }: ToolCallCardProps) {
  const hasBody = Boolean((params && params.length) || output || diff);
  const [open, setOpen] = useState(defaultOpen);
  const cls = ['nk-tc', hasBody ? '' : 'nk-tc--static'].filter(Boolean).join(' ');
  const tile = <span className="nk-tc__tile" aria-hidden="true">{icon}</span>;
  const chip = <StatusChip status={status} elapsedSeconds={elapsedSeconds} />;
  // NO rail element: per LAW 6 the family color lives in the FILLED icon tile. The lifted
  // surface (cardSurface1 + hairline + panel radius + sheen) is the shared <NockerlSurface
  // variant="panel">; .nk-tc keeps only the layout + its flagged off-ladder shadow, and the
  // header row delegates to NockerlListItem. --nk-tc-accent feeds only the tile fill.
  return (
    <NockerlSurface variant="panel" className={cls} style={{ '--nk-tc-accent': FAMILY_COLOR[family] } as CSSProperties}>
      {hasBody ? (
        <NockerlListItem
          expandable
          expanded={open}
          onToggle={() => setOpen((v) => !v)}
          primary={name}
          leadingIcon={tile}
          trailing={chip}
          details={<ToolBody params={params} output={output} diff={diff} />}
        />
      ) : (
        <NockerlListItem primary={name} leadingIcon={tile} trailing={chip} />
      )}
    </NockerlSurface>
  );
}

// ToolCallCard is a LEAF composite: its body is DATA (params / output.lines / diff.lines rendered
// internally) and `icon` is a glyph, no component slot. It composes NockerlSurface for its plane, the
// copy affordance is the shared _CopyButton (composing NockerlIconButton), and the disclosure HEADER ROW is
// now the NockerlListItem primitive (expandable form), with no hand-rolled header <button>. The rich cluster
// maps onto NockerlListItem's slots: the filled family tile -> leadingIcon, the mono summary -> primary,
// the live StatusChip -> the new `trailing` slot (before the chevron), the params + well/diff ->
// details. NockerlListItem owns the <button> + aria-expanded + the down-to-up chevron + the reveal. A
// running (bodyless) card renders a static non-expandable NockerlListItem. role=table/row/cell for the
// diff well is semantic. No owns (the composed <button> belongs to NockerlListItem, not this card).
export const compose = {
  tier: 'leaf',
} satisfies ComposeContract;

// ─── Realistic samples (pre-tokenized) ───────────────────────────────
const T = (text: string, tok?: OutTok['tok']): OutTok => ({ text, ...(tok ? { tok } : {}) });

// A Bash success output (a couple of build lines).
const BASH_OUT: OutLine[] = [
  [T('> Task :app:compileDebugKotlin')],
  [T('BUILD SUCCESSFUL', 'str'), T(' in '), T('18s', 'num')],
  [T('42 actionable tasks: '), T('11', 'num'), T(' executed, '), T('31', 'num'), T(' up-to-date')],
];
// A Read success output (a tokenized snippet of the file).
const READ_OUT: OutLine[] = [
  [T('// SseClient.kt: the reconnect loop', 'com')],
  [T('suspend fun ', 'key'), T('reconnect'), T('(attempt: '), T('Int', 'key'), T(') {')],
  [T('  delay'), T('(nextDelay(attempt))')],
  [T('}')],
];
// A bash ERROR output.
const ERR_OUT: OutLine[] = [
  [T('e: Backoff.kt:14:18 unresolved reference: Random')],
  [T('> Task :app:compileDebugKotlin FAILED')],
  [T('BUILD FAILED', 'str'), T(' in '), T('3s', 'num')],
];
// An Edit diff (mirrors the backoff edit used across the code-block / diff demos).
const EDIT_DIFF: DiffLine[] = [
  { type: 'unchanged', text: 'fun nextDelay(attempt: Int): Long =' },
  { type: 'removed', text: '  minOf(15_000, 1_000 shl attempt)' },
  { type: 'added', text: '  minOf(30_000, 1_000 shl attempt)' },
  { type: 'added', text: '    .plus(Random.nextLong(250))' },
];

/**
 * The interactive showcase: a stack of realistic cards. A RUNNING call (pulsing dot +
 * elapsed, no body), a SUCCESS call (collapsible params + a code well + a working Copy),
 * an ERROR call (red status + an error well), an Edit call whose output is an inline DIFF.
 * Then a second stack showing the family-color FILLED icon tile across families (Read ·
 * Grep · WebFetch · a scheduling cron · an unclassified DEFAULT). Every header is a
 * keyboard-operable disclosure; copy + the code region are focusable; the pulse + expand
 * freeze under prefers-reduced-motion.
 */
export default function ToolCallCardDemo() {
  const [copies, setCopies] = useState(0);

  // Count clipboard activations across all copy buttons (event delegation).
  const onCopyClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.nk-tc__copy')) setCopies((c) => c + 1);
  };

  return (
    <div className="nk-tc-demo nk-am-demo" onClickCapture={onCopyClick}>
      <style>{AM_STYLES}</style>
      <style>{STYLES}</style>

      {/* The cards are demoed INSIDE the REAL AgentMessage assistant bubble (shared chrome):
          the chat ground + the identity header (spark avatar · model · time) + the lifted
          bubble with the tail corner + catch-light. `wide` roomies the bubble cap so the
          tool cards (which run wider than a chat sentence) fit cleanly, filling the bubble. */}
      <AssistantMessage model="Large 2.1" time="10:24 AM" wide ariaLabel="Assistant turn with tool calls in the message stream">

      <div className="nk-tc-demo__group">
        <p className="nk-tc-demo__lbl">Lifecycle: running · success (params + output) · error · diff (tab a header, Enter / Space)</p>
        {/* running (no body) · success + params + code well · success bash · error · Edit diff */}
        <div className="nk-tc-demo__stack">
          <ToolCallCard name="$ ./gradlew test" family="shell-fs" status="running" elapsedSeconds={6} icon={IconTerminal} />
          <ToolCallCard
            name="Read SseClient.kt" family="shell-fs" status="success" elapsedSeconds={0.4} icon={IconFile} defaultOpen
            params={[{ label: 'file_path', value: 'app/src/main/.../net/SseClient.kt' }, { label: 'limit', value: '40' }]}
            output={{ lines: READ_OUT }}
          />
          <ToolCallCard
            name="$ ./gradlew assembleDebug" family="shell-fs" status="success" elapsedSeconds={18} icon={IconTerminal}
            params={[{ label: 'command', value: './gradlew assembleDebug' }]} output={{ lines: BASH_OUT }}
          />
          <ToolCallCard
            name="$ ./gradlew compileDebugKotlin" family="shell-fs" status="error" elapsedSeconds={3} icon={IconTerminal} defaultOpen
            params={[{ label: 'command', value: './gradlew compileDebugKotlin' }]} output={{ lines: ERR_OUT, error: true }}
          />
          <ToolCallCard
            name="Edit Backoff.kt" family="shell-fs" status="success" elapsedSeconds={0.6} icon={IconEdit} defaultOpen
            params={[{ label: 'file_path', value: 'app/src/main/.../net/Backoff.kt' }]}
            diff={{ path: 'app/src/main/java/com/nockerl/app/net/Backoff.kt', lines: EDIT_DIFF }}
          />
        </div>
      </div>

      <div className="nk-tc-demo__group">
        <p className="nk-tc-demo__lbl">Families: the FILLED icon tile tints by tool family (categorical, never the brand cyan)</p>
        <div className="nk-tc-demo__stack">
          <ToolCallCard
            name="Read AGENTS.md" family="shell-fs" status="success" elapsedSeconds={0.2} icon={IconFile}
            params={[{ label: 'file_path', value: 'AGENTS.md' }]}
            output={{ lines: [[T('# Nockerl Platform: Global Instructions', 'com')]] }}
          />
          <ToolCallCard
            name="Grep familyAccent" family="shell-fs" status="success" elapsedSeconds={0.3} icon={IconSearch}
            params={[{ label: 'pattern', value: 'familyAccent' }, { label: 'glob', value: '*.kt' }]}
            output={{ lines: [[T('ToolFamily.kt:139:'), T('internal fun ', 'key'), T('familyAccent')]] }}
          />
          <ToolCallCard
            name="Fetch nockerl.ai/docs" family="external" status="success" elapsedSeconds={1.2} icon={IconWeb}
            params={[{ label: 'url', value: 'https://nockerl.ai/docs' }]}
            output={{ lines: [[T('200 OK', 'str'), T(' · '), T('14.2 kB', 'num')]] }}
          />
          <ToolCallCard
            name="CronCreate · PM poll" family="scheduling" status="success" elapsedSeconds={0.1} icon={IconTerminal}
            params={[{ label: 'cron', value: '*/13 * * * *' }]}
            output={{ lines: [[T('Scheduled', 'str'), T(' · next run '), T('13m', 'num')]] }}
          />
          {/* DEFAULT is an unclassified tool: a quiet muted tile, no dedicated accent */}
          <ToolCallCard name="custom_unclassified_tool" family="default" status="running" elapsedSeconds={2} icon={IconTerminal} />
        </div>
      </div>
      </AssistantMessage>

      <p className="nk-tc-demo__count">
        Copy fired <b>{copies}</b> {copies === 1 ? 'time' : 'times'} · tab a card header to expand, tab to its Copy
        button. The island is live.
      </p>
    </div>
  );
}
