// v1.15.0: Swift NockerlTabs (first-class) + shared NockerlSurface + NockerlBadgeTone.custom
// + the NockerlControlMetrics retirement (folded into NockerlSize). CI is the compiler (no
// renderer): exercise the public API + the pure nav logic so an API/type regression fails the
// build, and pin the a11y-critical navigation semantics (wrap + skip-disabled).

import SwiftUI
import XCTest

@testable import NockerlDesign

final class V115TabsTests: XCTestCase {
    /// The nav fixture: a, b, [c disabled], d.
    private func sampleTabs() -> [NockerlTabItem] {
        [
            NockerlTabItem(value: "a", label: "Alpha"),
            NockerlTabItem(value: "b", label: "Bravo", count: 3),
            NockerlTabItem(value: "c", label: "Charlie", disabled: true),
            NockerlTabItem(value: "d", label: "Delta", dirty: true, statusDot: .success),
        ]
    }

    // MARK: - Tab item model

    func testTabItemModel() {
        let item = NockerlTabItem(value: "a", label: "Alpha", count: 2, dirty: true, statusDot: .warning)
        XCTAssertEqual(item.id, "a")
        XCTAssertEqual(item.value, "a")
        XCTAssertEqual(item.label, "Alpha")
        XCTAssertEqual(item.count, 2)
        XCTAssertTrue(item.dirty)
        XCTAssertEqual(item.statusDot, .warning)
        XCTAssertFalse(item.disabled)
        XCTAssertNil(item.icon)
    }

    func testTabIconAcceptsAnyView() {
        let item = NockerlTabItem(value: "a", label: "Alpha", icon: AnyView(Image(systemName: "star")))
        XCTAssertNotNil(item.icon)
    }

    // MARK: - Keyboard navigation (pure): wrap + skip disabled

    func testNextEnabledWrapsAndSkipsDisabled() {
        let tabs = sampleTabs()
        // forward: a -> b -> (skip c) -> d -> wrap a
        XCTAssertEqual(NockerlTabs<Text>.nextEnabled(from: "a", step: 1, in: tabs), "b")
        XCTAssertEqual(NockerlTabs<Text>.nextEnabled(from: "b", step: 1, in: tabs), "d")
        XCTAssertEqual(NockerlTabs<Text>.nextEnabled(from: "d", step: 1, in: tabs), "a")
        // backward: a -> wrap (skip c) -> d
        XCTAssertEqual(NockerlTabs<Text>.nextEnabled(from: "a", step: -1, in: tabs), "d")
        XCTAssertEqual(NockerlTabs<Text>.nextEnabled(from: "d", step: -1, in: tabs), "b")
        // a disabled tab is never a landing spot
        XCTAssertNotEqual(NockerlTabs<Text>.nextEnabled(from: "b", step: 1, in: tabs), "c")
    }

    func testNextEnabledUnknownValueSeeksEnd() {
        let tabs = sampleTabs()
        XCTAssertEqual(NockerlTabs<Text>.nextEnabled(from: "zzz", step: 1, in: tabs), "a")
        XCTAssertEqual(NockerlTabs<Text>.nextEnabled(from: "zzz", step: -1, in: tabs), "d")
    }

    func testNextEnabledAllDisabledIsNil() {
        let tabs = [NockerlTabItem(value: "x", label: "X", disabled: true)]
        XCTAssertNil(NockerlTabs<Text>.nextEnabled(from: "x", step: 1, in: tabs))
        XCTAssertNil(NockerlTabs<Text>.nextEnabled(from: "x", step: -1, in: tabs))
    }

    // MARK: - Component builds (variants + panel builder + closable)

