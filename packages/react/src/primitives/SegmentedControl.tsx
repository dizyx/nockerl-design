/**
 * NockerlSegmentedControl is the Tier-1 segmented-control primitive. ONE home for the
 * recessed-track well, the ONE sliding cyan pill (measured + transformed), the
 * label cross-fade, the role="radiogroup" + roving-tabindex keyboard model, and
 * the segmented RULE, so a future segmented-control change is ONE edit, not many.
 * Composes ONLY tokens (and the NockerlIcon primitive for its glyphs).
 *
 * The CANONICAL connected single-track view/mode switch: touching segments on one
 * recessed track with ONE sliding cyan pill gliding to the active segment. It makes
 * the inline toggles already shipped in App shell (layout) and Diff viewer (Unified
 * / Split) into one reusable component that now has a sliding pill.
 *
 * DELIBERATELY DISTINCT from its neighbours:
 *   • NOT tabs: no associated tabpanels, not page/section wayfinding; it flips a
 *     small set of mutually-exclusive VIEWS/MODES. So the ARIA is
 *     role="radiogroup" + role="radio" (single-select), never tablist/tab.
 *   • more compact + CONNECTED than a radio group. Peers share one track, no
 *     per-option description; reach for it for 2-5 equal peers, reach for
 *     radio-group when options need descriptions or there are 4+ rich choices.
 *
 * Sourced from the shipped apps, never the web dashboard (see the page drift
 * note; the apps disagree and hard-cut today, and the sliding pill is canonical web):
 *   • Android `core/ui/NockerlSegmented.kt`: one muted track (`cardAlt2`,
 *     control radius, 2dp inset); ACTIVE = SOFT-cyan fill (`accentPrimarySoft`) +
 *     a cyan medium label (inner radius one step tighter); inactive transparent +
 *     muted; the whole control dims when disabled.
 *   • Voice/Swift `SettingsComponents.swift` `SegmentedSelector` uses an inset
 *     `canvasAlt` track (radius 10, 4pt inset); ACTIVE = cyan OUTLINE (1.5pt), NOT
 *     a fill; equal-width segments (`.frame(maxWidth: .infinity)`).
 *
 * Design laws encoded here (do not re-derive in a demo): the TRACK is a recessed
 * well (darker ground + inner shadow: fields sink); the PILL lifts off it (neutral
 * shadow + top catch-light, never a glow). Flash-free: the pill is ONE element whose
 * static cyan fill never tweens. It SLIDES (translateX) + resizes; labels cross-fade
 * color. 12px control radius (a rounded rectangle, not a stadium). Cyan is the
 * selection signal only. Focus is an OUTLINE. A real control: roving tabindex (ONE
 * tab stop), Arrow/Home/End move AND select, Space/Enter select, ≥24px target, a
 * disabled segment is skipped but legible. prefers-reduced-motion: the pill still
 * MOVES, it just teleports.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { NockerlIcon } from './Icon';
import type { HTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract';

export type SegmentSize = 'sm' | 'md';

export interface Segment {
  /** Stable value emitted on selection. */
  value: string;
  /** Visible label (the segment's accessible name). Optional for icon-only. */
  label?: string;
  /** Optional leading glyph. Pairs with `label`, or stands alone (icon-only). */
  icon?: keyof typeof SEGMENT_ICONS;
  /** Accessible name when icon-only (no visible label). */
  title?: string;
  /** Inert + clearly-seen single segment (skipped by arrow keys). */
  disabled?: boolean;
}

/**
 * NockerlSegmentedControl renders a <div role="radiogroup"> (its segments are <button
 * role="radio">), so it extends the native DIV attributes (minus the value-first
 * `onChange` it redefines) + forwards a ref to that root <div>, merged with the internal
 * measurement track ref. `id`, `title`, `aria-*` / `data-*` ride onto the group; the
 * `onChange(next: string)` value-first callback is Omitted from the DOM attrs;
 * `segments`/`value`/`label`/`size`/`orientation`/`fullWidth`/`disabled` are not base div
 * attributes, so they need no Omit.
 */
