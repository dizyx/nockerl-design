/**
 * SplitButtonDemo: the live, interactive Nockerl SPLIT BUTTON island for web.
 *
 * TWO connected segments share ONE control-radius silhouette with a hairline
 * divider between: the PRIMARY segment fires the default action DIRECTLY (a normal
 * button; shows a "did X" confirmation); the CARET segment is a smaller toggle
 * that opens an ANCHORED menu of alternatives, and picking one runs it AND becomes
 * the new default. DISTINCT from its catalog neighbours. NockerlButton is one action
 * with no menu, NockerlMenu is a trigger that ONLY opens a popover, NockerlIconButton is
 * one glyph, Fab is a floating circle + speed-dial; the split button is the JOIN of a
 * default action welded to a menu of variants.
 *
 * Sourced from the REAL apps (read-only). Neither ships a literal split button, so
 * this is designed ORIGINALLY from the shipped button + menu vocabulary: the
 * fills/variants reuse `core/ui/NockerlButton.kt` (PRIMARY filled gradient,
 * SECONDARY/tonal accent-soft + cyan hairline, TERTIARY outline, DESTRUCTIVE
 * outline-red; see ButtonDemo); the caret + anchored flip/clamp popover + roving
 * rows reuse the menu vocabulary from `chat/ui/SessionCreationDropdowns.kt`'s
 * ExposedDropdownMenuBox and Voice's `UI/AppSettingsView.swift` `NockerlMenu { NockerlButton {
 * Label(_, systemImage: "checkmark") } }` (checked = leading-checkmark, here
 * marking the default; see MenuDemo / IconButtonDemo); the caret glyph mirrors
 * Compose's `Icons.Filled.ArrowDropDown`.
 *
 * The dropdown-menu ENGINE (the anchored surface, flip/clamp positioning, focus-trap /
 * roving keyboard, outside-click scrim, item-row recipe) now lives in the `NockerlMenu`
 * primitive; this island supplies the contained stage, the WELDED two-segment split
 * triggers (main + caret sharing one silhouette, 4 variants), the alternative-action
 * DATA, and the run-AND-promote-to-default semantics, driven through NockerlMenu's
 * `onActivate` (host-owned activation) + `current` (leading check on the current
 * default). The welded silhouette + its own styling stay demo-owned.
 *
 * Laws: DEPTH = neutral tinted shadow + top catch-light, NEVER a glow. flash-free:
 * fills are STATIC; hover/press/open animate brightness + transform + shadow +
 * scale/opacity only, never a fill swap. focus = an OUTLINE ring. The divider is
 * a token hairline (on-accent-soft on the filled variant; on-card elsewhere). 12px
 * control radius: a rounded rectangle, never a pill. TOKEN-REACTIVE: every
 * color/font/radius/spacing/type is a `var(--token)`; literals remain only for
 * pure geometry (icon px, blur, curves). reduced-motion FREEZES the open.
 */
import { useCallback, useId, useRef, useState } from 'react';
import { NockerlIcon, NockerlKbd, NockerlMenu, type ComposeContract, type MenuItem, type MenuTriggerApi } from '@dizyx/nockerl-react';

export type SplitVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
export type SplitSize = 'sm' | 'md';

// One menu action = one alternative the caret offers. Selecting it runs the action
// and (unless it opts out) becomes the new default fired by the primary segment.
// A MenuItem for NockerlMenu (id/label/icon/danger/dividerAbove) plus one demo-owned flag:
interface SplitAction extends MenuItem {
  keepDefault?: boolean; // run it, but do NOT promote it to the new default
}

