/**
 * PanelDemo: the live, interactive Nockerl panel island for the web platform.
 *
 * A PANEL is a larger, persistent, in-layout content REGION (not an overlay):
 * a framed surface defined by a HEADER BAR (icon tile + title + subtitle +
 * header actions/toolbar) → a BODY → an optional FOOTER. It is the structural
 * unit behind inspector panels, settings panels, dashboard widget containers,
 * and split-pane regions. Distinct from a card (a smaller content tile) and a
 * drawer (an edge-anchored overlay).
 *
 * Sourced from the shipped apps:
 *   • Android `ToolCallCard` / `AgentTranscriptPanel` (core/theme NockerlPanelShape
 *     = 12dp): a header row (icon tile + title + status chip + chevron) over a
 *     collapsible body in a nested surface, collapsed via `AnimatedVisibility`.
 *   • Voice `SettingsCard` (header label row + body, chromeSurface + hairline +
 *     nockerlElevation) and the hand-built `DashboardView` split (a fixed-width
 *     sidebar + content `HStack`, deliberately NOT NavigationSplitView).
 *
 * Implements the design laws verbatim:
 *   • the panel LIFTS: `--color-card-surface1` a clear step above the canvas, a
 *     NEUTRAL drop shadow below, a ~1px top catch-light sheen. No glow / colored
 *     shadow / emission anywhere; depth is shadow + sheen.
 *   • 12px PANEL radius (`--radius-panel`), a step tighter than a 16px card.
 *   • header / body / footer are divided by HAIRLINES, never shadows.
 *   • flash-free feedback: fills are STATIC; collapse animates grid height, the
 *     resize splitter animates position, never a fill swap.
 *   • accent (cyan) is reserved for the header icon tile + active affordances; a
 *     filled accent control carries `--color-on-accent`. Status colors stay warm.
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / elevation is a
 * `var(--token)` (see docs/demo-token-contract.md). The dark stage resolves them
 * to the dark palette; change one token and this demo moves with everything else.
 * Literals remain only for pure geometry (icon dimensions, transition curves).
 *
 * Styles are scoped via an `nk-pnl` class injected once, so the island is
 * self-contained and does not depend on the docs theme CSS (mirrors ButtonDemo).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { NockerlButton, NockerlIcon, NockerlIconButton, NockerlSurface, type ComposeContract } from '@dizyx/nockerl-react';
import CopyButton from './_CopyButton';

const STYLES = `
.nk-pnl-demo { font-family: var(--font-family-sans); }

/* ── The PANEL: a lifted, framed region (header + body + footer) ──────────
   NockerlSurface (variant="panel") supplies the fill, hairline, and 12px panel radius.
   This rule keeps the panel's OWN sanctioned drop shadow (tint 62%). No level is
   passed, so no .nk-surface--lN competes and this box-shadow wins cleanly. */
.nk-pnl {
  display: flex;
  flex-direction: column;
  color: var(--color-on-card);
  /* lit from above: NEUTRAL drop shadow below + a ~1px top catch-light sheen */
  box-shadow: 0 var(--space-2) var(--elevation-level3) -8px color-mix(in srgb, var(--color-shadow-tint) 62%, transparent),
              var(--nk-surface-sheen);
  overflow: hidden;
  min-width: 0;
}
.nk-pnl--flush { box-shadow: var(--nk-surface-sheen); }

/* ── Header bar: icon tile + title/subtitle (left) · actions (right) ────── */
.nk-pnl__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  min-height: calc(var(--space-12) + var(--space-2));   /* 56, which clears the target law */
  border-bottom: var(--space-px) solid var(--color-card-hairline);  /* hairline, not a shadow */
}
/* the panel-header icon is INFORMATIONAL (a <span> label, not a control), so per the ratified
   icon-interactivity canon (inset = informational) it wears the INSET treatment, not a filled
   accent tile. Same recessed-disc recipe as the EmptyState well: canvasAlt sunk under an inner top
   shade + hairline, muted glyph. Settings cog + all panel-header marks, consistently (). */
