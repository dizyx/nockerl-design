/**
 * PopoverDemo: the live, interactive Nockerl POPOVER island for web.
 *
 * The popover surface + its anchor / flip / clamp / scrim / focus-trap machinery now
 * live in the `NockerlPopover` primitive (`../primitives/NockerlPopover`); this island is the
 * showcase that DOGFOODS it: a contained stage with four example triggers, each
 * opening a popover of DIFFERENT rich content, plus a toolbar that toggles the beak
 * and forces a placement. The example triggers + the per-popover rich bodies are
 * supplied here (the demo-only scaffolding); the NockerlPopover primitive owns the panel,
 * the positioning, and the keyboard model.
 *
 * A popover is a NON-MODAL floating panel ANCHORED to a trigger that holds
 * ARBITRARY RICH CONTENT (a title, body text, fields, controls, actions) and
 * (optionally) a directional ARROW/beak pointing back at the trigger. DISTINCT
 * from its neighbours: it is NOT a list of action items (`menu`), NOT a one-line
 * hover hint (`tooltip`), NOT a press-and-hold contextual pop (`long-press-pop`),
 * and NOT a centered, ground-dimming modal (`dialog`). It opens on click/Enter,
 * positions relative to its trigger, flips/clamps to stay on-screen, and does NOT
 * dim the ground (it is non-modal, so the page stays usable).
 *
 * Sourced from the REAL apps (read-only). Voice is canonical here:
 * `UI/SettingsComponents.swift` `InfoTip` is a NockerlButton whose tap toggles a themed
 * `.popover(isPresented:arrowEdge: .bottom)` of rich `Text` content, padded, on
 * the `card2` raised surface, the literal anchored-panel-with-arrow this models.
 * Android (`core/theme/NockerlSurface.kt`) ships no popover composable yet, but
 * EXPLICITLY reserves the tier-3 lift (`NockerlElevation.Level3`) for "agent
 * cards, input bar, popovers", so the elevated-surface vocabulary
 * (`nockerlShadow` tinted drop shadow + `nockerlLitSurface` top catch-light +
 * the `cardSurface2 → cardSurface1` gradient) is the substrate the intended
 * `NockerlPopover` composes on (built on Material `Popup`). The anchor / flip /
 * clamp / scrim machinery is the shared vocabulary from MenuDemo; the panel
 * radius is the 12px panel token (NockerlPanelShape), the avatar mirrors
 * NockerlListItem's, and the field + action row reuse the field/button vocabulary.
 *
 * Laws: DEPTH = neutral tinted shadow + top catch-light, NEVER a glow. The panel
 * is an elevated card surface (card gradient + the neutral shadow token + a 1px
 * top sheen). The ARROW is the same surface + hairline, so the beak reads as part
 * of the panel, not a separate dot. flash-free: the fill is static; only
 * scale/opacity/transform animate the open, and the open FREEZES under
 * prefers-reduced-motion (it appears in place). Any cyan accent action puts
 * `--color-on-accent` on the cyan fill. TOKEN-REACTIVE: every
 * color/font/radius/spacing/type is a `var(--token)`; literals remain only for
 * pure geometry (icon px, the arrow's diagonal size, transition curves).
 */
import { useCallback, useRef, useState } from 'react';
import { NockerlAvatar, NockerlButton, NockerlCheckbox, NockerlIcon, NockerlIconButton, NockerlKbd, NockerlLink, NockerlPopover, NockerlSegmentedControl, NockerlTextField, type NockerlPopoverHandle, type Side } from '@dizyx/nockerl-react';

type PopId = 'profile' | 'rename' | 'filter' | 'invite';

