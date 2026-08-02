/**
 * NockerlPopover: the Tier-1 anchored, NON-MODAL floating-panel primitive. ONE home for
 * the anchored-panel-with-beak surface, the flip/clamp positioning, the scale-in
 * open, the scrim outside-click, and the focus-trap + Esc keyboard model, so a
 * future popover change is ONE edit, not many. Composes ONLY tokens (and the
 * NockerlSurface primitive for the elevated panel).
 *
 * A popover is a NON-MODAL floating panel ANCHORED to a trigger that holds
 * ARBITRARY RICH CONTENT (a title, body text, fields, controls, actions) and
 * (optionally) a directional ARROW/beak pointing back at the trigger. DISTINCT
 * from its neighbours: it is NOT a list of action items (`menu`), NOT a one-line
 * hover hint (`tooltip`), NOT a press-and-hold contextual pop (`long-press-pop`),
 * and NOT a centered, ground-dimming modal (`dialog`). It opens on click/Enter,
 * positions relative to its trigger, flips/clamps to stay on-screen, and does NOT
 * dim the ground (it is non-modal, so the page stays usable).
 *
 * Sourced from the REAL apps (read-only). Voice (canonical) is
 * `UI/SettingsComponents.swift` `InfoTip`: a NockerlButton whose tap toggles a themed
 * `.popover(isPresented:arrowEdge: .bottom)` of rich `Text` content, padded, on
 * the `card2` raised surface (the literal anchored-panel-with-arrow this models).
 * Android (`core/theme/NockerlSurface.kt`) ships no popover composable yet, but
 * EXPLICITLY reserves the tier-3 lift (`NockerlElevation.Level3`) for "agent
 * cards, input bar, popovers", so the elevated-surface vocabulary
 * (`nockerlShadow` tinted drop shadow + `nockerlLitSurface` top catch-light +
 * the `cardSurface2 → cardSurface1` gradient) is the substrate the intended
 * `NockerlPopover` composes on (built on Material `Popup`). The anchor / flip /
 * clamp / scrim machinery is the shared vocabulary from MenuDemo; the panel
 * radius is the 12px panel token (NockerlPanelShape), the avatar mirrors
 * NockerlListItem's, and the field + action row reuse the field/button vocabulary.
 *
 * Laws: DEPTH = neutral tinted shadow + top catch-light, NEVER a glow. The panel
 * is an elevated card surface (card gradient + the neutral shadow token + a 1px
 * top sheen). The ARROW is the same surface + hairline, so the beak reads as part
 * of the panel, not a separate dot. flash-free: the fill is static; only
 * scale/opacity/transform animate the open, and the open FREEZES under
 * prefers-reduced-motion (it appears in place). Any cyan accent action puts
 * `--color-on-accent` on the cyan fill. TOKEN-REACTIVE: every
 * color/font/radius/spacing/type is a `var(--token)`; literals remain only for
 * pure geometry (icon px, the arrow's diagonal size, transition curves).
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 *
 * No forwardRef (API convention §9): NockerlPopover is a controller driven by an imperative
 * `handleRef` (open / close / openId), with its body supplied via `renderContent`. It
 * renders a scrim + a portalled <NockerlSurface> panel, so there is no single root DOM element to
 * forward a ref to; the imperative handle is the intended ref-like API. Deliberate.
 */
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import type { ComposeContract } from '../compose-contract';
import { NockerlSurface } from '../primitives/Surface';

// ─── Placement: the side of the trigger the panel prefers (it flips if it won't fit) ──
export type Side = 'top' | 'bottom' | 'left' | 'right';

// One opened popover: which trigger, the anchor rect (stage-local), the preferred
// side, and whether it opened via keyboard (→ focus the first field, not the panel).
export interface OpenState {
  id: string;
  side: Side;
  ax: number;
  ay: number;
  aw: number;
  ah: number;
  viaKeyboard: boolean;
}

/** Imperative handle the trigger wiring drives: open anchored to a trigger, or close. */
export interface NockerlPopoverHandle {
  /** Open anchored to a trigger (its rect is read stage-local). Keyboard open focuses inside. */
  open: (id: string, side: Side, el: HTMLElement, viaKeyboard: boolean) => void;
  /** Close the open panel; pass restore=false to skip returning focus to the trigger. */
  close: (restore?: boolean) => void;
  /** The id of the currently-open popover (or null), read by the trigger for aria-expanded. */
  openId: string | null;
}

