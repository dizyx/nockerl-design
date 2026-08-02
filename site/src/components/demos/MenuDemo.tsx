/**
 * MenuDemo: the live, interactive Nockerl DROPDOWN MENU island for web.
 *
 * The everyday CLICK-triggered popover: press a trigger button (a kebab/overflow
 * ⋯, an actions button) and a menu opens ANCHORED under/near it, holding menu items
 * (icon + label + optional ⌘-shortcut), separators, section labels, checkable /
 * radio items (checkmark), a nested submenu, and a destructive item. DISTINCT
 * from long-press-pop (press-and-hold ON content), command-palette (modal ⌘K
 * search), and combobox (type-to-filter select): this is a normal click/Enter on
 * a trigger, positioned by ANCHOR, no text filtering.
 *
 * Sourced from the REAL apps (read-only). Android `chat/ui/SessionChipsBar.kt` is
 * the canonical session-overflow `DropdownMenu`: DropdownMenuItem rows with a
 * leadingIcon + label (Rename · Edit provider/model · Fork · Clear context ·
 * Delete) where Delete is the destructive tail. `SessionCreationDropdowns.kt` has
 * the `ExposedDropdownMenuBox` anchored to a trigger with an ArrowDropDown. Voice
 * `UI/AppSettingsView.swift` has `NockerlMenu { NockerlButton { Label(name, systemImage:
 * "checkmark") } }` (the CHECKED-item idiom = a leading checkmark), and
 * `MenuBarContent.swift` has `NockerlDivider()` separators, a section caption, and
 * `.keyboardShortcut("d", modifiers: .command)` (the trailing ⌘-hint).
 * NockerlMenu-item row + destructive vocabulary reused from LongPressPopDemo (which used
 * a DropdownMenu); the kebab trigger mirrors IconButtonDemo's PLAIN icon button.
 *
 * The dropdown-menu ENGINE (the anchored surface, flip/clamp positioning,
 * focus-trap / roving keyboard, nested submenu, outside-click scrim, item-row
 * recipe) now lives in the `NockerlMenu` primitive; this island supplies the contained
 * stage, the showcase TRIGGERS, and the four sourced menus, and dogfoods `NockerlMenu`.
 *
 * Laws: DEPTH = neutral tinted shadow + top catch-light, NEVER a glow. The menu
 * is an elevated surface (card gradient + the neutral shadow token). flash-free:
 * fills static, only scale/opacity/transform animate the open; reduced-motion
 * FREEZES the open (appears in place). active/hover item = an accent-soft wash;
 * a CHECKED item's check + the SELECTED radio use the cyan accent; the
 * destructive item uses the danger token, divider-separated; ⌘-shortcut hints are
 * mono + muted. TOKEN-REACTIVE: every color/font/radius/spacing/type is a
 * `var(--token)`; literals remain only for pure geometry (icon px, blur, curves).
 */
import { useRef, useState } from 'react';
import { NockerlButton, NockerlIcon, NockerlIconButton, NockerlKbd, NockerlMenu, type MenuItem } from '@dizyx/nockerl-react';

const STYLES = `
.nk-mn-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
.nk-mn-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-mn-demo__hint { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin: var(--space-1) 0 var(--space-3); }
/* key hints in the caption are now the shared NockerlKbd primitive (self-styled raised keycap). */
.nk-mn-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-mn-demo__count b { color: var(--color-accent-primary); }
/* The contained STAGE: every menu opens INSIDE here, clamped to it (never the page).
   Shared panel chrome lives in the 'nk-demo-overlay-stage' utility (theme.css); only this
   demo's footprint (max-width / min-height) stays here. */
.nk-mn-stage { max-width: 520px; min-height: 320px; }
/* a faux toolbar holding the triggers, corners pinned so anchoring is varied. */
.nk-mn-bar { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); padding: var(--space-4); min-height: 320px; }
.nk-mn-bar__col { display: flex; flex-direction: column; gap: var(--space-3); align-items: flex-start; }
.nk-mn-bar__col--end { align-items: flex-end; }
.nk-mn-bar__cap { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); }
/* the LABELLED triggers (Actions / View) are now the real NockerlButton primitive (secondary
   idiom): text + a trailing chevron riding NockerlButton's trailingIcon slot; NockerlButton owns the
   resting / hover / press / focus recipe. The kebab overflow trigger is the PLAIN
   NockerlIconButton primitive. Only two OPEN affordances stay demo-scoped, keyed on
   aria-expanded (a menu trigger uses expanded, not pressed): the trailing chevron
   rotates 180deg while the menu is open, and the kebab wears the selection wash. */
.nk-mn-demo .nk-btn[aria-haspopup="menu"] .nk-btn__icon:last-child { transition: transform .14s cubic-bezier(.2,0,0,1); }
.nk-mn-demo .nk-btn[aria-haspopup="menu"][aria-expanded="true"] .nk-btn__icon:last-child { transform: rotate(180deg); }
.nk-mn-demo .nk-ico[aria-expanded="true"] { background: var(--color-accent-primary-soft); color: var(--color-accent-primary); }
@media (prefers-reduced-motion: reduce) {
  .nk-mn-demo .nk-btn[aria-haspopup="menu"] .nk-btn__icon:last-child { transition: none; }
}
`;

