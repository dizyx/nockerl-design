/**
 * BannerDemo: the live, interactive Nockerl banner (inline alert) island for web.
 *
 * There is NO shipped Banner on any platform yet (no `NockerlBanner` /
 * `NockerlAlert` in Android Compose, none in Voice/Swift). This component is
 * designed ORIGINALLY from the design laws + the existing Nockerl alert vocabulary
 * that IS shipped:
 *   • the inline ERROR container: `errorContainer = statusError @ 16%` +
 *     `onErrorContainer = statusError` (core/theme/Theme.kt)
 *   • the agent-transcript ErrorSegment: a status fill + a leading status icon +
 *     status text (chat/ui/AgentTranscriptPanel.kt)
 *   • the Voice RecordingHUD error row: a warning-triangle glyph + message
 *     (NockerlVoice/UI/RecordingHUD.swift)
 * generalised across all five status intents.
 *
 * It is an INLINE ALERT (it sits in the layout), never a toast.
 *
 * THE SIGNATURE is a status ICON DISC, never a left rail. The banner uses the RECESSED
 * INSET form of the disc (#2586b): the intent color sits in the glyph + a soft wash + a
 * whisper border, sunk under an inner top shade, vertically centred to the first text
 * line. The card surface is SOLID and dimensional; status still lives in the disc.
 *
 * The new transparency law, verbatim:
 *   • surfaces are SOLID + dimensional: a neutral drop shadow + a top catch-light
 *     (lift), NO glow, NO colored shadow. The card is `--color-card-surface1`, not
 *     a translucent wash. At most a *whisper* of status tint sits in the border.
 *   • transparency is for STATE only; ONE translucent layer max; tints come from
 *     the status tokens via color-mix off a single `--bn-c` custom property.
 *   • status color for warm intents only; cyan is the brand accent and is the ONE
 *     `info` tone; neutral uses on-card, never cyan. Never color alone: every
 *     banner pairs the colored disc + a glyph + text.
 *   • 12px control/panel radius, a rounded rectangle, never a pill.
 *   • flash-free: the disc + surface are STATIC. The dismiss feedback animates only
 *     interpolatable props (opacity + height collapse + a slight lift), never a fill.
 *   • the disc is vertically centred to the first text line; the action is
 *     RIGHT-aligned; the dismiss (X) is a separate focusable control with a ring.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them
 * to the dark palette; change a token and this demo moves with everything else.
 * Literals remain only for pure geometry (icon viewBox, transition curves).
 */
import { useState } from 'react';
import { ALERT_INTENT, NockerlButton, NockerlIcon, NockerlIconButton, NockerlStatusDisc, type AlertIntent, type ComposeContract } from '@dizyx/nockerl-react';

export type BannerIntent = 'info' | 'success' | 'warning' | 'danger' | 'notice' | 'neutral';

