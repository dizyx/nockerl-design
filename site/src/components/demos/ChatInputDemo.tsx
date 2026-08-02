/**
 * ChatInputDemo: the live island for the shipped NockerlChatInput composite (R5-1 task 2621).
 *
 * The reusable floating-pill chat input lives in the published package
 * (@dizyx/nockerl-react → NockerlChatInput; canonical truth = the native Compose
 * NockerlChatInput, itself brought up from the Android app's ChatInputBar). This file is
 * only the showcase harness that CONSUMES it: a contained chat-feed stage (real
 * ChatBubble primitives scrolling UNDER the pill, which is what proves the §2 float) with the
 * pill pinned at the bottom. Type to watch the send↔mic morph; long-press the circle to
 * flip the mode manually; Enter sends (Shift+Enter breaks the line); sending appends a
 * real bubble to the feed. The + adds pending attachments, and the shipped
 * NockerlAttachmentPopover (R5-2 task 2622) floats them directly ABOVE the pill on the same
 * layer (warm dismissable edge vs the pill's persistent cyan); X removes; send consumes.
 *
 * The pill's design laws (chrome plane + the §2 signature --border-width-floating accent
 * edge + the L3 lift, the transparent-in-pill field, the accent send/mic circle, the
 * cross-fade morph on the motion tokens) are ENCODED IN THE PACKAGE. See
 * packages/react/src/composites/ChatInput.tsx. This harness supplies only the stage.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a var(--token).
 */
import { useEffect, useRef, useState } from 'react';
import { ChatBubble, STYLES as chatStyles } from './ChatBubbleDemo';
import { RecordingHud, STYLES as hudStyles } from './RecordingHudDemo';

import { NockerlChatInput, NockerlFacetedBackground, type NockerlAttachment } from '@dizyx/nockerl-react';

// Deterministic demo thumbnails: a tiny inline SVG tile per attach, tinted from the
// sanctioned categorical ramp READ AT RUNTIME (tokens stay the single source; no
// hardcoded hues here). Built lazily in the click handler, so SSR never touches it.
const TILE_HUES = ['indigo400', 'emerald400', 'purple400', 'orange400'];
function makeTile(index: number): NockerlAttachment {
  const styles = getComputedStyle(document.documentElement);
  const hue =
    styles.getPropertyValue('--color-core-categorical-' + String(TILE_HUES[index % TILE_HUES.length])).trim() || 'gray';
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="104" height="104">' +
    '<rect width="104" height="104" fill="' + hue + '"/>' +
    '<circle cx="34" cy="36" r="15" fill="white" opacity=".45"/>' +
    '<path d="M0 86 38 50l26 22 18-13 22 21v24H0z" fill="black" opacity=".28"/>' +
    '</svg>';
  return { src: 'data:image/svg+xml,' + encodeURIComponent(svg), alt: 'Screenshot ' + String(index + 1) };
}

// The wide-proof stage widths (task 2676): the design lead's real device extremes (Pixel Fold
// folded / unfolded) + the tokenized chat-column cap (1040 = --size-chat-column-max).
const WIDE_STAGES = [
  { label: 'Folded · 360', width: 360 },
  { label: 'Unfolded · 840', width: 840 },
  { label: 'Wide · 1040 (columnMax)', width: 1040 },
];

// Demo chrome only: the contained stage + the floating positioner (the pill itself is
// the shipped composite). Mirrors the FloatingPills stage idiom: feed scrolls under.
const STYLES = `
.nk-cid { font-family: var(--font-family-sans); }
/* the contained STAGE: a chat feed that scrolls UNDER the floating pill. */
.nk-cid__stage {
  position: relative; overflow: hidden; height: 420px;
  border-radius: var(--radius-card); background: var(--color-chat-bg);
  border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
/* the scrolling feed; padded at the bottom so resting bubbles clear the pill. */
.nk-cid__feed {
  position: absolute; inset: 0; overflow-y: auto; scrollbar-width: thin;
  padding: var(--space-4) var(--space-4) calc(var(--space-16) + var(--space-8));
  display: flex; flex-direction: column; gap: var(--space-3);
}
/* the floating INPUT positioner, a centered COLUMN on the float layer: the pending
   attachments ride directly ABOVE the pill (the native integration = one small gap),
   both on the same L3 plane. */
.nk-cid__dock {
  position: absolute; left: 0; right: 0; bottom: var(--space-4); z-index: 2;
  display: flex; flex-direction: column; align-items: stretch; gap: var(--space-2);
  padding: 0 var(--space-4); pointer-events: none;
}
.nk-cid__dock > * { pointer-events: auto; }
/* the attachments row + Recording HUD render INSIDE the component's own host stack
   (the published API owns the alignment); the demo dock just positions it. */
/* ── the WIDE-STAGE PROOF (task 2676): three fixed-width chat columns (folded 360 ·
   unfolded 840 · wide 1040 = --size-chat-column-max) in a scrollable strip, proving the
   caps the design lead's Pixel Fold / tablet exercise: bubbles clamp to min(82%, bubbleMax) and
   the input pill clamps to bubbleMax CENTERED, so content never stretches edge-to-edge. ── */
.nk-cid__widestrip { display: flex; gap: var(--space-4); align-items: flex-start;
  overflow-x: auto; padding-bottom: var(--space-2); scrollbar-width: thin; }
.nk-cid__wstage { flex: 0 0 auto; position: relative; overflow: hidden;
  border-radius: var(--radius-card); background: var(--color-chat-bg);
  border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight);
  display: flex; flex-direction: column; gap: var(--space-3);
  padding: var(--space-4); }
.nk-cid__wstage > :not(.nk-fb-surface) { position: relative; }
.nk-cid__wcap { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); }
/* demo chrome (labels + live counter) */
.nk-cid__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-cid__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-cid__count b { color: var(--color-accent-primary); }
`;

