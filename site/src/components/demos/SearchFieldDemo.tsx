/**
 * SearchFieldDemo: the live, interactive Nockerl SEARCH field island for the web.
 *
 * This is the search-SPECIFIC affordance (distinct from text-field, combobox, and
 * command-palette): a single recessed well that FILTERS content IN PLACE. It is
 * sourced from the shipped Swift `HistorySection.searchBar` (NockerlVoice):
 * leading `magnifyingglass`, a plain "Search …" placeholder, an `xmark.circle.fill`
 * clear button that appears only when non-empty, a recessed `canvasAlt` well with a
 * hairline border. It is NOT a value-selecting autocomplete (that is `combobox`,
 * which commits an option + shows a check) and NOT a modal launcher (that is
 * `command-palette`, the ⌘K sheet).
 *
 * Reuses the shipped field vocabulary (recessed well, 12px control radius, cyan
 * focus OUTLINE) and the suggestions-popover vocabulary from combobox, but every
 * row here just REPLAYS a query, it never selects a value.
 *
 * Laws verbatim: the field SINKS (darker inset + INNER shadow), the suggestions
 * popover LIFTS (neutral drop shadow + top catch-light), one light source, no
 * glow / colored shadow; focus is a cyan OUTLINE, never a halo; the spinner +
 * clear + popover animate interpolatable props only (rotation / opacity / transform),
 * and freeze under prefers-reduced-motion.
 *
 * A11y: a real `type="search"` input with `role="searchbox"`, an `aria-label`,
 * Enter submits, Esc clears (then closes recents), the clear button is its own
 * focusable target, recents are arrow-navigable (`aria-activedescendant`), and an
 * `aria-live` region announces the result count. Pill vs. standard shape + a
 * compact toolbar size + a disabled state are all shown.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (docs/demo-token-contract.md). The dark stage resolves them to the
 * dark palette; literals remain only for pure geometry (icon sizes, curves).
 */
import { useId, useMemo, useRef, useState } from 'react';
import { NockerlIcon, NockerlIconButton, NockerlKbd, NockerlListboxOption, NockerlSurface, NockerlWell, type ComposeContract } from '@dizyx/nockerl-react';

export type SearchShape = 'control' | 'pill';
export type SearchSize = 'md' | 'sm';

export interface SearchFieldProps {
  /** Accessible name for the searchbox (there is no persistent visible label). */
  label: string;
  /** Current query (controlled). */
  value: string;
  /** Fires on every keystroke so the host can filter its content live. */
  onChange?: (value: string) => void;
  /** Fires on Enter (explicit submit) with the current query. */
  onSubmit?: (value: string) => void;
  /** Ghost prompt inside the well. */
  placeholder?: string;
  /** Silhouette: 12px control rect (default) or full-stadium pill (toolbars). */
  shape?: SearchShape;
  /** Control height: md (44) or a compact sm (36) for dense toolbars. */
  size?: SearchSize;
  /** Inline keyboard hint pinned to the right (e.g. "⌘K" or "/"). */
  shortcut?: string;
  /** Shows the searching spinner + sets aria-busy (async source in flight). */
  loading?: boolean;
  /** Inert + clearly-seen (never invisible). */
  disabled?: boolean;
  /** Recent searches; when provided + focused + empty, they drop under the field. */
  recents?: string[];
  /** Replay a recent query (host sets value + runs the search). */
  onPickRecent?: (value: string) => void;
}

