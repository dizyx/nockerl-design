/**
 * ToastDemo: the live, interactive island for the shipped NockerlToast composite.
 *
 * The reusable transient floating notifier now lives in the published package
 * (@dizyx/nockerl-react → NockerlToast); this file is only the showcase harness that
 * CONSUMES it. A toast FLOATS over the UI, is EPHEMERAL (auto-dismisses on a timer),
 * STACKS, and never blocks. That makes it DISTINCT from the inline `banner` and the blocking
 * modal `dialog`. It SHARES the severity vocabulary (info / success / warning / error) plus the
 * warm `notice` accent AND the family SIGNATURE: a filled status ICON DISC (the shared
 * NockerlStatusDisc coin) doing double duty as the countdown.
 *
 * SOURCED FROM THE REAL APPS: the one SHIPPED transient overlay is Voice/Swift
 * `RecordingHUD` (NockerlVoice/UI/RecordingHUD.swift): a non-activating, bottom-anchored
 * `NSPanel` that auto-hides via `scheduleHide(after:)`, draws a `chromeSurface` + a NEUTRAL
 * `.black.opacity(0.4)` shadow, and NEVER steals focus. Android ships NO Snackbar/Toast;
 * its status tokens are the raw material. This is their generalisation.
 *
 * The Toast's design laws (the SOLID `--color-card-surface2` lift with a NEUTRAL sheet
 * shadow + top catch-light, the intent color living ONLY in the leading filled disc, the
 * disc's draining conic countdown RING on an `@property` <angle>, hover/focus pause,
 * Esc-to-dismiss, the reduced-motion static rim) are ENCODED IN THE PACKAGE now; see
 * packages/react/src/composites/Toast.tsx. This harness only supplies the demo-only queue
 * (spawn / remove / cap), the contained STAGE (vs. the real viewport corner), the corner
 * VIEWPORT + the stack enter/exit slot choreography, the severity trigger buttons, and the
 * polite live region.
 *
 * A11y (harness): toasts are confined to a STAGE (not the real corner, as documented on the
 * page); the shipped NockerlToast owns hover/focus pause + Esc + the aria-live role; new
 * toasts also announce via the demo's polite live region; focus is NEVER stolen.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a var(--token)
 * (see docs/demo-token-contract.md). Literals remain only for pure geometry.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ALERT_INTENT, NockerlButton, NockerlToast, type NockerlToastIntent, type NockerlToastProps } from '@dizyx/nockerl-react';

// The per-intent trigger swatch color, single-sourced from the shared ALERT_INTENT map
// (the same source the shipped NockerlToast reads), so the demo's swatches can't drift from
// the toast's disc. `info` is the one place cyan is allowed; `notice` is the warm accent.
const INTENT_COLOR: Record<NockerlToastIntent, string> = {
  info: ALERT_INTENT.info.color,
  success: ALERT_INTENT.success.color,
  warning: ALERT_INTENT.warning.color,
  error: ALERT_INTENT.error.color,
  notice: ALERT_INTENT.notice.color,
};

// Demo chrome only: the contained stage + the corner viewport + the stack enter/exit slot
// choreography (the toast card itself, its disc/ring/countdown, and its motion are the
// shipped NockerlToast). Every value is a token.
const STYLES = `
.nk-to-demo { font-family: var(--font-family-sans); display: flex; flex-direction: column; gap: var(--space-5); }
.nk-to-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
/* trigger row: each severity spawns a toast; the trigger is the REAL secondary <NockerlButton>,
   its per-intent color carried by a small round SWATCH in the leading-icon slot. */
.nk-to-demo__row { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; }
.nk-to-demo__swatch { display: block; width: var(--space-2); height: var(--space-2);
  border-radius: var(--radius-pill); background: var(--sw); }
/* THE STAGE: a recessed well that CONFINES the toasts (vs. the real viewport corner).
   The backdrop is the app-CHROME surface, NOT the absolute-darkest canvas void.
   A neutral lift shadow (black tint) has nowhere to fall on near-black #0a0b0d, so the
   toast read FLAT in dark theme. Toasts float over app content/chrome, so this is also
   the honest framing, and on this tier the toast's own drop shadow finally registers. */
