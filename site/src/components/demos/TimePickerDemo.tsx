/**
 * TimePickerDemo: the live, interactive Nockerl TIME-of-day picker for the web.
 *
 * This is the TIME selection control (hour + minute + meridiem), NOT a calendar.
 * It deliberately PAIRS with the date picker: it reuses that family's recessed
 * field-trigger + lifted popover card + cyan accent-selection vocabulary, but the
 * surface inside is a CLOCK DIAL + hour/minute spinbuttons + an AM/PM toggle,
 * never a month grid. (DatePicker = which day; TimePicker = what time.)
 *
 * NOTE on cross-platform truth: neither shipped app carries a CUSTOM time picker.
 * Android (chat/ui/ChatUtils.kt, inbox/ui/NotificationRow.kt) only FORMATS times
 * (SimpleDateFormat("h:mm a") / DateTimeFormatter "MMM d, yyyy h:mm a"); Voice's
 * "clock" is just an SF Symbol + a duration() seconds formatter. So Kotlin/Swift
 * document the STOCK pickers (Material 3 TimePicker / rememberTimePickerState,
 * SwiftUI DatePicker(.hourAndMinute)) and this web island is designed ORIGINALLY
 * from the design laws using the shared control vocabulary.
 *
 * Laws, verbatim:
 *   • the popover PANEL is a CARD that LIFTS (lighter + neutral drop shadow + top
 *     catch-light); the trigger FIELD + the dial FACE SINK (recessed wells).
 *   • the SELECTED hour/minute + the clock HAND are the cyan accent (static fill)
 *     with on-accent text on the selected number, the one brand accent.
 *   • flash-free: a number's fill never tweens. The HAND rotates (transform),
 *     the popover scales/fades (transform/opacity); no fill/gradient swap.
 *   • the AM/PM + 12h/24h toggles are the segmented track + sliding pill idiom.
 *     12h/24h is the real NockerlSegmentedControl primitive; AM/PM stays a hand-rolled
 *     VERTICAL segmented (NockerlSegmentedControl is horizontal-only, flagged in code).
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *   • time digits are real role="spinbutton"s (aria-valuenow/min/max/text); the
 *     dial numbers are reachable buttons; Tab order hour -> minute -> meridiem.
 *   • prefers-reduced-motion freezes the hand rotation + popover animation.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md); literals remain only for pure
 * SVG clock geometry (circle radii, number placement) + transition curves. To
 * stay deterministic, "now" is pinned to a FIXED demo time, not the real clock.
 */
import { useRef, useState, type KeyboardEvent } from 'react';
import { NockerlIcon, NockerlPopover, NockerlSegmentedControl, NockerlSurface, type ComposeContract, type NockerlPopoverHandle } from '@dizyx/nockerl-react';

// ── Fixed demo "now" (deterministic, never the real clock) ────────────────────
const NOW = { h24: 9, m: 41 }; // 9:41 AM, the classic demo time

// ── Time model + helpers ───────────────────────────────────────────────────────
type Meridiem = 'AM' | 'PM';
const pad = (n: number) => String(n).padStart(2, '0');
const to12 = (h24: number) => ((h24 + 11) % 12) + 1; // 0->12, 13->1
const merOf = (h24: number): Meridiem => (h24 < 12 ? 'AM' : 'PM');
const wrap = (n: number, mod: number) => ((n % mod) + mod) % mod;
// In the 24h dual ring, 00 + 13-23 ride the INNER ring; 1-12 the outer.
const is24Inner = (h24: number) => h24 === 0 || h24 >= 13;
// Compose h12 + meridiem back to 24h.
const compose24 = (h12: number, mer: Meridiem) =>
  mer === 'AM' ? h12 % 12 : (h12 % 12) + 12;
const fmt = (h24: number, m: number, use24: boolean) =>
  use24 ? `${pad(h24)}:${pad(m)}` : `${to12(h24)}:${pad(m)} ${merOf(h24)}`;

// Inclusive minute-of-day bounds gate the spinbuttons + dial.
const mod = (h24: number, m: number) => h24 * 60 + m;

