/**
 * AvatarDemo: the live, interactive Nockerl avatar island for the web platform.
 *
 * The NockerlAvatar primitive itself lives in ../primitives/NockerlAvatar (the canonical home for
 * the image → initials → icon fallback ladder, the size ramp, circle/rounded, the
 * presence dot, and the overlapping +N stack). This island only composes it: the
 * demo chrome, the dark-stage portraits, and the showcase that the NockerlAvatar page mounts.
 *
 * Implements the design laws verbatim (encoded in the primitive):
 *   • depth = neutral drop shadow + a TOP catch-light (inset highlight). NO glow,
 *     NO colored shadow; the cyan never emits. A status dot is a SHAPE, not a halo.
 *   • the fill is STATIC; interactive feedback animates brightness + transform +
 *     neutral shadow only, never a fill/gradient swap.
 *   • a tappable avatar is a real <button> (one accessible name) with an OUTLINE
 *     focus-visible ring, never a colored shadow.
 *   • cyan is reserved: initials tints come from the categorical DATA ramp, never
 *     the brand accent; the presence dot uses STATUS tokens.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a `var(--token)` (see
 * docs/demo-token-contract.md). The dark stage resolves them to the dark palette;
 * change a token and this demo moves with everything else. Literals remain only
 * for pure geometry (image data-URIs, the dot/notch math, transition curves).
 */
import { useState } from 'react';
import { NockerlAvatar, NockerlAvatarStack, type NockerlAvatarSize } from '@dizyx/nockerl-react';

// The demo wrapper sets --nk-av-ground (the host surface the presence-dot notch +
// stack ring punch against): the canvas by default, a card surface inside .nk-av-card.
const STYLES = `
.nk-av-demo { font-family: var(--font-family-sans); --nk-av-ground: var(--color-canvas); }
.nk-av-demo .nk-av-card { --nk-av-ground: var(--color-card-surface1); }

/* demo chrome */
.nk-av-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-av-demo__sec + .nk-av-demo__sec { margin-top: var(--space-6); }
.nk-av-demo__row { display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: center; }
.nk-av-demo__card {
  background: var(--color-card-surface1); border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card); padding: var(--space-4) var(--space-5);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-av-demo__cap { font-size: var(--font-size-10); color: var(--color-on-canvas-muted); margin: var(--space-2) 0 0; text-align: center; }
.nk-av-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-6); }
.nk-av-demo__count b { color: var(--color-accent-primary); }
`;

