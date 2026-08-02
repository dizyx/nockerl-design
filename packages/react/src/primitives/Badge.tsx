/**
 * NockerlBadge is the Tier-1 count / dot / status-label indicator primitive. ONE home
 * for the count keycap, the 99+ overflow, the bare unseen dot, the solid-vs-soft tonal
 * fill ladder, and the anchored-to-host corner grammar. A future badge change is ONE
 * edit, not many. Composes ONLY tokens.
 *
 * A badge is a PASSIVE indicator (not a chip; chips are interactive filters): a
 * tiny count, an unseen dot, or a compact status label. It mirrors the canonical
 * Compose BadgedBox + NockerlBadge in core/ui/GlobalTopBar.kt (the inbox bell that carries
 * an unread count -> "99+" overflow -> a bare 8dp dot when there is only
 * unseen-but-uncounted activity), plus the small tonal status pills the app uses
 * inline (SpawnPriorityBadge, RiskBadge, SourceBadge: statusColor @ 15% fill + a
 * matching mid-tone label). Voice ships only the outlined ProviderBadge (a tiny
 * capsule label) and has no count/dot badge. See the drift note.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - a count/anchored badge is a PILL (a count keycap / dot is the one place the
 *     stadium is allowed alongside chips + the input bar); a standalone label
 *     badge is also a compact pill, never the control radius of a button.
 *   - SOLID badge = a flat status/accent fill + a contrast-picked label
 *     (var(--color-on-accent) on any cyan fill); SOFT badge = the same hue at low
 *     alpha + a mid-tone label (the app's inline-pill idiom). The fill is STATIC.
 *   - status hues are WARM (info/success/warning/danger) + a neutral grey; the
 *     brand cyan is its own "accent" tone. It is never a decorative glow.
 *   - depth is a NEUTRAL drop shadow + a top catch-light; the ring that separates
 *     an anchored badge from its host is a token-colored stroke, NOT a halo.
 *   - the badge is PASSIVE: it carries no focus/hover/press affordance; it is
 *     announced to assistive tech via the host's accessible name (aria-label),
 *     and the visual count is aria-hidden so it is not read twice.
 *   - motion animates interpolatable props only: an anchored badge POPS in on
 *     mount (scale + opacity), frozen under prefers-reduced-motion.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract';

export type NockerlBadgeTone = 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';
export type NockerlBadgeVariant = 'solid' | 'soft';
export type NockerlBadgeSize = 'sm' | 'md';

export interface NockerlBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
  /** Numeric count. Clamped to `max`, rendering e.g. `99+` past it. */
  count?: number;
  /** Free-text label (use instead of `count` for a status badge). */
  label?: string;
  /** Render a bare dot: no number, no text (the "unseen" indicator). */
  dot?: boolean;
  /** Status / accent hue. Cyan is `accent`; the rest are warm status + neutral. */
  tone?: NockerlBadgeTone;
  /** `solid` = filled hue + contrast label; `soft` = low-alpha tint + hue label. */
  variant?: NockerlBadgeVariant;
  /**
   * Override the tone hue with an ARBITRARY color (e.g. a per-language code color the
   * 6 fixed tones can't express). Drives the soft tint/label/border (or the solid fill).
   * Falls back to `tone` when unset.
   */
  color?: string;
  /** Render the label in the monospace family (for code / file-type / version pills). */
  mono?: boolean;
  /** NockerlBadge scale. */
  size?: NockerlBadgeSize;
  /** Overflow ceiling for `count` (e.g. 99 → `99+`). */
  max?: number;
  /**
   * Pin to the parent host's top-right corner (overlapping, ringed). The parent
   * must be the positioned host (the demo's `Anchored` wrapper provides it).
   * Else the badge renders inline.
   */
  anchored?: boolean;
  /**
   * Accessible name announced for the badge when it stands alone (e.g.
   * "3 unread"). When the badge is anchored, name the HOST instead and leave
   * this unset. The count is decorative there.
   */
  ariaLabel?: string;
}

