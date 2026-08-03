/**
 * NockerlTabs: the Tier-3 sectioned-content switcher primitive. ONE home for the WAI-ARIA
 * tablist / tab / tabpanel pattern: a `role="tablist"` of tabs, each owning a
 * `role="tabpanel"` that swaps in below, with a sliding cyan indicator (underline) or
 * an enclosed soft-cyan pill, roving-tabindex keyboard nav, count badges, a disabled
 * tab, and a scrollable overflow row with edge fades. Composes NockerlSurface (the panel) +
 * tokens; the caller passes any icon/badge content.
 *
 * DELIBERATELY DISTINCT from NockerlSegmentedControl: that flips mutually-exclusive VIEWS/MODES
 * with NO panels (role="radiogroup", one pill on a connected recessed track). NockerlTabs
 * NAVIGATE SECTION content: each tab owns a panel; the indicator is a thin underline (or
 * an enclosed pill), never a connected track. Use NockerlSegmentedControl for single-select pill
 * toolbars; use NockerlTabs when each option reveals its own panel.
 *
 * Sourced from the shipped apps (never the web dashboard). Android's signature motif is
 * the 1.5dp cyan "signature line" under every sheet header (Inbox / Tasks / Files). The
 * underline indicator is that line slid under the active tab. Android RETIRED the all-cyan
 * Material PrimaryTabRow (too much cyan): inactive tabs are MUTED, only the ACTIVE tab
 * gets the cyan label + underline (InboxSheet.kt). The enclosed/pill variant mirrors
 * NockerlSegmented's active soft-cyan fill. Voice/Swift has no shipped tabs-with-panels
 * yet (settings use a sidebar), flagged as drift.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • the INDICATOR is ONE element whose static cyan fill NEVER tweens. It SLIDES
 *     (translateX) + resizes (width) to the active tab; labels cross-fade color/weight
 *     only. 12px control radius on the enclosed track + pill (never a stadium).
 *   • cyan is the SELECTION signal only; count badges reuse the soft-accent badge
 *     treatment (NOT a status color).
 *   • a real control: roving tabindex (ONE tab stop), Arrow/Home/End MOVE + auto-activate,
 *     a disabled tab is SKIPPED but legible, the panel is focusable + labelled by its tab.
 *     Focus is an OUTLINE ring. Under prefers-reduced-motion the indicator still MOVES, it
 *     just teleports (no slide).
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a var(--token).
 * Literals remain only for pure geometry (icon dimensions, transition curves).
 *
 * Injects the recipe CSS as the LAST child of the .nk-tb root (no consumer relies on a
 * first/last-child or adjacent-sibling selector under it); identical blocks dedupe in effect.
 */
import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import type { ComposeContract } from '../compose-contract';
import { NockerlSurface } from '../primitives/Surface';

export type NockerlTabsVariant = 'underline' | 'enclosed';
export type NockerlTabsSize = 'sm' | 'md';

export interface TabItemDef {
  /** Stable value emitted on selection (and used as the panel key). */
  value: string;
  /** Visible label: the tab's accessible name carrier. */
  label: string;
  /** Optional leading glyph (any node; tints with the label via currentColor). */
  icon?: ReactNode;
  /** Optional trailing count badge (e.g. an unread / item count). */
  count?: number;
  /** Inert + clearly-seen single tab (skipped by arrow keys). */
  disabled?: boolean;
  /**
   * UNSAVED marker (task 2656 dev-tab-bar): a small neutral dot in the trailing slot,
   * the editor "dirty" idiom. With `onClose` it yields to the close X on hover/focus.
   */
  dirty?: boolean;
  /** The associated tabpanel body. */
  panel?: ReactNode;
}

export interface NockerlTabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The tabs, left-to-right. Each owns a panel rendered via `renderPanel` or its own `panel`. */
  tabs: TabItemDef[];
  /** The active tab value (controlled). Exactly one tab is selected. */
  value: string;
  /** Fired with the next value. Ignored for a disabled tab. */
  onChange?: (next: string) => void;
  /** Accessible name for the whole tablist (wired via aria-label). */
  label: string;
  /** Underline indicator (default) vs. 'enclosed': the same cyan underline seated inside a recessed well. */
  variant?: NockerlTabsVariant;
  /** Tab height + padding + type role. */
  size?: NockerlTabsSize;
  /** Renders the body for the active tab. Falls back to the tab's own `panel`. */
  renderPanel?: (value: string) => ReactNode;
  /**
   * CLOSABLE tabs (task 2656 dev-tab-bar): when set, every tab grows a trailing close
   * affordance (pointer) and DELETE / BACKSPACE closes the focused tab (the keyboard half
   * of the ARIA deletable-tabs pattern; the X itself stays out of the tab order). The list
   * stays CONTROLLED: this only reports the value; the host removes the tab + moves
   * selection.
   */
  onClose?: ((value: string) => void) | undefined;
}

