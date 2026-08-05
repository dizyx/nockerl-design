/**
 * NockerlSurface - the Tier-1 lifted-surface primitive. ONE home for the catch-light +
 * elevation recipe ~60 demos hand-roll: the card-surface1 fill, a hairline border, the
 * surface radius, a NEUTRAL shadow-tint drop shadow per L1-L4 rung, and the inset
 * surface-highlight sheen (the top catch-light). Composes ONLY tokens.
 *
 * Design law, encoded so a surface-depth change is one edit: surfaces LIFT off the dark
 * ground; the fill is STATIC per rung (the shadow grows, never the lightness); depth is
 * shadow + sheen with NO glow and NO colored shadow.
 *
 * Two sanctioned axes (a divergence that the SYSTEM has = a variant prop, not drift):
 *   - variant: 'card' (--radius-card, 16) | 'panel' (--radius-panel, 12). Default card.
 *   - level:   1-4, the canonical neutral shadow ladder. OPTIONAL - omit it to supply
 *              your OWN box-shadow (a panel's sanctioned shadow, or a flagged DRIFT
 *              shadow off the ladder). With no level, NockerlSurface emits no shadow class, so
 *              the consumer's own box-shadow rule wins cleanly (no source-order fight).
 *
 * The sheen is exposed as --nk-surface-sheen so a consumer's own hover/press/own-shadow
 * rules can reference it. Renders an element with the shared .nk-surface classes and
 * injects the recipe CSS once (identical injected blocks dedupe in effect).
 *
 *   <NockerlSurface level={2} className="nk-x__card">...</NockerlSurface>          // canonical card
 *   <NockerlSurface variant="panel" className="nk-pnl">...</NockerlSurface>        // panel + own shadow
 *   <NockerlSurface className="nk-sc">...</NockerlSurface>                          // own (drift) shadow
 */
import { forwardRef } from 'react';
import type { AllHTMLAttributes, CSSProperties, ElementType, ReactNode } from 'react';
import { assertComposeChildren, type ComposeContract } from '../compose-contract.js';

export type NockerlSurfaceVariant = 'card' | 'panel';
export type NockerlSurfaceLevel = 1 | 2 | 3 | 4;

const SURFACE_CSS = `
.nk-surface{
  background: var(--color-card-surface1);
  border-radius: var(--radius-card);
  border: var(--space-px) solid var(--color-card-hairline);
  --nk-surface-sheen: inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-surface--panel{ border-radius: var(--radius-panel); }
.nk-surface--flat{ border: none; }
.nk-surface--l1{ box-shadow: 0 var(--elevation-level1) var(--elevation-blur) 0 color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent), var(--nk-surface-sheen); }
.nk-surface--l2{ box-shadow: 0 var(--elevation-level2) var(--elevation-blur) 0 color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent), var(--nk-surface-sheen); }
.nk-surface--l3{ box-shadow: 0 var(--elevation-level3) var(--elevation-blur) 0 color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level3) * 100%), transparent), var(--nk-surface-sheen); }
.nk-surface--l4{ box-shadow: 0 var(--elevation-sheet) var(--elevation-blur) 0 color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-sheet) * 100%), transparent), var(--nk-surface-sheen); }
`;

export interface NockerlSurfaceProps
  extends Omit<AllHTMLAttributes<HTMLElement>, 'className' | 'style' | 'children' | 'as'> {
  /** Sanctioned surface type: 'card' (--radius-card) | 'panel' (--radius-panel). Default card. */
  variant?: NockerlSurfaceVariant;
  /** Canonical neutral shadow rung 1-4. OMIT to supply your own box-shadow (panel/drift). */
  level?: NockerlSurfaceLevel;
  /** Drop the hairline border (depth then reads from shadow + sheen alone). */
  flat?: boolean;
  /** Element tag to render. Default 'div'. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export const NockerlSurface = forwardRef<HTMLElement, NockerlSurfaceProps>(function NockerlSurface({ variant = 'card', level, flat = false, as: Tag = 'div', className, children, ...rest }, ref) {
  const cls = [
    'nk-surface',
    variant === 'panel' ? 'nk-surface--panel' : '',
    level ? `nk-surface--l${level}` : '',
    flat ? 'nk-surface--flat' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  assertComposeChildren('NockerlSurface', '*', children);
  // The recipe <style> is rendered as the LAST child (not first): a leading style node
  // would become the `:first-child` / left side of a `> * + *` adjacent-sibling selector
  // in consumers (e.g. prose flow-margin resets), shifting layout. As the last child it is
  // inert for those selectors (it is display:none and never the first content element).
  return (
    <Tag {...rest} ref={ref} className={cls}>
      {children}
      <style>{SURFACE_CSS}</style>
    </Tag>
  );
});

/** CONTAINER: a generic lifted wrapper; its children may be ANY design component
 *  (raw facsimile elements are still forbidden in the slot). */
export const compose = {
  slots: { default: { accepts: '*' } },
} satisfies ComposeContract;

export default NockerlSurface;
