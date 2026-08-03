/**
 * LongPressPopDemo: the live, interactive Nockerl LONG-PRESS contextual pop for web.
 *
 * Press-and-hold (or right-click, or a keyboard affordance) a CONTENT element to
 * "pop" a compact contextual menu over a dimmed backdrop: the target lifts above the
 * scrim, gets the selection treatment, and an anchored Copy · Select · Share ·
 * destructive-Delete list appears beside it. The iOS context-menu / Android
 * long-press action-sheet pattern, DISTINCT from the centered Dialog, the
 * bottom-edge Bottom sheet, and the command palette: gesture-triggered ON an item,
 * anchored TO it.
 *
 * The MENU machinery is the shared NockerlMenu engine driven POINT-anchored: the
 * gesture / right-click / keyboard all call `api.openAt(clientX, clientY, …)` (a
 * zero-size anchor at the press point), `dim` supplies the modal ground scrim, and
 * `onActivate` runs the host action then closes. The anchored surface, flip/clamp,
 * roving keyboard model, Esc, focus-trap, and close-restore all live in NockerlMenu.
 *
 * Sourced from the REAL apps (read-only): Android `core/ui/LongPressPop.kt` holds the
 * canonical `Modifier.longPressPop`: a press-down scale DIP (1 → 0.96), then on the
 * long-press a short haptic (HapticFeedbackType.LongPress) + a radial accent ripple
 * from the touch point + the caller's onLongPress (which opens the menu); the chat
 * `MessageBubble.kt` long-press itself copies via combinedClickable(onLongClick).
 * Voice `UI/HistoryView.swift` uses `.contextMenu { NockerlButton("Copy"); NockerlButton("Delete",
 * role: .destructive) }`. Selection look + trigger copy reused from ChatBubbleDemo
 * ("Long-press / tap to select me" → cyan ring + faint wash); scrim + lifted-card +
 * focus-trap vocabulary reused from Dialog / Bottom sheet.
 *
 * Laws: DEPTH = neutral tinted shadow + top catch-light, NEVER a glow. The lifted
 * target keeps its OWN surface, the menu is an elevated surface with the neutral
 * shadow token. The SCRIM is a flat palette dim (--color-scrim), fades OPACITY only.
 * flash-free: fills static, only scale/opacity/transform animate (the hold = a
 * continuous scale toward the dip, mirroring the Compose pulse); reduced-motion
 * FREEZES the lift/scale/scrim but still opens. selection = cyan ring + faint accent
 * wash; the destructive Delete uses the danger token, SEPARATED by a divider.
 * TOKEN-REACTIVE: every color/font/radius/spacing/type is a `var(--token)`; literals
 * remain only for pure geometry (icon sizes, hold duration, shadow blur, curves, math).
 */
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NockerlFacetedBackground, NockerlIcon, NockerlIconButton, NockerlKbd, NockerlMenu, type ComposeContract, type MenuItem, type MenuTriggerApi } from '@dizyx/nockerl-react';

// Press-hold threshold (ms, mirrors the platform long-press), and the scale ramp:
// rest 1 → dip 0.96 while held (Compose POP_DIP_SCALE) → lift 1.03 once popped.
const HOLD_MS = 500;
const REST_SCALE = 1;
const DIP_SCALE = 0.96;
const LIFT_SCALE = 1.03;

