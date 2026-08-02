package com.dizyx.nockerl.design.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * The **Nockerl mark**: the canonical three-peaks silhouette, EXACTLY as it ships
 * in the apps (Voice `NockerlLogo.swift`, Android `ic_nockerl_logo*.xml`, web
 * `NockerlLogo.tsx`): three OVERLAPPING triangles in three DISTINCT grayscale
 * shades (the shade difference gives the mark its layered, dimensional look; a
 * single flat fill is WRONG). Identical geometry on the `16 20 64 56` viewBox, a
 * `y = 72` baseline, drawn left → center → right (left behind, right in front).
 *
 * MONOCHROME GRAYSCALE, recolored per theme, NEVER cyan (law §11: cyan lives only
 * in the lockup's product word):
 * - on a DARK surface → LIGHT ink (#E5E5E5 / #FFFFFF / #CCCCCC)
 * - on a LIGHT surface → DARK ink (#555555 / #222222 / #777777)
 *
 * Default is theme-aware (inferred from the resolved `canvas` luminance); pass a
 * [tone] to force a ladder (e.g. a mark pinned to a known-dark tile).
 *
 * @param modifier outer modifier.
 * @param size the mark HEIGHT; width keeps the native 8:7 ratio.
 * @param tone force an ink ladder, or `null` (default) for theme-aware.
 * @param contentDescription the a11y name, or `null` when a sibling wordmark
 *   already names it (then the mark is decorative).
 */
@Composable
fun NockerlLogo(
    modifier: Modifier = Modifier,
    size: Dp = 24.dp,
    tone: NockerlLogoTone? = null,
    contentDescription: String? = "Nockerl",
) {
    val colors = LocalNockerlColors.current
    val resolved =
        tone ?: if (colors.canvas.luminance() < 0.5f) NockerlLogoTone.ON_DARK else NockerlLogoTone.ON_LIGHT
    val ink = resolved.ink()
    val width = size * (MARK_NATIVE_W / MARK_NATIVE_H)

    val name = contentDescription
    val semantics =
        if (name != null) {
            Modifier.semantics {
                this.contentDescription = name
                this.role = Role.Image
            }
        } else {
            Modifier
        }

    Canvas(modifier = modifier.then(semantics).size(width = width, height = size)) {
        val sx = this.size.width / MARK_NATIVE_W
        val sy = this.size.height / MARK_NATIVE_H

        // Map a viewBox point (origin 16,20) into canvas space.
        fun pt(
            x: Float,
            y: Float,
        ) = Offset((x - 16f) * sx, (y - 20f) * sy)

        fun tri(
            a: Offset,
            b: Offset,
            c: Offset,
        ) = Path().apply {
            moveTo(a.x, a.y)
            lineTo(b.x, b.y)
            lineTo(c.x, c.y)
            close()
        }
        // left → center → right (paint order = depth order).
        drawPath(tri(pt(20f, 72f), pt(36f, 36f), pt(52f, 72f)), ink.first)
        drawPath(tri(pt(32f, 72f), pt(48f, 24f), pt(64f, 72f)), ink.second)
        drawPath(tri(pt(44f, 72f), pt(60f, 32f), pt(76f, 72f)), ink.third)
    }
}

/** The forced ink ladder, named by the surface the mark sits ON. */
enum class NockerlLogoTone {
    /** For a DARK surface: LIGHT ink. */
    ON_DARK,

    /** For a LIGHT surface: DARK ink. */
    ON_LIGHT,
    ;

    /** The three peak shades (left, center, right) for this ladder. */
    fun ink(): Triple<Color, Color, Color> =
        when (this) {
            ON_DARK -> Triple(Color(0xFFE5E5E5), Color(0xFFFFFFFF), Color(0xFFCCCCCC))
            ON_LIGHT -> Triple(Color(0xFF555555), Color(0xFF222222), Color(0xFF777777))
        }
}

/** Native mark width (viewBox is `16 20 64 56` → 64×56, an 8:7 ratio). */
private const val MARK_NATIVE_W = 64f

/** Native mark height. */
private const val MARK_NATIVE_H = 56f
