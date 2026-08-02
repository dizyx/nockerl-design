// NockerlLogo: the canonical three-peaks Nockerl mark, EXACTLY as it ships in the
// apps (Voice NockerlLogo.swift, Android ic_nockerl_logo*.xml, web NockerlLogo.tsx):
// three OVERLAPPING triangles in three DISTINCT grayscale shades (the shade
// difference gives the layered, dimensional look; a flat fill is WRONG). Identical
// geometry on the `16 20 64 56` viewBox, a y=72 baseline, drawn left → center →
// right. MONOCHROME grayscale, recolored per theme, NEVER cyan (law §11). Mirrors
// the Compose NockerlLogo.

import SwiftUI

/// The forced ink ladder, named by the surface the mark sits ON.
public enum NockerlLogoTone: Equatable {
    /// For a DARK surface: LIGHT ink.
    case onDark
    /// For a LIGHT surface: DARK ink.
    case onLight

    /// The three peak shades (left, center, right) for this ladder.
    var ink: (Color, Color, Color) {
        switch self {
        case .onDark: return (Color(white: 0.898), Color(white: 1.0), Color(white: 0.8))
        case .onLight: return (Color(white: 0.333), Color(white: 0.133), Color(white: 0.467))
        }
    }
}

/// The Nockerl mark (see the file header). Theme-aware by default; pass a [tone] to
/// force a ladder.
public struct NockerlLogo: View {
    private let size: CGFloat
    private let tone: NockerlLogoTone?
    private let accessibilityLabel: String?

    /// Native mark width (viewBox `16 20 64 56` → 64×56, an 8:7 ratio).
    static let nativeW: CGFloat = 64
    /// Native mark height.
    static let nativeH: CGFloat = 56

    /// Create the mark.
    /// - Parameters:
    ///   - size: the mark HEIGHT; width keeps the native 8:7 ratio.
    ///   - tone: force an ink ladder, or `nil` (default) for theme-aware.
    ///   - accessibilityLabel: the a11y name, or `nil` when a sibling wordmark names
    ///     it (then the mark is decorative).
    public init(
        size: CGFloat = 24,
        tone: NockerlLogoTone? = nil,
        accessibilityLabel: String? = "Nockerl"
    ) {
        self.size = size
        self.tone = tone
        self.accessibilityLabel = accessibilityLabel
    }

    public var body: some View {
        LogoBody(size: size, tone: tone, accessibilityLabel: accessibilityLabel)
    }

    private struct LogoBody: View {
        let size: CGFloat
        let tone: NockerlLogoTone?
        let accessibilityLabel: String?

        @Environment(\.colorScheme) private var colorScheme

        var body: some View {
            let resolved = tone ?? (colorScheme == .dark ? .onDark : .onLight)
            let ink = resolved.ink
            let width = size * (NockerlLogo.nativeW / NockerlLogo.nativeH)

            Canvas { context, canvasSize in
                let sx = canvasSize.width / NockerlLogo.nativeW
                let sy = canvasSize.height / NockerlLogo.nativeH
                func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
                    CGPoint(x: (x - 16) * sx, y: (y - 20) * sy)
                }
                func tri(_ a: CGPoint, _ b: CGPoint, _ c: CGPoint) -> Path {
                    var p = Path()
                    p.move(to: a)
                    p.addLine(to: b)
                    p.addLine(to: c)
                    p.closeSubpath()
                    return p
                }
                // left → center → right (paint order = depth order).
                context.fill(tri(pt(20, 72), pt(36, 36), pt(52, 72)), with: .color(ink.0))
                context.fill(tri(pt(32, 72), pt(48, 24), pt(64, 72)), with: .color(ink.1))
                context.fill(tri(pt(44, 72), pt(60, 32), pt(76, 72)), with: .color(ink.2))
            }
            .frame(width: width, height: size)
            .accessibilityHidden(accessibilityLabel == nil)
            .accessibilityLabel(accessibilityLabel ?? "")
            .accessibilityAddTraits(.isImage)
        }
    }
}

#if os(macOS)
import AppKit

public extension NockerlLogo {
    /// The mark as a monochrome **template** `NSImage` for AppKit status-item
    /// hosts (`MenuBarExtra` labels, `NSStatusItem` buttons), the one surface a
    /// SwiftUI view cannot reach. Apple's HIG: menu-bar icons must be
    /// template images so the system tints them for light/dark, vibrancy, and
    /// the selection highlight.
    ///
    /// Template rendering keeps only the ALPHA channel, so the mark's grayscale
    /// depth ladder (the layered look; a flat fill is WRONG, see the header)
    /// survives as per-peak alpha: left `0.898` · center `1.0` · right `0.8`,
    /// the `onDark` ink ladder expressed in the template's one monochrome
    /// channel. Peaks paint in the canonical left → center → right order with
    /// paint-order (replace, never blend) overlap semantics, exactly like the
    /// in-app mark.
    ///
    /// - Parameter size: the mark HEIGHT in points (width keeps the native 8:7
    ///   ratio). The default 16 sits the mark in the menu bar's ~18pt content
    ///   box, the status-item norm.
    /// - Returns: a template `NSImage` (`isTemplate = true`) the system tints.
    static func statusItemImage(size: CGFloat = 16) -> NSImage {
        let width = size * (NockerlLogo.nativeW / NockerlLogo.nativeH)
        // The three peaks on the canonical `16 20 64 56` viewBox (x1 y1 x2 y2
        // x3 y3), each with its depth-ladder shade: the onDark grayscale
        // ladder, carried as template alpha.
        let peaks: [(CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat)] = [
            (20, 72, 36, 36, 52, 72, 0.898),
            (32, 72, 48, 24, 64, 72, 1.0),
            (44, 72, 60, 32, 76, 72, 0.8),
        ]
        // flipped: true = a y-DOWN handler space, so the viewBox coordinates map
        // straight through (no manual flip).
        let image = NSImage(size: NSSize(width: width, height: size), flipped: true) { rect in
            guard let ctx = NSGraphicsContext.current else { return false }
            let sx = rect.width / NockerlLogo.nativeW
            let sy = rect.height / NockerlLogo.nativeH
            for (ax, ay, bx, by, cx, cy, shade) in peaks {
                let path = NSBezierPath()
                path.move(to: CGPoint(x: (ax - 16) * sx, y: (ay - 20) * sy))
                path.line(to: CGPoint(x: (bx - 16) * sx, y: (by - 20) * sy))
                path.line(to: CGPoint(x: (cx - 16) * sx, y: (cy - 20) * sy))
                path.close()
                // Opaque fill first: paint-order overlap with clean AA edges…
                ctx.compositingOperation = .sourceOver
                NSColor.black.setFill()
                path.fill()
                // …then thin the peak DOWN to its ladder alpha (destination-out
                // reduces uniformly and its edge rides the same AA boundary, so
                // overlaps never seam).
                if shade < 1 {
                    ctx.compositingOperation = .destinationOut
                    NSColor(white: 0, alpha: 1 - shade).setFill()
                    path.fill()
                }
            }
            ctx.compositingOperation = .sourceOver
            return true
        }
        image.isTemplate = true
        image.accessibilityDescription = "Nockerl"
        return image
    }
}
#endif
