/**
 * ButtonDemo: the live, interactive Nockerl button island for the web platform.
 *
 * Implements the design laws verbatim:
 *   • cyan fill-ladder: primary (filled gradient) → secondary (soft) →
 *     tertiary (outline) → ghost (text) → destructive (outline)
 *   • 12px control radius: a rounded rectangle, never a pill
 *   • flash-free feedback: the fill is STATIC; hover/active animate
 *     brightness (filter) + transform + neutral shadow only
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow
 *   • NO glow / colored shadow / emission anywhere
 *   • label is UPPERCASE · light (300) · tracked -0.03em. Buttons are the ONLY
 *     uppercase in the Nockerl type system (design-laws §11)
 *
 * Styles are scoped via a `nk-btn` class injected once, so the island is
 * self-contained and does not depend on the docs theme CSS.
 */
import { useState } from 'react';
import { NockerlButton, type NockerlButtonVariant } from '@dizyx/nockerl-react';

// One control radius (--radius-control) and a static fill per variant. Feedback
// never tweens the fill; only brightness/transform/shadow move. Every visual
// value is a token; the dark stage resolves the cyan accent to #0cc0df.
const STYLES = `
.nk-btn-demo { font-family: var(--font-family-sans); }
.nk-btn-demo__row { display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center; }
.nk-btn-demo__row + .nk-btn-demo__row { margin-top: var(--space-4); }
.nk-btn-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-btn-demo__count { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-5); }
.nk-btn-demo__count b { color: var(--color-accent-primary); }
`;

const VARIANTS: NockerlButtonVariant[] = ['primary', 'secondary', 'tertiary', 'ghost', 'destructive'];

/**
 * The interactive showcase mounted on the NockerlButton page: every variant in its
 * rest/hover/active states (hover, tab-to, click them), plus a disabled row, a
 * loading row, and a counter proving the click handler fires.
 */
export default function ButtonDemo() {
  const [clicks, setClicks] = useState(0);
  return (
    <div className="nk-btn-demo">
      <style>{STYLES}</style>

      <p className="nk-btn-demo__lbl">Variants: hover, tab, click them</p>
      <div className="nk-btn-demo__row">
        <NockerlButton text="Create session" variant="primary" leadingIcon="+" onClick={() => setClicks((c) => c + 1)} />
        <NockerlButton text="Files" variant="secondary" onClick={() => setClicks((c) => c + 1)} />
        <NockerlButton text="Archive all" variant="tertiary" onClick={() => setClicks((c) => c + 1)} />
        <NockerlButton text="Cancel" variant="ghost" onClick={() => setClicks((c) => c + 1)} />
        <NockerlButton text="Delete" variant="destructive" onClick={() => setClicks((c) => c + 1)} />
      </div>

      <p className="nk-btn-demo__lbl" style={{ marginTop: '20px' }}>Disabled: inert, still visible</p>
      <div className="nk-btn-demo__row">
        {VARIANTS.map((v) => (
          <NockerlButton key={v} text={v[0]!.toUpperCase() + v.slice(1)} variant={v} disabled />
        ))}
      </div>

      <p className="nk-btn-demo__lbl" style={{ marginTop: '20px' }}>Loading: holds width, blocks re-click</p>
      <div className="nk-btn-demo__row">
        <NockerlButton text="Creating…" variant="primary" loading />
        <NockerlButton text="Working" variant="tertiary" loading />
      </div>

      <p className="nk-btn-demo__lbl" style={{ marginTop: '20px' }}>Sizes</p>
      <div className="nk-btn-demo__row">
        <NockerlButton text="Small" variant="primary" size="sm" onClick={() => setClicks((c) => c + 1)} />
        <NockerlButton text="Medium" variant="primary" size="md" onClick={() => setClicks((c) => c + 1)} />
        <NockerlButton text="Large" variant="primary" size="lg" onClick={() => setClicks((c) => c + 1)} />
      </div>

      <p className="nk-btn-demo__count">
        Click handler fired <b>{clicks}</b> {clicks === 1 ? 'time' : 'times'}. The island is live.
      </p>
    </div>
  );
}
