// v1.9.0 reduce-fills batch: instantiation coverage for the new neutral-outline Button
// variant and the de-filled NavRow / Tree selection (border + ink, no wash). No Swift
// snapshot harness exists (conformance = CI compile + instantiation); these assert the
// converted sites still build across their state axes.

import SwiftUI
import XCTest

@testable import NockerlDesign

final class V190ReduceFillsTests: XCTestCase {
    /// The new neutral-outline button variant (the empty→active affordance) instantiates,
    /// alongside the cyan `.tertiary` the app flips it to.
    func testNeutralOutlineButtonInstantiates() {
        _ = NockerlButton("Add", variant: .neutralOutline) {}
        _ = NockerlButton("Add", variant: .neutralOutline, size: .sm) {}
        _ = NockerlButton("Add", variant: .tertiary) {}
    }

    /// The de-filled NavRow (border + ink + weight, no wash) builds selected and at rest.
    func testNavRowBuildsSelectedAndRest() {
        _ = NockerlNavRow("Inbox", selected: true, action: {}) { Image(systemName: "tray") }
        _ = NockerlNavRow("Drafts", selected: false, action: {}) { Image(systemName: "doc") }
    }

    /// The de-filled Segmented (cyan-border selected segment on a neutral hairline track,
    /// no pill fill) instantiates.
    func testSegmentedBuildsWithoutPillFill() {
        _ = NockerlSegmented(
            options: ["Day", "Week", "Month"],
            selected: "Week",
            label: { $0 },
            onSelect: { _ in }
        )
    }
}
