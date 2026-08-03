/**
 * AppShellDemo: the live, interactive Nockerl app-shell island for the web.
 *
 * The app shell is the top-level layout scaffold: a top bar, a nav region
 * (a sidebar OR an icon rail; bottom nav is retired, #2596c), and a content region,
 * all over one pinned, gently ANIMATED geometric facet field that shows behind the
 * content. It is the web synthesis of the two shipped shells:
 *   • Android (compact), in core/ui/MainScaffold.kt: a Box whose base layer is a
 *     PINNED ChatFeedBackground (a low-poly triangle mesh, slow diagonal
 *     tone-wave), a stacked top chrome (GlobalTopBar → project row → session row →
 *     a 1.5dp cyan boundary line) that casts ONE real soft shadow onto the
 *     transparent content below; the content sees the field through it.
 *   • Voice (desktop), in UI/DashboardView.swift: a ZStack with one full-window
 *     FacetBackground, a TRANSLUCENT floating sidebar (216pt: brand top, nav
 *     items; selected = cyan label + thin cyan border, with no fill) and a
 *     full-bleed detail pane over the same field.
 *
 * Design laws, verbatim:
 *   • depth = neutral drop shadow + a top catch-light (inset highlight); the top
 *     bar + sidebar lift off the facet ground. NO glow / colored shadow.
 *   • the facet field is the signature ANIMATED surface: it animates an
 *     interpolatable prop (per-triangle BRIGHTNESS via a drifting sine wave),
 *     never a fill swap, and freezes under prefers-reduced-motion.
 *   • a SELECTED destination reads via a cyan BORDER + a cyan icon + cyan label, with no
 *     fill (LAW 6). Never a left rail / stripe, never a glow, never a brand fill swap.
 *   • cyan is the only brand accent; status lives only on the signal dots.
 *   • controls use the 12px control radius; panels/cards use panel/card radius.
 *   • nav destinations are real <button>s (one tap target each) with a
 *     focus-visible cyan OUTLINE ring; arrow keys + Tab move between them.
 *
 * TOKEN-REACTIVE (docs/demo-token-contract.md): every color / font / radius /
 * spacing / type is a var(--token); the dark stage resolves them to the dark
 * palette. Literals remain only for pure geometry (mesh coords, icon sizes,
 * shadow blur, transition curves). The mesh constants (cell≈34 scaled, jitter
 * .34, amplitude .05, static jitter .022, ~18s period) match the native fields.
 */
