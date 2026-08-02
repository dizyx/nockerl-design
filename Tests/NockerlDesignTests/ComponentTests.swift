import SwiftUI
import XCTest

@testable import NockerlDesign

/// Tests for the first SwiftUI components (the button family). These give the macOS CI rail
/// real compile + binding coverage: every component and variant is instantiated (so a type
/// or API regression fails the build), and the palette resolver's token bindings are asserted
/// against the generated enums. Rendering/pixels are out of scope here: CI is the compiler.
final class ComponentTests: XCTestCase {
    // MARK: Compile coverage (instantiate every component + variant).

    func testButtonInstantiatesEveryVariant() {
        let variants: [NockerlButtonVariant] = [.primary, .secondary, .tertiary, .ghost, .destructive]
        for variant in variants {
            _ = NockerlButton("Action", variant: variant, action: {})
        }
        // Default-variant initializer (primary) also compiles.
        _ = NockerlButton("Action", action: {})
        // The style is a public type usable on a bespoke Button.
        _ = NockerlButtonStyle(variant: .primary)
        _ = NockerlButtonStyle()
    }

    func testIconButtonInstantiatesEveryStyle() {
        let styles: [NockerlIconButtonStyle] = [.plain, .filledCircle]
        for style in styles {
            _ = NockerlIconButton(Image(systemName: "paperplane.fill"), label: "Send", style: style, action: {})
        }
        // Default-style initializer (plain) also compiles.
        _ = NockerlIconButton(Image(systemName: "xmark"), label: "Close", action: {})
    }

    // MARK: Icon-button a11y contract (non-empty name + 44pt hit floor).

    func testIconButtonAccessibleNameIsTrimmedAndNonEmpty() {
        // The normalization helper IS the a11y gate: blank names resolve to nil (and trip
        // the init's debug assertion), real names survive trimmed. Blank labels are never
        // instantiated here: the assertion would (correctly) trap the debug test run.
        XCTAssertEqual(NockerlIconButton.accessibleName(from: "Send"), "Send")
        XCTAssertEqual(NockerlIconButton.accessibleName(from: "  Send  "), "Send")
        XCTAssertNil(NockerlIconButton.accessibleName(from: ""))
        XCTAssertNil(NockerlIconButton.accessibleName(from: "   "))
        XCTAssertNil(NockerlIconButton.accessibleName(from: " \n\t "))
    }

    func testIconButtonHitTargetMeetsA11yFloor() {
        // `size.minTouch` (tokens/semantic/size.json) == Apple HIG 44pt. The generated
        // token (v1.15.0, `NockerlControlMetrics` retired) must never dip below the floor,
        // and must fully contain the 40pt visual control box (`NockerlSpace.space10`) it wraps.
        XCTAssertGreaterThanOrEqual(NockerlSize.minTouch, 44)
        XCTAssertGreaterThanOrEqual(NockerlSize.minTouch, NockerlSpace.space10)
    }

    func testChipInstantiatesBothStates() {
        _ = NockerlChip("Filter", selected: true, action: {})
        _ = NockerlChip("Filter", selected: false, action: {})
        // Default (unselected) initializer also compiles.
        _ = NockerlChip("Filter", action: {})
    }

    // MARK: Palette resolution: the token bindings must be exact.

    func testDarkPaletteBindsToDarkTokens() {
        let dark = NockerlPalette.resolve(.dark)
        XCTAssertEqual(dark.accentPrimary, NockerlDarkColors.accentPrimary)
        XCTAssertEqual(dark.accentPrimaryHi, NockerlDarkColors.accentPrimaryHi)
        XCTAssertEqual(dark.accentPrimarySoft, NockerlDarkColors.accentPrimarySoft)
        XCTAssertEqual(dark.onAccent, NockerlDarkColors.onAccent)
        XCTAssertEqual(dark.onCard, NockerlDarkColors.onCard)
        XCTAssertEqual(dark.onCardMuted, NockerlDarkColors.onCardMuted)
        XCTAssertEqual(dark.cardHairline, NockerlDarkColors.cardHairline)
        XCTAssertEqual(dark.statusError, NockerlDarkColors.statusError)
        XCTAssertEqual(dark.cardSurface1, NockerlDarkColors.cardSurface1)
    }

    func testLightPaletteBindsToLightTokens() {
        let light = NockerlPalette.resolve(.light)
        XCTAssertEqual(light.accentPrimary, NockerlLightColors.accentPrimary)
        XCTAssertEqual(light.accentPrimaryHi, NockerlLightColors.accentPrimaryHi)
        XCTAssertEqual(light.accentPrimarySoft, NockerlLightColors.accentPrimarySoft)
        XCTAssertEqual(light.onAccent, NockerlLightColors.onAccent)
        XCTAssertEqual(light.onCard, NockerlLightColors.onCard)
        XCTAssertEqual(light.onCardMuted, NockerlLightColors.onCardMuted)
        XCTAssertEqual(light.cardHairline, NockerlLightColors.cardHairline)
        XCTAssertEqual(light.statusError, NockerlLightColors.statusError)
        XCTAssertEqual(light.cardSurface1, NockerlLightColors.cardSurface1)
    }

