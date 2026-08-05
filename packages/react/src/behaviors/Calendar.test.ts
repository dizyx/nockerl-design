// Unit tests for the pure calendar date helpers exported from NockerlCalendar.tsx.
// These are side-effect-free + deterministic (no Date.now / random; every Date is
// constructed from explicit Y/M/D), so they pin the exact month-grid math both date
// pickers depend on. Imported via the real module path (the same barrel surface).
import { test, expect } from 'bun:test';
import {
  addDays,
  addMonths,
  buildGrid,
  fromDay,
  key,
  monIndex,
  sameDay,
  toDay,
  type Day,
} from './Calendar.js';

test('key packs Y/M/D into a sortable YYYYMMDD integer', () => {
  expect(key({ y: 2026, m: 5, d: 15 })).toBe(20260515);
  expect(key({ y: 2026, m: 0, d: 1 })).toBe(20260001);
  // ordering: earlier day < later day within and across fields
  expect(key({ y: 2025, m: 11, d: 31 })).toBeLessThan(key({ y: 2026, m: 0, d: 1 }));
  expect(key({ y: 2026, m: 0, d: 1 })).toBeLessThan(key({ y: 2026, m: 0, d: 2 }));
});

test('toDay reads Y/M/D off a native Date (month 0-indexed)', () => {
  expect(toDay(new Date(2026, 5, 15))).toEqual({ y: 2026, m: 5, d: 15 });
  expect(toDay(new Date(2024, 0, 1))).toEqual({ y: 2024, m: 0, d: 1 });
});

test('fromDay -> toDay round-trips a Day unchanged', () => {
  const d: Day = { y: 2026, m: 5, d: 15 };
  expect(toDay(fromDay(d))).toEqual(d);
  const edge: Day = { y: 2027, m: 11, d: 31 };
  expect(toDay(fromDay(edge))).toEqual(edge);
});

test('sameDay is true only for two equal, non-null days', () => {
  expect(sameDay({ y: 2026, m: 0, d: 1 }, { y: 2026, m: 0, d: 1 })).toBe(true);
  expect(sameDay({ y: 2026, m: 0, d: 1 }, { y: 2026, m: 0, d: 2 })).toBe(false);
  expect(sameDay({ y: 2026, m: 0, d: 1 }, { y: 2026, m: 1, d: 1 })).toBe(false);
});

test('sameDay guards null / undefined on either side', () => {
  const d: Day = { y: 2026, m: 0, d: 1 };
  expect(sameDay(null, d)).toBe(false);
  expect(sameDay(d, null)).toBe(false);
  expect(sameDay(undefined, d)).toBe(false);
  expect(sameDay(d, undefined)).toBe(false);
  expect(sameDay(null, null)).toBe(false);
});

test('addDays offsets within a month', () => {
  expect(addDays({ y: 2026, m: 5, d: 15 }, 1)).toEqual({ y: 2026, m: 5, d: 16 });
  expect(addDays({ y: 2026, m: 5, d: 15 }, -1)).toEqual({ y: 2026, m: 5, d: 14 });
  expect(addDays({ y: 2026, m: 5, d: 15 }, 0)).toEqual({ y: 2026, m: 5, d: 15 });
});

test('addDays rolls over month + year boundaries', () => {
  // Jan 31 + 1 -> Feb 1
  expect(addDays({ y: 2026, m: 0, d: 31 }, 1)).toEqual({ y: 2026, m: 1, d: 1 });
  // Mar 1 - 1 -> Feb 28 (2026 is not a leap year)
  expect(addDays({ y: 2026, m: 2, d: 1 }, -1)).toEqual({ y: 2026, m: 1, d: 28 });
  // Dec 31 + 1 -> Jan 1 next year
  expect(addDays({ y: 2026, m: 11, d: 31 }, 1)).toEqual({ y: 2027, m: 0, d: 1 });
  // Jan 1 - 1 -> Dec 31 prev year
  expect(addDays({ y: 2026, m: 0, d: 1 }, -1)).toEqual({ y: 2025, m: 11, d: 31 });
});

test('addDays handles a leap-year Feb 29', () => {
  // 2028 is a leap year: Feb 28 + 1 -> Feb 29
  expect(addDays({ y: 2028, m: 1, d: 28 }, 1)).toEqual({ y: 2028, m: 1, d: 29 });
  expect(addDays({ y: 2028, m: 1, d: 29 }, 1)).toEqual({ y: 2028, m: 2, d: 1 });
});

test('addMonths offsets a {y,m} within the year', () => {
  expect(addMonths(2026, 0, 1)).toEqual({ y: 2026, m: 1 });
  expect(addMonths(2026, 5, 2)).toEqual({ y: 2026, m: 7 });
  expect(addMonths(2026, 5, 0)).toEqual({ y: 2026, m: 5 });
});

test('addMonths wraps forward + backward across years', () => {
  expect(addMonths(2026, 11, 1)).toEqual({ y: 2027, m: 0 });
  expect(addMonths(2026, 0, -1)).toEqual({ y: 2025, m: 11 });
  // multi-year spans
  expect(addMonths(2026, 5, 24)).toEqual({ y: 2028, m: 5 });
  expect(addMonths(2026, 0, -13)).toEqual({ y: 2024, m: 11 });
});

test('monIndex is Mon-first (0=Mon .. 6=Sun)', () => {
  // Jan 1 2026 is a Thursday -> index 3
  expect(monIndex(new Date(2026, 0, 1))).toBe(3);
  // Jun 1 2026 is a Monday -> index 0
  expect(monIndex(new Date(2026, 5, 1))).toBe(0);
  // Jun 7 2026 is a Sunday -> index 6
  expect(monIndex(new Date(2026, 5, 7))).toBe(6);
});

test('buildGrid always returns a 42-cell (6x7) matrix', () => {
  expect(buildGrid(2026, 5)).toHaveLength(42);
  expect(buildGrid(2026, 0)).toHaveLength(42);
  expect(buildGrid(2024, 1)).toHaveLength(42);
});

test('buildGrid starts on the Monday of the first row', () => {
  // June 2026: Jun 1 is a Monday (monIndex 0) -> grid[0] is Jun 1 itself
  const june = buildGrid(2026, 5);
  expect(june[0]).toEqual({ y: 2026, m: 5, d: 1 });
  // last cell = grid[0] + 41 days
  expect(june[41]).toEqual({ y: 2026, m: 6, d: 12 });
});

test('buildGrid pads leading days from the previous month', () => {
  // January 2026: Jan 1 is a Thursday (monIndex 3) -> 3 leading Dec 2025 days
  const jan = buildGrid(2026, 0);
  expect(jan[0]).toEqual({ y: 2025, m: 11, d: 29 });
  expect(jan[1]).toEqual({ y: 2025, m: 11, d: 30 });
  expect(jan[2]).toEqual({ y: 2025, m: 11, d: 31 });
  expect(jan[3]).toEqual({ y: 2026, m: 0, d: 1 });
});

test('buildGrid cells are contiguous single-day steps', () => {
  const grid = buildGrid(2026, 5);
  for (let i = 1; i < grid.length; i++) {
    expect(grid[i]).toEqual(addDays(grid[i - 1]!, 1));
  }
});