const STYLES = `
.nk-sb-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
.nk-sb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-sb-demo__hint { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin: var(--space-1) 0 var(--space-3); }
/* key hints compose the real NockerlKbd raised keycap. No hand-rolled <kbd> style here. */
.nk-sb-demo__row { display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: center; }
.nk-sb-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-sb-demo__count b { color: var(--color-accent-primary); }

/* The contained STAGE: every menu opens INSIDE here, clamped to it (never the page).
   Shared panel chrome lives in 'nk-demo-overlay-stage' (theme.css); only this demo's
   footprint (max-width / min-height) stays here. */
.nk-sb-stage { max-width: 560px; min-height: 248px; }
/* a faux toolbar holding the split buttons, with corners spread so anchoring/flip varies. */
.nk-sb-bar { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); padding: var(--space-5); min-height: 248px; }
.nk-sb-bar__col { display: flex; flex-direction: column; gap: var(--space-4); align-items: flex-start; }
.nk-sb-bar__col--end { align-items: flex-end; }
.nk-sb-bar__cap { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); }

/* ── THE SPLIT BUTTON: two segments share ONE silhouette, a hairline seam between ── */
/* The group: one shell. align-items:center (NOT stretch). Both segments carry the SAME height token, so a shared midline renders them identical. */
.nk-sb { display: inline-flex; align-items: center; border-radius: var(--radius-control); position: relative; isolation: isolate; }
/* Each segment is a real button; they butt together, the group rounds the OUTER corners.
   BUG FIX (not a height bug; both segments measure 40px): Starlight's docs content-flow rule adds margin-top to the second adjacent button (the caret), dropping it so it overhangs main top+bottom. Real fix = the not-content opt-out class on the group (zero added specificity); margin:0 backstops other host flow CSS. */
.nk-sb__seg { box-sizing: border-box; margin: 0; font-family: inherit; font-weight: var(--font-weight-semibold); line-height: 1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); border: var(--space-px) solid transparent; background: transparent; color: inherit; position: relative; transition: filter .12s, transform .12s cubic-bezier(.2,0,0,1), background-color .12s, box-shadow .12s, border-color .12s; }
.nk-sb__main > span { display: inline-flex; align-items: center; line-height: 1; } /* slot centerer: text/icon can't inflate the segment */
.nk-sb__seg:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); z-index: 3; }
.nk-sb__seg:disabled { cursor: not-allowed; }
/* primary = default action + rounded LEADING corners; caret = narrower square + rounded TRAILING corners. */
.nk-sb__main { border-top-left-radius: var(--radius-control); border-bottom-left-radius: var(--radius-control); text-transform: uppercase; letter-spacing: var(--font-tracking-tight); font-weight: var(--font-weight-light); }
.nk-sb__caret { border-top-right-radius: var(--radius-control); border-bottom-right-radius: var(--radius-control); padding: 0; }
.nk-sb__caret svg { display: block; transition: transform .14s cubic-bezier(.2,0,0,1); }
.nk-sb__caret[aria-expanded="true"] svg { transform: rotate(180deg); }
.nk-sb__main svg { display: block; }
/* sizes: heights/paddings on the token scale; the caret is a square of the same height. */
.nk-sb--sm .nk-sb__main { font-size: var(--font-size-12); padding: var(--space-1) var(--space-3); height: var(--space-8); }
.nk-sb--sm .nk-sb__caret { width: var(--space-8); height: var(--space-8); }
.nk-sb--sm .nk-sb__main svg { width: 15px; height: 15px; }
.nk-sb--sm .nk-sb__caret svg { width: 16px; height: 16px; }
.nk-sb--md .nk-sb__main { font-size: var(--font-size-14); padding: var(--space-2) var(--space-4); height: var(--space-10); }
.nk-sb--md .nk-sb__caret { width: var(--space-10); height: var(--space-10); }
.nk-sb--md .nk-sb__main svg { width: 17px; height: 17px; }
.nk-sb--md .nk-sb__caret svg { width: 19px; height: 19px; }

/* DIVIDER: a token hairline seam on the caret's leading edge, sitting exactly on the join (on-accent-soft on filled, on-card elsewhere; NOT a gap, NOT a glow). */
.nk-sb__caret::before { content: ""; position: absolute; left: 0; top: 15%; bottom: 15%; width: var(--space-px); background: var(--nk-sb-divider); z-index: 2; }

/* ── FILL LADDER: the ONE sanctioned fork of NockerlButton's fill recipe. ──────────
   Why a fork, not a literal <NockerlButton>: the split's two segments are WELDED. Each
   radiuses only its OUTER corners, they share an inner seam, and the hairline divider sits ON
   the join. A <NockerlButton> (all four corners rounded, no seam) cannot slot into that
   geometry. So the segments RE-STATE Button's fill LADDER on split geometry, token for token:
   filled = accent gradient + sheen catch-light + neutral shadow; tonal = accent-soft + cyan
   border; outline = transparent + cyan border; hover = brightness, active = brightness + a .985
   press-scale, never a fill swap (Law 7). Values are all tokens; only the geometry differs.
   MAINTENANCE CONTRACT: this is a deliberate shadow of BUTTON_STYLES's primary/secondary/tertiary
   ladder. A change to Button's fill RULE (the gradient, the shadow rung, a new variant) must be
   MIRRORED here: the geometry differs, the fill law does not. This is the audit-accepted fork. ── */
/* PRIMARY / filled: cyan gradient, lit from above (sheen = catch-light, NOT a glow). */
.nk-sb--primary { --nk-sb-divider: color-mix(in srgb, var(--color-on-accent) 28%, transparent); color: var(--color-on-accent);
  box-shadow: 0 var(--elevation-level2) 14px -6px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-sb--primary .nk-sb__seg { background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary)); }
.nk-sb--primary .nk-sb__seg:hover:not(:disabled) { filter: brightness(1.06); }
.nk-sb--primary .nk-sb__seg:active:not(:disabled) { filter: brightness(.9); transform: scale(.985); }
.nk-sb--primary .nk-sb__caret[aria-expanded="true"] { filter: brightness(.92); }
/* SECONDARY / tonal: cyan-soft fill + thin cyan border, cyan label. */
.nk-sb--secondary { --nk-sb-divider: color-mix(in srgb, var(--color-accent-primary) 32%, transparent); color: var(--color-accent-primary); }
.nk-sb--secondary .nk-sb__seg { background: var(--color-accent-primary-soft); border-color: color-mix(in srgb, var(--color-accent-primary) 28%, transparent); }
.nk-sb--secondary .nk-sb__main { border-right-color: transparent; }
.nk-sb--secondary .nk-sb__caret { border-left-color: transparent; }
.nk-sb--secondary .nk-sb__seg:hover:not(:disabled) { background: color-mix(in srgb, var(--color-accent-primary) 24%, transparent); }
.nk-sb--secondary .nk-sb__seg:active:not(:disabled) { transform: scale(.985); background: color-mix(in srgb, var(--color-accent-primary) 12%, transparent); }
.nk-sb--secondary .nk-sb__caret[aria-expanded="true"] { background: color-mix(in srgb, var(--color-accent-primary) 24%, transparent); }
/* TERTIARY / outline: transparent fill + cyan border, cyan label. */
.nk-sb--tertiary { --nk-sb-divider: color-mix(in srgb, var(--color-accent-primary) 55%, transparent); color: var(--color-accent-primary); }
.nk-sb--tertiary .nk-sb__seg { background: transparent; border-color: var(--color-accent-primary); }
.nk-sb--tertiary .nk-sb__main { border-right-color: transparent; }
.nk-sb--tertiary .nk-sb__caret { border-left-color: transparent; }
.nk-sb--tertiary .nk-sb__seg:hover:not(:disabled) { background: var(--color-accent-primary-soft); }
.nk-sb--tertiary .nk-sb__seg:active:not(:disabled) { transform: scale(.985); background: color-mix(in srgb, var(--color-accent-primary) 10%, transparent); }
.nk-sb--tertiary .nk-sb__caret[aria-expanded="true"] { background: var(--color-accent-primary-soft); }
/* DESTRUCTIVE: outline red (fill reserved for the final confirm only). */
.nk-sb--destructive { --nk-sb-divider: color-mix(in srgb, var(--color-status-error) 50%, transparent); color: var(--color-status-error); }
.nk-sb--destructive .nk-sb__seg { background: transparent; border-color: color-mix(in srgb, var(--color-status-error) 50%, transparent); }
.nk-sb--destructive .nk-sb__main { border-right-color: transparent; }
.nk-sb--destructive .nk-sb__caret { border-left-color: transparent; }
.nk-sb--destructive .nk-sb__seg:hover:not(:disabled) { background: color-mix(in srgb, var(--color-status-error) 12%, transparent); }
.nk-sb--destructive .nk-sb__seg:active:not(:disabled) { transform: scale(.985); background: color-mix(in srgb, var(--color-status-error) 6%, transparent); }
.nk-sb--destructive .nk-sb__caret[aria-expanded="true"] { background: color-mix(in srgb, var(--color-status-error) 12%, transparent); }

/* DISABLED: inert + clearly seen (never faded to invisible). */
.nk-sb--primary .nk-sb__seg:disabled { background: var(--color-card-surface1); color: var(--color-on-card-muted); }
.nk-sb--primary:has(.nk-sb__main:disabled) { box-shadow: none; }
.nk-sb__seg:disabled { opacity: .55; }
.nk-sb--primary .nk-sb__seg:disabled { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .nk-sb__seg, .nk-sb__caret svg { transition: none; }
}
`;

