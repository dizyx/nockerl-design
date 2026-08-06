package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.SecondaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlBorder
import com.dizyx.nockerl.design.tokens.NockerlControlShape
import com.dizyx.nockerl.design.tokens.NockerlProgressTrackShape
import com.dizyx.nockerl.design.tokens.nockerlRecessedSurface

/**
 * The standardized **tabs** (a law §7 amendment): the selection indicator
 * **SLIDES** wherever the component is ours.
 * Its OFFSET and WIDTH animate (interpolatable transforms) while the cyan
 * fill itself never tweens. The indicator is a `NockerlBorder.widthIndicator`
 * accent line on the squared 2dp track radius (the progress-track vocabulary,
 * never a pill).
 *
 * Two [variant]s:
 * - [NockerlTabsVariant.PLAIN]: the underline rides directly on the host
 *   surface (the default).
 * - [NockerlTabsVariant.ENCLOSED]: the same UNDERLINE selection, but the row
 *   sits inside a recessed `canvasAlt` enclosure ("fields sink"). The selected
 *   tab is NEVER a filled pill. A fill would ape the [NockerlSegmented] control.
 *   **Tabs navigate between views; the segmented control selects an option**:
 *   the underline-in-enclosure keeps that distinction legible.
 *
 * Per the B12 ruling, SwiftUI keeps its native tab idiom (system `TabView` /
 * segmented `Picker`, laws §9/§12). There is no Swift enclosed-tabs port, since
 * "enclosed tabs" is not an Apple pattern; a Swift surface uses the platform tab.
 *
 * @param tabs the tab labels, in order.
 * @param selectedIndex the active tab.
 * @param onSelect invoked with the tapped index.
 * @param modifier outer modifier.
 * @param variant plain (default) or the recessed enclosure.
 */
@Composable
fun NockerlTabs(
    tabs: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
    variant: NockerlTabsVariant = NockerlTabsVariant.PLAIN,
) {
    when (variant) {
        NockerlTabsVariant.PLAIN ->
            TabsRow(tabs = tabs, selectedIndex = selectedIndex, onSelect = onSelect, modifier = modifier)

        NockerlTabsVariant.ENCLOSED -> {
            val colors = LocalNockerlColors.current
            Box(
                modifier =
                    modifier
                        .clip(NockerlControlShape)
                        .nockerlRecessedSurface(shape = NockerlControlShape)
                        .background(colors.canvasAlt)
                        .padding(horizontal = ENCLOSURE_INSET, vertical = ENCLOSURE_INSET),
            ) {
                TabsRow(tabs = tabs, selectedIndex = selectedIndex, onSelect = onSelect)
            }
        }
    }
}

/** The shared underlined tab row (B12 sliding accent indicator). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TabsRow(
    tabs: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalNockerlColors.current

    SecondaryTabRow(
        selectedTabIndex = selectedIndex,
        modifier = modifier,
        containerColor = Color.Transparent,
        contentColor = colors.onCanvas,
        indicator = {
            // The ONE sliding indicator (B12): the M3 indicator-scope modifier
            // animates OFFSET + WIDTH toward the active tab (transform-only: the
            // accent fill never tweens, law §7 amendment). An UNDERLINE, never
            // a fill, so enclosed tabs stay distinct from the segmented pill.
            Box(
                modifier =
                    Modifier
                        .tabIndicatorOffset(selectedIndex, matchContentSize = false)
                        .height(TAB_INDICATOR_HEIGHT)
                        .clip(NockerlProgressTrackShape)
                        .background(colors.accentPrimary),
            )
        },
        divider = {}, // the host surface supplies any hairline it wants
    ) {
        tabs.forEachIndexed { index, label ->
            Tab(
                selected = index == selectedIndex,
                onClick = { onSelect(index) },
                text = { Text(label) },
                selectedContentColor = colors.accentPrimary,
                unselectedContentColor = colors.onCanvasMuted,
            )
        }
    }
}

/** The tab presentation variants. */
enum class NockerlTabsVariant {
    /** Underline on the host surface: the default navigation tabs. */
    PLAIN,

    /** Underline INSIDE a recessed `canvasAlt` enclosure, never a filled pill. */
    ENCLOSED,
}

/**
 * Indicator thickness: the tokenized `NockerlBorder.widthIndicator`.
 *
 * An indicator BAR is a MARKER, not an outline: it does not enclose anything, so it
 * carries no selection alpha and stays SOLID at full accent strength. A marker's
 * presence is already spelled three ways (ink, full-tab length, and weight), which
 * is why the weight can come down without the selection reading as weaker. At 3dp it
 * shouted against the nav chrome; at 1dp it would read as an accidental
 * text-underline hairline. `widthIndicator` is the weight that still reads as a
 * deliberate marker bar.
 */
private val TAB_INDICATOR_HEIGHT = NockerlBorder.widthIndicator

/** The recessed enclosure's inner inset (the row breathes inside the well). */
private val ENCLOSURE_INSET = 4.dp
