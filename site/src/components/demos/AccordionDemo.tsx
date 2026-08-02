/**
 * AccordionDemo: the live, interactive Nockerl accordion / expander island for web.
 *
 * Sourced from the shipped apps (never the web dashboard):
 *   • Android (canonical) in `SamplingAdvancedSettings`, `ToolAdapterCards`,
 *     `AgentTranscriptPanel` (chat/ui/*): a clickable header = leading icon +
 *     label + optional status/"modified" pill + a trailing chevron, with the body
 *     revealed by `AnimatedVisibility(expandVertically() + fadeIn())`. Stacked
 *     sections each toggle independently (multi-open).
 *   • Voice/Swift (canonical) in `VocabRow` (SettingsView) and `HistoryView`: a flat
 *     expandable row on ONE card, governed by a single `expandedID` so opening one
 *     closes the rest (single-open), `withAnimation(.spring(...))`.
 *
 * Implements the design laws verbatim:
 *   • the CARD lifts (neutral shadow + top catch-light, never a glow); the item
 *     rows inside are FLAT, split by a hairline. Depth lives in the card.
 *   • each row IS the NockerlListItem primitive (expandable form): NockerlListItem owns the real
 *     <button> (aria-expanded + aria-controls; Enter/Space toggle; focus-visible cyan
 *     OUTLINE), the trailing down-to-up EXPAND chevron, and the flash-free reveal:
 *     interpolatable props only (grid-rows 0fr→1fr height + opacity + chevron rotation).
 *   • the "modified" / status pill is the NockerlBadge primitive (soft variant) passed through
 *     NockerlListItem's `trailing` slot, drawn from the status ladder or the cyan accent, never decorative.
 *   • panel radius = --radius-panel (12); card radius = --radius-card (16).
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them to
 * the dark palette; change a token and this demo moves with it. Literals remain only
 * for pure geometry (chevron box, transition curves/durations).
 */
import { useState } from 'react';
import { NockerlBadge, NockerlChip, NockerlIcon, NockerlIconButton, NockerlListItem, NockerlSurface, type NockerlBadgeTone, type ComposeContract } from '@dizyx/nockerl-react';

export type AccordionPill = { text: string; tone: 'accent' | 'success' | 'warning' } | null;

export interface AccordionItemProps {
  /** Header label: the disclosure's accessible name (label.large role). */
  title: string;
  /** Optional leading glyph slot rendered before the title. */
  icon?: React.ReactNode;
  /** Optional supporting line under the title (body.small role). */
  hint?: string;
  /** Optional trailing status / "modified" pill in the header. */
  pill?: AccordionPill;
  /**
   * ALWAYS-VISIBLE header controls, pinned to the header's trailing edge,
   * left of the disclosure chevron, and rendered OUTSIDE the toggle button so
   * interactive controls (a delete `NockerlIconButton`, a count `NockerlBadge`) work
   * independently and NEVER toggle the row. Present in both collapsed and expanded
   * states. Matches the `headerAccessory` seat naming/semantics from
   * FormSection / TodoWidget. When set, the header reserves trailing space via
   * `--nk-acc-accessory-reserve` (default 64px; bump it for wider accessories).
   */
  headerAccessory?: React.ReactNode;
  /**
   * CONTROLLED open state. When provided, the item is controlled: it renders
   * `expanded` and reports every toggle via `onExpandedChange` (external binding).
   * Omit both to run UNCONTROLLED (the item self-manages, seeded by `defaultExpanded`).
   */
  expanded?: boolean;
  /** Fires with the requested next open state when the user toggles (controlled). */
  onExpandedChange?: (next: boolean) => void;
  /** Initial open state for UNCONTROLLED usage (the item self-manages). Default false. */
  defaultExpanded?: boolean;
  /** @deprecated Back-compat alias for `expanded` (pre-). Prefer `expanded`. */
  open?: boolean;
  /** @deprecated Back-compat alias for a zero-arg toggle. Prefer `onExpandedChange`. */
  onToggle?: () => void;
  /** Inert + clearly-seen (never invisible) state. */
  disabled?: boolean;
  /** Revealed panel content. */
  children: React.ReactNode;
}

