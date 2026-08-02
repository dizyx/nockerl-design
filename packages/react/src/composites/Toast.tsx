/**
 * NockerlToast: the Tier-3 TRANSIENT floating-notifier composite. ONE home for a single
 * toast: a solid, lifted, EPHEMERAL floating card that never blocks, DISTINCT from the
 * inline NockerlBanner and the blocking modal NockerlDialog. It SHARES the alert family's
 * severity vocabulary (info / success / warning / error) plus the warm `notice` accent AND
 * the family SIGNATURE: a filled status ICON DISC (the shared NockerlStatusDisc coin, a
 * colored circle with a knockout glyph), here doing double duty as the countdown.
 *
 * It COMPOSES the real controls: NockerlSurface (variant="panel", the 12px panel radius +
 * the lit-from-above sheen), NockerlStatusDisc (the filled intent coin + knockout glyph,
 * shared with Banner / Callout), NockerlButton (the optional quiet ghost action), and
 * NockerlIconButton (the close X). This component supplies only the toast card chrome, the
 * disc's draining countdown RING, the pause-on-hover/focus timer, and the Esc-to-dismiss.
 * The corner VIEWPORT + the stack/enter/exit choreography stay with the consumer (the demo
 * harness / any app's toast host). NockerlToast is the single toast, not the queue.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - surfaces are SOLID + dimensional: the toast is `--color-card-surface2` with a NEUTRAL
 *     sheet drop shadow + a top catch-light (lift), NO glow, NO colored shadow, NO status
 *     wash. The intent color lives ONLY in the leading filled DISC (glyph knocked out).
 *   - transparency is for STATE only (the countdown sweep, hover/exit). Status color for warm
 *     intents only; panel radius (rounded rect, never a pill).
 *   - flash-free: disc + surface static; enter/exit + countdown animate only transform /
 *     opacity / angle. The border is a WHISPER of intent, not a fill swap.
 *   - THE COUNTDOWN: the disc IS the timer (no generic bottom bar). A thin status-color RING
 *     wraps the leading disc and DRAINS clockwise (a conic sweep, full → empty) as auto-dismiss
 *     elapses. The ring is a masked conic gradient on an `@property`-registered <angle> so CSS
 *     truly TWEENS it (law 7, never a fill swap). Hover/focus FREEZE the angle; reduced-motion
 *     shows a STATIC full rim; a persistent toast keeps the pin marker and wears no ring.
 *
 * A11y: hover OR focus PAUSES the countdown; action + close are real focusable buttons with
 * focus-visible rings; Esc dismisses the focused toast; the toast announces via role
 * alert/status (assertive on error, polite otherwise); focus is NEVER stolen; reduced-motion
 * freezes the slide/fade (still times out).
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a var(--token).
 * Literals remain only for pure geometry (icon viewBox, transition curves).
 */
import { useEffect, useRef, useState } from 'react';
import { ALERT_INTENT } from '../alertIntents';
import { NockerlButton } from '../primitives/Button';
import { NockerlIcon } from '../primitives/Icon';
import { NockerlIconButton } from '../primitives/IconButton';
import { NockerlStatusDisc } from '../primitives/StatusDisc';
import { NockerlSurface } from '../primitives/Surface';
import type { ComposeContract } from '../compose-contract';

export type NockerlToastIntent = 'info' | 'success' | 'warning' | 'error' | 'notice';
export interface NockerlToastProps {
  /** Body copy that carries the toast's accessible text (rendered as HTML). */
  message: string;
  /** Dismiss handler, fired when the timer elapses, Esc is pressed, or the close (X) is clicked. */
  onClose: () => void;
  /** Drives the status color, the default icon, and the live role. */
  intent?: NockerlToastIntent;
  /** Optional bold heading above the message (one short line). */
  title?: string;
  /** Show the leading status disc (defaults to on). */
  icon?: boolean;
  /** Optional quiet text button in the status color (right-aligned; e.g. Undo). */
  actionLabel?: string;
  /** Action handler (ignored when no actionLabel). */
  onAction?: () => void;
  /**
   * Auto-dismiss after this many ms. 0 / undefined → PERSISTENT (no timeout); the
   * toast then shows a "pinned" marker instead of the ring and waits for close.
   */
  duration?: number;
}

