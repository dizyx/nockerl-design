/**
 * SegmentedControlDemo: the live Nockerl segmented-control island for the web.
 * The CANONICAL connected single-track view/mode switch: touching segments on
 * one recessed track with ONE sliding cyan pill gliding to the active segment.
 * It makes the inline toggles already shipped in App shell (layout) and Diff
 * viewer (Unified / Split) into one reusable component, now with a sliding pill.
 *
 * DELIBERATELY DISTINCT from its neighbours:
 *   • NOT tabs: no associated tabpanels, not page/section wayfinding; it flips a
 *     small set of mutually-exclusive VIEWS/MODES. So the ARIA is
 *     role="radiogroup" + role="radio" (single-select), never tablist/tab.
 *   • more compact + CONNECTED than a radio group: peers share one track, no
 *     per-option description; reach for it for 2 to 5 equal peers, reach for
 *     radio-group when options need descriptions or there are 4+ rich choices.
 *
 * Sourced from the shipped apps, never the web dashboard (see the page drift
 * note: the apps disagree and hard-cut today; the sliding pill is canonical web):
 *   • Android `core/ui/NockerlSegmented.kt`: one muted track (`cardAlt2`,
 *     control radius, 2dp inset); ACTIVE = SOFT-cyan fill (`accentPrimarySoft`) +
 *     a cyan medium label (inner radius one step tighter); inactive transparent +
 *     muted; the whole control dims when disabled.
 *   • Voice/Swift `SettingsComponents.swift` `SegmentedSelector`: inset
 *     `canvasAlt` track (radius 10, 4pt inset); ACTIVE = cyan OUTLINE (1.5pt), NOT
 *     a fill; equal-width segments (`.frame(maxWidth: .infinity)`).
 *
 * Laws, verbatim: the TRACK is a recessed well (darker ground + inner shadow, so
 * fields sink); the PILL lifts off it (neutral shadow + top catch-light, never a
 * glow). Flash-free: the pill is ONE element whose static cyan fill never tweens.
 * It SLIDES (translateX) + resizes; labels cross-fade color. 12px control radius
 * (a rounded rectangle, not a stadium). Cyan is the selection signal only. Focus
 * is an OUTLINE. A real control: roving tabindex (ONE tab stop), Arrow/Home/End
 * move AND select, Space/Enter select, ≥24px target, a disabled segment is skipped
 * but legible. prefers-reduced-motion: the pill still MOVES, it just teleports.
 *
 * The NockerlSegmentedControl recipe (.nk-sg / .nk-sg__pill / .nk-sg__seg, the sizes,
 * icon segments + the reduced-motion freeze) now lives in the primitive
 * (NOCKERL_SEGMENTED_CONTROL_STYLES) and is injected by the component; what stays here is
 * the showcase chrome (.nk-sg-demo*) plus the swapping preview surface
 * (.nk-sg-preview*) that frames the live controls.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md); literals remain only for pure
 * geometry (icon dimensions, transition curves).
 */
import { useState } from 'react';
import { SEGMENT_ICONS, NockerlSegmentedControl, NockerlSurface, type Segment } from '@dizyx/nockerl-react';