// The card carries the depth; the NockerlListItem rows inside are flat. Each row IS the
// NockerlListItem primitive now (it owns the <button>, the down-to-up chevron, the grid
// 0fr→1fr + opacity reveal, and aria-expanded/controls), so only the containing
// CARD chrome + the in-panel content styling (chips / well) live here. Every value
// is a token; the dark stage resolves the cyan accent to #0cc0df.
const STYLES = `
.nk-acc-demo { font-family: var(--font-family-sans); display: grid; gap: var(--space-6); max-width: 480px; }
/* The containing CARD: depth lives here (card radius, lit from above). Bg / hairline /
   radius / sheen come from the NockerlSurface primitive; only overflow + the off-ladder drop shadow stay. */
.nk-acc {
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen);
  overflow: hidden;
}
/* ZEBRA (task 2763, experimental): opt-in alternating-row tone (even rows get a subtle
   neutral wash; odd rows plain). Theme-following via on-card. Default (no --zebra) is
   byte-identical. A resting surface wash BENEATH the hairlines/selection/hover. */
.nk-acc--zebra > *:nth-of-type(even) { background: color-mix(in srgb, var(--color-on-card) 4%, transparent); }
/* header ACCESSORY: always-visible controls pinned to the header trailing edge,
   OUTSIDE the toggle button (a sibling, so a delete IconButton / count Badge fires on its
   own and never toggles the row). Overlaid left of the disclosure chevron; the header
   reserves trailing space so title/hint/pill never underlap it. Absolute within the
   position:relative item wrapper; vertically centered to the header's first line (the row
   min-height band), which top-aligns cleanly on 2-line headers. */
.nk-acc-item { position: relative; }
.nk-acc-item__accessory {
  position: absolute; top: 0; right: calc(var(--space-4) + var(--space-6));
  min-height: calc(var(--space-12) + var(--space-2)); /* the NockerlListItem row band (56) */
  display: inline-flex; align-items: center; gap: var(--space-2);
  pointer-events: auto;
}
/* reserve trailing room in the header text column so content clears the overlaid
   accessory + chevron zone; consumers bump --nk-acc-accessory-reserve for wider slots. */
.nk-acc-item--has-accessory .nk-li__text { padding-right: var(--nk-acc-accessory-reserve, var(--space-16)); }

/* the revealed body is NockerlListItem's own region (padding + type from the primitive); we only
   reset the paragraph rhythm of the rich content we pass through the details slot. */
.nk-acc .nk-li__body-content p { margin: 0; }
.nk-acc .nk-li__body-content p + p { margin-top: var(--space-2); }
/* the Voice vocab row composes the REAL NockerlChip (token mode = a static, non-interactive
   tag: a <span>, no toggle, no remove x); the flex row is the only chrome that stays here. */
.nk-acc__chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
/* a nested well inside a panel (recessed, because fields and wells sink) */
.nk-acc__well { background: var(--color-canvas); border: var(--space-px) solid var(--color-divider);
  border-radius: var(--radius-control); padding: var(--space-3);
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 30%, transparent);
  font-family: var(--font-family-mono); font-size: var(--font-size-12); color: var(--color-on-card); }
.nk-acc-demo__group { display: grid; gap: var(--space-2); }
.nk-acc-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0; }
.nk-acc-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin: 0; }
.nk-acc-demo__count b { color: var(--color-accent-primary); }
`;

// ─── Inline glyphs (stroke icons using currentColor so each slot tints correctly) ──
// The disclosure chevron is no longer hand-rolled here: NockerlListItem owns the trailing
// down-to-up EXPAND chevron (rotates 180deg on open) + the flash-free reveal.
const IconTune = <NockerlIcon path="M4 6h10M4 12h6M4 18h13M16 4v4M12 10v4M19 16v4" />;
const IconKey = (
  <NockerlIcon path="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3M22 6l-3-3" />
);
const IconLock = (
  <NockerlIcon>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </NockerlIcon>
);
const IconTrash = <NockerlIcon path="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />;
const IconFolder = <NockerlIcon path="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />;

// The header pill is the NockerlBadge primitive (soft variant: a tint + a hue label + a
// hairline, the app's inline status-pill idiom). The AccordionPill tones map 1:1 to
// NockerlBadge tones; `accent` stays the cyan "modified" mark, the rest are warm status.
const PILL_TONE: Record<NonNullable<AccordionPill>['tone'], NockerlBadgeTone> = {
  accent: 'accent',
  success: 'success',
  warning: 'warning',
};

/**
 * A single Nockerl accordion item, the unit the spec documents. It IS the NockerlListItem
 * primitive in its expandable form: NockerlListItem owns the one <button> (one accessible
 * name, aria-expanded, aria-controls), the leading icon slot, the title + optional
 * hint, the trailing down-to-up chevron, and the flash-free grid-row + opacity reveal.
 * The trailing status "modified" pill is a composed NockerlBadge passed through NockerlListItem's
 * `trailing` slot (rendered before the chevron); the panel content is `details`.
 */
