/**
 * EmptyStateDemo: the live, interactive Nockerl EMPTY STATE island for web.
 *
 * An empty state is a CENTERED, full-region zero-data placeholder that OWNS an
 * otherwise empty content area (a whole list / sheet / thread): an icon → title →
 * description → optional action(s), stacked and optically centered on both axes
 * with balanced vertical rhythm. Covers its relatives too: no-search-results,
 * failed-to-load (error), and first-run onboarding.
 *
 * DISTINCT from callout + banner (both already ship here): those are horizontal
 * inline STRIPS in the layout flow (callout = a recessed editorial aside w/ a
 * leading rail; banner = a lifted dismissible status strip w/ an X). An empty
 * state is a centered BLOCK that fills the region: no dismiss, no leading rail.
 *
 * Sourced from the REAL apps (never the web dashboard):
 *   • Android (canonical): a centered Column (fillMaxSize, Arrangement.Center) with a
 *     48dp icon tinted onCardAltMuted @ ~0.5, a 16dp gap, bodyMedium text, and a
 *     Retry NockerlButton(TERTIARY) on the error arm. The empty-list text is
 *     CONTEXT-AWARE per filter tab; the chat/no-session arm adds a displayMedium
 *     wordmark + headlineSmall subtitle.
 *       files/ui/FilesSheet.kt · inbox/ui/InboxSheet.kt · chat/ui/MessageList.kt
 *   • Voice (canonical): the SYSTEM SwiftUI `ContentUnavailableView(title,
 *     systemImage:, description:)`; no-results gets its own title.
 *       UI/HistoryView.swift · UI/SettingsView.swift
 *
 * Web is the laggard (no shipped React component); this is the ORIGINAL web
 * design from the laws + the shipped Nockerl vocabulary. The CTA composes the
 * REAL NockerlButton primitive (../primitives/NockerlButton), and the empty-chat arm lays its
 * block ON the canonical NockerlFacetedBackground primitive (../primitives/NockerlFacetedBackground)
 * so the signature faceted field is the thread ground.
 *
 * Design laws honored verbatim: the icon sits in a RECESSED WELL (content sinks:
 * darker fill + inner top shadow), never a lifted glowing badge (law 1/2); the
 * mark is MUTED neutral by default, cyan only where earned (first-run + CTA), the
 * error tone is WARM status-error + icon + text, never color alone (law 8/11);
 * the CTA is the real NockerlButton primitive (static fill; brightness/transform/shadow
 * animate; outline focus ring) (law 5); the faceted ground is the NockerlFacetedBackground
 * primitive, a static field whose tone-wave drifts via a luminance phase only and
 * FREEZES under reduced-motion (law 5/6).
 *
 * TOKEN-REACTIVE (docs/demo-token-contract.md): every color / font / radius /
 * spacing / type size is a var(--token); literals remain only for pure SVG
 * geometry + transition curves (the facet mesh now lives in the primitive).
 */
import { useEffect, useState } from 'react';

import { NockerlButton, NockerlFacetedBackground, NockerlIcon, NockerlSurface, type ComposeContract } from '@dizyx/nockerl-react';

import { SearchField } from './SearchFieldDemo';

// ─── Inline stroke glyphs (currentColor → each slot tints from its token) ──────
// strokeWidth 1.6 across this set (the empty-state mark is lighter than the 2 default).

const IconSearch = (
  <NockerlIcon strokeWidth={1.6}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.6-3.6" /></NockerlIcon>
);
const IconChat = (
  <NockerlIcon strokeWidth={1.6} path="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-4.5 3.5V6.5A2.5 2.5 0 0 1 7 4h10.5A2.5 2.5 0 0 1 20 6.5z" />
);
const IconError = (
  <NockerlIcon strokeWidth={1.6}><path d="M10.3 4.3 2.5 18a1.8 1.8 0 0 0 1.6 2.7h15.8A1.8 1.8 0 0 0 21.5 18L13.7 4.3a1.95 1.95 0 0 0-3.4 0Z" /><path d="M12 9.5v4.5M12 17.4h.01" /></NockerlIcon>
);
const IconInbox = (
  <NockerlIcon strokeWidth={1.6}><path d="M4 13.5 6 5h12l2 8.5" /><path d="M4 13.5V19h16v-5.5h-4.5a3.5 3.5 0 0 1-7 0Z" /></NockerlIcon>
);
const IconPlus = <NockerlIcon strokeWidth={1.6} path="M12 5v14M5 12h14" />;
const IconRetry = (
  <NockerlIcon strokeWidth={1.6}><path d="M20 11a8 8 0 1 0-.7 4.5" /><path d="M20 5v6h-6" /></NockerlIcon>
);

