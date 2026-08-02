/**
 * AgentMessageDemo: the live, interactive Nockerl agent-message island for the web.
 *
 * Mirrors the canonical Compose `MessageBubble` (chat/ui/MessageBubble.kt): a chat
 * row is an alignment Column → optional identity header (model · timestamp) → a
 * lifted bubble whose tightened "tail" corner points at the speaker. Assistant =
 * LEADING/left; user = TRAILING/right. The body is an ordered run of blocks
 * (markdown text, an inline tool-call panel, a code block, a collapsible thinking
 * block) plus the live streaming "typing" dots.
 *
 * Laws, verbatim:
 *   • DEPTH = neutral tinted shadow + a top catch-light (the `nockerlLitSurface`
 *     material), NEVER a glow/colored shadow. Bubbles LIFT off the chat ground.
 *   • --radius-bubble (20) with ONE tail corner (--radius-bubble-tail, 6) toward
 *     the speaker: assistant top-left, user top-right. Nested panels use --radius-panel.
 *   • two voices: assistant = the soft lifted plane (cardAlt + altHairline); user =
 *     the cyan jewel card (userCard2 → userCard gradient). Cyan is the user's voice.
 *   • flash-free: fills are STATIC; only brightness/transform/shadow + the dots'
 *     OPACITY animate, never a fill swap. Status is WARM, never cyan, never
 *     color-alone (the failed turn = a filled red status disc + icon + text + a real Retry).
 *   • LAW 6: color NEVER rides a vertical stripe/left rail (the banned cliché). The
 *     tool-family color and the error severity ride in a FILLED leading disc/tile (the
 *     banner/callout language): the color is in the disc, on a solid surface.
 *   • copy / retry / thinking are REAL buttons with a focus-visible OUTLINE ring
 *     (never a colored shadow); fully keyboard-operable. prefers-reduced-motion
 *     freezes the streaming dots.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them to
 * the dark palette. Literals remain only for pure geometry (dot/icon/disc sizes,
 * shadow blur, transition curves, the bubble width cap, which mirrors the Compose
 * `bubbleMaxWidth` Dp).
 */
import type { CSSProperties, ReactNode } from 'react';
import { useId, useRef, useState } from 'react';
import { NockerlButton, NockerlFacetedBackground, NockerlIcon, NockerlStatusDisc, NockerlSurface, type ComposeContract } from '@dizyx/nockerl-react';
import CopyButton from './_CopyButton';
// The `.nk-am-*` chat chrome (stage · head · bubble + the full recipe) is EXTRACTED into a
// shared site-local module so the tool-call-card island can render the SAME real assistant
// bubble. This island renders the identical classes; the CSS now has one home there.
import { AM_STYLES } from './_AssistantMessage';

export type MessageRole = 'assistant' | 'user';
export type ToolFamily = 'shell-fs' | 'agent' | 'planning' | 'external';
export type ToolStatus = 'running' | 'done' | 'error';

export interface AgentMessageProps {
  /** Who is speaking. assistant → leading/left; user → trailing/right. */
  role: MessageRole;
  /** Identity header: resolved model name (assistant only). Hidden when absent. */
  model?: string;
  /** Identity header: short timestamp (e.g. "10:23 AM"). */
  timestamp?: string;
  /** Hide the identity header (consecutive turns from the same speaker collapse it). */
  showHeader?: boolean;
  /** Live SSE target: renders the streaming "typing" dot after the body. */
  streaming?: boolean;
  /** Failed turn: a filled red status disc + icon + text + a Retry action. Never color-alone. */
  error?: boolean;
  /** Retry handler for a failed turn (a real, focusable button). */
  onRetry?: () => void;
  /** The message body (text + block slots). */
  children?: ReactNode;
}

// Tool-family disc accent: categorical data colors, never the brand cyan.
// Rides in the FILLED leading icon tile (a disc), NEVER a vertical rail (Law 6).
const FAMILY_COLOR: Record<ToolFamily, string> = {
  'shell-fs': 'var(--color-family-shell-fs)',
  agent: 'var(--color-family-agent)',
  planning: 'var(--color-family-planning)',
  external: 'var(--color-family-external)',
};

