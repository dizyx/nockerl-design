/**
 * DiffViewerDemo: the live, interactive Nockerl diff-viewer island for the web.
 *
 * The FULL, DEDICATED diff surface (distinct from the inline diff the `code-block` renders).
 * Look + algorithm sourced from the shipped Android app (chat/ui/ToolCallCard.kt → `DiffView`,
 * chat/domain/DiffUtils.kt → `computeLineDiff`, the real LCS diff):
 *   • header bar on `card-surface3`: file path + hue-free language tag + "+N / -M" stats.
 *   • body: ADDED = success @ 15% wash + success text, REMOVED = error @ 15% wash + error text,
 *     UNCHANGED = muted `on-card`; a right-aligned muted line-number gutter + a +/- gutter glyph
 *     (warm status, NEVER brand cyan, never color-alone).
 *
 * Web-original full-surface extensions (flagged as drift on the page): an `@@ -a,b +c,d @@` HUNK
 * header, an intra-line WORD highlight, a UNIFIED <-> SPLIT view toggle, and collapse/expand of
 * unchanged context.
 *
 * Laws: FIELDS SINK. The diff is a RECESSED well (inner shadow + top catch-light, NEVER a glow /
 * colored shadow); the header bar is one tier up. Washes are SHAPES, not halos. The view toggle +
 * expand are REAL buttons (focus-visible ring); prefers-reduced-motion freezes transitions.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a `var(--token)`
 * (docs/demo-token-contract.md). Literals remain only for pure geometry.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { NockerlButton, NockerlLanguageBadge, NockerlSegmentedControl, type ComposeContract } from '@dizyx/nockerl-react';

export type DiffLanguage = 'typescript' | 'kotlin' | 'swift';
export type DiffView = 'unified' | 'split';

/** Classification of a line in a unified diff (mirrors Android `DiffLineType`). */
export type DiffLineType = 'added' | 'removed' | 'unchanged';

/** One computed diff line (mirrors Android `DiffLine`). Word spans are web-original. */
export interface DiffLine {
  type: DiffLineType;
  text: string;
  /** 1-based line number in the OLD file (null for an added line). */
  oldNo: number | null;
  /** 1-based line number in the NEW file (null for a removed line). */
  newNo: number | null;
}

export interface DiffViewerProps {
  /** File path shown in the header (basename is emphasized). */
  path: string;
  /** Drives the hue-free language tag (NockerlLanguageBadge). */
  language?: DiffLanguage;
  /** Pre-change source, diffed against `next` via the real LCS `computeLineDiff`. */
  prev: string;
  /** Post-change source. */
  next: string;
  /** `unified` (one column, +/- gutter) or `split` (old left / new right). */
  view?: DiffView;
  /** Collapse runs of unchanged context longer than this (0 = never). */
  collapseContext?: number;
}

// The language tag is the shared hue-free <NockerlLanguageBadge> (matches native):
// a language is METADATA, never status, so it carries NO per-language color. It is the same
// tag the CodeBlock + Markdown fence use, normalized (trim + lowercase) so it reads alike.

// ─── The real Android diff algorithm (chat/domain/DiffUtils.kt) ──────
// LCS table + backtrack → ordered DiffLines, carrying BOTH old + new line numbers
// (the web side-by-side view needs both; Android only tracks one).
function computeLineDiff(prev: string, next: string): DiffLine[] {
  const a = prev === '' ? [] : prev.split('\n');
  const b = next === '' ? [] : next.split('\n');
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i]![j] = a[i - 1] === b[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      out.push({ type: 'unchanged', text: a[i - 1]!, oldNo: i, newNo: j });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      out.push({ type: 'added', text: b[j - 1]!, oldNo: null, newNo: j });
      j -= 1;
    } else {
      out.push({ type: 'removed', text: a[i - 1]!, oldNo: i, newNo: null });
      i -= 1;
    }
  }
  return out.reverse();
}