.nk-to-stage {
  position: relative; min-height: var(--size-container-md); border-radius: var(--radius-card);
  background: var(--color-chrome-surface); border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) var(--elevation-level2) color-mix(in srgb, var(--color-shadow-tint) 28%, transparent);
  overflow: hidden;
}
/* a faint "app behind the toasts" hint so the float reads as over-content */
.nk-to-stage__ghost { position: absolute; inset: 0; padding: var(--space-4);
  display: flex; flex-direction: column; gap: var(--space-3); pointer-events: none; }
.nk-to-stage__ghost span { height: var(--space-3); border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-on-canvas) 5%, transparent); }
.nk-to-stage__ghost span:nth-child(1) { width: 62%; }
.nk-to-stage__ghost span:nth-child(2) { width: 88%; }
.nk-to-stage__ghost span:nth-child(3) { width: 74%; }
.nk-to-stage__corner { position: absolute; top: var(--space-3); left: var(--space-4);
  font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); }
/* the toast viewport: bottom-right of the stage (echoes the Voice HUD anchor), newest on TOP. */
.nk-to-vp { position: absolute; right: var(--space-4); bottom: var(--space-4); left: var(--space-4);
  display: flex; flex-direction: column-reverse; align-items: flex-end; gap: var(--space-2);
  pointer-events: none; }
/* each toast sits in an animating SLOT (height collapse + fade + slide on exit). */
.nk-to-slot { display: grid; grid-template-rows: 1fr; width: 100%; max-width: var(--size-container-lg);
  transition: grid-template-rows .26s cubic-bezier(.2,0,0,1); }
/* the height-collapse CLIP must ROUND to the SAME radius as the toast surface below it.
   An overflow:hidden box with SQUARE corners clipped the toast's rounded card into sharp
   gray nubs at the bottom corners. Match the panel radius so every layer honors the same
   rounded corner. */
/* overflow is VISIBLE at rest so the toast's LIFT DROP SHADOW shows (an overflow:hidden clip
   here swallowed it whole, since the shadow renders OUTSIDE the toast box). overflow:hidden is only needed
   while the toast COLLAPSES on exit, so it moves to the --out rule below (rounding the shrink). */
