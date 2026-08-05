/**
 * NockerlIcon - the Tier-1 stroke-icon primitive. ONE home for the SVG shell every demo was
 * hand-rolling (the per-file 'stroke' const + the re-typed chevron). Composes ONLY
 * tokens; imports no other component (tier law: a primitive depends only on tokens).
 *
 * The shell matches the canonical Lucide-geometry convention the demos already use:
 * viewBox 0 0 24 24, fill none, currentColor stroke, strokeWidth 2, round caps. So
 * swapping an inline <svg> for <NockerlIcon> is a pixel-identical (no-op) refactor.
 *
 * Supply the glyph two ways:
 *   - name="chevronRight"  -> a registry entry (ICONS), for the common re-typed glyphs.
 *                             Use ONLY when the demo's path matches the entry exactly.
 *   - path="m9 6 6 6-6 6"  -> an exact path 'd' for anything bespoke (drawing math,
 *                             lint-exempt). Or pass <path/>/<circle/> as children for
 *                             multi-element glyphs. Same math the demo had -> no-op.
 *
 * Sizing: omit `size` to let surrounding CSS size the svg (the dominant demo pattern -
 * a wrapper sets the box). Or pass a number (px) or a scale key ('md') to set
 * width+height. ICON_SIZE mirrors the --icon-* tokens (tokens/core/dimension.json).
 */
import { forwardRef } from 'react';
import type { ReactNode, SVGAttributes } from 'react';
import type { ComposeContract } from '../compose-contract.js';

/** NockerlIcon-size scale (px) - mirrors the --icon-* CSS tokens. One home for the 12-24 ramp. */
export const ICON_SIZE = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24 } as const;
export type IconSizeToken = keyof typeof ICON_SIZE;

/**
 * Registry of common stroke glyphs (Lucide geometry, viewBox 0 0 24 24). Use a `name`
 * ONLY when the demo's path matches exactly; otherwise pass the exact `path` so the
 * migration stays a no-op. Grow this as repeated exact paths are promoted from demos.
 */
export const ICONS = {
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronDown: 'm6 9 6 6 6-6',
  chevronUp: 'm18 15-6-6-6 6',
  x: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
} as const;
export type IconName = keyof typeof ICONS;

export interface NockerlIconProps extends Omit<SVGAttributes<SVGSVGElement>, 'name' | 'children'> {
  /** Registry glyph (exact-match only - else use `path`). */
  name?: IconName;
  /** Exact path 'd' for a bespoke glyph. */
  path?: string;
  /** Multi-element glyph: raw <path>/<circle>/... children. */
  children?: ReactNode;
  /** width+height. number = px; scale key = ICON_SIZE[key]. Omit -> CSS sizes it. */
  size?: number | IconSizeToken;
  /** Accessible name -> role="img" + <title>. Omit -> decorative (aria-hidden). */
  title?: string;
}

export const NockerlIcon = forwardRef<SVGSVGElement, NockerlIconProps>(function NockerlIcon(
  { name, path, children, size, title, strokeWidth, className, ...rest },
  ref,
) {
  const px = size == null ? undefined : typeof size === 'number' ? size : ICON_SIZE[size];
  const d = path ?? (name ? ICONS[name] : undefined);
  return (
    <svg
      {...rest}
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      {d ? <path d={d} /> : children}
    </svg>
  );
});

/** LEAF: renders its own SVG shell (svg/path/title are not facsimiles). */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlIcon;
