/**
 * NockerlStatusDot: the Tier-1 semantic STATE dot primitive. ONE home for the status-hue
 * ramp, the surface-notch grammar, the shipped opacity pulse + the expanding ping
 * ring, and the never-color-alone a11y rule. A future status-dot change is ONE
 * edit, not many. Composes ONLY tokens.
 *
 * This is the DEDICATED semantic STATE dot, distinct from `badge` (a count /
 * notification overlay). It mirrors the canonical Compose `NockerlStatusDot` +
 * `PulsingDot` / `PulsingChipDot` (`chat/ui/SessionChipsBar.kt`,
 * `chat/ui/ChatIndicators.kt`) and the Voice `PulsingDot`
 * (`UI/RecordingHUD.swift`): a small filled circle whose color encodes one state,
 * 8px when "loud" (streaming / attention / unread) and 6px when idle, that pulses
 * by fading its OPACITY (1 → ~0.3) when live. The semantic color set + presence
 * states reuse the exact dot/status tokens the apps use (see
 * `core/theme/NockerlColors.kt` dot states + the `--color-status-*` ramp), so the
 * vocabulary stays consistent with avatar presence + the session chips.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • a status dot is a SHAPE, never a glow. Depth is read by the dot sitting in a
 *     surface-colored NOTCH (a ring punched the color of the host), not by emission.
 *     No colored shadow / halo anywhere; the "live" ring is the SAME token at low
 *     alpha, a real concentric circle, not a blurred bloom.
 *   • status hues are WARM (success / warning / error / info) + a neutral grey for
 *     offline/idle; the brand cyan is its own "live/info" signal, never decorative.
 *   • feedback animates interpolatable props only: the live dot fades OPACITY
 *     (the shipped pulse) and the optional ping ring SCALES + fades; the fill never
 *     swaps. Both freeze to a calm static ring under prefers-reduced-motion.
 *   • the dot is PRESENTATIONAL, never color alone: every example pairs the dot
 *     with text (a visible label, or a role="img" + aria-label / visually-hidden
 *     label) so the state is announced and not conveyed by hue only.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract.js';

// The semantic state set: success/online, warning/idle-or-pending, error/busy,
// info/live, neutral/offline. These map 1:1 to the app's dot + status tokens.
export type StatusKind =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';
export type StatusSize = 'xs' | 'sm' | 'md';

export interface NockerlStatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  /** Which semantic state to render. The hue comes from the status / dot token ramp. */
  status?: StatusKind;
  /** Dot diameter ramp: xs 6 · sm 8 · md 10 (geometry derived from the spacing scale). */
  size?: StatusSize;
  /** Optional visible label rendered after the dot (baseline-aligned). */
  label?: string;
  /** Live: fade the dot's opacity (the shipped pulse). Use for streaming / recording / connected. */
  pulse?: boolean;
  /** Live ring: an expanding concentric "ping" in the same hue (web-original; see the drift note). */
  ping?: boolean;
  /** Outline-only: a hollow ring in the hue instead of a filled dot. */
  outline?: boolean;
  /**
   * The host surface the dot sits ON. It fills the notch ring so the dot reads as a
   * chip on that surface. Defaults to the canvas; pass a card token on a card.
   */
  surface?: string;
  /**
   * Accessible name. Required when there is no visible `label`, so the state is
   * never conveyed by color alone (rendered as a role="img" name + sr-only text).
   */
  ariaLabel?: string;
}

// One fill per state, straight from the tokens the apps use. `info` IS the brand
// cyan (the "live"/streaming signal, dotStreaming); the rest are warm status +
// a neutral grey for offline/idle (dotIdle).
const HUE: Record<StatusKind, string> = {
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)',
  error: 'var(--color-status-error)',
  info: 'var(--color-dot-streaming)',
  neutral: 'var(--color-dot-idle)',
};

// Diameter ramp. The apps use 8dp when "loud" and 6dp idle; we expose xs/sm/md as
// 6/8/10 so the dot scales with its label's type. Derived via calc from the
// spacing scale → still reactive.
const DOT_VAR: Record<StatusSize, string> = {
  xs: 'calc(var(--space-1) + var(--space-0-5))', // 6, sits between space-1 (4) and space-2 (8)
  sm: 'var(--space-2)', // 8: the apps' "loud" dot
  md: 'calc(var(--space-2) + var(--space-0-5))', // 10
};
// The label type tracks the dot size so the pair stays optically balanced.
const LABEL_FONT: Record<StatusSize, string> = {
  xs: 'var(--font-size-12)',
  sm: 'var(--font-size-12)',
  md: 'var(--font-size-14)',
};