export interface NockerlSegmentedControlProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The segments, left-to-right. 2-5 mutually-exclusive peers. */
  segments: Segment[];
  /** The currently-active value (controlled). Exactly one is selected. */
  value: string;
  /** Fired with the next value. Ignored for a disabled segment. */
  onChange?: (next: string) => void;
  /** Accessible name for the group (wired via aria-label). */
  label: string;
  /** Control height + padding + type role. */
  size?: SegmentSize;
  /**
   * Track axis. `horizontal` (default) = segments in a row, pill slides X.
   * `vertical` = segments stacked, pill slides Y (e.g. an AM/PM meridiem in a narrow
   * slot). Additive: omitting it is a no-op for existing (horizontal) consumers.
   */
  orientation?: 'horizontal' | 'vertical';
  /** Stretch to fill the row (equal-width segments) vs. hug its content. */
  fullWidth?: boolean;
  /** Dim + disable the whole control. */
  disabled?: boolean;
}

// ─── Inline glyphs (stroke icons in currentColor so each segment tints) ────────
// `stroke` retained only for `auto`, which keeps a raw <svg>: it contains a FILLED
// half-disc (fill="currentColor" stroke="none"), so it stays inline per the rules.
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};
export const SEGMENT_ICONS = {
  list: <NockerlIcon path="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  grid: (
    <NockerlIcon>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </NockerlIcon>
  ),
  board: (
    <NockerlIcon>
      <rect x="3" y="4" width="5" height="16" rx="1" />
      <rect x="10" y="4" width="5" height="11" rx="1" />
      <rect x="17" y="4" width="4" height="14" rx="1" />
    </NockerlIcon>
  ),
  unified: <NockerlIcon path="M4 6h16M4 12h16M4 18h16" />,
  split: (
    <NockerlIcon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M12 4v16" />
    </NockerlIcon>
  ),
  sun: (
    <NockerlIcon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </NockerlIcon>
  ),
  moon: <NockerlIcon path="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  auto: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  ),
} as const;

