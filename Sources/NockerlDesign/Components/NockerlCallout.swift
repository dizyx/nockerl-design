// NockerlCallout: the persistent in-content aside for SwiftUI (callout.mdx).
//
// The INVERSE of the banner: a RECESSED `canvasAlt` well ("fields sink", law §2)
// with an inner top shade instead of a drop shadow, led by the StatusDisc coin and
// an uppercase eyebrow (the sanctioned overline exception, law §11). Two special
// tones: `.important` wears the nested-hairline-frames treatment (law §6's
// dimensional box-in-a-box: three concentric intent-mixed borders, 55/32/16%,
// stepping card → panel → control radii around a SOLID inner panel); `.quote`
// renders italic muted prose behind a faded quotemark with an optional cite.

import SwiftUI

/// The editorial tone ladder: each maps onto the canonical alert intents.
public enum NockerlCalloutTone: Equatable, CaseIterable {
    /// Neutral aside: muted eyebrow, no intent hue.
    case note
    /// Helpful guidance, success green.
    case tip
    /// The ONE cyan editorial tone: the nested-frames treatment.
    case important
    /// Caution ahead, warning amber.
    case warning
    /// Destructive/irreversible, error red.
    case caution
    /// Special notice, the warm accent.
    case notice
    /// Quotation: italic prose behind a faded quotemark.
    case quote

    /// The tone's alert intent, or `nil` for the neutral tones (note/quote).
    var intent: NockerlAlertIntent? {
        switch self {
        case .note, .quote: return nil
        case .tip: return .success
        case .important: return .info
        case .warning: return .warning
        case .caution: return .danger
        case .notice: return .notice
        }
    }

    /// The default eyebrow text.
    var eyebrow: String {
        switch self {
        case .note: return "Note"
        case .tip: return "Tip"
        case .important: return "Important"
        case .warning: return "Warning"
        case .caution: return "Caution"
        case .notice: return "Notice"
        case .quote: return "Quote"
        }
    }

    /// The tone hue (neutral tones fall back to the on-card ink).
    func color(in palette: NockerlPalette) -> Color {
        intent?.color(in: palette) ?? palette.onCard
    }
}

/// The persistent in-content callout. No dismiss, no action: editorial content.
public struct NockerlCallout: View {
    private let message: String
    private let tone: NockerlCalloutTone
    private let title: String?
    private let showIcon: Bool
    private let cite: String?

    /// Quotemark fade (canon 45% of the tone hue) and inner-shade depth/mix.
    static let quoteMarkMix: Double = 0.45
    static let recessShadowMix: Double = 0.45
    /// Nested-frame border mixes, outermost → innermost (canon 55/32/16%).
    static let frameMixes: [Double] = [0.55, 0.32, 0.16]

    /// Create a callout.
    /// - Parameters:
    ///   - message: the callout prose (plain text).
    ///   - tone: the editorial tone (defaults to ``NockerlCalloutTone/note``).
    ///   - title: optional eyebrow override (defaults to the tone's own name).
    ///   - showIcon: render the leading disc (default true; quote always renders
    ///     its quotemark instead).
    ///   - cite: optional attribution line (quote tone only).
    public init(
        message: String,
        tone: NockerlCalloutTone = .note,
        title: String? = nil,
        showIcon: Bool = true,
        cite: String? = nil
    ) {
        self.message = message
        self.tone = tone
        self.title = title
        self.showIcon = showIcon
        self.cite = cite
    }

    public var body: some View {
        CalloutBody(
            message: message,
            tone: tone,
            title: title,
            showIcon: showIcon,
            cite: cite
        )
    }

    private struct CalloutBody: View {
        let message: String
        let tone: NockerlCalloutTone
        let title: String?
        let showIcon: Bool
        let cite: String?

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)

