/**
 * BrandMarkDemo: the live Nockerl brand mark island for the docs site.
 *
 * The mark is the REAL Nockerl logo: the canonical three-peaks triangle, exactly
 * as it ships in the apps (Voice Swift `NockerlLogo`, Android
 * `ic_nockerl_logo_{light,dark}.xml`, web dashboard `NockerlLogo`). It is
 * MONOCHROME, a single-ink silhouette recolored per theme. There is NO
 * cyan/sky/teal logo and no faceted prism: the only two appearances are LIGHT ink
 * on a dark surface and DARK ink on a light surface, picked by the active
 * surface's luminance.
 *
 * This demo renders the shared <NockerlLogo> component, which paints every peak
 * with `currentColor` by default, so the mark inherits the surrounding text
 * color and adapts to light/dark for free. Every showcase tile therefore just
 * sets its own ink (a token), and the mark follows. Pass `tone="light"|"dark"`
 * only to force the exact shipped grayscale ladder.
 *
 * TOKEN-REACTIVE (docs/demo-token-contract.md): every color / font / radius /
 * spacing / type value here is a `var(--token)`. The page follows the theme, so
 * the canvas-resting marks recolor with it; the two fixed knockout tiles pin a
 * genuinely dark and a genuinely light surface (the core ink anchors) to prove
 * the same monochrome mark reads correctly on BOTH, regardless of the page theme.
 * No hardcoded logo color, no invented geometry: the shape lives entirely in the
 * shared component.
 */
import { useId } from 'react';
import type { CSSProperties } from 'react';
import NockerlLogo from '../NockerlLogo';
import NockerlLockup from '../NockerlLockup';
import { type ComposeContract } from '@dizyx/nockerl-react';

// The wordmark lockup is the shared <NockerlLockup>: "Nockerl" set in the sans
// token at EXTRALIGHT (200), with an optional product word at 400 in cyan. The one
// lockup definition lives in NockerlLockup.tsx; this demo only arranges it.
const STYLES = `
.nk-bm { font-family: var(--font-family-sans); color: var(--color-on-canvas); }

/* ── Section scaffolding ───────────────────────────────────────────────────── */
.nk-bm__sec + .nk-bm__sec { margin-top: var(--space-8); }
.nk-bm__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-bm__row { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; }
.nk-bm__row--base { align-items: flex-end; }   /* prove the wordmark baseline-aligns */
/* : product lockups stack in a COLUMN (left-aligned) so the "Nockerl" edges line up and each
   cyan product word is easy to compare down the column. */
.nk-bm__col { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-5); }
.nk-bm__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); }

/* ── NockerlSurface tiles ─────────────────────────────────────────────────────────── */
.nk-bm__tile {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--space-3); padding: var(--space-6); border-radius: var(--radius-card);
  border: var(--space-px) solid var(--color-card-hairline); position: relative; text-align: center;
}
/* Theme-following surfaces: the mark recolors with the page. */
.nk-bm__tile--canvas { background: var(--color-canvas-alt); color: var(--color-on-canvas); }
.nk-bm__tile--card { background: var(--color-card-surface1); color: var(--color-on-card);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* Fixed-polarity surfaces: pin a genuinely dark / light ground (the core ink
   anchors) so the SAME monochrome mark proves it reads on both. The mark's ink is
   currentColor, so we set the tile's text color to the opposite anchor. */
.nk-bm__tile--dark { background: var(--color-core-black); color: var(--color-core-white); border-color: transparent; }
.nk-bm__tile--light { background: var(--color-core-white); color: var(--color-core-black); border-color: transparent; }
.nk-bm__cap { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  font-weight: var(--font-weight-semibold); opacity: .72; }

/* ── Clearspace + minimum-size guides ──────────────────────────────────────── */
.nk-bm__clear { position: relative; display: inline-flex; padding: var(--bm-clear);
  border-radius: var(--radius-card); background: var(--color-canvas-alt);
  border: var(--space-px) solid var(--color-card-hairline); color: var(--color-on-canvas); }
/* the protected margin == half the mark height (the apex-to-base unit), drawn as a faint frame */
.nk-bm__clear::before { content: ""; position: absolute; inset: var(--bm-clear);
  border: var(--space-px) dashed color-mix(in srgb, var(--color-on-canvas) 28%, transparent); border-radius: var(--space-1); }
.nk-bm__minrow { display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: flex-end; }
.nk-bm__min { display: inline-flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.nk-bm__min__cap { font-size: var(--font-size-10); color: var(--color-on-canvas-muted); }
.nk-bm__min--floor { position: relative; }
.nk-bm__min--floor::after { content: "min"; position: absolute; top: calc(-1 * var(--space-4)); left: 50%; transform: translateX(-50%);
  font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; font-weight: var(--font-weight-semibold);
  color: var(--color-accent-primary); }

.nk-bm__hint { font-size: var(--font-size-12); line-height: var(--font-line-height-16);
  color: var(--color-on-canvas-muted); margin-top: var(--space-6); }
.nk-bm__hint b { color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); }
`;