const STYLES = `
.nk-lp-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
.nk-lp-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-lp-demo__hint { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin: var(--space-1) 0 var(--space-3); }
/* key hints compose the real NockerlKbd raised keycap; no hand-rolled <kbd> style here. */
.nk-lp-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-lp-demo__count b { color: var(--color-accent-primary); }
/* The contained STAGE: the pop lives in HERE; it never takes over the page. */
/* This stage keeps its own rule (uses --color-chat-bg, not the shared utility's --color-canvas). */
.nk-lp-stage { position: relative; width: 100%; max-width: 480px; min-height: var(--size-container-lg); margin-inline: auto; border-radius: calc(var(--radius-card) + var(--space-2)); overflow: hidden; isolation: isolate; background: radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--color-card-surface1) 70%, transparent), transparent 60%), var(--color-chat-bg); border: var(--space-px) solid var(--color-card-hairline); box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight), 0 var(--elevation-level3) 28px -12px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent); }
/* task 2669: children layer above the bare facet ground */
.nk-lp-stage > :not(.nk-fb-surface) { position: relative; }
.nk-lp-board { position: relative; z-index: 1; display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-5) var(--space-4); min-height: var(--size-container-lg); }
.nk-lp-board__cap { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); }
/* a TARGET (a content element you press-and-hold) keeps its OWN surface always; scale dips while held, lifts when popped. */
.nk-lp-target { position: relative; align-self: flex-start; max-width: min(82%, 360px); -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; touch-action: none; font: inherit; text-align: left; cursor: context-menu; color: var(--color-on-card-alt); background: var(--color-card-alt); border: var(--space-px) solid var(--color-alt-hairline); border-radius: var(--radius-bubble-tail) var(--radius-bubble) var(--radius-bubble) var(--radius-bubble); padding: var(--space-3); font-size: var(--font-size-14); line-height: var(--font-line-height-20); box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight); transform: scale(var(--nk-lp-scale, 1)); transform-origin: left center; transition: transform .12s cubic-bezier(.2,0,0,1), box-shadow .14s, filter .12s; }
.nk-lp-target p { margin: 0; }
.nk-lp-target code { font-family: var(--font-family-mono); font-size: var(--font-size-12); background: color-mix(in srgb, currentColor 12%, transparent); border-radius: var(--radius-track); padding: var(--space-0-5) var(--space-1); }
.nk-lp-target--row { align-self: stretch; max-width: none; display: flex; align-items: center; gap: var(--space-3); transform-origin: center; background: var(--color-card-surface1); color: var(--color-on-card); border-color: var(--color-card-hairline); border-radius: var(--radius-card); }
.nk-lp-target:hover { filter: brightness(1.03); }
.nk-lp-target:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
/* the hold ACK: a faint accent ripple bloom from the touch point (mirrors the Compose POP ripple), opacity-faded */
.nk-lp-target::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient(circle at var(--nk-lp-rx, 50%) var(--nk-lp-ry, 50%), color-mix(in srgb, var(--color-accent-primary) 28%, transparent), transparent 60%); opacity: var(--nk-lp-ripple, 0); transition: opacity .18s ease; }
/* the lifted (popped) target rises above the scrim, keeps its surface + gets the SELECTION ring + faint accent wash (NOT a glow) */
.nk-lp-target--lifted { z-index: 30; cursor: default; --nk-lp-scale: var(--nk-lp-lift, 1.03); outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); box-shadow: 0 var(--elevation-sheet) 40px -10px color-mix(in srgb, var(--color-shadow-tint) 62%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-lp-target--lifted.nk-lp-target { background: color-mix(in srgb, var(--color-accent-primary) 12%, var(--color-card-alt)); }
.nk-lp-target--lifted.nk-lp-target--row { background: color-mix(in srgb, var(--color-accent-primary) 10%, var(--color-card-surface1)); }
/* a persistently-selected target (after Select). LAW 6: NO left rail. Selection reads
   from a faint full accent WASH mixed into the target's own surface + a trailing cyan
   check glyph (a mark, never a vertical stripe / halo). */
.nk-lp-target--selected.nk-lp-target { background: color-mix(in srgb, var(--color-accent-primary) 10%, var(--color-card-alt)); }
.nk-lp-target--selected.nk-lp-target--row { background: color-mix(in srgb, var(--color-accent-primary) 8%, var(--color-card-surface1)); }
/* the trailing selection check: a cyan mark pinned at the target's trailing edge (mirrors
   NockerlListItem's leading check idiom); sits clear of the reveal-on-hover ⋯ affordance. */
.nk-lp-check { position: absolute; top: var(--space-2); right: var(--space-2); display: inline-flex; color: var(--color-accent-primary); pointer-events: none; }
.nk-lp-check svg { display: block; width: var(--space-4); height: var(--space-4); }
.nk-lp-target--row .nk-lp-check { position: static; margin-inline-start: auto; align-self: center; }
/* the "⋯" affordance is now the PLAIN NockerlIconButton primitive (it owns its resting / hover /
   press / focus recipe + the 24px box via size). The demo keeps only the pinned position,
   the reveal-on-hover, the subtle pill wash + the 16px glyph - demo-root prefixed so these
   out-specify .nk-ico--plain (injected later in the DOM). */
.nk-lp-demo .nk-lp-more { position: absolute; top: var(--space-1); right: var(--space-1); background: color-mix(in srgb, var(--color-on-card) 8%, transparent); color: var(--color-on-card-muted); border-radius: var(--radius-pill); opacity: 0; transition: opacity .12s, background-color .12s, color .12s; }
.nk-lp-target:hover .nk-lp-more, .nk-lp-target:focus-within .nk-lp-more, .nk-lp-demo .nk-lp-more:focus-visible { opacity: 1; }
.nk-lp-demo .nk-lp-more:hover { background: color-mix(in srgb, var(--color-on-card) 16%, transparent); color: var(--color-on-card); }
.nk-lp-demo .nk-lp-more svg { display: block; width: var(--space-4); height: var(--space-4); }
.nk-lp-tile { flex: 0 0 auto; width: var(--space-10); height: var(--space-10); border-radius: var(--radius-control); display: inline-flex; align-items: center; justify-content: center; background: var(--color-card-surface3); color: var(--color-accent-primary); }
.nk-lp-tile svg { display: block; width: 18px; height: 18px; }
.nk-lp-row__txt { display: flex; flex-direction: column; gap: var(--space-0-5); min-width: 0; flex: 1 1 auto; }
.nk-lp-row__pri, .nk-lp-row__sec { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nk-lp-row__pri { font-size: var(--font-size-14); font-weight: var(--font-weight-medium); color: var(--color-on-card); }
.nk-lp-row__sec { font-size: var(--font-size-12); color: var(--color-on-card-muted); }
/* the transient "did X" confirmation toast: pinned inside the stage, status tone (success / danger) */
.nk-lp-toast { position: absolute; z-index: 40; left: 50%; bottom: var(--space-4); transform: translateX(-50%); display: inline-flex; align-items: center; gap: var(--space-2); background: var(--color-card-surface3); color: var(--color-on-card); border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-pill); padding: var(--space-2) var(--space-4); font-size: var(--font-size-12); font-weight: var(--font-weight-medium); box-shadow: 0 var(--elevation-level2) 14px -6px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight); animation: nk-lp-toast .22s cubic-bezier(.2,0,0,1) both; }
.nk-lp-toast svg { display: block; width: 15px; height: 15px; flex: 0 0 auto; color: var(--color-status-success); }
.nk-lp-toast--danger svg { color: var(--color-status-error); }
.nk-lp-toast b { font-weight: var(--font-weight-semibold); }
@keyframes nk-lp-toast { from { opacity: 0; transform: translate(-50%, var(--space-2)); } to { opacity: 1; transform: translate(-50%, 0); } }
@media (prefers-reduced-motion: reduce) {
  .nk-lp-target, .nk-lp-more, .nk-lp-target::after { transition: none; }
  .nk-lp-toast { animation: none; }
}
`;

