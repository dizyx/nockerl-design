/**
 * NockerlLockup is the canonical brand lockup: the three-peaks mark + "Nockerl"
 * (+ an optional product word), set in the Nockerl type system.
 *
 * Per design-laws §11 (the brand lockup): "Nockerl" runs EXTRALIGHT (200); the
 * product word runs REGULAR (400) in cyan; both are SENTENCE CASE (never
 * uppercase), set tight (-0.03em) with a tight gap. One lockup, all surfaces.
 *
 * TOKEN-REACTIVE (docs/demo-token-contract.md): the family, both weights, and the
 * product hue are all `var(--token)`s, so a type or color remodel flows through with
 * no edit here. The mark is the shared <NockerlLogo> (three-shade, theme-aware).
 * The wordmark ink is `currentColor`, so the lockup adopts whatever surface it
 * sits on (set the surrounding `color`); the product word is always the cyan
 * accent token.
 */
import type { CSSProperties } from 'react';
import NockerlLogo, { type NockerlLogoTone } from './NockerlLogo';
import { type ComposeContract } from '@dizyx/nockerl-react';

export interface NockerlLockupProps {
  /** Mark height in px; the wordmark is optically sized from it. Default 28. */
  size?: number;
  /** Optional product word (e.g. "Voice", "Dashboard", "Security"), set in cyan. */
  product?: string;
  /** Stack the wordmark beneath the mark instead of inline. */
  stacked?: boolean;
  /** Force the mark's ink ladder (passes through to NockerlLogo). Omit for theme-aware. */
  tone?: NockerlLogoTone;
  /** Hide from assistive tech; the visible word already names it. Default true. */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}

// All visual values are tokens. The two structural constants (the -0.03em brand
// tracking and the optical size/gap ratios) ARE the lockup spec (law §11), kept
// here so "one lockup" stays literally one definition.
const STYLES = `
.nk-lock { display: inline-flex; align-items: center; gap: calc(var(--nk-lock-h) * 0.34);
  font-family: var(--font-family-sans); line-height: 1; color: inherit; }
.nk-lock--stacked { flex-direction: column; gap: calc(var(--nk-lock-h) * 0.2); }
.nk-lock__wm { display: inline-flex; align-items: baseline; gap: 0.14em;
  font-size: calc(var(--nk-lock-h) * 0.9); letter-spacing: var(--font-tracking-tight); white-space: nowrap; }
.nk-lock__name { font-weight: var(--font-weight-extralight); color: currentColor; }
.nk-lock__prod { font-weight: var(--font-weight-regular); color: var(--color-accent-primary); }
`;

/**
 * The Nockerl lockup. `<NockerlLockup />` → mark + "Nockerl" (monochrome, 200);
 * `<NockerlLockup product="Voice" />` → adds the cyan 400 product word.
 *
 * @example
 * <NockerlLockup size={28} />                    // wordmark only (monochrome)
 * <NockerlLockup size={40} product="Voice" />    // product lockup (Nockerl + Voice)
 * <NockerlLockup size={56} product="Security" stacked />
 */
export function NockerlLockup({
  size = 28,
  product,
  stacked = false,
  tone,
  decorative = true,
  className,
  style,
}: NockerlLockupProps) {
  const styleVar = { ['--nk-lock-h']: `${size}px`, ...style } as CSSProperties;
  const rootClass = ['nk-lock', stacked ? 'nk-lock--stacked' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={rootClass} style={styleVar}>
      <style>{STYLES}</style>
      <NockerlLogo size={size} tone={tone} decorative={decorative} title="Nockerl" />
      <span className="nk-lock__wm">
        <span className="nk-lock__name">Nockerl</span>
        {product ? <span className="nk-lock__prod">{product}</span> : null}
      </span>
    </span>
  );
}

/** LEAF. The fixed brand lockup: the shared <NockerlLogo> + the "Nockerl" wordmark (span
 *  text) + an optional cyan product word. It composes its parts internally and exposes no
 *  caller slot (`product` is a string, not component content); renders no facsimile
 *  elements. Owns nothing. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlLockup;
