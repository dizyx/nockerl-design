package com.dizyx.nockerl.design.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlPillShape

/**
 * The standardized **chip**: a filled keycap **pill** (the session-chip /
 * filter-chip idiom). One of the two surfaces that deliberately keep the ~50%
 * [NockerlPillShape] (the other is the input bar); everything else uses the
 * 12dp control radius. This contrast (pills for chips + input, the control
 * radius for buttons) is the point Design Review #1 locked in.
 *
 * Two states:
 * - **selected**: a solid accentPrimary fill with a contrast-picked label (the
 *   active session keycap).
 * - **unselected**: a soft accentPrimarySoft fill with a cyan label, so the row
 *   reads as a cohesive chip strip while the selected one dominates.
 *
 * Color flows entirely from the palette; the shape flows from [NockerlPillShape].
 *
 * @param text the chip label.
 * @param onClick invoked on tap.
 * @param modifier outer modifier.
 * @param selected whether this chip is the active selection.
 * @param enabled when `false`, the chip is dimmed and non-interactive.
 * @param contentPadding inner padding (defaults to a compact keycap padding).
 * @param leadingContent optional leading content (e.g. a status dot) before the label.
 * @param onRemove when non-null, the chip is REMOVABLE: a trailing ✕ renders with
 *   its own tap target (the ratified chip contract is the capability UNION
 *   of selectable, removable, and disabled, on every platform).
 */
@Composable
fun NockerlChip(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    enabled: Boolean = true,
    contentPadding: PaddingValues = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
    leadingContent: (@Composable () -> Unit)? = null,
    onRemove: (() -> Unit)? = null,
) {
    val colors = LocalNockerlColors.current
    val fill = if (selected) colors.accentPrimary else colors.accentPrimarySoft
    val content = if (selected) pickOnAccent(colors.accentPrimary) else colors.accentPrimary
    val resolvedFill = if (enabled) fill else fill.copy(alpha = fill.alpha * DISABLED_ALPHA)
    val resolvedContent = if (enabled) content else content.copy(alpha = DISABLED_ALPHA)

    NockerlControlContainer(
        onClick = onClick,
        enabled = enabled,
        fill = resolvedFill,
        shape = NockerlPillShape,
        // Ratified: the SELECTED solid-accent keycap wears the top catch-light.
        litHighlight = selected && enabled,
        modifier = modifier,
    ) {
        Row(
            modifier = Modifier.padding(contentPadding),
            horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            leadingContent?.invoke()
            Text(
                text = text,
                style = NockerlControlTextStyle,
                color = resolvedContent,
            )
            if (onRemove != null) {
                Icon(
                    imageVector = Icons.Filled.Close,
                    contentDescription = "Remove $text",
                    tint = resolvedContent,
                    modifier =
                        Modifier
                            .size(16.dp)
                            .clickable(enabled = enabled, onClick = onRemove),
                )
            }
        }
    }
}
