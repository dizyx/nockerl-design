// NockerlControlFeedback: the shared, platform-honoring press/hover feedback for the
// Nockerl control family (button, icon button, chip).
//
// Design-laws §7: feedback animates ONLY interpolatable properties (opacity, brightness,
// scale), never a fill/gradient swap (a `Brush`/`LinearGradient` hard-cuts and flashes).
// The resting fill is therefore STATIC; this modifier layers a subtle NATIVE press on top.
// It deliberately avoids the web idiom (shadow-lift / translateY), which fights AppKit's
// own button feel on macOS.
//
// Tokens-pure: this file holds only unit-free interaction MAGNITUDES (opacity/brightness/
// scale deltas + animation timing). Those are motion constants, not design tokens. There
// is no color, size, radius, or spacing literal here.

import SwiftUI

/// Applies the shared press feedback to a control's rendered body.
///
/// On `isPressed`: a small `opacity` dip, a slight `brightness` reduction, and a subtle
/// `scaleEffect`, animated with a short ease-out. On macOS a hover raises `brightness`
/// slightly (a native pointer affordance; other platforms have no hover). The host's fill
/// is untouched. Only these interpolatable properties move.
struct NockerlPressFeedback: ViewModifier {
    /// Whether the owning control is currently pressed (`configuration.isPressed`).
    let isPressed: Bool

    /// Hover is macOS-only; tracked here so the modifier can raise brightness on pointer-over.
    @State private var isHovering = false

    // Interaction magnitudes (motion constants, not tokens).
    private static let pressedOpacity: Double = 0.82
    private static let pressedBrightness: Double = -0.04
    private static let pressedScale: CGFloat = 0.98
    private static let hoverBrightness: Double = 0.03
    private static let restBrightness: Double = 0
    private static let restScale: CGFloat = 1
    private static let restOpacity: Double = 1

    func body(content: Content) -> some View {
        content
            .opacity(isPressed ? Self.pressedOpacity : Self.restOpacity)
            .brightness(brightness)
            .scaleEffect(isPressed ? Self.pressedScale : Self.restScale)
            .animation(.nockerlStandard(NockerlMotionDuration.fast), value: isPressed)
            .animation(.nockerlStandard(NockerlMotionDuration.fast), value: isHovering)
            .modifier(NockerlHoverTracker(isHovering: $isHovering))
    }

    /// Brightness delta: press wins over hover; hover only applies on macOS.
    private var brightness: Double {
        if isPressed { return Self.pressedBrightness }
        if isHovering { return Self.hoverBrightness }
        return Self.restBrightness
    }
}

/// Wires `.onHover` on macOS (a native pointer affordance) and is a no-op everywhere else,
/// so the press modifier stays platform-honoring without `#if` scattered through its body.
private struct NockerlHoverTracker: ViewModifier {
    @Binding var isHovering: Bool

    func body(content: Content) -> some View {
        #if os(macOS)
        content.onHover { hovering in
            isHovering = hovering
        }
        #else
        content
        #endif
    }
}

extension View {
    /// Layer the shared Nockerl press/hover feedback onto a control body.
    func nockerlPressFeedback(isPressed: Bool) -> some View {
        modifier(NockerlPressFeedback(isPressed: isPressed))
    }
}

/// The shared button/chip LABEL treatment, factored so the uppercase-vs-not and the
/// macOS-12-safe tracking guard live in ONE place.
///
/// Design-laws §11: button labels are UPPERCASE, weight `.light`, tracked
/// −0.03em. `Text.tracking(_:)` requires macOS 13 / iOS 16 / tvOS 16 / watchOS 9, but the
/// package floor is macOS 12 / iOS 15, so tracking is applied ONLY inside an `#available`
/// check; below the floor the label renders without tracking (still uppercase + light).
extension Text {
    /// Apply the −0.03em button tracking when the running OS supports `Text.tracking(_:)`;
    /// otherwise return the text unchanged (macOS-12 floor).
    @ViewBuilder
    func nockerlButtonTracking(fontSize: CGFloat) -> some View {
        if #available(macOS 13, iOS 16, tvOS 16, watchOS 9, *) {
            self.tracking(fontSize * -0.03)
        } else {
            self
        }
    }
}
