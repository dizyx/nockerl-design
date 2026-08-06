/**
 * ToolbarDemo: the live, interactive Nockerl TOOLBAR island for the web.
 *
 * The generic ACTION strip: a row (or column) of grouped controls (icon
 * buttons, labelled buttons, toggle buttons, separators, and an overflow ⋯ menu).
 * A formatting toolbar, an editor command bar, a contextual/selection action bar.
 *
 * DISTINCT from its neighbours (the whole reason it exists):
 *   • NOT `top-bar`: this is not the app's global header chrome / title bar; it
 *     is a reusable strip of *actions* you drop above an editor, over a selection,
 *     or beside content. No app title, no nav, no back button.
 *   • NOT `menu` / `segmented-control` / `icon-button`: it COMPOSES them. It
 *     reuses the icon-button glyph idiom, the divider hairline as a separator, the
 *     segmented active outline for toggles, and the menu for overflow, all
 *     wired together under the WAI-ARIA `toolbar` roving-focus pattern.
 *
 * Sourced from the shipped apps, never the web dashboard:
 *   • Android `chat/ui/ChatInputBar.kt` gives the composer ACTION ROW: a `Row` of
 *     grouped controls (attach icon button · field · send/stop) on the
 *     `chromeSurface` plane, `Alignment.CenterVertically`, an overflow
 *     `DropdownMenu` off the attach button; `core/ui/NockerlIconButton.kt` PLAIN
 *     (12px-control tappable glyph) is the toolbar action unit;
 *     `core/ui/NockerlSegmented.kt` defines the ACTIVE segment = soft-cyan wash +
 *     cyan medium label (the toggle-pressed look reused here).
 *   • Voice `UI/RecordingHUD.swift` gives the command-bar pill: an `HStack` with a
 *     fixed brand anchor, a vertical `Rectangle().fill(NockerlTheme.divider)
 *     .frame(width: 1, height: 22)` SEPARATOR between groups, controls on
 *     `chromeSurface`; `UI/MenuBarContent.swift` adds `NockerlButton` rows + `NockerlDivider()` +
 *     `.keyboardShortcut(...)` (the overflow vocabulary).
 *
 * Laws, verbatim: the toolbar SURFACE is chrome (chromeSurface gradient + a
 * neutral drop shadow + top catch-light, lit from above, never a glow); a
 * SEPARATOR is a crisp full-height divider hairline; a PRESSED toggle reads via
 * the soft-cyan wash + a cyan glyph (selection signal only, never a fill swap or
 * halo); 12px control radius (never a stadium); feedback animates
 * brightness/transform/shadow only. Focus is an OUTLINE. A real toolbar: ONE tab
 * stop (roving tabindex), Arrow keys move focus across controls (Left/Right
 * horizontal, Up/Down vertical), Home/End jump, toggles use aria-pressed, the
 * overflow opens a menu, every icon-only control carries an aria-label.
 * prefers-reduced-motion: transitions drop / the menu appears in place.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md); literals remain only for pure
 * geometry (icon px, hairline thickness, transition curves).
 */
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { useCallback, useRef, useState } from 'react';
import { NockerlButton, NockerlCheckbox, NockerlDivider, NockerlIcon, NockerlIconButton, NockerlMenu, type ComposeContract, type MenuItem } from '@dizyx/nockerl-react';

