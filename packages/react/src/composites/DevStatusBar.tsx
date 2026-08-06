/**
 * NockerlDevStatusBar is the dev-console STATUS BAR: the thin strip
 * pinned to the bottom of the web console. It reports ambient state: branch, agent /
 * job status, cursor position, keyboard hints. Deliberately NOT the Toolbar grammar
 * (Toolbar = a control surface of real actions at control scale); the status bar is
 * CHROME at reading scale: quiet segments, an optional status dot, an optional Kbd
 * hint, and only opt-in interactivity.
 *
 * Web-only by scope (the de-phantom verdict): native consoles have no equivalent
 * surface. It still speaks the shared grammar: chrome plane, hairline TOP edge (it
 * sits at the window's bottom), tokens throughout, status via the real NockerlStatusDot
 * ladder, hints via the real NockerlKbd keycap.
 *
 * Anatomy: [start segments] ······ [end segments]. Each segment = optional icon ·
 * optional status dot · label · optional keycap(s). A segment with `onSelect` renders
 * a real <button> (focus ring, hover wash); otherwise a plain, non-interactive span.
 * Per the icon-interactivity canon, nothing looks pressable unless it is.
 *
 * TOKEN-REACTIVE: every color / font / spacing value is a var(--token); literals are
 * pure geometry only. No backticks in STYLES.
 */
import type { ReactNode } from 'react';
import { NockerlKbd } from '../primitives/Kbd.js';
import { NockerlStatusDot, type StatusKind } from '../primitives/StatusDot.js';
import type { ComposeContract } from '../compose-contract.js';

export interface NockerlDevStatusSegmentProps {
  /** The segment text (chrome-muted at rest; full chrome ink on hover when interactive). */
  label: string;
  /** Optional leading glyph (12px box; currentColor). */
  icon?: ReactNode;
  /** Optional leading status dot, on the shared NockerlStatusDot semantic ladder. */
  dot?: StatusKind;
  /** Optional trailing keyboard hint(s), rendered as real NockerlKbd keycaps. */
  kbd?: string[];
  /** Makes the segment a real button. Omitted = a plain informational span. */
  onSelect?: (() => void) | undefined;
  /** Accessible name override (defaults to the label + kbd hint). */
  ariaLabel?: string;
}

export interface NockerlDevStatusBarProps {
  /** Leading segments (left-aligned). */
  start?: ReactNode;
  /** Trailing segments (right-aligned). */
  end?: ReactNode;
  /** Accessible name of the bar region. Default "Status bar". */
  ariaLabel?: string;
  /** Extra class on the bar. */
  className?: string;
}

// The strip: chrome plane + a hairline TOP edge (it seats against the window bottom).
// Reading-scale chrome type (10px semibold, eyebrow tracking), the console's quiet
// caption voice; segments get a soft wash + full ink ONLY when interactive. Kbd caps
// ride the segment baseline at their own (2635) compact size.
export const NOCKERL_DEV_STATUS_BAR_STYLES = `
.nk-dsb {
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
  min-height: var(--space-6); padding: 0 var(--space-2);
  background: var(--color-chrome-surface);
  border-top: var(--space-px) solid var(--color-chrome-hairline);
  color: var(--color-on-chrome-muted);
  font-family: var(--font-family-sans); font-size: var(--font-size-10);
  font-weight: var(--font-weight-semibold); letter-spacing: var(--font-tracking-eyebrow);
  text-transform: uppercase;
}
.nk-dsb__side { display: flex; align-items: center; gap: var(--space-1); min-width: 0; }
.nk-dsb__side--end { justify-content: flex-end; }
/* one SEGMENT: icon · dot · label · keycaps. Plain span = informational; button = a
   quiet interactive key (hover wash + ink, focus OUTLINE, never a colored shadow). */
.nk-dsb__seg {
  display: inline-flex; align-items: center; gap: var(--space-1);
  padding: var(--space-0-5) var(--space-1); border: 0; background: transparent;
  border-radius: var(--radius-track); color: inherit; font: inherit;
  letter-spacing: inherit; text-transform: inherit; white-space: nowrap;
}
button.nk-dsb__seg { cursor: pointer; transition: background-color .12s, color .12s; }
button.nk-dsb__seg:hover { background: color-mix(in srgb, var(--color-on-chrome) 8%, transparent); color: var(--color-on-chrome); }
button.nk-dsb__seg:active { background: color-mix(in srgb, var(--color-on-chrome) 5%, transparent); }
button.nk-dsb__seg:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(var(--space-0-5) * -1); }
.nk-dsb__ico { display: inline-flex; flex: 0 0 auto; }
.nk-dsb__ico svg { display: block; width: 12px; height: 12px; }
.nk-dsb__lbl { overflow: hidden; text-overflow: ellipsis; }
/* keycap hints ride slightly quiet inside the strip */
.nk-dsb__seg .nk-kbd { text-transform: none; letter-spacing: normal; }
@media (prefers-reduced-motion: reduce) { button.nk-dsb__seg { transition: none; } }
`;

/**
 * One status segment. Renders a real <button> when `onSelect` is given, else a plain
 * informational span (nothing looks pressable unless it is).
 */
export function NockerlDevStatusSegment({ label, icon, dot, kbd, onSelect, ariaLabel }: NockerlDevStatusSegmentProps) {
  const body = (
    <>
      {dot && <NockerlStatusDot status={dot} size="xs" surface="var(--color-chrome-surface)" ariaLabel={dot} />}
      {icon && (
        <span className="nk-dsb__ico" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="nk-dsb__lbl">{label}</span>
      {kbd?.map((k) => (
        <NockerlKbd key={k}>{k}</NockerlKbd>
      ))}
    </>
  );
  if (onSelect) {
    return (
      <button type="button" className="nk-dsb__seg" aria-label={ariaLabel ?? label} onClick={onSelect}>
        {body}
      </button>
    );
  }
  return (
    <span className="nk-dsb__seg" aria-label={ariaLabel}>
      {body}
    </span>
  );
}

/**
 * The dev-console status bar: [start] ...... [end]. Fill both sides with
 * NockerlDevStatusSegment (or any quiet chrome of your own).
 */
export function NockerlDevStatusBar({ start, end, ariaLabel = 'Status bar', className }: NockerlDevStatusBarProps) {
  return (
    <div className={['nk-dsb', className].filter(Boolean).join(' ')} aria-label={ariaLabel}>
      <div className="nk-dsb__side">{start}</div>
      <div className="nk-dsb__side nk-dsb__side--end">{end}</div>
      {/* Recipe CSS injected as the LAST child; identical injected blocks dedupe. */}
      <style>{NOCKERL_DEV_STATUS_BAR_STYLES}</style>
    </div>
  );
}

// CONTAINER: start/end are open slots (any quiet chrome). Composes NockerlStatusDot +
// NockerlKbd. OWNS button: the interactive segment is a reading-scale chrome key
// (10px caption in a 24px strip) that NockerlButton's control-scale grammar (32px+
// targets, own surface recipes) does not express. This is the same reasoning as
// the breadcrumb menu rows.
export const compose = {
  slots: { start: { accepts: '*', required: false }, end: { accepts: '*', required: false } },
  owns: ['button'],
} satisfies ComposeContract;

export default NockerlDevStatusBar;
