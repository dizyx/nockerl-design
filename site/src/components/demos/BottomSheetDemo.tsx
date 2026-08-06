/**
 * BottomSheetDemo: the live, interactive island for the shipped NockerlBottomSheet composite.
 *
 * The reusable pull-up sheet now lives in the published package (@dizyx/nockerl-react →
 * NockerlBottomSheet); this file is only the showcase harness that CONSUMES it: a contained
 * phone stage with a trigger that opens the sheet, toggles for the detent (half / full),
 * the grip (on / off), the content shape (actions list vs settings form), and `showClose`
 * (the opt-in X, OFF by default, Material canon). Mirrors the canonical Compose
 * `NockerlBottomSheet` + `NockerlSheetGrip` call-sites (AvatarSettingsSheet for the settings
 * form, ToolApprovalSheet for the action row, SamplingAdvancedSettings for controls), folded
 * into two content shapes here: an actions list and a settings form.
 *
 * The sheet's design laws (the cardAlt → canvasAlt ground clipped to a rounded top, the
 * neutral upward shadow + catch-light, the slide-up motion, the real half/full detents,
 * the grip bar, the no-X-by-default dismissal) are ENCODED IN THE PACKAGE now; see
 * packages/react/src/composites/BottomSheet.tsx. This harness only supplies the phone
 * stage it rises inside and the actions-list / settings-form content that fills the body.
 *
 * A11y: the trigger is a real <button>; NockerlBottomSheet owns the focus move-in / trap / Esc /
 * scrim-tap dismissal and role="dialog" aria-modal + labelled title. The actions rows are
 * the real NockerlListItem primitive; the settings form composes NockerlSwitch / NockerlSegmentedControl.
 * TOKEN-REACTIVE: every color / font / radius / spacing is a var(--token).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { NockerlApprovalActions, NockerlBottomSheet, NockerlButton, NockerlIcon, NockerlListItem, NockerlSegmentedControl, NockerlSwitch, type SheetDetent } from '@dizyx/nockerl-react';

// Demo chrome only: the contained phone stage the sheet rises inside, plus the actions-list
// / settings-form content that fills the body (the panel itself, its slide, and the scrim are
// the shipped NockerlBottomSheet + NockerlOverlay). Every value is a token.
const STYLES = `
.nk-bs-demo { font-family: var(--font-family-sans); }
/* The contained phone STAGE: the sheet lives in here, never the page. */
.nk-bs-stage {
  position: relative; width: 100%; max-width: 300px; height: 460px; margin-inline: auto;
  border-radius: calc(var(--radius-card) + var(--space-2)); overflow: hidden; isolation: isolate;
  background:
    radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--color-card-surface1) 70%, transparent), transparent 60%),
    var(--color-chat-bg, var(--color-canvas));
  border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight),
              0 var(--elevation-level3) 28px -12px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent);
}
/* faint geometric facets behind everything (the chat field is alive) */
.nk-bs-stage::before {
  content: ""; position: absolute; inset: 0; z-index: 0; opacity: .5;
  background:
    linear-gradient(135deg, transparent 46%, var(--color-card-hairline) 47%, transparent 48%),
    linear-gradient(45deg, transparent 62%, var(--color-alt-hairline) 63%, transparent 64%);
  background-size: 64px 64px, 88px 88px;
}
/* the stage's faux app content sitting under the scrim */
.nk-bs-app { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column;
  gap: var(--space-3); padding: var(--space-5) var(--space-4); }
.nk-bs-app__bar { height: var(--space-8); border-radius: var(--radius-pill);
  background: var(--color-chrome-surface); border: var(--space-px) solid var(--color-chrome-hairline); }
.nk-bs-app__line { height: var(--space-3); border-radius: var(--radius-track); background: var(--color-card-hairline); }
.nk-bs-app__line--w70 { width: 70%; } .nk-bs-app__line--w50 { width: 50%; } .nk-bs-app__line--w85 { width: 85%; }
/* the app-content trigger stretches full width, pinned to the bottom of the faux app */
.nk-bs-app__cta { margin-top: auto; align-self: stretch; }

/* content: an actions list built from the NockerlListItem primitive (leadingIcon action rows; the
   Delete row uses the NockerlListItem danger tone). The NockerlListItem primary caps at the
   ramp's label.large role (300 / light) IN THIS SHEET, because the primitive ships primary at
   500 (medium) for dense lists, which reads near-bold against this sheet's thin type;
   soften it to the ramp locally (demo-root prefixed to out-specify .nk-li__primary),
   never globally, so other list consumers keep the 500 default. */
.nk-bs-demo .nk-bs-body .nk-li__primary { font-weight: var(--font-weight-light); }

