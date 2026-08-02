// NockerlTypography is the Swift FONT INFRASTRUCTURE: bundle + register +
// resolve the Nockerl faces so `NockerlType` actually renders Outfit / Space Mono
// instead of silently falling back to SF.
//
// The gap this closes: `NockerlType` declared the families ("Outfit", "Space
// Mono") but the package bundled NO font file, NO registration, and NO Font/
// modifier API, so every Swift client got SF. (It survived audits because every
// check was STATIC: it read the declared family string, never RESOLVED it.)
//
// The design, once, for the whole consumer sweep:
//   1. BUNDLE the real faces as SwiftPM resources (Package.swift → Resources/
//      Fonts): Outfit at the law-§11 ramp weights (100/200/300/400/500) + Space
//      Mono (the mono face). OFL-1.1 (licenses ride alongside).
//   2. REGISTER them with CoreText at first use via `CTFontManagerRegisterFontsForURL`
//      in `.process` scope against `Bundle.module`. Idempotent, ZERO app-side
//      setup: the first `.nockerlType(…)` (or `Font.nockerl(…)`) call registers.
//   3. RESOLVE every role to a bundled face by its exact PostScript name (so a
//      weight can never be mis-picked or interpolated) wrapped as a SwiftUI `Font`.
//
// Adoption: a client replaces a raw `.font(.system(size: 14, weight: .light))`
// with `.nockerlType(.bodyMedium)`, same size + weight, now the real Outfit.

import CoreText
import SwiftUI

// MARK: - Roles

/// Every semantic type role the system exposes: the 15 `NockerlType` ramp roles
/// (Outfit) plus the mono metadata role (Space Mono). The addressable surface the
/// [Font.nockerl(_:)] factory + [View.nockerlType(_:)] modifier resolve.
public enum NockerlTypeRole: Equatable, CaseIterable {
    case displayLarge, displayMedium, displaySmall
    case headlineLarge, headlineMedium, headlineSmall
    case titleLarge, titleMedium, titleSmall
    case bodyLarge, bodyMedium, bodySmall
    case labelLarge, labelMedium, labelSmall
    /// The section EYEBROW (v1.18.0), the ONE shared uppercase-overline role: Outfit
    /// 12pt / weight 500 / 16pt line box (`labelMedium`'s metrics at the 500 bold cap,
    /// NOT `labelMedium`'s own 300). Unifies the section-header treatment across
    /// ``NockerlGroupHeader`` / ``NockerlFormSection`` / ``NockerlStatCard``; the
    /// consumer applies the uppercase + surface-appropriate muted ink at the call site.
    case eyebrow
    /// Ticket numbers / code / technical metadata: Space Mono, 12/16 (the mono
    /// family the ramp declares at the family level; metadata size).
    case mono

    /// The token-sourced metrics (family / weight / size / line-height) for the role.
    /// Ramp roles read straight from the generated ``NockerlType``; ``mono`` maps to
    /// the mono family at the metadata size.
    public var textStyle: NockerlTextStyle {
        switch self {
        case .displayLarge: return NockerlType.displayLarge
        case .displayMedium: return NockerlType.displayMedium
        case .displaySmall: return NockerlType.displaySmall
        case .headlineLarge: return NockerlType.headlineLarge
        case .headlineMedium: return NockerlType.headlineMedium
        case .headlineSmall: return NockerlType.headlineSmall
        case .titleLarge: return NockerlType.titleLarge
        case .titleMedium: return NockerlType.titleMedium
        case .titleSmall: return NockerlType.titleSmall
        case .bodyLarge: return NockerlType.bodyLarge
        case .bodyMedium: return NockerlType.bodyMedium
        case .bodySmall: return NockerlType.bodySmall
        case .labelLarge: return NockerlType.labelLarge
        case .labelMedium: return NockerlType.labelMedium
        case .labelSmall: return NockerlType.labelSmall
        case .eyebrow: return NockerlType.eyebrow
        case .mono:
            return NockerlTextStyle(
                fontFamily: NockerlFonts.monoFamily,
                fontWeight: 400,
                fontSize: NockerlFontSize.size12,
                lineHeight: 16
            )
        }
    }

    /// The role's point size (token-sourced).
    public var size: CGFloat { textStyle.fontSize }
    /// The role's line-height in points (token-sourced), for callers that need the
    /// full line box (see [View.nockerlType(_:)] on why the modifier stays font-only).
    public var lineHeight: CGFloat { textStyle.lineHeight }
    /// The role's numeric weight (100 to 500, the §11 ramp).
    public var weight: Int { textStyle.fontWeight }
}

// MARK: - Registration + resolution

/// The bundled-face registry. Registers the packaged Outfit + Space Mono
/// faces with CoreText once per process and resolves roles/weights to their exact
/// bundled PostScript face. All members are safe to touch from the main thread
/// (the SwiftUI context that resolves fonts).
public enum NockerlFonts {
    /// The Outfit family name (matches the bundled faces' name tables).
    public static let sansFamily = "Outfit"
    /// The Space Mono family name.
    public static let monoFamily = "Space Mono"

    /// Runs the registration exactly once (Swift guarantees a `static let` is
    /// initialized lazily, once, atomically). The idempotent entry point.
    private static let didRegister: Bool = registerAll()

    /// Ensure the bundled faces are registered. Idempotent + cheap after the first
    /// call; safe to call eagerly at app launch OR to leave to the first font
    /// resolution (the factory calls it). Returns `true` when every bundled face is
    /// registered (or was already).
    @discardableResult
    public static func registerIfNeeded() -> Bool { didRegister }

