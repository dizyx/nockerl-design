/**
 * NockerlBottomSheet: the Tier-3 pull-up bottom-sheet composite. ONE home for the modal
 * that rises from the BOTTOM edge, laid out as: scrim → panel → grip → header → scrolling
 * content, rounded TOP corners only. Mirrors the canonical Compose `NockerlBottomSheet` +
 * `NockerlSheetGrip` (core/theme/NockerlBottomSheet.kt). It is the mobile, thumb-reachable
 * surface for a longer, scrollable list of actions or settings, distinct from NockerlDialog
 * (a CENTERED card, confirms / short forms) and NockerlDrawer (the edge-anchored side panel).
 *
 * It COMPOSES the shared NockerlOverlay primitive (the flat scrim, the mount -> shown ->
 * unmount lifecycle, the focus TRAP + Esc, the initial focus, and the stage-gating) plus
 * NockerlSurface (the card base) and NockerlIconButton (the opt-in close X). This composite supplies
 * only the pull-up panel + its slide-up motion (keyed off the data-shown NockerlOverlay hands
 * back). Focus is restored to the trigger by the consumer's close handler.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - GROUND is the ratified vertical gradient cardAlt → canvasAlt (the alternate plane),
 *     clipped to the panel's rounded top: one solid panel; the grip rides the same ground.
 *   - depth = a neutral UPWARD drop shadow + a top catch-light hairline, NEVER a
 *     glow / colored shadow. The scrim (owned by NockerlOverlay) is a flat palette dim.
 *   - flash-free motion: open/close animate TRANSFORM (slide) + OPACITY (scrim) only. The
 *     fill never tweens. prefers-reduced-motion freezes both.
 *   - detents are real heights (half / full); the grip is a short rounded bar in the muted
 *     on-plane token (42×5 in Compose).
 *   - cyan is the only brand accent; warm = status only; the label ON the cyan fill is
 *     --color-on-accent.
 *
 * A11y: opening moves focus into the sheet; the DRAG HANDLE + scrim tap + Esc close it
 * (Material canon: there is NO X by default; the close button is opt-in via `showClose`);
 * focus returns to the trigger on close; focus is trapped (Tab cycles); role="dialog"
 * aria-modal + labelled title; rings are an OUTLINE. TOKEN-REACTIVE: every color / font /
 * radius / spacing is a var(--token); literals remain only for geometry.
 *
 * No forwardRef (API convention): NockerlBottomSheet composes NockerlOverlay via a render-prop (which
 * owns the panel ref), so there is no single root element a forwarded ref could point to.
 */
import { useEffect, useId, useState } from 'react';
import { NockerlIcon } from '../primitives/Icon.js';
import { NockerlIconButton } from '../primitives/IconButton.js';
import { NockerlSurface } from '../primitives/Surface.js';
import { NockerlOverlay } from '../behaviors/Overlay.js';
import type { ComposeContract } from '../compose-contract.js';

export type SheetDetent = 'half' | 'full';

export interface NockerlBottomSheetProps {
  /** Whether the sheet is presented. */
  open: boolean;
  /** Dismiss handler: scrim tap, Esc, or (when opted-in) the close button. */
  onDismiss: () => void;
  /** Accessible title shown in the header (carries the dialog name). */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /**
   * Optional LEADING ICON shown top-left beside the title (e.g. a settings cog next to
   * "Settings"). A plain functional glyph on the on-plane ink, NOT a status disc, NOT cyan.
   * It aligns to the title line; omit for the default text-only header. The header divider is
   * unchanged either way (explicitly neutral, never cyan).
   */
  leadingIcon?: React.ReactNode;
  /** Detent: a half-height peek or a near-full panel. */
  detent?: SheetDetent;
  /** Show the drag grip at the top. */
  grip?: boolean;
  /**
   * OPT-IN close (X) button. Material canon: a bottom sheet has NO X by default. The
   * drag handle + scrim-tap + Esc ARE the dismissal. Set true only when a persistent,
   * always-visible dismiss affordance is genuinely warranted. Default false.
   */
  showClose?: boolean;
  /** The contained stage element that gates rendering so the sheet never escapes it. */
  stage: HTMLElement | null;
  /**
   * PINNED FOOTER-ACTION BAR: an approve/deny row that NEVER scrolls away,
   * rendered below the scrolling body on the sheet's own plane, with a hairline top
   * edge and an upward scroll-under cue when more body remains beneath it. Compose the
   * ratified CTA grammar in here (outline confirm · ghost cancel · destructive
   * outline-red, the Dialog canon). Empty = no footer, byte-identical sheet.
   */
  footer?: React.ReactNode;
  /**
   * NESTED-SHEET BACK NAVIGATION: when set, the header leads with a back
   * chevron (a real NockerlIconButton) BEFORE the title. View swapping stays with the
   * host (swap `title`/`children` on your own state); this is the affordance + a11y.
   */
  onBack?: (() => void) | undefined;
  /** Accessible name for the back affordance. Default "Back". */
  backLabel?: string;
  /** Sheet body. */
  children: React.ReactNode;
}

