/**
 * TextAreaDemo: the live, interactive Nockerl multi-line text area for the web.
 *
 * Same input laws as the text field, since it is the multi-line member of the family:
 *   • fields SINK: a recessed well (darker inset surface + INNER shadow), never
 *     raised and never a colored glow
 *   • 12px control radius: a rounded rectangle, never a pill
 *   • persistent label above the well; helper / error text + char counter below
 *   • focus is an OUTLINE (focus-visible cyan ring), never a colored shadow/glow
 *   • error = red border + helper text + ⚠ icon (color is NEVER the only signal)
 *   • the counter turns to the error color and the well goes red when over the cap
 *   • auto-grow: the textarea grows with its content up to maxRows, then scrolls
 *
 * The area itself lives in the Field primitive (one home for the recipe); this
 * island only adds the demo chrome and dogfoods <NockerlTextArea /> exactly as a
 * consumer would.
 */
import { useState } from 'react';
import { NockerlTextArea, type ComposeContract } from '@dizyx/nockerl-react';

// Demo-only chrome: the island wrapper, the eyebrow labels, and the group
// spacing. The area recipe itself ships from the Field primitive.
const STYLES = `
.nk-area-demo { font-family: var(--font-family-sans); max-width: 460px; }
.nk-area-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }
.nk-area-demo__group + .nk-area-demo__group { margin-top: var(--space-8); }
`;

/**
 * The interactive showcase mounted on the Text area page: a live multi-line well
 * with a character counter (type past the cap to see it turn red + the well go to
 * the error treatment), plus filled / disabled / read-only examples. All are
 * recessed, none glowing.
 */
/** LEAF: the multi-line text field; implemented in Field.tsx (which owns <textarea>). */
export const compose = { tier: 'leaf', owns: ['textarea'] } satisfies ComposeContract;

export default function TextAreaDemo() {
  const [prompt, setPrompt] = useState(
    'Summarize the open PRs in dizyx/nockerl and flag any that have failing CI.',
  );
  const [note, setNote] = useState('');

  return (
    <div className="nk-area-demo">
      <style>{STYLES}</style>

      <div className="nk-area-demo__group">
        <p className="nk-area-demo__lbl">Interactive: type, watch the counter</p>
        <NockerlTextArea
          label="Task instructions"
          value={prompt}
          onChange={setPrompt}
          placeholder="Describe what the agent should do…"
          helperText="The agent runs with these instructions."
          maxLength={140}
        />
        <NockerlTextArea
          label="Notes"
          value={note}
          onChange={setNote}
          placeholder="Anything else to remember?"
          helperText="Auto-grows as you type, up to 8 rows."
          minRows={2}
        />
      </div>

      <div className="nk-area-demo__group">
        <p className="nk-area-demo__lbl">States: disabled, read-only</p>
        <NockerlTextArea
          label="Disabled"
          value="Locked while the run is in progress."
          disabled
          minRows={2}
          helperText="Inert, but still readable."
        />
        <NockerlTextArea
          label="Read-only"
          value={'Generated changelog\n- Added text field + text area docs\n- Recessed well treatment'}
          readOnly
          minRows={3}
          helperText="Value you can select but not change."
        />
      </div>
    </div>
  );
}
