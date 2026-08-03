/**
 * DrawerDemo: the live, interactive island for the shipped NockerlDrawer composite.
 *
 * The reusable edge-anchored side-panel now lives in the published package
 * (@dizyx/nockerl-react → NockerlDrawer); this file is only the showcase harness that
 * CONSUMES it. The drawer is the side panel that slides HORIZONTALLY from the LEFT or
 * RIGHT vertical edge, distinct from its catalog siblings: bottom-sheet rises from the
 * BOTTOM (grip, mobile), dialog is a CENTERED card (confirms / short forms), and
 * app-shell / sidebar are the PERMANENT rail. Two shipped roles: LEFT = a navigation
 * drawer (brand header → nav list, selected = cyan), the Voice DashboardView sidebar
 * made modal; RIGHT = an inspector / detail drawer (header → detail content → action
 * row), the session/file inspector. Two modes: MODAL (over a scrim, traps focus) vs
 * INLINE / PUSH (no scrim; the panel shoulders the app aside, app stays live).
 *
 * The drawer's design laws (the lifted cardAlt → canvasAlt panel, the flat scrim, the
 * slide-X motion, the modal focus-trap + Esc, the role="dialog"/"region" split) are
 * ENCODED IN THE PACKAGE now; see packages/react/src/composites/Drawer.tsx. This harness
 * only supplies the stage chrome (the faux app shell it opens over/beside) and the
 * nav-list / detail content it fills the panel with. The nav ROWS are the NockerlNavItem
 * primitive (lit-icon-stays active + aria-current + status dot + count pill).
 *
 * A11y: the shell triggers + close + every nav/action are real <button>s (NockerlButton /
 * NockerlIconButton / NockerlNavItem); NockerlDrawer owns the modal focus-trap / region split.
 * TOKEN-REACTIVE: every color / font / radius / spacing is a var(--token).
 */
import { useCallback, useRef, useState } from 'react';

import { NockerlButton, NockerlDrawer, NockerlIcon, NockerlIconButton, NockerlNavItem as NavRow, NockerlSegmentedControl, type DrawerEdge, type DrawerMode } from '@dizyx/nockerl-react';

