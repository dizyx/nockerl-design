package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * One transcript entry for [NockerlAgentTranscriptPanel].
 *
 * @param key the STABLE identity (drives lazy-item keys, the virtualization
 *   contract; never an index).
 * @param epochMillis optional timestamp; consecutive items crossing a UTC day
 *   boundary get a day marker between them. `null` = no marker logic.
 * @param content the row: any shipped chat cell (bubble, agent message,
 *   tool-call card, spawn card, the failure grammar).
 */
data class NockerlTranscriptItem(
    val key: String,
    val epochMillis: Long? = null,
    val content: @Composable () -> Unit,
)

/**
 * The **agent transcript panel** is the first-class composition
 * SHELL for agent/chat feeds (the verdict: every ROW ships; the scroll +
 * grouping + day markers + auto-follow shell was the gap). It owns:
 *
 * - **Virtualization**: a [LazyColumn] keyed on [NockerlTranscriptItem.key];
 *   the [listState] is the HOOK POINT (callers own/observe/restore it, drive
 *   paging from it, or swap scroll behavior around it).
 * - **Day markers**: a hairline-flanked muted label whenever consecutive
 *   items cross a UTC day boundary ([dayLabel] formats it).
 * - **Auto-follow**: new items keep the panel pinned to the bottom while the
 *   reader is AT the bottom; scrolling away suspends following (the chat
 *   contract), and the floating scroll-to-bottom affordance appears: a solid
 *   accent circle (the §2 floating-layer signal) that jumps back + resumes.
 *
 * Same-sender grouping lives in the ROWS (the bubble grammar), not the shell.
 *
 * @param items the transcript, in order.
 * @param modifier outer modifier (give the panel a bounded height).
 * @param listState the lazy state: the virtualization/scroll hook point.
 * @param autoFollow keep pinned to the newest item while at the bottom.
 * @param dayLabel formats a day marker from the first millis of that day.
 * @param contentPadding the list's padding (default 12dp vertical).
 * @param jumpToLatestLabel the jump affordance's a11y name (1.0 strings stance).
 */
@Composable
fun NockerlAgentTranscriptPanel(
    items: List<NockerlTranscriptItem>,
    modifier: Modifier = Modifier,
    listState: LazyListState = rememberLazyListState(),
    autoFollow: Boolean = true,
    dayLabel: (Long) -> String = { "Day ${it / DAY_MILLIS}" },
    contentPadding: PaddingValues = PaddingValues(vertical = 12.dp),
    jumpToLatestLabel: String = "Jump to latest",
) {
    val colors = LocalNockerlColors.current

    // Rows + day markers, resolved once per items change.
    val rows =
        remember(items) {
            buildList {
                var lastDay: Long? = null
                items.forEach { item ->
                    val day = item.epochMillis?.let { it / DAY_MILLIS }
                    if (day != null && lastDay != null && day != lastDay) {
                        add(TranscriptRow.DayMarker(dayStartMillis = day * DAY_MILLIS))
                    }
                    if (day != null) lastDay = day
                    add(TranscriptRow.Entry(item))
                }
            }
        }

    // At-bottom = the last row is visible; scrolling away suspends following.
    val atBottom by remember {
        derivedStateOf {
            val info = listState.layoutInfo
            val last = info.visibleItemsInfo.lastOrNull()?.index ?: -1
            last >= info.totalItemsCount - 1
        }
    }

    LaunchedEffect(rows.size) {
        if (autoFollow && rows.isNotEmpty() && atBottom) {
            listState.animateScrollToItem(rows.lastIndex)
        }
    }

    Box(modifier = modifier) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = contentPadding,
        ) {
            rows.forEachIndexed { index, row ->
                when (row) {
                    is TranscriptRow.DayMarker ->
                        item(key = "day-${row.dayStartMillis}") {
                            DayMarkerRow(label = dayLabel(row.dayStartMillis))
                        }
                    is TranscriptRow.Entry ->
                        item(key = row.item.key) {
                            Box(
                                modifier =
                                    Modifier
                                        .fillMaxWidth()
                                        .padding(
                                            top = if (index == 0) 0.dp else 4.dp,
                                            bottom = 4.dp,
                                        ),
                            ) {
                                row.item.content()
                            }
                        }
                }
            }
        }

        // The floating jump-back affordance: a solid accent circle (the cyan
        // floating-layer identity, §2) shown only while scrolled away.
        if (!atBottom && rows.isNotEmpty()) {
            var jump by remember { mutableStateOf(false) }
            if (jump) {
                LaunchedEffect(Unit) {
                    listState.animateScrollToItem(rows.lastIndex)
                    jump = false
                }
            }
            NockerlIconButton(
                icon = Icons.Filled.KeyboardArrowDown,
                contentDescription = jumpToLatestLabel,
                onClick = { jump = true },
                style = NockerlIconButtonStyle.FILLED_CIRCLE,
                accent = colors.accentPrimary,
                modifier =
                    Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 8.dp),
            )
        }
    }
}

/** The shell's internal row model: an entry or a day boundary. */
private sealed interface TranscriptRow {
    data class Entry(
        val item: NockerlTranscriptItem,
    ) : TranscriptRow

    data class DayMarker(
        val dayStartMillis: Long,
    ) : TranscriptRow
}

/** A day boundary: a muted label flanked by hairlines. */
@Composable
private fun DayMarkerRow(label: String) {
    val colors = LocalNockerlColors.current
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier =
                Modifier
                    .weight(1f)
                    .height(1.dp)
                    .background(colors.cardHairline),
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = colors.onCanvasMuted,
            modifier = Modifier.padding(horizontal = 10.dp),
        )
        Box(
            modifier =
                Modifier
                    .weight(1f)
                    .height(1.dp)
                    .background(colors.cardHairline),
        )
    }
}

/** One UTC day in millis: the day-marker bucket size. */
private const val DAY_MILLIS = 86_400_000L
