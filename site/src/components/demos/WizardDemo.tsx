/**
 * WizardDemo: the live, interactive Nockerl WIZARD island for the web.
 *
 * The guided multi-step FLOW container, NOT the bare step indicator (see
 * NockerlStepper) and NOT the form scaffold (see Form layout). A wizard OWNS a step
 * indicator + the active step's content panel + a Back / Next / Finish footer +
 * validation gating (can't advance past a step until its required field is
 * filled) + a final REVIEW step + a completed state. It USES a stepper inside it.
 *
 * Sourced from the real apps (read-only, never the web dashboard's look). The
 * flow IS the shipped "Create session" path (Android `SessionCreationSheet` +
 * web `SessionCreationForm`): Name (required) → Engine/harness radio (Cloud Agent
 * Code / Local Engine, IMMUTABLE after creation) → Provider (required, "Select a
 * provider") → Model (optional, "Provider default"); those exact fields + copy
 * are reproduced here. Both apps render it as ONE sheet and Voice's
 * `OnboardingView` is a status checklist; neither ships a paged Back/Next
 * wizard, so the FLOW CONTAINER is designed ORIGINALLY from the laws + NockerlStepper +
 * Form-layout vocabulary (drift flagged on the page).
 *
 * Laws: the indicator IS the real NockerlStepper primitive (done = cyan accent, current =
 * cyan gradient anchor, upcoming = recessed muted, connector = divider track + accent
 * fill): no green in the system, and one edit changes every stepper; content
 * sits on a lifted card (neutral shadow + top catch-light, no glow) while inputs
 * SINK into recessed wells; the primary Next/Finish is a static cyan fill whose
 * label is `--color-on-accent`, Back is secondary; feedback animates transform/
 * brightness/opacity only (never a fill swap); the step slide freezes under
 * prefers-reduced-motion; focus is an OUTLINE ring; errors are color + icon +
 * text + aria-live/aria-invalid (never color alone); focus moves to the new
 * step's heading on each transition. TOKEN-REACTIVE: every visual value is a
 * `var(--token)`; literals are pure geometry only.
 */
import { useEffect, useRef, useState } from 'react';
import { NockerlButton, NockerlIcon, NockerlListItem, NockerlRadioGroup, NockerlSelect, NockerlStepper, NockerlSurface, NockerlTextField, type ComposeContract, type NockerlSelectOption } from '@dizyx/nockerl-react';

