import SwiftUI
import XCTest

@testable import NockerlDesign

/// Adoption round-trip 1 covers the first Voice-pilot additions: the menu-bar
/// template mark, the sidebar nav row, and the stat card.
/// Same contract as ComponentTests: CI is the compiler. Instantiate every shape,
/// assert the non-visual contracts (template flags, geometry, palette bindings).
final class AdoptionRound1Tests: XCTestCase {
    // MARK: NockerlLogo.statusItemImage

    #if os(macOS)
    func testStatusItemImageIsTemplateAndKeepsMarkRatio() {
        let image = NockerlLogo.statusItemImage()
        // Template mode is the whole point: the system tints it (HIG).
        XCTAssertTrue(image.isTemplate)
        // size = mark HEIGHT; width keeps the native 8:7 (64x56) ratio.
        XCTAssertEqual(image.size.height, 16)
        XCTAssertEqual(image.size.width, 16 * (64.0 / 56.0), accuracy: 0.001)
        XCTAssertEqual(image.accessibilityDescription, "Nockerl")

        let sized = NockerlLogo.statusItemImage(size: 22)
        XCTAssertEqual(sized.size.height, 22)
        XCTAssertEqual(sized.size.width, 22 * (64.0 / 56.0), accuracy: 0.001)
    }
    #endif
}

// MARK: NockerlNavRow

extension AdoptionRound1Tests {
    func testNavRowInstantiatesEveryShape() {
        // Icon + label, selected and resting.
        _ = NockerlNavRow("Home", selected: true, action: {}) {
            Image(systemName: "house")
        }
        _ = NockerlNavRow("History", action: {}) {
            Image(systemName: "clock")
        }
        // Label-only convenience (Icon == EmptyView), no phantom slot.
        _ = NockerlNavRow("Settings", action: {})
        _ = NockerlNavRow("Settings", selected: true, action: {})
    }

    func testPaletteBindsOnChromeInkBothThemes() {
        let dark = NockerlPalette.resolve(.dark)
        XCTAssertEqual(dark.onChrome, NockerlDarkColors.onChrome)
        XCTAssertEqual(dark.onChromeMuted, NockerlDarkColors.onChromeMuted)

        let light = NockerlPalette.resolve(.light)
        XCTAssertEqual(light.onChrome, NockerlLightColors.onChrome)
        XCTAssertEqual(light.onChromeMuted, NockerlLightColors.onChromeMuted)
    }
}

// MARK: NockerlStatCard

extension AdoptionRound1Tests {
    func testStatCardInstantiatesEveryShape() {
        // Full anatomy: plate + label + value + delta.
        _ = NockerlStatCard(
            label: "Tokens",
            value: "1.2M",
            delta: NockerlStatDelta(value: "12%", trend: .up)
        ) {
            Image(systemName: "bolt")
        }
        // Icon-less + delta-less; the em-dash empty state.
        _ = NockerlStatCard(label: "Sessions", value: "42")
        // `"\u{2014}"` is the documented empty-value glyph, escaped so the source
        // carries no literal em dash. Byte-identical to what the card compares against.
        _ = NockerlStatCard(label: "Cost · 7d", value: "\u{2014}")
    }

    func testStatDeltaGoodLadderFlipsWithGoodWhenDown() {
        // Up is good by default…
        XCTAssertTrue(NockerlStatDelta(value: "12%", trend: .up).isGood)
        XCTAssertFalse(NockerlStatDelta(value: "3%", trend: .down).isGood)
        // …but cost/latency flip the COLOR ladder (goodWhenDown), never the glyph.
        XCTAssertFalse(NockerlStatDelta(value: "14%", trend: .up, goodWhenDown: true).isGood)
        XCTAssertTrue(NockerlStatDelta(value: "9%", trend: .down, goodWhenDown: true).isGood)
    }
}

// MARK: NockerlToggle (adoption wave 2)