// ─── Stroke glyphs via the shared NockerlIcon primitive (currentColor tints from each slot's token) ─────
// the caret mirrors Compose's Icons.Filled.ArrowDropDown (a solid down triangle).
// FILLED glyph: kept inline (the NockerlIcon primitive is stroke-only; fill+no-stroke can't be expressed via props).
const IconCaret = (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="m7 10 5 5 5-5z" /></svg>
);
const IconSend = <NockerlIcon path="M4 12h15M13 6l6 6-6 6" />;
const IconClock = <NockerlIcon><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /><path d="M12 7v5l3 2" /></NockerlIcon>;
const IconArchive = <NockerlIcon path="M3 8h18M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M3 8l2-4h14l2 4M9 12h6" />;
const IconEdit = <NockerlIcon><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></NockerlIcon>;
const IconTrash = <NockerlIcon><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" /></NockerlIcon>;
const IconSave = <NockerlIcon><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></NockerlIcon>;
const IconCopy = <NockerlIcon><path d="M11 9h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></NockerlIcon>;
const IconLayers = <NockerlIcon><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></NockerlIcon>;
const IconForce = <NockerlIcon path="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />;

// ─── The split buttons shown (default action + a menu of alternatives) ─────────
// "Send" is the canonical example: a default Send + Send later / Send & archive / Save draft.
const SEND_MENU: SplitAction[] = [
  { id: 'send', label: 'Send now', icon: IconSend },
  { id: 'later', label: 'Send later', icon: IconClock },
  { id: 'schedule', label: 'Schedule…', icon: IconClock },
  { id: 'archive', label: 'Send & archive', icon: IconArchive },
  { id: 'draft', label: 'Save as draft', icon: IconEdit, keepDefault: true, dividerAbove: true },
];
// "Commit" tonal: default Commit + Amend / Commit & push.
const COMMIT_MENU: SplitAction[] = [
  { id: 'commit', label: 'Commit', icon: IconSave },
  { id: 'amend', label: 'Amend last commit', icon: IconEdit },
  { id: 'force', label: 'Commit & push', icon: IconForce },
];
// "Duplicate" outline: default Duplicate + Duplicate to… / Stash.
const DUP_MENU: SplitAction[] = [
  { id: 'duplicate', label: 'Duplicate', icon: IconCopy },
  { id: 'stash', label: 'Stash a copy', icon: IconLayers },
];
// "Delete" destructive: default Delete + Delete & block (both danger).
const DELETE_MENU: SplitAction[] = [
  { id: 'delete', label: 'Delete', icon: IconTrash, danger: true },
  { id: 'deleteAll', label: 'Delete all in thread', icon: IconTrash, danger: true },
];

