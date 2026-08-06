package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.sin

// ── The Nockerl signature surface (package port) ───────────────────────
//
// A subtle, premium, GEOMETRIC field behind content: a low-poly mesh of large
// soft TRIANGULAR facets (on-brand, since the Nockerl mark is a triangle), each a
// whisper of tonal variation off the `chatBg` token, with a slow tone-wave
// drifting diagonally. NOT glow / aurora / neon; calm, "active but not busy".
//
// MAX-SMOOTHNESS TECHNIQUE (the native-butter contract):
// 1. The phase derives from a THROTTLED frame clock CAPPED at ~20fps (v1.14.0 perf
//    cut; was `rememberInfiniteTransition` running per-frame up to the display's
//    120fps). For the slow ~18s sine the per-frame luminance step is ~0.001
//    (sub-perceptual), so the look is IDENTICAL at a fraction of the CPU. `paused`
//    (host occlusion) or a non-animating host stops the clock outright: 0 CPU,
//    the static field stays on screen.
// 2. `drawWithCache` builds the triangulation ONCE per size; the per-frame work
//    is only a few dozen `drawPath` re-tints (no geometry rebuild, no
//    allocation), so the frame budget is trivially met and the drift never
//    stutters into visible steps.
// 3. All randomness is a DETERMINISTIC integer hash ([nockerlFacetJitter01]):
//    the field never re-rolls, so nothing shimmers between frames.
//
// Ported 1:1 from the canonical Android `ChatFeedBackground` (geometry, hash,
// constants); Swift renders the SAME field from the same pure functions.

/** Target facet cell size, kept LARGE so the mesh reads as a few big facets. */
private val FACET_CELL_SIZE: Dp = 128.dp

/** One full tone-wave cycle. ~18s reads alive, not busy. */
private const val WAVE_PERIOD_MILLIS: Int = 18_000

/**
 * Tone-wave sampling interval: ~20fps (v1.14.0 perf cut). The phase is re-derived
 * from the frame clock at most this often; for the ~18s sine the per-step luminance
 * change is ~0.001 (sub-perceptual), so 20fps looks identical at ~6x less CPU than
 * the display's up-to-120fps refresh.
 */
private const val FACET_FRAME_INTERVAL_MILLIS: Long = 50L

/** Peak luminance swing the moving tone-wave adds to a facet. */
private const val WAVE_AMPLITUDE: Float = 0.05f

/** Static per-facet luminance jitter range (± this fraction) baked at build. */
private const val STATIC_FACET_JITTER: Float = 0.022f

/** Alpha of the hairline drawn on each facet edge: barely-there structure. */
private const val EDGE_ALPHA: Float = 0.05f

/**
 * One triangular facet: three corners, a baked [staticDelta] tonal offset, and
 * its normalized [diagonalPos] (0..1 along the top-left → bottom-right
 * diagonal) that phases the travelling tone-wave.
 */
internal data class NockerlFacet(
    val a: Offset,
    val b: Offset,
    val c: Offset,
    val staticDelta: Float,
    val diagonalPos: Float,
)

/**
 * Deterministic pseudo-random in `0f..1f` from two integer grid indices: a
 * mixed-bit integer hash (splitmix-style avalanche), identical on Swift, so
 * both platforms render the SAME field and nothing ever re-rolls/shimmers.
 */
internal fun nockerlFacetJitter01(
    x: Int,
    y: Int,
): Float {
    var h = x * 374_761_393 + y * 668_265_263
    h = (h xor (h ushr 13)) * 1_274_126_177
    h = h xor (h ushr 16)
    return (h and 0xFFFFFF) / 16_777_216f
}

/**
 * Shift a color's luminance by [delta] (signed fraction of full scale),
 * clamping each channel; alpha preserved. Per-channel add keeps the facet hue
 * neutral (the field is tonal, not colored).
 */