// ─── Stroke glyphs via the shared NockerlIcon primitive (currentColor tints from each slot's token) ────
const IconBold = <NockerlIcon path="M6 4h7a4 4 0 0 1 0 8H6zM6 12h8a4 4 0 0 1 0 8H6z" />;
const IconItalic = <NockerlIcon path="M19 4h-9M14 20H5M15 4 9 20" />;
const IconUnderline = <NockerlIcon path="M6 4v6a6 6 0 0 0 12 0V4M4 21h16" />;
const IconStrike = <NockerlIcon path="M5 12h14M16 7a4 4 0 0 0-8 0M8 17a4 4 0 0 0 8 0" />;
const IconCode = <NockerlIcon path="m16 18 6-6-6-6M8 6l-6 6 6 6" />;
const IconLink = <NockerlIcon><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></NockerlIcon>;
const IconList = <NockerlIcon path="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />;
const IconQuote = <NockerlIcon path="M3 21c3 0 7-1 7-8V5H3v8h4M14 21c3 0 7-1 7-8V5h-7v8h4" />;
const IconImage = <NockerlIcon path="M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6" />;
const IconUndo = <NockerlIcon path="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />;
const IconTrash = <NockerlIcon path="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" />;
const IconArchive = <NockerlIcon path="M3 4h18v4H3zM5 8v12h14V8M9 12h6" />;
const IconShare = <NockerlIcon path="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />;
const IconClose = <NockerlIcon path="M18 6 6 18M6 6l12 12" />;
const IconPlus = <NockerlIcon path="M12 5v14M5 12h14" />;
const IconFilter = <NockerlIcon path="M3 5h18l-7 8v5l-4 2v-7z" />;
// FILLED glyph: kept inline (the NockerlIcon primitive is stroke-only; fill+no-stroke can't be expressed via props).
const IconKebab = (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5h.01" /><path d="M12 12h.01" /><path d="M12 19h.01" />
  </svg>
);
const IconTag = <NockerlIcon path="M20 12 12 20l-8-8V4h8zM7.5 7.5h.01" />;
const IconCopy = <NockerlIcon><path d="M11 9h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></NockerlIcon>;
// alignment glyphs (the 4-way set), keyed so the segmented alignment group maps cleanly
const ALIGN_ICON = {
  left: <NockerlIcon path="M3 6h18M3 12h12M3 18h15" />, center: <NockerlIcon path="M3 6h18M6 12h12M5 18h14" />,
  right: <NockerlIcon path="M3 6h18M9 12h12M6 18h15" />, justify: <NockerlIcon path="M3 6h18M3 12h18M3 18h18" />,
};