export function AccordionItem({
  title,
  icon,
  hint,
  pill,
  headerAccessory,
  expanded,
  onExpandedChange,
  defaultExpanded = false,
  open,
  onToggle,
  disabled = false,
  children,
}: AccordionItemProps) {
  // Controlled iff either the canonical `expanded` or the legacy `open` alias is given;
  // otherwise UNCONTROLLED (self-managed, seeded by defaultExpanded).
  const controlledValue = expanded ?? open;
  const isControlled = controlledValue !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultExpanded);
  const isOpen = isControlled ? Boolean(controlledValue) : internalOpen;

  const requestToggle = () => {
    if (disabled) return;
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);
    onExpandedChange?.(next);
    onToggle?.(); // legacy alias
  };

  const listItem = (
    <NockerlListItem
      expandable
      expanded={isOpen}
      onToggle={requestToggle}
      disabled={disabled}
      primary={title}
      {...(hint ? { secondary: hint } : {})}
      {...(icon ? { leadingIcon: icon } : {})}
      {...(pill ? { trailing: <NockerlBadge label={pill.text} tone={PILL_TONE[pill.tone]} variant="soft" size="sm" /> } : {})}
      details={children}
    />
  );

  // No accessory → the NockerlListItem unit renders exactly as before (byte-identical).
  if (!headerAccessory) return listItem;

  // With an accessory: wrap the unit and overlay the accessory as a SIBLING of the
  // toggle button (pinned to the header trailing edge, left of the chevron) so its
  // interactive controls fire independently and never toggle the row. The header
  // reserves trailing space so the title/hint/pill never underlap the accessory.
  return (
    <div className="nk-acc-item nk-acc-item--has-accessory">
      {listItem}
      <div className="nk-acc-item__accessory">{headerAccessory}</div>
    </div>
  );
}

// CONTAINER: the disclosure body is `children`, arbitrary revealed panel content
// (paragraphs, chips, wells, any component), so `default` accepts '*'. `icon` is glyph
// ornamentation, not a slot.
// COMPOSED: there is no hand-rolled disclosure <button>. AccordionItem delegates the
// whole row to the NockerlListItem primitive (expandable form). NockerlListItem OWNS the <button> +
// aria-expanded/controls + the down-to-up chevron + the grid-row/opacity reveal, so those are
// no longer re-derived here. The former primitive gap (a tone-styled trailing pill) is closed
// by NockerlListItem's new `trailing` slot, which we fill with the real NockerlBadge primitive (soft tone).
// title->primary, hint->secondary, icon->leadingIcon, open->expanded, children->details.
// headerAccessory is a named ReactNode SLOT holding structural child components
// (a delete NockerlIconButton, a count NockerlBadge), modeled so the composition-graph
// gate reads them as approved, not hand-rolled.
export const compose = {
  slots: {
    default: { accepts: '*' },
    headerAccessory: { accepts: '*', required: false },
  },
} satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Accordion page: a SINGLE-OPEN accordion
 * (Voice `expandedID` semantics, where opening one closes the rest) with a leading icon,
 * a hint line, a "modified" pill, a disabled item, and chips inside a panel; plus a
 * MULTI-OPEN group (Android stacked-section semantics, where each toggles independently)
 * carrying rich content and a recessed code well. Tab to a header, Enter/Space to
 * toggle; the chevron rotates and the panel reveals flash-free.
 */
