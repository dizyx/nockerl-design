/**
 * ComboboxDemo: the live, interactive Nockerl combobox island for the web.
 *
 * The combobox is the EDITABLE, FILTERABLE selector (distinct from a plain
 * select): a recessed text-field WELL + a LIFTED popover listbox you TYPE to
 * filter + keyboard nav. It composes three shipped Nockerl idioms (reused, not
 * imported): the field WELL (recessed, 12px radius, cyan focus OUTLINE), the
 * flat list-item option ROW on a lifted card, and the chip TOKEN for multi-select.
 *
 * Laws verbatim: fields SINK / the popover LIFTS (one light source); depth =
 * neutral drop shadow + top catch-light ONLY (no glow / colored shadow); a
 * SELECTED option = trailing check + faint cyan wash (never a fill swap) while
 * the ACTIVE keyboard row = neutral wash + cyan ring (selection ≠ activation);
 * fills are STATIC, so only brightness / transform / opacity animate; the popover
 * open freezes under prefers-reduced-motion.
 *
 * A11y: role=combobox well (aria-expanded / -controls / -activedescendant),
 * role=listbox popover, role=option rows. Type to filter, ↑↓ move the active
 * option, Enter selects, Esc closes, Backspace pops the last multi-select token.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (docs/demo-token-contract.md); literals are pure geometry only.
 */
import { useId, useMemo, useRef, useState } from 'react';
import { NockerlChip, NockerlIcon, NockerlListboxOption, NockerlSurface, NockerlWell, type ComposeContract } from '@dizyx/nockerl-react';

export type ComboStatus = 'success' | 'warning' | 'error' | 'info' | 'idle';

export interface ComboOption {
  value: string; // stable identity + selected-value carrier
  label: string; // primary line, the option's accessible name (label.large)
  secondary?: string; // supporting line under the label (body.small)
  status?: ComboStatus; // leading status mark: status colors only, never cyan
  group?: string; // bucket; options sharing a group render under one header
  disabled?: boolean; // inert + still legible (never invisible)
}

// The field WELL sinks; the popover CARD lifts. Fills are static, so only brightness /
// transform / opacity animate. All values are tokens; the dark stage resolves cyan to #0cc0df.
const STYLES = `
.nk-cmb-demo { font-family: var(--font-family-sans); max-width: 460px; }
.nk-cmb { display: flex; flex-direction: column; gap: var(--space-1); position: relative; }
.nk-cmb + .nk-cmb { margin-top: var(--space-5); }
.nk-cmb__label { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-card); line-height: var(--font-line-height-20); }
/* the recessed WELL: the sink recipe (fill, hairline, control radius, INNER shadow +
   top catch-light, hover, cyan focus OUTLINE, disabled, the field flex-row layout) now
   comes from the shared NockerlWell primitive (nk-well nk-well--field). This demo keeps only the
   token-holding layout that overrides NockerlWell's field base: vertical padding + wrap so
   selected chips can flow to a second line, plus the text cursor. Two-class specificity
   so it always beats NockerlWell's .nk-well--field regardless of injected-style order. */
.nk-well.nk-cmb__well { flex-wrap: wrap; padding: var(--space-1) var(--space-3); cursor: text; }
.nk-well.nk-cmb__well.is-disabled { cursor: not-allowed; }
.nk-cmb__icon { color: var(--color-on-card-muted); display: inline-flex; flex: 0 0 auto; }
.nk-cmb__icon svg { display: block; width: 18px; height: 18px; }
.nk-cmb__input { flex: 1 1 60px; min-width: 0; background: transparent; border: 0; outline: none;
  color: var(--color-on-card); font: inherit; font-size: var(--font-size-14); line-height: var(--font-line-height-20); padding: var(--space-2) 0; }
.nk-cmb__input::placeholder { color: color-mix(in srgb, var(--color-on-card-muted) 70%, transparent); }
.nk-cmb__input:disabled { color: var(--color-on-card-muted); cursor: not-allowed; -webkit-text-fill-color: var(--color-on-card-muted); }
/* trailing chevron, flips when open (transform, an interpolatable prop) */
.nk-cmb__chev { color: var(--color-on-card-muted); display: inline-flex; flex: 0 0 auto; transition: transform .16s cubic-bezier(.2,0,0,1); }
.nk-cmb__chev svg { display: block; width: 18px; height: 18px; }
.nk-cmb__well.is-focus .nk-cmb__chev { transform: rotate(180deg); }
/* inline async hint: a small spinner before the chevron */
.nk-cmb__spin { width: 15px; height: 15px; border-radius: var(--radius-pill); border: var(--space-0-5) solid var(--color-on-card-muted); border-top-color: transparent; display: inline-block; flex: 0 0 auto; animation: nk-cmb-sp .7s linear infinite; }
@keyframes nk-cmb-sp { to { transform: rotate(360deg); } }
/* multi-select TOKENS are the NockerlChip primitive in token mode (.nk-chip--token, self-injected).
   The bespoke .nk-cmb__token / .nk-cmb__token-x recipe is gone. */
/* the LIFTED popover CARD is where depth lives (lit from above: neutral drop shadow + top catch-light, never a glow).
   bg / hairline / panel-radius / sheen now come from <NockerlSurface variant="panel">; this rule adds only position + motion + the drift shadow. */
.nk-cmb-demo .nk-cmb__pop {
  position: absolute; left: 0; right: 0; top: calc(100% + var(--space-1)); z-index: 20; overflow: hidden;
  box-shadow: 0 var(--space-2) var(--elevation-level3) -8px color-mix(in srgb, var(--color-shadow-tint) 65%, transparent), var(--nk-surface-sheen);
  transform-origin: top center; animation: nk-cmb-pop .14s cubic-bezier(.2,0,0,1);
}
@keyframes nk-cmb-pop { from { opacity: 0; transform: translateY(-4px) scale(.985); } to { opacity: 1; transform: none; } }
.nk-cmb__list { list-style: none; margin: 0; padding: var(--space-1); max-height: 248px; overflow-y: auto; }
/* group header: a quiet caption above its bucket of options */
.nk-cmb__group { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); padding: var(--space-2) var(--space-2) var(--space-1); }
.nk-cmb__group:not(:first-child) { border-top: var(--space-px) solid var(--color-card-hairline); margin-top: var(--space-1); }
/* the option ROW is the shared NockerlListboxOption primitive (.nk-opt*); it self-injects its own CSS, including the typed-match mark highlight. */
/* empty / no-results: quiet, centered, never an error color */
.nk-cmb__empty { padding: var(--space-4) var(--space-3); text-align: center; font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-cmb__empty b { color: var(--color-on-card); font-weight: var(--font-weight-semibold); }
/* helper text under the well */
.nk-cmb__help { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); min-height: var(--font-line-height-16); }

@media (prefers-reduced-motion: reduce) {
  .nk-cmb__chev { transition: none; }
  .nk-cmb__pop { animation: none; }
}
.nk-cmb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-cmb-demo__group + .nk-cmb-demo__group { margin-top: var(--space-8); }
.nk-cmb-demo__count { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-8); }
.nk-cmb-demo__count b { color: var(--color-accent-primary); }
`;