// ─── Inline stroke glyphs (currentColor so each slot tints from its token) ──
const IconCopy = <NockerlIcon><path d="M11 9h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></NockerlIcon>;
const IconSelect = <NockerlIcon path="M20 6 9 17l-5-5" />;
const IconShare = <NockerlIcon><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" /></NockerlIcon>;
const IconTrash = <NockerlIcon><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" /></NockerlIcon>;
const IconMore = <NockerlIcon path="M5 12h.01M12 12h.01M19 12h.01" />;
const IconCheck = <NockerlIcon path="M20 6 9 17l-5-5" />;
const IconBolt = <NockerlIcon path="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />;

/** The action list, identical on both targets: Copy · Select · Share · (divider) Delete.
    Plain DATA (MenuItem[]) the NockerlMenu engine renders; Delete is the destructive tail
    (danger token + a divider above). */
const MENU_ITEMS: MenuItem[] = [
  { id: 'copy', label: 'Copy', icon: IconCopy },
  { id: 'select', label: 'Select', icon: IconSelect },
  { id: 'share', label: 'Share', icon: IconShare },
  { id: 'delete', label: 'Delete', icon: IconTrash, danger: true, dividerAbove: true },
];

// The transient "did X" confirmation payload.
interface Toast { verb: string; target: string; danger: boolean }

