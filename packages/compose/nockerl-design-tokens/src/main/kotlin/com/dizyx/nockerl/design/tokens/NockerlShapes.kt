package com.dizyx.nockerl.design.tokens

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Immutable
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp

/**
 * Geometry building blocks for the redesign.
 *
 * The mockup uses deliberate, non-rectangular forms: chamfered (clipped) corners
 * on the workspace pill, an asymmetric clipped corner on the team card, and a
 * tightened "tail" corner on message bubbles. These are expressed as reusable
 * [Shape]s here so every component shares the exact same geometry.
 */

/** Standard card corner radius (matches the mockup's 18-20px cards). */
val NockerlCardRadius: Dp = 16.dp // card radius unified to 16 across platforms

/** Tighter radius for nested panels / chips. */
val NockerlPanelRadius: Dp = 12.dp

/**
 * The single semantic **control radius**: the one shared corner rounding for
 * *every* interactive control (buttons, icon buttons, segmented controls,
 * tappable rows). Ratified at 12dp in Nockerl Design Review #1 ("one control
 * radius, 12dp"); see Dashboard project 96 / the interactive review page.
 *
 * This token is the cure for the audit's "~9 button languages, 7+ radii"
 * finding. Controls must read this token rather than a raw `RoundedCornerShape(n)`
 * so a future radius change is one edit. The only deliberate exceptions are
 * **chips** and the **input bar**, which keep the [NockerlPillShape] (the ~50%
 * pill is reserved for those two idioms so the contrast stays meaningful), and
 * the **send/stop** slot, which is a true [androidx.compose.foundation.shape.CircleShape].
 *
 * @see NockerlControlShape
 * @see NockerlPillShape
 */
val NockerlButtonRadius: Dp = 12.dp

/** The size of a chamfer cut, used by [ChamferedCornerShape]. */
val NockerlChamfer: Dp = 14.dp

/** A plain rounded-rectangle at the standard [NockerlCardRadius]. */
val NockerlCardShape: Shape = RoundedCornerShape(NockerlCardRadius)

/**
 * The shared **panel** silhouette: a rounded rectangle at the tighter
 * [NockerlPanelRadius]. Used for nested panels and the smaller floating chrome
 * (the Plan/Todo widget, the plan-review content panel) so they read a step
 * tighter than a full [NockerlCardShape] card while still sharing one geometry.
 * Read this instead of `RoundedCornerShape(NockerlPanelRadius)` /
 * `RoundedCornerShape(12.dp)`.
 */
val NockerlPanelShape: Shape = RoundedCornerShape(NockerlPanelRadius)

/**
 * Corner radius for thin progress tracks (the Plan / Team widget progress bars).
 * Small by design so a 3dp-tall bar reads as a soft-ended sliver, not a pill.
 */
val NockerlProgressTrackRadius: Dp = 2.dp

/**
 * The shared silhouette for thin progress-bar tracks: a rounded rectangle at
 * [NockerlProgressTrackRadius]. Read this instead of `RoundedCornerShape(2.dp)`
 * so every floating-chrome progress bar shares one rounding.
 */
val NockerlProgressTrackShape: Shape = RoundedCornerShape(NockerlProgressTrackRadius)

/**
 * The shared control silhouette: a rounded rectangle at the [NockerlButtonRadius]
 * control radius. Every Nockerl control composable (the button, segmented control,
 * and settings row) clips to this so the whole app shares one corner geometry.
 * Read this instead of `RoundedCornerShape(12.dp)`.
 */
val NockerlControlShape: Shape = RoundedCornerShape(NockerlButtonRadius)

/**
 * The **pill** silhouette: a ~50% rounded rectangle. Per Design Review #1 the
 * pill is *reserved* for two idioms only: **chips** (e.g. the Nockerl chip, the
 * session keycaps) and the **input bar**. Reusing it elsewhere is what made the
 * old UI's rounding read as unsettled, so general controls use
 * [NockerlControlShape] instead.
 *
 * Expressed as `RoundedCornerShape(percent = 50)` (the single canonical pill
 * idiom) rather than an absolute `RoundedCornerShape(50.dp)`, so a pill always
 * tracks its own height regardless of size.
 */
val NockerlPillShape: Shape = RoundedCornerShape(percent = 50)

