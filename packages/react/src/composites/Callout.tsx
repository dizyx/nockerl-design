/**
 * NockerlCallout: the Tier-3 EDITORIAL callout, the in-content emphasis aside.
 *
 * The prose-embedded sibling of the alert family. Where NockerlToast is transient and
 * NockerlBanner is a persistent page-level notice, a callout is set INSIDE the copy it
 * annotates: a SOLID recessed well on the canvas-alt ground with a neutral inner top
 * shadow, never a lifted card and never an outer drop shadow.
 *
 * Design laws encoded here (do not re-derive in a consumer):
 *   - Law 6: severity rides a filled status DISC at the leading edge. There is no left
 *     rail, no vertical stripe and no tinted-background wash. The border carries at most a
 *     whisper of the tone.
 *   - Law 6, the emphasis case: the `important` tone wears NESTED HAIRLINE FRAMES,
 *     concentric borders stepping inward with falling opacity, the dimensional
 *     box-in-a-box the law names.
 *   - Law 10: warm tones are status only. Cyan is the ONE editorial-emphasis tone
 *     (`important`); `note` and `quote` stay neutral on-card ink and never take cyan.
 *   - Law 1: depth is the recess plus a neutral inner shade. No glow, no colored shadow.
 *
 * Intent colors are single-sourced from ALERT_INTENT so Banner, Toast and Callout cannot
 * drift. TOKEN-REACTIVE: every color, radius, space and type size is a var(--token); the
 * tone rides in on the --co-c custom property. No backticks in STYLES.
 */

import { ALERT_INTENT } from '../alertIntents.js';
import { NockerlIcon } from '../primitives/Icon.js';
import { NockerlStatusDisc } from '../primitives/StatusDisc.js';
import type { ReactNode } from 'react';
import type { AlertIntent } from '../alertIntents.js';
import type { ComposeContract } from '../compose-contract.js';

export type NockerlCalloutTone = 'note' | 'tip' | 'important' | 'warning' | 'caution' | 'notice' | 'quote';

export interface NockerlCalloutProps {
  /**
   * Rich body content (the prose). Accepts a small, trusted HTML string so a
   * callout can carry a link + inline `code` + emphasis like real body copy.
   */
  children: string;
  /** Editorial tone. Drives the disc/frame color, the default eyebrow, the icon. */
  tone?: NockerlCalloutTone;
  /** Optional eyebrow override (an uppercase lead label). Defaults per tone. */
  title?: string;
  /** Show the leading disc. Defaults on; `quote` is disc-less (a quote mark instead). */
  icon?: boolean;
}

// Each tone maps to ONE color: warm status tokens for tip/warning/caution, the
// brand cyan for the single editorial-emphasis tone (`important`), and on-card for
// the quiet `note` / `quote`. Keeps cyan to ONE editorial use.
//
// SINGLE-SOURCED: the EDITORIAL tones that correspond to an alert severity pull
// their color from ALERT_INTENT (the one alert-family map) so Banner / Toast /
// Callout cannot drift; the tone NAMES + the rendered colors are unchanged:
//   tip → success · important → info (== --color-accent-primary, the editorial
//   cyan, token-identical) · warning → warning · caution → error.
// `note` and `quote` are the QUIET asides that stay on-card (NEVER cyan, per the
// header law); they have no status peer, so they are kept local on purpose (NOT
// sourced from ALERT_INTENT.info, which would turn them cyan and change the look).
const TONE_COLOR: Record<NockerlCalloutTone, string> = {
  note: 'var(--color-on-card)', // quiet, never cyan; no status peer, kept local
  tip: ALERT_INTENT.success.color,
  important: ALERT_INTENT.info.color, // the one editorial cyan (== --color-accent-primary)
  warning: ALERT_INTENT.warning.color,
  caution: ALERT_INTENT.error.color,
  notice: ALERT_INTENT.notice.color, // the rare warm orange accent for a special notice
  quote: 'var(--color-on-card)', // quiet italic prose, no status; kept local
};

