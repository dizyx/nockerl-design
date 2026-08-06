/**
 * _Breadcrumbs: the shared, site-local Breadcrumbs canon (extracted from
 * BreadcrumbsDemo so the component grows without busting the demo's
 * file budget). A hierarchical path/trail in CHROME: a <nav> landmark wrapping an
 * ordered list; each ancestor composes the real NockerlLink, the last crumb is the
 * current page (aria-current, non-interactive), and a deep middle collapses into a
 * keyboard-operable "…" popover (the overflow menu).
 *
 * MOBILE / NARROW: breadcrumbs are a desktop pattern, so on a phone-narrow
 * container the trail auto-collapses to FIRST + "…" + CURRENT (the hidden ancestors
 * stay reachable through the same keyboard-operable overflow menu), and the current
 * crumb keeps its ellipsis. Width-aware via one ResizeObserver on the bar (the bar is
 * a block whose width is parent-driven, so the measurement can never oscillate with
 * the collapse state). Desktop rendering is UNTOUCHED: the threshold only bites
 * below a phone-ish container width (NO-REGRESS: the praised desktop trail).
 *
 * Laws, verbatim (unchanged from the earlier build): chrome bar + signature cyan line;
 * neutral shadow + catch-light (no glow); current crumb reads via weight + color;
 * flash-free hover; focus is an outline; 12px control radius; cyan is the only
 * accent. TOKEN-REACTIVE throughout; literals are pure geometry only.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KeyboardEvent, ReactNode } from 'react';
import { NockerlIcon, NockerlIconButton, NockerlLink, NockerlSurface, type ComposeContract } from '@dizyx/nockerl-react';

export interface Crumb {
  /** Visible label: the crumb's accessible name. */
  label: string;
  /** Destination href. Omit on the current (last) crumb; it's non-interactive. */
  href?: string;
  /** Optional leading glyph key (root / folder / task / file). */
  icon?: IconKey;
}

export type IconKey = 'root' | 'folder' | 'task' | 'file';

// House stroke icons use currentColor so each slot tints with its crumb. The
// chevron is the SAME path the NockerlListItem / Accordion use, keeping the separator
// consistent with the rest of the system.
const IconChevron = <NockerlIcon className="nk-bc__chev-svg" name="chevronRight" />;
// The overflow affordance: horizontal "…" dots (the collapsed-middle trigger glyph).
const IconMore = (
  <NockerlIcon>
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </NockerlIcon>
);
export const GLYPH: Record<IconKey, ReactNode> = {
  // root = the workspace/home mark the apps use for a workspace-scoped session
  root: (
    <NockerlIcon>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
    </NockerlIcon>
  ),
  folder: <NockerlIcon path="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  task: (
    <NockerlIcon>
      <path d="M9 11l2.5 2.5L16 8" />
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </NockerlIcon>
  ),
  file: (
    <NockerlIcon>
      <path d="M14 3v5h5" />
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    </NockerlIcon>
  ),
};

