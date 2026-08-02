/**
 * NockerlStatusDisc is the intent coin + glyph primitive of the alert family: a raised
 * FILLED coin (knockout glyph) by default, or an optional recessed INSET well (`inset`)
 * for the banner, with status color in the glyph + a soft wash, still a disc (Law 6).
 *
 * THE SIGNATURE the alert family shares (Banner / Callout / Toast all draw it): a
 * SOLID circle filled in the intent color with the severity glyph KNOCKED OUT of it
 * (a dark-on-color stencil in the canvas ink), lifted off its host by a tiny neutral
 * drop + an inner top catch-light. No glow, no colored shadow: the color rides only
 * in the coin. This is the canonical disc, lifted VERBATIM from BannerDemo's
 * `.nk-bn__disc` recipe so the lit coin reads pixel-identical wherever it appears.
 *
 * SINGLE-SOURCED COLOR: the intent → color binding is the ALREADY-CENTRAL alert map
 * (`ALERT_INTENT` in `alertIntents.ts`, the one home for the family's hues), so
 * the coin cannot drift from Banner / Callout / Toast. Pass a raw `color` only for a
 * tone that has no shared-map peer (e.g. Banner's local `neutral` = on-card).
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • the color lives ONLY in the filled coin; the glyph is knocked out to the dark
 *     canvas ground (a stencil), never a second hue.
 *   • depth = a NEUTRAL drop + an inner top catch-light (the lift law). No glow, no
 *     colored shadow.
 *   • a true circle (flex:0 0 auto), sized to a token; the optional line-box nudge
 *     centres it on the first text line of a multi-line alert.
 *   • presentational only, so the disc is aria-hidden; the host alert carries the text
 *     (never color alone). The coin is the SHAPE, the host owns the meaning.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { ALERT_INTENT, type AlertIntent } from '../alertIntents';
import type { ComposeContract } from '../compose-contract';

export type { AlertIntent } from '../alertIntents';

export interface NockerlStatusDiscProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
  /** Semantic intent that binds the coin fill from the shared ALERT_INTENT map. */
  intent: AlertIntent;
  /** The knockout glyph (a FILLED/stroke svg in currentColor, which inherits the canvas ink). */
  children?: ReactNode;
  /**
   * Raw fill override for a tone with NO shared-map peer (e.g. Banner's local
   * `neutral` = on-card). When set it wins over `ALERT_INTENT[intent].color`.
   */
  color?: string;
  /**
   * Optional CSS length for the disc's top margin, the line-box centring nudge a
   * multi-line alert uses to align the coin to its first text line. Omit for a bare,
   * standalone coin (no nudge).
   */
  lineNudge?: string;
  /**
   * Render the coin RECESSED (an inset well) instead of a raised filled coin: the
   * intent color leaves the fill for the GLYPH + a soft status wash + a whisper status
   * border, and the lift flips to an inner top shade (the EmptyState-well treatment).
   * The persistent inline **banner** uses this: informational + non-interactive (the
   * icon-interactivity canon) while status still lives in a DISC (Law 6). Default
   * false = the raised filled coin the toast / callout / transcript keep.
   */
  inset?: boolean;
}

// The canonical disc recipe, lifted VERBATIM from BannerDemo's .nk-bn__disc so the
// lit coin is pixel-identical across the alert family. The fill rides in on the
// --nk-disc-c custom property (token-reactive); the glyph is knocked out to the dark
// canvas ground. Depth = a NEUTRAL drop + an inner top catch-light (no glow). The
// optional --nk-disc-nudge centres the coin on the first text line of a multi-line
// host (0 when standalone). Geometry literals stay as tokens; no backticks anywhere.
export const NOCKERL_STATUS_DISC_STYLES = `
/* THE SIGNATURE: a filled status DISC. A solid circle in the intent color with the
   glyph knocked out to the dark ground. A true circle (flex:0 0 auto), sized to a
   token, vertically centred to the first text line via the line-box height. A faint
   inner top catch-light + hairline give it real dimension (not flat). */
.nk-disc {
  flex: 0 0 auto;
  width: var(--space-6); height: var(--space-6);
  border-radius: var(--radius-pill);
  background: var(--nk-disc-c);
  display: inline-flex; align-items: center; justify-content: center;
  /* lift the disc off the host: a tiny neutral drop + an inner top catch-light. */
  box-shadow:
    0 var(--space-px) var(--elevation-level1) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent),
    inset 0 var(--space-px) 0 color-mix(in srgb, var(--color-core-white) 28%, transparent);
  /* line-box nudge so the disc centres on the first line-box of a multi-line host. */
  margin-top: var(--nk-disc-nudge, 0);
}
/* the glyph is KNOCKED OUT, a dark stencil cut from the disc (dark-on-color). */
.nk-disc svg { display: block; width: var(--space-4); height: var(--space-4);
  color: var(--color-canvas); }
/* In the INSET variant (the banner) the coin SINKS into a recessed well: the intent color
   leaves the fill for the GLYPH + a soft status wash + a whisper status border, and the
   lift flips to an inner top shade (recessed, not raised). Still a disc (Law 6), still
   non-interactive / informational (the icon-interactivity canon). Mirrors the EmptyState
   .nk-es__well recipe. box-sizing keeps the border inside the token-sized circle. */
.nk-disc.nk-disc--inset {
  box-sizing: border-box;
  background: color-mix(in srgb, var(--nk-disc-c) 14%, transparent);
  border: var(--space-px) solid color-mix(in srgb, var(--nk-disc-c) 30%, transparent);
  box-shadow:
    inset 0 var(--space-px) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent),
    inset 0 calc(-1 * var(--space-px)) 0 var(--color-surface-highlight);
}
.nk-disc.nk-disc--inset svg { color: var(--nk-disc-c); }   /* the intent-color glyph, NOT knocked out */
`;

/**
 * A single Nockerl status disc, the lit intent coin with a knockout glyph the alert
 * family (Banner / Callout / Toast) all share. Filled from the shared ALERT_INTENT
 * map (or a raw `color` for a tone with no peer); the glyph is supplied as children
 * and knocked out to the dark canvas ground. Presentational (aria-hidden). The host
 * alert carries the accessible text.
 */
export const NockerlStatusDisc = forwardRef<HTMLSpanElement, NockerlStatusDiscProps>(function NockerlStatusDisc({ intent, children, color, lineNudge, inset, className, style, ...rest }, ref) {
  const fill = color ?? ALERT_INTENT[intent].color;
  return (
    <span
      {...rest}
      ref={ref}
      className={['nk-disc', inset ? 'nk-disc--inset' : '', className].filter(Boolean).join(' ')}
      aria-hidden="true"
      style={
        {
          '--nk-disc-c': fill,
          ...(lineNudge ? { '--nk-disc-nudge': lineNudge } : {}),
          ...style,
        } as CSSProperties
      }
    >
      {children}
      <style>{NOCKERL_STATUS_DISC_STYLES}</style>
    </span>
  );
});

/** LEAF: a filled coin; `children` is a knockout GLYPH (svg ornamentation), not a slot. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlStatusDisc;
