/**
 * RecordingHudDemo: the live, interactive Nockerl Voice SIGNATURE recording HUD
 * for the web. The dynamic dictation overlay shown while recording: a live audio
 * level meter (equalizer), an elapsed timer, the recording status, an indeterminate
 * "Transcribing…" phase, an error row, and stop / pause / cancel controls.
 *
 * Sourced 1:1 from the two shipped apps (never the web dashboard):
 *   • Voice (Swift, canonical):  UI/RecordingHUD.swift. A non-activating panel whose
 *     status pill MORPHS between phases; a 5-bar `Equalizer`; an indeterminate
 *     `ProgressView`; a pulsing error dot; an error row.
 *   • Android (Compose, canonical): chat/ui/VoiceRecordingUI.kt, with `RecordingIndicatorStrip`
 *     (pulsing dot + timer + `LiveEqualizer` + Cancel) + `TranscribingIndicatorStrip`.
 *
 * The REAL meter geometry + math is reproduced verbatim (see EQ below): 5 bars,
 * 3px wide, 3px gap, 20px tall, log-normalized `ln(raw+1)/ln(32768)` (raw = level *
 * 32767), clamped to [0.08, 1], identical across both platforms. Levels here are
 * SYNTHETIC (a sum-of-sines pseudo-waveform), never a real microphone.
 *
 * THE BRAND MARK LEADS (ratified): the canonical HUD opens with the real
 * monochrome Nockerl mark, so the pill reads as *Nockerl is listening*, never an
 * anonymous red strip (the native NockerlRecordingHud leads with NockerlLogo the same
 * way). `showBrand` therefore DEFAULTS TRUE; the brand-less variant stays available
 * as an explicit opt-out for tightly embedded chrome. The mark is the shared
 * monochrome <NockerlLogo> (theme-adaptive via currentColor), NOT a cyan brand mark.
 *
 * Design laws honored verbatim:
 *   • Depth = a NEUTRAL drop shadow + a top catch-light (law 1). No glow, no colored
 *     shadow, no neon. The meter bars are a flat accent fill, never an emission.
 *   • Feedback animates interpolatable props only (law 5): bar HEIGHT + dot OPACITY +
 *     control transform/brightness. The fill is static; nothing tweens a gradient.
 *   • The record DOT uses the WARM danger token where the apps do (law 8: warm =
 *     status, never decorative); the live TIMER reads in normal theme text (light on
 *     dark, dark on light) so only the status dot carries the warm hue; the meter
 *     uses the brand cyan.
 *   • prefers-reduced-motion: the meter FREEZES to a static representative frame and
 *     the indeterminate progress quiets (law 6 / a11y).
 *
 * TOKEN-REACTIVE (docs/demo-token-contract.md): every color / font / radius / spacing
 * / type size is a `var(--token)`. The dark stage resolves them to the dark palette;
 * change a token and this HUD moves with everything else. Literals remain ONLY for the
 * meter bar SVG geometry + the synthetic-waveform math + transition curves.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import NockerlLogo from '../NockerlLogo';
import { NockerlButton, NockerlIcon, NockerlIconButton, NockerlSegmentedControl, NockerlSpinner, type ComposeContract } from '@dizyx/nockerl-react';

// ─── REAL meter geometry + math (RecordingHUD.swift / VoiceRecordingUI.kt) ─────
// Bar GEOMETRY constants, not design tokens. Identical across both shipped apps.
const EQ = {
  barCount: 5, // HUDState.barCount = 5 (Swift) / amplitudes ring of 5 (Android)
  barWidth: 3, // Capsule width 3 / barWidth 3.dp
  gap: 3, // HStack spacing 3 / gap 3.dp
  height: 20, // Equalizer height 20 / Modifier.height(20.dp)
  minFraction: 0.08, // floor so a silent bar is still a visible nub
} as const;
const EQ_WIDTH = EQ.barCount * EQ.barWidth + (EQ.barCount - 1) * EQ.gap; // 27

/** Log-normalize a raw 0..1 level exactly like both apps: ln(raw+1)/ln(32768). */
function barHeight(level: number): number {
  const raw = Math.max(0, Math.min(level, 1)) * 32_767;
  const normalized = Math.log(raw + 1) / Math.log(32_768);
  const clamped = Math.max(EQ.minFraction, Math.min(1, normalized));
  return clamped * EQ.height;
}

