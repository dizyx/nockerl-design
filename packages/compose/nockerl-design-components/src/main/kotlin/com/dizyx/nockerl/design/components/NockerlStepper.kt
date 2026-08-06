package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlProgressTrackShape
import com.dizyx.nockerl.design.tokens.nockerlLitSurface
import com.dizyx.nockerl.design.tokens.nockerlRecessedSurface
import com.dizyx.nockerl.design.tokens.nockerlShadow

/**
 * The **stepper**: process steps for wizards/flows (stepper.mdx; the
 * coverage gap closed). Discs at 32dp on the pill silhouette:
 * - **DONE**: solid `accentPrimary` + a check knocked out in `onAccent`, level-1
 *   lift + catch-light. **CYAN is the terminal/progress seal (ratified:
 *   flow completion is brand progress; green stays for validation messages)**.
 *   There is no green anywhere in this component.
 * - **CURRENT**: solid accent + the step number, ringed by an
 *   `accentPrimarySoft` halo (natives express the web's gradient as solid +
 *   catch-light, per the solid-primary doctrine).
 * - **UPCOMING**: a recessed `canvasAlt` well with a `divider` border and a
 *   muted number ("fields sink").
 * - **ERROR** (when [errorAt] == [current]): solid `statusError` + the ✕
 *   knockout; pair it with visible error text at the call site (law §13).
 *
 * Connectors are 3dp lines on the squared track radius: `divider` for
 * un-reached segments, solid accent for completed ones.
 *
 * @param steps the steps, in order.
 * @param current zero-based active index (drives done/current/upcoming).
 * @param modifier outer modifier.
 * @param orientation horizontal (default) or vertical (max 360dp, the
 *   `size.container.lg` footprint).
 * @param errorAt step index in the error state (honored when == [current]).
 * @param onStepClick when set, DONE steps become tappable (jump BACK only;
 *   forward jumps stay gated by the host wizard).
 */
@Composable
fun NockerlStepper(
    steps: List<NockerlStep>,
    current: Int,
    modifier: Modifier = Modifier,
    orientation: NockerlStepperOrientation = NockerlStepperOrientation.HORIZONTAL,
    errorAt: Int? = null,
    onStepClick: ((Int) -> Unit)? = null,
) {
    when (orientation) {
        NockerlStepperOrientation.HORIZONTAL ->
            HorizontalStepper(steps, current, errorAt, onStepClick, modifier)
        NockerlStepperOrientation.VERTICAL ->
            VerticalStepper(steps, current, errorAt, onStepClick, modifier)
    }
}

/** One step of a [NockerlStepper]. */
data class NockerlStep(
    /** The step label. */
    val label: String,
    /** Optional supporting line (vertical orientation only). */
    val description: String? = null,
)

/** Stepper layout axis. */
enum class NockerlStepperOrientation {
    /** Discs in a row, labels below. */
    HORIZONTAL,

    /** Discs in a left rail, labels beside. Clamps to the 360dp footprint. */
    VERTICAL,
}

/** The visual state of one step (shared semantics with Swift; pure + testable). */
internal enum class NockerlStepVisualState { DONE, CURRENT, UPCOMING, ERROR }

/** Resolve a step's visual state (identical rule on both platforms). */
internal fun nockerlStepVisualState(
    index: Int,
    current: Int,
    errorAt: Int?,
): NockerlStepVisualState =
    when {
        index == current && errorAt == current -> NockerlStepVisualState.ERROR
        index < current -> NockerlStepVisualState.DONE
        index == current -> NockerlStepVisualState.CURRENT
        else -> NockerlStepVisualState.UPCOMING
    }

@Composable
private fun HorizontalStepper(
    steps: List<NockerlStep>,
    current: Int,
    errorAt: Int?,
    onStepClick: ((Int) -> Unit)?,
    modifier: Modifier,
) {
    Row(modifier = modifier, verticalAlignment = Alignment.Top) {
        steps.forEachIndexed { index, step ->
            val state = nockerlStepVisualState(index, current, errorAt)
            if (index > 0) {
                Connector(
                    done = index <= current,
                    modifier =
                        Modifier
                            .weight(1f)
                            .widthIn(min = 20.dp)
                            // Center the 3dp line on the 32dp disc row.
                            .padding(top = (STEP_DISC_SIZE - CONNECTOR_THICKNESS) / 2),
                )
            }
            StepColumn(index, step, state, onStepClick)
        }
    }
}

@Composable
private fun VerticalStepper(
    steps: List<NockerlStep>,
    current: Int,
    errorAt: Int?,
    onStepClick: ((Int) -> Unit)?,
    modifier: Modifier,
) {
    val colors = LocalNockerlColors.current
    Column(modifier = modifier.widthIn(max = VERTICAL_MAX_WIDTH)) {
        steps.forEachIndexed { index, step ->
            val state = nockerlStepVisualState(index, current, errorAt)
            val isLast = index == steps.lastIndex
            Row(modifier = Modifier.height(IntrinsicSize.Min)) {
                Column(
                    modifier = Modifier.width(STEP_DISC_SIZE),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    StepDisc(index, state)
                    if (!isLast) {
                        Box(
                            modifier =
                                Modifier
                                    .padding(vertical = 4.dp)
                                    .width(CONNECTOR_THICKNESS)
                                    .defaultMinSize(minHeight = 20.dp)
                                    .weight(1f)
                                    .clip(NockerlProgressTrackShape)
                                    .background(
                                        if (index < current) colors.accentPrimary else colors.divider,
                                    ),
                        )
                    }
                }
                Column(
                    modifier =
                        Modifier
                            .padding(start = 12.dp, bottom = if (isLast) 0.dp else 20.dp)
                            .stepClickable(state, index, onStepClick),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    StepLabel(step.label, state, alignCenter = false)
                    if (step.description != null) {
                        Text(
                            text = step.description,
                            style = MaterialTheme.typography.labelMedium,
                            color = colors.onCardMuted,
                        )
                    }
                }
            }
        }
    }
}

