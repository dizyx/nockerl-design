// NockerlWell: the Nockerl well chrome as a general-purpose modifier at TWO scales
// (v1.9.0 #4), aliasing the `.nockerlFieldWell()` recipe. The two scales DIVERGE by design
// (law §3, ground vs field):
//
//   .field:      RECESSED input/body well (fields SINK). Aliases the field-well chrome
//                verbatim: `canvasAlt` sunken plane + the INNER top shade (the shadow
//                falls INTO the well) + `cardHairline` edge + control-radius clip.
//   .container:  FLAT bounded SCROLL container (GROUND, not a field). A translucent
//                `canvas@0.3` facet + `cardHairline` edge + card-radius clip, content
//                CLIPPED. NO inner shade: a scroll container HOLDS cards that lift OFF it,
//                so it must read as GROUND; recessing it would mistype it as input.
//                Supersedes the ad-hoc scroll-under-header treatment.
//
// Shared: both draw the neutral `cardHairline` edge, clip content to the rounded shape, and
// carry NO outer drop shadow. Only the field sinks; the container is flat ground.
//
// NOTE (future unify): `.nockerlFieldWell()` (input-only, ) renders the field recipe;
// `.nockerlWell(.field)` is byte-identical to it. A later refactor can fold the field well
// into `.nockerlWell(.field)`; kept separate here to stay additive.

import SwiftUI

/// The scale of ``SwiftUI/View/nockerlWell(_:)``, the well at two divergent scales.
public enum NockerlWellScale: Equatable {
    /// FIELD / body scale, a RECESSED read-only field or small body panel (fields sink):
    /// control radius (12pt), padded, the `canvasAlt` sunken plane + the inner top shade.
    case field
    /// CONTAINER scale, a FLAT bounded SCROLL container (GROUND, §3): card radius (16pt),
    /// unpadded, a translucent `canvas@0.3` facet + `cardHairline` edge, content CLIPPED,
    /// NO inner shade (a scroll container holds cards that lift off it: flat, not sunken).
    case container
}

public extension View {
    /// Wrap this view in the Nockerl well chrome. `scale` picks the RECESSED field/body
    /// well (control radius, padded, sunken `canvasAlt` + inner top shade) or the FLAT
    /// bounded scroll CONTAINER (card radius, translucent `canvas@0.3` ground, content
    /// clipped, no inner shade). Both draw the neutral `cardHairline` edge and carry NO
    /// outer drop shadow.
    ///
    /// The container scale supersedes the ad-hoc scroll-under-header treatment. Wrap a
    /// bounded `ScrollView { … }` for a flat, framed region whose cards lift off the ground:
    ///
    /// ```swift
    /// ScrollView { LazyVStack(spacing: 12) { … } }
    ///     .frame(maxHeight: 320)
    ///     .nockerlWell(.container)
    /// ```
    func nockerlWell(_ scale: NockerlWellScale = .field) -> some View {
        modifier(NockerlWellModifier(scale: scale))
    }
}

private struct NockerlWellModifier: ViewModifier {
    let scale: NockerlWellScale
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        let palette = NockerlPalette.resolve(colorScheme)
        let isContainer = scale == .container
        // Container = card radius (16); field = control radius (12).
        let radius = isContainer ? NockerlRadius.card : NockerlRadius.control
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        // Field pads so read-only content clears the edge; the container stays flush (the
        // host insets its own scrolling content). Padding 0 = no inset.
        let hPad: CGFloat = isContainer ? 0 : NockerlSpace.space3
        let vPad: CGFloat = isContainer ? 0 : NockerlSpace.space2
        // FIELD = RECESSED input plane (fields sink): the opaque `canvasAlt` material.
        // CONTAINER = FLAT GROUND (§3): a translucent `canvas@0.3` facet. A scroll
        // container HOLDS cards that lift OFF it, so it reads as ground, not a field.
        let fill: Color = isContainer ? palette.canvas.opacity(0.3) : palette.canvasAlt

        content
            .padding(.horizontal, hPad)
            .padding(.vertical, vPad)
            .background(fill)
            // The recessed INNER top shade: FIELD ONLY (fields sink). The CONTAINER is
            // GROUND (§3): FLAT, cards lift off it. A sink shade would mistype it as input.
            .overlay(alignment: .top) {
                if !isContainer {
                    LinearGradient(
                        colors: [palette.shadowTint.opacity(0.45), .clear],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(height: NockerlSpace.space05)
                    .allowsHitTesting(false)
                }
            }
            // Clip content (and any scroll) to the well's rounded shape.
            .clipShape(shape)
            .overlay {
                shape.strokeBorder(palette.cardHairline, lineWidth: NockerlSpace.spacePx)
            }
        // NO outer drop shadow (fields sink, cards lift; the container is flat ground).
    }
}