// Demo-only scaffolding CSS: the showcase chrome (eyebrow labels, rows, the change
// counter) plus the small preview surface that SWAPS to prove the control switches
// a view/mode. The control's own recipe is injected by the primitive.
const STYLES = `
.nk-sg-demo { font-family: var(--font-family-sans); }
.nk-sg-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-sg-demo__group + .nk-sg-demo__group { margin-top: var(--space-6); }
.nk-sg-demo__row { display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: center; }
.nk-sg-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-6); }
.nk-sg-demo__count b { color: var(--color-accent-primary); }

/* ── A small preview surface that swaps to PROVE it switches a view/mode ─────── */
/* The lifted preview card. Bg / hairline / radius / sheen come from the NockerlSurface
   primitive; only margin + padding + the off-ladder drop shadow stay. */
.nk-sg-preview {
  margin-top: var(--space-3);
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen);
  padding: var(--space-4); max-width: 480px; min-height: 128px;
}
.nk-sg-preview__list { display: flex; flex-direction: column; gap: var(--space-2); }
.nk-sg-preview__listrow { height: var(--space-8); border-radius: var(--radius-control); background: var(--color-card-surface2); border: var(--space-px) solid var(--color-card-hairline); display: flex; align-items: center; padding: 0 var(--space-3); gap: var(--space-3); }
.nk-sg-preview__bullet { width: 8px; height: 8px; border-radius: var(--radius-pill); flex: 0 0 auto; background: var(--color-accent-primary); }
.nk-sg-preview__bar { height: var(--space-2); border-radius: var(--radius-pill); background: var(--color-card-surface3); }
.nk-sg-preview__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
.nk-sg-preview__tile { aspect-ratio: 1 / 1; border-radius: var(--radius-control); background: var(--color-card-surface2); border: var(--space-px) solid var(--color-card-hairline); display: flex; align-items: center; justify-content: center; color: var(--color-on-card-muted); }
.nk-sg-preview__tile svg { width: 20px; height: 20px; }
.nk-sg-preview__board { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
.nk-sg-preview__col { display: flex; flex-direction: column; gap: var(--space-2); }
.nk-sg-preview__colhd { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); }
.nk-sg-preview__chip { height: var(--space-8); border-radius: var(--radius-control); background: var(--color-card-surface2); border: var(--space-px) solid var(--color-card-hairline); }
`;