// Demo chrome only: the contained stage + the faux app shell the drawer opens over/beside,
// plus the nav-list / detail content that fills the panel (the panel itself, its slide, and
// the scrim are the shipped NockerlDrawer + NockerlOverlay). Every value is a token.
const STYLES = `
.nk-dw-demo { font-family: var(--font-family-sans); }
/* The contained STAGE: the drawer lives in here, never the page viewport. */
.nk-dw-stage { position: relative; width: 100%; max-width: 540px; height: 460px; margin-inline: auto;
  border-radius: calc(var(--radius-card) + var(--space-2)); overflow: hidden; isolation: isolate;
  background: radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--color-card-surface1) 70%, transparent), transparent 60%), var(--color-chat-bg, var(--color-canvas));
  border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight), 0 var(--elevation-level3) 28px -12px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent); }
/* faint geometric facets behind everything (the field is alive, never flat) */
.nk-dw-stage::before { content: ""; position: absolute; inset: 0; z-index: 0; opacity: .5;
  background: linear-gradient(135deg, transparent 46%, var(--color-card-hairline) 47%, transparent 48%), linear-gradient(45deg, transparent 62%, var(--color-alt-hairline) 63%, transparent 64%);
  background-size: 64px 64px, 88px 88px; }
/* The stage SHELL: a faux app under/beside the drawer. In inline/push mode the
   shell shifts to make room (margin animates); in modal mode it stays put. */
.nk-dw-shell { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column;
  gap: var(--space-3); padding: var(--space-5) var(--space-4); transition: margin .3s cubic-bezier(.2,0,0,1); }
.nk-dw-shell__bar { display: flex; align-items: center; gap: var(--space-3); height: var(--space-10); flex: 0 0 auto; }
.nk-dw-shell__title { font-size: var(--font-size-16); font-weight: var(--font-weight-bold); color: var(--color-on-canvas); flex: 1 1 auto; min-width: 0; }
.nk-dw-shell__spacer { flex: 1 1 auto; }
.nk-dw-shell__line { height: var(--space-3); border-radius: var(--radius-track); background: var(--color-card-hairline); }
.nk-dw-shell__line--w70 { width: 70%; } .nk-dw-shell__line--w50 { width: 50%; } .nk-dw-shell__line--w85 { width: 85%; }
.nk-dw-shell__card { border-radius: var(--radius-card); border: var(--space-px) solid var(--color-card-hairline);
  background: var(--color-card-surface1); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }

/* NAV LIST (left drawer content): a section label + rows; selected = cyan edge + wash. */
.nk-dw-nav { display: flex; flex-direction: column; gap: var(--space-px); }
.nk-dw-nav__label { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-alt-muted); font-weight: var(--font-weight-semibold); padding: var(--space-3) var(--space-2) var(--space-1); }
/* The nav ROWS are the NockerlNavItem primitive (.nk-nav*): it owns the row grammar, the
   lit-icon-stays active treatment (soft cyan wash + cyan border + aria-current, no left
   rail per design-laws section 6), the status dot, the trailing count pill, and the focus
   ring. The <nav> container above only stacks them. */

/* DETAIL CONTENT (right inspector): a meta hero + labelled key/value rows + tags. */
.nk-dw-det { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-1) var(--space-1) 0; }
.nk-dw-det__hero { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3);
  border-radius: var(--radius-control); border: var(--space-px) solid var(--color-alt-hairline);
  background: color-mix(in srgb, var(--color-on-card-alt) 4%, transparent); }
.nk-dw-det__avatar { width: var(--space-10); height: var(--space-10); flex: 0 0 auto; border-radius: var(--radius-control);
  display: inline-flex; align-items: center; justify-content: center; color: var(--color-accent-primary);
  background: var(--color-accent-primary-soft); border: var(--space-px) solid color-mix(in srgb, var(--color-accent-primary) 30%, transparent); }
.nk-dw-det__avatar svg { width: 22px; height: 22px; display: block; }
.nk-dw-det__htxt { display: flex; flex-direction: column; gap: var(--space-0-5); min-width: 0; }
.nk-dw-det__name { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-card-alt); }
.nk-dw-det__meta { font-size: var(--font-size-12); color: var(--color-on-card-alt-muted); }
.nk-dw-kv { display: flex; flex-direction: column; gap: var(--space-px); }
.nk-dw-kv__row { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); padding: var(--space-2) 0; }
.nk-dw-kv__row + .nk-dw-kv__row { border-top: var(--space-px) solid var(--color-alt-hairline); }
.nk-dw-kv__k { font-size: var(--font-size-12); color: var(--color-on-card-alt-muted); }
.nk-dw-kv__v { font-size: var(--font-size-14); color: var(--color-on-card-alt); font-weight: var(--font-weight-medium); text-align: right; }
.nk-dw-kv__v--accent { color: var(--color-accent-primary); }
.nk-dw-kv__v--ok { color: var(--color-status-success); }
.nk-dw-tags { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.nk-dw-tag { font-size: var(--font-size-10); font-weight: var(--font-weight-medium); padding: var(--space-0-5) var(--space-2);
  color: var(--color-on-card-alt-muted); background: color-mix(in srgb, var(--color-on-card-alt) 8%, transparent);
  border: var(--space-px) solid var(--color-alt-hairline); border-radius: var(--radius-pill); }

@media (prefers-reduced-motion: reduce) {
  .nk-dw-shell { transition: none; }
}

/* demo chrome (on the canvas, not the drawer) */
.nk-dw-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-dw-demo__ctl { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; margin-bottom: var(--space-4); }
.nk-dw-demo__sep { width: var(--space-2); }
.nk-dw-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-dw-demo__count b { color: var(--color-accent-primary); }
`;

