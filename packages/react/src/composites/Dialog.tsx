/**
 * NockerlDialog is the Tier-3 CENTERED-modal-dialog composite. ONE home for the lifted card
 * pinned to the stage centre over a flat scrim: title (left) → body (text and/or a form
 * field) → right-aligned action row (Cancel/ghost + Confirm/primary|destructive). It is the
 * platform-neutral confirm / short-form surface, distinct from the edge-anchored
 * NockerlBottomSheet (grip, slides from the bottom) and the edge NockerlDrawer.
 *
 * It COMPOSES the real controls: NockerlOverlay (the scrim + mount/shown/unmount lifecycle +
 * focus TRAP + Esc + initial focus + stage-gating), NockerlSurface (the card hairline + 16px
 * card radius), NockerlButton (Cancel + Confirm), NockerlIconButton (the close X), and, for the
 * optional header mark, the shared NockerlStatusDisc coin. This component supplies only the
 * centered card, its scale-in motion (keyed off NockerlOverlay's data-shown), and the
 * Enter=confirm shortcut. Focus is restored to the trigger by the consumer's close handler.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - the CARD LIFTS: card-surface ground + neutral drop shadow + top catch-light
 *     (radius.card 16; NEVER a glow / colored shadow); the SCRIM (owned by NockerlOverlay) is a
 *     flat --color-scrim dim, opacity-only.
 *   - flash-free motion animates TRANSFORM (scale) + OPACITY only, never the fill;
 *     prefers-reduced-motion freezes both (appear in place).
 *   - the form field is a RECESSED WELL (the NockerlTextField primitive), the inverse of the card.
 *   - actions are OUTLINE, never a filled CTA: a lifted modal spends its emphasis on
 *     the card lift, so Confirm is tertiary (outline cyan) | destructive (outline red) and
 *     Cancel is ghost (D1 emphasis-budget). Cyan is still the only accent; destructive rides
 *     warm --color-status-error (color + icon + text, never color alone).
 *   - BOTH header icons (destructive AND fork) are the shared NockerlStatusDisc coin rendered
 *     INSET: a recessed well (soft wash + whisper border + intent-color glyph) that
 *     SINKS into the lifted card. ONE circular grammar with Banner / Callout / Toast (the
 *     recessed member); the intent color rides the coin (destructive = error red, fork = info
 *     cyan). No bespoke square plate.
 *
 * A11y: every action is a real <button>; role="dialog" aria-modal + aria-labelledby (title) +
 * aria-describedby (body); opening focuses a sensible control (the field, else the confirm);
 * Esc cancels; Enter fires the default action (unless typing a multi-line field or
 * confirmDisabled); focus is trapped (Tab cycles) and restored to the opener. TOKEN-REACTIVE:
 * every color/font/radius/spacing is a var(--token); literals remain only for pure geometry.
 */
import { useCallback, useId, useRef } from 'react';
import { NockerlButton } from '../primitives/Button.js';
import { NockerlIcon } from '../primitives/Icon.js';
import { NockerlIconButton } from '../primitives/IconButton.js';
import { NockerlStatusDisc } from '../primitives/StatusDisc.js';
import { NockerlSurface } from '../primitives/Surface.js';
import { NockerlOverlay } from '../behaviors/Overlay.js';
import type { ComposeContract } from '../compose-contract.js';

export interface NockerlDialogProps {
  /** Whether the dialog is presented. */
  open: boolean;
  /** Dismiss handler: scrim tap, Esc, Cancel, or the close (X) button. */
  onDismiss: () => void;
  /** Default-action handler: the confirm button + Enter. */
  onConfirm: () => void;
  /** Accessible title; carries the dialog name (aria-labelledby). */
  title: string;
  /** Confirm-button label. */
  confirmLabel?: string;
  /** Cancel-button label. `null` hides Cancel (a single-action alert). */
  cancelLabel?: string | null;
  /** Emphasis of the default action: primary cyan or destructive red. */
  tone?: 'primary' | 'destructive';
  /** Optional leading header glyph key (warning for destructive, fork for branch). */
  icon?: 'warning' | 'fork';
  /** Disable the confirm action (e.g. an unsatisfied form). */
  confirmDisabled?: boolean;
  /** The contained stage element, which gates rendering so the dialog never escapes it. */
  stage: HTMLElement | null;
  /** Body: supporting text and/or a form field. */
  children: React.ReactNode;
}

