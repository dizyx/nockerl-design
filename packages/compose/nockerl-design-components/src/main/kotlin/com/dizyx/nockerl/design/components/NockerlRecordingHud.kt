package com.dizyx.nockerl.design.components

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlFloatingBorderWidth
import com.dizyx.nockerl.design.tokens.NockerlPillShape
import com.dizyx.nockerl.design.tokens.nockerlShadow
import kotlin.math.ln

/**
 * The **recording HUD**: the floating "Nockerl is listening" pill, aligned
 * VALUE-EXACT to the web canon (site RecordingHudDemo.tsx) per the design lead's
 * ruling: "look just like the web version." Twin of the Swift NockerlRecordingHUD.
 *
 * **Anatomy** (left → right, [showBrand] default true): `[ NockerlLogo (16) ] → [
 * gray vertical divider ] → [ CONTENT that morphs per [phase] ] → [ optional ghost
 * Cancel ]`.
 *
 * **The color split (the core fix: kills the over-warming, law §10):** the record
 * DOT is the ONLY warm element (statusError); the TIMER is THEME INK (onCanvas,
 * never red); the meter bars are accentPrimary (brand cyan). The pill carries the §2
 * floating accent edge (accentPrimary; statusWarning in the [phase] = error only).
 *
 * **Phases:** recording (pulsing dot → mono timer → live cyan meter) ·
 * paused (dimmed dot → muted timer → frozen muted meter → "Paused") · transcribing
 * (spinner → "Transcribing…") · error (warn triangle → text; border → statusWarning).
 *
 * **Phase motion:** HEIGHT IS CONSTANT across all phases (the content rides a
 * fixed 24.dp band); only WIDTH animates ([Modifier.animateContentSize]): a smooth
 * grow/shrink to each phase's content, never vertical movement. The OPT-IN
 * entrance/exit is host-owned (the compose idiom, law §9): wrap the HUD in
 * `AnimatedVisibility(visible, enter = slideInVertically { it } + fadeIn(), exit =
 * slideOutVertically { it } + fadeOut())`: it pops up from / shoots down to the
 * bottom edge, holding still while live. Default (no wrapper) = in place, unchanged.
 *
 * **Golden determinism:** pass [animate] = false to freeze the dot pulse at
 * peak; the meter draws [amplitudes] directly. The transcribing spinner is infinite
 * motion: document it, don't snapshot it (the search-field spinner precedent).
 *
 * @param modifier outer modifier (the host places this directly above the pill).
 * @param phase the dictation phase (drives the morphing content + border tone).
 * @param elapsedLabel the pre-formatted elapsed time (recording / paused).
 * @param amplitudes per-bar levels (0..1) for the equalizer (recording / paused).
 * @param errorMessage the failure text (the error phase).
 * @param transcribingLabel the transcribing status word.
 * @param pausedLabel the paused status word.
 * @param pasted RESULT phase: pasted-vs-copied, picks the success word.
 * @param resultPastedLabel the success word when [pasted] is true.
 * @param resultCopiedLabel the success word when [pasted] is false.
 * @param showBrand `false` drops BOTH the logo and the divider (embedded chrome).
 * @param animate `false` freezes the dot pulse at peak (deterministic goldens).
 * @param animateBars opt-in ~80ms ease on each bar height (default off).
 * @param showCancel render the trailing ghost Cancel (default false, the host
 *   usually owns its own controls, law §9).
 * @param cancelLabel the ghost cancel's label.
 * @param onCancel fired when the ghost Cancel is tapped.
 */
