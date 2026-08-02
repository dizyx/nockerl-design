// NockerlIconButton: the one icon-affordance vocabulary for SwiftUI surfaces.
//
// Mirrors the ratified icon-button (Compose `NockerlIconButton` / React `IconButton`,
// Design Review #1). Four idioms:
//   - .plain:         a transparent glyph (toolbar / inline actions), control radius so any
//                      press wash matches every other control.
//   - .outline:       a neutral GRAY divider border + glyph, NO fill, control radius. This
//                      is the emphasis MIDDLE (the top-right "+" / add slot). Reduce-fills:
//                      state by outline (the pre-law .tonal soft-fill is retired). (/#5)
//   - .accentOutline: a CYAN accentPrimary border + cyan glyph, NO fill, control radius.
//                      The ACTIVE pole of `.outline`'s gray resting (the empty→active "+"
//                      flip). Accent-locked.
//   - .filledCircle:  a solid accent CIRCLE (pill radius) with an on-accent glyph. This is
//                      the ONE true circle in the system, the prominent send / stop slot.
//
// Geometry: the VISUAL box is 40pt (the shared control height), but the button always
// reserves a ≥44pt hit frame around it (`size.minTouch` / Apple HIG 44pt), so the
// tappable area never shrinks to the glyph (a11y law, design-laws §13).
//
// Every icon button MUST carry a NON-EMPTY accessible name (`label`): an icon-only
// control has no visible text, so an empty name ships an unnamed control to assistive
// tech. A blank label fails an assertion in debug builds; in release the label override is
// skipped so the image's own derived name (e.g. an SF Symbol's) can still surface.
// Same platform-honoring feedback as the button (design-laws §7); tokens-pure.

import SwiftUI

/// The SHARED two-tier control density (foundations/density, ): a tier
/// re-selects rhythm (box/row height + vertical padding) from the space scale.
/// Never fills, never type color. Components opt in PER INSTANCE (`density:
/// .compact`), never via a global context.
public enum NockerlControlDensity: Equatable {
    /// The default rhythm. Clears every platform touch floor outright.
    case comfortable
    /// The dense rhythm (32px control box): consoles, dense list rows. The
    /// 44pt accessibility hit target is PRESERVED via expanded touch bounds
    /// (the foundation's standard mechanism; law §13 floors are non-negotiable).
    case compact
}

/// The idiom for ``NockerlIconButton``.
public enum NockerlIconButtonStyle: Equatable {
    /// Transparent, control-radius tappable glyph with a neutral on-card glyph, a quiet
    /// inline / toolbar action.
    case plain

    /// A NEUTRAL GRAY outline (a `divider`-weight border) with NO fill on the control
    /// radius, the emphasis MIDDLE between `.plain` and `.filledCircle` (the canonical
    /// top-right "+" / add slot). Reduce-fills: state by outline, not fill; the glyph reads
    /// the `tint` like `.plain` (neutral default). Retires the pre-law `.tonal` soft-fill.
    /// (/#5)
    case outline

    /// A CYAN `accentPrimary` outline (accent border) with a cyan `accentPrimary` glyph, NO
    /// fill, on the control radius. The ACTIVE affordance vs `.outline`'s neutral-gray
    /// resting state (reduce-fills: active = border-shift + ink-shift, law §6). Drives the
    /// Voice "+" empty (`.outline` gray) → active (`.accentOutline` cyan) flip. Accent-locked:
    /// ignores `tint`.
    case accentOutline

    /// A solid `accentPrimary` circle with an on-accent glyph: the prominent send / stop
    /// slot, and the only true circle in the control family.
    case filledCircle
}

/// The glyph tint for a `.plain` ``NockerlIconButton``. Destructive icon
/// actions read via COLOR + GLYPH (the CTA grammar, never a screaming fill);
/// `.filledCircle` is the accent-locked send/stop slot and ignores tint.
public enum NockerlIconButtonTint: Equatable {
    /// The neutral on-card glyph, the default.
    case neutral
    /// Status-red glyph, the destructive affordance (delete, remove).
    case destructive
    /// An explicit glyph color (e.g. a categorical family hue): the escape hatch.
    case custom(Color)

    /// Resolve against the palette.
    func color(in palette: NockerlPalette) -> Color {
        switch self {
        case .neutral: return palette.onCard
        case .destructive: return palette.statusError
        case let .custom(color): return color
        }
    }
}

