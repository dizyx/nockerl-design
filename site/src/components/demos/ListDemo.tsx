/**
 * ListDemo: the live, interactive Nockerl LIST CONTAINER island for the web.
 *
 * This is the COLLECTION, not the row. The single row (leading mark + primary +
 * secondary + trailing) is documented by `list-item`; here we compose many rows
 * and document how the container ARRANGES them: section headers, the hairline
 * dividers BETWEEN rows, density (comfortable vs dense), grouped-card (inset) vs
 * full-bleed, list-level selection (single + multi), a sticky section header in a
 * scroll region, and the loading / empty affordances.
 *
 * Sourced verbatim from the shipped apps (never the web dashboard):
 *   • Android Compose carries the two ratified list IDENTITIES (Design Review #1,
 *     Decision 4): the DENSE flat **tree** (`TaskTreeList`: a `LazyColumn` whose
 *     `groups.forEach { item(header) + items(children) }` builds section headers
 *     + rows; `contentPadding(vertical = 4.dp)`, full-bleed, no card) and the
 *     lifted collapsible **cards** (`InboxList`: `LazyColumn(spacedBy = 6.dp)`).
 *     The standard rule is `HorizontalDivider(thickness = 1.dp, color = divider)`
 *     (MainScaffold); the signature 1.5dp cyan boundary tops chrome (TasksSheet).
 *   • Voice Swift carries the GROUPED-CARD container: `ScrollView { LazyVStack(spacing:
 *     0) { ForEach { row } } }` wrapped in `.background(chromeSurface, in:
 *     RoundedRectangle(cornerRadius: cardRadius)) .overlay(strokeBorder(hairline))
 *     .nockerlElevation()` with a `SectionTitle` header and a per-row bottom
 *     hairline (`Rectangle().fill(hairline).frame(height: 1)`), in HistoryView and
 *     SettingsView's VocabularySection.
 *
 * Implements the design laws verbatim:
 *   • depth lives in the grouped-card SURFACE (lit-from-above: neutral shadow +
 *     top catch-light); rows + dividers inside are FLAT, never a per-row shadow,
 *     never a glow. A full-bleed list has no card and no shadow at all.
 *   • dividers are crisp HAIRLINES bound to `--color-divider`, INSET to the row's
 *     content start (they clear the leading column): structure, not decoration.
 *   • section headers ride muted-on-surface label type; sticky headers keep the
 *     surface token under them so rows never bleed through.
 *   • SELECTION is a list-level concern: a selected row reads via cyan ink and a cyan
 *     edge + a trailing check / leading checkbox, with no wash, NEVER a left stripe,
 *     NOT a glow, NOT a fill swap. Cyan is the only brand accent; the
 *     leading STATUS mark is a status-colored ICON (shape + color dual-coding, never a
 *     bare dot).
 *   • density changes spacing only (row min-height + padding), never the fill.
 *   • a selectable list is a real listbox (roles + arrow-key roving focus);
 *     focus is an OUTLINE ring, never a colored shadow.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a `var(--token)` (see
 * docs/demo-token-contract.md). The dark stage resolves them to the dark palette;
 * change a token and this demo moves with everything else. Literals remain only
 * for pure geometry (icon/dot/check dimensions, the 1px hairline weight, the
 * skeleton-shimmer keyframe, transition curves).
 */
import { useState } from 'react';
import { NockerlDivider, NockerlIcon, NockerlListItem, NockerlListboxOption, NockerlSegmentedControl, NockerlSurface, listboxRun, type ComposeContract } from '@dizyx/nockerl-react';

type Density = 'comfortable' | 'dense';
type Status = 'success' | 'warning' | 'error' | 'info' | 'idle';

// The leading STATUS mark (an ICON: shape + color dual-coding, never a bare
// colored dot) is now CANONICALIZED inside the NockerlListItem primitive: rows pass `status` and
// get the icon by default. The hand-rolled STATUS_COLOR/STATUS_ICON maps that used to
// live here (feeding a `leadingIcon` wrapper) moved into the primitive verbatim.