// The sheet GROUND is the cardAlt → canvasAlt gradient (the ratified .sheetFix),
// clipped to the rounded TOP. Depth = neutral upward shadow + a catch-light hairline.
// Motion animates transform (slide) + opacity only. The SCRIM + the bottom-anchored WRAP
// are owned by the NockerlOverlay primitive (.nk-ov-scrim / .nk-ov-wrap--bottom); this composite
// only supplies the pull-up panel. NockerlSurface (card variant) supplies the base surface; the
// gradient ground + rounded TOP-only radii are written at .nk-bs-panel.nk-surface (0,2,0) so
// they out-specify NockerlSurface's own .nk-surface (0,1,0) regardless of injection order.
export const NOCKERL_BOTTOM_SHEET_STYLES = `
.nk-bs-panel {
  width: 100%; display: flex; flex-direction: column; color: var(--color-on-card-alt);
  border-top-left-radius: var(--radius-card); border-top-right-radius: var(--radius-card);
  border-bottom-left-radius: 0; border-bottom-right-radius: 0;
  border: 0; border-top: var(--space-px) solid var(--color-alt-hairline); will-change: transform;
  box-shadow: 0 calc(-1 * var(--elevation-sheet)) 30px -10px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  transform: translateY(100%); transition: transform .3s var(--motion-easing-standard);
}
.nk-bs-panel.nk-surface { background: linear-gradient(180deg, var(--color-card-alt), var(--color-canvas-alt)); }
.nk-bs-panel[data-shown="true"] { transform: translateY(0); }
.nk-bs-panel[data-detent="half"] { max-height: 58%; }
.nk-bs-panel[data-detent="full"] { max-height: 92%; }

/* GRIP: a short rounded bar, muted on-plane token (Compose: 42×5, alpha .4). It is
   a drag affordance, not a button, so it stays a plain aria-hidden bar. */
.nk-bs-grip { display: flex; justify-content: center; padding: var(--space-2) 0; flex: 0 0 auto; }
.nk-bs-grip::after { content: ""; width: 42px; height: 5px; border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-on-card-alt-muted) 40%, transparent); }
/* HEADER: title + optional subtitle; the close (X) is OPT-IN (Material canon: no X by
   default; the grip + scrim-tap + Esc dismiss). When present it sits at the trailing edge. */
.nk-bs-head {
  flex: 0 0 auto; display: flex; align-items: flex-start; gap: var(--space-3);
  padding: var(--space-1) var(--space-5) var(--space-3);
  /* SCROLL-UNDER separation: a PERSISTENT neutral hairline (dark-gray per theme via
     altHairline, NEVER the warm accent) always demarcates the header, PLUS an on-scroll
     elevation cue. The header is transparent over the praised gradient (untouched). */
  position: relative; z-index: 1;
  border-bottom: var(--space-px) solid var(--color-alt-hairline);
  /* the elevation cue fades in (law §7: interpolate the shadow, never a fill) when content
     passes under; a soft NEUTRAL downward drop from the hairline. Reserved in both states. */
  box-shadow: 0 0 0 0 transparent;
  transition: box-shadow var(--motion-duration-fast) var(--motion-easing-standard);
}
.nk-bs-head--scrolled {
  box-shadow: 0 var(--space-2) var(--space-3) calc(-1 * var(--space-1)) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent);
}
.nk-bs-head--nogrip { padding-top: var(--space-4); }
/* OPTIONAL leading icon: a plain on-plane glyph aligned to the title line (the header
   is align-items:flex-start, so a title-line-height box centers the glyph on the title). NOT a
   status disc, NOT cyan. The persistent neutral header divider is unchanged. */
.nk-bs-head__icon { flex: 0 0 auto; display: inline-flex; align-items: center; height: var(--font-line-height-24); color: var(--color-on-card-alt); }
.nk-bs-head__icon svg { display: block; width: var(--space-5); height: var(--space-5); }
.nk-bs-head__txt { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-bs-title { margin: 0; font-size: var(--font-size-18); font-weight: var(--font-weight-bold);
  line-height: var(--font-line-height-24); color: var(--color-on-card-alt); }
.nk-bs-sub { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-alt-muted); }
/* CONTENT: scrolls within the detent; padded; bottom-safe gap. */
.nk-bs-body { flex: 1 1 auto; min-height: 0; overflow-y: auto;
  padding: 0 var(--space-5) var(--space-6); display: flex; flex-direction: column; gap: var(--space-2); }
/* the body tightens its bottom gap when a pinned footer follows (the footer owns the
   landing space) */
.nk-bs-body--footed { padding-bottom: var(--space-3); }
/* PINNED FOOTER, the approve/deny bar that never scrolls away: the sheet's
   own plane, a persistent neutral hairline on top, actions right-aligned (the Dialog CTA
   grammar), and an UPWARD scroll-under cue (§7: interpolate the shadow, never a fill)
   when more body remains beneath. */
.nk-bs-foot { flex: 0 0 auto; display: flex; justify-content: flex-end; align-items: center;
  gap: var(--space-2); padding: var(--space-3) var(--space-5) var(--space-4);
  position: relative; z-index: 1;
  border-top: var(--space-px) solid var(--color-alt-hairline);
  box-shadow: 0 0 0 0 transparent;
  transition: box-shadow var(--motion-duration-fast) var(--motion-easing-standard); }
.nk-bs-foot--scrollable {
  box-shadow: 0 calc(-1 * var(--space-2)) var(--space-3) calc(-1 * var(--space-1)) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent); }
/* BACK affordance: the nested-sheet chevron leads the header. */
.nk-bs-back { flex: 0 0 auto; margin-left: calc(-1 * var(--space-2)); }

@media (prefers-reduced-motion: reduce) {
  .nk-bs-panel, .nk-bs-head, .nk-bs-foot { transition: none; }
}
`;

