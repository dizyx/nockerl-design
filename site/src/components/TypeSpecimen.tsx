/**
 * TypeSpecimen: the live, token-reactive specimen for the Typography foundations
 * page. It is the Nockerl type system showing itself: the brand lockup, the
 * size-driven heading scale, emphasis-by-contrast, prose, the (uppercase) button
 * treatment, and the weight ramp with its 500 cap.
 *
 * TOKEN-REACTIVE (docs/demo-token-contract.md): every size/weight/family/color is
 * a `var(--token)`. The scale rows render the COMPOSITE `--type-*` role tokens
 * verbatim, so a token remodel (or a theme flip) is reflected here with no edit.
 * The only non-tokenized property is per-role letter-spacing (tracking), applied
 * inline because tracking is not yet a token (tracked follow-up).
 */
import NockerlLockup from './NockerlLockup';

const STYLES = `
.nk-ts { font-family: var(--font-family-sans); color: var(--color-on-card);
  display: flex; flex-direction: column; gap: var(--space-8); }   /* var(--space-9) is UNDEFINED (the scale skips 7 and 9): it collapses the gap to 0 and leaves section eyebrows flush against the content above */
.nk-ts__group { display: flex; flex-direction: column; gap: var(--space-4); }
.nk-ts__eyebrow { font-family: var(--font-family-mono); font-size: var(--font-size-10);
  letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-accent-primary);
  margin: 0; }

/* ── Lockup ─────────────────────────────────────────────────────────────────── */
/* Lockups stack in a COLUMN (left-aligned) so the "Nockerl" edges line up and each
   product word is easy to compare; a horizontal row was hard to evaluate. */
.nk-ts__lockcol { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-5); }

/* ── Heading scale: renders the COMPOSITE type tokens verbatim ─────────────── */
.nk-ts__scale { display: flex; flex-direction: column; }
.nk-ts__line { display: flex; align-items: baseline; gap: var(--space-5); padding: var(--space-3) 0;
  border-bottom: var(--space-px) solid var(--color-card-hairline); flex-wrap: wrap; }
.nk-ts__tag { font-family: var(--font-family-mono); font-size: var(--font-size-10);
  color: var(--color-on-card-muted); flex: 0 0 11rem; width: 11rem; letter-spacing: 0; }
.nk-ts__d  { font: var(--type-display-large-font-weight) var(--type-display-large-font-size)/var(--type-display-large-line-height) var(--font-family-sans); letter-spacing: var(--font-tracking-tight); }
.nk-ts__h1 { font: var(--type-headline-large-font-weight) var(--type-headline-large-font-size)/var(--type-headline-large-line-height) var(--font-family-sans); letter-spacing: var(--font-tracking-snug); }
.nk-ts__h2 { font: var(--type-headline-medium-font-weight) var(--type-headline-medium-font-size)/var(--type-headline-medium-line-height) var(--font-family-sans); letter-spacing: var(--font-tracking-snug); }
.nk-ts__h3 { font: var(--type-headline-small-font-weight) var(--type-headline-small-font-size)/var(--type-headline-small-line-height) var(--font-family-sans); letter-spacing: var(--font-tracking-snug); }
.nk-ts__ti { font: var(--type-title-large-font-weight) var(--type-title-large-font-size)/var(--type-title-large-line-height) var(--font-family-sans); }
.nk-ts__bo { font: var(--type-body-large-font-weight) var(--type-body-large-font-size)/var(--type-body-large-line-height) var(--font-family-sans); }
.nk-ts__la { font: var(--type-label-large-font-weight) var(--type-label-large-font-size)/var(--type-label-large-line-height) var(--font-family-sans); color: var(--color-on-card-muted); }

/* ── Emphasis by contrast: two poles, never additive bold ──────────────────── */
.nk-ts__emph { display: flex; flex-direction: column; gap: var(--space-5); }
.nk-ts__lbl { font-family: var(--font-family-mono); font-size: var(--font-size-10);
  color: var(--color-on-card-muted); margin: 0 0 var(--space-1); }
.nk-ts__e-h1 { font: var(--font-weight-extralight) var(--type-headline-large-font-size)/1.08 var(--font-family-sans);
  letter-spacing: var(--font-tracking-snug); margin: 0; }
.nk-ts__e-h1 strong { font-weight: var(--font-weight-medium); }      /* light baseline → up to 500 */
.nk-ts__e-h3 { font: var(--font-weight-medium) var(--type-headline-small-font-size)/1.2 var(--font-family-sans);
  letter-spacing: var(--font-tracking-snug); margin: 0; }
.nk-ts__e-h3 strong { font-weight: var(--font-weight-thin); }        /* heavy baseline → down to thin 100 */
.nk-ts__e-bo { font: var(--type-body-large-font-weight) var(--type-body-large-font-size)/1.6 var(--font-family-sans); margin: 0; }
.nk-ts__e-bo strong { font-weight: var(--font-weight-medium); }      /* body → up to 500 (stays legible) */
.nk-ts__e-bo .thin { font-weight: var(--font-weight-thin); }

/* ── Prose ──────────────────────────────────────────────────────────────────── */
.nk-ts__prose { font: var(--type-body-large-font-weight) var(--type-body-large-font-size)/1.62 var(--font-family-sans); }
.nk-ts__prose h3 { font: var(--type-headline-small-font-weight) var(--type-headline-small-font-size)/1.25 var(--font-family-sans);
  letter-spacing: var(--font-tracking-snug); margin: var(--space-6) 0 var(--space-2); }
.nk-ts__prose h3 strong { font-weight: var(--font-weight-thin); }    /* heading emphasis inverts to thin */
.nk-ts__prose p { margin: 0 0 var(--space-3); }
.nk-ts__prose strong { font-weight: var(--font-weight-medium); }     /* body bold = 500 */
.nk-ts__prose em { font-style: italic; }                             /* faux-oblique (Outfit has no true italic) */
.nk-ts__prose a { color: var(--color-accent-primary); text-decoration: underline; text-underline-offset: 0.16em; }
.nk-ts__prose code { font-family: var(--font-family-mono); font-size: 0.86em;
  background: color-mix(in srgb, var(--color-on-card) 8%, transparent); border-radius: var(--radius-sm); padding: 0.1em 0.4em; }
.nk-ts__prose ul { margin: 0 0 var(--space-3); padding-left: 1.4em; }
.nk-ts__prose li { margin: var(--space-1) 0; }

/* ── Buttons: the only uppercase (light 300 / -0.03em) ─────────────────────── */
.nk-ts__btnrow { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }
.nk-ts__btn { font-family: var(--font-family-sans); font-weight: var(--font-weight-light);
  font-size: var(--font-size-14); text-transform: uppercase; letter-spacing: var(--font-tracking-tight); line-height: 1;
  border-radius: var(--radius-control); padding: var(--space-3) var(--space-4); border: var(--space-px) solid transparent; cursor: default; }
.nk-ts__btn--p { background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary)); color: var(--color-on-accent); }
.nk-ts__btn--s { background: var(--color-accent-primary-soft); color: var(--color-accent-primary);
  border-color: color-mix(in srgb, var(--color-accent-primary) 28%, transparent); }
.nk-ts__btn--g { background: transparent; color: var(--color-on-card); }

/* ── Weight ramp ────────────────────────────────────────────────────────────── */
.nk-ts__weights { display: flex; flex-direction: column; }
.nk-ts__wrow { display: flex; align-items: baseline; gap: var(--space-5); padding: var(--space-2) 0;
  border-bottom: var(--space-px) solid var(--color-card-hairline); }
.nk-ts__wtag { font-family: var(--font-family-mono); font-size: var(--font-size-10);
  color: var(--color-on-card-muted); flex: 0 0 11rem; width: 11rem; }
.nk-ts__wsample { font-size: var(--font-size-24); }
.nk-ts__note { font-family: var(--font-family-sans); font-weight: var(--font-weight-light);
  font-size: var(--font-size-12); color: var(--color-on-card-muted); margin: var(--space-2) 0 0; }
.nk-ts__note b { color: var(--color-on-card); font-weight: var(--font-weight-medium); }
`;

