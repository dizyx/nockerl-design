// Unit tests for sparkPath, the pure own-min/max polyline builder (the Android
// NockerlSparkline algorithm verbatim). Given a series + box + pad it returns the SVG path
// `d` and the `last` point for the trailing dot. Pure + deterministic geometry.
import { test, expect } from 'bun:test';
import { sparkPath } from './Sparkline';

test('maps an ascending series across the padded box', () => {
  // 64x22 box, pad 1 -> innerW 62, innerH 20. min 0 / max 10 span the full height.
  const { d, last } = sparkPath([0, 5, 10], 64, 22, 1);
  expect(d).toBe('M 1.0 21.0 L 32.0 11.0 L 63.0 1.0');
  // last point is the max -> top of the box (y = pad = 1), right edge (x = w - pad = 63).
  expect(last).toEqual([63, 1]);
});

test('inverts y: the max sits at the TOP (small y), the min at the bottom', () => {
  // descending [10,0]: first point is the max (top), last is the min (bottom).
  const { d, last } = sparkPath([10, 0], 64, 22, 3);
  expect(d).toBe('M 3.0 3.0 L 61.0 19.0');
  expect(last).toEqual([61, 19]);
});

test('a flat series pins every point to the baseline (range falls back to 1)', () => {
  // all-equal values -> (v-min)/range is 0 everywhere -> y = pad + innerH = 21.
  const { d, last } = sparkPath([5, 5, 5], 64, 22, 1);
  expect(d).toBe('M 1.0 21.0 L 32.0 21.0 L 63.0 21.0');
  expect(last).toEqual([63, 21]);
});

test('a single point emits one M command at the left edge', () => {
  // one datum -> step divisor (length-1 || 1) = 1, x stays at pad; flat -> baseline y.
  const { d, last } = sparkPath([7], 64, 22, 1);
  expect(d).toBe('M 1.0 21.0');
  expect(last).toEqual([1, 21]);
});

test('an empty series yields an empty path', () => {
  const { d } = sparkPath([], 64, 22, 1);
  expect(d).toBe('');
});

test('respects pad as a coordinate inset on both axes', () => {
  // StatCard uses pad 1, the chart tiles use pad 3, same data, different inset.
  const p1 = sparkPath([0, 10], 64, 22, 1);
  const p3 = sparkPath([0, 10], 64, 22, 3);
  expect(p1.last).toEqual([63, 1]);
  expect(p3.last).toEqual([61, 3]);
});

test('coordinates are fixed to one decimal place', () => {
  // odd point count over a non-divisible width -> fractional x, rounded to .1
  const { d } = sparkPath([3, 1, 4, 1, 5], 64, 22, 1);
  expect(d).toBe('M 1.0 11.0 L 16.5 21.0 L 32.0 6.0 L 47.5 21.0 L 63.0 1.0');
});

test('the first command is always M and the rest are L', () => {
  const { d } = sparkPath([1, 2, 3, 4], 100, 40, 2);
  const cmds = d.split(' ').filter((t) => t === 'M' || t === 'L');
  expect(cmds[0]).toBe('M');
  expect(cmds.slice(1).every((c) => c === 'L')).toBe(true);
  expect(cmds).toHaveLength(4);
});
