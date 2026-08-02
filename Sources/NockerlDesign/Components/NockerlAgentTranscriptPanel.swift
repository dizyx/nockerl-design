// NockerlAgentTranscriptPanel: the transcript composition SHELL on Swift (WS1
// #2652c mirror, to the Compose canon): keyed lazy rows, UTC day markers,
// auto-follow while at the bottom, and the floating jump-to-latest affordance
// (the solid accent circle, the cyan floating-layer identity).

import SwiftUI

/// One transcript entry.
public struct NockerlTranscriptItem: Identifiable {
    /// Stable identity (the lazy-row key, never an index).
    public let id: String
    /// Optional timestamp; consecutive items crossing a UTC day boundary get a
    /// day marker between them.
    public let epochMillis: Int64?
    /// The row content: any shipped cell.
    public let content: AnyView

    /// Create an entry.
    public init(id: String, epochMillis: Int64? = nil, @ViewBuilder content: () -> some View) {
        self.id = id
        self.epochMillis = epochMillis
        self.content = AnyView(content())
    }
}

/// The transcript shell: scrolling, day markers, auto-follow, jump-to-latest.
/// Give the panel a bounded height; rows stack in a lazy stack inside a
/// `ScrollViewReader` (the scroll hook that mirrors the Compose `listState`).
public struct NockerlAgentTranscriptPanel: View {
    private let items: [NockerlTranscriptItem]
    private let autoFollow: Bool
    private let dayLabel: (Int64) -> String
    private let jumpToLatestLabel: String

    @State private var atBottom = true
    @Environment(\.colorScheme) private var colorScheme

    private static let dayMillis: Int64 = 86_400_000

    /// Create the panel.
    /// - Parameters:
    ///   - items: the transcript, in order.
    ///   - autoFollow: keep pinned to the newest item while at the bottom.
    ///   - dayLabel: formats a day marker from the first millis of that day.
    ///   - jumpToLatestLabel: the affordance's a11y name (1.0 strings stance).
    public init(
        items: [NockerlTranscriptItem],
        autoFollow: Bool = true,
        dayLabel: @escaping (Int64) -> String = { "Day \($0 / 86_400_000)" },
        jumpToLatestLabel: String = "Jump to latest"
    ) {
        self.items = items
        self.autoFollow = autoFollow
        self.dayLabel = dayLabel
        self.jumpToLatestLabel = jumpToLatestLabel
    }

    private enum Row: Identifiable {
        case entry(NockerlTranscriptItem)
        case dayMarker(Int64)

        var id: String {
            switch self {
            case let .entry(item): return item.id
            case let .dayMarker(millis): return "day-\(millis)"
            }
        }
    }

    private var rows: [Row] {
        var out: [Row] = []
        var lastDay: Int64?
        for item in items {
            let day = item.epochMillis.map { $0 / Self.dayMillis }
            if let day, let last = lastDay, day != last {
                out.append(.dayMarker(day * Self.dayMillis))
            }
            if let day { lastDay = day }
            out.append(.entry(item))
        }
        return out
    }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        let allRows = rows

        ScrollViewReader { proxy in
            ZStack(alignment: .bottom) {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: NockerlSpace.space2) {
                        ForEach(allRows) { row in
                            switch row {
                            case let .entry(item):
                                item.content.id(row.id)
                            case let .dayMarker(millis):
                                DayMarkerRow(label: dayLabel(millis), palette: palette)
                                    .id(row.id)
                            }
                        }
                        // Bottom sentinel: visibility drives at-bottom tracking.
                        Color.clear
                            .frame(height: 1)
                            .id("nockerl-transcript-bottom")
                            .onAppear { atBottom = true }
                            .onDisappear { atBottom = false }
                    }
                    .padding(.vertical, NockerlSpace.space3)
                }
                .onChange(of: items.count) { _ in
                    if autoFollow, atBottom {
                        withAnimation(.nockerlStandard(NockerlMotionDuration.base)) {
                            proxy.scrollTo("nockerl-transcript-bottom", anchor: .bottom)
                        }
                    }
                }

                // The floating jump-back affordance: solid accent circle (§2
                // floating-layer identity), shown only while scrolled away.
                if !atBottom, !allRows.isEmpty {
                    Button {
                        withAnimation(.nockerlStandard(NockerlMotionDuration.base)) {
                            proxy.scrollTo("nockerl-transcript-bottom", anchor: .bottom)
                        }
                    } label: {
                        ZStack {
                            Circle().fill(palette.accentPrimary)
                            Image(systemName: "chevron.down")
                                .font(.system(size: NockerlFontSize.size12, weight: .semibold))
                                .foregroundColor(NockerlContrast.pickOn(palette.accentPrimary))
                        }
                        .frame(width: 36, height: 36)
                        .shadow(
                            color: palette.shadowTint.opacity(NockerlShadowTintAlpha.level3),
                            radius: NockerlElevation.level3,
                            x: 0,
                            y: NockerlElevation.level3 / 2
                        )
                    }
                    .buttonStyle(.plain)
                    .padding(.bottom, NockerlSpace.space2)
                    .accessibilityLabel(jumpToLatestLabel)
                }
            }
        }
    }
}

/// A day boundary: hairline + muted label + hairline.
private struct DayMarkerRow: View {
    let label: String
    let palette: NockerlPalette

    var body: some View {
        HStack(spacing: NockerlSpace.space2 + 2) {
            Rectangle().fill(palette.cardHairline).frame(height: NockerlSpace.spacePx)
            Text(label)
                .font(.nockerl(size: NockerlFontSize.size10))
                .foregroundColor(palette.onCanvasMuted)
                .fixedSize()
            Rectangle().fill(palette.cardHairline).frame(height: NockerlSpace.spacePx)
        }
        .padding(.vertical, NockerlSpace.space2)
    }
}
