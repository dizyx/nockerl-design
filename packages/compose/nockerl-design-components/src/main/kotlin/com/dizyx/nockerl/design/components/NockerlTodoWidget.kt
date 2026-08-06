package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlCardShape
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlProgressTrackShape
import com.dizyx.nockerl.design.tokens.NockerlSurface

/**
 * One plan step (mirror of the react `NockerlTodoItem`).
 *
 * @param label the step text.
 * @param state the step's report state.
 * @param id stable key; falls back to [label].
 * @param detail optional supporting line: a blocked row's reason, a running
 *   row's current detail.
 */
data class NockerlTodoItem(
    val label: String,
    val state: NockerlTodoState,
    val id: String? = null,
    val detail: String? = null,
)

/** The plan-step report states (mirror of the react `NockerlTodoState`). */
enum class NockerlTodoState {
    /** Not started: an empty muted ring. */
    PENDING,

    /** In progress NOW: the live accent spinner. */
    RUNNING,

    /** Complete: the success check; the row's ink dims (seen). */
    DONE,

    /** Stuck: the warning triangle; the reason voices in a warm detail line. */
    BLOCKED,
}

/**
 * The **todo widget**: the compose mirror of the react
 * `NockerlTodoWidget` (1:1 contract): the agent's running plan as a compact
 * lifted card. A plan is not a wizard: steps don't navigate, they REPORT, so
 * this is a quiet read-only card, the Stepper's sibling, not a control.
 *
 * - **header**: [title] + the "3 / 7" count (mono, tabular) + a segments
 *   meter (one cell per step; done cells fill CYAN: progress is progress,
 *   not a status) + the open [headerTrailing] slot.
 * - **steps**, a state glyph (shape + color dual-coded: check = done · live
 *   spinner = running · warning triangle = blocked · muted ring = pending) +
 *   the label. DONE rows dim (the seen-ink rule, as [NockerlJobRow]); the
 *   running row keeps full ink; a blocked row voices its [NockerlTodoItem.detail]
 *   in the warm status ink.
 *
 * Laws: the card lifts; state lives in the GLYPH, never a rail or a row wash.
 *
 * NOTE (goldens): the RUNNING spinner is motion, deliberately NOT captured
 * (the search-field precedent); snapshot the other states.
 *
 * @param items the plan steps, in order.
 * @param modifier outer modifier (typically `fillMaxWidth()`).
 * @param title optional card heading.
 * @param headerTrailing open header-trailing slot (a chip, a collapse control).
 * @param stateDescription the glyphs' a11y names per state (English defaults;
 *   1.0 strings stance: overridable, no i18n framework).
 */
@Composable
fun NockerlTodoWidget(
    items: List<NockerlTodoItem>,
    modifier: Modifier = Modifier,
    title: String? = null,
    headerTrailing: (@Composable () -> Unit)? = null,
    stateDescription: (NockerlTodoState) -> String = ::nockerlTodoStateDescription,
) {
    val colors = LocalNockerlColors.current
    val done = items.count { it.state == NockerlTodoState.DONE }

    NockerlSurface(
        modifier = modifier.fillMaxWidth(),
        shape = NockerlCardShape,
        color = colors.cardSurface1,
        elevation = NockerlElevation.Level2,
        border = colors.cardHairline,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (title != null) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = colors.onCard,
                    )
                }
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = "$done / ${items.size}",
                    style = MaterialTheme.typography.labelSmall,
                    fontFamily = FontFamily.Monospace,
                    color = colors.onCardMuted,
                )
                if (headerTrailing != null) {
                    Spacer(modifier = Modifier.width(8.dp))
                    headerTrailing()
                }
            }

            // The segments meter: one cell per step, done cells filled CYAN
            // (progress is progress, not a status).
            if (items.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth().height(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    items.forEach { item ->
                        Box(
                            modifier =
                                Modifier
                                    .weight(1f)
                                    .height(4.dp)
                                    .background(
                                        if (item.state == NockerlTodoState.DONE) {
                                            colors.accentPrimary
                                        } else {
                                            colors.canvasAlt
                                        },
                                        NockerlProgressTrackShape,
                                    ),
                        )
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items.forEach { item -> TodoStepRow(item = item, stateDescription = stateDescription) }
            }
        }
    }
}

/** One plan step: the state glyph column + label (+ detail). */
@Composable
private fun TodoStepRow(
    item: NockerlTodoItem,
    stateDescription: (NockerlTodoState) -> String,
) {
    val colors = LocalNockerlColors.current
    val seen = item.state == NockerlTodoState.DONE

    Row(verticalAlignment = Alignment.Top) {
        Box(
            modifier = Modifier.size(width = 16.dp, height = 20.dp),
            contentAlignment = Alignment.Center,
        ) {
            when (item.state) {
                NockerlTodoState.DONE ->
                    Icon(
                        imageVector = Icons.Filled.Check,
                        contentDescription = stateDescription(NockerlTodoState.DONE),
                        tint = colors.statusSuccess,
                        modifier = Modifier.size(14.dp),
                    )
                NockerlTodoState.RUNNING ->
                    CircularProgressIndicator(
                        color = colors.accentPrimary,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(12.dp),
                    )
                NockerlTodoState.BLOCKED ->
                    Icon(
                        imageVector = Icons.Filled.Warning,
                        contentDescription = stateDescription(NockerlTodoState.BLOCKED),
                        tint = colors.statusWarning,
                        modifier = Modifier.size(14.dp),
                    )
                NockerlTodoState.PENDING ->
                    // The empty muted ring, drawn directly (the outlined icon set
                    // is not in icons-core; a ring needs no glyph).
                    Box(
                        modifier =
                            Modifier
                                .size(12.dp)
                                .border(
                                    width = 1.5.dp,
                                    color =
                                        colors.onCardMuted.copy(
                                            alpha = colors.onCardMuted.alpha * PENDING_GLYPH_ALPHA,
                                        ),
                                    shape = CircleShape,
                                ),
                    )
            }
        }
        Spacer(modifier = Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.label,
                style = MaterialTheme.typography.bodyMedium,
                // DONE rows dim (seen); everything else keeps the card ink.
                color = if (seen) colors.onCardMuted else colors.onCard,
            )
            if (item.detail != null) {
                Text(
                    text = item.detail,
                    style = MaterialTheme.typography.bodySmall,
                    color =
                        if (item.state == NockerlTodoState.BLOCKED) {
                            colors.statusWarning
                        } else {
                            colors.onCardMuted
                        },
                )
            }
        }
    }
}

/** The default English state names (override via the widget's stateDescription). */
fun nockerlTodoStateDescription(state: NockerlTodoState): String =
    when (state) {
        NockerlTodoState.PENDING -> "Pending"
        NockerlTodoState.RUNNING -> "Running"
        NockerlTodoState.DONE -> "Done"
        NockerlTodoState.BLOCKED -> "Blocked"
    }

/** The pending ring's quiet fade (the react .6 opacity). */
private const val PENDING_GLYPH_ALPHA = 0.6f