    // MARK: Badge / StatusDot / Progress / Slider (instantiation + value contracts).

    func testBadgeInstantiatesEveryForm() {
        let tones: [NockerlBadgeTone] = [.accent, .success, .warning, .danger, .info, .agent]
        for tone in tones {
            _ = NockerlBadge(count: 3, tone: tone)
            _ = NockerlBadge("Draft", tone: tone, variant: .soft)
            _ = NockerlBadge("Draft", tone: tone, variant: .solid)
            _ = NockerlBadge.dot(tone: tone, label: "Unseen activity")
        }
        // Defaults compile (agent tone, soft variant).
        _ = NockerlBadge(count: 120)
        _ = NockerlBadge.dot(label: "Unseen activity")
        // mono modifier (web parity: a code / file-type / version pill, tone kept).
        _ = NockerlBadge("v2.1.0", tone: .accent, mono: true)
        _ = NockerlBadge("kt", tone: .agent, variant: .solid, mono: true)
    }

    func testBadgeCountTextCapsAt99() {
        XCTAssertEqual(NockerlBadge.countText(0), "0")
        XCTAssertEqual(NockerlBadge.countText(7), "7")
        XCTAssertEqual(NockerlBadge.countText(99), "99")
        XCTAssertEqual(NockerlBadge.countText(100), "99+")
        XCTAssertEqual(NockerlBadge.countText(4321), "99+")
    }

    func testBadgeToneBindsToPaletteSlots() {
        let palette = NockerlPalette.resolve(.dark)
        XCTAssertEqual(NockerlBadgeTone.accent.color(in: palette), palette.accentPrimary)
        XCTAssertEqual(NockerlBadgeTone.success.color(in: palette), palette.statusSuccess)
        XCTAssertEqual(NockerlBadgeTone.warning.color(in: palette), palette.statusWarning)
        XCTAssertEqual(NockerlBadgeTone.danger.color(in: palette), palette.statusError)
        XCTAssertEqual(NockerlBadgeTone.info.color(in: palette), palette.statusInfo)
        XCTAssertEqual(NockerlBadgeTone.agent.color(in: palette), palette.familyAgent)
    }

    func testContrastPicksInkByLuminance() {
        // The shared pick-on rule (Compose parity): deep fills take the near-white
        // ink, bright fills the near-black ink.
        XCTAssertEqual(NockerlContrast.pickOn(.black), NockerlContrast.inkLight)
        XCTAssertEqual(NockerlContrast.pickOn(.white), NockerlContrast.inkDark)
        // Sanity on the luminance math itself.
        XCTAssertEqual(NockerlContrast.luminance(of: .black), 0, accuracy: 0.001)
        XCTAssertEqual(NockerlContrast.luminance(of: .white), 1, accuracy: 0.001)
    }

    func testStatusDotInstantiatesLadderAndRawForms() {
        let statuses: [NockerlStatusDotStatus] = [.success, .warning, .error, .info, .neutral]
        for status in statuses {
            _ = NockerlStatusDot(status: status)
            _ = NockerlStatusDot(status: status, label: "Build passing", pulse: true, size: .quiet)
        }
        let palette = NockerlPalette.resolve(.dark)
        _ = NockerlStatusDot(color: palette.dotStreaming, label: "Streaming", pulse: true)
    }

    func testStatusDotLadderBindsToPaletteSlots() {
        let palette = NockerlPalette.resolve(.light)
        XCTAssertEqual(NockerlStatusDotStatus.success.color(in: palette), palette.statusSuccess)
        XCTAssertEqual(NockerlStatusDotStatus.warning.color(in: palette), palette.statusWarning)
        XCTAssertEqual(NockerlStatusDotStatus.error.color(in: palette), palette.statusError)
        XCTAssertEqual(NockerlStatusDotStatus.info.color(in: palette), palette.statusInfo)
        XCTAssertEqual(NockerlStatusDotStatus.neutral.color(in: palette), palette.dotIdle)
    }

    func testStatusDotPulseContractIsInterpolatableOnly() {
        // Law §7 pinned: the pulse floor is an OPACITY (0.3), and the duration is the
        // canonical 800ms (Android parity). Regressions here are design regressions.
        XCTAssertEqual(NockerlStatusDot.pulseFloorOpacity, 0.3, accuracy: 0.0001)
        XCTAssertEqual(NockerlStatusDot.pulseDuration, 0.8, accuracy: 0.0001)
        XCTAssertEqual(NockerlStatusDotSize.quiet.diameter, 6)
        XCTAssertEqual(NockerlStatusDotSize.loud.diameter, 8)
    }

