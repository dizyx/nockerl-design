/**
 * _codeMirrorTheme: the NOCKERL CodeMirror 6 theme (WS5 · task 2656). Every value is a
 * design token, zero hardcoded hues, so the editor is theme-reactive like everything
 * else. This is THE liftable recipe for the dashboard's console (import or copy; the
 * values are var(--token) strings that resolve at render, both themes for free).
 *
 * Laws honored: the editor GROUND is a recessed well (fields sink, so card-surface2 +
 * the inset top shade); the caret + selection ride the accent (selection = the
 * sanctioned soft wash, never an opaque brand fill); the SYNTAX ramp mirrors the
 * CodeBlock canon EXACTLY (key = accent-secondary, string = status-success, function =
 * accent-tertiary, number = categorical orange, comment = muted italic) so read-only
 * code and the editor read as one family.
 */
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

export function nockerlCodeMirrorTheme(): Extension[] {
  const theme = EditorView.theme({
    '&': {
      backgroundColor: 'var(--color-card-surface2)',
      color: 'var(--color-on-card)',
      fontSize: 'var(--font-size-12)',
      borderRadius: 'var(--radius-panel)',
    },
    '.cm-content': {
      fontFamily: 'var(--font-family-mono)',
      lineHeight: 'var(--font-line-height-20)',
      caretColor: 'var(--color-accent-primary)',
      padding: 'var(--space-2) 0',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-accent-primary)' },
    '&.cm-focused': { outline: 'none' },   /* the PANEL owns the focus treatment */
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--color-accent-primary-soft)',
    },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--color-on-card) 4%, transparent)' },
    '.cm-gutters': {
      backgroundColor: 'var(--color-card-surface3)',
      color: 'var(--color-on-card-muted)',
      border: 'none',
      borderRight: 'var(--space-px) solid var(--color-card-hairline)',
      fontFamily: 'var(--font-family-mono)',
      fontSize: 'var(--font-size-10)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'color-mix(in srgb, var(--color-on-card) 6%, transparent)',
      color: 'var(--color-on-card)',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 var(--space-2) 0 var(--space-3)' },
  });

  // The SAME syntax ramp the CodeBlock canon paints (its .t-* tint rules), giving one
  // code voice across the read-only block and the live editor.
  const highlight = HighlightStyle.define([
    { tag: [tags.keyword, tags.modifier, tags.operatorKeyword], color: 'var(--color-accent-secondary)' },
    { tag: [tags.string, tags.special(tags.string)], color: 'var(--color-status-success)' },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: 'var(--color-accent-tertiary)' },
    { tag: [tags.number, tags.bool], color: 'var(--color-core-categorical-orange400)' },
    { tag: [tags.comment, tags.blockComment, tags.lineComment], color: 'var(--color-on-card-muted)', fontStyle: 'italic' },
    { tag: [tags.typeName, tags.className], color: 'var(--color-accent-quaternary)' },
    { tag: tags.propertyName, color: 'var(--color-on-card)' },
    { tag: tags.punctuation, color: 'var(--color-on-card-muted)' },
  ]);

  return [theme, syntaxHighlighting(highlight)];
}
