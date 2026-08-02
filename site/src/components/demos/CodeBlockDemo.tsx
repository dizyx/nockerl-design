/**
 * CodeBlockDemo: the live, interactive Nockerl code-block island for the web.
 *
 * This is the DEDICATED, reusable code-display surface, distinct from the inline
 * code panel that `agent-message` / `chat-bubble` render inside a bubble. It pulls
 * the REAL look from the shipped Android app:
 *   • the file viewer (files/ui/FileViewer.kt → `CodeBody` + `LanguageBadge`): a
 *     recessed monospace well on the DARKEST layer (`surfaceContainerLowest` =
 *     canvas), a right-aligned line-number gutter (muted, `padStart(3)`), and 2D
 *     scroll where long lines DON'T wrap (`softWrap = false`).
 *   • the copy-code surface (chat/ui/ToolCallCard.kt → `CopyableCodeSurface`): a
 *     copy button that swaps ContentCopy → Check and tints to `statusSuccess` on
 *     success, reverting after ~2s.
 *   • the unified diff (ToolCallCard.kt → `DiffView` + domain `DiffLine`): a
 *     filename header bar on `cardSurface3`, +/- gutter, added = success @ 15%
 *     wash + success text, removed = error @ 15% wash + error text, unchanged =
 *     muted. Warm status, never the brand cyan.
 *
 * Laws, verbatim:
 *   • FIELDS SINK: the code well is a RECESSED surface (darker + inner shadow),
 *     the inverse of a lifted card. The header bar is one step up (`card-surface3`).
 *   • DEPTH = neutral inner shadow + a top catch-light, NEVER a glow/colored shadow.
 *   • the language label is a cyan-soft pill with cyan text (Android maps it to
 *     `primaryContainer`/`onPrimaryContainer` = accent-soft / accent).
 *   • highlight + diff washes are SHAPES (a tinted row + a left rail), not halos;
 *     diff color is WARM status + a +/- glyph, never color-alone.
 *   • copy / wrap are REAL buttons with a focus-visible OUTLINE ring (never a
 *     colored shadow), fully keyboard-operable; the code region is focusable and
 *     scrollable. prefers-reduced-motion freezes the copy confirmation + transitions.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). The mono font is the
 * `--font-family-mono` token; syntax + diff tints are tokens. The dark stage
 * resolves them to the dark palette. Literals remain only for pure geometry
 * (icon sizes, shadow blur, transition curves) and the per-token copy timeout.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import { NockerlLanguageBadge, NockerlSwitch, type ComposeContract } from '@dizyx/nockerl-react';
import CopyButton from './_CopyButton';

export type CodeLanguage = 'typescript' | 'kotlin' | 'swift' | 'json' | 'shell';
export type DiffLineType = 'added' | 'removed' | 'unchanged';

/** A pre-tokenized fragment of one code line. `tok` selects a syntax tint. */
export interface Token {
  text: string;
  tok?: 'key' | 'str' | 'fn' | 'com' | 'num';
}
/** One code line: an ordered run of tokens + optional highlight / diff marker. */
export interface CodeLine {
  tokens: Token[];
  /** Emphasize this line (a tinted row + a left cyan rail). */
  highlight?: boolean;
  /** Diff classification; adds a +/- gutter glyph + a warm status wash. */
  diff?: DiffLineType;
}

export interface CodeBlockProps {
  /** Optional filename shown in the header (omit → no header). */
  filename?: string;
  /** Optional language → the hue-free language tag in the header (+ the gutter/diff prefix mode). */
  language?: CodeLanguage;
  /** The code body, line by line (already tokenized for display). */
  lines: CodeLine[];
  /** Show the right-aligned line-number gutter. */
  showLineNumbers?: boolean;
  /** Soft-wrap long lines instead of horizontally scrolling them. */
  wrap?: boolean;
  /** Render as a unified diff (+/- gutter, added/removed washes). */
  diff?: boolean;
}

// The language tag is the shared hue-free <NockerlLanguageBadge> (, matches native):
// a language is METADATA, never status, so it carries NO per-language color. The
// component normalizes the label (trim + lowercase) so the tag reads identically everywhere.

// Syntax tints reuse the agent-message code-well precedent (key → accent-secondary,
// str → status-success), extended with fn/num/com roles. They are applied via the
// `.t-*` classes in STYLES below, all token-backed, no per-render literals.

