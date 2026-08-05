/**
 * NockerlDrawer: the Tier-3 EDGE-ANCHORED side-panel composite. ONE home for the panel that
 * slides HORIZONTALLY from the LEFT or RIGHT vertical edge, distinct from its catalog
 * siblings: NockerlBottomSheet rises from the BOTTOM (grip, mobile), NockerlDialog is a CENTERED
 * card (confirms / short forms), and app-shell / sidebar are the PERMANENT rail. A drawer is
 * an OVERLAY (or push panel) that opens + closes. Two shipped roles: LEFT = a navigation
 * drawer (brand header → nav list, selected = cyan); RIGHT = an inspector / detail drawer
 * (header → detail content → action row). Two modes: MODAL (floats over a flat scrim, traps
 * focus) vs INLINE / PUSH (no scrim; the panel shoulders the app aside, app stays live).
 *
 * The MODAL panel COMPOSES the shared NockerlOverlay primitive: the flat scrim, the
 * mount -> shown -> unmount lifecycle, the focus TRAP + Esc, and the initial focus are
 * NockerlOverlay's; this composite keeps only the edge-anchored panel + its slide-X transform
 * (keyed off the data-shown NockerlOverlay hands back) + the edge positioning CSS. The
 * INLINE / PUSH panel does NOT go through NockerlOverlay: no scrim, no trap, the app stays
 * interactive. It keeps its own light mount/slide lifecycle and renders as a live region.
 * It also composes NockerlIconButton (close). The header title/subtitle are plain text.
 *
 * Design laws encoded here (do not re-derive in a demo): the panel GROUND is the cardAlt →
 * canvasAlt gradient (the alternate plane), one solid surface that LIFTS off the dimmed app
 * with a neutral SIDEWAYS drop shadow + an inner edge catch-light, NEVER a glow / colored
 * shadow; the scrim (owned by NockerlOverlay) is a flat palette dim, not a blur halo. Flash-free
 * motion animates TRANSFORM (slide X) + OPACITY (scrim) only. The fill never tweens, and
 * prefers-reduced-motion freezes both. Cyan is the only brand accent; warm = status only.
 *
 * A11y: close is a real <button> (NockerlIconButton); a MODAL panel is role="dialog" aria-modal +
 * aria-labelledby (focus moves in, traps, restores to the opener via the consumer's close
 * handler), an INLINE panel is a role="region" that does NOT trap (app stays live); Esc +
 * scrim tap close; rings are an OUTLINE. TOKEN-REACTIVE: every color / font / radius / spacing
 * is a var(--token); literals remain only for geometry (width, slide, icon size, shadow blur).
 *
 * No forwardRef (API convention): NockerlDrawer composes NockerlOverlay via a render-prop (which owns
 * the panel ref) in modal mode, so there is no single root element a forwarded ref could point to.
 */
import { useEffect, useId, useState } from 'react';
import { NockerlIcon } from '../primitives/Icon.js';
import { NockerlIconButton } from '../primitives/IconButton.js';
import { NockerlOverlay } from '../behaviors/Overlay.js';
import { assertComposeChildren, type ComposeContract } from '../compose-contract.js';

export type DrawerEdge = 'left' | 'right';
/** The ONE nav-surface presentation mode ( · D5). 'inline' = the persistent, in-layout
 *  nav-rail / sidebar role (no scrim, app stays live); 'overlay' = the drawer role (scrim + focus
 *  trap). 'modal' is accepted as a DEPRECATED alias of 'overlay'. */
export type NavSurfaceMode = 'inline' | 'overlay';
export type DrawerMode = NavSurfaceMode | 'modal';
/** The vertical edge the nav surface anchors to + slides from. */
export type NavSurfaceSide = DrawerEdge;

export interface NockerlDrawerProps {
  /** Whether the drawer is presented. */
  open: boolean;
  /** Dismiss handler: scrim tap, Esc, or the close button. */
  onDismiss: () => void;
  /** Which vertical edge the panel is anchored to + slides from. */
  edge?: DrawerEdge;
  /** 'overlay' = the drawer role (scrim + focus trap); 'inline' = the persistent nav-rail role
   *  (no scrim, app stays live). 'modal' is a deprecated alias of 'overlay'. Default 'overlay'. */
  mode?: DrawerMode;
  /** Accessible title shown in the header (carries the dialog/region name). */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Optional right-aligned action row pinned to the panel footer. */
  footer?: React.ReactNode;
  /** The contained stage element, which gates rendering so the drawer never escapes it. */
  stage: HTMLElement | null;
  /** Panel body: a nav list (left) or detail content (right). */
  children: React.ReactNode;
}

