// NockerlEmptyState: the centered placeholder for an otherwise-empty region (a
// whole list / sheet / thread): the ratified INSET-icon mark (NockerlInsetIcon)
// over a title over an optional description over an optional action. The first
// host of the inset-icon canon. Mirrors the Compose NockerlEmptyState.

import SwiftUI

/// A centered empty-state placeholder (see the file header). The inset mark sinks
/// (informational, law: never a lifted badge); the title carries the
/// meaning, so the mark is decorative.
public struct NockerlEmptyState<Action: View>: View {
    private let systemImage: String
    private let title: String
    private let description: String?
    private let tone: NockerlInsetIconTone
    private let action: Action?

    /// Create an empty state with a trailing action.
    /// - Parameters:
    ///   - systemImage: the informational SF Symbol (rendered in the inset well).
    ///   - title: the headline ("No sessions yet").
    ///   - description: an optional supporting line.
    ///   - tone: the inset-well tint (default neutral; brand for first-run, error
    ///     for failure states).
    ///   - action: an optional trailing action (typically a ``NockerlButton``).
    public init(
        systemImage: String,
        title: String,
        description: String? = nil,
        tone: NockerlInsetIconTone = .neutral,
        @ViewBuilder action: () -> Action
    ) {
        self.systemImage = systemImage
        self.title = title
        self.description = description
        self.tone = tone
        self.action = action()
    }

    public var body: some View {
        EmptyStateBody(
            systemImage: systemImage,
            title: title,
            description: description,
            tone: tone,
            action: action
        )
    }

    private struct EmptyStateBody: View {
        let systemImage: String
        let title: String
        let description: String?
        let tone: NockerlInsetIconTone
        let action: Action?

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)

            VStack(spacing: NockerlSpace.space3) {
                // Decorative: the title carries the accessible meaning (law §13).
                NockerlInsetIcon(systemName: systemImage, tone: tone)

                Text(title)
                    .font(.nockerl(size: NockerlFontSize.size20, weight: .regular))
                    .foregroundColor(palette.onCard)
                    .multilineTextAlignment(.center)

                if let description {
                    Text(description)
                        .font(.nockerl(size: NockerlFontSize.size14, weight: .light))
                        .foregroundColor(palette.onCardMuted)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if let action {
                    action.padding(.top, NockerlSpace.space1)
                }
            }
        }
    }
}

public extension NockerlEmptyState where Action == EmptyView {
    /// Create an empty state with no action.
    init(
        systemImage: String,
        title: String,
        description: String? = nil,
        tone: NockerlInsetIconTone = .neutral
    ) {
        self.init(
            systemImage: systemImage,
            title: title,
            description: description,
            tone: tone,
            action: { EmptyView() }
        )
    }
}
