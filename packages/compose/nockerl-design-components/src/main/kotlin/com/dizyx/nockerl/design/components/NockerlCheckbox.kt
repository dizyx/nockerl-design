package com.dizyx.nockerl.design.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlMotionDuration
import com.dizyx.nockerl.design.tokens.NockerlMotionEasing
import com.dizyx.nockerl.design.tokens.NockerlProgressTrackShape
import com.dizyx.nockerl.design.tokens.nockerlLitSurface
import com.dizyx.nockerl.design.tokens.nockerlRecessedSurface
import androidx.compose.foundation.Canvas as FoundationCanvas
import androidx.compose.foundation.selection.triStateToggleable as foundationTriStateToggleable

/**
 * The standardized **checkbox**, the Tier-1 tri-state selection control,
 * porting the RATIFIED web treatments 1:1 ( / web `Checkbox.tsx@5dadb82`):
 *
 * - **Unchecked = a recessed WELL** ("fields sink"): `cardSurface3` under the
 *   shared [nockerlRecessedSurface] inner shade, ringed by the `divider` hairline.
 * - **Checked = a CONTAINED control**: the static cyan gradient
 *   (`accentPrimaryHi` → `accentPrimary`) lit from above (the shared
 *   [nockerlLitSurface] catch-light) plus a 1px **defining edge** (accent mixed
 *   68% into the shadow tint), so the filled box reads as a contained control,
 *   never a soft cyan blob.
 * - **Mixed = a DISTINCT horizontal dash** (never a faded tick), same fill.
 * - The cyan layer **cross-fades by alpha** and marks draw with on-accent ink.
 *   Fills never hard-swap (law §7).
 *
 * Square geometry (the ratified near-square 2dp track radius), 20dp box (md) /
 * 16dp (sm), and the module's shared minimum touch target regardless of box size (law §13).
 *
 * State cycling is the shared cross-platform contract [nockerlCheckboxNext]:
 * off → on, on → off, **mixed → on** (the parent tri-state resolves to all-on).
 *
 * @param state tri-state value ([ToggleableState]: On / Off / Indeterminate).
 * @param onStateChange invoked with the NEXT state per the shared contract;
 *   `null` renders a display-only box (a parent row owns the click).
 * @param modifier outer modifier.
 * @param label persistent visible label beside the box (its click target too).
 * @param description supporting line under the label.
 * @param size box scale: [NockerlCheckboxSize.MD] (default) or SM.
 * @param enabled when `false`, inert but clearly legible (off dims the well,
 *   on halves the fill, per the web's disabled ladder).
 */
@Composable
fun NockerlCheckbox(
    state: ToggleableState,
    onStateChange: ((ToggleableState) -> Unit)?,
    modifier: Modifier = Modifier,
    label: String? = null,
    description: String? = null,
    size: NockerlCheckboxSize = NockerlCheckboxSize.MD,
    enabled: Boolean = true,
) {
    val colors = LocalNockerlColors.current
    val interactive =
        if (onStateChange != null) {
            Modifier.foundationTriStateToggleable(
                state = state,
                enabled = enabled,
                role = Role.Checkbox,
                onClick = { onStateChange(nockerlCheckboxNext(state)) },
            )
        } else {
            Modifier
        }

    Row(
        modifier =
            modifier
                .then(interactive)
                .sizeIn(minWidth = MinTouchTarget, minHeight = MinTouchTarget),
        verticalAlignment = Alignment.Top,
    ) {
        CheckboxBox(state = state, size = size, enabled = enabled)
        if (label != null) {
            Column(modifier = Modifier.padding(start = 12.dp)) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyMedium,
                    color =
                        if (enabled) colors.onCard else colors.onCardMuted,
                )
                if (description != null) {
                    Text(
                        text = description,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onCardMuted,
                    )
                }
            }
        }
    }
}