// LongPressPop is a CONTAINER that wraps the pressable target CONTENT → default '*'; its action list
// is DATA (MenuItem[]) rendered by the NockerlMenu engine. It drives NockerlMenu POINT-anchored (`openAt`) with
// `dim` for the modal ground scrim, and composes the real NockerlIconButton (the "⋯" affordance). The
// targets legitimately use role="button" (a pressable content element is not a NockerlButton facsimile).
// The MENU (surface + scrim + roving + Esc + close) belongs to NockerlMenu; the LONG-PRESS GESTURE,
// the target LIFT / selection ring, and the "did X" toast stay owned here (the pattern's own identity).
export const compose = {
  slots: { default: { accepts: '*' } },
} satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Long-press pop page: a contained stage
 * holding two real targets (a chat bubble and a list row), each PRESS-AND-HELD (~500ms,
 * with a live scale dip), RIGHT-CLICKED, or opened from the keyboard (focus + Enter /
 * Space / Menu / Shift+F10, or the visible ⋯). Holding pops the NockerlMenu engine
 * POINT-anchored over its dim ground scrim, lifts the target with the cyan selection
 * ring, and shows a Copy · Select · Share · destructive-Delete menu beside it (clamped
 * inside the stage). Arrow keys move, Enter activates, Esc closes; focus is trapped then
 * restored to the target. Activating an action shows a "did X" confirmation. Token-driven;
 * lift/scale/scrim freeze under prefers-reduced-motion.
 */
