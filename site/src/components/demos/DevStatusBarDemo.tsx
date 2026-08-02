/**
 * DevStatusBarDemo: the live island for the shipped NockerlDevStatusBar (WS5 · task 2656).
 * A faux console viewport proves the seat: content above, the thin strip pinned to the
 * bottom edge. Segments show the grammar: informational spans (branch, position),
 * status-dotted state (agent streaming), and interactive keys (problems, the palette
 * hint with a real Kbd cap). Click the interactive ones; the island counts.
 * TOKEN-REACTIVE demo chrome; the bar itself ships from @dizyx/nockerl-react.
 */
import { useState } from 'react';
import { NockerlDevStatusBar, NockerlDevStatusSegment, NockerlIcon } from '@dizyx/nockerl-react';

const STYLES = `
.nk-dsb-demo { font-family: var(--font-family-sans); }
/* the faux console viewport the strip seats against */
.nk-dsb-demo__frame { border-radius: var(--radius-card); overflow: hidden;
  border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: inset 0 var(--space-px) 0 var(--color-surface-highlight); }
.nk-dsb-demo__body { height: calc(var(--space-16) * 2); background: var(--color-canvas-alt);
  display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); }
.nk-dsb-demo__line { height: var(--space-3); border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-on-canvas) 6%, transparent); }
.nk-dsb-demo__line--w60 { width: 60%; } .nk-dsb-demo__line--w80 { width: 80%; } .nk-dsb-demo__line--w45 { width: 45%; }
.nk-dsb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-dsb-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-dsb-demo__count b { color: var(--color-accent-primary); }
`;

const IconBranch = (
  <NockerlIcon>
    <circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="7" r="2" />
    <path d="M6 7v10M18 9a6 6 0 0 1-6 6H8" />
  </NockerlIcon>
);
const IconWarn = <NockerlIcon path="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01" />;

// (No compose contract: the demo purely CONSUMES the shipped NockerlDevStatusBar.)

export default function DevStatusBarDemo() {
  const [picks, setPicks] = useState(0);
  const [last, setLast] = useState('nothing yet');
  const pick = (what: string) => { setPicks((c) => c + 1); setLast(what); };

  return (
    <div className="nk-dsb-demo">
      <style>{STYLES}</style>
      <p className="nk-dsb-demo__lbl">Pinned to the console bottom: quiet segments, opt-in interactivity</p>
      <div className="nk-dsb-demo__frame">
        <div className="nk-dsb-demo__body" aria-hidden="true">
          <div className="nk-dsb-demo__line nk-dsb-demo__line--w60" />
          <div className="nk-dsb-demo__line nk-dsb-demo__line--w80" />
          <div className="nk-dsb-demo__line nk-dsb-demo__line--w45" />
        </div>
        <NockerlDevStatusBar
          start={
            <>
              <NockerlDevStatusSegment icon={IconBranch} label="main" onSelect={() => pick('branch')} />
              <NockerlDevStatusSegment icon={IconWarn} label="0 problems" onSelect={() => pick('problems')} />
              <NockerlDevStatusSegment dot="info" label="agent · streaming" />
            </>
          }
          end={
            <>
              <NockerlDevStatusSegment label="Ln 42, Col 7" />
              <NockerlDevStatusSegment label="UTF-8" />
              <NockerlDevStatusSegment label="Palette" kbd={['⌘', 'K']} onSelect={() => pick('palette')} />
            </>
          }
        />
      </div>
      <p className="nk-dsb-demo__count">
        Picked <b>{last}</b> · <b>{picks}</b> {picks === 1 ? 'click' : 'clicks'}. Dotted state is informational,
        keys are real buttons. The island is live.
      </p>
    </div>
  );
}
