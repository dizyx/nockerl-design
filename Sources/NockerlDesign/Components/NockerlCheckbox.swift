// NockerlCheckbox: the Tier-1 tri-state selection control, porting the RATIFIED
// web treatments 1:1 ( / web Checkbox.tsx@5dadb82):
//
//   - UNCHECKED = a recessed WELL ("fields sink"): cardSurface3 + divider hairline
//     + a top inner shade.
//   - CHECKED = a CONTAINED control: the static cyan gradient (accentPrimaryHi →
//     accentPrimary) lit from above (top catch-light) plus a 1px DEFINING EDGE
//     (accent mixed 68% into the shadow tint), so the filled box reads as a
//     contained control, never a soft cyan blob.
//   - MIXED = a DISTINCT horizontal dash (never a faded tick), same fill.
//
// The cyan layer cross-fades by opacity and the marks use on-accent ink, so fills
// never hard-swap (law §7); the cross-fade freezes under Reduce Motion. Square
// geometry (the ratified near-square 2pt track radius), 20pt box (md) / 16pt (sm).
//
// State cycling is the shared cross-platform contract `nockerlCheckboxNext`:
// off → on, on → off, mixed → on (identical on web + Compose; pure + tested).

import SwiftUI

/// Tri-state checked value (mirrors the web `boolean | 'mixed'` union).
public enum NockerlCheckedState: Equatable {
    /// Unchecked: the recessed well.
    case off
    /// Checked: the contained cyan fill + tick.
    case on
    /// Indeterminate parent: the contained fill + the DISTINCT dash.
    case mixed
}

/// The shared cycle contract (identical on web + Compose): off → on, on → off,
/// and mixed resolves to ON (the browser's native indeterminate-click rule,
/// ratified as the family behavior).
func nockerlCheckboxNext(_ state: NockerlCheckedState) -> NockerlCheckedState {
    switch state {
    case .off: return .on
    case .on: return .off
    case .mixed: return .on
    }
}

/// Box scale ramp. Mirrors the web `sm | md` union.
public enum NockerlCheckboxSize: Equatable {
    /// 16pt box for dense rows.
    case sm
    /// 20pt box, the platform default.
    case md

    /// The square box edge.
    var box: CGFloat {
        switch self {
        case .sm: return 16
        case .md: return 20
        }
    }

    /// Mark stroke width.
    var stroke: CGFloat { 2 }
}

/// The standardized tri-state checkbox (see the file header for the ratified
/// treatment). Pass `onChange: nil` for a display-only box (a parent row owns
/// the tap).
public struct NockerlCheckbox: View {
    private let state: NockerlCheckedState
    private let onChange: ((NockerlCheckedState) -> Void)?
    private let label: String?
    private let description: String?
    private let size: NockerlCheckboxSize
    private let enabled: Bool

    /// Defining-edge mix: accent 68% into shadow tint (web color-mix).
    static let edgeAccentFraction: Double = 0.68
    /// Disabled-off control opacity (the web's `.55`).
    static let disabledOffOpacity: Double = 0.55
    /// Disabled-on fill opacity (the web's `.5`).
    static let disabledOnFillOpacity: Double = 0.5

    /// Create a checkbox.
    /// - Parameters:
    ///   - state: tri-state value.
    ///   - onChange: invoked with the NEXT state per the shared contract; `nil`
    ///     renders a display-only box.
    ///   - label: persistent visible label beside the box.
    ///   - description: supporting line under the label.
    ///   - size: box scale (default md).
    ///   - enabled: when `false`, inert but clearly legible.
    public init(
        state: NockerlCheckedState,
        onChange: ((NockerlCheckedState) -> Void)? = nil,
        label: String? = nil,
        description: String? = nil,
        size: NockerlCheckboxSize = .md,
        enabled: Bool = true
    ) {
        self.state = state
        self.onChange = onChange
        self.label = label
        self.description = description
        self.size = size
        self.enabled = enabled
    }

