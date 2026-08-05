// Unit tests for fmt, the pure value formatter (mirrors Android formatValue): the
// displayed precision is derived from the STEP, not the value. Pure + deterministic.
import { test, expect } from 'bun:test';
import { fmt } from './Slider.js';

test('integer steps (>=1) drop all decimals and round', () => {
  expect(fmt(3, 1)).toBe('3');
  expect(fmt(1.6, 1)).toBe('2'); // rounds
  expect(fmt(0, 1)).toBe('0');
  expect(fmt(200, 5)).toBe('200');
});

test('tenths steps (>=0.1) fix to one decimal', () => {
  expect(fmt(0.5, 0.1)).toBe('0.5');
  expect(fmt(1.05, 0.1)).toBe('1.1'); // rounds at the last place
  expect(fmt(2, 0.1)).toBe('2.0'); // pads a trailing zero
});

test('hundredths steps (>=0.01) fix to two decimals', () => {
  expect(fmt(0.55, 0.05)).toBe('0.55');
  expect(fmt(0.7, 0.01)).toBe('0.70'); // pads
  expect(fmt(2, 0.05)).toBe('2.00');
});

test('finer steps (<0.01) fix to three decimals', () => {
  expect(fmt(0.1234, 0.001)).toBe('0.123');
  expect(fmt(1, 0.005)).toBe('1.000');
});

test('formats negative values with the step-derived precision', () => {
  expect(fmt(-0.5, 0.1)).toBe('-0.5');
  expect(fmt(-2, 1)).toBe('-2');
});

test('precision is chosen by the step boundary, independent of the value', () => {
  // same value 0.5 rendered at different precisions purely from the step.
  expect(fmt(0.5, 1)).toBe('1'); // step>=1 rounds 0.5 -> 1
  expect(fmt(0.5, 0.1)).toBe('0.5');
  expect(fmt(0.5, 0.01)).toBe('0.50');
  expect(fmt(0.5, 0.001)).toBe('0.500');
});