// The card LIFTS off the dimmed ground; the scrim is a flat dim (owned by NockerlOverlay);
// motion is scale + opacity only. The form field is a recessed WELL. Every value is a token.
// NockerlSurface (default card variant) supplies the hairline + 16px card radius; the gradient
// fill REPLACES NockerlSurface's flat surface1, so the background rule is written at
// .nk-dlg-card.nk-surface (0,2,0) to out-specify .nk-surface (0,1,0) regardless of the order
// NockerlSurface injects its own recipe. No level passed - the card keeps its own DRIFT shadow.
export const NOCKERL_DIALOG_STYLES = `
.nk-dlg-card {
  pointer-events: auto; position: relative; width: 100%; max-width: var(--size-container-lg); display: flex; flex-direction: column;
  color: var(--color-on-card);
  transform: scale(.94); opacity: 0; will-change: transform, opacity;
  transition: transform .22s var(--motion-easing-standard), opacity .18s ease;
  box-shadow: 0 var(--space-4) var(--elevation-sheet) -10px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-sheet) * 100%), transparent), var(--nk-surface-sheen);
}
.nk-dlg-card.nk-surface { background: linear-gradient(180deg, var(--color-card-surface2), var(--color-card-surface1)); }
.nk-dlg-card[data-shown="true"] { transform: scale(1); opacity: 1; }
/* HEADER: optional leading mark + left-aligned title; close (X) NockerlIconButton trails.
   A header icon (destructive OR fork) renders the shared NockerlStatusDisc coin, ONE
   circular grammar with the alert family (Banner / Callout / Toast); the intent color
   rides only in the coin (error = red, fork = info cyan). No bespoke square plate. */
.nk-dlg-head { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-5) var(--space-5) var(--space-2); }
/* the header STATUS coin gets a small line-box nudge so it top-aligns to the title
   like the alert-family disc (the coin is a compact circle, not a full-height plate). */
.nk-dlg-disc { margin-top: var(--space-1); }
.nk-dlg-head__txt { flex: 1 1 auto; min-width: 0; padding-top: var(--space-0-5); }
.nk-dlg-title { margin: 0; font-size: var(--font-size-18); font-weight: var(--font-weight-bold); line-height: var(--font-line-height-24); color: var(--color-on-card); }
/* BODY: supporting copy + optional form field, title-aligned (left). */
.nk-dlg-body { padding: 0 var(--space-5) var(--space-2); display: flex; flex-direction: column; gap: var(--space-3); }
/* ACTIONS: right-aligned row of Cancel (ghost) + Confirm OUTLINE (tertiary cyan | destructive
   red). A lifted modal keeps OUTLINE actions (D1 emphasis-budget), never a filled CTA. */
.nk-dlg-actions { display: flex; justify-content: flex-end; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-5) var(--space-5); }
@media (prefers-reduced-motion: reduce) {
  .nk-dlg-card { transition: none; transform: scale(1); }   /* no scale pop: appear in place */
}
`;

// The destructive header WARNING glyph is the alert family's FILLED exclamation, cut as a
// dark stencil out of the NockerlStatusDisc coin (currentColor inherits the disc's knockout ink,
// --color-canvas). Verbatim the Banner / Callout / Toast warning mark so the coin reads
// pixel-identical wherever it appears (never a bespoke Dialog glyph).
const IconWarnKnockout = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10.95 7.2a1.05 1.05 0 0 1 2.1 0v5.4a1.05 1.05 0 0 1-2.1 0Zm1.05 8.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
  </svg>
);
// The `fork` header glyph is knocked out of the SAME NockerlStatusDisc coin the destructive
// header uses (info-intent, cyan). A stroke fork drawn in currentColor, which the disc
// recipe (.nk-disc svg) inherits as the dark canvas ink: a dark-on-color stencil,
// identical grammar to IconWarnKnockout. One coin family; no bespoke square plate.
const IconForkKnockout = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="6" cy="5" r="2.4" /><circle cx="18" cy="5" r="2.4" /><circle cx="12" cy="19" r="2.4" />
    <path d="M6 7.4v3.1a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7.4M12 13.5v3.1" />
  </svg>
);

