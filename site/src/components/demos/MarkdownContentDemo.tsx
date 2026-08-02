/**
 * MarkdownContentDemo: the live, interactive Nockerl rendered-markdown PROSE
 * system for the web. This is the OVERALL typographic surface that renders an
 * assistant/chat message or a docs page: the type scale + spacing rhythm for a
 * whole block of markdown, composing the element vocabulary documented
 * elsewhere (code-block, link, table, divider, callout).
 *
 * It is NOT a single code block or a single link. It is the cohesive prose
 * renderer that lays out headings, paragraphs (bold / italic / inline-code /
 * links), ordered + unordered + task lists, a blockquote, a fenced code block,
 * a table, a horizontal rule, and an inline figure, with correct vertical AND
 * horizontal alignment (one left edge, aligned list markers, heading rhythm, a
 * full-width code well, aligned table columns).
 *
 * Sourced from the SHIPPED Android app, the canonical markdown renderer
 * (chat/ui/MarkdownContent.kt → mikepenz multiplatform-markdown-renderer):
 *   • heading roles map to the type ramp: h1 → title.medium, h2 → title.small,
 *     h3/h4 → label.large (chat density is deliberately compact: a bubble, not
 *     a billboard). The "comfortable" docs density scales the same rhythm up.
 *   • body is body.medium with a slightly looser line-height (the app overrides
 *     bodyMedium lineHeight to 22sp for readability).
 *   • inline code = a quiet chip washed from the BODY TEXT color (the app's
 *     `INLINE_CODE_TINT_ALPHA = 0.10f`), mono font.
 *   • a fenced code block = a recessed mono well washed from the body text color
 *     (`CODE_PANEL_TINT_ALPHA = 0.07f`), here promoted to the dedicated
 *     code-block surface (recessed canvas-alt + inner shadow), matching CodeBlock.
 *   • bullets render as `•`; list indent + item spacing follow `markdownPadding`
 *     (list 8dp, listItemBottom 6dp, listIndent 8dp); block spacing is 6dp.
 *   • links use the single cyan accent + underline (the renderer's TextLinkStyles).
 *
 * Laws, verbatim:
 *   • the prose CARD lifts (neutral shadow + top catch-light); the code well
 *     SINKS (recessed + inner shadow), the inverse. No glow / colored shadow.
 *   • the blockquote is a recessed callout well + a quote mark (NO left rail);
 *     selected/task accents are SHAPES, never halos.
 *   • cyan is the ONLY brand accent (links, the blockquote quote mark, checked boxes);
 *     warm tones never appear as decoration here.
 *   • feedback animates interpolatable props (the density switch knob transform,
 *     a checkbox scale), never a fill swap. prefers-reduced-motion freezes them.
 *   • the density toggle + task checkboxes + links are REAL focusable controls
 *     with a focus-visible OUTLINE ring (never a colored shadow).
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * `var(--token)` (see docs/demo-token-contract.md). Heading sizes bind to the
 * `--type-*` ramp; mono uses `--font-family-mono`; the code well + inline chip
 * use the recessed-surface tokens; the rail + links use the accent token; table
 * hairlines use the divider token. Literals remain only for pure geometry
 * (checkbox/figure dimensions, underline thickness, shadow blur, transitions).
 */
import { useState } from 'react';
import { NockerlCheckbox, NockerlDivider, NockerlIcon, NockerlLanguageBadge, NockerlLink, NockerlSurface, NockerlSwitch, type ComposeContract } from '@dizyx/nockerl-react';

export type ProseDensity = 'comfortable' | 'compact';