.nk-pnl__tile {
  flex: 0 0 auto;
  display: inline-flex; align-items: center; justify-content: center;
  width: var(--space-8); height: var(--space-8);
  border-radius: var(--radius-pill);
  background: var(--color-canvas-alt);
  border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), inset 0 calc(-1 * var(--space-px)) 0 var(--color-surface-highlight);
  color: var(--color-on-card-muted);
}
.nk-pnl__tile svg { display: block; width: 16px; height: 16px; }
.nk-pnl__titles { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-pnl__title {
  font-size: var(--font-size-14); font-weight: var(--font-weight-semibold);
  line-height: var(--font-line-height-20); color: var(--color-on-card);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0;
}
.nk-pnl__sub {
  font-size: var(--font-size-12); line-height: var(--font-line-height-16);
  color: var(--color-on-card-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0;
}
.nk-pnl__actions { flex: 0 0 auto; display: inline-flex; align-items: center; gap: var(--space-1); }

/* The whole header acts as the collapse toggle for a collapsible panel */
.nk-pnl__head--toggle { cursor: pointer; -webkit-appearance: none; appearance: none; border: 0; width: 100%; text-align: left;
  background: transparent; font: inherit; color: inherit; border-bottom: var(--space-px) solid var(--color-card-hairline); }
.nk-pnl__head--toggle:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(var(--space-px) * -2); }
/* disclosure chevron, in the QUAD grammar (matches the NockerlListItem accordion primitive):
   points DOWN at rest, ROTATES 180deg to UP on open (transform-only, law §7) and brightens its
   color, at the shared .2s + var(--motion-easing-standard) motion, never a right->down 90deg twist. */
.nk-pnl__chev { transition: transform .2s var(--motion-easing-standard), color .12s; color: var(--color-on-card-muted); display: inline-flex; }
.nk-pnl__chev svg { display: block; width: 18px; height: 18px; }
.nk-pnl__chev--open { transform: rotate(180deg); color: var(--color-on-card); }

/* ── Toolbar row: a secondary control strip under the header ────────────── */
.nk-pnl__toolbar {
  display: flex; align-items: center; gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  background: var(--color-card-surface2);          /* slightly raised tier */
  border-bottom: var(--space-px) solid var(--color-card-hairline);
}
.nk-pnl__tbar-sep { width: var(--space-px); align-self: stretch; margin: var(--space-1) var(--space-1);
  background: var(--color-divider); }
.nk-pnl__tbar-spacer { flex: 1 1 auto; }

/* ── Body: consistently padded content region ──────────────────────────── */
.nk-pnl__body { padding: var(--space-4); font-size: var(--font-size-12);
  line-height: var(--font-line-height-20); color: var(--color-on-card-muted); }
.nk-pnl__body p { margin: 0; }
.nk-pnl__body p + p { margin-top: var(--space-3); }

/* Collapsible body wrapper, the QUAD reveal (matches the primitive): an interpolated
   grid-row track (0fr -> 1fr) + opacity, flash-free, at the shared var(--motion-easing-standard). */
.nk-pnl__collapse { display: grid; grid-template-rows: 1fr; opacity: 1; transition: grid-template-rows .24s var(--motion-easing-standard), opacity .18s; }
.nk-pnl__collapse--closed { grid-template-rows: 0fr; opacity: 0; }
.nk-pnl__collapse > div { overflow: hidden; min-height: 0; }

/* ── Footer: top hairline, actions right-aligned ───────────────────────── */
.nk-pnl__foot {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: var(--space-px) solid var(--color-card-hairline);
  background: var(--color-card-surface2);
}
.nk-pnl__foot-note { flex: 1 1 auto; min-width: 0; font-size: var(--font-size-12); color: var(--color-on-card-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Inspector: key/value rows ─────────────────────────────────────────── */
.nk-pnl__kv { display: flex; align-items: baseline; gap: var(--space-3);
  padding: var(--space-2) 0; border-top: var(--space-px) solid var(--color-divider); }
.nk-pnl__kv:first-child { border-top: 0; }
.nk-pnl__k { flex: 0 0 38%; font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-pnl__v { flex: 1 1 auto; min-width: 0; font-size: var(--font-size-12); font-family: var(--font-family-mono);
  color: var(--color-on-card); word-break: break-word; }
.nk-pnl__v--accent { color: var(--color-accent-primary); }

/* status pill (warm, never cyan) for the inspector */
.nk-pnl__pill { display: inline-flex; align-items: center; gap: var(--space-1);
  font-family: var(--font-family-sans); font-size: var(--font-size-10); font-weight: var(--font-weight-semibold);
  padding: var(--space-0-5) var(--space-2); border-radius: var(--radius-pill); }
.nk-pnl__pill::before { content: ""; width: 6px; height: 6px; border-radius: var(--radius-pill); background: currentColor; }
.nk-pnl__pill--ok { color: var(--color-status-success); background: color-mix(in srgb, var(--color-status-success) 14%, transparent); }

/* ── Nested / section panels ───────────────────────────────────────────── */
.nk-pnl__nested { background: var(--color-card-surface2); border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-control); overflow: hidden; }
.nk-pnl__nested + .nk-pnl__nested { margin-top: var(--space-3); }
.nk-pnl__nested-head { display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-3); border-bottom: var(--space-px) solid var(--color-card-hairline); }
.nk-pnl__nested-title { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  font-weight: var(--font-weight-semibold); color: var(--color-on-card-muted); margin: 0; }
.nk-pnl__nested-body { padding: var(--space-3); font-size: var(--font-size-12);
  line-height: var(--font-line-height-20); color: var(--color-on-card-muted); }
.nk-pnl__nested-body p { margin: 0; }

/* ── Split pane: TWO panels + a draggable, keyboard-operable splitter ───── */
.nk-pnl-split { display: flex; align-items: stretch; gap: 0; height: calc(var(--space-16) * 4 - var(--space-2));
  /* the well the panes sit in (recessed ground, so the panes read as lifted) */
  background: var(--color-canvas-alt); border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-panel); padding: var(--space-2); }
.nk-pnl-split .nk-pnl { height: 100%; }
.nk-pnl-split__pane { min-width: 0; overflow: hidden; }
.nk-pnl-split__pane .nk-pnl__body { overflow: auto; }
/* the splitter: a full-height handle, centered grip, recessed track */
.nk-pnl-split__bar {
  flex: 0 0 auto; width: var(--space-4); align-self: stretch; cursor: col-resize;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 0; padding: 0;
  transition: background-color .12s;
  touch-action: none;
}
.nk-pnl-split__bar:hover { background: color-mix(in srgb, var(--color-accent-primary) 8%, transparent); }
.nk-pnl-split__bar:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: calc(var(--space-px) * -2); border-radius: var(--radius-control); }
.nk-pnl-split__grip { width: var(--space-px); height: var(--space-12);
  background: var(--color-divider); border-radius: var(--radius-pill);
  transition: background-color .12s; }
