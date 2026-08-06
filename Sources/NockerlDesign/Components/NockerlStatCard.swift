// NockerlStatCard: the single-KPI stat / metric tile on Swift. THIS is the
// package canon (it previously lived site-side; Voice's hand-rolled HomeSection StatCard
// normalizes on adoption). Anatomy (feeds the adoption diff):
//
//   - the leading icon renders in one of TWO modes: `.flat`, a BARE
//     `accentPrimary` (cyan) glyph pinned top-left, NO plate/box/background; or `.inset`,
//     the recessed `NockerlInsetIcon` disc idiom (canvasAlt sunken plane + inner top
//     shade + hairline, circular) at plate scale. The always-on hairline plate is retired.
//   - a `StatTint` (success/warning/danger/accent) recolors the GLYPH: cyan is the `.flat`
//     default, neutral the `.inset` default; a `danger` error-count reads red, a `success`
//     uptime green (color-as-info, law §10). Status hue rides the glyph, never a plate.
//   - the anatomy STACKS (head row: icon + label / value row below), the r4 grid rule.
//   - the value is the OUTFIT brand font at display size (the design lead: mono is for
//     code only, Outfit for stat values); the delta figure is de-mono'd to Outfit too.
//   - the card is the flat `NockerlCard` chrome (surface1 + catch-light + hairline + the L2
//     neutral shadow). No gradient.
//
// The head row reserves the plate height even when no icon is passed, so headline numbers
// share one value offset across a tile row (the r4 grid rule).

import SwiftUI

/// A stat delta's direction (the react `StatDelta.trend` mirror).
public enum NockerlStatTrend {
    /// The figure moved up: ▲.
    case up
    /// The figure moved down: ▼.
    case down
}

/// The leading-icon rendering mode. Retires the always-on hairline plate.
public enum NockerlStatIconMode: Equatable {
    /// A BARE glyph pinned top-left: no plate / box / background. Default hue is
    /// `accentPrimary` (cyan); a ``NockerlStatTint`` recolors the glyph (danger = red, …).
    case flat
    /// The recessed `NockerlInsetIcon` disc idiom (canvasAlt sunken plane + inner top shade
    /// + hairline, circular) at plate scale. Default glyph is neutral; a ``NockerlStatTint``
    /// recolors the disc glyph. The "Transcription cloud-card" treatment.
    case inset
}

/// The optional trend chip on a ``NockerlStatCard``: a WARM status color + a
/// direction glyph + the magnitude. Never color alone (law §10).
public struct NockerlStatDelta {
    /// Magnitude, pre-formatted (e.g. `"12.4%"`, `"+8"`); the glyph carries the direction.
    public let value: String
    /// Direction: picks the glyph (▲/▼) and, with [goodWhenDown], the color.
    public let trend: NockerlStatTrend
    /// When `true`, DOWN is the good direction (cost, latency). Flips the
    /// color ladder, never the glyph.
    public let goodWhenDown: Bool

    /// Create a delta.
    public init(value: String, trend: NockerlStatTrend, goodWhenDown: Bool = false) {
        self.value = value
        self.trend = trend
        self.goodWhenDown = goodWhenDown
    }

    /// Whether this delta reads as GOOD (success ladder): up by default,
    /// down when [goodWhenDown].
    public var isGood: Bool {
        goodWhenDown ? trend == .down : trend == .up
    }
}

/// The status hue that colors the leading GLYPH, repurposed from the retired
/// plate tint. Mirrors the react `StatTint`. Warm hues stay status-meaningful (a `danger`
/// error-count glyph, a `success` uptime glyph); `accent` is the earned-cyan case.
public enum NockerlStatTint: Equatable {
    /// Brand cyan (`accentPrimary`).
    case accent
    /// Status green (`statusSuccess`).
    case success
    /// Status amber (`statusWarning`).
    case warning
    /// Status red (`statusError`).
    case danger

    /// Resolve the tint to its palette hue.
    func color(in palette: NockerlPalette) -> Color {
        switch self {
        case .accent: return palette.accentPrimary
        case .success: return palette.statusSuccess
        case .warning: return palette.statusWarning
        case .danger: return palette.statusError
        }
    }
}