/** The ONE nav-surface props ( · D5): `NockerlNavSurface` and `NockerlDrawer` are the SAME
 *  component under two names: the single edge-anchored nav / panel surface (inline rail + overlay
 *  drawer). AppShell composes ONE of these, not two. */
export type NockerlNavSurfaceProps = NockerlDrawerProps;

// The panel LIFTS off the dimmed app: cardAlt → canvasAlt ground + a neutral sideways
// drop shadow + an inner edge catch-light. Motion animates transform (slide) + opacity
// only; the fill never tweens. The scrim + centering wrap are the NockerlOverlay primitive's
// (.nk-ov-scrim / .nk-ov-wrap--left|right). Every value is a token.
export const NOCKERL_DRAWER_STYLES = `
/* The PANEL: anchored flush to one vertical edge, FULL stage height, rounded only
   on its INNER corners (the outer edge is the stage wall). cardAlt → canvasAlt
   ground; lifts with a neutral SIDEWAYS shadow + an inner edge catch-light.
   MODAL: sits in the NockerlOverlay wrap, slide keyed off the data-shown NockerlOverlay supplies.
   INLINE: absolutely positioned in the stage, slide keyed off its own data-shown. */
.nk-dw-panel { position: absolute; top: 0; bottom: 0; z-index: 6; display: flex; flex-direction: column; width: 264px; max-width: 82%;
  background: linear-gradient(180deg, var(--color-card-alt), var(--color-canvas-alt)); color: var(--color-on-card-alt);
  will-change: transform; transition: transform .3s var(--motion-easing-standard); }
.nk-dw-panel--left { left: 0; transform: translateX(-100%); border-right: var(--space-px) solid var(--color-alt-hairline);
  border-top-right-radius: var(--radius-card); border-bottom-right-radius: var(--radius-card);
  box-shadow: var(--elevation-sheet) 0 30px -12px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent), inset var(--space-px) 0 0 var(--color-surface-highlight); }
.nk-dw-panel--right { right: 0; transform: translateX(100%); border-left: var(--space-px) solid var(--color-alt-hairline);
  border-top-left-radius: var(--radius-card); border-bottom-left-radius: var(--radius-card);
  box-shadow: calc(-1 * var(--elevation-sheet)) 0 30px -12px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent), inset calc(-1 * var(--space-px)) 0 0 var(--color-surface-highlight); }
.nk-dw-panel[data-shown="true"] { transform: translateX(0); }

/* HEADER: title + optional subtitle + a close button; a divider rule under it. */
.nk-dw-head { flex: 0 0 auto; display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-4) var(--space-4) var(--space-3); }
.nk-dw-head__txt { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-dw-title { margin: 0; font-size: var(--font-size-16); font-weight: var(--font-weight-bold); line-height: var(--font-line-height-24); color: var(--color-on-card-alt); }
.nk-dw-sub { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-alt-muted); }
.nk-dw-rule { flex: 0 0 auto; height: var(--space-px); background: var(--color-alt-hairline); margin: 0 var(--space-4); }

/* BODY: scrolls within the full panel height; padded. */
.nk-dw-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: var(--space-3) var(--space-3) var(--space-4); }

/* FOOTER action row: pinned, a top hairline + right-aligned. */
.nk-dw-foot { flex: 0 0 auto; display: flex; justify-content: flex-end; align-items: center; gap: var(--space-2);
  padding: var(--space-3) var(--space-4); border-top: var(--space-px) solid var(--color-alt-hairline); }

@media (prefers-reduced-motion: reduce) {
  .nk-dw-panel { transition: none; }
}
`;

const IconClose = <NockerlIcon path="M18 6 6 18M6 6l12 12" />;

