/**
 * TooltipDemo: the live, interactive Nockerl TOOLTIP island for web.
 *
 * A tooltip is a BRIEF, NON-INTERACTIVE text hint that appears on HOVER or
 * keyboard FOCUS of a control, after a short OPEN DELAY, and auto-dismisses on
 * leave / blur / Esc. You cannot click into it. DISTINCT from its neighbours: it
 * is NOT a rich anchored panel you tab into (`popover`), NOT a list of action
 * items (`menu`), and NOT a press-and-hold contextual pop (`long-press-pop`). A
 * tooltip names or clarifies a control: a few words, no controls, no focus of
 * its own.
 *
 * Sourced from the REAL apps (read-only). Voice (canonical, macOS): the native
 * `.help(String)` modifier IS the macOS tooltip, applied to icon-only buttons
 * (`UI/NockerlButtonStyles.swift` `NockerlIconButton.help`) and onboarding
 * controls (`OnboardingView` `.help(…)`); it carries a fixed ~2s system delay and
 * inherits the dark, high-contrast system tooltip surface (no styling hooks).
 * Android: Material 3 `TooltipBox` + `PlainTooltip` is the intended path (not yet
 * adopted in-app; icon-only actions name themselves via `contentDescription`
 * today). PlainTooltip is high-contrast by default (`inverseSurface` /
 * `inverseOnSurface`, which the Nockerl theme maps to `onCanvas` / `canvas`), so
 * this web tooltip mirrors that: an INVERTED surface (the page's text color
 * becomes the surface; the page's background becomes the text), the one place a
 * Nockerl surface flips for maximum legibility of a transient hint.
 *
 * Laws: DEPTH = neutral tinted drop shadow + a top catch-light, NEVER a glow. The
 * ARROW/beak is the SAME inverted surface so it reads as a continuous tail off the
 * bubble. flash-free: the fill is static; only scale + opacity animate the appear,
 * and the appear FREEZES under prefers-reduced-motion (it shows in place). The
 * trigger is a real focusable control; the tip is wired via `aria-describedby`;
 * the tip itself is `role="tooltip"`, NOT focusable, with no interactive content.
 * TOKEN-REACTIVE: every color / font / radius / spacing / type is a `var(--token)`
 * (see docs/demo-token-contract.md); literals remain only for pure geometry (icon
 * px, the beak's diagonal size, transition curves).
 *
 * The tooltip ENGINE now lives in the primitive (`NOCKERL_TOOLTIP_STYLES` + the
 * `NockerlTooltip` render-prop): the inverted bubble + beak CSS (`.nk-tt-tip` /
 * `.nk-tt-arrow`), the open delay, the appear, the anchor → flip → clamp → beak
 * positioning, and the Esc/leave/blur dismiss. What stays here is the showcase chrome
 * (.nk-tt-demo*, the placement/delay toolbar) plus the contained STAGE and its
 * TRIGGERS: the icon-only buttons, a labelled control, an inline definition word, and
 * a wrapped DISABLED control, each wired via the `triggerProps` the engine hands back.
 */
import { useState } from 'react';
import { NockerlButton, NockerlDefinitionTrigger, NockerlIcon, NockerlIconButton, NockerlKbd, NockerlSegmentedControl, NockerlTooltip, type Side } from '@dizyx/nockerl-react';

