/**
 * NockerlWell - the Tier-1 recessed-input primitive. ONE home for the recessed-well recipe
 * that the input fields hand-rolled twice (NockerlTextField and NockerlTextArea): the canvas-alt
 * fill, the outline-subtle hairline border, the control radius, the INNER sink shadow
 * + the 1px top catch-light, and the full state ladder (hover / focus cyan-OUTLINE /
 * error red-border / disabled / read-only). Composes ONLY tokens.
 *
 * Design laws encoded here (do not re-derive in a consumer):
 *   - fields SINK: a recessed well (darker inset surface + INNER shadow), never a
 *     raised/lifted surface and never a colored glow.
 *   - 12px control radius (--radius-control) - a rounded rectangle, never a pill.
 *   - focus is an OUTLINE (cyan box-shadow ring), never a colored shadow/glow.
 *   - error = red border (color is NEVER the only signal - the consumer pairs it with
 *     helper text + a warn icon).
 *   - disabled / read-only stay visible (>= 3:1), clearly inert - never faded out.
 *
 * The ONLY sanctioned divergence is LAYOUT (the divergence the SYSTEM has = a variant
 * prop, not drift): a single-line field is a flex ROW (min-height 44px, padding
 * 0 var(--space-3)); a multi-line area is a BLOCK (padding var(--space-2) var(--space-3)).
 * Everything else - fill, border, radius, shadow, every state - is shared and identical.
 *
 *   layout: 'field'  -> flex row, 44px min-height, horizontal padding (NockerlTextField)
 *   layout: 'area'   -> block, box padding (NockerlTextArea)
 *
 * The recessed surface lives on the shared .nk-well class; the layout sits on
 * .nk-well--field / .nk-well--area. The state ladder targets .nk-well.is-* so it is
 * carried by whatever element gets the class. State classes (is-focus / is-error /
 * is-disabled / is-readonly) are passed through via className by the consumer, which
 * also keeps its own legacy class so its descendant selectors keep matching.
 *
 * Emits the recipe CSS as a FRAGMENT-SIBLING that follows the well element (not as a
 * child of it): the consumer drops this where its old recipe style node sat, so the
 * well element's own children stay byte-identical and no nested style node perturbs a
 * flex gap / first-child rule. The style is display:none, so as a trailing sibling it is
 * inert for the consumer's column gap and adjacent-sibling selectors. Identical injected
 * blocks dedupe in effect.
 */
import { forwardRef, Fragment } from 'react';
import type { AllHTMLAttributes, CSSProperties, ElementType, ReactNode } from 'react';
import { assertComposeChildren, type ComposeContract } from '../compose-contract';

export type NockerlWellLayout = 'field' | 'area';

// The recessed inset well + a cyan focus OUTLINE. Nothing here glows; the only shadows
// are INNER (the sink) + a 1px top line. The layout (flex row vs block) is the only
// per-variant difference; every state below is shared. Every value is a token.
export const NOCKERL_WELL_STYLES = `
.nk-well {
  background: var(--color-canvas-alt);
  border: var(--space-px) solid var(--color-outline-subtle);
  border-radius: var(--radius-control);
  transition: border-color .12s, box-shadow .12s, background-color .12s;
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
/* layout: single-line field is a flex ROW (min-touch min-height, horizontal padding). */
.nk-well--field { display: flex; align-items: center; gap: var(--space-2); padding: 0 var(--space-3); min-height: var(--size-min-touch); }
/* layout: multi-line area is a BLOCK with box padding. */
.nk-well--area { padding: var(--space-2) var(--space-3); }
.nk-well:hover:not(.is-disabled):not(.is-readonly) { border-color: color-mix(in srgb, var(--color-outline-subtle) 80%, var(--color-on-card)); }
/* focus = a cyan OUTLINE ring (box-shadow ring that hugs the control radius). Still
   INSET-shadowed underneath - it never lifts. */
.nk-well.is-focus {
  border-color: var(--color-accent-primary);
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), 0 0 0 var(--space-0-5) color-mix(in srgb, var(--color-accent-primary) 45%, transparent);
}
/* error = RED border (never a glow). */
.nk-well.is-error { border-color: var(--color-status-error); }
.nk-well.is-error.is-focus { box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), 0 0 0 var(--space-0-5) color-mix(in srgb, var(--color-status-error) 40%, transparent); }
/* warning = AMBER border (color is never the only signal, the consumer pairs it with helper text + an icon). */
.nk-well.is-warning { border-color: var(--color-status-warning); }
.nk-well.is-warning.is-focus { box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), 0 0 0 var(--space-0-5) color-mix(in srgb, var(--color-status-warning) 40%, transparent); }
/* success = GREEN border (a validated field; paired with helper text + a check). */
.nk-well.is-success { border-color: var(--color-status-success); }
.nk-well.is-success.is-focus { box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), 0 0 0 var(--space-0-5) color-mix(in srgb, var(--color-status-success) 40%, transparent); }
/* disabled - still visible (>= 3:1), clearly inert. */
.nk-well.is-disabled { background: var(--color-canvas); border-color: var(--color-canvas-edge); box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent); }
/* read-only - a flatter well: present, selectable, not an editable target. */
.nk-well.is-readonly { background: var(--color-canvas); border-style: dashed; box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 35%, transparent); }
@media (prefers-reduced-motion: reduce) { .nk-well { transition: none; } }
`;

export interface NockerlWellProps
  extends Omit<AllHTMLAttributes<HTMLElement>, 'className' | 'style' | 'children' | 'as'> {
  /** Sanctioned layout: 'field' (flex row, 44px) | 'area' (block). The ONLY divergence. */
  layout: NockerlWellLayout;
  /** Element tag to render. Default 'div'. */
  as?: ElementType;
  /**
   * Consumer classes. Pass the state ladder here (is-focus / is-error / is-disabled /
   * is-readonly) plus any legacy/own class the consumer's descendant selectors need.
   */
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export const NockerlWell = forwardRef<HTMLElement, NockerlWellProps>(function NockerlWell({ layout, as: Tag = 'div', className, children, ...rest }, ref) {
  const cls = ['nk-well', layout === 'area' ? 'nk-well--area' : 'nk-well--field', className]
    .filter(Boolean)
    .join(' ');
  assertComposeChildren('NockerlWell', '*', children);
  // NockerlWell element + recipe style as SIBLINGS in a fragment: the consumer renders <NockerlWell/>
  // where its well div used to sit, so the well's own children are untouched and the
  // style lands as a trailing sibling (display:none -> inert for the parent column gap
  // and any adjacent-sibling selector). A leading style node would instead become the
  // :first-child / left side of an adjacent-sibling selector and shift layout; trailing avoids that.
  return (
    <Fragment>
      <Tag {...rest} ref={ref} className={cls}>
        {children}
      </Tag>
      <style>{NOCKERL_WELL_STYLES}</style>
    </Fragment>
  );
});

/** CONTAINER: a generic recessed wrapper; its children may be ANY design component
 *  (raw facsimile elements are still forbidden in the slot). Renders no facsimiles itself. */
export const compose = {
  slots: { default: { accepts: '*' } },
} satisfies ComposeContract;

export default NockerlWell;
