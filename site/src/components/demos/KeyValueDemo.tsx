/**
 * KeyValueDemo: the live, interactive Nockerl key-value / description-list island
 * for the web platform.
 *
 * This is the READ-ONLY property / detail pane: it presents ONE record's attributes
 * as label→value pairs (e.g. a session's Model, Tokens, Created, Status), NOT a
 * multi-record grid (that's `table`) and NOT interactive navigation rows (that's
 * `list-item`). It is a semantic description list: a <dl> of <dt>/<dd> pairs.
 *
 * Sourced from the shipped apps (never the web dashboard):
 *   • Android Compose, in ClusterSheet's metric rows + StatTile + ToolCallCard's
 *     CopyableCodeSurface: a row is `Text(label, onCardMuted)` → `Spacer.weight(1f)`
 *     → `Text(value, onCard[, Monospace])`; copy flips ContentCopy→Check,
 *     "Copy"→"Copied", onCardMuted→statusSuccess, 2s reset; an empty value falls
 *     back to a muted placeholder.
 *   • Voice Swift: HomeSection StatCard/StatTile + HistoryView's ProviderBadge +
 *     copy icon (doc.on.doc→checkmark, accent→success). Labels = onSurfaceMuted,
 *     values = onSurface, numerics .monospacedDigit().
 *
 * Implements the design laws verbatim:
 *   • the CARD lifts (neutral shadow + top catch-light, never a glow); the rows
 *     inside are FLAT, separated by hairlines; depth lives in the card.
 *   • the brand cyan is reserved for links / accents; STATUS values use the warm
 *     status tokens (success / warning / error / info), never cyan.
 *   • flash-free feedback: the copy button's fill is static; hover/press animate a
 *     neutral wash + a subtle scale only, and the "Copied" confirmation is a
 *     brightness/opacity swap, never a fill tween.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow; copy
 *     buttons and links are real, focusable, keyboard-operable targets.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them to
 * the dark palette; change a token and this demo moves with everything else.
 * Literals remain only for pure geometry (icon dimensions, transition curves).
 */
import { useState } from 'react';
import { NockerlLink, NockerlSurface, type ComposeContract } from '@dizyx/nockerl-react';
import CopyButton from './_CopyButton';

export type KeyValueStatus = 'success' | 'warning' | 'error' | 'info';

/** A status value renders as a warm pill: color + dot + text, never color alone. */
const STATUS_COLOR: Record<KeyValueStatus, string> = {
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)',
  error: 'var(--color-status-error)',
  info: 'var(--color-status-info)',
};

