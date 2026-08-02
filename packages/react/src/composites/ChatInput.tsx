/**
 * NockerlChatInput: the canonical FLOATING PILL bottom-of-chat input, brought up from
 * the Android app (chat/ui/ChatInputBar.kt) as design-system truth (R5-1 task 2621). The
 * web mirror of the shipped Compose `NockerlChatInput`. Canonical truth is the native
 * component; this is 1:1 the same grammar.
 *
 * The praised design is KEPT verbatim: a large, fully-rounded pill that FLOATS above
 * the message cards: chrome plane + the design-laws §2 SIGNATURE floating border
 * (--border-width-floating in the full accent) + the Level3 lift, never a glow. It is laid
 * out `[attach] [text field] [send/mic]`.
 *
 * **The one refinement (task 2621): a CLEAN send↔mic switch.** The trailing 48px accent
 * circle is a single toggle: SEND when there's text (auto), MIC when empty; a
 * long-press flips a manual override (cleared the moment a send fires). Where the app
 * hard-swapped two same-color glyphs (busy, ambiguous), the glyph now CROSS-FADES +
 * scales between mic and send on the fast/standard motion tokens: one legible morph,
 * an interpolatable-props transition (design-laws §4), frozen under
 * prefers-reduced-motion. Tap fires the current mode.
 *
 * This is the DESIGN grammar (pill + attach + field + send/mic); the app's voice state
 * machine (recording/transcribing/streaming), attachments, and the attach dropdown
 * compose AROUND this, not baked in here (NockerlAttachmentPopover + the Recording HUD
 * ride ABOVE the pill as siblings).
 *
 * Platform note (unify brand expression, honor platform behavior): on web,
 * Enter SENDS (Shift+Enter inserts a newline), because the native pill has no hardware
 * return-to-send. The field is a real <textarea> that auto-grows to 5 lines (the
 * native OutlinedTextField maxLines = 5), transparent INSIDE the pill so it reads as
 * part of the pill, deliberately NOT the recessed NockerlTextArea well (a well-in-a-pill
 * would be a box-in-a-box; the native field is transparent for the same reason).
 *
 * TOKEN-REACTIVE: every color / radius / spacing / motion value is a var(--token);
 * literals remain only for pure geometry the ramp does not name. No backticks in STYLES.
 */
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { NockerlIcon } from '../primitives/Icon';
import { NockerlAttachmentPopover, type NockerlAttachment } from './AttachmentPopover';
import { NockerlIconButton } from '../primitives/IconButton';
import type { ComposeContract } from '../compose-contract';

export interface NockerlChatInputProps {
  /** The message text (controlled). */
  value: string;
  /** Text edits. */
  onValueChange: (next: string) => void;
  /** Fired when the action button is in SEND mode and activated (tap or Enter). */
  onSend: () => void;
  /** Fired when the action button is in MIC mode and tapped. */
  onMic: () => void;
  /** The empty-field hint. */
  placeholder?: string;
  /** Accessible name for the text field (screen readers). */
  ariaLabel?: string;
  /** Inert input + actions. Freeze ruling (task 2686/): react uses `disabled`
   *  (the DOM/react family idiom); compose keeps `enabled` (its idiom): semantics
   *  shared, casing platform-idiomatic per law §9. */
  disabled?: boolean;
  /** Optional leading attach action; omit to hide the attach button. */
  onAttach?: (() => void) | undefined;
  /** The attach glyph (default a plus; pass a paperclip from your set). */
  attachIcon?: ReactNode;
  /**
   * GENERIC leading-accessory SLOT (task 2682) that replaces the built-in attach button
   * entirely when provided (compose any control cluster; you own its a11y). The
   * onAttach/attachIcon pair stays as the zero-config default.
   */
  leadingAccessory?: ReactNode;
  /**
   * PENDING ATTACHMENTS MODEL (task 2682): when non-empty the composite renders the
   * real NockerlAttachmentPopover floating directly ABOVE the pill (the canonical r5
   * integration), aligned to the pill's column. Empty (default) renders nothing:
   * the resting DOM is byte-identical to the bare pill.
   */
  attachments?: NockerlAttachment[];
  /** Remove handler for the attachments model (fired with the index). */
  onRemoveAttachment?: ((index: number) => void) | undefined;
  /**
   * GENERIC context/accessory SLOT (task 2682) that rides directly above the pill (below
   * the attachments row): session chips, a context-gauge strip, the Recording HUD.
   * Deliberately untyped (never session-typed props); empty renders nothing.
   */
  contextAccessory?: ReactNode;
  /** Max visible text lines before the field scrolls (the native maxLines). Default 5. */
  maxLines?: number;
  /** Extra class on the pill. */
  className?: string;
}