@Composable
fun NockerlRecordingHud(
    modifier: Modifier = Modifier,
    phase: NockerlRecordingHudPhase = NockerlRecordingHudPhase.RECORDING,
    elapsedLabel: String = "",
    amplitudes: List<Float> = emptyList(),
    errorMessage: String = "",
    transcribingLabel: String = "Transcribing…",
    pausedLabel: String = "Paused",
    pasted: Boolean = true,
    resultPastedLabel: String = "Pasted",
    resultCopiedLabel: String = "Copied",
    showBrand: Boolean = true,
    animate: Boolean = true,
    animateBars: Boolean = false,
    showCancel: Boolean = false,
    cancelLabel: String = "Cancel",
    onCancel: () -> Unit = {},
) {
    val colors = LocalNockerlColors.current
    // The border rides the accent edge everywhere except error (statusWarning).
    val borderColor = if (phase == NockerlRecordingHudPhase.ERROR) colors.statusWarning else colors.accentPrimary

    Surface(
        color = colors.chromeSurface,
        shape = NockerlPillShape,
        border = BorderStroke(NockerlFloatingBorderWidth, borderColor),
        // Height is constant (the content Box below), so this animates only
        // the WIDTH: a smooth grow/shrink as the phase content changes.
        modifier =
            modifier.animateContentSize().nockerlShadow(
                elevation = NockerlElevation.Level3,
                shape = NockerlPillShape,
            ),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (showBrand) {
                // The brand mark LEADS (task 2623), theme-adaptive ink, never cyan.
                NockerlLogo(size = 16.dp, contentDescription = "Nockerl")
                // The slight gray vertical divider (the web nk-hud__rule): 1×24.
                Box(
                    modifier =
                        Modifier
                            .width(1.dp)
                            .height(24.dp)
                            .background(colors.divider),
                )
            }
            // A CONSTANT content band (24.dp = the divider height) so EVERY
            // phase renders at the same pill height; only WIDTH varies.
            Box(modifier = Modifier.height(24.dp), contentAlignment = Alignment.CenterStart) {
                HudContent(
                    phase = phase,
                    elapsedLabel = elapsedLabel,
                    amplitudes = amplitudes,
                    errorMessage = errorMessage,
                    transcribingLabel = transcribingLabel,
                    pausedLabel = pausedLabel,
                    pasted = pasted,
                    resultPastedLabel = resultPastedLabel,
                    resultCopiedLabel = resultCopiedLabel,
                    animate = animate,
                    animateBars = animateBars,
                )
            }
            if (showCancel) {
                NockerlButton(
                    text = cancelLabel,
                    onClick = onCancel,
                    variant = NockerlButtonVariant.GHOST,
                )
            }
        }
    }
}

/** The morphing content after the logo + divider (one row per phase). */
@Composable
private fun HudContent(
    phase: NockerlRecordingHudPhase,
    elapsedLabel: String,
    amplitudes: List<Float>,
    errorMessage: String,
    transcribingLabel: String,
    pausedLabel: String,
    pasted: Boolean,
    resultPastedLabel: String,
    resultCopiedLabel: String,
    animate: Boolean,
    animateBars: Boolean,
) {
    val colors = LocalNockerlColors.current

    when (phase) {
        NockerlRecordingHudPhase.RECORDING, NockerlRecordingHudPhase.PAUSED -> {
            val paused = phase == NockerlRecordingHudPhase.PAUSED
            // Recording pulses the dot 1 → .3 on the web's 0.6s; paused holds .5.
            val dotAlpha =
                if (paused) {
                    0.5f
                } else if (animate) {
                    val transition = rememberInfiniteTransition(label = "nockerlRecPulse")
                    transition
                        .animateFloat(
                            initialValue = 1f,
                            targetValue = 0.3f,
                            animationSpec =
                                infiniteRepeatable(
                                    animation = tween(durationMillis = 600),
                                    repeatMode = RepeatMode.Reverse,
                                ),
                            label = "nockerlRecPulseAlpha",
                        ).value
                } else {
                    1f
                }

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // The ONE warm element: the record dot (statusError).
                Box(
                    modifier =
                        Modifier
                            .size(8.dp)
                            .alpha(dotAlpha)
                            .clip(CircleShape)
                            .background(colors.statusError),
                )
                // The timer: MONO + tabular (never jitters), THEME INK (never red).
                Text(
                    text = elapsedLabel,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (paused) colors.onChromeMuted else colors.onCanvas,
                )
                if (amplitudes.isNotEmpty()) {
                    RecordingEqualizer(
                        amplitudes = amplitudes,
                        color = if (paused) colors.onChromeMuted else colors.accentPrimary,
                        animateBars = animateBars && !paused,
                    )
                }
                if (paused) {
                    StatusWord(pausedLabel)
                }
            }
        }

        NockerlRecordingHudPhase.TRANSCRIBING -> {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(14.dp),
                    color = colors.accentPrimary,
                    strokeWidth = 2.dp,
                )
                StatusWord(transcribingLabel)
            }
        }

        NockerlRecordingHudPhase.ERROR -> {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Color + ICON + TEXT (never color alone), the warm warning token.
                Icon(
                    imageVector = Icons.Filled.Warning,
                    contentDescription = null,
                    tint = colors.statusWarning,
                    modifier = Modifier.size(16.dp),
                )
                Text(
                    text = errorMessage,
                    fontSize = 12.sp,
                    color = colors.onChrome,
                    maxLines = 1,
                )
            }
        }

        NockerlRecordingHudPhase.RESULT -> {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // The success glyph: statusSuccess (color + icon + text). No
                // dot/timer/meter, like transcribing.
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = colors.statusSuccess,
                    modifier = Modifier.size(16.dp),
                )
                StatusWord(if (pasted) resultPastedLabel else resultCopiedLabel)
            }
        }
    }
}

