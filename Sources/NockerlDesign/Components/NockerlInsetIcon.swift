// NockerlInsetIcon: the ratified INFORMATIONAL icon treatment. A glyph that
// SINKS into a recessed disc well ("fields sink") rather than
// sitting on a raised filled-circle, per the design lead's "super classy" direction, first on
// the EmptyState mark and now canon for any purely informational icon.
//
// NEVER clickable: flat/plain + filled-circle icons signal interactive;
// the inset treatment signals informational. This view exposes NO action. An inset
// icon with a tap handler is a law violation by construction, so the type forbids it.
//
// The well is the recessed grammar shared with the callout/checkbox (canvasAlt +
// inner top shade + hairline), circular, with a MUTED SF Symbol. Three tones mirror
// the web `.nk-es__well` variants 1:1. Mirrors the Compose NockerlInsetIcon.

import SwiftUI

/// The informational inset-icon tones, mirroring the web `.nk-es__well` variants.
public enum NockerlInsetIconTone: Equatable {
    /// Muted neutral mark, the default informational look.
    case neutral
    /// Earned cyan: first-run / brand-positive states.
    case brand
    /// Warm status-error: failure / problem states (never color alone).
    case error
}

/// Inset-icon size. `.md` is the empty-state mark (64pt well / 30pt glyph); `.sm` is an
/// inline half-size (32 / 15) for status rows next to text. Mirror to web/Compose when
/// they add sizes.
public enum NockerlInsetIconSize: Equatable {
    case sm, md
    var well: CGFloat { self == .sm ? 32 : 64 }
    var glyph: CGFloat { self == .sm ? 15 : 30 }
}

/// A purely-informational icon in a recessed well (see the file header). No tap
/// affordance by design.
public struct NockerlInsetIcon: View {
    private let systemName: String
    private let accessibilityLabel: String?
    private let tone: NockerlInsetIconTone
    private let size: NockerlInsetIconSize

    /// Well diameter, the web `space-16` (64). Default (`.md`).
    static let wellSize: CGFloat = 64
    /// Glyph point size inside the well (~the web 32px mark). Default (`.md`).
    static let glyphSize: CGFloat = 30
    /// Brand border opacity (web `accentPrimary 24%`).
    static let brandBorderAlpha: Double = 0.24
    /// Error fill wash opacity (web `statusError 12%`).
    static let errorFillAlpha: Double = 0.12
    /// Error border opacity (web `statusError 30%`).
    static let errorBorderAlpha: Double = 0.30

    /// Create an inset icon.
    /// - Parameters:
    ///   - systemName: the SF Symbol name.
    ///   - accessibilityLabel: the a11y name, or `nil` when a sibling label already
    ///     carries the meaning (then the mark is decorative / hidden).
    ///   - tone: the well tint (default neutral).
    ///   - size: `.md` (64) empty-state, or `.sm` (32) inline. Default `.md`.
    public init(
        systemName: String,
        accessibilityLabel: String? = nil,
        tone: NockerlInsetIconTone = .neutral,
        size: NockerlInsetIconSize = .md
    ) {
        self.systemName = systemName
        self.accessibilityLabel = accessibilityLabel
        self.tone = tone
        self.size = size
    }

    public var body: some View {
        InsetBody(systemName: systemName, accessibilityLabel: accessibilityLabel, tone: tone, size: size)
    }

    /// Environment-reading render body.
    private struct InsetBody: View {
        let systemName: String
        let accessibilityLabel: String?
        let tone: NockerlInsetIconTone
        let size: NockerlInsetIconSize

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let glyph = glyphColor(palette)
            let fill = fillColor(palette)
            let border = borderColor(palette)

            Image(systemName: systemName)
                .font(.system(size: size.glyph, weight: .regular))
                .foregroundColor(glyph)
                //  recessed-disc chrome, via the ONE shared primitive (v1.12.1 unify:
                // the recipe no longer lives inline, so it can't fork from StatCard's disc).
                .nockerlRecessedDisc(fill: fill, border: border, size: size.well)
                // A named inset icon reads as an image; a nameless one is
                // decorative (the sibling label carries meaning) and is hidden.
                .accessibilityHidden(accessibilityLabel == nil)
                .accessibilityLabel(accessibilityLabel ?? "")
        }

        private func glyphColor(_ p: NockerlPalette) -> Color {
            switch tone {
            case .neutral: return p.onCardMuted
            case .brand: return p.accentPrimary
            case .error: return p.statusError
            }
        }

        private func fillColor(_ p: NockerlPalette) -> Color {
            switch tone {
            case .neutral: return p.canvasAlt
            // v1.12.1: TONED cyan via the shared brand fill (was `accentPrimarySoft`).
            case .brand: return NockerlRecessedDiscTone.brandFill(p)
            case .error: return p.statusError.opacity(NockerlInsetIcon.errorFillAlpha)
            }
        }

        private func borderColor(_ p: NockerlPalette) -> Color {
            switch tone {
            case .neutral: return p.cardHairline
            case .brand: return p.accentPrimary.opacity(NockerlInsetIcon.brandBorderAlpha)
            case .error: return p.statusError.opacity(NockerlInsetIcon.errorBorderAlpha)
            }
        }
    }

}
