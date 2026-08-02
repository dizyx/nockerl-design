/**
 * FacetedBackgroundDemo: the showcase island for the canonical NockerlFacetedBackground primitive.
 *
 * The faceted / low-poly geometric field is the Nockerl SIGNATURE look, and it is ONE shared
 * component: this page COMPOSES the real `NockerlFacetedBackground` primitive (the same field the
 * app-shell scaffold, the sidebar stage, and the empty-state ground all use). It does NOT
 * re-implement the mesh. The signature lives in exactly one place
 * (packages/react/src/primitives/FacetedBackground.tsx); a look change is a one-file edit that
 * propagates everywhere, and the hand-roll-detection harness keeps it that way. This island
 * only supplies the sample chat content laid over the field (a chip + title + message card, proving
 * legibility) + the demo chrome.
 *
 * The primitive owns the motion (a canvas per-facet tone-wave, the mesh built ONCE per size and
 * re-tinted per frame, smooth, never a step or a stripe) and the prefers-reduced-motion freeze; we
 * just observe reduced-motion live and pass it in. TOKEN-ONLY color: the primitive's canvas reads the
 * live --color-chat-bg (facet base) + --color-canvas-edge (hairline), so it themes.
 */
import { useEffect, useState } from 'react';
import { NockerlFacetedBackground } from '@dizyx/nockerl-react';

// Demo chrome only: the sample content laid ON the field (chip, title, message card) + the note.
// The signature surface itself (mesh, canvas, card chrome, reduced-motion freeze) is the shipped
// NockerlFacetedBackground primitive. Every value is a token; literals are pure geometry.
const STYLES = `
.nk-fb-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
.nk-fb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-fb-eyebrow { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  font-weight: var(--font-weight-semibold); color: var(--color-on-canvas-muted); margin: 0; }
.nk-fb-title { font-family: var(--font-family-sans); font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-20); line-height: var(--font-line-height-24); color: var(--color-on-canvas); margin: 0;
  text-shadow: 0 var(--space-px) var(--space-2) var(--color-scrim); }
/* a status pill floating on the field: accent fill + on-accent label */
.nk-fb-chip { align-self: flex-start; display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill);
  background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary));
  color: var(--color-on-accent); font-size: var(--font-size-12); font-weight: var(--font-weight-semibold);
  box-shadow: 0 var(--elevation-level2) 14px -6px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-fb-chip__dot { width: 8px; height: 8px; border-radius: var(--radius-pill); background: var(--color-on-accent); }
/* a recessed message card sitting on the field; depth lives in the card */
.nk-fb-msg { align-self: stretch; max-width: 26rem; padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-card); background: color-mix(in srgb, var(--color-card-surface1) 88%, transparent);
  border: var(--space-px) solid var(--color-card-hairline);
  -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px);
  color: var(--color-on-card); font-size: var(--font-size-14); line-height: var(--font-line-height-20);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* the codified-standard note under the surface */
.nk-fb-note { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin: var(--space-4) 0 0;
  display: flex; align-items: center; gap: var(--space-2); }
.nk-fb-note b { color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); }
.nk-fb-rm { color: var(--color-status-warning); }
`;

/**
 * The showcase mounted on the Faceted background page: the SINGLE canonical signature surface, the
 * real NockerlFacetedBackground primitive with a sample chat surface laid over it (eyebrow + title +
 * a status chip + a recessed message card, proving legibility). There are NO controls, because the
 * faceted look is one codified standard. prefers-reduced-motion is observed live and passed to the primitive,
 * which freezes the field to a static composed frame.
 */
export default function FacetedBackgroundDemo() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = (): void => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <div className="nk-fb-demo">
      <style>{STYLES}</style>

      <p className="nk-fb-demo__lbl">Signature surface: the one canonical faceted field (no controls)</p>
      <NockerlFacetedBackground reduced={reduced}>
        <span className="nk-fb-chip"><span className="nk-fb-chip__dot" aria-hidden="true" />Streaming</span>
        <p className="nk-fb-eyebrow">Nockerl · session</p>
        <h3 className="nk-fb-title">Faceted background</h3>
        <div className="nk-fb-msg">Content stays fully legible on the field. The facets are a low-contrast tonal grain, never a glow.</div>
      </NockerlFacetedBackground>

      <p className="nk-fb-note">
        {reduced ? (
          <><span className="nk-fb-rm">prefers-reduced-motion</span>: frozen to a static composed frame.</>
        ) : (
          <>One codified look, composed from the shipped <b>NockerlFacetedBackground</b> primitive (the same field as the app-shell, the sidebar, and empty-state): a canvas per-facet tone-wave, the mesh built once per size and re-tinted every frame. Color is token-only, so it themes; changing the signature is a <b>one-place design-system change</b> that propagates to every app.</>
        )}
      </p>
    </div>
  );
}
