package com.dizyx.nockerl.design.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * The **job / notification row** (WS4 #2655a), the compose mirror of the react
 * `NockerlJobRow` (1:1 contract; builder-1 owns the API): one background job or
 * inbox notification as a list row, a THIN SHELL over the [NockerlListItemRow]
 * grammar (no new row anatomy):
 *
 * - **leading**, the job STATE: the status mark (success / warning / error,
 *   via shape + color dual-coding), a LIVE spinner while [NockerlJobState.RUNNING],
 *   or a muted clock while [NockerlJobState.QUEUED] (waiting is not a status,
 *   so no warm color, no cyan).
 * - **primary/secondary**: [title] / [detail].
 * - **trailing**: the relative [time] (the Timeline time idiom) and an
 *   optional unread [count] badge, then the open [trailing] slot.
 * - **READ vs UNREAD**: unread keeps the row's full voice (+ badge); read rows
 *   DIM their content (muted ink, regular weight). Emphasis lives in the INK,
 *   never a rail or a wash (law §6 keeps status in the leading mark).
 *
 * The catalog's "JobCard" is a VIEW of this row (hosted on a lifted card).
 *
 * NOTE (goldens): the RUNNING spinner is motion, deliberately NOT captured
 * (the search-field spinner precedent); document it, snapshot the other states.
 *
 * @param title the job / notification title.
 * @param state the job state (drives the leading mark).
 * @param modifier outer modifier (padding/height/background per host).
 * @param detail optional supporting line.
 * @param time optional relative timestamp label ("2m ago").
 * @param unread `true` = full-strength ink + the count badge; read rows dim.
 * @param count grouped-notification count (rendered only while [unread]).
 * @param trailing open trailing slot (a chip, an action).
 * @param onSelect optional row tap.
 * @param enabled when `false`, the row is dimmed and inert.
 * @param stateDescription the leading mark's a11y name per state (English
 *   defaults; 1.0 strings stance: overridable, no i18n framework).
 */
@Composable
fun NockerlJobRow(
    title: String,
    state: NockerlJobState,
    modifier: Modifier = Modifier,
    detail: String? = null,
    time: String? = null,
    unread: Boolean = false,
    count: Int? = null,
    trailing: (@Composable () -> Unit)? = null,
    onSelect: (() -> Unit)? = null,
    enabled: Boolean = true,
    stateDescription: (NockerlJobState) -> String = ::nockerlJobStateDescription,
) {
    val colors = LocalNockerlColors.current
    val rowAlpha = if (enabled) 1f else DISABLED_ALPHA

    val rowModifier =
        modifier
            .fillMaxWidth()
            .then(
                if (onSelect != null) {
                    Modifier.clickable(enabled = enabled, onClick = onSelect)
                } else {
                    Modifier
                },
            ).padding(horizontal = 4.dp, vertical = 8.dp)

    NockerlListItemRow(
        leadingMark = {
            when (state) {
                NockerlJobState.RUNNING ->
                    CircularProgressIndicator(
                        color = colors.accentPrimary.copy(alpha = colors.accentPrimary.alpha * rowAlpha),
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(16.dp),
                    )
                NockerlJobState.QUEUED ->
                    Icon(
                        imageVector = NockerlJobClockIcon,
                        contentDescription = stateDescription(NockerlJobState.QUEUED),
                        tint = colors.onCardMuted.copy(alpha = colors.onCardMuted.alpha * rowAlpha),
                        modifier = Modifier.size(16.dp),
                    )
                else -> {
                    val (icon, tint) = state.mark(colors)
                    NockerlLeadingStatusMark(
                        icon = icon,
                        tint = tint.copy(alpha = tint.alpha * rowAlpha),
                        contentDescription = stateDescription(state),
                    )
                }
            }
        },
        trailing = {
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                if (time != null) {
                    Text(
                        text = time,
                        style = MaterialTheme.typography.labelSmall,
                        color = dimmedInk(unread, colors).copy(alpha = rowAlpha),
                    )
                }
                if (unread && count != null) {
                    Spacer(modifier = Modifier.width(8.dp))
                    NockerlBadge(text = count.toString(), tone = NockerlBadgeTone.ACCENT)
                }
                if (trailing != null) {
                    Spacer(modifier = Modifier.width(8.dp))
                    trailing()
                }
            }
        },
        modifier = rowModifier,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                // UNREAD keeps the full voice (500 cap); READ dims to regular+muted.
                fontWeight = if (unread) FontWeight.Medium else FontWeight.Normal,
                color =
                    (if (unread) colors.onCard else colors.onCardMuted)
                        .let { it.copy(alpha = it.alpha * rowAlpha) },
            )
            if (detail != null) {
                Text(
                    text = detail,
                    style = MaterialTheme.typography.bodySmall,
                    color =
                        dimmedInk(unread, colors)
                            .let { it.copy(alpha = it.alpha * (if (unread) 1f else READ_SECONDARY_MIX) * rowAlpha) },
                )
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
    }
}

/** The job lifecycle (mirror of the react `NockerlJobState`). */
enum class NockerlJobState {
    /** Waiting, a muted clock (not a status: no warm color, no cyan). */
    QUEUED,

    /** Live: the small accent spinner. */
    RUNNING,

    /** Finished cleanly. */
    SUCCESS,

    /** Finished with warnings. */
    WARNING,

    /** Failed. */
    ERROR,
}

private fun NockerlJobState.mark(
    colors: com.dizyx.nockerl.design.tokens.NockerlColors,
): Pair<ImageVector, androidx.compose.ui.graphics.Color> =
    when (this) {
        NockerlJobState.SUCCESS -> Icons.Filled.Check to colors.statusSuccess
        NockerlJobState.WARNING -> Icons.Filled.Warning to colors.statusWarning
        else -> Icons.Filled.Close to colors.statusError
    }

/** The default English state names (override via the row's stateDescription). */
fun nockerlJobStateDescription(state: NockerlJobState): String =
    when (state) {
        NockerlJobState.QUEUED -> "Queued"
        NockerlJobState.RUNNING -> "Running"
        NockerlJobState.SUCCESS -> "Success"
        NockerlJobState.WARNING -> "Warning"
        NockerlJobState.ERROR -> "Error"
    }

/** Secondary/value ink: read rows fade toward 75% of the muted ink. */
private fun dimmedInk(
    unread: Boolean,
    colors: com.dizyx.nockerl.design.tokens.NockerlColors,
) = if (unread) colors.onCardMuted else colors.onCardMuted

/** The read-row secondary fade (the react 75% mix). */
private const val READ_SECONDARY_MIX = 0.75f

/**
 * The **queued clock** as a self-contained [ImageVector] (the Material
 * `schedule` path): the extended artifact is banned; built here to keep the
 * module on icons-core.
 */
private val NockerlJobClockIcon: ImageVector =
    ImageVector
        .Builder(
            name = "NockerlJobClock",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f,
        ).addPath(
            pathData =
                PathParser()
                    .parsePathString(
                        "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17" +
                            ".52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58" +
                            "-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.2" +
                            "3-4.5-2.67z",
                    ).toNodes(),
            fill = SolidColor(androidx.compose.ui.graphics.Color.Black),
        ).build()
