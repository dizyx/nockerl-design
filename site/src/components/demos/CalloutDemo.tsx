/**
 * CalloutDemo: the live island for the shipped NockerlCallout.
 *
 * The component itself now lives in the published package
 * (packages/react/src/composites/Callout.tsx) and is consumed here exactly as a client
 * would consume it. This file is demo scaffolding only: the tone gallery, the faux body
 * copy the callouts sit inside, and a counter proving the in-callout links stay
 * keyboard-operable.
 *
 * TOKEN-REACTIVE demo chrome; the callout anatomy is the package's.
 */
import { useState } from 'react';
import { NockerlCallout } from '@dizyx/nockerl-react';

const STYLES = `
.nk-co-demo { font-family: var(--font-family-sans); display: flex; flex-direction: column; gap: var(--space-6); max-width: 620px; }
.nk-co-demo__group { display: flex; flex-direction: column; gap: var(--space-4); }
.nk-co-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0; }
/* faux body copy around a callout, proving the embedded-in-content feel */
.nk-co-demo__prose { color: var(--color-on-canvas-muted); font-size: var(--font-size-14);
  line-height: var(--font-line-height-20); margin: 0; }
`;

/**
 * The interactive showcase mounted on the Callout page: every tone (note / tip /
 * important / warning / caution / notice / quote). NORMAL tones lead with the filled disc;
 * `important` shows the nested-hairline-frame emphasis. Each carries a focusable
 * link + inline code, set INSIDE faux body copy so the recessed, part-of-the-prose
 * treatment is visible against real text. A live counter proves the in-callout
 * links are keyboard-operable.
 */
export default function CalloutDemo() {
  const [linkClicks, setLinkClicks] = useState(0);
  const bump = (e: React.MouseEvent) => {
    e.preventDefault();
    setLinkClicks((c) => c + 1);
  };

  return (
    <div className="nk-co-demo">
      <style>{STYLES}</style>

      <div className="nk-co-demo__group">
        <p className="nk-co-demo__lbl">Embedded in content: tab to a link, persistent (no dismiss)</p>
        <p className="nk-co-demo__prose">
          Sessions stream over SSE and reconnect with backoff. The callout below sits in the prose
          like any other paragraph, and it stays put.
        </p>
        <NockerlCallout tone="note">
          {
            'Tokens are the source of truth: bind to <code>--color-accent-primary</code> rather than a literal. See the <a href="#">token contract</a> for the full vocabulary.'
          }
        </NockerlCallout>
        <p className="nk-co-demo__prose">
          Because it is part of the document flow, a callout never floats over the layout and is
          never dismissed.
        </p>
      </div>

      <div className="nk-co-demo__group">
        <p className="nk-co-demo__lbl">Tones: a filled disc + text, never color alone</p>
        <NockerlCallout tone="tip">
          {
            'Press <code>⌘K</code> to jump to any session. You can also pin a session from the <a href="#">picker</a> to keep it at the top.'
          }
        </NockerlCallout>
        <NockerlCallout tone="warning">
          {
            'Running <code>nockerl git push</code> squashes local commits into one. Pass <a href="#"><code>--preserve-commits</code></a> to keep each commit separate.'
          }
        </NockerlCallout>
        <NockerlCallout tone="caution">
          {
            '<code>DELETE</code> operations are not proxied by the credential store. Destructive actions bypass the allowlist and <strong>cannot be undone</strong>. Confirm first.'
          }
        </NockerlCallout>
      </div>

      <div className="nk-co-demo__group">
        <p className="nk-co-demo__lbl">Notice: the rare warm accent (orange), a special heads-up (not a status)</p>
        <NockerlCallout tone="notice">
          {
            'Special notice: <strong>agent spawning</strong> is now live. This warm orange accent is reserved for featured, seasonal, or heads-up announcements. See the <a href="#">design laws</a>.'
          }
        </NockerlCallout>
      </div>

      <div className="nk-co-demo__group">
        <p className="nk-co-demo__lbl">Important, the reserved emphasis: nested hairline frames</p>
        <NockerlCallout tone="important">
          {
            'Cyan is the <strong>one</strong> editorial-emphasis tone. Reserve <code>important</code> for the thing a reader must not miss. See the <a href="#">design laws</a>.'
          }
        </NockerlCallout>
      </div>

      <div className="nk-co-demo__group">
        <p className="nk-co-demo__lbl">Quote: an editorial pull-quote (italic, quietest, no disc)</p>
        <NockerlCallout tone="quote">
          {
            '<p>Bounded autonomy: autonomy calibrated by task risk. Human-in-the-loop for judgment, AI for speed-to-next-decision.</p><p class="nk-co__cite">Nockerl design principles</p>'
          }
        </NockerlCallout>
      </div>

      <div className="nk-co-demo__group">
        <p className="nk-co-demo__lbl">Custom eyebrow + icon off, still persistent prose</p>
        <NockerlCallout tone="tip" title="Pro tip" icon={false}>
          {
            'Demos consume <code>var(--token)</code> for every value, so changing one token in <a href="#">tokens.css</a> re-skins the whole page at once.'
          }
        </NockerlCallout>
      </div>

      {/* Capture link activations from the callout(s) in this group to drive the
          live counter, proving the embedded links are interactive + keyboard
          operable without each demo Callout needing its own handler. */}
      <div
        className="nk-co-demo__group"
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest('a')) bump(e);
        }}
      >
        <p className="nk-co-demo__lbl">Live: tab to the link, Enter / click (the island is live)</p>
        <NockerlCallout tone="important" title="Try it">
          {
            'Tab to this <a href="#">link</a> and press Enter, or click it. NockerlLink fired <strong>' +
            linkClicks +
            '</strong> ' +
            (linkClicks === 1 ? 'time' : 'times') +
            '. It stays here, persistent in the prose.'
          }
        </NockerlCallout>
      </div>
    </div>
  );
}
