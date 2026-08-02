/**
 * NockerlMenu is the Tier-1 DROPDOWN MENU primitive. ONE home for the everyday
 * CLICK-triggered popover engine: the anchored menu surface, the flip/clamp
 * positioning, the focus-trap + roving keyboard model, the nested submenu, the
 * outside-click scrim, and the item-row recipe (icon · label · ⌘-shortcut ·
 * check · chevron). A future dropdown-menu change is ONE edit, not many.
 * Composes ONLY tokens + the NockerlSurface / NockerlIcon primitives.
 *
 * The everyday CLICK-triggered popover: press a trigger button (a kebab/overflow
 * ⋯, an actions button) and a menu opens ANCHORED under/near it, holding menu items
 * (icon + label + optional ⌘-shortcut), separators, section labels, checkable /
 * radio items (checkmark), a nested submenu, and a destructive item. DISTINCT
 * from long-press-pop (press-and-hold ON content), command-palette (modal ⌘K
 * search), and combobox (type-to-filter select): this is a normal click/Enter on
 * a trigger, positioned by ANCHOR, no text filtering.
 *
 * Sourced from the REAL apps (read-only). Android `chat/ui/SessionChipsBar.kt`,
 * the canonical session-overflow `DropdownMenu`: DropdownMenuItem rows with a
 * leadingIcon + label (Rename · Edit provider/model · Fork · Clear context ·
 * Delete) where Delete is the destructive tail; `SessionCreationDropdowns.kt`,
 * the `ExposedDropdownMenuBox` anchored to a trigger with an ArrowDropDown. Voice
 * `UI/AppSettingsView.swift` shows `NockerlMenu { NockerlButton { Label(name, systemImage:
 * "checkmark") } }` (the CHECKED-item idiom = a leading checkmark) +
 * `MenuBarContent.swift` with `NockerlDivider()` separators, a section caption, and
 * `.keyboardShortcut("d", modifiers: .command)` (the trailing ⌘-hint).
 *
 * Laws: DEPTH = neutral tinted shadow + top catch-light, NEVER a glow, because the menu
 * is an elevated surface (card gradient + the neutral shadow token). flash-free:
 * fills static, only scale/opacity/transform animate the open; reduced-motion
 * FREEZES the open (appears in place). active/hover item = an accent-soft wash;
 * a CHECKED item's check + the SELECTED radio use the cyan accent; the
 * destructive item uses the danger token, divider-separated; ⌘-shortcut hints are
 * mono + muted. TOKEN-REACTIVE: every color/font/radius/spacing/type is a
 * `var(--token)`; literals remain only for pure geometry (icon px, blur, curves).
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ComposeContract } from '../compose-contract';
import { NockerlIcon } from '../primitives/Icon';
import { NockerlSurface } from '../primitives/Surface';

// ─── NockerlMenu model ──────────────────────────────────────────────────────────────
export type ItemKind = 'action' | 'checkbox' | 'radio';
export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;        // trailing ⌘-hint (mono, muted)
  kind?: ItemKind;          // 'action' (default) | 'checkbox' | 'radio'
  group?: string;          // radio group key (one selected per group)
  danger?: boolean;         // destructive (danger token, divider above)
  submenu?: MenuItem[];     // nested menu (opens to the side)
  sectionAbove?: string;    // a SECTION LABEL rendered above this row
  dividerAbove?: boolean;   // a separator rendered above this row
}

export const NOCKERL_MENU_STYLES = `
/* the MENU surface: an elevated, lit-from-above panel (card gradient + neutral shadow + catch-light, NO glow).
   NockerlSurface (variant="panel") supplies the hairline + 12px panel radius. The gradient fill
   REPLACES NockerlSurface's flat surface1, so it is demo-root prefixed to out-specify .nk-surface
   (injected later in the DOM). No level passed, so the menu keeps its own DRIFT shadow. */
.nk-mn-menu { position: absolute; z-index: 30; min-width: var(--size-container-xs); max-width: var(--size-container-md); color: var(--color-on-card);
  box-shadow: 0 var(--space-2) var(--elevation-level3) -8px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level3) * 100%), transparent), var(--nk-surface-sheen); padding: var(--space-1); overflow: visible; transform: scale(.94); opacity: 0; transform-origin: var(--nk-mn-origin, top left); transition: transform .16s var(--motion-easing-standard), opacity .13s ease; }
