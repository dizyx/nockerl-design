/**
 * NockerlSlider is the Tier-1 slider / range-input primitive. ONE home for the recessed
 * track + cyan active fill + the lifted draggable thumb, the value bubble, the
 * step/tick model, and the full drag + keyboard logic, so a future slider change
 * is ONE edit, not many. Composes ONLY tokens.
 *
 * The DEDICATED, canonical slider: a recessed track + a draggable lifted thumb that
 * SETS a value (an INPUT), distinct from the progress-bar (output/status) and the
 * context-gauge (banded token-budget meter). It reuses their shared vocabulary (the
 * recessed well + the cyan active fill); the new piece is the THUMB, a lifted disc
 * (neutral shadow + top catch-light + a cyan core, never a glow).
 *
 * Sourced from the shipped Android app (never the web dashboard):
 *   • Material `NockerlSlider` (chat/ui/SamplingAdvancedSettings.kt): `value`/`onValueChange`,
 *     `valueRange = min..max`, `steps = ((max-min)/step) - 1` (Material counts steps
 *     BETWEEN the endpoints), default `SliderColors` → active track + thumb are the theme
 *     `primary` (= brand cyan). Value snapped to the step + shown in a MONO readout.
 *   • REAL sampling ranges (chat/domain/Sampling.kt `SAMPLING_KNOB_SPECS`): Temperature
 *     0.1-2.0/0.05, Top-P (nucleus) 0-1/0.01, Top-K 0-200/1 (int).
 *   • The two-thumb RANGE, the value bubble, and explicit tick marks are NOT shipped on
 *     Android (single-thumb Material NockerlSlider only). They were designed ORIGINALLY
 *     here and are flagged as such.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • the TRACK is a recessed WELL (darkest edge token + inner shadow, the inverse of a
 *     card); the active FILL is FLAT cyan + a top catch-light (never a glow); the THUMB
 *     is a lifted disc: only interpolatable props move (transform / brightness / shadow),
 *     no fill ever tweens.
 *   • focus is an OUTLINE ring on the thumb (focus-visible cyan ring), never a colored
 *     shadow.
 *   • fully keyboard-operable (Arrow = ±step, Shift+Arrow / PageUp·Down = ±10 steps,
 *     Home/End = min/max; role="slider" + aria-valuenow/min/max/valuetext; each range thumb
 *     is its own labeled slider that can't cross its partner); under reduced-motion the
 *     transitions FREEZE.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef, useCallback, useRef, useState } from 'react';
import type { ForwardedRef, HTMLAttributes, RefObject } from 'react';
import type { ComposeContract } from '../compose-contract';

export type NockerlSliderSize = 'sm' | 'md';

/** Assign one element to BOTH an internal ref object and a forwarded ref (object or
 *  callback), so the drag logic keeps its lane ref AND a consumer/form gets the root. */
function assignRoot(
  el: HTMLDivElement | null,
  laneRef: RefObject<HTMLDivElement | null>,
  forwarded: ForwardedRef<HTMLDivElement>,
): void {
  laneRef.current = el;
  if (typeof forwarded === 'function') forwarded(el);
  else if (forwarded) forwarded.current = el;
}

// ── Pure value helpers (snap to step, clamp, format), mirroring SamplingHelpers.kt ──
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Snap a raw value to the nearest step inside [min,max] and round off float drift. */
function snap(raw: number, min: number, max: number, step: number): number {
  const c = clamp(raw, min, max);
  if (step <= 0) return c;
  const steps = Math.round((c - min) / step);
  const snapped = min + steps * step;
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
  const f = 10 ** decimals;
  return clamp(Math.round(snapped * f) / f, min, max);
}

/** Format like Android `formatValue`: integer steps drop decimals; else step precision. */
export function fmt(v: number, step: number): string {
  if (step >= 1) return String(Math.round(v));
  if (step >= 0.1) return v.toFixed(1);
  if (step >= 0.01) return v.toFixed(2);
  return v.toFixed(3);
}

const ratioOf = (v: number, min: number, max: number) => (max > min ? (v - min) / (max - min) : 0);