// The prose CARD lifts; the code well SINKS. Heading sizes bind to the type ramp
// at TWO densities (a class on the root flips them). All values are tokens; the
// dark stage resolves the cyan accent to #0cc0df. Literals = geometry only.
const STYLES = `
.nk-md-demo { font-family: var(--font-family-sans); color: var(--color-on-canvas); }

/* ── The rendered-markdown surface is a LIFTED card (cards lift law). Bg / hairline /
   radius / sheen come from the NockerlSurface primitive; only the flow var + padding + max-width +
   text color + the off-ladder drop shadow stay. ───────── */
.nk-md {
  --nk-md-flow: var(--space-4);        /* default vertical rhythm between blocks */
  box-shadow: 0 var(--space-1) var(--elevation-level2) -6px color-mix(in srgb, var(--color-shadow-tint) 60%, transparent), var(--nk-surface-sheen);
  padding: var(--space-6);
  max-width: 640px;
  color: var(--color-on-card);
}
/* compact = chat-bubble density: tighter rhythm + the compact heading ramp */
.nk-md--compact { --nk-md-flow: var(--space-3); padding: var(--space-5); }

/* every direct child shares ONE left edge; rhythm is owned here, not per element */
.nk-md > * { margin: 0; }
.nk-md > * + * { margin-top: var(--nk-md-flow); }
/* a heading wants extra air ABOVE it (new section), tighter below (owns its body) */
.nk-md > :is(h1,h2,h3,h4) + * { margin-top: var(--space-2); }
.nk-md > * + :is(h1,h2,h3,h4) { margin-top: var(--space-6); }
.nk-md--compact > * + :is(h1,h2,h3,h4) { margin-top: var(--space-5); }

/* ── Headings bind to the type ramp (Android role mapping) ──────────────── */
.nk-md h1, .nk-md h2, .nk-md h3, .nk-md h4 {
  font-family: var(--font-family-sans); color: var(--color-on-card); letter-spacing: var(--font-tracking-snug);
}
/* COMFORTABLE (docs) density: the scale stepped up for a full page */
.nk-md h1 { font-size: var(--type-headline-medium-font-size); line-height: var(--type-headline-medium-line-height); font-weight: var(--font-weight-bold); }
.nk-md h2 { font-size: var(--type-headline-small-font-size); line-height: var(--type-headline-small-line-height); font-weight: var(--font-weight-semibold); }
.nk-md h3 { font-size: var(--type-title-large-font-size); line-height: var(--type-title-large-line-height); font-weight: var(--font-weight-semibold); }
.nk-md h4 { font-size: var(--type-title-medium-font-size); line-height: var(--type-title-medium-line-height); font-weight: var(--font-weight-semibold); }
/* COMPACT (chat) density: the canonical Android bubble mapping verbatim */
.nk-md--compact h1 { font-size: var(--type-title-medium-font-size); line-height: var(--type-title-medium-line-height); font-weight: var(--font-weight-bold); }
.nk-md--compact h2 { font-size: var(--type-title-small-font-size); line-height: var(--type-title-small-line-height); font-weight: var(--font-weight-semibold); }
.nk-md--compact h3 { font-size: var(--type-label-large-font-size); line-height: var(--type-label-large-line-height); font-weight: var(--font-weight-semibold); }
.nk-md--compact h4 { font-size: var(--type-label-large-font-size); line-height: var(--type-label-large-line-height); font-weight: var(--font-weight-medium); color: var(--color-on-card-muted); }

/* ── Body copy: body.medium, slightly looser leading (app: 22sp) ─────────── */
.nk-md p, .nk-md li {
  font-family: var(--font-family-sans);
  font-size: var(--type-body-large-font-size);
  line-height: var(--font-line-height-26);
  font-weight: var(--font-weight-regular);
  color: var(--color-on-card);
}
.nk-md--compact p, .nk-md--compact li {
  font-size: var(--type-body-medium-font-size);
  line-height: var(--type-body-medium-line-height);
}
.nk-md strong { font-weight: var(--font-weight-bold); color: var(--color-on-card); }
.nk-md em { font-style: italic; }
.nk-md del { text-decoration: line-through; color: var(--color-on-card-muted); }

/* ── Inline code: a quiet chip washed from the BODY color (app 0.10 alpha) ── */
.nk-md code {
  font-family: var(--font-family-mono);
  font-size: 0.86em;                                  /* mono runs large; size to the text */
  padding: 0.12em 0.38em;
  border-radius: var(--radius-track);
  background: color-mix(in srgb, var(--color-on-card) 10%, transparent);
  color: var(--color-on-card);
  white-space: nowrap;
}

/* Links in prose compose the NockerlLink primitive (cyan accent + underline); it owns its
   own recipe, so no .nk-md a rule lives here. */

/* ── Lists: bullets are •, markers aligned, indent on the 4px grid ───────── */
.nk-md ul, .nk-md ol { padding-left: var(--space-6); display: flex; flex-direction: column; gap: var(--space-2); }
.nk-md--compact ul, .nk-md--compact ol { gap: var(--space-1); }
.nk-md li { padding-left: var(--space-1); }
.nk-md li::marker { color: var(--color-on-card-muted); }
.nk-md ul li::marker { content: "•  "; }            /* the app renders bullets as • */
.nk-md ol { list-style: decimal; }
.nk-md ol li::marker { font-variant-numeric: tabular-nums; font-weight: var(--font-weight-medium); }

/* ── Task list: the NockerlCheckbox primitive owns the box; we own row layout only ── */
.nk-md__tasks { list-style: none; padding-left: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.nk-md--compact .nk-md__tasks { gap: var(--space-1); }
.nk-md__task { display: flex; align-items: flex-start; gap: var(--space-3); padding-left: 0; }
.nk-md__task .nk-cb { margin-top: 0.18em; flex: 0 0 auto; }
.nk-md__task--done .nk-md__label { color: var(--color-on-card-muted); text-decoration: line-through; }

/* ── Blockquote: an accent LEFT RAIL (a shape, not a glow) + muted text ───── */
/* The rendered blockquote is our Callout QUOTE canon: a SOLID recessed well
   (canvas-alt + a faint inner shadow) with a NEUTRAL hairline, 12px radius, and a leading cyan
   quote mark (a SHAPE, not a rail). This KILLS the Law-6-banned left-rail + translucent-tint
   pattern that was live on our own site. Streaming-safe: pure CSS on the emitted element. */
.nk-md blockquote {
  position: relative;
  background: var(--color-canvas-alt);
  border: var(--space-px) solid var(--color-card-hairline);
  border-radius: var(--radius-control);
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 35%, transparent);
  padding: var(--space-3) var(--space-4) var(--space-3) var(--space-8);
  color: var(--color-on-card-muted);
}
.nk-md blockquote::before {
  content: "“"; position: absolute; left: var(--space-3); top: var(--space-1);
  font-size: var(--font-size-24); line-height: 1; color: var(--color-accent-primary); opacity: .75;
}
.nk-md blockquote p { color: var(--color-on-card-muted); }
.nk-md blockquote > * + * { margin-top: var(--space-2); }

/* ── Fenced code: a RECESSED well (fields sink), matches the CodeBlock surface ─ */
.nk-md__pre {
  border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-panel);
  background: var(--color-canvas-alt); overflow: hidden;
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 35%, transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-md__pre-bar {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-card-surface3); border-bottom: var(--space-px) solid var(--color-card-hairline);
}
/* language tag = the shared hue-free NockerlLanguageBadge, so no per-language color. */
.nk-md__pre-code {
  margin: 0; padding: var(--space-3); overflow-x: auto;
  font-family: var(--font-family-mono); font-size: var(--font-size-12); line-height: var(--font-line-height-20);
  color: var(--color-on-card); white-space: pre;
}
.nk-md__pre-code .t-key { color: var(--color-accent-secondary); }
.nk-md__pre-code .t-str { color: var(--color-status-success); }
.nk-md__pre-code .t-fn { color: var(--color-accent-tertiary); }
.nk-md__pre-code .t-com { color: var(--color-on-card-muted); font-style: italic; }

/* ── Table: hairlines are the divider token; columns aligned; header on a step ─ */
.nk-md__table-wrap { overflow-x: auto; border: var(--space-px) solid var(--color-divider); border-radius: var(--radius-panel); }
.nk-md table { border-collapse: collapse; width: 100%; font-size: var(--type-body-medium-font-size); }
.nk-md--compact table { font-size: var(--font-size-12); }
.nk-md th, .nk-md td {
  text-align: left; padding: var(--space-2) var(--space-3);
  border-bottom: var(--space-px) solid var(--color-divider);
  color: var(--color-on-card); vertical-align: top;
}
.nk-md thead th { background: var(--color-card-surface3); font-weight: var(--font-weight-semibold); color: var(--color-on-card); }
.nk-md tbody tr:last-child td { border-bottom: 0; }
.nk-md td .t-num { font-variant-numeric: tabular-nums; color: var(--color-on-card-muted); }
.nk-md th + th, .nk-md td + td { border-left: var(--space-px) solid var(--color-divider); }

/* ── Horizontal rule: composes the NockerlDivider primitive (it owns the hairline); the
   container only re-asserts its place in the vertical rhythm (the NockerlDivider's own
   margin:0 would otherwise cancel the block flow above). ──────────────────── */
.nk-md > .nk-dv { margin-top: var(--nk-md-flow); }

/* ── Figure: inline image placeholder + a muted caption ─────────────────── */
.nk-md figure { display: flex; flex-direction: column; gap: var(--space-2); }
.nk-md__img {
  display: flex; align-items: center; justify-content: center;
  height: 132px; border-radius: var(--radius-panel);
  border: var(--space-px) solid var(--color-card-hairline);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--color-accent-primary) 14%, var(--color-canvas-alt)), var(--color-canvas-alt));
  color: color-mix(in srgb, var(--color-on-card) 45%, transparent);
}
.nk-md__img svg { width: 34px; height: 34px; }
.nk-md figcaption {
  font-size: var(--type-body-small-font-size); line-height: var(--font-line-height-16);
  color: var(--color-on-card-muted); text-align: center;
}

/* ── Demo scaffolding (not part of the component) ─────────────────────────── */
.nk-md-demo__toolbar { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin: 0 0 var(--space-4); }
.nk-md-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0; }
.nk-md-demo__toggle { display: inline-flex; align-items: center; gap: var(--space-2);
  font-family: inherit; font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-canvas); }
.nk-md-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin: var(--space-5) 0 0; }
.nk-md-demo__count b { color: var(--color-accent-primary); }
`;

