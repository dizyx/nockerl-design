// NockerlFieldWell: the recessed-well INPUT chrome as a reusable Swift modifier
// for law §2's "fields sink" grammar, so every text field / input surface in
// a Swift client wears the ONE well instead of hand-rolling
// background+border+shadow (the exact drift Voice's `nockerlFieldBackground()`
// accumulated, as that implementation is INPUT only).
//
//   - `canvasAlt` plane (the sunken field fill)
//   - the INNER top shade (the callout-well idiom: shadow falls INTO the well)
//   - control radius clip + the neutral `cardHairline` edge
//   - NO outer drop shadow (fields sink; cards lift)

import SwiftUI

/// The recessed field-well chrome (law §2, "fields sink"). Apply to the CONTENT
/// of a text field / input surface: `TextField(...).nockerlFieldWell()`.
public extension View {
    /// Wrap this view in the recessed input-well chrome: sunken `canvasAlt`
    /// plane, inner top shade, control-radius clip, neutral hairline.
    func nockerlFieldWell() -> some View {
        modifier(NockerlFieldWellModifier())
    }
}

private struct NockerlFieldWellModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        let palette = NockerlPalette.resolve(colorScheme)
        let shape = RoundedRectangle(cornerRadius: NockerlRadius.control, style: .continuous)

        content
            .padding(.horizontal, NockerlSpace.space3)
            .padding(.vertical, NockerlSpace.space2)
            .background(palette.canvasAlt)
            // The recessed well's INNER top shade: the shadow falls INTO the
            // plane ("fields sink"), never a drop below it.
            .overlay(alignment: .top) {
                LinearGradient(
                    colors: [palette.shadowTint.opacity(0.45), .clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: NockerlSpace.space05)
                .allowsHitTesting(false)
            }
            .clipShape(shape)
            .overlay {
                shape.strokeBorder(palette.cardHairline, lineWidth: NockerlSpace.spacePx)
            }
    }
}
