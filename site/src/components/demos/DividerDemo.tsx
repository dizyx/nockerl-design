/**
 * DividerDemo: the live, interactive Nockerl divider/separator island for web.
 *
 * Sourced verbatim from the shipped apps (never the web dashboard):
 *   • Android Compose gives `HorizontalDivider(thickness = 1.dp, color = colors.divider)`
 *     (MainScaffold), inset `HorizontalDivider(Modifier.padding(horizontal = 20.dp))`
 *     (FlicTargetPickerSheet), the labeled `SystemMessageDivider` (two weight(1f)
 *     rules + a centered `labelSmall`), and the section-label divider in
 *     SessionConfigFields. The signature **1.5dp cyan boundary line**
 *     (`colors.accentPrimary`) comes from TopChromeBoundary.
 *   • Voice Swift gives `Rectangle().fill(NockerlTheme.hairline).frame(height: 1)`
 *     (SettingsView/HistoryView), the vertical `Rectangle().fill(divider)
 *     .frame(width: 1, height: 22)` (RecordingHUD pill), `.frame(width: 1)`
 *     (DashboardView sidebar).
 *
 * Implements the design laws verbatim:
 *   • A divider is a crisp HAIRLINE, never a shadow, never a glow. Structure only.
 *   • Standard rule = `--color-divider`; on the alternate (sheet) plane =
 *     `--color-alt-hairline`; the inverse, the SIGNATURE boundary line, is the one
 *     place a divider carries the brand: `--color-accent-primary` (cyan), the ONLY
 *     brand accent. A warm (`--color-status-warning`) rule is a STATUS divider only.
 *   • Labels ride muted-on-surface type; rules stay balanced on each side of a label.
 *   • Presentational: `role="separator"` + correct `aria-orientation`, never focusable.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing is a `var(--token)` (see
 * docs/demo-token-contract.md). The dark stage resolves them to the dark palette;
 * change a token and this demo moves with everything else. Literals remain only for
 * pure geometry (the 1px / 1.5px hairline thickness, the vertical-rule height,
 * transition curves). A hairline's crispness is geometry, not a token.
 */
import { useState } from 'react';
import { NockerlCheckbox, NockerlDivider } from '@dizyx/nockerl-react';

// Demo-only scaffolding CSS. The NockerlDivider recipe (.nk-dv*, .nk-dv-labeled*) now
// lives in the primitive (NOCKERL_DIVIDER_STYLES) and is injected by the component; what
// stays here is the showcase chrome + the realistic mini-contexts (card / rows /
// pads / inline / chrome bar) that prove alignment and crispness.
const STYLES = `
.nk-dv-demo { font-family: var(--font-family-sans); color: var(--color-on-card); }

/* ── Realistic mini-contexts so alignment is provable ────────────────────── */
.nk-dv-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-dv-demo__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-5); }
.nk-dv-demo__grid + .nk-dv-demo__grid { margin-top: var(--space-6); }

/* The lifted CARD is where depth lives (card radius, lit from above); the rules
   inside it are flat hairlines, exactly like a list of rows. */
.nk-dv-card {
  background: var(--color-card-surface1);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-card);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) 55%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
  overflow: hidden;
}
.nk-dv-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
  padding: var(--space-3) var(--space-4); min-height: calc(var(--space-10) + var(--space-1)); }
.nk-dv-row__k { font-size: var(--font-size-14); color: var(--color-on-card); }
.nk-dv-row__v { font-size: var(--font-size-12); color: var(--color-on-card-muted); }

/* A labeled / section / boxed sample sits on a padded card so the inset reads. */
.nk-dv-pad { padding: var(--space-4); }
.nk-dv-pad + .nk-dv-pad { border-top: var(--space-px) solid var(--color-card-hairline); }
.nk-dv-copy { font-size: var(--font-size-12); line-height: var(--font-line-height-16); color: var(--color-on-card-muted); }
.nk-dv-copy--head { font-size: var(--font-size-14); color: var(--color-on-card); font-weight: var(--font-weight-medium);
  margin: 0 0 var(--space-2); }

/* Inline row proving the VERTICAL rule matches text height. */
.nk-dv-inline { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
  font-size: var(--font-size-13); color: var(--color-on-card); }
.nk-dv-inline__item { color: var(--color-on-card); }
.nk-dv-inline__item--muted { color: var(--color-on-card-muted); }
.nk-dv-inline__link { color: var(--color-accent-primary); }

/* The signature boundary-line context: flat chrome block, cyan line flush under. */
.nk-dv-chrome { background: var(--color-chrome-surface); border-radius: var(--radius-panel) var(--radius-panel) 0 0;
  border: var(--space-px) solid var(--color-chrome-hairline); border-bottom: 0; overflow: hidden; }
.nk-dv-chrome__bar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); }
.nk-dv-chrome__title { font-size: var(--font-size-13); font-weight: var(--font-weight-semibold); color: var(--color-on-chrome); }
.nk-dv-chrome__sub { font-size: var(--font-size-12); color: var(--color-on-chrome-muted); }
.nk-dv-chrome__below { padding: var(--space-4); background: var(--color-canvas);
  border-radius: 0 0 var(--radius-panel) var(--radius-panel);
  border: var(--space-px) solid var(--color-chrome-hairline); border-top: 0;
  font-size: var(--font-size-12); color: var(--color-on-canvas-muted); }

.nk-dv-demo__caption { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-5); }
.nk-dv-demo__caption b { color: var(--color-accent-primary); }
`;

