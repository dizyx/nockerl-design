/**
 * SidebarDemo: the live, interactive Nockerl SIDEBAR / nav-rail island for web.
 *
 * The sidebar is the PERSISTENT, in-layout navigation column, distinct from its
 * siblings: app-shell is the whole scaffold (top bar + nav + content over the facet
 * field), drawer is an edge-anchored OVERLAY over a scrim, bottom-nav is the mobile
 * tab bar. This sidebar STAYS in the layout: flush beside the content, never floating
 * over it, never dimming it with a scrim.
 *
 * Sourced from the shipped canonical sidebar, Voice's DashboardView.swift (a fixed
 * 216pt panel: brand top → nav rows → spacer → a Settings cog PINNED to the bottom; a
 * row is icon[width 20] + title; a SELECTED row = cyan label + cyan@0.16 fill +
 * cyan@0.45 border, hover = onSurface@0.06, radius 8). We extend that one vocabulary
 * into the full sidebar the framework owns: grouped sections, a trailing count/badge,
 * an EXPANDABLE item with nested sub-items, a profile/settings FOOTER, and an expanded
 * <-> collapsed-RAIL toggle (rail = icon-only + tooltips). Extras beyond Voice's fixed
 * panel are framework-original, flagged as drift on the page.
 *
 * Design laws, verbatim: the surface LIFTS off the content (chrome surface + a neutral
 * SIDEWAYS shadow + an inner edge catch-light + a trailing hairline), with NO glow/colored
 * shadow. A SELECTED item = faint cyan wash + cyan icon/label (section 6: wash + tint, never a rail)
 * (Voice's accent fill/border), and NEVER a full fill, glow, or fill swap;
 * --color-on-accent is used ONLY on the lone filled element (the footer avatar chip).
 * Motion animates TRANSFORM (width / chevron rotation / press scale) + a neutral WASH
 * only. The fill never tweens; expand/collapse FREEZES under prefers-reduced-motion.
 * Controls use the 12px radius; cyan is the only accent; warm tones = status/count
 * signals only.
 *
 * A11y: a <nav aria-label> landmark; every item is a real <button> (one target, one
 * name) with aria-current="page" on the active one; the expandable item carries
 * aria-expanded + aria-controls; arrow keys + Home/End rove focus, Enter/Space
 * activate, focus is an OUTLINE ring; the rail items expose their label via title +
 * aria-label (tooltips).
 *
 * TOKEN-REACTIVE (docs/demo-token-contract.md): every color / font / radius / spacing
 * / type is a var(--token); the dark stage resolves them. Literals remain only for
 * pure geometry (panel width, icon size, indicator width, dot size, blur, curves).
 */
import { useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { NockerlButton, NockerlFacetedBackground, NockerlIcon, NockerlNavItem, NockerlSegmentedControl, NockerlSurface, type ComposeContract } from '@dizyx/nockerl-react';
import NockerlLockup from '../NockerlLockup';

export type NavBadgeTone = 'neutral' | 'attention';

export interface NavSubItem {
  id: string; // Stable id: drives selection + the content swap.
  label: string; // Visible label (label.large role).
}

export interface SidebarNavItem {
  id: string; // Stable id: drives selection + the content swap.
  label: string; // Visible label (label.large role). Also the rail tooltip / a11y name.
  icon: ReactNode; // Inline stroke glyph for the leading slot.
  badge?: { count: number; tone?: NavBadgeTone }; // Trailing count. neutral = mono chip; attention = warm.
  dot?: 'streaming' | 'attention' | 'idle'; // Status dot on the icon (status colors only, never cyan).
  children?: NavSubItem[]; // Nested sub-items. Turns this row into an expandable disclosure.
}

export interface NavSection {
  label: string; // Section header label (uppercase eyebrow).
  items: SidebarNavItem[];
}

// ─── Inline stroke glyphs (currentColor, so each slot tints them from its token).
//     The shared NockerlIcon primitive renders the canonical stroke shell; these carry the
//     sidebar's 1.8 stroke weight. NockerlNavItem sizes them in its own .nk-nav__ico slot. ──
const IHome = <NockerlIcon path="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" strokeWidth={1.8} />;
const IChat = <NockerlIcon path="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1 1 21 11.5Z" strokeWidth={1.8} />;
const ITasks = <NockerlIcon path="M9 6h11M9 12h11M9 18h11M4.5 6 5 6.5 6 5M4.5 12l.5.5L6 11M4.5 18l.5.5L6 17" strokeWidth={1.8} />;
const IFiles = <NockerlIcon path="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" strokeWidth={1.8} />;
const ICluster = <NockerlIcon path="M12 4v4m0 8v4m8-8h-4M8 12H4m12.2-5.2-2.8 2.8M8.6 13.4l-2.8 2.8m11.4 0-2.8-2.8M8.6 10.6 5.8 7.8" strokeWidth={1.8} />;
// A clean, geometrically-correct gear (Lucide `settings` geometry): the toothed ring as
// one closed stroke path + a concentric center circle. Rendered on the NockerlIcon shell (24×24,
// currentColor stroke), carrying the sidebar's 1.8 stroke weight to match the row glyphs.
const ISettings = (
  <NockerlIcon strokeWidth={1.8} title="Settings">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
    <circle cx="12" cy="12" r="3" />
  </NockerlIcon>
);
const IPanelLeft = <NockerlIcon path="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM9 5v14" strokeWidth={1.8} />;

const SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { id: 'home', label: 'Home', icon: IHome },
      { id: 'chat', label: 'Chat', icon: IChat, dot: 'streaming' },
      {
        id: 'tasks',
        label: 'Tasks',
        icon: ITasks,
        badge: { count: 3, tone: 'attention' },
        children: [
          { id: 'tasks-mine', label: 'Assigned to me' },
          { id: 'tasks-review', label: 'In review' },
          { id: 'tasks-done', label: 'Done' },
        ],
      },
      { id: 'files', label: 'Files', icon: IFiles, badge: { count: 12 } },
      { id: 'cluster', label: 'Cluster', icon: ICluster, dot: 'idle' },
    ],
  },
];

// Per-destination copy so the content region visibly swaps on selection.
const BODY: Record<string, { kicker: string; head: string; sub: string }> = {
  home: { kicker: 'dizyx · nockerl-design', head: 'Workspace overview', sub: 'The persistent rail stays in the layout. It never floats over this content.' },
  chat: { kicker: 'Streaming · 2 tools running', head: 'nockerl-design · docs site', sub: 'Designing the sidebar to the token-reactive standard.' },
  tasks: { kicker: 'Needs attention · 3 open', head: 'Tasks', sub: 'Expand the item in the rail to reach the nested sub-views.' },
  'tasks-mine': { kicker: 'Tasks · assigned to me', head: 'Assigned to me', sub: 'A nested sub-item: selection lives at the leaf, not the parent.' },
  'tasks-review': { kicker: 'Tasks · in review', head: 'In review', sub: 'Awaiting the design lead’s sign-off to approved.' },
  'tasks-done': { kicker: 'Tasks · done', head: 'Done', sub: 'Shipped to the per-platform packages.' },
  files: { kicker: 'Working tree · 12 changed', head: 'Files', sub: 'A neutral trailing count chip: mono, never the warm attention tone.' },
  cluster: { kicker: 'Idle · 4 nodes online', head: 'Compute Cluster', sub: 'Tensor parallel across the local fabric.' },
  settings: { kicker: 'Account', head: 'Settings', sub: 'Reached from the cog pinned to the sidebar footer, like Voice.' },
};

