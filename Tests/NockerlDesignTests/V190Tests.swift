import SwiftUI
import XCTest

@testable import NockerlDesign

/// v1.9.0 co-dev cluster: instantiation + non-visual contracts for the new
/// Swift components. CI is the compiler (no renderer): every shape is exercised so an
/// API/type regression fails the build.
final class V190Tests: XCTestCase {
    // MARK: #1: NockerlRadio (circle + dot, checkbox-harmonized)

    func testRadioInstantiatesEveryShape() {
        _ = NockerlRadio(selected: true, onSelect: {}, label: "Option A")
        _ = NockerlRadio(selected: false, onSelect: {}, label: "Option B", description: "Supporting line")
        // Display-only (a parent row owns the tap) + disabled.
        _ = NockerlRadio(selected: false)
        _ = NockerlRadio(selected: true, label: "Disabled", enabled: false)
    }
}