export type HudPhase = 'recording' | 'paused' | 'transcribing' | 'result' | 'error';

// All visual values are tokens; literals remain only for meter SVG geometry, the
// synthetic-level math, and transition curves.
export const STYLES = `
.nk-hud-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
.nk-hud-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }

/* ── the HUD surface, a floating chrome pill (lit from above), exactly the native
   shape: chrome surface + accent edge + a NEUTRAL L3 shadow + a top catch-light.
   It is a true stadium (the one native exception that uses the pill radius). ── */
.nk-hud {
  display: inline-flex; align-items: center; gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--color-chrome-surface);
  /* The §2 SIGNATURE floating edge (the ratified --border-width-floating, the
     same weight as the chat pill it rides above) gives it identical floating language. */
  border: var(--border-width-floating) solid var(--color-accent-primary);
  box-shadow: 0 var(--elevation-level3) 22px -8px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  transition: border-color .2s, box-shadow .2s;
  max-width: 100%;
}
.nk-hud--error { border-color: var(--color-status-warning); }
/* left anchor: the REAL monochrome Nockerl mark + a divider, fixed through every
   phase. The CANONICAL default (the pill reads as "Nockerl is listening");
   showBrand={false} opts out for tightly embedded chrome. The mark inherits text
   color via currentColor, so it adapts to light/dark with no extra tokens. */
.nk-hud__brand { flex: 0 0 auto; display: inline-flex; color: var(--color-on-chrome); }
.nk-hud__brand svg { display: block; }
.nk-hud__rule { flex: 0 0 auto; width: var(--space-px); height: var(--space-6);
  background: var(--color-divider); }
/* the part that MORPHS per phase, cross-faded so a re-render never flashes */
.nk-hud__content { flex: 1 1 auto; min-width: 0; display: inline-flex; align-items: center;
  gap: var(--space-3); animation: nk-hud-fade .28s cubic-bezier(.2,0,0,1); }
@keyframes nk-hud-fade { from { opacity: 0; } to { opacity: 1; } }

/* pulsing record dot: WARM danger token; opacity is the only thing that animates */
.nk-hud__dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: var(--radius-pill);
  background: var(--color-status-error); animation: nk-hud-pulse .6s ease-in-out infinite alternate; }
.nk-hud__dot--paused { animation: none; opacity: .5; }
@keyframes nk-hud-pulse { from { opacity: 1; } to { opacity: .3; } }

/* elapsed timer: the MONO token, tabular so the colon never jitters. NORMAL theme
   text (light on dark, dark on light), so only the record DOT carries the warm hue. */
.nk-hud__time { flex: 0 0 auto; font-family: var(--font-family-mono); font-size: var(--font-size-12);
  font-weight: var(--font-weight-medium); line-height: 1; font-variant-numeric: tabular-nums;
  color: var(--color-on-canvas); }
.nk-hud__time--paused { color: var(--color-on-chrome-muted); }

/* status word: sits next to the meter, body-small on chrome */
.nk-hud__status { flex: 0 0 auto; font-size: var(--font-size-12); font-weight: var(--font-weight-medium);
  color: var(--color-on-chrome); white-space: nowrap; }

/* the live equalizer: bars are a flat accent fill (NOT a glow); only HEIGHT moves */
.nk-hud__meter { flex: 0 0 auto; display: block; overflow: visible; }
.nk-hud__bar { fill: var(--color-accent-primary); transition: height .08s ease-out, y .08s ease-out; }
.nk-hud--paused .nk-hud__bar { fill: var(--color-on-chrome-muted); }

/* indeterminate transcribe loader: the real NockerlSpinner primitive; this rule keeps only
   its flex slot (the arc, rotation, reduced-motion calm + track live in the primitive). */
.nk-hud__spin { flex: 0 0 auto; }

/* error row: color + ICON + TEXT (never color alone), warm warning token */
.nk-hud__err { display: inline-flex; align-items: center; gap: var(--space-2); min-width: 0; }
.nk-hud__err svg, .nk-hud__result svg { flex: 0 0 auto; display: block; width: 16px; height: 16px; }
.nk-hud__err svg { color: var(--color-status-warning); }
.nk-hud__errtext { font-size: var(--font-size-12); line-height: var(--font-line-height-16);
  color: var(--color-on-chrome); overflow: hidden; text-overflow: ellipsis;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

/* success/result row: a check (pasted) or clipboard (copied) + the label. The mark
   carries the EARNED brand cyan (a real success beat; cyan is scarce); the label reads
   neutral on-chrome, because status lives in the MARK, not the text. The §2 accent edge stays. */
.nk-hud__result { display: inline-flex; align-items: center; gap: var(--space-2); min-width: 0; }
.nk-hud__result svg { color: var(--color-accent-primary); }
.nk-hud__resulttext { font-size: var(--font-size-12); font-weight: var(--font-weight-medium);
  line-height: var(--font-line-height-16); color: var(--color-on-chrome); white-space: nowrap; }
/* the result DISMISS: after the ~1.8s success beat the pill shoots straight DOWN and fades
   (the design lead's final-review motion; constant height, width already shrunk to check+word). This
   is MOTION, so it is eyeball-gated on the live build, never the pixel gate (VRT captures stills). */
.nk-hud--dismissing { animation: nk-hud-dropout .34s ease-in forwards; }
@keyframes nk-hud-dropout { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(160%); } }

/* ── controls: composed from the NockerlIconButton primitive (PLAIN for pause/resume/cancel
   + the one FILLED CIRCLE for stop, with the warm danger accent). They sit on a recessed
   control bar UNDER the HUD; neither app ships explicit stop/pause/cancel inline (see the
   drift note on the page). The button vocabulary itself lives in the primitive. ── */
.nk-hud__controls { margin-top: var(--space-4); display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2); border-radius: var(--radius-control);
  background: var(--color-canvas-alt); border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent); }

.nk-hud-demo__row { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--space-6); }
.nk-hud-demo__stack { display: flex; flex-direction: column; align-items: flex-start; }
/* the two-variant board: with-logo (Voice) beside without-logo (in-app / web) */
.nk-hud-demo__variants { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--space-6); }
.nk-hud-demo__variant { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-3); }
.nk-hud-demo__cap { margin: 0; font-size: var(--font-size-12); color: var(--color-on-canvas); }
.nk-hud-demo__cap b { font-weight: var(--font-weight-semibold); }
.nk-hud-demo__cap span { color: var(--color-on-canvas-muted); }
.nk-hud-demo__note { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin: var(--space-5) 0 0;
  display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.nk-hud-demo__note b { color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); }
.nk-hud-demo__rm { color: var(--color-status-warning); }
@media (prefers-reduced-motion: reduce) {
  .nk-hud, .nk-hud__content { transition: none; animation: none; }
  .nk-hud__bar { transition: none; }
  .nk-hud__dot { animation: none; opacity: 1; }
  .nk-hud__spin { animation-duration: 1.4s; }
}
`;