    /// The bundled `.ttf` face URLs (every face in `Resources/Fonts`), or `nil` if
    /// the resource bundle is somehow absent.
    static func bundledFontURLs() -> [URL] {
        Bundle.module.urls(forResourcesWithExtension: "ttf", subdirectory: "Fonts") ?? []
    }

    /// Register every bundled face in `.process` scope (this process only: no
    /// system install, no user prompt). "Already registered" is success, not error.
    private static func registerAll() -> Bool {
        let urls = bundledFontURLs()
        guard !urls.isEmpty else { return false }
        var allOK = true
        for url in urls {
            var errorRef: Unmanaged<CFError>?
            let ok = CTFontManagerRegisterFontsForURL(url as CFURL, .process, &errorRef)
            if !ok {
                // `.map` over the OPTIONAL errorRef (not the CFError it yields) →
                // Int?; a `nil` (false with no error) also counts as a real failure.
                let code = errorRef.map { CFErrorGetCode($0.takeRetainedValue()) }
                // Registering an already-registered face is not a failure.
                if code != CTFontManagerError.alreadyRegistered.rawValue {
                    allOK = false
                }
            }
        }
        return allOK
    }

    /// The exact PostScript name of the bundled face for a family + numeric weight.
    /// Weight buckets follow the §11 ramp (500 is the cap); mono is single-weight.
    /// Resolving by PostScript name (never a weight TRAIT) means a face can never be
    /// interpolated or mis-picked.
    public static func postScriptName(family: String, weight: Int) -> String {
        if family == monoFamily { return "SpaceMono-Regular" }
        switch weight {
        case ..<150: return "Outfit-Thin" // 100
        case 150..<250: return "Outfit-ExtraLight" // 200
        case 250..<350: return "Outfit-Light" // 300
        case 350..<450: return "Outfit-Regular" // 400
        default: return "Outfit-Medium" // 500 (the bold cap, never heavier)
        }
    }

    /// Map a SwiftUI `Font.Weight` to the numeric §11 ramp weight (100 to 500, the 500
    /// cap absorbs `.medium` and anything heavier). The bridge for the sized
    /// [Font.nockerl(size:weight:)] accessor used by the framework's own components,
    /// whose sizes are computed (button / segment / avatar / lockup) so they can't
    /// take a fixed role.
    static func rampWeight(for weight: Font.Weight) -> Int {
        if weight == .thin { return 100 }
        if weight == .ultraLight { return 200 }
        if weight == .light { return 300 }
        if weight == .regular { return 400 }
        // .medium / .semibold / .bold / .heavy / .black are all capped at 500 (law §11:
        // emphasis is by contrast, never additive heaviness).
        return 500
    }

    /// Resolve a role to a SwiftUI `Font` backed by the exact bundled face. Registers
    /// on first use. If registration ever fails the CoreText name lookup falls back to
    /// the system face at the correct size: degraded, never crashing.
    static func font(for role: NockerlTypeRole) -> Font {
        registerIfNeeded()
        let style = role.textStyle
        let psName = postScriptName(family: style.fontFamily, weight: style.fontWeight)
        let ctFont = CTFontCreateWithName(psName as CFString, style.fontSize, nil)
        return Font(ctFont)
    }

    /// Resolve the bundled Outfit face at an arbitrary size + weight.
    static func sansFont(size: CGFloat, weight: Font.Weight) -> Font {
        registerIfNeeded()
        let ps = postScriptName(family: sansFamily, weight: rampWeight(for: weight))
        return Font(CTFontCreateWithName(ps as CFString, size, nil))
    }

    /// Resolve the bundled Space Mono face at an arbitrary size (Regular: the mono
    /// face is single-weight; emphasis on mono figures is by SIZE, law §11).
    static func monoFont(size: CGFloat) -> Font {
        registerIfNeeded()
        let ps = postScriptName(family: monoFamily, weight: 400)
        return Font(CTFontCreateWithName(ps as CFString, size, nil))
    }
}

// MARK: - Public API

public extension Font {
    /// The Nockerl type factory: a `Font` resolved to the bundled Outfit /
    /// Space Mono face for [role] (family + size + weight from the tokens). Registers
    /// the faces on first use. This is the surface a client swaps a raw
    /// `.font(.system(…))` onto.
    static func nockerl(_ role: NockerlTypeRole) -> Font {
        NockerlFonts.font(for: role)
    }

    /// The bundled Outfit face at a COMPUTED size + weight, for the
    /// framework's own components whose text size is parameterized (button / segment
    /// / avatar / lockup / display glyphs) and so can't take a fixed [role]. Same
    /// bundled-face resolution as [nockerl(_:)]; preserves the caller's exact metrics
    /// while landing the real Outfit face. Weight is capped at 500 (law §11).
    static func nockerl(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        NockerlFonts.sansFont(size: size, weight: weight)
    }

    /// The bundled Space Mono face at an arbitrary [size], for monospaced
    /// text OUTSIDE the metadata `.mono` role (a 28pt stat value, code, mono badges).
    /// Regular weight only (the mono face is single-weight; emphasis by size).
    static func nockerlMono(size: CGFloat) -> Font {
        NockerlFonts.monoFont(size: size)
    }
}

public extension View {
    /// Apply a Nockerl type [role]: sets the resolved bundled font (Outfit / Space
    /// Mono) at the role's token size + weight. This is the one-line adoption swap
    /// for a raw `.font(…)` across every client surface.
    ///
    /// Deliberately FONT-ONLY: it does not impose a line box, so dropping it onto an
    /// existing `.font(.system(size:weight:))` call site is a pure typeface swap with
    /// no layout shift. Callers that need the ramp's line-height read it from
    /// [NockerlTypeRole.lineHeight] and apply their own `.lineSpacing`.
    func nockerlType(_ role: NockerlTypeRole) -> some View {
        font(.nockerl(role))
    }
}
