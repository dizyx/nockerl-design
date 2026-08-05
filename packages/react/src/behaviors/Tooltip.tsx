/**
 * NockerlTooltip is the Tier-1 TOOLTIP primitive. ONE home for the inverted hint surface,
 * the open-delay + dismiss grammar, and the anchor → flip → clamp → beak
 * positioning engine, so a future tooltip change is ONE edit, not many. Composes
 * ONLY tokens.
 *
 * A tooltip is a BRIEF, NON-INTERACTIVE text hint that appears on HOVER or
 * keyboard FOCUS of a control, after a short OPEN DELAY, and auto-dismisses on
 * leave / blur / Esc. You cannot click into it. DISTINCT from its neighbours: it
 * is NOT a rich anchored panel you tab into (`popover`), NOT a list of action
 * items (`menu`), and NOT a press-and-hold contextual pop (`long-press-pop`). A
 * tooltip names or clarifies a control: a few words, no controls, no focus of
 * its own.
 *
 * Sourced from the REAL apps (read-only). Voice (canonical, macOS): the native
 * `.help(String)` modifier IS the macOS tooltip, applied to icon-only buttons
 * (`UI/NockerlButtonStyles.swift` `NockerlIconButton.help`) and onboarding
 * controls (`OnboardingView` `.help(…)`); it carries a fixed ~2s system delay and
 * inherits the dark, high-contrast system tooltip surface (no styling hooks).
 * On Android, Material 3 `TooltipBox` + `PlainTooltip` is the intended path (not yet
 * adopted in-app; icon-only actions name themselves via `contentDescription`
 * today). PlainTooltip is high-contrast by default (`inverseSurface` /
 * `inverseOnSurface`, which the Nockerl theme maps to `onCanvas` / `canvas`), so
 * this web tooltip mirrors that: an INVERTED surface (the page's text color
 * becomes the surface; the page's background becomes the text), the one place a
 * Nockerl surface flips for maximum legibility of a transient hint.
 *
 * Laws: DEPTH = neutral tinted drop shadow + a top catch-light, NEVER a glow. The
 * ARROW/beak is the SAME inverted surface so it reads as a continuous tail off the
 * bubble. flash-free: the fill is static; only scale + opacity animate the appear,
 * and the appear FREEZES under prefers-reduced-motion (it shows in place). The
 * trigger is a real focusable control; the tip is wired via `aria-describedby`;
 * the tip itself is `role="tooltip"`, NOT focusable, with no interactive content.
 * TOKEN-REACTIVE: every color / font / radius / spacing / type is a `var(--token)`
 * (see docs/demo-token-contract.md); literals remain only for pure geometry (icon
 * px, the beak's diagonal size, transition curves).
 *
 * Headless by construction: a consumer renders its own triggers inside a contained
 * STAGE (the clamp boundary) and wires each via the `triggerProps(cfg)` the
 * render-prop hands back; the tip itself (anchor → flip → clamp → beak, the open
 * delay, the appear, Esc/leave/blur dismiss) is owned here and floats inside the
 * stage. This keeps the positioning engine in ONE place. Moving a consumer's
 * trigger markup never re-derives the machinery.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 *
 * No forwardRef (API convention §9): NockerlTooltip is headless. It returns its children
 * render-prop result (`children({ stageRef, triggerProps, tip, shows })`) and floats the
 * tip itself, so it has no DOM root of its own to forward a ref to. Deliberate exemption.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ComposeContract } from '../compose-contract.js';

// ─── Placement: the side of the trigger the tip prefers (it flips if it won't fit) ──
export type Side = 'top' | 'bottom' | 'left' | 'right';

/** The config a trigger declares (its hint text + preferred placement/sizing). */
export interface TooltipConfig {
  key: string;             // which trigger owns the open tip
  text: string;            // the (text-only) hint
  side: Side;              // preferred side (flips/clamps to fit)
  multiline: boolean;      // wrap vs. single-line
  width: number;           // max width hint (px)
}

interface OpenTip extends TooltipConfig {
  ax: number; ay: number; aw: number; ah: number;   // anchor rect, stage-local
}

/** The props a trigger spreads to wire hover/focus → show, leave/blur → hide. */
export interface NockerlTooltipTriggerProps {
  'aria-describedby': string | undefined;
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
  onFocus: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur: () => void;
}

/** What the render-prop hands a consumer to mount its own stage + triggers. */
export interface NockerlTooltipRenderArgs {
  /** Ref for the contained STAGE, the clamp boundary every tip floats inside. */
  stageRef: React.RefObject<HTMLDivElement | null>;
  /** Wire a trigger: hover + focus SHOW, leave + blur HIDE, plus aria-describedby. */
  triggerProps: (cfg: TooltipConfig) => NockerlTooltipTriggerProps;
  /**
   * The live tip element. Render it as the LAST child INSIDE the stage element
   * (so it positions + clamps against the stage, never the page). Null when nothing
   * is open. The recipe `<style>` rides with it so the CSS lands beside the stage.
   */
  tip: ReactNode;
  /** How many times a tip has opened (the live-island proof counter). */
  shows: number;
}