// (No compose contract here: the demo purely CONSUMES the shipped NockerlChatInput, so
// the contract lives with the composite in packages/react, like Dialog/BottomSheet.)

/**
 * The interactive showcase mounted on the Chat input page: the floating pill over a
 * live feed. Type → the circle morphs to SEND; clear → MIC; long-press → manual flip;
 * Enter (or the circle) sends and the message lands in the feed as a real bubble.
 */
export default function ChatInputDemo() {
  const [value, setValue] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const [pending, setPending] = useState<NockerlAttachment[]>([]);
  // The RECORDING flow (task 2623): mic starts it; the HUD pops above the pill with a live
  // timer + synthetic levels; its ghost Cancel (or the mic again) ends it.
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([0.32, 0.74, 0.5, 0.86, 0.4]);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    // synthetic sum-of-sines levels (no real microphone); bar HEIGHT is the only
    // animated prop; RecordingHud freezes itself under prefers-reduced-motion.
    const meter = window.setInterval(() => {
      const t = Date.now();
      setLevels(
        Array.from({ length: 5 }, (_, i) => {
          const a = Math.sin(t * 0.0021 + i * 1.7);
          const b = Math.sin(t * 0.0053 + i * 0.9);
          return Math.max(0, Math.min(1, 0.55 + 0.3 * a + 0.18 * b));
        }),
      );
    }, 120);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(meter);
    };
  }, [recording]);

  const startRecording = () => {
    setElapsed(0);
    setRecording(true);
  };

  const send = () => {
    const msg = value.trim();
    if (!msg) return;
    setSent((s) => [...s, msg]);
    setValue('');
    setPending([]); // a send consumes the pending attachments (real-composer behavior)
    // keep the newest message in view (the feed scrolls under the pill)
    requestAnimationFrame(() => {
      const el = feedRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  };

  // Attach: each press adds a deterministic thumbnail (cap 6); the popover renders
  // the moment the first one lands, floating directly ABOVE the pill (task 2622).
  const attach = () => setPending((p) => (p.length >= 6 ? p : [...p, makeTile(p.length)]));

  return (
    <div className="nk-cid">
      {/* the REAL ChatBubble styles, injected once so the feed renders true bubbles */}
      <style>{chatStyles}</style>
      <style>{STYLES}</style>

      {/* the Recording HUD styles (shared from the HUD's canonical demo module) */}
      <style>{hudStyles}</style>

      <p className="nk-cid__lbl">The whole flow (attach, type, record): everything floats on one layer</p>
      <div className="nk-cid__stage">
        {/* the REAL faceted chat ground (task 2669), the one unified primitive */}
        <NockerlFacetedBackground bare aria-hidden="true" />
        <div className="nk-cid__feed" ref={feedRef}>
          <ChatBubble role="agent">The chat input floats over the feed, and messages scroll under it.</ChatBubble>
          <ChatBubble role="user">And the thick cyan edge marks it as a floating layer?</ChatBubble>
          <ChatBubble role="agent">
            Exactly. The §2 signature border rides the pill container. Type something: the circle morphs from mic
            to send.
          </ChatBubble>
          {sent.map((msg, i) => (
            <ChatBubble key={i} role="user">
              {msg}
            </ChatBubble>
          ))}
        </div>

        <div className="nk-cid__dock">
          {/* the WHOLE integration rides the published API (task 2682): the attachments
              MODEL renders the popover inside the component (warm dismissable edge vs the
              pill's persistent cyan, task 2622), and the Recording HUD (task 2623) mounts
              through the generic contextAccessory slot. One component, adoption-ready. */}
          <NockerlChatInput
            value={value}
            onValueChange={setValue}
            onSend={send}
            onMic={() => (recording ? setRecording(false) : startRecording())}
            onAttach={attach}
            attachments={pending}
            onRemoveAttachment={(i) => setPending((p) => p.filter((_, j) => j !== i))}
            contextAccessory={
              recording ? (
                <RecordingHud phase="recording" levels={levels} elapsed={elapsed} onCancel={() => setRecording(false)} />
              ) : undefined
            }
          />
        </div>
      </div>

      <p className="nk-cid__lbl" style={{ marginTop: 'var(--space-5)' }}>
        Adaptive width, folded 360 · unfolded 840 · wide 1040 (scroll →): bubbles clamp to min(82%, bubbleMax),
        the pill clamps to bubbleMax and centers
      </p>
      <div className="nk-cid__widestrip">
        {WIDE_STAGES.map((st) => (
          <div className="nk-cid__wstage" style={{ width: st.width }} key={st.label}>
            <NockerlFacetedBackground bare aria-hidden="true" />
            <span className="nk-cid__wcap">{st.label}</span>
            <ChatBubble role="agent">The column clamps, so content never stretches edge-to-edge.</ChatBubble>
            <ChatBubble role="user">And the pill lines up with the messages.</ChatBubble>
            <NockerlChatInput value="" onValueChange={() => {}} onSend={() => {}} onMic={() => {}} ariaLabel={'Message (' + st.label + ')'} />
          </div>
        ))}
      </div>

      <p className="nk-cid__count">
        Sent <b>{sent.length}</b> {sent.length === 1 ? 'message' : 'messages'} · pending <b>{pending.length}</b>{' '}
        {pending.length === 1 ? 'attachment' : 'attachments'} · recording <b>{recording ? 'live' : 'off'}</b>. The +
        attaches (X removes), the mic pops the HUD above the pill (Cancel or the mic ends it), Enter sends,
        long-press the circle to flip send↔mic. The island is live.
      </p>
    </div>
  );
}
