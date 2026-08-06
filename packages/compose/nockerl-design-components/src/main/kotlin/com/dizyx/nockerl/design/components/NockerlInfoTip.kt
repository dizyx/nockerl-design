package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Popup
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlPanelShape
import com.dizyx.nockerl.design.tokens.NockerlSize
import com.dizyx.nockerl.design.tokens.NockerlSurface

/**
 * The **info tip**: a themed informational popover behind a small ⓘ trigger
 * and the settings-surface companion (it rides
 * [NockerlFormSection]'s `headerAccessory` slot). Voice's InfoTip is the input;
 * this is the fresh-spec'd system piece:
 *
 * - **Trigger:** a flat ⓘ glyph [NockerlIconButton], INTERACTIVE, so it wears
 *   the plain interactive treatment (the icon-interactivity canon: inset styling
 *   is reserved for informational, non-interactive marks, never a trigger).
 * - **Panel:** a lifted popover card on the `cardSurface2` plane (L3, the
 *   popover rung of the elevation ladder), panel radius, hairline edge, clamped
 *   at the `size.container.md` token (Voice's raw 250px, tokenized).
 *
 * @param text the informational body.
 * @param modifier outer modifier (wraps the trigger).
 * @param title optional short heading above the body.
 * @param contentDescription the trigger's a11y name (default "More information").
 */
@Composable
fun NockerlInfoTip(
    text: String,
    modifier: Modifier = Modifier,
    title: String? = null,
    contentDescription: String = "More information",
) {
    val colors = LocalNockerlColors.current
    var open by remember { mutableStateOf(false) }

    Box(modifier = modifier) {
        NockerlIconButton(
            icon = Icons.Filled.Info,
            contentDescription = contentDescription,
            onClick = { open = !open },
            tint = colors.onCardMuted,
            size = 28.dp,
            iconSize = 16.dp,
        )
        if (open) {
            Popup(onDismissRequest = { open = false }) {
                NockerlInfoTipPanel(text = text, title = title)
            }
        }
    }
}

/**
 * The info tip's **panel**: the themed popover card [NockerlInfoTip] opens.
 * Public so custom anchoring hosts (and static captures, a [Popup] renders in
 * a separate window with no stable golden frame; the DialogCard precedent) can
 * compose the exact same panel.
 *
 * @param text the informational body.
 * @param modifier outer modifier.
 * @param title optional short heading above the body.
 */
@Composable
fun NockerlInfoTipPanel(
    text: String,
    modifier: Modifier = Modifier,
    title: String? = null,
) {
    val colors = LocalNockerlColors.current
    NockerlSurface(
        modifier = modifier.width(NockerlSize.containerMd),
        shape = NockerlPanelShape,
        // The popover plane: one step above the card (cardSurface2), on the
        // popover rung (L3) with the neutral hairline edge.
        color = colors.cardSurface2,
        elevation = NockerlElevation.Level3,
        border = colors.cardHairline,
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement =
                androidx.compose.foundation.layout.Arrangement
                    .spacedBy(4.dp),
        ) {
            if (title != null) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium,
                    color = colors.onCard,
                )
            }
            Text(
                text = text,
                style = MaterialTheme.typography.bodySmall,
                color = colors.onCardMuted,
            )
        }
    }
}