// The field WELL sinks; the recents popover LIFTS. Fills are static: only
// brightness / transform / opacity / rotation animate. All values are tokens; the
// dark stage resolves cyan to #0cc0df. Literals = pure glyph geometry only.
const STYLES = `
.nk-search-demo { font-family: var(--font-family-sans); max-width: 460px; }
.nk-search { position: relative; }
.nk-search + .nk-search { margin-top: var(--space-5); }
/* the recessed WELL. The sink recipe (fill, hairline, control radius, INNER shadow +
   top catch-light, hover, cyan focus OUTLINE, disabled, the field flex-row layout)
   comes from the shared NockerlWell primitive (nk-well nk-well--field). This demo keeps only the
   search-specific cursor + the size/shape variants that override NockerlWell's field base. */
.nk-well.nk-search__well { cursor: text; }
.nk-well.nk-search__well.is-disabled { cursor: not-allowed; }
/* size/shape variants: two-class specificity so they always beat NockerlWell's .nk-well--field
   base regardless of injected-style order. */
.nk-well.nk-search__well--pill { border-radius: var(--radius-pill); padding: 0 var(--space-4); }
.nk-well.nk-search__well--sm { min-height: 36px; padding: 0 var(--space-2); gap: var(--space-1); }
.nk-well.nk-search__well--sm.nk-search__well--pill { padding: 0 var(--space-3); }
/* leading magnifier: muted, vertically centered, never tinted by state */
.nk-search__icon { color: var(--color-on-card-muted); display: inline-flex; flex: 0 0 auto; }
.nk-search__icon svg { display: block; width: 18px; height: 18px; }
.nk-search__well--sm .nk-search__icon svg { width: 16px; height: 16px; }
.nk-search__input { flex: 1 1 auto; min-width: 0; background: transparent; border: 0; outline: none;
  color: var(--color-on-card); font: inherit; font-size: var(--font-size-14); line-height: var(--font-line-height-20); padding: var(--space-2) 0; }
.nk-search__well--sm .nk-search__input { font-size: var(--font-size-12); }
.nk-search__input::placeholder { color: color-mix(in srgb, var(--color-on-card-muted) 70%, transparent); }
.nk-search__input::-webkit-search-decoration, .nk-search__input::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; }
.nk-search__input:disabled { color: var(--color-on-card-muted); cursor: not-allowed; -webkit-text-fill-color: var(--color-on-card-muted); }
/* trailing cluster: spinner / clear / shortcut, right-aligned + centered */
.nk-search__trail { display: inline-flex; align-items: center; gap: var(--space-1); flex: 0 0 auto; }
/* the searching spinner: interpolatable rotation, holds its slot */
.nk-search__spin { width: 15px; height: 15px; border-radius: var(--radius-pill); border: var(--space-0-5) solid var(--color-on-card-muted); border-top-color: transparent; display: inline-block; flex: 0 0 auto; animation: nk-search-sp .7s linear infinite; }
@keyframes nk-search-sp { to { transform: rotate(360deg); } }
/* the clear (X) is the plain NockerlIconButton primitive (size 28); it owns its own resting /
   hover / press / focus recipe. */
/* inline keyboard hint: the shared NockerlKbd primitive (raised keycap). This override only
   tightens it for the compact well (10px legend, no-shrink) + drops min-width so a bare "/"
   cap does not reserve a wide slot; the keycap LOOK (surface, catch-light, weight) is NockerlKbd's. */
.nk-search__well .nk-kbd.nk-search__kbd { font-size: var(--font-size-10); min-width: 0; white-space: nowrap; flex: 0 0 auto; }
/* the LIFTED recents popover: depth lives here (neutral drop shadow + top catch-light).
   bg / hairline / panel-radius / sheen come from <NockerlSurface variant="panel">; this rule adds only position + motion + the drift shadow. */
.nk-search-demo .nk-search__pop { position: absolute; left: 0; right: 0; top: calc(100% + var(--space-1)); z-index: 20; overflow: hidden;
  box-shadow: 0 var(--space-2) var(--elevation-level3) -8px color-mix(in srgb, var(--color-shadow-tint) 65%, transparent), var(--nk-surface-sheen);
  transform-origin: top center; animation: nk-search-pop .14s cubic-bezier(.2,0,0,1); }
@keyframes nk-search-pop { from { opacity: 0; transform: translateY(-4px) scale(.985); } to { opacity: 1; transform: none; } }
.nk-search__pop-head { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); padding: var(--space-2) var(--space-3) var(--space-1); }
.nk-search__recents { list-style: none; margin: 0; padding: var(--space-1); }
/* a recent ROW is the NockerlListboxOption primitive (.nk-opt recipe, self-injected). It REPLAYS
   a query, so it passes only the active state (the keyboard highlight + cyan ring), never
   selected (no committed value, no check). */
/* results panel under the live field: a lifted card the rows sit flat on.
   bg / hairline / card-radius / sheen come from <NockerlSurface>; this rule adds only the flow margin + the drift shadow. */
.nk-search-demo .nk-search__results { margin-top: var(--space-3); overflow: hidden;
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen); }
.nk-search__row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); min-height: var(--space-12); color: var(--color-on-card); }
.nk-search__row + .nk-search__row { border-top: var(--space-px) solid var(--color-card-hairline); }
.nk-search__row-dot { width: 9px; height: 9px; border-radius: var(--radius-pill); flex: 0 0 auto; }
.nk-search__row-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-search__row-primary { font-size: var(--font-size-14); font-weight: var(--font-weight-medium); line-height: var(--font-line-height-20); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nk-search__row-primary mark { background: color-mix(in srgb, var(--color-accent-primary) 26%, transparent); color: inherit; border-radius: var(--radius-track); padding: 0 var(--space-px); }
.nk-search__row-secondary { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* empty / no-results: quiet, centered, never an error color (matches Swift ContentUnavailableView) */
.nk-search__empty { padding: var(--space-6) var(--space-4); text-align: center; color: var(--color-on-card-muted); }
.nk-search__empty-title { font-size: var(--font-size-14); font-weight: var(--font-weight-semibold); color: var(--color-on-card); }
.nk-search__empty-body { font-size: var(--font-size-12); margin-top: var(--space-1); }
.nk-search__empty-body b { color: var(--color-on-card); }
@media (prefers-reduced-motion: reduce) {
  .nk-search__spin { animation-duration: 1.4s; }
  .nk-search__pop { animation: none; }
}
.nk-search-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-search-demo__group + .nk-search-demo__group { margin-top: var(--space-8); }
.nk-search-demo__count { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-6); }
.nk-search-demo__count b { color: var(--color-accent-primary); }
`;

