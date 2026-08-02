// NockerlBanner: the inline alert card for SwiftUI (banner.mdx).
//
// A LIFTED card that pushes content (never floats): solid `cardSurface1` on the 12pt
// panel radius, a level-2 NEUTRAL drop + 1pt top catch-light, led by the
// ``NockerlStatusDisc`` coin. Status lives in the disc, never a left rail (law §6).
// The border is a whisper of the intent: the hairline mixed 22% toward the hue.
//
// A11y: color is never alone. Disc + optional title + message carry the state
// (law §13); the action and dismiss are real focusable controls. The host owns
// remove/exit motion (interpolatable props only, law §7).

import SwiftUI

/// The inline alert banner. Static content; the HOST inserts/removes it.
public struct NockerlBanner: View {
    private let message: String
    private let intent: NockerlAlertIntent
    private let title: String?
    private let showIcon: Bool
    private let actionLabel: String?
    private let onAction: (() -> Void)?
    private let onDismiss: (() -> Void)?

    /// Create a banner.
    /// - Parameters:
    ///   - message: the banner body (required, since it IS the accessible text).
    ///   - intent: the alert intent (defaults to ``NockerlAlertIntent/info``).
    ///   - title: optional short title, intent-colored at the 500 cap.
    ///   - showIcon: render the leading status disc (default true).
    ///   - actionLabel: optional inline action label (renders a ghost button).
    ///   - onAction: invoked when the action is tapped.
    ///   - onDismiss: when non-nil, a dismiss ✕ renders; the host removes the banner.
    public init(
        message: String,
        intent: NockerlAlertIntent = .info,
        title: String? = nil,
        showIcon: Bool = true,
        actionLabel: String? = nil,
        onAction: (() -> Void)? = nil,
        onDismiss: (() -> Void)? = nil
    ) {
        self.message = message
        self.intent = intent
        self.title = title
        self.showIcon = showIcon
        self.actionLabel = actionLabel
        self.onAction = onAction
        self.onDismiss = onDismiss
    }

    public var body: some View {
        BannerBody(
            message: message,
            intent: intent,
            title: title,
            showIcon: showIcon,
            actionLabel: actionLabel,
            onAction: onAction,
            onDismiss: onDismiss
        )
    }

    private struct BannerBody: View {
        let message: String
        let intent: NockerlAlertIntent
        let title: String?
        let showIcon: Bool
        let actionLabel: String?
        let onAction: (() -> Void)?
        let onDismiss: (() -> Void)?

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let hue = intent.color(in: palette)
            let shape = RoundedRectangle(cornerRadius: NockerlRadius.panel, style: .continuous)

            HStack(spacing: NockerlSpace.space3) {
                if showIcon {
                    NockerlStatusDisc(intent: intent)
                }
                VStack(alignment: .leading, spacing: NockerlSpace.space05) {
                    if let title {
                        Text(title)
                            .font(.nockerl(size: NockerlFontSize.size14, weight: .medium))
                            .foregroundColor(hue)
                    }
                    Text(message)
                        .font(.nockerl(size: NockerlFontSize.size14, weight: .light))
                        .foregroundColor(title == nil ? palette.onCard : palette.onCardMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                if let actionLabel, let onAction {
                    NockerlButton(actionLabel, variant: .ghost, action: onAction)
                }
                if let onDismiss {
                    NockerlIconButton(Image(systemName: "xmark"), label: "Dismiss", action: onDismiss)
                }
            }
            .padding(.horizontal, NockerlSpace.space4)
            .padding(.vertical, NockerlSpace.space3)
            .background(palette.cardSurface1)
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(palette.surfaceHighlight)
                    .frame(height: NockerlSpace.spacePx)
            }
            .clipShape(shape)
            .overlay(
                shape.strokeBorder(
                    NockerlContrast.mix(hue, into: palette.cardHairline, fraction: NockerlAlertMetrics.bannerBorderMix),
                    lineWidth: NockerlSpace.spacePx
                )
            )
            .shadow(
                color: palette.shadowTint.opacity(NockerlCardElevation.level2.tintAlpha),
                radius: NockerlElevation.level2,
                x: 0,
                y: NockerlElevation.level2 / 2
            )
        }
    }
}