/// A single token-driven icon button. Renders one ``NockerlIconButtonStyle`` as a 40pt
/// visual inside a ≥44pt hit frame (`size.minTouch`, Apple HIG) with the shared press/hover
/// feedback, and always exposes a NON-EMPTY accessibility label (an icon-only control has
/// no visible text, so the name is required by accessibility law §13/§14).
public struct NockerlIconButton: View {
    private let image: Image
    private let label: String
    private let style: NockerlIconButtonStyle
    private let density: NockerlControlDensity
    private let tint: NockerlIconButtonTint
    private let action: () -> Void

    /// Create an icon button.
    /// - Parameters:
    ///   - image: the glyph to render.
    ///   - label: the REQUIRED, NON-EMPTY accessible name (there is no visible text to name
    ///     the action). Whitespace is trimmed; a blank value asserts in debug builds.
    ///   - style: the idiom (defaults to ``NockerlIconButtonStyle/plain``).
    ///   - density: the rhythm tier. `.comfortable` = the 40pt visual in
    ///     a >=44pt layout frame (unchanged default); `.compact` = a 32pt visual
    ///     that IS the layout footprint (dense rows keep their height) while the
    ///     44pt hit target extends INVISIBLY via expanded touch bounds. Space
    ///     compact neighbors >=12pt apart so hit zones don't overlap.
    ///   - tint: the `.plain` glyph tint, `.destructive` for status-red
    ///     delete/remove affordances; `.filledCircle` ignores it (accent-locked).
    ///   - action: invoked on tap.
    public init(
        _ image: Image,
        label: String,
        style: NockerlIconButtonStyle = .plain,
        density: NockerlControlDensity = .comfortable,
        tint: NockerlIconButtonTint = .neutral,
        action: @escaping () -> Void
    ) {
        let name = Self.accessibleName(from: label)
        assert(
            name != nil,
            "NockerlIconButton requires a non-empty accessible name. An icon-only control "
                + "is unnamed to assistive tech without one (design-laws §13, a11y is table stakes)."
        )
        self.image = image
        self.label = name ?? ""
        self.style = style
        self.density = density
        self.tint = tint
        self.action = action
    }

    /// SF Symbol convenience: `NockerlIconButton(systemName: "trash",
    /// label: "Delete", tint: .destructive) { … }`.
    public init(
        systemName: String,
        label: String,
        style: NockerlIconButtonStyle = .plain,
        density: NockerlControlDensity = .comfortable,
        tint: NockerlIconButtonTint = .neutral,
        action: @escaping () -> Void
    ) {
        self.init(
            Image(systemName: systemName),
            label: label,
            style: style,
            density: density,
            tint: tint,
            action: action
        )
    }

    public var body: some View {
        let core = Button(action: action) {
            image
        }
        .buttonStyle(IconButtonStyle(style: style, density: density, tint: tint))

        // A blank name never reaches here in debug (the init asserts). In release, skip the
        // override instead of applying `.accessibilityLabel("")`: an explicit empty label
        // would ERASE the image's own derived name (SF Symbols carry one), making it worse.
        if label.isEmpty {
            core
        } else {
            core.accessibilityLabel(label)
        }
    }

    /// Normalize a caller-supplied accessible name via the shared ``NockerlA11y`` gate.
    /// Kept as a passthrough so the original contract (and its tests) stay addressed
    /// from the component that introduced it.
    static func accessibleName(from label: String) -> String? {
        NockerlA11y.accessibleName(from: label)
    }
}

/// The `ButtonStyle` behind ``NockerlIconButton``. Reads the environment through a private
/// nested view (the idiomatic path for `colorScheme` / `isEnabled` inside a `ButtonStyle`).
private struct IconButtonStyle: ButtonStyle {
    let style: NockerlIconButtonStyle
    let density: NockerlControlDensity
    let tint: NockerlIconButtonTint

    // The square VISUAL box: `NockerlSpace.space10` == 40pt, the shared control height.
    static let size = NockerlSpace.space10
    // The hit frame around it: `size.minTouch` (44pt, Apple HIG); never smaller.
    static let minTouchTarget = NockerlSize.minTouch
    static let disabledAlpha: Double = 0.38