// The well RECEDES (darker than the canvas it sits on + an inner shadow); the
// header bar is one step up. Highlight/diff are washes + a rail, never a glow.
// Every value is a token; the dark stage resolves the cyan accent to #0cc0df.
const STYLES = `
.nk-cb-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
/* the BLOCK: a recessed well; depth = inner shadow + a top catch-light (NOT a glow) */
.nk-cb { border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-panel);
  background: var(--color-canvas-alt); overflow: hidden;
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 35%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); max-width: 560px; }
/* header bar: one tier UP from the well (file viewer / diff header use card-surface3) */
.nk-cb__bar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3);
  background: var(--color-card-surface3); border-bottom: var(--space-px) solid var(--color-card-hairline); }
.nk-cb__name { font-family: var(--font-family-mono); font-size: var(--font-size-12); color: var(--color-on-card);
  flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* language tag: the shared hue-free NockerlLanguageBadge (soft · neutral · mono, no color). */
/* the scrollable code REGION: focusable; 2D scroll, lines don't wrap by default */
.nk-cb__scroll { overflow: auto; max-height: 320px; }
.nk-cb__scroll:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(-1 * var(--space-0-5)); }
.nk-cb__code { display: table; border-collapse: collapse; min-width: 100%;
  font-family: var(--font-family-mono); font-size: var(--font-size-12); line-height: var(--font-line-height-20); }
.nk-cb__row { display: table-row; }
.nk-cb__row--hl { background: color-mix(in srgb, var(--color-accent-primary) 12%, transparent); }
.nk-cb__row--add { background: color-mix(in srgb, var(--color-status-success) 14%, transparent); }
.nk-cb__row--del { background: color-mix(in srgb, var(--color-status-error) 14%, transparent); }
/* gutter cells: right-aligned, muted, sticky so they stay put under horizontal scroll */
.nk-cb__gutter { display: table-cell; user-select: none; text-align: right; white-space: nowrap;
  padding: 0 var(--space-3) 0 var(--space-3); color: var(--color-on-card-muted); opacity: .5;
  vertical-align: top; position: sticky; left: 0; background: var(--color-canvas-alt); }
.nk-cb__row--hl .nk-cb__gutter { background: color-mix(in srgb, var(--color-accent-primary) 12%, var(--color-canvas-alt)); opacity: .8; color: var(--color-accent-primary); }
.nk-cb__row--add .nk-cb__gutter { background: color-mix(in srgb, var(--color-status-success) 14%, var(--color-canvas-alt)); }
.nk-cb__row--del .nk-cb__gutter { background: color-mix(in srgb, var(--color-status-error) 14%, var(--color-canvas-alt)); }
/* diff prefix cell: a +/- glyph so the diff is NEVER color-alone */
.nk-cb__sign { display: table-cell; user-select: none; text-align: center; width: var(--space-5);
  vertical-align: top; color: var(--color-on-card-muted); position: sticky; left: var(--nk-cb-gutw); background: var(--color-canvas-alt); }
.nk-cb__row--add .nk-cb__sign { color: var(--color-status-success); background: color-mix(in srgb, var(--color-status-success) 14%, var(--color-canvas-alt)); }
.nk-cb__row--del .nk-cb__sign { color: var(--color-status-error); background: color-mix(in srgb, var(--color-status-error) 14%, var(--color-canvas-alt)); }
/* the code line itself: the left rail on a highlighted line is a SHAPE, not a halo. That inset
   rail is the ONE sanctioned carve-out of design law 6 (ratified B18): editorial emphasis in
   code's own grammar, always paired with a wash, never status, never selection, and never
   outside code surfaces. Do not copy this rail to any non-code component. */
.nk-cb__line { display: table-cell; width: 100%; padding: 0 var(--space-3) 0 var(--space-2);
  white-space: pre; color: var(--color-on-card); vertical-align: top; }
.nk-cb--wrap .nk-cb__line { white-space: pre-wrap; word-break: break-word; }
.nk-cb__row--hl .nk-cb__line { box-shadow: inset var(--space-0-5) 0 0 var(--color-accent-primary); }
.nk-cb__row--add .nk-cb__line { color: var(--color-status-success); }
.nk-cb__row--del .nk-cb__line { color: var(--color-status-error); }
.nk-cb__line .t-key { color: var(--color-accent-secondary); }
.nk-cb__line .t-str { color: var(--color-status-success); }
.nk-cb__line .t-fn { color: var(--color-accent-tertiary); }
.nk-cb__line .t-num { color: var(--color-core-categorical-orange400); }
.nk-cb__line .t-com { color: var(--color-on-card-muted); font-style: italic; }
/* demo scaffolding */
.nk-cb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-cb-demo__group + .nk-cb-demo__group { margin-top: var(--space-6); }
.nk-cb-demo__toolbar { display: flex; gap: var(--space-2); align-items: center; margin: 0 0 var(--space-2); }
.nk-cb-demo__toolbar-label { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-canvas); }
.nk-cb-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-cb-demo__count b { color: var(--color-accent-primary); }
`;

