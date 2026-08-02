package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlPanelShape
import com.dizyx.nockerl.design.tokens.NockerlSize
import com.dizyx.nockerl.design.tokens.NockerlSurface

/**
 * The **banner**: an inline alert that pushes content (never floats). A LIFTED
 * card (banner.mdx: solid `cardSurface1`, panel radius, level-2 neutral drop +
 * catch-light via the shared [NockerlSurface] material) led by the
 * [NockerlStatusDisc] coin. Status lives in the disc, never a left rail
 * (design-laws §6). The border is a whisper of the intent: the hairline nudged
 * 22% toward the intent hue.
 *
 * A11y: warning/danger banners announce assertively; the rest politely. Color is
 * never alone. Disc + (optional) title + message carry the state (law §13).
 * Dismiss/action render only when their callbacks are provided and are real
 * focusable controls.
 *
 * @param message the banner body (required: it IS the accessible text).
 * @param modifier outer modifier (banners typically `fillMaxWidth()`).
 * @param intent the alert intent (defaults to [NockerlAlertIntent.INFO]).
 * @param title optional short title, intent-colored at the 500 cap.
 * @param showIcon render the leading status disc (default true).
 * @param actionLabel optional inline action label (renders a ghost button).
 * @param onAction invoked when the action is tapped.
 * @param onDismiss when non-null, a dismiss ✕ renders; the HOST removes the
 *   banner (and owns any exit animation, interpolatable props only, law §7).
 */
@Composable
fun NockerlBanner(
    message: String,
    modifier: Modifier = Modifier,
    intent: NockerlAlertIntent = NockerlAlertIntent.INFO,
    title: String? = null,
    showIcon: Boolean = true,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    onDismiss: (() -> Unit)? = null,
) {
    val colors = LocalNockerlColors.current
    val hue = intent.color(colors)
    val assertive = intent == NockerlAlertIntent.WARNING || intent == NockerlAlertIntent.DANGER

    // Wide-surface cap: the banner clamps at size.chat.bannerMax and
    // CENTERS on wide surfaces; an alert never stretches edge-to-edge.
    Box(modifier = modifier, contentAlignment = Alignment.TopCenter) {
        NockerlSurface(
            modifier =
                Modifier
                    .widthIn(max = NockerlSize.chatBannerMax)
                    .fillMaxWidth()
                    .semantics {
                        liveRegion = if (assertive) LiveRegionMode.Assertive else LiveRegionMode.Polite
                    },
            shape = NockerlPanelShape,
            color = colors.cardSurface1,
            elevation = NockerlElevation.Level2,
            // A whisper of the intent on the hairline (the canon 22% nudge).
            border = lerp(colors.cardHairline, hue, BANNER_BORDER_MIX),
        ) {
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (showIcon) {
                    NockerlStatusDisc(intent = intent)
                }
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    if (title != null) {
                        Text(
                            text = title,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium, // 500 is the bold cap (law §11)
                            color = hue,
                        )
                    }
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (title != null) colors.onCardMuted else colors.onCard,
                    )
                }
                if (actionLabel != null && onAction != null) {
                    NockerlButton(
                        text = actionLabel,
                        onClick = onAction,
                        variant = NockerlButtonVariant.GHOST,
                    )
                }
                if (onDismiss != null) {
                    NockerlIconButton(
                        icon = Icons.Filled.Close,
                        contentDescription = "Dismiss",
                        onClick = onDismiss,
                    )
                }
            }
        }
    }
}

/** The hairline→intent border mix for banners (canon 22%). */
private const val BANNER_BORDER_MIX = 0.22f
