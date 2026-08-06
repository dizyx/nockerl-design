package com.dizyx.nockerl.design.components

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.NockerlDensity
import com.dizyx.nockerl.design.tokens.NockerlGrid
import com.dizyx.nockerl.design.tokens.NockerlMotionDuration
import com.dizyx.nockerl.design.tokens.NockerlMotionEasing
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM contract tests for the PURE component logic: the same shared
 * semantics the Swift rail tests in ComponentTests.swift, exercised on the
 * Kotlin side so a divergence on either platform fails a gate. No Robolectric,
 * no rendering: these are the pure functions + token bindings only.
 */
class ContractTests {
    // ── Stepper (B14): the shared visual-state rule ─────────────────────────

    @Test
    fun stepVisualStateMatrix() {
        // Mirrors Swift testStepperVisualStateMatrix: done < current < upcoming,
        // with ERROR only when it sits ON the current step.
        assertEquals(NockerlStepVisualState.DONE, nockerlStepVisualState(index = 0, current = 2, errorAt = null))
        assertEquals(NockerlStepVisualState.DONE, nockerlStepVisualState(index = 1, current = 2, errorAt = null))
        assertEquals(NockerlStepVisualState.CURRENT, nockerlStepVisualState(index = 2, current = 2, errorAt = null))
        assertEquals(NockerlStepVisualState.UPCOMING, nockerlStepVisualState(index = 3, current = 2, errorAt = null))
    }

    @Test
    fun stepErrorOnlyMarksTheCurrentStep() {
        // An error index elsewhere does NOT repaint done/upcoming steps.
        assertEquals(NockerlStepVisualState.ERROR, nockerlStepVisualState(index = 2, current = 2, errorAt = 2))
        assertEquals(NockerlStepVisualState.DONE, nockerlStepVisualState(index = 1, current = 2, errorAt = 1))
        assertEquals(NockerlStepVisualState.UPCOMING, nockerlStepVisualState(index = 3, current = 2, errorAt = 3))
    }

    @Test
    fun stepBoundsBehaveAtTheEdges() {
        // current = 0 -> everything else upcoming; current past the end -> all done.
        assertEquals(NockerlStepVisualState.CURRENT, nockerlStepVisualState(index = 0, current = 0, errorAt = null))
        assertEquals(NockerlStepVisualState.UPCOMING, nockerlStepVisualState(index = 1, current = 0, errorAt = null))
        assertEquals(NockerlStepVisualState.DONE, nockerlStepVisualState(index = 3, current = 4, errorAt = null))
    }

    // ── Accordion (B4): the shared expansion semantics ──────────────────────

    @Test
    fun accordionSingleModeReplacesTheOpenSection() {
        val opened = resolveAccordionExpansion(setOf("a"), "b", NockerlAccordionMode.SINGLE)
        assertEquals(setOf("b"), opened)
    }

    @Test
    fun accordionToggleClosesAnOpenSection() {
        assertEquals(emptySet<String>(), resolveAccordionExpansion(setOf("a"), "a", NockerlAccordionMode.SINGLE))
        assertEquals(setOf("b"), resolveAccordionExpansion(setOf("a", "b"), "a", NockerlAccordionMode.MULTIPLE))
    }

    @Test
    fun accordionMultipleModeAccumulates() {
        val opened = resolveAccordionExpansion(setOf("a"), "b", NockerlAccordionMode.MULTIPLE)
        assertEquals(setOf("a", "b"), opened)
    }

    // ── Checkbox port: the shared cycle contract ────────────────────

    @Test
    fun checkboxCycleContractMatchesWebAndSwift() {
        // off -> on, on -> off, mixed resolves to ON (the ratified family rule).
        assertEquals(ToggleableState.On, nockerlCheckboxNext(ToggleableState.Off))
        assertEquals(ToggleableState.Off, nockerlCheckboxNext(ToggleableState.On))
        assertEquals(ToggleableState.On, nockerlCheckboxNext(ToggleableState.Indeterminate))
    }

    // ── Pickers: snapping + clamping contracts ──────────────────────────────

    @Test
    fun minuteSnappingContract() {
        // Mirrors Swift testMinuteSnappingContract (5-minute step canon).
        assertEquals(30, nockerlSnapMinutes(minute = 32, step = 5))
        assertEquals(35, nockerlSnapMinutes(minute = 33, step = 5))
        assertEquals(0, nockerlSnapMinutes(minute = 58, step = 5)) // 60 wraps to 0
        assertEquals(17, nockerlSnapMinutes(minute = 17, step = 1)) // step<=1 is a no-op
        assertEquals(59, nockerlSnapMinutes(minute = 99, step = 1)) // no-op still clamps
    }

    @Test
    fun millisClampingContract() {
        assertEquals(5L, nockerlClampMillis(value = 3, min = 5, max = 10))
        assertEquals(10L, nockerlClampMillis(value = 30, min = 5, max = 10))
        assertEquals(7L, nockerlClampMillis(value = 7, min = null, max = null))
    }

    // ── Avatar: initials derivation ─────────────────────────────────────────

    @Test
    fun avatarInitialsContract() {
        assertEquals("AL", nockerlAvatarInitials("Ada Lovelace"))
        assertEquals("N", nockerlAvatarInitials("Nockerl"))
        assertEquals("?", nockerlAvatarInitials("   "))
        // Middle tokens are skipped: first + last only.
        assertEquals("AC", nockerlAvatarInitials("Ada B. Curie"))
    }

    // ── Badge: the 99+ cap ──────────────────────────────────────────────────

