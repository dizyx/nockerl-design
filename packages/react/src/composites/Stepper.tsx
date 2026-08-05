/**
 * NockerlStepper - the Tier-1 STEP-PROGRESS INDICATOR primitive. ONE home for the status
 * discs + connectors that show where you are in a multi-step flow - so a future
 * stepper change is ONE edit, not many. Composes ONLY tokens.
 *
 * This is the step *tracker* primitive - the numbered/icon discs + connectors. It is
 * NOT the wizard (no step content, no next/back buttons - that container OWNS a NockerlStepper
 * and drives it) and NOT the progress-bar (that is one continuous fill; a NockerlStepper is
 * discrete, named stops).
 *
 * No formal stepper ships in Android or Voice yet, so the look is designed from the
 * laws + the real precedents (flagged honestly on the page as drift):
 *   - the disc DEPTH mirrors the apps' "lit from above" surfaces - a neutral drop
 *     shadow + a top catch-light inset, never a glow / colored shadow.
 *   - DONE uses the cyan accent (no green in the system), CURRENT uses the cyan accent
 *     with a gradient + outer ring (the one brand anchor), UPCOMING is a recessed muted
 *     well (echoing the segmented control's calm inactive state), ERROR uses the danger
 *     token - and is NEVER color-alone (icon + text + aria carry it too).
 *   - the connector is a recessed divider TRACK whose FILLED portion is the accent;
 *     advancing animates that fill's width (an interpolatable prop), never a fill
 *     swap - and it freezes under prefers-reduced-motion.
 *   - clickable (completed) steps are REAL <button>s in an ordered list, with a
 *     focus-visible ring, aria-current="step" on the current stop, and a spoken
 *     name like "Step 2 of 4: Details, completed".
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract.js';
import { NockerlIcon } from '../primitives/Icon.js';

export type StepStatus = 'done' | 'current' | 'upcoming' | 'error';
export type NockerlStepperOrientation = 'horizontal' | 'vertical';

export interface Step {
  /** Short label rendered under (horizontal) / beside (vertical) the disc. */
  label: string;
  /** Optional supporting line - vertical orientation only (body.small role). */
  description?: string;
  /** Optional per-step glyph; replaces the index when the step is not done/error. */
  icon?: React.ReactNode;
}

export interface NockerlStepperProps extends HTMLAttributes<HTMLOListElement> {
  steps: Step[];
  /** Index of the current (active) step. */
  current: number;
  orientation?: NockerlStepperOrientation;
  /** Index that is in an error state (only when it is also the current step). */
  errorAt?: number;
  /** Jump handler - when set, DONE steps become real buttons. */
  onStepClick?: (index: number) => void;
}