internal fun nockerlShiftLuminance(
    color: Color,
    delta: Float,
): Color =
    Color(
        red = (color.red + delta).coerceIn(0f, 1f),
        green = (color.green + delta).coerceIn(0f, 1f),
        blue = (color.blue + delta).coerceIn(0f, 1f),
        alpha = color.alpha,
        colorSpace = color.colorSpace,
    )

/**
 * Total luminance delta for a facet at animation [phase] (radians): its baked
 * static delta plus `amplitude * sin(phase + diagonalPos * 2π)` (the sine
 * crest sweeps along the diagonal as the phase advances). Pure + frame-cheap.
 */
internal fun nockerlFacetLuminanceDelta(
    facet: NockerlFacet,
    phase: Float,
    amplitude: Float = WAVE_AMPLITUDE,
): Float = facet.staticDelta + amplitude * sin(phase + facet.diagonalPos * (2f * PI.toFloat()))

/**
 * Build the low-poly triangulation covering [size] with cells of [cellPx]:
 * a point grid (one extra ring beyond each edge so facets bleed off-screen),
 * interior points nudged by the deterministic hash, each cell split into two
 * triangles alternating the diagonal by parity. Pure + unit-testable.
 */
internal fun nockerlBuildFacetField(
    size: Size,
    cellPx: Float,
    jitterFraction: Float = 0.34f,
): List<NockerlFacet> {
    if (size.width <= 0f || size.height <= 0f || cellPx <= 0f) return emptyList()

    val cols = (size.width / cellPx).toInt() + 2
    val rows = (size.height / cellPx).toInt() + 2
    val jitterPx = cellPx * jitterFraction
    val diagSpan = (size.width + size.height).coerceAtLeast(1f)

    fun point(
        col: Int,
        row: Int,
    ): Offset {
        val baseX = col * cellPx
        val baseY = row * cellPx
        val edge = col <= 0 || row <= 0 || col >= cols - 1 || row >= rows - 1
        if (edge) return Offset(baseX, baseY)
        val dx = (nockerlFacetJitter01(col, row) - 0.5f) * 2f * jitterPx
        val dy = (nockerlFacetJitter01(col + 101, row + 211) - 0.5f) * 2f * jitterPx
        return Offset(baseX + dx, baseY + dy)
    }

    val facets = ArrayList<NockerlFacet>(cols * rows * 2)
    for (row in 0 until rows - 1) {
        for (col in 0 until cols - 1) {
            val tl = point(col, row)
            val tr = point(col + 1, row)
            val br = point(col + 1, row + 1)
            val bl = point(col, row + 1)
            val splitTlBr = (col + row) % 2 == 0
            val tri1 = if (splitTlBr) Triple(tl, tr, br) else Triple(tl, tr, bl)
            val tri2 = if (splitTlBr) Triple(tl, br, bl) else Triple(tr, br, bl)
            facets += facetOf(tri1, col, row, 0, diagSpan)
            facets += facetOf(tri2, col, row, 1, diagSpan)
        }
    }
    return facets
}

/** Assemble a facet: centroid diagonal position + hash-baked static delta. */
private fun facetOf(
    tri: Triple<Offset, Offset, Offset>,
    col: Int,
    row: Int,
    half: Int,
    diagSpan: Float,
): NockerlFacet {
    val (a, b, c) = tri
    val cx = (a.x + b.x + c.x) / 3f
    val cy = (a.y + b.y + c.y) / 3f
    val diagonalPos = ((cx + cy) / diagSpan).coerceIn(0f, 1f)
    val staticDelta = (nockerlFacetJitter01(col * 2 + half, row) - 0.5f) * 2f * STATIC_FACET_JITTER
    return NockerlFacet(a = a, b = b, c = c, staticDelta = staticDelta, diagonalPos = diagonalPos)
}

/** Triangle [Path] from a facet's corners (built once, reused per frame). */
private fun NockerlFacet.toPath(): Path =
    Path().apply {
        moveTo(a.x, a.y)
        lineTo(b.x, b.y)
        lineTo(c.x, c.y)
        close()
    }

