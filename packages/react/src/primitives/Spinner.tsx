/**
 * NockerlSpinner: the Tier-1 indeterminate-loader primitive. ONE home for the rotating
 * cyan arc, the in-button on-accent / currentColor tone swap, and the reduced-motion
 * calm state, so a future spinner change is ONE edit, not many. Composes ONLY tokens.
 *
 * The spinner is the INDETERMINATE CIRCULAR loader for work of unknown length.
 * It is deliberately distinct from its neighbours:
 *   • progress-bar  -> determinate / indeterminate LINEAR + a DETERMINATE ring
 *   • context-gauge -> threshold-banded token-budget meter
 *   • skeleton      -> content-shaped placeholders
 * So this component has NO percentage, NO track value, NO center number: just a
 * spinning cyan arc that says "still working".
 *
 * Sourced from the real apps, never the web dashboard:
 *   • Android (canonical): Material CircularProgressIndicator, indeterminate,
 *     across the app: 12dp (stroke 1.5dp), 20-24dp (stroke 2dp), and a larger
 *     centered form. Color defaults to the cyan accent; in-card it is accent,
 *     in-button it is LocalContentColor.current (the button's own content
 *     color). Centered states wrap it in a Box(contentAlignment = Center).
 *     (MessageList, FileViewer, ToolAdapterCards, ChatInputBar, LoginScreen.)
 *   • Voice (Swift): ProgressView().controlSize(.small).tint(accent) beside a
 *     "Transcribing…" label in the RecordingHUD.
 *
 * Implements the design laws verbatim:
 *   • the arc is the cyan accent; the (optional) track is a recessed muted ring,
 *     NOT a glow. Depth on an overlay comes from a neutral shadow + a scrim,
 *     never a colored halo.
 *   • motion animates an interpolatable property only (rotation transform). The
 *     fill never tweens.
 *   • prefers-reduced-motion: the infinite spin STOPS. It degrades to a static
 *     partial arc with a gentle, slow opacity pulse (non-distracting), never an
 *     infinite fast spin.
 *   • the spinner carries role="status" + aria-label so a state change is announced.
 *
 * TOKEN-REACTIVE: every color is a var(--token). The only literals are pure SVG/arc
 * geometry (viewBox, the 24-unit coordinate space, stroke-dash math) and transition
 * curves. That is exactly what tokens don't cover.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract.js';

export type NockerlSpinnerSize = 'xs' | 'sm' | 'md' | 'lg';
export type NockerlSpinnerTone = 'accent' | 'onAccent' | 'currentColor';

export interface NockerlSpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /** Diameter step. Stroke width scales with the size (thinner when small). */
  size?: NockerlSpinnerSize;
  /** Arc color: the cyan accent (default), the on-accent label (in a primary button), or inherit. */
  tone?: NockerlSpinnerTone;
  /** Render the faint recessed track ring behind the arc. */
  track?: boolean;
  /** Accessible name announced by assistive tech. */
  label?: string;
}

// Diameter (px) + stroke (px) per size: pure SVG geometry, mirroring the real
// Android sizes (12 / 18 / 20 / 24dp with 1.5-2dp strokes). Geometry is the one
// thing the token contract exempts; everything *colored* below is a token.
const GEOM: Record<NockerlSpinnerSize, { d: number; w: number }> = {
  xs: { d: 14, w: 1.6 },
  sm: { d: 18, w: 2 },
  md: { d: 24, w: 2.4 },
  lg: { d: 36, w: 3 },
};

// The arc is a rotating stroke over a 24-unit SVG box. The visible sweep is set
// by stroke-dasharray on a r=10 circle (circumference ~62.83). Rotation is the
// ONLY animated property (interpolatable). The stroke color is static. Under
// reduced motion the spin STOPS and degrades to a gentle static-arc opacity pulse.
export const NOCKERL_SPINNER_STYLES = `
/* ── the spinner itself ── */
.nk-spin { display: inline-flex; line-height: 0; vertical-align: middle; }
.nk-spin__svg { display: block; animation: nk-spin-rot .85s linear infinite; }
.nk-spin__track { stroke: var(--color-card-hairline); }            /* recessed muted ring */
.nk-spin__arc {
  stroke: var(--color-accent-primary);                              /* default: cyan accent */
  stroke-linecap: round;
  /* show ~3/8 of the ring: dash 23.6 of 62.83 circumference */
  stroke-dasharray: 23.6 62.83;
  transform-origin: center;
}
.nk-spin--accent .nk-spin__arc { stroke: var(--color-accent-primary); }
.nk-spin--onAccent .nk-spin__arc { stroke: var(--color-on-accent); }
.nk-spin--currentColor .nk-spin__arc { stroke: currentColor; }
@keyframes nk-spin-rot { to { transform: rotate(360deg); } }

/* ── reduced motion: STOP the spin → static partial arc + gentle opacity pulse ── */
@media (prefers-reduced-motion: reduce) {
  .nk-spin__svg { animation: none; }
  .nk-spin__arc { animation: nk-spin-pulse 1.8s ease-in-out infinite; }
  @keyframes nk-spin-pulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
}
`;

/**
 * A single Nockerl spinner, the indeterminate circular loader. role="status"
 * carries the accessible name so screen readers announce it; the arc is a
 * rotating cyan stroke (rotation is the only animated property). The .nk-spin span
 * is the root. The recipe CSS is injected as its LAST child.
 */
export const NockerlSpinner = forwardRef<HTMLSpanElement, NockerlSpinnerProps>(function NockerlSpinner({ size = 'md', tone = 'accent', track = false, label = 'Loading', className, ...rest }, ref) {
  const { d, w } = GEOM[size];
  return (
    <span {...rest} ref={ref} className={`nk-spin nk-spin--${tone}${className ? ` ${className}` : ''}`} role="status" aria-label={label}>
      <svg
        className="nk-spin__svg"
        width={d}
        height={d}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        {track && <circle className="nk-spin__track" cx="12" cy="12" r="10" strokeWidth={w} />}
        <circle className="nk-spin__arc" cx="12" cy="12" r="10" strokeWidth={w} />
      </svg>
      <style>{NOCKERL_SPINNER_STYLES}</style>
    </span>
  );
});

/** LEAF: an indeterminate loader; renders svg markup (no facsimile elements) + tokens. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlSpinner;