/** LEAF: the BrandMark island lays out its showcase with div/section/p/span/h2 and
 *  composes the shared <NockerlLogo> / <NockerlLockup> internally. It renders no facsimile
 *  elements and exposes no caller slot (a fixed demo, not a wrapper). Owns nothing. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

/**
 * The Brand mark showcase mounted on the docs page. It documents the REAL,
 * monochrome three-peaks mark via the shared <NockerlLogo>:
 *  • the mark at a ramp of sizes (favicon → hero), recoloring with the page theme;
 *  • the same mark on a genuinely DARK surface and a genuinely LIGHT surface
 *    (knockout), both legible because it's a single-ink silhouette on currentColor;
 *  • the mark resting on the theme-following canvas + an elevated card;
 *  • clearspace (the protected margin) and the minimum legible size;
 *  • the wordmark lockup, horizontal (baseline-aligned) and stacked.
 * No cyan/prism, no accent switcher: the mark is monochrome by design.
 */
export default function BrandMarkDemo() {
  const headingId = useId();

  return (
    <div className="nk-bm" aria-labelledby={headingId}>
      <style>{STYLES}</style>
      <h2 id={headingId} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        Nockerl brand mark
      </h2>

      {/* Sizes: the mark inherits the page ink (currentColor), so it recolors with the theme. */}
      <section className="nk-bm__sec">
        <p className="nk-bm__lbl">The mark: favicon (16) · chip (20) · top bar (28) · card (40) · hero (88)</p>
        <div className="nk-bm__row" style={{ gap: 'var(--space-6)' }}>
          {[16, 20, 28, 40, 88].map((s) => (
            <NockerlLogo key={s} size={s} title="Nockerl" />
          ))}
        </div>
      </section>

      {/* Light vs dark surface: the SAME monochrome mark, proven on both polarities. */}
      <section className="nk-bm__sec">
        <p className="nk-bm__lbl">Monochrome: one mark, light ink on dark · dark ink on light</p>
        <div className="nk-bm__row" style={{ gap: 'var(--space-4)' }}>
          <div className="nk-bm__tile nk-bm__tile--dark">
            <NockerlLogo size={56} title="Nockerl on a dark surface" />
            <span className="nk-bm__cap">On dark, light ink</span>
          </div>
          <div className="nk-bm__tile nk-bm__tile--light">
            <NockerlLogo size={56} title="Nockerl on a light surface" />
            <span className="nk-bm__cap">On light, dark ink</span>
          </div>
        </div>
        <p className="nk-bm__hint">
          The mark is a single-ink silhouette that inherits <b>currentColor</b>. Set the surface ink and the mark follows.
          The apps pick the variant by the active surface luminance; there is <b>no</b> cyan logo.
        </p>
      </section>

      {/* On the theme-following surfaces: sits naturally in light AND dark page modes. */}
      <section className="nk-bm__sec">
        <p className="nk-bm__lbl">On surfaces: resting ground · elevated card (follows the page theme)</p>
        <div className="nk-bm__grid">
          <div className="nk-bm__tile nk-bm__tile--canvas">
            <NockerlLockup size={32} />
            <span className="nk-bm__cap">On ground</span>
          </div>
          <div className="nk-bm__tile nk-bm__tile--card">
            <NockerlLockup size={32} />
            <span className="nk-bm__cap">On elevated card</span>
          </div>
        </div>
      </section>

      {/* Clearspace + minimum size. */}
      <section className="nk-bm__sec">
        <p className="nk-bm__lbl">Clearspace: keep a margin of half the mark height clear on every side</p>
        <div className="nk-bm__row" style={{ gap: 'var(--space-8)', alignItems: 'flex-start' }}>
          <div className="nk-bm__clear" style={{ ['--bm-clear']: 'calc(64px * 0.5)' } as CSSProperties}>
            <NockerlLogo size={64} title="Nockerl with clearspace" />
          </div>
          <div>
            <p className="nk-bm__lbl">Minimum size: never render the mark below 16px tall</p>
            <div className="nk-bm__minrow">
              <div className="nk-bm__min nk-bm__min--floor">
                <NockerlLogo size={16} title="Nockerl at minimum size" />
                <span className="nk-bm__min__cap">16px</span>
              </div>
              <div className="nk-bm__min">
                <NockerlLogo size={24} decorative />
                <span className="nk-bm__min__cap">24px</span>
              </div>
              <div className="nk-bm__min">
                <NockerlLogo size={32} decorative />
                <span className="nk-bm__min__cap">32px</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wordmark lockup: mark + "Nockerl" (200), horizontal & stacked. */}
      <section className="nk-bm__sec">
        <p className="nk-bm__lbl">Wordmark lockup: mark + “Nockerl” (sans token · 200) · horizontal &amp; stacked</p>
        <div className="nk-bm__row nk-bm__row--base" style={{ gap: 'var(--space-8)' }}>
          <NockerlLockup size={40} />
          <NockerlLockup size={28} />
          <NockerlLockup size={48} stacked />
        </div>
      </section>

      {/* Product lockup: mark + "Nockerl" (200) + product word (400, cyan). */}
      <section className="nk-bm__sec">
        <p className="nk-bm__lbl">Product lockup: “Nockerl” 200 + product 400 in cyan · sentence case</p>
        <div className="nk-bm__col">
          <NockerlLockup size={32} product="Voice" />
          <NockerlLockup size={32} product="Dashboard" />
          <NockerlLockup size={32} product="Security" />
        </div>
      </section>

      <p className="nk-bm__hint">
        One monochrome mark, no second hue. Every instance above is the shared <b>NockerlLogo</b> painting with{' '}
        <b>currentColor</b>, so it tracks the surface ink and the page theme. The geometry is the canonical three-peaks
        shape shared by Android, Voice, and web. The island is live.
      </p>
    </div>
  );
}
