/**
 * CardDemo: the live, interactive Nockerl card island for the web platform.
 *
 * A card is the elevated SURFACE / container. It implements the depth law verbatim:
 *   • cards LIFT: a lighter fill (~#2C313A) one clear luminance step above the
 *     #0A0B0D canvas, a NEUTRAL drop shadow below, and a subtle ~1px top
 *     catch-light (lit-from-above sheen). The inverse of an input, which sinks.
 *   • 16px card radius, distinct from the 12px control radius and the full pill.
 *   • elevation ladder L1 to L4: the lift grows by shadow depth + a wider spread,
 *     NEVER by making the card lighter-gray (the luminance gap is constant).
 *   • an interactive card raises on hover and presses in on active. Feedback
 *     animates elevation + transform + brightness only; the fill never tweens.
 *   • NO glow, NO colored shadow, NO emission anywhere: depth is shadow + sheen.
 *
 * Styles are scoped via an `nk-card` class injected once, so the island is
 * self-contained and does not depend on the docs theme CSS (mirrors ButtonDemo).
 */
import { useState } from 'react';
import { NockerlSurface, type ComposeContract } from '@dizyx/nockerl-react';

export type CardElevation = 'l1' | 'l2' | 'l3' | 'l4';

export interface CardProps {
  /** Elevation rung: how far the surface lifts off the ground. */
  elevation?: CardElevation;
  /** Renders as a button: hover raises, press sinks, focus shows a ring. */
  interactive?: boolean;
  /** Drop the hairline border (depth then reads from shadow + sheen alone). */
  borderless?: boolean;
  /** Click handler, only meaningful when `interactive`. */
  onClick?: () => void;
  /** Accessible name when interactive (maps to the button's label). */
  ariaLabel?: string;
  children?: React.ReactNode;
}

// Cards lift off a dark ground. The fill is STATIC per rung; the elevation
// ladder grows the NEUTRAL shadow (--color-shadow-tint) by the --elevation-*
// blur, never the lightness. The top catch-light is an inset --color-surface-
// highlight hairline: a sheen, not a glow. Every visual value is a token.
const STYLES = `
.nk-card-demo {
  font-family: var(--font-family-sans);
  background: var(--color-canvas);
  padding: var(--space-8);
  border-radius: var(--radius-panel);
}
.nk-card {
  position: relative;
  color: var(--color-on-card);
  padding: var(--space-4);
}
/* Borderless keeps the 1px border BOX but makes it transparent (not flat/none, so
   layout is unchanged). Scoped to the demo root so it outranks NockerlSurface's base hairline
   regardless of the injected-style source order. */
.nk-card-demo .nk-card--borderless { border-color: transparent; }
/* Interactive card = a real button. Reset native button chrome. */
button.nk-card {
  display: block;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font: inherit;
  appearance: none;
  -webkit-appearance: none;
  transition: transform .14s cubic-bezier(.2,0,0,1), box-shadow .14s, filter .14s;
}
/* Hover RAISES (a rung up) + a hair brighter. Pointer platforms only. */
button.nk-card:hover {
  transform: translateY(-2px);
  filter: brightness(1.04);
  box-shadow: 0 var(--space-3) calc(var(--elevation-sheet) * 2) -9px color-mix(in srgb, var(--color-shadow-tint) 70%, transparent), var(--nk-surface-sheen);
}
/* Press SINKS in: settles toward the ground, shadow tucks under. */
button.nk-card:active {
  transform: translateY(0) scale(.992);
  filter: brightness(.98);
  box-shadow: 0 var(--space-0-5) var(--elevation-level3) -4px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen);
}
/* Focus is an OUTLINE ring (focus-visible cyan), never a colored shadow. */
button.nk-card:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-px); }
@media (prefers-reduced-motion: reduce) {
  button.nk-card { transition: none; }
}
.nk-card__eyebrow {
  font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2);
}
.nk-card__title { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-1); color: var(--color-on-card); }
.nk-card__body { font-size: var(--font-size-12); line-height: var(--font-line-height-20); color: var(--color-on-card-muted); margin: 0; }
.nk-card-demo__ladder {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-4);
}
.nk-card-demo__lbl {
  font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3);
}
.nk-card-demo__count { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-5); }
.nk-card-demo__count b { color: var(--color-accent-primary); }
.nk-card__rung { font-size: var(--font-size-28); font-weight: var(--font-weight-semibold); color: var(--color-on-card); line-height: 1; }
.nk-card__rung span { font-size: var(--font-size-12); color: var(--color-on-card-muted); font-weight: var(--font-weight-medium); margin-left: var(--space-1); }
.nk-card__hint { font-size: var(--font-size-12); color: var(--color-accent-primary); margin: var(--space-2) 0 0; font-weight: var(--font-weight-medium); }
`;

