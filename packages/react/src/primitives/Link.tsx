/**
 * NockerlLink is the Tier-1 hyperlink/anchor primitive. ONE home for the cyan accent-text
 * treatment, the underline-is-the-affordance rule, the hover/visited/focus grammar,
 * and the external / download icon slots. A future link-rule change is ONE edit,
 * not many. Composes ONLY tokens; imports only the NockerlIcon primitive (tier law: a
 * primitive depends on tokens + lower-tier primitives, never a demo).
 *
 * A link is DISTINCT from a button: it is a true navigational <a>, both INLINE within
 * prose and STANDALONE, and its emphasis is carried by TEXT treatment (cyan accent
 * color + underline + hover/visited/focus), not by a filled control. (The button is a
 * filled/outlined action; the link is text that goes somewhere.)
 *
 * Sourced from the apps: Android renders links through the markdown renderer's
 * TextLinkStyles + LinkAnnotation/UriHandler (chat/ui/MarkdownContent.kt), and the
 * brand link color is the single cyan accent. There is no bespoke link color override
 * there, so the canonical treatment is: accent text + underline.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • cyan accent is the only brand color. Links use --color-accent-primary; the
 *     underline IS the affordance (color-alone is never the only signal).
 *   • flash-free feedback: hover/active animate color BRIGHTNESS + the underline
 *     (decoration color/offset) only, because there is no fill to swap.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow/glow.
 *   • NO glow / colored shadow / emission anywhere: a link never lifts.
 *   • inline links flow on the prose baseline; icon links keep the glyph optically
 *     centered on the text via an em-sized currentColor glyph.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef } from 'react';
import type { AnchorHTMLAttributes } from 'react';
import { NockerlIcon } from './Icon';
import type { ComposeContract } from '../compose-contract';

export type NockerlLinkVariant = 'default' | 'muted';

export interface NockerlLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'onClick'> {
  /** Visible link text. */
  children: React.ReactNode;
  /** Destination. Demo uses "#"; real links pass a URL. */
  href?: string;
  /** Emphasis: cyan accent (default) or subtle/inherit-color (muted). */
  variant?: NockerlLinkVariant;
  /** Renders on a cyan accent surface, so text flips to the on-accent token. */
  onAccent?: boolean;
  /** Force the visited (already-read) treatment regardless of history: the recede
   *  state a real visited link earns via :visited. For docs/showcase + tests. */
  visited?: boolean;
  /** Marks the link as external: adds the ↗ glyph + target/rel + a11y hint. */
  external?: boolean;
  /** Inert + clearly-seen (never invisible) state. aria-disabled, not focusable. */
  disabled?: boolean;
  /** Optional leading glyph (e.g. a download icon), baseline-aligned. */
  leadingIcon?: React.ReactNode;
  /** Click handler (the demo blocks navigation so "#" doesn't jump). */
  onClick?: () => void;
}