// The TABLIST is a baseline strip with a full-width hairline; the active tab's UNDERLINE
// is ONE static cyan line that SLIDES + resizes over it. The enclosed variant nests tabs
// in a recessed well with ONE soft-cyan pill that slides. Labels cross-fade color/weight
// only. No fill ever tweens. All values are tokens; literals are pure geometry / curves.
export const NOCKERL_TABS_STYLES = `
/* ── The TABS wrapper (tablist + panel share one width) ───────────────────── */
.nk-tb { display: block; }

/* ── UNDERLINE variant: tabs sit on a full-width baseline hairline ──────────── */
.nk-tb__list { position: relative; display: flex; align-items: stretch; gap: var(--space-1);
  border-bottom: var(--space-px) solid var(--color-card-hairline); }

/* The sliding UNDERLINE: one element, static cyan fill; SLIDES (transform) + resizes
   (width), fill never tweens. Width = the active tab's LABEL box.
   : this is an indicator BAR (a marker), not an outline around content. It takes the
   INDICATOR weight and stays SOLID at full opacity; only outlines soften to 45%. */
.nk-tb__ind { position: absolute; bottom: calc(-1 * var(--space-px)); left: 0; height: var(--border-width-indicator);
  border-radius: var(--radius-pill); background: var(--color-accent-primary);
  transition: transform .26s var(--motion-easing-standard), width .26s var(--motion-easing-standard);
  pointer-events: none; z-index: 1; }
.nk-tb__ind--hidden { opacity: 0; }   /* before first measure / no selection */

/* A TAB: centered both axes; inactive = muted, no cyan; only color/weight cross-fade. */
.nk-tb__tab { position: relative; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2); border: 0; background: transparent; cursor: pointer; white-space: nowrap;
  font-family: inherit; color: var(--color-on-card-muted); font-weight: var(--font-weight-medium);
  border-radius: var(--radius-control) var(--radius-control) 0 0;
  transition: color .2s, background-color .2s, font-weight .2s; }
.nk-tb--underline .nk-tb__tab[aria-selected="true"] { color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); }
.nk-tb__tab:not([aria-selected="true"]):not(:disabled):hover { color: var(--color-on-card);
  background: color-mix(in srgb, var(--color-on-card) 5%, transparent); }
.nk-tb__tab:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(-1 * var(--space-0-5)); border-radius: var(--radius-control); }
.nk-tb__tab:disabled { cursor: not-allowed; color: var(--color-on-card-muted); opacity: .45; }

/* sizes */
.nk-tb--sm .nk-tb__tab { font-size: var(--font-size-12); padding: var(--space-2) var(--space-3); min-height: var(--space-8); }
.nk-tb--md .nk-tb__tab { font-size: var(--font-size-14); padding: var(--space-3) var(--space-4); min-height: var(--space-10); }

/* the label box, measured so the underline hugs the text, not the padding. */
.nk-tb__lbl { display: inline-flex; align-items: center; gap: var(--space-2); line-height: 1; }
.nk-tb__ico { display: inline-flex; flex: 0 0 auto; }
.nk-tb--sm .nk-tb__ico svg { width: 14px; height: 14px; display: block; }
.nk-tb--md .nk-tb__ico svg { width: 16px; height: 16px; display: block; }

/* count badge: soft-accent treatment (NOT a status color); brightens on the active tab. */
.nk-tb__badge { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto;
  min-width: var(--space-4); height: var(--space-4); padding: 0 var(--space-1); border-radius: var(--radius-pill);
  font-size: var(--font-size-10); font-weight: var(--font-weight-semibold); line-height: 1;
  background: color-mix(in srgb, var(--color-on-card) 10%, transparent); color: var(--color-on-card-muted);
  transition: background-color .2s, color .2s; }
.nk-tb__tab[aria-selected="true"] .nk-tb__badge { background: var(--color-accent-primary-soft); color: var(--color-accent-primary); }

/* ── ENCLOSED variant: the sliding-underline row nested in a recessed well ──── */
.nk-tb--enclosed .nk-tb__list { gap: var(--space-0-5); border-bottom: 0; padding: var(--space-0-5) var(--space-0-5) var(--space-1);
  background: var(--color-canvas-alt); border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-control); display: inline-flex;
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent); }
/* the enclosed indicator is the SAME sliding cyan UNDERLINE as the plain variant, seated at the
   bottom of the active tab INSIDE the recessed well, NEVER a filled pill (a fill would ape
   NockerlSegmentedControl;  / native option b). */
/* : same marker bar, same INDICATOR weight, still solid (the offset below stays a
   spacing step, since only the bar's thickness is a border-weight decision). */
.nk-tb--enclosed .nk-tb__ind { top: auto; bottom: var(--space-0-5); height: var(--border-width-indicator); left: 0;
  border-radius: var(--radius-pill); background: var(--color-accent-primary); border: 0; box-shadow: none; }
.nk-tb--enclosed .nk-tb__tab { border-radius: calc(var(--radius-control) - var(--space-0-5)); font-weight: var(--font-weight-medium); }
.nk-tb--enclosed .nk-tb__tab[aria-selected="true"] { color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); }
.nk-tb--enclosed .nk-tb__tab:not([aria-selected="true"]):not(:disabled):hover { background: color-mix(in srgb, var(--color-on-card-alt) 6%, transparent); color: var(--color-on-card-alt); }
/* : the sm/md enclosed min-heights pointed at UNDEFINED tokens (--space-7/--space-9, which
   the scale skips) and have resolved to auto since birth; removed rather than silently
   grown. Enclosed tab geometry is 's redesign anyway. */

/* ── DEV-TAB trailing slot (task 2656): a 16px grid stacking the DIRTY dot and the
   close X. Dot at rest; with a closable tab the X cross-fades in on the TAB's hover /
   focus (opacity only: interpolatable, frozen under reduced motion). X hit area is
   pointer-only (keyboard closes via Delete). ── */
.nk-tb__trail { position: relative; display: inline-grid; place-items: center;
  width: var(--space-4); height: var(--space-4); margin-left: var(--space-1);
  border-radius: var(--radius-pill); flex: 0 0 auto; }
.nk-tb__dot { grid-area: 1 / 1; width: 7px; height: 7px; border-radius: var(--radius-pill);
  background: var(--color-on-card-muted); transition: opacity .12s; }
.nk-tb__x { grid-area: 1 / 1; display: block; width: 12px; height: 12px;
  color: var(--color-on-card-muted); opacity: 0; transition: opacity .12s, color .12s; }
/* closable-only (no dirty): the X is always present, quiet. */
.nk-tb__trail--closable:not(.nk-tb__trail--dirty) .nk-tb__x { opacity: 1; }
/* dirty + closable: dot rests; hovering/focusing the TAB swaps dot -> X. */
.nk-tb__tab:hover .nk-tb__trail--closable .nk-tb__x,
.nk-tb__tab:focus-visible .nk-tb__trail--closable .nk-tb__x { opacity: 1; }
.nk-tb__tab:hover .nk-tb__trail--closable .nk-tb__dot,
.nk-tb__tab:focus-visible .nk-tb__trail--closable .nk-tb__dot { opacity: 0; }
/* the X brightens + washes under its own pointer */
.nk-tb__trail--closable:hover { background: color-mix(in srgb, var(--color-on-card) 10%, transparent); }
.nk-tb__trail--closable:hover .nk-tb__x { color: var(--color-on-card); }

/* ── SCROLLABLE / overflow tablist: horizontal scroll + edge fades ─────────── */
.nk-tb__scroller { position: relative; }
.nk-tb__scroller .nk-tb__list { overflow-x: auto; scrollbar-width: none; scroll-behavior: smooth; }
.nk-tb__scroller .nk-tb__list::-webkit-scrollbar { display: none; }
/* edge fades: a gradient to the CANVAS, shown only on a side with hidden content. */
.nk-tb__fade { position: absolute; top: 0; bottom: var(--space-px); width: var(--space-8); pointer-events: none; z-index: 2;
  opacity: 0; transition: opacity .2s; }
.nk-tb__fade--on { opacity: 1; }
.nk-tb__fade--l { left: 0; background: linear-gradient(90deg, var(--color-canvas), color-mix(in srgb, var(--color-canvas) 0%, transparent)); }
.nk-tb__fade--r { right: 0; background: linear-gradient(270deg, var(--color-canvas), color-mix(in srgb, var(--color-canvas) 0%, transparent)); }

/* ── The PANEL: aligned to the tablist, lifts off the ground (card law). Bg / hairline /
   radius / sheen come from the NockerlSurface primitive; only margin + padding + the off-ladder
   drop shadow stay. ─────── */
.nk-tb__panel { margin-top: var(--space-4);
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent), var(--nk-surface-sheen);
  padding: var(--space-5); min-height: var(--size-panel-min); }
.nk-tb__panel:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
/* panel content cross-fades in (opacity + a small rise: interpolatable, no fill swap) */
.nk-tb__panel-in { animation: nk-tb-in .24s var(--motion-easing-standard); }
@keyframes nk-tb-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

@media (prefers-reduced-motion: reduce) {
  .nk-tb__ind { transition: none; }       /* still MOVES, just no slide */
  .nk-tb__tab, .nk-tb__badge, .nk-tb__dot, .nk-tb__x { transition: none; }
  .nk-tb__panel-in { animation: none; }
}
`;

