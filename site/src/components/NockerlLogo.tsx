/**
 * NockerlLogo: the REAL Nockerl brand mark as inline SVG, for the docs demos.
 *
 * The canonical three-peaks mark exactly as it ships in the apps: three OVERLAPPING
 * triangles painted in THREE DISTINCT grayscale shades (the shade difference is what
 * gives the mark its layered, dimensional look; a single flat fill is WRONG). Identical
 * geometry + ink across every shipped surface:
 *   • Voice (Swift): NockerlVoice/UI/NockerlLogo.swift (ZStack of 3 Paths, onDark/onLight)
 *   • Android:       res/drawable/ic_nockerl_logo{,_light,_dark}.xml
 *   • Web dashboard: frontend/components/NockerlLogo.tsx (3 polygons, two fill sets)
 * all on viewBox="16 20 64 56", three peaks on a y=72 baseline, drawn left→center→right.
 *
 * The mark is MONOCHROME GRAYSCALE, recolored per theme, NEVER cyan/sky/teal:
 *   • on a DARK surface  → LIGHT ink  (logo.inverse* tokens)  [left / center / right]
 *   • on a LIGHT surface → DARK ink   (logo.ink* tokens)
 *
 * DEFAULT: theme-aware. The mark reads the ancestor `[data-theme]` and paints the right
 * ladder automatically (light ink on dark, dark ink on light). Use `tone` to FORCE a
 * ladder regardless of theme (e.g. a knockout tile pinned to a dark surface). Use `mono`
 * for a single-ink silhouette (e.g. a menu-bar template), which honors `color`.
 */
import type { CSSProperties } from 'react';
import { type ComposeContract } from '@dizyx/nockerl-react';

/** Force a shipped ink ladder regardless of the page theme.
 *  'dark'  = LIGHT ink (for a DARK surface); 'light' = DARK ink (for a LIGHT surface). */
export type NockerlLogoTone = 'light' | 'dark';

export interface NockerlLogoProps {
  /** Rendered height in px. Keeps the native 64×56 (8:7) ratio → width = size * 8/7. Default 24. */
  size?: number;
  /** Force a ladder regardless of theme. Omit for theme-aware (recommended). */
  tone?: NockerlLogoTone;
  /** Single-ink silhouette (no shade ladder), honoring `color` (default currentColor). For menu-bar-style marks. */
  mono?: boolean;
  /** Single-ink color when `mono`. Default 'currentColor'. */
  color?: string;
  /** Draw the cyan ground line the peaks stand on. This is what makes the mark read
   *  as the parent brand rather than as one of the app icons. Default true. */
  ground?: boolean;
  /** Accessible name (role="img"). Default "Nockerl". */
  title?: string;
  /** Hide from assistive tech (aria-hidden); use beside a visible wordmark. */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}

const VIEW_BOX = '16 20 64 60';
const NATIVE_W = 64;
const NATIVE_H = 60;

// Paint order matches the apps: left, center, right (left behind, right in front).
const PEAKS = [
  { cls: 'nk-mark__p1', points: '20,72 36,36 52,72' }, // left
  { cls: 'nk-mark__p2', points: '32,72 48,24 64,72' }, // center (tallest)
  { cls: 'nk-mark__p3', points: '44,72 60,32 76,72' }, // right
] as const;

// The mark's monochrome ink system is TOKENIZED (color.core.logo.*, law §11:
// monochrome everywhere; cyan lives only in the lockup's product word). Same values,
// single-sourced for web + Compose + Swift. var() resolves in both the inline
// (tone-forced) fills and the themed MARK_CSS interpolation below.
const INK: Record<NockerlLogoTone, [string, string, string]> = {
  dark: ['var(--color-core-logo-inverse)', 'var(--color-core-logo-inverse-hi)', 'var(--color-core-logo-inverse-lo)'], // light ink, for DARK surfaces
  light: ['var(--color-core-logo-ink)', 'var(--color-core-logo-ink-hi)', 'var(--color-core-logo-ink-lo)'], // dark ink, for LIGHT surfaces
};

// Theme-aware fills: default (light/no data-theme) = dark ink; [data-theme=dark] = light
// ink. Scoped to the .nk-mark class so it only paints this mark. Injected with the SVG;
// duplicate identical blocks across instances are harmless (CSS dedupes in effect).
const MARK_CSS = `
.nk-mark .nk-mark__p1{fill:${INK.light[0]}}.nk-mark .nk-mark__p2{fill:${INK.light[1]}}.nk-mark .nk-mark__p3{fill:${INK.light[2]}}
[data-theme='dark'] .nk-mark .nk-mark__p1,[data-theme='dark'].nk-mark .nk-mark__p1{fill:${INK.dark[0]}}
[data-theme='dark'] .nk-mark .nk-mark__p2,[data-theme='dark'].nk-mark .nk-mark__p2{fill:${INK.dark[1]}}
[data-theme='dark'] .nk-mark .nk-mark__p3,[data-theme='dark'].nk-mark .nk-mark__p3{fill:${INK.dark[2]}}
`;

/**
 * The Nockerl mark: the canonical three-peaks, three-shade silhouette.
 *
 * @example
 * <NockerlLogo size={28} />                 // theme-aware (recommended)
 * <NockerlLogo size={40} tone="dark" />     // force light ink (on a known dark surface)
 * <NockerlLogo size={18} mono />            // single-ink template (inherits color)
 */
export function NockerlLogo({
  size = 24,
  tone,
  mono = false,
  ground = true,
  color = 'currentColor',
  title = 'Nockerl',
  decorative = false,
  className,
  style,
}: NockerlLogoProps) {
  const width = (size * NATIVE_W) / NATIVE_H;
  const themed = !tone && !mono;
  const rootClass = ['nk-mark', className].filter(Boolean).join(' ');

  const fillFor = (i: number): CSSProperties | undefined => {
    if (mono) return { fill: color };
    if (tone) return { fill: INK[tone][i] };
    return undefined; // themed via CSS class
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={VIEW_BOX}
      width={width}
      height={size}
      className={rootClass}
      style={style}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative ? true : undefined}
    >
      {!decorative && <title>{title}</title>}
      {themed && <style>{MARK_CSS}</style>}
      {PEAKS.map((p, i) => (
        <polygon key={p.cls} className={p.cls} points={p.points} style={fillFor(i)} />
      ))}
      {ground && (
        <line
          className="nk-mark__ground"
          x1="18" y1="74.5" x2="78" y2="74.5"
          strokeWidth="4"
          strokeLinecap="round"
          style={{ stroke: 'var(--color-accent-primary, #0cc0df)' }}
        />
      )}
    </svg>
  );
}

/** LEAF: the brand mark as inline SVG (svg/title/polygon). A pure visual glyph: no
 *  facsimile elements, no child design-components, no slots. Owns nothing. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlLogo;
