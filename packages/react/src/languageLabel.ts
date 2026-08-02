/**
 * nockerlLanguageLabel, the shared language-tag normalization contract, byte-for-byte
 * parity with the native rails' `nockerlLanguageLabel` (Compose + Swift). Trim +
 * lowercase; a blank or absent input resolves to `null` (render nothing). So every host
 * (web CodeBlock / DiffViewer / Markdown fence, Android, Voice) renders the IDENTICAL
 * tag string: `'TypeScript'` → `'typescript'`, `'  '` → `null`.
 *
 * A language is METADATA, never status, so the tag it feeds is HUE-FREE (see
 * `NockerlLanguageBadge`), the single normalization edit-point if the casing ever
 * changes (it stays lowercase, matching native).
 */
export function nockerlLanguageLabel(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const normalized = raw.trim().toLowerCase();
  return normalized === '' ? null : normalized;
}
