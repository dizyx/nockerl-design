/**
 * Custom Style Dictionary transforms for the Nockerl design tokens.
 *
 * The token source authors alpha colors as `#RRGGBBAA` (CSS order). Built-in
 * transforms cover most of what we need; these add the few platform-specific
 * value shapes the built-ins don't:
 *
 *  - `color/css-hex8`  keep alpha colors as `#RRGGBBAA` for CSS (the built-in
 *                      `color/css` rewrites them to `rgba()`, which we don't want).
 *  - `size/px-dp`      strip `px`, append `.dp`   (Compose radius/elevation/space).
 *  - `size/px-sp`      strip `px`, append `.sp`   (Compose font sizes).
 *  - `size/px-cgfloat` strip `px` -> bare number  (Swift CGFloat dimensions).
 *
 * Compose colors and SwiftUI colors use the BUILT-IN `color/composeColor` and
 * `color/ColorSwiftUI` transforms (tinycolor2), which already perform the
 * `#RRGGBBAA` -> `0xAARRGGBB` reorder and the RGBA split respectively. Verified
 * against the authoritative app hexes (e.g. `#ffffff14` -> `0x14FFFFFF`).
 */
import type StyleDictionary from 'style-dictionary';
import { transformTypes } from 'style-dictionary/enums';

type SD = typeof StyleDictionary;

/** Match color tokens (DTCG `$type` or legacy `type`). */
function isColorToken(token: { $type?: string; type?: string }): boolean {
  return token.$type === 'color' || token.type === 'color';
}

/** True when a transformed token carries a px dimension value we can convert. */
function pxValue(token: { $value?: unknown; value?: unknown }): string | null {
  const raw = (token.$value ?? token.value) as unknown;
  if (typeof raw !== 'string') return null;
  return raw;
}

/** Read a numeric px value, tolerating a missing/zero unit. */
function pxToNumber(raw: string): number {
  return parseFloat(raw.replace(/px$/, ''));
}

const isDimension = (token: { $type?: string; type?: string }): boolean =>
  token.$type === 'dimension' || token.type === 'dimension';

/** radius / elevation / spacing / grid / density / semantic size / border -> dp on Compose. */
const isDpDimension = (token: { $type?: string; type?: string; path: string[] }): boolean =>
  isDimension(token) &&
  ['radius', 'elevation', 'space', 'grid', 'density', 'size', 'border'].includes(token.path[0] ?? '');

/** font size -> sp on Compose. */
const isSpDimension = (token: { $type?: string; type?: string; path: string[] }): boolean =>
  isDimension(token) && token.path[0] === 'font' && token.path[1] === 'size';

export function registerNockerlTransforms(sd: SD): void {
  // --- color/css-hex8: preserve #RRGGBBAA (lowercase) for CSS -----------------
  // Source values are already CSS-order hex (#RRGGBB / #RRGGBBAA); references have
  // been resolved to a hex by the time this value transform runs. We only need to
  // normalise case so alpha colors stay valid 8-digit CSS hex (NOT rewritten to
  // rgba(), which the built-in `color/css` would do).
  sd.registerTransform({
    name: 'color/css-hex8',
    type: transformTypes.value,
    transitive: true,
    filter: (token) => isColorToken(token),
    transform: (token, _config, options) => {
      const raw = (options?.usesDtcg ? token.$value : token.value) as string;
      return typeof raw === 'string' && raw.startsWith('#') ? raw.toLowerCase() : raw;
    },
  });

  // --- size/px-dp: "16px" -> "16.dp" (radius / elevation / space on Compose) --
  sd.registerTransform({
    name: 'size/px-dp',
    type: transformTypes.value,
    transitive: true,
    filter: (token) => isDpDimension(token),
    transform: (token) => {
      const raw = pxValue(token);
      if (raw === null) return token.$value ?? token.value;
      return `${pxToNumber(raw)}.dp`;
    },
  });

  // --- size/px-sp: "16px" -> "16.sp" (font sizes on Compose) -----------------
  sd.registerTransform({
    name: 'size/px-sp',
    type: transformTypes.value,
    transitive: true,
    filter: (token) => isSpDimension(token),
    transform: (token) => {
      const raw = pxValue(token);
      if (raw === null) return token.$value ?? token.value;
      return `${pxToNumber(raw)}.sp`;
    },
  });

  // --- size/px-cgfloat: "16px" -> "16" (Swift CGFloat literal) ----------------
  sd.registerTransform({
    name: 'size/px-cgfloat',
    type: transformTypes.value,
    transitive: true,
    filter: (token) => isDimension(token),
    transform: (token) => {
      const raw = pxValue(token);
      if (raw === null) return token.$value ?? token.value;
      return `${pxToNumber(raw)}`;
    },
  });
}
