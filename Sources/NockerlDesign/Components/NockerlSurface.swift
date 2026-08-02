// NockerlSurface: the shared lifted-surface primitive for SwiftUI (v1.15.0).
//
// ONE home for the canonical lifted-surface recipe ~every contained surface hand-rolled:
// a solid `cardSurface1` fill, the 1pt `surfaceHighlight` top catch-light (lit from a
// single overhead source), a NEUTRAL `shadowTint` drop for each rung L1 through L4 (never
// colored, never a glow), and a hairline edge, all on the surface radius. Mirrors the web
// `NockerlSurface` primitive (variant card|panel · level 1 to 4 · configurable edge).
//
// ANTI-DRIFT, the NockerlRecessedDisc lesson (one shared primitive kills the drift class):
// `NockerlCard` is refactored onto THIS modifier, so the card plane and every other Nockerl
// surface (the tab panel, future sheets) are drawn from the SAME treatment and can never
// drift. The ONLY sanctioned differences are the parameterized axes below (radius variant,
// shadow level, and the edge color/width, e.g. NockerlCard's neutral hairline vs. a floating
// panel's §2 cyan edge, e.g. the HUD drawer). Do NOT re-inline this recipe at a call site.
//
// EDGE CHOICE (v1.15.1). Do not confuse the two:
//   • CONTENT CONTAINERS (cards, the tabs content-panel) use the CARD treatment: a light
//     `.level1` lift + the NEUTRAL `cardHairline` edge at `NockerlSpace.spacePx` (see `NockerlCard`).
//   • The §2 accentPrimary FLOATING edge (`variant .panel` + `borderColor: accentPrimary` +
//     `borderWidth: NockerlFloatingBorder.width`) is ONLY for elements that FLOAT OVER content:
//     input pills, the scroll-down affordance, FABs, the HUD drawer (design-laws §2). A tab's
//     content panel is a card, NOT a float. It takes the neutral card edge.

import SwiftUI

/// Sanctioned surface radius: `.card` (16pt, `NockerlRadius.card`) | `.panel` (12pt,
/// `NockerlRadius.panel`). Default `.card`.
public enum NockerlSurfaceVariant: Equatable {
    /// The 16pt card radius, the default lifted card.
    case card
    /// The 12pt panel radius for tighter contained panels (tab panels, sheets, wells).
    case panel

    /// The corner radius token for the variant.
    public var radius: CGFloat {
        switch self {
        case .card: return NockerlRadius.card
        case .panel: return NockerlRadius.panel
        }
    }
}

/// The canonical neutral shadow ladder (web L1 to L4 parity): the SINGLE source of the
/// y-offset + shadow-tint mapping (`NockerlCardElevation` delegates here, so a depth change is
/// one edit). Values come from the generated `NockerlElevation` + `NockerlShadowTintAlpha`
/// tokens (v1.17.0 HARD-OFFSET: the rung value is the downward y-offset, blur pinned to 0).
public enum NockerlSurfaceLevel: Equatable {
    /// Resting hairline lift (chips, inline rows) at a 2.5pt down-offset.
    case level1
    /// Standard surface lift (most cards / panels; the default) at a 5pt down-offset.
    case level2
    /// Raised lift (popovers, the input bar) at a 9pt down-offset.
    case level3
    /// The sheet rung (sheets, dialogs, floating toasts) at a 14pt down-offset.
    case level4

    /// Shadow y-offset: the `elevation.*` token value (the HARD-OFFSET downward distance;
    /// blur is a constant 0 via `NockerlElevation.blur`).
    public var offset: CGFloat {
        switch self {
        case .level1: return NockerlElevation.level1
        case .level2: return NockerlElevation.level2
        case .level3: return NockerlElevation.level3
        case .level4: return NockerlElevation.sheet
        }
    }

    /// Shadow-tint mix, the generated `NockerlShadowTintAlpha` ladder (28/30/33/35%).
    public var tintAlpha: Double {
        switch self {
        case .level1: return NockerlShadowTintAlpha.level1
        case .level2: return NockerlShadowTintAlpha.level2
        case .level3: return NockerlShadowTintAlpha.level3
        case .level4: return NockerlShadowTintAlpha.sheet
        }
    }
}

/// The shared lifted-surface modifier: the ONE lifted-surface recipe (fill + top
/// catch-light + neutral drop shadow + hairline edge). Apply via ``SwiftUI/View/nockerlSurface(variant:level:fill:borderColor:borderWidth:)``.
public struct NockerlSurfaceModifier: ViewModifier {
    let variant: NockerlSurfaceVariant
    let level: NockerlSurfaceLevel
    /// Optional fill override (e.g. NockerlCard's experimental gradient). `nil` → solid `cardSurface1`.
    let fill: AnyShapeStyle?
    /// Optional edge color. `nil` → the neutral `cardHairline` (cards + content panels). A floating
    /// panel that floats OVER content (e.g. the HUD drawer) passes `accentPrimary` for the §2 edge.
    let borderColor: Color?
    /// Edge width. Defaults to the 1pt hairline; the §2 floating edge passes `NockerlFloatingBorder.width`.
    let borderWidth: CGFloat