/**
 * The interactive showcase mounted on the NockerlDivider page. Every variant rendered in
 * a realistic mini-context so alignment is provable:
 *  • a full-bleed rule edge-to-edge between list rows (card carries the depth);
 *  • an inset/indented rule that clears the row's text column;
 *  • a centered "OR" labeled divider and a warm STATUS labeled divider;
 *  • a flush-left section-label divider over a settings group;
 *  • vertical rules between inline items (matching the text height);
 *  • the signature 1.5px cyan boundary line flush under a chrome bar;
 *  • the tone ladder (default / alt-plane / status / accent) side by side.
 * A live control swaps the inset so the reactivity (and the crispness) is obvious.
 */
export default function DividerDemo() {
  const [inset, setInset] = useState(true);
  const insetVal = 'var(--space-4)';

  return (
    <div className="nk-dv-demo">
      <style>{STYLES}</style>

      <div className="nk-dv-demo__grid">
        {/* Full-bleed vs inset, between real list rows, on one card. */}
        <div>
          <p className="nk-dv-demo__lbl">Between rows: full-bleed vs inset (toggle)</p>
          <div className="nk-dv-card">
            <div className="nk-dv-row"><span className="nk-dv-row__k">Theme</span><span className="nk-dv-row__v">System</span></div>
            <NockerlDivider />
            <div className="nk-dv-row"><span className="nk-dv-row__k">Default model</span><span className="nk-dv-row__v">Large 2.0</span></div>
            {inset ? <NockerlDivider inset={insetVal} /> : <NockerlDivider />}
            <div className="nk-dv-row"><span className="nk-dv-row__k">Workspace</span><span className="nk-dv-row__v">dizyx</span></div>
            <NockerlDivider />
            <div className="nk-dv-row"><span className="nk-dv-row__k">Notifications</span><span className="nk-dv-row__v">On</span></div>
          </div>
          <span className="nk-dv-demo__caption" style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <NockerlCheckbox checked={inset} onChange={setInset} ariaLabel="Inset the middle rule by --space-4" />
            Inset the middle rule by <b>--space-4</b>
          </span>
        </div>

        {/* Labeled: a centered "OR" + a warm status divider. */}
        <div>
          <p className="nk-dv-demo__lbl">Labeled: centered &amp; status</p>
          <div className="nk-dv-card">
            <div className="nk-dv-pad">
              <p className="nk-dv-copy--head">Sign in</p>
              <p className="nk-dv-copy">Continue with your workspace credentials.</p>
            </div>
            <div className="nk-dv-pad"><NockerlDivider label="OR" /></div>
            <div className="nk-dv-pad">
              <p className="nk-dv-copy">Use a one-time email link instead.</p>
            </div>
            <div className="nk-dv-pad"><NockerlDivider label="Session reset" tone="status" /></div>
          </div>
        </div>
      </div>

      <div className="nk-dv-demo__grid">
        {/* Section-label divider over a settings group. */}
        <div>
          <p className="nk-dv-demo__lbl">Section header: flush-left label + rule</p>
          <div className="nk-dv-card">
            <div className="nk-dv-pad"><NockerlDivider label="Session overrides" sectionLabel /></div>
            <div className="nk-dv-row"><span className="nk-dv-row__k">Tool mode</span><span className="nk-dv-row__v">Ask</span></div>
            <NockerlDivider />
            <div className="nk-dv-row"><span className="nk-dv-row__k">Thinking</span><span className="nk-dv-row__v">Auto</span></div>
            <div className="nk-dv-pad" style={{ borderTop: 'var(--space-px) solid var(--color-card-hairline)' }}>
              <NockerlDivider label="Sampling" sectionLabel />
            </div>
            <div className="nk-dv-row"><span className="nk-dv-row__k">Temperature</span><span className="nk-dv-row__v">0.7</span></div>
          </div>
        </div>

        {/* Vertical rule between inline items, matched to text height. */}
        <div>
          <p className="nk-dv-demo__lbl">Vertical: between inline items</p>
          <div className="nk-dv-card">
            <div className="nk-dv-pad">
              <div className="nk-dv-inline">
                <span className="nk-dv-inline__item">Streaming</span>
                <NockerlDivider orientation="vertical" />
                <span className="nk-dv-inline__item--muted">2 tools</span>
                <NockerlDivider orientation="vertical" />
                <span className="nk-dv-inline__item--muted">12m ago</span>
              </div>
            </div>
            <div className="nk-dv-pad">
              <div className="nk-dv-inline">
                <span className="nk-dv-inline__link">Edit</span>
                <NockerlDivider orientation="vertical" />
                <span className="nk-dv-inline__link">Share</span>
                <NockerlDivider orientation="vertical" />
                <span className="nk-dv-inline__link">Archive</span>
              </div>
            </div>
            <div className="nk-dv-pad">
              {/* The cyan vertical anchor: the RecordingHUD pill idiom. */}
              <div className="nk-dv-inline">
                <span className="nk-dv-inline__item" style={{ fontWeight: 'var(--font-weight-semibold)' }}>Nockerl</span>
                <NockerlDivider orientation="vertical" tone="accent" />
                <span className="nk-dv-inline__item--muted">listening…</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The signature cyan boundary line: full-bleed, flush under a chrome bar. */}
      <div className="nk-dv-demo__grid">
        <div>
          <p className="nk-dv-demo__lbl">Signature: the 1.5px cyan boundary line</p>
          <div>
            <div className="nk-dv-chrome">
              <div className="nk-dv-chrome__bar">
                <span className="nk-dv-chrome__title">nockerl-design</span>
                <span className="nk-dv-chrome__sub">· docs site</span>
              </div>
            </div>
            <NockerlDivider tone="accent" />
            <div className="nk-dv-chrome__below">The chat content begins flush below the boundary.</div>
          </div>
        </div>

        {/* Tone ladder: default / alt-plane / status / accent / warm. */}
        <div>
          <p className="nk-dv-demo__lbl">Tone ladder: same hairline, five roles</p>
          <div className="nk-dv-card">
            <div className="nk-dv-pad">
              <p className="nk-dv-copy" style={{ marginBottom: 'var(--space-2)' }}>Default</p>
              <NockerlDivider />
            </div>
            <div className="nk-dv-pad">
              <p className="nk-dv-copy" style={{ marginBottom: 'var(--space-2)' }}>Alt plane (sheet)</p>
              <NockerlDivider tone="alt" />
            </div>
            <div className="nk-dv-pad">
              <p className="nk-dv-copy" style={{ marginBottom: 'var(--space-2)' }}>Status (warning)</p>
              <NockerlDivider tone="status" />
            </div>
            <div className="nk-dv-pad">
              <p className="nk-dv-copy" style={{ marginBottom: 'var(--space-2)' }}>Accent (1.5px cyan)</p>
              <NockerlDivider tone="accent" />
            </div>
            <div className="nk-dv-pad">
              <p className="nk-dv-copy" style={{ marginBottom: 'var(--space-2)' }}>Warm: rare feature line (accent.warm)</p>
              <NockerlDivider tone="warm" />
            </div>
          </div>
        </div>
      </div>

      <p className="nk-dv-demo__caption">
        One hairline, five tokens. Change <b>--color-divider</b>, <b>--color-accent-primary</b>, or <b>--color-accent-warm</b> and every rule moves.
      </p>
    </div>
  );
}
