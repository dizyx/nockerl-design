/**
 * StepperDemo: the live, interactive Nockerl STEP-PROGRESS INDICATOR for the web.
 *
 * This is the step *tracker* primitive: the numbered/icon discs + connectors that
 * show where you are in a multi-step flow. It is NOT the wizard (no step content,
 * no next/back buttons; that container OWNS a NockerlStepper and drives it) and NOT the
 * progress-bar (that is one continuous fill; a NockerlStepper is discrete, named stops).
 *
 * The NockerlStepper itself now lives in ../primitives/NockerlStepper (the Tier-1 primitive, one
 * home for the disc + connector + status recipe). This file is the demo-only
 * scaffolding: the advance/retreat controls + the showcase. See that primitive for
 * the design laws encoded in the disc/connector/state vocabulary.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a `var(--token)` (see
 * docs/demo-token-contract.md). The dark stage resolves them to the dark palette;
 * change a token and this demo moves with everything else. Literals remain only for
 * pure glyph/track geometry (icon box, track thickness, transition curves).
 */
import { useState } from 'react';
import { NockerlButton, NockerlIcon, NockerlPageDots, NockerlStepper, type Step } from '@dizyx/nockerl-react';

// Demo-only scaffolding CSS: the page chrome (eyebrow labels, group spacing, the live
// count line) + the advance/retreat control buttons. The disc/connector/state recipe
// lives in the NockerlStepper primitive (NOCKERL_STEPPER_STYLES), injected by the mounted <NockerlStepper>s.
const STYLES = `
.nk-stp-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }
.nk-stp-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-stp-demo__group + .nk-stp-demo__group { margin-top: var(--space-8); }
.nk-stp-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-stp-demo__count b { color: var(--color-accent-primary); }

/* ── the advance / retreat control: real NockerlButton primitives in a flex row ── */
.nk-stp__ctl { display: inline-flex; gap: var(--space-2); margin-top: var(--space-4); }

`;

// ─── Per-step glyphs (icon variant), composed from the shared NockerlIcon primitive ──
// (stroke shell: viewBox 0 0 24 24, fill none, currentColor, round caps; heavier 2.4
// stroke to match the disc check/alert glyphs the NockerlStepper primitive draws).
const IconUser = (
  <NockerlIcon strokeWidth={2.4}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
  </NockerlIcon>
);
const IconCard = (
  <NockerlIcon strokeWidth={2.4}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M3 10h18" />
  </NockerlIcon>
);
const IconCheckList = (
  <NockerlIcon strokeWidth={2.4}>
    <path d="m4 7 2 2 3-3" />
    <path d="M13 7h7" />
    <path d="m4 16 2 2 3-3" />
    <path d="M13 16h7" />
  </NockerlIcon>
);

const H_STEPS: Step[] = [
  { label: 'Workspace' },
  { label: 'Provider' },
  { label: 'Model' },
  { label: 'Review' },
];

const V_STEPS: Step[] = [
  { label: 'Connect repository', description: 'dizyx/nockerl linked via the credential store' },
  { label: 'Pick a branch', description: 'main · 3 sessions ahead' },
  { label: 'Configure CI', description: 'typecheck · lint · build · test' },
  { label: 'Deploy', description: 'Zero-downtime swap' },
];

const ERR_STEPS: Step[] = [
  { label: 'Credentials', description: 'Credential scope confirmed' },
  { label: 'Allowlist scope', description: 'github-token-dizyx' },
  { label: 'Push to remote' },
  { label: 'Verify CI' },
];

const ICON_STEPS: Step[] = [
  { label: 'Account', icon: IconUser },
  { label: 'Billing', icon: IconCard },
  { label: 'Confirm', icon: IconCheckList },
];

/**
 * The interactive showcase mounted on the NockerlStepper page: a horizontal numbered
 * stepper you can advance/retreat (watch the discs + connector fills update live),
 * a vertical stepper with descriptions, an error stop, an icon-per-step variant
 * with check-on-done + clickable completed steps (jump back), and a compact
 * dots-only pager indicator. Everything is token-driven and keyboard-operable.
 */