const STYLES = `
.nk-tb-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
.nk-tb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-tb-demo__group + .nk-tb-demo__group { margin-top: var(--space-6); }
.nk-tb-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-6); }
.nk-tb-demo__count b { color: var(--color-accent-primary); }
.nk-tb-demo__split { display: flex; gap: var(--space-6); flex-wrap: wrap; align-items: flex-start; }
.nk-tb-demo__toggle { display: inline-flex; gap: var(--space-2); align-items: center; cursor: pointer; margin-top: var(--space-3); }

/* ── The TOOLBAR surface: chrome, lit from above (neutral shadow + catch-light,
   never a glow). A rounded-rect control surface, NOT the app header. ───────── */
.nk-tb {
  position: relative; display: inline-flex; align-items: center; gap: var(--space-1);
  background: linear-gradient(180deg, var(--color-chrome-surface), color-mix(in srgb, var(--color-chrome-surface) 88%, var(--color-shadow-tint)));
  border: var(--space-px) solid var(--color-chrome-hairline);
  border-radius: var(--radius-control); padding: var(--space-1);
  box-shadow: 0 var(--space-px) var(--space-1) 0 color-mix(in srgb, var(--color-shadow-tint) 40%, transparent), 0 var(--space-1) var(--space-4) calc(-1 * var(--space-1)) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight);
  max-width: 100%;
}
.nk-tb--wrap { flex-wrap: wrap; }
.nk-tb--full { display: flex; width: 100%; }
.nk-tb--vertical { flex-direction: column; align-items: stretch; width: max-content; }
.nk-tb__spacer { flex: 1 1 auto; }   /* pushes the trailing group (overflow) to the end */

/* a GROUP: controls that belong together, evenly gapped, separators between groups. */
.nk-tb__group { display: inline-flex; align-items: center; gap: var(--space-0-5); }
.nk-tb--vertical .nk-tb__group { flex-direction: column; align-items: stretch; }

/* SEPARATORS between groups are the NockerlDivider primitive (orientation="vertical" on a
   horizontal strip, "horizontal" on a vertical one), the crisp full-height hairline
   the apps ship. The BUTTONS / TOGGLES are the NockerlButton + NockerlIconButton primitives
   (pressed = the cyan selection ring + cyan glyph, no fill). Both now OWN their own CSS; the toolbar
   only styles its SURFACE + LAYOUT below (see .nk-tb / .nk-tb__group / the overflow). */

/* the contextual / SELECTION action bar: the same chrome surface, tinted by a
   leading count badge + a leading cyan accent rail (a shape, not a halo). */
.nk-tb--selection { gap: var(--space-2); padding-inline: var(--space-2); }
.nk-tb__count { box-sizing: border-box; height: var(--space-8); display: inline-flex; align-items: center; gap: var(--space-2); padding-left: var(--space-1); font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); line-height: 1; color: var(--color-on-chrome); }
.nk-tb__count b { color: var(--color-accent-primary); font-variant-numeric: tabular-nums; }
.nk-tb__count-dot { width: var(--space-2); height: var(--space-2); border-radius: var(--radius-pill); background: var(--color-accent-primary); flex: 0 0 auto; }

/* the OVERFLOW ⋯ menu is now the real NockerlMenu primitive (it owns the anchored surface,
   the flip/clamp positioning, the outside-click scrim, the item-row recipe, and the
   focus-trap / roving keyboard). The former hand-rolled .nk-tb__menu / .nk-tb__mitem*
   / .nk-tb__scrim chrome was deleted when NockerlMenu was composed in; the toolbar keeps only
   its SURFACE + LAYOUT rules above. The kebab TRIGGER stays the PLAIN NockerlIconButton. */

/* the responsive WIDTH frame clamps the toolbar so extra items collapse. */
.nk-tb-frame { background: var(--color-canvas-alt); border: var(--space-px) dashed var(--color-card-hairline); border-radius: var(--radius-card); padding: var(--space-3); transition: max-width .3s cubic-bezier(.2,0,0,1); }

@media (prefers-reduced-motion: reduce) {
  .nk-tb-frame { transition: none; }
}
`;
// ─── Toolbar plumbing (the container SLOTS the real primitives) ──────────────────
type Orientation = 'horizontal' | 'vertical';   // layout axis → which arrow keys move focus
type OverItem = { id: string; label: string; icon: ReactNode; danger?: boolean; checked?: boolean };   // an overflow-menu action

// Sizes a slotted NockerlIconButton to the toolbar row height, matching the labelled NockerlButton
// (size="sm", height var(--space-8)). NockerlIconButton.size is a numeric px prop (it can't take a
// CSS var), so this mirrors the --space-8 token value as pure geometry (32px == var(--space-8)).
const TB_ICON_SIZE = 32;
const TB_DANGER: CSSProperties = { color: 'var(--color-status-error)' };   // destructive glyph tint (NockerlIconButton has no danger idiom → per-instance token)

/**
 * Roving plumbing handed to EACH slotted primitive: it registers its DOM node with the
 * container (ref callback → reg), is the sole tab stop when tab === idx, and forwards
 * Arrow/Home/End to the container's focus manager (onKeyDown → onKey). NockerlButton + NockerlIconButton
 * both spread these native attrs straight to their <button> and forward the ref.
 */
interface RovingProps {
  idx: number; tab: number; reg: (i: number, el: HTMLButtonElement | null) => void; onKey: (e: React.KeyboardEvent, i: number) => void;
}

/**
 * The toolbar shell: `role="toolbar"`, ONE tab stop (roving tabindex), Arrow keys
 * move focus across enabled controls (Left/Right or Up/Down), Home/End jump. A
 * render-prop hands each control its roving plumbing.
 */