// Callout's editorial tone names → the shared AlertIntent the NockerlStatusDisc coin binds.
// Callout names the destructive tone `caution` and the cyan one `important`; the shared
// map names them `error` / `info` (same tokens). `note` has NO shared-map peer (it stays
// on-card, never cyan), so its disc takes a raw `color` override instead (the one disc
// tone that isn't single-sourced). `quote` renders a quote mark, not a disc (no entry).
const DISC_INTENT: Record<Exclude<NockerlCalloutTone, 'note' | 'quote'>, AlertIntent> = {
  tip: 'success',
  important: 'info', // the one editorial cyan (== --color-accent-primary)
  warning: 'warning',
  caution: 'error', // callout `caution` == shared `error`
  notice: 'notice',
};

// The default eyebrow per tone (overridable via `title`).
const TONE_LABEL: Record<NockerlCalloutTone, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
  notice: 'Notice',
  quote: 'Quote',
};

// Whether the eyebrow takes the tone color (status/important) or stays muted
// (note/quote read as quiet body asides, not signals).
const TONE_LABEL_COLORED: Record<NockerlCalloutTone, boolean> = {
  note: false,
  tip: true,
  important: true,
  warning: true,
  caution: true,
  notice: true, // the warm orange accent reads as a signal, so the eyebrow is colored
  quote: false,
};