export default function StepperDemo() {
  const [hCurrent, setHCurrent] = useState(1);
  const [iconCurrent, setIconCurrent] = useState(2);
  const [dot, setDot] = useState(2);
  const errCurrent = 2; // the push step failed

  const dots = 5;

  return (
    <div className="nk-stp-demo">
      <style>{STYLES}</style>

      {/* ── Horizontal · advance / retreat ── */}
      <div className="nk-stp-demo__group">
        <p className="nk-stp-demo__lbl">Horizontal: advance / retreat, watch the connectors fill</p>
        <NockerlStepper steps={H_STEPS} current={hCurrent} orientation="horizontal" />
        <div className="nk-stp__ctl">
          <NockerlButton
            text="Back"
            variant="secondary"
            size="sm"
            leadingIcon={<NockerlIcon path="m15 18-6-6 6-6" strokeWidth={2.4} />}
            onClick={() => setHCurrent((c) => Math.max(0, c - 1))}
            disabled={hCurrent === 0}
          />
          <NockerlButton
            text="Continue"
            variant="secondary"
            size="sm"
            trailingIcon={<NockerlIcon path="m9 18 6-6-6-6" strokeWidth={2.4} />}
            onClick={() => setHCurrent((c) => Math.min(H_STEPS.length - 1, c + 1))}
            disabled={hCurrent === H_STEPS.length - 1}
          />
        </div>
      </div>

      {/* ── Vertical · labels + descriptions ── */}
      <div className="nk-stp-demo__group">
        <p className="nk-stp-demo__lbl">Vertical: step labels + descriptions</p>
        <NockerlStepper steps={V_STEPS} current={2} orientation="vertical" />
      </div>

      {/* ── Error stop ── */}
      <div className="nk-stp-demo__group">
        <p className="nk-stp-demo__lbl">Error: the current step failed (color + icon + text, never color alone)</p>
        <NockerlStepper steps={ERR_STEPS} current={errCurrent} orientation="vertical" errorAt={errCurrent} />
      </div>

      {/* ── NockerlIcon-per-step + clickable completed steps ── */}
      <div className="nk-stp-demo__group">
        <p className="nk-stp-demo__lbl">
          Icons + clickable: done steps show a check; tab / click a completed step to jump back
        </p>
        <NockerlStepper
          steps={ICON_STEPS}
          current={iconCurrent}
          orientation="horizontal"
          onStepClick={(i) => setIconCurrent(i)}
        />
        <div className="nk-stp__ctl">
          <NockerlButton
            text="Advance"
            variant="secondary"
            size="sm"
            trailingIcon={<NockerlIcon path="m9 18 6-6-6-6" strokeWidth={2.4} />}
            onClick={() => setIconCurrent((c) => Math.min(ICON_STEPS.length - 1, c + 1))}
            disabled={iconCurrent === ICON_STEPS.length - 1}
          />
        </div>
      </div>

      {/* ── Compact dots-only pager ── */}
      <div className="nk-stp-demo__group">
        <p className="nk-stp-demo__lbl">Compact: dots-only pager indicator (onboarding / carousel)</p>
        {/* Compact page-dots pager - composes the NockerlPageDots primitive (page markers +
            aria-current on the active dot; distinct from NockerlStepper's numbered steps and from
            NockerlTabs, which owns tabpanels a pager has none of). */}
        <NockerlPageDots page={dot} count={dots} onChange={setDot} label="Pages" />
      </div>

      <p className="nk-stp-demo__count">
        Horizontal at step <b>{hCurrent + 1}</b> of {H_STEPS.length} · icons at step <b>{iconCurrent + 1}</b> · page{' '}
        <b>{dot + 1}</b> of {dots}. The island is live.
      </p>
    </div>
  );
}