// The card lifts; the rows are FLAT and hairline-separated. Aligned layout puts the
// label in a fixed left column and the value in the flexible remainder, baseline-
// aligned per row. The stacked variant drops the label above the value for narrow
// widths. Every visual value is a token.
const STYLES = `
.nk-kv-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }

/* The containing CARD: depth lives here. NockerlSurface (card variant) supplies the
   fill, hairline, and 16px card radius; this rule keeps the card's own shadow. */
.nk-kv-card {
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen);
  overflow: hidden;
  max-width: 460px;
}
/* Optional card header: a record title sitting above its properties. */
.nk-kv-card__head {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--space-px) solid var(--color-card-hairline);
}
.nk-kv-card__title { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-card); }
.nk-kv-card__sub { font-size: var(--font-size-12); color: var(--color-on-card-muted); }

/* The description list itself: reset default <dl> margins. */
.nk-kv { margin: 0; padding: 0; }

/* ── A single label→value row (a <div> wrapping <dt>+<dd>) ─────────────────── */
.nk-kv__row {
  position: relative;
  display: flex;
  align-items: baseline;            /* baseline alignment per row */
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  min-height: calc(var(--space-10) + var(--space-1));
}
.nk-kv__row + .nk-kv__row { border-top: var(--space-px) solid var(--color-card-hairline); }  /* hairline, not a shadow */

/* The KEY (label): muted, fixed left column, consistently aligned. */
.nk-kv__key {
  flex: 0 0 auto;
  width: calc(var(--space-16) + var(--space-12));   /* 112: the aligned label column */
  margin: 0;
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-medium);
  line-height: var(--font-line-height-20);
  color: var(--color-on-card-muted);
}
/* The VALUE (dd): strong text, flexible remainder, can wrap. */
.nk-kv__val {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: var(--font-size-14);
  line-height: var(--font-line-height-20);
  color: var(--color-on-card);
  word-break: break-word;
}
/* the value's text fills the row; the copy button is pinned to the right edge */
.nk-kv__val-text { flex: 1 1 auto; min-width: 0; }
.nk-kv__val--multiline .nk-kv__val-text { white-space: pre-line; }

/* Value TYPES ───────────────────────────────────────────────────────────────── */
/* mono: ids, token counts, hashes (Compose FontFamily.Monospace / Swift .monospacedDigit) */
.nk-kv__mono { font-family: var(--font-family-mono); font-size: var(--font-size-12); letter-spacing: var(--font-tracking-snug); }
/* placeholder: an empty value reads "Not set" in muted text, never blank */
.nk-kv__empty { color: var(--color-on-card-muted); }
/* avatar + name composite value */
.nk-kv__avatar {
  width: 22px; height: 22px; border-radius: var(--radius-pill); flex: 0 0 auto;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-card-surface3); color: var(--color-on-card);
  font-size: var(--font-size-10); font-weight: var(--font-weight-semibold);
  align-self: center;
}
.nk-kv__person { display: inline-flex; align-items: center; gap: var(--space-2); }

/* STATUS pill: warm token + dot + text (never color alone, never cyan). */
.nk-kv__status {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-0-5) var(--space-2);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-12); font-weight: var(--font-weight-medium); line-height: var(--font-line-height-16);
}
.nk-kv__status-dot { width: 6px; height: 6px; border-radius: var(--radius-pill); }   /* 6px: glyph geometry */

/* COPY slot: a reveal/positioning WRAPPER around the real <NockerlIconButton> primitive
   (which owns the hit-area, hover wash, press scale + focus ring). The wrapper only
   pins the button to the row's right edge and fades it in on row hover / focus-within.
   Confirmation = the shared _CopyButton standard (accent fill + on-accent check, ~2s);
   its aria-label carries Copy / Copied. */
.nk-kv__copy {
  flex: 0 0 auto;
  align-self: center;
  display: inline-flex;
  margin-left: auto;
  opacity: 0;                       /* hidden until the row is hovered / a control is focused */
  transition: opacity .12s;
}
.nk-kv__row:hover .nk-kv__copy,
.nk-kv__copy:focus-within { opacity: 1; }
/* keep the reveal pinned open while the shared CopyButton is confirming (the
   confirmation itself, accent fill + on-accent check, lives in _CopyButton) */
.nk-kv__copy:has(.is-copied) { opacity: 1; }

/* STACKED / compact variant: label ABOVE value, for narrow panes. */
.nk-kv--stacked .nk-kv__row { flex-direction: column; align-items: stretch; gap: var(--space-0-5); }
.nk-kv--stacked .nk-kv__key { width: auto; font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; }
.nk-kv--stacked .nk-kv__copy { position: absolute; top: var(--space-3); right: var(--space-4); margin: 0; }

/* showcase chrome (labels + live readout) */
.nk-kv-demo__grid { display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: flex-start; }
.nk-kv-demo__col { flex: 1 1 320px; min-width: 280px; }
.nk-kv-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-kv-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-kv-demo__count b { color: var(--color-accent-primary); font-family: var(--font-family-mono); }
`;

/**
 * A copyable value: the row reveals the shared _CopyButton (THE one copy
 * affordance, with one glyph pair and one on-accent confirmation) on hover; focus
 * keeps it visible, and the confirming state pins the reveal open via :has(.is-copied).
 */
function CopyValue({ value, label }: { value: string; label: string }) {
  return (
    <span className="nk-kv__copy">
      <CopyButton text={value} label={`Copy ${label}`} copiedLabel={`${label} copied`} />
    </span>
  );
}

/** The status-pill value: warm token + dot + text (never color alone, never cyan). */
function StatusValue({ status, children }: { status: KeyValueStatus; children: string }) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className="nk-kv__status"
      style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}
    >
      <span className="nk-kv__status-dot" style={{ background: c }} aria-hidden="true" />
      {children}
    </span>
  );
}

export interface KeyValueRowProps {
  /** The label (key), rendered as the <dt>, muted, in the aligned column. */
  label: string;
  /** Render the value as monospace (ids, token counts, hashes). */
  mono?: boolean;
  /** Allow the value to wrap across multiple lines (paths, descriptions). */
  multiline?: boolean;
  /** Reveal a copy button (separate focusable target); copies `copyText`. */
  copyText?: string;
  /** The value content: text, a pill, a link, an avatar+name, … */
  children?: React.ReactNode;
}

/**
 * A single key→value row: the unit the spec documents. A `<div>` wrapping a `<dt>`
 * (the muted label) and a `<dd>` (the strong value), baseline-aligned. An empty
 * value falls back to a muted "Not set".
 */
export function KeyValueRow({ label, mono, multiline, copyText, children }: KeyValueRowProps) {
  const empty = children === undefined || children === null || children === '';
  return (
    <div className="nk-kv__row">
      <dt className="nk-kv__key">{label}</dt>
      <dd className={`nk-kv__val${multiline ? ' nk-kv__val--multiline' : ''}`}>
        <span className={`nk-kv__val-text${mono ? ' nk-kv__mono' : ''}`}>
          {empty ? <span className="nk-kv__empty" aria-label="Not set">Not set</span> : children}
        </span>
        {copyText && !empty && <CopyValue value={copyText} label={label} />}
      </dd>
    </div>
  );
}

