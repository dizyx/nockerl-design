/**
 * CommandPaletteDemo: the live, interactive Nockerl ⌘K command palette for web.
 *
 * The command palette is an APP-GLOBAL LAUNCHER, not an inline field: a tap of
 * the trigger (or ⌘K / Ctrl-K) drops a SCRIM over the surface and floats an
 * ELEVATED panel near top-center. It is a DISTINCT surface from the combobox
 * (an inline well), but it REUSES the shipped Nockerl vocabulary: the recessed
 * search WELL (combobox), the flat option ROW on a lifted card (list-item),
 * grouped section headers, and a leading search glyph. New to this surface:
 * per-row keyboard-shortcut HINTS (mono kbd chips), grouped sections
 * (Actions / Navigation / Recent), result icons, and an empty state.
 *
 * Sourced from the real apps: Voice's literal ⌘ glyph + `.keyboardShortcut`
 * treatment (MenuBarContent.swift), its "Recent" section + 60-char truncation,
 * and its substring search + "No matches / Try a different search" empty state
 * (HistoryView.swift). Android contributes the elevated/scrim modal idiom
 * (NockerlBottomSheet + the `scrim` token + neutral `nockerlShadow`).
 *
 * Laws verbatim: the search field SINKS (recessed well, inner shadow) while the
 * panel LIFTS (neutral drop shadow + top catch-light, never a glow / colored
 * shadow); the ACTIVE keyboard row = neutral wash + cyan ring (activation, not
 * selection); fills are STATIC, so only brightness / transform / opacity animate;
 * 12px control + panel radius; cyan #0CC0DF is the only accent; the scrim +
 * panel open FREEZE under prefers-reduced-motion.
 *
 * A11y: trigger has aria-haspopup/-expanded; the input is role=combobox driving
 * a role=listbox of role=option rows via aria-activedescendant; type to filter,
 * ↑↓ walk active rows ACROSS groups, Enter runs it (→ a "ran X" confirmation),
 * Esc closes, focus is TRAPPED in the panel and RESTORED to the trigger on close.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (docs/demo-token-contract.md); literals are pure geometry only.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { NockerlButton, NockerlIcon, NockerlKbd, NockerlListboxOption, NockerlOverlay, NockerlSurface, type ComposeContract } from '@dizyx/nockerl-react';

export type CommandGroup = 'Actions' | 'Navigation' | 'Recent';

export interface Command {
  id: string; // stable identity
  label: string; // primary line: the command's accessible name (label.large)
  hint?: string; // supporting line under the label (body.small)
  group: CommandGroup; // section bucket; commands sharing a group render under one header
  icon: keyof typeof ICONS; // leading result glyph (mono / neutral, never a status color)
  shortcut?: string[]; // per-row keyboard hint, rendered as mono kbd chips
  disabled?: boolean; // inert + still legible (never invisible)
}

// The panel LIFTS, the search field SINKS. Fills are static, so only brightness /
// transform / opacity animate. All values are tokens; the dark stage resolves
// cyan to #0cc0df, and provides --color-on-accent for any label on a cyan fill.
const STYLES = `
.nk-cmd-demo { font-family: var(--font-family-sans); }
.nk-cmd-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-cmd-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-cmd-demo__count b { color: var(--color-accent-primary); }
.nk-cmd-demo__ran { color: var(--color-on-card); }

/* The launcher TRIGGER is the real NockerlButton primitive (secondary idiom); its leading
   search glyph + trailing kbd chips ride NockerlButton's leadingIcon / trailingIcon slots,
   so it owns its own resting / hover / press / focus recipe. */

