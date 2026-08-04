// NockerlBadge: the count / dot / tonal-pill badge vocabulary for SwiftUI surfaces.
//
// Mirrors the ratified badge (badge.mdx, Design Review): a badge is a PASSIVE state
// marker, never a control. Three content forms:
//   - count:       a solid pill carrying an unread count, capped at "99+".
//   - dot:         a bare 8pt disc for unseen-but-uncounted activity.
//   - label pill:  a tonal pill naming a state ("Draft", "CI"), soft (tone at the
//                  fixed 0.15 wash + full-hue label) or solid (tone fill + picked ink).
//
// Tones map 1:1 onto semantic palette slots, never a raw hue. The count/dot default
// tone is `.danger`: the unread hue is RATIFIED danger-red (r2, B5). Client #1's
// agent-orange inbox badge conforms at swap time (`.agent` stays available for
// categorical uses).
//
// A11y (law §13): a bare dot carries no text, so its accessible name is REQUIRED; the
// count form names itself from the count when no label is given. Never color alone.

import SwiftUI

/// The semantic tone of a ``NockerlBadge``. Each resolves to a palette status /
/// accent / categorical slot for the active color scheme.
public enum NockerlBadgeTone: Equatable {
    /// Brand cyan (`accentPrimary`).
    case accent
    /// Status green (`statusSuccess`).
    case success
    /// Status amber (`statusWarning`).
    case warning
    /// Status red (`statusError`).
    case danger
    /// Status cyan-info (`statusInfo`).
    case info
    /// Agent orange (`familyAgent`), client #1's inbox-badge hue.
    case agent
    /// An explicit color: the escape hatch (a categorical family hue, or a host-owned
    /// tone the framework need not name). Mirrors `NockerlIconButtonTint.custom`. (v1.15.0)
    case custom(Color)

    /// Resolve the tone to its palette color.
    func color(in palette: NockerlPalette) -> Color {
        switch self {
        case .accent: return palette.accentPrimary
        case .success: return palette.statusSuccess
        case .warning: return palette.statusWarning
        case .danger: return palette.statusError
        case .info: return palette.statusInfo
        case .agent: return palette.familyAgent
        case let .custom(color): return color
        }
    }
}

/// The fill treatment of a label ``NockerlBadge``.
public enum NockerlBadgeVariant: Equatable {
    /// Tone at the fixed low-alpha wash with a full-hue label (the quiet default).
    case soft
    /// Solid tone fill with a contrast-picked ink (the loud form).
    case solid
    /// The Button-outline grammar mapped onto the badge: a 1pt tone
    /// stroke on a TRANSPARENT fill with the full-hue label, same paddings.
    /// The lightest form for dense rows (law §5's outline emphasis class; a
    /// passive marker, so no fill to spend).
    case outline
}

/// A passive badge: count pill, bare dot, or tonal label pill. Not tappable; pin it
/// to a host with `.overlay(alignment: .topTrailing)` (the anchored idiom) or lay it
/// inline. Colors flow from the palette via ``NockerlBadgeTone``; the silhouette is
/// the pill (badges are one of the sanctioned pill surfaces; they are chips' kin).
public struct NockerlBadge: View {
    /// The four content forms.
    private enum Content: Equatable {
        case count(Int)
        case dot
        case label(String, NockerlBadgeVariant, Bool)
        case language(String)
    }

    private let content: Content
    private let tone: NockerlBadgeTone
    private let accessibleName: String

    // Geometry: the dot is the ratified 8pt disc; the count pill rides a minimum
    // square of 16pt (2 × space2) so single digits stay circular; label pills use the
    // compact keycap padding.
    private static let dotSize: CGFloat = NockerlSpace.space2
    private static let countMinSize: CGFloat = NockerlSpace.space4
    // The fixed tonal wash alpha is the same 0.15 wash client #1's source pills use
    // (design-laws §5: tints come from tokens at fixed alphas).
    private static let softWashAlpha: Double = 0.15

    /// A count badge: a solid pill showing [count], capped at "99+".
    /// - Parameters:
    ///   - count: the count to display.
    ///   - tone: the semantic hue (defaults to ``NockerlBadgeTone/danger``, the
    ///     ratified unread hue, r2 B5).
    ///   - label: optional accessible name; defaults to the rendered count text.
    public init(count: Int, tone: NockerlBadgeTone = .danger, label: String? = nil) {
        self.content = .count(count)
        self.tone = tone
        self.accessibleName = label ?? Self.countText(count)
    }

    /// A label pill: a tonal pill naming a state.
    /// - Parameters:
    ///   - text: the pill label (also the accessible name).
    ///   - tone: the semantic hue.
    ///   - variant: soft (default) or solid fill.
    ///   - mono: render the label in the monospace family for a code / file-type /
    ///     version pill (web parity: `NockerlBadge(mono:)`). The tone is unchanged;
    ///     for the quiet hue-free language tag use ``NockerlBadge/language(_:)``.
    public init(
        _ text: String,
        tone: NockerlBadgeTone,
        variant: NockerlBadgeVariant = .soft,
        mono: Bool = false
    ) {
        self.content = .label(text, variant, mono)
        self.tone = tone
        self.accessibleName = text
    }

