// NockerlStatusDot: the semantic status-dot ladder for SwiftUI surfaces.
//
// Mirrors the ratified status dot (status-dot.mdx): a small filled disc whose hue names
// a state, with an optional visible label and an optional live PULSE. Two hue ladders:
//   - the semantic status ladder (success / warning / error / info / neutral), and
//   - a raw palette color (for the session-dot tokens: dotStreaming, dotAttention, …).
//
// Pulse (law §7): animates OPACITY only (1.0 ↔ 0.3), never a fill swap, and freezes
// under Reduce Motion. Duration is the RATIFIED 800ms motion value (Voice's
// old 600ms recording dot conforms at swap). The web-only "ping" ring is DROPPED by
// the same ruling: no platform implements it.
//
// A11y (law §13): state is never color-alone. The accessible name is the visible
// label when present, otherwise the status's own name.

import SwiftUI

/// The semantic status ladder for ``NockerlStatusDot``.
public enum NockerlStatusDotStatus: Equatable {
    /// Healthy / complete (`statusSuccess`).
    case success
    /// Needs attention (`statusWarning`).
    case warning
    /// Failed / blocked (`statusError`).
    case error
    /// Informational (`statusInfo`).
    case info
    /// Inactive / unknown (`dotIdle`).
    case neutral

    /// Resolve the ladder step to its palette color.
    func color(in palette: NockerlPalette) -> Color {
        switch self {
        case .success: return palette.statusSuccess
        case .warning: return palette.statusWarning
        case .error: return palette.statusError
        case .info: return palette.statusInfo
        case .neutral: return palette.dotIdle
        }
    }

    /// The default accessible name when no visible label is supplied.
    var accessibleName: String {
        switch self {
        case .success: return "Success"
        case .warning: return "Warning"
        case .error: return "Error"
        case .info: return "Info"
        case .neutral: return "Neutral"
        }
    }
}

/// The size ramp: quiet (6pt, ambient) or loud (8pt, demands the eye).
public enum NockerlStatusDotSize: Equatable {
    /// 6pt for idle / ambient states.
    case quiet
    /// 8pt for live / attention states (the default).
    case loud

    /// The disc diameter.
    var diameter: CGFloat {
        switch self {
        case .quiet: return 6
        case .loud: return NockerlSpace.space2
        }
    }
}

/// A semantic status dot: a filled disc + optional label, optionally pulsing.
public struct NockerlStatusDot: View {
    /// How the dot's hue is chosen.
    private enum Hue {
        case status(NockerlStatusDotStatus)
        case raw(Color)

        func color(in palette: NockerlPalette) -> Color {
            switch self {
            case .status(let status): return status.color(in: palette)
            case .raw(let color): return color
            }
        }
    }

    private let hue: Hue
    private let label: String?
    private let pulse: Bool
    private let size: NockerlStatusDotSize
    private let accessibleName: String

    /// Pulse opacity floor (1.0 → 0.3, mirroring the Compose `PulsingDot`).
    static let pulseFloorOpacity: Double = 0.3
    /// Pulse half-period: the `motion.duration.pulse` TOKEN (r2 B6 / r3 emitted).
    static let pulseDuration: TimeInterval = NockerlMotionDuration.pulse

    /// A dot on the semantic status ladder.
    /// - Parameters:
    ///   - status: the ladder step (drives hue AND the default accessible name).
    ///   - label: optional visible label beside the dot.
    ///   - pulse: animate the live-state opacity pulse.
    ///   - size: quiet 6pt or loud 8pt (default loud).
    public init(
        status: NockerlStatusDotStatus,
        label: String? = nil,
        pulse: Bool = false,
        size: NockerlStatusDotSize = .loud
    ) {
        let name = label.flatMap(NockerlA11y.accessibleName(from:))
        self.hue = .status(status)
        self.label = name
        self.pulse = pulse
        self.size = size
        self.accessibleName = name ?? status.accessibleName
    }

    /// A dot with an explicit palette color, the session-dot idiom
    /// (`palette.dotStreaming`, `palette.dotUnread`, …).
    /// - Parameters:
    ///   - color: the dot hue. Pass a palette token, never a literal.
    ///   - label: the REQUIRED accessible name (a raw-color dot has no status to
    ///     derive a name from; unnamed state is the a11y breach, law §13).
    ///   - pulse: animate the live-state opacity pulse.
    ///   - size: quiet 6pt or loud 8pt (default loud).
    public init(
        color: Color,
        label: String,
        pulse: Bool = false,
        size: NockerlStatusDotSize = .loud
    ) {
        let name = NockerlA11y.accessibleName(from: label)
        assert(
            name != nil,
            "NockerlStatusDot(color:) requires a non-empty accessible name. A raw-color dot is unnamed state otherwise (design-laws §13)."
        )
        self.hue = .raw(color)
        self.label = name
        self.pulse = pulse
        self.size = size
        self.accessibleName = name ?? ""
    }

    public var body: some View {
        DotBody(hue: hue, label: label, pulse: pulse, size: size)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(accessibleName)
    }

    /// Environment-reading render body: palette + reduce-motion live here.
    private struct DotBody: View {
        let hue: Hue
        let label: String?
        let pulse: Bool
        let size: NockerlStatusDotSize

        @Environment(\.colorScheme) private var colorScheme
        @Environment(\.accessibilityReduceMotion) private var reduceMotion
        @State private var dimmed = false

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let color = hue.color(in: palette)
            // Pulse = opacity only (law §7); frozen at full opacity under Reduce
            // Motion so the state stays legible without decoration-pulsing.
            let animating = pulse && !reduceMotion

            HStack(spacing: NockerlSpace.space2) {
                Circle()
                    .fill(color)
                    .frame(width: size.diameter, height: size.diameter)
                    .opacity(animating && dimmed ? NockerlStatusDot.pulseFloorOpacity : 1)
                    .animation(
                        animating
                            ? .easeInOut(duration: NockerlStatusDot.pulseDuration)
                                .repeatForever(autoreverses: true)
                            : nil,
                        value: dimmed
                    )
                    .onAppear {
                        if animating { dimmed = true }
                    }

                if let label {
                    Text(label)
                        .font(.nockerl(size: NockerlFontSize.size12, weight: .light))
                        .foregroundColor(palette.onCardMuted)
                }
            }
        }
    }
}