// The container owns layout: section headers (muted label), hairlines BETWEEN
// rows (inset to the content column), density (spacing only), grouped-card vs
// full-bleed, and the selected-row cyan treatment. Rows are intentionally minimal
// inline markup; the row's own anatomy is the `list-item` page's job.
const STYLES = `
.nk-ls { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
.nk-ls__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-6); }
.nk-ls__grid + .nk-ls__grid { margin-top: var(--space-6); }
.nk-ls__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }

/* ── The GROUPED-CARD (inset) container: depth lives HERE (Voice idiom). Bg / hairline /
   radius / sheen come from the NockerlSurface primitive; only overflow + the off-ladder drop shadow stay. ──── */
.nk-ls-card {
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen);
  overflow: hidden;
  /* nested-radius opt-in (the clip class): edge rows curve to the card clip (16px card radius
     minus the 1px hairline), so a selected first/last row's wash is never sliced. */
  --nk-nest-cap: calc(var(--radius-card) - var(--space-px));
}
/* EXPERIMENTAL ZEBRA: opt-in alternating-row tone (even rows a subtle neutral
   wash; odd rows plain). Theme-following via on-card. Default (no --zebra) byte-identical.
   A resting surface wash BENEATH the hairlines/selection/hover. */
.nk-ls-card--zebra > *:nth-of-type(even) { background: color-mix(in srgb, var(--color-on-card) 4%, transparent); }

/* ── The FULL-BLEED (plain) container: no card, no shadow (the dense tree). ── */
.nk-ls-plain { background: transparent; }

/* ── Section header: muted label; sticky variant keeps the surface under it. ── */
.nk-ls-sec {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-3) var(--space-4) var(--space-2);
  font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  font-weight: var(--font-weight-semibold); color: var(--color-on-card-muted);
}
.nk-ls-sec__count { color: var(--color-on-card-alt-muted); font-weight: var(--font-weight-medium); }
.nk-ls-plain .nk-ls-sec { color: var(--color-on-canvas-muted); }
.nk-ls-sec--sticky { position: sticky; top: 0; z-index: 1;
  background: color-mix(in srgb, var(--color-card-surface1) 92%, transparent);
  backdrop-filter: blur(8px); border-bottom: var(--space-px) solid var(--color-divider); }

/* The rows are now the NockerlListItem primitive (plain nav rows) + the NockerlListboxOption
   primitive (single/multi selectable rows); each owns its flat row, hover/press
   wash, leading mark, trailing value/check, and selection wash. The row + divider
   recipes that used to live here (.nk-ls-row*, .nk-ls-div*) moved into those
   primitives (and the NockerlDivider primitive), so only the CONTAINER chrome remains. */
/* DENSITY: the compact toggle now only tightens the section-header padding; the
   NockerlListItem / NockerlListboxOption rows have no density variant (see the demo FLAG note). */
.nk-ls--dense .nk-ls-sec { padding: var(--space-2) var(--space-3) var(--space-1); }

/* ── Loading: skeleton rows (shimmer is interpolatable opacity, not a fill swap) ── */
.nk-ls-sk { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4);
  min-height: calc(var(--space-12) + var(--space-2)); }
.nk-ls-sk__dot { width: var(--space-5); height: var(--space-5); border-radius: var(--radius-pill); flex: 0 0 auto; }
.nk-ls-sk__lines { flex: 1 1 auto; display: flex; flex-direction: column; gap: var(--space-2); }
.nk-ls-sk__bar { height: var(--space-3); border-radius: var(--radius-track); }
.nk-ls-sk__dot, .nk-ls-sk__bar { background: color-mix(in srgb, var(--color-on-card) 12%, transparent);
  animation: nk-ls-shimmer 1.4s ease-in-out infinite; }
@keyframes nk-ls-shimmer { 0%,100% { opacity: .5; } 50% { opacity: 1; } }

/* ── Empty hint: centered icon + sparse copy (the apps' empty states). ──── */
.nk-ls-empty { display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
  text-align: center; padding: var(--space-8) var(--space-4); color: var(--color-on-card-muted); }
.nk-ls-empty svg { width: 28px; height: 28px; opacity: .5; }
.nk-ls-empty__t { font-size: var(--font-size-14); color: var(--color-on-card); font-weight: var(--font-weight-medium); }
.nk-ls-empty__s { font-size: var(--font-size-12); color: var(--color-on-card-muted); }

/* ── A scrollable region (proves the sticky header + density). ──────────── */
.nk-ls-scroll { max-height: 224px; overflow-y: auto; }

/* ── controls ──────────────────────────────────────────────────────────── */
.nk-ls-ctl { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-3); }

.nk-ls__cap { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-ls__cap b { color: var(--color-accent-primary); }

@media (prefers-reduced-motion: reduce) {
  .nk-ls-row { transition: none; }
  .nk-ls-sk__dot, .nk-ls-sk__bar { animation: none; opacity: .7; }
}
`;

const Inbox = (
  <NockerlIcon>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
  </NockerlIcon>
);

interface Row { id: string; primary: string; sub?: string; status?: Status; value?: string; }