// Done = the cyan accent (no green in the system); current = the cyan accent with a
// gradient + outer ring; error = the DANGER token. Upcoming reads from a recessed muted
// well. Status is never carried by color alone - the disc also swaps its glyph and the
// row gets aria.
export const NOCKERL_STEPPER_STYLES = `
/* ── The disc: the lit-from-above stop. Depth = neutral shadow + top catch-light. ── */
.nk-stp__disc {
  position: relative; flex: 0 0 auto;
  width: var(--space-8); height: var(--space-8);          /* 32: clears the 24px web target */
  border-radius: var(--radius-pill);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: var(--font-size-14); font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums; line-height: 1;
  border: var(--space-px) solid transparent;
  transition: background-color .2s, border-color .2s, color .2s, transform .2s var(--motion-easing-standard), box-shadow .2s;
}
.nk-stp__disc svg { display: block; width: var(--space-4); height: var(--space-4); }   /* 16: tracks the spacing ramp */
/* DONE: filled CYAN (calm, no outer ring), lit from above, on-accent check. No green in
   the system; current stays distinct via its gradient + outer ring + number. */
.nk-stp__disc--done { background: var(--color-accent-primary); color: var(--color-on-accent);
  box-shadow: 0 var(--elevation-level1) var(--elevation-level3) -4px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* CURRENT: the cyan anchor, filled with a top catch-light, on-accent number + a soft outer ring */
.nk-stp__disc--current { color: var(--color-on-accent);
  background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary));
  box-shadow: 0 0 0 var(--space-1) var(--color-accent-primary-soft),
              0 var(--elevation-level2) 14px -6px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* UPCOMING: a recessed, calm muted well (inner shadow, not a lift) */
.nk-stp__disc--upcoming { background: var(--color-canvas-alt); color: var(--color-on-card-muted);
  border-color: var(--color-divider);
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 30%, transparent); }
/* ERROR: the danger token (+ glyph + text + aria; never color alone) */
.nk-stp__disc--error { background: var(--color-status-error); color: var(--color-on-accent);
  box-shadow: 0 var(--elevation-level1) var(--elevation-level3) -4px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }

/* ── A clickable (completed) stop is a REAL button: same disc, focusable, calm hover ── */
.nk-stp__node { display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: 0; padding: 0; margin: 0; cursor: pointer; font: inherit; color: inherit;
  border-radius: var(--radius-pill); }
.nk-stp__node:disabled { cursor: default; }
.nk-stp__node:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
.nk-stp__node:not(:disabled):hover .nk-stp__disc--done { filter: brightness(1.08); transform: translateY(-1px); }
.nk-stp__node:not(:disabled):active .nk-stp__disc { transform: scale(.94); }

/* ── HORIZONTAL: discs on one line, connectors centered between them, labels under ──
   each <li> is a flex ROW: [connector (flex)] then [disc + label column (fixed)]. The
   first item has no connector; the rest flex so spacing stays equal at any width. */
.nk-stp--h { list-style: none; margin: 0; padding: 0; display: flex; align-items: flex-start; width: 100%; }
.nk-stp--h .nk-stp__item { display: flex; align-items: flex-start; flex: 0 0 auto; }
.nk-stp--h .nk-stp__item--grow { flex: 1 1 0; min-width: 0; }
.nk-stp--h .nk-stp__col { display: flex; flex-direction: column; align-items: center; flex: 0 0 auto; gap: var(--space-2);
  width: calc(var(--space-16) + var(--space-2)); }   /* 72: fits the labels, keeps columns even */
/* the connector flexes in the gap and is vertically centered on the 32px disc row */
.nk-stp--h .nk-stp__conn { flex: 1 1 0; min-width: var(--space-5); height: 3px; margin-top: calc(var(--space-4) - var(--space-px));
  position: relative; align-self: flex-start; }
.nk-stp__track { position: absolute; inset: 0; border-radius: var(--radius-track); background: var(--color-divider);
  box-shadow: inset 0 var(--space-px) var(--space-px) color-mix(in srgb, var(--color-shadow-tint) 35%, transparent); }
.nk-stp__track-fill { position: absolute; inset: 0 auto 0 0; height: 100%; width: 0;
  border-radius: var(--radius-track); background: var(--color-accent-primary);
  transition: width .35s var(--motion-easing-standard); }

/* ── label block (shared) ── */
.nk-stp__lab { display: flex; flex-direction: column; gap: var(--space-0-5); min-width: 0; }
.nk-stp--h .nk-stp__lab { align-items: center; text-align: center; }
.nk-stp__title { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); line-height: var(--font-line-height-16);
  color: var(--color-on-card); white-space: nowrap; }
.nk-stp__title--muted { color: var(--color-on-card-muted); font-weight: var(--font-weight-regular); }
.nk-stp__title--error { color: var(--color-status-error); }
.nk-stp__desc { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); }
.nk-stp__hint { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-status-error);
  display: inline-flex; align-items: center; gap: var(--space-1); }

/* ── VERTICAL: disc + label per row, connector is the rail BELOW each disc ── */
.nk-stp--v { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; max-width: var(--size-container-lg); }
.nk-stp--v .nk-stp__item { display: grid; grid-template-columns: var(--space-8) 1fr; column-gap: var(--space-3); }
.nk-stp--v .nk-stp__rail { display: flex; flex-direction: column; align-items: center; }
.nk-stp--v .nk-stp__conn { width: 3px; flex: 1 1 auto; min-height: var(--space-5); margin: var(--space-1) 0;
  border-radius: var(--radius-track); background: var(--color-divider); position: relative; overflow: hidden;
  box-shadow: inset var(--space-px) 0 var(--space-px) color-mix(in srgb, var(--color-shadow-tint) 35%, transparent); }
.nk-stp--v .nk-stp__conn-fill { position: absolute; inset: 0 0 auto 0; width: 100%; height: 0;
  background: var(--color-accent-primary); transition: height .35s var(--motion-easing-standard); }
.nk-stp--v .nk-stp__body { padding-bottom: var(--space-5); padding-top: var(--space-1); }
.nk-stp--v .nk-stp__item:last-child .nk-stp__body { padding-bottom: 0; }
.nk-stp--v .nk-stp__title { white-space: normal; }

@media (prefers-reduced-motion: reduce) {
  .nk-stp__disc, .nk-stp__node .nk-stp__disc, .nk-stp__track-fill, .nk-stp--v .nk-stp__conn-fill { transition: none; }
}
`;