// Each intent maps to ONE status token (cyan only for `info`). SINGLE-SOURCED from
// ALERT_INTENT (the one alert-family map) so Banner / Toast / Callout cannot drift. `info`
// resolves to the brand cyan; `notice` is the rare warm orange accent: a featured/heads-up
// announcement, NOT a status.
const INTENT_COLOR: Record<NockerlToastIntent, string> = {
  info: ALERT_INTENT.info.color, // cyan, the one place cyan is allowed
  success: ALERT_INTENT.success.color,
  warning: ALERT_INTENT.warning.color,
  error: ALERT_INTENT.error.color,
  notice: ALERT_INTENT.notice.color, // the rare warm brand accent (orange)
};
// Errors interrupt (assertive); the rest are polite. Matches the banner's role map.
const INTENT_ASSERTIVE: Record<NockerlToastIntent, boolean> = { info: false, success: false, warning: false, error: true, notice: false };

// Styles for a SOLID, lifted, EPHEMERAL floating surface; the intent color rides in on --to-c,
// disc-only. NockerlSurface (variant="panel") supplies the 12px panel radius + the sheen var. The
// raised surface2 fill (one tier above NockerlSurface's surface1) and the intent-whisper border
// REPLACE NockerlSurface's flat surface1 + plain hairline; the .nk-to.nk-surface two-class selector
// out-specifies .nk-surface (injected later in the DOM) without depending on source order.
export const NOCKERL_TOAST_STYLES = `
/* Register the countdown angle as a real <angle> so the conic ring can TWEEN (law 7). */
@property --nk-to-sweep { syntax: "<angle>"; inherits: false; initial-value: 360deg; }
/* the toast: a SOLID lifted floating card; intent color rides in on --to-c but lives
   ONLY in the leading disc. Neutral surface (never a wash); the border is a WHISPER of
   intent; depth = a NEUTRAL sheet drop shadow + a top catch-light (no glow, no tint). */
.nk-to {
  position: relative; display: flex; flex-direction: column; gap: var(--space-2);
  padding: var(--space-3); overflow: hidden;
  color: var(--color-on-card);
  font-size: var(--font-size-14); line-height: var(--font-line-height-20);
  box-shadow: 0 var(--space-4) var(--elevation-sheet) -10px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-sheet) * 100%), transparent), var(--nk-surface-sheen);
}
/*  (the design lead ruled TEXT IS KING): the top row is the leading disc + the FULL-WIDTH
   message; the close X floats in the corner (out of flow) so the message reads wide, and any
   action drops to an OPT-IN second row. No shadow change (already the L4 sheet drop). */
.nk-to__row { display: flex; align-items: flex-start; gap: var(--space-3); }
.nk-to.nk-surface {
  background: var(--color-card-surface2);
  border: var(--space-px) solid color-mix(in srgb, var(--to-c) 20%, var(--color-card-hairline));
}
/* THE SIGNATURE + THE TIMER: the filled status DISC (shared with the banner) DOUBLES as
   the countdown: a colored coin (knockout glyph) wrapped by a thin status RING that drains
   as the toast times out. Frame = coin + a gutter for the ring; both centred to line 1. */
.nk-to__disc {
  flex: 0 0 auto; position: relative;
  width: calc(var(--space-6) + var(--space-2));
  height: calc(var(--space-6) + var(--space-2));
  margin-top: calc((var(--font-line-height-20) - var(--space-6) - var(--space-2)) / 2);
  display: inline-flex; align-items: center; justify-content: center;
}
/* the colored coin: the lit intent coin + knockout glyph lives in the NockerlStatusDisc
   primitive (.nk-disc), which the alert family shares. The Toast renders <NockerlStatusDisc>
   as the coin inside this frame; the ring below wraps it. The frame (.nk-to__disc) owns the
   first-line centring. The coin recipe (fill / radius / lift / knockout ink) is single-sourced. */
/* THE COUNTDOWN RING: a conic sweep masked to a thin annulus around the coin (reads in
   BOTH themes): a faint full TRACK (::before) under a brighter status ARC that shrinks to
   nothing as --nk-to-sweep tweens to 0. Only the angle animates (law 7), no flash, no glow. */
.nk-to__ring, .nk-to__ring::before {
  position: absolute; inset: 0; border-radius: var(--radius-pill);
  /* donut mask (#000 = mask channel, not a color): hide centre, keep a thin rim. */
  -webkit-mask: radial-gradient(closest-side, transparent calc(100% - var(--space-1)), #000 calc(100% - var(--space-1)));
  mask: radial-gradient(closest-side, transparent calc(100% - var(--space-1)), #000 calc(100% - var(--space-1)));
}
.nk-to__ring { pointer-events: none; transition: --nk-to-sweep var(--nk-to-dur, 0s) linear;
  background: conic-gradient(var(--to-c) var(--nk-to-sweep, 360deg), transparent 0); }
.nk-to__ring::before { content: ""; z-index: -1; background: color-mix(in srgb, var(--to-c) 22%, transparent); }
/* text column: title (status color, semibold) over message (on-card / muted). */
.nk-to__body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5);
  padding-block: 1px; padding-right: var(--space-8); }   /* clear the floating corner X () */
.nk-to__title { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold);
  line-height: var(--font-line-height-20); color: var(--to-c); }
.nk-to__msg { color: var(--color-on-card); word-break: break-word; }
.nk-to--titled .nk-to__msg { color: var(--color-on-card-muted); }
.nk-to__msg b { color: var(--color-on-card); font-weight: var(--font-weight-semibold); }
/* the close X (+ the persistent pin) float in the TOP-RIGHT CORNER, out of the message flow,
   so the message reads full-width. Composed from NockerlIconButton (recipe lives there). */
.nk-to__corner { position: absolute; top: var(--space-2); right: var(--space-2); z-index: 1;
  display: inline-flex; align-items: center; gap: var(--space-1); }
/* actions are OPT-IN (default off): a quiet ghost <NockerlButton> on a second row, right-aligned
   beneath the message in the reserved bottom-right space. */
.nk-to__actions { display: flex; justify-content: flex-end; }
/* PIN: the persistent marker shown in place of the ring (countdown lives on the disc). */
.nk-to__pin { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
  width: var(--space-4); height: var(--font-line-height-20); color: var(--to-c); }
.nk-to__pin svg { display: block; width: 13px; height: 13px; }
@media (prefers-reduced-motion: reduce) {
  /* no draining ring: freeze a calm, static FULL rim (the toast still times out). */
  .nk-to__ring { transition: none; --nk-to-sweep: 360deg !important; }
}
`;