interface TaskItem {
  id: string;
  text: React.ReactNode;
  /** Plain-text accessible name for the checkbox (the visible label may be rich). */
  label: string;
  done: boolean;
}

/** One task-list checkbox row: a REAL focusable control (its own tab stop). */
function TaskRow({ item, onToggle }: { item: TaskItem; onToggle: () => void }) {
  return (
    <li className={`nk-md__task${item.done ? ' nk-md__task--done' : ''}`}>
      <NockerlCheckbox checked={item.done} onChange={onToggle} ariaLabel={item.label} size="sm" />
      <span className="nk-md__label">{item.text}</span>
    </li>
  );
}

// Prose renderer: lays out arbitrary markdown (rendered internally), not slots. Task boxes compose the NockerlCheckbox primitive, prose links compose NockerlLink, and the horizontal rule composes NockerlDivider; the <table> stays inline markup, so no owns.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

/**
 * The interactive showcase mounted on the Markdown content page: ONE realistic
 * rendered-markdown document exercising the FULL element set: h1 to h4 headings,
 * a paragraph with bold / italic / inline-code / a link, an unordered list, an
 * ordered list, a task list with real checkboxes, a blockquote with an accent
 * rail, a fenced code block in the recessed code well, a table with aligned
 * columns, a horizontal rule, and an inline figure with a caption, all sharing
 * one left edge and a consistent vertical rhythm. A density toggle flips the
 * whole block between docs (comfortable) and chat (compact) typography. The
 * checkboxes, link, and toggle are keyboard-operable with focus-visible rings;
 * motion freezes under prefers-reduced-motion.
 */
