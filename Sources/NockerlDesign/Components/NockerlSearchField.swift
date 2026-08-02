// NockerlSearchField: the standardized SEARCH FIELD on Swift, the parity
// twin of the web/react canon SearchField (site SearchFieldDemo) + the compose
// NockerlSearchField: magnifier leading, a clear (✕) trailing ONLY when non-empty
// (a spinner while [loading]), filtering in place on every keystroke, Enter as the
// explicit submit. One contract, two implementations.
//
// Anatomy, to the canon:
//   - RECESSED FIELD-WELL (law §2, "fields sink"): reuses the
//     `.nockerlFieldWell()` chrome (sunken canvasAlt plane + inner top shade +
//     control-radius clip + neutral hairline; NO outer drop), so every Swift input
//     surface wears the ONE well.
//   - the leading MAGNIFIER is decorative (the field itself carries the name); the
//     trailing CLEAR is an INTERACTIVE icon via the icon-interactivity canon
//     (`NockerlIconButton`, flat `.plain` glyph, never inset), shown only when
//     there is text to clear.
//   - the query + placeholder render through `.nockerlType(_:)`, so now that
//      bundles + resolves Outfit, the field text runs the REAL face, not SF.
//   - a focus ring (accent, law §14 "focus visible") traces the well while editing.
//
// Platform deltas (law §9), vs the web/compose canon:
//   - `value` + `onChange` → `text: Binding<String>`: the SwiftUI controlled-input
//     idiom (the same delta `NockerlToggle` makes with `isOn:`).
//   - `enabled` → the SwiftUI environment (`.disabled(_:)`), read here, not a param.
//   - `onSubmit(value)` matches the web `onSubmit`; the compose `shape` (pill/toolbar)
//     extra is omitted (the web canon has none) until a Voice use-case needs it.

import SwiftUI

/// The standardized search field: a recessed well with a leading magnifier, a
/// trailing clear (or async spinner), in-place filtering, and Enter-to-submit. The
/// query is a `Binding`; enablement flows from the SwiftUI environment
/// (`.disabled(_:)`). Search fields carry no visible label by convention. The
/// accessible name is the [accessibilityLabel] (default: the placeholder), so the
/// always-named field + the visible magnifier satisfy law §14.
public struct NockerlSearchField: View {
    @Binding private var text: String
    private let placeholder: String
    private let accessibilityLabelText: String?
    private let loading: Bool
    private let onSubmit: ((String) -> Void)?

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.isEnabled) private var isEnabled
    @FocusState private var focused: Bool

    /// Create a search field.
    /// - Parameters:
    ///   - text: the current query (two-way; filters in place on every keystroke).
    ///   - placeholder: the hint text (and the default accessible name).
    ///   - accessibilityLabel: the field's accessible name; defaults to [placeholder].
    ///   - loading: render a spinner in the trailing slot (an async source in flight).
    ///   - onSubmit: optional explicit-submit callback (Enter / the search key),
    ///     handed the current query.
    public init(
        text: Binding<String>,
        placeholder: String = "Search",
        accessibilityLabel: String? = nil,
        loading: Bool = false,
        onSubmit: ((String) -> Void)? = nil
    ) {
        self._text = text
        self.placeholder = placeholder
        self.accessibilityLabelText = accessibilityLabel
        self.loading = loading
        self.onSubmit = onSubmit
    }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)
        let name = accessibilityLabelText ?? placeholder
        let shape = RoundedRectangle(cornerRadius: NockerlRadius.control, style: .continuous)
        // The compact clear button lays out at `space8` (32); floor the row there so
        // the well is a STABLE height whether or not the clear shows (no jump when a
        // query appears). Row 32 + the well's `space2` padding each side = a 48pt
        // well, clearing the 44pt touch target (law §14).
        let innerMinHeight = NockerlSpace.space8

        HStack(spacing: NockerlSpace.space2) {
            // Leading magnifier: decorative. The field carries the accessible name.
            Image(systemName: "magnifyingglass")
                .font(.system(size: NockerlFontSize.size16, weight: .medium))
                .foregroundColor(palette.onCardMuted)
                .accessibilityHidden(true)

            // The query: real Outfit via .nockerlType, with a token-styled
            // placeholder drawn under it (the built-in prompt can't take our face).
            ZStack(alignment: .leading) {
                if text.isEmpty {
                    Text(placeholder)
                        .nockerlType(.bodyMedium)
                        .foregroundColor(palette.onCardMuted)
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
                }
                TextField("", text: $text)
                    .textFieldStyle(.plain)
                    .nockerlType(.bodyMedium)
                    .foregroundColor(palette.onCard)
                    .focused($focused)
                    .submitLabel(.search)
                    .onSubmit { onSubmit?(text) }
                    .accessibilityLabel(name)
            }

            // Trailing: spinner while loading, else the clear when there's a query.
            if loading {
                ProgressView()
                    .controlSize(.small)
                    .tint(palette.accentPrimary)
                    .accessibilityHidden(true)
            } else if !text.isEmpty {
                // The clear is an INTERACTIVE icon (icon canon), a flat glyph,
                // compact so it sits neatly in the well while keeping its 44pt
                // target. Clearing keeps focus so typing can continue.
                NockerlIconButton(
                    systemName: "xmark",
                    label: "Clear search",
                    style: .plain,
                    density: .compact
                ) {
                    text = ""
                    focused = true
                }
            }
        }
        .frame(minHeight: innerMinHeight)
        .nockerlFieldWell()
        // Focus ring: the accent edge traces the well while editing (law §14).
        .overlay {
            if focused {
                shape.strokeBorder(palette.accentPrimary, lineWidth: NockerlFloatingBorder.width)
            }
        }
        .contentShape(shape)
        // Tapping anywhere in the well focuses the query (not just the glyph).
        .onTapGesture { focused = true }
        .opacity(isEnabled ? 1 : 0.55)
        .animation(.nockerlStandard(NockerlMotionDuration.fast), value: focused)
    }
}
