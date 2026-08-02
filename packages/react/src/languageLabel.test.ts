// Unit tests for the shared language-tag normalization contract. This MUST stay
// byte-for-byte identical to the native rails' nockerlLanguageLabel (Compose + Swift)
// so every host renders the same tag string. Pure + deterministic.
import { test, expect } from 'bun:test';
import { nockerlLanguageLabel } from './languageLabel';

test('lowercases and trims to the canonical tag', () => {
  expect(nockerlLanguageLabel('TypeScript')).toBe('typescript');
  expect(nockerlLanguageLabel('Kotlin')).toBe('kotlin');
  expect(nockerlLanguageLabel('JSON')).toBe('json');
  expect(nockerlLanguageLabel('  Swift  ')).toBe('swift');
});

test('already-normalized input is unchanged', () => {
  expect(nockerlLanguageLabel('shell')).toBe('shell');
});

test('blank / whitespace / absent input resolves to null (render nothing)', () => {
  expect(nockerlLanguageLabel('')).toBeNull();
  expect(nockerlLanguageLabel('   ')).toBeNull();
  expect(nockerlLanguageLabel(null)).toBeNull();
  expect(nockerlLanguageLabel(undefined)).toBeNull();
});
