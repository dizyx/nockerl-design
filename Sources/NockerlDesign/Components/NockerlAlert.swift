// NockerlAlert: the canonical alert-intent map + the StatusDisc coin (SwiftUI).
//
// The ONE home for the alert family's color bindings (mirror of the web's
// `ALERT_INTENT` and Compose's `NockerlAlertIntent`, single-sourced so Banner /
// Toast / Callout can never diverge):
//   - Cyan is reserved for `.info` ONLY (design-laws §10). The canonized info
//     mapping on every platform is `accentPrimary`. Voice uses the same accent
//     slot; there is no separate info-status token by design.
//   - `.notice` is the sanctioned warm accent (`accentWarm`), decorative not status.
//   - Everything else is a status signal (success / warning / danger).
//
// The StatusDisc is the signature "filled status-color icon disc" every alert
// leads with (law §6: status lives in a coin, never a left rail): a 24pt circle
// of the intent hue, an SF-glyph knocked out in the CANVAS ink, a whisper of
// neutral drop below and a stronger top rim-light above. Decorative: the host
// alert carries the semantic text.

import SwiftUI

/// The canonical alert intent: resolves hue, soft wash, and glyph per intent.
public enum NockerlAlertIntent: Equatable, CaseIterable {
    /// Informational: brand cyan (`accentPrimary`).
    case info
    /// Success: `statusSuccess`.
    case success
    /// Warning: `statusWarning`.
    case warning
    /// Danger / error: `statusError`.
    case danger
    /// Special notice: the warm accent (`accentWarm`), decorative not status.
    case notice

    /// The intent's full-strength hue.
    func color(in palette: NockerlPalette) -> Color {
        switch self {
        case .info: return palette.accentPrimary
        case .success: return palette.statusSuccess
        case .warning: return palette.statusWarning
        case .danger: return palette.statusError
        case .notice: return palette.accentWarm
        }
    }

    /// The intent's soft wash: dedicated soft tokens where they exist
    /// (info/notice), otherwise the hue at the canonical 16% alert wash (law §5).
    func softColor(in palette: NockerlPalette) -> Color {
        switch self {
        case .info: return palette.accentPrimarySoft
        case .notice: return palette.accentWarmSoft
        case .success: return palette.statusSuccess.opacity(NockerlAlertMetrics.softWashAlpha)
        case .warning: return palette.statusWarning.opacity(NockerlAlertMetrics.softWashAlpha)
        case .danger: return palette.statusError.opacity(NockerlAlertMetrics.softWashAlpha)
        }
    }

    /// The disc glyph: bare SF equivalents of the web stencils (the disc itself
    /// supplies the colored circle).
    var symbolName: String {
        switch self {
        case .info: return "info"
        case .success: return "checkmark"
        case .warning: return "exclamationmark"
        case .danger: return "xmark"
        case .notice: return "sparkles"
        }
    }
}

/// Shared alert-family constants (the canon mixes).
enum NockerlAlertMetrics {
    /// Soft wash for intents without a dedicated soft token (canon 16%).
    static let softWashAlpha: Double = 0.16
    /// Banner hairline→intent mix (canon 22%).
    static let bannerBorderMix: Double = 0.22

    /// Inset-well wash alpha (the canon 16% soft rule).
    static let insetWashMix: Double = 0.16

    /// Inset-well whisper border alpha (mirrors the web/Compose 30%).
    static let insetBorderMix: Double = 0.30
    /// Toast hairline→intent mix (canon 20%).
    static let toastBorderMix: Double = 0.20
    /// Callout hairline→tone mix (canon 18%).
    static let calloutBorderMix: Double = 0.18
    /// Disc drop mix of the shadow tint (canon 40%).
    static let discShadowMix: Double = 0.40
    /// Disc top rim-light mix of core white (canon 28%).
    static let discHighlightMix: Double = 0.28
}

/// The status-disc coin, a 24pt intent-filled circle with a knocked-out glyph.
/// Decorative by design (`accessibilityHidden`): the HOST alert carries the text.
public struct NockerlStatusDisc: View {
    private let intent: NockerlAlertIntent
    private let inset: Bool

    /// Disc diameter (24pt) and glyph point size.
    static let size: CGFloat = NockerlSpace.space6
    static let glyphSize: CGFloat = NockerlFontSize.size12

    /// Create the disc for an [intent].
    /// - Parameters:
    ///   - intent: the alert intent (fill + glyph).
    ///   - inset: render as the RECESSED intent well (soft wash + whisper
    ///     border + inner top shade, intent color on the GLYPH) instead of the
    ///     raised coin, for marks on a lifted plane (twin of the Compose
    ///     `inset`, r5  / ).
    public init(intent: NockerlAlertIntent, inset: Bool = false) {
        self.intent = intent
        self.inset = inset
    }

    public var body: some View {
        Group {
            if inset {
                InsetDiscBody(intent: intent)
            } else {
                DiscBody(intent: intent)
            }
        }
        .accessibilityHidden(true)
    }

    /// The RECESSED well variant: it SINKS ("fields sink"). No drop shadow,
    /// no rim-light; the intent hue rides the glyph over a soft wash.
    private struct InsetDiscBody: View {
        let intent: NockerlAlertIntent

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let hue = intent.color(in: palette)

            ZStack {
                Circle().fill(hue.opacity(NockerlAlertMetrics.insetWashMix))
                // Inner top shade: the shadow falls INTO the well.
                Circle()
                    .strokeBorder(
                        LinearGradient(
                            colors: [palette.shadowTint.opacity(0.45), .clear],
                            startPoint: .top,
                            endPoint: .center
                        ),
                        lineWidth: NockerlSpace.spacePx
                    )
                Image(systemName: intent.symbolName)
                    .font(.system(size: NockerlStatusDisc.glyphSize, weight: .medium))
                    .foregroundColor(hue)
            }
            .frame(width: NockerlStatusDisc.size, height: NockerlStatusDisc.size)
            .overlay {
                Circle().strokeBorder(
                    hue.opacity(NockerlAlertMetrics.insetBorderMix),
                    lineWidth: NockerlSpace.spacePx
                )
            }
        }
    }

    private struct DiscBody: View {
        let intent: NockerlAlertIntent

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let hue = intent.color(in: palette)

            ZStack {
                Circle().fill(hue)
                // Top rim-light: core white at the canon 28%, fading to nothing by
                // mid-coin, the coin's stronger catch-light (law §1, no glow).
                Circle()
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(NockerlAlertMetrics.discHighlightMix),
                                .clear,
                            ],
                            startPoint: .top,
                            endPoint: .center
                        ),
                        lineWidth: NockerlSpace.spacePx
                    )
                Image(systemName: intent.symbolName)
                    .font(.system(size: NockerlStatusDisc.glyphSize, weight: .medium))
                    .foregroundColor(palette.canvas)
            }
            .frame(width: NockerlStatusDisc.size, height: NockerlStatusDisc.size)
            .shadow(
                color: palette.shadowTint.opacity(NockerlAlertMetrics.discShadowMix),
                radius: NockerlSpace.spacePx,
                x: 0,
                y: NockerlSpace.spacePx
            )
        }
    }
}
