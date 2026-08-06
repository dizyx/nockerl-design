// NockerlFormSection: the ratified lifted-card treatment for grouped fields.
//
// A form section = an uppercase eyebrow title (the sanctioned overline exception,
// law §11) + optional description, with the fields on a ``NockerlCard`` at the shared
// 12pt interior rhythm. This settles the Android flat-divider vs Voice lifted-card
// split: the CARD wins on every platform (form-layout.mdx).
//
// Settings grammar: this IS the "SettingsCard", the settings-section usage
// of the one form-section component. Two optional slots complete it: a header
// accessory (trailing the eyebrow title, where an info tip rides) and a footer
// (inside the card under a hairline: hints or section actions).

import SwiftUI

/// A titled, lifted form section. Fields stack inside a ``NockerlCard`` at the
/// shared 12pt rhythm; pad-free callers get the 16pt card inset for free.
public struct NockerlFormSection<Content: View>: View {
    private let title: String
    private let description: String?
    private let elevation: NockerlCardElevation
    private let headerAccessory: AnyView?
    private let footer: AnyView?
    private let content: Content

    /// Create a form section.
    /// - Parameters:
    ///   - title: the section title (rendered uppercase).
    ///   - description: optional supporting line under the title.
    ///   - elevation: the wrapped ``NockerlCard``'s ladder rung, which lets a consumer place
    ///     the section at any rung (e.g. `.level3` when it floats over other content).
    ///     Default ``NockerlCardElevation/level2`` preserves the ratified lifted-card lift.
    ///   - headerAccessory: optional trailing header slot (e.g. an info tip).
    ///   - footer: optional card footer under a hairline (hint text / actions).
    ///   - content: the section's fields.
    public init(
        _ title: String,
        description: String? = nil,
        elevation: NockerlCardElevation = .level2,
        headerAccessory: AnyView? = nil,
        footer: AnyView? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.description = description
        self.elevation = elevation
        self.headerAccessory = headerAccessory
        self.footer = footer
        self.content = content()
    }

    public var body: some View {
        SectionBody(
            title: title,
            description: description,
            elevation: elevation,
            headerAccessory: headerAccessory,
            footer: footer
        ) { content }
    }

    private struct SectionBody<Inner: View>: View {
        let title: String
        let description: String?
        let elevation: NockerlCardElevation
        let headerAccessory: AnyView?
        let footer: AnyView?
        @ViewBuilder let inner: () -> Inner

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)

            VStack(alignment: .leading, spacing: NockerlSpace.space2) {
                HStack(alignment: .center, spacing: NockerlSpace.space2) {
                    VStack(alignment: .leading, spacing: NockerlSpace.space05) {
                        Text(title.uppercased())
                            // The shared §11 `eyebrow` role (v1.18.0): Outfit 500 / 12pt,
                            // ONE role across every section header (was a hardcoded 12/.medium).
                            .nockerlType(.eyebrow)
                            .foregroundColor(palette.onCardMuted)
                        if let description {
                            Text(description)
                                .font(.nockerl(size: NockerlFontSize.size12, weight: .light))
                                .foregroundColor(palette.onCardMuted)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    if let headerAccessory {
                        headerAccessory
                    }
                }
                NockerlCard(elevation: elevation) {
                    VStack(alignment: .leading, spacing: 0) {
                        VStack(alignment: .leading, spacing: NockerlSpace.space3) {
                            inner()
                        }
                        .padding(NockerlSpace.space4)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        if let footer {
                            // The footer zone: a hairline, then the muted footer rhythm.
                            Rectangle()
                                .fill(palette.cardHairline)
                                .frame(height: NockerlSpace.spacePx)
                            footer
                                .padding(.horizontal, NockerlSpace.space4)
                                .padding(.vertical, NockerlSpace.space2 + 2)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                }
            }
        }
    }
}
