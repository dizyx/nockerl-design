/**
 * BadgeDemo: the live, interactive Nockerl badge island for the web platform.
 *
 * A badge is a PASSIVE indicator (not a chip; chips are interactive filters): a
 * tiny count, an unseen dot, or a compact status label. It mirrors the canonical
 * Compose `BadgedBox` + `NockerlBadge` in `core/ui/GlobalTopBar.kt` (the inbox bell that
 * carries an unread count → "99+" overflow → a bare 8dp dot when there is only
 * unseen-but-uncounted activity), plus the small tonal status pills the app uses
 * inline (`SpawnPriorityBadge`, `RiskBadge`, `SourceBadge`: a `statusColor @ 15%`
 * fill + a matching mid-tone label). Voice ships only the outlined `ProviderBadge`
 * (a tiny capsule label) and has no count/dot badge; see the drift note.
 *
 * Implements the design laws verbatim:
 *   • a count/anchored badge is a PILL (a count keycap / dot is the one place the
 *     stadium is allowed alongside chips + the input bar); a standalone label
 *     badge is also a compact pill, never the control radius of a button.
 *   • SOLID badge = a flat status/accent fill + a contrast-picked label
 *     (var(--color-on-accent) on any cyan fill); SOFT badge = the same hue at low
 *     alpha + a mid-tone label (the app's inline-pill idiom). The fill is STATIC.
 *   • status hues are WARM (info/success/warning/danger) + a neutral grey; the
 *     brand cyan is its own "accent" tone, never a decorative glow.
 *   • depth is a NEUTRAL drop shadow + a top catch-light; the ring that separates
 *     an anchored badge from its host is a token-colored stroke, NOT a halo.
 *   • the badge is PASSIVE: it carries no focus/hover/press affordance; it is
 *     announced to assistive tech via the host's accessible name (aria-label),
 *     and the visual count is aria-hidden so it is not read twice.
 *   • motion animates interpolatable props only: an anchored badge POPS in on
 *     mount (scale + opacity), frozen under prefers-reduced-motion.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a `var(--token)` (see
 * docs/demo-token-contract.md). The dark stage resolves them to the dark palette;
 * change a token and this demo moves with everything else. Literals remain only
 * for pure geometry (dot/anchor circle dimensions, transition curves, overlap
 * offsets that have no spacing token).
 */
import { useState } from 'react';
import { NockerlBadge, NockerlButton, NockerlDivider, NockerlIcon, NockerlLanguageBadge, type NockerlBadgeTone } from '@dizyx/nockerl-react';

// Demo-only scaffolding CSS. The NockerlBadge recipe (.nk-badge*, .nk-badge-dot*,
// .nk-badge-anchor__badge*, the pop-in keyframes) now lives in the primitive
// (NOCKERL_BADGE_STYLES) and is injected by the component; what stays here is the showcase
// chrome + the host glyphs (icon button / avatar) + the anchor wrapper the demo's
// Anchored helper positions the badge against. Every visual value is a token;
// geometry literals carry a why-comment.
const STYLES = `
.nk-badge-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }

/* ── anchoring host wrapper: the positioned container the Anchored helper renders;
   the badge itself (.nk-badge-anchor__badge*) is styled by the primitive ── */
.nk-badge-anchor { position: relative; display: inline-flex; }

/* ── host glyphs (icon button + avatar): context for the anchored badges ── */
.nk-badge-host {
  display: inline-flex; align-items: center; justify-content: center;
  width: var(--space-10); height: var(--space-10);    /* 40: clears the 24px non-text target */
  border-radius: var(--radius-control);
  color: var(--color-on-card-muted);
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline);
}
.nk-badge-host svg { display: block; width: 22px; height: 22px; }
.nk-badge-avatar {
  width: var(--space-10); height: var(--space-10); border-radius: var(--radius-pill);
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-card-surface3); color: var(--color-on-card);
  font-size: var(--font-size-14); font-weight: var(--font-weight-semibold);
}

/* ── demo scaffolding ── */
.nk-badge-demo__row { display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: center; }
.nk-badge-demo__row--tight { gap: var(--space-3); }
.nk-badge-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-badge-demo__lbl + .nk-badge-demo__row { margin-bottom: var(--space-6); }
/* spacing wrapper around a NockerlDivider; the rule itself is drawn by the primitive */
.nk-badge-demo__sep { margin: var(--space-2) 0 var(--space-6); }
/* a labelled host cell so the count + dot anchors read clearly */
.nk-badge-demo__cell { display: inline-flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.nk-badge-demo__cap { font-size: var(--font-size-10); color: var(--color-on-canvas-muted); }
/* the live inbox control */
.nk-badge-demo__panel {
  display: inline-flex; align-items: center; gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-badge-demo__panel-on { --nk-anchor-ring: var(--color-card-surface1); }   /* ring matches the card it sits on */
.nk-badge-demo__live { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); }
.nk-badge-demo__live b { color: var(--color-accent-primary); }
`;

