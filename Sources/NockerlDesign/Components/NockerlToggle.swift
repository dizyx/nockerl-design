// NockerlToggle: the on/off SWITCH on Swift, implemented to the ratified
// NockerlSwitch canon (packages/react/src/primitives/Switch.tsx + the switch spec
// page, THE reference): the OFF track is a RECESSED WELL ("fields sink":
// cardSurface3 + top inner shade + divider hairline), the ON state is a STATIC
// cyan gradient lit from above (accentPrimaryHi → accentPrimary + the 1px top
// catch-light) that CROSS-FADES in by OPACITY, and the thumb is a LIFTED disc
// (cardSurface1 + catch-light + neutral drop) that SLIDES. Motion is
// interpolatable props ONLY (opacity, transform/width): the track never
// hard-cuts between two fills (law §7). Everything jumps under reduced motion.
//
// Press = the thumb SQUASHES wider (physical), not a fill change. This is the
// canon's one press feedback.
//
// Sibling to ``NockerlCheckbox``, deliberately distinct: a SWITCH is an instant
// on/off SETTING (track + sliding thumb); a CHECKBOX is a multi-selection box.
// Same selection-control vocabulary (recessed well, static cyan fill, opacity
// cross-fade; the well/fill recipes here mirror the checkbox's), different
// anatomy. Never swap one for the other.
//
// Ships as a ToggleStyle (platform-honoring: the native `Toggle` keeps its
// label handling, keyboard toggling, and switch accessibility) + the
// ``NockerlToggle`` convenience wrapper.

import SwiftUI

/// Track + thumb scale (the canon's two rungs). `md` matches the system switch.
public enum NockerlToggleSize {
    /// 36×22 track, 16pt thumb: dense rows.
    case sm
    /// 44×26 track, 20pt thumb: the default.
    case md

    /// (track width, track height, thumb diameter, rim padding).
    var metrics: (width: CGFloat, height: CGFloat, thumb: CGFloat, pad: CGFloat) {
        switch self {
        case .sm: return (36, 22, 16, 3)
        case .md: return (44, 26, 20, 3)
        }
    }
}

/// The Nockerl switch as a `ToggleStyle`. Apply to any native `Toggle` with
/// `.toggleStyle(.nockerl)` (or `.nockerl(size: .sm)`). The native control
/// keeps its accessibility (switch role, value, Space toggling); this style
/// draws the ratified track + thumb.
public struct NockerlToggleStyle: ToggleStyle {
    private let size: NockerlToggleSize

    /// Create the style.
    /// - Parameter size: the track scale (default ``NockerlToggleSize/md``).
    public init(size: NockerlToggleSize = .md) {
        self.size = size
    }

    public func makeBody(configuration: Configuration) -> some View {
        ToggleBody(configuration: configuration, size: size)
    }

    private struct ToggleBody: View {
        let configuration: Configuration
        let size: NockerlToggleSize

        @State private var pressed = false
        @Environment(\.colorScheme) private var colorScheme
        @Environment(\.isEnabled) private var isEnabled
        @Environment(\.accessibilityReduceMotion) private var reduceMotion

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)

            Button {
                configuration.isOn.toggle()
            } label: {
                HStack(spacing: NockerlSpace.space3) {
                    configuration.label
                        .font(.nockerl(size: NockerlFontSize.size14, weight: .light))
                        .foregroundColor(isEnabled ? palette.onCard : palette.onCardMuted)
                    SwitchVisual(
                        isOn: configuration.isOn,
                        size: size,
                        pressed: pressed,
                        enabled: isEnabled,
                        reduceMotion: reduceMotion,
                        palette: palette
                    )
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(PressReportingStyle(pressed: $pressed))
        }
    }
}

public extension ToggleStyle where Self == NockerlToggleStyle {
    /// The Nockerl switch at the default `md` scale.
    static var nockerl: NockerlToggleStyle { NockerlToggleStyle() }

    /// The Nockerl switch at a chosen scale.
    static func nockerl(size: NockerlToggleSize) -> NockerlToggleStyle {
        NockerlToggleStyle(size: size)
    }
}

/// Convenience wrapper: `NockerlToggle("Launch at login", isOn: $x)`. Pass a
/// `nil` label for the bare control (the host row carries the text; the
/// accessible name comes from `accessibilityLabel`).
public struct NockerlToggle: View {
    private let label: String?
    private let isOn: Binding<Bool>
    private let size: NockerlToggleSize
    private let accessibilityLabel: String?