/** A single Nockerl card: the lifted surface the spec documents. */
export function Card({
  elevation = 'l2',
  interactive = false,
  borderless = false,
  onClick,
  ariaLabel,
  children,
}: CardProps) {
  const level = Number(elevation.slice(1)) as 1 | 2 | 3 | 4;
  const cls = `nk-card${borderless ? ' nk-card--borderless' : ''}`;
  if (interactive) {
    return (
      <NockerlSurface as="button" level={level} type="button" className={cls} onClick={onClick} aria-label={ariaLabel}>
        {children}
      </NockerlSurface>
    );
  }
  return <NockerlSurface level={level} className={cls}>{children}</NockerlSurface>;
}

const RUNGS: { level: CardElevation; px: string; use: string }[] = [
  { level: 'l1', px: '2px', use: 'Inline rows, chips' },
  { level: 'l2', px: '5px', use: 'Most cards' },
  { level: 'l3', px: '9px', use: 'Popovers, input bar' },
  { level: 'l4', px: '14px', use: 'Sheets, dialogs' },
];

/**
 * The interactive showcase mounted on the Card page: the elevation ladder
 * (L1 to L4) rendered as lifted surfaces on the dark ground, every rung the SAME
 * fill lifted only by a deeper neutral shadow + the top catch-light, plus a real
 * interactive (hoverable / pressable / focusable) card with a live click count.
 */
/** CONTAINER: the lifted card; composes NockerlSurface and wraps ANY design content. */
export const compose = {
  slots: { default: { accepts: '*' } },
} satisfies ComposeContract;

export default function CardDemo() {
  const [clicks, setClicks] = useState(0);
  return (
    <div className="nk-card-demo">
      <style>{STYLES}</style>

      <p className="nk-card-demo__lbl">Elevation ladder: same fill, deeper neutral shadow + top sheen</p>
      <div className="nk-card-demo__ladder">
        {RUNGS.map((r) => (
          <Card key={r.level} elevation={r.level}>
            <p className="nk-card__rung">
              {r.level.toUpperCase()}
              <span>{r.px}</span>
            </p>
            <p className="nk-card__body" style={{ marginTop: '10px' }}>{r.use}</p>
          </Card>
        ))}
      </div>

      <p className="nk-card-demo__lbl" style={{ marginTop: '26px' }}>
        Interactive: hover raises, press sinks, tab for the focus ring
      </p>
      <div className="nk-card-demo__ladder">
        <Card
          interactive
          elevation="l2"
          ariaLabel="Open session nockerl-cli"
          onClick={() => setClicks((c) => c + 1)}
        >
          <p className="nk-card__eyebrow">Session</p>
          <p className="nk-card__title">nockerl-cli</p>
          <p className="nk-card__body">A tappable surface: the whole card is one button.</p>
          <p className="nk-card__hint">Click me ›</p>
        </Card>
        <Card elevation="l2" borderless>
          <p className="nk-card__eyebrow">Static</p>
          <p className="nk-card__title">Borderless card</p>
          <p className="nk-card__body">No hairline: depth reads from the shadow + catch-light alone. Not interactive.</p>
        </Card>
      </div>

      <p className="nk-card-demo__count">
        Interactive card fired <b>{clicks}</b> {clicks === 1 ? 'time' : 'times'}. The island is live.
      </p>
    </div>
  );
}