// ─── Inline stroke glyphs (currentColor so each slot tints from its token) ─────
// IconKebab stays a bespoke FILLED svg (fill=currentColor, dot circles), NOT a stroke
// glyph, so the shared <NockerlIcon> (stroke shell) can't express it; left inline by design.
const IconKebab = (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
    <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
  </svg>
);
const IconChevD = <NockerlIcon path="m6 9 6 6 6-6" />;
const IconEdit = <NockerlIcon><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></NockerlIcon>;
const IconSettings = <NockerlIcon><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></NockerlIcon>;
const IconFork = <NockerlIcon><path d="M6 3v12" /><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M18 9a9 9 0 0 1-9 9" /></NockerlIcon>;
const IconClear = <NockerlIcon><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></NockerlIcon>;
const IconTrash = <NockerlIcon><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" /></NockerlIcon>;
const IconCopy = <NockerlIcon><path d="M11 9h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></NockerlIcon>;
const IconShare = <NockerlIcon><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" /></NockerlIcon>;
const IconRename = <NockerlIcon><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></NockerlIcon>;
const IconBell = <NockerlIcon><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></NockerlIcon>;
const IconWrap = <NockerlIcon><path d="M4 6h16" /><path d="M4 12h12a3 3 0 0 1 0 6h-3" /><path d="M16 21l-3-3 3-3" /></NockerlIcon>;
const IconStar = <NockerlIcon path="M12 2l2.9 6.3 6.6.6-5 4.4 1.5 6.5L12 17l-5.9 3.3L7.6 14l-5-4.4 6.6-.6L12 2Z" />;

// ─── The five menus shown (sourced from the real session-overflow + settings menus) ──
const KEBAB_MENU: MenuItem[] = [
  { id: 'rename', label: 'Rename', icon: IconRename, shortcut: '⌘R' },
  { id: 'edit', label: 'Edit provider / model', icon: IconSettings },
  { id: 'fork', label: 'Fork', icon: IconFork },
  { id: 'clear', label: 'Clear context', icon: IconClear, shortcut: '⌘K' },
  { id: 'delete', label: 'Delete', icon: IconTrash, danger: true, dividerAbove: true },
];

const ACTIONS_MENU: MenuItem[] = [
  { id: 'copy', label: 'Copy', icon: IconCopy, shortcut: '⌘C' },
  { id: 'rename2', label: 'Rename', icon: IconEdit, shortcut: '⌘R' },
  { id: 'share', label: 'Share', icon: IconShare, shortcut: '⇧⌘S' },
  {
    id: 'export', label: 'Export as', icon: IconFork, sectionAbove: 'Convert',
    submenu: [
      { id: 'md', label: 'Markdown (.md)' },
      { id: 'json', label: 'JSON (.json)' },
      { id: 'txt', label: 'Plain text (.txt)' },
    ],
  },
  { id: 'delete2', label: 'Delete', icon: IconTrash, danger: true, dividerAbove: true },
];

const VIEW_MENU: MenuItem[] = [
  { id: 'wrap', label: 'Wrap lines', icon: IconWrap, kind: 'checkbox', sectionAbove: 'View' },
  { id: 'bell', label: 'Notify on done', icon: IconBell, kind: 'checkbox' },
  { id: 'star', label: 'Pin to top', icon: IconStar, kind: 'checkbox' },
  { id: 'sort-recent', label: 'Recent first', kind: 'radio', group: 'sort', sectionAbove: 'Sort by', dividerAbove: true },
  { id: 'sort-name', label: 'Name', kind: 'radio', group: 'sort' },
  { id: 'sort-status', label: 'Status', kind: 'radio', group: 'sort' },
];