// ─── The empty state itself: icon-well → title → description → action(s) ──────
type Tone = 'neutral' | 'brand' | 'error';

function EmptyState({
  icon,
  title,
  description,
  tone = 'neutral',
  actions,
  compact = false,
  onField = false,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  tone?: Tone;
  actions?: React.ReactNode;
  compact?: boolean;
  // true when the block sits ON the faceted field; adds a scrim text-shadow to
  // the title so the copy stays legible over the live mesh.
  onField?: boolean;
}) {
  return (
    <div
      className={['nk-es', compact ? 'nk-es--compact' : '', onField ? 'nk-es--onfield' : ''].filter(Boolean).join(' ')}
      role="status"
    >
      <div className="nk-es__body">
        <span className={`nk-es__well nk-es__well--${tone}`} aria-hidden="true">
          {icon}
        </span>
        <h3 className="nk-es__title">{title}</h3>
        {description && <p className="nk-es__desc">{description}</p>}
        {actions && <div className="nk-es__actions">{actions}</div>}
      </div>
    </div>
  );
}

// A faux sheet header (title + window dots + the cyan signature line) so each
// region reads as a real Nockerl screen, not a floating box. `sig` is omitted on
// the chat region (its ground is the facet field).
function RegionHeader({ title, sig = true }: { title: string; sig?: boolean }) {
  return (
    <>
      <div className="nk-es-region__bar">
        <span className="nk-es-region__title">{title}</span>
        <span className="nk-es-region__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
      {sig && <span className="nk-es-region__sig" aria-hidden="true" />}
    </>
  );
}

