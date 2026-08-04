// NockerlButton: the one button vocabulary for SwiftUI surfaces.
//
// Mirrors the ratified button family (Compose `NockerlButton` / React `Button`, Design
// Review #1, Dashboard project 96): a single cyan FILL LADDER where hierarchy reads by
// WEIGHT, not hue. Every variant shares the 12pt control radius (never a pill; pills are
// reserved for chips + the input bar, design-laws §4) and pulls every color from the
// generated semantic palette via ``NockerlPalette``: no hardcoded colors, radii, or sizes.
//
// Label rule (design-laws §11): UPPERCASE, weight `.light`, tracked −0.03em.
// Buttons are the ONLY uppercase in the Nockerl type system.
//
// Feedback rule (design-laws §7): the fill is STATIC (the gradient never tweens); only
// interpolatable properties (opacity / brightness / scale) animate. See
// ``NockerlPressFeedback``.

import SwiftUI

/// The emphasis ladder for ``NockerlButton``. Cyan-locked so hierarchy reads by weight, not
/// hue: a solid call-to-action, a soft tonal echo, a quiet outline, a text-only whisper,
/// plus one red branch for destructive intent.
public enum NockerlButtonVariant: Equatable {
    /// Filled cyan call-to-action: one per surface ("Sign in", "Approve", "Create").
    /// A vertical `accentPrimaryHi → accentPrimary` gradient with an on-accent label.
    case primary

    /// Soft tonal cyan echo: the supporting action beside a primary. `accentPrimarySoft`
    /// fill, cyan label, thin cyan hairline.
    case secondary

    /// Outlined cyan: a low-emphasis action that still carries the accent ("Archive",
    /// "Edit"). Clear fill, cyan label, 1pt cyan border.
    case tertiary

    /// Text only: the quietest action ("Cancel", "Dismiss"). No fill, no border, neutral
    /// on-card label; reads as a link, never competes with a filled button.
    case ghost

    /// The red branch: irreversible / dangerous actions ("Delete", "Reject"). Kept OUTLINED
    /// (clear fill, `statusError` label + border); the solid-red fill is reserved for a final
    /// confirm step, not the default, so a destructive action is deliberate.
    case destructive

    /// Neutral GRAY outline: a quiet, NON-accent affordance for the "empty" / not-yet-active
    /// state. Clear fill, muted `onCardMuted` label, a `divider`-weight gray border (never
    /// cyan). The framework half of the app-driven empty→active flip: a host swaps this for
    /// the cyan `.tertiary` once the action becomes live (reduce-fills: state by outline).
    case neutralOutline
}

/// The shared size ramp (ratified r2, B1): visual heights 32/40/48pt with per-size
/// type + padding (web `sm/md/lg` parity). The TOUCH target never shrinks below the
/// ~44pt platform floor (`size.minTouch`): the style reserves the floor around the
/// visual box, so an `.sm` button LOOKS 32pt but stays fully tappable.
public enum NockerlButtonSize: Equatable {
    /// 32pt: dense toolbars, inline rows (12pt label).
    case sm
    /// 40pt: the default control height (14pt label).
    case md
    /// 48pt: hero / block actions (14pt label).
    case lg

    /// Visual min height of the control box.
    var height: CGFloat {
        switch self {
        case .sm: return NockerlSpace.space8
        case .md: return NockerlSpace.space10
        case .lg: return NockerlSpace.space12
        }
    }

    /// Label point size (web sm=12 / md,lg=14 parity).
    var fontSize: CGFloat {
        switch self {
        case .sm: return NockerlFontSize.size12
        case .md, .lg: return NockerlFontSize.size14
        }
    }

    /// Horizontal content padding.
    var hPad: CGFloat {
        switch self {
        case .sm: return NockerlSpace.space3
        case .md: return NockerlSpace.space4
        case .lg: return NockerlSpace.space5
        }
    }

    /// Vertical content padding.
    var vPad: CGFloat {
        switch self {
        case .sm: return NockerlSpace.space1
        case .md: return NockerlSpace.space2
        case .lg: return NockerlSpace.space3
        }
    }
}

