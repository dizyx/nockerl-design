/**
 * TopBarDemo: the live, interactive Nockerl TOP BAR island for the web.
 *
 * The top bar is the global app HEADER chrome, the identity / wayfinding / account
 * row pinned to the top of the app, closed by the signature 1.5px cyan boundary
 * line. NOT the whole shell (that's app-shell) and NOT a generic action strip
 * (that's toolbar): the persistent banner carrying the brand, the page title /
 * breadcrumb, and the trailing account cluster (search · inbox+badge · cluster
 * status · avatar).
 *
 * Sourced from the SHIPPED apps, verbatim:
 *   • Android (canonical), core/ui/GlobalTopBar.kt: a Box (the logo stays centered
 *     to the SCREEN regardless of the side controls) on the canvas, padded h12 / v8.
 *     Avatar (a 32dp circular image in a 40dp target) at the START, the three-peaks
 *     mark (28dp) dead CENTER, the cluster Hub (24dp) + a notification bell (24dp, a
 *     BadgedBox: unread count → "99+" → an 8dp unseen dot in the orange agent accent)
 *     at the END. Then a divider hairline, the project row, and TopChromeBoundary:
 *     a full-width straight 1.5dp cyan line (accentPrimary) + a grab handle that
 *     collapses / expands the header chrome.
 *   • Voice (Swift): a menu-bar app, NO title bar → no TopBar; its analogue is the
 *     floating command pill, which lives on the Recording HUD page, not here.
 *
 * Laws, verbatim: depth = a neutral shadow + top catch-light (the bar LIFTS; NO glow,
 * because the cyan line is a 1.5px SHAPE); the boundary is exactly var(--color-accent-
 * primary) and any cyan fill rides var(--color-on-accent); the inbox badge reuses the
 * badge tokens, the avatar + status dot their own, and cyan stays reserved for the mark
 * + boundary + selection; motion animates interpolatable props only (a height
 * scroll-condense + a width/opacity search-expand, both FROZEN under reduced motion);
 * every action is a real <button> (one name) with a focus-visible cyan OUTLINE ring,
 * the bar is a <header> banner, the badge count is announced via the host aria-label.
 *
 * TOKEN-REACTIVE (docs/demo-token-contract.md): every color / font / radius / spacing
 * / type is a var(--token); the dark stage resolves them + provides --color-on-accent.
 * Literals remain ONLY for the brand SVG geometry (the canonical three-peaks coords)
 * and pure motion/icon geometry (curves, icon px, dot diameters, the 1.5dp line).
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import NockerlLogo from '../NockerlLogo';
import NockerlLockup from '../NockerlLockup';
import { NockerlAvatar, NockerlBadge, NockerlButton, NockerlIcon, NockerlIconButton, NockerlLink, NockerlStatusDot, type ComposeContract, type Presence } from '@dizyx/nockerl-react';

import { SearchField } from './SearchFieldDemo';

// ─── Inline stroke glyphs (currentColor, so each slot tints them) ──────────────
// Rendered via the shared NockerlIcon primitive (the canonical 0 0 24 24 stroke shell), at
// the top bar's 1.8 stroke weight; CSS (the per-slot `svg` rules) sizes them.
const I = (p: string) => <NockerlIcon path={p} strokeWidth={1.8} />;
const ISearch = I('M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.3-4.3');
const ICluster = I('M12 4v4m0 8v4m8-8h-4M8 12H4m12.2-5.2-2.8 2.8M8.6 13.4l-2.8 2.8m11.4 0-2.8-2.8M8.6 10.6 5.8 7.8');
const IBack = I('m15 6-6 6 6 6');
const IChevR = I('m9 6 6 6-6 6');
const IClose = I('M6 6 18 18M18 6 6 18');
const IBell = (
  <NockerlIcon strokeWidth={1.8}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </NockerlIcon>
);

// The REAL Nockerl brand mark: the shared, canonical three-peaks component. It is
// MONOCHROME and theme-adaptive: rendered with the default `currentColor`, so the
// `.nk-tb__logo` wrapper's `color: var(--color-on-chrome)` makes it light-ink on a
// dark chrome surface and dark-ink on a light one, never cyan. `decorative` matches
// the old aria-hidden glyph (the <header> banner already names the app).
const NkLogo = <NockerlLogo size={22} className="nk-tb__logo" decorative />;

const STYLES = `
.nk-tb-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }

/* ── A contained STAGE: the top bar lifts off a mock content region ──────────── */
.nk-tb-stage {
  position: relative; border-radius: var(--radius-card); overflow: hidden;
  border: var(--space-px) solid var(--color-card-hairline); background: var(--color-canvas);
  box-shadow: 0 var(--elevation-level2) 18px -10px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight);
}