// Breadcrumbs live in CHROME (top-bar surface) under the signature cyan line,
// the apps' header treatment. The bar lifts with a neutral shadow + top
// catch-light (NO glow). Crumb fills are STATIC; hover/active animate a neutral
// wash + brightness only. Every value is a token.
export const BREADCRUMBS_STYLES = `
/* The chrome bar that carries the trail: lit from above, signature cyan line. */
.nk-bc-bar {
  position: relative;
  background: var(--color-chrome-surface);
  border: var(--space-px) solid var(--color-chrome-hairline);
  border-radius: var(--radius-control);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  padding: var(--space-2) var(--space-3) calc(var(--space-2) + var(--space-px));
  overflow: hidden;
}
/* The platform's 1.5dp cyan signature accent line, hugging the bottom edge. */
.nk-bc-bar::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0;
  height: var(--space-0-5);
  background: var(--color-accent-primary);
}

/* The trail: an ordered list rendered as ONE baseline-aligned row. */
.nk-bc {
  list-style: none; margin: 0; padding: 0;
  display: flex; align-items: center; flex-wrap: nowrap;
  gap: var(--space-0-5);
  min-width: 0;
}
/* Each crumb cell holds its intrinsic width by default. Only the CURRENT crumb's
   cell is allowed to shrink (below) so the ellipsis happens inside its own box and
   never overprints the prior crumb or the separator. */
.nk-bc__item { display: inline-flex; align-items: center; gap: var(--space-0-5); flex: 0 0 auto; min-width: auto; }
/* The current crumb's cell is the ONLY shrinkable one: it gives up width so its
   label can ellipsize, while leading crumbs + separators stay put. */
.nk-bc__item:last-child { flex: 0 1 auto; min-width: 0; }

/* Interactive crumbs compose the NockerlLink primitive (muted); the anchor + focus ring +
   the neutral hover treatment live in NOCKERL_LINK_STYLES, so no crumb-link recipe here. */

/* The CURRENT (last) crumb: marked + non-interactive. Reads by WEIGHT + color,
   not a glow and not a brand fill. */
.nk-bc__current {
  display: inline-flex; align-items: center; gap: var(--space-1);
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-semibold);
  line-height: var(--font-line-height-16);
  color: var(--color-on-chrome);
  padding: var(--space-1) var(--space-2);
  flex: 0 1 auto; min-width: 0;
}
/* Only the current crumb's LABEL is the shrink/ellipsis target. min-width:0 lets it
   collapse below its text width and clip WITHIN the current crumb's own box, so the
   ellipsis never pushes over the separator or the preceding crumb. */
.nk-bc__current .nk-bc__label { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Leading glyph in a crumb. */
.nk-bc__glyph { flex: 0 0 auto; display: inline-flex; }
.nk-bc__glyph svg { display: block; width: 15px; height: 15px; }     /* glyph geometry */
.nk-bc__current .nk-bc__glyph { color: inherit; }

/* The separator chevron: muted, aria-hidden, baseline-aligned between crumbs. */
.nk-bc__sep { flex: 0 0 auto; display: inline-flex; align-items: center; color: var(--color-on-chrome-muted); opacity: .7; }
.nk-bc__chev-svg { display: block; width: 14px; height: 14px; }      /* glyph geometry */

/* Overflow "…" composes the NockerlIconButton primitive (plain); its target + hover
   wash + focus ring live in NOCKERL_ICON_BUTTON_STYLES, so no crumb-more recipe here. */

/* The collapsed-middle popover: a lifted card (16px radius, neutral shadow +
   catch-light). The MENU is a card; the trail is chrome. Bg / hairline / radius /
   sheen come from the NockerlSurface primitive; only layout + the off-ladder drop shadow stay. */
.nk-bc__menu {
  /* Rendered in a document.body PORTAL and anchored under the "…" trigger via inline
     left/top, so the breadcrumb bar's overflow:hidden (rounded chrome + accent line)
     can never clip it. z-index rides above page chrome. */
  position: fixed; z-index: 50;
  min-width: calc(var(--space-16) * 3);
  margin: 0; padding: var(--space-1);
  list-style: none;
  box-shadow: 0 var(--space-2) var(--elevation-level3) -8px color-mix(in srgb, var(--color-shadow-tint) 65%, transparent), var(--nk-surface-sheen);
  transform-origin: top left;
  animation: nk-bc-pop .12s cubic-bezier(.2,0,0,1);
}
@keyframes nk-bc-pop { from { opacity: 0; transform: translateY(-4px) scale(.98); } to { opacity: 1; transform: none; } }
.nk-bc__menu-item {
  display: flex; align-items: center; gap: var(--space-2); width: 100%;
  font-family: inherit; font-size: var(--font-size-12); font-weight: var(--font-weight-medium);
  color: var(--color-on-card);
  text-decoration: none; text-align: left;
  background: transparent; border: 0; border-radius: var(--radius-control);
  padding: var(--space-2) var(--space-2); min-height: var(--space-8);
  cursor: pointer;
  transition: background-color .12s;
}
.nk-bc__menu-item:hover, .nk-bc__menu-item:focus-visible { background: color-mix(in srgb, var(--color-on-card) 7%, transparent); }
.nk-bc__menu-item:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(var(--space-0-5) * -1); }
.nk-bc__menu-item .nk-bc__glyph { color: var(--color-on-card-muted); }
.nk-bc__menu-item .nk-bc__glyph svg { width: 16px; height: 16px; }

/* Width-capped trail, proving truncation: the LAST crumb ellipsizes, the rest
   stay legible, then the middle collapses into the "…" menu. */
.nk-bc--capped { max-width: calc(var(--space-16) * 6); }

@media (prefers-reduced-motion: reduce) {
  .nk-bc__menu-item { transition: none; }
  .nk-bc__menu { animation: none; }
}
`;

