// Behavior tests for NockerlButton loading WIDTH STABILITY. The r4 bug: toggling
// `loading` swapped the content (icon+text -> spinner+loadingText), so the button changed
// width and shifted layouts. The fix renders BOTH faces stacked in one grid cell. The
// hidden face reserves its width (visibility, not display), so the button is
// max(resting, loading) wide in every state. happy-dom has no layout engine, so these
// tests assert the reservation MECHANISM (both faces always in the DOM, ghosting by
// visibility class, correct face visible per state); the real-pixel check rides the
// Playwright pass on the spinner demo.
import { test, expect } from 'bun:test';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { NockerlButton, NOCKERL_BUTTON_STYLES } from './Button';

const act = (React as unknown as { act: (cb: () => void) => void }).act;

function mount(node: ReactNode): { host: HTMLElement; root: Root; render: (n: ReactNode) => void; unmount: () => void } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(node));
  return {
    host, root,
    render: (n) => act(() => root.render(n)),
    unmount: () => { act(() => root.unmount()); host.remove(); },
  };
}

const faces = (host: HTMLElement) => [...host.querySelectorAll('.nk-btn__face')] as HTMLElement[];

test('a PLAIN button (no loading opt-in) keeps the original single-face markup', () => {
  const m = mount(<NockerlButton text="Docs" />);
  expect(m.host.querySelector('.nk-btn__stack')).toBeNull();   // no reservation cost at rest
  expect(m.host.querySelector('button')!.textContent).toContain('Docs');
  m.unmount();
});

test('reservation is STICKY: once loading, the stack stays after reverting', () => {
  const m = mount(<NockerlButton text="Send" loading />);
  expect(m.host.querySelector('.nk-btn__stack')).not.toBeNull();
  m.render(<NockerlButton text="Send" />);                     // same mounted instance reverts
  expect(m.host.querySelector('.nk-btn__stack')).not.toBeNull(); // still reserved -> no shift back
  m.unmount();
});

test('BOTH faces render in BOTH states: the hidden one reserves its width', () => {
  const m = mount(<NockerlButton text="Save changes" loadingText="Saving…" />);
  let f = faces(m.host);
  expect(f.length).toBe(2);
  expect(f[0]!.textContent).toContain('Save changes');       // resting face visible
  expect(f[0]!.classList.contains('nk-btn__face--ghost')).toBe(false);
  expect(f[1]!.textContent).toContain('Saving…');            // loading face RESERVED (ghosted)
  expect(f[1]!.classList.contains('nk-btn__face--ghost')).toBe(true);

  m.render(<NockerlButton text="Save changes" loadingText="Saving…" loading />);
  f = faces(m.host);
  expect(f.length).toBe(2);                                   // still both, so geometry stays stable
  expect(f[0]!.classList.contains('nk-btn__face--ghost')).toBe(true);
  expect(f[1]!.classList.contains('nk-btn__face--ghost')).toBe(false);
  m.unmount();
});

test('ghosting is visibility-based (keeps layout), never display:none', () => {
  const ghostRule = NOCKERL_BUTTON_STYLES.split('.nk-btn__face--ghost {')[1]?.split('}')[0] ?? '';
  expect(ghostRule).toContain('visibility: hidden');
  expect(ghostRule).not.toContain('display');
});

test('the loading face carries the spinner + loadingText (falls back to text)', () => {
  const m = mount(<NockerlButton text="Send" loading />);
  const loadingFace = faces(m.host)[1]!;
  expect(loadingFace.querySelector('.nk-btn__spin')).not.toBeNull();
  expect(loadingFace.textContent).toContain('Send');          // no loadingText -> same label
  m.unmount();
});

test('a11y: aria-busy while loading; the ghosted face is aria-hidden; re-click blocked', () => {
  let clicks = 0;
  const m = mount(<NockerlButton text="Save" loadingText="Saving…" loading onClick={() => { clicks += 1; }} />);
  const btn = m.host.querySelector('button')!;
  expect(btn.getAttribute('aria-busy')).toBe('true');
  expect(btn.disabled).toBe(true);
  const f = faces(m.host);
  expect(f[0]!.getAttribute('aria-hidden')).toBe('true');     // resting face hidden from AT
  expect(f[1]!.hasAttribute('aria-hidden')).toBe(false);      // loading face is the name
  act(() => { btn.click(); });
  expect(clicks).toBe(0);
  m.unmount();
});

test('icons live on the resting face only; both compositions stay reserved with icons', () => {
  const icon = <svg data-t="i" />;
  const m = mount(<NockerlButton text="Send" leadingIcon={icon} trailingIcon={icon} loadingText="Sending…" />);
  const f = faces(m.host);
  expect(f[0]!.querySelectorAll('.nk-btn__icon').length).toBe(2);   // leading + trailing
  expect(f[1]!.querySelectorAll('.nk-btn__icon').length).toBe(1);   // the spinner box
  m.unmount();
});
