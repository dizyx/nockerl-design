/**
 * NockerlBanner: the Tier-3 PERSISTENT inline notice, the page-level member of the alert
 * family.
 *
 * Where NockerlToast is transient and NockerlCallout is set inside prose, a banner is the
 * standing notice a surface carries until it is resolved or dismissed: a SOLID lifted card
 * whose intent lives in the leading status disc.
 *
 * Design laws encoded here (do not re-derive in a consumer):
 *   - Law 6: severity rides a status DISC at the leading edge. There is no left rail, no
 *     vertical stripe and no tinted-background wash. Being the persistent inline form, the
 *     banner is the one member the law lets sink its disc into a RECESSED INSET WELL: the
 *     intent color rides the glyph plus a soft wash and a whisper border, still a disc,
 *     now informational and non-interactive.
 *   - Law 1: depth is a neutral lift plus a top catch-light. No glow, no colored shadow.
 *   - Law 7: the dismiss animation moves interpolatable properties only, a height collapse
 *     with a fade. The disc and the surface never tween.
 *
 * Intent colors are single-sourced from ALERT_INTENT so Banner, Toast and Callout cannot
 * drift. `neutral` has no shared-map peer and passes a raw on-card override to the disc.
 * TOKEN-REACTIVE: every color, radius, space and type size is a var(--token); the intent
 * rides in on the --bn-c custom property. No backticks in STYLES.
 */
import { ALERT_INTENT } from '../alertIntents.js';
import { NockerlButton } from '../primitives/Button.js';
import { NockerlIcon } from '../primitives/Icon.js';
import { NockerlIconButton } from '../primitives/IconButton.js';
import { NockerlStatusDisc } from '../primitives/StatusDisc.js';
import type { ReactNode } from 'react';
import type { AlertIntent } from '../alertIntents.js';
import type { ComposeContract } from '../compose-contract.js';

export type NockerlBannerIntent = 'info' | 'success' | 'warning' | 'danger' | 'notice' | 'neutral';

export interface NockerlBannerProps {
  /** Body copy: the message. Carries the alert's accessible text. */
  message: string;
  /** Semantic intent: drives the status color, the default icon, and role. */
  intent?: NockerlBannerIntent;
  /** Optional bold heading above the message (a single short line). */
  title?: string;
  /** Show the leading status disc. Defaults to on; turn off for a bare banner. */
  icon?: boolean;
  /** Optional inline action label (a quiet text button, right-aligned). */
  actionLabel?: string;
  /** Action handler. Ignored when no actionLabel is given. */
  onAction?: () => void;
  /** Show a dismiss (X), a separate focusable control. */
  dismissible?: boolean;
  /** Dismiss handler (the X). */
  onDismiss?: () => void;
}

// Each intent maps to ONE status token (cyan only for `info`; on-card for
// neutral). The DISC is filled with this color; the title takes it too. The glyph
// inside the disc is knocked out to the dark ground so it reads as a stencil.
//
// SINGLE-SOURCED: the four shared severities + the warm `notice` accent pull their
// color from ALERT_INTENT (the one alert-family map) so Banner / Toast / Callout
// cannot drift. Banner names the destructive intent `danger` where the shared map
// names it `error`: same color token, different local label. `info` resolves to
// the brand cyan, which is token-identical to the old --color-status-info in both
// themes (no visual change). Only `neutral` stays local (it has no shared-map peer).
const INTENT_COLOR: Record<NockerlBannerIntent, string> = {
  info: ALERT_INTENT.info.color, // cyan, the one place cyan is allowed
  success: ALERT_INTENT.success.color,
  warning: ALERT_INTENT.warning.color,
  danger: ALERT_INTENT.error.color, // banner `danger` == shared `error`
  notice: ALERT_INTENT.notice.color, // the rare warm brand accent (orange), NOT a status
  neutral: 'var(--color-on-card)', // quiet, no shared-map equivalent, kept local
};