const STYLES = `
.nk-tt-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }
.nk-tt-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-tt-demo__lbl + .nk-tt-demo__lbl, .nk-tt-demo__group + .nk-tt-demo__group { margin-top: var(--space-5); }
.nk-tt-demo__hint { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin: var(--space-1) 0 var(--space-3); max-width: 56ch; }
/* key hints in the caption are now the shared NockerlKbd primitive (self-styled raised keycap). */
.nk-tt-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-tt-demo__count b { color: var(--color-accent-primary); }

/* a small toolbar of switches: force a placement + an open delay */
.nk-tt-toolbar { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: center; margin-bottom: var(--space-3); }

/* The contained STAGE: every tip floats INSIDE here, clamped to it (never the page).
   Shared panel chrome lives in 'nk-demo-overlay-stage' (theme.css); only this demo's
   footprint (max-width / min-height) stays here. */
.nk-tt-stage { max-width: 560px; min-height: 280px; }
/* triggers pinned to varied positions so flip + clamp + every beak edge are visible */
.nk-tt-anchors { position: relative; z-index: 1; min-height: 280px; }
.nk-tt-spot { position: absolute; display: inline-flex; flex-direction: column; }
.nk-tt-spot--tl { top: var(--space-4); left: var(--space-4); }
.nk-tt-spot--tr { top: var(--space-4); right: var(--space-4); }
.nk-tt-spot--bl { bottom: var(--space-4); left: var(--space-4); }
.nk-tt-spot--br { bottom: var(--space-4); right: var(--space-4); }
.nk-tt-spot--mid { top: 50%; left: 50%; transform: translate(-50%, -50%); }
.nk-tt-spot__cap { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase; color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.nk-tt-spot--tr .nk-tt-spot__cap, .nk-tt-spot--br .nk-tt-spot__cap { text-align: right; }
.nk-tt-spot--mid .nk-tt-spot__cap { text-align: center; }

/* the TRIGGERS: icon-only buttons (the canonical use, now real IconButtons) + a labelled
   control (a real NockerlButton) + an inline text target. The icon/labelled trigger chrome,
   hover/active/focus states + reduced-motion now live in the NockerlIconButton/NockerlButton primitives. */
.nk-tt-iconrow { display: inline-flex; gap: var(--space-2); }
/* the inline definition marker now composes the NockerlDefinitionTrigger primitive (it owns
   the dotted-underline, cursor:help, focus ring, and trigger-prop forwarding). */
/* a wrapper around a DISABLED control: the wrapper carries the tip (a disabled
   element fires no hover/focus events, so the hint lives on an enabled wrapper). */
.nk-tt-wrap { display: inline-flex; border-radius: var(--radius-control); }
.nk-tt-wrap:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
`;

// ─── Stroke glyphs via the shared NockerlIcon primitive (currentColor tints from each trigger's token) ──
const IconCopy = <NockerlIcon><path d="M9 9h11v11H9z" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></NockerlIcon>;
const IconStar = <NockerlIcon path="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z" />;
const IconShare = <NockerlIcon><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" /></NockerlIcon>;
const IconArchive = <NockerlIcon><path d="M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M3 8l1.5-4h15L21 8" /><path d="M10 12h4" /></NockerlIcon>;
const IconInfo = <NockerlIcon><path d="M12 16v-4" /><path d="M12 8h.01" /><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /></NockerlIcon>;
// FILLED glyph: kept inline (the NockerlIcon primitive is stroke-only; fill+no-stroke can't be expressed via props).
const IconBolt = (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </svg>
);
const IconTrash = <NockerlIcon><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" /></NockerlIcon>;

/**
 * The interactive showcase mounted on the NockerlTooltip page: a contained stage with
 * icon-only buttons (the canonical use, where each tip NAMES the action), a labelled
 * control, an inline definition word, and a wrapped DISABLED control whose tip
 * still shows (the wrapper carries it). HOVER or keyboard-FOCUS a target →
 * after the open delay a brief, non-interactive bubble with a beak appears,
 * auto-positioned to flip + clamp inside the stage; it dismisses on leave / blur
 * / Esc. A toolbar forces a placement and toggles the open delay (instant vs.
 * ~600ms). Tab through the row to prove tips show on keyboard focus. The tip is
 * wired via aria-describedby, is not focusable, and holds text only. Token-driven;
 * the appear freezes under reduced-motion.
 */