type RoveProps = { reg: RovingProps['reg']; onKey: RovingProps['onKey']; tab: number; stageRef: RefObject<HTMLDivElement | null> };
function Toolbar(
  { label, orientation = 'horizontal', className = '', children }:
  { label: string; orientation?: Orientation; className?: string; children: (p: RoveProps) => ReactNode },
) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // the toolbar's own box is the STAGE an Overflow menu anchors + clamps to (NockerlMenu.stageRef).
  const stageRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);
  const reg = useCallback<RovingProps['reg']>((i, el) => { refs.current[i] = el; }, []);

  const enabled = () => refs.current.map((el, i) => (el && !el.disabled ? i : -1)).filter((i) => i >= 0);
  const focusAt = (i: number) => { refs.current[i]?.focus(); setTab(i); };
  const onKey = useCallback<RovingProps['onKey']>((e, i) => {
    const list = enabled();
    if (list.length === 0) return;
    const fwd = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    const back = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    const pos = list.indexOf(i);
    const seed = pos >= 0 ? pos : 0;
    if (e.key === fwd) { e.preventDefault(); focusAt(list[(seed + 1) % list.length]!); }
    else if (e.key === back) { e.preventDefault(); focusAt(list[(seed - 1 + list.length) % list.length]!); }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(list[0]!); }
    else if (e.key === 'End') { e.preventDefault(); focusAt(list[list.length - 1]!); }
  }, [orientation]);

  return (
    <div
      ref={stageRef}
      role="toolbar" aria-label={label} aria-orientation={orientation}
      className={['nk-tb', orientation === 'vertical' ? 'nk-tb--vertical' : '', className].filter(Boolean).join(' ')}
    >
      {children({ reg, onKey, tab, stageRef })}
    </div>
  );
}

// An OverItem carries its checked state inline (checked !== undefined => a checkbox row).
// The NockerlMenu primitive instead reads checked state from a `checks` map, so we split each
// OverItem into a MenuItem (shape only) + seed the checks map from the checkbox items.
const toMenuItems = (items: OverItem[]): MenuItem[] =>
  items.map((it) => (
    it.checked === undefined
      ? { id: it.id, label: it.label, icon: it.icon, danger: it.danger }
      : { id: it.id, label: it.label, icon: it.icon, kind: 'checkbox' }
  ));

// ─── An overflow ⋯ control that opens the real NockerlMenu primitive ───────────────────
// The kebab TRIGGER is the PLAIN NockerlIconButton, wired to BOTH the toolbar roving model
// (reg / tabIndex / Arrow-Home-End via onKey) AND the NockerlMenu trigger api (open on
// Enter/Space/↓, aria-expanded). The NockerlMenu owns the anchored surface, the scrim, the
// item rows, and the focus-trap keyboard, anchored + clamped to the toolbar `stageRef`.
// `checks` / `setChecks` drive the one checkable item (Inline code); `setLast` records
// the picked/toggled action for the readout (NockerlMenu passes the item LABEL).
function Overflow(
  { idx, tab, reg, onKey, stageRef, items, title = 'More actions', checks = {}, setChecks, setLast }:
  RovingProps & {
    stageRef: RoveProps['stageRef']; items: OverItem[]; title?: string;
    checks?: Record<string, boolean>; setChecks?: (updater: (c: Record<string, boolean>) => Record<string, boolean>) => void;
    setLast: (label: string) => void;
  },
) {
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const menuItems = toMenuItems(items);

  return (
    <NockerlMenu
      stageRef={stageRef}
      triggerRefs={triggerRefs}
      checks={checks}
      radio=""
      setChecks={setChecks ?? (() => {})}
      setRadio={() => {}}
      setLast={setLast}
    >
      {(menu) => (
        <NockerlIconButton
          variant="plain" size={TB_ICON_SIZE} icon={IconKebab} label={title} title={title}
          ref={(el) => { reg(idx, el); triggerRefs.current['over'] = el; }}
          tabIndex={tab === idx ? 0 : -1}
          aria-haspopup="menu" aria-expanded={menu.openTrigger === 'over'}
          onClick={(e) => menu.toggle('over', menuItems, e)}
          onKeyDown={(e) => {
            // NockerlMenu opens on Enter/Space/↓ (and marks the event handled); otherwise the
            // toolbar's roving takes the key (Arrow across, Home/End jump).
            menu.triggerKey('over', menuItems)(e);
            if (!e.defaultPrevented) onKey(e, idx);
          }}
        />
      )}
    </NockerlMenu>
  );
}

