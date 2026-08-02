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
    <div className="nk-features">
      {FEATURES.map((f) => (
        <NockerlSurface key={f.title} elevation={1} className="nk-features__card">
          <h3 className="nk-features__title">{f.title}</h3>
          <p className="nk-features__body">{f.body}</p>
        </NockerlSurface>
      ))}
      <style>{`
        .nk-features {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4, 16px);
          margin: var(--space-6, 24px) 0;
          align-items: stretch;
        }
        @media (max-width: 46rem) { .nk-features { grid-template-columns: 1fr; } }
        .nk-features__card { padding: var(--space-5, 20px); height: 100%; }
        .nk-features__title {
          margin: 0 0 var(--space-2, 8px);
          font-family: var(--type-title-medium-font-family, 'Outfit'), sans-serif;
          font-weight: 500;
          font-size: 1.05rem;
          letter-spacing: -0.01em;
          color: var(--color-on-canvas, inherit);
        }
        .nk-features__body {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--color-on-canvas-muted, inherit);
        }
      `}</style>
    </div>
  );
}
