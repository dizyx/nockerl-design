/**
 * BannerDemo: the live island for the shipped NockerlBanner.
 *
 * The component itself now lives in the published package
 * (packages/react/src/composites/Banner.tsx) and is consumed here exactly as a client
 * would consume it. This file is demo scaffolding only: the intent gallery, the
 * title-versus-message pair, and a live dismissible row that collapses and can be
 * restored, so the interpolatable dismiss is visible.
 *
 * TOKEN-REACTIVE demo chrome; the banner anatomy is the package's. The collapsing slot
 * around a dismissible banner is host scaffolding, which is why it lives here.
 */
import { useState } from 'react';
import { NockerlBanner, NockerlButton } from '@dizyx/nockerl-react';

const STYLES = `
.nk-bn-demo { font-family: var(--font-family-sans); display: flex; flex-direction: column; gap: var(--space-5); max-width: var(--size-chat-banner-max); }
.nk-bn-demo__group { display: flex; flex-direction: column; gap: var(--space-3); }
.nk-bn-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0; }

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

/**
 * The interactive showcase mounted on the Banner page: every semantic intent
 * (info / success / warning / danger / notice / neutral), a title-versus-message-only pair,
 * a with-action versus a with-icon-off banner, and a live dismissible row that collapses
 * (interpolatable height + fade, reduced-motion aware) with a restore control.
 */
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
        <NockerlBanner intent="info" message="A new session was created on <b>api-server</b>." />
        <NockerlBanner intent="success" message="Deploy finished. <b>nockerl-design</b> is live." />
        <NockerlBanner intent="warning" message="This session has uncommitted changes." />
        <NockerlBanner intent="danger" message="Build failed: the container exited with code 1." />
        <NockerlBanner intent="notice" message="New: <b>agent spawning</b> is live. Dispatch a session from any task." />
        <NockerlBanner intent="neutral" message="Read-only: this workspace is locked by your administrator." />
      </div>

      <div className="nk-bn-demo__group">
        <p className="nk-bn-demo__lbl">Title vs message-only</p>
        <NockerlBanner
          intent="danger"
          title="Approval required"
          message="A session is waiting on a tool-approval decision before it can continue."
        />
        <NockerlBanner intent="warning" message="Your API token expires in 3 days." />
      </div>

      <div className="nk-bn-demo__group">
        <p className="nk-bn-demo__lbl">With action vs no icon</p>
        <NockerlBanner
          intent="warning"
          title="Local model unreachable"
          message="Falling back to the cloud provider for this turn."
          actionLabel="Retry"
          onAction={() => setActionClicks((c) => c + 1)}
        />
        <NockerlBanner intent="info" icon={false} message="Tip: press ⌘K to jump to any session." />
      </div>

      <div className="nk-bn-demo__group">
        <p className="nk-bn-demo__lbl">Dismissible: tab to the X, Enter / Space to collapse</p>
        <div className={['nk-bn-slot', isGone('d1') ? 'nk-bn-slot--gone' : ''].filter(Boolean).join(' ')}>
          <div className="nk-bn-clip">
            <NockerlBanner
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
            <NockerlBanner
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
