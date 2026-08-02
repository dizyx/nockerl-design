/**
 * _CopyButton: THE one copy-to-clipboard affordance (r4). Every demo that offers
 * "copy this" composes THIS, never a hand-rolled variant: r4 review proved divergence
 * (KeyValue confirmed with a CYAN check, CodeBlock with an on-card/black one, Panel's gave
 * no feedback at all). One component = one confirmation grammar:
 *
 *   - composes the real NockerlIconButton (plain): centering + shape + wash + focus ring all
 *     come from the primitive ( fixed the glyph cell there);
 *   - ONE glyph pair: the doc-on-doc copy outline -> the registry check, sized at half the
 *     button box (14px in the standard 28px button);
 *   - ONE confirmation: a BARE CYAN CHECKMARK. The glyph flips to var(--color-accent-primary)
 *     with NO fill background (a filled accent chip read too much like a checkbox). The color arrives
 *     via the primitive's transition (interpolatable, never a hard cut) and reverts after ~2s;
 *   - aria-label flips Copy -> Copied for assistive tech.
 *
 * Not a package export (Tier promotion is a the design lead call); demo-shared like _ScrollToBottom.
 */
import { useEffect, useRef, useState } from 'react';
import { NockerlIcon, NockerlIconButton } from '@dizyx/nockerl-react';

export interface CopyButtonProps {
  /** The clipboard payload: a string or a lazy producer (heavy payloads). */
  text: string | (() => string);
  /** Accessible name at rest. */
  label?: string;
  /** Accessible name while confirming. */
  copiedLabel?: string;
  /** Button box in px (the standard is 28; toolbars may seat 32). Glyph = half the box. */
  size?: number;
  /** Extra class hooks for host positioning/reveal wrappers (e.g. a JS counter hook). */
  className?: string;
  /** Host callback after a successful copy (demos count copies etc.). */
  onCopied?: () => void;
}

// The confirmation is a BARE CYAN CHECKMARK with no fill background (a filled accent chip read
// too much like a checkbox). The check simply flips to the accent; the button stays plain
// (transparent, even on hover), beating the primitive's hover wash on specificity so the confirm is
// a clean cyan tick. Reverts via the same color transition the primitive already animates.
const STYLES = `
.nk-ico--plain.nk-copybtn.is-copied,
.nk-ico--plain.nk-copybtn.is-copied:hover:not(:disabled) {
  background: transparent;
  color: var(--color-accent-primary);
}
`;

export function CopyButton({ text, label = 'Copy', copiedLabel = 'Copied', size = 28, className, onCopied }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const glyphSize = Math.round(size / 2);
  const doCopy = () => {
    const payload = typeof text === 'function' ? text() : text;
    try { void navigator.clipboard?.writeText(payload); } catch { /* demo surface; clipboard may be unavailable */ }
    setCopied(true);
    onCopied?.();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <NockerlIconButton
        icon={copied
          ? <NockerlIcon name="check" size={glyphSize} />
          : <NockerlIcon size={glyphSize}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></NockerlIcon>}
        label={copied ? copiedLabel : label}
        variant="plain"
        size={size}
        className={['nk-copybtn', copied ? 'is-copied' : '', className].filter(Boolean).join(' ')}
        onClick={doCopy}
      />
      <style>{STYLES}</style>
    </>
  );
}

export default CopyButton;