/** The status word (Paused / Transcribing…), medium, on-chrome ink. */
@Composable
private fun StatusWord(text: String) {
    val colors = LocalNockerlColors.current
    Text(
        text = text,
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        color = colors.onChrome,
        maxLines = 1,
    )
}

/** The HUD's dictation phase: mirrors the web `HudPhase`. */
enum class NockerlRecordingHudPhase {
    /** Live capture: pulsing red dot → mono timer (ink) → live cyan meter. */
    RECORDING,

    /** Held: static dimmed dot → muted timer → frozen muted meter → "Paused". */
    PAUSED,

    /** Post-capture: indeterminate spinner → "Transcribing…". */
    TRANSCRIBING,

    /** Failed: warn triangle → error text; the pill border rides statusWarning. */
    ERROR,

    /** Success: a checkmark → "Pasted"/"Copied" (drops dot/timer/meter, like
     *  transcribing); the §2 accent edge stays. Pair with the `pasted` flag. */
    RESULT,
}

/**
 * The compact VU equalizer: 5 centered bars, log-normalized EXACTLY like both
 * shipped apps (`ln(raw+1)/ln(32768)`, raw = level × 32767, clamped to [0.08, 1]).
 * Geometry is LITERAL (barWidth 3, gap 3, height 20), identical across platforms.
 * Only HEIGHT animates (opt-in ~80ms ease).
 */
@Composable
private fun RecordingEqualizer(
    amplitudes: List<Float>,
    color: Color,
    animateBars: Boolean,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.height(20.dp),
        horizontalArrangement = Arrangement.spacedBy(3.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        amplitudes.forEach { amp ->
            val normalized = (ln(amp.coerceIn(0f, 1f) * 32_767.0 + 1.0) / ln(32_768.0)).toFloat()
            val target = (normalized.coerceIn(0.08f, 1f) * 20f).dp
            val barHeight =
                if (animateBars) {
                    animateDpAsState(
                        targetValue = target,
                        animationSpec = tween(durationMillis = 80, easing = LinearOutSlowInEasing),
                        label = "nockerlEqBar",
                    ).value
                } else {
                    target
                }
            Box(
                modifier =
                    Modifier
                        .width(3.dp)
                        .height(barHeight)
                        .clip(RoundedCornerShape(1.5.dp))
                        .background(color),
            )
        }
    }
}