/**
 * The **faceted background**, the Nockerl signature surface: an animated
 * low-poly triangle field filling its parent behind content (see the file
 * header for the geometry + the max-smoothness contract). Reads `chatBg` +
 * `canvasEdge` from [LocalNockerlColors], so it tracks the active palette.
 *
 * @param modifier layout modifier: typically `Modifier.matchParentSize()`.
 * @param animate when `true` (default) the tone-wave drifts continuously; when
 *   `false` the field is FROZEN at phase 0: for reduced-motion hosts and for
 *   DETERMINISTIC snapshots (the gallery/Roborazzi golden captures a static
 *   frame, since a running clock has no stable capture frame).
 * @param paused when `true` the tone-wave clock STOPS (0 CPU) while the static
 *   faceted field stays on screen: hosts set this when the window is occluded /
 *   backgrounded (v1.14.0). Composed with [animate]: the wave runs only when
 *   `animate && !paused`. Default `false`: the pre-1.14.0 behavior. Mirrors the
 *   Swift `paused` parameter.
 */
@Composable
fun NockerlFacetedBackground(
    modifier: Modifier = Modifier,
    animate: Boolean = true,
    paused: Boolean = false,
) {
    val colors = LocalNockerlColors.current
    val baseColor = colors.chatBg
    val edgeColor = colors.canvasEdge.copy(alpha = EDGE_ALPHA)
    val density: Density = LocalDensity.current
    val cellPx = with(density) { FACET_CELL_SIZE.toPx() }
    val edgeStroke = with(density) { Stroke(width = 0.75.dp.toPx()) }

    // Continuous, seamless phase 0 → 2π: a full sine cycle wraps cleanly (the
    // throttled clock loops modulo the period, no visible seam). Frozen at 0 when the
    // host isn't animating OR is paused (v1.14.0): the clock never composes/runs.
    val phase = if (animate && !paused) rememberFacetPhase() else 0f

    Spacer(
        modifier =
            modifier
                .fillMaxSize()
                .drawWithCache {
                    // Geometry: rebuilt ONLY when the draw size changes.
                    val paths = nockerlBuildFacetField(size, cellPx).map { it to it.toPath() }
                    onDrawBehind {
                        drawRect(color = baseColor)
                        paths.forEach { (facet, path) ->
                            val delta = nockerlFacetLuminanceDelta(facet, phase)
                            drawPath(path = path, color = nockerlShiftLuminance(baseColor, delta))
                            drawPath(path = path, color = edgeColor, style = edgeStroke)
                        }
                    }
                },
    )
}

/**
 * The drifting tone-wave phase (0 → 2π, ~18s, seamless loop), THROTTLED to ~20fps
 * (v1.14.0 perf cut). Isolated in its own composable so the public
 * [NockerlFacetedBackground] composes it ONLY when animating: a frozen / paused
 * field never runs the clock at all (0 CPU). The phase is derived from the frame
 * timestamp (like Swift's `TimelineView(.animation(minimumInterval:))`) and
 * re-sampled every [FACET_FRAME_INTERVAL_MILLIS]; `withFrameNanos` also parks the
 * loop whenever the host stops producing frames (occluded / backgrounded).
 */
@Composable
private fun rememberFacetPhase(): Float {
    val phase by produceState(initialValue = 0f) {
        val startNanos = withFrameNanos { it }
        while (true) {
            val nowNanos = withFrameNanos { it }
            val elapsedMillis = (nowNanos - startNanos) / 1_000_000f
            val cyclePos = (elapsedMillis % WAVE_PERIOD_MILLIS) / WAVE_PERIOD_MILLIS
            value = cyclePos * 2f * PI.toFloat()
            delay(FACET_FRAME_INTERVAL_MILLIS)
        }
    }
    return phase
}