// A RECESSED, content-embedded aside. The depth law inverted: this SINKS into the
// page (a darker inset well + an INNER top shadow), the opposite of the banner's
// lifted card. NORMAL tones carry color in the family DISC; `important` instead
// gets NESTED HAIRLINE FRAMES. The tone rides in on --co-c (token-reactive).
export const NOCKERL_CALLOUT_STYLES = `
/* The callout: a SOLID recessed well embedded in the prose (NOT a lifted card).
   The canvas-alt ground + a NEUTRAL inner top shadow (the catch-light, inverted).
   Never an outer drop shadow, never a glow, never a status wash. */
.nk-co {
  position: relative;
  display: flex;
  align-items: flex-start;             /* disc TOP-aligns to the first text line */
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-panel);
  background: var(--color-canvas-alt);
  /* the border carries only a WHISPER of the tone (state hint), not a tint wash. */
  border: var(--space-px) solid color-mix(in srgb, var(--co-c) 18%, var(--color-card-hairline));
  color: var(--color-on-card);
  /* depth = a NEUTRAL INNER top shadow (recessed well). No outer/colored shadow. */
  box-shadow: inset 0 var(--space-px) var(--elevation-level1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent);
}

/* THE SIGNATURE, a filled tone DISC (the lit tone coin + knockout glyph), now lives
   in the NockerlStatusDisc primitive (.nk-disc), which the alert family shares. Callout
   renders <NockerlStatusDisc> and passes the first-line-box centring nudge (its own value,
   one half-step tighter than the banner's); the coin recipe (fill / radius / lift /
   knockout ink) is owned there, single-sourced. */

/* body column: eyebrow (uppercase, tracked) over the rich prose. */
.nk-co__body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.nk-co__eyebrow { font-size: var(--font-size-12); font-weight: var(--font-weight-semibold);
  letter-spacing: var(--font-tracking-tight); text-transform: uppercase; line-height: var(--font-line-height-16); }
.nk-co__eyebrow--colored { color: var(--co-c); }
.nk-co__eyebrow--muted { color: var(--color-on-card-muted); }

/* the rich prose is real body copy: paragraphs, a link, inline code, emphasis. */
.nk-co__prose { color: var(--color-on-card); font-size: var(--font-size-14); line-height: var(--font-line-height-20); }
.nk-co__prose p { margin: 0; }
.nk-co__prose p + p { margin-top: var(--space-2); }
.nk-co__prose strong { font-weight: var(--font-weight-semibold); color: var(--color-on-card); }
/* inline code: the quiet body-text tint wash (verbatim the markdown inline-code
   treatment), so the callout reads as embedded prose, not a control. */
.nk-co__prose code {
  font-family: var(--font-family-mono); font-size: var(--font-size-12);
  background: color-mix(in srgb, var(--color-on-card) 10%, transparent);
  color: var(--color-on-card); padding: var(--space-0-5) var(--space-1);
  border-radius: var(--radius-track);
}
/* links: the tone color, underlined; hover/focus animate interpolatable props
   only (color/opacity/underline-offset), never a fill swap. Keyboard-focusable. */
.nk-co__prose a {
  color: var(--co-c); font-weight: var(--font-weight-medium);
  text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--co-c) 45%, transparent);
  text-underline-offset: var(--space-0-5); border-radius: var(--radius-track);
  transition: text-decoration-color .12s, opacity .12s;
}
.nk-co__prose a:hover { text-decoration-color: var(--co-c); }
.nk-co__prose a:active { opacity: .8; }
.nk-co__prose a:focus-visible { outline: var(--space-0-5) solid var(--co-c); outline-offset: var(--space-0-5); text-decoration-color: var(--co-c); }

/* the QUOTE tone is a pull-quote / blockquote: italic prose, a leading quote glyph
   in place of the disc, the quietest treatment (echoes the app's italic + muted
   reasoning aside). Still recessed, but text leans editorial. */
.nk-co--quote .nk-co__prose { font-style: italic; color: var(--color-on-card-muted); }
.nk-co--quote .nk-co__quotemark { flex: 0 0 auto; color: color-mix(in srgb, var(--co-c) 45%, transparent);
  font-family: var(--font-family-sans); font-weight: var(--font-weight-bold); font-size: var(--font-size-36);
  line-height: var(--font-line-height-20); height: var(--font-line-height-20); display: inline-flex; align-items: center; }
/* a quote can attribute a source with a small, muted, non-italic cite line. */
.nk-co__cite { font-size: var(--font-size-12); color: var(--color-on-card-muted); font-style: normal; }

/* ─── THE EMPHASISED VARIANT: NESTED HAIRLINE FRAMES (important only) ─── */
/* A box-within-a-box: the wrapper draws the OUTER frame, two pseudo-elements draw
   two inner concentric frames stepping inward with FALLING opacity + small inset
   gaps, for real dimensional depth. The callout inside keeps its disc. NOT a left
   rail: these are full concentric rectangles. The frame width + step are tokens. */
.nk-co-frame { position: relative; border-radius: var(--radius-card); padding: var(--space-2);
  /* outer frame: the strongest tone hairline. */
  border: var(--space-px) solid color-mix(in srgb, var(--co-c) 55%, transparent);
  /* a faint neutral catch-light on the outer frame so the stack reads dimensional. */
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
/* inner frame 1: a TIGHT 2px step in (a subtle doubling, not a wide moat), opacity falls.
   Radius nests to the outer per the radius law (outer radius − inset). */
.nk-co-frame::before { content: ""; position: absolute; inset: var(--space-0-5);
  border-radius: calc(var(--radius-card) - var(--space-0-5)); pointer-events: none;
  border: var(--space-px) solid color-mix(in srgb, var(--co-c) 32%, transparent); }
/* inner frame 2: another 2px step in (deepest layer, opacity falls further). */
.nk-co-frame::after { content: ""; position: absolute; inset: var(--space-1);
  border-radius: calc(var(--radius-card) - var(--space-1)); pointer-events: none;
  border: var(--space-px) solid color-mix(in srgb, var(--co-c) 16%, transparent); }
/* inside the frame stack the callout sits on the lifted card surface (it reads as
   the innermost solid panel of the nested box) with no extra border of its own. */
.nk-co-frame .nk-co { border-radius: var(--radius-control); border-color: transparent;
  background: var(--color-card-surface1); box-shadow: none; }

@media (prefers-reduced-motion: reduce) {
  .nk-co__prose a { transition: none; }
}
`;
const ICONS: Record<Exclude<NockerlCalloutTone, 'quote'>, ReactNode> = {
  // note: an info mark (a quiet editorial note)
  note: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 6.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm-1.05 4.3a1.05 1.05 0 0 1 2.1 0v6a1.05 1.05 0 0 1-2.1 0Z" />
    </svg>
  ),
  // tip: a checkmark (a confirmed, do-this suggestion; echoes the success mark)
  tip: <NockerlIcon path="m7.5 12.4 3 3 6-6.8" strokeWidth={2.6} />,
  // important: a star (brand editorial emphasis; the one cyan tone)
  important: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 4.2 13.9 9l5.1.4-3.9 3.3 1.2 5L12 15.2 7.7 17.7l1.2-5L5 9.4 10.1 9Z" />
    </svg>
  ),
  // warning: an exclamation (a heads-up; echoes the family warning mark)
  warning: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10.95 7.2a1.05 1.05 0 0 1 2.1 0v5.4a1.05 1.05 0 0 1-2.1 0Zm1.05 8.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
    </svg>
  ),
  // caution: an X (a stop / do-not; echoes the family error mark)
  caution: <NockerlIcon path="m15 9-6 6M9 9l6 6" strokeWidth={2.6} />,
  // notice: a four-point spark/sparkle (a special, featured heads-up), knocked out
  // of the warm orange disc. The same notice mark as the banner/toast family.
  notice: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 4.5c.35 2.1.9 3.4 1.75 4.25C14.6 9.6 15.9 10.15 18 10.5c-2.1.35-3.4.9-4.25 1.75-.85.85-1.4 2.15-1.75 4.25-.35-2.1-.9-3.4-1.75-4.25C9.4 11.4 8.1 10.85 6 10.5c2.1-.35 3.4-.9 4.25-1.75C11.1 7.9 11.65 6.6 12 4.5Z" />
    </svg>
  ),
};