// SOLID per tone: a flat status/accent fill + a contrast label. The cyan fill
// uses the derived var(--color-on-accent) the demo stage provides; the warm
// status fills are dark enough to take a near-white on-color, which we mix from
// the canvas foreground so it stays reactive.
const SOLID: Record<NockerlBadgeTone, { bg: string; fg: string }> = {
  accent: { bg: 'var(--color-accent-primary)', fg: 'var(--color-on-accent)' },
  info: { bg: 'var(--color-status-info)', fg: 'var(--color-on-accent)' },
  success: { bg: 'var(--color-status-success)', fg: 'var(--color-canvas)' },
  warning: { bg: 'var(--color-status-warning)', fg: 'var(--color-canvas)' },
  danger: { bg: 'var(--color-status-error)', fg: 'var(--color-canvas)' },
  neutral: { bg: 'var(--color-dot-idle)', fg: 'var(--color-canvas)' },
};

// SOFT per tone: the same hue at low alpha + a mid-tone label (the app's inline
// SpawnPriorityBadge / RiskBadge idiom, color @ ~15% fill with colored text).
const SOFT: Record<NockerlBadgeTone, { hue: string; label: string }> = {
  accent: { hue: 'var(--color-accent-primary)', label: 'var(--color-accent-primary)' },
  info: { hue: 'var(--color-status-info)', label: 'var(--color-status-info)' },
  success: { hue: 'var(--color-status-success)', label: 'var(--color-status-success)' },
  warning: { hue: 'var(--color-status-warning)', label: 'var(--color-status-warning)' },
  danger: { hue: 'var(--color-status-error)', label: 'var(--color-status-error)' },
  neutral: { hue: 'var(--color-on-card)', label: 'var(--color-on-card-muted)' },
};

// The dot uses the SOLID fill of its tone (a pure signal, no label).
const DOT: Record<NockerlBadgeTone, string> = {
  accent: 'var(--color-accent-primary)',
  info: 'var(--color-status-info)',
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)',
  danger: 'var(--color-status-error)',
  neutral: 'var(--color-dot-idle)',
};

// A passive pill. The fill is static; an anchored badge only POPS in (scale +
// opacity) on mount. Every visual value is a token; geometry literals (dot size,
// anchor circle, the corner overlap offsets) carry a why-comment.
export const NOCKERL_BADGE_STYLES = `
.nk-badge {
  font-family: var(--font-family-sans);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;   /* counts don't jitter as digits change */
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: var(--space-px) solid transparent;
  border-radius: var(--radius-pill);    /* a count keycap / status pill (reserved stadium) */
  white-space: nowrap;
}
/* sizes: a count badge stays a CIRCLE until it needs to grow for 2+ glyphs */
.nk-badge--sm { font-size: var(--font-size-10); min-width: var(--space-4); height: var(--space-4); padding: 0 var(--space-1); }
.nk-badge--md { font-size: var(--font-size-12); min-width: var(--space-5); height: var(--space-5); padding: 0 var(--space-2); }
.nk-badge--label { letter-spacing: var(--font-tracking-normal); }
.nk-badge--label.nk-badge--sm { padding: 0 var(--space-2); }
.nk-badge--label.nk-badge--md { padding: var(--space-0-5) var(--space-3); }
/* MONO renders a code / file-type / version pill (the label reads in the mono family). */
.nk-badge--mono { font-family: var(--font-family-mono); }
/* DOT is a bare signal (8px / 10px geometry; circle, no label) */
.nk-badge-dot { display: inline-block; border-radius: var(--radius-pill); }
.nk-badge-dot--sm { width: 8px; height: 8px; }
.nk-badge-dot--md { width: 10px; height: 10px; }
/* a solid badge is lit from above: neutral shadow + a top catch-light (no glow) */
.nk-badge--solid {
  box-shadow: 0 var(--elevation-level1) var(--elevation-level2) -2px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-badge--soft { box-shadow: none; }

/* ── anchoring: a host (icon / avatar) with a badge pinned to a corner ── */
.nk-badge-anchor { position: relative; display: inline-flex; }
/* the token-colored ring that punches the badge out of the host: a shape, not a halo */
.nk-badge-anchor__badge {
  --nk-ring: 0 0 0 var(--space-0-5) var(--nk-anchor-ring, var(--color-canvas));
  position: absolute;
  top: 0; right: 0;
  transform: translate(40%, -40%);      /* sit the badge ON the corner, overlapping the host edge */
  transform-origin: center;
  box-shadow: var(--nk-ring);
}
/* a SOLID anchored badge keeps its lit-from-above shadow + catch-light AND the ring */
.nk-badge-anchor__badge.nk-badge--solid {
  box-shadow:
    var(--nk-ring),
    0 var(--elevation-level1) var(--elevation-level2) -2px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent),
    inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
/* the pop-in: interpolatable only (scale + opacity), choreographed, not a pulse */
@keyframes nk-badge-pop {
  0% { opacity: 0; transform: translate(40%, -40%) scale(0); }
  60% { transform: translate(40%, -40%) scale(1.12); }
  100% { opacity: 1; transform: translate(40%, -40%) scale(1); }
}
.nk-badge-anchor__badge--pop { animation: nk-badge-pop .34s var(--motion-easing-standard) both; }
@media (prefers-reduced-motion: reduce) {
  .nk-badge-anchor__badge--pop { animation: none; }
}
`;