// ─── Inline glyphs (the shared NockerlIcon primitive, on currentColor so each slot tints correctly) ──
const IconSearch = (<NockerlIcon><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></NockerlIcon>);
const IconX = <NockerlIcon name="x" />;
const IconClock = (<NockerlIcon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></NockerlIcon>);

/**
 * A single Nockerl search field, the unit the spec documents. Leading magnifier,
 * a `type="search"` input, a trailing cluster (spinner while loading → clear ✕ when
 * non-empty → optional shortcut cap), and an optional recents popover that replays a
 * past query. It never selects a value, and that distinguishes it from combobox.
 */
export function SearchField({
  label, value, onChange, onSubmit, placeholder = 'Search…',
  shape = 'control', size = 'md', shortcut, loading = false, disabled = false,
  recents, onPickRecent,
}: SearchFieldProps) {
  const id = useId();
  const listId = `${id}-recents`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);

  // NOT migrated to NockerlPopover (deliberate: the one exception). SearchField's recents
  // are a blur-close, aria-activedescendant combobox: DOM focus never leaves the <input>, there is
  // NO scrim, NO focus-trap, and NO flip/clamp. There is zero duplicated anchor/flip/clamp/scrim/
  // trap machinery to hoist into the shared primitive, and NockerlPopover's outside-click scrim
  // would sit OVER the still-editable input, breaking it. So the recents panel stays a plain
  // absolute-positioned dropdown. (Combobox/MultiSelect, which move focus INTO their popover, DO
  // migrate; SearchField's focus-stays-in-the-field model is the distinguishing reason it doesn't.)
  //
  // Recents drop only while focused, empty, and present (mirrors the search-history idiom).
  const showRecents = focused && !disabled && value.length === 0 && (recents?.length ?? 0) > 0;
  const recentList = recents ?? [];

  const clear = () => {
    onChange?.('');
    inputRef.current?.focus();
  };

  const pick = (q: string) => {
    onPickRecent?.(q);
    setActive(-1);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Escape') {
      if (value.length > 0) { e.preventDefault(); clear(); }
      else if (showRecents) { e.preventDefault(); setActive(-1); inputRef.current?.blur(); }
    } else if (e.key === 'Enter') {
      if (showRecents && active >= 0 && recentList[active]) { e.preventDefault(); pick(recentList[active]!); }
      else { onSubmit?.(value); }
    } else if (showRecents && e.key === 'ArrowDown') {
      e.preventDefault(); setActive((i) => (i + 1) % recentList.length);
    } else if (showRecents && e.key === 'ArrowUp') {
      e.preventDefault(); setActive((i) => (i <= 0 ? recentList.length - 1 : i - 1));
    }
  };

  const activeId = showRecents && active >= 0 ? `${id}-r-${active}` : undefined;

  return (
    <div className="nk-search">
      <NockerlWell
        layout="field"
        className={['nk-search__well', shape === 'pill' ? 'nk-search__well--pill' : '', size === 'sm' ? 'nk-search__well--sm' : '', focused && !disabled ? 'is-focus' : '', disabled ? 'is-disabled' : '']
          .filter(Boolean).join(' ')}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        <span className="nk-search__icon" aria-hidden="true">{IconSearch}</span>
        <input
          id={id}
          ref={inputRef}
          type="search"
          role="searchbox"
          className="nk-search__input"
          value={value}
          placeholder={placeholder}
          aria-label={label}
          aria-busy={loading || undefined}
          aria-expanded={showRecents}
          aria-controls={showRecents ? listId : undefined}
          aria-activedescendant={activeId}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          onChange={(e) => { onChange?.(e.target.value); setActive(-1); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
        />
        <span className="nk-search__trail">
          {loading && <span className="nk-search__spin" aria-hidden="true" />}
          {value.length > 0 && !disabled && (
            <NockerlIconButton icon={IconX} label="Clear search" variant="plain" size={28}
              onMouseDown={(e) => e.preventDefault()} onClick={clear} />
          )}
          {shortcut && value.length === 0 && (
            <NockerlKbd className="nk-search__kbd" aria-hidden="true">{shortcut}</NockerlKbd>
          )}
        </span>
      </NockerlWell>

      {showRecents && (
        <NockerlSurface variant="panel" className="nk-search__pop">
          <p className="nk-search__pop-head">Recent searches</p>
          <ul className="nk-search__recents" id={listId} role="listbox" aria-label="Recent searches">
            {recentList.map((q, i) => (
              <li key={q} role="presentation">
                <NockerlListboxOption
                  id={`${id}-r-${i}`}
                  primary={q}
                  leadingIcon={IconClock}
                  active={i === active}
                  onActivate={() => setActive(i)}
                  onSelect={() => pick(q)}
                />
              </li>
            ))}
          </ul>
        </NockerlSurface>
      )}
      {/* Self-inject the recipe so ANY consumer (EmptyState, etc.) gets the styled well +
          the ::-webkit-search-cancel-button suppression. Without it a bare import renders an
          UNSTYLED input AND the browser's native search clear-X duplicates our own.
          Injected as the LAST child; identical injected blocks dedupe in effect. */}
      <style>{STYLES}</style>
    </div>
  );
}

// ─── Demo data from a real Nockerl surface: searchable sessions ───────────────────
type Row = { primary: string; secondary: string; status: string };
const STATUS_COLOR: Record<string, string> = {
  info: 'var(--color-status-info)', success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)', error: 'var(--color-status-error)', idle: 'var(--color-dot-idle)',
};
const SESSIONS: Row[] = [
  { primary: 'nockerl-design · docs site', secondary: 'Streaming · 2 tools running', status: 'info' },
  { primary: 'api-server · gateway refactor', secondary: 'Idle · last active 12m ago', status: 'success' },
  { primary: 'credential-store · allowlist audit', secondary: 'Needs attention · approval required', status: 'warning' },
  { primary: 'dueydo · failed deploy', secondary: 'Error · build exited 1', status: 'error' },
  { primary: 'nockerl-voice · dictation history', secondary: 'Idle · macOS menu bar', status: 'idle' },
  { primary: 'nockerl-dashboard · inbox sync', secondary: 'Streaming · push delivered', status: 'info' },
];