// A plain (non-selectable) row is the NockerlListItem primitive: it owns the flat row +
// hairline + hover/press wash + the leading status mark + the trailing value. The
// container just supplies primary/secondary/status/value from the data.
function NavRow({ row }: { row: Row }) {
  return (
    <NockerlListItem
      primary={row.primary}
      {...(row.sub ? { secondary: row.sub } : {})}
      {...(row.status ? { status: row.status } : {})}
      {...(row.value ? { value: row.value } : {})}
    />
  );
}

function Section({ label, count, sticky }: { label: string; count?: number; sticky?: boolean }) {
  return (
    <div className={`nk-ls-sec${sticky ? ' nk-ls-sec--sticky' : ''}`} role="presentation">
      <span>{label}</span>
      {count != null && <span className="nk-ls-sec__count">{count}</span>}
    </div>
  );
}

// ── data ──────────────────────────────────────────────────────────────────────
const RUNNING: Row[] = [
  { id: 'r1', primary: 'nockerl-design · docs site', sub: 'Streaming · 2 tools running', status: 'info', value: 'now' },
  { id: 'r2', primary: 'api-server · gateway refactor', sub: 'Idle · last active 12m ago', status: 'success', value: '12m' },
];
const NEEDS: Row[] = [
  { id: 'n1', primary: 'credential-store · allowlist audit', sub: 'Approval required', status: 'warning', value: '1h' },
  { id: 'n2', primary: 'dueydo · failed deploy', sub: 'Build exited 1', status: 'error', value: '3h' },
];
const FILES: Row[] = [
  { id: 'f1', primary: 'ListDemo.tsx', value: '8.1 KB' },
  { id: 'f2', primary: 'ListItemDemo.tsx', value: '9.4 KB' },
  { id: 'f3', primary: 'DividerDemo.tsx', value: '11 KB' },
  { id: 'f4', primary: 'ButtonDemo.tsx', value: '6.2 KB' },
  { id: 'f5', primary: 'tokens.css', value: '24 KB' },
];

// Data composite: rows are built from data arrays (rendered internally), not slots. Row <button role="option|checkbox">s and <hr> dividers are hand-rolled facsimiles that should compose NockerlListItem/NockerlDivider, so no owns.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

