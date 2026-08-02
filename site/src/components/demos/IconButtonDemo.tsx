/**
 * IconButtonDemo: the live, interactive Nockerl icon-button island for the web.
 *
 * Mirrors the canonical Compose `NockerlIconButton` (core/ui/NockerlIconButton.kt):
 * two idioms only:
 *   • PLAIN:           a transparent, control-radius (12px) tappable glyph for
 *                      toolbar / inline actions (neutral glyph or a caller tint).
 *   • FILLED_CIRCLE:   a solid accent CIRCLE, the single true-circle affordance,
 *                      reserved for the prominent send / stop slot.
 *
 * Implements the design laws verbatim:
 *   • 12px control radius for PLAIN; a true circle ONLY for send/stop.
 *   • flash-free feedback: the fill is STATIC; hover/active animate
 *     brightness (filter) + transform + a NEUTRAL shadow only.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   • NO glow / colored shadow / emission anywhere; circle catch-light is a
 *     top inset white sheen (lit-from-above), not a halo.
 *   • every icon button carries an accessible name (aria-label). Icon-only
 *     controls have no visible text, so the name is non-negotiable.
 *
 * Styles are scoped via a `nk-ico` class injected once, so the island is
 * self-contained and does not depend on the docs theme CSS.
 */
import { useState } from 'react';
import { NockerlIcon, NockerlIconButton } from '@dizyx/nockerl-react';
import { CopyButton } from './_CopyButton';

// One control radius (--radius-control) for PLAIN; a true circle for the send/stop
// slot. Feedback never tweens the fill; only brightness/transform/shadow move.
// Every visual value is a token; the dark stage resolves the cyan accent.
const STYLES = `
.nk-ico-demo { font-family: var(--font-family-sans); }
.nk-ico-demo__row { display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center; }
.nk-ico-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-ico-demo__count { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-5); }
.nk-ico-demo__count b { color: var(--color-accent-primary); }
`;

// ─── Inline glyphs (stroke icons use currentColor so PLAIN/circle both tint right) ──

const IconMore = (
  <NockerlIcon>
    <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
  </NockerlIcon>
);
const IconAdd = <NockerlIcon path="M12 5v14M5 12h14" />;
const IconCopy = (
  <NockerlIcon>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </NockerlIcon>
);
const IconTrash = <NockerlIcon path="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />;
const IconSend = <NockerlIcon path="M4 12h15M13 6l6 6-6 6" />;
const IconStop = (
  <NockerlIcon>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
  </NockerlIcon>
);

/**
 * The interactive showcase mounted on the NockerlIcon button page: a row of PLAIN
 * actions (tab to, click them), a disabled row (inert + still visible), and the
 * FILLED_CIRCLE send / stop slot, the one true-circle affordance. Every button
 * carries an aria-label; a counter proves the click handler fires.
 */
export default function IconButtonDemo() {
  const [clicks, setClicks] = useState(0);
  const bump = () => setClicks((c) => c + 1);
  return (
    <div className="nk-ico-demo">
      <style>{STYLES}</style>

      <p className="nk-ico-demo__lbl">Plain: toolbar / inline actions (tab, click them)</p>
      <div className="nk-ico-demo__row">
        <NockerlIconButton icon={IconMore} label="More options" onClick={bump} />
        <NockerlIconButton icon={IconAdd} label="Add session" onClick={bump} />
        {/* the Copy action IS the shared CopyButton. Click it: the glyph flips to the bare
            cyan check, proving copy is one composed component with confirm behavior, not a raw glyph. */}
        <CopyButton text="Copied from the icon-button demo" label="Copy" size={40} onCopied={bump} />
        <NockerlIconButton icon={IconTrash} label="Delete" onClick={bump} />
      </div>

      <p className="nk-ico-demo__lbl" style={{ marginTop: '20px' }}>Disabled: inert, still visible</p>
      <div className="nk-ico-demo__row">
        <NockerlIconButton icon={IconMore} label="More options (disabled)" disabled />
        <NockerlIconButton icon={IconAdd} label="Add session (disabled)" disabled />
        <NockerlIconButton icon={IconCopy} label="Copy (disabled)" disabled />
      </div>

      <p className="nk-ico-demo__lbl" style={{ marginTop: '20px' }}>
        Filled circle: the send / stop slot (the only true circle)
      </p>
      <div className="nk-ico-demo__row">
        <NockerlIconButton icon={IconSend} label="Send message" variant="filled-circle" size={48} onClick={bump} />
        <NockerlIconButton icon={IconStop} label="Stop generating" variant="filled-circle" accent="var(--color-status-error)" size={48} onClick={bump} />
        <NockerlIconButton icon={IconSend} label="Send (disabled)" variant="filled-circle" size={48} disabled />
      </div>

      <p className="nk-ico-demo__count">
        Click handler fired <b>{clicks}</b> {clicks === 1 ? 'time' : 'times'}. The island is live.
      </p>
    </div>
  );
}