// ─── Knockout glyphs (FILLED, a dark stencil cut from the colored disc) ──
// currentColor inherits the disc's knockout ink; identical set to the banner family.
const ICONS: Record<NockerlToastIntent, React.ReactNode> = {
  info: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 8.6a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm-1.05 2.05a1.05 1.05 0 0 1 2.1 0v5.7a1.05 1.05 0 0 1-2.1 0Z" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m7.5 12.4 3 3 6-6.8" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10.95 7.2a1.05 1.05 0 0 1 2.1 0v5.4a1.05 1.05 0 0 1-2.1 0Zm1.05 8.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  ),
  // notice: a four-point spark/sparkle (featured, new, heads-up), knocked out of
  // the warm orange disc. Identical to the banner's notice mark (family-consistent).
  notice: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 4.5c.35 2.1.9 3.4 1.75 4.25C14.6 9.6 15.9 10.15 18 10.5c-2.1.35-3.4.9-4.25 1.75-.85.85-1.4 2.15-1.75 4.25-.35-2.1-.9-3.4-1.75-4.25C9.4 11.4 8.1 10.85 6 10.5c2.1-.35 3.4-.9 4.25-1.75C11.1 7.9 11.65 6.6 12 4.5Z" />
    </svg>
  ),
};
// Stroke glyphs (the canonical 0 0 24 24 / stroke-2 shell via the NockerlIcon primitive). IconX
// is sized by its <NockerlIconButton> host; .nk-to__pin svg sizes the pin. FILLED discs stay inline.
const IconX = <NockerlIcon path="M6 6l12 12M18 6 6 18" />;
const IconPin = <NockerlIcon path="M9 4h6M10 4l-1 7-3 2v1h12v-1l-3-2-1-7M12 17v3" />;

/**
 * A single Nockerl toast, the unit the spec documents: a leading filled status DISC (glyph
 * knocked out) whose RING drains as the countdown, a title + message column, right-aligned
 * action + close (a pinned marker, no ring, when persistent). A solid, floating, lifted card:
 * never a glow, never a left rail.
 *
 * `onClose` fires when the timer elapses, Esc is pressed, or the close (X) is clicked;
 * `onAction` fires when the optional action button is clicked. Hover/focus pause the timer.
 * The corner viewport + the stack (spawn / remove / cap) are the consumer's. This is the
 * single card.
 *
 * No forwardRef (API convention): NockerlToast owns internal timer/ring refs and is placed by
 * a consumer's viewport wrapper: there is no single stable root element to forward a ref to.
 */