/**
 * A single Nockerl drawer is the unit the spec documents: a panel anchored flush to
 * the left or right vertical edge of the contained stage, FULL stage height, with a
 * header (title/subtitle + close), a scrolling body, and an optional pinned footer.
 * MODAL composes the shared NockerlOverlay (flat scrim + focus trap + Esc + initial focus);
 * this composite keeps only the edge panel + its slide-X transform (keyed off NockerlOverlay's
 * data-shown). INLINE/PUSH omits NockerlOverlay entirely: no scrim, no trap. It shifts the
 * app aside (via the consumer's own layout) so it stays live; it runs a light local
 * mount/slide lifecycle and renders a role="region". Esc + scrim tap dismiss the modal;
 * focus is restored to the opener by the consumer's close handler.
 */
export function NockerlDrawer({
  open, onDismiss, edge = 'left', mode = 'overlay', title, subtitle, footer, stage, children,
}: NockerlDrawerProps) {
  const titleId = useId();
  assertComposeChildren('NockerlDrawer', '*', children);
  assertComposeChildren('NockerlDrawer', ['NockerlButton', 'NockerlIconButton'], footer, 'footer');

  // Header + divider + scrolling body + optional footer, identical across both modes.
  const inner = (
    <>
      <div className="nk-dw-head">
        <div className="nk-dw-head__txt">
          <h2 className="nk-dw-title" id={titleId}>{title}</h2>
          {subtitle && <span className="nk-dw-sub">{subtitle}</span>}
        </div>
        <NockerlIconButton icon={IconClose} label="Close" onClick={onDismiss} variant="plain" size={32} />
      </div>
      <div className="nk-dw-rule" />
      <div className="nk-dw-body">{children}</div>
      {footer && <div className="nk-dw-foot">{footer}</div>}
      {/* Recipe CSS injected as the LAST child of the panel; identical injected blocks dedupe. */}
      <style>{NOCKERL_DRAWER_STYLES}</style>
    </>
  );

  // INLINE / PUSH is NOT an NockerlOverlay: no scrim, no focus trap, the app stays live. Keeps
  // its own light mount -> next-frame slide-in -> unmount lifecycle and renders a region.
  if (mode === 'inline') {
    return <InlineDrawer open={open} edge={edge} titleId={titleId}>{inner}</InlineDrawer>;
  }

  // MODAL composes the shared NockerlOverlay: it owns the scrim, the open/close lifecycle, the
  // focus trap + Esc, and the initial focus. This supplies only the edge panel + slide.
  return (
    <NockerlOverlay
      open={open}
      onDismiss={onDismiss}
      stage={stage}
      placement={edge}
      closeDurationMs={320}
    >
      {({ panelRef, panelProps }) => (
        <div
          ref={panelRef as React.RefObject<HTMLDivElement | null>}
          className={`nk-dw-panel nk-dw-panel--${edge}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          {...panelProps}
        >
          {inner}
        </div>
      )}
    </NockerlOverlay>
  );
}

/**
 * The INLINE / PUSH panel: a role="region" that lives directly in the stage (no
 * NockerlOverlay, no scrim, no trap; the app stays interactive). Runs a small local
 * mount -> next-frame "shown" -> unmount lifecycle so its slide-X transform still
 * plays on open/close. Esc still dismisses via the consumer's own close controls.
 */
function InlineDrawer({
  open, edge, titleId, children,
}: {
  open: boolean;
  edge: DrawerEdge;
  titleId: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const r = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(r);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 320);
    return () => clearTimeout(t);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={`nk-dw-panel nk-dw-panel--${edge}`}
      data-shown={shown}
      role="region"
      aria-labelledby={titleId}
    >
      {children}
    </div>
  );
}

// CONTAINER: composes NockerlOverlay (modal scrim/focus-trap) + NockerlIconButton (close). Body is nav/detail content, so slot `default` accepts '*'; `footer` holds the pinned action row (real Buttons). `title`/`subtitle` are plain text (not slots). No owns: nav destinations compose the NockerlNavItem primitive at the call-site, not a hand-rolled <button>.
export const compose = {
  slots: {
    default: { accepts: '*', required: true },
    footer: { accepts: ['NockerlButton', 'NockerlIconButton'] },
  },
} satisfies ComposeContract;

/** The ONE nav-surface ( · D5): `NockerlNavSurface` IS `NockerlDrawer` (the same component,
 *  two names). inline mode = the persistent sidebar / nav-rail role; overlay mode = the drawer role.
 *  AppShell composes ONE nav surface, not two. NockerlDrawer stays for the drawer / inspector role. */
export const NockerlNavSurface = NockerlDrawer;

export default NockerlDrawer;
