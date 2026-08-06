/**
 * FormLayoutDemo: the live, interactive Nockerl FORM LAYOUT island for the web.
 *
 * Documents the COMPOSITION that arranges many fields into a coherent form, NOT
 * the individual field (see Text field) nor its validation (see Field validation).
 * The scaffold: grouped sections (header + description), label+field rows in
 * stacked vs two-column arrangements, the settings-style row (label+description
 * LEFT, control RIGHT), form-level required/optional treatment, and a
 * right-aligned, optionally-sticky actions footer (Cancel + Save).
 *
 * Sourced verbatim from the shipped apps (never the web dashboard):
 *   • Voice (Swift) `SettingsCard(title, info:)` is the canonical form SECTION: a
 *     lifted card with an UPPERCASE muted header (11pt, tracking .6) + optional ⓘ,
 *     content at spacing 12, the form a VStack(spacing: 16) capped at maxWidth 640;
 *     inline rows = `HStack { Text; Spacer(); Toggle().labelsHidden() }`.
 *     (AppSettingsView / SettingsView / SettingsComponents.)
 *   • Android (Compose) `SessionConfigFields` / `AvatarSettingsSheet` set the
 *     section RHYTHM: fields stacked `Spacer(16.dp)`, a section started by a
 *     `HorizontalDivider()` + a `labelMedium`/Medium header + `Spacer(12.dp)`; the
 *     settings row is `Row { Column(weight 1f){label+desc}; NockerlSwitch }`; the footer
 *     `Row(Arrangement.End){ GHOST Cancel; PRIMARY Save }` (spinner + "Saving…").
 *   • The field well + section header reuse this framework's Text-field + NockerlDivider
 *     vocabulary (recessed inset well; flush-left section label).
 *
 * Laws: a SECTION is a card that LIFTS (neutral shadow + top catch-light, no glow)
 * while its inputs SINK (recessed wells); cards 16px / controls 12px radius; fills
 * are STATIC (only transform/brightness/shadow animate); focus is an OUTLINE ring;
 * required = a status-colored * + a legend (never color alone); the Save fill label
 * is `--color-on-accent`. A real <form>: every control focusable, label-associated,
 * tab-ordered, ≥44px hit. TOKEN-REACTIVE: every color/font/radius/spacing/type is
 * a `var(--token)` (docs/demo-token-contract.md); literals are geometry only.
 */
import { useState } from 'react';
import { NockerlButton, NockerlCheckbox, NockerlIcon, NockerlIconButton, NockerlSegmentedControl, NockerlSelect, NockerlSurface, NockerlSwitch, NockerlTextArea, NockerlTextField, type ComposeContract, type NockerlSelectOption } from '@dizyx/nockerl-react';

type LayoutMode = 'single' | 'two';