// Intra-line word highlight (web-original): the changed word-span between a removed and
// the following added line. A shared-prefix / shared-suffix word diff, enough to glow
// the edit, not the whole line. Returns [head, mid, tail]; `mid` is the changed span.
function wordSplit(a: string, b: string): { aParts: [string, string, string]; bParts: [string, string, string] } {
  const aw = a.split(/(\s+)/);
  const bw = b.split(/(\s+)/);
  let p = 0;
  while (p < aw.length && p < bw.length && aw[p] === bw[p]) p += 1;
  let sa = aw.length;
  let sb = bw.length;
  while (sa > p && sb > p && aw[sa - 1] === bw[sb - 1]) {
    sa -= 1;
    sb -= 1;
  }
  return {
    aParts: [aw.slice(0, p).join(''), aw.slice(p, sa).join(''), aw.slice(sa).join('')],
    bParts: [bw.slice(0, p).join(''), bw.slice(p, sb).join(''), bw.slice(sb).join('')],
  };
}

// The well RECEDES; the header bar is one tier up. Washes are warm status + an aligned
// +/- glyph (never cyan, never color-alone). Every value is a token.
const STYLES = `
.nk-dv-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
/* the VIEWER is a recessed well; depth = inner shadow + a top catch-light (NOT a glow) */
.nk-dv { border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-panel);
  background: var(--color-canvas-alt); overflow: hidden; max-width: 620px;
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 35%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* file header, one tier UP (Android diff header = card-surface3) */
.nk-dv__bar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3);
  background: var(--color-card-surface3); border-bottom: var(--space-px) solid var(--color-card-hairline); }
.nk-dv__file { display: flex; align-items: baseline; gap: var(--space-1); min-width: 0; flex: 1 1 auto;
  font-family: var(--font-family-mono); font-size: var(--font-size-12); white-space: nowrap; overflow: hidden; }
.nk-dv__dir { color: var(--color-on-card-muted); text-overflow: ellipsis; overflow: hidden; }
.nk-dv__base { color: var(--color-on-card); font-weight: var(--font-weight-semibold); flex: 0 0 auto; }
/* language tag = the shared hue-free NockerlLanguageBadge (no per-language color). */
/* +N / -M stat counters: warm status, with a glyph so they're never color-alone */
.nk-dv__stats { display: inline-flex; align-items: center; gap: var(--space-2); flex: 0 0 auto;
  font-family: var(--font-family-mono); font-size: var(--font-size-10); font-weight: var(--font-weight-semibold); }
.nk-dv__stat-add { color: var(--color-status-success); }
.nk-dv__stat-del { color: var(--color-status-error); }
/* the scrollable code REGION: focusable; 2D scroll, lines don't wrap (Android softWrap=false) */
.nk-dv__scroll { overflow: auto; max-height: var(--size-container-lg); }
.nk-dv__scroll:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(-1 * var(--space-0-5)); }
.nk-dv__code { display: table; border-collapse: collapse; min-width: 100%;
  font-family: var(--font-family-mono); font-size: var(--font-size-12); line-height: var(--font-line-height-20); }
.nk-dv__row { display: table-row; }
.nk-dv__row--add { background: color-mix(in srgb, var(--color-status-success) 14%, transparent); }
.nk-dv__row--del { background: color-mix(in srgb, var(--color-status-error) 14%, transparent); }
/* line-number gutter cells: right-aligned, muted, sticky under horizontal scroll */
.nk-dv__no { display: table-cell; user-select: none; text-align: right; white-space: nowrap; vertical-align: top;
  padding: 0 var(--space-2); color: var(--color-on-card-muted); opacity: .5; position: sticky;
  background: var(--color-canvas-alt); min-width: var(--space-8); }
.nk-dv__no--old { left: 0; }
.nk-dv__no--new { left: var(--space-8); box-shadow: inset var(--space-px) 0 0 var(--color-card-hairline); }
.nk-dv__row--add .nk-dv__no { background: color-mix(in srgb, var(--color-status-success) 14%, var(--color-canvas-alt)); }
.nk-dv__row--del .nk-dv__no { background: color-mix(in srgb, var(--color-status-error) 14%, var(--color-canvas-alt)); }
/* +/- glyph cell, so a diff is NEVER color-alone (Android prefix +/-/space) */
.nk-dv__sign { display: table-cell; user-select: none; text-align: center; width: var(--space-5); vertical-align: top;
  color: var(--color-on-card-muted); position: sticky; left: var(--nk-dv-signleft); background: var(--color-canvas-alt); }
.nk-dv__row--add .nk-dv__sign { color: var(--color-status-success); background: color-mix(in srgb, var(--color-status-success) 14%, var(--color-canvas-alt)); }
.nk-dv__row--del .nk-dv__sign { color: var(--color-status-error); background: color-mix(in srgb, var(--color-status-error) 14%, var(--color-canvas-alt)); }
/* the code line itself: context muted, add/remove tinted (Android textColor mapping) */
.nk-dv__line { display: table-cell; width: 100%; padding: 0 var(--space-3) 0 var(--space-2);
  white-space: pre; color: color-mix(in srgb, var(--color-on-card) 75%, transparent); vertical-align: top; }
.nk-dv__row--add .nk-dv__line { color: var(--color-status-success); }
.nk-dv__row--del .nk-dv__line { color: var(--color-status-error); }
/* intra-line WORD highlight: a denser wash on just the changed span (web-original) */
.nk-dv__row--add .nk-dv__w { background: color-mix(in srgb, var(--color-status-success) 30%, transparent); border-radius: var(--radius-track); }
.nk-dv__row--del .nk-dv__w { background: color-mix(in srgb, var(--color-status-error) 30%, transparent); border-radius: var(--radius-track); }
/* @@ HUNK header row: a quiet cyan-tinted band (a shape, not a glow) */
.nk-dv__hunk { display: table-row; }
.nk-dv__hunk-cell { display: table-cell; padding: var(--space-0-5) var(--space-3); font-family: var(--font-family-mono); font-size: var(--font-size-10);
  color: var(--color-accent-primary); background: color-mix(in srgb, var(--color-accent-primary) 8%, transparent);
  border-top: var(--space-px) solid var(--color-card-hairline); border-bottom: var(--space-px) solid var(--color-card-hairline); }
/* collapsed-context EXPANDER, restyled as a NEUTRAL sibling of the @@ hunk band (the diff's meta-row
   grammar): a hairline-bordered band, mono · uppercase-eyebrow · muted, with the unfold glyph. It
   composes the real NockerlButton (focus ring, flash-free feedback) but wears the diff chrome, no
   longer a mismatched ghost form button. One click reveals the WHOLE folded run. The fold-cell is
   sticky-left so the band stays put under horizontal scroll. */
.nk-dv__fold { display: table-row; }
.nk-dv__fold-cell { display: table-cell; padding: 0; position: sticky; left: 0; }
.nk-dv__fold-cell .nk-btn { width: max-content; border-radius: 0; justify-content: flex-start; gap: var(--space-2);
  padding: var(--space-1) var(--space-3); min-height: 0; white-space: nowrap;
  font-family: var(--font-family-mono); font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow);
  color: var(--color-on-card-muted); background: color-mix(in srgb, var(--color-on-card) 5%, var(--color-canvas-alt));
  border-block: var(--space-px) solid var(--color-card-hairline); }
.nk-dv__fold-cell .nk-btn:hover { background: color-mix(in srgb, var(--color-accent-primary) 10%, var(--color-canvas-alt)); color: var(--color-on-card); }
/* SPLIT view: two equal columns; an empty half is a faint hatch-free void */
.nk-dv__split { display: grid; grid-template-columns: 1fr 1fr; }
.nk-dv__split-col { overflow: auto; max-height: var(--size-container-lg); min-width: 0; }
.nk-dv__split-col:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(-1 * var(--space-0-5)); }
.nk-dv__split-col + .nk-dv__split-col { border-left: var(--space-px) solid var(--color-card-hairline); }
.nk-dv__row--void { background: color-mix(in srgb, var(--color-on-card) 3%, transparent); }
.nk-dv__row--void .nk-dv__line, .nk-dv__row--void .nk-dv__no, .nk-dv__row--void .nk-dv__sign { color: transparent; }
.nk-dv__split-head { font-family: var(--font-family-mono); font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow);
  text-transform: uppercase; color: var(--color-on-card-muted); padding: var(--space-1) var(--space-3);
  background: color-mix(in srgb, var(--color-on-card) 4%, transparent); position: sticky; top: 0; z-index: 1;
  border-bottom: var(--space-px) solid var(--color-card-hairline); }
/* demo scaffolding */
.nk-dv-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-dv-demo__group + .nk-dv-demo__group { margin-top: var(--space-6); }
.nk-dv-demo__toolbar { display: inline-flex; margin: 0 0 var(--space-2); }
.nk-dv-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-dv-demo__count b { color: var(--color-accent-primary); }
`;

