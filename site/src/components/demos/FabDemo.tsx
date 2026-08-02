/**
 * FabDemo: the live, interactive Nockerl floating-action-button island for web.
 *
 * Distinct from `button` and `icon-button`: a FAB FLOATS above the content,
 * pinned to a corner (bottom-right here), carries STRONGER elevation (the Level3
 * "floating chrome" tier the Android scroll-to-bottom FAB uses), and represents
 * the screen's single most important action. It reuses the icon-button send-slot
 * vocabulary (a solid cyan circle, `--color-on-accent` glyph, focus-ring, the
 * brightness+transform+shadow press feedback) but never re-skins it: the FAB is
 * its own corner-pinned, lifted affordance.
 *
 * Sourced from the real apps (read-only):
 *   • Android: chat/ui/ChatScreen.kt ships a corner-pinned `CircleShape`
 *     `NockerlSurface` at `NockerlElevation.Level3` (the scroll-to-bottom FAB). The
 *     canonical prominent-action slot (core/ui/NockerlIconButton.kt
 *     FILLED_CIRCLE) is a SOLID accent circle with a contrast-picked glyph, the
 *     look this primary FAB adopts.
 *   • Voice: RecordingHUD.swift has no literal FAB; its circular record/HUD
 *     affordance is the closest equivalent. Flagged as drift in the page.
 *
 * Implements the design laws verbatim:
 *   • a true CIRCLE for the round FAB; the control radius (12px) for the EXTENDED
 *     FAB and the speed-dial mini actions (rounded rect, never a broken pill).
 *   • depth = neutral shadow (Level3) + a top inset catch-light. NO glow, NO
 *     colored shadow, NO emission.
 *   • flash-free feedback: the fill is STATIC; hover/press animate brightness
 *     (filter) + transform + the neutral shadow only, never a fill swap.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   • icon-only FABs carry an aria-label; the speed-dial is a real menu
 *     (aria-expanded, Enter/Space to open, Esc to close, focus walks the items).
 *   • LOWERED / disabled state stays clearly visible (never faded to invisible).
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / elevation is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them;
 * change a token and this demo moves with everything else. Literals remain only
 * for pure geometry (icon dimensions, transition curves, shadow blur offsets).
 *
 * Self-contained: scoped CSS injected once via a `nk-fab` class; default-exports
 * the showcase. Does not import other demo components.
 */
import { useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';

import { NockerlButton, NockerlIcon, NockerlOverlay, type ComposeContract } from '@dizyx/nockerl-react';

export type FabSize = 'small' | 'standard' | 'large';

export interface FabProps {
  /** The glyph to render (inline SVG here; an ImageVector on Compose). */
  icon: ReactNode;
  /**
   * Accessible name. REQUIRED for the round (icon-only) FAB, which has no visible
   * text. The EXTENDED FAB shows `label`, which then also names it.
   */
  label: string;
  /** Optional visible text → renders the EXTENDED (icon + label) FAB. */
  extendedLabel?: string;
  /** Click handler. Ignored while disabled. */
  onClick?: () => void;
  /** Footprint: small (40) · standard (56) · large (72). */
  size?: FabSize;
  /** Lowered / inert state: clearly seen, never invisible; sheds its lift. */
  disabled?: boolean;
}

// One solid accent fill (the prominent-action look), a true circle for the round
// FAB and the control radius for the extended FAB. Level3 elevation (the floating
// tier) lifts it off the content; feedback never tweens the fill. Every visual
// value is a token; the dark stage resolves the cyan accent + on-accent label.
const STYLES = `
.nk-fab-demo { font-family: var(--font-family-sans); }

/* The corner-pinned action itself: solid cyan, lit from above (the inset top
   sheen is a catch-light, NOT a glow). Level3 floating-chrome elevation. */
.nk-fab {
  font-family: inherit;
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  border: var(--space-px) solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-primary);
  color: var(--color-on-accent);
  box-shadow:
    0 var(--elevation-level3) 24px -8px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent),
    0 var(--elevation-level1) var(--elevation-level2) -2px color-mix(in srgb, var(--color-shadow-tint) 45%, transparent),
    inset 0 var(--space-px) 0 var(--color-surface-highlight);
  transition: transform .14s cubic-bezier(.2,0,0,1), box-shadow .14s, filter .14s;
}
.nk-fab svg { display: block; }
.nk-fab:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-1); }
.nk-fab:hover:not(:disabled) {
  filter: brightness(1.06); transform: translateY(-2px);
  box-shadow:
    0 14px 30px -8px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent),
    0 var(--elevation-level1) var(--elevation-level2) -2px color-mix(in srgb, var(--color-shadow-tint) 45%, transparent),
    inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-fab:active:not(:disabled) {
  filter: brightness(.92); transform: translateY(0) scale(.96);
  box-shadow:
    0 var(--elevation-level2) var(--elevation-level3) -4px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent),
    inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 25%, transparent);
}
/* LOWERED / disabled: sheds the float (no lift shadow), stays clearly visible. */
.nk-fab:disabled {
  cursor: not-allowed;
  background: var(--color-card-surface3);
  color: var(--color-on-card-muted);
  border-color: var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) 0 color-mix(in srgb, var(--color-surface-highlight) 40%, transparent);
  filter: none; transform: none;
}

/* Round (icon-only) FAB: the one true circle. Sizes set width = height. */
.nk-fab--round { border-radius: var(--radius-pill); padding: 0; }
.nk-fab--small  { width: var(--space-10); height: var(--space-10); }
.nk-fab--standard { width: calc(var(--space-12) + var(--space-2)); height: calc(var(--space-12) + var(--space-2)); }   /* 56 */
.nk-fab--large  { width: calc(var(--space-16) + var(--space-2)); height: calc(var(--space-16) + var(--space-2)); }     /* 72 */
.nk-fab--small svg    { width: var(--space-5); height: var(--space-5); }      /* 20 */
.nk-fab--standard svg { width: var(--space-6); height: var(--space-6); }      /* 24 */
.nk-fab--large svg    { width: var(--space-8); height: var(--space-8); }      /* 32 */

/* EXTENDED FAB: icon + label, the control radius (rounded rect, not a pill). */
.nk-fab--extended {
  border-radius: var(--radius-control);
  gap: var(--space-2);
  height: calc(var(--space-12) + var(--space-2));   /* 56, matches standard */
  padding: 0 var(--space-5);
  font-size: var(--font-size-14);
  text-transform: uppercase;
  letter-spacing: var(--font-tracking-tight);
  font-weight: var(--font-weight-light);
}
.nk-fab--extended svg { width: var(--space-5); height: var(--space-5); }   /* 20; the label baseline aligns to the icon via center cross-axis */
.nk-fab__label { line-height: 1; }

/* ── The contained content-region STAGE, which proves the float / corner-pinning ── */
.nk-fab-stage {
  position: relative;
  height: calc(var(--space-16) * 3 + var(--space-12));   /* ~204, scales with the space ramp */
  border-radius: var(--radius-card);
  border: var(--space-px) solid var(--color-card-hairline);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface-highlight) 60%, transparent), transparent 64px),
    var(--color-canvas-alt);
  overflow: hidden;
}
/* Skeleton "content" lines so the FAB is visibly floating ABOVE a scroll region. */
.nk-fab-stage__content { position: absolute; inset: 0; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
.nk-fab-stage__line { height: var(--space-3); border-radius: var(--radius-pill); background: color-mix(in srgb, var(--color-on-card) 8%, transparent); }
.nk-fab-stage__line--w1 { width: 86%; } .nk-fab-stage__line--w2 { width: 64%; } .nk-fab-stage__line--w3 { width: 92%; }
.nk-fab-stage__line--w4 { width: 48%; } .nk-fab-stage__line--w5 { width: 76%; }
.nk-fab-stage__caption {
  position: absolute; top: var(--space-3); left: var(--space-4);
  font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold);
}
/* The pinned slot: consistent inset from the corner; items right-align to it. */
.nk-fab-anchor {
  position: absolute; right: var(--space-4); bottom: var(--space-4);
  display: flex; flex-direction: column; align-items: flex-end; gap: var(--space-3);
  z-index: 2;
}

/* ── Speed-dial: the trigger's corner wrapper; the mini-action STACK now lives inside the
   shared NockerlOverlay wrap (so the overlay owns the dim scrim + focus-trap + Esc + lifecycle),
   but keeps its OWN absolute corner anchor, right-aligned to the FAB and sitting one FAB-height +
   gap ABOVE it, measured from the STAGE (the overlay wrap is inset:0 of the stage). ── */
.nk-fab-speed { position: relative; }
.nk-fab-anchor--dial { z-index: 7; }   /* keep the trigger FAB lit ABOVE the overlay scrim (z 5) + wrap (z 6) */
.nk-fab-speed__items {
  position: absolute; right: var(--space-4);
  bottom: calc(var(--space-4) + var(--space-12) + var(--space-2) + var(--space-3));   /* anchor(16) + FAB(56) + gap(12) */
  display: flex; flex-direction: column; align-items: flex-end; gap: var(--space-3);
}
.nk-fab-speed__row {
  display: flex; align-items: center; gap: var(--space-3); justify-content: flex-end;
  opacity: 0; transform: translateY(var(--space-3)) scale(.9); pointer-events: none;
  transition: opacity .16s cubic-bezier(.2,0,0,1), transform .16s cubic-bezier(.2,0,0,1);
}
/* enter stagger keyed off the overlay's data-shown (mount -> next-frame flip -> animate in) */
.nk-fab-speed__items[data-shown="true"] .nk-fab-speed__row { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.nk-fab-speed__items[data-shown="true"] .nk-fab-speed__row:nth-child(1) { transition-delay: .02s; }
.nk-fab-speed__items[data-shown="true"] .nk-fab-speed__row:nth-child(2) { transition-delay: .06s; }
.nk-fab-speed__items[data-shown="true"] .nk-fab-speed__row:nth-child(3) { transition-delay: .10s; }
/* ── The mini-action = ONE cohesive affordance: a SINGLE lifted card-chip BUTTON
   (icon + label, one surface, one hit target), not a label chip + a separate unfilled icon
   button floating on the scrim. It composes NockerlButton (ghost) + this neutral lifted skin
   (cards lift, lit from above); the button's control radius keeps it a rounded rect, never a
   broken pill. The button owns the hit target, the focus ring, and role="menuitem". ── */
.nk-fab-speed__pill.nk-btn {
  white-space: nowrap;
  background: var(--color-card-surface2); color: var(--color-on-card);
  border-color: var(--color-card-hairline);
  box-shadow: 0 var(--elevation-level2) 14px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-fab-speed__pill.nk-btn:hover:not(:disabled) { background: var(--color-card-surface3); transform: translateY(-1px); }
.nk-fab-speed__pill.nk-btn:active:not(:disabled) { transform: translateY(0) scale(.985); }
/* the trigger glyph rotates + when the dial is open (interpolatable transform) */
.nk-fab__plus { transition: transform .2s cubic-bezier(.2,0,0,1); }
.nk-fab-speed--open .nk-fab__plus { transform: rotate(135deg); }
/* the open-dial backdrop dim + focus-trap + Esc + lifecycle come from the shared
   NockerlOverlay primitive (a flat --color-scrim dim, NO blur, which is a design law). */

@media (prefers-reduced-motion: reduce) {
  .nk-fab, .nk-fab-speed__row, .nk-fab__plus { transition: none; }
}

.nk-fab-demo__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4); }
.nk-fab-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-fab-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-fab-demo__count b { color: var(--color-accent-primary); }
`;

// ─── Inline glyphs (stroke icons on currentColor so every surface tints right) ──
// The trigger plus carries nk-fab__plus so the dial-open rotation animates the glyph.
const IconPlus = <NockerlIcon className="nk-fab__plus" path="M12 5v14M5 12h14" />;
const IconEdit = <NockerlIcon path="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />;
const IconChat = <NockerlIcon path="M21 11.5a8.4 8.4 0 0 1-11.8 7.7L3 21l1.8-6.2A8.4 8.4 0 1 1 21 11.5Z" />;
const IconMic = (
  <NockerlIcon>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </NockerlIcon>
);
const IconUpload = <NockerlIcon path="M12 16V4M7 9l5-5 5 5M5 20h14" />;
const IconBranch = (
  <NockerlIcon>
    <circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="7" r="2" />
    <path d="M6 7v10M18 9a6 6 0 0 1-6 6H8" />
  </NockerlIcon>
);

/** A single Nockerl FAB, the corner-pinned primary action the spec documents. */
export function Fab({ icon, label, extendedLabel, onClick, size = 'standard', disabled = false }: FabProps) {
  const isExtended = !!extendedLabel;
  const cls = isExtended ? 'nk-fab nk-fab--extended' : `nk-fab nk-fab--round nk-fab--${size}`;
  return (
    <button
      type="button"
      className={cls}
      disabled={disabled}
      aria-label={isExtended ? undefined : label}
      onClick={disabled ? undefined : onClick}
    >
      <span aria-hidden="true" style={{ display: 'inline-flex' }}>{icon}</span>
      {isExtended && <span className="nk-fab__label">{extendedLabel}</span>}
    </button>
  );
}

const SPEED_ACTIONS = [
  { id: 'chat', name: 'New chat', icon: IconChat },
  { id: 'voice', name: 'Voice note', icon: IconMic },
  { id: 'upload', name: 'Upload file', icon: IconUpload },
];

/**
 * The interactive showcase mounted on the FAB page. Every variant lives INSIDE a
 * contained content-region stage so the float + corner-pinning is provable: a
 * round FAB pinned bottom-right over scroll content; an EXTENDED (icon + label)
 * FAB; the small / standard / large sizes side by side; a working speed-dial that
 * expands to mini secondary actions on a backdrop scrim and collapses (Enter/Space
 * to open, Esc to close, focus walks the items); and a LOWERED / disabled FAB.
 * Keyboard-operable, focus-visible rings, honors prefers-reduced-motion.
 */
// LEAF (describes the Fab), owns ['button']: the floating action button is its own irreducible
// primitive identity (corner-pinned, Level3 float, distinct from NockerlButton/NockerlIconButton per the file
// header), so its raw <button> is correct here. `icon` is a glyph and `label`/`extendedLabel`
// plain text, so there are no component slots. Adds role=menu for the SpeedDial group container (its menuitems
// already compose NockerlIconButton).
export const compose = { tier: 'leaf', owns: ['button', 'role=menu'] } satisfies ComposeContract;

export default function FabDemo() {
  const [taps, setTaps] = useState(0);
  const [last, setLast] = useState('none yet');
  const [dialOpen, setDialOpen] = useState(false);
  // The stage element the speed-dial's NockerlOverlay dims + bounds its scrim to.
  const dialStageRef = useRef<HTMLDivElement>(null);
  const bump = (what: string) => {
    setTaps((c) => c + 1);
    setLast(what);
  };

  return (
    <div className="nk-fab-demo">
      <style>{STYLES}</style>

      <div className="nk-fab-demo__grid">
        {/* Round FAB pinned bottom-right of a content region */}
        <div>
          <p className="nk-fab-demo__lbl">Round: pinned to the corner, floating above content</p>
          <Stage caption="Session feed">
            <div className="nk-fab-anchor">
              <Fab icon={IconEdit} label="New session" onClick={() => bump('new session')} />
            </div>
          </Stage>
        </div>

        {/* Extended FAB: icon + label */}
        <div>
          <p className="nk-fab-demo__lbl">Extended: icon + label for the headline action</p>
          <Stage caption="Tasks">
            <div className="nk-fab-anchor">
              <Fab icon={IconPlus} label="New task" extendedLabel="New task" onClick={() => bump('new task')} />
            </div>
          </Stage>
        </div>
      </div>

      <p className="nk-fab-demo__lbl" style={{ marginTop: 'var(--space-5)' }}>
        Sizes: small (40) · standard (56) · large (72)
      </p>
      <Stage caption="Sizes" tall>
        <div className="nk-fab-anchor" style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Fab icon={IconBranch} label="Fork session (small)" size="small" onClick={() => bump('small')} />
          <Fab icon={IconBranch} label="Fork session (standard)" size="standard" onClick={() => bump('standard')} />
          <Fab icon={IconBranch} label="Fork session (large)" size="large" onClick={() => bump('large')} />
        </div>
      </Stage>

      <div className="nk-fab-demo__grid" style={{ marginTop: 'var(--space-5)' }}>
        {/* Speed-dial */}
        <div>
          <p className="nk-fab-demo__lbl">Speed-dial: expands to mini actions (Enter/Space · Esc to close)</p>
          <Stage caption="Create" tall stageRef={dialStageRef}>
            {/* SpeedDial renders its own corner anchor (the trigger) + the NockerlOverlay
                (the dimming scrim + the mini-action stack), both bounded to this stage. */}
            <SpeedDial
              open={dialOpen}
              onOpenChange={setDialOpen}
              onPick={(id) => bump(SPEED_ACTIONS.find((a) => a.id === id)?.name ?? id)}
              stage={dialStageRef.current}
            />
          </Stage>
        </div>

        {/* Lowered / disabled */}
        <div>
          <p className="nk-fab-demo__lbl">Lowered / disabled: sheds its lift, stays visible</p>
          <Stage caption="Read-only view" tall>
            <div className="nk-fab-anchor">
              <Fab icon={IconEdit} label="New session (unavailable)" disabled />
            </div>
          </Stage>
        </div>
      </div>

      <p className="nk-fab-demo__count">
        Last action: <b>{last}</b> · fired <b>{taps}</b> {taps === 1 ? 'time' : 'times'}. The island is live.
      </p>
    </div>
  );
}

/** A contained content-region with skeleton lines: the ground the FAB floats over.
 *  `stageRef` is the element the speed-dial's NockerlOverlay dims + bounds its scrim to. */
function Stage({
  caption,
  tall,
  children,
  stageRef,
}: {
  caption: string;
  tall?: boolean;
  children: ReactNode;
  stageRef?: RefObject<HTMLDivElement | null>;
}) {
  // The speed-dial / sizes stages need extra headroom for the expanded items.
  const style: CSSProperties = tall
    ? { height: 'calc(var(--space-16) * 3 + var(--space-16))' }
    : {};
  return (
    <div className="nk-fab-stage" style={style} ref={stageRef}>
      <div className="nk-fab-stage__content" aria-hidden="true">
        <div className="nk-fab-stage__line nk-fab-stage__line--w1" />
        <div className="nk-fab-stage__line nk-fab-stage__line--w3" />
        <div className="nk-fab-stage__line nk-fab-stage__line--w2" />
        <div className="nk-fab-stage__line nk-fab-stage__line--w5" />
        <div className="nk-fab-stage__line nk-fab-stage__line--w4" />
      </div>
      <span className="nk-fab-stage__caption">{caption}</span>
      {children}
    </div>
  );
}

/**
 * The speed-dial: a primary FAB that expands UPWARD into mini secondary actions,
 * right-aligned to the trigger. CONTROLLED: the page owns `open`.
 *
 * The dimming SCRIM + open/close LIFECYCLE + focus-TRAP + Esc-to-close + the
 * initial-focus move are the shared NockerlOverlay primitive now (bounded to `stage`,
 * a flat --color-scrim dim). The mini-action STACK is the overlay's panel. It keeps
 * its OWN absolute corner anchor (right-aligned to the FAB, above it) and its enter
 * stagger keyed off the overlay's `data-shown`. onDismiss (scrim tap / Esc) restores
 * focus to the trigger. The trigger FAB is NOT part of the overlay panel: it stays
 * corner-pinned and lit ABOVE the scrim, morphing plus -> x while the dial is open.
 * Real menu semantics: `aria-expanded` on the trigger, role="menu" on the stack.
 */
function SpeedDial({
  open,
  onOpenChange,
  onPick,
  stage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (id: string) => void;
  stage: HTMLElement | null;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  // Close + return focus to the trigger (used by scrim tap, Esc, and picking an item).
  const dismiss = () => {
    onOpenChange(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      {/* The mini-action STACK is the overlay's panel: the overlay owns the dim + trap +
          Esc + lifecycle; the stack keeps its own absolute corner anchor (relative to the
          stage, via the overlay wrap's inset:0). initialFocusRef lands focus on item one. */}
      <NockerlOverlay
        open={open}
        onDismiss={dismiss}
        stage={stage}
        dim
        initialFocusRef={firstItemRef}
        scrimLabel="Close actions"
      >
        {({ panelRef, panelProps }) => (
          <div
            className="nk-fab-speed__items"
            ref={panelRef as RefObject<HTMLDivElement>}
            role="menu"
            aria-label="Create"
            {...panelProps}
          >
            {SPEED_ACTIONS.map((a, i) => (
              <div className="nk-fab-speed__row" key={a.id}>
                {/* ONE cohesive mini-action: a single NockerlButton (icon + label, one lifted
                    surface, one hit target). It forwards role="menuitem", the ref (initial
                    focus) and its accessible name to the underlying <button>, so the dial's
                    menu semantics + focus walk are preserved without a hand-rolled control. */}
                <NockerlButton
                  className="nk-fab-speed__pill"
                  variant="ghost"
                  size="sm"
                  leadingIcon={a.icon}
                  text={a.name}
                  role="menuitem"
                  ref={i === 0 ? firstItemRef : undefined}
                  onClick={() => {
                    onPick(a.id);
                    dismiss();
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </NockerlOverlay>

      {/* The trigger FAB stays corner-pinned, lit ABOVE the scrim (its own primitive identity). */}
      <div className="nk-fab-anchor nk-fab-anchor--dial">
        <div className={`nk-fab-speed${open ? ' nk-fab-speed--open' : ''}`}>
          <button
            type="button"
            ref={triggerRef}
            className="nk-fab nk-fab--round nk-fab--standard"
            aria-label={open ? 'Close create menu' : 'Create'}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => onOpenChange(!open)}
          >
            <span aria-hidden="true" style={{ display: 'inline-flex' }}>{IconPlus}</span>
          </button>
        </div>
      </div>
    </>
  );
}