// The floating pill recipe. Chrome surface + the §2 signature accent floating border +
// the L3 neutral lift with a top catch-light (solid depth, no glow per design-laws §1).
// The field is transparent INSIDE the pill (part of the pill, never a box-in-a-box);
// the trailing send/mic circle is solid accent with an on-accent glyph. The send↔mic
// morph animates opacity + scale only (interpolatable props per §4) on the fast/standard
// motion tokens, frozen under reduced motion.
export const NOCKERL_CHAT_INPUT_STYLES = `
.nk-ci {
  /* task 2666, the CONCENTRIC gap: at the single-line rest height (6 + 48 + 6 = 60)
     the 48px action circle keeps an EQUAL 6px gap against the pill's rounded end-cap
     (and top/bottom): the circle sits concentric with the end-cap. Leading stays 12
     (space-3) so the attach glyph breathes like the native start inset. */
  --nk-ci-gap: calc(var(--space-1) + var(--space-0-5));
  display: flex; align-items: center; width: 100%; box-sizing: border-box;
  /* task 2676, the ADAPTIVE cap (scout-1: the pill had NO cap and stretched edge-to-edge
     on unfolded/tablet/wide): clamp to the chat column's bubble width and CENTER, so the
     input always aligns with the message column. Narrow surfaces are unaffected (100%
     under the cap); the Compose input adopts the same size.chat.bubbleMax. */
  max-width: var(--size-chat-bubble-max); margin-inline: auto;
  /* align-items: CENTER (the native Row's CenterVertically): the input text sits
     vertically centered in the pill (task 2666), and everything stays centered as the
     field grows to five lines. */
  padding: var(--nk-ci-gap) var(--nk-ci-gap) var(--nk-ci-gap) var(--space-3);
  gap: var(--space-1);
  background: var(--color-chrome-surface);
  border-radius: var(--radius-pill);
  /* design-laws §2, the SIGNATURE floating-over-content border on the pill CONTAINER:
     the ratified --border-width-floating in the full accent (the web echo of native
     ChatInputBar's BorderStroke(NockerlFloatingBorderWidth, accent)). */
  border: var(--border-width-floating) solid var(--color-accent-primary);
  /* Level3: floating chrome the message cards scroll UNDER; lit from above. */
  box-shadow: 0 var(--elevation-level3) 22px -8px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-ci--disabled { opacity: .72; }
/* the leading attach button: muted ink (a quiet secondary affordance). Its hover wash
   is a CIRCLE inside the pill (task 2666): the plain IconButton's default rounded-square
   wash reads as a foreign corner inside a stadium, so the pill rounds it fully. */
.nk-ci__attach { flex: 0 0 auto; color: var(--color-on-chrome-muted); }
.nk-ci__attach.nk-ico--plain { border-radius: var(--radius-pill); }

/* THE FIELD: transparent, part of the pill (never a recessed well-in-a-pill). Ink on
   the chrome on-tokens; caret is the accent; grows 1 -> 5 lines then scrolls. */
.nk-ci__field {
  flex: 1 1 auto; min-width: 0; resize: none; border: 0; outline: 0; background: transparent;
  font-family: var(--font-family-sans); font-size: var(--font-size-14);
  line-height: var(--font-line-height-20); color: var(--color-on-chrome);
  caret-color: var(--color-accent-primary);
  padding: var(--space-2) var(--space-1);
  /* task 2682, maxLines is a param: the cap rides a custom property (default 5). */
  max-height: calc(var(--font-line-height-20) * var(--nk-ci-max-lines, 5) + var(--space-4));
  overflow-y: auto; scrollbar-width: thin;
}
/* THE HOST STACK (task 2682), rendered ONLY when accessories exist (attachments and/or
   the context slot): a self-contained column that owns the chat-column cap + centering,
   so the popover / context accessory align with the pill in ANY host. The pill inside
   defers its own cap to the stack. Without accessories the bare pill renders exactly as
   before (resting DOM byte-identical). */
.nk-ci-host { display: flex; flex-direction: column; gap: var(--space-2); width: 100%;
  max-width: var(--size-chat-bubble-max); margin-inline: auto; }
.nk-ci-host .nk-ci { max-width: none; margin-inline: 0; }
.nk-ci-host > .nk-ap { align-self: flex-start; max-width: 100%; }
.nk-ci-host__ctx { display: flex; justify-content: center; }
.nk-ci__field::placeholder { color: var(--color-on-chrome-muted); }
.nk-ci__field:disabled { cursor: not-allowed; }
/* FIELD FOCUS reads on the pill's OWN §2 edge: the border BRIGHTENS to the accent-hi
   tone (an interpolatable border-color shift, §4) instead of drawing a second concentric
   ring that would double the signature edge (text fields always match :focus-visible, so
   an outline would halo on every click). The caret + the brightened edge carry focus;
   the attach + send controls keep their own :focus-visible outlines. */
.nk-ci { transition: border-color .12s var(--motion-easing-standard); }
.nk-ci:has(.nk-ci__field:focus) { border-color: var(--color-accent-primary-hi); }

/* THE SEND/MIC CIRCLE: a solid accent key (48px), lit from above; the glyph is
   knocked to on-accent. Feedback animates brightness/transform only (§4). */
.nk-ci__action {
  flex: 0 0 auto; position: relative; display: inline-flex; align-items: center; justify-content: center;
  width: var(--space-12); height: var(--space-12); border-radius: var(--radius-pill);
  border: 0; padding: 0; cursor: pointer;
  background: var(--color-accent-primary); color: var(--color-on-accent);
  box-shadow: inset 0 var(--space-px) 0 color-mix(in srgb, var(--color-core-white) 28%, transparent);
  transition: filter .12s var(--motion-easing-standard), transform .12s var(--motion-easing-standard);
  touch-action: manipulation; -webkit-user-select: none; user-select: none;
}
.nk-ci__action:hover:not(:disabled) { filter: brightness(1.06); }
.nk-ci__action:active:not(:disabled) { transform: scale(.94); filter: brightness(.92); }
.nk-ci__action:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
.nk-ci__action:disabled { cursor: not-allowed; background: color-mix(in srgb, var(--color-accent-primary) 38%, transparent); }

/* the MORPH: both glyphs stack in one grid cell; the active one fades + scales IN
   (0.6 -> 1) as the other fades + scales OUT, on the fast/standard motion tokens.
   One legible morph instead of a same-color hard swap (the task 2621 refinement). */
.nk-ci__glyphs { display: grid; place-items: center; }
.nk-ci__glyph {
  grid-area: 1 / 1; display: inline-flex; opacity: 0; transform: scale(.6);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-fast) var(--motion-easing-standard);
}
.nk-ci__glyph svg { display: block; width: var(--space-5); height: var(--space-5); }
.nk-ci__glyph--on { opacity: 1; transform: scale(1); }

@media (prefers-reduced-motion: reduce) {
  .nk-ci, .nk-ci__action, .nk-ci__glyph { transition: none; }
}
`;

