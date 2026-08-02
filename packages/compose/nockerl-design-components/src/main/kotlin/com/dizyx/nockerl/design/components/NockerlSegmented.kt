package com.dizyx.nockerl.design.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlControlShape
import com.dizyx.nockerl.design.tokens.NockerlMotionDuration
import com.dizyx.nockerl.design.tokens.NockerlMotionEasing
import com.dizyx.nockerl.design.tokens.nockerlLitSurface
import com.dizyx.nockerl.design.tokens.nockerlRecessedSurface

/**
 * The standardized **segmented control**: the ratified **sliding cyan pill**
 * (r2, B3): a recessed `canvasAlt` track well ("fields sink") on the shared
 * control radius, with ONE solid-accent indicator that **slides** between
 * segments. The fill never tweens (design-laws §7). The pill's OFFSET animates
 * (an interpolatable transform) and the labels cross-fade color; the indicator
 * wears the shared top catch-light like every solid-accent surface (B1/B2).
 *
 * The active label is contrast-picked against the solid accent; inactive labels
 * are muted canvas ink. The indicator radius nests one step inside the track
 * (control 12 − inset 2 = 10).
 *
 * @param T the option type (typically an enum).
 * @param options the segments, in order.
 * @param selected the currently-active option.
 * @param onSelect invoked with the tapped option.
 * @param label maps an option to its display string.
 * @param modifier outer modifier (pass `Modifier.fillMaxWidth()` for a full-width control).
 * @param enabled when `false`, the whole control is dimmed and non-interactive.
 * @param segmentIcon optional per-segment leading glyph (rendered beside the label
 *   at the size tier's icon size); `null` (default) = labels only.
 * @param segmentEnabled per-segment enablement: a disabled segment dims and
 *   ignores taps while the rest stay live; default = all enabled.
 * @param size the density tier: [NockerlSegmentedSize.MD] (default) or the dense
 *   [NockerlSegmentedSize.SM] for tight settings rows.
 */
@Composable
fun <T> NockerlSegmented(
    options: List<T>,
    selected: T,
    onSelect: (T) -> Unit,
    label: (T) -> String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    segmentIcon: ((T) -> ImageVector?)? = null,
    segmentEnabled: (T) -> Boolean = { true },
    size: NockerlSegmentedSize = NockerlSegmentedSize.MD,
) {
    val colors = LocalNockerlColors.current
    val alpha = if (enabled) 1f else DISABLED_ALPHA
    val trackColor = colors.canvasAlt.copy(alpha = colors.canvasAlt.alpha * alpha)
    val pillColor = colors.accentPrimary.copy(alpha = colors.accentPrimary.alpha * alpha)
    val selectedIndex = options.indexOf(selected).coerceAtLeast(0)
    val innerShape = nockerlRoundedShape(SEGMENT_INNER_RADIUS)

    Box(
        modifier =
            modifier
                .nockerlRecessedSurface(shape = NockerlControlShape)
                .background(trackColor)
                .padding(SEGMENT_TRACK_INSET),
    ) {
        BoxWithConstraints {
            // The sliding pill needs a BOUNDED width to compute equal segments:
            // callers pass `fillMaxWidth()` (or a set width); in a degenerate
            // unbounded host the indicator is skipped rather than crashing.
            val bounded = constraints.hasBoundedWidth
            val segmentWidth = if (bounded) maxWidth / options.size else 0.dp
            // The ONE pill: its position animates (interpolatable transform);
            // the solid fill itself never tweens (law §7).
            val indicatorOffset by animateDpAsState(
                targetValue = segmentWidth * selectedIndex,
                animationSpec = tween(NockerlMotionDuration.baseMs, easing = NockerlMotionEasing.standard),
                label = "nockerlSegmentedSlide",
            )

            Box(modifier = Modifier.height(IntrinsicSize.Min)) {
                if (bounded) {
                    Box(
                        modifier =
                            Modifier
                                .offset(x = indicatorOffset)
                                .width(segmentWidth)
                                .fillMaxHeight()
                                .clip(innerShape)
                                .background(pillColor)
                                // Same surfaceHighlight token as the web (the ruling:
                                // one identical catch-light, no per-platform drift).
                                .nockerlLitSurface(shape = innerShape),
                    )
                }
                Row {
                    options.forEach { option ->
                        val active = option == selected
                        val segmentLive = enabled && segmentEnabled(option)
                        // A disabled SEGMENT dims below the control's own alpha.
                        val segmentAlpha = if (segmentLive) alpha else alpha * DISABLED_ALPHA
                        // Labels CROSS-FADE color as the pill slides under them.
                        val labelColor by animateColorAsState(
                            targetValue =
                                if (active) {
                                    pickOnAccent(colors.accentPrimary)
                                } else {
                                    colors.onCanvasMuted
                                },
                            animationSpec = tween(NockerlMotionDuration.baseMs, easing = NockerlMotionEasing.standard),
                            label = "nockerlSegmentedLabel",
                        )
                        val ink = labelColor.copy(alpha = labelColor.alpha * segmentAlpha)
                        Row(
                            modifier =
                                Modifier
                                    .weight(1f)
                                    .clip(innerShape)
                                    .clickable(enabled = segmentLive) { onSelect(option) }
                                    .padding(vertical = size.verticalPadding),
                            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            val icon = segmentIcon?.invoke(option)
                            if (icon != null) {
                                Icon(
                                    imageVector = icon,
                                    contentDescription = null, // the label carries the name
                                    tint = ink,
                                    modifier = Modifier.size(size.iconSize),
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                            }
                            Text(
                                text = label(option),
                                style = size.textStyle(),
                                fontWeight = if (active) FontWeight.Medium else FontWeight.Normal,
                                color = ink,
                            )
                        }
                    }
                }
            }
        }
    }
}

/** Track inset: the pill nests 2dp inside the recessed well. */
private val SEGMENT_TRACK_INSET = 2.dp

/** Indicator corner radius, one step tighter than the 12dp track (12 − 2). */
private val SEGMENT_INNER_RADIUS = 10.dp

/** The segmented density tiers: default vs dense settings rows. */
enum class NockerlSegmentedSize(
    internal val verticalPadding: androidx.compose.ui.unit.Dp,
    internal val iconSize: androidx.compose.ui.unit.Dp,
) {
    /** Dense: tight settings rows (labelSmall, 4dp vertical rhythm). */
    SM(verticalPadding = 4.dp, iconSize = 14.dp),

    /** Default (labelMedium, the ratified 6dp rhythm). */
    MD(verticalPadding = 6.dp, iconSize = 16.dp),
    ;

    @Composable
    internal fun textStyle() =
        when (this) {
            SM -> MaterialTheme.typography.labelSmall
            MD -> MaterialTheme.typography.labelMedium
        }
}