export interface NockerlPopoverProps {
  /**
   * The element the panel is clamped INTO: anchor rects are read relative to it and
   * the panel never crosses its 10px inset. Pass the contained stage / a positioned host.
   */
  boundaryRef: RefObject<HTMLElement | null>;
  /** Render the rich body for the open popover. Receives the open id + the title id to wire `aria-labelledby`. */
  renderContent: (id: string, titleId: string) => ReactNode;
  /** Per-id panel width (the `--nk-pp-w` local). Defaults are applied by the CSS if omitted. */
  getWidth?: (id: string) => string | undefined;
  /** Show the directional arrow/beak pointing at the trigger. */
  arrow?: boolean;
  /** Force a placement, or 'auto' to prefer the side the trigger requested (still flips/clamps). */
  place?: 'auto' | Side;
  /**
   * BARE panel: padding 0, NO arrow, and NO baked `role="dialog"`. The consumer's content
   * (a listbox, a calendar grid, a time dial) owns the shell padding + its own ARIA role. For
   * anchored dropdowns / pickers that want the shared anchor→flip→clamp + outside-click + Esc
   * machinery but NOT the padded rich-panel shell. The elevated surface (lift + shadow) stays.
   */
  bare?: boolean;
  /**
   * Move focus INTO the panel on open (default true, the rich-panel contract). Set false when
   * the consumer manages its OWN initial focus: a calendar's roving `focusIdx`, or a combobox
   * that keeps focus in its external input and drives the list via `aria-activedescendant`.
   * The Tab focus-TRAP still applies once focus is inside the panel; this only governs the
   * initial focus move.
   */
  autoFocus?: boolean;
  /** Notified whenever the open id changes (null when closed). Drives trigger aria-expanded + active state. */
  onOpenChange?: (id: string | null) => void;
  /** Imperative handle so triggers can call open/close + read openId. */
  handleRef?: RefObject<NockerlPopoverHandle | null>;
}

