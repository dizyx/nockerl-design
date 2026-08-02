// v1.9.0 #4: `.nockerlWell(_:)` recessed-alias instantiation tests. No Swift snapshot
// harness exists (conformance = CI compile + instantiation), so these assert the well
// builds at BOTH scales: field/body (control radius, padded) and the bounded-scroll
// CONTAINER (card radius, unpadded, clipped), including the canonical scroll wrap.

import SwiftUI
import XCTest

@testable import NockerlDesign

final class V190WellTests: XCTestCase {
    /// Both well scales must instantiate without trapping.
    func testWellInstantiatesBothScales() {
        // Default = field/body scale.
        _ = Text("Read-only value").nockerlWell()

        // Explicit field scale.
        _ = Text("Read-only value").nockerlWell(.field)

        // Container scale on a plain body.
        _ = Text("Panel").nockerlWell(.container)
    }

    /// The canonical use of the container scale: a bounded, recessed scroll region whose
    /// cards ride opaque inside the one sunken frame.
    func testContainerScaleWrapsBoundedScroll() {
        _ = ScrollView {
            VStack(spacing: NockerlSpace.space3) {
                NockerlCard { Text("One").padding() }
                NockerlCard { Text("Two").padding() }
            }
            .padding(NockerlSpace.space3)
        }
        .frame(maxHeight: 320)
        .nockerlWell(.container)
    }

    /// The two scales are distinct values.
    func testWellScalesAreDistinct() {
        XCTAssertNotEqual(NockerlWellScale.field, NockerlWellScale.container)
    }
}