// The trigger FIELD + dial FACE SINK; the popover PANEL LIFTS. Selection + hand
// use the cyan accent; digits use the mono token. All values are tokens; literals
// are pure SVG geometry / transition curves.
const STYLES = `
.nk-tp-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }
.nk-tp-demo__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(248px, max-content)); gap: var(--space-8) var(--space-10); align-items: start; }
.nk-tp-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-tp-demo__out { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin-top: var(--space-3); }
.nk-tp-demo__out b { color: var(--color-accent-primary); font-family: var(--font-family-mono); }

/* The recessed trigger FIELD (it sinks, mirroring the date-picker trigger). */
.nk-tp-field { display: flex; flex-direction: column; gap: var(--space-1); max-width: 248px; }
.nk-tp-field__label { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-card); line-height: var(--font-line-height-20); }
.nk-tp-trigger {
  display: flex; align-items: center; gap: var(--space-2);
  width: 100%; text-align: left; cursor: pointer; font: inherit;
  color: var(--color-on-card); font-size: var(--font-size-14);
  background: var(--color-canvas-alt);
  border: var(--space-px) solid var(--color-outline-subtle);
  border-radius: var(--radius-control);
  padding: var(--space-3); min-height: var(--size-min-touch);
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight);
  transition: border-color .12s, box-shadow .12s;
}
.nk-tp-trigger:hover { border-color: color-mix(in srgb, var(--color-outline-subtle) 80%, var(--color-on-card)); }
.nk-tp-trigger.is-open, .nk-tp-trigger:focus-visible {
  outline: none; border-color: var(--color-accent-primary);
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), 0 0 0 var(--space-0-5) color-mix(in srgb, var(--color-accent-primary) 45%, transparent);
}
.nk-tp-trigger.is-open { border-width: var(--border-width-selection); border-color: color-mix(in srgb, var(--color-accent-primary) 45%, transparent); } /* OPEN is a selection: the EDGE softens, the focus ring above does not. */
.nk-tp-trigger__val { font-family: var(--font-family-mono); letter-spacing: var(--font-tracking-normal); }
.nk-tp-trigger__icon { color: var(--color-on-card-muted); display: inline-flex; margin-left: auto; }
.nk-tp-trigger__icon svg { display: block; width: 18px; height: 18px; }
.nk-tp-trigger__ph { color: color-mix(in srgb, var(--color-on-card-muted) 80%, transparent); }
.nk-tp-trigger:disabled { cursor: not-allowed; opacity: .55; }

/* popover wrapper: the boundary the NockerlPopover clamps INTO (it anchors the panel to
   the trigger, flips/clamps inside this box, and owns the outside-click scrim + Esc). */
.nk-tp-pop { position: relative; max-width: 248px; }
/* The bare NockerlPopover panel is edge-to-edge (padding 0) + owns the lift/shadow; this
   wrapper re-supplies the panel's inner padding so the dial keeps its inset. */
.nk-tp-pop-body { padding: var(--space-4); }

/* The INLINE time PANEL is a CARD that LIFTS. NockerlSurface owns bg + hairline + radius + sheen. */
.nk-tp-demo .nk-tp-panel {
  width: 248px;
  padding: var(--space-4);
  box-shadow: 0 var(--space-2) var(--elevation-level3) -8px color-mix(in srgb, var(--color-shadow-tint) 65%, transparent), var(--nk-surface-sheen);
}
.nk-tp-demo .nk-tp-panel--inline { box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen); }

/* ── The big time readout: two mono spinbuttons + a colon, AM/PM beside ── */
.nk-tp-readout { display: flex; align-items: stretch; justify-content: center; gap: var(--space-2); margin-bottom: var(--space-4); }
.nk-tp-spin {
  display: flex; flex-direction: column; align-items: center;
  background: var(--color-canvas-alt); border: var(--space-px) solid var(--color-outline-subtle);
  border-radius: var(--radius-control); padding: var(--space-1) var(--space-2);
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent);
  cursor: ns-resize; user-select: none; min-width: 56px;
  transition: border-color .12s, box-shadow .12s;
}
.nk-tp-spin:focus-visible, .nk-tp-spin.is-active { outline: none; border-color: var(--color-accent-primary);
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 40%, transparent), 0 0 0 var(--space-0-5) color-mix(in srgb, var(--color-accent-primary) 45%, transparent); }
.nk-tp-spin.is-active { border-width: var(--border-width-selection); border-color: color-mix(in srgb, var(--color-accent-primary) 45%, transparent); } /* the chosen unit is a selection: same softened EDGE. */
.nk-tp-spin__num { font-family: var(--font-family-mono); font-size: var(--font-size-28); font-weight: var(--font-weight-semibold); line-height: var(--font-line-height-32); color: var(--color-on-card); font-variant-numeric: tabular-nums; }
.nk-tp-spin.is-active .nk-tp-spin__num { color: var(--color-accent-primary); }
.nk-tp-spin__cap { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin-top: var(--space-0-5); }
.nk-tp-colon { font-family: var(--font-family-mono); font-size: var(--font-size-28); font-weight: var(--font-weight-semibold); color: var(--color-on-card-muted); align-self: flex-start; line-height: var(--font-line-height-32); padding-top: var(--space-1); }
.nk-tp-readout__mer { display: flex; align-items: center; }

/* ── The CLOCK DIAL: a recessed face; numbers on the circle, accent hand ── */
.nk-tp-dial { position: relative; width: 188px; height: 188px; margin: 0 auto var(--space-3); }
.nk-tp-dial__face {
  position: absolute; inset: 0; border-radius: var(--radius-pill);
  background: radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--color-canvas-alt) 92%, var(--color-on-card)), var(--color-canvas));
  border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: inset 0 var(--space-0-5) var(--space-2) color-mix(in srgb, var(--color-shadow-tint) 55%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-tp-dial__svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.nk-tp-dial__hand { stroke: var(--color-accent-primary); stroke-width: 2; stroke-linecap: round;
  transform-origin: 94px 94px; }
.nk-tp-dial__hub { fill: var(--color-accent-primary); }
/* THE SELECTOR: one coherent SOLID accent disc at the hand's end, joined to the hub by
   the hand line (Android M3 canon). It sits BEHIND the numbers, so the selected number
   knocks out of it in on-accent ink. No separate ring. */
.nk-tp-dial__knob { fill: var(--color-accent-primary); }
/* hand + its disc glide together on ONE shared overshoot curve (single easing literal). */
.nk-tp-dial__hand, .nk-tp-dial__knob { transition: transform .28s cubic-bezier(.34,1.4,.5,1); }
.nk-tp-num {
  position: absolute; width: var(--space-8); height: var(--space-8); margin: calc(var(--space-8) / -2) 0 0 calc(var(--space-8) / -2);
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; background: transparent; cursor: pointer; padding: 0;
  border-radius: var(--radius-pill); font-family: var(--font-family-mono);
  font-size: var(--font-size-14); font-weight: var(--font-weight-medium); color: var(--color-on-card);
  transition: background-color .12s, color .12s, transform .12s cubic-bezier(.2,0,0,1);
}
.nk-tp-num:hover:not(.is-on) { background: color-mix(in srgb, var(--color-on-card) 10%, transparent); }
.nk-tp-num:active { transform: scale(.9); }
.nk-tp-num:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
/* the selected number has NO own fill. The SVG knob disc behind it is the fill; the number
   just switches to on-accent ink so it knocks out of that one coherent disc. */
.nk-tp-num.is-on { background: transparent; color: var(--color-on-accent); font-weight: var(--font-weight-semibold); }
.nk-tp-num.is-minor { font-size: var(--font-size-10); color: var(--color-on-card-muted); }
/* inner ring of the 24h dual face (00 + 13-23): a compacter, quieter mark so the two
   rings read as distinct; selection still promotes it to the full on-accent disc. */
.nk-tp-num--inner { width: var(--space-6); height: var(--space-6); margin: calc(var(--space-6) / -2) 0 0 calc(var(--space-6) / -2); font-size: var(--font-size-12); color: var(--color-on-card-muted); }

/* phase hint under the dial */
.nk-tp-phase { text-align: center; font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); }
.nk-tp-phase b { color: var(--color-accent-primary); }

/* The AM/PM + 12h/24h toggles compose the real NockerlSegmentedControl: horizontal for
   12h/24h, vertical for AM/PM. */

/* panel footer + a small toolbar row */
.nk-tp-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-top: var(--space-2); }
.nk-tp-foot { margin-top: var(--space-3); padding-top: var(--space-2); border-top: var(--space-px) solid var(--color-card-hairline);
  font-size: var(--font-size-10); color: var(--color-on-card-muted); text-align: center; }
.nk-tp-disabled { opacity: .55; pointer-events: none; }

@media (prefers-reduced-motion: reduce) {
  .nk-tp-dial__hand, .nk-tp-dial__knob, .nk-tp-num, .nk-tp-spin, .nk-tp-trigger { transition: none; }
}
`;

