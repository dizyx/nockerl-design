/**
 * ListItemDemo: the live, interactive Nockerl list-item island for the web.
 *
 * Dogfoods the NockerlListItem primitive (../primitives/NockerlListItem): the row component +
 * its types + the leading-status helper + the row CSS now live there. This island
 * keeps ONLY the showcase scaffolding: the page chrome (eyebrow labels + the live
 * state line), the containing CARD (where depth lives, since the rows are flat), and the
 * inline static row whose trailing CONTROL (a toggle) is its own focusable target.
 *
 * Mirrors the canonical Compose `NockerlListItemRow` + `NockerlLeadingStatusMark`
 * (core/ui/NockerlListItem.kt): a row is leading slot → primary + secondary text
 * → trailing slot, laid out ON a containing card. The depth lives in the CARD;
 * the rows themselves are FLAT.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a `var(--token)` (see
 * docs/demo-token-contract.md). The dark stage resolves them to the dark palette;
 * change a token and this demo moves with everything else. The trailing toggle is
 * the NockerlSwitch primitive (self-injects its own recipe + tokens).
 */
import { useState } from 'react';
import { NockerlListItem, NockerlSurface, NockerlSwitch } from '@dizyx/nockerl-react';

// Demo-only scaffolding: the page chrome (eyebrow labels + the live state line), the
// containing CARD (NockerlSurface bg/hairline/radius/sheen + the off-ladder drop shadow), and
// the inline STATIC row whose trailing CONTROL (a toggle) is its own focusable target.
// The row recipe itself lives in the NockerlListItem primitive (NOCKERL_LIST_ITEM_STYLES).
const STYLES = `
.nk-li-demo { font-family: var(--font-family-sans); }
/* The containing CARD is where depth lives (card radius, lit from above). Bg / hairline /
   radius / sheen come from the NockerlSurface primitive; only overflow + max-width + the off-ladder drop shadow stay. */
.nk-li-card {
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen);
  overflow: hidden;
  max-width: 460px;
}
/* a row that carries its own trailing control (the NockerlSwitch primitive) is NOT itself a button */
.nk-li-static { cursor: default; }
.nk-li-static:hover { background: transparent; }
.nk-li-static:active { background: transparent; transform: none; }
.nk-li-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-li-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-li-demo__count b { color: var(--color-accent-primary); }
`;

/**
 * The interactive showcase mounted on the List item page: a list of rows on ONE
 * card surface (the card carries the depth, so the rows are flat), covering a
 * leading status mark, primary + secondary text, a trailing value / nav chevron,
 * single-select with a LEADING cyan check + soft wash (NOT a glow), a disabled row,
 * a second card whose last row carries a real trailing CONTROL (a toggle), and a
 * third COLLAPSIBLE messages card whose rows expand to reveal a message body, with
 * the trailing chevron rotating down-to-up while the body reveals flash-free.
 */
export default function ListItemDemo() {
  const [selected, setSelected] = useState('s2');
  const [pushOn, setPushOn] = useState(true);
  // Collapsible messages list: one row open at a time (null = all collapsed). Tap a
  // row to reveal its message body; the trailing chevron rotates down -> up.
  const [openMsg, setOpenMsg] = useState<string | null>('m1');
  const toggleMsg = (id: string) => setOpenMsg((cur) => (cur === id ? null : id));

  return (
    <div className="nk-li-demo">
      <style>{STYLES}</style>

      <p className="nk-li-demo__lbl">Sessions: tab / click a row to select (one cyan indicator)</p>
      <NockerlSurface className="nk-li-card" role="listbox" aria-label="Sessions">
        <NockerlListItem
          primary="nockerl-design · docs site"
          secondary="Streaming · 2 tools running"
          status="info"
          value="now"
          chevron
          selected={selected === 's1'}
          onSelect={() => setSelected('s1')}
        />
        <NockerlListItem
          primary="api-server · gateway refactor"
          secondary="Idle · last active 12m ago"
          status="success"
          value="12m"
          chevron
          selected={selected === 's2'}
          onSelect={() => setSelected('s2')}
        />
        <NockerlListItem
          primary="credential-store · allowlist audit"
          secondary="Needs attention · approval required"
          status="warning"
          value="1h"
          chevron
          selected={selected === 's3'}
          onSelect={() => setSelected('s3')}
        />
        <NockerlListItem
          primary="dueydo · failed deploy"
          secondary="Error · build exited 1"
          status="error"
          value="3h"
          chevron
          selected={selected === 's4'}
          onSelect={() => setSelected('s4')}
        />
      </NockerlSurface>

      <p className="nk-li-demo__lbl" style={{ marginTop: 'var(--space-5)' }}>
        Settings: value rows, a disabled row, and a trailing control (toggle = its own target)
      </p>
      <NockerlSurface className="nk-li-card">
        <NockerlListItem primary="Theme" secondary="Matches the system appearance" value="System" chevron />
        <NockerlListItem primary="Default model" value="Large 2.0" chevron />
        <NockerlListItem
          primary="Workspace"
          secondary="Locked by your administrator"
          value="dizyx"
          chevron
          disabled
        />
        {/* This row carries a real trailing CONTROL, so the row itself is static
            text and the toggle is the separate focusable target. */}
        <div className="nk-li nk-li-static">
          <span className="nk-li__lead" aria-hidden="true" />
          <span className="nk-li__text">
            <span className="nk-li__primary">Push notifications</span>
            <span className="nk-li__secondary">Alerts when a session needs you</span>
          </span>
          <span className="nk-li__trail">
            <NockerlSwitch
              checked={pushOn}
              onChange={(next) => setPushOn(next)}
              ariaLabel="Push notifications"
              size="sm"
            />
          </span>
        </div>
      </NockerlSurface>

      <p className="nk-li-demo__lbl" style={{ marginTop: 'var(--space-5)' }}>
        Messages: tap a row to expand (chevron rotates down, then up); tap again to collapse
      </p>
      <NockerlSurface className="nk-li-card" role="list" aria-label="Messages">
        <NockerlListItem
          primary="nockerl-design · primary"
          secondary="Tap to read the latest message"
          status="info"
          value="now"
          expandable
          expanded={openMsg === 'm1'}
          onToggle={() => toggleMsg('m1')}
          details="Accordion variant shipped. The trailing chevron now rotates down-to-up and the body reveals via an interpolated grid-row track, not a display swap. Selection moved to the leading slot."
        />
        <NockerlListItem
          primary="credential-store · allowlist audit"
          secondary="Approval required before push"
          status="warning"
          value="1h"
          expandable
          expanded={openMsg === 'm2'}
          onToggle={() => toggleMsg('m2')}
          details="A push to main is queued behind your sign-off. Warm tones read as status only; the leading mark stays a status color and never borrows the brand cyan."
        />
        <NockerlListItem
          primary="dueydo · failed deploy"
          secondary="Build exited 1 · logs attached"
          status="error"
          value="3h"
          expandable
          expanded={openMsg === 'm3'}
          onToggle={() => toggleMsg('m3')}
          details="The Docker build failed at the typecheck step. Expand to read the tail of the log; collapse to keep the list dense. Reduced-motion drops the height transition."
        />
      </NockerlSurface>

      <p className="nk-li-demo__count">
        Selected session: <b>{selected}</b> · push notifications {pushOn ? 'on' : 'off'} ·
        open message: <b>{openMsg ?? 'none'}</b>. The island is live.
      </p>
    </div>
  );
}