export default function AccordionDemo() {
  // single-open: one id open at a time (null = all collapsed)
  const [openOne, setOpenOne] = useState<string | null>('sampling');
  const pick = (id: string) => setOpenOne((cur) => (cur === id ? null : id));

  // multi-open: a set of open ids
  const [openMany, setOpenMany] = useState<Set<string>>(() => new Set(['bash']));
  const toggleMany = (id: string) =>
    setOpenMany((cur) => {
      const next = new Set(cur);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  //  header-accessory group: rows carry always-visible controls (delete + count),
  // and run UNCONTROLLED (each self-manages via defaultExpanded, with no host open state).
  const [rows, setRows] = useState([
    { id: 'drafts', title: 'Drafts', count: 4 },
    { id: 'archive', title: 'Archive', count: 128 },
  ]);
  const [deleted, setDeleted] = useState<string | null>(null);
  const removeRow = (id: string) => {
    setRows((cur) => cur.filter((r) => r.id !== id));
    setDeleted(id);
  };

  return (
    <div className="nk-acc-demo">
      <style>{STYLES}</style>

      <div className="nk-acc-demo__group">
        <p className="nk-acc-demo__lbl">Single-open: opening one closes the rest</p>
        <NockerlSurface className="nk-acc">
          <AccordionItem
            title="Sampling"
            hint="Temperature, top-p, penalties"
            icon={IconTune}
            pill={{ text: 'MODIFIED', tone: 'accent' }}
            open={openOne === 'sampling'}
            onToggle={() => pick('sampling')}
          >
            <p>Per-session overrides. Leave untouched to inherit the registry defaults for this model + provider.</p>
            <div className="nk-acc__well" style={{ marginTop: 'var(--space-3)' }}>temperature 0.7 · top_p 0.95 · max_tokens 4096</div>
          </AccordionItem>

          <AccordionItem
            title="Vocabulary · Nockerl"
            hint="3 mis-hearings corrected"
            icon={IconKey}
            open={openOne === 'vocab'}
            onToggle={() => pick('vocab')}
          >
            <div className="nk-acc__chips">
              <NockerlChip text="knuckle" token />
              <NockerlChip text="knockerl" token />
              <NockerlChip text="no curl" token />
            </div>
          </AccordionItem>

          <AccordionItem
            title="Workspace"
            hint="Locked by your administrator"
            icon={IconLock}
            open={false}
            onToggle={() => {}}
            disabled
          >
            <p>Inaccessible.</p>
          </AccordionItem>
        </NockerlSurface>
      </div>

      <div className="nk-acc-demo__group">
        <p className="nk-acc-demo__lbl">Multi-open: each section toggles independently</p>
        <NockerlSurface className="nk-acc">
          <AccordionItem
            title="Bash · build"
            hint="exit 0 · 2.4s"
            pill={{ text: 'DONE', tone: 'success' }}
            open={openMany.has('bash')}
            onToggle={() => toggleMany('bash')}
          >
            <div className="nk-acc__well">
              $ bun run build
              <br />✓ 142 modules · 2.4s
            </div>
          </AccordionItem>

          <AccordionItem
            title="Sub-agent · transcript"
            hint="research · 8 steps"
            open={openMany.has('agent')}
            onToggle={() => toggleMany('agent')}
          >
            <p>Lazily fetched on first expand, collapsed by default so a long transcript never floods the card.</p>
            <p>Read 4 files · searched 2 sources · drafted summary.</p>
          </AccordionItem>

          <AccordionItem
            title="Permissions · push"
            hint="Approval required"
            pill={{ text: 'REVIEW', tone: 'warning' }}
            open={openMany.has('perm')}
            onToggle={() => toggleMany('perm')}
          >
            <p>Pushing to <code>main</code> needs your sign-off. Warm tones (here, REVIEW) are status only, never a decorative accent.</p>
          </AccordionItem>
        </NockerlSurface>
      </div>

      <div className="nk-acc-demo__group">
        <p className="nk-acc-demo__lbl">Header accessory + uncontrolled: always-visible delete, each self-manages</p>
        <NockerlSurface className="nk-acc">
          {rows.map((r) => (
            <AccordionItem
              key={r.id}
              title={r.title}
              icon={IconFolder}
              defaultExpanded={r.id === 'drafts'}
              headerAccessory={
                <>
                  <NockerlBadge count={r.count} tone="neutral" variant="soft" size="sm" />
                  <NockerlIconButton
                    icon={IconTrash}
                    label={`Delete ${r.title}`}
                    size={28}
                    onClick={() => removeRow(r.id)}
                  />
                </>
              }
            >
              <p>Open me and delete me independently. The trash button never toggles the row, and no host holds my open state (defaultExpanded seeds it, I keep it).</p>
            </AccordionItem>
          ))}
        </NockerlSurface>
      </div>

      <div className="nk-acc-demo__group">
        <p className="nk-acc-demo__lbl">Zebra (task 2763, experimental): opt-in alternating row tone; default stays plain</p>
        <NockerlSurface className="nk-acc nk-acc--zebra">
          <AccordionItem title="Sampling" hint="Temperature, top-p" icon={IconTune} defaultExpanded={false}>
            <p>Alternating rows carry a whisper of neutral wash that is theme-following, opt-in, and beneath the hairlines.</p>
          </AccordionItem>
          <AccordionItem title="Vocabulary" hint="3 corrections" icon={IconKey} defaultExpanded={false}>
            <p>This row is the toned one (even).</p>
          </AccordionItem>
          <AccordionItem title="Workspace" hint="Shared" icon={IconLock} defaultExpanded={false}>
            <p>Plain again (odd).</p>
          </AccordionItem>
          <AccordionItem title="Permissions" hint="Approval required" icon={IconFolder} defaultExpanded={false}>
            <p>Toned (even).</p>
          </AccordionItem>
        </NockerlSurface>
      </div>

      <p className="nk-acc-demo__count">
        Single-open: <b>{openOne ?? 'none'}</b> · multi-open: <b>{openMany.size}</b> section
        {openMany.size === 1 ? '' : 's'} expanded{deleted ? <> · deleted <b>{deleted}</b></> : null}. The island is live.
      </p>
    </div>
  );
}