            if tone == .important {
                importantFrames(palette: palette) {
                    core(palette: palette, framed: true)
                }
            } else {
                core(palette: palette, framed: false)
            }
        }

        /// The shared body: disc/quotemark + eyebrow + prose (+ cite).
        @ViewBuilder
        private func core(palette: NockerlPalette, framed: Bool) -> some View {
            let hue = tone.color(in: palette)
            let shape = RoundedRectangle(
                cornerRadius: framed ? NockerlRadius.control : NockerlRadius.panel,
                style: .continuous
            )
            let isQuote = tone == .quote

            HStack(alignment: .top, spacing: NockerlSpace.space3) {
                if isQuote {
                    // Canon quotemark is 36pt at the tone hue faded to 45%.
                    Text("\u{201C}")
                        .font(.nockerl(size: NockerlFontSize.size36, weight: .medium))
                        .foregroundColor(hue.opacity(NockerlCallout.quoteMarkMix))
                } else if showIcon, let intent = tone.intent {
                    NockerlStatusDisc(intent: intent)
                }
                VStack(alignment: .leading, spacing: NockerlSpace.space1) {
                    Text((title ?? tone.eyebrow).uppercased())
                        .font(.nockerl(size: NockerlFontSize.size12, weight: .medium))
                        .foregroundColor(tone.intent == nil ? palette.onCardMuted : hue)
                    // `Text.italic(Bool)` is macOS 13+, and the package floor is 12, so
                    // the conditional is applied by branching on the Text itself.
                    prose(isQuote: isQuote)
                        .foregroundColor(isQuote ? palette.onCardMuted : palette.onCard)
                        .fixedSize(horizontal: false, vertical: true)
                    if let cite, isQuote {
                        // The attribution em dash is spelled as an escape: the repo bans
                        // the literal character in source. It still renders as one glyph.
                        Text("\u{2014} \(cite)")
                            .font(.nockerl(size: NockerlFontSize.size12, weight: .light))
                            .foregroundColor(palette.onCardMuted)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, NockerlSpace.space5)
            .padding(.vertical, NockerlSpace.space4)
            .background(framed ? palette.cardSurface1 : palette.canvasAlt)
            // The recessed well's INNER top shade (framed panels stay solid).
            .overlay(alignment: .top) {
                if !framed {
                    LinearGradient(
                        colors: [
                            palette.shadowTint.opacity(NockerlCallout.recessShadowMix),
                            .clear,
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(height: NockerlSpace.space05)
                }
            }
            .clipShape(shape)
            .overlay {
                if !framed {
                    shape.strokeBorder(
                        NockerlContrast.mix(
                            hue,
                            into: palette.cardHairline,
                            fraction: NockerlAlertMetrics.calloutBorderMix
                        ),
                        lineWidth: NockerlSpace.spacePx
                    )
                }
            }
        }

        /// The quote prose is italic, branched on `Text` (the `italic(Bool)`
        /// overload needs macOS 13; the package floor is 12).
        private func prose(isQuote: Bool) -> Text {
            let text = Text(message).font(.nockerl(size: NockerlFontSize.size14, weight: .light))
            return isQuote ? text.italic() : text
        }

        /// The `.important` nested hairline frames, pure geometry around the panel.
        private func importantFrames(
            palette: NockerlPalette,
            @ViewBuilder content: () -> some View
        ) -> some View {
            let hue = NockerlAlertIntent.info.color(in: palette)
            let outer = RoundedRectangle(cornerRadius: NockerlRadius.card, style: .continuous)
            let mid = RoundedRectangle(cornerRadius: NockerlRadius.panel, style: .continuous)
            let inner = RoundedRectangle(cornerRadius: NockerlRadius.control, style: .continuous)

            return content()
                .overlay(
                    inner.strokeBorder(
                        hue.opacity(NockerlCallout.frameMixes[2]),
                        lineWidth: NockerlSpace.spacePx
                    )
                )
                .padding(NockerlSpace.space1)
                .overlay(
                    mid.strokeBorder(
                        hue.opacity(NockerlCallout.frameMixes[1]),
                        lineWidth: NockerlSpace.spacePx
                    )
                )
                .padding(NockerlSpace.space2)
                .overlay(
                    outer.strokeBorder(
                        hue.opacity(NockerlCallout.frameMixes[0]),
                        lineWidth: NockerlSpace.spacePx
                    )
                )
                .overlay(alignment: .top) {
                    Rectangle()
                        .fill(palette.surfaceHighlight)
                        .frame(height: NockerlSpace.spacePx)
                        .padding(.horizontal, NockerlRadius.card)
                }
        }
    }
}
