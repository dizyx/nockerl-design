package com.dizyx.nockerl.design.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlColors
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlPanelShape
import com.dizyx.nockerl.design.tokens.NockerlProgressTrackShape
import com.dizyx.nockerl.design.tokens.NockerlSurface

/**
 * The **cluster status grid**, the compose mirror of the react
 * `NockerlClusterGrid`: a responsive wrap of [NockerlNodeCell] tiles (the fleet
 * wall at a glance). Deliberately a pure LAYOUT shell: health, metrics, and
 * badges all live in the cells. Tiles wrap at a minimum readable width and
 * share the row.
 *
 * @param modifier outer modifier.
 * @param content the node tiles ([NockerlNodeCell]s, each carries its own
 *   `cellMinWidth`; the flow shares remaining row space).
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun NockerlClusterGrid(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    FlowRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        content()
    }
}

/**
 * One node metric row (mirror of the react `NockerlNodeMetric`).
 *
 * @param label the quiet eyebrow ("MEM", "GPU").
 * @param value the mono display value ("87 / 119 GB").
 * @param series optional trend → a sparkline under the row.
 * @param ratio optional pressure 0..1 → a track toned by the gauge band ladder
 *   (cyan < .60 → amber < .85 → red); ignored when [series] is given.
 */
data class NockerlNodeMetric(
    val label: String,
    val value: String,
    val series: List<Float>? = null,
    val ratio: Float? = null,
)

/**
 * One **cluster node** tile (react mirror): a lifted card composing
 * shipped parts only: the health [NockerlStatusDot] + name + optional soft
 * NEUTRAL role badge in the head; metric rows (mono values; sparkline trends or
 * gauge-band pressure bars) in the middle; an open [footer] slot.
 *
 * Laws: cards lift; status lives in the DOT, never a rail or a tinted card;
 * values read mono so a scanning wall of nodes doesn't jitter.
 *
 * @param name the node name ("node-1 · GB10").
 * @param status node health on the shared dot ladder.
 * @param modifier outer modifier.
 * @param statusLabel accessible health label, also shown beside the dot.
 * @param badge optional soft role badge ("GPU · prod").
 * @param metrics metric rows, in order.
 * @param cellMinWidth the tile's minimum readable width.
 * @param footer open footer slot (chips, counts, an action).
 */
@Composable
fun NockerlNodeCell(
    name: String,
    status: NockerlStatusDotStatus,
    modifier: Modifier = Modifier,
    statusLabel: String? = null,
    badge: String? = null,
    metrics: List<NockerlNodeMetric> = emptyList(),
    cellMinWidth: Dp = 240.dp,
    footer: (@Composable () -> Unit)? = null,
) {
    val colors = LocalNockerlColors.current

    NockerlSurface(
        modifier = modifier.widthIn(min = cellMinWidth),
        shape = NockerlPanelShape,
        color = colors.cardSurface1,
        elevation = NockerlElevation.Level2,
        border = colors.cardHairline,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                NockerlStatusDot(
                    status = status,
                    contentDescription = statusLabel ?: status.accessibleName,
                )
                Spacer(modifier = Modifier.widthIn(min = 8.dp))
                Text(
                    text = name,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium,
                    color = colors.onCard,
                    modifier = Modifier.padding(start = 8.dp),
                )
                if (statusLabel != null) {
                    Text(
                        text = statusLabel,
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.onCardMuted,
                        modifier = Modifier.padding(start = 8.dp),
                    )
                }
                Spacer(modifier = Modifier.weight(1f))
                if (badge != null) {
                    NockerlBadge(text = badge, tone = NockerlBadgeTone.NEUTRAL)
                }
            }
            metrics.forEach { metric -> NodeMetricRow(metric = metric, colors = colors) }
            footer?.invoke()
        }
    }
}

/** One metric: eyebrow + mono value, with an optional sparkline / pressure bar. */
@Composable
private fun NodeMetricRow(
    metric: NockerlNodeMetric,
    colors: NockerlColors,
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = metric.label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Medium,
                color = colors.onCardMuted,
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = metric.value,
                style = MaterialTheme.typography.bodySmall,
                fontFamily = FontFamily.Monospace,
                color = colors.onCard,
            )
        }
        when {
            metric.series != null && metric.series.size >= 2 ->
                NodeSparkline(series = metric.series, color = colors.accentPrimary)
            metric.ratio != null ->
                NodePressureBar(ratio = metric.ratio, colors = colors)
        }
    }
}

/** A minimal trend polyline: accent stroke over the card plane. */
@Composable
private fun NodeSparkline(
    series: List<Float>,
    color: Color,
) {
    Canvas(modifier = Modifier.fillMaxWidth().height(20.dp)) {
        val min = series.min()
        val max = series.max()
        val span = (max - min).takeIf { it > 0f } ?: 1f
        val stepX = size.width / (series.size - 1)
        var prev = Offset(0f, size.height * (1f - (series[0] - min) / span))
        series.drop(1).forEachIndexed { i, v ->
            val next = Offset(stepX * (i + 1), size.height * (1f - (v - min) / span))
            drawLine(
                color = color,
                start = prev,
                end = next,
                strokeWidth = 2.dp.toPx(),
                cap = StrokeCap.Round,
            )
            prev = next
        }
    }
}

/** The gauge-band pressure bar: cyan < .60 → amber < .85 → red (the  ladder). */
@Composable
private fun NodePressureBar(
    ratio: Float,
    colors: NockerlColors,
) {
    val clamped = ratio.coerceIn(0f, 1f)
    val tone =
        when {
            clamped >= 0.85f -> colors.statusError
            clamped >= 0.60f -> colors.statusWarning
            else -> colors.accentPrimary
        }
    Row(modifier = Modifier.fillMaxWidth().height(4.dp)) {
        androidx.compose.foundation.layout.Box(
            modifier =
                Modifier
                    .weight(clamped.coerceAtLeast(0.01f))
                    .fillMaxWidth()
                    .height(4.dp)
                    .background(tone, NockerlProgressTrackShape),
        )
        if (clamped < 1f) {
            androidx.compose.foundation.layout.Box(
                modifier =
                    Modifier
                        .weight((1f - clamped).coerceAtLeast(0.01f))
                        .height(4.dp)
                        .background(colors.canvasAlt, NockerlProgressTrackShape),
            )
        }
    }
}