// ─── Inline glyphs (stroke icons in currentColor so each slot tints correctly) ──
const svg = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};
const IconUnfold = (
  <svg {...svg}>
    <path d="m7 4 5 5 5-5M7 20l5-5 5 5" />
  </svg>
);

/** Render a possibly word-highlighted line (mid span gets the `.nk-dv__w` wash). */
function renderText(parts: readonly [string, string, string] | undefined, text: string): ReactNode {
  if (!parts || parts[1] === '') return text;
  return (
    <>
      {parts[0]}
      <span className="nk-dv__w">{parts[1]}</span>
      {parts[2]}
    </>
  );
}

// A hunk = a contiguous group of lines with leading/trailing context, plus the
// folded run of unchanged lines that precedes it. We pre-compute word spans for
// adjacent removed→added pairs so the demo highlights the actual edit.
type PreparedLine = DiffLine & { word?: [string, string, string] };
interface Prepared {
  lines: PreparedLine[];
  added: number;
  removed: number;
}
function prepare(diff: DiffLine[]): Prepared {
  const lines: PreparedLine[] = diff.map((l) => ({ ...l }));
  let added = 0;
  let removed = 0;
  for (let k = 0; k < lines.length; k += 1) {
    const l = lines[k]!;
    if (l.type === 'added') added += 1;
    if (l.type === 'removed') removed += 1;
    // pair a removed line with the immediately-following added line → word diff
    if (l.type === 'removed' && lines[k + 1]?.type === 'added') {
      const { aParts, bParts } = wordSplit(l.text, lines[k + 1]!.text);
      l.word = aParts;
      lines[k + 1]!.word = bParts;
    }
  }
  return { lines, added, removed };
}