// Fields sink, so the TRACK is a recessed well (the Swift `canvasAlt` inset value).
// The PILL is ONE static cyan element lit from above; it SLIDES (transform) and
// resizes to the active segment. Labels cross-fade color only. No fill ever
// tweens. All values are tokens; literals are pure geometry / transition curves.
export const NOCKERL_SEGMENTED_CONTROL_STYLES = `
/* The TRACK is a recessed single track (darker ground + inner shadow: fields sink;
   12px rounded rect, never a stadium; inset so the pill nests). No outer glow. */
.nk-sg { position: relative; display: inline-flex; align-items: stretch;
  background: var(--color-canvas-alt); border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-control); padding: var(--space-0-5);
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent); }
.nk-sg--full { display: flex; width: 100%; }
.nk-sg--disabled { opacity: .55; cursor: not-allowed; }   /* dimmed but still legible */

/* The sliding PILL: one element, static cyan fill, lit from above; it SLIDES
   (transform) + resizes (width), both interpolatable. The FILL never tweens. */
.nk-sg__pill { position: absolute; top: var(--space-0-5); bottom: var(--space-0-5); left: 0;
  border-radius: calc(var(--radius-control) - var(--space-0-5));   /* nests one step inside */
  background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary));
  box-shadow: 0 var(--elevation-level1) var(--elevation-level3) -3px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight);
  transition: transform .26s var(--motion-easing-standard), width .26s var(--motion-easing-standard), height .26s var(--motion-easing-standard); pointer-events: none; z-index: 0; }
.nk-sg__pill--hidden { opacity: 0; }   /* before first measure / no selection */
/* VERTICAL orientation stacks segments (column); the pill spans the track WIDTH (left/right
   inset) and slides on Y (translateY + height) instead of X. The recessed track, the static
   cyan fill, the catch-light, and the pre-measure fallback are all axis-agnostic and unchanged. */
.nk-sg--vertical { flex-direction: column; }
.nk-sg--vertical .nk-sg__pill { top: 0; bottom: auto; left: var(--space-0-5); right: var(--space-0-5); }

/* PRE-MEASURE fallback (flash-free first paint). Before useLayoutEffect measures
   the active segment (SSR / pre-hydration), the JS pill has no position yet, so
   paint the SAME static cyan fill directly on the ACTIVE segment. Same gradient +
   same nested radius as .nk-sg__pill, so the swap to the real measured pill is
   seamless. Removed the instant data-measured becomes true. Fill never tweens: this
   is a plain background with no transition, matching the pill law. A no-selection
   control has no aria-checked segment, so it correctly shows nothing. */
.nk-sg:not([data-measured="true"]) .nk-sg__seg[aria-checked="true"] {
  background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary));
  border-radius: calc(var(--radius-control) - var(--space-0-5)); }

/* A SEGMENT takes an equal share, label centered on both axes, layered above the pill.
   Inactive = muted, no cyan; only color/weight cross-fade (no fill swap). */
.nk-sg__seg { position: relative; z-index: 1; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2); border: 0; background: transparent; cursor: pointer; white-space: nowrap;
  border-radius: calc(var(--radius-control) - var(--space-0-5)); font-family: inherit;
  color: var(--color-on-card-alt-muted); font-weight: var(--font-weight-regular); transition: color .2s, font-weight .2s; }
.nk-sg--full .nk-sg__seg { flex: 1 1 0; }              /* equal-width when stretched */
.nk-sg__seg[aria-checked="true"] { color: var(--color-on-accent); font-weight: var(--font-weight-semibold); }  /* sits ON the cyan pill */
.nk-sg__seg:not([aria-checked="true"]):not(:disabled):hover { color: var(--color-on-card-alt); }
.nk-sg__seg:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
.nk-sg__seg:disabled { cursor: not-allowed; color: var(--color-on-card-alt-muted); opacity: .5; }

/* sizes: each one must clear the ≥24px target law */
.nk-sg--sm .nk-sg__seg { font-size: var(--font-size-12); padding: var(--space-1) var(--space-3); }
.nk-sg--md .nk-sg__seg { font-size: var(--font-size-14); padding: var(--space-2) var(--space-4); }
/* icon-only segments stay square-ish so the glyph is optically centered */
.nk-sg--sm .nk-sg__seg--icon { padding: var(--space-1) var(--space-2); }
.nk-sg--md .nk-sg__seg--icon { padding: var(--space-2) var(--space-3); }
.nk-sg__ico { display: inline-flex; flex: 0 0 auto; }
.nk-sg--sm .nk-sg__ico svg { width: 15px; height: 15px; display: block; }
.nk-sg--md .nk-sg__ico svg { width: 17px; height: 17px; display: block; }
.nk-sg__txt { display: inline-flex; line-height: 1; }

@media (prefers-reduced-motion: reduce) {
  .nk-sg__pill { transition: none; }                  /* still MOVES, just no slide */
  .nk-sg__seg { transition: none; }
}
`;

/**
 * One Nockerl segmented control, the unit the spec documents. A recessed track
 * holds N connected segments; ONE cyan pill SLIDES to the active segment (the
 * fill never tweens; only transform + width animate). role="radiogroup" with roving
 * tabindex; Arrow/Home/End move AND select; Space/Enter select.
 */