export interface NockerlTooltipProps {
  /** Forced placement, or `auto` to use each trigger's own preferred side. */
  place?: 'auto' | Side;
  /** Open delay in ms before a hovered/focused tip floats in (0 = instant). */
  delayMs?: number;
  /** Render the stage + triggers; receives `{ stageRef, triggerProps, shows }`. */
  children: (args: NockerlTooltipRenderArgs) => ReactNode;
}

// the TOOLTIP: an INVERTED, lit-from-above bubble (page text color becomes the
// surface; page bg becomes the text), neutral drop shadow + a top catch-light. The
// ARROW/beak wears the bubble's SAME inverted surface so it reads as a continuous
// tail off the edge. flash-free: only scale + opacity animate the appear, and it
// FREEZES (shows in place) under prefers-reduced-motion. Every visual value is a
// token; literals remain only for pure geometry (the beak's diagonal, the curves).
export const NOCKERL_TOOLTIP_STYLES = `
/* the TOOLTIP: an INVERTED, lit-from-above bubble (page text color becomes the
   surface; page bg becomes the text), neutral drop shadow + a top catch-light. */
.nk-tt-tip { position: absolute; z-index: 30; max-width: var(--nk-tt-w, var(--size-container-sm)); width: max-content; box-sizing: border-box; pointer-events: none; font-size: var(--font-size-12); font-weight: var(--font-weight-medium); line-height: var(--font-line-height-16); color: var(--color-canvas); background: var(--color-on-canvas); border-radius: var(--radius-control); padding: var(--space-1) var(--space-2); box-shadow: 0 var(--elevation-level3) 22px -10px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-sheet) * 100%), transparent), 0 var(--elevation-level1) var(--elevation-level3) -5px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent), inset 0 var(--space-px) 0 color-mix(in srgb, var(--color-surface-highlight) 60%, transparent); transform: scale(.92); opacity: 0; transform-origin: var(--nk-tt-origin, top center); transition: transform .13s var(--motion-easing-standard), opacity .1s ease; }
.nk-tt-tip[data-shown="true"] { transform: scale(1); opacity: 1; }
.nk-tt-tip--multi { white-space: normal; }
/* the ARROW/nub is a small square wearing the bubble's SAME inverted surface, so it reads as a
   continuous tail off the bubble edge (not a separate dot). : its OUTER corners (the ones
   jutting past the bubble) are softened with the small track radius so the connector no longer
   reads as a sharp square against the rounded bubble; the inner corners merge into the bubble. */
.nk-tt-arrow { position: absolute; width: 10px; height: 10px; background: var(--color-on-canvas); }
.nk-tt-tip[data-side="bottom"] .nk-tt-arrow { top: -4px; left: var(--nk-tt-arrow, 50%); margin-left: -5px; border-top-left-radius: var(--radius-track); border-top-right-radius: var(--radius-track); }
.nk-tt-tip[data-side="top"] .nk-tt-arrow { bottom: -4px; left: var(--nk-tt-arrow, 50%); margin-left: -5px; border-bottom-left-radius: var(--radius-track); border-bottom-right-radius: var(--radius-track); }
.nk-tt-tip[data-side="right"] .nk-tt-arrow { left: -4px; top: var(--nk-tt-arrow, 50%); margin-top: -5px; border-top-left-radius: var(--radius-track); border-bottom-left-radius: var(--radius-track); }
.nk-tt-tip[data-side="left"] .nk-tt-arrow { right: -4px; top: var(--nk-tt-arrow, 50%); margin-top: -5px; border-top-right-radius: var(--radius-track); border-bottom-right-radius: var(--radius-track); }

@media (prefers-reduced-motion: reduce) {
  .nk-tt-tip { transition: none; }
  .nk-tt-tip { transform: scale(1); }   /* appear in place - no scale pop */
}
`;

/**
 * The Nockerl tooltip engine, the unit the spec documents. Headless: a consumer
 * renders its own triggers inside a contained stage (via the `stageRef`) and wires
 * each with the `triggerProps(cfg)` the render-prop hands back. HOVER or
 * keyboard-FOCUS a trigger → after the open delay a brief, non-interactive bubble
 * with a beak appears, auto-positioned to flip + clamp inside the stage; it
 * dismisses on leave / blur / Esc. The tip is wired via aria-describedby, is not
 * focusable, and holds text only. Token-driven; the appear freezes under
 * reduced-motion.
 */
