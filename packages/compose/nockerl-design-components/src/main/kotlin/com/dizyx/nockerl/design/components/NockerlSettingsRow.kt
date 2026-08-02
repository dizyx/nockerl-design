package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlColors
import com.dizyx.nockerl.design.tokens.NockerlControlShape

/**
 * A simple **tappable settings / list row**: a label, an optional current
 * [value], and optional [trailingContent], on the shared control silhouette
 * ([NockerlControlShape]) with a hairline border. The standardized version of
 * the ad-hoc "outlined-button-as-row" pattern, so settings and list rows across
 * an app share one geometry, one border, and one disabled treatment.
 *
 * All colors flow from the palette ([NockerlColors.cardSurface1],
 * [NockerlColors.cardHairline], etc.); the corner flows from the control radius.
 *
 * @param label the primary row label.
 * @param onClick invoked on tap.
 * @param modifier outer modifier (rows are typically `Modifier.fillMaxWidth()`).
 * @param value optional secondary value text shown under the [label].
 * @param enabled when `false`, the row is dimmed and non-interactive.
 * @param contentPadding inner padding around the row content.
 * @param trailingContent optional trailing content (chevron, switch, value chip)
 *   aligned to the row's end.
 */
@Composable
fun NockerlSettingsRow(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    value: String? = null,
    enabled: Boolean = true,
    contentPadding: PaddingValues = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
    trailingContent: (@Composable () -> Unit)? = null,
) {
    val colors = LocalNockerlColors.current
    val labelColor =
        if (enabled) colors.onCard else colors.onCard.copy(alpha = DISABLED_ALPHA)
    val valueColor =
        if (enabled) colors.onCardMuted else colors.onCardMuted.copy(alpha = DISABLED_ALPHA)

    NockerlControlContainer(
        onClick = onClick,
        enabled = enabled,
        fill = colors.cardSurface1,
        border = colors.cardHairline,
        contentAlignment = Alignment.CenterStart,
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(contentPadding),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyMedium,
                    color = labelColor,
                )
                if (value != null) {
                    Text(
                        text = value,
                        style = MaterialTheme.typography.labelMedium,
                        color = valueColor,
                    )
                }
            }
            trailingContent?.invoke()
        }
    }
}
