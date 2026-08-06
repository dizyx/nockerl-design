// NockerlSpawnCards: the agent-spawn surfaces on Swift (mirror, to
// the Compose canon): tool-card-family siblings. The family TILE leads, the
// lifecycle chip (dot + label + elapsed) trails, children stack at the card
// rhythm. Lifecycle: RUNNING = info-cyan pulsing dot, SUCCESS / ERROR = warm
// status; `animate: false` freezes the pulse.

import SwiftUI

/// The spawn lifecycle ladder, shared by the spawn cards and the agent widget.
public enum NockerlSpawnStatus {
    /// The spawn is live: info-cyan, pulsing dot.
    case running
    /// Completed cleanly.
    case success
    /// Failed.
    case error

    var label: String {
        switch self {
        case .running: return "Running"
        case .success: return "Done"
        case .error: return "Failed"
        }
    }

    var dotStatus: NockerlStatusDotStatus {
        switch self {
        case .running: return .info
        case .success: return .success
        case .error: return .error
        }
    }

    func color(in palette: NockerlPalette) -> Color {
        switch self {
        case .running: return palette.statusInfo
        case .success: return palette.statusSuccess
        case .error: return palette.statusError
        }
    }
}

/// The parent spawn block: agent-family tile + title/subtitle + lifecycle chip
/// + a children slot.
public struct NockerlSpawnBlockCard<Children: View>: View {
    private let title: String
    private let subtitle: String?
    private let status: NockerlSpawnStatus
    private let elapsed: String?
    private let animate: Bool
    private let statusLabel: String?
    private let children: Children?

    @Environment(\.colorScheme) private var colorScheme

    /// Create a spawn block.
    public init(
        title: String,
        status: NockerlSpawnStatus,
        subtitle: String? = nil,
        elapsed: String? = nil,
        animate: Bool = true,
        statusLabel: String? = nil,
        @ViewBuilder children: () -> Children
    ) {
        self.title = title
        self.subtitle = subtitle
        self.status = status
        self.elapsed = elapsed
        self.animate = animate
        self.statusLabel = statusLabel
        self.children = children()
    }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        let shape = RoundedRectangle(cornerRadius: NockerlRadius.panel, style: .continuous)

        VStack(alignment: .leading, spacing: NockerlSpace.space2) {
            HStack(spacing: NockerlSpace.space2 + 2) {
                SpawnFamilyTile()
                VStack(alignment: .leading, spacing: 1) {
                    Text(title)
                        .font(.nockerl(size: NockerlFontSize.size12, weight: .medium))
                        .foregroundColor(palette.onCard)
                    if let subtitle {
                        Text(subtitle)
                            .font(.nockerl(size: NockerlFontSize.size12, weight: .light))
                            .foregroundColor(palette.onCardMuted)
                    }
                }
                Spacer(minLength: 0)
                NockerlSpawnStatusChip(status: status, elapsed: elapsed, animate: animate, label: statusLabel)
            }
            if let children {
                VStack(alignment: .leading, spacing: NockerlSpace.space1 + 2) {
                    children
                }
            }
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

/// Childless convenience: no children slot at all (no phantom spacing).
public extension NockerlSpawnBlockCard where Children == EmptyView {
    init(
        title: String,
        status: NockerlSpawnStatus,
        subtitle: String? = nil,
        elapsed: String? = nil,
        animate: Bool = true,
        statusLabel: String? = nil
    ) {
        self.title = title
        self.subtitle = subtitle
        self.status = status
        self.elapsed = elapsed
        self.animate = animate
        self.statusLabel = statusLabel
        self.children = nil
    }
}

/// One spawned child row: status dot, name, mono model badge, trailing elapsed.
public struct NockerlSpawnChildCard: View {
    private let name: String
    private let status: NockerlSpawnStatus
    private let model: String?
    private let elapsed: String?
    private let animate: Bool

    @Environment(\.colorScheme) private var colorScheme

    /// Create a child row.
    public init(
        name: String,
        status: NockerlSpawnStatus,
        model: String? = nil,
        elapsed: String? = nil,
        animate: Bool = true
    ) {
        self.name = name
        self.status = status
        self.model = model
        self.elapsed = elapsed
        self.animate = animate
    }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        let shape = RoundedRectangle(cornerRadius: NockerlRadius.control, style: .continuous)

        HStack(spacing: NockerlSpace.space2) {
            NockerlStatusDot(
                status: status.dotStatus,
                pulse: animate && status == .running
            )
            Text(name)
                .font(.nockerl(size: NockerlFontSize.size12))
                .foregroundColor(palette.onCard)
            if let model {
                NockerlBadge(model, tone: .accent, mono: true)
            }
            Spacer(minLength: 0)
            if let elapsed {
                Text(elapsed)
                    .font(.nockerl(size: NockerlFontSize.size10))
                    .foregroundColor(palette.onCardMuted)
            }
        }
        .padding(.horizontal, NockerlSpace.space2 + 2)
        .padding(.vertical, NockerlSpace.space2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(palette.cardSurface2)
        .clipShape(shape)
        .overlay { shape.strokeBorder(palette.cardHairline, lineWidth: NockerlSpace.spacePx) }
    }
}

/// The spawn lifecycle chip: dot + label (+ elapsed); color never alone.
struct NockerlSpawnStatusChip: View {
    let status: NockerlSpawnStatus
    let elapsed: String?
    let animate: Bool
    /// Overrides the default English `status.label` (1.0 strings stance).
    var label: String? = nil

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        HStack(spacing: NockerlSpace.space1 + 2) {
            NockerlStatusDot(
                status: status.dotStatus,
                pulse: animate && status == .running
            )
            Text(label ?? status.label)
                .font(.nockerl(size: NockerlFontSize.size10, weight: .medium))
                .foregroundColor(status.color(in: palette))
            if let elapsed {
                Text(elapsed)
                    .font(.nockerl(size: NockerlFontSize.size10))
                    .foregroundColor(palette.onCardMuted)
            }
        }
    }
}

/// The agent-family TILE: the spawn glyph knocked out of the filled
/// `familyAgent` control-radius square (law §6; the tool-card tile idiom).
private struct SpawnFamilyTile: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        ZStack {
            RoundedRectangle(cornerRadius: NockerlRadius.control - 2, style: .continuous)
                .fill(palette.familyAgent)
            RoundedRectangle(cornerRadius: NockerlRadius.control - 2, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [palette.surfaceHighlight, .clear],
                        startPoint: .top,
                        endPoint: .center
                    ),
                    lineWidth: NockerlSpace.spacePx
                )
            Image(systemName: "point.3.connected.trianglepath.dotted")
                .font(.system(size: NockerlFontSize.size12, weight: .medium))
                .foregroundColor(palette.canvas)
        }
        .frame(width: 28, height: 28)
    }
}
