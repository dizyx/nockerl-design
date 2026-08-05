/**
 * NockerlKbd, a single RAISED KEYCAP: the dimensional key-hint chip the whole system shares
 * (CommandPalette hints + trigger, NockerlMenu / NockerlTooltip shortcut hints, Table shortcuts, any
 * "press X" legend). It replaces the flat, hand-rolled mono chips that were scattered
 * across the demos.
 *
 * THE LOOK (per the design review): a real keycap with HEIGHT, not a flat badge with a
 * thick bottom border. Depth is built the same way every other lifted surface is (the
 * lift law): a mono legend on a raised surface, a 1px TOP catch-light (the lit edge), and
 * a WEIGHTED BOTTOM built from NEUTRAL shadow, a hard-ish bottom edge (the key's side
 * wall) plus a soft ambient drop. No glow, no colored shadow, no fat border. On :active
 * the cap DEPRESSES (translateY down + the bottom weight collapses), the way a physical
 * key travels, an interpolatable transform, never a fill swap.
 *
 * Tokens-only, theme-reactive (the surface / hairline / catch-light / shadow-tint all
 * flip with the theme). Presentational chrome: it renders a real <kbd> so it is also
 * semantically a keyboard input in the a11y tree; the host still owns the accessible
 * shortcut description.
 *
 * Self-injects its recipe as the LAST child (a leading style node would trip a host's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import type { ComposeContract } from '../compose-contract.js';

export interface NockerlKbdProps extends HTMLAttributes<HTMLElement> {
  /** The key legend: a glyph or short label (e.g. the cmd glyph, K, Esc, a chevron). */
  children?: ReactNode;
}

// The raised-keycap recipe. Height + weight come from a NEUTRAL shadow stack (a hard
// bottom edge = the key's side wall + a soft ambient drop) and an inner TOP catch-light,
// never a thick bottom border. The cap is SLIGHTLY SMALLER (space-0-5 vertical
// padding, space-4 min-width, a tighter ambient drop) so its TOTAL height fits a normal
// prose line-box, so multi-line shortcut sequences no longer OVERLAP when the caps wrap
// across lines (worst on mobile / tight line-heights). font-size-12 holds for legibility.
// No backticks anywhere in here.
export const NOCKERL_KBD_STYLES = `
.nk-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: var(--space-4);
  padding: var(--space-0-5) var(--space-2);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-12);
  line-height: 1;
  color: var(--color-on-card-muted);
  background: var(--color-card-surface2);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-track);
  vertical-align: middle;
  user-select: none;
  /* the lift: a 1px TOP catch-light, a hard-ish NEUTRAL bottom edge (the key's side wall),
     and a soft ambient neutral drop beneath it. Weight lives in the shadow, not a border.
     : the ambient drop is pulled in (space-0-5 offset) so the cap's shadow no longer
     BLEEDS into the next line when a chord wraps. */
  box-shadow:
    inset 0 var(--space-px) 0 var(--color-surface-highlight),
    0 var(--space-0-5) 0 color-mix(in srgb, var(--color-shadow-tint) 42%, transparent),
    0 var(--space-0-5) var(--space-1) calc(-1 * var(--space-px)) color-mix(in srgb, var(--color-shadow-tint) 34%, transparent);
  transition: transform .08s, box-shadow .08s;
}
/* pressed: the cap travels down and the bottom weight collapses (a real key press). */
.nk-kbd:active {
  transform: translateY(var(--space-0-5));
  box-shadow:
    inset 0 var(--space-px) 0 var(--color-surface-highlight),
    0 0 0 0 transparent;
}
@media (prefers-reduced-motion: reduce) { .nk-kbd { transition: none; } }
`;

/**
 * A single raised keycap. Pass the key legend as children (a glyph or short label). For a
 * chord, render several side by side inside a flex row with a small gap.
 */
export const NockerlKbd = forwardRef<HTMLElement, NockerlKbdProps>(function NockerlKbd({ children, className, ...rest }, ref) {
  return (
    <kbd {...rest} ref={ref} className={['nk-kbd', className].filter(Boolean).join(' ')}>
      {children}
      <style>{NOCKERL_KBD_STYLES}</style>
    </kbd>
  );
});

/** LEAF: a keycap; `children` is a short legend (glyph / label), not a slot. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlKbd;