// The `.nk-am-*` recipe is EXTRACTED into ./_AssistantMessage (AM_STYLES) so the tool-call-
// card island can render the SAME real assistant bubble. Every visual value is a token; the
// dark stage resolves the cyan accent to #0cc0df. The bubble carries the depth (lit-from-
// above: tinted shadow + top catch-light); the tightened tail corner points at the speaker.
const STYLES = AM_STYLES;

// ─── Inline glyphs (stroke icons, currentColor so each slot tints correctly) ──
const svg = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};
/** Wrap a single SVG path string in a stroke icon. */
const icon = (d: string): ReactNode => (
  <svg {...svg}>
    <path d={d} />
  </svg>
);
const IconSpark = icon('M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18');
const IconTerminal = icon('m5 8 4 4-4 4M12 16h6');
const IconCheck = icon('M20 6 9 17l-5-5');
const IconAlert = icon('M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z');
// The failed-turn disc glyph: the alert family's error mark (an X). The disc renders
// INSET (task 2673, the banner's recessed form), so currentColor resolves to the INTENT
// ink (status-error), not the knockout canvas. Verbatim the Banner error grammar so the
// failed turn reads identically across the alert family.
const IconFailKnockout = <NockerlIcon path="m15 9-6 6M9 9l6 6" strokeWidth={2.6} />;
const IconBrain = icon('M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 3 4 2.5 2.5 0 0 0 3-2V5a1 1 0 0 0-1-1ZM15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-3 4 2.5 2.5 0 0 1-3-2V5a1 1 0 0 1 1-1Z');
const IconChevron = icon('m6 9 6 6 6-6');

/** A streaming "typing" indicator: three dots animating opacity (frozen under reduced-motion). */
function TypingIndicator() {
  return (
    <div className="nk-am-typing" role="status" aria-label="Assistant is responding">
      <span className="nk-am-typing__dot" aria-hidden="true" />
      <span className="nk-am-typing__dot" aria-hidden="true" />
      <span className="nk-am-typing__dot" aria-hidden="true" />
      <span className="nk-am-typing__lbl">Streaming…</span>
    </div>
  );
}

/** An inline tool-call panel block: a FILLED family-color disc/tile + name + status chip.
 *  No left rail: the family color rides in the disc (banner/callout language, Law 6). */
function ToolCallBlock({
  family,
  icon,
  name,
  status,
  elapsed,
}: {
  family: ToolFamily;
  icon: ReactNode;
  name: string;
  status: ToolStatus;
  elapsed?: string;
}) {
  const chipColor =
    status === 'error'
      ? 'var(--color-status-error)'
      : status === 'done'
        ? 'var(--color-status-success)'
        : 'var(--color-on-card-muted)';
  // The lifted nested card surface (cardSurface1 + hairline + panel radius + sheen) is the
  // shared <NockerlSurface variant="panel">; .nk-am-tool keeps only the layout + its flagged shadow.
  return (
    <NockerlSurface variant="panel" className="nk-am-tool" style={{ '--nk-am-fam': FAMILY_COLOR[family] } as CSSProperties}>
      <span className="nk-am-tool__tile" aria-hidden="true">{icon}</span>
      <span className="nk-am-tool__name">{name}</span>
      <span className="nk-am-chip" style={{ '--nk-am-chip': chipColor } as CSSProperties}>
        {status === 'done' && IconCheck}
        {status === 'error' && IconAlert}
        {status === 'running' && <span className="nk-am-chip__dot" aria-hidden="true" />}
        {elapsed && <span>{elapsed}</span>}
      </span>
    </NockerlSurface>
  );
}

/** A collapsible THINKING block: cyan wash (the single brand accent), keyboard-operable.
 *  The disclosure TRIGGER is the real NockerlButton primitive (ghost): it carries aria-expanded +
 *  aria-controls, the focus ring, and the press feedback; the muted brain glyph leads and a
 *  rotating chevron trails. The revealed body is a sibling accordion REGION below it whose
 *  reveal animates an interpolated grid-row track (0fr -> 1fr) + opacity (the canonical
 *  NockerlListItem accordion reveal), so it grows in HEIGHT only, wrapping within the capped bubble. */
