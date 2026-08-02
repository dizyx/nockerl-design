import SwiftUI
import XCTest

@testable import NockerlDesign

/// Baseline smoke tests for the Swift verification rail. They give `swift test` a real
/// target (so the CI rail is meaningful before components land) and assert the generated
/// token enums compile + resolve, and that the dark/light palettes are genuinely distinct.
final class TokensSmokeTests: XCTestCase {
    func testDarkAndLightPalettesDiffer() {
        // The tokens are generated from the DTCG source; dark and light must not collapse.
        XCTAssertNotEqual(NockerlDarkColors.canvas, NockerlLightColors.canvas)
        XCTAssertNotEqual(NockerlDarkColors.onCard, NockerlLightColors.onCard)
    }

    func testAccentSlotsResolve() {
        // The brand accent + its on-color exist in both palettes (composed by components).
        _ = NockerlDarkColors.accentPrimary
        _ = NockerlDarkColors.onAccent
        _ = NockerlLightColors.accentPrimary
        _ = NockerlLightColors.onAccent
    }
}
