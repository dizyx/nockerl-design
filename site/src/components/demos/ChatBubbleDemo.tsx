/**
 * ChatBubbleDemo: the live, interactive Nockerl chat-bubble PRIMITIVE for the web.
 *
 * This is the LOW-LEVEL bubble surface that holds ONE message: the container,
 * shape, tail/notch corner, role-based alignment, max-width, grouping, and
 * bubble-level delivery/selection states. The rich assistant TURN (identity
 * header, markdown, tool-call panels, streaming) is a SEPARATE component
 * (AgentMessage) BUILT ON this bubble; it is intentionally NOT re-documented here.
 *
 * Mirrors the canonical Compose `MessageBubble` (chat/ui/MessageBubble.kt) +
 * `bubbleShape` / `NockerlCard` (core/theme): a row owns the turn's horizontal
 * alignment; the bubble is a LIFTED plane whose ONE tightened corner points at the
 * speaker. USER = trailing/right (the cyan jewel card, userCard2 → userCard
 * gradient); AGENT = leading/left (the soft lifted plane, cardAlt + altHairline);
 * SYSTEM = centered, muted (the chat's amber divider voice). Shared look pulled
 * from AgentMessageDemo so the two stay visually identical.
 *
 * Laws, verbatim:
 *   • DEPTH = neutral tinted shadow + a top catch-light (the `nockerlLitSurface`
 *     material), NEVER a glow/colored shadow. Bubbles LIFT off the chat ground.
 *   • --radius-bubble (20) with ONE tail corner (--radius-bubble-tail, 6) toward
 *     the speaker: agent top-left, user top-right. Within a same-sender GROUP the
 *     interior speaker-side corners square off (mirrors Compose's isContinuation
 *     run) so a run reads as one stack; only the edge bubbles keep the tail.
 *   • flash-free: fills are STATIC; only brightness/transform/shadow + the
 *     sending dots' OPACITY animate, never a fill swap. Delivery status is WARM,
 *     never cyan, never color-alone, and NEVER a vertical color rail: failed reads
 *     as a red alert glyph + "Failed" text + a real Retry button (status color
 *     lives in the icon/text, not a stripe).
 *   • selection reads by outline: a cyan ring at the selection weight, with no wash
 *     (law 6) and never a glow. Retry / select are REAL buttons with a focus-visible
 *     OUTLINE ring; fully keyboard-operable. prefers-reduced-motion freezes the
 *     appear + sending animations.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them to
 * the dark palette. Literals remain only for pure geometry (dot/icon/rail sizes,
 * shadow blur, transition curves, the bubble width cap, which mirrors the Compose
 * `bubbleMaxWidth` Dp).
 */
import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import { NockerlButton, NockerlFacetedBackground, NockerlStatusDisc, type ComposeContract } from '@dizyx/nockerl-react';

export type BubbleRole = 'user' | 'agent' | 'system';
export type DeliveryState = 'sending' | 'sent' | 'failed';
/** Where a bubble sits in a consecutive same-sender run (drives the tail). */
export type GroupPosition = 'single' | 'first' | 'middle' | 'last';

export interface ChatBubbleProps {
  /** Speaker. user → trailing/right (cyan jewel); agent → leading/left (soft plane); system → centered (muted). */
  role: BubbleRole;
  /** The message body: text or any inline node. The bubble is a pure container. */
  children?: ReactNode;
  /** Position in a same-sender group. Controls which corners keep the tail vs. square off. */
  group?: GroupPosition;
  /** Delivery state (own-message lane). Adds a clock/check/alert + sets the surface. Never color-alone. */
  delivery?: DeliveryState;
  /** Short time string shown under the bubble (e.g. "10:23 AM"). */
  timestamp?: string;
  /** Selected / long-pressed: a cyan ring at the selection weight, no wash (law 6), never a glow. */
  selected?: boolean;
  /** Retry handler for a failed bubble. Renders a real, focusable Retry button. */
  onRetry?: () => void;
  /** Select / long-press handler. Makes the whole bubble a focusable target. */
  onSelect?: () => void;
}

// ─── Inline glyphs (stroke icons use currentColor so each slot tints correctly) ──
const svg = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};
const icon = (d: string): ReactNode => (
  <svg {...svg}>
    <path d={d} />
  </svg>
);
const IconClock = icon('M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z');
const IconCheck = icon('M20 6 9 17l-5-5');
const IconAlert = icon('M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z');
const IconRetry = icon('M21 12a9 9 0 1 1-3-6.7M21 4v4h-4');

