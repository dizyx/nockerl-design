// NockerlNavRow: the sidebar NAVIGATION-DESTINATION row on Swift, built
// to the NockerlNavItem canon (packages/react/src/behaviors/NavItem.tsx, the
// section-6 selected treatment), NOT to Voice's hand-rolled SidebarRow (input
// only; it retires on adoption). Canon deltas vs that hand-roll:
//
//   - REDUCE-FILLS (ratified: "state by OUTLINE, not fill"): selection and
//     hover carry NO wash. Selection = the thin cyan `accentPrimary`@45% BORDER + cyan
//     ink + a MEDIUM label weight. Hover (unselected) = an ink raise (`onChromeMuted`→
//     `onChrome`) + a NEUTRAL GRAY `divider` hairline border (never cyan: cyan is
//     reserved for selection). At rest: muted ink, LIGHT weight, no border.
//   - resting ink is `onChromeMuted`; the label weight rides selection (light at rest →
//     medium when selected; the §11 ramp caps at 500, so never `.semibold`).
//   - canon keeps the press feedback (scale 0.985: a transform, law §7).
//
// Depth is FLAT. The chrome panel the rows sit on carries the shadow, never the
// row. Selection = border + ink + weight (law §6): NEVER a left rail/stripe or a wash,
// and the leading icon STAYS (no check swap).

import SwiftUI

/// One sidebar navigation destination: a leading icon slot (20pt, stays lit and
/// tints cyan when selected), the label, the hover/selected chrome, and the
/// macOS focus stance. The whole row is ONE button with one accessible name.
///
/// The row deliberately leaves the macOS focus chain (`focusable(false)` +
/// `focusEffectDisabled`), Voice's ratified stance for mouse-driven sidebars:
/// no stray focus box can land on the first row under Full Keyboard Access.
public struct NockerlNavRow<Icon: View>: View {
    private let label: String
    private let selected: Bool
    private let action: () -> Void
    private let icon: Icon?

    @State private var hovering = false
    @Environment(\.colorScheme) private var colorScheme

    /// Create a nav row with a leading icon.
    /// - Parameters:
    ///   - label: the destination name (also the accessible name).
    ///   - selected: the active destination, thin cyan border + cyan ink + medium
    ///     weight, NO wash (law §6, reduce-fills; the icon stays, never a check swap).
    ///   - action: whole-row tap.
    ///   - icon: the leading glyph (an SF Symbol `Image` or any view), rendered
    ///     in the canonical 20pt slot and tinted with the row's ink.
    public init(
        _ label: String,
        selected: Bool = false,
        action: @escaping () -> Void,
        @ViewBuilder icon: () -> Icon
    ) {
        self.label = label
        self.selected = selected
        self.action = action
        self.icon = icon()
    }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        let shape = RoundedRectangle(cornerRadius: NockerlRadius.control, style: .continuous)

        Button(action: action) {
            HStack(spacing: NockerlSpace.space3) {
                if let icon {
                    icon
                        // Weight rides the selection (reduce-fills: state via ink/weight):
                        // medium when selected, one tick thinner (light) at rest. `.system`
                        // is the ratified SF-Symbol sizing idiom (size stays a token).
                        .font(.system(size: NockerlFontSize.size16, weight: selected ? .medium : .light))
                        .frame(width: 20)
                }
                Text(label)
                    // §11 ramp caps weight at 500: selected is MEDIUM (was `.semibold`
                    // 600, over-cap); unselected drops one tick to `.light`, so selection
                    // reads by weight, not a fill.
                    .font(.nockerl(size: NockerlFontSize.size14, weight: selected ? .medium : .light))
                    .lineLimit(1)
                    .truncationMode(.tail)
                Spacer(minLength: 0)
            }
            .foregroundColor(ink(palette))
            .padding(.leading, NockerlSpace.space3)
            .padding(.trailing, NockerlSpace.space2)
            .padding(.vertical, NockerlSpace.space2)
            .frame(maxWidth: .infinity, minHeight: NockerlSpace.space10, alignment: .leading)
            // Reduce-fills (law §6): NO wash. Selection reads via this BORDER + the ink +
            // the weight shift; unselected hover raises a neutral gray hairline.
            .overlay {
                shape.strokeBorder(borderColor(palette), lineWidth: NockerlBorder.widthSelection)
            }
            .contentShape(shape)
            .animation(.nockerlStandard(NockerlMotionDuration.fast), value: hovering)
            .animation(.nockerlStandard(NockerlMotionDuration.fast), value: selected)
        }
        .buttonStyle(NavRowPressStyle())
        .nockerlNavRowFocus()
        .onHover { hovering = $0 }
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    /// The ink ladder: selected = accent; hover = full chrome ink; rest = muted.
    private func ink(_ palette: NockerlPalette) -> Color {
        if selected { return palette.accentPrimary }
        if hovering { return palette.onChrome }
        return palette.onChromeMuted
    }

    /// The BORDER ladder (reduce-fills: state by outline, not fill, law §6): selected =
    /// the thin cyan `accentPrimary`@0.45 edge; unselected hover = a NEUTRAL GRAY `divider`
    /// hairline (NEVER cyan: cyan is reserved for selection); rest = clear. Selection and
    /// hover read via this border + the ink/weight shift. No wash.
    private func borderColor(_ palette: NockerlPalette) -> Color {
        if selected { return palette.accentPrimary.opacity(NockerlBorderOpacity.selection) }
        if hovering { return palette.divider }
        return Color.clear
    }
}

/// Icon-less convenience: the label-only row (no phantom icon slot).
public extension NockerlNavRow where Icon == EmptyView {
    init(
        _ label: String,
        selected: Bool = false,
        action: @escaping () -> Void
    ) {
        self.label = label
        self.selected = selected
        self.action = action
        self.icon = nil
    }
}

/// The canon press feedback, a 0.985 scale (a transform, law §7: interpolatable
/// props only, never a fill swap).
private struct NavRowPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .animation(.nockerlStandard(NockerlMotionDuration.fast), value: configuration.isPressed)
    }
}

private extension View {
    /// The ratified macOS sidebar focus stance: the row leaves the focus
    /// chain entirely. Neither the focus ring nor the accessibility focus box
    /// can land on a mouse-driven sidebar row (`focusEffectDisabled` needs 14+).
    /// Other platforms keep their native behavior.
    @ViewBuilder
    func nockerlNavRowFocus() -> some View {
        #if os(macOS)
        if #available(macOS 14.0, *) {
            self.focusable(false).focusEffectDisabled()
        } else {
            self.focusable(false)
        }
        #else
        self
        #endif
    }
}
