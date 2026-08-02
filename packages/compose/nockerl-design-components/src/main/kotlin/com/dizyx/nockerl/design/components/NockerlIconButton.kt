package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlControlShape

/**
 * The icon-button style for [NockerlIconButton]. Two idioms only:
 * - [PLAIN]: a transparent 40dp tappable glyph (toolbar / inline actions).
 * - [FILLED_CIRCLE]: a solid accent **circle**, reserved for the prominent
 *   send/stop slot (the one true-circle affordance Design Review #1 kept).
 */
enum class NockerlIconButtonStyle {
    /** Transparent square-radius target: a quiet inline icon action. */
    PLAIN,

    /** Solid accent circle: the prominent send/stop slot. */
    FILLED_CIRCLE,
}

/**
 * A single, token-driven icon button: the one icon-affordance vocabulary for
 * the app.
 *
 * - [NockerlIconButtonStyle.PLAIN]: a transparent 40dp touch target with a
 *   neutral onCanvas glyph (or a caller [tint]); corners use the shared control
 *   radius ([NockerlControlShape]) so any hover/press background matches every
 *   other control.
 * - [NockerlIconButtonStyle.FILLED_CIRCLE]: a solid [accent] circle with a
 *   contrast-picked glyph, the send / stop / primary-action slot. This is the
 *   *only* place a control is a true [CircleShape]; the accent defaults to the
 *   palette's engine-cloud cyan so it matches the active-session chrome.
 *
 * @param icon the glyph to render.
 * @param contentDescription accessibility label (use `null` only when a sibling
 *   label already names the action).
 * @param onClick invoked on tap.
 * @param modifier outer modifier.
 * @param style the icon-button idiom (defaults to [NockerlIconButtonStyle.PLAIN]).
 * @param enabled when `false`, the button is dimmed and non-interactive.
 * @param accent the circle fill for [NockerlIconButtonStyle.FILLED_CIRCLE]
 *   (defaults to the engine-cloud accent); ignored for [NockerlIconButtonStyle.PLAIN].
 * @param tint glyph color override for [NockerlIconButtonStyle.PLAIN]; ignored
 *   for the filled circle (which always contrast-picks against [accent]).
 * @param size the touch-target dimension (defaults to 40dp).
 * @param iconSize the rendered glyph size.
 */
@Composable
fun NockerlIconButton(
    icon: ImageVector,
    contentDescription: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    style: NockerlIconButtonStyle = NockerlIconButtonStyle.PLAIN,
    enabled: Boolean = true,
    accent: Color = LocalNockerlColors.current.engineCloud,
    tint: Color = LocalNockerlColors.current.onCanvas,
    size: Dp = 40.dp,
    iconSize: Dp = 20.dp,
) {
    val isCircle = style == NockerlIconButtonStyle.FILLED_CIRCLE
    val fill = if (isCircle) accent else Color.Transparent
    val glyph = if (isCircle) pickOnAccent(accent) else tint
    val resolvedFill = if (enabled) fill else fill.copy(alpha = fill.alpha * DISABLED_ALPHA)
    val resolvedGlyph = if (enabled) glyph else glyph.copy(alpha = DISABLED_ALPHA)

    NockerlControlContainer(
        onClick = onClick,
        enabled = enabled,
        fill = resolvedFill,
        shape = if (isCircle) CircleShape else NockerlControlShape,
        minWidth = size,
        minHeight = size,
        modifier = modifier.size(size),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = resolvedGlyph,
            modifier = Modifier.size(iconSize),
        )
    }
}
