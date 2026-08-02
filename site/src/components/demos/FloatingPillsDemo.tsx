/**
 * FloatingPillsDemo: the live, interactive Nockerl "floating pills" island.
 *
 * A FLOATING overlay cluster of tappable pills that hovers OVER a scrolling
 * surface, distinct from the inline `chip` (filter/selection in a form) and the
 * passive `badge` (a count). Sourced faithfully from Android's
 * `chat/ui/SessionChipsBar.kt` (a flat LazyRow of filled keycaps + a cyan "+"
 * CTA over the chat feed) and `ChatScreen.kt`'s floating scroll-to-bottom FAB
 * ("they float as centered pills over the feed, each carries its own opaque fill
 * + L3 shadow").
 *
 * Laws, verbatim: the pill SHAPE is the reserved stadium (--radius-pill); depth
 * is a neutral drop shadow + top catch-light (NO glow / colored shadow); the
 * floating container is a lifted opaque chrome surface whose ends FADE (scrim
 * mask) rather than hard-clip; active keycap → brighter chrome-active fill + a
 * HIGHER lift, inactive → resting fill + LOWER lift + dimmed content; the cyan
 * "+" CTA + accent pill use the session-chip / on-accent tokens; feedback
 * animates brightness/transform/shadow only (the fill never tweens); entrance is
 * a staggered rise, frozen under prefers-reduced-motion; focus is an OUTLINE.
 *
 * The chat feed under the floating chrome renders REAL `ChatBubble` primitives
 * (imported from ChatBubbleDemo, the canonical bubble) so the float is proven over
 * the actual component, not a look-alike; its shared STYLES are injected once here.
 *
 * TOKEN-REACTIVE: every color/font/radius/spacing/type size is a `var(--token)`
 * (docs/demo-token-contract.md); literals remain only for pure geometry (dot /
 * icon / border sizes, transition curves, scroll-mask channel). Scoped via an
 * `nk-fp` class injected once: self-contained, with no docs-theme dependency.
 */
import { useEffect, useRef, useState } from 'react';
import { ChatBubble, STYLES as chatStyles } from './ChatBubbleDemo';
import { ScrollToBottom, SCROLL_TO_BOTTOM_STYLES } from './_ScrollToBottom';

import { NockerlFacetedBackground, NockerlIcon, NockerlSessionChip, NockerlSessionChipsBar, type NockerlSessionChipDot } from '@dizyx/nockerl-react';

// ─── Inline glyphs (stroke icons using currentColor so each slot tints correctly) ──
const IconCloud = <NockerlIcon path="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.34 11 4 4 0 0 0 7 19h10.5Z" />;
// prettier-ignore
const IconChip = (<NockerlIcon><rect x="7" y="7" width="10" height="10" rx="1.5" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></NockerlIcon>);
// (the scroll-to-bottom arrow now lives inside the first-class _ScrollToBottom component)
// prettier-ignore
const IconCheck = <NockerlIcon path="M20 6 9 17l-5-5" />;

// The session keycap (the rich floating pill: status dot + engine glyph + name +
// selection mark + a live per-chip context LINE, all INSIDE the pill) is the PACKAGE
// canon: NockerlSessionChip, used verbatim here AND in the Context gauge inline strip
// (the Dashboard uses the same element, one design). The dot priority ladder + the cyan →
// amber → red line ramp live in that module. This demo owns only the float
// POSITIONING + the entrance + the SESSIONS[] data.