interface SplitButtonProps {
  groupKey: string;
  label: string;          // current default label on the primary segment
  variant: SplitVariant;
  size?: SplitSize;
  menu: SplitAction[];
  menuApi?: MenuTriggerApi;  // NockerlMenu trigger api (absent = an inert showcase pair)
  disabled?: boolean;     // whole control inert: disabled ALWAYS applies to BOTH segments
  onPrimary: () => void;
  onCaret?: (groupKey: string) => void;  // record which group is opening (for current + promote)
  registerCaret?: (key: string, el: HTMLButtonElement | null) => void;  // anchor the menu to the caret
}

/** A single Nockerl split button: two welded segments + a hairline divider. The
 *  caret drives the shared NockerlMenu via `menuApi`; the primary fires directly. */
function SplitButton({
  groupKey, label, variant, size = 'md', menu, menuApi, disabled,
  onPrimary, onCaret, registerCaret,
}: SplitButtonProps) {
  const isOpen = menuApi?.openTrigger === groupKey;
  const labelId = useId();
  // The leading icon tracks the CURRENT default (the one the label shows), so it
  // updates when a menu pick promotes itself to the new default.
  const current = menu.find((m) => m.label === label) ?? menu[0];
  return (
    <div className={`nk-sb nk-sb--${variant} nk-sb--${size} not-content`} role="group" aria-labelledby={labelId}>
      <span id={labelId} hidden>{label} (split button)</span>
      <button
        type="button"
        className="nk-sb__seg nk-sb__main"
        disabled={disabled}
        onClick={disabled ? undefined : onPrimary}
      >
        {variant !== 'destructive' && current?.icon && <span aria-hidden="true">{current.icon}</span>}
        <span>{label}</span>
      </button>
      <button
        type="button"
        className="nk-sb__seg nk-sb__caret"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`More ${label.toLowerCase()} actions`}
        disabled={disabled}
        ref={(el) => registerCaret?.(groupKey, el)}
        onClick={(e) => { onCaret?.(groupKey); menuApi?.toggle(groupKey, menu, e); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') onCaret?.(groupKey);
          menuApi?.triggerKey(groupKey, menu)(e);
        }}
      >
        {IconCaret}
      </button>
    </div>
  );
}

