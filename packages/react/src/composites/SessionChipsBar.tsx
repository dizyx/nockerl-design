/**
 * NockerlSessionChipsBar: the floating SESSION CHIPS BAR container, promoted from the
 * site-side FloatingPills canon (WS3 · task 2654; design signed-off-grade, move
 * mechanical). Sourced faithfully from Android's `chat/ui/SessionChipsBar.kt`: a flat
 * horizontal scroller of session keycaps + a trailing cyan "+" CTA, floating over the
 * chat feed.
 *
 * The bar owns exactly the FLOAT-CHROME grammar:
 *   • a lifted opaque chrome pill-track: neutral drop shadow + top catch-light;
 *   • design-laws §2: the floating CONTAINER carries the signature thick accent
 *     border (`--border-width-floating`, the web echo of native ChatInputBar's
 *     BorderStroke). The border rides the container ONLY; child keycaps keep their
 *     own treatment;
 *   • a SCROLL-AWARE edge fade: the ends fade (scrim mask) only while that side has
 *     hidden content, never hard-clip;
 *   • the optional trailing "+" CTA: the real NockerlIconButton (filled-circle) on the
 *     session-chip fill, rendered only when `onAdd` is given.
 *
 * POSITIONING IS HOST-OWNED: the bar is the pill-track itself. The host places it
 * (absolutely, over a feed, top or bottom) exactly like native. Children are
 * NockerlSessionChip keycaps (or any pill-shaped control).
 *
 * TOKEN-REACTIVE; literals are pure geometry / transition curves / the mask alpha
 * channel. No backticks in STYLES.
 */
import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { NockerlIconButton } from '../primitives/IconButton.js';
import { NockerlIcon } from '../primitives/Icon.js';
import type { ComposeContract } from '../compose-contract.js';

const IconPlus = <NockerlIcon path="M12 5v14M5 12h14" />;

// The horizontal scroller's edge fade is SCROLL-AWARE: a side only fades when it has
// hidden content. We set --fade-l / --fade-r on the scroller (consumed by the mask)
// to 0px at the true start/end, else the fade width (--space-5). Recompute on scroll
// and resize (ResizeObserver).
const FADE_WIDTH = 'var(--space-5)';

// Everything floating is the reserved PILL. Depth is a neutral drop shadow + a top
// catch-light; feedback animates brightness/transform/shadow only. All values are
// tokens; literals are pure geometry / transition curves.
export const NOCKERL_SESSION_CHIPS_BAR_STYLES = `
/* The hovering container is a lifted opaque pill-track: catch-light on top, a
   neutral drop shadow below, so it reads as floating off the darker feed. */
.nk-scb {
  pointer-events: auto; position: relative; max-width: 100%; padding: var(--space-2);
  display: flex; align-items: center; border-radius: var(--radius-pill);
  background: var(--color-chrome-surface);
  /* Per design-laws §2, the floating pill CONTAINER carries the signature THICK cyan border:
     the ratified --border-width-floating token (1.5px, the web echo of native ChatInputBar's
     BorderStroke(NockerlFloatingBorderWidth, accent)). The border rides the CONTAINER only;
     the child keycaps inside keep their own treatment. Do NOT border every child. */
  border: var(--border-width-floating) solid var(--color-accent-primary);
  box-shadow: 0 var(--elevation-level3) 22px -8px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}

/* The horizontal scroller inside the bar: pills overflow and the ends FADE
   (a scrim mask), never hard-clip. A consistent gap between pills. The fade is
   SCROLL-AWARE: a JS handler sets --fade-l / --fade-r to 0px at the true start/end
   so pills fully in view at an edge are NOT faded, and to the fade width otherwise.
   (The #000 here is the mask ALPHA channel, not a brand color, so the literal is sanctioned.) */
.nk-scb__scroll {
  display: flex; align-items: center; gap: var(--space-2); padding: var(--space-5) var(--space-1);
  margin: calc(-1 * var(--space-5)) 0; scrollbar-width: none; scroll-behavior: smooth;
  overflow-x: auto;
  /* overflow-x:auto forces the block axis to a clip too (CSS spec), so the caps'
     drop shadow + 1px hover-lift would be cut top/bottom. Give the scroller a
     vertical safe-area (--space-5, clears the active cap's ~level3 shadow + lift)
     and pull it back with a negative margin so the bar's own height is unchanged. */
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 var(--fade-l, 0px), #000 calc(100% - var(--fade-r, 0px)), transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 var(--fade-l, 0px), #000 calc(100% - var(--fade-r, 0px)), transparent 100%);
}
.nk-scb__scroll::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: reduce) { .nk-scb__scroll { scroll-behavior: auto; } }
`;

export interface NockerlSessionChipsBarProps {
  /** The keycaps: NockerlSessionChip children, rendered inside the fading scroller. */
  children: ReactNode;
  /** Renders the trailing cyan "+" CTA (the real NockerlIconButton filled-circle) and wires it. */
  onAdd?: (() => void) | undefined;
  /** Accessible label for the "+" CTA. */
  addLabel?: string;
  /** Accessible name for the bar (role="group"). */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * The floating session-chips bar: a lifted chrome pill-track (§2 floating accent
 * border) holding a scroll-fading row of session keycaps + an optional trailing "+"
 * CTA. Place it (absolutely, over the feed) from the host. Positioning is host-owned.
 */
export function NockerlSessionChipsBar({ children, onAdd, addLabel = 'New session', ariaLabel = 'Sessions', className, style }: NockerlSessionChipsBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const sync = () => {
      const atStart = el.scrollLeft <= 1;
      const atEnd = el.scrollWidth - el.scrollLeft - el.clientWidth <= 1;
      el.style.setProperty('--fade-l', atStart ? '0px' : FADE_WIDTH);
      el.style.setProperty('--fade-r', atEnd ? '0px' : FADE_WIDTH);
    };
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', sync);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={['nk-scb', className].filter(Boolean).join(' ')} style={style} role="group" aria-label={ariaLabel}>
      <div className="nk-scb__scroll" ref={scrollRef}>
        {children}
      </div>
      {onAdd && (
        /* the "+" CTA is the real NockerlIconButton (filled-circle): a solid session-chip
           circle, tinted via the accent prop; it owns its own press/focus recipe.
           flex-shrink:0 is required. The bar is a tight flex row; without it the 40px circle
           compresses horizontally into an oval (). Keep it square. */
        <NockerlIconButton
          variant="filled-circle"
          accent="var(--color-session-chip-active)"
          icon={IconPlus}
          label={addLabel}
          size={40}
          style={{ marginLeft: 'var(--space-1)', flexShrink: 0 }}
          onClick={onAdd}
        />
      )}
      <style>{NOCKERL_SESSION_CHIPS_BAR_STYLES}</style>
    </div>
  );
}

// CONTAINER: the default slot holds the session keycaps. The trailing "+" CTA is a
// composed real NockerlIconButton (never a hand-rolled circle).
export const compose = {
  slots: {
    default: { accepts: ['NockerlSessionChip'], required: true },
  },
} satisfies ComposeContract;

export default NockerlSessionChipsBar;