// Real-ish portraits (tiny inline SVG gradients) so the image path renders without
// a network dependency. Geometry/data only, no design tokens involved.
const face = (a: string, b: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='80' height='80' fill='url(%23g)'/><circle cx='40' cy='32' r='15' fill='%23ffffffcc'/><rect x='16' y='52' width='48' height='34' rx='17' fill='%23ffffffcc'/></svg>`,
  )}`;
const IMG_PAT = face('#0cc0df', '#0a9bb5');
const IMG_ALEX = face('#818cf8', '#4f46e5');

const SIZES: NockerlAvatarSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const TEAM = [
  { name: 'Ada Lovelace', src: IMG_PAT },
  { name: 'Alex Rivera', src: IMG_ALEX },
  { name: 'Sam Okafor' },
  { name: 'Jordan Lee' },
  { name: 'Riya Sharma' },
  { name: 'Chris Danull' },
  { name: 'Mina Park' },
];

/**
 * The interactive showcase mounted on the NockerlAvatar page: the three fallback tiers
 * (image / initials / icon), the size ramp, circle vs rounded-square, every
 * presence state (with the streaming dot pulsing), a disabled/offline avatar, a
 * tappable avatar (tab to it, click it), and an overlapping stack with a "+N"
 * overflow chip, all token-driven on the dark stage.
 */
export default function AvatarDemo() {
  const [taps, setTaps] = useState(0);
  return (
    <div className="nk-av-demo">
      <style>{STYLES}</style>

      <section className="nk-av-demo__sec">
        <p className="nk-av-demo__lbl">Fallback ladder: image → initials → icon</p>
        <div className="nk-av-demo__row">
          <div><div style={{ display: 'flex', justifyContent: 'center' }}><NockerlAvatar src={IMG_PAT} name="Ada Lovelace" size="xl" /></div><p className="nk-av-demo__cap">Image</p></div>
          <div><div style={{ display: 'flex', justifyContent: 'center' }}><NockerlAvatar name="Alex Rivera" size="xl" /></div><p className="nk-av-demo__cap">Initials</p></div>
          <div><div style={{ display: 'flex', justifyContent: 'center' }}><NockerlAvatar name="Mina Park" size="xl" /></div><p className="nk-av-demo__cap">Initials</p></div>
          <div><div style={{ display: 'flex', justifyContent: 'center' }}><NockerlAvatar size="xl" /></div><p className="nk-av-demo__cap">NockerlIcon</p></div>
          <div><div style={{ display: 'flex', justifyContent: 'center' }}><NockerlAvatar src="https://invalid.example/x.png" name="Sam Okafor" size="xl" /></div><p className="nk-av-demo__cap">Broken src → initials</p></div>
        </div>
      </section>

      <section className="nk-av-demo__sec">
        <p className="nk-av-demo__lbl">Sizes: xs · sm · md · lg · xl</p>
        <div className="nk-av-demo__row">
          {SIZES.map((s) => <NockerlAvatar key={s} src={IMG_PAT} name="Ada Lovelace" size={s} />)}
          {SIZES.map((s) => <NockerlAvatar key={`i${s}`} name="Riya Sharma" size={s} />)}
        </div>
      </section>

      <section className="nk-av-demo__sec">
        <p className="nk-av-demo__lbl">Shape: circle (Android default) vs rounded square</p>
        <div className="nk-av-demo__row">
          <NockerlAvatar src={IMG_ALEX} name="Alex Rivera" size="lg" shape="circle" />
          <NockerlAvatar name="Jordan Lee" size="lg" shape="circle" />
          <NockerlAvatar src={IMG_ALEX} name="Alex Rivera" size="lg" shape="rounded" />
          <NockerlAvatar name="Jordan Lee" size="lg" shape="rounded" />
        </div>
      </section>

      <section className="nk-av-demo__sec">
        <p className="nk-av-demo__lbl">Presence: status dot, bottom-right (streaming pulses)</p>
        <div className="nk-av-demo__row">
          <div><div style={{ display: 'flex', justifyContent: 'center' }}><NockerlAvatar src={IMG_PAT} name="Ada Lovelace" size="lg" presence="active" /></div><p className="nk-av-demo__cap">active</p></div>
          <div><div style={{ display: 'flex', justifyContent: 'center' }}><NockerlAvatar src={IMG_PAT} name="Ada Lovelace" size="lg" presence="streaming" /></div><p className="nk-av-demo__cap">streaming</p></div>
          <div><div style={{ display: 'flex', justifyContent: 'center' }}><NockerlAvatar name="Riya Sharma" size="lg" presence="attention" /></div><p className="nk-av-demo__cap">attention</p></div>
          <div><div style={{ display: 'flex', justifyContent: 'center' }}><NockerlAvatar name="Sam Okafor" size="lg" presence="idle" /></div><p className="nk-av-demo__cap">idle</p></div>
          <div><div style={{ display: 'flex', justifyContent: 'center' }}><NockerlAvatar name="Chris Daull" size="lg" presence="offline" /></div><p className="nk-av-demo__cap">offline</p></div>
          <div><div style={{ display: 'flex', justifyContent: 'center' }}><NockerlAvatar src={IMG_ALEX} name="Alex Rivera" size="lg" disabled presence="idle" /></div><p className="nk-av-demo__cap">disabled</p></div>
        </div>
      </section>

      <section className="nk-av-demo__sec">
        <p className="nk-av-demo__lbl">Interactive: the top-bar avatar (tab to it, click it)</p>
        <div className="nk-av-demo__row nk-av-card nk-av-demo__card" style={{ display: 'inline-flex', gap: 'var(--space-3)' }}>
          <NockerlAvatar src={IMG_PAT} name="Ada Lovelace" size="md" presence="active" onClick={() => setTaps((t) => t + 1)} />
          <NockerlAvatar name="Jordan Lee" size="md" onClick={() => setTaps((t) => t + 1)} />
          <NockerlAvatar size="md" onClick={() => setTaps((t) => t + 1)} />
        </div>
      </section>

      <section className="nk-av-demo__sec">
        <p className="nk-av-demo__lbl">Group / stack: overlap + “+N” overflow chip</p>
        <div className="nk-av-demo__row">
          <NockerlAvatarStack people={TEAM} max={4} size="md" />
          <NockerlAvatarStack people={TEAM} max={6} size="sm" />
          <NockerlAvatarStack people={TEAM.slice(0, 3)} max={4} size="lg" />
        </div>
      </section>

      <p className="nk-av-demo__count">
        NockerlAvatar tapped <b>{taps}</b> {taps === 1 ? 'time' : 'times'}. The island is live.
      </p>
    </div>
  );
}