    func testProgressFractionClampsAndHandlesEdgeCases() {
        XCTAssertEqual(NockerlProgressMath.fraction(value: 0.5, total: 1), 0.5, accuracy: 0.0001)
        XCTAssertEqual(NockerlProgressMath.fraction(value: 30, total: 60), 0.5, accuracy: 0.0001)
        XCTAssertEqual(NockerlProgressMath.fraction(value: 2, total: 1), 1, accuracy: 0.0001)
        XCTAssertEqual(NockerlProgressMath.fraction(value: -1, total: 1), 0, accuracy: 0.0001)
        XCTAssertEqual(NockerlProgressMath.fraction(value: nil, total: 1), 0, accuracy: 0.0001)
        XCTAssertEqual(NockerlProgressMath.fraction(value: 1, total: 0), 0, accuracy: 0.0001)
    }

    func testProgressInstantiatesEveryForm() {
        _ = NockerlProgressBar(label: "Loading")
        _ = NockerlProgressBar(value: 0.4, label: "Uploading", size: .thick, tone: .accent)
        _ = NockerlProgressBar(value: 1, label: "Done", tone: .success)
        _ = NockerlProgressBar(value: 0.2, label: "Failed", tone: .error)
        _ = NockerlProgressRing(value: 0.66, label: "Context used")
        _ = NockerlProgressRing(value: 30, total: 60, label: "Halfway", showsReadout: false)
    }

    func testSliderInstantiatesContinuousAndStepped() {
        var storage = 0.7
        let binding = Binding(get: { storage }, set: { storage = $0 })
        _ = NockerlSlider("Temperature", value: binding, in: 0.1...2.0, step: 0.05)
        _ = NockerlSlider("Volume", value: binding)
        _ = NockerlSlider(
            "Temperature",
            value: binding,
            in: 0.1...2.0,
            minimumLabel: "0.1",
            maximumLabel: "2.0"
        )
    }

    // MARK: Card + elevation ladder (recipe contracts).

    func testCardElevationLadderBindsToTokens() {
        // Offset = the elevation tokens (v1.17.0 HARD-OFFSET: level* is the y-offset, blur pinned to 0); tint mixes = the TOKENIZED shadowTintAlpha ladder
        // (28/30/33/35, halved from the old 55/60/65/70 per the v1.8.0 lift-shadow tokenization).
        XCTAssertEqual(NockerlCardElevation.level1.offset, NockerlElevation.level1)
        XCTAssertEqual(NockerlCardElevation.level2.offset, NockerlElevation.level2)
        XCTAssertEqual(NockerlCardElevation.level3.offset, NockerlElevation.level3)
        XCTAssertEqual(NockerlCardElevation.level4.offset, NockerlElevation.sheet)
        XCTAssertEqual(NockerlCardElevation.level1.tintAlpha, NockerlShadowTintAlpha.level1, accuracy: 0.0001)
        XCTAssertEqual(NockerlCardElevation.level2.tintAlpha, NockerlShadowTintAlpha.level2, accuracy: 0.0001)
        XCTAssertEqual(NockerlCardElevation.level3.tintAlpha, NockerlShadowTintAlpha.level3, accuracy: 0.0001)
        XCTAssertEqual(NockerlCardElevation.level4.tintAlpha, NockerlShadowTintAlpha.sheet, accuracy: 0.0001)
    }

    func testCardInstantiatesStaticAndTappable() {
        _ = NockerlCard { Text("Static") }
        _ = NockerlCard(elevation: .level4) { Text("Sheet-level") }
        _ = NockerlCard(elevation: .level1, onTap: {}) { Text("Tappable") }
    }

    // MARK: Alert family (intent map + component coverage).

    func testAlertIntentBindsToPaletteSlots() {
        let palette = NockerlPalette.resolve(.dark)
        XCTAssertEqual(NockerlAlertIntent.info.color(in: palette), palette.accentPrimary)
        XCTAssertEqual(NockerlAlertIntent.success.color(in: palette), palette.statusSuccess)
        XCTAssertEqual(NockerlAlertIntent.warning.color(in: palette), palette.statusWarning)
        XCTAssertEqual(NockerlAlertIntent.danger.color(in: palette), palette.statusError)
        XCTAssertEqual(NockerlAlertIntent.notice.color(in: palette), palette.accentWarm)
        // Dedicated soft tokens where they exist (info/notice).
        XCTAssertEqual(NockerlAlertIntent.info.softColor(in: palette), palette.accentPrimarySoft)
        XCTAssertEqual(NockerlAlertIntent.notice.softColor(in: palette), palette.accentWarmSoft)
    }

    func testAlertIntentGlyphsAreBareSFEquivalents() {
        XCTAssertEqual(NockerlAlertIntent.info.symbolName, "info")
        XCTAssertEqual(NockerlAlertIntent.success.symbolName, "checkmark")
        XCTAssertEqual(NockerlAlertIntent.warning.symbolName, "exclamationmark")
        XCTAssertEqual(NockerlAlertIntent.danger.symbolName, "xmark")
        XCTAssertEqual(NockerlAlertIntent.notice.symbolName, "sparkles")
    }

