/**
 * formatTokenCount: the single canonical compact count formatter for the demos.
 *
 * Unifies three previously-drifted copies (docs/audit-2-code.md): ChartDemo's
 * `compact`, StatCardDemo's `formatCount`, and ContextGaugeDemo's `formatTokenCount`
 * (the mirror of the Android source of truth `chat/ui/ChatUtils.kt`). One
 * implementation; the `decimals` argument selects the display contract:
 *
 *   - decimals = 0 (default): Android-exact integer buckets via floor, uppercase K.
 *       82_000 -> "82K", 200_000 -> "200K", 1_240_000 -> "1M". Mirrors ChatUtils.kt so
 *       ContextGauge stays byte-for-byte with the app it documents.
 *   - decimals = 1: the ratified web "8.4k" policy.
 *       ONE decimal below 10 of the unit, INTEGER (rounded) at/above 10, a LOWERCASE
 *       `k` for thousands + an uppercase `M` for millions (a trailing ".0" is dropped):
 *         8_400 -> "8.4k" · 42_000 -> "42k" · 1_240_000 -> "1.2M" · 15_700 -> "16k".
 *
 * Below 1_000 the raw integer is returned in both modes.
 */
export function formatTokenCount(n: number, decimals: 0 | 1 = 0): string {
  // decimals = 0: Android-exact integer buckets (floor, uppercase K / M).
  if (decimals === 0) {
    if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M`;
    if (n >= 1_000) return `${Math.floor(n / 1_000)}K`;
    return `${n}`;
  }
  // decimals = 1, the "8.4k" policy: one decimal below 10 of the unit, integer above.
  const compact = (v: number, suffix: string): string =>
    (Math.abs(v) < 10 ? v.toFixed(1).replace(/\.0$/, '') : `${Math.round(v)}`) + suffix;
  if (n >= 1_000_000) return compact(n / 1_000_000, 'M');
  if (n >= 1_000) return compact(n / 1_000, 'k');
  return `${n}`;
}