const PAD = 1; // unchanged context lines kept around a change before folding

/** One Nockerl diff viewer: header (path · pill · +N/-M) + a unified or split body. */
export function DiffViewer({
  path,
  language,
  prev,
  next,
  view = 'unified',
  collapseContext = 0,
}: DiffViewerProps) {
  const { lines, added, removed } = useMemo(() => prepare(computeLineDiff(prev, next)), [prev, next]);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const base = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
  const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
  const firstNew = lines.find((l) => l.newNo != null)?.newNo ?? 1;
  const firstOld = lines.find((l) => l.oldNo != null)?.oldNo ?? 1;

  // Decide which unchanged runs to fold (only in unified view, when asked).
  const folded = useMemo(() => {
    const set = new Set<number>();
    if (view !== 'unified' || collapseContext <= 0) return set;
    let run: number[] = [];
    const flush = () => {
      if (run.length > collapseContext + PAD * 2) {
        for (let k = PAD; k < run.length - PAD; k += 1) set.add(run[k]!);
      }
      run = [];
    };
    lines.forEach((l, idx) => {
      if (l.type === 'unchanged') run.push(idx);
      else flush();
    });
    flush();
    return set;
  }, [lines, view, collapseContext]);

  // ── UNIFIED ──
  if (view === 'unified') {
    const rows: ReactNode[] = [];
    const context = lines.length - added - removed;
    rows.push(
      <div className="nk-dv__hunk" role="row" key="hunk">
        <div className="nk-dv__hunk-cell" role="cell">{`@@ -${firstOld},${removed + context} +${firstNew},${added + context} @@`}</div>
      </div>,
    );
    let i = 0;
    let foldId = 0;
    while (i < lines.length) {
      const idx = i;
      // START of a folded run → ONE expander for the WHOLE run; opening reveals every line at once.
      // (Was: foldId advanced per line, so each click re-folded the tail under a new id → one
      //  line per click, N clicks for an N-line run.) foldId now advances once per run.
      const runStart = folded.has(idx) && (idx === 0 || !folded.has(idx - 1));
      if (runStart) {
        const id = foldId;
        foldId += 1;
        if (!open.has(id)) {
          let j = i;
          while (j < lines.length && folded.has(j)) j += 1;
          const count = j - i;
          rows.push(
            <div className="nk-dv__fold" role="row" key={`fold-${idx}`}>
              <div className="nk-dv__fold-cell" role="cell">
                <NockerlButton
                  text={`Expand ${count} unchanged ${count === 1 ? 'line' : 'lines'}`}
                  variant="ghost"
                  size="sm"
                  fullWidth
                  leadingIcon={IconUnfold}
                  onClick={() => setOpen((s) => new Set(s).add(id))}
                />
              </div>
            </div>,
          );
          i = j;
          continue;
        }
        // open → fall through; this line and the rest of the run render normally below
      }
      const l = lines[idx]!;
      const cls = l.type === 'added' ? ' nk-dv__row--add' : l.type === 'removed' ? ' nk-dv__row--del' : '';
      rows.push(
        <div className={`nk-dv__row${cls}`} role="row" key={idx}>
          <span className="nk-dv__no nk-dv__no--old" role="cell" aria-hidden="true">{l.oldNo ?? ''}</span>
          <span className="nk-dv__no nk-dv__no--new" role="cell" aria-hidden="true">{l.newNo ?? ''}</span>
          <span className="nk-dv__sign" role="cell" aria-hidden="true">{l.type === 'added' ? '+' : l.type === 'removed' ? '-' : ''}</span>
          <span className="nk-dv__line" role="cell">{renderText(l.word, l.text)}</span>
        </div>,
      );
      i += 1;
    }
    return (
      <div className="nk-dv" style={{ '--nk-dv-signleft': 'calc(var(--space-8) * 2)' } as CSSProperties}>
        <Header path={base} dir={dir} language={language} added={added} removed={removed} />
        <div className="nk-dv__scroll" tabIndex={0} role="table" aria-label={`Unified diff of ${base}`}>
          <div className="nk-dv__code">{rows}</div>
        </div>
      </div>
    );
  }

  // ── SPLIT (old left / new right): align removed↔added; pad the empty half ──
  const left: PreparedLine[] = [];
  const right: PreparedLine[] = [];
  let k = 0;
  const blank = (): PreparedLine => ({ type: 'unchanged', text: '', oldNo: null, newNo: null });
  while (k < lines.length) {
    const l = lines[k]!;
    if (l.type === 'unchanged') {
      left.push(l);
      right.push(l);
      k += 1;
    } else {
      const dels: DiffLine[] = [];
      const adds: DiffLine[] = [];
      while (k < lines.length && lines[k]!.type === 'removed') dels.push(lines[k++]!);
      while (k < lines.length && lines[k]!.type === 'added') adds.push(lines[k++]!);
      const rows = Math.max(dels.length, adds.length);
      for (let r = 0; r < rows; r += 1) {
        left.push(dels[r] ?? blank());
        right.push(adds[r] ?? blank());
      }
    }
  }
  return (
    <div className="nk-dv" style={{ '--nk-dv-signleft': 'var(--space-8)' } as CSSProperties}>
      <Header path={base} dir={dir} language={language} added={added} removed={removed} />
      <div className="nk-dv__split">
        <SplitCol heading="Before" side="old" rows={left} label={`Before ${base}`} />
        <SplitCol heading="After" side="new" rows={right} label={`After ${base}`} />
      </div>
    </div>
  );
}