    func testTabsInstantiate() {
        var selection = "a"
        let binding = Binding(get: { selection }, set: { selection = $0 })

        // underline (default) + a panel builder
        _ = NockerlTabs(tabs: sampleTabs(), selection: binding, label: "Sections") { value in
            Text("Panel \(value)")
        }
        // enclosed + sm
        _ = NockerlTabs(
            tabs: sampleTabs(), selection: binding, label: "Sections", variant: .enclosed, size: .sm
        ) { _ in Text("x") }
        // closable
        _ = NockerlTabs(
            tabs: sampleTabs(), selection: binding, label: "Sections", onClose: { _ in }
        ) { _ in Text("x") }

        XCTAssertEqual(selection, "a")
    }

    // MARK: - NockerlSurface (the shared lifted-surface primitive)

    func testSurfaceInstantiatesAndBindsTokens() {
        _ = NockerlSurface { Text("card") }
        _ = NockerlSurface(variant: .panel, level: .level3) { Text("panel") }
        _ = Text("mod").nockerlSurface(variant: .card, level: .level2, borderColor: .clear)

        // radius variants bind to the radius tokens
        XCTAssertEqual(NockerlSurfaceVariant.card.radius, NockerlRadius.card)
        XCTAssertEqual(NockerlSurfaceVariant.panel.radius, NockerlRadius.panel)
        // the level ladder binds to the generated elevation + shadow-tint tokens
        XCTAssertEqual(NockerlSurfaceLevel.level1.offset, NockerlElevation.level1)
        XCTAssertEqual(NockerlSurfaceLevel.level2.offset, NockerlElevation.level2)
        XCTAssertEqual(NockerlSurfaceLevel.level4.offset, NockerlElevation.sheet)
        XCTAssertEqual(NockerlSurfaceLevel.level2.tintAlpha, NockerlShadowTintAlpha.level2)
        XCTAssertEqual(NockerlSurfaceLevel.level4.tintAlpha, NockerlShadowTintAlpha.sheet)
    }

    /// NockerlCard now DELEGATES its depth to the shared NockerlSurfaceLevel. The ladder must
    /// still bind to the SAME tokens (no drift from the refactor).
    func testCardElevationStillBindsTokensViaSharedLevel() {
        XCTAssertEqual(NockerlCardElevation.level1.surfaceLevel, .level1)
        XCTAssertEqual(NockerlCardElevation.level4.surfaceLevel, .level4)
        XCTAssertEqual(NockerlCardElevation.level2.offset, NockerlElevation.level2)
        XCTAssertEqual(NockerlCardElevation.level3.tintAlpha, NockerlShadowTintAlpha.level3)
        _ = NockerlCard { Text("card") }
        _ = NockerlCard(elevation: .level3, selected: true) { Text("selected") }
    }

    // MARK: - NockerlBadgeTone.custom

    func testBadgeCustomTone() {
        let palette = NockerlPalette.resolve(.light)
        // .custom resolves to exactly the passed color
        XCTAssertEqual(NockerlBadgeTone.custom(.red).color(in: palette), .red)
        // Equatable synthesis holds with the associated Color
        XCTAssertEqual(NockerlBadgeTone.custom(.red), .custom(.red))
        XCTAssertNotEqual(NockerlBadgeTone.custom(.red), .accent)
        // the named tones are unchanged
        XCTAssertEqual(NockerlBadgeTone.accent.color(in: palette), palette.accentPrimary)
        XCTAssertEqual(NockerlBadgeTone.agent.color(in: palette), palette.familyAgent)
    }

    // MARK: - NockerlControlMetrics retirement (folded into NockerlSize; NockerlA11y relocated)

    func testMinTouchTokenAndA11yHelperSurvive() {
        // The migrated consumers now read the generated token, so it must be the 44pt floor.
        XCTAssertEqual(NockerlSize.minTouch, 44)
        // NockerlA11y moved to its own file but keeps its contract.
        XCTAssertEqual(NockerlA11y.accessibleName(from: "  Tabs  "), "Tabs")
        XCTAssertNil(NockerlA11y.accessibleName(from: "   "))
    }
}
