package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * The **empty state** is the centered placeholder for an otherwise-empty region
 * (a whole list / sheet / thread): the ratified INSET-icon mark ([NockerlInsetIcon])
 * over a title over an optional description over an optional action. The FIRST
 * host of the inset-icon canon.
 *
 * The mark SINKS: it is informational (law), never a lifted glowing badge. The
 * title carries the meaning, so the mark itself is decorative (no a11y name).
 * Copy is centered on the token vertical rhythm.
 *
 * @param icon the informational glyph (rendered in the inset well).
 * @param title the headline ("No sessions yet").
 * @param modifier outer modifier.
 * @param description an optional supporting line.
 * @param tone the inset-well tint (default neutral; brand for first-run, error
 *   for failure states).
 * @param action an optional trailing action slot (pass a [NockerlButton]).
 */
@Composable
fun NockerlEmptyState(
    icon: ImageVector,
    title: String,
    modifier: Modifier = Modifier,
    description: String? = null,
    tone: NockerlInsetIconTone = NockerlInsetIconTone.NEUTRAL,
    action: (@Composable () -> Unit)? = null,
) {
    val colors = LocalNockerlColors.current

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Decorative: the title carries the accessible meaning (law §13).
        NockerlInsetIcon(icon = icon, contentDescription = null, tone = tone)

        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            color = colors.onCard,
            textAlign = TextAlign.Center,
        )

        if (description != null) {
            Text(
                text = description,
                style = MaterialTheme.typography.bodyMedium,
                color = colors.onCardMuted,
                textAlign = TextAlign.Center,
            )
        }

        if (action != null) {
            Column(
                modifier = Modifier.padding(top = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                action()
            }
        }
    }
}