/**
 * A single Nockerl callout, the unit the spec documents. NORMAL tones lead with
 * the family DISC (a filled tone circle, glyph knocked out); the `important` tone
 * is wrapped in NESTED HAIRLINE FRAMES (the reserved emphasis). An uppercase
 * eyebrow + a rich prose body (links + inline code). Recessed into the page (an
 * inset well), NOT a lifted card. It reads as part of the body content.
 */

export function NockerlCallout({ children, tone = 'note', title, icon = true }: NockerlCalloutProps) {
  const isQuote = tone === 'quote';
  const isImportant = tone === 'important';
  const eyebrow = title ?? TONE_LABEL[tone];
  const colored = TONE_LABEL_COLORED[tone];

  const card = (
    <div
      role="note"
      className={['nk-co', isQuote ? 'nk-co--quote' : ''].filter(Boolean).join(' ')}
      style={{ ['--co-c' as string]: TONE_COLOR[tone] }}
    >
      {isQuote ? (
        <span className="nk-co__quotemark" aria-hidden="true">
          &ldquo;
        </span>
      ) : (
        icon && (
          <NockerlStatusDisc
            // `note` has no shared-map peer → raw color override (on-card, never cyan);
            // the rest bind the shared ALERT_INTENT via the mapped AlertIntent. Either
            // path resolves to the same --co-c token, so the coin is pixel-identical.
            intent={tone === 'note' ? 'info' : DISC_INTENT[tone]}
            {...(tone === 'note' ? { color: TONE_COLOR.note } : {})}
            // the first-line-box centring nudge Callout's disc always carried (one
            // half-step tighter than the banner's, kept verbatim).
            lineNudge="calc((var(--font-line-height-20) - var(--space-6)) / 2 - var(--space-0-5))"
          >
            {ICONS[tone]}
          </NockerlStatusDisc>
        )
      )}
      <div className="nk-co__body">
        <span
          className={[
            'nk-co__eyebrow',
            colored ? 'nk-co__eyebrow--colored' : 'nk-co__eyebrow--muted',
          ].join(' ')}
        >
          {eyebrow}
        </span>
        <div className="nk-co__prose" dangerouslySetInnerHTML={{ __html: children }} />
      </div>
      {/* Recipe CSS injected as the LAST child; identical injected blocks dedupe in effect. */}
      <style>{NOCKERL_CALLOUT_STYLES}</style>
    </div>
  );

  // The emphasised tone gets the nested-frame stack; everything else is the bare
  // recessed card. The frame carries the same --co-c so the concentric hairlines
  // step the tone color inward (token-reactive).
  if (isImportant) {
    return (
      <div className="nk-co-frame" style={{ ['--co-c' as string]: TONE_COLOR[tone] }}>
        {card}
      </div>
    );
  }
  return card;
}

// LEAF (describes the Callout). Composes NockerlStatusDisc + NockerlIcon internally. `children` is a trusted
// HTML STRING (rendered via dangerouslySetInnerHTML), not JSX children holding components, so it
// is not a modeled slot; `title` is plain text, `icon` a boolean. No owns: its own JSX renders
// no facsimile (any <a>/<code> live inside the runtime HTML string, which the census doesn't read;
// role="note" on a div is connective). FLAG: composite with no slots, modeled leaf.
export const compose = { tier: 'leaf' } satisfies ComposeContract;