    func testColorMixBlendsChannelsLikeColorMix() {
        // mix(a into b, 0) == b and mix(a into b, 1) == a. Luminance is the probe
        // (Color equality across bridges is unreliable; luminance is exact enough).
        let full = NockerlContrast.luminance(of: NockerlContrast.mix(.white, into: .black, fraction: 1))
        let none = NockerlContrast.luminance(of: NockerlContrast.mix(.white, into: .black, fraction: 0))
        XCTAssertEqual(full, 1, accuracy: 0.001)
        XCTAssertEqual(none, 0, accuracy: 0.001)
        // A 50% sRGB mix of black into white is mid-gray (0.5 per channel).
        let mid = NockerlContrast.mix(.black, into: .white, fraction: 0.5)
        XCTAssertEqual(NockerlContrast.luminance(of: mid), 0.2140, accuracy: 0.01)
    }

    func testAlertFamilyInstantiatesEveryIntentAndTone() {
        for intent in NockerlAlertIntent.allCases {
            _ = NockerlStatusDisc(intent: intent)
            _ = NockerlBanner(message: "Message", intent: intent)
            _ = NockerlToast(message: "Message", intent: intent)
        }
        _ = NockerlBanner(
            message: "Workspace restored",
            intent: .success,
            title: "Restored",
            actionLabel: "Undo",
            onAction: {},
            onDismiss: {}
        )
        _ = NockerlToast(message: "Saved", intent: .success, actionLabel: "View", onAction: {}, onDismiss: {})
        for tone in NockerlCalloutTone.allCases {
            _ = NockerlCallout(message: "Prose body", tone: tone)
        }
        _ = NockerlCallout(message: "Design is thinking made visual.", tone: .quote, cite: "Saul Bass")
    }

    func testAlertMetricsPinTheCanonMixes() {
        XCTAssertEqual(NockerlAlertMetrics.softWashAlpha, 0.16, accuracy: 0.0001)
        XCTAssertEqual(NockerlAlertMetrics.bannerBorderMix, 0.22, accuracy: 0.0001)
        XCTAssertEqual(NockerlAlertMetrics.toastBorderMix, 0.20, accuracy: 0.0001)
        XCTAssertEqual(NockerlAlertMetrics.calloutBorderMix, 0.18, accuracy: 0.0001)
        XCTAssertEqual(NockerlCallout.frameMixes, [0.55, 0.32, 0.16])
    }

    func testSurfacePaletteSlotsBindToTokens() {
        let dark = NockerlPalette.resolve(.dark)
        XCTAssertEqual(dark.canvas, NockerlDarkColors.canvas)
        XCTAssertEqual(dark.cardSurface2, NockerlDarkColors.cardSurface2)
        XCTAssertEqual(dark.shadowTint, NockerlDarkColors.shadowTint)
        XCTAssertEqual(dark.surfaceHighlight, NockerlDarkColors.surfaceHighlight)
        XCTAssertEqual(dark.accentWarm, NockerlDarkColors.accentWarm)
        XCTAssertEqual(dark.accentWarmSoft, NockerlDarkColors.accentWarmSoft)
        let light = NockerlPalette.resolve(.light)
        XCTAssertEqual(light.canvas, NockerlLightColors.canvas)
        XCTAssertEqual(light.cardSurface2, NockerlLightColors.cardSurface2)
        XCTAssertEqual(light.shadowTint, NockerlLightColors.shadowTint)
        XCTAssertEqual(light.surfaceHighlight, NockerlLightColors.surfaceHighlight)
        XCTAssertEqual(light.accentWarm, NockerlLightColors.accentWarm)
        XCTAssertEqual(light.accentWarmSoft, NockerlLightColors.accentWarmSoft)
    }

    func testFormSectionInstantiates() {
        _ = NockerlFormSection("Gateway") { Text("Field") }
        _ = NockerlFormSection("Gateway", description: "Connection settings.") {
            Text("Field")
        }
    }

    // MARK: Accordion: shared expansion semantics (identical to Compose).

    func testAccordionExpansionSemantics() {
        // SINGLE: opening replaces; toggling closes.
        XCTAssertEqual(resolveAccordionExpansion(current: [], id: "a", mode: .single), ["a"])
        XCTAssertEqual(resolveAccordionExpansion(current: ["a"], id: "b", mode: .single), ["b"])
        XCTAssertEqual(resolveAccordionExpansion(current: ["a"], id: "a", mode: .single), [])
        // MULTIPLE: independent toggles.
        XCTAssertEqual(resolveAccordionExpansion(current: ["a"], id: "b", mode: .multiple), ["a", "b"])
        XCTAssertEqual(resolveAccordionExpansion(current: ["a", "b"], id: "a", mode: .multiple), ["b"])
    }

    func testAccordionInstantiates() {
        let items = [
            NockerlAccordionItem(id: "one", title: "Section one") { Text("Body") },
            NockerlAccordionItem(id: "two", title: "Section two") { Text("Body") },
        ]
        _ = NockerlAccordion(items: items)
        _ = NockerlAccordion(items: items, mode: .multiple, initiallyExpanded: ["one"])
    }

    // MARK: Date/time picker contract (ADR-0012): snapping + calendar mapping.

