// NockerlPalette: the theme-resolution bridge for the SwiftUI component layer.
//
// The generated tokens split the semantic color slots into two SEPARATE enums with
// identical member names, `NockerlDarkColors` and `NockerlLightColors` (see
// NockerlTokens.swift). Because they are two distinct types, a component cannot simply
// hold "one enum or the other"; there is nothing to abstract over at the type level.
//
// `NockerlPalette` is that abstraction: a plain value type carrying exactly the color
// slots the button family needs, populated from the correct generated enum for the active
// `ColorScheme`. Components read `@Environment(\.colorScheme)` and call `resolve(_:)`, so a
// single component body renders correctly in light and dark without duplicating logic.
//
// Tokens-pure: every stored value is a generated token `Color`; this file introduces ZERO
// literal colors, sizes, or radii.

import SwiftUI

/// The subset of the semantic palette consumed by the SwiftUI component layer, resolved for
/// a single ``ColorScheme``.
///
/// The generated palette lives in two type-distinct enums (`NockerlDarkColors` /
/// `NockerlLightColors`) with matching member names. This value type unifies them so a
/// component reads one set of slots regardless of theme; fill it with ``resolve(_:)``.
///
/// Only the button-family slots are exposed here. The framework grows this struct as new
/// component families land, rather than mirroring the entire (large) token surface.
public struct NockerlPalette {
    // MARK: Accent (the cyan ladder)

    /// Brand cyan: the solid accent. Primary fill floor + secondary/tertiary label + border.
    public let accentPrimary: Color
    /// Lit-from-above cyan, the top stop of the primary vertical fill gradient.
    public let accentPrimaryHi: Color
    /// Deeper primary cyan: the DARK end of a fill gradient / pressed accent, the
    /// Hi token's dark sibling. Resolves per theme; the light ramp is retuned one
    /// step deeper so light gradients actually grade.
    public let accentPrimaryDark: Color
    /// Low-alpha cyan tint: the secondary fill and the selected-chip wash (design-laws §6).
    public let accentPrimarySoft: Color
    /// Secondary accent (currently unused by the button family; reserved for the ladder).
    public let accentSecondary: Color
    /// Readable ink for content sitting ON a solid accent fill (primary label, circle glyph).
    public let onAccent: Color

    // MARK: On-surface ink

    /// Default on-card ink: ghost-button label and unselected-chip label.
    public let onCard: Color
    /// Muted on-card ink, the disabled label across the whole family.
    public let onCardMuted: Color
    /// Default on-canvas ink, the surface ink on the page ground (brand wordmark).
    public let onCanvas: Color
    /// Muted on-canvas ink: metadata on the page ground (language badges, inactive labels).
    public let onCanvasMuted: Color

    // MARK: Lines & neutral surfaces

    /// Faint hairline, the disabled border across the family.
    public let cardHairline: Color
    /// Status red: the destructive outline (label + border).
    public let statusError: Color
    /// Alternate canvas step (reserved neutral surface slot).
    public let canvasAlt: Color
    /// The chat-feed ground, the faceted field's base tone.
    public let chatBg: Color
    /// The canvas edge line, the faceted field's hairline hue.
    public let canvasEdge: Color
    /// Resting card surface: the unselected-chip fill.
    public let cardSurface1: Color

    // MARK: Status ladder (badge tones, status dots, progress tones)

    /// Status green: success confirmations.
    public let statusSuccess: Color
    /// Status amber: warnings (never decorative, design-laws §10).
    public let statusWarning: Color
    /// Status cyan-info: informational state.
    public let statusInfo: Color

    // MARK: Session-dot ladder (live-state dots)

    /// Streaming/live cyan dot.
    public let dotStreaming: Color
    /// Needs-attention amber dot.
    public let dotAttention: Color
    /// Unread blue dot.
    public let dotUnread: Color
    /// Active/selected green dot.
    public let dotActive: Color
    /// Idle muted-gray dot (also the neutral status-dot hue).
    public let dotIdle: Color

    // MARK: Categorical

    /// Agent orange, the categorical family hue client #1 uses for the inbox badge.
    public let familyAgent: Color

    // MARK: Surfaces & material (card / alert family)

    /// The page ground: darkest layer; also the disc-glyph knockout ink.
    public let canvas: Color
    /// One tier above the resting card, the toast/floating surface.
    public let cardSurface2: Color

    /// The CHROME plane: top bar / floating input-pill / HUD surface (the
    /// fixed-layer family the §2 signature border rides on).
    public let chromeSurface: Color

    /// Default on-chrome ink: nav-row hover ink, chrome labels.
    public let onChrome: Color

    /// Muted on-chrome ink, the nav row's RESTING ink (muted until engaged).
    public let onChromeMuted: Color

    /// Cloud Agent engine accent (engine->accent map).
    public let engineCloud: Color

    /// Local Engine engine accent.
    public let engineNockerl: Color

    /// Cloud Agent engine wash (16%) for engine-tinted chips/tiles.
    public let engineCloudSoft: Color

    /// Local Engine engine wash (16%) for engine-tinted chips/tiles.
    public let engineNockerlSoft: Color
    /// Third card tier, the deepest recessed-well fill (checkbox/radio wells).
    public let cardSurface3: Color
    /// Neutral drop-shadow tint (near-black on Dark, cool slate on Light).
    public let shadowTint: Color
    /// The lit-from-above top catch-light (alpha baked into the token).
    public let surfaceHighlight: Color
    /// The ONE sanctioned warm accent: orange. Decorative, never status.
    public let accentWarm: Color
    /// Low-alpha warm tint, the notice wash.
    public let accentWarmSoft: Color
    /// Structural divider line (stronger than the hairline) used for connector tracks.
    public let divider: Color