export interface BannerProps {
  /** Body copy: the message. Carries the alert's accessible text. */
  message: string;
  /** Semantic intent: drives the status color, the default icon, and role. */
  intent?: BannerIntent;
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
const INTENT_COLOR: Record<BannerIntent, string> = {
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
const DISC_INTENT: Record<Exclude<BannerIntent, 'neutral'>, AlertIntent> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'error', // banner `danger` == shared `error`
  notice: 'notice',
};

const INTENT_ROLE: Record<BannerIntent, 'alert' | 'status'> = {
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
const STYLES = `
.nk-bn-demo { font-family: var(--font-family-sans); display: flex; flex-direction: column; gap: var(--space-5); max-width: var(--size-chat-banner-max); }
.nk-bn-demo__group { display: flex; flex-direction: column; gap: var(--space-3); }
.nk-bn-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0; }

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
   (#2586b): the intent color sits in the glyph + a soft wash + a whisper border, sunk under an
   inner top shade. Still a disc (Law 6), informational + non-interactive (D7). The recipe
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

/* dismiss animation: interpolatable only (height collapse + fade + slight lift).
   The disc/surface never tween. */
.nk-bn-slot { display: grid; grid-template-rows: 1fr; transition: grid-template-rows .26s cubic-bezier(.2,0,0,1); }
.nk-bn-slot > .nk-bn-clip { overflow: hidden; min-height: 0; transition: opacity .2s, transform .26s cubic-bezier(.2,0,0,1); }
.nk-bn-slot--gone { grid-template-rows: 0fr; }
.nk-bn-slot--gone > .nk-bn-clip { opacity: 0; transform: translateY(-4px); }

/* the restore control + live status line */
.nk-bn-demo__foot { display: flex; align-items: center; gap: var(--space-3); margin-top: var(--space-1);
  font-size: var(--font-size-12); color: var(--color-on-canvas-muted); flex-wrap: wrap; }
.nk-bn-demo__foot b { color: var(--color-accent-primary); }

@media (prefers-reduced-motion: reduce) {
  .nk-bn-slot, .nk-bn-slot > .nk-bn-clip { transition: none; }
}
`;

// ─── Disc glyphs (stroke/fill in currentColor) ──
// Each is currentColor so in the inset disc it renders in the intent ink (--nk-disc-c).
const ICONS: Record<BannerIntent, React.ReactNode> = {
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

/**
 * A single Nockerl banner (inline alert), the unit the spec documents. A leading
 * inset status DISC (recessed well; intent glyph + soft wash), a title + message column, and
 * right-aligned trailing controls (an optional quiet action + an optional dismiss
 * X). The intent drives one status color (cyan only for `info`) that lives ONLY in
 * the disc. The surface is a solid, lifted card: never a wash, never a left rail.
 */
export function Banner({
  message,
  intent = 'info',
  title,
  icon = true,
  actionLabel,
  onAction,
  dismissible = false,
  onDismiss,
}: BannerProps) {
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
          color={intent === 'neutral' ? INTENT_COLOR.neutral : undefined}
          // INSET (#2586b, ratified): the banner sinks its status coin into a recessed
          // well. The intent color moves to the glyph + a soft wash + a whisper border.
          // Informational + non-interactive (D7); status still lives in a disc (Law 6).
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
    </div>
  );
}

/**
 * The interactive showcase mounted on the Banner page: every semantic intent
 * (info / success / warning / danger / notice / neutral), a title-vs-message-only pair, a
 * with-action vs a with-icon-off banner, and a live dismissible row that collapses
 * (interpolatable height + fade, reduced-motion aware) with a restore control.
 */
// LEAF (describes the Banner). Composes NockerlStatusDisc + NockerlButton (action) + NockerlIconButton (dismiss)
// internally, but exposes NO fillable component slots: `message`/`title` are plain text,
// `actionLabel` is a string (data, not a ReactNode slot), `icon` is a boolean. It hand-rolls
// no facsimile (role="alert|status" on a div is connective, not owned). FLAG: composite with
// no slots. Modeled leaf so the census doesn't force a slot; revisit if it ever takes children.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default function BannerDemo() {
  const [actionClicks, setActionClicks] = useState(0);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const isGone = (k: string) => dismissed[k] === true;
  const dismiss = (k: string) => setDismissed((d) => ({ ...d, [k]: true }));
  const restore = () => setDismissed({});
  const dismissedCount = Object.values(dismissed).filter(Boolean).length;

  return (
    <div className="nk-bn-demo">
      <style>{STYLES}</style>

      <div className="nk-bn-demo__group">
        <p className="nk-bn-demo__lbl">Intents: an inset status disc + text, never color alone</p>
        <Banner intent="info" message="A new session was created on <b>api-server</b>." />
        <Banner intent="success" message="Deploy finished. <b>nockerl-design</b> is live." />
        <Banner intent="warning" message="This session has uncommitted changes." />
        <Banner intent="danger" message="Build failed: the container exited with code 1." />
        <Banner intent="notice" message="New: <b>agent spawning</b> is live. Dispatch a session from any task." />
        <Banner intent="neutral" message="Read-only: this workspace is locked by your administrator." />
      </div>

      <div className="nk-bn-demo__group">
        <p className="nk-bn-demo__lbl">Title vs message-only</p>
        <Banner
          intent="danger"
          title="Approval required"
          message="A session is waiting on a tool-approval decision before it can continue."
        />
        <Banner intent="warning" message="Your API token expires in 3 days." />
      </div>

      <div className="nk-bn-demo__group">
        <p className="nk-bn-demo__lbl">With action vs no icon</p>
        <Banner
          intent="warning"
          title="Local model unreachable"
          message="Falling back to the cloud provider for this turn."
          actionLabel="Retry"
          onAction={() => setActionClicks((c) => c + 1)}
        />
        <Banner intent="info" icon={false} message="Tip: press ⌘K to jump to any session." />
      </div>

      <div className="nk-bn-demo__group">
        <p className="nk-bn-demo__lbl">Dismissible: tab to the X, Enter / Space to collapse</p>
        <div className={['nk-bn-slot', isGone('d1') ? 'nk-bn-slot--gone' : ''].filter(Boolean).join(' ')}>
          <div className="nk-bn-clip">
            <Banner
              intent="success"
              title="Memory indexed"
              message="1,204 messages were embedded into the session store."
              dismissible
              onDismiss={() => dismiss('d1')}
            />
          </div>
        </div>
        <div className={['nk-bn-slot', isGone('d2') ? 'nk-bn-slot--gone' : ''].filter(Boolean).join(' ')}>
          <div className="nk-bn-clip">
            <Banner
              intent="danger"
              message="Connection to the gateway was lost. Reconnecting."
              actionLabel="Reconnect"
              onAction={() => setActionClicks((c) => c + 1)}
              dismissible
              onDismiss={() => dismiss('d2')}
            />
          </div>
        </div>
      </div>

      <div className="nk-bn-demo__foot">
        <NockerlButton
          text="Restore dismissed"
          variant="ghost"
          size="sm"
          onClick={restore}
          disabled={dismissedCount === 0}
        />
        <span>
          Action fired <b>{actionClicks}</b> {actionClicks === 1 ? 'time' : 'times'} · dismissed{' '}
          <b>{dismissedCount}</b>. The island is live.
        </span>
      </div>
    </div>
  );
}