/** The .nk-sl recipe: the recessed track + cyan fill + lifted thumb + bubble + ticks, in one place. */
export const NOCKERL_SLIDER_STYLES = `
/* ── The slider root, a horizontal lane sized to clear the 24px target law ─────── */
.nk-sl { position: relative; width: 100%; touch-action: none; user-select: none; -webkit-user-select: none; }
.nk-sl--sm { height: 24px; }
.nk-sl--md { height: 28px; }
.nk-sl--ticks { margin-bottom: var(--space-4); }   /* room for tick labels under the lane */
.nk-sl--disabled { opacity: .55; cursor: not-allowed; }   /* inert, still legible */

/* The TRACK is a recessed well (darkest edge + inner shadow), the inverse of a card. */
.nk-sl__track { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%);
  height: var(--space-2); border-radius: var(--radius-pill); background: var(--color-canvas-edge); overflow: hidden;
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 50%, transparent); }
.nk-sl--sm .nk-sl__track { height: var(--space-1); }
/* The active FILL: flat cyan, lit from above; left→thumb (single) or between (range). */
.nk-sl__fill { position: absolute; inset-block: 0; border-radius: var(--radius-pill);
  background: var(--color-accent-primary);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-sl--disabled .nk-sl__fill { background: var(--color-on-card-muted); box-shadow: none; }

/* The THUMB is a lifted disc: neutral drop shadow + top catch-light (NEVER a glow).
   Centered on the track; only transform/shadow/brightness move (the law). */
.nk-sl__thumb { position: absolute; top: 50%; width: 20px; height: 20px; border-radius: var(--radius-pill);
  transform: translate(-50%, -50%); cursor: grab; padding: 0; border: 0;
  background: radial-gradient(circle at 50% 32%, var(--color-card-surface3), var(--color-card-surface1));
  box-shadow: 0 var(--elevation-level2) var(--space-2) -2px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight),
              0 0 0 var(--space-px) color-mix(in srgb, var(--color-shadow-tint) 35%, transparent);
  transition: transform .12s var(--motion-easing-standard), box-shadow .12s, filter .12s; }
.nk-sl--sm .nk-sl__thumb { width: 16px; height: 16px; }
/* A small cyan core inside the disc ties the thumb to the active fill (a shape, not a halo). */
.nk-sl__thumb::after { content: ""; position: absolute; inset: 0; margin: auto; width: 8px; height: 8px;
  border-radius: var(--radius-pill); background: var(--color-accent-primary);
  box-shadow: inset 0 var(--space-px) 0 color-mix(in srgb, var(--color-surface-highlight) 70%, transparent); }
.nk-sl--sm .nk-sl__thumb::after { width: 6px; height: 6px; }
.nk-sl__thumb:hover { filter: brightness(1.08); transform: translate(-50%, -50%) scale(1.06); }
.nk-sl__thumb:active { cursor: grabbing; transform: translate(-50%, -50%) scale(.96); }
.nk-sl__thumb:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
.nk-sl--disabled .nk-sl__thumb { cursor: not-allowed; }

/* The value BUBBLE, a small bordered chip above the thumb, appears on hover/focus/drag.
   Shape, not a glow; mono figure. A little tail points down at the thumb. */
.nk-sl__bubble { position: absolute; bottom: calc(50% + 16px); left: 50%; transform: translateX(-50%) translateY(4px);
  padding: var(--space-1) var(--space-2); border-radius: var(--radius-bubble-tail);
  background: var(--color-card-surface3); border: var(--space-px) solid var(--color-card-hairline);
  color: var(--color-on-card); font-family: var(--font-family-mono); font-size: var(--font-size-12);
  font-weight: var(--font-weight-semibold); white-space: nowrap; pointer-events: none; opacity: 0;
  box-shadow: 0 var(--elevation-level2) var(--space-3) -4px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  transition: opacity .12s, transform .12s var(--motion-easing-standard); }
.nk-sl__bubble::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  border: 5px solid transparent; border-top-color: var(--color-card-surface3); }
.nk-sl__thumb:hover .nk-sl__bubble, .nk-sl__thumb:focus-visible .nk-sl__bubble,
.nk-sl__thumb--dragging .nk-sl__bubble {
  opacity: 1; transform: translateX(-50%) translateY(0); }

/* Tick marks sit ON the track at each step boundary, aligned under the lane. */
.nk-sl__tick { position: absolute; top: 50%; width: var(--space-px); height: var(--space-2);
  transform: translate(-50%, -50%); background: color-mix(in srgb, var(--color-on-card) 30%, transparent); }
.nk-sl__tick--on { background: var(--color-on-accent); }
/* The min/max captions under a slider are ticklabels (absolute, over the lane); mono /
   size-10 / muted, justified ends. */
.nk-sl__ticklabels { display: flex; justify-content: space-between;
  font-family: var(--font-family-mono); font-size: var(--font-size-10); color: var(--color-on-card-muted);
  position: absolute; left: 0; right: 0; top: calc(100% + var(--space-1)); }

@media (prefers-reduced-motion: reduce) {
  .nk-sl__thumb, .nk-sl__bubble { transition: none; }
}
`;