/* ── The TOP BAR: the global header chrome. Lifts off the content (catch-light +
   soft shadow). The cyan boundary line is its bottom edge, full-width + flush. ── */
.nk-tb {
  position: relative; z-index: 2; display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  min-height: var(--space-12);            /* 48: the title-bar height (clears 48dp) */
  background: var(--color-chrome-surface);
  border-bottom: 1.5px solid var(--color-accent-primary);   /* the signature cyan boundary line: a SHAPE, not a halo */
  box-shadow: 0 var(--elevation-level2) 14px -8px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent);
  transition: min-height .22s cubic-bezier(.2,0,0,1), padding .22s cubic-bezier(.2,0,0,1);
}
/* condensed (scrolled): the bar shrinks its height; interpolatable, freezes below */
.nk-tb--condensed { min-height: var(--space-10); padding-top: var(--space-1); padding-bottom: var(--space-1); }

/* ── Brand lockup (mark + thin Nockerl + cyan product word): the START identity. The primary +
   condensed headers compose the REAL <NockerlLockup> (law §11 grammar, correct mark seating);
   the mark-only variants (centered-title, breadcrumb) carry just the shared mark.
   currentColor here → the lockup wordmark reads on-chrome (mark is theme-aware; product = cyan). ── */
.nk-tb__brand { display: inline-flex; align-items: center; gap: var(--space-2); flex: 0 0 auto; min-width: 0; color: var(--color-on-chrome); }
/* the shared NockerlLogo inherits this color (currentColor) → light ink on dark chrome, dark ink on light. The size prop sets its dimensions. */
.nk-tb__logo { color: var(--color-on-chrome); display: block; flex: 0 0 auto; }

/* ── Title slot: left-aligned default, or centered (the Android idiom) ── */
.nk-tb__title { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-chrome); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.nk-tb__title--lead { flex: 1 1 auto; }
/* centered: absolutely centered to the BAR so side clusters don't shift it (Box idiom) */
.nk-tb__title--center { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); max-width: 50%; text-align: center; }

/* ── Breadcrumb slot: a horizontal trail of NockerlLink crumbs + chevron separators, closed
   by the top bar's own single cyan boundary. Crumbs compose the NockerlLink primitive (muted). ── */
.nk-tb__crumbs { display: inline-flex; align-items: center; gap: var(--space-1); flex: 1 1 auto; min-width: 0; overflow: hidden; }
.nk-tb__crumb-sep { color: var(--color-on-chrome-muted); display: inline-flex; flex: 0 0 auto; opacity: .6; }
.nk-tb__crumb-sep svg { width: 14px; height: 14px; }
.nk-tb__crumb--here { font-size: var(--font-size-12); font-weight: var(--font-weight-semibold); color: var(--color-on-chrome); white-space: nowrap; flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }

.nk-tb__spacer { flex: 1 1 auto; min-width: var(--space-2); }

/* the bell adopts the BORDERED badge-host treatment from the badge page: card fill +
   hairline on the icon button, pulling the anchored count/dot IN so it reads attached (the
   borderless bell left the dot floating at rest). The badge/dot itself is the REAL NockerlBadge
   primitive (anchored grammar: corner overlap + punch-out ring, ring = the chrome surface). */