    /// Per-style visual quad (fill / glyph / radius / border), resolved HERE, not inside the
    /// ViewBuilder `body` (a `switch` statement can't live there). `.outline` (/#5) slots
    /// between `.plain` and `.filledCircle`; `.plain` / `.filledCircle` stay byte-identical to
    /// the pre-#5 boolean path. Tint shapes `.plain` + `.outline`; `.filledCircle` accent-locks.
    static func appearance(
        for style: NockerlIconButtonStyle,
        palette: NockerlPalette,
        tint: NockerlIconButtonTint
    ) -> (fill: Color, glyph: Color, radius: CGFloat, border: Color?) {
        switch style {
        case .plain:
            return (.clear, tint.color(in: palette), NockerlRadius.control, nil)
        case .outline:
            // Reduce-fills: NO fill, a neutral GRAY `divider` border + a tinted (neutral
            // default) glyph, the state-by-outline emphasis middle.
            return (.clear, tint.color(in: palette), NockerlRadius.control, palette.divider)
        case .accentOutline:
            // The ACTIVE affordance: NO fill, a CYAN accentPrimary border + cyan glyph
            // (accent-locked, ignores tint). The active pole of `.outline`'s gray resting.
            return (.clear, palette.accentPrimary, NockerlRadius.control, palette.accentPrimary)
        case .filledCircle:
            return (palette.accentPrimary, palette.onAccent, NockerlRadius.pill, nil)
        }
    }

    func makeBody(configuration: Configuration) -> some View {
        // Not named `Body`: a nested `Body` binds as the `ButtonStyle.Body` associatedtype
        // witness and leaks a visibility requirement. Opaque return keeps it inferred.
        StyleBody(style: style, density: density, tint: tint, configuration: configuration)
    }

    private struct StyleBody: View {
        let style: NockerlIconButtonStyle
        let density: NockerlControlDensity
        let tint: NockerlIconButtonTint
        let configuration: Configuration

        @Environment(\.colorScheme) private var colorScheme
        @Environment(\.isEnabled) private var isEnabled

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            // Per-style fill / glyph / radius / border (/#5). Resolved by `appearance(…)`
            // OUTSIDE the ViewBuilder (a `switch` statement can't live in `body`). `.outline`
            // slots between `.plain` and `.filledCircle`, ADDITIVE: `.plain` / `.filledCircle`
            // stay byte-identical. Tint shapes `.plain` + `.outline`; `.filledCircle` locks.
            let look = IconButtonStyle.appearance(for: style, palette: palette, tint: tint)
            let fill = look.fill
            let glyph = look.glyph
            let radius = look.radius
            let border = look.border

            // The visual box per tier: comfortable = 40pt (the shared control
            // height); compact = 32pt ({space.8}, the ratified compact row
            // height, foundations/density).
            let visual = density == .compact ? NockerlSpace.space8 : IconButtonStyle.size

            // Inner chain = the VISUAL (fill, clip, dim, press scale). Then the
            // hit geometry per tier. The >=44pt target is NON-NEGOTIABLE (law
            // §13) in both:
            //   - comfortable: an outer >=44pt LAYOUT frame, whole frame tappable.
            //   - compact: the visual IS the layout footprint (dense
            //     rows keep their height); the 44pt target extends INVISIBLY
            //     beyond the bounds via a negative-inset contentShape (the
            //     density foundation's expanded-touch-bounds mechanism).
            let core = configuration.label
                .foregroundColor(glyph)
                .frame(width: visual, height: visual)
                .background(fill)
                .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
                // Reduce-fills: `.outline` draws a neutral GRAY border (no fill); nil elsewhere.
                .overlay {
                    if let border {
                        RoundedRectangle(cornerRadius: radius, style: .continuous)
                            .strokeBorder(border, lineWidth: NockerlSpace.spacePx)
                    }
                }
                .opacity(isEnabled ? 1 : IconButtonStyle.disabledAlpha)
                .nockerlPressFeedback(isPressed: configuration.isPressed)

            if density == .compact {
                core.contentShape(
                    Rectangle().inset(by: -(IconButtonStyle.minTouchTarget - visual) / 2)
                )
            } else {
                core
                    .frame(
                        minWidth: IconButtonStyle.minTouchTarget,
                        minHeight: IconButtonStyle.minTouchTarget
                    )
                    .contentShape(Rectangle())
            }
        }
    }
}