// ─── Inline glyphs (stroke icons from the shared NockerlIcon primitive; CSS sizes each slot) ──
const IconSearch = (
  <NockerlIcon><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></NockerlIcon>
);
const IconChevron = <NockerlIcon name="chevronDown" />;

/** Case-insensitive substring filter (matches the Swift HistoryView idiom). */
function matches(option: ComboOption, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return option.label.toLowerCase().includes(q) || (option.secondary?.toLowerCase().includes(q) ?? false);
}

/** Render a label with the matched run highlighted (a <mark>, not color alone). */
function highlight(label: string, query: string) {
  if (!query) return label;
  const i = label.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return label;
  return (
    <>
      {label.slice(0, i)}
      <mark>{label.slice(i, i + query.length)}</mark>
      {label.slice(i + query.length)}
    </>
  );
}

interface OptionRowProps {
  option: ComboOption; id: string; query: string; selected: boolean; active: boolean;
  onActivate: () => void; onCommit: () => void;
}

/** One flat option ROW: the shared NockerlListboxOption primitive (leading mark → primary+secondary → check). */
function OptionRow({ option: o, id, query, selected, active, onActivate, onCommit }: OptionRowProps) {
  return (
    <NockerlListboxOption
      id={id}
      primary={highlight(o.label, query)}
      secondary={o.secondary}
      status={o.status}
      selected={selected}
      active={active}
      disabled={o.disabled}
      onActivate={onActivate}
      onSelect={onCommit}
    />
  );
}

/** A removable multi-select TOKEN: the NockerlChip primitive in `token` mode (a NON-button
 *  <span> tag with a span[role=button] ✕), so it can sit inside the field without a
 *  nested real <button>. */
function Token({ label, disabled, onRemove }: { label: string; disabled?: boolean; onRemove: () => void }) {
  return <NockerlChip token text={label} disabled={disabled} onRemove={onRemove} />;
}

interface ComboboxProps {
  label: string; // persistent label above the well, never a placeholder
  options: ComboOption[]; // full set; filtered live by what is typed
  value: string | string[]; // single value, or the set in multi-select
  onSelect: (value: string) => void; // commit a selection (the option value)
  multiple?: boolean; // render selected values as removable tokens in the well
  onRemove?: (value: string) => void; // remove a token (multi-select)
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  loading?: boolean; // inline spinner + a "searching" empty hint (async source)
  grouped?: boolean; // bucket options under their `group` header
}