/**
 * The interactive showcase mounted on the Key-value page: a card-wrapped session
 * inspector demonstrating every value TYPE (plain text, mono id / token count, a
 * status pill, a timestamp, a copyable token, a link, an avatar+name, a multi-line
 * value, an empty value reading "Not set"), plus the STACKED/compact variant for narrow panes. The
 * card lifts; the rows are flat + hairline-separated. Hover or tab to a row to
 * reveal its copy button; activate it to confirm "Copied".
 */
// Data composite: label→value rows rendered internally, not slots. Copy uses the NockerlIconButton primitive; the one hand-rolled facsimile is the <a href> repo link, which should compose NockerlLink, so no owns.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default function KeyValueDemo() {
  const [copies, setCopies] = useState(0);

  // Count clipboard activations across all copy buttons (event delegation) so the
  // readout proves the island is live + every copy button is real.
  const onCopyClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.nk-kv__copy')) setCopies((c) => c + 1);
  };

  return (
    <div className="nk-kv-demo" onClickCapture={onCopyClick}>
      <style>{STYLES}</style>

      <div className="nk-kv-demo__grid">
        {/* ── Aligned two-column inspector (the primary layout) ── */}
        <div className="nk-kv-demo__col">
          <p className="nk-kv-demo__lbl">Session inspector: aligned label → value</p>
          <NockerlSurface className="nk-kv-card">
            <div className="nk-kv-card__head">
              <span className="nk-kv__avatar" aria-hidden="true">N</span>
              <div>
                <div className="nk-kv-card__title">nockerl-design · docs site</div>
                <div className="nk-kv-card__sub">Session details</div>
              </div>
            </div>
            <dl className="nk-kv">
              <KeyValueRow label="Status">
                <StatusValue status="info">Streaming</StatusValue>
              </KeyValueRow>
              <KeyValueRow label="Model">Large 2.0</KeyValueRow>
              <KeyValueRow label="Session ID" mono copyText="sess_3kPq9veL2mZ">
                sess_3kPq9veL2mZ
              </KeyValueRow>
              <KeyValueRow label="Tokens" mono>
                128,420 in · 9,310 out
              </KeyValueRow>
              <KeyValueRow label="Owner">
                <span className="nk-kv__person">
                  <span className="nk-kv__avatar" aria-hidden="true">PM</span>
                  the design lead
                </span>
              </KeyValueRow>
              <KeyValueRow label="Created">Jun 27, 2026 · 09:14</KeyValueRow>
              <KeyValueRow label="Repo">
                <NockerlLink href="#repo" variant="muted">dizyx/nockerl-design</NockerlLink>
              </KeyValueRow>
              <KeyValueRow label="Workspace" copyText="dizyx">
                dizyx
              </KeyValueRow>
              <KeyValueRow label="Ended" />
            </dl>
          </NockerlSurface>
        </div>

        {/* ── Stacked / compact variant + a multi-line value ── */}
        <div className="nk-kv-demo__col">
          <p className="nk-kv-demo__lbl">Compact: label above value (narrow panes)</p>
          <NockerlSurface className="nk-kv-card">
            <dl className="nk-kv nk-kv--stacked">
              <KeyValueRow label="Status">
                <StatusValue status="success">Healthy</StatusValue>
              </KeyValueRow>
              <KeyValueRow label="Endpoint" mono copyText="http://localhost:8080">
                http://localhost:8080
              </KeyValueRow>
              <KeyValueRow label="Commit" mono copyText="a1f9c34d8e2b">
                a1f9c34d8e2b
              </KeyValueRow>
              <KeyValueRow label="Working directory" mono multiline>
                {'~/dizyx/projects/nockerl-design/\n  repos/nockerl-design'}
              </KeyValueRow>
            </dl>
          </NockerlSurface>

          <p className="nk-kv-demo__lbl" style={{ marginTop: 'var(--space-5)' }}>
            Tool call parameters: read-only key → value
          </p>
          <NockerlSurface className="nk-kv-card">
            <dl className="nk-kv">
              <KeyValueRow label="Tool" mono>Edit</KeyValueRow>
              <KeyValueRow label="file_path" mono copyText="src/components/NockerlButton.tsx">
                src/components/NockerlButton.tsx
              </KeyValueRow>
              <KeyValueRow label="Result">
                <StatusValue status="warning">Awaiting approval</StatusValue>
              </KeyValueRow>
            </dl>
          </NockerlSurface>
        </div>
      </div>

      <p className="nk-kv-demo__count">
        Copy fired <b>{copies}</b> {copies === 1 ? 'time' : 'times'}. Hover or tab a row, then
        activate its copy button. The island is live.
      </p>
    </div>
  );
}
