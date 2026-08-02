// NockerlProgress: determinate/indeterminate linear progress + the determinate ring.
//
// Mirrors the ratified progress primitive (progress-bar.mdx): a PLAIN cyan fill on a
// recessed hairline track. No threshold banding ever (that is the context gauge's
// job). The track is SQUARED (the 2pt `NockerlRadius.track`), never a pill (law §4).
// Fill animates as a width/trim interpolation (law §7); the indeterminate slide
// freezes under Reduce Motion. The ring is determinate-only per the page.
// Indeterminate-circular is the Spinner's job, deliberately not shipped here.
//
// A11y (law §13): every progress carries a REQUIRED label; determinate exposes its
// percentage as the accessibility value; success/error completion must pair tone with
// text/icon at the call site, never color alone.

import SwiftUI

/// The tone of a progress fill: plain accent by default; success/error are for
/// completion states (pair them with a text/icon signal at the call site).
public enum NockerlProgressTone: Equatable {
    /// Brand cyan (`accentPrimary`): plain progress, the default.
    case accent
    /// Status green (`statusSuccess`): completed.
    case success
    /// Status red (`statusError`): failed.
    case error

    /// Resolve to the palette slot.
    func color(in palette: NockerlPalette) -> Color {
        switch self {
        case .accent: return palette.accentPrimary
        case .success: return palette.statusSuccess
        case .error: return palette.statusError
        }
    }
}

/// The linear track height ramp.
public enum NockerlProgressSize: Equatable {
    /// 3pt track, the default (client #1's convention).
    case thin
    /// 4pt track when the bar is the page's focal element.
    case thick

    /// The track thickness.
    var height: CGFloat {
        switch self {
        case .thin: return 3
        case .thick: return 4
        }
    }
}

/// Shared progress math, factored out so the clamping contract is testable.
enum NockerlProgressMath {
    /// The fraction `value/total` clamped to `0...1`; `nil` value (indeterminate) and
    /// non-positive totals resolve to 0.
    static func fraction(value: Double?, total: Double) -> Double {
        guard let value, total > 0 else { return 0 }
        return min(max(value / total, 0), 1)
    }
}

/// A linear progress bar: determinate when [value] is set, indeterminate when `nil`.
public struct NockerlProgressBar: View {
    private let value: Double?
    private let total: Double
    private let label: String
    private let size: NockerlProgressSize
    private let tone: NockerlProgressTone

    /// Width of the sliding indeterminate segment, as a fraction of the track.
    static let indeterminateSegment: CGFloat = 0.3
    /// One full slide of the indeterminate segment (interpolatable transform only).
    static let indeterminateDuration: TimeInterval = 1.2

    /// Create a progress bar.
    /// - Parameters:
    ///   - value: current progress (`0...total`); `nil` renders the indeterminate slide.
    ///   - total: the full extent (defaults to 1).
    ///   - label: the REQUIRED accessible name ("Uploading model…").
    ///   - size: track height ramp (default thin).
    ///   - tone: fill tone (default accent; success/error for completion states).
    public init(
        value: Double? = nil,
        total: Double = 1,
        label: String,
        size: NockerlProgressSize = .thin,
        tone: NockerlProgressTone = .accent
    ) {
        assert(
            NockerlA11y.accessibleName(from: label) != nil,
            "NockerlProgressBar requires a non-empty accessible label (design-laws §13)."
        )
        self.value = value
        self.total = total
        self.label = label
        self.size = size
        self.tone = tone
    }

    public var body: some View {
        let fraction = NockerlProgressMath.fraction(value: value, total: total)
        BarBody(fraction: fraction, indeterminate: value == nil, size: size, tone: tone)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(label)
            .accessibilityValue(value == nil ? "" : "\(Int((fraction * 100).rounded())) percent")
    }

    /// Environment-reading render body.
    private struct BarBody: View {
        let fraction: Double
        let indeterminate: Bool
        let size: NockerlProgressSize
        let tone: NockerlProgressTone