// ─── glyphs (stroke icons on currentColor, the on-accent ink tints them) ──────
const IconPlus = <NockerlIcon path="M12 5v14M5 12h14" />;
// the SEND glyph, the Material filled send (task 2666: aims RIGHT, exactly the
// Icons.AutoMirrored.Filled.Send the native circle draws). A FILLED path, so it stays a
// bespoke fill-based svg (the NockerlIcon shell is stroke-based), the same sanctioned
// inline-fill exception as the HUD's stop square.
const IconSend = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);
// the standard mic, which mirrors the native NockerlMicIcon path grammar.
const IconMic = (
  <NockerlIcon>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </NockerlIcon>
);

const LONG_PRESS_MS = 500;

/**
 * A single Nockerl chat input, the floating pill: [attach] [field] [send/mic]. The
 * action circle auto-picks SEND (text present) or MIC (empty); long-press flips a
 * manual override; Enter sends (Shift+Enter = newline); the field auto-grows to five
 * lines. Ride NockerlAttachmentPopover / the Recording HUD ABOVE the pill as siblings.
 */
export const NockerlChatInput = forwardRef<HTMLTextAreaElement, NockerlChatInputProps>(function NockerlChatInput(
  {
    value,
    onValueChange,
    onSend,
    onMic,
    placeholder = 'Message Nockerl…',
    ariaLabel = 'Message',
    disabled = false,
    onAttach,
    attachIcon = IconPlus,
    leadingAccessory,
    attachments,
    onRemoveAttachment,
    contextAccessory,
    maxLines = 5,
    className,
  },
  ref,
) {
  // Auto mode: SEND when there's content, MIC when empty. A long-press sets a manual
  // override (true = send, false = mic); it clears the moment a send fires.
  const [override, setOverride] = useState<boolean | null>(null);
  const sendMode = override ?? value.trim().length > 0;

  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  const setFieldRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      fieldRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  // Auto-grow: 1 line at rest, up to the CSS max-height (5 lines), then scrolls.
  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = String(el.scrollHeight) + 'px';
  }, [value]);

  const fireSend = useCallback(() => {
    setOverride(null);
    onSend();
  }, [onSend]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Web platform behavior: Enter sends, Shift+Enter breaks the line.
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && value.trim().length > 0) fireSend();
      }
    },
    [disabled, value, fireSend],
  );

  // Long-press on the action circle flips the send/mic override (the native
  // longPressPop gesture); the click that follows a long-press is swallowed.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const clearPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);
  const onPointerDown = useCallback(
    (_e: ReactPointerEvent) => {
      if (disabled) return;
      longPressed.current = false;
      clearPress();
      pressTimer.current = setTimeout(() => {
        longPressed.current = true;
        setOverride(!sendMode);
      }, LONG_PRESS_MS);
    },
    [disabled, sendMode, clearPress],
  );
  const onActionClick = useCallback(() => {
    if (longPressed.current) {
      longPressed.current = false; // the long-press already flipped the mode
      return;
    }
    if (sendMode) fireSend();
    else onMic();
  }, [sendMode, fireSend, onMic]);
  useEffect(() => clearPress, [clearPress]);

  // task 2682, the pill itself (unchanged grammar); accessories may stack above it.
  const pill = (
    <div
      className={['nk-ci', disabled ? 'nk-ci--disabled' : '', className].filter(Boolean).join(' ')}
      style={maxLines !== 5 ? ({ ['--nk-ci-max-lines' as string]: String(maxLines) } as React.CSSProperties) : undefined}
    >
      {leadingAccessory ??
        (onAttach && (
          <NockerlIconButton
            icon={attachIcon}
            label="Attach"
            onClick={onAttach}
            disabled={disabled}
            variant="plain"
            size={36}
            className="nk-ci__attach"
          />
        ))}
      <textarea
        ref={setFieldRef}
        className="nk-ci__field"
        rows={1}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="nk-ci__action"
        aria-label={sendMode ? 'Send' : 'Voice input'}
        disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
        onClick={onActionClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="nk-ci__glyphs" aria-hidden="true">
          <span className={'nk-ci__glyph' + (sendMode ? ' nk-ci__glyph--on' : '')}>{IconSend}</span>
          <span className={'nk-ci__glyph' + (sendMode ? '' : ' nk-ci__glyph--on')}>{IconMic}</span>
        </span>
      </button>
      {/* Recipe CSS injected as the LAST child; identical injected blocks dedupe. */}
      <style>{NOCKERL_CHAT_INPUT_STYLES}</style>
    </div>
  );

  // task 2682, accessories present → the self-contained HOST STACK (owns the chat-column
  // cap + centering so the popover/context align with the pill in any host). Without
  // accessories the bare pill renders EXACTLY as before (resting DOM byte-identical).
  const hasAttachments = attachments != null && attachments.length > 0;
  if (!hasAttachments && !contextAccessory) return pill;
  return (
    <div className="nk-ci-host">
      {hasAttachments && (
        <NockerlAttachmentPopover
          attachments={attachments}
          onRemove={onRemoveAttachment ?? (() => {})}
          disabled={disabled}
        />
      )}
      {contextAccessory && <div className="nk-ci-host__ctx">{contextAccessory}</div>}
      {pill}
    </div>
  );
});

// LEAF: composes NockerlIconButton (the attach action) + NockerlAttachmentPopover (the
// task 2682 attachments model). OWNS textarea + button:
// (1) the FIELD is deliberately a transparent-in-pill textarea, NOT the recessed
// NockerlTextArea well: the native field is transparent for the same reason (part of
// the pill, never a box-in-a-box), so wrapping the well primitive would re-skin it;
// (2) the send/mic circle is a stateful dual-mode morphing key (auto mode + long-press
// override + cross-fade glyphs) that NockerlIconButton (one static icon, no gesture
// machinery) cannot hold. `attachIcon` is a glyph, not a component slot.
export const compose = {
  tier: 'leaf',
  owns: ['textarea', 'button'],
} satisfies ComposeContract;

export default NockerlChatInput;