/**
 * The interactive showcase mounted on the NockerlMenu page: a contained stage with four
 * CLICK triggers: a kebab ⋯ session-overflow menu (icons + ⌘-shortcuts + a
 * destructive Delete), an "Actions" menu with a nested Export submenu, and a
 * "View" menu with checkable items + a radio group. Menus anchor under their
 * trigger and flip/clamp to stay inside the stage. Fully keyboard-operable:
 * Enter/Space/↓ opens, ↑/↓ moves, →/← opens/closes the submenu, Enter activates,
 * Esc closes and restores focus, Home/End jump. Token-driven; the open freezes
 * under prefers-reduced-motion.
 */
export default function MenuDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [checks, setChecks] = useState<Record<string, boolean>>({ wrap: true, bell: false, star: false });
  const [radio, setRadio] = useState('sort-recent');
  const [last, setLast] = useState('none yet');

  return (
    <div className="nk-mn-demo">
      <style>{STYLES}</style>
      <p className="nk-mn-demo__lbl">Click a trigger to drop its menu, anchored and clamped to the stage</p>
      <p className="nk-mn-demo__hint">
        Open with a click or <NockerlKbd>Enter</NockerlKbd> / <NockerlKbd>Space</NockerlKbd> / <NockerlKbd>↓</NockerlKbd>. In the menu:{' '}
        <NockerlKbd>↑</NockerlKbd> <NockerlKbd>↓</NockerlKbd> move, <NockerlKbd>→</NockerlKbd> opens a submenu, <NockerlKbd>←</NockerlKbd> /{' '}
        <NockerlKbd>Esc</NockerlKbd> back, <NockerlKbd>Enter</NockerlKbd> runs.
      </p>

      <div className="nk-mn-stage nk-demo-overlay-stage" ref={stageRef}>
        {/* the dropdown-menu engine, anchored under its trigger and flipped/clamped inside
            the stage. The TRIGGERS (demo-owned scaffolding) are authored here as the
            render child so they re-render with the menu's open/close state. */}
        <NockerlMenu
          stageRef={stageRef}
          triggerRefs={triggerRefs}
          checks={checks}
          radio={radio}
          setChecks={setChecks}
          setRadio={setRadio}
          setLast={setLast}
        >
          {(menu) => (
            <div className="nk-mn-bar">
              <div className="nk-mn-bar__col">
                <span className="nk-mn-bar__cap">Session · gateway-refactor</span>
                <NockerlButton
                  text="Actions"
                  variant="secondary"
                  trailingIcon={IconChevD}
                  aria-haspopup="menu"
                  aria-expanded={menu.openTrigger === 'actions'}
                  ref={(el) => { triggerRefs.current['actions'] = el; }}
                  onClick={(e) => menu.toggle('actions', ACTIONS_MENU, e)}
                  onKeyDown={menu.triggerKey('actions', ACTIONS_MENU)}
                />
                <NockerlButton
                  text="View"
                  variant="secondary"
                  trailingIcon={IconChevD}
                  aria-haspopup="menu"
                  aria-expanded={menu.openTrigger === 'view'}
                  ref={(el) => { triggerRefs.current['view'] = el; }}
                  onClick={(e) => menu.toggle('view', VIEW_MENU, e)}
                  onKeyDown={menu.triggerKey('view', VIEW_MENU)}
                />
              </div>

              <div className="nk-mn-bar__col nk-mn-bar__col--end">
                <span className="nk-mn-bar__cap">Overflow</span>
                {/* the kebab TRIGGER is a real NockerlIconButton (PLAIN). It forwards the ref (for
                    anchoring), aria-haspopup / aria-expanded, onClick(e) (to anchor to
                    e.currentTarget) and onKeyDown straight through to its <button>. */}
                <NockerlIconButton
                  icon={IconKebab}
                  label="Session actions"
                  variant="plain"
                  aria-haspopup="menu"
                  aria-expanded={menu.openTrigger === 'kebab'}
                  ref={(el) => { triggerRefs.current['kebab'] = el; }}
                  onClick={(e) => menu.toggle('kebab', KEBAB_MENU, e)}
                  onKeyDown={menu.triggerKey('kebab', KEBAB_MENU)}
                />
              </div>
            </div>
          )}
        </NockerlMenu>
      </div>

      <p className="nk-mn-demo__count">
        Last action: <b>{last}</b> · wrap {checks.wrap ? 'on' : 'off'} · sort {radio.replace('sort-', '')}. Pointer + keyboard both work; the island is live.
      </p>
    </div>
  );
}
