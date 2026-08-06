/**
 * ApprovalContentDemo: the live island for the shipped NockerlApprovalContent anatomy
 * itself. The package owns the anatomy (title → preview → options → risk
 * note → actions) and the ratified CTA grammar (NockerlApprovalActions: outline confirm ·
 * ghost cancel · destructive = outline-red, Dialog canon); this harness proves the
 * HOST-AGNOSTIC claim live. The SAME element tree renders into:
 *
 *   • a PANEL host, an inline lifted card: title via the content's own title row,
 *     actions INLINE via the `actions` slot;
 *   • a SHEET host, the real NockerlBottomSheet in a contained phone stage: title on the
 *     SHEET header, actions PINNED in the sheet's `footer` slot, the
 *     content keeping only preview / options / risk.
 *
 * The host wiring is RATIFIED (2026-07-05 adjudication addendum): one anatomy,
 * platform-idiomatic hosts. Web desktop/pointer = the INLINE PANEL; compact/touch
 * widths = the shipped BottomSheet. The demo's context switch DERIVES the host from
 * that rule (host = f(context), never a free choice).
 *
 * The approval VIEWS (tool call / destructive command / plan / ask-user) are pure
 * CONFIGS of the anatomy's slots, with no new components: the preview slot carries a mono
 * command well or a plan list, the options slot carries the real NockerlRadioGroup +
 * NockerlTextField, the risk-note slot composes the ratified banner grammar (recessed
 * NockerlStatusDisc + whisper intent border on a solid lifted surface).
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a var(--token); literals
 * are pure geometry. No backticks in STYLES.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ALERT_INTENT,
  NockerlApprovalActions,
  NockerlApprovalContent,
  NockerlBottomSheet,
  NockerlButton,
  NockerlRadioGroup,
  NockerlSegmentedControl,
  NockerlStatusDisc,
  NockerlTextField,
  NockerlWell,
} from '@dizyx/nockerl-react';

// Demo chrome only: the panel-host card, the compact sheet stage, and the slot
// CONTENT idioms (mono command line, plan steps, the banner-grammar risk row). The
// anatomy's own spacing/typography ships in the package.
const STYLES = `
.nk-acd { font-family: var(--font-family-sans); }
.nk-acd__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-acd__ctl { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; margin-bottom: var(--space-4); }
.nk-acd__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-acd__count b { color: var(--color-accent-primary); }

/* PANEL HOST: an inline lifted approval card (Law 1: neutral shadow + catch-light). */
.nk-acd-panel {
  max-width: var(--size-chat-tool-card-max); margin-inline: auto;
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-panel);
  padding: var(--space-4);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight),
              0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent);
}

/* SHEET HOST: the compact contained stage the sheet rises inside (demo chrome). */
.nk-acd-stage {
  position: relative; width: 100%; max-width: 300px; height: 440px; margin-inline: auto;
  border-radius: calc(var(--radius-card) + var(--space-2)); overflow: hidden; isolation: isolate;
  background:
    radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--color-card-surface1) 70%, transparent), transparent 60%),
    var(--color-chat-bg, var(--color-canvas));
  border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight),
              0 var(--elevation-level3) 28px -12px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent);
}
.nk-acd-app { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column;
  gap: var(--space-3); padding: var(--space-5) var(--space-4); }
.nk-acd-app__line { height: var(--space-3); border-radius: var(--radius-track); background: var(--color-card-hairline); }
.nk-acd-app__line--w70 { width: 70%; } .nk-acd-app__line--w50 { width: 50%; }
.nk-acd-app__cta { margin-top: auto; align-self: stretch; }

/* SLOT CONTENT idioms (configs, not components) ------------------------------- */
/* preview: the mono COMMAND inside a sunken NockerlWell (fields sink, per Law 1). */
.nk-acd-cmd { padding: var(--space-2) var(--space-3); }
.nk-acd-cmd__line { margin: 0; font-family: var(--font-family-mono); font-size: var(--font-size-12);
  line-height: var(--font-line-height-20); color: var(--color-on-card); overflow-wrap: anywhere; }
.nk-acd-cmd__meta { margin: var(--space-0-5) 0 0; font-size: var(--font-size-10);
  color: var(--color-on-card-muted); }
/* preview: the PLAN steps (an ordered list, reading scale). */
.nk-acd-plan { margin: 0; padding-left: var(--space-5); display: flex; flex-direction: column; gap: var(--space-2); }
.nk-acd-plan li { font-size: var(--font-size-14); line-height: var(--font-line-height-20); color: var(--color-on-card); }
.nk-acd-plan li::marker { color: var(--color-on-card-muted); font-size: var(--font-size-10); }
/* risk note: the ratified banner grammar, meaning a SOLID surface, a recessed status disc,
   a WHISPER of the intent in the border only (never a wash). --acd-c = the intent. */
