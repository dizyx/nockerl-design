// NockerlFlowLayout: the wrapping flow layout for chip strips. Voice's
// FlowLayout is the INPUT; this is the package-owned equivalent so chip walls
// (vocabulary tags, filter sets) wrap identically everywhere without each client
// hand-rolling the measurement pass.
//
// Availability-gated to the `Layout` protocol (macOS 13 / iOS 16). Earlier
// deployments keep using their own container until they raise their floor.
// The package itself stays at its published minimum.

import SwiftUI

/// A leading-aligned wrapping flow: children lay out left-to-right and wrap to
/// a new line when the width is exhausted (the chip-wall container).
@available(macOS 13.0, iOS 16.0, *)
public struct NockerlFlowLayout: Layout {
    private let spacing: CGFloat
    private let lineSpacing: CGFloat

    /// Create a flow layout.
    /// - Parameters:
    ///   - spacing: horizontal gap between items (defaults to `space.2`).
    ///   - lineSpacing: vertical gap between wrapped lines (defaults to `space.2`).
    public init(
        spacing: CGFloat = NockerlSpace.space2,
        lineSpacing: CGFloat = NockerlSpace.space2
    ) {
        self.spacing = spacing
        self.lineSpacing = lineSpacing
    }

    public func sizeThatFits(
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var lineHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            // Same wrap rule as placeSubviews: keep the two passes symmetric.
            if x > 0, x + spacing + size.width > width {
                x = 0
                y += lineHeight + lineSpacing
                lineHeight = 0
            }
            x += (x > 0 ? spacing : 0) + size.width
            maxX = max(maxX, x)
            lineHeight = max(lineHeight, size.height)
        }
        return CGSize(width: width.isFinite ? width : maxX, height: y + lineHeight)
    }

    public func placeSubviews(
        in bounds: CGRect,
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) {
        let width = bounds.width
        var x: CGFloat = 0
        var y: CGFloat = 0
        var lineHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > 0, x + spacing + size.width > width {
                x = 0
                y += lineHeight + lineSpacing
                lineHeight = 0
            }
            let originX = bounds.minX + x + (x > 0 ? spacing : 0)
            subview.place(
                at: CGPoint(x: originX, y: bounds.minY + y),
                anchor: .topLeading,
                proposal: .unspecified
            )
            x = originX - bounds.minX + size.width
            lineHeight = max(lineHeight, size.height)
        }
    }
}