// ─── Inline glyphs (stroke icons in currentColor, so each disc tints correctly) ──
// Composed from the shared NockerlIcon primitive (stroke shell: viewBox 0 0 24 24, fill none,
// currentColor, round caps). These discs use a heavier strokeWidth (2.4).
const IconCheck = <NockerlIcon path="M20 6 9 17l-5-5" strokeWidth={2.4} />;
const IconAlert = (
  <NockerlIcon strokeWidth={2.4}>
    <path d="M12 8v5" />
    <path d="M12 16.5h.01" />
  </NockerlIcon>
);
const IconAlertSm = (
  <NockerlIcon size={14} strokeWidth={2.4}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </NockerlIcon>
);

/** Resolve the status of a step from its index against the current pointer. */
function statusFor(index: number, current: number, errorAt?: number): StepStatus {
  if (errorAt !== undefined && index === errorAt && index === current) return 'error';
  if (index < current) return 'done';
  if (index === current) return 'current';
  return 'upcoming';
}

const STATUS_WORD: Record<StepStatus, string> = {
  done: 'completed',
  current: 'current step',
  upcoming: 'not started',
  error: 'needs attention',
};

/** The disc glyph: a check when done, an alert when error, else the icon or index. */
function discContent(status: StepStatus, index: number, icon?: React.ReactNode) {
  if (status === 'done') return IconCheck;
  if (status === 'error') return IconAlert;
  if (icon) return icon;
  return index + 1;
}

/** One disc (presentational). Clickability is handled by the caller's wrapper. */
function Disc({ status, index, icon }: { status: StepStatus; index: number; icon?: React.ReactNode }) {
  return <span className={`nk-stp__disc nk-stp__disc--${status}`}>{discContent(status, index, icon)}</span>;
}

/**
 * The Nockerl NockerlStepper is a step-progress indicator. Renders an ordered list of
 * status discs joined by connectors whose filled portion tracks progress; it shows
 * status only (it does not own step content or navigation).
 */