export default function MarkdownContentDemo() {
  const [density, setDensity] = useState<ProseDensity>('comfortable');
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: 't1', text: 'Resolve raw values to design tokens', label: 'Resolve raw values to design tokens', done: true },
    {
      id: 't2',
      text: (
        <>
          Ship to the per-platform packages (<code>@dizyx/*</code>)
        </>
      ),
      label: 'Ship to the per-platform packages',
      done: true,
    },
    { id: 't3', text: 'Conform the web dashboard last', label: 'Conform the web dashboard last', done: false },
  ]);

  const toggle = (id: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="nk-md-demo">
      <style>{STYLES}</style>

      {/* Density toggle: flips the whole prose block's typography */}
      <div className="nk-md-demo__toolbar">
        <p className="nk-md-demo__lbl">Density</p>
        <span className="nk-md-demo__toggle">
          <NockerlSwitch
            checked={density === 'compact'}
            onChange={(next) => setDensity(next ? 'compact' : 'comfortable')}
            ariaLabel="Compact density"
            size="sm"
          />
          <span>{density === 'compact' ? 'Compact · chat' : 'Comfortable · docs'}</span>
        </span>
      </div>

      {/* ONE rendered-markdown document: the full element set, one left edge */}
      <NockerlSurface as="article" className={`nk-md${density === 'compact' ? ' nk-md--compact' : ''}`}>
        <h1>Orchestrating a session</h1>
        <p>
          Nockerl renders assistant replies as <strong>styled prose</strong>, not raw
          text. The same renderer drives <em>chat bubbles</em> and these docs. Bind to a{' '}
          <NockerlLink href="#">type role</NockerlLink>{' '}
          and the whole scale moves together. Mention a tool inline as{' '}
          <code>nockerl session send</code> and it reads as code.
        </p>

        <h2>What it composes</h2>
        <p>
          One prose surface lays out every markdown element on a single left edge with a
          steady vertical rhythm:
        </p>
        <ul>
          <li>
            Headings, paragraphs, <strong>bold</strong> and <em>italic</em> runs
          </li>
          <li>
            Inline <code>code</code> chips and fenced code wells
          </li>
          <li>Lists, blockquotes, tables, rules, and figures</li>
        </ul>

        <h3>Run order</h3>
        <ol>
          <li>Author the component spec on the docs site</li>
          <li>Sign-off lands on the design</li>
          <li>Resolve to tokens and publish</li>
        </ol>

        <h3>Review checklist</h3>
        <ul className="nk-md__tasks">
          {tasks.map((t) => (
            <TaskRow key={t.id} item={t} onToggle={() => toggle(t.id)} />
          ))}
        </ul>

        <blockquote>
          <p>
            The canonical look is sourced from the <strong>Android</strong> and{' '}
            <strong>Voice</strong> apps, never the web dashboard, which is conformed last.
          </p>
        </blockquote>

        <h4>Streaming snippet</h4>
        <div className="nk-md__pre">
          <div className="nk-md__pre-bar">
            <NockerlLanguageBadge language="TypeScript" />
          </div>
          <pre className="nk-md__pre-code">
            <code>
              <span className="t-key">await</span> nockerl.<span className="t-fn">send</span>(
              {'\n'}
              {'  '}<span className="t-str">'project:nockerl-design::primary'</span>,{'\n'}
              {'  '}<span className="t-str">'Pick up the next ticket.'</span>,{'\n'}
              );{'  '}<span className="t-com">// hand work to another session</span>
            </code>
          </pre>
        </div>

        <h4>NockerlSurface mapping</h4>
        <div className="nk-md__table-wrap">
          <table>
            <thead>
              <tr>
                <th>Element</th>
                <th>Type role</th>
                <th>Spacing</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>h1</code>
                </td>
                <td>title / headline</td>
                <td>
                  <span className="t-num">24</span> px above
                </td>
              </tr>
              <tr>
                <td>Paragraph</td>
                <td>body.medium</td>
                <td>
                  <span className="t-num">16</span> px flow
                </td>
              </tr>
              <tr>
                <td>List item</td>
                <td>body.medium</td>
                <td>
                  <span className="t-num">8</span> px gap
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <NockerlDivider />

        <figure>
          <div className="nk-md__img" aria-hidden="true">
            <NockerlIcon>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="8.5" cy="9.5" r="1.6" />
              <path d="m3 17 5-5 4 4 3-3 6 6" />
            </NockerlIcon>
          </div>
          <figcaption>Figure 1: an inline image renders full-width with a muted caption.</figcaption>
        </figure>
      </NockerlSurface>

      <p className="nk-md-demo__count">
        Density: <b>{density}</b> · checklist <b>{doneCount}</b>/{tasks.length} done. Tab to the
        checkboxes, link, and toggle. The island is live.
      </p>
    </div>
  );
}