// ── Inline glyphs (the shared NockerlIcon primitive, on currentColor) ────────────────────
const IconClock = (<NockerlIcon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></NockerlIcon>);

// ── A spinbutton: one mono digit pair, ArrowUp/Down + type-to-set ──────────────
// A real role="spinbutton" (NOT wrapped in a button, so no nested interactive). On
// focus/click it also switches the dial to its phase via onActivate.
function Spin({ label, value, display, min, max, valueText, onStep, onType, onActivate }: {
  label: string; value: number; display: string; min: number; max: number; valueText: string;
  onStep: (delta: number) => void; onType: (digit: string) => void; onActivate: () => void;
}) {
  const [active, setActive] = useState(false);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); onStep(1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); onStep(-1); }
    else if (e.key === 'PageUp') { e.preventDefault(); onStep(5); }
    else if (e.key === 'PageDown') { e.preventDefault(); onStep(-5); }
    else if (/^[0-9]$/.test(e.key)) { e.preventDefault(); onType(e.key); }
  };
  return (
    <div className={`nk-tp-spin${active ? ' is-active' : ''}`} role="spinbutton" tabIndex={0}
      aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} aria-valuetext={valueText}
      onKeyDown={onKey} onClick={onActivate}
      onFocus={() => { setActive(true); onActivate(); }} onBlur={() => setActive(false)}
      onWheel={(e) => onStep(e.deltaY < 0 ? 1 : -1)}>
      <span className="nk-tp-spin__num">{display}</span>
      <span className="nk-tp-spin__cap">{label}</span>
    </div>
  );
}