const fmtCount = (count: number, max: number) => (count > max ? `${max}+` : `${count}`);

/**
 * A single Nockerl badge, the unit the spec documents. Pass `count` for a number
 * badge (clamped to `max` → e.g. `99+`), `dot` for a bare unseen signal, or
 * `label` for a compact status pill. `tone` picks the hue, `variant` picks
 * solid-vs-soft. Passive: no interaction; name it via `ariaLabel` when standalone.
 */
export const NockerlBadge = forwardRef<HTMLSpanElement, NockerlBadgeProps>(function NockerlBadge({
  count,
  label,
  dot = false,
  tone = 'accent',
  variant = 'solid',
  size = 'md',
  max = 99,
  anchored = false,
  ariaLabel,
  color,
  mono = false,
  className,
  style,
  ...rest
}, ref) {
  // When anchored, the badge pins to the host corner (ringed) and pops in.
  const anchor = anchored ? ' nk-badge-anchor__badge nk-badge-anchor__badge--pop' : '';

  if (dot) {
    return (
      <span
        {...rest}
        ref={ref}
        className={`nk-badge-dot nk-badge-dot--${size}${anchor}${className ? ` ${className}` : ''}`}
        style={{ background: DOT[tone], ...style }}
        role={ariaLabel ? 'status' : undefined}
        aria-label={ariaLabel}
        aria-hidden={ariaLabel ? undefined : true}
      >
        <style>{NOCKERL_BADGE_STYLES}</style>
      </span>
    );
  }

  const isLabel = label !== undefined;
  const content = isLabel ? label : fmtCount(count ?? 0, max);
  // An explicit `color` overrides the tone hue (soft tint/label/border, or solid fill).
  const ownStyle: CSSProperties =
    variant === 'solid'
      ? { background: color ?? SOLID[tone].bg, color: color ? 'var(--color-on-accent)' : SOLID[tone].fg }
      : {
          background: `color-mix(in srgb, ${color ?? SOFT[tone].hue} 16%, transparent)`,
          color: color ?? SOFT[tone].label,
          borderColor: `color-mix(in srgb, ${color ?? SOFT[tone].hue} 30%, transparent)`,
        };

  return (
    <span
      {...rest}
      ref={ref}
      className={`nk-badge nk-badge--${variant} nk-badge--${size}${isLabel ? ' nk-badge--label' : ''}${mono ? ' nk-badge--mono' : ''}${anchor}${className ? ` ${className}` : ''}`}
      style={{ ...ownStyle, ...style }}
      role={ariaLabel ? 'status' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {content}
      <style>{NOCKERL_BADGE_STYLES}</style>
    </span>
  );
});

/** LEAF: a passive indicator; renders span markup (no facsimile elements) + tokens. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlBadge;
