// NockerlSlider: the labeled slider for SwiftUI surfaces.
//
// Mirrors the ratified slider (slider.mdx). Per the page's Swift column AND law §9
// (honor the platform), this WRAPS the native SwiftUI `Slider` (macOS pointer feel,
// iOS haptic snapping, and full keyboard/VoiceOver operability come from the system)
// and brands it: cyan `accentPrimary` tint, a persistent Nockerl-typography label
// (never placeholder-as-label, law §14), and optional min/max end captions.
//
// The two-thumb RANGE slider has no native SwiftUI primitive; it is a documented
// follow-up (compose two bound thumbs over one track), not silently faked here.

import SwiftUI

/// A labeled, token-tinted slider. Continuous by default; pass [step] for a stepped
/// slider (value snaps on the native behavior). Disable via `.disabled(_:)`.
///
/// Unavailable on tvOS. SwiftUI ships no `Slider` there (focus-based remotes have no
/// drag idiom); that platform gap is honored, not papered over.
@available(tvOS, unavailable)
public struct NockerlSlider: View {
    private let label: String
    private let value: Binding<Double>
    private let bounds: ClosedRange<Double>
    private let step: Double?
    private let minimumLabel: String?
    private let maximumLabel: String?

    /// Create a slider.
    /// - Parameters:
    ///   - label: the REQUIRED persistent label above the track (also the a11y name).
    ///   - value: the bound value.
    ///   - bounds: the value range (defaults to `0...1`).
    ///   - step: optional step increment (continuous when `nil`).
    ///   - minimumLabel: optional caption at the track's start (e.g. "0.1").
    ///   - maximumLabel: optional caption at the track's end (e.g. "2.0").
    public init(
        _ label: String,
        value: Binding<Double>,
        in bounds: ClosedRange<Double> = 0...1,
        step: Double? = nil,
        minimumLabel: String? = nil,
        maximumLabel: String? = nil
    ) {
        assert(
            NockerlA11y.accessibleName(from: label) != nil,
            "NockerlSlider requires a non-empty label. Placeholder-as-label is banned (design-laws §14)."
        )
        self.label = label
        self.value = value
        self.bounds = bounds
        self.step = step
        self.minimumLabel = minimumLabel
        self.maximumLabel = maximumLabel
    }

    public var body: some View {
        SliderBody(
            label: label,
            value: value,
            bounds: bounds,
            step: step,
            minimumLabel: minimumLabel,
            maximumLabel: maximumLabel
        )
    }

    /// Environment-reading render body.
    private struct SliderBody: View {
        let label: String
        let value: Binding<Double>
        let bounds: ClosedRange<Double>
        let step: Double?
        let minimumLabel: String?
        let maximumLabel: String?

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)

            VStack(alignment: .leading, spacing: NockerlSpace.space1) {
                Text(label)
                    .font(.nockerl(size: NockerlFontSize.size12, weight: .light))
                    .foregroundColor(palette.onCardMuted)

                slider
                    .tint(palette.accentPrimary)
                    .accessibilityLabel(label)

                if minimumLabel != nil || maximumLabel != nil {
                    HStack {
                        if let minimumLabel {
                            Text(minimumLabel)
                                .font(.nockerl(size: NockerlFontSize.size10, weight: .light))
                                .foregroundColor(palette.onCardMuted)
                        }
                        Spacer()
                        if let maximumLabel {
                            Text(maximumLabel)
                                .font(.nockerl(size: NockerlFontSize.size10, weight: .light))
                                .foregroundColor(palette.onCardMuted)
                        }
                    }
                }
            }
        }

        /// The native slider, stepped when a step is provided.
        @ViewBuilder
        private var slider: some View {
            if let step {
                Slider(value: value, in: bounds, step: step)
            } else {
                Slider(value: value, in: bounds)
            }
        }
    }
}