// Every visual value is a token; the dark stage resolves the cyan accent to #0cc0df.
// The bubble carries the depth (lit-from-above: tinted shadow + top catch-light);
// the tightened tail corner points at the speaker. Fills never swap on interaction.
// Exported so sibling demos (e.g. FloatingPillsDemo) can render REAL ChatBubbles
// with the identical styles instead of hand-rolling their own bubble markup.
export const STYLES = `
.nk-cb-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
/* the chat GROUND: darkest layer; bubbles lift off it */
/* task 2669: the chat ground IS the real FacetedBackground primitive (bare, clipped
   to the rounded stage); chat-bg stays as the paint-behind fallback. */
.nk-cb-stage { position: relative; overflow: hidden;
  background: var(--color-chat-bg); border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card); padding: var(--space-5) var(--space-4);
  display: flex; flex-direction: column; gap: var(--space-4);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-cb-stage > :not(.nk-fb-surface) { position: relative; }
/* one chat ROW: owns horizontal alignment of the bubble */
.nk-cb-row { display: flex; flex-direction: column; max-width: 100%; }
.nk-cb-row--agent { align-items: flex-start; }
.nk-cb-row--user { align-items: flex-end; }
.nk-cb-row--system { align-items: center; }
/* tighten the gap WITHIN a same-sender group (a run reads as one stack) */
.nk-cb-row--grp-middle, .nk-cb-row--grp-last { margin-top: calc(-1 * var(--space-2)); }

/* the BUBBLE: lifted plane, width-capped like the phone bubble cap (mirrors bubbleMaxWidth) */
.nk-cb-bubble { position: relative; max-width: var(--nk-cb-max); padding: var(--space-3) var(--space-3);
  border: var(--space-px) solid transparent; font-size: var(--font-size-14); line-height: var(--font-line-height-20);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);   /* catch-light, NOT a glow */
  transition: transform .12s cubic-bezier(.2,0,0,1), box-shadow .12s, filter .12s; }
.nk-cb-bubble p { margin: 0; }
.nk-cb-bubble code { font-family: var(--font-family-mono); font-size: var(--font-size-12);
  background: color-mix(in srgb, currentColor 12%, transparent);
  border-radius: var(--radius-track); padding: var(--space-0-5) var(--space-1); }

/* AGENT: the soft lifted plane, tail top-left. Group runs square the LEFT seam. */
.nk-cb-bubble--agent { background: linear-gradient(180deg, color-mix(in srgb, var(--color-card-alt), var(--color-surface-highlight) 60%), var(--color-card-alt)); color: var(--color-on-card-alt);
  border-color: var(--color-alt-hairline);
  border-radius: var(--radius-bubble-tail) var(--radius-bubble) var(--radius-bubble) var(--radius-bubble); }
.nk-cb-bubble--agent.nk-cb--first { border-top-left-radius: var(--radius-bubble); }
.nk-cb-bubble--agent.nk-cb--middle { border-top-left-radius: var(--radius-bubble-tail); border-bottom-left-radius: var(--radius-bubble-tail); }
.nk-cb-bubble--agent.nk-cb--last { border-top-left-radius: var(--radius-bubble-tail); }

/* USER: the cyan jewel card (gradient), tail top-right, no border. Group runs square the RIGHT seam. */
.nk-cb-bubble--user { background: linear-gradient(180deg, var(--color-user-card2), var(--color-user-card));
  color: var(--color-on-user-card);
  border-color: color-mix(in srgb, var(--color-user-card) 72%, var(--color-shadow-tint));   /* seat the bottom edge so the gradient's end stop doesn't read as an off-color 1px line */
  border-radius: var(--radius-bubble) var(--radius-bubble-tail) var(--radius-bubble) var(--radius-bubble); }
.nk-cb-bubble--user.nk-cb--first { border-top-right-radius: var(--radius-bubble); }
.nk-cb-bubble--user.nk-cb--middle { border-top-right-radius: var(--radius-bubble-tail); border-bottom-right-radius: var(--radius-bubble-tail); }
.nk-cb-bubble--user.nk-cb--last { border-top-right-radius: var(--radius-bubble-tail); }

/* a SELECTED / long-pressed bubble: a cyan ring and nothing else, NOT a glow. Selection is a
   STATE, so law 6 reads it by outline with no wash. The ring OUTLINES a chosen message, so it
   takes the selection weight at 45%, not the thicker floating weight, which belongs to
   surfaces that sit ON TOP of the thread. */
.nk-cb-bubble--selected { outline: var(--border-width-selection) solid color-mix(in srgb, var(--color-accent-primary) 45%, transparent); outline-offset: var(--space-0-5); }

/* SENDING: own message in flight, dimmed with a tinted shadow held back (depth recedes) */
.nk-cb-bubble--sending { filter: brightness(.92); opacity: .82; }
/* FAILED bubble: the BANNER INLINE-ALERT grammar (task 2673 ruling, which supersedes both the
   r4 recessed well AND the r5 7%-tint lift, whose tint read PINK over the light card-alt).
   A SOLID neutral card surface (never a red/pink fill), the intent only WHISPERED into the
   border (the banner's 22% mix), LIFTED with the banner's neutral shadow + catch-light (cards
   LIFT, so the shadow is never colored and never a glow, law 1). The red state is carried by
   the alert glyph, the "Failed" text and Retry below, never a vertical color rail: the tint
   rides WITH the icon and text. */
.nk-cb-bubble--failed { background: var(--color-card-surface1); color: var(--color-on-card);
  border-color: color-mix(in srgb, var(--color-status-error) 22%, var(--color-card-hairline));
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }

/* an INTERACTIVE bubble (selectable) is a real button: reset the chrome, keep the surface */
button.nk-cb-bubble { font: inherit; text-align: inherit; cursor: pointer; width: auto; display: block; }
button.nk-cb-bubble:hover { filter: brightness(1.04); }
button.nk-cb-bubble:active { transform: scale(.99); }
button.nk-cb-bubble:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }

/* SYSTEM: centered, muted pill on the ground (the chat's amber divider voice, never cyan) */
.nk-cb-system { display: inline-flex; align-items: center; gap: var(--space-2); align-self: center;
  max-width: var(--nk-cb-max); padding: var(--space-1) var(--space-3);
  background: color-mix(in srgb, var(--color-status-warning) 12%, transparent);
  border: var(--space-px) solid color-mix(in srgb, var(--color-status-warning) 30%, transparent);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-12); color: var(--color-status-warning); font-weight: var(--font-weight-medium); }
.nk-cb-system__dot { width: 5px; height: 5px; border-radius: var(--radius-pill);
  background: var(--color-status-warning); flex: 0 0 auto; }

/* the meta line under a bubble: timestamp + delivery receipt (own-message lane) */
.nk-cb-meta { display: inline-flex; align-items: center; gap: var(--space-1);
  padding: var(--space-0-5) var(--space-2) 0; font-size: var(--font-size-10); color: var(--color-on-canvas-muted); }
.nk-cb-meta svg { display: block; width: 11px; height: 11px; flex: 0 0 auto; }
.nk-cb-meta--sent { color: var(--color-status-success); }
.nk-cb-meta--failed { color: var(--color-on-canvas-muted); }   /* muted receipt: the "Failed" body carries the signal, so drop the red pile-up */
.nk-cb-meta__ticks { display: inline-flex; }       /* the delivery receipt glyph */
.nk-cb-sending-dots { display: inline-flex; align-items: center; gap: 3px; }
.nk-cb-sending-dots i { width: 4px; height: 4px; border-radius: var(--radius-pill);
  background: var(--color-on-canvas-muted); animation: nk-cb-pulse 1s ease-in-out infinite; }
.nk-cb-sending-dots i:nth-child(2) { animation-delay: .15s; }
.nk-cb-sending-dots i:nth-child(3) { animation-delay: .3s; }
@keyframes nk-cb-pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }

/* failed body: the BANNER INLINE-ALERT anatomy (task 2673). The INSET error disc leads
   (recessed and informational, per the icon-interactivity canon), a TITLE (error, semibold)
   sits over the MUTED message (the banner's titled variant), Retry is a real button
   below. One failure grammar with Banner + the AgentMessage failed turn. */
.nk-cb-fail { display: flex; align-items: flex-start; gap: var(--space-3); }
.nk-cb-fail__body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.nk-cb-fail__title { color: var(--color-status-error); font-weight: var(--font-weight-semibold); }
.nk-cb-fail__msg { color: var(--color-on-card-muted); }
.nk-cb-fail b { color: var(--color-on-card); font-weight: var(--font-weight-semibold); }
/* the failed-turn Retry is the real NockerlButton primitive; only its top offset lives here */
.nk-cb-retry-wrap { margin-top: var(--space-3); }

/* appear animation: a new bubble rises into place (transform/opacity, frozen under reduced-motion) */
.nk-cb-appear { animation: nk-cb-rise .22s cubic-bezier(.2,0,0,1) both; }
@keyframes nk-cb-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  .nk-cb-bubble, button.nk-cb-bubble { transition: none; }
  .nk-cb-appear { animation: none; }
  .nk-cb-sending-dots i { animation: none; opacity: .7; }
}
.nk-cb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-cb-demo__group + .nk-cb-demo__group { margin-top: var(--space-6); }
.nk-cb-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-cb-demo__count b { color: var(--color-accent-primary); }
`;