// All visual values are tokens; literals remain only for pure geometry
// (icon sizing, the region min-height that matches the sibling cards).
const STYLES = `
.nk-es-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
.nk-es-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-es-demo__grid { display: grid; gap: var(--space-5); grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr)); }
.nk-es-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-es-demo__count b { color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); }

/* The framed CONTENT REGION the empty state owns (list / sheet / thread): a LIFTED
   card (neutral shadow + catch-light) so the placeholder reads as "this whole area is empty".
   Bg / hairline / radius / sheen come from the NockerlSurface primitive; only the non-surface box
   metrics + the off-ladder drop shadow live here. */
.nk-es-region { position: relative; overflow: hidden; min-height: 17rem; display: flex; flex-direction: column; box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen); }
/* out-specify .nk-surface (single class, injected later in DOM) so the chat ground wins the tie */
.nk-es-demo .nk-es-region--chat { background: var(--color-chat-bg); }       /* the thread ground */
/* a faux sheet header (title + dots + cyan signature line) so the region reads as a real screen */
.nk-es-region__bar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); border-bottom: var(--space-px) solid var(--color-card-hairline); flex: 0 0 auto; }
.nk-es-region__title { font-size: var(--font-size-12); font-weight: var(--font-weight-semibold); color: var(--color-on-card); letter-spacing: var(--font-tracking-normal); }
.nk-es-region__sig { height: var(--space-0-5); flex: 0 0 auto; background: linear-gradient(90deg, var(--color-accent-primary), transparent); }
.nk-es-region__dots { margin-left: auto; display: inline-flex; gap: var(--space-1); }
.nk-es-region__dots i { width: 7px; height: 7px; border-radius: var(--radius-pill); background: var(--color-on-card-muted); opacity: .5; display: block; }

/* THE EMPTY STATE: centered on BOTH axes; icon over title over description over
   action, on the token vertical-rhythm scale. */
.nk-es { position: relative; flex: 1 1 auto; display: flex; align-items: center; justify-content: center; padding: var(--space-8) var(--space-6); text-align: center; }
.nk-es__body { position: relative; display: flex; flex-direction: column; align-items: center; gap: var(--space-3); max-width: 22rem; }
/* the icon WELL, where content SINKS: a recessed disc (darker + inner top shadow), never a lifted glowing badge. */
.nk-es__well { display: inline-flex; align-items: center; justify-content: center; width: var(--space-16); height: var(--space-16); margin-bottom: var(--space-1); border-radius: var(--radius-pill); background: var(--color-canvas-alt); border: var(--space-px) solid var(--color-card-hairline); box-shadow: inset 0 var(--space-px) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), inset 0 calc(-1 * var(--space-px)) 0 var(--color-surface-highlight); }
.nk-es__well svg { width: var(--space-8); height: var(--space-8); display: block; }
.nk-es__well--neutral { color: var(--color-on-card-muted); }   /* default mark = MUTED neutral (apps tint icon @ ~0.5) */
.nk-es__well--brand { color: var(--color-accent-primary); background: var(--color-accent-primary-soft); border-color: color-mix(in srgb, var(--color-accent-primary) 24%, transparent); }  /* first-run = earned cyan */
.nk-es__well--error { color: var(--color-status-error); background: color-mix(in srgb, var(--color-status-error) 12%, transparent); border-color: color-mix(in srgb, var(--color-status-error) 30%, transparent); }  /* WARM status + icon + text */
.nk-es__title { margin: 0; font-family: var(--type-title-large-font-family); font-weight: var(--type-title-large-font-weight); font-size: var(--type-title-large-font-size); line-height: var(--type-title-large-line-height); color: var(--color-on-card); }
.nk-es--onfield .nk-es__title { text-shadow: 0 var(--space-px) var(--space-2) var(--color-scrim); }
.nk-es__desc { margin: 0; max-width: 24rem; font-family: var(--type-body-medium-font-family); font-size: var(--type-body-medium-font-size); line-height: var(--type-body-medium-line-height); color: var(--color-on-card-muted); }
.nk-es__actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--space-2); margin-top: var(--space-3); }

/* EMPTY CHAT THREAD wrapper. The region ground is now the canonical NockerlFacetedBackground
   primitive (it owns the mesh + card surface + reduced-motion freeze). Here we only size
   its surface to sit flush in the variant grid (match the sibling regions height, drop the
   primitive 16:9 aspect) and reflow its content overlay so the faux header pins to the top
   and the empty-state block stays centered on the field. */
.nk-es-chat { display: flex; }
.nk-es-chat .nk-fb-surface { aspect-ratio: auto; min-height: 17rem; }
.nk-es-chat .nk-fb-overlay { align-items: stretch; justify-content: flex-start; gap: 0; padding: 0; }

/* the live filter box for the no-results region composes the SearchField primitive
   (it owns the recessed well + leading magnifier + clear button + searchbox a11y). */

/* COMPACT empty: a small inline placeholder for a short list (denser rhythm) */
.nk-es--compact { padding: var(--space-6) var(--space-4); }
.nk-es--compact .nk-es__well { width: var(--space-12); height: var(--space-12); }
.nk-es--compact .nk-es__well svg { width: var(--space-6); height: var(--space-6); }
.nk-es--compact .nk-es__title { font-size: var(--font-size-14); line-height: var(--font-line-height-20); }
.nk-es--compact .nk-es__desc { font-size: var(--font-size-12); line-height: var(--font-line-height-16); }
`;

/**
 * The interactive showcase mounted on the Empty state page: five empty states in
 * realistic framed content regions: first-run "no sessions yet" with a primary
 * CTA; no-search-results with a hint + secondary action + a live query box;
 * empty chat thread over a subtle faceted field; a failed-to-load error with a
 * Retry; and a compact inline empty for a short list. Every region is centered on
 * both axes; the CTAs are real keyboard-operable buttons; the facet drift freezes
 * under prefers-reduced-motion.
 */
// CONTAINER (describes the EmptyState block); composes NockerlButton in its CTA row. `icon` is a
// glyph (not a slot); `title`/`description` are plain text. `actions` holds the CTA buttons.
// No owns: the no-results region's live filter box composes the SearchField primitive (demo
// chrome around the block), not a hand-rolled <input>.
export const compose = {
  slots: { actions: { accepts: ['NockerlButton', 'NockerlIconButton'] } },
} satisfies ComposeContract;