/* ── The contained STAGE: the modal is bounded to this box, never the viewport ── */
.nk-cmd__stage {
  position: relative; margin-top: var(--space-5); height: 420px; overflow: hidden;
  border-radius: var(--radius-card); border: var(--space-px) solid var(--color-card-hairline);
  background:
    radial-gradient(120% 90% at 50% -10%, color-mix(in srgb, var(--color-accent-primary) 7%, transparent), transparent 60%),
    var(--color-canvas-alt);
}
/* a faint mock of "the app underneath" so the scrim has something to dim */
.nk-cmd__backdrop { position: absolute; inset: 0; padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-3); }
.nk-cmd__ghost { height: var(--space-8); border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--color-on-canvas) 5%, transparent); }
.nk-cmd__ghost--sm { width: 38%; } .nk-cmd__ghost--md { width: 64%; } .nk-cmd__ghost--lg { width: 86%; }
.nk-cmd__hint-rest { position: absolute; left: 0; right: 0; bottom: var(--space-4); text-align: center;
  font-size: var(--font-size-12); color: var(--color-on-canvas-muted);
  display: flex; align-items: center; justify-content: center; gap: var(--space-1); }

/* ── The floating PANEL sits near top-center; this is where depth lives (lift). The modal SCRIM +
   focus-trap + Esc + open/close lifecycle are the shared NockerlOverlay primitive now (a flat
   token dim, NO blur, a design law). NockerlSurface (variant="panel") supplies the fill, hairline,
   and 12px panel radius; the enter transform is keyed off NockerlOverlay's data-shown so the panel
   animates IN and OUT. It stays position:absolute so it keeps its top-center anchor inside the
   overlay wrap regardless of the wrap's flex placement. ── */
.nk-cmd__panel {
  position: absolute; left: 50%; top: var(--space-8); z-index: 11;
  width: min(440px, calc(100% - var(--space-8))); display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 var(--space-4) var(--elevation-sheet) -10px color-mix(in srgb, var(--color-shadow-tint) 70%, transparent), var(--nk-surface-sheen);
  transform-origin: top center; opacity: 0; transform: translateX(-50%) translateY(-8px) scale(.97);
  transition: opacity .18s cubic-bezier(.2,0,0,1), transform .18s cubic-bezier(.2,0,0,1);
}
.nk-cmd__panel[data-shown="true"] { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }

/* ── HEAD: the search zone gets CARD BREATHING ROOM. The well is SEATED in the panel
   surface with padding all around (not flush to the modal edge), and a hairline splits it from
   the results. Everywhere else our insets are surrounded by card surface, and so is this one. ── */
.nk-cmd__head { padding: var(--space-3); border-bottom: var(--space-px) solid var(--color-card-hairline); }
/* ── Search WELL: a recessed PILL (field sinks; SearchField canon, Law 4 sanctions the input
   bar's stadium), seated in the head's card space: darker fill + inner shadow + a catch-light
   line, with a hairline giving the well a real edge. ── */
.nk-cmd__search { display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-2) var(--space-4); border-radius: var(--radius-pill);
  border: var(--space-px) solid var(--color-card-hairline); background: var(--color-canvas-alt);
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-cmd__search-glyph { color: var(--color-on-card-muted); display: inline-flex; flex: 0 0 auto; }
.nk-cmd__search-glyph svg { display: block; width: 20px; height: 20px; }
.nk-cmd__input { flex: 1 1 auto; min-width: 0; background: transparent; border: 0; outline: none;
  color: var(--color-on-card); font: inherit; font-size: var(--font-size-16); line-height: var(--font-line-height-24); padding: var(--space-1) 0; }
.nk-cmd__input::placeholder { color: color-mix(in srgb, var(--color-on-card-muted) 70%, transparent); }
.nk-cmd__esc { flex: 0 0 auto; }

/* ── keycap HINTS: each key is now the shared NockerlKbd primitive (raised keycap); this
   file only owns the flex ROW that groups a chord (.nk-cmd__keys) + the esc cap's
   no-shrink. ── */
.nk-cmd__keys { display: inline-flex; align-items: center; gap: var(--space-1); flex: 0 0 auto; }
/* Launcher row: the pure Search-commands button + the ⌘K chord as an ADJACENT hint that sits
   OUTSIDE the button, with a real gap (keycaps are a keyboard affordance beside the control, never
   crammed into its label; that 1em trailingIcon slot is what crowded the "s").  */
