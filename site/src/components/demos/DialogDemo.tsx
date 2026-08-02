/**
 * DialogDemo: the live, interactive island for the shipped NockerlDialog composite.
 *
 * The reusable centered-modal component now lives in the published package
 * (@dizyx/nockerl-react → NockerlDialog); this file is only the showcase harness that
 * CONSUMES it: a contained stage + faux app, chips that pick the variant (alert ·
 * confirm · destructive · form · header-icon), and a trigger that opens NockerlDialog
 * centred over a dimmed scrim. Mirrors the canonical Compose `AlertDialog` call-sites in
 * chat/ui/SessionChipsDialogs.kt: RenameSubSessionDialog (short form),
 * DeleteSubSessionDialog (DESTRUCTIVE confirm), ClearContextConfirmDialog (neutral
 * confirm), the primary-guard alert (single OK), ForkSubSessionDialog (icon header).
 *
 * The dialog's design laws (lifted card, flat scrim, scale+opacity motion, recessed
 * form well, the shared NockerlStatusDisc header coin) are ENCODED IN THE PACKAGE now; see
 * packages/react/src/composites/Dialog.tsx. This harness only supplies the stage chrome
 * (canvas, faux app, variant chips) that sits UNDER the scrim.
 *
 * A11y: the trigger + every action are real <button>s (NockerlDialog owns role="dialog"
 * aria-modal + aria-labelledby/-describedby, focus trap, Esc, Enter=confirm); opening
 * focuses a sensible control and focus is restored to the trigger by `close`.
 * TOKEN-REACTIVE: every color/font/radius/spacing is a var(--token).
 */
import { useCallback, useRef, useState } from 'react';

import { NockerlButton, NockerlDialog, NockerlSegmentedControl, NockerlTextField, type NockerlDialogProps } from '@dizyx/nockerl-react';

// Demo chrome only: the contained stage + faux app that sits UNDER the scrim (the lifted
// card, its motion, and the scrim itself are the shipped NockerlDialog + NockerlOverlay). Every value
// is a token.
const STYLES = `
.nk-dlg-demo { font-family: var(--font-family-sans); }
/* The contained STAGE: the dialog centres in here, never the page viewport. */
.nk-dlg-stage {
  position: relative; width: 100%; max-width: 480px; height: 460px; margin-inline: auto;
  border-radius: calc(var(--radius-card) + var(--space-2)); overflow: hidden; isolation: isolate; display: grid; place-items: center;
  background: radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--color-card-surface1) 70%, transparent), transparent 60%), var(--color-canvas);
  border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight), 0 var(--elevation-level3) 28px -12px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent);
}
/* faint geometric facets behind everything (the ground is alive, never flat) */
.nk-dlg-stage::before {
  content: ""; position: absolute; inset: 0; z-index: 0; opacity: .5;
  background: linear-gradient(135deg, transparent 46%, var(--color-card-hairline) 47%, transparent 48%), linear-gradient(45deg, transparent 62%, var(--color-alt-hairline) 63%, transparent 64%);
  background-size: 64px 64px, 88px 88px;
}
/* the stage's faux app content, sitting under the scrim */
.nk-dlg-app { position: relative; z-index: 1; width: 100%; height: 100%; display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-5) var(--space-4); }
.nk-dlg-app__bar { height: var(--space-8); border-radius: var(--radius-pill); background: var(--color-chrome-surface); border: var(--space-px) solid var(--color-chrome-hairline); }
.nk-dlg-app__line { height: var(--space-3); border-radius: var(--radius-track); background: var(--color-card-hairline); }
.nk-dlg-app__line--w80 { width: 80%; } .nk-dlg-app__line--w55 { width: 55%; } .nk-dlg-app__line--w68 { width: 68%; }
.nk-dlg-app__spacer { flex: 1 1 auto; }
/* body copy inside the dialog (supplied by this harness as the NockerlDialog children) */
.nk-dlg-text { margin: 0; font-size: var(--font-size-14); line-height: var(--font-line-height-20); color: var(--color-on-card); }
.nk-dlg-text--muted { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); }
.nk-dlg-text b { color: var(--color-on-card); font-weight: var(--font-weight-semibold); }
/* demo chrome (on the canvas, not the dialog) */
.nk-dlg-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-dlg-demo__ctl { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; margin-bottom: var(--space-4); }
.nk-dlg-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-dlg-demo__count b { color: var(--color-accent-primary); }
`;

type DialogKind = 'alert' | 'confirm' | 'destructive' | 'form' | 'hero';

const KINDS: { id: DialogKind; label: string }[] = [
  { id: 'alert', label: 'Alert' },
  { id: 'confirm', label: 'Confirm' },
  { id: 'destructive', label: 'Destructive' },
  { id: 'form', label: 'Form' },
  { id: 'hero', label: 'Header icon' },
];