// The POPOVER surface: an elevated, lit-from-above PANEL (card gradient + neutral shadow +
// catch-light, NO glow). NockerlSurface (variant="panel") supplies the hairline + 12px panel radius;
// the gradient fill REPLACES NockerlSurface's flat surface1 (demo-root prefixed to out-specify
// .nk-surface). The ARROW is the same surface + hairline so the beak reads as part of the
// panel. flash-free: the fill is static; only scale/opacity/transform animate the open.
// Every visual value is a token; literals remain only for pure geometry (icon px, the
// arrow's diagonal size, transition curves).
export const NOCKERL_POPOVER_STYLES = `
/* the POPOVER surface: an elevated, lit-from-above PANEL (card gradient + neutral shadow + catch-light, NO glow).
   NockerlSurface (variant="panel") supplies the hairline + 12px panel radius. The gradient fill
   REPLACES NockerlSurface's flat surface1, so it is demo-root prefixed to out-specify .nk-surface
   (injected later in the DOM). No level passed, so the panel keeps its own DRIFT shadow. */
.nk-pp-pop { position: absolute; z-index: 30; width: var(--nk-pp-w, var(--size-container-md)); color: var(--color-on-card);
  box-shadow: 0 var(--space-2) var(--elevation-level3) -8px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level3) * 100%), transparent), var(--nk-surface-sheen); padding: var(--space-4); transform: scale(.96); opacity: 0; transform-origin: var(--nk-pp-origin, top center); transition: transform .16s var(--motion-easing-standard), opacity .13s ease; }
.nk-pp-demo .nk-pp-pop { background: linear-gradient(180deg, var(--color-card-surface2), var(--color-card-surface1)); }
.nk-pp-pop[data-shown="true"] { transform: scale(1); opacity: 1; }
/* BARE: the consumer's content owns the shell padding (an edge-to-edge listbox / calendar / dial). The lift + surface stay. */
.nk-pp-pop--bare { padding: 0; }
/* the ARROW/beak is a rotated square wearing the panel's TOP surface + a hairline on its
   two OUTWARD faces, so it reads as a continuous beak off the panel edge (not a separate dot). */
.nk-pp-arrow { position: absolute; width: 12px; height: 12px; background: var(--color-card-surface2); transform: rotate(45deg); border: var(--space-px) solid var(--color-card-hairline); }
.nk-pp-pop[data-side="bottom"] .nk-pp-arrow { top: calc(-6px - var(--space-px)); left: var(--nk-pp-arrow, 50%); margin-left: -6px; border-right: 0; border-bottom: 0; }
.nk-pp-pop[data-side="top"] .nk-pp-arrow { bottom: calc(-6px - var(--space-px)); left: var(--nk-pp-arrow, 50%); margin-left: -6px; border-left: 0; border-top: 0; }
.nk-pp-pop[data-side="right"] .nk-pp-arrow { left: calc(-6px - var(--space-px)); top: var(--nk-pp-arrow, 50%); margin-top: -6px; border-right: 0; border-top: 0; }
.nk-pp-pop[data-side="left"] .nk-pp-arrow { right: calc(-6px - var(--space-px)); top: var(--nk-pp-arrow, 50%); margin-top: -6px; border-left: 0; border-bottom: 0; }

/* ── rich content blocks (free-form, the whole point of a popover) ── */
.nk-pp-title { margin: 0; font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-card); line-height: var(--font-line-height-20); }
.nk-pp-body { margin: var(--space-2) 0 0; font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); }
/* profile card header: avatar + name/role */
.nk-pp-id { display: flex; align-items: center; gap: var(--space-3); }
.nk-pp-id__face { width: var(--space-10); height: var(--space-10); flex: 0 0 auto; border-radius: var(--radius-pill); display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(150deg, var(--color-card-surface3), var(--color-card-surface2)); color: var(--color-on-card); font-size: var(--font-size-14); font-weight: var(--font-weight-bold); border: var(--space-px) solid var(--color-card-hairline); box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-pp-id__name { min-width: 0; }
.nk-pp-id__name strong { display: block; font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-card); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nk-pp-id__name span { display: block; font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-pp-meta { display: flex; gap: var(--space-4); margin-top: var(--space-3); padding-top: var(--space-3); border-top: var(--space-px) solid var(--color-card-hairline); }
.nk-pp-meta div { font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-pp-meta b { display: block; font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-card); }
/* a text LINK action (the profile card's tail) */
.nk-pp-link { display: inline-flex; align-items: center; gap: var(--space-1); margin-top: var(--space-3); font: inherit; font-size: var(--font-size-12); font-weight: var(--font-weight-semibold); color: var(--color-accent-primary); background: transparent; border: 0; padding: 0; cursor: pointer; }
.nk-pp-link:hover { text-decoration: underline; }
.nk-pp-link:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); border-radius: var(--radius-track); }
.nk-pp-link svg { display: block; width: 14px; height: 14px; }
/* a recessed FIELD (fields SINK: inner shadow, darker well) */
.nk-pp-field { width: 100%; box-sizing: border-box; margin-top: var(--space-3); font: inherit; font-size: var(--font-size-14); color: var(--color-on-card); background: var(--color-canvas-alt); border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-control); padding: var(--space-2) var(--space-3); box-shadow: inset 0 var(--space-px) var(--elevation-level1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent); transition: border-color .12s, box-shadow .12s; }
.nk-pp-field::placeholder { color: var(--color-on-card-muted); }
.nk-pp-field:focus { outline: none; }
.nk-pp-field:focus-visible { border-color: color-mix(in srgb, var(--color-accent-primary) 60%, transparent); box-shadow: inset 0 var(--space-px) var(--elevation-level1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), 0 0 0 var(--space-0-5) var(--color-accent-primary); }
/* a checkable filter ROW, a flat row inside the panel (depth lives in the panel) */
.nk-pp-check { width: 100%; display: flex; align-items: center; gap: var(--space-2); font: inherit; font-size: var(--font-size-14); font-weight: var(--font-weight-medium); text-align: left; cursor: pointer; color: var(--color-on-card); background: transparent; border: 0; border-radius: var(--radius-control); padding: var(--space-2); min-height: calc(var(--space-8) + var(--space-1)); transition: background-color .1s; }
.nk-pp-check:hover { background: color-mix(in srgb, var(--color-on-card) 6%, transparent); }
.nk-pp-check:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(-1 * var(--space-0-5)); }
.nk-pp-check__box { flex: 0 0 auto; width: 18px; height: 18px; border-radius: var(--radius-track); border: var(--space-px) solid var(--color-divider); display: inline-flex; align-items: center; justify-content: center; color: var(--color-on-accent); background: var(--color-canvas-alt); box-shadow: inset 0 var(--space-px) var(--space-px) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent); transition: background-color .12s, border-color .12s; }
.nk-pp-check[aria-checked="true"] .nk-pp-check__box { background: var(--color-accent-primary); border-color: var(--color-accent-primary); box-shadow: none; }
.nk-pp-check__box svg { display: block; width: 13px; height: 13px; opacity: 0; }
.nk-pp-check[aria-checked="true"] .nk-pp-check__box svg { opacity: 1; }
.nk-pp-check__lbl { flex: 1 1 auto; min-width: 0; }
.nk-pp-check__count { flex: 0 0 auto; font-family: var(--font-family-mono); font-size: var(--font-size-12); color: var(--color-on-card-muted); }
/* the ACTION ROW is right-aligned (the confirm convention) */
.nk-pp-actions { display: flex; justify-content: flex-end; align-items: center; gap: var(--space-2); margin-top: var(--space-4); }
.nk-pp-actions--split { justify-content: space-between; }
.nk-pp-btn { font: inherit; font-size: var(--font-size-12); font-weight: var(--font-weight-light); text-transform: uppercase; letter-spacing: var(--font-tracking-tight); cursor: pointer; border: var(--space-px) solid transparent; border-radius: var(--radius-control); padding: var(--space-1) var(--space-3); min-height: var(--space-8); transition: filter .12s, transform .12s var(--motion-easing-standard), background-color .12s; }
.nk-pp-btn:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
.nk-pp-btn:active { transform: scale(.98); }
.nk-pp-btn--ghost { background: transparent; color: var(--color-on-card-muted); }
.nk-pp-btn--ghost:hover { background: color-mix(in srgb, var(--color-on-card) 7%, transparent); color: var(--color-on-card); }
.nk-pp-btn--primary { background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary)); color: var(--color-on-accent); box-shadow: 0 var(--elevation-level1) var(--elevation-level3) -5px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-pp-btn--primary:hover { filter: brightness(1.06); }
.nk-pp-sectionlbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-1); }

/* SCRIM: invisible click-catcher that closes on an outside click (NO dim; a popover is non-modal). */
.nk-pp-scrim { position: absolute; inset: 0; z-index: 20; border: 0; padding: 0; margin: 0; background: transparent; cursor: default; }
@media (prefers-reduced-motion: reduce) {
  .nk-pp-pop, .nk-pp-btn, .nk-pp-check, .nk-pp-field { transition: none; }
  .nk-pp-pop { transform: scale(1); }   /* appear in place, no scale pop */
}
`;