// Everything floating is the reserved PILL. Depth is a neutral drop shadow + a
// top catch-light; feedback animates brightness/transform/shadow only. All
// values are tokens; literals are pure geometry / transition curves.
const STYLES = `
.nk-fp { font-family: var(--font-family-sans); }

/* The contained STAGE: a chat feed that scrolls UNDER the floating chrome, which is what
   makes the "float" provable. Ground = chat-bg (a step off canvas); feed cards
   lift; the floating bars sit ABOVE on their own layer. */
.nk-fp__stage {
  position: relative; overflow: hidden; height: 420px;
  border-radius: var(--radius-card); background: var(--color-chat-bg);
  border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-fp__stage + .nk-fp__stage { margin-top: var(--space-5); }

/* The scrolling content region; padded so resting cards sit in the visible gap. */
.nk-fp__feed {
  position: absolute; inset: 0; overflow-y: auto; scrollbar-width: thin;
  padding: calc(var(--space-12) + var(--space-8)) var(--space-4) calc(var(--space-12) + var(--space-6));
  display: flex; flex-direction: column; gap: var(--space-3);
}
/* Bubbles in the feed are REAL <ChatBubble> primitives (styles injected from the
   ChatBubble demo); a ghost class dims the trailing demo-only messages. */
.nk-fp__ghost { opacity: .5; }

/* The FLOATING positioner does NOT span edge to edge; it centers a lifted,
   inset, opaque bar on its own layer above the feed. */
.nk-fp__floataposat {
  position: absolute; left: 0; right: 0; z-index: 2; padding: 0 var(--space-3);
  display: flex; justify-content: center;
  pointer-events: none;          /* the bar floats; only its pills take input */
}
/* Both clusters are inset from the rounded stage edge by MORE than the pills'
   drop-shadow reach + hover-lift, so the resting shadow (bottom) and the lifted
   position + its larger shadow (top) stay inside the stage's rounded-corner clip
   (--radius-card + overflow:hidden) instead of being cut off. The bar shadow
   reaches ~level3 + blur below the pill; --space-6 clears it with headroom. */
.nk-fp__floataposat--top { top: var(--space-6); }
/* bottom cluster sits just above the (implied) chat input, CENTERED: the
   scroll-to-bottom FAB and the quick-action strip both center over the composer. */
.nk-fp__floataposat--bottom { bottom: var(--space-6); justify-content: center; }

/* The BAR (a lifted chrome pill-track w/ the design-laws SECTION-2 floating accent border +
   the scroll-aware edge fade) and the KEYCAP pill (label row over the inner context
   LINE) are the PACKAGE canon: NockerlSessionChipsBar + NockerlSessionChip
   (@dizyx/nockerl-react, promoted from this page's site-local originals, task 2654).
   The Context gauge inline strip renders the same pill. Only the
   FLOAT positioning + entrance + feed stay local. */

/* The floating SCROLL-TO-BOTTOM key (circle + §2 cyan floating border + count badge) is
   the first-class _ScrollToBottom component; its .nk-s2b styles are injected via
   SCROLL_TO_BOTTOM_STYLES below. */

/* Entrance: a staggered RISE, frozen under reduced motion. */
.nk-fp__enter { opacity: 0; transform: translateY(8px); animation: nk-fp-rise .42s cubic-bezier(.2,.7,.2,1) forwards; }
@keyframes nk-fp-rise { to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  .nk-fp__enter { animation: none; opacity: 1; transform: none; }
}

/* ── Demo chrome (labels + live counter) ─────────────────────────────────────*/
.nk-fp__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-fp__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-fp__count b { color: var(--color-accent-primary); }
`;

interface SessionCap {
  slug: string;
  name: string;
  dot: NockerlSessionChipDot;
  engine: 'cloud' | 'nockerl';
  /** context-usage ratio 0..1, or null = no data (faint empty track). */
  ratio: number | null;
}

const SESSIONS: SessionCap[] = [
  { slug: 'docs', name: 'docs site', dot: 'streaming', engine: 'cloud', ratio: 0.42 },
  { slug: 'gateway', name: 'gateway refactor', dot: 'active', engine: 'nockerl', ratio: 0.71 },
  { slug: 'credential-store', name: 'allowlist audit', dot: 'attention', engine: 'cloud', ratio: 0.9 },
  { slug: 'voice', name: 'voice STT', dot: 'unread', engine: 'nockerl', ratio: 0.33 },
  { slug: 'tokens', name: 'token build', dot: 'idle', engine: 'cloud', ratio: null },
];

/**
 * One session keycap: the floating, filled, pressable key (the unit). Renders the
 * promoted NockerlSessionChip, a rich session CAPSULE carrying a status dot (with pulse) +
 * engine glyph + name + selection check + a live usage-ratio LINE INSIDE the pill. NockerlChip
 * (text + one swatch/icon + optional x) cannot hold this content (esp. the usage line),
 * and it is not a segmented track; it is a distinct selector affordance owned as a <button>.
 * This demo layers only the staggered ENTRANCE (nk-fp__enter) on top of the canon.
 */
function SessionKeycap({
  cap,
  active,
  index,
  onSelect,
}: {
  cap: SessionCap;
  active: boolean;
  index: number;
  onSelect: () => void;
}) {
  return (
    <NockerlSessionChip
      active={active}
      dot={cap.dot}
      engineGlyph={cap.engine === 'nockerl' ? IconChip : IconCloud}
      name={cap.name}
      mark={IconCheck}
      ratio={cap.ratio}
      onSelect={onSelect}
      className="nk-fp__enter"
      style={{ animationDelay: `${index * 55}ms` }}
    />
  );
}

