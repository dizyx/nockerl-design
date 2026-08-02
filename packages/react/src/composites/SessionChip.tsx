/**
 * NockerlSessionChip / NockerlContextChip: the SESSION CHIP canon.
 *
 * A filled stadium pill whose body is a column of a label ROW over a thin CONTEXT
 * LINE, both rendered INSIDE the pill so the line reads as part of the chip (never a
 * sibling floating beneath it). Sourced faithfully from Android's
 * `chat/ui/SessionChipsBar.kt` keycaps; unified with the Context gauge inline strip
 * (Dashboard). Same element, one design:
 *
 *   • `NockerlSessionChip` is the INTERACTIVE keycap (a real <button>): status dot
 *     (priority ladder, pulse on attention/streaming) + engine glyph + name +
 *     selection mark + the inner usage line, with on/off press states.
 *   • `NockerlContextChip` is the STATIC read-only pill (engine glyph + name + line).
 *
 * The per-chip line is the shipped SessionChipsBar treatment: cyan (< .60, healthy)
 * → amber (< .85, elevated) → red (>= .85, critical) over a faint empty track
 * (canvasEdge); a null ratio = no data = a dimmed empty track, never a faked fill.
 * `contextLineColor` resolves the SAME tokens as the NockerlGauge primitive's
 * GAUGE_BAND_FILL so the strip stays in lock-step with the named meter.
 *
 * Laws: the pill SHAPE is the reserved stadium; depth = neutral drop shadow + top
 * catch-light (no glow); active = the sanctioned selected TINT (soft cyan wash) at a
 * HIGHER lift; feedback animates brightness/transform/shadow only (the fill never
 * tweens); focus is an OUTLINE. TOKEN-REACTIVE; literals are pure geometry (dot /
 * glyph / line thickness) + transition curves. No backticks in STYLES.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { ComposeContract } from '../compose-contract';

// ─── Band ramp: cyan → amber → red at the real thresholds (0.60 / 0.85) ────────
export function contextLineColor(ratio: number): string {
  if (ratio >= 0.85) return 'var(--color-status-error)';
  if (ratio >= 0.6) return 'var(--color-status-warning)';
  return 'var(--color-accent-primary)';
}

// The dot priority ladder (attention > streaming > unread > active > idle) uses status
// tokens only; cyan = active. Only the interactive chip shows a leading dot.
export type NockerlSessionChipDot = 'attention' | 'streaming' | 'unread' | 'active' | 'idle';
const DOT_COLOR: Record<NockerlSessionChipDot, string> = {
  attention: 'var(--color-dot-attention)',
  streaming: 'var(--color-dot-streaming)',
  unread: 'var(--color-dot-unread)',
  active: 'var(--color-dot-active)',
  idle: 'var(--color-dot-idle)',
};

// Everything here is the reserved PILL. Depth is a neutral drop shadow + a top
// catch-light; press feedback animates brightness/transform/shadow only (the fill
// never tweens). All values are tokens; literals are pure geometry / transition curves.
export const NOCKERL_SESSION_CHIP_STYLES = `
/* The chip SHELL: the pressable key (a <button> when interactive) OR a plain span
   (when static). Zero chrome of its own; the body carries the pill. */
.nk-cchip { flex: 0 0 auto; display: flex; background: transparent; border: 0; padding: 0;
  font-family: inherit; border-radius: var(--radius-pill); }
button.nk-cchip { cursor: pointer; }
button.nk-cchip:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary);
  outline-offset: var(--space-0-5); border-radius: var(--radius-pill); }

/* The BODY is a column: a label ROW over the per-chip context LINE, both INSIDE the
   pill so the line reads as part of the chip. This is the whole point of the unify. */
