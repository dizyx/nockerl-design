import SwiftUI
import XCTest

@testable import NockerlDesign

/// v1.9.0 co-dev cluster, item 5: NockerlIconButton `.outline` style (the
/// reduce-fills conversion of the retired pre-law `.tonal` soft-fill). CI is the compiler
/// (no renderer): exercise every style so an API/type regression fails the build.
/// `.outline` keeps the 3-way slot: `.plain` / `.filledCircle` are byte-identical.
final class V190IconButtonTests: XCTestCase {
    func testIconButtonInstantiatesEveryStyle() {
        _ = NockerlIconButton(systemName: "plus", label: "Add", style: .outline) {}
        _ = NockerlIconButton(systemName: "plus", label: "Add", style: .plain) {}
        _ = NockerlIconButton(systemName: "arrow.up", label: "Send", style: .filledCircle) {}
        // `.outline` composes with the density + tint knobs like the others (its glyph reads
        // `tint` like `.plain`, neutral by default).
        _ = NockerlIconButton(systemName: "plus", label: "Add", style: .outline, density: .compact) {}
        _ = NockerlIconButton(Image(systemName: "plus"), label: "Add", style: .outline, tint: .neutral) {}
    }

    func testOutlineIsADistinctEquatableThirdCase() {
        XCTAssertNotEqual(NockerlIconButtonStyle.outline, .plain)
        XCTAssertNotEqual(NockerlIconButtonStyle.outline, .filledCircle)
        XCTAssertEqual(NockerlIconButtonStyle.outline, .outline)
    }
}
