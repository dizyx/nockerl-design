// NockerlAvatar: person/session identity as a clipped disc (the compose/react
// canon, avatar.mdx). A strict image → initials fallback ladder, the ratified
// size ramp, and an optional presence dot notched into the host surface.
// Replaces the interim initials disc the Swift AgentWidget shipped with.

import SwiftUI

/// The ratified avatar diameter ramp (avatar.mdx).
public enum NockerlAvatarSize {
    /// 24pt: dense rows, stacks.
    case xs
    /// 32pt: chrome (top bar).
    case sm
    /// 40pt: sheets and headers.
    case md
    /// 48pt: profile blocks.
    case lg
    /// 64pt: hero identity.
    case xl

    var diameter: CGFloat {
        switch self {
        case .xs: return 24
        case .sm: return 32
        case .md: return 40
        case .lg: return 48
        case .xl: return 64
        }
    }

    var initialsSize: CGFloat {
        switch self {
        case .xs: return NockerlFontSize.size10
        case .sm: return NockerlFontSize.size12
        case .md: return NockerlFontSize.size14
        case .lg: return NockerlFontSize.size16
        case .xl: return NockerlFontSize.size24
        }
    }
}

/// The identity disc: image → initials on the soft accent wash; optional
/// bottom-right presence dot notched by a host-surface ring. The dot is
/// decorative. Fold the state into the accessibility label (law §13).
public struct NockerlAvatar: View {
    private let name: String
    private let image: Image?
    private let size: NockerlAvatarSize
    private let presence: Color?
    private let presenceRing: Color?
    private let accessibilityName: String?

    @Environment(\.colorScheme) private var colorScheme

    /// Create an avatar.
    /// - Parameters:
    ///   - name: the person/session name (drives initials + the a11y default).
    ///   - image: optional avatar image; initials render when `nil`.
    ///   - size: the ratified ramp (default `.sm`, 32pt).
    ///   - presence: optional presence-dot color (a `dot*` palette token).
    ///   - presenceRing: the notch ring; match the HOST surface (defaults to
    ///     `cardSurface1`).
    ///   - accessibilityName: override the accessible name (fold presence in).
    public init(
        name: String,
        image: Image? = nil,
        size: NockerlAvatarSize = .sm,
        presence: Color? = nil,
        presenceRing: Color? = nil,
        accessibilityName: String? = nil
    ) {
        self.name = name
        self.image = image
        self.size = size
        self.presence = presence
        self.presenceRing = presenceRing
        self.accessibilityName = accessibilityName
    }

    public var body: some View {
        let palette = NockerlPalette.resolve(colorScheme)

        ZStack(alignment: .bottomTrailing) {
            Group {
                if let image {
                    image
                        .resizable()
                        .scaledToFill()
                } else {
                    ZStack {
                        palette.accentPrimarySoft
                        Text(Self.initials(from: name))
                            // 500 is the bold cap (law §11): medium, never bold.
                            .font(.nockerl(size: size.initialsSize, weight: .medium))
                            .foregroundColor(palette.accentPrimary)
                            .lineLimit(1)
                    }
                }
            }
            .frame(width: size.diameter, height: size.diameter)
            .clipShape(Circle())

            if let presence {
                ZStack {
                    Circle()
                        .fill(presenceRing ?? palette.cardSurface1)
                        .frame(width: 12, height: 12)
                    Circle()
                        .fill(presence)
                        .frame(width: 8, height: 8)
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityName ?? name)
    }

    /// "Ada Lovelace" → "AL"; blank → "?".
    static func initials(from name: String) -> String {
        let parts = name
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first.map(String.init) }
        let joined = parts.joined().uppercased()
        return joined.isEmpty ? "?" : joined
    }
}