// Links carry emphasis through TEXT, never a fill. Feedback animates the color's
// brightness + the underline only. Every value is a token; the dark stage
// resolves the cyan accent to #0cc0df and on-accent to the dark-on-cyan label.
export const NOCKERL_LINK_STYLES = `
/* ── The anchor ─────────────────────────────────────────────────────────── */
.nk-lnk {
  color: var(--color-accent-primary);
  font-family: inherit;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  border-radius: var(--radius-control);   /* shapes only the focus ring corners */
  /* underline IS the affordance: token color, thin, sat just below the text */
  text-decoration-line: underline;
  text-decoration-color: color-mix(in srgb, var(--color-accent-primary) 45%, transparent);
  text-decoration-thickness: var(--space-px);
  text-underline-offset: 0.18em;
  transition: color .12s var(--motion-easing-standard), text-decoration-color .12s, filter .12s;
}
.nk-lnk:hover {
  color: var(--color-accent-primary-hi);      /* brighten, not a new fill */
  text-decoration-color: currentColor;    /* underline firms up to full strength */
}
.nk-lnk:active { filter: brightness(.88); }
.nk-lnk:focus-visible {
  outline: var(--space-0-5) solid var(--color-accent-primary);
  outline-offset: var(--space-0-5);
  text-decoration-color: currentColor;
}
/* VISITED recedes toward muted (still legible, still underlined). Demo opts
   a few rows in via a class so the state is always visible regardless of history. */
.nk-lnk--visited, .nk-lnk:visited {
  color: var(--color-on-card-muted);
  text-decoration-color: color-mix(in srgb, var(--color-on-card-muted) 45%, transparent);
}
.nk-lnk--visited:hover { color: var(--color-on-card); text-decoration-color: currentColor; }

/* MUTED / subtle variant inherits the prose color; underline appears on hover/focus */
.nk-lnk--muted {
  color: inherit;
  font-weight: var(--font-weight-regular);
  text-decoration-color: color-mix(in srgb, currentColor 32%, transparent);
}
.nk-lnk--muted:hover { color: var(--color-accent-primary); text-decoration-color: currentColor; filter: none; }

/* On an ON-ACCENT surface, the cyan tile flips link text to the contrast label */
.nk-lnk--on-accent { color: var(--color-on-accent); font-weight: var(--font-weight-semibold);
  text-decoration-color: color-mix(in srgb, var(--color-on-accent) 55%, transparent); }
.nk-lnk--on-accent:hover { color: var(--color-on-accent); filter: brightness(1.12); text-decoration-color: currentColor; }
.nk-lnk--on-accent:focus-visible { outline-color: var(--color-on-accent); }

/* DISABLED stays inert + clearly seen (never faded to invisible); no underline */
.nk-lnk--disabled {
  color: var(--color-on-card-muted);
  text-decoration-line: none;
  cursor: not-allowed;
  filter: none;
}

/* ── NockerlIcon slots are baseline-aligned with the text, sized in em, currentColor ── */
.nk-lnk__icon { display: inline-flex; vertical-align: -0.14em; width: 1em; height: 1em; }
.nk-lnk__icon svg { width: 1em; height: 1em; display: block; }
.nk-lnk__icon--lead { margin-right: 0.3em; }
.nk-lnk__icon--ext  { margin-left: 0.18em; }
/* the external glyph keeps full opacity but never underlines (it's not text) */
.nk-lnk { text-decoration-skip-ink: auto; }

@media (prefers-reduced-motion: reduce) {
  .nk-lnk { transition: none; }
}
`;

// ─── Inline glyphs (stroke icons in currentColor, so each link tints them) ───
const IconExternal = (
  <NockerlIcon>
    <path d="M14 5h5v5" />
    <path d="M19 5 10 14" />
    <path d="M19 13.5V18a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18V7a1.5 1.5 0 0 1 1.5-1.5H11" />
  </NockerlIcon>
);

/**
 * A single Nockerl link is a true anchor whose emphasis is TEXT (cyan accent +
 * underline + hover/visited/focus), inline or standalone, never a filled control.
 * External links get the ↗ glyph plus the `target`/`rel` + a11y-hint pattern; a
 * disabled link is inert (`aria-disabled`, removed from tab order) but legible.
 */
export const NockerlLink = forwardRef<HTMLAnchorElement, NockerlLinkProps>(function NockerlLink({
  children,
  href = '#',
  variant = 'default',
  onAccent = false,
  visited = false,
  external = false,
  disabled = false,
  leadingIcon,
  onClick,
  className,
  ...rest
}, ref) {
  const cls = [
    'nk-lnk',
    variant === 'muted' ? 'nk-lnk--muted' : '',
    onAccent ? 'nk-lnk--on-accent' : '',
    visited ? 'nk-lnk--visited' : '',
    disabled ? 'nk-lnk--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // External links open in a new tab; rel closes the opener + referrer leak.
  const externalAttrs = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <a
      {...rest}
      ref={ref}
      href={disabled ? undefined : href}
      className={cls}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : rest.tabIndex}
      {...externalAttrs}
      onClick={(e) => {
        e.preventDefault(); // demo: don't jump to "#"
        if (!disabled) onClick?.();
      }}
    >
      {leadingIcon && (
        <span className="nk-lnk__icon nk-lnk__icon--lead" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      {children}
      {external && (
        <>
          <span className="nk-lnk__icon nk-lnk__icon--ext" aria-hidden="true">
            {IconExternal}
          </span>
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            (opens in a new tab)
          </span>
        </>
      )}
      <style>{NOCKERL_LINK_STYLES}</style>
    </a>
  );
});

/** LEAF: the hyperlink primitive; renders (and owns) its raw <a href>. `leadingIcon` +
 *  the external glyph are leaf ornamentation, not modeled slots. */
export const compose = { tier: 'leaf', owns: ['a'] } satisfies ComposeContract;

export default NockerlLink;