// A status dot is a SHAPE in a surface notch, never a glow. The live pulse fades
// OPACITY (the shipped Android/Voice behavior); the optional ping is a real
// concentric ring that SCALES + fades. Both freeze under reduced-motion. Every
// visual value is a token; geometry literals carry a why-comment.
export const NOCKERL_STATUS_DOT_STYLES = `
/* the dot wrapper carries the size + hue as locals so every child reads them */
.nk-sd {
  position: relative; flex: 0 0 auto; display: inline-block;
  width: var(--nk-sd-size); height: var(--nk-sd-size);
  vertical-align: middle;   /* centers the bare dot on a text line */
}
/* the visible disc: a filled circle that sits in a notch punched the color of the
   host surface (a SHAPE on the surface, following the avatar-presence precedent), no glow */
.nk-sd__disc {
  position: absolute; inset: 0; border-radius: var(--radius-pill);
  background: var(--nk-sd-hue);
  box-shadow: 0 0 0 var(--nk-sd-notch) var(--nk-sd-surface);   /* the surface notch */
}
/* outline-only: a hollow ring in the hue (no fill), same notch grammar */
.nk-sd--outline .nk-sd__disc {
  background: transparent;
  box-shadow:
    0 0 0 var(--nk-sd-notch) var(--nk-sd-surface),
    inset 0 0 0 var(--space-0-5) var(--nk-sd-hue);
}
/* the shipped PULSE: fade opacity 1 → ~0.3 and back (Android 800ms / Voice 600ms;
   we split the difference). Interpolatable only, so the fill never changes. */
.nk-sd--pulse .nk-sd__disc { animation: nk-sd-pulse .8s ease-in-out infinite alternate; }
@keyframes nk-sd-pulse { from { opacity: 1; } to { opacity: .3; } }
/* the optional PING ring: a concentric circle in the same hue that expands + fades.
   It is web-original (see the drift note). A real ring, NOT a blurred halo. */
.nk-sd__ping {
  position: absolute; inset: 0; border-radius: var(--radius-pill);
  border: var(--space-px) solid var(--nk-sd-hue);
  animation: nk-sd-ping 1.6s cubic-bezier(0,0,.2,1) infinite;
  pointer-events: none;
}
@keyframes nk-sd-ping {
  0% { transform: scale(1); opacity: .55; }
  80%, 100% { transform: scale(2.4); opacity: 0; }
}
/* reduced motion: freeze to a CALM STATIC ring. The pulse stops at full opacity and
   the ping becomes a steady low-alpha halo ring (no scaling), so "live" is still
   visible but nothing moves. */
@media (prefers-reduced-motion: reduce) {
  .nk-sd--pulse .nk-sd__disc { animation: none; opacity: 1; }
  .nk-sd__ping { animation: none; transform: scale(1.7); opacity: .35; }
}

/* a dot paired with a visible label, baseline / center aligned and evenly spaced */
.nk-sd-pair { display: inline-flex; align-items: center; gap: var(--nk-sd-gap, var(--space-2)); }
.nk-sd-pair__label { font-size: var(--nk-sd-label-font); line-height: 1; color: var(--color-on-card);
  font-weight: var(--font-weight-medium); white-space: nowrap; }
.nk-sd-pair__label--muted { color: var(--color-on-card-muted); }

/* visually-hidden text alternative (state announced, not conveyed by color alone) */
.nk-sd-sr {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
`;

// Dot diameter + notch-ring width as locals (geometry derived from the size token;
// the notch is a slim ~1.5px-ish ring scaled off the spacing scale).
function dotVars(size: StatusSize, hue: string, surface?: string): CSSProperties {
  return {
    '--nk-sd-size': DOT_VAR[size],
    '--nk-sd-hue': hue,
    '--nk-sd-notch': 'var(--space-0-5)',
    ...(surface ? { '--nk-sd-surface': surface } : {}),
  } as CSSProperties;
}

/**
 * A single Nockerl status dot, the unit the spec documents. A filled (or outline)
 * circle whose hue encodes one semantic state, sitting in a surface-colored notch.
 * `pulse` fades its opacity for "live"; `ping` adds an expanding ring. Pair it with
 * a visible `label`, or pass `ariaLabel` so the state is never color-only.
 */
export const NockerlStatusDot = forwardRef<HTMLSpanElement, NockerlStatusDotProps>(function NockerlStatusDot({
  status = 'neutral',
  size = 'sm',
  label,
  pulse = false,
  ping = false,
  outline = false,
  surface,
  ariaLabel,
  className,
  style,
  ...rest
}, ref) {
  const hue = HUE[status];
  const dotInner = (
    <>
      {ping && <span className="nk-sd__ping" aria-hidden="true" />}
      <span className="nk-sd__disc" />
    </>
  );

  if (!label) {
    // Bare dot: the .nk-sd span is the root, and the recipe CSS is its LAST child.
    return (
      <span
        {...rest}
        ref={ref}
        className={['nk-sd', outline ? 'nk-sd--outline' : '', pulse ? 'nk-sd--pulse' : '', className]
          .filter(Boolean)
          .join(' ')}
        style={{ ...dotVars(size, hue, surface), ...style }}
        // When there's no visible label, the dot itself carries the name (role=img).
        role={ariaLabel ? 'img' : undefined}
        aria-label={ariaLabel}
        aria-hidden={!ariaLabel ? true : undefined}
      >
        {dotInner}
        <style>{NOCKERL_STATUS_DOT_STYLES}</style>
      </span>
    );
  }

  // Dot + visible label: the label IS the accessible text (so never color-only);
  // an optional ariaLabel overrides the announced text for assistive tech. The
  // .nk-sd-pair span is the root; the recipe CSS is its LAST child.
  return (
    <span
      {...rest}
      ref={ref}
      className={['nk-sd-pair', className].filter(Boolean).join(' ')}
      style={{ '--nk-sd-label-font': LABEL_FONT[size], ...style } as CSSProperties}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    >
      <span
        className={['nk-sd', outline ? 'nk-sd--outline' : '', pulse ? 'nk-sd--pulse' : '']
          .filter(Boolean)
          .join(' ')}
        style={dotVars(size, hue, surface)}
        aria-hidden={true}
      >
        {dotInner}
      </span>
      <span
        className={`nk-sd-pair__label${status === 'neutral' ? ' nk-sd-pair__label--muted' : ''}`}
        aria-hidden={ariaLabel ? true : undefined}
      >
        {label}
      </span>
      <style>{NOCKERL_STATUS_DOT_STYLES}</style>
    </span>
  );
});

/** LEAF: a presentational state dot; renders span markup (no facsimile elements) + tokens. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlStatusDot;
