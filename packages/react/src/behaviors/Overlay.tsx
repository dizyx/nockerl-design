/**
 * NockerlOverlay: the Tier-2 MODAL-overlay shell primitive. ONE home for the machinery that
 * Dialog / Drawer(modal) / BottomSheet hand-rolled three times: the flat dimming SCRIM,
 * the mount -> next-frame "shown" -> (close) fade-out -> unmount lifecycle, the FOCUS
 * TRAP (Tab cycles within the panel) + Esc-to-dismiss, the initial focus move, and the
 * stage-gating so a contained demo overlay never escapes its stage. Composes ONLY tokens.
 *
 * What NockerlOverlay OWNS (identical across every modal): the scrim (flat --color-scrim dim,
 * opacity-only fade, NEVER a blur/glow), the open/close LIFECYCLE, the focus TRAP + Esc,
 * the initial focus, aria plumbing hooks, and the reduced-motion freeze of the scrim.
 *
 * What the CONSUMER owns (the divergence the system HAS): the PANEL element + its
 * positioning (centered card / bottom sheet / side drawer) and its ENTER TRANSFORM
 * (scale+opacity / slideY / slideX), kept in the consumer's own panel CSS, keyed off the
 * `data-shown` the NockerlOverlay hands back. The consumer also supplies role/aria-modal/
 * aria-labelledby on its panel, restores focus to the trigger in its own close handler,
 * and adds any consumer-specific keys (e.g. Dialog's Enter=confirm) via `onKeyDown`.
 *
 * Render-prop API: `children` receives { shown, panelRef, panelProps }. Spread
 * `panelProps` (data-shown + tabIndex + the trap onKeyDown) onto the panel and put
 * `ref={panelRef}` on it so the trap + initial focus can find the focusables inside.
 *
 * No forwardRef (API convention §9): NockerlOverlay is a controller. It renders a scrim + wrap
 * while the consumer supplies the panel via the render-prop (and receives `panelRef`), so
 * there is no single root element a forwarded ref could point to. Deliberate exemption.
 *
 * Laws: the scrim is a flat palette dim (NO blur halo, NO glow); motion animates
 * transform/opacity only (the consumer's panel), the fill never tweens; reduced-motion
 * makes the scrim appear in place. Every value is a token.
 *
 * Injects the recipe CSS as the LAST child; identical injected blocks dedupe in effect.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from 'react';
import type { ComposeContract } from '../compose-contract.js';

/** Where the panel sits in the stage. Sets the wrap layout; the consumer's CSS supplies the matching enter transform. */
export type NockerlOverlayPlacement = 'center' | 'bottom' | 'left' | 'right';

/** What the render-prop hands the consumer to wire onto its panel. */
export interface NockerlOverlayRenderApi {
  /** True once mounted + the next frame has flipped (drives the panel's enter transform). */
  shown: boolean;
  /** Put on the panel element so the trap + initial-focus can query the focusables inside. */
  panelRef: RefObject<HTMLElement | null>;
  /** Spread onto the panel: the data-shown flag, a -1 tabindex fallback target, and the trap keydown. */
  panelProps: {
    'data-shown': boolean;
    tabIndex: number;
    onKeyDown: (e: ReactKeyboardEvent) => void;
  };
}