.nk-cchip__body {
  display: flex; flex-direction: column; gap: var(--space-1);
  padding: var(--space-2) var(--space-3); min-height: var(--space-10);
  border-radius: var(--radius-pill); font-size: var(--font-size-12);
  font-weight: var(--font-weight-medium); line-height: var(--font-line-height-16); white-space: nowrap;
  transition: transform .14s cubic-bezier(.2,0,0,1), filter .14s, box-shadow .14s;
}
/* the label row inside the body: dot (optional) + engine glyph + session name */
.nk-cchip__label { display: inline-flex; align-items: center; gap: var(--space-2); }
.nk-cchip__name { max-width: 130px; overflow: hidden; text-overflow: ellipsis; }
.nk-cchip__engine { display: inline-flex; flex: 0 0 auto; }
.nk-cchip__engine svg { display: block; width: 13px; height: 13px; }
.nk-cchip__dot { width: 7px; height: 7px; border-radius: var(--radius-pill); flex: 0 0 auto; }
.nk-cchip__dot--pulse { animation: nk-cchip-pulse .8s ease-in-out infinite alternate; }
@keyframes nk-cchip-pulse { to { opacity: .3; } }
/* the cyan selection MARK, a small accent check that rides the active label */
.nk-cchip__mark { display: inline-flex; flex: 0 0 auto; color: var(--color-accent-primary); }
.nk-cchip__mark svg { display: block; width: 13px; height: 13px; }

/* context line INSIDE the pill body: fills L to R by usage, spans the body width */
.nk-cchip__line { height: 4px; border-radius: var(--radius-pill); background: var(--color-canvas-edge); overflow: hidden; }
.nk-cchip__line-fill { height: 100%; border-radius: var(--radius-pill); }
.nk-cchip__line--empty { opacity: .6; }

/* ── STATIC chip (read-only strip) is a SOLID resting pill: distinct chrome fill + a
      hairline + top catch-light + a low neutral lift. No press states. ───────────── */
.nk-cchip--static .nk-cchip__body {
  background: var(--color-chrome-surface); color: var(--color-on-chrome);
  border: var(--space-px) solid var(--color-chrome-hairline);
  box-shadow: 0 var(--elevation-level1) var(--space-2) -4px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}

/* ── INTERACTIVE chip (keycap). Inactive: SOLID resting surface + hairline, LOWER
      lift, dimmed content. Active: the sanctioned selected TINT (soft cyan wash over
      bright chrome), HIGHER lift, full-strength label. Solid-first; NO rail/stripe. ── */
.nk-cchip--off .nk-cchip__body {
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-chrome-hairline);
  color: color-mix(in srgb, var(--color-on-card) 78%, transparent);
  box-shadow: 0 var(--elevation-level1) var(--elevation-level3) -5px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-cchip--off:hover .nk-cchip__body { filter: brightness(1.1); transform: translateY(-1px); }
.nk-cchip--off:active .nk-cchip__body { transform: scale(.97); filter: brightness(.96); }
/* : the active keycap's cyan edge marks WHICH session is chosen, so it takes the
   SELECTION weight at 45%. (The chips BAR around it keeps the floating weight, since the
   bar floats over content and a chip inside it does not.) */
.nk-cchip--on .nk-cchip__body {
  background: color-mix(in srgb, var(--color-accent-primary) 18%, var(--color-card-surface2));
  border: var(--border-width-selection) solid color-mix(in srgb, var(--color-accent-primary) 45%, transparent);
  color: var(--color-on-card);
  font-weight: var(--font-weight-semibold);
  box-shadow: 0 var(--elevation-level3) 16px -6px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level2) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-cchip--on:hover .nk-cchip__body { filter: brightness(1.06); transform: translateY(-1px); }
.nk-cchip--on:active .nk-cchip__body { transform: scale(.97); filter: brightness(.92); }