/** A single Nockerl combobox: the unit the spec documents. */
function Combobox({
  label, options, value, onSelect, multiple = false, onRemove,
  placeholder, helperText, disabled = false, loading = false, grouped = false,
}: ComboboxProps) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selectedSet = useMemo(
    () => new Set(Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );
  const filtered = useMemo(() => options.filter((o) => matches(o, query)), [options, query]);
  // The selectable (non-disabled) rows are what the keyboard cursor walks.
  const navigable = useMemo(() => filtered.filter((o) => !o.disabled), [filtered]);
  const selectedOption = !multiple
    ? options.find((o) => selectedSet.has(o.value))
    : undefined;

  const clampActive = (i: number) => (navigable.length === 0 ? 0 : (i + navigable.length) % navigable.length);

  const openPop = () => {
    if (disabled) return;
    setOpen(true);
  };

  const commit = (option: ComboOption) => {
    if (option.disabled) return;
    onSelect(option.value);
    if (multiple) {
      setQuery('');
    } else {
      setOpen(false);
      setQuery('');
    }
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive((i) => clampActive(i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive((i) => clampActive(i - 1));
    } else if (e.key === 'Enter') {
      if (open && navigable[active]) {
        e.preventDefault();
        commit(navigable[active]!);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === 'Backspace' && multiple && query === '' && selectedSet.size > 0) {
      // Backspace on an empty input pops the last token (the chip-removal idiom).
      const last = Array.from(selectedSet).at(-1);
      if (last) onRemove?.(last);
    }
  };

  const activeId = navigable[active] ? `${id}-opt-${navigable[active]!.value}` : undefined;

  // Build the rendered list (with optional group headers), tracking the running
  // navigable index so the keyboard cursor lines up with what is on screen.
  let navIndex = -1;
  let lastGroup: string | undefined;
  const rows = filtered.map((o) => {
    if (!o.disabled) navIndex += 1;
    const thisNav = navIndex;
    const header =
      grouped && o.group && o.group !== lastGroup ? ((lastGroup = o.group), o.group) : null;
    return (
      <li key={o.value} role="presentation" style={{ listStyle: 'none' }}>
        {header && <div className="nk-cmb__group" role="presentation">{header}</div>}
        <OptionRow
          option={o}
          id={`${id}-opt-${o.value}`}
          query={query}
          selected={selectedSet.has(o.value)}
          active={!o.disabled && thisNav === active}
          onActivate={() => !o.disabled && setActive(thisNav)}
          onCommit={() => commit(o)}
        />
      </li>
    );
  });

  // Single-select shows the chosen label in the field unless the user is typing.
  const inputValue = multiple ? query : open ? query : selectedOption?.label ?? query;

  return (
    <div className="nk-cmb">
      <label className="nk-cmb__label" htmlFor={id}>
        {label}
      </label>
      <NockerlWell
        layout="field"
        className={['nk-cmb__well', open && !disabled ? 'is-focus' : '', disabled ? 'is-disabled' : '']
          .filter(Boolean)
          .join(' ')}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        <span className="nk-cmb__icon" aria-hidden="true">{IconSearch}</span>
        {multiple &&
          Array.from(selectedSet).map((v) => (
            <Token
              key={v}
              label={options.find((o) => o.value === v)?.label ?? v}
              disabled={disabled}
              onRemove={() => onRemove?.(v)}
            />
          ))}
        <input
          id={id}
          ref={inputRef}
          type="text"
          className="nk-cmb__input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? activeId : undefined}
          autoComplete="off"
          spellCheck={false}
          value={inputValue}
          placeholder={multiple && selectedSet.size > 0 ? '' : placeholder}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={openPop}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
        />
        {loading && <span className="nk-cmb__spin" aria-hidden="true" />}
        <span className="nk-cmb__chev" aria-hidden="true">{IconChevron}</span>
      </NockerlWell>

      {open && !disabled && (
        <NockerlSurface variant="panel" className="nk-cmb__pop">
          <ul className="nk-cmb__list" id={listId} role="listbox" aria-label={label}>
            {filtered.length === 0 ? (
              <li role="presentation">
                <div className="nk-cmb__empty">
                  {loading ? (
                    'Searching…'
                  ) : (
                    <>
                      No matches for <b>{query}</b>
                    </>
                  )}
                </div>
              </li>
            ) : (
              rows
            )}
          </ul>
        </NockerlSurface>
      )}

      {helperText && <p className="nk-cmb__help">{helperText}</p>}
    </div>
  );
}

// ─── Demo data: real Nockerl surfaces (projects, models, sessions) ────────────
const PROJECTS: ComboOption[] = [
  { value: 'nockerl-design', label: 'nockerl-design', secondary: 'Design framework · dizyx', status: 'info' },
  { value: 'api-server', label: 'api-server', secondary: 'API · service layer', status: 'success' },
  { value: 'nockerl-dashboard', label: 'nockerl-dashboard', secondary: 'Control plane · web + Android', status: 'success' },
  { value: 'credential-store', label: 'credential-store', secondary: 'Credential store', status: 'warning' },
  { value: 'nockerl-voice', label: 'nockerl-voice', secondary: 'macOS dictation', status: 'idle' },
  { value: 'dueydo', label: 'dueydo', secondary: 'Failed deploy · build exited 1', status: 'error', disabled: true },
];

const MODELS: ComboOption[] = [
  { value: 'large-2-0', label: 'Large 2.0', secondary: 'the provider · coding', group: 'Cloud' },
  { value: 'medium-4-6', label: 'Cloud Agent Medium 4.6', secondary: 'the provider · fast', group: 'Cloud' },
  { value: 'qwen3-32b', label: 'Qwen3 32B', secondary: 'local cluster · local', group: 'Local' },
  { value: 'mimo-v2-5', label: 'MiMo V2.5', secondary: 'local cluster · omni / ASR', group: 'Local' },
  { value: 'embed-4b', label: 'Qwen3-Embedding 4B', secondary: 'local cluster · 2560-dim', group: 'Local' },
];

const TAGS: ComboOption[] = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'compose', label: 'Jetpack Compose' },
  { value: 'swiftui', label: 'SwiftUI' },
  { value: 'hono', label: 'Hono' },
  { value: 'drizzle', label: 'Drizzle ORM' },
  { value: 'vector', label: 'Vector store' },
  { value: 'bun', label: 'Bun' },
];

