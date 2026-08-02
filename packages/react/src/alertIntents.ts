/**
 * alertIntents, the ONE intent → color map for the alert family (Banner, Callout, Toast).
 *
 * These three demos each carried their own duplicated INTENT/TONE color map; the orange
 * `notice` accent + every status hue now live HERE, single-sourced, so a change is one edit
 * and the three can't drift (the centralization called for in docs/component-architecture.md).
 *
 * Values are `var(--token)` strings, theme-reactive and never hardcoded. `color` is the solid
 * intent (filled status disc, hairline, label); `soft` is its ~16% tint (surface wash).
 *
 *   - STATUS intents (functional signals): info (cyan), success, warning (amber), error.
 *   - `notice` is the RARE warm brand accent (accent.warm / orange), a special, NON-status
 *     highlight (an orange hairline + filled disc), deliberately DISTINCT from `warning` amber
 *     (design-law 10 + ADR-0009). Use sparingly: a featured/seasonal/heads-up announcement,
 *     not "something is wrong."
 */
export type AlertIntent = 'info' | 'success' | 'warning' | 'error' | 'notice';

export interface IntentColors {
  /** Solid intent color: filled disc, hairline border, label accent. */
  color: string;
  /** ~16% soft tint of the intent: surface wash / outline fill. */
  soft: string;
}

export const ALERT_INTENT: Record<AlertIntent, IntentColors> = {
  info: { color: 'var(--color-accent-primary)', soft: 'var(--color-accent-primary-soft)' },
  success: {
    color: 'var(--color-status-success)',
    soft: 'color-mix(in srgb, var(--color-status-success) 16%, transparent)',
  },
  warning: {
    color: 'var(--color-status-warning)',
    soft: 'color-mix(in srgb, var(--color-status-warning) 16%, transparent)',
  },
  error: {
    color: 'var(--color-status-error)',
    soft: 'color-mix(in srgb, var(--color-status-error) 16%, transparent)',
  },
  // The rare warm brand accent, orange, NOT a status color.
  notice: { color: 'var(--color-accent-warm)', soft: 'var(--color-accent-warm-soft)' },
};