// Banner's local intent names → the shared AlertIntent the NockerlStatusDisc coin binds.
// Banner calls the destructive tone `danger`; the shared map names it `error` (same
// token). `neutral` has NO shared-map peer, so the disc takes a raw `color` override
// (on-card) instead. It is the one tone that isn't single-sourced (kept local, as before).
const DISC_INTENT: Record<Exclude<NockerlBannerIntent, 'neutral'>, AlertIntent> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'error', // banner `danger` == shared `error`
  notice: 'notice',
};

const INTENT_ROLE: Record<NockerlBannerIntent, 'alert' | 'status'> = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  danger: 'alert',
  notice: 'status', // a featured/heads-up announcement, not "something is wrong"
  neutral: 'status',
};

// A SOLID, lifted inline surface on the canvas: panel radius, a neutral drop
// shadow + a top catch-light (the depth law), the card surface (NOT a wash). The
// intent color lives in the leading DISC, the RECESSED inset well (intent glyph + soft
// wash + whisper border). The intent rides in on the --bn-c custom property so one rule
// serves every intent (token-reactive). Feedback never tweens the fill.
export const NOCKERL_BANNER_STYLES = `
/* The banner is a SOLID lifted card. The intent color rides in on --bn-c; the disc
   carries it, the surface stays neutral (at most a whisper of tint in the border). */
.nk-bn {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-panel);
  /* SOLID card surface: no status wash, no glassy stack. */
  background: var(--color-card-surface1);
  /* the border carries only a WHISPER of the intent (state hint), mixed off the
     neutral hairline so the card reads solid, never tinted. */
  border: var(--space-px) solid color-mix(in srgb, var(--bn-c) 22%, var(--color-card-hairline));
  color: var(--color-on-card);
  /* depth = NEUTRAL drop shadow + a top catch-light. No colored shadow, no glow. */
  box-shadow:
    0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
    inset 0 var(--space-px) 0 var(--color-surface-highlight);
  font-size: var(--font-size-14);
  line-height: var(--font-line-height-20);
}

/* THE SIGNATURE is a status DISC. It lives in the NockerlStatusDisc primitive (.nk-disc), which
   the alert family shares. Banner renders <NockerlStatusDisc inset>, the RECESSED well form
   the intent color sits in the glyph + a soft wash + a whisper border, sunk under an
   inner top shade. Still a disc (Law 6), informational + non-interactive. The recipe
   (well / radius / inset shade / status ink) is owned in the primitive, single-sourced; the
   raised filled coin stays the default for toast / callout / transcript. */

/* text column: title (status color, semibold) over message (on-card / muted). */
.nk-bn__body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.nk-bn__title { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold);
  line-height: var(--font-line-height-20); color: var(--bn-c); }
.nk-bn__msg { color: var(--color-on-card); }
/* when there's a title, the message steps down to the muted on-card tone. */
.nk-bn--titled .nk-bn__msg { color: var(--color-on-card-muted); }
.nk-bn__msg b { color: var(--color-on-card); font-weight: var(--font-weight-semibold); }

/* trailing controls, RIGHT-aligned; the action is a ghost <NockerlButton> and the
   dismiss is a plain <NockerlIconButton>, both composed from the primitive layer. */
.nk-bn__tail { flex: 0 0 auto; display: inline-flex; align-items: center; gap: var(--space-1);
  margin-top: calc(-1 * var(--space-1)); }
/*  (the design lead ruled): the action wears a SUBTLE NEUTRAL OUTLINE so it reads as a real
   affordance, not a disabled/cancel caps readout - the outline-subtle token keeps it quiet and
   intent-agnostic (never competes with the banner's status color); the border firms on hover. */
.nk-bn__action.nk-btn { border-color: var(--color-outline-subtle); }
.nk-bn__action.nk-btn:hover:not(:disabled) { border-color: var(--color-on-card-muted); }
`;
const ICONS: Record<NockerlBannerIntent, ReactNode> = {
  info: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 8.6a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm-1.05 2.05a1.05 1.05 0 0 1 2.1 0v5.7a1.05 1.05 0 0 1-2.1 0Z" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m7.5 12.4 3 3 6-6.8" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10.95 7.2a1.05 1.05 0 0 1 2.1 0v5.4a1.05 1.05 0 0 1-2.1 0Zm1.05 8.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
    </svg>
  ),
  danger: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  ),
  // notice: a four-point spark/sparkle (a featured, new, heads-up mark), knocked
  // out of the warm orange disc. Distinct from the warning exclamation.
  notice: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 4.5c.35 2.1.9 3.4 1.75 4.25C14.6 9.6 15.9 10.15 18 10.5c-2.1.35-3.4.9-4.25 1.75-.85.85-1.4 2.15-1.75 4.25-.35-2.1-.9-3.4-1.75-4.25C9.4 11.4 8.1 10.85 6 10.5c2.1-.35 3.4-.9 4.25-1.75C11.1 7.9 11.65 6.6 12 4.5Z" />
    </svg>
  ),
  neutral: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 6.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm-1.05 4.3a1.05 1.05 0 0 1 2.1 0v6a1.05 1.05 0 0 1-2.1 0Z" />
    </svg>
  ),
};
const IconX = <NockerlIcon path="M6 6l12 12M18 6 6 18" />;