const STYLES = `
.nk-sb-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }

/* toolbar: the expand/collapse toggle (NockerlButton, secondary, in toggle mode) lives on the canvas above the stage */
.nk-sb-demo__bar { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin: 0 0 var(--space-4); }
.nk-sb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0; }

/* ── The contained STAGE: sidebar + content sit side by side, in layout ── */
.nk-sb-stage { position: relative; display: flex; align-items: stretch; height: 432px; overflow: hidden; border-radius: var(--radius-card); border: var(--space-px) solid var(--color-card-hairline); background: var(--color-canvas);
  box-shadow: 0 var(--elevation-level3) 24px -10px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* the sanctioned translucency surface (the LAW-5 carve-out): a faceted-background layer sits
   BEHIND the stage; the sidebar floats over it at the fixed --color-surface-translucency-sidebar
   tone so the facet WHISPERS through: one translucent layer (the content card stays opaque). */
/* the facet IS the .nk-fb-surface root, so override its relative/aspect-ratio sizing (higher
   specificity via the stage prefix) so it fills the stage as an absolute ground behind everything. */
.nk-sb-stage .nk-sb-facet { position: absolute; inset: 0; z-index: 0; pointer-events: none; aspect-ratio: auto; min-height: 0; }

/* ── The SIDEBAR: the persistent nav chrome. Lifts off the content with a
      sideways shadow + an inner edge catch-light + a trailing hairline. ── */
.nk-sb { position: relative; z-index: 1; flex: 0 0 auto; display: flex; flex-direction: column; min-height: 0; background: var(--color-surface-translucency-sidebar); border-right: var(--space-px) solid var(--color-chrome-hairline); transition: width .24s cubic-bezier(.2,0,0,1); overflow: hidden;
  box-shadow: var(--elevation-level2) 0 18px -10px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent), inset calc(-1 * var(--space-px)) 0 0 var(--color-surface-highlight); }
/* task 2667, the OPAQUE two-state option (§5 deterministic, never a slider): solid
   chrome, no see-through; translucent (the token) stays the default above. */
.nk-sb--solid { background: var(--color-chrome-surface); }
.nk-sb--expanded { width: 232px; }    /* echoes Voice's 216pt panel */
.nk-sb--rail { width: calc(var(--space-16) + var(--space-1)); }

/* brand: pinned to the top, like Voice's logo + wordmark. Holds the shared
   <NockerlLockup> (mark + EXTRALIGHT "Nockerl"); the lockup wordmark inherits this
   container's chrome ink via currentColor. */
.nk-sb__brand { display: flex; align-items: center; gap: var(--space-3); flex: 0 0 auto; padding: var(--space-4) var(--space-4) var(--space-3); min-height: var(--space-12); color: var(--color-on-chrome); }
.nk-sb--rail .nk-sb__brand { justify-content: center; padding-inline: var(--space-2); }
/* in the rail the lockup collapses to the mark alone, so hide its internal wordmark (like Voice) */
.nk-sb--rail .nk-sb__brand .nk-lock__wm { display: none; }

/* the scrolling nav body (sections live here); the footer is pinned below it */
.nk-sb__scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: var(--space-1) var(--space-2) var(--space-2); }
.nk-sb__section + .nk-sb__section { margin-top: var(--space-3); }
.nk-sb__seclabel { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-chrome-muted); font-weight: var(--font-weight-semibold); padding: var(--space-2) var(--space-2) var(--space-1); white-space: nowrap; }
/* in the rail, the label collapses to a centered hairline divider (keeps grouping) */
.nk-sb--rail .nk-sb__seclabel { font-size: 0; padding: var(--space-2) var(--space-3) var(--space-1); }
.nk-sb--rail .nk-sb__seclabel::after { content: ""; display: block; height: var(--space-px); background: var(--color-chrome-hairline); }

/* The nav ROWS + nested SUB-ROWS are the NockerlNavItem primitive (.nk-nav*): the row grammar
   (icon/label/count/status-dot/chevron, the section-6 active wash + tint + border, the
   rail collapse + tooltip) lives there now, not here. This shell only keeps the CONTAINER
   chrome + the sub-list guide rail below. */

/* ── Nested SUB-ITEMS, the <ul> the shell owns: indent + the guide rail down the group
      (the sub-ROWS themselves are NockerlNavItem in sub mode). ── */
.nk-sb__sub { list-style: none; margin: var(--space-0-5) 0 0; padding: 0 0 0 calc(var(--space-3) + 20px); position: relative; }
.nk-sb__sub::before { content: ""; position: absolute; left: calc(var(--space-3) + 9px); top: var(--space-1); bottom: var(--space-2); width: var(--space-px); background: var(--color-chrome-hairline); }

/* ── FOOTER: pinned to the bottom (profile + settings), like Voice's cog ── */
.nk-sb__foot { flex: 0 0 auto; border-top: var(--space-px) solid var(--color-chrome-hairline); padding: var(--space-2); }
/* the footer is a static container; the Settings NockerlNavItem inside is the focusable target */
.nk-sb__profile { display: flex; align-items: center; gap: var(--space-3); width: 100%; min-height: var(--space-12); padding: var(--space-1) var(--space-2); }
.nk-sb--rail .nk-sb__profile { justify-content: center; padding: var(--space-1); gap: 0; }
/* the avatar is the ONE filled cyan element, so it uses --color-on-accent for its label */
.nk-sb__avatar { flex: 0 0 auto; width: var(--space-8); height: var(--space-8); border-radius: var(--radius-pill); display: inline-flex; align-items: center; justify-content: center; font-size: var(--font-size-12); font-weight: var(--font-weight-bold); color: var(--color-on-accent); background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary)); box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* in the rail the footer collapses to the single centered Settings cog (like Voice) */
.nk-sb--rail .nk-sb__avatar { display: none; }
.nk-sb__profmeta { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-sb--rail .nk-sb__profmeta { display: none; }
.nk-sb__profname { font-size: var(--font-size-12); font-weight: var(--font-weight-semibold); color: var(--color-on-chrome); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nk-sb__profrole { font-size: var(--font-size-10); color: var(--color-on-chrome-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── The CONTENT region beside the rail: proves the sidebar is in-layout ── */
.nk-sb__content { flex: 1 1 auto; min-width: 0; padding: var(--space-5); overflow: hidden; }
.nk-sb__crumb { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
/* NockerlSurface (card variant) supplies the fill, hairline, and 16px card radius. */
.nk-sb__card { position: relative; padding: var(--space-4); max-width: 320px; box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen); }
.nk-sb__card-kicker { font-size: var(--font-size-12); color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-sb__card-h { font-size: var(--font-size-16); font-weight: var(--font-weight-semibold); color: var(--color-on-card); margin: 0 0 var(--space-1); }
.nk-sb__card-p { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); margin: 0; }
.nk-sb__content-enter { animation: nk-sb-fade .22s cubic-bezier(.2,0,0,1); }
@keyframes nk-sb-fade { from { opacity: 0; transform: translateY(var(--space-1)); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .nk-sb, .nk-sb__profile { transition: none; }
  .nk-sb__content-enter { animation: none; }
}

.nk-sb-demo__hint { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-sb-demo__hint b { color: var(--color-accent-primary); }
`;

