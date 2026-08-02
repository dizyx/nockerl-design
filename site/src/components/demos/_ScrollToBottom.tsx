/**
 * _ScrollToBottom: the FIRST-CLASS "jump to newest" affordance. A circular pill that
 * floats over a scrolling feed and, when tapped, snaps the feed to the bottom. It shows
 * only while the feed is scrolled UP, and carries an optional unread COUNT badge.
 *
 * Extracted from FloatingPillsDemo (Dashboard) so the scroll-down is ONE owned
 * component, not a hand-rolled one-off buried in the pills island. Sourced from the
 * real Android `ChatScreen.kt` scroll-to-bottom FAB (a corner-pinned circle over the
 * feed with an unread count).
 *
 * FLOATING-OVER-CONTENT (design-laws §2): this element is fixed/absolute over a
 * scrollable area, so it carries the signature THICK CYAN BORDER: `1.5px` full accent,
 * the web echo of the native `ChatInputBar`'s `BorderStroke(NockerlFloatingBorderWidth,
 * accent)` (1.5dp). The border trains the eye that *a thick cyan edge = a layer hovering
 * above content*. The circle itself IS the floating element (no child pills), so the
 * border rides it directly. Depth is a neutral drop shadow + top catch-light (lift, no
 * glow / colored shadow); the cyan down-arrow + accent border are the only brand color.
 *
 * TOKEN-REACTIVE: every color / radius / spacing / shadow is a `var(--token)`
 * (docs/demo-token-contract.md); the only literals are pure geometry (circle / arrow /
 * badge-offset sizes, the 1.5px floating-border width) + transition curves.
 *
 * NOTE (compose contract): renders a real <button>, so it DECLARES `owns: ['button']`.
 * The scroll-to-bottom key is its own leaf identity (a lifted circle + count badge that
 * neither NockerlIconButton nor Fab expresses: no badge slot, and it is the §2 floating
 * signature, not a solid-accent FAB).
 */
import type { CSSProperties } from 'react';
import { NockerlIcon, type ComposeContract } from '@dizyx/nockerl-react';

// The canonical scroll-down glyph: a down arrow (currentColor → tints to the accent).
const IconArrowDown = <NockerlIcon path="M12 5v14M19 12l-7 7-7-7" />;

// Everything here is the floating scroll-to-bottom KEY. Depth is a neutral drop shadow +
// a top catch-light; the §2 signature cyan edge marks it as a floating layer. All colors
// are tokens; literals are pure geometry (circle / arrow / badge) + transition curves.
export const SCROLL_TO_BOTTOM_STYLES = `
.nk-s2b {
  pointer-events: auto; position: relative; display: inline-flex; align-items: center; justify-content: center;
  width: var(--space-12); height: var(--space-12); border-radius: var(--radius-pill); cursor: pointer;
  color: var(--color-accent-primary); background: var(--color-chrome-surface);
  /* design-laws §2, the signature THICK cyan floating border: the ratified
     --border-width-floating token (1.5px, the web echo of native ChatInputBar's
     BorderStroke(NockerlFloatingBorderWidth, accent)) in the full accent. */
  border: var(--border-width-floating) solid var(--color-accent-primary);
  box-shadow: 0 var(--elevation-level3) 20px -7px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  transition: transform .16s cubic-bezier(.2,0,0,1), filter .16s, opacity .2s;
}
.nk-s2b svg { width: 22px; height: 22px; }
.nk-s2b:hover { filter: brightness(1.08); transform: translateY(-1px); }
.nk-s2b:active { transform: scale(.94); }
.nk-s2b:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
.nk-s2b[hidden] { display: none; }
/* the unread COUNT badge riding the key: a status overlay, not a glow */
.nk-s2b__badge {
  position: absolute; top: -2px; right: -2px;
  min-width: var(--space-4); height: var(--space-4); padding: 0 var(--space-1);
  border-radius: var(--radius-pill); background: var(--color-dot-unread); color: var(--color-on-accent);
  font-size: var(--font-size-10); font-weight: var(--font-weight-bold);
  line-height: var(--space-4); text-align: center;
  border: var(--space-px) solid var(--color-chrome-surface);
}
@media (prefers-reduced-motion: reduce) { .nk-s2b { transition: none; } }
`;

// Renders a real <button>; declare it as the key's OWN leaf identity (a lifted circle +
// unread-count badge overlay that neither NockerlIconButton nor Fab expresses).
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

/**
 * The scroll-to-bottom key. `count` (when > 0) renders the unread badge and folds into
 * the accessible name; `hidden` removes it (the feed is at the bottom). Everything else
 * (position, when to show) is the consumer's, so the key stays a pure leaf.
 */
export function ScrollToBottom({
  onClick,
  count,
  hidden,
  label = 'Scroll to bottom',
  className,
  style,
}: {
  onClick?: () => void;
  /** Unread count → renders the badge + names the button; omit / 0 = no badge. */
  count?: number;
  /** Hide the key (feed is at the bottom). */
  hidden?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const hasCount = count != null && count > 0;
  const aria = hasCount ? `${label}, ${count} new ${count === 1 ? 'message' : 'messages'}` : label;
  return (
    <button
      type="button"
      className={`nk-s2b${className ? ` ${className}` : ''}`}
      style={style}
      aria-label={aria}
      hidden={hidden}
      onClick={onClick}
    >
      {IconArrowDown}
      {hasCount && (
        <span className="nk-s2b__badge" aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  );
}