.nk-acd-risk { display: flex; align-items: flex-start; gap: var(--space-3);
  padding: var(--space-3); border-radius: var(--radius-panel);
  background: var(--color-card-surface1);
  border: var(--space-px) solid color-mix(in srgb, var(--acd-c) 22%, var(--color-card-hairline)); }
.nk-acd-risk__txt { flex: 1 1 auto; min-width: 0; font-size: var(--font-size-12);
  line-height: var(--font-line-height-20); color: var(--color-on-card); }
.nk-acd-risk__txt b { color: var(--acd-c); font-weight: var(--font-weight-semibold); }
`;

// The warning triangle knocked into the risk disc (stroke, currentColor).
const RISK_GLYPH = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

/** The banner-grammar risk row: a CONFIG of the ratified alert vocabulary (recessed
 *  disc + whisper border), composed inline for the risk-note slot. */
function RiskNote({ text }: { text: React.ReactNode }) {
  return (
    <div className="nk-acd-risk" role="note" style={{ '--acd-c': ALERT_INTENT.warning.color } as React.CSSProperties}>
      <NockerlStatusDisc intent="warning" inset lineNudge="var(--space-0-5)">
        {RISK_GLYPH}
      </NockerlStatusDisc>
      <span className="nk-acd-risk__txt">{text}</span>
    </div>
  );
}

type ViewKind = 'tool' | 'shell' | 'plan' | 'ask';
type HostKind = 'panel' | 'sheet';
type ContextKind = 'desktop' | 'compact';
// THE RATIFIED WIRING (2026-07-05): desktop/pointer -> inline panel;
// compact/touch -> the web BottomSheet. The host follows the context, period.
const HOST_FOR: Record<ContextKind, HostKind> = { desktop: 'panel', compact: 'sheet' };

/**
 * The interactive showcase mounted on the Approval content page: pick a VIEW (tool
 * call / destructive command / plan / ask-user, each a pure config of the anatomy's
 * slots) and a CONTEXT (desktop·pointer vs. compact·touch). The HOST is DERIVED per
 * the ratified stance (panel on desktop, sheet on compact) and the same
 * NockerlApprovalContent renders into it, title and actions migrating to whatever
 * chrome the host owns. The ask-user view holds its confirm disabled until an option
 * is chosen (the confirmDisabled wire).
 */
export default function ApprovalContentDemo() {
  const [view, setView] = useState<ViewKind>('shell');
  const [context, setContext] = useState<ContextKind>('desktop');
  const host = HOST_FOR[context]; // derived from the ratified wiring, not a choice
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [decision, setDecision] = useState<string | null>(null);
  const [decisions, setDecisions] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // ask-user view state: the options slot is a real NockerlRadioGroup + NockerlTextField.
  const [choice, setChoice] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    setChoice('');
    setNote('');
    setDecision(null);
  }, [view]);
  useEffect(() => {
    if (host === 'sheet') setSheetOpen(true);
  }, [host]);

  const decide = useCallback((verdict: string) => {
    setDecision(verdict);
    setDecisions((c) => c + 1);
    setSheetOpen(false);
    triggerRef.current?.focus();
  }, []);

  // ── The VIEWS: pure configs of the anatomy's slots (no new components) ──
  const CONFIGS: Record<
    ViewKind,
    {
      title: string;
      subtitle: string;
      preview: React.ReactNode;
      options?: React.ReactNode;
      riskNote?: React.ReactNode;
      tone: 'primary' | 'destructive';
      confirmLabel: string;
      cancelLabel: string;
      confirmDisabled?: boolean;
    }
  > = {
    tool: {
      title: 'Approve tool call',
      subtitle: 'The agent wants to run a command',
      preview: (
        <NockerlWell layout="area" className="nk-acd-cmd">
          <p className="nk-acd-cmd__line">bun test --filter chat</p>
          <p className="nk-acd-cmd__meta">~/dizyx/projects/nockerl-dashboard · read-only checks</p>
        </NockerlWell>
      ),
      tone: 'primary',
      confirmLabel: 'Approve',
      cancelLabel: 'Deny',
    },
    shell: {
      title: 'Approve shell command',
      subtitle: 'This command modifies the working tree',
      preview: (
        <NockerlWell layout="area" className="nk-acd-cmd">
          <p className="nk-acd-cmd__line">rm -rf build/ dist/</p>
          <p className="nk-acd-cmd__meta">~/dizyx/projects/nockerl-design · destructive</p>
        </NockerlWell>
      ),
      riskNote: (
        <RiskNote
          text={
            <>
              Deletes <b>2 directories</b> permanently. There is no undo, and regenerating requires a full rebuild.
            </>
          }
        />
      ),
      tone: 'destructive',
      confirmLabel: 'Run anyway',
      cancelLabel: 'Deny',
    },
    plan: {
      title: 'Approve plan',
      subtitle: '3 steps · touches 4 files',
      preview: (
        <ol className="nk-acd-plan">
          <li>Extract the shared retry logic into lib/retry.ts.</li>
          <li>Point both API clients at the shared helper.</li>
          <li>Add unit tests for the backoff ladder.</li>
        </ol>
      ),
      tone: 'primary',
      confirmLabel: 'Approve plan',
      cancelLabel: 'Keep planning',
    },
    ask: {
      title: 'Release timing',
      subtitle: 'The agent needs a decision to continue',
      preview: undefined,
      options: (
        <>
          <NockerlRadioGroup
            label="How should this ship?"
            options={[
              { value: 'now', label: 'Ship now', description: 'Merge and deploy immediately' },
              { value: 'ci', label: 'Wait for CI', description: 'Merge after the full pipeline is green' },
              { value: 'draft', label: 'Draft PR only', description: 'Open the PR, hold the merge' },
            ]}
            value={choice}
            onChange={setChoice}
          />
          <NockerlTextField label="Notes (optional)" value={note} onChange={setNote} placeholder="Anything the agent should know" />
        </>
      ),
      tone: 'primary',
      confirmLabel: 'Submit',
      cancelLabel: 'Cancel',
      confirmDisabled: choice === '',
    },
  };
  const cfg = CONFIGS[view];

  const actions = (
    <NockerlApprovalActions
      confirmLabel={cfg.confirmLabel}
      cancelLabel={cfg.cancelLabel}
      tone={cfg.tone}
      confirmDisabled={cfg.confirmDisabled ?? false}
      onConfirm={() => decide(cfg.confirmLabel)}
      onCancel={() => decide(cfg.cancelLabel)}
    />
  );

  return (
    <div className="nk-acd">
      <style>{STYLES}</style>

      <p className="nk-acd__lbl">View (a config of the slots) · context (the host follows it, per the ratified wiring)</p>
      <div className="nk-acd__ctl">
        <NockerlSegmentedControl
          label="View"
          size="sm"
          segments={[
            { value: 'tool', label: 'Tool call' },
            { value: 'shell', label: 'Destructive' },
            { value: 'plan', label: 'Plan' },
            { value: 'ask', label: 'Ask user' },
          ]}
          value={view}
          onChange={(n) => setView(n as ViewKind)}
        />
        <NockerlSegmentedControl
          label="Context"
          size="sm"
          segments={[
            { value: 'desktop', label: 'Desktop · pointer' },
            { value: 'compact', label: 'Compact · touch' },
          ]}
          value={context}
          onChange={(n) => setContext(n as ContextKind)}
        />
      </div>

      {host === 'panel' ? (
        /* PANEL HOST, with no chrome of its own: the content carries the title row AND
           the inline actions slot. */
        <div className="nk-acd-panel">
          <NockerlApprovalContent
            title={cfg.title}
            subtitle={cfg.subtitle}
            preview={cfg.preview}
            options={cfg.options}
            riskNote={cfg.riskNote}
            actions={actions}
          />
        </div>
      ) : (
        /* SHEET HOST: the sheet owns the title (header) and PINS the same actions
           in its footer slot; the content keeps only the middle slots. */
        <div className="nk-acd-stage" ref={setStage}>
          <div className="nk-acd-app" aria-hidden={sheetOpen}>
            <div className="nk-acd-app__line nk-acd-app__line--w70" />
            <div className="nk-acd-app__line nk-acd-app__line--w50" />
            <div className="nk-acd-app__cta">
              <NockerlButton ref={triggerRef} text="Reopen approval" variant="primary" fullWidth onClick={() => setSheetOpen(true)} />
            </div>
          </div>
          <NockerlBottomSheet
            open={sheetOpen}
            onDismiss={() => decide('Dismissed')}
            stage={stage}
            detent="half"
            title={cfg.title}
            subtitle={cfg.subtitle}
            footer={actions}
          >
            <NockerlApprovalContent preview={cfg.preview} options={cfg.options} riskNote={cfg.riskNote} />
          </NockerlBottomSheet>
        </div>
      )}

      <p className="nk-acd__count">
        {decision ? (
          <>
            Last decision: <b>{decision}</b> · {decisions} total. The island is live.
          </>
        ) : (
          <>
            Decide with the CTA row: outline confirm, ghost cancel{view === 'shell' ? ', destructive = outline-red' : ''}. The host
            follows the context (desktop → panel, compact → sheet, the ratified wiring); the anatomy never changes.
          </>
        )}
      </p>
    </div>
  );
}