/**
 * The Nockerl sidebar is a persistent, in-layout nav column: brand at the top, grouped
 * sections of nav items (icon + label + optional count, an optional expandable item
 * with nested sub-items), and a profile/settings footer pinned to the bottom.
 * `collapsed` switches to the icon-only rail (labels/counts hide, items expose their
 * label via tooltip). Arrow keys rove focus across the visible rows; Enter/Space
 * activate; an item swaps the content beside it.
 */
export function Sidebar({
  sections = SECTIONS,
  collapsed,
  surface = 'translucent',
  selected,
  onSelect,
  expanded,
  onToggleExpand,
}: {
  sections?: NavSection[];
  collapsed: boolean;
  /** task 2667: the two ratified surface states (§5, deterministic, never a slider) are
   *  translucent (the sanctioned sidebar-translucency token; the facet shows through)
   *  or solid (opaque chrome). */
  surface?: 'solid' | 'translucent';
  selected: string;
  onSelect: (id: string) => void;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const navId = useId();
  // The flat list of currently-focusable rows, in DOM order, for roving arrow nav.
  const order = useMemo(() => {
    const ids: string[] = [];
    for (const s of sections) {
      for (const it of s.items) {
        ids.push(it.id);
        if (it.children && !collapsed && expanded.has(it.id)) {
          for (const c of it.children) ids.push(c.id);
        }
      }
    }
    ids.push('settings');
    return ids;
  }, [sections, collapsed, expanded]);

  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (e: KeyboardEvent) => {
    const cur = order.indexOf((document.activeElement as HTMLElement)?.dataset?.row ?? '');
    let to = -1;
    if (e.key === 'ArrowDown') to = (cur + 1) % order.length;
    else if (e.key === 'ArrowUp') to = (cur - 1 + order.length) % order.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = order.length - 1;
    if (to >= 0) {
      e.preventDefault();
      refs.current[order[to]!]?.focus();
    }
  };

  // One row index drives tabIndex: the selected (or first) row is the single tab stop.
  const tabStop = order.includes(selected) ? selected : order[0]!;
  const setRef = (id: string) => (el: HTMLButtonElement | null) => {
    refs.current[id] = el;
  };

  return (
    <nav
      className={`nk-sb nk-sb--${collapsed ? 'rail' : 'expanded'}${surface === 'solid' ? ' nk-sb--solid' : ''}`}
      id={navId}
      aria-label="Primary"
      onKeyDown={onKey}
    >
      <div className="nk-sb__brand">
        {/* The canonical brand lockup: the shared three-shade mark + the EXTRALIGHT (200)
            "Nockerl" wordmark + the cyan (400) product word "Voice", sentence case, tight
            tracking. This IS the pattern Nockerl Voice's own nav should use. Adopts the
            chrome ink via currentColor; in the rail the whole wordmark hides (mark-only). */}
        <NockerlLockup size={22} product="Voice" />
      </div>

      <div className="nk-sb__scroll">
        {sections.map((section) => (
          <div className="nk-sb__section" key={section.label}>
            <p className="nk-sb__seclabel" aria-hidden={collapsed || undefined}>
              {section.label}
            </p>
            {section.items.map((it) => {
              const on = it.id === selected || (it.children?.some((c) => c.id === selected) ?? false);
              const isExpandable = !!it.children && !collapsed;
              const isOpen = isExpandable && expanded.has(it.id);
              const subId = `${navId}-${it.id}-sub`;
              return (
                <div key={it.id}>
                  <NockerlNavItem
                    layout={collapsed ? 'rail' : 'row'}
                    icon={it.icon}
                    label={it.label}
                    active={on}
                    current={it.id === selected}
                    status={it.dot}
                    count={it.badge ? { value: it.badge.count, tone: it.badge.tone } : undefined}
                    expandable={isExpandable}
                    expanded={isOpen}
                    onToggle={() => onToggleExpand(it.id)}
                    onSelect={() => onSelect(it.id)}
                    tabIndex={it.id === tabStop ? 0 : -1}
                    data-row={it.id}
                    aria-controls={isExpandable ? subId : undefined}
                    ref={setRef(it.id)}
                  />

                  {isOpen && (
                    <ul className="nk-sb__sub" id={subId}>
                      {it.children!.map((c) => (
                        <li key={c.id}>
                          <NockerlNavItem
                            sub
                            label={c.label}
                            active={c.id === selected}
                            onSelect={() => onSelect(c.id)}
                            tabIndex={c.id === tabStop ? 0 : -1}
                            data-row={c.id}
                            ref={setRef(c.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="nk-sb__foot">
        <div className="nk-sb__profile">
          <span className="nk-sb__avatar" aria-hidden="true">PM</span>
          <span className="nk-sb__profmeta">
            <span className="nk-sb__profname">the design lead M.</span>
            <span className="nk-sb__profrole">dizyx workspace</span>
          </span>
          <NockerlNavItem
            layout="rail"
            icon={ISettings}
            label="Settings"
            active={selected === 'settings'}
            onSelect={() => onSelect('settings')}
            tabIndex={'settings' === tabStop ? 0 : -1}
            data-row="settings"
            ref={setRef('settings')}
          />
        </div>
      </div>
    </nav>
  );
}

// Sidebar is a LEAF nav shell: content is DATA (sections[] of SidebarNavItem), no component slot.
// It COMPOSES the NockerlNavItem primitive for every destination (each nav row, each nested sub-row, and
// the footer Settings cog), plus NockerlSurface (content card) + NockerlButton (demo collapse toggle). It owns
// only the container chrome (brand, sections, the sub-list guide rail, the footer): no <button> of
// its own; NockerlNavItem owns each row's button. No owns.
export const compose = {
  tier: 'leaf',
} satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Sidebar page: one faithful, persistent
 * sidebar sitting IN the layout beside a small content region (no overlay, no scrim).
 * A toggle collapses it to the icon-only rail and back (labels/counts hide, tooltips
 * appear). Tab in, arrow-key the rows, expand Tasks to reach its nested sub-items,
 * click anything: the active indicator moves and the content swaps.
 */
export default function SidebarDemo() {
  const [collapsed, setCollapsed] = useState(false);
  const [surface, setSurface] = useState<'solid' | 'translucent'>('translucent');
  const [selected, setSelected] = useState('chat');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['tasks']));

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const body = BODY[selected] ?? BODY.home!;

  return (
    <div className="nk-sb-demo">
      <style>{STYLES}</style>

      <div className="nk-sb-demo__bar" role="group" aria-label="Sidebar controls">
        <p className="nk-sb-demo__lbl">Sidebar</p>
        <NockerlButton
          variant="secondary"
          size="sm"
          pressed={collapsed}
          leadingIcon={IPanelLeft}
          text={collapsed ? 'Expand' : 'Collapse to rail'}
          onClick={() => setCollapsed((c) => !c)}
        />
        {/* task 2667: the opaque↔translucent TOGGLE, OUTSIDE the stage (the AppShell
            demo's Surface pattern): two deterministic states per §5, never a slider. */}
        <NockerlSegmentedControl
          label="Sidebar surface"
          size="sm"
          segments={[{ value: 'solid', label: 'Solid' }, { value: 'translucent', label: 'Translucent' }]}
          value={surface}
          onChange={(n) => setSurface(n as 'solid' | 'translucent')}
        />
      </div>

      <div className="nk-sb-stage">
        {/* the sanctioned facet ground: the sidebar floats over it translucently */}
        <NockerlFacetedBackground className="nk-sb-facet" aria-hidden="true" />
        <Sidebar
          collapsed={collapsed}
          surface={surface}
          selected={selected}
          onSelect={setSelected}
          expanded={expanded}
          onToggleExpand={toggleExpand}
        />
        <main className="nk-sb__content">
          <p className="nk-sb__crumb">dizyx · nockerl-design</p>
          {/* keyed on the selection so it re-mounts → the enter animation plays */}
          <NockerlSurface className="nk-sb__card nk-sb__content-enter" key={selected}>
            <p className="nk-sb__card-kicker">{body.kicker}</p>
            <h3 className="nk-sb__card-h">{body.head}</h3>
            <p className="nk-sb__card-p">{body.sub}</p>
          </NockerlSurface>
        </main>
      </div>

      <p className="nk-sb-demo__hint">
        {collapsed ? 'Rail' : 'Expanded'} · viewing <b>{body.head}</b>. Tab in, arrow-key the rows, expand <b>Tasks</b>,
        collapse to the rail. The sidebar stays in the layout. The island is live.
      </p>
    </div>
  );
}
