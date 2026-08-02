// Unit tests for the pure NockerlGauge band model: gaugeBand (ratio -> band) + the
// GAUGE_BAND_WORD lookup. These encode the shipped SessionChipsBar thresholds
// (< .60 safe · < .85 warning · >= .85 critical). Pure + deterministic.
import { test, expect } from 'bun:test';
import {
  GAUGE_BAND_WORD,
  GAUGE_HIGH,
  GAUGE_LOW,
  gaugeBand,
  type GaugeBand,
} from './Gauge';

test('default thresholds match the SessionChipsBar constants', () => {
  expect(GAUGE_LOW).toBe(0.6);
  expect(GAUGE_HIGH).toBe(0.85);
});

test('gaugeBand: safe below the low threshold', () => {
  expect(gaugeBand(0)).toBe('safe');
  expect(gaugeBand(0.3)).toBe('safe');
  expect(gaugeBand(0.59)).toBe('safe');
});

test('gaugeBand: warning in [low, high)', () => {
  expect(gaugeBand(0.6)).toBe('warning'); // low boundary is inclusive of warning
  expect(gaugeBand(0.7)).toBe('warning');
  expect(gaugeBand(0.84)).toBe('warning');
});

test('gaugeBand: critical at/above the high threshold', () => {
  expect(gaugeBand(0.85)).toBe('critical'); // high boundary is inclusive of critical
  expect(gaugeBand(0.99)).toBe('critical');
  expect(gaugeBand(1)).toBe('critical');
});

test('gaugeBand: exact boundary values land in the higher band', () => {
  // >= is the operator, so the boundary belongs to the more-severe band.
  expect(gaugeBand(GAUGE_LOW)).toBe('warning');
  expect(gaugeBand(GAUGE_HIGH)).toBe('critical');
});

test('gaugeBand: handles out-of-[0,1] ratios by threshold alone', () => {
  expect(gaugeBand(-0.5)).toBe('safe');
  expect(gaugeBand(1.5)).toBe('critical');
});

test('gaugeBand: honors custom low/high thresholds', () => {
  expect(gaugeBand(0.5, 0.4, 0.7)).toBe('warning');
  expect(gaugeBand(0.3, 0.4, 0.7)).toBe('safe');
  expect(gaugeBand(0.7, 0.4, 0.7)).toBe('critical');
});

test('GAUGE_BAND_WORD maps each band to its human word', () => {
  expect(GAUGE_BAND_WORD.safe).toBe('healthy');
  expect(GAUGE_BAND_WORD.warning).toBe('elevated');
  expect(GAUGE_BAND_WORD.critical).toBe('critical');
});

test('every band produced by gaugeBand has a word', () => {
  const bands: GaugeBand[] = [gaugeBand(0.1), gaugeBand(0.7), gaugeBand(0.95)];
  for (const b of bands) {
    expect(GAUGE_BAND_WORD[b]).toBeTruthy();
  }
});