/**
 * The interactive showcase: a single-select project picker (typed filter +
 * selected check), a grouped model picker, a multi-select tag field with
 * removable tokens, plus async-loading and disabled fields. Fully keyboard-operable.
 */
// LEAF. The combobox IS the editable-select primitive: it OWNS the real filter <input role="combobox"> it renders (it is the field, not a NockerlTextField facsimile) + composes NockerlChip (multi-select tokens, token mode) / NockerlListboxOption / NockerlSurface / NockerlWell / NockerlIcon.
export const compose = { tier: 'leaf', owns: ['input'] } satisfies ComposeContract;

export default function ComboboxDemo() {
  const [project, setProject] = useState('api-server');
  const [model, setModel] = useState('large-2-0');
  const [tags, setTags] = useState<string[]>(['typescript', 'compose']);
  const [picks, setPicks] = useState(0);

  const choose = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPicks((c) => c + 1);
  };

  const addTag = (v: string) => {
    setTags((prev) => (prev.includes(v) ? prev.filter((t) => t !== v) : [...prev, v]));
    setPicks((c) => c + 1);
  };
  const removeTag = (v: string) => setTags((prev) => prev.filter((t) => t !== v));

  return (
    <div className="nk-cmb-demo">
      <style>{STYLES}</style>

      <div className="nk-cmb-demo__group">
        <p className="nk-cmb-demo__lbl">Single-select: type to filter, ↑↓ to move, Enter to pick</p>
        <Combobox label="Project" options={PROJECTS} value={project} onSelect={choose(setProject)}
          placeholder="Search projects…" helperText="Leading status mark · selected row gets a cyan check." />
      </div>

      <div className="nk-cmb-demo__group">
        <p className="nk-cmb-demo__lbl">Grouped options: leading + secondary text under a header</p>
        <Combobox label="Model" options={MODELS} value={model} onSelect={choose(setModel)} grouped
          placeholder="Search models…" helperText="Cloud and local engines, bucketed." />
      </div>

      <div className="nk-cmb-demo__group">
        <p className="nk-cmb-demo__lbl">Multi-select: removable tokens (Backspace pops the last)</p>
        <Combobox label="Stack tags" options={TAGS} value={tags} onSelect={addTag} onRemove={removeTag} multiple
          placeholder={tags.length ? 'Add another…' : 'Search tags…'} helperText="Selected values live as chips inside the field." />
      </div>

      <div className="nk-cmb-demo__group">
        <p className="nk-cmb-demo__lbl">Async + disabled</p>
        <Combobox label="Remote source (loading)" options={[]} value="" onSelect={() => {}} loading
          placeholder="Fetching options…" helperText="Inline spinner; the list shows a Searching… hint." />
        <Combobox label="Locked field" options={PROJECTS} value="api-server" onSelect={() => {}} disabled
          helperText="Inert, but still legible." />
      </div>

      <p className="nk-cmb-demo__count">
        Committed <b>{picks}</b> {picks === 1 ? 'selection' : 'selections'}. The island is live.
      </p>
    </div>
  );
}