    func testMinuteSnappingContract() {
        XCTAssertEqual(nockerlSnapMinutes(7, step: 5), 5)
        XCTAssertEqual(nockerlSnapMinutes(8, step: 5), 10)
        XCTAssertEqual(nockerlSnapMinutes(58, step: 5), 0) // 60 wraps
        XCTAssertEqual(nockerlSnapMinutes(23, step: 1), 23) // step<=1 no-op
        XCTAssertEqual(nockerlSnapMinutes(-4, step: 15), 0) // clamps low
    }

    func testWeekStartCalendarMapping() {
        // Contract is 0-based Sunday=0; Apple's firstWeekday is 1-based.
        XCTAssertEqual(NockerlDatePicker.calendar(firstWeekday: 0).firstWeekday, 1)
        XCTAssertEqual(NockerlDatePicker.calendar(firstWeekday: 1).firstWeekday, 2) // Monday
        XCTAssertEqual(NockerlDatePicker.calendar(firstWeekday: 6).firstWeekday, 7)
        XCTAssertEqual(NockerlDatePicker.calendar(firstWeekday: 99).firstWeekday, 7) // clamped
    }

    func testDatePickerInstantiates() {
        var date = Date(timeIntervalSince1970: 1_750_000_000)
        let binding = Binding(get: { date }, set: { date = $0 })
        _ = NockerlDatePicker("Due date", selection: binding)
        _ = NockerlDatePicker(
            "Meeting",
            selection: binding,
            displayedComponents: [.date, .hourAndMinute],
            weekStartsOn: 1,
            entryMode: .text,
            minuteStep: 5,
            min: Date(timeIntervalSince1970: 0),
            max: Date(timeIntervalSince1970: 2_000_000_000)
        )
    }

    func testDateRangePickerInstantiates() {
        // The ADR-0012 range mode: two coordinated pickers on Apple.
        var start = Date(timeIntervalSince1970: 1_749_513_600)
        var end = Date(timeIntervalSince1970: 1_750_377_600)
        let startBinding = Binding(get: { start }, set: { start = $0 })
        let endBinding = Binding(get: { end }, set: { end = $0 })
        _ = NockerlDateRangePicker(start: startBinding, end: endBinding)
        _ = NockerlDateRangePicker(
            startLabel: "Check-in",
            endLabel: "Check-out",
            start: startBinding,
            end: endBinding,
            min: Date(timeIntervalSince1970: 0),
            max: Date(timeIntervalSince1970: 2_000_000_000)
        )
    }

    // MARK: Stepper: shared state semantics (identical to Compose) + coverage.

    func testStepperVisualStateMatrix() {
        // done < current < upcoming; error only when errorAt == current.
        XCTAssertEqual(nockerlStepVisualState(index: 0, current: 2, errorAt: nil), .done)
        XCTAssertEqual(nockerlStepVisualState(index: 2, current: 2, errorAt: nil), .current)
        XCTAssertEqual(nockerlStepVisualState(index: 3, current: 2, errorAt: nil), .upcoming)
        XCTAssertEqual(nockerlStepVisualState(index: 2, current: 2, errorAt: 2), .error)
        // errorAt elsewhere never poisons other steps.
        XCTAssertEqual(nockerlStepVisualState(index: 1, current: 2, errorAt: 2), .done)
        XCTAssertEqual(nockerlStepVisualState(index: 3, current: 2, errorAt: 3), .upcoming)
    }

    func testStepperInstantiatesBothOrientations() {
        let steps = [
            NockerlStep("Connect"),
            NockerlStep("Configure", description: "Pick a model and sampling."),
            NockerlStep("Confirm"),
        ]
        _ = NockerlStepper(steps: steps, current: 1)
        _ = NockerlStepper(steps: steps, current: 1, orientation: .vertical)
        _ = NockerlStepper(steps: steps, current: 1, errorAt: 1)
        _ = NockerlStepper(steps: steps, current: 2, onStepClick: { _ in })
    }

    // MARK: CodeBlock / Tree (instantiation + structure contracts).

    func testCodeBlockInstantiatesEveryForm() {
        _ = NockerlCodeBlock("let x = 1")
        _ = NockerlCodeBlock("let x = 1\nlet y = 2", filename: "Sample.swift", showLineNumbers: true)
        _ = NockerlCodeBlock("very long line", wrap: true)
        _ = NockerlCodeBlock("val x = 1", filename: "Main.kt", language: "Kotlin")
    }

    func testLanguageBadgeNormalizationContract() {
        // The shared  contract (identical on web + Compose): trim + lowercase.
        XCTAssertEqual(nockerlLanguageLabel("TypeScript"), "typescript")
        XCTAssertEqual(nockerlLanguageLabel("  Kotlin  "), "kotlin")
        XCTAssertNil(nockerlLanguageLabel("   "))
        _ = NockerlBadge.language("Swift")
    }