@media (prefers-reduced-motion: reduce) {
  .nk-cchip__body { transition: none; }
  .nk-cchip__dot--pulse { animation: none; opacity: 1; }
}
`;

export interface NockerlSessionChipProps {
  /** Selected keycap: the sanctioned cyan selection tint + higher lift + aria-pressed. */
  active: boolean;
  /** Leading status dot from the priority ladder. attention/streaming pulse. */
  dot: NockerlSessionChipDot;
  /** The engine identity glyph (an <NockerlIcon>, currentColor). */
  engineGlyph: ReactNode;
  /** The session name (ellipsized). Carries the accessible name. */
  name: string;
  /** Optional selection mark (an accent check) shown only while active. */
  mark?: ReactNode;
  /** Context-usage ratio 0..1 → the inner line (cyan → amber → red); null = a faint empty track. */
  ratio: number | null;
  onSelect: () => void;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

export interface NockerlContextChipProps {
  /** The engine identity glyph (an <NockerlIcon>, currentColor). */
  engineGlyph: ReactNode;
  /** The session name (ellipsized). */
  name: string;
  /** Context-usage ratio 0..1 → the inner line; null = a faint empty track. */
  ratio: number | null;
  /** Native hover tooltip. Named `tooltip` because `title` means heading-text
   *  everywhere else in the family. */
  tooltip?: string;
  ariaLabel?: string;
}

/** The pill BODY: the label row over the inner context line. Shared by both chips. */
function ChipBody({
  dot,
  engineGlyph,
  name,
  mark,
  ratio,
}: {
  dot?: NockerlSessionChipDot;
  engineGlyph: ReactNode;
  name: ReactNode;
  mark?: ReactNode;
  ratio: number | null;
}) {
  const has = ratio !== null;
  return (
    <span className="nk-cchip__body">
      <span className="nk-cchip__label">
        {dot && (
          <span
            className={`nk-cchip__dot${dot === 'streaming' || dot === 'attention' ? ' nk-cchip__dot--pulse' : ''}`}
            style={{ background: DOT_COLOR[dot] }}
            aria-hidden="true"
          />
        )}
        <span className="nk-cchip__engine">{engineGlyph}</span>
        <span className="nk-cchip__name">{name}</span>
        {mark && (
          <span className="nk-cchip__mark" aria-hidden="true">
            {mark}
          </span>
        )}
      </span>
      {/* the per-chip context line lives INSIDE the body: a fill sized by usage, or a faint empty track */}
      <span className={`nk-cchip__line${has ? '' : ' nk-cchip__line--empty'}`} aria-hidden="true">
        {has && (
          <span
            className="nk-cchip__line-fill"
            style={{ width: `${Math.round((ratio as number) * 100)}%`, background: contextLineColor(ratio as number) }}
          />
        )}
      </span>
      <style>{NOCKERL_SESSION_CHIP_STYLES}</style>
    </span>
  );
}

/**
 * INTERACTIVE session keycap: the floating, filled, pressable key (the
 * SessionChipsBar unit). A real <button> with on/off selection states, a leading
 * status dot, an engine glyph, the session name, an optional selection mark, and the
 * inner context line.
 */
export function NockerlSessionChip({
  active,
  dot,
  engineGlyph,
  name,
  mark,
  ratio,
  onSelect,
  className,
  style,
  ariaLabel,
}: NockerlSessionChipProps) {
  return (
    <button
      type="button"
      className={`nk-cchip ${active ? 'nk-cchip--on' : 'nk-cchip--off'}${className ? ` ${className}` : ''}`}
      style={style}
      aria-pressed={active}
      aria-label={ariaLabel ?? `${name} session${active ? ', selected' : ''}`}
      onClick={onSelect}
    >
      <ChipBody dot={dot} engineGlyph={engineGlyph} name={name} mark={active ? mark : undefined} ratio={ratio} />
    </button>
  );
}

/**
 * STATIC context chip: a read-only pill for an inline strip (Context gauge). No dot,
 * no selection, no press states; just engine glyph + name over the inner context line.
 */
export function NockerlContextChip({ engineGlyph, name, ratio, tooltip, ariaLabel }: NockerlContextChipProps) {
  return (
    <span className="nk-cchip nk-cchip--static" title={tooltip} aria-label={ariaLabel}>
      <ChipBody engineGlyph={engineGlyph} name={name} ratio={ratio} />
    </span>
  );
}

// The interactive chip renders a real <button>; declare it as the chip's OWN identity
// so the composition-graph gate reads the pressable session keycap (dot + engine glyph
// + name + selection check + a live usage LINE, all content the NockerlChip primitive
// cannot hold) as owned, not a raw-facsimile control.
export const compose = { tier: 'leaf', owns: ['button'] } satisfies ComposeContract;

export default NockerlSessionChip;