// Bell glyph (the canonical inbox host), currentColor so it tints from the host.
const IconBell = (
  <NockerlIcon>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </NockerlIcon>
);

/**
 * Anchor a badge to a host (icon / avatar): the host is the positioned container;
 * the `badge` (a `NockerlBadge` with `anchored`) pins to the top-right corner, overlapping
 * the host edge, separated by a token-colored ring. The HOST carries the accessible
 * name; the badge is decorative. `ring` matches the surface the host sits on so the
 * punch-out reads cleanly; remount via a `key` at the call site to replay the pop.
 */
function Anchored({
  children,
  badge,
  ring,
}: {
  children: React.ReactNode;
  badge: React.ReactNode;
  ring?: string;
}) {
  return (
    <span
      className="nk-badge-anchor"
      style={ring ? ({ ['--nk-anchor-ring' as string]: ring } as React.CSSProperties) : undefined}
    >
      {children}
      {badge}
    </span>
  );
}

const TONES: NockerlBadgeTone[] = ['accent', 'info', 'success', 'warning', 'danger', 'neutral'];
// Language tags feed the hue-free NockerlLanguageBadge, with mixed casing to prove the shared
// nockerlLanguageLabel normalization (all render lowercase, e.g. 'TypeScript' → 'typescript').
const LANGS = ['TypeScript', 'Kotlin', 'Swift', 'JSON', 'Shell'];
// An APP-side language→color mapping (the app owns this; the framework ships
// none). Sanctioned categorical hues + one status hue, permitted for this one case.
const APP_LANG_COLORS = [
  'var(--color-core-categorical-sky400)',
  'var(--color-core-categorical-purple400)',
  'var(--color-core-categorical-orange400)',
  'var(--color-status-warning)',
  'var(--color-core-categorical-emerald400)',
];

/**
 * The interactive showcase mounted on the NockerlBadge page: a live inbox bell whose
 * count you drive (proving the count + "99+" overflow + dot fallback), then the
 * full matrix: count badges, the dot, anchored-to-icon and anchored-to-avatar,
 * standalone count + dot, solid vs soft status labels across every tone, the
 * cyan accent badge, and both sizes. All passive; nothing here is focusable
 * except the demo's own +/- controls.
 */