const STYLES = `
.nk-pp-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
.nk-pp-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-pp-demo__hint { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin: var(--space-1) 0 var(--space-3); }
/* key hints in the caption are now the shared NockerlKbd primitive (self-styled raised keycap). */
.nk-pp-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-pp-demo__count b { color: var(--color-accent-primary); }
/* a small toolbar of switches over the stage: control the arrow + placement */
.nk-pp-toolbar { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: center; margin-bottom: var(--space-3); }

/* The contained STAGE: every popover opens INSIDE here, clamped to it (never the page).
   Shared panel chrome lives in 'nk-demo-overlay-stage' (theme.css); only this demo's
   footprint (max-width / min-height) stays here. */
.nk-pp-stage { max-width: 560px; min-height: var(--size-container-lg); }
/* triggers pinned to varied positions so flip + clamp + every arrow edge are visible */
.nk-pp-anchors { position: relative; z-index: 1; min-height: var(--size-container-lg); }
.nk-pp-spot { position: absolute; }
.nk-pp-spot--tl { top: var(--space-4); left: var(--space-4); }
.nk-pp-spot--tr { top: var(--space-4); right: var(--space-4); }
.nk-pp-spot--bl { bottom: var(--space-4); left: var(--space-4); }
.nk-pp-spot--br { bottom: var(--space-4); right: var(--space-4); }
.nk-pp-spot__cap { display: block; font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.nk-pp-spot--tr .nk-pp-spot__cap, .nk-pp-spot--br .nk-pp-spot__cap { text-align: right; }

/* the TRIGGERS are all real primitives now: the labelled (Rename / Filter) + icon (Invite)
   openers are NockerlButton / NockerlIconButton, and the avatar identity-chip trigger is the NockerlAvatar
   primitive (a pressable "PM" face). Each owns its resting / hover / press / focus recipe,
   so no bespoke trigger chrome lives here. */
/* the Filter trigger's active-count badge shares the panel filter-row count style (also defined in NOCKERL_POPOVER_STYLES); kept here so it is styled when no popover is open */
.nk-pp-check__count { flex: 0 0 auto; font-family: var(--font-family-mono); font-size: var(--font-size-12); color: var(--color-on-card-muted); }
`;

// ─── Inline stroke glyphs (currentColor so each slot tints from its token) ─────
const IconInfo = <NockerlIcon><path d="M12 16v-4" /><path d="M12 8h.01" /><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /></NockerlIcon>;
const IconFilter = <NockerlIcon path="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />;
const IconArrowOut = <NockerlIcon><path d="M7 17 17 7" /><path d="M9 7h8v8" /></NockerlIcon>;
const IconRename = <NockerlIcon><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></NockerlIcon>;
const IconAddUser = <NockerlIcon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" /><path d="M19 8v6" /><path d="M22 11h-6" /></NockerlIcon>;

interface FilterRow { id: string; label: string; count: string; }
const FILTERS: FilterRow[] = [
  { id: 'streaming', label: 'Streaming', count: '4' },
  { id: 'needs', label: 'Needs attention', count: '2' },
  { id: 'idle', label: 'Idle', count: '7' },
  { id: 'archived', label: 'Archived', count: '23' },
];

/**
 * The interactive showcase mounted on the NockerlPopover page: a contained stage with
 * four anchored triggers, each opening a popover of DIFFERENT rich content:
 * a profile/info CARD (avatar header + meta + a link action), a small FORM
 * (a field + Cancel/Apply), a FILTER panel (checkable rows + Apply), and an
 * invite CARD, each with a directional ARROW pointing at its trigger. A toolbar
 * toggles the arrow on/off and forces a placement (auto / top / bottom / left /
 * right); the panel flips + clamps to stay inside the stage. Fully
 * keyboard-operable: Enter/Space/↓ opens and moves focus INTO the panel, Tab
 * cycles within (focus-trapped), Esc closes and restores focus to the trigger,
 * an outside click closes. Token-driven; the open freezes under reduced-motion.
 */