    @Environment(\.colorScheme) private var colorScheme

    public func body(content: Content) -> some View {
        let palette = NockerlPalette.resolve(colorScheme)
        let shape = RoundedRectangle(cornerRadius: variant.radius, style: .continuous)

        content
            // Solid `cardSurface1` (or the caller's fill), STATIC per rung (the shadow grows,
            // never the lightness).
            .background(fill ?? AnyShapeStyle(palette.cardSurface1))
            // The 1pt top catch-light, lit from above (token alpha baked in).
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(palette.surfaceHighlight)
                    .frame(height: NockerlSpace.spacePx)
            }
            .clipShape(shape)
            // The edge: neutral `cardHairline` by default (cards + content panels); a
            // floating-over-content panel may pass an accent (the §2 cyan floating edge, e.g.
            // the HUD drawer). A shape on the plane (law §6), no wash.
            .overlay(shape.strokeBorder(borderColor ?? palette.cardHairline, lineWidth: borderWidth))
            // NEUTRAL drop straight DOWN, the HARD-OFFSET shadow (v1.17.0): blur 0
            // (`NockerlElevation.blur`), x 0, y = the rung's down-offset, at the canon tint
            // mix. A crisp shadow that never spills sideways or above the top edge.
            .shadow(
                color: palette.shadowTint.opacity(level.tintAlpha),
                radius: NockerlElevation.blur,
                x: 0,
                y: level.offset
            )
    }
}

public extension View {
    /// Draw `self` as a Nockerl lifted surface (the shared recipe: `cardSurface1` fill +
    /// top catch-light + neutral shadow + hairline edge). Content is NOT padded. Pad at the
    /// call site.
    /// - Parameters:
    ///   - variant: the surface radius (``NockerlSurfaceVariant/card`` default | ``NockerlSurfaceVariant/panel``).
    ///   - level: the neutral shadow rung (``NockerlSurfaceLevel/level2`` default).
    ///   - fill: an optional fill override; `nil` = solid `cardSurface1`.
    ///   - borderColor: an optional edge color; `nil` = the neutral `cardHairline`.
    ///   - borderWidth: the edge width; defaults to the 1pt hairline.
    func nockerlSurface(
        variant: NockerlSurfaceVariant = .card,
        level: NockerlSurfaceLevel = .level2,
        fill: AnyShapeStyle? = nil,
        borderColor: Color? = nil,
        borderWidth: CGFloat = NockerlSpace.spacePx
    ) -> some View {
        modifier(
            NockerlSurfaceModifier(
                variant: variant,
                level: level,
                fill: fill,
                borderColor: borderColor,
                borderWidth: borderWidth
            )
        )
    }
}

/// A lifted-surface CONTAINER, the SwiftUI twin of the web `<NockerlSurface>`: wraps its
/// content in the shared surface recipe (``SwiftUI/View/nockerlSurface(variant:level:fill:borderColor:borderWidth:)``).
/// Content is not padded. Pad at the call site.
public struct NockerlSurface<Content: View>: View {
    private let variant: NockerlSurfaceVariant
    private let level: NockerlSurfaceLevel
    private let fill: AnyShapeStyle?
    private let borderColor: Color?
    private let borderWidth: CGFloat
    private let content: Content

    /// Create a lifted surface container.
    public init(
        variant: NockerlSurfaceVariant = .card,
        level: NockerlSurfaceLevel = .level2,
        fill: AnyShapeStyle? = nil,
        borderColor: Color? = nil,
        borderWidth: CGFloat = NockerlSpace.spacePx,
        @ViewBuilder content: () -> Content
    ) {
        self.variant = variant
        self.level = level
        self.fill = fill
        self.borderColor = borderColor
        self.borderWidth = borderWidth
        self.content = content()
    }

    public var body: some View {
        content.nockerlSurface(
            variant: variant,
            level: level,
            fill: fill,
            borderColor: borderColor,
            borderWidth: borderWidth
        )
    }
}

#if DEBUG
struct NockerlSurface_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: NockerlSpace.space4) {
            NockerlSurface {
                Text("Card surface (level 2, hairline)").padding(NockerlSpace.space4)
            }
            NockerlSurface(variant: .panel, level: .level3) {
                Text("Panel surface (level 3)").padding(NockerlSpace.space4)
            }
        }
        .padding(NockerlSpace.space6)
        .background(Color.gray.opacity(0.2))
        .previewDisplayName("NockerlSurface")
    }
}
#endif