    func testCodeBlockLineSplittingContract() {
        XCTAssertEqual(NockerlCodeBlock.lines(of: "a\nb\nc"), ["a", "b", "c"])
        // A trailing newline must not add a phantom empty gutter row.
        XCTAssertEqual(NockerlCodeBlock.lines(of: "a\nb\n"), ["a", "b"])
        XCTAssertEqual(NockerlCodeBlock.lines(of: "single"), ["single"])
        // A lone empty string is one (empty) line, not zero.
        XCTAssertEqual(NockerlCodeBlock.lines(of: ""), [""])
    }

    func testTreeNodeKindDefaultsFromChildren() {
        let leaf = NockerlTreeNode(id: "a", name: "a.swift")
        XCTAssertEqual(leaf.kind, .file)
        XCTAssertNil(leaf.children)

        let folder = NockerlTreeNode(id: "src", name: "src", children: [leaf])
        XCTAssertEqual(folder.kind, .folder)
        XCTAssertEqual(folder.children?.count, 1)

        // Explicit kind overrides the inference (an empty-but-expandable folder).
        let emptyFolder = NockerlTreeNode(id: "e", name: "empty", kind: .folder, children: [])
        XCTAssertEqual(emptyFolder.kind, .folder)
        XCTAssertEqual(emptyFolder.children, [])
    }

    func testTreeInstantiatesWithSelection() {
        let nodes = [
            NockerlTreeNode(
                id: "src",
                name: "src",
                children: [
                    NockerlTreeNode(id: "src/a.swift", name: "a.swift"),
                    NockerlTreeNode(id: "src/b.swift", name: "b.swift"),
                ]
            ),
            NockerlTreeNode(id: "README.md", name: "README.md"),
        ]
        _ = NockerlTree(nodes: nodes, selected: "src/a.swift", label: "Project files") { _ in }
        _ = NockerlTree(nodes: nodes, label: "Project files") { _ in }
    }

    func testGrownPaletteSlotsBindToTokens() {
        // The status/dot/categorical slots added for the badge + status-dot + progress
        // family bind 1:1 onto the generated enums, dark and light.
        let dark = NockerlPalette.resolve(.dark)
        XCTAssertEqual(dark.statusSuccess, NockerlDarkColors.statusSuccess)
        XCTAssertEqual(dark.statusWarning, NockerlDarkColors.statusWarning)
        XCTAssertEqual(dark.statusInfo, NockerlDarkColors.statusInfo)
        XCTAssertEqual(dark.dotStreaming, NockerlDarkColors.dotStreaming)
        XCTAssertEqual(dark.dotAttention, NockerlDarkColors.dotAttention)
        XCTAssertEqual(dark.dotUnread, NockerlDarkColors.dotUnread)
        XCTAssertEqual(dark.dotActive, NockerlDarkColors.dotActive)
        XCTAssertEqual(dark.dotIdle, NockerlDarkColors.dotIdle)
        XCTAssertEqual(dark.familyAgent, NockerlDarkColors.familyAgent)

        let light = NockerlPalette.resolve(.light)
        XCTAssertEqual(light.statusSuccess, NockerlLightColors.statusSuccess)
        XCTAssertEqual(light.statusWarning, NockerlLightColors.statusWarning)
        XCTAssertEqual(light.statusInfo, NockerlLightColors.statusInfo)
        XCTAssertEqual(light.dotStreaming, NockerlLightColors.dotStreaming)
        XCTAssertEqual(light.dotAttention, NockerlLightColors.dotAttention)
        XCTAssertEqual(light.dotUnread, NockerlLightColors.dotUnread)
        XCTAssertEqual(light.dotActive, NockerlLightColors.dotActive)
        XCTAssertEqual(light.dotIdle, NockerlLightColors.dotIdle)
        XCTAssertEqual(light.familyAgent, NockerlLightColors.familyAgent)
    }

    func testDarkAndLightPalettesDiffer() {
        // A resolved dark palette must not collapse onto light for a theme-varying slot.
        XCTAssertNotEqual(
            NockerlPalette.resolve(.dark).accentPrimary,
            NockerlPalette.resolve(.light).accentPrimary
        )
        XCTAssertNotEqual(
            NockerlPalette.resolve(.dark).cardSurface1,
            NockerlPalette.resolve(.light).cardSurface1
        )
    }

    // MARK: Checkbox: the ratified  port (tri-state, contained control).

    func testCheckboxInstantiatesEveryStateAndSize() {
        for state in [NockerlCheckedState.off, .on, .mixed] {
            _ = NockerlCheckbox(state: state, onChange: { _ in }, label: "Stream responses")
            _ = NockerlCheckbox(state: state, label: "Display only", size: .sm)
            _ = NockerlCheckbox(state: state, label: "Locked", enabled: false)
        }
        _ = NockerlCheckbox(state: .on, label: "With description", description: "Supporting line")
    }

    func testCheckboxCycleContractMatchesWebAndCompose() {
        // off -> on, on -> off, mixed resolves to ON (the ratified family rule).
        XCTAssertEqual(nockerlCheckboxNext(.off), .on)
        XCTAssertEqual(nockerlCheckboxNext(.on), .off)
        XCTAssertEqual(nockerlCheckboxNext(.mixed), .on)
    }