function ThinkingBlock({ words, text }: { words: number; text: string }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <div className="nk-am-think">
      <NockerlButton
        variant="ghost"
        size="sm"
        fullWidth
        className="nk-am-think__trigger"
        text={`Thinking · ${words} words`}
        aria-expanded={open}
        aria-controls={bodyId}
        leadingIcon={<span className="nk-am-think__brain">{IconBrain}</span>}
        trailingIcon={
          <span className="nk-am-think__chev" data-open={open || undefined}>
            {IconChevron}
          </span>
        }
        onClick={() => setOpen((v) => !v)}
      />
      <div id={bodyId} role="region" hidden={!open} className="nk-am-think__body" data-open={open || undefined}>
        <div className="nk-am-think__body-inner">
          <div className="nk-am-think__body-content">{text}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * A single Nockerl chat message: the unit the spec documents. Owns the row's
 * horizontal alignment (assistant left / user right), an optional identity header
 * (avatar · model · timestamp), a lifted bubble with the speaker-facing tail
 * corner, the ordered body, and, for the assistant, a real Copy action.
 */
export function AgentMessage({
  role,
  model,
  timestamp,
  showHeader = true,
  streaming = false,
  error = false,
  onRetry,
  children,
}: AgentMessageProps) {
  const isUser = role === 'user';
  const bubbleRef = useRef<HTMLDivElement>(null);
  return (
    <div
      className={`nk-am-row nk-am-row--${role}`}
      style={{ '--nk-am-max': 'min(82%, 460px)' } as CSSProperties}
    >
      {showHeader && (model || timestamp) && (
        <div className="nk-am-head">
          {!isUser && (
            <span className="nk-am-head__avatar" aria-hidden="true">{IconSpark}</span>
          )}
          {!isUser && model && <span className="nk-am-head__model">{model}</span>}
          {timestamp && <span className="nk-am-head__time">{timestamp}</span>}
        </div>
      )}
      <div
        ref={bubbleRef}
        className={[
          'nk-am-bubble',
          `nk-am-bubble--${role}`,
          error ? 'nk-am-bubble--error' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
        {streaming && <TypingIndicator />}
        {error && onRetry && (
          <div className="nk-am-retry-wrap">
            <NockerlButton
              text="Retry"
              variant="ghost"
              size="sm"
              onClick={onRetry}
              leadingIcon={<NockerlIcon path="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" size="xs" />}
            />
          </div>
        )}
      </div>
      {!isUser && !error && (
        <div className="nk-am-actions">
          {/* the shared _CopyButton, which now copies the REAL message text
              (the old hand-roll only flipped its confirm state, writing nothing). */}
          <CopyButton text={() => bubbleRef.current?.innerText ?? ''} label="Copy message" copiedLabel="Copied" />
        </div>
      )}
    </div>
  );
}

// AgentMessage is a turn CONTAINER: `children` is the ordered body (markdown, tool panels, code).
// Composes NockerlSurface/NockerlButton/NockerlIconButton/NockerlIcon: the collapsible "Thinking" disclosure (ThinkingBlock)
// is the NockerlButton primitive (ghost, aria-expanded + aria-controls), the failed-turn Retry is NockerlButton
// (destructive), and the per-message Copy is the shared _CopyButton (composing NockerlIconButton). No raw facsimiles remain; no owns.
export const compose = {
  slots: { default: { accepts: '*' } },
} satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Agent message page: a faithful chat
 * thread on the chat ground covering: a default assistant turn (markdown + Copy),
 * a user turn for contrast, a rich assistant turn (inline tool-call panel + a code
 * block + a list + a collapsible thinking block), a live streaming turn (typing
 * dots), a continuation turn (header collapsed), a system divider, and a failed
 * turn (a filled red status disc + icon + text + a real Retry). Every action is keyboard-operable;
 * the streaming dots freeze under prefers-reduced-motion.
 */
export default function AgentMessageDemo() {
  const [retries, setRetries] = useState(0);

  return (
    <div className="nk-am-demo">
      <style>{STYLES}</style>

      <div className="nk-am-demo__group">
        <p className="nk-am-demo__lbl">A live thread: agent leads (left), user trails (right)</p>
        <div className="nk-am-stage" aria-label="Chat thread">
          <NockerlFacetedBackground bare aria-hidden="true" />
          <AgentMessage role="assistant" model="Large 2.1" timestamp="10:21 AM">
            <p>
              The Gateway routes every session through <code className="nk-am-inline">the credential store</code> for
              credentials. Want me to wire the retry/backoff next?
            </p>
          </AgentMessage>

          <AgentMessage role="user">
            <p>Yes. Exponential backoff, cap at 30s. Show me the diff first.</p>
          </AgentMessage>

          <AgentMessage role="assistant" model="Large 2.1" timestamp="10:23 AM">
            <p>
              On it. Reading <code className="nk-am-inline">SseClient.kt</code>, then patching the
              reconnect loop:
            </p>
            <ToolCallBlock family="shell-fs" icon={IconTerminal} name="Read SseClient.kt" status="done" elapsed="0.4s" />
            <p>Here&rsquo;s the backoff helper:</p>
            <div className="nk-am-code">
              <div className="nk-am-code__bar">
                <span className="nk-am-code__name">backoff.kt</span>
              </div>
              <pre>
{`fun nextDelay(attempt: Int): Long =
  minOf(`}<span className="tok-key">30_000</span>{`, `}<span className="tok-key">1_000</span>{` shl attempt)
    .plus(Random.nextLong(`}<span className="tok-key">250</span>{`))`}
              </pre>
            </div>
            <ul className="nk-am-list">
              <li>Backoff is <strong>1s &rarr; 30s</strong> with jitter.</li>
              <li>Replays from <code className="nk-am-inline">lastSeq</code> on reconnect.</li>
            </ul>
            <ThinkingBlock
              words={42}
              text="Capping at 30s avoids hammering the gateway during an outage; jitter spreads reconnects so a fleet of tabs doesn't stampede the same second."
            />
          </AgentMessage>

          <AgentMessage role="assistant" model="Large 2.1" timestamp="10:23 AM" showHeader={false} streaming>
            <p>Applying the patch and re-running the SSE tests</p>
          </AgentMessage>
        </div>
      </div>

      <div className="nk-am-demo__group">
        <p className="nk-am-demo__lbl">System divider + a failed turn (status is warm + icon + text, never color alone)</p>
        <div className="nk-am-stage">
          <NockerlFacetedBackground bare aria-hidden="true" />
          <div className="nk-am-sys" role="separator" aria-label="Context compacted">
            <span className="nk-am-sys__line" aria-hidden="true" />
            <span className="nk-am-sys__txt">Context compacted</span>
            <span className="nk-am-sys__line" aria-hidden="true" />
          </div>

          <AgentMessage role="assistant" model="Local · Qwen3 Coder" timestamp="10:25 AM">
            <p>Reconnected. The stream is healthy again.</p>
            <ToolCallBlock family="agent" icon={IconTerminal} name="Bash ./gradlew test" status="running" elapsed="6s" />
          </AgentMessage>

          <AgentMessage
            role="assistant"
            model="Large 2.1"
            timestamp="10:26 AM"
            error
            onRetry={() => setRetries((c) => c + 1)}
          >
            <div className="nk-am-fail">
              <NockerlStatusDisc intent="error" inset>{IconFailKnockout}</NockerlStatusDisc>
              <span className="nk-am-fail__txt">
                <b>Stream failed</b>. The gateway closed the connection after 3 retries.
              </span>
            </div>
          </AgentMessage>
        </div>
        <p className="nk-am-demo__count">
          Retry fired <b>{retries}</b> {retries === 1 ? 'time' : 'times'} · tab to Copy / Thinking / Retry. The island is live.
        </p>
      </div>
    </div>
  );
}
