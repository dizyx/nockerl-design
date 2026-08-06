/**
 * _AssistantMessage: the SHARED assistant-message chrome for the docs demos.
 *
 * Site-local (leading underscore → NOT a catalog component; the compose-graph / props
 * gates skip it). It owns the REAL `.nk-am-*` chat chrome: the chat GROUND
 * (`.nk-am-stage`), the identity header (`.nk-am-head`: spark avatar · model · time),
 * and the lifted assistant BUBBLE (`.nk-am-bubble--assistant`: the soft plane with the
 * speaker-facing tail corner + the top catch-light), plus the full `.nk-am-*` STYLES
 * sheet (`AM_STYLES`). It is the single home of that markup + recipe.
 *
 * Consumed by BOTH demos so neither hand-rolls the assistant context:
 *   • AgentMessageDemo imports `AM_STYLES` (its own `AgentMessage` renders the identical
 *     `.nk-am-*` classes; the CSS now lives here, one source of truth, no visual change).
 *   • ToolCallCardDemo wraps its tool-card stacks in <AssistantMessage> so the cards sit
 *     INSIDE a genuine assistant bubble on the chat ground, replacing the old hand-rolled
 *     `.nk-tc-stage` dark background.
 *
 * Laws it carries verbatim: DEPTH = neutral tinted shadow + a top catch-light (never a
 * glow / colored shadow), so the bubble LIFTS off the darker chat ground; --radius-bubble
 * with ONE tail corner (--radius-bubble-tail) toward the speaker (assistant = top-left);
 * every color / font / radius / spacing / size is a var(--token) (the dark stage resolves
 * them to the dark palette). Literals remain only for pure geometry (avatar/glyph sizes,
 * shadow blur, the bubble width cap, which mirrors the Compose `bubbleMaxWidth` Dp).
 */
import type { CSSProperties, ReactNode } from 'react';
import { NockerlFacetedBackground } from '@dizyx/nockerl-react';

