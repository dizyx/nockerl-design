/**
 * NockerlAttachmentPopover: the floating cluster of pending-image thumbnails that
 * appears ABOVE the chat pill the moment something is attached, brought up from the
 * Android app (chat/ui/ChatInputBar.kt · PendingImageRow) as design-system truth
 * (R5-2 task 2622). The web mirror of the shipped Compose `NockerlAttachmentPopover`.
 * Canonical truth is the native component; this is 1:1 the same grammar.
 *
 * Each thumbnail is chrome that FLOATS on the same top layer as the input pill (the
 * L3 lift: message cards scroll UNDER it), traced by the WARM agent-family edge that
 * marks it as *dismissable transient chrome*, deliberately distinct from the
 * persistent cyan §2 edge of the pill itself (same --border-width-floating weight,
 * different hue: cyan = a fixed floating layer, warm = floating chrome you can
 * dismiss). A compact status-error badge overhanging the top-end corner removes it.
 * The row scrolls horizontally when the attachments overflow.
 *
 * This owns only the FRAME (float + warm edge + remove badge); the caller supplies
 * each image as a src URL and handles the actual pick/decode/upload. The app's
 * base64/CDN plumbing composes AROUND this, never inside it.
 *
 * TOKEN-REACTIVE: colors / radius / spacing / border-width are all var(--token);
 * tile geometry rides the space ramp via calc. No backticks in STYLES.
 */
import type { ComposeContract } from '../compose-contract';

export interface NockerlAttachment {
  /** The thumbnail image source (object URL, data URI, or CDN URL). */
  src: string;
  /** Accessible description of the attachment (defaults to its position). */
  alt?: string;
}

export interface NockerlAttachmentPopoverProps {
  /** One entry per pending attachment, in display order. */
  attachments: NockerlAttachment[];
  /** Fired with the index whose remove badge was activated. */
  onRemove: (index: number) => void;
  /** Inert remove badges (freeze ruling per law §9: react uses `disabled`; compose keeps `enabled`). */
  disabled?: boolean;
  /** Extra class on the row. */
  className?: string;
}

// The floating-thumbnail recipe. A 56 box gives the 18 badge room to overhang the 52
// tile's top-end corner; the tile clips to the panel radius, floats at L3 (neutral
// shadow, no glow), and carries the warm agent-family dismissable edge at the shared
// floating-border weight. The remove badge is a real <button> on the status-error fill.
export const NOCKERL_ATTACHMENT_POPOVER_STYLES = `
.nk-ap {
  display: flex; align-items: flex-end; gap: var(--space-2);
  /* SHADOW SAFE-AREA (tasks 2664/2665): overflow-x:auto forces the block axis to a
     clip too (CSS spec), which was cutting the tiles' L3 drop shadow at a HARD LINE.
     The clipped shadow fill read as a phantom gray BACKDROP behind the row. The row
     itself is fully transparent (only the tiles are opaque, like the native
     PendingImageRow); give the scrollport enough padding to contain the shadows'
     reach on every side and pull the visual footprint back with negative margins, so
     the shadows render fully soft and the layout rhythm (8/12) is unchanged. */
  padding: var(--space-5);
  margin: calc(var(--space-2) - var(--space-5)) calc(var(--space-3) - var(--space-5));
  overflow-x: auto; scrollbar-width: none;
}
.nk-ap::-webkit-scrollbar { display: none; }
/* the 56 anchor box: bottom-anchored tile + top-end badge overhang. */
.nk-ap__slot { position: relative; flex: 0 0 auto;
  width: calc(var(--space-12) + var(--space-2)); height: calc(var(--space-12) + var(--space-2)); }
/* the 52 image tile: panel radius, L3 float, the WARM dismissable edge. */
.nk-ap__tile {
  position: absolute; left: 0; bottom: 0; display: block;
  width: calc(var(--space-12) + var(--space-1)); height: calc(var(--space-12) + var(--space-1));
  object-fit: cover; border-radius: var(--radius-panel);
  border: var(--border-width-floating) solid var(--color-family-agent);
  box-shadow: 0 var(--elevation-level3) 18px -7px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  background: var(--color-card-surface1);
}
/* the compact REMOVE badge is a real button overhanging the top-end corner. */
.nk-ap__x {
  position: absolute; top: 0; right: 0; display: inline-flex; align-items: center; justify-content: center;
  width: calc(var(--space-4) + var(--space-0-5)); height: calc(var(--space-4) + var(--space-0-5));
  padding: 0; border: 0; border-radius: var(--radius-pill); cursor: pointer;
  background: var(--color-status-error); color: var(--color-on-accent);
  box-shadow: 0 var(--space-px) var(--elevation-level1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent);
  transition: transform .12s var(--motion-easing-standard), filter .12s;
}
.nk-ap__x svg { display: block; width: var(--space-3); height: var(--space-3); }
.nk-ap__x:hover:not(:disabled) { filter: brightness(1.08); transform: scale(1.08); }
.nk-ap__x:active:not(:disabled) { transform: scale(.92); }
.nk-ap__x:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
.nk-ap__x:disabled { cursor: default; filter: saturate(.4) brightness(.8); }
@media (prefers-reduced-motion: reduce) { .nk-ap__x { transition: none; } }
`;

// the close glyph: a stroke X on currentColor (the on-accent badge ink).
const IconClose = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/**
 * The floating pending-attachments row. Place it directly ABOVE the chat pill (a
 * sibling on the same floating layer). Each tile shows one attachment; its badge
 * removes it. Scrolls horizontally on overflow.
 */
export function NockerlAttachmentPopover({ attachments, onRemove, disabled = false, className }: NockerlAttachmentPopoverProps) {
  if (attachments.length === 0) return null;
  return (
    <div className={['nk-ap', className].filter(Boolean).join(' ')}>
      {attachments.map((att, i) => (
        <span className="nk-ap__slot" key={att.src + String(i)}>
          <img className="nk-ap__tile" src={att.src} alt={att.alt ?? 'Attachment ' + String(i + 1)} />
          <button
            type="button"
            className="nk-ap__x"
            aria-label={'Remove ' + (att.alt ?? 'attachment ' + String(i + 1))}
            disabled={disabled}
            onClick={() => onRemove(i)}
          >
            {IconClose}
          </button>
        </span>
      ))}
      {/* Recipe CSS injected as the LAST child; identical injected blocks dedupe. */}
      <style>{NOCKERL_ATTACHMENT_POPOVER_STYLES}</style>
    </div>
  );
}

// LEAF: attachments are DATA (src + alt), not slots. OWNS button: the remove badge is
// a compact 18px overlay key riding the tile's corner, a badge-scale affordance that
// NockerlIconButton's control-scale grammar (32px+ hit target, own surface recipes) does
// not express; it is the thumbnail's own identity, like the native 18dp badge.
export const compose = {
  tier: 'leaf',
  owns: ['button'],
} satisfies ComposeContract;

export default NockerlAttachmentPopover;