/** Disc + centered label, the horizontal step column (72dp keeps columns even). */
@Composable
private fun StepColumn(
    index: Int,
    step: NockerlStep,
    state: NockerlStepVisualState,
    onStepClick: ((Int) -> Unit)?,
) {
    Column(
        modifier = Modifier.width(HORIZONTAL_COLUMN_WIDTH).stepClickable(state, index, onStepClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        StepDisc(index, state)
        StepLabel(step.label, state, alignCenter = true)
    }
}

/** The 32dp step disc, per-state per the ratified recipe. */
@Composable
private fun StepDisc(
    index: Int,
    state: NockerlStepVisualState,
) {
    val colors = LocalNockerlColors.current
    val stateName =
        when (state) {
            NockerlStepVisualState.DONE -> "Completed"
            NockerlStepVisualState.CURRENT -> "Current step"
            NockerlStepVisualState.UPCOMING -> "Upcoming"
            NockerlStepVisualState.ERROR -> "Failed"
        }

    // The CURRENT disc wears the accentPrimarySoft halo ring (4dp).
    val halo =
        if (state == NockerlStepVisualState.CURRENT) {
            Modifier.background(colors.accentPrimarySoft, CircleShape).padding(RING_WIDTH)
        } else {
            Modifier.padding(RING_WIDTH)
        }

    Box(
        modifier = halo.semantics { stateDescription = stateName },
        contentAlignment = Alignment.Center,
    ) {
        when (state) {
            NockerlStepVisualState.DONE, NockerlStepVisualState.ERROR -> {
                val fill =
                    if (state == NockerlStepVisualState.DONE) colors.accentPrimary else colors.statusError
                Box(
                    modifier =
                        Modifier
                            .size(STEP_DISC_SIZE)
                            .nockerlShadow(elevation = NockerlElevation.Level1, shape = CircleShape)
                            .background(fill, CircleShape)
                            .nockerlLitSurface(shape = CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector =
                            if (state == NockerlStepVisualState.DONE) Icons.Filled.Check else Icons.Filled.Close,
                        contentDescription = null, // named by stateDescription + label
                        modifier = Modifier.size(16.dp),
                        tint = pickOnAccent(fill),
                    )
                }
            }
            NockerlStepVisualState.CURRENT -> {
                Box(
                    modifier =
                        Modifier
                            .size(STEP_DISC_SIZE)
                            .nockerlShadow(elevation = NockerlElevation.Level1, shape = CircleShape)
                            .background(colors.accentPrimary, CircleShape)
                            .nockerlLitSurface(shape = CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    StepNumber(index, pickOnAccent(colors.accentPrimary))
                }
            }
            NockerlStepVisualState.UPCOMING -> {
                Box(
                    modifier =
                        Modifier
                            .size(STEP_DISC_SIZE)
                            .nockerlRecessedSurface(shape = CircleShape)
                            .background(colors.canvasAlt)
                            .border(1.dp, colors.divider, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    StepNumber(index, colors.onCardMuted)
                }
            }
        }
    }
}

@Composable
private fun StepNumber(
    index: Int,
    color: androidx.compose.ui.graphics.Color,
) {
    Text(
        text = (index + 1).toString(),
        style = MaterialTheme.typography.bodyMedium,
        fontWeight = FontWeight.Medium, // 500 is the bold cap (law §11)
        color = color,
    )
}

@Composable
private fun StepLabel(
    label: String,
    state: NockerlStepVisualState,
    alignCenter: Boolean,
) {
    val colors = LocalNockerlColors.current
    Text(
        text = label,
        style = MaterialTheme.typography.labelMedium,
        fontWeight =
            if (state == NockerlStepVisualState.UPCOMING) FontWeight.Normal else FontWeight.Medium,
        color =
            when (state) {
                NockerlStepVisualState.ERROR -> colors.statusError
                NockerlStepVisualState.UPCOMING -> colors.onCardMuted
                else -> colors.onCard
            },
        textAlign = if (alignCenter) TextAlign.Center else TextAlign.Start,
    )
}

/** Horizontal connector segment. */
@Composable
private fun Connector(
    done: Boolean,
    modifier: Modifier,
) {
    val colors = LocalNockerlColors.current
    Box(
        modifier =
            modifier
                .height(CONNECTOR_THICKNESS)
                .clip(NockerlProgressTrackShape)
                .background(if (done) colors.accentPrimary else colors.divider),
    )
}

/** DONE steps become tappable when the host wires [onStepClick] (jump back only). */
private fun Modifier.stepClickable(
    state: NockerlStepVisualState,
    index: Int,
    onStepClick: ((Int) -> Unit)?,
): Modifier =
    if (onStepClick != null && state == NockerlStepVisualState.DONE) {
        clickable { onStepClick(index) }
    } else {
        this
    }

/** Disc diameter (32dp) and the ratified geometry constants. */
private val STEP_DISC_SIZE = 32.dp
private val CONNECTOR_THICKNESS = 3.dp
private val RING_WIDTH = 4.dp
private val HORIZONTAL_COLUMN_WIDTH = 72.dp

/** Vertical footprint: the `size.container.lg` token (360). */
private val VERTICAL_MAX_WIDTH = 360.dp