/* content: a settings form (label + control rows) */
.nk-bs-field { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-2) 0; }
.nk-bs-flabel { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-alt-muted); font-weight: var(--font-weight-semibold); }
.nk-bs-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; }
.nk-bs-row__txt { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-bs-row__p { font-size: var(--font-size-14); color: var(--color-on-card-alt); }
.nk-bs-row__s { font-size: var(--font-size-12); color: var(--color-on-card-alt-muted); }
.nk-bs-divider { height: var(--space-px); background: var(--color-alt-hairline); margin: var(--space-2) 0; }
/* the settings-form Done CTA: a full-width NockerlButton, spaced from the rows above it */
.nk-bs-done { margin-top: var(--space-2); }

/* demo chrome (on the canvas, not the sheet) */
.nk-bs-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-bs-demo__ctl { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; margin-bottom: var(--space-4); }
.nk-bs-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-bs-demo__count b { color: var(--color-accent-primary); }
`;

// ─── Inline stroke glyphs (currentColor so each slot tints from its token) ──
const IconRename = <NockerlIcon path="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />;
const IconArchive = <NockerlIcon path="M3 8h18v12H3zM3 4h18v4H3zM10 12h4" />;
const IconTrash = <NockerlIcon path="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />;
const IconShare = (
  <NockerlIcon>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </NockerlIcon>
);
// a settings cog for the OPTIONAL leading icon (a plain glyph beside the "Settings"
// title; the header divider stays neutral, never cyan).
const IconCog = (
  <NockerlIcon>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </NockerlIcon>
);

type SheetKind = 'actions' | 'settings' | 'approve';

/**
 * The interactive showcase mounted on the Bottom sheet page: a contained phone
 * stage with a trigger that opens the shipped NockerlBottomSheet. Toggle the detent
 * (half / full), the grip (on / off), the content shape (actions list vs. settings
 * form), and `showClose` (the opt-in X, OFF by default, Material canon), then open
 * it to watch the scrim fade + the panel slide. The DEFAULT presentation has NO X:
 * the drag handle + a scrim tap + Esc dismiss it; flip Close on to add the X. Focus
 * moves in on a user open and is restored to the trigger on close.
 */
export default function BottomSheetDemo() {
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(true); // OPEN by default; dismiss reveals the trigger, which reopens
  const [detent, setDetent] = useState<SheetDetent>('half');
  const [grip, setGrip] = useState(true);
  const [showClose, setShowClose] = useState(false); // Material canon: NO X by default
  const [kind, setKind] = useState<SheetKind>('actions');
  const [opens, setOpens] = useState(1);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus(); // restore focus to the opener
  }, []);

  // The approve kind: a pinned footer + a nested detail view w/ back-nav
  const [nested, setNested] = useState(false);
  useEffect(() => {
    if (!open) setNested(false);
  }, [open]);

  // settings-form state (live controls inside the sheet)
  const [theme, setTheme] = useState('System');
  const [biometric, setBiometric] = useState(true);
  const [push, setPush] = useState(false);

  return (
    <div className="nk-bs-demo">
      <style>{STYLES}</style>

      <p className="nk-bs-demo__lbl">Detent · grip · content: set them, then open the sheet</p>
      <div className="nk-bs-demo__ctl">
        <NockerlSegmentedControl
          label="Detent"
          size="sm"
          segments={[
            { value: 'half', label: 'Half' },
            { value: 'full', label: 'Full' },
          ]}
          value={detent}
          onChange={(n) => setDetent(n as SheetDetent)}
        />
        <NockerlSegmentedControl
          label="Grip"
          size="sm"
          segments={[
            { value: 'on', label: 'Grip on' },
            { value: 'off', label: 'Grip off' },
          ]}
          value={grip ? 'on' : 'off'}
          onChange={(n) => setGrip(n === 'on')}
        />
        <NockerlSegmentedControl
          label="Close (X)"
          size="sm"
          segments={[
            { value: 'off', label: 'No X' },
            { value: 'on', label: 'Show X' },
          ]}
          value={showClose ? 'on' : 'off'}
          onChange={(n) => setShowClose(n === 'on')}
        />
        <NockerlSegmentedControl
          label="Content"
          size="sm"
          segments={[
            { value: 'actions', label: 'Actions' },
            { value: 'settings', label: 'Settings' },
            { value: 'approve', label: 'Approve' },
          ]}
          value={kind}
          onChange={(n) => setKind(n as SheetKind)}
        />
      </div>

      <div className="nk-bs-stage" ref={setStage}>
        <div className="nk-bs-app" aria-hidden={open}>
          <div className="nk-bs-app__bar" />
          <div className="nk-bs-app__line nk-bs-app__line--w70" />
          <div className="nk-bs-app__line nk-bs-app__line--w85" />
          <div className="nk-bs-app__line nk-bs-app__line--w50" />
          <div className="nk-bs-app__cta">
            <NockerlButton
              ref={triggerRef}
              text={kind === 'actions' ? 'Session options' : 'Open settings'}
              variant="primary"
              fullWidth
              onClick={() => {
                setOpen(true);
                setOpens((c) => c + 1);
              }}
            />
          </div>
        </div>

        <NockerlBottomSheet
          open={open}
          onDismiss={close}
          stage={stage}
          detent={detent}
          grip={grip}
          showClose={showClose}
          title={kind === 'approve' ? (nested ? 'Command detail' : 'Approve tool call') : kind === 'actions' ? 'nockerl-design · docs' : 'Settings'}
          subtitle={kind === 'approve' ? (nested ? 'gradle - shell-fs family' : 'The agent wants to run a command') : kind === 'actions' ? 'Streaming · 2 tools running' : 'Account & appearance'}
          leadingIcon={kind === 'settings' ? IconCog : undefined}
          onBack={kind === 'approve' && nested ? () => setNested(false) : undefined}
          footer={
            /* the ratified CTA row pinned in the footer slot, never a
               hand-rolled Deny/Approve pair; the full anatomy lives on the Approval
               content page. */
            kind === 'approve' && !nested ? <NockerlApprovalActions onConfirm={close} onCancel={close} /> : undefined
          }
        >
          {kind === 'approve' ? (
            nested ? (
              <>
                <p className="nk-bs-row__p" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-12)' }}>
                  ./gradlew assembleDebug --stacktrace
                </p>
                <p className="nk-bs-row__s">
                  Runs in ~/dizyx/projects/nockerl-dashboard - writes build outputs only. Back returns to the approval.
                </p>
              </>
            ) : (
              <>
                <p className="nk-bs-row__p">
                  Run <b style={{ fontFamily: 'var(--font-family-mono)' }}>./gradlew assembleDebug</b> in the project root?
                </p>
                <p className="nk-bs-row__s">
                  The pinned bar below never scrolls away; the upward shadow appears while more content remains beneath it.
                </p>
                <NockerlButton text="View command detail" variant="ghost" size="sm" onClick={() => setNested(true)} />
                <div className="nk-bs-divider" />
                <p className="nk-bs-row__s">Scroll filler - resize the detent to half to see the footer cue engage.</p>
                <p className="nk-bs-row__s">The sheet body scrolls under the pinned footer, exactly like content scrolls under the header (the same cue, inverted).</p>
                <p className="nk-bs-row__s">Approve / Deny stay reachable at every scroll position - the whole point of the pinned bar.</p>
              </>
            )
          ) : kind === 'actions' ? (
            <>
              <NockerlListItem primary="Share session" leadingIcon={IconShare} onSelect={close} />
              <NockerlListItem primary="Rename" leadingIcon={IconRename} onSelect={close} />
              <NockerlListItem primary="Archive" leadingIcon={IconArchive} onSelect={close} />
              <div className="nk-bs-divider" />
              <NockerlListItem primary="Delete session" leadingIcon={IconTrash} danger onSelect={close} />
            </>
          ) : (
            <>
              <div className="nk-bs-field">
                <span className="nk-bs-flabel">Theme</span>
                <NockerlSegmentedControl
                  label="Theme"
                  size="sm"
                  fullWidth
                  segments={['Light', 'Dark', 'System'].map((opt) => ({ value: opt, label: opt }))}
                  value={theme}
                  onChange={(n) => setTheme(n)}
                />
              </div>
              <div className="nk-bs-divider" />
              <div className="nk-bs-row">
                <span className="nk-bs-row__txt">
                  <span className="nk-bs-row__p">Biometric login</span>
                  <span className="nk-bs-row__s">Require fingerprint or PIN</span>
                </span>
                <NockerlSwitch
                  checked={biometric}
                  onChange={(n) => setBiometric(n)}
                  ariaLabel="Biometric login"
                  size="sm"
                />
              </div>
              <div className="nk-bs-row">
                <span className="nk-bs-row__txt">
                  <span className="nk-bs-row__p">Push notifications</span>
                  <span className="nk-bs-row__s">Alerts when a session needs you</span>
                </span>
                <NockerlSwitch
                  checked={push}
                  onChange={(n) => setPush(n)}
                  ariaLabel="Push notifications"
                  size="sm"
                />
              </div>
              <NockerlButton className="nk-bs-done" text="Done" variant="primary" fullWidth onClick={close} />
            </>
          )}
        </NockerlBottomSheet>
      </div>

      <p className="nk-bs-demo__count">
        Sheet opened <b>{opens}</b> {opens === 1 ? 'time' : 'times'}. The drag handle, a scrim tap, or Esc dismisses it
        (no X by default; flip Close on to add the opt-in X). The island is live.
      </p>
    </div>
  );
}