/** The delivery receipt shown in the meta line: warm status, never cyan, never color-alone. */
function DeliveryReceipt({ delivery }: { delivery: DeliveryState }) {
  if (delivery === 'sending') {
    return (
      <span className="nk-cb-meta" role="status" aria-label="Sending">
        <span className="nk-cb-sending-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>Sending</span>
      </span>
    );
  }
  if (delivery === 'failed') {
    return (
      <span className="nk-cb-meta nk-cb-meta--failed">
        <span className="nk-cb-meta__ticks">{IconAlert}</span>
        <span>Not delivered</span>
      </span>
    );
  }
  return (
    <span className="nk-cb-meta nk-cb-meta--sent">
      <span className="nk-cb-meta__ticks">{IconCheck}</span>
      <span>Sent</span>
    </span>
  );
}

/**
 * A single Nockerl chat bubble, the PRIMITIVE the spec documents. Owns the row's
 * horizontal alignment (agent left / user right / system centered), the lifted
 * surface with the speaker-facing tail corner, group-aware corner squaring, an
 * optional under-bubble meta line (timestamp + delivery receipt), and the
 * selected / failed bubble-level states. It does NOT render headers, markdown, or
 * tool panels; those belong to the AgentMessage turn built on top of it.
 */
export function ChatBubble({
  role,
  children,
  group = 'single',
  delivery,
  timestamp,
  selected = false,
  onRetry,
  onSelect,
}: ChatBubbleProps) {
  // System is a centered, muted divider-pill, not a tailed plane.
  if (role === 'system') {
    return (
      <div className={`nk-cb-row nk-cb-row--system nk-cb-appear`} style={{ '--nk-cb-max': 'min(82%, var(--size-chat-bubble-max))' } as CSSProperties}>
        <div className="nk-cb-system" role="separator">
          <span className="nk-cb-system__dot" aria-hidden="true" />
          <span>{children}</span>
        </div>
      </div>
    );
  }

  const failed = delivery === 'failed';
  const bubbleClass = [
    'nk-cb-bubble',
    `nk-cb-bubble--${role}`,
    `nk-cb--${group}`,
    selected ? 'nk-cb-bubble--selected' : '',
    delivery === 'sending' ? 'nk-cb-bubble--sending' : '',
    failed ? 'nk-cb-bubble--failed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // A selectable bubble is a real, focusable button; otherwise a plain div.
  const body = (
    <>
      {failed ? (
        <div className="nk-cb-fail">
          {/* the banner's INSET status disc (task 2673): recessed, intent in the glyph */}
          <NockerlStatusDisc intent="error" inset>{IconAlert}</NockerlStatusDisc>
          <span className="nk-cb-fail__body">
            <span className="nk-cb-fail__title">Failed</span>
            <span className="nk-cb-fail__msg">{children}</span>
          </span>
        </div>
      ) : (
        children
      )}
      {failed && onRetry && (
        <div className="nk-cb-retry-wrap">
          <NockerlButton text="Retry" variant="ghost" size="sm" leadingIcon={IconRetry} onClick={onRetry} />
        </div>
      )}
    </>
  );

  return (
    <div
      className={`nk-cb-row nk-cb-row--${role} nk-cb-row--grp-${group} nk-cb-appear`}
      style={{ '--nk-cb-max': 'min(82%, var(--size-chat-bubble-max))' } as CSSProperties}
    >
      {/* Justified raw (round-3 toggle-cleanup): on a SELECTABLE message bubble, aria-pressed
          is its selected state on a content bubble, NOT a toggle / segmented control or a
          NockerlButton facsimile. The bubble is the message surface, so it stays a plain button. */}
      {onSelect && !failed ? (
        <button type="button" className={bubbleClass} aria-pressed={selected} onClick={onSelect}>
          {body}
        </button>
      ) : (
        <div className={bubbleClass}>{body}</div>
      )}
      {(timestamp || delivery) && (
        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          {delivery ? (
            <DeliveryReceipt delivery={delivery} />
          ) : (
            timestamp && <span className="nk-cb-meta">{timestamp}</span>
          )}
          {delivery && timestamp && <span className="nk-cb-meta">{timestamp}</span>}
        </div>
      )}
    </div>
  );
}

// ChatBubble is a bubble CONTAINER: `children` is the message body (any inline content). The
// failed-turn Retry now composes the real NockerlButton primitive (destructive, sm).
// OWNS button: the pressable message-bubble SURFACE (role gradients + tail/group corners + arbitrary
// block children) is the component's own identity - no NockerlButton/NockerlIconButton/NockerlListItem can host a full-width
// content bubble.
export const compose = {
  slots: { default: { accepts: '*' } },
  owns: ['button'],
} satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Chat bubble page: the PRIMITIVE's full
 * range on the chat ground. It covers the three roles (agent left, user right, system
 * centered), a GROUPED run of consecutive same-sender bubbles (tail only on the
 * edge bubbles, tighter spacing within the run), the delivery states
 * (sending → sent → failed with a real Retry), a selected / long-pressed bubble,
 * and a with-timestamp bubble. Selecting + Retry are keyboard-operable; the appear
 * and sending animations freeze under prefers-reduced-motion.
 */
export default function ChatBubbleDemo() {
  const [retries, setRetries] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>('sel');

  return (
    <div className="nk-cb-demo">
      <style>{STYLES}</style>

      <div className="nk-cb-demo__group">
        <p className="nk-cb-demo__lbl">Roles: agent leads (left), user trails (right), system centers</p>
        <div className="nk-cb-stage" aria-label="Roles">
          <NockerlFacetedBackground bare aria-hidden="true" />
          <ChatBubble role="agent">
            <p>
              Routing every session through the <code>credential-store</code> proxy for credentials.
            </p>
          </ChatBubble>
          <ChatBubble role="user">
            <p>Perfect. Ship it.</p>
          </ChatBubble>
          <ChatBubble role="system">Context compacted</ChatBubble>
        </div>
      </div>

      <div className="nk-cb-demo__group">
        <p className="nk-cb-demo__lbl">Grouping: a same-sender run keeps the tail only on the edge bubbles</p>
        <div className="nk-cb-stage" aria-label="Grouped run">
          <NockerlFacetedBackground bare aria-hidden="true" />
          <ChatBubble role="agent" group="first">
            <p>Reading the reconnect loop.</p>
          </ChatBubble>
          <ChatBubble role="agent" group="middle">
            <p>Backoff caps at 30s with jitter.</p>
          </ChatBubble>
          <ChatBubble role="agent" group="last">
            <p>Re-running the SSE tests now.</p>
          </ChatBubble>

          <ChatBubble role="user" group="first">
            <p>Nice.</p>
          </ChatBubble>
          <ChatBubble role="user" group="last">
            <p>Add a metric for reconnect count too.</p>
          </ChatBubble>
        </div>
      </div>

      <div className="nk-cb-demo__group">
        <p className="nk-cb-demo__lbl">Delivery states: own-message lane (status is warm + icon + text, never color alone)</p>
        <div className="nk-cb-stage" aria-label="Delivery states">
          <NockerlFacetedBackground bare aria-hidden="true" />
          <ChatBubble role="user" delivery="sending" timestamp="10:26 AM">
            <p>Cap the retry count at 3.</p>
          </ChatBubble>
          <ChatBubble role="user" delivery="sent" timestamp="10:25 AM">
            <p>Use exponential backoff.</p>
          </ChatBubble>
          <ChatBubble role="user" delivery="failed" onRetry={() => setRetries((c) => c + 1)}>
            <span>
              <b>Couldn&rsquo;t send</b>: no connection to the gateway.
            </span>
          </ChatBubble>
        </div>
      </div>

      <div className="nk-cb-demo__group">
        <p className="nk-cb-demo__lbl">Selected + timestamp: tap a bubble to select (a cyan ring, no wash, not a glow)</p>
        <div className="nk-cb-stage" aria-label="Selection and timestamp">
          <NockerlFacetedBackground bare aria-hidden="true" />
          <ChatBubble
            role="agent"
            timestamp="10:21 AM"
            selected={selectedId === 'sel'}
            onSelect={() => setSelectedId((id) => (id === 'sel' ? null : 'sel'))}
          >
            <p>Long-press / tap to select me.</p>
          </ChatBubble>
          <ChatBubble
            role="user"
            timestamp="10:22 AM"
            selected={selectedId === 'selu'}
            onSelect={() => setSelectedId((id) => (id === 'selu' ? null : 'selu'))}
          >
            <p>And me. Selection works on both voices.</p>
          </ChatBubble>
        </div>
        <p className="nk-cb-demo__count">
          Retry fired <b>{retries}</b> {retries === 1 ? 'time' : 'times'} · selected:{' '}
          <b>{selectedId ?? 'none'}</b> · tab to a bubble or Retry; the island is live.
        </p>
      </div>
    </div>
  );
}
