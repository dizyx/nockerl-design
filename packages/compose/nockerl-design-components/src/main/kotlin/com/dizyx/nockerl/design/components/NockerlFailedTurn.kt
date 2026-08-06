package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlPanelShape
import com.dizyx.nockerl.design.tokens.NockerlSurface

/**
 * The **failed turn**: the ONE calm failure-state grammar for chat surfaces. It
 * replaces the old all-red filled failure cards (ChatBubble delivery-failed,
 * AgentMessage stream-failed, ToolCallCard error) with a single quiet treatment
 * derived from the alert-family canon:
 *
 * - **The Banner inline-alert anatomy, which supersedes the r4 recessed well
 *   AND the r5 tinted lift.** A NEUTRAL
 *   `cardSurface1` plane, never a red/pink tint fill (the r5 5-7% tint read
 *   PINK on Light), LIFTED by the banner material (neutral drop shadow + top
 *   catch-light, law §1/§2), traced by the banner's whisper-red border (the
 *   canon 22% mix).
 * - **The INSET error disc** ([NockerlStatusDisc] `inset`) leads: it is sunk,
 *   informational and non-interactive, TOP-aligned to the first text line.
 * - **Just "failed" + retry.** A short [title] in the error hue (sentence case,
 *   never shouting caps), an optional [detail] line in normal ink, and an
 *   optional ghost [onRetry] action. No "couldn't-send / not-delivered" pile-up.
 *
 * The same component serves all three hosts by varying [title]/[detail]; the
 * praised same-sender grouping is unaffected (this is the turn's body, not its
 * envelope).
 *
 * @param modifier outer modifier (typically `fillMaxWidth()`).
 * @param title the short failure label (default "Failed").
 * @param detail an optional one-line explanation ("The gateway returned a 502.").
 * @param onRetry optional retry callback; renders a trailing ghost action.
 * @param retryLabel the retry action label (default "Retry").
 */
@Composable
fun NockerlFailedTurn(
    modifier: Modifier = Modifier,
    title: String = "Failed",
    detail: String? = null,
    onRetry: (() -> Unit)? = null,
    retryLabel: String = "Retry",
) {
    val colors = LocalNockerlColors.current
    val danger = NockerlAlertIntent.DANGER.color(colors)

    NockerlSurface(
        modifier = modifier,
        shape = NockerlPanelShape,
        // NEUTRAL plane, NEVER a red/pink tint fill (the r5 5-7% tint read PINK on
        // Light). The banner material supplies
        // the lift: neutral drop shadow + top catch-light.
        color = colors.cardSurface1,
        elevation = NockerlElevation.Level2,
        // The banner's whisper-red border: the canon 22% mix, same as Banner DANGER.
        border = lerp(colors.cardHairline, danger, FAILED_BORDER_MIX),
    ) {
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top,
        ) {
            // The INSET error disc: sunk, informational, non-interactive (the
            // banner-inline-alert anatomy; never a raised coin here).
            NockerlStatusDisc(intent = NockerlAlertIntent.DANGER, inset = true)

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Medium,
                    color = danger,
                )
                if (detail != null) {
                    Text(
                        text = detail,
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.onCardMuted,
                    )
                }
            }

            if (onRetry != null) {
                // Retry = the quiet GHOST action (banner grammar). The red state
                // already lives on the border + disc + title; no second red block.
                NockerlButton(
                    text = retryLabel,
                    onClick = onRetry,
                    variant = NockerlButtonVariant.GHOST,
                    size = NockerlButtonSize.SM,
                )
            }
        }
    }
}

/** Hairline→danger border mix: the Banner inline-alert's canon 22% whisper. */
private const val FAILED_BORDER_MIX = 0.22f
