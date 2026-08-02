// NockerlToast: the transient floating notification card for SwiftUI (toast.mdx).
//
// One tier above the banner: `cardSurface2` fill on the panel radius, the LEVEL-4
// sheet drop (it floats over everything) + catch-light, led by the
// ``NockerlStatusDisc`` coin with the intent whispered onto the hairline (20%).
//
// SCOPE is the view only: the countdown ring, pause-on-focus, and entry/exit motion
// are HOST machinery (a toast host needs an overlay root the library cannot own),
// but the CONTRACT is ratified (r2, A2) and ships here: ``NockerlToastDuration``
// (short / base / long / persistent) and ``NockerlToastDuration/stackMax`` (3,
// newest on top). A host consumes both.

import SwiftUI

/// The RATIFIED toast duration vocabulary (r2, A2). `base` is the web-shipped
/// 5-second default; `short`/`long` are the ramp around it; `persistent` never
/// times out (the host shows the pin marker instead of the countdown ring).
public enum NockerlToastDuration: Equatable, CaseIterable {
    /// Quick confirmations ("Saved.").
    case short
    /// The default (the web-shipped 5s).
    case base
    /// Messages that carry an action worth reading.
    case long
    /// Never times out. Waits for an explicit dismiss.
    case persistent

    /// Timeout in seconds, or `nil` for persistent.
    public var seconds: TimeInterval? {
        switch self {
        case .short: return 3
        case .base: return 5
        case .long: return 8
        case .persistent: return nil
        }
    }

    /// Maximum simultaneously-visible toasts: newest on top, older drop (r2, A2).
    public static let stackMax = 3
}

/// The transient toast card. Static content; the HOST presents, times, and removes it.
public struct NockerlToast: View {
    private let message: String
    private let intent: NockerlAlertIntent
    private let title: String?
    private let showIcon: Bool
    private let actionLabel: String?
    private let onAction: (() -> Void)?
    private let onDismiss: (() -> Void)?

    /// Create a toast card.
    /// - Parameters:
    ///   - message: the toast body (required, since it IS the accessible text).
    ///   - intent: the alert intent (defaults to ``NockerlAlertIntent/info``).
    ///   - title: optional short title, intent-colored at the 500 cap.
    ///   - showIcon: render the leading status disc (default true).
    ///   - actionLabel: optional inline action (the host dismisses after invoking).
    ///   - onAction: invoked when the action is tapped.
    ///   - onDismiss: when non-nil, a dismiss ✕ renders (the host removes).
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
        ToastBody(
            message: message,
            intent: intent,
            title: title,
            showIcon: showIcon,
            actionLabel: actionLabel,
            onAction: onAction,
            onDismiss: onDismiss
        )
    }

    private struct ToastBody: View {
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
                if let actionLabel, let onAction {
                    NockerlButton(actionLabel, variant: .ghost, action: onAction)
                }
                if let onDismiss {
                    NockerlIconButton(Image(systemName: "xmark"), label: "Dismiss", action: onDismiss)
                }
            }
            .padding(NockerlSpace.space3)
            .background(palette.cardSurface2)
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(palette.surfaceHighlight)
                    .frame(height: NockerlSpace.spacePx)
            }
            .clipShape(shape)
            .overlay(
                shape.strokeBorder(
                    NockerlContrast.mix(hue, into: palette.cardHairline, fraction: NockerlAlertMetrics.toastBorderMix),
                    lineWidth: NockerlSpace.spacePx
                )
            )
            .shadow(
                color: palette.shadowTint.opacity(NockerlCardElevation.level4.tintAlpha),
                radius: NockerlElevation.sheet,
                x: 0,
                y: NockerlElevation.sheet / 2
            )
        }
    }
}