/// The `ButtonStyle` that renders the ``NockerlButtonVariant`` ladder. Applied for you by
/// ``NockerlButton``; expose it directly only if you need the Nockerl look on a bespoke
/// `Button` (e.g. one whose action is built by another API).
///
/// Reads `@Environment(\.colorScheme)` and `@Environment(\.isEnabled)` via a private nested
/// view, the idiomatic way to get environment values into a `ButtonStyle` (`makeBody` is
/// not itself a `View` and cannot hold `@Environment`).
public struct NockerlButtonStyle: ButtonStyle {
    /// The ladder step this style renders.
    public let variant: NockerlButtonVariant

    /// The size rung this style renders.
    public let size: NockerlButtonSize

    /// Create a style for a given variant + size.
    public init(variant: NockerlButtonVariant = .primary, size: NockerlButtonSize = .md) {
        self.variant = variant
        self.size = size
    }

    public func makeBody(configuration: Configuration) -> some View {
        // Hop into a real View so we can read the environment (colorScheme + isEnabled). The
        // wrapper is deliberately NOT named `Body`: a nested `Body` binds as the
        // `ButtonStyle.Body` associatedtype witness and Swift then requires it be as public as
        // the (public) style. `makeBody`'s opaque `some View` keeps the associatedtype inferred
        // opaquely, so the wrapper stays private.
        StyleBody(variant: variant, size: size, configuration: configuration)
    }

    /// The environment-reading body of the style. Resolves the palette for the active scheme
    /// and paints the variant, honoring the enabled state.
    private struct StyleBody: View {
        let variant: NockerlButtonVariant
        let size: NockerlButtonSize
        let configuration: Configuration

        @Environment(\.colorScheme) private var colorScheme
        @Environment(\.isEnabled) private var isEnabled

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let spec = ButtonVariantSpec(variant: variant, palette: palette, enabled: isEnabled)
            // Ratified B1: the solid primary wears the shared top catch-light
            // (enabled only: a dimmed disabled fill stays flat).
            let lit = variant == .primary && isEnabled

            configuration.label
                .font(.nockerl(size: size.fontSize, weight: .light))
                .foregroundColor(spec.label)
                .padding(.horizontal, size.hPad)
                .padding(.vertical, size.vPad)
                .frame(minHeight: size.height)
                .background(spec.fill)
                .overlay(alignment: .top) {
                    if lit {
                        // RULING: one identical catch-light everywhere, the SAME
                        // surfaceHighlight token the web binds (--color-surface-highlight).
                        Rectangle()
                            .fill(palette.surfaceHighlight)
                            .frame(height: NockerlSpace.spacePx)
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: NockerlRadius.control, style: .continuous)
                        .strokeBorder(spec.border ?? Color.clear, lineWidth: NockerlSpace.spacePx)
                )
                .clipShape(RoundedRectangle(cornerRadius: NockerlRadius.control, style: .continuous))
                .nockerlPressFeedback(isPressed: configuration.isPressed)
                // Touch floor: the visual box may be 32pt (.sm); the interactive
                // area keeps the ~44pt platform floor (law §14 / size.minTouch).
                .frame(minHeight: max(size.height, NockerlSize.minTouch))
                .contentShape(Rectangle())
        }
    }
}

/// Resolves a ``NockerlButtonVariant`` to its concrete fill / label / border for a palette
/// and enabled state. Kept as a small value type (not view code) so the ladder is testable
/// and lives in one place.
private struct ButtonVariantSpec {
    /// The resting fill (a `LinearGradient` for primary, otherwise a solid/clear `Color`),
    /// type-erased so all variants share one property.
    let fill: AnyShapeStyle
    /// The label ink.
    let label: Color
    /// The outline stroke, or `nil` for no border.
    let border: Color?

    // Secondary's border is a hairline ECHO of the accent, the accent token at a fixed low
    // alpha (design-laws §5: tints come from accent tokens at fixed alphas). This is an alpha
    // derivation of a token color, not a new literal color.
    private static let secondaryBorderAlpha: Double = 0.28

