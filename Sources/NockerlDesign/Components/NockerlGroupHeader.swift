// NockerlGroupHeader: the section-overline label that opens a group of rows.
//
// The classic grouped-section header (the macOS "GENERAL" / "ACCOUNT" overline): a small
// UPPERCASE muted caps label heading a settings group / list section, with an OPTIONAL
// trailing slot (a count badge, a small "See all" action) pinned to the far edge.
//
// Laws honored:
//   - The label is the §11 EYEBROW treatment: the shared `eyebrow` type role (Outfit 500 /
//     12pt, since v1.18.0 unified the section overline to ONE role at the 500 bold cap; this
//     header was the lone 300 outlier), UPPERCASE, with the EYEBROW tracking
//     (`font-tracking-eyebrow` = 0em). The §11 exception: tiny overline/eyebrow caps carry
//     their OWN neutral legibility tracking, NOT the button's −0.03em tightening (which
//     over-condenses a small overline). Ink is `onCanvasMuted`. A header is structure, never
//     status, so it stays neutral-muted (no warm, no cyan).
//   - Rhythm: `space4` (16) ABOVE, `space2` (8) BELOW. The header sits closer to the group
//     it opens than to the block above it.
//   - TOKEN-PURE: every size / space / color is a token; the eyebrow tracking matches the
//     generated `font-tracking-eyebrow` (0em) the web binds for its overline labels.

import SwiftUI

/// A section-overline header: an uppercase muted caps label + an optional trailing accessory.
public struct NockerlGroupHeader<Trailing: View>: View {
    private let title: String
    private let tightTop: Bool
    private let trailing: Trailing

    @Environment(\.colorScheme) private var colorScheme

    /// Create a group header.
    /// - Parameters:
    ///   - title: the section label (rendered UPPERCASE, muted).
    ///   - tightTop: drop the 16pt top padding (to 0) for the FIRST group in a container,
    ///     where the standard between-groups top rhythm would push the header off the top edge.
    ///     Default `false` preserves the 16pt top padding (correct BETWEEN groups).
    ///   - trailing: an optional trailing accessory (a count `NockerlBadge`, a small action),
    ///     pinned to the far trailing edge across from the label.
    public init(_ title: String, tightTop: Bool = false, @ViewBuilder trailing: () -> Trailing) {
        self.title = title
        self.tightTop = tightTop
        self.trailing = trailing()
    }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        HStack(alignment: .firstTextBaseline, spacing: NockerlSpace.space2) {
            Text(title.uppercased())
                // §11 eyebrow exception: the neutral `font-tracking-eyebrow` (0em) legibility
                // tracking, NOT the button's −0.03em tightening (which over-condenses a tiny
                // overline). 0em IS SwiftUI's default, so no `.tracking(_:)` call is needed
                // (also keeps it macOS-12 safe: `Text.tracking` is macOS-13+).
                .nockerlType(.eyebrow)
                .foregroundColor(palette.onCanvasMuted)
            Spacer(minLength: 0)
            trailing
        }
        // 16pt ABOVE BETWEEN groups; `tightTop` drops it to 0 for the FIRST group in a
        // container (where the between-groups rhythm would waste the top edge).
        .padding(.top, tightTop ? 0 : NockerlSpace.space4)
        .padding(.bottom, NockerlSpace.space2)
    }
}

// The common case: a bare section label with no trailing accessory.
extension NockerlGroupHeader where Trailing == EmptyView {
    /// Create a group header with no trailing accessory.
    /// - Parameters:
    ///   - title: the section label (rendered UPPERCASE, muted).
    ///   - tightTop: drop the 16pt top padding (to 0) for the FIRST group in a container.
    ///     Default `false` preserves the 16pt top padding.
    public init(_ title: String, tightTop: Bool = false) {
        self.init(title, tightTop: tightTop) { EmptyView() }
    }
}