// ─── The showcase ──────────────────────────────────────────────────────────────
const ALIGN = ['left', 'center', 'right', 'justify'] as const;
// Overflow item lists for the responsive editor: wide hides one action; narrow folds many.
const OVER_WIDE: OverItem[] = [{ id: 'Insert image', label: 'Insert image', icon: IconImage }];
const OVER_NARROW: OverItem[] = [
  { id: 'Underline', label: 'Underline', icon: IconUnderline }, { id: 'List', label: 'List', icon: IconList },
  { id: 'Quote', label: 'Quote', icon: IconQuote }, { id: 'Insert image', label: 'Insert image', icon: IconImage },
];

// Toolbar is a control-strip CONTAINER: its default slot holds the grouped controls (the render-prop
// slots the real primitives). It composes NockerlButton + NockerlIconButton (actions/toggles) + NockerlDivider
// (separators), and the overflow ⋯ now composes the real NockerlMenu primitive (anchored surface + scrim +
// item rows + focus-trap keyboard, clamped to the toolbar stage). No owns.
// The accepts list declares every real primitive the toolbar slots; 'NockerlMenu' is included
// for the overflow ⋯ (added in the re-verify; the compose graph is regenerated to match).
export const compose = {
  slots: { default: { accepts: ['NockerlButton', 'NockerlIconButton', 'NockerlSegmentedControl', 'NockerlDivider', 'NockerlMenu'] } },
} satisfies ComposeContract;