export const NockerlStepper = forwardRef<HTMLOListElement, NockerlStepperProps>(function NockerlStepper({
  steps,
  current,
  orientation = 'horizontal',
  errorAt,
  onStepClick,
  className,
  ...rest
}, ref) {
  const total = steps.length;

  if (orientation === 'vertical') {
    return (
      <>
      <ol {...rest} ref={ref} className={['nk-stp', 'nk-stp--v', className].filter(Boolean).join(' ')} aria-label={`Progress: step ${current + 1} of ${total}`}>
        {steps.map((step, i) => {
          const status = statusFor(i, current, errorAt);
          const name = `Step ${i + 1} of ${total}: ${step.label}, ${STATUS_WORD[status]}`;
          const clickable = !!onStepClick && status === 'done';
          return (
            <li
              key={step.label}
              className="nk-stp__item"
              aria-current={status === 'current' || status === 'error' ? 'step' : undefined}
            >
              <div className="nk-stp__rail">
                {clickable ? (
                  <button type="button" className="nk-stp__node" aria-label={name} onClick={() => onStepClick(i)}>
                    <Disc status={status} index={i} icon={step.icon} />
                  </button>
                ) : (
                  <span className="nk-stp__node" role="img" aria-label={name}>
                    <Disc status={status} index={i} icon={step.icon} />
                  </span>
                )}
                {i < total - 1 && (
                  <span className="nk-stp__conn" aria-hidden="true">
                    <span className="nk-stp__conn-fill" style={{ height: i < current ? '100%' : 0 }} />
                  </span>
                )}
              </div>
              <div className="nk-stp__body">
                <span className="nk-stp__lab">
                  <span
                    className={`nk-stp__title${status === 'upcoming' ? ' nk-stp__title--muted' : ''}${
                      status === 'error' ? ' nk-stp__title--error' : ''
                    }`}
                  >
                    {step.label}
                  </span>
                  {status === 'error' ? (
                    <span className="nk-stp__hint">
                      {IconAlertSm} Couldn&rsquo;t verify, check and retry
                    </span>
                  ) : (
                    step.description && <span className="nk-stp__desc">{step.description}</span>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {/* recipe CSS as a SIBLING (not a child): a trailing <style> child would
          become the ol's :last-child and break the connectors' positional selectors;
          a <style> is display:none so a sibling has zero layout effect. */}
      <style>{NOCKERL_STEPPER_STYLES}</style>
      </>
    );
  }

  // horizontal: each item is [connector (flex)] + [disc + label column]; the first
  // item has no leading connector, so only items after the first grow.
  return (
    <>
    <ol {...rest} ref={ref} className={['nk-stp', 'nk-stp--h', className].filter(Boolean).join(' ')} aria-label={`Progress: step ${current + 1} of ${total}`}>
      {steps.map((step, i) => {
        const status = statusFor(i, current, errorAt);
        const name = `Step ${i + 1} of ${total}: ${step.label}, ${STATUS_WORD[status]}`;
        const clickable = !!onStepClick && status === 'done';
        return (
          <li
            key={step.label}
            className={`nk-stp__item${i > 0 ? ' nk-stp__item--grow' : ''}`}
            aria-current={status === 'current' || status === 'error' ? 'step' : undefined}
          >
            {/* connector arrives from the previous disc (skipped on the first item) */}
            {i > 0 && (
              <span className="nk-stp__conn" aria-hidden="true">
                <span className="nk-stp__track" />
                <span className="nk-stp__track-fill" style={{ width: i <= current ? '100%' : 0 }} />
              </span>
            )}
            <span className="nk-stp__col">
              {clickable ? (
                <button type="button" className="nk-stp__node" aria-label={name} onClick={() => onStepClick(i)}>
                  <Disc status={status} index={i} icon={step.icon} />
                </button>
              ) : (
                <span className="nk-stp__node" role="img" aria-label={name}>
                  <Disc status={status} index={i} icon={step.icon} />
                </span>
              )}
              <span className="nk-stp__lab">
                <span
                  className={`nk-stp__title${status === 'upcoming' ? ' nk-stp__title--muted' : ''}${
                    status === 'error' ? ' nk-stp__title--error' : ''
                  }`}
                >
                  {step.label}
                </span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
    {/* recipe CSS as a SIBLING (not a child): a trailing <style> child would
        become the ol's :last-child and break the connectors' positional selectors;
        a <style> is display:none so a sibling has zero layout effect. */}
    <style>{NOCKERL_STEPPER_STYLES}</style>
    </>
  );
});

// The step-PROGRESS primitive. When `onStepClick` is set, a completed stop becomes a real
// <button> (the jump control). NockerlStepper legitimately OWNS that button. Steps come from the
// `steps` DATA prop (not component slots), and it holds no step content or nav → a leaf
// that owns its clickable stops.
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default NockerlStepper;