    /// Resolve the palette for a `ColorScheme`, reading each slot from the matching generated
    /// token enum. `.dark` → `NockerlDarkColors`, everything else (`.light` and future cases)
    /// → `NockerlLightColors`.
    public static func resolve(_ scheme: ColorScheme) -> NockerlPalette {
        switch scheme {
        case .dark:
            return NockerlPalette(
                accentPrimary: NockerlDarkColors.accentPrimary,
                accentPrimaryHi: NockerlDarkColors.accentPrimaryHi,
                accentPrimaryDark: NockerlDarkColors.accentPrimaryDark,
                accentPrimarySoft: NockerlDarkColors.accentPrimarySoft,
                accentSecondary: NockerlDarkColors.accentSecondary,
                onAccent: NockerlDarkColors.onAccent,
                onCard: NockerlDarkColors.onCard,
                onCardMuted: NockerlDarkColors.onCardMuted,
                onCanvas: NockerlDarkColors.onCanvas,
                onCanvasMuted: NockerlDarkColors.onCanvasMuted,
                cardHairline: NockerlDarkColors.cardHairline,
                statusError: NockerlDarkColors.statusError,
                canvasAlt: NockerlDarkColors.canvasAlt,
                chatBg: NockerlDarkColors.chatBg,
                canvasEdge: NockerlDarkColors.canvasEdge,
                cardSurface1: NockerlDarkColors.cardSurface1,
                statusSuccess: NockerlDarkColors.statusSuccess,
                statusWarning: NockerlDarkColors.statusWarning,
                statusInfo: NockerlDarkColors.statusInfo,
                dotStreaming: NockerlDarkColors.dotStreaming,
                dotAttention: NockerlDarkColors.dotAttention,
                dotUnread: NockerlDarkColors.dotUnread,
                dotActive: NockerlDarkColors.dotActive,
                dotIdle: NockerlDarkColors.dotIdle,
                familyAgent: NockerlDarkColors.familyAgent,
                canvas: NockerlDarkColors.canvas,
                cardSurface2: NockerlDarkColors.cardSurface2,
                chromeSurface: NockerlDarkColors.chromeSurface,
                onChrome: NockerlDarkColors.onChrome,
                onChromeMuted: NockerlDarkColors.onChromeMuted,
                engineCloud: NockerlDarkColors.engineCloud,
                engineNockerl: NockerlDarkColors.engineNockerl,
                engineCloudSoft: NockerlDarkColors.engineCloudSoft,
                engineNockerlSoft: NockerlDarkColors.engineNockerlSoft,
                cardSurface3: NockerlDarkColors.cardSurface3,
                shadowTint: NockerlDarkColors.shadowTint,
                surfaceHighlight: NockerlDarkColors.surfaceHighlight,
                accentWarm: NockerlDarkColors.accentWarm,
                accentWarmSoft: NockerlDarkColors.accentWarmSoft,
                divider: NockerlDarkColors.divider
            )
        case .light:
            return .light
        @unknown default:
            // Future ColorScheme cases fall back to the light palette (the neutral default).
            return .light
        }
    }

    /// The light palette, filled from `NockerlLightColors`. Extracted so the `.light` and
    /// `@unknown default` branches share one definition.
    private static let light = NockerlPalette(
        accentPrimary: NockerlLightColors.accentPrimary,
        accentPrimaryHi: NockerlLightColors.accentPrimaryHi,
        accentPrimaryDark: NockerlLightColors.accentPrimaryDark,
        accentPrimarySoft: NockerlLightColors.accentPrimarySoft,
        accentSecondary: NockerlLightColors.accentSecondary,
        onAccent: NockerlLightColors.onAccent,
        onCard: NockerlLightColors.onCard,
        onCardMuted: NockerlLightColors.onCardMuted,
        onCanvas: NockerlLightColors.onCanvas,
        onCanvasMuted: NockerlLightColors.onCanvasMuted,
        cardHairline: NockerlLightColors.cardHairline,
        statusError: NockerlLightColors.statusError,
        canvasAlt: NockerlLightColors.canvasAlt,
        chatBg: NockerlLightColors.chatBg,
        canvasEdge: NockerlLightColors.canvasEdge,
        cardSurface1: NockerlLightColors.cardSurface1,
        statusSuccess: NockerlLightColors.statusSuccess,
        statusWarning: NockerlLightColors.statusWarning,
        statusInfo: NockerlLightColors.statusInfo,
        dotStreaming: NockerlLightColors.dotStreaming,
        dotAttention: NockerlLightColors.dotAttention,
        dotUnread: NockerlLightColors.dotUnread,
        dotActive: NockerlLightColors.dotActive,
        dotIdle: NockerlLightColors.dotIdle,
        familyAgent: NockerlLightColors.familyAgent,
                canvas: NockerlLightColors.canvas,
                cardSurface2: NockerlLightColors.cardSurface2,
                chromeSurface: NockerlLightColors.chromeSurface,
                onChrome: NockerlLightColors.onChrome,
                onChromeMuted: NockerlLightColors.onChromeMuted,
                engineCloud: NockerlLightColors.engineCloud,
                engineNockerl: NockerlLightColors.engineNockerl,
                engineCloudSoft: NockerlLightColors.engineCloudSoft,
                engineNockerlSoft: NockerlLightColors.engineNockerlSoft,
                cardSurface3: NockerlLightColors.cardSurface3,
                shadowTint: NockerlLightColors.shadowTint,
                surfaceHighlight: NockerlLightColors.surfaceHighlight,
                accentWarm: NockerlLightColors.accentWarm,
                accentWarmSoft: NockerlLightColors.accentWarmSoft,
        divider: NockerlLightColors.divider
    )
}