// ─── Scoped, token-only styles (the ButtonDemo pattern) ───────────────────────
const STYLES = `
.nk-wz-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }

/* The wizard is a bounded, lifted CARD; depth lives here (lit from above).
   NockerlSurface (card variant) supplies the fill, hairline, and 16px card radius. This rule
   keeps the wizard's OWN drop shadow (no level passed, so no .nk-surface--lN competes). */
.nk-wz {
  max-width: 540px; display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen);
}
.nk-wz__head { padding: var(--space-5) var(--space-5) var(--space-4); }
.nk-wz__eyebrow { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }

/* ── The internal STEP INDICATOR is the real NockerlStepper primitive (composed below).
   It owns the disc + connector + status recipe (done = cyan, no green in the system);
   this demo no longer hand-rolls it. All former .nk-wz__steps / __item / __conn /
   __node / __disc / __steplab rules were deleted when the NockerlStepper was composed in. */

/* ── The CONTENT PANEL: the active step's body, aligned to the indicator width ── */
.nk-wz__body { position: relative; padding: var(--space-1) var(--space-5) var(--space-5); border-top: var(--space-px) solid var(--color-card-hairline); margin-top: var(--space-2); }
.nk-wz__panel { animation: nk-wz-in .26s cubic-bezier(.2,0,0,1); }
.nk-wz__panel--back { animation-name: nk-wz-in-back; }
@keyframes nk-wz-in { from { opacity: 0; transform: translateX(var(--space-3)); } to { opacity: 1; transform: none; } }
@keyframes nk-wz-in-back { from { opacity: 0; transform: translateX(calc(-1 * var(--space-3))); } to { opacity: 1; transform: none; } }
.nk-wz__title { font-size: var(--font-size-18); font-weight: var(--font-weight-semibold); line-height: var(--font-line-height-24); color: var(--color-on-card); margin: var(--space-4) 0 var(--space-1); }
.nk-wz__title:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-1); border-radius: var(--radius-control); }
.nk-wz__sub { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); margin: 0 0 var(--space-4); }

/* The Provider / Model pickers are the real Select primitive (recessed well trigger +
   lifted popover + persistent label + helper/error line, all owned by Select). The
   former hand-rolled .nk-wz__fld / __lbl / __req / __opt / __hint, the recessed .nk-well*
   select chrome, and the inline .nk-wz__err line were deleted when Select was composed in;
   its STYLES are injected once below. */

/* ── ENGINE picker: the real NockerlRadioGroup primitive (card variant, horizontal).
   It owns the circle + dot + selection ring + roving keyboard; the former
   .nk-wz__radios / __radio / __radio-name / __radio-tick / __radio-desc rules
   were deleted when the primitive was composed in. */

/* ── REVIEW step: a recessed summary list; each row jumps back to its step ────
   The rows are now the real NockerlListItem primitive (flat rows + hairline dividers + a
   trailing nav chevron, owned by NockerlListItem). This block keeps only the recessed FRAME
   the rows sit in (so they read as lifted on a sunk well) + clips the rounded corners;
   the former .nk-wz__srow / __skey / __sval / __sval--muted / __sedit rules were
   deleted when NockerlListItem was composed in. */
.nk-wz__note { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); display: inline-flex; align-items: center; gap: var(--space-1); margin: 0 0 var(--space-3); }
.nk-wz__note svg { display: block; width: 14px; height: 14px; color: var(--color-accent-primary); }
.nk-wz__summary { margin: 0 0 var(--space-1); border-radius: var(--radius-control); overflow: hidden; background: var(--color-canvas-alt); border: var(--space-px) solid var(--color-outline-subtle); box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 35%, transparent); }

/* ── The navigation FOOTER: Back LEFT, Next/Finish RIGHT (right-aligned actions) ── */
.nk-wz__foot { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-top: var(--space-px) solid var(--color-card-hairline); background: color-mix(in srgb, var(--color-canvas) 35%, transparent); }
.nk-wz__spacer { flex: 1 1 auto; }

/* ── The COMPLETED state: a success seal + summary, replacing the flow ──────── */
.nk-wz__done { padding: var(--space-8) var(--space-6); display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-2); animation: nk-wz-in .3s cubic-bezier(.2,0,0,1); }
.nk-wz__seal { width: var(--space-12); height: var(--space-12); border-radius: var(--radius-pill); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-2); background: var(--color-accent-primary); color: var(--color-on-accent); box-shadow: 0 var(--elevation-level2) 14px -6px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-wz__seal svg { display: block; width: var(--space-6); height: var(--space-6); }
.nk-wz__done-title { font-size: var(--font-size-18); font-weight: var(--font-weight-semibold); color: var(--color-on-card); }
.nk-wz__done-title:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-1); border-radius: var(--radius-control); }
.nk-wz__done-sub { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); max-width: 34ch; }
.nk-wz-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-wz-demo__count b { color: var(--color-accent-primary); }

@media (prefers-reduced-motion: reduce) {
  .nk-wz__panel, .nk-wz__panel--back, .nk-wz__done { animation: none; }
}
`;

// ─── Inline glyphs (stroke icons use currentColor so each surface tints) ──────
// Rendered via the shared NockerlIcon primitive (the canonical 0 0 24 24 stroke shell);
// these carry the wizard's 2.4 stroke weight (the chevron stays at 2). CSS sizes them.
const IconCheck = <NockerlIcon name="check" strokeWidth={2.4} />;
const IconArrowL = (<NockerlIcon strokeWidth={2.4}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></NockerlIcon>);
const IconArrowR = (<NockerlIcon strokeWidth={2.4}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></NockerlIcon>);

// ─── The real "Create session" data (Android SessionCreationSheet / web form) ──
const STEPS = ['Basics', 'Model', 'Review'] as const;
type Engine = 'cloud-agent' | 'api-server';
const ENGINES: ReadonlyArray<{ value: Engine; label: string; desc: string }> = [
  { value: 'cloud-agent', label: 'Cloud Agent', desc: 'Cloud Agent SDK coding sessions.' },
  { value: 'api-server', label: 'Local Engine', desc: 'Local + cloud, our context mgmt.' },
];
// Providers are filtered by engine, exactly as the apps do (filterProvidersByEngine).
const PROVIDERS: Record<Engine, string[]> = {
  'cloud-agent': ['cloud-personal', 'cloud-personal-2', 'cloud-work'],
  'api-server': ['local', 'openrouter'],
};
const MODELS: Record<string, string[]> = {
  'cloud-personal': ['Large 2.0', 'Medium 4.6', 'Small 4.6'],
  'cloud-personal-2': ['Large 2.0', 'Medium 4.6'],
  'cloud-work': ['Large 2.0', 'Medium 4.6'],
  local: ['Qwen3-Coder-480B', 'GLM-4.6'],
  openrouter: ['Gemini 2.5 Pro', 'GPT-5.2', 'Llama-4-Maverick'],
};

