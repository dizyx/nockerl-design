import CoreText
import SwiftUI
import XCTest

@testable import NockerlDesign

/// Font-infrastructure conformance: the font-RESOLVING=YES proof. Static
/// checks never caught the silent SF fallback (they read the declared family
/// string, never RESOLVED it); these assertions REGISTER the bundled faces and ask
/// CoreText to resolve them, failing if a role falls back to the system face.
/// CoreText is present on the macOS CI runner, so this runs as real resolution
/// coverage (no renderer / pixels needed).
final class NockerlTypographyTests: XCTestCase {
    private static let expectedFaces = [
        "Outfit-Thin.ttf",
        "Outfit-ExtraLight.ttf",
        "Outfit-Light.ttf",
        "Outfit-Regular.ttf",
        "Outfit-Medium.ttf",
        "SpaceMono-Regular.ttf",
    ]

    /// The faces are actually IN the built module bundle (the resource wiring works).
    func testEveryBundledFaceShipsInTheModuleBundle() {
        let names = Set(NockerlFonts.bundledFontURLs().map { $0.lastPathComponent })
        for face in Self.expectedFaces {
            XCTAssertTrue(names.contains(face), "bundled face missing from Bundle.module: \(face)")
        }
        XCTAssertEqual(names.count, Self.expectedFaces.count, "unexpected bundled face set: \(names)")
    }

    /// Registration succeeds (every face registers, or was already registered).
    func testRegistrationSucceeds() {
        XCTAssertTrue(NockerlFonts.registerIfNeeded(), "CTFontManager failed to register the bundled faces")
    }

    /// Each §11 ramp weight resolves to its EXACT bundled Outfit face. A fallback to
    /// SF would surface a `.SFNS…` PostScript name / a non-"Outfit" family, so this is
    /// the direct RESOLVING=YES assertion.
    func testEveryRampWeightResolvesToTheBundledOutfitFace() {
        NockerlFonts.registerIfNeeded()
        let cases: [(weight: Int, ps: String)] = [
            (100, "Outfit-Thin"),
            (200, "Outfit-ExtraLight"),
            (300, "Outfit-Light"),
            (400, "Outfit-Regular"),
            (500, "Outfit-Medium"),
        ]
        for c in cases {
            XCTAssertEqual(NockerlFonts.postScriptName(family: "Outfit", weight: c.weight), c.ps)
            let ct = CTFontCreateWithName(c.ps as CFString, 14, nil)
            let resolvedPS = CTFontCopyPostScriptName(ct) as String
            let family = CTFontCopyFamilyName(ct) as String
            XCTAssertEqual(resolvedPS, c.ps, "weight \(c.weight) fell back (got PS \(resolvedPS)), NOT the bundled Outfit face")
            XCTAssertEqual(family, "Outfit", "weight \(c.weight) resolved family \(family), not Outfit: SF fallback")
        }
    }

    /// The mono role resolves to the bundled Space Mono face.
    func testMonoRoleResolvesToBundledSpaceMono() {
        NockerlFonts.registerIfNeeded()
        let ps = NockerlFonts.postScriptName(family: NockerlFonts.monoFamily, weight: 400)
        XCTAssertEqual(ps, "SpaceMono-Regular")
        let ct = CTFontCreateWithName(ps as CFString, 12, nil)
        XCTAssertEqual(CTFontCopyPostScriptName(ct) as String, "SpaceMono-Regular", "mono fell back: NOT the bundled Space Mono")
        XCTAssertEqual(CTFontCopyFamilyName(ct) as String, "Space Mono")
    }

    /// EVERY role maps to a token style with a positive size and resolves into one of
    /// the two bundled families. No role is unreachable or SF-bound.
    func testEveryRoleResolvesIntoABundledFamily() {
        NockerlFonts.registerIfNeeded()
        for role in NockerlTypeRole.allCases {
            let style = role.textStyle
            XCTAssertGreaterThan(style.fontSize, 0, "role \(role) has no size")
            XCTAssertLessThanOrEqual(style.fontWeight, 500, "role \(role) exceeds the 500 weight cap (law §11)")
            let ps = NockerlFonts.postScriptName(family: style.fontFamily, weight: style.fontWeight)
            let ct = CTFontCreateWithName(ps as CFString, style.fontSize, nil)
            let family = CTFontCopyFamilyName(ct) as String
            XCTAssertTrue(
                family == "Outfit" || family == "Space Mono",
                "role \(role) resolved to \(family). Expected a bundled Nockerl family"
            )
        }
    }

    /// The public factory + modifier are usable (compile + run) for every role.
    func testPublicFactoryAndModifierCoverEveryRole() {
        for role in NockerlTypeRole.allCases {
            _ = Font.nockerl(role)
            _ = Text("Ag").nockerlType(role)
        }
    }
}

    // MARK: Sized sans + mono accessors (the self-adoption sweep)

    /// rampWeight maps SwiftUI weights to the §11 ramp (500 cap), and the sized
    /// accessors resolve to the bundled families: the machinery the framework's
    /// own components use to adopt the face at their computed metrics.
    func testSizedAccessorsResolveBundledFamilies() {
        NockerlFonts.registerIfNeeded()
        XCTAssertEqual(NockerlFonts.rampWeight(for: .thin), 100)
        XCTAssertEqual(NockerlFonts.rampWeight(for: .ultraLight), 200)
        XCTAssertEqual(NockerlFonts.rampWeight(for: .light), 300)
        XCTAssertEqual(NockerlFonts.rampWeight(for: .regular), 400)
        XCTAssertEqual(NockerlFonts.rampWeight(for: .medium), 500)
        XCTAssertEqual(NockerlFonts.rampWeight(for: .semibold), 500) // capped
        XCTAssertEqual(NockerlFonts.rampWeight(for: .bold), 500) // capped

        // The sized sans accessor resolves to bundled Outfit (not SF) at each weight.
        for (w, fam) in [(Font.Weight.thin, "Outfit"), (.medium, "Outfit")] {
            let ps = NockerlFonts.postScriptName(family: NockerlFonts.sansFamily, weight: NockerlFonts.rampWeight(for: w))
            XCTAssertEqual(CTFontCopyFamilyName(CTFontCreateWithName(ps as CFString, 18, nil)) as String, fam)
        }
        // The sized mono accessor resolves to bundled Space Mono at a non-metadata size.
        let mps = NockerlFonts.postScriptName(family: NockerlFonts.monoFamily, weight: 400)
        XCTAssertEqual(CTFontCopyFamilyName(CTFontCreateWithName(mps as CFString, 28, nil)) as String, "Space Mono")

        // The public factories are usable.
        _ = Font.nockerl(size: 28, weight: .medium)
        _ = Font.nockerlMono(size: 28)
    }
