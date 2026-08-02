/**
 * NockerlDivider is the Tier-1 divider/separator primitive. ONE home for the hairline
 * tone ladder (default / alt-plane / status / the cyan signature line / the rare
 * warm feature line), the orientation grammar, the labeled + section-label
 * variants, and the presentational role="separator" a11y rule. A future divider
 * change is ONE edit, not many. Composes ONLY tokens.
 *
 * Sourced verbatim from the shipped apps (never the web dashboard):
 *   • Android Compose: HorizontalDivider(thickness = 1.dp, color = colors.divider)
 *     (MainScaffold), inset HorizontalDivider(Modifier.padding(horizontal = 20.dp))
 *     (FlicTargetPickerSheet), the labeled SystemMessageDivider (two weight(1f)
 *     rules + a centered labelSmall), and the section-label divider in
 *     SessionConfigFields. The signature 1.5dp cyan boundary line
 *     (colors.accentPrimary) comes from TopChromeBoundary.
 *   • Voice Swift: Rectangle().fill(NockerlTheme.hairline).frame(height: 1)
 *     (SettingsView/HistoryView), the vertical Rectangle().fill(divider)
 *     .frame(width: 1, height: 22) (RecordingHUD pill), .frame(width: 1)
 *     (DashboardView sidebar).
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • A divider is a crisp HAIRLINE. Never a shadow, never a glow. Structure only.
 *   • Standard rule = --color-divider; on the alternate (sheet) plane =
 *     --color-alt-hairline; the inverse, the SIGNATURE boundary line, is the one
 *     place a divider carries the brand: --color-accent-primary (cyan), the ONLY
 *     brand accent. A warm (--color-status-warning) rule is a STATUS divider only.
 *   • Labels ride muted-on-surface type; rules stay balanced on each side of a label.
 *   • Presentational: role="separator" + correct aria-orientation, never focusable.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract';

export type NockerlDividerOrientation = 'horizontal' | 'vertical';
/** Which hairline token the rule binds to. */
export type NockerlDividerTone = 'default' | 'alt' | 'accent' | 'status' | 'warm';

export interface NockerlDividerProps extends HTMLAttributes<HTMLHRElement> {
  /** Lay the rule horizontally (default) or vertically between inline items. */
  orientation?: NockerlDividerOrientation;
  /** Hairline tone: standard, alt-plane, the cyan signature line, a status rule, or the rare warm (accent.warm) feature line. */
  tone?: NockerlDividerTone;
  /** Symmetric inset (indent) from the container edges, in token spacing steps. */
  inset?: string;
  /** Optional centered label ("OR") with balanced rules on each side. */
  label?: string;
  /** Render the label flush-left as a section header (one trailing rule). */
  sectionLabel?: boolean;
}

// A divider is a crisp HAIRLINE. The tone selects WHICH token paints it; the
// weight is geometry (1px standard, 1.5px for the signature cyan line, the exact
// 1.5dp the apps ship). Every color/space/type value is a token.
export const NOCKERL_DIVIDER_STYLES = `
/* ── The rule itself ─────────────────────────────────────────────────────── */
.nk-dv {
  flex: 1 1 auto;
  border: 0;
  margin: 0;
  align-self: stretch;
  background: var(--color-divider);          /* default tone */
}
.nk-dv--horizontal { height: 1px; width: 100%; }     /* 1px: hairline geometry */
/* Vertical rule lives inside an inline flex row. It must NOT flex-grow, or the
   declared hairline width gets overridden and it swells into a filled block. */
.nk-dv--vertical   { flex: 0 0 auto; width: 1px; align-self: stretch; min-height: var(--space-5); }
.nk-dv--alt    { background: var(--color-alt-hairline); }
.nk-dv--status { background: color-mix(in srgb, var(--color-status-warning) 30%, transparent); }
/* Only the SIGNATURE cyan boundary line carries the brand. The apps ship it at
   1.5dp; mirror that exact weight (geometry, not a token). */
.nk-dv--accent { background: var(--color-accent-primary); }
/* The RARE warm boundary is the one place a divider carries the SECONDARY accent
   (accent.warm): a special / featured section break, distinct from the cyan signature
   and the amber status rule. A seasoning. Use it on at most one boundary in view. */
.nk-dv--warm { background: var(--color-accent-warm); }
/* Signature cyan + warm feature lines both ship at the 1.5px hairline weight (geometry). */
.nk-dv--accent.nk-dv--horizontal, .nk-dv--warm.nk-dv--horizontal { height: 1.5px; }
.nk-dv--accent.nk-dv--vertical, .nk-dv--warm.nk-dv--vertical { flex: 0 0 auto; width: 1.5px; }

/* ── Labeled divider: balanced rules either side of a centered label ──────── */
.nk-dv-labeled {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
}
/* The base .nk-dv carries align-self:stretch (so VERTICAL rules fill their row). In this
   centered labeled row that combines with the definite 1px height to place the rule at
   flex-START (top), which floats it ~8-10px ABOVE the label. Re-center it here. */
.nk-dv-labeled .nk-dv { align-self: center; }
.nk-dv-labeled__lbl {
  flex: 0 0 auto;
  font-size: var(--font-size-12);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--font-tracking-tight);
  text-transform: uppercase;
  color: var(--color-on-card-muted);
  white-space: nowrap;
}
.nk-dv-labeled--status .nk-dv-labeled__lbl { color: var(--color-status-warning); }
.nk-dv-labeled--warm .nk-dv-labeled__lbl { color: var(--color-accent-warm); }
.nk-dv-labeled--section { gap: var(--space-3); }
.nk-dv-labeled--section .nk-dv-labeled__lbl {
  font-size: var(--font-size-10);
  letter-spacing: var(--font-tracking-normal);
  font-weight: var(--font-weight-semibold);
}
`;