// The full `.nk-am-*` chrome sheet, VERBATIM the recipe AgentMessage documents, so both
// the agent-message island and the tool-call-card island render one identical chat chrome.
// The dark stage resolves the tokens to the dark palette; the bubble carries the depth
// (lit-from-above: tinted shadow + top catch-light) and the tightened tail corner points
// at the speaker. Fills never swap on interaction.
export const AM_STYLES = `
.nk-am-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
/* the chat GROUND: darkest layer; bubbles lift off it. The ground IS the
   real FacetedBackground primitive (bare, clipped to the rounded stage); --color-chat-bg
   stays as the paint-behind fallback, and every non-facet child layers above. */
.nk-am-stage { position: relative; overflow: hidden;
  background: var(--color-chat-bg); border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card); padding: var(--space-5) var(--space-4);
  display: flex; flex-direction: column; gap: var(--space-4);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-am-stage > :not(.nk-fb-surface) { position: relative; }
/* one chat ROW: owns horizontal alignment of the whole turn */
.nk-am-row { display: flex; flex-direction: column; max-width: 100%; }
.nk-am-row--assistant { align-items: flex-start; }
.nk-am-row--user { align-items: flex-end; }
/* identity header: model · timestamp, on the canvas (muted) */
.nk-am-head { display: flex; align-items: center; gap: var(--space-2);
  padding: 0 var(--space-2); margin-bottom: var(--space-1); }
.nk-am-head__avatar { width: 20px; height: 20px; border-radius: var(--radius-pill);
  display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto;
  background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary));
  color: var(--color-on-accent); box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-am-head__avatar svg { display: block; width: 12px; height: 12px; }
.nk-am-head__model { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-canvas-muted); }
.nk-am-head__time { font-size: var(--font-size-10); color: var(--color-on-canvas-muted); opacity: .6; }
/* the BUBBLE: lifted plane, tail corner toward the speaker (width-capped like the phone bubble cap) */
.nk-am-bubble { position: relative; max-width: var(--nk-am-max); padding: var(--space-3);
  border: var(--space-px) solid transparent;
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }   /* catch-light, NOT a glow */
/* assistant: the soft lifted plane, tail top-left */
.nk-am-bubble--assistant { background: linear-gradient(180deg, color-mix(in srgb, var(--color-card-alt), var(--color-surface-highlight) 60%), var(--color-card-alt)); color: var(--color-on-card-alt);
  border-color: var(--color-alt-hairline);
  border-radius: var(--radius-bubble-tail) var(--radius-bubble) var(--radius-bubble) var(--radius-bubble); }
/* user: the cyan jewel card (gradient), tail top-right, no border */
.nk-am-bubble--user { background: linear-gradient(180deg, var(--color-user-card2), var(--color-user-card));
  color: var(--color-on-user-card);
  border-color: color-mix(in srgb, var(--color-user-card) 72%, var(--color-shadow-tint));   /* seat the bottom edge so the gradient's end stop doesn't read as an off-color 1px line */
  border-radius: var(--radius-bubble) var(--radius-bubble-tail) var(--radius-bubble) var(--radius-bubble); }
/* failed turn: the BANNER INLINE-ALERT grammar (SUPERSEDES the earlier
   recessed well for chat failures): a SOLID neutral card surface, the intent only WHISPERED
   into the border (the banner's 22% mix), LIFTED with the banner's neutral shadow + top
   catch-light. Never a red fill, never a bare inset well. Red rides only in the leading
   INSET error disc + the whisper border; severity is never color-alone, never a rail. */
.nk-am-bubble--error { background: var(--color-card-surface1);
  border-color: color-mix(in srgb, var(--color-status-error) 22%, var(--color-card-hairline));
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* body typography: markdown text on the assistant plane */
.nk-am-bubble p { margin: 0; font-size: var(--font-size-14); line-height: var(--font-line-height-20); }
.nk-am-bubble p + p { margin-top: var(--space-2); }
.nk-am-bubble strong { font-weight: var(--font-weight-semibold); }
.nk-am-bubble code.nk-am-inline { font-family: var(--font-family-mono); font-size: var(--font-size-12);
  background: color-mix(in srgb, var(--color-on-card-alt) 8%, transparent);
  border-radius: var(--radius-track); padding: var(--space-0-5) var(--space-1); }
/* markdown list */
.nk-am-list { margin: var(--space-2) 0 0; padding-left: var(--space-5);
  font-size: var(--font-size-14); line-height: var(--font-line-height-20); }
.nk-am-list li + li { margin-top: var(--space-0-5); }
.nk-am-list li::marker { color: var(--color-accent-primary); }
/* code block: a recessed well on the lifted bubble (fields sink) */
.nk-am-code { margin-top: var(--space-2); background: var(--color-card-surface2);
  border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-panel);
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 30%, transparent); overflow: hidden; }
.nk-am-code__bar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2);
  background: var(--color-card-surface3); border-bottom: var(--space-px) solid var(--color-card-hairline); }
.nk-am-code__name { font-family: var(--font-family-mono); font-size: var(--font-size-10); color: var(--color-on-card-muted);
  flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nk-am-code pre { margin: 0; padding: var(--space-2); overflow-x: auto; font-family: var(--font-family-mono);
  font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card); }
.nk-am-code .tok-key { color: var(--color-accent-secondary); }
.nk-am-code .tok-str { color: var(--color-status-success); }
/* inline tool-call panel: a lifted nested card; NO left rail. The family color rides in
   the FILLED leading disc/tile (banner/callout language), never a vertical stripe (Law 6).
   The surface recipe (cardSurface1 fill + hairline + panel radius + sheen) comes from
   <NockerlSurface variant="panel">; only the layout + the kept own-shadow live here. */
.nk-am-tool { display: flex; align-items: center; gap: var(--space-2);
  margin-top: var(--space-2); padding: var(--space-2); overflow: hidden;
  box-shadow: 0 var(--space-0-5) var(--elevation-level1) -3px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent), var(--nk-surface-sheen); }
/* the FILLED family-color disc: color rides here, with a dark knockout glyph (theme-stable
   core-black reads on every bright family hue, light + dark). Lift = tiny drop + catch-light. */
.nk-am-tool__tile { width: 26px; height: 26px; flex: 0 0 auto; border-radius: var(--radius-panel);
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--nk-am-fam); color: var(--color-core-black);
  box-shadow: 0 var(--space-px) var(--elevation-level1) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent),
              inset 0 var(--space-px) 0 color-mix(in srgb, var(--color-core-white) 28%, transparent); }
.nk-am-tool__tile svg { display: block; width: 15px; height: 15px; }
.nk-am-tool__name { font-family: var(--font-family-mono); font-size: var(--font-size-12);
  font-weight: var(--font-weight-semibold); color: var(--color-on-card);
  flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* tool status chip: warm status tokens (success/error) or a neutral running dot */
.nk-am-chip { display: inline-flex; align-items: center; gap: var(--space-1); flex: 0 0 auto;
  border-radius: var(--radius-panel); padding: var(--space-0-5) var(--space-2);
  font-size: var(--font-size-10); font-weight: var(--font-weight-medium);
  background: color-mix(in srgb, var(--nk-am-chip) 14%, transparent); color: var(--nk-am-chip); }
.nk-am-chip svg { display: block; width: 12px; height: 12px; }
.nk-am-chip__dot { width: 6px; height: 6px; border-radius: var(--radius-pill); background: var(--nk-am-chip); }
/* collapsible THINKING block: a subtle WARM-accent panel. Thinking is a "special notice"
   (law §10: accent.warm = the rare warm hue), so it reads distinct from tool calls (their own tiles)
   and from cyan brand chrome. The trigger is a LEFT-aligned clickable row (icon far-left + colored,
   sentence case, never centered / all-caps), toward the ToolCallCard accordion structure. It stays
   the ghost NockerlButton primitive (owns cursor / focus ring / press), so this wrapper is inert.
   min-width:0 lets the panel shrink INSIDE the width-capped bubble; the reveal grows in HEIGHT. */
.nk-am-think { width: 100%; min-width: 0; margin-top: var(--space-2);
  background: color-mix(in srgb, var(--color-accent-warm) 8%, var(--color-card-alt));
  border: var(--space-px) solid color-mix(in srgb, var(--color-accent-warm) 22%, var(--color-card-hairline));
  border-radius: var(--radius-panel); padding: var(--space-1) var(--space-2); }
/* the disclosure trigger reads as an accordion ROW: content left-packed, chevron pushed to the far
   right, and NOT uppercased (the ghost button's default caps + centering are overridden here only). */
.nk-am-think__trigger.nk-btn { text-transform: none; justify-content: flex-start; }
.nk-am-think__trigger .nk-btn__icon:has(.nk-am-think__chev) { margin-left: auto; }
/* the leading BRAIN glyph now sits in a FILLED WARM TILE, the same family-tile idiom as
   the ToolCallCard icon (law §6: color lives in a filled tile, never bare / never a rail): a solid
   accent-warm control-radius square with the glyph KNOCKED OUT to the canvas ink + a catch-light /
   drop, so the thinking header reads as one clean card like the tool-call cards, just warm-hued. */
.nk-am-think__brain { width: 24px; height: 24px; flex: 0 0 auto; border-radius: var(--radius-control);
  margin-right: var(--space-1);   /* one token step so "Thinking" clears the tile */
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-accent-warm); color: var(--color-canvas);
  box-shadow: 0 var(--space-px) var(--elevation-level1) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent),
              inset 0 var(--space-px) 0 color-mix(in srgb, var(--color-core-white) 28%, transparent); }
.nk-am-think__brain svg { display: block; width: 15px; height: 15px; }
/* the trailing chevron rotates on expand (transform, an interpolatable prop, not a swap),
   matching the accordion / NockerlListItem disclosure (down at rest, up when open). It shares the
   brain's muted secondary ink so the whole affordance chrome reads as one quiet tone. */
.nk-am-think__chev { display: inline-flex; align-items: center; justify-content: center;
  color: var(--color-on-card-muted); transition: transform .2s cubic-bezier(.2,0,0,1); }
.nk-am-think__chev svg { display: block; width: var(--icon-sm); height: var(--icon-sm); }
.nk-am-think__chev[data-open] { transform: rotate(180deg); }
/* the revealed body is an ACCORDION region: the reveal animates INTERPOLATED props only,
   a grid row track (0fr collapsed -> 1fr expanded) plus opacity. Never a display swap, never
   a fill swap. Verbatim the canonical NockerlListItem .nk-li__body reveal. */
.nk-am-think__body { display: grid; grid-template-rows: 0fr; opacity: 0;
  transition: grid-template-rows .24s cubic-bezier(.2,0,0,1), opacity .18s; }
.nk-am-think__body[data-open] { grid-template-rows: 1fr; opacity: 1; }
/* the inner CLIP: overflow hides the body until the track opens; min-height:0 lets the
   0fr track actually collapse the grid child. WIDTH STABILITY: width:0 makes this box
   request ZERO preferred (max-content) width, so the revealed thinking text can NEVER
   drive the shrink-to-fit bubble wider; min-width:100% then fills whatever width the
   bubble already has, and overflow-wrap lets a long unbroken line wrap within it. The
   reveal therefore grows in HEIGHT only; the bubble width is identical open or closed. */
.nk-am-think__body-inner { overflow: hidden; min-height: 0; width: 0; min-width: 100%; overflow-wrap: anywhere; }
.nk-am-think__body-content { margin-top: var(--space-2); font-size: var(--font-size-12);
  line-height: var(--font-line-height-16); color: color-mix(in srgb, var(--color-on-card-alt) 85%, transparent); }
/* streaming "typing": three dots animating OPACITY (interpolatable), not a fill */
.nk-am-typing { display: inline-flex; align-items: center; gap: var(--space-1); padding: var(--space-1) 0; }
.nk-am-typing__dot { width: 7px; height: 7px; border-radius: var(--radius-pill);
  background: var(--color-dot-streaming); animation: nk-am-pulse 1s ease-in-out infinite; }
.nk-am-typing__dot:nth-child(2) { animation-delay: .15s; }
.nk-am-typing__dot:nth-child(3) { animation-delay: .3s; }
.nk-am-typing__lbl { font-size: var(--font-size-12);
  color: color-mix(in srgb, var(--color-dot-streaming) 85%, transparent); margin-left: var(--space-1); }
@keyframes nk-am-pulse { 0%,100% { opacity: 1; transform: translateY(0); } 50% { opacity: .3; transform: translateY(1px); } }
/* failed-turn footer: the shared NockerlStatusDisc rendered INSET (the banner's
   recessed disc form: intent color in the glyph + soft wash + whisper border), leading a
   title-weight line. One failure grammar with Banner + the ChatBubble failed bubble; the
   disc recipe is owned in the primitive. */
.nk-am-fail { display: flex; align-items: flex-start; gap: var(--space-2); }
.nk-am-fail__txt { font-size: var(--font-size-14); line-height: var(--font-line-height-20); color: var(--color-on-card-muted); }
.nk-am-fail__txt b { color: var(--color-status-error); font-weight: var(--font-weight-semibold); }
/* the failed-turn Retry is the destructive <NockerlButton> primitive (outline red); this wrapper
   only carries the spacing that separated it from the failure text above. */
.nk-am-retry-wrap { margin-top: var(--space-3); }
/* per-message action: copy (assistant only), the shared _CopyButton (which composes the plain
   NockerlIconButton; one glyph pair + the standard on-accent confirmation, ~2s), sitting on the
   chat CANVAS below the bubble. This row only lays it out. */
.nk-am-actions { display: flex; gap: var(--space-1); padding: var(--space-1) var(--space-2) 0; }
/* system divider: centered, warm-toned (status, not cyan) */
.nk-am-sys { display: flex; align-items: center; gap: var(--space-3); }
.nk-am-sys__line { flex: 1 1 auto; height: var(--space-px); background: color-mix(in srgb, var(--color-status-warning) 30%, transparent); }
.nk-am-sys__txt { font-size: var(--font-size-10); font-weight: var(--font-weight-medium); color: var(--color-status-warning);
  letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; }
@media (prefers-reduced-motion: reduce) {
  .nk-am-typing__dot { animation: none; opacity: .7; }
  .nk-am-think__chev, .nk-am-think__body { transition: none; }
}
.nk-am-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-am-demo__group + .nk-am-demo__group { margin-top: var(--space-6); }
.nk-am-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-am-demo__count b { color: var(--color-accent-primary); }
`;

