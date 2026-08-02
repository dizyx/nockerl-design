/**
 * TabsDemo: the live, interactive Nockerl tabs island for the web platform.
 *
 * Composes the real `NockerlTabs` primitive (../primitives/NockerlTabs): the WAI-ARIA
 * tablist / tab / tabpanel switcher with a sliding cyan indicator, count badges, the
 * underline + enclosed variants, a disabled tab, a scrollable overflow row, and the
 * sm / md sizes. The primitive owns the role="tablist" keyboard model, the per-tab
 * count badges, and the underline/enclosed variants.
 *
 * NockerlTabs are DELIBERATELY DISTINCT from a NockerlSegmentedControl: tabs navigate SECTION content
 * (each tab owns a panel; indicator = a thin underline / enclosed pill), a segmented
 * control flips mutually-exclusive views/modes with no panels. See the primitive header.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a `var(--token)`
 * (see docs/demo-token-contract.md). Literals remain only for pure geometry (icon
 * dimensions); the tablist behavior + chrome now live in the primitive.
 */
import { useState } from 'react';
import { NockerlIcon, NockerlTabs, type TabItemDef } from '@dizyx/nockerl-react';

// ─── Inline glyphs (stroke icons on currentColor, so each tab tints) ──────────
// Rendered via the shared NockerlIcon primitive (the canonical 0 0 24 24 / stroke-2 shell);
// the primitive's CSS (.nk-tb__ico svg) sizes them inside a tab.
const ICONS = {
  overview: (
    <NockerlIcon>
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </NockerlIcon>
  ),
  activity: <NockerlIcon path="M3 12h4l2 6 4-14 2 8h6" />,
  files: <NockerlIcon path="M4 5a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />,
  chat: <NockerlIcon path="M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12Z" />,
  settings: (
    <NockerlIcon>
      <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </NockerlIcon>
  ),
  bell: (
    <NockerlIcon>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </NockerlIcon>
  ),
} as const;

const STYLES = `
.nk-tb-demo { font-family: var(--font-family-sans); }
.nk-tb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-tb-demo__group + .nk-tb-demo__group { margin-top: var(--space-8); }
.nk-tb-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-8); }
.nk-tb-demo__count b { color: var(--color-accent-primary); }
/* Constrain the tabs block in the demo stage (the primitive itself is full-width). */
.nk-tb-demo .nk-tb { max-width: 560px; }

/* ── Panel body sample content (proves the swap) ────────────────────────────── */
.nk-tb-body { display: flex; flex-direction: column; gap: var(--space-3); }
.nk-tb-body__head { display: flex; align-items: center; gap: var(--space-3); }
.nk-tb-body__ico { width: var(--space-8); height: var(--space-8); flex: 0 0 auto; border-radius: var(--radius-control);
  display: inline-flex; align-items: center; justify-content: center; color: var(--color-accent-primary);
  background: var(--color-accent-primary-soft); }
.nk-tb-body__ico svg { width: 18px; height: 18px; }
.nk-tb-body__title { font-size: var(--font-size-16); font-weight: var(--font-weight-semibold); color: var(--color-on-card); line-height: var(--font-line-height-20); }
.nk-tb-body__sub { font-size: var(--font-size-12); color: var(--color-on-card-muted); line-height: var(--font-line-height-16); }
.nk-tb-body__rows { display: flex; flex-direction: column; gap: var(--space-2); }
.nk-tb-body__row { height: var(--space-8); border-radius: var(--radius-control); background: var(--color-card-surface2);
  border: var(--space-px) solid var(--color-card-hairline); display: flex; align-items: center; gap: var(--space-3); padding: 0 var(--space-3); }
.nk-tb-body__dot { width: 8px; height: 8px; border-radius: var(--radius-pill); flex: 0 0 auto; background: var(--color-accent-primary); }
.nk-tb-body__bar { height: var(--space-2); border-radius: var(--radius-pill); background: var(--color-card-surface3); }
.nk-tb-body__chart { display: flex; align-items: flex-end; gap: var(--space-2); height: var(--space-16); padding-top: var(--space-2); }
.nk-tb-body__col { flex: 1 1 0; border-radius: var(--radius-track) var(--radius-track) 0 0; background: color-mix(in srgb, var(--color-accent-primary) 55%, transparent); }
.nk-tb-body__empty { font-size: var(--font-size-12); color: var(--color-on-card-muted); }
`;

