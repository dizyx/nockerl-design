// Unit tests for pageTokens, the pure windowed page-number/ellipsis model. Given the
// current page + total + sibling count it returns the ordered token list (numbers +
// 'gap' where elided). Pure + deterministic.
import { test, expect } from 'bun:test';
import { pageTokens } from './Pagination.js';

test('renders every page (no gaps) when total is at or below the window', () => {
  // threshold is total <= 5 + siblings*2 -> for siblings 1 that is total <= 7.
  expect(pageTokens(1, 3)).toEqual([1, 2, 3]);
  expect(pageTokens(1, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(pageTokens(4, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
});

test('a single page returns just [1]', () => {
  expect(pageTokens(1, 1)).toEqual([1]);
});

test('elides on the right when the current page is near the start', () => {
  expect(pageTokens(1, 10, 1)).toEqual([1, 2, 'gap', 10]);
});

test('elides on the left when the current page is near the end', () => {
  expect(pageTokens(10, 10, 1)).toEqual([1, 'gap', 9, 10]);
});

test('elides on both sides when the current page is in the middle', () => {
  expect(pageTokens(5, 10, 1)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
});

test('keeps first + last as the outer anchors always', () => {
  const tokens = pageTokens(5, 10, 1);
  expect(tokens[0]).toBe(1);
  expect(tokens[tokens.length - 1]).toBe(10);
});

test('drops a would-be single-page gap into the literal page instead', () => {
  // current 4: left window starts at 3, and page 2 sits alone before it -> no gap,
  // page 2 is shown literally (a gap of one is never worth an ellipsis).
  expect(pageTokens(4, 10, 1)).toEqual([1, 'gap', 3, 4, 5, 'gap', 10]);
  // current 7: symmetric on the right -> page 9 shown literally, left gap kept.
  expect(pageTokens(7, 10, 1)).toEqual([1, 'gap', 6, 7, 8, 'gap', 10]);
});

test('widens the window with the siblings count', () => {
  // siblings 2 -> two cells either side of current (3..7 around 5).
  expect(pageTokens(5, 20, 2)).toEqual([1, 'gap', 3, 4, 5, 6, 7, 'gap', 20]);
});

test('never duplicates the first or last page inside the window', () => {
  // window would include page 1; the builder skips p===1 and p===total in the middle loop.
  const tokens = pageTokens(2, 10, 1);
  expect(tokens).toEqual([1, 2, 3, 'gap', 10]);
  const ones = tokens.filter((t) => t === 1);
  expect(ones).toHaveLength(1);
});

test('produces gaps only as the string sentinel, numbers otherwise', () => {
  const tokens = pageTokens(5, 10, 1);
  for (const t of tokens) {
    expect(t === 'gap' || typeof t === 'number').toBe(true);
  }
});