export function NockerlToast({
  message, onClose, intent = 'info', title, icon = true, actionLabel, onAction, duration,
}: NockerlToastProps) {
  const total = duration ?? 0;
  const persistent = total <= 0; // 0 / undefined → no timeout (a pinned marker, waits for close)

  // The disc's RING drains full turn → empty over the remaining time, then closes.
  // Hover/focus PAUSE (cancel the timer, freeze the ring); leaving RESUMES with the
  // time left. Refs hold the mutable timing so the effect re-fires only on `paused`.
  const [paused, setPaused] = useState(false);
  const ringRef = useRef<HTMLSpanElement>(null);
  const remainingRef = useRef<number>(total);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (persistent) return; // no timer, no ring: the pin waits for an explicit close
    const left = remainingRef.current; // banked by the previous run's cleanup
    const ring = ringRef.current; // may be null when icon={false}, timer still runs
    const angle = (frac: number) => `${Math.max(0, Math.min(1, frac)) * 360}deg`;

    if (paused) {
      // HELD: snap the ring to the remaining fraction with NO animation so it visibly
      // freezes (the cancelled CSS transition would otherwise keep draining). Timer off.
      ring?.style.setProperty('--nk-to-dur', '0ms');
      ring?.style.setProperty('--nk-to-sweep', angle(left / total));
      return;
    }

    const startedAt = Date.now();
    if (ring) {
      // Snap to the current fraction, force a reflow, then drain to 0 over `left`.
      ring.style.setProperty('--nk-to-dur', '0ms');
      ring.style.setProperty('--nk-to-sweep', angle(left / total));
      void ring.offsetWidth;
      ring.style.setProperty('--nk-to-dur', `${left}ms`);
      ring.style.setProperty('--nk-to-sweep', '0deg');
    }

    const timer = window.setTimeout(() => closeRef.current(), left);
    return () => {
      window.clearTimeout(timer);
      // Bank the time consumed so a resume continues from where it paused.
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt));
    };
  }, [paused, persistent, total]);

  return (
    <NockerlSurface
      variant="panel"
      role={INTENT_ASSERTIVE[intent] ? 'alert' : 'status'}
      aria-live={INTENT_ASSERTIVE[intent] ? 'assertive' : 'polite'}
      className={['nk-to', title ? 'nk-to--titled' : ''].filter(Boolean).join(' ')}
      style={{ ['--to-c' as string]: INTENT_COLOR[intent] }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e: React.FocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="nk-to__row">
        {icon && (
          <span className="nk-to__disc" aria-hidden="true">
            {/* the countdown ring wraps the coin, only present when the toast times out */}
            {!persistent && (
              <span
                className="nk-to__ring"
                ref={ringRef}
                style={{ ['--nk-to-sweep' as string]: '360deg', ['--nk-to-dur' as string]: '0ms' }}
              />
            )}
            {/* the coin: every Toast intent is a 1:1 AlertIntent, so the NockerlStatusDisc fill
                (ALERT_INTENT[intent].color) equals the --to-c the ring reads: coin pixel-
                identical, ring unchanged. The frame owns the centring. */}
            <NockerlStatusDisc intent={intent}>{ICONS[intent]}</NockerlStatusDisc>
          </span>
        )}
        <div className="nk-to__body">
          {title && <span className="nk-to__title">{title}</span>}
          <span className="nk-to__msg" dangerouslySetInnerHTML={{ __html: message }} />
        </div>
      </div>
      {/* actions are OPT-IN (default off): a second row, right-aligned beneath the message. */}
      {actionLabel && (
        <div className="nk-to__actions">
          <NockerlButton text={actionLabel} variant="ghost" size="sm" onClick={() => onAction?.()} />
        </div>
      )}
      {/* the close X (+ persistent pin) float in the corner, out of the message flow. */}
      <span className="nk-to__corner">
        {persistent && (
          <span className="nk-to__pin" aria-hidden="true" title="Persistent: stays until dismissed">
            {IconPin}
          </span>
        )}
        <NockerlIconButton icon={IconX} label="Dismiss notification" size={28} onClick={onClose} />
      </span>
      {/* Recipe CSS injected as the LAST child; identical injected blocks dedupe in effect. */}
      <style>{NOCKERL_TOAST_STYLES}</style>
    </NockerlSurface>
  );
}

// LEAF (describes the Toast): composes NockerlSurface + NockerlStatusDisc + NockerlButton (action) + NockerlIconButton
// (close) internally, but exposes NO fillable component slots: `message`/`title` are plain text,
// `actionLabel` is a string (data), `icon` a boolean. No owns (role="alert|status" on NockerlSurface is
// connective). FLAG: composite with no slots, modeled leaf.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlToast;
