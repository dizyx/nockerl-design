// NockerlRadio: the single-choice selection control on Swift (v1.9.0), the twin of
// the web/compose radio (radio-group.mdx): a circle with a centered dot, one per
// group. Deliberately HARMONIZED with NockerlCheckbox (same label/description
// layout, the same nockerlStandard selection motion, the same disabled legibility)
// so a radio and a checkbox read as one family in a form.
//
//   - The RING: Ø18, a 1.5pt stroke. HOLLOW `onCanvasMuted` when unselected,
//     `accentPrimary` when selected (the ring lights up, like the checkbox box).
//   - The DOT: Ø8 `accentPrimary`, centered; it SCALES IN on select (a transform,
//     law §7) on the ratified `nockerlStandard` curve, freezing under Reduce Motion.
//   - A ≥44pt hit target around the ring (Apple HIG, law §14). The whole row taps.
//
// A radio is a MEMBER of a group: the host owns the selection (one `selected` at a
// time) and passes `selected` + `onSelect` per option, exactly like the web/compose
// `RadioGroup` where the container coordinates single-choice.

import SwiftUI

/// One radio button: a ring + a centered dot, harmonized with ``NockerlCheckbox``.
/// Pass `onSelect: nil` for a display-only radio (a parent row owns the tap). The
/// host drives single-choice: exactly one option in a group carries `selected`.
public struct NockerlRadio: View {
    private let selected: Bool
    private let onSelect: (() -> Void)?
    private let label: String?
    private let description: String?
    private let enabled: Bool

    /// Ring diameter (radio-group spec).
    private static let ring: CGFloat = 18
    /// Ring stroke weight.
    private static let ringStroke: CGFloat = 1.5
    /// Inner dot diameter.
    private static let dot: CGFloat = 8
    /// Disabled control opacity, inert but clearly legible (checkbox parity).
    private static let disabledOpacity: Double = 0.55

    /// Create a radio button.
    /// - Parameters:
    ///   - selected: whether THIS option is the chosen one (drives the dot + ring).
    ///   - onSelect: invoked on tap; `nil` renders a display-only control.
    ///   - label: persistent visible label beside the ring.
    ///   - description: supporting line under the label.
    ///   - enabled: when `false`, inert but clearly legible.
    public init(
        selected: Bool,
        onSelect: (() -> Void)? = nil,
        label: String? = nil,
        description: String? = nil,
        enabled: Bool = true
    ) {
        self.selected = selected
        self.onSelect = onSelect
        self.label = label
        self.description = description
        self.enabled = enabled
    }

    public var body: some View {
        let core = RadioBody(
            selected: selected, label: label, description: description, enabled: enabled
        )

        Group {
            if let onSelect, enabled {
                Button(action: onSelect) { core }
                    .buttonStyle(.plain)
            } else {
                core
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label ?? "Option")
        .accessibilityAddTraits(selected ? [.isSelected] : [])
    }

    /// The environment-reading render body (colorScheme + Reduce Motion live here).
    private struct RadioBody: View {
        let selected: Bool
        let label: String?
        let description: String?
        let enabled: Bool

        @Environment(\.colorScheme) private var colorScheme
        @Environment(\.accessibilityReduceMotion) private var reduceMotion

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            // The ring lights to accent when selected; hollow otherwise.
            let ringColor = selected ? palette.accentPrimary : palette.onCanvasMuted
            let controlOpacity: Double = enabled ? 1 : NockerlRadio.disabledOpacity

            HStack(alignment: .top, spacing: NockerlSpace.space3) {
                ZStack {
                    Circle()
                        .strokeBorder(ringColor, lineWidth: NockerlRadio.ringStroke)
                        .frame(width: NockerlRadio.ring, height: NockerlRadio.ring)
                    // The dot SCALES IN on select (transform only, law §7).
                    Circle()
                        .fill(palette.accentPrimary)
                        .frame(width: NockerlRadio.dot, height: NockerlRadio.dot)
                        .scaleEffect(selected ? 1 : 0.001)
                        .opacity(selected ? 1 : 0)
                }
                .opacity(controlOpacity)
                .animation(
                    reduceMotion ? nil : .nockerlStandard(NockerlMotionDuration.fast),
                    value: selected
                )
                // The ≥44pt hit target (law §14). The ring never shrinks to 18.
                .frame(minWidth: NockerlSize.minTouch, minHeight: NockerlSize.minTouch)

                if label != nil || description != nil {
                    VStack(alignment: .leading, spacing: NockerlSpace.space05) {
                        if let label {
                            Text(label)
                                .font(.nockerl(size: NockerlFontSize.size14, weight: .light))
                                .foregroundColor(enabled ? palette.onCard : palette.onCardMuted)
                        }
                        if let description {
                            Text(description)
                                .font(.nockerl(size: NockerlFontSize.size12, weight: .light))
                                .foregroundColor(palette.onCardMuted)
                        }
                    }
                    // Align the label to the ring's optical center in the 44pt band.
                    .frame(minHeight: NockerlSize.minTouch, alignment: .center)
                }
            }
            .contentShape(Rectangle())
        }
    }
}