.nk-tb__bell { flex: 0 0 auto; }
.nk-ico--plain.nk-tb__bell-host { background: var(--color-card-surface1); border-color: var(--color-card-hairline); }
.nk-ico--plain.nk-tb__bell-host:hover:not(:disabled) { background: var(--color-card-surface2); }
/* the toolbar has little vertical room, so seat the anchored count/dot DEEPER on the bell
   corner than the default -40% poke. It keeps HEADROOM and is never clipped by the bar top, in
   regular AND condensed. The topbar badge is static (no entrance pop), so this rest transform holds. */
.nk-tb__bell .nk-badge-anchor__badge { transform: translate(28%, -14%); animation: none; }

/* ── Cluster status: the Hub action. Composes <NockerlButton> (the labelled control) with a
   live <NockerlStatusDot> riding a small relative wrapper so the dot survives alongside the
   button. The control chrome (fill ladder, radius, focus ring, press feedback) is the
   NockerlButton primitive's; this rule only positions the node + its status dot. ── */
.nk-tb__cluster { position: relative; display: inline-flex; align-items: center; gap: var(--space-1); flex: 0 0 auto; }
.nk-tb__cluster .nk-btn__icon svg { width: 16px; height: 16px; }   /* size the leading Hub glyph */

/* ── Inline search field: the expand/collapse WRAPPER around a composed <SearchField>.
   The recessed well, the leading magnifier + the input all come from SearchField now;
   this rule owns ONLY the in-place width/opacity reveal (interpolatable props, frozen
   under reduced motion). The nested NockerlWell fills the wrapper's width. ── */
.nk-tb__search {
  display: inline-flex; align-items: center; min-width: 0; overflow: hidden;
  width: 0; opacity: 0; pointer-events: none;
  transition: width .24s cubic-bezier(.2,0,0,1), opacity .18s;
}
.nk-tb__search--open { width: 220px; opacity: 1; pointer-events: auto; }
.nk-tb__search .nk-search { width: 100%; min-width: 0; }
/* the composed field sits on the chrome, sized down to the bar's compact slot */
.nk-tb__search .nk-well.nk-search__well { min-height: var(--space-8); }

/* ── CONTEXTUAL / selection top bar: replaces the chrome with a cyan-tinted bar ── */
.nk-tb--select { background: color-mix(in srgb, var(--color-accent-primary) 14%, var(--color-chrome-surface)); }
.nk-tb__sel-count { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-chrome); white-space: nowrap; }
.nk-tb__sel-actions { display: inline-flex; align-items: center; gap: var(--space-1); }

/* ── Mock content region under the bar (so the boundary reads as the divide) ──── */
.nk-tb__content { position: relative; z-index: 1; padding: var(--space-4); display: grid; gap: var(--space-2); }
.nk-tb__skel { height: var(--space-3); border-radius: var(--radius-pill); background: color-mix(in srgb, var(--color-on-canvas) 8%, transparent); }
.nk-tb__skel--lg { height: var(--space-4); width: 55%; }
.nk-tb__skel--w1 { width: 86%; } .nk-tb__skel--w2 { width: 72%; } .nk-tb__skel--w3 { width: 64%; }
.nk-tb__scrollnote { font-size: var(--font-size-10); color: var(--color-on-canvas-muted); margin: 0 0 var(--space-2); }

/* Voice (Swift) has NO title bar → no TopBar; its analogue is the floating command pill,
   which lives in full on the Recording HUD page (moved there, not duplicated here). */