// ─── Inline stroke glyphs (currentColor so each slot tints from its token) ──
const IconMenu = <NockerlIcon path="M3 6h18M3 12h18M3 18h18" />;
const IconChat = <NockerlIcon path="M21 11.5a8.4 8.4 0 0 1-11.7 7.7L3 21l1.8-6.3A8.4 8.4 0 1 1 21 11.5Z" />;
const IconTasks = <NockerlIcon path="M9 11l3 3 8-8M3 12h.01M3 6h.01M3 18h.01M9 6h11M9 18h11" />;
const IconFiles = <NockerlIcon path="M4 5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />;
const IconCluster = (
  <NockerlIcon>
    <path d="M12 2v6M12 16v6M5 5l4 4M15 15l4 4M2 12h6M16 12h6" />
    <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
  </NockerlIcon>
);
const IconSettings = (
  <NockerlIcon>
    <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    <path d="M19.4 12a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7.5 7.5 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7.5 7.5 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7.4 7.4 0 0 0 .1-1Z" />
  </NockerlIcon>
);
const IconBranch = (
  <NockerlIcon>
    <circle cx="6" cy="5" r="2.4" /><circle cx="18" cy="5" r="2.4" /><circle cx="12" cy="19" r="2.4" />
    <path d="M6 7.4v3.1a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7.4M12 13.5v3.1" />
  </NockerlIcon>
);

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Show the streaming status dot on the icon corner (NockerlNavItem status="streaming"). */
  streaming?: boolean;
  /** Trailing count pill (NockerlNavItem count). */
  badge?: number;
};
const NAV: NavItem[] = [
  { id: 'chat', label: 'Chat', icon: IconChat, streaming: true },
  { id: 'tasks', label: 'Tasks', icon: IconTasks, badge: 3 },
  { id: 'files', label: 'Files', icon: IconFiles },
  { id: 'cluster', label: 'Cluster', icon: IconCluster },
  { id: 'settings', label: 'Settings', icon: IconSettings },
];

// Right-inspector key/value rows; a value class keys the optional accent/status tint.
const DETAIL: { k: string; v: string; cls?: string }[] = [
  { k: 'Engine', v: 'Cloud Agent' },
  { k: 'Model', v: 'Large 2.0', cls: ' nk-dw-kv__v--accent' },
  { k: 'Branch', v: 'main' },
  { k: 'Status', v: 'Healthy', cls: ' nk-dw-kv__v--ok' },
];
const TAGS = ['design', 'tokens', 'docs', 'starlight'];

/**
 * The interactive showcase mounted on the Drawer page: a contained app stage whose
 * top bar carries a left-edge menu button (opens the nav drawer) and a right-edge
 * button (opens the inspector drawer). Chips pick the EDGE (left nav / right inspector)
 * and the MODE (modal scrim / inline push); open it to watch the scrim fade + the panel
 * slide in. A nav row sets the cyan selection; Esc, the scrim, and Close dismiss; focus
 * moves in (modal) and is restored to the opener.
 */
