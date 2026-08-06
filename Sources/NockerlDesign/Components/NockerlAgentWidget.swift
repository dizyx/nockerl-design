// NockerlAgentWidget: the compact agent-run card on Swift (a mirror of the Compose canon,
// to the Compose canon): IDENTITY-led (initials avatar + name + mono model
// badge) where the spawn block is mechanism-led (family tile); the shared
// lifecycle chip trails; optional one-line detail under the name.

import SwiftUI

/// The compact "an agent is working" card.
public struct NockerlAgentWidget: View {
    private let name: String
    private let status: NockerlSpawnStatus
    private let model: String?
    private let elapsed: String?
    private let detail: String?
    private let animate: Bool
    private let statusLabel: String?

    @Environment(\.colorScheme) private var colorScheme

    /// Create an agent-run widget.
    public init(
        name: String,
        status: NockerlSpawnStatus,
        model: String? = nil,
        elapsed: String? = nil,
        detail: String? = nil,
        animate: Bool = true,
        statusLabel: String? = nil
    ) {
        self.name = name
        self.status = status
        self.model = model
        self.elapsed = elapsed
        self.detail = detail
        self.animate = animate
        self.statusLabel = statusLabel
    }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        let shape = RoundedRectangle(cornerRadius: NockerlRadius.panel, style: .continuous)

        HStack(alignment: .center, spacing: NockerlSpace.space2 + 2) {
            NockerlAvatar(name: name)
            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: NockerlSpace.space2) {
                    Text(name)
                        .font(.nockerl(size: NockerlFontSize.size12, weight: .medium))
                        .foregroundColor(palette.onCard)
                    if let model {
                        NockerlBadge(model, tone: .accent, mono: true)
                    }
                }
                if let detail {
                    Text(detail)
                        .font(.nockerl(size: NockerlFontSize.size12, weight: .light))
                        .foregroundColor(palette.onCardMuted)
                }
            }
            Spacer(minLength: 0)
            NockerlSpawnStatusChip(status: status, elapsed: elapsed, animate: animate, label: statusLabel)
        }
        .padding(NockerlSpace.space3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(palette.cardSurface1)
        .overlay(alignment: .top) {
            Rectangle().fill(palette.surfaceHighlight).frame(height: NockerlSpace.spacePx)
        }
        .clipShape(shape)
        .overlay { shape.strokeBorder(palette.cardHairline, lineWidth: NockerlSpace.spacePx) }
        .shadow(
            color: palette.shadowTint.opacity(NockerlShadowTintAlpha.level1),
            radius: NockerlElevation.level1,
            x: 0,
            y: NockerlElevation.level1 / 2
        )
    }
}