export const NockerlSegmentedControl = forwardRef<HTMLDivElement, NockerlSegmentedControlProps>(function NockerlSegmentedControl({
  segments,
  value,
  onChange,
  label,
  size = 'md',
  orientation = 'horizontal',
  fullWidth = false,
  disabled = false,
  className,
  ...rest
}, ref) {
  const segRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const vertical = orientation === 'vertical';
  // pos/size are the active segment's main-axis offset + extent (x/width when horizontal,
  // y/height when vertical). The pill slides along that axis.
  const [pill, setPill] = useState<{ pos: number; size: number } | null>(null);
  // Flips true once the real measured pill position exists (see useLayoutEffect).
  // Until then the CSS fallback paints cyan on the active segment (flash-free).
  const [measured, setMeasured] = useState(false);

  const enabledIdx = segments.map((s, i) => (s.disabled ? -1 : i)).filter((i) => i >= 0);
  const fallback = enabledIdx[0] ?? 0;
  const selIdx = segments.findIndex((s) => s.value === value && !s.disabled);
  // Roving tabindex: only the selected segment is tabbable (else first enabled).
  const tabbable = selIdx >= 0 ? selIdx : fallback;

  // Measure the active segment so the pill aligns EXACTLY over it (equal insets),
  // and re-measure on resize / size / value / segment changes.
  useLayoutEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const el = segRefs.current[selIdx >= 0 ? selIdx : -1];
      if (!track || !el) {
        setPill(null);
        return;
      }
      // offsetLeft/offsetTop is already relative to the track's padding box, so the
      // pill's base (left:0 horizontal, top:0 vertical) + this offset lands it on the
      // segment with a uniform inset matching the fixed cross-axis edges.
      setPill(
        vertical
          ? { pos: el.offsetTop, size: el.offsetHeight }
          : { pos: el.offsetLeft, size: el.offsetWidth },
      );
      // The real position now exists: retire the pre-measure CSS fallback and let
      // the measured pill take over. Runs before paint, so the swap is seamless.
      setMeasured(true);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, [selIdx, size, fullWidth, segments, vertical]);

  const move = (from: number, dir: 1 | -1) => {
    if (enabledIdx.length === 0) return;
    const pos = enabledIdx.indexOf(from);
    const seed = pos >= 0 ? pos : 0;
    const next = enabledIdx[(seed + dir + enabledIdx.length) % enabledIdx.length]!;
    segRefs.current[next]?.focus();
    onChange?.(segments[next]!.value);
  };

  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(idx, 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(idx, -1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const first = enabledIdx[0];
      if (first != null) {
        segRefs.current[first]?.focus();
        onChange?.(segments[first]!.value);
      }
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = enabledIdx[enabledIdx.length - 1];
      if (last != null) {
        segRefs.current[last]?.focus();
        onChange?.(segments[last]!.value);
      }
    }
  };

  return (
    <div
      {...rest}
      ref={(el) => {
        // Merge the internal measurement track ref with the forwarded ref so BOTH run:
        // the pill measurement keeps its element, and a consumer gets the group root.
        trackRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      data-measured={measured ? 'true' : 'false'}
      className={[
        'nk-sg',
        `nk-sg--${size}`,
        vertical ? 'nk-sg--vertical' : '',
        fullWidth ? 'nk-sg--full' : '',
        disabled ? 'nk-sg--disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        aria-hidden="true"
        className={`nk-sg__pill${pill ? '' : ' nk-sg__pill--hidden'}`}
        style={
          pill
            ? vertical
              ? { transform: `translateY(${pill.pos}px)`, height: `${pill.size}px` }
              : { transform: `translateX(${pill.pos}px)`, width: `${pill.size}px` }
            : undefined
        }
      />
      {segments.map((s, i) => {
        const checked = s.value === value;
        const inert = disabled || s.disabled;
        const iconOnly = !!s.icon && !s.label;
        return (
          <button
            key={s.value}
            ref={(el) => {
              segRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={iconOnly ? s.title ?? s.value : undefined}
            tabIndex={i === tabbable && !inert ? 0 : -1}
            disabled={inert}
            className={`nk-sg__seg${iconOnly ? ' nk-sg__seg--icon' : ''}`}
            onClick={inert ? undefined : () => onChange?.(s.value)}
            onKeyDown={inert ? undefined : (e) => onKeyDown(e, i)}
          >
            {s.icon && <span className="nk-sg__ico">{SEGMENT_ICONS[s.icon]}</span>}
            {s.label && <span className="nk-sg__txt">{s.label}</span>}
          </button>
        );
      })}
      <style>{NOCKERL_SEGMENTED_CONTROL_STYLES}</style>
    </div>
  );
});

/** LEAF: the segmented-control primitive; renders a role="radiogroup" wrapper whose
 *  segments are <button role="radio"> elements. It owns those raw roles + button.
 *  `segments` is a data array (not a slot); the sliding pill is presentational. */
export const compose = {
  tier: 'leaf',
  owns: ['button', 'role=radiogroup', 'role=radio'],
} satisfies ComposeContract;

export default NockerlSegmentedControl;
