// NockerlCard: the lifted-card surface for SwiftUI, with the L1 to L4 elevation ladder.
//
// The canonical lifted-card recipe (card.mdx / design-laws §1 to §3), previously composed
// inline at every Voice call site: solid `cardSurface1` fill on the 16pt card radius, a
// hairline border, a NEUTRAL `shadowTint` drop below (never colored, never a glow), and
// the 1pt `surfaceHighlight` top catch-light above, lit from a single overhead source.
//
// Elevation ladder: the four web rungs land as ``NockerlCardElevation``, the downward
// y-offset from the generated `NockerlElevation` tokens (2.5/5/9/14) paired with the generated
// `NockerlShadowTintAlpha` opacity ladder (28/30/33/35%, the v1.8.0 tokenized + HALVED
// lift-shadow). v1.17.0 HARD-OFFSET mapping: token → `shadow(y:)`, blur pinned to 0
// (`NockerlElevation.blur`), x 0. A crisp shadow cast straight down.
//
// Selectable variant (v1.9.0): pass `selected` for the selectable-canvas-card treatment.
// The neutral hairline is replaced by a thin `accentPrimary` edge (law §6: a shape on the
// card plane, not a halo/stripe). NO fill wash (the design lead's ruling: a soft wash reads
// poorly on white cards); selection reads via the accent border + the app's radio dot +
// the accent title ink (tinted at the call site).
//
// Tappable cards: pass `onTap`, the ONE tappable-card affordance. The card becomes a
// plain `Button` carrying the shared `NockerlPressFeedback` (opacity/brightness/scale:
// interpolatable only, law §7), so cards press exactly like every other Nockerl control
// while macOS keeps its native hover feel.

import SwiftUI

/// The card elevation ladder: web L1 to L4 parity, values from the generated tokens.
public enum NockerlCardElevation: Equatable {
    /// Resting hairline lift (chips, inline rows) at a 2.5pt down-offset.
    case level1
    /// Standard card lift (most cards; the default) at a 5pt down-offset.
    case level2
    /// Raised lift (popovers, the input bar) at a 9pt down-offset.
    case level3
    /// The sheet rung (sheets, dialogs, floating toasts) at a 14pt down-offset.
    case level4

    /// The shared surface rung, where `NockerlCardElevation` and ``NockerlSurfaceLevel`` are 1:1
    /// (v1.15.0). The blur + shadow-tint mapping lives ONCE, on `NockerlSurfaceLevel`, so the
    /// card and every other Nockerl surface (the tab panel, sheets) can never drift on depth.
    var surfaceLevel: NockerlSurfaceLevel {
        switch self {
        case .level1: return .level1
        case .level2: return .level2
        case .level3: return .level3
        case .level4: return .level4
        }
    }

    /// Shadow y-offset: the `elevation.*` token value (via the shared ``NockerlSurfaceLevel``;
    /// the HARD-OFFSET downward distance, blur pinned to 0).
    var offset: CGFloat { surfaceLevel.offset }

    /// Shadow-tint mix from the generated `NockerlShadowTintAlpha` ladder (v1.8.0: tokenized +
    /// HALVED to 28/30/33/35%, the ratified lighter lift-shadow), via ``NockerlSurfaceLevel``.
    /// Restored after a v1.9.1-fold regression reintroduced the old hardcoded 55/60/65/70%.
    var tintAlpha: Double { surfaceLevel.tintAlpha }
}

/// The lifted card. Static by default; pass ``init(elevation:onTap:content:)``'s `onTap`
/// for the tappable form. Content is not padded. Pad at the call site (the shared
/// convention is 16pt).
public struct NockerlCard<Content: View>: View {
    private let elevation: NockerlCardElevation
    private let selected: Bool
    private let onTap: (() -> Void)?
    private let gradient: Bool
    private let content: Content

    /// Create a card.
    /// - Parameters:
    ///   - elevation: the ladder rung (defaults to ``NockerlCardElevation/level2``).
    ///   - selected: the SELECTABLE-card variant (v1.9.0). When `true`, the neutral
    ///     `cardHairline` border is replaced by a thin `accentPrimary` edge (law §6: a
    ///     shape on the card plane, never a rail/stripe). NO fill wash (the design lead's ruling:
    ///     a soft wash reads poorly on white cards); selection reads via the accent
    ///     border + the app's radio dot + the accent title ink. Tint the active name ink
    ///     to `accentPrimary` at the call site; you already hold `selected` there (the
    ///     NavRow ink pattern). Default `false` = the ratified neutral card (byte-identical).
    ///   - onTap: when non-nil, the card is the ONE tappable-card affordance (a plain
    ///     button with the shared Nockerl press feedback).
    ///   - gradient: EXPERIMENTAL opt-in, a subtle theme-following
    ///     diagonal surface gradient instead of the flat fill. Default `false` =
    ///     the ratified flat `cardSurface1` (byte-identical). NOT ratified canon.
    ///   - content: the card body.
    public init(
        elevation: NockerlCardElevation = .level2,
        selected: Bool = false,
        onTap: (() -> Void)? = nil,
        gradient: Bool = false,
        @ViewBuilder content: () -> Content
    ) {
        self.elevation = elevation
        self.selected = selected
        self.onTap = onTap
        self.gradient = gradient
        self.content = content()
    }

    public var body: some View {
        if let onTap {
            Button(action: onTap) {
                CardChrome(elevation: elevation, selected: selected, gradient: gradient) { content }
            }
            .buttonStyle(CardButtonStyle())
        } else {
            CardChrome(elevation: elevation, selected: selected, gradient: gradient) { content }
        }
    }
}

/// The card's visual recipe, shared by the static and tappable forms.
private struct CardChrome<Content: View>: View {
    let elevation: NockerlCardElevation
    var selected: Bool = false
    var gradient: Bool = false
    @ViewBuilder let content: () -> Content

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)

        // Refactored onto the shared ``NockerlSurface`` recipe (v1.15.0): the card plane
        // (fill + top catch-light + neutral shadow + edge) is now the ONE shared treatment,
        // so it can't drift from the tab panel / future surfaces (the NockerlRecessedDisc
        // lesson). The card keeps its own axes: the elevation rung, the selectable accent
        // edge, and the  gradient fill. All are passed INTO the shared modifier, never inlined.
        content()
            .nockerlSurface(
                variant: .card,
                level: elevation.surfaceLevel,
                //  experimental diagonal theme-following gradient (`cardSurface2`
                // top-trailing → `cardSurface1` bottom-leading: a ~1-step surface delta,
                // a gentle sheen), else the flat `cardSurface1` (nil → the shared default).
                fill: gradient
                    ? AnyShapeStyle(
                        LinearGradient(
                            colors: [palette.cardSurface2, palette.cardSurface1],
                            startPoint: .topTrailing,
                            endPoint: .bottomLeading
                        )
                    )
                    : nil,
                // Selected → thin accentPrimary@0.45 edge (mirror NavRow); else `cardHairline`.
                // A shape on the card plane (law §6), no wash. Selection reads via the edge.
                borderColor: selected
                    ? palette.accentPrimary.opacity(NockerlBorderOpacity.selection)
                    : palette.cardHairline,
                borderWidth: NockerlBorder.widthSelection
            )
            // Cross-fade the border on selection (interpolatable, law §7).
            .animation(
                reduceMotion ? nil : .nockerlStandard(NockerlMotionDuration.fast),
                value: selected
            )
    }
}

/// Press style for tappable cards, the shared interpolatable-only feedback.
private struct CardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .nockerlPressFeedback(isPressed: configuration.isPressed)
    }
}
