// v1.17.0: the cyan selection-weight canon + the HUD nav-cursor stance.
// CI is the compiler (no renderer): lock the SEMANTIC relationships, not just the literals,
// so a future token edit that collapses the vocabulary fails the build rather than quietly
// re-introducing the drift this release normalized away.

import SwiftUI
import XCTest

@testable import NockerlDesign

final class V1170SelectionWeightTests: XCTestCase {
    // MARK: - The border-weight vocabulary

    /// The three weights carry their ratified values.
    func testBorderWeightLadderValues() {
        XCTAssertEqual(NockerlBorder.widthFloating, 1.5)
        XCTAssertEqual(NockerlBorder.widthSelection, 1)
        XCTAssertEqual(NockerlBorder.widthIndicator, 1)
        XCTAssertEqual(NockerlBorderOpacity.selection, 0.45)
    }

    /// THE canon, expressed as a relationship rather than a literal: a SELECTION border must
    /// stay strictly THINNER than a FLOATING one. If these ever collapse, "thick cyan = a layer
    /// hovering above content" stops meaning anything and the §2 signature is dead.
    func testSelectionIsStrictlyThinnerThanFloating() {
        XCTAssertLessThan(NockerlBorder.widthSelection, NockerlBorder.widthFloating)
    }

    /// ratified the indicator at the SELECTION weight (1pt) for v1.17.0: selection/focus
    /// reads via cyan INK + the sliding indicator, NEVER via WEIGHT (§11 thin-forward), and thick
    /// cyan is reserved for FLOATING only. A marker bar must not carry the floating weight.
    /// (If a 1pt underline reads as an accidental hairline in practice, the fallback is a one-line
    /// bump to border.width.indicator = 1.5.)
    func testIndicatorMatchesSelectionWeight() {
        XCTAssertEqual(NockerlBorder.widthIndicator, NockerlBorder.widthSelection)
    }

    /// Selection borders are SOFTENED; floating borders and indicator bars are SOLID.
    func testSelectionOpacityIsASofteningNotSolid() {
        XCTAssertGreaterThan(NockerlBorderOpacity.selection, 0)
        XCTAssertLessThan(NockerlBorderOpacity.selection, 1)
    }

    /// The §2 named constant is an ALIAS onto the token, not a hand-authored twin. This is the
    /// exact drift the `border.width` token set exists to prevent.
    func testFloatingBorderConstantIsBoundToTheToken() {
        XCTAssertEqual(NockerlFloatingBorder.width, NockerlBorder.widthFloating)
    }

    // MARK: - The HUD nav-cursor stance

    /// INK-ONLY: the cursor never changes weight. Only the SELECTED row carries the step.
    /// This is the fully-interpolatable stance (§7): nothing about it hard-cuts.
    func testInkOnlyStanceLeavesCursorWeightAtRest() {
        let stance = NockerlHudStyleDrawer.CursorStance.inkOnly
        XCTAssertEqual(stance.weight(isSelected: false, isHighlighted: false), .light)
        XCTAssertEqual(stance.weight(isSelected: false, isHighlighted: true), .light)
        XCTAssertEqual(stance.weight(isSelected: true, isHighlighted: false), .medium)
    }

    /// INK + WEIGHT: the cursor takes ONE step so it is locatable while arrowing.
    func testInkAndWeightStanceStepsTheCursor() {
        let stance = NockerlHudStyleDrawer.CursorStance.inkAndWeight
        XCTAssertEqual(stance.weight(isSelected: false, isHighlighted: false), .light)
        XCTAssertEqual(stance.weight(isSelected: false, isHighlighted: true), .medium)
        XCTAssertEqual(stance.weight(isSelected: true, isHighlighted: false), .medium)
    }

    /// §11 caps type at 500 (`.medium`). NEITHER stance may ever reach for semibold/bold:
    /// the cursor is allowed at most ONE step, and that step tops out at medium.
    func testNoStanceExceedsTheWeightCap() {
        let cases: [NockerlHudStyleDrawer.CursorStance] = [.inkOnly, .inkAndWeight]
        for stance in cases {
            for isSelected in [true, false] {
                for isHighlighted in [true, false] {
                    let weight = stance.weight(isSelected: isSelected, isHighlighted: isHighlighted)
                    XCTAssertTrue(
                        weight == .light || weight == .medium,
                        "cursor stance produced a weight outside the light/medium pair (§11 caps at 500)"
                    )
                }
            }
        }
    }

    /// The shipped stance is the BAKED-IN RECOMMENDATION pending the design lead's visual confirm.
    /// Asserted as equality, not membership: `CursorStance` has exactly two cases, so
    /// `shipped == .inkOnly || shipped == .inkAndWeight` is unfalsifiable and would let the
    /// stance flip silently. Pinning the exact value is what makes flipping it a conscious,
    /// reviewed edit. If the reviewer picks A, this test is the line you change on purpose.
    func testShippedStanceIsTheRecommendedOne() {
        XCTAssertEqual(NockerlHudStyleDrawer.cursorStance, .inkAndWeight)
    }

    /// CURSOR ON THE SELECTED ROW: the state the drawer OPENS in (`highlighted` is seeded to
    /// the selected index). Both the ink and weight terms are `(isSelected || isHighlighted)`,
    /// so the cursor contributes nothing once the row is already selected: it is invisible,
    /// and the row is indistinguishable from "selected, cursor elsewhere".
    ///
    /// This test PINS that collapse rather than endorsing it. It is the open question in the
    ///  preview. If the design lead rules the cursor must stay locatable on the selected row,
    /// this is the assertion that fails and tells you where to fix it.
    func testCursorCollapsesIntoSelectionOnTheSameRow() {
        for stance in [NockerlHudStyleDrawer.CursorStance.inkOnly, .inkAndWeight] {
            XCTAssertEqual(
                stance.weight(isSelected: true, isHighlighted: true),
                stance.weight(isSelected: true, isHighlighted: false),
                "cursor+selected differs from selected. The known collapse changed; re-confirm §6"
            )
        }
    }
}
