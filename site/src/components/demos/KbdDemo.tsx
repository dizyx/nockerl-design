/**
 * KbdDemo: the live showcase for the NockerlKbd primitive (a single RAISED KEYCAP).
 *
 * NockerlKbd is a LEAF: it renders a real <kbd> styled as a dimensional key (the lift law,
 * so a mono legend on a raised surface, a 1px top catch-light, a weighted NEUTRAL bottom,
 * and a :active DEPRESS), and it self-injects its own recipe. So there is nothing to
 * wire here beyond arranging caps: single keys, a chord (several caps side by side in a
 * tight flex row), and inline-in-prose. The keycap look, the press travel, and the
 * theme-reactive surface all come from the primitive.
 *
 * TOKEN-REACTIVE: this demo's own chrome (labels, the chord rows, the inline sentence)
 * is `var(--token)` only; literals are pure geometry. The caps themselves carry no local
 * styling. Press one to feel the depress.
 */
import { NockerlKbd } from '@dizyx/nockerl-react';

const STYLES = `
.nk-kbd-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }
.nk-kbd-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-kbd-demo__lbl:not(:first-child) { margin-top: var(--space-6); }
/* a row of caps: single keys sit in a wrapping row; a chord is a TIGHT flex group so the
   caps read as one shortcut (the same .nk-cmd__keys idiom the command palette uses). */
.nk-kbd-demo__row { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-3); }
.nk-kbd-demo__chord { display: inline-flex; align-items: center; gap: var(--space-1); }
.nk-kbd-demo__plus { color: var(--color-on-card-muted); font-size: var(--font-size-12); }
/* an inline sentence: caps sit on the text baseline (NockerlKbd is vertical-align: middle) */
.nk-kbd-demo__prose { font-size: var(--font-size-14); line-height: var(--font-line-height-24); color: var(--color-on-card); max-width: 60ch; }
/* a long sequence in a NARROW mobile-width column at a realistic line-height: the
   caps WRAP across several lines and must stay CLEAR of each other (no overlap). This is
   exactly why the cap was made slightly smaller: it now fits a normal prose line-box. */
.nk-kbd-demo__seq { max-width: 240px; font-size: var(--font-size-12); line-height: var(--font-line-height-20); color: var(--color-on-card); }
.nk-kbd-demo__note { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-6); }
`;

/** A chord: several keycaps side by side, joined by a quiet separator. The whole chord is
 *  aria-hidden, because a real shortcut is announced by its host control's accessible name. */
function Chord({ keys }: { keys: string[] }) {
  return (
    <span className="nk-kbd-demo__chord" aria-hidden="true">
      {keys.map((k, i) => <NockerlKbd key={i}>{k}</NockerlKbd>)}
    </span>
  );
}

/**
 * The interactive showcase mounted on the NockerlKbd page: single keys, common CHORDS
 * (⌘K, ⌘⇧L, G then P), the special keys (Esc, arrows, Enter, Tab), and an inline
 * sentence proving the cap sits on the prose baseline. Press any cap to see it
 * DEPRESS (the key travels down + the bottom weight collapses), frozen under
 * prefers-reduced-motion.
 */
export default function KbdDemo() {
  return (
    <div className="nk-kbd-demo">
      <style>{STYLES}</style>

      <p className="nk-kbd-demo__lbl">Single keys: press one to feel it depress</p>
      <div className="nk-kbd-demo__row">
        <NockerlKbd>⌘</NockerlKbd>
        <NockerlKbd>K</NockerlKbd>
        <NockerlKbd>Esc</NockerlKbd>
        <NockerlKbd>Tab</NockerlKbd>
        <NockerlKbd>Enter</NockerlKbd>
        <NockerlKbd>↑</NockerlKbd>
        <NockerlKbd>↓</NockerlKbd>
        <NockerlKbd>←</NockerlKbd>
        <NockerlKbd>→</NockerlKbd>
        <NockerlKbd>⇧</NockerlKbd>
      </div>

      <p className="nk-kbd-demo__lbl">Chords: several caps in a tight row read as one shortcut</p>
      <div className="nk-kbd-demo__row">
        <Chord keys={['⌘', 'K']} />
        <Chord keys={['⌘', '⇧', 'L']} />
        <Chord keys={['Ctrl', 'C']} />
        <span className="nk-kbd-demo__chord">
          <NockerlKbd>G</NockerlKbd>
          <span className="nk-kbd-demo__plus">then</span>
          <NockerlKbd>P</NockerlKbd>
        </span>
      </div>

      <p className="nk-kbd-demo__lbl">Inline: a cap sits on the prose baseline</p>
      <p className="nk-kbd-demo__prose">
        Open the command palette with <Chord keys={['⌘', 'K']} />, walk the results with{' '}
        <NockerlKbd>↑</NockerlKbd> <NockerlKbd>↓</NockerlKbd>, run one with <NockerlKbd>Enter</NockerlKbd>, and dismiss it with <NockerlKbd>Esc</NockerlKbd>.
      </p>

      <p className="nk-kbd-demo__lbl">Multi-line: a long sequence wraps cleanly in a narrow column (no overlap)</p>
      <p className="nk-kbd-demo__seq">
        <NockerlKbd>Ctrl</NockerlKbd> <NockerlKbd>⇧</NockerlKbd> <NockerlKbd>P</NockerlKbd> then{' '}
        <NockerlKbd>G</NockerlKbd> <NockerlKbd>I</NockerlKbd> then <NockerlKbd>Enter</NockerlKbd>, or{' '}
        <NockerlKbd>Esc</NockerlKbd> <NockerlKbd>Esc</NockerlKbd> to cancel, then{' '}
        <NockerlKbd>⌘</NockerlKbd> <NockerlKbd>K</NockerlKbd> to reopen.
      </p>

      <p className="nk-kbd-demo__note">
        Every cap is a real <code>&lt;kbd&gt;</code>, semantically keyboard input in the a11y tree; the host
        still owns the accessible shortcut description. The look, the depress, and the theme flip come from the
        primitive, so the caps here carry no local styling.
      </p>
    </div>
  );
}