/** The collapsed-middle overflow control: a "…" button + a keyboard-operable
 *  popover listing the hidden ancestor crumbs. */
function OverflowMenu({ hidden, onPick }: { hidden: Crumb[]; onPick: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  // Set pos + open TOGETHER: the menu only renders once pos is set, so measuring in the
  // effect below would mount it a render after `open` and the first-item focus would miss it.
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ left: r.left, top: r.bottom + 4 });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    itemRefs.current[0]?.focus();
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const dismiss = () => setOpen(false);
    document.addEventListener('mousedown', onDocDown);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open]);

  const close = (restore = true) => {
    setOpen(false);
    if (restore) btnRef.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent, idx: number) => {
    const n = hidden.length;
    let to = -1;
    if (e.key === 'ArrowDown') to = (idx + 1) % n;
    else if (e.key === 'ArrowUp') to = (idx - 1 + n) % n;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = n - 1;
    else if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    else if (e.key === 'Tab') { close(false); return; }
    else return;
    e.preventDefault();
    itemRefs.current[to]?.focus();
  };

  return (
    <>
      {/* the overflow "…" trigger is a real NockerlIconButton (plain). It forwards the ref
          (so Escape can restore focus), aria-haspopup / aria-expanded / aria-controls,
          onClick and onKeyDown straight through to its <button>. */}
      <NockerlIconButton
        ref={btnRef}
        icon={IconMore}
        label="Show hidden path segments"
        variant="plain"
        size={24}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => {
          if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !open) {
            e.preventDefault();
            openMenu();
          }
        }}
      />
      {open && pos && createPortal(
        <NockerlSurface
          as="ul"
          ref={menuRef}
          className="nk-bc__menu"
          id={menuId}
          role="menu"
          aria-label="Hidden path segments"
          style={{ left: pos.left, top: pos.top }}
        >
          {hidden.map((c, i) => (
            <li key={c.label} role="none">
              <button
                ref={(el) => { itemRefs.current[i] = el; }}
                type="button"
                role="menuitem"
                className="nk-bc__menu-item"
                onClick={() => { onPick(c.label); close(); }}
                onKeyDown={(e) => onMenuKey(e, i)}
              >
                {c.icon && <span className="nk-bc__glyph">{GLYPH[c.icon]}</span>}
                <span>{c.label}</span>
              </button>
            </li>
          ))}
        </NockerlSurface>,
        document.body,
      )}
    </>
  );
}

// The phone-narrow threshold (px). Below this CONTAINER width the trail
// auto-collapses to first + "…" + current. A JS geometry constant (the size ramp has
// no phone-breakpoint token); the bar's width is parent-driven so this never oscillates.
const NARROW_CONTAINER = 480;

/**
 * The Breadcrumbs component is a hierarchical path/trail. The whole thing is a
 * <nav> landmark wrapping an ordered list; each ancestor is a real link, the last
 * crumb is the current page (aria-current, non-interactive). Pass `collapseAfter`
 * to fold the middle into a keyboard-operable "…" popover when the trail is deep.
 * On a phone-narrow container the trail AUTO-collapses to first + "…" + current
 * crumb; the desktop render is untouched.
 */