// ─── Sample panel bodies: distinct content per tab to PROVE the swap ──────────
type Kind = 'rows' | 'chart' | 'empty';
/** A sample tabpanel body (header + a rows / chart / empty sample). */
function body(icon: keyof typeof ICONS, title: string, sub: string, kind: Kind = 'rows') {
  return (
    <div className="nk-tb-body">
      <div className="nk-tb-body__head">
        <span className="nk-tb-body__ico">{ICONS[icon]}</span>
        <div>
          <div className="nk-tb-body__title">{title}</div>
          <div className="nk-tb-body__sub">{sub}</div>
        </div>
      </div>
      {kind === 'rows' && (
        <div className="nk-tb-body__rows">
          {[68, 84, 54].map((w, i) => (
            <div key={i} className="nk-tb-body__row">
              <span className="nk-tb-body__dot" />
              <span className="nk-tb-body__bar" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      )}
      {kind === 'chart' && (
        <div className="nk-tb-body__chart">
          {[40, 72, 56, 90, 48, 64, 80].map((h, i) => <span key={i} className="nk-tb-body__col" style={{ height: `${h}%` }} />)}
        </div>
      )}
      {kind === 'empty' && <p className="nk-tb-body__empty">Nothing here yet. This panel is empty by design.</p>}
    </div>
  );
}

const SESSION_TABS: TabItemDef[] = [
  { value: 'overview', label: 'Overview', icon: ICONS.overview, panel: body('overview', 'Overview', 'Status, model, and recent summary') },
  { value: 'activity', label: 'Activity', icon: ICONS.activity, panel: body('activity', 'Activity', 'Token + tool usage', 'chart') },
  { value: 'files', label: 'Files', icon: ICONS.files, count: 12, panel: body('files', 'Files · 12 changed', 'Edited in this session') },
  { value: 'settings', label: 'Settings', icon: ICONS.settings, panel: body('settings', 'Session settings', 'Model, tools, and budget') },
];
const ENCLOSED_TABS: TabItemDef[] = [
  { value: 'chat', label: 'Chat', icon: ICONS.chat, panel: body('chat', 'Chat', 'The live session transcript') },
  { value: 'files', label: 'Files', icon: ICONS.files, panel: body('files', 'Files', 'Browse the working tree') },
  { value: 'inbox', label: 'Inbox', icon: ICONS.bell, count: 3, panel: body('bell', 'Inbox · 3 unread', 'Notifications and approvals') },
];
const DISABLED_TABS: TabItemDef[] = [
  { value: 'editor', label: 'Editor', panel: body('activity', 'Editor', 'Edit the document source') },
  { value: 'preview', label: 'Preview', panel: body('overview', 'Preview', 'Rendered output', 'chart') },
  { value: 'history', label: 'History', disabled: true, panel: body('files', 'History', 'Past revisions') },
  { value: 'share', label: 'Share', panel: body('files', 'Share', 'Links and permissions') },
];
const MANY_TABS: TabItemDef[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'sessions', label: 'Sessions', count: 6 },
  { value: 'agents', label: 'Agents' },
  { value: 'tasks', label: 'Tasks', count: 24 },
  { value: 'files', label: 'Files' },
  { value: 'memory', label: 'Memory' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'logs', label: 'Logs' },
  { value: 'webhooks', label: 'Webhooks' },
  { value: 'settings', label: 'Settings' },
].map((t) => ({
  ...t,
  panel: body('overview', t.label, `The "${t.label}" section. Scroll the row and the underline follows`, t.value === 'cluster' ? 'chart' : t.value === 'logs' ? 'empty' : 'rows'),
}));

/**
 * The interactive showcase mounted on the NockerlTabs page: UNDERLINE tabs with icons + a count
 * badge whose moving underline + panel swap PROVE the pattern; an ENCLOSED variant (the same
 * underline inside a recessed well); a DISABLED tab (skipped by arrow keys); a SCROLLABLE overflow row (10
 * tabs) with edge fades; and the sm / md sizes, every one keyboard-operable (Tab in,
 * Arrow/Home/End move + auto-activate; the panel is the next tab stop, labelled by its tab).
 */
export default function TabsDemo() {
  const [main, setMain] = useState('overview');
  const [enclosed, setEnclosed] = useState('chat');
  const [disabled, setDisabled] = useState('editor');
  const [many, setMany] = useState('overview');
  const [small, setSmall] = useState('overview');

  return (
    <div className="nk-tb-demo">
      <style>{STYLES}</style>

      <div className="nk-tb-demo__group">
        <p className="nk-tb-demo__lbl">Underline tabs: icons + a count badge; the underline slides, the panel swaps (Tab in, Arrow keys)</p>
        <NockerlTabs label="Session sections" tabs={SESSION_TABS} value={main} onChange={setMain} />
      </div>

      <div className="nk-tb-demo__group">
        <p className="nk-tb-demo__lbl">Enclosed tabs: the sliding cyan underline, seated inside a recessed well (not a filled pill)</p>
        <NockerlTabs label="Panel sections" variant="enclosed" tabs={ENCLOSED_TABS} value={enclosed} onChange={setEnclosed} />
      </div>

      <div className="nk-tb-demo__group">
        <p className="nk-tb-demo__lbl">A disabled tab: skipped by arrow keys, still legible</p>
        <NockerlTabs label="Document sections" tabs={DISABLED_TABS} value={disabled} onChange={setDisabled} />
      </div>

      <div className="nk-tb-demo__group">
        <p className="nk-tb-demo__lbl">Scrollable / overflow: many tabs scroll horizontally with edge fades</p>
        <NockerlTabs label="Project workspace" tabs={MANY_TABS} value={many} onChange={setMany} />
      </div>

      <div className="nk-tb-demo__group">
        <p className="nk-tb-demo__lbl">Small size: same indicator, tighter rhythm</p>
        <NockerlTabs label="Compact sections" size="sm" tabs={SESSION_TABS} value={small} onChange={setSmall} />
      </div>

      <p className="nk-tb-demo__count">
        Active section: <b>{main}</b> · enclosed <b>{enclosed}</b> · workspace <b>{many}</b>. Each tab swaps its panel below. The island is live.
      </p>
    </div>
  );
}
