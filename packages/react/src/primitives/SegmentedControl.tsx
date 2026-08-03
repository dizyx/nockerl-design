/**
 * NockerlSegmentedControl is the Tier-1 segmented-control primitive. ONE home for the
 * neutral hairline track, the ONE sliding cyan OUTLINE (measured + transformed), the
 * label cross-fade, the role="radiogroup" + roving-tabindex keyboard model, and
 * the segmented RULE, so a future segmented-control change is ONE edit, not many.
 * Composes ONLY tokens (and the NockerlIcon primitive for its glyphs).
 *
 * The CANONICAL connected single-track view/mode switch: touching segments on one
 * neutral hairline track with ONE sliding cyan outline gliding to the active segment. It
 * makes the inline toggles already shipped in App shell (layout) and Diff viewer (Unified
 * / Split) into one reusable component that now has a sliding indicator.
 *
 * DELIBERATELY DISTINCT from its neighbours:
 *   • NOT tabs: no associated tabpanels, not page/section wayfinding; it flips a
 *     small set of mutually-exclusive VIEWS/MODES. So the ARIA is
 *     role="radiogroup" + role="radio" (single-select), never tablist/tab.
 *   • more compact + CONNECTED than a radio group. Peers share one track, no
 *     per-option description; reach for it for 2-5 equal peers, reach for
 *     radio-group when options need descriptions or there are 4+ rich choices.
 *
 * The approved variant is the one the Swift package ships, which is what the macOS
 * application uses. This component carries that exact recipe:
 *   • Track: a NEUTRAL divider hairline on the control radius, ZERO fill and no recessed
 *     inset-shade, grouping the segments as connected peers.
 *   • Indicator: the SELECTED segment wears a thin accent BORDER at the selection weight
 *     and opacity, with no fill, and it SLIDES between segments as a position-only
 *     transform. Nothing tweens its colour.
 *   • Labels: selected is accent ink at medium weight, because with no fill beneath it the
 *     on-accent pick is moot; unselected stays muted.
 * The published Compose control still fills its active segment, so Android is the platform
 * that lags here and will be revisited when it converts.
 *
 * Design laws encoded here (do not re-derive in a demo): which peer is active is a STATE,
 * so it reads by OUTLINE and never by fill (law 6). The indicator is ONE element whose
 * colour never tweens; it SLIDES (translateX) and resizes, both interpolatable, and labels
 * cross-fade colour (law 7). 12px control radius (a rounded rectangle, not a stadium). Cyan
 * is the selection signal only. Focus is an OUTLINE. A real control: roving tabindex (ONE
 * tab stop), Arrow/Home/End move AND select, Space/Enter select, >=24px target, a disabled
 * segment is skipped but legible. prefers-reduced-motion: the indicator still MOVES, it
 * just teleports.
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

// The TRACK is a flat neutral hairline container with zero fill: it groups connected peers
// and nothing more. The INDICATOR is ONE element wearing the selection-weight cyan edge; it
// SLIDES (transform) and resizes to the active segment. Labels cross-fade colour only, and
// no fill exists to tween. All values are tokens; literals are pure geometry and curves.
export const NOCKERL_SEGMENTED_CONTROL_STYLES = `
/* The TRACK is a FLAT NEUTRAL HAIRLINE container (law 6, reduce-fills): ZERO fill and no
   recessed inset-shade. It groups the segments as connected peers, and stripping it degrades
   the control to Tabs. 12px rounded rect, never a stadium; inset so the indicator nests. */
.nk-sg { position: relative; display: inline-flex; align-items: stretch;
  background: none; border: var(--space-px) solid var(--color-divider);
  border-radius: var(--radius-control); padding: var(--space-0-5); }
.nk-sg--full { display: flex; width: 100%; }
.nk-sg--disabled { opacity: .55; cursor: not-allowed; }   /* dimmed but still legible */

/* The sliding INDICATOR: one element wearing the selection-weight cyan BORDER and NO fill
   (law 6: which peer is active is a STATE, so it reads by outline). It SLIDES (transform)
   and resizes, both interpolatable, and its colour never tweens (law 7). border-box keeps
   the measured width exact once the border is added. */
.nk-sg__pill { position: absolute; top: var(--space-0-5); bottom: var(--space-0-5); left: 0;
  box-sizing: border-box;
  border-radius: calc(var(--radius-control) - var(--space-0-5));   /* nests one step inside */
  background: none;
  border: var(--border-width-selection) solid color-mix(in srgb, var(--color-accent-primary) calc(var(--border-opacity-selection) * 100%), transparent);
  transition: transform .26s var(--motion-easing-standard), width .26s var(--motion-easing-standard), height .26s var(--motion-easing-standard); pointer-events: none; z-index: 0; }
.nk-sg__pill--hidden { opacity: 0; }   /* before first measure / no selection */
/* VERTICAL orientation stacks segments (column); the indicator spans the track WIDTH
   (left/right inset) and slides on Y (translateY + height) instead of X. The hairline track,
   the cyan edge, and the pre-measure fallback are all axis-agnostic and unchanged. */
.nk-sg--vertical { flex-direction: column; }
.nk-sg--vertical .nk-sg__pill { top: 0; bottom: auto; left: var(--space-0-5); right: var(--space-0-5); }

/* PRE-MEASURE fallback (flash-free first paint). Before useLayoutEffect measures the active
   segment (SSR / pre-hydration) the indicator has no position yet, so paint the SAME cyan
   edge directly on the ACTIVE segment. Every segment already reserves a transparent border of
   the same weight, so this only recolours it and can never shift layout. Retired the instant
   data-measured becomes true. A no-selection control has no aria-checked segment, so it
   correctly shows nothing. */
.nk-sg:not([data-measured="true"]) .nk-sg__seg[aria-checked="true"] {
  border-color: color-mix(in srgb, var(--color-accent-primary) calc(var(--border-opacity-selection) * 100%), transparent); }

/* A SEGMENT takes an equal share, label centered on both axes, layered above the indicator.
   The transparent border is a RESERVATION: it keeps the box identical whether or not the
   pre-measure fallback is painting, so nothing reflows on hydration. Inactive = muted ink;
   only colour and weight cross-fade, never a fill. */
.nk-sg__seg { position: relative; z-index: 1; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2); border: var(--border-width-selection) solid transparent; background: transparent; cursor: pointer; white-space: nowrap;
  border-radius: calc(var(--radius-control) - var(--space-0-5)); font-family: inherit;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-regular); transition: color .2s, font-weight .2s, border-color .2s; }
.nk-sg--full .nk-sg__seg { flex: 1 1 0; }              /* equal-width when stretched */
/* Selected ink is CYAN-on-plain: with no fill beneath it, the on-accent pick is moot. */
.nk-sg__seg[aria-checked="true"] { color: var(--color-accent-primary); font-weight: var(--font-weight-medium); }
.nk-sg__seg:not([aria-checked="true"]):not(:disabled):hover { color: var(--color-on-card); }
.nk-sg__seg:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
.nk-sg__seg:disabled { cursor: not-allowed; color: var(--color-on-card-muted); opacity: .5; }

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
 * One Nockerl segmented control, the unit the spec documents. A neutral hairline track
 * holds N connected segments; ONE cyan outline SLIDES to the active segment (its colour
 * never tweens; only transform and width animate). role="radiogroup" with roving
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