export default function BadgeDemo() {
  const [count, setCount] = useState(3);
  const clamp = (n: number) => Math.max(0, Math.min(999, n));

  return (
    <div className="nk-badge-demo">
      <style>{STYLES}</style>

      {/* ── LIVE: the canonical inbox bell (BadgedBox) ───────────────────── */}
      <p className="nk-badge-demo__lbl">Live: drive the inbox count (0 → dot · 1-99 → number · 100+ → 99+)</p>
      <div className="nk-badge-demo__row">
        <div className="nk-badge-demo__panel nk-badge-demo__panel-on">
          <Anchored
            key={count > 0 ? `n${Math.min(count, 100)}` : 'dot'}
            ring="var(--color-card-surface1)"
            badge={
              count > 0 ? (
                <NockerlBadge count={count} tone="danger" size="md" anchored />
              ) : (
                <NockerlBadge dot tone="danger" size="md" anchored />
              )
            }
          >
            <span
              className="nk-badge-host"
              role="img"
              aria-label={count > 0 ? `Inbox, ${count > 99 ? '99+' : count} unread` : 'Inbox, unseen activity'}
            >
              {IconBell}
            </span>
          </Anchored>
          <NockerlButton text="−1" variant="secondary" size="sm" onClick={() => setCount((c) => clamp(c - 1))} />
          <NockerlButton text="+1" variant="secondary" size="sm" onClick={() => setCount((c) => clamp(c + 1))} />
          <NockerlButton text="+25" variant="secondary" size="sm" onClick={() => setCount((c) => clamp(c + 25))} />
          <NockerlButton text="Mark read" variant="secondary" size="sm" onClick={() => setCount(0)} />
        </div>
      </div>
      <p className="nk-badge-demo__live" style={{ marginTop: 'calc(var(--space-2) * -1)', marginBottom: 'var(--space-6)' }}>
        Bell shows{' '}
        <b>{count === 0 ? 'an unseen dot' : count > 99 ? '99+' : `${count} unread`}</b>. The badge pops in on change, frozen
        under reduced-motion.
      </p>

      <div className="nk-badge-demo__sep">
        <NockerlDivider />
      </div>

      {/* ── anchored: icon + avatar, count + dot ─────────────────────────── */}
      <p className="nk-badge-demo__lbl">Anchored: pinned to a host corner (count + dot), ringed to punch out</p>
      <div className="nk-badge-demo__row">
        <div className="nk-badge-demo__cell">
          <Anchored badge={<NockerlBadge count={4} tone="danger" anchored />}>
            <span className="nk-badge-host" role="img" aria-label="Inbox, 4 unread">
              {IconBell}
            </span>
          </Anchored>
          <span className="nk-badge-demo__cap">count</span>
        </div>
        <div className="nk-badge-demo__cell">
          <Anchored badge={<NockerlBadge count={128} tone="accent" anchored />}>
            <span className="nk-badge-host" role="img" aria-label="Inbox, 99+ unread">
              {IconBell}
            </span>
          </Anchored>
          <span className="nk-badge-demo__cap">overflow</span>
        </div>
        <div className="nk-badge-demo__cell">
          <Anchored badge={<NockerlBadge dot tone="success" anchored />}>
            <span className="nk-badge-avatar" role="img" aria-label="Ada Lovelace, online">
              PM
            </span>
          </Anchored>
          <span className="nk-badge-demo__cap">dot · avatar</span>
        </div>
        <div className="nk-badge-demo__cell">
          <Anchored badge={<NockerlBadge dot tone="warning" anchored />}>
            <span className="nk-badge-host" role="img" aria-label="Sessions, attention needed">
              {IconBell}
            </span>
          </Anchored>
          <span className="nk-badge-demo__cap">dot · icon</span>
        </div>
      </div>

      {/* ── standalone count + dot ───────────────────────────────────────── */}
      <p className="nk-badge-demo__lbl">Standalone: inline, named for assistive tech</p>
      <div className="nk-badge-demo__row nk-badge-demo__row--tight">
        <NockerlBadge count={1} tone="accent" ariaLabel="1 item" />
        <NockerlBadge count={12} tone="info" ariaLabel="12 items" />
        <NockerlBadge count={99} tone="danger" ariaLabel="99 items" />
        <NockerlBadge count={2400} tone="neutral" max={999} ariaLabel="999 plus items" />
        <NockerlBadge dot tone="success" ariaLabel="Online" />
        <NockerlBadge dot tone="warning" ariaLabel="Idle" />
      </div>

      {/* ── solid status labels: every tone ──────────────────────────────── */}
      <p className="nk-badge-demo__lbl">Solid label: filled hue + contrast label (accent · info · success · warning · danger · neutral)</p>
      <div className="nk-badge-demo__row nk-badge-demo__row--tight">
        {TONES.map((t) => (
          <NockerlBadge key={t} label={t} tone={t} variant="solid" ariaLabel={t} />
        ))}
      </div>

      {/* ── soft status labels: the inline-pill idiom ────────────────────── */}
      <p className="nk-badge-demo__lbl">Soft label: low-alpha tint + hue label (the inline pill idiom)</p>
      <div className="nk-badge-demo__row nk-badge-demo__row--tight">
        {TONES.map((t) => (
          <NockerlBadge key={t} label={t} tone={t} variant="soft" ariaLabel={t} />
        ))}
      </div>

      {/* ── sizes ────────────────────────────────────────────────────────── */}
      <p className="nk-badge-demo__lbl">Sizes: sm · md (count, dot, and label)</p>
      <div className="nk-badge-demo__row">
        <div className="nk-badge-demo__cell">
          <div className="nk-badge-demo__row nk-badge-demo__row--tight">
            <NockerlBadge count={8} tone="danger" size="sm" ariaLabel="8 items" />
            <NockerlBadge dot tone="success" size="sm" ariaLabel="Online" />
            <NockerlBadge label="beta" tone="accent" variant="soft" size="sm" ariaLabel="beta" />
          </div>
          <span className="nk-badge-demo__cap">sm</span>
        </div>
        <div className="nk-badge-demo__cell">
          <div className="nk-badge-demo__row nk-badge-demo__row--tight">
            <NockerlBadge count={8} tone="danger" size="md" ariaLabel="8 items" />
            <NockerlBadge dot tone="success" size="md" ariaLabel="Online" />
            <NockerlBadge label="beta" tone="accent" variant="soft" size="md" ariaLabel="beta" />
          </div>
          <span className="nk-badge-demo__cap">md</span>
        </div>
      </div>

      {/* ── language tags: the hue-free code tag (metadata, never status) ──── */}
      <p className="nk-badge-demo__lbl">Language: the hue-free code tag (a language is metadata, never a status color · always lowercase mono)</p>
      <div className="nk-badge-demo__row nk-badge-demo__row--tight">
        {LANGS.map((l) => (
          <NockerlLanguageBadge key={l} language={l} />
        ))}
      </div>

      {/* ── app-configured tag colors: the APP supplies its own
             language→color mapping via the color prop; the framework ships no map.
             Status hues are permitted for this one case (identity metadata, not state). */}
      <p className="nk-badge-demo__lbl">Language · app-configured color (optional): the app supplies its own mapping via the color prop</p>
      <div className="nk-badge-demo__row nk-badge-demo__row--tight">
        {LANGS.map((l, i) => (
          <NockerlLanguageBadge key={l} language={l} color={APP_LANG_COLORS[i % APP_LANG_COLORS.length]} />
        ))}
      </div>
    </div>
  );
}