    public var body: some View {
        let core = CheckboxBody(
            state: state, label: label, description: description,
            size: size, enabled: enabled
        )

        Group {
            if let onChange, enabled {
                Button {
                    onChange(nockerlCheckboxNext(state))
                } label: {
                    core
                }
                .buttonStyle(.plain)
            } else {
                core
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label ?? "Checkbox")
        .accessibilityValue(accessibleValue)
        .accessibilityAddTraits(state == .on ? [.isSelected] : [])
    }

    /// The announced tri-state value (mirrors aria-checked incl. "mixed").
    private var accessibleValue: String {
        switch state {
        case .off: return "Unchecked"
        case .on: return "Checked"
        case .mixed: return "Mixed"
        }
    }

    /// Environment-reading render body.
    private struct CheckboxBody: View {
        let state: NockerlCheckedState
        let label: String?
        let description: String?
        let size: NockerlCheckboxSize
        let enabled: Bool

        @Environment(\.colorScheme) private var colorScheme
        @Environment(\.accessibilityReduceMotion) private var reduceMotion

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let filled = state != .off
            let fillOpacity: Double = filled ? (enabled ? 1 : NockerlCheckbox.disabledOnFillOpacity) : 0
            let controlOpacity: Double = (!enabled && !filled) ? NockerlCheckbox.disabledOffOpacity : 1

            HStack(alignment: .top, spacing: NockerlSpace.space3) {
                box(palette: palette, fillOpacity: fillOpacity)
                    .frame(width: size.box, height: size.box)
                    .opacity(controlOpacity)
                    .animation(
                        reduceMotion ? nil : .nockerlStandard(NockerlMotionDuration.fast),
                        value: fillOpacity
                    )

                if let label {
                    VStack(alignment: .leading, spacing: NockerlSpace.space05) {
                        Text(label)
                            .font(.nockerl(size: NockerlFontSize.size14, weight: .light))
                            .foregroundColor(enabled ? palette.onCard : palette.onCardMuted)
                        if let description {
                            Text(description)
                                .font(.nockerl(size: NockerlFontSize.size12, weight: .light))
                                .foregroundColor(palette.onCardMuted)
                        }
                    }
                }
            }
            .contentShape(Rectangle())
        }

        /// The layered box: recessed well under a cross-fading contained fill.
        @ViewBuilder
        private func box(palette: NockerlPalette, fillOpacity: Double) -> some View {
            let shape = RoundedRectangle(cornerRadius: NockerlRadius.track, style: .continuous)
            // The 1px DEFINING EDGE: accent mixed 68% into the shadow tint.
            let edge = NockerlContrast.mix(
                palette.accentPrimary,
                into: palette.shadowTint,
                fraction: NockerlCheckbox.edgeAccentFraction
            )
            let mark = palette.onAccent

            ZStack {
                // The recessed WELL, always present under the fill.
                shape
                    .fill(palette.cardSurface3)
                    .overlay(
                        // "Fields sink": a top inner shade falling from the rim.
                        LinearGradient(
                            colors: [palette.shadowTint.opacity(0.45), .clear],
                            startPoint: .top,
                            endPoint: .center
                        )
                        .clipShape(shape)
                    )
                    .overlay(shape.strokeBorder(palette.divider, lineWidth: 1))

                // The contained cyan fill: gradient + catch-light + defining edge.
                ZStack {
                    shape.fill(
                        LinearGradient(
                            colors: [palette.accentPrimaryHi, palette.accentPrimary],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    // Top catch-light (depth law: same 1px line as every lit surface).
                    VStack(spacing: 0) {
                        palette.surfaceHighlight
                            .frame(height: 1)
                        Color.clear
                    }
                    .clipShape(shape)
                    shape.strokeBorder(edge, lineWidth: 1)

                    // The MARK: tick when on, the DISTINCT dash when mixed.
                    markPath(in: size.box)
                        .stroke(
                            mark,
                            style: StrokeStyle(
                                lineWidth: size.stroke,
                                lineCap: .round,
                                lineJoin: .round
                            )
                        )
                }
                .opacity(fillOpacity)
            }
        }

        /// The web glyph paths (tick M5 10.5 L8.5 14 L15 6.5; dash M5.5 10 h9 on a
        /// 20-box), scaled to the box edge.
        private func markPath(in edge: CGFloat) -> Path {
            var path = Path()
            switch state {
            case .on:
                path.move(to: CGPoint(x: edge * 0.25, y: edge * 0.525))
                path.addLine(to: CGPoint(x: edge * 0.425, y: edge * 0.7))
                path.addLine(to: CGPoint(x: edge * 0.75, y: edge * 0.325))
            case .mixed:
                path.move(to: CGPoint(x: edge * 0.275, y: edge * 0.5))
                path.addLine(to: CGPoint(x: edge * 0.725, y: edge * 0.5))
            case .off:
                break
            }
            return path
        }
    }
}
