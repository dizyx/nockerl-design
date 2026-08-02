/**
 * LinkDemo: the live, interactive Nockerl hyperlink/anchor island for the web.
 *
 * A link is DISTINCT from a button: it is a true navigational <a>, both INLINE
 * within prose and STANDALONE, and its emphasis is carried by TEXT treatment
 * (cyan accent color + underline + hover/visited/focus), not by a filled control.
 * (The button is a filled/outlined action; the link is text that goes somewhere.)
 *
 * Sourced from the apps: Android renders links through the markdown renderer's
 * `TextLinkStyles` + `LinkAnnotation`/`UriHandler` (chat/ui/MarkdownContent.kt),
 * and the brand link color is the single cyan accent. There is no bespoke link
 * color override there, so the canonical treatment is: accent text + underline.
 *
 * Implements the design laws verbatim:
 *   • cyan accent is the only brand color: links use --color-accent-primary; the
 *     underline IS the affordance (color-alone is never the only signal).
 *   • flash-free feedback: hover/active animate color BRIGHTNESS + the underline
 *     (decoration color/offset) only; there is no fill to swap.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow/glow.
 *   • NO glow / colored shadow / emission anywhere: a link never lifts.
 *   • inline links flow on the prose baseline; icon links keep the glyph optically
 *     centered on the text via an em-sized currentColor glyph.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a `var(--token)` (see
 * docs/demo-token-contract.md). On-accent surface text uses --color-on-accent.
 * Literals remain only for pure geometry (icon em-size, underline thickness/
 * offset, transition curves).
 */
import { useState } from 'react';
import { NockerlIcon, NockerlLink } from '@dizyx/nockerl-react';

// The .nk-lnk-demo root + the demo scaffolding only; the .nk-lnk component recipe
// now lives in the NockerlLink primitive (NOCKERL_LINK_STYLES) and is injected by each <NockerlLink>.
const STYLES = `
.nk-lnk-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }

/* ── Demo scaffolding (not part of the component) ───────────────────────── */
.nk-lnk-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-lnk-demo__lbl + * { margin-top: 0; }
.nk-lnk-demo__group + .nk-lnk-demo__group { margin-top: var(--space-6); }

/* the prose card: a lifted surface (card law) the inline links live inside */
.nk-lnk-demo__prose {
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  padding: var(--space-5) var(--space-6);
  max-width: 560px;
}
.nk-lnk-demo__p { margin: 0; color: var(--color-on-card);
  font-size: var(--font-size-16); line-height: var(--font-line-height-24); }
.nk-lnk-demo__p + .nk-lnk-demo__p { margin-top: var(--space-3); }

/* standalone / list rows */
.nk-lnk-demo__stack { display: flex; flex-direction: column; gap: var(--space-3); align-items: flex-start; max-width: 560px; }
.nk-lnk-demo__row { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-5); max-width: 560px; }
.nk-lnk-demo__standalone { font-size: var(--font-size-14); }

/* the cyan accent tile: a flat banner (links don't lift); on-accent text */
.nk-lnk-demo__tile {
  background: linear-gradient(180deg, var(--color-accent-primary-hi), var(--color-accent-primary));
  border-radius: var(--radius-card);
  padding: var(--space-4) var(--space-5);
  color: var(--color-on-accent);
  max-width: 560px;
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-lnk-demo__tile p { margin: 0; font-size: var(--font-size-14); line-height: var(--font-line-height-20);
  color: var(--color-on-accent); }

.nk-lnk-demo__count { font-size: var(--font-size-12); color: var(--color-on-card-muted); margin: var(--space-6) 0 0; }
.nk-lnk-demo__count b { color: var(--color-accent-primary); }
`;

// ─── Inline glyph (stroke icon, currentColor so each link tints it) ───
const IconDownload = (
  <NockerlIcon>
    <path d="M12 4v10" />
    <path d="m8 10 4 4 4-4" />
    <path d="M5 19h14" />
  </NockerlIcon>
);