const ENGINE_LABEL: Record<Engine, string> = { 'cloud-agent': 'Cloud Agent', 'api-server': 'Local Engine' };

// Wizard is a LEAF flow container: steps are DATA (STEPS[]) + internal step content; no component
// slot. It composes NockerlStepper (indicator), NockerlRadioGroup (harness), NockerlTextField (name), Select (the
// Provider/Model pickers), NockerlListItem (the Review summary rows), NockerlButton (nav), and NockerlSurface (the card).
// No owns.
export const compose = {
  tier: 'leaf',
} satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Wizard page: a working 3-step
 * "Create session" flow that runs Basics (Name + Engine) → Model (Provider + Model) →
 * Review (summary, edit any step) → Finish → a completed seal. The step
 * indicator tracks progress; Back is disabled on step 1; Next is gated until the
 * step's required field is filled (else an inline error); completed steps are
 * clickable; focus moves to each step's heading. Token-driven, keyboard-operable.
 */
export default function WizardDemo() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [done, setDone] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Live flow state (the real session-creation fields).
  const [name, setName] = useState('');
  const [engine, setEngine] = useState<Engine>('cloud-agent');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState(''); // '' = Provider default (optional)

  // Per-step "have we tried to advance" → only then surface the inline error.
  const [tried, setTried] = useState<boolean[]>([false, false, false]);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  // Skip the FIRST run of the focus effect: on initial page load nothing should be
  // focused (a fresh demo must load calm, with no ring on an element the user never touched).
  // Focus only moves once the user actually advances / goes back / finishes a step.
  const didMountFocus = useRef(false);

  const nameInvalid = name.trim().length === 0;
  const providerInvalid = provider.length === 0;
  const stepInvalid = (s: number) => (s === 0 ? nameInvalid : s === 1 ? providerInvalid : false);
  const showNameErr = tried[0] && nameInvalid;
  const showProviderErr = tried[1] && providerInvalid;

  // Move focus to the new step's heading (or the completed seal) on transition, but NOT
  // on the initial mount (that would auto-ring the first step's heading on page load). The
  // first effect run is the mount; we no-op it, then move focus on every real step change.
  useEffect(() => {
    if (!didMountFocus.current) {
      didMountFocus.current = true;
      return;
    }
    if (done) doneRef.current?.focus();
    else headingRef.current?.focus();
  }, [step, done]);

  const markTried = (s: number) => setTried((t) => t.map((v, i) => (i === s ? true : v)));

  const goTo = (target: number, direction: 'fwd' | 'back') => {
    setDir(direction);
    setStep(target);
  };

  const next = () => {
    if (stepInvalid(step)) {
      markTried(step);
      return;
    }
    if (step < STEPS.length - 1) goTo(step + 1, 'fwd');
  };
  const back = () => {
    if (step > 0) goTo(step - 1, 'back');
  };
  const finish = () => {
    if (finishing) return;
    setFinishing(true);
    // Simulated async create: holds the button, then reveals the completed seal.
    window.setTimeout(() => {
      setFinishing(false);
      setDone(true);
    }, 1100);
  };
  const restart = () => {
    setDone(false); setStep(0); setDir('back'); setName(''); setEngine('cloud-agent');
    setProvider(''); setModel(''); setTried([false, false, false]);
  };

  const isLast = step === STEPS.length - 1;
  // The Provider / Model string lists become Select options; Model keeps an explicit
  // "Provider default" ('' value) option so it stays reselectable (as the raw <select> was).
  const providerOptions: NockerlSelectOption[] = PROVIDERS[engine].map((p) => ({ value: p, label: p }));
  const modelOptions: NockerlSelectOption[] = [
    { value: '', label: 'Provider default' },
    ...(provider ? (MODELS[provider] ?? []) : []).map((m) => ({ value: m, label: m })),
  ];

  // ── The internal step indicator IS the real NockerlStepper primitive (done = cyan, no
  // green). When the flow is complete every step reads done, so we point current PAST
  // the last index; otherwise it tracks the active step. Completed discs are clickable
  // to jump back (the NockerlStepper turns done steps into real buttons when onStepClick is
  // set); forward jumps stay gated, so we only navigate when the target is behind us. */
  const indicator = (
    <NockerlStepper
      steps={STEPS.map((label) => ({ label }))}
      current={done ? STEPS.length : step}
      orientation="horizontal"
      onStepClick={(i) => {
        if (i < step) goTo(i, 'back');
      }}
    />
  );

  return (
    <div className="nk-wz-demo">
      <style>{STYLES}</style>

      <NockerlSurface as="section" className="nk-wz" aria-label="Create session">
        <header className="nk-wz__head">
          <p className="nk-wz__eyebrow">Create session · {STEPS[step]}</p>
          {indicator}
        </header>

        {done ? (
          // ── COMPLETED STATE ──
          <div className="nk-wz__done" role="status">
            <span className="nk-wz__seal" aria-hidden="true">{IconCheck}</span>
            <p className="nk-wz__done-title" tabIndex={-1} ref={doneRef}>Session created</p>
            <p className="nk-wz__done-sub">
              “{name.trim()}” is live on {ENGINE_LABEL[engine]} · {provider} · {model || 'provider default'}.
            </p>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <NockerlButton text="Create another" variant="secondary" size="md" onClick={restart} />
            </div>
          </div>
        ) : (
          <>
            {/* ── The active step's CONTENT PANEL ── */}
            <div className="nk-wz__body">
              <div className={`nk-wz__panel${dir === 'back' ? ' nk-wz__panel--back' : ''}`} key={step}>

                {step === 0 && (
                  <>
                    <h3 className="nk-wz__title" tabIndex={-1} ref={headingRef}>Basics</h3>
                    <p className="nk-wz__sub">Name the session and choose its harness. The harness is immutable after creation.</p>

                    <NockerlTextField
                      label="Session name"
                      value={name}
                      onChange={setName}
                      placeholder="Feature work"
                      helperText="Shown on the session chip and in the switcher."
                      errorText={showNameErr ? 'Give the session a name to continue.' : undefined}
                    />

                    <NockerlRadioGroup
                      label="Harness"
                      variant="card"
                      orientation="horizontal"
                      options={ENGINES.map((e) => ({ value: e.value, label: e.label, description: e.desc }))}
                      value={engine}
                      onChange={(v) => { setEngine(v as Engine); setProvider(''); setModel(''); }}
                    />
                  </>
                )}

                {step === 1 && (
                  <>
                    <h3 className="nk-wz__title" tabIndex={-1} ref={headingRef}>Model</h3>
                    <p className="nk-wz__sub">Pick a provider for {ENGINE_LABEL[engine]}, then an optional model.</p>

                    <NockerlSelect
                      label="Provider"
                      options={providerOptions}
                      value={provider || null}
                      onChange={(v) => { setProvider(v); setModel(''); }}
                      placeholder="Select a provider"
                      errorText={showProviderErr ? 'Choose a provider to continue.' : undefined}
                    />

                    <NockerlSelect
                      label="Model"
                      options={modelOptions}
                      value={model}
                      onChange={setModel}
                      placeholder="Provider default"
                      disabled={!provider}
                      helperText="Leave as provider default to inherit the registry pick."
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <h3 className="nk-wz__title" tabIndex={-1} ref={headingRef}>Review</h3>
                    <p className="nk-wz__note">{IconCheck} Everything checks out. Review and create.</p>
                    {/* Each summary row is a NockerlListItem: the value is the primary (emphasized)
                        line, the field name its supporting line, and a trailing nav chevron
                        replaces the "Edit" affordance; the whole row jumps back to its step. */}
                    <div className="nk-wz__summary">
                      <NockerlListItem primary={name.trim()} secondary="Name" chevron onSelect={() => goTo(0, 'back')} />
                      <NockerlListItem primary={ENGINE_LABEL[engine]} secondary="Harness" chevron onSelect={() => goTo(0, 'back')} />
                      <NockerlListItem primary={provider} secondary="Provider" chevron onSelect={() => goTo(1, 'back')} />
                      <NockerlListItem primary={model || 'Provider default'} secondary="Model" chevron onSelect={() => goTo(1, 'back')} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── The navigation FOOTER: Back left, Next/Finish right ── */}
            <div className="nk-wz__foot">
              <NockerlButton text="Back" variant="secondary" size="md" leadingIcon={IconArrowL} onClick={back} disabled={step === 0} />
              <span className="nk-wz__spacer" />
              {isLast ? (
                <NockerlButton text="Create session" variant="primary" size="md" onClick={finish} loading={finishing} loadingText="Creating…" />
              ) : (
                <NockerlButton text="Next" variant="primary" size="md" trailingIcon={IconArrowR} onClick={next} />
              )}
            </div>
          </>
        )}
      </NockerlSurface>

      <p className="nk-wz-demo__count">
        {done ? <>Flow <b>complete</b>. Session created.</> : <>On step <b>{step + 1}</b> of {STEPS.length} ({STEPS[step]}). The island is live.</>}
      </p>
    </div>
  );
}
