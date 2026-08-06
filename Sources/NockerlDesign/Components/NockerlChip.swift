// NockerlChip: the standardized chip, a filled keycap PILL (the session-chip / filter-chip
// idiom). One of the two surfaces that deliberately keep the fully-rounded pill silhouette
// (the other is the input bar); every other control uses the 12pt control radius. This
// contrast (pills for chips + input, control radius for buttons) is the point Design
// Review #1 locked in (design-laws §4).
//
// The ratified cyan grammar + the full capability UNION (one contract:
// selectable + removable + disabled on every platform):
//   - selected:    SOLID `accentPrimary` fill + contrast-picked label + the shared
//                  top catch-light (never a gradient).
//   - unselected:  `accentPrimarySoft` wash + `accentPrimary` label.
//   - removable:   an optional trailing ✕ with its own tap.
//
// Same platform-honoring feedback as the rest of the family (design-laws §7); tokens-pure.

import SwiftUI

/// A single token-driven chip, a filled keycap pill. `selected` toggles the accent
/// selection wash; feedback matches the button family (static fill, animated
/// opacity/brightness/scale).
public struct NockerlChip: View {
    private let text: String
    private let selected: Bool
    private let action: () -> Void
    private let onRemove: (() -> Void)?

    /// Create a chip.
    /// - Parameters:
    ///   - text: the chip label.
    ///   - selected: whether this chip is the active selection (defaults to `false`).
    ///   - action: invoked on tap.
    ///   - onRemove: when non-nil, the chip is REMOVABLE. A trailing ✕ renders with
    ///     its own tap (ruling C6: the chip contract is the capability union).
    public init(
        _ text: String,
        selected: Bool = false,
        action: @escaping () -> Void,
        onRemove: (() -> Void)? = nil
    ) {
        self.text = text
        self.selected = selected
        self.action = action
        self.onRemove = onRemove
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: NockerlSpace.space1) {
                Text(text)
                if let onRemove {
                    // The innermost interactive view wins the tap, so the remove
                    // affordance rides inside the chip's own label.
                    Button(action: onRemove) {
                        Image(systemName: "xmark")
                            .font(.system(size: NockerlFontSize.size10, weight: .medium))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Remove \(text)")
                }
            }
        }
        .buttonStyle(ChipStyle(selected: selected))
    }
}

/// The `ButtonStyle` behind ``NockerlChip``. Reads the environment via a private nested view
/// (the idiomatic path for `colorScheme` / `isEnabled` inside a `ButtonStyle`).
private struct ChipStyle: ButtonStyle {
    let selected: Bool

    static let disabledAlpha: Double = 0.38

    func makeBody(configuration: Configuration) -> some View {
        // Not named `Body`: a nested `Body` binds as the `ButtonStyle.Body` associatedtype
        // witness and leaks a visibility requirement. Opaque return keeps it inferred.
        StyleBody(selected: selected, configuration: configuration)
    }

    private struct StyleBody: View {
        let selected: Bool
        let configuration: Configuration

        @Environment(\.colorScheme) private var colorScheme
        @Environment(\.isEnabled) private var isEnabled

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            // Ratified B2: selected → SOLID accent + contrast-picked ink + catch-light;
            // unselected → the soft cyan wash + cyan ink (the cohesive chip strip).
            // The fill is static; only feedback props animate.
            let fill: Color = selected ? palette.accentPrimary : palette.accentPrimarySoft
            let label: Color =
                selected ? NockerlContrast.pickOn(palette.accentPrimary) : palette.accentPrimary

            configuration.label
                .font(.nockerl(size: NockerlFontSize.size12, weight: .medium))
                .foregroundColor(label)
                .padding(.horizontal, NockerlSpace.space3)
                .padding(.vertical, NockerlSpace.space2)
                .background(fill)
                .overlay(alignment: .top) {
                    if selected, isEnabled {
                        // RULING: one identical catch-light everywhere, the SAME
                        // surfaceHighlight token the web binds (--color-surface-highlight).
                        Rectangle()
                            .fill(palette.surfaceHighlight)
                            .frame(height: NockerlSpace.spacePx)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: NockerlRadius.pill, style: .continuous))
                .contentShape(RoundedRectangle(cornerRadius: NockerlRadius.pill, style: .continuous))
                .opacity(isEnabled ? 1 : ChipStyle.disabledAlpha)
                .nockerlPressFeedback(isPressed: configuration.isPressed)
        }
    }
}