export default function TooltipDemo() {
  const [place, setPlace] = useState<'auto' | Side>('auto');
  const [delayed, setDelayed] = useState(true);

  const delayMs = delayed ? 600 : 0;

  return (
    <div className="nk-tt-demo">
      <style>{STYLES}</style>
      <p className="nk-tt-demo__lbl">Hover or Tab to a target: a brief hint floats in after a short delay</p>
      <p className="nk-tt-demo__hint">
        The tip shows on <b>hover</b> or keyboard <b>focus</b> (<NockerlKbd>Tab</NockerlKbd> through the row), points at the control with a beak, and
        dismisses on leave, blur, or <NockerlKbd>Esc</NockerlKbd>. It is non-interactive: you cannot click into it.
      </p>

      <div className="nk-tt-toolbar">
        <NockerlSegmentedControl
          label="Placement"
          size="sm"
          value={place}
          onChange={(next) => setPlace(next as 'auto' | Side)}
          segments={[
            { value: 'auto', label: 'Auto' },
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ]}
        />
        <NockerlSegmentedControl
          label="Open delay"
          size="sm"
          value={delayed ? 'on' : 'off'}
          onChange={(next) => setDelayed(next === 'on')}
          segments={[
            { value: 'on', label: '~600ms' },
            { value: 'off', label: 'Instant' },
          ]}
        />
      </div>

      <NockerlTooltip place={place} delayMs={delayMs}>
        {({ stageRef, triggerProps, tip, shows }) => (
          <>
            <div className="nk-tt-stage nk-demo-overlay-stage" ref={stageRef}>
              <div className="nk-tt-anchors">
                {/* top-left: icon-only actions, the canonical use; each tip NAMES the action (prefers BOTTOM) */}
                <div className="nk-tt-spot nk-tt-spot--tl">
                  <span className="nk-tt-spot__cap">NockerlIcon-only buttons</span>
                  <span className="nk-tt-iconrow">
                    <NockerlIconButton icon={IconCopy} label="Copy link" {...triggerProps({ key: 'copy', text: 'Copy link', side: 'bottom', multiline: false, width: 220 })} />
                    <NockerlIconButton icon={IconStar} label="Add to favorites" {...triggerProps({ key: 'star', text: 'Add to favorites', side: 'bottom', multiline: false, width: 220 })} />
                    <NockerlIconButton icon={IconShare} label="Share session" {...triggerProps({ key: 'share', text: 'Share session', side: 'bottom', multiline: false, width: 220 })} />
                    <NockerlIconButton icon={IconArchive} label="Archive" {...triggerProps({ key: 'archive', text: 'Archive', side: 'bottom', multiline: false, width: 220 })} />
                  </span>
                </div>

                {/* top-right: an info icon → a multiline / longer tip (prefers LEFT near the edge; flips/clamps) */}
                <div className="nk-tt-spot nk-tt-spot--tr">
                  <span className="nk-tt-spot__cap">Longer tip</span>
                  <NockerlIconButton icon={IconInfo} label="About context usage" {...triggerProps({ key: 'info', text: 'Context window usage across this session, including system prompt and tool results.', side: 'left', multiline: true, width: 240 })} />
                </div>

                {/* center: an inline definition word - composes the NockerlDefinitionTrigger primitive
                    (it owns the inline dotted-underline + cursor:help + focus ring and forwards the
                    tooltip triggerProps). Distinct from NockerlButton (uppercase block) and NockerlLink (cyan anchor). */}
                <div className="nk-tt-spot nk-tt-spot--mid">
                  <span className="nk-tt-spot__cap">Inline definition</span>
                  <NockerlDefinitionTrigger {...triggerProps({ key: 'word', text: 'Tokens are the units a model reads and writes, roughly ¾ of a word each.', side: 'top', multiline: true, width: 240 })}>tokens</NockerlDefinitionTrigger>
                </div>

                {/* bottom-left: an immediate (no-delay) labelled control (prefers TOP, beak points down) */}
                <div className="nk-tt-spot nk-tt-spot--bl">
                  <span className="nk-tt-spot__cap">Immediate</span>
                  <NockerlButton text="Run" variant="secondary" leadingIcon={IconBolt} {...triggerProps({ key: 'run', text: 'Runs now, no confirmation', side: 'top', multiline: false, width: 220 })} />
                </div>

                {/* bottom-right: a DISABLED control, wrapped so the wrapper carries the tip (prefers TOP) */}
                <div className="nk-tt-spot nk-tt-spot--br">
                  <span className="nk-tt-spot__cap">Disabled (wrapped)</span>
                  <span
                    className="nk-tt-wrap" tabIndex={0} role="button" aria-disabled="true" aria-label="Delete"
                    {...triggerProps({ key: 'del', text: 'Finish the running task before deleting', side: 'top', multiline: true, width: 220 })}
                  >
                    <NockerlButton text="Delete" variant="secondary" disabled leadingIcon={IconTrash} />
                  </span>
                </div>
              </div>

              {tip}
            </div>

            <p className="nk-tt-demo__count">
              Tip shown <b>{shows}</b> {shows === 1 ? 'time' : 'times'} · placement {place} · {delayed ? '~600ms delay' : 'instant'} · hover + keyboard both work; the island is live.
            </p>
          </>
        )}
      </NockerlTooltip>
    </div>
  );
}