/**
 * The interactive showcase mounted on the Dialog page: a contained stage + faux
 * app, chips that pick the variant (alert · confirm · destructive · form ·
 * header-icon), and a trigger that opens the shipped NockerlDialog centred over a dimmed
 * scrim. Esc, Cancel, the scrim, and the close (X) dismiss; Enter / Confirm resolves;
 * focus moves in and is restored to the trigger.
 */
export default function DialogDemo() {
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DialogKind>('confirm');
  const [name, setName] = useState('docs site');
  const [last, setLast] = useState<string>('none yet');
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus(); // restore focus to the opener
  }, []);
  const resolve = useCallback(
    (outcome: string) => {
      setLast(outcome);
      close();
    },
    [close],
  );

  const trimmed = name.trim();
  const named = trimmed || 'this session';

  // Per-variant config: props + body. One <NockerlDialog> renders the active kind, so
  // the scrim / focus / motion machinery is exercised identically by all five.
  const CONFIG: Record<
    DialogKind,
    { props: Partial<NockerlDialogProps>; outcome: string; body: React.ReactNode }
  > = {
    alert: {
      props: { title: "Can't delete primary session", confirmLabel: 'OK', cancelLabel: null },
      outcome: 'Acknowledged',
      body: (
        <>
          <p className="nk-dlg-text">The primary session belongs to the project and can't be removed.</p>
          <p className="nk-dlg-text nk-dlg-text--muted">You can rename it instead.</p>
        </>
      ),
    },
    confirm: {
      props: { title: 'Clear context?', confirmLabel: 'Clear' },
      outcome: 'Cleared',
      body: (
        <>
          <p className="nk-dlg-text">
            The next message in <b>“{named}”</b> will start fresh with only the default system prompt.
          </p>
          <p className="nk-dlg-text nk-dlg-text--muted">
            The session itself is preserved; only the conversation memory is cleared.
          </p>
        </>
      ),
    },
    destructive: {
      props: { title: 'Delete session?', tone: 'destructive', icon: 'warning', confirmLabel: 'Delete' },
      outcome: 'Deleted',
      body: (
        <>
          <p className="nk-dlg-text">
            <b>“{named}”</b> will be permanently removed.
          </p>
          <p className="nk-dlg-text nk-dlg-text--muted">
            Chat history is preserved on the server, but the session will no longer appear in the chips bar.
          </p>
        </>
      ),
    },
    form: {
      props: { title: 'Rename session', confirmLabel: 'Rename', confirmDisabled: trimmed.length === 0 },
      outcome: `Renamed → “${trimmed}”`,
      body: (
        <>
          <p className="nk-dlg-text nk-dlg-text--muted">Enter a new name for this session.</p>
          <NockerlTextField label="Name" value={name} placeholder="Session name" onChange={setName} />
        </>
      ),
    },
    hero: {
      props: { title: 'Fork this session', icon: 'fork', confirmLabel: 'Fork' },
      outcome: 'Forked',
      body: (
        <>
          <p className="nk-dlg-text">
            Branch <b>“{named}”</b> into a new one.
          </p>
          <p className="nk-dlg-text nk-dlg-text--muted">
            The forked session starts with the same conversation history.
          </p>
        </>
      ),
    },
  };
  const active = CONFIG[kind];

  return (
    <div className="nk-dlg-demo">
      <style>{STYLES}</style>

      <p className="nk-dlg-demo__lbl">Variant: pick one, then open the dialog</p>
      <div className="nk-dlg-demo__ctl">
        <NockerlSegmentedControl
          label="Dialog variant"
          size="sm"
          segments={KINDS.map((k) => ({ value: k.id, label: k.label }))}
          value={kind}
          onChange={(n) => setKind(n as DialogKind)}
        />
      </div>

      <div className="nk-dlg-stage" ref={setStage}>
        <div className="nk-dlg-app" aria-hidden={open}>
          <div className="nk-dlg-app__bar" />
          <div className="nk-dlg-app__line nk-dlg-app__line--w80" />
          <div className="nk-dlg-app__line nk-dlg-app__line--w55" />
          <div className="nk-dlg-app__line nk-dlg-app__line--w68" />
          <div className="nk-dlg-app__spacer" />
          <div style={{ alignSelf: 'flex-start' }}>
            <NockerlButton
              ref={triggerRef}
              text={`Open ${KINDS.find((k) => k.id === kind)?.label.toLowerCase()} dialog`}
              variant="primary"
              onClick={() => setOpen(true)}
            />
          </div>
        </div>

        <NockerlDialog
          open={open}
          stage={stage}
          title=""
          onDismiss={close}
          onConfirm={() => resolve(active.outcome)}
          {...active.props}
        >
          {active.body}
        </NockerlDialog>
      </div>

      <p className="nk-dlg-demo__count">
        Last outcome: <b>{last}</b>. Esc, Cancel, the scrim, or the close button dismisses;
        Enter / the default action resolves. The island is live.
      </p>
    </div>
  );
}