    func testCheckboxTreatmentConstantsArePinned() {
        // The  defining-edge mix + the web disabled ladder.
        XCTAssertEqual(NockerlCheckbox.edgeAccentFraction, 0.68, accuracy: 1e-9)
        XCTAssertEqual(NockerlCheckbox.disabledOffOpacity, 0.55, accuracy: 1e-9)
        XCTAssertEqual(NockerlCheckbox.disabledOnFillOpacity, 0.5, accuracy: 1e-9)
    }

    // MARK: Faceted background (cross-rail field determinism).

    func testFacetJitterHashMatchesComposeRail() {
        // Pinned values shared with the Kotlin ContractTests: one integer hash,
        // one field, on both platforms.
        XCTAssertEqual(nockerlFacetJitter01(0, 0), 0.0, accuracy: 1e-6)
        XCTAssertEqual(nockerlFacetJitter01(3, 7), 0.545331597, accuracy: 1e-6)
        XCTAssertEqual(nockerlFacetJitter01(101, 211), 0.967945278, accuracy: 1e-6)
        XCTAssertEqual(nockerlFacetJitter01(-1, 5), 0.169553757, accuracy: 1e-6)
    }

    func testFacetFieldGeometryContract() {
        // 2 triangles per cell; one extra ring beyond each edge; degenerate -> [].
        let field = nockerlBuildFacetField(size: CGSize(width: 300, height: 200), cell: 128)
        // cols = 300/128 + 2 = 4, rows = 200/128 + 2 = 3 -> (4-1)*(3-1)*2 = 12.
        XCTAssertEqual(field.count, 12)
        XCTAssertTrue(nockerlBuildFacetField(size: .zero, cell: 128).isEmpty)
        // Static deltas stay inside the baked jitter band; diagonal is normalized.
        for facet in field {
            XCTAssertLessThanOrEqual(abs(facet.staticDelta), NockerlFacetedBackground.staticFacetJitter + 1e-9)
            XCTAssertTrue((0.0...1.0).contains(facet.diagonalPos))
        }
    }

    func testFacetWaveMathIsPureAndBounded() {
        // phase 0 at diagonalPos 0 -> exactly the static delta; the wave never
        // exceeds ±amplitude around it.
        XCTAssertEqual(
            nockerlFacetLuminanceDelta(staticDelta: 0.01, diagonalPos: 0, phase: 0),
            0.01,
            accuracy: 1e-9
        )
        let swing = nockerlFacetLuminanceDelta(staticDelta: 0, diagonalPos: 0.25, phase: 0)
        XCTAssertLessThanOrEqual(abs(swing), NockerlFacetedBackground.waveAmplitude + 1e-9)
        _ = NockerlFacetedBackground()
    }

    // MARK: Brand lockup (law §11): mark + wordmark + product word.

    func testLogoInstantiatesEveryTone() {
        _ = NockerlLogo()
        _ = NockerlLogo(size: 40, tone: .onDark)
        _ = NockerlLogo(size: 18, tone: .onLight, accessibilityLabel: nil)
        // The ink ladders are the ratified brand shades (peaks left/center/right).
        let dark = NockerlLogoTone.onDark.ink
        let light = NockerlLogoTone.onLight.ink
        XCTAssertEqual(dark.1, Color(white: 1.0))   // center peak = white on dark
        XCTAssertEqual(light.1, Color(white: 0.133)) // center peak = #222 on light
    }

    func testLockupInstantiatesEveryForm() {
        _ = NockerlLockup()                                  // wordmark only
        _ = NockerlLockup(product: "Voice")                  // product lockup
        _ = NockerlLockup(product: "Console", size: 40, stacked: true)
        _ = NockerlLockup(product: "Dashboard", size: 28, tone: .onDark)
    }

    // MARK: InsetIcon / EmptyState (, law ): informational treatment.

    func testInsetIconInstantiatesEveryTone() {
        for tone in [NockerlInsetIconTone.neutral, .brand, .error] {
            _ = NockerlInsetIcon(systemName: "magnifyingglass", tone: tone)
            // Named (informational a11y) + decorative (nil) forms both compile.
            _ = NockerlInsetIcon(systemName: "exclamationmark.triangle", accessibilityLabel: "Failed", tone: tone)
        }
    }

    func testEmptyStateInstantiatesWithAndWithoutAction() {
        // No-action convenience init (Action == EmptyView).
        _ = NockerlEmptyState(systemImage: "tray", title: "No sessions yet")
        _ = NockerlEmptyState(
            systemImage: "magnifyingglass",
            title: "No results",
            description: "Try a different search.",
            tone: .neutral
        )
        // With a trailing action (the @ViewBuilder overload).
        _ = NockerlEmptyState(
            systemImage: "plus",
            title: "Start something",
            description: "Your first run.",
            tone: .brand
        ) {
            NockerlButton("New session", variant: .primary, size: .sm, action: {})
        }
    }