export default function LongPressPopDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Which target the point-anchored menu is currently open for (set at open time; read
  // back in onActivate + to paint the lift). NockerlMenu's openTrigger is always '__point__'
  // for a point-anchored open, so the specific target is tracked here.
  const activeTarget = useRef<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [opens, setOpens] = useState(0);
  // Per-target press progress (0 → 1) drives the live scale dip; ripple = the touch
  // point (% within the target) + a bloom flag for the long-press ACK.
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [ripple, setRipple] = useState<Record<string, { x: number; y: number; on: boolean }>>({});
  const holdTimer = useRef<number | null>(null);
  const holdRaf = useRef<number | null>(null);
  const longFired = useRef(false);
  const toastTimer = useRef<number | null>(null);

  const clearHold = useCallback(() => {
    if (holdTimer.current != null) window.clearTimeout(holdTimer.current);
    if (holdRaf.current != null) cancelAnimationFrame(holdRaf.current);
    holdTimer.current = null;
    holdRaf.current = null;
  }, []);

  // Open the NockerlMenu POINT-anchored at a client point (the engine computes stage-local
  // px + clamps after mount). Records which target it's for + bumps the open counter.
  const openAtPoint = useCallback(
    (api: MenuTriggerApi, target: string, clientX: number, clientY: number, opener: HTMLElement, viaKeyboard: boolean) => {
      activeTarget.current = target;
      longFired.current = true;
      setProgress((p) => ({ ...p, [target]: 0 }));
      setOpens((n) => n + 1);
      api.openAt(clientX, clientY, MENU_ITEMS, opener, viaKeyboard);
    },
    [],
  );

  // Host-owned activation (NockerlMenu calls this, then closes the menu): Select toggles
  // persistent selection, Delete clears it; each shows a transient "did X" toast.
  const runAction = useCallback(
    (item: MenuItem) => {
      const target = activeTarget.current;
      if (!target) return;
      const wasSel = !!selected[target];
      if (item.id === 'select') setSelected((s) => ({ ...s, [target]: !s[target] }));
      if (item.id === 'delete') setSelected((s) => ({ ...s, [target]: false }));
      const verb =
        item.id === 'copy' ? 'Copied'
        : item.id === 'select' ? (wasSel ? 'Deselected' : 'Selected')
        : item.id === 'share' ? 'Shared'
        : 'Deleted';
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
      setToast({ verb, target, danger: !!item.danger });
      toastTimer.current = window.setTimeout(() => setToast(null), 1600);
    },
    [selected],
  );

  // Pointer long-press: dip the scale over a ~500ms timer (rAF), then on expiry fire
  // the ripple ACK + open the menu. A normal short press just resets (no pop).
  const startHold = useCallback(
    (api: MenuTriggerApi, target: string, e: React.PointerEvent<HTMLElement>) => {
      if (api.openTrigger) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return; // right-click → onContextMenu
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const rx = ((e.clientX - rect.left) / rect.width) * 100;
      const ry = ((e.clientY - rect.top) / rect.height) * 100;
      setRipple((r) => ({ ...r, [target]: { x: rx, y: ry, on: false } }));
      longFired.current = false;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort */
      }
      const start = performance.now();
      const tick = () => {
        const t = Math.min(1, (performance.now() - start) / HOLD_MS);
        setProgress((p) => ({ ...p, [target]: t }));
        if (t < 1) holdRaf.current = requestAnimationFrame(tick);
      };
      holdRaf.current = requestAnimationFrame(tick);
      holdTimer.current = window.setTimeout(() => {
        // long-press recognized: fire the ripple ACK, then pop the menu
        setRipple((r) => ({ ...r, [target]: { x: rx, y: ry, on: true } }));
        window.setTimeout(() => setRipple((r) => ({ ...r, [target]: { x: rx, y: ry, on: false } })), 380);
        openAtPoint(api, target, e.clientX, e.clientY, el, false);
      }, HOLD_MS);
    },
    [openAtPoint],
  );

  const endHold = useCallback(
    (target: string) => {
      clearHold();
      if (!longFired.current) setProgress((p) => ({ ...p, [target]: 0 }));
    },
    [clearHold],
  );

  useEffect(() => () => {            // cleanup pending timers on unmount
    clearHold();
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
  }, [clearHold]);

  // Continuous scale: rest → dip while held (mirrors the Compose pulse), lift when popped.
  const scaleFor = (target: string, popped: boolean) => {
    if (popped) return LIFT_SCALE;
    return REST_SCALE + (DIP_SCALE - REST_SCALE) * (progress[target] ?? 0);
  };

  const rippleVars = (target: string, popped: boolean): CSSProperties => {
    const r = ripple[target];
    return {
      '--nk-lp-scale': String(scaleFor(target, popped)),
      '--nk-lp-lift': String(LIFT_SCALE),
      '--nk-lp-ripple': r?.on ? 1 : 0,
      '--nk-lp-rx': r ? `${r.x}%` : '50%',
      '--nk-lp-ry': r ? `${r.y}%` : '50%',
    } as CSSProperties;
  };

  // A target's keyboard entry: Enter / Space / Menu key / Shift+F10 open at its center.
  const onTargetKeyDown = useCallback(
    (api: MenuTriggerApi, target: string, e: React.KeyboardEvent<HTMLElement>) => {
      const k = e.key;
      if (!(k === 'Enter' || k === ' ' || k === 'ContextMenu' || (e.shiftKey && k === 'F10'))) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      openAtPoint(api, target, rect.left + rect.width / 2, rect.top + rect.height / 2, e.currentTarget, true);
    },
    [openAtPoint],
  );

  // Shared props applied to a pressable target. `popped` = this target owns the open menu.
  const targetProps = (api: MenuTriggerApi, target: string, popped: boolean): React.HTMLAttributes<HTMLElement> => ({
    tabIndex: 0,
    role: 'button',
    'aria-haspopup': 'menu',
    'aria-expanded': popped,
    onPointerDown: (e) => startHold(api, target, e),
    onPointerUp: () => endHold(target),
    onPointerLeave: () => endHold(target),
    onPointerCancel: () => endHold(target),
    onContextMenu: (e) => {
      e.preventDefault();
      clearHold();
      openAtPoint(api, target, e.clientX, e.clientY, e.currentTarget as HTMLElement, false);
    },
    onKeyDown: (e) => onTargetKeyDown(api, target, e),
  });

  // The visible "⋯" affordance is a mouse + a11y entry point opening the menu at the
  // ⋯ button's own rect (centered for the bubble, left for the row). The real PLAIN
  // NockerlIconButton primitive (it owns its resting / hover / press / focus recipe); the demo
  // keeps only the pinned position + reveal-on-hover chrome via the .nk-lp-more class.
  const moreButton = (api: MenuTriggerApi, target: string, label: string, center: boolean) => (
    <NockerlIconButton
      icon={IconMore}
      label={label}
      variant="plain"
      size={24}
      className="nk-lp-more"
      aria-haspopup="menu"
      tabIndex={-1}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        openAtPoint(api, target, center ? r.left + r.width / 2 : r.left, r.bottom, e.currentTarget.parentElement as HTMLElement, true);
      }}
    />
  );

  return (
    <div className="nk-lp-demo nk-mn-demo">
      <style>{STYLES}</style>
      <p className="nk-lp-demo__lbl">Press &amp; hold a target to pop its actions</p>
      <p className="nk-lp-demo__hint">
        Hold ~0.5s (watch it dip), right-click, or focus it and press{' '}
        <NockerlKbd>Enter</NockerlKbd> / <NockerlKbd>Menu</NockerlKbd> / <NockerlKbd>Shift</NockerlKbd>+<NockerlKbd>F10</NockerlKbd>{' '}
        (or its ⋯). In the menu: <NockerlKbd>↑</NockerlKbd> <NockerlKbd>↓</NockerlKbd> move,{' '}
        <NockerlKbd>Enter</NockerlKbd> runs, <NockerlKbd>Esc</NockerlKbd> closes.
      </p>
      <div className="nk-lp-stage" ref={stageRef}>
        {/* the REAL faceted chat ground (task 2669) */}
        <NockerlFacetedBackground bare aria-hidden="true" />
        {/* the NockerlMenu engine, driven POINT-anchored (openAt) with a modal `dim` scrim;
            onActivate runs the host action, then NockerlMenu closes + restores focus. The two
            pressable targets + their ⋯ triggers are the demo-owned render child, so they
            re-render with the menu's open state (openTrigger). */}
        <NockerlMenu stageRef={stageRef} triggerRefs={triggerRefs} dim onActivate={runAction}>
          {(api) => {
            // The point-anchored menu uses the '__point__' trigger id; the specific target
            // it's open for is tracked in activeTarget (set at open time).
            const openFor = api.openTrigger != null ? activeTarget.current : null;
            return (
              <div className="nk-lp-board">
                <span className="nk-lp-board__cap">Chat · nockerl-design</span>

                {/* TARGET 1: a chat bubble (the canonical long-press target). */}
                <div
                  className={`nk-lp-target${openFor === 'bubble' ? ' nk-lp-target--lifted' : ''}${selected['bubble'] ? ' nk-lp-target--selected' : ''}`}
                  style={rippleVars('bubble', openFor === 'bubble')} {...targetProps(api, 'bubble', openFor === 'bubble')}
                >
                  <p>Routing every session through <code>the credential store</code> for credentials. Ship it.</p>
                  {selected['bubble'] && <span className="nk-lp-check" aria-hidden="true">{IconCheck}</span>}
                  {moreButton(api, 'bubble', 'Message actions', true)}
                </div>

                {/* TARGET 2: a list row (same pop, anchored to a wider element). */}
                <div
                  className={`nk-lp-target nk-lp-target--row${openFor === 'row' ? ' nk-lp-target--lifted' : ''}${selected['row'] ? ' nk-lp-target--selected' : ''}`}
                  style={rippleVars('row', openFor === 'row')} {...targetProps(api, 'row', openFor === 'row')}
                >
                  <span className="nk-lp-tile" aria-hidden="true">{IconBolt}</span>
                  <span className="nk-lp-row__txt">
                    <span className="nk-lp-row__pri">gateway refactor · backoff</span>
                    <span className="nk-lp-row__sec">Idle · last active 12m ago</span>
                  </span>
                  {selected['row'] && <span className="nk-lp-check" aria-hidden="true">{IconCheck}</span>}
                  {moreButton(api, 'row', 'Session actions', false)}
                </div>
              </div>
            );
          }}
        </NockerlMenu>

        {/* the "did X" confirmation toast: status tone (success / danger). */}
        {toast && (
          <div className={`nk-lp-toast${toast.danger ? ' nk-lp-toast--danger' : ''}`} role="status">
            {toast.danger ? IconTrash : IconCheck}
            <span><b>{toast.verb}</b> {toast.target === 'bubble' ? 'message' : 'session'}</span>
          </div>
        )}
      </div>

      <p className="nk-lp-demo__count">
        NockerlMenu opened <b>{opens}</b> {opens === 1 ? 'time' : 'times'} · selected:{' '}
        <b>{Object.entries(selected).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}</b>{' '}
        · pointer, right-click, and keyboard all work; the island is live.
      </p>
    </div>
  );
}