export default function PopoverDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<NockerlPopoverHandle>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [arrow, setArrow] = useState(true);
  const [place, setPlace] = useState<'auto' | Side>('auto');
  const [filters, setFilters] = useState<Record<string, boolean>>({ streaming: true, needs: true });
  const [name, setName] = useState('gateway-refactor');
  const [email, setEmail] = useState('');
  const [last, setLast] = useState('none yet');

  const close = useCallback((restore = true) => popoverRef.current?.close(restore), []);

  // toggle: same trigger closes, otherwise (re)open with the active placement.
  const onTrigger = useCallback((id: PopId, side: Side, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openId === id) { close(); return; }
    popoverRef.current?.open(id, place === 'auto' ? side : place, e.currentTarget, false);
  }, [openId, close, place]);

  const triggerKey = (id: PopId, side: Side) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (openId === id) close();
      else popoverRef.current?.open(id, place === 'auto' ? side : place, e.currentTarget, true);
    }
  };

  const toggleFilter = (id: string) => setFilters((f) => ({ ...f, [id]: !f[id] }));
  const activeFilters = FILTERS.filter((f) => filters[f.id]).length;

  // ── the rich body for each popover (free-form content, the whole point) ──
  const renderBody = (id: string, titleId: string) => {
    if (id === 'profile') {
      return (
        <>
          <div className="nk-pp-id">
            <span className="nk-pp-id__face" aria-hidden="true">PM</span>
            <span className="nk-pp-id__name">
              <strong id={titleId}>the design lead</strong>
              <span>Owner · dizyx</span>
            </span>
          </div>
          <div className="nk-pp-meta">
            <div><b>128</b>sessions</div>
            <div><b>14</b>projects</div>
            <div><b>3</b>agents</div>
          </div>
          {/* the trailing arrow rides NockerlLink's own icon slot (.nk-lnk__icon → 1em); placed
              raw it has no size constraint and balloons to ~300px, blowing up the popover. */}
          <NockerlLink href="#" onClick={() => { setLast('Opened profile'); close(); }}>
            View full profile <span className="nk-lnk__icon" aria-hidden="true">{IconArrowOut}</span>
          </NockerlLink>
        </>
      );
    }
    if (id === 'rename') {
      return (
        <>
          <p className="nk-pp-sectionlbl">Rename session</p>
          <h3 className="nk-pp-title" id={titleId}>Give it a clear name</h3>
          <NockerlTextField label="Session name" value={name} onChange={setName} placeholder="Session name" />
          <div className="nk-pp-actions">
            <NockerlButton text="Cancel" variant="ghost" size="sm" onClick={() => close()} />
            <NockerlButton text="Save" variant="primary" size="sm" onClick={() => { setLast(`Renamed to “${name}”`); close(); }} />
          </div>
        </>
      );
    }
    if (id === 'filter') {
      return (
        <>
          <h3 className="nk-pp-title" id={titleId}>Filter sessions</h3>
          <div style={{ marginTop: 'var(--space-2)' }}>
            {FILTERS.map((f) => (
              <div
                key={f.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', padding: 'var(--space-2)' }}
              >
                <NockerlCheckbox checked={!!filters[f.id]} onChange={() => toggleFilter(f.id)} label={f.label} size="sm" />
                <span className="nk-pp-check__count">{f.count}</span>
              </div>
            ))}
          </div>
          <div className="nk-pp-actions nk-pp-actions--split">
            <NockerlButton text="Reset" variant="ghost" size="sm" onClick={() => setFilters({})} />
            <NockerlButton text="Apply" variant="primary" size="sm" onClick={() => { setLast(`Applied ${activeFilters} filter${activeFilters === 1 ? '' : 's'}`); close(); }} />
          </div>
        </>
      );
    }
    // invite
    return (
      <>
        <h3 className="nk-pp-title" id={titleId}>Invite a teammate</h3>
        <p className="nk-pp-body">They’ll get access to this workspace’s sessions and projects.</p>
        <NockerlTextField label="Email address" value={email} onChange={setEmail} placeholder="name@company.com" type="email" />
        <div className="nk-pp-actions">
          <NockerlButton text="Cancel" variant="ghost" size="sm" onClick={() => close()} />
          <NockerlButton text="Send invite" variant="primary" size="sm" onClick={() => { setLast('Invite sent'); close(); }} />
        </div>
      </>
    );
  };

  const popWidth = (id: string) => (id === 'profile' ? '280px' : id === 'invite' ? '280px' : '256px');

  return (
    <div className="nk-pp-demo">
      <style>{STYLES}</style>
      <p className="nk-pp-demo__lbl">Click a trigger to float its panel: anchored, with a beak, clamped to the stage</p>
      <p className="nk-pp-demo__hint">
        Open with a click or <NockerlKbd>Enter</NockerlKbd> / <NockerlKbd>Space</NockerlKbd>; focus moves into the panel.{' '}
        <NockerlKbd>Tab</NockerlKbd> cycles inside, <NockerlKbd>Esc</NockerlKbd> closes (focus returns to the trigger), click outside dismisses. Non-modal, so the page stays live.
      </p>

      <div className="nk-pp-toolbar">
        <NockerlSegmentedControl
          label="Arrow"
          size="sm"
          value={arrow ? 'on' : 'off'}
          onChange={(v) => setArrow(v === 'on')}
          segments={[{ value: 'on', label: 'With beak' }, { value: 'off', label: 'No beak' }]}
        />
        <NockerlSegmentedControl
          label="Placement"
          size="sm"
          value={place}
          onChange={(v) => setPlace(v as 'auto' | Side)}
          segments={[
            { value: 'auto', label: 'Auto' },
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ]}
        />
      </div>

      <div className="nk-pp-stage nk-demo-overlay-stage" ref={stageRef}>
        <div className="nk-pp-anchors">
          {/* top-left: a tappable avatar identity chip -> profile card (prefers BOTTOM, arrow
              points up). The trigger is the real NockerlAvatar primitive (a pressable "PM" avatar face
              that IS a <button>): it forwards onClick (WITH the event, so the popover anchors to
              e.currentTarget), onKeyDown, and aria-haspopup / aria-expanded straight through to
              its <button>, so all a11y + the toggle handler + the keyboard model are preserved. */}
          <div className="nk-pp-spot nk-pp-spot--tl">
            <span className="nk-pp-spot__cap">Profile card</span>
            <NockerlAvatar
              name="Ada Lovelace"
              size="sm"
              aria-haspopup="dialog"
              aria-expanded={openId === 'profile'}
              onClick={(e) => onTrigger('profile', 'bottom', e)}
              onKeyDown={triggerKey('profile', 'bottom')}
            />
          </div>

          {/* top-right: an info ⓘ icon → invite card (prefers BOTTOM; flips/clamps near the edge) */}
          <div className="nk-pp-spot nk-pp-spot--tr">
            <span className="nk-pp-spot__cap">Invite</span>
            <NockerlIconButton
              icon={IconAddUser}
              label="Invite a teammate"
              variant="plain"
              aria-haspopup="dialog"
              aria-expanded={openId === 'invite'}
              onClick={(e) => onTrigger('invite', 'bottom', e)}
              onKeyDown={triggerKey('invite', 'bottom')}
            />
          </div>

          {/* bottom-left: a labelled control → rename FORM (prefers TOP, arrow points down) */}
          <div className="nk-pp-spot nk-pp-spot--bl">
            <NockerlButton
              text="Rename"
              variant="secondary"
              leadingIcon={IconRename}
              aria-haspopup="dialog"
              aria-expanded={openId === 'rename'}
              onClick={(e) => onTrigger('rename', 'top', e)}
              onKeyDown={triggerKey('rename', 'top')}
            />
          </div>

          {/* bottom-right: a labelled control → filter panel (prefers TOP; flips/clamps) */}
          <div className="nk-pp-spot nk-pp-spot--br">
            <NockerlButton
              text="Filter"
              variant="secondary"
              leadingIcon={IconFilter}
              trailingIcon={activeFilters > 0 ? <span className="nk-pp-check__count">{activeFilters}</span> : undefined}
              aria-haspopup="dialog"
              aria-expanded={openId === 'filter'}
              onClick={(e) => onTrigger('filter', 'top', e)}
              onKeyDown={triggerKey('filter', 'top')}
            />
          </div>
        </div>

        {/* the POPOVER primitive owns the panel, scrim, positioning, focus-trap; driven by the triggers */}
        <NockerlPopover
          boundaryRef={stageRef}
          handleRef={popoverRef}
          renderContent={renderBody}
          getWidth={popWidth}
          arrow={arrow}
          place={place}
          onOpenChange={setOpenId}
        />
      </div>

      <p className="nk-pp-demo__count">
        Last action: <b>{last}</b> · {activeFilters} filter{activeFilters === 1 ? '' : 's'} on · placement {place} · pointer + keyboard both work; the island is live.
      </p>
    </div>
  );
}