.nk-cmd__launch { display: inline-flex; align-items: center; gap: var(--space-3); }

/* ── Result LIST: flat rows on the lifted panel (depth is the panel, not the row) ── */
.nk-cmd__list { list-style: none; margin: 0; padding: var(--space-2); max-height: 268px; overflow-y: auto; }
/* group header: a quiet caption above its section */
.nk-cmd__group { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold);
  padding: var(--space-3) var(--space-2) var(--space-1); display: flex; align-items: center; gap: var(--space-2); }
.nk-cmd__group:not(:first-child) { border-top: var(--space-px) solid var(--color-card-hairline); margin-top: var(--space-1); }
.nk-cmd__group-glyph { display: inline-flex; opacity: .8; } .nk-cmd__group-glyph svg { display: block; width: 13px; height: 13px; }

/* the option ROW is now the shipped NockerlListboxOption primitive (.nk-opt*), which
   self-injects its own CSS; only the trailing shortcut chips (.nk-cmd__keys, above)
   stay local here. */

/* empty / no-results: quiet, centered, never an error color (Voice's "No matches") */
.nk-cmd__empty { padding: var(--space-8) var(--space-4); text-align: center; }
.nk-cmd__empty-glyph { color: var(--color-on-card-muted); display: inline-flex; opacity: .6; margin-bottom: var(--space-2); }
.nk-cmd__empty-glyph svg { display: block; width: 26px; height: 26px; }
.nk-cmd__empty-title { font-size: var(--font-size-14); color: var(--color-on-card); font-weight: var(--font-weight-medium); }
.nk-cmd__empty-title b { color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); }
.nk-cmd__empty-sub { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-1); }

/* footer: the running hint legend (kbd chips), the launcher's quiet base */
.nk-cmd__footer { display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap;
  padding: var(--space-2) var(--space-4); border-top: var(--space-px) solid var(--color-card-hairline);
  background: color-mix(in srgb, var(--color-canvas-alt) 60%, transparent); }
.nk-cmd__legend { display: inline-flex; align-items: center; gap: var(--space-2);
  font-size: var(--font-size-12); color: var(--color-on-card-muted); }