// ─── Preview surfaces that swap to PROVE the control switches a view/mode ──────
function ViewPreview({ view }: { view: string }) {
  if (view === 'grid') {
    return (
      <NockerlSurface className="nk-sg-preview">
        <div className="nk-sg-preview__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="nk-sg-preview__tile">{SEGMENT_ICONS.grid}</div>
          ))}
        </div>
      </NockerlSurface>
    );
  }
  if (view === 'board') {
    return (
      <NockerlSurface className="nk-sg-preview">
        <div className="nk-sg-preview__board">
          {['To do', 'Doing', 'Done'].map((c) => (
            <div key={c} className="nk-sg-preview__col">
              <span className="nk-sg-preview__colhd">{c}</span>
              <div className="nk-sg-preview__chip" />
              <div className="nk-sg-preview__chip" />
            </div>
          ))}
        </div>
      </NockerlSurface>
    );
  }
  // list (default)
  return (
    <NockerlSurface className="nk-sg-preview">
      <div className="nk-sg-preview__list">
        {[70, 52, 64, 44].map((w, i) => (
          <div key={i} className="nk-sg-preview__listrow">
            <span className="nk-sg-preview__bullet" />
            <span className="nk-sg-preview__bar" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </NockerlSurface>
  );
}

const VIEW_SEGMENTS: Segment[] = [
  { value: 'list', label: 'List', icon: 'list' },
  { value: 'grid', label: 'Grid', icon: 'grid' },
  { value: 'board', label: 'Board', icon: 'board' },
];
const TEXT_SEGMENTS: Segment[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];
const DIFF_SEGMENTS: Segment[] = [
  { value: 'unified', label: 'Unified', icon: 'unified' },
  { value: 'split', label: 'Split', icon: 'split' },
];
const THEME_SEGMENTS: Segment[] = [
  { value: 'light', icon: 'sun', title: 'Light' },
  { value: 'dark', icon: 'moon', title: 'Dark' },
  { value: 'auto', icon: 'auto', title: 'Auto' },
];
const FIVE_SEGMENTS: Segment[] = [
  { value: 'xs', label: 'XS' },
  { value: 'sm', label: 'SM' },
  { value: 'md', label: 'MD' },
  { value: 'lg', label: 'LG' },
  { value: 'xl', label: 'XL' },
];
const DISABLED_SEGMENTS: Segment[] = [
  { value: 'editor', label: 'Editor' },
  { value: 'preview', label: 'Preview' },
  { value: 'history', label: 'History', disabled: true },
];
const TWOUP_SEGMENTS: Segment[] = [
  { value: 'editor', label: 'Editor', icon: 'unified' },
  { value: 'preview', label: 'Preview', icon: 'split' },
];

/**
 * The interactive showcase mounted on the Segmented control page. A primary
 * icon+label control whose sliding pill swaps a real preview (list / grid /
 * board) to PROVE it switches the view; then text-only (2/3/5 segments),
 * icon-only, sizes (sm / md), a disabled segment, and full-width vs. intrinsic.
 * Every one is keyboard-operable (Tab in, Arrow/Home/End move + select).
 */
export default function SegmentedControlDemo() {
  const [view, setView] = useState('list');
  const [range, setRange] = useState('week');
  const [diff, setDiff] = useState('unified');
  const [theme, setTheme] = useState('dark');
  const [size, setSize] = useState('md');
  const [twoUp, setTwoUp] = useState('preview');
  const [editor, setEditor] = useState('editor');
  const [full, setFull] = useState('grid');

  return (
    <div className="nk-sg-demo">
      <style>{STYLES}</style>

      <div className="nk-sg-demo__group">
        <p className="nk-sg-demo__lbl">View mode: the pill slides; the preview below swaps (Tab in, Arrow keys)</p>
        <NockerlSegmentedControl label="Task view" segments={VIEW_SEGMENTS} value={view} onChange={setView} />
        <ViewPreview view={view} />
      </div>

      <div className="nk-sg-demo__group">
        <p className="nk-sg-demo__lbl">Text only: 2 · 3 · 5 segments</p>
        <div className="nk-sg-demo__row">
          <NockerlSegmentedControl label="Unified or split" segments={DIFF_SEGMENTS} value={diff} onChange={setDiff} />
          <NockerlSegmentedControl label="Date range" segments={TEXT_SEGMENTS} value={range} onChange={setRange} />
          <NockerlSegmentedControl label="Size" segments={FIVE_SEGMENTS} value={size} onChange={setSize} />
        </div>
      </div>

      <div className="nk-sg-demo__group">
        <p className="nk-sg-demo__lbl">NockerlIcon + label · icon only, sm and md</p>
        <div className="nk-sg-demo__row">
          <NockerlSegmentedControl label="Two-up mode" size="sm" segments={TWOUP_SEGMENTS} value={twoUp} onChange={setTwoUp} />
          <NockerlSegmentedControl label="Appearance" size="sm" segments={THEME_SEGMENTS} value={theme} onChange={setTheme} />
          <NockerlSegmentedControl label="Appearance, larger" size="md" segments={THEME_SEGMENTS} value={theme} onChange={setTheme} />
        </div>
      </div>

      <div className="nk-sg-demo__group">
        <p className="nk-sg-demo__lbl">A disabled segment: skipped by arrow keys, still legible</p>
        <NockerlSegmentedControl label="Document panel" segments={DISABLED_SEGMENTS} value={editor} onChange={setEditor} />
      </div>

      <div className="nk-sg-demo__group">
        <p className="nk-sg-demo__lbl">Full-width: equal-share segments fill the row</p>
        <NockerlSegmentedControl label="Layout, full width" fullWidth segments={VIEW_SEGMENTS} value={full} onChange={setFull} />
      </div>

      <div className="nk-sg-demo__group">
        <p className="nk-sg-demo__lbl">Disabled control: dimmed but readable, not interactive</p>
        <NockerlSegmentedControl label="Locked view" disabled segments={VIEW_SEGMENTS} value="grid" />
      </div>

      <p className="nk-sg-demo__count">
        Viewing <b>{view}</b> · range <b>{range}</b> · diff <b>{diff}</b>. The pill slides to the active segment. The island is live.
      </p>
    </div>
  );
}
