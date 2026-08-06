package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.NockerlControlShape
import com.dizyx.nockerl.design.tokens.nockerlLitSurface

/**
 * Shared internals for the `core/ui` control family
 * ([NockerlButton], [NockerlIconButton], [NockerlChip], [NockerlSegmented],
 * [NockerlSettingsRow]). Centralizing the touch-target sizing, the
 * fill+border+clip plumbing, the disabled-alpha, the on-accent contrast rule,
 * and the control text style keeps every control consistent and the public
 * files small (500-line limit).
 *
 * Everything here is `internal`: these are implementation details of the
 * control set, not part of its public API.
 */

/** Alpha multiplier applied to a control's colors when it is disabled. */
internal const val DISABLED_ALPHA = 0.38f

/** Minimum touch-target dimension (Material a11y guidance). */
internal val MinTouchTarget: Dp = 40.dp

/** The shared label style for controls (Space Grotesk, medium weight). */
internal val NockerlControlTextStyle: TextStyle
    @Composable get() = MaterialTheme.typography.labelLarge

/**
 * Choose a readable on-color (near-white or near-black) for a solid accent fill,
 * by luminance, mirrors the theme's own `pickOn` so a filled accent button
 * always has contrast regardless of the active palette's accent hue.
 *
 * @param background the accent fill color.
 */
internal fun pickOnAccent(background: Color): Color =
    if (background.luminance() > 0.55f) Color(0xFF1A1A1A) else Color(0xFFF7F7F7)

/**
 * The shared control container: a clipped [Box] carrying the control silhouette
 * (defaults to [NockerlControlShape]), a solid [fill], an optional hairline
 * [border], a click, and a minimum touch target. Every control composable
 * builds on this so the clip/fill/border/min-size grammar lives in one place.
 *
 * Color resolution (variant fills, disabled alpha) stays with the caller. This
 * only paints what it is handed.
 *
 * @param onClick invoked on tap (ignored when [enabled] is `false`).
 * @param fill the resting background fill.
 * @param modifier outer modifier (size, weight, alignment).
 * @param enabled when `false`, clicks are dropped.
 * @param shape the silhouette for the clip + border (defaults to the control radius).
 * @param border optional hairline color, or `null` for no border.
 * @param borderWidth the border stroke width.
 * @param minWidth minimum width of the touch target.
 * @param minHeight minimum height of the touch target.
 * @param contentAlignment alignment of [content] within the box.
 * @param content the control's inner content (label row, icon, etc.).
 */
@Composable
internal fun NockerlControlContainer(
    onClick: () -> Unit,
    fill: Color,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    shape: Shape = NockerlControlShape,
    border: Color? = null,
    borderWidth: Dp = 1.dp,
    minWidth: Dp = MinTouchTarget,
    minHeight: Dp = MinTouchTarget,
    litHighlight: Boolean = false,
    contentAlignment: Alignment = Alignment.Center,
    content: @Composable BoxScope.() -> Unit,
) {
    val clipped =
        modifier
            .defaultMinSize(minWidth = minWidth, minHeight = minHeight)
            .clip(shape)
            .background(color = fill, shape = shape)
    val bordered =
        if (border != null) clipped.border(borderWidth, border, shape) else clipped
    // Ratified solid-fill treatment (the match-web-exactly ruling): the
    // catch-light is the SAME `surfaceHighlight` token the web binds: one identical
    // value on every platform, no per-platform highlight drift.
    val lit = if (litHighlight) bordered.nockerlLitSurface(shape = shape) else bordered
    Box(
        modifier = lit.clickable(enabled = enabled, onClick = onClick),
        contentAlignment = contentAlignment,
        content = content,
    )
}

/**
 * Internal convenience: a [RoundedCornerShape] at an arbitrary [radius]. Only
 * used where a control legitimately needs a *different* corner than the shared
 * control radius (e.g. a segmented control's inner segment that nests inside the
 * track), still routed through here so no call-site writes a bare
 * `RoundedCornerShape(n.dp)`.
 *
 * @param radius the corner radius.
 */
internal fun nockerlRoundedShape(radius: Dp): Shape = RoundedCornerShape(radius)
