// NockerlInfoTip: a themed informational popover behind a small ⓘ trigger (
// gate 2), the settings-surface companion (it rides ``NockerlFormSection``'s
// headerAccessory slot). Voice's InfoTip is the INPUT; this is the fresh-spec'd
// system piece:
//
//   - Trigger: a flat ⓘ glyph button. It is INTERACTIVE, so it wears the plain
//     interactive treatment (the icon-interactivity canon: inset styling is
//     reserved for informational, non-interactive marks and never a trigger).
//   - Panel: the `cardSurface2` popover plane, clamped at the `size.container.md`
//     token (Voice's raw 250px, tokenized). Presented via the PLATFORM popover
//     (honor-the-platform: the system anchoring/chrome stays native; the content
//     plane is ours).

import SwiftUI

/// A themed info popover behind a flat ⓘ trigger. Tap toggles; the platform
/// popover handles anchoring + dismissal.
public struct NockerlInfoTip: View {
    private let title: String?
    private let text: String
    private let accessibilityName: String

    @State private var open = false
    @Environment(\.colorScheme) private var colorScheme

    /// Create an info tip.
    /// - Parameters:
    ///   - title: optional short heading above the body.
    ///   - text: the informational body.
    ///   - accessibilityName: the trigger's a11y name (default "More information").
    public init(
        title: String? = nil,
        text: String,
        accessibilityName: String = "More information"
    ) {
        self.title = title
        self.text = text
        self.accessibilityName = accessibilityName
    }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)

        Button {
            open.toggle()
        } label: {
            Image(systemName: "info.circle")
                .font(.system(size: NockerlFontSize.size12, weight: .medium))
                .foregroundColor(palette.onCardMuted)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityName)
        .popover(isPresented: $open) {
            NockerlInfoTipPanel(title: title, text: text)
        }
    }
}

/// The info tip's panel, public so custom hosts (and static previews) can
/// compose the exact same themed content the popover presents.
public struct NockerlInfoTipPanel: View {
    private let title: String?
    private let text: String

    @Environment(\.colorScheme) private var colorScheme

    /// Create the panel.
    /// - Parameters:
    ///   - title: optional short heading above the body.
    ///   - text: the informational body.
    public init(title: String? = nil, text: String) {
        self.title = title
        self.text = text
    }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)

        VStack(alignment: .leading, spacing: NockerlSpace.space1) {
            if let title {
                Text(title)
                    .font(.nockerl(size: NockerlFontSize.size12, weight: .medium))
                    .foregroundColor(palette.onCard)
            }
            Text(text)
                .font(.nockerl(size: NockerlFontSize.size12, weight: .light))
                .foregroundColor(palette.onCardMuted)
        }
        .padding(NockerlSpace.space3)
        .frame(width: NockerlSize.containerMd, alignment: .leading)
        .background(palette.cardSurface2)
    }
}
