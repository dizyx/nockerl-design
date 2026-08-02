/**
 * CodePanelDemo: the live island for the dev-console CODE PANEL (WS5 · task 2656).
 * A real CodeMirror 6 editor themed ENTIRELY by design tokens (the liftable
 * `nockerlCodeMirrorTheme` in _codeMirrorTheme.ts, with zero hardcoded hues and both
 * themes free), inside panel chrome that reuses the code-block HEADER GRAMMAR verbatim:
 * the hue-free NockerlLanguageBadge + the shared CopyButton (copying the LIVE document).
 *
 * The editor ground is a recessed well (fields sink); the caret/selection ride the
 * accent; the syntax ramp mirrors the CodeBlock canon exactly (one code voice,
 * read-only or editable). Web-only by scope: the design deliverable for the dashboard
 * is the THEME + this chrome.
 */
import { useEffect, useRef, useState } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { nockerlCodeMirrorTheme } from './_codeMirrorTheme';
import CopyButton from './_CopyButton';
import { NockerlLanguageBadge } from '@dizyx/nockerl-react';

const STYLES = `
.nk-cp-demo { font-family: var(--font-family-sans); }
.nk-cp-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
/* the PANEL follows the code-block frame grammar: hairline, panel radius, recessed body */
.nk-cp { border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-panel);
  overflow: hidden; background: var(--color-card-surface2);
  box-shadow: inset 0 var(--space-px) var(--space-0-5) color-mix(in srgb, var(--color-shadow-tint) 30%, transparent); }
/* header: VERBATIM the code-block bar grammar, a raised strip with the language tag left, copy right */
.nk-cp__bar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2);
  background: var(--color-card-surface3); border-bottom: var(--space-px) solid var(--color-card-hairline); }
.nk-cp__name { flex: 1 1 auto; min-width: 0; font-family: var(--font-family-mono); font-size: var(--font-size-10);
  color: var(--color-on-card-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* the editor host: CM paints itself via the token theme; cap + scroll inside */
.nk-cp__editor .cm-editor { max-height: var(--size-container-md); }
.nk-cp__editor .cm-scroller { overflow: auto; }
/* the panel owns focus: an inner accent outline when the editor is focused */
.nk-cp:has(.cm-focused) { outline: var(--space-0-5) solid color-mix(in srgb, var(--color-accent-primary) 55%, transparent); outline-offset: calc(var(--space-0-5) * -1); }
.nk-cp-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-cp-demo__count b { color: var(--color-accent-primary); }
`;

const SEED = [
  "// The console's code panel: CodeMirror 6, themed by tokens.",
  "import { NockerlChatInput } from '@dizyx/nockerl-react';",
  '',
  'export function send(draft: string): number {',
  "  const trimmed = draft.trim();",
  '  if (!trimmed) return 0;',
  '  return gateway.post({ body: trimmed, retries: 3 });',
  '}',
].join('\n');

// (No compose contract: demo-canonical; the chrome composes NockerlLanguageBadge + the
// shared CopyButton, and CodeMirror owns its own editor DOM.)

export default function CodePanelDemo() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [lines, setLines] = useState(SEED.split('\n').length);
  const [chars, setChars] = useState(SEED.length);

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: SEED,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          javascript({ typescript: true }),
          nockerlCodeMirrorTheme(),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              setLines(u.state.doc.lines);
              setChars(u.state.doc.length);
            }
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  return (
    <div className="nk-cp-demo">
      <style>{STYLES}</style>
      <p className="nk-cp-demo__lbl">A live editor: token-themed CodeMirror in the code-block frame (type in it)</p>
      <div className="nk-cp">
        <div className="nk-cp__bar">
          <span className="nk-cp__name">send.ts</span>
          <NockerlLanguageBadge language="TypeScript" />
          <CopyButton text={() => viewRef.current?.state.doc.toString() ?? ''} label="Copy code" copiedLabel="Copied to clipboard" />
        </div>
        <div className="nk-cp__editor" ref={hostRef} />
      </div>
      <p className="nk-cp-demo__count">
        <b>{lines}</b> lines · <b>{chars}</b> chars. The ramp mirrors the CodeBlock canon (keywords, strings,
        numbers, comments), selection is the sanctioned soft wash, and the whole theme is var(--token)-driven.
        The island is live.
      </p>
    </div>
  );
}