/* ── showcase scaffolding ── */
.nk-tb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-tb-demo__sec + .nk-tb-demo__sec { margin-top: var(--space-6); }
.nk-tb-demo__grid { display: grid; gap: var(--space-5); }
/* the demo scaffolding controls are now real <NockerlButton>s; this row only lays them out */
.nk-tb-demo__ctrls { display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center; margin: 0 0 var(--space-3); }
.nk-tb-demo__hint { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-tb-demo__hint b { color: var(--color-accent-primary); }

@media (prefers-reduced-motion: reduce) {
  /* the composed primitives (NockerlButton / SearchField / Breadcrumbs) freeze their own
     motion; here we only freeze the bar's height-condense + the search width reveal. */
  .nk-tb, .nk-tb__search { transition: none; }
}
`;

// A tiny inline portrait so the avatar image path renders without a network call.
// Geometry/data only, no design tokens involved.
const FACE = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#0cc0df'/><stop offset='1' stop-color='#0a7e95'/></linearGradient></defs><rect width='64' height='64' fill='url(%23g)'/><circle cx='32' cy='26' r='12' fill='%23ffffffcc'/><rect x='12' y='42' width='40' height='28' rx='14' fill='%23ffffffcc'/></svg>")}`;

/** The inbox bell, in the bordered badge-HOST treatment from the badge page: a real
 *  NockerlIconButton carrying the host chrome (card fill + hairline), with the REAL
 *  NockerlBadge primitive anchored on its corner (count → "99+" → an unseen dot). The
 *  seating (corner overlap + punch-out ring) is the badge primitive's own anchored
 *  grammar, so the hand-rolled .nk-tb__badge is gone; the agent-orange hue is preserved
 *  via the color override (canonical Android GlobalTopBar attention accent). */
function Inbox({ count, unseen, onClick }: { count: number; unseen: boolean; onClick?: () => void }) {
  const label = count > 0 ? `Inbox, ${count > 99 ? '99+' : count} unread` : unseen ? 'Inbox, unseen activity' : 'Inbox';
  return (
    <span
      className="nk-badge-anchor nk-tb__bell"
      style={{ ['--nk-anchor-ring' as string]: 'var(--color-chrome-surface)' } as React.CSSProperties}
    >
      <NockerlIconButton icon={IBell} label={label} onClick={onClick} size={32} className="nk-tb__bell-host" />
      {count > 0 ? (
        <NockerlBadge count={count} max={99} color="var(--color-dot-attention)" anchored />
      ) : unseen ? (
        <NockerlBadge dot color="var(--color-dot-attention)" anchored />
      ) : null}
    </span>
  );
}

/** The cluster status pill: the Hub action, now the real NockerlButton primitive carrying the
 *  count, with a live NockerlStatusDot riding alongside (a small relative wrapper) so the
 *  status indicator survives the migration. The button owns the a11y name. */
function Cluster({ online, onClick }: { online: number; onClick?: () => void }) {
  return (
    <span className="nk-tb__cluster">
      <NockerlButton
        variant="secondary"
        size="sm"
        leadingIcon={ICluster}
        text={`${online}/4`}
        ariaLabel={`Cluster, ${online} of 4 nodes online`}
        onClick={onClick}
      />
      <NockerlStatusDot status="success" size="sm" pulse surface="var(--color-chrome-surface)" />
    </span>
  );
}

/** The trailing account cluster shared by most variants. `search` toggles the inline field. */
function Actions({
  count, unseen, presence, searchOpen, onToggleSearch, searchValue, onSearchChange,
}: {
  count: number; unseen: boolean; presence: Presence; searchOpen: boolean; onToggleSearch: () => void;
  searchValue: string; onSearchChange: (v: string) => void;
}) {
  return (
    <>
      {/* the expand/collapse wrapper survives; the raw <input> is now a composed SearchField.
          `inert` when collapsed drops the whole field (input + clear) from tab order + the
          a11y tree. It is the composed replacement for the old input's tabIndex=-1, and it
          also covers SearchField's inner controls the wrapper can't reach individually. */}
      <div className={`nk-tb__search${searchOpen ? ' nk-tb__search--open' : ''}`} inert={!searchOpen}>
        <SearchField
          label="Search"
          size="sm"
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search sessions, files, tasks…"
        />
      </div>
      <NockerlIconButton icon={searchOpen ? IClose : ISearch} label={searchOpen ? 'Close search' : 'Search'} onClick={onToggleSearch} />
      <Cluster online={3} />
      <Inbox count={count} unseen={unseen} />
      <NockerlAvatar src={FACE} name="Ada Lovelace" size="md" presence={presence} onClick={() => {}} />
    </>
  );
}

/** A contained stage: a faithful top bar (closed by the cyan boundary line) above a
 *  mock content region, proving the boundary reads as the divide. */
function Stage({ bar, lines = 4 }: { bar: ReactNode; lines?: number }) {
  const widths = ['nk-tb__skel--w1', 'nk-tb__skel--w2', 'nk-tb__skel--w3', 'nk-tb__skel--w2'];
  return (
    <div className="nk-tb-stage">
      {bar}
      <div className="nk-tb__content" aria-hidden="true">
        <div className="nk-tb__skel nk-tb__skel--lg" />
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`nk-tb__skel ${widths[i % widths.length]}`} />
        ))}
      </div>
    </div>
  );
}