export default function ListDemo() {
  const [density, setDensity] = useState<Density>('comfortable');
  const [picked, setPicked] = useState('r2');                       // single-select
  const [checked, setChecked] = useState<Set<string>>(new Set(['f1', 'f3'])); // multi

  const all = [...RUNNING, ...NEEDS];

  // Single-select listbox keyboard: the LISTBOX keeps focus and points
  // aria-activedescendant at the active/selected option (the NockerlListboxOption model,
  // where options are non-focusable role="option" rows). Up/Down move + select.
  function onListKey(e: React.KeyboardEvent) {
    const i = all.findIndex((r) => r.id === picked);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? Math.min(i + 1, all.length - 1) : Math.max(i - 1, 0);
      setPicked(all[next]!.id);
    }
  }
  const toggle = (id: string) =>
    setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className={`nk-ls${density === 'dense' ? ' nk-ls--dense' : ''}`}>
      <style>{STYLES}</style>

      <div className="nk-ls-ctl">
        <span className="nk-ls__lbl" style={{ margin: 0 }}>Density</span>
        <NockerlSegmentedControl
          segments={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'dense', label: 'Dense' }]}
          value={density}
          onChange={(n) => setDensity(n as Density)}
          label="Density"
          size="sm"
        />
      </div>

      <div className="nk-ls__grid">
        {/* 1. GROUPED-CARD (inset): section headers carry structure; rows wrapped so
            the NockerlListItem inter-row hairline is suppressed (this list has no dividers). */}
        <div>
          <p className="nk-ls__lbl">Grouped card: sections carry structure, no inset hairlines</p>
          <NockerlSurface className="nk-ls-card">
            <Section label="Running" count={RUNNING.length} />
            {RUNNING.map((r) => (
              <div key={r.id}>
                <NavRow row={r} />
              </div>
            ))}
            <Section label="Needs attention" count={NEEDS.length} />
            {NEEDS.map((r) => (
              <div key={r.id}>
                <NavRow row={r} />
              </div>
            ))}
          </NockerlSurface>
        </div>

        {/* 2b. ZEBRA (experimental): opt-in alternating-row tone on a plain card. */}
        <div>
          <p className="nk-ls__lbl">Zebra (experimental): opt-in alternating row tone</p>
          <NockerlSurface className="nk-ls-card nk-ls-card--zebra">
            {FILES.map((r) => (
              <div key={r.id}>
                <NavRow row={r} />
              </div>
            ))}
          </NockerlSurface>
        </div>

        {/* 2. FULL-BLEED (plain): the dense tree idiom, no card, full-width NockerlDivider rules. */}
        <div>
          <p className="nk-ls__lbl">Full-bleed (plain): no card, edge-to-edge rules</p>
          <div className="nk-ls-plain">
            <Section label="Project files" count={FILES.length} />
            {FILES.map((r, i) => (
              <div key={r.id}>
                <NavRow row={r} />
                {i < FILES.length - 1 && <NockerlDivider />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="nk-ls__grid">
        {/* 3. SELECTABLE (single): a real listbox of NockerlListboxOption rows; the listbox
            keeps focus + points aria-activedescendant at the selected option. Up/Down move. */}
        <div>
          <p className="nk-ls__lbl">Selectable · single · ↑/↓ to move, one cyan indicator</p>
          <NockerlSurface className="nk-ls-card" role="listbox" aria-label="Active sessions" tabIndex={0}
            aria-activedescendant={`opt-${picked}`} onKeyDown={onListKey}>
            {all.map((r) => (
              <NockerlListboxOption
                key={r.id}
                id={`opt-${r.id}`}
                primary={r.primary}
                {...(r.sub ? { secondary: r.sub } : {})}
                {...(r.status && r.status !== 'idle' ? { status: r.status } : {})}
                selected={picked === r.id}
                active={picked === r.id}
                onActivate={() => setPicked(r.id)}
                onSelect={() => setPicked(r.id)}
              />
            ))}
          </NockerlSurface>
        </div>

        {/* 4. SELECTABLE (multi): a multi-select listbox of NockerlListboxOption rows with the
            leading checkbox indicator (the primitive's recessed-well tick box). */}
        <div>
          <p className="nk-ls__lbl">Selectable · multi · leading checkboxes</p>
          <NockerlSurface className="nk-ls-card" role="listbox" aria-multiselectable="true" aria-label="Files (multi-select)">
            {FILES.map((r, i) => (
              <NockerlListboxOption
                key={r.id}
                id={`chk-${r.id}`}
                primary={r.primary}
                {...(r.sub ? { secondary: r.sub } : {})}
                multi
                selected={checked.has(r.id)}
                // Contiguous-run corners: merge adjacent selected washes into one block.
                run={checked.has(r.id)
                  ? listboxRun(i > 0 && checked.has(FILES[i - 1]!.id), i < FILES.length - 1 && checked.has(FILES[i + 1]!.id))
                  : 'single'}
                onSelect={() => toggle(r.id)}
              />
            ))}
          </NockerlSurface>
        </div>
      </div>

      <div className="nk-ls__grid">
        {/* 5. STICKY section header in a scroll region. */}
        <div>
          <p className="nk-ls__lbl">Sticky section header: scroll the region</p>
          <NockerlSurface className="nk-ls-card">
            <div className="nk-ls-scroll">
              <Section label="Today" count={RUNNING.length} sticky />
              {RUNNING.map((r, i) => (
                <div key={r.id}>
                  <NavRow row={r} />
                  {i < RUNNING.length - 1 && <NockerlDivider />}
                </div>
              ))}
              <Section label="Earlier" count={NEEDS.length + FILES.length} sticky />
              {[...NEEDS, ...FILES].map((r, i, a) => (
                <div key={r.id}>
                  <NavRow row={r} />
                  {i < a.length - 1 && <NockerlDivider />}
                </div>
              ))}
            </div>
          </NockerlSurface>
        </div>

        {/* 6. LOADING (skeleton rows) + EMPTY hint, side by side. */}
        <div>
          <p className="nk-ls__lbl">Loading (skeleton) &amp; empty affordance</p>
          <NockerlSurface className="nk-ls-card" aria-busy="true" aria-label="Loading sessions">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="nk-ls-sk">
                  <span className="nk-ls-sk__dot" />
                  <span className="nk-ls-sk__lines">
                    <span className="nk-ls-sk__bar" style={{ width: i === 1 ? '58%' : '72%' }} />
                    <span className="nk-ls-sk__bar" style={{ width: '40%' }} />
                  </span>
                </div>
                {i < 2 && <NockerlDivider />}
              </div>
            ))}
          </NockerlSurface>
          <NockerlSurface className="nk-ls-card" style={{ marginTop: 'var(--space-3)' }}>
            <div className="nk-ls-empty">
              {Inbox}
              <span className="nk-ls-empty__t">No sessions yet</span>
              <span className="nk-ls-empty__s">New sessions will appear here.</span>
            </div>
          </NockerlSurface>
        </div>
      </div>

      <p className="nk-ls__cap">
        Selected session <b>{picked}</b> · {checked.size} file{checked.size === 1 ? '' : 's'} checked ·{' '}
        <b>{density}</b> density. The container is live: change <b>--color-divider</b> and every hairline moves.
      </p>
    </div>
  );
}