extension AdoptionRound1Tests {
    func testToggleInstantiatesEveryShape() {
        // The style, both scales, via the native Toggle.
        _ = Toggle("Launch at login", isOn: .constant(true)).toggleStyle(.nockerl)
        _ = Toggle("Dense", isOn: .constant(false)).toggleStyle(.nockerl(size: .sm))
        // The convenience wrapper: labeled, bare, and bare-accessible.
        _ = NockerlToggle("Launch at login", isOn: .constant(true))
        _ = NockerlToggle(isOn: .constant(false), accessibilityLabel: "Launch at login")
        _ = NockerlToggle(isOn: .constant(true), size: .sm, accessibilityLabel: "Dense")
    }

    func testToggleMetricsMatchTheRatifiedCanon() {
        // The canon's two rungs (react Switch.tsx): md 44x26/20, sm 36x22/16, rim 3.
        let md = NockerlToggleSize.md.metrics
        XCTAssertEqual(md.width, 44)
        XCTAssertEqual(md.height, 26)
        XCTAssertEqual(md.thumb, 20)
        XCTAssertEqual(md.pad, 3)

        let sm = NockerlToggleSize.sm.metrics
        XCTAssertEqual(sm.width, 36)
        XCTAssertEqual(sm.height, 22)
        XCTAssertEqual(sm.thumb, 16)
        XCTAssertEqual(sm.pad, 3)
    }
}

// MARK: IconButton density tier

extension AdoptionRound1Tests {
    func testIconButtonInstantiatesBothDensityTiers() {
        _ = NockerlIconButton(Image(systemName: "pencil"), label: "Edit", density: .compact, action: {})
        _ = NockerlIconButton(Image(systemName: "checkmark"), label: "Confirm", style: .plain, density: .compact, action: {})
        // The default stays comfortable, so the pre-2716 call sites compile unchanged.
        _ = NockerlIconButton(Image(systemName: "xmark"), label: "Close", action: {})
        _ = NockerlIconButton(Image(systemName: "paperplane.fill"), label: "Send", style: .filledCircle, density: .comfortable, action: {})
    }
}

// MARK: IconButton tint + systemName convenience

extension AdoptionRound1Tests {
    func testIconButtonTintAndSystemNameConvenience() {
        // The destructive preset + custom escape hatch + the SF Symbol shorthand.
        _ = NockerlIconButton(systemName: "trash", label: "Delete", tint: .destructive, action: {})
        _ = NockerlIconButton(systemName: "pencil", label: "Edit", density: .compact, action: {})
        _ = NockerlIconButton(Image(systemName: "star"), label: "Favorite", tint: .custom(.orange), action: {})
        // Circle stays accent-locked: tint compiles but the glyph remains onAccent.
        _ = NockerlIconButton(systemName: "paperplane.fill", label: "Send", style: .filledCircle, action: {})
    }

    func testIconButtonTintResolvesAgainstThePalette() {
        let palette = NockerlPalette.resolve(.dark)
        XCTAssertEqual(NockerlIconButtonTint.neutral.color(in: palette), palette.onCard)
        XCTAssertEqual(NockerlIconButtonTint.destructive.color(in: palette), palette.statusError)
        XCTAssertEqual(NockerlIconButtonTint.custom(.orange).color(in: palette), .orange)
    }
}

// MARK: NockerlHint

extension AdoptionRound1Tests {
    func testHintInstantiatesBothForms() {
        _ = NockerlHint("Requires restart")
        _ = Text("Runs on login").nockerlHint()
        // The modifier composes on any view (localized/attributed text included).
        _ = Text("A ") .nockerlHint()
    }
}

// MARK: Badge outline variant

extension AdoptionRound1Tests {
    func testBadgeOutlineVariantInstantiates() {
        _ = NockerlBadge("Whisper", tone: .accent, variant: .outline)
        _ = NockerlBadge("Deprecated", tone: .warning, variant: .outline, mono: true)
        // The existing variants stay untouched (additive).
        _ = NockerlBadge("Draft", tone: .info)
        _ = NockerlBadge("CI", tone: .success, variant: .solid)
    }
}

// MARK: FailedTurn additive slots