    init(variant: NockerlButtonVariant, palette: NockerlPalette, enabled: Bool) {
        // Disabled damps the whole family to a muted label + hairline border + reduced fill,
        // and stays clearly visible (never invisible) per accessibility law §13.
        guard enabled else {
            self.fill = AnyShapeStyle(palette.cardSurface1)
            self.label = palette.onCardMuted
            self.border = variant == .primary || variant == .ghost ? nil : palette.cardHairline
            return
        }

        switch variant {
        case .primary:
            // Ratified B1: SOLID cyan. The lit-from-above read comes from the 1pt
            // top catch-light the style overlays, never a gradient fill.
            self.fill = AnyShapeStyle(palette.accentPrimary)
            self.label = palette.onAccent
            self.border = nil

        case .secondary:
            self.fill = AnyShapeStyle(palette.accentPrimarySoft)
            self.label = palette.accentPrimary
            self.border = palette.accentPrimary.opacity(Self.secondaryBorderAlpha)

        case .tertiary:
            self.fill = AnyShapeStyle(Color.clear)
            self.label = palette.accentPrimary
            self.border = palette.accentPrimary

        case .ghost:
            self.fill = AnyShapeStyle(Color.clear)
            self.label = palette.onCard
            self.border = nil

        case .destructive:
            // Outlined red. The solid-red fill is reserved for a final confirm, not here.
            self.fill = AnyShapeStyle(Color.clear)
            self.label = palette.statusError
            self.border = palette.statusError

        case .neutralOutline:
            // Neutral GRAY outline: the non-accent, quiet affordance (empty / inactive).
            // Clear fill, muted neutral label, a `divider`-weight gray edge (no cyan).
            self.fill = AnyShapeStyle(Color.clear)
            self.label = palette.onCardMuted
            self.border = palette.divider
        }
    }
}

/// The unified Nockerl button. Use it for EVERY tappable label affordance on a SwiftUI
/// surface. Renders one ``NockerlButtonVariant`` from the cyan fill ladder at the 12pt
/// control radius, with an uppercase, light (300), −0.03em label (design-laws §11).
/// Buttons are the only uppercase in the system.
///
/// Fill ladder (design-laws §10; Design Review #1):
/// - `.primary`: filled cyan vertical gradient, on-accent label.
/// - `.secondary`: soft cyan fill, cyan label, thin cyan border.
/// - `.tertiary`: clear fill, cyan label + border.
/// - `.ghost`: clear fill, neutral on-card label, no border.
/// - `.destructive`: clear fill, red label + border (outline; fill reserved for confirm).
/// - `.neutralOutline`: clear fill, muted gray label + `divider` gray border; the non-accent
///   "empty" affordance the app flips to `.tertiary` when the action becomes active.
///
/// Feedback honors the platform (design-laws §7 / §9): the fill is static; press animates a
/// subtle opacity/brightness/scale, and macOS adds a slight hover brightness. Honors
/// `.disabled(_:)`: a disabled button dims to a muted label + hairline border and is not
/// interactive.
public struct NockerlButton: View {
    private let text: String
    private let variant: NockerlButtonVariant
    private let size: NockerlButtonSize
    private let action: () -> Void

    /// Create a button.
    /// - Parameters:
    ///   - text: the label (rendered uppercase).
    ///   - variant: the fill-ladder step (defaults to ``NockerlButtonVariant/primary``).
    ///   - size: the shared sm/md/lg ramp (defaults to ``NockerlButtonSize/md``); the
    ///     touch target never drops below the ~44pt platform floor.
    ///   - action: invoked on tap.
    public init(
        _ text: String,
        variant: NockerlButtonVariant = .primary,
        size: NockerlButtonSize = .md,
        action: @escaping () -> Void
    ) {
        self.text = text
        self.variant = variant
        self.size = size
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            // Uppercase is applied here (the label content); weight/size/color come from the
            // style. Tracking is applied only where the OS supports it (macOS-12 floor).
            Text(text.uppercased())
                .nockerlButtonTracking(fontSize: size.fontSize)
        }
        .buttonStyle(NockerlButtonStyle(variant: variant, size: size))
    }
}