/**
 * One Nockerl popover overlay, the unit the spec documents. A NON-MODAL panel
 * anchored to a trigger that holds arbitrary rich content with an optional beak;
 * it scales in, flips + clamps to stay inside the boundary, traps focus while open,
 * and closes on Esc or an outside click (no ground dim). Drive it through the
 * imperative handle: a trigger calls `open(id, side, el, viaKeyboard)`; the panel
 * positions itself relative to that trigger inside `boundaryRef`. The open freezes
 * under reduced-motion. Token-driven throughout.
 */
export function NockerlPopover({
  boundaryRef,
  renderContent,
  getWidth,
  arrow = true,
  place = 'auto',
  bare = false,
  autoFocus = true,
  onOpenChange,
  handleRef,
}: NockerlPopoverProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLElement | null>>({});
  const [open, setOpen] = useState<OpenState | null>(null);
  const [shown, setShown] = useState(false);
  const titleId = useId();

  const close = useCallback((restore = true) => {
    setShown(false);
    const t = open ? triggerRefs.current[open.id] : null;
    if (restore && t) window.setTimeout(() => t.focus(), 0);
    window.setTimeout(() => setOpen(null), 160);
  }, [open]);

  // Open anchored to a trigger (its rect, stage-local). Keyboard open focuses inside.
  const openPop = useCallback((id: string, side: Side, el: HTMLElement, viaKeyboard: boolean) => {
    const stage = boundaryRef.current;
    if (!stage) return;
    const sb = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    triggerRefs.current[id] = el;
    setOpen({ id, side, ax: r.left - sb.left, ay: r.top - sb.top, aw: r.width, ah: r.height, viaKeyboard });
  }, [boundaryRef]);

  // Expose the open/close intent + current open id so the demo's triggers can drive
  // this overlay AND read which id is open (for aria-expanded). The machinery stays here.
  useImperativeHandle(handleRef, () => ({ open: openPop, close, openId: open ? open.id : null }), [openPop, close, open]);

  // Notify the host when the open id changes (trigger aria-expanded + active state).
  useEffect(() => { onOpenChange?.(open ? open.id : null); }, [open, onOpenChange]);

  // Mount → next frame flips "shown" (scale-in).
  useEffect(() => {
    if (!open) return;
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [open]);

  // Esc closes from ANYWHERE while open. The panel's onKeyDown only sees Esc when focus is INSIDE
  // the panel, but an autoFocus={false} consumer (a calendar / dial picker) keeps focus on its
  // trigger, so we also listen at the document level. onPopKey stops propagation when focus IS in
  // the panel, so this never double-fires.
  useEffect(() => {
    if (!open) return;
    const onDocKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onDocKey);
    return () => document.removeEventListener('keydown', onDocKey);
  }, [open, close]);

  // After mount: position to the chosen side of the trigger, then FLIP to the
  // opposite side if it would overflow, CLAMP onto the stage, and align the arrow
  // to the trigger's center along the shared edge.
  useEffect(() => {
    if (!open || !popRef.current || !boundaryRef.current) return;
    const pop = popRef.current;
    const sb = boundaryRef.current.getBoundingClientRect();
    const pad = 10;        // stage inset the panel never crosses
    const gap = 12;        // trigger ↔ panel distance (leaves room for the beak)
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const acx = open.ax + open.aw / 2;     // anchor center x
    const acy = open.ay + open.ah / 2;     // anchor center y
    let side = open.side;

    // flip if the preferred side doesn't fit; fall back to the side with more room
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
      left = acx - w / 2;                                   // center on the trigger
      top = side === 'bottom' ? open.ay + open.ah + gap : open.ay - gap - h;
    } else {
      top = acy - h / 2;
      left = side === 'right' ? open.ax + open.aw + gap : open.ax - gap - w;
    }
    // clamp onto the stage
    left = Math.min(Math.max(pad, left), sb.width - w - pad);
    top = Math.min(Math.max(pad, top), sb.height - h - pad);

    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    pop.dataset.side = side;
    // arrow sits over the trigger center, even after clamping (kept off the rounded corners)
    if (side === 'top' || side === 'bottom') {
      const ax = Math.min(Math.max(14, acx - left), w - 14);
      pop.style.setProperty('--nk-pp-arrow', `${ax}px`);
    } else {
      const ay = Math.min(Math.max(14, acy - top), h - 14);
      pop.style.setProperty('--nk-pp-arrow', `${ay}px`);
    }
    const ox = side === 'left' ? 'right' : side === 'right' ? 'left' : 'center';
    const oy = side === 'top' ? 'bottom' : side === 'bottom' ? 'top' : 'center';
    pop.style.setProperty('--nk-pp-origin', `${oy} ${ox}`);

    // move focus INTO the panel (unless the consumer owns its own initial focus): first field
    // on keyboard-open, else the panel itself.
    if (autoFocus) {
      if (open.viaKeyboard) pop.querySelector<HTMLElement>('input, button, [tabindex]')?.focus();
      else pop.focus();
    }
  }, [open, arrow, place, boundaryRef, autoFocus]);

  // focus TRAP + Esc: keep Tab inside the open panel; Esc closes and restores focus.
  const onPopKey = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab' || !popRef.current) return;
    const f = Array.from(popRef.current.querySelectorAll<HTMLElement>(
      'input, button, [href], [tabindex]:not([tabindex="-1"])',
    )).filter((el) => !el.hasAttribute('disabled'));
    if (f.length === 0) return;
    const first = f[0]!, lastEl = f[f.length - 1]!;
    const act = document.activeElement;
    if (e.shiftKey && (act === first || act === popRef.current)) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && act === lastEl) { e.preventDefault(); first.focus(); }
  }, [open, close]);

  return (
    <>
      {/* invisible outside-click catcher (a popover is non-modal, so NO dim) */}
      {open && (
        <button type="button" className="nk-pp-scrim" tabIndex={-1} aria-hidden="true"
          onPointerDown={(e) => e.preventDefault()} onClick={() => close()} />
      )}

      {/* the POPOVER, anchored to its trigger, flipped/clamped inside the stage, with a beak */}
      {open && (
        <NockerlSurface
          variant="panel"
          ref={popRef} className={`nk-pp-pop${bare ? ' nk-pp-pop--bare' : ''}`} data-shown={shown} data-side={open.side}
          {...(bare ? {} : { role: 'dialog', 'aria-modal': 'false' as const, 'aria-labelledby': titleId })}
          tabIndex={-1}
          onKeyDown={onPopKey}
          style={{ left: open.ax, top: open.ay + open.ah + 12, '--nk-pp-w': getWidth?.(open.id) } as CSSProperties}
        >
          {arrow && !bare && <span className="nk-pp-arrow" aria-hidden="true" />}
          {renderContent(open.id, titleId)}
        </NockerlSurface>
      )}
      <style>{NOCKERL_POPOVER_STYLES}</style>
    </>
  );
}

// The anchored NON-MODAL panel primitive. It OWNS the outside-click SCRIM it renders
// as a raw <button> (its own dismiss control). Its rich body arrives through the
// `renderContent(id, titleId)` render-prop (+ imperative handle). NockerlPopover has no JSX
// `children` or named ReactNode content prop the graph can map to a slot, so it is a
// leaf that owns its scrim, not a slotted container. (The elevated panel is a composed
// <NockerlSurface>, already an approved child.)
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default NockerlPopover;