extension AdoptionRound1Tests {
    func testFailedTurnAdditiveSlotsInstantiate() {
        // The pre-2714 shapes compile unchanged (EmptyView convenience).
        _ = NockerlFailedTurn()
        _ = NockerlFailedTurn(title: "Delivery failed", detail: "The gateway returned a 502.", onRetry: {})
        // Metadata + progress on the convenience form.
        _ = NockerlFailedTurn(
            title: "Recording failed",
            detail: "Microphone permission revoked.",
            onRetry: {},
            timestamp: "14:02",
            duration: "0:41",
            isRetrying: true
        )
        // The trailing-actions builder (reveal + delete, quiet compact ghosts).
        _ = NockerlFailedTurn(title: "Recording failed", onRetry: {}) {
            NockerlIconButton(systemName: "folder", label: "Reveal in Finder", density: .compact, action: {})
            NockerlIconButton(systemName: "trash", label: "Delete", density: .compact, tint: .destructive, action: {})
        }
    }
}

// MARK: RecordingHUD error state + hideable cancel

extension AdoptionRound1Tests {
    func testRecordingHudStateAndCancelShapes() {
        // Recording with the trailing ghost Cancel.
        _ = NockerlRecordingHUD(phase: .recording, elapsedLabel: "0:07", showsCancel: true, onCancel: {})
        // The failed phase (border -> statusWarning) + the click-through host shape.
        _ = NockerlRecordingHUD(phase: .error, errorMessage: "Failed", showsCancel: false)
        _ = NockerlRecordingHUD(phase: .recording, elapsedLabel: "0:12", levels: [0.4, 0.8], showsCancel: false)
    }
}

// MARK: StatCard compact density tier

extension AdoptionRound1Tests {
    func testStatCardCompactDensity() {
        // Compact tier: icon + icon-less; default stays comfortable (unchanged).
        _ = NockerlStatCard(
            label: "Tokens",
            value: "1.2M",
            delta: NockerlStatDelta(value: "12%", trend: .up),
            density: .compact
        ) {
            Image(systemName: "bolt")
        }
        _ = NockerlStatCard(label: "Sessions", value: "42", density: .compact)
        _ = NockerlStatCard(label: "Cost · 7d", value: "$184") // comfortable default
    }
}

// MARK: NockerlSearchField (Swift parity twin)

extension AdoptionRound1Tests {
    func testSearchFieldInstantiatesEveryShape() {
        // Empty (magnifier only), populated (clear shows), and loading (spinner).
        _ = NockerlSearchField(text: .constant(""))
        _ = NockerlSearchField(
            text: .constant("nockerl"),
            placeholder: "Filter history",
            accessibilityLabel: "Search history",
            onSubmit: { _ in }
        )
        _ = NockerlSearchField(text: .constant("x"), loading: true)
        // Disabled flows from the environment (platform-idiomatic).
        _ = NockerlSearchField(text: .constant("")).disabled(true)
    }
}


// MARK: accentPrimaryDark wired into NockerlPalette

extension AdoptionRound1Tests {
    func testPaletteExposesAccentPrimaryDarkBothThemes() {
        XCTAssertEqual(NockerlPalette.resolve(.dark).accentPrimaryDark, NockerlDarkColors.accentPrimaryDark)
        XCTAssertEqual(NockerlPalette.resolve(.light).accentPrimaryDark, NockerlLightColors.accentPrimaryDark)
    }
}

// MARK: Accordion header accessory + controlled expansion

extension AdoptionRound1Tests {
    func testAccordionHeaderAccessoryAndControlledExpansion() {
        let items = [
            NockerlAccordionItem(id: "a", title: "A") { Text("body A") },
            NockerlAccordionItem(id: "b", title: "B", headerAccessory: {
                NockerlIconButton(systemName: "trash", label: "Delete B", tint: .destructive, action: {})
            }) { Text("body B") },
        ]
        // Uncontrolled (self-managed), existing call form unchanged.
        _ = NockerlAccordion(items: items)
        _ = NockerlAccordion(items: items, mode: .multiple, initiallyExpanded: ["a"])
        // Controlled: the host owns the open-id set.
        _ = NockerlAccordion(items: items, expanded: .constant(["b"]))
    }
}