/// The single-KPI tile: an optional leading glyph (`.flat` bare or `.inset` recessed disc),
/// the muted uppercase label, the big Outfit figure, and an optional warm trend delta.
/// Tile-friendly: fills its cell width; grid at will.
public struct NockerlStatCard<IconContent: View>: View {
    private let label: String
    private let value: String
    private let delta: NockerlStatDelta?
    private let density: NockerlControlDensity
    private let tint: NockerlStatTint?
    private let iconMode: NockerlStatIconMode
    private let icon: IconContent?

    @Environment(\.colorScheme) private var colorScheme

    /// Create a stat card with a leading glyph.
    /// - Parameters:
    ///   - label: the metric name (rendered uppercase, muted).
    ///   - value: the headline figure, pre-formatted (`"1.2M"`, `"$184"`).
    ///     Pass a lone em dash (`"\u{2014}"`) for the empty state, which mutes.
    ///     Never a misleading `0`.
    ///   - delta: optional trend (warm status color + ▲/▼), never color alone.
    ///   - density: the rhythm tier (the shared ``NockerlControlDensity``). `.comfortable`
    ///     is the default; `.compact` mirrors the web compact tier (dense dashboards).
    ///   - tint: OPTIONAL status hue that recolors the GLYPH. Default cyan for
    ///     `.flat`, neutral for `.inset`. A `danger` error-count reads red, etc.
    ///   - iconMode: `.flat` (bare cyan glyph, top-left, no box) is the default, or
    ///     `.inset` (the recessed `NockerlInsetIcon` disc idiom).
    ///   - icon: the leading glyph (an SF Symbol `Image` or any view).
    public init(
        label: String,
        value: String,
        delta: NockerlStatDelta? = nil,
        density: NockerlControlDensity = .comfortable,
        tint: NockerlStatTint? = nil,
        iconMode: NockerlStatIconMode = .flat,
        @ViewBuilder icon: () -> IconContent
    ) {
        self.label = label
        self.value = value
        self.delta = delta
        self.density = density
        self.tint = tint
        self.iconMode = iconMode
        self.icon = icon()
    }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        // The compact tier mirrors the web compact StatCard: a 32pt plate box, space3
        // padding, space2 gap, and a 20pt value. Comfortable is unchanged.
        let compact = density == .compact
        let plate = compact ? NockerlSpace.space8 : NockerlSpace.space10
        let glyphSize = compact ? NockerlFontSize.size14 : NockerlFontSize.size16
        let outerPad = compact ? NockerlSpace.space3 : NockerlSpace.space4
        let stackGap = compact ? NockerlSpace.space2 : NockerlSpace.space3
        let valueSize = compact ? NockerlFontSize.size20 : NockerlFontSize.size28