/** Render the matched run as a <mark> (a shape, not color alone). */
function highlight(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (<>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>);
}

/**
 * The interactive showcase: a live search that filters a visible session list as
 * you type (clear + Esc empty it, Enter submits), an aria-live result count, an
 * empty/no-results state, plus variant rows: a ⌘K shortcut hint, a "/" hint, a
 * pill shape, a compact toolbar size, a recent-searches dropdown, an async
 * loading state, and a disabled field. Fully keyboard-operable.
 */
// LEAF, the search-input primitive: it OWNS the real <input type="search" role="searchbox"> it renders (it IS the field) + composes NockerlWell (the recessed shell), NockerlSurface (the recents popover), NockerlIconButton (the trailing clear ✕), and NockerlListboxOption (the recent-query rows).
export const compose = { tier: 'leaf', owns: ['input'] } satisfies ComposeContract;

export default function SearchFieldDemo() {
  const [query, setQuery] = useState('');
  const [submits, setSubmits] = useState(0);

  const results = useMemo(
    () => SESSIONS.filter((s) => !query || s.primary.toLowerCase().includes(query.toLowerCase()) || s.secondary.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <div className="nk-search-demo">
      <style>{STYLES}</style>

      <div className="nk-search-demo__group">
        <p className="nk-search-demo__lbl">Live search: type to filter, Enter submits, ✕ / Esc clears</p>
        <SearchField
          label="Search sessions"
          value={query}
          onChange={setQuery}
          onSubmit={() => setSubmits((c) => c + 1)}
          placeholder="Search sessions…"
          shortcut="⌘K"
        />
        <p aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </p>
        <NockerlSurface className="nk-search__results">
          {results.length === 0 ? (
            <div className="nk-search__empty">
              <p className="nk-search__empty-title">No matches</p>
              <p className="nk-search__empty-body">Nothing matches <b>{query}</b>. Try a different search.</p>
            </div>
          ) : (
            results.map((s) => (
              <div className="nk-search__row" key={s.primary}>
                <span className="nk-search__row-dot" style={{ background: STATUS_COLOR[s.status] }} aria-hidden="true" />
                <span className="nk-search__row-text">
                  <span className="nk-search__row-primary">{highlight(s.primary, query)}</span>
                  <span className="nk-search__row-secondary">{s.secondary}</span>
                </span>
              </div>
            ))
          )}
        </NockerlSurface>
      </div>

      <div className="nk-search-demo__group">
        <p className="nk-search-demo__lbl">Variants: shortcut hint, pill shape, compact toolbar size</p>
        <SearchField label="With ⌘K hint" value="" onChange={() => {}} placeholder="Search everything…" shortcut="⌘K" />
        <SearchField label="With / hint" value="" onChange={() => {}} placeholder="Press / to search…" shortcut="/" />
        <SearchField label="Pill shape" value="" onChange={() => {}} placeholder="Search the input bar…" shape="pill" />
        <SearchField label="Compact toolbar" value="" onChange={() => {}} placeholder="Filter…" size="sm" />
      </div>

      <div className="nk-search-demo__group">
        <p className="nk-search-demo__lbl">Recents, loading & disabled. Focus the first to see recent searches</p>
        <SearchField label="Search history" value="" onChange={() => {}} onPickRecent={() => {}}
          placeholder="Search transcriptions…" recents={['request timeout', 'vector memory', 'model routing']} />
        <SearchField label="Searching" value="vector" onChange={() => {}} loading placeholder="Search…" />
        <SearchField label="Locked search" value="" onChange={() => {}} disabled placeholder="Search unavailable" />
      </div>

      <p className="nk-search-demo__count">
        Filtering <b>{results.length}</b> of {SESSIONS.length} sessions · submitted <b>{submits}</b> {submits === 1 ? 'time' : 'times'}. The island is live.
      </p>
    </div>
  );
}