/**
 * The interactive showcase: a contained stage with four split buttons spread to
 * the corners: a filled "Send" (default action + a menu of alternatives where
 * picking one becomes the new default), a tonal "Commit", an outline "Duplicate",
 * and a destructive "Delete", plus a disabled-whole + a caret-only-disabled
 * control below. The primary fires its default directly; the caret opens the shared
 * NockerlMenu (anchored, flip/clamped inside the stage). Keyboard: primary is a real
 * button; caret has aria-haspopup/aria-expanded; Enter/Space/↓ opens, ↑/↓ move,
 * Enter runs, Esc closes + restores focus. Token-driven; reduced-motion freezes.
 */
// LEAF (describes the SplitButton). `menu` is a data array and `label` plain text, so there
// are no fillable component slots. The dropdown-menu ENGINE is now the NockerlMenu primitive
// (run-and-promote-to-default via onActivate + a leading check on `current`); only the
// welded main+caret segments stay OWNED as the split button's own identity.
//
// FLAG (do NOT force - no clean primitive exists for a welded split button today):
//  * CARET -> NockerlIconButton is blocked: NockerlIconButton has only `plain` (transparent) and `filled-circle`
//    (a solid cyan PILL) variants; neither can render a SQUARE caret whose fill MATCHES the four
//    split variants (primary cyan-GRADIENT, secondary soft, tertiary/destructive outline). Using
//    NockerlIconButton would mean discarding its entire visual recipe (shape, radius, fill), which is
//    fighting the primitive, not composing it.
//  * MAIN -> NockerlButton is blocked as a WELDED segment: NockerlButton always rounds all four corners, adds its
//    own lifted box-shadow, and lifts on hover (translateY(-1px)). A split segment must keep SQUARE
//    inner corners, NO lift (a lifting segment breaks the welded seam), and share ONE silhouette,
//    so composing NockerlButton here would require overriding its radius + shadow + hover transform, again
//    fighting the recipe and risking the welded-silhouette + flash-free laws this control encodes.
// The split button's TRIGGERS are a JOIN the current primitive set does not provide; left
// hand-rolled (raw welded segments, full behavior/a11y) until a welded-segment-group /
// variant-square caret primitive is added upstream. Its MENU now dogfoods NockerlMenu.
// OWNS button: the welded main+caret segments are the split button's own identity (NockerlButton rounds
// all corners + lifts on hover, breaking the single welded silhouette); role=menu/menuitem now
// belong to NockerlMenu, not this demo.
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default function SplitButtonDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // each group's current default action id (the primary segment fires this one)
  const [defaults, setDefaults] = useState<Record<string, string>>({
    send: 'send', commit: 'commit', dup: 'duplicate', del: 'delete',
  });
  // which group's caret last opened, tracked so `current` (the leading-check id)
  // and `onActivate` (promote-to-default) target the correct group. Only one menu
  // is open at a time, so a single key suffices.
  const [openGroup, setOpenGroup] = useState<string>('send');
  const [last, setLast] = useState('none yet');

  // register a caret as its group's menu anchor (the trigger map NockerlMenu reads).
  const registerCaret = useCallback((key: string, el: HTMLButtonElement | null) => {
    triggerRefs.current[key] = el;
  }, []);

  // run an action: record it as "last", and (unless it opts out) promote it to
  // the group's new default fired by the primary segment.
  const fire = useCallback((groupKey: string, it: SplitAction) => {
    setLast(it.label);
    if (!it.keepDefault) setDefaults((d) => ({ ...d, [groupKey]: it.id }));
  }, []);

  // NockerlMenu host-owned activation: run the chosen row AND promote it to the open
  // group's new default (the menu then closes itself). `it` is a MenuItem from the
  // open menu's data, which are our SplitAction rows (keepDefault carried through).
  const onActivate = useCallback((it: MenuItem) => {
    fire(openGroup, it as SplitAction);
  }, [openGroup, fire]);

  // primary segment: fire the group's current default directly.
  const onPrimary = useCallback((groupKey: string, menu: SplitAction[]) => {
    const id = defaults[groupKey] ?? menu[0]?.id;
    const it = menu.find((m) => m.id === id) ?? menu[0];
    if (it) fire(groupKey, it);
  }, [defaults, fire]);

  const labelFor = (groupKey: string, menu: SplitAction[]) => {
    const id = defaults[groupKey] ?? menu[0]?.id;
    return menu.find((m) => m.id === id)?.label ?? menu[0]?.label ?? '';
  };

  // the leading-check target: the current default of whichever group is open (a
  // row promoted with keepDefault never becomes the default, so it is never marked).
  const currentDefaultId = defaults[openGroup];

  return (
    <div className="nk-sb-demo nk-mn-demo">
      <style>{STYLES}</style>
      <p className="nk-sb-demo__lbl">A default action welded to a menu of alternatives. Click the label, or the caret</p>
      <p className="nk-sb-demo__hint">
        The <b>label</b> fires the default directly. The <b>▾</b> caret opens the menu:{' '}
        <NockerlKbd>Enter</NockerlKbd> / <NockerlKbd>↓</NockerlKbd> opens, <NockerlKbd>↑</NockerlKbd> <NockerlKbd>↓</NockerlKbd> move, <NockerlKbd>Enter</NockerlKbd>{' '}
        runs (and that choice becomes the new default), <NockerlKbd>Esc</NockerlKbd> closes.
      </p>

      <div className="nk-sb-stage nk-demo-overlay-stage" ref={stageRef}>
        {/* the dropdown-menu engine, anchored to the caret and flipped/clamped inside the
            stage. The welded split-button TRIGGERS (demo-owned scaffolding) are authored
            here as the render child so they re-render with the menu's open/close state.
            onActivate runs + promotes the chosen row; `current` marks the current default. */}
        <NockerlMenu
          stageRef={stageRef}
          triggerRefs={triggerRefs}
          current={currentDefaultId}
          onActivate={onActivate}
        >
          {(menu) => (
            <div className="nk-sb-bar">
              <div className="nk-sb-bar__col">
                <span className="nk-sb-bar__cap">Compose · reply</span>
                <SplitButton
                  groupKey="send" variant="primary" label={labelFor('send', SEND_MENU)} menu={SEND_MENU}
                  menuApi={menu} onCaret={setOpenGroup} registerCaret={registerCaret}
                  onPrimary={() => onPrimary('send', SEND_MENU)}
                />
                <SplitButton
                  groupKey="dup" variant="tertiary" size="sm" label={labelFor('dup', DUP_MENU)} menu={DUP_MENU}
                  menuApi={menu} onCaret={setOpenGroup} registerCaret={registerCaret}
                  onPrimary={() => onPrimary('dup', DUP_MENU)}
                />
              </div>

              <div className="nk-sb-bar__col nk-sb-bar__col--end">
                <span className="nk-sb-bar__cap">Working tree</span>
                <SplitButton
                  groupKey="commit" variant="secondary" label={labelFor('commit', COMMIT_MENU)} menu={COMMIT_MENU}
                  menuApi={menu} onCaret={setOpenGroup} registerCaret={registerCaret}
                  onPrimary={() => onPrimary('commit', COMMIT_MENU)}
                />
                <SplitButton
                  groupKey="del" variant="destructive" size="sm" label={labelFor('del', DELETE_MENU)} menu={DELETE_MENU}
                  menuApi={menu} onCaret={setOpenGroup} registerCaret={registerCaret}
                  onPrimary={() => onPrimary('del', DELETE_MENU)}
                />
              </div>
            </div>
          )}
        </NockerlMenu>
      </div>

      <p className="nk-sb-demo__lbl" style={{ marginTop: 'var(--space-5)' }}>
        Disabled: the WHOLE control, always (a split never half-disables)
      </p>
      <div className="nk-sb-demo__row">
        <SplitButton
          groupKey="dis" variant="primary" label="Send" menu={SEND_MENU}
          disabled onPrimary={() => {}}
        />
        <SplitButton
          groupKey="capdis" variant="secondary" label="Commit" menu={COMMIT_MENU}
          disabled onPrimary={() => {}}
        />
      </div>

      <p className="nk-sb-demo__count">
        Last action: <b>{last}</b> · defaults: send {defaults.send}, commit {defaults.commit} · pointer + keyboard both work; the island is live.
      </p>
    </div>
  );
}