/**
 * The interactive showcase mounted on the NockerlLink page: inline links flowing inside
 * a real paragraph of prose (proving baseline alignment), a mid-sentence inline
 * link, standalone links, a link with a trailing external ↗ glyph, a link with a
 * leading download icon, a muted/subtle link, a visited link, a disabled link,
 * and a link on a cyan accent tile using the on-accent contrast token. Every link
 * is a real <a>: tab to them, the focus-visible ring shows, Enter activates.
 */
export default function LinkDemo() {
  const [clicks, setClicks] = useState(0);
  const bump = () => setClicks((c) => c + 1);

  return (
    <div className="nk-lnk-demo">
      <style>{STYLES}</style>

      {/* INLINE in prose: the primary job of a link */}
      <div className="nk-lnk-demo__group">
        <p className="nk-lnk-demo__lbl">Inline in prose: tab through, click them</p>
        <div className="nk-lnk-demo__prose">
          <p className="nk-lnk-demo__p">
            Nockerl orchestrates Cloud Agent sessions and agents. Start in the{' '}
            <NockerlLink onClick={bump}>session console</NockerlLink>, review the{' '}
            <NockerlLink onClick={bump}>component catalog</NockerlLink>, then open the{' '}
            <NockerlLink external href="#" onClick={bump}>
              design tokens
            </NockerlLink>{' '}
            on GitHub. A link mid-sentence sits cleanly on the{' '}
            <NockerlLink onClick={bump}>same baseline</NockerlLink> as the words around it.
          </p>
          <p className="nk-lnk-demo__p">
            Already-read references quietly recede: the{' '}
            <NockerlLink visited onClick={bump}>
              deployment playbook
            </NockerlLink>{' '}
            (visited) stays legible without competing for attention.
          </p>
        </div>
      </div>

      {/* STANDALONE + icon links */}
      <div className="nk-lnk-demo__group">
        <p className="nk-lnk-demo__lbl">Standalone &amp; with icons</p>
        <div className="nk-lnk-demo__stack">
          <NockerlLink onClick={bump} href="#">
            <span className="nk-lnk-demo__standalone">View all sessions</span>
          </NockerlLink>
          <span className="nk-lnk-demo__standalone">
            <NockerlLink external onClick={bump}>
              Open the live docs site
            </NockerlLink>
          </span>
          <span className="nk-lnk-demo__standalone">
            <NockerlLink leadingIcon={IconDownload} onClick={bump}>
              Download the APK
            </NockerlLink>
          </span>
        </div>
      </div>

      {/* STATE MATRIX: muted / visited / disabled */}
      <div className="nk-lnk-demo__group">
        <p className="nk-lnk-demo__lbl">States: muted · visited · disabled</p>
        <div className="nk-lnk-demo__row nk-lnk-demo__standalone">
          <NockerlLink variant="muted" onClick={bump}>
            Subtle / muted link
          </NockerlLink>
          {/* visited forced via the prop so the state always renders, ignoring history */}
          <NockerlLink visited onClick={bump}>
            Visited link
          </NockerlLink>
          <NockerlLink disabled>Disabled link</NockerlLink>
        </div>
      </div>

      {/* ON-ACCENT surface */}
      <div className="nk-lnk-demo__group">
        <p className="nk-lnk-demo__lbl">On a cyan accent surface: on-accent token</p>
        <div className="nk-lnk-demo__tile">
          <p>
            Your trial ends in 3 days.{' '}
            <NockerlLink onAccent onClick={bump}>
              Upgrade your plan
            </NockerlLink>{' '}
            or{' '}
            <NockerlLink onAccent external onClick={bump}>
              read the pricing
            </NockerlLink>
            .
          </p>
        </div>
      </div>

      <p className="nk-lnk-demo__count">
        NockerlLink activated <b>{clicks}</b> {clicks === 1 ? 'time' : 'times'}. Real anchors, and the island is live.
      </p>
    </div>
  );
}
