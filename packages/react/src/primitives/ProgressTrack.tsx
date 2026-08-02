/**
 * NockerlProgressTrack is the Tier-1 LINEAR progress track primitive. ONE home for the
 * recessed well + the flat cyan fill, the determinate WIDTH grow, the
 * indeterminate sliding segment, the buffer/secondary fill, and the
 * segmented/stepped form. A future track change is ONE edit, not many.
 * Composes ONLY tokens.
 *
 * This is the LINEAR track + fill the progress-bar documents (NOT the determinate
 * circular RING, which is the spinner's geometric sibling and stays inline in the
 * demo, and NOT the context-gauge's threshold-banded meter). The fill is the plain
 * cyan accent with NO threshold banding.
 *
 * Sourced from the shipped Android app (never the web dashboard):
 *   • LinearProgressIndicator in chat/ui/TodoWidget.kt + AgentWidget.kt +
 *     ClusterSheet.kt: a DETERMINATE bar, progress = animatedProgress (the value
 *     interpolates via animateFloatAsState), .height(3.dp)/4.dp,
 *     .clip(NockerlProgressTrackShape) (= RoundedCornerShape(2.dp); see
 *     NockerlShapes.kt NockerlProgressTrackRadius = 2.dp), color = accent,
 *     trackColor = colors.cardHairline. So the REAL bar is squared-off (2px track
 *     radius, the --radius-track token), NOT a pill, and the track is the card
 *     hairline. The indeterminate / buffer / segmented forms are NOT shipped on
 *     Android (its CircularProgressIndicator is indeterminate-only = the spinner).
 *     They were designed ORIGINALLY here from the laws; drift is flagged.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • the TRACK is a recessed WELL (card-hairline base + inner shadow), the inverse
 *     of a card: depth that sinks, never a glow.
 *   • the FILL is FLAT cyan (a subtle top catch-light, NOT a glow); only the
 *     interpolatable WIDTH animates. The fill never tweens. Under
 *     prefers-reduced-motion the width still snaps to the new value (no transition)
 *     and the indeterminate slide FREEZES to a quiet state.
 *   • squared to the --radius-track (2px), the REAL Android NockerlProgressTrackShape.
 *
 * TOKEN-REACTIVE: every color / radius / spacing is a var(--token). The only
 * literals are the transition curves, exactly what tokens don't cover.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { ComposeContract } from '../compose-contract';

export type ProgressSize = 'thin' | 'thick';
export type ProgressTone = 'accent' | 'success' | 'warning' | 'error';

/** Fill base color per tone: the flat cyan accent + the warm status hues. */
export const TONE_FILL: Record<ProgressTone, string> = {
  accent: 'var(--color-accent-primary)',
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)', // the gauge band ladder's amber step
  error: 'var(--color-status-error)',
};
export const TONE_HI: Record<ProgressTone, string> = {
  // The top catch-light tint per tone (a sheen, never a glow).
  accent: 'var(--color-accent-primary-hi)',
  success: 'color-mix(in srgb, var(--color-status-success), #fff 16%)',
  warning: 'color-mix(in srgb, var(--color-status-warning), var(--color-core-white) 16%)',
  error: 'color-mix(in srgb, var(--color-status-error), #fff 16%)',
};

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Shared pass-through props every track form forwards to its rendered root. */
interface TrackRootProps {
  /** Extra class names appended to the root. */
  className?: string;
  /** Inline style merged onto the root. */
  style?: CSSProperties;
  /** ARIA role for the root (the consumer supplies the progressbar semantics). */
  role?: string;
  'aria-label'?: string;
  'aria-valuenow'?: number;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuetext'?: string;
  'aria-busy'?: boolean | 'true' | 'false';
}

export interface NockerlProgressTrackProps extends HTMLAttributes<HTMLDivElement> {
  /** Determinate fill, 0-100 (clamped + rounded). Ignored when `indeterminate`. */
  value?: number;
  /** Track height ramp: thin (the app's 3-4dp) or thick. */
  size?: ProgressSize;
  /** The fill tone, either the plain cyan accent (default) or a warm status hue. */
  tone?: ProgressTone;
  /** A lighter secondary buffer (0-100) rendered BEHIND the primary fill. */
  buffer?: number;
  /** Work of unknown length. A sliding segment travels the track (no value). */
  indeterminate?: boolean;
  /** Override the fill node's children (the demo never does; kept for parity). */
  children?: ReactNode;
}

/** The .nk-pb-track recipe: the recessed well + the flat cyan fill + the
 * indeterminate slide + the buffer + the segmented cells, in one place. */