        @Environment(\.colorScheme) private var colorScheme
        @Environment(\.accessibilityReduceMotion) private var reduceMotion
        @State private var slid = false

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let trackShape = RoundedRectangle(cornerRadius: NockerlRadius.track, style: .continuous)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    trackShape.fill(palette.cardHairline)

                    if indeterminate {
                        // A fixed-width segment sliding edge to edge: transform-only
                        // motion (law §7); frozen mid-track under Reduce Motion.
                        let segment = geo.size.width * NockerlProgressBar.indeterminateSegment
                        trackShape
                            .fill(tone.color(in: palette))
                            .frame(width: segment)
                            .offset(x: slid ? geo.size.width - segment : 0)
                            .animation(
                                reduceMotion
                                    ? nil
                                    : .easeInOut(duration: NockerlProgressBar.indeterminateDuration)
                                        .repeatForever(autoreverses: true),
                                value: slid
                            )
                            .onAppear {
                                if !reduceMotion { slid = true }
                            }
                    } else {
                        trackShape
                            .fill(tone.color(in: palette))
                            .frame(width: geo.size.width * fraction)
                            .animation(.nockerlStandard(NockerlMotionDuration.base), value: fraction)
                    }
                }
            }
            .frame(height: size.height)
        }
    }
}

/// A determinate progress ring: a hairline circle with a tone-colored trim and an
/// optional centered percent readout. Indeterminate spinning is the Spinner's job.
public struct NockerlProgressRing: View {
    private let value: Double
    private let total: Double
    private let label: String
    private let diameter: CGFloat
    private let tone: NockerlProgressTone
    private let showsReadout: Bool

    /// Ring stroke width (matches the thick linear track).
    static let strokeWidth: CGFloat = 4

    /// Create a progress ring.
    /// - Parameters:
    ///   - value: current progress (`0...total`).
    ///   - total: the full extent (defaults to 1).
    ///   - label: the REQUIRED accessible name.
    ///   - diameter: ring size (defaults to `NockerlSpace.space12`, 48pt).
    ///   - tone: trim tone (default accent).
    ///   - showsReadout: render the centered percent text (default true).
    public init(
        value: Double,
        total: Double = 1,
        label: String,
        diameter: CGFloat = NockerlSpace.space12,
        tone: NockerlProgressTone = .accent,
        showsReadout: Bool = true
    ) {
        assert(
            NockerlA11y.accessibleName(from: label) != nil,
            "NockerlProgressRing requires a non-empty accessible label (design-laws §13)."
        )
        self.value = value
        self.total = total
        self.label = label
        self.diameter = diameter
        self.tone = tone
        self.showsReadout = showsReadout
    }

    public var body: some View {
        let fraction = NockerlProgressMath.fraction(value: value, total: total)
        RingBody(
            fraction: fraction,
            diameter: diameter,
            tone: tone,
            showsReadout: showsReadout
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityValue("\(Int((fraction * 100).rounded())) percent")
    }

    /// Environment-reading render body.
    private struct RingBody: View {
        let fraction: Double
        let diameter: CGFloat
        let tone: NockerlProgressTone
        let showsReadout: Bool

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)

            ZStack {
                Circle()
                    .stroke(palette.cardHairline, lineWidth: NockerlProgressRing.strokeWidth)

                Circle()
                    .trim(from: 0, to: fraction)
                    .stroke(
                        tone.color(in: palette),
                        style: StrokeStyle(lineWidth: NockerlProgressRing.strokeWidth, lineCap: .round)
                    )
                    // Start the trim at 12 o'clock (Circle's zero is 3 o'clock).
                    .rotationEffect(.degrees(-90))
                    .animation(.nockerlStandard(NockerlMotionDuration.base), value: fraction)

                if showsReadout {
                    Text("\(Int((fraction * 100).rounded()))%")
                        .font(.nockerl(size: NockerlFontSize.size12, weight: .medium))
                        .foregroundColor(palette.onCard)
                }
            }
            .frame(width: diameter, height: diameter)
        }
    }
}