.nk-pnl-split__bar:hover .nk-pnl-split__grip,
.nk-pnl-split__bar:focus-visible .nk-pnl-split__grip { background: var(--color-accent-primary); }

@media (prefers-reduced-motion: reduce) {
  .nk-pnl__chev, .nk-pnl__collapse, .nk-pnl-split__bar, .nk-pnl-split__grip { transition: none; }
}

/* ── Demo scaffolding ──────────────────────────────────────────────────── */
.nk-pnl-demo__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-5); align-items: start; }
.nk-pnl-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-pnl-demo__sec + .nk-pnl-demo__sec { margin-top: var(--space-8); }
.nk-pnl-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-6); }
.nk-pnl-demo__count b { color: var(--color-accent-primary); }
`;

// ─── Inline stroke glyphs (currentColor, so each slot tints correctly) ────
const IconInspect = (<NockerlIcon><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></NockerlIcon>);
const IconSettings = (<NockerlIcon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 14a1.65 1.65 0 0 0-1.17-1.51H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 7" /></NockerlIcon>);
const IconLayers = (<NockerlIcon><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></NockerlIcon>);
const IconChevron = (<NockerlIcon name="chevronDown" />);
const IconRefresh = (<NockerlIcon><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></NockerlIcon>);
const IconMore = (<NockerlIcon><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></NockerlIcon>);
const IconWrap = (<NockerlIcon><path d="M3 6h18M3 12h13a3 3 0 1 1 0 6h-3" /><path d="m13 15-2 3 2 3" transform="translate(0 -3)" /><path d="M3 18h5" /></NockerlIcon>);

// ─── Sub-parts ────────────────────────────────────────────────────────────

/** One inspector key/value row. */
function KV({ k, v, accent, children }: { k: string; v?: string; accent?: boolean; children?: React.ReactNode }) {
  return (
    <div className="nk-pnl__kv">
      <span className="nk-pnl__k">{k}</span>
      <span className={`nk-pnl__v${accent ? ' nk-pnl__v--accent' : ''}`}>{children ?? v}</span>
    </div>
  );
}

// ─── Split pane: draggable + keyboard-operable separator ──────────────────

const MIN_PCT = 25;   // clamp: neither pane collapses below 25%
const MAX_PCT = 75;
const STEP = 4;       // arrow-key nudge

function SplitPane() {
  const [pct, setPct] = useState(46);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const clamp = (n: number) => Math.min(MAX_PCT, Math.max(MIN_PCT, n));

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    setPct(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => { if (dragging.current) setFromClientX(e.clientX); };
    const up = () => { dragging.current = false; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [setFromClientX]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setPct((p) => clamp(p - STEP)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setPct((p) => clamp(p + STEP)); }
    else if (e.key === 'Home') { e.preventDefault(); setPct(MIN_PCT); }
    else if (e.key === 'End') { e.preventDefault(); setPct(MAX_PCT); }
  };

  return (
    <div className="nk-pnl-split" ref={wrapRef}>
      <div className="nk-pnl-split__pane" style={{ flex: `0 0 ${pct}%` }}>
        <NockerlSurface variant="panel" className="nk-pnl">
          <div className="nk-pnl__head">
            <span className="nk-pnl__tile">{IconLayers}</span>
            <span className="nk-pnl__titles"><p className="nk-pnl__title">Explorer</p><p className="nk-pnl__sub">12 sessions</p></span>
          </div>
          <div className="nk-pnl__body"><p>The left pane. Drag the splitter, or focus it and press Arrow Left / Right (Home / End to snap). Width is clamped between 25% and 75%.</p></div>
        </NockerlSurface>
      </div>
      <button
        type="button"
        className="nk-pnl-split__bar"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panes"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={MIN_PCT}
        aria-valuemax={MAX_PCT}
        tabIndex={0}
        onPointerDown={(e) => { dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
        onKeyDown={onKeyDown}
      >
        <span className="nk-pnl-split__grip" aria-hidden="true" />
      </button>
      <div className="nk-pnl-split__pane" style={{ flex: '1 1 0' }}>
        <NockerlSurface variant="panel" className="nk-pnl">
          <div className="nk-pnl__head">
            <span className="nk-pnl__tile">{IconInspect}</span>
            <span className="nk-pnl__titles"><p className="nk-pnl__title">Detail</p><p className="nk-pnl__sub">nockerl-cli · gateway</p></span>
            <span className="nk-pnl__actions"><NockerlIconButton label="Refresh detail" icon={<NockerlIcon><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></NockerlIcon>} variant="plain" size={32} /></span>
          </div>
          <div className="nk-pnl__body"><p>The right pane fills the remaining space. A split-pane region stays in the layout; it is not an overlay like a drawer.</p></div>
        </NockerlSurface>
      </div>
    </div>
  );
}

// ─── Showcase ─────────────────────────────────────────────────────────────

// Panel is a content-region CONTAINER: header/body/footer wrap arbitrary content → default '*'. It
// composes NockerlSurface (the plane) + NockerlButton/NockerlIconButton/NockerlIcon for its header + toolbar actions.
// OWNS button: the split-pane splitter (a role=separator resize handle, not a NockerlSlider) and the
// full-width multi-line header disclosure are Panel's own controls.
export const compose = {
  slots: { default: { accepts: '*' } },
  owns: ['button'],
} satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Panel page: a full panel (header with
 * icon tile + title + subtitle + actions, body, footer with right-aligned
 * actions); a COLLAPSIBLE panel (header chevron toggles the body, flash-free,
 * `aria-expanded`); a panel with a TOOLBAR row; an INSPECTOR panel of key/value
 * rows; a panel of NESTED section panels; and a SPLIT-PANE region with two panels
 * and a draggable, keyboard-operable resize splitter.
 */
export default function PanelDemo() {
  const [open, setOpen] = useState(true);
  const [wrap, setWrap] = useState(true);
  const [saves, setSaves] = useState(0);

  return (
    <div className="nk-pnl-demo">
      <style>{STYLES}</style>

      <section className="nk-pnl-demo__sec">
        <p className="nk-pnl-demo__lbl">Header bar · body · footer, plus a collapsible panel</p>
        <div className="nk-pnl-demo__grid">
          {/* Full panel: header (tile + title + subtitle + actions) → body → footer */}
          <NockerlSurface variant="panel" className="nk-pnl">
            <div className="nk-pnl__head">
              <span className="nk-pnl__tile">{IconSettings}</span>
              <span className="nk-pnl__titles">
                <p className="nk-pnl__title">Session settings</p>
                <p className="nk-pnl__sub">nockerl-cli · primary</p>
              </span>
              <span className="nk-pnl__actions">
                <NockerlIconButton label="Refresh" icon={<NockerlIcon><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></NockerlIcon>} variant="plain" size={32} />
                <NockerlIconButton label="More actions" icon={<NockerlIcon><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></NockerlIcon>} variant="plain" size={32} />
              </span>
            </div>
            <div className="nk-pnl__body">
              <p>A panel is a persistent, in-layout region: a header bar with a title and actions, a padded body, and an optional footer. Larger than a card; not an overlay.</p>
            </div>
            <div className="nk-pnl__foot">
              <span className="nk-pnl__foot-note">Unsaved changes</span>
              <NockerlButton text="Reset" variant="ghost" size="sm" />
              <NockerlButton text="Save" variant="primary" size="sm" onClick={() => setSaves((s) => s + 1)} />
            </div>
          </NockerlSurface>

          {/* Collapsible panel: the whole header is the toggle (aria-expanded) */}
          <NockerlSurface variant="panel" className="nk-pnl">
            <button
              type="button"
              className="nk-pnl__head nk-pnl__head--toggle"
              aria-expanded={open}
              aria-controls="nk-pnl-collapse"
              onClick={() => setOpen((v) => !v)}
            >
              <span className={`nk-pnl__chev${open ? ' nk-pnl__chev--open' : ''}`} aria-hidden="true">{IconChevron}</span>
              <span className="nk-pnl__titles">
                <p className="nk-pnl__title">Context window</p>
                <p className="nk-pnl__sub">{open ? 'Showing usage' : 'Collapsed'}</p>
              </span>
            </button>
            <div id="nk-pnl-collapse" className={`nk-pnl__collapse${open ? '' : ' nk-pnl__collapse--closed'}`}>
              <div>
                <div className="nk-pnl__body">
                  <p>The header chevron collapses and expands the body. The transition animates grid height (flash-free) and freezes under reduced-motion. Click the header to toggle.</p>
                </div>
              </div>
            </div>
          </NockerlSurface>
        </div>
      </section>

      <section className="nk-pnl-demo__sec">
        <p className="nk-pnl-demo__lbl">Toolbar row · inspector (key / value) · nested sections</p>
        <div className="nk-pnl-demo__grid">
          {/* Panel with a toolbar row under the header */}
          <NockerlSurface variant="panel" className="nk-pnl">
            <div className="nk-pnl__head">
              <span className="nk-pnl__tile">{IconLayers}</span>
              <span className="nk-pnl__titles"><p className="nk-pnl__title">Output</p></span>
            </div>
            <div className="nk-pnl__toolbar" role="toolbar" aria-label="Output toolbar">
              {/* Wrap is a TOGGLE → the NockerlIconButton TOGGLE mode: pressed renders
                  aria-pressed + the cyan SELECTION wash (design-laws section 6). */}
              <NockerlIconButton label="Wrap" icon={IconWrap} variant="plain" size={32} pressed={wrap} onClick={() => setWrap((v) => !v)} />
              {/* the copy affordance is the shared _CopyButton: a real clipboard write plus
                  the standard on-accent confirmation. */}
              <CopyButton size={32} text={() => 'A toolbar row hosts secondary controls (toggles, actions) on a slightly raised tier between the header and the body.'} label="Copy output" />
              <span className="nk-pnl__tbar-sep" aria-hidden="true" />
              <NockerlIconButton label="Reload" icon={IconRefresh} variant="plain" size={32} />
              <span className="nk-pnl__tbar-spacer" />
              <NockerlIconButton label="More" icon={IconMore} variant="plain" size={32} />
            </div>
            <div className="nk-pnl__body">
              <p>A toolbar row hosts secondary controls (toggles, actions) on a slightly raised tier between the header and the body. Word wrap is {wrap ? 'on' : 'off'}.</p>
            </div>
          </NockerlSurface>

          {/* Inspector: key/value rows */}
          <NockerlSurface variant="panel" className="nk-pnl">
            <div className="nk-pnl__head">
              <span className="nk-pnl__tile">{IconInspect}</span>
              <span className="nk-pnl__titles"><p className="nk-pnl__title">Inspector</p><p className="nk-pnl__sub">Selected session</p></span>
            </div>
            <div className="nk-pnl__body">
              <KV k="Label" accent>project:nockerl-cli::primary</KV>
              <KV k="Engine" v="cloud-agent" />
              <KV k="Model" v="large-2.6" />
              <KV k="Status"><span className="nk-pnl__pill nk-pnl__pill--ok">idle</span></KV>
              <KV k="Last active" v="12m ago" />
            </div>
          </NockerlSurface>

          {/* Nested / section panels */}
          <NockerlSurface variant="panel" className="nk-pnl">
            <div className="nk-pnl__head">
              <span className="nk-pnl__tile">{IconSettings}</span>
              <span className="nk-pnl__titles"><p className="nk-pnl__title">Advanced</p></span>
            </div>
            <div className="nk-pnl__body" style={{ color: 'var(--color-on-card)' }}>
              {/* Nested sections are a DIFFERENT sub-surface (surface2 + --radius-control),
                  not the panel variant, so they stay inline rather than composed onto NockerlSurface. */}
              <div className="nk-pnl__nested">
                <div className="nk-pnl__nested-head"><p className="nk-pnl__nested-title">Sampling</p></div>
                <div className="nk-pnl__nested-body"><p>A panel can contain section panels: a nested surface a tier up, with its own header and body.</p></div>
              </div>
              <div className="nk-pnl__nested">
                <div className="nk-pnl__nested-head"><p className="nk-pnl__nested-title">Permissions</p></div>
                <div className="nk-pnl__nested-body"><p>Sections share the panel material at the control radius, divided by hairlines.</p></div>
              </div>
            </div>
          </NockerlSurface>
        </div>
      </section>

      <section className="nk-pnl-demo__sec">
        <p className="nk-pnl-demo__lbl">Split pane: two panels + a draggable, keyboard-operable splitter</p>
        <SplitPane />
      </section>

      <p className="nk-pnl-demo__count">
        Saved <b>{saves}</b> {saves === 1 ? 'time' : 'times'} · drag or arrow-key the splitter. The island is live.
      </p>
    </div>
  );
}