export default function DrawerDemo() {
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [edge, setEdge] = useState<DrawerEdge>('left');
  const [mode, setMode] = useState<DrawerMode>('overlay');
  const [section, setSection] = useState('chat');
  const [opens, setOpens] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus(); // restore focus to the opener
  }, []);

  const raise = useCallback((nextEdge: DrawerEdge, btn: HTMLButtonElement | null) => {
    setEdge(nextEdge);
    setOpen(true);
    setOpens((c) => c + 1);
    triggerRef.current = btn; // remember which opener to restore to
  }, []);

  const select = useCallback((id: string) => {
    setSection(id);
    close();
  }, [close]);

  // In inline/push mode the app shell shifts toward the opposite edge to make room.
  const pushBy = open && mode === 'inline' ? 'min(264px, 82%)' : 0;
  const shellStyle: React.CSSProperties =
    edge === 'left' ? { marginLeft: pushBy } : { marginRight: pushBy };

  return (
    <div className="nk-dw-demo">
      <style>{STYLES}</style>

      <p className="nk-dw-demo__lbl">Edge · mode: set them, then open a drawer from the matching edge</p>
      <div className="nk-dw-demo__ctl">
        <NockerlSegmentedControl
          segments={[
            { value: 'left', label: 'Left · nav' },
            { value: 'right', label: 'Right · inspector' },
          ]}
          value={edge}
          onChange={(n) => setEdge(n as DrawerEdge)}
          label="Drawer edge"
          size="sm"
        />
        <span className="nk-dw-demo__sep" />
        <NockerlSegmentedControl
          segments={[
            { value: 'overlay', label: 'Overlay · scrim' },
            { value: 'inline', label: 'Inline · push' },
          ]}
          value={mode}
          onChange={(n) => setMode(n as DrawerMode)}
          label="Drawer mode"
          size="sm"
        />
      </div>

      <div className="nk-dw-stage" ref={setStage}>
        <div className="nk-dw-shell" style={shellStyle} aria-hidden={open && mode === 'overlay'}>
          <div className="nk-dw-shell__bar">
            <NockerlIconButton
              icon={IconMenu}
              label="Open navigation"
              variant="plain"
              size={40}
              aria-expanded={open && edge === 'left'}
              onClick={(e) => raise('left', e.currentTarget)}
            />
            <span className="nk-dw-shell__title">{NAV.find((n) => n.id === section)?.label ?? 'Chat'}</span>
            <NockerlIconButton
              icon={IconBranch}
              label="Open inspector"
              variant="plain"
              size={40}
              aria-expanded={open && edge === 'right'}
              onClick={(e) => raise('right', e.currentTarget)}
            />
          </div>
          <div className="nk-dw-shell__card">
            <div className="nk-dw-shell__line nk-dw-shell__line--w70" />
            <div className="nk-dw-shell__line nk-dw-shell__line--w85" />
            <div className="nk-dw-shell__line nk-dw-shell__line--w50" />
          </div>
          <div className="nk-dw-shell__line nk-dw-shell__line--w85" />
          <div className="nk-dw-shell__line nk-dw-shell__line--w70" />
          <div className="nk-dw-shell__spacer" />
        </div>

        <NockerlDrawer
          open={open}
          onDismiss={close}
          stage={stage}
          edge={edge}
          mode={mode}
          title={edge === 'left' ? 'Nockerl' : 'Session details'}
          subtitle={edge === 'left' ? 'dizyx workspace' : 'nockerl-design · docs site'}
          footer={
            edge === 'right' ? (
              <>
                <NockerlButton text="Close" variant="ghost" onClick={close} />
                <NockerlButton text="Open session" variant="primary" onClick={close} />
              </>
            ) : undefined
          }
        >
          {edge === 'left' ? (
            <nav className="nk-dw-nav" aria-label="Primary">
              <span className="nk-dw-nav__label">Workspace</span>
              {NAV.map((n) => (
                <NavRow
                  key={n.id}
                  label={n.label}
                  icon={n.icon}
                  active={section === n.id}
                  onSelect={() => select(n.id)}
                  {...(n.streaming ? { status: 'streaming' as const } : {})}
                  {...(n.badge !== undefined ? { count: { value: n.badge } } : {})}
                />
              ))}
            </nav>
          ) : (
            <div className="nk-dw-det">
              <div className="nk-dw-det__hero">
                <span className="nk-dw-det__avatar" aria-hidden="true">{IconChat}</span>
                <span className="nk-dw-det__htxt">
                  <span className="nk-dw-det__name">docs site</span>
                  <span className="nk-dw-det__meta">Streaming · 2 tools running</span>
                </span>
              </div>
              <div className="nk-dw-kv">
                {DETAIL.map((d) => (
                  <div className="nk-dw-kv__row" key={d.k}>
                    <span className="nk-dw-kv__k">{d.k}</span>
                    <span className={`nk-dw-kv__v${d.cls ?? ''}`}>{d.v}</span>
                  </div>
                ))}
              </div>
              <div className="nk-dw-tags">
                {TAGS.map((t) => (
                  <span className="nk-dw-tag" key={t}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </NockerlDrawer>
      </div>

      <p className="nk-dw-demo__count">
        Drawer opened <b>{opens}</b> {opens === 1 ? 'time' : 'times'} · section <b>{section}</b>. Esc, the scrim, or Close dismisses it. The island is live.
      </p>
    </div>
  );
}