export default function EmptyStateDemo() {
  const [created, setCreated] = useState(0);
  const [retries, setRetries] = useState(0);
  const [query, setQuery] = useState('');
  const [cleared, setCleared] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = (): void => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <div className="nk-es-demo">
      <style>{STYLES}</style>

      <p className="nk-es-demo__lbl">Variants: each owns an empty content region, centered on both axes</p>
      <div className="nk-es-demo__grid">
        {/* 1 · FIRST-RUN onboarding, the same conversation glyph as "Start a conversation"
            (one canonical message-bubble across empty states; #2586a), balanced/centered. */}
        <NockerlSurface className="nk-es-region">
          <RegionHeader title="Sessions" />
          <EmptyState
            icon={IconChat}
            tone="brand"
            title="No sessions yet"
            description="Spin up your first Cloud Agent session and it’ll show up here."
            actions={
              <>
                <NockerlButton text="Create session" variant="primary" leadingIcon={IconPlus} onClick={() => setCreated((c) => c + 1)} />
                <NockerlButton text="Browse projects" variant="ghost" onClick={() => setCreated((c) => c + 1)} />
              </>
            }
          />
        </NockerlSurface>

        {/* 2 · NO SEARCH RESULTS: a live query box + a hint + a clear-filters action */}
        <NockerlSurface className="nk-es-region">
          <RegionHeader title="Tasks · search" />
          <div style={{ padding: 'var(--space-3) var(--space-4) 0' }}>
            <SearchField
              label="Filter tasks"
              value={query}
              onChange={setQuery}
              placeholder="Filter tasks…"
              size="sm"
            />
          </div>
          <EmptyState
            icon={IconSearch}
            title={query.trim() ? 'No matches' : 'No results'}
            description={
              query.trim()
                ? `Nothing matches “${query.trim()}”. Try a different search or clear the filter.`
                : 'Type above to filter, then try a different search or clear the filter.'
            }
            actions={
              <NockerlButton
                text="Clear filter"
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setCleared(true);
                }}
              />
            }
          />
        </NockerlSurface>

        {/* 3 · EMPTY CHAT THREAD, laid ON the canonical NockerlFacetedBackground primitive
             (the signature faceted field is the thread ground; header + block render on it) */}
        <div className="nk-es-chat">
          <NockerlFacetedBackground reduced={reduced}>
            <RegionHeader title="nockerl-design · docs" sig={false} />
            <EmptyState
              icon={IconChat}
              title="Start a conversation"
              description="Send a message to kick off this session. Your thread appears here."
              onField
            />
          </NockerlFacetedBackground>
        </div>

        {/* 4 · FAILED TO LOAD: the warm error tone + a Retry (tertiary, like the apps) */}
        <NockerlSurface className="nk-es-region">
          <RegionHeader title="Files" />
          <EmptyState
            icon={IconError}
            tone="error"
            title="Couldn’t load files"
            description="The file tree failed to load. Check your connection and try again."
            actions={
              <>
                <NockerlButton text="Retry" variant="tertiary" leadingIcon={IconRetry} onClick={() => setRetries((r) => r + 1)} />
                <NockerlButton text="Dismiss" variant="ghost" onClick={() => setRetries((r) => r + 1)} />
              </>
            }
          />
        </NockerlSurface>
      </div>

      <p className="nk-es-demo__lbl" style={{ marginTop: 'var(--space-6)' }}>
        Compact: a small inline empty for a short list (denser rhythm, no region chrome)
      </p>
      <NockerlSurface className="nk-es-region" style={{ minHeight: '11rem' }}>
        <EmptyState
          icon={IconInbox}
          title="No unread notifications"
          description="You’re all caught up."
          compact
        />
      </NockerlSurface>

      <p className="nk-es-demo__count">
        Created <b>{created}</b>, retried <b>{retries}</b>, filter {cleared ? 'cleared' : 'untouched'}
        {reduced ? ' · facet frozen (reduced-motion)' : ''} · the island is live.
      </p>
    </div>
  );
}