// The spark avatar glyph, the assistant's mark in the identity header. A filled star cut
// with currentColor (the avatar tile sets --color-on-accent), matching the agent-message
// island's avatar so the two chat contexts read as one system.
const IconSpark = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </svg>
);

export interface AssistantMessageProps {
  /** Identity header: resolved model name (e.g. "Large 2.1"). Hidden when absent. */
  model?: string;
  /** Identity header: short timestamp (e.g. "10:23 AM"). */
  time?: string;
  /**
   * Widen the bubble cap for WIDE content (tool-call cards run wider than a chat sentence).
   * Default false → the phone-width cap min(82%, 460px); true → a roomier token-composed cap
   * so the cards sit cleanly inside the bubble without clipping or overflow.
   */
  wide?: boolean;
  /** The assistant-visible label under the header (defaults to "Chat thread"). */
  ariaLabel?: string;
  /** The bubble body: markdown, tool cards, code, etc. */
  children?: ReactNode;
}

/**
 * A real Nockerl ASSISTANT message: the chat GROUND + identity header + the lifted
 * assistant bubble (soft plane, tail top-left, top catch-light), rendered from the exact
 * `.nk-am-*` recipe AgentMessage documents. Callers must mount <style>{AM_STYLES}</style>
 * once on the page (both consuming demos already do). Composes NO facsimile controls. It
 * is pure chat chrome; interactive affordances (copy, retry, thinking) live in the body.
 */
