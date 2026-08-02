// NockerlContrast: the shared on-solid-fill ink picker for the component layer.
//
// Mirrors the Compose library's internal `pickOnAccent` EXACTLY (same linearized
// relative-luminance algorithm, same 0.55 threshold, same near-black / near-white ink
// pair), so a solid tone fill carries the same ink on every platform. The two ink
// values are the ratified contrast pair from the shipped Compose components. They are
// component-layer constants (like DISABLED_ALPHA), not new design values.

import Foundation
import SwiftUI

/// Internal contrast utilities for solid tone fills (badges, filled circles).
enum NockerlContrast {
    /// Near-black ink for bright fills: the Compose pair's `0xFF1A1A1A`.
    static let inkDark = Color(red: 0.102, green: 0.102, blue: 0.102)

    /// Near-white ink for deep fills: the Compose pair's `0xFFF7F7F7`.
    static let inkLight = Color(red: 0.969, green: 0.969, blue: 0.969)

    /// Choose a readable ink (near-black or near-white) for content sitting ON a solid
    /// [background] fill, by linearized relative luminance (the same rule Compose's
    /// `pickOnAccent` applies), so tones read identically across platforms.
    static func pickOn(_ background: Color) -> Color {
        luminance(of: background) > 0.55 ? inkDark : inkLight
    }

    /// Linearized relative luminance (WCAG / Compose `Color.luminance()` formula) of a
    /// SwiftUI color, resolved through the platform color bridge. Colors that cannot be
    /// resolved (pattern/catalog colors, never our tokens) fall back to 0 (deep),
    /// which picks the near-white ink.
    static func luminance(of color: Color) -> Double {
        guard let rgb = sRGBAComponents(of: color) else { return 0 }
        func linear(_ channel: Double) -> Double {
            channel <= 0.04045 ? channel / 12.92 : pow((channel + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b)
    }

    /// Shift a color's luminance by `delta` (a signed fraction of full scale),
    /// clamping each channel; alpha preserved. The Swift mirror of Compose's
    /// `nockerlShiftLuminance` (the faceted field's tonal re-tint).
    static func shift(_ color: Color, by delta: Double) -> Color {
        guard let c = sRGBAComponents(of: color) else { return color }
        func clamp(_ v: Double) -> Double { min(max(v + delta, 0), 1) }
        return Color(
            .sRGB,
            red: clamp(c.r), green: clamp(c.g), blue: clamp(c.b), opacity: c.a
        )
    }

    /// Blend [fraction] of color [a] into color [b], per-channel in sRGB: the native
    /// mirror of the web's `color-mix(in srgb, a f%, b)` (and Compose's `lerp(b, a, f)`),
    /// used for the alert family's "whisper of intent" hairlines. Falls back to [b]
    /// if either color cannot be resolved (never true for token colors).
    static func mix(_ a: Color, into b: Color, fraction: Double) -> Color {
        guard
            let ca = sRGBAComponents(of: a),
            let cb = sRGBAComponents(of: b)
        else { return b }
        let f = min(max(fraction, 0), 1)
        return Color(
            red: ca.r * f + cb.r * (1 - f),
            green: ca.g * f + cb.g * (1 - f),
            blue: ca.b * f + cb.b * (1 - f),
            opacity: ca.a * f + cb.a * (1 - f)
        )
    }

    /// Extract sRGB components via the platform bridge (AppKit / UIKit). All generated
    /// token colors are plain sRGB `Color(red:green:blue:)` values, so the bridge is
    /// lossless for every input this layer feeds it.
    private static func sRGBAComponents(of color: Color) -> (r: Double, g: Double, b: Double, a: Double)? {
        #if canImport(AppKit)
        guard let rgb = NSColor(color).usingColorSpace(.sRGB) else { return nil }
        return (
            Double(rgb.redComponent),
            Double(rgb.greenComponent),
            Double(rgb.blueComponent),
            Double(rgb.alphaComponent)
        )
        #elseif canImport(UIKit)
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0
        guard UIColor(color).getRed(&r, &g, &b, &a) else { return nil }
        return (Double(r), Double(g), Double(b), Double(a))
        #else
        return nil
        #endif
    }
}