// The Role / Theme picker option sets, which feed the real Select primitive (value/label).
const ROLE_OPTIONS: NockerlSelectOption[] = [
  { value: 'Head of Engineering', label: 'Head of Engineering' },
  { value: 'Engineer', label: 'Engineer' },
  { value: 'Designer', label: 'Designer' },
  { value: 'Product', label: 'Product' },
];
const THEME_OPTIONS: NockerlSelectOption[] = [
  { value: 'system', label: 'Match system' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

// ─── Scoped, token-only styles (the ButtonDemo pattern) ───────────────────────
const STYLES = `
.nk-form-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }

/* The toolbar that drives the live layout (kept off the form so it isn't a field). */
.nk-form-demo__bar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3) var(--space-5);
  margin: 0 0 var(--space-5); }
.nk-form-demo__legend { font-size: var(--font-size-12); color: var(--color-on-card-muted); display: inline-flex;
  align-items: center; gap: var(--space-1); }
.nk-form-demo__legend b { color: var(--color-status-error); font-weight: var(--font-weight-semibold); }

/* The FORM has a bounded width (Voice's maxWidth: 640) so sections, the grid, and the footer share one edge. */
.nk-form { max-width: 560px; display: flex; flex-direction: column; gap: var(--space-5); position: relative; }

/* ── A SECTION = a lifted CARD (depth lives here, lit from above) ──────────────
   NockerlSurface (card variant) supplies the fill, hairline, and 16px card radius. This rule
   keeps the section's OWN drop shadow (no level passed, so no .nk-surface--lN competes). */
.nk-fsec {
  padding: var(--space-5);
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen);
}
.nk-fsec__head { display: flex; flex-direction: column; gap: var(--space-1); margin: 0 0 var(--space-4); }
.nk-fsec__title { display: flex; align-items: baseline; gap: var(--space-2); }
/* The canonical Nockerl section header: uppercase, tracked, muted (Voice idiom). */
.nk-fsec__title b { font-size: var(--font-size-12); font-weight: var(--font-weight-semibold);
  letter-spacing: var(--font-tracking-tight); text-transform: uppercase; color: var(--color-on-card-muted); }
.nk-fsec__opt { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-medium); }
.nk-fsec__desc { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); margin: 0; }
/* MIRROR: the settings-grammar slots, API-aligned with compose/swift.
   headerAccessory: trailing the header, center-aligned (the InfoTip seat). The header
   flips to a row ONLY when the seat is filled, so a slotless section renders the exact
   pre-slot markup (resting pixel-identical). */
.nk-fsec__head--acc { flex-direction: row; align-items: center; gap: var(--space-3); }
.nk-fsec__head-txt { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.nk-fsec__acc { flex: 0 0 auto; display: inline-flex; align-items: center; }
/* footer: INSIDE the card under a full-bleed hairline (negative margins escape the
   card padding, mirroring the compose full-width divider), muted hint rhythm. The
   compose 10dp vertical = space-2 + space-0-5 exactly. */
.nk-fsec__foot { margin: var(--space-4) calc(-1 * var(--space-5)) calc(-1 * var(--space-5));
  border-top: var(--space-px) solid var(--color-card-hairline);
  padding: calc(var(--space-2) + var(--space-0-5)) var(--space-5);
  display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;
  font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); }
.nk-fsec__foot-txt { flex: 1 1 auto; min-width: 0; }

/* The field STACK. Two-column mode = a grid; a field can span both columns. */
.nk-fstack { display: grid; grid-template-columns: 1fr; gap: var(--space-4) var(--space-5); align-items: start; }
.nk-fstack--two { grid-template-columns: 1fr 1fr; }
.nk-fitem--span { grid-column: 1 / -1; }
/* the two-column alignment RULE: labels align, inputs align, the help-text row is
   RESERVED space (blank when absent): a pair is a 3-row subgrid band, never stacked flow.
   Single-column (and the mobile collapse) unwraps via display:contents, so the pair flows
   into the stack exactly as before. */
.nk-frow { display: contents; }
.nk-fstack--two .nk-frow {
  display: grid; grid-column: 1 / -1; grid-template-columns: subgrid;
  grid-template-rows: auto auto auto; row-gap: var(--space-1); align-items: start;
}
/* The fields DISSOLVE (display: contents) and their parts are placed DIRECTLY into the
   frow's three rows, label / well / help each an explicit grid-area (no subgrid-in-subgrid,
   no auto-placement). a11y intact: the DOM (label htmlFor, order) is unchanged. */
.nk-fstack--two .nk-frow > .nk-field,
.nk-fstack--two .nk-frow > .nk-sel { display: contents; }
.nk-fstack--two .nk-frow > :first-child .nk-field__label, .nk-fstack--two .nk-frow > :first-child .nk-sel__label { grid-area: 1 / 1; }
.nk-fstack--two .nk-frow > :first-child .nk-well { grid-area: 2 / 1; }
.nk-fstack--two .nk-frow > :first-child .nk-field__help, .nk-fstack--two .nk-frow > :first-child .nk-sel__help { grid-area: 3 / 1; }
.nk-fstack--two .nk-frow > :nth-child(2) .nk-field__label, .nk-fstack--two .nk-frow > :nth-child(2) .nk-sel__label { grid-area: 1 / 2; }
.nk-fstack--two .nk-frow > :nth-child(2) .nk-well { grid-area: 2 / 2; }
.nk-fstack--two .nk-frow > :nth-child(2) .nk-field__help, .nk-fstack--two .nk-frow > :nth-child(2) .nk-sel__help { grid-area: 3 / 2; }

/* The stacked label+field ROW and its recessed .nk-well select chrome were deleted
   when the two <select>s became the real Select primitive (NockerlWell trigger + lifted
   popover + persistent label, all owned by Select); its STYLES are injected once
   below. The Profile/Preferences selects now render Select directly in the grid. */

/* ── The settings-style ROW: label+description LEFT, control RIGHT ─────────── */
.nk-srow { display: flex; align-items: center; gap: var(--space-4); }
.nk-srow + .nk-srow { margin-top: var(--space-3); padding-top: var(--space-3);
  border-top: var(--space-px) solid var(--color-card-hairline); }
.nk-srow__text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-srow__label { font-size: var(--font-size-14); font-weight: var(--font-weight-medium); color: var(--color-on-card); }
.nk-srow__desc { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); }
.nk-srow__ctl { flex: 0 0 auto; display: inline-flex; align-items: center; }

/* ── The ACTIONS FOOTER: right-aligned, aligned to the form's width ───────── */
.nk-factions { display: flex; align-items: center; justify-content: flex-end; gap: var(--space-3); padding-top: var(--space-1); }
.nk-factions--sticky { position: sticky; bottom: 0; z-index: 1; margin-top: var(--space-1);
  padding: var(--space-3) var(--space-4); background: color-mix(in srgb, var(--color-canvas) 88%, transparent);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-card);
  box-shadow: 0 calc(-1 * var(--elevation-level1)) 16px -10px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight); }

/* A saved-confirmation line (status-success + a check, never color alone). */
.nk-form-demo__saved { font-size: var(--font-size-12); color: var(--color-status-success);
  display: inline-flex; align-items: center; gap: var(--space-1); }

/* Narrow stages collapse the two-column grid + de-stick the footer. */
@media (max-width: 560px) {
  .nk-fstack--two { grid-template-columns: 1fr; }
  .nk-fstack--two .nk-frow { display: contents; }   /* : collapsed mode flows fields with the stack gap */
  .nk-srow { align-items: flex-start; }
}
`;

// ─── Section: a lifted card with a header (uppercase muted) + description ──────
// Settings grammar (mirrored from compose / swift): two
// optional slots complete the "SettingsCard" usage. `headerAccessory` trails the
// header (the InfoTip seat) and `footer` sits inside the card under a hairline
// (hints or section actions). Both absent → the exact pre-slot markup renders
// (resting pixel-identical).
function FormSection({
  title,
  description,
  optional = false,
  headerAccessory,
  footer,
  children,
}: {
  title: string;
  description?: string;
  optional?: boolean;
  headerAccessory?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const headText = (
    <>
      <div className="nk-fsec__title">
        <b>{title}</b>
        {optional && <span className="nk-fsec__opt">Optional</span>}
      </div>
      {description && <p className="nk-fsec__desc">{description}</p>}
    </>
  );
  return (
    <NockerlSurface as="section" className="nk-fsec">
      {headerAccessory ? (
        <header className="nk-fsec__head nk-fsec__head--acc">
          <div className="nk-fsec__head-txt">{headText}</div>
          <div className="nk-fsec__acc">{headerAccessory}</div>
        </header>
      ) : (
        <header className="nk-fsec__head">{headText}</header>
      )}
      {children}
      {footer && <div className="nk-fsec__foot">{footer}</div>}
    </NockerlSurface>
  );
}

// The stacked label+field row helper (Field) was removed when its only two
// consumers (the Role + Theme <select>s) became the real Select primitive
// (which owns its own persistent label + recessed NockerlWell trigger). NockerlTextField /
// NockerlTextArea already own their labels; a two-column span still uses .nk-fitem--span.

// ─── A settings-style row: label+description LEFT, a control RIGHT ─────────────
function SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: () => React.ReactNode;
}) {
  return (
    <div className="nk-srow">
      <div className="nk-srow__text">
        <span className="nk-srow__label">{label}</span>
        {description && <span className="nk-srow__desc">{description}</span>}
      </div>
      <div className="nk-srow__ctl">{control()}</div>
    </div>
  );
}

// FormLayout is a form-scaffold CONTAINER: sections/rows wrap arbitrary field content → default '*'.
// It composes NockerlSurface (section card) + NockerlTextField / NockerlTextArea / NockerlSwitch / NockerlSegmentedControl / NockerlButton, the
// Role + Theme pickers as the real Select primitive, and the demo toolbar's NockerlCheckbox. No owns.
export const compose = {
  slots: {
    default: { accepts: '*' },
    // Settings-grammar slots (API-aligned with the compose/swift FormSection)
    headerAccessory: { accepts: '*', required: false },
    footer: { accepts: '*', required: false },
  },
} satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Form layout page. ONE realistic <form>
 * demonstrates the whole layout system:
 *   • two grouped SECTIONS ("Profile" required + "Preferences" optional), each a
 *     lifted card with an uppercase muted header + a description line;
 *   • label+field rows that switch between SINGLE-column (stacked) and TWO-column
 *     (a toggle); fields stay aligned to the grid, some span both columns;
 *   • a settings-style block: label+description LEFT, a real toggle RIGHT;
 *   • required (*) / Optional markers with a legend (never color alone);
 *   • a right-aligned ACTIONS footer (Cancel + Save), aligned to the form width,
 *     that can be made STICKY (a toggle), with a live Save → "Saving…" → saved flow.
 * Every control is real, focusable, label-associated, and tab-ordered.
 */
export default function FormLayoutDemo() {
  const [layout, setLayout] = useState<LayoutMode>('two');
  const [sticky, setSticky] = useState(false);

  // Live form state (so the island is provably interactive).
  const [name, setName] = useState('Ada Lovelace');
  const [handle, setHandle] = useState('maintainer');
  const [email, setEmail] = useState('user@example.com');
  const [role, setRole] = useState('Head of Engineering');
  const [bio, setBio] = useState('Building Nockerl on the side.');
  const [theme, setTheme] = useState('system');
  const [digest, setDigest] = useState(true);
  // Slots demo: the header (i) toggles the section-footer hint live.
  const [prefsHint, setPrefsHint] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaved(false);
    setSaving(true);
    // Simulated async save: holds the button, then shows the confirmation.
    window.setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 1100);
  };

  const stackClass = `nk-fstack${layout === 'two' ? ' nk-fstack--two' : ''}`;

  return (
    <div className="nk-form-demo">
      <style>{STYLES}</style>

      {/* Layout controls, NOT part of the form (so they aren't submitted). */}
      <div className="nk-form-demo__bar">
        <NockerlSegmentedControl
          segments={[
            { value: 'single', label: 'Single column' },
            { value: 'two', label: 'Two column' },
          ]}
          value={layout}
          onChange={(n) => setLayout(n as 'single' | 'two')}
          label="Form columns"
          size="sm"
        />
        <NockerlCheckbox checked={sticky} onChange={setSticky} label="Sticky actions footer" size="sm" />
        <span className="nk-form-demo__legend">
          <b aria-hidden="true">*</b> Required
        </span>
      </div>

      <form className="nk-form" onSubmit={onSubmit} aria-label="Account settings">
        {/* ── Section 1: Profile (required fields) ───────────────────────── */}
        <FormSection title="Profile" description="Shown on your sessions and in the team directory.">
          <div className={stackClass}>
            {/* a two-column PAIR is a .nk-frow: labels / inputs / help align as three
                shared GRID ROWS (subgrid), the help row RESERVED when a side lacks it. */}
            <div className="nk-frow">
              <NockerlTextField
                label="Full name"
                value={name}
                onChange={setName}
                helperText="Your display name across Nockerl."
              />
              <NockerlTextField label="Handle" value={handle} onChange={setHandle} leadingIcon="@" />
            </div>

            <div className="nk-fitem--span">
              <NockerlTextField label="Work email" type="email" value={email} onChange={setEmail} />
            </div>

            <NockerlSelect
              label="Role"
              options={ROLE_OPTIONS}
              value={role}
              onChange={setRole}
              helperText="Optional. Shown in the team directory."
            />

            <div className="nk-fitem--span">
              <NockerlTextArea
                label="Bio"
                value={bio}
                onChange={setBio}
                helperText="A sentence or two. Markdown is supported."
                minRows={2}
              />
            </div>
          </div>
        </FormSection>

        {/* ── Section 2: Preferences (settings rows + a stacked select) ───── */}
        <FormSection
          title="Preferences"
          optional
          description="Defaults for new sessions and how we reach you."
          headerAccessory={
            /* the InfoTip SEAT: a quiet ghost (i). Here it live-toggles the
               section-footer hint (a real behavior, the icon-interactivity canon). */
            <NockerlIconButton
              icon={
                <NockerlIcon>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5M12 8h.01" />
                </NockerlIcon>
              }
              label={prefsHint ? 'Hide preferences hint' : 'About these preferences'}
              size={28}
              onClick={() => setPrefsHint((v) => !v)}
            />
          }
          footer={
            prefsHint ? (
              <>
                <span className="nk-fsec__foot-txt">
                  Preferences sync to every session on this account within a minute.
                </span>
                <NockerlButton
                  text="Reset section"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTheme('system');
                    setDigest(true);
                    setMentions(true);
                  }}
                />
              </>
            ) : undefined
          }
        >
          <div className="nk-fstack" style={{ marginBottom: 'var(--space-4)' }}>
            <NockerlSelect
              label="Default theme"
              options={THEME_OPTIONS}
              value={theme}
              onChange={setTheme}
              helperText="Optional. The default for new sessions."
            />
          </div>

          {/* Settings rows: label + description LEFT, the toggle control RIGHT. */}
          <SettingRow
            label="Weekly digest"
            description="A Monday summary of every session's activity."
            control={() => <NockerlSwitch checked={digest} onChange={setDigest} ariaLabel="Weekly digest" />}
          />
          <SettingRow
            label="Mentions"
            description="Notify me when an agent needs a decision."
            control={() => <NockerlSwitch checked={mentions} onChange={setMentions} ariaLabel="Mentions" />}
          />
          <SettingRow
            label="Product updates"
            description="Occasional notes on new Nockerl features."
            control={() => <NockerlSwitch checked={marketing} onChange={setMarketing} ariaLabel="Product updates" />}
          />
        </FormSection>

        {/* ── The actions footer: right-aligned, aligned to the form width ── */}
        <div className={`nk-factions${sticky ? ' nk-factions--sticky' : ''}`}>
          {saved && !saving && (
            <span className="nk-form-demo__saved" role="status">
              <span aria-hidden="true">✓</span> Changes saved
            </span>
          )}
          <NockerlButton
            text="Cancel"
            variant="ghost"
            size="md"
            disabled={saving}
            onClick={() => {
              setSaved(false);
            }}
          />
          <NockerlButton
            text="Save changes"
            variant="primary"
            size="md"
            type="submit"
            loading={saving}
            loadingText="Saving…"
          />
        </div>
      </form>
    </div>
  );
}