export function AssistantMessage({ model, time, wide = false, ariaLabel = 'Chat thread', children }: AssistantMessageProps) {
  // The width cap rides an inline var (like the agent-message island's --nk-am-max) so the
  // bubble stays token/geometry-driven. Wide = a roomier cap composed from the size tokens
  // so a 560-wide tool card fits with the bubble's own padding, never clipped or overflowing.
  const maxWidth = wide
    ? 'min(100%, calc(var(--size-container-lg) + var(--size-container-md)))'
    : 'min(82%, var(--size-chat-bubble-max))';
  return (
    <div className="nk-am-stage" aria-label={ariaLabel}>
      {/* the REAL faceted chat ground: the one unified primitive */}
      <NockerlFacetedBackground bare aria-hidden="true" />
      <div className="nk-am-row nk-am-row--assistant" style={{ '--nk-am-max': maxWidth } as CSSProperties}>
        {(model || time) && (
          <div className="nk-am-head">
            <span className="nk-am-head__avatar" aria-hidden="true">{IconSpark}</span>
            {model && <span className="nk-am-head__model">{model}</span>}
            {time && <span className="nk-am-head__time">{time}</span>}
          </div>
        )}
        <div className="nk-am-bubble nk-am-bubble--assistant">{children}</div>
      </div>
    </div>
  );
}