export function Breadcrumbs({
  items,
  collapseAfter,
  capped = false,
  onNavigate,
}: {
  items: Crumb[];
  /** Keep the first crumb + this many trailing crumbs; collapse the rest. */
  collapseAfter?: number;
  /** Cap the width so the last crumb truncates with an ellipsis. */
  capped?: boolean;
  onNavigate?: (label: string) => void;
}) {
  const last = items.length - 1;

  // Width-aware: one ResizeObserver on the bar (block-level, parent-driven
  // width → measuring cannot feed back into the collapse). SSR renders the desktop
  // shape; a narrow container corrects on mount.
  const barRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const sync = () => setNarrow(el.clientWidth < NARROW_CONTAINER);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Decide what's visible vs. collapsed into the overflow menu. Narrow containers
  // force the tightest fold (first + "…" + current) regardless of the caller's prop.
  const effCollapseAfter = narrow ? 1 : collapseAfter;
  let leading: Crumb[] = items;
  let hidden: Crumb[] = [];
  let trailing: Crumb[] = [];
  const collapsed = effCollapseAfter != null && items.length > effCollapseAfter + 2;
  if (collapsed) {
    leading = [items[0]!];
    hidden = items.slice(1, items.length - effCollapseAfter!);
    trailing = items.slice(items.length - effCollapseAfter!);
  }

  const renderCrumb = (c: Crumb, globalIndex: number) => {
    const isCurrent = globalIndex === last;
    if (isCurrent) {
      return (
        <span className="nk-bc__current" aria-current="page">
          {c.icon && <span className="nk-bc__glyph">{GLYPH[c.icon]}</span>}
          <span className="nk-bc__label">{c.label}</span>
        </span>
      );
    }
    // An interactive crumb composes the real NockerlLink primitive (muted variant, the
    // chrome-trail treatment, matching the TopBar breadcrumb slot). NockerlLink renders the
    // <a href> + owns its focus ring; the leading glyph rides its leadingIcon slot.
    return (
      <NockerlLink
        variant="muted"
        href={c.href ?? '#'}
        onClick={() => onNavigate?.(c.label)}
        {...(c.icon ? { leadingIcon: GLYPH[c.icon] } : {})}
      >
        {c.label}
      </NockerlLink>
    );
  };

  const sep = (
    <span className="nk-bc__sep" aria-hidden="true">{IconChevron}</span>
  );

  return (
    <div className="nk-bc-bar" ref={barRef}>
      <nav aria-label="Breadcrumb">
        <ol className={`nk-bc${capped ? ' nk-bc--capped' : ''}`}>
          {!collapsed &&
            items.map((c, i) => (
              <li className="nk-bc__item" key={c.label}>
                {renderCrumb(c, i)}
                {i < last && sep}
              </li>
            ))}

          {collapsed && (
            <>
              <li className="nk-bc__item" key="lead">
                {renderCrumb(leading[0]!, 0)}
                {sep}
              </li>
              <li className="nk-bc__item" key="more">
                <OverflowMenu hidden={hidden} onPick={(l) => onNavigate?.(l)} />
                {sep}
              </li>
              {trailing.map((c, i) => {
                const gi = items.length - trailing.length + i;
                return (
                  <li className="nk-bc__item" key={c.label}>
                    {renderCrumb(c, gi)}
                    {gi < last && sep}
                  </li>
                );
              })}
            </>
          )}
        </ol>
      </nav>
    </div>
  );
}

// Breadcrumbs is a tier-3 COMPOSITE that composes its primitives: every interactive
// crumb is a <NockerlLink variant="muted"> and the overflow "…" trigger is an <NockerlIconButton>.
// FLAG (review): the collapsed-middle popover's ROWS are still hand-rolled
// <button role="menuitem"> inside the real NockerlSurface primitive. They are NOT converted to
// the NockerlMenu primitive on purpose: NockerlMenu is a monolithic anchored-dropdown engine that
// clamps its surface INSIDE a roomy stageRef (see MenuDemo's tall stage), and a single-row
// breadcrumb chrome bar (.nk-bc-bar, overflow:hidden) is too short to host it without
// breaking the trail/truncation layout. Composing NockerlMenu here needs either a NockerlMenu that
// body-portals / supports a thin anchor, or a lightweight menu-list primitive. Leaf shape
// (crumbs come from the `items` DATA prop, no component slots; each crumb composes NockerlLink).
// OWNS button + role=menuitem: the collapsed-crumb overflow menu lives inside the THIN breadcrumb bar
// (the NockerlMenu primitive clamps to a roomy stage), so it is Breadcrumbs' own control.
export const compose = { tier: 'leaf', owns: ['button', 'role=menuitem'] } satisfies ComposeContract;
