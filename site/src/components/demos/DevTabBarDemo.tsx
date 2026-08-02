/**
 * DevTabBarDemo: the live island for the dev-console TAB BAR (WS5 · task 2656).
 *
 * Deliberately NOT a new component. The editor tab bar IS the shipped NockerlTabs
 * composite extended with the dev-tab affordances (the R5-4 extend-never-fork rule):
 * `onClose` (closable tabs, a pointer X + the ARIA deletable-tabs Delete key) and
 * per-tab `dirty` (the unsaved dot, yielding to the X on hover). Overflow rides Tabs'
 * own scroll + edge-fade idiom, so opening enough files scrolls the strip with fades.
 *
 * The demo runs a real editor-ish flow: files open as tabs (dirty ones dotted), the X
 * or Delete closes one (selection hops to a neighbor, the controlled-host contract),
 * and a Reopen button restores the stack. TOKEN-REACTIVE demo chrome.
 */
import { useState } from 'react';
import { NockerlButton, NockerlIcon, NockerlTabs, type TabItemDef } from '@dizyx/nockerl-react';

const STYLES = `
.nk-dtb-demo { font-family: var(--font-family-sans); }
.nk-dtb-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-dtb-demo__bar { margin-bottom: var(--space-4); }
.nk-dtb-demo__code { margin: 0; font-family: var(--font-family-mono); font-size: var(--font-size-12);
  line-height: var(--font-line-height-20); color: var(--color-on-card-muted); white-space: pre; }
.nk-dtb-demo__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-dtb-demo__count b { color: var(--color-accent-primary); }
`;

const IconFile = (
  <NockerlIcon>
    <path d="M14 3v5h5" />
    <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
  </NockerlIcon>
);

interface FileTab {
  value: string;
  label: string;
  dirty: boolean;
  body: string;
}

const FILES: FileTab[] = [
  { value: 'chat-input', label: 'ChatInput.tsx', dirty: true, body: 'export function NockerlChatInput() {\n  // the floating pill\n}' },
  { value: 'tabs', label: 'Tabs.tsx', dirty: false, body: 'export function NockerlTabs() {\n  // closable + dirty (task 2656)\n}' },
  { value: 'tokens', label: 'tokens.css', dirty: true, body: ':root {\n  --color-accent-primary: #0cc0df;\n}' },
  { value: 'catalog', label: 'component-catalog.md', dirty: false, body: '# Nockerl Component Catalog' },
  { value: 'gateway', label: 'gateway.ts', dirty: false, body: 'export const gateway = createGateway();' },
  { value: 'agents', label: 'AGENTS.md', dirty: false, body: '# Nockerl Platform' },
];

// (No compose contract: the demo purely CONSUMES the shipped NockerlTabs.)

export default function DevTabBarDemo() {
  const [open, setOpen] = useState<FileTab[]>(FILES);
  const [active, setActive] = useState('chat-input');
  const [closed, setClosed] = useState(0);

  const close = (value: string) => {
    setOpen((prev) => {
      const idx = prev.findIndex((f) => f.value === value);
      const next = prev.filter((f) => f.value !== value);
      // the controlled-host contract: selection hops to the nearest surviving neighbor
      if (value === active && next.length > 0) {
        setActive(next[Math.min(idx, next.length - 1)]!.value);
      }
      return next;
    });
    setClosed((c) => c + 1);
  };

  const tabs: TabItemDef[] = open.map((f) => ({
    value: f.value,
    label: f.label,
    icon: IconFile,
    dirty: f.dirty,
    panel: <pre className="nk-dtb-demo__code">{f.body}</pre>,
  }));

  return (
    <div className="nk-dtb-demo">
      <style>{STYLES}</style>
      <p className="nk-dtb-demo__lbl">
        Editor tabs: dirty dots yield to the close X on hover · Delete closes the focused tab · overflow fades
      </p>
      <div className="nk-dtb-demo__bar">
        {open.length > 0 ? (
          <NockerlTabs label="Open files" size="sm" tabs={tabs} value={active} onChange={setActive} onClose={close} />
        ) : (
          <NockerlButton text="Reopen all files" variant="secondary" size="sm" onClick={() => { setOpen(FILES); setActive(FILES[0]!.value); }} />
        )}
      </div>
      <p className="nk-dtb-demo__count">
        Closed <b>{closed}</b> {closed === 1 ? 'tab' : 'tabs'} · <b>{open.length}</b> open. The X is pointer-only;
        keyboard users press <b>Delete</b> on a focused tab (the ARIA deletable-tabs pattern). The island is live.
      </p>
    </div>
  );
}