export const NOCKERL_PROGRESS_TRACK_STYLES = `
/* The TRACK is a recessed well (card-hairline base + inner shadow), squared to the
   --radius-track (2px), the REAL Android NockerlProgressTrackShape. */
.nk-pb-track { position: relative; width: 100%; border-radius: var(--radius-track);
  background: var(--color-card-hairline); overflow: hidden;
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent); }
.nk-pb-track--thin { height: var(--space-1); }   /* 4, matching the app's 3-4dp */
.nk-pb-track--thick { height: var(--space-2); }  /* 8 for the chunkier variant */
/* The FILL is flat cyan, lit from above; ONLY width animates (interpolatable). */
.nk-pb-fill { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: var(--radius-track);
  background: linear-gradient(180deg, var(--fill-hi), var(--fill));
  transition: width .35s var(--motion-easing-standard);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* The BUFFER is a lighter secondary fill BEHIND the primary (e.g. bytes received
   vs. bytes played). Flat accent-soft; only its width animates. */
.nk-pb-buffer { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: var(--radius-track);
  background: var(--color-accent-primary-soft); transition: width .35s var(--motion-easing-standard); }

/* INDETERMINATE: a sliding segment travels the track (transform only, the law).
   No valuenow; aria-busy. Freezes to a quiet static state under reduced-motion. */
.nk-pb-track--indet .nk-pb-indet { position: absolute; inset-block: 0; width: 40%; border-radius: var(--radius-track);
  background: linear-gradient(90deg, transparent, var(--color-accent-primary), transparent);
  animation: nk-pb-slide 1.4s cubic-bezier(.65,0,.35,1) infinite; }
@keyframes nk-pb-slide {
  0% { transform: translateX(-110%); }
  100% { transform: translateX(310%); }
}

/* SEGMENTED / stepped renders N evenly-spaced cells with gaps; filled cells = cyan,
   the rest are the recessed well. Horizontally even, vertically centered. */
.nk-pb-seg { display: flex; gap: var(--space-2); width: 100%; }
.nk-pb-seg__cell { flex: 1 1 0; border-radius: var(--radius-track); height: var(--space-2);
  background: var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent);
  transition: background-color .2s, box-shadow .2s; }
.nk-pb-seg__cell--on { background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary));
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }

@media (prefers-reduced-motion: reduce) {
  .nk-pb-fill, .nk-pb-buffer, .nk-pb-seg__cell { transition: none; }
  /* Indeterminate FREEZES to a quiet static partial fill instead of sliding. */
  .nk-pb-track--indet .nk-pb-indet { animation: none; transform: none;
    width: 100%; background: var(--color-accent-primary-soft); }
}
`;

/**
 * A single Nockerl LINEAR progress track, the unit the spec documents. A recessed
 * well with a flat cyan fill whose WIDTH is the value (determinate), an indeterminate
 * sliding segment, or a buffer + primary pair. The consumer supplies the progressbar
 * role + aria-* (the value strings are caller data). The .nk-pb-track div is the root.
 * The recipe CSS is injected as its LAST child.
 */
export const NockerlProgressTrack = forwardRef<HTMLDivElement, NockerlProgressTrackProps>(function NockerlProgressTrack({
  value = 0,
  size = 'thin',
  tone = 'accent',
  buffer,
  indeterminate = false,
  className,
  children,
  ...rest
}, ref) {
  const pct = clampPct(value);
  const cls = ['nk-pb-track', `nk-pb-track--${size}`, indeterminate ? 'nk-pb-track--indet' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div {...rest} ref={ref} className={cls}>
      {indeterminate ? (
        children ?? <div className="nk-pb-indet" />
      ) : (
        <>
          {buffer !== undefined && (
            <div className="nk-pb-buffer" style={{ width: `${clampPct(buffer)}%` }} aria-hidden="true" />
          )}
          <div
            className="nk-pb-fill"
            style={{ width: `${pct}%`, ['--fill' as string]: TONE_FILL[tone], ['--fill-hi' as string]: TONE_HI[tone] }}
          />
          {children}
        </>
      )}
      <style>{NOCKERL_PROGRESS_TRACK_STYLES}</style>
    </div>
  );
});

export interface NockerlProgressSegmentsProps extends TrackRootProps {
  /** Total cells. */
  total: number;
  /** How many leading cells are filled (cyan). */
  filled: number;
}

/**
 * The SEGMENTED / stepped linear form: N evenly-spaced cells with gaps; the leading
 * `filled` cells are cyan, the rest are the recessed well. A sibling of the bar (its
 * own .nk-pb-seg root); the consumer supplies the progressbar role + aria-*. The
 * recipe CSS is injected as the LAST child.
 */
export function NockerlProgressSegments({ total, filled, className, style, ...aria }: NockerlProgressSegmentsProps) {
  const cls = ['nk-pb-seg', className].filter(Boolean).join(' ');
  return (
    <div className={cls} style={style} {...aria}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`nk-pb-seg__cell${i < filled ? ' nk-pb-seg__cell--on' : ''}`} />
      ))}
      <style>{NOCKERL_PROGRESS_TRACK_STYLES}</style>
    </div>
  );
}

/** LEAF: the linear progress primitive; owns the progressbar identity (consumers pass
 *  role="progressbar" through to its rendered track). Renders div markup + tokens. */
export const compose = { tier: 'leaf', owns: ['role=progressbar'] } satisfies ComposeContract;

export default NockerlProgressTrack;
