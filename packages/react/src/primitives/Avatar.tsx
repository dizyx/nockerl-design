/**
 * NockerlAvatar: the Tier-1 avatar primitive. ONE home for the image → initials → icon
 * fallback ladder, the size ramp, the circle/rounded grammar, the presence dot, and
 * the overlapping group stack, so a future avatar change is ONE edit, not many.
 * Composes ONLY tokens.
 *
 * The look is sourced from the SHIPPED Android app: the avatar is a CIRCULAR
 * profile image (core/ui/GlobalTopBar.kt + AvatarSettingsSheet.kt, both CircleShape
 * + ContentScale.Crop), tappable to open settings. Android ships only the image
 * form; the fallbacks (initials / icon), the size ramp, the presence dot, and the
 * overlap stack are designed ORIGINALLY here from the design laws + the existing
 * component vocabulary (the same pickOnAccent luminance-contrast rule the controls
 * use, the BadgedBox "+N / 99+" overflow count, the Voice PulsingDot).
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   - depth = neutral drop shadow + a TOP catch-light (inset highlight). NO glow,
 *     NO colored shadow. The cyan never emits. A status dot is a SHAPE, not a halo.
 *   - the fill is STATIC; interactive feedback animates brightness + transform +
 *     neutral shadow only, never a fill/gradient swap.
 *   - a tappable avatar is a real button (one accessible name) with an OUTLINE
 *     focus-visible ring, never a colored shadow.
 *   - cyan is reserved: initials tints come from the categorical DATA ramp, never
 *     the brand accent; the presence dot uses STATUS tokens.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef, useState, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { NockerlIcon } from './Icon';
import type { ComposeContract } from '../compose-contract';

export type NockerlAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type NockerlAvatarShape = 'circle' | 'rounded';
export type Presence = 'active' | 'streaming' | 'attention' | 'idle' | 'offline';

/**
 * When `onClick` is set the avatar renders a real <button>, so it extends the native
 * button attributes (minus the ones it owns) + forwards a ref, making it fully
 * TRIGGER-COMPOSABLE: a popover / menu trigger passes onClick (WITH the event, to anchor
 * to e.currentTarget), onKeyDown / onFocus / onBlur, tabIndex, id, title, and
 * aria-haspopup / aria-expanded / aria-controls / aria-describedby straight through to the
 * <button>, and the ref reaches the element for measuring/focus. The accessible name stays
 * derived from `name` (so it is `aria-label`-owned). In the static (non-clickable) form
 * these button-only props are inert.
 */
export interface NockerlAvatarProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'type'> {
  /** Image URL. When set (and it loads) it wins over the initials/icon fallback. */
  src?: string;
  /** Full name. Used for the accessible label and to derive the initials + tint. */
  name?: string;
  /** Pixel diameter ramp. */
  size?: NockerlAvatarSize;
  /** Circle (the Android default) or a 12px rounded square. */
  shape?: NockerlAvatarShape;
  /** Presence/status dot, bottom-right. Status colors only, never the brand cyan. */
  presence?: Presence;
  /** Inert + desaturated (never invisible) state. */
  disabled?: boolean;
  /** Makes the avatar a focusable button (e.g. the top-bar → settings tap target). Receives
   *  the MouseEvent so trigger callers can anchor to `e.currentTarget`. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

// Size ramp on the spacing scale: xs 24 · sm 32 · md 40 (top-bar) · lg 48 · xl 64.
const SIZE_VAR: Record<NockerlAvatarSize, string> = {
  xs: 'var(--space-6)',
  sm: 'var(--space-8)',
  md: 'var(--space-10)',
  lg: 'var(--space-12)',
  xl: 'var(--space-16)',
};
// Initials type tracks the diameter: small glyph in small wells, big in big.
const FONT_VAR: Record<NockerlAvatarSize, string> = {
  xs: 'var(--font-size-10)',
  sm: 'var(--font-size-12)',
  md: 'var(--font-size-14)',
  lg: 'var(--font-size-18)',
  xl: 'var(--font-size-24)',
};

// Initials tints come from the CATEGORICAL data ramp (NOT the brand cyan, which is
// reserved for selection/brand). Each pairs a fill with a luminance-safe on-color,
// mirroring the apps' `pickOnAccent` so the monogram always clears 4.5:1.
const TINTS: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: 'var(--color-core-categorical-indigo400)', fg: 'var(--color-core-black)' },
  { bg: 'var(--color-core-categorical-emerald400)', fg: 'var(--color-core-black)' },
  { bg: 'var(--color-core-categorical-orange400)', fg: 'var(--color-core-black)' },
  { bg: 'var(--color-core-categorical-violet400)', fg: 'var(--color-core-black)' },
  { bg: 'var(--color-core-categorical-teal400)', fg: 'var(--color-core-black)' },
  { bg: 'var(--color-core-categorical-pink400)', fg: 'var(--color-core-black)' },
];
const PRESENCE_COLOR: Record<Presence, string> = {
  active: 'var(--color-dot-active)',
  streaming: 'var(--color-dot-streaming)',
  attention: 'var(--color-dot-attention)',
  idle: 'var(--color-dot-idle)',
  offline: 'var(--color-dot-idle)',
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
function tintOf(name: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length]!;
}

// Depth lives in the avatar: a neutral drop shadow + a TOP catch-light (inset
// highlight) + a hairline ring that separates it from any surface. No glow. The
// presence dot sits in a "notch" punched by a ring the color of the host surface,
// so it reads as a chip ON the avatar (the BadgedBox precedent), not a halo.
export const NOCKERL_AVATAR_STYLES = `
.nk-av {
  position: relative; flex: 0 0 auto; display: inline-block;
  width: var(--nk-av-size); height: var(--nk-av-size);
  border: 0; padding: 0; background: transparent; font-family: inherit;
  transition: transform .12s var(--motion-easing-standard), filter .12s, box-shadow .12s;
}
.nk-av--circle { border-radius: var(--radius-pill); }
.nk-av--rounded { border-radius: var(--radius-control); }

/* the visible disc: fill + image, clipped, with the lit-from-above grammar */
.nk-av__disc {
  position: absolute; inset: 0; overflow: hidden; border-radius: inherit;
  display: flex; align-items: center; justify-content: center;
  background: var(--nk-av-fill, var(--color-card-surface3));
  color: var(--nk-av-ink, var(--color-on-card));
  box-shadow:
    0 var(--elevation-level1) var(--elevation-level3) -3px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent),
    inset 0 var(--space-px) 0 var(--color-surface-highlight),
    inset 0 0 0 var(--space-px) color-mix(in srgb, var(--color-on-card) 12%, transparent);
}
.nk-av__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.nk-av__initials {
  font-weight: var(--font-weight-semibold); font-size: var(--nk-av-font);
  line-height: 1; letter-spacing: var(--font-tracking-normal); user-select: none;
  display: flex; align-items: center; justify-content: center; height: 1em;
}
.nk-av__icon { width: 56%; height: 56%; display: block; color: var(--color-on-card-muted); }

