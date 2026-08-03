/**
 * FeatureCards: the four claims on the documentation home page.
 *
 * These were Starlight's own Card and CardGrid, which meant the design
 * framework's front page was demonstrating another system's components, another
 * system's icon set, and a staggered grid that reads as broken alignment. A
 * framework that does not use itself on its own home page is not credible.
 *
 * Built from NockerlSurface at the resting elevation, on a plain even grid.
 */
import { NockerlSurface } from '@dizyx/nockerl-react';

type Feature = { title: string; body: React.ReactNode };

const FEATURES: Feature[] = [
  {
    title: 'Tokens, not values',
    body: (
      <>
        Every color, type ramp, space, radius, elevation and motion value is a token.
        Hardcoding a hex or a radius in a client is a bug: clients consume{' '}
        <code>@dizyx/nockerl-tokens</code>.
      </>
    ),
  },
  {
    title: 'Cyan is the only accent',
    body: (
      <>
        One brand anchor, cyan <code>#0CC0DF</code>, on mono surfaces. Warm tones are
        status signals, never decoration.
      </>
    ),
  },
  {
    title: 'Depth without glow',
    body: (
      <>
        Depth is a neutral drop shadow plus a top catch-light, lit from a single source
        above. No glows, no colored shadows. A colored <code>box-shadow</code> is a defect.
      </>
    ),
  },
  {
    title: 'Three platforms, one spine',
    body: (
      <>
        Brand expression is unified and interaction is platform-honest: web hover and focus
        ring, Android ripple and haptics, macOS pointer, each documented per component.
      </>
    ),
  },
];

export default function FeatureCards() {
  return (
    <div className="nk-features not-content">
      {FEATURES.map((f) => (
        <NockerlSurface key={f.title} level={1} className="nk-features__card">
          <h3 className="nk-features__title">{f.title}</h3>
          <p className="nk-features__body">{f.body}</p>
        </NockerlSurface>
      ))}
      <style>{`
        .nk-features {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4);
          margin: var(--space-6) 0;
          align-items: stretch;
        }
        @media (max-width: 46rem) { .nk-features { grid-template-columns: 1fr; } }
        .nk-features__card { padding: var(--space-5); height: 100%; }
        /* Ink is the on-CARD pair, not on-canvas: these sit on a lifted surface, not the ground. */
        .nk-features__title {
          margin: 0 0 var(--space-2);
          font-family: var(--type-title-medium-font-family);
          font-weight: var(--type-title-medium-font-weight);
          font-size: var(--type-title-medium-font-size);
          line-height: var(--type-title-medium-line-height);
          letter-spacing: var(--font-tracking-snug);
          color: var(--color-on-card);
        }
        .nk-features__body {
          margin: 0;
          font-family: var(--type-body-medium-font-family);
          font-weight: var(--type-body-medium-font-weight);
          font-size: var(--type-body-medium-font-size);
          line-height: var(--type-body-medium-line-height);
          color: var(--color-on-card-muted);
        }
      `}</style>
    </div>
  );
}