/**
 * A single Nockerl divider is the unit the spec documents. A presentational
 * `role="separator"` hairline (orientation-aware). With `label` it becomes a
 * centered "OR"-style divider with balanced rules; with `sectionLabel` a
 * flush-left section header trailed by one rule.
 */
export const NockerlDivider = forwardRef<HTMLHRElement, NockerlDividerProps>(function NockerlDivider({
  orientation = 'horizontal',
  tone = 'default',
  inset,
  label,
  sectionLabel = false,
  className,
  style,
  ...rest
}, ref) {
  const ruleClass = `nk-dv nk-dv--${orientation} nk-dv--${tone}`;

  // Section header: label, then one trailing rule.
  if (sectionLabel && label) {
    return (
      <div className={['nk-dv-labeled nk-dv-labeled--section', className].filter(Boolean).join(' ')} style={style}>
        <span className="nk-dv-labeled__lbl">{label}</span>
        <span className={ruleClass} role="separator" aria-orientation="horizontal" />
        <style>{NOCKERL_DIVIDER_STYLES}</style>
      </div>
    );
  }

  // Centered label: balanced rules on each side.
  if (label) {
    return (
      <div
        className={[`nk-dv-labeled${tone === 'status' || tone === 'warm' ? ` nk-dv-labeled--${tone}` : ''}`, className].filter(Boolean).join(' ')}
        style={style}
      >
        <span className={ruleClass} role="separator" aria-orientation="horizontal" />
        <span className="nk-dv-labeled__lbl">{label}</span>
        <span className={ruleClass} role="separator" aria-orientation="horizontal" />
        <style>{NOCKERL_DIVIDER_STYLES}</style>
      </div>
    );
  }

  // Plain rule (optionally inset). The bare <hr> cannot host a child <style>, so
  // it is wrapped in a display:contents fragment that adds zero box / layout. The
  // rule renders identically while the recipe CSS rides along as the LAST child.
  const insetStyle = inset
    ? orientation === 'horizontal'
      ? { marginInline: inset, width: 'auto' }
      : { marginBlock: inset }
    : undefined;
  return (
    <>
      <hr
        {...rest}
        ref={ref}
        className={[ruleClass, className].filter(Boolean).join(' ')}
        role="separator"
        aria-orientation={orientation}
        style={insetStyle || style ? { ...insetStyle, ...style } : undefined}
      />
      <style>{NOCKERL_DIVIDER_STYLES}</style>
    </>
  );
});

/** LEAF: the divider/separator primitive; the plain rule renders (and owns) a raw <hr>.
 *  Labeled variants use presentational role="separator" spans; holds no child slots. */
export const compose = { tier: 'leaf', owns: ['hr'] } satisfies ComposeContract;

export default NockerlDivider;