/* tappable avatar = a real button (one name), brightness/transform feedback only */
button.nk-av { cursor: pointer; }
button.nk-av:hover:not(:disabled) { transform: translateY(-1px); }
button.nk-av:hover:not(:disabled) .nk-av__disc { filter: brightness(1.06); }
button.nk-av:active:not(:disabled) { transform: scale(.96); }
button.nk-av:active:not(:disabled) .nk-av__disc { filter: brightness(.94); }
button.nk-av:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
button.nk-av:disabled { cursor: not-allowed; }

/* disabled / offline: desaturated + dimmed, never invisible */
.nk-av--off .nk-av__disc { filter: grayscale(.7) brightness(.82); }
.nk-av--off { opacity: .7; }

/* the presence dot is a SHAPE in a notch, bottom-right; status color, never a glow */
.nk-av__dot {
  position: absolute; right: 0; bottom: 0;
  width: var(--nk-av-dot); height: var(--nk-av-dot); border-radius: var(--radius-pill);
  background: var(--nk-av-presence, var(--color-dot-idle));
  box-shadow: 0 0 0 var(--nk-av-ring) var(--nk-av-ground);  /* punch a notch in the disc */
}
.nk-av__dot--ring { background: transparent; border: var(--space-0-5) solid var(--color-dot-idle); }
.nk-av__dot--pulse { animation: nk-av-pulse 1.4s ease-in-out infinite; }
@keyframes nk-av-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

/* the overlapping stack: each avatar overlaps the previous; a ring matches the
   ground so neighbours read as separate discs. The "+N" overflow chip reuses the
   initials grammar (the BadgedBox count precedent). */