// MARK: RT5: RecordingHUD phase machine (value-exact web alignment)

extension AdoptionRound1Tests {
    func testRecordingHudPhasesInstantiate() {
        _ = NockerlRecordingHUD(phase: .recording, elapsedLabel: "0:07", levels: [0.35, 0.7, 0.5, 0.95, 0.6], animate: false)
        _ = NockerlRecordingHUD(phase: .paused, elapsedLabel: "0:41", levels: [0.32, 0.74, 0.5, 0.86, 0.4], animate: false)
        _ = NockerlRecordingHUD(phase: .transcribing)
        _ = NockerlRecordingHUD(phase: .error, errorMessage: "Couldn't reach the service.")
        // Brand opt-out + trailing cancel + the opt-in per-bar ease.
        _ = NockerlRecordingHUD(
            phase: .recording, elapsedLabel: "0:01", levels: [0.5],
            showBrand: false, animateBars: true, showsCancel: true, onCancel: {}
        )
    }
}

// MARK: StatCard opt-in tinted-icon plate

extension AdoptionRound1Tests {
    func testStatCardTintOptIn() {
        // Default (no tint) = the flat cyan glyph.
        _ = NockerlStatCard(label: "Tokens", value: "1.2M") { Image(systemName: "bolt") }
        // Each tint tone recolors the GLYPH, in BOTH icon modes.
        for tone in [NockerlStatTint.accent, .success, .warning, .danger] {
            _ = NockerlStatCard(label: "Uptime", value: "99.9%", tint: tone) { Image(systemName: "checkmark") }
            _ = NockerlStatCard(label: "Up", value: "99.9%", tint: tone, iconMode: .inset) { Image(systemName: "checkmark") }
        }
        // Tint resolves to the palette hue.
        let palette = NockerlPalette.resolve(.dark)
        XCTAssertEqual(NockerlStatTint.accent.color(in: palette), palette.accentPrimary)
        XCTAssertEqual(NockerlStatTint.danger.color(in: palette), palette.statusError)
    }
}

// MARK: RecordingHUD phase motion + opt-in entrance/exit

extension AdoptionRound1Tests {
    func testRecordingHudPhaseMotionAndEntrance() {
        // The opt-in entrance/exit + constant-height phases still instantiate.
        _ = NockerlRecordingHUD(phase: .recording, elapsedLabel: "0:07", levels: [0.5, 0.7], entrance: .fromBottom)
        _ = NockerlRecordingHUD(phase: .error, errorMessage: "x", entrance: .none)
        _ = NockerlRecordingHUD(phase: .transcribing, entrance: .fromBottom)
    }
}

// MARK: experimental opt-in tones (gradient + zebra)

extension AdoptionRound1Tests {
    func testExperimentalTonesInstantiate() {
        // gradient opt-in on Card (StatCard's gradient param was removed).
        _ = NockerlCard(gradient: true) { Text("card") }
        // StatCard icon modes: .flat (default) + .inset recessed disc.
        _ = NockerlStatCard(label: "Tokens", value: "1.2M", iconMode: .inset) { Image(systemName: "bolt") }
        _ = NockerlStatCard(label: "Sessions", value: "42")
        // zebra opt-in on the accordion container.
        let items = [
            NockerlAccordionItem(id: "a", title: "A") { Text("a") },
            NockerlAccordionItem(id: "b", title: "B") { Text("b") },
        ]
        _ = NockerlAccordion(items: items, zebra: true)
    }
}

// MARK: RecordingHUD result/success phase

extension AdoptionRound1Tests {
    func testRecordingHudResultPhase() {
        _ = NockerlRecordingHUD(phase: .result(pasted: true), animate: false)
        _ = NockerlRecordingHUD(phase: .result(pasted: false), animate: false)
        // Custom success labels (host-overridable text).
        _ = NockerlRecordingHUD(
            phase: .result(pasted: true),
            resultPastedLabel: "Done",
            resultCopiedLabel: "Copied",
            animate: false
        )
    }
}