const IconClose = <NockerlIcon path="M18 6 6 18M6 6l12 12" />;

/**
 * A single Nockerl bottom sheet, the unit the spec documents: a pull-up gradient
 * panel with a drag handle (grip), a header (title/subtitle; the X is opt-in via
 * `showClose`), and a scrolling body, anchored to the bottom edge of the contained
 * stage (never the page viewport). The scrim + open/close lifecycle + focus-trap + Esc
 * + initial focus are the shared NockerlOverlay primitive (placement=bottom); this composite
 * supplies the panel and its slide-up motion (keyed off the data-shown NockerlOverlay hands
 * back). Focus is restored to the trigger by the consumer's close handler; the drag handle
 * + scrim tap + Esc dismiss (Material canon).
 */
export function NockerlBottomSheet({
  open, onDismiss, title, subtitle, leadingIcon, detent = 'half', grip = true, showClose = false, stage,
  footer, onBack, backLabel = 'Back', children,
}: NockerlBottomSheetProps) {
  const titleId = useId();
  // SCROLL-UNDER cue: the header shows a soft elevation shadow once the body has
  // scrolled off its top, so content visibly passes UNDER the pinned title/subtitle. Reset
  // when the sheet closes so a re-open always starts flush (hairline-only).
  const [scrolled, setScrolled] = useState(false);
  // The pinned footer's UPWARD cue: true while more body remains beneath it.
  const [moreBelow, setMoreBelow] = useState(false);
  useEffect(() => {
    if (!open) {
      setScrolled(false);
      setMoreBelow(false);
    }
  }, [open]);
  const syncScrollCues = (el: HTMLElement) => {
    setScrolled(el.scrollTop > 0);
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  };

  return (
    <NockerlOverlay
      open={open}
      onDismiss={onDismiss}
      stage={stage}
      placement="bottom"
      closeDurationMs={320}
      scrimLabel="Dismiss"
      /* No initialFocus: focus lands on the panel CONTAINER (role="dialog", tabindex=-1)
         NockerlOverlay uses as its default target. That keeps a mount-open sheet CALM on page
         load (a programmatic focus on a -1 container never triggers :focus-visible, so no
         stray ring) while staying fully accessible: screen readers still announce the
         dialog, and a keyboard user tabs straight into the body (and the opt-in X, when shown). */
    >
      {({ panelRef, panelProps }) => (
        <NockerlSurface
          ref={panelRef}
          className="nk-bs-panel"
          data-detent={detent}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          {...panelProps}
        >
          {grip && <div className="nk-bs-grip" aria-hidden="true" />}
          <div className={`nk-bs-head${grip ? '' : ' nk-bs-head--nogrip'}${scrolled ? ' nk-bs-head--scrolled' : ''}`}>
            {/* The nested-sheet BACK affordance leads the header; view
                swapping stays with the host (swap title/children on your own state). */}
            {onBack && (
              <NockerlIconButton
                icon={<NockerlIcon path="m15 18-6-6 6-6" />}
                label={backLabel}
                onClick={onBack}
                variant="plain"
                size={32}
                className="nk-bs-back"
              />
            )}
            {/* OPTIONAL leading icon beside the title (a plain on-plane glyph; not a
                status disc, not cyan). Decorative: the title still carries the a11y name. */}
            {leadingIcon && (
              <span className="nk-bs-head__icon" aria-hidden="true">
                {leadingIcon}
              </span>
            )}
            <div className="nk-bs-head__txt">
              <h2 className="nk-bs-title" id={titleId}>
                {title}
              </h2>
              {subtitle && <span className="nk-bs-sub">{subtitle}</span>}
            </div>
            {/* Material canon: NO X by default. The drag handle + scrim-tap + Esc are the
                dismissal; the X is opt-in via `showClose` for the rare persistent-affordance case. */}
            {showClose && (
              <NockerlIconButton
                icon={IconClose}
                label="Close"
                onClick={onDismiss}
                variant="plain"
                size={32}
              />
            )}
          </div>
          <div
            className={`nk-bs-body${footer ? ' nk-bs-body--footed' : ''}`}
            onScroll={(e) => syncScrollCues(e.currentTarget)}
            ref={(el) => {
              if (el && open) syncScrollCues(el);   /* measure on mount/content so the cue is right before any scroll */
            }}
          >
            {children}
          </div>
          {/* The PINNED footer-action bar: never scrolls away; carries the
              upward scroll-under cue while more body remains beneath it. */}
          {footer && <div className={`nk-bs-foot${moreBelow ? ' nk-bs-foot--scrollable' : ''}`}>{footer}</div>}
          {/* Recipe CSS injected as the LAST child of the panel; identical injected blocks dedupe. */}
          <style>{NOCKERL_BOTTOM_SHEET_STYLES}</style>
        </NockerlSurface>
      )}
    </NockerlOverlay>
  );
}

// CONTAINER: composes NockerlOverlay (bottom scrim/focus-trap) + NockerlSurface + NockerlIconButton (the opt-in close X, only when showClose). Body is arbitrary sheet content, so slot `default` accepts '*'; `footer` is an open slot (compose the ratified CTA grammar, real NockerlButtons); the back affordance composes NockerlIconButton. `title`/`subtitle` are plain text and `leadingIcon` a decorative aria-hidden glyph (not slots); the grip is an aria-hidden drag-handle bar (not a facsimile). No owns.
export const compose = {
  slots: { default: { accepts: '*', required: true }, footer: { accepts: '*', required: false } },
} satisfies ComposeContract;

export default NockerlBottomSheet;
