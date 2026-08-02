import SwiftUI
import XCTest

@testable import NockerlDesign

/// v1.9.0 co-dev cluster, item 3: NockerlGroupHeader (section overline).
/// CI is the compiler (no renderer): exercise both forms so an API/type regression
/// fails the build.
final class V190GroupHeaderTests: XCTestCase {
    func testGroupHeaderInstantiatesBothForms() {
        // Bare section label: the no-trailing convenience init (Trailing == EmptyView).
        _ = NockerlGroupHeader("General")
        // With a trailing accessory slot (any View).
        _ = NockerlGroupHeader("Recent") {
            Text("3")
        }
        // A real component fits the trailing slot.
        _ = NockerlGroupHeader("Files") {
            NockerlIconButton(systemName: "plus", label: "Add new") {}
        }
    }
}