/**
 * A rounded rectangle with one corner straight-cut (chamfered) at 45°.
 *
 * Reproduces the mockup's `clip-path: polygon(...)` accents, e.g. the workspace
 * pill's chamfered top-left edge and the team card's clipped bottom-right corner.
 * Non-chamfered corners keep [cornerRadius]; the chamfered corner is replaced by
 * a single diagonal edge of length [chamfer].
 *
 * @property corner which corner to chamfer.
 * @property chamfer the diagonal cut size.
 * @property cornerRadius radius applied to the three un-chamfered corners.
 */
@Immutable
data class ChamferedCornerShape(
    val corner: Corner,
    val chamfer: Dp = NockerlChamfer,
    val cornerRadius: Dp = NockerlCardRadius,
) : Shape {
    /** Which corner of the rectangle to chamfer. */
    enum class Corner {
        /** Top-left corner. */
        TOP_LEFT,

        /** Top-right corner. */
        TOP_RIGHT,

        /** Bottom-right corner. */
        BOTTOM_RIGHT,

        /** Bottom-left corner. */
        BOTTOM_LEFT,
    }

    override fun createOutline(
        size: Size,
        layoutDirection: LayoutDirection,
        density: Density,
    ): Outline {
        val c = with(density) { chamfer.toPx() }.coerceAtMost(size.minDimension / 2f)
        val r = with(density) { cornerRadius.toPx() }.coerceAtMost(size.minDimension / 2f)
        val w = size.width
        val h = size.height

        val path =
            Path().apply {
                when (corner) {
                    Corner.TOP_LEFT -> {
                        moveTo(c, 0f)
                        lineTo(w - r, 0f)
                        quadraticTo(w, 0f, w, r)
                        lineTo(w, h - r)
                        quadraticTo(w, h, w - r, h)
                        lineTo(r, h)
                        quadraticTo(0f, h, 0f, h - r)
                        lineTo(0f, c)
                        close()
                    }

                    Corner.TOP_RIGHT -> {
                        moveTo(r, 0f)
                        lineTo(w - c, 0f)
                        lineTo(w, c)
                        lineTo(w, h - r)
                        quadraticTo(w, h, w - r, h)
                        lineTo(r, h)
                        quadraticTo(0f, h, 0f, h - r)
                        lineTo(0f, r)
                        quadraticTo(0f, 0f, r, 0f)
                        close()
                    }

                    Corner.BOTTOM_RIGHT -> {
                        moveTo(r, 0f)
                        lineTo(w - r, 0f)
                        quadraticTo(w, 0f, w, r)
                        lineTo(w, h - c)
                        lineTo(w - c, h)
                        lineTo(r, h)
                        quadraticTo(0f, h, 0f, h - r)
                        lineTo(0f, r)
                        quadraticTo(0f, 0f, r, 0f)
                        close()
                    }

                    Corner.BOTTOM_LEFT -> {
                        moveTo(r, 0f)
                        lineTo(w - r, 0f)
                        quadraticTo(w, 0f, w, r)
                        lineTo(w, h - r)
                        quadraticTo(w, h, w - r, h)
                        lineTo(c, h)
                        lineTo(0f, h - c)
                        lineTo(0f, r)
                        quadraticTo(0f, 0f, r, 0f)
                        close()
                    }
                }
            }
        return Outline.Generic(path)
    }
}

/**
 * Asymmetric "tail" bubble shape: a standard rounded rectangle with one corner
 * tightened to a small radius, pointing toward the speaker's avatar.
 *
 * Mirrors the mockup's assistant bubble (tightened top-left) and user bubble
 * (tightened top-right).
 *
 * @param tail which corner to tighten.
 * @param radius the radius for the three rounded corners.
 * @param tailRadius the tightened corner's radius.
 */
fun bubbleShape(
    tail: BubbleTail,
    radius: Dp = 20.dp,
    tailRadius: Dp = 6.dp,
): RoundedCornerShape =
    when (tail) {
        BubbleTail.TOP_LEFT ->
            RoundedCornerShape(
                topStart = tailRadius,
                topEnd = radius,
                bottomEnd = radius,
                bottomStart = radius,
            )

        BubbleTail.TOP_RIGHT ->
            RoundedCornerShape(
                topStart = radius,
                topEnd = tailRadius,
                bottomEnd = radius,
                bottomStart = radius,
            )
    }

/** Which corner carries a message bubble's tightened "tail". */
enum class BubbleTail {
    /** Tail toward a left-aligned avatar (assistant). */
    TOP_LEFT,

    /** Tail toward a right-aligned avatar (user). */
    TOP_RIGHT,
}