/** The file header bar: path (dir + emphasized basename) · language pill · +N / -M. */
function Header({
  path,
  dir,
  language,
  added,
  removed,
}: {
  path: string;
  dir: string;
  language?: DiffLanguage;
  added: number;
  removed: number;
}) {
  return (
    <div className="nk-dv__bar">
      <span className="nk-dv__file">
        {dir && <span className="nk-dv__dir">{dir}</span>}
        <span className="nk-dv__base">{path}</span>
      </span>
      {language && <NockerlLanguageBadge language={language} />}
      <span className="nk-dv__stats" aria-label={`${added} added, ${removed} removed`}>
        <span className="nk-dv__stat-add">+{added}</span>
        <span className="nk-dv__stat-del">-{removed}</span>
      </span>
    </div>
  );
}

/** One side of the split view: a sticky heading + a focusable, scrollable column. */
function SplitCol({
  heading,
  side,
  rows,
  label,
}: {
  heading: string;
  side: 'old' | 'new';
  rows: PreparedLine[];
  label: string;
}) {
  return (
    <div className="nk-dv__split-col" tabIndex={0} role="table" aria-label={label}>
      <div className="nk-dv__split-head" role="rowgroup">{heading}</div>
      <div className="nk-dv__code">
        {rows.map((l, idx) => {
          const isVoid = l.oldNo == null && l.newNo == null;
          const active = side === 'old' ? l.type === 'removed' : l.type === 'added';
          const cls = isVoid ? ' nk-dv__row--void' : active ? (side === 'old' ? ' nk-dv__row--del' : ' nk-dv__row--add') : '';
          const no = side === 'old' ? l.oldNo : l.newNo;
          const sign = active ? (side === 'old' ? '-' : '+') : '';
          return (
            <div className={`nk-dv__row${cls}`} role="row" key={idx}>
              <span className="nk-dv__no nk-dv__no--old" role="cell" aria-hidden="true">{no ?? ''}</span>
              <span className="nk-dv__sign" role="cell" aria-hidden="true">{sign}</span>
              <span className="nk-dv__line" role="cell">{renderText(active ? l.word : undefined, l.text)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Realistic samples: a real backoff edit (mirrors CodeBlockDemo's diff) ──
const BACKOFF_PREV = `package com.nockerl.app.net

/** Exponential backoff for SSE reconnects. */
fun nextDelay(attempt: Int): Long {
    val base = minOf(15_000L, 1_000L shl attempt)
    return base
}

fun shouldRetry(code: Int): Boolean = code in 500..599`;

const BACKOFF_NEXT = `package com.nockerl.app.net

import kotlin.random.Random

/** Exponential backoff for SSE reconnects, capped + jittered. */
fun nextDelay(attempt: Int): Long {
    val base = minOf(30_000L, 1_000L shl attempt)
    return base + Random.nextLong(250)
}

fun shouldRetry(code: Int): Boolean = code in 500..599`;

// Data composite: prev/next are data diffed internally (role=table/row/cell are semantic table roles). Composes NockerlSegmentedControl for the view toggle; the one hand-rolled facsimile is the collapsed-context expander <button>, which should compose NockerlButton, so no owns.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Diff viewer page: a full diff with a file
 * header (path · language pill · +N/-M stats), an @@ hunk header, added/removed/context
 * lines with +/- gutters + dual line-number columns, intra-line word highlight on the
 * modified lines, a UNIFIED <-> SPLIT toggle (split = old left / new right), and a
 * second viewer that collapses long unchanged context behind a real Expand button.
 * The view toggle + expander are keyboard-operable; each code column is focusable +
 * scrollable; transitions freeze under prefers-reduced-motion.
 */
export default function DiffViewerDemo() {
  const [view, setView] = useState<DiffView>('unified');

  return (
    <div className="nk-dv-demo">
      <style>{STYLES}</style>

      <div className="nk-dv-demo__group">
        <p className="nk-dv-demo__lbl">Unified ↔ Split: toggle the view (tab to it, Enter / Space)</p>
        <div className="nk-dv-demo__toolbar">
          <NockerlSegmentedControl
            segments={[
              { value: 'unified', label: 'Unified' },
              { value: 'split', label: 'Split' },
            ]}
            value={view}
            onChange={(n) => setView(n as 'unified' | 'split')}
            label="Diff view"
            size="sm"
          />
        </div>
        <DiffViewer
          path="app/src/main/java/com/nockerl/app/net/Backoff.kt"
          language="kotlin"
          prev={BACKOFF_PREV}
          next={BACKOFF_NEXT}
          view={view}
        />
      </div>

      <div className="nk-dv-demo__group">
        <p className="nk-dv-demo__lbl">Collapsed context: long unchanged runs fold behind an Expand button</p>
        <DiffViewer
          path="src/gateway/stream.ts"
          language="typescript"
          prev={STREAM_PREV}
          next={STREAM_NEXT}
          view="unified"
          collapseContext={3}
        />
      </div>

      <p className="nk-dv-demo__count">
        Showing the <b>{view}</b> view · the diff is the real LCS <b>computeLineDiff</b>. The island is live.
      </p>
    </div>
  );
}

// A longer file so a run of unchanged context can fold (collapse/expand demo).
const STREAM_PREV = `import { Hono } from 'hono';

const app = new Hono();

app.get('/stream', (c) => {
  const id = c.req.query('label');
  const since = Number(c.req.query('since') ?? 0);
  return streamSSE(c, async (sse) => {
    for await (const ev of bus.subscribe(id, since)) {
      await sse.writeSSE({ data: JSON.stringify(ev) });
    }
  });
});

export default app;`;

const STREAM_NEXT = `import { Hono } from 'hono';

const app = new Hono();

app.get('/stream', (c) => {
  const id = c.req.query('label');
  const since = Number(c.req.query('since') ?? 0);
  return streamSSE(c, async (sse) => {
    for await (const ev of bus.subscribe(id, since)) {
      await sse.writeSSE({ event: ev.type, data: JSON.stringify(ev) });
    }
  });
});

export default app;`;