// PACKAGE-BACKED page: the bar + keycap canon ships as NockerlSessionChipsBar /
// NockerlSessionChip in @dizyx/nockerl-react (their contracts live there), so this
// harness declares no contract of its own. The scroll-to-bottom key stays the
// first-class _ScrollToBottom site component; the feed renders real ChatBubble primitives.

/**
 * The interactive showcase mounted on the Floating pills page. A contained stage
 * proves the FLOAT: a session-chips bar + a scroll-to-bottom FAB hovering over a
 * scrolling chat feed. Tab, click, and scroll them.
 */
export default function FloatingPillsDemo() {
  const [active, setActive] = useState('gateway');
  const [switches, setSwitches] = useState(0);

  // The scroll-to-bottom FAB only shows when the feed is scrolled UP, faithful
  // to the real ChatScreen (it tracks scroll position and hides at the bottom).
  const feedRef = useRef<HTMLDivElement>(null);
  const [scrolledUp, setScrolledUp] = useState(true);

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
      setScrolledUp(!atBottom);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const jumpToBottom = () => {
    const el = feedRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  };

  const select = (slug: string) => {
    setActive(slug);
    setSwitches((c) => c + 1);
  };

  return (
    <div className="nk-fp">
      {/* the REAL ChatBubble styles, injected once so the feed renders true bubbles */}
      <style>{chatStyles}</style>
      {/* the first-class scroll-to-bottom key styles (§2 floating border) */}
      <style>{SCROLL_TO_BOTTOM_STYLES}</style>
      <style>{STYLES}</style>

      <p className="nk-fp__lbl">Session chips bar + scroll-to-bottom pill, floating over a scrolling feed</p>
      <div className="nk-fp__stage">
        {/* the REAL faceted chat ground (task 2669) */}
        <NockerlFacetedBackground bare aria-hidden="true" />
        {/* the floating SESSION CHIPS bar is the PROMOTED package container (§2 floating
            accent border + scroll-aware edge fade + the trailing cyan "+" CTA); this
            harness adds only the staggered entrance + the float positioning. */}
        <div className="nk-fp__floataposat nk-fp__floataposat--top">
          <NockerlSessionChipsBar className="nk-fp__enter" onAdd={() => select('docs')}>
            {SESSIONS.map((cap, i) => (
              <SessionKeycap
                key={cap.slug}
                cap={cap}
                index={i}
                active={active === cap.slug}
                onSelect={() => select(cap.slug)}
              />
            ))}
          </NockerlSessionChipsBar>
        </div>

        {/* the scrolling FEED the bar hovers over, built from REAL ChatBubble primitives */}
        <div className="nk-fp__feed" ref={feedRef}>
          <ChatBubble role="agent">Pulled the SessionChipsBar concept: a flat LazyRow of keycaps.</ChatBubble>
          <ChatBubble role="user">Make the active one lift higher, no glow.</ChatBubble>
          <ChatBubble role="agent">Done. A soft cyan selection wash + a higher shadow tier.</ChatBubble>
          <ChatBubble role="user">And the context line under each chip?</ChatBubble>
          <ChatBubble role="agent">Cyan → amber → red by usage. No number, just the line.</ChatBubble>
          <div className="nk-fp__ghost">
            <ChatBubble role="agent">Scroll up and the jump-to-bottom pill appears.</ChatBubble>
          </div>
          <div className="nk-fp__ghost">
            <ChatBubble role="user">…and hides once you reach the bottom.</ChatBubble>
          </div>
          <div className="nk-fp__ghost">
            <ChatBubble role="agent">Each pill is a real, keyboard-reachable button.</ChatBubble>
          </div>
        </div>

        {/* the floating SCROLL-TO-BOTTOM key is the first-class _ScrollToBottom component
            (its own §2 cyan floating border + unread-count badge, shown only while scrolled up) */}
        <div className="nk-fp__floataposat nk-fp__floataposat--bottom">
          <ScrollToBottom count={3} hidden={!scrolledUp} onClick={jumpToBottom} />
        </div>
      </div>

      <p className="nk-fp__count">
        Switched session <b>{switches}</b> {switches === 1 ? 'time' : 'times'} · active <b>{active}</b>. The island is live.
      </p>
    </div>
  );
}