@media (prefers-reduced-motion: reduce) {
  .nk-cmd__trigger { transition: none; }
  .nk-cmd__panel { transition: none; }
}
`;

// ─── Inline glyphs (stroke icons from the shared NockerlIcon primitive; CSS sizes each slot) ──
const ICONS = {
  search: <NockerlIcon><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></NockerlIcon>,
  plus: <NockerlIcon name="plus" />,
  bolt: <NockerlIcon path="M13 2 4 14h7l-1 8 9-12h-7z" />,
  command: <NockerlIcon path="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z" />,
  compass: <NockerlIcon><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></NockerlIcon>,
  clock: <NockerlIcon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></NockerlIcon>,
  folder: <NockerlIcon path="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  inbox: <NockerlIcon><path d="M3 12h5l2 3h4l2-3h5" /><path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /></NockerlIcon>,
  cluster: <NockerlIcon><circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="12" cy="18" r="2.4" /><path d="M7.7 7.7 11 15m5.3-7.3L13 15" /></NockerlIcon>,
  doc: <NockerlIcon><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></NockerlIcon>,
  terminal: <NockerlIcon path="m5 8 4 4-4 4M13 16h6" />,
  theme: <NockerlIcon path="M12 3a9 9 0 1 0 9 9c-5 0-9-4-9-9z" />,
};
type IconKey = keyof typeof ICONS;

const GROUP_GLYPH: Record<CommandGroup, IconKey> = { Actions: 'bolt', Navigation: 'compass', Recent: 'clock' };
const GROUP_ORDER: CommandGroup[] = ['Actions', 'Navigation', 'Recent'];

/** Case-insensitive substring filter (the Voice HistoryView idiom). */
function matches(c: Command, q: string): boolean {
  if (!q) return true;
  const n = q.toLowerCase();
  return c.label.toLowerCase().includes(n) || (c.hint?.toLowerCase().includes(n) ?? false);
}

/** Highlight the matched run with a <mark> (never color alone). */
function highlight(label: string, q: string) {
  if (!q) return label;
  const i = label.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return label;
  return (<>{label.slice(0, i)}<mark>{label.slice(i, i + q.length)}</mark>{label.slice(i + q.length)}</>);
}

/** One per-row keyboard hint: each key as a raised NockerlKbd keycap in a tight flex row. */
function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="nk-cmd__keys" aria-hidden="true">
      {keys.map((k, i) => <NockerlKbd key={i}>{k}</NockerlKbd>)}
    </span>
  );
}

interface RowProps { cmd: Command; id: string; query: string; active: boolean; onActivate: () => void; onRun: () => void; }

/** A flat command ROW: leading icon → primary + hint → trailing shortcut chips.
 *  Now composes the shipped NockerlListboxOption primitive (the role="option" home).
 *  In a command palette the ACTIVE keyboard row IS the aria-selected one. */
function Row({ cmd: c, id, query, active, onActivate, onRun }: RowProps) {
  return (
    <NockerlListboxOption
      id={id}
      leadingIcon={ICONS[c.icon]}
      primary={highlight(c.label, query)}
      secondary={c.hint}
      trailing={c.shortcut ? <Keys keys={c.shortcut} /> : undefined}
      selected={active}
      active={active}
      disabled={c.disabled}
      ariaKeyshortcuts={c.shortcut ? c.shortcut.join('+') : undefined}
      onActivate={onActivate}
      onSelect={onRun}
    />
  );
}

// ─── Demo data: real Nockerl commands (actions, navigation, recents) ──────────
const COMMANDS: Command[] = [
  { id: 'new-session', label: 'New session', hint: 'Start a fresh Cloud Agent session', group: 'Actions', icon: 'plus', shortcut: ['⌘', 'N'] },
  { id: 'run-task', label: 'Run task…', hint: 'Dispatch the next queued ticket', group: 'Actions', icon: 'bolt', shortcut: ['⌘', '↵'] },
  { id: 'open-terminal', label: 'Open web console', hint: 'Attach to the running session', group: 'Actions', icon: 'terminal', shortcut: ['⌘', 'J'] },
  { id: 'toggle-theme', label: 'Toggle theme', hint: 'NockerlSwitch light / dark appearance', group: 'Actions', icon: 'theme', shortcut: ['⌘', '⇧', 'L'] },
  { id: 'pull-memory', label: 'Search memory', hint: 'Vector context (coming soon)', group: 'Actions', icon: 'doc', disabled: true },
  { id: 'go-projects', label: 'Go to Projects', hint: 'All workspaces and repos', group: 'Navigation', icon: 'folder', shortcut: ['G', 'P'] },
  { id: 'go-inbox', label: 'Go to Inbox', hint: '3 unread notifications', group: 'Navigation', icon: 'inbox', shortcut: ['G', 'I'] },
  { id: 'go-cluster', label: 'Go to Cluster', hint: 'local cluster · 4 nodes online', group: 'Navigation', icon: 'cluster', shortcut: ['G', 'C'] },
  { id: 'recent-design', label: 'nockerl-design · docs site', hint: 'Streaming · 2 tools running', group: 'Recent', icon: 'doc' },
  { id: 'recent-gateway', label: 'api-server · gateway refactor', hint: 'Idle · last active 12m ago', group: 'Recent', icon: 'terminal' },
  { id: 'recent-credential-store', label: 'credential-store · allowlist audit', hint: 'Needs attention · approval required', group: 'Recent', icon: 'folder' },
];

/** The command palette surface: trigger + scrim + floating panel, fully self-contained. */
function CommandPalette({ onRun }: { onRun: (label: string) => void }) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Filter, then order into the canonical sections; the visible order is what the
  // keyboard cursor walks (so ↑↓ flow ACROSS groups exactly as rendered).
  const sections = useMemo(() => {
    const hit = COMMANDS.filter((c) => matches(c, query));
    return GROUP_ORDER
      .map((g) => ({ group: g, items: hit.filter((c) => c.group === g) }))
      .filter((s) => s.items.length > 0);
  }, [query]);
  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  // The keyboard cursor only lands on enabled rows.
  const navigable = useMemo(() => flat.filter((c) => !c.disabled), [flat]);

  // Reset the query + cursor whenever the palette opens. The initial focus (the input), the
  // focus TRAP, Esc, and the never-focus-on-mount guard are the NockerlOverlay primitive's job
  // now; the trigger is re-focused in onDismiss (below).
  useEffect(() => {
    if (open) { setQuery(''); setActive(0); }
  }, [open]);

  // Keep the active row in view as the cursor walks groups.
  useEffect(() => {
    if (!open) return;
    const el = navigable[active] ? document.getElementById(`${id}-row-${navigable[active]!.id}`) : null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open, navigable, id]);

  // ⌘K / Ctrl-K opens from anywhere in the stage (a real global launcher).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clamp = (i: number) => (navigable.length === 0 ? 0 : (i + navigable.length) % navigable.length);

  const run = (c: Command) => {
    if (c.disabled) return;
    onRun(c.label);
    setOpen(false);
  };

  // ↑/↓ walk the cursor across groups; Enter runs. Tab-trap + Esc-close are the overlay's
  // (Esc bubbles from the input to the panel's overlay keydown).
  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => clamp(i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => clamp(i - 1)); }
    else if (e.key === 'Enter') { if (navigable[active]) { e.preventDefault(); run(navigable[active]!); } }
  };

  const activeId = navigable[active] ? `${id}-row-${navigable[active]!.id}` : undefined;

  return (
    <>
      {/* Launcher: a PURE "Search commands" button + the ⌘K chord as an ADJACENT hint OUTSIDE the
          button (keycaps are a keyboard affordance beside the control, never crammed into its
          label; the trailingIcon slot is a 1em box that crowded the "s"). aria-keyshortcuts carries the
          shortcut for AT; the visual caps are decorative (aria-hidden inside <Keys>).  */}
      <div className="nk-cmd__launch">
        <NockerlButton
          ref={triggerRef}
          text="Search commands"
          variant="secondary"
          leadingIcon={ICONS.search}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-keyshortcuts="Meta+K Control+K"
          onClick={() => setOpen(true)}
        />
        <Keys keys={['⌘', 'K']} />
      </div>

      <div className="nk-cmd__stage" ref={stageRef}>
        {/* a faint mock of "the app" so the scrim dims something real */}
        <div className="nk-cmd__backdrop" aria-hidden="true">
          <div className="nk-cmd__ghost nk-cmd__ghost--sm" />
          <div className="nk-cmd__ghost nk-cmd__ghost--lg" />
          <div className="nk-cmd__ghost nk-cmd__ghost--md" />
          <div className="nk-cmd__ghost nk-cmd__ghost--lg" />
          <div className="nk-cmd__ghost nk-cmd__ghost--sm" />
        </div>
        {!open && (
          <p className="nk-cmd__hint-rest">
            Press <NockerlKbd>⌘</NockerlKbd> <NockerlKbd>K</NockerlKbd> or the button above to launch
          </p>
        )}

        <NockerlOverlay
          open={open}
          onDismiss={() => { setOpen(false); triggerRef.current?.focus(); }}
          stage={stageRef.current}
          placement="center"
          initialFocusRef={inputRef}
          scrimLabel="Close command palette"
        >
          {({ panelRef, panelProps }) => (
            <NockerlSurface
              variant="panel"
              ref={panelRef as React.RefObject<HTMLDivElement>}
              className="nk-cmd__panel"
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              {...panelProps}
            >
              <div className="nk-cmd__head">
              <div className="nk-cmd__search">
                <span className="nk-cmd__search-glyph" aria-hidden="true">{ICONS.search}</span>
                <input
                  ref={inputRef}
                  type="text"
                  className="nk-cmd__input"
                  role="combobox"
                  aria-expanded
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={activeId}
                  aria-label="Search commands"
                  placeholder="Type a command or search…"
                  autoComplete="off"
                  spellCheck={false}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                  onKeyDown={onInputKey}
                />
                <NockerlKbd className="nk-cmd__esc">esc</NockerlKbd>
              </div>
              </div>

              <ul className="nk-cmd__list" id={listId} role="listbox" aria-label="Commands">
                {flat.length === 0 ? (
                  <li role="presentation">
                    <div className="nk-cmd__empty">
                      <span className="nk-cmd__empty-glyph" aria-hidden="true">{ICONS.search}</span>
                      <p className="nk-cmd__empty-title">No results for <b>{query}</b></p>
                      <p className="nk-cmd__empty-sub">Try a different search.</p>
                    </div>
                  </li>
                ) : (
                  sections.map((s) => (
                    <li key={s.group} role="presentation">
                      <div className="nk-cmd__group" role="presentation">
                        <span className="nk-cmd__group-glyph" aria-hidden="true">{ICONS[GROUP_GLYPH[s.group]]}</span>
                        {s.group}
                      </div>
                      {s.items.map((c) => {
                        const navIndex = navigable.indexOf(c);
                        return (
                          <Row
                            key={c.id}
                            cmd={c}
                            id={`${id}-row-${c.id}`}
                            query={query}
                            active={!c.disabled && navIndex === active}
                            onActivate={() => !c.disabled && navIndex >= 0 && setActive(navIndex)}
                            onRun={() => run(c)}
                          />
                        );
                      })}
                    </li>
                  ))
                )}
              </ul>

              <div className="nk-cmd__footer">
                <span className="nk-cmd__legend"><Keys keys={['↑', '↓']} /> navigate</span>
                <span className="nk-cmd__legend"><Keys keys={['↵']} /> run</span>
                <span className="nk-cmd__legend"><Keys keys={['esc']} /> close</span>
              </div>
            </NockerlSurface>
          )}
        </NockerlOverlay>
      </div>
    </>
  );
}

// CommandPalette is a LEAF launcher: commands are DATA (COMMANDS[]), not a component slot. It composes
// NockerlButton (the launcher trigger) + NockerlSurface (the floating panel) + NockerlListboxOption (each result row).
// OWNS input: the palette search is a combobox whose <input> drives an EXTERNAL role="listbox" via
// aria-activedescendant + a custom onKeyDown (↑/↓ walk results ACROSS groups, Esc closes). Neither
// SearchField (own recents keyboard model, no external listbox) nor NockerlTextField (no ref / onKeyDown /
// role / aria-activedescendant passthrough) can host it, so it is the palette's own identity.
export const compose = {
  tier: 'leaf',
  owns: ['input'],
} satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Command palette page: a ⌘K trigger that
 * drops a scrim + floats the palette inside the contained stage; type to filter
 * grouped commands (Actions / Navigation / Recent), ↑↓ to walk the active row
 * across groups, Enter to run it (a "ran X" confirmation appears below), Esc to
 * close. Focus is trapped in the panel and restored to the trigger. Fully keyboard-operable.
 */
export default function CommandPaletteDemo() {
  const [ran, setRan] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const onRun = (label: string) => { setRan(label); setCount((c) => c + 1); };

  return (
    <div className="nk-cmd-demo">
      <style>{STYLES}</style>

      <p className="nk-cmd-demo__lbl">Press ⌘K (or Ctrl-K) inside the stage: type, ↑↓, Enter, Esc</p>
      <CommandPalette onRun={onRun} />

      <p className="nk-cmd-demo__count" role="status" aria-live="polite">
        {ran
          ? <>Ran <span className="nk-cmd-demo__ran">“{ran}”</span> · <b>{count}</b> command{count === 1 ? '' : 's'} run. The island is live.</>
          : <>No command run yet. Launch the palette and press Enter on a row.</>}
      </p>
    </div>
  );
}