export function NockerlBanner({
  message,
  intent = 'info',
  title,
  icon = true,
  actionLabel,
  onAction,
  dismissible = false,
  onDismiss,
}: NockerlBannerProps) {
  return (
    <div
      role={INTENT_ROLE[intent]}
      className={['nk-bn', title ? 'nk-bn--titled' : ''].filter(Boolean).join(' ')}
      style={{ ['--bn-c' as string]: INTENT_COLOR[intent] }}
    >
      {icon && (
        <NockerlStatusDisc
          // `neutral` has no shared-map peer → raw color override (on-card); the rest
          // bind the shared ALERT_INTENT via the mapped AlertIntent. Either path
          // resolves to the same --bn-c token, so the coin is pixel-identical.
          intent={intent === 'neutral' ? 'info' : DISC_INTENT[intent]}
          {...(intent === 'neutral' ? { color: INTENT_COLOR.neutral } : {})}
          // INSET (ratified): the banner sinks its status coin into a recessed
          // well. The intent color moves to the glyph + a soft wash + a whisper border.
          // Informational + non-interactive; status still lives in a disc (Law 6).
          inset
          // the first-line-box centring nudge Banner's disc always carried.
          lineNudge="calc((var(--font-line-height-20) - var(--space-6)) / 2)"
        >
          {ICONS[intent]}
        </NockerlStatusDisc>
      )}
      <div className="nk-bn__body">
        {title && <span className="nk-bn__title">{title}</span>}
        <span
          className="nk-bn__msg"
          dangerouslySetInnerHTML={{ __html: message }}
        />
      </div>
      {(actionLabel || dismissible) && (
        <span className="nk-bn__tail">
          {actionLabel && (
            <NockerlButton text={actionLabel} variant="ghost" size="sm" className="nk-bn__action" onClick={onAction} />
          )}
          {dismissible && (
            <NockerlIconButton icon={IconX} label="Dismiss" size={28} onClick={onDismiss} />
          )}
        </span>
      )}
      {/* Recipe CSS injected as the LAST child; identical injected blocks dedupe in effect. */}
      <style>{NOCKERL_BANNER_STYLES}</style>
    </div>
  );
}

// LEAF (describes the Banner). Composes NockerlStatusDisc + NockerlButton (action) + NockerlIconButton (dismiss)
// internally, but exposes NO fillable component slots: `message`/`title` are plain text,
// `actionLabel` is a string (data, not a ReactNode slot), `icon` is a boolean. It hand-rolls
// no facsimile (role="alert|status" on a div is connective, not owned). FLAG: composite with
// no slots. Modeled leaf so the census doesn't force a slot; revisit if it ever takes children.
export const compose = { tier: 'leaf' } satisfies ComposeContract;
