/**
 * NockerlLanguageBadge is the first-class, HUE-FREE language tag (web parity with the
 * native NockerlLanguageBadge on both rails). A programming language is METADATA, never
 * status, so the tag carries NO hue: a quiet MONOSPACE lowercase pill (neutral soft wash
 * + muted ink, pill silhouette). This pill is the one home for the tag across CodeBlock,
 * DiffViewer, and the Markdown code fence, so it reads identically everywhere.
 *
 * The label is normalized by the shared `nockerlLanguageLabel` contract (trim +
 * lowercase, blank → nothing), byte-identical to native, so 'TypeScript' → 'typescript'
 * on every surface. Renders nothing for a blank / absent language.
 *
 * Composes <NockerlBadge> internally (soft · neutral · mono). The FRAMEWORK default is
 * hue-free. No per-language color map ships here. The APP may still differentiate
 * languages by color via the optional `color` knob (its own mapping, e.g.
 * TS ≠ Kotlin ≠ Swift), and FOR THIS CASE a status hue is permitted (the one sanctioned
 * exception to "warm = status only", because a language color reads as identity
 * metadata, not state). Unset = the quiet neutral tag. `size` passes through.
 */
import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { NockerlBadge, type NockerlBadgeSize } from './Badge.js';
import { nockerlLanguageLabel } from '../languageLabel.js';
import type { ComposeContract } from '../compose-contract.js';

export interface NockerlLanguageBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color' | 'children'> {
  /** The language name in any casing (e.g. 'TypeScript'). Normalized to a lowercase tag
   *  by the shared `nockerlLanguageLabel` contract; a blank / absent value renders nothing. */
  language?: string | null;
  /**
   * OPTIONAL app-side tag color: tints the soft wash + the
   * lettering via NockerlBadge's arbitrary-color path. The APP owns the language→color
   * mapping; the framework never hardcodes one. Unset = the neutral default.
   */
  color?: string;
  /** Badge scale. Defaults to `sm` (the code-header pill size). */
  size?: NockerlBadgeSize;
}

/**
 * The hue-free language tag. `<NockerlLanguageBadge language="TypeScript" />` → a quiet
 * `typescript` mono pill. Renders `null` for a blank / absent language.
 */
export const NockerlLanguageBadge = forwardRef<HTMLSpanElement, NockerlLanguageBadgeProps>(function NockerlLanguageBadge(
  { language, color, size = 'sm', ...rest },
  ref,
) {
  const label = nockerlLanguageLabel(language);
  if (label === null) return null;
  return (
    <NockerlBadge {...rest} ref={ref} label={label} tone="neutral" variant="soft" mono size={size} {...(color ? { color } : {})} />
  );
});

/** LEAF: the language tag. It composes <NockerlBadge> (soft · neutral · mono, optional
 *  app-side color) INTERNALLY and exposes no caller slot (`language` is a string, not
 *  component content); renders no facsimile elements. Owns nothing. */
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default NockerlLanguageBadge;
