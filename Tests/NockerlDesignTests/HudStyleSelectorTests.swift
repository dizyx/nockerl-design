// Packet: NockerlHudStyleSelector (B) + NockerlIconButton .accentOutline (C).
// CI is the compiler (no renderer): exercise the API + the base-unchanged guarantees so an
// API/type regression fails the build.

import SwiftUI
import XCTest

@testable import NockerlDesign

final class HudStyleSelectorTests: XCTestCase {
    /// The selector value types instantiate (with + without a leading icon).
    func testHudStyleTypes() {
        let prose = NockerlHudStyle(id: "prose", label: "Prose", systemImage: "text.alignleft")
        XCTAssertEqual(prose.id, "prose")
        XCTAssertEqual(NockerlHudStyle(id: "code", label: "Code").systemImage, nil)
    }

    /// G1/G4: the base HUD (nil selector) AND the opt-in HUD both build; Q4 showsResting
    /// false + the selected-style resolution both compile.
    func testHudSelectorOptInAndBaseUnchanged() {
        var open = false
        let isOpen = Binding(get: { open }, set: { open = $0 })
        let styles: [NockerlHudStyle] = [
            .init(id: "a", label: "Prose", systemImage: "text.alignleft"),
            .init(id: "b", label: "Code", systemImage: "chevron.left.forwardslash.chevron.right"),
        ]
        let selector = NockerlHudStyleSelector(
            styles: styles, selectedID: "a", isOpen: isOpen, onSelect: { _ in }
        )

        // BASE: every existing call site is source-unchanged (styleSelector defaults nil).
        _ = NockerlRecordingHUD(phase: .recording, elapsedLabel: "0:07", levels: [0.5])
        // OPT-IN: the appended param equips the drawer.
        _ = NockerlRecordingHUD(
            phase: .recording, elapsedLabel: "0:07", levels: [0.5], styleSelector: selector
        )
        // Q4: keyboard-only (base-identical pill).
        let quiet = NockerlHudStyleSelector(
            styles: styles, selectedID: "a", isOpen: isOpen, showsResting: false, onSelect: { _ in }
        )
        _ = NockerlRecordingHUD(phase: .paused, styleSelector: quiet)

        XCTAssertEqual(selector.activeStyle?.id, "a")
    }

    /// C: the accent-outline icon button (active pole of `.outline`).
    func testIconButtonAccentOutline() {
        _ = NockerlIconButton(systemName: "plus", label: "Add", style: .accentOutline) {}
        _ = NockerlIconButton(systemName: "plus", label: "Add", style: .outline) {}
        XCTAssertNotEqual(NockerlIconButtonStyle.accentOutline, .outline)
        XCTAssertNotEqual(NockerlIconButtonStyle.accentOutline, .filledCircle)
    }

    /// v1.13.0 ASK 1, the controlled-highlight opt-in: a selector with `highlightedID` builds
    /// (the drawer stands down its internal keyboard; the host drives nav).
    func testControlledHighlightMode() {
        var open = true
        var hl: String? = "b"
        let isOpen = Binding(get: { open }, set: { open = $0 })
        let highlightedID = Binding<String?>(get: { hl }, set: { hl = $0 })
        let styles: [NockerlHudStyle] = [
            .init(id: "a", label: "Prose"), .init(id: "b", label: "Code"), .init(id: "c", label: "Email"),
        ]
        let selector = NockerlHudStyleSelector(
            styles: styles, selectedID: "a", isOpen: isOpen, onSelect: { _ in }, highlightedID: highlightedID
        )
        _ = NockerlRecordingHUD(phase: .recording, styleSelector: selector)
        XCTAssertNotNil(selector.highlightedID)
    }

    /// v1.13.0 ASK 1: the pure host-nav helper matches the drawer's internal wrap semantics.
    func testNextHighlightWrapSemantics() {
        let styles: [NockerlHudStyle] = [
            .init(id: "a", label: "A"), .init(id: "b", label: "B"), .init(id: "c", label: "C"),
        ]
        let next = NockerlHudStyleSelector.nextHighlight
        XCTAssertEqual(next("a", .down, styles), "b")
        XCTAssertEqual(next("b", .up, styles), "a")
        // wrap: down from last → first; up from first → last.
        XCTAssertEqual(next("c", .down, styles), "a")
        XCTAssertEqual(next("a", .up, styles), "c")
        // nil / not-found → the natural end for the direction.
        XCTAssertEqual(next(nil, .down, styles), "a")
        XCTAssertEqual(next(nil, .up, styles), "c")
        XCTAssertEqual(next("zzz", .down, styles), "a")
        // empty → nil.
        XCTAssertNil(next("a", .down, []))
    }
}