.nk-mn-demo .nk-mn-menu { background: linear-gradient(180deg, var(--color-card-surface2), var(--color-card-surface1)); }
.nk-mn-menu[data-shown="true"] { transform: scale(1); opacity: 1; }
.nk-mn-menu--sub { z-index: 31; }
/* a SECTION LABEL: small, muted, uppercase; the menu's wayfinding (Voice's caption row). */
.nk-mn-section { padding: var(--space-2) var(--space-3) var(--space-1); font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); }
/* a SEPARATOR: a full-width hairline (Compose HorizontalDivider / Swift NockerlDivider). */
.nk-mn-sep { height: var(--space-px); margin: var(--space-1) var(--space-2); background: var(--color-card-hairline); }
/* an ITEM ROW: [check col] · [icon col] · label · [shortcut / chevron]. One row = one name. */
.nk-mn-item { width: 100%; display: flex; align-items: center; gap: var(--space-2); font: inherit; font-size: var(--font-size-14); font-weight: var(--font-weight-medium); text-align: left; cursor: pointer; color: var(--color-on-card); background: transparent; border: 0; border-radius: var(--radius-control); padding: var(--space-2) var(--space-2); min-height: calc(var(--space-8) + var(--space-1)); transition: background-color .1s, color .1s; }
/* the leading CHECK column, fixed width so labels align whether or not a row is checkable. */
.nk-mn-item__check { flex: 0 0 auto; width: var(--space-5); display: inline-flex; align-items: center; justify-content: center; color: var(--color-accent-primary); }
.nk-mn-item__check svg { display: block; width: 16px; height: 16px; }
.nk-mn-item__ico { flex: 0 0 auto; width: var(--space-5); display: inline-flex; align-items: center; justify-content: center; color: var(--color-on-card-muted); }
.nk-mn-item__ico svg { display: block; width: 17px; height: 17px; }
.nk-mn-item__lbl { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* the trailing SHORTCUT hint: mono + muted (Swift's .keyboardShortcut surfaced visually). */
.nk-mn-item__kbd { flex: 0 0 auto; font-family: var(--font-family-mono); font-size: var(--font-size-12); color: var(--color-on-card-muted); letter-spacing: var(--font-tracking-normal); padding-left: var(--space-2); }
.nk-mn-item__chev { flex: 0 0 auto; display: inline-flex; color: var(--color-on-card-muted); padding-left: var(--space-1); }
.nk-mn-item__chev svg { display: block; width: 16px; height: 16px; }
/* active (roving) / hover: an accent-SOFT wash (not a fill swap, not a glow). */
.nk-mn-item:hover, .nk-mn-item[data-active="true"] { background: var(--color-accent-primary-soft); color: var(--color-on-card); }
.nk-mn-item[data-active="true"] .nk-mn-item__ico, .nk-mn-item:hover .nk-mn-item__ico { color: var(--color-accent-primary); }
.nk-mn-item:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(-1 * var(--space-0-5)); }
.nk-mn-item:active { background: color-mix(in srgb, var(--color-accent-primary) 18%, transparent); }
.nk-mn-item[aria-disabled="true"] { color: var(--color-on-card-muted); cursor: not-allowed; }
.nk-mn-item[aria-disabled="true"]:hover { background: transparent; }
/* the destructive item: danger token (matches LongPressPop Delete), divider-separated above. */
.nk-mn-item--danger, .nk-mn-item--danger .nk-mn-item__ico { color: var(--color-status-error); }
.nk-mn-item--danger:hover, .nk-mn-item--danger[data-active="true"] { background: color-mix(in srgb, var(--color-status-error) 14%, transparent); }
.nk-mn-item--danger:hover .nk-mn-item__ico, .nk-mn-item--danger[data-active="true"] .nk-mn-item__ico { color: var(--color-status-error); }
/* SCRIM: invisible click-catcher that closes on an outside click (no dim; a dropdown isn't modal). */
.nk-mn-scrim { position: absolute; inset: 0; z-index: 20; border: 0; padding: 0; margin: 0; background: transparent; cursor: default; }
/* DIM scrim: a modal ground dim for a POINT-anchored contextual menu (long-press-pop); opacity-only fade, NO blur / glow. */
.nk-mn-scrim--dim { background: var(--color-scrim); opacity: 0; transition: opacity .16s var(--motion-easing-standard); }
.nk-mn-scrim--dim[data-shown="true"] { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .nk-mn-item, .nk-mn-menu, .nk-mn-scrim--dim { transition: none; }
  .nk-mn-menu { transform: scale(1); }   /* appear in place, no scale pop */
}
`;

// ─── Inline stroke glyphs (currentColor so each slot tints from its token) ─────
const IconCheck = <NockerlIcon path="M20 6 9 17l-5-5" />;
const IconChevR = <NockerlIcon path="m9 6 6 6-6 6" />;

// One opened menu: which trigger, the anchor rect (stage-local), the menu data,
// and whether it opened via keyboard (→ focus the first item, not the container).
export interface OpenState {
  trigger: string;
  data: MenuItem[];
  ax: number; ay: number; aw: number; ah: number;
  viaKeyboard: boolean;
}

// The trigger API the host's trigger buttons drive: open anchored to a trigger,
// close, toggle (same trigger closes / re-opens), a keydown helper, and which
// trigger is open (so the trigger can set aria-expanded), handed to the host's
// `children` render function so the triggers stay demo-owned scaffolding yet
// re-render with the menu's open/close state.
export interface MenuTriggerApi {
  /** Open anchored to a trigger (its rect, stage-local). Keyboard open focuses item 1. */
  open: (trigger: string, data: MenuItem[], el: HTMLButtonElement, viaKeyboard: boolean) => void;
  /** Open at a POINT (client x,y) instead of a trigger rect: a point-anchored / long-press
   *  contextual menu. `restoreEl` gets focus back on close. Keyboard open focuses item 1. */
  openAt: (x: number, y: number, data: MenuItem[], restoreEl: HTMLElement | null, viaKeyboard: boolean) => void;
  /** Close the open menu; `restore` returns focus to the trigger. */
  close: (restore?: boolean) => void;
  /** toggle: same trigger closes, otherwise (re)open. */
  toggle: (trigger: string, data: MenuItem[], e: React.MouseEvent<HTMLButtonElement>) => void;
  /** trigger keyboard: Enter/Space/↓ opens (focusing the first item). */
  triggerKey: (trigger: string, data: MenuItem[]) => (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  /** The trigger id of the currently-open menu (so the trigger can set aria-expanded). */
  openTrigger: string | null;
}

export interface NockerlMenuProps {
  /** The contained STAGE the menu opens INSIDE + is clamped to (the trigger host). */
  stageRef: RefObject<HTMLDivElement | null>;
  /** The trigger element map (id → button), shared with the host's trigger buttons. */
  triggerRefs: RefObject<Record<string, HTMLButtonElement | null>>;
  /** Which checkbox rows are checked (id → boolean). Optional in `onActivate` mode. */
  checks?: Record<string, boolean>;
  /** The selected radio id (one per group). Optional in `onActivate` mode. */
  radio?: string;
  /** Activation side-effects (state writes) owned by the host showcase. Optional in `onActivate` mode. */
  setChecks?: (updater: (c: Record<string, boolean>) => Record<string, boolean>) => void;
  setRadio?: (id: string) => void;
  setLast?: (label: string) => void;
  /**
   * Mark ONE item with a leading check: the CURRENT / default choice (a split-button's active
   * action). Reserves the leading-check column so action labels align. Used with `onActivate`.
   */
  current?: string;
  /**
   * Dim the ground with a modal scrim (a point-anchored contextual menu that reads as a focused
   * surface, as in long-press-pop), instead of the default transparent non-modal outside-click catcher.
   */
  dim?: boolean;
  /**
   * Host-owned activation: called on any item activation so the host runs the side-effect (e.g.
   * run the action AND promote it to the new default). The menu then closes (a `checkbox` stays
   * open, toggled in place). When omitted, the built-in showcase checks/radio model is used.
   */
  onActivate?: (item: MenuItem) => void;
  /**
   * The host's TRIGGER buttons, authored as a render function so they stay
   * demo-owned scaffolding yet re-render with the menu's open/close state. The
   * menu surface + scrim render after them (inside the same stage).
   */
  children: (api: MenuTriggerApi) => ReactNode;
}

/**
 * The Nockerl dropdown-menu engine: the anchored, flip/clamped menu surface + the
 * invisible outside-click scrim, with the full focus-trap / roving keyboard model
 * (↑/↓ + Home/End move, → opens a submenu, ←/Esc back, Enter activates) and a
 * nested submenu. Mounts the menu (when open) INSIDE the host's stage, clamped to
 * it; the open freezes under prefers-reduced-motion. The recipe CSS is its LAST
 * child. The host's trigger buttons (rendered via `children`) drive it through the
 * `MenuTriggerApi`.
 *
 * No forwardRef (API convention §9): NockerlMenu is a controller. Its `children` render-prop
 * supplies the trigger buttons and it renders a portalled <NockerlSurface> menu (+ submenu), so
 * there is no single root DOM element to forward a ref to. Deliberate exemption.
 */
export function NockerlMenu({
  stageRef,
  triggerRefs,
  checks,
  radio,
  setChecks,
  setRadio,
  setLast,
  current,
  dim = false,
  onActivate,
  children,
}: NockerlMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<OpenState | null>(null);
  const [shown, setShown] = useState(false);
  const [active, setActive] = useState(0);
  const [subActive, setSubActive] = useState(-1);   // which parent row owns the open submenu (-1 = closed)
  const [subIdx, setSubIdx] = useState(0);          // roving index WITHIN the open submenu
  const titleId = useId();

  const close = useCallback((restore = true) => {
    setShown(false);
    const t = open ? triggerRefs.current?.[open.trigger] : null;
    if (restore && t) window.setTimeout(() => t.focus(), 0);
    window.setTimeout(() => { setOpen(null); setSubActive(-1); }, 160);
  }, [open, triggerRefs]);

  // Open anchored to a trigger (its rect, stage-local). Keyboard open focuses item 1.
  const openMenu = useCallback((trigger: string, data: MenuItem[], el: HTMLButtonElement, viaKeyboard: boolean) => {
    const stage = stageRef.current;
    if (!stage) return;
    const sb = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (triggerRefs.current) triggerRefs.current[trigger] = el;
    setOpen({ trigger, data, ax: r.left - sb.left, ay: r.top - sb.top, aw: r.width, ah: r.height, viaKeyboard });
    setActive(viaKeyboard ? 0 : -1);
    setSubActive(-1);
  }, [stageRef, triggerRefs]);

  // Open at a POINT (client x,y): a point-anchored contextual menu (zero-size anchor at the point).
  const openAt = useCallback((x: number, y: number, data: MenuItem[], restoreEl: HTMLElement | null, viaKeyboard: boolean) => {
    const stage = stageRef.current;
    if (!stage) return;
    const sb = stage.getBoundingClientRect();
    if (triggerRefs.current) triggerRefs.current['__point__'] = restoreEl as HTMLButtonElement | null;
    setOpen({ trigger: '__point__', data, ax: x - sb.left, ay: y - sb.top, aw: 0, ah: 0, viaKeyboard });
    setActive(viaKeyboard ? 0 : -1);
    setSubActive(-1);
  }, [stageRef, triggerRefs]);

  // toggle: same trigger closes, otherwise (re)open.
  const onTrigger = useCallback((trigger: string, data: MenuItem[], e: React.MouseEvent<HTMLButtonElement>) => {
    if (open?.trigger === trigger) { close(); return; }
    openMenu(trigger, data, e.currentTarget, false);
  }, [open, close, openMenu]);

  // Mount → next frame flips "shown" (scale-in).
  useEffect(() => {
    if (!open) return;
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [open]);

  // After mount: anchor UNDER the trigger, then flip up / clamp X to stay in-stage.
  useEffect(() => {
    if (!open || !menuRef.current || !stageRef.current) return;
    const menu = menuRef.current;
    const sb = stageRef.current.getBoundingClientRect();
    const pad = 8;
    const w = menu.offsetWidth, h = menu.offsetHeight;
    let left = open.ax;
    let top = open.ay + open.ah + 6;            // default: just below the trigger
    if (top + h + pad > sb.height) top = Math.max(pad, open.ay - h - 6);   // flip ABOVE
    if (left + w + pad > sb.width) left = Math.max(pad, open.ax + open.aw - w);  // right-align
    if (left < pad) left = pad;
    if (top < pad) top = pad;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.setProperty('--nk-mn-origin', `${top < open.ay ? 'bottom' : 'top'} ${left > open.ax ? 'right' : 'left'}`);
    if (open.viaKeyboard) menu.querySelector<HTMLButtonElement>('.nk-mn-item')?.focus();
    else menu.focus();
  }, [open, stageRef]);

  // Position the SUBMENU to the side of its parent row (flip left if it would overflow).
  useEffect(() => {
    if (subActive < 0 || !subRef.current || !menuRef.current || !stageRef.current) return;
    const items = menuRef.current.querySelectorAll<HTMLButtonElement>('.nk-mn-item');
    const parent = items[subActive];
    const sb = stageRef.current.getBoundingClientRect();
    const sub = subRef.current;
    if (!parent) return;
    const pr = parent.getBoundingClientRect();
    const pad = 8, w = sub.offsetWidth, h = sub.offsetHeight;
    let left = pr.right - sb.left - 4;
    let top = pr.top - sb.top - 5;
    if (left + w + pad > sb.width) left = pr.left - sb.left - w + 4;   // flip to the LEFT
    if (left < pad) left = pad;
    if (top + h + pad > sb.height) top = Math.max(pad, sb.height - h - pad);
    sub.style.left = `${left}px`;
    sub.style.top = `${top}px`;
  }, [subActive, stageRef]);

  // keep DOM focus on the active row of the focused menu (main vs submenu).
  useEffect(() => {
    if (!open) return;
    if (subActive >= 0 && subRef.current) {
      // focus handled by the submenu effect below; keep parent row marked active
      return;
    }
    if (active >= 0 && menuRef.current) {
      menuRef.current.querySelectorAll<HTMLButtonElement>('.nk-mn-item')[active]?.focus();
    }
  }, [active, open, subActive]);

  const activate = useCallback((item: MenuItem, parent?: MenuItem) => {
    // Host-owned activation (run + promote-to-default): the host runs the side-effect; the menu
    // then closes unless the row is a toggle-in-place checkbox.
    if (onActivate) {
      onActivate(item);
      if (item.kind !== 'checkbox') close();
      return;
    }
    // Built-in showcase model (checks / radio / last-activated).
    if (item.kind === 'checkbox') {
      setChecks?.((c) => ({ ...c, [item.id]: !c[item.id] }));
      setLast?.(`${item.label} ${!checks?.[item.id] ? 'on' : 'off'}`);
      return;   // checkboxes keep the menu open (toggle in place)
    }
    if (item.kind === 'radio') {
      setRadio?.(item.id);
      setLast?.(`Sort: ${item.label}`);
      return;
    }
    setLast?.(parent ? `${parent.label} → ${item.label}` : item.label);
    close();
  }, [checks, close, setChecks, setRadio, setLast, onActivate]);

  // ── main-menu keyboard model: ↑/↓ + Home/End roving, → opens submenu, Enter
  //    activates, Esc/← closes, Tab is trapped (cycles rows). ──
  const onMenuKey = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;
    const rows = open.data;
    const last_ = rows.length - 1;
    const k = e.key;
    // submenu has its own handler when focused
    if (subActive >= 0) return;
    if (k === 'Escape') { e.stopPropagation(); close(); }
    else if (k === 'ArrowDown' || (k === 'Tab' && !e.shiftKey)) { e.preventDefault(); setActive((i) => (i >= last_ ? 0 : i + 1)); }
    else if (k === 'ArrowUp' || (k === 'Tab' && e.shiftKey)) { e.preventDefault(); setActive((i) => (i <= 0 ? last_ : i - 1)); }
    else if (k === 'Home') { e.preventDefault(); setActive(0); }
    else if (k === 'End') { e.preventDefault(); setActive(last_); }
    else if (k === 'ArrowRight') {
      const it = rows[active];
      if (it?.submenu) { e.preventDefault(); setSubActive(active); window.setTimeout(() => subRef.current?.querySelector<HTMLButtonElement>('.nk-mn-item')?.focus(), 0); }
    } else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      const it = rows[active];
      if (!it) return;
      if (it.submenu) { setSubActive(active); window.setTimeout(() => subRef.current?.querySelector<HTMLButtonElement>('.nk-mn-item')?.focus(), 0); }
      else activate(it);
    }
  }, [open, active, subActive, close, activate]);

  // ── submenu keyboard model: ↑/↓ + Home/End roving, ← / Esc returns to the
  //    parent row, Enter activates. ──
  const onSubKey = useCallback((e: React.KeyboardEvent) => {
    if (!open || subActive < 0) return;
    const parent = open.data[subActive];
    const sub = parent?.submenu ?? [];
    const last_ = sub.length - 1;
    const k = e.key;
    const back = () => { setSubActive(-1); window.setTimeout(() => menuRef.current?.querySelectorAll<HTMLButtonElement>('.nk-mn-item')[subActive]?.focus(), 0); };
    if (k === 'ArrowDown' || (k === 'Tab' && !e.shiftKey)) { e.preventDefault(); setSubIdx((i) => (i >= last_ ? 0 : i + 1)); }
    else if (k === 'ArrowUp' || (k === 'Tab' && e.shiftKey)) { e.preventDefault(); setSubIdx((i) => (i <= 0 ? last_ : i - 1)); }
    else if (k === 'ArrowLeft') { e.preventDefault(); back(); }
    else if (k === 'Escape') { e.stopPropagation(); back(); }
    else if (k === 'Home') { e.preventDefault(); setSubIdx(0); }
    else if (k === 'End') { e.preventDefault(); setSubIdx(last_); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); const it = sub[subIdx]; if (it && parent) activate(it, parent); }
  }, [open, subActive, subIdx, activate]);

  // reset the submenu's roving index whenever a (new) submenu opens
  useEffect(() => { if (subActive >= 0) setSubIdx(0); }, [subActive]);
  // keep DOM focus on the active submenu row as the roving index moves
  useEffect(() => {
    if (subActive >= 0 && subRef.current) subRef.current.querySelectorAll<HTMLButtonElement>('.nk-mn-item')[subIdx]?.focus();
  }, [subIdx, subActive]);

  // trigger keyboard: Enter/Space/↓ opens (focusing the first item).
  const triggerKey = (trigger: string, data: MenuItem[]) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (open?.trigger === trigger) close();
      else openMenu(trigger, data, e.currentTarget, true);
    }
  };

  // The trigger API handed to the host's `children` render function (open / close /
  // toggle / triggerKey + which trigger is open), so the trigger buttons stay
  // demo-owned scaffolding yet re-render with the menu's open/close state.
  const triggerApi: MenuTriggerApi = {
    open: openMenu,
    openAt,
    close,
    toggle: onTrigger,
    triggerKey,
    openTrigger: open?.trigger ?? null,
  };

  // Per-menu column reservations so EVERY label aligns: reserve the leading check
  // column if ANY row in the menu is checkable, and the icon column if ANY has an
  // icon. (Radio rows have no icon but still reserve the column → labels line up.)
  const colsFor = (rows: MenuItem[]) => ({
    check: current != null || rows.some((r) => r.kind === 'checkbox' || r.kind === 'radio'),
    icon: rows.some((r) => !!r.icon),
  });

  // render one row (used by both the main menu and the submenu)
  const renderRow = (it: MenuItem, i: number, isSub: boolean, cols: { check: boolean; icon: boolean }, parent?: MenuItem) => {
    const checkable = it.kind === 'checkbox' || it.kind === 'radio';
    const isChecked = it.kind === 'radio' ? radio === it.id : it.kind === 'checkbox' ? !!checks?.[it.id] : current === it.id;
    const role = it.kind === 'checkbox' ? 'menuitemcheckbox' : it.kind === 'radio' ? 'menuitemradio' : 'menuitem';
    const activeRow = isSub ? subIdx === i : active === i;
    return (
      <div key={it.id} role="none">
        {!isSub && it.dividerAbove && <div className="nk-mn-sep" role="separator" />}
        {!isSub && it.sectionAbove && <div className="nk-mn-section" role="presentation">{it.sectionAbove}</div>}
        <button
          type="button" role={role} tabIndex={activeRow ? 0 : -1}
          data-active={activeRow || undefined}
          aria-checked={checkable ? isChecked : undefined}
          aria-haspopup={it.submenu ? 'menu' : undefined}
          aria-expanded={it.submenu ? subActive === i : undefined}
          className={`nk-mn-item${it.danger ? ' nk-mn-item--danger' : ''}`}
          onPointerEnter={() => { if (isSub) setSubIdx(i); else { setActive(i); if (it.submenu) setSubActive(i); else setSubActive(-1); } }}
          onClick={() => { if (it.submenu) { setSubActive(i); window.setTimeout(() => subRef.current?.querySelector<HTMLButtonElement>('.nk-mn-item')?.focus(), 0); } else activate(it, parent); }}
        >
          {cols.check && <span className="nk-mn-item__check">{isChecked ? IconCheck : null}</span>}
          {cols.icon && <span className="nk-mn-item__ico">{it.icon ?? null}</span>}
          <span className="nk-mn-item__lbl">{it.label}</span>
          {it.shortcut && <span className="nk-mn-item__kbd">{it.shortcut}</span>}
          {it.submenu && <span className="nk-mn-item__chev">{IconChevR}</span>}
        </button>
      </div>
    );
  };

  const subParent = open && subActive >= 0 ? open.data[subActive] : null;

  return (
    <>
      {/* the host's TRIGGER buttons (demo-owned scaffolding) that re-render with open state */}
      {children(triggerApi)}

      {/* invisible outside-click catcher (a dropdown is non-modal, so no dim) */}
      {open && (
        <button type="button" className={`nk-mn-scrim${dim ? ' nk-mn-scrim--dim' : ''}`} data-shown={shown}
          tabIndex={-1} aria-hidden="true"
          onPointerDown={(e) => e.preventDefault()} onClick={() => close()} />
      )}

      {/* the MENU: anchored under its trigger, flipped/clamped inside the stage */}
      {open && (
        <NockerlSurface
          variant="panel"
          ref={menuRef} className="nk-mn-menu" data-shown={shown} role="menu"
          aria-labelledby={titleId} tabIndex={-1} onKeyDown={onMenuKey}
          style={{ left: open.ax, top: open.ay + open.ah + 6 } as CSSProperties}
        >
          <span id={titleId} hidden>{open.trigger} menu</span>
          {(() => { const cols = colsFor(open.data); return open.data.map((it, i) => renderRow(it, i, false, cols)); })()}

          {/* the SUBMENU, offset to the side of its parent row */}
          {subParent?.submenu && (
            <NockerlSurface
              variant="panel"
              ref={subRef} className="nk-mn-menu nk-mn-menu--sub" data-shown={shown} role="menu"
              aria-label={subParent.label} tabIndex={-1} onKeyDown={onSubKey}
              style={{ left: open.ax + open.aw, top: open.ay } as CSSProperties}
            >
              {(() => { const cols = colsFor(subParent.submenu!); return subParent.submenu!.map((s, i) => renderRow(s, i, true, cols, subParent)); })()}
            </NockerlSurface>
          )}
        </NockerlSurface>
      )}
      <style>{NOCKERL_MENU_STYLES}</style>
    </>
  );
}

// THE dropdown-menu primitive (the FACSIMILE map points role=menu / role=menuitem here).
// It OWNS every control it renders: the outside-click SCRIM + each item ROW as a raw
// <button>, and the role="menu" surfaces / role="menuitem" rows. Its rows come from the
// `MenuItem[]` DATA prop (not component slots), and `children` is a render-prop that
// returns the host's TRIGGER buttons (scaffolding), not menu content → a leaf that owns.
export const compose = {
  tier: 'leaf',
  owns: ['button', 'role=menu', 'role=menuitem'],
} satisfies ComposeContract;

export default NockerlMenu;