// ─── glyphs: stroke icons via the shared NockerlIcon shell; currentColor so each control tints right.
// IconStop stays a hand-rolled <svg>: it is a FILLED square (fill=currentColor), NOT a stroke
// glyph, the one bespoke fill-based control, kept inline per the migration rule. The `stroke`
// spread below remains solely for it.
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const IconPause = (<NockerlIcon><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></NockerlIcon>);
const IconResume = <NockerlIcon path="M8 5v14l11-7z" />;
const IconStop = (<svg viewBox="0 0 24 24" {...stroke}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /></svg>);
const IconCancel = <NockerlIcon name="x" />;
const IconWarn = (<NockerlIcon><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></NockerlIcon>);
// result glyphs for the success beat. IconPasted mirrors Voice's checkmark.circle.fill (a
// FILLED cyan disc + knockout check, a bespoke fill svg like IconStop); IconCopied mirrors
// doc.on.clipboard (stroked two-sheet copy mark). Both inherit the cyan accent via `color`.
const IconPasted = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path d="M7.5 12.4l3 3 6-6.6" fill="none" stroke="var(--color-chrome-surface)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconCopied = (<NockerlIcon><rect x="9" y="9" width="10" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h7" /></NockerlIcon>);

/** Format elapsed seconds as m:ss, matching `%d:%02d` (Swift) and `$m:${s.padStart(2,'0')}` (Android). */
function timeString(totalSeconds: number): string {
  const total = Math.floor(totalSeconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** The 5-bar equalizer: the REAL geometry, rendered as a token-filled SVG. */
function Equalizer({ levels }: { levels: number[] }) {
  return (
    <svg className="nk-hud__meter" width={EQ_WIDTH} height={EQ.height} viewBox={`0 0 ${EQ_WIDTH} ${EQ.height}`}
      role="img" aria-label="Live audio input level">
      {levels.map((lvl, i) => {
        const h = barHeight(lvl);
        const x = i * (EQ.barWidth + EQ.gap);
        return (
          <rect key={i} className="nk-hud__bar" x={x} y={(EQ.height - h) / 2}
            width={EQ.barWidth} height={h} rx={EQ.barWidth / 2} />
        );
      })}
    </svg>
  );
}

export interface RecordingHudProps {
  /** Which phase the HUD is showing. */
  phase: HudPhase;
  /** Live audio levels, one per bar (0..1). Frozen frame when paused/reduced. */
  levels: number[];
  /** Elapsed recording time in seconds (drives the m:ss timer). */
  elapsed: number;
  /** Message shown in the error row (phase === 'error'). */
  error?: string;
  /**
   * For phase === 'result': whether the transcript was auto-PASTED into the focused app
   * (true → "Pasted") or COPIED to the clipboard fallback (false → "Copied to clipboard").
   * Omit for a generic success ("Done"). Mirrors Voice's result(pasted: Bool). Ignored otherwise.
   */
  pasted?: boolean | undefined;
  /**
   * Plays the result DISMISS: the pill shoots down + fades (the success beat's exit). The
   * host sets it true as the result leaves, then returns to idle. Motion only; VRT-exempt.
   */
  dismissing?: boolean | undefined;
  /**
   * Show the real Nockerl mark on the left. TRUE by default (ratified: the
   * canonical HUD LEADS with the brand, matching the native NockerlRecordingHud, so
   * the pill reads as "Nockerl is listening"). Pass false to opt out in tightly
   * embedded chrome. The mark is the shared monochrome <NockerlLogo>
   * (theme-adaptive via currentColor), never cyan.
   */
  showBrand?: boolean;
  /**
   * Optional CANCEL at the trailing edge (a ghost NockerlButton inside the pill),
   * following the native HUD's [brand → dot → timer → equalizer → ghost Cancel] order. Omit
   * when the host renders its own controls (this page's control bar does).
   */
  onCancel?: (() => void) | undefined;
}

/** The HUD surface itself: the morphing status pill, exactly as the apps draw it. */
export function RecordingHud({ phase, levels, elapsed, error, pasted, dismissing, showBrand = true, onCancel }: RecordingHudProps) {
  // pasted → "Pasted" · copied → "Copied to clipboard" · omitted → generic "Done" (Voice
  // always passes the bool; the generic is a web-side graceful default). Mirrors Voice 1:1.
  const resultText = pasted === false ? 'Copied to clipboard' : pasted === true ? 'Pasted' : 'Done';
  const liveText =
    phase === 'recording' ? `Recording, ${timeString(elapsed)}`
    : phase === 'paused' ? `Paused at ${timeString(elapsed)}`
    : phase === 'transcribing' ? 'Transcribing'
    : phase === 'result' ? resultText
    : `Error: ${error ?? ''}`;
  return (
    <div className={`nk-hud nk-hud--${phase}${dismissing ? ' nk-hud--dismissing' : ''}`} role="status">
      {showBrand && (
        <>
          <span className="nk-hud__brand">
            <NockerlLogo size={16} decorative />
          </span>
          <span className="nk-hud__rule" aria-hidden="true" />
        </>
      )}
      <span className="nk-hud__sr" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {liveText}
      </span>
      <span className="nk-hud__content" key={phase} aria-hidden="true">
        {(phase === 'recording' || phase === 'paused') && (
          <>
            <span className={`nk-hud__dot${phase === 'paused' ? ' nk-hud__dot--paused' : ''}`} />
            <span className={`nk-hud__time${phase === 'paused' ? ' nk-hud__time--paused' : ''}`}>{timeString(elapsed)}</span>
            <Equalizer levels={levels} />
            {phase === 'paused' && <span className="nk-hud__status">Paused</span>}
          </>
        )}
        {phase === 'transcribing' && (
          <>
            {/* the indeterminate loader is the real NockerlSpinner primitive (xs = 14px, accent
                arc). The Voice HUD is its documented source; the demo keeps only the
                flex slot so it never inflates the pill height. */}
            <NockerlSpinner size="xs" tone="accent" track className="nk-hud__spin" label="Transcribing" />
            <span className="nk-hud__status">Transcribing…</span>
          </>
        )}
        {phase === 'result' && (
          <span className="nk-hud__result">
            {pasted === false ? IconCopied : IconPasted}
            <span className="nk-hud__resulttext">{resultText}</span>
          </span>
        )}
        {phase === 'error' && (
          <span className="nk-hud__err">
            {IconWarn}
            <span className="nk-hud__errtext">{error}</span>
          </span>
        )}
      </span>
      {/* optional trailing ghost CANCEL (the native HUD order), a real NockerlButton */}
      {onCancel && <NockerlButton text="Cancel" variant="ghost" size="sm" onClick={onCancel} />}
    </div>
  );
}

// RecordingHud is a LEAF: its content is DATA (phase / levels / elapsed / error) + the NockerlLogo
// glyph, with no component slot. The indeterminate "Transcribing" loader composes the real NockerlSpinner
// primitive (the Voice HUD is its documented source); the optional trailing Cancel composes a real
// ghost NockerlButton (the native HUD order); the equalizer + record dot stay hand-rolled as
// the HUD's own signature meter. The stop/pause/cancel IconButtons + NockerlSegmentedControl live in the demo
// scaffold, not the HUD itself. No owns.
export const compose = {
  tier: 'leaf',
} satisfies ComposeContract;

const PHASES: { id: HudPhase; label: string }[] = [
  { id: 'recording', label: 'Recording' },
  { id: 'paused', label: 'Paused' },
  { id: 'transcribing', label: 'Transcribing' },
  { id: 'result', label: 'Result' },
  { id: 'error', label: 'Error' },
];

/**
 * The interactive showcase mounted on the Recording HUD page: BOTH logo variants
 * side by side, WITH the real Nockerl mark (Nockerl Voice, the floating overlay)
 * and WITHOUT it (inside the native app + web), sharing one live 5-bar level meter,
 * one counting elapsed timer, and one set of working stop / pause / cancel controls
 * that drive the phase. The phase picker covers recording (live meter) · paused
 * (frozen meter) · transcribing (indeterminate) · result (success check + Pasted/
 * Copied, with the shoot-down dismiss) · error. Stop plays the real end-to-end beat.
 * Honors prefers-reduced-motion (the meter freezes; the spinner quiets).
 */
export default function RecordingHudDemo() {
  const [phase, setPhase] = useState<HudPhase>('recording');
  const [elapsed, setElapsed] = useState(8);
  const [levels, setLevels] = useState<number[]>(() => Array(EQ.barCount).fill(0.2));
  const [reduced, setReduced] = useState(false);
  const [resultPasted, setResultPasted] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const rafRef = useRef<number | null>(null);
  const seqRef = useRef<number[]>([]);
  const live = phase === 'recording' && !reduced;

  // prefers-reduced-motion → freeze the meter to a representative static frame.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = (): void => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Synthetic level meter: a sum-of-sines pseudo-waveform per bar (NO real mic).
  // Only bar HEIGHT animates (an interpolatable prop); the fill never changes.
  const tick = useCallback((t: number) => {
    const next = Array.from({ length: EQ.barCount }, (_, i) => {
      const a = Math.sin(t * 0.0021 + i * 1.7);
      const b = Math.sin(t * 0.0053 + i * 0.9);
      const c = Math.sin(t * 0.011 + i * 2.3);
      const env = 0.55 + 0.32 * Math.sin(t * 0.0009); // slow speaking envelope
      return Math.max(0, Math.min(1, env * (0.5 + 0.28 * a + 0.16 * b + 0.1 * c)));
    });
    setLevels(next);
  }, []);

  useEffect(() => {
    if (!live) {
      // Frozen representative frame (a believable mid-speech snapshot), so paused /
      // reduced-motion still reads as a real meter rather than empty bars.
      setLevels([0.32, 0.74, 0.5, 0.86, 0.4]);
      return;
    }
    let start: number | null = null;
    const loop = (now: number): void => {
      if (start === null) start = now;
      tick(now - start);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [live, tick]);

  // Elapsed timer ticks while recording (mirrors the app's 250ms ticker, 1s steps).
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const clearSeq = (): void => { seqRef.current.forEach((id) => window.clearTimeout(id)); seqRef.current = []; };
  const restart = (): void => { clearSeq(); setDismissing(false); setElapsed(0); setPhase('recording'); };
  useEffect(() => () => { seqRef.current.forEach((id) => window.clearTimeout(id)); }, []);
  // Stop drives the REAL end-to-end beat the design lead reviews: transcribing → result (Pasted /
  // Copied per the toggle) → hold 1.8s (Voice's timing) → shoot down → back to idle. It is
  // user-triggered, so VRT (which only ever captures the default 'recording' mount) never
  // sees the motion. The phase picker still selects any phase statically for close review.
  const runStopSequence = (): void => {
    clearSeq();
    setDismissing(false);
    setPhase('transcribing');
    seqRef.current.push(window.setTimeout(() => setPhase('result'), 1300));
    seqRef.current.push(window.setTimeout(() => setDismissing(true), 3100));
    seqRef.current.push(window.setTimeout(() => restart(), 3460));
  };

  return (
    <div className="nk-hud-demo">
      <style>{STYLES}</style>

      <p className="nk-hud-demo__lbl">Recording HUD: two variants, one shared live meter & controls</p>
      <div className="nk-hud-demo__row">
        <div className="nk-hud-demo__stack">
          {/* the two variants, side by side, sharing phase / levels / elapsed */}
          <div className="nk-hud-demo__variants">
            <div className="nk-hud-demo__variant">
              <RecordingHud phase={phase} levels={levels} elapsed={elapsed}
                pasted={resultPasted} dismissing={dismissing}
                error="Mic unavailable, transcription failed. Tap to retry." />
              <p className="nk-hud-demo__cap"><b>With logo</b>: <span>the canonical default, Nockerl is listening</span></p>
            </div>
            <div className="nk-hud-demo__variant">
              <RecordingHud phase={phase} levels={levels} elapsed={elapsed} showBrand={false}
                pasted={resultPasted} dismissing={dismissing}
                error="Mic unavailable, transcription failed. Tap to retry." />
              <p className="nk-hud-demo__cap"><b>No logo</b>: <span>explicit opt-out for tightly embedded chrome</span></p>
            </div>
          </div>

          {/* working stop / pause / cancel, composed from the NockerlIconButton primitive
              (plain for pause/resume/cancel, the one filled-circle for stop with the
              warm danger accent). Focus rings + aria-labels come from the primitive. */}
          <div className="nk-hud__controls" role="group" aria-label="Recording controls">
            {phase === 'paused' ? (
              <NockerlIconButton icon={IconResume} label="Resume recording" onClick={() => setPhase('recording')} />
            ) : (
              <NockerlIconButton icon={IconPause} label="Pause recording"
                disabled={phase !== 'recording'} onClick={() => setPhase('paused')} />
            )}
            <NockerlIconButton icon={IconStop} label="Stop and transcribe" variant="filled-circle"
              accent="var(--color-status-error)" disabled={phase === 'transcribing' || phase === 'result'}
              onClick={runStopSequence} />
            <NockerlIconButton icon={IconCancel} label="Cancel recording" onClick={restart} />
          </div>
        </div>

        <div className="nk-hud-demo__stack">
          <span className="nk-hud-demo__lbl" style={{ margin: 0 }}>Phase</span>
          <NockerlSegmentedControl
            label="HUD phase"
            size="sm"
            segments={PHASES.map((p) => ({ value: p.id, label: p.label }))}
            value={phase}
            onChange={(n) => { if (n === 'recording') restart(); else { clearSeq(); setDismissing(false); setPhase(n as HudPhase); } }}
          />
          {phase === 'result' && (
            <NockerlSegmentedControl
              label="Result kind"
              size="sm"
              segments={[{ value: 'pasted', label: 'Pasted' }, { value: 'copied', label: 'Copied' }]}
              value={resultPasted ? 'pasted' : 'copied'}
              onChange={(v) => setResultPasted(v === 'pasted')}
              style={{ marginTop: 'var(--space-3)' }}
            />
          )}
          {/* aria-live mirror: announces phase + elapsed without spamming the meter */}
          <p className="nk-hud-demo__note" aria-live="polite">
            {reduced ? (
              <><span className="nk-hud-demo__rm">prefers-reduced-motion</span>: meter frozen to a static frame.</>
            ) : (
              <>State: <b>{PHASES.find((p) => p.id === phase)?.label}</b>{phase === 'recording' || phase === 'paused' ? <> · {timeString(elapsed)}</> : null}. The HUD is live & token-colored.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
