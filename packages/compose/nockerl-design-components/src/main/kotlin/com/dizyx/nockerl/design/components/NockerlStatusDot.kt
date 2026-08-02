package com.dizyx.nockerl.design.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlColors
import com.dizyx.nockerl.design.tokens.NockerlMotionDuration

/**
 * The standardized **status dot**: a small filled disc whose hue names a state,
 * optionally pulsing. Unifies the raw `Box + PulsingDot` pattern client #1
 * re-derives at four call sites into one wrapper (status-dot.mdx).
 *
 * Two hue ladders, mirroring the shipped Swift `NockerlStatusDot` exactly:
 * - the semantic ladder ([NockerlStatusDotStatus] → status tokens), and
 * - a raw palette color (the session-dot idiom: pass [NockerlColors.dotStreaming],
 *   [NockerlColors.dotUnread], …, but never a literal).
 *
 * Pulse (design-laws §7): animates ALPHA only (1.0 ↔ 0.3) at the RATIFIED 800ms
 * motion value (r2, B6; [tween] + [RepeatMode.Reverse]). The web-only "ping" ring
 * is DROPPED by the same ruling. No platform implements it.
 *
 * A11y (law §13): state is never color-alone; pass a [contentDescription] (or use
 * the semantic overload, which derives one from the status name).
 */
@Composable
fun NockerlStatusDot(
    color: Color,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    size: Dp = NockerlStatusDotDefaults.LoudSize,
    pulse: Boolean = false,
) {
    val alpha =
        if (pulse) {
            val transition = rememberInfiniteTransition(label = "nockerlStatusDot")
            val pulsing by transition.animateFloat(
                initialValue = 1f,
                targetValue = NockerlStatusDotDefaults.PULSE_FLOOR_ALPHA,
                animationSpec =
                    infiniteRepeatable(
                        animation = tween(durationMillis = NockerlStatusDotDefaults.PULSE_MS),
                        repeatMode = RepeatMode.Reverse,
                    ),
                label = "nockerlStatusDotAlpha",
            )
            pulsing
        } else {
            1f
        }

    // Captured under a distinct name: inside the semantics lambda the receiver's own
    // `contentDescription` property shadows the parameter (the classic apply-style
    // self-assignment trap: reading that property throws at runtime).
    val accessibleName = contentDescription
    val semantics =
        if (accessibleName != null) {
            Modifier.semantics { this.contentDescription = accessibleName }
        } else {
            Modifier
        }

    Box(
        modifier =
            modifier
                .then(semantics)
                .size(size)
                .alpha(alpha)
                .clip(CircleShape)
                .background(color),
    )
}

/**
 * Semantic-ladder overload: hue AND the default accessible name come from [status].
 *
 * @param status the ladder step.
 * @param modifier outer modifier.
 * @param contentDescription override the derived accessible name.
 * @param size disc diameter: [NockerlStatusDotDefaults.LoudSize] (8dp, default) or
 *   [NockerlStatusDotDefaults.QuietSize] (6dp, ambient).
 * @param pulse animate the live-state alpha pulse.
 */
@Composable
fun NockerlStatusDot(
    status: NockerlStatusDotStatus,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
    size: Dp = NockerlStatusDotDefaults.LoudSize,
    pulse: Boolean = false,
) {
    NockerlStatusDot(
        color = status.color(LocalNockerlColors.current),
        contentDescription = contentDescription ?: status.accessibleName,
        modifier = modifier,
        size = size,
        pulse = pulse,
    )
}

/** The semantic status ladder (mirrors the Swift `NockerlStatusDotStatus` 1:1). */
enum class NockerlStatusDotStatus(
    /** The default accessible name when the caller supplies none. */
    val accessibleName: String,
) {
    /** Healthy / complete (`statusSuccess`). */
    SUCCESS("Success"),

    /** Needs attention (`statusWarning`). */
    WARNING("Warning"),

    /** Failed / blocked (`statusError`). */
    ERROR("Error"),

    /** Informational (`statusInfo`). */
    INFO("Info"),

    /** Inactive / unknown (`dotIdle`). */
    NEUTRAL("Neutral"),
    ;

    /** Resolve the ladder step to its palette slot. */
    fun color(colors: NockerlColors): Color =
        when (this) {
            SUCCESS -> colors.statusSuccess
            WARNING -> colors.statusWarning
            ERROR -> colors.statusError
            INFO -> colors.statusInfo
            NEUTRAL -> colors.dotIdle
        }
}

/** Shared status-dot constants (sizes + the pinned pulse contract). */
object NockerlStatusDotDefaults {
    /** Loud 8dp disc: live / attention states (the default). */
    val LoudSize: Dp = 8.dp

    /** Quiet 6dp disc: idle / ambient states. */
    val QuietSize: Dp = 6.dp

    /** Pulse alpha floor (1.0 → 0.3, interpolatable only, law §7). */
    const val PULSE_FLOOR_ALPHA = 0.3f

    /** Pulse half-period: the `motion.duration.pulse` TOKEN (B6 / r3 emitted). */
    val PULSE_MS = NockerlMotionDuration.pulseMs
}
