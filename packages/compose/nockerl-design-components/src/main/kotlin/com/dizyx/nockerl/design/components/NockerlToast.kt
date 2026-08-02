package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
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
import com.dizyx.nockerl.design.tokens.NockerlSurface

/**
 * The **toast**: the transient floating notification CARD (toast.mdx). One tier
 * above the banner: `cardSurface2` fill, panel radius, the LEVEL-4 sheet drop
 * ([NockerlElevation.Level4], it floats over everything) + catch-light, led by
 * the [NockerlStatusDisc] coin with the intent whispered onto the hairline (20%).
 *
 * SCOPE is the view only: the countdown ring, pause-on-focus, and entry/exit
 * motion are HOST machinery (a toast host needs an overlay root the library
 * cannot own), but the CONTRACT is ratified (r2, A2) and ships here:
 * [NockerlToastDuration] (short / base / long / persistent) and
 * [NockerlToastDefaults.STACK_MAX] (3, newest on top). A host consumes both.
 *
 * A11y: danger toasts announce assertively; the rest politely (aria-live
 * parity). Action + dismiss are real focusable controls.
 *
 * @param message the toast body (required: it IS the accessible text).
 * @param modifier outer modifier.
 * @param intent the alert intent (defaults to [NockerlAlertIntent.INFO]).
 * @param title optional short title, intent-colored at the 500 cap.
 * @param showIcon render the leading status disc (default true).
 * @param actionLabel optional inline action (ghost button; the host dismisses
 *   after invoking).
 * @param onAction invoked when the action is tapped.
 * @param onDismiss when non-null, a dismiss ✕ renders (the host removes).
 */
@Composable
fun NockerlToast(
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
    val assertive = intent == NockerlAlertIntent.DANGER

    NockerlSurface(
        modifier =
            modifier.semantics {
                liveRegion = if (assertive) LiveRegionMode.Assertive else LiveRegionMode.Polite
            },
        shape = NockerlPanelShape,
        color = colors.cardSurface2,
        elevation = NockerlElevation.Level4,
        // A whisper of the intent on the hairline (the canon 20% nudge).
        border = lerp(colors.cardHairline, hue, TOAST_BORDER_MIX),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (showIcon) {
                NockerlStatusDisc(intent = intent)
            }
            Column(
                modifier = Modifier.weight(1f, fill = false),
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

/**
 * The RATIFIED toast duration vocabulary (r2, A2). `BASE` is the web-shipped
 * 5000ms default; `SHORT`/`LONG` are the ramp around it; `PERSISTENT` never
 * times out (the host shows the pin marker instead of the countdown ring).
 */
enum class NockerlToastDuration(
    /** Timeout in milliseconds, or `null` for persistent. */
    val millis: Long?,
) {
    /** Quick confirmations ("Saved."). */
    SHORT(3_000),

    /** The default (the web-shipped 5000ms). */
    BASE(5_000),

    /** Messages that carry an action worth reading. */
    LONG(8_000),

    /** Never times out: waits for an explicit dismiss. */
    PERSISTENT(null),
}

/** Ratified toast-host constants (r2, A2). */
object NockerlToastDefaults {
    /** Maximum simultaneously-visible toasts: newest on top, older drop. */
    const val STACK_MAX = 3
}

/** The hairline→intent border mix for toasts (canon 20%). */
private const val TOAST_BORDER_MIX = 0.2f
