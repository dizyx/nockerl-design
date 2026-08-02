/**
 * StatusDotDemo: the live, interactive Nockerl status-dot island for the web.
 *
 * This is the DEDICATED semantic STATE dot, distinct from `badge` (a count /
 * notification overlay). It mirrors the canonical Compose `NockerlStatusDot` +
 * `PulsingDot` / `PulsingChipDot` (`chat/ui/SessionChipsBar.kt`,
 * `chat/ui/ChatIndicators.kt`) and the Voice `PulsingDot`
 * (`UI/RecordingHUD.swift`): a small filled circle whose color encodes one state,
 * 8px when "loud" (streaming / attention / unread) and 6px when idle, that pulses
 * by fading its OPACITY (1 → ~0.3) when live. The semantic color set + presence
 * states reuse the exact dot/status tokens the apps use (see
 * `core/theme/NockerlColors.kt` dot states + the `--color-status-*` ramp), so the
 * vocabulary stays consistent with avatar presence + the session chips.
 *
 * Implements the design laws verbatim:
 *   • a status dot is a SHAPE, never a glow: depth is read by the dot sitting in a
 *     surface-colored NOTCH (a ring punched the color of the host), not by emission.
 *     No colored shadow / halo anywhere; the "live" ring is the SAME token at low
 *     alpha, a real concentric circle, not a blurred bloom.
 *   • status hues are WARM (success / warning / error / info) + a neutral grey for
 *     offline/idle; the brand cyan is its own "live/info" signal, never decorative.
 *   • feedback animates interpolatable props only: the live dot fades OPACITY
 *     (the shipped pulse) and the optional ping ring SCALES + fades; the fill never
 *     swaps. Both freeze to a calm static ring under prefers-reduced-motion.
 *   • the dot is PRESENTATIONAL and never color alone: every example pairs the dot
 *     with text (a visible label, or a role="img" + aria-label / visually-hidden
 *     label) so the state is announced and not conveyed by hue only.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a `var(--token)` (see
 * docs/demo-token-contract.md). The dark stage resolves them to the dark palette;
 * change a token and this demo moves with everything else. Literals remain only
 * for pure geometry (the dot/notch/ping math, transition curves).
 */
import { useState } from 'react';
import { NockerlButton, NockerlStatusDot, type StatusKind } from '@dizyx/nockerl-react';

// Demo-only scaffolding CSS. The NockerlStatusDot recipe (.nk-sd*, .nk-sd-pair*, .nk-sd-sr)
// now lives in the primitive (NOCKERL_STATUS_DOT_STYLES) and is injected by the component;
// what stays here is the showcase chrome + the host glyphs (tile / chip / anchor).
const STYLES = `
.nk-sd-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); --nk-sd-surface: var(--color-canvas); }
.nk-sd-demo .nk-sd-card { --nk-sd-surface: var(--color-card-surface1); }

/* ── anchoring: a dot pinned to the corner of a host (avatar / tile) ── */
.nk-sd-anchor { position: relative; display: inline-flex; }
.nk-sd-anchor__dot { position: absolute; right: 0; bottom: 0; }
.nk-sd-anchor__dot--tr { top: 0; bottom: auto; }   /* top-right variant */

/* ── host glyphs (an avatar-ish tile + a session-chip) for the anchored examples ── */
.nk-sd-tile {
  width: var(--space-12); height: var(--space-12); border-radius: var(--radius-pill);
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-card-surface3); color: var(--color-on-card);
  font-size: var(--font-size-14); font-weight: var(--font-weight-semibold);
  box-shadow: inset 0 0 0 var(--space-px) color-mix(in srgb, var(--color-on-card) 12%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
/* a session chip, the SessionChipsBar idiom: a pill carrying a leading status dot */
.nk-sd-chip {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill);
  background: var(--color-card-surface2);
  color: var(--color-on-card); font-size: var(--font-size-12);
  font-weight: var(--font-weight-medium); white-space: nowrap;
  border: var(--space-px) solid var(--color-card-hairline);
}
/* ACTIVE = the ONE brand cyan wash (the selection signal). Text flips to on-cyan ink.
   Inactive chips are NEUTRAL (above), so the strip carries a single cyan, not three. */
/* The active chip's cyan edge marks WHICH session is chosen, so it carries the
   selection weight (matching NockerlSessionChip, which this demo mirrors). */
.nk-sd-chip--active { background: var(--color-session-chip-active); color: var(--color-on-session-chip);
  border-width: var(--border-width-selection);
  border-color: color-mix(in srgb, var(--color-accent-primary) 45%, transparent); }
/* the leading dot notches into the chip; INACTIVE notch = the neutral surface. */
.nk-sd-chip__lead { --nk-sd-surface: var(--color-card-surface2); }
/* ACTIVE: a CONTRAST-ink notch (a ring) so the cyan live dot stays visible ON the cyan
   wash: the dot-on-same-color problem, solved with the contrast-ring precedent. */
.nk-sd-chip--active .nk-sd-chip__lead { --nk-sd-surface: var(--color-on-session-chip); }

/* ── demo scaffolding ── */
.nk-sd-demo__sec + .nk-sd-demo__sec { margin-top: var(--space-6); }
.nk-sd-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-sd-demo__row { display: flex; gap: var(--space-5); flex-wrap: wrap; align-items: center; }
.nk-sd-demo__row--tight { gap: var(--space-4); }
.nk-sd-demo__col { display: flex; flex-direction: column; gap: var(--space-3); }
/* a card surface so the notch-on-card path is demonstrated (dot sits IN the card) */
.nk-sd-demo__card {
  background: var(--color-card-surface1); border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card); padding: var(--space-4) var(--space-5);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-sd-demo__cell { display: inline-flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.nk-sd-demo__cap { font-size: var(--font-size-10); color: var(--color-on-canvas-muted); }
.nk-sd-demo__live { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-sd-demo__live b { color: var(--color-accent-primary); }
`;