        NockerlCard {
            VStack(alignment: .leading, spacing: stackGap) {
                // HEAD: the icon + label band. min-height = the plate box so icon-less
                // tiles keep the value row at the same offset (the r4 grid rule).
                HStack(spacing: stackGap) {
                    if let icon {
                        iconView(icon, palette: palette, plate: plate, glyphSize: glyphSize)
                    }
                    Text(label)
                        // The shared §11 `eyebrow` role (v1.18.0): Outfit 500 / 12pt.
                        .nockerlType(.eyebrow)
                        .textCase(.uppercase)
                        .foregroundColor(palette.onCardMuted)
                        .lineLimit(1)
                        .truncationMode(.tail)
                    Spacer(minLength: 0)
                }
                .frame(minHeight: plate)

                // VALUE: the big OUTFIT figure + the optional delta, on one baseline.
                HStack(alignment: .firstTextBaseline, spacing: NockerlSpace.space2) {
                    Text(value)
                        // De-mono'd: the Outfit brand font at display size, big +
                        // thin-forward (§11). Mono is reserved for actual code snippets.
                        .font(.nockerl(size: valueSize, weight: .light))
                        // The em-dash EMPTY state mutes (never a misleading 0). The glyph is
                        // spelled as an escape: the repo bans the literal character in source.
                        .foregroundColor(value == "\u{2014}" ? palette.onCardMuted : palette.onCard)
                        .lineLimit(1)
                    if let delta {
                        StatDeltaLabel(delta: delta, palette: palette)
                    }
                }
            }
            .padding(outerPad)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    /// The leading icon in its mode: `.flat` bare glyph or `.inset` recessed disc.
    @ViewBuilder
    private func iconView(
        _ icon: IconContent, palette: NockerlPalette, plate: CGFloat, glyphSize: CGFloat
    ) -> some View {
        switch iconMode {
        case .flat:
            // Bare glyph pinned TOP-LEFT, no box. Default cyan; a StatTint recolors it.
            icon
                .font(.system(size: glyphSize, weight: .medium))
                .foregroundColor(tint?.color(in: palette) ?? palette.accentPrimary)
                .frame(height: plate, alignment: .topLeading)
        case .inset:
            // The recessed disc via the ONE shared primitive (v1.12.1). It was a stale
            // top-only LINEAR band, which drifted from NockerlInsetIcon's radial recipe. A
            // StatTint maps the disc to a TONE: `.accent` = the CYAN brand disc (the
            // Transcription cloud-card look, which fixes the previous always-gray), the
            // status hues for success/warning/danger, and neutral when no tint.
            let insetColors = insetDiscColors(tint: tint, palette: palette)
            icon
                .font(.system(size: glyphSize, weight: .regular))
                .foregroundColor(insetColors.glyph)
                .nockerlRecessedDisc(fill: insetColors.fill, border: insetColors.border, size: plate)
        }
    }

    /// Map a ``NockerlStatTint`` to the shared recessed-disc tone (fill / border / glyph),
    /// unified with ``NockerlInsetIcon`` via ``NockerlRecessedDiscTone`` so `.inset` and the
    /// inset-icon never drift. `.accent` reads the toned CYAN brand disc; `nil` = neutral.
    private func insetDiscColors(
        tint: NockerlStatTint?, palette: NockerlPalette
    ) -> (fill: Color, border: Color, glyph: Color) {
        switch tint {
        case nil:
            return (palette.canvasAlt, palette.cardHairline, palette.onCardMuted)
        case .accent:
            return (
                NockerlRecessedDiscTone.brandFill(palette),
                palette.accentPrimary.opacity(NockerlRecessedDiscTone.brandBorderAlpha),
                palette.accentPrimary
            )
        case .success:
            return (
                palette.statusSuccess.opacity(NockerlRecessedDiscTone.statusFillAlpha),
                palette.statusSuccess.opacity(NockerlRecessedDiscTone.statusBorderAlpha),
                palette.statusSuccess
            )
        case .warning:
            return (
                palette.statusWarning.opacity(NockerlRecessedDiscTone.statusFillAlpha),
                palette.statusWarning.opacity(NockerlRecessedDiscTone.statusBorderAlpha),
                palette.statusWarning
            )
        case .danger:
            return (
                palette.statusError.opacity(NockerlRecessedDiscTone.statusFillAlpha),
                palette.statusError.opacity(NockerlRecessedDiscTone.statusBorderAlpha),
                palette.statusError
            )
        }
    }
}

/// Icon-less convenience: the head band still reserves the plate height, so
/// mixed rows keep one value offset.
public extension NockerlStatCard where IconContent == EmptyView {
    init(
        label: String,
        value: String,
        delta: NockerlStatDelta? = nil,
        density: NockerlControlDensity = .comfortable,
        tint: NockerlStatTint? = nil
    ) {
        self.label = label
        self.value = value
        self.delta = delta
        self.density = density
        self.tint = tint
        self.iconMode = .flat
        self.icon = nil
    }
}

/// The delta chip: warm status ink (law §10: color + glyph + sign, never
/// color alone), Outfit magnitude, riding the value's baseline.
private struct StatDeltaLabel: View {
    let delta: NockerlStatDelta
    let palette: NockerlPalette

    var body: some View {
        let tone = delta.isGood ? palette.statusSuccess : palette.statusError
        HStack(spacing: NockerlSpace.space05) {
            Text(delta.trend == .up ? "▲" : "▼")
                .font(.system(size: NockerlFontSize.size10))
            Text(delta.value)
                // De-mono'd: Outfit, not mono (mono is for code). Routed through the
                // shared `eyebrow` role (v1.18.0), metrically identical (Outfit 500 / 12pt);
                // the delta keeps its warm status ink (this is a status value, not an overline).
                .nockerlType(.eyebrow)
        }
        .foregroundColor(tone)
    }
}