const PRODUCTS = ['Voice', 'Dashboard', 'Security'];

const WEIGHTS: Array<{ tag: string; var: string }> = [
  { tag: 'Thin · 100 (thin pole)', var: 'var(--font-weight-thin)' },
  { tag: 'Extralight · 200', var: 'var(--font-weight-extralight)' },
  { tag: 'Light · 300 (body)', var: 'var(--font-weight-light)' },
  { tag: 'Regular · 400', var: 'var(--font-weight-regular)' },
  { tag: 'Medium · 500 (bold cap)', var: 'var(--font-weight-medium)' },
];

/** The live type specimen mounted on /foundations/typography/. */
export default function TypeSpecimen() {
  return (
    <div className="nk-ts not-content">
      <style>{STYLES}</style>

      {/* Brand lockup */}
      <section className="nk-ts__group">
        <p className="nk-ts__eyebrow">Brand lockup: Nockerl 200 + product 400 cyan</p>
        <div className="nk-ts__lockcol">
          <NockerlLockup size={44} product="Voice" />
          <NockerlLockup size={28} />
        </div>
        <div className="nk-ts__lockcol">
          {PRODUCTS.map((p) => (
            <NockerlLockup key={p} size={22} product={p} />
          ))}
        </div>
      </section>

      {/* Heading scale */}
      <section className="nk-ts__group">
        <p className="nk-ts__eyebrow">Scale: hierarchy from size, weights stay thin</p>
        <div className="nk-ts__scale">
          <div className="nk-ts__line"><span className="nk-ts__tag">Display · 100</span><span className="nk-ts__d">Beyond the default</span></div>
          <div className="nk-ts__line"><span className="nk-ts__tag">H1 · headline-lg · 200</span><span className="nk-ts__h1">Design that breathes</span></div>
          <div className="nk-ts__line"><span className="nk-ts__tag">H2 · headline-md · 200</span><span className="nk-ts__h2">Your agents, at a glance</span></div>
          <div className="nk-ts__line"><span className="nk-ts__tag">H3 · headline-sm · 500</span><span className="nk-ts__h3">Recent activity</span></div>
          <div className="nk-ts__line"><span className="nk-ts__tag">Title · 500</span><span className="nk-ts__ti">Card &amp; dialog title</span></div>
          <div className="nk-ts__line"><span className="nk-ts__tag">Body · 300</span><span className="nk-ts__bo">The default reading size for paragraphs and chat.</span></div>
          <div className="nk-ts__line"><span className="nk-ts__tag">Label · 300</span><span className="nk-ts__la">Captions · metadata · secondary detail</span></div>
        </div>
      </section>

      {/* Emphasis by contrast */}
      <section className="nk-ts__group">
        <p className="nk-ts__eyebrow">Emphasis by contrast: two poles, never additive bold</p>
        <div className="nk-ts__emph">
          <div>
            <p className="nk-ts__lbl">Light baseline (H1 · 200) → emphasize UP to 500</p>
            <p className="nk-ts__e-h1">Design that <strong>breathes</strong>, end to end.</p>
          </div>
          <div>
            <p className="nk-ts__lbl">Heavy baseline (H3 · 500) → invert DOWN to thin 100</p>
            <p className="nk-ts__e-h3">Recent activity: <strong>live</strong> right now.</p>
          </div>
          <div>
            <p className="nk-ts__lbl">Body (300) → up to 500 (legible at small size)</p>
            <p className="nk-ts__e-bo">
              Pushed the QA fixes and the build is <strong>green</strong>; next I&apos;ll run the sweep.
              (Here&apos;s <span className="thin">thin-100 emphasis</span> for comparison: striking, but lighter to read at body size.)
            </p>
          </div>
        </div>
      </section>

      {/* Prose */}
      <section className="nk-ts__group">
        <p className="nk-ts__eyebrow">Prose: body 300, bold = 500, heading emphasis inverts to thin</p>
        <div className="nk-ts__prose">
          <p>
            Body copy in Outfit 300 at the body-large size, with <strong>bold (500)</strong>, <em>italic</em>,
            and <a href="#specimen">cyan links</a>. Inline code reads in <code>Space Mono</code>.
          </p>
          <h3>A subsection with an inverted <strong>emphasis</strong></h3>
          <p>The H3 above sits at 500; its emphasized word drops to thin 100, so it becomes the one that reads.</p>
          <ul>
            <li>A list item at body weight</li>
            <li>A second item with a <strong>bold (500)</strong> fragment</li>
          </ul>
        </div>
      </section>

      {/* Buttons */}
      <section className="nk-ts__group">
        <p className="nk-ts__eyebrow">Buttons: the only uppercase (light 300 / -0.03em)</p>
        <div className="nk-ts__btnrow">
          <span className="nk-ts__btn nk-ts__btn--p">Create session</span>
          <span className="nk-ts__btn nk-ts__btn--s">Files</span>
          <span className="nk-ts__btn nk-ts__btn--g">Cancel</span>
        </div>
      </section>

      {/* Weight ramp */}
      <section className="nk-ts__group">
        <p className="nk-ts__eyebrow">Weights: five steps, 500 is the cap</p>
        <div className="nk-ts__weights">
          {WEIGHTS.map((w) => (
            <div className="nk-ts__wrow" key={w.tag}>
              <span className="nk-ts__wtag">{w.tag}</span>
              <span className="nk-ts__wsample" style={{ fontWeight: w.var }}>Nockerl design</span>
            </div>
          ))}
        </div>
        <p className="nk-ts__note">
          <b>semibold</b> and <b>bold</b> are aliases that resolve to 500, so legacy references auto-cap. We never set
          type heavier than medium; emphasis comes from contrast, not added weight.
        </p>
      </section>
    </div>
  );
}