const KINDS: StatusKind[] = ['success', 'warning', 'error', 'info', 'neutral'];
// The presence vocabulary (shared with avatar): a human label per state.
const PRESENCE: { status: StatusKind; label: string; pulse?: boolean }[] = [
  { status: 'success', label: 'Online' },
  { status: 'warning', label: 'Idle' },
  { status: 'error', label: 'Busy' },
  { status: 'info', label: 'Live', pulse: true },
  { status: 'neutral', label: 'Offline' },
];

/**
 * The interactive showcase mounted on the Status dot page: the full semantic set as
 * bare dots; dot + label presence rows; a LIVE pulsing dot + an expanding ping ring
 * (frozen to a calm static ring under reduced-motion; toggle it); the size ramp;
 * a dot anchored to an avatar tile + leading a session chip; and the outline /
 * ring-only variant, all token-driven on the dark stage, every state paired with
 * text so it is never conveyed by color alone.
 */
export default function StatusDotDemo() {
  const [live, setLive] = useState(true);

  return (
    <div className="nk-sd-demo">
      <style>{STYLES}</style>

      {/* ── the full semantic set as bare dots (named for assistive tech) ── */}
      <section className="nk-sd-demo__sec">
        <p className="nk-sd-demo__lbl">Semantic set: success · warning · error · info · neutral</p>
        <div className="nk-sd-demo__row nk-sd-demo__row--tight">
          {KINDS.map((k) => (
            <div className="nk-sd-demo__cell" key={k}>
              <NockerlStatusDot status={k} size="md" ariaLabel={k} />
              <span className="nk-sd-demo__cap">{k}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── dot + label presence rows ── */}
      <section className="nk-sd-demo__sec">
        <p className="nk-sd-demo__lbl">Presence: dot + label (the label is the accessible text)</p>
        <div className="nk-sd-demo__card">
          <div className="nk-sd-demo__col">
            {PRESENCE.map((p) => (
              <NockerlStatusDot
                key={p.label}
                status={p.status}
                size="sm"
                label={p.label}
                pulse={p.pulse}
                surface="var(--color-card-surface1)"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE: pulse + ping, with a reduced-motion-respecting toggle ── */}
      <section className="nk-sd-demo__sec">
        <p className="nk-sd-demo__lbl">Live: opacity pulse + expanding ping (calm static ring under reduced-motion)</p>
        <div className="nk-sd-demo__row">
          <div className="nk-sd-demo__cell">
            <NockerlStatusDot status="info" size="md" pulse={live} ariaLabel="Streaming" />
            <span className="nk-sd-demo__cap">pulse · streaming</span>
          </div>
          <div className="nk-sd-demo__cell">
            <NockerlStatusDot status="error" size="md" pulse={live} ping={live} ariaLabel="Recording" />
            <span className="nk-sd-demo__cap">pulse + ping · recording</span>
          </div>
          <div className="nk-sd-demo__cell">
            <NockerlStatusDot status="success" size="md" ping={live} ariaLabel="Connected" />
            <span className="nk-sd-demo__cap">ping · connected</span>
          </div>
          <NockerlStatusDot status="info" size="sm" label="Streaming…" pulse={live} ariaLabel="Streaming" />
          <NockerlButton
            text={live ? 'Pause live' : 'Resume live'}
            variant="secondary"
            size="sm"
            onClick={() => setLive((v) => !v)}
          />
        </div>
      </section>

      {/* ── sizes ── */}
      <section className="nk-sd-demo__sec">
        <p className="nk-sd-demo__lbl">Sizes: xs 6 · sm 8 · md 10 (dot scales with its label)</p>
        <div className="nk-sd-demo__row">
          <NockerlStatusDot status="success" size="xs" label="Extra small" ariaLabel="Online, extra small" />
          <NockerlStatusDot status="success" size="sm" label="Small" ariaLabel="Online, small" />
          <NockerlStatusDot status="success" size="md" label="Medium" ariaLabel="Online, medium" />
        </div>
      </section>

      {/* ── anchored: a dot pinned to a host corner (avatar tile + chip) ── */}
      <section className="nk-sd-demo__sec">
        <p className="nk-sd-demo__lbl">Anchored: pinned to a host corner (avatar) and leading a session chip</p>
        <div className="nk-sd-demo__row">
          <div className="nk-sd-demo__cell">
            <span className="nk-sd-anchor" role="img" aria-label="Ada Lovelace, online">
              <span className="nk-sd-tile" aria-hidden="true">PM</span>
              <span className="nk-sd-anchor__dot">
                <NockerlStatusDot status="success" size="md" surface="var(--color-canvas)" />
              </span>
            </span>
            <span className="nk-sd-demo__cap">avatar · online</span>
          </div>
          <div className="nk-sd-demo__cell">
            <span className="nk-sd-anchor" role="img" aria-label="Alex, live">
              <span className="nk-sd-tile" aria-hidden="true">AR</span>
              <span className="nk-sd-anchor__dot">
                <NockerlStatusDot status="info" size="md" pulse={live} surface="var(--color-canvas)" />
              </span>
            </span>
            <span className="nk-sd-demo__cap">avatar · live</span>
          </div>
          <div className="nk-sd-demo__col">
            {/* ACTIVE session: the cyan wash IS the "selected" signal, so its dot carries a
                SEMANTIC STATE (connected), NOT another cyan. A contrast-ink notch keeps it crisp
                on the wash. This kills the cyan-dot-on-cyan-chip / three-cyans confusion. */}
            <span className="nk-sd-chip nk-sd-chip--active">
              <span className="nk-sd-chip__lead">
                <NockerlStatusDot status="success" size="sm" pulse={live} ariaLabel="connected" />
              </span>
              nockerl-design · docs
            </span>
            <span className="nk-sd-chip">
              <span className="nk-sd-chip__lead">
                <NockerlStatusDot status="warning" size="sm" ariaLabel="needs attention" />
              </span>
              credential-store · allowlist
            </span>
            <span className="nk-sd-chip">
              <span className="nk-sd-chip__lead">
                <NockerlStatusDot status="neutral" size="xs" ariaLabel="idle" />
              </span>
              dueydo · deploy
            </span>
          </div>
        </div>
      </section>

      {/* ── outline / ring-only variant ── */}
      <section className="nk-sd-demo__sec">
        <p className="nk-sd-demo__lbl">Outline: a hollow ring (a quieter, lower-emphasis state)</p>
        <div className="nk-sd-demo__row nk-sd-demo__row--tight">
          {KINDS.map((k) => (
            <div className="nk-sd-demo__cell" key={`o-${k}`}>
              <NockerlStatusDot status={k} size="md" outline ariaLabel={`${k} outline`} />
              <span className="nk-sd-demo__cap">{k}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="nk-sd-demo__live">
        Live animation is <b>{live ? 'running' : 'paused'}</b>. The pulse fades opacity and the
        ping ring expands; both freeze to a calm static ring under reduced-motion.
      </p>
    </div>
  );
}