interface ClockProps {
  h24: number; minute: number; use24: boolean; minuteStep: number;
  inBounds: (h24: number, m: number) => boolean;
  onPick: (next: { h24: number; minute: number }) => void;
}

/**
 * The clock surface, the core unit. A recessed dial: two mono spinbuttons + an
 * AM/PM toggle for direct entry, then a two-phase DIAL (pick the hour ring, then
 * the minute ring) with an accent hand that rotates to the value. Numbers sit on
 * the circle; the selected number gets the accent fill; bounds disable picks.
 */
function Clock({ h24, minute, use24, minuteStep, inBounds, onPick }: ClockProps) {
  const [phase, setPhase] = useState<'hour' | 'minute'>('hour');
  const mer = merOf(h24);
  const h12 = to12(h24);

  // ── Dial geometry: center 94,94. Outer ring R=74. In 24h a SECOND, inner ring
  //    (R=46) carries 00 + 13-23, so all 24 hours are pickable. The Android M3 dual ring. ──
  const R_OUTER = 74;
  const R_INNER = 46;
  const DISC_OUTER = 16; // solid selector-disc radius per ring (matches the number box)
  const DISC_INNER = 12;
  const place = (i: number, R: number) => {
    const a = (i / 12) * 2 * Math.PI - Math.PI / 2; // -90deg so position 0 is at top
    // Round to 2 decimals (sub-pixel) so SSR + client emit identical strings.
    return { left: +(94 + R * Math.cos(a)).toFixed(2), top: +(94 + R * Math.sin(a)).toFixed(2) };
  };

  // Hand angle: hour ring = 30deg/position; minute ring = 6deg/min. 12/00 point up.
  // Rounded so the inline rotate() transform stringifies identically on SSR + client.
  const handDeg = Math.round(phase === 'hour' ? wrap(use24 ? h24 : h12, 12) * 30 : minute * 6);
  // The selected mark's ring: a 24h inner-ring hour (00 or 13-23) pulls the hand + the
  // solid disc IN to R_INNER; every other selection rides the outer ring.
  const selInner = phase === 'hour' && use24 && is24Inner(h24);
  const selR = selInner ? R_INNER : R_OUTER;
  const selDisc = selInner ? DISC_INNER : DISC_OUTER;

  const setMer = (next: Meridiem) => {
    const nh = compose24(h12, next);
    if (inBounds(nh, minute)) onPick({ h24: nh, minute });
  };

  const pickHour = (nh: number) => { if (inBounds(nh, minute)) { onPick({ h24: nh, minute }); setPhase('minute'); } };
  const pickMinute = (v: number) => { if (inBounds(h24, v)) onPick({ h24, minute: v }); };

  // Numbers for the active phase. In 24h/hour it is TWO rings (outer 12,1-11; inner
  // 00,13-23) so every hour is reachable; 12h/hour + minute are a single outer ring.
  type DialNum = { key: string; label: string; i: number; R: number; on: boolean; reachable: boolean; onClick: () => void; aria: string; inner: boolean; minor: boolean };
  let nums: DialNum[];
  if (phase === 'minute') {
    nums = Array.from({ length: 12 }, (_, i) => {
      const v = i * 5;
      return { key: `m${v}`, label: pad(v), i, R: R_OUTER, on: minute === v, reachable: inBounds(h24, v), onClick: () => pickMinute(v), aria: `${v} minutes`, inner: false, minor: true };
    });
  } else if (use24) {
    const outer = Array.from({ length: 12 }, (_, i) => {
      const h = i === 0 ? 12 : i;
      return { key: `o${h}`, label: String(h), i, R: R_OUTER, on: h24 === h, reachable: inBounds(h, minute), onClick: () => pickHour(h), aria: `${h} hours`, inner: false, minor: false };
    });
    const inner = Array.from({ length: 12 }, (_, i) => {
      const h = i === 0 ? 0 : 12 + i;
      return { key: `i${h}`, label: i === 0 ? '00' : String(h), i, R: R_INNER, on: h24 === h, reachable: inBounds(h, minute), onClick: () => pickHour(h), aria: `${h} hours`, inner: true, minor: false };
    });
    nums = [...outer, ...inner];
  } else {
    nums = Array.from({ length: 12 }, (_, i) => {
      const h12v = i === 0 ? 12 : i;
      const nh = compose24(h12v, mer);
      return { key: `h${h12v}`, label: String(h12v), i, R: R_OUTER, on: h12 % 12 === i, reachable: inBounds(nh, minute), onClick: () => pickHour(nh), aria: `${h12v} ${mer}`, inner: false, minor: false };
    });
  }

  return (
    <div>
      <div className="nk-tp-readout">
        <Spin label="Hour" value={use24 ? h24 : h12}
          display={use24 ? pad(h24) : pad(h12)}
          min={use24 ? 0 : 1} max={use24 ? 23 : 12}
          valueText={`${use24 ? h24 : h12} ${use24 ? "o'clock" : `${mer} o'clock`}`}
          onActivate={() => setPhase('hour')}
          onStep={(d) => {
            const nh = use24 ? wrap(h24 + d, 24) : compose24(((h12 - 1 + d + 12) % 12) + 1, mer);
            if (inBounds(nh, minute)) onPick({ h24: nh, minute });
          }}
          onType={(dg) => {
            const n = Number(dg);
            const nh = use24 ? n : compose24(n === 0 ? 12 : Math.min(n, 12), mer);
            if (inBounds(nh, minute)) onPick({ h24: nh, minute });
          }} />
        <span className="nk-tp-colon" aria-hidden="true">:</span>
        <Spin label="Minute" value={minute} display={pad(minute)} min={0} max={59}
          valueText={`${minute} minutes`}
          onActivate={() => setPhase('minute')}
          onStep={(d) => { const nm = wrap(minute + d * (Math.abs(d) === 5 ? 1 : minuteStep), 60); if (inBounds(h24, nm)) onPick({ h24, minute: nm }); }}
          onType={(dg) => { const nm = wrap(minute % 10 * 10 + Number(dg), 60); if (inBounds(h24, nm)) onPick({ h24, minute: nm }); }} />
        {!use24 && (
          <div className="nk-tp-readout__mer">
            {/* AM/PM composes the real NockerlSegmentedControl in its VERTICAL variant
                (stacked; the pill slides on Y), which fits the narrow meridiem slot
                beside the readout. */}
            <NockerlSegmentedControl
              orientation="vertical"
              size="sm"
              label="AM or PM"
              segments={[
                { value: 'AM', label: 'AM' },
                { value: 'PM', label: 'PM' },
              ]}
              value={mer}
              onChange={(v) => setMer(v as Meridiem)}
            />
          </div>
        )}
      </div>

      <div className="nk-tp-dial">
        <div className="nk-tp-dial__face" />
        <svg className="nk-tp-dial__svg" viewBox="0 0 188 188" aria-hidden="true">
          <line className="nk-tp-dial__hand" x1="94" y1="94" x2="94" y2={94 - selR}
            style={{ transform: `rotate(${handDeg}deg)` }} />
          <circle className="nk-tp-dial__hub" cx="94" cy="94" r="4" />
          {/* the one coherent solid disc, joined to the hub by the hand, lands ON the
              selected number (which knocks out of it in on-accent ink). */}
          <circle className="nk-tp-dial__knob" cx="94" cy={94 - selR} r={selDisc}
            style={{ transform: `rotate(${handDeg}deg)`, transformOrigin: '94px 94px' }} />
        </svg>
        {nums.map((n) => {
          const p = place(n.i, n.R);
          // Justified raw: a radial clock-face dial (each number is an absolutely-positioned
          // dial position), not a linear segmented/toggle or NockerlButton facsimile.
          return (
            <button key={n.key} type="button"
              className={`nk-tp-num${n.on ? ' is-on' : ''}${n.inner ? ' nk-tp-num--inner' : ''}${n.minor ? ' is-minor' : ''}`}
              style={{ left: `${p.left}px`, top: `${p.top}px`, opacity: n.reachable ? 1 : 0.3, cursor: n.reachable ? 'pointer' : 'not-allowed' }}
              aria-label={n.aria}
              aria-pressed={n.on}
              onClick={() => n.reachable && n.onClick()}>
              {n.label}
            </button>
          );
        })}
      </div>

      <p className="nk-tp-phase">
        Setting the <b>{phase}</b> · pick the {phase === 'hour' ? 'hour, then the minute' : 'minute'}
      </p>
    </div>
  );
}

// The 12h/24h hour-format switch: a HORIZONTAL 2-option segmented, cleanly the
// real NockerlSegmentedControl (role=radiogroup + role=radio + one sliding cyan pill).
// The boolean use24 maps to the string values '12' / '24'.
function ModeToggle({ use24, onChange }: { use24: boolean; onChange: (v: boolean) => void }) {
  return (
    <NockerlSegmentedControl
      label="Hour format"
      size="sm"
      fullWidth
      segments={[
        { value: '12', label: '12h' },
        { value: '24', label: '24h' },
      ]}
      value={use24 ? '24' : '12'}
      onChange={(v) => onChange(v === '24')}
    />
  );
}

/**
 * The interactive showcase mounted on the Time picker page: a field + popover
 * (single time, 12h, AM/PM), an always-open INLINE clock with a 12h/24h switch +
 * 5-minute step + min/max bound, and a disabled field. All token-driven,
 * keyboard-operable (spinbuttons + dial), "now" pinned to a fixed demo time.
 */
// LEAF, the time-of-day picker. It OWNS the <button>s it renders as its own identity: the field triggers AND the radial clock-face dial numbers (a unique dial affordance, not a NockerlButton/segmented facsimile; see the in-code justification). The hour/minute readouts are role="spinbutton" <div>s (not a facsimile role); AM/PM + 12h/24h compose the real NockerlSegmentedControl; the panel composes NockerlSurface + NockerlIcon.
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default function TimePickerDemo() {
  // 1. Field + popover, single time (12h). The panel + its anchor/flip/clamp,
  // outside-click scrim, and Esc live in the shared NockerlPopover primitive; this
  // demo just drives it through the imperative handle + renders the dial body.
  const [a, setA] = useState({ h24: 14, minute: 30 });
  const [aMode, setAMode] = useState(false); // 12h
  const stageRef = useRef<HTMLDivElement>(null);
  const ph = useRef<NockerlPopoverHandle | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const popOpen = openId != null;

  // 2. Inline, 24h-capable, 5-minute step, no times before NOW (09:41)
  const [b, setB] = useState({ h24: NOW.h24, minute: 45 });
  const [bMode, setBMode] = useState(false);
  const STEP = 5;
  const bInBounds = (h24: number, m: number) => mod(h24, m) >= mod(NOW.h24, NOW.m);

  // Toggle the popover through the handle: same trigger closes, else open anchored
  // BELOW the trigger. With bare + autoFocus={false}, the dial/spinbutton panel owns its
  // shell + its own focus (the popover must not grab a dial number).
  const onTrigger = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (popOpen) ph.current?.close();
    else ph.current?.open('time', 'bottom', e.currentTarget, false);
  };

  return (
    <div className="nk-tp-demo">
      <style>{STYLES}</style>

      <div className="nk-tp-demo__grid">
        {/* ── Field + popover (single, 12h) ── */}
        <div>
          <p className="nk-tp-demo__lbl">Field + popover · 12-hour · AM / PM</p>
          <div className="nk-tp-pop" ref={stageRef}>
            <div className="nk-tp-field">
              <span className="nk-tp-field__label" id="tp-trigger-lbl">Reminder time</span>
              <button type="button" className={`nk-tp-trigger${popOpen ? ' is-open' : ''}`}
                aria-haspopup="dialog" aria-expanded={popOpen} aria-labelledby="tp-trigger-lbl"
                onClick={onTrigger}>
                <span className="nk-tp-trigger__val">{fmt(a.h24, a.minute, aMode)}</span>
                <span className="nk-tp-trigger__icon">{IconClock}</span>
              </button>
            </div>
            {/* the shared NockerlPopover owns the panel, positioning, outside-click scrim + Esc.
                bare = the dial/spinbutton panel owns its own shell (padding via .nk-tp-pop-body,
                its own role); autoFocus={false} = the dial + role="spinbutton" readouts manage
                their own focus, so the popover never grabs a dial number on open. */}
            <NockerlPopover
              bare
              arrow={false}
              autoFocus={false}
              boundaryRef={stageRef}
              handleRef={ph}
              getWidth={() => '248px'}
              onOpenChange={(id) => setOpenId(id)}
              renderContent={() => (
                <div className="nk-tp-pop-body" role="dialog" aria-label="Choose reminder time">
                  <Clock h24={a.h24} minute={a.minute} use24={aMode} minuteStep={1}
                    inBounds={() => true} onPick={setA} />
                  <div className="nk-tp-toolbar">
                    <ModeToggle use24={aMode} onChange={setAMode} />
                  </div>
                  <div className="nk-tp-foot">Type or scroll a field · dial the hour then minute · Esc closes</div>
                </div>
              )}
            />
          </div>
          <p className="nk-tp-demo__out">Selected: <b>{fmt(a.h24, a.minute, aMode)}</b></p>
        </div>

        {/* ── Inline · 24h switch · 5-min step · min bound ── */}
        <div>
          <p className="nk-tp-demo__lbl">Inline · 12 / 24h · 5-min step · no past times</p>
          <NockerlSurface className="nk-tp-panel nk-tp-panel--inline">
            <Clock h24={b.h24} minute={b.minute} use24={bMode} minuteStep={STEP}
              inBounds={bInBounds} onPick={(next) => { if (bInBounds(next.h24, next.minute)) setB(next); }} />
            <div className="nk-tp-toolbar">
              <ModeToggle use24={bMode} onChange={setBMode} />
            </div>
            <div className="nk-tp-foot">Step {STEP} min · selectable from {fmt(NOW.h24, NOW.m, bMode)} onward</div>
          </NockerlSurface>
          <p className="nk-tp-demo__out">Selected: <b>{fmt(b.h24, b.minute, bMode)}</b></p>
        </div>

        {/* ── States: empty placeholder + disabled ── */}
        <div>
          <p className="nk-tp-demo__lbl">States · empty placeholder · disabled</p>
          <div className="nk-tp-field" style={{ marginBottom: 'var(--space-4)' }}>
            <span className="nk-tp-field__label">Snooze until</span>
            <button type="button" className="nk-tp-trigger" aria-haspopup="dialog">
              <span className="nk-tp-trigger__ph">Set a time</span>
              <span className="nk-tp-trigger__icon">{IconClock}</span>
            </button>
          </div>
          <div className="nk-tp-field">
            <span className="nk-tp-field__label">Locked (server-set)</span>
            <button type="button" className="nk-tp-trigger" disabled aria-disabled="true">
              <span className="nk-tp-trigger__val">06:00 AM</span>
              <span className="nk-tp-trigger__icon">{IconClock}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