    /// The **language badge**, the first-class variant for code-language
    /// metadata ("typescript", "kotlin") on CodeBlock / DiffViewer / Markdown hosts.
    /// Deliberately QUIET and hue-free: muted ink on the alt-canvas wash, MONOSPACE
    /// type, pill silhouette. The label normalizes through the shared
    /// `nockerlLanguageLabel` contract (trim + lowercase) so every host renders the
    /// identical tag.
    /// - Parameter language: the raw language name (any case); blank renders nothing.
    public static func language(_ language: String) -> NockerlBadge {
        NockerlBadge(languageRaw: language)
    }

    private init(languageRaw: String) {
        let label = nockerlLanguageLabel(languageRaw) ?? ""
        self.content = .language(label)
        self.tone = .agent // unused by the language rendering (hue-free)
        self.accessibleName = label.isEmpty ? "Code" : "\(label) code"
    }

    /// A bare dot: unseen-but-uncounted activity.
    /// - Parameters:
    ///   - tone: the semantic hue (defaults to the ratified danger-red unread hue).
    ///   - label: the REQUIRED accessible name (a dot has no text; shipping it unnamed
    ///     is the a11y breach the icon-button fix already outlawed).
    public static func dot(tone: NockerlBadgeTone = .danger, label: String) -> NockerlBadge {
        NockerlBadge(dotTone: tone, label: label)
    }

    private init(dotTone: NockerlBadgeTone, label: String) {
        assert(
            !label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
            "NockerlBadge.dot requires a non-empty accessible name. A bare dot has no text (design-laws §13)."
        )
        self.content = .dot
        self.tone = dotTone
        self.accessibleName = label
    }

    public var body: some View {
        BadgeBody(content: content, tone: tone)
            .accessibilityLabel(accessibleName)
    }

    /// Render text for a count: the raw number through 99, then the "99+" cap.
    /// Internal so tests pin the overflow contract.
    static func countText(_ count: Int) -> String {
        count > 99 ? "99+" : String(count)
    }

    /// The environment-reading render body (colorScheme lives on a real View).
    private struct BadgeBody: View {
        let content: Content
        let tone: NockerlBadgeTone

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let palette = NockerlPalette.resolve(colorScheme)
            let hue = tone.color(in: palette)

            switch content {
            case .dot:
                Circle()
                    .fill(hue)
                    .frame(width: NockerlBadge.dotSize, height: NockerlBadge.dotSize)

            case .count(let count):
                Text(NockerlBadge.countText(count))
                    .font(.nockerl(size: NockerlFontSize.size10, weight: .medium))
                    .foregroundColor(NockerlContrast.pickOn(hue))
                    .padding(.horizontal, NockerlSpace.space1)
                    .frame(minWidth: NockerlBadge.countMinSize, minHeight: NockerlBadge.countMinSize)
                    .background(Capsule().fill(hue))

            case .label(let text, let variant, let mono):
                let solid = variant == .solid
                // solid = hue fill + picked ink; soft = the fixed wash + hue
                // label; outline = CLEAR fill + hue label (the stroke below).
                let fill: Color = {
                    switch variant {
                    case .solid: return hue
                    case .soft: return hue.opacity(NockerlBadge.softWashAlpha)
                    case .outline: return .clear
                    }
                }()
                Text(text)
                    .font(mono ? .nockerlMono(size: NockerlFontSize.size10) : .nockerl(size: NockerlFontSize.size10, weight: .medium))
                    .foregroundColor(solid ? NockerlContrast.pickOn(hue) : hue)
                    .padding(.horizontal, NockerlSpace.space2)
                    .padding(.vertical, NockerlSpace.spacePx)
                    .frame(minHeight: NockerlBadge.countMinSize)
                    .background(Capsule().fill(fill))
                    .overlay {
                        if variant == .outline {
                            // The Button-outline stroke weight (1pt), tone-colored.
                            Capsule().strokeBorder(hue, lineWidth: NockerlSpace.spacePx)
                        }
                    }

            case .language(let label):
                if label.isEmpty {
                    EmptyView()
                } else {
                    Text(label)
                        .font(.nockerlMono(size: NockerlFontSize.size10))
                        .foregroundColor(palette.onCanvasMuted)
                        .padding(.horizontal, NockerlSpace.space2)
                        .padding(.vertical, NockerlSpace.spacePx)
                        .frame(minHeight: NockerlBadge.countMinSize)
                        .background(Capsule().fill(palette.canvasAlt))
                }
            }
        }
    }
}

/// The shared language-label normalization (identical on web + Compose):
/// trim + lowercase; blank in, `nil` out ("TypeScript" -> "typescript").
func nockerlLanguageLabel(_ raw: String) -> String? {
    let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    return trimmed.isEmpty ? nil : trimmed
}