// ── Keyboard step model: Arrow = ±step, Shift/Page = ±10 steps, Home/End = min/max ──
function keyToValue(e: React.KeyboardEvent, value: number, min: number, max: number, step: number): number | null {
  const big = step * 10;
  const inc = (d: number) => clamp(value + d, min, max);
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return inc(e.shiftKey ? big : step);
    case 'ArrowLeft':
    case 'ArrowDown':
      return inc(e.shiftKey ? -big : -step);
    case 'PageUp':
      return inc(big);
    case 'PageDown':
      return inc(-big);
    case 'Home':
      return min;
    case 'End':
      return max;
    default:
      return null;
  }
}

interface ThumbProps {
  value: number; min: number; max: number; step: number; unit: string; label: string;
  disabled: boolean; dragging: boolean;
  onKeyDown: (e: React.KeyboardEvent) => void;
  /** Range thumbs need a per-thumb drag; the single slider lets the lane handle it. */
  onPointerDown?: (e: React.PointerEvent) => void;
}

/** One draggable thumb with its own role="slider"; the bubble rides above it. */
function Thumb({ value, min, max, step, unit, label, disabled, dragging, onKeyDown, onPointerDown }: ThumbProps) {
  return (
    <button
      type="button"
      className={`nk-sl__thumb${dragging ? ' nk-sl__thumb--dragging' : ''}`}
      style={{ left: `${ratioOf(value, min, max) * 100}%` }}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${fmt(value, step)}${unit}`}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={disabled ? undefined : onKeyDown}
      onPointerDown={disabled ? undefined : onPointerDown}
    >
      <span className="nk-sl__bubble" aria-hidden="true">{fmt(value, step)}{unit}</span>
    </button>
  );
}

/** Map a pointer X within the lane element to a snapped value. */
function pointerValue(clientX: number, el: HTMLElement, min: number, max: number, step: number): number {
  const rect = el.getBoundingClientRect();
  const r = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
  return snap(min + r * (max - min), min, max, step);
}

/**
 * Shared pointer-drag: report the snapped value at the cursor on press AND while the
 * pointer moves (track-press jumps the thumb there, then drag-follows), toggling a
 * dragging flag and cleaning the window listeners on release. `report` returns false to
 * veto (e.g. disabled). Focuses the pressed thumb so the keyboard takes over after a drag.
 */
function useDrag(laneRef: React.RefObject<HTMLDivElement | null>, report: (clientX: number, lane: HTMLElement) => boolean, setDragging: (d: boolean) => void) {
  return useCallback(
    (e: React.PointerEvent) => {
      const lane = laneRef.current;
      if (!lane || !report(e.clientX, lane)) return;
      const target = e.target as HTMLElement | null;
      target?.closest<HTMLElement>('.nk-sl__thumb')?.focus();
      setDragging(true);
      const move = (ev: PointerEvent) => report(ev.clientX, lane);
      const up = () => {
        setDragging(false);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [laneRef, report, setDragging],
  );
}

/**
 * NockerlSlider renders a <div> lane (its draggable thumb is a <button role="slider">), so it
 * extends the native DIV attributes (minus the value-first `onChange` it redefines) +
 * forwards a ref to that root <div>: `id`, `title`, `aria-*` / `data-*` and event
 * handlers ride onto the lane, and a consumer can measure/scroll it via the ref (merged
 * with the internal drag lane ref). `onChange` keeps its `(v: number)` value-first
 * signature (Omitted from the DOM attrs); `value`/`min`/`max`/`step`/`size`/`label` are
 * not base div attributes, so they need no Omit.
 */
export interface NockerlSliderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label: string;
  size?: NockerlSliderSize;
  disabled?: boolean;
  /** Render tick marks + min/max tick labels under the lane (stepped slider). */
  ticks?: boolean;
}

/** A single-value Nockerl slider, the unit the spec documents. */
export const NockerlSlider = forwardRef<HTMLDivElement, NockerlSliderProps>(function NockerlSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  label,
  size = 'md',
  disabled = false,
  ticks = false,
  className,
  ...rest
}, ref) {
  const laneRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const report = useCallback(
    (clientX: number, lane: HTMLElement) => {
      if (disabled) return false;
      onChange(pointerValue(clientX, lane, min, max, step));
      return true;
    },
    [disabled, min, max, step, onChange],
  );
  const onDown = useDrag(laneRef, report, setDragging);
  const tickCount = ticks && step > 0 ? Math.round((max - min) / step) : 0;

  return (
    <div
      {...rest}
      ref={(el) => assignRoot(el, laneRef, ref)}
      className={['nk-sl', `nk-sl--${size}`, disabled ? 'nk-sl--disabled' : '', ticks ? 'nk-sl--ticks' : '', className].filter(Boolean).join(' ')}
      onPointerDown={onDown}
    >
      <div className="nk-sl__track">
        <div className="nk-sl__fill" style={{ left: 0, width: `${ratioOf(value, min, max) * 100}%` }} />
      </div>
      {ticks &&
        Array.from({ length: tickCount + 1 }, (_, i) => {
          const tv = min + i * step;
          return (
            <span
              key={i}
              className={`nk-sl__tick${tv <= value ? ' nk-sl__tick--on' : ''}`}
              style={{ left: `${(i / tickCount) * 100}%` }}
              aria-hidden="true"
            />
          );
        })}
      {ticks && (
        <div className="nk-sl__ticklabels" aria-hidden="true">
          <span>{fmt(min, step)}{unit}</span>
          <span>{fmt(max, step)}{unit}</span>
        </div>
      )}
      <Thumb
        value={value}
        min={min}
        max={max}
        step={step}
        unit={unit}
        label={label}
        disabled={disabled}
        dragging={dragging}
        onKeyDown={(e) => {
          const next = keyToValue(e, value, min, max, step);
          if (next !== null) {
            e.preventDefault();
            onChange(snap(next, min, max, step));
          }
        }}
      />
      <style>{NOCKERL_SLIDER_STYLES}</style>
    </div>
  );
});

/**
 * NockerlRangeSlider renders the same <div> lane (two <button role="slider"> thumbs), so it
 * extends the native DIV attributes (minus its value-first `onChange`) + forwards a ref
 * to the root <div> (merged with the internal drag lane ref). `onChange` keeps its
 * two-arg `(low, high)` value-first signature (Omitted from the DOM attrs); the numeric
 * range props are not base div attributes, so they need no Omit.
 */
export interface NockerlRangeSliderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label: string;
  size?: NockerlSliderSize;
}

/** A two-thumb range: min/max thumbs that can't cross; the fill sits BETWEEN them. */
export const NockerlRangeSlider = forwardRef<HTMLDivElement, NockerlRangeSliderProps>(function NockerlRangeSlider({
  low,
  high,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  label,
  size = 'md',
  className,
  ...rest
}, ref) {
  const laneRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<'low' | 'high' | null>(null);

  const startDrag = useCallback(
    (which: 'low' | 'high') => (e: React.PointerEvent) => {
      const lane = laneRef.current;
      if (!lane) return;
      (e.currentTarget as HTMLElement).focus();
      setDrag(which);
      const move = (ev: PointerEvent) => {
        const v = pointerValue(ev.clientX, lane, min, max, step);
        if (which === 'low') onChange(Math.min(v, high), high);
        else onChange(low, Math.max(v, low));
      };
      const up = () => {
        setDrag(null);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [low, high, min, max, step, onChange],
  );

  const lr = ratioOf(low, min, max) * 100;
  const hr = ratioOf(high, min, max) * 100;

  // Each thumb is bounded by its partner (low ∈ [min,high], high ∈ [low,max]) so they
  // can't cross. The bound applies to both the keyboard and the drag clamp.
  const thumbs = [
    { which: 'low' as const, value: low, lo: min, hi: high, name: 'minimum' },
    { which: 'high' as const, value: high, lo: low, hi: max, name: 'maximum' },
  ];

  return (
    <div
      {...rest}
      ref={(el) => assignRoot(el, laneRef, ref)}
      className={['nk-sl', `nk-sl--${size}`, className].filter(Boolean).join(' ')}
    >
      <div className="nk-sl__track">
        <div className="nk-sl__fill" style={{ left: `${lr}%`, width: `${hr - lr}%` }} />
      </div>
      {thumbs.map((t) => (
        <Thumb
          key={t.which}
          value={t.value}
          min={t.lo}
          max={t.hi}
          step={step}
          unit={unit}
          label={`${label} ${t.name}`}
          disabled={false}
          dragging={drag === t.which}
          onKeyDown={(e) => {
            const next = keyToValue(e, t.value, t.lo, t.hi, step);
            if (next === null) return;
            e.preventDefault();
            const v = snap(next, min, max, step);
            if (t.which === 'low') onChange(Math.min(v, high), high);
            else onChange(low, Math.max(v, low));
          }}
          onPointerDown={startDrag(t.which)}
        />
      ))}
      <style>{NOCKERL_SLIDER_STYLES}</style>
    </div>
  );
});

/** LEAF: the slider primitive (single + range share this file). Each draggable Thumb is
 *  a <button role="slider"> (aria-valuenow/min/max); it owns that button + slider role.
 *  Track / fill / ticks are plain elements; holds no child slots. */
export const compose = { tier: 'leaf', owns: ['button', 'role=slider'] } satisfies ComposeContract;

export default NockerlSlider;