export default function ToolbarDemo() {
  const [marks, setMarks] = useState({ bold: true, italic: false, underline: false, strike: false, code: false });
  const [align, setAlign] = useState<(typeof ALIGN)[number]>('left');
  const [wrap, setWrap] = useState(true);
  const [selected, setSelected] = useState(3);
  const [narrow, setNarrow] = useState(false);
  const [last, setLast] = useState('none');
  const flip = (k: keyof typeof marks) => setMarks((m) => ({ ...m, [k]: !m[k] }));

  return (
    <div className="nk-tb-demo">
      <style>{STYLES}</style>

      {/* 1. FORMATTING toolbar: toggle groups + separators + alignment + overflow */}
      <div className="nk-tb-demo__group">
        <p className="nk-tb-demo__lbl">Formatting: toggles stay pressed · Tab in, Arrow keys move, the ⋯ overflows</p>
        <Toolbar label="Text formatting">
          {(p) => (
              <>
                <span className="nk-tb__group">
                  <NockerlIconButton size={TB_ICON_SIZE} icon={IconBold} label="Bold" pressed={marks.bold} ref={(el) => p.reg(0, el)} tabIndex={p.tab === 0 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 0)} onClick={() => flip('bold')} />
                  <NockerlIconButton size={TB_ICON_SIZE} icon={IconItalic} label="Italic" pressed={marks.italic} ref={(el) => p.reg(1, el)} tabIndex={p.tab === 1 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 1)} onClick={() => flip('italic')} />
                  <NockerlIconButton size={TB_ICON_SIZE} icon={IconUnderline} label="Underline" pressed={marks.underline} ref={(el) => p.reg(2, el)} tabIndex={p.tab === 2 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 2)} onClick={() => flip('underline')} />
                  <NockerlIconButton size={TB_ICON_SIZE} icon={IconStrike} label="Strikethrough" pressed={marks.strike} ref={(el) => p.reg(3, el)} tabIndex={p.tab === 3 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 3)} onClick={() => flip('strike')} />
                </span>
                <NockerlDivider orientation="vertical" />
                <span className="nk-tb__group" role="group" aria-label="Alignment">
                  {ALIGN.map((a, i) => (
                    <NockerlIconButton key={a} size={TB_ICON_SIZE} icon={ALIGN_ICON[a]} label={`Align ${a}`} pressed={align === a} ref={(el) => p.reg(4 + i, el)} tabIndex={p.tab === 4 + i ? 0 : -1} onKeyDown={(e) => p.onKey(e, 4 + i)} onClick={() => setAlign(a)} />
                  ))}
                </span>
                <NockerlDivider orientation="vertical" />
                <span className="nk-tb__group">
                  <NockerlIconButton size={TB_ICON_SIZE} icon={IconList} label="List" ref={(el) => p.reg(8, el)} tabIndex={p.tab === 8 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 8)} onClick={() => setLast('List')} />
                  <NockerlIconButton size={TB_ICON_SIZE} icon={IconLink} label="Insert link" ref={(el) => p.reg(9, el)} tabIndex={p.tab === 9 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 9)} onClick={() => setLast('NockerlLink')} />
                </span>
                <NockerlDivider orientation="vertical" />
                <Overflow {...p} idx={10} setLast={setLast}
                  checks={{ code: marks.code }}
                  setChecks={(u) => setMarks((m) => ({ ...m, code: u({ code: m.code }).code }))}
                  items={[
                    { id: 'code', label: 'Inline code', icon: IconCode, checked: marks.code },
                    { id: 'Quote', label: 'Block quote', icon: IconQuote },
                    { id: 'Image', label: 'Insert image', icon: IconImage },
                  ]} />
              </>
          )}
        </Toolbar>
      </div>

      {/* 2. CONTEXTUAL / SELECTION action bar */}
      <div className="nk-tb-demo__group">
        <p className="nk-tb-demo__lbl">Contextual: a selection action bar (count · actions · close)</p>
        <Toolbar label="Selection actions" className="nk-tb--selection">
          {(p) => (
              <>
                <span className="nk-tb__count"><span className="nk-tb__count-dot" aria-hidden="true" /><b>{selected}</b> selected</span>
                <NockerlDivider orientation="vertical" />
                <span className="nk-tb__group">
                  <NockerlIconButton size={TB_ICON_SIZE} icon={IconArchive} label="Archive" ref={(el) => p.reg(0, el)} tabIndex={p.tab === 0 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 0)} onClick={() => setLast(`Archived ${selected}`)} />
                  <NockerlIconButton size={TB_ICON_SIZE} icon={IconTag} label="Tag" ref={(el) => p.reg(1, el)} tabIndex={p.tab === 1 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 1)} onClick={() => setLast('Tagged')} />
                  <NockerlIconButton size={TB_ICON_SIZE} icon={IconShare} label="Share" ref={(el) => p.reg(2, el)} tabIndex={p.tab === 2 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 2)} onClick={() => setLast('Shared')} />
                  <NockerlIconButton size={TB_ICON_SIZE} icon={IconTrash} label="Delete" style={TB_DANGER} ref={(el) => p.reg(3, el)} tabIndex={p.tab === 3 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 3)} onClick={() => setLast(`Deleted ${selected}`)} />
                </span>
                <span className="nk-tb__spacer" />
                <Overflow {...p} idx={4} title="More" setLast={setLast}
                  items={[
                    { id: 'Copy links', label: 'Copy links', icon: IconCopy },
                    { id: 'Add to…', label: 'Add to…', icon: IconPlus },
                  ]} />
                <NockerlIconButton size={TB_ICON_SIZE} icon={IconClose} label="Clear selection" ref={(el) => p.reg(5, el)} tabIndex={p.tab === 5 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 5)} onClick={() => setSelected(0)} />
              </>
          )}
        </Toolbar>
      </div>

      {/* 3. PRIMARY actions toolbar (labelled buttons + icon buttons + one primary) */}
      <div className="nk-tb-demo__group">
        <p className="nk-tb-demo__lbl">Primary actions: labelled buttons + icon buttons, one filled primary</p>
        <Toolbar label="Document actions">
          {(p) => (
              <>
                <span className="nk-tb__group">
                  <NockerlIconButton size={TB_ICON_SIZE} icon={IconUndo} label="Undo" ref={(el) => p.reg(0, el)} tabIndex={p.tab === 0 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 0)} onClick={() => setLast('Undo')} />
                  <NockerlIconButton size={TB_ICON_SIZE} icon={<NockerlIcon path="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" />} label="Redo" disabled ref={(el) => p.reg(1, el)} tabIndex={-1} onKeyDown={(e) => p.onKey(e, 1)} />
                </span>
                <NockerlDivider orientation="vertical" />
                <span className="nk-tb__group">
                  <NockerlButton size="sm" variant="ghost" leadingIcon={IconFilter} text="Filter" ref={(el) => p.reg(2, el)} tabIndex={p.tab === 2 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 2)} onClick={() => setLast('Filter')} />
                  <NockerlButton size="sm" variant="ghost" leadingIcon={IconShare} text="Share" ref={(el) => p.reg(3, el)} tabIndex={p.tab === 3 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 3)} onClick={() => setLast('Share')} />
                </span>
                <span className="nk-tb__spacer" />
                <NockerlButton size="sm" variant="primary" leadingIcon={IconPlus} text="New session" ref={(el) => p.reg(4, el)} tabIndex={p.tab === 4 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 4)} onClick={() => setLast('New session')} />
              </>
          )}
        </Toolbar>
      </div>

      {/* 4. RESPONSIVE: narrow the frame → the trailing group collapses into ⋯ */}
      <div className="nk-tb-demo__group">
        <p className="nk-tb-demo__lbl">Responsive: when space is tight, extra items fold into the overflow</p>
        <div className="nk-tb-frame" style={{ maxWidth: narrow ? '300px' : '560px' }}>
          <Toolbar label="Editor, responsive" className="nk-tb--full">
            {(p) => (
                <>
                  <span className="nk-tb__group">
                    <NockerlIconButton size={TB_ICON_SIZE} icon={IconBold} label="Bold" pressed={marks.bold} ref={(el) => p.reg(0, el)} tabIndex={p.tab === 0 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 0)} onClick={() => flip('bold')} />
                    <NockerlIconButton size={TB_ICON_SIZE} icon={IconItalic} label="Italic" pressed={marks.italic} ref={(el) => p.reg(1, el)} tabIndex={p.tab === 1 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 1)} onClick={() => flip('italic')} />
                    {!narrow && <NockerlIconButton size={TB_ICON_SIZE} icon={IconUnderline} label="Underline" pressed={marks.underline} ref={(el) => p.reg(2, el)} tabIndex={p.tab === 2 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 2)} onClick={() => flip('underline')} />}
                  </span>
                  <NockerlDivider orientation="vertical" />
                  {!narrow && (
                    <>
                      <span className="nk-tb__group">
                        <NockerlIconButton size={TB_ICON_SIZE} icon={IconList} label="List" ref={(el) => p.reg(3, el)} tabIndex={p.tab === 3 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 3)} onClick={() => setLast('List')} />
                        <NockerlIconButton size={TB_ICON_SIZE} icon={IconQuote} label="Quote" ref={(el) => p.reg(4, el)} tabIndex={p.tab === 4 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 4)} onClick={() => setLast('Quote')} />
                      </span>
                      <NockerlDivider orientation="vertical" />
                    </>
                  )}
                  <span className="nk-tb__spacer" />
                  <Overflow {...p} idx={narrow ? 2 : 5} title="More actions" setLast={setLast} items={narrow ? OVER_NARROW : OVER_WIDE} />
                </>
            )}
          </Toolbar>
        </div>
        <div className="nk-tb-demo__toggle">
          <NockerlCheckbox checked={narrow} onChange={setNarrow} label="Simulate a narrow container" size="sm" />
        </div>
      </div>

      {/* 5. VERTICAL toolbar (Up/Down arrow keys move focus) */}
      <div className="nk-tb-demo__group">
        <div className="nk-tb-demo__split">
          <div>
            <p className="nk-tb-demo__lbl">Vertical: Up / Down move focus</p>
            <Toolbar label="Canvas tools" orientation="vertical">
              {(p) => (
                  <>
                    <span className="nk-tb__group">
                      <NockerlIconButton size={TB_ICON_SIZE} icon={IconBold} label="Bold" pressed={marks.bold} ref={(el) => p.reg(0, el)} tabIndex={p.tab === 0 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 0)} onClick={() => flip('bold')} />
                      <NockerlIconButton size={TB_ICON_SIZE} icon={IconImage} label="Image" ref={(el) => p.reg(1, el)} tabIndex={p.tab === 1 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 1)} onClick={() => setLast('Image')} />
                      <NockerlIconButton size={TB_ICON_SIZE} icon={IconLink} label="NockerlLink" ref={(el) => p.reg(2, el)} tabIndex={p.tab === 2 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 2)} onClick={() => setLast('NockerlLink')} />
                    </span>
                    <NockerlDivider orientation="horizontal" />
                    <span className="nk-tb__group">
                      <NockerlIconButton size={TB_ICON_SIZE} icon={IconCode} label="Code" pressed={marks.code} ref={(el) => p.reg(3, el)} tabIndex={p.tab === 3 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 3)} onClick={() => flip('code')} />
                      <NockerlIconButton size={TB_ICON_SIZE} icon={IconTrash} label="Delete" style={TB_DANGER} ref={(el) => p.reg(4, el)} tabIndex={p.tab === 4 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 4)} onClick={() => setLast('Delete')} />
                    </span>
                  </>
              )}
            </Toolbar>
          </div>

          {/* a disabled-item + read-only-ish wrapped toolbar so wrapping reads */}
          <div>
            <p className="nk-tb-demo__lbl">Wrapping: a disabled control stays legible (skipped by arrows)</p>
            <Toolbar label="Editor, wrapping" className="nk-tb--wrap">
              {(p) => (
                  <>
                    <NockerlIconButton size={TB_ICON_SIZE} icon={IconBold} label="Bold" pressed={marks.bold} ref={(el) => p.reg(0, el)} tabIndex={p.tab === 0 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 0)} onClick={() => flip('bold')} />
                    <NockerlIconButton size={TB_ICON_SIZE} icon={IconItalic} label="Italic" pressed={marks.italic} ref={(el) => p.reg(1, el)} tabIndex={p.tab === 1 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 1)} onClick={() => flip('italic')} />
                    <NockerlIconButton size={TB_ICON_SIZE} icon={IconCode} label="Code" pressed={marks.code} ref={(el) => p.reg(2, el)} tabIndex={p.tab === 2 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 2)} onClick={() => flip('code')} />
                    <NockerlDivider orientation="vertical" />
                    <NockerlIconButton size={TB_ICON_SIZE} icon={IconImage} label="Insert image (read-only)" disabled ref={(el) => p.reg(3, el)} tabIndex={-1} onKeyDown={(e) => p.onKey(e, 3)} />
                    <NockerlIconButton size={TB_ICON_SIZE} icon={IconList} label="List" ref={(el) => p.reg(4, el)} tabIndex={p.tab === 4 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 4)} onClick={() => setLast('List')} />
                    <NockerlButton size="sm" variant="ghost" text="Wrap" leadingIcon={IconUndo} pressed={wrap} ref={(el) => p.reg(5, el)} tabIndex={p.tab === 5 ? 0 : -1} onKeyDown={(e) => p.onKey(e, 5)} onClick={() => setWrap((v) => !v)} />
                  </>
              )}
            </Toolbar>
          </div>
        </div>
      </div>

      <p className="nk-tb-demo__count">
        Marks: <b>{Object.entries(marks).filter(([, v]) => v).map(([k]) => k).join(' · ') || 'none'}</b> · align <b>{align}</b> · last action <b>{last}</b>. Pointer + keyboard both work; the island is live.
      </p>
    </div>
  );
}
