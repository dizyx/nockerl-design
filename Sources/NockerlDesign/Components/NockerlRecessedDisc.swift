// NockerlRecessedDisc: the ONE shared INTERNAL recessed-disc chrome (canon), so the
// disc renders IDENTICALLY everywhere and never drifts again (v1.12.1 fix: NockerlStatCard
// `.inset` had forked a stale pre- top-only band while NockerlInsetIcon used the correct
// shape-following radials). Both now compose THIS one modifier.
//
// The recipe: a fill plane, the TWO shape-following RADIAL gradients (a top-weighted shade
// hugging the top arc + a bottom catch-light tracing the bottom arc, wrapping the FULL
// circle, never a top-only linear band), the circle clip, and a hairline border. The wrapped
// content is the centered glyph; callers pass the fill + border + size (colors stay caller-
// controlled so each surface tones per its tone/tint).

import SwiftUI

/// The shared recessed-disc chrome. Apply to a centered glyph:
/// `Image(systemName:).nockerlRecessedDisc(fill:border:size:)`.
struct NockerlRecessedDisc: ViewModifier {
    let fill: Color
    let border: Color
    let size: CGFloat

    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        let palette = NockerlPalette.resolve(colorScheme)
        content
            .frame(width: size, height: size)
            .background(fill)
            // The recessed inner shade FOLLOWS the circle: a top-weighted RADIAL
            // hugging the top arc + tapering down both sides, plus a bottom RADIAL catch-light
            // tracing the bottom arc. Wraps the FULL shape (never a top-only band). Clipped
            // to the circle below.
            .overlay {
                ZStack {
                    RadialGradient(
                        // v1.12.2 FIX 1: the upper-arc shade was too aggressive (0.45 @ 0.88
                        // darkened most of the disc). Toned to 0.15 + tightened to 0.6 so the
                        // clamped-dark zone concentrates on the UPPER arc (the region beyond
                        // 0.6·size from the bottom-center clear well), leaving the sides/bottom
                        // clear. Bottom catch-light below is UNCHANGED. Shared primitive:
                        // renders identically in NockerlInsetIcon + NockerlStatCard .inset.
                        gradient: Gradient(colors: [.clear, palette.shadowTint.opacity(0.15)]),
                        center: UnitPoint(x: 0.5, y: 0.78),
                        startRadius: 0,
                        endRadius: size * 0.6
                    )
                    RadialGradient(
                        gradient: Gradient(colors: [.clear, palette.surfaceHighlight]),
                        center: UnitPoint(x: 0.5, y: 0.18),
                        startRadius: 0,
                        endRadius: size * 0.9
                    )
                }
            }
            .clipShape(Circle())
            .overlay {
                Circle().strokeBorder(border, lineWidth: NockerlSpace.spacePx)
            }
    }
}

extension View {
    /// Apply the shared recessed-disc chrome (fill + two shape-following radials +
    /// circle clip + hairline border). See ``NockerlRecessedDisc``.
    func nockerlRecessedDisc(fill: Color, border: Color, size: CGFloat) -> some View {
        modifier(NockerlRecessedDisc(fill: fill, border: border, size: size))
    }
}

/// Shared tone alphas for the recessed disc, the ONE source so ``NockerlInsetIcon`` and
/// ``NockerlStatCard`` (`.inset`) resolve identical fills/borders and can't drift.
enum NockerlRecessedDiscTone {
    /// The BRAND (cyan) fill alpha: v1.12.1 TONED to **0.13** (`accentPrimary` @ 0.13,
    /// ~19% below the old `accentPrimarySoft` ≈ 0.16). the design lead: the cyan cloud-card read
    /// "slightly too much"; this tones BOTH the InsetIcon `.brand` disc AND the StatCard
    /// `.inset` accent (Transcription cloud card) in lockstep.
    static let brandFillAlpha: Double = 0.13
    /// The brand border: `accentPrimary` @ 0.24.
    static let brandBorderAlpha: Double = 0.24
    /// The status (success/warning/error) soft fill: hue @ 0.12.
    static let statusFillAlpha: Double = 0.12
    /// The status border: hue @ 0.30.
    static let statusBorderAlpha: Double = 0.30

    /// The toned brand fill color.
    static func brandFill(_ palette: NockerlPalette) -> Color {
        palette.accentPrimary.opacity(brandFillAlpha)
    }
}