    /// Create a toggle row.
    /// - Parameters:
    ///   - label: the visible label, or `nil` for the bare control.
    ///   - isOn: the on/off binding.
    ///   - size: the track scale (default `md`).
    ///   - accessibilityLabel: the a11y name when [label] is `nil`.
    public init(
        _ label: String? = nil,
        isOn: Binding<Bool>,
        size: NockerlToggleSize = .md,
        accessibilityLabel: String? = nil
    ) {
        self.label = label
        self.isOn = isOn
        self.size = size
        self.accessibilityLabel = accessibilityLabel
    }

    public var body: some View {
        if let label {
            Toggle(label, isOn: isOn)
                .toggleStyle(.nockerl(size: size))
        } else {
            Toggle("", isOn: isOn)
                .toggleStyle(.nockerl(size: size))
                .labelsHidden()
                .accessibilityLabel(accessibilityLabel ?? "")
        }
    }
}

/// The drawn control: recessed well → cross-fading cyan layer → sliding thumb.
private struct SwitchVisual: View {
    let isOn: Bool
    let size: NockerlToggleSize
    let pressed: Bool
    let enabled: Bool
    let reduceMotion: Bool
    let palette: NockerlPalette

    var body: some View {
        let m = size.metrics
        // Press = the thumb squashes WIDER (+4pt, the canon's physical press).
        let thumbWidth = m.thumb + (pressed && enabled ? NockerlSpace.space1 : 0)
        let travel = isOn ? m.width - thumbWidth - m.pad * 2 : 0
        // Disabled: OFF dims the whole control (still clearly seen); ON halves
        // the cyan layer and drops the thumb lift.
        let fillOpacity: Double = isOn ? (enabled ? 1 : 0.5) : 0
        let controlOpacity: Double = (!enabled && !isOn) ? 0.55 : 1

        ZStack(alignment: .leading) {
            // The recessed WELL ("fields sink"), always present under the fill.
            Capsule(style: .continuous)
                .fill(palette.cardSurface3)
                .overlay(
                    // The top inner shade falling from the rim (the checkbox recipe).
                    LinearGradient(
                        colors: [palette.shadowTint.opacity(0.45), .clear],
                        startPoint: .top,
                        endPoint: .center
                    )
                    .clipShape(Capsule(style: .continuous))
                )
                .overlay(Capsule(style: .continuous).strokeBorder(palette.divider, lineWidth: NockerlSpace.spacePx))

            // The static cyan ON layer cross-fades in by OPACITY (the fill
            // itself never tweens; law §7).
            Capsule(style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [palette.accentPrimaryHi, palette.accentPrimary],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .overlay(
                    // Lit from above: the 1px top catch-light.
                    VStack(spacing: 0) {
                        palette.surfaceHighlight.frame(height: NockerlSpace.spacePx)
                        Color.clear
                    }
                    .clipShape(Capsule(style: .continuous))
                )
                .opacity(fillOpacity)

            // The LIFTED thumb: catch-light + neutral drop; it SLIDES (offset)
            // and squashes on press. A capsule so the squash stays round-ended.
            Capsule(style: .continuous)
                .fill(palette.cardSurface1)
                .overlay(
                    Capsule(style: .continuous).strokeBorder(
                        LinearGradient(
                            colors: [palette.surfaceHighlight, .clear],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: NockerlSpace.spacePx
                    )
                )
                .shadow(
                    color: palette.shadowTint.opacity(enabled ? 0.6 : 0),
                    radius: NockerlElevation.level1,
                    x: 0,
                    y: NockerlElevation.level1 / 2
                )
                .frame(width: thumbWidth, height: m.thumb)
                .offset(x: m.pad + travel)
        }
        .frame(width: m.width, height: m.height)
        .opacity(controlOpacity)
        .animation(reduceMotion ? nil : .nockerlStandard(NockerlMotionDuration.base), value: isOn)
        .animation(reduceMotion ? nil : .nockerlStandard(NockerlMotionDuration.fast), value: pressed)
    }
}

/// Reports the wrapped button's pressed state (drives the thumb squash).
/// Visually plain: the switch draws its own feedback.
private struct PressReportingStyle: ButtonStyle {
    @Binding var pressed: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .onChange(of: configuration.isPressed) { pressed = $0 }
    }
}