    @Test
    fun badgeCountCapsAt99() {
        assertEquals("99", nockerlBadgeCountText(99))
        assertEquals("99+", nockerlBadgeCountText(100))
        assertEquals("0", nockerlBadgeCountText(0))
    }

    // ── Language badge: the shared label normalization ──────────────

    @Test
    fun languageLabelNormalizationContract() {
        assertEquals("typescript", nockerlLanguageLabel("TypeScript"))
        assertEquals("kotlin", nockerlLanguageLabel("  Kotlin  "))
        assertEquals(null, nockerlLanguageLabel("   "))
    }

    // ── Contrast: the shared on-accent ink pick ─────────────────────────────

    @Test
    fun pickOnAccentChoosesInkByLuminance() {
        // Mirrors Swift testContrastPicksInkByLuminance: light fills get near-black
        // ink, dark fills get near-white. The pick is never a hue.
        assertEquals(Color(0xFF1A1A1A), pickOnAccent(Color(0xFFFFFFFF)))
        assertEquals(Color(0xFFF7F7F7), pickOnAccent(Color(0xFF000000)))
        // BOTH brand cyans sit under the 0.55 relative-luminance knee
        // (#0CC0DF ≈ 0.43, #0891B2 ≈ 0.24) -> filled accents take near-WHITE
        // ink on either theme, matching the shipped white-on-cyan buttons.
        assertEquals(Color(0xFFF7F7F7), pickOnAccent(Color(0xFF0CC0DF)))
        assertEquals(Color(0xFFF7F7F7), pickOnAccent(Color(0xFF0891B2)))
    }

    // ── Faceted background: cross-rail field determinism ────────────

    @Test
    fun facetJitterHashMatchesSwiftRail() {
        // Pinned values shared with the Swift ComponentTests: one integer hash,
        // one field, on both platforms.
        assertEquals(0.0f, nockerlFacetJitter01(0, 0), 1e-6f)
        assertEquals(0.545331597f, nockerlFacetJitter01(3, 7), 1e-6f)
        assertEquals(0.967945278f, nockerlFacetJitter01(101, 211), 1e-6f)
        assertEquals(0.169553757f, nockerlFacetJitter01(-1, 5), 1e-6f)
    }

    @Test
    fun facetFieldGeometryContract() {
        // 2 triangles per cell; one extra ring beyond each edge; degenerate -> [].
        val field = nockerlBuildFacetField(Size(300f, 200f), cellPx = 128f)
        // cols = 300/128 + 2 = 4, rows = 200/128 + 2 = 3 -> (4-1)*(3-1)*2 = 12.
        assertEquals(12, field.size)
        assertEquals(0, nockerlBuildFacetField(Size(0f, 0f), cellPx = 128f).size)
        field.forEach { facet ->
            assertTrue(kotlin.math.abs(facet.staticDelta) <= 0.022f + 1e-9f)
            assertTrue(facet.diagonalPos in 0f..1f)
        }
    }

    @Test
    fun facetWaveMathIsPureAndBounded() {
        val still =
            nockerlFacetLuminanceDelta(
                NockerlFacet(Offset.Zero, Offset.Zero, Offset.Zero, staticDelta = 0.01f, diagonalPos = 0f),
                phase = 0f,
            )
        assertEquals(0.01f, still, 1e-7f)
        val shifted = nockerlShiftLuminance(Color(0.5f, 0.5f, 0.5f, 1f), delta = 0.7f)
        assertEquals(1f, shifted.red, 1e-6f) // clamped at full scale
    }

    // ── Motion: token bindings + the ratified set ─────────────

    @Test
    fun motionDurationTokensMatchTheRatifiedSet() {
        assertEquals(0, NockerlMotionDuration.instantMs)
        assertEquals(120, NockerlMotionDuration.fastMs)
        assertEquals(200, NockerlMotionDuration.baseMs)
        assertEquals(320, NockerlMotionDuration.slowMs)
        assertEquals(400, NockerlMotionDuration.sheetMs)
        assertEquals(800, NockerlMotionDuration.pulseMs)
    }

    @Test
    fun statusDotPulseBindsToTheMotionToken() {
        // The rebinding: the component constant IS the token, not a literal.
        assertEquals(NockerlMotionDuration.pulseMs, NockerlStatusDotDefaults.PULSE_MS)
    }

    @Test
    fun standardEasingMatchesTheRatifiedCurve() {
        // cubic-bezier(.2, 0, 0, 1): starts at 0, ends at 1, and decelerates.
        // The midpoint output is far above linear (≈0.877 for x = 0.5).
        val e = NockerlMotionEasing.standard
        assertEquals(0f, e.transform(0f), 1e-4f)
        assertEquals(1f, e.transform(1f), 1e-4f)
        val mid = e.transform(0.5f)
        assertTrue("standard(0.5) should decelerate (~0.877), got $mid", mid > 0.8f && mid < 0.95f)
    }

    // ── Layout grid + density: token bindings ───────────────────────

    @Test
    fun gridTokensMatchTheFoundation() {
        assertEquals(20.dp, NockerlGrid.gutter)
        assertEquals(16.dp, NockerlGrid.margin)
        assertEquals(768.dp, NockerlGrid.containerMd)
        assertEquals(1024.dp, NockerlGrid.containerLg)
        assertEquals(1280.dp, NockerlGrid.containerXl)
    }

    @Test
    fun densityTokensAliasTheSpaceScale() {
        assertEquals(32.dp, NockerlDensity.rowHeightCompact)
        assertEquals(48.dp, NockerlDensity.rowHeightComfortable)
        assertEquals(4.dp, NockerlDensity.padYCompact)
        assertEquals(12.dp, NockerlDensity.padYComfortable)
    }
}
