// NockerlSegmented: the standardized segmented control on Swift. REDUCE-FILLS
// (ratified: "state by OUTLINE, not fill"): the ratified solid sliding cyan pill
// is retired. The SELECTED segment now reads via a CYAN BORDER + CYAN INK, and the track
// is a FLAT NEUTRAL HAIRLINE container (zero fill) grouping the segments as connected peers.
//
//   - Track: a NEUTRAL `divider` hairline container on the 12pt control radius. ZERO fill,
//     no recessed inset-shade. It groups the segments as connected peers; strip it and the
//     control degrades to Tabs (the connected-peers track IS what makes it "segmented").
//   - Indicator: the SELECTED segment wears a thin `accentPrimary` BORDER (no fill) that
//     SLIDES between segments via `matchedGeometryEffect`, a position-only transform
//     (design-laws §7); nothing tweens its color.
//   - Labels: selected = `accentPrimary` (cyan-on-plain, because the prior on-accent pick
//     is moot with no fill to sit on) at medium weight; unselected = muted canvas ink.
//
// Capability union (matching Compose `NockerlSegmented`): per-segment leading icons,
// per-segment disable, and the SM density tier for tight settings rows. Tokens-pure;
// feedback honors the platform (design-laws §7).

import SwiftUI

/// The segmented density tiers: the default control vs the dense tier
/// for tight settings rows.
public enum NockerlSegmentedSize {
    /// Dense: tight settings rows (10pt label, 4pt vertical rhythm).
    case sm
    /// Default (12pt label, the ratified 6pt rhythm).
    case md

    var fontSize: CGFloat {
        switch self {
        case .sm: return NockerlFontSize.size10
        case .md: return NockerlFontSize.size12
        }
    }

    var verticalPadding: CGFloat {
        switch self {
        case .sm: return NockerlSpace.space1
        case .md: return NockerlSpace.space1 + 2
        }
    }

    var iconSize: CGFloat {
        switch self {
        case .sm: return 11
        case .md: return 12
        }
    }
}

/// The token-driven segmented control, a cyan-outlined selected segment on a neutral
/// hairline track (reduce-fills: state by outline, not fill).
public struct NockerlSegmented<T: Hashable>: View {
    private let options: [T]
    private let selected: T
    private let onSelect: (T) -> Void
    private let label: (T) -> String
    private let icon: ((T) -> String?)?
    private let segmentEnabled: (T) -> Bool
    private let size: NockerlSegmentedSize

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.isEnabled) private var isEnabled
    @Namespace private var pillNamespace

    /// Create a segmented control.
    /// - Parameters:
    ///   - options: the segments, in order.
    ///   - selected: the currently-active option.
    ///   - label: maps an option to its display string.
    ///   - icon: optional per-segment leading SF Symbol name; `nil` = labels only.
    ///   - segmentEnabled: per-segment enablement. A disabled segment dims and
    ///     ignores taps while the rest stay live (defaults to all enabled).
    ///   - size: the density tier (defaults to ``NockerlSegmentedSize/md``).
    ///   - onSelect: invoked with the tapped option.
    public init(
        options: [T],
        selected: T,
        label: @escaping (T) -> String,
        icon: ((T) -> String?)? = nil,
        segmentEnabled: @escaping (T) -> Bool = { _ in true },
        size: NockerlSegmentedSize = .md,
        onSelect: @escaping (T) -> Void
    ) {
        self.options = options
        self.selected = selected
        self.label = label
        self.icon = icon
        self.segmentEnabled = segmentEnabled
        self.size = size
        self.onSelect = onSelect
    }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        let innerShape = RoundedRectangle(
            cornerRadius: NockerlRadius.control - trackInset,
            style: .continuous
        )
        let trackShape = RoundedRectangle(cornerRadius: NockerlRadius.control, style: .continuous)

        HStack(spacing: 0) {
            ForEach(options, id: \.self) { option in
                segment(option, palette: palette, innerShape: innerShape)
            }
        }
        // The selected border SLIDES between segments, one animated transform (law §7).
        .animation(.nockerlStandard(NockerlMotionDuration.base), value: selected)
        .padding(trackInset)
        // Reduce-fills (law §6): the track is a FLAT NEUTRAL HAIRLINE container (ZERO fill,
        // no recessed inset-shade), grouping the segments as connected peers (strip it and the
        // control degrades to Tabs). Selection reads via the cyan segment border + ink.
        .clipShape(trackShape)
        .overlay {
            trackShape.strokeBorder(palette.divider, lineWidth: NockerlSpace.spacePx)
        }
        .opacity(isEnabled ? 1 : disabledAlpha)
    }

    @ViewBuilder
    private func segment(
        _ option: T,
        palette: NockerlPalette,
        innerShape: RoundedRectangle
    ) -> some View {
        let active = option == selected
        let live = isEnabled && segmentEnabled(option)
        // Reduce-fills: no fill to sit on, so the SELECTED ink is CYAN-on-plain (the prior
        // on-accent pick is moot); unselected stays neutral muted canvas ink.
        let ink: Color = active ? palette.accentPrimary : palette.onCanvasMuted

        ZStack {
            if active {
                // Reduce-fills (law §6): the SELECTED segment reads via a CYAN BORDER (no
                // fill). matchedGeometryEffect slides the border between segments, a
                // position-only transform (law §7), never a fill tween.
                // "which peer is active" is a SELECTION state, so the edge takes
                // `widthSelection` @ `opacity.selection` like every other choice border.
                innerShape
                    .strokeBorder(
                        palette.accentPrimary.opacity(NockerlBorderOpacity.selection),
                        lineWidth: NockerlBorder.widthSelection
                    )
                    .matchedGeometryEffect(id: "nockerlSegmentedPill", in: pillNamespace)
            }

            HStack(spacing: NockerlSpace.space1) {
                if let symbol = icon?(option) {
                    Image(systemName: symbol)
                        .font(.system(size: size.iconSize, weight: .medium))
                }
                Text(label(option))
                    .font(.nockerl(size: size.fontSize, weight: active ? .medium : .regular))
            }
            .foregroundColor(ink)
            .padding(.vertical, size.verticalPadding)
            .opacity(live ? 1 : disabledAlpha)
        }
        .frame(maxWidth: .infinity)
        .contentShape(Rectangle())
        .onTapGesture {
            if live { onSelect(option) }
        }
        .accessibilityAddTraits(active ? [.isSelected] : [])
        .accessibilityLabel(label(option))
    }

    /// The selected border nests 2pt inside the hairline track (border radius 12 − 2 = 10),
    /// so the sliding cyan edge never collides with the container's hairline.
    private var trackInset: CGFloat { NockerlSpace.space05 }

    private var disabledAlpha: Double { 0.38 }
}