.nk-to-clip { overflow: visible; min-height: 0; pointer-events: auto; border-radius: var(--radius-panel); }
.nk-to-slot--in .nk-to { animation: nk-to-enter .3s cubic-bezier(.2,0,0,1) both; }
.nk-to-slot--out { grid-template-rows: 0fr; }
.nk-to-slot--out .nk-to-clip { overflow: hidden; opacity: 0; transform: translateX(12px); transition: opacity .2s, transform .26s cubic-bezier(.2,0,0,1); }
@keyframes nk-to-enter { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
/* live status line + a "clear all" */
.nk-to-demo__foot { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
  font-size: var(--font-size-12); color: var(--color-on-canvas-muted); }
.nk-to-demo__foot b { color: var(--color-accent-primary); }
.nk-to-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) {
  .nk-to-slot, .nk-to-slot--out .nk-to-clip { transition: none; }
  .nk-to-slot--in .nk-to { animation: none; }
}
`;

// The queued toast DATA: the NockerlToastProps fields minus the render-time callbacks
// (onClose/onAction are supplied when the card is rendered), plus the demo queue's id/out.
type ToastData = Omit<NockerlToastProps, 'onClose' | 'onAction'>;
interface ToastInstance extends ToastData {
  id: number;
  out?: boolean; // mid-exit (slot collapsing), kept mounted until the animation ends
}

// Each preset spawns a representative toast; together they cover title+message vs
// message-only, with-action, with-icon, and a persistent (no-timeout) one.
type Preset = ToastData & { key: string; trigger: string };
const PRESETS: Preset[] = [
  { key: 'info', trigger: 'Info', intent: 'info', message: 'A new session opened on <b>api-server</b>.', duration: 5000 },
  { key: 'success', trigger: 'Success', intent: 'success', title: 'Deployed', message: '<b>nockerl-design</b> is live.', duration: 5000 },
  { key: 'warning', trigger: 'Warning', intent: 'warning', message: 'Local model unreachable. Using the cloud.', actionLabel: 'Retry', duration: 6000 },
  { key: 'error', trigger: 'Error', intent: 'error', title: 'Message failed to send', message: 'The gateway returned a 502.', actionLabel: 'Undo', duration: 0 },
  { key: 'notice', trigger: 'Notice', intent: 'notice', title: 'New', message: 'Agent spawning is now live.', actionLabel: 'See what changed', duration: 6000 },
];

/**
 * The interactive showcase mounted on the Toast page: severity triggers spawn toasts
 * INTO a contained stage (not the real corner). They STACK newest-on-top and auto-dismiss
 * via the disc's draining RING countdown that hover/focus PAUSES; each has an optional
 * action (Undo) + a close (X); one preset is persistent (a pinned marker, no ring, waits
 * for close). Esc dismisses; toasts announce via aria-live; focus is never stolen;
 * reduced-motion aware (the ring freezes to a static rim).
 */
export default function ToastDemo() {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);
  const [entering, setEntering] = useState<Record<number, boolean>>({});
  const [actionFires, setActionFires] = useState(0);
  const idRef = useRef(0);
  const announce = useRef<HTMLDivElement>(null);

  const remove = useCallback((id: number) => {
    // Mark out → let the slot collapse → unmount after the exit animation.
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, out: true } : t)));
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 280);
  }, []);

  const spawn = useCallback((p: ToastData & { trigger?: string }) => {
    const id = ++idRef.current;
    setToasts((list) => {
      const next = [...list, { ...p, id }];
      return next.slice(-4); // cap the visible stack at 4 (older ones drop)
    });
    setEntering((e) => ({ ...e, [id]: true }));
    window.setTimeout(() => setEntering((e) => ({ ...e, [id]: false })), 320);
    if (announce.current) {
      announce.current.textContent = `${p.title ? p.title + ': ' : ''}${(p.message ?? '').replace(/<[^>]+>/g, '')}`;
    }
  }, []);

  useEffect(() => () => setToasts([]), []); // clear any pending exit timers on unmount
  const liveCount = toasts.filter((t) => !t.out).length;

  return (
    <div className="nk-to-demo">
      <style>{STYLES}</style>
      <div>
        <p className="nk-to-demo__lbl">Spawn a toast: they stack, newest on top, and auto-dismiss</p>
        <div className="nk-to-demo__row">
          {PRESETS.map((p) => (
            <NockerlButton
              key={p.key}
              text={p.trigger}
              variant="secondary"
              size="sm"
              onClick={() => spawn(p)}
              leadingIcon={
                <span
                  className="nk-to-demo__swatch"
                  style={{ ['--sw' as string]: INTENT_COLOR[p.intent ?? 'info'] }}
                />
              }
            />
          ))}
        </div>
      </div>

      <div className="nk-to-stage" aria-label="Toast stage: notifications appear here (confined to the demo, not the real viewport corner)">
        <div className="nk-to-stage__ghost" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="nk-to-stage__corner" aria-hidden="true">stage · bottom-right</span>
        {/* the toast viewport: confined to the stage; bottom-right, newest on top */}
        <div className="nk-to-vp">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`nk-to-slot${t.out ? ' nk-to-slot--out' : ''}${entering[t.id] ? ' nk-to-slot--in' : ''}`}
            >
              <div className="nk-to-clip">
                <NockerlToast
                  message={t.message}
                  intent={t.intent}
                  title={t.title}
                  icon={t.icon}
                  actionLabel={t.actionLabel}
                  duration={t.duration}
                  onClose={() => remove(t.id)}
                  onAction={() => {
                    setActionFires((c) => c + 1);
                    remove(t.id);
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* polite live region: announces new toasts without stealing focus */}
        <div ref={announce} className="nk-to-sr" role="status" aria-live="polite" />
      </div>

      <div className="nk-to-demo__foot">
        <NockerlButton
          text="Clear all"
          variant="ghost"
          size="sm"
          disabled={liveCount === 0}
          onClick={() => toasts.forEach((t) => !t.out && remove(t.id))}
        />
        <span>
          {liveCount} live · action fired <b>{actionFires}</b> {actionFires === 1 ? 'time' : 'times'}. Hover or tab a
          toast to pause its countdown; Esc dismisses it.
        </span>
      </div>
    </div>
  );
}