// Copy = the shared _CopyButton: one glyph pair + the standard on-accent
// confirmation. Its 28px button / 14px glyph matches this header's original geometry.

/** Render one tokenized line as inline spans (each `tok` → a syntax-tint class). */
function renderLine(tokens: Token[]): ReactNode {
  return tokens.map((t, i) =>
    t.tok ? (
      <span key={i} className={`t-${t.tok}`}>
        {t.text}
      </span>
    ) : (
      <span key={i}>{t.text}</span>
    ),
  );
}

/** Flatten a line's tokens to raw text (for the clipboard copy). */
const lineText = (l: CodeLine): string => l.tokens.map((t) => t.text).join('');

/**
 * A single Nockerl code block, the unit the spec documents. An optional header
 * (filename · language pill · a real Copy button), then a recessed, scrollable
 * monospace well with an optional right-aligned line-number gutter, per-line
 * highlighting, a wrap toggle, and a unified-diff mode (+/- gutter + warm washes).
 */
export function CodeBlock({
  filename,
  language,
  lines,
  showLineNumbers = false,
  wrap = false,
  diff = false,
}: CodeBlockProps) {
  // diff numbering: removed lines have no new-file number, so track how many to
  // subtract when numbering the new side (mirrors the DiffView new-content gutter).
  let removed = 0;

  return (
    <div
      className={`nk-cb${wrap ? ' nk-cb--wrap' : ''}`}
      style={{ '--nk-cb-gutw': showLineNumbers ? 'var(--space-10)' : 'var(--space-0)' } as CSSProperties}
    >
      {filename && (
        <div className="nk-cb__bar">
          <span className="nk-cb__name">{filename}</span>
          {language && <NockerlLanguageBadge language={language} />}
          <CopyButton text={() => lines.map(lineText).join('\n')} label="Copy code" copiedLabel="Copied to clipboard" />
        </div>
      )}
      <div
        className="nk-cb__scroll"
        tabIndex={0}
        role="group"
        aria-label={filename ? `${filename} code` : 'Code'}
      >
        <div className="nk-cb__code">
          {lines.map((line, i) => {
            if (line.diff === 'removed') removed += 1;
            const cls = [
              'nk-cb__row',
              line.highlight ? 'nk-cb__row--hl' : '',
              line.diff === 'added' ? 'nk-cb__row--add' : '',
              line.diff === 'removed' ? 'nk-cb__row--del' : '',
            ]
              .filter(Boolean)
              .join(' ');
            const sign = line.diff === 'added' ? '+' : line.diff === 'removed' ? '-' : '';
            // New-file numbering: added + unchanged lines count up; a removed line has
            // no new-file number, so its gutter is blank (the '-' glyph marks it).
            const num = line.diff === 'removed' ? '' : i + 1 - removed;
            return (
              <div key={i} className={cls}>
                {showLineNumbers && (
                  <span className="nk-cb__gutter" aria-hidden="true">
                    {num}
                  </span>
                )}
                {diff && (
                  <span className="nk-cb__sign" aria-hidden="true">
                    {sign}
                  </span>
                )}
                <span className="nk-cb__line">{renderLine(line.tokens)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Realistic, pre-tokenized samples ───────────────────────────────
const T = (text: string, tok?: Token['tok']): Token => ({ text, ...(tok ? { tok } : {}) });

// A short TS sample with a highlighted line + one long line that scrolls.
const TS_LINES: CodeLine[] = [
  { tokens: [T('import', 'key'), T(' { CodeBlock } '), T('from', 'key'), T(' '), T("'@dizyx/nockerl-react'", 'str'), T(';')] },
  { tokens: [T('')] },
  { tokens: [T('export', 'key'), T(' '), T('function', 'key'), T(' '), T('Viewer', 'fn'), T('() {')] },
  { tokens: [T('  '), T('return', 'key'), T(' <'), T('CodeBlock', 'fn'), T(' filename='), T('"backoff.ts"', 'str')], highlight: true },
  { tokens: [T('    language='), T('"typescript"', 'str'), T(' showLineNumbers lines={'), T('lines', 'fn'), T('} />;')] },
  { tokens: [T('}')] },
  { tokens: [T('// nextDelay caps the exponential backoff at 30s and adds jitter so a fleet never stampedes', 'com')] },
];

// A short JSON sample: no header, with line numbers.
const JSON_LINES: CodeLine[] = [
  { tokens: [T('{')] },
  { tokens: [T('  '), T('"engine"', 'key'), T(': '), T('"cloud-agent"', 'str'), T(',')] },
  { tokens: [T('  '), T('"maxBudgetUsd"', 'key'), T(': '), T('5', 'num'), T(',')] },
  { tokens: [T('  '), T('"streaming"', 'key'), T(': '), T('true', 'num')] },
  { tokens: [T('}')] },
];

// A unified-diff sample (mirrors the Android DiffView shape).
const DIFF_LINES: CodeLine[] = [
  { tokens: [T('fun '), T('nextDelay', 'fn'), T('(attempt: Int): Long =')], diff: 'unchanged' },
  { tokens: [T('  minOf('), T('15_000', 'num'), T(', '), T('1_000', 'num'), T(' shl attempt)')], diff: 'removed' },
  { tokens: [T('  minOf('), T('30_000', 'num'), T(', '), T('1_000', 'num'), T(' shl attempt)')], diff: 'added' },
  { tokens: [T('    .plus(Random.nextLong('), T('250', 'num'), T('))')], diff: 'added' },
];

// Data composite: `lines` are pre-tokenized data rendered internally, not slots. Copy is the shared _CopyButton (composing NockerlIconButton), wrap is NockerlSwitch, the language tag is NockerlLanguageBadge, so no hand-rolled facsimiles and no owns.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Code block page: a full-chrome block
 * (filename + language pill + a working Copy that confirms "Copied"), a headerless
 * block with line numbers, a live Wrap toggle on a block whose long comment line
 * scrolls horizontally (wrap off) or reflows (wrap on), and a unified-diff variant
 * with added/removed washes + a +/- gutter. Every control is keyboard-operable; the
 * code region is focusable + scrollable; the copy confirmation freezes under
 * prefers-reduced-motion.
 */
export default function CodeBlockDemo() {
  const [wrap, setWrap] = useState(false);

  return (
    <div className="nk-cb-demo">
      <style>{STYLES}</style>

      <div className="nk-cb-demo__group">
        <p className="nk-cb-demo__lbl">Full chrome: filename · language · copy (tab to it, hit Enter)</p>
        <CodeBlock filename="backoff.ts" language="typescript" lines={TS_LINES} showLineNumbers />
      </div>

      <div className="nk-cb-demo__group">
        <p className="nk-cb-demo__lbl">No header · line numbers · a quiet, recessed well</p>
        <CodeBlock language="json" lines={JSON_LINES} showLineNumbers />
      </div>

      <div className="nk-cb-demo__group">
        <p className="nk-cb-demo__lbl">Wrap toggle: long line scrolls (off) or reflows (on)</p>
        <div className="nk-cb-demo__toolbar">
          <span className="nk-cb-demo__toolbar-label">Wrap lines</span>
          <NockerlSwitch ariaLabel="Wrap lines" checked={wrap} onChange={setWrap} size="sm" />
        </div>
        <CodeBlock filename="gateway.ts" language="typescript" lines={TS_LINES} wrap={wrap} />
      </div>

      <div className="nk-cb-demo__group">
        <p className="nk-cb-demo__lbl">Unified diff: added / removed (warm status + a +/- glyph, never color alone)</p>
        <CodeBlock filename="backoff.kt" language="kotlin" lines={DIFF_LINES} diff showLineNumbers />
      </div>

      <p className="nk-cb-demo__count">
        Copy writes to the clipboard and confirms <b>Copied</b> for ~2s · the code region is a
        focusable, scrollable target. The island is live.
      </p>
    </div>
  );
}
