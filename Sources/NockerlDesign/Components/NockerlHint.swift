// NockerlHint is inline form MICRO-COPY on Swift: the muted caption under
// a field / control ("Runs on login", "Requires restart"). ONE voice for it:
// onCanvasMuted + size12 light + the form-microcopy rhythm (the Field help's
// space-1 gap above), so settings surfaces stop hand-rolling the treatment.
//
// Deliberately DISTINCT from its siblings (do not conflate):
//   - ``NockerlInfoTip`` is a POPOVER TRIGGER (the i glyph you tap);
//   - ``NockerlCallout`` is a BANNER (a surfaced block with an intent);
//   - a HINT is quiet inline text, always visible, never interactive.
//
// Mirrors the web Field primitive's helper line (size-12 / muted). Status-toned
// helper text (error/warning under a field) is the FIELD's job. The hint stays
// neutral micro-copy.

import SwiftUI

/// Inline muted micro-copy: `NockerlHint("Requires restart")`, or apply the
/// same voice to any text with the ``SwiftUI/View/nockerlHint()`` modifier.
public struct NockerlHint: View {
    private let text: String

    /// Create a hint line.
    /// - Parameter text: the micro-copy.
    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text).nockerlHint()
    }
}

public extension View {
    /// The form micro-copy voice: `onCanvasMuted` ink, size-12 light
    /// type, wrapping enabled, and the Field-help rhythm (a `space.1` inset
    /// above, the gap the web field stack puts before its helper line).
    func nockerlHint() -> some View {
        modifier(NockerlHintModifier())
    }
}

/// Resolves the palette per scheme. The modifier form exists so ANY text
/// (including attributed/localized Text the host builds) can take the voice.
private struct NockerlHintModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .font(.nockerl(size: NockerlFontSize.size12, weight: .light))
            .foregroundColor(NockerlPalette.resolve(colorScheme).onCanvasMuted)
            .padding(.top, NockerlSpace.space1)
            .fixedSize(horizontal: false, vertical: true)
    }
}
