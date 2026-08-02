/**
 * NockerlDefinitionTrigger, the Tier-1 inline glossary/definition trigger primitive. An inline,
 * non-uppercase, dotted-underline focusable <button> (cursor: help) that FORWARDS trigger
 * props (aria-describedby + hover/focus handlers) and its ref, so a NockerlTooltip or NockerlPopover can
 * anchor to a single word in running prose. DISTINCT from NockerlButton (a block, uppercase,
 * padded control) and NockerlLink (a cyan navigational <a>): this reads as ordinary body text
 * that happens to reveal a definition. Owns its <button>; composes ONLY tokens.
 *
 * Injects its recipe CSS as the LAST child (an inline style node is display:none, inert).
 */
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ComposeContract } from '../compose-contract';

export interface NockerlDefinitionTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> {
  /** The inline term (rendered as body text with a dotted underline). */
  children: ReactNode;
}

export const NOCKERL_DEFINITION_TRIGGER_STYLES = `
.nk-dfn {
  display: inline; box-sizing: border-box; margin: 0; padding: 0; border: 0; background: none;
  font: inherit; color: inherit; cursor: help;
  text-decoration: underline dotted; text-underline-offset: var(--space-0-5);
  text-decoration-color: color-mix(in srgb, currentColor 55%, transparent);
  transition: color .12s, text-decoration-color .12s;
}
.nk-dfn:hover { color: var(--color-accent-primary); text-decoration-color: var(--color-accent-primary); }
.nk-dfn:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); border-radius: var(--space-0-5); }
@media (prefers-reduced-motion: reduce) { .nk-dfn { transition: none; } }
`;

/** An inline dotted-underline definition trigger. Spread a NockerlTooltip/NockerlPopover's trigger props
 *  onto it and it anchors the tip to the word; the ref forwards to the <button>. */
export const NockerlDefinitionTrigger = forwardRef<HTMLButtonElement, NockerlDefinitionTriggerProps>(
  function NockerlDefinitionTrigger({ children, className, ...rest }, ref) {
    return (
      <button ref={ref} type="button" className={['nk-dfn', className].filter(Boolean).join(' ')} {...rest}>
        {children}
        <style>{NOCKERL_DEFINITION_TRIGGER_STYLES}</style>
      </button>
    );
  },
);

/** LEAF: owns its inline <button>; it IS the inline-definition primitive. */
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default NockerlDefinitionTrigger;