.nk-av-stack { display: inline-flex; align-items: center; }
.nk-av-stack > * { box-shadow: 0 0 0 var(--nk-av-ring) var(--nk-av-ground); border-radius: var(--radius-pill); }
.nk-av-stack > * + * { margin-left: var(--nk-av-overlap); }
.nk-av-stack > .nk-av { transition: transform .12s var(--motion-easing-standard); }
.nk-av-stack:hover > .nk-av:hover { transform: translateY(-2px); z-index: 1; }
.nk-av__more {
  position: relative; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
  width: var(--nk-av-size); height: var(--nk-av-size); border-radius: var(--radius-pill);
  background: var(--color-card-surface3); color: var(--color-on-card-muted);
  font-weight: var(--font-weight-semibold); font-size: var(--nk-av-font);
  box-shadow: inset 0 0 0 var(--space-px) color-mix(in srgb, var(--color-on-card) 12%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}

@media (prefers-reduced-motion: reduce) {
  .nk-av, .nk-av-stack > .nk-av, button.nk-av:hover:not(:disabled) { transition: none; transform: none; }
  .nk-av__dot--pulse { animation: none; }
}
`;

const IconUser = (
  <NockerlIcon className="nk-av__icon">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </NockerlIcon>
);

// Dot diameter + notch-ring width scale with the avatar (geometry, derived from
// the size token via calc, so it stays reactive to the spacing scale).
function dotVars(size: NockerlAvatarSize): Record<string, string> {
  const s = SIZE_VAR[size];
  return {
    '--nk-av-dot': `calc(${s} * 0.3)`,
    '--nk-av-ring': `calc(${s} * 0.06)`,
  };
}

/**
 * A single Nockerl avatar, the unit the spec documents. Resolves to image →
 * initials → icon, in that order. A presence dot (status color) sits bottom-right
 * in a notch; a tappable avatar is a real button with one accessible name.
 */
export const NockerlAvatar = forwardRef<HTMLButtonElement, NockerlAvatarProps>(function NockerlAvatar({
  src,
  name,
  size = 'md',
  shape = 'circle',
  presence,
  disabled = false,
  onClick,
  className,
  style: styleProp,
  ...rest
}, ref) {
  const [broken, setBroken] = useState(false);
  const showImg = !!src && !broken;
  const tint = name ? tintOf(name) : null;
  const label = name ? name : 'User';
  const off = disabled || presence === 'offline';

  const style: Record<string, string> = {
    '--nk-av-size': SIZE_VAR[size],
    '--nk-av-font': FONT_VAR[size],
    ...dotVars(size),
  };
  if (!showImg && tint) {
    style['--nk-av-fill'] = tint.bg;
    style['--nk-av-ink'] = tint.fg;
  }

  // The <img> can fail its network load BEFORE React attaches its delegated onError
  // listener. The ladder is SSR'd (Astro islands, RSC, any server render) and the
  // browser starts fetching the src on parse, so a broken image fires (and finishes)
  // its native `error` event during hydration and React's synthetic onError never
  // sees it. A ref callback runs synchronously when the node mounts: if the image has
  // already settled broken (`complete` with zero `naturalWidth`), trip the fallback so
  // the initials/icon still win. onError stays for images that fail AFTER hydration.
  const imgRef = (el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setBroken(true);
  };

  const disc = (
    <span className="nk-av__disc">
      {showImg ? (
        <img className="nk-av__img" ref={imgRef} src={src} alt="" onError={() => setBroken(true)} />
      ) : name ? (
        <span className="nk-av__initials">{initialsOf(name)}</span>
      ) : (
        IconUser
      )}
    </span>
  );
  const dot = presence && (
    <span
      className={[
        'nk-av__dot',
        presence === 'offline' ? 'nk-av__dot--ring' : '',
        presence === 'streaming' ? 'nk-av__dot--pulse' : '',
      ].filter(Boolean).join(' ')}
      style={{ '--nk-av-presence': PRESENCE_COLOR[presence] } as CSSProperties}
    />
  );
  const cls = [`nk-av`, `nk-av--${shape}`, off ? 'nk-av--off' : '', className].filter(Boolean).join(' ');
  const mergedStyle = { ...style, ...styleProp } as CSSProperties;

  if (onClick) {
    return (
      <button {...rest} ref={ref} type="button" className={cls} style={mergedStyle}
        disabled={disabled} aria-label={label} onClick={disabled ? undefined : onClick}>
        {disc}
        {dot}
        <style>{NOCKERL_AVATAR_STYLES}</style>
      </button>
    );
  }
  return (
    <span className={cls} style={mergedStyle} role="img" aria-label={label}>
      {disc}
      {dot}
      <style>{NOCKERL_AVATAR_STYLES}</style>
    </span>
  );
});

/** Overlapping avatar stack with a "+N" overflow chip (the BadgedBox count rule). */
export function NockerlAvatarStack({
  people,
  max = 4,
  size = 'md',
}: {
  people: { name: string; src?: string }[];
  max?: number;
  size?: NockerlAvatarSize;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const stackVars = {
    '--nk-av-ring': `calc(${SIZE_VAR[size]} * 0.07)`,
    '--nk-av-overlap': `calc(${SIZE_VAR[size]} * -0.32)`,
    '--nk-av-size': SIZE_VAR[size],
    '--nk-av-font': FONT_VAR[size],
  } as CSSProperties;
  return (
    <div className="nk-av-stack" style={stackVars} role="group" aria-label={`${people.length} members`}>
      {shown.map((p) => (
        p.src
          ? <NockerlAvatar key={p.name} src={p.src} name={p.name} size={size} />
          : <NockerlAvatar key={p.name} name={p.name} size={size} />
      ))}
      {extra > 0 && <span className="nk-av__more" aria-label={`${extra} more`}>+{extra}</span>}
      <style>{NOCKERL_AVATAR_STYLES}</style>
    </div>
  );
}

/** LEAF: owns its raw <button> (the tappable avatar); the image/initials/icon fallback
 *  is its own markup, not a slot. <img> is not a facsimile element. */
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default NockerlAvatar;
