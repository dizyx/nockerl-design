package com.dizyx.nockerl.design.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import kotlinx.coroutines.launch

/** Resting scale of a popped element (no press). */
private const val POP_REST_SCALE = 1f

/** Scale the element dips to at the bottom of the long-press pulse. */
private const val POP_DIP_SCALE = 0.96f

/** Duration (ms) of each half of the scale pulse (down, then back up). */
private const val POP_SCALE_HALF_MS = 110

/** Duration (ms) of the radial ripple's expand-and-fade. */
private const val POP_RIPPLE_MS = 420

/** Peak alpha of the radial ripple bubble at the touch point. */
private const val POP_RIPPLE_ALPHA = 0.28f

/**
 * Radius the ripple grows to, as a multiple of the element's longest side. It
 * sits a little over 1 so the bubble blooms slightly past the element's bounds
 * before it fades, reading as an outward "pop" rather than a contained fill.
 */
private const val POP_RIPPLE_RADIUS_FACTOR = 1.15f

/**
 * Shared "you long-pressed this" affordance: a brief scale pulse plus an
 * expanding translucent radial bubble that blooms from the touch point and
 * fades out, with an optional short haptic.
 *
 * The one long-press feedback for pressable Nockerl chrome (ratified from
 * client #1's session keycaps and input-bar mic/send toggle), pulled into one
 * reusable [Modifier] so the gesture always *looks* acknowledged, not just
 * silently handled. A normal tap is routed to [onTap]; the press-down/up drives
 * the scale pulse so the element also feels physical under the finger.
 *
 * The ripple is drawn on top of the element's own content via [drawWithContent]
 * (no extra layout node), tinted with the palette accent so it matches the
 * floating-chrome language. The scale runs on a [graphicsLayer] so it never
 * triggers relayout.
 *
 * @param onLongPress invoked once the long-press is recognized. It fires the
 *   pop AND whatever the caller wants to open (e.g. a context menu / mode
 *   toggle).
 * @param enabled when `false`, no gestures are detected and no feedback plays.
 * @param onTap invoked on a normal tap (the element's primary action).
 * @param rippleColor tint of the radial bubble (defaults to the brand accent).
 * @param haptic whether to fire a [HapticFeedbackType.LongPress] pulse when the
 *   long-press is recognized.
 */
fun Modifier.longPressPop(
    onLongPress: () -> Unit,
    enabled: Boolean = true,
    onTap: (() -> Unit)? = null,
    rippleColor: Color? = null,
    haptic: Boolean = true,
): Modifier =
    composed {
        if (!enabled) return@composed this

        val scope = rememberCoroutineScope()
        val haptics = LocalHapticFeedback.current
        val accent = rippleColor ?: LocalNockerlColors.current.accentPrimary

        // Scale pulse: an Animatable so the dip + rebound can interrupt cleanly
        // if the element is pressed again mid-animation.
        val scale = remember { Animatable(POP_REST_SCALE) }

        // Ripple state: origin in the element's local pixel space, plus a 0→1
        // progress that both expands the radius and fades the alpha.
        var rippleOrigin by remember { mutableStateOf<Offset?>(null) }
        val rippleProgress = remember { Animatable(0f) }

        fun pulseScale() {
            scope.launch {
                scale.animateTo(POP_DIP_SCALE, tween(POP_SCALE_HALF_MS))
                scale.animateTo(POP_REST_SCALE, tween(POP_SCALE_HALF_MS))
            }
        }

        fun playRipple(origin: Offset) {
            rippleOrigin = origin
            scope.launch {
                rippleProgress.snapTo(0f)
                rippleProgress.animateTo(1f, tween(POP_RIPPLE_MS, easing = LinearOutSlowInEasing))
                rippleOrigin = null
            }
        }

        this
            .graphicsLayer {
                scaleX = scale.value
                scaleY = scale.value
            }.drawWithContent {
                drawContent()
                val origin = rippleOrigin ?: return@drawWithContent
                val progress = rippleProgress.value
                if (progress <= 0f) return@drawWithContent
                val maxRadius = maxOf(size.width, size.height) * POP_RIPPLE_RADIUS_FACTOR
                drawCircle(
                    color = accent.copy(alpha = POP_RIPPLE_ALPHA * (1f - progress)),
                    radius = maxRadius * progress,
                    center = origin,
                )
            }.pointerInput(enabled) {
                detectTapGestures(
                    onPress = {
                        // Dip-and-rebound the moment the finger lands so the press
                        // reads physically even before the long-press threshold.
                        pulseScale()
                    },
                    onTap = { onTap?.invoke() },
                    onLongPress = { offset ->
                        if (haptic) {
                            haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                        }
                        playRipple(offset)
                        onLongPress()
                    },
                )
            }
    }