    // MARK: FailedTurn: the calm failure grammar, compile coverage.

    func testFailedTurnInstantiatesEveryForm() {
        // Bare (just "Failed" + retry), with detail, and display-only (no action).
        _ = NockerlFailedTurn(onRetry: {})
        _ = NockerlFailedTurn(
            title: "Response failed",
            detail: "The gateway returned a 502.",
            onRetry: {}
        )
        _ = NockerlFailedTurn(title: "Tool error", detail: "path refused")
        // Custom retry label.
        _ = NockerlFailedTurn(onRetry: {}, retryLabel: "Try again")
    }

    // MARK: Motion tokens (the ratified set + component bindings).

    func testMotionDurationTokensMatchTheRatifiedSet() {
        XCTAssertEqual(NockerlMotionDuration.instant, 0)
        XCTAssertEqual(NockerlMotionDuration.fast, 0.12, accuracy: 1e-9)
        XCTAssertEqual(NockerlMotionDuration.base, 0.2, accuracy: 1e-9)
        XCTAssertEqual(NockerlMotionDuration.slow, 0.32, accuracy: 1e-9)
        XCTAssertEqual(NockerlMotionDuration.sheet, 0.4, accuracy: 1e-9)
        XCTAssertEqual(NockerlMotionDuration.pulse, 0.8, accuracy: 1e-9)
    }

    func testMotionEasingControlPointsMatchTheRatifiedCurves() {
        // standard = cubic-bezier(.2, 0, 0, 1): THE default transition ease.
        let s = NockerlMotionEasing.standard
        XCTAssertEqual([s.x1, s.y1, s.x2, s.y2], [0.2, 0, 0, 1])
        let e = NockerlMotionEasing.emphasized
        XCTAssertEqual([e.x1, e.y1, e.x2, e.y2], [0.05, 0.7, 0.1, 1])
        let x = NockerlMotionEasing.exit
        XCTAssertEqual([x.x1, x.y1, x.x2, x.y2], [0.3, 0, 0.8, 0.15])
    }

    func testMotionAnimationBridgeBuilds() {
        // The Animation bridge is the only sanctioned way components consume the
        // curves. Each factory must construct for every ratified duration.
        for duration in [
            NockerlMotionDuration.instant, NockerlMotionDuration.fast,
            NockerlMotionDuration.base, NockerlMotionDuration.slow,
            NockerlMotionDuration.sheet, NockerlMotionDuration.pulse,
        ] {
            _ = Animation.nockerlStandard(duration)
            _ = Animation.nockerlEmphasized(duration)
            _ = Animation.nockerlExit(duration)
        }
    }

    func testStatusDotPulseBindsToTheMotionToken() {
        // The  rebinding: the component constant IS the token, not a literal.
        // (Reduce Motion freezes the pulse at full opacity; the floor is the other
        // half of that contract, asserted in the pulse-contract test above.)
        XCTAssertEqual(NockerlStatusDot.pulseDuration, NockerlMotionDuration.pulse, accuracy: 1e-9)
    }

    func testProgressIndeterminateContractIsPinned() {
        // Reduced-motion freezes this slide mid-track; the values themselves are
        // component-pinned (NO ratified token covers 1.2s: the spinner-family
        // adjudication owns it; this pin fails loudly if someone "fixes" it
        // ahead of a ruling).
        XCTAssertEqual(NockerlProgressBar.indeterminateSegment, 0.3, accuracy: 1e-9)
        XCTAssertEqual(NockerlProgressBar.indeterminateDuration, 1.2, accuracy: 1e-9)
    }

    func testAccentInkPickMatchesTheComposeRail() {
        // Cross-rail parity with ContractTests.pickOnAccentChoosesInkByLuminance:
        // BOTH brand cyans sit under the 0.55 luminance knee -> near-white ink.
        XCTAssertEqual(NockerlContrast.pickOn(NockerlPalette.resolve(.dark).accentPrimary), NockerlContrast.inkLight)
        XCTAssertEqual(NockerlContrast.pickOn(NockerlPalette.resolve(.light).accentPrimary), NockerlContrast.inkLight)
    }

    // MARK: Layout grid + density tokens (bindings on the Swift rail).

    func testGridTokensMatchTheFoundation() {
        XCTAssertEqual(NockerlGrid.gutter, 20)
        XCTAssertEqual(NockerlGrid.margin, 16)
        XCTAssertEqual(NockerlGrid.containerMd, 768)
        XCTAssertEqual(NockerlGrid.containerLg, 1024)
        XCTAssertEqual(NockerlGrid.containerXl, 1280)
    }

    func testDensityTokensAliasTheSpaceScale() {
        XCTAssertEqual(NockerlDensity.rowHeightCompact, NockerlSpace.space8)
        XCTAssertEqual(NockerlDensity.rowHeightComfortable, NockerlSpace.space12)
        XCTAssertEqual(NockerlDensity.padYCompact, NockerlSpace.space1)
        XCTAssertEqual(NockerlDensity.padYComfortable, NockerlSpace.space3)
    }
}