/**
 * One Nockerl tabs component is the unit the spec documents. A `role="tablist"` of tabs
 * each owning a `role="tabpanel"`; ONE cyan indicator (underline) or soft-cyan pill
 * (enclosed) SLIDES to the active tab (fill never tweens, only transform + width).
 * Roving tabindex; Arrow/Home/End move + auto-activate; a disabled tab is skipped; the
 * panel is labelled by its tab. The recipe CSS is injected as the .nk-tb root's last child.
 */
export const NockerlTabs = forwardRef<HTMLDivElement, NockerlTabsProps>(function NockerlTabs({
  tabs,
  value,
  onChange,
  label,
  variant = 'underline',
  size = 'md',
  renderPanel,
  onClose,
  className,
  ...rest
}, ref) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lblRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  const [edges, setEdges] = useState({ l: false, r: false });

  const id = label.replace(/\s+/g, '-').toLowerCase();
  const enabledIdx = tabs.map((t, i) => (t.disabled ? -1 : i)).filter((i) => i >= 0);
  const fallback = enabledIdx[0] ?? 0;
  const selIdx = tabs.findIndex((t) => t.value === value && !t.disabled);
  // Roving tabindex: only the selected tab is tabbable (else first enabled).
  const tabbable = selIdx >= 0 ? selIdx : fallback;

  // Measure the active tab so the indicator aligns EXACTLY: the sliding cyan underline hugs the
  // LABEL box in BOTH variants. Enclosed is the same underline seated inside a recessed well
  // (, never a filled pill). Re-measure on resize / size / variant / value / tab changes.
  useLayoutEffect(() => {
    const measure = () => {
      const tab = tabRefs.current[selIdx];
      const lbl = lblRefs.current[selIdx];
      if (!listRef.current || selIdx < 0 || !tab || !lbl) return setInd(null);
      setInd({ x: tab.offsetLeft + lbl.offsetLeft, w: lbl.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    return () => ro.disconnect();
  }, [selIdx, size, variant, tabs]);

  // Track scroll edges (for the overflow fades): show a fade only on a side with hidden
  // content. Recompute on scroll (the handler) + resize (the observer).
  const syncEdges = () => {
    const list = listRef.current;
    if (!list) return;
    const max = list.scrollWidth - list.clientWidth;
    setEdges({ l: list.scrollLeft > 1, r: list.scrollLeft < max - 1 });
  };
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(syncEdges);
    ro.observe(list);
    return () => ro.disconnect();
  }, [tabs, size, variant]);

  const select = (i: number) => {
    const next = tabs[i];
    if (!next || next.disabled) return;
    tabRefs.current[i]?.focus();
    tabRefs.current[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    onChange?.(next.value);
  };

  const move = (from: number, dir: 1 | -1) => {
    if (enabledIdx.length === 0) return;
    const pos = enabledIdx.indexOf(from);
    const seed = pos >= 0 ? pos : 0;
    const next = enabledIdx[(seed + dir + enabledIdx.length) % enabledIdx.length]!;
    select(next);
  };

  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown') move(idx, 1);
    else if (k === 'ArrowLeft' || k === 'ArrowUp') move(idx, -1);
    else if (k === 'Home') select(enabledIdx[0] ?? idx);
    else if (k === 'End') select(enabledIdx[enabledIdx.length - 1] ?? idx);
    // deletable-tabs pattern (task 2656): Delete/Backspace closes the focused tab.
    else if ((k === 'Delete' || k === 'Backspace') && onClose) onClose(tabs[idx]!.value);
    else return;
    e.preventDefault();
  };

  const tablist = (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      className="nk-tb__list"
      onScroll={syncEdges}
    >
      <span
        aria-hidden="true"
        className={`nk-tb__ind${ind ? '' : ' nk-tb__ind--hidden'}`}
        style={ind ? { transform: `translateX(${ind.x}px)`, width: `${ind.w}px` } : undefined}
      />
      {tabs.map((t, i) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => void (tabRefs.current[i] = el)}
            type="button"
            role="tab"
            id={`${id}-tab-${t.value}`}
            aria-selected={selected}
            aria-controls={`${id}-panel-${t.value}`}
            aria-keyshortcuts={onClose ? 'Delete' : undefined}
            tabIndex={i === tabbable && !t.disabled ? 0 : -1}
            disabled={t.disabled}
            className="nk-tb__tab"
            onClick={t.disabled ? undefined : () => select(i)}
            onKeyDown={t.disabled ? undefined : (e) => onKeyDown(e, i)}
          >
            <span className="nk-tb__lbl" ref={(el) => void (lblRefs.current[i] = el)}>
              {t.icon != null && <span className="nk-tb__ico">{t.icon}</span>}
              <span>{t.label}</span>
              {typeof t.count === 'number' && <span className="nk-tb__badge">{t.count}</span>}
            </span>
            {/* trailing dev-tab affordance (task 2656): the dirty dot at rest; with
                onClose the X takes over on hover/focus. The X is a pointer affordance,
                kept OUT of the tab order because the keyboard closes via Delete
                (role=presentation, nested-interactive-free). */}
            {(onClose || t.dirty) && (
              <span
                className={`nk-tb__trail${t.dirty ? ' nk-tb__trail--dirty' : ''}${onClose ? ' nk-tb__trail--closable' : ''}`}
                role="presentation"
                onClick={
                  onClose
                    ? (e) => {
                        e.stopPropagation();
                        onClose(t.value);
                      }
                    : undefined
                }
              >
                {t.dirty && <span className="nk-tb__dot" aria-hidden="true" />}
                {onClose && (
                  <svg className="nk-tb__x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div {...rest} ref={ref} className={['nk-tb', `nk-tb--${variant}`, `nk-tb--${size}`, className].filter(Boolean).join(' ')}>
      {variant === 'underline' ? (
        <div className="nk-tb__scroller">
          <span className={`nk-tb__fade nk-tb__fade--l${edges.l ? ' nk-tb__fade--on' : ''}`} aria-hidden="true" />
          {tablist}
          <span className={`nk-tb__fade nk-tb__fade--r${edges.r ? ' nk-tb__fade--on' : ''}`} aria-hidden="true" />
        </div>
      ) : (
        tablist
      )}
      {tabs.map((t) => {
        if (t.value !== value) return null;
        return (
          <NockerlSurface
            key={t.value}
            role="tabpanel"
            id={`${id}-panel-${t.value}`}
            aria-labelledby={`${id}-tab-${t.value}`}
            tabIndex={0}
            className="nk-tb__panel"
          >
            <div className="nk-tb__panel-in">{renderPanel ? renderPanel(t.value) : t.panel}</div>
          </NockerlSurface>
        );
      })}
      <style>{NOCKERL_TABS_STYLES}</style>
    </div>
  );
});

// THE tablist/tab primitive (the FACSIMILE map points role=tab / role=tablist here). It
// OWNS the raw controls it renders: the role="tablist" strip and each role="tab" <button>.
// NockerlTabs + their panel bodies come from the `tabs` DATA prop (+ the `renderPanel` render-prop),
// not component slots: a leaf that owns its controls. (Each panel is a composed <NockerlSurface>.)
export const compose = {
  tier: 'leaf',
  owns: ['button', 'role=tab', 'role=tablist'],
} satisfies ComposeContract;

export default NockerlTabs;