import { useEffect, useId, useReducer, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import NockerlLockup from '../NockerlLockup';
import { NockerlAvatar, NockerlFacetedBackground, NockerlIcon, NockerlIconButton, NockerlNavItem, NockerlSegmentedControl, NockerlSurface, type ComposeContract } from '@dizyx/nockerl-react';

// #2596c (ratified): the compact / bottom-navigation mode is KILLED (bottom nav is dead per
// ). The shell has TWO nav layouts only: expanded sidebar or icon rail.
export type ShellLayout = 'expanded' | 'rail';
// The nav SURFACE is one of two ratified opacity options: solid (opaque chrome, matches
// the top bar) or translucent (the §5 sidebar-translucency carve-out, where the FacetedBackground
// whispers through for the Nockerl-voice look). Token/prop-driven; the demo toggles between them.
export type ShellNavSurface = 'solid' | 'translucent';

// #2596d: the ratified PLATFORM PRESETS (the design lead's product guidance): Android = a top bar
// (which owns the brand) + a compact nav rail; Voice = the left nav ONLY, no title bar; web =
// the mix (top bar + expanded nav). #2632a: web keeps the brand (icon + "Nockerl Dashboard") in
// the TOP BAR (the toolbar) + a hamburger to rail/expand the nav. #2596b: the brand appears
// exactly ONCE, never duplicated between the top bar and the left nav. Each preset carries
// a default nav SURFACE (Voice + web = translucent-facet-through; Android = solid).
export type ShellPreset = 'web' | 'android' | 'voice';
interface PresetConfig { label: string; topBar: boolean; brandInTopBar: boolean; defaultLayout: ShellLayout; defaultNavSurface: ShellNavSurface; }
const PRESETS: Record<ShellPreset, PresetConfig> = {
  web: { label: 'Web · mix', topBar: true, brandInTopBar: true, defaultLayout: 'expanded', defaultNavSurface: 'translucent' },
  android: { label: 'Android · top bar', topBar: true, brandInTopBar: true, defaultLayout: 'rail', defaultNavSurface: 'solid' },
  voice: { label: 'Voice · left nav', topBar: false, brandInTopBar: false, defaultLayout: 'expanded', defaultNavSurface: 'translucent' },
};

export interface ShellDestination {
  /** Stable id that drives selection + content swap. */
  id: string;
  /** Visible label (label.large role). Also the rail a11y name. */
  label: string;
  /** Inline stroke glyph for the nav slot. */
  icon: ReactNode;
  /** Optional status dot (status colors only, never cyan). */
  dot?: 'streaming' | 'attention' | 'idle';
}

// ─── Inline stroke glyphs (currentColor, each nav slot tints them) ────────────
// Each is the shared NockerlIcon shell with this demo's 1.8 stroke; CSS sizes the svg.
const IChat = <NockerlIcon path="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1 1 21 11.5Z" strokeWidth={1.8} />;
const ITasks = <NockerlIcon path="M9 6h11M9 12h11M9 18h11M4.5 6 5 6.5 6 5M4.5 12l.5.5L6 11M4.5 18l.5.5L6 17" strokeWidth={1.8} />;
const IFiles = <NockerlIcon path="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" strokeWidth={1.8} />;
const ICluster = <NockerlIcon path="M12 4v4m0 8v4m8-8h-4M8 12H4m12.2-5.2-2.8 2.8M8.6 13.4l-2.8 2.8m11.4 0-2.8-2.8M8.6 10.6 5.8 7.8" strokeWidth={1.8} />;
const IBell = <NockerlIcon path="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" strokeWidth={1.8} />;
const IMenu = <NockerlIcon path="M4 6h16M4 12h16M4 18h16" strokeWidth={1.8} />;   /* #2632c: hamburger (rail/expand the nav) */

const DESTINATIONS: ShellDestination[] = [
  { id: 'chat', label: 'Chat', icon: IChat, dot: 'streaming' },
  { id: 'tasks', label: 'Tasks', icon: ITasks, dot: 'attention' },
  { id: 'files', label: 'Files', icon: IFiles },
  { id: 'cluster', label: 'Cluster', icon: ICluster, dot: 'idle' },
];

// Per-destination copy so the content region visibly swaps on selection.
const BODY: Record<string, { kicker: string; head: string; sub: string }> = {
  chat: { kicker: 'Streaming · 2 tools running', head: 'nockerl-design · docs site', sub: 'Designing the app-shell scaffold to the token standard.' },
  tasks: { kicker: 'Needs attention · 1 approval', head: 'Reconcile control radius', sub: 'Promote the on-accent helpers to first-class tokens.' },
  files: { kicker: 'Working tree · 3 changed', head: 'AppShellDemo.tsx', sub: 'Self-contained, token-only, keyboard-operable.' },
  cluster: { kicker: 'Idle · 4 nodes online', head: 'Compute Cluster', sub: 'Tensor parallel across the local fabric.' },
};

// ─── The signature faceted field is the shipped NockerlFacetedBackground primitive: one
// canvas per-facet tone-wave, composed here in `bare` mode (full-bleed, no card chrome). No mesh is
// hand-rolled in this demo any more; the hand-roll-detection harness enforces that. The
// shell only needs the reduced-motion signal to hand to the primitive. ──
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

const STYLES = `
.nk-as { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
.nk-as__toolbar { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; margin: 0 0 var(--space-4); }

/* ── Shell frame: the darkest ground; the facet field is pinned at its base ── */
.nk-as__shell { position: relative; overflow: hidden; border-radius: var(--radius-card); border: var(--space-px) solid var(--color-card-hairline);
  background: var(--color-canvas); height: 360px;
  box-shadow: 0 var(--elevation-level3) 24px -10px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-as__facets { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.nk-as__grid { position: absolute; inset: 0; display: grid; grid-template-rows: auto 1fr; }

/* ── Top bar, lifted off the facet ground (catch-light + soft shadow) ── */
.nk-as__topbar { position: relative; z-index: 2; display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); min-height: var(--space-12);
  background: var(--color-chrome-surface); border-bottom: var(--space-px) solid var(--color-accent-primary);
  box-shadow: 0 var(--elevation-level2) 14px -8px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent); }
/* the brand LOCKUP: currentColor here → the wordmark reads on-chrome (the mark is theme-aware;
   the product word is the cyan accent). Placed once: the top bar (Android) OR the nav (web/Voice). */
.nk-as__brand { display: inline-flex; align-items: center; gap: var(--space-2); flex: 0 0 auto; color: var(--color-on-chrome); }
.nk-as__brand--nav { padding: var(--space-1) var(--space-2) var(--space-2); }
.nk-as--rail .nk-as__brand--nav { justify-content: center; padding-inline: 0; }
.nk-as--rail .nk-as__brand--nav .nk-lock__wm { display: none; }   /* rail → mark-only () */
.nk-as--notopbar .nk-as__grid { grid-template-rows: 1fr; }        /* Voice: no top bar row */
.nk-as__title { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-chrome); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nk-as__spacer { flex: 1 1 auto; min-width: var(--space-2); }
.nk-as__bell { position: relative; display: inline-flex; }
.nk-as__badge { position: absolute; top: var(--space-1); right: var(--space-1); min-width: var(--space-4); height: var(--space-4); padding: 0 var(--space-0-5); border-radius: var(--radius-pill);
  background: var(--color-dot-attention); color: var(--color-canvas); font-size: var(--font-size-10); font-weight: var(--font-weight-bold); display: inline-flex; align-items: center; justify-content: center; line-height: 1; }

/* ── Body: nav region + content region ── */
.nk-as__body { position: relative; display: flex; min-height: 0; }
.nk-as__nav { position: relative; z-index: 1; flex: 0 0 auto; display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-2);
  border-right: var(--space-px) solid var(--color-chrome-hairline);
  box-shadow: var(--elevation-level1) 0 16px -10px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent); transition: width .2s cubic-bezier(.2,0,0,1); overflow: hidden; }
/* The nav surface is ONE of two ratified opacity options (token/prop-driven): SOLID
   (opaque chrome, matches the top bar) OR TRANSLUCENT (the §5 sidebar-translucency carve-out
   where the FacetedBackground clearly whispers through, the Nockerl-voice look;  pushed the token
   more transparent). Solid-first stays the law; this is the sole sanctioned translucent surface. */
.nk-as--nav-solid .nk-as__nav { background: var(--color-chrome-surface); }
.nk-as--nav-translucent .nk-as__nav { background: var(--color-surface-translucency-sidebar); }
.nk-as--expanded .nk-as__nav { width: 208px; }
.nk-as--rail .nk-as__nav { width: calc(var(--space-12) + var(--space-2)); align-items: stretch; }
.nk-as__navlabel { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-chrome-muted); font-weight: var(--font-weight-semibold); margin: var(--space-1) var(--space-2); white-space: nowrap; }
.nk-as--rail .nk-as__navlabel { display: none; }
.nk-as__navspacer { flex: 1 1 auto; }

/* ── Content region: transparent so the facet field shows through (like chat) ── */
.nk-as__content { position: relative; flex: 1 1 auto; min-width: 0; padding: var(--space-4); overflow: hidden; }
.nk-as__crumb { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
/* NockerlSurface (card variant) supplies the fill, hairline, and 16px card radius. */
.nk-as__card { position: relative; padding: var(--space-4); max-width: 320px;
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen); }
.nk-as__card-kicker { font-size: var(--font-size-12); color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-as__card-h { font-size: var(--font-size-16); font-weight: var(--font-weight-semibold); color: var(--color-on-card); margin: 0 0 var(--space-1); }
.nk-as__card-p { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); margin: 0; }
.nk-as__content-enter { animation: nk-as-fade .22s cubic-bezier(.2,0,0,1); }
@keyframes nk-as-fade { from { opacity: 0; transform: translateY(var(--space-1)); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .nk-as__nav { transition: none; }
  .nk-as__content-enter { animation: none; }
}
.nk-as__hint { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-as__hint b { color: var(--color-accent-primary); }
`;

// The brand is the shared <NockerlLockup> (mark + thin "Nockerl" + cyan product word), built
// inline in the render and placed exactly ONCE per surface (#2596b): the nav for web/Voice, the
// top bar for Android. In the rail its wordmark hides (mark-only). Product word is parametric.

/**
 * The Nockerl app shell: a top bar, a nav region, and a content region over a
 * pinned animated facet field. `layout` switches the nav presentation:
 * expanded (full sidebar) · rail (icon-only). `preset` sets the platform config (web ·
 * Android · Voice), which decides whether a top bar is present and which surface owns the brand.
 * Activating a destination swaps the content region.
 */
export function AppShell({
  layout,
  preset,
  navSurface,
  selected,
  onSelect,
  onToggleLayout,
  destinations = DESTINATIONS,
}: {
  layout: ShellLayout;
  preset: ShellPreset;
  navSurface: ShellNavSurface;
  selected: string;
  onSelect: (id: string) => void;
  /** Optional. Renders a hamburger in the web top bar that rails/expands the nav (#2632c). */
  onToggleLayout?: () => void;
  destinations?: ShellDestination[];
}) {
  const navId = useId();
  // Roving keyboard nav: arrow keys move focus across the destinations.
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, idx: number) => {
    const next = ['ArrowDown', 'ArrowRight'];
    const prev = ['ArrowUp', 'ArrowLeft'];
    let to = -1;
    if (next.includes(e.key)) to = (idx + 1) % destinations.length;
    else if (prev.includes(e.key)) to = (idx - 1 + destinations.length) % destinations.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = destinations.length - 1;
    if (to >= 0) {
      e.preventDefault();
      refs.current[to]?.focus();
    }
  };

  const navItems = destinations.map((d, i) => (
    <NockerlNavItem
      key={d.id}
      ref={(el) => {
        refs.current[i] = el;
      }}
      layout={layout === 'rail' ? 'rail' : 'row'}
      icon={d.icon}
      label={d.label}
      active={d.id === selected}
      status={d.dot}
      tabIndex={d.id === selected ? 0 : -1}
      onSelect={() => onSelect(d.id)}
      onKeyDown={(e) => onKey(e, i)}
    />
  ));

  const active = destinations.find((d) => d.id === selected) ?? destinations[0]!;
  const body = BODY[active.id] ?? BODY.chat!;

  const cfg = PRESETS[preset];
  const reduced = usePrefersReducedMotion();
  // The brand lockup, whose product word is parametric (Voice vs the Dashboard app).
  const brand = <NockerlLockup size={18} product={preset === 'voice' ? 'Voice' : 'Dashboard'} className="nk-as__lockup" />;

  return (
    <div className={`nk-as__shell nk-as--${layout} nk-as--${preset} nk-as--nav-${navSurface}${cfg.topBar ? '' : ' nk-as--notopbar'}`}>
      {/* the ONE canonical faceted field: composes the shipped NockerlFacetedBackground primitive
          (bare = full-bleed, no card chrome), the SAME field as the standalone page, the sidebar,
          and empty-state. : no hand-rolled mesh here, just one implementation composed everywhere. */}
      <NockerlFacetedBackground bare reduced={reduced} className="nk-as__facets" aria-hidden="true" />
      <div className="nk-as__grid">
        {cfg.topBar && (
          <header className="nk-as__topbar">
            {/* #2632c: web gets a hamburger furthest-left (next to the brand) to rail/expand the
                nav. Scoped to web so Android's near-perfect top bar is untouched. */}
            {onToggleLayout && preset === 'web' && (
              <NockerlIconButton
                icon={IMenu}
                label={layout === 'expanded' ? 'Collapse navigation' : 'Expand navigation'}
                onClick={onToggleLayout}
              />
            )}
            {/* the brand sits in the top bar for Android + web (#2632a: web keeps icon + "Nockerl
                Dashboard" in the toolbar); Voice has no top bar and lets the left nav own the brand. */}
            {cfg.brandInTopBar
              ? <span className="nk-as__brand">{brand}</span>
              : <span className="nk-as__title">{active.label}</span>}
            <span className="nk-as__spacer" />
            <NockerlIconButton icon={ICluster} label="Cluster" />
            <span className="nk-as__bell">
              <NockerlIconButton icon={IBell} label="Notifications, 3 unread" />
              <span className="nk-as__badge" aria-hidden="true">3</span>
            </span>
            <NockerlAvatar name="Ada Lovelace" size="md" onClick={() => {}} />
          </header>
        )}

        <div className="nk-as__body">
          <nav className="nk-as__nav" id={navId} aria-label="Primary">
            {/* the left nav owns the brand for web + Voice; on Android it's brand-free (no duplication). */}
            {!cfg.brandInTopBar && <span className="nk-as__brand nk-as__brand--nav">{brand}</span>}
            <p className="nk-as__navlabel">Workspace</p>
            {navItems}
            <span className="nk-as__navspacer" />
          </nav>
          <main className="nk-as__content">
            <p className="nk-as__crumb">dizyx · nockerl-design</p>
            {/* keyed on the selection so it re-mounts → the enter animation plays */}
            <NockerlSurface className="nk-as__card nk-as__content-enter" key={active.id}>
              <p className="nk-as__card-kicker">{body.kicker}</p>
              <h3 className="nk-as__card-h">{body.head}</h3>
              <p className="nk-as__card-p">{body.sub}</p>
            </NockerlSurface>
          </main>
        </div>
      </div>
    </div>
  );
}