export interface NockerlOverlayProps {
  /** Whether the overlay is presented. */
  open: boolean;
  /** Dismiss handler: scrim tap + Esc call this; the consumer typically also restores trigger focus here. */
  onDismiss: () => void;
  /** The contained stage element, which gates rendering so the overlay never escapes it (pass the demo stage). */
  stage: HTMLElement | null;
  /** Panel position + which wrap layout to use. Default 'center'. */
  placement?: NockerlOverlayPlacement;
  /** ms the exit animation runs before unmount (match the panel's transition). Default 240. */
  closeDurationMs?: number;
  /**
   * Consumer keydown (e.g. Dialog's Enter=confirm). Runs BEFORE the built-in Esc/Tab
   * trap; call e.preventDefault() in it to stop the trap from also acting on that key.
   */
  onKeyDown?: (e: ReactKeyboardEvent) => void;
  /** CSS selector for the preferred initial focus target inside the panel (e.g. a field). */
  initialFocus?: string;
  /** Explicit initial focus target (used when the selector matches nothing, e.g. a confirm button ref). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Accessible name for the scrim dismiss button. Default 'Dismiss'. */
  scrimLabel?: string;
  /** false = a transparent (non-dimming) click-catcher instead of the modal dim. Default true. */
  dim?: boolean;
  /** Render the panel; receives the wiring api. */
  children: (api: NockerlOverlayRenderApi) => ReactNode;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// NockerlOverlay owns the scrim + the centering/edge WRAP; the panel + its enter transform live
// in the consumer's CSS (keyed off data-shown). The scrim is a flat dim, opacity only.
export const NOCKERL_OVERLAY_STYLES = `
/* SCRIM: a flat palette dim (never a blur halo / glow). Fades opacity only. */
.nk-ov-scrim { position: absolute; inset: 0; z-index: 5; border: 0; padding: 0; margin: 0; cursor: pointer;
  background: var(--color-scrim); opacity: 0; transition: opacity .24s var(--motion-easing-standard); }
.nk-ov-scrim--clear { background: transparent; cursor: default; }
.nk-ov-scrim[data-shown="true"] { opacity: 1; }
/* WRAP: positions the panel inside the stage; clicks pass through to the scrim (the panel re-enables pointer events). */
.nk-ov-wrap { position: absolute; inset: 0; z-index: 6; display: flex; pointer-events: none; }
.nk-ov-wrap > * { pointer-events: auto; }
.nk-ov-wrap--center { align-items: center; justify-content: center; padding: var(--space-5); }
.nk-ov-wrap--bottom { align-items: flex-end; justify-content: center; }
.nk-ov-wrap--left { align-items: stretch; justify-content: flex-start; }
.nk-ov-wrap--right { align-items: stretch; justify-content: flex-end; }
@media (prefers-reduced-motion: reduce) { .nk-ov-scrim { transition: none; } }
`;

/**
 * The shared modal-overlay shell: scrim + lifecycle + focus-trap + Esc + initial focus,
 * with the panel supplied by the consumer via the render-prop. Gated by `stage` so a
 * contained demo overlay stays inside its stage. Reduced-motion freezes the scrim fade.
 */
export function NockerlOverlay({
  open,
  onDismiss,
  stage,
  placement = 'center',
  closeDurationMs = 240,
  onKeyDown,
  initialFocus,
  initialFocusRef,
  scrimLabel = 'Dismiss',
  dim = true,
  children,
}: NockerlOverlayProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  // Mount -> next frame flips "shown" (the consumer's panel animates in); on close, drop
  // "shown" then unmount after the exit animation.
  useEffect(() => {
    if (open) {
      setMounted(true);
      const r = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(r);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), closeDurationMs);
    return () => clearTimeout(t);
  }, [open, closeDurationMs]);

  // Move focus INTO the panel once shown: the preferred selector (e.g. a field), else the
  // explicit ref (e.g. a confirm button), else the panel itself (role=dialog, tabIndex -1).
  //
  // NEVER on the INITIAL mount of an already-open overlay. A demo (or a route that is itself
  // a modal) can mount with open=true; moving focus on first paint throws a :focus-visible
  // ring onto a control the user never touched (Chromium DOES apply :focus-visible to a
  // programmatic focus here, even on a tabIndex=-1 container; the page must load calm).
  // We skip focus for exactly that mount-open case; every genuine user open (a false -> true
  // transition) still moves focus in normally, preserving the dialog focus contract.
  const skipMountFocusRef = useRef(open);
  useEffect(() => {
    if (!shown || !panelRef.current) return;
    if (skipMountFocusRef.current) {
      skipMountFocusRef.current = false;
      return;
    }
    const panel = panelRef.current;
    const target =
      (initialFocus ? panel.querySelector<HTMLElement>(initialFocus) : null) ??
      initialFocusRef?.current ??
      panel;
    // preventScroll: moving focus INTO the panel must NOT scroll an ancestor to reveal the
    // target. A panel anchored to a far edge (esp. a RIGHT drawer, whose focusables sit toward
    // the right/bottom) would otherwise make the browser jump the page to bring it into view,
    // the "open makes the background shift/shake" defect. The panel is already positioned; the
    // scrim covers the page; nothing needs scrolling. (Tab-trap focus below keeps default scroll.)
    target.focus({ preventScroll: true });
  }, [shown, initialFocus, initialFocusRef]);

  // The panel keydown: let the consumer act first (Enter=confirm etc.); if it did not
  // consume the event, run the built-in Esc-dismiss + Tab focus-trap.
  const trapKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onDismiss();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onKeyDown, onDismiss],
  );

  if (!mounted || !stage) return null;

  return (
    <>
      <button
        type="button"
        className={`nk-ov-scrim${dim ? '' : ' nk-ov-scrim--clear'}`}
        data-shown={shown}
        aria-label={scrimLabel}
        tabIndex={-1}
        onClick={onDismiss}
      />
      <div className={`nk-ov-wrap nk-ov-wrap--${placement}`}>
        {children({ shown, panelRef, panelProps: { 'data-shown': shown, tabIndex: -1, onKeyDown: trapKeyDown } })}
      </div>
      <style>{NOCKERL_OVERLAY_STYLES}</style>
    </>
  );
}

// The modal-shell CONTAINER. Its `children` render-prop returns the PANEL: arbitrary
// component content (any Dialog / Drawer / BottomSheet body), so `default` accepts '*'
// (its consumers restate it required at their own tier). It OWNS the dimming SCRIM it
// renders as a raw <button> (the tap-to-dismiss control); the panel + its enter transform
// belong to the consumer.
export const compose = {
  slots: { default: { accepts: '*' } },
  owns: ['button'],
} satisfies ComposeContract;

export default NockerlOverlay;