/**
 * A single Nockerl centered modal dialog: a lifted card pinned to the stage centre over
 * a flat scrim, with a left-aligned title (+ optional NockerlStatusDisc coin), body text and/or a
 * form field, and a right-aligned action row (Cancel ghost + Confirm primary|destructive).
 * The SCRIM + open/close lifecycle + focus-trap + Esc + initial focus are the shared
 * NockerlOverlay primitive; this component supplies the centered card, its scale-in motion, and
 * the Enter=confirm shortcut. Focus is restored to the trigger by the consumer's close handler.
 *
 * No forwardRef (API convention): NockerlDialog composes NockerlOverlay via a render-prop (which owns
 * the panel ref), so there is no single root element a forwarded ref could point to.
 */
export function NockerlDialog({
  open, onDismiss, onConfirm, title, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  tone = 'primary', icon, confirmDisabled = false, stage, children,
}: NockerlDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Enter fires the default action (unless typing a multi-line field or the confirm is
  // disabled). NockerlOverlay owns Esc + the Tab focus-trap; this only adds Enter=confirm.
  const onEnter = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'TEXTAREA' && !confirmDisabled) {
          e.preventDefault();
          onConfirm();
        }
      }
    },
    [onConfirm, confirmDisabled],
  );

  return (
    <NockerlOverlay
      open={open}
      onDismiss={onDismiss}
      stage={stage}
      placement="center"
      closeDurationMs={240}
      onKeyDown={onEnter}
      initialFocus="input, textarea, select"
      initialFocusRef={confirmRef}
    >
      {({ panelRef, panelProps }) => (
        <NockerlSurface
          ref={panelRef}
          className="nk-dlg-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          {...panelProps}
        >
          <div className="nk-dlg-head">
            {icon === 'warning' ? (
              // The STATUS header is the shared NockerlStatusDisc coin, error-intent, rendered
              // INSET: a recessed well (soft wash + whisper border; the intent color
              // rides the GLYPH) that sinks into the lifted card so nothing competes with the
              // card lift (D1 emphasis-budget). One grammar with Banner / Callout / Toast.
              <NockerlStatusDisc intent="error" inset className="nk-dlg-disc">
                {IconWarnKnockout}
              </NockerlStatusDisc>
            ) : (
              icon === 'fork' && (
                // The `fork` header is the SAME NockerlStatusDisc coin, info-intent (cyan), also
                // rendered INSET: a recessed well with the fork glyph in the intent
                // color. One circular grammar with the destructive header + the alert family.
                <NockerlStatusDisc intent="info" inset className="nk-dlg-disc">
                  {IconForkKnockout}
                </NockerlStatusDisc>
              )
            )}
            <div className="nk-dlg-head__txt">
              <h2 className="nk-dlg-title" id={titleId}>
                {title}
              </h2>
            </div>
            <NockerlIconButton
              icon={<NockerlIcon path="M18 6 6 18M6 6l12 12" />}
              label="Close"
              onClick={onDismiss}
              variant="plain"
              size={32}
            />
          </div>

          <div className="nk-dlg-body" id={bodyId}>
            {children}
          </div>

          <div className="nk-dlg-actions">
            {cancelLabel !== null && (
              <NockerlButton text={cancelLabel} variant="ghost" onClick={onDismiss} />
            )}
            {/* The confirm CTA is FLAT/OUTLINE, never a filled primary: `tertiary`
                (outline cyan) for the default tone, `destructive` (outline red) for the
                destructive tone. A lifted modal spends its emphasis on the card lift, so the
                actions stay outline (D1 emphasis-budget); Cancel is ghost. */}
            <NockerlButton
              ref={confirmRef}
              text={confirmLabel}
              variant={tone === 'destructive' ? 'destructive' : 'tertiary'}
              onClick={onConfirm}
              disabled={confirmDisabled}
            />
          </div>
          {/* Recipe CSS injected as the LAST child of the panel; identical injected blocks
              dedupe in effect. The card-background rule is at .nk-dlg-card.nk-surface so it
              wins over NockerlSurface's own .nk-surface fill by specificity, not source order. */}
          <style>{NOCKERL_DIALOG_STYLES}</style>
        </NockerlSurface>
      )}
    </NockerlOverlay>
  );
}

// CONTAINER: composes NockerlOverlay (scrim/focus-trap) + NockerlSurface + NockerlButton (Cancel/Confirm) + NockerlIconButton (close) + NockerlTextField (body). `title` is plain text (not a slot); `icon` is a glyph key (not a slot). Body is arbitrary content (text + NockerlTextField), so slot `default` accepts '*'. No owns, because the action buttons are real Buttons.
export const compose = {
  slots: { default: { accepts: '*', required: true } },
} satisfies ComposeContract;

export default NockerlDialog;