const LAYOUTS: { id: ShellLayout; label: string }[] = [
  { id: 'expanded', label: 'Expanded' },
  { id: 'rail', label: 'Rail' },
];

// AppShell is a LEAF shell: nav is DATA (destinations[]) and the content region is internal (no
// component slot). It composes NockerlSurface/NockerlLockup/NockerlIcon (+ NockerlSegmentedControl in the demo). Every nav
// destination is a NockerlNavItem (row / rail: expanded sidebar or icon rail, one per destination),
// and the top-bar menu/cluster/notifications controls are IconButtons with the account avatar as an
// NockerlAvatar. No hand-rolled nav or top-bar <button>s remain. It owns no raw elements of its own.
export const compose = {
  tier: 'leaf',
} satisfies ComposeContract;

/**
 * The interactive showcase mounted on the App shell page: one miniature but
 * faithful shell with a top bar (title + actions), a nav region, and a content region
 * over the pinned animated facet field, plus segmented controls for the platform
 * preset (web / Android / Voice) and the two nav layouts (expanded sidebar / rail).
 * Tab / arrow-key the destinations; selecting one swaps the content.
 */
export default function AppShellDemo() {
  const [preset, setPreset] = useState<ShellPreset>('web');
  const [layout, setLayout] = useState<ShellLayout>('expanded');
  const [navSurface, setNavSurface] = useState<ShellNavSurface>('translucent');
  const [selected, dispatch] = useReducer((_: string, id: string) => id, 'chat');

  // Switching preset snaps the nav to that platform's canonical defaults (Android → rail + solid,
  // Voice/web → translucent so the facet reads through).
  const pickPreset = (p: ShellPreset) => { setPreset(p); setLayout(PRESETS[p].defaultLayout); setNavSurface(PRESETS[p].defaultNavSurface); };

  return (
    <div className="nk-as">
      <style>{STYLES}</style>

      <div className="nk-as__toolbar" role="group" aria-label="Shell configuration">
        <span className="nk-as__navlabel" style={{ margin: 0 }}>Platform</span>
        <NockerlSegmentedControl
          segments={(Object.keys(PRESETS) as ShellPreset[]).map((p) => ({ value: p, label: PRESETS[p].label }))}
          value={preset}
          onChange={(n) => pickPreset(n as ShellPreset)}
          label="Platform preset"
          size="sm"
        />
        <span className="nk-as__navlabel" style={{ margin: 0 }}>Nav</span>
        <NockerlSegmentedControl
          segments={LAYOUTS.map((l) => ({ value: l.id, label: l.label }))}
          value={layout}
          onChange={(n) => setLayout(n as ShellLayout)}
          label="Nav layout"
          size="sm"
        />
        <span className="nk-as__navlabel" style={{ margin: 0 }}>Surface</span>
        <NockerlSegmentedControl
          segments={[{ value: 'solid', label: 'Solid' }, { value: 'translucent', label: 'Translucent' }]}
          value={navSurface}
          onChange={(n) => setNavSurface(n as ShellNavSurface)}
          label="Nav surface"
          size="sm"
        />
      </div>

      <AppShell
        layout={layout}
        preset={preset}
        navSurface={navSurface}
        selected={selected}
        onSelect={dispatch}
        onToggleLayout={() => setLayout((l) => (l === 'expanded' ? 'rail' : 'expanded'))}
      />

      <p className="nk-as__hint">
        <b>{PRESETS[preset].label}</b> · nav <b>{LAYOUTS.find((l) => l.id === layout)!.label}</b> · viewing{' '}
        <b>{DESTINATIONS.find((d) => d.id === selected)!.label}</b>. The brand sits ONCE (the nav for web/Voice, the top bar for Android), never duplicated; bottom-nav is retired. Tab in, arrow-key the destinations, the facet drifts behind. Live.
      </p>
    </div>
  );
}