export function NockerlTooltip({ place = 'auto', delayMs = 600, children }: NockerlTooltipProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState<OpenTip | null>(null);
  const [shown, setShown] = useState(false);
  const [shows, setShows] = useState(0);
  const tipId = useId();

  const clearTimer = () => {
    if (timer.current !== undefined) { window.clearTimeout(timer.current); timer.current = undefined; }
  };

  // hover/focus a trigger → arm the open delay, then float the tip anchored to it.
  const show = useCallback((cfg: Omit<OpenTip, 'ax' | 'ay' | 'aw' | 'ah'>, el: HTMLElement) => {
    const stage = stageRef.current;
    if (!stage) return;
    clearTimer();
    timer.current = window.setTimeout(() => {
      const sb = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setOpen({ ...cfg, side: place === 'auto' ? cfg.side : place, ax: r.left - sb.left, ay: r.top - sb.top, aw: r.width, ah: r.height });
      setShows((n) => n + 1);
    }, delayMs);
  }, [place, delayMs]);

  // leave / blur → cancel a pending open and dismiss any shown tip.
  const hide = useCallback(() => {
    clearTimer();
    setShown(false);
    window.setTimeout(() => setOpen((o) => (o ? null : o)), 130);
  }, []);

  // Esc dismisses immediately (a tooltip is transient and never traps focus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimer(); };
  }, [hide]);

  // Mount → next frame flips "shown" (scale/opacity-in).
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // After mount: position to the chosen side of the trigger, FLIP if it would
  // overflow, CLAMP onto the stage, and center the beak on the trigger edge.
  useEffect(() => {
    if (!open || !tipRef.current || !stageRef.current) return;
    const tip = tipRef.current;
    const sb = stageRef.current.getBoundingClientRect();
    const pad = 8;       // stage inset the bubble never crosses
    const gap = 8;       // trigger ↔ bubble distance (leaves room for the beak)
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const acx = open.ax + open.aw / 2;     // anchor center x
    const acy = open.ay + open.ah / 2;     // anchor center y
    let side = open.side;

    const fits: Record<Side, boolean> = {
      top: open.ay - gap - h >= pad,
      bottom: open.ay + open.ah + gap + h <= sb.height - pad,
      left: open.ax - gap - w >= pad,
      right: open.ax + open.aw + gap + w <= sb.width - pad,
    };
    const opp: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    if (!fits[side] && fits[opp[side]]) side = opp[side];

    let left: number, top: number;
    if (side === 'top' || side === 'bottom') {
      left = acx - w / 2;                                  // center on the trigger
      top = side === 'bottom' ? open.ay + open.ah + gap : open.ay - gap - h;
    } else {
      top = acy - h / 2;
      left = side === 'right' ? open.ax + open.aw + gap : open.ax - gap - w;
    }
    // clamp onto the stage
    left = Math.min(Math.max(pad, left), sb.width - w - pad);
    top = Math.min(Math.max(pad, top), sb.height - h - pad);

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.dataset.side = side;
    // beak sits over the trigger center, even after clamping (kept off the corners)
    if (side === 'top' || side === 'bottom') {
      const ax = Math.min(Math.max(10, acx - left), w - 10);
      tip.style.setProperty('--nk-tt-arrow', `${ax}px`);
    } else {
      const ay = Math.min(Math.max(10, acy - top), h - 10);
      tip.style.setProperty('--nk-tt-arrow', `${ay}px`);
    }
    const ox = side === 'left' ? 'right' : side === 'right' ? 'left' : 'center';
    const oy = side === 'top' ? 'bottom' : side === 'bottom' ? 'top' : 'center';
    tip.style.setProperty('--nk-tt-origin', `${oy} ${ox}`);
  }, [open, place]);

  // wire a trigger: hover + focus SHOW, leave + blur HIDE, and aria-describedby
  // points at the live tip only while it owns the open tip (so SR reads it on focus).
  const triggerProps = (cfg: Omit<OpenTip, 'ax' | 'ay' | 'aw' | 'ah'>) => ({
    'aria-describedby': open?.key === cfg.key ? tipId : undefined,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(cfg, e.currentTarget),
    onMouseLeave: hide,
    onFocus: (e: React.FocusEvent<HTMLElement>) => show(cfg, e.currentTarget),
    onBlur: hide,
  });

  // The consumer drops the live tip as the LAST child INSIDE its stage, the
  // exact tree position it held before (so it positions + clamps against the stage).
  // The recipe `<style>` rides along (injected last) so the CSS lands beside it.
  const tip = (
    <>
      {/* the TOOLTIP, anchored to its trigger, flipped/clamped inside the stage, with a beak.
          role="tooltip", not focusable, text only, pointer-events: none (never steals the pointer). */}
      {open && (
        <div
          ref={tipRef} className={`nk-tt-tip${open.multiline ? ' nk-tt-tip--multi' : ''}`}
          id={tipId} role="tooltip" data-shown={shown} data-side={open.side}
          style={{ left: open.ax, top: open.ay + open.ah + 8, '--nk-tt-w': `${open.width}px` } as CSSProperties}
        >
          <span className="nk-tt-arrow" aria-hidden="true" />
          {open.text}
        </div>
      )}
      <style>{NOCKERL_TOOLTIP_STYLES}</style>
    </>
  );

  return <>{children({ stageRef, triggerProps, tip, shows })}</>;
}

// Headless HINT primitive: it renders its own tip surface (role="tooltip", not a
// facsimile) + a beak span; the consumer supplies triggers via the `triggerProps`
// render-prop (NockerlTooltip renders no trigger <button> of its own). No child design
// components live in a slot, and no facsimile tag/role is rendered → a bare leaf.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlTooltip;