// TopBar is a LEAF header-chrome shell: brand / title / trailing cluster are placed internally (no
// children slot in its API). It composes the real primitives for every action: NockerlIconButton + NockerlAvatar
// (trailing), NockerlButton + NockerlStatusDot (the cluster pill), SearchField (the inline search), Breadcrumbs
// (the crumb trail), and NockerlButton (the demo scaffolding controls). It hand-rolls NO facsimile controls
// (no raw <button>/<input>/<a href>); the only raw markup is connective div/span/header + the badge.
// No owns (it owns none of those primitives' tags; it composes them).
export const compose = {
  tier: 'leaf',
} satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Top bar page: a primary app header
 * (brand + product, trailing search · cluster-status · inbox+badge · avatar) you
 * can drive live, then the variants: a centered page title (the Android idiom), a
 * leading back button + title for a sub-screen, a breadcrumb slot, a
 * compact/condensed scrolled state, a contextual "N selected" selection bar, and a
 * search-expanded state. Each one is closed by the signature cyan boundary line. All
 * token-driven on the dark stage. (Voice's no-title-bar command pill lives on Recording HUD.)
 */
export default function TopBarDemo() {
  const [count, setCount] = useState(3);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [condensed, setCondensed] = useState(false);
  const [selected, setSelected] = useState(3);
  const clamp = (n: number) => Math.max(0, Math.min(150, n));

  // Focus the search input when the inline field expands (keyboard-first).
  useEffect(() => {
    if (!searchOpen) return;
    const el = document.querySelector<HTMLInputElement>('.nk-tb__search--open input');
    el?.focus();
  }, [searchOpen]);

  return (
    <div className="nk-tb-demo">
      <style>{STYLES}</style>

      {/* ── LIVE: the primary app header you drive ─────────────────────────── */}
      <section className="nk-tb-demo__sec">
        <p className="nk-tb-demo__lbl">Primary app header: drive it live (toggle search, push the inbox count, condense the bar)</p>
        <div className="nk-tb-demo__ctrls" role="group" aria-label="Top bar controls">
          <NockerlButton variant="secondary" size="sm" text={searchOpen ? 'Collapse search' : 'Expand search'} onClick={() => setSearchOpen((v) => !v)} />
          <NockerlButton variant="secondary" size="sm" text="Inbox +1" onClick={() => setCount((c) => clamp(c + 1))} />
          <NockerlButton variant="secondary" size="sm" text="+25" onClick={() => setCount((c) => clamp(c + 25))} />
          <NockerlButton variant="secondary" size="sm" text="Mark read" onClick={() => setCount(0)} />
          <NockerlButton variant="secondary" size="sm" text={condensed ? 'Expand bar' : 'Condense bar'} onClick={() => setCondensed((v) => !v)} />
        </div>
        <Stage
          lines={5}
          bar={
            <header className={`nk-tb${condensed ? ' nk-tb--condensed' : ''}`} aria-label="Application">
              <span className="nk-tb__brand"><NockerlLockup size={22} product="Dashboard" /></span>
              <span className="nk-tb__spacer" />
              <Actions count={count} unseen presence="streaming" searchOpen={searchOpen} onToggleSearch={() => setSearchOpen((v) => !v)} searchValue={searchValue} onSearchChange={setSearchValue} />
            </header>
          }
        />
        <p className="nk-tb-demo__hint">
          Inbox shows <b>{count === 0 ? 'an unseen dot' : count > 99 ? '99+' : `${count} unread`}</b>
          {' '}· search is <b>{searchOpen ? 'expanded' : 'collapsed'}</b> · bar is <b>{condensed ? 'condensed' : 'full'}</b>. Tab through every action; the cyan boundary line closes the bar. The island is live.
        </p>
      </section>

      {/* ── Variants ───────────────────────────────────────────────────────── */}
      <section className="nk-tb-demo__sec">
        <p className="nk-tb-demo__lbl">Variants</p>
        <div className="nk-tb-demo__grid">

          {/* Centered page title: the Android GlobalTopBar idiom (Box-centered) */}
          <Stage
            lines={3}
            bar={
              <header className="nk-tb" aria-label="Chat">
                <span className="nk-tb__brand">{NkLogo}</span>
                <span className="nk-tb__spacer" />
                <span className="nk-tb__title nk-tb__title--center">Chat</span>
                <Cluster online={4} />
                <Inbox count={12} unseen={false} />
                <NockerlAvatar src={FACE} name="Ada Lovelace" size="md" presence="active" onClick={() => {}} />
              </header>
            }
          />

          {/* Leading back button + title: a sub-screen header */}
          <Stage
            lines={3}
            bar={
              <header className="nk-tb" aria-label="Session settings">
                <NockerlIconButton icon={IBack} label="Back" />
                <span className="nk-tb__title nk-tb__title--lead">Session settings</span>
                <NockerlIconButton icon={ISearch} label="Search" />
                <NockerlAvatar src={FACE} name="Ada Lovelace" size="md" presence="idle" onClick={() => {}} />
              </header>
            }
          />

          {/* Breadcrumb slot: wayfinding in the header */}
          <Stage
            lines={3}
            bar={
              <header className="nk-tb" aria-label="File">
                <span className="nk-tb__brand">{NkLogo}</span>
                <nav className="nk-tb__crumbs" aria-label="Breadcrumb">
                  <NockerlLink variant="muted" href="#">dizyx</NockerlLink>
                  <span className="nk-tb__crumb-sep" aria-hidden="true">{IChevR}</span>
                  <NockerlLink variant="muted" href="#">nockerl-design</NockerlLink>
                  <span className="nk-tb__crumb-sep" aria-hidden="true">{IChevR}</span>
                  <span className="nk-tb__crumb--here" aria-current="page">TopBarDemo.tsx</span>
                </nav>
                <Cluster online={3} />
                <Inbox count={1} unseen={false} />
                <NockerlAvatar src={FACE} name="Ada Lovelace" size="md" presence="streaming" onClick={() => {}} />
              </header>
            }
          />

          {/* Compact / condensed scrolled state: the bar has shrunk in place */}
          <div>
            <p className="nk-tb__scrollnote">Condensed: the same bar after scroll (height collapses; freezes under reduced motion)</p>
            <Stage
              lines={3}
              bar={
                <header className="nk-tb nk-tb--condensed" aria-label="Tasks">
                  <span className="nk-tb__brand"><NockerlLockup size={22} product="Dashboard" /></span>
                  <span className="nk-tb__spacer" />
                  <NockerlIconButton icon={ISearch} label="Search" />
                  <Inbox count={128} unseen={false} />
                  <NockerlAvatar src={FACE} name="Ada Lovelace" size="md" presence="active" onClick={() => {}} />
                </header>
              }
            />
          </div>

          {/* Contextual / selection top bar: "N selected" + actions */}
          <Stage
            lines={3}
            bar={
              <header className="nk-tb nk-tb--select" aria-label="3 selected">
                <NockerlIconButton icon={IClose} label="Clear selection" onClick={() => setSelected(0)} />
                <span className="nk-tb__sel-count">{selected || 3} selected</span>
                <span className="nk-tb__spacer" />
                <span className="nk-tb__sel-actions">
                  <NockerlIconButton icon={I('M4 7h16M4 12h10M4 17h7')} label="Move" />
                  <NockerlIconButton icon={I('M8 6V4h8v2m-9 0h10l-1 14H8L7 6Z')} label="Archive" />
                  <NockerlIconButton icon={I('M5 7h14M9 7V5h6v2m-7 0 1 13h6l1-13')} label="Delete" />
                </span>
              </header>
            }
          />
        </div>
      </section>
    </div>
  );
}