/** The box itself: well, cross-fading contained fill, and the drawn mark. */
@Composable
private fun CheckboxBox(
    state: ToggleableState,
    size: NockerlCheckboxSize,
    enabled: Boolean,
) {
    val colors = LocalNockerlColors.current
    val filled = state != ToggleableState.Off
    // The cyan layer CROSS-FADES by alpha over the static well (law §7); the
    // disabled-on fill sits at half strength (the web ladder), disabled-off
    // dims the whole control.
    val fillAlpha by animateFloatAsState(
        targetValue =
            when {
                !filled -> 0f
                !enabled -> 0.5f
                else -> 1f
            },
        animationSpec = tween(NockerlMotionDuration.fastMs, easing = NockerlMotionEasing.standard),
        label = "nockerlCheckboxFill",
    )
    val controlAlpha = if (!enabled && !filled) DISABLED_OFF_ALPHA else 1f
    // The 1px DEFINING EDGE: accent mixed 68% into the shadow tint (#2530a).
    val edge = lerp(colors.shadowTint, colors.accentPrimary, EDGE_ACCENT_FRACTION)
    val mark = if (enabled) colors.onAccent else colors.onAccent.copy(alpha = 0.8f)

    Box(
        modifier = Modifier.size(size.box).alpha(controlAlpha),
    ) {
        // The recessed WELL (always present under the fill, never a fill swap).
        Box(
            modifier =
                Modifier
                    .size(size.box)
                    .nockerlRecessedSurface(shape = NockerlProgressTrackShape)
                    .background(colors.cardSurface3)
                    .border(1.dp, colors.divider, NockerlProgressTrackShape),
        )
        // The contained cyan fill: static gradient + catch-light + defining edge.
        Box(
            modifier =
                Modifier
                    .size(size.box)
                    .alpha(fillAlpha)
                    .clip(NockerlProgressTrackShape)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(colors.accentPrimaryHi, colors.accentPrimary),
                        ),
                    ).nockerlLitSurface(shape = NockerlProgressTrackShape)
                    .border(1.dp, edge, NockerlProgressTrackShape),
        )
        // The MARK: tick when on, the DISTINCT dash when mixed; on-accent ink.
        FoundationCanvas(modifier = Modifier.size(size.box).alpha(fillAlpha)) {
            val w = this.size.width
            val h = this.size.height
            val stroke =
                Stroke(
                    width = size.stroke.toPx(),
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round,
                )
            when (state) {
                ToggleableState.On -> {
                    // The web tick path (M5 10.5 L8.5 14 L15 6.5 on a 20-box), scaled.
                    val p1 = Offset(w * 0.25f, h * 0.525f)
                    val p2 = Offset(w * 0.425f, h * 0.7f)
                    val p3 = Offset(w * 0.75f, h * 0.325f)
                    drawLine(mark, p1, p2, stroke.width, StrokeCap.Round)
                    drawLine(mark, p2, p3, stroke.width, StrokeCap.Round)
                }
                ToggleableState.Indeterminate -> {
                    // The distinct MIXED dash (M5.5 10 h9), scaled.
                    drawLine(
                        color = mark,
                        start = Offset(w * 0.275f, h * 0.5f),
                        end = Offset(w * 0.725f, h * 0.5f),
                        strokeWidth = stroke.width,
                        cap = StrokeCap.Round,
                    )
                }
                ToggleableState.Off -> Unit
            }
        }
    }
}

/**
 * The shared cross-platform cycle contract (identical on web + Swift):
 * off → on, on → off, and **mixed resolves to on** (the browser's native
 * indeterminate-click behavior, ratified as the family rule).
 */
fun nockerlCheckboxNext(state: ToggleableState): ToggleableState =
    when (state) {
        ToggleableState.Off -> ToggleableState.On
        ToggleableState.On -> ToggleableState.Off
        ToggleableState.Indeterminate -> ToggleableState.On
    }

/** Box scale ramp, mirroring the web `sm | md` union. */
enum class NockerlCheckboxSize(
    /** The square box edge. */
    val box: Dp,
    /** Mark stroke width. */
    val stroke: Dp,
) {
    /** 16dp box for dense rows. */
    SM(16.dp, 2.dp),

    /** 20dp box, the platform default. */
    MD(20.dp, 2.dp),
}

/** Disabled-off control opacity (the web's `.55`). */
private const val DISABLED_OFF_ALPHA = 0.55f

/** Defining-edge mix: accent 68% into shadow tint (web color-mix, #2530a). */
private const val EDGE_ACCENT_FRACTION = 0.68f
