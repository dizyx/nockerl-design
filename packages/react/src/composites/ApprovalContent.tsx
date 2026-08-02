/**
 * NockerlApprovalContent, the APPROVAL ANATOMY (WS2 · task 2653): the one shared
 * content shape every agent-console approval renders (tool-call, plan, ask-user),
 * deliberately HOST-AGNOSTIC. It is pure content: no overlay, no scrim, no host
 * chrome. Mount it inside a NockerlBottomSheet (title on the sheet, actions PINNED in
 * the sheet's footer slot), a NockerlDialog (actions via the dialog's own CTAs), or an
 * inline panel (title + actions inline). The RATIFIED stance (2026-07-05 adjudication
 * addendum) is one anatomy, platform-idiomatic hosts: web desktop/pointer hosts inline
 * panels (Panel/Dialog grammar), compact/touch web widths + Android host the
 * BottomSheet. The component works in all of them unchanged.
 *
 * Anatomy (top-down): optional TITLE row (for hosts without their own header) →
 * PREVIEW slot (a ToolCallCard, Markdown content, a diff…) → OPTIONS slot (RadioGroup /
 * Checkbox / TextField rows) → RISK-NOTE slot (a Banner / Callout) → optional inline
 * ACTIONS row.
 *
 * `NockerlApprovalActions` is exported SEPARATELY as the ratified CTA grammar (Dialog
 * r5 canon: outline confirm · ghost cancel · destructive = outline-red; never a filled
 * primary on a lifted surface), so sheet hosts can pin it in the footer while panel
 * hosts render it inline. One grammar, any host.
 *
 * TOKEN-REACTIVE; literals are pure geometry. No backticks in STYLES.
 */
import type { ReactNode } from 'react';
import { NockerlButton } from '../primitives/Button';
import type { ComposeContract } from '../compose-contract';

export interface NockerlApprovalActionsProps {
  /** Confirm label (e.g. "Approve", "Run tool", "Submit"). */
  confirmLabel?: string;
  /** Cancel label. `null` hides cancel (rare: a single-action acknowledge). */
  cancelLabel?: string | null;
  /** Emphasis of the confirm: outline cyan (default) or destructive outline-red. */
  tone?: 'primary' | 'destructive';
  onConfirm: () => void;
  onCancel?: (() => void) | undefined;
  /** Disable confirm (e.g. an unsatisfied option row). */
  confirmDisabled?: boolean;
}

export interface NockerlApprovalContentProps {
  /** Optional title row for hosts WITHOUT their own header (panels). Sheet/Dialog hosts
   *  carry the title themselves and omit this. */
  title?: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** The PREVIEW slot: what is being approved (ToolCallCard · Markdown · diff…). */
  preview?: ReactNode;
  /** The OPTIONS slot: choice rows (RadioGroup / Checkbox / TextField). */
  options?: ReactNode;
  /** The RISK-NOTE slot: a Banner / Callout carrying caveats. */
  riskNote?: ReactNode;
  /** Optional INLINE actions (panel hosts). Sheet hosts pin NockerlApprovalActions in
   *  the sheet footer instead and omit this. */
  actions?: ReactNode;
  /** Extra class. */
  className?: string;
}

// A quiet content column: the SLOTS carry the real components; this recipe only
// spaces them and voices the optional title row. Actions right-align (the CTA row).
export const NOCKERL_APPROVAL_CONTENT_STYLES = `
.nk-ac { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.nk-ac__head { display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-ac__title { margin: 0; font-size: var(--font-size-16); font-weight: var(--font-weight-semibold);
  line-height: var(--font-line-height-24); color: var(--color-on-card); }
.nk-ac__sub { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); }
.nk-ac__actions { display: flex; justify-content: flex-end; align-items: center; gap: var(--space-2); margin-top: var(--space-1); }
`;

/**
 * The ratified approval CTA row (Dialog r5 canon): outline confirm (tertiary cyan |
 * destructive outline-red) + ghost cancel. Pin it in a sheet's footer slot, or hand it
 * to NockerlApprovalContent's `actions` for inline hosts.
 */
export function NockerlApprovalActions({
  confirmLabel = 'Approve',
  cancelLabel = 'Deny',
  tone = 'primary',
  onConfirm,
  onCancel,
  confirmDisabled = false,
}: NockerlApprovalActionsProps) {
  return (
    <>
      {cancelLabel !== null && onCancel && <NockerlButton text={cancelLabel} variant="ghost" onClick={onCancel} />}
      <NockerlButton
        text={confirmLabel}
        variant={tone === 'destructive' ? 'destructive' : 'tertiary'}
        onClick={onConfirm}
        disabled={confirmDisabled}
      />
    </>
  );
}

/**
 * The approval anatomy: [title?] → preview → options → risk note → [inline actions?].
 * Pure content. Mount it in a sheet, a dialog, or a panel unchanged.
 */
export function NockerlApprovalContent({ title, subtitle, preview, options, riskNote, actions, className }: NockerlApprovalContentProps) {
  return (
    <div className={['nk-ac', className].filter(Boolean).join(' ')}>
      {(title || subtitle) && (
        <div className="nk-ac__head">
          {title && <h3 className="nk-ac__title">{title}</h3>}
          {subtitle && <span className="nk-ac__sub">{subtitle}</span>}
        </div>
      )}
      {preview}
      {options}
      {riskNote}
      {actions && <div className="nk-ac__actions">{actions}</div>}
      {/* Recipe CSS injected as the LAST child; identical injected blocks dedupe. */}
      <style>{NOCKERL_APPROVAL_CONTENT_STYLES}</style>
    </div>
  );
}

// CONTAINER: pure slots (preview / options / riskNote / actions all accept anything;
// the views are CONFIGS of these slots per the component-vs-view rule). The actions
// row composes real NockerlButtons (the ratified Dialog CTA grammar). No owns.
export const compose = {
  slots: {
    preview: { accepts: '*', required: false },
    options: { accepts: '*', required: false },
    riskNote: { accepts: '*', required: false },
    actions: { accepts: '*', required: false },
  },
} satisfies ComposeContract;

export default NockerlApprovalContent;
