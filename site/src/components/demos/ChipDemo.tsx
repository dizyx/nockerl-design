/**
 * ChipDemo: the live, interactive Nockerl chip island for the web platform.
 *
 * The chip is one of the two surfaces that deliberately keep the fully-rounded
 * PILL silhouette (the other is the input bar); every other control uses the
 * 12px control radius. Implements the design laws verbatim:
 *   • pill (RoundedCornerShape ~50%): chips are the one place the pill is allowed
 *   • selected → solid cyan (#0CC0DF) fill + contrast label;
 *     unselected → soft cyan tint + cyan label (a cohesive chip strip)
 *   • removable (input) chip carries a trailing ✕ with its own accessible name
 *   • flash-free feedback: the fill is STATIC; hover/active animate
 *     brightness (filter) + transform only, never a fill/gradient tween
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow
 *   • NO glow / colored shadow / emission anywhere
 *
 * Styles are scoped via a `nk-chip` class injected once, so the island is
 * self-contained and does not depend on the docs theme CSS.
 */
import { useState } from 'react';
import { NockerlChip } from '@dizyx/nockerl-react';

// Demo-only scaffolding CSS. The NockerlChip recipe (.nk-chip*) now lives in the primitive
// (NOCKERL_CHIP_STYLES) and is injected by the component; what stays here is the showcase
// chrome (the row layout, eyebrow labels, and the live-count line).
const STYLES = `
.nk-chip-demo { font-family: var(--font-family-sans); }
.nk-chip-demo__row { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; }
.nk-chip-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-chip-demo__count { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-5); }
.nk-chip-demo__count b { color: var(--color-accent-primary); }
`;

const FILTERS = ['All', 'Sessions', 'Agents', 'Memory', 'Cron'];
const INITIAL_TOKENS = ['typescript', 'compose', 'swiftui'];

/**
 * The interactive showcase mounted on the NockerlChip page: a row of filter chips you
 * can toggle (cyan when selected), a strip of removable input chips each with a
 * ✕, and a disabled chip. Hover, tab, click, and remove them.
 */
export default function ChipDemo() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['Sessions']));
  const [tokens, setTokens] = useState<string[]>(INITIAL_TOKENS);
  const [removed, setRemoved] = useState(0);

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const remove = (name: string) => {
    setTokens((prev) => prev.filter((t) => t !== name));
    setRemoved((c) => c + 1);
  };

  return (
    <div className="nk-chip-demo">
      <style>{STYLES}</style>

      <p className="nk-chip-demo__lbl">Filter chips: toggle (cyan = selected)</p>
      <div className="nk-chip-demo__row">
        {FILTERS.map((name) => (
          <NockerlChip key={name} text={name} selected={selected.has(name)} onClick={() => toggle(name)} />
        ))}
      </div>

      <p className="nk-chip-demo__lbl" style={{ marginTop: 'var(--space-5)' }}>
        Filter chip with a leading status dot
      </p>
      <div className="nk-chip-demo__row">
        <NockerlChip text="Online" selected leadingIcon="dot" onClick={() => toggle('Online')} />
        <NockerlChip text="Idle" leadingIcon="dot" onClick={() => toggle('Idle')} />
      </div>

      <p className="nk-chip-demo__lbl" style={{ marginTop: 'var(--space-5)' }}>
        Removable input chips: press the ✕ (or focus it and hit Enter)
      </p>
      <div className="nk-chip-demo__row">
        {tokens.length === 0 ? (
          <span style={{ fontSize: 'var(--font-size-12)', color: 'var(--color-on-canvas-muted)' }}>All tokens removed.</span>
        ) : (
          tokens.map((name) => <NockerlChip key={name} text={name} selected onRemove={() => remove(name)} />)
        )}
      </div>

      <p className="nk-chip-demo__lbl" style={{ marginTop: 'var(--space-5)' }}>Disabled: inert, still visible</p>
      <div className="nk-chip-demo__row">
        <NockerlChip text="Locked" selected disabled />
        <NockerlChip text="Unavailable" disabled />
      </div>

      <p className="nk-chip-demo__count">
        Removed <b>{removed}</b> {removed === 1 ? 'chip' : 'chips'}. The island is live.
      </p>
    </div>
  );
}
