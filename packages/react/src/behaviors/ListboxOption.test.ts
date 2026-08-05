// Unit tests for listboxRun, the pure contiguous-run mapper that decides where a
// selected row sits inside a run of selected rows (so touching corners square off).
// Pure: (prevSelected, nextSelected) -> run position, no side effects.
import { test, expect } from 'bun:test';
import { listboxRun, type ListboxOptionRun } from './ListboxOption.js';

test('a lone selected row (no selected neighbors) is "single"', () => {
  expect(listboxRun(false, false)).toBe('single');
});

test('first of a run (only next selected) is "top"', () => {
  expect(listboxRun(false, true)).toBe('top');
});

test('last of a run (only prev selected) is "bottom"', () => {
  expect(listboxRun(true, false)).toBe('bottom');
});

test('interior of a run (both neighbors selected) is "middle"', () => {
  expect(listboxRun(true, true)).toBe('middle');
});

test('covers the full 2x2 truth table exactly once', () => {
  const table: Array<[boolean, boolean, ListboxOptionRun]> = [
    [false, false, 'single'],
    [false, true, 'top'],
    [true, false, 'bottom'],
    [true, true, 'middle'],
  ];
  for (const [prev, next, expected] of table) {
    expect(listboxRun(prev, next)).toBe(expected);
  }
});
